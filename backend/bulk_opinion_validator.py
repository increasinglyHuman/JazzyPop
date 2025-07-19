#!/usr/bin/env python3
"""
Bulk Opinion Validator with Multi-Provider Support
Uses both Anthropic (Haiku) and OpenAI to validate quiz questions
Respects rate limits and applies our factual criteria
"""

import asyncio
import asyncpg
import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set
from collections import defaultdict
import aiohttp
from dotenv import load_dotenv
import time

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MultiProviderValidator:
    """Validates quizzes using multiple AI providers with rate limit awareness"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        
        # API Keys
        self.anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        self.openai_key = os.getenv('OPENAI_API_KEY')
        
        # Rate limits (conservative to be safe)
        self.rate_limits = {
            'anthropic': {
                'concurrent': 5,      # Haiku allows 5 concurrent
                'per_minute': 50,     # Being conservative
                'model': 'claude-3-haiku-20240307'
            },
            'openai': {
                'concurrent': 10,     # GPT-3.5 has higher limits
                'per_minute': 200,    # Much higher for GPT-3.5
                'model': 'gpt-3.5-turbo'
            }
        }
        
        # Semaphores for rate limiting
        self.semaphores = {
            'anthropic': asyncio.Semaphore(5),
            'openai': asyncio.Semaphore(10)
        }
        
        # Track API calls for rate limiting
        self.call_times = {
            'anthropic': [],
            'openai': []
        }
        
        # Stats
        self.stats = defaultdict(int)
        
        # Opinion patterns
        self.opinion_patterns = [
            'loves to', 'likes to', 'prefers', 'favorite',
            'coolest', 'silliest', 'best', 'worst', 'most fun',
            'most awesome', 'lamest', 'most boring', 'funnest',
            'what do you think', 'in your opinion', 'feels like',
            'which is more', 'what would be'
        ]
    
    def get_validation_prompt(self, question: Dict, category: str) -> str:
        """Create validation prompt focusing on factual criteria"""
        q_text = question.get('question', '')
        answers = []
        correct_answer = None
        
        for i, ans in enumerate(question.get('answers', [])):
            letter = chr(65 + i)
            is_correct = ans.get('correct', False)
            answers.append(f"{letter}) {ans['text']} {'[CORRECT]' if is_correct else ''}")
            if is_correct:
                correct_answer = ans['text']
        
        return f"""Analyze this quiz question for educational quality:

CATEGORY: {category}
QUESTION: {q_text}
ANSWERS:
{chr(10).join(answers)}

CRITICAL CHECKS:
1. Is this a FACT-based question or OPINION-based?
   - Facts: Can be verified, have one correct answer
   - Opinions: "loves to", "coolest", "best", preferences
   
2. Is the marked answer actually correct?
3. Are question/answers too long? (Q: 35 words max, A: 8 words max)
4. Is this appropriate for ages 6-13?

INSTANT FAIL if:
- Opinion-based (contains "loves to", "favorite", "coolest", etc.)
- No verifiable correct answer
- Subjective preferences
- Cannot be fact-checked

Respond with JSON only:
{{
    "is_factual": true/false,
    "validation_passed": true/false,
    "issues": ["list", "of", "problems"],
    "severity": "critical/high/medium/low",
    "suggestion": "how to fix"
}}"""
    
    async def validate_with_anthropic(self, question: Dict, category: str) -> Optional[Dict]:
        """Validate using Claude Haiku"""
        async with self.semaphores['anthropic']:
            # Rate limit check
            await self._enforce_rate_limit('anthropic')
            
            headers = {
                "x-api-key": self.anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            payload = {
                "model": self.rate_limits['anthropic']['model'],
                "max_tokens": 300,
                "temperature": 0,
                "messages": [{
                    "role": "user",
                    "content": self.get_validation_prompt(question, category)
                }]
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status == 200:
                            self.stats['anthropic_success'] += 1
                            result = await response.json()
                            return self._parse_response(result['content'][0]['text'])
                        else:
                            self.stats['anthropic_errors'] += 1
                            logger.error(f"Anthropic error: {response.status}")
                            return None
            except Exception as e:
                self.stats['anthropic_errors'] += 1
                logger.error(f"Anthropic exception: {e}")
                return None
    
    async def validate_with_openai(self, question: Dict, category: str) -> Optional[Dict]:
        """Validate using GPT-3.5-turbo"""
        async with self.semaphores['openai']:
            # Rate limit check
            await self._enforce_rate_limit('openai')
            
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.rate_limits['openai']['model'],
                "messages": [{
                    "role": "user",
                    "content": self.get_validation_prompt(question, category)
                }],
                "temperature": 0,
                "max_tokens": 300
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        if response.status == 200:
                            self.stats['openai_success'] += 1
                            result = await response.json()
                            return self._parse_response(
                                result['choices'][0]['message']['content']
                            )
                        else:
                            self.stats['openai_errors'] += 1
                            logger.error(f"OpenAI error: {response.status}")
                            return None
            except Exception as e:
                self.stats['openai_errors'] += 1
                logger.error(f"OpenAI exception: {e}")
                return None
    
    async def _enforce_rate_limit(self, provider: str):
        """Ensure we don't exceed rate limits"""
        current_time = time.time()
        
        # Clean old timestamps
        self.call_times[provider] = [
            t for t in self.call_times[provider] 
            if current_time - t < 60
        ]
        
        # Check if we need to wait
        limit = self.rate_limits[provider]['per_minute']
        if len(self.call_times[provider]) >= limit:
            wait_time = 60 - (current_time - self.call_times[provider][0])
            if wait_time > 0:
                logger.info(f"Rate limit pause for {provider}: {wait_time:.1f}s")
                await asyncio.sleep(wait_time)
        
        # Record this call
        self.call_times[provider].append(current_time)
    
    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """Parse AI response to validation result"""
        try:
            # Extract JSON from response
            if '{' in response_text and '}' in response_text:
                json_start = response_text.index('{')
                json_end = response_text.rindex('}') + 1
                json_str = response_text[json_start:json_end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to parse response: {e}")
        return None
    
    def quick_opinion_check(self, question_text: str) -> bool:
        """Quick local check for obvious opinion questions"""
        q_lower = question_text.lower()
        return any(pattern in q_lower for pattern in self.opinion_patterns)
    
    async def validate_quiz_set(self, quiz_set: Dict, provider: str = 'auto') -> Dict:
        """Validate all questions in a quiz set"""
        set_id = quiz_set['id']
        data = quiz_set['data']
        if isinstance(data, str):
            data = json.loads(data)
        
        category = data.get('category', 'general')
        questions = data.get('questions', [])
        
        results = {
            'set_id': str(set_id),
            'category': category,
            'mode': data.get('mode', 'standard'),
            'total_questions': len(questions),
            'failed_questions': [],
            'opinion_questions': [],
            'long_questions': [],
            'validation_errors': []
        }
        
        # Process each question
        for idx, question in enumerate(questions):
            q_text = question.get('question', '')
            
            # Quick local checks first
            if self.quick_opinion_check(q_text):
                results['opinion_questions'].append(idx)
                results['failed_questions'].append(idx)
                self.stats['opinion_found'] += 1
                continue
            
            # Length check
            if len(q_text.split()) > 35:
                results['long_questions'].append(idx)
                self.stats['too_long'] += 1
            
            # Choose provider
            if provider == 'auto':
                # Alternate between providers for load balancing
                use_provider = 'openai' if idx % 2 == 0 else 'anthropic'
            else:
                use_provider = provider
            
            # Validate with AI
            if use_provider == 'anthropic' and self.anthropic_key:
                validation = await self.validate_with_anthropic(question, category)
            elif use_provider == 'openai' and self.openai_key:
                validation = await self.validate_with_openai(question, category)
            else:
                validation = None
            
            if validation:
                if not validation.get('is_factual', True):
                    results['opinion_questions'].append(idx)
                    results['failed_questions'].append(idx)
                    self.stats['ai_opinion_found'] += 1
                elif not validation.get('validation_passed', True):
                    results['failed_questions'].append(idx)
                    results['validation_errors'].append({
                        'question_idx': idx,
                        'issues': validation.get('issues', [])
                    })
                    self.stats['validation_failed'] += 1
            
            # Small delay between questions
            await asyncio.sleep(0.1)
        
        # Determine if set should be rejected
        results['should_reject'] = len(results['failed_questions']) >= 3
        results['remaining_questions'] = len(questions) - len(set(results['failed_questions']))
        
        return results
    
    async def bulk_validate(self, limit: int = 100, category_filter: str = None,
                          skip_validated: bool = True) -> Dict:
        """Run bulk validation on quiz sets"""
        start_time = datetime.now()
        
        async with self.db_pool.acquire() as conn:
            # Build query
            query = """
            SELECT 
                c.id,
                c.data,
                c.metadata
            FROM content c
            WHERE c.type = 'quiz_set'
            """
            
            if skip_validated:
                query += " AND (c.metadata->>'opinion_checked' IS NULL OR c.metadata->>'opinion_checked' = 'false')"
            
            if category_filter:
                query += f" AND c.data->>'category' = '{category_filter}'"
            
            query += f" ORDER BY RANDOM() LIMIT {limit}"
            
            quiz_sets = await conn.fetch(query)
            
            logger.info(f"Validating {len(quiz_sets)} quiz sets")
            
            # Results tracking
            all_results = []
            sets_to_reject = []
            partial_sets = []
            
            # Process in parallel but respect rate limits
            batch_size = 15  # Process 15 at a time (using both APIs)
            
            for i in range(0, len(quiz_sets), batch_size):
                batch = quiz_sets[i:i+batch_size]
                
                # Create validation tasks
                tasks = []
                for quiz_set in batch:
                    # Alternate providers
                    provider = 'openai' if len(tasks) % 2 == 0 else 'anthropic'
                    tasks.append(self.validate_quiz_set(quiz_set, provider))
                
                # Run batch
                batch_results = await asyncio.gather(*tasks)
                all_results.extend(batch_results)
                
                # Process results
                for result in batch_results:
                    if result['should_reject']:
                        sets_to_reject.append(result['set_id'])
                    elif result['remaining_questions'] < 10:
                        partial_sets.append({
                            'set_id': result['set_id'],
                            'remaining': result['remaining_questions']
                        })
                
                # Update metadata to mark as checked
                if not skip_validated:
                    for quiz_set, result in zip(batch, batch_results):
                        await self._update_metadata(
                            conn, 
                            quiz_set['id'],
                            {
                                'opinion_checked': True,
                                'opinion_check_date': datetime.now().isoformat(),
                                'opinion_questions_found': len(result['opinion_questions']),
                                'validation_issues': len(result['failed_questions'])
                            }
                        )
                
                # Progress update
                processed = min(i + batch_size, len(quiz_sets))
                logger.info(f"Progress: {processed}/{len(quiz_sets)} sets validated")
                
                # Pause between batches
                if i + batch_size < len(quiz_sets):
                    await asyncio.sleep(2)
            
            # Generate report
            duration = (datetime.now() - start_time).total_seconds()
            
            report = {
                'validation_time': datetime.now().isoformat(),
                'duration_seconds': duration,
                'sets_validated': len(quiz_sets),
                'sets_to_reject': len(sets_to_reject),
                'partial_sets_created': len(partial_sets),
                'stats': dict(self.stats),
                'providers_used': {
                    'anthropic': self.stats['anthropic_success'] + self.stats['anthropic_errors'],
                    'openai': self.stats['openai_success'] + self.stats['openai_errors']
                },
                'recommendations': {
                    'reject_sets': [str(s) for s in sets_to_reject[:20]],  # First 20
                    'partial_sets': partial_sets[:20]     # First 20
                }
            }
            
            return report
    
    async def _update_metadata(self, conn: asyncpg.Connection, set_id: str, metadata: Dict):
        """Update quiz set metadata"""
        query = """
        UPDATE content
        SET metadata = metadata || $2::jsonb
        WHERE id = $1
        """
        await conn.execute(query, set_id, json.dumps(metadata))
    
    def save_report(self, report: Dict):
        """Save validation report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON report
        with open(f"bulk_validation_report_{timestamp}.json", 'w') as f:
            json.dump(report, f, indent=2)
        
        # Human readable summary
        with open(f"bulk_validation_summary_{timestamp}.txt", 'w') as f:
            f.write("BULK OPINION VALIDATION REPORT\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Validation Date: {report['validation_time']}\n")
            f.write(f"Duration: {report['duration_seconds']:.1f} seconds\n")
            f.write(f"Sets Validated: {report['sets_validated']}\n\n")
            
            f.write("RESULTS:\n")
            f.write(f"Sets to Reject: {report['sets_to_reject']}\n")
            f.write(f"Partial Sets Created: {report['partial_sets_created']}\n\n")
            
            f.write("ISSUES FOUND:\n")
            stats = report['stats']
            f.write(f"Opinion Questions (quick check): {stats.get('opinion_found', 0)}\n")
            f.write(f"Opinion Questions (AI verified): {stats.get('ai_opinion_found', 0)}\n")
            f.write(f"Overly Long Questions: {stats.get('too_long', 0)}\n")
            f.write(f"Validation Failures: {stats.get('validation_failed', 0)}\n\n")
            
            f.write("API USAGE:\n")
            f.write(f"Anthropic Calls: {report['providers_used']['anthropic']}\n")
            f.write(f"OpenAI Calls: {report['providers_used']['openai']}\n")
            f.write(f"Anthropic Errors: {stats.get('anthropic_errors', 0)}\n")
            f.write(f"OpenAI Errors: {stats.get('openai_errors', 0)}\n")


async def main():
    """Run the bulk validator"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Bulk validate quiz sets for opinions')
    parser.add_argument('--limit', type=int, default=100, help='Number of sets to validate')
    parser.add_argument('--category', type=str, help='Filter by category')
    parser.add_argument('--recheck', action='store_true', help='Recheck already validated sets')
    
    args = parser.parse_args()
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment")
        print("Make sure .env file is loaded")
        return
    
    print(f"Connecting to database...")
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    
    try:
        validator = MultiProviderValidator(db_pool)
        
        print("=== BULK OPINION VALIDATOR ===")
        print(f"Using providers:")
        if validator.anthropic_key:
            print("  ✓ Anthropic (Claude Haiku)")
        if validator.openai_key:
            print("  ✓ OpenAI (GPT-3.5-turbo)")
        print(f"\nValidating {args.limit} quiz sets...")
        print("This will identify:")
        print("  • Opinion-based questions")
        print("  • Overly long questions/answers")
        print("  • Invalid quiz questions")
        print()
        
        # Run validation
        report = await validator.bulk_validate(
            limit=args.limit,
            category_filter=args.category,
            skip_validated=not args.recheck
        )
        
        # Save report
        validator.save_report(report)
        
        # Print summary
        print(f"\n=== VALIDATION COMPLETE ===")
        print(f"Duration: {report['duration_seconds']:.1f} seconds")
        print(f"Sets Validated: {report['sets_validated']}")
        print(f"Sets to Reject: {report['sets_to_reject']}")
        print(f"Partial Sets Created: {report['partial_sets_created']}")
        print(f"\nOpinion Questions Found: {report['stats'].get('opinion_found', 0)}")
        print(f"AI Verified Opinions: {report['stats'].get('ai_opinion_found', 0)}")
        
        print(f"\nReports saved to:")
        print(f"  • bulk_validation_report_*.json")
        print(f"  • bulk_validation_summary_*.txt")
        
        if report['partial_sets_created'] > 0:
            print(f"\n💡 Run the quiz rebalancer to fix {report['partial_sets_created']} partial sets!")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
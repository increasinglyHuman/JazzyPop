#!/usr/bin/env python3
"""
AI-Powered Quiz Validator
Uses Claude to intelligently validate quiz accuracy with clear instructions
"""

import asyncio
import asyncpg
import json
import os
from pathlib import Path
from datetime import datetime
import logging
from typing import Dict, List
import anthropic
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value


class AIQuizValidator:
    """Validates quiz questions using AI with clear context"""
    
    def __init__(self, db_pool: asyncpg.Pool, api_key: str):
        self.db_pool = db_pool
        self.client = anthropic.Anthropic(api_key=api_key)
        self.validation_stats = defaultdict(int)
        self.issues_found = []
        
    def get_validation_prompt(self, question: Dict, category: str, mode: str, 
                            difficulty: str, age_rating: str) -> str:
        """Create a clear, specific validation prompt"""
        
        # Format the question and answers
        q_text = question['question']
        answers = []
        correct_answer = None
        
        for i, ans in enumerate(question['answers']):
            letter = chr(65 + i)
            is_correct = ans.get('correct', False)
            answers.append(f"{letter}) {ans['text']} {'[MARKED CORRECT]' if is_correct else ''}")
            if is_correct:
                correct_answer = f"{letter}) {ans['text']}"
        
        return f"""You are validating a quiz question for the JazzyPop educational game.

CONTEXT:
- Category: {category}
- Mode: {mode} (chaos mode = silly wrong answers are OK)
- Difficulty: {difficulty}
- Age Rating: {age_rating}

QUESTION: {q_text}

ANSWERS:
{chr(10).join(answers)}

MARKED CORRECT: {correct_answer or 'NO ANSWER MARKED CORRECT!'}

VALIDATION TASKS:
1. Is this an OPINION question or FACTUAL question? (CRITICAL CHECK)
2. Is the marked correct answer factually accurate and verifiable?
3. Are there other answers that could also be correct?
4. Is the question clear and understandable?
5. Do any answers give away the correct choice too obviously?

REJECT OPINION-BASED QUESTIONS:
❌ "What's the coolest/silliest/best/most fun..."
❌ "Which is more awesome/boring/exciting..."
❌ "What's your favorite..."
❌ "What would be the funniest/weirdest..."
❌ Any question where the answer depends on personal preference

ACCEPT ONLY FACTUAL QUESTIONS:
✓ Questions with verifiable, objective answers
✓ Historical facts, scientific facts, mathematical facts
✓ Questions where experts would agree on the answer

SPECIAL CONSIDERATIONS:
- For young children (age 6-10): Simple language is OK, but still must be FACTUAL
- For chaos mode: Wrong answers can be silly, but there must be ONE factually correct answer
- "Which came first" questions: OK only if historically verifiable
- Superlatives: OK only if measurable (tallest, fastest, oldest) NOT subjective (coolest, best)

RESPOND WITH ONLY THIS JSON:
{{
    "validation_passed": true/false,
    "confidence": 0.0-1.0,
    "issues": [
        {{
            "type": "factual_error|ambiguous|multiple_correct|no_correct|unclear|answer_in_question",
            "severity": "critical|high|medium|low",
            "description": "Clear explanation of the issue",
            "suggestion": "How to fix it"
        }}
    ],
    "correct_answer_is": "A/B/C/D or 'none'",
    "explanation": "Brief explanation of validation decision"
}}"""

    async def validate_batch(self, limit: int = 100, category_filter: str = None):
        """Validate a batch of quiz questions"""
        logger.info(f"Starting AI validation (limit: {limit})")
        
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
            
            if category_filter:
                query += f" AND c.data->>'category' = '{category_filter}'"
            
            query += f" ORDER BY RANDOM() LIMIT {limit}"
            
            quiz_sets = await conn.fetch(query)
            
            logger.info(f"Validating {len(quiz_sets)} quiz sets...")
            
            for quiz_set in quiz_sets:
                await self._validate_quiz_set(quiz_set)
                
                # Progress update
                if self.validation_stats['total_validated'] > 0 and self.validation_stats['total_validated'] % 10 == 0:
                    logger.info(
                        f"Progress: {self.validation_stats['total_validated']} validated, "
                        f"{self.validation_stats['issues_found']} issues"
                    )
            
            return self._generate_report()
    
    async def _validate_quiz_set(self, quiz_set_row):
        """Validate all questions in a quiz set"""
        try:
            data = quiz_set_row['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            metadata = quiz_set_row['metadata']
            if isinstance(metadata, str):
                metadata = json.loads(metadata) if metadata else {}
            elif metadata is None:
                metadata = {}
            set_id = str(quiz_set_row['id'])
            
            # Extract context
            category = data.get('category', 'general')
            mode = data.get('mode', 'standard')
            difficulty = data.get('difficulty', 'medium')
            age_rating = metadata.get('maturity_rating', 'all_ages')
            
            questions = data.get('questions', [])
            
            for q_idx, question in enumerate(questions):
                self.validation_stats['total_validated'] += 1
                
                # Get validation prompt
                prompt = self.get_validation_prompt(
                    question, category, mode, difficulty, age_rating
                )
                
                try:
                    # Call Claude Haiku - fast and budget-friendly!
                    response = self.client.messages.create(
                        model="claude-3-haiku-20240307",  # Fast, accurate, and economical
                        max_tokens=500,
                        temperature=0,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    
                    # Parse response
                    result_text = response.content[0].text.strip()
                    
                    # Extract JSON
                    if '{' in result_text and '}' in result_text:
                        json_start = result_text.index('{')
                        json_end = result_text.rindex('}') + 1
                        result = json.loads(result_text[json_start:json_end])
                    else:
                        raise ValueError("No JSON in response")
                    
                    # Process validation result
                    if not result.get('validation_passed', True):
                        self.validation_stats['issues_found'] += 1
                        
                        for issue in result.get('issues', []):
                            self.issues_found.append({
                                'set_id': set_id,
                                'question_idx': q_idx,
                                'category': category,
                                'mode': mode,
                                'question': question['question'][:100] + '...',
                                'issue_type': issue['type'],
                                'severity': issue['severity'],
                                'description': issue['description'],
                                'suggestion': issue['suggestion'],
                                'confidence': result.get('confidence', 0.5)
                            })
                            
                            # Track issue types
                            self.validation_stats[f"issue_{issue['type']}"] += 1
                    
                except Exception as e:
                    logger.error(f"Validation error for question {q_idx} in set {set_id}: {e}")
                    self.validation_stats['validation_errors'] += 1
                    
        except Exception as e:
            logger.error(f"Error processing quiz set {quiz_set_row['id']}: {e}")
            self.validation_stats['processing_errors'] += 1
    
    def _generate_report(self) -> Dict:
        """Generate validation report"""
        
        # Sort issues by severity and confidence
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        self.issues_found.sort(
            key=lambda x: (severity_order.get(x['severity'], 4), -x['confidence'])
        )
        
        # Group by issue type
        issues_by_type = defaultdict(list)
        for issue in self.issues_found:
            issues_by_type[issue['issue_type']].append(issue)
        
        report = {
            'validation_time': datetime.now().isoformat(),
            'total_questions_validated': self.validation_stats['total_validated'],
            'total_issues_found': self.validation_stats['issues_found'],
            'error_rate': (
                self.validation_stats['issues_found'] / 
                self.validation_stats['total_validated'] * 100
                if self.validation_stats['total_validated'] > 0 else 0
            ),
            'issue_breakdown': {
                issue_type: len(issues)
                for issue_type, issues in issues_by_type.items()
            },
            'validation_errors': self.validation_stats['validation_errors'],
            'top_issues': self.issues_found[:50]  # Top 50 most severe
        }
        
        return report
    
    def save_report(self, report: Dict):
        """Save validation report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON report
        json_file = f"ai_validation_report_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Save human-readable summary
        summary_file = f"ai_validation_summary_{timestamp}.txt"
        with open(summary_file, 'w') as f:
            f.write("AI QUIZ VALIDATION REPORT\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Validation Date: {report['validation_time']}\n")
            f.write(f"Questions Validated: {report['total_questions_validated']}\n")
            f.write(f"Issues Found: {report['total_issues_found']}\n")
            f.write(f"Error Rate: {report['error_rate']:.1f}%\n")
            f.write(f"AI Validation Errors: {report['validation_errors']}\n\n")
            
            if report['issue_breakdown']:
                f.write("ISSUES BY TYPE:\n")
                for issue_type, count in sorted(
                    report['issue_breakdown'].items(), 
                    key=lambda x: -x[1]
                ):
                    f.write(f"  {issue_type}: {count}\n")
                f.write("\n")
            
            if report['top_issues']:
                f.write("TOP ISSUES FOUND:\n")
                f.write("-" * 60 + "\n")
                
                for i, issue in enumerate(report['top_issues'][:20], 1):
                    f.write(f"\n{i}. [{issue['severity'].upper()}] {issue['issue_type']}\n")
                    f.write(f"   Category: {issue['category']}/{issue['mode']}\n")
                    f.write(f"   Question: {issue['question']}\n")
                    f.write(f"   Issue: {issue['description']}\n")
                    f.write(f"   Fix: {issue['suggestion']}\n")
                    f.write(f"   Confidence: {issue['confidence']:.0%}\n")
        
        logger.info(f"Report saved: {json_file}")
        logger.info(f"Summary saved: {summary_file}")
        
        return json_file, summary_file


async def main():
    """Run the AI validator"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    API_KEY = os.getenv('ANTHROPIC_API_KEY')
    
    if not API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not found in .env file")
        print("Please add: ANTHROPIC_API_KEY=your-key-here")
        return
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        validator = AIQuizValidator(db_pool, API_KEY)
        
        print("=== AI QUIZ VALIDATOR ===")
        print("Using Claude to validate quiz accuracy")
        print("\nValidation checks:")
        print("✓ Factual accuracy of answers")
        print("✓ Multiple possible correct answers")
        print("✓ Ambiguous or unclear questions")
        print("✓ Answers that give away the solution")
        print("✓ Age-appropriate content")
        print()
        
        # Get parameters
        category = input("Category to validate (blank for random): ").strip() or None
        limit = input("Number of quiz sets to validate (default 50): ").strip()
        limit = int(limit) if limit else 50
        
        print(f"\nValidating {limit} quiz sets{f' in {category}' if category else ''}...")
        print("This will take a few minutes...\n")
        
        # Run validation
        report = await validator.validate_batch(limit=limit, category_filter=category)
        
        # Save report
        json_file, summary_file = validator.save_report(report)
        
        # Print summary
        print(f"\n=== VALIDATION COMPLETE ===")
        print(f"Questions validated: {report['total_questions_validated']}")
        print(f"Issues found: {report['total_issues_found']}")
        print(f"Error rate: {report['error_rate']:.1f}%")
        
        if report['issue_breakdown']:
            print("\nIssues by type:")
            for issue_type, count in sorted(
                report['issue_breakdown'].items(),
                key=lambda x: -x[1]
            ):
                print(f"  {issue_type}: {count}")
        
        if report['top_issues']:
            print(f"\nTop 5 most severe issues:")
            for i, issue in enumerate(report['top_issues'][:5], 1):
                print(f"\n{i}. [{issue['severity'].upper()}] {issue['question']}")
                print(f"   Issue: {issue['description']}")
                print(f"   Fix: {issue['suggestion']}")
        
        print(f"\nFull report: {json_file}")
        print(f"Summary: {summary_file}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
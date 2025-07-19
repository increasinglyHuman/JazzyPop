#!/usr/bin/env python3
"""
Enhanced Quiz Set Rebalancer with Quality Criteria
- Rebalances to exactly 10 questions per set
- Applies factual question criteria during rebalancing
- Removes opinion questions, fixes length issues, removes duplicates
"""

import asyncio
import asyncpg
import json
import logging
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Set, Tuple

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class SmartQuizRebalancer:
    """Rebalances quiz sets while applying quality criteria"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.target_size = 10
        
        # Opinion indicators
        self.opinion_patterns = [
            'loves to', 'likes to', 'prefers', 'favorite',
            'coolest', 'silliest', 'best', 'worst', 'most fun',
            'most awesome', 'lamest', 'most boring', 'funnest',
            'what do you think', 'in your opinion', 'feels like'
        ]
        
        # Stats tracking
        self.stats = {
            'opinion_removed': 0,
            'too_long_fixed': 0,
            'duplicates_removed': 0,
            'incorrect_facts_removed': 0
        }
    
    def is_opinion_question(self, question_text: str) -> bool:
        """Check if a question is opinion-based"""
        q_lower = question_text.lower()
        
        # Check opinion patterns
        for pattern in self.opinion_patterns:
            if pattern in q_lower:
                return True
        
        # Check for non-measurable superlatives
        if re.search(r"what(?:'s| is) the \w+est", q_lower):
            measurable = ['tallest', 'shortest', 'fastest', 'slowest', 
                         'largest', 'smallest', 'highest', 'lowest',
                         'longest', 'shortest', 'heaviest', 'lightest', 
                         'oldest', 'newest', 'youngest', 'first', 'last']
            
            if not any(m in q_lower for m in measurable):
                return True
        
        return False
    
    def fix_length_issues(self, question: Dict) -> Dict:
        """Truncate overly long questions and answers"""
        fixed = False
        
        # Fix question length (35 word max)
        q_text = question.get('question', '')
        words = q_text.split()
        if len(words) > 35:
            question['question'] = ' '.join(words[:30]) + '...?'
            fixed = True
        
        # Fix answer lengths (8 word max)
        for answer in question.get('answers', []):
            a_text = answer.get('text', '')
            a_words = a_text.split()
            if len(a_words) > 8:
                # Try to intelligently truncate
                answer['text'] = ' '.join(a_words[:6]) + '...'
                fixed = True
        
        if fixed:
            self.stats['too_long_fixed'] += 1
        
        return question
    
    def remove_duplicates(self, questions: List[Dict]) -> List[Dict]:
        """Remove duplicate questions within a set"""
        seen_questions = set()
        seen_answers = set()
        unique_questions = []
        
        for q in questions:
            q_text = q.get('question', '').lower().strip()
            
            # Check for duplicate question
            if q_text in seen_questions:
                self.stats['duplicates_removed'] += 1
                continue
            
            # Check for duplicate correct answer
            correct_answer = None
            for ans in q.get('answers', []):
                if ans.get('correct'):
                    correct_answer = ans.get('text', '').lower().strip()
                    break
            
            if correct_answer and correct_answer in seen_answers:
                self.stats['duplicates_removed'] += 1
                continue
            
            # This question is unique
            seen_questions.add(q_text)
            if correct_answer:
                seen_answers.add(correct_answer)
            unique_questions.append(q)
        
        return unique_questions
    
    def validate_question(self, question: Dict, category: str) -> bool:
        """Validate a single question against our criteria"""
        q_text = question.get('question', '')
        
        # 1. Check if it's an opinion
        if self.is_opinion_question(q_text):
            self.stats['opinion_removed'] += 1
            logger.debug(f"Removed opinion question: {q_text[:50]}...")
            return False
        
        # 2. Check if it has a correct answer marked
        has_correct = False
        for ans in question.get('answers', []):
            if ans.get('correct'):
                has_correct = True
                break
        
        if not has_correct:
            self.stats['incorrect_facts_removed'] += 1
            logger.debug(f"Removed question with no correct answer: {q_text[:50]}...")
            return False
        
        # 3. Basic sanity checks
        if len(q_text) < 10:  # Too short to be meaningful
            return False
        
        if len(question.get('answers', [])) != 4:  # Must have 4 answers
            return False
        
        return True
    
    async def _process_group_with_criteria(self, conn: asyncpg.Connection, key: str, 
                                         sets: List, dry_run: bool) -> Dict:
        """Process partial sets while applying quality criteria"""
        category, mode = key.split('/')
        
        # Collect all questions
        all_questions = []
        set_data_list = []
        
        for row in sets:
            # Parse JSON if needed
            data = row['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            questions = data.get('questions', [])
            
            # Apply criteria to each question
            valid_questions = []
            for q in questions:
                if self.validate_question(q, category):
                    # Fix length issues
                    q = self.fix_length_issues(q)
                    valid_questions.append(q)
            
            all_questions.extend(valid_questions)
            set_data_list.append({
                'id': row['id'],
                'data': data,
                'metadata': row['metadata'],
                'original_count': len(questions),
                'valid_count': len(valid_questions)
            })
        
        logger.info(f"{key}: Started with {sum(s['original_count'] for s in set_data_list)} questions")
        logger.info(f"{key}: After criteria: {len(all_questions)} valid questions")
        
        # Remove duplicates across all questions in this group
        all_questions = self.remove_duplicates(all_questions)
        logger.info(f"{key}: After deduplication: {len(all_questions)} unique questions")
        
        # Create full sets
        full_sets_created = 0
        questions_moved = 0
        sets_to_delete = []
        
        # Fill existing sets first
        for i, set_info in enumerate(set_data_list):
            if len(all_questions) >= self.target_size:
                # Take 10 questions for this set
                set_info['data']['questions'] = all_questions[:self.target_size]
                all_questions = all_questions[self.target_size:]
                
                if not dry_run:
                    await self._update_set(conn, set_info['id'], set_info['data'])
                
                full_sets_created += 1
                questions_moved += (10 - set_info['original_count'])
            else:
                # Not enough questions left, mark for deletion
                sets_to_delete.append(set_info['id'])
        
        # Delete empty sets
        if sets_to_delete and not dry_run:
            await self._delete_sets(conn, sets_to_delete)
        
        # Report orphan questions
        orphan_count = len(all_questions)
        if orphan_count > 0:
            logger.warning(f"{key}: {orphan_count} orphan questions (not enough for a full set)")
            # Could save these to a special "orphan questions" table for manual review
        
        return {
            'fixed': full_sets_created,
            'deleted': len(sets_to_delete),
            'moved': questions_moved,
            'orphans': orphan_count,
            'quality_stats': {
                'opinion_removed': self.stats['opinion_removed'],
                'too_long_fixed': self.stats['too_long_fixed'],
                'duplicates_removed': self.stats['duplicates_removed']
            }
        }
    
    async def _update_set(self, conn: asyncpg.Connection, set_id: str, data: dict):
        """Update a quiz set with rebalanced and cleaned data"""
        metadata_update = {
            'rebalanced': True,
            'rebalanced_at': datetime.now().isoformat(),
            'quality_checked': True,
            'original_question_count': len(data.get('questions', []))
        }
        
        query = """
        UPDATE content
        SET 
            data = $2,
            metadata = metadata || $3::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        """
        
        await conn.execute(query, set_id, json.dumps(data), json.dumps(metadata_update))
    
    async def _delete_sets(self, conn: asyncpg.Connection, set_ids: List[str]):
        """Delete empty quiz sets"""
        query = """
        DELETE FROM content
        WHERE id = ANY($1::uuid[])
        """
        
        await conn.execute(query, set_ids)
    
    async def analyze_problem(self) -> Dict:
        """Analyze current state with quality criteria preview"""
        async with self.db_pool.acquire() as conn:
            # Standard analysis query
            query = """
            SELECT 
                data->>'category' as category,
                data->>'mode' as mode,
                jsonb_array_length(data->'questions') as question_count,
                COUNT(*) as set_count,
                SUM(jsonb_array_length(data->'questions')) as total_questions
            FROM content
            WHERE type = 'quiz_set'
                AND data ? 'questions'
            GROUP BY 
                data->>'category',
                data->>'mode',
                jsonb_array_length(data->'questions')
            ORDER BY 
                data->>'category',
                data->>'mode',
                question_count DESC
            """
            
            results = await conn.fetch(query)
            
            # Also sample some questions to check quality issues
            sample_query = """
            SELECT data
            FROM content
            WHERE type = 'quiz_set'
                AND jsonb_array_length(data->'questions') < 10
            LIMIT 100
            """
            
            samples = await conn.fetch(sample_query)
            
            # Count quality issues in sample
            opinion_count = 0
            long_count = 0
            
            for row in samples:
                data = row['data']
                if isinstance(data, str):
                    data = json.loads(data)
                
                for q in data.get('questions', []):
                    if self.is_opinion_question(q.get('question', '')):
                        opinion_count += 1
                    
                    # Check lengths
                    if len(q.get('question', '').split()) > 35:
                        long_count += 1
                    
                    for ans in q.get('answers', []):
                        if len(ans.get('text', '').split()) > 8:
                            long_count += 1
                            break
            
            # Build standard stats
            stats = {
                'total_sets': sum(row['set_count'] for row in results),
                'partial_sets': sum(row['set_count'] for row in results if row['question_count'] < 10),
                'full_sets': sum(row['set_count'] for row in results if row['question_count'] == 10),
                'quality_preview': {
                    'sample_size': len(samples),
                    'opinion_questions_found': opinion_count,
                    'overly_long_found': long_count
                }
            }
            
            return stats
    
    async def rebalance_all(self, dry_run: bool = False) -> Dict:
        """Main rebalancing with quality criteria"""
        start_time = datetime.now()
        
        # Reset stats
        self.stats = {
            'opinion_removed': 0,
            'too_long_fixed': 0,
            'duplicates_removed': 0,
            'incorrect_facts_removed': 0
        }
        
        results = {
            'sets_processed': 0,
            'sets_fixed': 0,
            'sets_deleted': 0,
            'questions_moved': 0,
            'orphan_questions': 0,
            'quality_improvements': {},
            'errors': []
        }
        
        async with self.db_pool.acquire() as conn:
            # Get all partial sets grouped by category/mode
            query = """
            SELECT 
                id,
                data,
                metadata,
                data->>'category' || '/' || COALESCE(data->>'mode', 'standard') as group_key
            FROM content
            WHERE type = 'quiz_set'
                AND jsonb_array_length(data->'questions') < $1
            ORDER BY group_key
            """
            
            rows = await conn.fetch(query, self.target_size)
            
            # Group by category/mode
            groups = defaultdict(list)
            for row in rows:
                groups[row['group_key']].append(row)
            
            # Process each group
            for key, sets in groups.items():
                try:
                    logger.info(f"\nProcessing {key} ({len(sets)} sets)")
                    
                    group_results = await self._process_group_with_criteria(
                        conn, key, sets, dry_run
                    )
                    
                    results['sets_processed'] += len(sets)
                    results['sets_fixed'] += group_results['fixed']
                    results['sets_deleted'] += group_results['deleted']
                    results['questions_moved'] += group_results['moved']
                    results['orphan_questions'] += group_results['orphans']
                    
                except Exception as e:
                    logger.error(f"Error processing {key}: {e}")
                    results['errors'].append(f"{key}: {str(e)}")
        
        # Add quality stats to results
        results['quality_improvements'] = self.stats.copy()
        results['duration_seconds'] = (datetime.now() - start_time).total_seconds()
        
        return results


async def main():
    import os
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    
    try:
        rebalancer = SmartQuizRebalancer(db_pool)
        
        # Analyze first
        print("=== ANALYZING QUIZ SETS WITH QUALITY CHECK ===")
        stats = await rebalancer.analyze_problem()
        
        print(f"\nTotal quiz sets: {stats['total_sets']}")
        print(f"Full sets (10 questions): {stats['full_sets']}")
        print(f"Partial sets (< 10 questions): {stats['partial_sets']}")
        
        if stats['quality_preview']['sample_size'] > 0:
            print(f"\n=== QUALITY PREVIEW (sample of {stats['quality_preview']['sample_size']}) ===")
            print(f"Opinion questions found: {stats['quality_preview']['opinion_questions_found']}")
            print(f"Overly long Q/A found: {stats['quality_preview']['overly_long_found']}")
        
        if stats['partial_sets'] == 0:
            print("\nNo partial sets found!")
            return
        
        # Explain what will happen
        print(f"\n{'='*60}")
        print("SMART REBALANCER WILL:")
        print("1. Remove opinion-based questions")
        print("2. Fix overly long questions/answers")
        print("3. Remove duplicate questions")
        print("4. Rebalance sets to exactly 10 questions")
        print("5. Delete containers that can't be filled")
        print(f"{'='*60}")
        
        response = input("\nProceed? (y/n/dry-run): ").lower()
        
        if response == 'n':
            print("Cancelled.")
            return
        
        dry_run = (response == 'dry-run')
        if dry_run:
            print("\n=== DRY RUN MODE ===")
        
        # Run rebalancer
        print(f"\n=== REBALANCING WITH QUALITY CRITERIA ===")
        results = await rebalancer.rebalance_all(dry_run=dry_run)
        
        # Report results
        print(f"\n=== REBALANCING COMPLETE ===")
        print(f"Duration: {results['duration_seconds']:.1f} seconds")
        print(f"Sets processed: {results['sets_processed']}")
        print(f"Sets fixed: {results['sets_fixed']}")
        print(f"Sets deleted: {results['sets_deleted']}")
        print(f"Questions moved: {results['questions_moved']}")
        print(f"Orphan questions: {results['orphan_questions']}")
        
        print(f"\n=== QUALITY IMPROVEMENTS ===")
        for key, value in results['quality_improvements'].items():
            if value > 0:
                print(f"{key}: {value}")
        
        if results['errors']:
            print(f"\n=== ERRORS ===")
            for error in results['errors']:
                print(f"  - {error}")
        
        if not dry_run:
            print("\n✅ Database has been updated!")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main()
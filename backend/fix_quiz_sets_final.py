#!/usr/bin/env python3
"""
Final Quiz Set Rebalancer - Based on actual API structure
Fixes quiz sets to have exactly 10 questions in data.questions array
"""

import asyncio
import asyncpg
import json
import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class QuizSetRebalancer:
    """Rebalances quiz sets to ensure exactly 10 questions each"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.target_size = 10
        
    async def analyze_problem(self) -> Dict:
        """Analyze the current state of quiz sets"""
        async with self.db_pool.acquire() as conn:
            # Count sets by question count
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
            
            # Calculate statistics
            stats = {
                'total_sets': 0,
                'partial_sets': 0,
                'full_sets': 0,
                'empty_sets': 0,
                'by_category': defaultdict(lambda: {
                    'partial_sets': 0,
                    'total_questions': 0,
                    'can_make_full': 0,
                    'orphan_questions': 0
                })
            }
            
            # Group by category/mode
            category_questions = defaultdict(int)
            
            for row in results:
                key = f"{row['category']}/{row['mode']}"
                count = row['question_count']
                sets = row['set_count']
                
                stats['total_sets'] += sets
                
                if count == 10:
                    stats['full_sets'] += sets
                elif count == 0:
                    stats['empty_sets'] += sets
                else:
                    stats['partial_sets'] += sets
                    stats['by_category'][key]['partial_sets'] += sets
                    category_questions[key] += row['total_questions']
            
            # Calculate how many full sets can be made
            for key, total_q in category_questions.items():
                can_make = total_q // 10
                orphans = total_q % 10
                stats['by_category'][key]['total_questions'] = total_q
                stats['by_category'][key]['can_make_full'] = can_make
                stats['by_category'][key]['orphan_questions'] = orphans
            
            return stats
    
    async def rebalance_all(self, dry_run: bool = False) -> Dict:
        """Main rebalancing process"""
        start_time = datetime.now()
        results = {
            'sets_processed': 0,
            'sets_fixed': 0,
            'sets_deleted': 0,
            'questions_moved': 0,
            'orphan_questions': 0,
            'errors': []
        }
        
        async with self.db_pool.acquire() as conn:
            # Get all partial sets grouped by category/mode
            query = """
            SELECT 
                id,
                data,
                metadata,
                data->>'category' as category,
                data->>'mode' as mode,
                jsonb_array_length(data->'questions') as question_count
            FROM content
            WHERE type = 'quiz_set'
                AND data ? 'questions'
                AND jsonb_array_length(data->'questions') < 10
            ORDER BY 
                data->>'category',
                data->>'mode',
                jsonb_array_length(data->'questions') DESC
            """
            
            partial_sets = await conn.fetch(query)
            results['sets_processed'] = len(partial_sets)
            
            # Group by category/mode
            grouped = defaultdict(list)
            for row in partial_sets:
                key = f"{row['category']}/{row['mode']}"
                grouped[key].append(row)
            
            logger.info(f"Processing {len(grouped)} category/mode combinations")
            
            # Process each group
            for key, sets in grouped.items():
                try:
                    group_results = await self._process_group(
                        conn, key, sets, dry_run
                    )
                    
                    results['sets_fixed'] += group_results['fixed']
                    results['sets_deleted'] += group_results['deleted']
                    results['questions_moved'] += group_results['moved']
                    results['orphan_questions'] += group_results['orphans']
                    
                except Exception as e:
                    logger.error(f"Error processing {key}: {e}")
                    results['errors'].append(f"{key}: {str(e)}")
        
        results['duration_seconds'] = (datetime.now() - start_time).total_seconds()
        return results
    
    async def _process_group(self, conn: asyncpg.Connection, key: str, 
                            sets: List, dry_run: bool) -> Dict:
        """Process all partial sets in a category/mode group"""
        category, mode = key.split('/')
        
        # Collect all questions
        all_questions = []
        set_data_list = []
        
        for row in sets:
            # Parse JSON if it's a string
            data = row['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            questions = data.get('questions', [])
            all_questions.extend(questions)
            set_data_list.append({
                'id': row['id'],
                'data': data,
                'metadata': row['metadata'],
                'original_count': len(questions)
            })
        
        logger.info(f"{key}: Found {len(sets)} partial sets with {len(all_questions)} total questions")
        
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
                    # Update the set
                    await self._update_set(conn, set_info['id'], set_info['data'])
                
                full_sets_created += 1
                questions_moved += (10 - set_info['original_count'])
            else:
                # Not enough questions left, mark for deletion
                sets_to_delete.append(set_info['id'])
        
        # Delete empty sets
        if sets_to_delete and not dry_run:
            await self._delete_sets(conn, sets_to_delete)
        
        # Log orphan questions
        orphan_count = len(all_questions)
        if orphan_count > 0:
            logger.warning(f"{key}: {orphan_count} orphan questions (not enough for a full set)")
        
        return {
            'fixed': full_sets_created,
            'deleted': len(sets_to_delete),
            'moved': questions_moved,
            'orphans': orphan_count
        }
    
    async def _update_set(self, conn: asyncpg.Connection, set_id: str, data: dict):
        """Update a quiz set with rebalanced data"""
        # Update metadata to track rebalancing
        metadata_update = {
            'rebalanced': True,
            'rebalanced_at': datetime.now().isoformat(),
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


async def main():
    import os
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    
    try:
        rebalancer = QuizSetRebalancer(db_pool)
        
        # Analyze first
        print("=== ANALYZING QUIZ SETS ===")
        stats = await rebalancer.analyze_problem()
        
        print(f"\nTotal quiz sets: {stats['total_sets']}")
        print(f"Full sets (10 questions): {stats['full_sets']}")
        print(f"Partial sets (< 10 questions): {stats['partial_sets']}")
        print(f"Empty sets (0 questions): {stats['empty_sets']}")
        
        if stats['partial_sets'] > 0:
            print(f"\n=== PARTIAL SETS BY CATEGORY/MODE ===")
            for key, data in sorted(stats['by_category'].items()):
                if data['partial_sets'] > 0:
                    print(f"\n{key}:")
                    print(f"  Partial sets: {data['partial_sets']}")
                    print(f"  Total questions: {data['total_questions']}")
                    print(f"  Can make {data['can_make_full']} full sets")
                    print(f"  Will have {data['orphan_questions']} orphan questions")
        
        if stats['partial_sets'] == 0:
            print("\nNo partial sets found! All quiz sets have 10 questions.")
            return
        
        # Ask for confirmation
        print(f"\n{'='*50}")
        print(f"Ready to rebalance {stats['partial_sets']} partial quiz sets")
        print(f"{'='*50}")
        
        response = input("\nProceed with rebalancing? (y/n/dry-run): ").lower()
        
        if response == 'n':
            print("Cancelled.")
            return
        
        dry_run = (response == 'dry-run')
        if dry_run:
            print("\n=== DRY RUN MODE - No changes will be made ===")
        
        # Run rebalancer
        print(f"\n=== REBALANCING QUIZ SETS ===")
        results = await rebalancer.rebalance_all(dry_run=dry_run)
        
        print(f"\n=== REBALANCING {'SIMULATION' if dry_run else 'COMPLETE'} ===")
        print(f"Sets processed: {results['sets_processed']}")
        print(f"Sets fixed: {results['sets_fixed']}")
        print(f"Sets deleted: {results['sets_deleted']}")
        print(f"Questions moved: {results['questions_moved']}")
        print(f"Orphan questions: {results['orphan_questions']}")
        print(f"Time taken: {results['duration_seconds']:.1f} seconds")
        
        if results['errors']:
            print(f"\nErrors encountered: {len(results['errors'])}")
            for error in results['errors'][:5]:
                print(f"  - {error}")
        
        if not dry_run and results['sets_fixed'] > 0:
            print("\n✅ Quiz sets have been rebalanced successfully!")
            print("The database viewer should now show 0 partial packs.")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
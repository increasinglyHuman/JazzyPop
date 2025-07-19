#!/usr/bin/env python3
"""
JSON-based Quiz Set Rebalancer
Fixes quiz sets by ensuring each has exactly 10 questions in its JSON data
"""

import asyncio
import asyncpg
import json
import logging
from collections import defaultdict
from typing import Dict, List

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class JsonQuizRebalancer:
    """Rebalances quiz sets by fixing their JSON question arrays"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.target_size = 10
        
    async def rebalance_all_sets(self) -> Dict[str, int]:
        """Main rebalancing process"""
        stats = {
            "sets_examined": 0,
            "sets_fixed": 0,
            "sets_deleted": 0,
            "questions_moved": 0,
            "orphan_questions": 0
        }
        
        async with self.db_pool.acquire() as conn:
            # Get all quiz sets with their question counts
            query = """
            SELECT 
                id,
                type,
                data,
                metadata,
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
            stats["sets_examined"] = len(partial_sets)
            
            logger.info(f"Found {len(partial_sets)} partial quiz sets to rebalance")
            
            # Group by category/mode
            grouped_sets = defaultdict(list)
            for row in partial_sets:
                data = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
                category = data.get('category', 'unknown')
                mode = data.get('mode', 'standard')
                key = f"{category}/{mode}"
                
                grouped_sets[key].append({
                    'id': row['id'],
                    'data': data,
                    'metadata': row['metadata'],
                    'questions': data.get('questions', [])
                })
            
            # Process each category/mode group
            for key, sets in grouped_sets.items():
                logger.info(f"Processing {key}: {len(sets)} partial sets")
                
                # Collect all questions from partial sets
                all_questions = []
                set_ids_to_update = []
                set_ids_to_delete = []
                
                for quiz_set in sets:
                    all_questions.extend(quiz_set['questions'])
                    set_ids_to_update.append(quiz_set['id'])
                
                # Create full sets of 10
                full_sets_created = 0
                while len(all_questions) >= self.target_size:
                    # Take 10 questions
                    questions_for_set = all_questions[:self.target_size]
                    all_questions = all_questions[self.target_size:]
                    
                    # Use the first set as template or create new one
                    if set_ids_to_update and full_sets_created < len(sets):
                        # Update existing set
                        set_to_update = sets[full_sets_created]
                        set_to_update['data']['questions'] = questions_for_set
                        
                        await self._update_set(conn, set_to_update['id'], set_to_update['data'])
                        stats["sets_fixed"] += 1
                        full_sets_created += 1
                    else:
                        # Would need to create new set - but this is rare
                        logger.warning(f"Need to create new set for {key} - skipping for now")
                
                # Mark remaining sets for deletion (they'll be empty)
                for i in range(full_sets_created, len(sets)):
                    set_ids_to_delete.append(sets[i]['id'])
                
                # Delete empty sets
                if set_ids_to_delete:
                    await self._delete_sets(conn, set_ids_to_delete)
                    stats["sets_deleted"] += len(set_ids_to_delete)
                
                # Log orphan questions
                if all_questions:
                    stats["orphan_questions"] += len(all_questions)
                    logger.warning(f"{key}: {len(all_questions)} orphan questions (not enough for a full set)")
                
                stats["questions_moved"] += len(sets) * 10 - len(all_questions)
        
        return stats
    
    async def _update_set(self, conn: asyncpg.Connection, set_id: str, data: dict):
        """Update a quiz set's data"""
        query = """
        UPDATE content
        SET data = $1,
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{rebalanced}',
                'true'::jsonb
            ) || jsonb_build_object(
                'rebalanced_at', CURRENT_TIMESTAMP,
                'rebalanced_by', 'json_rebalancer'
            )
        WHERE id = $1
        """
        
        await conn.execute(query, json.dumps(data), set_id)
    
    async def _delete_sets(self, conn: asyncpg.Connection, set_ids: List[str]):
        """Delete empty quiz sets"""
        query = """
        DELETE FROM content
        WHERE id = ANY($1::uuid[])
        """
        
        await conn.execute(query, set_ids)


async def analyze_before_rebalance(db_pool):
    """Quick analysis of the problem"""
    async with db_pool.acquire() as conn:
        query = """
        SELECT 
            data->>'category' as category,
            data->>'mode' as mode,
            jsonb_array_length(data->'questions') as question_count,
            COUNT(*) as set_count
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
        
        print("\n=== QUIZ SET ANALYSIS ===")
        print("Category/Mode | Question Count | Number of Sets")
        print("-" * 50)
        
        current_category = None
        total_partial = 0
        
        for row in results:
            key = f"{row['category']}/{row['mode']}"
            if key != current_category:
                if current_category:
                    print()  # Empty line between categories
                current_category = key
            
            if row['question_count'] < 10:
                total_partial += row['set_count']
                marker = " ⚠️"
            else:
                marker = " ✓"
            
            print(f"{key:20} | {row['question_count']:2} questions | {row['set_count']:3} sets{marker}")
        
        print(f"\nTotal partial sets (< 10 questions): {total_partial}")


async def main():
    import os
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    
    try:
        # Analyze first
        await analyze_before_rebalance(db_pool)
        
        # Confirm
        response = input("\nProceed with JSON rebalancing? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
        
        # Run rebalancer
        print("\nRunning JSON quiz set rebalancer...")
        rebalancer = JsonQuizRebalancer(db_pool)
        stats = await rebalancer.rebalance_all_sets()
        
        print(f"\n=== REBALANCING COMPLETE ===")
        print(f"Sets examined: {stats['sets_examined']}")
        print(f"Sets fixed: {stats['sets_fixed']}")
        print(f"Sets deleted: {stats['sets_deleted']}")
        print(f"Questions moved: {stats['questions_moved']}")
        print(f"Orphan questions: {stats['orphan_questions']}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
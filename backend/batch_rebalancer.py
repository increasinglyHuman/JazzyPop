#!/usr/bin/env python3
"""
Batch rebalancer optimized for large numbers of partial packs
Processes packs in batches by category/mode for efficiency
"""

import asyncio
import asyncpg
import logging
from typing import Dict, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class BatchQuizPackRebalancer:
    """Optimized rebalancer for large-scale operations"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.target_pack_size = 10
        self.batch_size = 50  # Process 50 category/mode combos at a time
        
    async def rebalance_all_packs_batch(self) -> Dict[str, int]:
        """Batch process all partial packs for efficiency"""
        start_time = datetime.now()
        
        stats = {
            "categories_processed": 0,
            "packs_examined": 0,
            "packs_deleted": 0,
            "full_packs_created": 0,
            "quizzes_rebalanced": 0,
            "orphan_quizzes_archived": 0,
            "errors": 0
        }
        
        try:
            # Get all category/mode combinations with partial packs
            categories = await self._get_categories_with_partials()
            total_categories = len(categories)
            
            logger.info(f"Found {total_categories} category/mode combinations to process")
            
            # Process in batches
            for i in range(0, total_categories, self.batch_size):
                batch = categories[i:i + self.batch_size]
                batch_num = (i // self.batch_size) + 1
                total_batches = (total_categories + self.batch_size - 1) // self.batch_size
                
                logger.info(f"Processing batch {batch_num}/{total_batches}")
                
                batch_stats = await self._process_category_batch(batch)
                
                # Update stats
                for key, value in batch_stats.items():
                    stats[key] += value
                
                stats["categories_processed"] += len(batch)
                
                # Progress report
                elapsed = (datetime.now() - start_time).seconds
                rate = stats["categories_processed"] / max(elapsed, 1)
                remaining = (total_categories - stats["categories_processed"]) / max(rate, 0.1)
                
                logger.info(
                    f"Progress: {stats['categories_processed']}/{total_categories} categories, "
                    f"{stats['packs_deleted']} packs deleted, "
                    f"{stats['full_packs_created']} full packs created, "
                    f"ETA: {int(remaining)}s"
                )
        
        except Exception as e:
            logger.error(f"Fatal error in batch rebalancing: {e}")
            stats["errors"] += 1
        
        elapsed_time = (datetime.now() - start_time).seconds
        stats["elapsed_seconds"] = elapsed_time
        
        logger.info(f"Rebalancing complete in {elapsed_time}s: {stats}")
        return stats
    
    async def _get_categories_with_partials(self) -> List[tuple]:
        """Get all category/mode combinations that have partial packs"""
        async with self.db_pool.acquire() as conn:
            query = """
            SELECT DISTINCT qs.category, qs.mode
            FROM quiz_sets qs
            JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
            WHERE qs.is_active = true
            GROUP BY qs.set_id, qs.category, qs.mode
            HAVING COUNT(qsq.quiz_id) < 10
            ORDER BY qs.category, qs.mode
            """
            rows = await conn.fetch(query)
            return [(row['category'], row['mode']) for row in rows]
    
    async def _process_category_batch(self, categories: List[tuple]) -> Dict[str, int]:
        """Process a batch of categories"""
        batch_stats = {
            "packs_examined": 0,
            "packs_deleted": 0,
            "full_packs_created": 0,
            "quizzes_rebalanced": 0,
            "orphan_quizzes_archived": 0,
            "errors": 0
        }
        
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                for category, mode in categories:
                    try:
                        cat_stats = await self._rebalance_category(
                            conn, category, mode
                        )
                        
                        # Update batch stats
                        for key, value in cat_stats.items():
                            if key in batch_stats:
                                batch_stats[key] += value
                                
                    except Exception as e:
                        logger.error(f"Error processing {category}/{mode}: {e}")
                        batch_stats["errors"] += 1
        
        return batch_stats
    
    async def _rebalance_category(self, conn: asyncpg.Connection, 
                                 category: str, mode: str) -> Dict[str, int]:
        """Rebalance all partial packs in a single category/mode"""
        cat_stats = {
            "packs_examined": 0,
            "packs_deleted": 0,
            "full_packs_created": 0,
            "quizzes_rebalanced": 0,
            "orphan_quizzes_archived": 0
        }
        
        # Get all partial packs for this category/mode
        query = """
        SELECT 
            qs.set_id,
            ARRAY_AGG(qsq.quiz_id ORDER BY qsq.position) as quiz_ids
        FROM quiz_sets qs
        JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
            AND qs.category = $1
            AND qs.mode = $2
        GROUP BY qs.set_id
        HAVING COUNT(qsq.quiz_id) < 10
        ORDER BY COUNT(qsq.quiz_id) DESC
        """
        
        partial_packs = await conn.fetch(query, category, mode)
        cat_stats["packs_examined"] = len(partial_packs)
        
        if not partial_packs:
            return cat_stats
        
        # Collect all quizzes from partial packs
        all_quiz_ids = []
        pack_ids_to_delete = []
        
        for pack in partial_packs:
            all_quiz_ids.extend(pack['quiz_ids'])
            pack_ids_to_delete.append(pack['set_id'])
        
        # Delete the original partial packs
        await self._delete_packs_batch(conn, pack_ids_to_delete)
        cat_stats["packs_deleted"] = len(pack_ids_to_delete)
        
        # Create new full packs from the quizzes
        while len(all_quiz_ids) >= self.target_pack_size:
            pack_quizzes = all_quiz_ids[:self.target_pack_size]
            all_quiz_ids = all_quiz_ids[self.target_pack_size:]
            
            await self._create_full_pack(conn, category, mode, pack_quizzes)
            cat_stats["full_packs_created"] += 1
            cat_stats["quizzes_rebalanced"] += len(pack_quizzes)
        
        # Handle leftover quizzes
        if all_quiz_ids:
            await self._archive_orphan_quizzes_batch(conn, all_quiz_ids)
            cat_stats["orphan_quizzes_archived"] = len(all_quiz_ids)
            
            logger.debug(
                f"{category}/{mode}: Archived {len(all_quiz_ids)} orphan quizzes"
            )
        
        return cat_stats
    
    async def _create_full_pack(self, conn: asyncpg.Connection,
                               category: str, mode: str, quiz_ids: List[str]):
        """Create a new full pack"""
        # Create the quiz set
        set_id = await conn.fetchval("""
            INSERT INTO quiz_sets (category, mode, is_active, metadata)
            VALUES ($1, $2, true, jsonb_build_object(
                'created_by', 'batch_rebalancer',
                'created_at', CURRENT_TIMESTAMP,
                'rebalanced', true
            ))
            RETURNING set_id
        """, category, mode)
        
        # Batch insert quiz questions
        await conn.executemany("""
            INSERT INTO quiz_set_questions (set_id, quiz_id, position)
            VALUES ($1, $2, $3)
        """, [(set_id, quiz_id, i) for i, quiz_id in enumerate(quiz_ids)])
    
    async def _delete_packs_batch(self, conn: asyncpg.Connection, set_ids: List[str]):
        """Delete multiple packs efficiently"""
        if not set_ids:
            return
            
        # Delete quiz set questions
        await conn.execute("""
            DELETE FROM quiz_set_questions 
            WHERE set_id = ANY($1::text[])
        """, set_ids)
        
        # Delete quiz sets
        await conn.execute("""
            DELETE FROM quiz_sets
            WHERE set_id = ANY($1::text[])
        """, set_ids)
    
    async def _archive_orphan_quizzes_batch(self, conn: asyncpg.Connection, 
                                           quiz_ids: List[str]):
        """Archive orphan quizzes efficiently"""
        if not quiz_ids:
            return
            
        # Check if table exists, create if not
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS archived_orphan_quizzes (
                quiz_id TEXT PRIMARY KEY,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )
        """)
        
        # Batch insert archives
        await conn.execute("""
            INSERT INTO archived_orphan_quizzes (quiz_id, metadata)
            SELECT 
                unnest($1::text[]),
                jsonb_build_object(
                    'reason', 'insufficient_for_pack',
                    'archived_by', 'batch_rebalancer'
                )
            ON CONFLICT (quiz_id) DO NOTHING
        """, quiz_ids)


async def run_batch_rebalancer(db_pool: asyncpg.Pool):
    """Run the batch rebalancer"""
    rebalancer = BatchQuizPackRebalancer(db_pool)
    stats = await rebalancer.rebalance_all_packs_batch()
    return stats


async def main():
    import os
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    
    db_pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=5,
        max_size=20,  # More connections for batch processing
        command_timeout=60
    )
    
    try:
        print("=== BATCH QUIZ PACK REBALANCER ===")
        print("Optimized for processing 698 partial packs")
        print()
        
        # First analyze
        print("Analyzing partial packs...")
        from analyze_partial_packs import analyze_partial_packs
        await analyze_partial_packs(db_pool)
        
        # Confirm
        response = input("\nProceed with batch rebalancing? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
        
        # Run batch rebalancer
        print("\nStarting batch rebalancing...")
        stats = await run_batch_rebalancer(db_pool)
        
        print(f"\n=== FINAL RESULTS ===")
        print(f"Categories processed: {stats['categories_processed']}")
        print(f"Packs deleted: {stats['packs_deleted']}")
        print(f"Full packs created: {stats['full_packs_created']}")
        print(f"Quizzes rebalanced: {stats['quizzes_rebalanced']}")
        print(f"Orphan quizzes archived: {stats['orphan_quizzes_archived']}")
        print(f"Time taken: {stats.get('elapsed_seconds', 0)}s")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
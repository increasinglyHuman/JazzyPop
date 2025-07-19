#!/usr/bin/env python3
"""
Test script to run the quiz pack rebalancer on existing database
"""

import asyncio
import asyncpg
import os
import logging
from quiz_pack_rebalancer import QuizPackRebalancer

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def check_current_state(db_pool):
    """Check current state of quiz packs before rebalancing"""
    async with db_pool.acquire() as conn:
        # Count partial packs
        partial_query = """
        SELECT 
            COUNT(DISTINCT qs.set_id) as partial_pack_count,
            COUNT(qsq.quiz_id) as total_quizzes_in_partials,
            STRING_AGG(DISTINCT qs.category || '/' || qs.mode, ', ') as categories
        FROM quiz_sets qs
        JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
        GROUP BY qs.set_id
        HAVING COUNT(qsq.quiz_id) < 10
        """
        
        # Get detailed breakdown
        details_query = """
        SELECT 
            qs.category,
            qs.mode,
            COUNT(DISTINCT qs.set_id) as pack_count,
            STRING_AGG(
                qs.set_id || ':' || COUNT(qsq.quiz_id)::text, 
                ', ' 
                ORDER BY COUNT(qsq.quiz_id) DESC
            ) as pack_details
        FROM quiz_sets qs
        LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
        GROUP BY qs.set_id, qs.category, qs.mode
        HAVING COUNT(qsq.quiz_id) < 10
        ORDER BY qs.category, qs.mode
        """
        
        # Get empty packs
        empty_query = """
        SELECT COUNT(*) as empty_packs
        FROM quiz_sets qs
        LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
        GROUP BY qs.set_id
        HAVING COUNT(qsq.quiz_id) = 0
        """
        
        details = await conn.fetch(details_query)
        empty_count = await conn.fetchval(empty_query) or 0
        
        print("\n=== CURRENT STATE ===")
        print(f"Empty packs: {empty_count}")
        print("\nPartial packs by category/mode:")
        
        for row in details:
            print(f"\n{row['category']}/{row['mode']}:")
            # Parse pack details
            pack_info = row['pack_details'].split(', ')
            for info in pack_info:
                set_id, count = info.split(':')
                print(f"  - Pack {set_id}: {count} quizzes")


async def main():
    """Run the rebalancer test"""
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    
    # Create connection pool
    db_pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,
        max_size=10
    )
    
    try:
        print("JazzyPop Quiz Pack Rebalancer Test")
        print("===================================")
        
        # Check current state
        await check_current_state(db_pool)
        
        # Ask for confirmation
        response = input("\nProceed with rebalancing? (y/n): ")
        if response.lower() != 'y':
            print("Rebalancing cancelled.")
            return
        
        # Create tables if they don't exist
        async with db_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS archived_orphan_quizzes (
                    quiz_id TEXT PRIMARY KEY,
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB
                );
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_archived_orphans_date 
                ON archived_orphan_quizzes(archived_at);
            """)
        
        # Run rebalancer
        print("\n=== RUNNING REBALANCER ===")
        rebalancer = QuizPackRebalancer(db_pool)
        stats = await rebalancer.rebalance_all_packs()
        
        print("\n=== REBALANCING RESULTS ===")
        print(f"Packs examined: {stats['packs_examined']}")
        print(f"Packs fixed: {stats['packs_fixed']}")
        print(f"Quizzes moved: {stats['quizzes_moved']}")
        print(f"Orphan quizzes saved: {stats['orphan_quizzes_saved']}")
        print(f"Packs deleted: {stats['packs_deleted']}")
        print(f"Errors: {stats['errors']}")
        
        # Check final state
        print("\n=== FINAL STATE ===")
        await check_current_state(db_pool)
        
        # Show any archived orphans
        async with db_pool.acquire() as conn:
            orphan_count = await conn.fetchval(
                "SELECT COUNT(*) FROM archived_orphan_quizzes"
            )
            if orphan_count:
                print(f"\nArchived orphan quizzes: {orphan_count}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
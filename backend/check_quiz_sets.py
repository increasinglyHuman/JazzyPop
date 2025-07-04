#!/usr/bin/env python3
"""Check quiz_set history and structure"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get date range of quiz_sets
            result = await conn.fetchrow("""
                SELECT 
                    MIN(created_at) as earliest,
                    MAX(created_at) as latest,
                    COUNT(*) as total
                FROM content 
                WHERE type = 'quiz_set'
            """)
            
            print(f"Quiz sets: {result['total']}")
            print(f"Earliest: {result['earliest']}")
            print(f"Latest: {result['latest']}")
            
            # Get creation pattern
            daily = await conn.fetch("""
                SELECT DATE(created_at) as day, COUNT(*) as count
                FROM content
                WHERE type = 'quiz_set'
                GROUP BY DATE(created_at)
                ORDER BY day DESC
                LIMIT 10
            """)
            
            print("\nRecent daily creation:")
            for row in daily:
                print(f"  {row['day']}: {row['count']} quiz_sets")
            
            # Check content structure
            sample = await conn.fetchrow("""
                SELECT data, created_at 
                FROM content 
                WHERE type = 'quiz_set' 
                ORDER BY created_at DESC
                LIMIT 1
            """)
            
            if sample:
                data = json.loads(sample['data'])
                print(f"\nLatest quiz_set structure ({sample['created_at']}):")
                print(f"  Keys: {list(data.keys())}")
                if 'questions' in data:
                    print(f"  Number of questions: {len(data['questions'])}")
                elif isinstance(data, list):
                    print(f"  Array of {len(data)} items")
                    
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
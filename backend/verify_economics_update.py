#!/usr/bin/env python3
"""
Verify that economics data has been added to quiz sets
Shows sample data and statistics
"""
import asyncio
import json
from database import db
from datetime import datetime

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get statistics
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN data::jsonb ? 'economics' THEN 1 END) as with_economics,
                    COUNT(CASE WHEN metadata::jsonb -> 'economics_added' = 'true' THEN 1 END) as marked_updated
                FROM content
                WHERE type = 'quiz_set'
            """)
            
            print("Quiz Set Economics Status")
            print("=" * 50)
            print(f"Total quiz sets: {stats['total']}")
            print(f"With economics data: {stats['with_economics']}")
            print(f"Marked as updated: {stats['marked_updated']}")
            print(f"Percentage complete: {stats['with_economics'] / stats['total'] * 100:.1f}%")
            
            # Get a sample of quiz sets with economics
            samples = await conn.fetch("""
                SELECT id, data, metadata, created_at
                FROM content
                WHERE type = 'quiz_set'
                AND data::jsonb ? 'economics'
                ORDER BY updated_at DESC
                LIMIT 3
            """)
            
            print("\n" + "=" * 50)
            print("Sample Quiz Sets with Economics Data:")
            print("=" * 50)
            
            for i, sample in enumerate(samples, 1):
                data = json.loads(sample['data']) if isinstance(sample['data'], str) else sample['data']
                metadata = json.loads(sample['metadata']) if isinstance(sample['metadata'], str) else sample['metadata']
                
                print(f"\nSample {i}:")
                print(f"ID: {sample['id']}")
                print(f"Title: {data.get('title', 'No title')}")
                print(f"Category: {data.get('category', 'Unknown')}")
                print(f"Difficulty: {data.get('difficulty', 'Unknown')}")
                
                if 'economics' in data:
                    econ = data['economics']
                    print(f"\nEconomics Data:")
                    print(f"  Cost: {econ.get('cost', {})}")
                    print(f"  Base Rewards: {econ.get('rewards', {})}")
                    print(f"  Tier: {econ.get('tier', 'Unknown')}")
                    print(f"  Value Score: {econ.get('value_score', 'Unknown')}")
                    
                    if 'perfect_bonus' in econ:
                        print(f"  Perfect Bonus: XP x{econ['perfect_bonus'].get('xp_multiplier', 1)}, Coins x{econ['perfect_bonus'].get('coins_multiplier', 1)}")
                    
                    if 'mode_multipliers' in econ:
                        print(f"  Mode Multipliers: {json.dumps(econ['mode_multipliers'], indent=4)}")
                
                if metadata.get('economics_updated_at'):
                    print(f"\nUpdated at: {metadata['economics_updated_at']}")
            
            # Check for any quiz sets without economics
            without_econ = await conn.fetch("""
                SELECT id, data->>'title' as title, data->>'category' as category
                FROM content
                WHERE type = 'quiz_set'
                AND NOT (data::jsonb ? 'economics')
                LIMIT 5
            """)
            
            if without_econ:
                print("\n" + "=" * 50)
                print("Quiz Sets WITHOUT Economics (need update):")
                print("=" * 50)
                for quiz in without_econ:
                    print(f"- {quiz['title']} (Category: {quiz['category']})")
                    
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Pre-flight check before running economics update
Analyzes current quiz data and shows what will be updated
"""
import asyncio
import json
from database import db
from collections import defaultdict

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get overview of quiz sets
            overview = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN data::jsonb ? 'economics' THEN 1 END) as with_economics,
                    MIN(created_at) as oldest,
                    MAX(created_at) as newest
                FROM content
                WHERE type = 'quiz_set'
            """)
            
            print("Quiz Set Database Overview")
            print("=" * 60)
            print(f"Total quiz sets: {overview['total']}")
            print(f"Already have economics: {overview['with_economics']}")
            print(f"Need economics update: {overview['total'] - overview['with_economics']}")
            print(f"Date range: {overview['oldest']} to {overview['newest']}")
            
            # Get category breakdown
            category_stats = await conn.fetch("""
                SELECT 
                    data->>'category' as category,
                    COUNT(*) as count,
                    COUNT(CASE WHEN data::jsonb ? 'economics' THEN 1 END) as with_economics
                FROM content
                WHERE type = 'quiz_set'
                GROUP BY data->>'category'
                ORDER BY count DESC
            """)
            
            print("\n" + "=" * 60)
            print("Quiz Sets by Category:")
            print("=" * 60)
            print(f"{'Category':<25} {'Total':>8} {'Has Econ':>10} {'Needs Update':>12}")
            print("-" * 60)
            
            for row in category_stats:
                category = row['category'] or 'Unknown'
                total = row['count']
                has_econ = row['with_economics']
                needs = total - has_econ
                print(f"{category:<25} {total:>8} {has_econ:>10} {needs:>12}")
            
            # Sample some quiz sets without economics
            samples = await conn.fetch("""
                SELECT id, data, created_at
                FROM content
                WHERE type = 'quiz_set'
                AND NOT (data::jsonb ? 'economics')
                ORDER BY created_at DESC
                LIMIT 3
            """)
            
            if samples:
                print("\n" + "=" * 60)
                print("Sample Quiz Sets That Will Be Updated:")
                print("=" * 60)
                
                for sample in samples:
                    data = json.loads(sample['data']) if isinstance(sample['data'], str) else sample['data']
                    print(f"\nID: {sample['id']}")
                    print(f"Created: {sample['created_at']}")
                    print(f"Title: {data.get('title', 'No title')}")
                    print(f"Category: {data.get('category', 'Unknown')}")
                    print(f"Questions: {len(data.get('questions', []))}")
                    
                    # Show what economics would be added
                    from add_economics_to_quiz_sets import QuizEconomicsUpdater
                    updater = QuizEconomicsUpdater()
                    economics = updater.calculate_economics(data)
                    
                    print(f"\nWill add economics:")
                    print(f"  Tier: {economics['tier']}")
                    print(f"  Cost: {economics['cost']}")
                    print(f"  Base Rewards: XP={economics['rewards']['xp']}, Coins={economics['rewards']['coins']}")
                    print(f"  Gem Rewards: {economics['rewards']['gems']}")
            
            # Check for any potential issues
            print("\n" + "=" * 60)
            print("Pre-flight Checks:")
            print("=" * 60)
            
            # Check for null categories
            null_categories = await conn.fetchval("""
                SELECT COUNT(*)
                FROM content
                WHERE type = 'quiz_set'
                AND (data->>'category' IS NULL OR data->>'category' = '')
            """)
            
            print(f"✓ Quiz sets with null/empty category: {null_categories}")
            
            # Check for malformed data
            try:
                malformed = await conn.fetch("""
                    SELECT id, data
                    FROM content
                    WHERE type = 'quiz_set'
                    AND NOT (data::jsonb ? 'economics')
                    LIMIT 100
                """)
                
                errors = 0
                for row in malformed:
                    try:
                        data = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
                        if not isinstance(data.get('questions'), list):
                            errors += 1
                    except:
                        errors += 1
                
                print(f"✓ Malformed quiz data found: {errors}")
                
            except Exception as e:
                print(f"✗ Error checking data: {e}")
            
            print("\n" + "=" * 60)
            print("Ready to Update?")
            print("=" * 60)
            print(f"This will update {overview['total'] - overview['with_economics']} quiz sets")
            print("The update will add economics data including:")
            print("  - Energy and coin costs")
            print("  - XP and coin rewards")
            print("  - Gem rewards based on category tier")
            print("  - Perfect score bonuses")
            print("  - Streak bonuses")
            print("  - Mode multipliers")
            print("\nTo proceed, run: python add_economics_to_quiz_sets.py")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
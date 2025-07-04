#!/usr/bin/env python3
"""Remove all individual content items from database, keeping only sets of 10"""
import asyncio
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # First, let's see what we're about to delete
            print("=== INDIVIDUAL ITEMS TO BE REMOVED ===")
            
            counts = await conn.fetch("""
                SELECT type, COUNT(*) as count
                FROM content 
                WHERE type IN ('quiz', 'quote', 'pun', 'joke', 'fact', 'trivia')
                AND is_active = true
                GROUP BY type
                ORDER BY type
            """)
            
            total = 0
            for row in counts:
                print(f"{row['type']:10} {row['count']:,}")
                total += row['count']
            
            print(f"{'TOTAL':10} {total:,}\n")
            
            if total == 0:
                print("No individual items to remove!")
                return
            
            # Confirm before deleting
            response = input(f"Are you sure you want to delete {total} individual items? (yes/no): ")
            if response.lower() != 'yes':
                print("Cancelled.")
                return
            
            # Soft delete by setting is_active = false
            print("\nSoft deleting individual items...")
            result = await conn.execute("""
                UPDATE content 
                SET is_active = false, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE type IN ('quiz', 'quote', 'pun', 'joke', 'fact', 'trivia')
                AND is_active = true
            """)
            
            rows_affected = int(result.split()[-1])
            print(f"✓ Marked {rows_affected} items as inactive")
            
            # Clear Redis cache
            if db.redis:
                print("\nClearing Redis cache...")
                await db.redis.flushdb()
                print("✓ Cache cleared")
            
            # Verify remaining active content
            print("\n=== REMAINING ACTIVE CONTENT ===")
            remaining = await conn.fetch("""
                SELECT 
                    CASE 
                        WHEN type LIKE '%_set' THEN 'Sets of 10'
                        ELSE 'Other'
                    END as category,
                    COUNT(*) as count
                FROM content 
                WHERE is_active = true
                GROUP BY category
                ORDER BY category
            """)
            
            for row in remaining:
                print(f"{row['category']:15} {row['count']:,}")
                
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""Check how many sets vs individual items are in the database"""
import asyncio
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Count individual items
            individual_counts = await conn.fetch("""
                SELECT type, COUNT(*) as count
                FROM content 
                WHERE type IN ('quiz', 'quote', 'pun', 'joke', 'fact', 'trivia')
                AND is_active = true
                GROUP BY type
                ORDER BY type
            """)
            
            # Count sets
            set_counts = await conn.fetch("""
                SELECT type, COUNT(*) as count
                FROM content 
                WHERE type IN ('quiz_set', 'quote_set', 'pun_set', 'joke_set', 'trivia_set')
                AND is_active = true
                GROUP BY type
                ORDER BY type
            """)
            
            # Count total items within sets
            set_details = await conn.fetch("""
                SELECT 
                    type,
                    COUNT(*) as set_count,
                    SUM(
                        CASE 
                            WHEN type = 'pun_set' THEN jsonb_array_length(data->'puns')
                            WHEN type = 'joke_set' THEN jsonb_array_length(data->'jokes')
                            WHEN type = 'quote_set' THEN jsonb_array_length(data->'quotes')
                            WHEN type = 'trivia_set' THEN jsonb_array_length(data->'trivia')
                            ELSE 0
                        END
                    ) as total_items
                FROM content 
                WHERE type IN ('pun_set', 'joke_set', 'quote_set', 'trivia_set')
                AND is_active = true
                GROUP BY type
                ORDER BY type
            """)
            
            print("=== INDIVIDUAL ITEMS ===")
            total_individuals = 0
            for row in individual_counts:
                print(f"{row['type']:15} {row['count']:,}")
                total_individuals += row['count']
            print(f"{'TOTAL':15} {total_individuals:,}\n")
            
            print("=== SETS OF 10 ===")
            total_sets = 0
            for row in set_counts:
                print(f"{row['type']:15} {row['count']:,}")
                total_sets += row['count']
            print(f"{'TOTAL SETS':15} {total_sets:,}\n")
            
            print("=== ITEMS WITHIN SETS ===")
            total_set_items = 0
            for row in set_details:
                items = row['total_items'] or 0
                print(f"{row['type']:15} {row['set_count']:,} sets × 10 = {items:,} items")
                total_set_items += items
            print(f"{'TOTAL ITEMS':15} {total_set_items:,}\n")
            
            print("=== SUMMARY ===")
            print(f"Individual items that would be shown alone: {total_individuals:,}")
            print(f"Items available in sets of 10: {total_set_items:,}")
            print(f"Percentage using sets: {total_set_items/(total_individuals+total_set_items)*100:.1f}%")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
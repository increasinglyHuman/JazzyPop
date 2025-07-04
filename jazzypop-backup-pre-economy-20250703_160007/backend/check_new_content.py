#!/usr/bin/env python3
"""Check for new content types"""
import asyncio
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Check all content types
            result = await conn.fetch("""
                SELECT type, COUNT(*) as count, MAX(created_at) as latest
                FROM content 
                WHERE type IN ('pun', 'quote', 'trivia', 'joke', 'quiz', 'quiz_set')
                GROUP BY type
                ORDER BY type
            """)
            
            print("Content counts by type:")
            for row in result:
                print(f"  - {row['type']}: {row['count']} (latest: {row['latest']})")
                
            # Check if there are any cards
            card_count = await conn.fetchval("SELECT COUNT(*) FROM cards")
            print(f"\nTotal cards: {card_count}")
            
            # Check recent cards
            recent_cards = await conn.fetch("""
                SELECT type, priority, created_at, data->>'title' as title
                FROM cards
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            if recent_cards:
                print("\nRecent cards:")
                for card in recent_cards:
                    print(f"  - {card['type']} ({card['priority']}): {card['title']} - {card['created_at']}")
                    
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
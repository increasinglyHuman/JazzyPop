#!/usr/bin/env python3
"""Check cards table"""
import asyncio
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Check if cards table exists
            exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'cards'
                )
            """)
            
            if exists:
                count = await conn.fetchval("SELECT COUNT(*) FROM cards")
                print(f"Cards table exists with {count} cards")
                
                # Get recent cards
                recent = await conn.fetch("""
                    SELECT type, priority, created_at 
                    FROM cards 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                
                if recent:
                    print("\nRecent cards:")
                    for card in recent:
                        print(f"  - {card['type']} (priority {card['priority']}) - {card['created_at']}")
            else:
                print("Cards table does not exist!")
                
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""Fix JSONB data that was stored as strings"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Fix puns
            print("Fixing puns...")
            await conn.execute("""
                UPDATE content 
                SET data = data::jsonb,
                    metadata = metadata::jsonb
                WHERE type IN ('pun', 'quote', 'trivia', 'joke')
                AND pg_typeof(data) = 'text'::regtype
            """)
            
            count = await conn.fetchval("""
                SELECT COUNT(*) FROM content 
                WHERE type IN ('pun', 'quote', 'trivia', 'joke')
            """)
            
            print(f"Fixed {count} content items")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
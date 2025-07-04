#!/usr/bin/env python3
"""Show full content of an old quiz_set"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get the first quiz_set
            sample = await conn.fetchrow("""
                SELECT data
                FROM content 
                WHERE type = 'quiz_set' 
                ORDER BY created_at ASC
                LIMIT 1
            """)
            
            if sample:
                data = json.loads(sample['data'])
                print(json.dumps(data, indent=2))
                    
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
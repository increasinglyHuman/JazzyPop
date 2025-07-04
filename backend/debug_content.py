#!/usr/bin/env python3
"""Debug content structure"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get a pun
            pun = await conn.fetchrow("""
                SELECT id, type, data, metadata, tags, is_active
                FROM content 
                WHERE type = 'pun' 
                AND is_active = true
                LIMIT 1
            """)
            
            if pun:
                print("=== PUN CONTENT ===")
                print(f"ID: {pun['id']}")
                print(f"Type: {pun['type']}")
                print(f"Active: {pun['is_active']}")
                print(f"Tags: {pun['tags']}")
                print(f"Data type: {type(pun['data'])}")
                print(f"Data: {json.dumps(pun['data'], indent=2)}")
                print(f"Metadata: {json.dumps(pun['metadata'], indent=2)}")
            else:
                print("No puns found")
                
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
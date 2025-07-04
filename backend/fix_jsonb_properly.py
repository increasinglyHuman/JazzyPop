#!/usr/bin/env python3
"""Fix JSONB data properly"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get all content that needs fixing
            rows = await conn.fetch("""
                SELECT id, data, metadata
                FROM content 
                WHERE type IN ('pun', 'quote', 'trivia', 'joke')
            """)
            
            fixed = 0
            for row in rows:
                try:
                    # Check if data is a string
                    if isinstance(row['data'], str):
                        data_dict = json.loads(row['data'])
                        metadata_dict = json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata']
                        
                        # Update with proper JSONB
                        await conn.execute("""
                            UPDATE content 
                            SET data = $2::jsonb,
                                metadata = $3::jsonb
                            WHERE id = $1
                        """, row['id'], json.dumps(data_dict), json.dumps(metadata_dict))
                        
                        fixed += 1
                except Exception as e:
                    print(f"Error fixing {row['id']}: {e}")
            
            print(f"Fixed {fixed} content items")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
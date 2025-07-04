#!/usr/bin/env python3
"""Examine old quiz_set structure"""
import asyncio
import json
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Get one of the first quiz_sets
            samples = await conn.fetch("""
                SELECT data, created_at, id
                FROM content 
                WHERE type = 'quiz_set' 
                ORDER BY created_at ASC
                LIMIT 3
            """)
            
            for i, sample in enumerate(samples):
                print(f"\n{'='*60}")
                print(f"Quiz Set #{i+1} - Created: {sample['created_at']}")
                print(f"ID: {sample['id']}")
                print(f"{'='*60}")
                
                data = json.loads(sample['data'])
                
                # Show structure
                print(f"\nTop-level keys: {list(data.keys())}")
                
                # Show details based on structure
                if isinstance(data, dict):
                    for key, value in data.items():
                        if key == 'questions' and isinstance(value, list):
                            print(f"\n{key}: Array of {len(value)} items")
                            if value:
                                print(f"  First question keys: {list(value[0].keys())}")
                                print(f"  First question: {value[0].get('question', 'N/A')[:100]}...")
                        elif key == 'trivia' and isinstance(value, list):
                            print(f"\n{key}: Array of {len(value)} items")
                            if value:
                                print(f"  First item: {str(value[0])[:100]}...")
                        elif isinstance(value, str):
                            print(f"\n{key}: {value[:100]}...")
                        elif isinstance(value, list):
                            print(f"\n{key}: Array of {len(value)} items")
                        else:
                            print(f"\n{key}: {value}")
                            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
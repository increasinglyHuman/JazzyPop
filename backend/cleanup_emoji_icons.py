#!/usr/bin/env python3
"""Remove emoji icons from database content"""
import asyncio
import json
import re
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Find all content with emoji icons in data field
            print("Searching for content with emoji icons...")
            
            # Common emoji pattern
            emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF]|[\U00002600-\U000027FF]|[\U0001F000-\U0001F6FF]')
            
            # Get all active content
            rows = await conn.fetch("""
                SELECT id, type, data 
                FROM content 
                WHERE is_active = true
            """)
            
            updated_count = 0
            
            for row in rows:
                data = row['data']
                if isinstance(data, str):
                    data = json.loads(data)
                
                # Check if 'icon' field exists and contains emoji
                if 'icon' in data and isinstance(data['icon'], str):
                    if emoji_pattern.search(data['icon']):
                        print(f"Found emoji icon in {row['type']} {row['id']}: {data['icon']}")
                        
                        # Remove the icon field
                        del data['icon']
                        
                        # Update the database
                        await conn.execute("""
                            UPDATE content 
                            SET data = $2, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        """, row['id'], json.dumps(data))
                        
                        updated_count += 1
                
                # Also check in nested structures (like quiz questions)
                if 'questions' in data and isinstance(data['questions'], list):
                    modified = False
                    for question in data['questions']:
                        if 'icon' in question and isinstance(question['icon'], str):
                            if emoji_pattern.search(question['icon']):
                                print(f"Found emoji in question: {question['icon']}")
                                del question['icon']
                                modified = True
                    
                    if modified:
                        await conn.execute("""
                            UPDATE content 
                            SET data = $2, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        """, row['id'], json.dumps(data))
                        updated_count += 1
                
                # Check promotional cards
                if row['type'] == 'quiz_tease' and 'icon' in data:
                    if emoji_pattern.search(str(data['icon'])):
                        print(f"Found emoji in card: {data['icon']}")
                        data['icon'] = ''  # Empty string instead of emoji
                        
                        await conn.execute("""
                            UPDATE content 
                            SET data = $2, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        """, row['id'], json.dumps(data))
                        updated_count += 1
            
            # Also clean up the cards table
            card_rows = await conn.fetch("""
                SELECT id, data 
                FROM cards 
                WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
            """)
            
            for row in card_rows:
                data = row['data']
                if isinstance(data, str):
                    data = json.loads(data)
                
                if 'icon' in data and isinstance(data['icon'], str):
                    if emoji_pattern.search(data['icon']):
                        print(f"Found emoji in card {row['id']}: {data['icon']}")
                        data['icon'] = ''
                        
                        await conn.execute("""
                            UPDATE cards 
                            SET data = $2
                            WHERE id = $1
                        """, row['id'], json.dumps(data))
                        updated_count += 1
            
            print(f"\n✅ Cleaned {updated_count} items of emoji icons")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
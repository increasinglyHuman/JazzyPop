#!/usr/bin/env python3
"""Remove ALL emojis from database content - including from titles and text"""
import asyncio
import json
import re
from database import db

def remove_emojis(text):
    """Remove all emojis from a string"""
    if not isinstance(text, str):
        return text
    
    # Comprehensive emoji pattern
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F700-\U0001F77F"  # alchemical symbols
        u"\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
        u"\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
        u"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        u"\U0001FA00-\U0001FA6F"  # Chess Symbols
        u"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
        u"\U00002600-\U000027BF"  # Miscellaneous symbols
        u"\U00002700-\U000027BF"  # Dingbats
        u"\U00002B50-\U00002B55"  # Stars
        u"\U0001F004"             # Mahjong tile
        u"\U0001F0CF"             # Playing card
        u"\U0001F170-\U0001F171"  # A/B buttons
        u"\U0001F17E-\U0001F17F"  # O/P buttons
        u"\U0001F18E"             # AB button
        u"\U0001F191-\U0001F19A"  # Squared letters
        u"\U0001F1E6-\U0001F1FF"  # Regional indicators
        "]+", flags=re.UNICODE)
    
    # Clean the text
    cleaned = emoji_pattern.sub('', text)
    # Remove extra spaces
    cleaned = ' '.join(cleaned.split())
    return cleaned.strip()

def clean_json_object(obj):
    """Recursively clean emojis from JSON object"""
    if isinstance(obj, dict):
        cleaned = {}
        for key, value in obj.items():
            if isinstance(value, str):
                cleaned[key] = remove_emojis(value)
            elif isinstance(value, (dict, list)):
                cleaned[key] = clean_json_object(value)
            else:
                cleaned[key] = value
        return cleaned
    elif isinstance(obj, list):
        return [clean_json_object(item) for item in obj]
    elif isinstance(obj, str):
        return remove_emojis(obj)
    else:
        return obj

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            print("Cleaning emojis from all content...")
            
            # Get all active content
            rows = await conn.fetch("""
                SELECT id, type, data 
                FROM content 
                WHERE is_active = true
            """)
            
            content_updated = 0
            
            for row in rows:
                data = row['data']
                if isinstance(data, str):
                    data = json.loads(data)
                
                # Clean the entire data object
                original = json.dumps(data)
                cleaned_data = clean_json_object(data)
                cleaned = json.dumps(cleaned_data)
                
                # Only update if something changed
                if original != cleaned:
                    print(f"\nCleaning {row['type']} {row['id']}")
                    
                    # Show what's being cleaned
                    if 'title' in data and data['title'] != cleaned_data.get('title'):
                        print(f"  Title: '{data['title']}' → '{cleaned_data.get('title')}'")
                    if 'description' in data and data['description'] != cleaned_data.get('description'):
                        print(f"  Desc: '{data['description'][:50]}...' → '{cleaned_data.get('description')[:50]}...'")
                    
                    await conn.execute("""
                        UPDATE content 
                        SET data = $2, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    """, row['id'], json.dumps(cleaned_data))
                    
                    content_updated += 1
            
            # Also clean the cards table
            print("\nCleaning promotional cards...")
            card_rows = await conn.fetch("""
                SELECT id, data 
                FROM cards 
                WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
            """)
            
            cards_updated = 0
            
            for row in card_rows:
                data = row['data']
                if isinstance(data, str):
                    data = json.loads(data)
                
                original = json.dumps(data)
                cleaned_data = clean_json_object(data)
                cleaned = json.dumps(cleaned_data)
                
                if original != cleaned:
                    print(f"\nCleaning card {row['id']}")
                    if 'title' in data:
                        print(f"  Title: '{data['title']}' → '{cleaned_data['title']}'")
                    
                    await conn.execute("""
                        UPDATE cards 
                        SET data = $2
                        WHERE id = $1
                    """, row['id'], json.dumps(cleaned_data))
                    
                    cards_updated += 1
            
            print(f"\n✅ Cleaned {content_updated} content items")
            print(f"✅ Cleaned {cards_updated} promotional cards")
            print(f"✅ Total: {content_updated + cards_updated} items cleaned of emojis")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Delete obsolete individual quiz items from database
These were created before the switch to quiz sets
"""
import asyncio
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def cleanup_individual_quizzes():
    """Delete individual quiz items (not quiz_sets)"""
    
    # Connect to database
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    try:
        # First, check what we're about to delete
        count = await conn.fetchval("""
            SELECT COUNT(*) 
            FROM content 
            WHERE type = 'quiz' 
            AND is_active = true
        """)
        
        print(f"Found {count} individual quiz items to delete")
        
        if count == 0:
            print("No individual quiz items found. Nothing to do.")
            return
        
        # Show a sample
        sample = await conn.fetch("""
            SELECT id, data->>'question' as question, created_at
            FROM content 
            WHERE type = 'quiz' 
            AND is_active = true
            LIMIT 3
        """)
        
        print("\nSample items to be deleted:")
        for item in sample:
            print(f"  - {item['question'][:60]}...")
            print(f"    Created: {item['created_at']}")
        
        # Delete them (soft delete by setting is_active = false)
        result = await conn.execute("""
            UPDATE content 
            SET is_active = false,
                updated_at = NOW()
            WHERE type = 'quiz'
            AND is_active = true
        """)
        
        # Extract number from result
        deleted_count = int(result.split()[-1])
        
        print(f"\n✅ Successfully soft-deleted {deleted_count} individual quiz items")
        print("Note: Items are marked inactive, not permanently deleted")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(cleanup_individual_quizzes())
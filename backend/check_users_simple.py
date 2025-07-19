#!/usr/bin/env python3
import asyncio
from database import db

async def check_users():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Total users
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"Total registered users: {user_count}")
        
        # Recent users
        recent_users = await conn.fetch("""
            SELECT id, email, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        """)
        
        print("\nRecent registrations:")
        for user in recent_users:
            print(f"  {user['created_at']}: {user['email']}")
        
        # Check bitmap activity from real users
        print("\n" + "="*50)
        print("Bitmap activity (last hour):")
        
        activity = await conn.fetch("""
            SELECT user_id, content_type, last_updated,
                   rb_cardinality(seen_bitmap) as seen
            FROM user_content_bitmaps
            WHERE last_updated > NOW() - INTERVAL '1 hour'
            ORDER BY last_updated DESC
        """)
        
        for act in activity:
            # Check if this is a real user
            is_real = await conn.fetchval("""
                SELECT email FROM users WHERE id = $1
            """, act['user_id'])
            
            user_type = f"Real user: {is_real}" if is_real else "Test UUID"
            print(f"  {act['last_updated']}: {user_type} - {act['content_type']} ({act['seen']} seen)")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_users())
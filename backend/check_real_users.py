#!/usr/bin/env python3
import asyncio
from database import db

async def check_real_users():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Total users
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"Total registered users: {user_count}")
        
        # Recent users
        recent_users = await conn.fetch("""
            SELECT id, email, created_at, last_login
            FROM users
            ORDER BY created_at DESC
            LIMIT 10
        """)
        
        print("\nAll users:")
        for user in recent_users:
            print(f"  {user['created_at'].date()}: {user['email']}")
            print(f"    ID: {user['id']}")
            print(f"    Last login: {user['last_login'] or 'Never'}")
        
        # Check if any of these users have bitmap data
        print("\n" + "="*50)
        print("Checking which registered users have used deduplication:")
        
        for user in recent_users:
            bitmap_data = await conn.fetchval("""
                SELECT COUNT(*) FROM user_content_bitmaps
                WHERE user_id = $1
            """, user['id'])
            
            if bitmap_data > 0:
                print(f"  ✅ {user['email']} - HAS deduplication data")
            else:
                print(f"  ❌ {user['email']} - NO deduplication data")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_real_users())
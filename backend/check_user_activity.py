#!/usr/bin/env python3
import asyncio
from database import db
from datetime import datetime, timedelta

async def check_user_activity():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Get all unique users from bitmap table
        bitmap_users = await conn.fetch("""
            SELECT DISTINCT user_id, 
                   MIN(last_updated) as first_seen,
                   MAX(last_updated) as last_seen
            FROM user_content_bitmaps
            GROUP BY user_id
        """)
        
        print(f"📊 Unique users in bitmap table: {len(bitmap_users)}")
        print("=" * 60)
        
        for user in bitmap_users:
            print(f"\n🔍 User: {user['user_id']}")
            print(f"   First seen: {user['first_seen']}")
            print(f"   Last seen: {user['last_seen']}")
            
            # Get their activity
            activity = await conn.fetch("""
                SELECT content_type, 
                       rb_cardinality(seen_bitmap) as seen_count,
                       rb_cardinality(completed_bitmap) as completed_count
                FROM user_content_bitmaps
                WHERE user_id = $1
            """, user['user_id'])
            
            print("   Activity:")
            for act in activity:
                print(f"     - {act['content_type']}: {act['seen_count']} seen, {act['completed_count'] or 0} completed")
        
        # Check recent API activity
        print("\n" + "=" * 60)
        print("📈 Recent activity (last 24 hours):")
        
        # Check sessions table if it exists
        try:
            recent_sessions = await conn.fetch("""
                SELECT user_id, created_at, expires_at
                FROM sessions
                WHERE created_at > NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 10
            """)
            
            print(f"\nRecent sessions: {len(recent_sessions)}")
            for session in recent_sessions:
                user_info = "Anonymous" if not session['user_id'] else str(session['user_id'])[:8] + "..."
                print(f"  - {session['created_at']}: {user_info}")
        except:
            print("  (Sessions table not accessible)")
        
        # Check user registrations
        try:
            recent_users = await conn.fetch("""
                SELECT id, email, created_at
                FROM users
                WHERE created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 10
            """)
            
            print(f"\nNew users (last 7 days): {len(recent_users)}")
            for user in recent_users:
                print(f"  - {user['created_at']}: {user['email']}")
        except:
            print("  (Users table not accessible)")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_user_activity())
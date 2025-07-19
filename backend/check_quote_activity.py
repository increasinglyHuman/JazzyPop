#!/usr/bin/env python3
import asyncio
from database import db
from datetime import datetime

async def check_quotes():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Check all recent activity
        print("🎯 All activity in last 10 minutes:")
        all_recent = await conn.fetch("""
            SELECT b.content_type, b.last_updated, u.email,
                   rb_cardinality(b.seen_bitmap) as seen,
                   rb_cardinality(b.completed_bitmap) as completed
            FROM user_content_bitmaps b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.last_updated > NOW() - INTERVAL '10 minutes'
            ORDER BY b.last_updated DESC
        """)
        
        for act in all_recent:
            email = act['email'] or 'Test/Anonymous'
            print(f"\n{act['last_updated']}:")
            print(f"  User: {email}")
            print(f"  Type: {act['content_type']}")
            print(f"  Seen: {act['seen']}, Completed: {act['completed'] or 0}")
        
        # Check recent API logs
        print("\n" + "="*50)
        print("📋 Content ID mappings:")
        mappings = await conn.fetch("""
            SELECT content_type, COUNT(*) as count
            FROM content_id_mapping
            GROUP BY content_type
        """)
        for m in mappings:
            print(f"  {m['content_type']}: {m['count']} items")
        
        # Check virtuallyHuman specifically
        print("\n" + "="*50)
        print("👤 Your activity (virtuallyHuman@gmail.com):")
        your_activity = await conn.fetch("""
            SELECT b.content_type, 
                   rb_cardinality(b.seen_bitmap) as seen,
                   rb_cardinality(b.completed_bitmap) as completed,
                   b.last_updated
            FROM user_content_bitmaps b
            JOIN users u ON b.user_id = u.id
            WHERE u.email = 'virtuallyHuman@gmail.com'
        """)
        
        if your_activity:
            for act in your_activity:
                print(f"  {act['content_type']}: {act['seen']} seen, {act['completed'] or 0} completed (last: {act['last_updated']})")
        else:
            print("  No activity found yet")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_quotes())
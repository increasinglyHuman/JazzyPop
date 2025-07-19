#!/usr/bin/env python3
import asyncio
from database import db
from datetime import datetime

async def monitor_activity():
    await db.connect()
    async with db.pool.acquire() as conn:
        print("🎮 Live Activity Monitor - Last 5 minutes")
        print("=" * 60)
        
        # Get recent activity
        activity = await conn.fetch("""
            SELECT 
                b.user_id, 
                u.email, 
                b.content_type, 
                b.last_updated,
                rb_cardinality(b.seen_bitmap) as seen,
                rb_cardinality(b.completed_bitmap) as completed
            FROM user_content_bitmaps b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.last_updated > NOW() - INTERVAL '5 minutes'
            ORDER BY b.last_updated DESC
        """)
        
        print(f"\nFound {len(activity)} active sessions:\n")
        
        for act in activity:
            email = act['email'] or f"Test-{str(act['user_id'])[:8]}"
            time_ago = datetime.now(act['last_updated'].tzinfo) - act['last_updated']
            mins_ago = int(time_ago.total_seconds() / 60)
            
            print(f"👤 {email}")
            print(f"   📦 Content: {act['content_type']}")
            print(f"   👁️  Seen: {act['seen']} items")
            print(f"   ✅ Completed: {act['completed'] or 0} items")
            print(f"   🕐 {mins_ago} minutes ago")
            print()
        
        # Check for quiz activity specifically
        print("=" * 60)
        print("🎯 Quiz Activity:")
        
        quiz_activity = await conn.fetch("""
            SELECT COUNT(*) as count, MAX(last_updated) as latest
            FROM user_content_bitmaps
            WHERE content_type = 'quiz'
            AND last_updated > NOW() - INTERVAL '1 hour'
        """)
        
        if quiz_activity[0]['count'] > 0:
            print(f"  Quiz sessions in last hour: {quiz_activity[0]['count']}")
            print(f"  Most recent: {quiz_activity[0]['latest']}")
        else:
            print("  No quiz activity yet")
            
        # Show content mapping stats
        print("\n" + "=" * 60)
        print("📊 Content in system:")
        stats = await conn.fetch("""
            SELECT content_type, COUNT(*) as mapped
            FROM content_id_mapping
            GROUP BY content_type
        """)
        
        for stat in stats:
            print(f"  {stat['content_type']}: {stat['mapped']} items mapped")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(monitor_activity())
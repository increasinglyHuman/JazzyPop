#!/usr/bin/env python3
"""
Simple content count checker
"""
import asyncio
from database import db

async def main():
    await db.connect()
    
    try:
        async with db.pool.acquire() as conn:
            # Total content count
            total = await conn.fetchval("SELECT COUNT(*) FROM content WHERE is_active = true")
            print(f"\n📊 Total active content: {total}")
            
            # Count by type
            print("\n📋 Content by type:")
            rows = await conn.fetch("""
                SELECT type, COUNT(*) as count 
                FROM content 
                WHERE is_active = true
                GROUP BY type
                ORDER BY count DESC
            """)
            
            for row in rows:
                print(f"  - {row['type']}: {row['count']}")
            
            # Recent content
            print("\n🕐 Recent additions (last 5):")
            recent = await conn.fetch("""
                SELECT type, created_at, data->>'content' as preview
                FROM content
                WHERE is_active = true
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            for row in recent:
                preview = row['preview']
                if preview and len(preview) > 50:
                    preview = preview[:50] + "..."
                print(f"  - {row['type']} ({row['created_at'].strftime('%Y-%m-%d %H:%M')}): {preview}")
                
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
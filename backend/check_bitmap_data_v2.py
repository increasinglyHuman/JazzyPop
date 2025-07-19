#!/usr/bin/env python3
import asyncio
from database import db

async def check_bitmap_tables():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Check content_id_mapping
        mapping_count = await conn.fetchval("SELECT COUNT(*) FROM content_id_mapping")
        print(f"content_id_mapping: {mapping_count} rows")
        
        # Check user_content_bitmaps
        bitmap_count = await conn.fetchval("SELECT COUNT(*) FROM user_content_bitmaps")
        print(f"user_content_bitmaps: {bitmap_count} rows")
        
        # Check if any bitmaps have data
        if bitmap_count > 0:
            sample = await conn.fetch("""
                SELECT user_id, content_type, 
                       rb_cardinality(seen_bitmap) as seen_count,
                       rb_cardinality(completed_bitmap) as completed_count
                FROM user_content_bitmaps
                LIMIT 5
            """)
            print("\nSample bitmap data:")
            for row in sample:
                print(f"  User: {str(row['user_id'])[:8]}..., Type: {row['content_type']}, Seen: {row['seen_count']}, Completed: {row['completed_count']}")
        
        # Show content mapping sample
        if mapping_count > 0:
            mapping_sample = await conn.fetch("""
                SELECT content_type, COUNT(*) as count
                FROM content_id_mapping
                GROUP BY content_type
            """)
            print("\nContent mapping by type:")
            for row in mapping_sample:
                print(f"  {row['content_type']}: {row['count']} items")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_bitmap_tables())
#!/usr/bin/env python3
"""Simple test of roaring bitmap deduplication"""

import asyncio
from database import db
from roaring_bitmap_dedup import RoaringBitmapDeduplication

async def test():
    await db.connect()
    rb = RoaringBitmapDeduplication()
    
    async with db.pool.acquire() as conn:
        # Test with quotes
        test_user = "550e8400-e29b-41d4-a716-446655440000"
        
        print("=== Testing Roaring Bitmap Deduplication ===\n")
        
        # Get initial unseen quotes
        print("1. Getting 3 quotes (should all be unseen)...")
        quotes = await rb.get_unseen_content(conn, "quote", test_user, count=3)
        print(f"   Got {len(quotes)} quotes")
        
        if quotes:
            # Mark first quote as seen
            first_quote_id = quotes[0]['id']
            print(f"\n2. Marking quote {first_quote_id[:8]}... as seen")
            await rb.mark_content_seen(conn, test_user, "quote", first_quote_id)
            
            # Get quotes again
            print("\n3. Getting 5 new quotes...")
            new_quotes = await rb.get_unseen_content(conn, "quote", test_user, count=5)
            new_ids = [q['id'] for q in new_quotes]
            
            if first_quote_id not in new_ids:
                print("   ✅ SUCCESS! Previously seen quote was excluded!")
            else:
                print("   ❌ ERROR: Seen quote was returned again")
            
            # Get stats
            print("\n4. Checking user statistics...")
            stats = await rb.get_user_stats(conn, test_user, "quote")
            print(f"   Seen: {stats['seen_count']}")
            print(f"   Completed: {stats['completed_count']}")
            print(f"   Total available: {stats['total_count']}")
            print(f"   Completion: {stats['completion_percentage']}%")
            
            # Test anonymous user
            print("\n5. Testing anonymous user (should work)...")
            anon_quotes = await rb.get_unseen_content(conn, "quote", None, count=3)
            print(f"   Got {len(anon_quotes)} quotes for anonymous user")
        
        # Test with different content types
        print("\n6. Testing other content types...")
        for content_type in ["joke", "pun", "factoid"]:
            content = await rb.get_unseen_content(conn, content_type, test_user, count=1)
            print(f"   {content_type}: {'✅ Found' if content else '❌ None found'}")
    
    await db.disconnect()
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    asyncio.run(test())
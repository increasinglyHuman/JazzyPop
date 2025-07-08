#!/usr/bin/env python3
"""
Verify test user exists and is properly configured
"""

import asyncio
from database import db
from uuid import UUID

TEST_USER_ID = UUID("550e8400-e29b-41d4-a716-446655440000")

async def verify_test_user():
    """Check if test user exists in all required tables"""
    try:
        await db.connect()
        async with db.pool.acquire() as conn:
            # Check users table
            user = await conn.fetchrow(
                "SELECT id, username, email, display_name FROM users WHERE id = $1",
                TEST_USER_ID
            )
            
            if user:
                print(f"✅ User exists in users table:")
                print(f"   Username: {user['username']}")
                print(f"   Email: {user['email']}")
                print(f"   Display Name: {user['display_name']}")
            else:
                print("❌ User NOT found in users table")
                return
                
            # Check user_progress
            progress = await conn.fetchrow(
                "SELECT user_id, stats, achievements FROM user_progress WHERE user_id = $1",
                TEST_USER_ID
            )
            
            if progress:
                print(f"\n✅ User has progress data:")
                stats = progress['stats'] or {}
                economy = stats.get('economy', {})
                print(f"   Level: {economy.get('level', 0)}")
                print(f"   Coins: {economy.get('coins', 0)}")
                print(f"   XP: {economy.get('xp', 0)}")
                
                # Check game systems
                quests = stats.get('quests', {})
                badges = stats.get('badges', [])
                assets = stats.get('assets', {})
                
                print(f"\n📊 Game Systems:")
                print(f"   Active Quests: {len(quests.get('active', []))}")
                print(f"   Badges: {len(badges)}")
                print(f"   Pets: {len(assets.get('pets', []))}")
                print(f"   Achievements: {len(progress['achievements'] or [])}")
            else:
                print("\n❌ No progress data found for user")
                
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    print("Verifying test user...")
    print(f"User ID: {TEST_USER_ID}")
    print("-" * 50)
    asyncio.run(verify_test_user())
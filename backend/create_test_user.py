#!/usr/bin/env python3
"""
Create a test user for development and testing
"""

import asyncio
import sys
from uuid import UUID
from database import db

TEST_USER_ID = UUID("550e8400-e29b-41d4-a716-446655440000")  # Example from OpenAPI docs

async def create_test_user():
    """Create a test user with some initial data"""
    try:
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Create user
            await conn.execute("""
                INSERT INTO users (id, username, email, display_name, avatar_id, is_anonymous)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE
                SET updated_at = NOW()
            """, TEST_USER_ID, "test_user", "test@jazzypop.com", "Test User", "avatar_01", False)
            
            # Initialize user_progress with game systems
            initial_stats = {
                "economy": {
                    "energy": 100,
                    "hearts": 5,
                    "coins": 1000,
                    "sapphires": 2,
                    "emeralds": 1,
                    "rubies": 0,
                    "amethysts": 0,
                    "diamonds": 0,
                    "xp": 500,
                    "level": 3,
                    "streak": 0
                },
                "quests": {
                    "active": [
                        {
                            "quest_id": "welcome_quest",
                            "type": "tutorial",
                            "name": "Welcome to JazzyPop",
                            "description": "Complete your first quiz",
                            "progress": 0,
                            "target": 1,
                            "rewards": {"coins": 100, "xp": 50}
                        }
                    ],
                    "completed": [],
                    "chains": {}
                },
                "badges": [
                    {
                        "id": "beta_tester",
                        "tier": "gold",
                        "earned_at": "2025-01-01T00:00:00Z"
                    }
                ],
                "assets": {
                    "pets": [
                        {
                            "id": "pet_starter",
                            "type": "robot_dog",
                            "name": "Byte",
                            "level": 1,
                            "experience": 0,
                            "equipped": True,
                            "stats": {
                                "happiness": 100,
                                "energy": 100
                            }
                        }
                    ],
                    "cosmetics": {
                        "avatar_frames": ["default", "neon_glow"],
                        "themes": ["default", "dark_mode"],
                        "equipped": {
                            "frame": "neon_glow",
                            "theme": "dark_mode"
                        }
                    },
                    "inventory": [
                        {
                            "item_id": "energy_potion",
                            "quantity": 3
                        }
                    ]
                }
            }
            
            # Delete existing user_progress if any
            await conn.execute("DELETE FROM user_progress WHERE user_id = $1", TEST_USER_ID)
            
            # Create user_progress
            await conn.execute("""
                INSERT INTO user_progress (user_id, stats, achievements)
                VALUES ($1, $2::jsonb, $3::jsonb)
            """, TEST_USER_ID, json.dumps(initial_stats), json.dumps([
                {
                    "id": "account_created",
                    "unlocked_at": "2025-01-01T00:00:00Z",
                    "metadata": {}
                }
            ]))
            
            print(f"✅ Test user created successfully!")
            print(f"   User ID: {TEST_USER_ID}")
            print(f"   Username: test_user")
            print(f"   Email: test@jazzypop.com")
            print(f"\n📊 Initial game state:")
            print(f"   - Level 3 with 500 XP")
            print(f"   - 1000 coins, 2 sapphires, 1 emerald")
            print(f"   - 1 active quest: Welcome to JazzyPop")
            print(f"   - 1 badge: Beta Tester (Gold)")
            print(f"   - 1 pet: Byte the Robot Dog")
            print(f"   - 1 achievement: Account Created")
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        sys.exit(1)
    finally:
        await db.disconnect()

if __name__ == "__main__":
    import json  # Import needed for JSON serialization
    asyncio.run(create_test_user())
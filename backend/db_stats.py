#!/usr/bin/env python3
"""
Database Statistics Utility
Retrieve counts and statistics from PostgreSQL database
Can be run directly or imported as a module
"""
import asyncio
import json
import os
from datetime import datetime, timedelta
from database import db
from dotenv import load_dotenv
import redis

load_dotenv()

class DatabaseStats:
    def __init__(self):
        self.redis_client = None
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
        except:
            print("Warning: Redis not available")
    
    async def get_content_stats(self):
        """Get statistics about content in the database"""
        async with db.pool.acquire() as conn:
            # Total content by type
            type_counts = await conn.fetch("""
                SELECT type, COUNT(*) as count 
                FROM content 
                WHERE is_active = true
                GROUP BY type
                ORDER BY count DESC
            """)
            
            # Content by category (from tags)
            category_counts = await conn.fetch("""
                SELECT unnest(tags) as category, COUNT(*) as count
                FROM content
                WHERE is_active = true
                GROUP BY category
                ORDER BY count DESC
                LIMIT 20
            """)
            
            # Recent content
            recent_content = await conn.fetch("""
                SELECT type, created_at, 
                       data->>'content' as preview,
                       tags
                FROM content
                WHERE is_active = true
                ORDER BY created_at DESC
                LIMIT 10
            """)
            
            # Content variations count
            variation_count = await conn.fetchval("""
                SELECT COUNT(DISTINCT mode) 
                FROM content_variations
            """)
            
            # Total active content
            total_active = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM content 
                WHERE is_active = true
            """)
            
            return {
                "total_active_content": total_active,
                "content_by_type": [dict(row) for row in type_counts],
                "content_by_category": [dict(row) for row in category_counts],
                "variation_modes": variation_count,
                "recent_additions": [{
                    "type": row["type"],
                    "created": row["created_at"].isoformat(),
                    "preview": (row["preview"][:50] + "...") if row["preview"] and len(row["preview"]) > 50 else row["preview"],
                    "tags": row["tags"]
                } for row in recent_content]
            }
    
    async def get_user_stats(self):
        """Get statistics about users and their progress"""
        async with db.pool.acquire() as conn:
            # Total users
            total_users = await conn.fetchval("""
                SELECT COUNT(*) FROM users
            """)
            
            # Active users (last 7 days)
            active_users = await conn.fetchval("""
                SELECT COUNT(DISTINCT user_id) 
                FROM user_progress
                WHERE last_updated > NOW() - INTERVAL '7 days'
            """)
            
            # Content views
            view_stats = await conn.fetch("""
                SELECT content_type, COUNT(*) as views,
                       COUNT(DISTINCT user_id) as unique_users
                FROM user_content_views
                GROUP BY content_type
            """)
            
            # Top performers
            top_users = await conn.fetch("""
                SELECT u.display_name, up.total_score, up.current_streak
                FROM users u
                JOIN user_progress up ON u.id = up.user_id
                ORDER BY up.total_score DESC
                LIMIT 10
            """)
            
            return {
                "total_users": total_users,
                "active_users_7d": active_users,
                "content_view_stats": [dict(row) for row in view_stats],
                "top_performers": [dict(row) for row in top_users]
            }
    
    async def get_quiz_stats(self):
        """Get statistics about quiz performance"""
        async with db.pool.acquire() as conn:
            # Total quiz attempts
            total_attempts = await conn.fetchval("""
                SELECT COUNT(*) FROM quiz_attempts
            """)
            
            # Success rate by mode
            mode_stats = await conn.fetch("""
                SELECT mode, 
                       COUNT(*) as attempts,
                       AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100 as success_rate,
                       AVG(time_taken) as avg_time
                FROM quiz_attempts
                GROUP BY mode
            """)
            
            # Popular categories
            popular_categories = await conn.fetch("""
                SELECT c.tags[1] as category,
                       COUNT(qa.*) as attempts
                FROM quiz_attempts qa
                JOIN content c ON qa.quiz_id = c.id
                WHERE array_length(c.tags, 1) > 0
                GROUP BY category
                ORDER BY attempts DESC
                LIMIT 10
            """)
            
            return {
                "total_attempts": total_attempts,
                "mode_statistics": [{
                    "mode": row["mode"],
                    "attempts": row["attempts"],
                    "success_rate": float(row["success_rate"]) if row["success_rate"] else 0,
                    "avg_time_seconds": float(row["avg_time"]) if row["avg_time"] else 0
                } for row in mode_stats],
                "popular_categories": [dict(row) for row in popular_categories]
            }
    
    async def get_cache_stats(self):
        """Get Redis cache statistics"""
        if not self.redis_client:
            return {"error": "Redis not available"}
        
        try:
            # Get Redis info
            info = self.redis_client.info()
            
            # Count keys by pattern
            patterns = {
                "quiz_keys": "quiz:*",
                "content_keys": "content:*",
                "flashcard_keys": "flashcard:*",
                "card_keys": "card:*",
                "user_keys": "user:*"
            }
            
            key_counts = {}
            for name, pattern in patterns.items():
                keys = self.redis_client.keys(pattern)
                key_counts[name] = len(keys)
            
            # Memory usage
            memory_stats = {
                "used_memory_human": info.get("used_memory_human", "N/A"),
                "used_memory_peak_human": info.get("used_memory_peak_human", "N/A"),
                "total_keys": self.redis_client.dbsize()
            }
            
            return {
                "memory": memory_stats,
                "key_counts": key_counts,
                "connected_clients": info.get("connected_clients", 0),
                "uptime_days": info.get("uptime_in_days", 0)
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def get_all_stats(self):
        """Get all statistics"""
        content_stats = await self.get_content_stats()
        user_stats = await self.get_user_stats()
        quiz_stats = await self.get_quiz_stats()
        cache_stats = await self.get_cache_stats()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "content": content_stats,
            "users": user_stats,
            "quizzes": quiz_stats,
            "cache": cache_stats
        }
    
    async def save_stats_to_redis(self, stats):
        """Save stats snapshot to Redis with expiration"""
        if self.redis_client:
            key = f"stats:snapshot:{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            self.redis_client.setex(
                key,
                86400,  # Expire after 24 hours
                json.dumps(stats)
            )
            # Also save as latest
            self.redis_client.setex(
                "stats:latest",
                3600,  # Expire after 1 hour
                json.dumps(stats)
            )

async def main():
    """Run stats collection"""
    try:
        await db.connect()
        
        stats = DatabaseStats()
        all_stats = await stats.get_all_stats()
        
        # Print summary
        print("\n=== JazzyPop Database Statistics ===\n")
        
        print("📊 Content Summary:")
        print(f"  Total Active Content: {all_stats['content']['total_active_content']}")
        for item in all_stats['content']['content_by_type']:
            print(f"  - {item['type']}: {item['count']}")
        
        print("\n👥 User Summary:")
        print(f"  Total Users: {all_stats['users']['total_users']}")
        print(f"  Active (7d): {all_stats['users']['active_users_7d']}")
        
        print("\n🎯 Quiz Summary:")
        print(f"  Total Attempts: {all_stats['quizzes']['total_attempts']}")
        
        print("\n💾 Cache Summary:")
        if "error" not in all_stats['cache']:
            print(f"  Total Keys: {all_stats['cache']['memory']['total_keys']}")
            print(f"  Memory Used: {all_stats['cache']['memory']['used_memory_human']}")
        else:
            print(f"  Cache Error: {all_stats['cache']['error']}")
        
        # Save full stats to file
        output_file = f"db_stats_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(all_stats, f, indent=2)
        print(f"\n📄 Full stats saved to: {output_file}")
        
        # Save to Redis if available
        await stats.save_stats_to_redis(all_stats)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
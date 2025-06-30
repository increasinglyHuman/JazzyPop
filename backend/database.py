"""
Database connection and utilities
"""
import os
import asyncpg
import redis.asyncio as redis
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
from uuid import UUID
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.redis: Optional[redis.Redis] = None
        self.database_url = os.getenv('DATABASE_URL')
        self.redis_url = os.getenv('REDIS_URL')
    
    async def connect(self):
        """Initialize database connections"""
        # PostgreSQL connection pool
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        
        # Redis connection
        self.redis = await redis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
    
    async def disconnect(self):
        """Close database connections"""
        if self.pool:
            await self.pool.close()
        if self.redis:
            await self.redis.close()
    
    @asynccontextmanager
    async def transaction(self):
        """Database transaction context manager"""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                yield conn
    
    async def get_current_quiz(self, mode: str = "poqpoq") -> Optional[Dict[str, Any]]:
        """Get the current active quiz with mode variations"""
        async with self.pool.acquire() as conn:
            # First check Redis cache
            cache_key = f"quiz:current:{mode}"
            cached = await self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Query database - prioritize quiz sets with multiple questions
            query = """
                SELECT 
                    c.id, c.type, c.data, c.metadata, c.created_at,
                    cv.variation_data
                FROM content c
                LEFT JOIN content_variations cv ON cv.content_id = c.id AND cv.mode = $1
                WHERE c.type = 'quiz' 
                AND c.is_active = true 
                AND (c.expires_at IS NULL OR c.expires_at > NOW())
                ORDER BY 
                    CASE WHEN c.data->'questions' IS NOT NULL THEN 0 ELSE 1 END,
                    RANDOM()
                LIMIT 1
            """
            
            row = await conn.fetchrow(query, mode)
            if not row:
                return None
            
            result = {
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat(),
                "mode_variation": json.loads(row["variation_data"]) if row["variation_data"] and isinstance(row["variation_data"], str) else (row["variation_data"] or {})
            }
            
            # Cache for 5 minutes
            await self.redis.setex(cache_key, 300, json.dumps(result))
            
            return result
    
    async def submit_answer(self, user_id: Optional[UUID], quiz_id: UUID, answer_id: str, 
                          time_taken: float, mode: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Submit a quiz answer and update scores"""
        async with self.transaction() as conn:
            # Get quiz data to check answer
            quiz_query = "SELECT data FROM content WHERE id = $1 AND type = 'quiz'"
            quiz_data = await conn.fetchval(quiz_query, quiz_id)
            
            if not quiz_data:
                raise ValueError("Quiz not found")
            
            # Check if answer is correct
            correct = False
            for answer in quiz_data.get("answers", []):
                if answer["id"] == answer_id and answer.get("correct", False):
                    correct = True
                    break
            
            # Calculate score based on mode
            base_score = 100 if correct else 0
            if mode == "speed" and correct:
                # Bonus points for quick answers
                if time_taken < 5:
                    base_score += 50
                elif time_taken < 10:
                    base_score += 25
            
            # Record the event
            event_query = """
                INSERT INTO events (source, type, user_id, session_id, content_id, payload, context)
                VALUES ('user', 'quiz_answered', $1, $2, $3, $4, $5)
                RETURNING id
            """
            
            payload = {
                "answer_id": answer_id,
                "correct": correct,
                "time_taken": time_taken,
                "score": base_score,
                "mode": mode
            }
            
            context = {"mode": mode}
            
            event_id = await conn.fetchval(
                event_query, user_id, session_id, quiz_id, 
                json.dumps(payload), json.dumps(context)
            )
            
            # Update user progress if authenticated
            if user_id:
                await self._update_user_progress(conn, user_id, correct, base_score)
            
            return {
                "correct": correct,
                "score": base_score,
                "event_id": str(event_id)
            }
    
    async def _update_user_progress(self, conn: asyncpg.Connection, user_id: UUID, 
                                  correct: bool, score: int):
        """Update user progress stats"""
        # Get current progress
        progress_query = """
            SELECT id, stats, streak_data 
            FROM user_progress 
            WHERE user_id = $1 AND content_type = 'quiz'
        """
        
        progress = await conn.fetchrow(progress_query, user_id)
        
        if progress:
            # Update existing progress
            stats = progress["stats"]
            streak_data = progress["streak_data"]
            
            stats["total_quizzes"] = stats.get("total_quizzes", 0) + 1
            if correct:
                stats["correct_answers"] = stats.get("correct_answers", 0) + 1
                streak_data["current"] = streak_data.get("current", 0) + 1
                streak_data["best"] = max(streak_data.get("best", 0), streak_data["current"])
            else:
                streak_data["current"] = 0
            
            stats["total_points"] = stats.get("total_points", 0) + score
            
            update_query = """
                UPDATE user_progress 
                SET stats = $2, streak_data = $3, updated_at = NOW()
                WHERE id = $1
            """
            
            await conn.execute(
                update_query, progress["id"], 
                json.dumps(stats), json.dumps(streak_data)
            )
        else:
            # Create new progress record
            stats = {
                "total_quizzes": 1,
                "correct_answers": 1 if correct else 0,
                "total_points": score
            }
            
            streak_data = {
                "current": 1 if correct else 0,
                "best": 1 if correct else 0
            }
            
            insert_query = """
                INSERT INTO user_progress (user_id, content_type, stats, streak_data)
                VALUES ($1, 'quiz', $2, $3)
            """
            
            await conn.execute(
                insert_query, user_id,
                json.dumps(stats), json.dumps(streak_data)
            )
    
    async def get_leaderboard(self, period: str = "daily", mode: Optional[str] = None, 
                            limit: int = 10) -> List[Dict[str, Any]]:
        """Get leaderboard for specified period"""
        # Check cache first
        cache_key = f"leaderboard:{period}:{mode or 'all'}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Calculate period boundaries
        period_clause = ""
        if period == "daily":
            period_clause = "AND e.created_at >= CURRENT_DATE"
        elif period == "weekly":
            period_clause = "AND e.created_at >= CURRENT_DATE - INTERVAL '7 days'"
        
        mode_clause = ""
        if mode:
            mode_clause = "AND e.context->>'mode' = $1"
        
        async with self.pool.acquire() as conn:
            query = f"""
                SELECT 
                    u.id as user_id,
                    u.display_name,
                    u.avatar_id,
                    SUM((e.payload->>'score')::int) as total_score,
                    COUNT(*) as games_played
                FROM events e
                JOIN users u ON u.id = e.user_id
                WHERE e.type = 'quiz_answered'
                {period_clause}
                {mode_clause}
                GROUP BY u.id, u.display_name, u.avatar_id
                ORDER BY total_score DESC
                LIMIT {limit}
            """
            
            rows = await conn.fetch(query, mode) if mode else await conn.fetch(query)
            
            leaderboard = []
            for i, row in enumerate(rows):
                leaderboard.append({
                    "rank": i + 1,
                    "user_id": str(row["user_id"]),
                    "display_name": row["display_name"],
                    "avatar_id": row["avatar_id"],
                    "score": row["total_score"],
                    "games_played": row["games_played"]
                })
            
            # Cache for 1 minute
            await self.redis.setex(cache_key, 60, json.dumps(leaderboard))
            
            return leaderboard
    
    async def get_active_cards(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get currently active promotional cards"""
        # Check cache first
        cache_key = "cards:active"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        async with self.pool.acquire() as conn:
            query = """
                SELECT id, type, priority, template, data, created_at
                FROM cards
                WHERE (starts_at IS NULL OR starts_at <= NOW())
                AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY priority DESC, created_at DESC
                LIMIT $1
            """
            
            rows = await conn.fetch(query, limit)
            
            cards = []
            for row in rows:
                card_data = {
                    "id": str(row["id"]),
                    "type": row["type"],
                    "priority": row["priority"],
                    "template": row["template"],
                    "created_at": row["created_at"].isoformat()
                }
                
                # Parse data if it's a string
                if isinstance(row["data"], str):
                    card_data["data"] = json.loads(row["data"])
                else:
                    card_data["data"] = row["data"]
                    
                cards.append(card_data)
            
            # Cache for 1 minute
            await self.redis.setex(cache_key, 60, json.dumps(cards))
            
            return cards

# Global database instance
db = Database()
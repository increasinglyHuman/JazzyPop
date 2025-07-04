"""
Database connection and utilities - NO REDIS VERSION
Redis removed because it was causing caching issues
"""
import os
import asyncpg
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
        self.database_url = os.getenv('DATABASE_URL')
    
    async def connect(self):
        """Initialize database connections"""
        # PostgreSQL connection pool
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
    
    async def disconnect(self):
        """Close database connections"""
        if self.pool:
            await self.pool.close()
    
    @asynccontextmanager
    async def transaction(self):
        """Database transaction context manager"""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                yield conn
    
    async def get_current_quiz(self, mode: str = "poqpoq") -> Optional[Dict[str, Any]]:
        """Get a quiz set with 10 questions"""
        async with self.pool.acquire() as conn:
            # Query database - get quiz sets only
            query = """
                SELECT 
                    c.id, c.type, c.data, c.metadata, c.created_at,
                    cv.variation_data
                FROM content c
                LEFT JOIN content_variations cv ON cv.content_id = c.id AND cv.mode = $1
                WHERE c.type = 'quiz_set' 
                AND c.is_active = true 
                ORDER BY RANDOM()
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
        # Implementation here...
        pass
    
    async def get_user_stats(self, user_id: UUID) -> Dict[str, Any]:
        """Get user statistics"""
        async with self.pool.acquire() as conn:
            # Get basic user info
            user_query = "SELECT username, display_name, avatar_id FROM users WHERE id = $1"
            user = await conn.fetchrow(user_query, user_id)
            
            if not user:
                return None
            
            # Get progress stats
            progress_query = """
                SELECT content_type, stats, streak_data, achievements
                FROM user_progress
                WHERE user_id = $1
            """
            progress = await conn.fetch(progress_query, user_id)
            
            # Aggregate stats
            total_score = 0
            total_quizzes = 0
            
            for row in progress:
                stats = row["stats"] or {}
                total_score += stats.get("total_score", 0)
                total_quizzes += stats.get("quizzes_completed", 0)
            
            return {
                "user": {
                    "id": str(user_id),
                    "username": user["username"],
                    "display_name": user["display_name"],
                    "avatar_id": user["avatar_id"]
                },
                "stats": {
                    "total_score": total_score,
                    "quizzes_completed": total_quizzes,
                    "rank": "Quiz Master"  # Calculate based on score
                }
            }
    
    async def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top players"""
        async with self.pool.acquire() as conn:
            query = """
                SELECT 
                    u.id, u.username, u.display_name, u.avatar_id,
                    COALESCE(SUM((p.stats->>'total_score')::int), 0) as total_score
                FROM users u
                LEFT JOIN user_progress p ON u.id = p.user_id
                WHERE u.is_anonymous = false
                GROUP BY u.id, u.username, u.display_name, u.avatar_id
                ORDER BY total_score DESC
                LIMIT $1
            """
            
            rows = await conn.fetch(query, limit)
            
            leaderboard = []
            for i, row in enumerate(rows):
                leaderboard.append({
                    "rank": i + 1,
                    "user": {
                        "id": str(row["id"]),
                        "username": row["username"],
                        "display_name": row["display_name"],
                        "avatar_id": row["avatar_id"]
                    },
                    "score": row["total_score"]
                })
            
            return leaderboard
    
    async def get_active_cards(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get currently active promotional cards"""
        async with self.pool.acquire() as conn:
            query = """
                SELECT id, type, priority, template, data, created_at
                FROM cards
                WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                AND starts_at <= CURRENT_TIMESTAMP
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
            
            return cards
    
    async def get_flashcard_content(self, category: str, limit: int = 10, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get flashcard content by category with progression tracking"""
        # If no user_id, use the original random method
        if not user_id:
            return await self._get_random_flashcards(category, limit)
        
        # Use progression-aware query for authenticated users
        async with self.pool.acquire() as conn:
            # Call the stored function to get user-specific flashcards
            rows = await conn.fetch("""
                SELECT * FROM get_user_flashcards($1::uuid, $2, $3)
            """, user_id, category, limit)
            
            flashcards = []
            for row in rows:
                # Handle both dict and JSON string formats
                data = row["data"]
                if isinstance(data, str):
                    data = json.loads(data)
                    
                card = {
                    "id": str(row["id"]),
                    "type": row["type"],
                    "category": self._get_category_name(row["type"]),
                    "seen_before": row["seen_before"],
                    **data  # Unpack the data
                }
                flashcards.append(card)
            
            return flashcards
    
    async def _get_random_flashcards(self, category: str, limit: int) -> List[Dict[str, Any]]:
        """Get random flashcards (fallback for anonymous users) - ONLY from sets of 10"""
        # Map category to content SET types ONLY
        type_map = {
            'famous_quotes': 'quote_set',
            'bad_puns': 'pun_set',
            'knock_knock': 'joke_set',
            'trivia_mix': ['trivia_set', 'quote_set', 'pun_set']
        }
        
        content_type = type_map.get(category, 'trivia_set')
        
        async with self.pool.acquire() as conn:
            if isinstance(content_type, list):
                # Multiple types for trivia mix
                rows = await conn.fetch("""
                    SELECT id, type, data, metadata
                    FROM content
                    WHERE type = ANY($1::text[])
                    AND is_active = true
                    ORDER BY RANDOM()
                    LIMIT 1
                """, content_type)  # Always get 1 set which contains 10 items
            else:
                # Single type
                rows = await conn.fetch("""
                    SELECT id, type, data, metadata
                    FROM content
                    WHERE type = $1
                    AND is_active = true
                    ORDER BY RANDOM()
                    LIMIT 1
                """, content_type)  # Always get 1 set which contains 10 items
            
            flashcards = []
            for row in rows:
                # Handle both dict and JSON string formats
                data = row["data"]
                if isinstance(data, str):
                    data = json.loads(data)
                
                # Extract items from sets
                if row["type"].endswith('_set'):
                    # Get the items array from the set
                    items_key = row["type"].replace('_set', 's')  # e.g., 'pun_set' -> 'puns'
                    if items_key == 'quotas':  # Special case for quotes
                        items_key = 'quotes'
                    
                    if items_key in data and isinstance(data[items_key], list):
                        # Always return the full set of 10
                        for item in data[items_key]:
                            card = {
                                "id": str(row["id"]) + "_" + str(item.get("id", "")),
                                "type": row["type"].replace('_set', ''),
                                "category": self._get_category_name(row["type"].replace('_set', '')),
                                **item  # Unpack the individual item
                            }
                            flashcards.append(card)
                else:
                    # This shouldn't happen anymore, but keep as fallback
                    card = {
                        "id": str(row["id"]),
                        "type": row["type"],
                        "category": self._get_category_name(row["type"]),
                        **data  # Unpack the data
                    }
                    flashcards.append(card)
            
            return flashcards
    
    async def track_content_view(self, user_id: str, content_id: str, content_type: str, metadata: Dict[str, Any] = None):
        """Track that a user has viewed a piece of content"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_content_views (user_id, content_id, content_type, metadata)
                VALUES ($1::uuid, $2::uuid, $3, $4)
                ON CONFLICT (user_id, content_id) 
                DO UPDATE SET 
                    view_count = user_content_views.view_count + 1,
                    last_viewed = CURRENT_TIMESTAMP,
                    metadata = COALESCE($4, user_content_views.metadata)
            """, user_id, content_id, content_type, json.dumps(metadata or {}))
    
    def _get_category_name(self, content_type: str) -> str:
        """Map content type to display category"""
        category_map = {
            'quote': 'Famous Quote',
            'pun': 'Bad Pun',
            'joke': 'Knock Knock',
            'fact': 'Science Fact',
            'trivia': 'Trivia'
        }
        return category_map.get(content_type, 'Trivia')

# Global database instance
db = Database()
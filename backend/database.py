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
import logging
from uuid import UUID, uuid4
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.redis = None  # DISABLED - causes caching issues
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
        
        # Redis connection DISABLED
        # self.redis = await redis.from_url(
        #     self.redis_url,
        #     encoding="utf-8",
        #     decode_responses=True
        # )
    
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
        """Get a quiz set with 10 questions"""
        async with self.pool.acquire() as conn:
            # First check Redis cache
            cache_key = f"quiz_set:current:{mode}"
            cached = await self.redis.get(cache_key) if self.redis else None
            if cached:
                return json.loads(cached)
            
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
            
            # Cache for 5 minutes
            if self.redis:
                await self.redis.setex(cache_key, 300, json.dumps(result))
            
            return result
    
    async def get_economy_state(self, user_id: Optional[UUID], session_id: Optional[str]) -> Dict[str, Any]:
        """Get economy state for user or session"""
        async with self.pool.acquire() as conn:
            # Check if user_id is actually a valid UUID (not None or empty string)
            if user_id and isinstance(user_id, UUID):
                # Get from user_progress
                row = await conn.fetchrow("""
                    SELECT stats FROM user_progress WHERE user_id = $1
                """, user_id)
                
                if row and row['stats']:
                    # Handle both dict and JSON string
                    stats = row['stats']
                    if isinstance(stats, str):
                        stats = json.loads(stats)
                    economy = stats.get('economy', {})
                    return {
                        "energy": economy.get("energy", 100),
                        "hearts": economy.get("hearts", 5),
                        "coins": economy.get("coins", 0),
                        "sapphires": economy.get("sapphires", 0),
                        "emeralds": economy.get("emeralds", 0),
                        "rubies": economy.get("rubies", 0),
                        "amethysts": economy.get("amethysts", 0),
                        "diamonds": economy.get("diamonds", 0),
                        "xp": economy.get("xp", 0),
                        "level": economy.get("level", 1),
                        "streak": economy.get("streak", 0)
                    }
            
            # Fall back to session if no valid user_id
            if session_id:
                # Get from sessions table
                row = await conn.fetchrow("""
                    SELECT data FROM sessions WHERE id = $1
                """, session_id)
                
                if row and row['data']:
                    # Handle both dict and JSON string
                    data = row['data']
                    if isinstance(data, str):
                        data = json.loads(data)
                    economy = data.get('economy', {})
                    return {
                        "energy": economy.get("energy", 100),
                        "hearts": economy.get("hearts", 5),
                        "coins": economy.get("coins", 0),
                        "sapphires": economy.get("sapphires", 0),
                        "emeralds": economy.get("emeralds", 0),
                        "rubies": economy.get("rubies", 0),
                        "amethysts": economy.get("amethysts", 0),
                        "diamonds": economy.get("diamonds", 0),
                        "xp": economy.get("xp", 0),
                        "level": economy.get("level", 1),
                        "streak": economy.get("streak", 0)
                    }
            
            # Return default state
            return {
                "energy": 100,
                "hearts": 5,
                "coins": 0,
                "sapphires": 0,
                "emeralds": 0,
                "rubies": 0,
                "amethysts": 0,
                "diamonds": 0,
                "xp": 0,
                "level": 1,
                "streak": 0
            }
    
    async def save_economy_state(self, user_id: Optional[UUID], session_id: Optional[str], state: Dict[str, Any]):
        """Save economy state for user or session"""
        async with self.pool.acquire() as conn:
            # Check if user_id is actually a valid UUID (not None or empty string)
            if user_id and isinstance(user_id, UUID):
                # First check if user exists in database
                user_exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", 
                    user_id
                )
                
                if user_exists:
                    # Check if user_progress exists
                    existing = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM user_progress WHERE user_id = $1)",
                        user_id
                    )
                    
                    if existing:
                        # Update existing user_progress
                        await conn.execute("""
                            UPDATE user_progress 
                            SET stats = COALESCE(stats, '{}'::jsonb) || jsonb_build_object('economy', $2::jsonb),
                                updated_at = NOW()
                            WHERE user_id = $1
                        """, user_id, json.dumps(state))
                    else:
                        # Create new user_progress
                        await conn.execute("""
                            INSERT INTO user_progress (user_id, stats, updated_at)
                            VALUES ($1, jsonb_build_object('economy', $2::jsonb), NOW())
                        """, user_id, json.dumps(state))
                    return  # Successfully saved to user_progress
                else:
                    # User doesn't exist, log warning and fall back to session
                    logger.warning(f"User ID {user_id} not found in database, falling back to session storage")
            
            # Fall back to session storage
            if session_id:
                # Update session
                await conn.execute("""
                    INSERT INTO sessions (id, data, created_at)
                    VALUES ($1, jsonb_build_object('economy', $2::jsonb), NOW())
                    ON CONFLICT (id) DO UPDATE
                    SET data = sessions.data || jsonb_build_object('economy', $2::jsonb)
                """, session_id, json.dumps(state))
            else:
                # No valid storage method available
                logger.warning("No valid storage method available - neither valid user_id nor session_id provided")

    async def submit_answer(self, user_id: Optional[UUID], quiz_id: UUID, answer_id: str, 
                          time_taken: float, mode: str, session_id: Optional[str] = None,
                          question_index: Optional[int] = None) -> Dict[str, Any]:
        """Submit a quiz answer and update scores"""
        async with self.transaction() as conn:
            # Get quiz data to check answer
            quiz_query = "SELECT id, type, data, metadata FROM content WHERE id = $1"
            quiz_row = await conn.fetchrow(quiz_query, quiz_id)
            
            if not quiz_row:
                raise ValueError("Quiz not found")
            
            quiz_data = quiz_row['data']
            quiz_metadata = quiz_row['metadata'] or {}
            
            # Parse quiz_data if it's a string
            if isinstance(quiz_data, str):
                quiz_data = json.loads(quiz_data)
            if isinstance(quiz_metadata, str):
                quiz_metadata = json.loads(quiz_metadata)
            
            # Determine if this is a quiz or quiz_set
            content_type = quiz_row.get('type', 'quiz')
            question_data = quiz_data
            category = quiz_metadata.get('category', quiz_data.get('category', 'unknown'))
            difficulty = quiz_metadata.get('difficulty', quiz_data.get('difficulty', 'medium'))
            
            # If it's a quiz_set and question_index provided, get specific question
            if content_type == 'quiz_set' and question_index is not None:
                questions = quiz_data.get('questions', [])
                if 0 <= question_index < len(questions):
                    question_data = questions[question_index]
                else:
                    raise ValueError(f"Invalid question index: {question_index}")
            
            # Check if answer is correct
            correct = False
            correct_answer_id = None
            for answer in question_data.get("answers", []):
                if answer.get("correct", False):
                    correct_answer_id = answer["id"]
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
            
            # Record the event with enhanced tracking
            event_query = """
                INSERT INTO events (source, type, user_id, session_id, content_id, payload, context)
                VALUES ('user', 'quiz_answered', $1, $2, $3, $4, $5)
                RETURNING id
            """
            
            payload = {
                "answer_id": answer_id,
                "correct": correct,
                "correct_answer_id": correct_answer_id,
                "time_taken": time_taken,
                "score": base_score,
                "mode": mode,
                "question_index": question_index,
                "question_text": question_data.get("question", ""),
                "category": category,
                "difficulty": difficulty
            }
            
            context = {
                "mode": mode,
                "content_type": content_type,
                "category": category,
                "difficulty": difficulty
            }
            
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
            # Handle both dict and JSON string
            stats = progress["stats"]
            if isinstance(stats, str):
                stats = json.loads(stats)
            streak_data = progress["streak_data"]
            if isinstance(streak_data, str):
                streak_data = json.loads(streak_data)
            
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
        cached = await self.redis.get(cache_key) if self.redis else None
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
            if self.redis:
                await self.redis.setex(cache_key, 60, json.dumps(leaderboard))
            
            return leaderboard
    
    async def get_active_cards(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get currently active promotional cards"""
        # Check cache first
        cache_key = "cards:active"
        cached = await self.redis.get(cache_key) if self.redis else None
        if cached:
            return json.loads(cached)
        
        async with self.pool.acquire() as conn:
            query = """
                SELECT id, type, priority, template, data, created_at
                FROM cards
                WHERE (starts_at IS NULL OR starts_at <= NOW())
                -- Expiry check removed

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
            if self.redis:
                await self.redis.setex(cache_key, 60, json.dumps(cards))
            
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
        """Get random flashcards (fallback for anonymous users)"""
        # Map category to content SET types ONLY
        type_map = {
            'famous_quotes': 'quote_set',
            'bad_puns': 'pun_set',
            'knock_knock': 'joke_set',
            'trivia_mix': 'trivia_set'  # Only trivia sets (which are now factoids)
        }
        
        content_type = type_map.get(category, 'trivia_set')
        
        # Check cache first
        cache_key = f"flashcards:{category}:{limit}"
        cached = await self.redis.get(cache_key) if self.redis else None
        if cached:
            return json.loads(cached)
        
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
                    elif items_key == 'trivias':  # Special case for trivia
                        items_key = 'trivia'
                    
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
            
            # Cache for 5 minutes
            if self.redis and flashcards:
                await self.redis.setex(cache_key, 300, json.dumps(flashcards))
            
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
            'pun': 'Punz',
            'joke': 'Knock Knock',
            'fact': 'Science Fact',
            'trivia': 'Trivia',
            'factoid': 'Factoid 🤯'
        }
        return category_map.get(content_type, 'Trivia')
    
    # ========== QUEST SYSTEM ==========
    
    async def get_user_quests(self, user_id: UUID) -> Dict[str, Any]:
        """Get all quests for a user"""
        async with self.pool.acquire() as conn:
            stats = await conn.fetchval(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            if not stats:
                return {"active": [], "completed": [], "chains": {}}
            
            # Handle both dict and JSON string
            if isinstance(stats, str):
                stats = json.loads(stats)
            
            return stats.get("quests", {"active": [], "completed": [], "chains": {}})
    
    async def update_quest_progress(self, user_id: UUID, quest_type: str, progress: int = 1) -> List[Dict]:
        """Update quest progress and check for completions"""
        completed_quests = []
        
        async with self.transaction() as conn:
            # Get current stats
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            if not row:
                return completed_quests
            
            # Handle both dict and JSON string
            stats = row['stats'] or {}
            if isinstance(stats, str):
                stats = json.loads(stats)
            quests = stats.get('quests', {'active': [], 'completed': [], 'chains': {}})
            
            # Update matching quests
            for quest in quests.get('active', []):
                if quest.get('type') == quest_type:
                    quest['progress'] = quest.get('progress', 0) + progress
                    
                    # Check completion
                    if quest['progress'] >= quest.get('target', 1):
                        quest['completed_at'] = datetime.utcnow().isoformat()
                        completed_quests.append(quest)
                        
                        # Move to completed
                        quests['completed'].append(quest['quest_id'])
                        
                        # Award rewards
                        if 'rewards' in quest:
                            await self._award_quest_rewards(conn, user_id, quest['rewards'])
            
            # Remove completed quests from active
            quests['active'] = [q for q in quests['active'] 
                               if q['quest_id'] not in [c['quest_id'] for c in completed_quests]]
            
            # Update stats
            stats['quests'] = quests
            await conn.execute(
                "UPDATE user_progress SET stats = $1 WHERE user_id = $2",
                json.dumps(stats), user_id
            )
        
        return completed_quests
    
    async def add_quest(self, user_id: UUID, quest_data: Dict[str, Any]):
        """Add a new quest for a user"""
        async with self.transaction() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            stats = row['stats'] if row else {}
            # Handle both dict and JSON string
            if isinstance(stats, str):
                stats = json.loads(stats)
            quests = stats.get('quests', {'active': [], 'completed': [], 'chains': {}})
            
            # Add quest ID and timestamp
            quest_data['quest_id'] = quest_data.get('quest_id', f"quest_{uuid4().hex[:8]}")
            quest_data['started_at'] = datetime.utcnow().isoformat()
            quest_data['progress'] = 0
            
            quests['active'].append(quest_data)
            stats['quests'] = quests
            
            # Check if user_progress exists for this user
            existing = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM user_progress WHERE user_id = $1)",
                user_id
            )
            
            if existing:
                # Update existing record
                await conn.execute("""
                    UPDATE user_progress 
                    SET stats = $2, updated_at = NOW()
                    WHERE user_id = $1
                """, user_id, json.dumps(stats))
            else:
                # Insert new record
                await conn.execute("""
                    INSERT INTO user_progress (user_id, stats, updated_at)
                    VALUES ($1, $2, NOW())
                """, user_id, json.dumps(stats))
    
    async def _award_quest_rewards(self, conn, user_id: UUID, rewards: Dict[str, Any]):
        """Award quest completion rewards"""
        # Get current economy
        row = await conn.fetchrow(
            "SELECT stats FROM user_progress WHERE user_id = $1",
            user_id
        )
        stats = row['stats'] if row else {}
        # Handle both dict and JSON string
        if isinstance(stats, str):
            stats = json.loads(stats)
        economy = stats.get('economy', {})
        
        # Apply rewards
        for key, value in rewards.items():
            if key in economy:
                economy[key] = economy.get(key, 0) + value
        
        stats['economy'] = economy
        await conn.execute(
            "UPDATE user_progress SET stats = $1 WHERE user_id = $2",
            json.dumps(stats), user_id
        )
    
    # ========== ACHIEVEMENTS & BADGES ==========
    
    async def unlock_achievement(self, user_id: UUID, achievement_id: str, metadata: Dict = None):
        """Unlock an achievement for a user"""
        async with self.transaction() as conn:
            # Get current achievements
            achievements = await conn.fetchval(
                "SELECT achievements FROM user_progress WHERE user_id = $1",
                user_id
            ) or []
            
            # Handle both dict/list and JSON string
            if isinstance(achievements, str):
                achievements = json.loads(achievements)
            
            # Check if already unlocked
            if any(a.get('id') == achievement_id for a in achievements):
                return False
            
            # Add achievement
            achievement = {
                'id': achievement_id,
                'unlocked_at': datetime.utcnow().isoformat(),
                'metadata': metadata or {}
            }
            achievements.append(achievement)
            
            # Update database
            await conn.execute("""
                UPDATE user_progress 
                SET achievements = $1::jsonb 
                WHERE user_id = $2
            """, json.dumps(achievements), user_id)
            
            return True
    
    async def get_user_badges(self, user_id: UUID) -> List[Dict]:
        """Get all badges for a user"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            if not row or not row['stats']:
                return []
            
            # Handle both dict and JSON string
            stats = row['stats']
            if isinstance(stats, str):
                stats = json.loads(stats)
            
            return stats.get('badges', [])
    
    async def award_badge(self, user_id: UUID, badge_id: str, tier: str = "bronze"):
        """Award a badge to a user"""
        async with self.transaction() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            stats = row['stats'] if row else {}
            # Handle both dict and JSON string
            if isinstance(stats, str):
                stats = json.loads(stats)
            badges = stats.get('badges', [])
            
            # Check if badge already exists
            existing = next((b for b in badges if b['id'] == badge_id), None)
            
            if existing:
                # Update tier if higher
                tier_order = {'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4}
                if tier_order.get(tier, 0) > tier_order.get(existing['tier'], 0):
                    existing['tier'] = tier
                    existing['upgraded_at'] = datetime.utcnow().isoformat()
            else:
                # New badge
                badge = {
                    'id': badge_id,
                    'tier': tier,
                    'earned_at': datetime.utcnow().isoformat()
                }
                badges.append(badge)
            
            stats['badges'] = badges
            
            # Check if user_progress exists for this user
            existing = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM user_progress WHERE user_id = $1)",
                user_id
            )
            
            if existing:
                # Update existing record
                await conn.execute("""
                    UPDATE user_progress 
                    SET stats = $2, updated_at = NOW()
                    WHERE user_id = $1
                """, user_id, json.dumps(stats))
            else:
                # Insert new record
                await conn.execute("""
                    INSERT INTO user_progress (user_id, stats, updated_at)
                    VALUES ($1, $2, NOW())
                """, user_id, json.dumps(stats))
    
    # ========== ASSETS & PETS ==========
    
    async def get_user_assets(self, user_id: UUID) -> Dict[str, Any]:
        """Get all assets for a user"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            if not row or not row['stats']:
                return {'pets': [], 'cosmetics': {}, 'inventory': []}
            
            # Handle both dict and JSON string
            stats = row['stats']
            if isinstance(stats, str):
                stats = json.loads(stats)
            
            return stats.get('assets', {'pets': [], 'cosmetics': {}, 'inventory': []})
    
    async def add_pet(self, user_id: UUID, pet_data: Dict[str, Any]):
        """Add a pet to user's collection"""
        async with self.transaction() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            stats = row['stats'] if row else {}
            # Handle both dict and JSON string
            if isinstance(stats, str):
                stats = json.loads(stats)
            assets = stats.get('assets', {'pets': [], 'cosmetics': {}, 'inventory': []})
            
            # Add pet
            pet_data['id'] = pet_data.get('id', f"pet_{uuid4().hex[:8]}")
            pet_data['acquired_at'] = datetime.utcnow().isoformat()
            pet_data['level'] = 1
            pet_data['experience'] = 0
            
            assets['pets'].append(pet_data)
            stats['assets'] = assets
            
            # Check if user_progress exists for this user
            existing = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM user_progress WHERE user_id = $1)",
                user_id
            )
            
            if existing:
                # Update existing record
                await conn.execute("""
                    UPDATE user_progress 
                    SET stats = $2, updated_at = NOW()
                    WHERE user_id = $1
                """, user_id, json.dumps(stats))
            else:
                # Insert new record
                await conn.execute("""
                    INSERT INTO user_progress (user_id, stats, updated_at)
                    VALUES ($1, $2, NOW())
                """, user_id, json.dumps(stats))
            
            return pet_data['id']
    
    async def equip_asset(self, user_id: UUID, asset_type: str, asset_id: str):
        """Equip/unequip an asset"""
        async with self.transaction() as conn:
            row = await conn.fetchrow(
                "SELECT stats FROM user_progress WHERE user_id = $1",
                user_id
            )
            
            stats = row['stats'] if row else {}
            # Handle both dict and JSON string
            if isinstance(stats, str):
                stats = json.loads(stats)
            assets = stats.get('assets', {'pets': [], 'cosmetics': {}, 'inventory': []})
            
            if asset_type == 'pet':
                # Unequip all pets first
                for pet in assets['pets']:
                    pet['equipped'] = False
                
                # Equip selected pet
                pet = next((p for p in assets['pets'] if p['id'] == asset_id), None)
                if pet:
                    pet['equipped'] = True
            
            elif asset_type in ['avatar_frame', 'theme']:
                if 'equipped' not in assets['cosmetics']:
                    assets['cosmetics']['equipped'] = {}
                assets['cosmetics']['equipped'][asset_type] = asset_id
            
            stats['assets'] = assets
            await conn.execute(
                "UPDATE user_progress SET stats = $1 WHERE user_id = $2",
                json.dumps(stats), user_id
            )
    
    # ========== ANALYTICS ==========
    
    async def get_quiz_analytics(self, quiz_id: UUID) -> Dict[str, Any]:
        """Get performance analytics for a specific quiz"""
        async with self.pool.acquire() as conn:
            # Get overall stats
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as unique_players,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as correct_answers,
                    AVG((payload->>'time_taken')::float) as avg_time,
                    AVG((payload->>'score')::int) as avg_score
                FROM events
                WHERE type = 'quiz_answered' AND content_id = $1
            """, quiz_id)
            
            # Get per-answer breakdown
            answer_stats = await conn.fetch("""
                SELECT 
                    payload->>'answer_id' as answer_id,
                    COUNT(*) as times_selected,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as times_correct
                FROM events
                WHERE type = 'quiz_answered' AND content_id = $1
                GROUP BY payload->>'answer_id'
            """, quiz_id)
            
            return {
                "quiz_id": str(quiz_id),
                "total_attempts": stats['total_attempts'],
                "unique_players": stats['unique_players'],
                "success_rate": float(stats['correct_answers']) / stats['total_attempts'] if stats['total_attempts'] > 0 else 0,
                "avg_time_seconds": float(stats['avg_time']) if stats['avg_time'] else 0,
                "avg_score": float(stats['avg_score']) if stats['avg_score'] else 0,
                "answer_distribution": [
                    {
                        "answer_id": row['answer_id'],
                        "times_selected": row['times_selected'],
                        "selection_rate": float(row['times_selected']) / stats['total_attempts'] if stats['total_attempts'] > 0 else 0
                    }
                    for row in answer_stats
                ]
            }
    
    async def get_category_analytics(self, category: str, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get performance analytics for a category, optionally filtered by user"""
        async with self.pool.acquire() as conn:
            user_filter = "AND user_id = $2" if user_id else ""
            params = [category, user_id] if user_id else [category]
            
            stats = await conn.fetchrow(f"""
                SELECT 
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as correct_answers,
                    COUNT(DISTINCT content_id) as unique_quizzes,
                    AVG((payload->>'time_taken')::float) as avg_time,
                    AVG(CASE WHEN (payload->>'correct')::boolean THEN (payload->>'time_taken')::float END) as avg_correct_time
                FROM events
                WHERE type = 'quiz_answered' 
                AND payload->>'category' = $1
                {user_filter}
            """, *params)
            
            # Get difficulty breakdown
            difficulty_stats = await conn.fetch(f"""
                SELECT 
                    payload->>'difficulty' as difficulty,
                    COUNT(*) as attempts,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as correct
                FROM events
                WHERE type = 'quiz_answered' 
                AND payload->>'category' = $1
                {user_filter}
                GROUP BY payload->>'difficulty'
            """, *params)
            
            return {
                "category": category,
                "user_id": str(user_id) if user_id else None,
                "total_attempts": stats['total_attempts'],
                "success_rate": float(stats['correct_answers']) / stats['total_attempts'] if stats['total_attempts'] > 0 else 0,
                "unique_quizzes_attempted": stats['unique_quizzes'],
                "avg_time_seconds": float(stats['avg_time']) if stats['avg_time'] else 0,
                "avg_correct_answer_time": float(stats['avg_correct_time']) if stats['avg_correct_time'] else 0,
                "difficulty_breakdown": [
                    {
                        "difficulty": row['difficulty'] or 'unknown',
                        "attempts": row['attempts'],
                        "success_rate": float(row['correct']) / row['attempts'] if row['attempts'] > 0 else 0
                    }
                    for row in difficulty_stats
                ]
            }
    
    async def get_user_strengths_weaknesses(self, user_id: UUID, min_attempts: int = 5) -> Dict[str, Any]:
        """Analyze user's strengths and weaknesses by category"""
        async with self.pool.acquire() as conn:
            # Get category performance
            category_stats = await conn.fetch("""
                SELECT 
                    payload->>'category' as category,
                    COUNT(*) as attempts,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as correct,
                    AVG((payload->>'time_taken')::float) as avg_time
                FROM events
                WHERE type = 'quiz_answered' 
                AND user_id = $1
                AND payload->>'category' IS NOT NULL
                GROUP BY payload->>'category'
                HAVING COUNT(*) >= $2
                ORDER BY (SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END)::float / COUNT(*)) DESC
            """, user_id, min_attempts)
            
            if not category_stats:
                return {"user_id": str(user_id), "strengths": [], "weaknesses": [], "overall_stats": {}}
            
            # Calculate overall stats
            total_attempts = sum(row['attempts'] for row in category_stats)
            total_correct = sum(row['correct'] for row in category_stats)
            
            categories = []
            for row in category_stats:
                success_rate = float(row['correct']) / row['attempts']
                categories.append({
                    "category": row['category'],
                    "attempts": row['attempts'],
                    "success_rate": success_rate,
                    "avg_time": float(row['avg_time']) if row['avg_time'] else 0
                })
            
            # Sort by success rate
            categories.sort(key=lambda x: x['success_rate'], reverse=True)
            
            # Identify strengths and weaknesses
            avg_success_rate = float(total_correct) / total_attempts
            strengths = [cat for cat in categories if cat['success_rate'] > avg_success_rate + 0.1][:3]
            weaknesses = [cat for cat in categories if cat['success_rate'] < avg_success_rate - 0.1][-3:]
            
            return {
                "user_id": str(user_id),
                "overall_stats": {
                    "total_attempts": total_attempts,
                    "overall_success_rate": avg_success_rate,
                    "categories_attempted": len(categories)
                },
                "strengths": strengths,
                "weaknesses": weaknesses,
                "all_categories": categories
            }
    
    async def get_global_insights(self) -> Dict[str, Any]:
        """Get global platform insights"""
        async with self.pool.acquire() as conn:
            # Overall platform stats
            overall = await conn.fetchrow("""
                SELECT 
                    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as total_players,
                    COUNT(*) as total_answers,
                    COUNT(DISTINCT content_id) as unique_quizzes_played,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as total_correct
                FROM events
                WHERE type = 'quiz_answered'
            """)
            
            # Category popularity and performance
            category_stats = await conn.fetch("""
                SELECT 
                    payload->>'category' as category,
                    COUNT(*) as attempts,
                    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as players,
                    SUM(CASE WHEN (payload->>'correct')::boolean THEN 1 ELSE 0 END) as correct,
                    AVG((payload->>'time_taken')::float) as avg_time
                FROM events
                WHERE type = 'quiz_answered'
                AND payload->>'category' IS NOT NULL
                GROUP BY payload->>'category'
                ORDER BY attempts DESC
                LIMIT 10
            """)
            
            # Time-based patterns (last 7 days)
            daily_stats = await conn.fetch("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(DISTINCT COALESCE(user_id::text, session_id)) as active_players,
                    COUNT(*) as total_answers
                FROM events
                WHERE type = 'quiz_answered'
                AND created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            """)
            
            return {
                "overall": {
                    "total_players": overall['total_players'],
                    "total_answers": overall['total_answers'],
                    "unique_quizzes_played": overall['unique_quizzes_played'],
                    "global_success_rate": float(overall['total_correct']) / overall['total_answers'] if overall['total_answers'] > 0 else 0
                },
                "category_rankings": [
                    {
                        "category": row['category'],
                        "popularity_rank": idx + 1,
                        "total_attempts": row['attempts'],
                        "unique_players": row['players'],
                        "success_rate": float(row['correct']) / row['attempts'] if row['attempts'] > 0 else 0,
                        "avg_time": float(row['avg_time']) if row['avg_time'] else 0
                    }
                    for idx, row in enumerate(category_stats)
                ],
                "daily_activity": [
                    {
                        "date": str(row['date']),
                        "active_players": row['active_players'],
                        "total_answers": row['total_answers']
                    }
                    for row in daily_stats
                ],
                "insights": self._generate_insights(category_stats, overall)
            }
    
    def _generate_insights(self, category_stats: List[Any], overall: Any) -> List[str]:
        """Generate human-readable insights from data"""
        insights = []
        
        if category_stats:
            # Find easiest and hardest categories
            sorted_by_success = sorted(category_stats, key=lambda x: float(x['correct']) / x['attempts'] if x['attempts'] > 0 else 0)
            
            if len(sorted_by_success) >= 2:
                easiest = sorted_by_success[-1]
                hardest = sorted_by_success[0]
                
                easiest_rate = float(easiest['correct']) / easiest['attempts'] * 100
                hardest_rate = float(hardest['correct']) / hardest['attempts'] * 100
                
                insights.append(f"Players excel at {easiest['category']} ({easiest_rate:.0f}% success rate)")
                insights.append(f"Players struggle most with {hardest['category']} ({hardest_rate:.0f}% success rate)")
            
            # Most popular category
            most_popular = category_stats[0]
            insights.append(f"{most_popular['category']} is the most popular category with {most_popular['attempts']} attempts")
            
            # Speed comparison
            fastest = min(category_stats, key=lambda x: x['avg_time'] if x['avg_time'] else float('inf'))
            if fastest['avg_time']:
                insights.append(f"Players answer {fastest['category']} questions fastest (avg {fastest['avg_time']:.1f}s)")
        
        return insights

# Global database instance
db = Database()
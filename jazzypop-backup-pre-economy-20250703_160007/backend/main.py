"""
JazzyPop Backend API
Main FastAPI application
"""
from fastapi import FastAPI, HTTPException, Depends, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
import logging
from uuid import UUID, uuid4
from contextlib import asynccontextmanager

# Import our modules
from database import db
from audio_service import audio_service

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()

# Initialize FastAPI app
app = FastAPI(
    title="JazzyPop API",
    description="Backend for the JazzyPop quiz platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Add this to expose all headers
)

# Pydantic models
class ContentBase(BaseModel):
    type: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = {}
    tags: Optional[List[str]] = []

class Content(ContentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

class QuizAnswer(BaseModel):
    quiz_id: UUID
    answer_id: str
    time_taken: float
    mode: str = "poqpoq"

class UserProfile(BaseModel):
    username: Optional[str]
    display_name: str
    avatar_id: str = "default"
    email: Optional[str]

# Routes
@app.get("/")
async def root():
    return {
        "message": "Welcome to JazzyPop API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow()
    }

# Content endpoints
@app.get("/api/content/quiz/current")
async def get_current_quiz(mode: str = "poqpoq"):
    """Get the current active quiz"""
    quiz = await db.get_current_quiz(mode)
    
    if not quiz:
        # Return a random quiz from our fallback list
        import random
        fallback_quizzes = [
            {
                "question": "What's the capital of France?",
                "answers": [
                    {"id": "a", "text": "London"},
                    {"id": "b", "text": "Paris", "correct": True},
                    {"id": "c", "text": "Berlin"},
                    {"id": "d", "text": "Madrid"}
                ],
                "mode_variations": {
                    "chaos": {
                        "question": "Which baguette-worshipping metropolis houses a big metal triangle?"
                    }
                }
            },
            {
                "question": "What do the Eiffel Tower and a whale's heartbeat have in common?",
                "answers": [
                    {"id": "a", "text": "Both can be heard from a mile away"},
                    {"id": "b", "text": "Both weigh approximately the same (10,000 tons)", "correct": True},
                    {"id": "c", "text": "Both were discovered in 1889"},
                    {"id": "d", "text": "Both are made of iron"}
                ],
                "mode_variations": {
                    "chaos": {
                        "question": "What cosmic coincidence links a Parisian landmark to a cetacean's life-pumping organ?"
                    }
                }
            },
            {
                "question": "How many times could you fold a piece of paper to reach the moon?",
                "answers": [
                    {"id": "a", "text": "100 times"},
                    {"id": "b", "text": "42 times", "correct": True},
                    {"id": "c", "text": "1,000 times"},
                    {"id": "d", "text": "It's impossible"}
                ],
                "mode_variations": {
                    "chaos": {
                        "question": "How many reality-bending paper folds until you can high-five lunar astronauts?"
                    }
                }
            },
            {
                "question": "Which of these is NOT a real programming language?",
                "answers": [
                    {"id": "a", "text": "LOLCODE"},
                    {"id": "b", "text": "Brainfuck"},
                    {"id": "c", "text": "ChaoScript", "correct": True},
                    {"id": "d", "text": "Shakespeare"}
                ],
                "mode_variations": {
                    "chaos": {
                        "question": "Which code-tongue is a FILTHY LIE in the pantheon of absurd programming dialects?"
                    }
                }
            },
            {
                "question": "What percentage of the internet consists of cat content?",
                "answers": [
                    {"id": "a", "text": "15%", "correct": True},
                    {"id": "b", "text": "3%"},
                    {"id": "c", "text": "42%"},
                    {"id": "d", "text": "0.001% (it just feels like more)"}
                ],
                "mode_variations": {
                    "chaos": {
                        "question": "What fraction of the digital universe has been conquered by our feline overlords?"
                    }
                }
            }
        ]
        
        selected = random.choice(fallback_quizzes)
        return {
            "id": str(uuid4()),
            "type": "quiz",
            "data": selected,
            "mode_variations": selected.get("mode_variations", {})
        }
    
    return quiz

@app.get("/api/content/quote/current")
async def get_current_quote(category: str = "wisdom"):
    """Get a current quote for flashcard practice"""
    try:
        # Get a quote from the database
        async with db.pool.acquire() as conn:
            quote = await conn.fetchrow("""
                SELECT id, type, data, metadata, tags
                FROM content
                WHERE type = 'quote' 
                AND is_active = true
                AND ($1 = 'any' OR $1 = ANY(tags))
                ORDER BY RANDOM()
                LIMIT 1
            """, category)
            
            if quote:
                return {
                    "id": str(quote["id"]),
                    "type": quote["type"],
                    "data": json.loads(quote["data"]),
                    "metadata": json.loads(quote["metadata"]) if quote["metadata"] else {},
                    "tags": quote["tags"]
                }
    except Exception as e:
        logger.error(f"Error fetching quote: {e}")
    
    # Fallback quote if database is empty
    from quote_generator import quote_generator
    fallback = quote_generator.get_fallback_quote(category)
    return fallback

@app.post("/api/content/quiz/{quiz_id}/answer")
async def submit_quiz_answer(quiz_id: UUID, answer: QuizAnswer, user_id: Optional[UUID] = None):
    """Submit an answer to a quiz"""
    try:
        result = await db.submit_answer(
            user_id=user_id,
            quiz_id=quiz_id,
            answer_id=answer.answer_id,
            time_taken=answer.time_taken,
            mode=answer.mode
        )
        
        # Add streak info if user is authenticated
        if user_id:
            # This would be fetched from user progress
            result["streak"] = 5  # TODO: Get actual streak
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to submit answer")

# User endpoints

@app.get("/api/content/quiz/sets")
async def get_quiz_sets(
    count: int = Query(default=1, ge=1, le=100, description="Number of quiz sets to return"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    mode: str = Query(default="random", description="Mode selection: random, poqpoq, chaos, zen, speed"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    include_variations: bool = Query(default=True, description="Include mode variations")
) -> List[Dict[str, Any]]:
    """
    Get multiple quiz sets with filtering options
    
    - count: Number of quiz sets to return (1-100)
    - category: Filter by specific category (e.g., 'science', 'gaming')
    - mode: Which mode variation to include (random will vary per quiz)
    - order: How to sort results (random, newest first, oldest first)
    - include_variations: Whether to include mode variations in response
    """
    
    # Valid categories from the frontend
    valid_categories = [
        'technology', 'science', 'history', 'geography', 'literature',
        'film', 'music', 'art', 'sports', 'nature', 'animals', 'food_cuisine',
        'pop_culture', 'mythology', 'space', 'gaming', 'internet_culture',
        'architecture', 'ancient_architecture', 'fashion_design', 'inventions',
        'famous_lies', 'language_evolution', 'dinosaurs', 'fame_glory'
    ]
    
    # Validate category if provided
    if category and category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )
    
    async with db.pool.acquire() as conn:
        # Build the query
        query_parts = [
            "SELECT c.id, c.type, c.data, c.metadata, c.created_at",
            "FROM content c",
            "WHERE c.type = 'quiz_set'",
            "AND c.is_active = true"
        ]
        
        params = []
        param_count = 0
        
        # Add category filter if specified
        if category:
            param_count += 1
            query_parts.append(f"AND c.data->>'category' = ${param_count}")
            params.append(category)
        
        # Add ordering
        if order == "newest":
            query_parts.append("ORDER BY c.created_at DESC")
        elif order == "oldest":
            query_parts.append("ORDER BY c.created_at ASC")
        else:  # random
            query_parts.append("ORDER BY RANDOM()")
        
        # Add limit
        param_count += 1
        query_parts.append(f"LIMIT ${param_count}")
        params.append(count)
        
        # Execute query
        query = " ".join(query_parts)
        rows = await conn.fetch(query, *params)
        
        results = []
        for row in rows:
            quiz_data = {
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            }
            
            # Add mode variations if requested
            if include_variations:
                # Determine which mode(s) to fetch
                if mode == "random":
                    # Pick a random mode for this quiz
                    import random
                    selected_mode = random.choice(['chaos', 'zen', 'speed', 'poqpoq'])
                else:
                    selected_mode = mode if mode in ['chaos', 'zen', 'speed'] else 'poqpoq'
                
                # Fetch the variation
                var_query = """
                    SELECT mode, variation_data 
                    FROM content_variations 
                    WHERE content_id = $1 AND mode = $2
                """
                
                variation = await conn.fetchrow(var_query, row["id"], selected_mode)
                
                if variation:
                    var_data = json.loads(variation["variation_data"]) if isinstance(variation["variation_data"], str) else variation["variation_data"]
                    
                    # Apply variation to quiz data
                    if selected_mode == 'chaos' and 'questions' in var_data:
                        quiz_data["data"]["questions"] = var_data["questions"]
                        quiz_data["mode"] = "chaos"
                        quiz_data["mode_effects"] = var_data.get("chaos_effects", [])
                    elif selected_mode == 'zen' and 'questions' in var_data:
                        # Merge zen hints into questions
                        for i, q in enumerate(quiz_data["data"]["questions"]):
                            if i < len(var_data["questions"]):
                                q["hint"] = var_data["questions"][i].get("hint", "")
                        quiz_data["mode"] = "zen"
                        quiz_data["no_timer"] = True
                    elif selected_mode == 'speed':
                        quiz_data["mode"] = "speed"
                        quiz_data["time_per_question"] = var_data.get("time_per_question", 10)
                    else:
                        quiz_data["mode"] = "poqpoq"
            
            results.append(quiz_data)
        
        return results


@app.post("/api/users/profile")
async def create_or_update_profile(profile: UserProfile):
    """Create or update user profile"""
    # TODO: Implement user creation/update
    return {
        "id": str(uuid4()),
        "username": profile.username,
        "display_name": profile.display_name,
        "avatar_id": profile.avatar_id
    }

@app.get("/api/users/{user_id}/progress")
async def get_user_progress(user_id: UUID):
    """Get user progress and stats"""
    # TODO: Fetch from database
    return {
        "user_id": str(user_id),
        "stats": {
            "total_quizzes": 42,
            "correct_answers": 38,
            "current_streak": 7,
            "best_streak": 15,
            "total_points": 4200
        },
        "achievements": [
            {"id": "first_quiz", "name": "First Steps", "unlocked_at": datetime.utcnow()}
        ]
    }

# Leaderboard endpoints
@app.get("/api/leaderboard/{period}")
async def get_leaderboard(period: str = "daily", mode: Optional[str] = None, limit: int = 10):
    """Get leaderboard for specified period"""
    if period not in ["daily", "weekly", "all_time"]:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    entries = await db.get_leaderboard(period, mode, limit)
    
    return {
        "period": period,
        "mode": mode,
        "updated_at": datetime.utcnow(),
        "entries": entries
    }

# Card endpoints
@app.get("/api/cards/active")
async def get_active_cards(limit: int = 10):
    """Get currently active promotional cards"""
    try:
        cards = await db.get_active_cards(limit)
        return {"cards": cards}
    except Exception as e:
        # Return default card if database query fails
        return {
            "cards": [{
                "id": str(uuid4()),
                "type": "quiz_tease",
                "priority": 10,
                "template": "quiz_preview",
                "data": {
                    "title": "Browse Our Quiz Collection!",
                    "description": "Over 2,600 quiz sets available! Pick your category.",
                    "icon": "⏳",
                    "category": "general",
                    "difficulty": "medium"
                }
            }]
        }

# Flashcard endpoints
@app.post("/api/flashcards")
async def get_flashcards(request: Dict[str, Any]):
    """Get flashcards for practice mode with progression tracking"""
    category = request.get("category", "trivia_mix")
    count = request.get("count", 10)
    user_id = request.get("user_id")  # Optional user ID for progression tracking
    
    try:
        # Fetch content from database based on category and user progression
        flashcards = await db.get_flashcard_content(category, count, user_id)
        
        if not flashcards:
            # Generate dynamic flashcards if none in database
            flashcards = await generate_dynamic_flashcards(category, count)
        
        return {"cards": flashcards}
    except Exception as e:
        # Return minimal set for testing
        return {
            "cards": [{
                "id": f"dynamic-{i}",
                "category": category,
                "type": "quote" if category == "famous_quotes" else "trivia",
                "content": f"Dynamic {category} content {i}",
                "challengeType": "true-false",
                "challenge": "Is this a test card?",
                "answer": "True",
                "difficulty": "easy"
            } for i in range(min(count, 5))]
        }

# Track content views
@app.post("/api/flashcards/track-view")
async def track_flashcard_view(request: Dict[str, Any]):
    """Track that a user has viewed a flashcard"""
    user_id = request.get("user_id")
    content_id = request.get("content_id")
    content_type = request.get("content_type", "flashcard")
    metadata = request.get("metadata", {})
    
    if not user_id or not content_id:
        raise HTTPException(status_code=400, detail="user_id and content_id required")
    
    try:
        await db.track_content_view(user_id, content_id, content_type, metadata)
        return {"status": "tracked"}
    except Exception as e:
        # Don't fail the request if tracking fails
        return {"status": "error", "message": str(e)}

# Economy endpoints
class EconomyState(BaseModel):
    energy: int = 100
    hearts: int = 5
    coins: int = 0
    sapphires: int = 0
    emeralds: int = 0
    rubies: int = 0
    amethysts: int = 0
    diamonds: int = 0
    xp: int = 0
    level: int = 1
    streak: int = 0

class GameResult(BaseModel):
    type: str  # quiz_complete, practice_complete, etc
    category: Optional[str] = 'general'
    difficulty: Optional[str] = 'medium'
    mode: Optional[str] = 'normal'
    correct_answers: Optional[int] = 0
    total_questions: Optional[int] = 1
    time_spent: Optional[float] = 0
    perfect_score: Optional[bool] = False
    streak: Optional[int] = 0

@app.post("/api/economy/process-result")
async def process_game_result(result: GameResult, session_id: Optional[str] = None, user_id: Optional[UUID] = None):
    """Process game results and calculate rewards server-side"""
    # Calculate rewards based on result
    rewards = calculate_rewards(result)
    
    # Get current economy state
    economy_state = await db.get_economy_state(user_id, session_id)
    
    # Apply rewards
    new_state = apply_rewards(economy_state, rewards)
    
    # Check for level up
    level_up = check_level_up(economy_state, new_state)
    
    # Save new state
    await db.save_economy_state(user_id, session_id, new_state)
    
    return {
        "success": True,
        "rewards": rewards,
        "new_state": new_state,
        "level_up": level_up
    }

@app.get("/api/economy/state")
async def get_economy_state(session_id: Optional[str] = None, user_id: Optional[UUID] = None):
    """Get current economy state for a user or session"""
    state = await db.get_economy_state(user_id, session_id)
    return {"state": state}

def calculate_rewards(result: GameResult) -> dict:
    """Calculate rewards based on game results"""
    rewards = {}
    
    # Base values
    base_xp = 10
    base_coins = 30
    
    # Difficulty multipliers
    difficulty_multipliers = {
        "easy": 1.0,
        "medium": 1.5,
        "hard": 2.0,
        "expert": 3.0
    }
    
    # Mode multipliers
    mode_multipliers = {
        "normal": {"xp": 1.0, "coins": 1.0},
        "zen": {"xp": 1.2, "coins": 0.8},
        "speed": {"xp": 0.9, "coins": 1.3},
        "chaos": {"xp": 1.5, "coins": 1.5}
    }
    
    # Apply multipliers
    diff_mult = difficulty_multipliers.get(result.difficulty, 1.0)
    mode_mult = mode_multipliers.get(result.mode, {"xp": 1.0, "coins": 1.0})
    
    # Calculate base rewards
    if result.type == "quiz_complete":
        rewards["xp"] = int(base_xp * diff_mult * mode_mult["xp"])
        rewards["coins"] = int(base_coins * diff_mult * mode_mult["coins"])
        
        # Bonus for perfect score
        if result.perfect_score:
            rewards["xp"] = int(rewards["xp"] * 1.5)
            rewards["diamonds"] = 1
            
        # Streak bonuses
        if result.streak >= 10:
            rewards["amethysts"] = 1
        elif result.streak >= 5:
            rewards["rubies"] = 1
        elif result.streak >= 3:
            rewards["sapphires"] = 1
            
    elif result.type == "practice_complete":
        # Practice gives less rewards
        rewards["xp"] = int(base_xp * 0.4 * diff_mult)
        rewards["coins"] = int(base_coins * 0.4 * diff_mult)
        
        if result.perfect_score:
            rewards["sapphires"] = 1
    
    return rewards

def apply_rewards(state: dict, rewards: dict) -> dict:
    """Apply rewards to current state"""
    new_state = state.copy()
    
    for resource, amount in rewards.items():
        if resource in new_state:
            new_state[resource] = new_state.get(resource, 0) + amount
            
    return new_state

def check_level_up(old_state: dict, new_state: dict) -> Optional[dict]:
    """Check if player leveled up"""
    old_level = old_state.get("level", 1)
    
    # Calculate level from XP (polynomial progression)
    xp = new_state.get("xp", 0)
    new_level = 1
    
    while True:
        xp_for_next = 100 + (new_level * new_level * 50)
        if xp >= xp_for_next:
            new_level += 1
        else:
            break
    
    if new_level > old_level:
        new_state["level"] = new_level
        return {
            "old_level": old_level,
            "new_level": new_level,
            "unlocks": get_level_unlocks(new_level)
        }
    
    return None

def get_level_unlocks(level: int) -> list:
    """Get unlocks for reaching a level"""
    unlocks = []
    
    if level == 5:
        unlocks.append("New avatar: Cool Bot")
    if level == 10:
        unlocks.append("New mode: Speed Challenge")
    if level % 5 == 0:
        unlocks.append(f"Bonus: {level * 10} gems")
        
    return unlocks

async def generate_dynamic_flashcards(category: str, count: int):
    """Generate flashcards using Haiku API"""
    flashcards = []
    
    # Map categories to generators
    if category == "famous_quotes":
        from quote_generator import quote_generator
        themes = ["wisdom", "success", "courage", "friendship", "perseverance"]
        
        for i in range(min(count, len(themes))):
            quote = await quote_generator.generate_single_quote(themes[i % len(themes)])
            if quote:
                flashcard = {
                    "id": quote["id"],
                    "category": "Famous Quote",
                    "type": "quote",
                    **quote["data"]
                }
                flashcards.append(flashcard)
                
    elif category == "bad_puns":
        from pun_generator import pun_generator
        themes = ["food", "animals", "technology", "music", "sports"]
        
        for i in range(min(count, len(themes))):
            pun = await pun_generator.generate_single_pun(themes[i % len(themes)])
            if pun:
                flashcard = {
                    "id": pun["id"],
                    "category": "Bad Pun",
                    "type": "pun",
                    **pun["data"]
                }
                flashcards.append(flashcard)
                
    elif category == "trivia_mix":
        from trivia_generator import trivia_generator
        themes = ["history", "science", "geography", "animals", "space"]
        
        for i in range(min(count, len(themes))):
            trivia = await trivia_generator.generate_single_trivia(themes[i % len(themes)])
            if trivia:
                flashcard = {
                    "id": trivia["id"],
                    "category": "Trivia",
                    "type": "trivia",
                    **trivia["data"]
                }
                flashcards.append(flashcard)
    
    return flashcards

# Audio endpoints
@app.get("/api/audio/quiz/{quiz_id}")
async def get_quiz_audio(quiz_id: UUID, mode: str = "normal"):
    """Get audio files for a quiz (cached if available)"""
    # For demo, using current quiz
    quiz = await db.get_current_quiz(mode)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check if audio service is configured
    if not audio_service.api_key:
        return {
            "available": False,
            "message": "Audio service not configured"
        }
    
    # Generate audio files
    audio_files = await audio_service.generate_quiz_audio(quiz, mode)
    
    # Convert to base64 for JSON response
    import base64
    audio_urls = {}
    for key, audio_data in audio_files.items():
        if audio_data:
            audio_urls[key] = f"data:audio/mpeg;base64,{base64.b64encode(audio_data).decode()}"
    
    return {
        "available": True,
        "quiz_id": str(quiz_id),
        "mode": mode,
        "audio": audio_urls
    }

@app.get("/api/audio/usage")
async def get_audio_usage():
    """Get current audio generation usage stats"""
    stats = await audio_service.get_usage_stats()
    return stats

# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "connected", "message": "Welcome to JazzyPop!"})
    
    try:
        while True:
            data = await websocket.receive_json()
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # TODO: Implement more message types
    except Exception:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
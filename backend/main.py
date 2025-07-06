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

# Initialize FastAPI app with enhanced OpenAPI documentation
app = FastAPI(
    title="JazzyPop API",
    description="""
## JazzyPop Quiz Platform API

Welcome to the JazzyPop API! This backend powers an engaging quiz and learning platform with gamification features.

### Features:
* 🎯 **Quiz Management** - Dynamic quiz content with multiple difficulty levels
* 💰 **Economy System** - Energy, coins, gems, and XP tracking
* 🃏 **Flashcards** - Practice mode with spaced repetition
* 👤 **User Profiles** - Track progress and achievements
* 🏆 **Leaderboards** - Compete with other players
* 🔊 **Audio Support** - Text-to-speech for quiz questions

### Getting Started:
1. Check the `/api/health` endpoint to verify the API is running
2. Use `/api/content/quiz/sets` to fetch quiz content
3. Track game results with `/api/economy/process-result`

### Authentication:
Currently, the API uses session-based identification. Full authentication is coming soon.
    """,
    version="1.0.0",
    openapi_tags=[
        {"name": "Health", "description": "API health and status endpoints"},
        {"name": "Quiz", "description": "Quiz content and gameplay endpoints"},
        {"name": "Economy", "description": "Game economy, rewards, and energy management"},
        {"name": "Flashcards", "description": "Practice mode and flashcard endpoints"},
        {"name": "Users", "description": "User profile and progress tracking"},
        {"name": "Leaderboard", "description": "Competition and ranking endpoints"},
        {"name": "Audio", "description": "Text-to-speech and audio services"},
        {"name": "Content", "description": "General content delivery endpoints"}
    ],
    contact={
        "name": "JazzyPop Support",
        "url": "https://p0qp0q.com",
        "email": "support@p0qp0q.com"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://p0qp0q.com/license"
    },
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

# Pydantic models with enhanced documentation
class ContentBase(BaseModel):
    """Base model for all content types in JazzyPop"""
    type: str = Field(
        ..., 
        description="Content type: 'quiz', 'flashcard', 'quote', etc.",
        example="quiz"
    )
    data: Dict[str, Any] = Field(
        ..., 
        description="Content payload specific to the content type",
        example={"question": "What's 2+2?", "answers": [{"id": "a", "text": "4", "correct": True}]}
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default={},
        description="Additional metadata like difficulty, category, author",
        example={"difficulty": "easy", "category": "math"}
    )
    tags: Optional[List[str]] = Field(
        default=[],
        description="Content tags for filtering and categorization",
        example=["mathematics", "basic", "arithmetic"]
    )
    
    class Config:
        schema_extra = {
            "example": {
                "type": "quiz",
                "data": {
                    "question": "What's the capital of France?",
                    "answers": [
                        {"id": "a", "text": "London"},
                        {"id": "b", "text": "Paris", "correct": True},
                        {"id": "c", "text": "Berlin"},
                        {"id": "d", "text": "Madrid"}
                    ]
                },
                "metadata": {"difficulty": "easy", "category": "geography"},
                "tags": ["geography", "capitals", "europe"]
            }
        }

class Content(ContentBase):
    """Complete content model with system fields"""
    id: UUID = Field(..., description="Unique content identifier")
    created_at: datetime = Field(..., description="Content creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

class QuizAnswer(BaseModel):
    """Model for submitting quiz answers"""
    quiz_id: UUID = Field(
        ..., 
        description="ID of the quiz being answered",
        example="550e8400-e29b-41d4-a716-446655440000"
    )
    answer_id: str = Field(
        ..., 
        description="Selected answer ID (a, b, c, or d)",
        example="b"
    )
    time_taken: float = Field(
        ..., 
        description="Time taken to answer in seconds",
        example=5.2
    )
    mode: str = Field(
        default="poqpoq",
        description="Game mode: 'poqpoq', 'chaos', 'zen', etc.",
        example="chaos"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "quiz_id": "550e8400-e29b-41d4-a716-446655440000",
                "answer_id": "c",
                "time_taken": 3.7,
                "mode": "poqpoq"
            }
        }

class UserProfile(BaseModel):
    """User profile information"""
    username: Optional[str] = Field(
        None,
        description="Unique username for the user",
        example="jazzmaster2000",
        min_length=3,
        max_length=30
    )
    display_name: str = Field(
        ...,
        description="Display name shown in game",
        example="Jazz Master",
        min_length=1,
        max_length=50
    )
    avatar_id: str = Field(
        default="default",
        description="Avatar identifier or image URL",
        example="avatar_03"
    )
    email: Optional[str] = Field(
        None,
        description="User email for account recovery",
        example="user@example.com",
        regex="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "username": "quizwhiz",
                "display_name": "Quiz Whiz",
                "avatar_id": "avatar_07",
                "email": "whiz@example.com"
            }
        }

# Routes
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to JazzyPop API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health", 
    tags=["Health"],
    summary="Health check endpoint",
    description="Check if the API is running and healthy")
async def health_check():
    """Returns the health status of the API"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow()
    }

# Content endpoints
@app.get("/api/content/quiz/current",
    tags=["Quiz"],
    summary="Get current quiz (deprecated)",
    description="Returns a single quiz. Use /api/content/quiz/sets instead for better performance",
    deprecated=True)
async def get_current_quiz(
    mode: str = Query("poqpoq", description="Game mode: 'poqpoq', 'chaos', 'zen'")
):
    """Get the current active quiz - DEPRECATED: Use /api/content/quiz/sets instead"""
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

@app.post("/api/content/quiz/{quiz_id}/answer",
    tags=["Quiz"],
    summary="Submit quiz answer",
    description="Track a user's answer to a specific quiz question",
    responses={
        200: {"description": "Answer recorded successfully"},
        404: {"description": "Quiz not found"},
        500: {"description": "Failed to submit answer"}
    })
async def submit_quiz_answer(
    quiz_id: UUID,
    answer: QuizAnswer,
    user_id: Optional[UUID] = Query(None, description="User ID for tracking progress")
):
    """Submit an answer to a quiz question"""
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


@app.post("/api/users/profile",
    tags=["Users"],
    summary="Create or update user profile",
    description="Create a new user profile or update existing one")
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
        logger.info(f"Fetching flashcards: category={category}, count={count}, user_id={user_id}")
        flashcards = await db.get_flashcard_content(category, count, user_id)
        
        if not flashcards:
            logger.warning(f"No flashcards found for category {category}, generating dynamic content")
            # Generate dynamic flashcards if none in database
            flashcards = await generate_dynamic_flashcards(category, count)
        else:
            logger.info(f"Found {len(flashcards)} flashcards from database")
        
        return {"cards": flashcards}
    except Exception as e:
        logger.error(f"Error in get_flashcards: {str(e)}", exc_info=True)
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
    """Current state of a player's game economy"""
    energy: int = Field(
        default=100,
        description="Available energy for playing games (0-100)",
        ge=0,
        le=100,
        example=85
    )
    hearts: int = Field(
        default=5,
        description="Lives/hearts remaining",
        ge=0,
        le=10,
        example=3
    )
    coins: int = Field(
        default=0,
        description="Basic currency earned from gameplay",
        ge=0,
        example=1250
    )
    sapphires: int = Field(
        default=0,
        description="Rare blue gems for special purchases",
        ge=0,
        example=5
    )
    emeralds: int = Field(
        default=0,
        description="Rare green gems for unlocking content",
        ge=0,
        example=3
    )
    rubies: int = Field(
        default=0,
        description="Rare red gems for premium features",
        ge=0,
        example=2
    )
    amethysts: int = Field(
        default=0,
        description="Rare purple gems for cosmetic items",
        ge=0,
        example=1
    )
    diamonds: int = Field(
        default=0,
        description="Ultra-rare gems for exclusive content",
        ge=0,
        example=0
    )
    xp: int = Field(
        default=0,
        description="Experience points for leveling up",
        ge=0,
        example=3450
    )
    level: int = Field(
        default=1,
        description="Current player level",
        ge=1,
        example=7
    )
    streak: int = Field(
        default=0,
        description="Current winning streak",
        ge=0,
        example=5
    )
    
    class Config:
        schema_extra = {
            "example": {
                "energy": 75,
                "hearts": 4,
                "coins": 2500,
                "sapphires": 8,
                "emeralds": 4,
                "rubies": 2,
                "amethysts": 1,
                "diamonds": 0,
                "xp": 4200,
                "level": 8,
                "streak": 3
            }
        }

class GameResult(BaseModel):
    """Game completion result for reward calculation"""
    type: str = Field(
        ...,
        description="Game type: 'quiz_complete', 'practice_complete', 'flashcard_complete'",
        example="quiz_complete"
    )
    category: Optional[str] = Field(
        default='general',
        description="Content category played",
        example="science"
    )
    difficulty: Optional[str] = Field(
        default='medium',
        description="Difficulty level: 'easy', 'medium', 'hard', 'extreme'",
        example="hard"
    )
    mode: Optional[str] = Field(
        default='normal',
        description="Game mode: 'normal', 'chaos', 'zen', 'speed'",
        example="chaos"
    )
    correct_answers: Optional[int] = Field(
        default=0,
        description="Number of correct answers",
        ge=0,
        example=8
    )
    total_questions: Optional[int] = Field(
        default=1,
        description="Total number of questions",
        ge=1,
        example=10
    )
    time_spent: Optional[float] = Field(
        default=0,
        description="Time spent in seconds",
        ge=0,
        example=125.5
    )
    perfect_score: Optional[bool] = Field(
        default=False,
        description="Whether all answers were correct",
        example=False
    )
    streak: Optional[int] = Field(
        default=0,
        description="Current winning streak",
        ge=0,
        example=3
    )
    
    class Config:
        schema_extra = {
            "example": {
                "type": "quiz_complete",
                "category": "science",
                "difficulty": "medium",
                "mode": "chaos",
                "correct_answers": 7,
                "total_questions": 10,
                "time_spent": 98.5,
                "perfect_score": False,
                "streak": 2
            }
        }

class EnergySpendRequest(BaseModel):
    """Request model for spending energy"""
    amount: int = Field(
        ...,
        description="Amount of energy to spend",
        ge=1,
        le=100,
        example=10
    )
    activity_type: str = Field(
        ...,
        description="Type of activity: 'quiz_start', 'practice_start', 'flashcard_start', 'bonus_unlock'",
        example="quiz_start"
    )
    session_id: Optional[str] = Field(
        None,
        description="Session identifier",
        example="session_123"
    )
    user_id: Optional[UUID] = Field(
        None,
        description="User identifier",
        example="550e8400-e29b-41d4-a716-446655440000"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "amount": 10,
                "activity_type": "quiz_start",
                "session_id": "session_abc123",
                "user_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }

@app.post("/api/economy/spend-energy", 
    tags=["Economy"],
    summary="Spend energy to start an activity",
    description="Deducts energy from the player's economy when starting a game or activity",
    response_description="Returns success status and updated economy state",
    responses={
        200: {
            "description": "Energy successfully spent",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "remaining_energy": 90,
                        "new_state": {
                            "energy": 90,
                            "hearts": 5,
                            "coins": 1250
                        }
                    }
                }
            }
        },
        400: {
            "description": "Insufficient energy",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "error": "Insufficient energy",
                        "required": 10,
                        "available": 5
                    }
                }
            }
        }
    }
)
async def spend_energy(request: EnergySpendRequest):
    """Spend energy to start a game or activity"""
    # Get current economy state
    economy_state = await db.get_economy_state(request.user_id, request.session_id)
    
    # Check if user has enough energy
    if economy_state.energy < request.amount:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "Insufficient energy",
                "required": request.amount,
                "available": economy_state.energy
            }
        )
    
    # Deduct energy
    economy_state.energy -= request.amount
    
    # Log the energy spend transaction
    await db.log_transaction(
        user_id=request.user_id,
        session_id=request.session_id,
        transaction_type="energy_spend",
        amount=-request.amount,
        activity_type=request.activity_type,
        metadata={
            "timestamp": datetime.utcnow().isoformat(),
            "remaining_energy": economy_state.energy
        }
    )
    
    # Save updated state
    await db.save_economy_state(request.user_id, request.session_id, economy_state)
    
    return {
        "success": True,
        "remaining_energy": economy_state.energy,
        "new_state": economy_state.dict()
    }

@app.post("/api/economy/process-result",
    tags=["Economy"],
    summary="Process game completion",
    description="Calculate and apply rewards after game completion",
    response_description="Rewards earned and updated economy state")
async def process_game_result(
    result: GameResult,
    session_id: Optional[str] = Query(None, description="Session identifier"),
    user_id: Optional[UUID] = Query(None, description="User identifier")
):
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

@app.get("/api/economy/state",
    tags=["Economy"],
    summary="Get current economy state",
    description="Retrieve the current economy state including energy, coins, gems, and level")
async def get_economy_state(
    session_id: Optional[str] = Query(None, description="Session identifier"),
    user_id: Optional[UUID] = Query(None, description="User identifier")
):
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
        # Generate factoids (simple-flip format) for trivia_mix
        from trivia_generator import trivia_generator
        themes = ["history", "science", "geography", "animals", "space", "technology", "nature", "ocean"]
        
        for i in range(min(count, len(themes))):
            # Generate factoid format instead of true/false
            trivia = await trivia_generator.generate_single_trivia(themes[i % len(themes)], format="factoid")
            if trivia:
                flashcard = {
                    "id": trivia["id"],
                    "category": "Factoid 🤯",
                    "type": "factoid",
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
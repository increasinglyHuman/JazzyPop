"""
JazzyPop Backend API
Main FastAPI application
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
from uuid import UUID, uuid4
from contextlib import asynccontextmanager

# Import our modules
from database import db
from audio_service import audio_service

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

@app.get("/health")
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
async def get_active_cards(limit: int = 5):
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
                    "title": "Quiz System Starting Up...",
                    "description": "New quizzes coming soon!",
                    "icon": "⏳"
                }
            }]
        }

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
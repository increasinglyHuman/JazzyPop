#!/usr/bin/env python3
"""
Comprehensive test script for all JazzyPop API endpoints
Tests both session-based (anonymous) and user-based (authenticated) flows
"""

import requests
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

BASE_URL = "https://p0qp0q.com"
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"  # Pre-created test user
TEST_SESSION_ID = f"test_session_{uuid.uuid4().hex[:8]}"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_result(name: str, success: bool, details: str = ""):
    """Print test result with color"""
    if success:
        print(f"{GREEN}✓ {name}{RESET} {details}")
    else:
        print(f"{RED}✗ {name}{RESET} {details}")

def test_endpoint(name: str, method: str, url: str, **kwargs) -> tuple[bool, Any]:
    """Test a single endpoint"""
    try:
        response = requests.request(method, url, **kwargs)
        success = response.status_code in [200, 201]
        
        # Try to parse JSON response
        try:
            data = response.json()
        except:
            data = response.text
            
        if not success:
            details = f"Status: {response.status_code}"
            if isinstance(data, dict) and 'detail' in data:
                details += f" - {data['detail']}"
            print_result(name, False, details)
        else:
            print_result(name, True, f"Status: {response.status_code}")
            
        return success, data
    except Exception as e:
        print_result(name, False, f"Exception: {str(e)}")
        return False, None

def test_health_endpoints():
    """Test basic health endpoints"""
    print(f"\n{BLUE}=== Testing Health Endpoints ==={RESET}")
    
    test_endpoint("GET /api/health", "GET", f"{BASE_URL}/api/health")

def test_quiz_endpoints():
    """Test quiz-related endpoints"""
    print(f"\n{BLUE}=== Testing Quiz Endpoints ==={RESET}")
    
    # Get quiz sets
    success, data = test_endpoint(
        "GET /api/content/quiz/sets", 
        "GET", 
        f"{BASE_URL}/api/content/quiz/sets",
        params={"count": 1, "mode": "poqpoq"}
    )
    
    quiz_id = None
    if success and data and len(data) > 0:
        quiz_id = data[0].get('id')
        print(f"  Retrieved quiz set: {data[0].get('data', {}).get('title', 'Unknown')}")
    
    # Get current quiz
    test_endpoint("GET /api/content/quiz/current", "GET", f"{BASE_URL}/api/content/quiz/current")
    
    # Submit answer (if we have a quiz)
    if quiz_id:
        # Note: We expect this to return an error since we're using a quiz_set ID
        # In a real scenario, you'd use individual quiz IDs from within the set
        test_endpoint(
            "POST /api/content/quiz/{quiz_id}/answer (Note: Using quiz_set ID)",
            "POST",
            f"{BASE_URL}/api/content/quiz/{quiz_id}/answer",
            json={
                "answer_id": "a",
                "time_taken": 10.5,
                "mode": "poqpoq",
                "session_id": TEST_SESSION_ID
            }
        )

def test_economy_endpoints():
    """Test economy endpoints with both session and user modes"""
    print(f"\n{BLUE}=== Testing Economy Endpoints ==={RESET}")
    
    # Test with session ID (anonymous)
    print(f"\n{YELLOW}Testing anonymous mode (session only):{RESET}")
    
    success, data = test_endpoint(
        "GET /api/economy/state (session)",
        "GET",
        f"{BASE_URL}/api/economy/state",
        params={"session_id": TEST_SESSION_ID}
    )
    
    test_endpoint(
        "POST /api/economy/spend-energy (session)",
        "POST",
        f"{BASE_URL}/api/economy/spend-energy",
        json={
            "activity_type": "quiz_start",
            "amount": 10,
            "session_id": TEST_SESSION_ID
        }
    )
    
    test_endpoint(
        "POST /api/economy/process-result (session)",
        "POST",
        f"{BASE_URL}/api/economy/process-result",
        json={
            "type": "quiz_complete",
            "category": "science",
            "difficulty": "medium",
            "mode": "poqpoq",
            "correct_answers": 7,
            "total_questions": 10,
            "time_spent": 120.5,
            "perfect_score": False,
            "streak": 1,
            "session_id": TEST_SESSION_ID
        }
    )
    
    # Test with user ID (authenticated)
    print(f"\n{YELLOW}Testing authenticated mode (user ID):{RESET}")
    
    success, data = test_endpoint(
        "GET /api/economy/state (user)",
        "GET",
        f"{BASE_URL}/api/economy/state",
        params={"user_id": TEST_USER_ID}
    )
    
    if success and data:
        print(f"  User economy: Level {data.get('state', {}).get('level', 0)}, "
              f"{data.get('state', {}).get('coins', 0)} coins")
    
    test_endpoint(
        "POST /api/economy/spend-energy (user)",
        "POST",
        f"{BASE_URL}/api/economy/spend-energy",
        json={
            "activity_type": "practice_start",
            "amount": 5,
            "user_id": TEST_USER_ID
        }
    )
    
    test_endpoint(
        "POST /api/economy/process-result (user)",
        "POST",
        f"{BASE_URL}/api/economy/process-result",
        json={
            "type": "quiz_complete",
            "category": "gaming",
            "difficulty": "hard",
            "mode": "chaos",
            "correct_answers": 10,
            "total_questions": 10,
            "time_spent": 90.0,
            "perfect_score": True,
            "streak": 5,
            "user_id": TEST_USER_ID
        }
    )

def test_flashcard_endpoints():
    """Test flashcard endpoints"""
    print(f"\n{BLUE}=== Testing Flashcard Endpoints ==={RESET}")
    
    success, data = test_endpoint(
        "POST /api/flashcards",
        "POST",
        f"{BASE_URL}/api/flashcards",
        json={
            "category": "trivia_mix",
            "count": 10,
            "user_id": TEST_USER_ID
        }
    )
    
    if success and data and 'cards' in data and len(data['cards']) > 0:
        card_id = data['cards'][0].get('id')
        print(f"  Retrieved {len(data['cards'])} flashcards")
        
        # Track view
        test_endpoint(
            "POST /api/flashcards/track-view",
            "POST",
            f"{BASE_URL}/api/flashcards/track-view",
            json={
                "user_id": TEST_USER_ID,
                "content_id": card_id.split('_')[0],  # Extract base ID
                "content_type": "flashcard",
                "metadata": {"category": "trivia_mix"}
            }
        )

def test_game_systems():
    """Test new game systems (quests, badges, achievements, assets)"""
    print(f"\n{BLUE}=== Testing Game Systems (User Required) ==={RESET}")
    
    # Quests
    print(f"\n{YELLOW}Quest System:{RESET}")
    success, data = test_endpoint(
        "GET /api/quests",
        "GET",
        f"{BASE_URL}/api/quests",
        params={"user_id": TEST_USER_ID}
    )
    
    if success and data:
        active_quests = data.get('active', [])
        if active_quests:
            print(f"  Active quests: {len(active_quests)}")
            quest_id = active_quests[0].get('quest_id')
            
            test_endpoint(
                f"POST /api/quests/{quest_id}/progress",
                "POST",
                f"{BASE_URL}/api/quests/{quest_id}/progress",
                params={"user_id": TEST_USER_ID, "progress": 1}
            )
    
    # Badges
    print(f"\n{YELLOW}Badge System:{RESET}")
    success, data = test_endpoint(
        "GET /api/badges",
        "GET",
        f"{BASE_URL}/api/badges",
        params={"user_id": TEST_USER_ID}
    )
    
    test_endpoint(
        "POST /api/badges/speed_demon/award",
        "POST",
        f"{BASE_URL}/api/badges/speed_demon/award",
        params={"user_id": TEST_USER_ID, "tier": "bronze"}
    )
    
    # Achievements
    print(f"\n{YELLOW}Achievement System:{RESET}")
    test_endpoint(
        "GET /api/achievements",
        "GET",
        f"{BASE_URL}/api/achievements",
        params={"user_id": TEST_USER_ID}
    )
    
    test_endpoint(
        "POST /api/achievements/quiz_master/unlock",
        "POST",
        f"{BASE_URL}/api/achievements/quiz_master/unlock",
        params={"user_id": TEST_USER_ID}
    )
    
    # Assets
    print(f"\n{YELLOW}Asset System:{RESET}")
    success, data = test_endpoint(
        "GET /api/assets",
        "GET",
        f"{BASE_URL}/api/assets",
        params={"user_id": TEST_USER_ID}
    )
    
    if success and data:
        pets = data.get('pets', [])
        if pets:
            print(f"  User has {len(pets)} pets")

def test_user_endpoints():
    """Test user-related endpoints"""
    print(f"\n{BLUE}=== Testing User Endpoints ==={RESET}")
    
    # Get user progress
    test_endpoint(
        f"GET /api/users/{TEST_USER_ID}/progress",
        "GET",
        f"{BASE_URL}/api/users/{TEST_USER_ID}/progress"
    )
    
    # Profile endpoint (not implemented yet)
    test_endpoint(
        "POST /api/users/profile",
        "POST",
        f"{BASE_URL}/api/users/profile",
        json={
            "username": "test_user_2",
            "email": "test2@jazzypop.com",
            "display_name": "Test User 2",
            "avatar_id": "avatar_02"
        }
    )

def test_leaderboard_endpoints():
    """Test leaderboard endpoints"""
    print(f"\n{BLUE}=== Testing Leaderboard Endpoints ==={RESET}")
    
    for period in ["daily", "weekly", "all-time"]:
        test_endpoint(
            f"GET /api/leaderboard/{period}",
            "GET",
            f"{BASE_URL}/api/leaderboard/{period}",
            params={"limit": 5}
        )

def test_feedback_validation():
    """Test feedback and validation endpoints"""
    print(f"\n{BLUE}=== Testing Feedback & Validation ==={RESET}")
    
    # Validation stats
    test_endpoint(
        "GET /api/validation/stats",
        "GET",
        f"{BASE_URL}/api/validation/stats"
    )

def test_deprecated_endpoints():
    """Test deprecated endpoints to ensure they still work"""
    print(f"\n{BLUE}=== Testing Deprecated Endpoints ==={RESET}")
    
    test_endpoint(
        "GET /api/cards/active (DEPRECATED)",
        "GET",
        f"{BASE_URL}/api/cards/active"
    )

def main():
    """Run all tests"""
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}JazzyPop API Comprehensive Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"Base URL: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    print(f"Test Session ID: {TEST_SESSION_ID}")
    print(f"Time: {datetime.now()}")
    
    # Run all test suites
    test_health_endpoints()
    test_quiz_endpoints()
    test_economy_endpoints()
    test_flashcard_endpoints()
    test_game_systems()
    test_user_endpoints()
    test_leaderboard_endpoints()
    test_feedback_validation()
    test_deprecated_endpoints()
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Test suite completed!{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    print(f"\n{YELLOW}Note: Some endpoints may fail if:{RESET}")
    print("- User registration is not yet implemented (expected)")
    print("- Achievement/quest content definitions don't exist yet")
    print("- Session data expires or doesn't persist")

if __name__ == "__main__":
    main()
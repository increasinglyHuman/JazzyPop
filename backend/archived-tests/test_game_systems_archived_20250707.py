#!/usr/bin/env python3
"""
Test the new game systems (quests, achievements, badges, assets)
"""

import requests
import json
import uuid
from datetime import datetime

BASE_URL = "https://p0qp0q.com"

# Test user (we'll create one for this test)
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"  # Example from OpenAPI

def test_quest_system():
    """Test quest endpoints"""
    print("\n=== Testing Quest System ===")
    
    # Get quests (should be empty initially)
    response = requests.get(f"{BASE_URL}/api/quests", params={"user_id": TEST_USER_ID})
    print(f"Get quests: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Update quest progress
    response = requests.post(
        f"{BASE_URL}/api/quests/daily_login/progress",
        params={"user_id": TEST_USER_ID, "progress": 1}
    )
    print(f"\nUpdate quest progress: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_achievement_system():
    """Test achievement endpoints"""
    print("\n=== Testing Achievement System ===")
    
    # Get achievements
    response = requests.get(f"{BASE_URL}/api/achievements", params={"user_id": TEST_USER_ID})
    print(f"Get achievements: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Unlock achievement
    response = requests.post(
        f"{BASE_URL}/api/achievements/first_win/unlock",
        params={"user_id": TEST_USER_ID}
    )
    print(f"\nUnlock achievement: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_badge_system():
    """Test badge endpoints"""
    print("\n=== Testing Badge System ===")
    
    # Get badges
    response = requests.get(f"{BASE_URL}/api/badges", params={"user_id": TEST_USER_ID})
    print(f"Get badges: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Award badge
    response = requests.post(
        f"{BASE_URL}/api/badges/quiz_master/award",
        params={"user_id": TEST_USER_ID, "tier": "bronze"}
    )
    print(f"\nAward badge: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Award same badge with higher tier
    response = requests.post(
        f"{BASE_URL}/api/badges/quiz_master/award",
        params={"user_id": TEST_USER_ID, "tier": "silver"}
    )
    print(f"\nUpgrade badge: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_asset_system():
    """Test asset/pet endpoints"""
    print("\n=== Testing Asset System ===")
    
    # Get assets
    response = requests.get(f"{BASE_URL}/api/assets", params={"user_id": TEST_USER_ID})
    print(f"Get assets: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Add a pet
    response = requests.post(
        f"{BASE_URL}/api/assets/pet",
        params={
            "user_id": TEST_USER_ID,
            "pet_type": "space_cat",
            "name": "Luna"
        }
    )
    print(f"\nAdd pet: {response.status_code}")
    if response.status_code == 200:
        pet_response = response.json()
        print(f"Response: {json.dumps(pet_response, indent=2)}")
        
        # Equip the pet
        if pet_response.get("pet_id"):
            response = requests.post(
                f"{BASE_URL}/api/assets/pet/{pet_response['pet_id']}/equip",
                params={"user_id": TEST_USER_ID}
            )
            print(f"\nEquip pet: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")

def main():
    """Run all tests"""
    print("Testing JazzyPop Game Systems")
    print(f"Base URL: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    
    test_quest_system()
    test_achievement_system()
    test_badge_system()
    test_asset_system()
    
    # Final check - get all systems data
    print("\n=== Final State Check ===")
    
    # Get updated badges
    response = requests.get(f"{BASE_URL}/api/badges", params={"user_id": TEST_USER_ID})
    print(f"\nFinal badges: {json.dumps(response.json(), indent=2)}")
    
    # Get updated assets
    response = requests.get(f"{BASE_URL}/api/assets", params={"user_id": TEST_USER_ID})
    print(f"\nFinal assets: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    main()
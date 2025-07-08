#!/usr/bin/env python3
"""
Test Google OAuth endpoint
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://p0qp0q.com"

def test_new_user_auth():
    """Test creating a new user via Google auth"""
    print("\n=== Testing New User Google Auth ===")
    
    response = requests.post(f"{BASE_URL}/api/auth/google", json={
        "google_id": "google_test_user_123",
        "email": "testuser@gmail.com",
        "name": "Test User",
        "picture": "https://example.com/picture.jpg",
        "session_id": "test_session_456"
    })
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Authentication successful")
        print(f"   User ID: {data['user_id']}")
        print(f"   New User: {data['is_new_user']}")
        print(f"   Display Name: {data['display_name']}")
        print(f"   Avatar: {data['avatar_id']}")
        print(f"   Data Migrated: {data['migrated_data']}")
        return data['user_id']
    else:
        print(f"❌ Failed: {response.text}")
        return None

def test_existing_user_auth(user_id=None):
    """Test authenticating an existing user"""
    print("\n=== Testing Existing User Google Auth ===")
    
    response = requests.post(f"{BASE_URL}/api/auth/google", json={
        "google_id": "google_test_user_123",
        "email": "testuser@gmail.com",
        "name": "Test User",
        "picture": "https://example.com/picture.jpg"
    })
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Authentication successful")
        print(f"   User ID: {data['user_id']}")
        print(f"   New User: {data['is_new_user']} (should be False)")
        print(f"   Display Name: {data['display_name']}")
        
        if user_id and data['user_id'] == user_id:
            print(f"   ✅ Same user ID returned")
    else:
        print(f"❌ Failed: {response.text}")

def test_session_migration():
    """Test session data migration"""
    print("\n=== Testing Session Migration ===")
    
    # First, create some session data
    session_id = f"migrate_test_{datetime.now().timestamp()}"
    
    # Spend some energy as anonymous user
    response = requests.post(f"{BASE_URL}/api/economy/spend-energy", json={
        "activity_type": "quiz_start",
        "amount": 10,
        "session_id": session_id
    })
    
    if response.status_code == 200:
        print(f"✅ Created session with some activity")
        
        # Now authenticate with Google and provide session_id
        auth_response = requests.post(f"{BASE_URL}/api/auth/google", json={
            "google_id": f"google_migrate_test_{datetime.now().timestamp()}",
            "email": f"migrate_test_{datetime.now().timestamp()}@gmail.com",
            "name": "Migration Test User",
            "session_id": session_id
        })
        
        if auth_response.status_code == 200:
            data = auth_response.json()
            print(f"✅ Authentication successful")
            print(f"   User ID: {data['user_id']}")
            print(f"   Data Migrated: {data['migrated_data']} (should be True)")
            
            # Check if economy was migrated
            economy_response = requests.get(
                f"{BASE_URL}/api/economy/state",
                params={"user_id": data['user_id']}
            )
            
            if economy_response.status_code == 200:
                economy = economy_response.json()['state']
                print(f"   Energy: {economy['energy']} (should be 90)")
                
                if economy['energy'] == 90:
                    print(f"   ✅ Session data successfully migrated!")
            
def main():
    """Run all Google auth tests"""
    print("=" * 60)
    print("Google OAuth Test Suite")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    
    # Test new user creation
    user_id = test_new_user_auth()
    
    # Test existing user auth
    if user_id:
        test_existing_user_auth(user_id)
    
    # Test session migration
    test_session_migration()
    
    print("\n" + "=" * 60)
    print("Google auth tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
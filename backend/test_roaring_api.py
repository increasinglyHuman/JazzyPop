#!/usr/bin/env python3
"""
Test the roaring bitmap deduplication API integration
Run this after updating main.py
"""

import requests
import json
from uuid import uuid4

BASE_URL = "https://p0qp0q.com/api"
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

def test_deduplication():
    print("Testing Roaring Bitmap Deduplication")
    print("=" * 40)
    
    # 1. Get quotes WITHOUT user_id (should work as before)
    print("\n1. Testing anonymous quote fetch...")
    resp = requests.get(f"{BASE_URL}/content/quote/sets?count=3")
    if resp.status_code == 200:
        quotes = resp.json()
        print(f"   ✅ Got {len(quotes)} quotes for anonymous user")
    else:
        print(f"   ❌ Error: {resp.status_code}")
    
    # 2. Get quotes WITH user_id (should exclude seen)
    print("\n2. Testing authenticated quote fetch...")
    resp = requests.get(f"{BASE_URL}/content/quote/sets?count=3&user_id={TEST_USER_ID}")
    if resp.status_code == 200:
        quotes = resp.json()
        print(f"   ✅ Got {len(quotes)} quotes for user")
        if quotes:
            first_quote_id = quotes[0]['id']
            print(f"   First quote ID: {first_quote_id[:8]}...")
    else:
        print(f"   ❌ Error: {resp.status_code}")
    
    # 3. Get quotes again (first should be excluded)
    print("\n3. Testing deduplication...")
    resp = requests.get(f"{BASE_URL}/content/quote/sets?count=5&user_id={TEST_USER_ID}")
    if resp.status_code == 200:
        new_quotes = resp.json()
        new_ids = [q['id'] for q in new_quotes]
        if 'first_quote_id' in locals() and first_quote_id not in new_ids:
            print(f"   ✅ Previously seen quote was excluded!")
        else:
            print(f"   ⚠️  Deduplication may not be working")
    else:
        print(f"   ❌ Error: {resp.status_code}")
    
    # 4. Test completion endpoint
    print("\n4. Testing completion tracking...")
    if quotes:
        complete_url = f"{BASE_URL}/content/quote/{quotes[0]['id']}/complete?user_id={TEST_USER_ID}"
        resp = requests.post(complete_url)
        if resp.status_code == 200:
            result = resp.json()
            print(f"   ✅ Marked as completed: {result}")
        else:
            print(f"   ❌ Error: {resp.status_code}")
    
    # 5. Get user stats
    print("\n5. Testing user statistics...")
    resp = requests.get(f"{BASE_URL}/users/{TEST_USER_ID}/content-stats")
    if resp.status_code == 200:
        stats = resp.json()
        print(f"   ✅ User stats: {json.dumps(stats, indent=2)}")
    else:
        print(f"   ❌ Error: {resp.status_code}")
    
    print("\n" + "=" * 40)
    print("Test complete!")

def test_all_content_types():
    """Test deduplication for all content types"""
    print("\nTesting all content types...")
    print("-" * 40)
    
    content_types = ['quiz', 'quote', 'joke', 'pun', 'trivia']
    
    for ctype in content_types:
        endpoint = f"{BASE_URL}/content/{ctype}/sets"
        resp = requests.get(f"{endpoint}?count=1&user_id={TEST_USER_ID}")
        
        if resp.status_code == 200:
            content = resp.json()
            if content:
                print(f"✅ {ctype}: Got {len(content)} items")
            else:
                print(f"⚠️  {ctype}: No content returned")
        else:
            print(f"❌ {ctype}: Error {resp.status_code}")

if __name__ == "__main__":
    print("JazzyPop Roaring Bitmap API Test")
    print("================================\n")
    
    print("Note: Run this AFTER updating main.py with roaring bitmap integration\n")
    
    response = input("Has main.py been updated? (y/n): ")
    if response.lower() == 'y':
        test_deduplication()
        test_all_content_types()
    else:
        print("\nPlease update main.py first using the instructions in main_roaring_updates.py")
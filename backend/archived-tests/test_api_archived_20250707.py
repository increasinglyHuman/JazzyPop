#!/usr/bin/env python3
"""
Test script for JazzyPop API
"""
import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://52.88.234.65:8000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_current_quiz():
    """Test current quiz endpoint"""
    print("\nTesting current quiz endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/content/quiz/current", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_leaderboard():
    """Test leaderboard endpoint"""
    print("\nTesting leaderboard endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/leaderboard/daily", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("JazzyPop API Test Script")
    print(f"Testing API at: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    print("-" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Current Quiz", test_current_quiz),
        ("Leaderboard", test_leaderboard)
    ]
    
    results = []
    for name, test_func in tests:
        success = test_func()
        results.append((name, success))
    
    print("\n" + "=" * 50)
    print("Test Results:")
    for name, success in results:
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"{name}: {status}")
    
    if all(success for _, success in results):
        print("\nAll tests passed! 🎉")
    else:
        print("\nSome tests failed. Check if port 8000 is open in AWS Security Group.")

if __name__ == "__main__":
    main()
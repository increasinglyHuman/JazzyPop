#!/usr/bin/env python3
"""
Test analytics endpoints
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://p0qp0q.com"
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

def test_global_insights():
    """Test global insights endpoint"""
    print("\n=== Testing Global Insights ===")
    response = requests.get(f"{BASE_URL}/api/analytics/insights")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Global insights retrieved")
        print(f"   Total players: {data['overall']['total_players']}")
        print(f"   Total answers: {data['overall']['total_answers']}")
        print(f"   Global success rate: {data['overall']['global_success_rate']*100:.1f}%")
        
        if data.get('insights'):
            print("\n   Insights:")
            for insight in data['insights']:
                print(f"   - {insight}")
                
        if data.get('category_rankings'):
            print("\n   Top Categories:")
            for cat in data['category_rankings'][:3]:
                print(f"   {cat['popularity_rank']}. {cat['category']} - {cat['total_attempts']} attempts, {cat['success_rate']*100:.0f}% success")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)

def test_category_analytics():
    """Test category analytics"""
    print("\n=== Testing Category Analytics ===")
    
    # Test global category stats
    category = "science"
    response = requests.get(f"{BASE_URL}/api/analytics/category/{category}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Category '{category}' analytics:")
        print(f"   Total attempts: {data['total_attempts']}")
        print(f"   Success rate: {data['success_rate']*100:.1f}%")
        print(f"   Unique quizzes: {data['unique_quizzes_attempted']}")
    else:
        print(f"❌ Failed: {response.status_code}")

def test_user_strengths():
    """Test user strengths/weaknesses analysis"""
    print("\n=== Testing User Strengths Analysis ===")
    
    response = requests.get(f"{BASE_URL}/api/analytics/user/{TEST_USER_ID}/strengths?min_attempts=1")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ User analysis retrieved")
        
        if data.get('strengths'):
            print("\n   Strengths:")
            for strength in data['strengths']:
                print(f"   - {strength['category']}: {strength['success_rate']*100:.0f}% success rate")
                
        if data.get('weaknesses'):
            print("\n   Weaknesses:")
            for weakness in data['weaknesses']:
                print(f"   - {weakness['category']}: {weakness['success_rate']*100:.0f}% success rate")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)

def test_recommendations():
    """Test personalized recommendations"""
    print("\n=== Testing Recommendations ===")
    
    response = requests.get(f"{BASE_URL}/api/analytics/recommendations/{TEST_USER_ID}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Recommendations retrieved")
        
        for rec in data.get('recommendations', []):
            print(f"\n   [{rec['type'].upper()}] {rec['category']} (Difficulty: {rec['difficulty']})")
            print(f"   Reason: {rec['reason']}")
    else:
        print(f"❌ Failed: {response.status_code}")

def test_quiz_analytics():
    """Test individual quiz analytics"""
    print("\n=== Testing Quiz Analytics ===")
    
    # First get a quiz ID
    quiz_response = requests.get(f"{BASE_URL}/api/content/quiz/sets?count=1")
    if quiz_response.status_code == 200:
        quiz_data = quiz_response.json()
        if quiz_data and len(quiz_data) > 0:
            quiz_id = quiz_data[0]['id']
            
            response = requests.get(f"{BASE_URL}/api/analytics/quiz/{quiz_id}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Quiz analytics retrieved")
                print(f"   Total attempts: {data['total_attempts']}")
                print(f"   Success rate: {data['success_rate']*100:.1f}%")
                print(f"   Avg time: {data['avg_time_seconds']:.1f}s")
                
                if data.get('answer_distribution'):
                    print("\n   Answer distribution:")
                    for answer in data['answer_distribution']:
                        print(f"   - {answer['answer_id']}: selected {answer['selection_rate']*100:.0f}% of the time")
            else:
                print(f"❌ Failed: {response.status_code}")

def main():
    """Run all analytics tests"""
    print("=" * 60)
    print("JazzyPop Analytics Test Suite")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User ID: {TEST_USER_ID}")
    print(f"Time: {datetime.now()}")
    
    test_global_insights()
    test_category_analytics()
    test_user_strengths()
    test_recommendations()
    test_quiz_analytics()
    
    print("\n" + "=" * 60)
    print("Analytics tests completed!")
    print("=" * 60)
    
    print("\n💡 With these analytics endpoints, you can now:")
    print("- Identify which categories players excel at vs struggle with")
    print("- Track individual quiz performance to improve content")
    print("- Provide personalized recommendations")
    print("- Generate platform-wide insights")
    print("- Award badges based on category mastery")
    print("- Adjust difficulty ratings based on actual performance")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Check quiz count in Redis database
"""
import redis
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_quiz_count():
    # Connect to Redis
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    r = redis.from_url(redis_url, decode_responses=True)
    
    # Count quiz-related keys
    all_keys = r.keys('*')
    quiz_keys = [k for k in all_keys if 'quiz' in k.lower()]
    
    print(f"Total keys in Redis: {len(all_keys)}")
    print(f"Quiz-related keys: {len(quiz_keys)}")
    
    # Check for specific quiz patterns
    quiz_patterns = [
        'quiz:*',
        'content:quiz:*',
        'quiz:current:*',
        'cards:*'
    ]
    
    for pattern in quiz_patterns:
        keys = r.keys(pattern)
        print(f"\nPattern '{pattern}': {len(keys)} keys")
        if keys and len(keys) <= 5:
            for key in keys[:5]:
                try:
                    value = r.get(key)
                    if value:
                        data = json.loads(value) if value.startswith('{') else value
                        print(f"  - {key}: {type(data)}")
                except:
                    print(f"  - {key}: (unable to parse)")
    
    # Check cards:active cache
    try:
        cards_data = r.get('cards:active')
        if cards_data:
            cards = json.loads(cards_data)
            print(f"\nActive cards in cache: {len(cards)}")
    except:
        print("\nNo active cards cache found")

if __name__ == "__main__":
    try:
        check_quiz_count()
    except redis.ConnectionError:
        print("Could not connect to Redis. Make sure Redis is running.")
    except Exception as e:
        print(f"Error: {e}")
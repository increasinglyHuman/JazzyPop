#!/usr/bin/env python3
import asyncpg
import asyncio
import json
import os
from dotenv import load_dotenv
from uuid import UUID

async def debug_feedback_endpoint():
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in environment")
        return
    
    # Test quiz ID we found earlier
    quiz_id = "1e1f7866-0776-4991-84f1-cc108d74f5d0"
    
    print(f"Testing with quiz ID: {quiz_id}")
    
    # Connect to database
    conn = await asyncpg.connect(db_url)
    
    try:
        # Simulate what the endpoint does
        result = await conn.fetchrow("""
            SELECT 
                id,
                data,
                validation_passes,
                validation_status
            FROM content 
            WHERE id = $1 AND type = 'quiz_set'
        """, UUID(quiz_id))
        
        if not result:
            print("Quiz not found!")
            return
            
        # Parse data field if it's a string
        data = result['data']
        if isinstance(data, str):
            data = json.loads(data)
            
        print(f"Found quiz: {data.get('title', 'No title')}")
        print(f"Validation status: {result['validation_status']}")
        
        # Check validation_passes structure
        validation_passes = result['validation_passes']
        print(f"\nValidation passes type: {type(validation_passes)}")
        
        # If it's a string, parse it
        if isinstance(validation_passes, str):
            validation_passes = json.loads(validation_passes)
            
        print(f"Has validation_results: {'validation_results' in validation_passes}")
        
        if 'validation_results' in validation_passes:
            validation_results = validation_passes['validation_results']
            print(f"Number of validation results: {len(validation_results)}")
            
            if validation_results and len(validation_results) > 0:
                first_result = validation_results[0]
                print(f"First result has feedback_captions: {'feedback_captions' in first_result}")
                
                if 'feedback_captions' in first_result:
                    feedback_captions = first_result['feedback_captions']
                    print(f"Number of feedback captions: {len(feedback_captions)}")
                    
                    # Show structure
                    for key, value in list(feedback_captions.items())[:2]:
                        print(f"\nFeedback for answer '{key}':")
                        print(f"  Type: {type(value)}")
                        if isinstance(value, dict):
                            print(f"  Keys: {list(value.keys())}")
                            print(f"  Content: {str(value)[:100]}...")
                        else:
                            print(f"  Content: {str(value)[:100]}...")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(debug_feedback_endpoint())
#!/usr/bin/env python3
import asyncpg
import asyncio
import json
import os
from dotenv import load_dotenv

async def find_quiz_with_feedback():
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in environment")
        return
    
    # Connect to database
    conn = await asyncpg.connect(db_url)
    
    try:
        # Find quizzes with validation_passes containing feedback_captions
        query = """
            SELECT 
                id, 
                data->>'title' as title,
                validation_passes,
                validation_status
            FROM content 
            WHERE type = 'quiz_set' 
            AND validation_passes IS NOT NULL
            AND validation_passes::text LIKE '%feedback_caption%'
            LIMIT 5
        """
        
        rows = await conn.fetch(query)
        
        print(f"Found {len(rows)} quizzes with feedback captions\n")
        
        for row in rows:
            print(f"Quiz ID: {row['id']}")
            print(f"Title: {row['title']}")
            print(f"Validation Status: {row['validation_status']}")
            
            # Parse validation_passes to check structure
            try:
                validation_data = json.loads(row['validation_passes']) if isinstance(row['validation_passes'], str) else row['validation_passes']
                
                if 'validation_results' in validation_data and validation_data['validation_results']:
                    first_result = validation_data['validation_results'][0]
                    if 'feedback_captions' in first_result:
                        feedback_count = len(first_result['feedback_captions'])
                        print(f"Has {feedback_count} feedback captions")
                        # Show first feedback as example
                        first_feedback = list(first_result['feedback_captions'].items())[0]
                        feedback_text = str(first_feedback[1])[:50] if first_feedback[1] else ""
                        print(f"Example feedback: {first_feedback[0]}: {feedback_text}...")
                        
                        return str(row['id'])
            except Exception as e:
                print(f"Error parsing validation data: {e}")
            
            print("-" * 50)
    
    finally:
        await conn.close()

async def test_api_with_valid_id(quiz_id):
    import aiohttp
    
    endpoint = f"https://p0qp0q.com/api/content/quiz/{quiz_id}/answer-feedback-captions"
    print(f"\n\nTesting API endpoint: {endpoint}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(endpoint) as response:
            print(f"Status: {response.status}")
            data = await response.json()
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")

async def main():
    quiz_id = await find_quiz_with_feedback()
    if quiz_id:
        await test_api_with_valid_id(quiz_id)

if __name__ == "__main__":
    asyncio.run(main())
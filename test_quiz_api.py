#!/usr/bin/env python3
import os
import sys
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import database config
from app.database import DATABASE_URL

# Create database connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def find_quiz_with_feedback():
    with SessionLocal() as db:
        # Find a quiz that has validation_passes with feedback_captions
        query = text('''
            SELECT DISTINCT q.id, q.question, q.validation_passes
            FROM quizzes q
            WHERE q.validation_passes IS NOT NULL
            AND q.validation_passes != '[]'
            AND q.validation_passes::text LIKE '%feedback_caption%'
            LIMIT 5
        ''')
        
        result = db.execute(query)
        quizzes = result.fetchall()
        
        print(f"Found {len(quizzes)} quizzes with feedback_captions")
        
        for quiz in quizzes:
            print(f"\nQuiz ID: {quiz.id}")
            print(f"Question: {quiz.question[:50]}...")
            
            # Parse validation_passes
            try:
                validation_passes = json.loads(quiz.validation_passes) if isinstance(quiz.validation_passes, str) else quiz.validation_passes
                print(f"Validation passes count: {len(validation_passes)}")
                
                # Show first validation pass with feedback
                for i, vp in enumerate(validation_passes[:2]):
                    if 'feedback_caption' in vp:
                        print(f"  Pass {i}: has feedback_caption: {vp.get('feedback_caption', '')[:50]}...")
                        
                return quiz.id
            except Exception as e:
                print(f"  Error parsing validation_passes: {e}")
        
        return None

def test_api_endpoint(quiz_id):
    # Test the API endpoint
    base_url = "https://p0qp0q.com/api"
    endpoint = f"{base_url}/quiz/{quiz_id}/validations"
    
    print(f"\nTesting API endpoint: {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("Success! Response:")
            print(json.dumps(response.json(), indent=2)[:500])
        else:
            print(f"Error Response: {response.text[:500]}")
            
        return response
        
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def check_raw_data(quiz_id):
    with SessionLocal() as db:
        query = text('SELECT validation_passes FROM quizzes WHERE id = :quiz_id')
        result = db.execute(query, {"quiz_id": quiz_id})
        row = result.fetchone()
        
        if row:
            print(f"\nRaw validation_passes data for quiz {quiz_id}:")
            print(f"Type: {type(row.validation_passes)}")
            print(f"Raw value: {str(row.validation_passes)[:200]}...")
            
            # Try to parse it
            try:
                if isinstance(row.validation_passes, str):
                    parsed = json.loads(row.validation_passes)
                else:
                    parsed = row.validation_passes
                print(f"Parsed successfully, {len(parsed)} items")
            except Exception as e:
                print(f"Parse error: {e}")

if __name__ == "__main__":
    print("=== Testing Quiz Validation API ===")
    
    # Find a quiz with feedback
    quiz_id = find_quiz_with_feedback()
    
    if quiz_id:
        # Check raw data
        check_raw_data(quiz_id)
        
        # Test the API
        test_api_endpoint(quiz_id)
    else:
        print("No quizzes found with feedback_captions")
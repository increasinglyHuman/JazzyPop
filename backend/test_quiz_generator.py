#!/usr/bin/env python3
"""
Test the quiz generator locally
"""
import asyncio
import json
from quiz_generator import QuizGenerator
from database import db

async def test_generator():
    """Test quiz generation"""
    print("Testing Quiz Generator")
    print("-" * 50)
    
    # Initialize database connections
    print("Connecting to database...")
    await db.connect()
    
    try:
        generator = QuizGenerator()
        
        # Test quiz generation
        print("\n1. Generating quiz...")
        quiz = await generator.generate_quiz()
        print(f"Generated quiz: {json.dumps(quiz, indent=2)}")
        
        # Test mode variations
        print("\n2. Generating mode variations...")
        variations = await generator.generate_mode_variations(quiz)
        print(f"Variations: {json.dumps(variations, indent=2)}")
        
        # Test saving (optional - comment out if you don't want to save)
        # print("\n3. Saving to database...")
        # await generator.save_quiz(quiz, variations)
        # print("Quiz saved successfully!")
        
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_generator())
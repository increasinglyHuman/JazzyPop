#!/usr/bin/env python3
"""
Test AI validator locally before deploying
"""

import os
import asyncio
import json

# Simple test without database
def test_validation_prompt():
    """Test the validation prompt format"""
    
    test_question = {
        'question': 'What is the capital of France?',
        'answers': [
            {'id': 'a', 'text': 'London', 'correct': False},
            {'id': 'b', 'text': 'Berlin', 'correct': False},
            {'id': 'c', 'text': 'Paris', 'correct': True},
            {'id': 'd', 'text': 'New York', 'correct': False}
        ]
    }
    
    # Import just the validator class
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from ai_quiz_validator import AIQuizValidator
    
    # Create dummy validator to test prompt
    class DummyPool:
        pass
    
    validator = AIQuizValidator(DummyPool(), "dummy-key")
    
    prompt = validator.get_validation_prompt(
        test_question,
        category="geography",
        mode="standard",
        difficulty="easy",
        age_rating="all_ages"
    )
    
    print("=== TEST VALIDATION PROMPT ===")
    print(prompt)
    print("\n=== END PROMPT ===")
    
    # Test with a tricky question
    tricky_question = {
        'question': 'Which came first: the chicken or the egg?',
        'answers': [
            {'id': 'a', 'text': 'The chicken', 'correct': True},
            {'id': 'b', 'text': 'The egg', 'correct': False},
            {'id': 'c', 'text': 'They appeared simultaneously', 'correct': False},
            {'id': 'd', 'text': 'Neither, dinosaurs came first', 'correct': False}
        ]
    }
    
    prompt2 = validator.get_validation_prompt(
        tricky_question,
        category="nature",
        mode="chaos",
        difficulty="hard",
        age_rating="all_ages"
    )
    
    print("\n\n=== CHAOS MODE EXAMPLE ===")
    print(prompt2)
    
    # Example with obvious error
    bad_question = {
        'question': 'What year did World War 2 end?',
        'answers': [
            {'id': 'a', 'text': '1918', 'correct': True},  # Wrong!
            {'id': 'b', 'text': '1945', 'correct': False},  # Should be correct
            {'id': 'c', 'text': '1950', 'correct': False},
            {'id': 'd', 'text': '1939', 'correct': False}
        ]
    }
    
    prompt3 = validator.get_validation_prompt(
        bad_question,
        category="history", 
        mode="standard",
        difficulty="medium",
        age_rating="teen"
    )
    
    print("\n\n=== INCORRECT ANSWER EXAMPLE ===")
    print(prompt3)
    
    print("\n\nTo run with real API:")
    print("1. Add to .env file: ANTHROPIC_API_KEY=your-key-here")
    print("2. Run: python ai_quiz_validator.py")


if __name__ == "__main__":
    test_validation_prompt()
#!/usr/bin/env python3
"""
Test single question validation to see Haiku's response
"""

import os
import asyncio
import anthropic
from pathlib import Path

# Load .env
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value


async def test_one_question():
    """Test validating a single question"""
    
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("No API key found!")
        return
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # Test question with obvious error
    test_prompt = """You are validating a quiz question for the JazzyPop educational game.

CONTEXT:
- Category: history
- Mode: standard (chaos mode = silly wrong answers are OK)
- Difficulty: medium
- Age Rating: teen

QUESTION: What year did World War 2 end?

ANSWERS:
A) 1918 [MARKED CORRECT]
B) 1945 
C) 1950 
D) 1939 

MARKED CORRECT: A) 1918

VALIDATION TASKS:
1. Is the marked correct answer factually accurate?
2. Are there other answers that could also be correct?
3. Is the question clear and understandable?
4. Do any answers give away the correct choice too obviously?

SPECIAL CONSIDERATIONS:
- For young children (age 6-10): Simple language and obvious answers are OK
- For chaos mode: Wrong answers can be silly/absurd, but correct must be accurate
- "Which came first" questions: Expected to have those items in the question
- Definition questions: OK to repeat the term being defined

RESPOND WITH ONLY THIS JSON:
{
    "validation_passed": true/false,
    "confidence": 0.0-1.0,
    "issues": [
        {
            "type": "factual_error|ambiguous|multiple_correct|no_correct|unclear|answer_in_question",
            "severity": "critical|high|medium|low",
            "description": "Clear explanation of the issue",
            "suggestion": "How to fix it"
        }
    ],
    "correct_answer_is": "A/B/C/D or 'none'",
    "explanation": "Brief explanation of validation decision"
}"""

    print("Sending to Haiku...")
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            temperature=0,
            messages=[{"role": "user", "content": test_prompt}]
        )
        
        print("\n=== HAIKU'S RESPONSE ===")
        print(response.content[0].text)
        print("=== END RESPONSE ===\n")
        
        # Try to parse
        result_text = response.content[0].text.strip()
        if '{' in result_text and '}' in result_text:
            json_start = result_text.index('{')
            json_end = result_text.rindex('}') + 1
            json_str = result_text[json_start:json_end]
            print("\nExtracted JSON:")
            print(json_str)
            
            # Try to parse it
            import json
            try:
                parsed = json.loads(json_str)
                print("\nParsed successfully!")
                print(f"Validation passed: {parsed.get('validation_passed')}")
                print(f"Issues found: {len(parsed.get('issues', []))}")
            except json.JSONDecodeError as e:
                print(f"\nJSON parse error: {e}")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_one_question())
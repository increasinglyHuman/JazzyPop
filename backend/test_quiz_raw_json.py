"""
Test script to capture raw JSON from Quiz Generator v3
"""
import asyncio
import json
from quiz_set_generator_v3 import QuizSetGeneratorV3

async def test_raw_json():
    generator = QuizSetGeneratorV3()
    
    print("Testing Raw JSON Output from Quiz Generator v3.0")
    print("=" * 50)
    
    # Test a chaos mode question
    category = "cartoon_characters"
    mode = "chaos"
    difficulty = generator.get_category_difficulty(category)
    
    print(f"\nGenerating {category} question in {mode} mode (difficulty: {difficulty})")
    print("-" * 50)
    
    # Generate a single question
    question = await generator.generate_quiz_question(category, 1, difficulty, mode)
    
    if question:
        # Pretty print the raw JSON
        print("\nRAW JSON RESPONSE:")
        print(json.dumps(question, indent=2))
        
        # Also save to file for easier viewing
        with open('sample_quiz_question_raw.json', 'w') as f:
            json.dump(question, f, indent=2)
        print("\n(Also saved to sample_quiz_question_raw.json)")
    else:
        print("Failed to generate question")
    
    # Test one more in zen mode for comparison
    print("\n" + "=" * 50)
    category2 = "simple_experiments"
    mode2 = "zen"
    difficulty2 = generator.get_category_difficulty(category2)
    
    print(f"\nGenerating {category2} question in {mode2} mode (difficulty: {difficulty2})")
    print("-" * 50)
    
    question2 = await generator.generate_quiz_question(category2, 1, difficulty2, mode2)
    
    if question2:
        print("\nRAW JSON RESPONSE:")
        print(json.dumps(question2, indent=2))
        
        with open('sample_quiz_question_zen.json', 'w') as f:
            json.dump(question2, f, indent=2)
        print("\n(Also saved to sample_quiz_question_zen.json)")

if __name__ == "__main__":
    asyncio.run(test_raw_json())
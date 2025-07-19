"""
Test script for Quiz Generator v3
"""
import asyncio
import json
from quiz_set_generator_v3 import QuizSetGeneratorV3

async def test_quiz_generation():
    generator = QuizSetGeneratorV3()
    
    print("Testing Quiz Generator v3.0")
    print("=" * 50)
    
    # Test different modes and categories
    test_cases = [
        ("cartoon_characters", "chaos"),
        ("simple_experiments", "zen"),
        ("playground_games", "speed"),
        ("weird_but_true", "poqpoq")
    ]
    
    for category, mode in test_cases:
        print(f"\nTesting {category} in {mode} mode:")
        print("-" * 30)
        
        # Test difficulty detection
        difficulty = generator.get_category_difficulty(category)
        print(f"Difficulty: {difficulty}")
        
        # Generate a single question
        question = await generator.generate_quiz_question(category, 1, difficulty, mode)
        
        if question:
            print(f"Question: {question['question']}")
            print("Answers:")
            for answer in question['answers']:
                marker = "✓" if answer['correct'] else "✗"
                print(f"  {marker} {answer['id']}: {answer['text']}")
            print(f"Explanation: {question['explanation']}")
            print(f"Tags: {question.get('tags', [])}")
            
            # Test content filter
            print(f"\nContent filter test:")
            filter_result = generator.content_filter.is_content_safe(question['question'])
            print(f"Question safe: {filter_result}")
        else:
            print("Failed to generate question (likely filtered)")
        
        await asyncio.sleep(1)  # Rate limiting

async def test_title_generation():
    generator = QuizSetGeneratorV3()
    
    print("\n\nTesting Title Generation:")
    print("=" * 50)
    
    test_cases = [
        ("dinosaurs", "chaos"),
        ("friendship_facts", "zen"),
        ("minecraft_world", "speed")
    ]
    
    for category, mode in test_cases:
        title = await generator.generate_quiz_title(category, mode)
        print(f"{category} ({mode}): {title}")
        await asyncio.sleep(0.5)

async def main():
    await test_quiz_generation()
    await test_title_generation()

if __name__ == "__main__":
    asyncio.run(main())
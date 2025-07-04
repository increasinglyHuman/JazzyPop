#!/usr/bin/env python3
"""
Generate example quizzes for all categories
"""
import asyncio
import json
from quiz_generator import QuizGenerator
from database import db
import os

async def generate_examples():
    """Generate one quiz for each category as examples"""
    print("Generating example quizzes for all categories...")
    print("-" * 60)
    
    # Temporarily set a dummy API key if not configured
    if not os.getenv('ANTHROPIC_API_KEY'):
        os.environ['ANTHROPIC_API_KEY'] = 'dummy_for_examples'
    
    generator = QuizGenerator()
    
    # Store all generated quizzes
    all_quizzes = []
    
    for i, category in enumerate(generator.categories):
        print(f"\n{i+1}. Generating {category} quiz...")
        
        # Force the category selection
        original_method = generator.generate_quiz
        async def mock_generate():
            # Temporarily override category selection
            quiz = await original_method()
            quiz['category'] = category
            return quiz
        
        generator.generate_quiz = mock_generate
        
        try:
            # Generate quiz
            quiz = await generator.generate_quiz()
            
            # Generate variations
            variations = await generator.generate_mode_variations(quiz)
            
            # Store the complete example
            example = {
                "category": category,
                "icon": generator._get_category_icon(category),
                "base_quiz": quiz,
                "variations": variations
            }
            
            all_quizzes.append(example)
            
            # Print preview
            print(f"   ✓ {quiz['question'][:60]}...")
            if 'chaos' in variations:
                print(f"   🌪️  Chaos: {variations['chaos']['question'][:60]}...")
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        # Restore original method
        generator.generate_quiz = original_method
    
    # Save all examples to file
    with open('quiz_examples.json', 'w') as f:
        json.dump(all_quizzes, f, indent=2)
    
    print(f"\n\nGenerated {len(all_quizzes)} example quizzes!")
    print("Saved to quiz_examples.json")
    
    # Print summary
    print("\n" + "=" * 60)
    print("CATEGORY SUMMARY:")
    print("=" * 60)
    for quiz in all_quizzes:
        print(f"{quiz['icon']} {quiz['category']:20} - {quiz['base_quiz']['question'][:40]}...")

if __name__ == "__main__":
    asyncio.run(generate_examples())
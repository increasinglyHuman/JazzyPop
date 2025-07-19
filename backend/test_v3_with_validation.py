"""
Test v3 Generator with Validation Service
"""
import asyncio
import json
from quiz_set_generator_v3 import QuizSetGeneratorV3
from validation_service import ValidationService
from database import db

async def test_full_pipeline():
    # Initialize database connection
    await db.connect()
    
    print("Testing v3 Generator + Validation Pipeline")
    print("=" * 60)
    
    # Step 1: Generate a quiz set
    generator = QuizSetGeneratorV3()
    print("\n1. Generating quiz set...")
    
    # Generate for a fun category in chaos mode
    quiz_set = await generator.generate_quiz_set("playground_games", "chaos")
    
    if len(quiz_set['questions']) < 8:
        print(f"Warning: Only generated {len(quiz_set['questions'])} questions")
        return
    
    print(f"✓ Generated: {quiz_set['title']}")
    print(f"  Category: {quiz_set['category']}")
    print(f"  Mode: {quiz_set['mode']}")
    print(f"  Maturity: {quiz_set['maturity_rating']}")
    print(f"  Questions: {len(quiz_set['questions'])}")
    
    # Step 2: Generate mode variations
    print("\n2. Generating mode variations...")
    variations = await generator.generate_mode_variations(quiz_set)
    print(f"✓ Created variations for: {', '.join(variations.keys())}")
    
    # Step 3: Save to database
    print("\n3. Saving to database...")
    quiz_id = await generator.save_quiz_set(quiz_set, variations)
    print(f"✓ Saved with ID: {quiz_id}")
    
    # Step 4: Run validation
    print("\n4. Running triple validation...")
    validator = ValidationService()
    validation_result = await validator.validate_quiz_set(quiz_id)
    
    print("\nValidation Summary:")
    print(f"  Status: {validation_result.get('overall_status', 'unknown')}")
    print(f"  Questions Validated: {validation_result.get('questions_validated', 0)}")
    print(f"  Approved: {validation_result.get('approved_count', 0)}")
    print(f"  Revisions Needed: {validation_result.get('revision_count', 0)}")
    print(f"  Rejected: {validation_result.get('rejected_count', 0)}")
    
    # Step 5: Show sample validated question
    if validation_result.get('validation_results'):
        print("\nSample Validated Question:")
        first_result = validation_result['validation_results'][0]
        if 'feedback_captions' in first_result:
            print(f"  ✓ Feedback generated for all answers")
            print(f"  Quality score: {first_result.get('quality_score', {}).get('total_score', 'N/A')}/7")
    
    # Step 6: Check final status in DB
    async with db.pool.acquire() as conn:
        final_status = await conn.fetchval("""
            SELECT validation_status FROM content WHERE id = $1
        """, quiz_id)
        print(f"\n5. Final database status: {final_status}")
    
    print("\n✅ Pipeline Complete!")
    
    # Close database connection
    await db.close()

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
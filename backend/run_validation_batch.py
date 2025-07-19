#!/usr/bin/env python3
"""
Run AI validation in batch mode without user input
"""

import asyncio
import os
import sys

# Add the current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def main():
    # Import the validator
    from ai_quiz_validator import AIQuizValidator
    import asyncpg
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    API_KEY = os.getenv('ANTHROPIC_API_KEY')
    
    if not API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not found")
        return
    
    # Get batch size from command line or default
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    
    print(f"Running AI validation on {batch_size} quiz sets...")
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        validator = AIQuizValidator(db_pool, API_KEY)
        report = await validator.validate_batch(limit=batch_size)
        
        # Save report
        json_file, summary_file = validator.save_report(report)
        
        # Print results
        print(f"\n=== VALIDATION COMPLETE ===")
        print(f"Questions validated: {report['total_questions_validated']}")
        print(f"Issues found: {report['total_issues_found']}")
        print(f"Error rate: {report['error_rate']:.1f}%")
        
        if report['top_issues']:
            print(f"\nFound {len(report['top_issues'])} issues!")
            for i, issue in enumerate(report['top_issues'][:5], 1):
                print(f"\n{i}. [{issue['severity']}] {issue['issue_type']}")
                print(f"   {issue['question']}")
                print(f"   {issue['description']}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
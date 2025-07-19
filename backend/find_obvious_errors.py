#!/usr/bin/env python3
"""
Find obvious quiz errors using pattern matching
No AI needed - just looks for common mistakes
"""

import asyncio
import asyncpg
import json
import os
from pathlib import Path
from datetime import datetime

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


async def find_obvious_errors(db_pool):
    """Find quizzes with obvious issues"""
    issues = []
    
    async with db_pool.acquire() as conn:
        # Get all quiz sets
        quiz_sets = await conn.fetch("""
            SELECT id, data
            FROM content
            WHERE type = 'quiz_set'
            LIMIT 1000
        """)
        
        print(f"Scanning {len(quiz_sets)} quiz sets for obvious errors...\n")
        
        for quiz_set in quiz_sets:
            data = quiz_set['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            set_id = str(quiz_set['id'])
            category = data.get('category', 'unknown')
            questions = data.get('questions', [])
            
            for q_idx, question in enumerate(questions):
                # Check 1: No correct answer marked
                correct_count = sum(1 for a in question['answers'] if a.get('correct'))
                if correct_count == 0:
                    issues.append({
                        'set_id': set_id,
                        'category': category,
                        'issue': 'No correct answer marked',
                        'question': question['question'][:100]
                    })
                
                # Check 2: Multiple correct answers
                elif correct_count > 1:
                    issues.append({
                        'set_id': set_id,
                        'category': category,
                        'issue': f'{correct_count} correct answers marked',
                        'question': question['question'][:100]
                    })
                
                # Check 3: All answers identical
                answer_texts = [a['text'].lower().strip() for a in question['answers']]
                if len(set(answer_texts)) == 1:
                    issues.append({
                        'set_id': set_id,
                        'category': category,
                        'issue': 'All answers are identical',
                        'question': question['question'][:100]
                    })
                
                # Check 4: Question ends with answer hint
                q_text = question['question'].lower()
                correct_answer = None
                for a in question['answers']:
                    if a.get('correct'):
                        correct_answer = a['text'].lower()
                        break
                
                if correct_answer and correct_answer in q_text:
                    issues.append({
                        'set_id': set_id,
                        'category': category,
                        'issue': 'Question contains the answer',
                        'question': question['question'][:100]
                    })
                
                # Check 5: Common factual errors
                if 'capitol' in q_text and 'usa' in q_text:
                    for a in question['answers']:
                        if a.get('correct') and 'new york' in a['text'].lower():
                            issues.append({
                                'set_id': set_id,
                                'category': category,
                                'issue': 'Wrong capital - US capital is Washington DC, not New York',
                                'question': question['question'][:100]
                            })
                
                # Check 6: Empty or very short answers
                for a in question['answers']:
                    if len(a['text'].strip()) < 2:
                        issues.append({
                            'set_id': set_id,
                            'category': category,
                            'issue': f'Answer too short: "{a["text"]}"',
                            'question': question['question'][:100]
                        })
                        break
    
    return issues


async def main():
    DATABASE_URL = os.getenv('DATABASE_URL')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        issues = await find_obvious_errors(db_pool)
        
        print(f"\n=== FOUND {len(issues)} OBVIOUS ERRORS ===\n")
        
        # Group by issue type
        by_type = {}
        for issue in issues:
            issue_type = issue['issue']
            if issue_type not in by_type:
                by_type[issue_type] = []
            by_type[issue_type].append(issue)
        
        # Show summary
        print("Summary by issue type:")
        for issue_type, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
            print(f"  {issue_type}: {len(items)} cases")
        
        # Show examples
        print("\nExample issues:")
        for issue in issues[:20]:
            print(f"\n[{issue['category']}] {issue['issue']}")
            print(f"Question: {issue['question']}...")
            print(f"Set ID: {issue['set_id']}")
        
        # Save full report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"obvious_errors_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump({
                'scan_time': datetime.now().isoformat(),
                'total_issues': len(issues),
                'by_type': {k: len(v) for k, v in by_type.items()},
                'issues': issues
            }, f, indent=2)
        
        print(f"\nFull report saved to: {filename}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
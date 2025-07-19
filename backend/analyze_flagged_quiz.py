#!/usr/bin/env python3
"""
Analyze the flagged shark question quiz set
"""

import asyncio
import asyncpg
import json
import os
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


async def find_shark_quiz():
    """Find and analyze the shark misconception quiz"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Search for the shark misconception question
        query = """
        SELECT 
            c.id,
            c.data,
            c.metadata,
            c.created_at
        FROM content c
        WHERE c.type = 'quiz_set'
        AND c.data::text LIKE '%misconception about sharks%'
        LIMIT 5
        """
        
        rows = await conn.fetch(query)
        
        if not rows:
            print("Couldn't find the shark quiz set")
            return
        
        for row in rows:
            data = row['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            metadata = row['metadata']
            if isinstance(metadata, str):
                metadata = json.loads(metadata) if metadata else {}
            
            print(f"\n{'='*60}")
            print(f"Quiz Set ID: {row['id']}")
            print(f"Created: {row['created_at']}")
            print(f"Category: {data.get('category', 'N/A')}")
            print(f"Mode: {data.get('mode', 'N/A')}")
            print(f"Title: {data.get('title', 'N/A')}")
            
            # Metadata info
            print(f"\nMetadata:")
            print(f"  Generated at: {metadata.get('generated_at', 'N/A')}")
            print(f"  Generator version: {metadata.get('generator_version', 'N/A')}")
            print(f"  Maturity rating: {metadata.get('maturity_rating', 'N/A')}")
            
            # Find the shark question
            questions = data.get('questions', [])
            for i, q in enumerate(questions):
                if 'misconception about sharks' in q.get('question', '').lower():
                    print(f"\nQuestion {i+1}:")
                    print(f"Q: {q['question']}")
                    print(f"\nAnswers:")
                    for ans in q['answers']:
                        correct = "✓ CORRECT" if ans.get('correct') else "  "
                        print(f"  {ans['id'].upper()}) {ans['text']} {correct}")
                    
                    if 'explanation' in q:
                        print(f"\nExplanation: {q['explanation']}")
                    
                    # Check all questions in this set
                    print(f"\n--- All {len(questions)} questions in this set ---")
                    for j, other_q in enumerate(questions):
                        print(f"\n{j+1}. {other_q['question'][:80]}...")
                        # Find correct answer
                        for ans in other_q['answers']:
                            if ans.get('correct'):
                                print(f"   Correct: {ans['text']}")
                                break
    
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(find_shark_quiz())
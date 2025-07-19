#!/usr/bin/env python3
"""Quick check of final quiz set statistics"""

import asyncio
import asyncpg
import os
from pathlib import Path

# Load .env file
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value

async def check_stats():
    DATABASE_URL = os.getenv('DATABASE_URL')
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Count total quiz sets
    total = await conn.fetchval("""
        SELECT COUNT(*) FROM content 
        WHERE type = 'quiz_set'
    """)
    
    # Count by question count
    stats = await conn.fetch("""
        SELECT 
            jsonb_array_length(data->'questions') as q_count,
            COUNT(*) as sets
        FROM content
        WHERE type = 'quiz_set'
        GROUP BY jsonb_array_length(data->'questions')
        ORDER BY q_count
    """)
    
    print(f'Total quiz sets: {total}')
    print('\nBreakdown by question count:')
    partial_total = 0
    for row in stats:
        count = row["sets"]
        q_count = row["q_count"]
        if q_count != 10:
            print(f'  {q_count} questions: {count} sets ⚠️')
            partial_total += count
        else:
            print(f'  {q_count} questions: {count} sets ✓')
    
    if partial_total > 0:
        print(f'\nStill have {partial_total} partial sets!')
    else:
        print('\nAll sets have exactly 10 questions! 🎉')
    
    await conn.close()

asyncio.run(check_stats())
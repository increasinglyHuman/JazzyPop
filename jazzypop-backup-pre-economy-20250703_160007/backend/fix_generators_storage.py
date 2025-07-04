#!/usr/bin/env python3
"""Fix generator storage to use JSONB properly"""
import os

# For each generator, we need to use json.dumps for JSONB columns
generators = ['pun_generator.py', 'quote_generator.py', 'trivia_generator.py', 'joke_generator.py']

for gen in generators:
    if os.path.exists(gen):
        print(f"Checking {gen}...")
        with open(gen, 'r') as f:
            content = f.read()
        
        # The issue is we removed json.dumps but PostgreSQL JSONB still needs it
        # when using parameterized queries
        if 'pun["data"],' in content and 'json.dumps' not in content.split('pun["data"],')[0].split('\n')[-1]:
            print(f"  - {gen} needs json.dumps for data field")
        if 'quote["data"],' in content and 'json.dumps' not in content.split('quote["data"],')[0].split('\n')[-1]:
            print(f"  - {gen} needs json.dumps for data field")
            
print("\nThe issue: asyncpg requires JSON strings for JSONB columns in parameterized queries")
print("The fix: Keep json.dumps() when storing, handle both formats when reading")
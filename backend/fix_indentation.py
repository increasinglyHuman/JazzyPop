#!/usr/bin/env python3
"""Quick fix for indentation issues in main.py"""

import re

# Read the file
with open('/home/ubuntu/jazzypop-backend/main.py', 'r') as f:
    content = f.read()

# Fix the specific indentation issues
# Find the pattern where async with has wrong indentation
content = re.sub(
    r'(\s+async with db\.pool\.acquire\(\) as conn:\n)(\s*if user_id:)',
    r'\1        if user_id:',
    content
)

# Fix any other similar patterns for other endpoints
endpoints = ['pun', 'quote', 'joke', 'trivia']
for endpoint in endpoints:
    pattern = rf'(\s+async with db\.pool\.acquire\(\) as conn:\n)(\s*if user_id:.*?content_type="{endpoint}")'
    replacement = r'\1        if user_id:'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('/home/ubuntu/jazzypop-backend/main.py', 'w') as f:
    f.write(content)

print("Fixed indentation issues")
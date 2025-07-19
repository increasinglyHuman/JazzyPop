#!/usr/bin/env python3
"""
Patch quiz_set_generator.py to read interval from .env
"""

import re

# Read the current file
with open('/home/ubuntu/jazzypop-backend/quiz_set_generator.py', 'r') as f:
    content = f.read()

# Replace the hardcoded interval with env reading
# Find the run_continuous method definition
pattern = r'(async def run_continuous\(self, interval_minutes: int = )5(\):)'
replacement = r'\g<1>int(os.getenv("QUIZ_SET_GENERATION_INTERVAL", "300")) // 60\g<2>'

content = re.sub(pattern, replacement, content)

# Write the updated file
with open('/home/ubuntu/jazzypop-backend/quiz_set_generator.py', 'w') as f:
    f.write(content)

print("Patched quiz_set_generator.py to read QUIZ_SET_GENERATION_INTERVAL from .env")
print("Default: 300 seconds (5 minutes) if not set")
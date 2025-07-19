#!/usr/bin/env python3
"""Manually update one endpoint at a time to add user_id parameter"""

import re

# Read the file
with open("/home/ubuntu/jazzypop-backend/main.py", 'r') as f:
    content = f.read()

# Let's start with just the quote endpoint as a test
# Find the get_quote_sets function
pattern = r'(@app\.get\("/api/content/quote/sets"\)\s*async def get_quote_sets\([^)]*\)\s*->.*?):'
match = re.search(pattern, content, re.DOTALL)

if match:
    print("Found get_quote_sets function:")
    print(match.group(0))
    print("\n" + "="*50 + "\n")
    
    # Check current parameters
    func_def = match.group(0)
    if "user_id" in func_def:
        print("✅ Already has user_id parameter")
    else:
        print("❌ Missing user_id parameter")
        print("\n📝 To add it, insert before the closing ):")
        print("    user_id: Optional[UUID] = Query(default=None, description=\"User ID for deduplication\")")
else:
    print("Could not find get_quote_sets function")

# Also show how the function body starts
body_start = content.find("get_quote_sets")
if body_start != -1:
    # Find the async with
    async_pos = content.find("async with db.pool.acquire()", body_start)
    if async_pos != -1:
        print("\n📍 Function body starts at:")
        print(content[async_pos:async_pos+200])
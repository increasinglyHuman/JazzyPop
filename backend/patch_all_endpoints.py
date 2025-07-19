#!/usr/bin/env python3
"""Add user_id to all remaining content endpoints"""

import re
import shutil
from datetime import datetime

# Backup
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = f"/home/ubuntu/jazzypop-backend/main.py.backup_{timestamp}"
shutil.copy2("/home/ubuntu/jazzypop-backend/main.py", backup_path)
print(f"✅ Created backup: {backup_path}")

# Read file
with open("/home/ubuntu/jazzypop-backend/main.py", 'r') as f:
    content = f.read()

# Endpoints to update (quote is already done)
endpoints = [
    {
        "name": "quiz",
        "func": "get_quiz_sets",
        "param_after": "include_variations: bool = Query"
    },
    {
        "name": "pun", 
        "func": "get_pun_sets",
        "param_after": "order: str = Query"
    },
    {
        "name": "joke",
        "func": "get_joke_sets", 
        "param_after": "order: str = Query"
    },
    {
        "name": "trivia",
        "func": "get_trivia_sets",
        "param_after": "order: str = Query"
    }
]

for endpoint in endpoints:
    print(f"\n🔧 Processing {endpoint['name']} endpoint...")
    
    # Find the function
    func_pattern = rf'async def {endpoint["func"]}\([^)]*\):'
    func_match = re.search(func_pattern, content, re.DOTALL)
    
    if not func_match:
        print(f"❌ Could not find {endpoint['func']}")
        continue
    
    # Check if already has user_id
    if "user_id" in func_match.group(0):
        print(f"⏭️  {endpoint['func']} already has user_id")
        continue
    
    # Find where to insert user_id parameter
    param_pattern = rf'({endpoint["param_after"]}[^,\n]*)'
    param_match = re.search(param_pattern, content[func_match.start():func_match.end()])
    
    if param_match:
        # Add user_id parameter
        old_text = param_match.group(0)
        new_text = old_text + ',\n    user_id: Optional[UUID] = Query(default=None, description="User ID for deduplication")'
        
        content = content[:func_match.start()] + \
                  content[func_match.start():func_match.end()].replace(old_text, new_text) + \
                  content[func_match.end():]
        print(f"✅ Added user_id parameter to {endpoint['func']}")
    
    # Now add deduplication logic
    # Find the async with after this function
    func_start = content.find(f"async def {endpoint['func']}")
    async_pattern = r'async with db\.pool\.acquire\(\) as conn:'
    async_match = re.search(async_pattern, content[func_start:func_start+1000])
    
    if async_match:
        async_pos = func_start + async_match.start()
        
        # Check if deduplication already exists
        check_area = content[async_pos:async_pos+200]
        if "rb_dedup" in check_area:
            print(f"⏭️  {endpoint['func']} already has deduplication logic")
            continue
        
        # Insert deduplication logic
        dedup_code = f'''
        # Handle deduplication for logged-in users
        if user_id and hasattr(app.state, 'rb_dedup'):
            results = await app.state.rb_dedup.get_unseen_content(
                conn,
                content_type="{endpoint['name']}",
                user_id=str(user_id),
                count=count
            )
            
            # Mark as seen
            for item in results:
                await app.state.rb_dedup.mark_content_seen(
                    conn, str(user_id), "{endpoint['name']}", item['id']
                )
            
            return results
        
        # Original logic for anonymous users (continues below)
'''
        
        # Find the end of the line
        line_end = content.find('\n', async_pos)
        
        # Insert the code
        content = content[:line_end+1] + dedup_code + content[line_end+1:]
        print(f"✅ Added deduplication logic to {endpoint['func']}")

# Write back
with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
    f.write(content)

print("\n✅ Successfully updated all endpoints!")
print("📝 All content endpoints now support deduplication for logged-in users")
#!/usr/bin/env python3
"""Add user_id parameter to content endpoints for deduplication"""

import re
from datetime import datetime
import shutil

# Backup
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = f"/home/ubuntu/jazzypop-backend/main.py.backup_{timestamp}"
shutil.copy2("/home/ubuntu/jazzypop-backend/main.py", backup_path)
print(f"✅ Created backup: {backup_path}")

# Read file
with open("/home/ubuntu/jazzypop-backend/main.py", 'r') as f:
    content = f.read()

# Endpoints to update
endpoints = [
    ("quiz", "get_quiz_sets"),
    ("pun", "get_pun_sets"),
    ("quote", "get_quote_sets"),
    ("joke", "get_joke_sets"),
    ("trivia", "get_trivia_sets")
]

modified = False

for content_type, func_name in endpoints:
    # Find the function definition
    pattern = rf'(async def {func_name}\([^)]*)'
    match = re.search(pattern, content)
    
    if not match:
        print(f"❌ Could not find {func_name}")
        continue
    
    # Check if already has user_id
    if "user_id" in match.group(1):
        print(f"⏭️  {func_name} already has user_id parameter")
        continue
    
    # Add user_id parameter
    old_def = match.group(1)
    # Find the closing parenthesis
    if old_def.endswith(','):
        new_def = old_def + f'\n    user_id: Optional[UUID] = Query(default=None, description="User ID for deduplication")'
    else:
        new_def = old_def + f',\n    user_id: Optional[UUID] = Query(default=None, description="User ID for deduplication")'
    
    content = content.replace(old_def, new_def)
    print(f"✅ Added user_id parameter to {func_name}")
    
    # Now add deduplication logic at the beginning of the function
    # Find the function body
    func_start = content.find(new_def)
    # Find the first async with db.pool.acquire() after this function
    async_with_pattern = r'async with db\.pool\.acquire\(\) as conn:'
    async_with_pos = content.find('async with db.pool.acquire() as conn:', func_start)
    
    if async_with_pos == -1:
        print(f"❌ Could not find async with in {func_name}")
        continue
    
    # Check if deduplication logic already exists
    check_area = content[async_with_pos:async_with_pos+200]
    if "rb_dedup" in check_area:
        print(f"⏭️  {func_name} already has deduplication logic")
        continue
    
    # Insert deduplication logic
    indent = "        "
    dedup_code = f'''
{indent}# Handle deduplication for logged-in users
{indent}if user_id and hasattr(app.state, 'rb_dedup'):
{indent}    results = await app.state.rb_dedup.get_unseen_content(
{indent}        conn,
{indent}        content_type="{content_type}",
{indent}        user_id=str(user_id),
{indent}        count=count
{indent}    )
{indent}    
{indent}    # Mark as seen
{indent}    for item in results:
{indent}        await app.state.rb_dedup.mark_content_seen(
{indent}            conn, str(user_id), "{content_type}", item['id']
{indent}        )
{indent}    
{indent}    return results
{indent}
{indent}# Original logic for anonymous users
'''
    
    # Find the line after async with
    line_end = content.find('\n', async_with_pos)
    
    # Insert the deduplication code
    content = content[:line_end+1] + dedup_code + content[line_end+1:]
    print(f"✅ Added deduplication logic to {func_name}")
    modified = True

if modified:
    # Write back
    with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
        f.write(content)
    print("\n✅ Successfully updated all content endpoints!")
    print("📝 Next steps:")
    print("1. Restart the API: sudo systemctl restart jazzypop-api")
    print("2. Test with: curl 'https://p0qp0q.com/api/content/quote/sets?user_id=<uuid>'")
else:
    print("\n⚠️  No modifications were needed")
#!/usr/bin/env python3
"""Line-based patch for remaining endpoints"""

import shutil
from datetime import datetime

# Backup
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = f"/home/ubuntu/jazzypop-backend/main.py.backup_{timestamp}"
shutil.copy2("/home/ubuntu/jazzypop-backend/main.py", backup_path)
print(f"✅ Created backup: {backup_path}")

# Read file
with open("/home/ubuntu/jazzypop-backend/main.py", 'r') as f:
    lines = f.readlines()

# Process each endpoint
endpoints = [
    {"name": "quiz", "func_line": 453, "param_search": "include_variations: bool = Query"},
    {"name": "pun", "func_line": 576, "param_search": "order: str = Query"},
    {"name": "joke", "func_line": 689, "param_search": "order: str = Query"},
    {"name": "trivia", "func_line": 736, "param_search": "order: str = Query"}
]

for endpoint in endpoints:
    print(f"\n🔧 Processing {endpoint['name']} endpoint...")
    
    # Check if already has user_id (search within ~10 lines of function def)
    has_user_id = False
    for i in range(endpoint['func_line']-1, min(endpoint['func_line']+10, len(lines))):
        if "user_id" in lines[i]:
            has_user_id = True
            break
    
    if has_user_id:
        print(f"⏭️  {endpoint['name']} already has user_id")
        continue
    
    # Find the parameter line to add after
    for i in range(endpoint['func_line']-1, min(endpoint['func_line']+10, len(lines))):
        if endpoint['param_search'] in lines[i]:
            # Add comma if needed
            if not lines[i].rstrip().endswith(','):
                lines[i] = lines[i].rstrip() + ',\n'
            # Insert user_id parameter
            lines.insert(i+1, '    user_id: Optional[UUID] = Query(default=None, description="User ID for deduplication")\n')
            print(f"✅ Added user_id parameter to {endpoint['name']} endpoint")
            
            # Now find async with and add deduplication logic
            for j in range(i+1, min(i+20, len(lines))):
                if "async with db.pool.acquire() as conn:" in lines[j]:
                    # Check if already has deduplication
                    if j+5 < len(lines) and "rb_dedup" in lines[j+5]:
                        print(f"⏭️  {endpoint['name']} already has deduplication")
                    else:
                        dedup_logic = f'''        # Handle deduplication for logged-in users
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
                        lines.insert(j+1, dedup_logic)
                        print(f"✅ Added deduplication logic to {endpoint['name']} endpoint")
                    break
            break

# Write back
with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
    f.writelines(lines)

print("\n✅ Successfully processed all endpoints!")
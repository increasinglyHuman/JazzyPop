#!/usr/bin/env python3
"""Add user_id to quote endpoint only"""

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

# Find and update the quote endpoint (around line 623)
for i in range(620, 630):
    if i < len(lines) and "async def get_quote_sets(" in lines[i]:
        print(f"Found get_quote_sets at line {i+1}")
        
        # Add user_id parameter after the order parameter
        # Line should be around 625
        for j in range(i+1, i+5):
            if "order: str = Query" in lines[j]:
                # Add comma at end of this line if not present
                if not lines[j].rstrip().endswith(','):
                    lines[j] = lines[j].rstrip() + ',\n'
                # Insert user_id parameter
                lines.insert(j+1, '    user_id: Optional[UUID] = Query(default=None, description="User ID for deduplication")\n')
                print(f"✅ Added user_id parameter after line {j+1}")
                break
        break

# Now add the deduplication logic
# Find "async with db.pool.acquire() as conn:" after get_quote_sets
for i in range(625, 650):
    if i < len(lines) and "async with db.pool.acquire() as conn:" in lines[i]:
        print(f"Found async with at line {i+1}")
        
        # Insert deduplication logic after this line
        dedup_logic = '''        # Handle deduplication for logged-in users
        if user_id and hasattr(app.state, 'rb_dedup'):
            results = await app.state.rb_dedup.get_unseen_content(
                conn,
                content_type="quote",
                user_id=str(user_id),
                count=count
            )
            
            # Mark as seen
            for item in results:
                await app.state.rb_dedup.mark_content_seen(
                    conn, str(user_id), "quote", item['id']
                )
            
            return results
        
        # Original logic for anonymous users (continues below)
'''
        lines.insert(i+1, dedup_logic)
        print(f"✅ Added deduplication logic after line {i+1}")
        break

# Write back
with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
    f.writelines(lines)

print("\n✅ Successfully updated quote endpoint!")
print("📝 Next: Test the endpoint and then update other endpoints")
#!/usr/bin/env python3
"""Add set-based completion tracking"""

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

# Find where to add the new endpoint (after the existing completion endpoints)
completion_section = content.find("# Content Completion Tracking (Roaring Bitmaps)")
if completion_section == -1:
    print("❌ Could not find completion section")
    exit(1)

# Find the end of the completion endpoints section
section_end = content.find("@app.get", completion_section + 1000)
if section_end == -1:
    section_end = len(content)

# Add new set completion endpoint
set_completion_endpoint = '''
@app.post("/api/content/{content_type}/sets/complete",
    tags=["Content"],
    summary="Mark entire content set as completed",
    description="Mark all items in a content set as completed at once")
async def mark_content_set_completed(
    content_type: str = Path(..., regex="^(quiz|quote|joke|pun|trivia|factoid)$", description="Content type"),
    content_ids: List[str] = Body(..., description="List of content IDs in the set"),
    user_id: UUID = Query(..., description="User ID")
):
    """Mark an entire content set as completed"""
    async with db.pool.acquire() as conn:
        # Mark all items in the set as completed
        for content_id in content_ids:
            await app.state.rb_dedup.mark_content_completed(
                conn, str(user_id), content_type, content_id
            )
        
        # Get updated stats
        stats = await app.state.rb_dedup.get_user_stats(
            conn, str(user_id), content_type
        )
        
        return {
            "success": True,
            "content_type": content_type,
            "items_completed": len(content_ids),
            "stats": stats
        }
'''

# Insert the new endpoint
content = content[:section_end] + set_completion_endpoint + "\n" + content[section_end:]

# Also need to add List and Body imports if not present
if "from typing import" in content and "List" not in content[:1000]:
    content = content.replace("from typing import", "from typing import List,")
    
if "from fastapi import" in content and "Body" not in content[:1000]:
    # Find the fastapi import line
    import_start = content.find("from fastapi import")
    import_end = content.find("\n", import_start)
    import_line = content[import_start:import_end]
    if "Body" not in import_line:
        content = content[:import_end] + ", Body" + content[import_end:]

# Write back
with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
    f.write(content)

print("\n✅ Added set completion endpoint!")
print("📝 Frontend can now mark entire sets as completed with one call")
print("\nExample usage:")
print('POST /api/content/joke/sets/complete?user_id=<uuid>')
print('Body: ["id1", "id2", "id3", ...]')
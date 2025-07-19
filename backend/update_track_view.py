#!/usr/bin/env python3
"""Update existing track-view endpoint to use roaring bitmaps"""

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

# Find the track_flashcard_view function
for i, line in enumerate(lines):
    if "async def track_flashcard_view" in line:
        print(f"Found track_flashcard_view at line {i+1}")
        
        # Replace the function body
        # Find the end of the function (next function or class definition)
        func_end = len(lines)
        for j in range(i+1, len(lines)):
            if lines[j].startswith("@app.") or lines[j].startswith("class ") or lines[j].startswith("async def ") or lines[j].startswith("def "):
                func_end = j
                break
        
        # New implementation
        new_implementation = '''async def track_flashcard_view(request: Dict[str, Any]):
    """Track that a user has viewed a flashcard - now uses roaring bitmaps"""
    user_id = request.get("user_id")
    content_id = request.get("content_id")
    content_type = request.get("content_type", "").replace("_set", "")  # Remove _set suffix if present
    
    if not user_id or not content_id:
        return {"status": "skipped", "reason": "Missing user_id or content_id"}
    
    try:
        # Use roaring bitmap system if available
        if hasattr(app.state, 'rb_dedup'):
            async with db.pool.acquire() as conn:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, content_type, content_id
                )
            return {"status": "tracked", "method": "roaring_bitmap"}
        else:
            # Fallback to old method
            await db.track_content_view(user_id, content_id, content_type, {})
            return {"status": "tracked", "method": "legacy"}
    except Exception as e:
        logger.error(f"Error tracking view: {e}")
        return {"status": "error", "message": str(e)}

'''
        
        # Replace the function
        lines[i] = new_implementation
        # Remove old implementation
        del lines[i+1:func_end]
        print("✅ Updated track_flashcard_view to use roaring bitmaps")
        break

# Write back
with open("/home/ubuntu/jazzypop-backend/main.py", 'w') as f:
    f.writelines(lines)

print("\n✅ Successfully updated track-view endpoint!")
print("📝 The existing endpoint now uses roaring bitmaps when available")
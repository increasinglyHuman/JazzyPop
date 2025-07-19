#!/usr/bin/env python3
"""
Simplified roaring bitmap patch - just adds the essentials
"""

import shutil
from datetime import datetime

# Backup
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = f"main.py.backup_{timestamp}"
shutil.copy2("main.py", backup_path)
print(f"Created backup: {backup_path}")

# Read file
with open("main.py", 'r') as f:
    lines = f.readlines()

# 1. Add import after database import
for i, line in enumerate(lines):
    if "from database import db" in line:
        lines.insert(i + 1, "from roaring_bitmap_dedup import RoaringBitmapDeduplication\n")
        print("✅ Added import")
        break

# 2. Add initialization after db.connect()
for i, line in enumerate(lines):
    if "await db.connect()" in line and "lifespan" in lines[i-5:i+1]:
        # Add initialization
        indent = "    "
        init_lines = [
            f"{indent}# Initialize roaring bitmap deduplication\n",
            f"{indent}rb_dedup = RoaringBitmapDeduplication()\n",
            f"{indent}async with db.pool.acquire() as conn:\n",
            f"{indent}    await rb_dedup.initialize_user_bitmaps(conn)\n",
            f"{indent}app.state.rb_dedup = rb_dedup\n",
            f"{indent}logger.info('Roaring bitmap deduplication initialized')\n",
            "\n"
        ]
        lines[i+1:i+1] = init_lines
        print("✅ Added initialization")
        break

# 3. Add user_id parameter to content endpoints
# This is complex, so let's just add a note for manual update
print("\n⚠️  Manual steps needed:")
print("1. Add user_id parameter to content endpoints:")
print("   - get_quiz_sets")
print("   - get_pun_sets") 
print("   - get_quote_sets")
print("   - get_joke_sets")
print("   - get_trivia_sets")
print("\n2. Add at the beginning of each function:")
print("""
    if user_id:
        async with db.pool.acquire() as conn:
            results = await app.state.rb_dedup.get_unseen_content(
                conn, "<content_type>", str(user_id), count=count
            )
            for item in results:
                await app.state.rb_dedup.mark_content_seen(
                    conn, str(user_id), "<content_type>", item['id']
                )
            return results
""")

# 4. Add completion endpoints at the end
completion_code = '''

# ============================================
# Content Completion Tracking (Roaring Bitmaps)
# ============================================

from fastapi import Path

@app.post("/api/content/{content_type}/{content_id}/complete",
    tags=["Content"],
    summary="Mark content as completed",
    description="Generic endpoint to mark any content as completed")
async def mark_content_completed(
    content_type: str = Path(..., regex="^(quiz|quote|joke|pun|trivia|factoid)$", description="Content type"),
    content_id: str = Path(..., description="Content ID"),
    user_id: UUID = Query(..., description="User ID")
):
    """Mark any content as completed"""
    async with db.pool.acquire() as conn:
        await app.state.rb_dedup.mark_content_completed(
            conn, str(user_id), content_type, content_id
        )
        
        stats = await app.state.rb_dedup.get_user_stats(
            conn, str(user_id), content_type
        )
        
        return {
            "success": True,
            "content_type": content_type,
            "content_id": content_id,
            "stats": stats
        }

@app.get("/api/users/{user_id}/content-stats",
    tags=["Users"],
    summary="Get user content statistics",
    description="Shows content consumption progress")
async def get_user_content_stats(
    user_id: UUID = Path(..., description="User ID"),
    content_type: Optional[str] = Query(None, regex="^(quiz|quote|joke|pun|trivia)$", description="Filter by content type")
):
    """Get user's content consumption statistics"""
    async with db.pool.acquire() as conn:
        if content_type:
            stats = await app.state.rb_dedup.get_user_stats(
                conn, str(user_id), content_type
            )
            return {content_type: stats}
        else:
            all_stats = {}
            for ctype in ['quiz', 'quote', 'joke', 'pun', 'trivia']:
                all_stats[ctype] = await app.state.rb_dedup.get_user_stats(
                    conn, str(user_id), ctype
                )
            return {
                "user_id": str(user_id),
                "stats": all_stats,
                "summary": {
                    "total_seen": sum(s.get('seen_count', 0) for s in all_stats.values()),
                    "total_completed": sum(s.get('completed_count', 0) for s in all_stats.values())
                }
            }
'''

# Find the end of file or before if __name__
for i in range(len(lines)-1, 0, -1):
    if 'if __name__ == "__main__"' in lines[i]:
        lines.insert(i, completion_code + '\n')
        print("✅ Added completion endpoints")
        break

# Save
with open("main.py", 'w') as f:
    f.writelines(lines)

print(f"\n✅ Basic integration complete!")
print(f"📁 Backup: {backup_path}")
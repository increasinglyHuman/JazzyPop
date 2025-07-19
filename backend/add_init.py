#!/usr/bin/env python3
"""Add roaring bitmap initialization to main.py"""

# Read file
with open('/home/ubuntu/jazzypop-backend/main.py', 'r') as f:
    lines = f.readlines()

# Find line 32 (after db.connect)
init_code = """    
    # Initialize roaring bitmap deduplication
    rb_dedup = RoaringBitmapDeduplication()
    async with db.pool.acquire() as conn:
        await rb_dedup.initialize_user_bitmaps(conn)
    app.state.rb_dedup = rb_dedup
    logger.info("Roaring bitmap deduplication initialized")
"""

# Insert after line 32
lines.insert(32, init_code)

# Write back
with open('/home/ubuntu/jazzypop-backend/main.py', 'w') as f:
    f.writelines(lines)

print("Added initialization code")
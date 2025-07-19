#!/usr/bin/env python3
"""Add roaring bitmap initialization to main.py lifespan function"""

import sys

# Read the file
with open('/home/ubuntu/jazzypop-backend/main.py', 'r') as f:
    content = f.read()

# Find the db.connect() line
connect_pos = content.find('await db.connect()')
if connect_pos == -1:
    print("ERROR: Could not find 'await db.connect()'")
    sys.exit(1)

# Find the end of that line
line_end = content.find('\n', connect_pos)

# Insert the initialization code after db.connect()
init_code = """
    # Initialize roaring bitmap deduplication
    rb_dedup = RoaringBitmapDeduplication()
    async with db.pool.acquire() as conn:
        await rb_dedup.initialize_user_bitmaps(conn)
    app.state.rb_dedup = rb_dedup
    logger.info("Roaring bitmap deduplication initialized")"""

# Insert the code
new_content = content[:line_end] + init_code + content[line_end:]

# Write back
with open('/home/ubuntu/jazzypop-backend/main.py', 'w') as f:
    f.write(new_content)

print("✅ Added roaring bitmap initialization to lifespan function")
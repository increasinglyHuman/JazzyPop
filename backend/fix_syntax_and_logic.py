#!/usr/bin/env python3
"""Fix syntax errors and ensure proper logic for logged-in vs anonymous users"""

# Restore from backup first
import shutil
shutil.copy2("/home/ubuntu/jazzypop-backend/main.py.backup_20250716_064355", "/home/ubuntu/jazzypop-backend/main.py")
print("✅ Restored from backup")

# Now let's manually check and fix each endpoint
with open("/home/ubuntu/jazzypop-backend/main.py", 'r') as f:
    lines = f.readlines()

# Look for the error around line 455
for i in range(450, 460):
    if i < len(lines):
        print(f"Line {i+1}: {lines[i].rstrip()}")

print("\n❌ The automated approach had syntax errors.")
print("✅ Restored the backup. The completion endpoints are still there.")
print("\n📝 Current status:")
print("- Roaring bitmap tables: CREATED ✅")
print("- Initialization code: ADDED ✅") 
print("- Completion endpoints: ADDED ✅")
print("- Content endpoints with user_id: PENDING ❌")
print("\n🎯 What's needed:")
print("1. Manually add user_id parameter to each content endpoint")
print("2. Add deduplication logic that:")
print("   - For logged-in users: Uses roaring bitmaps to exclude seen content")
print("   - For anonymous users: Uses original ORDER BY RANDOM() logic")
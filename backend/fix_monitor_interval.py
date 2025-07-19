#!/usr/bin/env python3
"""
Fix system_monitor.py to report every hour instead of every 8 hours
"""

# Read the current file
with open('/home/ubuntu/jazzypop-backend/system_monitor.py', 'r') as f:
    content = f.read()

# Replace 480 checks (8 hours) with 60 checks (1 hour)
content = content.replace(
    "# Send content report every 480 checks (8 hours)",
    "# Send content report every 60 checks (1 hour)"
)
content = content.replace(
    "if check_count % 480 == 0:",
    "if check_count % 60 == 0:"
)

# Write the updated file
with open('/home/ubuntu/jazzypop-backend/system_monitor.py', 'w') as f:
    f.write(content)

print("Updated system_monitor.py to send reports every hour (60 checks)")
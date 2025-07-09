#!/usr/bin/env python3
"""
Patch main.py to add the feedback endpoint
"""

# Read main.py
with open('main.py', 'r') as f:
    lines = f.readlines()

# Find where to insert - after the imports
import_line = -1
for i, line in enumerate(lines):
    if 'from database import db' in line:
        import_line = i
        break

if import_line > -1:
    # Add import for feedback API
    lines.insert(import_line + 1, 'from quiz_feedback_api import get_quiz_feedback\n')

# Find the end of the file or a good place to add the endpoint
# Let's add it before the last few lines (usually the app runner)
insert_pos = len(lines) - 5

# Add the endpoint registration
lines.insert(insert_pos, '\n# Register quiz feedback endpoint\n')
lines.insert(insert_pos + 1, 'get_quiz_feedback(app, db)\n')

# Write back
with open('main.py', 'w') as f:
    f.writelines(lines)

print("Successfully patched main.py with feedback endpoint")
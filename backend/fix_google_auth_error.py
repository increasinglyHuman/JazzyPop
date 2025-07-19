#!/usr/bin/env python3
"""
Fix the .get() error in Google auth endpoint
"""

# Quick fix - replace the line that's causing the error
fix_content = """
                # Update google_id if missing
                if has_google_id and existing_user and 'google_id' in existing_user and not existing_user['google_id']:
                    await conn.execute(\"\"\"
                        UPDATE users SET google_id = $1 WHERE id = $2
                    \"\"\", auth_request.google_id, existing_user['id'])
"""

print("Fix for the Google auth error:")
print("Replace line ~882 in main.py that has:")
print("    if has_google_id and not existing_user.get('google_id'):")
print("With:")
print("    if has_google_id and existing_user and 'google_id' in existing_user and not existing_user['google_id']:")
print("\nThis handles the asyncpg Row object properly.")
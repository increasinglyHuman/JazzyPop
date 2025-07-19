#!/usr/bin/env python3
"""
Add age verification check to Google OAuth endpoint
This ensures Google sign-in users must verify their age too (COPPA compliance)
"""

import re

def add_google_auth_age_check():
    """Add age verification check to Google auth endpoint"""
    
    # Read the current main.py
    with open('main.py', 'r') as f:
        content = f.read()
    
    # Find the Google auth endpoint
    google_auth_pattern = r'(@app\.post\("/api/auth/google".*?)(async def google_auth\(auth_request: GoogleAuthRequest\):.*?)(return {.*?"avatar_id": avatar_id.*?})'
    
    # Replace the return statement to include age check
    replacement = r'''\1\2            # Check if user has birthdate (for COPPA compliance)
            has_birthdate = False
            if existing_user:
                birthdate_check = await conn.fetchval("""
                    SELECT birthdate IS NOT NULL FROM users WHERE id = $1
                """, user_id)
                has_birthdate = birthdate_check or False
            
            return {
                "user_id": str(user_id),
                "display_name": display_name,
                "avatar_id": avatar_id,
                "is_new_user": is_new_user,
                "migrated_data": migrated_data,
                "needs_age_verification": not has_birthdate  # Flag for frontend
            }'''
    
    # Apply the replacement
    new_content = re.sub(google_auth_pattern, replacement, content, flags=re.DOTALL)
    
    # Also update the profile PATCH endpoint to handle birthdate
    profile_pattern = r'(if \'display_name\' in updates:.*?values\.append\(updates\[\'display_name\'\]\))'
    
    profile_replacement = r'''\1
            
        if 'birthdate' in updates:
            # Validate birthdate for COPPA compliance (13+ years)
            from datetime import datetime, date
            try:
                birthdate = datetime.strptime(updates['birthdate'], '%Y-%m-%d').date()
                today = date.today()
                age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
                
                if age < 13:
                    raise HTTPException(status_code=400, detail="User must be 13 or older")
                    
                update_fields.append(f"birthdate = ${len(values) + 2}")
                values.append(birthdate)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid birthdate format")'''
    
    # Apply the profile update replacement
    if 'if \'display_name\' in updates:' in new_content:
        new_content = re.sub(profile_pattern, profile_replacement, new_content, flags=re.DOTALL)
    else:
        print("Warning: Could not find profile update pattern")
    
    # Write the updated content
    with open('main.py', 'w') as f:
        f.write(new_content)
        
    print("✅ Successfully added Google auth age verification check")
    print("✅ Successfully added birthdate handling to profile update endpoint")
    
    # Also check if birthdate column is returned in the profile query
    if 'birthdate' not in new_content.split('RETURNING')[1].split('\n')[0]:
        print("⚠️  Note: You may need to add 'birthdate' to the RETURNING clause in the profile update query")

if __name__ == "__main__":
    add_google_auth_age_check()
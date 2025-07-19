#!/usr/bin/env python3
"""
Fix Google OAuth to properly handle google_id and add logout endpoint
"""

import sys
import re

def fix_google_auth(content):
    """Fix the Google OAuth endpoint to properly use google_id"""
    
    # Find the google auth endpoint
    pattern = r'(async def google_auth.*?)(# First try by email.*?)(SELECT id, display_name, avatar_id.*?FROM users.*?WHERE email = \$1)'
    
    replacement = r'\1# First check if google_id column exists and try by google_id first\n            has_google_id = await conn.fetchval("""\n                SELECT EXISTS (\n                    SELECT 1 FROM information_schema.columns \n                    WHERE table_name = \'users\' \n                    AND column_name = \'google_id\'\n                )\n            """)\n            \n            if has_google_id:\n                # Try by google_id first\n                existing_user = await conn.fetchrow("""\n                    SELECT id, display_name, avatar_id, google_id \n                    FROM users \n                    WHERE google_id = $1 OR email = $2\n                """, auth_request.google_id, auth_request.email)\n            else:\n                # Fallback to email only\n                existing_user = await conn.fetchrow("""\n                    \3'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Update the user creation to include google_id
    pattern = r'(# Create the user.*?INSERT INTO users \(.*?)(username, email, display_name, avatar_id,.*?is_anonymous, created_at.*?\).*?VALUES.*?)(\$1, \$2, \$3, \$4, FALSE, NOW\(\).*?RETURNING id.*?""", username, auth_request\.email, auth_request\.name,.*?avatar_id\))'
    
    replacement = r'\1username, email, display_name, avatar_id, google_id,\n                        is_anonymous, created_at\n                    )\n                    VALUES ($1, $2, $3, $4, $5, FALSE, NOW())\n                    RETURNING id\n                """, username, auth_request.email, auth_request.name, \n                    avatar_id, auth_request.google_id if has_google_id else None)'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Add update for existing users without google_id
    pattern = r'(if existing_user:.*?# User exists - return their info.*?user_id = existing_user\[\'id\'\])'
    
    replacement = r'\1\n                \n                # Update google_id if missing\n                if has_google_id and existing_user and not existing_user.get(\'google_id\'):\n                    await conn.execute("""\n                        UPDATE users SET google_id = $1 WHERE id = $2\n                    """, auth_request.google_id, existing_user[\'id\'])'
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    return content

def add_logout_endpoint(content):
    """Add logout endpoint after the login endpoint"""
    
    # Find a good place to insert - after the login endpoint
    pattern = r'(async def login.*?return AuthResponse.*?\).*?\n\n\n)'
    
    logout_code = '''@app.post("/api/auth/logout",
    tags=["Authentication"],
    summary="Logout user",
    description="Clear user session and invalidate auth tokens")
async def logout(
    user_id: Optional[UUID] = Query(None, description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID")
):
    """Handle user logout"""
    try:
        if user_id:
            async with db.pool.acquire() as conn:
                # Clear any server-side session data
                await conn.execute("""
                    UPDATE sessions 
                    SET expires_at = NOW(), 
                        data = jsonb_set(data, '{logged_out}', 'true'::jsonb)
                    WHERE user_id = $1 OR id = $2
                """, user_id, session_id)
                
                # Log the logout event
                logger.info(f"User {user_id} logged out")
        
        return {
            "status": "success",
            "message": "Logged out successfully",
            "redirect": "/"
        }
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        # Even if error, return success to clear client state
        return {
            "status": "success",
            "message": "Logged out",
            "redirect": "/"
        }


'''
    
    content = re.sub(pattern, r'\1' + logout_code, content, flags=re.DOTALL)
    
    return content

def main():
    # Read the current main.py
    with open('main.py', 'r') as f:
        content = f.read()
    
    # Apply fixes
    content = fix_google_auth(content)
    content = add_logout_endpoint(content)
    
    # Write the fixed version
    with open('main.py.fixed', 'w') as f:
        f.write(content)
    
    print("✅ Created backend/main.py.fixed with:")
    print("  - Google OAuth fixed to use google_id properly")
    print("  - Added logout endpoint")
    print("\nTo apply:")
    print("  1. Review the changes: diff backend/main.py backend/main.py.fixed")
    print("  2. Apply: mv backend/main.py.fixed backend/main.py")

if __name__ == "__main__":
    main()
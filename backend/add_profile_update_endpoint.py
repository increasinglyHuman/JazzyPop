#!/usr/bin/env python3
"""
Add user profile update endpoint to main.py
This adds a PATCH endpoint to update avatar_id and display_name
"""

import re

def add_profile_update_endpoint():
    """Add PATCH /api/users/{user_id}/profile endpoint"""
    
    # Read the current main.py
    with open('main.py', 'r') as f:
        content = f.read()
    
    # Find where to insert (after the existing profile POST endpoint)
    insert_after = r'(@app\.post\("/api/users/profile".*?return.*?\n    \})'
    
    # The new endpoint code
    new_endpoint = '''

# User Profile Update endpoint
@app.patch("/api/users/{user_id}/profile",
    tags=["Users"],
    summary="Update user profile",
    description="Update user's avatar and/or display name")
async def update_user_profile(user_id: str, updates: dict):
    """Update user profile fields"""
    try:
        # Validate user_id is a valid UUID
        import uuid
        try:
            uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        
        if 'avatar_id' in updates:
            update_fields.append(f"avatar_id = ${len(values) + 2}")
            values.append(updates['avatar_id'])
            
        if 'display_name' in updates:
            update_fields.append(f"display_name = ${len(values) + 2}")
            values.append(updates['display_name'])
            
        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")
            
        # Always update the updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        # Execute the update
        async with db.pool.acquire() as conn:
            query = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = $1
                RETURNING id, username, email, display_name, avatar_id
            """
            
            result = await conn.fetchrow(query, user_id, *values)
            
            if not result:
                raise HTTPException(status_code=404, detail="User not found")
                
            return {
                "id": str(result['id']),
                "username": result['username'],
                "email": result['email'],
                "display_name": result['display_name'],
                "avatar_id": result['avatar_id']
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user profile: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")
'''
    
    # Find the position and insert
    match = re.search(insert_after, content, re.DOTALL)
    if match:
        insert_pos = match.end()
        new_content = content[:insert_pos] + new_endpoint + content[insert_pos:]
        
        # Write the updated content
        with open('main.py', 'w') as f:
            f.write(new_content)
            
        print("✅ Successfully added profile update endpoint")
        return True
    else:
        print("❌ Could not find insertion point in main.py")
        return False

if __name__ == "__main__":
    add_profile_update_endpoint()
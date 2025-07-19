#!/usr/bin/env python3
"""
Update AuthResponse model to include needs_age_verification field
"""

import re

def update_auth_response():
    """Add needs_age_verification field to AuthResponse model"""
    
    # Read the current main.py
    with open('main.py', 'r') as f:
        content = f.read()
    
    # Find the AuthResponse class and add the field
    auth_response_pattern = r'(class AuthResponse\(BaseModel\):.*?avatar_id: str = Field\([^)]+\))'
    
    replacement = r'\1\n    needs_age_verification: bool = Field(False, description="Whether user needs to verify age for COPPA compliance")'
    
    # Apply the replacement
    new_content = re.sub(auth_response_pattern, replacement, content, flags=re.DOTALL)
    
    if new_content == content:
        print("❌ Failed to update AuthResponse model - pattern not found")
        return False
    
    # Write the updated content
    with open('main.py', 'w') as f:
        f.write(new_content)
        
    print("✅ Successfully added needs_age_verification field to AuthResponse model")
    return True

if __name__ == "__main__":
    update_auth_response()
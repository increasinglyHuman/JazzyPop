#!/usr/bin/env python3
"""
Manually fix Google auth to include age verification check
"""

def fix_google_auth():
    """Fix Google auth endpoint to check age verification"""
    
    # Read the current main.py
    with open('main.py', 'r') as f:
        lines = f.readlines()
    
    # Find the Google auth endpoint and fix the returns
    in_google_auth = False
    modified = False
    new_lines = []
    
    for i, line in enumerate(lines):
        # Check if we're in the Google auth function
        if 'async def google_auth(auth_request: GoogleAuthRequest):' in line:
            in_google_auth = True
        elif in_google_auth and line.strip().startswith('@app.'):
            in_google_auth = False
            
        # Look for the return AuthResponse in Google auth
        if in_google_auth and 'return AuthResponse(' in line:
            # First, add the birthdate check before the return
            indent = ' ' * 12  # Match the indentation
            
            # Add birthdate check
            new_lines.append(f'{indent}# Check if user has birthdate (for COPPA compliance)\n')
            new_lines.append(f'{indent}has_birthdate = False\n')
            new_lines.append(f'{indent}if existing_user:\n')
            new_lines.append(f'{indent}    birthdate_check = await conn.fetchval("""\n')
            new_lines.append(f'{indent}        SELECT birthdate IS NOT NULL FROM users WHERE id = $1\n')
            new_lines.append(f'{indent}    """, user_id)\n')
            new_lines.append(f'{indent}    has_birthdate = birthdate_check or False\n')
            new_lines.append(f'{indent}\n')
            
            # Now add the modified return
            new_lines.append(line)
            
            # Find the closing parenthesis and add needs_age_verification
            j = i + 1
            while j < len(lines) and ')' not in lines[j]:
                new_lines.append(lines[j])
                j += 1
            
            # Add the needs_age_verification field before the closing
            if j < len(lines) and ')' in lines[j]:
                # Remove the closing line
                closing_line = lines[j].rstrip()
                if closing_line.endswith(')'):
                    # Add comma to previous line if needed
                    if new_lines[-1].rstrip() and not new_lines[-1].rstrip().endswith(','):
                        new_lines[-1] = new_lines[-1].rstrip() + ',\n'
                    # Add the needs_age_verification field
                    new_lines.append(f'{indent}    needs_age_verification=not has_birthdate\n')
                    new_lines.append(lines[j])
                    
                    # Skip the lines we already processed
                    for k in range(i + 1, j + 1):
                        lines[k] = None
                    
                    modified = True
        elif line is not None:
            new_lines.append(line)
    
    if modified:
        # Write the updated content
        with open('main.py', 'w') as f:
            f.writelines(new_lines)
        print("✅ Successfully added age verification to Google auth endpoint")
    else:
        print("❌ Could not find Google auth return statement to modify")
    
    return modified

if __name__ == "__main__":
    fix_google_auth()
#!/usr/bin/env python3
"""
Make all content always available by updating database queries and main.py
"""

# First, let's update main.py to have better fallback messages
print("Updating main.py fallback messages...")

with open('main.py', 'r') as f:
    main_content = f.read()

# Update the fallback quiz message
main_content = main_content.replace(
    '"Quiz System Starting Up..."',
    '"Browse Our Quiz Collection!"'
)
main_content = main_content.replace(
    '"New quizzes coming soon!"',
    '"Over 2,600 quiz sets available! Pick your category."'
)

with open('main.py', 'w') as f:
    f.write(main_content)
print("✓ Updated main.py fallback messages")

# Now let's check if database.py needs updates
print("\nChecking database.py for content filters...")

with open('database.py', 'r') as f:
    db_content = f.read()

# Check for is_active filters
if "is_active = true" in db_content:
    print("Found is_active filters in database.py")
    
    # Read the file line by line for more precise editing
    with open('database.py', 'r') as f:
        lines = f.readlines()
    
    # Track changes
    changes = []
    
    for i, line in enumerate(lines):
        # Remove is_active = true conditions
        if "AND is_active = true" in line:
            lines[i] = line.replace("AND is_active = true", "-- All content is available")
            changes.append(f"Line {i+1}: Removed is_active filter")
        elif "WHERE is_active = true" in line:
            lines[i] = line.replace("WHERE is_active = true", "WHERE true -- All content is available")
            changes.append(f"Line {i+1}: Removed is_active filter")
            
        # Remove expires_at conditions
        if "expires_at" in line and ">" in line and "NOW()" in line:
            if "AND" in line:
                lines[i] = line.replace(line.strip(), "-- Expiry check removed\n")
            else:
                lines[i] = line.replace(line.strip(), "WHERE true -- Expiry check removed\n")
            changes.append(f"Line {i+1}: Removed expires_at check")
    
    if changes:
        # Write updated database.py
        with open('database.py', 'w') as f:
            f.writelines(lines)
        print(f"✓ Updated database.py with {len(changes)} changes:")
        for change in changes:
            print(f"  - {change}")
    else:
        print("✓ No is_active filters found in database.py")
else:
    print("✓ No is_active filters found in database.py")

print("\n✅ Content is now always available!")
print("\nNext steps:")
print("1. Deploy to remote server")
print("2. Restart the API service")
print("3. Clear Redis cache to see changes immediately")
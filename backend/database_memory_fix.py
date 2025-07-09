"""
Emergency fix for database connection pool to reduce memory usage
Updates the pool size from 20 to 5 for t2.micro instance
"""
import os

# Read the current database.py
db_file = "/home/ubuntu/jazzypop-backend/database.py"
with open(db_file, 'r') as f:
    content = f.read()

# Replace the pool size
original = "max_size=20,"
replacement = """max_size=5,  # Reduced for t2.micro
            min_size=1,
            max_inactive_connection_lifetime=300,  # 5 minutes"""

if original in content:
    content = content.replace(original, replacement)
    
    # Backup original
    backup_file = "/home/ubuntu/jazzypop-backend/database.py.backup"
    with open(backup_file, 'w') as f:
        f.write(content)
    
    # Write updated file
    with open(db_file, 'w') as f:
        f.write(content)
    
    print("✅ Database pool settings updated!")
    print("   max_size: 20 → 5")
    print("   Added min_size: 1")
    print("   Added max_inactive_connection_lifetime: 300")
    print("\nRestart the backend to apply changes:")
    print("   sudo systemctl restart jazzypop-backend")
else:
    print("❌ Could not find max_size=20 in database.py")
    print("   Manual update required")
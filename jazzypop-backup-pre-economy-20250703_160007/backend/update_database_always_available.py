#!/usr/bin/env python3
"""
Update database.py to always return content instead of showing "no content available"
"""
import re

# Read the current database.py
with open('database.py', 'r') as f:
    content = f.read()

# Define replacements
replacements = [
    # Remove is_active = true from quiz queries
    (
        r"WHERE c\.type = 'quiz'\s*\n\s*AND c\.is_active = true\s*\n\s*AND \(c\.expires_at IS NULL OR c\.expires_at > NOW\(\)\)",
        """WHERE c.type IN ('quiz', 'quiz_set')
                -- Prefer newer content but don't exclude older content"""
    ),
    
    # Remove is_active = true from flashcard queries
    (
        r"WHERE type = ANY\(\$1::text\[\]\)\s*\n\s*AND is_active = true",
        """WHERE type = ANY($1::text[])
                    -- All content is available"""
    ),
    
    # Remove is_active = true from single type flashcard queries
    (
        r"WHERE type = \$1\s*\n\s*AND is_active = true",
        """WHERE type = $1
                    -- All content is available"""
    ),
    
    # Update the fallback message
    (
        r'"Quiz System Starting Up\.\.\."',
        '"Thousands of Quizzes Available!"'
    ),
    
    # Update the description
    (
        r'"New quizzes coming soon!"',
        '"Select from our vast collection!"'
    ),
]

# Apply replacements
modified_content = content
for pattern, replacement in replacements:
    modified_content = re.sub(pattern, replacement, modified_content, flags=re.MULTILINE)

# Add helper method if not exists
if "_get_random_from_all_content" not in modified_content:
    # Find a good place to insert (after disconnect method)
    insert_pos = modified_content.find("async def disconnect(self):")
    if insert_pos != -1:
        # Find the end of disconnect method
        next_method = modified_content.find("\n    async def", insert_pos + 1)
        if next_method != -1:
            helper_method = '''
    async def _get_random_from_all_content(self, content_types: List[str], limit: int) -> List[Dict[str, Any]]:
        """Get random content from all available content (no date/active filters)"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, type, data, metadata, created_at
                FROM content
                WHERE type = ANY($1::text[])
                ORDER BY 
                    -- Prefer newer content
                    CASE 
                        WHEN created_at > NOW() - INTERVAL '7 days' THEN 0
                        WHEN created_at > NOW() - INTERVAL '30 days' THEN 1
                        ELSE 2
                    END,
                    RANDOM()
                LIMIT $2
            """, content_types, limit)
            
            return rows
'''
            modified_content = modified_content[:next_method] + helper_method + modified_content[next_method:]

# Write the updated file
with open('database_updated.py', 'w') as f:
    f.write(modified_content)

print("Created database_updated.py with the following changes:")
print("1. Removed is_active = true filters")
print("2. Removed expires_at checks")
print("3. Updated fallback messages")
print("4. Content will always be available")
print("\nTo apply changes:")
print("1. Review database_updated.py")
print("2. Backup current: cp database.py database_backup.py")
print("3. Apply update: mv database_updated.py database.py")
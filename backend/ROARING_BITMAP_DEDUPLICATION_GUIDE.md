# Roaring Bitmap Deduplication System Guide

## Overview
JazzyPop uses roaring bitmaps for ultra-efficient content deduplication. This prevents users from seeing the same content repeatedly while using minimal storage and providing microsecond lookup times.

## System Architecture

### How It Works
1. Each piece of content (quiz, quote, joke, etc.) has a UUID
2. UUIDs are mapped to integers in the `content_id_mapping` table
3. User's seen/completed content is stored as compressed bitmaps
4. Queries use bitmap operations to exclude seen content

### Performance Benefits
- **Storage**: 1000 items = ~2KB (vs 36KB for JSON arrays)
- **Lookup**: O(1) microseconds
- **Set Operations**: Union/intersection blazing fast
- **No JSON parsing**: Direct bitmap operations in PostgreSQL

## User Support

### ✅ Logged-In Users
- Full deduplication support
- Tracks both "seen" and "completed" states
- Progress persists across sessions
- Can view completion statistics

### ⚠️ Anonymous Users
- **No deduplication** - They may see repeats
- Pure random selection
- No progress tracking
- Consider session-based tracking if needed

## Content Type Support

### ✅ Currently Supported
All content types work with the same system:
- **Quotes** (`quote_set`)
- **Jokes** (`joke_set`) 
- **Puns** (`pun_set`)
- **Factoids** (`factoid_set`)
- **Quizzes** (`quiz_set`)

### Adding New Content Types

When adding a new content type (e.g., `riddle_set`), follow these steps:

1. **No database changes needed** - The system auto-adapts
2. **Update API endpoints** to use deduplication:

```python
# In your new endpoint
@app.get("/api/content/riddle/sets")
async def get_riddle_sets(
    count: int = Query(default=1),
    user_id: Optional[str] = Query(None)
):
    async with db.pool.acquire() as conn:
        riddles = await rb_dedup.get_unseen_content(
            conn, 
            content_type="riddle",  # Just use your type name
            user_id=user_id,
            count=count
        )
        return riddles
```

3. **Add completion tracking**:

```python
@app.post("/api/content/riddle/{riddle_id}/complete")
async def mark_riddle_completed(
    riddle_id: str,
    user_id: str = Query(...)
):
    async with db.pool.acquire() as conn:
        await rb_dedup.mark_content_completed(
            conn, user_id, "riddle", riddle_id
        )
```

## Database Schema

### content_id_mapping
Maps UUIDs to integers for bitmap efficiency:
```sql
- id: SERIAL (the integer used in bitmaps)
- content_uuid: UUID (references content.id)
- content_type: VARCHAR(50) (quote, joke, quiz, etc.)
- created_at: TIMESTAMP
```

### user_content_bitmaps
Stores user progress as roaring bitmaps:
```sql
- user_id: UUID
- content_type: VARCHAR(50)
- seen_bitmap: roaringbitmap (content viewed)
- completed_bitmap: roaringbitmap (content finished)
- last_updated: TIMESTAMP
```

## API Integration Examples

### Basic Usage
```python
# Get unseen quotes for a user
quotes = await rb_dedup.get_unseen_content(
    conn, "quote", user_id, count=10
)

# Mark content as completed
await rb_dedup.mark_content_completed(
    conn, user_id, "quote", quote_id
)

# Get user statistics
stats = await rb_dedup.get_user_stats(
    conn, user_id, "quote"
)
# Returns: {seen_count, completed_count, total_count, completion_percentage}
```

### Advanced Features
```python
# Compare two users (for social features)
overlap = await rb_dedup.get_content_overlap(
    conn, user1_id, user2_id, "quiz"
)

# Exclude only completed (not just seen)
fresh_content = await rb_dedup.get_unseen_content(
    conn, "joke", user_id, 
    exclude_completed_only=True  # Still shows "seen but not completed"
)
```

## Implementation Checklist for New Content

When adding a new content type:

- [ ] Content follows standard structure (id, type, data, metadata)
- [ ] Content type name ends with "_set" (e.g., "riddle_set")
- [ ] API endpoint uses `rb_dedup.get_unseen_content()`
- [ ] Completion endpoint uses `rb_dedup.mark_content_completed()`
- [ ] Frontend sends user_id with requests
- [ ] Consider when to mark as "seen" vs "completed"

## Maintenance

### Monitoring
```sql
-- Check bitmap sizes
SELECT 
    user_id,
    content_type,
    rb_cardinality(seen_bitmap) as seen,
    rb_cardinality(completed_bitmap) as completed,
    pg_column_size(seen_bitmap) as bitmap_bytes
FROM user_content_bitmaps
ORDER BY bitmap_bytes DESC;

-- Find most active users
SELECT 
    user_id,
    SUM(rb_cardinality(completed_bitmap)) as total_completed
FROM user_content_bitmaps
GROUP BY user_id
ORDER BY total_completed DESC;
```

### Cleanup (if needed)
```sql
-- Reset user's progress for a content type
UPDATE user_content_bitmaps 
SET seen_bitmap = roaringbitmap(),
    completed_bitmap = roaringbitmap()
WHERE user_id = ? AND content_type = ?;
```

## Troubleshooting

### "Content not excluding properly"
1. Check content has been mapped: `SELECT * FROM content_id_mapping WHERE content_uuid = ?`
2. Verify bitmap contains ID: `SELECT rb_contains(seen_bitmap, ?) FROM user_content_bitmaps`

### "Anonymous users complaining about repeats"
- This is expected behavior
- Consider implementing session-based tracking
- Or encourage user registration for better experience

### "New content type not working"
1. Verify content type name consistency
2. Check rb_dedup is initialized in the endpoint
3. Ensure user_id is being passed correctly

## Future Enhancements

### Session-Based Deduplication
For anonymous users, could implement:
```python
# Store last 50 seen items in session
session_seen = request.session.get(f"seen_{content_type}", [])
# Exclude these in queries
```

### Smart Recommendations
Roaring bitmaps enable fast similarity calculations:
```python
# Find users with similar taste
# Users who completed 80% of same content
```

### Content Rotation
Force fresh content by clearing old "seen" marks:
```python
# Clear seen (but not completed) older than 30 days
# Allows content to resurface
```

## License Note

pg_roaringbitmap is Apache 2.0 licensed (free, commercial use OK).
Keep the LICENSE file from: https://github.com/ChenHuajun/pg_roaringbitmap
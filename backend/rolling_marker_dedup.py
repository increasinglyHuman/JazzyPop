"""
Rolling Marker Deduplication System for JazzyPop
Lightweight approach to prevent content repetition without heavy tracking
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import json
import hashlib
from uuid import UUID

class RollingMarkerSystem:
    """
    Rolling marker approach for content deduplication
    
    How it works:
    1. Each user has a "marker position" for each content type
    2. Content is served sequentially from marker position
    3. Marker advances as content is consumed
    4. When marker reaches end, it rolls back to start
    5. Content order is shuffled periodically (daily/weekly)
    """
    
    def __init__(self):
        # Marker positions stored in user metadata or session
        # Format: {"quotes": 42, "puns": 15, "jokes": 7, "factoids": 23}
        pass
    
    async def get_next_content(
        self, 
        conn,
        content_type: str,
        user_id: Optional[str],
        session_id: Optional[str],
        count: int = 1
    ) -> List[Dict]:
        """Get next content items from current marker position"""
        
        # Get current marker position
        marker_key = f"{content_type}_marker"
        marker_pos = 0
        
        if user_id:
            # For logged-in users, store in user preferences
            result = await conn.fetchval("""
                SELECT preferences->$1 
                FROM users 
                WHERE id = $2
            """, marker_key, UUID(user_id))
            marker_pos = int(result) if result else 0
        elif session_id:
            # For anonymous, could use session storage
            # Or derive from session_id hash
            marker_pos = int(hashlib.md5(f"{session_id}:{content_type}".encode()).hexdigest(), 16) % 1000
        
        # Get total content count
        total_count = await conn.fetchval("""
            SELECT COUNT(*) 
            FROM content 
            WHERE type = $1 AND is_active = true
        """, f"{content_type}_set")
        
        if total_count == 0:
            return []
        
        # Get content using marker position with wraparound
        results = []
        for i in range(count):
            # Calculate position with wraparound
            pos = (marker_pos + i) % total_count
            
            # Fetch content at position
            # Using deterministic ordering based on created_at + id for consistency
            content = await conn.fetchrow("""
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
                    FROM content
                    WHERE type = $1 AND is_active = true
                ) numbered
                WHERE rn = $2
            """, f"{content_type}_set", pos + 1)
            
            if content:
                results.append(dict(content))
        
        # Update marker position for next time
        new_marker = (marker_pos + count) % total_count
        
        if user_id:
            # Update user preferences
            await conn.execute("""
                UPDATE users 
                SET preferences = jsonb_set(
                    COALESCE(preferences, '{}'::jsonb),
                    $1,
                    $2::jsonb
                )
                WHERE id = $3
            """, [marker_key], json.dumps(new_marker), UUID(user_id))
        
        return results


class ShuffledRollingMarker:
    """
    Enhanced version with daily shuffled order
    """
    
    @staticmethod
    def get_daily_seed(content_type: str) -> str:
        """Generate seed that changes daily"""
        today = datetime.utcnow().date()
        return f"{content_type}:{today.isoformat()}"
    
    @staticmethod
    def get_weekly_seed(content_type: str) -> str:
        """Generate seed that changes weekly"""
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        return f"{content_type}:{week_start.isoformat()}"
    
    async def get_shuffled_content_order(
        self,
        conn,
        content_type: str,
        shuffle_period: str = "daily"
    ) -> List[str]:
        """Get shuffled content IDs for current period"""
        
        # Get seed based on period
        if shuffle_period == "weekly":
            seed = self.get_weekly_seed(content_type)
        else:
            seed = self.get_daily_seed(content_type)
        
        # Get all content IDs
        rows = await conn.fetch("""
            SELECT id 
            FROM content 
            WHERE type = $1 AND is_active = true
            ORDER BY created_at, id
        """, f"{content_type}_set")
        
        content_ids = [str(row['id']) for row in rows]
        
        # Deterministic shuffle based on seed
        import random
        rng = random.Random(seed)
        shuffled_ids = content_ids.copy()
        rng.shuffle(shuffled_ids)
        
        return shuffled_ids


# Simplified implementation for main.py integration
async def get_content_with_rolling_marker(
    conn,
    content_type: str,
    user_id: Optional[str],
    session_id: Optional[str],
    count: int = 1,
    shuffle: bool = True
) -> List[Dict]:
    """
    Main function to get content using rolling marker system
    
    Benefits:
    - O(1) storage per user (just one integer per content type)
    - No heavy tracking tables
    - Natural progression through content
    - Automatic wraparound
    - Optional daily shuffle for variety
    """
    
    marker_key = f"{content_type}_marker"
    
    # Get current marker
    if user_id:
        user_data = await conn.fetchrow("""
            SELECT preferences->$1 as marker,
                   preferences->'shuffle_seed' as shuffle_seed
            FROM users 
            WHERE id = $2
        """, marker_key, UUID(user_id))
        
        marker = int(user_data['marker']) if user_data and user_data['marker'] else 0
        last_shuffle = user_data['shuffle_seed'] if user_data else None
    else:
        # For anonymous users, derive from session
        if session_id:
            marker = int(hashlib.md5(f"{session_id}:{content_type}:marker".encode()).hexdigest(), 16) % 100
        else:
            marker = 0
        last_shuffle = None
    
    # Check if we need to reshuffle (daily)
    today_seed = datetime.utcnow().date().isoformat()
    
    if shuffle and last_shuffle != today_seed:
        # Reset marker on new shuffle
        marker = 0
        
        if user_id:
            # Update shuffle seed
            await conn.execute("""
                UPDATE users 
                SET preferences = jsonb_set(
                    jsonb_set(
                        COALESCE(preferences, '{}'::jsonb),
                        '{shuffle_seed}',
                        $1::jsonb
                    ),
                    $2,
                    '0'::jsonb
                )
                WHERE id = $3
            """, today_seed, [marker_key], UUID(user_id))
    
    # Get content order (shuffled or sequential)
    if shuffle:
        # Use daily shuffled order
        query = """
            SELECT * FROM (
                SELECT *, 
                       ROW_NUMBER() OVER (
                           ORDER BY MD5(CONCAT(id::text, $1))
                       ) as rn
                FROM content
                WHERE type = $2 AND is_active = true
            ) shuffled
            WHERE rn > $3
            ORDER BY rn
            LIMIT $4
        """
        rows = await conn.fetch(query, today_seed, f"{content_type}_set", marker, count)
    else:
        # Use sequential order
        query = """
            SELECT * FROM (
                SELECT *, 
                       ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
                FROM content
                WHERE type = $1 AND is_active = true
            ) ordered
            WHERE rn > $2
            ORDER BY rn
            LIMIT $3
        """
        rows = await conn.fetch(query, f"{content_type}_set", marker, count)
    
    # Handle wraparound if not enough content
    if len(rows) < count:
        additional_needed = count - len(rows)
        
        if shuffle:
            wrap_rows = await conn.fetch("""
                SELECT * FROM (
                    SELECT *, 
                           ROW_NUMBER() OVER (
                               ORDER BY MD5(CONCAT(id::text, $1))
                           ) as rn
                    FROM content
                    WHERE type = $2 AND is_active = true
                ) shuffled
                WHERE rn <= $3
                ORDER BY rn
                LIMIT $4
            """, today_seed, f"{content_type}_set", additional_needed, additional_needed)
        else:
            wrap_rows = await conn.fetch("""
                SELECT * FROM (
                    SELECT *, 
                           ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
                    FROM content
                    WHERE type = $1 AND is_active = true
                ) ordered
                WHERE rn <= $2
                ORDER BY rn
                LIMIT $3
            """, f"{content_type}_set", additional_needed, additional_needed)
        
        rows.extend(wrap_rows)
    
    # Update marker for next time
    if rows and user_id:
        # Get the highest row number we returned
        last_rn = rows[-1]['rn'] if len(rows) < count else (marker + count)
        
        # Check if we wrapped around
        total_count = await conn.fetchval("""
            SELECT COUNT(*) FROM content 
            WHERE type = $1 AND is_active = true
        """, f"{content_type}_set")
        
        new_marker = last_rn % total_count if last_rn >= total_count else last_rn
        
        await conn.execute("""
            UPDATE users 
            SET preferences = jsonb_set(
                COALESCE(preferences, '{}'::jsonb),
                $1,
                $2::jsonb
            )
            WHERE id = $3
        """, [marker_key], json.dumps(new_marker), UUID(user_id))
    
    # Format results
    results = []
    for row in rows:
        content_dict = dict(row)
        # Remove the row number we added
        content_dict.pop('rn', None)
        results.append(content_dict)
    
    return results


# Example integration for quote challenges
async def track_quote_challenge_outcome(
    conn,
    quote_id: str,
    user_id: Optional[str],
    challenge_passed: bool,
    time_taken: Optional[float] = None
):
    """
    Track quote challenge outcomes without heavy storage
    
    Only tracks:
    - Last N challenge results (for streak calculation)
    - Total pass/fail counts
    - Current streak
    """
    
    if not user_id:
        return  # Only track for logged-in users
    
    # Update user stats
    if challenge_passed:
        await conn.execute("""
            UPDATE users 
            SET quote_challenges_passed = COALESCE(quote_challenges_passed, 0) + 1,
                quote_streak = COALESCE(quote_streak, 0) + 1,
                last_activity = NOW()
            WHERE id = $1
        """, UUID(user_id))
    else:
        await conn.execute("""
            UPDATE users 
            SET quote_challenges_failed = COALESCE(quote_challenges_failed, 0) + 1,
                quote_streak = 0,
                last_activity = NOW()
            WHERE id = $1
        """, UUID(user_id))
    
    # Store last 10 results in preferences for recent performance
    await conn.execute("""
        UPDATE users 
        SET preferences = jsonb_set(
            COALESCE(preferences, '{}'::jsonb),
            '{recent_quote_challenges}',
            (
                SELECT jsonb_agg(elem)
                FROM (
                    SELECT elem
                    FROM (
                        SELECT jsonb_array_elements(
                            COALESCE(preferences->'recent_quote_challenges', '[]'::jsonb)
                        ) as elem
                        UNION ALL
                        SELECT $2::jsonb
                    ) all_elems
                    ORDER BY (elem->>'timestamp')::timestamp DESC
                    LIMIT 10
                ) recent
            )
        )
        WHERE id = $1
    """, UUID(user_id), json.dumps({
        'quote_id': quote_id,
        'passed': challenge_passed,
        'timestamp': datetime.utcnow().isoformat(),
        'time_taken': time_taken
    }))
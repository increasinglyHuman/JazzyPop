"""
Minimal UUID Tracking for JazzyPop
The simplest, most efficient approach to content deduplication
"""

from typing import List, Set, Optional, Dict
from datetime import datetime
import json
import base64
import zlib

class MinimalUUIDTracker:
    """
    Absolute minimal approach:
    1. Track completed content UUIDs per user
    2. Use compressed storage
    3. Query excludes seen content
    """
    
    async def get_unseen_content(
        self,
        conn,
        content_type: str,
        user_id: Optional[str],
        category: Optional[str] = None,
        count: int = 1
    ) -> List[Dict]:
        """
        Get content excluding what user has already seen
        Simple and direct approach
        """
        
        # Build base query
        conditions = ["type = $1", "is_active = true"]
        params = [f"{content_type}_set"]
        param_count = 1
        
        if category:
            param_count += 1
            conditions.append(f"data->>'category' = ${param_count}")
            params.append(category)
        
        # Get user's seen content if logged in
        if user_id:
            # Get completed content IDs for this type
            param_count += 1
            seen_data = await conn.fetchval(f"""
                SELECT completed_content->${param_count}
                FROM users
                WHERE id = ${param_count + 1}
            """, content_type, UUID(user_id))
            
            if seen_data:
                seen_ids = json.loads(seen_data) if isinstance(seen_data, str) else seen_data
                if seen_ids:
                    # Add exclusion to query
                    placeholders = ','.join([f'${i+param_count+2}' for i in range(len(seen_ids))])
                    conditions.append(f"id NOT IN ({placeholders})")
                    params.extend([UUID(sid) for sid in seen_ids])
        
        # Execute query
        query = f"""
            SELECT * FROM content
            WHERE {' AND '.join(conditions)}
            ORDER BY RANDOM()
            LIMIT ${len(params) + 1}
        """
        params.append(count)
        
        rows = await conn.fetch(query, *params)
        
        # If we got less than requested, user might have seen most content
        # Could implement wraparound here if desired
        
        return [{
            "id": str(row["id"]),
            "type": row["type"],
            "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
            "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            "created_at": row["created_at"].isoformat()
        } for row in rows]
    
    async def mark_content_completed(
        self,
        conn,
        user_id: str,
        content_type: str,
        content_id: str
    ):
        """
        Mark content as completed by user
        Stores in user's completed_content JSONB field
        """
        
        # Update user's completed content
        await conn.execute("""
            UPDATE users
            SET completed_content = jsonb_set(
                COALESCE(completed_content, '{}'::jsonb),
                $1,
                COALESCE(
                    completed_content->$2,
                    '[]'::jsonb
                ) || $3::jsonb
            )
            WHERE id = $4
        """, [content_type], content_type, json.dumps([content_id]), UUID(user_id))


class CompressedSetTracker:
    """
    Store seen UUIDs as compressed bit set
    Much more space efficient for large sets
    """
    
    @staticmethod
    def compress_uuid_set(uuid_set: Set[str]) -> str:
        """Compress set of UUIDs to base64 string"""
        # Sort for better compression
        sorted_uuids = sorted(uuid_set)
        json_str = json.dumps(sorted_uuids)
        compressed = zlib.compress(json_str.encode())
        return base64.b64encode(compressed).decode('ascii')
    
    @staticmethod
    def decompress_uuid_set(compressed: str) -> Set[str]:
        """Decompress base64 string back to UUID set"""
        compressed_bytes = base64.b64decode(compressed)
        json_str = zlib.decompress(compressed_bytes).decode()
        return set(json.loads(json_str))


class HybridApproach:
    """
    Hybrid: Random selection with retry on duplicates
    Only track after N attempts to find unseen content
    """
    
    async def get_content_with_retry(
        self,
        conn,
        content_type: str,
        user_id: Optional[str],
        session_id: Optional[str],
        category: Optional[str] = None,
        count: int = 1,
        max_retries: int = 3
    ) -> List[Dict]:
        """
        Try random selection first, only check history if we get duplicates
        """
        
        collected = []
        seen_in_session = set()
        attempts = 0
        
        while len(collected) < count and attempts < max_retries:
            attempts += 1
            
            # Get random content
            conditions = ["type = $1", "is_active = true"]
            params = [f"{content_type}_set"]
            
            if category:
                conditions.append("data->>'category' = $2")
                params.append(category)
            
            # Exclude what we already collected this call
            if seen_in_session:
                placeholders = ','.join([f'${i+len(params)+1}' for i in range(len(seen_in_session))])
                conditions.append(f"id NOT IN ({placeholders})")
                params.extend(list(seen_in_session))
            
            needed = count - len(collected)
            query = f"""
                SELECT * FROM content
                WHERE {' AND '.join(conditions)}
                ORDER BY RANDOM()
                LIMIT ${len(params) + 1}
            """
            params.append(needed * 2)  # Get extra in case some are dupes
            
            rows = await conn.fetch(query, *params)
            
            # Check if user has seen these (only if we have user_id)
            if user_id and attempts > 1:  # Only check history after first attempt
                # Get user's seen content
                seen_data = await conn.fetchval("""
                    SELECT completed_content->$1
                    FROM users
                    WHERE id = $2
                """, content_type, UUID(user_id))
                
                seen_ids = set(json.loads(seen_data)) if seen_data else set()
            else:
                seen_ids = set()
            
            # Add unseen content
            for row in rows:
                content_id = str(row['id'])
                if content_id not in seen_ids and content_id not in seen_in_session:
                    collected.append({
                        "id": content_id,
                        "type": row["type"],
                        "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                        "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                        "created_at": row["created_at"].isoformat()
                    })
                    seen_in_session.add(content_id)
                    
                    if len(collected) >= count:
                        break
        
        return collected[:count]


# Simplest possible implementation for main.py
async def get_unseen_content_simple(
    conn,
    content_type: str,
    user_id: Optional[str],
    category: Optional[str] = None,
    count: int = 1
) -> List[Dict]:
    """
    Dead simple approach:
    1. If user logged in, exclude their completed content
    2. Otherwise, pure random
    
    Storage requirement: Array of UUIDs per content type per user
    """
    
    # Build query
    conditions = ["type = $1", "is_active = true"]
    params = [f"{content_type}_set"]
    
    if category:
        conditions.append("data->>'category' = $2")
        params.append(category)
    
    # If user is logged in, check their history
    if user_id:
        # Check if they have completed content for this type
        completed = await conn.fetchval("""
            SELECT preferences->'completed_content'->$1
            FROM users
            WHERE id = $2
        """, content_type, UUID(user_id))
        
        if completed:
            completed_ids = json.loads(completed) if isinstance(completed, str) else completed
            if completed_ids:
                # Exclude completed content
                placeholders = ','.join([f'${i+len(params)+1}' for i in range(len(completed_ids))])
                conditions.append(f"id::text NOT IN ({placeholders})")
                params.extend(completed_ids)
    
    # Get content
    query = f"""
        SELECT * FROM content
        WHERE {' AND '.join(conditions)}
        ORDER BY RANDOM()
        LIMIT ${len(params) + 1}
    """
    params.append(count)
    
    rows = await conn.fetch(query, *params)
    
    return [{
        "id": str(row["id"]),
        "type": row["type"],
        "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
        "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
        "created_at": row["created_at"].isoformat()
    } for row in rows]


async def mark_content_completed_simple(
    conn,
    user_id: str,
    content_type: str,
    content_id: str
):
    """
    Mark content as completed - just append to array
    """
    
    await conn.execute("""
        UPDATE users
        SET preferences = jsonb_set(
            jsonb_set(
                COALESCE(preferences, '{}'::jsonb),
                '{completed_content}',
                COALESCE(preferences->'completed_content', '{}'::jsonb)
            ),
            ARRAY['completed_content', $1],
            COALESCE(
                preferences->'completed_content'->$1,
                '[]'::jsonb
            ) || to_jsonb($2::text)
        )
        WHERE id = $3
    """, content_type, content_id, UUID(user_id))


# Storage size analysis:
"""
UUID = 36 characters
1000 pieces of content = 36KB of UUIDs
Compressed = ~10KB

Per user storage:
- 4 content types (quiz, quote, pun, joke)
- Average 500 completed items per type
- Total: ~40KB uncompressed, ~12KB compressed

For 10,000 users = 120MB compressed storage
Very reasonable for deduplication!
"""

from uuid import UUID
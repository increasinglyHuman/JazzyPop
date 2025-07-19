"""
Smart Marker Deduplication for JazzyPop
Handles categories and content types without gaps
"""

from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
import json
from uuid import UUID

class SmartMarkerSystem:
    """
    Smart marker system that handles filtering without chronology gaps
    
    Key concepts:
    1. Each content type + category combo has its own marker
    2. Markers track last served UUID, not position
    3. Content is ordered consistently (by created_at, id)
    4. When filtering, we skip to next valid item
    """
    
    @staticmethod
    def get_marker_key(content_type: str, category: Optional[str] = None) -> str:
        """Generate marker key for content type and optional category"""
        if category:
            return f"marker_{content_type}_{category}"
        return f"marker_{content_type}_all"
    
    async def get_user_markers(
        self, 
        conn, 
        user_id: Optional[str],
        session_id: Optional[str]
    ) -> Dict[str, str]:
        """Get all markers for a user"""
        if user_id:
            result = await conn.fetchval("""
                SELECT preferences->'content_markers'
                FROM users 
                WHERE id = $1
            """, UUID(user_id))
            return json.loads(result) if result else {}
        elif session_id:
            # For session-based, we could store in a lightweight session table
            # For now, return empty
            return {}
        return {}
    
    async def get_next_content_smart(
        self,
        conn,
        content_type: str,
        user_id: Optional[str],
        session_id: Optional[str],
        category: Optional[str] = None,
        count: int = 1
    ) -> Tuple[List[Dict], Optional[str]]:
        """
        Get next content after last marker, handling categories
        Returns: (content_list, new_marker_uuid)
        """
        
        # Get current markers
        markers = await self.get_user_markers(conn, user_id, session_id)
        marker_key = self.get_marker_key(content_type, category)
        last_uuid = markers.get(marker_key)
        
        # Build query
        query_conditions = [
            "type = $1",
            "is_active = true"
        ]
        params = [f"{content_type}_set"]
        param_count = 1
        
        if category:
            param_count += 1
            query_conditions.append(f"data->>'category' = ${param_count}")
            params.append(category)
        
        # If we have a marker, only get content created after it
        if last_uuid:
            # First, get the timestamp of the last served content
            last_timestamp = await conn.fetchval("""
                SELECT created_at 
                FROM content 
                WHERE id = $1
            """, UUID(last_uuid))
            
            if last_timestamp:
                param_count += 1
                query_conditions.append(f"""
                    (created_at > ${param_count} OR 
                     (created_at = ${param_count} AND id > $${param_count + 1}))
                """)
                params.extend([last_timestamp, UUID(last_uuid)])
                param_count += 1
        
        # Build and execute query
        query = f"""
            SELECT id, type, data, metadata, created_at
            FROM content
            WHERE {' AND '.join(query_conditions)}
            ORDER BY created_at, id
            LIMIT $${param_count + 1}
        """
        params.append(count)
        
        rows = await conn.fetch(query, *params)
        
        # If we didn't get enough content, wrap around to beginning
        if len(rows) < count:
            additional_needed = count - len(rows)
            
            # Get content from the beginning, excluding what we already have
            existing_ids = [row['id'] for row in rows]
            
            wrap_conditions = [
                "type = $1",
                "is_active = true"
            ]
            wrap_params = [f"{content_type}_set"]
            param_count = 1
            
            if category:
                param_count += 1
                wrap_conditions.append(f"data->>'category' = ${param_count}")
                wrap_params.append(category)
            
            if existing_ids:
                placeholders = ','.join([f'${i+param_count+1}' for i in range(len(existing_ids))])
                wrap_conditions.append(f"id NOT IN ({placeholders})")
                wrap_params.extend(existing_ids)
            
            wrap_query = f"""
                SELECT id, type, data, metadata, created_at
                FROM content
                WHERE {' AND '.join(wrap_conditions)}
                ORDER BY created_at, id
                LIMIT ${len(wrap_params) + 1}
            """
            wrap_params.append(additional_needed)
            
            wrap_rows = await conn.fetch(wrap_query, *wrap_params)
            rows = list(rows) + list(wrap_rows)
        
        # Get the UUID of the last item we're returning
        new_marker = str(rows[-1]['id']) if rows else None
        
        # Format results
        results = []
        for row in rows:
            content_dict = {
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            }
            results.append(content_dict)
        
        return results, new_marker
    
    async def update_marker(
        self,
        conn,
        user_id: str,
        content_type: str,
        category: Optional[str],
        new_marker_uuid: str
    ):
        """Update the marker for a user"""
        marker_key = self.get_marker_key(content_type, category)
        
        await conn.execute("""
            UPDATE users 
            SET preferences = jsonb_set(
                jsonb_set(
                    COALESCE(preferences, '{}'::jsonb),
                    '{content_markers}',
                    COALESCE(preferences->'content_markers', '{}'::jsonb)
                ),
                ARRAY['content_markers', $1],
                $2::jsonb
            )
            WHERE id = $3
        """, marker_key, json.dumps(new_marker_uuid), UUID(user_id))


# Alternative: Hash-based segmentation
class HashBasedDeduplication:
    """
    Use content UUID hashes to segment content for each user
    No tracking needed - purely deterministic
    """
    
    @staticmethod
    def should_show_content(
        content_uuid: str,
        user_identifier: str,
        day_offset: int = 0
    ) -> bool:
        """
        Determine if content should be shown to user today
        Each user sees a different subset each day
        """
        import hashlib
        
        # Create a daily hash for user + content
        today = (datetime.utcnow() + timedelta(days=day_offset)).date()
        hash_input = f"{user_identifier}:{content_uuid}:{today.isoformat()}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        # User sees ~1/3 of content each day (adjustable)
        return (hash_value % 3) == 0
    
    async def get_available_content(
        self,
        conn,
        content_type: str,
        user_identifier: str,
        category: Optional[str] = None,
        count: int = 1,
        look_ahead_days: int = 7
    ) -> List[Dict]:
        """
        Get content available to user using hash-based selection
        """
        
        # Build base query
        conditions = [
            "type = $1",
            "is_active = true"
        ]
        params = [f"{content_type}_set"]
        
        if category:
            conditions.append("data->>'category' = $2")
            params.append(category)
        
        # Get all potential content
        query = f"""
            SELECT id, type, data, metadata, created_at
            FROM content
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC
        """
        
        all_content = await conn.fetch(query, *params)
        
        # Filter by hash-based availability
        available = []
        day_offset = 0
        
        while len(available) < count and day_offset < look_ahead_days:
            for row in all_content:
                content_id = str(row['id'])
                if self.should_show_content(content_id, user_identifier, day_offset):
                    # Check if we already added this
                    if not any(c['id'] == row['id'] for c in available):
                        content_dict = {
                            "id": content_id,
                            "type": row["type"],
                            "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                            "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                            "created_at": row["created_at"].isoformat()
                        }
                        available.append(content_dict)
                        
                        if len(available) >= count:
                            break
            
            day_offset += 1
        
        return available[:count]


# Simplified implementation for main.py
async def get_deduplicated_content(
    conn,
    content_type: str,
    user_id: Optional[str],
    session_id: Optional[str],
    category: Optional[str] = None,
    count: int = 1,
    strategy: str = "smart_marker"
) -> List[Dict]:
    """
    Main entry point for deduplicated content
    
    Strategies:
    - smart_marker: Track last UUID per category (light storage)
    - hash_segment: Deterministic daily segments (no storage)
    - random: No deduplication (may repeat)
    """
    
    if strategy == "smart_marker" and user_id:
        # Use smart marker system for logged-in users
        marker_system = SmartMarkerSystem()
        content, new_marker = await marker_system.get_next_content_smart(
            conn, content_type, user_id, session_id, category, count
        )
        
        # Update marker if we got content
        if content and new_marker and user_id:
            await marker_system.update_marker(
                conn, user_id, content_type, category, new_marker
            )
        
        return content
        
    elif strategy == "hash_segment":
        # Use hash-based segmentation (works for anonymous too)
        hash_system = HashBasedDeduplication()
        user_identifier = user_id or session_id or "anonymous"
        
        return await hash_system.get_available_content(
            conn, content_type, user_identifier, category, count
        )
        
    else:
        # Random selection (original behavior)
        conditions = [
            "type = $1",
            "is_active = true"
        ]
        params = [f"{content_type}_set"]
        
        if category:
            conditions.append("data->>'category' = $2")
            params.append(category)
        
        query = f"""
            SELECT id, type, data, metadata, created_at
            FROM content
            WHERE {' AND '.join(conditions)}
            ORDER BY RANDOM()
            LIMIT ${len(params) + 1}
        """
        params.append(count)
        
        rows = await conn.fetch(query, *params)
        
        results = []
        for row in rows:
            content_dict = {
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            }
            results.append(content_dict)
        
        return results


# Example endpoint integration
"""
@app.get("/api/content/{content_type}/sets")
async def get_content_sets(
    content_type: str,
    count: int = Query(default=1, ge=1, le=10),
    category: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    dedup_strategy: str = Query(default="smart_marker")
):
    '''Get content with deduplication'''
    
    # Validate content type
    valid_types = ['quote', 'pun', 'joke', 'factoid']
    if content_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid content type")
    
    async with db.pool.acquire() as conn:
        content = await get_deduplicated_content(
            conn,
            content_type,
            user_id,
            session_id,
            category,
            count,
            dedup_strategy
        )
        
        return content
"""
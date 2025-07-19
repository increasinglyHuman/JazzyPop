"""
Roaring Bitmap Deduplication Implementation for JazzyPop
Ultra-efficient content tracking using roaring bitmaps
"""

from typing import List, Dict, Optional, Set
from datetime import datetime
import json
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

class RoaringBitmapDeduplication:
    """
    Production-ready implementation using pg_roaringbitmap
    
    Storage efficiency:
    - 1000 UUIDs: ~2KB (vs 36KB for JSON array)
    - 1,000,000 UUIDs: ~200KB (vs 36MB for JSON array)
    
    Performance:
    - Lookup: O(1) microseconds
    - Union/Intersection: Blazing fast
    - No deserialization needed
    """
    
    async def initialize_user_bitmaps(self, conn):
        """
        Create table to store user content bitmaps
        One-time setup for the system
        """
        
        # Create sequence table to map UUIDs to integers
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS content_id_mapping (
                id SERIAL PRIMARY KEY,
                content_uuid UUID UNIQUE NOT NULL,
                content_type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_content_uuid 
            ON content_id_mapping(content_uuid);
            
            CREATE INDEX IF NOT EXISTS idx_content_type_id 
            ON content_id_mapping(content_type, id);
        """)
        
        # Create user bitmap storage
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_content_bitmaps (
                user_id UUID NOT NULL,
                content_type VARCHAR(50) NOT NULL,
                seen_bitmap roaringbitmap,
                completed_bitmap roaringbitmap,
                last_updated TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, content_type)
            );
            
            CREATE INDEX IF NOT EXISTS idx_user_bitmaps 
            ON user_content_bitmaps(user_id);
        """)
        
        logger.info("Roaring bitmap tables initialized")
    
    async def get_or_create_content_id(
        self, 
        conn, 
        content_uuid: str, 
        content_type: str
    ) -> int:
        """
        Get integer ID for content UUID (creates if not exists)
        This mapping allows us to use efficient integer bitmaps
        """
        
        # Try to get existing mapping
        result = await conn.fetchval("""
            SELECT id FROM content_id_mapping 
            WHERE content_uuid = $1
        """, UUID(content_uuid))
        
        if result:
            return result
        
        # Create new mapping
        return await conn.fetchval("""
            INSERT INTO content_id_mapping (content_uuid, content_type)
            VALUES ($1, $2)
            ON CONFLICT (content_uuid) DO UPDATE
            SET content_type = EXCLUDED.content_type
            RETURNING id
        """, UUID(content_uuid), content_type)
    
    async def mark_content_seen(
        self,
        conn,
        user_id: str,
        content_type: str,
        content_uuid: str
    ):
        """
        Mark content as seen by user using roaring bitmap
        """
        
        # Get integer ID for content
        content_id = await self.get_or_create_content_id(
            conn, content_uuid, content_type
        )
        
        # Update user's bitmap
        await conn.execute("""
            INSERT INTO user_content_bitmaps (user_id, content_type, seen_bitmap)
            VALUES ($1, $2, rb_build(ARRAY[$3]::integer[]))
            ON CONFLICT (user_id, content_type) 
            DO UPDATE SET 
                seen_bitmap = rb_or(
                    COALESCE(user_content_bitmaps.seen_bitmap, rb_build(ARRAY[]::integer[])),
                    rb_build(ARRAY[$3]::integer[])
                ),
                last_updated = NOW()
        """, UUID(user_id), content_type, content_id)
    
    async def mark_content_completed(
        self,
        conn,
        user_id: str,
        content_type: str,
        content_uuid: str
    ):
        """
        Mark content as completed (stronger than just seen)
        """
        
        content_id = await self.get_or_create_content_id(
            conn, content_uuid, content_type
        )
        
        # Update both seen and completed bitmaps
        await conn.execute("""
            INSERT INTO user_content_bitmaps (user_id, content_type, seen_bitmap, completed_bitmap)
            VALUES ($1, $2, rb_build(ARRAY[$3]::integer[]), rb_build(ARRAY[$3]::integer[]))
            ON CONFLICT (user_id, content_type) 
            DO UPDATE SET 
                seen_bitmap = rb_or(
                    COALESCE(user_content_bitmaps.seen_bitmap, rb_build(ARRAY[]::integer[])),
                    rb_build(ARRAY[$3]::integer[])
                ),
                completed_bitmap = rb_or(
                    COALESCE(user_content_bitmaps.completed_bitmap, rb_build(ARRAY[]::integer[])),
                    rb_build(ARRAY[$3]::integer[])
                ),
                last_updated = NOW()
        """, UUID(user_id), content_type, content_id)
    
    async def get_unseen_content(
        self,
        conn,
        content_type: str,
        user_id: Optional[str],
        category: Optional[str] = None,
        count: int = 1,
        exclude_completed_only: bool = False
    ) -> List[Dict]:
        """
        Get content user hasn't seen using roaring bitmap filtering
        This is where the magic happens - blazing fast exclusion!
        """
        
        if not user_id:
            # No user = no deduplication
            return await self._get_random_content(conn, content_type, category, count)
        
        # Choose which bitmap to use for exclusion
        bitmap_column = "completed_bitmap" if exclude_completed_only else "seen_bitmap"
        
        # Build the query with roaring bitmap exclusion
        query = f"""
            WITH user_bitmap AS (
                SELECT COALESCE({bitmap_column}, rb_build(ARRAY[]::integer[])) as bitmap
                FROM user_content_bitmaps
                WHERE user_id = $1 AND content_type = $2
            ),
            available_content AS (
                SELECT c.*, cm.id as mapped_id
                FROM content c
                LEFT JOIN content_id_mapping cm ON c.id = cm.content_uuid
                WHERE c.type = $3
                AND c.is_active = true
                {"AND c.data->>'category' = $4" if category else ""}
                AND (
                    cm.id IS NULL  -- New content not yet mapped
                    OR NOT rb_contains(
                        (SELECT bitmap FROM user_bitmap),
                        cm.id
                    )
                )
                ORDER BY RANDOM()
                LIMIT ${"5" if category else "4"}
            )
            SELECT * FROM available_content
        """
        
        params = [UUID(user_id), content_type, f"{content_type}_set"]
        if category:
            params.append(category)
        params.append(count)
        
        rows = await conn.fetch(query, *params)
        
        # Format results
        results = []
        for row in rows:
            results.append({
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            })
        
        return results
    
    async def get_user_stats(
        self,
        conn,
        user_id: str,
        content_type: str
    ) -> Dict:
        """
        Get statistics about user's content consumption
        Roaring bitmaps make this super efficient!
        """
        
        stats = await conn.fetchrow("""
            SELECT 
                rb_cardinality(COALESCE(seen_bitmap, rb_build(ARRAY[]::integer[]))) as seen_count,
                rb_cardinality(COALESCE(completed_bitmap, rb_build(ARRAY[]::integer[]))) as completed_count,
                (SELECT COUNT(*) FROM content WHERE type = $2 AND is_active = true) as total_count,
                last_updated
            FROM user_content_bitmaps
            WHERE user_id = $1 AND content_type = $3
        """, UUID(user_id), f"{content_type}_set", content_type)
        
        if not stats:
            return {
                "seen_count": 0,
                "completed_count": 0,
                "total_count": await conn.fetchval(
                    "SELECT COUNT(*) FROM content WHERE type = $1 AND is_active = true",
                    f"{content_type}_set"
                ),
                "completion_percentage": 0
            }
        
        return {
            "seen_count": stats["seen_count"],
            "completed_count": stats["completed_count"],
            "total_count": stats["total_count"],
            "completion_percentage": round(
                (stats["completed_count"] / stats["total_count"] * 100) 
                if stats["total_count"] > 0 else 0,
                2
            ),
            "last_activity": stats["last_updated"].isoformat() if stats["last_updated"] else None
        }
    
    async def get_content_overlap(
        self,
        conn,
        user1_id: str,
        user2_id: str,
        content_type: str
    ) -> Dict:
        """
        Find content overlap between two users
        This showcases roaring bitmap set operations - super fast!
        """
        
        result = await conn.fetchrow("""
            SELECT 
                rb_cardinality(
                    rb_and(
                        COALESCE(u1.completed_bitmap, rb_build(ARRAY[]::integer[])),
                        COALESCE(u2.completed_bitmap, rb_build(ARRAY[]::integer[]))
                    )
                ) as both_completed,
                rb_cardinality(
                    rb_or(
                        COALESCE(u1.completed_bitmap, rb_build(ARRAY[]::integer[])),
                        COALESCE(u2.completed_bitmap, rb_build(ARRAY[]::integer[]))
                    )
                ) as either_completed,
                rb_cardinality(
                    rb_andnot(
                        COALESCE(u1.completed_bitmap, rb_build(ARRAY[]::integer[])),
                        COALESCE(u2.completed_bitmap, rb_build(ARRAY[]::integer[]))
                    )
                ) as only_user1,
                rb_cardinality(
                    rb_andnot(
                        COALESCE(u2.completed_bitmap, rb_build(ARRAY[]::integer[])),
                        COALESCE(u1.completed_bitmap, rb_build(ARRAY[]::integer[]))
                    )
                ) as only_user2
            FROM user_content_bitmaps u1
            CROSS JOIN user_content_bitmaps u2
            WHERE u1.user_id = $1 AND u1.content_type = $3
            AND u2.user_id = $2 AND u2.content_type = $3
        """, UUID(user1_id), UUID(user2_id), content_type)
        
        if not result:
            return {
                "both_completed": 0,
                "either_completed": 0,
                "only_user1": 0,
                "only_user2": 0,
                "similarity_score": 0
            }
        
        similarity = (
            result["both_completed"] / result["either_completed"] * 100
            if result["either_completed"] > 0 else 0
        )
        
        return {
            "both_completed": result["both_completed"],
            "either_completed": result["either_completed"],
            "only_user1": result["only_user1"],
            "only_user2": result["only_user2"],
            "similarity_score": round(similarity, 2)
        }
    
    async def _get_random_content(
        self,
        conn,
        content_type: str,
        category: Optional[str],
        count: int
    ) -> List[Dict]:
        """Fallback for anonymous users"""
        
        query = """
            SELECT * FROM content
            WHERE type = $1 AND is_active = true
        """
        params = [f"{content_type}_set"]
        
        if category:
            query += " AND data->>'category' = $2"
            params.append(category)
        
        query += f" ORDER BY RANDOM() LIMIT ${len(params) + 1}"
        params.append(count)
        
        rows = await conn.fetch(query, *params)
        
        return [{
            "id": str(row["id"]),
            "type": row["type"],
            "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
            "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            "created_at": row["created_at"].isoformat()
        } for row in rows]


# Migration helper to convert existing data
async def migrate_existing_seen_data(conn):
    """
    One-time migration to convert existing JSON arrays to roaring bitmaps
    """
    
    logger.info("Starting migration to roaring bitmaps...")
    
    # Get all users with completed content
    users = await conn.fetch("""
        SELECT id, completed_content, preferences
        FROM users
        WHERE completed_content IS NOT NULL
           OR preferences->'completed_content' IS NOT NULL
    """)
    
    rb_dedup = RoaringBitmapDeduplication()
    migrated_count = 0
    
    for user in users:
        user_id = str(user['id'])
        
        # Check both possible storage locations
        completed_content = user['completed_content'] or user['preferences'].get('completed_content', {})
        
        if not completed_content:
            continue
        
        # Migrate each content type
        for content_type, content_ids in completed_content.items():
            if isinstance(content_ids, list):
                for content_id in content_ids:
                    await rb_dedup.mark_content_completed(
                        conn, user_id, content_type, content_id
                    )
                migrated_count += len(content_ids)
        
        logger.info(f"Migrated user {user_id}")
    
    logger.info(f"Migration complete! Migrated {migrated_count} content items")


# Example integration for main.py endpoints
"""
# Add to main.py imports:
from roaring_bitmap_dedup import RoaringBitmapDeduplication

# Initialize on startup:
rb_dedup = RoaringBitmapDeduplication()

# In lifespan function:
async with db.pool.acquire() as conn:
    await rb_dedup.initialize_user_bitmaps(conn)

# Update quote endpoint:
@app.get("/api/content/quote/sets")
async def get_quote_sets(
    count: int = Query(default=1, ge=1, le=10),
    user_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    async with db.pool.acquire() as conn:
        quotes = await rb_dedup.get_unseen_content(
            conn, "quote", user_id, category, count
        )
        return quotes

# Add tracking endpoint:
@app.post("/api/content/{content_type}/{content_id}/complete")
async def mark_content_completed(
    content_type: str,
    content_id: str,
    user_id: str = Query(...)
):
    async with db.pool.acquire() as conn:
        await rb_dedup.mark_content_completed(
            conn, user_id, content_type, content_id
        )
        
        # Get updated stats
        stats = await rb_dedup.get_user_stats(
            conn, user_id, content_type
        )
        
        return {
            "success": True,
            "stats": stats
        }
"""
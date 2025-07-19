"""
Spatial Hash Deduplication for JazzyPop
Mathematical approach to content distribution without tracking
"""

import hashlib
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import math

class SpatialHashDeduplication:
    """
    Uses spatial hashing principles to distribute content without tracking
    
    Key concepts:
    1. Content space divided into "buckets" using hash functions
    2. Time + user creates a "position" in content space
    3. Content selection spirals outward from position
    4. No memory needed - purely mathematical
    
    Like throwing darts at a dartboard - you'll hit different spots
    naturally without trying to remember where you threw before
    """
    
    @staticmethod
    def get_content_hash(content_id: str) -> int:
        """Hash content ID to a position in space"""
        return int(hashlib.md5(content_id.encode()).hexdigest(), 16)
    
    @staticmethod
    def get_user_position(user_id: str, timestamp: datetime) -> Tuple[float, float]:
        """
        Calculate user's current position in content space
        Position changes over time, creating natural variation
        """
        # Create time-based coordinates
        hours_since_epoch = (timestamp - datetime(2024, 1, 1)).total_seconds() / 3600
        
        # Use golden ratio for better distribution
        golden_ratio = (1 + math.sqrt(5)) / 2
        
        # Create 2D position using user hash and time
        user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        
        # Spiral pattern using golden angle
        angle = hours_since_epoch * golden_ratio * 2 * math.pi
        radius = math.sqrt(hours_since_epoch)
        
        x = radius * math.cos(angle) + (user_hash % 1000) / 1000
        y = radius * math.sin(angle) + ((user_hash >> 16) % 1000) / 1000
        
        return (x, y)
    
    @staticmethod
    def content_distance(content_hash: int, user_pos: Tuple[float, float]) -> float:
        """
        Calculate "distance" between user position and content
        """
        # Map content hash to 2D space
        content_x = (content_hash % 10000) / 10000
        content_y = ((content_hash >> 32) % 10000) / 10000
        
        # Euclidean distance
        dx = content_x - user_pos[0] % 1.0  # Wrap around unit square
        dy = content_y - user_pos[1] % 1.0
        
        return math.sqrt(dx*dx + dy*dy)
    
    async def get_spatially_distributed_content(
        self,
        conn,
        content_type: str,
        user_id: Optional[str],
        session_id: Optional[str],
        category: Optional[str] = None,
        count: int = 1,
        time_window_hours: int = 24
    ) -> List[Dict]:
        """
        Select content based on spatial distribution
        """
        
        # Get user identifier and position
        user_identifier = user_id or session_id or "anonymous"
        current_time = datetime.utcnow()
        user_pos = self.get_user_position(user_identifier, current_time)
        
        # Fetch all available content
        conditions = ["type = $1", "is_active = true"]
        params = [f"{content_type}_set"]
        
        if category:
            conditions.append("data->>'category' = $2")
            params.append(category)
        
        query = f"""
            SELECT id, type, data, metadata, created_at
            FROM content
            WHERE {' AND '.join(conditions)}
        """
        
        all_content = await conn.fetch(query, *params)
        
        # Calculate distances and sort
        content_with_distances = []
        for row in all_content:
            content_id = str(row['id'])
            content_hash = self.get_content_hash(content_id)
            distance = self.content_distance(content_hash, user_pos)
            
            content_with_distances.append({
                'row': row,
                'distance': distance,
                'content_id': content_id
            })
        
        # Sort by distance and select closest
        content_with_distances.sort(key=lambda x: x['distance'])
        
        # Take the closest N items
        selected = content_with_distances[:count]
        
        # Format results
        results = []
        for item in selected:
            row = item['row']
            results.append({
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            })
        
        return results


class ReservoirSamplingDedup:
    """
    Use reservoir sampling with deterministic seeds
    Guarantees each user sees different subset without tracking
    """
    
    @staticmethod
    def get_daily_reservoir(
        content_ids: List[str],
        user_id: str,
        reservoir_size: int,
        date: datetime
    ) -> List[str]:
        """
        Create a deterministic reservoir sample for user+date
        Each user gets a different sample each day
        """
        import random
        
        # Create deterministic seed
        seed_str = f"{user_id}:{date.date().isoformat()}"
        seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
        rng = random.Random(seed)
        
        # Reservoir sampling algorithm
        reservoir = []
        
        for i, item in enumerate(content_ids):
            if i < reservoir_size:
                reservoir.append(item)
            else:
                # Replace elements with gradually decreasing probability
                j = rng.randint(0, i)
                if j < reservoir_size:
                    reservoir[j] = item
        
        return reservoir


class GoldenRatioSequencer:
    """
    Use golden ratio sequencing for optimal distribution
    Based on how sunflower seeds arrange themselves
    """
    
    @staticmethod
    def get_sequence_position(user_id: str, iteration: int) -> float:
        """
        Get position in sequence using golden ratio
        This naturally avoids clustering
        """
        golden_ratio = (1 + math.sqrt(5)) / 2
        
        # User-specific offset
        user_hash = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        offset = (user_hash % 1000000) / 1000000
        
        # Golden ratio sequence
        position = (offset + iteration / golden_ratio) % 1.0
        
        return position
    
    async def get_golden_sequence_content(
        self,
        conn,
        content_type: str,
        user_id: str,
        sequence_number: int,  # Which "round" of content viewing
        count: int = 1
    ) -> List[Dict]:
        """
        Select content using golden ratio sequencing
        """
        
        # Get all content IDs
        rows = await conn.fetch("""
            SELECT id FROM content
            WHERE type = $1 AND is_active = true
            ORDER BY created_at, id
        """, f"{content_type}_set")
        
        total_content = len(rows)
        if total_content == 0:
            return []
        
        results = []
        
        for i in range(count):
            # Get position in sequence
            position = self.get_sequence_position(
                user_id, 
                sequence_number * count + i
            )
            
            # Map to content index
            index = int(position * total_content) % total_content
            
            # Get content at this position
            content_id = rows[index]['id']
            
            # Fetch full content
            content = await conn.fetchrow("""
                SELECT * FROM content WHERE id = $1
            """, content_id)
            
            if content:
                results.append({
                    "id": str(content["id"]),
                    "type": content["type"],
                    "data": json.loads(content["data"]) if isinstance(content["data"], str) else content["data"],
                    "metadata": json.loads(content["metadata"]) if isinstance(content["metadata"], str) else content["metadata"],
                    "created_at": content["created_at"].isoformat()
                })
        
        return results


# Unified implementation
async def get_mathematically_distributed_content(
    conn,
    content_type: str,
    user_id: Optional[str],
    session_id: Optional[str],
    category: Optional[str] = None,
    count: int = 1,
    strategy: str = "spatial_hash"
) -> List[Dict]:
    """
    Get content using mathematical distribution strategies
    
    Strategies:
    - spatial_hash: 2D space distribution (like throwing darts)
    - reservoir: Daily changing subset per user
    - golden_ratio: Optimal sequential distribution
    - pure_random: Original random selection
    """
    
    user_identifier = user_id or session_id or "anonymous"
    
    if strategy == "spatial_hash":
        spatial = SpatialHashDeduplication()
        return await spatial.get_spatially_distributed_content(
            conn, content_type, user_id, session_id, category, count
        )
    
    elif strategy == "reservoir":
        # Get all content IDs first
        conditions = ["type = $1", "is_active = true"]
        params = [f"{content_type}_set"]
        
        if category:
            conditions.append("data->>'category' = $2")
            params.append(category)
        
        rows = await conn.fetch(f"""
            SELECT id FROM content
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at, id
        """, *params)
        
        content_ids = [str(row['id']) for row in rows]
        
        # Get today's reservoir for this user
        reservoir = ReservoirSamplingDedup.get_daily_reservoir(
            content_ids,
            user_identifier,
            min(50, len(content_ids) // 3),  # Reservoir = 1/3 of content
            datetime.utcnow()
        )
        
        # Select randomly from reservoir
        import random
        selected_ids = random.sample(reservoir, min(count, len(reservoir)))
        
        # Fetch full content
        if selected_ids:
            placeholders = ','.join([f'${i+1}' for i in range(len(selected_ids))])
            results = await conn.fetch(f"""
                SELECT * FROM content
                WHERE id IN ({placeholders})
            """, *[UUID(sid) for sid in selected_ids])
            
            return [{
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            } for row in results]
        
        return []
    
    elif strategy == "golden_ratio":
        # Need to track sequence number somehow
        # Could derive from user's total interactions or time
        hours_since_start = int((datetime.utcnow() - datetime(2024, 1, 1)).total_seconds() / 3600)
        sequence_number = hours_since_start  # New sequence every hour
        
        golden = GoldenRatioSequencer()
        return await golden.get_golden_sequence_content(
            conn, content_type, user_identifier, sequence_number, count
        )
    
    else:  # pure_random
        conditions = ["type = $1", "is_active = true"]
        params = [f"{content_type}_set"]
        
        if category:
            conditions.append("data->>'category' = $2")
            params.append(category)
        
        rows = await conn.fetch(f"""
            SELECT * FROM content
            WHERE {' AND '.join(conditions)}
            ORDER BY RANDOM()
            LIMIT $3
        """, *params, count)
        
        return [{
            "id": str(row["id"]),
            "type": row["type"],
            "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
            "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            "created_at": row["created_at"].isoformat()
        } for row in rows]


import json
from uuid import UUID
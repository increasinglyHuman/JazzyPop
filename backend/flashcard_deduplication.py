"""
Lightweight flashcard deduplication strategy for JazzyPop
"""

# Option 1: Add to existing endpoints with minimal tracking
async def get_quote_sets_no_repeats(
    count: int = 1,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    exclude_last: int = 100  # Only remember last 100 viewed
):
    """
    Get quote sets excluding recently viewed ones
    
    Strategy:
    1. Use session_id for anonymous users (client-side tracking)
    2. Use user_id for logged-in users (server-side tracking)
    3. Only track last N items to keep it lightweight
    """
    
    exclude_ids = []
    
    if user_id:
        # For logged-in users, check last 100 viewed quotes
        async with db.pool.acquire() as conn:
            recent = await conn.fetch("""
                SELECT content_id 
                FROM user_content_views 
                WHERE user_id = $1 
                AND content_type = 'quote_set'
                ORDER BY last_viewed DESC
                LIMIT $2
            """, user_id, exclude_last)
            exclude_ids = [r['content_id'] for r in recent]
    
    # Build query excluding recent views
    async with db.pool.acquire() as conn:
        query = """
            SELECT * FROM content 
            WHERE type = 'quote_set'
            AND is_active = true
        """
        
        if exclude_ids:
            query += f" AND id NOT IN ({','.join(['$' + str(i+2) for i in range(len(exclude_ids))])})"
        
        query += " ORDER BY RANDOM() LIMIT $1"
        
        params = [count] + exclude_ids
        results = await conn.fetch(query, *params)
    
    return results


# Option 2: Client-side session tracking (even lighter)
"""
Frontend approach - track in localStorage:

const FlashcardTracker = {
    STORAGE_KEY: 'jazzypop_viewed_flashcards',
    MAX_TRACKED: 100,
    
    getViewed(type) {
        const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        return data[type] || [];
    },
    
    addViewed(type, contentId) {
        const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        if (!data[type]) data[type] = [];
        
        // Add to front, remove duplicates
        data[type] = [contentId, ...data[type].filter(id => id !== contentId)];
        
        // Keep only last N
        data[type] = data[type].slice(0, this.MAX_TRACKED);
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },
    
    getExcludeParam(type) {
        const viewed = this.getViewed(type);
        return viewed.length > 0 ? `&exclude=${viewed.join(',')}` : '';
    }
};

// Usage in API calls:
const endpoint = `/api/content/quote/sets?count=1${FlashcardTracker.getExcludeParam('quotes')}`;
"""


# Option 3: Rotating Content Pools (UUID-based)
"""
Lightweight approach using content UUIDs and rotating pools:

1. Server maintains active content pools (e.g., 50 quotes)
2. Client receives pool ID + offset for their session
3. Content rotates through pools daily/weekly
4. No per-user tracking needed

Benefits:
- Zero database tracking overhead
- Natural content rotation
- Different users see different content
- Simple to implement
"""

# Option 4: Bloom Filter Approach
"""
Ultra-lightweight tracking using probabilistic data structure:

1. Client maintains bloom filter of seen UUIDs
2. Server checks filter before serving content
3. Reset filter periodically (weekly/monthly)
4. Store as compressed base64 string

Benefits:
- Tiny memory footprint (few KB for thousands of items)
- O(1) lookup time
- No false negatives (won't show same content)
- Occasional false positives acceptable
"""

# Option 5: Content Buckets with Time Windows
"""
Divide content into time-based buckets:

1. Split all content into N buckets (e.g., 7 for days of week)
2. Each day serves from different bucket
3. Within bucket, use deterministic shuffle based on user ID
4. No tracking needed - time does the work

Benefits:
- Zero tracking overhead
- Guaranteed variety over time
- Predictable content rotation
- Works for anonymous users
"""

# Implementation Option 1: Content Pool Rotation
import hashlib
from datetime import date, datetime
from typing import List, Optional
import random

class ContentPoolManager:
    """Manages rotating content pools without tracking individual views"""
    
    def __init__(self, pool_size: int = 50, rotation_days: int = 7):
        self.pool_size = pool_size
        self.rotation_days = rotation_days
    
    def get_current_pool_id(self, content_type: str) -> str:
        """Get current pool ID based on date and content type"""
        days_since_epoch = (date.today() - date(2024, 1, 1)).days
        pool_number = (days_since_epoch // self.rotation_days) % 10
        return f"{content_type}_pool_{pool_number}"
    
    def get_user_offset(self, user_id: Optional[str], session_id: Optional[str]) -> int:
        """Get consistent offset for user within pool"""
        identifier = user_id or session_id or "anonymous"
        hash_val = int(hashlib.md5(identifier.encode()).hexdigest(), 16)
        return hash_val % self.pool_size

# Implementation Option 2: Bloom Filter for Seen Content
class LightweightBloomFilter:
    """Simple bloom filter for tracking seen UUIDs"""
    
    def __init__(self, size: int = 1024, hash_count: int = 3):
        self.size = size
        self.hash_count = hash_count
        self.bits = bytearray(size // 8)
    
    def _hash(self, item: str, seed: int) -> int:
        """Generate hash for item with seed"""
        h = hashlib.md5(f"{item}:{seed}".encode()).digest()
        return int.from_bytes(h[:4], 'big') % self.size
    
    def add(self, uuid: str):
        """Add UUID to filter"""
        for i in range(self.hash_count):
            bit_pos = self._hash(uuid, i)
            byte_pos = bit_pos // 8
            bit_offset = bit_pos % 8
            self.bits[byte_pos] |= (1 << bit_offset)
    
    def contains(self, uuid: str) -> bool:
        """Check if UUID might be in filter"""
        for i in range(self.hash_count):
            bit_pos = self._hash(uuid, i)
            byte_pos = bit_pos // 8
            bit_offset = bit_pos % 8
            if not (self.bits[byte_pos] & (1 << bit_offset)):
                return False
        return True
    
    def to_base64(self) -> str:
        """Serialize to base64 for storage"""
        import base64
        return base64.b64encode(self.bits).decode('ascii')
    
    @classmethod
    def from_base64(cls, data: str, size: int = 1024, hash_count: int = 3):
        """Deserialize from base64"""
        import base64
        filter_obj = cls(size, hash_count)
        filter_obj.bits = bytearray(base64.b64decode(data))
        return filter_obj

# Implementation Option 3: Time-Based Content Buckets
def get_content_bucket(content_type: str, num_buckets: int = 7) -> int:
    """Get current content bucket based on day"""
    days_since_epoch = (date.today() - date(2024, 1, 1)).days
    return days_since_epoch % num_buckets

def get_deterministic_shuffle(items: List[str], seed: str) -> List[str]:
    """Shuffle items deterministically based on seed"""
    rng = random.Random(seed)
    shuffled = items.copy()
    rng.shuffle(shuffled)
    return shuffled

# Enhanced endpoint implementation for quotes with challenge tracking
@app.get("/api/content/quote/sets")
async def get_quote_sets(
    count: int = Query(default=1, ge=1, le=10),
    user_id: Optional[str] = Query(None, description="User ID for personalization"),
    session_id: Optional[str] = Query(None, description="Session ID for anonymous users"),
    strategy: str = Query(default="pool", description="Dedup strategy: pool, bucket, or random")
):
    """Get quote sets with lightweight deduplication
    
    Strategies:
    - pool: Rotating content pools (no tracking)
    - bucket: Time-based buckets (no tracking)
    - random: Pure random (may repeat)
    """
    
    async with db.pool.acquire() as conn:
        if strategy == "pool":
            # Use content pool rotation
            pool_mgr = ContentPoolManager()
            pool_id = pool_mgr.get_current_pool_id("quotes")
            user_offset = pool_mgr.get_user_offset(user_id, session_id)
            
            # Get quotes using modular arithmetic for rotation
            quotes = await conn.fetch("""
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY created_at) as rn
                    FROM content
                    WHERE type = 'quote_set' AND is_active = true
                ) numbered
                WHERE ((rn - 1 + $1) % (SELECT COUNT(*) FROM content WHERE type = 'quote_set' AND is_active = true)) 
                    BETWEEN $2 AND $3
                ORDER BY rn
                LIMIT $4
            """, user_offset, 0, count - 1, count)
            
        elif strategy == "bucket":
            # Use time-based buckets
            bucket = get_content_bucket("quotes")
            total_buckets = 7
            
            quotes = await conn.fetch("""
                SELECT * FROM (
                    SELECT *, 
                           ROW_NUMBER() OVER (ORDER BY id) as rn,
                           COUNT(*) OVER () as total
                    FROM content
                    WHERE type = 'quote_set' AND is_active = true
                ) numbered
                WHERE (rn % $1) = $2
                ORDER BY RANDOM()
                LIMIT $3
            """, total_buckets, bucket, count)
            
        else:  # random
            quotes = await conn.fetch("""
                SELECT * FROM content
                WHERE type = 'quote_set' AND is_active = true
                ORDER BY RANDOM()
                LIMIT $1
            """, count)
        
        return [format_quote_response(q) for q in quotes]

# New endpoint for tracking quote challenge outcomes
@app.post("/api/content/quote/challenge-result")
async def submit_quote_challenge_result(
    quote_id: str,
    challenge_passed: bool,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
):
    """Track outcome of quote challenge attempt
    
    Similar to quiz answer submission but for quote challenges
    """
    async with db.pool.acquire() as conn:
        # Record the challenge attempt
        await conn.execute("""
            INSERT INTO content_interactions 
            (content_id, user_id, session_id, interaction_type, data)
            VALUES ($1, $2, $3, 'challenge_attempt', $4)
        """, 
        UUID(quote_id), 
        UUID(user_id) if user_id else None, 
        session_id,
        json.dumps({
            "passed": challenge_passed,
            "timestamp": datetime.utcnow().isoformat()
        })
        )
        
        # Update user stats if authenticated
        if user_id:
            if challenge_passed:
                await conn.execute("""
                    UPDATE users 
                    SET quote_challenges_passed = quote_challenges_passed + 1,
                        quote_streak = quote_streak + 1
                    WHERE id = $1
                """, UUID(user_id))
            else:
                await conn.execute("""
                    UPDATE users 
                    SET quote_streak = 0
                    WHERE id = $1
                """, UUID(user_id))
        
        return {"success": True, "tracked": True}
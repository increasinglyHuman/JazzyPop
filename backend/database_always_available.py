"""
Database modifications to make all content always available
This file contains the updated methods that should replace the ones in database.py
"""

# Modified get_random_quiz method
async def get_random_quiz(self, mode: str = "normal") -> Optional[Dict[str, Any]]:
    """Get a random quiz by mode - always returns content"""
    async with self.pool.acquire() as conn:
        # First try to get newer content (last 7 days)
        query = """
            SELECT 
                c.id, c.type, c.data, c.metadata, c.created_at,
                cv.variation_data
            FROM content c
            LEFT JOIN content_variations cv ON cv.content_id = c.id AND cv.mode = $1
            WHERE c.type IN ('quiz', 'quiz_set')
            AND c.created_at > NOW() - INTERVAL '7 days'
            ORDER BY RANDOM()
            LIMIT 1
        """
        
        row = await conn.fetchrow(query, mode)
        
        # If no recent content, get ANY quiz/quiz_set
        if not row:
            query = """
                SELECT 
                    c.id, c.type, c.data, c.metadata, c.created_at,
                    cv.variation_data
                FROM content c
                LEFT JOIN content_variations cv ON cv.content_id = c.id AND cv.mode = $1
                WHERE c.type IN ('quiz', 'quiz_set')
                ORDER BY RANDOM()
                LIMIT 1
            """
            row = await conn.fetchrow(query, mode)
        
        if not row:
            return None
        
        result = {
            "id": str(row["id"]),
            "type": row["type"],
            "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
            "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
            "is_new": (datetime.utcnow() - row["created_at"]).days < 1  # Mark as new if less than 1 day old
        }
        
        # Add mode-specific variations if available
        if row["variation_data"]:
            variation = json.loads(row["variation_data"]) if isinstance(row["variation_data"], str) else row["variation_data"]
            result["variation"] = variation
            
        return result

# Modified _get_random_flashcards method
async def _get_random_flashcards(self, category: str, limit: int) -> List[Dict[str, Any]]:
    """Get random flashcards - always returns content"""
    # Map category to content types (including new set types)
    type_map = {
        'famous_quotes': ['quote', 'quote_set'],
        'bad_puns': ['pun', 'pun_set'],
        'knock_knock': ['joke', 'joke_set'],
        'trivia_mix': ['trivia', 'trivia_set']
    }
    
    content_type = type_map.get(category, ['trivia', 'trivia_set'])
    
    # Check cache first
    cache_key = f"flashcards:{category}:{limit}"
    cached = await self.redis.get(cache_key) if self.redis else None
    if cached:
        return json.loads(cached)
    
    async with self.pool.acquire() as conn:
        # First try to get newer content (last 3 days)
        if isinstance(content_type, list):
            rows = await conn.fetch("""
                SELECT id, type, data, metadata, created_at
                FROM content
                WHERE type = ANY($1::text[])
                AND created_at > NOW() - INTERVAL '3 days'
                ORDER BY RANDOM()
                LIMIT $2
            """, content_type, limit)
        else:
            rows = await conn.fetch("""
                SELECT id, type, data, metadata, created_at
                FROM content
                WHERE type = $1
                AND created_at > NOW() - INTERVAL '3 days'
                ORDER BY RANDOM()
                LIMIT $2
            """, content_type, limit)
        
        # If not enough recent content, get ANY content
        if len(rows) < limit:
            needed = limit - len(rows)
            existing_ids = [row['id'] for row in rows]
            
            if isinstance(content_type, list):
                additional_rows = await conn.fetch("""
                    SELECT id, type, data, metadata, created_at
                    FROM content
                    WHERE type = ANY($1::text[])
                    AND id != ALL($2::uuid[])
                    ORDER BY RANDOM()
                    LIMIT $3
                """, content_type, existing_ids if existing_ids else [], needed)
            else:
                additional_rows = await conn.fetch("""
                    SELECT id, type, data, metadata, created_at
                    FROM content
                    WHERE type = $1
                    AND id != ALL($2::uuid[])
                    ORDER BY RANDOM()
                    LIMIT $3
                """, content_type, existing_ids if existing_ids else [], needed)
            
            rows.extend(additional_rows)
        
        flashcards = []
        for row in rows:
            # Handle both dict and JSON string formats
            data = row["data"]
            if isinstance(data, str):
                data = json.loads(data)
            
            # Handle sets differently (extract individual items)
            if row["type"].endswith('_set'):
                # Extract items from the set
                items_key = row["type"].replace('_set', 's')  # e.g., 'pun_set' -> 'puns'
                if items_key == 'quotas':  # Special case for quotes
                    items_key = 'quotes'
                
                if items_key in data and isinstance(data[items_key], list):
                    # Add individual items from the set
                    for item in data[items_key][:limit - len(flashcards)]:
                        card = {
                            "id": str(row["id"]) + "_" + str(item.get("id", "")),
                            "type": row["type"].replace('_set', ''),
                            "category": self._get_category_name(row["type"]),
                            "is_new": (datetime.utcnow() - row["created_at"]).days < 1,
                            **item  # Unpack the individual item
                        }
                        flashcards.append(card)
                        if len(flashcards) >= limit:
                            break
            else:
                # Regular single item
                card = {
                    "id": str(row["id"]),
                    "type": row["type"],
                    "category": self._get_category_name(row["type"]),
                    "is_new": (datetime.utcnow() - row["created_at"]).days < 1,
                    **data  # Unpack the data
                }
                flashcards.append(card)
        
        # Cache the results
        if self.redis and flashcards:
            await self.redis.setex(cache_key, 300, json.dumps(flashcards))  # 5 min cache
            
        return flashcards[:limit]

# Modified get_active_cards method for dashboard
async def get_active_cards(self) -> List[Dict[str, Any]]:
    """Get active dashboard cards - always returns content"""
    cache_key = "cards:active"
    
    # Check Redis cache first
    if self.redis:
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
    
    async with self.pool.acquire() as conn:
        # First get promotional cards (last 24 hours)
        rows = await conn.fetch("""
            SELECT id, type, priority, data, created_at, expires_at
            FROM cards
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY priority DESC, created_at DESC
            LIMIT 20
        """)
        
        # If not enough cards, get older ones too
        if len(rows) < 5:
            additional_rows = await conn.fetch("""
                SELECT id, type, priority, data, created_at, expires_at
                FROM cards
                WHERE created_at <= NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT $1
            """, 20 - len(rows))
            rows.extend(additional_rows)
        
        # If still no cards, create some from recent content
        if not rows:
            # Generate cards from recent quiz_sets
            quiz_sets = await conn.fetch("""
                SELECT id, data, created_at
                FROM content
                WHERE type = 'quiz_set'
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            cards = []
            for qs in quiz_sets:
                data = json.loads(qs['data']) if isinstance(qs['data'], str) else qs['data']
                cards.append({
                    "id": str(uuid4()),
                    "type": "quiz_tease",
                    "priority": 5,
                    "data": {
                        "title": data.get('title', 'New Quiz Available!'),
                        "description": f"Test your knowledge with {data.get('total_questions', 10)} questions!",
                        "quiz_id": str(qs['id']),
                        "category": data.get('category', 'mixed'),
                        "cta": "Play Now!",
                        "icon": "🎯"
                    },
                    "timestamp": int(qs['created_at'].timestamp() * 1000),
                    "is_new": (datetime.utcnow() - qs['created_at']).days < 1
                })
        else:
            cards = []
            for row in rows:
                data = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
                cards.append({
                    "id": str(row['id']),
                    "type": row['type'],
                    "priority": row['priority'],
                    "data": data,
                    "timestamp": int(row['created_at'].timestamp() * 1000),
                    "is_new": (datetime.utcnow() - row['created_at']).days < 1,
                    "is_expiring_soon": row['expires_at'] and (row['expires_at'] - datetime.utcnow()).total_seconds() < 3600
                })
        
        # Cache results
        if self.redis and cards:
            await self.redis.setex(cache_key, 300, json.dumps(cards))  # 5 min cache
            
        return cards
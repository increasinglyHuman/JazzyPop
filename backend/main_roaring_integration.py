"""
Integration points for roaring bitmap deduplication in main.py
Copy these sections into the appropriate places
"""

# ============================================
# 1. ADD TO IMPORTS (around line 21)
# ============================================
from roaring_bitmap_dedup import RoaringBitmapDeduplication

# ============================================
# 2. INITIALIZE IN LIFESPAN (around line 31)
# ============================================
# Add to lifespan function after db.connect():
rb_dedup = RoaringBitmapDeduplication()
async with db.pool.acquire() as conn:
    await rb_dedup.initialize_user_bitmaps(conn)
logger.info("Roaring bitmap deduplication initialized")

# Create global instance
app.state.rb_dedup = rb_dedup

# ============================================
# 3. REPLACE QUIZ SETS ENDPOINT (around line 445)
# ============================================
@app.get("/api/content/quiz/sets")
async def get_quiz_sets(
    count: int = Query(default=1, ge=1, le=100, description="Number of quiz sets to return"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    mode: str = Query(default="random", description="Mode selection: random, poqpoq, chaos, zen, speed"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    include_variations: bool = Query(default=True, description="Include mode variations"),
    user_id: Optional[str] = Query(default=None, description="User ID for deduplication")
) -> List[Dict[str, Any]]:
    """
    Get multiple quiz sets with filtering options and deduplication
    """
    
    # Validate category if provided
    valid_categories = [
        'technology', 'science', 'history', 'geography', 'literature',
        'film', 'music', 'art', 'sports', 'nature', 'animals', 'food_cuisine',
        'pop_culture', 'mythology', 'space', 'gaming', 'internet_culture',
        'architecture', 'ancient_architecture', 'fashion_design', 'inventions',
        'famous_lies', 'language_evolution', 'dinosaurs', 'fame_glory'
    ]
    
    if category and category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )
    
    async with db.pool.acquire() as conn:
        # Use roaring bitmap deduplication
        quiz_sets = await app.state.rb_dedup.get_unseen_content(
            conn,
            content_type="quiz",
            user_id=user_id,
            category=category,
            count=count
        )
        
        # Mark as seen for logged-in users
        if user_id and quiz_sets:
            for quiz in quiz_sets:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, "quiz", quiz['id']
                )
        
        # Apply mode variations if requested
        if include_variations:
            # [Keep existing variation logic]
            pass
        
        return quiz_sets

# ============================================
# 4. REPLACE PUN SETS ENDPOINT (around line 568)
# ============================================
@app.get("/api/content/pun/sets")
async def get_pun_sets(
    count: int = Query(default=1, ge=1, le=10, description="Number of pun sets to return"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    user_id: Optional[str] = Query(default=None, description="User ID for deduplication")
) -> List[Dict[str, Any]]:
    """
    Get pun sets for practice activities with deduplication
    """
    async with db.pool.acquire() as conn:
        pun_sets = await app.state.rb_dedup.get_unseen_content(
            conn,
            content_type="pun",
            user_id=user_id,
            count=count
        )
        
        # Mark as seen
        if user_id and pun_sets:
            for pun in pun_sets:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, "pun", pun['id']
                )
        
        return pun_sets

# ============================================
# 5. REPLACE QUOTE SETS ENDPOINT (around line 615)
# ============================================
@app.get("/api/content/quote/sets")
async def get_quote_sets(
    count: int = Query(default=1, ge=1, le=10, description="Number of quote sets to return"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    user_id: Optional[str] = Query(default=None, description="User ID for deduplication")
) -> List[Dict[str, Any]]:
    """
    Get quote sets for practice activities with deduplication
    """
    async with db.pool.acquire() as conn:
        quote_sets = await app.state.rb_dedup.get_unseen_content(
            conn,
            content_type="quote",
            user_id=user_id,
            count=count
        )
        
        # Mark as seen
        if user_id and quote_sets:
            for quote in quote_sets:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, "quote", quote['id']
                )
        
        return quote_sets

# ============================================
# 6. REPLACE JOKE SETS ENDPOINT (around line 662)
# ============================================
@app.get("/api/content/joke/sets")
async def get_joke_sets(
    count: int = Query(default=1, ge=1, le=10, description="Number of joke sets to return"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    user_id: Optional[str] = Query(default=None, description="User ID for deduplication")
) -> List[Dict[str, Any]]:
    """
    Get joke sets (knock-knock jokes) for practice activities with deduplication
    """
    async with db.pool.acquire() as conn:
        joke_sets = await app.state.rb_dedup.get_unseen_content(
            conn,
            content_type="joke",
            user_id=user_id,
            count=count
        )
        
        # Mark as seen
        if user_id and joke_sets:
            for joke in joke_sets:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, "joke", joke['id']
                )
        
        return joke_sets

# ============================================
# 7. REPLACE TRIVIA SETS ENDPOINT (around line 709)
# ============================================
@app.get("/api/content/trivia/sets")
async def get_trivia_sets(
    count: int = Query(default=1, ge=1, le=10, description="Number of trivia sets to return"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    user_id: Optional[str] = Query(default=None, description="User ID for deduplication")
) -> List[Dict[str, Any]]:
    """
    Get trivia sets (factoids) for practice activities with deduplication
    """
    async with db.pool.acquire() as conn:
        trivia_sets = await app.state.rb_dedup.get_unseen_content(
            conn,
            content_type="trivia",  # or "factoid" depending on your data
            user_id=user_id,
            count=count
        )
        
        # Mark as seen
        if user_id and trivia_sets:
            for trivia in trivia_sets:
                await app.state.rb_dedup.mark_content_seen(
                    conn, user_id, "trivia", trivia['id']
                )
        
        return trivia_sets

# ============================================
# 8. ADD COMPLETION ENDPOINTS (new endpoints)
# ============================================

@app.post("/api/content/quiz/{quiz_id}/complete")
async def mark_quiz_completed(
    quiz_id: str,
    user_id: str = Query(..., description="User ID"),
    score: Optional[int] = Query(None, description="Quiz score")
):
    """Mark a quiz as completed by user"""
    async with db.pool.acquire() as conn:
        await app.state.rb_dedup.mark_content_completed(
            conn, user_id, "quiz", quiz_id
        )
        
        # Get updated stats
        stats = await app.state.rb_dedup.get_user_stats(
            conn, user_id, "quiz"
        )
        
        return {
            "success": True,
            "stats": stats,
            "score": score
        }

@app.post("/api/content/quote/{quote_id}/complete")
async def mark_quote_completed(
    quote_id: str,
    user_id: str = Query(..., description="User ID"),
    challenge_passed: bool = Query(False, description="Whether challenge was passed")
):
    """Mark a quote challenge as completed"""
    async with db.pool.acquire() as conn:
        await app.state.rb_dedup.mark_content_completed(
            conn, user_id, "quote", quote_id
        )
        
        # Track challenge result if passed
        if challenge_passed:
            # Update user stats for quote challenges
            await conn.execute("""
                UPDATE users 
                SET quote_challenges_passed = COALESCE(quote_challenges_passed, 0) + 1
                WHERE id = $1
            """, UUID(user_id))
        
        stats = await app.state.rb_dedup.get_user_stats(
            conn, user_id, "quote"
        )
        
        return {
            "success": True,
            "stats": stats,
            "challenge_passed": challenge_passed
        }

@app.post("/api/content/{content_type}/{content_id}/complete")
async def mark_content_completed(
    content_type: str,
    content_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Generic endpoint to mark any content as completed"""
    
    valid_types = ['quiz', 'quote', 'joke', 'pun', 'trivia', 'factoid']
    if content_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid content type")
    
    async with db.pool.acquire() as conn:
        await app.state.rb_dedup.mark_content_completed(
            conn, user_id, content_type, content_id
        )
        
        stats = await app.state.rb_dedup.get_user_stats(
            conn, user_id, content_type
        )
        
        return {
            "success": True,
            "stats": stats
        }

# ============================================
# 9. ADD USER STATS ENDPOINT (new)
# ============================================

@app.get("/api/users/{user_id}/content-stats")
async def get_user_content_stats(
    user_id: str,
    content_type: Optional[str] = Query(None, description="Filter by content type")
):
    """Get user's content consumption statistics"""
    
    async with db.pool.acquire() as conn:
        if content_type:
            # Single content type stats
            stats = await app.state.rb_dedup.get_user_stats(
                conn, user_id, content_type
            )
            return {content_type: stats}
        else:
            # All content types
            all_stats = {}
            for ctype in ['quiz', 'quote', 'joke', 'pun', 'trivia']:
                all_stats[ctype] = await app.state.rb_dedup.get_user_stats(
                    conn, user_id, ctype
                )
            return all_stats

# ============================================
# 10. UPDATE EXISTING TRACKING (around line 1220)
# ============================================
# Replace the track_flashcard_view endpoint:
@app.post("/api/flashcards/track-view")
async def track_flashcard_view(request: Dict[str, Any]):
    """
    Track flashcard view - now uses roaring bitmaps
    This is kept for backward compatibility
    """
    user_id = request.get("user_id")
    content_id = request.get("content_id")
    content_type = request.get("content_type", "").replace("_set", "")  # Remove _set suffix
    
    if not user_id or not content_id:
        return {"status": "skipped", "reason": "Missing user_id or content_id"}
    
    try:
        async with db.pool.acquire() as conn:
            await app.state.rb_dedup.mark_content_seen(
                conn, user_id, content_type, content_id
            )
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Error tracking view: {e}")
        return {"status": "error", "message": "Tracking failed"}

# ============================================
# 11. FRONTEND INTEGRATION NOTES
# ============================================
"""
Frontend Changes Needed:

1. Pass user_id to all content fetch endpoints:
   - /api/content/quiz/sets?user_id={userId}
   - /api/content/quote/sets?user_id={userId}
   - etc.

2. Call completion endpoints when content is finished:
   - POST /api/content/quiz/{quizId}/complete?user_id={userId}
   - POST /api/content/quote/{quoteId}/complete?user_id={userId}&challenge_passed=true

3. Optional: Show progress stats to users:
   - GET /api/users/{userId}/content-stats

4. The system automatically marks content as "seen" when fetched,
   so no additional tracking calls needed for views.
"""
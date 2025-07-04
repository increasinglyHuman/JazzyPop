# New quiz API endpoints for main.py
# Add these to your main.py file

from typing import List, Optional
from fastapi import Query

@app.get("/api/content/quiz/sets")
async def get_quiz_sets(
    count: int = Query(default=1, ge=1, le=100, description="Number of quiz sets to return"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    mode: str = Query(default="random", description="Mode selection: random, poqpoq, chaos, zen, speed"),
    order: str = Query(default="random", description="Order: random, newest, oldest"),
    include_variations: bool = Query(default=True, description="Include mode variations")
) -> List[Dict[str, Any]]:
    """
    Get multiple quiz sets with filtering options
    
    - count: Number of quiz sets to return (1-100)
    - category: Filter by specific category (e.g., 'science', 'gaming')
    - mode: Which mode variation to include (random will vary per quiz)
    - order: How to sort results (random, newest first, oldest first)
    - include_variations: Whether to include mode variations in response
    """
    
    # Valid categories from the frontend
    valid_categories = [
        'technology', 'science', 'history', 'geography', 'literature',
        'film', 'music', 'art', 'sports', 'nature', 'animals', 'food_cuisine',
        'pop_culture', 'mythology', 'space', 'gaming', 'internet_culture',
        'architecture', 'ancient_architecture', 'fashion_design', 'inventions',
        'famous_lies', 'language_evolution', 'dinosaurs', 'fame_glory'
    ]
    
    # Validate category if provided
    if category and category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )
    
    async with db.pool.acquire() as conn:
        # Build the query
        query_parts = [
            "SELECT c.id, c.type, c.data, c.metadata, c.created_at",
            "FROM content c",
            "WHERE c.type = 'quiz_set'",
            "AND c.is_active = true"
        ]
        
        params = []
        param_count = 0
        
        # Add category filter if specified
        if category:
            param_count += 1
            query_parts.append(f"AND c.data->>'category' = ${param_count}")
            params.append(category)
        
        # Add ordering
        if order == "newest":
            query_parts.append("ORDER BY c.created_at DESC")
        elif order == "oldest":
            query_parts.append("ORDER BY c.created_at ASC")
        else:  # random
            query_parts.append("ORDER BY RANDOM()")
        
        # Add limit
        param_count += 1
        query_parts.append(f"LIMIT ${param_count}")
        params.append(count)
        
        # Execute query
        query = " ".join(query_parts)
        rows = await conn.fetch(query, *params)
        
        results = []
        for row in rows:
            quiz_data = {
                "id": str(row["id"]),
                "type": row["type"],
                "data": json.loads(row["data"]) if isinstance(row["data"], str) else row["data"],
                "metadata": json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                "created_at": row["created_at"].isoformat()
            }
            
            # Add mode variations if requested
            if include_variations:
                # Determine which mode(s) to fetch
                if mode == "random":
                    # Pick a random mode for this quiz
                    import random
                    selected_mode = random.choice(['chaos', 'zen', 'speed', 'poqpoq'])
                else:
                    selected_mode = mode if mode in ['chaos', 'zen', 'speed'] else 'poqpoq'
                
                # Fetch the variation
                var_query = """
                    SELECT mode, variation_data 
                    FROM content_variations 
                    WHERE content_id = $1 AND mode = $2
                """
                
                variation = await conn.fetchrow(var_query, row["id"], selected_mode)
                
                if variation:
                    var_data = json.loads(variation["variation_data"]) if isinstance(variation["variation_data"], str) else variation["variation_data"]
                    
                    # Apply variation to quiz data
                    if selected_mode == 'chaos' and 'questions' in var_data:
                        quiz_data["data"]["questions"] = var_data["questions"]
                        quiz_data["mode"] = "chaos"
                        quiz_data["mode_effects"] = var_data.get("chaos_effects", [])
                    elif selected_mode == 'zen' and 'questions' in var_data:
                        # Merge zen hints into questions
                        for i, q in enumerate(quiz_data["data"]["questions"]):
                            if i < len(var_data["questions"]):
                                q["hint"] = var_data["questions"][i].get("hint", "")
                        quiz_data["mode"] = "zen"
                        quiz_data["no_timer"] = True
                    elif selected_mode == 'speed':
                        quiz_data["mode"] = "speed"
                        quiz_data["time_per_question"] = var_data.get("time_per_question", 10)
                    else:
                        quiz_data["mode"] = "poqpoq"
            
            results.append(quiz_data)
        
        return results

@app.get("/api/content/quiz/categories")
async def get_quiz_categories():
    """Get list of available categories with quiz counts"""
    async with db.pool.acquire() as conn:
        query = """
            SELECT 
                data->>'category' as category,
                COUNT(*) as count
            FROM content
            WHERE type = 'quiz_set'
            AND is_active = true
            GROUP BY data->>'category'
            ORDER BY count DESC
        """
        
        rows = await conn.fetch(query)
        
        return [
            {
                "category": row["category"],
                "count": row["count"],
                "display_name": row["category"].replace('_', ' ').title()
            }
            for row in rows
        ]

@app.get("/api/content/quiz/stats")
async def get_quiz_stats():
    """Get statistics about quiz content"""
    async with db.pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_quiz_sets,
                COUNT(DISTINCT data->>'category') as total_categories,
                MIN(created_at) as oldest_quiz,
                MAX(created_at) as newest_quiz
            FROM content
            WHERE type = 'quiz_set'
            AND is_active = true
        """)
        
        # Get mode variation stats
        var_stats = await conn.fetchrow("""
            SELECT 
                COUNT(DISTINCT content_id) as quizzes_with_variations,
                COUNT(CASE WHEN mode = 'chaos' THEN 1 END) as chaos_count,
                COUNT(CASE WHEN mode = 'zen' THEN 1 END) as zen_count,
                COUNT(CASE WHEN mode = 'speed' THEN 1 END) as speed_count
            FROM content_variations cv
            JOIN content c ON cv.content_id = c.id
            WHERE c.type = 'quiz_set'
        """)
        
        return {
            "total_quiz_sets": stats["total_quiz_sets"],
            "total_categories": stats["total_categories"],
            "oldest_quiz": stats["oldest_quiz"].isoformat(),
            "newest_quiz": stats["newest_quiz"].isoformat(),
            "quizzes_with_variations": var_stats["quizzes_with_variations"],
            "mode_variations": {
                "chaos": var_stats["chaos_count"],
                "zen": var_stats["zen_count"],
                "speed": var_stats["speed_count"]
            }
        }
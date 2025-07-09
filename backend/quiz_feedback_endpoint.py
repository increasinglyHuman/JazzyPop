"""
New endpoint for fetching quiz feedback captions
Add this to main.py
"""

@app.get("/api/content/quiz/{quiz_id}/feedback",
         response_model=Dict[str, Any],
         summary="Get feedback captions for a quiz",
         description="Returns the feedback captions for each answer in a quiz if validation has been completed")
async def get_quiz_feedback(quiz_id: str) -> Dict[str, Any]:
    """
    Get feedback captions for a specific quiz
    
    Returns:
    - quiz_id: The quiz ID
    - has_feedback: Boolean indicating if feedback exists
    - feedback_captions: Object with feedback for each question
    """
    try:
        async with db.pool.acquire() as conn:
            # Get the quiz with validation data
            result = await conn.fetchrow("""
                SELECT 
                    id,
                    data,
                    validation_passes,
                    validation_status
                FROM content 
                WHERE id = $1 AND type = 'quiz_set'
            """, UUID(quiz_id))
            
            if not result:
                raise HTTPException(status_code=404, detail="Quiz not found")
            
            # Extract feedback captions from validation_passes
            validation_passes = result['validation_passes'] or {}
            validation_results = validation_passes.get('validation_results', [])
            
            feedback_data = {
                'quiz_id': quiz_id,
                'has_feedback': False,
                'feedback_captions': {},
                'validation_status': result['validation_status']
            }
            
            # Check if we have validation results with feedback
            if validation_results and len(validation_results) > 0:
                first_result = validation_results[0]
                if 'feedback_captions' in first_result:
                    feedback_data['has_feedback'] = True
                    feedback_data['feedback_captions'] = first_result['feedback_captions']
            
            # Structure the feedback by question index
            quiz_data = result['data']
            questions = quiz_data.get('questions', [])
            
            structured_feedback = {}
            for idx, question in enumerate(questions):
                question_feedback = {}
                
                # Get feedback for each answer option
                for answer in question.get('answers', []):
                    answer_id = answer['id']
                    if answer_id in feedback_data['feedback_captions']:
                        question_feedback[answer_id] = feedback_data['feedback_captions'][answer_id]
                
                if question_feedback:
                    structured_feedback[idx] = question_feedback
            
            feedback_data['feedback_by_question'] = structured_feedback
            
            return feedback_data
            
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")
    except Exception as e:
        logger.error(f"Error fetching quiz feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch quiz feedback")
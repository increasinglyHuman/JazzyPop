"""
Quiz Feedback API Endpoint
Add this to main.py after the quiz answer endpoint
"""

from fastapi import HTTPException, Query
from typing import Dict, Any
from uuid import UUID
import logging
import json

logger = logging.getLogger(__name__)

def get_quiz_feedback(app, db):
    """
    Create and return the quiz feedback endpoint
    """
    
    @app.get("/api/content/quiz/{quiz_id}/answer-feedback-captions",
             response_model=Dict[str, Any],
             summary="Get answer feedback captions for a quiz",
             description="Returns the educational feedback captions for each answer option in a quiz (generated during validation)")
    async def _get_quiz_answer_feedback_captions(quiz_id: str) -> Dict[str, Any]:
        """
        Get answer feedback captions for a specific quiz
        
        Returns:
        - quiz_id: The quiz ID
        - has_answer_feedback_captions: Boolean indicating if feedback captions exist
        - answer_feedback_captions: Object with feedback for each answer option
        - feedback_by_question: Organized by question index
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
                validation_passes = result['validation_passes']
                
                # Parse JSON string if needed
                if isinstance(validation_passes, str):
                    validation_passes = json.loads(validation_passes) if validation_passes else {}
                elif validation_passes is None:
                    validation_passes = {}
                    
                validation_results = validation_passes.get('validation_results', [])
                
                feedback_data = {
                    'quiz_id': quiz_id,
                    'has_answer_feedback_captions': False,
                    'answer_feedback_captions': {},
                    'validation_status': result['validation_status']
                }
                
                # Check if we have validation results with feedback
                if validation_results and len(validation_results) > 0:
                    first_result = validation_results[0]
                    if 'feedback_captions' in first_result:
                        feedback_data['has_answer_feedback_captions'] = True
                        # Store all feedback captions
                        all_feedback = first_result['feedback_captions']
                        
                        # Structure the feedback by question index
                        quiz_data = result['data']
                        # Parse quiz data if it's a JSON string
                        if isinstance(quiz_data, str):
                            quiz_data = json.loads(quiz_data)
                            
                        questions = quiz_data.get('questions', [])
                        
                        structured_feedback = {}
                        for idx, question in enumerate(questions):
                            question_feedback = {}
                            
                            # Get feedback for each answer option
                            for answer in question.get('answers', []):
                                answer_id = answer['id']
                                if answer_id in all_feedback:
                                    question_feedback[answer_id] = all_feedback[answer_id]
                            
                            if question_feedback:
                                structured_feedback[str(idx)] = question_feedback
                        
                        feedback_data['answer_feedback_by_question'] = structured_feedback
                        feedback_data['all_answer_feedback_captions'] = all_feedback
                
                return feedback_data
                
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid quiz ID format")
        except Exception as e:
            logger.error(f"Error fetching quiz feedback: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch quiz feedback")
    
    return _get_quiz_answer_feedback_captions

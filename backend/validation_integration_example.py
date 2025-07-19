"""
Example integration of the new strict validation system
Shows how to replace the old 3-pass system with the new single-pass + rebalancer
"""

import json
import asyncio
from typing import Dict, Optional
from validation_prompts_strict import StrictValidationPrompts
from quiz_pack_rebalancer import QuizPackRebalancer


async def validate_quiz_strict(quiz_data: Dict, category: str, mode: str, 
                              llm_client) -> Dict:
    """
    Single-pass strict validation
    Returns validation result with pass/fail decision
    """
    # Get the strict validation prompt
    prompt = StrictValidationPrompts.get_validation_prompt(
        quiz_data, 
        category, 
        mode
    )
    
    try:
        # Call your LLM (adjust based on your actual LLM integration)
        response = await llm_client.generate(prompt)
        
        # Parse the JSON response
        result = json.loads(response)
        
        # Determine if quiz passes validation
        validation_passed = (
            result['validation_result']['status'] == 'approved' and
            result['validation_result']['correct_answer_accurate'] and
            result['validation_result']['single_correct_answer'] and
            result['validation_result']['confidence_score'] >= 0.8
        )
        
        # For chaos mode, be more lenient on wrong answer validation
        if mode.lower() == 'chaos':
            validation_passed = (
                result['validation_result']['status'] == 'approved' and
                result['validation_result']['correct_answer_accurate'] and
                result['validation_result']['single_correct_answer']
            )
        
        return {
            'passed': validation_passed,
            'result': result,
            'rejection_reason': result.get('rejection_reason', 'none')
        }
        
    except json.JSONDecodeError:
        return {
            'passed': False,
            'result': None,
            'rejection_reason': 'Invalid JSON response from validator'
        }
    except Exception as e:
        return {
            'passed': False,
            'result': None,
            'rejection_reason': f'Validation error: {str(e)}'
        }


async def process_quiz_set_with_strict_validation(quiz_set_id: str, 
                                                 quizzes: list,
                                                 category: str,
                                                 mode: str,
                                                 db_conn,
                                                 llm_client) -> Dict:
    """
    Process a quiz set with strict validation
    Removes failed quizzes immediately
    """
    stats = {
        'total_quizzes': len(quizzes),
        'passed': 0,
        'failed': 0,
        'remaining_in_set': 0
    }
    
    validated_quizzes = []
    
    for quiz in quizzes:
        # Validate each quiz
        validation = await validate_quiz_strict(quiz, category, mode, llm_client)
        
        if validation['passed']:
            stats['passed'] += 1
            validated_quizzes.append({
                'quiz': quiz,
                'feedback': validation['result']['feedback_captions'],
                'tags': validation['result']['tags'],
                'difficulty': validation['result']['difficulty_rating']
            })
        else:
            stats['failed'] += 1
            # Log the rejection
            await log_rejected_quiz(
                db_conn, 
                quiz, 
                validation['rejection_reason'],
                quiz_set_id
            )
    
    # Update the quiz set with only validated quizzes
    if validated_quizzes:
        await update_quiz_set_questions(
            db_conn,
            quiz_set_id,
            validated_quizzes
        )
        stats['remaining_in_set'] = len(validated_quizzes)
    else:
        # Mark set as invalid if no quizzes passed
        await mark_set_invalid(db_conn, quiz_set_id)
        
    return stats


async def log_rejected_quiz(db_conn, quiz: Dict, reason: str, set_id: str):
    """Log rejected quizzes for analysis"""
    query = """
    INSERT INTO rejected_quizzes (
        quiz_id, 
        original_data, 
        rejection_reason, 
        rejected_from_set,
        rejected_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (quiz_id) DO UPDATE
    SET rejection_count = rejected_quizzes.rejection_count + 1,
        last_rejection_reason = $3,
        last_rejected_at = CURRENT_TIMESTAMP
    """
    
    await db_conn.execute(
        query,
        quiz.get('id'),
        json.dumps(quiz),
        reason,
        set_id
    )


async def update_quiz_set_questions(db_conn, set_id: str, validated_quizzes: list):
    """Update quiz set to only include validated quizzes"""
    # First, remove all existing questions from the set
    delete_query = "DELETE FROM quiz_set_questions WHERE set_id = $1"
    await db_conn.execute(delete_query, set_id)
    
    # Insert only validated quizzes
    insert_query = """
    INSERT INTO quiz_set_questions (set_id, quiz_id, position, metadata)
    VALUES ($1, $2, $3, $4)
    """
    
    for i, validated in enumerate(validated_quizzes):
        metadata = {
            'feedback': validated['feedback'],
            'tags': validated['tags'],
            'difficulty': validated['difficulty'],
            'validated_at': datetime.utcnow().isoformat()
        }
        
        await db_conn.execute(
            insert_query,
            set_id,
            validated['quiz']['id'],
            i,
            json.dumps(metadata)
        )


async def mark_set_invalid(db_conn, set_id: str):
    """Mark a quiz set as invalid when no quizzes pass validation"""
    query = """
    UPDATE quiz_sets
    SET is_active = false,
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{validation_failed}',
            'true'::jsonb
        ) || jsonb_build_object(
            'invalidated_at', CURRENT_TIMESTAMP,
            'reason', 'no_quizzes_passed_validation'
        )
    WHERE set_id = $1
    """
    await db_conn.execute(query, set_id)


# Example usage in your main validation workflow
async def run_validation_and_rebalancing_cycle(db_pool, llm_client):
    """
    Complete cycle: validate all pending sets, then rebalance
    """
    # Step 1: Find and validate all pending quiz sets
    async with db_pool.acquire() as conn:
        # Find sets that need validation
        pending_sets = await conn.fetch("""
            SELECT set_id, category, mode
            FROM quiz_sets
            WHERE is_active = true
            AND metadata->>'validated' IS NULL
            OR metadata->>'validated' = 'false'
        """)
        
        for set_row in pending_sets:
            # Get all quizzes in this set
            quizzes = await conn.fetch("""
                SELECT q.*
                FROM quizzes q
                JOIN quiz_set_questions qsq ON q.id = qsq.quiz_id
                WHERE qsq.set_id = $1
                ORDER BY qsq.position
            """, set_row['set_id'])
            
            # Validate the set
            stats = await process_quiz_set_with_strict_validation(
                set_row['set_id'],
                [dict(q) for q in quizzes],
                set_row['category'],
                set_row['mode'],
                conn,
                llm_client
            )
            
            print(f"Validated set {set_row['set_id']}: {stats}")
            
            # Mark set as validated
            await conn.execute("""
                UPDATE quiz_sets
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{validated}',
                    'true'::jsonb
                )
                WHERE set_id = $1
            """, set_row['set_id'])
    
    # Step 2: Run the rebalancer to fix partial packs
    print("\nRunning pack rebalancer...")
    rebalancer = QuizPackRebalancer(db_pool)
    rebalance_stats = await rebalancer.rebalance_all_packs()
    print(f"Rebalancing complete: {rebalance_stats}")


# Migration helper to switch from old to new system
def get_migration_notes():
    """
    Notes for migrating from the old 3-pass system to the new strict system
    """
    return """
    MIGRATION STEPS:
    
    1. Create the necessary tables:
    ```sql
    -- Table for rejected quizzes
    CREATE TABLE IF NOT EXISTS rejected_quizzes (
        quiz_id TEXT PRIMARY KEY,
        original_data JSONB NOT NULL,
        rejection_reason TEXT,
        rejected_from_set TEXT,
        rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rejection_count INTEGER DEFAULT 1,
        last_rejection_reason TEXT,
        last_rejected_at TIMESTAMP
    );
    
    -- Table for archiving orphan quizzes before deletion
    CREATE TABLE IF NOT EXISTS archived_orphan_quizzes (
        quiz_id TEXT PRIMARY KEY,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
    );
    
    -- Index for finding archived quizzes by date
    CREATE INDEX idx_archived_orphans_date ON archived_orphan_quizzes(archived_at);
    ```
    
    2. Update your validation workflow:
    - Replace the 3-pass validation with single strict validation
    - Remove revision attempts
    - Add rebalancer to your scheduled tasks
    
    3. Schedule the rebalancer:
    - Run after batch validation
    - Can also run periodically (e.g., every 30 minutes)
    - Monitor partial pack counts
    
    4. Monitor rejection rates:
    - Query rejected_quizzes table for patterns
    - Adjust prompt generation if rejection rate too high
    - Special attention to chaos mode quizzes
    """
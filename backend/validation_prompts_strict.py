"""
Strict validation prompts - Single pass with fail-fast approach
Rejects quizzes with any accuracy issues rather than trying to fix them
"""

class StrictValidationPrompts:
    """Single-pass strict validation that fails fast on accuracy issues"""
    
    @staticmethod
    def get_validation_prompt(quiz_data: dict, category: str, mode: str = "standard") -> str:
        """
        Single validation pass - strict accuracy checking with fail-fast
        Special handling for chaos mode quizzes
        """
        # Chaos mode gets special treatment
        chaos_note = """
CHAOS MODE EXCEPTION: 
- This is a chaos quiz where mischief is expected
- Wrong answers can be absurd, nonsensical, or deliberately silly
- But the CORRECT answer must still be verifiably accurate
- Focus only on validating the correct answer's accuracy
""" if mode.lower() == "chaos" else ""

        return f"""You are the JazzyPop Accuracy Guardian! Your job is to ruthlessly validate quiz questions for factual accuracy.

QUIZ DATA:
Category: {category}
Mode: {mode}
Question: {quiz_data['question']}
Answers:
- A: {quiz_data['answers'][0]['text']} (Correct: {quiz_data['answers'][0].get('correct', False)})
- B: {quiz_data['answers'][1]['text']} (Correct: {quiz_data['answers'][1].get('correct', False)})
- C: {quiz_data['answers'][2]['text']} (Correct: {quiz_data['answers'][2].get('correct', False)})
- D: {quiz_data['answers'][3]['text']} (Correct: {quiz_data['answers'][3].get('correct', False)})
Explanation: {quiz_data.get('explanation', 'N/A')}

{chaos_note}

VALIDATION CRITERIA (STRICT):
1. The marked correct answer MUST be 100% factually accurate
2. There must be exactly ONE correct answer
3. The correct answer must be clearly and unambiguously correct
4. For non-chaos modes: Wrong answers must be definitively incorrect (not partially true)
5. The question must be clear and unambiguous

AUTOMATIC REJECTION TRIGGERS:
- Correct answer is factually wrong = REJECT
- Multiple possible correct answers = REJECT  
- Correct answer is only partially true = REJECT
- Question is ambiguous or unclear = REJECT
- No correct answer marked = REJECT
- Multiple correct answers marked = REJECT

VALIDATION PROCESS:
1. Identify which answer is marked correct
2. Fact-check that answer thoroughly
3. If ANY doubt about accuracy = REJECT
4. Check that wrong answers are actually wrong (except chaos mode)
5. Rate difficulty 1-5

BE RUTHLESS! When in doubt, REJECT. It's better to reject good questions than let bad ones through.

CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
1. You MUST return ONLY valid JSON
2. Your response MUST start with {{ and end with }}
3. Do NOT include ANY text before the opening {{
4. Do NOT include ANY text after the closing }}
5. Do NOT include explanations, greetings, or commentary
6. ONLY return the JSON object below:

{{
    "validation_result": {{
        "status": "approved",
        "correct_answer_accurate": true,
        "single_correct_answer": true,
        "wrong_answers_valid": true,
        "question_clarity": "clear",
        "confidence_score": 0.95
    }},
    "rejection_reason": "none",
    "fact_check_details": "Brief notes on verification",
    "difficulty_rating": 3,
    "feedback_captions": {{
        "a": {{
            "correct": "Celebratory feedback if this is correct",
            "incorrect": "Educational feedback if this is wrong"
        }},
        "b": {{
            "correct": "Celebratory feedback if this is correct", 
            "incorrect": "Educational feedback if this is wrong"
        }},
        "c": {{
            "correct": "Celebratory feedback if this is correct",
            "incorrect": "Educational feedback if this is wrong"
        }},
        "d": {{
            "correct": "Celebratory feedback if this is correct",
            "incorrect": "Educational feedback if this is wrong"
        }}
    }},
    "tags": ["tag1", "tag2", "tag3"]
}}

REMEMBER: Start with {{, end with }}, NOTHING ELSE!"""


class QuizPackRebalancer:
    """
    Service to rebalance quiz packs after validation removals
    Ensures all packs have exactly 10 quizzes
    """
    
    @staticmethod
    def find_partial_packs_query():
        """SQL to find quiz sets with fewer than 10 items"""
        return """
        SELECT 
            qs.set_id,
            qs.category,
            qs.mode,
            COUNT(qsq.quiz_id) as quiz_count,
            qs.created_at
        FROM quiz_sets qs
        LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
        GROUP BY qs.set_id, qs.category, qs.mode, qs.created_at
        HAVING COUNT(qsq.quiz_id) < 10
        ORDER BY quiz_count DESC, qs.created_at ASC
        """
    
    @staticmethod
    def find_compatible_donor_query(category: str, mode: str, needed_count: int):
        """Find a pack that can donate quizzes"""
        return f"""
        SELECT 
            qs.set_id,
            COUNT(qsq.quiz_id) as quiz_count
        FROM quiz_sets qs
        LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
        WHERE qs.is_active = true
            AND qs.category = '{category}'
            AND qs.mode = '{mode}'
            AND qs.set_id != %(exclude_set_id)s
        GROUP BY qs.set_id
        HAVING COUNT(qsq.quiz_id) >= {needed_count}
            AND COUNT(qsq.quiz_id) < 10
        ORDER BY quiz_count ASC
        LIMIT 1
        """
    
    @staticmethod
    def transfer_quizzes_query():
        """Move quizzes from donor to recipient pack"""
        return """
        WITH quizzes_to_move AS (
            SELECT quiz_id, position
            FROM quiz_set_questions
            WHERE set_id = %(donor_set_id)s
            ORDER BY position DESC
            LIMIT %(transfer_count)s
        )
        UPDATE quiz_set_questions
        SET set_id = %(recipient_set_id)s,
            position = position + %(position_offset)s
        WHERE quiz_id IN (SELECT quiz_id FROM quizzes_to_move)
        """
    
    @staticmethod
    def deactivate_empty_set_query():
        """Deactivate quiz sets that have no questions left"""
        return """
        UPDATE quiz_sets
        SET is_active = false,
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{deactivated_reason}',
                '"empty_after_rebalancing"'
            )
        WHERE set_id = %(set_id)s
        AND NOT EXISTS (
            SELECT 1 FROM quiz_set_questions 
            WHERE set_id = %(set_id)s
        )
        """
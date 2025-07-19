"""
Strict Factual Validation Prompts
Ensures questions have objective, verifiable answers - no opinions!
"""

class FactualValidationPrompts:
    """Validation prompts that reject subjective/opinion questions"""
    
    @staticmethod
    def get_factual_validation_prompt(quiz_data: dict, category: str, mode: str) -> str:
        """
        Validation prompt that specifically checks for factual vs opinion questions
        """
        
        # Extract question and answers for analysis
        question_text = quiz_data['question']
        answers = quiz_data['answers']
        correct_answer = None
        
        for ans in answers:
            if ans.get('correct', False):
                correct_answer = ans['text']
                break
        
        return f"""You are the JazzyPop Factual Accuracy Guardian. Your PRIMARY job is to ensure questions have OBJECTIVE, FACTUAL answers - not opinions!

QUIZ DATA:
Category: {category}
Mode: {mode}
Question: {question_text}
Answers:
- A: {answers[0]['text']} {"[MARKED CORRECT]" if answers[0].get('correct') else ""}
- B: {answers[1]['text']} {"[MARKED CORRECT]" if answers[1].get('correct') else ""}
- C: {answers[2]['text']} {"[MARKED CORRECT]" if answers[2].get('correct') else ""}
- D: {answers[3]['text']} {"[MARKED CORRECT]" if answers[3].get('correct') else ""}

CRITICAL VALIDATION RULES:

1. REJECT OPINION-BASED QUESTIONS:
   ❌ "What's the coolest..."
   ❌ "What's the silliest..."
   ❌ "What's the best..."
   ❌ "What's the most fun..."
   ❌ "Which is more awesome..."
   ❌ "What would be the funniest..."
   
2. REJECT SUBJECTIVE QUESTIONS:
   ❌ Questions about preferences
   ❌ Questions about feelings
   ❌ Questions about what someone "might" think
   ❌ Questions with no verifiable correct answer
   
3. ACCEPT ONLY FACTUAL QUESTIONS:
   ✓ Historical facts (dates, events, people)
   ✓ Scientific facts (measurements, properties, discoveries)
   ✓ Geographic facts (locations, capitals, features)
   ✓ Mathematical facts (calculations, formulas)
   ✓ Verifiable trivia (records, statistics, documented facts)

4. SPECIAL CASES:
   - For chaos mode: Wrong answers can be silly, but there must still be ONE factually correct answer
   - For young children: Simple questions are OK, but must still be factual (e.g., "How many legs does a dog have?")
   - "Which came first" questions: OK if historically verifiable
   - Definition questions: OK if there's a standard definition

ANALYZE THIS QUESTION:
1. Can the correct answer be verified through reliable sources?
2. Would two knowledgeable people always agree on the answer?
3. Is there objective evidence for why one answer is correct?

RESPOND WITH ONLY THIS JSON:
{{
    "validation_passed": true/false,
    "is_factual_question": true/false,
    "confidence": 0.0-1.0,
    "primary_issue": "subjective|opinion_based|no_correct_answer|factual_error|ambiguous|good",
    "specific_problem": "Detailed explanation of why this is problematic",
    "suggested_fix": "How to make this question factual",
    "examples_of_better_questions": [
        "Example of a factual version of this question",
        "Another factual alternative"
    ]
}}

REMEMBER: Educational games need questions with clear, correct answers that can be learned - not debated!"""

    @staticmethod
    def get_opinion_detector_prompt(question_text: str) -> str:
        """
        Quick check if a question is opinion-based
        """
        return f"""Analyze this quiz question to determine if it's asking for an opinion or a fact.

Question: {question_text}

Opinion indicators to look for:
- Superlatives without measurement (best, worst, coolest, silliest)
- Preference words (favorite, prefer, like)
- Subjective descriptors (fun, boring, awesome, weird)
- "What do you think..." phrasing
- Questions about feelings or preferences

Respond with ONLY this JSON:
{{
    "is_opinion_based": true/false,
    "opinion_words_found": ["list", "of", "opinion", "words"],
    "can_be_made_factual": true/false,
    "factual_version": "Rewritten as a factual question if possible"
}}"""

    @staticmethod
    def get_question_improvement_prompt(quiz_data: dict) -> str:
        """
        Prompt to convert opinion questions to factual ones
        """
        question = quiz_data['question']
        category = quiz_data.get('category', 'general')
        
        return f"""You are helping improve a quiz question by making it factual instead of opinion-based.

ORIGINAL QUESTION: {question}
CATEGORY: {category}

This question appears to be asking for an opinion or subjective judgment. Convert it to a factual question that:
1. Has one objectively correct answer
2. Can be verified through reliable sources
3. Tests knowledge rather than preferences
4. Maintains the fun spirit of the original if possible

EXAMPLES OF CONVERSIONS:
- "What's the coolest planet?" → "Which planet has the fastest winds in our solar system?"
- "What's the silliest animal?" → "Which animal can sleep while standing up?"
- "What's the best superhero?" → "Which superhero first appeared in Action Comics #1?"
- "What's the most fun sport?" → "Which sport has the most players on the field at once?"

Provide 3 factual alternatives that maintain the topic but ask for verifiable information.

RESPOND WITH ONLY THIS JSON:
{{
    "factual_alternatives": [
        {{
            "question": "The improved factual question",
            "correct_answer": "The verifiable correct answer",
            "explanation": "Why this answer is factually correct"
        }},
        {{
            "question": "Second alternative factual question",
            "correct_answer": "The verifiable correct answer",
            "explanation": "Why this answer is factually correct"
        }},
        {{
            "question": "Third alternative factual question",
            "correct_answer": "The verifiable correct answer", 
            "explanation": "Why this answer is factually correct"
        }}
    ]
}}"""


# Example usage for detecting opinion questions
def detect_opinion_questions_examples():
    """Examples of opinion vs factual questions"""
    
    opinion_questions = [
        "What's the silliest thing you can find on the Moon?",
        "What's the coolest planet in our solar system?",
        "Which superhero is the most awesome?",
        "What's the best ice cream flavor?",
        "Which animal is the cutest?",
        "What's the most fun game to play?"
    ]
    
    factual_questions = [
        "How many moons does Jupiter have?",
        "What year did humans first land on the Moon?",
        "Which planet is known as the Red Planet?",
        "What is the capital of France?",
        "How many legs does a spider have?",
        "Which ocean is the largest?"
    ]
    
    edge_cases = [
        "Which is the tallest mountain on Earth?",  # Factual - measurable
        "Which came first: the chicken or the egg?",  # Depends on context
        "What color is the sky?",  # Factual but context-dependent
        "Which weighs more: a pound of feathers or a pound of rocks?"  # Trick question but factual
    ]
    
    return {
        'opinion_based': opinion_questions,
        'factual': factual_questions,
        'edge_cases': edge_cases
    }
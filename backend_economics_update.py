#!/usr/bin/env python3
"""
Script to add economics function to the backend and update the API endpoint.
This should be copied to the backend server and integrated into main.py
"""

print("""
=== Backend Economics Update Instructions ===

1. Copy the get_quiz_economics function to your main.py file (add it before the endpoints)

2. Update the get_quiz_sets endpoint in main.py:

Find this section:
    # Apply mode variations if requested
    if include_variations and quiz_sets:
        quiz_sets = apply_mode_variations(quiz_sets, mode)

Add AFTER it:
    # Add economics data to each quiz
    for quiz in quiz_sets:
        category = quiz.get('data', {}).get('category', 'general')
        difficulty = quiz.get('data', {}).get('difficulty', 'medium')
        quiz_mode = quiz.get('mode', mode if mode != 'random' else 'poqpoq')
        
        quiz['economics'] = get_quiz_economics(category, difficulty, quiz_mode)

3. Add this function to main.py (before the endpoints):
""")

print(open('add_economics_to_quizzes.py').read().split('# Example modification')[0])
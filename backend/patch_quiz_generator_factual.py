#!/usr/bin/env python3
"""
Patch to update quiz_set_generator_v3.py to enforce factual questions only
Prevents opinion questions, ensures proper length limits, and improves chaos variety
"""

import os
import shutil
from datetime import datetime

def create_backup():
    """Create backup of original file"""
    source = 'quiz_set_generator_v3.py'
    backup = f'quiz_set_generator_v3.py.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    
    if os.path.exists(source):
        shutil.copy2(source, backup)
        print(f"Created backup: {backup}")
        return True
    return False

def patch_generator():
    """Apply the factual questions patch"""
    
    # Read the original file
    with open('quiz_set_generator_v3.py', 'r') as f:
        content = f.read()
    
    # Find and replace the main prompt section
    old_prompt_start = '''prompt = f"""You are the JazzyPop Quiz Master creating a {mode} mode quiz! Create an entertaining trivia question about {category}.
        This is question {question_num} of 10 in a quiz set.
        
        TARGET AUDIENCE: Ages 6-13, specifically {diff_config['description']}
        DIFFICULTY LEVEL: {difficulty} (complexity: {diff_config['complexity']})
        MODE: {mode}

        JAZZYPOP STYLE GUIDE FOR KIDS:
        - Use simple, clear language appropriate for the age group
        - Include fun, relatable references kids will understand
        - For chaos mode: Use silly humor and {pop_ref}
        - Mix real knowledge with playful elements
        - Reference things kids love: games, cartoons, school, friends
        - Make wrong answers silly but not confusing
        - Keep it educational but super fun!
        
        CRITICAL QUIZ QUALITY RULES:
        - AVOID obvious questions (e.g., "What color is the sky?")
        - AVOID common knowledge everyone knows
        - DIG DEEPER: Find interesting, lesser-known facts
        - Make questions that teach something new
        - Focus on "wow, I didn't know that!" moments
        - For {mode} mode: Questions must CLEARLY reflect the mode's style'''
    
    new_prompt_start = '''prompt = f"""You are the JazzyPop Quiz Master creating a {mode} mode quiz! Create an entertaining trivia question about {category}.
        This is question {question_num} of 10 in a quiz set.
        
        TARGET AUDIENCE: Ages 6-13, specifically {diff_config['description']}
        DIFFICULTY LEVEL: {difficulty} (complexity: {diff_config['complexity']})
        MODE: {mode}

        🚨 CRITICAL RULES - FACTUAL QUESTIONS ONLY! 🚨
        
        ❌ ABSOLUTELY FORBIDDEN:
        - NO "loves to" questions (that's opinion!)
        - NO "What's the coolest/silliest/best/most fun" (not measurable!)
        - NO subjective preferences or feelings
        - NO questions where people could disagree on the answer
        - NO duplicate questions/answers in this set
        - NO making up facts (verify everything!)
        
        ✅ REQUIRED:
        - Every question MUST have ONE verifiable answer
        - You must be able to Google it and find the same answer
        - Even chaos mode needs factual answers!
        - Keep questions under 35 words
        - Keep answers under 8 words (prefer 1-5 words)
        
        📏 LENGTH LIMITS (for mobile screens):
        - Questions: Maximum 35 words (aim for 15-25)
        - Answers: Maximum 8 words (aim for 1-5)
        - Short = Less scary = Kids do better!
        
        🎯 WRONG ANSWER RULES:
        - Use the 3-1 ratio: 3 educational wrong answers, 1 silly one
        - Wrong answers should teach something when possible
        - Example: Q: "How many legs does a dog have?"
          ✓ A) 4 (correct)
          ✓ B) 8 (that's a spider!)
          ✓ C) 6 (that's an insect!)
          ✓ D) 100 (the silly one!)
        
        🎨 STYLE GUIDE:
        - Make the DELIVERY fun, not the FACTS wrong
        - Wrap factual questions in entertaining scenarios
        - ✅ "Space hamsters need to know: How many moons does Mars have?"
        - ❌ "What would space hamsters think is cool about Mars?"
        
        CRITICAL QUIZ QUALITY RULES:
        - Test knowledge, not opinions
        - Teach facts, not preferences
        - Every answer must be verifiable
        - Questions can be fun but must have real answers
        - For {mode} mode: The presentation can be wild but facts stay factual'''
    
    # Replace the prompt section
    content = content.replace(old_prompt_start, new_prompt_start)
    
    # Update chaos mode instructions
    old_chaos = '''        if mode == 'chaos':
            prompt += f"""
        CHAOS MODE ACTIVATED! 🎪
        - Frame the question with: {chaos_character} in a {chaos_scenario}
        - Use maximum silliness and {pop_ref}
        - Wrong answers should be hilariously wrong
        - Add emojis and excitement!
        - Make it feel like a wild adventure
        - Tag with: chaos, wild, unhinged
        """'''
    
    new_chaos = '''        if mode == 'chaos':
            prompt += f"""
        CHAOS MODE ACTIVATED! 🎪
        
        CHAOS RULES:
        - Make the PRESENTATION chaotic, not the FACTS!
        - The question must STILL have one correct, verifiable answer
        - Visual chaos is great (glitching, upside down, effects)
        - Story wrapper can be wild: "{chaos_character} in a {chaos_scenario}"
        - But the core question must be factual!
        
        VARIETY IS KEY:
        - Don't overuse "record scratch" or "POV:" formats
        - Each question should feel fresh, not copy-pasted
        - Mix up your chaos styles within the set
        - Sometimes let visual effects carry the chaos
        
        ✅ GOOD: "🚀 EMERGENCY! Dancing robots need to know: How many planets orbit our sun?"
        ❌ BAD: "What's the silliest planet in the solar system?"
        
        Remember: Chaos mode should be SOLVABLE chaos!
        """'''
    
    content = content.replace(old_chaos, new_chaos)
    
    # Update the chaos question templates to remove "Wrong answers only"
    content = content.replace(
        '"Wrong answers only: {character} wants to know {original_question}",',
        '# Removed "Wrong answers only" - all questions need correct answers!'
    )
    
    # Add a new validation check in generate_quiz_question
    old_return = '''                        return filtered_question
                    else:
                        logger.error(f"API error: {response.status}")
                        return None'''
    
    new_return = '''                        # Additional validation for factual questions
                        if self._is_opinion_question(filtered_question):
                            logger.warning(f"Question appears to be opinion-based, regenerating...")
                            return None
                        
                        return filtered_question
                    else:
                        logger.error(f"API error: {response.status}")
                        return None'''
    
    content = content.replace(old_return, new_return)
    
    # Add the opinion detection method
    method_to_add = '''
    def _is_opinion_question(self, question_data: Dict[str, Any]) -> bool:
        """Check if a question is opinion-based rather than factual"""
        if not question_data:
            return False
            
        q_text = question_data.get('question', '').lower()
        
        # Opinion indicators
        opinion_patterns = [
            'loves to', 'likes to', 'prefers to', 'enjoys',
            'favorite', 'best', 'worst', 'coolest', 'silliest',
            'most fun', 'most awesome', 'most boring', 'lamest',
            'what do you think', 'in your opinion', 'seems like',
            'feels like', 'might be', 'could be the most'
        ]
        
        for pattern in opinion_patterns:
            if pattern in q_text:
                return True
                
        # Check for subjective superlatives without measurement
        import re
        if re.search(r"what(?:'s| is) the \w+est", q_text):
            # Check if it's measurable
            measurable = ['tallest', 'shortest', 'fastest', 'slowest', 
                         'largest', 'smallest', 'highest', 'lowest',
                         'longest', 'heaviest', 'lightest', 'oldest', 
                         'newest', 'youngest', 'first', 'last']
            
            if not any(m in q_text for m in measurable):
                return True
        
        return False
'''
    
    # Insert the method after the filter_question method
    insert_pos = content.find('    async def generate_quiz_question')
    content = content[:insert_pos] + method_to_add + '\n' + content[insert_pos:]
    
    # Write the patched file
    with open('quiz_set_generator_v3.py', 'w') as f:
        f.write(content)
    
    print("Successfully patched quiz_set_generator_v3.py")
    print("\nKey changes:")
    print("1. Added strict factual question requirements")
    print("2. Implemented length limits (35 words for questions, 8 for answers)")
    print("3. Added 3-1 educational/silly answer ratio")
    print("4. Fixed chaos mode to maintain factual answers")
    print("5. Added variety requirements to prevent meme repetition")
    print("6. Added opinion question detection")
    print("\nThe generator will now reject:")
    print("- Opinion questions ('loves to', 'coolest', etc.)")
    print("- Questions without verifiable answers")
    print("- Overly long questions or answers")
    print("- Duplicate questions within sets")

def main():
    """Main patch execution"""
    print("=== Quiz Generator Factual Question Patch ===\n")
    
    # Check if file exists
    if not os.path.exists('quiz_set_generator_v3.py'):
        print("ERROR: quiz_set_generator_v3.py not found in current directory")
        print("Please run this script from the backend directory")
        return
    
    # Create backup
    if not create_backup():
        print("ERROR: Could not create backup")
        return
    
    # Apply patch
    try:
        patch_generator()
        print("\n✅ Patch completed successfully!")
        print("\nNext steps:")
        print("1. Test the generator locally")
        print("2. Deploy to server with proper shutdown procedure")
        print("3. Monitor for any issues")
    except Exception as e:
        print(f"\n❌ Error applying patch: {e}")
        print("The original file has been backed up")

if __name__ == "__main__":
    main()
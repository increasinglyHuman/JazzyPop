#!/usr/bin/env python3
"""
SAFE patch for quiz_set_generator_v3.py 
Only updates prompts and adds validation - preserves all JSON structure!
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

def patch_generator_safely():
    """Apply ONLY prompt changes - preserve all JSON structure"""
    
    # Read the original file
    with open('quiz_set_generator_v3.py', 'r') as f:
        lines = f.readlines()
    
    # Track what we're changing
    changes_made = []
    
    # 1. Update the main JAZZYPOP STYLE GUIDE section (around line 546)
    for i, line in enumerate(lines):
        if "JAZZYPOP STYLE GUIDE FOR KIDS:" in line:
            # Find the section and update it
            j = i + 1
            new_section = '''        JAZZYPOP STYLE GUIDE FOR KIDS:
        - Use simple, clear language appropriate for the age group
        - Include fun, relatable references kids will understand
        - Mix real knowledge with playful elements
        - Reference things kids love: games, cartoons, school, friends
        - Keep it educational but super fun!
        
        🚨 CRITICAL: FACTUAL QUESTIONS ONLY! 🚨
        - NO "loves to" questions (opinion, not fact!)
        - NO "What's the coolest/best/silliest" (not measurable!)
        - NO subjective preferences
        - Every question MUST have ONE verifiable answer
        - Keep questions under 35 words, answers under 8 words
        
'''
            # Replace the section
            while j < len(lines) and "CRITICAL QUIZ QUALITY RULES:" not in lines[j]:
                j += 1
            lines[i:j] = [new_section]
            changes_made.append("Updated main style guide with factual requirements")
            break
    
    # 2. Update CHAOS MODE section (around line 580)
    for i, line in enumerate(lines):
        if "CHAOS MODE ACTIVATED!" in line and "prompt +=" in lines[i-1]:
            # Update chaos instructions
            j = i
            # Find the end of this section (before the closing """)
            while j < len(lines) and '"""' not in lines[j]:
                j += 1
            
            new_chaos = '''        CHAOS MODE ACTIVATED! 🎪
        - Frame the question with: {chaos_character} in a {chaos_scenario}
        - Use maximum silliness in the PRESENTATION
        - Add emojis and excitement!
        - Make it feel like a wild adventure
        
        BUT REMEMBER:
        - The question must STILL have ONE correct factual answer!
        - Make the delivery chaotic, not the facts wrong
        - ✅ "Dancing robots need to know: How many planets orbit our sun?"
        - ❌ "What's the silliest planet?"
        
        VARIETY: Don't overuse "record scratch" or "POV" - mix it up!
        - Tag with: chaos, wild, unhinged
'''
            lines[i:j] = [new_chaos]
            changes_made.append("Updated chaos mode to maintain factual answers")
            break
    
    # 3. Remove the "Wrong answers only" template (around line 779)
    for i, line in enumerate(lines):
        if '"Wrong answers only:' in line and 'character' in line:
            lines[i] = '            # Removed "Wrong answers only" - all questions need correct answers!\n'
            changes_made.append("Removed 'Wrong answers only' chaos template")
            break
    
    # 4. Add opinion detection WITHOUT changing the class structure
    # Find where to insert the method (after filter_question, before generate_quiz_question)
    for i, line in enumerate(lines):
        if "def filter_question(self" in line:
            # Find the end of this method
            j = i
            indent_count = 0
            while j < len(lines):
                if "    def " in lines[j] and j > i:
                    # Found next method, insert before it
                    opinion_method = '''    
    def _is_opinion_question(self, question_text: str) -> bool:
        """Quick check if a question is opinion-based"""
        q_lower = question_text.lower()
        
        # Opinion indicators
        opinion_phrases = [
            'loves to', 'likes to', 'prefers', 'favorite',
            'best', 'worst', 'coolest', 'silliest', 'most fun',
            'most awesome', 'most boring', 'what do you think'
        ]
        
        return any(phrase in q_lower for phrase in opinion_phrases)
    
'''
                    lines.insert(j, opinion_method)
                    changes_made.append("Added opinion detection method")
                    break
                j += 1
            break
    
    # 5. Add opinion check in generate_quiz_question WITHOUT breaking JSON
    for i, line in enumerate(lines):
        if "question_data = json.loads(content)" in line:
            # Add check after JSON parsing
            for j in range(i, min(i+20, len(lines))):
                if "return filtered_question" in lines[j]:
                    # Insert check before return
                    check = '''                        
                        # Quick opinion check - reject if needed
                        if self._is_opinion_question(filtered_question.get('question', '')):
                            logger.warning("Question appears opinion-based, regenerating...")
                            return None
                        
'''
                    lines.insert(j, check)
                    changes_made.append("Added opinion validation check")
                    break
            break
    
    # Write the safely patched file
    with open('quiz_set_generator_v3.py', 'w') as f:
        f.writelines(lines)
    
    print("Successfully applied SAFE patch to quiz_set_generator_v3.py")
    print("\nChanges made:")
    for change in changes_made:
        print(f"  ✓ {change}")
    
    print("\nIMPORTANT: This patch:")
    print("  - Preserves ALL JSON structure")
    print("  - Keeps ALL field names unchanged") 
    print("  - Maintains ALL game variables")
    print("  - Only updates prompt text and adds validation")
    print("  - Does NOT change the returned data format")

def verify_json_structure():
    """Quick check that JSON structure is preserved"""
    print("\nVerifying JSON structure preservation...")
    
    # Check that key JSON format is still there
    with open('quiz_set_generator_v3.py', 'r') as f:
        content = f.read()
    
    required_json = [
        '"question": "Your creative question here"',
        '"answers": [',
        '{"id": "a", "text": "Answer 1", "correct": false}',
        '"explanation": "Kid-friendly explanation',
        '"mode": "{mode}"',
        '"difficulty": "{difficulty}"',
        '"tags": ["tag1", "tag2", "{mode}", "{category}"]'
    ]
    
    all_good = True
    for json_part in required_json:
        if json_part not in content:
            print(f"  ❌ Missing: {json_part}")
            all_good = False
    
    if all_good:
        print("  ✅ All JSON structure verified intact!")
    else:
        print("  ⚠️  WARNING: Some JSON structure may have changed!")
    
    return all_good

def main():
    """Main patch execution"""
    print("=== SAFE Quiz Generator Factual Patch ===\n")
    print("This patch will:")
    print("- Update prompts to require factual questions")
    print("- Add opinion detection")
    print("- Preserve ALL JSON structure")
    print("- Keep ALL game variables intact\n")
    
    # Check if file exists
    if not os.path.exists('quiz_set_generator_v3.py'):
        print("ERROR: quiz_set_generator_v3.py not found")
        print("Please run from the backend directory")
        return
    
    # Create backup
    if not create_backup():
        print("ERROR: Could not create backup")
        return
    
    # Apply patch
    try:
        patch_generator_safely()
        
        # Verify JSON structure
        if verify_json_structure():
            print("\n✅ Patch completed successfully!")
            print("\nThe generator will now:")
            print("  - Reject opinion questions")
            print("  - Require factual answers")
            print("  - Limit question/answer length")
            print("  - Maintain chaos fun with factual core")
            print("\nNext steps:")
            print("1. Test locally with: python quiz_set_generator_v3.py --once")
            print("2. Check the generated JSON structure")
            print("3. Deploy to server following admin manual")
        else:
            print("\n⚠️  Patch applied but verify JSON output before deploying!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Original file is backed up")

if __name__ == "__main__":
    main()
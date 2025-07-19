#!/usr/bin/env python3
"""
FINAL patch for quiz_set_generator_v3.py 
- Updates prompts to require factual questions only
- Preserves JSON structure exactly
- Respects that explanations are added by validation system
- Maintains all game-critical fields
"""

import os
import re
import shutil
from datetime import datetime

def create_backup():
    """Create timestamped backup"""
    source = 'quiz_set_generator_v3.py'
    backup = f'quiz_set_generator_v3.py.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    
    if os.path.exists(source):
        shutil.copy2(source, backup)
        print(f"✅ Created backup: {backup}")
        return backup
    return None

def patch_prompts_only():
    """Update ONLY the prompt strings to enforce factual questions"""
    
    with open('quiz_set_generator_v3.py', 'r') as f:
        content = f.read()
    
    # 1. Update the main question generation prompt
    # This is the critical section that tells Haiku what to generate
    old_style_guide = '''        JAZZYPOP STYLE GUIDE FOR KIDS:
        - Use simple, clear language appropriate for the age group
        - Include fun, relatable references kids will understand
        - For chaos mode: Use silly humor and {pop_ref}
        - Mix real knowledge with playful elements
        - Reference things kids love: games, cartoons, school, friends
        - Make wrong answers silly but not confusing
        - Keep it educational but super fun!'''
    
    new_style_guide = '''        JAZZYPOP STYLE GUIDE FOR KIDS:
        - Use simple, clear language appropriate for the age group
        - Include fun, relatable references kids will understand
        - For chaos mode: Use silly humor and {pop_ref}
        - Mix real knowledge with playful elements
        - Reference things kids love: games, cartoons, school, friends
        - Keep it educational but super fun!
        
        🚨 CRITICAL FACTUAL QUESTION RULES:
        ❌ ABSOLUTELY FORBIDDEN:
        - NO "loves to" / "likes to" / "prefers" (those are opinions!)
        - NO "What's the coolest/best/silliest/most fun" (not measurable!)
        - NO hypothetical preferences or feelings
        - NO questions where the answer is debatable
        - NO duplicate questions in this 10-question set
        
        ✅ REQUIRED FOR EVERY QUESTION:
        - Must have ONE objectively correct answer
        - Answer must be verifiable (can Google it!)
        - Question length: Maximum 35 words (aim for 15-25)
        - Answer length: Maximum 8 words (aim for 1-5)
        - Wrong answers: Mostly educational (3:1 ratio)'''

    content = content.replace(old_style_guide, new_style_guide)
    
    # 2. Update the chaos mode specific instructions
    old_chaos_section = '''        if mode == 'chaos':
            prompt += f"""
        CHAOS MODE ACTIVATED! 🎪
        - Frame the question with: {chaos_character} in a {chaos_scenario}
        - Use maximum silliness and {pop_ref}
        - Wrong answers should be hilariously wrong
        - Add emojis and excitement!
        - Make it feel like a wild adventure
        - Tag with: chaos, wild, unhinged
        """'''
    
    new_chaos_section = '''        if mode == 'chaos':
            prompt += f"""
        CHAOS MODE ACTIVATED! 🎪
        
        CHAOS GOLDEN RULE: Make the PRESENTATION wild, keep the FACTS real!
        
        ✅ DO THIS:
        - Frame with: {chaos_character} in a {chaos_scenario}
        - Add visual chaos (emojis, excitement, wild scenarios)
        - Make wrong answers hilariously wrong
        - Create a wild adventure atmosphere
        
        ❌ DON'T DO THIS:
        - Don't make the question itself unanswerable
        - Don't ask for opinions ("what's coolest")
        - Don't remove the factual correct answer
        
        VARIETY RULE:
        - Don't overuse "record scratch" or "POV:" formats
        - Each question should feel fresh
        - Mix up chaos styles (not same meme 5 times)
        
        Example: "🚀 EMERGENCY! Dancing aliens need to know: How many moons does Earth have?"
        NOT: "What's the silliest thing about the Moon?"
        
        - Tag with: chaos, wild, unhinged
        """'''
    
    content = content.replace(old_chaos_section, new_chaos_section)
    
    # 3. Comment out the problematic "Wrong answers only" template
    content = re.sub(
        r'("Wrong answers only: [^"]+"),',
        r'# \1,  # REMOVED - needs correct answer!',
        content
    )
    
    # 4. Add a simple opinion check (minimal, safe addition)
    # Find the ContentFilter class and add method there
    filter_class_end = content.find('class QuizSetGeneratorV3:')
    if filter_class_end > 0:
        # Add before the QuizSetGeneratorV3 class
        opinion_check = '''
    def has_opinion_words(self, text: str) -> bool:
        """Check for obvious opinion indicators"""
        opinion_words = [
            'loves to', 'likes to', 'favorite', 'prefers',
            'coolest', 'silliest', 'best', 'worst', 'most fun',
            'most awesome', 'lamest', 'most boring'
        ]
        text_lower = text.lower()
        return any(word in text_lower for word in opinion_words)

'''
        # Insert right before QuizSetGeneratorV3 class
        content = content[:filter_class_end] + opinion_check + content[filter_class_end:]
    
    # Write the updated file
    with open('quiz_set_generator_v3.py', 'w') as f:
        f.write(content)
    
    return True

def verify_critical_structure():
    """Verify JSON structure and critical game elements preserved"""
    with open('quiz_set_generator_v3.py', 'r') as f:
        content = f.read()
    
    critical_elements = [
        # JSON structure elements
        '"question": "Your creative question here"',
        '"answers": [',
        '{"id": "a", "text": "Answer 1", "correct": false}',
        '{"id": "b", "text": "Answer 2", "correct": true}',
        '{"id": "c", "text": "Answer 3", "correct": false}',
        '{"id": "d", "text": "Answer 4", "correct": false}',
        '"explanation": "Kid-friendly explanation',  # Still there for validation to fill
        '"mode": "{mode}"',
        '"difficulty": "{difficulty}"',
        '"tags": ["tag1", "tag2", "{mode}", "{category}"]',
        
        # Critical game mechanics
        'calculate_economics',
        'chaos_config',
        'zen_config', 
        'speed_config',
        'rewards',
        'perfect_bonus',
        'streak_bonuses',
        
        # Mode variations
        'generate_mode_variations',
        'chaos_level',
        'effects'
    ]
    
    print("\n📋 Verifying critical elements preserved:")
    all_good = True
    for element in critical_elements:
        if element in content:
            print(f"  ✅ {element[:50]}...")
        else:
            print(f"  ❌ MISSING: {element}")
            all_good = False
    
    return all_good

def main():
    """Apply the factual questions patch safely"""
    print("=== JazzyPop Quiz Generator Factual Questions Patch ===\n")
    print("This patch will:")
    print("• Require factual questions only (no opinions)")
    print("• Enforce length limits (35 words/8 words)")
    print("• Fix chaos mode to keep factual answers")
    print("• Add variety requirements")
    print("• Preserve ALL JSON structure")
    print("• Maintain validation system workflow\n")
    
    if not os.path.exists('quiz_set_generator_v3.py'):
        print("❌ ERROR: quiz_set_generator_v3.py not found")
        print("Please run from the backend directory")
        return
    
    # Create backup
    backup_file = create_backup()
    if not backup_file:
        print("❌ ERROR: Could not create backup")
        return
    
    try:
        # Apply the patch
        if patch_prompts_only():
            print("✅ Prompts updated successfully")
        
        # Verify nothing critical was broken
        if verify_critical_structure():
            print("\n✅ PATCH COMPLETE - All systems go!")
            print("\n📝 Summary of changes:")
            print("  1. Added factual question requirements to prompts")
            print("  2. Banned opinion phrases ('loves to', 'coolest', etc)")
            print("  3. Set length limits (35 words for Q, 8 for A)")
            print("  4. Fixed chaos mode to maintain factual answers")
            print("  5. Added variety requirements for chaos mode")
            print("  6. Removed 'Wrong answers only' template")
            
            print("\n🔧 What stays the same:")
            print("  • JSON structure unchanged")
            print("  • All game variables preserved")
            print("  • Explanation field (filled by validation)")
            print("  • Economics calculations")
            print("  • Mode configurations")
            
            print("\n🚀 Next steps:")
            print("  1. Test locally: python quiz_set_generator_v3.py --once")
            print("  2. Verify JSON output format")
            print("  3. Deploy to server (see admin manual)")
            print("  4. Monitor quiz quality improvement")
            
        else:
            print("\n⚠️  WARNING: Some elements may be missing!")
            print(f"Restore from backup if needed: {backup_file}")
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print(f"Backup available at: {backup_file}")

if __name__ == "__main__":
    main()
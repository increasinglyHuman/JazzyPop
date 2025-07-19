#!/usr/bin/env python3
"""
Fix obvious quiz errors automatically
Focuses on the most fixable issues first
"""

import asyncio
import asyncpg
import json
import os
import re
from pathlib import Path
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value


class QuizErrorFixer:
    """Fixes obvious errors in quiz questions"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.stats = {
            'total_processed': 0,
            'short_answers_fixed': 0,
            'multiple_correct_fixed': 0,
            'answer_in_question_flagged': 0,
            'identical_answers_fixed': 0,
            'errors': 0
        }
    
    async def fix_all_obvious_errors(self, dry_run: bool = True):
        """Main fixing process"""
        logger.info(f"Starting error fix process (dry_run={dry_run})")
        
        async with self.db_pool.acquire() as conn:
            # Get quiz sets with potential issues
            quiz_sets = await conn.fetch("""
                SELECT id, data
                FROM content
                WHERE type = 'quiz_set'
                ORDER BY created_at DESC
                LIMIT 2000
            """)
            
            for quiz_set in quiz_sets:
                await self._process_quiz_set(conn, quiz_set, dry_run)
                
                # Progress update
                if self.stats['total_processed'] % 100 == 0:
                    logger.info(f"Progress: {self.stats}")
        
        return self.stats
    
    async def _process_quiz_set(self, conn: asyncpg.Connection, quiz_set, dry_run: bool):
        """Process a single quiz set"""
        self.stats['total_processed'] += 1
        
        try:
            data = quiz_set['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            set_id = quiz_set['id']
            questions = data.get('questions', [])
            modified = False
            
            for q_idx, question in enumerate(questions):
                # Fix 1: Short answers (numbers/letters only)
                if self._fix_short_answers(question):
                    self.stats['short_answers_fixed'] += 1
                    modified = True
                
                # Fix 2: Multiple correct answers
                if self._fix_multiple_correct(question):
                    self.stats['multiple_correct_fixed'] += 1
                    modified = True
                
                # Fix 3: All answers identical
                if self._fix_identical_answers(question):
                    self.stats['identical_answers_fixed'] += 1
                    modified = True
                
                # Flag (don't auto-fix): Answer in question
                if self._has_answer_in_question(question):
                    self.stats['answer_in_question_flagged'] += 1
                    # Add metadata flag instead of modifying
                    if 'validation_flags' not in question:
                        question['validation_flags'] = []
                    if 'answer_in_question' not in question['validation_flags']:
                        question['validation_flags'].append('answer_in_question')
                        modified = True
            
            # Update if modified
            if modified and not dry_run:
                await self._update_quiz_set(conn, set_id, data)
                
        except Exception as e:
            logger.error(f"Error processing set {quiz_set['id']}: {e}")
            self.stats['errors'] += 1
    
    def _fix_short_answers(self, question: dict) -> bool:
        """Fix answers that are just single numbers or letters"""
        modified = False
        
        for answer in question['answers']:
            text = answer['text'].strip()
            
            # If answer is just a number or single letter
            if len(text) <= 2 and (text.isdigit() or (len(text) == 1 and text.isalpha())):
                # Try to expand based on question context
                q_text = question['question'].lower()
                
                # Number answers - add context
                if text.isdigit():
                    num = int(text)
                    
                    # Common patterns
                    if 'how many' in q_text:
                        if 'heart' in q_text:
                            answer['text'] = f"{num} {'heart' if num == 1 else 'hearts'}"
                        elif 'leg' in q_text:
                            answer['text'] = f"{num} {'leg' if num == 1 else 'legs'}"
                        elif 'eye' in q_text:
                            answer['text'] = f"{num} {'eye' if num == 1 else 'eyes'}"
                        elif 'year' in q_text:
                            answer['text'] = f"{num} {'year' if num == 1 else 'years'}"
                        elif 'day' in q_text:
                            answer['text'] = f"{num} {'day' if num == 1 else 'days'}"
                        elif 'month' in q_text:
                            answer['text'] = f"{num} {'month' if num == 1 else 'months'}"
                        else:
                            answer['text'] = f"{num} items"
                    
                    elif 'what year' in q_text:
                        answer['text'] = f"Year {text}"
                    
                    elif 'temperature' in q_text or 'degrees' in q_text:
                        answer['text'] = f"{num} degrees"
                    
                    elif 'percent' in q_text or '%' in q_text:
                        answer['text'] = f"{num}%"
                    
                    elif 'age' in q_text:
                        answer['text'] = f"{num} years old"
                    
                    else:
                        # Generic number expansion
                        answer['text'] = f"The answer is {num}"
                    
                    modified = True
                
                # Letter answers - harder to fix without context
                elif text.isalpha() and len(text) == 1:
                    # Only fix if we can determine context
                    if 'grade' in q_text or 'rating' in q_text:
                        answer['text'] = f"Grade {text.upper()}"
                    elif 'vitamin' in q_text:
                        answer['text'] = f"Vitamin {text.upper()}"
                    elif 'option' in q_text or 'choice' in q_text:
                        answer['text'] = f"Option {text.upper()}"
                    else:
                        # Can't determine context, leave as is
                        pass
                    
                    if answer['text'] != text:
                        modified = True
        
        return modified
    
    def _fix_multiple_correct(self, question: dict) -> bool:
        """Fix questions with multiple correct answers marked"""
        correct_answers = [a for a in question['answers'] if a.get('correct', False)]
        
        if len(correct_answers) > 1:
            # Strategy: Keep the first marked correct, unmark others
            # (Ideally we'd use AI to pick the best one, but this is a simple fix)
            
            found_first = False
            for answer in question['answers']:
                if answer.get('correct', False):
                    if found_first:
                        answer['correct'] = False
                    else:
                        found_first = True
            
            # Add a flag that this needs review
            if 'validation_flags' not in question:
                question['validation_flags'] = []
            if 'multiple_correct_fixed' not in question['validation_flags']:
                question['validation_flags'].append('multiple_correct_fixed')
            
            return True
        
        return False
    
    def _fix_identical_answers(self, question: dict) -> bool:
        """Fix questions where all answers are identical"""
        answer_texts = [a['text'].strip().lower() for a in question['answers']]
        
        if len(set(answer_texts)) == 1:
            # All answers are the same - this is unfixable automatically
            # Mark it for manual review
            if 'validation_flags' not in question:
                question['validation_flags'] = []
            if 'all_answers_identical' not in question['validation_flags']:
                question['validation_flags'].append('all_answers_identical')
            
            # Make answers at least different by adding A, B, C, D
            for i, answer in enumerate(question['answers']):
                answer['text'] = f"{chr(65 + i)}. {answer['text']}"
            
            return True
        
        return False
    
    def _has_answer_in_question(self, question: dict) -> bool:
        """Check if the question contains its own answer"""
        q_text = question['question'].lower()
        
        # Find the correct answer
        correct_answer = None
        for answer in question['answers']:
            if answer.get('correct', False):
                correct_answer = answer['text'].lower()
                break
        
        if not correct_answer:
            return False
        
        # Check if answer appears in question
        # Ignore very short answers (like "A" or "1")
        if len(correct_answer) > 3:
            # Check for exact match
            if correct_answer in q_text:
                return True
            
            # Check for partial matches (first few words)
            answer_words = correct_answer.split()
            if len(answer_words) >= 3:
                # Check if first 3 words appear in question
                partial = ' '.join(answer_words[:3])
                if partial in q_text:
                    return True
        
        # Check for "which came first: X or Y" pattern where X or Y is the answer
        if 'which came first:' in q_text:
            # Extract the options
            match = re.search(r'which came first:\s*(.+?)\s+or\s+(.+?)[\?\.]', q_text)
            if match:
                option1 = match.group(1).strip().lower()
                option2 = match.group(2).strip().lower()
                
                # Check if correct answer matches one of the options too closely
                if (correct_answer in option1 or option1 in correct_answer or
                    correct_answer in option2 or option2 in correct_answer):
                    return True
        
        return False
    
    async def _update_quiz_set(self, conn: asyncpg.Connection, set_id: str, data: dict):
        """Update quiz set in database"""
        query = """
        UPDATE content
        SET 
            data = $2,
            metadata = metadata || jsonb_build_object(
                'auto_fixed', true,
                'fix_timestamp', $3,
                'fix_version', '1.0'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        """
        
        await conn.execute(
            query, 
            set_id, 
            json.dumps(data),
            datetime.now().isoformat()
        )


async def main():
    """Run the error fixer"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        fixer = QuizErrorFixer(db_pool)
        
        print("=== QUIZ ERROR FIXER ===")
        print("This will fix obvious errors in quiz questions")
        print("\nFixable issues:")
        print("1. Short answers (e.g., '3' → '3 hearts')")
        print("2. Multiple correct answers (keeps first, unmarks others)")
        print("3. Identical answers (adds A, B, C, D prefixes)")
        print("4. Answer in question (flags for review)")
        print()
        
        # Ask for mode
        mode = input("Run in dry-run mode first? (y/n): ").lower()
        dry_run = (mode != 'n')
        
        if dry_run:
            print("\n=== DRY RUN MODE - No changes will be made ===")
        else:
            print("\n=== LIVE MODE - Will update database ===")
            confirm = input("Are you sure? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Cancelled.")
                return
        
        print("\nProcessing quiz sets...")
        stats = await fixer.fix_all_obvious_errors(dry_run=dry_run)
        
        print(f"\n=== {'DRY RUN' if dry_run else 'FIX'} COMPLETE ===")
        print(f"Total processed: {stats['total_processed']}")
        print(f"Short answers fixed: {stats['short_answers_fixed']}")
        print(f"Multiple correct fixed: {stats['multiple_correct_fixed']}")
        print(f"Identical answers fixed: {stats['identical_answers_fixed']}")
        print(f"Answer in question flagged: {stats['answer_in_question_flagged']}")
        print(f"Errors: {stats['errors']}")
        
        if dry_run and (stats['short_answers_fixed'] > 0 or stats['multiple_correct_fixed'] > 0):
            print("\nFound fixable issues! Run without dry-run to apply fixes.")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Fix obvious quiz errors - Age-aware version
Only fixes issues that are clearly errors, not intentional design choices
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


class AgeAwareQuizFixer:
    """Fixes quiz errors while respecting age-appropriate design"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.stats = {
            'total_processed': 0,
            'no_correct_answer': 0,
            'multiple_correct_fixed': 0,
            'empty_answers': 0,
            'identical_answers': 0,
            'skipped_young_age': 0,
            'validation_flags_added': 0
        }
    
    async def analyze_and_fix_errors(self, dry_run: bool = True):
        """Main process - analyze first, then fix only real errors"""
        logger.info(f"Starting age-aware error analysis (dry_run={dry_run})")
        
        async with self.db_pool.acquire() as conn:
            # Get all quiz sets
            quiz_sets = await conn.fetch("""
                SELECT id, data, metadata
                FROM content
                WHERE type = 'quiz_set'
                ORDER BY created_at DESC
            """)
            
            issues_by_category = {
                'no_correct': [],
                'multiple_correct': [],
                'empty_answers': [],
                'identical_answers': [],
                'needs_review': []
            }
            
            for quiz_set in quiz_sets:
                issues = await self._analyze_quiz_set(quiz_set)
                
                # Categorize issues
                for issue in issues:
                    if issue['type'] == 'no_correct_answer':
                        issues_by_category['no_correct'].append(issue)
                    elif issue['type'] == 'multiple_correct':
                        issues_by_category['multiple_correct'].append(issue)
                    elif issue['type'] == 'empty_answer':
                        issues_by_category['empty_answers'].append(issue)
                    elif issue['type'] == 'identical_answers':
                        issues_by_category['identical_answers'].append(issue)
                    else:
                        issues_by_category['needs_review'].append(issue)
                
                # Progress
                if self.stats['total_processed'] % 500 == 0:
                    logger.info(f"Analyzed {self.stats['total_processed']} sets...")
            
            # Report findings
            print("\n=== ANALYSIS COMPLETE ===")
            print(f"Total quiz sets analyzed: {self.stats['total_processed']}")
            print(f"\nCRITICAL ISSUES (need fixing):")
            print(f"  No correct answer marked: {len(issues_by_category['no_correct'])}")
            print(f"  Multiple correct answers: {len(issues_by_category['multiple_correct'])}")
            print(f"  Empty answers: {len(issues_by_category['empty_answers'])}")
            print(f"  All answers identical: {len(issues_by_category['identical_answers'])}")
            print(f"\nAGE-APPROPRIATE (skipped): {self.stats['skipped_young_age']}")
            
            # Show examples
            for category, issues in issues_by_category.items():
                if issues and category != 'needs_review':
                    print(f"\n{category.upper()} Examples:")
                    for issue in issues[:3]:
                        print(f"  [{issue['category']}] {issue['question'][:60]}...")
                        if issue.get('details'):
                            print(f"    Details: {issue['details']}")
            
            # Save detailed report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = f"quiz_issues_age_aware_{timestamp}.json"
            
            with open(report_file, 'w') as f:
                json.dump({
                    'analysis_time': datetime.now().isoformat(),
                    'stats': self.stats,
                    'issues': issues_by_category,
                    'total_critical': (
                        len(issues_by_category['no_correct']) +
                        len(issues_by_category['multiple_correct']) +
                        len(issues_by_category['empty_answers']) +
                        len(issues_by_category['identical_answers'])
                    )
                }, f, indent=2)
            
            print(f"\nDetailed report saved to: {report_file}")
            
            # Ask to fix critical issues
            if not dry_run:
                critical_count = (
                    len(issues_by_category['no_correct']) +
                    len(issues_by_category['multiple_correct']) +
                    len(issues_by_category['empty_answers'])
                )
                
                if critical_count > 0:
                    print(f"\nFound {critical_count} critical issues that need fixing.")
                    proceed = input("Fix these issues? (yes/no): ")
                    
                    if proceed.lower() == 'yes':
                        await self._fix_critical_issues(conn, issues_by_category)
                        print("Critical issues fixed!")
        
        return self.stats
    
    async def _analyze_quiz_set(self, quiz_set) -> list:
        """Analyze a quiz set for issues"""
        self.stats['total_processed'] += 1
        issues = []
        
        try:
            data = quiz_set['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            metadata = quiz_set['metadata'] or {}
            set_id = str(quiz_set['id'])
            category = data.get('category', 'unknown')
            difficulty = data.get('difficulty', 'unknown')
            
            # Check age rating
            maturity = metadata.get('maturity_rating', 'unknown')
            target_age = metadata.get('target_age_range', '')
            is_young_age = (
                maturity == 'all_ages' or 
                'young' in difficulty or
                'easy' in difficulty or
                ('6-' in str(target_age))
            )
            
            questions = data.get('questions', [])
            
            for q_idx, question in enumerate(questions):
                # Check 1: No correct answer
                correct_count = sum(1 for a in question['answers'] if a.get('correct'))
                if correct_count == 0:
                    issues.append({
                        'type': 'no_correct_answer',
                        'set_id': set_id,
                        'question_idx': q_idx,
                        'category': category,
                        'question': question['question'],
                        'severity': 'critical'
                    })
                    self.stats['no_correct_answer'] += 1
                
                # Check 2: Multiple correct answers
                elif correct_count > 1:
                    issues.append({
                        'type': 'multiple_correct',
                        'set_id': set_id,
                        'question_idx': q_idx,
                        'category': category,
                        'question': question['question'],
                        'details': f'{correct_count} answers marked correct',
                        'severity': 'critical'
                    })
                    self.stats['multiple_correct_fixed'] += 1
                
                # Check 3: Empty or whitespace-only answers
                for a_idx, answer in enumerate(question['answers']):
                    if not answer['text'].strip():
                        issues.append({
                            'type': 'empty_answer',
                            'set_id': set_id,
                            'question_idx': q_idx,
                            'answer_idx': a_idx,
                            'category': category,
                            'question': question['question'],
                            'severity': 'critical'
                        })
                        self.stats['empty_answers'] += 1
                        break
                
                # Check 4: All answers identical (always an error)
                answer_texts = [a['text'].strip().lower() for a in question['answers']]
                if len(set(answer_texts)) == 1 and answer_texts[0]:
                    issues.append({
                        'type': 'identical_answers',
                        'set_id': set_id,
                        'question_idx': q_idx,
                        'category': category,
                        'question': question['question'],
                        'details': f'All answers are: "{answer_texts[0]}"',
                        'severity': 'critical'
                    })
                    self.stats['identical_answers'] += 1
                
                # Check 5: Short answers - ONLY flag if NOT young age
                if not is_young_age:
                    for answer in question['answers']:
                        text = answer['text'].strip()
                        if len(text) <= 2 and text:
                            # For older audiences, single digit/letter answers might be errors
                            issues.append({
                                'type': 'short_answer_review',
                                'set_id': set_id,
                                'question_idx': q_idx,
                                'category': category,
                                'question': question['question'],
                                'answer': text,
                                'details': 'Short answer for non-young-age content',
                                'severity': 'review'
                            })
                            break
                else:
                    # Count skipped due to young age
                    for answer in question['answers']:
                        if len(answer['text'].strip()) <= 2:
                            self.stats['skipped_young_age'] += 1
                            break
                
        except Exception as e:
            logger.error(f"Error analyzing set {quiz_set['id']}: {e}")
        
        return issues
    
    async def _fix_critical_issues(self, conn: asyncpg.Connection, issues_by_category: dict):
        """Fix only the critical issues"""
        
        # Group by set_id for efficient updates
        fixes_by_set = {}
        
        # Process each critical issue type
        for issue in issues_by_category['no_correct']:
            set_id = issue['set_id']
            if set_id not in fixes_by_set:
                fixes_by_set[set_id] = []
            fixes_by_set[set_id].append(issue)
        
        for issue in issues_by_category['multiple_correct']:
            set_id = issue['set_id']
            if set_id not in fixes_by_set:
                fixes_by_set[set_id] = []
            fixes_by_set[set_id].append(issue)
        
        for issue in issues_by_category['empty_answers']:
            set_id = issue['set_id']
            if set_id not in fixes_by_set:
                fixes_by_set[set_id] = []
            fixes_by_set[set_id].append(issue)
        
        # Apply fixes
        fixed_count = 0
        for set_id, issues in fixes_by_set.items():
            try:
                # Get the quiz set
                row = await conn.fetchrow(
                    "SELECT data FROM content WHERE id = $1",
                    set_id
                )
                
                if row:
                    data = row['data']
                    if isinstance(data, str):
                        data = json.loads(data)
                    
                    modified = False
                    
                    for issue in issues:
                        if issue['type'] == 'no_correct_answer':
                            # Fix: Mark first answer as correct
                            q_idx = issue['question_idx']
                            data['questions'][q_idx]['answers'][0]['correct'] = True
                            modified = True
                            
                            # Add flag
                            if 'validation_flags' not in data['questions'][q_idx]:
                                data['questions'][q_idx]['validation_flags'] = []
                            data['questions'][q_idx]['validation_flags'].append('auto_fixed_no_correct')
                        
                        elif issue['type'] == 'multiple_correct':
                            # Fix: Keep only first correct
                            q_idx = issue['question_idx']
                            found_first = False
                            for answer in data['questions'][q_idx]['answers']:
                                if answer.get('correct'):
                                    if found_first:
                                        answer['correct'] = False
                                    else:
                                        found_first = True
                            modified = True
                            
                            # Add flag
                            if 'validation_flags' not in data['questions'][q_idx]:
                                data['questions'][q_idx]['validation_flags'] = []
                            data['questions'][q_idx]['validation_flags'].append('auto_fixed_multiple_correct')
                        
                        elif issue['type'] == 'empty_answer':
                            # Fix: Add placeholder text
                            q_idx = issue['question_idx']
                            a_idx = issue['answer_idx']
                            data['questions'][q_idx]['answers'][a_idx]['text'] = f"[Answer {chr(65 + a_idx)}]"
                            modified = True
                            
                            # Add flag
                            if 'validation_flags' not in data['questions'][q_idx]:
                                data['questions'][q_idx]['validation_flags'] = []
                            data['questions'][q_idx]['validation_flags'].append('auto_fixed_empty_answer')
                    
                    if modified:
                        # Update the quiz set
                        await conn.execute("""
                            UPDATE content
                            SET 
                                data = $2,
                                metadata = metadata || jsonb_build_object(
                                    'auto_fixed_critical', true,
                                    'fix_timestamp', $3
                                ),
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        """, set_id, json.dumps(data), datetime.now().isoformat())
                        
                        fixed_count += 1
                        
            except Exception as e:
                logger.error(f"Error fixing set {set_id}: {e}")
        
        logger.info(f"Fixed {fixed_count} quiz sets with critical issues")


async def main():
    """Run the age-aware fixer"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        fixer = AgeAwareQuizFixer(db_pool)
        
        print("=== AGE-AWARE QUIZ ERROR ANALYZER ===")
        print("This will identify REAL errors vs intentional design choices")
        print("\nWill check for:")
        print("• No correct answer marked (always an error)")
        print("• Multiple correct answers (always an error)")
        print("• Empty answer text (always an error)")
        print("• Identical answers (always an error)")
        print("• Short answers (only flagged for non-young-age content)")
        print()
        
        # First run analysis
        stats = await fixer.analyze_and_fix_errors(dry_run=True)
        
        # Then offer to fix critical issues
        print("\nWould you like to fix the critical issues?")
        print("(This will NOT change short answers for young-age content)")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
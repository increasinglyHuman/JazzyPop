#!/usr/bin/env python3
"""
Smart Quiz Analyzer - Context-aware error detection
Only flags REAL problems, not false positives
"""

import asyncio
import asyncpg
import json
import os
import re
from pathlib import Path
from datetime import datetime
import logging
from collections import Counter

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


class SmartQuizAnalyzer:
    """Analyzes quizzes with context awareness"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.stats = Counter()
        
        # Common words that don't count as "giving away the answer"
        self.common_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'can', 'could', 'should', 'may', 'might', 'must', 'shall',
            'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
            'up', 'down', 'out', 'over', 'under', 'again', 'then', 'there',
            'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few',
            'more', 'most', 'other', 'some', 'such', 'and', 'or', 'but',
            'if', 'so', 'than', 'too', 'very', 'just', 'that', 'this',
            'it', 'its', 'what', 'which', 'who', 'whom', 'whose',
            'yes', 'no', 'not', 'true', 'false'
        }
        
        # Question patterns that naturally contain answer options
        self.natural_patterns = [
            r'which (?:came|comes?) first:?\s*(.+?)\s+or\s+(.+)',
            r'(?:is|are) (?:it|this|that) (?:a|an)?\s*(.+?)\s+or\s+(?:a|an)?\s*(.+)',
            r'what is (?:a|an|the)?\s*(.+)',
            r'who (?:is|was|were)\s*(.+)',
            r'true or false',
            r'(?:a|b|c|d)[\):\.]',
            r'which (?:one|option)',
            r'(?:option|choice)\s+(?:a|b|c|d)',
            r'would you rather'
        ]
    
    async def analyze_all(self, limit: int = None):
        """Analyze all quiz sets for real issues"""
        logger.info("Starting smart analysis...")
        
        real_issues = {
            'critical_errors': [],      # No correct answer, etc.
            'likely_errors': [],        # Probable mistakes
            'needs_review': [],         # Might be issues
            'false_positives': []       # Not actually problems
        }
        
        async with self.db_pool.acquire() as conn:
            query = "SELECT id, data, metadata FROM content WHERE type = 'quiz_set'"
            if limit:
                query += f" LIMIT {limit}"
            
            quiz_sets = await conn.fetch(query)
            
            for quiz_set in quiz_sets:
                issues = await self._analyze_quiz_set(quiz_set)
                
                # Categorize issues by severity
                for issue in issues:
                    if issue['severity'] == 'critical':
                        real_issues['critical_errors'].append(issue)
                    elif issue['severity'] == 'high':
                        real_issues['likely_errors'].append(issue)
                    elif issue['severity'] == 'medium':
                        real_issues['needs_review'].append(issue)
                    else:
                        real_issues['false_positives'].append(issue)
                
                # Progress
                if self.stats['total_processed'] % 500 == 0:
                    logger.info(f"Processed {self.stats['total_processed']} sets...")
        
        return self._generate_report(real_issues)
    
    async def _analyze_quiz_set(self, quiz_set) -> list:
        """Analyze a single quiz set"""
        self.stats['total_processed'] += 1
        issues = []
        
        try:
            data = quiz_set['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            set_id = str(quiz_set['id'])
            category = data.get('category', 'unknown')
            metadata = quiz_set['metadata'] or {}
            
            for q_idx, question in enumerate(data.get('questions', [])):
                # Critical errors (always problems)
                issue = self._check_critical_errors(question, set_id, q_idx, category)
                if issue:
                    issues.append(issue)
                    continue
                
                # Smart answer-in-question check
                issue = self._smart_answer_check(question, set_id, q_idx, category)
                if issue:
                    issues.append(issue)
                
                # Other smart checks
                issue = self._check_answer_quality(question, set_id, q_idx, category)
                if issue:
                    issues.append(issue)
                    
        except Exception as e:
            logger.error(f"Error analyzing set {quiz_set['id']}: {e}")
            self.stats['errors'] += 1
        
        return issues
    
    def _check_critical_errors(self, question: dict, set_id: str, q_idx: int, category: str) -> dict:
        """Check for always-wrong errors"""
        
        # No correct answer
        correct_count = sum(1 for a in question['answers'] if a.get('correct'))
        if correct_count == 0:
            self.stats['no_correct_answer'] += 1
            return {
                'severity': 'critical',
                'type': 'no_correct_answer',
                'set_id': set_id,
                'question_idx': q_idx,
                'category': category,
                'question': question['question'][:100],
                'fix': 'Mark one answer as correct'
            }
        
        # Multiple correct
        if correct_count > 1:
            self.stats['multiple_correct'] += 1
            return {
                'severity': 'critical',
                'type': 'multiple_correct_answers',
                'set_id': set_id,
                'question_idx': q_idx,
                'category': category,
                'question': question['question'][:100],
                'details': f'{correct_count} answers marked correct',
                'fix': 'Keep only one correct answer'
            }
        
        # All answers identical
        answer_texts = [a['text'].strip().lower() for a in question['answers']]
        if len(set(answer_texts)) == 1:
            self.stats['identical_answers'] += 1
            return {
                'severity': 'critical',
                'type': 'all_answers_identical',
                'set_id': set_id,
                'question_idx': q_idx,
                'category': category,
                'question': question['question'][:100],
                'details': f'All answers are: "{answer_texts[0]}"',
                'fix': 'Provide different answer options'
            }
        
        # Empty answers
        for a_idx, answer in enumerate(question['answers']):
            if not answer['text'].strip():
                self.stats['empty_answers'] += 1
                return {
                    'severity': 'critical',
                    'type': 'empty_answer',
                    'set_id': set_id,
                    'question_idx': q_idx,
                    'category': category,
                    'question': question['question'][:100],
                    'details': f'Answer {chr(65 + a_idx)} is empty',
                    'fix': 'Add answer text'
                }
        
        return None
    
    def _smart_answer_check(self, question: dict, set_id: str, q_idx: int, category: str) -> dict:
        """Smart check for answer-in-question issues"""
        
        q_text = question['question'].lower()
        
        # Find correct answer
        correct_answer = None
        for answer in question['answers']:
            if answer.get('correct'):
                correct_answer = answer['text']
                break
        
        if not correct_answer:
            return None
        
        correct_lower = correct_answer.lower().strip()
        
        # Check if it's a natural pattern (not a real issue)
        for pattern in self.natural_patterns:
            if re.search(pattern, q_text, re.IGNORECASE):
                self.stats['natural_pattern_match'] += 1
                return None  # This is expected, not an error
        
        # Skip if the answer is very short or common
        if len(correct_lower) <= 3 or correct_lower in self.common_words:
            return None
        
        # Check for exact match (excluding common words)
        answer_words = set(correct_lower.split()) - self.common_words
        question_words = set(q_text.split()) - self.common_words
        
        # Calculate overlap
        overlap = answer_words & question_words
        
        if len(overlap) == 0:
            return None  # No real overlap
        
        # Check overlap percentage
        overlap_percent = len(overlap) / len(answer_words) if answer_words else 0
        
        if overlap_percent > 0.8:  # Most of answer appears in question
            # But wait - is this a definition question?
            if any(phrase in q_text for phrase in ['what is', 'define', 'meaning of', 'definition']):
                self.stats['definition_question'] += 1
                return None  # Expected for definition questions
            
            # Check if it's the ONLY possible answer given the question
            # (e.g., "The capital of France is?" → "Paris" is fine)
            if any(phrase in q_text for phrase in ['capital of', 'president of', 'author of', 'inventor of']):
                self.stats['factual_question'] += 1
                return None  # Expected for factual questions
            
            # Now it's probably a real issue
            self.stats['answer_in_question'] += 1
            return {
                'severity': 'high',
                'type': 'answer_appears_in_question',
                'set_id': set_id,
                'question_idx': q_idx,
                'category': category,
                'question': question['question'][:100],
                'answer': correct_answer,
                'overlap': list(overlap),
                'fix': 'Rephrase question or answer'
            }
        
        return None
    
    def _check_answer_quality(self, question: dict, set_id: str, q_idx: int, category: str) -> dict:
        """Check answer quality issues"""
        
        answers = question['answers']
        answer_lengths = [len(a['text'].strip()) for a in answers]
        
        # Check for placeholder answers
        for a_idx, answer in enumerate(answers):
            text = answer['text'].strip()
            
            # Single letter/number that doesn't make sense
            if len(text) == 1 and text.isalnum():
                # Check if question expects single letter/number
                q_lower = question['question'].lower()
                if any(phrase in q_lower for phrase in [
                    'which letter', 'what letter', 'which number', 'what number',
                    'how many', 'grade', 'vitamin', 'option', 'choice'
                ]):
                    continue  # This is expected
                
                self.stats['placeholder_answer'] += 1
                return {
                    'severity': 'medium',
                    'type': 'likely_placeholder_answer',
                    'set_id': set_id,
                    'question_idx': q_idx,
                    'category': category,
                    'question': question['question'][:100],
                    'answer': f'Answer {chr(65 + a_idx)}: "{text}"',
                    'fix': 'Replace with meaningful answer'
                }
            
            # Check for test data
            if any(test in text.lower() for test in ['test', 'todo', 'fixme', 'xxx', 'placeholder']):
                self.stats['test_data'] += 1
                return {
                    'severity': 'high',
                    'type': 'test_data_in_answer',
                    'set_id': set_id,
                    'question_idx': q_idx,
                    'category': category,
                    'question': question['question'][:100],
                    'answer': text,
                    'fix': 'Replace with real answer'
                }
        
        return None
    
    def _generate_report(self, issues: dict) -> dict:
        """Generate analysis report"""
        
        report = {
            'analysis_time': datetime.now().isoformat(),
            'total_processed': self.stats['total_processed'],
            'summary': {
                'critical_errors': len(issues['critical_errors']),
                'likely_errors': len(issues['likely_errors']),
                'needs_review': len(issues['needs_review']),
                'false_positives_avoided': self.stats['natural_pattern_match'] + 
                                          self.stats['definition_question'] + 
                                          self.stats['factual_question']
            },
            'stats': dict(self.stats),
            'issues': issues
        }
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"smart_quiz_analysis_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print(f"\n=== SMART ANALYSIS COMPLETE ===")
        print(f"Total quiz sets analyzed: {self.stats['total_processed']}")
        print(f"\nCRITICAL ERRORS: {len(issues['critical_errors'])}")
        print(f"  No correct answer: {self.stats['no_correct_answer']}")
        print(f"  Multiple correct: {self.stats['multiple_correct']}")
        print(f"  Identical answers: {self.stats['identical_answers']}")
        print(f"  Empty answers: {self.stats['empty_answers']}")
        
        print(f"\nLIKELY ERRORS: {len(issues['likely_errors'])}")
        print(f"  Answer in question: {self.stats['answer_in_question']}")
        print(f"  Test data: {self.stats['test_data']}")
        
        print(f"\nFALSE POSITIVES AVOIDED:")
        print(f"  Natural patterns: {self.stats['natural_pattern_match']}")
        print(f"  Definition questions: {self.stats['definition_question']}")
        print(f"  Factual questions: {self.stats['factual_question']}")
        
        print(f"\nFull report saved to: {filename}")
        
        # Show examples
        if issues['critical_errors']:
            print("\nCRITICAL ERROR EXAMPLES:")
            for issue in issues['critical_errors'][:5]:
                print(f"  [{issue['category']}] {issue['type']}")
                print(f"    {issue['question']}...")
                if issue.get('details'):
                    print(f"    {issue['details']}")
        
        if issues['likely_errors']:
            print("\nLIKELY ERROR EXAMPLES:")
            for issue in issues['likely_errors'][:5]:
                print(f"  [{issue['category']}] {issue['type']}")
                print(f"    {issue['question']}...")
                if issue.get('overlap'):
                    print(f"    Overlap words: {', '.join(issue['overlap'])}")
        
        return report


async def main():
    DATABASE_URL = os.getenv('DATABASE_URL')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        analyzer = SmartQuizAnalyzer(db_pool)
        
        print("=== SMART QUIZ ANALYZER ===")
        print("Context-aware analysis to find REAL problems")
        print("\nThis will:")
        print("✓ Find critical errors (no correct answer, etc.)")
        print("✓ Identify likely mistakes (answer in question)")
        print("✓ Skip false positives (natural patterns)")
        print("✓ Consider question context")
        print()
        
        limit = input("How many quiz sets to analyze? (blank for all): ").strip()
        limit = int(limit) if limit else None
        
        print(f"\nAnalyzing{f' {limit}' if limit else ' all'} quiz sets...")
        await analyzer.analyze_all(limit=limit)
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
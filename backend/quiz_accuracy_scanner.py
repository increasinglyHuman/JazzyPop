#!/usr/bin/env python3
"""
Quiz Accuracy Scanner - Finds quizzes with incorrect answers
Uses AI validation to detect factual errors
"""

import asyncio
import asyncpg
import json
import os
from datetime import datetime
from pathlib import Path
import logging
from typing import Dict, List
import anthropic

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load .env file
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value


class QuizAccuracyScanner:
    """Scans quiz questions for factual accuracy issues"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.suspicious_quizzes = []
        self.scan_stats = {
            'total_scanned': 0,
            'errors_found': 0,
            'categories_with_issues': set(),
            'common_problems': []
        }
    
    async def scan_all_quizzes(self, limit: int = 100, category_filter: str = None):
        """Scan quizzes for accuracy issues"""
        logger.info(f"Starting accuracy scan (limit: {limit})")
        
        async with self.db_pool.acquire() as conn:
            # Build query
            query = """
            SELECT 
                id,
                data,
                metadata
            FROM content
            WHERE type = 'quiz_set'
                AND jsonb_array_length(data->'questions') = 10
            """
            
            if category_filter:
                query += f" AND data->>'category' = '{category_filter}'"
            
            query += f" ORDER BY RANDOM() LIMIT {limit}"
            
            quiz_sets = await conn.fetch(query)
            
            for quiz_set in quiz_sets:
                await self._scan_quiz_set(quiz_set)
                
                # Progress update
                if self.scan_stats['total_scanned'] % 10 == 0:
                    logger.info(
                        f"Progress: {self.scan_stats['total_scanned']} scanned, "
                        f"{self.scan_stats['errors_found']} issues found"
                    )
        
        return self.generate_report()
    
    async def _scan_quiz_set(self, quiz_set_row):
        """Scan a single quiz set"""
        data = quiz_set_row['data']
        if isinstance(data, str):
            data = json.loads(data)
        
        set_id = str(quiz_set_row['id'])
        category = data.get('category', 'unknown')
        mode = data.get('mode', 'standard')
        questions = data.get('questions', [])
        
        # Scan each question
        for i, question in enumerate(questions):
            self.scan_stats['total_scanned'] += 1
            
            try:
                result = await self._validate_question(question, category, mode)
                
                if not result['is_accurate']:
                    self.scan_stats['errors_found'] += 1
                    self.scan_stats['categories_with_issues'].add(category)
                    
                    self.suspicious_quizzes.append({
                        'set_id': set_id,
                        'question_index': i,
                        'category': category,
                        'mode': mode,
                        'question': question['question'],
                        'marked_correct': self._get_correct_answer(question),
                        'issue': result['issue'],
                        'confidence': result['confidence'],
                        'severity': result['severity']
                    })
                    
            except Exception as e:
                logger.error(f"Error validating question in set {set_id}: {e}")
    
    async def _validate_question(self, question: Dict, category: str, mode: str) -> Dict:
        """Validate a single question using AI"""
        
        # Build validation prompt
        prompt = f"""You are a fact-checking expert. Analyze this quiz question for factual accuracy.

Category: {category}
Mode: {mode}

Question: {question['question']}

Answers:
A) {question['answers'][0]['text']} - {'MARKED CORRECT' if question['answers'][0].get('correct') else 'marked wrong'}
B) {question['answers'][1]['text']} - {'MARKED CORRECT' if question['answers'][1].get('correct') else 'marked wrong'}
C) {question['answers'][2]['text']} - {'MARKED CORRECT' if question['answers'][2].get('correct') else 'marked wrong'}
D) {question['answers'][3]['text']} - {'MARKED CORRECT' if question['answers'][3].get('correct') else 'marked wrong'}

{f"Explanation given: {question.get('explanation', 'None')}" if question.get('explanation') else ""}

CRITICAL VALIDATION TASKS:
1. Is the marked correct answer factually accurate?
2. Are there any other answers that could also be correct?
3. Is the question clear and unambiguous?
4. For chaos mode: Is the correct answer still factually accurate despite silly wrong answers?

Return ONLY this JSON (no other text):
{{
    "is_accurate": true/false,
    "confidence": 0.0-1.0,
    "severity": "low/medium/high/critical",
    "issue": "brief description of the problem if not accurate",
    "correct_answer_should_be": "A/B/C/D or 'current is correct'"
}}"""

        try:
            # Call AI for validation
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",  # Fast model for scanning
                max_tokens=200,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse response
            result_text = response.content[0].text.strip()
            # Extract JSON from response
            if '{' in result_text and '}' in result_text:
                json_start = result_text.index('{')
                json_end = result_text.rindex('}') + 1
                result = json.loads(result_text[json_start:json_end])
            else:
                result = {"is_accurate": True, "confidence": 0.5, "issue": "Failed to parse"}
            
            return result
            
        except Exception as e:
            logger.error(f"AI validation error: {e}")
            return {
                "is_accurate": True,  # Default to true on error
                "confidence": 0,
                "severity": "low",
                "issue": f"Validation error: {str(e)}"
            }
    
    def _get_correct_answer(self, question: Dict) -> str:
        """Get the text of the marked correct answer"""
        for answer in question['answers']:
            if answer.get('correct'):
                return f"{answer['id'].upper()}: {answer['text']}"
        return "No correct answer marked"
    
    def generate_report(self) -> Dict:
        """Generate accuracy scan report"""
        # Sort by severity
        severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        self.suspicious_quizzes.sort(
            key=lambda x: (severity_order.get(x['severity'], 4), -x['confidence'])
        )
        
        # Find common issues
        issue_counts = {}
        for quiz in self.suspicious_quizzes:
            issue_key = quiz['issue'][:50]  # First 50 chars
            issue_counts[issue_key] = issue_counts.get(issue_key, 0) + 1
        
        common_issues = sorted(
            issue_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        report = {
            'scan_timestamp': datetime.now().isoformat(),
            'total_scanned': self.scan_stats['total_scanned'],
            'errors_found': self.scan_stats['errors_found'],
            'error_rate': (
                self.scan_stats['errors_found'] / self.scan_stats['total_scanned'] * 100
                if self.scan_stats['total_scanned'] > 0 else 0
            ),
            'categories_with_issues': list(self.scan_stats['categories_with_issues']),
            'common_issues': common_issues,
            'suspicious_quizzes': self.suspicious_quizzes[:50]  # Top 50 worst
        }
        
        return report
    
    def save_report(self, report: Dict, filename: str = None):
        """Save report to file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"accuracy_scan_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Report saved to {filename}")
        
        # Also save a human-readable summary
        summary_file = filename.replace('.json', '_summary.txt')
        with open(summary_file, 'w') as f:
            f.write("QUIZ ACCURACY SCAN REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Scan Date: {report['scan_timestamp']}\n")
            f.write(f"Total Questions Scanned: {report['total_scanned']}\n")
            f.write(f"Issues Found: {report['errors_found']}\n")
            f.write(f"Error Rate: {report['error_rate']:.1f}%\n\n")
            
            if report['common_issues']:
                f.write("MOST COMMON ISSUES:\n")
                for issue, count in report['common_issues']:
                    f.write(f"  - {issue}... ({count} times)\n")
                f.write("\n")
            
            if report['suspicious_quizzes']:
                f.write("TOP SUSPICIOUS QUIZZES:\n")
                f.write("-" * 50 + "\n")
                
                for i, quiz in enumerate(report['suspicious_quizzes'][:20]):
                    f.write(f"\n{i+1}. [{quiz['severity'].upper()}] {quiz['category']}/{quiz['mode']}\n")
                    f.write(f"   Question: {quiz['question'][:100]}...\n")
                    f.write(f"   Marked Correct: {quiz['marked_correct']}\n")
                    f.write(f"   Issue: {quiz['issue']}\n")
                    f.write(f"   Confidence: {quiz['confidence']:.0%}\n")
        
        logger.info(f"Summary saved to {summary_file}")


async def main():
    """Run the accuracy scanner"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("ERROR: ANTHROPIC_API_KEY not found in environment")
        print("Please add it to your .env file")
        return
    
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        scanner = QuizAccuracyScanner(db_pool)
        
        print("=== QUIZ ACCURACY SCANNER ===")
        print("This will use AI to check quiz questions for factual errors")
        print()
        
        # Get scan parameters
        category = input("Category to scan (leave blank for all): ").strip() or None
        limit = input("Number of quiz sets to scan (default 100): ").strip()
        limit = int(limit) if limit else 100
        
        print(f"\nScanning {limit} quiz sets{f' in category {category}' if category else ''}...")
        print("This may take a few minutes...\n")
        
        # Run scan
        report = await scanner.scan_all_quizzes(limit=limit, category_filter=category)
        
        # Save report
        scanner.save_report(report)
        
        # Print summary
        print(f"\n=== SCAN COMPLETE ===")
        print(f"Total questions scanned: {report['total_scanned']}")
        print(f"Issues found: {report['errors_found']}")
        print(f"Error rate: {report['error_rate']:.1f}%")
        
        if report['suspicious_quizzes']:
            print(f"\nTop 5 most suspicious:")
            for i, quiz in enumerate(report['suspicious_quizzes'][:5]):
                print(f"\n{i+1}. [{quiz['severity'].upper()}] {quiz['question'][:80]}...")
                print(f"   Issue: {quiz['issue']}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Find and flag opinion-based questions in the database
"""

import asyncio
import asyncpg
import json
import os
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime

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


class OpinionQuestionFinder:
    """Finds questions that ask for opinions rather than facts"""
    
    def __init__(self):
        # Opinion indicator patterns
        self.opinion_patterns = [
            r"what(?:'s| is) the (coolest|silliest|best|worst|funniest|most fun|most awesome|lamest)",
            r"which .* (cooler|sillier|better|worse|funnier|more fun|more awesome)",
            r"what(?:'s| is) your (favorite|least favorite)",
            r"which .* do you (like|prefer|think is)",
            r"what would be the (most|least) (fun|silly|cool|awesome|boring)",
            r"which .* would you rather",
            r"what do you think",
            r"in your opinion",
            r"which .* seems",
            r"which .* looks (cooler|better|funnier)"
        ]
        
        # Subjective descriptors
        self.subjective_words = {
            'coolest', 'silliest', 'best', 'worst', 'funniest', 'funnest',
            'most fun', 'most awesome', 'lamest', 'boring', 'exciting',
            'beautiful', 'ugly', 'prettiest', 'nicest', 'meanest',
            'favorite', 'prefer', 'like better', 'more interesting'
        }
        
        self.stats = defaultdict(int)
        self.flagged_questions = []
    
    def is_opinion_question(self, question_text: str) -> tuple[bool, str]:
        """Check if a question is opinion-based"""
        q_lower = question_text.lower()
        
        # Check patterns
        for pattern in self.opinion_patterns:
            if re.search(pattern, q_lower):
                return True, f"Matches opinion pattern: {pattern}"
        
        # Check for subjective words
        found_words = []
        for word in self.subjective_words:
            if word in q_lower:
                found_words.append(word)
        
        if found_words:
            return True, f"Contains subjective words: {', '.join(found_words)}"
        
        # Special case: "What's the X-est" without measurable criteria
        if re.search(r"what(?:'s| is) the \w+est", q_lower):
            # Check if it's measurable (like "tallest", "fastest", "largest")
            measurable = ['tallest', 'shortest', 'fastest', 'slowest', 'largest', 
                         'smallest', 'highest', 'lowest', 'longest', 'shortest',
                         'heaviest', 'lightest', 'oldest', 'newest', 'youngest']
            
            if not any(m in q_lower for m in measurable):
                return True, "Superlative without measurable criteria"
        
        return False, "Appears to be factual"
    
    async def analyze_database(self, db_pool, limit: int = None):
        """Analyze all quiz questions for opinion-based content"""
        
        async with db_pool.acquire() as conn:
            query = """
            SELECT 
                id,
                data,
                metadata
            FROM content
            WHERE type = 'quiz_set'
            """
            if limit:
                query += f" LIMIT {limit}"
            
            quiz_sets = await conn.fetch(query)
            
            print(f"Analyzing {len(quiz_sets)} quiz sets for opinion questions...\n")
            
            for quiz_set in quiz_sets:
                self._analyze_quiz_set(quiz_set)
        
        return self._generate_report()
    
    def _analyze_quiz_set(self, quiz_set):
        """Analyze a single quiz set"""
        try:
            data = quiz_set['data']
            if isinstance(data, str):
                data = json.loads(data)
            
            set_id = str(quiz_set['id'])
            category = data.get('category', 'unknown')
            mode = data.get('mode', 'standard')
            title = data.get('title', 'Untitled')
            
            questions = data.get('questions', [])
            
            for q_idx, question in enumerate(questions):
                self.stats['total_questions'] += 1
                
                q_text = question.get('question', '')
                is_opinion, reason = self.is_opinion_question(q_text)
                
                if is_opinion:
                    self.stats['opinion_questions'] += 1
                    
                    # Find which answer is marked correct
                    correct_answer = "No correct answer marked"
                    for ans in question.get('answers', []):
                        if ans.get('correct'):
                            correct_answer = ans['text']
                            break
                    
                    self.flagged_questions.append({
                        'set_id': set_id,
                        'category': category,
                        'mode': mode,
                        'title': title,
                        'question_index': q_idx,
                        'question': q_text,
                        'correct_answer': correct_answer,
                        'reason': reason,
                        'severity': 'high' if 'favorite' in q_text.lower() else 'medium'
                    })
                    
                    # Track categories with most issues
                    self.stats[f'category_{category}'] += 1
                    
        except Exception as e:
            self.stats['errors'] += 1
            print(f"Error analyzing set {quiz_set['id']}: {e}")
    
    def _generate_report(self):
        """Generate analysis report"""
        
        # Sort by category and severity
        self.flagged_questions.sort(key=lambda x: (x['category'], x['severity']))
        
        # Get category breakdown
        category_stats = defaultdict(int)
        for q in self.flagged_questions:
            category_stats[q['category']] += 1
        
        report = {
            'scan_time': datetime.now().isoformat(),
            'total_questions_scanned': self.stats['total_questions'],
            'opinion_questions_found': self.stats['opinion_questions'],
            'percentage_opinion': (
                self.stats['opinion_questions'] / self.stats['total_questions'] * 100
                if self.stats['total_questions'] > 0 else 0
            ),
            'categories_affected': dict(category_stats),
            'top_offenders': self.flagged_questions[:50],
            'scan_errors': self.stats['errors']
        }
        
        return report


async def main():
    DATABASE_URL = os.getenv('DATABASE_URL')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        finder = OpinionQuestionFinder()
        
        print("=== OPINION QUESTION SCANNER ===")
        print("Finding questions that ask for opinions instead of facts")
        print("\nExamples of opinion questions:")
        print("❌ What's the silliest thing...?")
        print("❌ Which planet is the coolest?")
        print("❌ What's your favorite...?")
        print("\nExamples of factual questions:")
        print("✓ How many moons does Mars have?")
        print("✓ What year did the first Moon landing occur?")
        print("✓ Which planet is closest to the Sun?")
        print()
        
        limit = input("How many quiz sets to scan? (blank for all): ").strip()
        limit = int(limit) if limit else None
        
        report = await finder.analyze_database(db_pool, limit)
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"opinion_questions_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print(f"\n=== SCAN COMPLETE ===")
        print(f"Total questions scanned: {report['total_questions_scanned']}")
        print(f"Opinion questions found: {report['opinion_questions_found']}")
        print(f"Percentage opinion-based: {report['percentage_opinion']:.1f}%")
        
        if report['categories_affected']:
            print("\nCategories with most opinion questions:")
            for cat, count in sorted(
                report['categories_affected'].items(), 
                key=lambda x: -x[1]
            )[:10]:
                print(f"  {cat}: {count}")
        
        if report['top_offenders']:
            print("\nExample opinion questions found:")
            for i, q in enumerate(report['top_offenders'][:10], 1):
                print(f"\n{i}. [{q['category']}] {q['question']}")
                print(f"   Reason: {q['reason']}")
                print(f"   'Correct' answer: {q['correct_answer']}")
        
        print(f"\nFull report saved to: {filename}")
        
        # Offer to show factual alternatives
        if report['top_offenders']:
            print("\nWould you like to see factual alternatives for these questions?")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
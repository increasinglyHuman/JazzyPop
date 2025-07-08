#!/usr/bin/env python3
"""
Analyze validation data patterns for JazzyPop quizzes
"""
import psycopg2
import json
from collections import Counter, defaultdict
import os
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import numpy as np

load_dotenv()

# Connect to database
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'jazzypop'),
    user=os.getenv('DB_USER', 'jazzypop_user'),
    password=os.getenv('DB_PASSWORD')
)

cur = conn.cursor()

# Get all validated quizzes
cur.execute('''
    SELECT 
        category,
        difficulty,
        topic_tags,
        validation_status,
        validation_scores,
        ai_feedback,
        data
    FROM content
    WHERE type = 'quiz' 
    AND validation_status IS NOT NULL
''')

quizzes = cur.fetchall()

# Initialize counters
category_stats = defaultdict(lambda: {'total': 0, 'approved': 0, 'avg_quality': 0, 'rejected': 0})
difficulty_dist = Counter()
tag_frequency = Counter()
tag_by_category = defaultdict(Counter)
quality_by_category = defaultdict(list)
feedback_patterns = defaultdict(int)
answer_patterns = defaultdict(lambda: {'correct': 0, 'detractors': 0})
detractor_quality = []

# Process each quiz
for quiz in quizzes:
    category, difficulty, tags, status, scores, feedback, data = quiz
    
    # Category stats
    category_stats[category]['total'] += 1
    if status == 'approved':
        category_stats[category]['approved'] += 1
    elif status == 'rejected':
        category_stats[category]['rejected'] += 1
    
    # Quality scores
    if scores:
        quality = scores.get('quality_score', 0)
        quality_by_category[category].append(quality)
    
    # Difficulty distribution
    difficulty_dist[difficulty] += 1
    
    # Tag analysis
    if tags:
        for tag in tags:
            tag_frequency[tag] += 1
            tag_by_category[category][tag] += 1
    
    # Feedback patterns
    if feedback:
        for key in ['strengths', 'weaknesses', 'suggestions']:
            if key in feedback:
                feedback_patterns[key] += len(feedback.get(key, []))
    
    # Answer patterns analysis
    if data and 'questions' in data:
        for question in data['questions']:
            if 'answers' in question:
                correct_count = sum(1 for a in question['answers'] if a.get('correct', False))
                detractor_count = len(question['answers']) - correct_count
                answer_patterns[category]['correct'] += correct_count
                answer_patterns[category]['detractors'] += detractor_count
                
                # Track detractor quality
                if scores:
                    detractor_quality.append({
                        'quality': scores.get('quality_score', 0),
                        'detractor_ratio': detractor_count / len(question['answers']) if question['answers'] else 0
                    })

# Calculate averages
for cat, stats in category_stats.items():
    if quality_by_category[cat]:
        stats['avg_quality'] = sum(quality_by_category[cat]) / len(quality_by_category[cat])

# Print results
print('\n=== CATEGORY ANALYSIS ===')
print(f"{'Category':<20} {'Total':<8} {'Approved':<10} {'Approval %':<12} {'Avg Quality':<12}")
print('-' * 62)
for cat, stats in sorted(category_stats.items(), key=lambda x: x[1]['total'], reverse=True)[:15]:
    approval_rate = (stats['approved'] / stats['total'] * 100) if stats['total'] > 0 else 0
    print(f"{cat:<20} {stats['total']:<8} {stats['approved']:<10} {approval_rate:<12.1f} {stats['avg_quality']:<12.1f}")

print('\n=== TOP 30 TAGS ===')
print(f"{'Tag':<40} {'Count':>8}")
print('-' * 48)
for tag, count in tag_frequency.most_common(30):
    print(f"{tag:<40} {count:>8}")

print('\n=== DIFFICULTY DISTRIBUTION ===')
total = len(quizzes)
for diff, count in sorted(difficulty_dist.items()):
    percentage = (count/total*100) if total > 0 else 0
    print(f"{diff:<10} {count:>5} ({percentage:>5.1f}%)")

print('\n=== TOP TAGS BY CATEGORY (Top 5 per category) ===')
for cat in sorted(list(tag_by_category.keys()))[:10]:
    print(f"\n{cat}:")
    for tag, count in tag_by_category[cat].most_common(5):
        print(f"  - {tag}: {count}")

print(f'\n=== FEEDBACK INSIGHTS ===')
print(f"Total strengths identified: {feedback_patterns['strengths']}")
print(f"Total weaknesses identified: {feedback_patterns['weaknesses']}")
print(f"Total suggestions made: {feedback_patterns['suggestions']}")

print('\n=== ANSWER PATTERN ANALYSIS ===')
print(f"{'Category':<20} {'Avg Correct':<15} {'Avg Detractors':<15} {'Ratio':<10}")
print('-' * 60)
for cat, patterns in sorted(answer_patterns.items(), key=lambda x: x[0]):
    total_questions = category_stats[cat]['total'] * 10  # 10 questions per quiz
    if total_questions > 0:
        avg_correct = patterns['correct'] / total_questions
        avg_detractors = patterns['detractors'] / total_questions
        ratio = avg_detractors / (avg_correct + avg_detractors) if (avg_correct + avg_detractors) > 0 else 0
        print(f"{cat:<20} {avg_correct:<15.2f} {avg_detractors:<15.2f} {ratio:<10.2%}")

# Quality vs Tag Count Analysis
print('\n=== QUALITY VS TAG COUNT ===')
quality_by_tag_count = defaultdict(list)
for quiz in quizzes:
    if quiz[4] and quiz[2]:  # Has scores and tags
        tag_count = len(quiz[2])
        quality = quiz[4].get('quality_score', 0)
        quality_by_tag_count[tag_count].append(quality)

print(f"{'Tag Count':<12} {'Avg Quality':<15} {'Sample Size':<12}")
print('-' * 40)
for tag_count in sorted(quality_by_tag_count.keys()):
    qualities = quality_by_tag_count[tag_count]
    avg_quality = sum(qualities) / len(qualities) if qualities else 0
    print(f"{tag_count:<12} {avg_quality:<15.1f} {len(qualities):<12}")

# Status distribution
print('\n=== VALIDATION STATUS DISTRIBUTION ===')
status_counts = Counter()
for quiz in quizzes:
    status_counts[quiz[3]] += 1

for status, count in status_counts.items():
    percentage = (count / len(quizzes) * 100) if quizzes else 0
    print(f"{status:<20} {count:>5} ({percentage:>5.1f}%)")

cur.close()
conn.close()

print("\n=== INSIGHTS SUMMARY ===")
print("1. Categories with highest approval rates indicate strongest content areas")
print("2. Tag frequency shows most covered topics across all quizzes")
print("3. Quality scores correlate with number of tags (more specific = higher quality)")
print("4. Detractor ratio analysis helps identify question design patterns")
print("5. Feedback patterns highlight areas for prompt improvement")
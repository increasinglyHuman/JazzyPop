#!/usr/bin/env python3
"""
Analyze the 698 partial packs to understand the fragmentation
"""

import asyncio
import asyncpg
import os
from collections import defaultdict
import json

async def analyze_partial_packs(db_pool):
    """Analyze partial pack distribution"""
    async with db_pool.acquire() as conn:
        # Get detailed breakdown
        query = """
        WITH pack_stats AS (
            SELECT 
                qs.set_id,
                qs.category,
                qs.mode,
                COUNT(qsq.quiz_id) as quiz_count,
                qs.created_at
            FROM quiz_sets qs
            LEFT JOIN quiz_set_questions qsq ON qs.set_id = qsq.set_id
            WHERE qs.is_active = true
            GROUP BY qs.set_id, qs.category, qs.mode, qs.created_at
        )
        SELECT 
            category,
            mode,
            quiz_count,
            COUNT(*) as pack_count,
            SUM(quiz_count) as total_quizzes
        FROM pack_stats
        WHERE quiz_count < 10
        GROUP BY category, mode, quiz_count
        ORDER BY category, mode, quiz_count DESC
        """
        
        rows = await conn.fetch(query)
        
        # Organize by category/mode
        category_stats = defaultdict(lambda: {
            'packs_by_size': defaultdict(int),
            'total_packs': 0,
            'total_quizzes': 0,
            'potential_full_packs': 0
        })
        
        for row in rows:
            key = f"{row['category']}/{row['mode']}"
            stats = category_stats[key]
            stats['packs_by_size'][row['quiz_count']] = row['pack_count']
            stats['total_packs'] += row['pack_count']
            stats['total_quizzes'] += row['total_quizzes']
        
        # Calculate potential full packs after rebalancing
        for key, stats in category_stats.items():
            stats['potential_full_packs'] = stats['total_quizzes'] // 10
            stats['leftover_quizzes'] = stats['total_quizzes'] % 10
        
        # Print analysis
        print("\n=== PARTIAL PACK ANALYSIS ===")
        print(f"Total categories/modes with partial packs: {len(category_stats)}")
        
        # Sort by most fragmented
        sorted_categories = sorted(
            category_stats.items(), 
            key=lambda x: x[1]['total_packs'], 
            reverse=True
        )
        
        print("\nTop 10 most fragmented categories:")
        for i, (key, stats) in enumerate(sorted_categories[:10]):
            print(f"\n{i+1}. {key}:")
            print(f"   Partial packs: {stats['total_packs']}")
            print(f"   Total quizzes: {stats['total_quizzes']}")
            print(f"   Can make {stats['potential_full_packs']} full packs")
            print(f"   Will have {stats['leftover_quizzes']} leftover quizzes")
            print("   Size distribution:")
            for size in sorted(stats['packs_by_size'].keys(), reverse=True):
                count = stats['packs_by_size'][size]
                print(f"     {size} quizzes: {count} packs")
        
        # Overall summary
        total_partial_packs = sum(s['total_packs'] for s in category_stats.values())
        total_quizzes = sum(s['total_quizzes'] for s in category_stats.values())
        total_possible_full = sum(s['potential_full_packs'] for s in category_stats.values())
        total_orphans = sum(s['leftover_quizzes'] for s in category_stats.values())
        
        print(f"\n=== OVERALL SUMMARY ===")
        print(f"Total partial packs: {total_partial_packs}")
        print(f"Total quizzes in partial packs: {total_quizzes}")
        print(f"Can create {total_possible_full} full packs")
        print(f"Will have {total_orphans} orphan quizzes")
        print(f"Pack reduction: {total_partial_packs} → {total_possible_full} (saving {total_partial_packs - total_possible_full} packs)")
        
        # Save detailed report
        with open('partial_pack_analysis.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_partial_packs': total_partial_packs,
                    'total_quizzes': total_quizzes,
                    'potential_full_packs': total_possible_full,
                    'orphan_quizzes': total_orphans
                },
                'categories': dict(category_stats)
            }, f, indent=2, default=str)
        
        print("\nDetailed report saved to: partial_pack_analysis.json")
        
        return category_stats


async def estimate_rebalancing_time(category_stats):
    """Estimate how long rebalancing will take"""
    total_operations = 0
    for stats in category_stats.values():
        # Each pack needs to be examined
        total_operations += stats['total_packs']
        # Transfers needed
        total_operations += stats['total_quizzes'] // 2  # Rough estimate
    
    # Assume 100ms per operation (conservative)
    estimated_seconds = total_operations * 0.1
    estimated_minutes = estimated_seconds / 60
    
    print(f"\n=== TIME ESTIMATE ===")
    print(f"Estimated operations: {total_operations:,}")
    print(f"Estimated time: {estimated_minutes:.1f} minutes")
    print(f"Note: This is a conservative estimate. Actual time may vary.")


async def main():
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        stats = await analyze_partial_packs(db_pool)
        await estimate_rebalancing_time(stats)
    finally:
        await db_pool.close()


if __name__ == "__main__":
    asyncio.run(main())
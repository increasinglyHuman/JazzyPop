#!/usr/bin/env python3
"""
Backup quiz-related data before running rebalancer
Creates a timestamped backup of quiz_sets and quiz_set_questions
"""

import asyncio
import asyncpg
import os
import json
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backup_quiz_data(db_pool, backup_dir="backups"):
    """Create backup of quiz data"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{backup_dir}/quiz_backup_{timestamp}"
    
    # Create backup directory
    os.makedirs(backup_path, exist_ok=True)
    
    async with db_pool.acquire() as conn:
        # Backup quiz_sets
        logger.info("Backing up quiz_sets...")
        quiz_sets = await conn.fetch("""
            SELECT 
                set_id, category, mode, created_at, is_active, metadata,
                (SELECT COUNT(*) FROM quiz_set_questions WHERE set_id = qs.set_id) as quiz_count
            FROM quiz_sets qs
            WHERE is_active = true
            ORDER BY category, mode, created_at
        """)
        
        with open(f"{backup_path}/quiz_sets.json", 'w') as f:
            json.dump([dict(row) for row in quiz_sets], f, indent=2, default=str)
        
        # Backup quiz_set_questions with quiz data
        logger.info("Backing up quiz_set_questions...")
        quiz_questions = await conn.fetch("""
            SELECT 
                qsq.set_id,
                qsq.quiz_id,
                qsq.position,
                q.question,
                q.answers,
                q.category,
                q.mode
            FROM quiz_set_questions qsq
            JOIN quizzes q ON qsq.quiz_id = q.id
            JOIN quiz_sets qs ON qsq.set_id = qs.set_id
            WHERE qs.is_active = true
            ORDER BY qsq.set_id, qsq.position
        """)
        
        with open(f"{backup_path}/quiz_set_questions.json", 'w') as f:
            json.dump([dict(row) for row in quiz_questions], f, indent=2, default=str)
        
        # Create summary
        summary = {
            "backup_timestamp": timestamp,
            "total_quiz_sets": len(quiz_sets),
            "total_quiz_questions": len(quiz_questions),
            "partial_packs": sum(1 for s in quiz_sets if s['quiz_count'] < 10),
            "empty_packs": sum(1 for s in quiz_sets if s['quiz_count'] == 0)
        }
        
        with open(f"{backup_path}/backup_summary.json", 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Backup completed: {backup_path}")
        return backup_path


async def create_restore_script(backup_path):
    """Create SQL restore script from backup"""
    restore_script = f"""
-- Restore script for quiz data backup
-- Generated from: {backup_path}

-- First, disable quiz sets that will be restored
UPDATE quiz_sets 
SET is_active = false, 
    metadata = jsonb_set(
        COALESCE(metadata, '{{}}'::jsonb),
        '{{backup_restore}}',
        '{{"reason": "preparing_for_restore", "timestamp": "{datetime.now().isoformat()}"}}'::jsonb
    )
WHERE is_active = true;

-- Clear existing quiz set questions
DELETE FROM quiz_set_questions 
WHERE set_id IN (SELECT set_id FROM quiz_sets WHERE is_active = false);

"""
    
    # Load backup data
    with open(f"{backup_path}/quiz_sets.json", 'r') as f:
        quiz_sets = json.load(f)
    
    with open(f"{backup_path}/quiz_set_questions.json", 'r') as f:
        quiz_questions = json.load(f)
    
    # Generate restore commands
    restore_script += "\n-- Restore quiz sets\n"
    for qs in quiz_sets:
        restore_script += f"""
INSERT INTO quiz_sets (set_id, category, mode, created_at, is_active, metadata)
VALUES (
    '{qs['set_id']}',
    '{qs['category']}',
    '{qs['mode']}',
    '{qs['created_at']}',
    {qs['is_active']},
    '{json.dumps(qs.get('metadata', {}))}'::jsonb
)
ON CONFLICT (set_id) DO UPDATE
SET category = EXCLUDED.category,
    mode = EXCLUDED.mode,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata;
"""
    
    restore_script += "\n-- Restore quiz set questions\n"
    for qsq in quiz_questions:
        restore_script += f"""
INSERT INTO quiz_set_questions (set_id, quiz_id, position)
VALUES ('{qsq['set_id']}', '{qsq['quiz_id']}', {qsq['position']})
ON CONFLICT (set_id, quiz_id) DO UPDATE
SET position = EXCLUDED.position;
"""
    
    # Save restore script
    restore_file = f"{backup_path}/restore_quiz_data.sql"
    with open(restore_file, 'w') as f:
        f.write(restore_script)
    
    logger.info(f"Restore script created: {restore_file}")
    return restore_file


async def quick_backup(DATABASE_URL):
    """Quick backup function for command line use"""
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    
    try:
        backup_path = await backup_quiz_data(db_pool)
        restore_file = await create_restore_script(backup_path)
        
        print(f"\n✅ Backup completed successfully!")
        print(f"📁 Backup location: {backup_path}")
        print(f"🔧 Restore script: {restore_file}")
        print(f"\nTo restore: psql -d jazzypop -f {restore_file}")
        
    finally:
        await db_pool.close()


if __name__ == "__main__":
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/jazzypop')
    asyncio.run(quick_backup(DATABASE_URL))
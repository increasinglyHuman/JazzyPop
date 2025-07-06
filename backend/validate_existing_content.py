#!/usr/bin/env python3
"""
Batch Validation Script for Existing Quiz Content
Processes all existing quizzes through the triple validation system
Can be run separately from the main validation worker
"""

import asyncio
import logging
from datetime import datetime
import os
from dotenv import load_dotenv
from database import db
from validation_service import validation_service
import json
import argparse

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ExistingContentValidator:
    """Validates existing quiz content in batches"""
    
    def __init__(self, batch_size=10, delay_between_batches=5):
        self.batch_size = batch_size
        self.delay = delay_between_batches
        self.stats = {
            'total': 0,
            'processed': 0,
            'approved': 0,
            'needs_revision': 0,
            'rejected': 0,
            'errors': 0,
            'skipped': 0
        }
        
    async def validate_all_existing(self, force_revalidate=False):
        """Validate all existing quiz content"""
        logger.info("🚀 Starting validation of existing quiz content")
        
        await db.connect()
        
        try:
            # Get count of existing content
            total_count = await self._get_existing_count(force_revalidate)
            self.stats['total'] = total_count
            
            if total_count == 0:
                logger.info("No existing content to validate")
                return
            
            logger.info(f"📊 Found {total_count} quiz sets to validate")
            
            # Process in batches
            offset = 0
            while offset < total_count:
                batch = await self._fetch_batch(offset, force_revalidate)
                if not batch:
                    break
                
                logger.info(f"Processing batch {offset//self.batch_size + 1} ({len(batch)} sets)")
                
                for quiz_set in batch:
                    await self._validate_single(quiz_set)
                
                offset += self.batch_size
                
                # Progress report
                self._report_progress()
                
                # Delay between batches to avoid overwhelming the API
                if offset < total_count:
                    logger.info(f"💤 Waiting {self.delay} seconds before next batch...")
                    await asyncio.sleep(self.delay)
            
            # Final report
            self._final_report()
            
        finally:
            await db.disconnect()
    
    async def _get_existing_count(self, force_revalidate):
        """Get count of existing quiz sets"""
        async with db.pool.acquire() as conn:
            if force_revalidate:
                # Count all quiz sets
                count = await conn.fetchval("""
                    SELECT COUNT(*) FROM content
                    WHERE type = 'quiz_set'
                """)
            else:
                # Count only those not yet validated properly
                count = await conn.fetchval("""
                    SELECT COUNT(*) FROM content
                    WHERE type = 'quiz_set'
                    AND (validation_status = 'approved' AND quality_score = 0.80)
                    OR validation_status IS NULL
                """)
            
            return count
    
    async def _fetch_batch(self, offset, force_revalidate):
        """Fetch a batch of quiz sets"""
        async with db.pool.acquire() as conn:
            if force_revalidate:
                query = """
                    SELECT id, type, data, metadata, validation_status
                    FROM content
                    WHERE type = 'quiz_set'
                    ORDER BY created_at ASC
                    LIMIT $1 OFFSET $2
                """
            else:
                query = """
                    SELECT id, type, data, metadata, validation_status
                    FROM content
                    WHERE type = 'quiz_set'
                    AND (
                        (validation_status = 'approved' AND quality_score = 0.80)
                        OR validation_status IS NULL
                    )
                    ORDER BY created_at ASC
                    LIMIT $1 OFFSET $2
                """
            
            rows = await conn.fetch(query, self.batch_size, offset)
            
            return [{
                'id': row['id'],
                'type': row['type'],
                'data': json.loads(row['data']) if isinstance(row['data'], str) else row['data'],
                'metadata': json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata'],
                'current_status': row['validation_status']
            } for row in rows]
    
    async def _validate_single(self, quiz_set):
        """Validate a single quiz set"""
        quiz_set_id = quiz_set['id']
        
        try:
            # Check if it has real questions
            questions = quiz_set['data'].get('questions', [])
            if not questions:
                logger.warning(f"⚠️  Skipping {quiz_set_id}: No questions found")
                self.stats['skipped'] += 1
                return
            
            logger.info(f"🔍 Validating: {quiz_set_id}")
            
            # Mark as pending so the validation service will process it
            await self._mark_pending(quiz_set_id)
            
            # Run validation
            result = await validation_service.validate_quiz_set(quiz_set_id)
            
            # Update stats
            self.stats['processed'] += 1
            decision = result.get('decision', 'error')
            
            if decision == 'approved':
                self.stats['approved'] += 1
                logger.info(f"✅ Approved (Quality: {result.get('quality_score', 0):.2f})")
            elif decision == 'needs_revision':
                self.stats['needs_revision'] += 1
                logger.warning(f"⚠️  Needs revision (Passed: {result.get('passed_count', 0)}/10)")
            elif decision == 'rejected':
                self.stats['rejected'] += 1
                logger.error(f"❌ Rejected (Passed: {result.get('passed_count', 0)}/10)")
            else:
                self.stats['errors'] += 1
                logger.error(f"❌ Error during validation")
                
        except Exception as e:
            logger.error(f"Error validating {quiz_set_id}: {e}")
            self.stats['errors'] += 1
    
    async def _mark_pending(self, quiz_set_id):
        """Mark a quiz set as pending validation"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE content
                SET validation_status = 'pending',
                    metadata = jsonb_set(
                        COALESCE(metadata, '{}'),
                        '{batch_validation_requested}',
                        to_jsonb(CURRENT_TIMESTAMP)
                    )
                WHERE id = $1
            """, quiz_set_id)
    
    def _report_progress(self):
        """Report current progress"""
        processed = self.stats['processed'] + self.stats['skipped']
        percent = (processed / self.stats['total']) * 100 if self.stats['total'] > 0 else 0
        
        logger.info(f"""
📈 Progress: {processed}/{self.stats['total']} ({percent:.1f}%)
   ✅ Approved: {self.stats['approved']}
   ⚠️  Needs Revision: {self.stats['needs_revision']}
   ❌ Rejected: {self.stats['rejected']}
   ⏭️  Skipped: {self.stats['skipped']}
   🚫 Errors: {self.stats['errors']}
        """)
    
    def _final_report(self):
        """Generate final report"""
        total_processed = self.stats['processed']
        
        if total_processed == 0:
            logger.warning("No quiz sets were processed")
            return
        
        approval_rate = (self.stats['approved'] / total_processed) * 100
        revision_rate = (self.stats['needs_revision'] / total_processed) * 100
        rejection_rate = (self.stats['rejected'] / total_processed) * 100
        
        logger.info(f"""
✨ VALIDATION COMPLETE ✨
{'=' * 50}
Total Quiz Sets: {self.stats['total']}
Processed: {total_processed}
Skipped: {self.stats['skipped']}
Errors: {self.stats['errors']}

Results:
--------
✅ Approved: {self.stats['approved']} ({approval_rate:.1f}%)
⚠️  Needs Revision: {self.stats['needs_revision']} ({revision_rate:.1f}%)
❌ Rejected: {self.stats['rejected']} ({rejection_rate:.1f}%)

Quality Summary:
---------------
- Approval Rate: {approval_rate:.1f}%
- Total Requiring Action: {self.stats['needs_revision'] + self.stats['rejected']}
        """)

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Validate existing JazzyPop quiz content')
    parser.add_argument(
        '--batch-size', 
        type=int, 
        default=10,
        help='Number of quiz sets to process at once (default: 10)'
    )
    parser.add_argument(
        '--delay', 
        type=int, 
        default=5,
        help='Seconds to wait between batches (default: 5)'
    )
    parser.add_argument(
        '--force-revalidate',
        action='store_true',
        help='Force revalidation of all content, even if already validated'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be validated without actually doing it'
    )
    
    args = parser.parse_args()
    
    if args.dry_run:
        logger.info("🏃 DRY RUN MODE - No changes will be made")
        await dry_run()
        return
    
    validator = ExistingContentValidator(
        batch_size=args.batch_size,
        delay_between_batches=args.delay
    )
    
    try:
        await validator.validate_all_existing(force_revalidate=args.force_revalidate)
    except KeyboardInterrupt:
        logger.info("\n⚠️  Validation interrupted by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        raise

async def dry_run():
    """Show what would be validated"""
    await db.connect()
    
    try:
        # Count different categories
        async with db.pool.acquire() as conn:
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE validation_status = 'approved' AND quality_score = 0.80) as grandfathered,
                    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE validation_status = 'approved' AND quality_score != 0.80) as properly_validated,
                    COUNT(*) FILTER (WHERE validation_status = 'needs_revision') as needs_revision,
                    COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected,
                    COUNT(*) FILTER (WHERE validation_status IS NULL) as no_status
                FROM content
                WHERE type = 'quiz_set'
            """)
            
            logger.info(f"""
📊 Current Quiz Set Status:
{'=' * 50}
Total Quiz Sets: {stats['total']}

Validation Status:
- Grandfathered (need validation): {stats['grandfathered']}
- Pending validation: {stats['pending']}
- Properly validated: {stats['properly_validated']}
- Needs revision: {stats['needs_revision']}
- Rejected: {stats['rejected']}
- No status: {stats['no_status']}

Would validate: {stats['grandfathered'] + stats['no_status']} quiz sets
            """)
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
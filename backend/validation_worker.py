#!/usr/bin/env python3
"""
Validation Worker - Background process for validating quiz content
Processes pending quiz sets through the triple validation system
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from database import db
from validation_service import validation_service
import json

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ValidationWorker:
    """Background worker for processing validation queue"""
    
    def __init__(self):
        self.running = True
        self.batch_size = int(os.getenv('VALIDATION_BATCH_SIZE', '5'))
        self.sleep_interval = int(os.getenv('VALIDATION_INTERVAL', '60'))  # seconds
        self.stats = {
            'processed': 0,
            'approved': 0,
            'rejected': 0,
            'errors': 0,
            'started_at': datetime.utcnow()
        }
        
    async def start(self):
        """Start the validation worker"""
        logger.info("🚀 Starting JazzyPop Validation Worker")
        logger.info(f"Batch size: {self.batch_size} sets")
        logger.info(f"Check interval: {self.sleep_interval} seconds")
        
        # Set up graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        
        await db.connect()
        logger.info("✅ Connected to database")
        
        try:
            while self.running:
                await self._process_batch()
                
                if self.running:
                    logger.info(f"💤 Sleeping for {self.sleep_interval} seconds...")
                    await asyncio.sleep(self.sleep_interval)
                    
        except Exception as e:
            logger.error(f"❌ Worker error: {e}")
        finally:
            await self._cleanup()
    
    async def _process_batch(self):
        """Process a batch of pending validations"""
        try:
            # Fetch pending quiz sets
            pending_sets = await self._fetch_pending_sets()
            
            if not pending_sets:
                logger.debug("No pending quiz sets to validate")
                return
            
            logger.info(f"📋 Processing {len(pending_sets)} quiz sets")
            
            for quiz_set in pending_sets:
                if not self.running:
                    break
                    
                await self._process_single_set(quiz_set)
                
            # Log statistics
            self._log_stats()
            
        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            self.stats['errors'] += 1
    
    async def _fetch_pending_sets(self):
        """Fetch quiz sets pending validation"""
        async with db.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, type, data, metadata
                FROM content
                WHERE type = 'quiz_set'
                AND validation_status = 'pending'
                ORDER BY created_at ASC
                LIMIT $1
            """, self.batch_size)
            
            return [{
                'id': row['id'],
                'type': row['type'],
                'data': json.loads(row['data']) if isinstance(row['data'], str) else row['data'],
                'metadata': json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata']
            } for row in rows]
    
    async def _process_single_set(self, quiz_set):
        """Process a single quiz set through validation"""
        quiz_set_id = quiz_set['id']
        logger.info(f"🔍 Validating quiz set: {quiz_set_id}")
        
        try:
            # Mark as processing to prevent duplicate work
            await self._mark_processing(quiz_set_id)
            
            # Run validation
            result = await validation_service.validate_quiz_set(quiz_set_id)
            
            # Update statistics
            self.stats['processed'] += 1
            if result.get('decision') == 'approved':
                self.stats['approved'] += 1
                logger.info(f"✅ Approved: {quiz_set_id} (Quality: {result['quality_score']:.2f})")
            elif result.get('decision') == 'rejected':
                self.stats['rejected'] += 1
                logger.warning(f"❌ Rejected: {quiz_set_id} (Passed: {result['passed_count']}/10)")
            else:
                logger.info(f"⚠️  Needs revision: {quiz_set_id}")
                
        except Exception as e:
            logger.error(f"Error validating {quiz_set_id}: {e}")
            self.stats['errors'] += 1
            
            # Mark as error
            await self._mark_error(quiz_set_id, str(e))
    
    async def _mark_processing(self, quiz_set_id):
        """Mark a quiz set as being processed"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE content
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'),
                    '{validation_started_at}',
                    to_jsonb(CURRENT_TIMESTAMP)
                )
                WHERE id = $1
            """, quiz_set_id)
    
    async def _mark_error(self, quiz_set_id, error_message):
        """Mark a quiz set as having an error"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE content
                SET validation_status = 'error',
                    metadata = jsonb_set(
                        COALESCE(metadata, '{}'),
                        '{validation_error}',
                        $2
                    )
                WHERE id = $1
            """, quiz_set_id, json.dumps({
                'error': error_message,
                'timestamp': datetime.utcnow().isoformat()
            }))
    
    def _log_stats(self):
        """Log current statistics"""
        runtime = datetime.utcnow() - self.stats['started_at']
        hours = runtime.total_seconds() / 3600
        
        logger.info(f"""
📊 Validation Worker Statistics:
  Runtime: {runtime}
  Processed: {self.stats['processed']} sets
  Approved: {self.stats['approved']} ({self._percent(self.stats['approved'], self.stats['processed'])}%)
  Rejected: {self.stats['rejected']} ({self._percent(self.stats['rejected'], self.stats['processed'])}%)
  Errors: {self.stats['errors']}
  Rate: {self.stats['processed'] / hours:.1f} sets/hour
        """)
    
    def _percent(self, part, whole):
        """Calculate percentage safely"""
        if whole == 0:
            return 0
        return round(100 * part / whole, 1)
    
    def _handle_shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        logger.info("🛑 Shutdown signal received, finishing current batch...")
        self.running = False
    
    async def _cleanup(self):
        """Clean up resources"""
        logger.info("🧹 Cleaning up...")
        await db.disconnect()
        logger.info("✅ Validation worker stopped")
        self._log_stats()

async def main():
    """Main entry point"""
    worker = ValidationWorker()
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
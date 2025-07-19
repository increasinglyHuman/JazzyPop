#!/usr/bin/env python3
"""
Setup script for roaring bitmap deduplication
Run this once to initialize the system
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from database import db
from roaring_bitmap_dedup import RoaringBitmapDeduplication, migrate_existing_seen_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup_roaring_bitmaps():
    """Initialize roaring bitmap tables and migrate existing data"""
    
    try:
        # Connect to database
        await db.connect()
        logger.info("Connected to database")
        
        # Initialize roaring bitmap system
        rb_dedup = RoaringBitmapDeduplication()
        
        async with db.pool.acquire() as conn:
            # Create tables
            logger.info("Creating roaring bitmap tables...")
            await rb_dedup.initialize_user_bitmaps(conn)
            
            # Check if we have existing data to migrate
            user_count = await conn.fetchval("""
                SELECT COUNT(*) FROM users 
                WHERE completed_content IS NOT NULL 
                   OR preferences->'completed_content' IS NOT NULL
            """)
            
            if user_count > 0:
                logger.info(f"Found {user_count} users with existing data to migrate")
                
                response = input("Migrate existing data to roaring bitmaps? (y/n): ")
                if response.lower() == 'y':
                    await migrate_existing_seen_data(conn)
                else:
                    logger.info("Skipping migration")
            else:
                logger.info("No existing data to migrate")
            
            # Show some stats
            logger.info("\nRoaring bitmap system is ready!")
            
            # Test the system
            logger.info("\nRunning system test...")
            
            # Create a test user if needed
            test_user_id = "550e8400-e29b-41d4-a716-446655440000"
            
            # Get a random quote
            quote = await conn.fetchrow("""
                SELECT id FROM content 
                WHERE type = 'quote_set' 
                LIMIT 1
            """)
            
            if quote:
                # Mark it as seen
                await rb_dedup.mark_content_seen(
                    conn, test_user_id, "quote", str(quote['id'])
                )
                
                # Get stats
                stats = await rb_dedup.get_user_stats(
                    conn, test_user_id, "quote"
                )
                
                logger.info(f"Test successful! Stats: {stats}")
            else:
                logger.info("No content found for testing")
                
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        raise
    finally:
        await db.disconnect()
        logger.info("Disconnected from database")

if __name__ == "__main__":
    asyncio.run(setup_roaring_bitmaps())
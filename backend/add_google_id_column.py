#!/usr/bin/env python3
"""
Add google_id column to users table if it doesn't exist
"""

import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_google_id_column():
    """Add google_id column to users table"""
    try:
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Check if column exists
            column_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'google_id'
                )
            """)
            
            if column_exists:
                logger.info("✅ google_id column already exists")
            else:
                # Add the column
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN google_id VARCHAR(255) UNIQUE
                """)
                logger.info("✅ Added google_id column to users table")
                
                # Create index for faster lookups
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_google_id 
                    ON users(google_id)
                """)
                logger.info("✅ Created index on google_id")
            
            # Also ensure we have an index on email for fast lookups
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email 
                ON users(email)
            """)
            logger.info("✅ Ensured index on email exists")
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise
    finally:
        await db.disconnect()

if __name__ == "__main__":
    print("Adding google_id column to users table...")
    asyncio.run(add_google_id_column())
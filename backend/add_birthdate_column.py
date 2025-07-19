#!/usr/bin/env python3
"""
Add birthdate column to users table for age verification
"""

import asyncio
import asyncpg
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection parameters from environment
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'jazzypop')
DB_USER = os.getenv('DB_USER', 'jazzypop_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

async def add_birthdate_column():
    """Add birthdate column to users table"""
    try:
        # Connect to database
        conn = await asyncpg.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        logger.info("Connected to database")
        
        # Check if column already exists
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'birthdate'
            )
        """)
        
        if exists:
            logger.info("Column 'birthdate' already exists in users table")
        else:
            # Add the column
            await conn.execute("""
                ALTER TABLE users 
                ADD COLUMN birthdate DATE,
                ADD COLUMN terms_accepted_at TIMESTAMP
            """)
            logger.info("Added 'birthdate' and 'terms_accepted_at' columns to users table")
            
            # Add comment for documentation
            await conn.execute("""
                COMMENT ON COLUMN users.birthdate IS 'User date of birth for age verification (COPPA compliance)';
                COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted terms of service';
            """)
            logger.info("Added column comments")
        
        # Close connection
        await conn.close()
        logger.info("Database changes completed successfully")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(add_birthdate_column())
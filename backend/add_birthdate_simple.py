#!/usr/bin/env python3
"""
Simple migration to add birthdate column using existing database module
"""

import asyncio
import logging
from database import db

logger = logging.getLogger(__name__)

async def add_birthdate_column():
    """Add birthdate and terms_accepted_at columns to users table"""
    try:
        # Connect using existing database module
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Check if birthdate column exists
            exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'birthdate'
                )
            """)
            
            if not exists:
                # Add birthdate column
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN birthdate DATE
                """)
                print("Added birthdate column to users table")
            else:
                print("birthdate column already exists")
            
            # Check if terms_accepted_at column exists
            exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'terms_accepted_at'
                )
            """)
            
            if not exists:
                # Add terms_accepted_at column
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN terms_accepted_at TIMESTAMP
                """)
                print("Added terms_accepted_at column to users table")
            else:
                print("terms_accepted_at column already exists")
            
            # Add comments for documentation
            await conn.execute("""
                COMMENT ON COLUMN users.birthdate IS 'User date of birth for age verification (COPPA compliance)';
                COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted terms of service';
            """)
            print("Added column comments")
            
        # Disconnect
        await db.disconnect()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration error: {e}")
        await db.disconnect()
        raise

if __name__ == "__main__":
    asyncio.run(add_birthdate_column())
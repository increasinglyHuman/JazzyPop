#!/usr/bin/env python3
"""
Add password_hash column to users table for email/password authentication

This script:
1. Checks if password_hash column exists
2. Adds it if it doesn't
3. Creates an index for performance
"""

import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_password_column():
    """Add password_hash column to users table"""
    try:
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Check if column exists
            column_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'password_hash'
                )
            """)
            
            if column_exists:
                logger.info("✅ password_hash column already exists")
            else:
                # Add the column
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN password_hash VARCHAR(255)
                """)
                logger.info("✅ Added password_hash column to users table")
            
            # Also check for email_verified column (for future use)
            email_verified_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'email_verified'
                )
            """)
            
            if not email_verified_exists:
                await conn.execute("""
                    ALTER TABLE users 
                    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
                """)
                logger.info("✅ Added email_verified column")
            
            # Ensure we have an index on email for fast lookups
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email 
                ON users(email)
            """)
            logger.info("✅ Ensured index on email exists")
            
            # Display current schema
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN ('id', 'username', 'email', 'password_hash', 'google_id', 'email_verified')
                ORDER BY ordinal_position
            """)
            
            print("\n📋 Relevant users table columns:")
            print("-" * 50)
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                print(f"  {col['column_name']:<20} {col['data_type']:<15} {nullable}")
            print("-" * 50)
            
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise
    finally:
        await db.disconnect()

if __name__ == "__main__":
    print("🔧 Setting up password authentication columns...")
    asyncio.run(add_password_column())
    print("\n✅ Database ready for password authentication!")
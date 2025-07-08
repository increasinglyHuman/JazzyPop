#!/usr/bin/env python3
"""
Check the current users table schema
This helps us understand what columns we already have
"""

import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_schema():
    """Check users table columns"""
    try:
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Get all columns in users table
            columns = await conn.fetch("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """)
            
            print("\n=== Current Users Table Schema ===")
            print("-" * 80)
            
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                max_len = f"({col['character_maximum_length']})" if col['character_maximum_length'] else ""
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                
                print(f"{col['column_name']:<20} {col['data_type']}{max_len:<15} {nullable:<10}{default}")
            
            print("-" * 80)
            
            # Check if password_hash exists
            password_exists = any(col['column_name'] == 'password_hash' for col in columns)
            google_id_exists = any(col['column_name'] == 'google_id' for col in columns)
            
            print(f"\n✓ password_hash column exists: {password_exists}")
            print(f"✓ google_id column exists: {google_id_exists}")
            
            # Count users
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            google_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE google_id IS NOT NULL")
            
            print(f"\nTotal users: {user_count}")
            print(f"Google auth users: {google_users}")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    print("Checking users table schema...")
    asyncio.run(check_schema())
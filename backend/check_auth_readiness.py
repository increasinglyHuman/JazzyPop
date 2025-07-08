#!/usr/bin/env python3
"""
Check if database is ready for email/password authentication
"""

import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_auth_readiness():
    """Check if we're ready for password auth"""
    try:
        await db.connect()
        
        async with db.pool.acquire() as conn:
            # Check what columns we have
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """)
            
            print("\n📋 Current users table schema:")
            print("=" * 60)
            
            important_cols = {}
            for col in columns:
                col_name = col['column_name']
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                print(f"  {col_name:<20} {col['data_type']:<15} {nullable}")
                
                # Track important columns
                if col_name in ['id', 'email', 'password_hash', 'google_id', 'username', 'display_name']:
                    important_cols[col_name] = True
            
            print("=" * 60)
            
            # Check readiness
            print("\n🔍 Authentication Readiness Check:")
            print("-" * 40)
            
            has_password = 'password_hash' in important_cols
            has_email = 'email' in important_cols
            has_google = 'google_id' in important_cols
            
            print(f"✓ Email column: {'✅ Ready' if has_email else '❌ Missing'}")
            print(f"✓ Password hash column: {'✅ Ready' if has_password else '❌ Missing'}")
            print(f"✓ Google ID column: {'✅ Ready' if has_google else '⚠️  Missing (but not critical)'}")
            
            # Check for existing users
            total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
            users_with_email = await conn.fetchval("SELECT COUNT(*) FROM users WHERE email IS NOT NULL")
            users_with_password = await conn.fetchval("SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL")
            
            print(f"\n📊 Current User Stats:")
            print(f"  Total users: {total_users}")
            print(f"  Users with email: {users_with_email}")
            print(f"  Users with password: {users_with_password}")
            
            if has_password and has_email:
                print("\n✅ Database is READY for email/password authentication!")
            else:
                print("\n❌ Database needs setup for email/password authentication")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_auth_readiness())
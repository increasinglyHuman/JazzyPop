#!/usr/bin/env python3
"""
Database optimization script to reduce memory usage
"""
import asyncio
import asyncpg
import os
from datetime import datetime

async def check_connections():
    """Check current database connections"""
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Get connection stats
    result = await conn.fetch("""
        SELECT 
            count(*) as total,
            state,
            usename,
            application_name
        FROM pg_stat_activity 
        WHERE datname = 'jazzypop'
        GROUP BY state, usename, application_name
        ORDER BY count(*) DESC;
    """)
    
    print(f"\n=== Database Connections at {datetime.now()} ===")
    total = 0
    for row in result:
        print(f"{row['usename']}: {row['total']} connections ({row['state'] or 'active'}) - {row['application_name'] or 'unknown'}")
        total += row['total']
    print(f"Total connections: {total}")
    
    # Get database settings
    max_conn = await conn.fetchval("SHOW max_connections;")
    print(f"Max connections allowed: {max_conn}")
    
    # Kill idle connections older than 5 minutes
    killed = await conn.fetch("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'jazzypop'
        AND state = 'idle'
        AND state_change < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
    """)
    print(f"Killed {len(killed)} idle connections")
    
    await conn.close()

async def optimize_settings():
    """Suggest optimized settings"""
    print("\n=== Recommended Settings for t2.micro ===")
    print("1. Update database.py:")
    print("   max_size=5  # Was 20")
    print("   min_size=1  # Add this")
    print("   max_inactive_connection_lifetime=300  # 5 minutes")
    print("")
    print("2. Update PostgreSQL settings:")
    print("   max_connections = 50  # Reduce from 100")
    print("   shared_buffers = 128MB  # 25% of RAM")
    print("")
    print("3. For each generator, add connection closing:")
    print("   await db.disconnect() after each cycle")

if __name__ == "__main__":
    asyncio.run(check_connections())
    asyncio.run(optimize_settings())
#!/usr/bin/env python3
import asyncio
from database import db

async def check_session():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Check the session
        session = await conn.fetchrow("""
            SELECT * FROM sessions 
            WHERE session_id = $1
        """, '1752649780955-sj9tcd1bj')
        
        if session:
            print(f"Session found!")
            print(f"  Session ID: {session['session_id']}")
            print(f"  User ID: {session['user_id'] or 'None (anonymous)'}")
            print(f"  Created: {session['created_at']}")
            
            if session['user_id']:
                user = await conn.fetchrow("""
                    SELECT email FROM users WHERE id = $1
                """, session['user_id'])
                print(f"  User email: {user['email'] if user else 'Not found'}")
        else:
            print("Session not found in database")
        
        # Check recent sessions
        print("\nRecent sessions (last 10 mins):")
        recent = await conn.fetch("""
            SELECT session_id, user_id, created_at
            FROM sessions
            WHERE created_at > NOW() - INTERVAL '10 minutes'
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        for s in recent:
            user_info = "Anonymous" if not s['user_id'] else str(s['user_id'])[:8] + "..."
            print(f"  {s['created_at']}: {s['session_id'][:20]}... ({user_info})")
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_session())
#!/usr/bin/env python3
import asyncio
from database import db

async def check_tables():
    await db.connect()
    async with db.pool.acquire() as conn:
        # Check if tables exist
        tables = ['content_id_mapping', 'user_content_bitmaps']
        for table in tables:
            exists = await conn.fetchval(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                )
            """)
            print(f"{table}: {'EXISTS' if exists else 'MISSING'}")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_tables())
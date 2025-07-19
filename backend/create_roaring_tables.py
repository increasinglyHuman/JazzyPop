#!/usr/bin/env python3
"""Create roaring bitmap tables with proper error handling"""

import asyncio
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_tables():
    await db.connect()
    async with db.pool.acquire() as conn:
        try:
            # First check if extension exists
            ext_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'roaringbitmap'
                )
            """)
            
            if not ext_exists:
                logger.info("Creating roaringbitmap extension...")
                await conn.execute("CREATE EXTENSION IF NOT EXISTS roaringbitmap")
            else:
                logger.info("Roaringbitmap extension already exists")
            
            # Create content_id_mapping table
            logger.info("Creating content_id_mapping table...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS content_id_mapping (
                    id SERIAL PRIMARY KEY,
                    content_uuid UUID UNIQUE NOT NULL,
                    content_type VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create index for faster lookups
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_content_mapping_uuid 
                ON content_id_mapping(content_uuid)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_content_mapping_type 
                ON content_id_mapping(content_type)
            """)
            
            # Create user_content_bitmaps table
            logger.info("Creating user_content_bitmaps table...")
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_content_bitmaps (
                    user_id UUID NOT NULL,
                    content_type VARCHAR(50) NOT NULL,
                    seen_bitmap roaringbitmap,
                    completed_bitmap roaringbitmap,
                    last_updated TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (user_id, content_type)
                )
            """)
            
            # Create index for user lookups
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_bitmaps_user 
                ON user_content_bitmaps(user_id)
            """)
            
            logger.info("Tables created successfully!")
            
            # Verify tables exist
            tables = ['content_id_mapping', 'user_content_bitmaps']
            for table in tables:
                exists = await conn.fetchval(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """)
                logger.info(f"Table {table}: {'EXISTS' if exists else 'MISSING'}")
                
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            raise
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(create_tables())
#!/usr/bin/env python3
"""
Database migration to add validation and feedback fields to JazzyPop
Run this script to update the database schema for triple validation and player feedback
"""

import asyncio
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def add_validation_fields():
    """Add validation-related fields to the content table"""
    
    # Get database URL from environment
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to database")
        
        # Add validation fields to content table
        print("\n📋 Adding validation fields to content table...")
        
        await conn.execute("""
            ALTER TABLE content 
            ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'
        """)
        print("  ✓ Added validation_status field")
        
        await conn.execute("""
            ALTER TABLE content 
            ADD COLUMN IF NOT EXISTS validation_passes JSONB DEFAULT '{}'
        """)
        print("  ✓ Added validation_passes field")
        
        await conn.execute("""
            ALTER TABLE content 
            ADD COLUMN IF NOT EXISTS feedback_captions JSONB DEFAULT '{}'
        """)
        print("  ✓ Added feedback_captions field")
        
        await conn.execute("""
            ALTER TABLE content 
            ADD COLUMN IF NOT EXISTS difficulty_score INTEGER DEFAULT 3
            CHECK (difficulty_score >= 1 AND difficulty_score <= 5)
        """)
        print("  ✓ Added difficulty_score field (1-5)")
        
        await conn.execute("""
            ALTER TABLE content 
            ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.00
            CHECK (quality_score >= 0 AND quality_score <= 1)
        """)
        print("  ✓ Added quality_score field (0.00-1.00)")
        
        # Create player feedback table
        print("\n📋 Creating player_feedback table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS player_feedback (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                content_id UUID REFERENCES content(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                session_id VARCHAR(100),
                feedback_type VARCHAR(50) NOT NULL,
                feedback_data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT valid_feedback_type CHECK (
                    feedback_type IN ('flag', 'thumbs_up', 'thumbs_down', 'difficulty', 'emote')
                )
            )
        """)
        print("  ✓ Created player_feedback table")
        
        # Create feedback aggregation table for performance
        print("\n📋 Creating feedback_aggregates table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback_aggregates (
                content_id UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
                thumbs_up_count INTEGER DEFAULT 0,
                thumbs_down_count INTEGER DEFAULT 0,
                flag_count INTEGER DEFAULT 0,
                difficulty_votes JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
                emote_counts JSONB DEFAULT '{}',
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✓ Created feedback_aggregates table")
        
        # Create indexes
        print("\n📋 Creating indexes...")
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_content_validation_status 
            ON content(validation_status) 
            WHERE type IN ('quiz', 'quiz_set')
        """)
        print("  ✓ Created validation_status index")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_player_feedback_content 
            ON player_feedback(content_id, feedback_type)
        """)
        print("  ✓ Created player_feedback index")
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_player_feedback_user 
            ON player_feedback(user_id, created_at)
        """)
        print("  ✓ Created user feedback index")
        
        # Update existing content to have 'approved' status (grandfather in existing content)
        print("\n📋 Updating existing content...")
        result = await conn.execute("""
            UPDATE content 
            SET validation_status = 'approved',
                quality_score = 0.80
            WHERE type IN ('quiz', 'quiz_set') 
            AND validation_status = 'pending'
            AND created_at < CURRENT_TIMESTAMP
        """)
        count = int(result.split()[-1])
        print(f"  ✓ Updated {count} existing quiz items to 'approved' status")
        
        # Create trigger to update feedback aggregates
        print("\n📋 Creating aggregation trigger...")
        await conn.execute("""
            CREATE OR REPLACE FUNCTION update_feedback_aggregates()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Initialize aggregate row if it doesn't exist
                INSERT INTO feedback_aggregates (content_id)
                VALUES (NEW.content_id)
                ON CONFLICT (content_id) DO NOTHING;
                
                -- Update counts based on feedback type
                IF NEW.feedback_type = 'thumbs_up' THEN
                    UPDATE feedback_aggregates 
                    SET thumbs_up_count = thumbs_up_count + 1,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE content_id = NEW.content_id;
                ELSIF NEW.feedback_type = 'thumbs_down' THEN
                    UPDATE feedback_aggregates 
                    SET thumbs_down_count = thumbs_down_count + 1,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE content_id = NEW.content_id;
                ELSIF NEW.feedback_type = 'flag' THEN
                    UPDATE feedback_aggregates 
                    SET flag_count = flag_count + 1,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE content_id = NEW.content_id;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        
        await conn.execute("""
            DROP TRIGGER IF EXISTS trigger_update_feedback_aggregates ON player_feedback;
            CREATE TRIGGER trigger_update_feedback_aggregates
            AFTER INSERT ON player_feedback
            FOR EACH ROW EXECUTE FUNCTION update_feedback_aggregates();
        """)
        print("  ✓ Created feedback aggregation trigger")
        
        # Close connection
        await conn.close()
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        return False

async def verify_schema():
    """Verify the schema was updated correctly"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("\n🔍 Verifying schema updates...")
    
    # Check content table columns
    columns = await conn.fetch("""
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name IN ('validation_status', 'validation_passes', 
                           'feedback_captions', 'difficulty_score', 'quality_score')
        ORDER BY column_name
    """)
    
    print("\n📊 Content table validation columns:")
    for col in columns:
        print(f"  - {col['column_name']}: {col['data_type']} (default: {col['column_default']})")
    
    # Check player_feedback table
    feedback_exists = await conn.fetchval("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'player_feedback'
        )
    """)
    print(f"\n📊 Player feedback table exists: {'✅' if feedback_exists else '❌'}")
    
    # Check aggregates table
    aggregates_exists = await conn.fetchval("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'feedback_aggregates'
        )
    """)
    print(f"📊 Feedback aggregates table exists: {'✅' if aggregates_exists else '❌'}")
    
    await conn.close()

async def main():
    """Run the migration"""
    print("🚀 JazzyPop Validation Schema Migration")
    print("=" * 50)
    
    success = await add_validation_fields()
    
    if success:
        await verify_schema()
        print("\n✨ Migration completed! Your database is ready for triple validation.")
    else:
        print("\n⚠️  Migration failed. Please check the errors above.")

if __name__ == "__main__":
    asyncio.run(main())
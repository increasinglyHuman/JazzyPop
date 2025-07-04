-- Content Progression Tracking Schema
-- Tracks which content users have seen to provide fresh content

-- Create a table to track viewed content per user
CREATE TABLE IF NOT EXISTS user_content_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'quote', 'pun', 'joke', 'fact', etc.
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_count INTEGER DEFAULT 1,
    last_viewed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}', -- store additional info like correct/incorrect, time spent, etc.
    UNIQUE(user_id, content_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_content_views_user ON user_content_views(user_id, content_type, viewed_at);
CREATE INDEX idx_user_content_views_content ON user_content_views(content_id);

-- Create a view for getting unseen content
CREATE OR REPLACE VIEW unseen_content AS
SELECT 
    c.id,
    c.type,
    c.data,
    c.metadata,
    c.tags,
    c.created_at
FROM content c
WHERE c.is_active = true
AND NOT EXISTS (
    SELECT 1 
    FROM user_content_views ucv 
    WHERE ucv.content_id = c.id
);

-- Function to get next batch of content for user
CREATE OR REPLACE FUNCTION get_user_flashcards(
    p_user_id UUID,
    p_category VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    data JSONB,
    metadata JSONB,
    seen_before BOOLEAN
) AS $$
DECLARE
    v_content_type VARCHAR;
    v_unseen_count INTEGER;
BEGIN
    -- Map category to content type
    v_content_type := CASE p_category
        WHEN 'famous_quotes' THEN 'quote'
        WHEN 'bad_puns' THEN 'pun'
        WHEN 'knock_knock' THEN 'joke'
        ELSE 'trivia'
    END;
    
    -- Count unseen content
    SELECT COUNT(*) INTO v_unseen_count
    FROM content c
    WHERE c.type = v_content_type
    AND c.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_content_views ucv
        WHERE ucv.user_id = p_user_id
        AND ucv.content_id = c.id
    );
    
    -- If we have enough unseen content, return only unseen
    IF v_unseen_count >= p_limit THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.type,
            c.data,
            c.metadata,
            FALSE as seen_before
        FROM content c
        WHERE c.type = v_content_type
        AND c.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM user_content_views ucv
            WHERE ucv.user_id = p_user_id
            AND ucv.content_id = c.id
        )
        ORDER BY c.created_at DESC
        LIMIT p_limit;
    ELSE
        -- Mix unseen with least recently seen
        RETURN QUERY
        WITH ranked_content AS (
            SELECT 
                c.id,
                c.type,
                c.data,
                c.metadata,
                CASE WHEN ucv.id IS NULL THEN FALSE ELSE TRUE END as seen_before,
                COALESCE(ucv.last_viewed, '1970-01-01'::timestamptz) as last_viewed,
                ROW_NUMBER() OVER (
                    PARTITION BY (ucv.id IS NULL) 
                    ORDER BY 
                        CASE WHEN ucv.id IS NULL THEN 0 ELSE 1 END,
                        ucv.last_viewed ASC NULLS FIRST
                ) as rn
            FROM content c
            LEFT JOIN user_content_views ucv 
                ON ucv.content_id = c.id 
                AND ucv.user_id = p_user_id
            WHERE c.type = v_content_type
            AND c.is_active = true
        )
        SELECT id, type, data, metadata, seen_before
        FROM ranked_content
        WHERE rn <= p_limit
        ORDER BY seen_before, last_viewed
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_viewed timestamp
CREATE OR REPLACE FUNCTION update_last_viewed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_viewed = CURRENT_TIMESTAMP;
    NEW.view_count = OLD.view_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_last_viewed 
BEFORE UPDATE ON user_content_views
FOR EACH ROW 
WHEN (OLD.content_id = NEW.content_id AND OLD.user_id = NEW.user_id)
EXECUTE FUNCTION update_last_viewed();
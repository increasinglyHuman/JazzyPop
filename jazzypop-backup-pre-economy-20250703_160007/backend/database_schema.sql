-- JazzyPop Database Schema
-- Flexible, multi-tenant architecture with JSONB for adaptability

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (supports both authenticated and anonymous)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    avatar_id VARCHAR(100) DEFAULT 'default',
    display_name VARCHAR(100),
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Content table (quizzes, quotes, facts, games, etc.)
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'quiz', 'quote', 'fact', 'game_config'
    schema_version VARCHAR(10) DEFAULT '1.0',
    data JSONB NOT NULL, -- Flexible content storage
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}'
);

-- Quiz variations for different modes
CREATE TABLE content_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL, -- 'poqpoq', 'zen', 'chaos', 'speed'
    variation_data JSONB NOT NULL, -- Mode-specific content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table (everything that happens)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL, -- 'user', 'system', 'ai_generator', 'alm'
    type VARCHAR(100) NOT NULL, -- 'quiz_answered', 'content_created', etc.
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),
    content_id UUID REFERENCES content(id),
    payload JSONB NOT NULL,
    context JSONB DEFAULT '{}', -- tenant, channel, anonymous mode, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User progress and stats
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50),
    stats JSONB DEFAULT '{}', -- flexible stats storage
    streak_data JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (for anonymous users and active sessions)
CREATE TABLE sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    data JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}', -- twitch channel, etc.
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cards (promotional content)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'quiz_tease', 'announcement', etc.
    priority INTEGER DEFAULT 0,
    template VARCHAR(50),
    data JSONB NOT NULL,
    target_audience JSONB DEFAULT '{}', -- targeting rules
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboards (cached for performance)
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'all_time'
    mode VARCHAR(20), -- specific to a mode or null for all
    scores JSONB NOT NULL, -- array of {user_id, score, rank}
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-tenant support
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'streamer', 'organization', 'enterprise'
    settings JSONB DEFAULT '{}',
    api_keys JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add tenant_id to relevant tables
ALTER TABLE content ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE events ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE cards ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Indexes for performance
CREATE INDEX idx_content_type_active ON content(type, is_active);
CREATE INDEX idx_content_tags ON content USING GIN(tags);
CREATE INDEX idx_content_data ON content USING GIN(data);
CREATE INDEX idx_events_user_type ON events(user_id, type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_context ON events USING GIN(context);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_cards_active ON cards(starts_at, expires_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
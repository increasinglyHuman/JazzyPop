-- Supabase/PostgreSQL schema for Kawaii Quiz

-- Quizzes table
CREATE TABLE quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id VARCHAR(255) NOT NULL UNIQUE,
    questions JSONB NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_attempts_course_id ON quiz_attempts(course_id);
CREATE INDEX idx_attempts_completed_at ON quiz_attempts(completed_at DESC);

-- Row Level Security (optional, for Supabase)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Example question structure stored in JSONB:
-- {
--   "questions": [
--     {
--       "text": "What is 2 + 2?",
--       "type": "single",
--       "answers": ["3", "4", "5", "6"],
--       "correct": [1]
--     },
--     {
--       "text": "Select all prime numbers",
--       "type": "multiple", 
--       "answers": ["2", "4", "5", "9"],
--       "correct": [0, 2]
--     }
--   ]
-- }
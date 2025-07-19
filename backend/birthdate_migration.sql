-- Migration to add birthdate and terms acceptance columns to users table
-- Run this as postgres user or with sufficient privileges

-- Add birthdate column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'birthdate'
    ) THEN
        ALTER TABLE users ADD COLUMN birthdate DATE;
        COMMENT ON COLUMN users.birthdate IS 'User date of birth for age verification (COPPA compliance)';
        RAISE NOTICE 'Added birthdate column to users table';
    ELSE
        RAISE NOTICE 'birthdate column already exists';
    END IF;
END $$;

-- Add terms_accepted_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'terms_accepted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP;
        COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted terms of service';
        RAISE NOTICE 'Added terms_accepted_at column to users table';
    ELSE
        RAISE NOTICE 'terms_accepted_at column already exists';
    END IF;
END $$;

-- Show the updated table structure
\d users
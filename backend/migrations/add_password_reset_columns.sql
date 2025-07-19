-- Migration: Add password reset functionality columns to users table
-- Date: 2025-01-14
-- Purpose: Enable password reset flow with secure tokens

ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expires TIMESTAMP,
ADD INDEX idx_users_reset_token (reset_token);

-- Add comment for documentation
COMMENT ON COLUMN users.reset_token IS 'Secure token for password reset, should be hashed';
COMMENT ON COLUMN users.reset_token_expires IS 'Expiration timestamp for reset token';
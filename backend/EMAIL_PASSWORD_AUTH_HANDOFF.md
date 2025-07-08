# Email/Password Authentication Implementation Handoff

## Overview
This document outlines the implementation plan for email/password registration and login for JazzyPop, building on the existing Google OAuth infrastructure.

## Current State
- ✅ Google OAuth endpoint implemented at `/api/auth/google`
- ✅ User creation and session migration logic in place
- ⚠️ Missing `google_id` column in production (needs to be added)
- ✅ Authentication response model defined
- ✅ Session-to-user migration working

## Database Schema Requirements

### 1. Add password_hash column to users table
```sql
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255);

-- Index for email lookups (already exists from Google auth)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 2. Add email verification fields
```sql
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255) UNIQUE,
ADD COLUMN verification_token_expires TIMESTAMP;
```

## API Endpoints to Implement

### 1. Registration Endpoint
**POST** `/api/auth/register`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "display_name": "User Name",
  "session_id": "optional-session-to-migrate"
}
```

Response (same as Google auth):
```json
{
  "user_id": "uuid",
  "is_new_user": true,
  "display_name": "User Name",
  "avatar_id": "default",
  "migrated_data": false
}
```

Implementation Steps:
1. Validate email format and password strength
2. Check if email already exists
3. Hash password using bcrypt
4. Create user with verification token
5. Initialize user_progress
6. Migrate session data if provided
7. Send verification email (phase 2)

### 2. Login Endpoint
**POST** `/api/auth/login`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "user_id": "uuid",
  "is_new_user": false,
  "display_name": "User Name",
  "avatar_id": "avatar_id",
  "migrated_data": false
}
```

Implementation Steps:
1. Find user by email
2. Verify password against hash
3. Return user data

### 3. Password Reset Request
**POST** `/api/auth/password-reset/request`

Request Body:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "message": "Password reset email sent if account exists"
}
```

### 4. Password Reset Confirm
**POST** `/api/auth/password-reset/confirm`

Request Body:
```json
{
  "token": "reset-token",
  "new_password": "NewSecurePassword123!"
}
```

Response:
```json
{
  "message": "Password updated successfully"
}
```

## Implementation Code Structure

### 1. Password Utilities (add to main.py or separate auth.py)
```python
import bcrypt

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain number"
    return True, "Password is valid"
```

### 2. Database Methods (add to database.py)
```python
async def create_user_with_password(self, email: str, password_hash: str, 
                                   display_name: str) -> UUID:
    """Create user with email/password"""
    # Similar to existing create_user but with password_hash
    
async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
    """Get user by email for login"""
    
async def update_password(self, user_id: UUID, new_password_hash: str):
    """Update user password"""
```

### 3. Request/Response Models (add to main.py)
```python
class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password", min_length=8)
    display_name: str = Field(..., description="Display name")
    session_id: Optional[str] = Field(None, description="Session to migrate")

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")
```

## Security Considerations

1. **Password Requirements**:
   - Minimum 8 characters
   - At least 1 uppercase, 1 lowercase, 1 number
   - Consider adding special character requirement

2. **Rate Limiting**:
   - Implement rate limiting on auth endpoints
   - Especially important for login to prevent brute force

3. **Email Verification** (Phase 2):
   - Generate secure random tokens
   - Set expiration (24 hours)
   - Don't allow login until verified

4. **Session Management**:
   - Consider JWT tokens for stateless auth
   - Or session tokens with Redis storage

## Migration Strategy

1. **Existing Users**:
   - Users who signed up with Google can add password later
   - Add "Set Password" option in profile settings

2. **Dual Auth Support**:
   - Users can have both Google and password auth
   - Check google_id first, then fall back to password

## Testing Strategy

1. Create `test_email_auth.py` similar to `test_google_auth.py`
2. Test cases:
   - New user registration
   - Existing email registration attempt
   - Valid login
   - Invalid password login
   - Session migration during registration
   - Password reset flow

## Frontend Integration Notes

1. Registration form needs:
   - Email validation
   - Password strength indicator
   - Confirm password field
   - Terms acceptance checkbox

2. Login form needs:
   - Email/password fields
   - "Forgot password?" link
   - "Sign up" link
   - "Login with Google" option

3. Password reset flow:
   - Request reset form (email only)
   - Reset confirmation form (token in URL)

## Deployment Checklist

- [ ] Add password_hash column to production database
- [ ] Add email verification columns
- [ ] Deploy backend with new endpoints
- [ ] Update API documentation
- [ ] Test all flows on staging
- [ ] Monitor for registration errors
- [ ] Set up email service for verification/reset emails

## Next Steps After This Implementation

1. Email verification system
2. JWT or session token implementation
3. "Remember me" functionality
4. Two-factor authentication
5. Social login expansion (Facebook, etc.)
6. Account recovery options
7. Password change in profile settings

## Dependencies to Install

```bash
pip install bcrypt
pip install python-jose[cryptography]  # If using JWT
pip install email-validator
```

## Error Handling

Ensure consistent error responses:
- 400: Invalid input (bad email format, weak password)
- 401: Invalid credentials
- 409: Email already exists
- 500: Server errors

Always return generic messages for security:
- "Invalid email or password" (don't reveal which is wrong)
- "If account exists, reset email has been sent"
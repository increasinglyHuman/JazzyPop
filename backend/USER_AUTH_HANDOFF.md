# JazzyPop User Authentication System - Handoff Document
*Created: 2025-07-07*

## Summary of Current State

### What Was Fixed
1. **Energy Spending Endpoint** - Now always returns JSON, even on errors
2. **UUID Handling** - Backend gracefully handles non-existent user_ids by falling back to session storage
3. **No More 500 Errors** - System logs warnings but continues working

### Current Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                      │
                           ▼                      ▼
                    ┌────────────┐         ┌─────────────┐
                    │ Sessions   │         │    Users    │
                    │ (temporary)│         │ (permanent) │
                    └────────────┘         └─────────────┘
```

## Remaining Work

### 1. User Registration System (Priority: HIGH)

**Current Status**: `/api/users/profile` endpoint exists but doesn't create users

**Implementation Steps**:
```python
# In main.py - Replace the TODO with actual implementation
@app.post("/api/users/profile")
async def create_or_update_profile(profile: UserProfile):
    """Create or update user profile"""
    user_id = await db.create_user(
        username=profile.username,
        email=profile.email,
        display_name=profile.display_name,
        avatar_id=profile.avatar_id
    )
    return {"id": str(user_id), ...}
```

**Database Method Needed**:
```python
# In database.py
async def create_user(self, username: Optional[str], email: Optional[str], 
                     display_name: str, avatar_id: str = "default") -> UUID:
    """Create a new user account"""
    async with self.pool.acquire() as conn:
        # Check if username/email already exists
        # Create user with is_anonymous=False
        # Return new user_id
```

### 2. Session-to-User Migration (Priority: HIGH)

**Purpose**: When anonymous user registers, migrate their progress

**Implementation**:
```python
async def migrate_session_to_user(self, session_id: str, user_id: UUID):
    """Migrate session data to user account"""
    async with self.pool.acquire() as conn:
        # 1. Get session data
        # 2. Copy economy state to user_progress
        # 3. Update session with user_id link
        # 4. Update all events with user_id
```

### 3. Authentication Flow (Priority: MEDIUM)

**Current**: No actual authentication
**Needed**: Login/logout endpoints

```python
@app.post("/api/auth/login")
async def login(credentials: LoginCredentials):
    # Verify username/password
    # Create session
    # Return user_id + session_id

@app.post("/api/auth/logout")
async def logout(session_id: str):
    # Clear session
    # Return success
```

### 4. Frontend Updates (Priority: HIGH)

**Current Behavior**: Frontend generates random UUIDs
**Needed Behavior**: Proper user state management

```javascript
// Frontend should maintain:
const userState = {
  isAuthenticated: false,
  userId: null,        // Only set after registration/login
  sessionId: 'abc123', // Always present
}

// When calling API:
const payload = {
  session_id: userState.sessionId,
  // Only include user_id if authenticated
  ...(userState.isAuthenticated && { user_id: userState.userId })
}
```

### 5. API Contract Updates (Priority: MEDIUM)

Update OpenAPI documentation to clarify:
- `session_id` is REQUIRED for anonymous play
- `user_id` is OPTIONAL and only for authenticated users
- Registration flow documentation
- Authentication endpoints

## Immediate Next Steps

### Step 1: Implement User Creation
1. Update `create_or_update_profile` endpoint
2. Add `create_user` method to database.py
3. Add password hashing (use bcrypt)
4. Handle duplicate username/email errors

### Step 2: Implement Session Migration
1. Add migration method to database.py
2. Call it after successful registration
3. Test with existing session data

### Step 3: Basic Authentication
1. Add login endpoint
2. Add session validation
3. Update frontend to use proper auth flow

## Testing Checklist

- [ ] Can create new user account
- [ ] Duplicate username/email rejected
- [ ] Session data migrates on registration
- [ ] Login returns valid session
- [ ] Economy state persists correctly
- [ ] Frontend only sends user_id when authenticated

## Code Snippets for Next Session

### User Creation in database.py
```python
async def create_user(self, username: Optional[str], email: Optional[str], 
                     display_name: str, avatar_id: str = "default",
                     password: Optional[str] = None) -> UUID:
    """Create a new user account"""
    async with self.pool.acquire() as conn:
        try:
            user_id = await conn.fetchval("""
                INSERT INTO users (username, email, display_name, avatar_id, 
                                 password_hash, is_anonymous)
                VALUES ($1, $2, $3, $4, $5, FALSE)
                RETURNING id
            """, username, email, display_name, avatar_id, 
                self._hash_password(password) if password else None)
            
            # Initialize user_progress
            await conn.execute("""
                INSERT INTO user_progress (user_id, stats)
                VALUES ($1, '{"economy": {"energy": 100, "coins": 0}}'::jsonb)
            """, user_id)
            
            return user_id
        except asyncpg.UniqueViolationError as e:
            if 'username' in str(e):
                raise ValueError("Username already exists")
            elif 'email' in str(e):
                raise ValueError("Email already exists")
            raise
```

### Session Migration
```python
async def migrate_session_to_user(self, session_id: str, user_id: UUID):
    """Migrate session data to user account"""
    async with self.transaction() as conn:
        # Get session data
        session_data = await conn.fetchrow(
            "SELECT data FROM sessions WHERE id = $1", 
            session_id
        )
        
        if session_data and session_data['data']:
            economy = session_data['data'].get('economy', {})
            
            # Update user_progress
            await conn.execute("""
                UPDATE user_progress 
                SET stats = stats || jsonb_build_object('economy', $1::jsonb)
                WHERE user_id = $2
            """, json.dumps(economy), user_id)
            
            # Link session to user
            await conn.execute(
                "UPDATE sessions SET user_id = $1 WHERE id = $2",
                user_id, session_id
            )
```

## Dependencies to Add

```txt
# In requirements.txt
bcrypt==4.0.1  # For password hashing
python-jose==3.3.0  # For JWT tokens (if needed)
```

## Environment Variables Needed

```bash
# In .env
JWT_SECRET_KEY=your-secret-key-here
PASSWORD_SALT_ROUNDS=12
```

## Notes for Next Instance

1. The database schema is already set up correctly
2. Foreign key constraints are working as designed
3. The fix implemented today prevents crashes but doesn't create users
4. Frontend needs significant updates to handle auth properly
5. Consider implementing OAuth2 for better security

## Contact for Questions

If you need clarification on any implementation details, the current codebase structure is:
- `/backend/main.py` - API endpoints
- `/backend/database.py` - Database operations
- `/backend/database_schema.sql` - Table definitions
- `/frontend/src/components/EconomyClient.js` - Frontend API calls

Good luck with the implementation! 🚀
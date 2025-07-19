# Age Verification & Registration UI Fixes - Handoff Document
*Date: 2025-01-18*

## Overview
This document covers the implementation of age verification for Google OAuth users and fixes to the registration form UI.

## Issues Addressed

### 1. Google Sign-in Age Verification Bypass (COPPA Compliance)
**Problem**: Users could bypass age verification by signing in with Google instead of regular registration.
**Solution**: Implemented post-authentication age verification modal for Google users.

### 2. Registration Form UI Issues
**Problem**: 
- Weird blue bar appearing at top of registration form
- Checkbox not aligned properly with text (appearing above instead of inline)
**Solution**: Fixed CSS alignment and removed potential blue bar styles.

## Files Created/Modified

### Frontend Files

#### Created:
1. **`/frontend/src/components/AgeVerificationModal.js`**
   - Modal component for age verification after Google sign-in
   - Validates user is 13+ years old
   - Updates user profile with birthdate via API
   - Logs out user if they cancel or are under 13

2. **`/frontend/src/styles/components/age-verification-modal.css`**
   - Styling for the age verification modal
   - Consistent with JazzyPop design system

#### Modified:
1. **`/frontend/src/components/AuthPanel.js`**
   - Added check for `needs_age_verification` flag in auth response
   - Shows age verification modal for Google users without birthdate
   - Split `handleAuthSuccess` into two methods for better flow control

2. **`/frontend/index.html`**
   - Added age-verification-modal.css link
   - Added AgeVerificationModal.js script include

3. **`/frontend/src/styles/components/profile-selector.css`**
   - Added explicit styles to prevent blue bar
   - Added checkbox group styling for proper alignment
   - Removed potential pseudo-elements that could create unwanted styling

4. **`/frontend/src/styles/components/auth-age-verification.css`**
   - Changed checkbox alignment from `flex-start` to `center`
   - Removed `margin-top` from checkbox to keep it inline with text

### Backend Files

#### Created:
1. **`/backend/add_profile_update_endpoint.py`**
   - Script to add PATCH endpoint for user profile updates
   - Handles avatar_id and display_name updates

2. **`/backend/add_google_auth_age_check.py`**
   - Script to modify Google auth endpoint
   - Adds birthdate checking and validation
   - Returns `needs_age_verification` flag

#### Modified (via scripts):
1. **`/backend/main.py`**
   - Added PATCH `/api/users/{user_id}/profile` endpoint
   - Modified Google auth to check for birthdate
   - Added birthdate validation (13+ years)
   - Returns `needs_age_verification: true` for users without birthdate

## API Changes

### New Endpoint:
```
PATCH /api/users/{user_id}/profile
Body: {
    "avatar_id": "avatar_01",     // optional
    "display_name": "New Name",   // optional
    "birthdate": "2010-01-01"     // optional, must be 13+ years ago
}
```

### Modified Response:
**POST /api/auth/google** now returns:
```json
{
    "user_id": "...",
    "display_name": "...",
    "avatar_id": "...",
    "is_new_user": true/false,
    "migrated_data": true/false,
    "needs_age_verification": true/false  // NEW FIELD
}
```

## Deployment Steps

### 1. Stop Services (on server)
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
cd ~/jazzypop-backend

# Follow the aggressive restarter shutdown procedure from ADMIN_MANUAL_COMPLETE.md
ps aux | grep crash_recovery | grep -v grep
# Kill any found processes

sudo systemctl disable jazzypop-backend
sudo systemctl disable jazzypop-api
sudo systemctl stop jazzypop-backend
sudo systemctl stop jazzypop-api
```

### 2. Deploy Backend
```bash
# From local machine
cd /home/p0qp0q/Documents/Merlin/JazzyPop/backend
scp -i ~/.ssh/poqpoq2025.pem main.py ubuntu@p0qp0q.com:~/jazzypop-backend/
```

### 3. Deploy Frontend
```bash
# From local machine
cd /home/p0qp0q/Documents/Merlin/JazzyPop/frontend

# Copy new/modified files
scp -i ~/.ssh/poqpoq2025.pem src/components/AgeVerificationModal.js ubuntu@p0qp0q.com:/var/www/html/jazzypop/src/components/
scp -i ~/.ssh/poqpoq2025.pem src/components/AuthPanel.js ubuntu@p0qp0q.com:/var/www/html/jazzypop/src/components/
scp -i ~/.ssh/poqpoq2025.pem src/styles/components/age-verification-modal.css ubuntu@p0qp0q.com:/var/www/html/jazzypop/src/styles/components/
scp -i ~/.ssh/poqpoq2025.pem src/styles/components/profile-selector.css ubuntu@p0qp0q.com:/var/www/html/jazzypop/src/styles/components/
scp -i ~/.ssh/poqpoq2025.pem src/styles/components/auth-age-verification.css ubuntu@p0qp0q.com:/var/www/html/jazzypop/src/styles/components/
scp -i ~/.ssh/poqpoq2025.pem index.html ubuntu@p0qp0q.com:/var/www/html/jazzypop/
```

### 4. Restart Services
```bash
# On server
sudo systemctl enable jazzypop-backend
sudo systemctl enable jazzypop-api
sudo systemctl start jazzypop-backend
sudo systemctl start jazzypop-api

# Verify running
sudo systemctl status jazzypop-backend
sudo systemctl status jazzypop-api
```

### 5. Test
1. Try Google sign-in with a new account → should see age verification modal
2. Try regular registration → checkbox should be inline with text, no blue bar
3. Verify profile updates work (avatar selection)
4. Check that users under 13 are properly rejected

## User Flow

### Google Sign-in Flow:
1. User clicks "Sign in with Google"
2. Google OAuth completes
3. Backend checks if user has birthdate
4. If no birthdate:
   - Frontend receives `needs_age_verification: true`
   - Age verification modal appears
   - User must enter birthdate and accept terms
   - If under 13 or cancels → logged out
   - If 13+ → profile updated, continues normally
5. If has birthdate: normal login flow

### Regular Registration Flow:
1. User fills out registration form
2. Birthdate required upfront
3. Must check terms acceptance (checkbox now properly aligned)
4. Backend validates age during registration
5. No additional verification needed

## Notes
- The "weird blue bar" was prevented by adding explicit border and background removal
- Checkbox alignment fixed by changing from `flex-start` to `center`
- Age verification is COPPA compliant (13+ years)
- All users must have verified age to use the platform
- The birthdate is stored in the database for future reference

## Testing Checklist
- [ ] Google sign-in shows age verification for new users
- [ ] Google sign-in skips age verification for users with birthdate
- [ ] Age verification rejects users under 13
- [ ] Registration form has no blue bar at top
- [ ] Registration checkbox is inline with text
- [ ] Avatar selection syncs with backend
- [ ] Profile updates work correctly

## Rollback Plan
If issues arise:
1. The original files are unchanged on the server
2. Can revert main.py to previous version
3. Frontend changes are CSS-only for registration form
4. Age verification modal can be disabled by removing the check in AuthPanel.js
# Fix Google OAuth Age Verification Bypass

## Issue
Users can bypass age verification by using Google Sign-in, which creates a COPPA compliance violation.

## Solution Overview
1. Update backend to return `needs_age_verification` flag for Google users without birthdate
2. Frontend already has the code to handle this flag and show age verification modal
3. Ensure all auth methods check age verification

## Files to Deploy

### Backend Updates Needed:
1. **Update AuthResponse model** - Add needs_age_verification field
2. **Update Google auth endpoint** - Check if user has birthdate and set flag
3. **Update profile endpoint** - Allow birthdate updates

### Frontend Files (Already Created):
- `/frontend/src/components/AgeVerificationModal.js` - Age verification modal
- `/frontend/src/styles/components/age-verification-modal.css` - Modal styles
- `/frontend/src/components/AuthPanel.js` - Already checks for needs_age_verification
- `/frontend/index.html` - Already includes the necessary files

## Deployment Steps

### 1. Local Testing
```bash
# Backend updates
cd backend
python fix_auth_response_age_verification.py
python add_google_auth_age_check.py

# Test locally
# Start backend and test Google sign-in flow
```

### 2. Deploy to Production
```bash
# SSH to server
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com

# Backup current main.py
cd ~/jazzypop-backend
cp main.py main.py.backup_$(date +%Y%m%d_%H%M%S)

# Copy updated files
# From local:
scp -i ~/.ssh/poqpoq2025.pem backend/main.py ubuntu@p0qp0q.com:~/jazzypop-backend/

# On server:
sudo systemctl restart jazzypop-backend
```

### 3. Verify Fix
1. Sign out of JazzyPop
2. Try "Sign in with Google" with a new account
3. Should see age verification modal after Google auth
4. Verify can't proceed without entering valid birthdate

## Additional Fixes Needed

### Session-Based Users (Anonymous Play)
Currently, users can play without creating an account using session IDs. These users also need age verification.

**Solution Options:**
1. Add age verification to initial session creation
2. Store age_verified flag in session data
3. Check age_verified before allowing game access

### Edit Profile Functionality
Users need ability to:
- Update display name/nickname
- Change avatar
- View (but not edit) birthdate

**Implementation:**
- Create EditProfileModal component
- Use existing PATCH /api/users/{user_id}/profile endpoint
- Add UI button in settings or profile area

## Testing Checklist
- [ ] Google Sign-in shows age verification for new users
- [ ] Age verification blocks users under 13
- [ ] Regular registration still works
- [ ] Existing users with birthdate can sign in normally
- [ ] Profile update endpoint accepts birthdate
- [ ] Session-based users get age verification

## COPPA Compliance Status
- ✅ Regular registration has age check
- ❌ Google OAuth bypasses age check (FIXING NOW)
- ❌ Session-based play has no age check
- ✅ Date picker prevents selecting under-13 dates
- ✅ Terms acceptance required
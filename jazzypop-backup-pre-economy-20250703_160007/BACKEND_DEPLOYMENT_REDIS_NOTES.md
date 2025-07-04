# Backend Deployment and Redis Notes - JazzyPop

## Current Issues and Discoveries (Jan 2025)

### 1. Dashboard Cards Not Loading - Root Cause Analysis

**Problem**: Dashboard cards weren't rendering due to missing `category` and `difficulty` fields.

**Investigation revealed**:
- Frontend CardManager.js expects `data.category` and `data.difficulty` fields
- The `/api/cards/active` endpoint returns a fallback card when DB is empty
- This fallback card was missing required fields

**Solutions implemented**:

#### Frontend (Quick Fix):
```javascript
// Added null checks in CardManager.js:
const categoryIcon = data.category ? this.getCategoryIcon(data.category) : '⏳';

// Made badges conditional:
if (data.category) {
    badges.push({ text: this.formatCategory(data.category), type: 'category' });
}
if (data.difficulty) {
    badges.push({ text: this.capitalize(data.difficulty), type: 'difficulty' });
}
```

#### Backend (Better Fix):
The real issue is that content generators (quote_generator.py, pun_generator.py) should include category/difficulty in their responses when called by Haiku API.

### 2. Backend Service Architecture

**Current setup**:
- FastAPI app running via uvicorn (NOT systemd/gunicorn as expected)
- Process: `/home/ubuntu/jazzypop-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`
- Multiple Python processes running quiz generators
- Redis used for caching and file locking

### 3. Deployment Process - What Works

#### Safe Frontend Deployment:
```bash
# From local machine:
rsync -avz kawaii-quiz-app/src/components/CardManager.js \
  ubuntu@p0qp0q.com:~/temp-jazzypop/src/components/ \
  -e "ssh -i ~/.ssh/poqpoq2025.pem"

# Then on server:
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
sudo cp ~/temp-jazzypop/src/components/CardManager.js /var/www/html/jazzypop/src/components/
sudo chown www-data:www-data /var/www/html/jazzypop/src/components/CardManager.js
```

#### Backend Deployment (Tricky!):
```bash
# 1. Copy file to server
scp -i ~/.ssh/poqpoq2025.pem backend/main.py ubuntu@p0qp0q.com:/home/ubuntu/temp-main.py

# 2. SSH into server
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com

# 3. Backup and deploy
cd /home/ubuntu/jazzypop-backend
cp main.py main.py.backup.$(date +%Y%m%d_%H%M%S)
cp /home/ubuntu/temp-main.py main.py

# 4. Clear Redis cache (important!)
redis-cli FLUSHDB

# 5. Find and restart uvicorn (this is the tricky part)
ps aux | grep uvicorn  # Find the PID
kill <PID>  # Kill the process

# 6. Restart manually (or it might auto-restart)
nohup /home/ubuntu/jazzypop-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &
```

### 4. Redis Considerations

**File locking issues observed**:
- Redis is used for file locking in the backend
- Sometimes locks get stuck
- Always clear Redis cache after backend changes

**Key Redis commands**:
```bash
redis-cli ping          # Check if Redis is running
redis-cli FLUSHDB      # Clear all cache
redis-cli dbsize       # Check number of keys
redis-cli --scan --pattern "lock:*"  # Check for locks
```

### 5. Testing Endpoints

After deployment, always test:
```bash
# Check cards API (should now have category/difficulty)
curl -s https://p0qp0q.com/api/cards/active | python3 -m json.tool

# Check quote API
curl -s https://p0qp0q.com/api/content/quote/current | python3 -m json.tool

# Check flashcards
curl -X POST https://p0qp0q.com/api/flashcards \
  -H "Content-Type: application/json" \
  -d '{"category": "famous_quotes", "count": 5}'
```

### 6. Common Issues and Solutions

**Issue**: "Permission denied" when deploying
**Solution**: Use temp directory approach, then sudo cp

**Issue**: Backend changes not taking effect
**Solution**: 
1. Clear Redis cache
2. Kill and restart uvicorn process
3. Check logs: `tail -f /home/ubuntu/jazzypop-backend/uvicorn.log`

**Issue**: File locking errors
**Solution**: Stop the service, make changes, clear Redis, restart

### 7. TODO - Fix Content Generators

The root fix needed is to update the Haiku API prompts in:
- `quote_generator.py` - Add category field to generated quotes
- `pun_generator.py` - Add category field to generated puns  
- `trivia_generator.py` - Add category and difficulty fields

These generators create content for flashcards and should include proper metadata for the frontend to display.

### 8. Process Monitoring

Current processes to watch:
```bash
# Main API
ps aux | grep uvicorn

# Content generators
ps aux | grep quiz_generator
ps aux | grep quote_generator
ps aux | grep pun_generator
```

If any generator crashes, it may need manual restart.

## Summary

The JazzyPop backend has some quirks:
1. It's not using systemd as expected
2. Redis file locking can be problematic
3. Frontend expects specific fields that generators don't always provide
4. Deployment requires careful process management

Always backup, clear cache, and test after changes!
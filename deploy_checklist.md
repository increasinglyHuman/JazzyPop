# JazzyPop Deployment Checklist - Jan 9, 2025

## Changes to Deploy

### Backend Changes:
1. ✅ Database pool optimization (database.py - max_size: 5)
2. ✅ Duplicate monitor script (monitor_duplicates.py)
3. ✅ Database viewer HTML (database_viewer.html)

### Frontend Changes:
- No frontend component changes today (only backend admin tools)

## Deployment Steps:

### 1. Deploy Backend Files:
```bash
# Copy updated files to server
scp -i ~/.ssh/poqpoq2025.pem backend/monitor_duplicates.py ubuntu@p0qp0q.com:~/jazzypop-backend/
scp -i ~/.ssh/poqpoq2025.pem frontend/database_viewer.html ubuntu@p0qp0q.com:~/jazzypop-backend/

# The database.py fix was already applied directly on server
```

### 2. Deploy Frontend:
```bash
# Copy frontend to web directory
scp -r -i ~/.ssh/poqpoq2025.pem frontend/* ubuntu@p0qp0q.com:/var/www/html/jazzypop/
```

### 3. Restart Services:
```bash
# On server
sudo systemctl restart jazzypop-backend
sudo systemctl restart apache2
```

### 4. Verify:
- Check https://p0qp0q.com/jazzypop/
- Check API health: https://p0qp0q.com/api/health
- Monitor Discord for any alerts
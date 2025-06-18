# Kawaii Quiz App Deployment Notes

## IMPORTANT: Correct Deployment Directory

**ACTIVE DIRECTORY (THE REAL ONE!):**
```
/home/ubuntu/kawaii-quiz-deploy/kawaii-quiz-app/
```

This is the directory that Apache actually serves from when you access:
- https://p0qp0q.com/apps/kawaii-quiz/

## Deploy Command
```bash
scp -o StrictHostKeyChecking=no -i ~/.ssh/poqpoq2025.pem app.js styles.css index.html ubuntu@52.88.234.65:/home/ubuntu/kawaii-quiz-deploy/kawaii-quiz-app/
```

## Legacy/Unused Directories (DO NOT USE)
- `/var/www/html/apps/kawaii-quiz/` - NOT USED
- `/var/www/html/kawaii-quiz/` - NOT USED

## Backend Server
- Directory: `/home/ubuntu/kawaii-quiz-deploy/kawaii-quiz-backend/`
- Port: 3001
- Process: Running via PM2

## Note
Apache is configured to serve the app from the home directory location, not the typical /var/www/html path. This caused confusion when deploying v4.1!
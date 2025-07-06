# JazzyPop Service Restart Guide
*Quick guide for when services need to be restarted*

## Backend API Service

### Check if it's running:
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "ps aux | grep 'uvicorn main:app' | grep -v grep"
```

### If NOT running, start it manually:
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
cd ~/jazzypop-backend
nohup ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
exit
```

### If systemd service is conflicting:
```bash
# Stop the systemd service if it's trying to use the same port
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "sudo systemctl stop jazzypop-backend"
```

## Content Generators

### Check which generators are running:
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "ps aux | grep '_set_generator.py' | grep -v grep"
```

### Restart all generators:
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
cd ~/jazzypop-backend
# Kill existing generators
pkill -f '_set_generator.py'
# Start all generators
./start_all_set_generators.sh
exit
```

## Quick Health Check

### Test if API is responding:
```bash
# From local machine
curl -s https://p0qp0q.com/api/health

# Should return something like:
# {"status":"healthy","timestamp":"2025-07-06T02:50:15.782466"}
```

### Test if quiz economics are working:
```bash
# Check if quiz sets have economics data
curl -s 'https://p0qp0q.com/api/content/quiz/sets?count=1' | grep -o '"economics"'

# Should return: "economics"
```

## Common Issues

### "Address already in use" error
- This means something is already running on port 8000
- Check what's using it: `sudo lsof -i :8000`
- Usually it's because the backend was started manually AND systemd is trying to start it

### Generators not starting
- Make sure the start script uses venv Python
- Check logs in `~/jazzypop-backend/logs/`

### No economics on quiz cards
- Run the economics migration script if needed:
  ```bash
  cd ~/jazzypop-backend
  ./venv/bin/python add_economics_to_quiz_sets.py
  ```

## Pro Tips

1. **Always use venv Python**: `/home/ubuntu/jazzypop-backend/venv/bin/python`
2. **Check logs first**: Most issues are obvious from the logs
3. **One backend only**: Either use systemd OR manual start, not both
4. **Generators need venv too**: The start script must use venv Python

---
*Remember: If the backend is already running and working, don't mess with it! Sometimes the best fix is to get out of the way.*
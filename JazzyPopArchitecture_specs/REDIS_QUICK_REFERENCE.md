# Redis Backend Quick Reference

## 🚨 Emergency Commands

```bash
# Redis is stuck
redis-cli ping                    # Check if alive
redis-cli --scan --pattern "lock:*"  # Find locks
redis-cli FLUSHDB                 # Nuclear option - clear everything

# Process is stuck  
ps aux | grep python              # Find process
sudo kill -9 <PID>              # Force kill
sudo systemctl restart gunicorn   # Restart service
```

## 🔧 Safe Edit Workflow

### Option 1: Automated Script
```bash
cd /home/ubuntu/jazzypop-backend
./edit-backend.sh quiz_generator.py
```

### Option 2: Manual Process
```bash
# 1. Stop service
sudo systemctl stop gunicorn

# 2. Make backup
cp quiz_generator.py quiz_generator.py.backup

# 3. Edit file
nano quiz_generator.py

# 4. Clear cache
redis-cli FLUSHDB

# 5. Start service
sudo systemctl start gunicorn
```

## 📍 Key Locations

- Backend: `/home/ubuntu/jazzypop-backend/`
- Backups: `/home/ubuntu/backups/`
- Logs: `/var/log/gunicorn/error.log`
- Redis data: `/var/lib/redis/`

## 🔍 Debug Commands

```bash
# Check what's running
systemctl status gunicorn
systemctl status redis

# Watch logs
tail -f /var/log/gunicorn/error.log

# Check Redis memory
redis-cli info memory

# See what's cached
redis-cli dbsize
redis-cli keys '*'  # Warning: slow on big DB
```

## ⚡ Common Issues

### "Redis ninja" blocking changes
```bash
redis-cli FLUSHDB
sudo systemctl restart gunicorn
```

### Changes not appearing
1. Clear browser cache
2. Clear Redis: `redis-cli FLUSHDB`
3. Restart service: `sudo systemctl restart gunicorn`

### Can't acquire lock
```bash
redis-cli del "lock:file:quiz_generator.py"
```

## 🛡️ Safety Rules

1. **ALWAYS backup first**
2. **NEVER edit without stopping gunicorn**
3. **ALWAYS clear Redis after changes**
4. **TEST before deploying to production**

## 📝 Log Your Changes

```bash
echo "$(date): Changed X in quiz_generator.py" >> /var/log/backend_changes.log
```

---
*Keep this handy when working on backend!*
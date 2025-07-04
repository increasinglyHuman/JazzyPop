# Redis Backend Access Guide for JazzyPop

## Overview
The JazzyPop backend uses Redis for caching and file locking within a virtual environment (venv). This guide establishes best practices for safely modifying backend files without conflicts.

## Core Principles

1. **Always Check Lock Status First**
2. **Use Timeout-Based Locks** 
3. **Backup Before and After Changes**
4. **Clear Communication of Intent**
5. **Graceful Failure Handling**

## Pre-Access Checklist

### 1. Check Redis Status
```bash
redis-cli ping
redis-cli --scan --pattern "lock:*"  # Check for existing locks
```

### 2. Check Active Processes
```bash
ps aux | grep python
ps aux | grep gunicorn
systemctl status redis
```

### 3. Create Working Backup
```bash
# Create timestamped backup directory
BACKUP_DIR="/home/ubuntu/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup target files
cp /home/ubuntu/jazzypop-backend/quiz_generator.py "$BACKUP_DIR/"
cp /home/ubuntu/jazzypop-backend/app.py "$BACKUP_DIR/"
```

## File Access Protocol

### Step 1: Acquire Lock with Timeout
```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0)

def acquire_file_lock(filename, timeout=300):  # 5 minute timeout
    lock_key = f"lock:file:{filename}"
    identifier = f"{time.time()}:{os.getpid()}"
    
    # Try to acquire lock with automatic expiry
    if r.set(lock_key, identifier, nx=True, ex=timeout):
        return identifier
    return None
```

### Step 2: Verify Lock Ownership
```python
def verify_lock(filename, identifier):
    lock_key = f"lock:file:{filename}"
    return r.get(lock_key) == identifier.encode()
```

### Step 3: Make Changes
```bash
# Always work on a copy first
cp quiz_generator.py quiz_generator.py.work
# Make your changes to .work file
# Test changes locally if possible
```

### Step 4: Deploy Changes
```python
def deploy_changes(filename, identifier):
    if not verify_lock(filename, identifier):
        raise Exception("Lock lost - abort changes!")
    
    # Backup current version
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    shutil.copy(filename, f"{filename}.backup_{timestamp}")
    
    # Deploy new version
    shutil.move(f"{filename}.work", filename)
    
    # Clear Redis cache related to this file
    clear_related_cache(filename)
```

### Step 5: Release Lock
```python
def release_lock(filename, identifier):
    lock_key = f"lock:file:{filename}"
    
    # Only release if we still own it
    pipe = r.pipeline(True)
    while True:
        try:
            pipe.watch(lock_key)
            if pipe.get(lock_key) == identifier.encode():
                pipe.multi()
                pipe.delete(lock_key)
                pipe.execute()
                return True
            pipe.unwatch()
            return False
        except redis.WatchError:
            continue
```

## Cache Management

### Clear Specific Cache Entries
```python
def clear_related_cache(filename):
    if filename == "quiz_generator.py":
        # Clear quiz-related cache
        for key in r.scan_iter("quiz:*"):
            r.delete(key)
    elif filename == "app.py":
        # Clear API cache
        for key in r.scan_iter("api:*"):
            r.delete(key)
```

### Monitor Cache Status
```bash
redis-cli info memory
redis-cli dbsize
redis-cli --bigkeys  # Find large cache entries
```

## Emergency Procedures

### If Lock is Stuck
```bash
# Check lock age
redis-cli ttl "lock:file:quiz_generator.py"

# If truly stuck (no TTL), force remove
redis-cli del "lock:file:quiz_generator.py"

# Log the intervention
echo "$(date): Force removed stuck lock on quiz_generator.py" >> /var/log/redis_interventions.log
```

### If Redis is Down
```bash
# Check Redis status
sudo systemctl status redis

# Restart if needed
sudo systemctl restart redis

# If Redis won't start, check logs
sudo journalctl -u redis -n 50
```

## Complete Workflow Example

```bash
#!/bin/bash
# safe_backend_edit.sh

FILE_TO_EDIT="quiz_generator.py"
BACKUP_ROOT="/home/ubuntu/backups"
WORK_DIR="/tmp/jazzypop_work"

# 1. Create work directory
mkdir -p "$WORK_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 2. Stop services
echo "Stopping services..."
sudo systemctl stop gunicorn

# 3. Wait for processes to finish
sleep 5

# 4. Create backups
echo "Creating backups..."
mkdir -p "$BACKUP_ROOT/$TIMESTAMP"
cp "/home/ubuntu/jazzypop-backend/$FILE_TO_EDIT" "$BACKUP_ROOT/$TIMESTAMP/"

# 5. Make changes
cp "/home/ubuntu/jazzypop-backend/$FILE_TO_EDIT" "$WORK_DIR/$FILE_TO_EDIT"
echo "Edit $WORK_DIR/$FILE_TO_EDIT now. Press Enter when done..."
read

# 6. Deploy changes
cp "$WORK_DIR/$FILE_TO_EDIT" "/home/ubuntu/jazzypop-backend/$FILE_TO_EDIT"

# 7. Clear Redis cache
redis-cli flushdb

# 8. Restart services
sudo systemctl start gunicorn

echo "Changes deployed. Backup saved to $BACKUP_ROOT/$TIMESTAMP/"
```

## Best Practices

1. **Never Edit Files Directly in Production**
   - Always work on copies
   - Test changes before deployment

2. **Document All Changes**
   ```bash
   echo "$(date): Modified quiz_generator.py - added practice mode" >> /var/log/backend_changes.log
   ```

3. **Coordinate with Team**
   - Check if anyone else is working on backend
   - Use a shared calendar or chat for maintenance windows

4. **Monitor After Changes**
   ```bash
   # Watch logs after deployment
   tail -f /var/log/gunicorn/error.log
   tail -f /var/log/redis/redis-server.log
   ```

5. **Have Rollback Plan**
   - Keep last 3 known-good versions
   - Document rollback procedure
   - Test rollback regularly

## Quick Reference Card

```bash
# Before editing:
redis-cli ping                          # Check Redis
ps aux | grep python                    # Check processes
sudo systemctl stop gunicorn            # Stop service

# After editing:
redis-cli flushdb                       # Clear cache
sudo systemctl start gunicorn           # Start service
tail -f /var/log/gunicorn/error.log    # Monitor
```

## Contact for Issues

- Redis lock issues: Check `/var/log/redis_interventions.log`
- Backup location: `/home/ubuntu/backups/`
- Emergency restore: Use `restore_backend.sh` script
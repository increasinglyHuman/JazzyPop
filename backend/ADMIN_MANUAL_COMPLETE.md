# JazzyPop Admin Manual
*For when things go sideways and you need to fix them*

## Quick Reference Commands

### Check What's Running
```bash
# SSH into server
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com

# Check all JazzyPop services
sudo systemctl status jazzypop-backend
sudo systemctl status jazzypop-generators
sudo systemctl status jazzypop-monitor

# Check if backend is actually running
ps aux | grep python | grep main.py

# Check what's on port 8000
sudo lsof -i :8000
```

### Complete Startup Sequence

#### Full System Startup (After Server Reboot)
```bash
# 1. Ensure all services are enabled for auto-start
sudo systemctl enable jazzypop-backend
sudo systemctl enable jazzypop-generators
sudo systemctl enable jazzypop-monitor
sudo systemctl enable jazzypop-quiz-generator
sudo systemctl enable jazzypop-validation  # IMPORTANT: Validation worker

# 2. Start all services in order
sudo systemctl start jazzypop-backend      # Main API (includes uvicorn server)
sleep 5                                    # Give it time to initialize
sudo systemctl start jazzypop-validation   # Validation worker
sudo systemctl start jazzypop-quiz-generator # Content generation
sudo systemctl start jazzypop-generators   # Other generators
sudo systemctl start jazzypop-monitor      # Monitoring last

# 3. Verify all services are running
sudo systemctl status jazzypop-backend
sudo systemctl status jazzypop-validation
sudo systemctl status jazzypop-quiz-generator

# 4. Check for any failed services
systemctl list-units --failed | grep jazzypop

# 5. Monitor initial logs
sudo journalctl -u jazzypop-backend -f &
sudo journalctl -u jazzypop-validation -f &
# Press Ctrl+C to stop following logs
```

### Starting/Stopping Services

#### Clean Shutdown Procedure (IMPORTANT!)
The system has aggressive auto-restart mechanisms. For a clean shutdown:

```bash
# 1. First, find and stop any crash recovery processes
ps aux | grep crash_recovery | grep -v grep
# If found, kill it: sudo kill [PID]

# 2. Check for duplicate monitors
ps aux | grep duplicate_monitor | grep -v grep
# If found, kill it: sudo kill [PID]

# 3. Disable auto-restart temporarily
sudo systemctl disable jazzypop-backend
sudo systemctl disable jazzypop-generators
sudo systemctl disable jazzypop-monitor
sudo systemctl disable jazzypop-quiz-generator
sudo systemctl disable jazzypop-validation

# 4. Stop all services
sudo systemctl stop jazzypop-backend
sudo systemctl stop jazzypop-generators
sudo systemctl stop jazzypop-monitor
sudo systemctl stop jazzypop-quiz-generator
sudo systemctl stop jazzypop-validation

# 5. Kill any remaining processes
sudo pkill -f "python.*main.py"
sudo pkill -f "python.*generator.py"
sudo pkill -f "python.*monitor"

# 6. Verify clean shutdown
ps aux | grep python | grep -E "main|generator|monitor" | grep -v grep
# Should return nothing

# To re-enable auto-start later:
sudo systemctl enable jazzypop-backend
sudo systemctl enable jazzypop-generators
sudo systemctl enable jazzypop-monitor
sudo systemctl enable jazzypop-quiz-generator
sudo systemctl enable jazzypop-validation

# To list all JazzyPop services:
ls -la /etc/systemd/system/jazzypop-*.service
systemctl list-units --all | grep -i jazz
```

#### Service Descriptions
- **jazzypop-backend**: Main FastAPI backend service (includes uvicorn server via main.py)
- **jazzypop-generators**: Content generation services
- **jazzypop-monitor**: System monitoring and health checks
- **jazzypop-quiz-generator**: Quiz content generator (v3 with kid-safe filtering)
- **jazzypop-validation**: Triple validation worker (processes pending quiz sets)

Note: The jazzypop-api service has been archived as it's redundant. The main.py script 
automatically starts uvicorn when run, so a separate uvicorn service is not needed.

#### Backend API Service
```bash
# Start
sudo systemctl start jazzypop-backend

# Stop
sudo systemctl stop jazzypop-backend

# Restart (most common)
sudo systemctl restart jazzypop-backend

# Check logs
sudo journalctl -u jazzypop-backend -f
```

#### Content Generators
```bash
# Start all generators
sudo systemctl start jazzypop-generators

# Or start individually in virtual environment
cd ~/jazzypop-backend
./venv/bin/python quiz_set_generator.py &
./venv/bin/python trivia_set_generator.py &
./venv/bin/python quote_set_generator.py &
./venv/bin/python pun_set_generator.py &
./venv/bin/python joke_set_generator.py &
```

### Database Operations

#### Connect to Database
```bash
cd ~/jazzypop-backend
./venv/bin/python

>>> import asyncio
>>> from database import db
>>> 
>>> async def check_db():
>>>     await db.connect()
>>>     async with db.pool.acquire() as conn:
>>>         count = await conn.fetchval("SELECT COUNT(*) FROM content WHERE type = 'quiz_set'")
>>>         print(f"Total quiz sets: {count}")
>>>     await db.disconnect()
>>> 
>>> asyncio.run(check_db())
```

#### Check Discord Monitoring
```bash
# Monitor should auto-send to Discord
# If not working, check .env file:
cat ~/jazzypop-backend/.env | grep DISCORD

# Test manually
cd ~/jazzypop-backend
./venv/bin/python system_monitor.py
```

### Common Issues & Fixes

#### "Address already in use" on port 8000
```bash
# Find what's using it
sudo lsof -i :8000

# Kill the process (replace PID with actual number)
sudo kill -9 PID

# Then restart service
sudo systemctl restart jazzypop-backend
```

#### Backend returns 404 or old data
```bash
# Make sure you're in the right directory
cd ~/jazzypop-backend

# Pull latest code (if using git)
git pull

# Or manually update files
# Then restart
sudo systemctl restart jazzypop-backend
```

#### Generators not creating new content
```bash
# Check if they're running
ps aux | grep generator

# Check generator logs
cd ~/jazzypop-backend
tail -f *.log

# Restart generators
sudo systemctl restart jazzypop-generators
```

#### Database connection errors
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check .env has correct DATABASE_URL
cat ~/jazzypop-backend/.env | grep DATABASE_URL
```

### Triple Validation System (NEW)

#### Overview
The validation system ensures quiz quality through three AI-powered passes:
1. **Pass 1**: Generates feedback captions and initial assessment
2. **Pass 2**: Fact-checking and answer verification
3. **Pass 3**: Final quality control and scoring

#### Running Validation

##### Start Validation Worker
```bash
# Run in foreground (for testing)
cd ~/jazzypop-backend
./venv/bin/python validation_worker.py

# Run in background
nohup ./venv/bin/python validation_worker.py > logs/validation_worker.log 2>&1 &

# Check if running
ps aux | grep validation_worker
```

##### Validate Existing Content
```bash
# Dry run - see what would be validated
./venv/bin/python validate_existing_content.py --dry-run

# Validate all existing content
./venv/bin/python validate_existing_content.py --batch-size 20 --delay 3

# Force revalidate everything
./venv/bin/python validate_existing_content.py --force-revalidate
```

##### Check Validation Status
```bash
# Get validation statistics
curl http://localhost:8000/api/validation/stats

# Check validation logs
tail -f logs/validation_worker.log

# Database query for validation status
cd ~/jazzypop-backend
./venv/bin/python
>>> import asyncio
>>> from database import db
>>> 
>>> async def check_validation():
>>>     await db.connect()
>>>     async with db.pool.acquire() as conn:
>>>         stats = await conn.fetchrow("""
>>>             SELECT 
>>>                 COUNT(*) FILTER (WHERE validation_status = 'pending') as pending,
>>>                 COUNT(*) FILTER (WHERE validation_status = 'approved') as approved,
>>>                 COUNT(*) FILTER (WHERE validation_status = 'needs_revision') as needs_revision,
>>>                 COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected
>>>             FROM content WHERE type = 'quiz_set'
>>>         """)
>>>         print(f"Pending: {stats['pending']}, Approved: {stats['approved']}")
>>>         print(f"Needs Revision: {stats['needs_revision']}, Rejected: {stats['rejected']}")
>>>     await db.disconnect()
>>> 
>>> asyncio.run(check_validation())
```

#### Creating Systemd Service for Validation Worker
```bash
# Create service file
sudo nano /etc/systemd/system/jazzypop-validation.service

# Add this content:
[Unit]
Description=JazzyPop Validation Worker
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/jazzypop-backend
ExecStart=/home/ubuntu/jazzypop-backend/venv/bin/python /home/ubuntu/jazzypop-backend/validation_worker.py
Restart=always
RestartSec=30
Environment="PATH=/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable jazzypop-validation
sudo systemctl start jazzypop-validation
sudo systemctl status jazzypop-validation
```

#### Player Feedback System

##### Monitor Feedback
```bash
# Check feedback for a specific quiz
curl http://localhost:8000/api/feedback/content/{content_id}

# Get user feedback stats
curl http://localhost:8000/api/feedback/user/{user_id}/stats

# Database query for flagged content
./venv/bin/python
>>> import asyncio
>>> from database import db
>>> 
>>> async def check_flags():
>>>     await db.connect()
>>>     async with db.pool.acquire() as conn:
>>>         flagged = await conn.fetch("""
>>>             SELECT c.id, fa.flag_count 
>>>             FROM feedback_aggregates fa
>>>             JOIN content c ON c.id = fa.content_id
>>>             WHERE fa.flag_count > 5
>>>             ORDER BY fa.flag_count DESC
>>>         """)
>>>         for row in flagged:
>>>             print(f"Content {row['id']} has {row['flag_count']} flags")
>>>     await db.disconnect()
>>> 
>>> asyncio.run(check_flags())
```

#### Troubleshooting Validation

##### Validation Worker Not Processing
```bash
# Check worker logs
tail -100 logs/validation_worker.log

# Check for pending items
cd ~/jazzypop-backend
./venv/bin/python -c "
import asyncio
from database import db

async def check():
    await db.connect()
    async with db.pool.acquire() as conn:
        count = await conn.fetchval(\"\"\"
            SELECT COUNT(*) FROM content 
            WHERE type = 'quiz_set' AND validation_status = 'pending'
        \"\"\")
        print(f'Pending validations: {count}')
    await db.disconnect()

asyncio.run(check())
"
```

##### Reset Validation Status
```bash
# Reset a specific quiz to pending
./venv/bin/python
>>> import asyncio
>>> from database import db
>>> from uuid import UUID
>>> 
>>> async def reset_validation(content_id):
>>>     await db.connect()
>>>     async with db.pool.acquire() as conn:
>>>         await conn.execute("""
>>>             UPDATE content 
>>>             SET validation_status = 'pending',
>>>                 validation_passes = '{}'::jsonb
>>>             WHERE id = $1
>>>         """, UUID(content_id))
>>>     await db.disconnect()
>>> 
>>> asyncio.run(reset_validation('your-content-id-here'))
```

### Deployment Checklist

1. **Backup first!**
   ```bash
   cd ~/jazzypop-backend
   tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz *.py
   ```

2. **Deploy files**
   ```bash
   # From local machine
   scp -i ~/.ssh/poqpoq2025.pem main.py ubuntu@p0qp0q.com:~/jazzypop-backend/
   scp -i ~/.ssh/poqpoq2025.pem database.py ubuntu@p0qp0q.com:~/jazzypop-backend/
   scp -i ~/.ssh/poqpoq2025.pem *_generator.py ubuntu@p0qp0q.com:~/jazzypop-backend/
   ```

3. **Run any migration scripts**
   ```bash
   cd ~/jazzypop-backend
   ./venv/bin/python add_economics_to_quiz_sets.py
   
   # NEW: Run validation schema migration
   ./venv/bin/python add_validation_schema.py
   ```

4. **Restart services**
   ```bash
   sudo systemctl restart jazzypop-backend
   sudo systemctl restart jazzypop-generators
   ```

5. **Start validation worker (NEW)**
   ```bash
   # Start validation worker in background
   cd ~/jazzypop-backend
   nohup ./venv/bin/python validation_worker.py > logs/validation_worker.log 2>&1 &
   
   # Or create a systemd service (recommended)
   sudo systemctl start jazzypop-validation
   ```

6. **Verify everything is working**
   ```bash
   # Test API
   curl http://localhost:8000/api/health
   
   # Test validation stats
   curl http://localhost:8000/api/validation/stats
   
   # Check logs
   sudo journalctl -u jazzypop-backend -n 50
   ```

### Important File Locations

- Backend code: `~/jazzypop-backend/`
- Frontend files: `/var/www/html/jazzypop/`
- Environment variables: `~/jazzypop-backend/.env`
- Systemd service files: `/etc/systemd/system/jazzypop-*.service`

### Emergency Contacts

- When in doubt, check the logs first
- Discord monitoring will alert on issues
- Always backup before making changes
- Never edit files directly on server unless absolutely necessary

---
*Remember: It's not broken, it's just having a moment. Take a breath, check the logs, and restart the service.*
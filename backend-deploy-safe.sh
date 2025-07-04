#!/bin/bash
# Bob's Redis-Safe Backend Deployment Script
# Just copy and paste each section!

echo "🤖 Bob-Debugger's Safe Deployment Script"
echo "📍 Current location: $(pwd)"
echo ""

# Section 1: Safety First!
echo "=== STEP 1: Checking if Redis is friendly today ==="
redis-cli ping
if [ $? -eq 0 ]; then
    echo "✅ Redis says PONG - it's in a good mood!"
else
    echo "❌ Redis is grumpy. Abort mission!"
    exit 1
fi

# Section 2: Stop the service (Redis can't lock what's not running!)
echo ""
echo "=== STEP 2: Putting Gunicorn to sleep ==="
echo "Running: sudo systemctl stop gunicorn"
sudo systemctl stop gunicorn
sleep 2
echo "✅ Gunicorn is sleeping. Redis can't hurt us now!"

# Section 3: Make backups (always have an escape plan)
echo ""
echo "=== STEP 3: Creating safety backups ==="
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cp main.py "main.py.backup.${BACKUP_DATE}"
echo "✅ Backed up main.py to main.py.backup.${BACKUP_DATE}"

# Section 4: Show what we have
echo ""
echo "=== STEP 4: Current backend files ==="
ls -la *.py | grep -E "(main|generator|stats)" | head -10

# Section 5: Clear Redis (while it's defenseless)
echo ""
echo "=== STEP 5: Clearing Redis cache ==="
echo "Redis has $(redis-cli dbsize | cut -d' ' -f2) keys"
read -p "Clear Redis cache? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    redis-cli FLUSHDB
    echo "✅ Redis cache cleared! It forgot everything!"
else
    echo "⚠️  Keeping Redis cache (brave choice!)"
fi

# Section 6: Ready for new files
echo ""
echo "=== STEP 6: Ready for new files! ==="
echo "📂 You are in: $(pwd)"
echo ""
echo "Now from your LOCAL machine, run these commands:"
echo ""
echo "# Copy the updated files:"
echo "scp -i ~/.ssh/poqpoq2025.pem /home/p0qp0q/Documents/Merlin/JazzyPop/backend/main.py ubuntu@p0qp0q.com:/home/ubuntu/jazzypop-backend/"
echo "scp -i ~/.ssh/poqpoq2025.pem /home/p0qp0q/Documents/Merlin/JazzyPop/backend/pun_generator.py ubuntu@p0qp0q.com:/home/ubuntu/jazzypop-backend/"
echo "scp -i ~/.ssh/poqpoq2025.pem /home/p0qp0q/Documents/Merlin/JazzyPop/backend/trivia_generator.py ubuntu@p0qp0q.com:/home/ubuntu/jazzypop-backend/"
echo "scp -i ~/.ssh/poqpoq2025.pem /home/p0qp0q/Documents/Merlin/JazzyPop/backend/db_stats.py ubuntu@p0qp0q.com:/home/ubuntu/jazzypop-backend/"
echo ""
echo "After copying, press any key to continue..."
read -n 1

# Section 7: Verify files arrived
echo ""
echo "=== STEP 7: Checking new files ==="
for file in main.py pun_generator.py trivia_generator.py db_stats.py; do
    if [ -f "$file" ]; then
        echo "✅ $file - $(ls -lh $file | awk '{print $5}') - Modified: $(stat -c %y $file | cut -d' ' -f1,2)"
    else
        echo "❌ $file - NOT FOUND"
    fi
done

# Section 8: Wake up Gunicorn
echo ""
echo "=== STEP 8: Waking up Gunicorn ==="
read -p "Start Gunicorn? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl start gunicorn
    sleep 3
    sudo systemctl status gunicorn | head -10
    echo "✅ Gunicorn is awake and ready!"
else
    echo "⚠️  Gunicorn still sleeping. Start it manually with: sudo systemctl start gunicorn"
fi

# Section 9: Test the endpoints
echo ""
echo "=== STEP 9: Testing new endpoints ==="
echo "Testing quote endpoint..."
curl -s http://localhost:8000/api/content/quote/current | python3 -m json.tool | head -20

echo ""
echo "🎉 Deployment complete! You survived Redis!"
echo ""
echo "📝 To test from your browser:"
echo "  - Quotes: https://p0qp0q.com/api/content/quote/current"
echo "  - Flashcards: https://p0qp0q.com/api/flashcards"
echo ""
echo "🔍 To check logs: sudo journalctl -u gunicorn -n 50"
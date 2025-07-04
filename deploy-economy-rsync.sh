#!/bin/bash

# Economy Integration Deployment - LIVE (using rsync)
# This script deploys the economy integration changes to production

echo "=== Economy Integration Deployment with rsync ==="
echo "SSH Key: ~/.ssh/poqpoq2025.pem"
echo "Server: ubuntu@p0qp0q.com"
echo ""

# Confirmation prompt
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "=== Deploying Frontend Files ==="
echo ""

# Create a temporary file list for rsync
cat > /tmp/economy-frontend-files.txt << EOF
index.html
src/components/EconomyManager.js
src/components/QuizModal.js
src/components/FlashcardModal.js
src/components/CardManager.js
src/components/RewardsPopup.js
src/styles/components/rewards-popup.css
src/scripts/dashboard.js
EOF

# Use rsync with file list
cd kawaii-quiz-app
rsync -avz --files-from=/tmp/economy-frontend-files.txt \
    -e "ssh -i ~/.ssh/poqpoq2025.pem" \
    . ubuntu@p0qp0q.com:/var/www/html/jazzypop/

cd ..

echo ""
echo "Setting frontend permissions..."
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com << 'EOF'
    cd /var/www/html/jazzypop
    
    # Change ownership to www-data
    sudo chown -R www-data:www-data .
    
    # Set directory permissions (755)
    sudo find . -type d -exec chmod 755 {} \;
    
    # Set file permissions (644)
    sudo find . -type f -exec chmod 644 {} \;
    
    echo "Frontend permissions updated"
EOF

echo ""
echo "=== Deploying Backend Files ==="
echo ""

# Deploy backend files with rsync
rsync -avz -e "ssh -i ~/.ssh/poqpoq2025.pem" \
    backend/main.py \
    backend/database.py \
    ubuntu@p0qp0q.com:/home/ubuntu/jazzypop-backend/

echo ""
echo "=== Restarting Backend Service ==="
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com << 'EOF'
    # Check if systemd service exists
    if systemctl is-active --quiet jazzypop-backend; then
        echo "Restarting jazzypop-backend service..."
        sudo systemctl restart jazzypop-backend
        sleep 2
        
        # Check status
        if systemctl is-active --quiet jazzypop-backend; then
            echo "✓ Backend service restarted successfully"
        else
            echo "✗ Backend service failed to start!"
            sudo systemctl status jazzypop-backend --no-pager | head -10
        fi
    else
        echo "Note: jazzypop-backend service not found. You may need to restart it manually."
    fi
EOF

# Clean up
rm -f /tmp/economy-frontend-files.txt

echo ""
echo "=== Deployment Complete ==="
echo "Frontend URL: https://p0qp0q.com/jazzypop/"
echo ""
echo "Please test the following:"
echo "1. Dashboard shows correct economy values"
echo "2. Quiz deducts 10 energy"
echo "3. Flashcards deduct 1 energy"
echo "4. Rewards popup appears after completing activities"
echo "5. Cards show disabled state when insufficient energy"
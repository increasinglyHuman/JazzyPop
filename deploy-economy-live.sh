#!/bin/bash

# Economy Integration Deployment - LIVE
# This script deploys the economy integration changes to production

echo "=== Economy Integration Deployment - LIVE ==="
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

# Frontend files - need to preserve directory structure
FRONTEND_FILES=(
    "frontend/index.html"
    "frontend/src/components/EconomyManager.js"
    "frontend/src/components/QuizModal.js"
    "frontend/src/components/FlashcardModal.js"
    "frontend/src/components/CardManager.js"
    "frontend/src/components/RewardsPopup.js"
    "frontend/src/styles/components/rewards-popup.css"
    "frontend/src/scripts/dashboard.js"
)

# Deploy frontend files
echo "Copying frontend files..."
for file in "${FRONTEND_FILES[@]}"; do
    # Get the relative path after frontend/
    relative_path=${file#frontend/}
    echo "  Deploying: $file -> $relative_path"
    
    # Ensure directory exists on remote
    dir=$(dirname "$relative_path")
    ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "mkdir -p ~/var/www/html/jazzypop/$dir"
    
    # Copy file
    scp -i ~/.ssh/poqpoq2025.pem "$file" "ubuntu@p0qp0q.com:~/var/www/html/jazzypop/$relative_path"
done

echo ""
echo "Setting frontend permissions..."
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com << 'EOF'
    cd ~/var/www/html/jazzypop
    
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

# Backend files
BACKEND_FILES=(
    "backend/main.py"
    "backend/database.py"
)

# Deploy backend files
echo "Copying backend files..."
for file in "${BACKEND_FILES[@]}"; do
    filename=$(basename "$file")
    echo "  Deploying: $file"
    scp -i ~/.ssh/poqpoq2025.pem "$file" "ubuntu@p0qp0q.com:~/jazzypop-backend/$filename"
done

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
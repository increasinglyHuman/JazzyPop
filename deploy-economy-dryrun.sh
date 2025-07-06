#!/bin/bash

# Economy Integration Deployment - DRY RUN
# This script shows what would be deployed without actually copying

echo "=== Economy Integration Deployment - DRY RUN ==="
echo "SSH Key: ~/.ssh/poqpoq2025.pem"
echo "Server: ubuntu@p0qp0q.com"
echo ""

# Frontend files
echo "=== Frontend Files (would deploy to ~/var/www/html/jazzypop/) ==="
echo ""

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

for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file ($(stat -c%s "$file") bytes)"
    else
        echo "✗ $file (FILE NOT FOUND)"
    fi
done

echo ""
echo "=== Backend Files (would deploy to ~/jazzypop-backend/) ==="
echo ""

BACKEND_FILES=(
    "backend/main.py"
    "backend/database.py"
)

for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file ($(stat -c%s "$file") bytes)"
    else
        echo "✗ $file (FILE NOT FOUND)"
    fi
done

echo ""
echo "=== Deployment Commands (DRY RUN - not executed) ==="
echo ""
echo "Frontend rsync command:"
echo "rsync -avz --dry-run -e 'ssh -i ~/.ssh/poqpoq2025.pem' \\"
for file in "${FRONTEND_FILES[@]}"; do
    echo "  $file \\"
done
echo "  ubuntu@p0qp0q.com:~/var/www/html/jazzypop/"

echo ""
echo "Backend rsync command:"
echo "rsync -avz --dry-run -e 'ssh -i ~/.ssh/poqpoq2025.pem' \\"
for file in "${BACKEND_FILES[@]}"; do
    echo "  $file \\"
done
echo "  ubuntu@p0qp0q.com:~/jazzypop-backend/"

echo ""
echo "=== This was a DRY RUN - no files were copied ==="
echo "To actually deploy, run: ./deploy-economy-live.sh"
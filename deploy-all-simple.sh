#!/bin/bash
# Simple deployment script that uses rsync to deploy everything at once
# This bypasses git completely!

REMOTE_USER="ubuntu"
REMOTE_HOST="p0qp0q.com"
SSH_KEY="$HOME/.ssh/poqpoq2025.pem"

echo "🚀 JazzyPop Direct Deployment (No Git Required!)"
echo "==============================================="

# Deploy Frontend
echo -e "\n📦 Deploying Frontend with rsync..."
rsync -avz --delete \
    -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    kawaii-quiz-app/ \
    $REMOTE_USER@$REMOTE_HOST:~/jazzypop-frontend-temp/

# Move frontend files to web directory with proper permissions
echo -e "\n🔧 Setting up frontend permissions..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
    sudo rsync -av ~/jazzypop-frontend-temp/ /var/www/html/jazzypop/
    sudo chown -R www-data:www-data /var/www/html/jazzypop/
    rm -rf ~/jazzypop-frontend-temp
EOF

# Deploy Backend (only Python files, not venv or __pycache__)
echo -e "\n📦 Deploying Backend files..."
rsync -avz \
    -e "ssh -i $SSH_KEY" \
    --include='*.py' \
    --include='*.md' \
    --include='*.sql' \
    --include='*.service' \
    --include='.env*' \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='*.log' \
    backend/ \
    $REMOTE_USER@$REMOTE_HOST:~/jazzypop-backend/

# Restart backend services
echo -e "\n🔄 Restarting services..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" << 'EOF'
    sudo systemctl restart jazzypop-backend
    sudo systemctl restart jazzypop-monitor
    echo "✅ Services restarted"
    
    # Show service status
    echo -e "\n📊 Service Status:"
    sudo systemctl status jazzypop-backend --no-pager | head -5
    sudo systemctl status jazzypop-monitor --no-pager | head -5
EOF

echo -e "\n✨ Deployment complete!"
echo "🌐 Your changes are now live at https://p0qp0q.com"
echo "🎉 No git required - take that, doghouse!"
#!/bin/bash
# Frontend deployment script for JazzyPop
# Deploys all frontend files to production server

REMOTE_USER="ubuntu"
REMOTE_HOST="p0qp0q.com"
SSH_KEY="$HOME/.ssh/poqpoq2025.pem"
REMOTE_WEB_DIR="/var/www/html/jazzypop"

echo "🚀 Starting JazzyPop Frontend Deployment..."
echo "========================================"

# Function to deploy a file
deploy_file() {
    local LOCAL_FILE=$1
    local REMOTE_PATH=$2
    
    echo "📦 Deploying: $LOCAL_FILE"
    
    # First, copy to home directory
    scp -i "$SSH_KEY" "$LOCAL_FILE" "$REMOTE_USER@$REMOTE_HOST:~/temp_deploy_file"
    
    # Then move to correct location with sudo
    ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "sudo cp ~/temp_deploy_file '$REMOTE_PATH' && sudo chown www-data:www-data '$REMOTE_PATH' && rm ~/temp_deploy_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: $LOCAL_FILE"
    else
        echo "❌ Failed: $LOCAL_FILE"
        exit 1
    fi
}

# Deploy Components
echo -e "\n📂 Deploying Components..."
deploy_file "frontend/src/components/AlertModal.js" "$REMOTE_WEB_DIR/src/components/AlertModal.js"
deploy_file "frontend/src/components/EconomyManager.js" "$REMOTE_WEB_DIR/src/components/EconomyManager.js"
deploy_file "frontend/src/components/FlashcardModal.js" "$REMOTE_WEB_DIR/src/components/FlashcardModal.js"
deploy_file "frontend/src/components/GenericCard.js" "$REMOTE_WEB_DIR/src/components/GenericCard.js"
deploy_file "frontend/src/components/HerdingGame.js" "$REMOTE_WEB_DIR/src/components/HerdingGame.js"
deploy_file "frontend/src/components/ScoringEngine.js" "$REMOTE_WEB_DIR/src/components/ScoringEngine.js"
deploy_file "frontend/src/components/SettingsPanel.js" "$REMOTE_WEB_DIR/src/components/SettingsPanel.js"

# Deploy Config (create directory if needed)
echo -e "\n📂 Deploying Config..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p '$REMOTE_WEB_DIR/src/config' && sudo chown www-data:www-data '$REMOTE_WEB_DIR/src/config'"
deploy_file "frontend/src/config/CardConfig.js" "$REMOTE_WEB_DIR/src/config/CardConfig.js"

# Deploy Scripts
echo -e "\n📂 Deploying Scripts..."
deploy_file "frontend/src/scripts/dashboard.js" "$REMOTE_WEB_DIR/src/scripts/dashboard.js"

# Deploy Styles
echo -e "\n📂 Deploying Styles..."
deploy_file "frontend/src/styles/components/card.css" "$REMOTE_WEB_DIR/src/styles/components/card.css"
deploy_file "frontend/src/styles/components/flashcard-modal.css" "$REMOTE_WEB_DIR/src/styles/components/flashcard-modal.css"
deploy_file "frontend/src/styles/components/flashcard-modal-enhanced.css" "$REMOTE_WEB_DIR/src/styles/components/flashcard-modal-enhanced.css"
deploy_file "frontend/src/styles/components/settings.css" "$REMOTE_WEB_DIR/src/styles/components/settings.css"

# Deploy index.html (last)
echo -e "\n📂 Deploying index.html..."
deploy_file "frontend/index.html" "$REMOTE_WEB_DIR/index.html"

echo -e "\n✨ Frontend deployment complete!"
echo "🌐 Visit https://p0qp0q.com to verify"
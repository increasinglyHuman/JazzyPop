#!/bin/bash

# JazzyPop Deployment Script
# Deploys the kawaii-quiz-app to p0qp0q.com

echo "🚀 Deploying JazzyPop to p0qp0q.com..."

# Configuration
LOCAL_DIR="kawaii-quiz-app/"
REMOTE_USER="ubuntu"
REMOTE_HOST="p0qp0q.com"
REMOTE_DIR="~/temp-jazzypop/"  # Temporary directory first
FINAL_DIR="/var/www/html/jazzypop"  # Final destination
SSH_KEY="~/.ssh/poqpoq2025.pem"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Preparing to deploy from: ${LOCAL_DIR}${NC}"
echo -e "${YELLOW}📍 Deploying to: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}${NC}"

# Confirm with user
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

# Create remote temp directory if it doesn't exist
echo -e "${YELLOW}📁 Creating temporary directory on server...${NC}"
ssh -i ${SSH_KEY} ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

# Deploy using rsync to temp directory first
echo -e "${YELLOW}📤 Syncing files to temporary directory...${NC}"
rsync -avz --delete \
    -e "ssh -i ${SSH_KEY}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='PROJECT_STATE.md' \
    --exclude='DEPLOYMENT_NOTES.md' \
    --exclude='*.sh' \
    --progress \
    ${LOCAL_DIR} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files synced to temporary directory${NC}"
    
    # Now move from temp to final destination
    echo -e "${YELLOW}📦 Moving files to final destination...${NC}"
    ssh -i ${SSH_KEY} ${REMOTE_USER}@${REMOTE_HOST} "sudo rm -rf ${FINAL_DIR}/* && sudo mv ${REMOTE_DIR}* ${FINAL_DIR}/ && rmdir ${REMOTE_DIR}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo -e "${GREEN}🌐 Visit https://p0qp0q.com/jazzypop/ to see your changes${NC}"
    else
        echo -e "${RED}❌ Failed to move files to final destination${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Rsync failed!${NC}"
    exit 1
fi

# Set proper permissions
echo -e "${YELLOW}🔧 Setting permissions...${NC}"
ssh -i ${SSH_KEY} ${REMOTE_USER}@${REMOTE_HOST} "sudo chown -R www-data:www-data ${FINAL_DIR} && sudo chmod -R 755 ${FINAL_DIR}"

echo -e "${GREEN}🎉 Deployment complete!${NC}"
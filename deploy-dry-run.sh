#!/bin/bash

# JazzyPop Deployment DRY RUN Script
# Shows what would be deployed without actually doing it

echo "🔍 JazzyPop Deployment DRY RUN..."

# Configuration
LOCAL_DIR="kawaii-quiz-app/"
REMOTE_USER="ubuntu"
REMOTE_HOST="p0qp0q.com"
REMOTE_DIR="~/temp-jazzypop/"
SSH_KEY="~/.ssh/poqpoq2025.pem"

# Colors for output
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 DRY RUN: Would deploy from: ${LOCAL_DIR}${NC}"
echo -e "${YELLOW}📍 To: ${REMOTE_USER}@${REMOTE_HOST}${NC}"

# Show what would be synced
echo -e "${YELLOW}📋 Files that would be deployed:${NC}"
rsync -avzn \
    -e "ssh -i ${SSH_KEY}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='PROJECT_STATE.md' \
    --exclude='DEPLOYMENT_NOTES.md' \
    --exclude='*.sh' \
    ${LOCAL_DIR} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}

echo -e "${YELLOW}This is a DRY RUN - no files were actually transferred${NC}"
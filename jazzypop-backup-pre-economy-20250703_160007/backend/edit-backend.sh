#!/bin/bash
# Quick backend edit wrapper with Redis safety

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== JazzyPop Backend Safe Edit ===${NC}"

# Check if file specified
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Available backend files:${NC}"
    ls -la /home/ubuntu/jazzypop-backend/*.py | awk '{print $9}'
    echo
    echo "Usage: $0 <filename>"
    echo "Example: $0 quiz_generator.py"
    exit 1
fi

FILE=$1
BACKUP_DIR="/home/ubuntu/backups/$(date +%Y%m%d_%H%M%S)"

# Pre-flight checks
echo -e "${YELLOW}Pre-flight checks...${NC}"

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    exit 1
fi

# Check for existing locks
LOCKS=$(redis-cli --scan --pattern "lock:*" 2>/dev/null)
if [ ! -z "$LOCKS" ]; then
    echo -e "${YELLOW}⚠ Active locks found:${NC}"
    echo "$LOCKS"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp "/home/ubuntu/jazzypop-backend/$FILE" "$BACKUP_DIR/" 2>/dev/null || {
    echo -e "${RED}✗ File not found: $FILE${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backup saved to: $BACKUP_DIR${NC}"

# Stop services
echo -e "${YELLOW}Stopping services...${NC}"
sudo systemctl stop gunicorn
echo -e "${GREEN}✓ Services stopped${NC}"

# Edit file
TEMP_FILE="/tmp/$FILE.edit"
cp "/home/ubuntu/jazzypop-backend/$FILE" "$TEMP_FILE"

echo -e "${YELLOW}Opening editor...${NC}"
${EDITOR:-nano} "$TEMP_FILE"

# Show diff
echo -e "${YELLOW}Changes:${NC}"
diff -u "/home/ubuntu/jazzypop-backend/$FILE" "$TEMP_FILE" || true

# Confirm deployment
read -p "Deploy these changes? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled. No changes made.${NC}"
    rm "$TEMP_FILE"
    sudo systemctl start gunicorn
    exit 0
fi

# Deploy
cp "$TEMP_FILE" "/home/ubuntu/jazzypop-backend/$FILE"
echo -e "${GREEN}✓ Changes deployed${NC}"

# Clear cache
echo -e "${YELLOW}Clearing Redis cache...${NC}"
redis-cli FLUSHDB > /dev/null
echo -e "${GREEN}✓ Cache cleared${NC}"

# Restart services
echo -e "${YELLOW}Starting services...${NC}"
sudo systemctl start gunicorn
echo -e "${GREEN}✓ Services started${NC}"

# Log change
echo "$(date): Modified $FILE by $USER - backup at $BACKUP_DIR" >> /var/log/backend_changes.log

# Monitor logs
echo -e "${GREEN}=== Edit Complete ===${NC}"
echo -e "${YELLOW}Monitoring logs (Ctrl+C to exit):${NC}"
timeout 10 tail -f /var/log/gunicorn/error.log || true

echo -e "${GREEN}Done!${NC}"
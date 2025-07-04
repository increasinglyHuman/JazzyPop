#!/bin/bash
# Install JazzyPop systemd services for auto-restart (without monitor)

echo "🎮 Installing JazzyPop System Services (without monitor)..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
   echo "Please run with sudo: sudo ./install-services-no-monitor.sh"
   exit 1
fi

# Copy service files
echo "📋 Copying service files..."
cp jazzypop-backend.service /etc/systemd/system/
cp jazzypop-generators.service /etc/systemd/system/

# Create log directory
echo "📁 Creating log directory..."
mkdir -p /var/log/jazzypop
chown ubuntu:ubuntu /var/log/jazzypop

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable services for auto-start on boot
echo "🚀 Enabling services..."
systemctl enable jazzypop-backend.service
systemctl enable jazzypop-generators.service

# Stop any running instances
echo "🛑 Stopping existing processes..."
pkill -f "python3 main.py" || true
pkill -f "_generator.py" || true
sleep 3

# Start services
echo "▶️  Starting services..."
systemctl start jazzypop-backend.service
sleep 5  # Give backend time to start
systemctl start jazzypop-generators.service

# Check status
echo -e "\n📊 Service Status:"
systemctl status jazzypop-backend.service --no-pager | grep "Active:"
systemctl status jazzypop-generators.service --no-pager | grep "Active:"

echo -e "\n✅ Installation complete!"
echo "Services will now:"
echo "  • Auto-start on system boot"
echo "  • Auto-restart if they crash"
echo ""
echo "⚠️  To enable Discord monitoring:"
echo "  1. Get a Discord webhook URL"
echo "  2. Edit /home/ubuntu/jazzypop-backend/.env"
echo "  3. Replace YOUR_DISCORD_WEBHOOK_HERE with your webhook URL"
echo "  4. Run: sudo systemctl start jazzypop-monitor"
echo ""
echo "Useful commands:"
echo "  systemctl status jazzypop-backend"
echo "  systemctl restart jazzypop-backend"
echo "  journalctl -u jazzypop-backend -f"
#!/bin/bash
# Install JazzyPop systemd services for auto-restart and monitoring

echo "🎮 Installing JazzyPop System Services..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
   echo "Please run with sudo: sudo ./install-services.sh"
   exit 1
fi

# Copy service files
echo "📋 Copying service files..."
cp jazzypop-backend.service /etc/systemd/system/
cp jazzypop-generators.service /etc/systemd/system/
cp jazzypop-monitor.service /etc/systemd/system/

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
systemctl enable jazzypop-monitor.service

# Stop any running instances
echo "🛑 Stopping existing processes..."
pkill -f "main.py" || true
pkill -f "_generator.py" || true
pkill -f "system_monitor.py" || true
sleep 3

# Start services
echo "▶️  Starting services..."
systemctl start jazzypop-backend.service
sleep 5  # Give backend time to start
systemctl start jazzypop-generators.service
systemctl start jazzypop-monitor.service

# Check status
echo -e "\n📊 Service Status:"
systemctl status jazzypop-backend.service --no-pager | grep "Active:"
systemctl status jazzypop-generators.service --no-pager | grep "Active:"
systemctl status jazzypop-monitor.service --no-pager | grep "Active:"

echo -e "\n✅ Installation complete!"
echo "Services will now:"
echo "  • Auto-start on system boot"
echo "  • Auto-restart if they crash"
echo "  • Send Discord alerts for issues"
echo ""
echo "Useful commands:"
echo "  systemctl status jazzypop-backend"
echo "  systemctl restart jazzypop-backend"
echo "  journalctl -u jazzypop-backend -f"
echo "  tail -f /var/log/jazzypop-backend.log"
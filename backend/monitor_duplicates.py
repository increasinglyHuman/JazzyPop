#!/usr/bin/env python3
"""
Monitor for duplicate JazzyPop API instances
Sends alerts to Discord if multiple instances are detected
"""
import subprocess
import psutil
import time
import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_port_8000_processes():
    """Check how many processes are listening on port 8000"""
    try:
        result = subprocess.run(
            ["lsof", "-i", ":8000", "-sTCP:LISTEN"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            # Count lines (excluding header)
            lines = result.stdout.strip().split('\n')
            return len([l for l in lines if 'LISTEN' in l])
        return 0
    except:
        return 0

def check_main_py_processes():
    """Check how many main.py processes are running"""
    count = 0
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline', [])
            if cmdline and any('main.py' in arg for arg in cmdline):
                if any('jazzypop-backend' in arg for arg in cmdline):
                    count += 1
        except:
            continue
    return count

def send_discord_alert(message, alert_type="error", title=None):
    """Send alert to Discord webhook"""
    webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
    if not webhook_url:
        print(f"[{datetime.now()}] WARNING: DISCORD_WEBHOOK_URL not set in .env")
        return
    
    # Color codes for different alert types
    colors = {
        "error": 0xff0000,      # Red
        "warning": 0xffa500,    # Orange
        "info": 0x3498db,       # Blue
        "success": 0x2ecc71     # Green
    }
    
    # Default title if not provided
    if not title:
        titles = {
            "error": "⚠️ Duplicate Process Alert",
            "warning": "⚡ API Warning",
            "info": "ℹ️ API Status Update",
            "success": "✅ API Healthy"
        }
        title = titles.get(alert_type, "JazzyPop API Monitor")
    
    # Get server info
    hostname = subprocess.run(['hostname'], capture_output=True, text=True).stdout.strip()
    
    data = {
        "username": "JazzyPop Monitor",
        "avatar_url": "https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f916.png",
        "embeds": [{
            "title": title,
            "description": message,
            "color": colors.get(alert_type, 0x808080),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {
                "text": f"🤖 {hostname} | 💚 Powered by p0qp0q"
            },
            "fields": [
                {
                    "name": "Monitor",
                    "value": "Duplicate Process Monitor",
                    "inline": True
                },
                {
                    "name": "Time",
                    "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "inline": True
                }
            ]
        }]
    }
    
    try:
        response = requests.post(webhook_url, json=data)
        if response.status_code != 204:
            print(f"[{datetime.now()}] Discord webhook failed: {response.status_code}")
    except Exception as e:
        print(f"[{datetime.now()}] Error sending Discord alert: {e}")

def get_process_details():
    """Get details of all API processes"""
    details = []
    for proc in psutil.process_iter(['pid', 'create_time', 'cmdline', 'memory_info']):
        try:
            cmdline = proc.info.get('cmdline', [])
            if cmdline and any('main.py' in arg for arg in cmdline):
                if any('jazzypop-backend' in arg for arg in cmdline):
                    details.append({
                        'pid': proc.info['pid'],
                        'started': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S'),
                        'memory': proc.info['memory_info'].rss / 1024 / 1024  # MB
                    })
        except:
            continue
    return details

def get_system_stats():
    """Get system resource statistics"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        'cpu': cpu_percent,
        'memory': {
            'percent': memory.percent,
            'used': memory.used / 1024 / 1024 / 1024,  # GB
            'total': memory.total / 1024 / 1024 / 1024  # GB
        },
        'disk': {
            'percent': disk.percent,
            'used': disk.used / 1024 / 1024 / 1024,  # GB
            'total': disk.total / 1024 / 1024 / 1024  # GB
        }
    }

def check_api_health():
    """Check if API is responding"""
    try:
        response = requests.get('http://localhost:8000/api/health', timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main monitoring loop"""
    last_alert_time = 0
    last_status_report = 0
    alert_cooldown = 300  # 5 minutes between duplicate alerts
    status_report_interval = 3600  # 1 hour between status reports
    startup_notification_sent = False
    
    print(f"[{datetime.now()}] Starting JazzyPop Duplicate Monitor...")
    
    while True:
        current_time = time.time()
        port_processes = check_port_8000_processes()
        main_processes = check_main_py_processes()
        api_healthy = check_api_health()
        
        # Send startup notification
        if not startup_notification_sent:
            send_discord_alert(
                "Duplicate Process Monitor has started. Will check for duplicate API instances every minute.",
                alert_type="info",
                title="🚀 Monitor Started"
            )
            startup_notification_sent = True
        
        # Check for duplicates
        if port_processes > 1 or main_processes > 1:
            if current_time - last_alert_time > alert_cooldown:
                details = get_process_details()
                message = f"**Multiple JazzyPop API instances detected!**\n\n"
                message += f"🔌 Processes on port 8000: **{port_processes}**\n"
                message += f"🐍 main.py processes: **{main_processes}**\n\n"
                
                if details:
                    message += "**Process Details:**\n"
                    for i, detail in enumerate(details, 1):
                        message += f"{i}. PID `{detail['pid']}`: Started {detail['started']}, "
                        message += f"Memory: {detail['memory']:.1f}MB\n"
                
                message += f"\n**API Health:** {'✅ Responding' if api_healthy else '❌ Not responding'}"
                
                print(f"[{datetime.now()}] ALERT: Multiple instances detected")
                send_discord_alert(message, alert_type="error")
                last_alert_time = current_time
        
        # Send periodic status report
        if current_time - last_status_report > status_report_interval:
            stats = get_system_stats()
            details = get_process_details()
            
            message = f"**API Status:** {'✅ Healthy' if api_healthy else '❌ Down'}\n"
            message += f"**Process Count:** {main_processes} instance(s)\n\n"
            
            if details:
                message += "**Process Details:**\n"
                for detail in details:
                    message += f"• PID {detail['pid']}: Memory {detail['memory']:.1f}MB\n"
            
            message += f"\n**System Resources:**\n"
            message += f"• CPU: {stats['cpu']:.1f}%\n"
            message += f"• Memory: {stats['memory']['used']:.1f}/{stats['memory']['total']:.1f}GB ({stats['memory']['percent']:.1f}%)\n"
            message += f"• Disk: {stats['disk']['used']:.1f}/{stats['disk']['total']:.1f}GB ({stats['disk']['percent']:.1f}%)\n"
            
            alert_type = "success" if api_healthy and main_processes == 1 else "warning"
            title = "📊 Hourly Status Report"
            
            send_discord_alert(message, alert_type=alert_type, title=title)
            last_status_report = current_time
        
        # If API is down but no duplicates, send alert
        if not api_healthy and main_processes <= 1:
            if current_time - last_alert_time > alert_cooldown:
                message = "**JazzyPop API is not responding!**\n\n"
                message += f"• Port 8000 processes: {port_processes}\n"
                message += f"• main.py processes: {main_processes}\n"
                message += "\nThe API appears to be down or unresponsive."
                
                send_discord_alert(message, alert_type="error", title="❌ API Down")
                last_alert_time = current_time
        
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
JazzyPop System Monitor - Discord Webhook Integration
Monitors services and sends alerts to Discord
"""
import os
import json
import time
import requests
import subprocess
from datetime import datetime
from typing import Dict, List, Optional

class DiscordWebhook:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
        self.hostname = subprocess.getoutput('hostname')
    
    def send_message(self, title: str, description: str, color: int = 0x00ff00, fields: List[Dict] = None, show_thumbnail: bool = False):
        """Send embed message to Discord"""
        embed = {
            "title": f"🎮 JazzyPop - {title}",
            "description": description,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {
                "text": f"🤖 {self.hostname} | 💚 Powered by p0qp0q"
            }
        }
        
        # Add a fun thumbnail for important messages
        if show_thumbnail:
            embed["thumbnail"] = {
                "url": "https://p0qp0q.com/src/images/categories/dinosaurs.png"
            }
        
        if fields:
            embed["fields"] = fields
        
        data = {
            "embeds": [embed]
        }
        
        try:
            response = requests.post(self.webhook_url, json=data)
            return response.status_code == 204
        except Exception as e:
            print(f"Failed to send Discord message: {e}")
            return False

class ServiceMonitor:
    def __init__(self, webhook_url: str):
        self.webhook = DiscordWebhook(webhook_url)
        self.services = {
            "backend": {
                "systemd_service": "jazzypop-api",
                "port": 8000,
                "name": "JazzyPop Backend API"
            },
            "quiz_generator": {
                "systemd_service": "jazzypop-quiz-generator",
                "name": "Quiz Set Generator"
            },
            "generators": {
                "systemd_service": "jazzypop-generators",
                "name": "Content Generators"
            },
            "postgresql": {
                "port": 5432,
                "name": "PostgreSQL Database"
            },
            "nginx": {
                "port": 80,
                "name": "Nginx Web Server"
            }
        }
        self.status_file = "/tmp/jazzypop_status.json"
        self.load_previous_status()
    
    def load_previous_status(self):
        """Load previous service status"""
        try:
            if os.path.exists(self.status_file):
                with open(self.status_file, 'r') as f:
                    self.previous_status = json.load(f)
            else:
                self.previous_status = {}
        except:
            self.previous_status = {}
    
    def save_current_status(self, status: Dict):
        """Save current service status"""
        with open(self.status_file, 'w') as f:
            json.dump(status, f)
    
    def check_process(self, process_name: str) -> bool:
        """Check if a process is running"""
        try:
            result = subprocess.run(['pgrep', '-f', process_name], 
                                  capture_output=True, text=True)
            return result.returncode == 0
        except:
            return False
    
    def check_port(self, port: int) -> bool:
        """Check if a port is listening"""
        try:
            result = subprocess.run(['ss', '-tln'], 
                                  capture_output=True, text=True)
            return f":{port}" in result.stdout
        except:
            return False
    
    def check_systemd_service(self, service_name: str) -> bool:
        """Check if a systemd service is active"""
        try:
            result = subprocess.run(['systemctl', 'is-active', service_name], 
                                  capture_output=True, text=True)
            return result.stdout.strip() == 'active'
        except:
            return False
    
    def restart_service(self, service_name: str) -> bool:
        """Attempt to restart a service"""
        restart_commands = {
            "backend": "sudo systemctl restart jazzypop-backend",
            "quiz_generator": "sudo systemctl restart jazzypop-quiz-generator",
            "generators": "cd /home/ubuntu/jazzypop-backend && ./start_all_set_generators.sh",
            "postgresql": "sudo systemctl restart postgresql",
            "nginx": "sudo systemctl restart nginx"
        }
        
        if service_name in restart_commands:
            try:
                subprocess.run(restart_commands[service_name], shell=True)
                time.sleep(5)  # Give service time to start
                return True
            except:
                return False
        return False
    
    def check_all_services(self) -> Dict:
        """Check all services and return status"""
        status = {}
        
        # Check backend - using systemd service status
        backend_up = self.check_systemd_service("jazzypop-backend") and \
                    self.check_port(self.services["backend"]["port"])
        status["backend"] = backend_up
        
        # Check quiz generator
        quiz_gen_up = self.check_systemd_service("jazzypop-quiz-generator")
        status["quiz_generator"] = quiz_gen_up
        
        # Check generators - check if any generator process is running
        generators_up = self.check_process("_generator.py")
        status["generators"] = generators_up
        
        # Check PostgreSQL
        status["postgresql"] = self.check_port(self.services["postgresql"]["port"])
        
        # Check Nginx
        status["nginx"] = self.check_port(self.services["nginx"]["port"])
        
        return status
    
    def handle_service_change(self, service: str, was_up: bool, is_up: bool):
        """Handle service status change"""
        service_info = self.services[service]
        service_name = service_info["name"]
        
        if was_up and not is_up:
            # Service went down
            self.webhook.send_message(
                title="⚠️ Service Down",
                description=f"{service_name} has stopped responding!",
                color=0xff0000,  # Red
                fields=[
                    {"name": "Service", "value": service_name, "inline": True},
                    {"name": "Status", "value": "❌ Down", "inline": True},
                    {"name": "Action", "value": "Attempting restart...", "inline": True}
                ]
            )
            
            # Attempt restart
            if self.restart_service(service):
                # Check if restart worked
                time.sleep(5)
                new_status = self.check_all_services()
                if new_status[service]:
                    self.webhook.send_message(
                        title="✅ Service Recovered",
                        description=f"{service_name} has been successfully restarted!",
                        color=0x00ff00,  # Green
                        fields=[
                            {"name": "Service", "value": service_name, "inline": True},
                            {"name": "Status", "value": "✅ Running", "inline": True},
                            {"name": "Recovery", "value": "Automatic", "inline": True}
                        ]
                    )
                    
                    # Send content report when backend service is recovered
                    if service == "backend":
                        time.sleep(2)  # Give the backend a moment to fully initialize
                        self.send_content_report()
                else:
                    self.webhook.send_message(
                        title="❌ Restart Failed",
                        description=f"Failed to restart {service_name}. Manual intervention required!",
                        color=0xff0000,  # Red
                        fields=[
                            {"name": "Service", "value": service_name, "inline": True},
                            {"name": "Status", "value": "❌ Still Down", "inline": True},
                            {"name": "Action Required", "value": "Manual restart needed", "inline": True}
                        ]
                    )
        
        elif not was_up and is_up:
            # Service came back up
            self.webhook.send_message(
                title="✅ Service Restored",
                description=f"{service_name} is back online!",
                color=0x00ff00,  # Green
                fields=[
                    {"name": "Service", "value": service_name, "inline": True},
                    {"name": "Status", "value": "✅ Running", "inline": True}
                ]
            )
            
            # Send content report when backend service is restored
            if service == "backend":
                time.sleep(2)  # Give the backend a moment to fully initialize
                self.send_content_report()
    
    def run_check(self):
        """Run a single check cycle"""
        current_status = self.check_all_services()
        
        # Compare with previous status
        for service, is_up in current_status.items():
            was_up = self.previous_status.get(service, True)
            if was_up != is_up:
                self.handle_service_change(service, was_up, is_up)
        
        # Save current status
        self.save_current_status(current_status)
        self.previous_status = current_status
        
        return current_status
    
    def send_daily_report(self):
        """Send daily status report"""
        status = self.check_all_services()
        
        fields = []
        all_up = True
        
        for service, is_up in status.items():
            service_name = self.services[service]["name"]
            fields.append({
                "name": service_name,
                "value": "✅ Running" if is_up else "❌ Down",
                "inline": True
            })
            if not is_up:
                all_up = False
        
        color = 0x00ff00 if all_up else 0xffff00  # Green if all up, yellow if some down
        
        self.webhook.send_message(
            title="📊 Daily Status Report",
            description="System health check summary",
            color=color,
            fields=fields
        )
    
    def get_content_stats(self) -> Dict:
        """Get content generation statistics from database"""
        try:
            import subprocess
            import json
            
            # Use a simple Python script to get stats
            stats_script = """
import psycopg2
from datetime import datetime, timedelta
import json

try:
    # Connect using the same credentials as the main app
    conn = psycopg2.connect(
        host="localhost",
        database="jazzypop", 
        user="jazzypop_user",
        password="jazzyp0p_2025"
    )
    cur = conn.cursor()
    
    # Get content created in last 8 hours
    eight_hours_ago = datetime.utcnow() - timedelta(hours=8)
    
    # Get counts by type
    cur.execute('''
        SELECT type, COUNT(*) as count
        FROM content
        WHERE created_at >= %s
        AND is_active = true
        GROUP BY type
        ORDER BY type
    ''', (eight_hours_ago,))
    
    type_counts = {}
    for row in cur.fetchall():
        type_counts[row[0]] = row[1]
    
    # Get total count
    cur.execute('''
        SELECT COUNT(*) 
        FROM content
        WHERE created_at >= %s
        AND is_active = true
    ''', (eight_hours_ago,))
    
    total_new = cur.fetchone()[0]
    
    # Get total active content
    cur.execute('''
        SELECT 
            COUNT(CASE WHEN type LIKE '%_set' THEN 1 END) as sets,
            COUNT(*) as total
        FROM content
        WHERE is_active = true
    ''')
    
    sets, total_active = cur.fetchone()
    
    cur.close()
    conn.close()
    
    result = {
        "new_content": type_counts,
        "total_new": total_new,
        "total_sets": sets,
        "total_active": total_active
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}))
"""
            
            # Run the script using the venv Python
            result = subprocess.run(
                ['/home/ubuntu/jazzypop-backend/venv/bin/python', '-c', stats_script],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                stats = json.loads(result.stdout)
                if "error" in stats:
                    print(f"Failed to get content stats: {stats['error']}")
                    return None
                return stats
            else:
                print(f"Failed to get content stats: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"Failed to get content stats: {e}")
            return None
    
    def send_content_report(self):
        """Send content generation report"""
        print("Attempting to send content report...")
        stats = self.get_content_stats()
        
        if not stats:
            print("No stats returned from get_content_stats")
            self.webhook.send_message(
                title="📊 Content Report Error",
                description="Failed to retrieve database statistics",
                color=0xff0000
            )
            return
        
        fields = []
        
        # New content in last 8 hours
        if stats["total_new"] > 0:
            fields.append({
                "name": "📈 New Content (8 hours)",
                "value": f"# **{stats['total_new']:,}**\nitems generated",
                "inline": False
            })
            
            # Breakdown by type
            for content_type, count in sorted(stats["new_content"].items()):
                emoji = "📦" if content_type.endswith("_set") else "📄"
                display_name = content_type.replace("_set", " sets").replace("_", " ").title()
                fields.append({
                    "name": f"{emoji} {display_name}",
                    "value": f"{count:,}",
                    "inline": True
                })
        else:
            fields.append({
                "name": "📈 New Content (8 hours)",
                "value": "No new content generated",
                "inline": False
            })
        
        # Total content summary
        fields.append({
            "name": "📊 Total Active Content",
            "value": f"## **{stats['total_active']:,}**\ntotal items in database",
            "inline": False
        })
        
        fields.append({
            "name": "📦 Quiz/Content Sets",
            "value": f"**{stats['total_sets']:,}** sets\n*({stats['total_sets'] * 10:,} items)*",
            "inline": False
        })
        
        # Color based on generation activity
        color = 0x00ff00 if stats["total_new"] > 0 else 0xffff00
        
        self.webhook.send_message(
            title="📈 Content Generation Report",
            description="✨ **JazzyPop Database Statistics** ✨\n8-hour content generation summary",
            color=color,
            fields=fields,
            show_thumbnail=True
        )

def main():
    """Main monitoring loop"""
    # Get Discord webhook URL from environment or file
    webhook_url = os.getenv('DISCORD_WEBHOOK_URL')
    if not webhook_url:
        # Try to load from .env file
        try:
            with open('/home/ubuntu/jazzypop-backend/.env', 'r') as f:
                for line in f:
                    if line.startswith('DISCORD_WEBHOOK_URL='):
                        webhook_url = line.split('=', 1)[1].strip()
                        break
        except:
            pass
    
    if not webhook_url:
        print("DISCORD_WEBHOOK_URL not set!")
        return
    
    monitor = ServiceMonitor(webhook_url)
    
    # Send startup message with content stats
    monitor.webhook.send_message(
        title="🚀 JazzyPop Monitor Started",
        description="System monitoring is now active\nContent report incoming...",
        color=0x00ff00
    )
    
    # Send initial content report
    monitor.send_content_report()
    
    # Run initial service check
    monitor.run_check()
    
    check_count = 0
    while True:
        try:
            # Run check every 60 seconds
            time.sleep(60)
            monitor.run_check()
            
            check_count += 1
            
            # Send content report every 480 checks (8 hours)
            if check_count % 480 == 0:
                monitor.send_content_report()
            
            # Send daily report every 1440 checks (24 hours)
            if check_count % 1440 == 0:
                monitor.send_daily_report()
                
        except KeyboardInterrupt:
            monitor.webhook.send_message(
                title="🛑 Monitor Stopped",
                description="System monitoring has been stopped",
                color=0xffff00
            )
            break
        except Exception as e:
            print(f"Monitor error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()
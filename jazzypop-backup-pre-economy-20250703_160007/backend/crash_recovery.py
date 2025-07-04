#!/usr/bin/env python3
"""
JazzyPop Crash Recovery Script
Automatically restarts failed services and sends notifications
"""
import os
import sys
import subprocess
import time
import json
import requests
from datetime import datetime
from typing import Dict, List, Tuple

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')

class CrashRecovery:
    def __init__(self):
        self.services = {
            'jazzypop-api': {
                'name': 'JazzyPop API',
                'critical': True,
                'restart_attempts': 0,
                'max_attempts': 3
            },
            'jazzypop-quiz-generator': {
                'name': 'Quiz Set Generator',
                'critical': False,
                'restart_attempts': 0,
                'max_attempts': 3
            },
            'jazzypop-generators': {
                'name': 'Content Generators',
                'critical': False,
                'restart_attempts': 0,
                'max_attempts': 3
            },
            'jazzypop-monitor': {
                'name': 'System Monitor',
                'critical': False,
                'restart_attempts': 0,
                'max_attempts': 3
            },
            'postgresql': {
                'name': 'PostgreSQL Database',
                'critical': True,
                'restart_attempts': 0,
                'max_attempts': 2
            },
            'nginx': {
                'name': 'Nginx Web Server',
                'critical': True,
                'restart_attempts': 0,
                'max_attempts': 2
            }
        }
        
        self.recovery_log = '/home/ubuntu/jazzypop-backend/logs/crash_recovery.log'
        
    def log_message(self, message: str, level: str = "INFO"):
        """Log message to file and console"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} [{level}] {message}"
        print(log_entry)
        
        try:
            with open(self.recovery_log, 'a') as f:
                f.write(log_entry + '\n')
        except:
            pass
    
    def send_discord_alert(self, title: str, message: str, color: int = 0xff0000):
        """Send alert to Discord webhook"""
        if not DISCORD_WEBHOOK_URL:
            return
            
        embed = {
            "title": f"🚨 JazzyPop Alert: {title}",
            "description": message,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {
                "text": "Crash Recovery System"
            }
        }
        
        try:
            response = requests.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]})
            return response.status_code == 204
        except Exception as e:
            self.log_message(f"Failed to send Discord alert: {e}", "ERROR")
            return False
    
    def check_service_status(self, service_name: str) -> Tuple[bool, str]:
        """Check if a systemd service is running"""
        try:
            result = subprocess.run(
                ['systemctl', 'is-active', service_name],
                capture_output=True,
                text=True
            )
            
            is_active = result.stdout.strip() == 'active'
            status = result.stdout.strip()
            
            return is_active, status
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def restart_service(self, service_name: str) -> bool:
        """Attempt to restart a service"""
        try:
            # Reset failed state first
            subprocess.run(['sudo', 'systemctl', 'reset-failed', service_name])
            
            # Restart the service
            result = subprocess.run(
                ['sudo', 'systemctl', 'restart', service_name],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.log_message(f"Successfully restarted {service_name}")
                return True
            else:
                self.log_message(f"Failed to restart {service_name}: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log_message(f"Error restarting {service_name}: {str(e)}", "ERROR")
            return False
    
    def check_disk_space(self) -> Tuple[float, bool]:
        """Check disk space usage"""
        try:
            df = subprocess.run(['df', '-h', '/'], capture_output=True, text=True)
            lines = df.stdout.strip().split('\n')
            if len(lines) > 1:
                parts = lines[1].split()
                if len(parts) >= 5:
                    usage_str = parts[4].rstrip('%')
                    usage = float(usage_str)
                    return usage, usage > 85
        except:
            pass
        return 0, False
    
    def cleanup_logs(self):
        """Clean up old logs if disk space is critical"""
        try:
            # Clean journal logs older than 7 days
            subprocess.run(['sudo', 'journalctl', '--vacuum-time=7d'])
            
            # Truncate large log files
            log_dir = '/home/ubuntu/jazzypop-backend/logs'
            for log_file in os.listdir(log_dir):
                if log_file.endswith('.log'):
                    file_path = os.path.join(log_dir, log_file)
                    size = os.path.getsize(file_path)
                    if size > 100 * 1024 * 1024:  # 100MB
                        self.log_message(f"Truncating large log file: {log_file} ({size} bytes)")
                        subprocess.run(['sudo', 'truncate', '-s', '0', file_path])
                        
        except Exception as e:
            self.log_message(f"Error during cleanup: {str(e)}", "ERROR")
    
    def perform_recovery(self):
        """Main recovery process"""
        self.log_message("Starting crash recovery check...")
        
        failed_services = []
        recovered_services = []
        critical_failure = False
        
        # Check disk space first
        disk_usage, is_critical = self.check_disk_space()
        if is_critical:
            self.log_message(f"Disk usage critical: {disk_usage}%", "WARNING")
            self.send_discord_alert(
                "Disk Space Warning",
                f"Server disk usage is at {disk_usage}%\nRunning cleanup...",
                0xffaa00  # Orange
            )
            self.cleanup_logs()
        
        # Check each service
        for service_name, service_info in self.services.items():
            is_active, status = self.check_service_status(service_name)
            
            if not is_active and status != 'inactive':
                failed_services.append(service_name)
                
                if service_info['restart_attempts'] < service_info['max_attempts']:
                    self.log_message(f"{service_name} is {status}, attempting restart...")
                    
                    if self.restart_service(service_name):
                        time.sleep(5)  # Wait for service to stabilize
                        
                        # Verify it's running
                        is_active_now, _ = self.check_service_status(service_name)
                        if is_active_now:
                            recovered_services.append(service_name)
                            service_info['restart_attempts'] = 0
                        else:
                            service_info['restart_attempts'] += 1
                    else:
                        service_info['restart_attempts'] += 1
                        
                    if service_info['critical'] and service_info['restart_attempts'] >= service_info['max_attempts']:
                        critical_failure = True
                else:
                    self.log_message(f"{service_name} has exceeded max restart attempts", "ERROR")
                    if service_info['critical']:
                        critical_failure = True
        
        # Send notifications
        if failed_services:
            message = f"**Failed Services:**\n"
            for service in failed_services:
                if service not in recovered_services:
                    message += f"❌ {self.services[service]['name']}\n"
            
            if recovered_services:
                message += f"\n**Recovered Services:**\n"
                for service in recovered_services:
                    message += f"✅ {self.services[service]['name']}\n"
            
            color = 0xff0000 if critical_failure else 0xffaa00
            self.send_discord_alert(
                "Service Failure Detected",
                message,
                color
            )
        
        self.log_message("Crash recovery check completed")
        
        return not critical_failure
    
    def run_continuous(self, interval_minutes: int = 5):
        """Run continuously"""
        self.log_message(f"Starting continuous crash recovery (checking every {interval_minutes} minutes)")
        
        while True:
            try:
                self.perform_recovery()
                time.sleep(interval_minutes * 60)
            except KeyboardInterrupt:
                self.log_message("Crash recovery stopped by user")
                break
            except Exception as e:
                self.log_message(f"Unexpected error: {str(e)}", "ERROR")
                time.sleep(60)  # Wait a minute before retrying

if __name__ == "__main__":
    recovery = CrashRecovery()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        recovery.perform_recovery()
    else:
        recovery.run_continuous()
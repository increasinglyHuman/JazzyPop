#!/usr/bin/env python3
"""
Safe Backend Edit Tool for JazzyPop
Handles Redis locks, backups, and cache clearing automatically
"""

import os
import sys
import time
import redis
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

class SafeBackendEditor:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.backup_root = Path("/home/ubuntu/backups")
        self.backend_path = Path("/home/ubuntu/jazzypop-backend")
        self.lock_timeout = 300  # 5 minutes
        self.identifier = f"{time.time()}:{os.getpid()}"
        
    def acquire_lock(self, filename):
        """Acquire a Redis lock with timeout"""
        lock_key = f"lock:file:{filename}"
        success = self.redis_client.set(lock_key, self.identifier, nx=True, ex=self.lock_timeout)
        if success:
            print(f"✓ Lock acquired for {filename}")
            return True
        else:
            current_owner = self.redis_client.get(lock_key)
            print(f"✗ Lock held by: {current_owner}")
            
            # Check if lock is expired
            ttl = self.redis_client.ttl(lock_key)
            if ttl == -1:  # No expiry set
                print("Warning: Lock has no expiry. May be stuck.")
                response = input("Force remove lock? (y/n): ")
                if response.lower() == 'y':
                    self.redis_client.delete(lock_key)
                    return self.acquire_lock(filename)
            else:
                print(f"Lock expires in {ttl} seconds")
            return False
    
    def release_lock(self, filename):
        """Release lock if we own it"""
        lock_key = f"lock:file:{filename}"
        
        with self.redis_client.pipeline() as pipe:
            while True:
                try:
                    pipe.watch(lock_key)
                    if pipe.get(lock_key) == self.identifier:
                        pipe.multi()
                        pipe.delete(lock_key)
                        pipe.execute()
                        print(f"✓ Lock released for {filename}")
                        return True
                    pipe.unwatch()
                    print("✗ Lock not owned by us")
                    return False
                except redis.WatchError:
                    continue
    
    def create_backup(self, filename):
        """Create timestamped backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.backup_root / timestamp
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        source = self.backend_path / filename
        if source.exists():
            dest = backup_dir / filename
            shutil.copy2(source, dest)
            print(f"✓ Backup created: {dest}")
            return dest
        else:
            print(f"✗ Source file not found: {source}")
            return None
    
    def stop_services(self):
        """Stop backend services"""
        print("Stopping services...")
        try:
            subprocess.run(["sudo", "systemctl", "stop", "gunicorn"], check=True)
            print("✓ Gunicorn stopped")
            time.sleep(3)  # Wait for graceful shutdown
            
            # Check if Redis should be stopped
            response = input("Stop Redis too? (y/n): ")
            if response.lower() == 'y':
                subprocess.run(["sudo", "systemctl", "stop", "redis"], check=True)
                print("✓ Redis stopped")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to stop services: {e}")
            return False
        return True
    
    def start_services(self):
        """Start backend services"""
        print("Starting services...")
        try:
            # Check if Redis needs starting
            redis_status = subprocess.run(
                ["systemctl", "is-active", "redis"], 
                capture_output=True, 
                text=True
            )
            if redis_status.stdout.strip() != "active":
                subprocess.run(["sudo", "systemctl", "start", "redis"], check=True)
                print("✓ Redis started")
                time.sleep(2)  # Wait for Redis
            
            subprocess.run(["sudo", "systemctl", "start", "gunicorn"], check=True)
            print("✓ Gunicorn started")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to start services: {e}")
            return False
        return True
    
    def clear_cache(self, filename):
        """Clear relevant Redis cache"""
        print("Clearing cache...")
        
        patterns = {
            "quiz_generator.py": ["quiz:*", "questions:*"],
            "app.py": ["api:*", "session:*"],
            "card_manager.py": ["cards:*", "card:*"]
        }
        
        cleared = 0
        for pattern in patterns.get(filename, ["*"]):
            for key in self.redis_client.scan_iter(match=pattern):
                self.redis_client.delete(key)
                cleared += 1
        
        print(f"✓ Cleared {cleared} cache entries")
    
    def edit_file(self, filename):
        """Main edit workflow"""
        print(f"\n=== Safe Edit: {filename} ===")
        
        # Pre-flight checks
        try:
            self.redis_client.ping()
            print("✓ Redis connection OK")
        except:
            print("✗ Cannot connect to Redis")
            return False
        
        # Acquire lock
        if not self.acquire_lock(filename):
            print("Cannot proceed without lock")
            return False
        
        try:
            # Create backup
            backup_path = self.create_backup(filename)
            if not backup_path:
                return False
            
            # Stop services
            if not self.stop_services():
                return False
            
            # Create working copy
            source = self.backend_path / filename
            work_file = Path(f"/tmp/{filename}.work")
            shutil.copy2(source, work_file)
            
            print(f"\n✓ Working copy created: {work_file}")
            print("Edit the file, then press Enter to continue...")
            print(f"\nEditor command: nano {work_file}")
            input()
            
            # Confirm deployment
            print("\nReview changes:")
            subprocess.run(["diff", "-u", str(source), str(work_file)])
            
            response = input("\nDeploy these changes? (y/n): ")
            if response.lower() != 'y':
                print("Deployment cancelled")
                return False
            
            # Deploy changes
            shutil.copy2(work_file, source)
            print(f"✓ Changes deployed to {source}")
            
            # Create post-change backup
            post_backup = self.backup_root / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_post"
            post_backup.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, post_backup / filename)
            print(f"✓ Post-change backup: {post_backup / filename}")
            
            # Clear cache
            self.clear_cache(filename)
            
            # Start services
            if not self.start_services():
                print("Warning: Services failed to start!")
                print(f"Rollback command: cp {backup_path} {source}")
            
            # Log the change
            log_entry = f"{datetime.now()}: Modified {filename} by {os.getuser()}\n"
            with open("/var/log/backend_changes.log", "a") as log:
                log.write(log_entry)
            
            print("\n✓ Edit completed successfully!")
            return True
            
        finally:
            # Always release lock
            self.release_lock(filename)
            
            # Cleanup work file
            work_file = Path(f"/tmp/{filename}.work")
            if work_file.exists():
                work_file.unlink()

def main():
    if len(sys.argv) != 2:
        print("Usage: python safe_edit.py <filename>")
        print("Example: python safe_edit.py quiz_generator.py")
        sys.exit(1)
    
    filename = sys.argv[1]
    editor = SafeBackendEditor()
    
    success = editor.edit_file(filename)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
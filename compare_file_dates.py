#!/usr/bin/env python3
"""
Compare file modification dates between local and server
Only copy files where local is newer than server
"""
import os
import subprocess
import datetime
from pathlib import Path

def get_remote_file_time(server_path):
    """Get modification time of file on server"""
    cmd = f'ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com "stat -c %Y {server_path} 2>/dev/null"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        return int(result.stdout.strip())
    return None

def get_local_file_time(local_path):
    """Get modification time of local file"""
    try:
        return int(os.path.getmtime(local_path))
    except:
        return None

def compare_frontend_files():
    """Compare frontend files between local and server"""
    print("\n=== FRONTEND FILE COMPARISON ===\n")
    
    local_base = "/home/p0qp0q/Documents/Merlin/JazzyPop/frontend"
    server_base = "/var/www/html/jazzypop"
    
    # Key files to check
    files_to_check = [
        "index.html",
        "database_viewer.html",
        "src/components/AuthPanel.js",
        "src/components/AgeVerificationModal.js",
        "src/components/ProfileEditModal.js",
        "src/components/CardManager.js",
        "src/components/EconomyManager.js",
        "src/components/FlashcardModal.js",
        "src/components/GiggleMeter.js",
        "src/components/QuizFeedbackPopup.js",
        "src/components/QuizModal.js",
        "src/components/RewardsDisplay.js",
        "src/components/SettingsPanel.js",
        "src/scripts/dashboard.js",
        "src/styles/components/age-verification-modal.css",
        "src/styles/components/auth-age-verification.css",
        "src/styles/components/profile-edit-modal.css"
    ]
    
    deploy_list = []
    skip_list = []
    
    for file in files_to_check:
        local_path = os.path.join(local_base, file)
        server_path = os.path.join(server_base, file)
        
        local_time = get_local_file_time(local_path)
        remote_time = get_remote_file_time(server_path)
        
        if local_time is None:
            continue
            
        if remote_time is None:
            # File doesn't exist on server - new file
            print(f"NEW FILE: {file}")
            print(f"  Local: {datetime.datetime.fromtimestamp(local_time)}")
            print(f"  Server: Does not exist")
            print(f"  Action: DEPLOY\n")
            deploy_list.append(file)
        else:
            local_dt = datetime.datetime.fromtimestamp(local_time)
            remote_dt = datetime.datetime.fromtimestamp(remote_time)
            
            print(f"FILE: {file}")
            print(f"  Local:  {local_dt}")
            print(f"  Server: {remote_dt}")
            
            if local_time > remote_time:
                print(f"  Action: DEPLOY (local is newer by {local_dt - remote_dt})\n")
                deploy_list.append(file)
            elif remote_time > local_time:
                print(f"  Action: SKIP (server is newer by {remote_dt - local_dt})\n")
                skip_list.append(file)
            else:
                print(f"  Action: SKIP (same modification time)\n")
                skip_list.append(file)
    
    return deploy_list, skip_list

def compare_backend_files():
    """Compare backend files between local and server"""
    print("\n=== BACKEND FILE COMPARISON ===\n")
    
    local_base = "/home/p0qp0q/Documents/Merlin/JazzyPop/backend"
    server_base = "/home/ubuntu/jazzypop-backend"
    
    # Key files to check
    files_to_check = [
        "main.py",
        "database_always_available.py",
        "validation_prompts.py",
        "ai_quiz_validator.py",
        "quiz_set_generator_v3.py",
        "roaring_bitmap_dedup.py",
        "email_service.py"
    ]
    
    deploy_list = []
    skip_list = []
    
    for file in files_to_check:
        local_path = os.path.join(local_base, file)
        server_path = os.path.join(server_base, file)
        
        local_time = get_local_file_time(local_path)
        remote_time = get_remote_file_time(server_path)
        
        if local_time is None:
            continue
            
        if remote_time is None:
            # File doesn't exist on server - new file
            print(f"NEW FILE: {file}")
            print(f"  Local: {datetime.datetime.fromtimestamp(local_time)}")
            print(f"  Server: Does not exist")
            print(f"  Action: DEPLOY\n")
            deploy_list.append(file)
        else:
            local_dt = datetime.datetime.fromtimestamp(local_time)
            remote_dt = datetime.datetime.fromtimestamp(remote_time)
            
            print(f"FILE: {file}")
            print(f"  Local:  {local_dt}")
            print(f"  Server: {remote_dt}")
            
            if local_time > remote_time:
                print(f"  Action: DEPLOY (local is newer by {local_dt - remote_dt})\n")
                deploy_list.append(file)
            elif remote_time > local_time:
                print(f"  Action: SKIP (server is newer by {remote_dt - local_dt})\n")
                skip_list.append(file)
            else:
                print(f"  Action: SKIP (same modification time)\n")
                skip_list.append(file)
    
    return deploy_list, skip_list

if __name__ == "__main__":
    frontend_deploy, frontend_skip = compare_frontend_files()
    backend_deploy, backend_skip = compare_backend_files()
    
    print("\n=== SUMMARY ===")
    print(f"\nFrontend files to deploy: {len(frontend_deploy)}")
    for f in frontend_deploy:
        print(f"  - {f}")
    
    print(f"\nFrontend files to skip: {len(frontend_skip)}")
    for f in frontend_skip:
        print(f"  - {f}")
        
    print(f"\nBackend files to deploy: {len(backend_deploy)}")
    for f in backend_deploy:
        print(f"  - {f}")
    
    print(f"\nBackend files to skip: {len(backend_skip)}")
    for f in backend_skip:
        print(f"  - {f}")
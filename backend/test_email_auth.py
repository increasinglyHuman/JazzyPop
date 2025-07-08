#!/usr/bin/env python3
"""
Test email/password authentication endpoints
This script tests the registration flow step by step
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://p0qp0q.com"

def test_registration():
    """Test user registration with email/password"""
    print("\n🚀 Testing User Registration")
    print("=" * 60)
    
    # Test with valid data
    # Note: email-validator checks if domains accept email, so we need a real domain
    test_email = f"test_user_{datetime.now().timestamp():.0f}@gmail.com"
    test_data = {
        "email": test_email,
        "password": "TestPassword123",
        "display_name": "Test User"
    }
    
    print(f"📧 Email: {test_data['email']}")
    print(f"🔐 Password: {test_data['password']}")
    print(f"👤 Display Name: {test_data['display_name']}")
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
    
    print(f"\n📡 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Registration successful!")
        print(f"   User ID: {data['user_id']}")
        print(f"   Display Name: {data['display_name']}")
        print(f"   Avatar: {data['avatar_id']}")
        print(f"   New User: {data['is_new_user']}")
        return data['user_id'], test_email, test_data['password']
    else:
        print(f"❌ Registration failed: {response.text}")
        return None, None, None

def test_duplicate_registration(email):
    """Test registering with an existing email"""
    print("\n🔄 Testing Duplicate Registration")
    print("=" * 60)
    
    test_data = {
        "email": email,
        "password": "AnotherPassword123",
        "display_name": "Duplicate User"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
    
    print(f"📡 Response Status: {response.status_code}")
    
    if response.status_code == 409:
        print("✅ Correctly rejected duplicate email!")
        print(f"   Error: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.text}")

def test_weak_password():
    """Test registration with weak password"""
    print("\n🔒 Testing Weak Password Validation")
    print("=" * 60)
    
    weak_passwords = [
        ("short", "Too short"),
        ("alllowercase", "No uppercase"),
        ("ALLUPPERCASE", "No lowercase"),
        ("NoNumbers", "No numbers"),
        ("12345678", "No letters")
    ]
    
    for password, reason in weak_passwords:
        test_data = {
            "email": f"weak_test_{password}@example.com",
            "password": password,
            "display_name": "Weak Password Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
        
        if response.status_code == 400:
            print(f"✅ '{password}' rejected ({reason})")
            print(f"   Error: {response.json()['detail']}")
        else:
            print(f"❌ '{password}' unexpectedly accepted!")

def test_invalid_email():
    """Test registration with invalid email"""
    print("\n📧 Testing Email Validation")
    print("=" * 60)
    
    invalid_emails = [
        "notanemail",
        "@nodomain.com",
        "missing@",
        "spaces in@email.com"
    ]
    
    for email in invalid_emails:
        test_data = {
            "email": email,
            "password": "ValidPassword123",
            "display_name": "Invalid Email Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
        
        if response.status_code == 400:
            print(f"✅ '{email}' rejected")
        else:
            print(f"❌ '{email}' unexpectedly accepted!")

def test_session_migration():
    """Test session data migration during registration"""
    print("\n🔄 Testing Session Migration")
    print("=" * 60)
    
    # First create some session data
    session_id = f"reg_test_{datetime.now().timestamp()}"
    
    # Spend some energy as anonymous
    energy_response = requests.post(f"{BASE_URL}/api/economy/spend-energy", json={
        "activity_type": "quiz_start",
        "amount": 20,
        "session_id": session_id
    })
    
    if energy_response.status_code == 200:
        print(f"✅ Created session with activity")
        
        # Now register with that session
        test_data = {
            "email": f"migrate_test_{datetime.now().timestamp():.0f}@gmail.com",
            "password": "MigrateTest123",
            "display_name": "Migration Test",
            "session_id": session_id
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
        
        if reg_response.status_code == 200:
            data = reg_response.json()
            print(f"✅ Registration with migration successful!")
            print(f"   User ID: {data['user_id']}")
            print(f"   Data Migrated: {data['migrated_data']}")
            
            # Check if economy was migrated
            economy_response = requests.get(
                f"{BASE_URL}/api/economy/state",
                params={"user_id": data['user_id']}
            )
            
            if economy_response.status_code == 200:
                economy = economy_response.json()['state']
                print(f"   Energy: {economy['energy']} (should be 80 if migrated)")

def test_login(email, password):
    """Test user login"""
    print("\n🔐 Testing Login")
    print("=" * 60)
    
    # Test valid login
    login_data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    
    print(f"📡 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"   User ID: {data['user_id']}")
        print(f"   Display Name: {data['display_name']}")
        print(f"   Avatar: {data['avatar_id']}")
        print(f"   New User: {data['is_new_user']} (should be False)")
        return data['user_id']
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_invalid_login():
    """Test login with wrong credentials"""
    print("\n🚫 Testing Invalid Login")
    print("=" * 60)
    
    # Test wrong password
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "simple_test@gmail.com",
        "password": "WrongPassword123"
    })
    
    if response.status_code == 401:
        print(f"✅ Wrong password correctly rejected")
        print(f"   Error: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")
    
    # Test non-existent email
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "nonexistent@gmail.com",
        "password": "SomePassword123"
    })
    
    if response.status_code == 401:
        print(f"✅ Non-existent email correctly rejected")
        print(f"   Error: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")

def test_google_only_account():
    """Test login attempt on Google-only account"""
    print("\n🔗 Testing Google-Only Account")
    print("=" * 60)
    
    # Try to login with password on a Google auth account
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "deployment_test@gmail.com",  # This was created via Google auth
        "password": "SomePassword123"
    })
    
    if response.status_code == 401:
        print(f"✅ Google-only account correctly handled")
        print(f"   Error: {response.json()['detail']}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")

def main():
    """Run all registration and login tests"""
    print("=" * 60)
    print("📝 Email/Password Authentication Test Suite")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    
    # Test successful registration
    user_id, email, password = test_registration()
    
    if email:
        # Test duplicate registration
        test_duplicate_registration(email)
    
    # Test validation
    test_weak_password()
    test_invalid_email()
    
    # Test session migration
    test_session_migration()
    
    print("\n" + "=" * 60)
    print("✅ Registration tests completed!")
    print("=" * 60)
    
    # Now test login
    if email and password:
        print("\n🔑 Moving on to Login Tests...")
        
        # Test valid login
        login_user_id = test_login(email, password)
        
        if login_user_id:
            print(f"\n✅ User ID matches: {login_user_id == user_id}")
        
        # Test invalid logins
        test_invalid_login()
        
        # Test Google-only account
        test_google_only_account()
        
        print("\n" + "=" * 60)
        print("✅ All authentication tests completed!")
        print("=" * 60)

if __name__ == "__main__":
    main()
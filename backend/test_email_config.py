#!/usr/bin/env python3
"""
Test email configuration and send a test email
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after loading env vars
from email_service import email_service

def test_configuration():
    """Test email configuration"""
    print("🔍 Testing Email Configuration...")
    print("-" * 50)
    
    status = email_service.test_email_configuration()
    
    print(f"SMTP Server: {status['smtp_server']}")
    print(f"SMTP Port: {status['smtp_port']}")
    print(f"From Email: {status['from_email']}")
    print(f"Credentials Set: {'✅' if status['credentials_set'] else '❌'}")
    print(f"SES Verified: {'✅' if status['ses_verified'] else '❌'}")
    print(f"Fully Configured: {'✅' if status['configured'] else '❌'}")
    
    if status['error']:
        print(f"Error: {status['error']}")
    
    print("-" * 50)
    
    # Check environment variables
    print("\n📝 Environment Variables:")
    env_vars = [
        'EMAIL_HOST',
        'EMAIL_PORT',
        'EMAIL_USERNAME',
        'EMAIL_PASSWORD',
        'EMAIL_FROM',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION'
    ]
    
    for var in env_vars:
        value = os.getenv(var)
        if var in ['EMAIL_PASSWORD', 'AWS_SECRET_ACCESS_KEY']:
            # Mask sensitive values
            display_value = '***' if value else 'NOT SET'
        else:
            display_value = value if value else 'NOT SET'
        print(f"{var}: {display_value}")
    
    return status['configured']

def send_test_email(to_email: str):
    """Send a test email"""
    print(f"\n📧 Sending test email to {to_email}...")
    
    subject = "JazzyPop Email Configuration Test"
    html_body = """
    <h1>Test Email from JazzyPop</h1>
    <p>This is a test email to verify that your email configuration is working correctly.</p>
    <p>If you received this email, your AWS SES setup is complete! 🎉</p>
    <p>Best regards,<br>The JazzyPop Team</p>
    """
    text_body = "Test email from JazzyPop. If you received this, your email configuration is working!"
    
    success = email_service.send_email(to_email, subject, html_body, text_body)
    
    if success:
        print("✅ Test email sent successfully!")
    else:
        print("❌ Failed to send test email. Check your configuration and logs.")
    
    return success

def main():
    """Main test function"""
    print("🎮 JazzyPop Email Configuration Test")
    print("=" * 50)
    
    # Test configuration
    is_configured = test_configuration()
    
    if not is_configured:
        print("\n⚠️  Email service is not fully configured!")
        print("Please ensure:")
        print("1. All required environment variables are set in .env")
        print("2. Your domain/email is verified in AWS SES")
        print("3. You have valid SMTP credentials")
        return
    
    # Ask if user wants to send a test email
    print("\n" + "=" * 50)
    response = input("Would you like to send a test email? (y/n): ")
    
    if response.lower() == 'y':
        test_email = input("Enter email address to send test to: ")
        send_test_email(test_email)

if __name__ == "__main__":
    main()
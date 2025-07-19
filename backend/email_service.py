"""
Email Service Module for JazzyPop
Handles all email sending functionality using AWS SES
"""

import os
import boto3
from botocore.exceptions import ClientError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging
from typing import Optional, Dict, List
from jinja2 import Template

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        """Initialize email service with AWS SES configuration"""
        self.smtp_server = os.getenv('EMAIL_HOST', 'email-smtp.us-east-1.amazonaws.com')
        self.smtp_port = int(os.getenv('EMAIL_PORT', '587'))
        self.smtp_username = os.getenv('EMAIL_USERNAME')
        self.smtp_password = os.getenv('EMAIL_PASSWORD')
        self.from_email = os.getenv('EMAIL_FROM', 'JazzyPop <noreply@p0qp0q.com>')
        self.use_tls = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
        
        # Initialize SES client for API-based sending (alternative to SMTP)
        self.ses_client = boto3.client(
            'ses',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        # Base URL for links in emails
        self.frontend_url = os.getenv('FRONTEND_URL', 'https://p0qp0q.com')
        
    def send_email(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """
        Send an email using AWS SES
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML version of email body
            text_body: Plain text version (optional, will be generated from HTML if not provided)
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # Create the plain-text part if not provided
            if not text_body:
                # Simple HTML to text conversion (you might want to use html2text library)
                import re
                text_body = re.sub('<[^<]+?>', '', html_body)
            
            # Record the MIME parts
            part1 = MIMEText(text_body, 'plain')
            part2 = MIMEText(html_body, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Try to send using SES API first (more reliable)
            try:
                response = self.ses_client.send_raw_email(
                    Source=self.from_email,
                    Destinations=[to_email],
                    RawMessage={'Data': msg.as_string()}
                )
                logger.info(f"Email sent successfully to {to_email}. MessageId: {response['MessageId']}")
                return True
                
            except ClientError as e:
                logger.error(f"AWS SES API error: {e}")
                # Fall back to SMTP if API fails
                return self._send_via_smtp(to_email, msg)
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False
    
    def _send_via_smtp(self, to_email: str, msg: MIMEMultipart) -> bool:
        """Fallback method to send email via SMTP"""
        import smtplib
        
        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                logger.info(f"Email sent via SMTP to {to_email}")
                return True
        except Exception as e:
            logger.error(f"SMTP error sending to {to_email}: {str(e)}")
            return False
    
    def send_password_reset_email(self, to_email: str, user_name: str, reset_token: str) -> bool:
        """
        Send password reset email
        
        Args:
            to_email: User's email address
            user_name: User's display name
            reset_token: Secure reset token
            
        Returns:
            bool: True if sent successfully
        """
        reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 30px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎮 JazzyPop Password Reset</h1>
                </div>
                <div class="content">
                    <h2>Hi {{ user_name }}!</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{{ reset_link }}" class="button">Reset My Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">{{ reset_link }}</p>
                    
                    <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                    
                    <div class="footer">
                        <p>If you didn't request this password reset, you can safely ignore this email.</p>
                        <p>Need help? Contact us at support@p0qp0q.com</p>
                        <p>Happy learning!<br>The JazzyPop Team 🎉</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_template = """
        Hi {{ user_name }}!
        
        We received a request to reset your password for your JazzyPop account.
        
        Click this link to reset your password:
        {{ reset_link }}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this password reset, you can safely ignore this email.
        
        Need help? Contact us at support@p0qp0q.com
        
        Happy learning!
        The JazzyPop Team
        """
        
        # Render templates
        html_body = Template(html_template).render(user_name=user_name, reset_link=reset_link)
        text_body = Template(text_template).render(user_name=user_name, reset_link=reset_link)
        
        return self.send_email(to_email, "Reset Your JazzyPop Password", html_body, text_body)
    
    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """Send welcome email to new users"""
        # Generate a simple unsubscribe token (in production, use proper token generation)
        import hashlib
        unsubscribe_token = hashlib.sha256(f"{to_email}{user_name}".encode()).hexdigest()[:16]
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    color: #ffffff;
                    background-color: #131f24;
                    margin: 0;
                    padding: 0;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #131f24;
                }
                .header { 
                    background-color: #1f2c34; 
                    padding: 40px 30px;
                    text-align: center; 
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                }
                .chaos-logo {
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 20px;
                    background: #FF6B6B;
                    border-radius: 25% 75% 35% 65% / 55% 45% 55% 45%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 20px rgba(255, 107, 107, 0.4);
                }
                .chaos-text {
                    font-size: 42px;
                    font-weight: 900;
                    color: #131f24;
                    transform: rotate(-12deg);
                    letter-spacing: -2px;
                }
                .header h1 {
                    color: #ffffff;
                    font-size: 32px;
                    margin: 0;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .content { 
                    background-color: #131f24; 
                    padding: 40px 30px;
                }
                .content h2 {
                    color: #ffffff;
                    font-size: 24px;
                    margin: 0 0 20px 0;
                }
                .content p {
                    color: #afafaf;
                    font-size: 16px;
                    margin: 0 0 20px 0;
                }
                .features { 
                    background-color: #1f2c34; 
                    padding: 30px;
                    margin: 30px 0; 
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .features h3 {
                    color: #ffffff;
                    font-size: 20px;
                    margin: 0 0 20px 0;
                }
                .feature { 
                    padding: 12px 0;
                    color: #afafaf;
                    font-size: 16px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .feature:last-child {
                    border-bottom: none;
                }
                .feature strong {
                    color: #ffffff;
                }
                .button-container {
                    text-align: center;
                    margin: 40px 0;
                }
                .button { 
                    display: inline-block; 
                    padding: 16px 40px; 
                    background-color: #58cc02;
                    color: #ffffff; 
                    text-decoration: none; 
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                .button:hover {
                    background-color: #4aa002;
                }
                .footer {
                    padding: 30px;
                    text-align: center;
                    color: #7c7c7c;
                    font-size: 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .footer a {
                    color: #58cc02;
                    text-decoration: none;
                }
                .logo-text {
                    color: #58cc02;
                    font-weight: 700;
                }
                /* Mobile responsiveness */
                @media (max-width: 600px) {
                    .header { padding: 30px 20px; }
                    .content { padding: 30px 20px; }
                    .features { padding: 20px; }
                    .header h1 { font-size: 28px; }
                    .button { padding: 14px 30px; font-size: 16px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="chaos-logo">
                        <div class="chaos-text">!?</div>
                    </div>
                    <h1>Welcome to <span class="logo-text">JazzyPop</span>!</h1>
                </div>
                <div class="content">
                    <h2>Hi {{ user_name }}!</h2>
                    <p>You've just joined the most exciting quiz adventure on the web! Get ready to test your knowledge, challenge your friends, and climb the leaderboards.</p>
                    
                    <div class="features">
                        <h3>Your Starting Inventory:</h3>
                        <div class="feature"><strong>100 Energy</strong> - Play quizzes and earn rewards</div>
                        <div class="feature"><strong>100 Coins</strong> - Your starting currency</div>
                        <div class="feature"><strong>5 Lives</strong> - Keep playing even when you miss</div>
                        <div class="feature"><strong>Level 1</strong> - Begin your journey to quiz mastery</div>
                    </div>
                    
                    <div class="features">
                        <h3>Game Modes to Explore:</h3>
                        <div class="feature"><strong>Standard Mode</strong> - Classic quiz experience</div>
                        <div class="feature"><strong>Chaos Mode</strong> - Wild and unpredictable questions</div>
                        <div class="feature"><strong>Speed Mode</strong> - Race against the clock</div>
                        <div class="feature"><strong>Zen Mode</strong> - Relaxed learning without pressure</div>
                    </div>
                    
                    <div class="button-container">
                        <a href="{{ frontend_url }}" class="button">Start Playing Now</a>
                    </div>
                    
                    <p>Need help? Check out our <a href="{{ frontend_url }}/help" style="color: #58cc02;">Getting Started Guide</a> or reply to this email.</p>
                </div>
                <div class="footer">
                    <p>Happy quizzing!<br>The <span class="logo-text">JazzyPop</span> Team</p>
                    <p style="margin-top: 20px; font-size: 12px; color: #6c757d;">
                        <a href="{{ frontend_url }}/TOS/terms-of-service.html">Terms of Service</a> | 
                        <a href="{{ frontend_url }}/TOS/privacy-policy.html">Privacy Policy</a>
                    </p>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                        <p style="font-size: 12px; color: #6c757d; line-height: 1.6;">
                            You received this email because you created an account at JazzyPop with this email address.<br>
                            If you believe you received this message in error or did not create this account, 
                            please <a href="{{ frontend_url }}/support" style="color: #58cc02;">contact support</a> immediately.
                        </p>
                        <p style="font-size: 12px; color: #6c757d; margin-top: 10px;">
                            <a href="{{ frontend_url }}/settings#email-preferences" style="color: #7c7c7c;">Manage Email Preferences</a> | 
                            <a href="{{ frontend_url }}/unsubscribe?email={{ email }}&token={{ unsubscribe_token }}" style="color: #7c7c7c;">Unsubscribe</a> | 
                            <a href="{{ frontend_url }}/settings#delete-account" style="color: #7c7c7c;">Delete Account</a>
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        html_body = Template(html_template).render(
            user_name=user_name, 
            frontend_url=self.frontend_url,
            email=to_email,
            unsubscribe_token=unsubscribe_token
        )
        
        text_body = f"""Welcome to JazzyPop, {user_name}!

You've just joined the most exciting quiz adventure on the web!

Your Starting Inventory:
- 100 Energy
- 100 Coins  
- 5 Lives
- Level 1

Start playing at: {self.frontend_url}

---
You received this email because you created an account at JazzyPop.
If you believe this was in error, please contact support.

Manage preferences: {self.frontend_url}/settings#email-preferences
Unsubscribe: {self.frontend_url}/unsubscribe?email={to_email}&token={unsubscribe_token}
Delete account: {self.frontend_url}/settings#delete-account
"""
        
        return self.send_email(to_email, "Welcome to JazzyPop! 🎉", html_body, text_body)
    
    def test_email_configuration(self) -> Dict[str, any]:
        """Test email configuration and return status"""
        status = {
            'configured': False,
            'smtp_server': self.smtp_server,
            'smtp_port': self.smtp_port,
            'from_email': self.from_email,
            'credentials_set': bool(self.smtp_username and self.smtp_password),
            'ses_verified': False,
            'error': None
        }
        
        try:
            # Check SES verification status
            response = self.ses_client.get_identity_verification_attributes(
                Identities=[self.from_email.split('<')[-1].strip('>')]
            )
            if response['VerificationAttributes']:
                status['ses_verified'] = list(response['VerificationAttributes'].values())[0].get('VerificationStatus') == 'Success'
            
            status['configured'] = status['credentials_set'] and status['ses_verified']
            
        except Exception as e:
            status['error'] = str(e)
            
        return status

# Singleton instance
email_service = EmailService()
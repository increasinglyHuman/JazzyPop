"""
Email Service Module for JazzyPop - Updated Welcome Email
"""

def get_updated_welcome_email_template():
    """Returns the updated welcome email template with JazzyPop dark theme"""
    return """
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
            .chaos-bot {
                width: 120px;
                height: 120px;
                margin: 0 auto 20px;
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
                <img src="https://p0qp0q.com/src/images/chaos-bot.svg" alt="JazzyPop Chaos Bot" class="chaos-bot" />
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

# Example of how to integrate this into email_service.py:
# Replace the send_welcome_email method's html_template with get_updated_welcome_email_template()
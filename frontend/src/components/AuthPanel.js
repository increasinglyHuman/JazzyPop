/**
 * AuthPanel.js
 * Unified authentication panel for email/password and Google sign-in
 */

class AuthPanel {
    constructor() {
        this.API_URL = window.API_URL || 'https://p0qp0q.com';
        this.mode = 'login'; // 'login' or 'register'
        this.currentUserId = localStorage.getItem('userId');
        this.sessionId = localStorage.getItem('sessionId') || this.generateSessionId();
        
        // Store session ID for anonymous play
        if (!localStorage.getItem('sessionId')) {
            localStorage.setItem('sessionId', this.sessionId);
        }
        
        console.log('AuthPanel initialized with API URL:', this.API_URL);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async handleEmailAuth(email, password, displayName = null) {
        try {
            const endpoint = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = this.mode === 'login' 
                ? { email, password }
                : { email, password, display_name: displayName, session_id: this.sessionId };

            console.log('Sending auth request to:', `${this.API_URL}${endpoint}`);
            // Don't log request body - it contains passwords!

            const response = await fetch(`${this.API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            // Success! Store user data
            this.handleAuthSuccess(data);
            return { success: true, data };

        } catch (error) {
            console.error('Auth error:', error);
            console.error('Full error details:', error.stack);
            return { success: false, error: error.message };
        }
    }

    async handleGoogleAuth(googleResponse) {
        try {
            // Decode the Google JWT to get user info
            const credential = googleResponse.credential;
            const decodedToken = JSON.parse(atob(credential.split('.')[1]));
            
            const response = await fetch(`${this.API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    google_id: decodedToken.sub,
                    email: decodedToken.email,
                    name: decodedToken.name,
                    picture: decodedToken.picture,
                    session_id: this.sessionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Google authentication failed');
            }

            this.handleAuthSuccess(data);
            return { success: true, data };

        } catch (error) {
            console.error('Google auth error:', error);
            return { success: false, error: error.message };
        }
    }

    handleAuthSuccess(authData) {
        // Store user information
        localStorage.setItem('userId', authData.user_id);
        localStorage.setItem('displayName', authData.display_name);
        localStorage.setItem('avatarId', authData.avatar_id);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Update UI
        this.updateProfileDisplay();
        
        // Update auth status in dashboard
        if (window.checkAuthStatus) {
            window.checkAuthStatus();
        }
        
        // Update username display
        if (window.updateUserInfo) {
            window.updateUserInfo();
        }
        
        // Economy manager will pick up the new userId from localStorage
        // on the next API call since we just stored it above

        // Show success message
        if (authData.migrated_data) {
            this.showMessage('Welcome! Your progress has been saved to your account.', 'success');
        } else if (authData.is_new_user) {
            this.showMessage('Welcome to JazzyPop! Your account has been created.', 'success');
        } else {
            this.showMessage('Welcome back!', 'success');
        }

        // Close auth panel after short delay
        setTimeout(() => this.close(), 1500);
    }

    updateProfileDisplay() {
        const displayName = localStorage.getItem('displayName') || 'Anonymous Player';
        const nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay) {
            nameDisplay.textContent = displayName;
        }
    }

    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            messageEl.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3000);
            }
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain an uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain a lowercase letter' };
        }
        if (!/\d/.test(password)) {
            return { valid: false, message: 'Password must contain a number' };
        }
        return { valid: true };
    }

    switchMode(newMode) {
        this.mode = newMode;
        console.log('Switching to mode:', newMode);
        this.updateUI();
    }

    updateUI() {
        // Update form visibility
        const loginSection = document.querySelector('.auth-login-section');
        const registerSection = document.querySelector('.auth-register-section');
        const forgotSection = document.querySelector('.auth-forgot-section');
        
        console.log('UpdateUI - Found sections:', {
            login: !!loginSection,
            register: !!registerSection,
            forgot: !!forgotSection,
            mode: this.mode
        });
        
        if (this.mode === 'login') {
            loginSection?.classList.add('active');
            registerSection?.classList.remove('active');
            forgotSection?.classList.remove('active');
        } else if (this.mode === 'register') {
            loginSection?.classList.remove('active');
            registerSection?.classList.add('active');
            forgotSection?.classList.remove('active');
            console.log('Register section classes:', registerSection?.className);
        } else if (this.mode === 'forgot') {
            loginSection?.classList.remove('active');
            registerSection?.classList.remove('active');
            forgotSection?.classList.add('active');
        }

        // Clear any error messages
        this.showMessage('', 'info');
    }

    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${this.API_URL}/api/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error('Failed to send reset email');
            }

            this.showMessage('Password reset email sent! Check your inbox.', 'success');
            setTimeout(() => this.switchMode('login'), 3000);

        } catch (error) {
            this.showMessage('Error sending reset email. Please try again.', 'error');
        }
    }

    open() {
        const overlay = document.getElementById('authPanelOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.updateUI();
        }
    }

    close() {
        const overlay = document.getElementById('authPanelOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    init() {
        // Initialize Google Sign-In
        if (window.google) {
            google.accounts.id.initialize({
                client_id: '482342615637-jfht0gsdc4lm58fe8b3v6t60pg7lubhe.apps.googleusercontent.com',
                callback: (response) => this.handleGoogleAuth(response)
            });

            google.accounts.id.renderButton(
                document.getElementById('googleSignInButton'),
                { 
                    theme: 'outline', 
                    size: 'large',
                    text: 'signin_with',
                    width: '100%'
                }
            );
        }

        // Bind form events
        this.bindEvents();
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                const result = await this.handleEmailAuth(email, password);
                if (!result.success) {
                    this.showMessage(result.error, 'error');
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const displayName = document.getElementById('registerName').value;
                
                console.log('Register form submitted:', { email, displayName });
                
                // Check if fields are empty
                if (!email || !password || !displayName) {
                    this.showMessage('Please fill in all fields', 'error');
                    return;
                }
                
                // Validate
                if (!this.validateEmail(email)) {
                    this.showMessage('Please enter a valid email', 'error');
                    return;
                }
                
                const passwordCheck = this.validatePassword(password);
                if (!passwordCheck.valid) {
                    this.showMessage(passwordCheck.message, 'error');
                    return;
                }
                
                this.showMessage('Creating account...', 'info');
                
                const result = await this.handleEmailAuth(email, password, displayName);
                if (!result.success) {
                    this.showMessage(result.error, 'error');
                }
            });
        }

        // Mode switchers
        console.log('Binding mode switchers...');
        document.querySelectorAll('[data-auth-mode]').forEach(el => {
            console.log('Found mode switcher:', el.dataset.authMode);
            el.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Mode switch clicked:', el.dataset.authMode);
                this.switchMode(el.dataset.authMode);
            });
        });

        // Close button
        const closeBtn = document.querySelector('.auth-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authPanel = new AuthPanel();
        window.authPanel.init();
    });
} else {
    window.authPanel = new AuthPanel();
    window.authPanel.init();
}
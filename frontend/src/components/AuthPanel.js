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

    async handleEmailAuth(email, password, displayName = null, birthdate = null) {
        try {
            const endpoint = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = this.mode === 'login' 
                ? { email, password }
                : { 
                    email, 
                    password, 
                    display_name: displayName, 
                    birthdate: birthdate,
                    terms_accepted: true,
                    session_id: this.sessionId 
                  };

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
        
        // Check if this is a Google user who needs age verification
        if (authData.needs_age_verification) {
            // Show age verification modal
            setTimeout(() => {
                this.close();
                if (window.ageVerificationModal) {
                    window.ageVerificationModal.show(authData.user_id, () => {
                        // After verification, continue with normal flow
                        this.completeAuthSuccess(authData);
                    });
                }
            }, 500);
            return;
        }
        
        // Normal flow for users with age already verified
        this.completeAuthSuccess(authData);
    }
    
    completeAuthSuccess(authData) {
        // Check if this is a new user who needs profile setup
        if (authData.is_new_user && window.profileEditModal) {
            // Close auth panel first
            this.close();
            
            // Show profile setup modal
            setTimeout(() => {
                window.profileEditModal.show(
                    authData.user_id,
                    {
                        display_name: authData.display_name,
                        avatar_id: authData.avatar_id
                    },
                    (profile) => {
                        // Profile saved, continue with normal flow
                        this.finalizeAuth(authData, profile);
                    },
                    true // isNewUser flag
                );
            }, 500);
            return;
        }
        
        // Normal flow for existing users
        this.finalizeAuth(authData);
    }
    
    finalizeAuth(authData, updatedProfile = null) {
        // Use updated profile if provided, otherwise use auth data
        const profile = updatedProfile || authData;
        
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
            this.showMessage(`Welcome to JazzyPop, ${profile.display_name}!`, 'success');
        } else {
            this.showMessage(`Welcome back, ${profile.display_name}!`, 'success');
        }

        // Close auth panel after short delay if still open
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

    async logout() {
        try {
            const userId = localStorage.getItem('userId');
            const sessionId = localStorage.getItem('sessionId');
            
            // Call backend logout endpoint
            await fetch(`${this.API_URL}/api/auth/logout?user_id=${userId}&session_id=${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            // Clear all auth data from localStorage
            const authKeys = ['userId', 'displayName', 'avatarId', 'isAuthenticated', 
                             'googleId', 'userEmail', 'userName', 'isGoogleUser'];
            authKeys.forEach(key => localStorage.removeItem(key));
            
            // Reset to anonymous session
            this.currentUserId = null;
            this.sessionId = this.generateSessionId();
            localStorage.setItem('sessionId', this.sessionId);
            
            // Update UI
            this.updateProfileDisplay();
            
            // Update auth status in dashboard
            if (window.checkAuthStatus) {
                window.checkAuthStatus();
            }
            
            // Show success message
            this.showMessage('Logged out successfully', 'success');
            
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            // Even if backend fails, clear local data
            this.clearLocalAuth();
            window.location.reload();
        }
    }

    clearLocalAuth() {
        // Helper to clear all auth data
        const authKeys = ['userId', 'displayName', 'avatarId', 'isAuthenticated', 
                         'googleId', 'userEmail', 'userName', 'isGoogleUser'];
        authKeys.forEach(key => localStorage.removeItem(key));
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
                document.getElementById('googleSignInDiv'),
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

    setMaxBirthdate() {
        // Set max date to 13 years ago from today
        const birthdateInput = document.getElementById('registerBirthdate');
        if (birthdateInput) {
            const today = new Date();
            const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
            const maxDateStr = maxDate.toISOString().split('T')[0];
            birthdateInput.setAttribute('max', maxDateStr);
        }
    }

    bindEvents() {
        // Set max birthdate for age verification
        this.setMaxBirthdate();
        
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
                const birthdate = document.getElementById('registerBirthdate').value;
                const termsAccepted = document.getElementById('registerTerms').checked;
                
                console.log('Register form submitted:', { email, displayName, birthdate });
                
                // Check if fields are empty
                if (!email || !password || !displayName || !birthdate) {
                    this.showMessage('Please fill in all fields', 'error');
                    return;
                }
                
                // Check terms acceptance
                if (!termsAccepted) {
                    this.showMessage('You must accept the terms of service', 'error');
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
                
                const result = await this.handleEmailAuth(email, password, displayName, birthdate);
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
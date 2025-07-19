/**
 * AgeVerificationModal.js
 * Modal for age verification after Google sign-in
 */

class AgeVerificationModal {
    constructor() {
        this.modal = null;
        this.userId = null;
        this.onVerified = null;
        this.API_URL = window.API_URL || 'https://p0qp0q.com';
        this.createModal();
    }

    createModal() {
        // Create modal HTML
        const modalHtml = `
            <div class="age-verification-overlay" id="ageVerificationOverlay" style="display: none;">
                <div class="age-verification-modal">
                    <div class="age-verification-header">
                        <h3>Welcome to JazzyPop!</h3>
                        <p>We need to verify your age to continue</p>
                    </div>
                    
                    <div class="age-verification-content">
                        <p class="age-requirement">You must be 13 or older to use JazzyPop</p>
                        
                        <form id="ageVerificationForm" onsubmit="return false;">
                            <div class="field-group">
                                <label for="verifyBirthdate">Date of Birth</label>
                                <input 
                                    type="date" 
                                    id="verifyBirthdate" 
                                    required 
                                    max=""
                                />
                                <small class="age-hint">We use this to ensure age-appropriate content</small>
                            </div>
                            
                            <div class="field-group checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="verifyTerms" required />
                                    <span>I confirm I am 13 years or older and agree to the 
                                        <a href="/TOS/terms-of-service.html" target="_blank">Terms of Service</a> 
                                        and 
                                        <a href="/TOS/privacy-policy.html" target="_blank">Privacy Policy</a>
                                    </span>
                                </label>
                            </div>
                            
                            <div class="button-group">
                                <button type="submit" class="verify-btn">Verify Age</button>
                                <button type="button" class="cancel-btn" onclick="ageVerificationModal.cancel()">Cancel</button>
                            </div>
                        </form>
                        
                        <div id="ageVerificationMessage" class="age-message" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);

        this.modal = document.getElementById('ageVerificationOverlay');
        
        // Set max date to 13 years ago
        this.setMaxBirthdate();
        
        // Bind form submission
        const form = document.getElementById('ageVerificationForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setMaxBirthdate() {
        const birthdateInput = document.getElementById('verifyBirthdate');
        if (birthdateInput) {
            const today = new Date();
            const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
            const maxDateStr = maxDate.toISOString().split('T')[0];
            birthdateInput.setAttribute('max', maxDateStr);
        }
    }

    show(userId, onVerified) {
        this.userId = userId;
        this.onVerified = onVerified;
        if (this.modal) {
            this.modal.style.display = 'flex';
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('ageVerificationMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `age-message ${type}`;
            messageEl.style.display = 'block';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const birthdate = document.getElementById('verifyBirthdate').value;
        const termsAccepted = document.getElementById('verifyTerms').checked;
        
        if (!birthdate) {
            this.showMessage('Please enter your date of birth', 'error');
            return;
        }
        
        if (!termsAccepted) {
            this.showMessage('You must accept the terms of service', 'error');
            return;
        }
        
        // Verify age (13+)
        const birthdateObj = new Date(birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthdateObj.getFullYear();
        const monthDiff = today.getMonth() - birthdateObj.getMonth();
        const dayDiff = today.getDate() - birthdateObj.getDate();
        
        const actualAge = monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0) ? age : age - 1;
        
        if (actualAge < 13) {
            this.showMessage('You must be 13 or older to use JazzyPop', 'error');
            setTimeout(() => {
                this.cancel();
            }, 3000);
            return;
        }
        
        try {
            // Update user profile with birthdate
            const response = await fetch(`${this.API_URL}/api/users/${this.userId}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ birthdate: birthdate })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            
            // Success!
            localStorage.setItem('ageVerified', 'true');
            this.showMessage('Age verified successfully!', 'success');
            
            setTimeout(() => {
                this.hide();
                if (this.onVerified) {
                    this.onVerified();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Age verification error:', error);
            this.showMessage('Error verifying age. Please try again.', 'error');
        }
    }

    cancel() {
        // User canceled - log them out
        this.hide();
        if (window.authPanel) {
            window.authPanel.logout();
        }
    }
}

// Create global instance
window.ageVerificationModal = new AgeVerificationModal();
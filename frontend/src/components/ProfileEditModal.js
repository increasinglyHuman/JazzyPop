class ProfileEditModal {
    constructor() {
        this.API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8000' 
            : 'https://p0qp0q.com';
        
        this.avatarOptions = [
            'goggle-boy', 'alien-boy', 'three-eye-boy', 'cyclops-boy',
            'goggle-girl', 'alien-girl', 'three-eye-girl', 'cyclops-girl'
        ];
        
        this.selectedAvatar = null;
        this.userId = null;
        this.onComplete = null;
        this.isNewUser = false;
    }
    
    show(userId, currentProfile = {}, onComplete = null, isNewUser = false) {
        this.userId = userId;
        this.onComplete = onComplete;
        this.isNewUser = isNewUser;
        this.selectedAvatar = currentProfile.avatar_id || this.avatarOptions[0];
        
        // Remove any existing modal
        const existingModal = document.getElementById('profileEditModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal HTML
        const modalHtml = `
            <div id="profileEditModal" class="profile-edit-modal-overlay">
                <div class="profile-edit-modal">
                    <button class="profile-edit-close" onclick="window.profileEditModal.close()">×</button>
                    
                    <h2>${isNewUser ? 'Set Up Your Profile!' : 'Edit Profile'}</h2>
                    ${isNewUser ? '<p class="profile-subtitle">Choose your nickname and avatar</p>' : ''}
                    
                    <div class="profile-form">
                        <div class="nickname-section">
                            <label for="nicknameInput">Nickname</label>
                            <input 
                                type="text" 
                                id="nicknameInput" 
                                class="nickname-input"
                                placeholder="Enter your nickname"
                                value="${currentProfile.display_name || ''}"
                                maxlength="20"
                            />
                            <small class="nickname-hint">3-20 characters</small>
                        </div>
                        
                        <div class="avatar-section">
                            <label>Choose Your Avatar</label>
                            <div class="avatar-grid">
                                ${this.avatarOptions.map(avatar => `
                                    <div class="avatar-option ${avatar === this.selectedAvatar ? 'selected' : ''}" 
                                         data-avatar="${avatar}"
                                         onclick="window.profileEditModal.selectAvatar('${avatar}')">
                                        <img src="./src/images/profile-bots/${avatar}.svg" 
                                             alt="${avatar}" 
                                             class="avatar-image" />
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="profile-actions">
                            ${!isNewUser ? '<button class="profile-cancel-btn" onclick="window.profileEditModal.close()">Cancel</button>' : ''}
                            <button class="profile-save-btn" onclick="window.profileEditModal.save()">
                                ${isNewUser ? 'Start Playing!' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                    
                    <div class="profile-message" id="profileMessage"></div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Focus on nickname input
        setTimeout(() => {
            document.getElementById('nicknameInput').focus();
        }, 100);
    }
    
    selectAvatar(avatarId) {
        // Remove selected class from all
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selected class to clicked avatar
        document.querySelector(`[data-avatar="${avatarId}"]`).classList.add('selected');
        this.selectedAvatar = avatarId;
    }
    
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('profileMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `profile-message ${type}`;
            messageEl.style.display = 'block';
        }
    }
    
    async save() {
        const nicknameInput = document.getElementById('nicknameInput');
        const nickname = nicknameInput.value.trim();
        
        // Validate nickname
        if (nickname.length < 3 || nickname.length > 20) {
            this.showMessage('Nickname must be 3-20 characters', 'error');
            nicknameInput.focus();
            return;
        }
        
        // Validate appropriate content
        const inappropriateWords = ['admin', 'mod', 'staff', 'jazzypop'];
        if (inappropriateWords.some(word => nickname.toLowerCase().includes(word))) {
            this.showMessage('Please choose a different nickname', 'error');
            return;
        }
        
        try {
            this.showMessage('Saving...', 'info');
            
            // Update profile via API
            const response = await fetch(`${this.API_URL}/api/users/${this.userId}/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    display_name: nickname,
                    avatar_id: this.selectedAvatar
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update profile');
            }
            
            // Update local storage
            localStorage.setItem('displayName', nickname);
            localStorage.setItem('avatarId', this.selectedAvatar);
            
            // Update UI elements
            const profileNameEl = document.querySelector('.profile-name');
            if (profileNameEl) {
                profileNameEl.textContent = nickname;
            }
            
            const profileAvatarEl = document.querySelector('.profile-avatar img');
            if (profileAvatarEl) {
                profileAvatarEl.src = `./src/images/profile-bots/${this.selectedAvatar}.svg`;
            }
            
            // Close modal
            this.close();
            
            // Call completion callback
            if (this.onComplete) {
                this.onComplete({
                    display_name: nickname,
                    avatar_id: this.selectedAvatar
                });
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showMessage(error.message || 'Failed to save profile', 'error');
        }
    }
    
    close() {
        const modal = document.getElementById('profileEditModal');
        if (modal) {
            modal.remove();
        }
        
        // If this was a new user and they closed without saving, log them out
        if (this.isNewUser) {
            console.warn('New user closed profile setup without saving');
            // Could trigger logout here if desired
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.profileEditModal = new ProfileEditModal();
    });
} else {
    window.profileEditModal = new ProfileEditModal();
}
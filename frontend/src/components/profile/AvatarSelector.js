/**
 * Avatar Selector Component
 * Allows users to select their profile bot avatar
 */

export class AvatarSelector {
    constructor(container, options = {}) {
        this.container = container;
        this.selectedAvatar = options.currentAvatar || 'bot-default-anon';
        this.onSelect = options.onSelect || (() => {});
        this.unlockedAvatars = new Set(options.unlockedAvatars || ['bot-default-anon']);
        
        // Avatar categories with display info
        this.categories = {
            default: {
                name: 'Default',
                avatars: ['bot-default-anon'],
                icon: '🤖'
            },
            emotion: {
                name: 'Emotions',
                avatars: ['bot-happy', 'bot-angry', 'bot-shy', 'bot-shocked', 'bot-crying'],
                icon: '😊'
            },
            style: {
                name: 'Styles',
                avatars: ['bot-mustache', 'bot-beard', 'bot-eyelash', 'bot-lady-red', 'bot-lady-pink'],
                icon: '✨'
            },
            special: {
                name: 'Special',
                avatars: ['bot-star-eyes', 'bot-heart-eyes', 'bot-money-eyes', 'bot-dizzy', 'bot-tongue'],
                icon: '⭐'
            },
            unlockable: {
                name: 'Achievements',
                avatars: ['bot-gold-league', 'bot-fire-streak', 'bot-night-owl', 'bot-speed-demon', 'bot-perfect-score'],
                icon: '🏆'
            }
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="avatar-selector">
                <div class="avatar-selector-header">
                    <h3>Choose Your Bot</h3>
                    <button class="close-btn" aria-label="Close">✕</button>
                </div>
                
                <div class="current-avatar">
                    <img src="./src/images/profile-bots/${this.selectedAvatar}.svg" 
                         alt="Current avatar" 
                         class="current-avatar-img">
                    <p class="current-avatar-name">${this.getAvatarName(this.selectedAvatar)}</p>
                </div>
                
                <div class="category-tabs">
                    ${Object.entries(this.categories).map(([key, cat]) => `
                        <button class="category-tab" data-category="${key}">
                            <span class="tab-icon">${cat.icon}</span>
                            <span class="tab-name">${cat.name}</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="avatar-grid">
                    ${this.renderAvatarGrid('default')}
                </div>
                
                <div class="selector-footer">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-confirm">Confirm</button>
                </div>
            </div>
        `;
    }
    
    renderAvatarGrid(categoryKey) {
        const category = this.categories[categoryKey];
        if (!category) return '';
        
        return category.avatars.map(avatarId => {
            const isUnlocked = this.unlockedAvatars.has(avatarId);
            const isSelected = this.selectedAvatar === avatarId;
            const unlockInfo = this.getUnlockRequirement(avatarId);
            
            // For missing avatars, use a placeholder
            const imagePath = this.getAvatarImagePath(avatarId);
            
            return `
                <div class="avatar-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}"
                     data-avatar-id="${avatarId}">
                    <div class="avatar-image-wrapper">
                        <img src="${imagePath}" 
                             alt="${this.getAvatarName(avatarId)}"
                             class="avatar-image"
                             onerror="this.src='./src/images/profile-bots/bot-default-anon.svg'">
                        ${!isUnlocked ? `
                            <div class="lock-overlay">
                                <span class="lock-icon">🔒</span>
                                <span class="unlock-hint">${unlockInfo}</span>
                            </div>
                        ` : ''}
                        ${isSelected ? '<div class="selected-indicator">✓</div>' : ''}
                    </div>
                    <p class="avatar-name">${this.getAvatarName(avatarId)}</p>
                </div>
            `;
        }).join('');
    }
    
    getAvatarImagePath(avatarId) {
        // Map avatar IDs to actual file names
        const mapping = {
            'bot-default-anon': 'p0qp0q-clean',  // Use existing p0qp0q as default
            'bot-happy': 'bot-happy-1',
            'bot-angry': 'bot-angry-1',
            'bot-shy': 'bot-shy-1',
            'bot-shocked': 'bot-shocked-1',
            'bot-crying': 'bot-crying-1',
            'bot-mustache': 'bot-mustache-1',
            'bot-beard': 'bot-beard-1',
            'bot-eyelash': 'bot-eyelash-1',
            'bot-lady-red': 'bot-lady-red-1',
            'bot-lady-pink': 'bot-lady-pink-1',
            'bot-star-eyes': 'bot-star-eyes-1',
            'bot-heart-eyes': 'bot-heart-eyes-1',
            'bot-money-eyes': 'bot-money-eyes-1',
            'bot-dizzy': 'bot-dizzy-1',
            'bot-tongue': 'bot-tongue-1'
        };
        
        const filename = mapping[avatarId] || avatarId;
        return `./src/images/profile-bots/${filename}.svg`;
    }
    
    getAvatarName(avatarId) {
        const names = {
            'bot-default-anon': 'Anonymous Bot',
            'bot-happy': 'Happy Bot',
            'bot-angry': 'Angry Bot',
            'bot-shy': 'Shy Bot',
            'bot-shocked': 'Shocked Bot',
            'bot-crying': 'Crying Bot',
            'bot-mustache': 'Mustache Bot',
            'bot-beard': 'Beard Bot',
            'bot-eyelash': 'Eyelash Bot',
            'bot-lady-red': 'Red Lipstick Bot',
            'bot-lady-pink': 'Pink Lipstick Bot',
            'bot-star-eyes': 'Star Eyes Bot',
            'bot-heart-eyes': 'Heart Eyes Bot',
            'bot-money-eyes': 'Money Eyes Bot',
            'bot-dizzy': 'Dizzy Bot',
            'bot-tongue': 'Tongue Bot',
            'bot-gold-league': 'Gold League Bot',
            'bot-fire-streak': 'Fire Streak Bot',
            'bot-night-owl': 'Night Owl Bot',
            'bot-speed-demon': 'Speed Demon Bot',
            'bot-perfect-score': 'Perfect Score Bot'
        };
        
        return names[avatarId] || avatarId;
    }
    
    getUnlockRequirement(avatarId) {
        const requirements = {
            'bot-gold-league': 'Reach Gold League',
            'bot-fire-streak': '30 Day Streak',
            'bot-night-owl': '50 Night Quizzes',
            'bot-speed-demon': 'Perfect Speed Run',
            'bot-perfect-score': '10 Perfect Scores'
        };
        
        return requirements[avatarId] || 'Complete achievement';
    }
    
    attachEventListeners() {
        // Category tab switching
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.category-tab')) {
                const tab = e.target.closest('.category-tab');
                const category = tab.dataset.category;
                this.switchCategory(category);
            }
            
            // Avatar selection
            if (e.target.closest('.avatar-item')) {
                const item = e.target.closest('.avatar-item');
                const avatarId = item.dataset.avatarId;
                if (this.unlockedAvatars.has(avatarId)) {
                    this.selectAvatar(avatarId);
                } else {
                    this.showLockMessage(avatarId);
                }
            }
            
            // Close button
            if (e.target.closest('.close-btn') || e.target.closest('.btn-cancel')) {
                this.close();
            }
            
            // Confirm button
            if (e.target.closest('.btn-confirm')) {
                this.confirm();
            }
        });
    }
    
    switchCategory(category) {
        // Update active tab
        this.container.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Update grid
        const grid = this.container.querySelector('.avatar-grid');
        grid.innerHTML = this.renderAvatarGrid(category);
    }
    
    selectAvatar(avatarId) {
        this.selectedAvatar = avatarId;
        
        // Update current avatar display
        const currentImg = this.container.querySelector('.current-avatar-img');
        const currentName = this.container.querySelector('.current-avatar-name');
        currentImg.src = this.getAvatarImagePath(avatarId);
        currentName.textContent = this.getAvatarName(avatarId);
        
        // Update grid selection
        this.container.querySelectorAll('.avatar-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.avatarId === avatarId);
        });
    }
    
    showLockMessage(avatarId) {
        const requirement = this.getUnlockRequirement(avatarId);
        // Could show a toast or modal here
        console.log(`This avatar requires: ${requirement}`);
    }
    
    confirm() {
        this.onSelect(this.selectedAvatar);
        this.close();
    }
    
    close() {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
    
    // Method to unlock new avatars
    unlockAvatar(avatarId) {
        this.unlockedAvatars.add(avatarId);
        // Re-render if this category is currently shown
        const activeTab = this.container.querySelector('.category-tab.active');
        if (activeTab) {
            this.switchCategory(activeTab.dataset.category);
        }
    }
}
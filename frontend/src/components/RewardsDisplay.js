/**
 * RewardsDisplay.js
 * 
 * A reusable component for displaying reward animations with slot machine effect
 * Can be used by QuizModal, FlashcardModal, or any other component that awards rewards
 * 
 * INTEGRATION NOTES:
 * 
 * 1. BACKEND REQUIREMENTS:
 *    - Endpoint for processing rewards: POST /api/economy/process-rewards
 *    - Should accept: { userId, activityType, activityData }
 *    - Should return: { rewards: { coins, keys, tickets, xp, hearts, diamonds, gems... }, bonuses: {...} }
 *    - Backend should handle:
 *      - Multiplier calculations (daily bonuses, streaks, etc.)
 *      - Gift box rewards (random bundles)
 *      - Special event bonuses
 *      - Inventory updates and persistence
 *      - Achievement tracking
 * 
 * 2. ECONOMY MANAGER INTEGRATION:
 *    - This component should work with EconomyManager for consistency
 *    - EconomyManager should expose methods like:
 *      - processQuizComplete(quizData) => returns rewards object
 *      - processFlashcardComplete(flashcardData) => returns rewards object
 *      - processBonusEvent(eventType, data) => returns rewards object
 * 
 * 3. USAGE ACROSS GAME:
 *    - QuizModal: Show after quiz completion
 *    - FlashcardModal: Show in results screen
 *    - Daily Login: Show daily bonus rewards
 *    - Achievement Unlocks: Show achievement rewards
 *    - Special Events: Show event rewards
 *    - Purchase Confirmations: Show purchased items
 * 
 * 4. REWARD TYPES SUPPORTED:
 *    - Currency: coins, keys, tickets
 *    - Resources: hearts (lives), xp (experience)
 *    - Gems: diamonds, sapphires, emeralds, rubies, amethysts
 *    - Special: giftBox (contains random rewards)
 * 
 * 5. FUTURE ENHANCEMENTS:
 *    - Sound effects for slot machine spinning
 *    - Particle effects for big rewards
 *    - Combo multiplier animations
 *    - Rarity indicators (common, rare, epic, legendary)
 *    - Share rewards to social media
 *    - Reward history/log
 */

class RewardsDisplay {
    constructor() {
        this.container = null;
        this.isAnimating = false;
        
        // Define reward types with their display properties
        // Order matters - most valuable/rare items first
        this.rewardTypes = [
            { type: 'hearts', icon: './src/images/power-icons/hearts.svg', color: '#ff4757', label: 'Lives' },
            { type: 'giftBox', icon: './src/images/economy-icons/giftBox.svg', color: '#f39c12', label: 'Mystery Box' },
            { type: 'diamonds', icon: './src/images/power-icons/diamonds.svg', color: '#00cec9', label: 'Diamonds' },
            { type: 'amethysts', icon: './src/images/economy-icons/gemIcon.svg', color: '#a29bfe', label: 'Amethysts' },
            { type: 'rubies', icon: './src/images/economy-icons/gemIcon.svg', color: '#e74c3c', label: 'Rubies' },
            { type: 'emeralds', icon: './src/images/economy-icons/gemIcon.svg', color: '#2ecc71', label: 'Emeralds' },
            { type: 'sapphires', icon: './src/images/economy-icons/gemIcon.svg', color: '#3498db', label: 'Sapphires' },
            { type: 'coins', icon: './src/images/economy-icons/coinIcon.svg', color: '#f1c40f', label: 'Coins' },
            { type: 'keys', icon: './src/images/economy-icons/keyIcon.svg', color: '#95a5a6', label: 'Keys' },
            { type: 'tickets', icon: './src/images/economy-icons/ticketIcon.svg', color: '#e67e22', label: 'Tickets' },
            { type: 'xp', icon: './src/images/economy-icons/xpIcon.svg', color: '#58cc02', label: 'Experience' }
        ];
    }
    
    /**
     * Show the rewards display with slot machine animation
     * @param {Object} rewards - Object containing reward amounts { coins: 10, xp: 50, ... }
     * @param {HTMLElement} targetContainer - Where to render the rewards display
     * @param {Object} options - Display options { theme: 'dark'|'light', size: 'small'|'medium'|'large' }
     * @returns {Promise} - Resolves when animation is complete
     */
    async show(rewards, targetContainer, options = {}) {
        if (this.isAnimating) {
            console.warn('RewardsDisplay: Animation already in progress');
            return;
        }
        
        if (!targetContainer) {
            console.error('RewardsDisplay: No target container provided');
            return;
        }
        
        this.container = targetContainer;
        this.isAnimating = true;
        
        const { theme = 'dark', size = 'medium' } = options;
        
        // Clear existing content
        this.container.innerHTML = '';
        
        // Create rewards container
        const rewardsBar = document.createElement('div');
        rewardsBar.className = `rewards-bar rewards-bar-${size} rewards-bar-${theme}`;
        rewardsBar.id = 'rewardsBar';
        this.container.appendChild(rewardsBar);
        
        // Filter and display only rewards with values > 0
        const activeRewards = this.rewardTypes.filter(reward => rewards[reward.type] > 0);
        
        if (activeRewards.length === 0) {
            console.log('RewardsDisplay: No rewards to display');
            this.isAnimating = false;
            return;
        }
        
        // Create slots for each active reward
        activeRewards.forEach((reward, index) => {
            this.createRewardSlot(reward, rewards[reward.type], rewardsBar, index);
        });
        
        // Wait for all animations to complete
        await new Promise(resolve => {
            const totalAnimationTime = 2000 + (activeRewards.length * 200);
            setTimeout(() => {
                this.isAnimating = false;
                resolve();
            }, totalAnimationTime);
        });
    }
    
    /**
     * Create a single reward slot with animation
     */
    createRewardSlot(rewardType, value, container, index) {
        const slot = document.createElement('div');
        slot.className = 'reward-slot';
        
        // Apply color filter for gems
        const isGem = ['sapphires', 'emeralds', 'rubies', 'amethysts'].includes(rewardType.type);
        const filterStyle = isGem ? `style="filter: brightness(0) saturate(100%) ${this.getGemColorFilter(rewardType.color)};"` : '';
        
        slot.innerHTML = `
            <div class="slot-reel" id="reel-${rewardType.type}">
                ${this.createSlotItems(rewardType.icon, rewardType.type, filterStyle)}
            </div>
            <div class="reward-value" id="value-${rewardType.type}" style="color: ${rewardType.color}">+0</div>
            <div class="reward-label">${rewardType.label}</div>
        `;
        
        container.appendChild(slot);
        
        // Animate the slot after a delay
        setTimeout(() => {
            this.animateSlot(slot, rewardType.type, value, index);
        }, 300 + (index * 100)); // Stagger the starts
    }
    
    /**
     * Create slot machine items for spinning effect
     */
    createSlotItems(icon, type, filterStyle) {
        let items = '';
        // Create 5 identical items for smooth spinning
        for (let i = 0; i < 5; i++) {
            items += `<div class="slot-item"><img src="${icon}" alt="${type}" ${filterStyle}></div>`;
        }
        return items;
    }
    
    /**
     * Animate a single slot
     */
    animateSlot(slot, type, value, index) {
        const reel = slot.querySelector('.slot-reel');
        const valueEl = slot.querySelector('.reward-value');
        
        // Start spinning
        reel.classList.add('spinning');
        
        // Stop spinning and show value
        setTimeout(() => {
            reel.classList.remove('spinning');
            reel.classList.add('stopped');
            valueEl.textContent = `+${value}`;
            valueEl.classList.add('show');
            
            // Add celebration effect for high-value rewards
            if (value >= 100 || type === 'hearts' || type === 'giftBox') {
                slot.classList.add('celebrate');
            }
        }, 1500 + (index * 200)); // Stagger the stops
    }
    
    /**
     * Get CSS filter for gem colors
     */
    getGemColorFilter(color) {
        // Convert hex color to CSS filter for white SVG icons
        const colorMap = {
            '#3498db': 'invert(53%) sepia(92%) saturate(2409%) hue-rotate(192deg) brightness(92%) contrast(85%)', // Sapphire blue
            '#2ecc71': 'invert(77%) sepia(39%) saturate(578%) hue-rotate(83deg) brightness(89%) contrast(85%)', // Emerald green
            '#e74c3c': 'invert(42%) sepia(88%) saturate(2468%) hue-rotate(345deg) brightness(95%) contrast(85%)', // Ruby red
            '#a29bfe': 'invert(71%) sepia(25%) saturate(1844%) hue-rotate(215deg) brightness(97%) contrast(101%)' // Amethyst purple
        };
        return colorMap[color] || '';
    }
    
    /**
     * Show a simple reward notification (alternative to slot machine)
     * Useful for single rewards or quick notifications
     */
    showQuickReward(rewardType, value, options = {}) {
        const { duration = 3000, position = 'top' } = options;
        
        const notification = document.createElement('div');
        notification.className = `reward-notification reward-notification-${position}`;
        
        const reward = this.rewardTypes.find(r => r.type === rewardType);
        if (!reward) {
            console.error(`RewardsDisplay: Unknown reward type ${rewardType}`);
            return;
        }
        
        notification.innerHTML = `
            <div class="reward-notification-content">
                <img src="${reward.icon}" alt="${reward.type}" class="reward-notification-icon">
                <span class="reward-notification-text">+${value} ${reward.label}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    /**
     * Utility method to create a rewards container in a modal
     */
    static createRewardsContainer(parentElement, containerId = 'rewardsContainer') {
        const container = document.createElement('div');
        container.className = 'rewards-display-container';
        container.id = containerId;
        parentElement.appendChild(container);
        return container;
    }
}

// Make it globally available
window.RewardsDisplay = RewardsDisplay;

/**
 * USAGE EXAMPLES:
 * 
 * 1. In QuizModal after quiz completion:
 * 
 * const rewardsDisplay = new RewardsDisplay();
 * const container = document.getElementById('rewardsContainer');
 * const rewards = await economyManager.processQuizComplete(quizData);
 * await rewardsDisplay.show(rewards, container);
 * 
 * 2. In FlashcardModal results screen:
 * 
 * const rewardsDisplay = new RewardsDisplay();
 * const container = document.getElementById('rewardsBar').parentElement;
 * await rewardsDisplay.show(rewards, container, { size: 'large' });
 * 
 * 3. For quick notifications:
 * 
 * const rewardsDisplay = new RewardsDisplay();
 * rewardsDisplay.showQuickReward('coins', 50);
 * 
 * 4. For daily login bonus:
 * 
 * const rewards = { coins: 100, tickets: 5, hearts: 3 };
 * const container = RewardsDisplay.createRewardsContainer(modalBody);
 * await new RewardsDisplay().show(rewards, container, { theme: 'light' });
 */
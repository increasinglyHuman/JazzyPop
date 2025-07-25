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
            { type: 'hearts', icon: './src/images/economy-icons/heartIcon.svg', color: '#ff4757', label: 'Lives' },
            { type: 'giftBox', icon: './src/images/economy-icons/giftBox.svg', color: '#f39c12', label: 'Mystery Box' },
            { type: 'diamonds', icon: './src/images/economy-icons/gemIcon.svg', color: '#00cec9', label: 'Diamonds' },
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
        
        // Create rewards container with unique ID to avoid conflicts
        const rewardsBar = document.createElement('div');
        rewardsBar.className = `rewards-bar rewards-bar-${size} rewards-bar-${theme}`;
        rewardsBar.id = 'rewardsBar-' + Date.now(); // Unique ID to prevent conflicts
        
        // Check for existing rewardsBar elements
        const existingBars = document.querySelectorAll('[id^="rewardsBar"]');
        console.log('🚨 GREMLIN ALERT: Found existing rewards bars:', existingBars.length, Array.from(existingBars).map(el => ({ id: el.id, rect: el.getBoundingClientRect() })));
        console.log('🚨 GREMLIN ALERT: Container details:', {
            container: this.container,
            containerRect: this.container.getBoundingClientRect(),
            containerHTML: this.container.innerHTML
        });
        // Override any rainbow gradient with transparent background
        rewardsBar.style.background = 'transparent';
        rewardsBar.style.backgroundImage = 'none';
        this.container.appendChild(rewardsBar);
        
        // Let CSS handle the styling now that DOM conflicts are resolved
        
        console.log('DEBUG: RewardsDisplay created new rewards-bar:', {
            rect: rewardsBar.getBoundingClientRect(),
            className: rewardsBar.className,
            style: rewardsBar.style.cssText
        });
        
        // Define the 7 slots we always want to show in order
        const slotOrder = ['xp', 'coins', 'sapphires', 'keys', 'tickets', 'giftBox', 'hearts'];
        
        // Create reward slots in the specified order
        const slotsToShow = slotOrder.map(type => {
            const rewardType = this.rewardTypes.find(r => r.type === type);
            if (!rewardType) {
                console.warn(`RewardsDisplay: Unknown reward type ${type}`);
                return null;
            }
            return {
                ...rewardType,
                value: rewards[type] || 0
            };
        }).filter(Boolean);
        
        console.log('RewardsDisplay: Creating all 7 slots:', slotsToShow.map(r => `${r.type}: ${r.value}`));
        
        // Create slots for all 7 reward types
        slotsToShow.forEach((reward, index) => {
            console.log(`RewardsDisplay: Creating slot for ${reward.type} with value ${reward.value}`);
            this.createRewardSlot(reward, reward.value, rewardsBar, index);
        });
        
        // Debug: Log the actual DOM structure created
        console.log('RewardsDisplay: Final DOM structure:', rewardsBar.innerHTML);
        console.log('RewardsDisplay: Parent container classes:', this.container.className);
        console.log('RewardsDisplay: Parent container innerHTML:', this.container.innerHTML);
        
        // Visual debugging removed - slots should display naturally now
        
        // Debug: Check if slots were created
        setTimeout(() => {
            const slots = rewardsBar.querySelectorAll('.reward-slot');
            console.log(`RewardsDisplay: Created ${slots.length} reward slots`);
            slots.forEach((slot, i) => {
                const reel = slot.querySelector('.slot-reel');
                const items = slot.querySelectorAll('.slot-item');
                console.log(`Slot ${i}: has reel: ${!!reel}, has ${items.length} items`);
            });
        }, 100);
        
        // Wait for all animations to complete
        await new Promise(resolve => {
            // Updated timing: spin time + deceleration + stagger delays
            const totalAnimationTime = 2500 + (slotsToShow.length * 200);
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
        console.log(`DEBUG: createRewardSlot called for ${rewardType.type} with value ${value}`);
        console.log('DEBUG: Container exists:', !!container);
        console.log('DEBUG: Container tagName:', container?.tagName);
        
        const slot = document.createElement('div');
        slot.className = value > 0 ? 'reward-slot' : 'reward-slot unearned';
        
        console.log('DEBUG: Slot element created:', !!slot);
        
        // Get dynamic color based on value
        const dynamicColor = this.getDynamicColor(rewardType.type, value);
        
        // Don't apply filters - let the original icon colors show through
        let filterStyle = '';
        
        const slotHTML = `
            <div class="slot-window">
                <div class="slot-reel" id="reel-${rewardType.type}">
                    ${this.createSlotItems(rewardType.icon, rewardType.type, filterStyle)}
                </div>
            </div>
            <div class="reward-value" id="value-${rewardType.type}">0</div>
        `;
        
        console.log('DEBUG: Slot HTML:', slotHTML);
        slot.innerHTML = slotHTML;
        
        console.log('DEBUG: About to append slot to container');
        container.appendChild(slot);
        console.log('DEBUG: Container children after append:', container.children.length);
        
        // Immediate position check
        const immediateRect = slot.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        console.log(`DEBUG: IMMEDIATE POSITION for ${rewardType.type}:`, {
            slotRect: { left: immediateRect.left, top: immediateRect.top, width: immediateRect.width, height: immediateRect.height },
            containerRect: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height },
            slotVisible: immediateRect.width > 0 && immediateRect.height > 0,
            containerVisible: containerRect.width > 0 && containerRect.height > 0,
            slotIndex: index,
            slotZIndex: window.getComputedStyle(slot).zIndex,
            slotPosition: window.getComputedStyle(slot).position,
            slotDisplay: window.getComputedStyle(slot).display,
            slotVisibility: window.getComputedStyle(slot).visibility,
            slotOpacity: window.getComputedStyle(slot).opacity
        });
        
        // Log slot position for debugging
        setTimeout(() => {
            const rect = slot.getBoundingClientRect();
            const window = slot.querySelector('.slot-window');
            const windowRect = window ? window.getBoundingClientRect() : null;
            console.log(`Slot ${rewardType.type} (index ${index}):`, {
                slotPosition: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                windowPosition: windowRect ? { left: windowRect.left, top: windowRect.top, width: windowRect.width, height: windowRect.height } : 'no window',
                value: value,
                earned: value > 0
            });
        }, 50);
        
        // Animate slots with earned rewards
        if (value > 0) {
            console.log(`🎰 SLOT ANIMATION: Starting animation for ${rewardType.type} with value ${value}`);
            // Start animation after a delay
            setTimeout(() => {
                console.log(`🎰 SLOT ANIMATION: Animating ${rewardType.type} now!`);
                this.animateSlot(slot, rewardType.type, value, index);
            }, 300 + (index * 100)); // Stagger the starts
        } else {
            // Mark unearned slots immediately
            slot.classList.add('unearned');
            console.log(`🎰 SLOT ANIMATION: ${rewardType.type} marked as unearned (value: ${value})`);
        }
    }
    
    /**
     * Create slot machine items for spinning effect
     */
    createSlotItems(icon, type, filterStyle) {
        let items = '';
        // Create random items for spinning effect
        const allIcons = [
            './src/images/economy-icons/xpIcon.svg',
            './src/images/economy-icons/coinIcon.svg',
            './src/images/economy-icons/gemIcon.svg',
            './src/images/economy-icons/keyIcon.svg',
            './src/images/economy-icons/ticketIcon.svg',
            './src/images/economy-icons/giftBox.svg',
            './src/images/economy-icons/heartIcon.svg'
        ];
        
        // Create 5 random items for the spin
        for (let i = 0; i < 5; i++) {
            const randomIcon = allIcons[Math.floor(Math.random() * allIcons.length)];
            items += `<div class="slot-item"><img src="${randomIcon}" alt="spinning"></div>`;
        }
        return items;
    }
    
    /**
     * Animate a single slot
     */
    animateSlot(slot, type, value, index) {
        const reel = slot.querySelector('.slot-reel');
        const valueEl = slot.querySelector('.reward-value');
        
        // Get the actual reward icon and filter
        const rewardType = this.rewardTypes.find(r => r.type === type);
        const dynamicColor = this.getDynamicColor(type, value);
        
        // Don't apply filters - use original icon colors
        let filterStyle = '';
        
        // Start spinning
        reel.classList.add('spinning');
        
        // Stop spinning with deceleration effect
        setTimeout(() => {
            reel.classList.remove('spinning');
            reel.classList.add('stopping');
            
            // Swap to the actual icon just before stopping
            setTimeout(() => {
                // Replace the reel content with the actual earned icon centered
                reel.innerHTML = `
                    <div class="slot-item final-item">
                        <img src="${rewardType.icon}" alt="${type}">
                    </div>
                `;
                
                // Reset transform to show the single centered icon
                reel.style.transform = 'translateY(0)';
                reel.style.top = '5px'; // Ensure it stays in the visible area
                reel.classList.remove('stopping');
                
                // Debug: Check final position
                const finalImg = reel.querySelector('img');
                if (finalImg) {
                    setTimeout(() => {
                        const imgRect = finalImg.getBoundingClientRect();
                        console.log(`Final position for ${type}:`, {
                            visible: imgRect.width > 0 && imgRect.height > 0,
                            position: { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height },
                            src: finalImg.src,
                            parent: reel.getBoundingClientRect()
                        });
                    }, 100);
                }
                
                // Show value after the swap
                setTimeout(() => {
                    valueEl.textContent = `${value}`;
                    valueEl.classList.add('show');
                    // Don't set color inline - let CSS handle it
                }, 200);
            }, 600); // Just before the deceleration completes
            
            // Add celebration effect for high-value rewards
            if (value >= 100 || type === 'hearts' || type === 'giftBox') {
                slot.classList.add('celebrate');
            }
            
            // Add extra glow for very high values
            if ((type === 'xp' && value >= 100) || 
                (type === 'coins' && value >= 100) ||
                (type === 'diamonds' && value > 0)) {
                slot.style.boxShadow = `0 0 20px ${this.getDynamicColor(type, value)}`;
            }
        }, 1500 + (index * 200)); // Stagger the stops
    }
    
    /**
     * Get dynamic color based on reward type and value
     */
    getDynamicColor(type, value) {
        switch(type) {
            case 'xp':
                // XP: blue (cold) to red (hot) based on value
                if (value <= 10) return '#0066ff'; // Deep blue
                if (value <= 25) return '#0099ff'; // Light blue
                if (value <= 50) return '#00ccff'; // Cyan
                if (value <= 100) return '#ffcc00'; // Yellow
                if (value <= 200) return '#ff9900'; // Orange
                return '#ff0000'; // Hot red for 200+
                
            case 'coins':
                // Coins: bronze to gold based on value
                if (value <= 20) return '#cd7f32'; // Bronze
                if (value <= 50) return '#c0c0c0'; // Silver
                if (value <= 100) return '#ffd700'; // Gold
                return '#fff700'; // Bright gold for 100+
                
            default:
                // Use original color for gems
                const rewardType = this.rewardTypes.find(r => r.type === type);
                return rewardType ? rewardType.color : '#ffffff';
        }
    }
    
    /**
     * Get CSS filter based on value for dynamic coloring
     */
    getValueBasedFilter(type, value) {
        if (type === 'coins') {
            // Bronze to gold gradient
            if (value <= 20) return 'invert(48%) sepia(26%) saturate(1107%) hue-rotate(357deg) brightness(91%) contrast(87%)'; // Bronze
            if (value <= 50) return 'invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'; // Silver
            if (value <= 100) return 'invert(72%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(103%) contrast(106%)'; // Gold
            return 'invert(82%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(120%) contrast(106%)'; // Bright gold
        }
        
        // For gems, use their standard colors
        const colorMap = {
            'sapphires': 'invert(53%) sepia(92%) saturate(2409%) hue-rotate(192deg) brightness(92%) contrast(85%)',
            'emeralds': 'invert(77%) sepia(39%) saturate(578%) hue-rotate(83deg) brightness(89%) contrast(85%)',
            'rubies': 'invert(42%) sepia(88%) saturate(2468%) hue-rotate(345deg) brightness(95%) contrast(85%)',
            'amethysts': 'invert(71%) sepia(25%) saturate(1844%) hue-rotate(215deg) brightness(97%) contrast(101%)',
            'diamonds': 'invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
        };
        
        return colorMap[type] || '';
    }
    
    /**
     * Get XP gradient filter based on value
     */
    getXPGradientFilter(value) {
        // Create heat map effect for XP
        if (value <= 10) return 'hue-rotate(200deg) saturate(150%)'; // Deep blue
        if (value <= 25) return 'hue-rotate(180deg) saturate(150%)'; // Light blue
        if (value <= 50) return 'hue-rotate(120deg) saturate(150%)'; // Cyan
        if (value <= 100) return 'hue-rotate(60deg) saturate(150%)'; // Yellow-green
        if (value <= 200) return 'hue-rotate(30deg) saturate(150%)'; // Orange
        return 'hue-rotate(0deg) saturate(200%) brightness(110%)'; // Hot red
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
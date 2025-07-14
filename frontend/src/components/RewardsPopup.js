/**
 * Rewards Popup Component
 * Shows rewards earned as a simple top notification bar
 */

class RewardsPopup {
    constructor() {
        this.queue = [];
        this.isShowing = false;
        this.init();
    }
    
    init() {
        // Listen for rewards events
        window.addEventListener('rewards:earned', (e) => {
            this.queueRewards(e.detail.rewards, e.detail.bonuses);
        });
        
        // Make globally available
        window.rewardsPopup = this;
    }
    
    queueRewards(rewards, bonuses = []) {
        this.queue.push({ rewards, bonuses });
        if (!this.isShowing) {
            this.showNext();
        }
    }
    
    showNext() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        const { rewards, bonuses } = this.queue.shift();
        this.showRewards(rewards, bonuses);
    }
    
    showRewards(rewards, bonuses = []) {
        // Find the active modal (quiz or flashcard)
        const quizContent = document.querySelector('.quiz-modal.active .quiz-content');
        const flashcardContent = document.querySelector('.flashcard-modal.active .flashcard-content');
        const flashcardModal = document.querySelector('.flashcard-modal.active');
        
        // Try to find the best container
        let target = quizContent || flashcardContent || flashcardModal;
        
        // If still no target, try to find any visible modal content
        if (!target) {
            const activeModal = document.querySelector('.quiz-modal.active, .flashcard-modal.active');
            if (activeModal) {
                // Ensure container has position relative for proper bar positioning
                target = activeModal.querySelector('.quiz-content, .flashcard-content') || activeModal;
            }
        }
        
        if (!target) {
            // No active modal, skip
            this.showNext();
            return;
        }
        
        // Create simple notification bar
        const bar = document.createElement('div');
        bar.className = 'rewards-bar';
        bar.innerHTML = this.buildRewardsMessage(rewards, bonuses);
        
        // Add to the modal
        target.appendChild(bar);
        
        // Animate in
        requestAnimationFrame(() => {
            bar.classList.add('active');
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            bar.classList.remove('active');
            setTimeout(() => {
                bar.remove();
                this.showNext(); // Show next in queue
            }, 300);
        }, 3000);
    }
    
    buildRewardsMessage(rewards, bonuses) {
        const items = [];
        
        // Simple inline display
        if (rewards.xp > 0) items.push(`+${rewards.xp} XP`);
        if (rewards.coins > 0) items.push(`+${rewards.coins} Coins`);
        if (rewards.sapphires > 0) items.push(`+${rewards.sapphires} 💎`);
        if (rewards.emeralds > 0) items.push(`+${rewards.emeralds} 💎`);
        if (rewards.rubies > 0) items.push(`+${rewards.rubies} 💎`);
        if (rewards.amethysts > 0) items.push(`+${rewards.amethysts} 💎`);
        if (rewards.diamonds > 0) items.push(`+${rewards.diamonds} 💎`);
        if (rewards.hearts > 0) items.push(`+${rewards.hearts} ❤️`);
        if (rewards.energy > 0) items.push(`+${rewards.energy} Energy`);
        
        const rewardsText = items.join(' · ');
        const bonusText = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';
        
        return `
            <div class="rewards-content">
                <span class="rewards-icon">🎉</span>
                <span class="rewards-text">${rewardsText}${bonusText}</span>
            </div>
        `;
    }
}

// Initialize when DOM is ready
// TEMPORARILY DISABLED - Causing duplicate rewards display with party popper emoji
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => new RewardsPopup());
// } else {
//     new RewardsPopup();
// }
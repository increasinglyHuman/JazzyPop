/**
 * Simple Scoring Engine
 * Now acts as a wrapper around EconomyManager for backward compatibility
 */

class ScoringEngine {
    static HEART_CAP = 5;
    static HEART_OVERFLOW_GEMS = 2;

    /**
     * Simple heart overflow check - core rule
     * If trying to award hearts when already at 5, give gems instead
     */
    static handleHeartOverflow(heartsToAward, currentHearts = null) {
        if (currentHearts === null && window.economyManager) {
            currentHearts = window.economyManager.getHearts();
        } else if (currentHearts === null) {
            currentHearts = 5; // Default
        }

        if (currentHearts >= this.HEART_CAP) {
            // Hearts full - return gems instead
            return {
                hearts: 0,
                diamonds: this.HEART_OVERFLOW_GEMS * heartsToAward,
                xp: 0
            };
        } else {
            // Can award hearts normally
            return {
                hearts: heartsToAward,
                diamonds: 0,
                xp: 0
            };
        }
    }

    /**
     * Apply any reward with overflow protection
     * Now delegates to EconomyManager
     */
    static applyReward(hearts, diamonds, xp) {
        if (window.economyManager) {
            // Use EconomyManager which handles overflow internally
            window.economyManager.awardRewards(hearts, diamonds, xp, 'scoring_engine');
            return { hearts, diamonds, xp };
        }
        
        // Fallback if EconomyManager not available
        console.warn('EconomyManager not available, rewards not applied');
        return { hearts: 0, diamonds: 0, xp: 0 };
    }
}

// Create global instance
window.scoringEngine = new ScoringEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoringEngine;
}
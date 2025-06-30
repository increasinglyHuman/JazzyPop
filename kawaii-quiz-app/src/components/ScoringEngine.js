/**
 * Simple Scoring Engine
 * Handles core overflow rule: when hearts are at 5, give 2 gems instead
 */

class ScoringEngine {
    static HEART_CAP = 5;
    static HEART_OVERFLOW_GEMS = 2;

    /**
     * Simple heart overflow check - core rule
     * If trying to award hearts when already at 5, give gems instead
     */
    static handleHeartOverflow(heartsToAward, currentHearts = null) {
        if (currentHearts === null) {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            currentHearts = userData.hearts || 5;
        }

        if (currentHearts >= this.HEART_CAP) {
            // Hearts full - return gems instead
            return {
                hearts: 0,
                diamonds: this.HEART_OVERFLOW_GEMS,
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
     */
    static applyReward(hearts, diamonds, xp) {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Handle heart overflow
        if (hearts > 0) {
            const currentHearts = userData.hearts || 5;
            if (currentHearts >= this.HEART_CAP) {
                // Convert hearts to gems
                diamonds += hearts * this.HEART_OVERFLOW_GEMS;
                hearts = 0;
            } else {
                // Cap hearts at maximum
                const newTotal = currentHearts + hearts;
                if (newTotal > this.HEART_CAP) {
                    const overflow = newTotal - this.HEART_CAP;
                    hearts = this.HEART_CAP - currentHearts;
                    diamonds += overflow * this.HEART_OVERFLOW_GEMS;
                }
                userData.hearts = (userData.hearts || 5) + hearts;
            }
        }

        // Apply other rewards normally
        if (diamonds > 0) {
            userData.diamonds = (userData.diamonds || 0) + diamonds;
        }
        if (xp > 0) {
            userData.xp = (userData.xp || 0) + xp;
        }

        localStorage.setItem('userData', JSON.stringify(userData));

        return { hearts, diamonds, xp };
    }
}

// Create global instance
window.scoringEngine = new ScoringEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoringEngine;
}
/**
 * Master Card Configuration
 * Controls the total number of cards displayed and their distribution
 * 
 * IMPORTANT: Higher values may impact mobile performance!
 * Recommended limits:
 * - Low-end phones: 10-15 total cards
 * - Mid-range phones: 20-30 total cards  
 * - High-end phones: 50+ total cards
 * - Desktop: 100+ total cards (if needed)
 */

class CardConfig {
    constructor() {
        // Master control - change this to scale everything
        this.TOTAL_CARD_TARGET = 20; // Default safe for most phones
        
        // Distribution percentages (must add up to 100%)
        this.distribution = {
            quiz: 60,        // 60% quiz cards
            practice: 25,    // 25% practice/flashcard cards
            special: 5,      // 5% special cards (herding game, etc)
            content: 10      // 10% content cards (facts, quotes, tips)
        };
        
        // Performance thresholds
        this.performanceLimits = {
            lowEnd: 15,      // Older/budget phones
            midRange: 30,    // Most modern phones
            highEnd: 50,     // Flagship phones
            desktop: 100     // Desktop browsers
        };
        
        // Device-specific recommendation
        this.recommendedLimit = null;
        this.deviceType = null;
        
        // Load saved config from localStorage
        this.loadConfig();
        
        // Auto-detect on first load if no saved config
        if (!localStorage.getItem('cardConfig')) {
            this.autoDetectLimit(true); // Silent auto-detect
        }
    }
    
    /**
     * Get the calculated limits for each card type
     */
    getCardLimits() {
        const limits = {};
        
        // Calculate each type based on distribution
        for (const [type, percentage] of Object.entries(this.distribution)) {
            limits[type] = Math.ceil(this.TOTAL_CARD_TARGET * (percentage / 100));
        }
        
        // Ensure we have at least 1 of each type if total is high enough
        if (this.TOTAL_CARD_TARGET >= 10) {
            for (const type in limits) {
                if (limits[type] === 0) {
                    limits[type] = 1;
                }
            }
        }
        
        return limits;
    }
    
    /**
     * Get quiz card limit for API calls
     */
    getQuizLimit() {
        return this.getCardLimits().quiz;
    }
    
    /**
     * Set a new total card target
     * @param {number} total - The new total card target
     */
    setTotalCards(total) {
        // Validate input
        if (total < 1) total = 1;
        if (total > 200) total = 200; // Hard cap to prevent insanity
        
        this.TOTAL_CARD_TARGET = total;
        this.saveConfig();
        
        // Emit event for components to react
        window.dispatchEvent(new CustomEvent('cardConfigChanged', {
            detail: { total, limits: this.getCardLimits() }
        }));
    }
    
    /**
     * Update distribution percentages
     * @param {Object} newDistribution - New distribution percentages
     */
    setDistribution(newDistribution) {
        // Validate percentages add up to 100
        const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
            // Distribution must add up to 100%
            return;
        }
        
        this.distribution = { ...newDistribution };
        this.saveConfig();
        
        // Emit event
        window.dispatchEvent(new CustomEvent('cardConfigChanged', {
            detail: { total: this.TOTAL_CARD_TARGET, limits: this.getCardLimits() }
        }));
    }
    
    /**
     * Auto-detect device and set appropriate limit
     * @param {boolean} silent - If true, only detect without changing current setting
     */
    autoDetectLimit(silent = false) {
        const isDesktop = !('ontouchstart' in window);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Check device memory if available
        const memory = navigator.deviceMemory; // GB of RAM
        
        // Check screen size as additional factor
        const screenWidth = window.screen.width;
        const isLargeScreen = screenWidth >= 1024;
        
        let recommendedLimit;
        let deviceType;
        
        if (isDesktop) {
            recommendedLimit = this.performanceLimits.desktop;
            deviceType = 'desktop';
        } else if (memory && memory <= 2) {
            recommendedLimit = this.performanceLimits.lowEnd;
            deviceType = 'lowEnd';
        } else if (memory && memory >= 6 || isLargeScreen) {
            recommendedLimit = this.performanceLimits.highEnd;
            deviceType = 'highEnd';
        } else {
            recommendedLimit = this.performanceLimits.midRange;
            deviceType = 'midRange';
        }
        
        // Store the recommendation
        this.recommendedLimit = recommendedLimit;
        this.deviceType = deviceType;
        
        // Auto-detected device type and recommended limit
        
        if (!silent) {
            this.setTotalCards(recommendedLimit);
        }
    }
    
    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        const config = {
            totalCards: this.TOTAL_CARD_TARGET,
            distribution: this.distribution
        };
        localStorage.setItem('cardConfig', JSON.stringify(config));
    }
    
    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('cardConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.TOTAL_CARD_TARGET = config.totalCards || this.TOTAL_CARD_TARGET;
                this.distribution = config.distribution || this.distribution;
            }
        } catch (e) {
            // Using default card configuration
        }
    }
    
    /**
     * Get performance recommendations based on current settings
     */
    getPerformanceWarning() {
        // If no recommendation yet, auto-detect silently
        if (!this.recommendedLimit) {
            this.autoDetectLimit(true);
        }
        
        // Only warn if above recommended limit
        if (this.TOTAL_CARD_TARGET <= this.recommendedLimit) {
            return null; // Within safe range for this device
        }
        
        // Calculate how much over the recommendation
        const percentOver = Math.round(((this.TOTAL_CARD_TARGET - this.recommendedLimit) / this.recommendedLimit) * 100);
        
        if (percentOver <= 25) {
            return '⚠️ Above recommended';
        } else if (percentOver <= 50) {
            return '⚠️ May slow your device';
        } else {
            return '🔥 Too many cards!';
        }
    }
}

// Create global instance
window.cardConfig = new CardConfig();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardConfig;
}
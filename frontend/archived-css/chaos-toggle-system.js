// Chaos Toggle System - Balance between Normal and Wild
class ChaosToggleSystem {
    constructor() {
        this.modes = {
            'zen': {
                name: 'Zen Mode',
                icon: '🧘',
                description: 'Clean, focused learning',
                chaosLevel: 0,
                features: {
                    animations: 'minimal',
                    questions: 'straightforward',
                    timer: 'relaxed',
                    visuals: 'clean'
                }
            },
            'normal': {
                name: 'Classic Mode',
                icon: '📚',
                description: 'Traditional quiz experience',
                chaosLevel: 1,
                features: {
                    animations: 'subtle',
                    questions: 'standard',
                    timer: 'normal',
                    visuals: 'friendly'
                }
            },
            'playful': {
                name: 'Playful Mode',
                icon: '🎮',
                description: 'Fun with a dash of whimsy',
                chaosLevel: 2,
                features: {
                    animations: 'bouncy',
                    questions: 'quirky',
                    timer: 'dynamic',
                    visuals: 'colorful'
                }
            },
            'chaos': {
                name: 'Chaos Mode',
                icon: '🌪️',
                description: 'Maximum entertainment learning',
                chaosLevel: 3,
                features: {
                    animations: 'wild',
                    questions: 'absurd',
                    timer: 'pressure',
                    visuals: 'explosive'
                }
            },
            'nightmare': {
                name: 'Nightmare Mode',
                icon: '🌌',
                description: 'For chaos masters only',
                chaosLevel: 4,
                locked: true,
                unlockRequirement: 'Complete 50 chaos quizzes',
                features: {
                    animations: 'glitch',
                    questions: 'interdimensional',
                    timer: 'chaotic',
                    visuals: 'reality-bending'
                }
            }
        };
        
        this.currentMode = this.loadPreference() || 'normal';
        this.weeklyThemes = this.initWeeklyThemes();
        this.todayTheme = this.getTodayTheme();
    }
    
    initWeeklyThemes() {
        return {
            0: { // Sunday
                name: 'Serene Sunday',
                icon: '☀️',
                modifier: 'relaxed',
                bonusMode: 'zen',
                rewards: {
                    xpMultiplier: 1.5,
                    special: 'Meditation Badge',
                    unlocks: 'Zen Garden Background'
                }
            },
            1: { // Monday
                name: 'Motivation Monday',
                icon: '💪',
                modifier: 'energized',
                bonusMode: 'playful',
                rewards: {
                    xpMultiplier: 2.0,
                    special: 'Monday Warrior Badge',
                    unlocks: 'Coffee Power-Up'
                }
            },
            2: { // Tuesday
                name: 'Twist Tuesday',
                icon: '🌀',
                modifier: 'unexpected',
                bonusMode: 'chaos',
                rewards: {
                    xpMultiplier: 1.8,
                    special: 'Plot Twist Badge',
                    unlocks: 'Reverse Mode'
                }
            },
            3: { // Wednesday
                name: 'Wisdom Wednesday',
                icon: '🦉',
                modifier: 'thoughtful',
                bonusMode: 'normal',
                rewards: {
                    xpMultiplier: 1.5,
                    special: 'Wise Owl Badge',
                    unlocks: 'Hint Boost'
                }
            },
            4: { // Thursday
                name: 'Throwback Thursday',
                icon: '📼',
                modifier: 'retro',
                bonusMode: 'playful',
                rewards: {
                    xpMultiplier: 1.7,
                    special: 'Retro Badge',
                    unlocks: '8-bit Theme'
                }
            },
            5: { // Friday
                name: 'Frenzy Friday',
                icon: '🎉',
                modifier: 'party',
                bonusMode: 'chaos',
                rewards: {
                    xpMultiplier: 3.0,
                    special: 'Party Animal Badge',
                    unlocks: 'Confetti Explosion'
                }
            },
            6: { // Saturday
                name: 'Surprise Saturday',
                icon: '🎁',
                modifier: 'mystery',
                bonusMode: 'random',
                rewards: {
                    xpMultiplier: 2.5,
                    special: 'Mystery Box',
                    unlocks: 'Secret Feature'
                }
            }
        };
    }
    
    getTodayTheme() {
        const day = new Date().getDay();
        return this.weeklyThemes[day];
    }
    
    getMode() {
        return this.modes[this.currentMode];
    }
    
    setMode(modeName) {
        if (this.modes[modeName] && !this.modes[modeName].locked) {
            this.currentMode = modeName;
            this.savePreference(modeName);
            this.applyModeStyles();
            this.triggerModeChange(modeName);
        }
    }
    
    savePreference(mode) {
        // COMMENTED OUT FOR ALM TESTING - localStorage triggers iframe issues
        // localStorage.setItem('chaosMode', mode);
        // localStorage.setItem('lastModeChange', new Date().toISOString());
    }
    
    loadPreference() {
        // COMMENTED OUT FOR ALM TESTING - localStorage triggers iframe issues
        // return localStorage.getItem('chaosMode');
        return null;
    }
    
    applyModeStyles() {
        const mode = this.getMode();
        const root = document.documentElement;
        
        // Apply CSS variables based on mode
        switch(this.currentMode) {
            case 'zen':
                root.style.setProperty('--chaos-primary', '#e0f2f1');
                root.style.setProperty('--chaos-secondary', '#80cbc4');
                root.style.setProperty('--chaos-accent', '#4db6ac');
                root.style.setProperty('--chaos-animation-speed', '0.6s');
                break;
            case 'normal':
                root.style.setProperty('--chaos-primary', '#e3f2fd');
                root.style.setProperty('--chaos-secondary', '#90caf9');
                root.style.setProperty('--chaos-accent', '#64b5f6');
                root.style.setProperty('--chaos-animation-speed', '0.4s');
                break;
            case 'playful':
                root.style.setProperty('--chaos-primary', '#fff3e0');
                root.style.setProperty('--chaos-secondary', '#ffcc80');
                root.style.setProperty('--chaos-accent', '#ffb74d');
                root.style.setProperty('--chaos-animation-speed', '0.3s');
                break;
            case 'chaos':
                root.style.setProperty('--chaos-primary', '#ff006e');
                root.style.setProperty('--chaos-secondary', '#3a86ff');
                root.style.setProperty('--chaos-accent', '#8338ec');
                root.style.setProperty('--chaos-animation-speed', '0.2s');
                break;
            case 'nightmare':
                root.style.setProperty('--chaos-primary', '#000000');
                root.style.setProperty('--chaos-secondary', '#ff0000');
                root.style.setProperty('--chaos-accent', '#9d00ff');
                root.style.setProperty('--chaos-animation-speed', '0.1s');
                break;
        }
    }
    
    triggerModeChange(mode) {
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('chaosModeChanged', {
            detail: { mode, features: this.modes[mode].features }
        }));
    }
    
    // Get question style based on current mode
    getQuestionStyle() {
        const mode = this.getMode();
        const theme = this.todayTheme;
        
        return {
            mode: this.currentMode,
            chaosLevel: mode.chaosLevel,
            dayModifier: theme.modifier,
            features: mode.features,
            bonusActive: theme.bonusMode === this.currentMode
        };
    }
    
    // Check if user should get daily bonus
    checkDailyBonus() {
        const theme = this.todayTheme;
        if (theme.bonusMode === this.currentMode || theme.bonusMode === 'random') {
            return {
                active: true,
                multiplier: theme.rewards.xpMultiplier,
                special: theme.rewards.special,
                message: `${theme.icon} ${theme.name} Bonus Active!`
            };
        }
        return { active: false };
    }
    
    // Unlock system for advanced modes
    checkUnlocks(userStats) {
        Object.entries(this.modes).forEach(([modeName, mode]) => {
            if (mode.locked && mode.unlockRequirement) {
                // Check various unlock conditions
                if (modeName === 'nightmare' && userStats.chaosQuizzesCompleted >= 50) {
                    this.unlockMode(modeName);
                }
            }
        });
    }
    
    unlockMode(modeName) {
        if (this.modes[modeName]) {
            this.modes[modeName].locked = false;
            this.showUnlockAnimation(modeName);
            this.saveUnlock(modeName);
        }
    }
    
    showUnlockAnimation(modeName) {
        const mode = this.modes[modeName];
        // Trigger unlock notification
        window.dispatchEvent(new CustomEvent('modeUnlocked', {
            detail: {
                mode: modeName,
                name: mode.name,
                icon: mode.icon,
                description: mode.description
            }
        }));
    }
    
    saveUnlock(modeName) {
        // COMMENTED OUT FOR ALM TESTING - localStorage triggers iframe issues
        // const unlocks = JSON.parse(localStorage.getItem('unlockedModes') || '[]');
        // if (!unlocks.includes(modeName)) {
        //     unlocks.push(modeName);
        //     localStorage.setItem('unlockedModes', JSON.stringify(unlocks));
        // }
    }
    
    // Get recommendations based on user behavior
    getRecommendedMode(userStats) {
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();
        
        // Morning: Start gentle
        if (hour >= 6 && hour < 10) {
            return 'zen';
        }
        
        // Work hours: Normal learning
        if (hour >= 10 && hour < 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            return 'normal';
        }
        
        // Evening: More playful
        if (hour >= 17 && hour < 21) {
            return 'playful';
        }
        
        // Late night: Chaos time!
        if (hour >= 21 || hour < 2) {
            return 'chaos';
        }
        
        // Weekend default
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return 'playful';
        }
        
        return 'normal';
    }
}

// Export for use
export default ChaosToggleSystem;
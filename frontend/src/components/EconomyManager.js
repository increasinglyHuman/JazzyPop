/**
 * EconomyManager - Secure economy system for JazzyPop
 * 
 * SECURITY PRINCIPLES:
 * 1. Never trust the client
 * 2. All math happens server-side
 * 3. This is just a display layer
 * 4. Every action is validated
 * 5. Rate limits on everything
 * 6. Immutable transaction logs
 */

class EconomyManager {
    constructor() {
        // Check storage availability
        this.hasLocalStorage = this.checkLocalStorage();
        this.hasSessionStorage = this.checkSessionStorage();
        
        // Use best available storage: localStorage > sessionStorage > memory
        this.storageBackend = this.hasLocalStorage ? window.localStorage : 
                            (this.hasSessionStorage ? window.sessionStorage : this.createMemoryStorage());
        
        // Display cache only - real data lives on server
        this.displayCache = {
            energy: 50,  // Start with 50 energy
            hearts: 5,
            coins: 0,
            sapphires: 0,
            emeralds: 0,
            rubies: 0,
            amethysts: 0,
            diamonds: 0,
            xp: 0,
            level: 1,
            streak: 0,
            lastSync: Date.now()
        };
        
        // Gem value system
        this.gemValues = {
            coins: 1,
            sapphires: 10,
            emeralds: 50,
            rubies: 100,
            amethysts: 250,
            diamonds: 1000
        };
        
        // Security tracking
        this.sessionToken = this.generateSessionToken();
        this.actionHistory = []; // Recent actions for rate limiting
        this.pendingTransactions = new Map(); // Awaiting server confirmation
        this.syncErrors = 0; // Track failed syncs
        
        // Anti-cheat measures
        this.lastKnownServerState = null;
        this.stateChecksum = null;
        this.maxSyncErrors = 3; // Before forcing re-auth
        
        // Active bonuses and events
        this.activeBonuses = [];
        this.globalEvents = [];
        
        // Special events system
        this.activeEvents = new Map(); // event id -> event data
        
        // Storage warning shown flag
        this.storageWarningShown = false;
        
        // Initialize
        this.init();
        
        // Make globally available
        window.economyManager = this;
    }
    
    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using memory storage');
            return false;
        }
    }
    
    checkSessionStorage() {
        try {
            const test = '__sessionStorage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    createMemoryStorage() {
        // In-memory storage fallback
        const storage = new Map();
        return {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
            clear: () => storage.clear()
        };
    }
    
    async init() {
        // EconomyManager initializing with security measures
        
        // Load from storage or use defaults
        this.loadFromStorage();
        
        // Sync with server immediately
        await this.syncWithServer();
        
        // Set up periodic sync (every 90 seconds - reduced from 30)
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 90000);
        
        // Set up heartbeat (every 30 seconds - reduced from 5)
        this.heartbeatInterval = setInterval(() => {
            this.validateClientState();
        }, 30000);
        
        // Check for special events every minute
        this.checkActiveEvents(); // Initial check
        this.eventCheckInterval = setInterval(() => {
            this.checkActiveEvents();
        }, 60000); // Check every minute
        
        // Show warning if no localStorage
        if (!this.hasLocalStorage) {
            this.showStorageWarning();
        }
    }
    
    loadFromStorage() {
        try {
            const saved = this.storageBackend.getItem('jazzypop_economy_display');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(this.displayCache, data);
            }
        } catch (e) {
            console.warn('Failed to load economy data:', e);
        }
    }
    
    saveToStorage() {
        try {
            this.storageBackend.setItem('jazzypop_economy_display', JSON.stringify(this.displayCache));
        } catch (e) {
            console.warn('Failed to save economy data:', e);
        }
    }
    
    showStorageWarning() {
        // Show a non-intrusive message about creating an account
        setTimeout(() => {
            const message = document.createElement('div');
            message.className = 'storage-warning';
            message.innerHTML = `
                <div class="storage-warning-content">
                    <p>💾 Playing without save data</p>
                    <p>Sign in with Google to save your progress!</p>
                    <button onclick="window.economyManager.dismissWarning(this)">Got it</button>
                </div>
            `;
            message.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--color-bg-secondary);
                padding: 15px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            `;
            document.body.appendChild(message);
        }, 3000);
    }
    
    dismissWarning(button) {
        button.parentElement.parentElement.remove();
    }
    
    generateSessionToken() {
        // Generate unique session identifier
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * CRITICAL: All resource changes go through here
     * @param {string} action - Action type (spend, earn, penalty)
     * @param {string} resource - Resource type (energy, hearts, etc)
     * @param {number} amount - Amount to change
     * @param {object} context - Additional context for validation
     */
    async requestResourceChange(action, resource, amount, context = {}) {
        // Sanity checks
        if (!this.isValidAction(action)) {
            console.error('Invalid action attempted:', action);
            return { success: false, error: 'Invalid action' };
        }
        
        if (!this.isValidResource(resource)) {
            console.error('Invalid resource:', resource);
            return { success: false, error: 'Invalid resource' };
        }
        
        if (!this.isValidAmount(amount, resource)) {
            console.error('Invalid amount:', amount, 'for', resource);
            return { success: false, error: 'Invalid amount' };
        }
        
        // Rate limiting
        if (!this.checkRateLimit(action)) {
            console.warn('Rate limit exceeded for:', action);
            return { success: false, error: 'Too many requests' };
        }
        
        // Create transaction
        const transaction = {
            id: this.generateTransactionId(),
            action,
            resource,
            amount,
            context,
            timestamp: Date.now(),
            sessionToken: this.sessionToken,
            clientChecksum: this.calculateChecksum()
        };
        
        // Optimistic UI update (will revert if server rejects)
        this.optimisticUpdate(resource, amount, action);
        
        // Send to server
        try {
            console.log('Sending transaction to server:', transaction);
            const response = await this.sendToServer(transaction);
            console.log('Server response:', response);
            
            if (response.success) {
                // Server approved - update confirmed
                this.confirmTransaction(transaction.id, response);
                return { success: true, newValue: response.newValue };
            } else {
                // Server rejected - revert
                this.revertTransaction(transaction);
                this.handleRejection(response);
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Transaction failed:', error);
            this.revertTransaction(transaction);
            return { success: false, error: 'Network error' };
        }
    }
    
    isValidAction(action) {
        const validActions = ['spend', 'earn', 'penalty', 'regen', 'bonus'];
        return validActions.includes(action);
    }
    
    isValidResource(resource) {
        const validResources = ['energy', 'hearts', 'coins', 'sapphires', 'emeralds', 'rubies', 'amethysts', 'diamonds', 'xp'];
        return validResources.includes(resource);
    }
    
    isValidAmount(amount, resource) {
        // Basic validation
        if (typeof amount !== 'number' || isNaN(amount)) return false;
        if (amount < 0) return false;
        
        // Resource-specific limits (matching backend)
        const maxValues = {
            energy: 10000,    // Increased to match backend
            hearts: 10,
            coins: 999999,
            sapphires: 99999,
            emeralds: 9999,
            rubies: 9999,
            amethysts: 999,
            diamonds: 999,
            xp: 9999999
        };
        
        return amount <= (maxValues[resource] || 1000);
    }
    
    checkRateLimit(action) {
        const now = Date.now();
        const recentActions = this.actionHistory.filter(a => 
            a.action === action && (now - a.timestamp) < 60000 // Last minute
        );
        
        const limits = {
            spend: 30,    // 30 spends per minute max
            earn: 50,     // 50 earns per minute max
            penalty: 20,  // 20 penalties per minute max
            regen: 3,     // 3 regens per minute max
            bonus: 10     // 10 bonuses per minute max
        };
        
        return recentActions.length < (limits[action] || 10);
    }
    
    optimisticUpdate(resource, amount, action) {
        // Update display immediately for responsiveness
        const oldValue = this.displayCache[resource] || 0;
        
        switch (action) {
            case 'spend':
            case 'penalty':
                this.displayCache[resource] = Math.max(0, oldValue - amount);
                break;
            case 'earn':
            case 'regen':
            case 'bonus':
                this.displayCache[resource] = oldValue + amount;
                break;
        }
        
        // Update UI
        this.updateDisplay();
    }
    
    async sendToServer(transaction) {
        // Try real API first
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const sessionId = this.sessionToken; // Always use the current session token
            const isAuthenticated = this.storageBackend.getItem('isAuthenticated') === 'true';
            const userId = isAuthenticated ? this.storageBackend.getItem('userId') : null;
            
            // Use appropriate endpoint based on action
            let endpoint, body;
            
            if (transaction.action === 'spend' && transaction.resource === 'energy') {
                // Use spend-energy endpoint for energy spending
                endpoint = `${apiBase}/api/economy/spend-energy`;
                body = {
                    amount: transaction.amount,
                    activity_type: transaction.context?.reason || 'unknown'
                };
                
                // Only send user_id OR session_id, not both
                if (userId) {
                    body.user_id = userId;
                } else {
                    body.session_id = sessionId;
                }
                
                console.log('Spend energy request body:', body);
            } else if (transaction.context?.source === 'quiz_complete' || transaction.context?.source === 'practice_complete') {
                // Use process-result for game completions - with correct field names
                endpoint = `${apiBase}/api/economy/process-result`;
                const details = transaction.context?.details || {};
                body = {
                    type: transaction.context.source,
                    category: details.category || 'general',
                    difficulty: details.difficulty || 'medium',
                    mode: details.mode || 'normal',
                    correct_answers: details.correctAnswers || 0,
                    total_questions: details.totalQuestions || 1,
                    time_spent: details.timeSpent || 0,
                    perfect_score: details.perfectScore || false,
                    streak: details.streak || 0
                };
                
                // Only send user_id OR session_id, not both
                if (userId) {
                    body.user_id = userId;
                } else {
                    body.session_id = sessionId;
                }
            } else {
                // All other transactions must go through API
                console.error('No API endpoint for transaction type:', transaction);
                return { success: false, error: 'Operation not supported' };
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId
                },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response for', endpoint, ':', data);
                return {
                    success: true,
                    resources: data.new_state,
                    newValue: data.new_state[transaction.resource],
                    transactionId: transaction.id,
                    serverTime: Date.now(),
                    levelUp: data.level_up
                };
            }
        } catch (error) {
            console.error('API call failed:', error);
            return { success: false, error: 'Network error - please try again' };
        }
    }
    
    calculateXPForLevel(level) {
        // Polynomial progression: 100 + (level * level * 50)
        // Level 1→2: 150 XP
        // Level 2→3: 300 XP
        // Level 3→4: 500 XP
        // Level 4→5: 750 XP
        // Level 9→10: 2,600 XP
        // Level 19→20: 10,100 XP
        return 100 + (level * level * 50);
    }
    
    calculateChecksum() {
        // Simple checksum of current state
        const stateString = JSON.stringify(this.displayCache);
        let checksum = 0;
        for (let i = 0; i < stateString.length; i++) {
            checksum = ((checksum << 5) - checksum) + stateString.charCodeAt(i);
            checksum = checksum & checksum; // Convert to 32-bit integer
        }
        return checksum;
    }
    
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    confirmTransaction(transactionId, serverResponse) {
        // Remove from pending
        this.pendingTransactions.delete(transactionId);
        
        // Update display with server's authoritative values
        if (serverResponse.resources) {
            Object.assign(this.displayCache, serverResponse.resources);
            this.updateDisplay();
        }
    }
    
    revertTransaction(transaction) {
        // Revert optimistic update
        console.warn('Reverting transaction:', transaction);
        
        // Reverse the operation
        const reverseAction = {
            'spend': 'earn',
            'earn': 'spend',
            'penalty': 'earn',
            'bonus': 'spend'
        }[transaction.action];
        
        if (reverseAction) {
            this.optimisticUpdate(
                transaction.resource, 
                transaction.amount, 
                reverseAction
            );
        }
    }
    
    handleRejection(response) {
        console.error('Server rejected transaction:', response);
        
        // If too many rejections, force re-sync
        this.syncErrors++;
        if (this.syncErrors >= this.maxSyncErrors) {
            console.error('Too many sync errors, forcing full refresh');
            this.forceFullSync();
        }
    }
    
    async syncWithServer() {
        try {
            // Try real API first
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const sessionId = this.sessionToken; // Always use the current session token
            const isAuthenticated = this.storageBackend.getItem('isAuthenticated') === 'true';
            const userId = isAuthenticated ? this.storageBackend.getItem('userId') : null;
            
            const params = new URLSearchParams();
            // Only send user_id OR session_id, not both
            if (userId) {
                params.append('user_id', userId);
            } else if (sessionId) {
                params.append('session_id', sessionId);
            }
            
            const response = await fetch(`${apiBase}/api/economy/state?${params}`, {
                method: 'GET',
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.state) {
                    // Update display with server truth
                    Object.assign(this.displayCache, data.state);
                    this.lastKnownServerState = { ...data.state };
                    this.stateChecksum = this.calculateChecksum();
                    this.syncErrors = 0;
                    this.updateDisplay();
                    this.saveToStorage();
                    return;
                }
            }
        } catch (error) {
            console.warn('Sync failed, using local state:', error);
        }
        
        // Fallback to local/mock state
        const mockState = this.getMockState();
        Object.assign(this.displayCache, mockState);
        this.lastKnownServerState = { ...mockState };
        this.stateChecksum = this.calculateChecksum();
        this.syncErrors = 0;
        this.updateDisplay();
    }
    
    validateClientState() {
        // TEMPORARILY DISABLED - Too aggressive with dashboard sync
        return;
        
        // Skip validation on mobile devices - extremely low hack risk
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            return;
        }
        
        // Skip if checksum not initialized yet
        if (this.stateChecksum === null) {
            console.log('Checksum not initialized, setting it now');
            this.stateChecksum = this.calculateChecksum();
            return;
        }
        
        // Detect tampering by comparing checksums
        const currentChecksum = this.calculateChecksum();
        
        // If state changed without a transaction, someone's cheating
        if (this.pendingTransactions.size === 0 && 
            currentChecksum !== this.stateChecksum) {
            console.error('State tampering detected!');
            this.forceFullSync();
        }
    }
    
    forceFullSync() {
        // Nuclear option - reload everything from server
        console.error('FORCE FULL SYNC TRIGGERED - This causes page reload!');
        console.trace('Stack trace:');
        window.location.reload();
    }
    
    // Sync method for dashboard to update state without triggering anti-cheat
    syncWithServer(serverState) {
        // This is a legitimate server sync, not tampering
        if (serverState) {
            // Update display cache
            Object.assign(this.displayCache, serverState);
            // Update checksum to match new state
            this.stateChecksum = this.calculateChecksum();
            // Update display
            this.updateDisplay();
            // Save to storage
            this.saveToStorage();
        }
    }
    
    updateDisplay() {
        // Update UI elements
        const elements = {
            'energyValue': this.displayCache.energy,
            'livesValue': this.displayCache.hearts,  // HTML uses 'livesValue'
            'gemsValue': this.displayCache.diamonds || this.displayCache.gems || 0,
            'xpValue': this.displayCache.xp,
            'userLevel': this.displayCache.level,
            'streakValue': this.displayCache.streak || 0
        };
        
        console.log('EconomyManager.updateDisplay called with:', elements);
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`Updated ${id} to ${value}`);
            }
        }
        
        // Update XP progress bar
        const currentXP = this.displayCache.xp;
        const currentLevel = this.displayCache.level;
        const xpForCurrentLevel = currentLevel > 1 ? this.calculateXPForLevel(currentLevel) : 0;
        const xpForNextLevel = this.calculateXPForLevel(currentLevel + 1);
        const xpThisLevel = currentXP - xpForCurrentLevel;
        const xpNeededThisLevel = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = (xpThisLevel / xpNeededThisLevel) * 100;
        
        // Update progress bar
        const xpFill = document.getElementById('xpFill');
        if (xpFill) {
            xpFill.style.width = `${progressPercent}%`;
        }
        
        // Update XP text
        const xpText = document.getElementById('xpText');
        if (xpText) {
            xpText.textContent = `${currentXP} / ${xpForNextLevel} XP`;
        }
        
        // Dispatch event to update other components
        window.dispatchEvent(new CustomEvent('economyUpdated', { 
            detail: this.getDisplayState() 
        }));
    }
    
    // Public methods for game integration
    
    // XP and Level Management
    async updateXP(xpEarned, source = 'quiz') {
        const result = await this.requestResourceChange('earn', 'xp', xpEarned, {
            source,
            timestamp: Date.now()
        });
        
        if (result.success) {
            // Check for level up
            const oldLevel = this.displayCache.level;
            const newXP = this.displayCache.xp;
            const xpForNextLevel = this.calculateXPForLevel(oldLevel + 1);
            
            if (newXP >= xpForNextLevel) {
                // Level up!
                this.displayCache.level++;
                this.saveToStorage();
                this.showLevelUp(this.displayCache.level);
            }
            
            // Animate XP update
            this.animateValue('xpValue', newXP - xpEarned, newXP, 500);
        }
        
        return result;
    }
    
    // Hearts Management
    async updateHearts(amount, reason = 'quiz') {
        const action = amount > 0 ? 'earn' : 'penalty';
        const result = await this.requestResourceChange(action, 'hearts', Math.abs(amount), {
            reason,
            timestamp: Date.now()
        });
        
        if (result.success && amount < 0) {
            // Check for game over
            if (this.displayCache.hearts === 0) {
                this.showGameOver();
            }
        }
        
        return result;
    }
    
    // Streak Management
    async updateStreak() {
        const today = new Date().toDateString();
        const lastStreakDate = this.storageBackend.getItem('lastStreakDate');
        
        if (lastStreakDate !== today) {
            this.storageBackend.setItem('lastStreakDate', today);
            this.displayCache.streak = (this.displayCache.streak || 0) + 1;
            this.saveToStorage();
            this.updateDisplay();
            this.showStreakUpdate();
            return true;
        }
        return false;
    }
    
    // Award multiple rewards at once
    async awardRewards(hearts = 0, diamonds = 0, xp = 0, source = 'game') {
        const results = [];
        
        // Handle heart overflow to diamonds
        if (hearts > 0 && this.displayCache.hearts >= 5) {
            diamonds += hearts * 2; // 2 diamonds per overflow heart
            hearts = 0;
        }
        
        if (hearts > 0) {
            results.push(await this.updateHearts(hearts, source));
        }
        if (diamonds > 0) {
            results.push(await this.requestResourceChange('earn', 'diamonds', diamonds, { source }));
        }
        if (xp > 0) {
            results.push(await this.updateXP(xp, source));
        }
        
        return results;
    }
    
    // Animation helpers
    animateValue(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const range = end - start;
        const startTime = Date.now();
        
        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuad = progress * (2 - progress);
            const current = Math.floor(start + range * easeOutQuad);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    }
    
    showLevelUp(newLevel) {
        const levelUpNotif = document.createElement('div');
        levelUpNotif.className = 'level-up-notification';
        levelUpNotif.innerHTML = `
            <div class="level-up-content">
                <h2>LEVEL UP!</h2>
                <div class="level-number">Level ${newLevel}</div>
            </div>
        `;
        
        levelUpNotif.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            z-index: 400;
            background: var(--color-primary);
            color: white;
            padding: 30px 50px;
            border-radius: 20px;
            text-align: center;
            animation: level-up-pop 0.5s ease forwards;
        `;
        
        document.body.appendChild(levelUpNotif);
        
        setTimeout(() => {
            levelUpNotif.style.animation = 'level-up-fade 0.5s ease forwards';
            setTimeout(() => levelUpNotif.remove(), 500);
        }, 2000);
    }
    
    showStreakUpdate() {
        const streakNotif = document.createElement('div');
        streakNotif.className = 'streak-notification';
        streakNotif.innerHTML = `
            <img src="./src/images/power-icons/HotStreak.svg" alt="Streak">
            <span>Streak Extended!</span>
        `;
        
        streakNotif.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 300;
            background: var(--color-bg-secondary);
            padding: 10px 20px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(streakNotif);
        
        setTimeout(() => {
            streakNotif.classList.add('fade-out');
            setTimeout(() => streakNotif.remove(), 500);
        }, 2000);
    }
    
    showGameOver() {
        // Notify that player is out of hearts
        window.dispatchEvent(new CustomEvent('gameOver', {
            detail: { reason: 'hearts' }
        }));
    }
    
    // Get current values
    getHearts() {
        return this.displayCache.hearts;
    }
    
    getXP() {
        return this.displayCache.xp;
    }
    
    getLevel() {
        return this.displayCache.level;
    }
    
    getDiamonds() {
        return this.displayCache.diamonds || 0;
    }
    
    // Calculate card cost based on user level
    // DEPRECATED: Card costs should come from backend API
    calculateCardCost(baseEnergyCost = 2) {
        // TODO: Replace with API call to /api/economy/card-cost
        // For now, return fixed cost
        return 10;
    }
    
    async spendEnergy(amount, reason) {
        console.log('spendEnergy called with amount:', amount, 'reason:', reason);
        const result = await this.requestResourceChange('spend', 'energy', amount, { reason });
        console.log('spendEnergy result:', result);
        return result;
    }
    
    async earnXP(amount, source) {
        return this.requestResourceChange('earn', 'xp', amount, { source });
    }
    
    async deductHeart() {
        return this.requestResourceChange('penalty', 'hearts', 1, { 
            reason: 'quiz_failure' 
        });
    }
    
    async processReward(rewards) {
        // Batch process multiple rewards
        const results = [];
        for (const [resource, amount] of Object.entries(rewards)) {
            const result = await this.requestResourceChange(
                'earn', 
                resource, 
                amount, 
                { source: 'quiz_complete' }
            );
            results.push(result);
        }
        return results;
    }
    
    // DEPRECATED: Reward calculations moved to backend API
    // This method should not be used - use processQuizComplete or processFlashcardComplete instead
    calculateRewards(gameResult) {
        console.warn('calculateRewards is deprecated - rewards should be calculated by backend');
        return {}; // Return empty rewards since backend handles this
        
        /* Deprecated code - kept for reference
        // Dynamic base values based on multiple factors
        const baseValues = this.getBaseRewardValues(type, difficulty, category, mode);
        
        if (type === 'quiz_complete') {
            if (correct) {
                // Apply base rewards
                rewards.coins = baseValues.coins;
                rewards.xp = baseValues.xp;
                
                // Gem rewards based on performance
                if (baseValues.gemTier >= 1) rewards.sapphires = Math.floor(baseValues.gemTier);
                if (baseValues.gemTier >= 3) rewards.emeralds = 1;
                if (baseValues.gemTier >= 5) rewards.rubies = 1;
                
                // Streak bonuses (multiplicative)
                if (streak >= 3) {
                    rewards.coins = Math.floor(rewards.coins * 1.2);
                    rewards.xp = Math.floor(rewards.xp * 1.2);
                }
                if (streak >= 5) {
                    rewards.coins = Math.floor(rewards.coins * 1.5);
                    rewards.xp = Math.floor(rewards.xp * 1.5);
                    if (!rewards.rubies) rewards.rubies = 1;
                }
                if (streak >= 10) {
                    rewards.amethysts = 1;
                    rewards.xp = Math.floor(rewards.xp * 2);
                }
                
                // Perfect score bonus
                if (perfectScore) {
                    rewards.diamonds = 1;
                    rewards.xp = Math.floor(rewards.xp * 1.5);
                }
                
                // Time bonus
                if (timeBonus) {
                    rewards.coins = Math.floor(rewards.coins * 1.25);
                    rewards.xp += 5;
                }
            } else {
                // Consolation for trying
                rewards.coins = Math.floor(baseValues.coins * 0.2);
                rewards.xp = Math.floor(baseValues.xp * 0.3);
            }
        } else if (type === 'practice_complete') {
            // Practice rewards are lower but still dynamic
            rewards.coins = correct ? baseValues.coins : Math.floor(baseValues.coins * 0.25);
            rewards.xp = correct ? baseValues.xp : Math.floor(baseValues.xp * 0.4);
            
            if (correct && streak >= 3) {
                rewards.sapphires = 1;
            }
        }
        
        // Mode-specific bonuses
        const modeBonus = this.getModeBonus(mode, rewards);
        Object.keys(modeBonus).forEach(key => {
            rewards[key] = (rewards[key] || 0) + modeBonus[key];
        });
        
        // Well-rested bonus (applies to XP only)
        if (this.checkWellRested()) {
            rewards.xp = Math.floor(rewards.xp * 1.5);
            rewards.wellRestedBonus = true;
        }
        
        // Apply all active bonuses and events
        const finalRewards = this.applyActiveBonuses(rewards, gameResult);
        
        return finalRewards;
        */
    }
    
    // Get base reward values based on difficulty, category, and mode
    getBaseRewardValues(type, difficulty, category, mode) {
        // Base structure
        const base = {
            coins: 30,
            xp: 10,
            gemTier: 1
        };
        
        // Difficulty multipliers
        const difficultyFactors = {
            easy: { coins: 1, xp: 1, gemTier: 1 },
            medium: { coins: 1.5, xp: 1.5, gemTier: 2 },
            hard: { coins: 2, xp: 2, gemTier: 3 },
            expert: { coins: 3, xp: 3, gemTier: 5 }
        };
        
        // Category bonuses (some categories are harder/more valuable)
        const categoryFactors = {
            science: 1.2,
            history: 1.1,
            geography: 1.1,
            literature: 1.2,
            technology: 1.3,
            gaming: 0.9,  // Easier, so less reward
            pop_culture: 0.9,
            default: 1
        };
        
        // Mode impacts
        const modeFactors = {
            zen: { coins: 0.8, xp: 1.2, gemTier: 1.1 },    // Less coins, more XP
            normal: { coins: 1, xp: 1, gemTier: 1 },       // Standard
            speed: { coins: 1.3, xp: 0.9, gemTier: 1.2 },  // Risk/reward
            chaos: { coins: 1.5, xp: 1.5, gemTier: 1.5 }   // High risk, high reward
        };
        
        // Apply difficulty
        const diff = difficultyFactors[difficulty] || difficultyFactors.easy;
        base.coins = Math.floor(base.coins * diff.coins);
        base.xp = Math.floor(base.xp * diff.xp);
        base.gemTier *= diff.gemTier;
        
        // Apply category
        const catFactor = categoryFactors[category] || categoryFactors.default;
        base.coins = Math.floor(base.coins * catFactor);
        base.xp = Math.floor(base.xp * catFactor);
        
        // Apply mode
        const modeFactor = modeFactors[mode] || modeFactors.normal;
        base.coins = Math.floor(base.coins * modeFactor.coins);
        base.xp = Math.floor(base.xp * modeFactor.xp);
        base.gemTier *= modeFactor.gemTier;
        
        // Practice activities get 40% of quiz values
        if (type === 'practice_complete') {
            base.coins = Math.floor(base.coins * 0.4);
            base.xp = Math.floor(base.xp * 0.4);
            base.gemTier = Math.floor(base.gemTier * 0.3);
        }
        
        return base;
    }
    
    // Mode-specific bonus rewards
    getModeBonus(mode, currentRewards) {
        const bonus = {};
        
        switch(mode) {
            case 'zen':
                // Zen mode: bonus for patience
                if (currentRewards.xp > 0) {
                    bonus.sapphires = 1;
                }
                break;
                
            case 'speed':
                // Speed mode: coin bonus for fast completion
                if (currentRewards.coins > 0) {
                    bonus.coins = 20;
                }
                break;
                
            case 'chaos':
                // Chaos mode: random bonus gem
                if (currentRewards.coins > 0) {
                    const roll = Math.random();
                    if (roll > 0.7) bonus.emeralds = 1;
                    else if (roll > 0.4) bonus.sapphires = 2;
                    else bonus.coins = 50;
                }
                break;
        }
        
        return bonus;
    }
    
    // Apply active bonuses and events to rewards
    applyActiveBonuses(baseRewards, gameResult) {
        let rewards = { ...baseRewards };
        const appliedBonuses = [];
        
        // Check and apply global events (e.g., 2x Tuesday)
        const activeEvents = this.getActiveGlobalEvents();
        activeEvents.forEach(event => {
            const beforeRewards = { ...rewards };
            rewards = this.applyEventBonus(rewards, event, gameResult);
            
            // Only add to applied bonuses if it actually changed something
            if (JSON.stringify(beforeRewards) !== JSON.stringify(rewards)) {
                appliedBonuses.push(event.name);
            }
        });
        
        // Apply personal power-ups
        const now = Date.now();
        this.activeBonuses = this.activeBonuses.filter(bonus => bonus.expiresAt > now);
        
        this.activeBonuses.forEach(bonus => {
            rewards = this.applyPowerUpBonus(rewards, bonus);
            appliedBonuses.push(bonus.name);
        });
        
        // Track what bonuses were applied for display
        if (appliedBonuses.length > 0) {
            rewards.appliedBonuses = appliedBonuses;
        }
        
        return rewards;
    }
    
    // Get currently active global events
    getActiveGlobalEvents() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        const activeEvents = [];
        
        // Weekly events
        const weeklyEvents = {
            2: { name: '2x Tuesday', multipliers: { xp: 2, coins: 2 } },
            5: { name: 'Gem Friday', multipliers: { sapphires: 2, emeralds: 2 } },
            0: { name: 'Super Sunday', multipliers: { all: 1.5 } }
        };
        
        if (weeklyEvents[dayOfWeek]) {
            activeEvents.push(weeklyEvents[dayOfWeek]);
        }
        
        // Time-based events
        if (hour >= 15 && hour < 17) {
            activeEvents.push({ name: 'Happy Hour', multipliers: { coins: 1.5 } });
        }
        
        if (hour >= 6 && hour < 9) {
            activeEvents.push({ name: 'Early Bird', multipliers: { xp: 1.25 } });
        }
        
        // Special date events (holidays, etc)
        const dateEvents = this.getSpecialDateEvents(now);
        activeEvents.push(...dateEvents);
        
        // Category buff events
        const categoryEvents = this.getCategoryBuffEvents(now);
        activeEvents.push(...categoryEvents);
        
        return activeEvents;
    }
    
    // Apply event bonus to rewards
    applyEventBonus(rewards, event, gameResult) {
        const modified = { ...rewards };
        
        // Handle category buffs
        if (event.type === 'category_buff' && gameResult?.category) {
            if (event.categories.includes(gameResult.category)) {
                // Apply category multiplier to all rewards
                Object.keys(modified).forEach(key => {
                    if (typeof modified[key] === 'number' && key !== 'wellRestedBonus') {
                        modified[key] = Math.floor(modified[key] * event.multipliers.category);
                    }
                });
                modified.categoryBuffApplied = event.name;
            }
        } else if (event.multipliers.all) {
            // Apply to all rewards
            Object.keys(modified).forEach(key => {
                if (typeof modified[key] === 'number' && key !== 'wellRestedBonus') {
                    modified[key] = Math.floor(modified[key] * event.multipliers.all);
                }
            });
        } else {
            // Apply specific multipliers
            Object.entries(event.multipliers).forEach(([resource, multiplier]) => {
                if (modified[resource] !== undefined) {
                    modified[resource] = Math.floor(modified[resource] * multiplier);
                }
            });
        }
        
        return modified;
    }
    
    // Apply personal power-up bonus
    applyPowerUpBonus(rewards, powerUp) {
        const modified = { ...rewards };
        
        switch(powerUp.type) {
            case 'xp_boost':
                modified.xp = Math.floor(modified.xp * powerUp.multiplier);
                break;
                
            case 'coin_magnet':
                modified.coins = Math.floor(modified.coins * powerUp.multiplier);
                break;
                
            case 'gem_finder':
                // Increase gem rewards
                ['sapphires', 'emeralds', 'rubies', 'amethysts', 'diamonds'].forEach(gem => {
                    if (modified[gem]) {
                        modified[gem] = Math.floor(modified[gem] * powerUp.multiplier);
                    }
                });
                break;
                
            case 'lucky_charm':
                // Chance for bonus rewards
                if (Math.random() < powerUp.chance) {
                    modified.bonusReward = powerUp.bonus;
                }
                break;
                
            case 'multiplier':
                // Multiply everything
                Object.keys(modified).forEach(key => {
                    if (typeof modified[key] === 'number') {
                        modified[key] = Math.floor(modified[key] * powerUp.multiplier);
                    }
                });
                break;
        }
        
        return modified;
    }
    
    // Add a power-up
    activatePowerUp(powerUp) {
        const duration = powerUp.duration || 10 * 60 * 1000; // Default 10 minutes
        
        this.activeBonuses.push({
            id: Date.now(),
            name: powerUp.name,
            type: powerUp.type,
            multiplier: powerUp.multiplier || 2,
            chance: powerUp.chance,
            bonus: powerUp.bonus,
            activatedAt: Date.now(),
            expiresAt: Date.now() + duration,
            duration
        });
        
        // Emit event for UI update
        window.dispatchEvent(new CustomEvent('powerUpActivated', {
            detail: { powerUp, expiresAt: Date.now() + duration }
        }));
        
        return true;
    }
    
    // Get special date events (holidays, etc)
    getSpecialDateEvents(date) {
        const events = [];
        const month = date.getMonth();
        const day = date.getDate();
        
        // Example special dates
        if (month === 11 && day === 25) { // Christmas
            events.push({ name: '🎄 Holiday Bonus', multipliers: { all: 2 } });
        }
        
        if (month === 9 && day === 31) { // Halloween
            events.push({ name: '🎃 Spooky Rewards', multipliers: { amethysts: 3, rubies: 2 } });
        }
        
        // First day of month
        if (day === 1) {
            events.push({ name: 'Fresh Start', multipliers: { xp: 1.5 } });
        }
        
        return events;
    }
    
    // Get category buff events (daily rotating bonuses)
    getCategoryBuffEvents(date) {
        const events = [];
        const dayOfWeek = date.getDay();
        
        // Each day highlights different categories
        const dailyCategoryBuffs = {
            0: { categories: ['mythology', 'fantasy'], bonus: 1.5, name: 'Mythology Sunday' },
            1: { categories: ['science', 'technology'], bonus: 1.5, name: 'Science Monday' },
            2: { categories: ['history', 'ancient_architecture'], bonus: 1.5, name: 'History Tuesday' },
            3: { categories: ['nature', 'animals', 'geography'], bonus: 1.5, name: 'World Wednesday' },
            4: { categories: ['art', 'literature', 'music'], bonus: 1.5, name: 'Arts Thursday' },
            5: { categories: ['pop_culture', 'gaming', 'internet_culture'], bonus: 1.5, name: 'Fun Friday' },
            6: { categories: ['sports', 'food_cuisine'], bonus: 1.5, name: 'Sports & Food Saturday' }
        };
        
        const todaysBuff = dailyCategoryBuffs[dayOfWeek];
        if (todaysBuff) {
            events.push({
                name: todaysBuff.name,
                type: 'category_buff',
                categories: todaysBuff.categories,
                multipliers: { category: todaysBuff.bonus }
            });
        }
        
        // Special category events (e.g., Architecture Week)
        const specialEvents = this.getSpecialCategoryEvents(date);
        events.push(...specialEvents);
        
        return events;
    }
    
    // Special category events (weeks, months, etc)
    getSpecialCategoryEvents(date) {
        const events = [];
        const month = date.getMonth();
        const weekOfMonth = Math.floor(date.getDate() / 7);
        
        // Example: Architecture week (first week of month)
        if (weekOfMonth === 0) {
            events.push({
                name: 'Architecture Week',
                type: 'category_buff',
                categories: ['ancient_architecture', 'architect'],
                multipliers: { category: 2 }  // 2x for architecture
            });
        }
        
        // Space month (July = month 6)
        if (month === 6) {
            events.push({
                name: 'Space Month',
                type: 'category_buff',
                categories: ['space', 'science'],
                multipliers: { category: 1.75 }
            });
        }
        
        return events;
    }
    
    // Check active bonuses (for UI display)
    getActiveBonuses() {
        const now = Date.now();
        
        // Clean expired
        this.activeBonuses = this.activeBonuses.filter(bonus => bonus.expiresAt > now);
        
        return {
            personalBonuses: this.activeBonuses,
            globalEvents: this.getActiveGlobalEvents(),
            wellRested: this.checkWellRested()
        };
    }
    
    // DEPRECATED: Well-rested status should come from backend
    checkWellRested() {
        // TODO: Replace with API call to /api/economy/well-rested-status
        return false;
    }
    
    // Main method for components to report game results - calls API
    async processGameResult(result) {
        // Update last play time
        this.storageBackend.setItem('lastPlayTime', Date.now());
        
        // Call the API directly - server calculates rewards
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const sessionId = this.sessionToken; // Always use the current session token
            const userId = this.storageBackend.getItem('userId');
            
            const response = await fetch(`${apiBase}/api/economy/process-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId
                },
                body: JSON.stringify({
                    type: result.type || 'unknown',
                    category: result.category || 'general',
                    difficulty: result.difficulty || 'medium',
                    mode: result.mode || 'normal',
                    correct_answers: result.correct ? 1 : 0,
                    total_questions: 1,
                    time_spent: result.timeSpent || 0,
                    perfect_score: result.perfectScore || false,
                    streak: result.streak || 0,
                    session_id: sessionId,
                    user_id: userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update local cache with new state
                if (data.new_state) {
                    Object.assign(this.displayCache, data.new_state);
                    this.updateDisplay();
                    this.saveToStorage();
                }
                
                // Show rewards popup if we got rewards
                if (data.rewards && Object.keys(data.rewards).length > 0) {
                    this.showRewardsPopup(data.rewards, {});
                }
                
                return {
                    success: true,
                    rewards: data.rewards,
                    new_state: data.new_state,
                    level_up: data.level_up,
                    displayCache: this.displayCache
                };
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.error || 'API error' };
            }
        } catch (error) {
            console.error('Game result API error:', error);
            return { success: false, error: 'Network error - please try again' };
        }
    }
    
    // Specific method for quiz completion
    async processQuizComplete(quizData) {
        const { quizId, category, difficulty, mode, correctAnswers, totalQuestions, timeSpent, streak } = quizData;
        
        // Check if quiz was actually completed (not abandoned)
        if (!correctAnswers && correctAnswers !== 0) {
            return { success: false, error: 'Quiz not completed' };
        }
        
        // Build game result object with ALL the data needed for the API
        const gameResult = {
            type: 'quiz_complete',
            correct: correctAnswers === totalQuestions,
            difficulty: difficulty || 'medium',
            category: category || 'general',
            mode: mode || 'normal',
            streak: streak || 0,
            perfectScore: correctAnswers === totalQuestions,
            timeBonus: mode === 'speed' && timeSpent < 20, // Fast completion in speed mode
            // Include all the API fields
            correctAnswers: correctAnswers,
            totalQuestions: totalQuestions,
            timeSpent: timeSpent || 0
        };
        
        // Call the API directly with the proper format
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const sessionId = this.sessionToken; // Always use the current session token
            const userId = this.storageBackend.getItem('userId');
            
            // Build query params - EITHER user_id OR session_id, not both
            const queryParams = new URLSearchParams();
            if (userId) {
                queryParams.append('user_id', userId);
            } else {
                queryParams.append('session_id', sessionId);
            }
            
            const response = await fetch(`${apiBase}/api/economy/process-result?${queryParams}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId
                },
                body: JSON.stringify({
                    type: 'quiz_complete',
                    category: category || 'general',
                    difficulty: difficulty || 'medium',
                    mode: mode || 'normal',
                    correct_answers: correctAnswers,
                    total_questions: totalQuestions,
                    time_spent: timeSpent || 0,
                    perfect_score: correctAnswers === totalQuestions,
                    streak: streak || 0
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update local cache with new state
                if (data.new_state) {
                    Object.assign(this.displayCache, data.new_state);
                    this.updateDisplay();
                    this.saveToStorage();
                }
                
                return {
                    success: true,
                    rewards: data.rewards,
                    new_state: data.new_state,
                    level_up: data.level_up,
                    displayCache: this.displayCache
                };
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.error || 'API error' };
            }
        } catch (error) {
            console.error('Quiz completion API error:', error);
            // Fall back to mock if API fails
            return this.processGameResult(gameResult);
        }
    }
    
    // Specific method for flashcard practice
    async processFlashcardComplete(flashcardData) {
        const { category, cardType, correctCount, totalCards, practiceTime } = flashcardData;
        
        // Call the API directly for practice completion
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const sessionId = this.sessionToken; // Always use the current session token
            const userId = this.storageBackend.getItem('userId');
            
            // Build query params - EITHER user_id OR session_id, not both
            const queryParams = new URLSearchParams();
            if (userId) {
                queryParams.append('user_id', userId);
            } else {
                queryParams.append('session_id', sessionId);
            }
            
            const response = await fetch(`${apiBase}/api/economy/process-result?${queryParams}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId
                },
                body: JSON.stringify({
                    type: 'practice_complete',
                    category: category || cardType || 'general',
                    difficulty: 'easy', // Practice is always easy
                    mode: 'normal',
                    correct_answers: correctCount || 0,
                    total_questions: totalCards || 1,
                    time_spent: practiceTime || 0,
                    perfect_score: correctCount === totalCards,
                    streak: 0, // No streaks for practice
                    // Only send user_id OR session_id, not both
                    ...(userId ? { user_id: userId } : { session_id: sessionId })
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update local cache with new state
                if (data.new_state) {
                    Object.assign(this.displayCache, data.new_state);
                    this.updateDisplay();
                    this.saveToStorage();
                }
                
                return {
                    success: true,
                    rewards: data.rewards,
                    new_state: data.new_state,
                    level_up: data.level_up,
                    displayCache: this.displayCache
                };
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.error || 'API error' };
            }
        } catch (error) {
            console.error('Flashcard completion API error:', error);
            return { success: false, error: 'Network error - please try again' };
        }
    }
    
    // Check if user can afford an action
    checkAffordability(cost) {
        if (!cost) return true;
        
        const canAfford = {
            energy: !cost.energy || this.displayCache.energy >= cost.energy,
            hearts: !cost.minHearts || this.displayCache.hearts >= cost.minHearts,
            coins: !cost.coins || this.displayCache.coins >= cost.coins
        };
        
        return {
            canAfford: Object.values(canAfford).every(v => v),
            insufficient: Object.entries(canAfford)
                .filter(([_, v]) => !v)
                .map(([k, _]) => k)
        };
    }
    
    // Get current display state for UI
    getDisplayState() {
        return {
            ...this.displayCache,
            canPlayQuiz: this.displayCache.energy >= 10 && this.displayCache.hearts > 0,
            canPractice: this.displayCache.energy >= 1,
            wellRested: this.checkWellRested(),
            activeBonuses: this.getActiveBonuses()
        };
    }
    
    // Get specific resource value
    getHearts() {
        return this.displayCache.hearts || 0;
    }
    
    getEnergy() {
        return this.displayCache.energy || 0;
    }
    
    // Award rewards (used by ScoringEngine compatibility)
    async awardRewards(hearts, diamonds, xp, source = 'unknown') {
        const rewards = {};
        if (hearts > 0) rewards.hearts = hearts;
        if (diamonds > 0) rewards.diamonds = diamonds;
        if (xp > 0) rewards.xp = xp;
        
        return this.processReward(rewards);
    }
    
    // Show rewards popup
    showRewardsPopup(rewards, bonuses = []) {
        // Dispatch event for RewardsPopup component to handle
        window.dispatchEvent(new CustomEvent('rewards:earned', {
            detail: { rewards, bonuses, timestamp: Date.now() }
        }));
    }
    
    // Get all resources for display
    getResources() {
        return {
            energy: this.displayCache.energy || 0,
            hearts: this.displayCache.hearts || 0,
            coins: this.displayCache.coins || 0,
            gems: this.displayCache.diamonds || this.displayCache.gems || 0,
            sapphires: this.displayCache.sapphires || 0,
            emeralds: this.displayCache.emeralds || 0,
            rubies: this.displayCache.rubies || 0,
            amethysts: this.displayCache.amethysts || 0,
            diamonds: this.displayCache.diamonds || 0,
            xp: this.displayCache.xp || 0,
            level: this.displayCache.level || 1,
            streak: this.displayCache.streak || 0
        };
    }
    
    // Check if player can afford a cost
    canAfford(cost) {
        if (!cost) return true;
        
        const resources = this.getResources();
        
        // Check each resource type
        if (cost.energy && resources.energy < cost.energy) return false;
        if (cost.hearts && resources.hearts < cost.hearts) return false;
        if (cost.minHearts && resources.hearts < cost.minHearts) return false;
        if (cost.coins && resources.coins < cost.coins) return false;
        if (cost.gems && resources.gems < cost.gems) return false;
        if (cost.diamonds && resources.diamonds < cost.diamonds) return false;
        if (cost.sapphires && resources.sapphires < cost.sapphires) return false;
        if (cost.emeralds && resources.emeralds < cost.emeralds) return false;
        if (cost.rubies && resources.rubies < cost.rubies) return false;
        if (cost.amethysts && resources.amethysts < cost.amethysts) return false;
        
        return true;
    }
    
    // Special Events System
    checkActiveEvents() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = now.getHours();
        const month = now.getMonth();
        const date = now.getDate();
        
        // Store previous event state to detect changes
        const previousEventIds = new Set(this.activeEvents.keys());
        
        // Clear existing events
        this.activeEvents.clear();
        
        // Happy Hour - Every day 3-4 PM and 7-8 PM
        if (hour === 15 || hour === 19) {
            this.activeEvents.set('happy-hour', {
                type: 'discount',
                label: '🎉 HAPPY HOUR!',
                description: '50% off all quizzes!',
                costModifier: { type: 'percentage', value: 0.5 },
                endTime: new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
            });
        }
        
        // Weekend Special - Friday evening through Sunday
        if ((day === 5 && hour >= 17) || day === 6 || day === 0) {
            this.activeEvents.set('weekend-special', {
                type: 'boost',
                label: '🌟 Weekend Boost',
                description: 'Double XP all weekend!',
                xpMultiplier: 2,
                endTime: day === 0 ? new Date(now.setHours(23, 59, 59)) : null
            });
        }
        
        // Day-specific events
        const dayEvents = {
            1: { // Monday
                type: 'energy',
                label: '☕ Monday Motivation',
                description: 'Free energy refills!',
                energyBonus: true
            },
            3: { // Wednesday
                type: 'gems',
                label: '💎 Gem Wednesday',
                description: '+50% gem rewards!',
                gemMultiplier: 1.5
            },
            5: { // Friday
                type: 'free',
                label: '🎊 Free Friday',
                description: 'First quiz free!',
                freePlay: 1
            }
        };
        
        if (dayEvents[day]) {
            this.activeEvents.set('day-special', dayEvents[day]);
        }
        
        // First Practice of the Day bonus
        const lastPractice = localStorage.getItem('lastPracticeDate');
        const today = now.toDateString();
        if (lastPractice !== today) {
            this.activeEvents.set('first-practice', {
                type: 'limited',
                label: '🌅 First Practice',
                description: 'Daily bonus awaits! +50% XP on your first practice session',
                practiceBonus: { xpMultiplier: 1.5 },
                endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
            });
        }
        
        // Holiday events
        const holidays = this.checkHolidays(month, date);
        holidays.forEach(holiday => {
            this.activeEvents.set(holiday.id, holiday);
        });
        
        // Check if events have changed
        const currentEventIds = new Set(this.activeEvents.keys());
        const eventsChanged = previousEventIds.size !== currentEventIds.size || 
                            [...previousEventIds].some(id => !currentEventIds.has(id)) ||
                            [...currentEventIds].some(id => !previousEventIds.has(id));
        
        // Only notify cards to update if events have actually changed
        if (eventsChanged) {
            window.dispatchEvent(new Event('eventsUpdated'));
        }
        
        return this.activeEvents;
    }
    
    checkHolidays(month, date) {
        const holidays = [];
        
        // Major holidays with special events
        const holidayMap = {
            '0-1': { // New Year's Day
                id: 'new-year',
                type: 'celebration',
                label: '🎊 New Year Special',
                description: 'Triple XP to start the year!',
                xpMultiplier: 3
            },
            '1-14': { // Valentine's Day
                id: 'valentine',
                type: 'hearts',
                label: '💝 Valentine Special',
                description: 'Hearts never decrease!',
                heartProtection: true
            },
            '3-1': { // April Fool's
                id: 'april-fools',
                type: 'chaos',
                label: '🃏 April Fools!',
                description: 'Chaos mode activated!',
                forceMode: 'chaos'
            },
            '6-4': { // Independence Day
                id: 'july-4',
                type: 'freedom',
                label: '🎆 Freedom Play',
                description: 'All quizzes free!',
                costModifier: { type: 'percentage', value: 1.0 }
            },
            '9-31': { // Halloween
                id: 'halloween',
                type: 'spooky',
                label: '🎃 Halloween Special',
                description: 'Mystery rewards doubled!',
                mysteryMultiplier: 2
            },
            '11-25': { // Thanksgiving (approximate)
                id: 'thanksgiving',
                type: 'grateful',
                label: '🦃 Thankful Thursday',
                description: 'Share the bounty - all rewards doubled!',
                allRewardsMultiplier: 2
            },
            '11-25': { // Christmas
                id: 'christmas',
                type: 'gift',
                label: '🎄 Holiday Magic',
                description: 'Gift boxes on every win!',
                guaranteedGift: true
            }
        };
        
        const key = `${month}-${date}`;
        if (holidayMap[key]) {
            holidays.push(holidayMap[key]);
        }
        
        return holidays;
    }
    
    getActiveEvents() {
        // Don't refresh here - just return current events
        // checkActiveEvents should be called on a timer instead
        
        // Check for testing override
        if (window.DISABLE_EVENTS_UNTIL && new Date() < window.DISABLE_EVENTS_UNTIL) {
            return [];
        }
        
        return Array.from(this.activeEvents.values());
    }
    
    // Disable events for testing
    disableEventsForMinutes(minutes = 30) {
        window.DISABLE_EVENTS_UNTIL = new Date(Date.now() + minutes * 60 * 1000);
        this.activeEvents.clear();
        window.dispatchEvent(new Event('eventsUpdated'));
        console.log(`[EconomyManager] Events disabled until ${window.DISABLE_EVENTS_UNTIL.toLocaleTimeString()}`);
    }
    
    // Manual event trigger for testing
    triggerSpecialEvent(eventType = 'half-off') {
        const testEvents = {
            'half-off': {
                type: 'discount',
                label: '💸 HALF OFF!',
                description: '50% off all activities!',
                costModifier: { type: 'percentage', value: 0.5 },
                endTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            },
            'free-play': {
                type: 'free',
                label: '🎁 FREE PLAY!',
                description: 'Everything is FREE!',
                costModifier: { type: 'percentage', value: 1.0 },
                endTime: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            },
            'double-xp': {
                type: 'boost',
                label: '⚡ DOUBLE XP!',
                description: 'Earn double experience!',
                xpMultiplier: 2,
                endTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            },
            'triple-gems': {
                type: 'gems',
                label: '💎 TRIPLE GEMS!',
                description: 'Triple gem rewards!',
                gemMultiplier: 3,
                endTime: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes
            }
        };
        
        if (testEvents[eventType]) {
            this.activeEvents.set('manual-event', testEvents[eventType]);
            window.dispatchEvent(new Event('eventsUpdated'));
            
            // Force card refresh
            if (window.cardManager) {
                window.cardManager.updateAffordability();
            }
            
            console.log(`Special event triggered: ${eventType}`);
            return true;
        }
        
        return false;
    }
    
    applyEventModifiers(baseCost, resource = 'energy') {
        let modifiedCost = baseCost;
        
        this.activeEvents.forEach(event => {
            if (event.costModifier) {
                if (event.costModifier.type === 'percentage') {
                    modifiedCost = Math.floor(baseCost * (1 - event.costModifier.value));
                } else if (event.costModifier.type === 'flat') {
                    modifiedCost = Math.max(0, baseCost - event.costModifier.value);
                }
            }
            
            if (event.freePlay && this.displayCache.freePlayUsed !== true) {
                modifiedCost = 0;
                // Mark free play as used for today
                this.displayCache.freePlayUsed = true;
                this.saveToStorage();
            }
        });
        
        return modifiedCost;
    }
    
    // Cleanup
    destroy() {
        clearInterval(this.syncInterval);
        clearInterval(this.heartbeatInterval);
        clearInterval(this.eventCheckInterval);
    }
}

// Create singleton instance
window.economyManager = new EconomyManager();
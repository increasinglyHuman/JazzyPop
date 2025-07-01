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
        // Display cache only - real data lives on server
        this.displayCache = {
            energy: 0,
            hearts: 0,
            gems: 0,
            crystals: 0,
            shards: 0,
            xp: 0,
            level: 1,
            lastSync: Date.now()
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
        
        // Initialize
        this.init();
    }
    
    async init() {
        console.log('EconomyManager initializing with security measures...');
        
        // Sync with server immediately
        await this.syncWithServer();
        
        // Set up periodic sync (every 30 seconds)
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30000);
        
        // Set up heartbeat (detect tampering)
        this.heartbeatInterval = setInterval(() => {
            this.validateClientState();
        }, 5000);
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
            const response = await this.sendToServer(transaction);
            
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
        const validResources = ['energy', 'hearts', 'gems', 'crystals', 'shards', 'xp'];
        return validResources.includes(resource);
    }
    
    isValidAmount(amount, resource) {
        // Basic validation
        if (typeof amount !== 'number' || isNaN(amount)) return false;
        if (amount < 0) return false;
        
        // Resource-specific limits
        const maxValues = {
            energy: 1000,
            hearts: 10,
            gems: 10000,
            crystals: 100000,
            shards: 1000000,
            xp: 1000000
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
        // In production, this would be a real API call
        // For now, simulate with localStorage (to be replaced)
        
        console.log('Sending transaction to server:', transaction);
        
        // MOCK API RESPONSE FOR TESTING
        // TODO: Replace with actual API call
        return this.mockServerResponse(transaction);
    }
    
    // TEMPORARY: Mock server responses for testing
    async mockServerResponse(transaction) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get current mock state from localStorage
        const mockState = this.getMockState();
        
        // Validate transaction
        const validation = this.validateMockTransaction(transaction, mockState);
        if (!validation.success) {
            return { success: false, error: validation.error };
        }
        
        // Apply transaction
        const newState = this.applyMockTransaction(transaction, mockState);
        
        // Save new state
        this.saveMockState(newState);
        
        // Return success with new values
        return {
            success: true,
            resources: newState,
            newValue: newState[transaction.resource],
            transactionId: transaction.id,
            serverTime: Date.now()
        };
    }
    
    getMockState() {
        const saved = localStorage.getItem('jazzypop_mock_economy');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Initial state
        return {
            energy: 100,
            hearts: 5,
            gems: 20,
            crystals: 100,
            shards: 500,
            xp: 0,
            level: 1
        };
    }
    
    saveMockState(state) {
        localStorage.setItem('jazzypop_mock_economy', JSON.stringify(state));
    }
    
    validateMockTransaction(transaction, state) {
        const { action, resource, amount } = transaction;
        
        // Check if enough resources for spend/penalty
        if (action === 'spend' || action === 'penalty') {
            if (state[resource] < amount) {
                return { success: false, error: 'Insufficient resources' };
            }
        }
        
        // Validate energy regen timing
        if (action === 'regen' && resource === 'energy') {
            const lastRegen = localStorage.getItem('jazzypop_last_regen') || 0;
            const timeSinceRegen = Date.now() - parseInt(lastRegen);
            if (timeSinceRegen < 8 * 60 * 60 * 1000) { // 8 hours
                return { success: false, error: 'Regen not available yet' };
            }
        }
        
        return { success: true };
    }
    
    applyMockTransaction(transaction, state) {
        const { action, resource, amount } = transaction;
        const newState = { ...state };
        
        switch (action) {
            case 'spend':
            case 'penalty':
                newState[resource] = Math.max(0, state[resource] - amount);
                break;
                
            case 'earn':
            case 'regen':
            case 'bonus':
                newState[resource] = state[resource] + amount;
                break;
        }
        
        // Handle XP to level conversion
        if (resource === 'xp') {
            const xpForNextLevel = this.calculateXPForLevel(state.level + 1);
            if (newState.xp >= xpForNextLevel) {
                newState.level++;
                console.log('LEVEL UP! Now level', newState.level);
            }
        }
        
        // Track regen timing
        if (action === 'regen' && resource === 'energy') {
            localStorage.setItem('jazzypop_last_regen', Date.now());
        }
        
        return newState;
    }
    
    calculateXPForLevel(level) {
        // Level 1: 0 XP
        // Level 2: 100 XP
        // Level 3: 250 XP (+150)
        // Level 4: 450 XP (+200)
        // Formula: sum of 50 + (50 * n) for n from 1 to level-1
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += 50 + (50 * i);
        }
        return total;
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
            // MOCK SYNC FOR TESTING
            // TODO: Replace with real API call
            const mockState = this.getMockState();
            
            // Update display with mock state
            Object.assign(this.displayCache, mockState);
            this.lastKnownServerState = { ...mockState };
            this.stateChecksum = this.calculateChecksum();
            this.syncErrors = 0;
            this.updateDisplay();
            
            console.log('Synced with mock server:', mockState);
            
            /* PRODUCTION CODE (commented for now):
            const response = await fetch(`${window.API_URL}/api/economy/sync`, {
                method: 'GET',
                headers: {
                    'X-Session-Token': this.sessionToken
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update display with server truth
                Object.assign(this.displayCache, data.resources);
                this.lastKnownServerState = { ...data.resources };
                this.stateChecksum = data.checksum;
                this.syncErrors = 0; // Reset error count
                this.updateDisplay();
            }
            */
        } catch (error) {
            console.error('Sync failed:', error);
            this.syncErrors++;
        }
    }
    
    validateClientState() {
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
        window.location.reload();
    }
    
    updateDisplay() {
        // Update UI elements
        const elements = {
            'energyValue': this.displayCache.energy,
            'livesValue': this.displayCache.hearts,  // HTML uses 'livesValue'
            'gemsValue': this.displayCache.gems,
            'userLevel': this.displayCache.level
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
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
    }
    
    // Public methods for game integration
    async spendEnergy(amount, reason) {
        return this.requestResourceChange('spend', 'energy', amount, { reason });
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
    
    // Cleanup
    destroy() {
        clearInterval(this.syncInterval);
        clearInterval(this.heartbeatInterval);
    }
}

// Create singleton instance
window.economyManager = new EconomyManager();
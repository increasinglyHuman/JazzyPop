/**
 * StateManager - Global state management for JazzyPop
 * Provides reactive state with persistence and history
 */
export class StateManager {
    constructor(config = {}) {
        this.state = {};
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = config.maxHistorySize || 50;
        this.persistKey = config.persistKey || 'jazzypop_state';
        this.debug = config.debug || false;
        
        // Load persisted state
        if (config.persist !== false) {
            this.loadPersistedState();
        }
        
        // State change queue for batching
        this.updateQueue = [];
        this.isProcessing = false;
    }
    
    /**
     * Get state value by path
     */
    get(path) {
        if (!path) return { ...this.state };
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * Set state value
     */
    set(path, value, options = {}) {
        const update = typeof path === 'object' 
            ? path 
            : { [path]: value };
        
        const updateOptions = typeof path === 'object' 
            ? value 
            : options;
        
        // Add to queue
        this.updateQueue.push({ update, options: updateOptions });
        
        // Process queue
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    /**
     * Process update queue
     */
    async processQueue() {
        if (this.updateQueue.length === 0) return;
        
        this.isProcessing = true;
        
        // Batch updates
        const updates = {};
        const options = {};
        
        while (this.updateQueue.length > 0) {
            const { update, options: updateOptions } = this.updateQueue.shift();
            Object.assign(updates, update);
            Object.assign(options, updateOptions);
        }
        
        // Apply updates
        await this.applyUpdates(updates, options);
        
        this.isProcessing = false;
        
        // Process any new updates that came in
        if (this.updateQueue.length > 0) {
            this.processQueue();
        }
    }
    
    /**
     * Apply state updates
     */
    async applyUpdates(updates, options = {}) {
        const oldState = { ...this.state };
        
        // Apply middleware
        let finalUpdates = updates;
        for (const middleware of this.middleware) {
            finalUpdates = await middleware({
                updates: finalUpdates,
                currentState: this.state,
                options
            });
        }
        
        // Apply updates to state
        Object.entries(finalUpdates).forEach(([path, value]) => {
            this.setByPath(path, value);
        });
        
        // Create change record
        const changes = this.detectChanges(oldState, this.state);
        
        if (changes.length === 0) return;
        
        // Add to history
        if (!options.skipHistory) {
            this.addToHistory({
                changes,
                timestamp: Date.now(),
                metadata: options.metadata
            });
        }
        
        // Notify subscribers
        this.notifySubscribers(changes);
        
        // Persist state
        if (!options.skipPersist) {
            this.persistState();
        }
        
        if (this.debug) {
            console.log('[StateManager] State updated:', changes);
        }
    }
    
    /**
     * Set value by path (supports nested paths)
     */
    setByPath(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let target = this.state;
        
        // Create nested objects if needed
        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(path, handler, options = {}) {
        const subscription = {
            path,
            handler,
            options
        };
        
        const id = this.generateId();
        this.subscribers.set(id, subscription);
        
        // Call handler immediately if requested
        if (options.immediate) {
            handler(this.get(path), undefined, []);
        }
        
        // Return unsubscribe function
        return () => this.subscribers.delete(id);
    }
    
    /**
     * Watch specific paths for changes
     */
    watch(paths, handler) {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        const unsubscribes = [];
        
        pathArray.forEach(path => {
            unsubscribes.push(this.subscribe(path, handler));
        });
        
        return () => unsubscribes.forEach(unsub => unsub());
    }
    
    /**
     * Create computed value
     */
    computed(getter, dependencies = []) {
        let cachedValue;
        let isStale = true;
        
        // Subscribe to dependencies
        dependencies.forEach(dep => {
            this.subscribe(dep, () => {
                isStale = true;
            });
        });
        
        return () => {
            if (isStale) {
                cachedValue = getter(this.state);
                isStale = false;
            }
            return cachedValue;
        };
    }
    
    /**
     * Add middleware
     */
    use(middleware) {
        this.middleware.push(middleware);
    }
    
    /**
     * Time travel through history
     */
    goto(index) {
        if (index < 0 || index >= this.history.length) {
            throw new Error('Invalid history index');
        }
        
        // Reconstruct state at point in history
        const targetEntry = this.history[index];
        
        // This is simplified - in production you'd rebuild from initial state
        this.set(targetEntry.state, { 
            skipHistory: true,
            metadata: { source: 'timeTravel' }
        });
    }
    
    /**
     * Reset state
     */
    reset(newState = {}) {
        const oldState = { ...this.state };
        this.state = newState;
        
        const changes = this.detectChanges(oldState, this.state);
        
        this.history = [];
        this.notifySubscribers(changes);
        this.persistState();
    }
    
    /**
     * Create a scoped state manager
     */
    scope(namespace) {
        const scopedManager = {
            get: (path) => this.get(`${namespace}${path ? `.${path}` : ''}`),
            
            set: (path, value, options) => {
                if (typeof path === 'object') {
                    const scopedUpdate = {};
                    Object.entries(path).forEach(([key, val]) => {
                        scopedUpdate[`${namespace}.${key}`] = val;
                    });
                    this.set(scopedUpdate, value);
                } else {
                    this.set(`${namespace}.${path}`, value, options);
                }
            },
            
            subscribe: (path, handler, options) =>
                this.subscribe(`${namespace}${path ? `.${path}` : ''}`, handler, options),
            
            watch: (paths, handler) => {
                const scopedPaths = Array.isArray(paths)
                    ? paths.map(p => `${namespace}.${p}`)
                    : `${namespace}.${paths}`;
                return this.watch(scopedPaths, handler);
            }
        };
        
        return scopedManager;
    }
    
    /**
     * Private methods
     */
    detectChanges(oldState, newState, path = '') {
        const changes = [];
        
        const allKeys = new Set([
            ...Object.keys(oldState),
            ...Object.keys(newState)
        ]);
        
        allKeys.forEach(key => {
            const fullPath = path ? `${path}.${key}` : key;
            const oldValue = oldState[key];
            const newValue = newState[key];
            
            if (oldValue !== newValue) {
                if (typeof newValue === 'object' && newValue !== null && 
                    typeof oldValue === 'object' && oldValue !== null) {
                    // Recursive check for nested objects
                    changes.push(...this.detectChanges(oldValue, newValue, fullPath));
                } else {
                    changes.push({
                        path: fullPath,
                        oldValue,
                        newValue
                    });
                }
            }
        });
        
        return changes;
    }
    
    notifySubscribers(changes) {
        this.subscribers.forEach(({ path, handler, options }) => {
            const relevantChanges = changes.filter(change => {
                if (options.deep) {
                    return change.path.startsWith(path);
                }
                return change.path === path;
            });
            
            if (relevantChanges.length > 0) {
                const currentValue = this.get(path);
                const oldValue = relevantChanges[0].oldValue;
                
                try {
                    handler(currentValue, oldValue, relevantChanges);
                } catch (error) {
                    console.error('[StateManager] Error in subscriber:', error);
                }
            }
        });
    }
    
    addToHistory(entry) {
        this.history.push({
            ...entry,
            state: { ...this.state }
        });
        
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    persistState() {
        try {
            const serialized = JSON.stringify(this.state);
            localStorage.setItem(this.persistKey, serialized);
        } catch (error) {
            console.error('[StateManager] Failed to persist state:', error);
        }
    }
    
    loadPersistedState() {
        try {
            const serialized = localStorage.getItem(this.persistKey);
            if (serialized) {
                this.state = JSON.parse(serialized);
                
                if (this.debug) {
                    console.log('[StateManager] Loaded persisted state:', this.state);
                }
            }
        } catch (error) {
            console.error('[StateManager] Failed to load persisted state:', error);
        }
    }
    
    generateId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create singleton instance
export const globalState = new StateManager({
    persist: true,
    debug: process.env.NODE_ENV === 'development'
});

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.JazzyPopState = globalState;
}
/**
 * BaseComponent - Foundation class for all JazzyPop components
 * Provides lifecycle management, state handling, and event system
 */
export class BaseComponent {
    constructor(config = {}) {
        this.config = config;
        this.state = {};
        this.listeners = new Map();
        this.children = new Map();
        this.parent = null;
        this.initialized = false;
        this.destroyed = false;
        
        // Unique component ID
        this.id = config.id || this.generateId();
        this.name = this.constructor.name;
        
        // Get global event bus if available
        this.eventBus = window.JazzyPop?.eventBus || null;
    }
    
    /**
     * Initialize component - override setup() in child classes
     */
    async init() {
        if (this.initialized || this.destroyed) return this;
        
        try {
            // Call child class setup
            await this.setup();
            
            // Initialize children
            await this.initChildren();
            
            // Attach event listeners
            this.attachListeners();
            
            // Mark as initialized
            this.initialized = true;
            
            // Emit initialization event
            this.emit('component:initialized', { 
                component: this.name,
                id: this.id 
            });
            
            // Call lifecycle hook
            this.onInit();
            
        } catch (error) {
            this.handleError(error, 'init');
        }
        
        return this;
    }
    
    /**
     * Setup hook - override in child classes
     */
    async setup() {
        // Override in child classes
    }
    
    /**
     * Lifecycle hook - called after initialization
     */
    onInit() {
        // Override in child classes
    }
    
    /**
     * State management with change detection
     */
    setState(updates, options = {}) {
        if (this.destroyed) return;
        
        const oldState = { ...this.state };
        const newState = { ...this.state, ...updates };
        
        // Check if state actually changed
        if (this.stateEquals(oldState, newState)) return;
        
        // Update state
        this.state = newState;
        
        // Call state change handler
        this.onStateChange(oldState, newState);
        
        // Emit state change event unless silent
        if (!options.silent) {
            this.emit('state:changed', {
                component: this.name,
                oldState,
                newState,
                changes: updates
            });
        }
        
        // Trigger render if not disabled
        if (!options.skipRender && this.shouldRender(oldState, newState)) {
            this.render();
        }
    }
    
    /**
     * Get state value by path (supports dot notation)
     */
    getState(path) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * State change handler - override in child classes
     */
    onStateChange(oldState, newState) {
        // Override in child classes
    }
    
    /**
     * Check if component should render on state change
     */
    shouldRender(oldState, newState) {
        return true; // Override for optimization
    }
    
    /**
     * Simple state equality check
     */
    stateEquals(state1, state2) {
        return JSON.stringify(state1) === JSON.stringify(state2);
    }
    
    /**
     * Event handling
     */
    on(event, handler, options = {}) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        const wrappedHandler = options.once 
            ? (...args) => {
                handler(...args);
                this.off(event, wrappedHandler);
            }
            : handler;
        
        this.listeners.get(event).add(wrappedHandler);
        
        // Also listen on global event bus if specified
        if (options.global && this.eventBus) {
            this.eventBus.on(`${this.id}:${event}`, wrappedHandler);
        }
        
        return () => this.off(event, wrappedHandler);
    }
    
    /**
     * Remove event handler
     */
    off(event, handler) {
        if (handler) {
            this.listeners.get(event)?.delete(handler);
        } else {
            this.listeners.delete(event);
        }
    }
    
    /**
     * Emit event locally and optionally globally
     */
    emit(event, data = {}, options = {}) {
        // Local listeners
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    this.handleError(error, `event:${event}`);
                }
            });
        }
        
        // Global event bus
        if (this.eventBus && !options.localOnly) {
            this.eventBus.emit(event, {
                source: this.id,
                component: this.name,
                ...data
            });
        }
    }
    
    /**
     * Subscribe to events - return cleanup function
     */
    subscribe(subscriptions) {
        const cleanups = [];
        
        Object.entries(subscriptions).forEach(([event, handler]) => {
            cleanups.push(this.on(event, handler));
        });
        
        return () => cleanups.forEach(cleanup => cleanup());
    }
    
    /**
     * Child component management
     */
    addChild(name, component) {
        if (this.children.has(name)) {
            console.warn(`Child component '${name}' already exists`);
            return;
        }
        
        component.parent = this;
        this.children.set(name, component);
        
        if (this.initialized && !component.initialized) {
            component.init();
        }
    }
    
    getChild(name) {
        return this.children.get(name);
    }
    
    removeChild(name) {
        const child = this.children.get(name);
        if (child) {
            child.destroy();
            this.children.delete(name);
        }
    }
    
    async initChildren() {
        const promises = [];
        
        for (const [name, child] of this.children) {
            if (!child.initialized) {
                promises.push(child.init());
            }
        }
        
        await Promise.all(promises);
    }
    
    /**
     * Attach event listeners - override in child classes
     */
    attachListeners() {
        // Override to attach specific listeners
    }
    
    /**
     * Render component - override in child classes
     */
    render() {
        // Override in child classes
    }
    
    /**
     * Error handling
     */
    handleError(error, context = '') {
        console.error(`Error in ${this.name}${context ? ` (${context})` : ''}:`, error);
        
        this.emit('component:error', {
            error,
            context,
            component: this.name,
            id: this.id
        });
        
        // Re-throw if in development
        if (process.env.NODE_ENV === 'development') {
            throw error;
        }
    }
    
    /**
     * Cleanup and destroy component
     */
    destroy() {
        if (this.destroyed) return;
        
        // Call lifecycle hook
        this.onDestroy();
        
        // Destroy children
        for (const [name, child] of this.children) {
            child.destroy();
        }
        this.children.clear();
        
        // Clear listeners
        this.listeners.clear();
        
        // Emit destroy event
        this.emit('component:destroyed', {
            component: this.name,
            id: this.id
        });
        
        // Clear references
        this.parent = null;
        this.eventBus = null;
        this.state = {};
        
        // Mark as destroyed
        this.destroyed = true;
        this.initialized = false;
    }
    
    /**
     * Lifecycle hook - called before destruction
     */
    onDestroy() {
        // Override in child classes
    }
    
    /**
     * Utility methods
     */
    generateId() {
        return `${this.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Wait for condition with timeout
     */
    async waitFor(condition, timeout = 5000) {
        const start = Date.now();
        
        while (!condition()) {
            if (Date.now() - start > timeout) {
                throw new Error(`Timeout waiting for condition in ${this.name}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * Debounce method calls
     */
    debounce(fn, delay = 300) {
        let timeoutId;
        
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle method calls
     */
    throttle(fn, limit = 300) {
        let inThrottle;
        
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}
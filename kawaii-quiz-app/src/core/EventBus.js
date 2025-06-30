/**
 * EventBus - Global event system for JazzyPop
 * Enables decoupled communication between components
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.wildcardHandlers = new Set();
        this.debug = false;
    }
    
    /**
     * Subscribe to an event
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }
        
        // Handle wildcard listeners
        if (event === '*') {
            this.wildcardHandlers.add(handler);
            return () => this.wildcardHandlers.delete(handler);
        }
        
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        const handlers = this.events.get(event);
        
        // Wrap handler for once option
        const wrappedHandler = options.once
            ? (...args) => {
                handler(...args);
                this.off(event, wrappedHandler);
            }
            : handler;
        
        // Store metadata with handler
        wrappedHandler._meta = {
            original: handler,
            priority: options.priority || 0,
            id: options.id || this.generateId()
        };
        
        handlers.add(wrappedHandler);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to '${event}'`, options);
        }
        
        // Return unsubscribe function
        return () => this.off(event, wrappedHandler);
    }
    
    /**
     * Subscribe to an event once
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }
    
    /**
     * Unsubscribe from an event
     */
    off(event, handler) {
        if (event === '*' && handler) {
            this.wildcardHandlers.delete(handler);
            return;
        }
        
        const handlers = this.events.get(event);
        if (!handlers) return;
        
        if (handler) {
            // Remove specific handler
            handlers.forEach(h => {
                if (h === handler || h._meta?.original === handler) {
                    handlers.delete(h);
                }
            });
            
            // Clean up empty handler sets
            if (handlers.size === 0) {
                this.events.delete(event);
            }
        } else {
            // Remove all handlers for event
            this.events.delete(event);
        }
        
        if (this.debug) {
            console.log(`[EventBus] Unsubscribed from '${event}'`);
        }
    }
    
    /**
     * Emit an event
     */
    emit(event, data = {}, options = {}) {
        const eventData = {
            event,
            data,
            timestamp: Date.now(),
            ...options
        };
        
        // Add to history
        this.addToHistory(eventData);
        
        if (this.debug) {
            console.log(`[EventBus] Emit '${event}'`, data);
        }
        
        // Get handlers and sort by priority
        const handlers = this.events.get(event);
        const sortedHandlers = handlers 
            ? Array.from(handlers).sort((a, b) => 
                (b._meta?.priority || 0) - (a._meta?.priority || 0)
              )
            : [];
        
        // Add wildcard handlers
        const allHandlers = [
            ...sortedHandlers,
            ...Array.from(this.wildcardHandlers)
        ];
        
        // Execute handlers
        const results = [];
        for (const handler of allHandlers) {
            try {
                const result = handler(data, eventData);
                results.push(result);
                
                // Stop propagation if requested
                if (options.stopPropagation && result === false) {
                    break;
                }
            } catch (error) {
                console.error(`[EventBus] Error in handler for '${event}':`, error);
                
                // Emit error event (but prevent infinite loops)
                if (event !== 'eventbus:error') {
                    this.emit('eventbus:error', {
                        originalEvent: event,
                        error,
                        handler: handler._meta
                    });
                }
            }
        }
        
        return results;
    }
    
    /**
     * Emit an event and wait for all handlers to complete
     */
    async emitAsync(event, data = {}, options = {}) {
        const eventData = {
            event,
            data,
            timestamp: Date.now(),
            ...options
        };
        
        this.addToHistory(eventData);
        
        if (this.debug) {
            console.log(`[EventBus] EmitAsync '${event}'`, data);
        }
        
        const handlers = this.events.get(event);
        const sortedHandlers = handlers
            ? Array.from(handlers).sort((a, b) =>
                (b._meta?.priority || 0) - (a._meta?.priority || 0)
              )
            : [];
        
        const allHandlers = [
            ...sortedHandlers,
            ...Array.from(this.wildcardHandlers)
        ];
        
        const results = [];
        
        for (const handler of allHandlers) {
            try {
                const result = await handler(data, eventData);
                results.push(result);
                
                if (options.stopPropagation && result === false) {
                    break;
                }
            } catch (error) {
                console.error(`[EventBus] Error in async handler for '${event}':`, error);
                
                if (event !== 'eventbus:error') {
                    this.emit('eventbus:error', {
                        originalEvent: event,
                        error,
                        handler: handler._meta
                    });
                }
            }
        }
        
        return results;
    }
    
    /**
     * Wait for an event to occur
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = timeout > 0 ? setTimeout(() => {
                this.off(event, handler);
                reject(new Error(`Timeout waiting for event '${event}'`));
            }, timeout) : null;
            
            const handler = (data) => {
                if (timer) clearTimeout(timer);
                resolve(data);
            };
            
            this.once(event, handler);
        });
    }
    
    /**
     * Check if event has listeners
     */
    hasListeners(event) {
        return this.events.has(event) && this.events.get(event).size > 0;
    }
    
    /**
     * Get all registered events
     */
    getEvents() {
        return Array.from(this.events.keys());
    }
    
    /**
     * Get listener count for an event
     */
    getListenerCount(event) {
        if (event === '*') {
            return this.wildcardHandlers.size;
        }
        return this.events.get(event)?.size || 0;
    }
    
    /**
     * Clear all listeners for an event or all events
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
            this.wildcardHandlers.clear();
        }
        
        if (this.debug) {
            console.log(`[EventBus] Cleared ${event || 'all events'}`);
        }
    }
    
    /**
     * Get event history
     */
    getHistory(filter) {
        if (!filter) return [...this.history];
        
        return this.history.filter(entry => {
            if (typeof filter === 'string') {
                return entry.event === filter;
            }
            if (typeof filter === 'function') {
                return filter(entry);
            }
            return true;
        });
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
        this.history = [];
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
    
    /**
     * Create a scoped event emitter
     */
    scope(prefix) {
        const scopedBus = {
            on: (event, handler, options) => 
                this.on(`${prefix}:${event}`, handler, options),
            
            once: (event, handler) => 
                this.once(`${prefix}:${event}`, handler),
            
            off: (event, handler) => 
                this.off(`${prefix}:${event}`, handler),
            
            emit: (event, data, options) => 
                this.emit(`${prefix}:${event}`, data, options),
            
            emitAsync: (event, data, options) =>
                this.emitAsync(`${prefix}:${event}`, data, options),
            
            waitFor: (event, timeout) =>
                this.waitFor(`${prefix}:${event}`, timeout),
            
            hasListeners: (event) =>
                this.hasListeners(`${prefix}:${event}`),
            
            clear: (event) =>
                this.clear(event ? `${prefix}:${event}` : undefined)
        };
        
        return scopedBus;
    }
    
    /**
     * Private methods
     */
    addToHistory(eventData) {
        this.history.push(eventData);
        
        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create singleton instance
export const eventBus = new EventBus();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    window.JazzyPopEventBus = eventBus;
}
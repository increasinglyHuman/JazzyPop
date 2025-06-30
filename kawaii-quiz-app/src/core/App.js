/**
 * JazzyPop Application Core
 * Bootstraps and manages the entire application
 */
import { EventBus, eventBus } from './EventBus.js';
import { StateManager, globalState } from './StateManager.js';
import { BaseComponent } from './BaseComponent.js';

export class JazzyPopApp {
    constructor(config = {}) {
        this.config = {
            debug: false,
            mountPoint: '#app',
            ...config
        };
        
        this.components = new Map();
        this.services = new Map();
        this.initialized = false;
        this.startTime = Date.now();
        
        // Core systems
        this.eventBus = eventBus;
        this.state = globalState;
        
        // Set debug mode
        if (this.config.debug) {
            this.eventBus.setDebug(true);
            this.state.debug = true;
        }
    }
    
    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('JazzyPop already initialized');
            return;
        }
        
        try {
            console.log('🎮 JazzyPop initializing...');
            
            // Setup global error handling
            this.setupErrorHandling();
            
            // Initialize core services
            await this.initializeCore();
            
            // Register components
            await this.registerComponents();
            
            // Initialize services
            await this.initializeServices();
            
            // Setup routing if needed
            await this.setupRouting();
            
            // Mount application
            await this.mount();
            
            // Mark as initialized
            this.initialized = true;
            const loadTime = Date.now() - this.startTime;
            
            console.log(`✨ JazzyPop ready! (${loadTime}ms)`);
            
            // Emit ready event
            this.eventBus.emit('app:ready', {
                loadTime,
                components: Array.from(this.components.keys()),
                services: Array.from(this.services.keys())
            });
            
        } catch (error) {
            console.error('Failed to initialize JazzyPop:', error);
            this.handleFatalError(error);
        }
    }
    
    /**
     * Initialize core systems
     */
    async initializeCore() {
        // Make app instance globally available
        window.JazzyPop = {
            app: this,
            eventBus: this.eventBus,
            state: this.state,
            version: '1.0.0'
        };
        
        // Set initial state
        this.state.set({
            app: {
                initialized: false,
                mode: 'normal',
                currentView: 'home',
                user: null
            },
            settings: {
                sound: true,
                notifications: true,
                theme: 'default'
            },
            game: {
                hearts: 5,
                gems: 0,
                streak: 0,
                xp: 0,
                level: 1
            }
        }, { skipPersist: false });
        
        // Setup state watchers
        this.setupStateWatchers();
        
        // Setup event handlers
        this.setupEventHandlers();
    }
    
    /**
     * Register all components
     */
    async registerComponents() {
        // Dynamic imports for code splitting
        const componentModules = {
            // Core UI
            Navigation: () => import('../components/ui/Navigation.js'),
            StatsBar: () => import('../components/ui/StatsBar.js'),
            Modal: () => import('../components/ui/Modal.js'),
            Toast: () => import('../components/ui/Toast.js'),
            
            // Quiz components
            QuizEngine: () => import('../components/quiz/QuizEngine.js'),
            QuestionFactory: () => import('../components/quiz/QuestionFactory.js'),
            
            // Gamification
            HeartSystem: () => import('../components/gamification/HeartSystem.js'),
            XPManager: () => import('../components/gamification/XPManager.js'),
            GemWallet: () => import('../components/gamification/GemWallet.js'),
            StreakTracker: () => import('../components/gamification/StreakTracker.js'),
            
            // Mode managers
            ModeManager: () => import('../modes/ModeManager.js'),
            
            // Views
            HomePage: () => import('../views/HomePage.js'),
            QuizPage: () => import('../views/QuizPage.js'),
            ProgressPage: () => import('../views/ProgressPage.js'),
            ProfilePage: () => import('../views/ProfilePage.js')
        };
        
        // Load and register components
        for (const [name, loader] of Object.entries(componentModules)) {
            try {
                const module = await loader();
                const ComponentClass = module.default || module[name];
                
                if (ComponentClass) {
                    this.registerComponent(name, ComponentClass);
                }
            } catch (error) {
                console.error(`Failed to load component ${name}:`, error);
            }
        }
    }
    
    /**
     * Register a single component
     */
    registerComponent(name, ComponentClass, options = {}) {
        if (this.components.has(name)) {
            console.warn(`Component ${name} already registered`);
            return;
        }
        
        this.components.set(name, {
            class: ComponentClass,
            instance: null,
            options
        });
        
        if (this.config.debug) {
            console.log(`Registered component: ${name}`);
        }
    }
    
    /**
     * Get or create component instance
     */
    async getComponent(name) {
        const registration = this.components.get(name);
        
        if (!registration) {
            throw new Error(`Component ${name} not found`);
        }
        
        if (!registration.instance) {
            const ComponentClass = registration.class;
            registration.instance = new ComponentClass(registration.options);
            
            // Initialize if app is already initialized
            if (this.initialized) {
                await registration.instance.init();
            }
        }
        
        return registration.instance;
    }
    
    /**
     * Initialize services
     */
    async initializeServices() {
        const services = [
            'HeartSystem',
            'XPManager',
            'GemWallet',
            'StreakTracker',
            'ModeManager'
        ];
        
        for (const serviceName of services) {
            try {
                const service = await this.getComponent(serviceName);
                await service.init();
                this.services.set(serviceName, service);
            } catch (error) {
                console.error(`Failed to initialize service ${serviceName}:`, error);
            }
        }
    }
    
    /**
     * Setup routing
     */
    async setupRouting() {
        // Simple hash-based routing
        const routes = {
            '#/': 'HomePage',
            '#/quiz': 'QuizPage',
            '#/progress': 'ProgressPage',
            '#/profile': 'ProfilePage'
        };
        
        const handleRoute = async () => {
            const hash = window.location.hash || '#/';
            const viewName = routes[hash];
            
            if (viewName) {
                await this.switchView(viewName);
            }
        };
        
        window.addEventListener('hashchange', handleRoute);
        await handleRoute(); // Handle initial route
    }
    
    /**
     * Switch to a different view
     */
    async switchView(viewName) {
        // Get current view
        const currentView = this.state.get('app.currentView');
        
        if (currentView === viewName) return;
        
        // Emit view change event
        this.eventBus.emit('view:changing', {
            from: currentView,
            to: viewName
        });
        
        // Update state
        this.state.set('app.currentView', viewName);
        
        // Load and render new view
        try {
            const view = await this.getComponent(viewName);
            await this.renderView(view);
            
            this.eventBus.emit('view:changed', {
                view: viewName
            });
        } catch (error) {
            console.error(`Failed to switch to view ${viewName}:`, error);
        }
    }
    
    /**
     * Render a view component
     */
    async renderView(view) {
        const mountPoint = document.querySelector(this.config.mountPoint);
        
        if (!mountPoint) {
            throw new Error(`Mount point ${this.config.mountPoint} not found`);
        }
        
        // Clear current content
        mountPoint.innerHTML = '';
        
        // Render new view
        if (view.render) {
            const content = await view.render();
            
            if (typeof content === 'string') {
                mountPoint.innerHTML = content;
            } else if (content instanceof Element) {
                mountPoint.appendChild(content);
            }
        }
        
        // Call view lifecycle method
        if (view.onMount) {
            await view.onMount();
        }
    }
    
    /**
     * Mount application
     */
    async mount() {
        // Create app container if it doesn't exist
        let mountPoint = document.querySelector(this.config.mountPoint);
        
        if (!mountPoint) {
            mountPoint = document.createElement('div');
            mountPoint.id = 'app';
            document.body.appendChild(mountPoint);
        }
        
        // Add app classes
        mountPoint.className = 'jazzypop-app';
        
        // Set initial mode
        const mode = this.state.get('app.mode');
        document.body.setAttribute('data-mode', mode);
        
        // Initialize UI components
        const navigation = await this.getComponent('Navigation');
        const statsBar = await this.getComponent('StatsBar');
        
        await navigation.init();
        await statsBar.init();
        
        // Update app state
        this.state.set('app.initialized', true);
    }
    
    /**
     * Setup state watchers
     */
    setupStateWatchers() {
        // Watch mode changes
        this.state.subscribe('app.mode', (mode) => {
            document.body.setAttribute('data-mode', mode);
            this.eventBus.emit('mode:changed', { mode });
        });
        
        // Watch game state
        this.state.watch(['game.hearts', 'game.gems', 'game.streak'], (value, oldValue, changes) => {
            this.eventBus.emit('stats:updated', { changes });
        });
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Handle component errors
        this.eventBus.on('component:error', ({ component, error }) => {
            console.error(`Component error in ${component}:`, error);
            
            // Show error toast
            this.showError(`Error in ${component}`);
        });
        
        // Handle state errors
        this.eventBus.on('state:error', ({ error }) => {
            console.error('State error:', error);
        });
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.eventBus.emit('app:error', {
                type: 'uncaught-error',
                error: event.error,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.eventBus.emit('app:error', {
                type: 'unhandled-rejection',
                reason: event.reason
            });
        });
    }
    
    /**
     * Handle fatal errors
     */
    handleFatalError(error) {
        document.body.innerHTML = `
            <div class="fatal-error">
                <div class="error-container">
                    <h1>😵 Oops! Something went wrong</h1>
                    <p>JazzyPop encountered an error and couldn't start.</p>
                    <details>
                        <summary>Error details</summary>
                        <pre>${error.stack || error.message}</pre>
                    </details>
                    <button onclick="location.reload()">🔄 Reload</button>
                </div>
            </div>
        `;
        
        // Add basic error styles
        const style = document.createElement('style');
        style.textContent = `
            .fatal-error {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #131f24;
                color: white;
                font-family: -apple-system, sans-serif;
                padding: 20px;
            }
            .error-container {
                max-width: 500px;
                text-align: center;
            }
            .error-container h1 {
                font-size: 24px;
                margin-bottom: 16px;
            }
            .error-container p {
                margin-bottom: 24px;
                opacity: 0.8;
            }
            .error-container details {
                margin-bottom: 24px;
                text-align: left;
            }
            .error-container pre {
                background: rgba(255,255,255,0.1);
                padding: 16px;
                border-radius: 8px;
                overflow: auto;
                font-size: 12px;
            }
            .error-container button {
                background: #58cc02;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            }
            .error-container button:hover {
                background: #4aa002;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show error message
     */
    async showError(message) {
        try {
            const toast = await this.getComponent('Toast');
            toast.show({
                message,
                type: 'error',
                duration: 5000
            });
        } catch (e) {
            // Fallback to alert if toast fails
            alert(message);
        }
    }
    
    /**
     * Shutdown application
     */
    async shutdown() {
        console.log('Shutting down JazzyPop...');
        
        // Emit shutdown event
        this.eventBus.emit('app:shutdown');
        
        // Destroy all components
        for (const [name, registration] of this.components) {
            if (registration.instance) {
                try {
                    await registration.instance.destroy();
                } catch (error) {
                    console.error(`Error destroying component ${name}:`, error);
                }
            }
        }
        
        // Clear state
        this.state.reset();
        
        // Clear event listeners
        this.eventBus.clear();
        
        // Remove from global
        delete window.JazzyPop;
        
        this.initialized = false;
        console.log('JazzyPop shutdown complete');
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new JazzyPopApp({ debug: true });
        app.init();
    });
} else {
    const app = new JazzyPopApp({ debug: true });
    app.init();
}
# JazzyPop JavaScript Architecture

## 🏗️ Modular Component Architecture

### Core Structure
```
/src
├── core/
│   ├── App.js              # Main application controller
│   ├── EventBus.js         # Central event system
│   ├── StateManager.js     # Global state management
│   └── ServiceWorker.js    # PWA & offline support
│
├── components/
│   ├── quiz/
│   │   ├── QuizEngine.js       # Quiz logic controller
│   │   ├── QuizRenderer.js     # Quiz UI renderer
│   │   ├── QuizTimer.js        # Timer component
│   │   └── QuizProgress.js     # Progress tracking
│   │
│   ├── questions/
│   │   ├── QuestionFactory.js  # Question type factory
│   │   ├── MCQQuestion.js      # Multiple choice
│   │   ├── FIBQuestion.js      # Fill in blank
│   │   └── BaseQuestion.js     # Abstract base class
│   │
│   ├── gamification/
│   │   ├── HeartSystem.js      # Health management
│   │   ├── XPManager.js        # Experience points
│   │   ├── GemWallet.js        # Currency system
│   │   ├── StreakTracker.js    # Streak logic
│   │   └── Achievements.js     # Achievement system
│   │
│   └── ui/
│       ├── Modal.js            # Modal system
│       ├── Toast.js            # Notification toasts
│       ├── Animations.js       # Animation library
│       └── ThemeManager.js     # Theme switching
│
├── services/
│   ├── api/
│   │   ├── APIClient.js        # Base API client
│   │   ├── QuizAPI.js          # Quiz endpoints
│   │   ├── UserAPI.js          # User endpoints
│   │   └── AuthAPI.js          # Authentication
│   │
│   ├── storage/
│   │   ├── LocalStorage.js     # Local storage wrapper
│   │   ├── SessionStorage.js   # Session storage
│   │   ├── IndexedDB.js        # Offline data store
│   │   └── SecureStorage.js    # Encrypted storage
│   │
│   └── tracking/
│       ├── ErrorTracker.js     # Error tracking
│       ├── Analytics.js        # User analytics
│       ├── Performance.js      # Performance monitoring
│       └── AuditLogger.js      # Security audit logs
│
├── modes/
│   ├── ChaosMode.js           # Chaos mode controller
│   ├── NormalMode.js          # Normal mode
│   ├── PracticeMode.js        # Practice mode
│   └── ModeManager.js         # Mode switching
│
├── utils/
│   ├── validators/
│   │   ├── InputValidator.js   # Input validation
│   │   ├── QuizValidator.js    # Quiz data validation
│   │   └── Sanitizer.js        # Input sanitization
│   │
│   ├── security/
│   │   ├── RateLimiter.js      # Rate limiting
│   │   ├── AntiCheat.js        # Anti-cheat system
│   │   └── Encryption.js       # Encryption utilities
│   │
│   └── helpers/
│       ├── DateHelper.js       # Date utilities
│       ├── NumberHelper.js     # Number formatting
│       └── DOMHelper.js        # DOM utilities
│
└── config/
    ├── constants.js            # App constants
    ├── endpoints.js            # API endpoints
    └── features.js             # Feature flags
```

## Component Examples

### 1. Base Component Class
```javascript
// src/components/BaseComponent.js
export class BaseComponent {
    constructor(config = {}) {
        this.config = config;
        this.state = {};
        this.listeners = new Map();
        this.eventBus = window.JazzyPop.eventBus;
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            await this.setup();
            this.attachListeners();
            this.initialized = true;
            this.emit('component:initialized', { component: this.constructor.name });
        } catch (error) {
            this.handleError(error);
        }
    }
    
    async setup() {
        // Override in child classes
    }
    
    setState(updates) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.onStateChange(oldState, this.state);
    }
    
    onStateChange(oldState, newState) {
        // Override in child classes
    }
    
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
    }
    
    emit(event, data) {
        this.eventBus.emit(event, { source: this, ...data });
    }
    
    destroy() {
        this.listeners.clear();
        this.initialized = false;
    }
    
    handleError(error) {
        console.error(`Error in ${this.constructor.name}:`, error);
        this.emit('component:error', { error, component: this.constructor.name });
    }
}
```

### 2. Quiz Engine Component
```javascript
// src/components/quiz/QuizEngine.js
import { BaseComponent } from '../BaseComponent.js';
import { QuestionFactory } from '../questions/QuestionFactory.js';
import { QuizValidator } from '../../utils/validators/QuizValidator.js';

export class QuizEngine extends BaseComponent {
    constructor(config) {
        super(config);
        this.questionFactory = new QuestionFactory();
        this.validator = new QuizValidator();
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.startTime = null;
    }
    
    async setup() {
        this.state = {
            status: 'idle',
            score: 0,
            timeRemaining: 0,
            currentQuestion: null
        };
    }
    
    async loadQuiz(quizId) {
        try {
            this.setState({ status: 'loading' });
            
            const quizData = await this.fetchQuiz(quizId);
            const validated = this.validator.validateQuiz(quizData);
            
            if (!validated.valid) {
                throw new Error('Invalid quiz data');
            }
            
            this.currentQuiz = validated.data;
            this.setState({ status: 'ready' });
            this.emit('quiz:loaded', { quiz: this.currentQuiz });
            
        } catch (error) {
            this.setState({ status: 'error' });
            this.handleError(error);
        }
    }
    
    startQuiz() {
        if (this.state.status !== 'ready') return;
        
        this.startTime = Date.now();
        this.setState({ status: 'active' });
        this.nextQuestion();
        this.emit('quiz:started', { quizId: this.currentQuiz.id });
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex >= this.currentQuiz.questions.length) {
            this.completeQuiz();
            return;
        }
        
        const questionData = this.currentQuiz.questions[this.currentQuestionIndex];
        const question = this.questionFactory.create(questionData);
        
        this.setState({ currentQuestion: question });
        this.emit('question:displayed', { 
            question: question,
            index: this.currentQuestionIndex,
            total: this.currentQuiz.questions.length
        });
    }
    
    submitAnswer(answer) {
        if (this.state.status !== 'active') return;
        
        const question = this.state.currentQuestion;
        const isCorrect = question.checkAnswer(answer);
        
        this.answers.push({
            questionId: question.id,
            answer: answer,
            correct: isCorrect,
            timeSpent: Date.now() - this.questionStartTime
        });
        
        if (isCorrect) {
            this.setState({ score: this.state.score + question.points });
            this.emit('answer:correct', { question, answer });
        } else {
            this.emit('answer:incorrect', { question, answer });
        }
        
        this.currentQuestionIndex++;
        setTimeout(() => this.nextQuestion(), 1500);
    }
    
    completeQuiz() {
        const endTime = Date.now();
        const results = {
            quizId: this.currentQuiz.id,
            score: this.state.score,
            maxScore: this.calculateMaxScore(),
            percentage: (this.state.score / this.calculateMaxScore()) * 100,
            timeSpent: Math.floor((endTime - this.startTime) / 1000),
            answers: this.answers
        };
        
        this.setState({ status: 'completed' });
        this.emit('quiz:completed', results);
    }
    
    async fetchQuiz(quizId) {
        // Implement API call
        const response = await fetch(`/api/quiz/${quizId}`);
        return response.json();
    }
    
    calculateMaxScore() {
        return this.currentQuiz.questions.reduce((sum, q) => sum + q.points, 0);
    }
}
```

### 3. Heart System Component
```javascript
// src/components/gamification/HeartSystem.js
import { BaseComponent } from '../BaseComponent.js';
import { SecureStorage } from '../../services/storage/SecureStorage.js';

export class HeartSystem extends BaseComponent {
    constructor(config) {
        super({
            maxHearts: 5,
            regenInterval: 30 * 60 * 1000, // 30 minutes
            ...config
        });
        
        this.storage = new SecureStorage('hearts');
        this.regenTimer = null;
    }
    
    async setup() {
        const saved = await this.storage.get('heartData');
        
        this.state = {
            current: saved?.current || this.config.maxHearts,
            max: this.config.maxHearts,
            lastLostTime: saved?.lastLostTime || null,
            isRegenerating: false,
            nextRegenTime: null,
            shields: {
                active: false,
                expiresAt: null
            }
        };
        
        if (this.state.lastLostTime) {
            this.startRegeneration();
        }
    }
    
    loseHeart() {
        if (this.state.shields.active) {
            this.emit('heart:shielded');
            return false;
        }
        
        if (this.state.current <= 0) {
            this.emit('hearts:depleted');
            return false;
        }
        
        this.setState({
            current: this.state.current - 1,
            lastLostTime: Date.now()
        });
        
        this.saveState();
        this.startRegeneration();
        
        this.emit('heart:lost', { remaining: this.state.current });
        
        if (this.state.current === 0) {
            this.emit('hearts:empty');
        }
        
        return true;
    }
    
    startRegeneration() {
        if (this.regenTimer) clearInterval(this.regenTimer);
        
        this.setState({ isRegenerating: true });
        
        this.regenTimer = setInterval(() => {
            this.checkRegeneration();
        }, 1000); // Check every second for UI updates
    }
    
    checkRegeneration() {
        if (this.state.current >= this.state.max) {
            this.stopRegeneration();
            return;
        }
        
        const timeSinceLost = Date.now() - this.state.lastLostTime;
        const heartsToRegen = Math.floor(timeSinceLost / this.config.regenInterval);
        
        if (heartsToRegen > 0) {
            const newHearts = Math.min(
                this.state.current + heartsToRegen,
                this.state.max
            );
            
            this.setState({
                current: newHearts,
                lastLostTime: Date.now()
            });
            
            this.saveState();
            this.emit('hearts:regenerated', { 
                amount: heartsToRegen,
                total: newHearts 
            });
            
            if (newHearts >= this.state.max) {
                this.stopRegeneration();
                this.emit('hearts:full');
            }
        }
        
        this.updateNextRegenTime();
    }
    
    updateNextRegenTime() {
        const timeSinceLost = Date.now() - this.state.lastLostTime;
        const timeUntilNext = this.config.regenInterval - (timeSinceLost % this.config.regenInterval);
        
        this.setState({
            nextRegenTime: Date.now() + timeUntilNext
        });
        
        this.emit('regen:update', {
            timeRemaining: timeUntilNext,
            nextRegenTime: this.state.nextRegenTime
        });
    }
    
    stopRegeneration() {
        if (this.regenTimer) {
            clearInterval(this.regenTimer);
            this.regenTimer = null;
        }
        
        this.setState({
            isRegenerating: false,
            nextRegenTime: null
        });
    }
    
    async purchaseHearts(amount) {
        // Check if user has enough gems
        const gemCost = amount * 30;
        const hasGems = await this.checkGems(gemCost);
        
        if (!hasGems) {
            this.emit('purchase:failed', { reason: 'insufficient_gems' });
            return false;
        }
        
        // Deduct gems and add hearts
        await this.deductGems(gemCost);
        
        this.setState({
            current: Math.min(this.state.current + amount, this.state.max)
        });
        
        this.saveState();
        this.emit('hearts:purchased', { amount, cost: gemCost });
        
        return true;
    }
    
    activateShield(duration) {
        this.setState({
            shields: {
                active: true,
                expiresAt: Date.now() + duration
            }
        });
        
        setTimeout(() => {
            this.setState({
                shields: {
                    active: false,
                    expiresAt: null
                }
            });
            this.emit('shield:expired');
        }, duration);
        
        this.emit('shield:activated', { duration });
    }
    
    async saveState() {
        await this.storage.save('heartData', {
            current: this.state.current,
            lastLostTime: this.state.lastLostTime,
            shields: this.state.shields
        });
    }
    
    destroy() {
        this.stopRegeneration();
        super.destroy();
    }
}
```

### 4. Mode Manager
```javascript
// src/modes/ModeManager.js
import { BaseComponent } from '../components/BaseComponent.js';
import { ChaosMode } from './ChaosMode.js';
import { NormalMode } from './NormalMode.js';
import { PracticeMode } from './PracticeMode.js';

export class ModeManager extends BaseComponent {
    constructor() {
        super();
        this.modes = new Map();
        this.currentMode = null;
    }
    
    async setup() {
        // Register available modes
        this.registerMode('normal', NormalMode);
        this.registerMode('chaos', ChaosMode);
        this.registerMode('practice', PracticeMode);
        
        // Set default mode
        await this.setMode('normal');
    }
    
    registerMode(name, ModeClass) {
        this.modes.set(name, {
            name,
            class: ModeClass,
            instance: null
        });
    }
    
    async setMode(modeName) {
        if (!this.modes.has(modeName)) {
            throw new Error(`Unknown mode: ${modeName}`);
        }
        
        // Deactivate current mode
        if (this.currentMode) {
            await this.currentMode.instance.deactivate();
            this.emit('mode:deactivated', { 
                mode: this.currentMode.name 
            });
        }
        
        // Get or create mode instance
        const modeConfig = this.modes.get(modeName);
        
        if (!modeConfig.instance) {
            modeConfig.instance = new modeConfig.class();
            await modeConfig.instance.init();
        }
        
        // Activate new mode
        this.currentMode = modeConfig;
        await modeConfig.instance.activate();
        
        // Update UI
        document.body.setAttribute('data-mode', modeName);
        
        this.emit('mode:changed', { 
            mode: modeName,
            instance: modeConfig.instance 
        });
    }
    
    getCurrentMode() {
        return this.currentMode?.name || null;
    }
    
    getModeInstance() {
        return this.currentMode?.instance || null;
    }
}
```

### 5. API Client with Interceptors
```javascript
// src/services/api/APIClient.js
export class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.interceptors = {
            request: [],
            response: [],
            error: []
        };
        this.setupDefaultInterceptors();
    }
    
    setupDefaultInterceptors() {
        // Auth interceptor
        this.addRequestInterceptor(async (config) => {
            const token = await this.getAuthToken();
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        });
        
        // Error interceptor
        this.addErrorInterceptor(async (error) => {
            if (error.response?.status === 401) {
                await this.refreshAuth();
                return this.retry(error.config);
            }
            throw error;
        });
        
        // Response timing
        this.addResponseInterceptor((response) => {
            const duration = Date.now() - response.config.startTime;
            console.debug(`API ${response.config.method} ${response.config.url}: ${duration}ms`);
            return response;
        });
    }
    
    async request(config) {
        // Apply request interceptors
        for (const interceptor of this.interceptors.request) {
            config = await interceptor(config);
        }
        
        config.startTime = Date.now();
        
        try {
            const response = await this.fetch(config);
            
            // Apply response interceptors
            let result = response;
            for (const interceptor of this.interceptors.response) {
                result = await interceptor(result);
            }
            
            return result;
            
        } catch (error) {
            // Apply error interceptors
            let err = error;
            for (const interceptor of this.interceptors.error) {
                try {
                    return await interceptor(err);
                } catch (e) {
                    err = e;
                }
            }
            throw err;
        }
    }
    
    async fetch(config) {
        const url = `${this.baseURL}${config.url}`;
        const options = {
            method: config.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...config.headers
            }
        };
        
        if (config.body) {
            options.body = JSON.stringify(config.body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.response = response;
            error.config = config;
            throw error;
        }
        
        const data = await response.json();
        
        return {
            data,
            status: response.status,
            headers: response.headers,
            config
        };
    }
    
    get(url, config = {}) {
        return this.request({ ...config, method: 'GET', url });
    }
    
    post(url, body, config = {}) {
        return this.request({ ...config, method: 'POST', url, body });
    }
    
    put(url, body, config = {}) {
        return this.request({ ...config, method: 'PUT', url, body });
    }
    
    delete(url, config = {}) {
        return this.request({ ...config, method: 'DELETE', url });
    }
    
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }
    
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }
    
    addErrorInterceptor(interceptor) {
        this.interceptors.error.push(interceptor);
    }
}
```

## Application Bootstrap
```javascript
// src/core/App.js
import { EventBus } from './EventBus.js';
import { StateManager } from './StateManager.js';
import { ModeManager } from '../modes/ModeManager.js';
import { HeartSystem } from '../components/gamification/HeartSystem.js';
import { ErrorTracker } from '../services/tracking/ErrorTracker.js';

class JazzyPopApp {
    constructor() {
        this.components = new Map();
        this.services = new Map();
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            // Initialize core services
            this.eventBus = new EventBus();
            this.state = new StateManager();
            this.errorTracker = new ErrorTracker();
            
            // Make available globally
            window.JazzyPop = {
                eventBus: this.eventBus,
                state: this.state,
                app: this
            };
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Start app
            this.initialized = true;
            this.eventBus.emit('app:initialized');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showFatalError(error);
        }
    }
    
    async initializeComponents() {
        // Core components
        const components = [
            { name: 'modes', Component: ModeManager },
            { name: 'hearts', Component: HeartSystem },
            // Add more components here
        ];
        
        for (const { name, Component } of components) {
            const instance = new Component();
            await instance.init();
            this.components.set(name, instance);
        }
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.errorTracker.captureError({
                type: 'uncaught-error',
                error: event.error
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.errorTracker.captureError({
                type: 'unhandled-rejection',
                reason: event.reason
            });
        });
    }
    
    getComponent(name) {
        return this.components.get(name);
    }
    
    showFatalError(error) {
        document.body.innerHTML = `
            <div class="fatal-error">
                <h1>Oops! Something went wrong</h1>
                <p>Please refresh the page to try again.</p>
                <button onclick="location.reload()">Refresh</button>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new JazzyPopApp();
        app.init();
    });
} else {
    const app = new JazzyPopApp();
    app.init();
}
```

This modular architecture allows you to:
1. **Modify components independently** without breaking others
2. **Test components in isolation**
3. **Lazy load components** as needed
4. **Share state and events** through central systems
5. **Handle errors gracefully** at component level
6. **Scale the application** by adding new components
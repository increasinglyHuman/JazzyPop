# JazzyPop Component Integration Map

## 🎯 Core Dashboard Components

### 1. User Profile Component
```javascript
// components/dashboard/UserProfile.js
export class UserProfile {
    constructor() {
        this.data = {
            userId: null,
            displayName: '',
            avatar: '',
            level: 1,
            totalXP: 0,
            memberSince: null
        };
        
        this.integrations = {
            // ALM Integration
            alm: {
                enabled: false,
                endpoint: '/alm/user/profile',
                syncInterval: 300000 // 5 minutes
            },
            // Standalone mode
            local: {
                storage: 'localStorage',
                key: 'jazzypop_user_profile'
            }
        };
    }
    
    async load() {
        if (this.isALMIntegrated()) {
            return await this.loadFromALM();
        }
        return this.loadFromLocal();
    }
    
    async loadFromALM() {
        try {
            const response = await fetch(this.integrations.alm.endpoint, {
                headers: {
                    'X-ALM-Token': this.getALMToken()
                }
            });
            
            if (!response.ok) throw new Error('ALM unavailable');
            
            const almProfile = await response.json();
            return this.mapALMProfile(almProfile);
            
        } catch (error) {
            console.warn('ALM load failed, falling back to local:', error);
            return this.loadFromLocal();
        }
    }
    
    mapALMProfile(almData) {
        return {
            userId: almData.user_id,
            displayName: almData.full_name || almData.username,
            avatar: almData.avatar_url || this.generateAvatar(almData.user_id),
            level: this.calculateLevel(almData.total_points || 0),
            totalXP: almData.total_points || 0,
            memberSince: almData.created_at
        };
    }
    
    emitEvents() {
        EventBus.emit('profile:loaded', this.data);
    }
    
    listensTo() {
        return ['auth:login', 'auth:logout', 'xp:earned'];
    }
}
```

### 2. Stats Bar Component
```javascript
// components/dashboard/StatsBar.js
export class StatsBar {
    constructor() {
        this.stats = {
            streak: { value: 0, icon: '🔥', label: 'Streak' },
            gems: { value: 0, icon: '💎', label: 'Gems' },
            hearts: { value: 5, max: 5, icon: '❤️', label: 'Hearts' },
            xp: { value: 0, icon: '⚡', label: 'XP' }
        };
        
        this.updateInterval = null;
    }
    
    integrations = {
        heartSystem: null,      // Injected dependency
        gemWallet: null,        // Injected dependency
        streakTracker: null,    // Injected dependency
        xpManager: null         // Injected dependency
    };
    
    async init(dependencies) {
        // Dependency injection
        this.integrations = { ...this.integrations, ...dependencies };
        
        // Subscribe to changes
        this.subscribeToUpdates();
        
        // Initial load
        await this.loadAllStats();
        
        // Start heart regen timer display
        this.startHeartTimer();
    }
    
    subscribeToUpdates() {
        EventBus.on('hearts:changed', (data) => {
            this.updateStat('hearts', data);
        });
        
        EventBus.on('gems:changed', (data) => {
            this.updateStat('gems', { value: data.total });
        });
        
        EventBus.on('streak:updated', (data) => {
            this.updateStat('streak', { value: data.current });
            if (data.current > 0 && data.current % 7 === 0) {
                this.showStreakMilestone(data.current);
            }
        });
        
        EventBus.on('xp:earned', (data) => {
            this.animateXPGain(data.amount);
            this.updateStat('xp', { value: data.total });
        });
    }
    
    startHeartTimer() {
        this.updateInterval = setInterval(() => {
            if (this.stats.hearts.value < this.stats.hearts.max) {
                const timeUntilNext = this.integrations.heartSystem.getTimeUntilNextHeart();
                this.updateHeartDisplay(timeUntilNext);
            }
        }, 1000);
    }
    
    render() {
        return `
            <div class="stats-bar">
                ${Object.entries(this.stats).map(([key, stat]) => `
                    <div class="stat-item" data-stat="${key}">
                        <span class="stat-icon">${stat.icon}</span>
                        <span class="stat-value" id="stat-${key}">${this.formatStatValue(key, stat)}</span>
                        ${key === 'hearts' && stat.value < stat.max ? 
                            `<span class="stat-timer" id="heart-timer"></span>` : ''
                        }
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    formatStatValue(key, stat) {
        if (key === 'hearts') {
            return `(${stat.value}/${stat.max})`;
        }
        return stat.value.toLocaleString();
    }
}
```

### 3. Quiz Grid Component
```javascript
// components/dashboard/QuizGrid.js
export class QuizGrid {
    constructor() {
        this.quizzes = [];
        this.filters = {
            category: 'all',
            difficulty: 'all',
            status: 'available'
        };
        
        this.dataSource = null; // Will be set based on network availability
    }
    
    integrations = {
        // ALM Quiz Source
        alm: {
            endpoint: '/alm/courses/{courseId}/quizzes',
            mapper: this.mapALMQuiz.bind(this)
        },
        // Local Quiz Generation
        local: {
            generator: null, // QuizGenerationService instance
            storage: 'indexedDB'
        }
    };
    
    async init() {
        // Determine data source
        this.dataSource = await this.determineDataSource();
        
        // Load quizzes
        await this.loadQuizzes();
        
        // Set up refresh timer
        this.setupRefreshTimer();
        
        // Subscribe to events
        this.subscribeToEvents();
    }
    
    async determineDataSource() {
        // Check if we're in ALM context
        if (window.ALM_CONTEXT) {
            try {
                // Test ALM connectivity
                const response = await fetch('/alm/ping', { 
                    timeout: 5000 
                });
                if (response.ok) {
                    return 'alm';
                }
            } catch (e) {
                console.warn('ALM not available, using local mode');
            }
        }
        
        return 'local';
    }
    
    async loadQuizzes() {
        if (this.dataSource === 'alm') {
            await this.loadALMQuizzes();
        } else {
            await this.loadLocalQuizzes();
        }
        
        this.applyFilters();
        this.render();
    }
    
    async loadALMQuizzes() {
        const courseId = this.getALMCourseId();
        const endpoint = this.integrations.alm.endpoint.replace('{courseId}', courseId);
        
        const response = await fetch(endpoint, {
            headers: {
                'X-ALM-Token': this.getALMToken()
            }
        });
        
        const almQuizzes = await response.json();
        this.quizzes = almQuizzes.map(this.integrations.alm.mapper);
        
        // Merge with local fun quizzes if enabled
        if (this.shouldIncludeFunQuizzes()) {
            const funQuizzes = await this.loadLocalQuizzes();
            this.quizzes = [...this.quizzes, ...funQuizzes];
        }
    }
    
    mapALMQuiz(almQuiz) {
        return {
            id: almQuiz.quiz_id,
            title: almQuiz.title,
            description: almQuiz.description,
            type: 'assigned',
            source: 'alm',
            icon: '📚',
            difficulty: this.mapALMDifficulty(almQuiz.difficulty_level),
            questionCount: almQuiz.question_count,
            timeLimit: almQuiz.time_limit,
            dueDate: almQuiz.due_date,
            attempts: {
                used: almQuiz.attempts_used || 0,
                max: almQuiz.max_attempts || 3
            },
            rewards: {
                xp: 100, // Fixed for assigned
                gems: 50,
                healthProtected: true
            },
            metadata: {
                courseId: almQuiz.course_id,
                moduleId: almQuiz.module_id,
                almQuizId: almQuiz.id
            }
        };
    }
    
    render() {
        return `
            <div class="quiz-grid">
                ${this.renderFilters()}
                ${this.renderQuizCards()}
                ${this.renderRefreshTimer()}
            </div>
        `;
    }
    
    emitsEvents() {
        return [
            'quiz:selected',
            'quiz:filtered',
            'quizzes:refreshed'
        ];
    }
    
    listensTo() {
        return [
            'quiz:completed',
            'filter:changed',
            'refresh:requested'
        ];
    }
}
```

### 4. Daily Goals Component
```javascript
// components/dashboard/DailyGoals.js
export class DailyGoals {
    constructor() {
        this.goals = {
            quizzes: { target: 5, completed: 0, icon: '🎯' },
            streak: { target: 1, completed: 0, icon: '🔥' },
            xp: { target: 500, completed: 0, icon: '⚡' },
            perfect: { target: 1, completed: 0, icon: '💯' }
        };
        
        this.lastReset = null;
        this.nextReset = null;
    }
    
    integrations = {
        // Can sync with ALM learning paths
        alm: {
            endpoint: '/alm/learning-path/daily-goals',
            enabled: false
        },
        // Local persistence
        storage: {
            service: null, // SecureStorage instance
            key: 'daily_goals'
        },
        // Notification service
        notifications: {
            service: null, // NotificationService instance
            enabled: true
        }
    };
    
    async init() {
        await this.loadGoals();
        this.checkReset();
        this.subscribeToProgress();
        this.scheduleReset();
    }
    
    async loadGoals() {
        // Try ALM first if integrated
        if (this.integrations.alm.enabled) {
            try {
                const almGoals = await this.fetchALMGoals();
                this.mergeGoals(almGoals);
            } catch (e) {
                console.log('Using default goals');
            }
        }
        
        // Load progress from storage
        const saved = await this.integrations.storage.service.get(this.integrations.storage.key);
        if (saved && this.isSameDay(saved.date)) {
            this.goals = { ...this.goals, ...saved.goals };
        }
    }
    
    subscribeToProgress() {
        EventBus.on('quiz:completed', (data) => {
            this.updateGoal('quizzes', 1);
            
            if (data.score === 100) {
                this.updateGoal('perfect', 1);
            }
        });
        
        EventBus.on('xp:earned', (data) => {
            this.updateGoal('xp', data.amount);
        });
        
        EventBus.on('streak:maintained', () => {
            this.updateGoal('streak', 1);
        });
    }
    
    updateGoal(type, increment) {
        const goal = this.goals[type];
        goal.completed = Math.min(goal.completed + increment, goal.target);
        
        // Check completion
        if (goal.completed === goal.target) {
            this.onGoalCompleted(type);
        }
        
        // Check all goals
        if (this.areAllGoalsComplete()) {
            this.onAllGoalsComplete();
        }
        
        this.save();
        EventBus.emit('goal:progress', { type, goal });
    }
    
    onGoalCompleted(type) {
        EventBus.emit('goal:completed', {
            type,
            reward: this.getGoalReward(type)
        });
        
        if (this.integrations.notifications.enabled) {
            this.integrations.notifications.service.show({
                title: 'Goal Completed! 🎉',
                body: `You've completed your ${type} goal!`,
                icon: this.goals[type].icon
            });
        }
    }
    
    render() {
        const totalProgress = this.calculateTotalProgress();
        
        return `
            <div class="daily-goals">
                <div class="goals-header">
                    <h3>Daily Goals</h3>
                    <span class="reset-timer">${this.getResetTimer()}</span>
                </div>
                <div class="goals-progress">
                    <div class="progress-ring">${totalProgress}%</div>
                    <div class="goals-list">
                        ${Object.entries(this.goals).map(([type, goal]) => `
                            <div class="goal-item ${goal.completed >= goal.target ? 'completed' : ''}">
                                <span class="goal-icon">${goal.icon}</span>
                                <span class="goal-text">${this.getGoalText(type)}</span>
                                <span class="goal-progress">${goal.completed}/${goal.target}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${totalProgress === 100 ? this.renderReward() : ''}
            </div>
        `;
    }
}
```

## 🔗 Integration Architecture

### Network Integration Layer
```javascript
// services/network/NetworkIntegration.js
export class NetworkIntegration {
    constructor() {
        this.mode = this.detectMode();
        this.adapters = new Map();
        this.fallbacks = new Map();
    }
    
    detectMode() {
        // Check for ALM integration
        if (window.ALM_CONTEXT || window.parent?.ALM_CONTEXT) {
            return 'alm';
        }
        
        // Check for LTI integration
        if (window.location.search.includes('lti_')) {
            return 'lti';
        }
        
        // Check for embed mode
        if (window.self !== window.top) {
            return 'embedded';
        }
        
        return 'standalone';
    }
    
    registerAdapter(name, adapter, fallback = null) {
        this.adapters.set(name, adapter);
        if (fallback) {
            this.fallbacks.set(name, fallback);
        }
    }
    
    async execute(adapterName, method, ...args) {
        const adapter = this.adapters.get(adapterName);
        
        if (!adapter) {
            throw new Error(`Unknown adapter: ${adapterName}`);
        }
        
        try {
            // Check if we can use the network adapter
            if (this.mode !== 'standalone' && adapter[method]) {
                return await adapter[method](...args);
            }
            
            // Use fallback
            const fallback = this.fallbacks.get(adapterName);
            if (fallback && fallback[method]) {
                return await fallback[method](...args);
            }
            
            throw new Error(`No implementation for ${adapterName}.${method}`);
            
        } catch (error) {
            console.error(`Network integration error:`, error);
            
            // Try fallback on error
            const fallback = this.fallbacks.get(adapterName);
            if (fallback && fallback[method]) {
                console.log(`Falling back to local implementation`);
                return await fallback[method](...args);
            }
            
            throw error;
        }
    }
}

// ALM Adapter
export class ALMAdapter {
    constructor(config) {
        this.baseURL = config.baseURL || '/alm/api';
        this.token = null;
    }
    
    async authenticate() {
        // Get token from parent frame or session
        this.token = await this.getALMToken();
    }
    
    async getUserProfile() {
        const response = await fetch(`${this.baseURL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'X-ALM-Context': this.getContext()
            }
        });
        
        return response.json();
    }
    
    async getAssignedQuizzes() {
        const response = await fetch(`${this.baseURL}/assignments/quizzes`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        return response.json();
    }
    
    async submitQuizResults(quizId, results) {
        return await fetch(`${this.baseURL}/quiz/${quizId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...results,
                submitted_via: 'jazzypop',
                version: '1.0'
            })
        });
    }
}

// Local Fallback Adapter
export class LocalAdapter {
    constructor() {
        this.storage = new SecureStorage();
        this.db = new IndexedDBService();
    }
    
    async getUserProfile() {
        let profile = await this.storage.get('user_profile');
        
        if (!profile) {
            // Create default profile
            profile = {
                userId: this.generateUserId(),
                displayName: 'JazzyPop Learner',
                avatar: '🎓',
                level: 1,
                totalXP: 0,
                memberSince: new Date().toISOString()
            };
            
            await this.storage.save('user_profile', profile);
        }
        
        return profile;
    }
    
    async getAssignedQuizzes() {
        // In standalone mode, return empty or demo quizzes
        return [];
    }
    
    async submitQuizResults(quizId, results) {
        // Store locally
        await this.db.quizResults.add({
            quizId,
            results,
            submittedAt: new Date().toISOString(),
            synced: false
        });
        
        // Queue for later sync if needed
        EventBus.emit('results:queued_for_sync', { quizId });
        
        return { success: true, stored: 'local' };
    }
}
```

## 🎮 Scoring System Architecture

### Main Scoring Manager
```javascript
// components/scoring/ScoringManager.js
export class ScoringManager {
    constructor() {
        this.systems = new Map();
        this.multipliers = new Map();
        this.history = [];
    }
    
    init() {
        // Register scoring systems
        this.registerSystem('base', new BaseScoring());
        this.registerSystem('time', new TimeScoring());
        this.registerSystem('streak', new StreakScoring());
        this.registerSystem('difficulty', new DifficultyScoring());
        this.registerSystem('chaos', new ChaosScoring());
        
        // Register multipliers
        this.registerMultiplier('perfect', 1.5);
        this.registerMultiplier('firstTry', 1.2);
        this.registerMultiplier('speedBonus', 1.3);
        this.registerMultiplier('chaosMode', 2.0);
    }
    
    calculateScore(context) {
        const scores = {};
        let totalScore = 0;
        
        // Calculate base scores from each system
        for (const [name, system] of this.systems) {
            scores[name] = system.calculate(context);
            totalScore += scores[name];
        }
        
        // Apply multipliers
        const activeMultipliers = this.getActiveMultipliers(context);
        let finalMultiplier = 1;
        
        for (const multiplier of activeMultipliers) {
            finalMultiplier *= this.multipliers.get(multiplier);
        }
        
        const finalScore = Math.round(totalScore * finalMultiplier);
        
        // Record for analytics
        this.recordScore({
            context,
            scores,
            multipliers: activeMultipliers,
            finalScore,
            timestamp: Date.now()
        });
        
        // Emit events
        EventBus.emit('score:calculated', {
            score: finalScore,
            breakdown: scores,
            multipliers: activeMultipliers
        });
        
        return {
            score: finalScore,
            breakdown: scores,
            multipliers: activeMultipliers,
            rewards: this.calculateRewards(finalScore, context)
        };
    }
    
    calculateRewards(score, context) {
        const rewards = {
            xp: Math.floor(score * 0.1),
            gems: Math.floor(score * 0.01)
        };
        
        // Bonus rewards
        if (context.perfect) rewards.gems += 10;
        if (context.firstTry) rewards.xp += 50;
        if (context.mode === 'chaos') rewards.gems *= 2;
        
        return rewards;
    }
}

// Individual Scoring Systems
export class BaseScoring {
    calculate(context) {
        const { correct, total } = context;
        return Math.floor((correct / total) * 100);
    }
}

export class TimeScoring {
    calculate(context) {
        const { timeSpent, timeLimit } = context;
        const timeRatio = timeSpent / timeLimit;
        
        if (timeRatio < 0.5) return 50; // Super fast
        if (timeRatio < 0.7) return 30; // Fast
        if (timeRatio < 0.9) return 20; // Normal
        if (timeRatio < 1.0) return 10; // Just in time
        return 0; // Over time
    }
}

export class StreakScoring {
    calculate(context) {
        const { currentStreak } = context;
        if (currentStreak >= 10) return 50;
        if (currentStreak >= 5) return 30;
        if (currentStreak >= 3) return 20;
        return currentStreak * 5;
    }
}

export class ChaosScoring {
    calculate(context) {
        if (context.mode !== 'chaos') return 0;
        
        const chaosFactors = context.chaosFactors || {};
        let score = 100; // Base chaos bonus
        
        if (chaosFactors.glitchSurvived) score += 50;
        if (chaosFactors.timeWarp) score += 30;
        if (chaosFactors.randomOrder) score += 20;
        
        return score;
    }
}
```

## 🔄 Component Communication Map

```javascript
// Integration flow example
class IntegrationExample {
    async startQuiz(quizId) {
        // 1. QuizGrid emits selection
        EventBus.emit('quiz:selected', { quizId });
        
        // 2. QuizEngine loads quiz
        const quiz = await quizEngine.loadQuiz(quizId);
        
        // 3. Check network integration
        if (quiz.type === 'assigned' && networkIntegration.mode === 'alm') {
            // Notify ALM of quiz start
            await networkIntegration.execute('alm', 'notifyQuizStart', quizId);
        }
        
        // 4. Mode manager applies settings
        const mode = quiz.healthProtected ? 'practice' : modeManager.getCurrentMode();
        await modeManager.setMode(mode);
        
        // 5. Stats components prepare
        if (!quiz.healthProtected) {
            heartSystem.startProtection();
        }
        
        // 6. Start quiz
        quizEngine.start();
    }
    
    async submitQuizResults(results) {
        // 1. Calculate score
        const scoreData = scoringManager.calculateScore(results);
        
        // 2. Update local systems
        await Promise.all([
            xpManager.addXP(scoreData.rewards.xp),
            gemWallet.addGems(scoreData.rewards.gems),
            streakTracker.update(results),
            dailyGoals.updateProgress(results)
        ]);
        
        // 3. Handle network submission
        if (results.quizType === 'assigned') {
            try {
                await networkIntegration.execute('alm', 'submitQuizResults', 
                    results.quizId, 
                    scoreData
                );
            } catch (error) {
                // Queue for later sync
                await syncQueue.add({
                    type: 'quiz_result',
                    data: { results, scoreData },
                    attempts: 0
                });
            }
        }
        
        // 4. Update UI
        EventBus.emit('quiz:completed', {
            results,
            score: scoreData,
            nextSteps: await this.getNextSteps()
        });
    }
}
```

## 🔐 Security Integration Points

```javascript
// Security checkpoints in component flow
class SecurityIntegration {
    // Input validation at component boundaries
    validateQuizAnswer(componentName, answer) {
        const validator = this.getValidator(componentName);
        
        if (!validator.validate(answer)) {
            this.logSecurityEvent({
                type: 'INVALID_INPUT',
                component: componentName,
                data: validator.sanitize(answer)
            });
            
            throw new ValidationError('Invalid answer format');
        }
        
        return validator.sanitize(answer);
    }
    
    // Rate limiting per component
    checkComponentRateLimit(componentName, action, userId) {
        const key = `${componentName}:${action}:${userId}`;
        const limit = this.getLimit(componentName, action);
        
        if (!this.rateLimiter.check(key, limit)) {
            this.logSecurityEvent({
                type: 'RATE_LIMIT_EXCEEDED',
                component: componentName,
                action,
                userId
            });
            
            EventBus.emit('security:rate_limited', {
                component: componentName,
                retryAfter: this.rateLimiter.getRetryAfter(key)
            });
            
            return false;
        }
        
        return true;
    }
}
```

This architecture provides:
1. **Clear separation** between components
2. **Network flexibility** - works with or without ALM
3. **Modular scoring** system
4. **Event-driven integration** points
5. **Security at boundaries**
6. **Graceful fallbacks** for offline/standalone mode
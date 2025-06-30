# JazzyPop Error Tracking & Security System

## 🛡️ Defense-in-Depth Architecture

### 1. Client-Side Error Handling

```javascript
// error-tracker.js
class ErrorTracker {
    constructor() {
        this.queue = [];
        this.maxQueueSize = 50;
        this.endpoint = '/api/errors';
        this.sessionId = this.generateSessionId();
        this.setupGlobalHandlers();
    }
    
    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.captureError({
                type: 'javascript-error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'unhandled-promise',
                reason: event.reason,
                promise: event.promise,
                timestamp: Date.now()
            });
        });
        
        // Network error tracking
        this.interceptFetch();
        this.interceptXHR();
    }
    
    interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    this.captureError({
                        type: 'network-error',
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        duration: Date.now() - startTime
                    });
                }
                return response;
            } catch (error) {
                this.captureError({
                    type: 'network-failure',
                    url: args[0],
                    error: error.message,
                    duration: Date.now() - startTime
                });
                throw error;
            }
        };
    }
    
    captureError(errorData) {
        const enrichedError = {
            ...errorData,
            sessionId: this.sessionId,
            userId: this.getUserId(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            connection: navigator.connection?.effectiveType,
            memory: navigator.deviceMemory,
            platform: navigator.platform
        };
        
        this.queue.push(enrichedError);
        
        // Trim queue if too large
        if (this.queue.length > this.maxQueueSize) {
            this.queue = this.queue.slice(-this.maxQueueSize);
        }
        
        // Send errors in batches
        this.scheduleFlush();
    }
    
    scheduleFlush() {
        if (this.flushTimer) return;
        
        this.flushTimer = setTimeout(() => {
            this.flush();
            this.flushTimer = null;
        }, 5000); // 5 second delay
    }
    
    async flush() {
        if (this.queue.length === 0) return;
        
        const errors = [...this.queue];
        this.queue = [];
        
        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({ errors })
            });
        } catch (e) {
            // Failed to send errors, put them back
            this.queue.unshift(...errors);
        }
    }
}
```

### 2. Input Validation & Sanitization

```javascript
// input-validator.js
class InputValidator {
    static patterns = {
        username: /^[a-zA-Z0-9_-]{3,20}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        quizId: /^quiz_[a-f0-9]{8}_[a-z0-9]{9}$/,
        learnerId: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
    };
    
    static sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static validateQuizAnswer(answer, questionType) {
        switch (questionType) {
            case 'mcq':
                return typeof answer === 'number' && answer >= 0 && answer < 10;
            
            case 'fib':
                return typeof answer === 'string' && 
                       answer.length > 0 && 
                       answer.length < 200 &&
                       !/<script|<iframe|javascript:|on\w+=/i.test(answer);
            
            case 'true_false':
                return answer === true || answer === false;
            
            default:
                return false;
        }
    }
    
    static sanitizeQuizInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/<script.*?>.*?<\/script>/gi, '')
            .replace(/<iframe.*?>.*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .slice(0, 500); // Max length
    }
}

// Rate limiting
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.config = {
            maxAttempts: 10,
            windowMs: 60000, // 1 minute
            blockDurationMs: 300000 // 5 minutes
        };
    }
    
    checkLimit(identifier, action) {
        const key = `${identifier}:${action}`;
        const now = Date.now();
        
        if (!this.attempts.has(key)) {
            this.attempts.set(key, []);
        }
        
        const userAttempts = this.attempts.get(key);
        
        // Clean old attempts
        const validAttempts = userAttempts.filter(
            time => now - time < this.config.windowMs
        );
        
        if (validAttempts.length >= this.config.maxAttempts) {
            throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        validAttempts.push(now);
        this.attempts.set(key, validAttempts);
        
        return true;
    }
}
```

### 3. Secure Quiz Submission

```javascript
// secure-quiz-handler.js
class SecureQuizHandler {
    constructor() {
        this.rateLimiter = new RateLimiter();
        this.validator = InputValidator;
        this.antiCheat = new AntiCheatSystem();
    }
    
    async submitAnswer(quizId, questionId, answer) {
        try {
            // Rate limiting
            this.rateLimiter.checkLimit(this.getUserId(), 'submit_answer');
            
            // Validate quiz session
            if (!this.validateQuizSession(quizId)) {
                throw new Error('INVALID_QUIZ_SESSION');
            }
            
            // Anti-cheat checks
            const suspicionScore = this.antiCheat.analyzeSubmission({
                quizId,
                questionId,
                answer,
                timestamp: Date.now()
            });
            
            if (suspicionScore > 0.8) {
                this.flagSuspiciousActivity(suspicionScore);
            }
            
            // Validate and sanitize answer
            const question = this.getQuestion(quizId, questionId);
            if (!this.validator.validateQuizAnswer(answer, question.type)) {
                throw new Error('INVALID_ANSWER_FORMAT');
            }
            
            const sanitizedAnswer = this.validator.sanitizeQuizInput(answer);
            
            // Submit with integrity check
            const submission = {
                quizId,
                questionId,
                answer: sanitizedAnswer,
                clientTimestamp: Date.now(),
                integrity: this.generateIntegrityHash({
                    quizId,
                    questionId,
                    answer: sanitizedAnswer
                })
            };
            
            return await this.secureSubmit(submission);
            
        } catch (error) {
            this.handleSubmissionError(error);
            throw error;
        }
    }
    
    generateIntegrityHash(data) {
        // Simple hash for demo - use proper crypto in production
        const str = JSON.stringify(data) + this.getSessionSecret();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
}

// Anti-cheat system
class AntiCheatSystem {
    constructor() {
        this.submissions = new Map();
        this.patterns = {
            tooFast: 2000, // 2 seconds minimum
            tooSlow: 300000, // 5 minutes maximum
            perfectStreak: 20, // Suspicious if 20 perfect in a row
            sameTimePattern: 5 // Same answer time 5x in a row
        };
    }
    
    analyzeSubmission(data) {
        const userHistory = this.getUserHistory(data.userId);
        let suspicionScore = 0;
        
        // Check answer speed
        const answerTime = data.timestamp - data.questionStartTime;
        if (answerTime < this.patterns.tooFast) {
            suspicionScore += 0.3;
        }
        
        // Check for automated patterns
        if (this.detectAutomatedPattern(userHistory)) {
            suspicionScore += 0.4;
        }
        
        // Check for impossible scores
        if (this.detectImpossibleScores(userHistory)) {
            suspicionScore += 0.5;
        }
        
        // Machine learning anomaly detection (simplified)
        const anomalyScore = this.detectAnomalies(data, userHistory);
        suspicionScore += anomalyScore * 0.3;
        
        return Math.min(suspicionScore, 1);
    }
    
    detectAutomatedPattern(history) {
        if (history.length < 10) return false;
        
        // Check for exact timing patterns
        const timings = history.map(h => h.answerTime);
        const uniqueTimings = new Set(timings.slice(-10));
        
        return uniqueTimings.size < 3; // Very few unique timings
    }
}
```

### 4. Backend Security Middleware

```javascript
// security-middleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.userId
        });
        res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

// Input sanitization
app.use(mongoSanitize());
app.use(express.json({ limit: '10kb' })); // Limit payload size

// Custom validation middleware
const validateQuizSubmission = (req, res, next) => {
    const { quizId, answers } = req.body;
    
    // Validate quiz ID format
    if (!InputValidator.patterns.quizId.test(quizId)) {
        return res.status(400).json({ error: 'INVALID_QUIZ_ID' });
    }
    
    // Validate answers array
    if (!Array.isArray(answers) || answers.length > 50) {
        return res.status(400).json({ error: 'INVALID_ANSWERS' });
    }
    
    // Validate each answer
    for (const answer of answers) {
        if (!answer.questionId || 
            typeof answer.value === 'undefined' ||
            answer.timeSpent < 0 ||
            answer.timeSpent > 300000) {
            return res.status(400).json({ error: 'INVALID_ANSWER_DATA' });
        }
    }
    
    next();
};

// Audit logging
const auditLogger = {
    log: (event, data) => {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            userId: data.userId,
            ip: data.ip,
            userAgent: data.userAgent,
            ...data
        };
        
        // Send to logging service
        logger.info('AUDIT', entry);
        
        // Store suspicious events
        if (event.includes('SUSPICIOUS') || event.includes('ERROR')) {
            db.collection('audit_logs').insertOne(entry);
        }
    }
};
```

### 5. Error Recovery & Graceful Degradation

```javascript
// error-recovery.js
class ErrorRecovery {
    static async withRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 2,
            onRetry = () => {}
        } = options;
        
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i < maxRetries - 1) {
                    onRetry(error, i + 1);
                    await new Promise(resolve => 
                        setTimeout(resolve, delay * Math.pow(backoff, i))
                    );
                }
            }
        }
        
        throw lastError;
    }
    
    static gracefulDegrade(primaryFn, fallbackFn) {
        return async (...args) => {
            try {
                return await primaryFn(...args);
            } catch (error) {
                console.error('Primary function failed, using fallback:', error);
                return await fallbackFn(...args);
            }
        };
    }
}

// Quiz state recovery
class QuizStateRecovery {
    constructor() {
        this.saveInterval = 5000; // Save every 5 seconds
        this.storage = new SecureStorage();
    }
    
    startAutoSave(quizId) {
        this.autoSaveTimer = setInterval(() => {
            this.saveQuizState(quizId);
        }, this.saveInterval);
    }
    
    saveQuizState(quizId) {
        const state = {
            quizId,
            currentQuestion: this.getCurrentQuestion(),
            answers: this.getAnswers(),
            timeSpent: this.getTimeSpent(),
            timestamp: Date.now()
        };
        
        this.storage.save(`quiz_state_${quizId}`, state);
    }
    
    async recoverQuizState(quizId) {
        try {
            const state = await this.storage.get(`quiz_state_${quizId}`);
            
            if (!state || Date.now() - state.timestamp > 3600000) {
                return null; // State too old
            }
            
            return state;
        } catch (error) {
            console.error('Failed to recover quiz state:', error);
            return null;
        }
    }
}

// Secure local storage
class SecureStorage {
    constructor() {
        this.prefix = 'jazzypop_';
        this.encryption = new SimpleEncryption();
    }
    
    save(key, value) {
        try {
            const encrypted = this.encryption.encrypt(JSON.stringify(value));
            localStorage.setItem(this.prefix + key, encrypted);
        } catch (error) {
            console.error('Storage save failed:', error);
            // Fall back to session storage
            sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
        }
    }
    
    get(key) {
        try {
            const encrypted = localStorage.getItem(this.prefix + key);
            if (!encrypted) return null;
            
            const decrypted = this.encryption.decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Storage get failed:', error);
            // Try session storage fallback
            const fallback = sessionStorage.getItem(this.prefix + key);
            return fallback ? JSON.parse(fallback) : null;
        }
    }
}
```

### 6. Monitoring Dashboard

```javascript
// monitoring-dashboard.js
class MonitoringDashboard {
    constructor() {
        this.metrics = {
            errors: new Map(),
            performance: new Map(),
            security: new Map()
        };
        
        this.thresholds = {
            errorRate: 0.05, // 5% error rate
            responseTime: 2000, // 2 seconds
            suspiciousActivity: 10 // per hour
        };
    }
    
    updateMetrics(type, data) {
        const hour = new Date().getHours();
        const key = `${type}_${hour}`;
        
        if (!this.metrics[type].has(key)) {
            this.metrics[type].set(key, []);
        }
        
        this.metrics[type].get(key).push(data);
        this.checkThresholds(type);
    }
    
    checkThresholds(type) {
        const currentMetrics = this.getCurrentHourMetrics(type);
        
        switch (type) {
            case 'errors':
                if (this.calculateErrorRate() > this.thresholds.errorRate) {
                    this.alert('HIGH_ERROR_RATE', {
                        rate: this.calculateErrorRate(),
                        errors: currentMetrics
                    });
                }
                break;
                
            case 'security':
                if (currentMetrics.length > this.thresholds.suspiciousActivity) {
                    this.alert('SUSPICIOUS_ACTIVITY_SPIKE', {
                        count: currentMetrics.length,
                        activities: currentMetrics
                    });
                }
                break;
        }
    }
    
    alert(type, data) {
        // Send to monitoring service
        console.error(`ALERT: ${type}`, data);
        
        // Send to Slack/Discord/Email
        this.sendNotification({
            level: 'critical',
            type,
            data,
            timestamp: new Date().toISOString()
        });
    }
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Global error handlers
- [ ] Input validation library
- [ ] Rate limiting
- [ ] Basic audit logging

### Phase 2: Security
- [ ] Anti-cheat system
- [ ] Secure submission flow
- [ ] Session validation
- [ ] CSRF protection

### Phase 3: Recovery
- [ ] Auto-save quiz state
- [ ] Graceful degradation
- [ ] Offline support
- [ ] Error recovery

### Phase 4: Monitoring
- [ ] Real-time dashboard
- [ ] Alert system
- [ ] Performance tracking
- [ ] Security monitoring
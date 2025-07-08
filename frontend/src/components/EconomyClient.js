/**
 * EconomyClient - Thin client for backend economy API
 * 
 * This is a lightweight client that only:
 * 1. Displays economy state from the backend
 * 2. Sends requests to the backend API
 * 3. Updates the UI with backend responses
 * 
 * ALL economy logic happens on the backend!
 */

class EconomyClient {
    constructor() {
        this.apiBase = window.API_URL || 'https://p0qp0q.com';
        this.sessionId = this.getOrCreateSessionId();
        this.userId = localStorage.getItem('userId');
        
        // Display cache - only for UI, not authoritative
        this.displayState = {
            energy: 0,
            hearts: 0,
            coins: 0,
            sapphires: 0,
            emeralds: 0,
            rubies: 0,
            amethysts: 0,
            diamonds: 0,
            xp: 0,
            level: 1,
            streak: 0
        };
        
        // Initialize
        this.init();
        
        // Make globally available
        window.economyClient = this;
    }
    
    async init() {
        // Fetch initial state from backend
        await this.syncWithBackend();
        
        // Sync periodically (every 30 seconds)
        setInterval(() => this.syncWithBackend(), 30000);
        
        // Update UI
        this.updateDisplay();
    }
    
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }
    
    // Sync display state with backend
    async syncWithBackend() {
        try {
            const params = new URLSearchParams();
            if (this.userId) params.append('user_id', this.userId);
            params.append('session_id', this.sessionId);
            
            const response = await fetch(`${this.apiBase}/api/economy/state?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.state) {
                    this.displayState = data.state;
                    this.updateDisplay();
                }
            }
        } catch (error) {
            console.error('Failed to sync with backend:', error);
        }
    }
    
    // Update UI elements
    updateDisplay() {
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('economyUpdated', { 
            detail: this.displayState 
        }));
        
        // Also trigger the legacy statsUpdated event
        window.dispatchEvent(new Event('statsUpdated'));
    }
    
    // Get current display state
    getDisplayState() {
        return {
            ...this.displayState,
            canPlayQuiz: this.displayState.energy >= 10 && this.displayState.hearts > 0,
            canPractice: this.displayState.energy >= 1
        };
    }
    
    // Spend energy
    async spendEnergy(amount, activityType) {
        try {
            const response = await fetch(`${this.apiBase}/api/economy/spend-energy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({
                    amount,
                    activity_type: activityType,
                    session_id: this.sessionId,
                    user_id: this.userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.new_state) {
                    this.displayState = data.new_state;
                    this.updateDisplay();
                }
                return { success: true, ...data };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Failed to spend energy' };
            }
        } catch (error) {
            console.error('spendEnergy error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Process quiz completion
    async processQuizComplete(quizData) {
        try {
            const response = await fetch(`${this.apiBase}/api/economy/process-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({
                    type: 'quiz_complete',
                    category: quizData.category || 'general',
                    difficulty: quizData.difficulty || 'medium',
                    mode: quizData.mode || 'normal',
                    correct_answers: quizData.correctAnswers || 0,
                    total_questions: quizData.totalQuestions || 1,
                    time_spent: quizData.timeSpent || 0,
                    perfect_score: quizData.correctAnswers === quizData.totalQuestions,
                    streak: quizData.streak || 0,
                    session_id: this.sessionId,
                    user_id: this.userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.new_state) {
                    this.displayState = data.new_state;
                    this.updateDisplay();
                }
                return { success: true, ...data };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Failed to process quiz' };
            }
        } catch (error) {
            console.error('processQuizComplete error:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    // Process flashcard/practice completion
    async processFlashcardComplete(flashcardData) {
        try {
            const response = await fetch(`${this.apiBase}/api/economy/process-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({
                    type: 'practice_complete',
                    category: flashcardData.category || flashcardData.cardType || 'general',
                    difficulty: 'easy',
                    mode: 'normal',
                    correct_answers: flashcardData.correctCount || 0,
                    total_questions: flashcardData.totalCards || 1,
                    time_spent: flashcardData.practiceTime || 0,
                    perfect_score: flashcardData.correctCount === flashcardData.totalCards,
                    streak: 0,
                    session_id: this.sessionId,
                    user_id: this.userId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.new_state) {
                    this.displayState = data.new_state;
                    this.updateDisplay();
                }
                return { success: true, ...data };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Failed to process practice' };
            }
        } catch (error) {
            console.error('processFlashcardComplete error:', error);
            return { success: false, error: 'Network error' };
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EconomyClient());
} else {
    new EconomyClient();
}
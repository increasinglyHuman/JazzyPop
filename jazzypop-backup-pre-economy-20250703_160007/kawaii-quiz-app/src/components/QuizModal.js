/**
 * Quiz Modal Component
 * Uses the divine quiz format from mobile-test.html
 * Fetches mode-specific content from the API
 */

class QuizModal {
    constructor() {
        this.modal = null;
        this.currentQuizSet = null;
        this.currentQuestionIndex = 0;
        this.selectedAnswer = null;
        this.speedTimer = null;
        this.timeRemaining = 30;
        this.mode = 'poqpoq'; // Default mode
        this.score = 0;
        this.correctAnswers = 0;
        this.init();
    }

    init() {
        // Get current mode from settings
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        this.mode = settings.theme || 'poqpoq';
        
        // Create modal structure
        this.createModal();
        
        // Listen for mode changes
        window.addEventListener('modeChanged', (e) => {
            this.mode = e.detail.mode;
            this.applyModeEffects();
        });
    }

    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'quiz-modal';
        this.modal.innerHTML = `
            <div class="quiz-overlay" onclick="window.quizModal.close()"></div>
            <div class="quiz-content">
                <div class="quiz-header">
                    <button class="quiz-close" onclick="window.quizModal.close()">×</button>
                </div>
                
                <!-- Mode indicator bot -->
                <div class="mode-bot-indicator" id="quiz-mode-bot" style="display: none;">
                    <img src="" alt="Mode Bot" style="width: 60px; height: 60px;">
                </div>
                
                <!-- Speed mode timer -->
                <div class="speed-timer" id="quiz-speed-timer" style="display: none;">30</div>
                
                <!-- Quiz Card -->
                <div class="quiz-card">
                    <h3 id="questionText" class="question-text">Loading question...</h3>
                    <div id="answersContainer" class="answers-container">
                        <!-- Answers will be loaded here -->
                    </div>
                    <div style="clear: both;"></div>
                    <button class="submit-btn" id="submitBtn" onclick="window.quizModal.submitAnswer()">Skip</button>
                    <div style="clear: both;"></div>
                </div>
                
                <!-- Effects containers -->
                <div id="quiz-ripple-container" class="ripple-container"></div>
                <div class="speed-bg-rotate" id="quiz-speed-bg" style="display: none;"></div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Make this instance globally available
        window.quizModal = this;
    }

    async open(quizData, config = {}) {
        // Check if user has enough energy to play
        if (window.economyManager) {
            const economyState = window.economyManager.getDisplayState();
            if (!economyState.canPlayQuiz) {
                // Show insufficient resources message
                if (economyState.energy < 10) {
                    window.alertModal?.open({
                        title: 'Not Enough Energy!',
                        message: 'You need at least 10 energy to play a quiz. Energy regenerates over time.',
                        type: 'warning'
                    });
                } else if (economyState.hearts === 0) {
                    window.alertModal?.open({
                        title: 'No Hearts!',
                        message: 'You need at least 1 heart to play. Hearts regenerate every 4 hours.',
                        type: 'error'
                    });
                }
                return;
            }
            
            // Deduct energy cost
            const energyResult = await window.economyManager.spendEnergy(10, 'quiz_start');
            if (!energyResult.success) {
                console.error('Failed to deduct energy:', energyResult.error);
                return;
            }
        }
        
        // Show modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Set mode from config if provided
        if (config.mode) {
            this.mode = config.mode;
        }
        
        // Use passed quiz data directly
        if (quizData && typeof quizData === 'object') {
            // Use the quiz data that was passed
            await this.loadQuizData(quizData);
        } else {
            // Fallback to old behavior if just an ID is passed
            await this.loadQuiz(quizData);
        }
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Stop any timers
        this.stopSpeedTimer();
        
        // Clear effects
        this.clearEffects();
    }

    async loadQuizData(quizData) {
        try {
            // Show loading state briefly
            document.getElementById('questionText').textContent = 'Loading quiz...';
            document.getElementById('answersContainer').innerHTML = '';
            
            // Apply mode effects based on quiz mode
            if (quizData.mode && ['chaos', 'zen', 'speed', 'poqpoq'].includes(quizData.mode)) {
                this.mode = quizData.mode;
            }
            
            // Apply mode effects
            this.applyModeEffects();
            
            // Use the passed quiz data directly
            this.currentQuizSet = quizData;
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.correctAnswers = 0;
            this.displayCurrentQuestion();
            
        } catch (error) {
            console.error('Failed to load quiz data:', error);
            document.getElementById('questionText').textContent = 'Failed to load quiz. Please try again.';
            
            // Close modal after a delay
            setTimeout(() => this.close(), 2000);
        }
    }

    async loadQuiz(quizId) {
        try {
            // Show loading state
            document.getElementById('questionText').textContent = 'Loading quiz...';
            document.getElementById('answersContainer').innerHTML = '';
            
            // Get completed quizzes to avoid repeats
            const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes') || '[]');
            const recentQuizIds = completedQuizzes.slice(-10).map(q => q.id).join(',');
            
            // Fetch quiz from API with exclusion list and specific mode if set
            const apiBase = window.API_URL || 'http://52.88.234.65:8000';
            // If quiz has specific mode, request that mode's content
            const modeParam = this.mode && this.mode !== 'poqpoq' ? `&mode=${this.mode}` : '';
            const url = `${apiBase}/api/content/quiz/current?exclude=${recentQuizIds}${modeParam}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to load quiz');
            }
            
            const quizData = await response.json();
            
            // Check if quiz has a specific mode tag from API
            if (quizData.mode && ['chaos', 'zen', 'speed', 'poqpoq'].includes(quizData.mode)) {
                // Only override if we don't already have a mode from the card
                if (!this.mode || this.mode === 'poqpoq') {
                    this.mode = quizData.mode;
                }
            }
            
            // Apply mode effects after we know the final mode
            this.applyModeEffects();
            
            // Check if this is a quiz set or single question
            if (quizData.data.questions && Array.isArray(quizData.data.questions)) {
                // This is a quiz set with multiple questions
                this.currentQuizSet = quizData;
                this.currentQuestionIndex = 0;
                this.score = 0;
                this.correctAnswers = 0;
                this.displayCurrentQuestion();
            } else {
                // Legacy single question format
                this.currentQuizSet = {
                    ...quizData,
                    data: {
                        questions: [quizData.data],
                        total_questions: 1
                    }
                };
                this.currentQuestionIndex = 0;
                this.displayCurrentQuestion();
            }
            
        } catch (error) {
            console.error('Failed to load quiz:', error);
            document.getElementById('questionText').textContent = 'Failed to load quiz. Please try again.';
            
            // Emit event to notify card manager
            window.dispatchEvent(new CustomEvent('quizLoadFailed', {
                detail: { quizId: quizId, error: error.message }
            }));
            
            // Close modal after a delay
            setTimeout(() => this.close(), 2000);
        }
    }
    
    displayCurrentQuestion() {
        const questions = this.currentQuizSet.data.questions;
        if (this.currentQuestionIndex >= questions.length) {
            // Quiz complete!
            this.showQuizComplete();
            return;
        }
        
        const currentQ = questions[this.currentQuestionIndex];
        
        // Get mode-specific question text
        let questionText = currentQ.question;
        if (this.mode === 'chaos' && this.currentQuizSet.mode_variations?.chaos?.questions) {
            questionText = this.currentQuizSet.mode_variations.chaos.questions[this.currentQuestionIndex]?.question || questionText;
        }
        
        // Display question number and text
        const questionNum = this.currentQuestionIndex + 1;
        const totalQuestions = questions.length;
        document.getElementById('questionText').textContent = `Q${questionNum}/${totalQuestions}: ${questionText}`;
        
        // Display answers
        this.displayAnswers(currentQ.answers);
        
        // Reset button
        document.getElementById('submitBtn').textContent = 'Skip';
        
        // Start timer if in speed mode
        if (this.mode === 'speed') {
            this.timeRemaining = this.currentQuizSet.mode_variations?.speed?.time_per_question || 30;
            this.startSpeedTimer();
        }
    }

    getQuestionText(quizData) {
        // Get mode-specific question text
        switch (this.mode) {
            case 'chaos':
                return quizData.mode_variations?.chaos?.question || quizData.data.question;
            case 'zen':
                // Zen mode might have a calm version
                return quizData.mode_variations?.zen?.question || quizData.data.question;
            case 'speed':
                // Speed mode uses normal question but with timer
                return quizData.data.question;
            default:
                return quizData.data.question;
        }
    }

    displayAnswers(answers) {
        const container = document.getElementById('answersContainer');
        container.innerHTML = '';
        
        // Shuffle answers for chaos mode
        const displayAnswers = this.mode === 'chaos' 
            ? [...answers].sort(() => Math.random() - 0.5)
            : answers;
        
        displayAnswers.forEach((answer, index) => {
            const option = document.createElement('div');
            option.className = 'answer-option';
            option.textContent = answer.text;
            option.dataset.answerId = answer.id;
            option.dataset.correct = answer.correct;
            
            // In chaos mode, randomly flip one answer upside down
            if (this.mode === 'chaos' && Math.random() < 0.25 && index === Math.floor(Math.random() * displayAnswers.length)) {
                option.style.transform = 'scaleY(-1)';
                option.style.transformOrigin = 'center';
            }
            
            option.addEventListener('click', () => this.selectAnswer(option));
            container.appendChild(option);
        });
    }

    selectAnswer(element) {
        // Remove previous selection
        document.querySelectorAll('.answer-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select this answer
        element.classList.add('selected');
        this.selectedAnswer = element;
        
        // Update button text
        document.getElementById('submitBtn').textContent = 'Submit';
        
        // Zen mode ripple on click
        if (this.mode === 'zen') {
            this.createRipple(event);
        }
    }

    submitAnswer() {
        const btn = document.getElementById('submitBtn');
        
        if (!this.selectedAnswer) {
            // Skip
            btn.textContent = '⏩';
            setTimeout(() => this.loadNextQuestion(), 500);
        } else {
            // Check answer
            const isCorrect = this.selectedAnswer.dataset.correct === 'true';
            
            // Update button
            btn.textContent = isCorrect ? '✓' : '❌';
            
            // Show feedback after delay so player can see which answer was correct
            setTimeout(() => {
                this.showFeedback(isCorrect);
            }, 1200); // 1.2 second delay to see the colored answer buttons
            
            // Disable further selection
            document.querySelectorAll('.answer-option').forEach(opt => {
                opt.style.pointerEvents = 'none';
                if (opt.dataset.correct === 'true') {
                    opt.classList.add('correct');
                    if (this.mode === 'zen') {
                        opt.classList.add('correct-pulse');
                    }
                } else if (opt.classList.contains('selected')) {
                    opt.classList.add('incorrect');
                }
            });
            
            // Track answer
            this.trackAnswer(isCorrect);
            
            // Load next question after delay
            const delay = this.mode === 'speed' ? 1500 : 2000;
            setTimeout(() => {
                btn.textContent = 'Skip';
                this.loadNextQuestion();
            }, delay);
        }
    }

    showFeedback(isCorrect) {
        // Show feedback bot
        const bot = document.createElement('div');
        bot.className = isCorrect ? 'feedback-bot show success' : 'feedback-bot show';
        
        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.src = isCorrect 
            ? '../src/images/checkmark-bot.svg' 
            : '../src/images/not-bot.svg';
        
        bot.appendChild(img);
        this.modal.appendChild(bot);
        
        // Remove after animation
        setTimeout(() => {
            bot.classList.remove('show');
            bot.classList.add('hide');
            setTimeout(() => bot.remove(), 300);
        }, 1500);
        
        // Don't deduct hearts per question - only on quiz failure
        
        // Track score but don't award per-answer (will be done at quiz completion)
        if (isCorrect) {
            // Mode-specific effects
            if (this.mode === 'chaos') {
                this.chaosSuccessEffect();
            } else if (this.mode === 'zen') {
                this.zenSuccessEffect();
            }
        }
    }

    async loadNextQuestion() {
        // Reset state
        this.selectedAnswer = null;
        
        // Move to next question in the set
        this.currentQuestionIndex++;
        
        // Display next question or complete quiz
        this.displayCurrentQuestion();
    }

    async trackAnswer(isCorrect) {
        // Track the answer with the API
        try {
            const apiBase = window.API_URL || 'http://52.88.234.65:8000';
            await fetch(`${apiBase}/api/content/quiz/${this.currentQuestion.id}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quiz_id: this.currentQuestion.id,
                    answer_id: this.selectedAnswer.dataset.answerId,
                    time_taken: this.mode === 'speed' ? 30 - this.timeRemaining : 0,
                    mode: this.mode
                })
            });
        } catch (error) {
            console.error('Failed to track answer:', error);
        }
    }

    applyModeEffects() {
        const content = this.modal.querySelector('.quiz-content');
        const modeBot = document.getElementById('quiz-mode-bot');
        const modeBotImg = modeBot.querySelector('img');
        
        // Remove all mode classes
        content.classList.remove('mode-zen', 'mode-chaos', 'mode-speed', 'mode-poqpoq');
        
        // Apply current mode class
        content.classList.add(`mode-${this.mode}`);
        
        // Show mode bot icon
        const botIcons = {
            'chaos': '../src/images/chaos-bot.svg',
            'zen': '../src/images/zen-bot.svg',
            'speed': '../src/images/speed-bot.svg'
        };
        
        if (botIcons[this.mode]) {
            modeBotImg.src = botIcons[this.mode];
            modeBot.style.display = 'block';
        } else {
            modeBot.style.display = 'none';
        }
        
        // Mode-specific setup
        switch (this.mode) {
            case 'zen':
                this.enableZenMode();
                break;
            case 'chaos':
                this.enableChaosMode();
                break;
            case 'speed':
                this.enableSpeedMode();
                break;
            default:
                this.clearEffects();
        }
    }

    enableZenMode() {
        // Clear other effects
        this.clearEffects();
        
        // Enable click ripple effects
        this.modal.addEventListener('click', this.handleZenClick.bind(this));
        
        // Create ambient ripples periodically
        this.zenRippleInterval = setInterval(() => {
            this.createRipple({
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight
            });
        }, 3000);
    }
    
    handleZenClick(e) {
        if (this.mode === 'zen') {
            this.createRipple(e);
        }
    }

    enableChaosMode() {
        // Clear other effects
        this.clearEffects();
        
        // Apply chaos mode styles
        const card = this.modal.querySelector('.quiz-card');
        const content = this.modal.querySelector('.quiz-content');
        
        // Add chaos animations from chaos.css
        card.style.animation = 'chaos-float 5s ease-in-out infinite';
        
        // Add glitch effect to question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.style.animation = 'glitch-text 10s infinite';
        }
        
        // Add chaos particles periodically
        this.chaosParticleInterval = setInterval(() => {
            this.createChaosParticle();
        }, 2000);
    }

    enableSpeedMode() {
        // Show speed background and timer
        document.getElementById('quiz-speed-bg').style.display = 'block';
        document.getElementById('quiz-speed-timer').style.display = 'block';
        
        // Timer will start when first question is displayed
        console.log('Speed mode enabled - timer will start with first question');
    }

    clearEffects() {
        // Hide speed elements
        document.getElementById('quiz-speed-bg').style.display = 'none';
        document.getElementById('quiz-speed-timer').style.display = 'none';
        
        // Clear chaos animations
        const card = this.modal.querySelector('.quiz-card');
        card.style.animation = '';
        
        // Clear chaos particles interval
        if (this.chaosParticleInterval) {
            clearInterval(this.chaosParticleInterval);
            this.chaosParticleInterval = null;
        }
        
        // Clear zen ripple interval
        if (this.zenRippleInterval) {
            clearInterval(this.zenRippleInterval);
            this.zenRippleInterval = null;
        }
        
        // Remove click handler
        this.modal.removeEventListener('click', this.handleZenClick);
        
        // Remove any existing chaos particles
        document.querySelectorAll('.chaos-particle').forEach(p => p.remove());
        
        // Clear ripples
        document.getElementById('quiz-ripple-container').innerHTML = '';
    }

    // Speed mode timer
    startSpeedTimer() {
        this.stopSpeedTimer();
        this.timeRemaining = 30;
        
        const timerEl = document.getElementById('quiz-speed-timer');
        timerEl.textContent = this.timeRemaining;
        timerEl.className = 'speed-timer';
        
        this.speedTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.stopSpeedTimer();
                this.timeOutEffect();
            }
        }, 1000);
    }

    stopSpeedTimer() {
        if (this.speedTimer) {
            clearInterval(this.speedTimer);
            this.speedTimer = null;
        }
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('quiz-speed-timer');
        
        // Create exploding clone effect
        if (timerEl.textContent !== this.timeRemaining.toString()) {
            const clone = document.createElement('div');
            clone.className = 'timer-clone';
            clone.textContent = timerEl.textContent;
            
            const oldTime = parseInt(timerEl.textContent);
            if (oldTime <= 5) {
                clone.classList.add('critical');
            } else if (oldTime <= 10) {
                clone.classList.add('warning');
            }
            
            this.modal.appendChild(clone);
            setTimeout(() => clone.remove(), 1000);
        }
        
        timerEl.textContent = this.timeRemaining;
        
        // Update timer color
        timerEl.className = 'speed-timer';
        if (this.timeRemaining <= 5) {
            timerEl.classList.add('critical');
        } else if (this.timeRemaining <= 10) {
            timerEl.classList.add('warning');
        }
    }

    timeOutEffect() {
        // Flash all answers red
        document.querySelectorAll('.answer-option').forEach((answer, index) => {
            setTimeout(() => {
                answer.classList.add('timeout');
            }, index * 100);
        });
        
        // Big TIME'S UP message
        const timeoutMsg = document.createElement('div');
        timeoutMsg.className = 'timeout-message';
        timeoutMsg.textContent = "TIME'S UP!";
        this.modal.appendChild(timeoutMsg);
        
        setTimeout(() => timeoutMsg.remove(), 1000);
        
        // Auto skip after effect
        setTimeout(() => {
            this.submitAnswer();
        }, 2000);
    }

    // Zen mode ripple effect
    createRipple(e) {
        const container = document.getElementById('quiz-ripple-container');
        const rect = this.modal.querySelector('.quiz-content').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ripple = document.createElement('div');
                ripple.className = 'zen-ripple';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                container.appendChild(ripple);
                setTimeout(() => ripple.remove(), 4000);
            }, i * 200);
        }
    }

    zenSuccessEffect() {
        // Create multiple ripples from center
        const rect = this.modal.querySelector('.quiz-card').getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createRipple({ 
                    clientX: rect.left + centerX, 
                    clientY: rect.top + centerY 
                });
            }, i * 100);
        }
    }

    chaosSuccessEffect() {
        // Crazy particle explosion
        const particles = ['🎉', '🎊', '✨', '🌟', '💥', '🎆', '🎯', '🏆'];
        const card = this.modal.querySelector('.quiz-card');
        const rect = card.getBoundingClientRect();
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'chaos-particle';
            particle.textContent = particles[Math.floor(Math.random() * particles.length)];
            particle.style.left = Math.random() * rect.width + 'px';
            particle.style.top = rect.height / 2 + 'px';
            card.appendChild(particle);
            
            setTimeout(() => particle.remove(), 2000);
        }
    }
    
    createChaosParticle() {
        const particles = ['🌈', '🦄', '🌀', '⚡', '🔥', '💫', '🌟', '✨'];
        const particle = document.createElement('div');
        particle.className = 'chaos-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        particle.style.cssText = `
            position: fixed;
            left: ${Math.random() * window.innerWidth}px;
            bottom: -50px;
            font-size: 24px;
            z-index: 1;
            pointer-events: none;
            animation: float-particle 10s linear forwards;
        `;
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 10000);
    }

    updateDashboardXP(xpEarned) {
        // Use EconomyManager for XP updates
        if (window.economyManager) {
            window.economyManager.updateXP(xpEarned, 'quiz');
            window.economyManager.updateStreak();
        } else {
            console.warn('EconomyManager not initialized');
        }
    }

    // Removed animateValue - now handled by EconomyManager

    showXPReward(xpAmount) {
        // Create XP reward popup
        const reward = document.createElement('div');
        reward.className = 'xp-reward-popup';
        reward.innerHTML = `
            <div class="xp-icon">⭐</div>
            <div class="xp-amount">+${xpAmount} XP</div>
        `;
        
        // Position it above the feedback bot
        reward.style.cssText = `
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 300;
        `;
        
        this.modal.appendChild(reward);
        
        // Animate and remove
        setTimeout(() => {
            reward.classList.add('animate-up');
            setTimeout(() => reward.remove(), 2000);
        }, 500);
    }

    // Removed updateXPInDatabase - now handled by EconomyManager
    
    // Removed updateStreak - now handled by EconomyManager

    // Removed showStreakUpdate - now handled by EconomyManager

    // Removed deductHeart - hearts only deducted on quiz failure via EconomyManager
    
    showHeartLoss() {
        // Create dead heart overlay like the bot feedback in flashcards
        const overlay = document.createElement('div');
        overlay.className = 'answer-overlay dead-heart-overlay';
        overlay.innerHTML = `
            <div class="dead-heart-container">
                <div class="dead-heart">💔</div>
                <div class="heart-loss-text">
                    <h3>-1 Heart</h3>
                    <p>Keep trying!</p>
                </div>
            </div>
        `;
        
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 250;
        `;
        
        // Add to quiz card
        const quizCard = this.modal.querySelector('.quiz-card');
        quizCard.appendChild(overlay);
        
        // Style the dead heart
        const deadHeart = overlay.querySelector('.dead-heart');
        deadHeart.style.cssText = `
            font-size: 120px;
            margin-bottom: 20px;
            animation: heartBreak 0.6s ease;
        `;
        
        // Style the text
        const heartText = overlay.querySelector('.heart-loss-text');
        heartText.style.cssText = `
            text-align: center;
            color: white;
        `;
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
        
        // Animate out after delay
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }, 1500);
    }
    
    showGameOver() {
        // Close quiz and show game over
        this.close();
        window.showAlert('Out of hearts! Take a break and come back later.', 'OK', 'stop');
        // In a real app, this would trigger a cooldown period
    }
    
    // Removed showLevelUp - now handled by EconomyManager
    
    async showQuizComplete() {
        // Calculate final score
        const totalQuestions = this.currentQuizSet.data.questions.length;
        const percentage = Math.round((this.correctAnswers / totalQuestions) * 100);
        
        // Stop any timers
        this.stopSpeedTimer();
        
        // Process quiz completion through EconomyManager
        if (window.economyManager) {
            const quizData = {
                quizId: this.currentQuizSet.id,
                category: this.currentQuizSet.data.category || 'general',
                difficulty: this.currentQuizSet.data.difficulty || 'medium',
                mode: this.mode,
                correctAnswers: this.correctAnswers,
                totalQuestions: totalQuestions,
                timeSpent: this.timeSpent || 0,
                streak: 0 // TODO: Get actual streak from economy manager
            };
            
            const result = await window.economyManager.processQuizComplete(quizData);
            
            if (!result.success && result.needsHearts) {
                // Show no hearts message
                document.getElementById('questionText').textContent = 'No Hearts!';
                document.getElementById('answersContainer').innerHTML = `
                    <div class="quiz-results">
                        <div class="no-hearts-message">
                            <span class="heart-icon">💔</span>
                            <p>You need hearts to continue playing!</p>
                            <p class="heart-timer">Hearts regenerate over time (4 hours each)</p>
                        </div>
                    </div>
                `;
                
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.textContent = 'Close';
                submitBtn.onclick = () => this.close();
                return;
            }
        }
        
        // Update question area with results
        document.getElementById('questionText').textContent = 'Quiz Complete!';
        document.getElementById('answersContainer').innerHTML = `
            <div class="quiz-results">
                <div class="result-stat">
                    <span class="stat-label">Score</span>
                    <span class="stat-value">${this.correctAnswers}/${totalQuestions}</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Accuracy</span>
                    <span class="stat-value">${percentage}%</span>
                </div>
            </div>
            <div class="result-message">
                ${percentage >= 80 ? '🏆 Excellent!' : percentage >= 60 ? '👍 Good job!' : '💪 Keep practicing!'}
            </div>
        `;
        
        // Change button to "Play Again"
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.textContent = 'Play Again';
        submitBtn.onclick = () => {
            this.close();
            window.quizModal.open('new');
        };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new QuizModal());
} else {
    new QuizModal();
}
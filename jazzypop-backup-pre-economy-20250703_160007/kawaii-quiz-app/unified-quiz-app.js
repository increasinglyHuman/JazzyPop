// JazzyPop Unified Quiz Application
// Combines gamification, multiple question types, and character system

class JazzyPopQuiz {
    constructor() {
        // Core game state
        this.state = {
            // Progress
            currentQuestion: 1,
            totalQuestions: 10,
            correctAnswers: 0,
            
            // Gamification
            streak: 0,
            gems: 0,
            hearts: 5,
            xp: 0,
            level: 1,
            
            // Settings
            mode: 'normal', // normal, zen, game, chaos
            soundEnabled: true,
            hapticEnabled: true
        };
        
        // Question types configuration
        this.questionTypes = {
            fib: {
                name: 'Fill in the Blank',
                icon: '✏️',
                weight: 30 // 30% chance
            },
            mcq: {
                name: 'Multiple Choice',
                icon: '🎯',
                weight: 40
            },
            trueFalse: {
                name: 'True or False',
                icon: '⚡',
                weight: 20
            },
            order: {
                name: 'Word Order',
                icon: '📝',
                weight: 10
            }
        };
        
        // Characters for different states
        this.characters = {
            normal: {
                idle: '🤖',
                happy: '🤩',
                sad: '😔',
                thinking: '🤔',
                streak: '🔥'
            },
            zen: {
                idle: '🧘',
                happy: '😌',
                sad: '😞',
                thinking: '🤲',
                streak: '✨'
            },
            game: {
                idle: '🎮',
                happy: '🎯',
                sad: '💔',
                thinking: '🕹️',
                streak: '⚡'
            },
            chaos: {
                idle: '🌪️',
                happy: '🌈',
                sad: '💥',
                thinking: '🌀',
                streak: '🚀'
            }
        };
        
        // Rewards configuration
        this.rewards = {
            correctAnswer: { gems: 10, xp: 15 },
            streak3: { gems: 20, xp: 30 },
            streak5: { gems: 50, xp: 75 },
            streak10: { gems: 100, xp: 150 },
            perfectLevel: { gems: 200, xp: 300 }
        };
        
        // Sound effects (simplified)
        this.sounds = {
            correct: '✅',
            wrong: '❌',
            levelUp: '🎉',
            streak: '🔥'
        };
    }
    
    // Initialize the quiz
    init() {
        this.loadState();
        this.setupEventListeners();
        this.render();
        this.loadNextQuestion();
    }
    
    // Load saved state
    loadState() {
        // COMMENTED OUT FOR ALM TESTING - localStorage triggers iframe issues
        // const saved = localStorage.getItem('jazzyPopState');
        // if (saved) {
        //     this.state = { ...this.state, ...JSON.parse(saved) };
        // }
    }
    
    // Save state
    saveState() {
        // COMMENTED OUT FOR ALM TESTING - localStorage triggers iframe issues
        // localStorage.setItem('jazzyPopState', JSON.stringify(this.state));
    }
    
    // Generate question based on type weights
    generateQuestion() {
        const rand = Math.random() * 100;
        let accumulator = 0;
        
        for (const [type, config] of Object.entries(this.questionTypes)) {
            accumulator += config.weight;
            if (rand <= accumulator) {
                return this.createQuestion(type);
            }
        }
        
        return this.createQuestion('mcq'); // fallback
    }
    
    // Create specific question type
    createQuestion(type) {
        const questions = {
            fib: {
                type: 'fib',
                instruction: 'Fill in the blank',
                content: {
                    text: "The ___ method creates a new array with transformed elements.",
                    answer: "map",
                    hint: "Think about transformation..."
                }
            },
            mcq: {
                type: 'mcq',
                instruction: 'Select the correct answer',
                content: {
                    question: "Which of these is NOT a JavaScript data type?",
                    options: ["String", "Boolean", "Integer", "Object"],
                    correct: 2 // Integer (it's Number in JS)
                }
            },
            trueFalse: {
                type: 'trueFalse',
                instruction: 'True or False?',
                content: {
                    statement: "JavaScript is a compiled language.",
                    answer: false
                }
            },
            order: {
                type: 'order',
                instruction: 'Put the words in correct order',
                content: {
                    scrambled: ["creates", "function", "A", "reusable", "code"],
                    correct: ["A", "function", "creates", "reusable", "code"]
                }
            }
        };
        
        return questions[type] || questions.mcq;
    }
    
    // Check answer based on question type
    checkAnswer(answer) {
        const question = this.currentQuestion;
        let isCorrect = false;
        
        switch (question.type) {
            case 'fib':
                isCorrect = answer.toLowerCase().trim() === question.content.answer.toLowerCase();
                break;
            case 'mcq':
                isCorrect = answer === question.content.correct;
                break;
            case 'trueFalse':
                isCorrect = answer === question.content.answer;
                break;
            case 'order':
                isCorrect = JSON.stringify(answer) === JSON.stringify(question.content.correct);
                break;
        }
        
        this.processAnswer(isCorrect);
        return isCorrect;
    }
    
    // Process answer result
    processAnswer(isCorrect) {
        if (isCorrect) {
            // Update stats
            this.state.correctAnswers++;
            this.state.streak++;
            
            // Calculate rewards
            let gemsEarned = this.rewards.correctAnswer.gems;
            let xpEarned = this.rewards.correctAnswer.xp;
            
            // Streak bonuses
            if (this.state.streak === 3) {
                gemsEarned += this.rewards.streak3.gems;
                xpEarned += this.rewards.streak3.xp;
                this.triggerStreakAnimation(3);
            } else if (this.state.streak === 5) {
                gemsEarned += this.rewards.streak5.gems;
                xpEarned += this.rewards.streak5.xp;
                this.triggerStreakAnimation(5);
            } else if (this.state.streak === 10) {
                gemsEarned += this.rewards.streak10.gems;
                xpEarned += this.rewards.streak10.xp;
                this.triggerStreakAnimation(10);
            }
            
            // Apply rewards
            this.state.gems += gemsEarned;
            this.state.xp += xpEarned;
            
            // Check level up
            const newLevel = Math.floor(this.state.xp / 1000) + 1;
            if (newLevel > this.state.level) {
                this.state.level = newLevel;
                this.triggerLevelUp();
            }
            
            // Play sound
            this.playSound('correct');
            
            // Update character
            this.updateCharacter('happy');
            
        } else {
            // Wrong answer
            this.state.streak = 0;
            this.state.hearts--;
            
            // Play sound
            this.playSound('wrong');
            
            // Update character
            this.updateCharacter('sad');
            
            // Check game over
            if (this.state.hearts <= 0) {
                this.gameOver();
            }
        }
        
        // Save state
        this.saveState();
    }
    
    // Render methods for different question types
    renderQuestion(question) {
        const renderers = {
            fib: this.renderFIB.bind(this),
            mcq: this.renderMCQ.bind(this),
            trueFalse: this.renderTrueFalse.bind(this),
            order: this.renderWordOrder.bind(this)
        };
        
        return renderers[question.type](question);
    }
    
    renderFIB(question) {
        const parts = question.content.text.split('___');
        return `
            <div class="question-fib">
                <div class="question-instruction">${question.instruction}</div>
                <div class="fib-sentence">
                    ${parts[0]}
                    <input type="text" 
                           class="fib-input" 
                           id="fib-answer"
                           placeholder="..."
                           autocomplete="off">
                    ${parts[1] || ''}
                </div>
                ${question.content.hint ? `<div class="hint">💡 ${question.content.hint}</div>` : ''}
            </div>
        `;
    }
    
    renderMCQ(question) {
        return `
            <div class="question-mcq">
                <div class="question-instruction">${question.instruction}</div>
                <div class="mcq-question">${question.content.question}</div>
                <div class="mcq-options">
                    ${question.content.options.map((option, idx) => `
                        <button class="mcq-option" data-index="${idx}" onclick="quiz.selectMCQ(${idx})">
                            <span class="option-indicator">${String.fromCharCode(65 + idx)}</span>
                            <span class="option-text">${option}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderTrueFalse(question) {
        return `
            <div class="question-binary">
                <div class="question-instruction">${question.instruction}</div>
                <div class="statement">${question.content.statement}</div>
                <div class="binary-options">
                    <button class="binary-option true" onclick="quiz.selectBinary(true)">
                        <span class="icon">✓</span>
                        <span>TRUE</span>
                    </button>
                    <button class="binary-option false" onclick="quiz.selectBinary(false)">
                        <span class="icon">✗</span>
                        <span>FALSE</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderWordOrder(question) {
        return `
            <div class="question-order">
                <div class="question-instruction">${question.instruction}</div>
                <div class="word-bank" id="word-bank">
                    ${question.content.scrambled.map((word, idx) => `
                        <button class="word-chip" data-word="${word}" onclick="quiz.selectWord('${word}')">
                            ${word}
                        </button>
                    `).join('')}
                </div>
                <div class="sentence-builder" id="sentence-builder">
                    <div class="placeholder">Build your sentence here...</div>
                </div>
                <button class="clear-sentence" onclick="quiz.clearSentence()">Clear</button>
            </div>
        `;
    }
    
    // Animation triggers
    triggerStreakAnimation(streakCount) {
        const animation = document.createElement('div');
        animation.className = 'streak-animation';
        animation.innerHTML = `
            <div class="streak-number">${streakCount}</div>
            <div class="streak-text">STREAK!</div>
            <div class="streak-icon">${this.characters[this.state.mode].streak}</div>
        `;
        document.body.appendChild(animation);
        
        setTimeout(() => animation.remove(), 2000);
    }
    
    triggerLevelUp() {
        const animation = document.createElement('div');
        animation.className = 'level-up-animation';
        animation.innerHTML = `
            <div class="level-text">LEVEL UP!</div>
            <div class="level-number">Level ${this.state.level}</div>
            <div class="level-reward">+100 Bonus Gems!</div>
        `;
        document.body.appendChild(animation);
        
        this.state.gems += 100;
        this.playSound('levelUp');
        
        setTimeout(() => animation.remove(), 3000);
    }
    
    // Character management
    updateCharacter(mood) {
        const character = this.characters[this.state.mode][mood];
        const message = this.getCharacterMessage(mood);
        
        // Update UI
        const characterEl = document.getElementById('character');
        const messageEl = document.getElementById('character-message');
        
        if (characterEl) characterEl.textContent = character;
        if (messageEl) messageEl.textContent = message;
        
        // Add animation class
        if (characterEl) {
            characterEl.classList.add('character-' + mood);
            setTimeout(() => {
                characterEl.classList.remove('character-' + mood);
            }, 1000);
        }
    }
    
    getCharacterMessage(mood) {
        const messages = {
            normal: {
                idle: "Let's learn something new!",
                happy: "Excellent work! Keep going!",
                sad: "Don't worry, try again!",
                thinking: "Take your time...",
                streak: "You're on fire!"
            },
            zen: {
                idle: "Find your inner peace...",
                happy: "Perfect harmony!",
                sad: "Breathe and refocus.",
                thinking: "Contemplate deeply...",
                streak: "Enlightenment approaches!"
            },
            game: {
                idle: "Ready Player One!",
                happy: "COMBO! +10 Points!",
                sad: "Game Over... Continue?",
                thinking: "Loading strategy...",
                streak: "ULTRA COMBO!"
            },
            chaos: {
                idle: "Reality is optional!",
                happy: "CHAOS VICTORY!",
                sad: "Timeline disrupted!",
                thinking: "Computing chaos...",
                streak: "MAXIMUM OVERDRIVE!"
            }
        };
        
        return messages[this.state.mode][mood];
    }
    
    // Sound system (simplified)
    playSound(type) {
        if (!this.state.soundEnabled) return;
        
        // In real implementation, play actual sound files
        console.log(`Playing sound: ${type} ${this.sounds[type]}`);
        
        // Visual feedback for now
        const soundIcon = document.createElement('div');
        soundIcon.className = 'sound-icon';
        soundIcon.textContent = this.sounds[type];
        soundIcon.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            opacity: 0;
            animation: soundPulse 0.5s ease-out;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(soundIcon);
        
        setTimeout(() => soundIcon.remove(), 500);
    }
    
    // Game over handling
    gameOver() {
        const summary = {
            questionsAnswered: this.state.currentQuestion - 1,
            correctAnswers: this.state.correctAnswers,
            gemsEarned: this.state.gems,
            xpEarned: this.state.xp,
            highestStreak: this.state.maxStreak || 0
        };
        
        // Show game over screen
        this.showGameOver(summary);
        
        // Reset hearts for next game
        this.state.hearts = 5;
        this.saveState();
    }
    
    showGameOver(summary) {
        // In real implementation, show a proper game over modal
        alert(`Game Over!
        
Questions: ${summary.correctAnswers}/${summary.questionsAnswered}
Gems Earned: ${summary.gemsEarned}
XP Earned: ${summary.xpEarned}
        
Try again to beat your score!`);
    }
}

// Export for use
const quiz = new JazzyPopQuiz();
export default quiz;
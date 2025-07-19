/**
 * Quiz Feedback Popup Component
 * Shows detailed feedback after each quiz answer with animations and fun messages
 */

class QuizFeedbackPopup {
    constructor() {
        this.popup = null;
        this.isShowing = false;
        this.createPopup();
    }

    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = 'quiz-feedback-popup';
        this.popup.innerHTML = `
            <div class="quiz-feedback-overlay"></div>
            <div class="quiz-feedback-content">
                <div class="feedback-message-container">
                    <h3 class="feedback-title"></h3>
                    <p class="feedback-message"></p>
                </div>
                <div class="feedback-details-container">
                    <div class="correct-answer-section">
                        <h4>Correct Answer:</h4>
                        <div class="correct-answer-text"></div>
                        <div class="correct-answer-feedback"></div>
                    </div>
                    <div class="incorrect-answer-section" style="display: none;">
                        <h4>Your Answer:</h4>
                        <div class="incorrect-answer-text"></div>
                        <div class="incorrect-answer-feedback"></div>
                    </div>
                </div>
                <button class="feedback-continue-btn" onclick="window.quizFeedbackPopup.close()">
                    Continue <span class="continue-arrow">→</span>
                </button>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Add to body but keep hidden
        document.body.appendChild(this.popup);
        
        // Make globally available
        window.quizFeedbackPopup = this;
    }

    addStyles() {
        if (document.getElementById('quiz-feedback-popup-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'quiz-feedback-popup-styles';
        style.textContent = `
            .quiz-feedback-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
                animation: fadeIn 0.3s ease-out;
            }
            
            .quiz-feedback-popup.show {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .quiz-feedback-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }
            
            .quiz-feedback-content {
                position: relative;
                background: #1a1a2e;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 30px;
                padding-left: 50px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.4s ease-out;
                overflow: hidden;
            }
            
            .quiz-feedback-content::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 20px;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .quiz-feedback-content.correct::before {
                background: #00c851;
            }
            
            .quiz-feedback-content.incorrect::before {
                background: #ff4757;
            }
            
            /* Bot container removed to save vertical space on mobile
            .feedback-bot-container {
                text-align: center;
                margin-bottom: 20px;
                display: flex;
                justify-content: center;
                width: 100%;
            }
            
            .feedback-bot-image {
                width: 240px;
                height: 240px;
                animation: bounce 0.6s ease-out;
            } */
            
            .feedback-message-container {
                text-align: center;
                margin-bottom: 25px;
            }
            
            .feedback-title {
                font-size: 36px;
                font-weight: bold;
                color: white;
                margin: 0 0 10px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .feedback-message {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.9);
                margin: 0;
            }
            
            .feedback-details-container {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
            }
            
            .correct-answer-section,
            .incorrect-answer-section {
                margin-bottom: 15px;
            }
            
            .correct-answer-section h4,
            .incorrect-answer-section h4 {
                color: white;
                font-size: 14px;
                margin: 0 0 8px 0;
                opacity: 0.8;
            }
            
            .correct-answer-text,
            .incorrect-answer-text {
                font-size: 16px;
                font-weight: bold;
                color: white;
                margin-bottom: 8px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            
            .correct-answer-text {
                border: 2px solid rgba(67, 233, 123, 0.5);
            }
            
            .incorrect-answer-text {
                border: 2px solid rgba(250, 112, 154, 0.5);
                text-decoration: line-through;
                opacity: 0.8;
            }
            
            .correct-answer-feedback,
            .incorrect-answer-feedback {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.8);
                font-style: italic;
            }
            
            .feedback-continue-btn {
                width: 100%;
                padding: 15px;
                background: rgba(255, 255, 255, 0.25);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                color: white;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .feedback-continue-btn:hover {
                background: rgba(255, 255, 255, 0.35);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            }
            
            .continue-arrow {
                display: inline-block;
                transition: transform 0.3s ease;
            }
            
            .feedback-continue-btn:hover .continue-arrow {
                transform: translateX(5px);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }

    show(options) {
        const {
            isCorrect,
            selectedAnswer,
            correctAnswer,
            correctFeedback,
            incorrectFeedback,
            onContinue
        } = options;

        this.isShowing = true;
        
        // Update content style
        const content = this.popup.querySelector('.quiz-feedback-content');
        content.className = `quiz-feedback-content ${isCorrect ? 'correct' : 'incorrect'}`;
        
        // Update messages
        const title = this.popup.querySelector('.feedback-title');
        const message = this.popup.querySelector('.feedback-message');
        
        if (isCorrect) {
            title.textContent = this.getRandomCorrectTitle();
            message.textContent = this.getRandomCorrectMessage();
        } else {
            title.textContent = this.getRandomIncorrectTitle();
            message.textContent = this.getRandomIncorrectMessage();
        }
        
        // Update answer details
        const correctSection = this.popup.querySelector('.correct-answer-section');
        const incorrectSection = this.popup.querySelector('.incorrect-answer-section');
        
        // Always show correct answer and its feedback
        this.popup.querySelector('.correct-answer-text').textContent = correctAnswer.text;
        this.popup.querySelector('.correct-answer-feedback').textContent = correctFeedback || 'Great choice!';
        
        // Show incorrect answer section only if answer was wrong
        if (!isCorrect && selectedAnswer) {
            incorrectSection.style.display = 'block';
            this.popup.querySelector('.incorrect-answer-text').textContent = selectedAnswer.text;
            
            // Check if incorrect feedback is different from correct feedback to avoid duplication
            const incorrectFeedbackEl = this.popup.querySelector('.incorrect-answer-feedback');
            if (incorrectFeedback && incorrectFeedback !== correctFeedback) {
                incorrectFeedbackEl.textContent = incorrectFeedback;
                incorrectFeedbackEl.style.display = 'block';
            } else {
                // Hide the feedback text if it would be duplicate
                incorrectFeedbackEl.textContent = '';
                incorrectFeedbackEl.style.display = 'none';
            }
        } else {
            incorrectSection.style.display = 'none';
        }
        
        // Set continue callback
        this.onContinue = onContinue;
        
        // Show popup
        this.popup.classList.add('show');
    }

    close() {
        if (!this.isShowing) return;
        
        this.isShowing = false;
        this.popup.classList.remove('show');
        
        // Call continue callback if provided
        if (this.onContinue) {
            this.onContinue();
            this.onContinue = null;
        }
    }

    getRandomCorrectTitle() {
        const titles = [
            "Brilliant!",
            "Nailed It!",
            "Genius!",
            "Perfect!",
            "Outstanding!",
            "Fantastic!",
            "Incredible!",
            "Superb!"
        ];
        return titles[Math.floor(Math.random() * titles.length)];
    }

    getRandomCorrectMessage() {
        const messages = [
            "You're on fire today!",
            "Your brain is in top gear!",
            "Knowledge level: Expert!",
            "You make this look easy!",
            "Quiz champion in the making!",
            "Your neurons are dancing!",
            "Smarty pants alert!",
            "Brain power: Maximum!"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getRandomIncorrectTitle() {
        const titles = [
            "Almost!",
            "Nice Try!",
            "So Close!",
            "Good Effort!",
            "Not Quite!",
            "Keep Going!"
        ];
        return titles[Math.floor(Math.random() * titles.length)];
    }

    getRandomIncorrectMessage() {
        const messages = [
            "Learning is all about trying!",
            "Every mistake is a lesson!",
            "You'll get it next time!",
            "Practice makes perfect!",
            "The journey continues!",
            "Knowledge gained!"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new QuizFeedbackPopup();
    });
} else {
    new QuizFeedbackPopup();
}
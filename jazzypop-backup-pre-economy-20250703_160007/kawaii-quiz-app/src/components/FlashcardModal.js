/**
 * Flashcard Modal Component
 * Interactive flashcards for trivia, factoids, and quick learning
 * Rewards hearts and diamonds for correct answers
 */

class FlashcardModal {
    constructor() {
        this.modal = null;
        this.currentCard = null;
        this.cards = [];
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;
        this.flipTimer = null; // Track flip timer to prevent duplicates
        this.isTransitioning = false; // Track if we're in the middle of a transition
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
    }
    
    // Generate unique IDs based on card type and index
    getUniqueId(elementType) {
        const cardType = this.currentCard?.type || 'unknown';
        const cardIndex = this.currentIndex || 0;
        return `flashcard-${cardType}-${cardIndex}-${elementType}`;
    }
    
    // Assign dynamic IDs to elements when loading a card
    assignDynamicIds() {
        // Get elements by class and assign unique IDs
        const challengeContainer = this.modal.querySelector('.flashcard-challenge-container');
        const challengeQuestion = this.modal.querySelector('.flashcard-challenge-question');
        const challengeInput = this.modal.querySelector('.flashcard-challenge-input');
        const checkAnswerBtn = this.modal.querySelector('.flashcard-check-answer-btn');
        const answerFeedback = this.modal.querySelector('.flashcard-answer-feedback');
        const feedbackContent = this.modal.querySelector('.flashcard-feedback-content');
        const continueBtn = this.modal.querySelector('.flashcard-continue-btn');
        
        // Assign unique IDs
        if (challengeContainer) challengeContainer.id = this.getUniqueId('challenge');
        if (challengeQuestion) challengeQuestion.id = this.getUniqueId('question');
        if (challengeInput) challengeInput.id = this.getUniqueId('input');
        if (checkAnswerBtn) checkAnswerBtn.id = this.getUniqueId('checkBtn');
        if (answerFeedback) answerFeedback.id = this.getUniqueId('feedback');
        if (feedbackContent) feedbackContent.id = this.getUniqueId('feedbackContent');
        if (continueBtn) continueBtn.id = this.getUniqueId('continueBtn');
        
        // console.log(`Assigned dynamic IDs for card type: ${this.currentCard?.type}, index: ${this.currentIndex}`);
    }
    
    // Helper to get element by dynamic ID type
    getElement(elementType) {
        return document.getElementById(this.getUniqueId(elementType));
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'flashcard-modal';
        this.modal.innerHTML = `
            <div class="flashcard-overlay"></div>
            <div class="flashcard-content">
                <button class="flashcard-close" aria-label="Close">✕</button>
                
                <div class="flashcard-header">
                    <div class="flashcard-progress">
                        <span class="progress-text">Card <span id="currentCard">1</span> of <span id="totalCards">10</span></span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                    </div>
                    <div class="flashcard-score">
                        <span class="score-icon">🔥</span>
                        <span class="score-value" id="scoreValue"></span>
                    </div>
                </div>

                <div class="flashcard-container" id="flashcardContainer">
                    <div class="flashcard" id="flashcard">
                        <div class="flashcard-front">
                            <div class="card-category" id="cardCategory">Trivia</div>
                            <div class="card-content" id="cardContent">Loading...</div>
                            <div class="flip-hint">Read carefully, then tap to test yourself</div>
                        </div>
                        <div class="flashcard-back">
                            <div class="card-challenge flashcard-challenge-container">
                                <div class="challenge-question flashcard-challenge-question"></div>
                                <div class="challenge-input flashcard-challenge-input"></div>
                            </div>
                            <div class="answer-check">
                                <button class="check-answer-btn flashcard-check-answer-btn">Check Answer</button>
                            </div>
                            <div class="answer-feedback flashcard-answer-feedback" style="display: none;">
                                <div class="feedback-content flashcard-feedback-content"></div>
                                <button class="continue-btn flashcard-continue-btn">Continue</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flashcard-footer">
                        <div class="streak-indicator" id="streakIndicator" style="display: none;">
                        <span class="streak-icon">🔥</span>
                        <span class="streak-text">Streak: <span id="streakValue">0</span></span>
                    </div>
                </div>

                <!-- Reward popup -->
                <div class="reward-popup" id="rewardPopup" style="display: none;">
                    <div class="reward-content">
                        <span class="reward-icon"></span>
                        <span class="reward-text"></span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    attachEventListeners() {
        // Close button - closes the entire modal
        const closeBtn = this.modal.querySelector('.flashcard-close');
        closeBtn.addEventListener('click', () => this.close());

        // Overlay click - also closes modal when clicking outside
        const overlay = this.modal.querySelector('.flashcard-overlay');
        overlay.addEventListener('click', () => this.close());

        // Flashcard click to flip - use event delegation on container instead
        // USER INTERACTION 1: Click card to flip from front to back
        const flashcardContainer = this.modal.querySelector('#flashcardContainer');
        flashcardContainer.addEventListener('click', (e) => {
            // Check if the click was on the flashcard or its children
            const flashcard = e.target.closest('#flashcard');
            if (flashcard && !e.target.closest('.flashcard-check-answer-btn')) {
                this.flipCard();
            }
        });

        // Check answer button - validates user's answer
        // USER INTERACTION 2: After flipping, user answers challenge and clicks check
        const checkBtn = this.modal.querySelector('.flashcard-check-answer-btn');
        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card from flipping when clicking button
            // console.log('Check answer button clicked');
            this.checkAnswer(); // Validates answer and shows feedback
        });
        
        // Continue button - shown after answering to go to next card
        // USER INTERACTION 3: After seeing feedback, click continue for next card
        const continueBtn = this.modal.querySelector('.flashcard-continue-btn');
        continueBtn.addEventListener('click', () => this.nextCard());


        // Keyboard support for accessibility
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;
            
            switch(e.key) {
                case 'Escape':
                    this.close();
                    break;
                case ' ':
                case 'Enter':
                    // Space/Enter flips card if not already flipped AND user is not typing in an input
                    if (!this.isFlipped && document.activeElement.tagName !== 'INPUT') {
                        this.flipCard();
                    }
                    break;
                case 'ArrowRight':
                    // Right arrow = correct answer (if card is flipped)
                    if (this.isFlipped && this.canAnswer) {
                        this.handleAnswer(true);
                    }
                    break;
                case 'ArrowLeft':
                    // Left arrow = incorrect answer (if card is flipped)
                    if (this.isFlipped && this.canAnswer) {
                        this.handleAnswer(false);
                    }
                    break;
            }
        });
    }

    async open(config) {
        // console.log('Opening flashcard modal with config:', config);
        
        // Check if user has enough energy (1 per card)
        if (window.economyManager) {
            const economyState = window.economyManager.getDisplayState();
            const requiredEnergy = 1; // 1 energy per flashcard session
            
            if (economyState.energy < requiredEnergy) {
                // Show insufficient energy message
                if (window.alertModal) {
                    window.alertModal.show({
                        type: 'warning',
                        title: 'Not Enough Energy',
                        message: `You need ${requiredEnergy} energy to practice flashcards. You have ${economyState.energy} energy.`,
                        primaryButton: 'OK'
                    });
                }
                return;
            }
            
            // Deduct energy cost
            const energyResult = await window.economyManager.spendEnergy(requiredEnergy, 'flashcard_start');
            if (!energyResult.success) {
                console.error('Failed to deduct energy:', energyResult);
                return;
            }
        }
        
        // Try to fetch dynamic cards first
        this.cards = await this.fetchCards(config);
        
        if (!this.cards || this.cards.length === 0) {
            // console.log('No cards from API, generating dynamic content...');
            // Generate dynamic cards instead of using static data
            this.cards = await this.generateDynamicCards(config);
        }

        if (!this.cards || this.cards.length === 0) {
            console.error('Could not generate flashcards');
            return;
        }

        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;

        // Show modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update total cards
        document.getElementById('totalCards').textContent = this.cards.length;

        // Load first card
        this.loadCard();
    }

    async fetchCards(config) {
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            
            // Get user ID from localStorage if available
            const userId = localStorage.getItem('userId');
            const requestBody = {
                ...config,
                user_id: userId // Will be null for anonymous users
            };
            
            const response = await fetch(`${apiBase}/api/flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Failed to fetch flashcards');
            }

            const data = await response.json();
            return data.cards;
        } catch (error) {
            console.error('Error fetching flashcards:', error);
            // Return null to trigger dynamic generation
            return null;
        }
    }
    
    async trackCardView(cardId, isCorrect = null) {
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const userId = localStorage.getItem('userId');
            
            if (!userId) return; // Don't track for anonymous users
            
            const response = await fetch(`${apiBase}/api/flashcards/track-view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    content_id: cardId,
                    content_type: this.currentCard.type || 'flashcard',
                    metadata: {
                        correct: isCorrect,
                        category: this.currentCard.category,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to track flashcard view');
            }
        } catch (error) {
            console.error('Error tracking flashcard view:', error);
        }
    }

    async generateDynamicCards(config) {
        // console.log('Generating dynamic cards for config:', config);
        
        const category = config?.category || 'trivia_mix';
        const count = config?.count || 10;
        const cards = [];
        
        // Generate cards based on category
        switch(category) {
            case 'famous_quotes':
                // Generate quote prompts for AI
                const quotePrompts = [
                    'wisdom', 'success', 'life', 'happiness', 'courage',
                    'friendship', 'love', 'change', 'dreams', 'perseverance'
                ];
                
                for (let i = 0; i < count; i++) {
                    const theme = quotePrompts[i % quotePrompts.length];
                    cards.push(this.createQuoteCard(i, theme));
                }
                break;
                
            case 'bad_puns':
                const punThemes = [
                    'animals', 'food', 'technology', 'music', 'sports',
                    'weather', 'school', 'jobs', 'travel', 'nature'
                ];
                
                for (let i = 0; i < count; i++) {
                    const theme = punThemes[i % punThemes.length];
                    cards.push(this.createPunCard(i, theme));
                }
                break;
                
            case 'knock_knock':
                for (let i = 0; i < count; i++) {
                    cards.push(this.createKnockKnockCard(i));
                }
                break;
                
            default:
                // Mix of trivia
                const triviaCategories = ['science', 'history', 'geography', 'culture', 'technology'];
                for (let i = 0; i < count; i++) {
                    const cat = triviaCategories[i % triviaCategories.length];
                    cards.push(this.createTriviaCard(i, cat));
                }
        }
        
        // In the future, these would call the Haiku API
        // For now, return a variety of dynamically generated cards
        return cards;
    }
    
    createQuoteCard(index, theme) {
        // Temporary dynamic generation - would use Haiku API
        // ALL quotes MUST have attribution
        const templates = [
            {
                content: `"The best time to ${theme} is now, the second best time was yesterday."`,
                author: 'Chinese Proverb', // Always provide source
                challengeType: 'fill-blank',
                challenge: `"The best time to _____ is now, the second best time was yesterday."`,
                answer: theme
            },
            {
                content: `"${theme.charAt(0).toUpperCase() + theme.slice(1)} is not a destination, but a journey of discovery."`,
                author: 'Buddhist Teaching', // Source attribution
                challengeType: 'true-false',
                challenge: `True or False: This quote is about ${theme}`,
                answer: 'True'
            },
            {
                content: `"In the practice of ${theme}, we find ourselves."`,
                author: 'Zen Master Dogen', // Specific attribution when possible
                challengeType: 'who-said-it',
                challenge: 'Who said this?',
                answer: 'Zen Master Dogen'
            },
            {
                content: `"The path to ${theme} begins with a single step."`,
                author: 'Lao Tzu, Tao Te Ching', // Book source
                challengeType: 'multiple-choice',
                challenge: 'This quote is from which text?',
                options: ['Tao Te Ching', 'The Bible', 'The Quran', 'Bhagavad Gita'],
                answer: 'Tao Te Ching'
            }
        ];
        
        const template = templates[index % templates.length];
        return {
            id: `quote-dynamic-${index}`,
            category: 'Famous Quote',
            type: 'quote',
            ...template,
            difficulty: 'medium'
        };
    }
    
    createPunCard(index, theme) {
        // Dynamic pun generation placeholder
        return {
            id: `pun-dynamic-${index}`,
            category: 'Bad Pun 😅',
            content: `Why did the ${theme} cross the road? To get to the punny side!`,
            challengeType: 'multiple-choice',
            challenge: 'What makes this a pun?',
            options: ['Word play', 'Rhyme', 'Alliteration', 'Metaphor'],
            answer: 'Word play',
            difficulty: 'easy',
            type: 'pun'
        };
    }
    
    createKnockKnockCard(index) {
        return {
            id: `knock-dynamic-${index}`,
            category: 'Knock Knock 🚪',
            content: `Knock knock. Who's there? Dynamic. Dynamic who? Dynamic content is here to stay!`,
            challengeType: 'fill-blank',
            challenge: `Knock knock. Who's there? Dynamic. Dynamic who? Dynamic _____ is here to stay!`,
            answer: 'content',
            difficulty: 'easy',
            type: 'joke'
        };
    }
    
    createTriviaCard(index, category) {
        return {
            id: `trivia-dynamic-${index}`,
            category: `${category.charAt(0).toUpperCase() + category.slice(1)} Fact`,
            content: `Did you know? This is a dynamically generated ${category} fact!`,
            challengeType: 'true-false',
            challenge: `True or False: This fact is about ${category}`,
            answer: 'True',
            difficulty: 'easy',
            type: 'trivia'
        };
    }

    getDefaultCards() {
        const cards = [
            // Famous Quotes with different challenge types
            {
                id: 'quote-1',
                category: 'Famous Quote',
                content: '"Be yourself; everyone else is already taken."',
                author: 'Oscar Wilde',
                challengeType: 'who-said-it',
                challenge: 'Who said this?',
                answer: 'Oscar Wilde',
                difficulty: 'easy',
                type: 'quote'
            },
            {
                id: 'quote-2',
                category: 'Famous Quote',
                content: '"In the middle of difficulty lies opportunity."',
                author: 'Albert Einstein',
                challengeType: 'fill-blank',
                challenge: '"In the middle of _____ lies opportunity."',
                answer: 'difficulty',
                difficulty: 'medium',
                type: 'quote'
            },
            {
                id: 'quote-3',
                category: 'Famous Quote',
                content: '"I have a dream that one day this nation will rise up and live out the true meaning of its creed."',
                author: 'Martin Luther King Jr.',
                challengeType: 'who-said-it',
                challenge: 'Who gave this famous speech?',
                answer: 'Martin Luther King Jr.',
                difficulty: 'easy',
                type: 'quote'
            },
            {
                id: 'quote-4',
                category: 'Famous Quote',
                content: '"Life is what happens when you\'re busy making other plans."',
                author: 'John Lennon',
                challengeType: 'word-order',
                challenge: 'Put these words in order:',
                scrambled: ['happens', 'Life', 'when', 'is', 'what', 'making', 'you\'re', 'busy', 'other', 'plans'],
                answer: 'Life is what happens when you\'re busy making other plans',
                difficulty: 'hard',
                type: 'quote'
            },
            {
                id: 'quote-5',
                category: 'Famous Quote',
                content: '"The only way to do great work is to love what you do."',
                author: 'Steve Jobs',
                challengeType: 'multiple-choice',
                challenge: 'Who said this?',
                options: ['Bill Gates', 'Steve Jobs', 'Elon Musk', 'Mark Zuckerberg'],
                answer: 'Steve Jobs',
                difficulty: 'medium',
                type: 'quote'
            },
            // Science Facts
            {
                id: 'science-1',
                category: 'Science Fact',
                content: 'Jupiter is the largest planet in our solar system. It\'s so big that all other planets could fit inside it!',
                challengeType: 'fill-blank',
                challenge: '_____ is the largest planet in our solar system.',
                answer: 'Jupiter',
                difficulty: 'easy',
                type: 'factoid'
            },
            {
                id: 'science-2',
                category: 'Science Fact',
                content: 'Octopuses have three hearts and blue blood! Two hearts pump blood to the gills, one to the body.',
                challengeType: 'true-false',
                challenge: 'True or False: Octopuses have three hearts',
                answer: 'True',
                difficulty: 'medium',
                type: 'factoid'
            },
            // History
            {
                id: 'history-1',
                category: 'Historical Event',
                content: 'World War II ended in 1945 when Japan formally surrendered on September 2nd.',
                challengeType: 'fill-blank',
                challenge: 'World War II ended in the year _____.',
                answer: '1945',
                difficulty: 'easy',
                type: 'trivia'
            },
            // Fun Facts
            {
                id: 'fact-1',
                category: 'Fun Fact',
                content: 'A group of flamingos is called a "flamboyance"!',
                challengeType: 'multiple-choice',
                challenge: 'What is a group of flamingos called?',
                options: ['flock', 'flamboyance', 'flutter', 'flame'],
                answer: 'flamboyance',
                difficulty: 'medium',
                type: 'factoid'
            },
            {
                id: 'fact-2',
                category: 'Fun Fact',
                content: 'Bananas are berries, but strawberries aren\'t! Botanically speaking, berries must have seeds inside their flesh.',
                challengeType: 'true-false',
                challenge: 'True or False: Bananas are berries',
                answer: 'True',
                difficulty: 'hard',
                type: 'factoid'
            },
            // Proverbs & Sayings
            {
                id: 'saying-1',
                category: 'Common Saying',
                content: 'A penny saved is a penny earned.',
                challengeType: 'fill-blank',
                challenge: 'A penny saved is a penny _____.',
                answer: 'earned',
                difficulty: 'easy',
                type: 'phrase'
            },
            {
                id: 'saying-2',
                category: 'Proverb',
                content: 'The early bird catches the worm.',
                challengeType: 'word-order',
                challenge: 'Arrange the words:',
                scrambled: ['bird', 'The', 'catches', 'early', 'the', 'worm'],
                answer: 'The early bird catches the worm',
                difficulty: 'medium',
                type: 'phrase'
            },
            // Bad Puns (groan-worthy!)
            {
                id: 'pun-1',
                category: 'Bad Pun 😅',
                content: 'I used to hate facial hair, but then it grew on me.',
                challengeType: 'fill-blank',
                challenge: 'I used to hate facial hair, but then it _____ on me.',
                answer: 'grew',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-2',
                category: 'Bad Pun 😅',
                content: 'Time flies like an arrow. Fruit flies like a banana.',
                challengeType: 'true-false',
                challenge: 'True or False: This pun plays with the word "flies"',
                answer: 'True',
                difficulty: 'medium',
                type: 'pun'
            },
            {
                id: 'pun-3',
                category: 'Bad Pun 😅',
                content: 'I\'m reading a book about anti-gravity. It\'s impossible to put down!',
                challengeType: 'fill-blank',
                challenge: 'I\'m reading a book about anti-gravity. It\'s impossible to put _____!',
                answer: 'down',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-4',
                category: 'Bad Pun 😅',
                content: 'Why don\'t scientists trust atoms? Because they make up everything!',
                challengeType: 'multiple-choice',
                challenge: 'Why don\'t scientists trust atoms?',
                options: ['They\'re too small', 'They make up everything', 'They\'re unstable', 'They\'re negative'],
                answer: 'They make up everything',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-5',
                category: 'Bad Pun 😅',
                content: 'I used to be a banker, but I lost interest.',
                challengeType: 'fill-blank',
                challenge: 'I used to be a banker, but I lost _____.',
                answer: 'interest',
                difficulty: 'medium',
                type: 'pun'
            },
            // Knock Knock Jokes
            {
                id: 'knock-1',
                category: 'Knock Knock 🚪',
                content: 'Knock knock. Who\'s there? Lettuce. Lettuce who? Lettuce in, it\'s cold out here!',
                challengeType: 'fill-blank',
                challenge: 'Knock knock. Who\'s there? Lettuce. Lettuce who? Lettuce _____, it\'s cold out here!',
                answer: 'in',
                difficulty: 'easy',
                type: 'joke'
            },
            {
                id: 'knock-2',
                category: 'Knock Knock 🚪',
                content: 'Knock knock. Who\'s there? Boo. Boo who? Don\'t cry, it\'s just a joke!',
                challengeType: 'multiple-choice',
                challenge: 'Complete the joke: "Boo who?"',
                options: ['Don\'t cry, it\'s just a joke!', 'Boo to you too!', 'I\'m a ghost!', 'Halloween is here!'],
                answer: 'Don\'t cry, it\'s just a joke!',
                difficulty: 'easy',
                type: 'joke'
            }
        ];
        
        // Shuffle and return a subset
        const shuffled = cards.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 10);
    }

    getCardsByCategory(category) {
        // console.log('Getting cards for category:', category);
        
        // Get all cards first (not shuffled)
        const allCards = [
            // Famous Quotes
            {
                id: 'quote-1',
                category: 'Famous Quote',
                content: '"Be yourself; everyone else is already taken."',
                author: 'Oscar Wilde',
                challengeType: 'who-said-it',
                challenge: 'Who said this?',
                answer: 'Oscar Wilde',
                difficulty: 'easy',
                type: 'quote'
            },
            {
                id: 'quote-2',
                category: 'Famous Quote',
                content: '"In the middle of difficulty lies opportunity."',
                author: 'Albert Einstein',
                challengeType: 'fill-blank',
                challenge: '"In the middle of _____ lies opportunity."',
                answer: 'difficulty',
                difficulty: 'medium',
                type: 'quote'
            },
            {
                id: 'quote-3',
                category: 'Famous Quote',
                content: '"I have a dream that one day this nation will rise up and live out the true meaning of its creed."',
                author: 'Martin Luther King Jr.',
                challengeType: 'who-said-it',
                challenge: 'Who gave this famous speech?',
                answer: 'Martin Luther King Jr.',
                difficulty: 'easy',
                type: 'quote'
            },
            {
                id: 'quote-4',
                category: 'Famous Quote',
                content: '"Life is what happens when you\'re busy making other plans."',
                author: 'John Lennon',
                challengeType: 'word-order',
                challenge: 'Put these words in order:',
                scrambled: ['happens', 'Life', 'when', 'is', 'what', 'making', 'you\'re', 'busy', 'other', 'plans'],
                answer: 'Life is what happens when you\'re busy making other plans',
                difficulty: 'hard',
                type: 'quote'
            },
            {
                id: 'quote-5',
                category: 'Famous Quote',
                content: '"The only way to do great work is to love what you do."',
                author: 'Steve Jobs',
                challengeType: 'multiple-choice',
                challenge: 'Who said this?',
                options: ['Bill Gates', 'Steve Jobs', 'Elon Musk', 'Mark Zuckerberg'],
                answer: 'Steve Jobs',
                difficulty: 'medium',
                type: 'quote'
            },
            // Bad Puns
            {
                id: 'pun-1',
                category: 'Bad Pun 😅',
                content: 'I used to hate facial hair, but then it grew on me.',
                challengeType: 'fill-blank',
                challenge: 'I used to hate facial hair, but then it _____ on me.',
                answer: 'grew',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-2',
                category: 'Bad Pun 😅',
                content: 'Time flies like an arrow. Fruit flies like a banana.',
                challengeType: 'true-false',
                challenge: 'True or False: This pun plays with the word "flies"',
                answer: 'True',
                difficulty: 'medium',
                type: 'pun'
            },
            {
                id: 'pun-3',
                category: 'Bad Pun 😅',
                content: 'I\'m reading a book about anti-gravity. It\'s impossible to put down!',
                challengeType: 'fill-blank',
                challenge: 'I\'m reading a book about anti-gravity. It\'s impossible to put _____!',
                answer: 'down',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-4',
                category: 'Bad Pun 😅',
                content: 'Why don\'t scientists trust atoms? Because they make up everything!',
                challengeType: 'multiple-choice',
                challenge: 'Why don\'t scientists trust atoms?',
                options: ['They\'re too small', 'They make up everything', 'They\'re unstable', 'They\'re negative'],
                answer: 'They make up everything',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-5',
                category: 'Bad Pun 😅',
                content: 'I used to be a banker, but I lost interest.',
                challengeType: 'fill-blank',
                challenge: 'I used to be a banker, but I lost _____.',
                answer: 'interest',
                difficulty: 'medium',
                type: 'pun'
            },
            // Knock Knock Jokes
            {
                id: 'knock-1',
                category: 'Knock Knock 🚪',
                content: 'Knock knock. Who\'s there? Lettuce. Lettuce who? Lettuce in, it\'s cold out here!',
                challengeType: 'fill-blank',
                challenge: 'Knock knock. Who\'s there? Lettuce. Lettuce who? Lettuce _____, it\'s cold out here!',
                answer: 'in',
                difficulty: 'easy',
                type: 'joke'
            },
            {
                id: 'knock-2',
                category: 'Knock Knock 🚪',
                content: 'Knock knock. Who\'s there? Boo. Boo who? Don\'t cry, it\'s just a joke!',
                challengeType: 'multiple-choice',
                challenge: 'Complete the joke: "Boo who?"',
                options: ['Don\'t cry, it\'s just a joke!', 'Boo to you too!', 'I\'m a ghost!', 'Halloween is here!'],
                answer: 'Don\'t cry, it\'s just a joke!',
                difficulty: 'easy',
                type: 'joke'
            },
            // Science Facts
            {
                id: 'science-1',
                category: 'Science Fact',
                content: 'Jupiter is the largest planet in our solar system. It\'s so big that all other planets could fit inside it!',
                challengeType: 'fill-blank',
                challenge: '_____ is the largest planet in our solar system.',
                answer: 'Jupiter',
                difficulty: 'easy',
                type: 'factoid'
            },
            {
                id: 'science-2',
                category: 'Science Fact',
                content: 'Octopuses have three hearts and blue blood! Two hearts pump blood to the gills, one to the body.',
                challengeType: 'true-false',
                challenge: 'True or False: Octopuses have three hearts',
                answer: 'True',
                difficulty: 'medium',
                type: 'factoid'
            },
            // History
            {
                id: 'history-1',
                category: 'Historical Event',
                content: 'World War II ended in 1945 when Japan formally surrendered on September 2nd.',
                challengeType: 'fill-blank',
                challenge: 'World War II ended in the year _____.',
                answer: '1945',
                difficulty: 'easy',
                type: 'trivia'
            },
            // Fun Facts
            {
                id: 'fact-1',
                category: 'Fun Fact',
                content: 'A group of flamingos is called a "flamboyance"!',
                challengeType: 'multiple-choice',
                challenge: 'What is a group of flamingos called?',
                options: ['flock', 'flamboyance', 'flutter', 'flame'],
                answer: 'flamboyance',
                difficulty: 'medium',
                type: 'factoid'
            },
            {
                id: 'fact-2',
                category: 'Fun Fact',
                content: 'Bananas are berries, but strawberries aren\'t! Botanically speaking, berries must have seeds inside their flesh.',
                challengeType: 'true-false',
                challenge: 'True or False: Bananas are berries',
                answer: 'True',
                difficulty: 'hard',
                type: 'factoid'
            },
            // Proverbs & Sayings
            {
                id: 'saying-1',
                category: 'Common Saying',
                content: 'A penny saved is a penny earned.',
                challengeType: 'fill-blank',
                challenge: 'A penny saved is a penny _____.',
                answer: 'earned',
                difficulty: 'easy',
                type: 'phrase'
            },
            {
                id: 'saying-2',
                category: 'Proverb',
                content: 'The early bird catches the worm.',
                challengeType: 'word-order',
                challenge: 'Arrange the words:',
                scrambled: ['bird', 'The', 'catches', 'early', 'the', 'worm'],
                answer: 'The early bird catches the worm',
                difficulty: 'medium',
                type: 'phrase'
            }
        ];
        
        // Map practice categories to card types
        const categoryMap = {
            'bad_puns': 'pun',
            'famous_quotes': 'quote',
            'knock_knock': 'joke',
            'trivia_mix': ['factoid', 'trivia', 'phrase']
        };
        
        const targetTypes = categoryMap[category];
        if (!targetTypes) {
            console.warn('Unknown category:', category);
            // Shuffle and return subset of all cards
            return allCards.sort(() => Math.random() - 0.5).slice(0, 10);
        }
        
        // Filter cards by type
        const filteredCards = allCards.filter(card => {
            if (Array.isArray(targetTypes)) {
                return targetTypes.includes(card.type);
            }
            return card.type === targetTypes;
        });
        
        // console.log(`Found ${filteredCards.length} cards for category ${category}:`, 
        //     filteredCards.map(c => `${c.id} (${c.type})`));
        
        // Shuffle the filtered cards
        return filteredCards.sort(() => Math.random() - 0.5);
    }

    loadCard() {
        // console.log('🔄 loadCard() called - Index:', this.currentIndex, 'Total cards:', this.cards.length);
        if (this.currentIndex >= this.cards.length) {
            this.showResults();
            return;
        }

        this.currentCard = this.cards[this.currentIndex];
        this.userAnswer = null;

        // Only reset flip state if we're not in a transition
        if (!this.isTransitioning) {
            this.isFlipped = false;
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.remove('flipped');
        }
        
        // Apply special class for word-order challenges
        if (this.currentCard.challengeType === 'word-order') {
            flashcard.classList.add('word-order-mode');
        } else {
            flashcard.classList.remove('word-order-mode');
        }

        // Update progress
        document.getElementById('currentCard').textContent = this.currentIndex + 1;
        const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;

        // Apply card type themes
        const flashcardFront = flashcard.querySelector('.flashcard-front');
        const categoryEl = document.getElementById('cardCategory');
        
        // Remove previous theme classes
        flashcardFront.className = 'flashcard-front';
        categoryEl.className = 'card-category';
        
        // Add theme based on card type
        if (this.currentCard.type === 'quote') {
            flashcardFront.classList.add('quote-card');
            categoryEl.classList.add('quote-category');
        } else if (this.currentCard.type === 'pun') {
            flashcardFront.classList.add('pun-card');
            categoryEl.classList.add('pun-category');
        } else if (this.currentCard.type === 'joke' && this.currentCard.category.includes('Knock')) {
            flashcardFront.classList.add('knock-card');
            categoryEl.classList.add('knock-category');
        } else if (this.currentCard.category && this.currentCard.category.includes('Science')) {
            flashcardFront.classList.add('science-card');
            categoryEl.classList.add('science-category');
        }
        
        // Update front of card
        categoryEl.textContent = this.currentCard.category;
        
        // Display content with author if it's a quote
        const contentEl = document.getElementById('cardContent');
        if (this.currentCard.type === 'quote' && this.currentCard.author) {
            contentEl.innerHTML = `
                <div class="quote-display">
                    <div class="quote-text">${this.currentCard.content}</div>
                    <div class="quote-author">— ${this.currentCard.author}</div>
                </div>
            `;
        } else {
            contentEl.innerHTML = `<div class="content-display">${this.currentCard.content}</div>`;
        }

        // Prepare the back of card based on challenge type
        this.setupChallenge();

        // Assign dynamic IDs to elements AFTER setupChallenge creates them
        this.assignDynamicIds();

        // Update streak display
        if (this.streak > 0) {
            const streakIndicator = document.getElementById('streakIndicator');
            streakIndicator.style.display = 'flex';
            document.getElementById('streakValue').textContent = this.streak;
        }

        // CRITICAL: Reset UI elements - ensure challenge is visible
        const feedbackEl = this.getElement('feedback');
        if (feedbackEl) feedbackEl.style.display = 'none';
        
        const challengeEl = this.getElement('challenge');
        const checkBtn = this.getElement('checkBtn');
        
        // Force challenge and button visible with inline styles AND higher z-index than animations
        if (challengeEl) {
            challengeEl.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; position: relative !important; z-index: 10000 !important;';
            // console.log('Force showing challenge on load for:', this.getUniqueId('challenge'));
        }
        if (checkBtn) {
            checkBtn.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; margin: 20px auto; position: relative !important; z-index: 10000 !important;';
            // console.log('Force showing check button on load for:', this.getUniqueId('checkBtn'));
        }
        
        // REMOVED MONITORING - just rely on the forced visibility styles above
    }

    setupChallenge() {
        // console.log('🔧 setupChallenge() called for card:', this.currentCard?.id);
        const questionEl = this.modal.querySelector('.flashcard-challenge-question');
        const inputEl = this.modal.querySelector('.flashcard-challenge-input');
        
        // console.log('Setting up challenge for card:', this.currentCard);
        // console.log('Challenge text:', this.currentCard.challenge);
        
        questionEl.textContent = this.currentCard.challenge || 'No challenge text';
        
        switch (this.currentCard.challengeType) {
            case 'fill-blank':
                const fillBlankId = `${this.getUniqueId('input')}-fillBlank`;
                
                // Clear existing content completely
                inputEl.innerHTML = '';
                
                // Create input using createElement (more reliable than innerHTML)
                const input = document.createElement('input');
                input.type = 'text';
                input.id = fillBlankId;
                input.className = 'fill-blank-input';
                input.placeholder = 'Type your answer...';
                input.autocomplete = 'off';
                
                // Set styles directly on the element (not via innerHTML)
                input.style.display = 'block';
                input.style.opacity = '1';
                input.style.visibility = 'visible';
                input.style.width = '100%';
                input.style.maxWidth = '300px';
                input.style.padding = '12px 20px';
                input.style.margin = '0 auto';
                input.style.background = 'rgba(0, 0, 0, 0.3)';
                input.style.border = '2px solid rgba(255, 255, 255, 0.5)';
                input.style.color = 'white';
                input.style.borderRadius = '12px';
                input.style.textAlign = 'center';
                input.style.fontSize = '18px';
                
                // Append to container
                inputEl.appendChild(input);
                // console.log('✅ Input created with createElement and direct style properties');
                // Force input visible and monitor what happens to it
                setTimeout(() => {
                    const input = document.getElementById(fillBlankId);
                    if (input) {
                        // Force input visible with clean styling
                        input.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 99999 !important; position: relative !important; width: 100% !important; max-width: 300px !important; padding: 12px 20px !important; margin: 0 auto !important; background: rgba(0, 0, 0, 0.3) !important; border: 2px solid rgba(255, 255, 255, 0.5) !important; color: white !important; animation: none !important; transition: none !important; transform: none !important;';
                        // console.log('🔧 Input force-styled with nuclear CSS');
                        
                        // TEST INPUT REMOVED - was used for debugging disappearing inputs
                        /*
                        const testInput = document.createElement('input');
                        testInput.type = 'text';
                        testInput.placeholder = 'TEST INPUT - Does this stay visible?';
                        testInput.style.cssText = 'position: fixed !important; top: 50px !important; left: 50px !important; z-index: 999999 !important; background: red !important; color: white !important; padding: 10px !important; border: 3px solid yellow !important;';
                        testInput.id = 'test-input-experiment';
                        document.body.appendChild(testInput);
                        
                        // Remove test input after 5 seconds
                        setTimeout(() => {
                            const test = document.getElementById('test-input-experiment');
                            if (test) test.remove();
                        }, 5000);
                        */
                        
                        // DETECTIVE MODE: Watch what happens to this element
                        const observer = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                    // console.log('🔍 Input style was changed!', mutation.target.style.cssText);
                                } else if (mutation.type === 'childList') {
                                    // console.log('🔍 Input parent children changed!', mutation);
                                }
                            });
                        });
                        observer.observe(input, { attributes: true, attributeFilter: ['style'] });
                        observer.observe(input.parentElement, { childList: true });
                        
                        // Store observer to clean up later
                        this.inputObserver = observer;
                        
                        // Check position and dimensions too
                        let checks = 0;
                        const interval = setInterval(() => {
                            checks++;
                            const exists = document.getElementById(fillBlankId);
                            const computed = exists ? window.getComputedStyle(exists) : null;
                            const rect = exists ? exists.getBoundingClientRect() : null;
                            // console.log(`Check ${checks}: exists=${!!exists}, display=${computed?.display}, opacity=${computed?.opacity}, visibility=${computed?.visibility}`);
                            if (rect) {
                                // console.log(`  Position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
                            }
                            
                            if (checks >= 10 || !exists) {  // Reduced to 10 checks to reduce spam
                                clearInterval(interval);
                                if (this.inputObserver) {
                                    this.inputObserver.disconnect();
                                    this.inputObserver = null;
                                }
                            }
                        }, 200);  // Every 200ms instead of 100ms
                    }
                }, 10);
                break;
                
            case 'who-said-it':
                const authorInputId = `${this.getUniqueId('input')}-author`;
                
                // Clear existing content
                inputEl.innerHTML = '';
                
                // Create input using createElement (more reliable than innerHTML)
                const authorInput = document.createElement('input');
                authorInput.type = 'text';
                authorInput.id = authorInputId;
                authorInput.className = 'author-input';
                authorInput.placeholder = 'Who said this?';
                authorInput.autocomplete = 'off';
                authorInput.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
                
                // Append to container
                inputEl.appendChild(authorInput);
                // Extra insurance - set styles after DOM update
                setTimeout(() => {
                    const input = document.getElementById(authorInputId);
                    if (input) {
                        input.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1200 !important;';
                    }
                }, 10);
                break;
                
            case 'multiple-choice':
                inputEl.innerHTML = `
                    <div class="multiple-choice-options">
                        ${this.currentCard.options.map((option, index) => `
                            <button class="mc-option" data-option="${option}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `).join('')}
                    </div>
                `;
                // Add click handlers to options
                setTimeout(() => {
                    inputEl.querySelectorAll('.mc-option').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            // Remove previous selection
                            inputEl.querySelectorAll('.mc-option').forEach(b => b.classList.remove('selected'));
                            // Add selection to clicked option
                            btn.classList.add('selected');
                            this.userAnswer = btn.dataset.option;
                        });
                    });
                }, 0);
                break;
                
            case 'true-false':
                inputEl.innerHTML = `
                    <div class="true-false-options">
                        <button class="tf-option" data-answer="True">
                            <span class="tf-icon">✓</span> True
                        </button>
                        <button class="tf-option" data-answer="False">
                            <span class="tf-icon">✗</span> False
                        </button>
                    </div>
                `;
                // Add click handlers
                setTimeout(() => {
                    inputEl.querySelectorAll('.tf-option').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            inputEl.querySelectorAll('.tf-option').forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            this.userAnswer = btn.dataset.answer;
                        });
                    });
                }, 0);
                break;
                
            case 'word-order':
                const scrambled = [...this.currentCard.scrambled];
                const wordBankId = `${this.getUniqueId('input')}-wordBank`;
                const wordAnswerId = `${this.getUniqueId('input')}-wordAnswer`;
                inputEl.innerHTML = `
                    <div class="word-order-container">
                        <div class="word-bank" id="${wordBankId}">
                            ${scrambled.map(word => `
                                <span class="word-chip" data-word="${word}">${word}</span>
                            `).join('')}
                        </div>
                        <div class="word-answer" id="${wordAnswerId}">
                            <div class="answer-placeholder">Drag words here...</div>
                        </div>
                    </div>
                `;
                // Add drag and drop or click functionality
                setTimeout(() => this.setupWordOrder(), 0);
                break;
        }
    }

    setupWordOrder() {
        const wordBankId = `${this.getUniqueId('input')}-wordBank`;
        const wordAnswerId = `${this.getUniqueId('input')}-wordAnswer`;
        const wordBank = document.getElementById(wordBankId);
        const wordAnswer = document.getElementById(wordAnswerId);
        const selectedWords = [];
        
        // Click to add words
        wordBank.addEventListener('click', (e) => {
            if (e.target.classList.contains('word-chip') && !e.target.classList.contains('selected')) {
                e.target.classList.add('selected');
                selectedWords.push(e.target.dataset.word);
                
                // Clear placeholder
                if (wordAnswer.querySelector('.answer-placeholder')) {
                    wordAnswer.innerHTML = '';
                }
                
                // Add word to answer
                const chip = document.createElement('span');
                chip.className = 'word-chip';
                chip.dataset.word = e.target.dataset.word;
                chip.textContent = e.target.dataset.word;
                chip.addEventListener('click', () => {
                    // Remove from answer
                    chip.remove();
                    e.target.classList.remove('selected');
                    const index = selectedWords.indexOf(e.target.dataset.word);
                    if (index > -1) selectedWords.splice(index, 1);
                    
                    // Show placeholder if empty
                    if (wordAnswer.children.length === 0) {
                        wordAnswer.innerHTML = '<div class="answer-placeholder">Click words to build the sentence...</div>';
                    }
                });
                wordAnswer.appendChild(chip);
            }
        });
        
        // Store selected words for checking
        this.getSelectedWords = () => selectedWords.join(' ');
    }

    flipCard() {
        // STEP 1: Prevent double-flipping
        if (this.isFlipped) return;

        const flashcard = document.getElementById('flashcard');
        // console.log('Flipping card. Current card:', this.currentCard);
        console.log('Card challenge:', this.currentCard.challenge);
        console.log('Card challenge type:', this.currentCard.challengeType);
        
        // DEBUGGING: Check if back content exists
        const backEl = flashcard.querySelector('.flashcard-back');
        const challengeEl = this.getElement('challenge'); // Use dynamic ID
        console.log('Back element exists:', !!backEl);
        console.log('Challenge element exists:', !!challengeEl);
        console.log('Challenge content:', challengeEl?.innerHTML);
        
        // STEP 2: Add flipped class to trigger CSS animation
        flashcard.classList.add('flipped');
        this.isFlipped = true;
        this.canAnswer = false; // Prevent answering immediately after flip
        
        // STEP 3: Allow answering after animation delay
        setTimeout(() => {
            this.canAnswer = true;
        }, 500);

        // STEP 4: Force the back to be visible (fighting against CSS issues)
        if (backEl) {
            backEl.style.opacity = '1';
            backEl.style.visibility = 'visible';
            backEl.style.display = 'flex';
        }

        // STEP 5: Hide skip button when card is flipped (can't skip challenges)
        const skipBtn = document.getElementById('skipBtn');
        if (skipBtn) {
            skipBtn.style.display = 'none';
        }
        
        // STEP 6: CRITICAL BUG FIX - Force challenge to stay visible
        // Something is hiding the challenge div after flip
        const challengeDiv = this.getElement('challenge');
        if (challengeDiv) {
            // Use setAttribute to make it harder to override
            challengeDiv.setAttribute('style', 'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1000 !important;');
            // console.log('Forcing challenge visible after flip:', this.getUniqueId('challenge'));
        }
        
        const checkBtn = this.getElement('checkBtn');
        if (checkBtn) {
            checkBtn.style.display = 'block !important';
            console.log('Forcing check button visible after flip:', this.getUniqueId('checkBtn'));
        }
        
        // STEP 7: Focus input after flip animation completes (700ms)
        setTimeout(() => {
            const input = document.querySelector('.fill-blank-input, .author-input');
            if (input) {
                input.focus();
                // NUCLEAR OPTION: Force inputs visible
                input.style.display = 'block !important';
                input.style.opacity = '1 !important';
                input.style.visibility = 'visible !important';
            }
            
            // STEP 8: Double-check challenge visibility (something keeps hiding it!)
            const challenge = this.getElement('challenge');
            const fillBlankId = `${this.getUniqueId('input')}-fillBlank`;
            const inputEl = document.getElementById(fillBlankId);
            
            console.log('=== 700ms visibility check ===');
            console.log('Challenge element:', challenge?.style.display);
            console.log('Input element:', inputEl?.style.display);
            console.log('Input computed:', inputEl ? window.getComputedStyle(inputEl).display : 'not found');
            
            if (challenge && challenge.style.display === 'none') {
                console.warn('Challenge was hidden! Forcing visible...');
                challenge.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important;';
            }
            
            if (inputEl && window.getComputedStyle(inputEl).display === 'none') {
                console.warn('Input was hidden! Forcing visible...');
                inputEl.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1200 !important;';
            }
        }, 700);
    }
    
    flipCardToFront() {
        console.log('flipCardToFront called - flipping to front and advancing');
        
        // Prevent duplicate transitions
        if (this.isTransitioning) {
            console.log('Already transitioning, skipping flip');
            return;
        }
        
        this.isTransitioning = true;
        
        // First flip to front
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.remove('flipped');
        this.isFlipped = false;
        
        // Force a reflow to ensure the browser registers the state change
        void flashcard.offsetHeight;
        
        // Wait for flip animation to complete, then pause briefly before loading next card
        setTimeout(() => {
            console.log('Flip animation complete, pausing before next card...');
            // Add a small pause to let the flip settle visually
            setTimeout(() => {
                this.isTransitioning = false;
                this.nextCard();
            }, 200); // Small pause after flip completes
        }, 600); // Wait for flip animation (matches CSS transition duration)
    }
    
    monitorElementVisibility() {
        // SIMPLE DEBUGGING: Just log what's happening without fixing
        const targetNode = this.getElement('challenge');
        if (!targetNode) {
            // Don't monitor if element doesn't exist yet
            return;
        }
        
        // Disconnect any existing observer
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
        }
        
        let logCount = 0;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const element = mutation.target;
                    
                    // Only log first few times to avoid spam
                    if (logCount < 5) {
                        console.log('Style changed on:', element.id || element.className);
                        console.log('Old style:', mutation.oldValue);
                        console.log('New style:', element.style.cssText);
                        logCount++;
                    }
                }
            });
        });
        
        // Start observing with all options
        observer.observe(targetNode, { 
            attributes: true, 
            attributeFilter: ['style', 'class'],
            subtree: true,
            childList: true
        });
        
        // Also observe the flashcard-back element
        const backEl = document.querySelector('.flashcard-back');
        if (backEl) {
            observer.observe(backEl, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                subtree: true
            });
        }
        
        // CRITICAL: Also monitor for content removal
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    if (mutation.removedNodes.length > 0) {
                        console.error('CONTENT REMOVED from:', mutation.target);
                        console.error('Removed nodes:', mutation.removedNodes);
                        console.error('Stack trace:', new Error().stack);
                    }
                }
                
                // Check if innerHTML was cleared
                if (mutation.target.id === 'cardChallenge' && 
                    mutation.target.children.length === 0) {
                    console.error('cardChallenge EMPTIED!');
                    console.error('Stack trace:', new Error().stack);
                }
                
                // Check specific elements
                if (mutation.target.id === 'challengeInput' && 
                    mutation.target.innerHTML === '') {
                    console.error('challengeInput CLEARED!');
                    console.error('Stack trace:', new Error().stack);
                }
            });
        });
        
        // Monitor content changes
        contentObserver.observe(document.getElementById('flashcard'), {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Store observers to disconnect later
        this.visibilityObserver = observer;
        this.contentObserver = contentObserver;
        
        // Removed periodic check - MutationObserver is sufficient
    }

    checkAnswer() {
        // VALIDATION STEP: Called when user clicks "Check Answer"
        console.log('checkAnswer called');
        let userAnswer = '';
        let isCorrect = false;
        
        // Process answer based on challenge type
        switch (this.currentCard.challengeType) {
            case 'fill-blank':
                // Get the text input value - need to use the specific input ID
                const fillBlankId = `${this.getUniqueId('input')}-fillBlank`;
                const input = document.getElementById(fillBlankId);
                if (!input) {
                    console.error('Fill blank input not found:', fillBlankId);
                    return;
                }
                userAnswer = input.value.trim();
                console.log('User answer:', userAnswer, 'Expected:', this.currentCard.answer);
                
                // More forgiving comparison - ignore case and punctuation
                const normalizedUser = userAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedAnswer = this.currentCard.answer.toLowerCase().replace(/[^a-z0-9]/g, '');
                isCorrect = normalizedUser === normalizedAnswer;
                break;
                
            case 'who-said-it':
                // Get author input value - need to use the specific input ID
                const authorInputId = `${this.getUniqueId('input')}-author`;
                const authorInput = document.getElementById(authorInputId);
                if (!authorInput) {
                    console.error('Author input not found:', authorInputId);
                    return;
                }
                userAnswer = authorInput.value.trim();
                // Case-insensitive comparison
                isCorrect = userAnswer.toLowerCase() === this.currentCard.answer.toLowerCase();
                break;
                
            case 'multiple-choice':
                // Use stored selection from click handler
                isCorrect = this.userAnswer === this.currentCard.answer;
                break;
                
            case 'true-false':
                // Use stored selection from click handler
                isCorrect = this.userAnswer === this.currentCard.answer;
                break;
                
            case 'word-order':
                // Get ordered words from helper function
                userAnswer = this.getSelectedWords();
                // Exact match required for word order
                isCorrect = userAnswer === this.currentCard.answer;
                break;
        }
        
        // Pass result to handler for feedback display
        this.handleAnswer(isCorrect);
    }

    handleAnswer(isCorrect) {
        // FEEDBACK HANDLER: Shows result and awards points
        console.log('handleAnswer called with:', isCorrect);
        console.trace('Stack trace for handleAnswer');
        
        if (isCorrect) {
            // CORRECT ANSWER PATH
            this.score++;
            this.streak++;
            this.showFeedback('correct');
            
            // Award hearts/diamonds based on streak
            this.awardRewards();
        } else {
            // INCORRECT ANSWER PATH
            this.streak = 0;
            this.showFeedback('incorrect');
        }

        // Track the card view with result (for progression system)
        this.trackCardView(this.currentCard.id, isCorrect);

        // UI TRANSITION: Hide check button and feedback area
        const checkBtn = this.getElement('checkBtn');
        if (checkBtn) checkBtn.style.display = 'none';
        
        // Also hide the actual button by class (in case dynamic ID fails)
        const checkBtnByClass = this.modal.querySelector('.flashcard-check-answer-btn');
        if (checkBtnByClass) checkBtnByClass.style.display = 'none';
        
        // Don't show feedback area - bot indicator handles everything
        const feedbackEl = this.getElement('feedback');
        if (feedbackEl) feedbackEl.style.display = 'none';
    }
    
    showFeedback(type) {
        // SUBTLE FEEDBACK: JazzyPop style - minimal overlay, small XP popup
        
        // STEP 1: Show small XP reward popup at top (like main game)
        this.showXPReward(type);
        
        // STEP 2: Add subtle bot indicator to show correct/incorrect
        this.showBotIndicator(type);
        
        // Don't show any text feedback - the bot indicator handles it all
        // The bot will trigger the card flip after showing
    }
    
    async showXPReward(type) {
        // Small reward popup at top like main game
        const xpPopup = document.createElement('div');
        xpPopup.className = 'xp-reward-popup';
        
        if (type === 'correct') {
            // Show the XP amount from last reward (already awarded by awardRewards)
            const xpAmount = this.lastReward?.xp || 10;
            
            xpPopup.innerHTML = `
                <span class="reward-icon">⭐</span>
                <span class="reward-text">+${xpAmount} XP</span>
            `;
            xpPopup.classList.add('positive');
        } else {
            // Show 0 XP for incorrect
            xpPopup.innerHTML = `
                <span class="reward-icon">💔</span>
                <span class="reward-text">0 XP</span>
            `;
            xpPopup.classList.add('negative');
        }
        
        // Position at top of modal
        const flashcardContent = this.modal.querySelector('.flashcard-content');
        flashcardContent.appendChild(xpPopup);
        
        // Animate in and out
        setTimeout(() => xpPopup.classList.add('show'), 100);
        setTimeout(() => {
            xpPopup.classList.remove('show');
            setTimeout(() => xpPopup.remove(), 300);
        }, 2000);
    }
    
    showBotIndicator(type) {
        // Small bot icon with checkmark/X like main game
        const botIndicator = document.createElement('div');
        botIndicator.className = 'bot-feedback-indicator';
        
        if (type === 'correct') {
            botIndicator.innerHTML = `
                <img src="./src/images/checkmark-bot.svg" alt="Correct" class="bot-icon">
            `;
        } else {
            botIndicator.innerHTML = `
                <img src="./src/images/not-bot.svg" alt="Incorrect" class="bot-icon">
            `;
        }
        
        // Append to modal content for full-screen overlay
        const modalContent = this.modal.querySelector('.flashcard-content');
        modalContent.appendChild(botIndicator);
        
        // Animate in
        setTimeout(() => botIndicator.classList.add('show'), 100);
        
        // Clear any existing flip timer to prevent duplicate flips
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
        // Remove after 1.5 seconds and flip card
        this.flipTimer = setTimeout(() => {
            console.log('Bot feedback timeout - removing bot indicator');
            botIndicator.classList.remove('show');
            setTimeout(() => {
                console.log('Removing bot element and calling flipCardToFront');
                botIndicator.remove();
                // Flip the card back to front to show the next quote
                this.flipCardToFront();
                this.flipTimer = null; // Clear the timer reference
            }, 300);
        }, 1500);
    }

    async awardRewards() {
        // Use EconomyManager to handle flashcard completion
        if (window.economyManager) {
            const flashcardResult = {
                correct: true,
                streak: this.streak,
                cardType: this.currentCard?.type || 'flashcard',
                category: this.currentCard?.category || 'general'
            };
            
            // Process the flashcard completion through EconomyManager
            const result = await window.economyManager.processFlashcardComplete(flashcardResult);
            
            if (result.rewards) {
                // Show rewards using the new RewardsPopup
                window.dispatchEvent(new CustomEvent('rewards:earned', {
                    detail: {
                        rewards: result.rewards,
                        bonuses: result.bonuses || []
                    }
                }));
            }
            
            // Store for display
            this.lastReward = result.rewards;
        }
    }
    
    async awardCompletionBonus() {
        const stackSize = this.cards.length;
        const percentage = Math.round((this.score / this.cards.length) * 100);
        
        // Only award completion bonus for good performance
        if (percentage >= 50 && window.economyManager) {
            // Let the backend calculate the completion bonus based on performance
            const completionData = {
                cardsCompleted: stackSize,
                correctAnswers: this.score,
                percentage: percentage,
                finalStreak: this.streak
            };
            
            // Process completion bonus through EconomyManager
            const result = await window.economyManager.processFlashcardComplete({
                ...completionData,
                isCompletionBonus: true
            });
            
            if (result.rewards) {
                // Show rewards using the new RewardsPopup
                window.dispatchEvent(new CustomEvent('rewards:earned', {
                    detail: {
                        rewards: result.rewards,
                        bonuses: ['Completion Bonus!']
                    }
                }));
                
                // Also show the legacy completion bonus popup for now
                let message = '';
                if (result.rewards.hearts > 0) message += `+${result.rewards.hearts} ❤️ `;
                if (result.rewards.diamonds > 0) message += `+${result.rewards.diamonds} 💎 `;
                if (result.rewards.xp > 0) message += `+${result.rewards.xp} XP `;
                message += 'Completion Bonus!';
                
                this.showCompletionBonus(
                    result.rewards.hearts || 0,
                    result.rewards.diamonds || 0,
                    message
                );
            }
        }
    }
    
    showCompletionBonus(hearts, diamonds, message) {
        const bonus = document.createElement('div');
        bonus.className = 'completion-bonus';
        
        // Choose icon based on what was awarded
        let icon = '❤️';
        let bgColor = 'linear-gradient(135deg, #2ecc40, #27ae60)';
        
        if (diamonds > 0 && hearts === 0) {
            icon = '💎';
            bgColor = 'linear-gradient(135deg, #3498db, #2980b9)';
        } else if (diamonds > 0 && hearts > 0) {
            icon = '❤️💎';
        }
        
        bonus.innerHTML = `
            <div class="bonus-icon">${icon}</div>
            <div class="bonus-text">${message}</div>
        `;
        
        bonus.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${bgColor};
            color: white;
            padding: 20px 30px;
            border-radius: 16px;
            text-align: center;
            z-index: 200;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: bonusPopIn 0.5s ease;
        `;
        
        const bonusIcon = bonus.querySelector('.bonus-icon');
        bonusIcon.style.cssText = `
            font-size: 48px;
            margin-bottom: 10px;
        `;
        
        const bonusText = bonus.querySelector('.bonus-text');
        bonusText.style.cssText = `
            font-size: 18px;
            font-weight: 600;
        `;
        
        document.body.appendChild(bonus);
        
        // Remove after delay
        setTimeout(() => {
            bonus.style.animation = 'bonusPopOut 0.3s ease forwards';
            setTimeout(() => bonus.remove(), 300);
        }, 2000);
    }

    showReward(type) {
        const popup = document.getElementById('rewardPopup');
        const icon = popup.querySelector('.reward-icon');
        const text = popup.querySelector('.reward-text');

        if (type === 'correct') {
            // Show the randomly assigned reward
            const reward = this.lastReward || { hearts: 1, diamonds: 0, xp: 0 };
            
            if (reward.hearts > 0) {
                icon.textContent = '❤️';
                text.textContent = `+${reward.hearts} ❤️`;
            } else if (reward.diamonds > 0) {
                icon.textContent = '💎';
                text.textContent = `+${reward.diamonds} 💎`;
            } else if (reward.xp > 0) {
                icon.textContent = '⭐';
                text.textContent = `+${reward.xp} XP`;
            }
            
            popup.className = 'reward-popup correct';
        } else {
            icon.textContent = '💔';
            text.textContent = 'Try again!';
            popup.className = 'reward-popup incorrect';
        }

        popup.style.display = 'flex';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 1500);
    }

    showScoreMessage(type) {
        // Create score message bar
        const messageBar = document.createElement('div');
        messageBar.className = 'score-message-bar';
        
        if (type === 'correct') {
            messageBar.classList.add('correct');
            const reward = this.lastReward || { hearts: 1, diamonds: 0, xp: 0 };
            
            let rewardText = '';
            if (reward.hearts > 0) {
                rewardText = `+${reward.hearts} ❤️`;
            } else if (reward.diamonds > 0) {
                rewardText = `+${reward.diamonds} 💎`;
            } else if (reward.xp > 0) {
                rewardText = `+${reward.xp} XP`;
            }
            
            messageBar.innerHTML = `
                <div class="score-message-content">
                    <span class="score-label">Reward:</span>
                    <span class="score-item">${rewardText}</span>
                    <span class="score-item">Score: ${this.score}/${this.cards.length}</span>
                    ${this.streak > 1 ? `<span class="score-item streak">🔥 Streak: ${this.streak}</span>` : ''}
                </div>
            `;
        } else {
            messageBar.classList.add('incorrect');
            messageBar.innerHTML = `
                <div class="score-message-content">
                    <span class="score-label">Score:</span>
                    <span class="score-item">${this.score}/${this.cards.length}</span>
                    <span class="score-item">Streak Lost 💔</span>
                </div>
            `;
        }
        
        // Add to flashcard content
        const flashcardContent = document.querySelector('.flashcard-content');
        flashcardContent.appendChild(messageBar);
        
        // Animate in
        requestAnimationFrame(() => {
            messageBar.classList.add('show');
        });
        
        // Remove after delay
        setTimeout(() => {
            messageBar.classList.remove('show');
            setTimeout(() => messageBar.remove(), 300);
        }, 3000);
    }

    nextCard() {
        // Remove any existing overlay
        const existingOverlay = document.querySelector('.answer-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Disconnect visibility observer
        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }
        
        // Disconnect content observer
        if (this.contentObserver) {
            this.contentObserver.disconnect();
            this.contentObserver = null;
        }
        
        this.currentIndex++;
        
        // Check if we've completed all cards
        if (this.currentIndex >= this.cards.length) {
            this.showResults();
            return;
        }
        
        // Don't flip here - flipCardToFront already handles the flip
        // Just load the next card
        this.loadCard();
    }

    showResults() {
        const flashcardContainer = document.getElementById('flashcardContainer');
        const percentage = Math.round((this.score / this.cards.length) * 100);
        
        // Award completion bonus hearts
        this.awardCompletionBonus();
        
        flashcardContainer.innerHTML = `
            <div class="results-screen">
                <h2>Great Practice!</h2>
                <div class="results-stats">
                    <div class="result-stat">
                        <span class="stat-value">${this.score}/${this.cards.length}</span>
                        <span class="stat-label">Correct</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-value">${percentage}%</span>
                        <span class="stat-label">Accuracy</span>
                    </div>
                </div>
                <div class="results-message">
                    ${this.getResultMessage(percentage)}
                </div>
                <div class="results-actions">
                    <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
                    <button class="btn-secondary" onclick="window.flashcardModal.restart()">Practice Again</button>
                </div>
            </div>
        `;

        // Hide footer elements
        document.querySelector('.flashcard-footer').style.display = 'none';
    }

    getResultMessage(percentage) {
        if (percentage === 100) {
            return "🌟 Perfect! You're a trivia master!";
        } else if (percentage >= 80) {
            return "🎉 Excellent work! Keep it up!";
        } else if (percentage >= 60) {
            return "👍 Good job! Practice makes perfect!";
        } else if (percentage >= 40) {
            return "💪 Nice try! You're learning!";
        } else {
            return "🌱 Keep practicing, you'll get there!";
        }
    }

    restart() {
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;
        
        // Restore footer
        document.querySelector('.flashcard-footer').style.display = 'flex';
        
        // Recreate flashcard container
        const container = document.getElementById('flashcardContainer');
        container.innerHTML = `
            <div class="flashcard" id="flashcard">
                <div class="flashcard-front">
                    <div class="card-category" id="cardCategory">Trivia</div>
                    <div class="card-question" id="cardQuestion">Loading...</div>
                    <div class="flip-hint">Tap to reveal answer</div>
                </div>
                <div class="flashcard-back">
                    <div class="card-answer" id="cardAnswer">Answer</div>
                    <div class="answer-actions">
                        <button class="answer-btn incorrect-btn" data-result="incorrect">
                            <span class="btn-icon">❌</span>
                            <span>I was wrong</span>
                        </button>
                        <button class="answer-btn correct-btn" data-result="correct">
                            <span class="btn-icon">✅</span>
                            <span>I knew it!</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Event listener is already attached in attachEventListeners() - don't duplicate!
        
        this.modal.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAnswer(btn.dataset.result === 'correct');
            });
        });
        
        this.loadCard();
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset state
        this.cards = [];
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
    }
}

// Initialize flashcard modal
window.flashcardModal = new FlashcardModal();
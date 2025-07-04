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
        this.isFlipped = false; // so this is true if we are looking at the back of a card, and false if we are looking at the front.
        // so we should be setting the this.isFlipped state to False to turn a card around - or 'when we turn that card around' yes?
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
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
                            <div class="card-challenge" id="cardChallenge">
                                <div class="challenge-question" id="challengeQuestion"></div>
                                <div class="challenge-input" id="challengeInput"></div>
                            </div>
                            <div class="answer-check">
                                <button class="check-answer-btn" id="checkAnswerBtn">Check Answer</button>
                            </div>
                            <div class="answer-feedback" id="answerFeedback" style="display: none;">
                                <div class="feedback-content" id="feedbackContent"></div>
                                <button class="continue-btn" id="continueBtn">Continue</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flashcard-footer">
                    <button class="skip-btn" id="skipBtn">Skip</button>
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
        // Close button
        const closeBtn = this.modal.querySelector('.flashcard-close');
        closeBtn.addEventListener('click', () => this.close());

        // Overlay click
        const overlay = this.modal.querySelector('.flashcard-overlay');
        overlay.addEventListener('click', () => this.close());

        // Flashcard click to flip
        const flashcard = this.modal.querySelector('#flashcard');
        flashcard.addEventListener('click', () => this.flipCard());

        // Check answer button
        const checkBtn = this.modal.querySelector('#checkAnswerBtn');
        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Check answer button clicked');
            this.checkAnswer();
        });

        // Continue button
        const continueBtn = this.modal.querySelector('#continueBtn');
        continueBtn.addEventListener('click', () => this.nextCard());

        // Skip button
        const skipBtn = this.modal.querySelector('#skipBtn');
        skipBtn.addEventListener('click', () => this.nextCard());

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case ' ':
                case 'Enter':
                    // what's the scope of the isFlipped state - seems like it would easily get contaminated if it's global, no?
                    // is it limited to the scope of the active object to which it is attached?
                    if (!this.isFlipped) {
                        this.flipCard();
                    }
                    break;
                case 'ArrowRight':
                    if (this.isFlipped) {
                        this.handleAnswer(true);
                    }
                    break;
                case 'ArrowLeft':
                    if (this.isFlipped) {
                        this.handleAnswer(false);
                    }
                    break;
            }
        });
    }

    async open(config) {
        console.log('Opening flashcard modal with config:', config);

        // Get cards based on category if provided
        if (config && config.category) {
            this.cards = this.getCardsByCategory(config.category);
        } else {
            // Get all default cards
            this.cards = this.getDefaultCards();
        }

        if (!this.cards || this.cards.length === 0) {
            console.error(
                'No flashcards available for category:',
                config?.category
            );
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
            const apiBase = window.API_URL || 'http://52.88.234.65:8000';
            const response = await fetch(`${apiBase}/api/flashcards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                throw new Error('Failed to fetch flashcards');
            }

            const data = await response.json();
            return data.cards;
        } catch (error) {
            console.error('Error fetching flashcards:', error);
            // Return some default cards for testing
            return this.getDefaultCards();
        }
    }

    getDefaultCards() {
        const cards = [
            // Famous Quotes with different challenge types
            // what are these - hardcoded questions?
            // so our api is still not aligned or not returning any questions?
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
                content:
                    '"I have a dream that one day this nation will rise up and live out the true meaning of its creed."',
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
                content:
                    '"Life is what happens when you\'re busy making other plans."',
                author: 'John Lennon',
                challengeType: 'word-order',
                challenge: 'Put these words in order:',
                scrambled: [
                    'happens',
                    'Life',
                    'when',
                    'is',
                    'what',
                    'making',
                    "you're",
                    'busy',
                    'other',
                    'plans'
                ],
                answer: "Life is what happens when you're busy making other plans",
                difficulty: 'hard',
                type: 'quote'
            },
            {
                id: 'quote-5',
                category: 'Famous Quote',
                content:
                    '"The only way to do great work is to love what you do."',
                author: 'Steve Jobs',
                challengeType: 'multiple-choice',
                challenge: 'Who said this?',
                options: [
                    'Bill Gates',
                    'Steve Jobs',
                    'Elon Musk',
                    'Mark Zuckerberg'
                ],
                answer: 'Steve Jobs',
                difficulty: 'medium',
                type: 'quote'
            },
            // Science Facts
            {
                id: 'science-1',
                category: 'Science Fact',
                content:
                    "Jupiter is the largest planet in our solar system. It's so big that all other planets could fit inside it!",
                challengeType: 'fill-blank',
                challenge: '_____ is the largest planet in our solar system.',
                answer: 'Jupiter',
                difficulty: 'easy',
                type: 'factoid'
            },
            {
                id: 'science-2',
                category: 'Science Fact',
                content:
                    'Octopuses have three hearts and blue blood! Two hearts pump blood to the gills, one to the body.',
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
                content:
                    'World War II ended in 1945 when Japan formally surrendered on September 2nd.',
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
                content:
                    "Bananas are berries, but strawberries aren't! Botanically speaking, berries must have seeds inside their flesh.",
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
                challenge:
                    'I used to hate facial hair, but then it _____ on me.',
                answer: 'grew',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-2',
                category: 'Bad Pun 😅',
                content: 'Time flies like an arrow. Fruit flies like a banana.',
                challengeType: 'true-false',
                challenge:
                    'True or False: This pun plays with the word "flies"',
                answer: 'True',
                difficulty: 'medium',
                type: 'pun'
            },
            {
                id: 'pun-3',
                category: 'Bad Pun 😅',
                content:
                    "I'm reading a book about anti-gravity. It's impossible to put down!",
                challengeType: 'fill-blank',
                challenge:
                    "I'm reading a book about anti-gravity. It's impossible to put _____!",
                answer: 'down',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-4',
                category: 'Bad Pun 😅',
                content:
                    "Why don't scientists trust atoms? Because they make up everything!",
                challengeType: 'multiple-choice',
                challenge: "Why don't scientists trust atoms?",
                options: [
                    "They're too small",
                    'They make up everything',
                    "They're unstable",
                    "They're negative"
                ],
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
                content:
                    "Knock knock. Who's there? Lettuce. Lettuce who? Lettuce in, it's cold out here!",
                challengeType: 'fill-blank',
                challenge:
                    "Knock knock. Who's there? Lettuce. Lettuce who? Lettuce _____, it's cold out here!",
                answer: 'in',
                difficulty: 'easy',
                type: 'joke'
            },
            {
                id: 'knock-2',
                category: 'Knock Knock 🚪',
                content:
                    "Knock knock. Who's there? Boo. Boo who? Don't cry, it's just a joke!",
                challengeType: 'multiple-choice',
                challenge: 'Complete the joke: "Boo who?"',
                options: [
                    "Don't cry, it's just a joke!",
                    'Boo to you too!',
                    "I'm a ghost!",
                    'Halloween is here!'
                ],
                answer: "Don't cry, it's just a joke!",
                difficulty: 'easy',
                type: 'joke'
            }
        ];

        // Shuffle and return a subset
        const shuffled = cards.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 10);
    }

    getCardsByCategory(category) {
        console.log('Getting cards for category:', category);

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
                content:
                    '"I have a dream that one day this nation will rise up and live out the true meaning of its creed."',
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
                content:
                    '"Life is what happens when you\'re busy making other plans."',
                author: 'John Lennon',
                challengeType: 'word-order',
                challenge: 'Put these words in order:',
                scrambled: [
                    'happens',
                    'Life',
                    'when',
                    'is',
                    'what',
                    'making',
                    "you're",
                    'busy',
                    'other',
                    'plans'
                ],
                answer: "Life is what happens when you're busy making other plans",
                difficulty: 'hard',
                type: 'quote'
            },
            {
                id: 'quote-5',
                category: 'Famous Quote',
                content:
                    '"The only way to do great work is to love what you do."',
                author: 'Steve Jobs',
                challengeType: 'multiple-choice',
                challenge: 'Who said this?',
                options: [
                    'Bill Gates',
                    'Steve Jobs',
                    'Elon Musk',
                    'Mark Zuckerberg'
                ],
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
                challenge:
                    'I used to hate facial hair, but then it _____ on me.',
                answer: 'grew',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-2',
                category: 'Bad Pun 😅',
                content: 'Time flies like an arrow. Fruit flies like a banana.',
                challengeType: 'true-false',
                challenge:
                    'True or False: This pun plays with the word "flies"',
                answer: 'True',
                difficulty: 'medium',
                type: 'pun'
            },
            {
                id: 'pun-3',
                category: 'Bad Pun 😅',
                content:
                    "I'm reading a book about anti-gravity. It's impossible to put down!",
                challengeType: 'fill-blank',
                challenge:
                    "I'm reading a book about anti-gravity. It's impossible to put _____!",
                answer: 'down',
                difficulty: 'easy',
                type: 'pun'
            },
            {
                id: 'pun-4',
                category: 'Bad Pun 😅',
                content:
                    "Why don't scientists trust atoms? Because they make up everything!",
                challengeType: 'multiple-choice',
                challenge: "Why don't scientists trust atoms?",
                options: [
                    "They're too small",
                    'They make up everything',
                    "They're unstable",
                    "They're negative"
                ],
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
                content:
                    "Knock knock. Who's there? Lettuce. Lettuce who? Lettuce in, it's cold out here!",
                challengeType: 'fill-blank',
                challenge:
                    "Knock knock. Who's there? Lettuce. Lettuce who? Lettuce _____, it's cold out here!",
                answer: 'in',
                difficulty: 'easy',
                type: 'joke'
            },
            {
                id: 'knock-2',
                category: 'Knock Knock 🚪',
                content:
                    "Knock knock. Who's there? Boo. Boo who? Don't cry, it's just a joke!",
                challengeType: 'multiple-choice',
                challenge: 'Complete the joke: "Boo who?"',
                options: [
                    "Don't cry, it's just a joke!",
                    'Boo to you too!',
                    "I'm a ghost!",
                    'Halloween is here!'
                ],
                answer: "Don't cry, it's just a joke!",
                difficulty: 'easy',
                type: 'joke'
            },
            // Science Facts
            {
                id: 'science-1',
                category: 'Science Fact',
                content:
                    "Jupiter is the largest planet in our solar system. It's so big that all other planets could fit inside it!",
                challengeType: 'fill-blank',
                challenge: '_____ is the largest planet in our solar system.',
                answer: 'Jupiter',
                difficulty: 'easy',
                type: 'factoid'
            },
            {
                id: 'science-2',
                category: 'Science Fact',
                content:
                    'Octopuses have three hearts and blue blood! Two hearts pump blood to the gills, one to the body.',
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
                content:
                    'World War II ended in 1945 when Japan formally surrendered on September 2nd.',
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
                content:
                    "Bananas are berries, but strawberries aren't! Botanically speaking, berries must have seeds inside their flesh.",
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
            bad_puns: 'pun',
            famous_quotes: 'quote',
            knock_knock: 'joke',
            trivia_mix: ['factoid', 'trivia', 'phrase']
        };

        const targetTypes = categoryMap[category];
        if (!targetTypes) {
            console.warn('Unknown category:', category);
            // Shuffle and return subset of all cards
            return allCards.sort(() => Math.random() - 0.5).slice(0, 10);
        }

        // Filter cards by type
        const filteredCards = allCards.filter((card) => {
            if (Array.isArray(targetTypes)) {
                return targetTypes.includes(card.type);
            }
            return card.type === targetTypes;
        });

        console.log(
            `Found ${filteredCards.length} cards for category ${category}:`,
            filteredCards.map((c) => `${c.id} (${c.type})`)
        );

        // Shuffle the filtered cards
        return filteredCards.sort(() => Math.random() - 0.5);
    }

    loadCard() {
        if (this.currentIndex >= this.cards.length) {
            this.showResults();
            return;
        }

        this.currentCard = this.cards[this.currentIndex]; //what does this do - set's currentCard to the current index number?
        this.isFlipped = false; // this declares that the current state of the flashcard is front side
        this.userAnswer = null; // this removes any old answer

        // Reset card flip state
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.remove('flipped');

        // Update progress
        document.getElementById('currentCard').textContent =
            this.currentIndex + 1;
        const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;

        // Update front of card
        // but did anyone see us actually summon the flipping of the card? what function does that?
        document.getElementById('cardCategory').textContent =
            this.currentCard.category; // so we start completing the front messaging - the title here.

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

        // Update streak display
        if (this.streak > 0) {
            const streakIndicator = document.getElementById('streakIndicator');
            streakIndicator.style.display = 'flex';
            document.getElementById('streakValue').textContent = this.streak;
        }

        // Reset UI elements
        document.getElementById('answerFeedback').style.display = 'none';
        document.getElementById('cardChallenge').style.display = 'block';
        document.getElementById('checkAnswerBtn').style.display = 'block';
        document.getElementById('skipBtn').style.display = 'block';
    }

    setupChallenge() {
        const questionEl = document.getElementById('challengeQuestion');
        const inputEl = document.getElementById('challengeInput');

        console.log('Setting up challenge for card:', this.currentCard);
        console.log('Challenge text:', this.currentCard.challenge);

        questionEl.textContent =
            this.currentCard.challenge || 'No challenge text';

        switch (this.currentCard.challengeType) {
            case 'fill-blank':
                inputEl.innerHTML = `
                    <input type="text" 
                           id="fillBlankInput" 
                           class="fill-blank-input" 
                           placeholder="Type your answer..."
                           autocomplete="off">
                `;
                break;

            case 'who-said-it':
                inputEl.innerHTML = `
                    <input type="text" 
                           id="authorInput" 
                           class="author-input" 
                           placeholder="Who said this?"
                           autocomplete="off">
                `;
                break;

            case 'multiple-choice':
                inputEl.innerHTML = `
                    <div class="multiple-choice-options">
                        ${this.currentCard.options
                            .map(
                                (option, index) => `
                            <button class="mc-option" data-option="${option}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `
                            )
                            .join('')}
                    </div>
                `;
                // Add click handlers to options
                setTimeout(() => {
                    inputEl.querySelectorAll('.mc-option').forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            // Remove previous selection
                            inputEl
                                .querySelectorAll('.mc-option')
                                .forEach((b) => b.classList.remove('selected'));
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
                    inputEl.querySelectorAll('.tf-option').forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            inputEl
                                .querySelectorAll('.tf-option')
                                .forEach((b) => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            this.userAnswer = btn.dataset.answer;
                        });
                    });
                }, 0);
                break;

            case 'word-order':
                const scrambled = [...this.currentCard.scrambled];
                inputEl.innerHTML = `
                    <div class="word-order-container">
                        <div class="word-bank" id="wordBank">
                            ${scrambled
                                .map(
                                    (word) => `
                                <span class="word-chip" data-word="${word}">${word}</span>
                            `
                                )
                                .join('')}
                        </div>
                        <div class="word-answer" id="wordAnswer">
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
        const wordBank = document.getElementById('wordBank');
        const wordAnswer = document.getElementById('wordAnswer');
        const selectedWords = [];

        // Click to add words
        wordBank.addEventListener('click', (e) => {
            if (
                e.target.classList.contains('word-chip') &&
                !e.target.classList.contains('selected')
            ) {
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
                        wordAnswer.innerHTML =
                            '<div class="answer-placeholder">Click words to build the sentence...</div>';
                    }
                });
                wordAnswer.appendChild(chip);
            }
        });

        // Store selected words for checking
        this.getSelectedWords = () => selectedWords.join(' ');
    }

    flipCard() {
        if (this.isFlipped) return;

        const flashcard = document.getElementById('flashcard');
        console.log('Flipping card. Current card:', this.currentCard);
        console.log('Card challenge:', this.currentCard.challenge);
        console.log('Card challenge type:', this.currentCard.challengeType);

        // Check if back content exists
        const backEl = flashcard.querySelector('.flashcard-back');
        const challengeEl = document.getElementById('cardChallenge');
        console.log('Back element exists:', !!backEl);
        console.log('Challenge element exists:', !!challengeEl);
        console.log('Challenge content:', challengeEl?.innerHTML);

        flashcard.classList.add('flipped');
        this.isFlipped = true;

        // Hide skip button when card is flipped
        document.getElementById('skipBtn').style.display = 'none';

        // Focus input if present
        setTimeout(() => {
            const input = document.querySelector(
                '.fill-blank-input, .author-input'
            );
            if (input) input.focus();
        }, 600);
    }

    checkAnswer() {
        console.log('checkAnswer called');
        let userAnswer = '';
        let isCorrect = false;

        switch (this.currentCard.challengeType) {
            case 'fill-blank':
                const input = document.getElementById('fillBlankInput');
                if (!input) {
                    console.error('Fill blank input not found');
                    return;
                }
                userAnswer = input.value.trim();
                console.log(
                    'User answer:',
                    userAnswer,
                    'Expected:',
                    this.currentCard.answer
                );

                // More forgiving comparison
                const normalizedUser = userAnswer
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                const normalizedAnswer = this.currentCard.answer
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                isCorrect = normalizedUser === normalizedAnswer;
                break;

            case 'who-said-it':
                userAnswer = document
                    .getElementById('authorInput')
                    .value.trim();
                isCorrect =
                    userAnswer.toLowerCase() ===
                    this.currentCard.answer.toLowerCase();
                break;

            case 'multiple-choice':
                isCorrect = this.userAnswer === this.currentCard.answer;
                break;

            case 'true-false':
                isCorrect = this.userAnswer === this.currentCard.answer;
                break;

            case 'word-order':
                userAnswer = this.getSelectedWords();
                isCorrect = userAnswer === this.currentCard.answer;
                break;
        }

        this.handleAnswer(isCorrect);
    }

    handleAnswer(isCorrect) {
        if (isCorrect) {
            this.score++;
            this.streak++;
            this.showFeedback('correct');

            // Award hearts/diamonds based on streak
            this.awardRewards();
        } else {
            this.streak = 0;
            this.showFeedback('incorrect');
        }

        // Hide challenge, show feedback
        document.getElementById('cardChallenge').style.display = 'none';
        document.getElementById('checkAnswerBtn').style.display = 'none';

        // Show feedback and continue button
        const feedbackEl = document.getElementById('answerFeedback');
        feedbackEl.style.display = 'block';
    }

    showFeedback(type) {
        // Show bot overlay like in quiz
        const overlay = document.createElement('div');
        overlay.className = 'answer-overlay';

        if (type === 'correct') {
            overlay.innerHTML = `
                <img src="../src/images/bot-yes.svg" alt="Correct!" class="feedback-bot">
                <div class="feedback-message">
                    <h3>Correct!</h3>
                    ${
                        this.streak >= 5
                            ? `<p>🔥 ${this.streak} in a row!</p>`
                            : ''
                    }
                </div>
            `;
            overlay.classList.add('correct');
        } else {
            overlay.innerHTML = `
                <img src="../src/images/bot-no.svg" alt="Wrong" class="feedback-bot">
                <div class="feedback-message">
                    <h3>Not quite!</h3>
                    <p>The answer was: ${this.currentCard.answer}</p>
                </div>
            `;
            overlay.classList.add('incorrect');
        }

        // Add overlay to flashcard
        const flashcard = document.getElementById('flashcard');
        flashcard.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });

        // Update answer feedback area
        const feedbackContent = document.getElementById('feedbackContent');
        feedbackContent.style.display = 'none';

        // Show reward popup with score bar
        this.showReward(type);

        // Show score message bar like in quiz
        this.showScoreMessage(type);

        // Auto-advance to next card after showing feedback
        setTimeout(() => {
            if (type === 'correct') {
                // Auto-advance on correct answers
                this.nextCard();
            } else {
                // Show continue button for incorrect answers
                const answerFeedback =
                    document.getElementById('answerFeedback');
                answerFeedback.style.display = 'block';
                feedbackContent.style.display = 'none';
            }
        }, 2500); // Give time to see feedback and reward
    }

    awardRewards() {
        // Randomly choose one reward type
        let heartsAwarded = 0;
        let diamondsAwarded = 0;
        let xpAwarded = 0;

        // XP most common (60%), gems more common (30%), hearts rare (10%)
        const rand = Math.random();
        if (rand < 0.6) {
            // Award XP (most common)
            xpAwarded = 25;
            if (this.streak >= 5) xpAwarded = 50;
        } else if (rand < 0.9) {
            // Award diamonds (more common)
            diamondsAwarded = 1;
            if (this.streak >= 10) diamondsAwarded = 2;
        } else {
            // Award hearts (rare) - overflow handled by scoring engine
            heartsAwarded = 1;
            if (this.streak >= 5) heartsAwarded = 2;
        }

        // Apply rewards with overflow protection
        const actualRewards = ScoringEngine.applyReward(
            heartsAwarded,
            diamondsAwarded,
            xpAwarded
        );

        // Store for display
        this.lastReward = actualRewards;

        // Dispatch event to update UI
        window.dispatchEvent(
            new CustomEvent('statsUpdated', {
                detail: actualRewards
            })
        );
    }

    awardCompletionBonus() {
        const stackSize = this.cards.length;
        const percentage = Math.round((this.score / this.cards.length) * 100);
        let bonusHearts = 0;
        let bonusDiamonds = 0;
        let bonusXP = 0;

        // Guaranteed heart for completing a stack of 10+
        if (stackSize >= 10) {
            bonusHearts = 1;
        }

        // Chance for bonus heart based on performance
        if (percentage >= 80 && Math.random() < 0.3) {
            bonusHearts += 1;
        }

        // Small XP bonus for completion
        bonusXP = stackSize * 5;

        if (bonusHearts > 0 || bonusXP > 0) {
            // Apply rewards with overflow protection
            const actualRewards = ScoringEngine.applyReward(
                bonusHearts,
                bonusDiamonds,
                bonusXP
            );

            // Create message based on what was actually awarded
            let message = '';
            if (actualRewards.hearts > 0)
                message += `+${actualRewards.hearts} ❤️ `;
            if (actualRewards.diamonds > 0)
                message += `+${actualRewards.diamonds} 💎 `;
            if (actualRewards.xp > 0) message += `+${actualRewards.xp} XP `;
            message += 'Completion Bonus!';

            // Show completion bonus popup
            this.showCompletionBonus(
                actualRewards.hearts,
                actualRewards.diamonds,
                message
            );

            // Dispatch event to update UI
            window.dispatchEvent(
                new CustomEvent('statsUpdated', {
                    detail: actualRewards
                })
            );
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
                    <span class="score-item">Score: ${this.score}/${
                this.cards.length
            }</span>
                    ${
                        this.streak > 1
                            ? `<span class="score-item streak">🔥 Streak: ${this.streak}</span>`
                            : ''
                    }
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

        this.currentIndex++;
        document.getElementById('skipBtn').style.display = 'block';
        this.loadCard();
    }

    showResults() {
        const flashcardContainer =
            document.getElementById('flashcardContainer');
        const percentage = Math.round((this.score / this.cards.length) * 100);

        // Award completion bonus hearts
        this.awardCompletionBonus();

        flashcardContainer.innerHTML = `
            <div class="results-screen">
                <h2>Great Practice!</h2>
                <div class="results-stats">
                    <div class="result-stat">
                        <span class="stat-value">${this.score}/${
            this.cards.length
        }</span>
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
            return '🎉 Excellent work! Keep it up!';
        } else if (percentage >= 60) {
            return '👍 Good job! Practice makes perfect!';
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

        // Reattach card event listeners
        const flashcard = document.getElementById('flashcard');
        flashcard.addEventListener('click', () => this.flipCard());

        this.modal.querySelectorAll('.answer-btn').forEach((btn) => {
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

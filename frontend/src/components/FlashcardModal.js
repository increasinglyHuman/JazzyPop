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
        this.sessionStartTime = null; // Track session start for reward calculations
        this.rewardsDisplay = null; // Reusable rewards display component
        
        // Multi-page support for knock-knock jokes and puns
        this.currentPage = 0;
        this.isMultiPage = false;
        this.pageCount = 1;
        this.jokeRatings = []; // Store ratings for jokes
        this.giggleMeter = null;
        
        // Quote challenge tracking
        this.quoteStreak = 0;
        this.quoteChallengeResults = [];
        
        this.init();
    }

    init() {
        this.createModal();
        this.attachEventListeners();
        
        // Initialize rewards display component
        if (window.RewardsDisplay) {
            this.rewardsDisplay = new window.RewardsDisplay();
        }
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
                
                <!-- Cumulative streak bar for quotes -->
                <div class="quote-streak-bar" id="quoteStreakBar" style="display: none;">
                    <div class="streak-flames">
                        <span class="flame-icon">🔥</span>
                    </div>
                    <div class="streak-progress">
                        <div class="streak-fill" id="streakFill"></div>
                    </div>
                    <span class="streak-count" id="streakCount">0 / 10</span>
                </div>

                <div class="flashcard-container" id="flashcardContainer">
                    <div class="flashcard" id="flashcard">
                        <div class="flashcard-front">
                            <div class="card-category" id="cardCategory">Trivia</div>
                            <div class="card-content" id="cardContent">Loading...</div>
                            <button class="flip-icon-button" aria-label="Flip card">
                                <img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Flip" class="flip-icon">
                            </button>
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
                    
                    <!-- Multi-page content for jokes -->
                    <div class="joke-page-container" id="jokePageContainer" style="display: none;">
                        <div class="joke-bot-container">
                            <img class="joke-bot-image" id="jokeBotImage" src="" alt="Comedy Bot">
                        </div>
                        <div class="joke-content" id="jokeContent">
                            <div class="joke-text" id="jokeText"></div>
                        </div>
                        <div class="joke-nav">
                            <button class="joke-nav-btn" id="jokeNextBtn">
                                <span class="nav-icon">▶</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Giggle meter container -->
                    <div class="giggle-meter-container" id="giggleMeterContainer" style="display: none;"></div>
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
            // Check if the click was on the flashcard front or flip button
            const flipButton = e.target.closest('.flip-icon-button');
            const flashcardFront = e.target.closest('.flashcard-front');
            const flashcard = e.target.closest('#flashcard');
            
            // For factoids (simple-flip), flip button on back should advance to next card
            if (flipButton && this.isFlipped && this.currentCard.challengeType === 'simple-flip') {
                console.log('Flip button clicked on factoid back');
                console.log('Current wonder rating:', this.currentCard.wonderRating);
                
                // For now, just advance to next card without requiring rating
                this.nextCard();
                return;
                
                /* TODO: Re-enable rating requirement later
                // Check if Wonder Meter has been rated
                if (this.currentCard.wonderRating !== undefined) {
                    this.nextCard();
                } else {
                    // Prompt to rate first
                    const wonderContainer = document.getElementById('wonderMeterInline');
                    if (wonderContainer) {
                        wonderContainer.style.animation = 'pulse 0.5s ease 2';
                        setTimeout(() => {
                            wonderContainer.style.animation = '';
                        }, 1000);
                    }
                }
                */
            }
            
            // Only flip if clicking the flip button or the card front (not back)
            if ((flipButton || flashcardFront) && flashcard && !this.isFlipped) {
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
        
        // Joke navigation button for multi-page content
        const jokeNextBtn = this.modal.querySelector('#jokeNextBtn');
        jokeNextBtn.addEventListener('click', () => this.nextJokePage());

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
        console.log('Opening flashcard modal with config:', config);
        
        // Record session start time
        this.sessionStartTime = Date.now();
        
        // Check if user has enough energy (1 per card)
        if (window.economyManager) {
            const economyState = window.economyManager.getDisplayState();
            console.log('Economy state:', economyState);
            const requiredEnergy = 1; // 1 energy per flashcard session
            
            if (economyState.energy < requiredEnergy) {
                console.log('Insufficient energy:', economyState.energy, '<', requiredEnergy);
                // Show insufficient energy message
                if (window.alertModal) {
                    window.alertModal.show({
                        type: 'warning',
                        title: 'Not Enough Energy',
                        message: `You need ${requiredEnergy} energy to practice flashcards. You have ${economyState.energy} energy.`,
                        primaryButton: 'OK'
                    });
                } else {
                    console.error('AlertModal not available to show energy warning');
                }
                return;
            }
            
            // Deduct energy cost
            console.log('Attempting to spend energy...');
            try {
                const energyResult = await window.economyManager.spendEnergy(requiredEnergy, 'flashcard_start');
                console.log('Energy spend result:', energyResult);
                if (!energyResult.success) {
                    console.error('Failed to deduct energy:', energyResult);
                    return;
                }
            } catch (error) {
                console.error('Error spending energy:', error);
                return;
            }
        }
        
        // Try to fetch dynamic cards first
        console.log('Fetching cards...');
        this.cards = await this.fetchCards(config);
        console.log('Cards from fetch:', this.cards);
        
        if (!this.cards || this.cards.length === 0) {
            console.log('No cards from API, generating dynamic content...');
            // Generate dynamic cards instead of using static data
            this.cards = await this.generateDynamicCards(config);
            console.log('Cards from generation:', this.cards);
        }

        if (!this.cards || this.cards.length === 0) {
            console.error('Could not generate flashcards');
            return;
        }

        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;
        this.currentPage = 0;
        this.jokeRatings = [];
        this.quoteStreak = 0;
        this.quoteChallengeResults = [];

        console.log('About to show modal...');
        // Show modal
        this.modal.classList.add('active');
        console.log('Modal should now be visible');
        console.log('Modal element:', this.modal);
        console.log('Modal classList:', this.modal.classList);
        console.log('Modal computed style display:', window.getComputedStyle(this.modal).display);
        console.log('Modal computed style visibility:', window.getComputedStyle(this.modal).visibility);
        console.log('Modal parent:', this.modal.parentElement);
        console.log('Modal z-index:', window.getComputedStyle(this.modal).zIndex);
        console.log('Modal position:', window.getComputedStyle(this.modal).position);
        console.log('Modal dimensions:', this.modal.offsetWidth, 'x', this.modal.offsetHeight);
        console.log('Modal opacity:', window.getComputedStyle(this.modal).opacity);
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
            // For trivia_mix, ensure we get 10 factoids
            const requestBody = {
                category: config.category || 'trivia_mix',
                count: config.count || 10,  // Default to 10 cards
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
            
            // Transform API response to match our expected format
            if (data.cards && Array.isArray(data.cards)) {
                return data.cards.map(card => {
                    // Handle joke formats from Haiku API
                    if (card.type === 'joke' && card.category === 'knock_knock') {
                        return {
                            id: card.id,
                            category: 'Knock Knock 🚪',
                            type: 'knock-knock',
                            content: card.content, // "Knock knock."
                            setupLine: card.whosThere, // "Dishes"
                            whosThereWho: card.whosThereWho, // "Dishes who?"
                            punchLine: card.punchline,
                            difficulty: card.difficulty || 'easy'
                        };
                    } else if (card.type === 'pun' || card.category === 'bad_puns') {
                        return {
                            id: card.id,
                            category: 'Punz 😅',
                            type: 'pun',
                            content: card.content, // Full setup question
                            setupLine: card.content, // Same as content for puns
                            setupQuery: card.setup_query,
                            punchLine: card.punchline,
                            hint: card.hint, // Could be useful for UI
                            theme: card.theme, // Could be useful for theming
                            difficulty: card.difficulty || 'easy'
                        };
                    } else if (card.type === 'quote' || card.category === 'famous_quotes') {
                        return {
                            id: card.id,
                            category: 'Famous Quote',
                            type: 'quote',
                            content: card.content,
                            author: card.author,
                            source: card.source,
                            challenge: card.challenge,
                            answer: card.answer,
                            challengeType: card.challengeType,
                            year: card.year,
                            theme: card.theme,
                            difficulty: card.difficulty || 'easy'
                        };
                    } else if (card.type === 'trivia' || card.challengeType === 'simple-flip') {
                        // Preserve theme for factoids
                        return {
                            ...card,
                            theme: card.theme || card.data?.theme
                        };
                    }
                    // Return other card types as-is
                    return card;
                });
            }
            
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
        // Sample puns by theme - in production these would come from Haiku API
        const puns = {
            animals: [
                { setup: "Why don't oysters share?", punch: "Because they're shellfish!" },
                { setup: "What do you call a bear with no teeth?", punch: "A gummy bear!" },
                { setup: "Why don't eggs tell jokes?", punch: "They'd crack up!" }
            ],
            food: [
                { setup: "Why did the cookie go to the doctor?", punch: "Because it felt crumbly!" },
                { setup: "What do you call cheese that isn't yours?", punch: "Nacho cheese!" },
                { setup: "Why did the tomato turn red?", punch: "Because it saw the salad dressing!" }
            ],
            technology: [
                { setup: "Why do programmers prefer dark mode?", punch: "Because light attracts bugs!" },
                { setup: "Why was the computer cold?", punch: "It left its Windows open!" },
                { setup: "What's a computer's favorite snack?", punch: "Microchips!" }
            ],
            default: [
                { setup: "I used to hate facial hair...", punch: "But then it grew on me!" },
                { setup: "I'm reading a book about anti-gravity...", punch: "It's impossible to put down!" },
                { setup: "Time flies like an arrow...", punch: "Fruit flies like a banana!" }
            ]
        };
        
        const themePuns = puns[theme] || puns.default;
        const pun = themePuns[index % themePuns.length];
        
        return {
            id: `pun-dynamic-${index}`,
            category: 'Bad Pun 😅',
            type: 'pun',
            setupLine: pun.setup,
            setupQuery: pun.setup.includes('?') ? pun.setup.split('?')[0] + '?' : 'why?',
            punchLine: pun.punch,
            difficulty: 'easy'
        };
    }
    
    createKnockKnockCard(index) {
        // Sample knock-knock jokes - in production these would come from Haiku API
        const jokes = [
            { setup: 'Lettuce', punch: "Lettuce in, it's cold out here!" },
            { setup: 'Orange', punch: "Orange you glad I didn't say banana?" },
            { setup: 'Boo', punch: "Don't cry, it's just a joke!" },
            { setup: 'Cash', punch: "No thanks, I prefer peanuts!" },
            { setup: 'Olive', punch: "Olive you and I miss you!" },
            { setup: 'Tank', punch: "You're welcome!" },
            { setup: 'Donut', punch: "Donut forget to smile today!" },
            { setup: 'Who', punch: "Who's there? Wait, that's my line!" },
            { setup: 'Howard', punch: "Howard you like to hear another joke?" },
            { setup: 'Dewey', punch: "Dewey have to use a knock-knock joke?" }
        ];
        
        const joke = jokes[index % jokes.length];
        
        return {
            id: `knock-dynamic-${index}`,
            category: 'Knock Knock 🚪',
            type: 'knock-knock',
            setupLine: joke.setup,
            punchLine: joke.punch,
            difficulty: 'easy'
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
        // This method is no longer used - we use getCardsByCategory instead
        return this.getCardsByCategory('trivia_mix');
    }
    
    getDefaultCards_OLD() {
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
            // Fun Facts - Simple flip format
            {
                id: 'fact-1',
                category: 'Amazing Fact 🌟',
                content: 'A group of flamingos is called a "flamboyance".',
                challengeType: 'simple-flip',
                challenge: 'Even cooler:',
                answer: 'Flamingos are pink because of their diet! Baby flamingos are born gray. A flock can have thousands of birds, and they stand on one leg to conserve body heat.',
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
            // Punz
            {
                id: 'pun-1',
                category: 'Punz 😅',
                type: 'pun',
                setupLine: 'I used to hate facial hair...',
                punchLine: 'But then it grew on me!',
                difficulty: 'easy'
            },
            {
                id: 'pun-2',
                category: 'Punz 😅',
                type: 'pun',
                setupLine: 'Time flies like an arrow...',
                punchLine: 'Fruit flies like a banana!',
                difficulty: 'medium'
            },
            {
                id: 'pun-3',
                category: 'Punz 😅',
                type: 'pun',
                setupLine: "I'm reading a book about anti-gravity...",
                punchLine: "It's impossible to put down!",
                difficulty: 'easy'
            },
            {
                id: 'pun-4',
                category: 'Punz 😅',
                type: 'pun',
                setupLine: "Why don't scientists trust atoms?",
                setupQuery: "Why don't scientists trust atoms?",
                punchLine: 'Because they make up everything!',
                difficulty: 'easy'
            },
            {
                id: 'pun-5',
                category: 'Punz 😅',
                type: 'pun',
                setupLine: 'I used to be a banker...',
                punchLine: 'But I lost interest!',
                difficulty: 'medium'
            },
            // Knock Knock Jokes
            {
                id: 'knock-1',
                category: 'Knock Knock 🚪',
                type: 'knock-knock',
                setupLine: 'Lettuce',
                punchLine: "Lettuce in, it's cold out here!",
                difficulty: 'easy'
            },
            {
                id: 'knock-2',
                category: 'Knock Knock 🚪',
                type: 'knock-knock',
                setupLine: 'Boo',
                punchLine: "Don't cry, it's just a joke!",
                difficulty: 'easy'
            },
            // Science Facts - Simple flip format
            {
                id: 'science-1',
                category: 'Amazing Fact 🌟',
                content: 'Jupiter is the largest planet in our solar system.',
                challengeType: 'simple-flip',
                challenge: 'Mind-blowing detail:',
                answer: 'It\'s so massive that all other planets could fit inside it with room to spare! It also has 79 known moons and a storm (the Great Red Spot) that\'s been raging for over 350 years.',
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
            // Fun Facts - Simple flip format
            {
                id: 'fact-1',
                category: 'Amazing Fact 🌟',
                content: 'A group of flamingos is called a "flamboyance".',
                challengeType: 'simple-flip',
                challenge: 'Even cooler:',
                answer: 'Flamingos are pink because of their diet! Baby flamingos are born gray. A flock can have thousands of birds, and they stand on one leg to conserve body heat.',
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
            'knock_knock': 'knock-knock',
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
        
        // DEBUG: Log the current card structure
        console.log('Current card structure:', this.currentCard);
        console.log('Card type:', this.currentCard.type);
        console.log('Challenge type:', this.currentCard.challengeType);
        console.log('Content:', this.currentCard.content);
        console.log('Answer/Detail:', this.currentCard.answer || this.currentCard.detail);
        
        // Check if this is a joke card
        this.isMultiPage = (this.currentCard.type === 'knock-knock' || this.currentCard.type === 'pun');
        this.currentPage = 0;

        // Only reset flip state if we're not in a transition
        if (!this.isTransitioning) {
            this.isFlipped = false;
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.remove('flipped');
        }
        
        // Show/hide quote streak bar and regular streak indicator
        const quoteStreakBar = document.getElementById('quoteStreakBar');
        const regularStreakIndicator = document.getElementById('streakIndicator');
        const flashcardScore = this.modal.querySelector('.flashcard-score');
        const isQuoteSession = this.currentCard && this.currentCard.type === 'quote';
        
        // Debug logging
        console.log('Current card type:', this.currentCard?.type);
        console.log('Is quote session:', isQuoteSession);
        
        if (isQuoteSession) {
            quoteStreakBar.style.display = 'flex';
            regularStreakIndicator.style.display = 'none'; // Hide regular streak for quotes
            if (flashcardScore) {
                // Force hide the entire score section with important
                flashcardScore.style.cssText = 'display: none !important;';
            }
            this.updateQuoteStreak();
        } else {
            quoteStreakBar.style.display = 'none';
            if (flashcardScore) {
                // Remove the forced hiding
                flashcardScore.style.cssText = '';
                flashcardScore.style.display = 'flex';
            }
            // Update score display for non-quote cards
            const scoreValueEl = document.getElementById('scoreValue');
            if (scoreValueEl) {
                scoreValueEl.textContent = this.score || 0;
            }
            // Show regular streak for other card types if there's a streak
            if (this.streak > 0) {
                regularStreakIndicator.style.display = 'flex';
                document.getElementById('streakValue').textContent = this.streak;
            }
        }
        
        // If it's a multi-page joke, load differently
        if (this.isMultiPage) {
            this.loadJokePage();
            return;
        }
        
        // Apply special class for word-order challenges
        if (this.currentCard.challengeType === 'word-order') {
            flashcard.classList.add('word-order-mode');
        } else {
            flashcard.classList.remove('word-order-mode');
        }
        
        // Add data attribute for simple-flip cards
        if (this.currentCard.challengeType === 'simple-flip') {
            flashcard.setAttribute('data-challenge-type', 'simple-flip');
            flashcard.classList.add('simple-flip');
        } else {
            flashcard.removeAttribute('data-challenge-type');
            flashcard.classList.remove('simple-flip');
        }

        // Update progress
        document.getElementById('currentCard').textContent = this.currentIndex + 1;
        const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        console.log(`Progress: Card ${this.currentIndex + 1} of ${this.cards.length} = ${progress}%`);

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
        // Transform category display for factoids
        let displayCategory = this.currentCard.category;
        let categoryIcon = null;
        
        if (this.currentCard.type === 'factoid' || this.currentCard.challengeType === 'simple-flip') {
            // Extract theme from card data
            const theme = this.currentCard.theme || this.currentCard.data?.theme;
            if (theme) {
                // Map theme to icon filename
                const iconMap = {
                    'science': 'science.svg',
                    'history': 'history.svg',
                    'geography': 'geography.svg',
                    'pop_culture': 'pop_culture.svg',
                    'technology': 'technology.svg',
                    'nature': 'nature.svg',
                    'sports': 'sports.svg',
                    'literature': 'literature.svg',
                    'music': 'music.svg',
                    'food_cuisine': 'food_cuisine.svg',
                    'film': 'film.svg',
                    'gaming': 'gaming.svg',
                    'art': 'art.svg',
                    'mythology': 'mythology.svg',
                    'space': 'space.svg',
                    'animals': 'animals.svg',
                    'inventions': 'inventions.svg',
                    'internet_culture': 'internet_culture.svg',
                    'fashion_design': 'fashion_design.svg',
                    'ancient_architecture': 'ancient_architecture.svg',
                    'archaeology': 'archaology.svg',
                    'dinosaurs': 'dinosaurs.png',
                    'wicca': 'wicca.svg',
                    'famous_lies': 'famous_lies.svg',
                    'scandal_mischief': 'scandal_mischief.svg',
                    'fame_glory': 'fame_glory.svg',
                    'horror_films': 'horrorz_films.svg',
                    'language_evolution': 'language_evolution.svg',
                    'jokes': 'jokes.svg'
                };
                
                if (iconMap[theme]) {
                    categoryIcon = `./src/images/categories/${iconMap[theme]}`;
                    displayCategory = theme.replace(/_/g, ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                }
            } else {
                displayCategory = 'Factoid 🤯';
            }
        }
        
        // Update category display
        categoryEl.textContent = displayCategory;
        
        // Display content with hero icon for factoids
        const contentEl = document.getElementById('cardContent');
        if (categoryIcon && (this.currentCard.type === 'factoid' || this.currentCard.challengeType === 'simple-flip')) {
            // Move category below hero image
            categoryEl.style.order = '2';
            contentEl.style.order = '1';
            contentEl.innerHTML = `
                <div class="factoid-hero-display">
                    <img src="${categoryIcon}" class="category-hero-icon" alt="${displayCategory}">
                    <div class="card-category">${displayCategory}</div>
                    <div class="factoid-text">${this.currentCard.content}</div>
                </div>
            `;
            // Hide the original category element since we're including it in the content
            categoryEl.style.display = 'none';
        } else if (this.currentCard.type === 'quote' && this.currentCard.author) {
            contentEl.innerHTML = `
                <div class="quote-display">
                    <div class="quote-text">${this.currentCard.content}</div>
                    <div class="quote-author">— ${this.currentCard.author}</div>
                </div>
            `;
        } else {
            // Restore normal layout for non-factoid cards
            categoryEl.style.order = '';
            contentEl.style.order = '';
            categoryEl.style.display = '';
            contentEl.innerHTML = `<div class="content-display">${this.currentCard.content}</div>`;
        }

        // Prepare the back of card based on challenge type
        this.setupChallenge();

        // Assign dynamic IDs to elements AFTER setupChallenge creates them
        this.assignDynamicIds();

        // Streak display is now handled in the Show/hide quote streak bar section above

        // CRITICAL: Reset UI elements - ensure challenge is visible
        const feedbackEl = this.getElement('feedback');
        if (feedbackEl) feedbackEl.style.display = 'none';
        
        const challengeEl = this.getElement('challenge');
        const checkBtn = this.getElement('checkBtn');
        
        // Force challenge and button visible - but not for simple-flip cards
        if (this.currentCard.challengeType !== 'simple-flip') {
            if (challengeEl) {
                challengeEl.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; position: relative !important; z-index: 10000 !important;';
                // console.log('Force showing challenge on load for:', this.getUniqueId('challenge'));
            }
            if (checkBtn) {
                checkBtn.style.cssText = 'display: block !important; opacity: 1 !important; visibility: visible !important; margin: 20px auto; position: relative !important; z-index: 10000 !important;';
                // console.log('Force showing check button on load for:', this.getUniqueId('checkBtn'));
            }
        } else {
            // For simple-flip, ensure the challenge container is visible but without aggressive styling
            if (challengeEl) {
                challengeEl.style.display = 'block';
                challengeEl.style.opacity = '1';
                challengeEl.style.visibility = 'visible';
            }
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
                input.value = ''; // Ensure value is empty
                
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
                
                // Add Enter key listener for quick submit
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.checkAnswer();
                    }
                });
                
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
                
                // Add Enter key listener for quick submit
                authorInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.checkAnswer();
                    }
                });
                
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
                
            case 'simple-flip':
                // For factoids - show the detail with hero image on back too
                const theme = this.currentCard.theme || this.currentCard.data?.theme;
                let backIcon = null;
                
                if (theme) {
                    const iconMap = {
                        'science': 'science.svg',
                        'history': 'history.svg',
                        'geography': 'geography.svg',
                        'pop_culture': 'pop_culture.svg',
                        'technology': 'technology.svg',
                        'nature': 'nature.svg',
                        'sports': 'sports.svg',
                        'literature': 'literature.svg',
                        'music': 'music.svg',
                        'food_cuisine': 'food_cuisine.svg',
                        'film': 'film.svg',
                        'gaming': 'gaming.svg',
                        'art': 'art.svg',
                        'mythology': 'mythology.svg',
                        'space': 'space.svg',
                        'animals': 'animals.svg',
                        'inventions': 'inventions.svg',
                        'internet_culture': 'internet_culture.svg',
                        'fashion_design': 'fashion_design.svg',
                        'ancient_architecture': 'ancient_architecture.svg',
                        'archaeology': 'archaology.svg',
                        'dinosaurs': 'dinosaurs.png',
                        'wicca': 'wicca.svg',
                        'famous_lies': 'famous_lies.svg',
                        'scandal_mischief': 'scandal_mischief.svg',
                        'fame_glory': 'fame_glory.svg',
                        'horror_films': 'horrorz_films.svg',
                        'language_evolution': 'language_evolution.svg',
                        'jokes': 'jokes.svg'
                    };
                    
                    if (iconMap[theme]) {
                        backIcon = `./src/images/categories/${iconMap[theme]}`;
                    }
                }
                
                // For factoids, clear the challenge area entirely
                inputEl.innerHTML = '';
                questionEl.innerHTML = '';
                
                // Hide all challenge-related UI
                const challengeContainer = this.modal.querySelector('.flashcard-challenge-container');
                if (challengeContainer) {
                    challengeContainer.style.display = 'none';
                }
                
                // Hide the check answer button for simple flip cards
                const checkBtn = this.modal.querySelector('.flashcard-check-answer-btn');
                if (checkBtn) {
                    checkBtn.style.display = 'none';
                }
                
                // Hide feedback and continue elements
                const feedbackEl = this.modal.querySelector('.flashcard-answer-feedback');
                const continueBtn = this.modal.querySelector('.flashcard-continue-btn');
                if (feedbackEl) feedbackEl.style.display = 'none';
                if (continueBtn) continueBtn.style.display = 'none';
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
            
            // For simple-flip cards, replace the entire back content
            if (this.currentCard.challengeType === 'simple-flip') {
                // Small delay to ensure flip has started
                setTimeout(() => {
                    console.log('Replacing back content for simple-flip card');
                    const theme = this.currentCard.theme || this.currentCard.data?.theme || 'science';
                const iconMap = {
                    'science': 'science.svg',
                    'history': 'history.svg',
                    'geography': 'geography.svg',
                    'pop_culture': 'pop_culture.svg',
                    'technology': 'technology.svg',
                    'nature': 'nature.svg',
                    'sports': 'sports.svg',
                    'literature': 'literature.svg',
                    'music': 'music.svg',
                    'food_cuisine': 'food_cuisine.svg',
                    'film': 'film.svg',
                    'gaming': 'gaming.svg',
                    'art': 'art.svg',
                    'mythology': 'mythology.svg',
                    'space': 'space.svg',
                    'animals': 'animals.svg',
                    'inventions': 'inventions.svg',
                    'internet_culture': 'internet_culture.svg',
                    'fashion_design': 'fashion_design.svg',
                    'ancient_architecture': 'ancient_architecture.svg',
                    'archaeology': 'archaology.svg',
                    'dinosaurs': 'dinosaurs.png',
                    'wicca': 'wicca.svg',
                    'famous_lies': 'famous_lies.svg',
                    'scandal_mischief': 'scandal_mischief.svg',
                    'fame_glory': 'fame_glory.svg',
                    'horror_films': 'horrorz_films.svg',
                    'language_evolution': 'language_evolution.svg',
                    'jokes': 'jokes.svg'
                };
                
                const iconFile = iconMap[theme] || 'science.svg';
                
                backEl.innerHTML = `
                    <div class="factoid-back-wrapper">
                        <div class="factoid-back-display">
                            <img src="./src/images/categories/${iconFile}" class="category-hero-icon-back" alt="${theme}">
                            <div class="factoid-detail-label">Mind-Blowing Detail</div>
                            <div class="factoid-twist">
                                ${this.currentCard.answer || this.currentCard.detail || 'No additional detail available'}
                            </div>
                        </div>
                        <div class="wonder-meter-container" id="wonderMeterInline"></div>
                    </div>
                    <button class="flip-icon-button" aria-label="Next card">
                        <img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Next" class="flip-icon">
                    </button>
                `;
                
                // Show Wonder Meter after a longer delay to ensure DOM is ready
                setTimeout(() => {
                    console.log('About to show Wonder Meter...');
                    const container = document.getElementById('wonderMeterInline');
                    console.log('Container check before calling showWonderMeterInline:', !!container);
                    this.showWonderMeterInline();
                }, 800);
                }, 100); // Close the setTimeout for replacing content
            }
        }

        // STEP 5: Hide skip button when card is flipped (can't skip challenges)
        const skipBtn = document.getElementById('skipBtn');
        if (skipBtn) {
            skipBtn.style.display = 'none';
        }
        
        // STEP 6: CRITICAL BUG FIX - Force challenge to stay visible
        // Something is hiding the challenge div after flip - but not for simple-flip
        if (this.currentCard.challengeType !== 'simple-flip') {
            const challengeDiv = this.getElement('challenge');
            if (challengeDiv) {
                // Use setAttribute to make it harder to override
                challengeDiv.setAttribute('style', 'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1000 !important;');
                // console.log('Forcing challenge visible after flip:', this.getUniqueId('challenge'));
            }
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
                
            case 'simple-flip':
                // Simple flip cards are always "correct" - they're just informational
                isCorrect = true;
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
            
            // Track quote streak separately
            if (this.currentCard.type === 'quote') {
                this.quoteStreak++;
                this.quoteChallengeResults.push({
                    cardId: this.currentCard.id,
                    correct: true,
                    challengeType: this.currentCard.challengeType
                });
                this.updateQuoteStreak();
            }
            
            this.showFeedback('correct');
            
            // Award hearts/diamonds based on streak
            this.awardRewards();
        } else {
            // INCORRECT ANSWER PATH
            this.streak = 0;
            
            // Reset quote streak on miss
            if (this.currentCard.type === 'quote') {
                this.quoteStreak = 0;
                this.quoteChallengeResults.push({
                    cardId: this.currentCard.id,
                    correct: false,
                    challengeType: this.currentCard.challengeType
                });
                this.updateQuoteStreak();
            }
            
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

    showWonderMeterInline() {
        console.log('showWonderMeterInline called');
        
        // Create Wonder Meter instance
        if (!this.wonderMeter) {
            console.log('Creating new WonderMeter instance');
            this.wonderMeter = new WonderMeter();
        }
        
        // Create and show the meter inline - use the correct container ID
        const container = document.getElementById('wonderMeterInline');
        console.log('Wonder Meter container found:', !!container);
        
        if (container) {
            // Clear any existing content
            container.innerHTML = '';
            
            const meterElement = this.wonderMeter.create((rating) => {
                // Store the rating
                this.currentCard.wonderRating = rating;
                console.log('Wonder rating:', rating);
                
                // Enable flip button to advance
                // Don't remove meter - let user see their rating
                
                // Optional: Show a quick "Rated!" feedback
                const feedback = document.createElement('div');
                feedback.className = 'rating-feedback';
                feedback.textContent = '✓ Rated!';
                feedback.style.cssText = 'color: #58cc02; font-weight: bold; margin-top: 10px; animation: fadeIn 0.3s ease;';
                container.appendChild(feedback);
            });
            
            console.log('Meter element created:', !!meterElement);
            
            // Add to the container
            container.appendChild(meterElement);
            
            // Force visibility
            container.style.display = 'flex';
            container.style.opacity = '1';
            container.style.visibility = 'visible';
        } else {
            console.warn('Wonder Meter container not found');
        }
    }
    
    async awardRewards() {
        // Use EconomyManager to handle flashcard completion
        if (window.economyManager) {
            const flashcardResult = {
                correct: true,
                streak: this.streak,
                cardType: this.currentCard?.type || 'flashcard',
                category: this.currentCard?.category || 'general',
                wonderRating: this.currentCard?.wonderRating // Include wonder rating for factoids
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
        const isFactoidSession = this.cards.some(card => card.challengeType === 'simple-flip');
        
        // For factoids, always award completion bonus
        if (window.economyManager) {
            // Let the backend calculate the completion bonus
            const completionData = {
                cardsCompleted: stackSize,
                correctAnswers: isFactoidSession ? stackSize : this.score, // Factoids count as all correct
                percentage: isFactoidSession ? 100 : Math.round((this.score / this.cards.length) * 100),
                finalStreak: this.streak,
                cardType: isFactoidSession ? 'factoid' : 'quiz'
            };
            
            // Process completion bonus through EconomyManager
            const result = await window.economyManager.processFlashcardComplete({
                category: this.cards[0]?.theme || 'general',
                cardType: isFactoidSession ? 'factoid' : 'flashcard',
                correctCount: isFactoidSession ? stackSize : this.score,
                totalCards: stackSize,
                practiceTime: Date.now() - (this.sessionStartTime || Date.now())
            });
            
            if (result.rewards) {
                // Show rewards using the new RewardsPopup
                window.dispatchEvent(new CustomEvent('rewards:earned', {
                    detail: {
                        rewards: result.rewards,
                        bonuses: ['Completion Bonus!']
                    }
                }));
                
                // Return the rewards for the slot animation
                return result.rewards;
            }
        }
        
        // Default rewards if economy manager not available
        return {
            hearts: 2,
            diamonds: 1,
            energy: 5
        };
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
        
        // Clean up factoid backs to prevent them showing under next card
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            // Hide current card briefly during transition
            flashcard.style.opacity = '0';
            flashcard.style.transition = 'opacity 0.2s ease';
            
            setTimeout(() => {
                // Reset card state
                flashcard.classList.remove('flipped');
                this.isFlipped = false;
                
                // Clear the back content
                const backEl = flashcard.querySelector('.flashcard-back');
                if (backEl) {
                    backEl.innerHTML = '<div class="card-challenge flashcard-challenge-container"></div>';
                    // Also clear any inline styles
                    backEl.style.cssText = '';
                }
                
                // Clear front content to prevent overlap
                const frontEl = flashcard.querySelector('.flashcard-front');
                if (frontEl) {
                    const contentEl = frontEl.querySelector('.card-content');
                    if (contentEl) contentEl.innerHTML = 'Loading...';
                }
                
                // Show card again
                flashcard.style.opacity = '1';
                
                // Continue with loading next card
                this.continueToNextCard();
            }, 200);
        } else {
            this.continueToNextCard();
        }
    }
    
    continueToNextCard() {
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
        
        // Load the next card
        this.loadCard();
    }
    
    // Multi-page joke methods
    loadJokePage() {
        const container = document.getElementById('jokePageContainer');
        const flashcard = document.getElementById('flashcard');
        const botImage = document.getElementById('jokeBotImage');
        const jokeText = document.getElementById('jokeText');
        
        // Hide regular flashcard, show joke page
        flashcard.style.display = 'none';
        container.style.display = 'block';
        
        // Reset page to 0 if this is the first time loading this joke
        if (this.currentPage === undefined || this.currentPage < 0) {
            this.currentPage = 0;
        }
        
        // Load content based on current page
        const pageContent = this.getJokePageContent();
        
        // Update bot image with fade effect
        botImage.style.opacity = '0';
        botImage.src = pageContent.botImage;
        setTimeout(() => {
            botImage.style.opacity = '1';
        }, 50);
        
        // Update text with animation
        jokeText.style.opacity = '0';
        jokeText.textContent = pageContent.text;
        
        // Apply special styling based on content type
        jokeText.className = 'joke-text';
        if (pageContent.textClass) {
            jokeText.classList.add(pageContent.textClass);
        }
        
        // Apply speaker positioning to the container
        container.className = 'joke-page-container'; // Reset classes
        if (pageContent.speaker === 'left') {
            container.classList.add('speaker-left');
        } else if (pageContent.speaker === 'right') {
            container.classList.add('speaker-right');
        }
        
        setTimeout(() => {
            jokeText.style.opacity = '1';
        }, 100);
        
        // Play sound if available
        if (pageContent.sound && window.soundManager) {
            window.soundManager.play(pageContent.sound);
        }
    }
    
    getJokePageContent() {
        const card = this.currentCard;
        
        if (card.type === 'knock-knock') {
            const pages = [
                {
                    text: 'Knock knock!',
                    botImage: './src/images/signbots/signbot-excited.svg',
                    sound: 'knock',
                    textClass: 'knock-knock',
                    speaker: 'left'
                },
                {
                    text: "Who's there?",
                    botImage: './src/images/signbots/signbot-thinking.svg',
                    sound: 'whos_there',
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text: card.setupLine || 'Orange',
                    botImage: './src/images/signbots/signbot-excited.svg',
                    sound: null,
                    speaker: 'left'
                },
                {
                    text: `${card.setupLine || 'Orange'} who?`,
                    botImage: './src/images/signbots/signbot-thinking.svg',
                    sound: 'wa_wa_who',
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text: card.punchLine || "Orange you glad I didn't say banana?",
                    botImage: './src/images/signbots/signbot-happy.svg',
                    sound: 'rimshot',
                    textClass: 'punchline',
                    speaker: 'left'
                }
            ];
            
            return pages[this.currentPage] || pages[0];
        } else if (card.type === 'pun') {
            // Build the proper response - always repeat the full question
            let naiveResponse = "I don't know...";
            if (card.setupLine) {
                // Always repeat the full question after "I don't know"
                naiveResponse = `I don't know, ${card.setupLine.toLowerCase()}`;
            }
            
            const pages = [
                {
                    text: card.setupLine || "Why don't scientists trust atoms?",
                    botImage: './src/images/signbots/signbot-happy.svg',
                    sound: 'drum_roll',
                    speaker: 'left'
                },
                {
                    text: naiveResponse,
                    botImage: './src/images/signbots/signbot-thinking.svg',
                    sound: 'whos_there',
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text: card.punchLine || "Because they make up everything!",
                    botImage: './src/images/signbots/signbot-happy.svg',
                    sound: Math.random() > 0.5 ? 'rimshot' : 'sad_trombone',
                    textClass: 'punchline',
                    speaker: 'left'
                }
            ];
            
            return pages[this.currentPage] || pages[0];
        }
        
        // Default for other types
        return {
            text: this.currentCard.content,
            botImage: './src/images/signbots/signbot-standard.svg',
            sound: null
        };
    }
    
    nextJokePage() {
        const card = this.currentCard;
        const maxPages = card.type === 'knock-knock' ? 5 : (card.type === 'pun' ? 3 : 1);
        
        this.currentPage++;
        
        if (this.currentPage >= maxPages) {
            // Show giggle meter after last page
            this.showGiggleMeter();
        } else {
            // Load next page
            this.loadJokePage();
        }
    }
    
    showGiggleMeter() {
        const container = document.getElementById('giggleMeterContainer');
        const jokeContainer = document.getElementById('jokePageContainer');
        
        // Hide joke page
        jokeContainer.style.display = 'none';
        container.style.display = 'block';
        
        // Create giggle meter if not exists
        if (!this.giggleMeter) {
            this.giggleMeter = new GiggleMeter();
        }
        
        // Clear container and add meter
        container.innerHTML = '';
        this.giggleMeter.create(container, {
            onRatingChange: (value) => {
                // Store rating
                this.jokeRatings.push({
                    cardId: this.currentCard.id,
                    rating: value,
                    stars: this.giggleMeter.getRating()
                });
            }
        });
        
        // Add continue button
        const continueBtn = document.createElement('button');
        continueBtn.className = 'joke-continue-btn';
        continueBtn.textContent = 'Next Joke';
        continueBtn.onclick = () => this.nextJoke();
        container.appendChild(continueBtn);
    }
    
    nextJoke() {
        // Reset for next joke
        this.currentPage = 0;
        
        // Hide giggle meter
        const giggleContainer = document.getElementById('giggleMeterContainer');
        giggleContainer.style.display = 'none';
        
        // Hide joke page container
        const jokeContainer = document.getElementById('jokePageContainer');
        jokeContainer.style.display = 'none';
        
        // Show regular flashcard again
        const flashcard = document.getElementById('flashcard');
        flashcard.style.display = 'block';
        
        // Move to next card
        this.nextCard();
    }
    
    updateQuoteStreak() {
        const streakCount = document.getElementById('streakCount');
        const streakFill = document.getElementById('streakFill');
        
        if (streakCount) {
            streakCount.textContent = `${this.quoteStreak} / ${this.cards.length}`;
        }
        
        if (streakFill) {
            const percentage = (this.quoteStreak / this.cards.length) * 100;
            streakFill.style.width = `${percentage}%`;
            
            // Add visual effects based on streak
            if (this.quoteStreak >= 5) {
                streakFill.style.background = 'linear-gradient(90deg, #ff4500 0%, #ffd700 100%)';
            } else if (this.quoteStreak >= 3) {
                streakFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffa500 100%)';
            } else {
                streakFill.style.background = '#ff6b6b';
            }
        }
    }

    async showResults() {
        const flashcardContainer = document.getElementById('flashcardContainer');
        
        // Check if this was a factoid session
        const isFactoidSession = this.cards.some(card => card.challengeType === 'simple-flip');
        
        // For joke sessions, show joke ratings summary
        if (this.jokeRatings.length > 0) {
            this.showJokeResults();
            return;
        }
        
        // Award completion rewards
        const rewards = await this.awardCompletionBonus();
        
        if (isFactoidSession) {
            // Factoid-specific results screen
            flashcardContainer.innerHTML = `
                <div class="results-screen factoid-results">
                    <h2>Great Work!</h2>
                    <div class="results-stats">
                        <div class="result-stat">
                            <span class="stat-value">${this.cards.length}</span>
                            <span class="stat-label">Facts Studied</span>
                        </div>
                    </div>
                    
                    <!-- Rewards Bar with Slot Animation -->
                    <div class="rewards-bar-container">
                        <div class="rewards-bar" id="rewardsBar">
                            <!-- Slots will be added here -->
                        </div>
                    </div>
                    
                    <div class="results-actions">
                        <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
                    </div>
                </div>
            `;
            
            // Use RewardsDisplay component to animate rewards
            // INTEGRATION GUIDE: This is how to show rewards in any modal:
            // 1. Initialize this.rewardsDisplay = new RewardsDisplay() in your constructor
            // 2. Create a container with id="rewardsBar" in your HTML
            // 3. Call this.rewardsDisplay.show(rewards, container, options)
            // The rewards object comes from EconomyManager (coins, xp, gems, etc.)
            if (this.rewardsDisplay && rewards) {
                const rewardsContainer = document.getElementById('rewardsBar');
                if (rewardsContainer) {
                    setTimeout(() => {
                        this.rewardsDisplay.show(rewards, rewardsContainer, { 
                            size: 'medium',  // Options: 'small', 'medium', 'large'
                            theme: 'dark'    // Options: 'dark', 'light'
                        });
                    }, 300); // Delay for visual flow
                }
            }
        } else {
            // Regular quiz results screen
            const percentage = Math.round((this.score / this.cards.length) * 100);
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
        }

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
    
    
    showJokeResults() {
        const flashcardContainer = document.getElementById('flashcardContainer');
        
        // Calculate average rating
        const avgRating = this.jokeRatings.reduce((sum, r) => sum + r.rating, 0) / this.jokeRatings.length;
        const avgStars = Math.round(avgRating / 20); // Convert 0-100 to 0-5 stars
        
        // Award points based on participation and ratings
        this.awardJokeCompletionBonus(avgRating);
        
        flashcardContainer.innerHTML = `
            <div class="results-screen joke-results">
                <h2>Comedy Session Complete!</h2>
                <div class="joke-stats">
                    <div class="result-stat">
                        <span class="stat-value">${this.jokeRatings.length}</span>
                        <span class="stat-label">Jokes Rated</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-value">${'⭐'.repeat(avgStars)}</span>
                        <span class="stat-label">Average Rating</span>
                    </div>
                </div>
                <div class="results-message">
                    ${this.getJokeResultMessage(avgRating)}
                </div>
                <div class="joke-comparison">
                    <p>Your ratings vs AI predictions:</p>
                    <div class="comparison-chart">
                        <!-- This would show a comparison chart in production -->
                        <p>Thanks for helping train our comedy AI!</p>
                    </div>
                </div>
                <div class="results-actions">
                    <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
                    <button class="btn-secondary" onclick="window.flashcardModal.restart()">More Jokes!</button>
                </div>
            </div>
        `;
    }
    
    getJokeResultMessage(avgRating) {
        if (avgRating >= 80) {
            return "🤣 You found these hilarious! Great sense of humor!";
        } else if (avgRating >= 60) {
            return "😄 You enjoyed most of these! Nice giggle session!";
        } else if (avgRating >= 40) {
            return "😊 Some hits, some misses - that's comedy!";
        } else if (avgRating >= 20) {
            return "😐 Tough crowd! We'll find funnier jokes next time!";
        } else {
            return "😑 Not your style? Let's try different jokes!";
        }
    }
    
    async awardJokeCompletionBonus(avgRating) {
        if (window.economyManager) {
            // Calculate rewards based on participation and ratings
            const baseXP = 20;
            const ratingBonus = Math.floor(avgRating / 10); // 0-10 bonus XP
            const totalXP = baseXP + ratingBonus;
            
            const result = await window.economyManager.processFlashcardComplete({
                correct: true, // Always reward participation
                cardType: 'joke',
                bonusXP: totalXP,
                isCompletionBonus: true
            });
            
            if (result.rewards) {
                window.dispatchEvent(new CustomEvent('rewards:earned', {
                    detail: {
                        rewards: result.rewards,
                        bonuses: ['Comedy Critic Bonus!']
                    }
                }));
            }
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
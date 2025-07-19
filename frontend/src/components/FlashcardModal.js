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

        // Track all event listeners for cleanup
        this.eventListeners = [];
        this.dynamicElements = new Set();
        
        // Create challenge instance pool
        this.initializeChallengePool();
    }

    // Initialize a pool of challenge instances
    initializeChallengePool() {
        this.challengePool = [];
        this.activeChallengeInstance = null;
        
        // Pre-create 10 challenge instances
        for (let i = 0; i < 10; i++) {
            const instance = {
                id: `challenge-instance-${i}`,
                container: document.createElement('div'),
                question: document.createElement('div'),
                input: document.createElement('div'),
                checkBtn: document.createElement('button'),
                feedback: document.createElement('div'),
                continueBtn: document.createElement('button'),
                listeners: new Map(),
                inUse: false
            };
            
            // Set up the structure
            instance.container.className = 'flashcard-challenge-container';
            instance.container.id = instance.id;
            instance.question.className = 'flashcard-challenge-question';
            instance.input.className = 'flashcard-challenge-input';
            instance.checkBtn.className = 'flashcard-check-answer-btn';
            instance.checkBtn.textContent = 'Check Answer';
            instance.feedback.className = 'flashcard-answer-feedback';
            instance.continueBtn.className = 'flashcard-continue-btn';
            instance.continueBtn.textContent = 'Continue';
            
            // Assemble the structure
            instance.container.appendChild(instance.question);
            instance.container.appendChild(instance.input);
            instance.container.appendChild(instance.checkBtn);
            instance.container.appendChild(instance.feedback);
            instance.container.appendChild(instance.continueBtn);
            
            // Initially hide it
            instance.container.style.display = 'none';
            
            this.challengePool.push(instance);
        }
    }
    
    // Get an available challenge instance from the pool
    getChallengeInstance() {
        // Release current instance if any
        if (this.activeChallengeInstance) {
            this.releaseChallengeInstance(this.activeChallengeInstance);
        }
        
        // Find an unused instance
        const instance = this.challengePool.find(inst => !inst.inUse);
        if (!instance) {
            console.error('No available challenge instances in pool!');
            return null;
        }
        
        instance.inUse = true;
        this.activeChallengeInstance = instance;
        return instance;
    }
    
    // Release a challenge instance back to the pool
    releaseChallengeInstance(instance) {
        if (!instance) return;
        
        // Clear all event listeners
        instance.listeners.forEach((listener, element) => {
            element.removeEventListener(listener.type, listener.handler);
        });
        instance.listeners.clear();
        
        // Clear content
        instance.question.textContent = '';
        instance.input.innerHTML = '';
        instance.feedback.innerHTML = '';
        instance.container.style.display = 'none';
        
        // Remove from DOM if attached
        if (instance.container.parentNode) {
            instance.container.remove();
        }
        
        instance.inUse = false;
    }

    // Generate unique IDs based on card type and index
    getUniqueId(elementType) {
        const cardType = this.currentCard?.type || 'unknown';
        const cardIndex = this.currentIndex || 0;
        return `flashcard-${cardType}-${cardIndex}-${elementType}`;
    }

    // Cleanup any dynamically created elements and listeners
    cleanupDynamicContent() {
        // Remove any tracked dynamic elements
        this.dynamicElements.forEach(element => {
            if (element && element.parentNode) {
                element.remove();
            }
        });
        this.dynamicElements.clear();

        // Clean up any stored references
        if (this.getSelectedWords) {
            delete this.getSelectedWords;
        }

        // Clear any temporary DOM elements
        const tempElements = document.querySelectorAll('.temp-popup, .xp-popup, .bonus-popup, .score-message-bar');
        tempElements.forEach(el => el.remove());
    }

    // Assign dynamic IDs to elements when loading a card
    assignDynamicIds() {
        // Clean up before assigning new IDs
        this.cleanupDynamicContent();

        // Get elements by class and assign unique IDs
        const challengeContainer = this.modal.querySelector(
            '.flashcard-challenge-container'
        );
        const challengeQuestion = this.modal.querySelector(
            '.flashcard-challenge-question'
        );
        const challengeInput = this.modal.querySelector(
            '.flashcard-challenge-input'
        );
        const checkAnswerBtn = this.modal.querySelector(
            '.flashcard-check-answer-btn'
        );
        const answerFeedback = this.modal.querySelector(
            '.flashcard-answer-feedback'
        );
        const feedbackContent = this.modal.querySelector(
            '.flashcard-feedback-content'
        );
        const continueBtn = this.modal.querySelector('.flashcard-continue-btn');

        // Assign unique IDs
        if (challengeContainer)
            challengeContainer.id = this.getUniqueId('challenge');
        if (challengeQuestion)
            challengeQuestion.id = this.getUniqueId('question');
        if (challengeInput) challengeInput.id = this.getUniqueId('input');
        if (checkAnswerBtn) checkAnswerBtn.id = this.getUniqueId('checkBtn');
        if (answerFeedback) answerFeedback.id = this.getUniqueId('feedback');
        if (feedbackContent)
            feedbackContent.id = this.getUniqueId('feedbackContent');
        if (continueBtn) continueBtn.id = this.getUniqueId('continueBtn');

        // console.log(`Assigned dynamic IDs for card type: ${this.currentCard?.type}, index: ${this.currentIndex}`);
    }

    // Helper to add event listener with tracking
    addTrackedListener(element, type, handler) {
        element.addEventListener(type, handler);
        this.eventListeners.push({ element, type, handler });
    }

    // Helper to get element by dynamic ID type
    getElement(elementType) {
        const id = this.getUniqueId(elementType);
        const element = document.getElementById(id);
        console.log(`🔍 Getting element ${elementType} with ID: ${id}, found: ${!!element}`);
        return element;
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
                        <span class="progress-text">Card <span id="flashcardCurrentCard">1</span> of <span id="flashcardTotalCards">10</span></span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="flashcardProgressFill"></div>
                        </div>
                    </div>
                    <div class="flashcard-score">
                        <span class="score-icon">🔥</span>
                    </div>
                </div>
                
                <!-- Cumulative streak bar for quotes - TEMPORARILY COMMENTED OUT due to duplicate progress display -->
                <!-- <div class="quote-streak-bar" id="quoteStreakBar" style="display: none;">
                    <div class="streak-flames">
                        <span class="flame-icon">🔥</span>
                    </div>
                    <div class="streak-progress">
                        <div class="streak-fill" id="streakFill"></div>
                    </div>
                </div> -->

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
                        
                        <!-- Footer for both jokes and puns - inside container -->
                        <div class="joke-flip-footer" id="jokeFlipFooter">
                            <button class="joke-nav-btn" id="jokeNextBtn">
                                <span class="nav-icon"><img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Next"></span>
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

        // DEBUG: Add keyboard shortcuts
        this.debugKeyHandler = (e) => {
            // J shortcut removed - no longer needed
            
            // Ctrl+Shift+R = Skip to Results (or Cmd+Shift+R on Mac)
            if (
                (e.ctrlKey || e.metaKey) &&
                e.shiftKey &&
                e.key === 'R' &&
                this.modal.classList.contains('active')
            ) {
                e.preventDefault();
                this.currentIndex = this.cards.length;

                // Check if this is a joke session (knock-knock or puns)
                const isJokeSession = this.cards.some(
                    (card) => card.type === 'knock-knock' || card.type === 'pun'
                );

                if (isJokeSession) {
                    // For jokes, we need to populate ratings first
                    this.cards.forEach((card, index) => {
                        if (
                            card.type === 'knock-knock' ||
                            card.type === 'pun'
                        ) {
                            this.jokeRatings.push({
                                cardIndex: index,
                                rating: 80 // Default rating for debug
                            });
                        }
                    });
                    this.showJokeResults();
                } else {
                    this.showResults();
                }
            }
        };
        document.addEventListener('keydown', this.debugKeyHandler);

        // Flashcard click to flip - use event delegation on container instead
        // USER INTERACTION 1: Click card to flip from front to back
        const flashcardContainer = this.modal.querySelector(
            '#flashcardContainer'
        );
        flashcardContainer.addEventListener('click', (e) => {
            // Check if the click was on the flashcard front or flip button
            const flipButton = e.target.closest('.flip-icon-button');
            const flashcardFront = e.target.closest('.flashcard-front');
            const flashcard = e.target.closest('#flashcard');

            // For factoids (simple-flip), flip button on back should advance to next card
            if (
                flipButton &&
                this.isFlipped &&
                this.currentCard.challengeType === 'simple-flip'
            ) {
                console.log('Flip button clicked on factoid back');
                console.log(
                    'Current wonder rating:',
                    this.currentCard.wonderRating
                );

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
            if (
                (flipButton || flashcardFront) &&
                flashcard &&
                !this.isFlipped
            ) {
                this.flipCard();
            }
        });

        // Check answer button - validates user's answer
        // USER INTERACTION 2: After flipping, user answers challenge and clicks check
        const checkBtn = this.modal.querySelector(
            '.flashcard-check-answer-btn'
        );
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

            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case ' ':
                case 'Enter':
                    // Space/Enter flips card if not already flipped AND user is not typing in an input
                    if (
                        !this.isFlipped &&
                        document.activeElement.tagName !== 'INPUT'
                    ) {
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
        
        // Store config for later reference (needed for safeguards)
        this.config = config;

        // If modal is already open, close it first to reset state
        if (this.modal.classList.contains('active')) {
            console.log('Modal already active, closing first to reset');
            this.close();
            // Small delay to allow DOM to update
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Record session start time
        this.sessionStartTime = Date.now();

        // Check if user has enough energy (1 per card)
        if (window.economyManager) {
            const economyState = window.economyManager.getDisplayState();
            console.log('Economy state:', economyState);
            const requiredEnergy = 1; // 1 energy per flashcard session

            if (economyState.energy < requiredEnergy) {
                console.log(
                    'Insufficient energy:',
                    economyState.energy,
                    '<',
                    requiredEnergy
                );
                // Show insufficient energy message
                if (window.alertModal) {
                    window.alertModal.show({
                        type: 'warning',
                        title: 'Not Enough Energy',
                        message: `You need ${requiredEnergy} energy to practice flashcards. You have ${economyState.energy} energy.`,
                        primaryButton: 'OK'
                    });
                } else {
                    console.error(
                        'AlertModal not available to show energy warning'
                    );
                }
                return;
            }

            // Deduct energy cost
            console.log('Attempting to spend energy...');
            try {
                const energyResult = await window.economyManager.spendEnergy(
                    requiredEnergy,
                    'flashcard_start'
                );
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
            console.error('Failed to load flashcards from API');
            alert('Unable to load flashcards. Please check your connection and try again.');
            this.close();
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
        console.log(
            'Modal computed style display:',
            window.getComputedStyle(this.modal).display
        );
        console.log(
            'Modal computed style visibility:',
            window.getComputedStyle(this.modal).visibility
        );
        console.log('Modal parent:', this.modal.parentElement);
        console.log(
            'Modal z-index:',
            window.getComputedStyle(this.modal).zIndex
        );
        console.log(
            'Modal position:',
            window.getComputedStyle(this.modal).position
        );
        console.log(
            'Modal dimensions:',
            this.modal.offsetWidth,
            'x',
            this.modal.offsetHeight
        );
        console.log(
            'Modal opacity:',
            window.getComputedStyle(this.modal).opacity
        );
        document.body.style.overflow = 'hidden';

        // Update total cards
        document.getElementById('flashcardTotalCards').textContent =
            this.cards.length;

        // Load first card
        this.loadCard();
    }

    async fetchCards(config) {
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';

            // Get user ID if available for deduplication
            const userId = localStorage.getItem('userId');
            const userParam = userId ? `&user_id=${userId}` : '';
            
            // Map practice categories to the new set endpoints
            const setEndpoints = {
                bad_puns: `/api/content/pun/sets?count=1`,
                famous_quotes: `/api/content/quote/sets?count=1`,
                knock_knock: `/api/content/joke/sets?count=1`,
                trivia_mix: `/api/content/trivia/sets?count=1`
            };

            const category = config.category || 'trivia_mix';
            const endpoint = setEndpoints[category];

            if (!endpoint) {
                throw new Error(`Unknown category: ${category}`);
            }

            const response = await fetch(`${apiBase}${endpoint}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch practice set');
            }

            const sets = await response.json();

            if (!sets || sets.length === 0) {
                throw new Error('No practice sets available');
            }

            // Get the first set
            const practiceSet = sets[0];
            const setData = practiceSet.data;

            // Extract the cards from the set based on type
            let cards = [];

            if (category === 'bad_puns' && setData.puns) {
                cards = setData.puns;
            } else if (category === 'famous_quotes' && setData.quotes) {
                cards = setData.quotes;
            } else if (category === 'knock_knock' && setData.jokes) {
                cards = setData.jokes;
            } else if (category === 'trivia_mix' && setData.trivia) {
                cards = setData.trivia;
            } else if (setData.items) {
                // Fallback for generic 'items' array
                cards = setData.items;
            }

            // Transform to match our expected format
            if (Array.isArray(cards)) {
                return cards.map((card) => {
                    // Handle joke formats from Haiku API
                    if (
                        (card.type === 'joke' && card.category === 'knock_knock') ||
                        card.category === 'knock_knock'
                    ) {
                        return {
                            id: card.id,
                            category: 'Knock Knock 🚪',
                            type: 'knock-knock',
                            content: card.content || "Knock knock.", // "Knock knock."
                            setupLine: card.whosThere, // "Dishes"
                            whosThereWho: card.whosThereWho, // "Dishes who?"
                            punchLine: card.punchline,
                            difficulty: card.difficulty || 'easy',
                            // Explicitly exclude challenge fields for knock-knock jokes
                            challenge: undefined,
                            challengeType: undefined,
                            answer: undefined
                        };
                    } else if (
                        card.type === 'pun' ||
                        card.category === 'bad_puns'
                    ) {
                        return {
                            id: card.id,
                            category: 'Punz',
                            type: 'pun',
                            content: card.content, // Full setup question
                            setupLine: card.content, // Same as content for puns
                            setupQuery: card.setup_query,
                            punchLine: card.punchline,
                            hint: card.hint, // Could be useful for UI
                            theme: card.theme, // Could be useful for theming
                            difficulty: card.difficulty || 'easy'
                        };
                    } else if (
                        card.type === 'quote' ||
                        card.category === 'famous_quotes'
                    ) {
                        return {
                            id: card.id,
                            category: 'Say What?',
                            type: 'quote',
                            content: card.content,
                            author: card.author,
                            source: card.source,
                            challenge: card.challenge,
                            answer: card.answer,
                            challengeType: card.challengeType,
                            options: card.options, // For multiple-choice
                            scrambled: card.scrambled, // For word-order
                            year: card.year,
                            theme: card.theme,
                            difficulty: card.difficulty || 'easy'
                        };
                    } else if (
                        card.type === 'trivia' ||
                        card.challengeType === 'simple-flip'
                    ) {
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

            // If we couldn't extract cards, return empty array
            return [];
        } catch (error) {
            console.error('Error fetching flashcards:', error);
            // Return null to trigger dynamic generation
            return null;
        }
    }

    async trackCardView(cardId, isCorrect = null) {
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            
            // Get userId from authPanel first, fallback to localStorage
            let userId = null;
            if (window.authPanel && window.authPanel.currentUserId) {
                userId = window.authPanel.currentUserId;
            } else {
                userId = localStorage.getItem('userId');
            }

            if (!userId) return; // Don't track for anonymous users

            const response = await fetch(
                `${apiBase}/api/flashcards/track-view`,
                {
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
                }
            );

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
        switch (category) {
            case 'famous_quotes':
                // Generate quote prompts for AI
                const quotePrompts = [
                    'wisdom',
                    'success',
                    'life',
                    'happiness',
                    'courage',
                    'friendship',
                    'love',
                    'change',
                    'dreams',
                    'perseverance'
                ];

                for (let i = 0; i < count; i++) {
                    const theme = quotePrompts[i % quotePrompts.length];
                    cards.push(this.createQuoteCard(i, theme));
                }
                break;

            case 'bad_puns':
                const punThemes = [
                    'animals',
                    'food',
                    'technology',
                    'music',
                    'sports',
                    'weather',
                    'school',
                    'jobs',
                    'travel',
                    'nature'
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
                const triviaCategories = [
                    'science',
                    'history',
                    'geography',
                    'culture',
                    'technology'
                ];
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
                content: `"${
                    theme.charAt(0).toUpperCase() + theme.slice(1)
                } is not a destination, but a journey of discovery."`,
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
                options: [
                    'Tao Te Ching',
                    'The Bible',
                    'The Quran',
                    'Bhagavad Gita'
                ],
                answer: 'Tao Te Ching'
            }
        ];

        const template = templates[index % templates.length];
        return {
            id: `quote-dynamic-${index}`,
            category: 'Say What?',
            type: 'quote',
            ...template,
            difficulty: 'medium'
        };
    }

    createPunCard(index, theme) {
        // Sample puns by theme - in production these would come from Haiku API
        const puns = {
            animals: [
                {
                    setup: "Why don't oysters share?",
                    punch: "Because they're shellfish!"
                },
                {
                    setup: 'What do you call a bear with no teeth?',
                    punch: 'A gummy bear!'
                },
                {
                    setup: "Why don't eggs tell jokes?",
                    punch: "They'd crack up!"
                }
            ],
            food: [
                {
                    setup: 'Why did the cookie go to the doctor?',
                    punch: 'Because it felt crumbly!'
                },
                {
                    setup: "What do you call cheese that isn't yours?",
                    punch: 'Nacho cheese!'
                },
                {
                    setup: 'Why did the tomato turn red?',
                    punch: 'Because it saw the salad dressing!'
                }
            ],
            technology: [
                {
                    setup: 'Why do programmers prefer dark mode?',
                    punch: 'Because light attracts bugs!'
                },
                {
                    setup: 'Why was the computer cold?',
                    punch: 'It left its Windows open!'
                },
                {
                    setup: "What's a computer's favorite snack?",
                    punch: 'Microchips!'
                }
            ],
            default: [
                {
                    setup: 'I used to hate facial hair...',
                    punch: 'But then it grew on me!'
                },
                {
                    setup: "I'm reading a book about anti-gravity...",
                    punch: "It's impossible to put down!"
                },
                {
                    setup: 'Time flies like an arrow...',
                    punch: 'Fruit flies like a banana!'
                }
            ]
        };

        const themePuns = puns[theme] || puns.default;
        const pun = themePuns[index % themePuns.length];

        return {
            id: `pun-dynamic-${index}`,
            category: 'Bad Pun 😅',
            type: 'pun',
            setupLine: pun.setup,
            setupQuery: pun.setup.includes('?')
                ? pun.setup.split('?')[0] + '?'
                : 'why?',
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
            { setup: 'Cash', punch: 'No thanks, I prefer peanuts!' },
            { setup: 'Olive', punch: 'Olive you and I miss you!' },
            { setup: 'Tank', punch: "You're welcome!" },
            { setup: 'Donut', punch: 'Donut forget to smile today!' },
            { setup: 'Who', punch: "Who's there? Wait, that's my line!" },
            { setup: 'Howard', punch: 'Howard you like to hear another joke?' },
            { setup: 'Dewey', punch: 'Dewey have to use a knock-knock joke?' }
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
            category: `${
                category.charAt(0).toUpperCase() + category.slice(1)
            } Fact`,
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                category: 'Say What?',
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
                answer: "It's so massive that all other planets could fit inside it with room to spare! It also has 79 known moons and a storm (the Great Red Spot) that's been raging for over 350 years.",
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
            knock_knock: 'knock-knock',
            trivia_mix: 'trivia'
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
        
        // Don't set up card if we're about to show results
        if (this.currentIndex === this.cards.length - 1 && this.isTransitioning) {
            return;
        }

        this.currentCard = this.cards[this.currentIndex];
        this.userAnswer = null;
        
        // SAFEGUARD: If we're in a quote session but card type is missing, fix it
        if (this.config?.category === 'famous_quotes' && !this.currentCard.type) {
            console.warn('Card missing type in quote session, fixing it to "quote"');
            this.currentCard.type = 'quote';
        }

        // DEBUG: Log the current card structure
        console.log('Current card structure:', this.currentCard);
        console.log('Card type:', this.currentCard.type);
        console.log('Challenge type:', this.currentCard.challengeType);
        console.log('Content:', this.currentCard.content);
        console.log(
            'Answer/Detail:',
            this.currentCard.answer || this.currentCard.detail
        );

        // Check if this is a joke card
        this.isMultiPage =
            this.currentCard.type === 'knock-knock' ||
            this.currentCard.type === 'pun';
        this.currentPage = 0;

        // Only reset flip state if we're not in a transition
        if (!this.isTransitioning) {
            this.isFlipped = false;
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.remove('flipped');
        }

        // Show/hide quote streak bar and regular streak indicator
        // TEMPORARILY COMMENTED OUT - quote streak bar is disabled
        // const quoteStreakBar = document.getElementById('quoteStreakBar');
        const regularStreakIndicator =
            document.getElementById('streakIndicator');
        const flashcardScore = this.modal.querySelector('.flashcard-score');
        const isQuoteSession =
            this.currentCard && this.currentCard.type === 'quote';

        // Debug logging
        console.log('Current card type:', this.currentCard?.type);
        console.log('Is quote session:', isQuoteSession);

        if (isQuoteSession) {
            // quoteStreakBar.style.display = 'flex';
            regularStreakIndicator.style.display = 'none'; // Hide regular streak for quotes
            if (flashcardScore) {
                // Don't hide score section for quotes anymore
                flashcardScore.style.display = 'flex';
            }
            // this.updateQuoteStreak();
        } else {
            // quoteStreakBar.style.display = 'none';
            if (flashcardScore) {
                // Remove the forced hiding
                flashcardScore.style.cssText = '';
                flashcardScore.style.display = 'flex';
            }
            // Update score display for non-quote cards
            const scoreValueEl = document.getElementById('flashcardScoreValue');
            if (scoreValueEl) {
                scoreValueEl.textContent = this.score || 0;
            }
            // Show regular streak for other card types if there's a streak
            if (this.streak > 0) {
                regularStreakIndicator.style.display = 'flex';
                document.getElementById('streakValue').textContent =
                    this.streak;
            }
        }

        // If it's a multi-page joke, load differently
        if (this.isMultiPage) {
            this.loadJokePage();
            return;
        }

        // Get flashcard element early so we can use it
        const flashcard = document.getElementById('flashcard');

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

            // Immediately hide challenge elements to prevent flash
            const challengeContainer = flashcard.querySelector(
                '.flashcard-challenge-container'
            );
            const answerCheck = flashcard.querySelector('.answer-check');
            const answerFeedback = flashcard.querySelector(
                '.flashcard-answer-feedback'
            );

            if (challengeContainer) challengeContainer.style.display = 'none';
            if (answerCheck) answerCheck.style.display = 'none';
            if (answerFeedback) answerFeedback.style.display = 'none';
        } else {
            flashcard.removeAttribute('data-challenge-type');
            flashcard.classList.remove('simple-flip');

            // Show challenge elements for other card types
            const challengeContainer = flashcard.querySelector(
                '.flashcard-challenge-container'
            );
            const answerCheck = flashcard.querySelector('.answer-check');

            if (challengeContainer) challengeContainer.style.display = '';
            if (answerCheck) answerCheck.style.display = '';
        }

        // Update progress
        document.getElementById('flashcardCurrentCard').textContent =
            this.currentIndex + 1;
        const progress = (this.currentIndex / this.cards.length) * 100;
        document.getElementById(
            'flashcardProgressFill'
        ).style.width = `${progress}%`;
        console.log(
            `Progress: Card ${this.currentIndex + 1} of ${
                this.cards.length
            } = ${progress}%`
        );

        // Apply card type themes
        const flashcardFront = flashcard.querySelector('.flashcard-front');
        const categoryEl = document.getElementById('cardCategory');

        // Remove previous theme classes
        flashcardFront.className = 'flashcard-front';
        categoryEl.className = 'card-category';

        // Add theme based on card type
        // IMPORTANT: Add class to flashcard container so CSS selectors work properly
        // (flashcard already declared above)
        
        // Remove previous type classes from flashcard container
        flashcard.classList.remove('quote-card', 'pun-card', 'knock-card', 'science-card');
        
        if (this.currentCard.type === 'quote') {
            flashcard.classList.add('quote-card');
            flashcardFront.classList.add('quote-card');
            categoryEl.classList.add('quote-category');
        } else if (this.currentCard.type === 'pun') {
            flashcard.classList.add('pun-card');
            flashcardFront.classList.add('pun-card');
            categoryEl.classList.add('pun-category');
        } else if (this.currentCard.type === 'knock-knock') {
            flashcard.classList.add('knock-knock-card');
            flashcardFront.classList.add('knock-knock-card');
            categoryEl.classList.add('knock-knock-category');
        } else if (
            this.currentCard.type === 'joke' &&
            this.currentCard.category.includes('Knock')
        ) {
            flashcard.classList.add('knock-card');
            flashcardFront.classList.add('knock-card');
            categoryEl.classList.add('knock-category');
        } else if (
            this.currentCard.category &&
            this.currentCard.category.includes('Science')
        ) {
            flashcard.classList.add('science-card');
            flashcardFront.classList.add('science-card');
            categoryEl.classList.add('science-category');
        }

        // Update front of card
        // Transform category display for factoids
        let displayCategory = this.currentCard.category;
        let categoryIcon = null;
        
        // Debug: Mark which side we're on
        console.log(`🎯 Loading FRONT of card ${this.currentIndex}, type: ${this.currentCard.type}, challengeType: ${this.currentCard.challengeType}`);

        if (
            this.currentCard.type === 'factoid' ||
            this.currentCard.challengeType === 'simple-flip'
        ) {
            // Extract theme from card data
            const theme =
                this.currentCard.theme || this.currentCard.data?.theme;
            if (theme) {
                // Map theme to icon filename
                const iconMap = {
                    science: 'science.svg',
                    history: 'history.svg',
                    geography: 'geography.svg',
                    pop_culture: 'pop_culture.svg',
                    technology: 'technology.svg',
                    nature: 'nature.svg',
                    sports: 'sports.svg',
                    literature: 'literature.svg',
                    music: 'music.svg',
                    food_cuisine: 'food_cuisine.svg',
                    film: 'film.svg',
                    gaming: 'gaming.svg',
                    art: 'art.svg',
                    mythology: 'mythology.svg',
                    space: 'space.svg',
                    animals: 'animals.svg',
                    inventions: 'inventions.svg',
                    internet_culture: 'internet_culture.svg',
                    fashion_design: 'fashion_design.svg',
                    ancient_architecture: 'ancient_architecture.svg',
                    archaeology: 'archaology.svg',
                    dinosaurs: 'dinosaurs.png',
                    wicca: 'wicca.svg',
                    famous_lies: 'famous_lies.svg',
                    scandal_mischief: 'scandal_mischief.svg',
                    fame_glory: 'fame_glory.svg',
                    horror_films: 'horrorz_films.svg',
                    language_evolution: 'language_evolution.svg',
                    jokes: 'jokes.svg'
                };

                if (iconMap[theme]) {
                    categoryIcon = `./src/images/categories/${iconMap[theme]}`;
                    displayCategory = theme
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(
                            (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(' ');
                }
            } else {
                displayCategory = 'Factoid 🤯';
            }
        }

        // Update category display
        if (this.currentCard.type === 'quote') {
            // Create animated SAY WHAT! with individual words
            categoryEl.innerHTML = `
                <span class="say-word say-word-1">SAY</span>
                <span class="say-word say-word-2">WHAT!</span>
            `;
            
            // Play fanfare sound if available
            try {
                this.playQuoteFanfare();
            } catch (e) {
                console.log('Could not play fanfare:', e);
            }
        } else {
            categoryEl.textContent = displayCategory;
        }

        // Display content with hero icon for factoids
        const contentEl = document.getElementById('cardContent');
        if (!contentEl) {
            console.error('Could not find cardContent element!');
            return;
        }
        
        // Debug: Check if we're accidentally putting challenge content on front
        console.log(`📍 Front card content element found, about to set content for ${this.currentCard.type}`);
        if (
            categoryIcon &&
            (this.currentCard.type === 'factoid' ||
                this.currentCard.challengeType === 'simple-flip')
        ) {
            // Move category below hero image
            categoryEl.style.order = '2';
            contentEl.style.order = '1';
            contentEl.innerHTML = `
                <div class="factoid-hero-display">
                    <div class="card-category">${displayCategory}</div>
                    <img src="${categoryIcon}" class="category-hero-icon" alt="${displayCategory}">
                    <div class="factoid-text">${this.currentCard.content}</div>
                </div>
            `;
            // Hide the original category element since we're including it in the content
            categoryEl.style.display = 'none';
        } else if (
            this.currentCard.type === 'quote' &&
            this.currentCard.author
        ) {
            // Select a random SayWhatBot (1-5)
            const botNumber = Math.floor(Math.random() * 5) + 1;
            const botPath = `./src/images/SayWhatBots/sayWhat0${botNumber}-opt.svg`;
            
            console.log(`✅ Setting QUOTE content on FRONT: "${this.currentCard.content}"`);
            contentEl.innerHTML = `
                <div class="quote-display">
                    <img src="${botPath}" alt="Say What Bot" class="quote-bot-image" />
                    <div class="quote-text">${this.currentCard.content}</div>
                    <div class="quote-author">— ${this.currentCard.author}</div>
                    <div class="quote-flip-footer">
                        <button class="flip-icon-button quote-flip-button" aria-label="Flip card">
                            <img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Flip" class="flip-icon">
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Restore normal layout for non-factoid cards
            categoryEl.style.order = '';
            contentEl.style.order = '';
            categoryEl.style.display = '';
            contentEl.innerHTML = `<div class="content-display">${this.currentCard.content}</div>`;
        }

        // Assign dynamic IDs to elements BEFORE setupChallenge needs them
        this.assignDynamicIds();
        
        // Prepare the back of card based on challenge type
        this.setupChallenge();
        
        // LEGACY SYSTEM COMMENTED OUT - using clean new buttons for quotes
        // this.updateButtonVisibility();
        
        // For quotes only: Create clean, dedicated submit button
        if (this.currentCard?.type === 'quote') {
            this.createCleanSubmitButton();
        } else {
            // Stop gremlin killer when not on quotes to free up resources
            if (this.gremlinKiller) {
                clearInterval(this.gremlinKiller);
                this.gremlinKiller = null;
            }
        }

        // Streak display is now handled in the Show/hide quote streak bar section above

        // CRITICAL: Reset UI elements - ensure challenge is visible
        const feedbackEl = this.getElement('feedback');
        if (feedbackEl) feedbackEl.style.display = 'none';

        const challengeEl = this.getElement('challenge');
        const checkBtn = this.getElement('checkBtn');

        // Force challenge visible - but not for simple-flip cards
        if (this.currentCard.challengeType !== 'simple-flip') {
            if (challengeEl) {
                challengeEl.style.cssText =
                    'display: block !important; opacity: 1 !important; visibility: visible !important; position: relative !important; z-index: 10000 !important;';
                // console.log('Force showing challenge on load for:', this.getUniqueId('challenge'));
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
        // Debug: Mark that we're setting up the BACK of the card
        console.log(`🎯 Setting up BACK (challenge) for card ${this.currentIndex}, type: ${this.currentCard?.type}, challengeType: ${this.currentCard?.challengeType}`);
        
        // Don't setup challenge if no current card or if we're transitioning
        if (!this.currentCard || this.isTransitioning) {
            return;
        }
        
        // Re-enable submit button when showing back of card (for quotes)
        if (this.currentCard?.type === 'quote') {
            const submitBtn = this.modal.querySelector('.clean-quote-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
                console.log('Re-enabled submit button for quote challenge');
            }
        }
        
        let questionEl = this.modal.querySelector(
            '.flashcard-challenge-question'
        );
        let inputEl = this.modal.querySelector('.flashcard-challenge-input');

        // console.log('Setting up challenge for card:', this.currentCard);
        // console.log('Challenge text:', this.currentCard.challenge);

        // Skip challenge setup for non-quote cards (puns, knock-knock, factoids)
        if (this.currentCard.type === 'pun' || 
            this.currentCard.type === 'knock-knock' || 
            this.currentCard.challengeType === 'simple-flip') {
            if (questionEl) questionEl.style.display = 'none';
            if (inputEl) inputEl.style.display = 'none';
            return;
        }
        
        // Hide continue button for quote cards - they use check answer button instead
        if (this.currentCard.type === 'quote') {
            const continueBtn = this.modal.querySelector('.flashcard-continue-btn');
            if (continueBtn) {
                continueBtn.style.display = 'none';
                console.log(`Hiding continue button for quote card with challenge type: ${this.currentCard.challengeType}`);
            }
        }
        
        // Ensure elements exist for quote cards
        if (!questionEl || !inputEl) {
            console.error('Challenge elements not found! Attempting to find/create them...', {
                questionEl: !!questionEl,
                inputEl: !!inputEl,
                currentCard: this.currentCard
            });
            
            // Try to find the challenge container and create missing elements
            const challengeContainer = this.modal.querySelector('.flashcard-challenge-container');
            if (challengeContainer) {
                if (!questionEl) {
                    const newQuestionEl = document.createElement('div');
                    newQuestionEl.className = 'flashcard-challenge-question';
                    challengeContainer.insertBefore(newQuestionEl, challengeContainer.firstChild);
                    questionEl = newQuestionEl;
                }
                if (!inputEl) {
                    const newInputEl = document.createElement('div');
                    newInputEl.className = 'flashcard-challenge-input';
                    challengeContainer.insertBefore(newInputEl, challengeContainer.querySelector('.flashcard-check-answer-btn'));
                    inputEl = newInputEl;
                }
            } else {
                console.error('No challenge container found! Cannot setup challenge.');
                return;
            }
        }

        // Only set question text if element exists
        if (questionEl) {
            // Special handling for word-order to make text smaller
            if (this.currentCard.challengeType === 'word-order') {
                questionEl.innerHTML = '<span style="font-size: 14px; font-weight: normal;">Click words in order</span>';
            } else {
                questionEl.textContent =
                    this.currentCard.challenge || 'No challenge text';
            }
            // Ensure it's visible
            questionEl.style.display = 'block';
            questionEl.style.opacity = '1';
            questionEl.style.visibility = 'visible';
            console.log(`Set challenge question text: "${this.currentCard.challenge}"`);
        } else {
            console.error('Question element not found even after creation attempt!');
        }

        switch (this.currentCard.challengeType) {
            case 'fill-blank':
                // Use consistent ID that checkAnswer can find
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
                
                // Note: Submit button handled by updateButtonVisibility()

                // console.log('✅ Input created with createElement and direct style properties');
                // Force input visible and monitor what happens to it
                setTimeout(() => {
                    const input = document.getElementById(fillBlankId);
                    if (input) {
                        // Force input visible with clean styling
                        input.style.cssText =
                            'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 99999 !important; position: relative !important; width: 100% !important; max-width: 300px !important; padding: 12px 20px !important; margin: 0 auto !important; background: rgba(0, 0, 0, 0.3) !important; border: 2px solid rgba(255, 255, 255, 0.5) !important; color: white !important; animation: none !important; transition: none !important; transform: none !important;';
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
                                if (
                                    mutation.type === 'attributes' &&
                                    mutation.attributeName === 'style'
                                ) {
                                    // console.log('🔍 Input style was changed!', mutation.target.style.cssText);
                                } else if (mutation.type === 'childList') {
                                    // console.log('🔍 Input parent children changed!', mutation);
                                }
                            });
                        });
                        observer.observe(input, {
                            attributes: true,
                            attributeFilter: ['style']
                        });
                        observer.observe(input.parentElement, {
                            childList: true
                        });

                        // Store observer to clean up later
                        this.inputObserver = observer;

                        // Check position and dimensions too
                        let checks = 0;
                        const interval = setInterval(() => {
                            checks++;
                            const exists = document.getElementById(fillBlankId);
                            const computed = exists
                                ? window.getComputedStyle(exists)
                                : null;
                            const rect = exists
                                ? exists.getBoundingClientRect()
                                : null;
                            // console.log(`Check ${checks}: exists=${!!exists}, display=${computed?.display}, opacity=${computed?.opacity}, visibility=${computed?.visibility}`);
                            if (rect) {
                                // console.log(`  Position: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);
                            }

                            if (checks >= 10 || !exists) {
                                // Reduced to 10 checks to reduce spam
                                clearInterval(interval);
                                if (this.inputObserver) {
                                    this.inputObserver.disconnect();
                                    this.inputObserver = null;
                                }
                            }
                        }, 200); // Every 200ms instead of 100ms
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
                authorInput.style.cssText =
                    'display: block !important; opacity: 1 !important; visibility: visible !important;';

                // Append to container
                inputEl.appendChild(authorInput);

                // Add Enter key listener for quick submit
                authorInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.checkAnswer();
                    }
                });
                
                // Note: Submit button handled by updateButtonVisibility()

                // Extra insurance - set styles after DOM update
                setTimeout(() => {
                    const input = document.getElementById(authorInputId);
                    if (input) {
                        input.style.cssText =
                            'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1200 !important;';
                    }
                }, 10);
                break;

            case 'multiple-choice':
                // Check if options exist, if not create them from the answer
                const options = this.currentCard.options || this.generateOptions();
                inputEl.innerHTML = `
                    <div class="multiple-choice-options">
                        ${options
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
                
                // Button visibility now handled by updateButtonVisibility()
                
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
                            
                            // Don't auto-submit - let user click submit button
                        });
                    });
                }, 0);
                
                // Ensure parent flashcard expands to contain challenge content
                setTimeout(() => {
                    this.adjustFlashcardHeight();
                }, 200);
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
                // ALWAYS generate our own scrambled words - don't trust API's "scrambled" array
                const scrambled = this.generateScrambledWords();
                console.log('Word-order setup:', {
                    apiScrambled: this.currentCard.scrambled,
                    ourScrambled: scrambled,
                    content: this.currentCard.content
                });
                const wordBankId = `${this.getUniqueId('input')}-wordBank`;
                const wordAnswerId = `${this.getUniqueId('input')}-wordAnswer`;
                inputEl.innerHTML = `
                    <div class="word-order-container">
                        <div class="word-bank" id="${wordBankId}" style="display: grid !important; grid-template-columns: repeat(3, 1fr) !important;">
                            ${scrambled
                                .map(
                                    (item) => `
                                <span class="word-chip" data-word="${item.word || item}" data-index="${item.index || 0}">${item.display || item.word || item}</span>
                            `
                                )
                                .join('')}
                        </div>
                        <div class="word-answer" id="${wordAnswerId}">
                            <div class="answer-placeholder">Click words above to build sentence</div>
                        </div>
                        <div class="word-order-actions" style="display: flex; gap: 20px; margin-top: 10px; justify-content: flex-end; align-items: center;">
                            <button class="word-order-clear-btn" id="${this.getUniqueId('wordOrderClear')}" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 14px; font-weight: bold; min-width: 100px;" 
                                onmouseover="this.style.background='#c82333'" 
                                onmouseout="this.style.background='#dc3545'">Clear</button>
                            <button class="word-order-submit-btn" id="${this.getUniqueId('wordOrderSubmit')}" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 14px; font-weight: bold; min-width: 120px;" 
                                onmouseover="this.style.background='#218838'" 
                                onmouseout="this.style.background='#28a745'">Check Answer</button>
                        </div>
                    </div>
                `;
                // Add drag and drop or click functionality
                setTimeout(() => {
                    this.setupWordOrder();
                    // Note: word-order has its own built-in Check Answer button
                }, 100);
                break;

            case 'simple-flip':
                // For factoids - show the detail with hero image on back too
                const theme =
                    this.currentCard.theme || this.currentCard.data?.theme;
                let backIcon = null;

                if (theme) {
                    const iconMap = {
                        science: 'science.svg',
                        history: 'history.svg',
                        geography: 'geography.svg',
                        pop_culture: 'pop_culture.svg',
                        technology: 'technology.svg',
                        nature: 'nature.svg',
                        sports: 'sports.svg',
                        literature: 'literature.svg',
                        music: 'music.svg',
                        food_cuisine: 'food_cuisine.svg',
                        film: 'film.svg',
                        gaming: 'gaming.svg',
                        art: 'art.svg',
                        mythology: 'mythology.svg',
                        space: 'space.svg',
                        animals: 'animals.svg',
                        inventions: 'inventions.svg',
                        internet_culture: 'internet_culture.svg',
                        fashion_design: 'fashion_design.svg',
                        ancient_architecture: 'ancient_architecture.svg',
                        archaeology: 'archaology.svg',
                        dinosaurs: 'dinosaurs.png',
                        wicca: 'wicca.svg',
                        famous_lies: 'famous_lies.svg',
                        scandal_mischief: 'scandal_mischief.svg',
                        fame_glory: 'fame_glory.svg',
                        horror_films: 'horrorz_films.svg',
                        language_evolution: 'language_evolution.svg',
                        jokes: 'jokes.svg'
                    };

                    if (iconMap[theme]) {
                        backIcon = `./src/images/categories/${iconMap[theme]}`;
                    }
                }

                // For factoids, clear the challenge area entirely
                inputEl.innerHTML = '';
                questionEl.innerHTML = '';

                // Hide all challenge-related UI
                const challengeContainer = this.modal.querySelector(
                    '.flashcard-challenge-container'
                );
                if (challengeContainer) {
                    challengeContainer.style.display = 'none';
                }

                // Hide the check answer button for simple flip cards
                const checkBtn = this.modal.querySelector(
                    '.flashcard-check-answer-btn'
                );
                if (checkBtn) {
                    checkBtn.style.display = 'none';
                }

                // Hide feedback and continue elements
                const feedbackEl = this.modal.querySelector(
                    '.flashcard-answer-feedback'
                );
                const continueBtn = this.modal.querySelector(
                    '.flashcard-continue-btn'
                );
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
        const selectedElements = [];

        // Click to add words
        wordBank.addEventListener('click', (e) => {
            if (
                e.target.classList.contains('word-chip') &&
                !e.target.classList.contains('selected')
            ) {
                // Mark this specific element as selected and hide it with animation
                e.target.classList.add('selected');
                selectedWords.push(e.target.dataset.word);
                selectedElements.push(e.target);
                
                // Animate the selection - shrink and make semi-transparent
                setTimeout(() => {
                    e.target.style.opacity = '0.15';
                    e.target.style.transform = 'scale(0.8)';
                }, 50);

                // Update answer area with plain text
                wordAnswer.textContent = selectedWords.join(' ');
            }
        });
        
        // Clear button functionality
        const clearBtn = this.modal.querySelector('.word-order-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                // Reset everything - show all hidden words
                selectedWords.length = 0;
                selectedElements.length = 0;
                wordBank.querySelectorAll('.word-chip').forEach(chip => {
                    chip.classList.remove('selected');
                    chip.style.opacity = '1';
                    chip.style.transform = 'scale(1)';
                });
                wordAnswer.innerHTML = '<div class="answer-placeholder">Click words above to build sentence</div>';
            });
        }
        
        // Submit button functionality - our own custom button!
        const submitBtn = this.modal.querySelector('.word-order-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                console.log('Word order submit clicked!');
                this.checkAnswer();
            });
        }

        // Store selected words for checking
        this.getSelectedWords = () => selectedWords.join(' ');
    }

    // Centralized button visibility logic
    updateButtonVisibility() {
        // Find ALL instances of these buttons (there may be multiple)
        const checkBtns = this.modal.querySelectorAll('.flashcard-check-answer-btn, .check-answer-btn');
        const continueBtns = this.modal.querySelectorAll('.flashcard-continue-btn, .continue-btn');
        
        console.log(`updateButtonVisibility called for challengeType: ${this.currentCard?.challengeType}`);
        console.log(`Found ${checkBtns.length} check buttons and ${continueBtns.length} continue buttons`);
        
        // Log button elements for debugging
        checkBtns.forEach((btn, index) => {
            console.log(`Check button ${index}:`, btn, 'Parent:', btn.parentElement);
        });

        // Hide ALL buttons initially
        checkBtns.forEach(btn => {
            btn.style.display = 'none';
        });
        continueBtns.forEach(btn => {
            btn.style.display = 'none';
        });

        // Determine which button to show based on challenge type
        switch (this.currentCard?.challengeType) {
            case 'fill-blank':
            case 'who-said-it':
                // These need Check Answer button ONLY - hide continue buttons FIRST
                continueBtns.forEach(btn => {
                    btn.style.display = 'none';
                    btn.style.visibility = 'hidden';
                });
                // Then show check buttons
                checkBtns.forEach(btn => {
                    btn.style.display = 'block';
                    btn.style.visibility = 'visible';
                    btn.style.opacity = '1';
                    console.log(`Set check button to visible:`, btn);
                });
                console.log(`Showing Check Answer button for ${this.currentCard.challengeType}`);
                break;
                
            case 'word-order':
                // Word-order has its own built-in Check Answer button, hide ALL main buttons
                checkBtns.forEach(btn => {
                    btn.style.display = 'none';
                    btn.style.visibility = 'hidden';
                });
                continueBtns.forEach(btn => {
                    btn.style.display = 'none';
                    btn.style.visibility = 'hidden';
                });
                console.log(`Hiding main buttons for ${this.currentCard.challengeType} (uses built-in button)`);
                break;
                
            case 'multiple-choice':
            case 'true-false':
                // These auto-submit on selection - no buttons needed
                console.log(`Hiding all buttons for ${this.currentCard.challengeType} (auto-submit)`);
                break;
                
            case 'simple-flip':
                // Factoids just need Continue button after flip
                if (this.isFlipped) {
                    continueBtns.forEach(btn => {
                        btn.style.display = 'block';
                    });
                }
                console.log(`Simple flip - Continue button ${this.isFlipped ? 'shown' : 'hidden'}`);
                break;
                
            default:
                // Default for unknown types - show check answer
                checkBtns.forEach(btn => {
                    btn.style.display = 'block';
                });
                console.log('Unknown challenge type - defaulting to Check Answer button');
        }
    }

    // CLEAN NEW BUTTON SYSTEM: Simple submit button for quotes
    createCleanSubmitButton() {
        // Remove any existing submit button
        const existingBtn = this.modal.querySelector('.clean-quote-submit-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // REMOVE ALL legacy buttons entirely to avoid confusion
        const legacyBtns = this.modal.querySelectorAll('.flashcard-check-answer-btn, .check-answer-btn, .flashcard-continue-btn, .continue-btn');
        legacyBtns.forEach(btn => {
            btn.remove(); // Completely remove from DOM instead of just hiding
        });
        console.log(`Removed ${legacyBtns.length} legacy buttons for ${this.currentCard?.challengeType}`);
        
        // GREMLIN-PROOF: Keep removing legacy buttons that try to respawn (QUOTES ONLY)
        if (this.gremlinKiller) {
            clearInterval(this.gremlinKiller);
        }
        this.gremlinKiller = setInterval(() => {
            // Only kill gremlins for quote cards to avoid breaking other card types
            if (this.currentCard?.type === 'quote') {
                const moreLegacyBtns = this.modal.querySelectorAll('.flashcard-check-answer-btn, .check-answer-btn, .flashcard-continue-btn, .continue-btn');
                if (moreLegacyBtns.length > 0) {
                    moreLegacyBtns.forEach(btn => btn.remove());
                    console.log(`🔫 Killed ${moreLegacyBtns.length} respawning gremlin buttons (quotes only)`);
                }
            }
        }, 100); // Check every 100ms for gremlins
        
        // For word-order, don't create a button since it has its own built-in
        if (this.currentCard?.challengeType === 'word-order') {
            console.log('Skipping clean button creation for word-order (has built-in button)');
            return;
        }
        
        // Multiple-choice should have a submit button (removed auto-submit)
        
        // Create clean, simple submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'clean-quote-submit-btn';
        submitBtn.textContent = 'Submit Answer';
        submitBtn.style.cssText = `
            display: block;
            width: 180px;
            margin: 15px auto;
            padding: 10px 20px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s ease;
        `;
        
        // Add hover effect
        submitBtn.addEventListener('mouseenter', () => {
            submitBtn.style.background = '#218838';
        });
        
        submitBtn.addEventListener('mouseleave', () => {
            submitBtn.style.background = '#28a745';
        });
        
        // Add click handler
        submitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`Clean submit button clicked for ${this.currentCard.challengeType}`);
            
            // Disable button immediately to prevent double-clicks
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
            
            this.checkAnswer();
        });
        
        // Find the challenge container and add the button
        const challengeContainer = this.modal.querySelector('.flashcard-challenge-container');
        if (challengeContainer) {
            challengeContainer.appendChild(submitBtn);
            console.log(`Created clean submit button for ${this.currentCard.challengeType}`);
        } else {
            console.error('Could not find challenge container to add submit button');
        }
        
        return submitBtn;
    }

    flipCard() {
        // STEP 1: Prevent double-flipping
        if (this.isFlipped) return;
        
        // Debug position and dimensions for card 2
        if (this.currentIndex === 1) { // Card 2 (0-indexed)
            console.log(`📍 CARD 2 FLIP DEBUG - Before flip, isFlipped: ${this.isFlipped}`);
            const flashcard = document.getElementById('flashcard');
            const flashcardBack = flashcard?.querySelector('.flashcard-back');
            const challengeContainer = flashcard?.querySelector('.flashcard-challenge-container');
            const challengeQuestion = flashcard?.querySelector('.flashcard-challenge-question');
            const challengeInput = flashcard?.querySelector('.flashcard-challenge-input');
            const fillBlankInput = flashcard?.querySelector('.fill-blank-input');
            
            // Check positions and dimensions
            const elements = [
                { name: 'flashcard-back', el: flashcardBack },
                { name: 'challenge-container', el: challengeContainer },
                { name: 'challenge-question', el: challengeQuestion },
                { name: 'challenge-input', el: challengeInput },
                { name: 'fill-blank-input', el: fillBlankInput }
            ];
            
            elements.forEach(({ name, el }) => {
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const computed = window.getComputedStyle(el);
                    console.log(`📐 ${name}:`, {
                        exists: true,
                        position: `x:${rect.x}, y:${rect.y}`,
                        size: `w:${rect.width}, h:${rect.height}`,
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity,
                        zIndex: computed.zIndex,
                        cssPosition: computed.position
                    });
                } else {
                    console.log(`❌ ${name}: NOT FOUND`);
                }
            });
        }

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
                    const theme =
                        this.currentCard.theme ||
                        this.currentCard.data?.theme ||
                        'science';
                    const iconMap = {
                        science: 'science.svg',
                        history: 'history.svg',
                        geography: 'geography.svg',
                        pop_culture: 'pop_culture.svg',
                        technology: 'technology.svg',
                        nature: 'nature.svg',
                        sports: 'sports.svg',
                        literature: 'literature.svg',
                        music: 'music.svg',
                        food_cuisine: 'food_cuisine.svg',
                        film: 'film.svg',
                        gaming: 'gaming.svg',
                        art: 'art.svg',
                        mythology: 'mythology.svg',
                        space: 'space.svg',
                        animals: 'animals.svg',
                        inventions: 'inventions.svg',
                        internet_culture: 'internet_culture.svg',
                        fashion_design: 'fashion_design.svg',
                        ancient_architecture: 'ancient_architecture.svg',
                        archaeology: 'archaology.svg',
                        dinosaurs: 'dinosaurs.png',
                        wicca: 'wicca.svg',
                        famous_lies: 'famous_lies.svg',
                        scandal_mischief: 'scandal_mischief.svg',
                        fame_glory: 'fame_glory.svg',
                        horror_films: 'horrorz_films.svg',
                        language_evolution: 'language_evolution.svg',
                        jokes: 'jokes.svg'
                    };

                    const iconFile = iconMap[theme] || 'science.svg';

                    backEl.innerHTML = `
                    <div class="factoid-back-wrapper">
                        <div class="factoid-back-display">
                            <img src="./src/images/categories/${iconFile}" class="category-hero-icon-back" alt="${theme}">
                            <div class="factoid-detail-label">MIND-BLOWING DETAIL</div>
                            <div class="factoid-twist">
                                ${
                                    this.currentCard.answer ||
                                    this.currentCard.detail ||
                                    'No additional detail available'
                                }
                            </div>
                        </div>
                        <div class="wonder-meter-container" id="wonderMeterInline"></div>
                        
                        <!-- Footer container for flip button -->
                        <div class="factoid-flip-footer">
                            <button class="flip-icon-button flip-icon-back" aria-label="Next card">
                                <img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Next" class="flip-icon">
                            </button>
                        </div>
                    </div>
                `;

                    // Show Wonder Meter after a longer delay to ensure DOM is ready
                    setTimeout(() => {
                        console.log('About to show Wonder Meter...');
                        const container =
                            document.getElementById('wonderMeterInline');
                        console.log(
                            'Container check before calling showWonderMeterInline:',
                            !!container
                        );
                        this.showWonderMeterInline();
                    }, 200);
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
                challengeDiv.setAttribute(
                    'style',
                    'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1000 !important;'
                );
                // console.log('Forcing challenge visible after flip:', this.getUniqueId('challenge'));
            }
        }

        const checkBtn = this.getElement('checkBtn');
        if (checkBtn && this.currentCard.challengeType !== 'multiple-choice') {
            checkBtn.style.display = 'block !important';
            console.log(
                'Forcing check button visible after flip:',
                this.getUniqueId('checkBtn')
            );
        }

        // STEP 7: Focus input after flip animation completes (700ms)
        setTimeout(() => {
            const input = document.querySelector(
                '.fill-blank-input, .author-input'
            );
            if (input) {
                input.focus();
                // NUCLEAR OPTION: Force inputs visible
                input.style.display = 'block !important';
                input.style.opacity = '1 !important';
                input.style.visibility = 'visible !important';
            }
            
            // Debug position AFTER flip for card 2
            if (this.currentIndex === 1) {
                console.log(`📍 CARD 2 FLIP DEBUG - AFTER flip complete`);
                const flashcard = document.getElementById('flashcard');
                const flashcardBack = flashcard?.querySelector('.flashcard-back');
                const fillBlankInput = flashcard?.querySelector('.fill-blank-input');
                
                if (flashcardBack) {
                    const rect = flashcardBack.getBoundingClientRect();
                    const computed = window.getComputedStyle(flashcardBack);
                    console.log(`📐 flashcard-back AFTER FLIP:`, {
                        position: `x:${rect.x}, y:${rect.y}`,
                        size: `w:${rect.width}, h:${rect.height}`,
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity,
                        transform: computed.transform,
                        zIndex: computed.zIndex
                    });
                    
                    // Check if it's positioned at 0,0 or has zero dimensions
                    if (rect.x === 0 && rect.y === 0) {
                        console.error('⚠️ Card 2 back is at 0,0 position!');
                    }
                    if (rect.width === 0 || rect.height === 0) {
                        console.error('⚠️ Card 2 back has zero dimensions!');
                    }
                }
                
                if (fillBlankInput) {
                    const rect = fillBlankInput.getBoundingClientRect();
                    console.log(`📐 fill-blank-input AFTER FLIP:`, {
                        position: `x:${rect.x}, y:${rect.y}`,
                        size: `w:${rect.width}, h:${rect.height}`,
                        exists: true,
                        value: fillBlankInput.value
                    });
                } else {
                    console.error('❌ fill-blank-input NOT FOUND after flip!');
                }
            }

            // STEP 8: Double-check challenge visibility (something keeps hiding it!)
            const challenge = this.getElement('challenge');
            const fillBlankId = `${this.getUniqueId('input')}-fillBlank`;
            const inputEl = document.getElementById(fillBlankId);

            console.log('=== 700ms visibility check ===');
            console.log('Challenge element:', challenge?.style.display);
            console.log('Input element:', inputEl?.style.display);
            console.log(
                'Input computed:',
                inputEl ? window.getComputedStyle(inputEl).display : 'not found'
            );

            if (challenge && challenge.style.display === 'none') {
                console.warn('Challenge was hidden! Forcing visible...');
                challenge.style.cssText =
                    'display: block !important; opacity: 1 !important; visibility: visible !important;';
            }

            if (
                inputEl &&
                window.getComputedStyle(inputEl).display === 'none'
            ) {
                console.warn('Input was hidden! Forcing visible...');
                inputEl.style.cssText =
                    'display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 1200 !important;';
            }
        }, 700);
    }

    flipCardToFront() {
        console.log('flipCardToFront called - advancing to next card');

        // Prevent duplicate transitions
        if (this.isTransitioning) {
            console.log('Already transitioning, skipping flip');
            return;
        }

        this.isTransitioning = true;
        
        // Clean up any lingering bot indicators
        const existingBots = this.modal.querySelectorAll('.bot-feedback-indicator');
        existingBots.forEach(bot => {
            console.log('Cleaning up lingering bot indicator');
            bot.remove();
        });

        // For quote cards, just advance to the next card without flipping back
        // This prevents showing the old quote during transition
        if (this.currentCard?.type === 'quote') {
            console.log('Quote card - skipping flip animation, going straight to next');
            this.isTransitioning = false;
            this.nextCard();
        } else {
            // For other card types, keep the original flip behavior
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
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'style'
                ) {
                    const element = mutation.target;

                    // Only log first few times to avoid spam
                    if (logCount < 5) {
                        console.log(
                            'Style changed on:',
                            element.id || element.className
                        );
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
                if (
                    mutation.target.id === 'cardChallenge' &&
                    mutation.target.children.length === 0
                ) {
                    console.error('cardChallenge EMPTIED!');
                    console.error('Stack trace:', new Error().stack);
                }

                // Check specific elements
                if (
                    mutation.target.id === 'challengeInput' &&
                    mutation.target.innerHTML === ''
                ) {
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
                console.log(
                    'User answer:',
                    userAnswer,
                    'Expected:',
                    this.currentCard.answer
                );

                // More forgiving comparison - ignore case and punctuation
                const normalizedUser = userAnswer
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                const normalizedAnswer = this.currentCard.answer
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
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
                isCorrect =
                    userAnswer.toLowerCase() ===
                    this.currentCard.answer.toLowerCase();
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
                if (this.getSelectedWords) {
                    userAnswer = this.getSelectedWords();
                    console.log(`Word-order: User selected: "${userAnswer}"`);
                    console.log(`Word-order: Expected answer: "${this.currentCard.wordOrderAnswer}"`);
                    // Use the word-order specific answer (truncated version)
                    isCorrect = userAnswer === this.currentCard.wordOrderAnswer;
                    console.log(`Word-order: Is correct: ${isCorrect}`);
                } else {
                    console.error('getSelectedWords function not found! Word order not properly set up.');
                    userAnswer = '';
                    isCorrect = false;
                }
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

        // UI TRANSITION: Hide ALL check buttons after answer is submitted
        const allCheckBtns = this.modal.querySelectorAll('.flashcard-check-answer-btn, .check-answer-btn');
        allCheckBtns.forEach(btn => {
            btn.style.display = 'none';
        });

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
        // Clean up any existing bot indicators first
        const existingBots = this.modal.querySelectorAll('.bot-feedback-indicator');
        existingBots.forEach(bot => {
            console.log('Removing existing bot before creating new one');
            bot.remove();
        });
        
        // Clear any existing flip timer to prevent conflicts
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
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
                feedback.style.cssText =
                    'color: #58cc02; font-weight: bold; margin-top: 10px; animation: fadeIn 0.3s ease;';
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
            const result = await window.economyManager.processFlashcardComplete(
                flashcardResult
            );

            if (result.rewards) {
                // Show rewards using the new RewardsPopup
                window.dispatchEvent(
                    new CustomEvent('rewards:earned', {
                        detail: {
                            rewards: result.rewards,
                            bonuses: result.bonuses || []
                        }
                    })
                );
            }

            // Store for display
            this.lastReward = result.rewards;
        }
    }

    async awardCompletionBonus() {
        const stackSize = this.cards.length;
        const isFactoidSession = this.cards.some(
            (card) => card.challengeType === 'simple-flip'
        );

        // For factoids, always award completion bonus
        if (window.economyManager) {
            // Let the backend calculate the completion bonus
            const completionData = {
                cardsCompleted: stackSize,
                correctAnswers: isFactoidSession ? stackSize : this.score, // Factoids count as all correct
                percentage: isFactoidSession
                    ? 100
                    : Math.round((this.score / this.cards.length) * 100),
                finalStreak: this.streak,
                cardType: isFactoidSession ? 'factoid' : 'quiz'
            };

            // Process completion bonus through EconomyManager
            const result = await window.economyManager.processFlashcardComplete(
                {
                    category: this.cards[0]?.theme || 'general',
                    cardType: isFactoidSession ? 'factoid' : 'flashcard',
                    correctCount: isFactoidSession ? stackSize : this.score,
                    totalCards: stackSize,
                    practiceTime:
                        Date.now() - (this.sessionStartTime || Date.now())
                }
            );
            
            // Mark content as completed for deduplication
            // Get userId from authPanel first, fallback to localStorage
            let userId = null;
            if (window.authPanel && window.authPanel.currentUserId) {
                userId = window.authPanel.currentUserId;
            } else {
                userId = localStorage.getItem('userId');
            }
            
            if (userId && this.cards.length > 0) {
                const contentType = this.cards[0].type || 'trivia';
                
                // Backend expects the set ID, not individual content IDs
                const setId = this.contentSetId;
                if (!setId) {
                    console.error('No content set ID available for completion tracking');
                    return;
                }
                
                try {
                    const apiBase = window.API_URL || 'https://p0qp0q.com';
                    await fetch(`${apiBase}/api/content/${contentType}/sets/complete?user_id=${userId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([setId]) // Send as array with single set ID
                    });
                } catch (error) {
                    console.error('Failed to mark content as completed:', error);
                }
            }

            if (result.rewards) {
                // Show rewards using the new RewardsPopup
                window.dispatchEvent(
                    new CustomEvent('rewards:earned', {
                        detail: {
                            rewards: result.rewards,
                            bonuses: ['Completion Bonus!']
                        }
                    })
                );

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
                    backEl.innerHTML =
                        '<div class="card-challenge flashcard-challenge-container"></div>';
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

        // Update progress bar to show current card progress
        const progress = (this.currentIndex / this.cards.length) * 100;
        document.getElementById(
            'flashcardProgressFill'
        ).style.width = `${progress}%`;

        // Update card counter text
        document.getElementById('flashcardCurrentCard').textContent =
            this.currentIndex + 1;

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

        // Wrap each word in a span for individual animations
        const words = pageContent.text.split(' ');
        jokeText.innerHTML = words
            .map((word) => `<span class="word">${word}</span>`)
            .join(' ');

        // Apply special styling based on content type
        jokeText.className = 'joke-text';
        if (pageContent.textClass) {
            jokeText.classList.add(pageContent.textClass);
        }
        
        // Apply pun-specific footer styling if this is a pun
        const jokeFooter = document.getElementById('jokeFlipFooter');
        if (jokeFooter) {
            if (this.currentCard.type === 'pun') {
                jokeFooter.className = 'pun-flip-footer';
            } else {
                jokeFooter.className = 'joke-flip-footer';
            }
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
            console.log(
                `Playing joke sound: ${pageContent.sound} for page ${this.currentPage}`
            );
            window.soundManager.play(pageContent.sound);
        } else {
            console.log(
                `No sound for page ${this.currentPage}:`,
                pageContent.sound,
                window.soundManager
            );
        }
    }

    getRandomJokeIntroSound() {
        // Fanfare sounds specifically for "Knock knock!" announcement
        const fanfareSounds = [
            'comedy_emphasis/kazoo_fanfare', // Silly kazoo fanfare
            'comedy_stingers/circus_stinger', // Circus fanfare feel
            'comedy_emphasis/timpani_roll', // Dramatic drumroll fanfare
            'comedy_stingers/bigband_ending', // Big band fanfare
            'comedy_stingers/orchestra_stinger', // Orchestra fanfare
            'comedy_emphasis/achievement_unlock', // Achievement fanfare
            'comedy_emphasis/kazoo_fanfare', // Kazoo fanfare (duplicate for variety)
            'comedy_stinger_1920s', // 1920s vaudeville fanfare
            'comedy_emphasis/xylophone_run' // Classic cartoon xylophone fanfare
        ];

        return fanfareSounds[Math.floor(Math.random() * fanfareSounds.length)];
    }

    getRandomPunchlineSound() {
        // 70% chance for classic rimshots, 30% for other sounds
        if (Math.random() < 0.7) {
            // Classic joke stingers (snare + cymbal variations)
            const classicStingers = [
                'comedy_stingers/classic_rimshot', // Ba-dum-tss
                'comedy_stingers/burlesque_rimshot', // Vaudeville style
                'comedy_stingers/quick_rimshot', // Short rimshot
                'comedy_stingers/double_rimshot', // Double ba-dum-tss
                'comedy_stingers/bongo_rimshot' // Bongo variation
            ];
            return classicStingers[
                Math.floor(Math.random() * classicStingers.length)
            ];
        } else {
            // Alternative punchline sounds
            const altSounds = [
                'comedy_stinger_1920s', // 1920s comedy stinger
                'comedy_stingers/ragtime_stinger', // Ragtime comedy ending
                'comedy_stingers/cymbal_only', // Just the crash
                'comedy_emphasis/slide_whistle_down', // Slide whistle
                'trombone_wah_1', // Classic wah-wah
                'comedy_emphasis/cricket_awkward', // Single cricket
                'comedy_emphasis/crickets_silence', // Multiple crickets
                'comedy_emphasis/tumbleweed', // Tumbleweed
                'comedy_emphasis/awkward_cough' // Someone coughing
            ];
            return altSounds[Math.floor(Math.random() * altSounds.length)];
        }
    }

    playQuoteFanfare() {
        // Use the same fanfare sounds for quotes
        const fanfareSound = this.getRandomJokeIntroSound();
        // Check if sound manager exists and has the play method
        if (window.soundManager && typeof window.soundManager.play === 'function') {
            window.soundManager.play(fanfareSound);
        } else if (window.audioManager && typeof window.audioManager.playSound === 'function') {
            window.audioManager.playSound(fanfareSound);
        }
        // If no sound manager available, just continue silently
    }

    generateOptions() {
        // Generate multiple choice options for quotes when not provided
        const correctAnswer = this.currentCard.answer || 'Imagination';
        const distractors = [
            'Knowledge', 'Experience', 'Education', 'Logic', 
            'Memory', 'Analysis', 'Wisdom', 'Understanding',
            'Creativity', 'Innovation', 'Intuition', 'Reasoning'
        ];
        
        // Remove the correct answer from distractors if it's there
        const filtered = distractors.filter(d => 
            d.toLowerCase() !== correctAnswer.toLowerCase()
        );
        
        // Shuffle and pick 3 distractors
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        const selectedDistractors = shuffled.slice(0, 3);
        
        // Combine with correct answer and shuffle again
        const allOptions = [...selectedDistractors, correctAnswer];
        return allOptions.sort(() => Math.random() - 0.5);
    }

    generateScrambledWords() {
        // Take the quote content and scramble the words
        const quote = this.currentCard.content || this.currentCard.answer || '';
        // Remove punctuation and split into words
        const words = quote
            .replace(/[.,!?;:"']/g, '') // Remove punctuation
            .split(/\s+/) // Split by whitespace
            .filter(word => word.length > 0); // Remove empty strings
        
        // Check if quote is too long for word-order challenge
        if (words.length > 18) {
            console.log(`Quote too long for word-order (${words.length} words). Would switch to different challenge type.`);
            // In a full implementation, we'd switch to a different challenge type here
            // For now, we'll just take the first 18 words
            words.splice(18);
        }
        
        // Create indexed words to handle duplicates
        const indexedWords = words.map((word, index) => ({
            word: word,
            index: index,
            display: word // Could add (1), (2) for duplicates if needed
        }));
        
        // Shuffle the indexed words with Fisher-Yates for better randomization
        const scrambled = [...indexedWords];
        for (let i = scrambled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
        }
        
        console.log('Original words:', words);
        console.log('Scrambled words:', scrambled.map(item => item.word));
        
        // Store the correct answer for checking (use the truncated version for word-order)
        this.currentCard.wordOrderAnswer = words.join(' ');
        console.log('Word-order correct answer set to:', this.currentCard.wordOrderAnswer);
        
        return scrambled;
    }

    getRandomResponseSound() {
        // Trombone talk sounds for "Who's there?" responses
        const responseSounds = [
            'experimental/cartoon_trombone_talk', // Cartoon wah-wah voice
            'experimental/vaudeville_trombone', // Old-time vaudeville style
            'speech_patterns/question_rising', // Rising question intonation
            'speech_patterns/angry_speech', // Grumpy/annoyed response
            'abstract_voices/jazz_conversation', // Jazz-style trombone talk
            'abstract_voices/harmon_mute_speech', // Harmon muted trombone
            'basic_effects/waa_waaa_who' // Classic wah-wah-who
        ];

        return responseSounds[
            Math.floor(Math.random() * responseSounds.length)
        ];
    }

    getComedyBotPair() {
        // Select a random pair of comedy bots for this joke
        if (!this.currentComedyBotPair) {
            const botNumber = Math.floor(Math.random() * 5) + 1; // 1-5
            this.currentComedyBotPair = {
                left: `./src/images/comedyBots/comedyBot${String(
                    botNumber * 2 - 1
                ).padStart(2, '0')}.svg`, // 01, 03, 05, 07, 09
                right: `./src/images/comedyBots/comedyBot${String(
                    botNumber * 2
                ).padStart(2, '0')}.svg` // 02, 04, 06, 08, 10
            };
        }
        return this.currentComedyBotPair;
    }

    getJokePageContent() {
        const card = this.currentCard;

        if (card.type === 'knock-knock') {
            const botPair = this.getComedyBotPair();
            const pages = [
                {
                    text: 'Knock knock!',
                    botImage: botPair.left,
                    sound: this.getRandomJokeIntroSound(), // Random comedy intro
                    textClass: 'knock-knock',
                    speaker: 'left'
                },
                {
                    text: "Who's there?",
                    botImage: botPair.right,
                    sound: this.getRandomResponseSound(), // Random trombone voice
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text: card.setupLine || card.whosThere || card.whos_there || 'Orange',
                    botImage: botPair.left,
                    sound: this.getRandomJokeIntroSound(), // Add sound to setup line
                    speaker: 'left'
                },
                {
                    text: `${card.setupLine || card.whosThere || card.whos_there || 'Orange'} who?`,
                    botImage: botPair.right,
                    sound: this.getRandomResponseSound(), // Random trombone voice
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text:
                        card.punchLine || card.punchline ||
                        "Orange you glad I didn't say banana?",
                    botImage: botPair.left,
                    sound: this.getRandomPunchlineSound(), // Random punchline stinger
                    textClass: 'punchline',
                    speaker: 'left'
                }
            ];

            return pages[this.currentPage] || pages[0];
        } else if (card.type === 'pun') {
            const botPair = this.getComedyBotPair();
            // Build the proper response - always repeat the full question
            let naiveResponse = "I don't know...";
            const setupText = card.setupLine || card.setup || card.content;
            if (setupText) {
                // Always repeat the full question after "I don't know"
                naiveResponse = `I don't know, ${setupText.toLowerCase()}`;
            }

            const pages = [
                {
                    text: card.setupLine || card.setup || card.content || "Why don't scientists trust atoms?",
                    botImage: botPair.left,
                    sound: this.getRandomJokeIntroSound(), // Use fanfare for setup
                    speaker: 'left'
                },
                {
                    text: naiveResponse,
                    botImage: botPair.right,
                    sound: this.getRandomResponseSound(), // Use silly sound for middle
                    textClass: 'whos-there',
                    speaker: 'right'
                },
                {
                    text: card.punchLine || card.punchline || 'Because they make up everything!',
                    botImage: botPair.left,
                    sound: this.getRandomPunchlineSound(), // Use punchline stinger
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
        const maxPages =
            card.type === 'knock-knock' ? 5 : card.type === 'pun' ? 3 : 1;

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

        // Hide joke page (footer will hide with it)
        jokeContainer.style.display = 'none';
        container.style.display = 'block';

        // Clear container
        container.innerHTML = '';

        // Add fun sponge bot at the top
        const funSpongeContainer = document.createElement('div');
        funSpongeContainer.className = 'fun-sponge-container';

        // Create animated text with individual word spans
        const words = 'Rate this joke!'.split(' ');
        const animatedText = words
            .map(
                (word, index) =>
                    `<span class="word" style="animation-delay: ${
                        index * 0.3
                    }s">${word}</span>`
            )
            .join(' ');

        // Use a random comedy bot as the fun sponge
        const funSpongeBotNumber = Math.floor(Math.random() * 10) + 1;
        const funSpongeBotPath = `./src/images/comedyBots/comedyBot${String(
            funSpongeBotNumber
        ).padStart(2, '0')}.svg`;

        funSpongeContainer.innerHTML = `
            <img src="${funSpongeBotPath}" class="fun-sponge-bot" alt="Rate this joke">
            <div class="fun-sponge-text joke-text">${animatedText}</div>
        `;
        container.appendChild(funSpongeContainer);

        // Create giggle meter if not exists
        if (!this.giggleMeter) {
            this.giggleMeter = new GiggleMeter();
        }

        // Add meter
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

        // Update progress bar to show current completion
        const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
        document.getElementById(
            'flashcardProgressFill'
        ).style.width = `${progress}%`;
    }

    nextJoke() {
        // Reset for next joke
        this.currentPage = 0;
        this.currentComedyBotPair = null; // Reset bot pair for next joke

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
                streakFill.style.background =
                    'linear-gradient(90deg, #ff4500 0%, #ffd700 100%)';
            } else if (this.quoteStreak >= 3) {
                streakFill.style.background =
                    'linear-gradient(90deg, #ff6b6b 0%, #ffa500 100%)';
            } else {
                streakFill.style.background = '#ff6b6b';
            }
        }
    }

    async showResults() {
        const flashcardContainer =
            document.getElementById('flashcardContainer');

        // Check if this was a factoid session
        const isFactoidSession = this.cards.some(
            (card) => card.challengeType === 'simple-flip'
        );

        // Check if this was a joke session (knock-knock or puns)
        const isJokeSession = this.cards.some(
            (card) => card.type === 'knock-knock' || card.type === 'pun'
        );

        // For joke sessions, show joke ratings summary
        if (isJokeSession) {
            this.showJokeResults();
            return;
        }

        // For factoid sessions, show factoid results
        if (isFactoidSession) {
            this.showFactoidResults();
            return;
        }
        
        // For quote sessions, show quote results
        const isQuoteSession = this.cards.some(card => card.type === 'quote' || card.category === 'famous_quotes');
        if (isQuoteSession) {
            this.showQuoteResults();
            return;
        }

        // Award completion rewards
        const rewards = await this.awardCompletionBonus();

        if (isFactoidSession) {
            // Get the category bot from the last card
            const lastCard = this.cards[this.cards.length - 1];
            const theme = lastCard.theme || lastCard.data?.theme || 'science';
            const iconMap = {
                science: 'science.svg',
                history: 'history.svg',
                geography: 'geography.svg',
                pop_culture: 'pop_culture.svg',
                technology: 'technology.svg',
                nature: 'nature.svg',
                sports: 'sports.svg',
                literature: 'literature.svg',
                music: 'music.svg',
                food_cuisine: 'food_cuisine.svg',
                film: 'film.svg',
                gaming: 'gaming.svg',
                art: 'art.svg',
                mythology: 'mythology.svg',
                space: 'space.svg',
                animals: 'animals.svg',
                inventions: 'inventions.svg',
                internet_culture: 'internet_culture.svg'
            };
            const iconFile = iconMap[theme] || 'science.svg';

            // Factoid-specific results screen
            flashcardContainer.innerHTML = `
                <div class="results-screen factoid-results">
                    <div class="results-bot-container">
                        <img src="./src/images/categories/${iconFile}" class="results-category-bot" alt="${theme}">
                    </div>
                    <h2 class="jazzy-title">Mind = Blown!</h2>
                    <div class="results-stats">
                        <div class="result-stat">
                            <span class="stat-value jazzy-number">${this.cards.length}</span>
                            <span class="stat-label">Facts Studied</span>
                        </div>
                    </div>
                    
                    <!-- Rewards Bar positioned at bottom -->
                    <div class="rewards-bar-container-bottom">
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
                            size: 'medium', // Options: 'small', 'medium', 'large'
                            theme: 'dark' // Options: 'dark', 'light'
                        });
                    }, 300); // Delay for visual flow
                }
            }
        } else {
            // Regular quiz results screen (quotes, challenges, etc.)
            const percentage = Math.round(
                (this.score / this.cards.length) * 100
            );

            // Determine card type for specific styling
            const cardType =
                this.cards[0]?.challengeType ||
                this.cards[0]?.type ||
                'general';
            let resultClass = 'general-results';

            if (cardType === 'quote-author' || cardType === 'quote-complete') {
                resultClass = 'quote-results';
            } else if (cardType === 'word-order') {
                resultClass = 'word-order-results';
            } else if (cardType === 'true-false') {
                resultClass = 'true-false-results';
            }

            flashcardContainer.innerHTML = `
                <div class="results-screen ${resultClass}">
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
        }

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

    getQuoteMessage(percentage) {
        if (percentage === 100) {
            return "📜 Wisdom mastered! You know your quotes!";
        } else if (percentage >= 80) {
            return '🎯 Excellent! Your quote knowledge is impressive!';
        } else if (percentage >= 60) {
            return '💡 Good work! Keep studying those famous words!';
        } else if (percentage >= 40) {
            return "📚 Nice effort! More quote practice ahead!";
        } else {
            return "🌟 Every quote master started somewhere!";
        }
    }

    generateQuoteReviewMessage(authors, randomQuote) {
        const openings = [
            "Great work! You learned famous quotes from",
            "Awesome session! You explored wisdom from", 
            "Nice job! You discovered quotes by",
            "Well done! You studied the words of"
        ];
        
        const transitions = [
            "My favorite was",
            "I especially loved",
            "This one stood out",
            "Here's a gem"
        ];
        
        const closings = [
            "Keep collecting wisdom!",
            "These words are timeless!",
            "Great minds think alike!",
            "Wisdom never goes out of style!"
        ];
        
        const opening = openings[Math.floor(Math.random() * openings.length)];
        const transition = transitions[Math.floor(Math.random() * transitions.length)];
        const closing = closings[Math.floor(Math.random() * closings.length)];
        
        // Limit to 3 random authors maximum
        let selectedAuthors = authors;
        if (authors.length > 3) {
            // Shuffle authors and take first 3
            selectedAuthors = [...authors].sort(() => Math.random() - 0.5).slice(0, 3);
        }
        
        // Format authors list
        let authorList;
        if (selectedAuthors.length === 1) {
            authorList = selectedAuthors[0];
        } else if (selectedAuthors.length === 2) {
            authorList = `${selectedAuthors[0]} and ${selectedAuthors[1]}`;
        } else {
            authorList = `${selectedAuthors.slice(0, -1).join(', ')}, and ${selectedAuthors[selectedAuthors.length - 1]}`;
        }
        
        return `${opening} ${authorList}. ${transition}: "${randomQuote.content}" - ${randomQuote.author}. ${closing}`;
    }

    async showJokeResults() {
        const flashcardContainer =
            document.getElementById('flashcardContainer');

        // Update progress to show completion
        document.getElementById('flashcardCurrentCard').textContent =
            this.cards.length;
        document.getElementById('flashcardProgressFill').style.width = '100%';

        // Calculate average rating
        const avgRating =
            this.jokeRatings.reduce((sum, r) => sum + r.rating, 0) /
            this.jokeRatings.length;
        const avgStars = Math.round(avgRating / 20); // Convert 0-100 to 0-5 stars

        // Determine joke type for specific styling
        const jokeType = this.cards[0]?.type || 'joke';

        // Award points and get rewards
        const rewards = await this.awardJokeCompletionBonus(avgRating);

        // Select a random comedy bot for the results screen
        const resultBotNumber = Math.floor(Math.random() * 10) + 1;
        const resultBotPath = `./src/images/comedyBots/comedyBot${String(
            resultBotNumber
        ).padStart(2, '0')}.svg`;

        const resultClass =
            jokeType === 'knock-knock'
                ? 'knock-knock-results'
                : jokeType === 'pun'
                ? 'pun-results'
                : 'joke-results';

        // Add class to modal for specific styling
        this.modal.className = `flashcard-modal active ${resultClass}-modal`;

        flashcardContainer.innerHTML = `
            <div class="results-screen ${resultClass}">
                <div class="results-bot-container-large">
                    <img src="${resultBotPath}" class="results-comedy-bot-large" alt="Comedy Bot" style="width: 400px; height: 400px; margin: 5px auto; display: block;">
                </div>
                
                <!-- Large black container for rewards -->
                <div class="rewards-container-large">
                    <div class="rewards-bar" id="rewardsBar-jokes">
                        <!-- Spinner slots will be added here -->
                    </div>
                </div>
                
                <!-- Footer container for done button -->
                <div class="results-footer" style="margin-top: 15px; padding: 10px; background: transparent; text-align: right;">
                    <button class="btn-primary done-button" onclick="window.flashcardModal.close()">Done</button>
                </div>
            </div>
        `;

        // Use RewardsDisplay component to animate rewards with slot machine effect
        console.log('DEBUG: showJokeResults - JOKE TYPE:', jokeType, 'checking rewards display:', {
            hasRewardsDisplay: !!this.rewardsDisplay,
            rewardsDisplayAnimating: this.rewardsDisplay ? this.rewardsDisplay.isAnimating : 'no-instance',
            rewards: rewards,
            jokeType: jokeType,
            windowRewardsDisplay: !!window.RewardsDisplay
        });
        
        if (this.rewardsDisplay && rewards) {
            const rewardsContainer = document.getElementById('rewardsBar-jokes');
            console.log('DEBUG: JOKE TYPE:', jokeType, 'Found rewardsBar-jokes container:', !!rewardsContainer);
            if (rewardsContainer) {
                console.log('DEBUG: JOKE TYPE:', jokeType, 'Calling rewardsDisplay.show(), isAnimating before:', this.rewardsDisplay.isAnimating);
                setTimeout(() => {
                    this.rewardsDisplay.show(rewards, rewardsContainer, {
                        size: 'large', // Use large size for joke results
                        theme: 'dark' // Dark theme for consistency
                    }).then(() => {
                        console.log('DEBUG: JOKE TYPE:', jokeType, 'Rewards display complete, isAnimating after:', this.rewardsDisplay.isAnimating);
                    }).catch(err => {
                        console.error('DEBUG: JOKE TYPE:', jokeType, 'Rewards display failed:', err);
                    });
                }, 300); // Small delay for visual flow
            }
        } else if (!this.rewardsDisplay) {
            console.log('DEBUG: JOKE TYPE:', jokeType, 'No rewardsDisplay instance, trying to reinitialize');
            if (window.RewardsDisplay) {
                this.rewardsDisplay = new window.RewardsDisplay();
                console.log('DEBUG: JOKE TYPE:', jokeType, 'Reinitialized rewardsDisplay');
            }
        } else if (this.rewardsDisplay.isAnimating) {
            console.log('DEBUG: JOKE TYPE:', jokeType, 'RewardsDisplay is animating, creating fresh instance');
            // Create a fresh instance if the current one is animating
            if (window.RewardsDisplay) {
                const freshRewardsDisplay = new window.RewardsDisplay();
                const rewardsContainer = document.getElementById('rewardsBar-jokes');
                if (rewardsContainer) {
                    setTimeout(() => {
                        freshRewardsDisplay.show(rewards, rewardsContainer, {
                            size: 'large',
                            theme: 'dark'
                        }).then(() => {
                            console.log('DEBUG: JOKE TYPE:', jokeType, 'Fresh rewards display complete');
                        }).catch(err => {
                            console.error('DEBUG: JOKE TYPE:', jokeType, 'Fresh rewards display failed:', err);
                        });
                    }, 300);
                }
            }
        } else {
            // Fallback to manual display if RewardsDisplay not available
            setTimeout(() => {
                console.log(
                    'DEBUG showJokeResults: About to display rewards:',
                    rewards
                );
                if (rewards) {
                    const rewardsContainer = document.getElementById('rewardsBar-jokes');
                    console.log(
                        'DEBUG showJokeResults: Found container:',
                        !!rewardsContainer
                    );
                    if (rewardsContainer) {
                        // Clear and populate with actual rewards
                        rewardsContainer.innerHTML = '';

                        // Define icon mapping for all potential rewards - in display order
                        const iconMap = {
                            xp: 'src/images/economy-icons/xpIcon.svg',
                            coins: 'src/images/economy-icons/coinIcon.svg',
                            hearts: 'src/images/economy-icons/heartIcon.svg',
                            keys: 'src/images/economy-icons/keyIcon.svg',
                            tickets: 'src/images/economy-icons/ticketIcon.svg',
                            giftBox: 'src/images/economy-icons/giftBox.svg',
                            prizeBox: 'src/images/economy-icons/giftBox.svg',
                            gems: 'src/images/economy-icons/gemIcon.svg',
                            diamonds: 'src/images/power-icons/diamonds.svg',
                            sapphires: 'src/images/economy-icons/gemIcon.svg',
                            emeralds: 'src/images/economy-icons/gemIcon.svg',
                            rubies: 'src/images/economy-icons/gemIcon.svg',
                            amethysts: 'src/images/economy-icons/gemIcon.svg'
                        };

                        // Define the 7 slot types we always show
                        const slotTypes = [
                            'xp',
                            'coins',
                            'sapphires',
                            'keys',
                            'tickets',
                            'giftBox',
                            'hearts'
                        ];

                    // Display all 7 slots
                    for (const type of slotTypes) {
                        const amount = rewards[type] || 0; // Get amount or 0 if not in rewards
                        const icon =
                            iconMap[type] ||
                            'src/images/economy-icons/gemIcon.svg'; // Fallback
                        const slot = document.createElement('div');
                        slot.className = 'reward-slot';
                        slot.style.cssText =
                            'display: flex !important; flex-direction: column !important; align-items: center !important; opacity: 1 !important; visibility: visible !important; position: relative !important; overflow: visible !important; height: auto !important; width: auto !important; padding: 0 !important; margin: 0 !important; background: none !important; border: none !important;';

                        // Get dynamic color filter based on type and value
                        let filterStyle = '';
                        if (type === 'coins') {
                            // Bronze to gold based on value
                            if (amount <= 20)
                                filterStyle =
                                    'invert(48%) sepia(26%) saturate(1107%) hue-rotate(357deg) brightness(91%) contrast(87%)'; // Bronze
                            else if (amount <= 50)
                                filterStyle =
                                    'invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'; // Silver
                            else if (amount <= 100)
                                filterStyle =
                                    'invert(72%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(103%) contrast(106%)'; // Gold
                            else
                                filterStyle =
                                    'invert(82%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(120%) contrast(106%)'; // Bright gold
                        } else if (type === 'xp') {
                            // Heat map for XP
                            if (amount <= 10)
                                filterStyle =
                                    'hue-rotate(200deg) saturate(150%)'; // Deep blue
                            else if (amount <= 25)
                                filterStyle =
                                    'hue-rotate(180deg) saturate(150%)'; // Light blue
                            else if (amount <= 50)
                                filterStyle =
                                    'hue-rotate(120deg) saturate(150%)'; // Cyan
                            else if (amount <= 100)
                                filterStyle =
                                    'hue-rotate(60deg) saturate(150%)'; // Yellow-green
                            else if (amount <= 200)
                                filterStyle =
                                    'hue-rotate(30deg) saturate(150%)'; // Orange
                            else
                                filterStyle =
                                    'hue-rotate(0deg) saturate(200%) brightness(110%)'; // Hot red
                        } else if (
                            [
                                'sapphires',
                                'emeralds',
                                'rubies',
                                'amethysts',
                                'diamonds'
                            ].includes(type)
                        ) {
                            // Gem colors
                            const gemFilters = {
                                sapphires:
                                    'invert(53%) sepia(92%) saturate(2409%) hue-rotate(192deg) brightness(92%) contrast(85%)',
                                emeralds:
                                    'invert(77%) sepia(39%) saturate(578%) hue-rotate(83deg) brightness(89%) contrast(85%)',
                                rubies: 'invert(42%) sepia(88%) saturate(2468%) hue-rotate(345deg) brightness(95%) contrast(85%)',
                                amethysts:
                                    'invert(71%) sepia(25%) saturate(1844%) hue-rotate(215deg) brightness(97%) contrast(101%)',
                                diamonds:
                                    'invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
                            };
                            filterStyle = gemFilters[type] || '';
                        }

                        // Just create a single icon - no spinning for now
                        const img = document.createElement('img');
                        img.src = icon;
                        img.className = 'reward-icon';
                        img.alt = type;
                        // Only apply filter if we have one (not for white icons that need to stay white)
                        const finalFilter = filterStyle || 'none';
                        const opacity = amount > 0 ? '1' : '0.10'; // Very faint if no reward
                        img.style.cssText = `width: 42px !important; height: 42px !important; display: block !important; filter: ${finalFilter} !important; opacity: ${opacity} !important; visibility: visible !important;`;

                        // Add spinner animation to the icon itself only if amount > 0
                        if (amount > 0) {
                            img.style.animation = 'spinIcon 2s ease-in-out';
                        }

                        slot.appendChild(img);

                        // Add amount text below icon
                        const span = document.createElement('span');
                        span.className = 'reward-amount';
                        span.textContent = amount.toString();
                        // Show immediately if using debug skip, otherwise animate
                        const showDelay = amount > 0 ? '2s' : '0s';
                        const textOpacity = amount > 0 ? '1' : '0.10';
                        span.style.cssText = `color: white !important; font-size: 18px !important; margin-top: 5px !important; opacity: ${textOpacity} !important;`;

                        slot.appendChild(span);
                        rewardsContainer.appendChild(slot);
                    }
                }
            }
            }, 100); // Small delay to ensure DOM is ready
        }
    }

    getJokeResultMessage(avgRating) {
        if (avgRating >= 80) {
            return '🤣 You found these hilarious! Great sense of humor!';
        } else if (avgRating >= 60) {
            return '😄 You enjoyed most of these! Nice giggle session!';
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

            const result = await window.economyManager.processFlashcardComplete(
                {
                    correct: true, // Always reward participation
                    cardType: 'joke',
                    bonusXP: totalXP,
                    isCompletionBonus: true
                }
            );

            if (result.rewards) {
                window.dispatchEvent(
                    new CustomEvent('rewards:earned', {
                        detail: {
                            rewards: result.rewards,
                            bonuses: ['Comedy Critic Bonus!']
                        }
                    })
                );
                return result.rewards; // Return the rewards!
            }
        }
        return null;
    }

    async showFactoidResults() {
        const flashcardContainer =
            document.getElementById('flashcardContainer');

        // Update progress to show completion
        document.getElementById('flashcardCurrentCard').textContent =
            this.cards.length;
        document.getElementById('flashcardProgressFill').style.width = '100%';

        // Award points and get rewards
        const rewards = await this.awardCompletionBonus();

        // Get the category icon from the last card
        const lastCard = this.cards[this.cards.length - 1];
        const theme = lastCard.theme || lastCard.data?.theme || 'science';
        const iconMap = {
            science: 'science.svg',
            history: 'history.svg',
            geography: 'geography.svg',
            pop_culture: 'pop_culture.svg',
            technology: 'technology.svg',
            nature: 'nature.svg',
            sports: 'sports.svg',
            literature: 'literature.svg',
            music: 'music.svg',
            food_cuisine: 'food_cuisine.svg',
            film: 'film.svg',
            gaming: 'gaming.svg',
            art: 'art.svg',
            mythology: 'mythology.svg',
            space: 'space.svg',
            animals: 'animals.svg',
            inventions: 'inventions.svg',
            internet_culture: 'internet_culture.svg'
        };
        const iconFile = iconMap[theme] || 'science.svg';
        const iconPath = `./src/images/categories/${iconFile}`;

        // Add class to modal for specific styling
        this.modal.className = 'flashcard-modal active factoid-results-modal';
        
        // Debug modal positioning
        const modalRect = this.modal.getBoundingClientRect();
        const flashcardRect = flashcardContainer.getBoundingClientRect();
        console.log('DEBUG: Modal positioning for factoids:', {
            modalRect: { left: modalRect.left, top: modalRect.top, width: modalRect.width, height: modalRect.height },
            flashcardRect: { left: flashcardRect.left, top: flashcardRect.top, width: flashcardRect.width, height: flashcardRect.height },
            modalVisible: modalRect.width > 0 && modalRect.height > 0,
            flashcardVisible: flashcardRect.width > 0 && flashcardRect.height > 0,
            modalDisplay: window.getComputedStyle(this.modal).display,
            modalVisibility: window.getComputedStyle(this.modal).visibility,
            modalZIndex: window.getComputedStyle(this.modal).zIndex
        });

        flashcardContainer.innerHTML = `
            <div class="results-screen factoid-results">
                <div class="results-bot-container-large">
                    <img src="${iconPath}" class="results-category-icon-large" alt="${theme}" style="width: 400px; height: 400px; margin: 5px auto; display: block;">
                </div>
                
                <!-- Large black container for rewards -->
                <div class="rewards-container-large">
                    <div class="rewards-bar" id="rewardsBar-factoids">
                        <!-- Spinner slots will be added here -->
                    </div>
                </div>
                
                <!-- Footer container for done button -->
                <div class="results-footer" style="margin-top: 15px; padding: 10px; background: transparent; text-align: right;">
                    <button class="btn-primary done-button" onclick="window.flashcardModal.close()">Done</button>
                </div>
            </div>
        `;

        // Use RewardsDisplay component to animate rewards with slot machine effect
        console.log('🚨 INITIALIZATION CHECK - FACTOID TYPE: checking rewards:', {
            hasRewardsDisplay: !!this.rewardsDisplay,
            rewardsDisplayAnimating: this.rewardsDisplay ? this.rewardsDisplay.isAnimating : 'no-instance',
            rewards: rewards,
            cardType: 'factoid',
            windowRewardsDisplay: !!window.RewardsDisplay,
            rewardsDisplayType: typeof this.rewardsDisplay,
            windowRewardsDisplayType: typeof window.RewardsDisplay
        });
        
        // Emergency re-initialization if needed
        if (!this.rewardsDisplay && window.RewardsDisplay) {
            console.log('🚨 EMERGENCY REINITIALIZATION: RewardsDisplay was null, creating new instance');
            this.rewardsDisplay = new window.RewardsDisplay();
        }
        
        if (this.rewardsDisplay && rewards) {
            const rewardsContainer = document.getElementById('rewardsBar-factoids');
            console.log('DEBUG: FACTOID TYPE: Found rewardsBar container:', !!rewardsContainer);
            if (rewardsContainer) {
                console.log('DEBUG: FACTOID TYPE: rewardsContainer before RewardsDisplay.show():', {
                    innerHTML: rewardsContainer.innerHTML,
                    className: rewardsContainer.className,
                    style: rewardsContainer.style.cssText,
                    rect: rewardsContainer.getBoundingClientRect()
                });
                console.log('DEBUG: FACTOID TYPE: Calling rewardsDisplay.show(), isAnimating before:', this.rewardsDisplay.isAnimating);
                // Wait for rewards container to be fully rendered and have dimensions
                const waitForContainer = () => {
                    // Force layout recalculation
                    rewardsContainer.offsetHeight; 
                    
                    const rect = rewardsContainer.getBoundingClientRect();
                    console.log('🔬 QUANTUM MEASUREMENT: Container check:', {
                        rect: rect,
                        hasWidth: rect.width > 0,
                        hasHeight: rect.height > 0,
                        offsetWidth: rewardsContainer.offsetWidth,
                        offsetHeight: rewardsContainer.offsetHeight
                    });
                    
                    // Only proceed if container has actual dimensions
                    if (rect.width > 0 && rect.height > 0) {
                        console.log('✅ CONTAINER READY: Starting slot creation');
                        this.rewardsDisplay.show(rewards, rewardsContainer, {
                            size: 'large',
                            theme: 'dark'
                        }).then(() => {
                            console.log('DEBUG: FACTOID TYPE: Rewards display complete, isAnimating after:', this.rewardsDisplay.isAnimating);
                        }).catch(err => {
                            console.error('DEBUG: FACTOID TYPE: Rewards display failed:', err);
                        });
                    } else {
                        console.log('⏳ CONTAINER NOT READY: Retrying in 100ms');
                        setTimeout(waitForContainer, 100); // Retry until container is ready
                    }
                };
                
                // Start checking after initial delay
                setTimeout(waitForContainer, 300);
            }
        } else if (!this.rewardsDisplay) {
            console.log('DEBUG: FACTOID TYPE: No rewardsDisplay instance, trying to reinitialize');
            if (window.RewardsDisplay) {
                this.rewardsDisplay = new window.RewardsDisplay();
                console.log('DEBUG: FACTOID TYPE: Reinitialized rewardsDisplay');
            }
        } else if (this.rewardsDisplay.isAnimating) {
            console.log('DEBUG: FACTOID TYPE: RewardsDisplay is animating, creating fresh instance');
            // Create a fresh instance if the current one is animating
            if (window.RewardsDisplay) {
                const freshRewardsDisplay = new window.RewardsDisplay();
                const rewardsContainer = document.getElementById('rewardsBar-factoids');
                if (rewardsContainer) {
                    setTimeout(() => {
                        freshRewardsDisplay.show(rewards, rewardsContainer, {
                            size: 'large',
                            theme: 'dark'
                        }).then(() => {
                            console.log('DEBUG: FACTOID TYPE: Fresh rewards display complete');
                        }).catch(err => {
                            console.error('DEBUG: FACTOID TYPE: Fresh rewards display failed:', err);
                        });
                    }, 300);
                }
            }
        } else {
            // Fallback to manual display if RewardsDisplay not available
            setTimeout(() => {
                if (rewards) {
                    const rewardsContainer = document.getElementById('rewardsBar-factoids');
                    if (rewardsContainer) {
                        // Clear and populate with actual rewards
                        rewardsContainer.innerHTML = '';

                    // Use same icon mapping and slot types as jokes
                    const iconMap = {
                        xp: 'src/images/economy-icons/xpIcon.svg',
                        coins: 'src/images/economy-icons/coinIcon.svg',
                        hearts: 'src/images/economy-icons/heartIcon.svg',
                        keys: 'src/images/economy-icons/keyIcon.svg',
                        tickets: 'src/images/economy-icons/ticketIcon.svg',
                        giftBox: 'src/images/economy-icons/giftBox.svg',
                        prizeBox: 'src/images/economy-icons/giftBox.svg',
                        gems: 'src/images/economy-icons/gemIcon.svg',
                        diamonds: 'src/images/power-icons/diamonds.svg',
                        sapphires: 'src/images/economy-icons/gemIcon.svg',
                        emeralds: 'src/images/economy-icons/gemIcon.svg',
                        rubies: 'src/images/economy-icons/gemIcon.svg',
                        amethysts: 'src/images/economy-icons/gemIcon.svg'
                    };

                    // Define the 7 slot types we always show
                    const slotTypes = [
                        'xp',
                        'coins',
                        'sapphires',
                        'keys',
                        'tickets',
                        'giftBox',
                        'hearts'
                    ];

                    // Display all 7 slots
                    for (const type of slotTypes) {
                        const amount = rewards[type] || 0;
                        const icon =
                            iconMap[type] ||
                            'src/images/economy-icons/gemIcon.svg';
                        const slot = document.createElement('div');
                        slot.className = 'reward-slot';
                        slot.style.cssText =
                            'display: flex !important; flex-direction: column !important; align-items: center !important; opacity: 1 !important; visibility: visible !important; position: relative !important; overflow: visible !important; height: auto !important; width: auto !important; padding: 0 !important; margin: 0 !important; background: none !important; border: none !important;';

                        // Get dynamic color filter based on type and value
                        let filterStyle = '';
                        if (type === 'coins') {
                            if (amount <= 20)
                                filterStyle =
                                    'invert(48%) sepia(26%) saturate(1107%) hue-rotate(357deg) brightness(91%) contrast(87%)';
                            else if (amount <= 50)
                                filterStyle =
                                    'invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)';
                            else if (amount <= 100)
                                filterStyle =
                                    'invert(72%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(103%) contrast(106%)';
                            else
                                filterStyle =
                                    'invert(82%) sepia(73%) saturate(1431%) hue-rotate(8deg) brightness(120%) contrast(106%)';
                        } else if (type === 'xp') {
                            if (amount <= 10)
                                filterStyle =
                                    'hue-rotate(200deg) saturate(150%)';
                            else if (amount <= 25)
                                filterStyle =
                                    'hue-rotate(180deg) saturate(150%)';
                            else if (amount <= 50)
                                filterStyle =
                                    'hue-rotate(120deg) saturate(150%)';
                            else if (amount <= 100)
                                filterStyle =
                                    'hue-rotate(60deg) saturate(150%)';
                            else if (amount <= 200)
                                filterStyle =
                                    'hue-rotate(30deg) saturate(150%)';
                            else
                                filterStyle =
                                    'hue-rotate(0deg) saturate(200%) brightness(110%)';
                        } else if (
                            [
                                'sapphires',
                                'emeralds',
                                'rubies',
                                'amethysts',
                                'diamonds'
                            ].includes(type)
                        ) {
                            const gemFilters = {
                                sapphires:
                                    'invert(53%) sepia(92%) saturate(2409%) hue-rotate(192deg) brightness(92%) contrast(85%)',
                                emeralds:
                                    'invert(77%) sepia(39%) saturate(578%) hue-rotate(83deg) brightness(89%) contrast(85%)',
                                rubies: 'invert(42%) sepia(88%) saturate(2468%) hue-rotate(345deg) brightness(95%) contrast(85%)',
                                amethysts:
                                    'invert(71%) sepia(25%) saturate(1844%) hue-rotate(215deg) brightness(97%) contrast(101%)',
                                diamonds:
                                    'invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)'
                            };
                            filterStyle = gemFilters[type] || '';
                        }

                        // Create icon
                        const img = document.createElement('img');
                        img.src = icon;
                        img.className = 'reward-icon';
                        img.alt = type;
                        const finalFilter = filterStyle || 'none';
                        const opacity = amount > 0 ? '1' : '0.10';
                        img.style.cssText = `width: 42px !important; height: 42px !important; display: block !important; filter: ${finalFilter} !important; opacity: ${opacity} !important; visibility: visible !important;`;

                        if (amount > 0) {
                            img.style.animation = 'spinIcon 2s ease-in-out';
                        }

                        slot.appendChild(img);

                        // Add amount text
                        const span = document.createElement('span');
                        span.className = 'reward-amount';
                        span.textContent = amount.toString();
                        const textOpacity = amount > 0 ? '1' : '0.10';
                        span.style.cssText = `color: white !important; font-size: 18px !important; margin-top: 5px !important; opacity: ${textOpacity} !important;`;

                        slot.appendChild(span);
                        rewardsContainer.appendChild(slot);
                    }
                }
            }
        }, 100);
        }
    }

    async showQuoteResults() {
        const flashcardContainer = document.getElementById('flashcardContainer');

        // Update progress to show completion
        document.getElementById('flashcardCurrentCard').textContent = this.cards.length;
        document.getElementById('flashcardProgressFill').style.width = '100%';

        // Award points and get rewards
        const rewards = await this.awardCompletionBonus();

        // Quote session results
        const correctCount = this.quoteChallengeResults.filter(r => r.correct).length;
        const percentage = Math.round((correctCount / this.cards.length) * 100);

        // Add class to modal for specific styling
        this.modal.className = 'flashcard-modal active quote-results-modal';

        // Generate learning review message
        const authors = [...new Set(this.cards.map(card => card.author).filter(author => author))];
        const randomQuote = this.cards[Math.floor(Math.random() * this.cards.length)];
        const reviewMessage = this.generateQuoteReviewMessage(authors, randomQuote);
        
        // Random quote bot selection from sayWhatBots optimized images
        const quoteBots = [
            'sayWhat01-opt.svg',
            'sayWhat02-opt.svg', 
            'sayWhat03-opt.svg',
            'sayWhat04-opt.svg',
            'sayWhat05-opt.svg'
        ];
        const randomBot = quoteBots[Math.floor(Math.random() * quoteBots.length)];
        
        flashcardContainer.innerHTML = `
            <div class="results-screen quote-results">
                
                <!-- Animated Say What Title -->
                <div class="quote-category">
                    <span class="say-word say-word-1">SAY</span>
                    <span class="say-word say-word-2">WHAT!</span>
                </div>
                
                <!-- Giant Author Bot -->
                <div class="results-bot-container-large">
                    <img src="./src/images/SayWhatBots/${randomBot}" class="results-category-icon-large" alt="Quote Bot" style="width: 200px; height: 200px; margin: 10px auto; display: block; border-radius: 50%;">
                </div>
                
                <div class="learning-review" style="margin: 10px; font-size: 18px; line-height: 1.6; width: calc(100% - 20px); max-width: 100%; color: #E8E8E8; text-align: left; word-wrap: break-word; box-sizing: border-box; overflow-wrap: break-word;">
                    ${reviewMessage}
                </div>
                
                <!-- Large black container for rewards -->
                <div class="rewards-container-large">
                    <div class="rewards-bar" id="rewardsBar-quotes">
                        <!-- Spinner slots will be added here -->
                    </div>
                </div>
                
                <!-- Footer container for done button -->
                <div class="results-footer" style="margin-top: 15px; padding: 10px; background: transparent; text-align: right;">
                    <button class="btn-primary done-button" onclick="window.flashcardModal.close()">Done</button>
                </div>
            </div>
        `;

        // Use RewardsDisplay component to animate rewards with unique instance
        if (this.rewardsDisplay && rewards) {
            const rewardsContainer = document.getElementById('rewardsBar-quotes');
            if (rewardsContainer) {
                // Wait for container to be ready
                const waitForContainer = () => {
                    const rect = rewardsContainer.getBoundingClientRect();
                    
                    if (rect.width > 0 && rect.height > 0) {
                        // Use existing instance but with unique container to avoid conflicts
                        this.rewardsDisplay.show(rewards, rewardsContainer, {
                            size: 'large',
                            theme: 'dark',
                            instanceId: 'quotes' // Add unique instance identifier
                        });
                    } else {
                        setTimeout(waitForContainer, 100);
                    }
                };
                
                setTimeout(waitForContainer, 300);
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

        this.modal.querySelectorAll('.answer-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAnswer(btn.dataset.result === 'correct');
            });
        });

        this.loadCard();
    }

    adjustFlashcardHeight() {
        const flashcard = this.modal.querySelector('.flashcard');
        const flashcardBack = this.modal.querySelector('.flashcard-back');
        
        if (!flashcard || !flashcardBack || !this.isFlipped) return;
        
        // Get the natural height of the back content
        const backHeight = flashcardBack.scrollHeight;
        const currentHeight = flashcard.offsetHeight;
        
        // If back content is taller than current card, expand the card
        if (backHeight > currentHeight) {
            flashcard.style.minHeight = `${backHeight + 40}px`; // Add some padding
            console.log(`📏 Expanded flashcard from ${currentHeight}px to ${backHeight + 40}px`);
        }
    }

    async open(config) {
        // Reset state
        this.cards = [];
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;
        this.currentCard = null;
        this.jokeRatings = [];
        this.quoteStreak = 0;
        this.quoteChallengeResults = [];
        this.sessionStartTime = Date.now();

        // Get user_id for deduplication
        const userId = localStorage.getItem('userId');
        const userParam = userId ? `&user_id=${userId}` : '';
        
        const apiBase = window.API_URL || 'https://p0qp0q.com';
        
        // Map practice categories to API endpoints
        const setEndpoints = {
            bad_puns: `/api/content/pun/sets?count=1`,
            famous_quotes: `/api/content/quote/sets?count=1`,
            knock_knock: `/api/content/joke/sets?count=1`,
            trivia_mix: `/api/content/trivia/sets?count=1`
        };

        const endpoint = setEndpoints[config.category];
        if (!endpoint) {
            console.error('Unknown practice category:', config.category);
            return;
        }

        try {
            // Show modal immediately with loading state
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Get user ID for deduplication from authPanel
            let userId = null;
            let isAuthenticated = false;
            
            if (window.authPanel && window.authPanel.currentUserId) {
                userId = window.authPanel.currentUserId;
                isAuthenticated = true;
            } else {
                // Fallback to localStorage if authPanel not available
                isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
                userId = isAuthenticated ? localStorage.getItem('userId') : null;
            }
            
            console.log('FlashcardModal - Auth status:', isAuthenticated, 'UserId:', userId, 'Source:', window.authPanel ? 'authPanel' : 'localStorage');
            
            // Build URL with user_id parameter if authenticated
            let url = `${apiBase}${endpoint}`;
            if (userId) {
                // Check if endpoint already has query parameters
                const separator = endpoint.includes('?') ? '&' : '?';
                url += `${separator}user_id=${userId}`;
            }
            
            console.log('FlashcardModal - Fetching from URL:', url);
            
            // Fetch content from API
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.status}`);
            }
            
            const data = await response.json();
            
            // API returns an array directly, not {sets: [...]}
            const sets = Array.isArray(data) ? data : (data.sets || []);
            
            if (!sets || sets.length === 0) {
                throw new Error('No content available');
            }
            
            // Process the content based on type
            const contentSet = sets[0];
            
            // Store the content set ID for completion tracking
            this.contentSetId = contentSet.id || null;
            
            this.cards = this.processContentSet(contentSet, config.category);
            
            // Start displaying cards
            this.loadCard();
            
        } catch (error) {
            console.error('Failed to load flashcards:', error);
            this.showError('Failed to load content. Please try again.');
            this.close();
        }
    }

    processContentSet(contentSet, category) {
        // Convert API response to card format expected by FlashcardModal
        switch (category) {
            case 'trivia_mix':
                // API returns data.trivia array
                console.log('DEBUG: Processing trivia_mix contentSet:', contentSet);
                const triviaItems = contentSet.data?.trivia || contentSet.content || [];
                console.log('DEBUG: Found trivia items:', triviaItems.length, triviaItems);
                return triviaItems.map(item => ({
                    id: item.id,
                    type: 'factoid',
                    challengeType: 'simple-flip',
                    category: item.category || 'science',
                    theme: item.theme || item.category || 'science',
                    content: item.fact || item.content,
                    answer: item.answer || item.fun_fact,
                    detail: item.detail || item.answer || item.fun_fact
                }));
                
            case 'famous_quotes':
                // API returns data.quotes array  
                const quoteItems = contentSet.data?.quotes || contentSet.content || [];
                return quoteItems.map(item => ({
                    id: item.id,
                    type: 'quote',
                    challengeType: item.challenge_type || 'fill-blank',
                    content: item.content,
                    author: item.author,
                    challenge: item.challenge,
                    answer: item.answer,
                    options: item.options,
                    scrambled_words: item.scrambled_words
                }));
                
            case 'bad_puns':
                // API returns data.puns array
                const punItems = contentSet.data?.puns || contentSet.content || [];
                return punItems.map(item => ({
                    id: item.id,
                    type: 'pun',
                    setup: item.setup || item.content,
                    response: item.response || item.challenge,
                    punchline: item.punchline
                }));
                
            case 'knock_knock':
                // API returns data.jokes array
                const jokeItems = contentSet.data?.jokes || contentSet.content || [];
                return jokeItems.map(item => ({
                    id: item.id,
                    type: 'knock-knock',
                    whosThere: item.whos_there || item.whosThere,
                    interruption: item.interruption,
                    punchline: item.punchline
                }));
                
            default:
                return [];
        }
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-error';
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
        `;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.remove(), 3000);
    }

    // COMMENTED OUT - This was the old generic showResults that was overriding the proper themed one
    // async showResults() {
    //     // Mark the content set as completed
    //     await this.markSetCompleted();
    //     
    //     // Show results screen
    //     const flashcardContainer = document.getElementById('flashcardContainer');
    //     if (!flashcardContainer) return;
    //     
    //     flashcardContainer.innerHTML = `
    //         <div class="results-screen">
    //             <h2>Great Job!</h2>
    //             <p>You completed all ${this.cards.length} cards!</p>
    //             <div class="results-stats">
    //                 <div>Score: ${this.score}/${this.cards.length}</div>
    //                 <div>Best Streak: ${this.streak}</div>
    //             </div>
    //             <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
    //         </div>
    //     `;
    // }

    // COMMENTED OUT - This was the old generic showJokeResults that was overriding the proper themed one
    // async showJokeResults() {
    //     // Mark the content set as completed
    //     await this.markSetCompleted();
    //     
    //     // Show joke-specific results
    //     const flashcardContainer = document.getElementById('flashcardContainer');
    //     if (!flashcardContainer) return;
    //     
    //     const avgRating = this.jokeRatings.length > 0 
    //         ? Math.round(this.jokeRatings.reduce((sum, r) => sum + r.rating, 0) / this.jokeRatings.length)
    //         : 0;
    //     
    //     flashcardContainer.innerHTML = `
    //         <div class="results-screen joke-results">
    //             <h2>Comedy Show Complete!</h2>
    //             <p>You rated ${this.jokeRatings.length} jokes</p>
    //             <div class="results-stats">
    //                 <div>Average Giggle Rating: ${avgRating}%</div>
    //             </div>
    //             <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
    //         </div>
    //     `;
    // }

    async markSetCompleted() {
        // Get userId from authPanel first, fallback to localStorage
        let userId = null;
        if (window.authPanel && window.authPanel.currentUserId) {
            userId = window.authPanel.currentUserId;
        } else {
            userId = localStorage.getItem('userId');
        }
        
        if (!userId || this.cards.length === 0) return;
        
        const apiBase = window.API_URL || 'https://p0qp0q.com';
        const contentType = this.cards[0].type || 'trivia';
        
        // Backend expects the set ID, not individual content IDs
        const setId = this.contentSetId;
        if (!setId) {
            console.error('No content set ID available for completion tracking');
            return;
        }
        
        // Map card types to API content types
        const typeMap = {
            'factoid': 'trivia',
            'quote': 'quote',
            'pun': 'pun',
            'knock-knock': 'joke'
        };
        
        const apiContentType = typeMap[contentType] || contentType;
        
        try {
            await fetch(`${apiBase}/api/content/${apiContentType}/sets/complete?user_id=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contentIds)
            });
            console.log(`Marked ${contentIds.length} ${apiContentType} items as completed`);
        } catch (error) {
            console.error('Failed to mark content as completed:', error);
        }
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';

        // Clean up debug event listener
        if (this.debugKeyHandler) {
            document.removeEventListener('keydown', this.debugKeyHandler);
        }

        // Release active challenge instance
        if (this.activeChallengeInstance) {
            this.releaseChallengeInstance(this.activeChallengeInstance);
            this.activeChallengeInstance = null;
        }

        // Clean up any dynamic content
        this.cleanupDynamicContent();

        // Clean up all tracked event listeners
        this.eventListeners.forEach(({ element, type, handler }) => {
            element.removeEventListener(type, handler);
        });
        this.eventListeners = [];

        // Reset state
        this.cards = [];
        this.currentIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.isFlipped = false;
        this.currentCard = null;
        this.jokeRatings = [];
        this.quoteStreak = 0;
        this.quoteChallengeResults = [];

        // Reset DOM to initial state
        const flashcardContainer =
            document.getElementById('flashcardContainer');
        if (flashcardContainer) {
            // Restore the original flashcard structure
            flashcardContainer.innerHTML = `
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
                            <span class="nav-icon"><img src="./src/images/navIcons/flipCardFlipperIcon.svg" alt="Next" /></span>
                        </button>
                    </div>
                </div>
                
                <!-- Giggle meter container -->
                <div class="giggle-meter-container" id="giggleMeterContainer" style="display: none;"></div>
            `;

            // Re-attach event listeners to the reset DOM
            this.attachEventListeners();
        }
    }
}

// Initialize flashcard modal
window.flashcardModal = new FlashcardModal();

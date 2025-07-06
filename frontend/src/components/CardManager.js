/**
 * Card Manager
 * Handles dynamic card lifecycle: creation, updates, expiration
 * Syncs with backend for live updates
 */

class CardManager {
    constructor(container) {
        this.container = container;
        this.cards = new Map(); // id -> card instance
        this.cardData = new Map(); // id -> card data
        this.updateInterval = null;
        this.websocket = null;
        this.practiceCardsAdded = false;
        this.practiceCards = []; // Store practice cards separately
        this.cardCreationCount = 0; // Track cards for selective badge display
        this.init();
    }

    init() {
        // Start periodic sync
        this.startSync();
        
        // Set up WebSocket for live updates
        // DISABLED: No WebSocket server on port 3001
        // this.connectWebSocket();
        
        // Listen for card interactions
        window.addEventListener('cardClicked', (e) => this.handleCardAction(e.detail));
        
        // Listen for economy updates to refresh affordability
        window.addEventListener('economyUpdated', () => this.updateAffordability());
        window.addEventListener('statsUpdated', () => this.updateAffordability());
        window.addEventListener('eventsUpdated', () => this.refreshCards());
        
        // Check for expired cards every minute
        setInterval(() => this.removeExpiredCards(), 60000);
    }

    connectWebSocket() {
        // Connect to backend for live card updates
        // Use the API URL to determine WebSocket endpoint
        const apiBase = window.API_URL || 'https://p0qp0q.com';
        const wsHost = apiBase.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${wsHost}:3001/cards`;
        
        // console.log('Attempting WebSocket connection to:', wsUrl);
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleLiveUpdate(message);
            };
            
            this.websocket.onerror = (error) => {
                // console.log('WebSocket error (expected if port 3001 not open):', error);
            };
            
            this.websocket.onclose = () => {
                // Don't reconnect if never connected successfully
                // console.log('WebSocket closed, will not retry');
            };
        } catch (error) {
            // console.log('WebSocket not available, falling back to polling');
        }
    }

    handleLiveUpdate(message) {
        switch (message.type) {
            case 'new-card':
                this.addCard(message.card);
                this.showNewCardAnimation(message.card.id);
                break;
            case 'update-card':
                this.updateCard(message.card.id, message.updates);
                break;
            case 'remove-card':
                this.removeCard(message.cardId);
                break;
            case 'bulk-update':
                this.syncCards(message.cards);
                break;
        }
    }

    async startSync() {
        // console.log('Starting card sync...');
        // Initial load
        await this.fetchCards();
        
        // Periodic sync every 2 minutes (reduced from 30 seconds)
        this.updateInterval = setInterval(() => {
            // console.log('Periodic card sync...');
            this.fetchCards();
        }, 120000);
    }

    async fetchCards() {
        try {
            // Use API URL from environment or default
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            
            // Get quiz limit from card config
            const quizLimit = window.cardConfig ? window.cardConfig.getQuizLimit() : 10;
            // console.log('Fetching cards from:', `${apiBase}/api/cards/active?limit=${quizLimit}`);
            
            // Fetch actual quiz sets instead of promotional cards
            // Note: If this endpoint doesn't exist yet, fall back to cards/active
            let response = await fetch(`${apiBase}/api/content/quiz/sets?count=${quizLimit}`);
            
            // If the new endpoint doesn't exist, try the old one
            if (!response.ok && response.status === 404) {
                console.log('Quiz sets endpoint not found, falling back to cards/active');
                response = await fetch(`${apiBase}/api/cards/active?limit=${quizLimit}`);
            }
            // console.log('Response status:', response.status);
            const data = await response.json();
            // console.log('Received data:', data);
            
            let cards;
            if (data.cards) {
                // Old format from cards/active
                cards = data.cards;
            } else if (Array.isArray(data)) {
                // New format from quiz/sets - transform quiz sets into card format
                cards = data.map(quiz => {
                    return {
                        id: quiz.id,
                        type: 'quiz_tease',
                        template: 'quiz_preview',
                        priority: 10,
                        data: {
                            quiz_id: quiz.id,
                            title: quiz.data.title,
                            description: quiz.data.questions?.[0]?.question || 'Test your knowledge!',
                            category: quiz.data.category,
                            difficulty: quiz.data.difficulty || 'medium',
                            mode: quiz.mode || 'poqpoq',
                            cta: 'Play Now!'
                        },
                        // Pass economics data from quiz set if available
                        economics: quiz.economics || quiz.data?.economics || null,
                        // Store the full quiz data for direct use
                        quizData: quiz
                    };
                });
            } else {
                console.error('Unexpected response format:', data);
                cards = [];
            }
            
            this.syncCards(cards);
        } catch (error) {
            console.error('Failed to fetch cards from backend:', error);
            
            // Fallback to mock data for testing
            this.useMockData();
        }
    }
    
    useMockData() {
        // console.log('No cards available from API');
        
        // Show empty state instead of mock cards
        this.syncCards([]);
        
        // Show empty state message
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }

    syncCards(serverCards) {
        // console.log('Syncing cards. Current cards:', this.cards.size, 'Server cards:', serverCards.length);
        
        // Check if quiz modal is currently open
        const isQuizModalOpen = window.quizModal && window.quizModal.modal && window.quizModal.modal.classList.contains('active');
        if (isQuizModalOpen) {
            // console.log('Quiz modal is open, skipping card sync to prevent interruption');
            return;
        }
        
        // Generate practice cards on first load
        if (!this.practiceCardsAdded && serverCards.length > 0) {
            // Get practice card limit from config
            const cardLimits = window.cardConfig ? window.cardConfig.getCardLimits() : { practice: 3 };
            // Vary the number of practice cards (2-4) for more natural distribution
            const basePracticeCount = cardLimits.practice || 3;
            const targetPracticeCount = Math.min(basePracticeCount, Math.floor(Math.random() * 3) + 2);
            const usedCategories = [];
            
            // Generate and store practice cards
            this.practiceCards = [];
            for (let i = 0; i < targetPracticeCount; i++) {
                const practiceCard = this.generatePracticeCard(usedCategories);
                if (practiceCard) {
                    this.practiceCards.push(practiceCard);
                    usedCategories.push(practiceCard.data.category);
                    // console.log('Generated practice card:', practiceCard.data.title);
                } else {
                    break; // No more unique categories
                }
            }
            
            // Try to add a special card
            // TEMPORARILY DISABLED: Herding game deferred for higher priority items
            /*
            console.log('Attempting to generate special card...');
            const specialCard = this.generateSpecialCard();
            if (specialCard) {
                // Add special card at the beginning to ensure it's visible
                this.practiceCards.unshift(specialCard);
                console.log('Generated special card:', specialCard.data.title);
            } else {
                console.log('Special card not generated (check daily limit or random chance)');
            }
            */
            
            this.practiceCardsAdded = true;
        }
        
        // Mix practice cards randomly with quiz cards
        if (this.practiceCards.length > 0 && serverCards.length > 0) {
            // Create a combined array with better distribution
            const allCards = [];
            
            // Add special cards first (they have type 'special')
            const specialCards = this.practiceCards.filter(card => card.type === 'special');
            const regularPracticeCards = this.practiceCards.filter(card => card.type !== 'special');
            
            // Add special cards at the beginning
            allCards.push(...specialCards);
            
            // Calculate ideal spacing between practice cards
            const totalSlots = serverCards.length + regularPracticeCards.length;
            const practiceInterval = Math.floor(totalSlots / (regularPracticeCards.length + 1));
            
            // Build mixed array with evenly distributed practice cards
            let practiceIndex = 0;
            let position = practiceInterval; // Start after first interval
            
            // Add all quiz cards first
            allCards.push(...serverCards);
            
            // Insert practice cards at calculated intervals
            regularPracticeCards.forEach((practiceCard, index) => {
                // Calculate position for this practice card
                const insertPosition = Math.min(
                    position + index * practiceInterval,
                    allCards.length
                );
                
                // Add some randomness to avoid too-perfect spacing
                const randomOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                const finalPosition = Math.max(1, Math.min(allCards.length, insertPosition + randomOffset));
                
                allCards.splice(finalPosition, 0, practiceCard);
            });
            
            // Replace serverCards with the mixed array
            serverCards = allCards;
            // console.log('Mixed', regularPracticeCards.length, 'practice cards evenly with', serverCards.length - regularPracticeCards.length, 'quiz cards');
        } else if (this.practiceCards.length > 0 && serverCards.length === 0) {
            // If no quiz cards, just show practice cards
            serverCards = [...this.practiceCards];
        }
        
        const serverCardIds = new Set(serverCards.map(card => card.id));
        
        // Remove cards that no longer exist on server
        for (const [id, _] of this.cards) {
            if (!serverCardIds.has(id)) {
                // console.log('Removing old card:', id);
                this.removeCard(id);
            }
        }
        
        // Add or update cards from server
        serverCards.forEach(cardData => {
            if (this.cards.has(cardData.id)) {
                // Update existing card
                const existingData = this.cardData.get(cardData.id);
                // Skip update if data hasn't changed (ignore timestamps and other volatile fields)
                const existingCore = { ...existingData };
                const newCore = { ...cardData };
                // Remove fields that change frequently but don't affect display
                delete existingCore.lastUpdated;
                delete existingCore.timestamp;
                delete newCore.lastUpdated;
                delete newCore.timestamp;
                
                if (JSON.stringify(existingCore) !== JSON.stringify(newCore)) {
                    console.log('Card data changed, updating:', cardData.id);
                    this.updateCard(cardData.id, cardData);
                }
            } else {
                // Add new card
                // console.log('Adding new card:', cardData.id, cardData.type);
                this.addCard(cardData);
            }
        });
        
        // Don't sort cards - preserve the random mix
        // this.sortCards();
    }

    addCard(cardData) {
        // Check if card should be shown based on conditions
        if (!this.shouldShowCard(cardData)) {
            // console.log('Card not shown due to conditions:', cardData.id);
            return;
        }
        
        // Create card config from backend data
        const cardConfig = this.createCardConfig(cardData);
        
        // Create card instance - using enhanced version with economy display
        const card = new GenericCardEnhanced({
            ...cardConfig,
            onAction: (detail) => this.handleCardAction(detail)
        });
        
        // Store references
        this.cards.set(cardData.id, card);
        this.cardData.set(cardData.id, cardData);
        
        // Add to DOM
        const element = card.render();
        // console.log('Card element created:', element);
        element.style.opacity = '0';
        this.container.appendChild(element);
        // console.log('Card added to container. Total cards in DOM:', this.container.children.length);
        
        // Animate in
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '1';
        });
    }

    getQuizStats(data) {
        const stats = [];
        
        // XP based on difficulty (balanced for level progression)
        const xpMap = {
            'easy': 10,
            'medium': 15,
            'hard': 25,
            'expert': 40,
            'varied': 20
        };
        const xp = xpMap[data.difficulty] || 15;
        stats.push({ 
            label: 'XP: ', 
            value: xp.toString()
        });
        
        // Gems based on difficulty (more precious)
        const gemsMap = {
            'easy': 1,
            'medium': 2,
            'hard': 3,
            'expert': 5,
            'varied': 2
        };
        const gems = gemsMap[data.difficulty] || 2;
        stats.push({ 
            label: 'Gems: ', 
            value: gems.toString()
        });
        
        // Quest progress (if applicable)
        const questCategories = ['mythology', 'space', 'ancient_architecture', 'dinosaurs'];
        if (data.category && questCategories.includes(data.category)) {
            // Random quest progress for now
            const current = Math.floor(Math.random() * 3) + 1;
            const total = Math.floor(Math.random() * 3) + 3;
            stats.push({ 
                label: 'QUEST:', 
                value: `${current}/${total}`
            });
        }
        
        return stats;
    }
    
    getCategoryIcon(category) {
        // Map category to icon file path
        const categoryIcons = {
            'science': './src/images/categories/science.svg',
            'history': './src/images/categories/history.svg',
            'technology': './src/images/categories/technology.svg',
            'space': './src/images/categories/space.svg',
            'gaming': './src/images/categories/gaming.svg',
            'art': './src/images/categories/art.svg',
            'mythology': './src/images/categories/mythology.svg',
            'animals': './src/images/categories/animals.svg',
            'inventions': './src/images/categories/inventions.svg',
            'geography': './src/images/categories/geography.svg',
            'nature': './src/images/categories/nature.svg',
            'pop_culture': './src/images/categories/pop_culture.svg',
            'sports': './src/images/categories/sports.svg',
            'food_cuisine': './src/images/categories/food_cuisine.svg',
            'film': './src/images/categories/film.svg',
            'literature': './src/images/categories/literature.svg',
            'music': './src/images/categories/music.svg',
            'ancient_architecture': './src/images/categories/ancient_architecture.svg',
            'archaeology': './src/images/categories/archaeology.svg',
            'collections': './src/images/categories/collections.svg',
            'dinosaurs': './src/images/categories/dinosaurs.png',
            'fame_glory': './src/images/categories/fame_glory.svg',
            'famous_lies': './src/images/categories/famous_lies.svg',
            'fashion_design': './src/images/categories/fashion_design.svg',
            'horror_films': './src/images/categories/horror_films.svg',
            'internet_culture': './src/images/categories/internet_culture.svg',
            'jokes': './src/images/categories/jokes.svg',
            'language_evolution': './src/images/categories/language_evolution.svg',
            'scandal_mischief': './src/images/categories/scandal_mischief.svg',
            'wicca': './src/images/categories/wicca.svg'
        };
        
        // Return icon path if available, otherwise return default SVG
        if (categoryIcons[category]) {
            return `<img src="${categoryIcons[category]}" 
                         alt="" 
                         class="category-icon-img"
                         style="width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;"
                         onload="this.style.opacity='1'">`;
        }
        
        // Use a default SVG icon for unknown categories
        const defaultIcon = './src/images/p0qp0q-clean.svg';  // Or any other default icon
        return `<img src="${defaultIcon}" 
                     alt="Quiz" 
                     class="category-icon-img default-icon"
                     style="width: 100%; height: 100%; object-fit: contain; opacity: 0.7;">`;
    }
    
    getEmojiForCategory(category) {
        // Emoji fallbacks for categories without icons yet
        const emojiMap = {
            'science': '🔬',
            'history': '📜',
            'technology': '💻',
            'literature': '📚',
            'music': '🎵',
            'food_cuisine': '🍴',
            'film': '🎬',
            'gaming': '🎮',
            'art': '🎨',
            'mythology': '🗿',
            'space': '🚀',
            'animals': '🦁',
            'inventions': '💡',
            'internet_culture': '🌐',
            'fashion': '👗',
            'architecture': '🏛️',
            'collections': '🗂️',
            'ancient_architecture': '🏺',
            'dinosaurs': '🦖',
            'fashion_design': '✂️',
            'wicca': '🔮',
            'famous_lies': '🎭',
            'scandal_mischief': '😈',
            'fame_glory': '⭐',
            'horror_films': '👻',
            'revolutions': '✊',
            'language_evolution': '💬',
            'jokes': '😄'
        };
        
        return emojiMap[category] || '🎯';
    }

    createCardConfig(cardData) {
        
        // Handle quiz_preview template cards from backend
        if (cardData.template === 'quiz_preview' && cardData.type === 'quiz_tease') {
            const data = cardData.data;
            const categoryIcon = data.category ? this.getCategoryIcon(data.category) : '⏳';
            
            // Determine theme based on quiz mode
            let theme = 'standard';
            let modeBadge = null;
            
            if (data.mode) {
                switch (data.mode) {
                    case 'chaos':
                        theme = 'chaos';
                        modeBadge = { text: '🌪️ CHAOS', type: 'chaos-mode' };
                        break;
                    case 'zen':
                        theme = 'zen';
                        modeBadge = { text: '🧘 ZEN', type: 'zen-mode' };
                        break;
                    case 'speed':
                        theme = 'speed';
                        modeBadge = { text: '⚡ SPEED', type: 'speed-mode' };
                        break;
                    default:
                        theme = 'standard';
                }
            }
            
            const badges = [];
            
            // Add difficulty badge if difficulty exists
            if (data.difficulty) {
                badges.push({ text: this.capitalize(data.difficulty), type: 'difficulty' });
            }
            
            // Add mode badge if present
            if (modeBadge) {
                badges.unshift(modeBadge); // Add at beginning
            }
            
            // Events are now displayed in the event dots, not on cards
            const events = [];
            
            return {
                id: cardData.id,
                type: 'quiz',
                theme: theme,
                layout: 'vertical',
                events: events,
                // Trust backend economics data
                economics: cardData.economics || data.economics || null,
                data: {
                    header: {
                        icon: categoryIcon,
                        title: this.extractTitle(data.title)
                    },
                    body: {
                        description: this.combineSubtitleAndDescription(data.title, data.description),
                        badges: badges
                    },
                    actions: {
                        primary: { 
                            text: data.cta || 'Play Now!', 
                            action: 'launch-quiz'
                        }
                    }
                    // Removed old stats mockup - now using proper economy display
                },
                component: 'QuizEngine',
                componentConfig: {
                    cardId: cardData.id,
                    quizId: data.quiz_id,
                    category: data.category || 'general',
                    mode: data.mode
                }
            };
        }
        
        // If card has a template object, use it
        if (cardData.template && typeof cardData.template === 'object') {
            const templateConfig = CardTemplates.create(
                cardData.template.type,
                cardData.template.subtype,
                cardData.template.data
            );
            
            return {
                id: cardData.id,
                component: cardData.component,
                componentConfig: cardData.componentConfig,
                ...templateConfig
            };
        }
        
        // Handle generic content types (facts, quotes, tips, etc.)
        if (cardData.type === 'fact' || cardData.type === 'quote' || 
            cardData.type === 'tip' || cardData.type === 'challenge' ||
            cardData.type === 'trivia') {
            
            const contentData = cardData.data || cardData.content || {};
            
            return {
                id: cardData.id,
                type: 'content',
                theme: 'standard',
                icon: this.getContentIcon(cardData.type),
                content: {
                    title: this.getContentTitle(cardData.type, contentData),
                    body: contentData.content || contentData.text || contentData.fact || contentData.quote || '',
                    badges: this.getContentBadges(cardData.type, contentData),
                    stats: []
                },
                actions: this.getContentActions(cardData.type)
            };
        }
        
        // Handle flashcard practice cards
        if (cardData.type === 'practice' || cardData.type === 'flashcard') {
            // Events are now displayed in the event dots, not on cards
            const practiceEvents = [];
            
            return {
                id: cardData.id,
                type: 'practice',
                theme: 'practice',
                layout: 'vertical',
                events: practiceEvents,
                economics: {
                    cost: {
                        energy: 1,  // Flashcards cost 1 energy per session
                        minHearts: 0
                    },
                    rewards: {
                        xp: { min: 10, max: 50 },
                        gems: { min: 0, max: 1 }
                    }
                },
                data: {
                    header: {
                        icon: this.getPracticeIcon(cardData.data?.category),
                        title: cardData.data?.title || 'Practice Mode'
                    },
                    body: {
                        description: cardData.data?.description || 'Test your knowledge and build XP!',
                        badges: [
                            { text: (cardData.data?.cardCount || '10') + ' cards', type: 'info' },
                            { text: cardData.data?.time || '5 min', type: 'timer' }
                        ]
                    },
                    actions: {
                        primary: { 
                            text: 'Start Practice', 
                            action: 'launch-flashcards'
                        }
                    }
                },
                component: 'FlashcardModal',
                componentConfig: {
                    cardId: cardData.id,
                    category: cardData.data?.category,
                    cardType: cardData.data?.cardType
                }
            };
        }
        
        // Handle special cards (like herding game)
        if (cardData.type === 'special') {
            return {
                id: cardData.id,
                type: 'special',
                theme: 'special', // Will have shimmer effect
                layout: 'vertical',
                priority: 'special',
                data: {
                    header: {
                        icon: cardData.data?.icon || '✨',
                        title: cardData.data?.title || 'Special Activity',
                        badges: [
                            { text: 'Daily Special', type: 'highlight' },
                            { text: cardData.data?.duration || '5 min', type: 'timer' }
                        ]
                    },
                    body: {
                        description: cardData.data?.description || 'A unique challenge awaits!',
                        highlights: [
                            { text: cardData.data?.reward || 'Mystery Reward', type: 'reward' }
                        ]
                    },
                    actions: {
                        primary: { 
                            text: 'Play Now', 
                            action: 'launch-herding'
                        }
                    },
                    stats: []
                },
                component: 'HerdingGame',
                componentConfig: {}
            };
        }
        
        // Otherwise build from raw data
        return {
            id: cardData.id,
            type: cardData.type,
            theme: cardData.theme || 'standard',
            component: cardData.component,
            componentConfig: cardData.componentConfig,
            data: cardData.content || cardData.data
        };
    }

    shouldShowCard(cardData) {
        const now = Date.now();
        
        // Check if card is within active time range
        if (cardData.startTime && now < cardData.startTime) return false;
        if (cardData.endTime && now > cardData.endTime) return false;
        
        // Check user conditions (level, achievements, etc)
        if (cardData.conditions) {
            return this.checkConditions(cardData.conditions);
        }
        
        return true;
    }

    checkConditions(conditions) {
        // Get user data
        const userData = {
            level: parseInt(localStorage.getItem('userLevel') || '1'),
            completedQuizzes: JSON.parse(localStorage.getItem('completedQuizzes') || '[]'),
            achievements: JSON.parse(localStorage.getItem('achievements') || '[]')
        };
        
        // Check each condition
        for (const condition of conditions) {
            switch (condition.type) {
                case 'minLevel':
                    if (userData.level < condition.value) return false;
                    break;
                case 'hasAchievement':
                    if (!userData.achievements.includes(condition.value)) return false;
                    break;
                case 'completedQuiz':
                    if (!userData.completedQuizzes.includes(condition.value)) return false;
                    break;
                case 'timeOfDay':
                    const hour = new Date().getHours();
                    if (hour < condition.start || hour > condition.end) return false;
                    break;
            }
        }
        
        return true;
    }

    updateCard(cardId, updates) {
        const card = this.cards.get(cardId);
        if (!card || !card.element) return;
        
        // Update stored data
        const currentData = this.cardData.get(cardId);
        const newData = { ...currentData, ...updates };
        this.cardData.set(cardId, newData);
        
        // Re-create card with updated data
        const config = this.createCardConfig(newData);
        const newCard = new GenericCardEnhanced({
            ...config,
            onAction: (detail) => this.handleCardAction(detail)
        });
        const newElement = newCard.render();
        
        // Replace old element with new one
        card.element.replaceWith(newElement);
        
        // Update references
        newCard.element = newElement;
        this.cards.set(cardId, newCard);
    }

    removeCard(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        // Animate out
        const element = card.element;
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease, margin-bottom 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.95)';
        element.style.marginBottom = `-${element.offsetHeight}px`;
        
        // Remove after animation
        setTimeout(() => {
            // Remove from DOM
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
            
            // Cleanup card instance if it has a destroy method
            if (card.destroy && typeof card.destroy === 'function') {
                card.destroy();
            }
            
            // Remove from tracking
            this.cards.delete(cardId);
            this.cardData.delete(cardId);
        }, 300);
    }

    removeExpiredCards() {
        const now = Date.now();
        
        for (const [id, data] of this.cardData) {
            if (data.endTime && now > data.endTime) {
                this.removeCard(id);
            }
        }
    }
    
    updateAffordability() {
        // Skip if no cards are loaded yet
        if (this.cards.size === 0) {
            // Skip early economy updates before cards are loaded
            return;
        }
        
        // Update the visual state of all cards based on current economy
        this.cards.forEach((card, id) => {
            if (card.element && card.economics) {
                // Simply re-render the entire card to update affordability
                const cardData = this.cardData.get(id);
                if (cardData) {
                    const config = this.createCardConfig(cardData);
                    const newCard = new GenericCardEnhanced({
                        ...config,
                        onAction: (detail) => this.handleCardAction(detail)
                    });
                    const newElement = newCard.render();
                    
                    // Replace old element with new one
                    card.element.replaceWith(newElement);
                    
                    // Update references
                    newCard.element = newElement;
                    this.cards.set(id, newCard);
                }
            }
        });
    }

    sortCards() {
        const sorted = Array.from(this.container.children).sort((a, b) => {
            const aData = this.cardData.get(a.dataset.cardId);
            const bData = this.cardData.get(b.dataset.cardId);
            
            // Sort by priority, then by timestamp
            if (aData.priority !== bData.priority) {
                return (bData.priority || 0) - (aData.priority || 0);
            }
            return (bData.timestamp || 0) - (aData.timestamp || 0);
        });
        
        sorted.forEach(element => this.container.appendChild(element));
    }
    
    refreshCards() {
        // Re-render all cards to show updated events
        this.cards.forEach((card, id) => {
            const cardData = this.cardData.get(id);
            if (cardData && card.element) {
                // Update events on the card data
                const config = this.createCardConfig(cardData);
                
                // Create new card with updated events
                const newCard = new GenericCardEnhanced({
                    ...config,
                    onAction: (detail) => this.handleCardAction(detail)
                });
                const newElement = newCard.render();
                
                // Replace old element with new one
                card.element.replaceWith(newElement);
                
                // Update references
                newCard.element = newElement;
                this.cards.set(id, newCard);
            }
        });
    }

    handleCardAction(detail) {
        const { cardId, action, component, componentConfig } = detail;
        
        // Track interaction
        this.trackCardInteraction(cardId, action);
        
        // Handle action
        switch (action) {
            case 'launch-component':
                this.launchComponent(component, componentConfig);
                break;
            case 'launch-quiz':
                // Launch quiz with the component config (includes mode)
                // console.log('Launching quiz with config:', componentConfig);
                this.launchComponent('QuizEngine', componentConfig);
                // Listen for quiz load failure
                window.addEventListener('quizLoadFailed', (e) => {
                    if (e.detail && e.detail.quizId === componentConfig.quizId) {
                        // console.log(`Removing card ${cardId} - quiz not found`);
                        this.removeCard(cardId);
                    }
                }, { once: true });
                break;
            case 'launch-flashcards':
                // Launch flashcard practice mode
                // console.log('Launching flashcards with config:', componentConfig);
                this.launchComponent('FlashcardModal', componentConfig);
                break;
            case 'launch-herding':
                // Launch herding game
                // console.log('Launching herding game');
                if (window.herdingGame) {
                    window.herdingGame.open();
                    // Mark as played today
                    localStorage.setItem('lastHerdingGame', new Date().toDateString());
                } else {
                    console.error('Herding game not initialized');
                }
                break;
            case 'notify-me':
                this.subscribeToNotifications(cardId);
                break;
            case 'dismiss':
                this.dismissCard(cardId);
                break;
            case 'acknowledge':
            case 'save-quote':
            case 'accept-challenge':
                // Handle content card actions
                this.handleContentAction(cardId, action, detail);
                break;
            default:
                // Emit event for app to handle
                window.dispatchEvent(new CustomEvent('cardAction', { detail }));
        }
    }

    async trackCardInteraction(cardId, action) {
        // Skip tracking for now - no backend
        // console.log('Card interaction:', { cardId, action });
        
        // In future, would track to backend:
        /*
        try {
            await fetch('/api/cards/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, action, timestamp: Date.now() })
            });
        } catch (error) {
            console.error('Failed to track interaction:', error);
        }
        */
    }

    launchComponent(componentName, config) {
        // console.log(`Launching ${componentName} with config:`, config);
        
        // Launch the appropriate component
        switch (componentName) {
            case 'QuizEngine':
                if (window.quizModal) {
                    // Get the full quiz data from our stored data
                    const cardData = this.cardData.get(config.cardId);
                    if (cardData && cardData.quizData) {
                        // Pass the full quiz data instead of just ID
                        window.quizModal.open(cardData.quizData, config);
                    } else {
                        // Fallback to old behavior
                        window.quizModal.open(config.quizId, config);
                    }
                } else if (window.launchQuiz) {
                    window.launchQuiz(config);
                } else {
                    console.error('Quiz modal not initialized');
                }
                break;
            case 'FlashcardModal':
                console.log('Attempting to launch FlashcardModal, checking window.flashcardModal:', window.flashcardModal);
                if (window.flashcardModal) {
                    console.log('FlashcardModal found, calling open with config:', config);
                    window.flashcardModal.open(config);
                } else {
                    console.error('Flashcard modal not initialized');
                }
                break;
            default:
                // console.log('Component not implemented:', componentName);
        }
    }

    showNewCardAnimation(cardId) {
        const card = this.cards.get(cardId);
        if (!card || !card.element) return;
        
        // Add attention-grabbing animation
        card.element.classList.add('new-card-pulse');
        setTimeout(() => {
            card.element.classList.remove('new-card-pulse');
        }, 3000);
    }

    async dismissCard(cardId) {
        // Just remove the card locally for now
        // console.log('Dismissing card:', cardId);
        this.removeCard(cardId);
        
        // In future, would sync with backend:
        /*
        try {
            await fetch(`/api/cards/${cardId}/dismiss`, { method: 'POST' });
            this.removeCard(cardId);
        } catch (error) {
            console.error('Failed to dismiss card:', error);
        }
        */
    }

    getPracticeIcon(category) {
        // Map practice categories to signbot personalities
        const signbotMap = {
            'bad_puns': './src/images/signbots/signbot-happy.svg',        // Happy bot for puns
            'famous_quotes': './src/images/signbots/signbot-thinking.svg', // Thinking bot for quotes
            'knock_knock': './src/images/signbots/signbot-excited.svg',    // Excited bot for knock-knock
            'trivia_mix': './src/images/signbots/signbot-energetic.svg'    // Energetic bot for trivia
        };
        
        // Return signbot SVG image
        if (signbotMap[category]) {
            return `<img src="${signbotMap[category]}" 
                         alt="${category}" 
                         class="signbot-icon"
                         style="width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;"
                         onload="this.style.opacity='1'">`;
        }
        
        // Default to standard signbot
        return `<img src="./src/images/signbots/signbot-standard.svg" 
                     alt="Practice" 
                     class="signbot-icon"
                     style="width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;"
                     onload="this.style.opacity='1'">`;
    }
    
    formatCategory(category) {
        // Special formatting rules for categories
        const categoryNames = {
            'food_cuisine': 'Cuisine',
            'pop_culture': 'Pop Culture', 
            'internet_culture': 'Internet',
            'ancient_architecture': 'Ancient Architecture',
            'fashion_design': 'Fashion Design',
            'language_evolution': 'Language',
            'famous_lies': 'Famous Lies',
            'scandal_mischief': 'Scandals',
            'fame_glory': 'Fame & Glory',
            'horror_films': 'Horror'
        };
        
        // Return special name if exists
        if (categoryNames[category]) {
            return categoryNames[category];
        }
        
        // Default: Convert snake_case to Title Case
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    extractTitle(fullTitle) {
        // If title contains a colon, take the part before it
        if (fullTitle.includes(':')) {
            return fullTitle.split(':')[0].trim();
        }
        // Otherwise return the full title
        return fullTitle;
    }
    
    combineSubtitleAndDescription(fullTitle, description) {
        let combinedText = '';
        
        // If title contains a colon, extract the subtitle
        if (fullTitle.includes(':')) {
            const subtitle = fullTitle.split(':').slice(1).join(':').trim();
            combinedText = subtitle + ' ';
        }
        
        // Add the original description
        if (description) {
            combinedText += description;
        }
        
        return combinedText.trim();
    }
    
    generateSpecialCard() {
        // Check if user has already played today
        const lastPlayed = localStorage.getItem('lastHerdingGame');
        const today = new Date().toDateString();
        
        if (lastPlayed === today) {
            return null; // Already played today
        }
        
        // Small chance to spawn (10%)
        if (Math.random() > 0.99) {  // TEMPORARY: 99% chance for testing
            return null;
        }
        
        const timestamp = Date.now();
        
        return {
            id: `special-herding-${timestamp}`,
            type: 'special',
            priority: 8, // Higher priority than practice
            timestamp: timestamp,
            data: {
                category: 'mindfulness',
                title: 'Mindful Moment',
                description: 'Take a break with a meditative herding puzzle',
                icon: '<img src="./src/images/zen-bot.svg" alt="Mindful Moment" style="width: 100%; height: 100%; object-fit: contain;">',
                duration: '2-3 min',
                reward: '+1 💎 +10 XP'
            }
        };
    }
    
    generatePracticeCard(usedCategories = []) {
        const practiceTypes = [
            {
                category: 'bad_puns',
                title: 'Bad Pun Practice',
                description: 'Groan-worthy wordplay to test your pun tolerance! Can you survive the eye-rolls?',
                cardCount: 10
            },
            {
                category: 'famous_quotes',
                title: 'Famous Quotes Challenge',
                description: 'Who said what? Test your knowledge of memorable words from history!',
                cardCount: 10
            },
            {
                category: 'knock_knock',
                title: 'Knock Knock Jokes',
                description: 'Classic door-based comedy! Perfect for earning hearts while groaning.',
                cardCount: 10
            },
            {
                category: 'trivia_mix',
                title: 'Factoids',
                description: 'Mind-blowing facts with surprising details!',
                cardCount: 10
            }
        ];
        
        // Filter out already used categories
        const availableTypes = practiceTypes.filter(type => !usedCategories.includes(type.category));
        
        // If all categories are used, return null
        if (availableTypes.length === 0) {
            return null;
        }
        
        const practice = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const timestamp = Date.now();
        
        return {
            id: `practice-${practice.category}-${timestamp}`, // Unique ID with timestamp
            type: 'practice',
            priority: 5, // Lower than quizzes
            timestamp: timestamp,
            data: {
                category: practice.category,
                title: practice.title,
                description: practice.description,
                cardCount: practice.cardCount || 10,
                time: `${Math.floor(Math.random() * 3) + 3} min` // 3-5 minutes
            }
        };
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.websocket) {
            this.websocket.close();
        }
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.cardData.clear();
    }
}

// Example backend card data structure:
/*
{
    id: "quiz-2024-12-21-15",
    type: "quiz",
    priority: 10,
    timestamp: 1703170800000,
    startTime: 1703170800000,
    endTime: 1703181600000, // 3 hours lifespan
    conditions: [
        { type: "minLevel", value: 2 }
    ],
    template: {
        type: "quiz",
        subtype: "timeBased",
        data: {
            title: "Afternoon Brain Boost",
            description: "Quick quiz to keep your mind sharp!",
            endTime: 1703181600000,
            multiplier: 1.5,
            icon: "🧠"
        }
    },
    component: "QuizEngine",
    componentConfig: {
        quizId: "auto-gen-2024-12-21-15",
        questions: 10,
        timeLimit: 300,
        topics: ["general", "science"]
    }
}
*/

window.CardManager = CardManager;
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
        this.init();
    }

    init() {
        // Start periodic sync
        this.startSync();
        
        // Set up WebSocket for live updates
        this.connectWebSocket();
        
        // Listen for card interactions
        window.addEventListener('cardClicked', (e) => this.handleCardAction(e.detail));
        
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
        
        console.log('Attempting WebSocket connection to:', wsUrl);
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleLiveUpdate(message);
            };
            
            this.websocket.onerror = (error) => {
                console.log('WebSocket error (expected if port 3001 not open):', error);
            };
            
            this.websocket.onclose = () => {
                // Don't reconnect if never connected successfully
                console.log('WebSocket closed, will not retry');
            };
        } catch (error) {
            console.log('WebSocket not available, falling back to polling');
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
        console.log('Starting card sync...');
        // Initial load
        await this.fetchCards();
        
        // Periodic sync every 30 seconds (backup for WebSocket)
        this.updateInterval = setInterval(() => {
            console.log('Periodic card sync...');
            this.fetchCards();
        }, 30000);
    }

    async fetchCards() {
        try {
            // Use API URL from environment or default
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            console.log('Fetching cards from:', `${apiBase}/api/cards/active`);
            const response = await fetch(`${apiBase}/api/cards/active`);
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Received cards:', data.cards);
            this.syncCards(data.cards);
        } catch (error) {
            console.error('Failed to fetch cards from backend:', error);
            
            // Fallback to mock data for testing
            this.useMockData();
        }
    }
    
    useMockData() {
        console.log('No cards available from API');
        
        // Show empty state instead of mock cards
        this.syncCards([]);
        
        // Show empty state message
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }

    syncCards(serverCards) {
        console.log('Syncing cards. Current cards:', this.cards.size, 'Server cards:', serverCards.length);
        
        // Check if quiz modal is currently open
        const isQuizModalOpen = window.quizModal && window.quizModal.modal && window.quizModal.modal.classList.contains('active');
        if (isQuizModalOpen) {
            console.log('Quiz modal is open, skipping card sync to prevent interruption');
            return;
        }
        
        // Generate practice cards on first load
        if (!this.practiceCardsAdded && serverCards.length > 0) {
            // Target: 30% of initial cards should be practice
            const targetPracticeCount = Math.max(2, Math.ceil(serverCards.length * 0.3));
            const usedCategories = [];
            
            // Generate and store practice cards
            this.practiceCards = [];
            for (let i = 0; i < targetPracticeCount; i++) {
                const practiceCard = this.generatePracticeCard(usedCategories);
                if (practiceCard) {
                    this.practiceCards.push(practiceCard);
                    usedCategories.push(practiceCard.data.category);
                    console.log('Generated practice card:', practiceCard.data.title);
                } else {
                    break; // No more unique categories
                }
            }
            
            // Try to add a special card
            console.log('Attempting to generate special card...');
            const specialCard = this.generateSpecialCard();
            if (specialCard) {
                // Add special card at the beginning to ensure it's visible
                this.practiceCards.unshift(specialCard);
                console.log('Generated special card:', specialCard.data.title);
            } else {
                console.log('Special card not generated (check daily limit or random chance)');
            }
            
            this.practiceCardsAdded = true;
        }
        
        // Mix practice cards randomly with quiz cards
        if (this.practiceCards.length > 0) {
            // Create a combined array with proper mixing
            const allCards = [];
            
            // Add special cards first (they have type 'special')
            const specialCards = this.practiceCards.filter(card => card.type === 'special');
            const regularPracticeCards = this.practiceCards.filter(card => card.type !== 'special');
            
            // Add special cards at the beginning
            allCards.push(...specialCards);
            
            // Then add some quiz cards
            allCards.push(...serverCards);
            
            // Insert regular practice cards at random positions
            regularPracticeCards.forEach(practiceCard => {
                const randomIndex = Math.floor(Math.random() * (allCards.length + 1));
                allCards.splice(randomIndex, 0, practiceCard);
            });
            
            // Replace serverCards with the mixed array
            serverCards = allCards;
            console.log('Mixed', this.practiceCards.length, 'practice cards with quiz cards');
            console.log('Total cards to display:', serverCards.length);
        }
        
        const serverCardIds = new Set(serverCards.map(card => card.id));
        
        // Remove cards that no longer exist on server
        for (const [id, _] of this.cards) {
            if (!serverCardIds.has(id)) {
                console.log('Removing old card:', id);
                this.removeCard(id);
            }
        }
        
        // Add or update cards from server
        serverCards.forEach(cardData => {
            if (this.cards.has(cardData.id)) {
                // Update existing card
                const existingData = this.cardData.get(cardData.id);
                if (JSON.stringify(existingData) !== JSON.stringify(cardData)) {
                    console.log('Updating card:', cardData.id);
                    this.updateCard(cardData.id, cardData);
                }
            } else {
                // Add new card
                console.log('Adding new card:', cardData.id, cardData.type);
                this.addCard(cardData);
            }
        });
        
        // Don't sort cards - preserve the random mix
        // this.sortCards();
    }

    addCard(cardData) {
        // Check if card should be shown based on conditions
        if (!this.shouldShowCard(cardData)) {
            console.log('Card not shown due to conditions:', cardData.id);
            return;
        }
        
        // Create card config from backend data
        const cardConfig = this.createCardConfig(cardData);
        console.log('Card config created:', cardConfig);
        
        // Create card instance
        const card = new GenericCard({
            ...cardConfig,
            onAction: (detail) => this.handleCardAction(detail)
        });
        
        // Store references
        this.cards.set(cardData.id, card);
        this.cardData.set(cardData.id, cardData);
        
        // Add to DOM
        const element = card.render();
        console.log('Card element created:', element);
        element.style.opacity = '0';
        this.container.appendChild(element);
        console.log('Card added to container. Total cards in DOM:', this.container.children.length);
        
        // Animate in
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '1';
        });
    }

    getQuizStats(data) {
        const stats = [];
        
        // XP based on difficulty
        const xpMap = {
            'easy': 30,
            'medium': 50,
            'hard': 100,
            'expert': 150,
            'varied': 75
        };
        const xp = xpMap[data.difficulty] || 50;
        stats.push({ 
            label: 'XP: ', 
            value: xp.toString()
        });
        
        // Gems based on difficulty
        const gemsMap = {
            'easy': 3,
            'medium': 5,
            'hard': 10,
            'expert': 15,
            'varied': 8
        };
        const gems = gemsMap[data.difficulty] || 5;
        stats.push({ 
            label: 'Gems: ', 
            value: gems.toString()
        });
        
        // Quest progress (if applicable)
        const questCategories = ['mythology', 'space', 'ancient_architecture', 'dinosaurs'];
        if (questCategories.includes(data.category)) {
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
            'music': './src/images/categories/music.svg'
        };
        
        // Return icon path if available, otherwise return emoji fallback
        if (categoryIcons[category]) {
            return `<img src="${categoryIcons[category]}" alt="${category}" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
        
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
        console.log('Creating card config for:', cardData);
        
        // Handle quiz_preview template cards from backend
        if (cardData.template === 'quiz_preview' && cardData.type === 'quiz_tease') {
            const data = cardData.data;
            const categoryIcon = this.getCategoryIcon(data.category);
            
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
            
            const badges = [
                { text: this.formatCategory(data.category), type: 'category' },
                { text: this.capitalize(data.difficulty), type: 'difficulty' }
            ];
            
            // Add mode badge if present
            if (modeBadge) {
                badges.unshift(modeBadge); // Add at beginning
            }
            
            return {
                id: cardData.id,
                type: 'quiz',
                theme: theme,
                layout: 'vertical',
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
                    },
                    stats: this.getQuizStats(data)
                },
                component: 'QuizEngine',
                componentConfig: {
                    quizId: data.quiz_id,
                    category: data.category,
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
            return {
                id: cardData.id,
                type: 'practice',
                theme: 'practice',
                layout: 'vertical',
                data: {
                    header: {
                        icon: this.getPracticeIcon(cardData.data?.category),
                        title: cardData.data?.title || 'Practice Mode',
                        badges: [
                            { text: 'Earn Hearts', type: 'reward' },
                            { text: '+' + (cardData.data?.cardCount || '10') + ' cards', type: 'info' }
                        ]
                    },
                    body: {
                        description: cardData.data?.description || 'Test your knowledge and earn hearts!',
                        highlights: [
                            { text: '+1 ❤️ per answer', type: 'reward' },
                            { text: 'Bonus for streaks!', type: 'info' }
                        ]
                    },
                    actions: {
                        primary: { 
                            text: 'Start Practice', 
                            action: 'launch-flashcards'
                        }
                    },
                    stats: [
                        { label: 'Cards: ', value: cardData.data?.cardCount || '10' },
                        { label: 'Time: ', value: cardData.data?.time || '5 min' }
                    ]
                },
                component: 'FlashcardModal',
                componentConfig: {
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
        if (!card) return;
        
        // Update stored data
        const currentData = this.cardData.get(cardId);
        const newData = { ...currentData, ...updates };
        this.cardData.set(cardId, newData);
        
        // Update card display
        card.update(updates);
    }

    removeCard(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        // Animate out
        const element = card.element;
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'scale(0.95)';
        
        // Remove after animation
        setTimeout(() => {
            card.destroy();
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
                console.log('Launching quiz with config:', componentConfig);
                this.launchComponent('QuizEngine', componentConfig);
                // Listen for quiz load failure
                window.addEventListener('quizLoadFailed', (e) => {
                    if (e.detail && e.detail.quizId === componentConfig.quizId) {
                        console.log(`Removing card ${cardId} - quiz not found`);
                        this.removeCard(cardId);
                    }
                }, { once: true });
                break;
            case 'launch-flashcards':
                // Launch flashcard practice mode
                console.log('Launching flashcards with config:', componentConfig);
                this.launchComponent('FlashcardModal', componentConfig);
                break;
            case 'launch-herding':
                // Launch herding game
                console.log('Launching herding game');
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
        console.log('Card interaction:', { cardId, action });
        
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
        console.log(`Launching ${componentName} with config:`, config);
        
        // Launch the appropriate component
        switch (componentName) {
            case 'QuizEngine':
                if (window.quizModal) {
                    // Pass full config including mode
                    window.quizModal.open(config.quizId, config);
                } else if (window.launchQuiz) {
                    window.launchQuiz(config);
                } else {
                    console.error('Quiz modal not initialized');
                }
                break;
            case 'FlashcardModal':
                if (window.flashcardModal) {
                    window.flashcardModal.open(config);
                } else {
                    console.error('Flashcard modal not initialized');
                }
                break;
            default:
                console.log('Component not implemented:', componentName);
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
        console.log('Dismissing card:', cardId);
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
        // Map practice categories to signbot images
        const signbotMap = {
            'bad_puns': '<img src="./src/images/signbots/signbot-happy.svg" alt="Puns" style="width: 100%; height: 100%; object-fit: contain;">',
            'famous_quotes': '<img src="./src/images/signbots/signbot-thinking.svg" alt="Quotes" style="width: 100%; height: 100%; object-fit: contain;">',
            'knock_knock': '<img src="./src/images/signbots/signbot-excited.svg" alt="Knock Knock" style="width: 100%; height: 100%; object-fit: contain;">',
            'trivia_mix': '<img src="./src/images/signbots/signbot-standard.svg" alt="Trivia" style="width: 100%; height: 100%; object-fit: contain;">'
        };
        
        return signbotMap[category] || '🎯';
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
                reward: '+2 💎 +50 XP'
            }
        };
    }
    
    generatePracticeCard(usedCategories = []) {
        const practiceTypes = [
            {
                category: 'bad_puns',
                title: 'Bad Pun Practice',
                description: 'Groan-worthy wordplay to test your pun tolerance! Can you survive the eye-rolls?'
            },
            {
                category: 'famous_quotes',
                title: 'Famous Quotes Challenge',
                description: 'Who said what? Test your knowledge of memorable words from history!'
            },
            {
                category: 'knock_knock',
                title: 'Knock Knock Jokes',
                description: 'Classic door-based comedy! Perfect for earning hearts while groaning.'
            },
            {
                category: 'trivia_mix',
                title: 'Trivia Mix',
                description: 'Random facts and knowledge to keep your brain sharp!'
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
                cardCount: Math.floor(Math.random() * 6) + 10, // 10-15 cards
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
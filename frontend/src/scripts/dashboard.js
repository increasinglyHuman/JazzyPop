/**
 * Dashboard JavaScript
 * Handles user profile, avatar selection, and dashboard interactions
 */

// Generate avatar data from all available bot files
function generateBotList() {
    const botCategories = {
        'angry': 'Angry',
        'beard': 'Beard',
        'crying': 'Cry',
        'eyelash': 'Lash',
        'mustache': 'Stache',
        'tongue': 'Tongue',
        'misc': 'Bot'
    };
    
    // Complete list of all bot files
    const botFiles = [
        'bot-angry-22.svg', 'bot-angry-23.svg', 'bot-angry-24.svg', 'bot-angry-25.svg',
        'bot-angry-26.svg', 'bot-angry-27.svg', 'bot-angry-28.svg', 'bot-angry-29.svg',
        'bot-angry-30.svg', 'bot-angry-31.svg', 'bot-angry-32.svg', 'bot-angry-33.svg',
        'bot-beard-11.svg', 'bot-beard-12.svg', 'bot-beard-13.svg', 'bot-beard-14.svg',
        'bot-crying-1.svg', 'bot-crying-2.svg', 'bot-crying-3.svg', 'bot-crying-4.svg',
        'bot-eyelash-34.svg', 'bot-eyelash-35.svg', 'bot-eyelash-36.svg', 'bot-eyelash-37.svg',
        'bot-misc-5.svg', 'bot-misc-6.svg', 'bot-misc-7.svg', 'bot-misc-8.svg', 'bot-misc-9.svg',
        'bot-misc-10.svg', 'bot-misc-15.svg', 'bot-misc-16.svg', 'bot-misc-17.svg', 'bot-misc-18.svg',
        'bot-misc-19.svg', 'bot-misc-20.svg', 'bot-misc-21.svg', 'bot-misc-38.svg', 'bot-misc-39.svg',
        'bot-misc-40.svg', 'bot-misc-41.svg', 'bot-misc-42.svg', 'bot-misc-43.svg', 'bot-misc-44.svg',
        'bot-misc-45.svg', 'bot-misc-46.svg', 'bot-misc-47.svg', 'bot-misc-48.svg', 'bot-misc-49.svg',
        'bot-misc-50.svg', 'bot-misc-51.svg', 'bot-misc-52.svg', 'bot-misc-53.svg', 'bot-misc-54.svg',
        'bot-misc-55.svg', 'bot-misc-56.svg', 'bot-misc-57.svg', 'bot-misc-58.svg', 'bot-misc-59.svg',
        'bot-misc-60.svg', 'bot-misc-61.svg', 'bot-misc-62.svg', 'bot-misc-63.svg', 'bot-misc-64.svg',
        'bot-misc-65.svg', 'bot-misc-66.svg', 'bot-misc-67.svg', 'bot-misc-68.svg', 'bot-misc-69.svg',
        'bot-misc-70.svg', 'bot-misc-71.svg', 'bot-misc-72.svg', 'bot-misc-73.svg', 'bot-misc-74.svg',
        'bot-misc-75.svg', 'bot-misc-76.svg', 'bot-misc-86.svg', 'bot-misc-87.svg', 'bot-misc-88.svg',
        'bot-misc-89.svg', 'bot-misc-90.svg', 'bot-misc-91.svg', 'bot-misc-92.svg', 'bot-misc-93.svg',
        'bot-misc-94.svg', 'bot-misc-95.svg', 'bot-misc-96.svg', 'bot-misc-97.svg', 'bot-misc-98.svg',
        'bot-misc-99.svg', 'bot-misc-100.svg', 'bot-misc-101.svg', 'bot-misc-107.svg',
        'bot-mustache-77.svg', 'bot-mustache-78.svg', 'bot-mustache-79.svg', 'bot-mustache-80.svg',
        'bot-mustache-81.svg', 'bot-mustache-82.svg', 'bot-mustache-83.svg', 'bot-mustache-84.svg',
        'bot-mustache-85.svg', 'bot-tongue-102.svg', 'bot-tongue-103.svg', 'bot-tongue-104.svg',
        'bot-tongue-105.svg', 'bot-tongue-106.svg'
    ];
    
    const bots = [{ id: 'default', name: 'P0qP0q', file: 'p0qp0q-clean.svg' }];
    
    botFiles.forEach(file => {
        const match = file.match(/bot-(\w+)-(\d+)\.svg/);
        if (match) {
            const [_, category, number] = match;
            const displayName = botCategories[category] || 'Bot';
            bots.push({
                id: file.replace('.svg', ''),
                name: `${displayName} ${number}`,
                file: file
            });
        }
    });
    
    return bots;
}

const allBotFiles = generateBotList();

// User data
let currentAvatar = localStorage.getItem('selectedAvatar') || 'default';
let userName = localStorage.getItem('userName') || 'Anonymous Player';
let userEmail = localStorage.getItem('userEmail') || '';

// PWA install prompt
let deferredPrompt = null;
let installBannerShown = false;

// Initialize dashboard
function init() {
    // Set API URL
    // Always use production API since local doesn't have database access
    window.API_URL = 'https://p0qp0q.com';
    
    // For local development, the production API allows CORS from all origins
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === 'p0qp0q.local') {
        console.log('Local development detected, using production API:', window.API_URL);
    }
    
    // Clean up old user_ format IDs for anonymous users
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId && currentUserId.startsWith('user_')) {
            console.log('Removing old format user ID:', currentUserId);
            localStorage.removeItem('userId');
        }
        
        // Ensure we have a proper session ID
        if (!localStorage.getItem('session_id')) {
            const newSessionId = generateSessionId();
            localStorage.setItem('session_id', newSessionId);
            console.log('Generated new session ID:', newSessionId);
        }
    }
    
    // Initialize Economy Manager first
    if (!window.economyManager) {
        new EconomyManager();
    }
    
    // Display initial economy state
    if (window.economyManager) {
        updateDashboardDisplay(window.economyManager.getDisplayState());
    }
    
    // Initialize auth panel
    if (!window.authPanel) {
        window.authPanel = new AuthPanel();
        window.authPanel.init();
    }
    
    // Check authentication status
    checkAuthStatus();
    
    // Prevent mobile zoom
    preventMobileZoom();
    
    updateAvatarDisplay();
    updateUserInfo();
    populateAvatarRow();
    initializeCardManager();
    initializeBottomNav();
    initGoogleSignIn();  // Initialize Google Sign-In
    initializePWA();     // Initialize PWA install prompt
    startDashboardSync(); // Start syncing dashboard with backend
    
    // Add proper click handler for overlay
    const overlay = document.getElementById('avatarSelectorOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            // Only close if clicking the overlay itself, not its children
            if (e.target === overlay) {
                closeAvatarSelector();
            }
        });
    }
    
    // Dashboard initialized
}

// Prevent mobile zoom issues
function preventMobileZoom() {
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Prevent pinch zoom on iOS
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
}

// Update user info display
function updateUserInfo() {
    // Check for authenticated user
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const displayName = localStorage.getItem('displayName');
    
    if (isAuthenticated && displayName) {
        userName = displayName;
        userEmail = localStorage.getItem('userEmail') || '';
    } else {
        // Check if we have Google user data (legacy)
        const isGoogleUser = localStorage.getItem('isGoogleUser') === 'true';
        if (isGoogleUser) {
            userName = localStorage.getItem('userName') || 'Anonymous Player';
            userEmail = localStorage.getItem('userEmail') || '';
        }
    }
    
    // Update the top-left username display
    document.getElementById('userName').textContent = userName;
}

// Update avatar display
function updateAvatarDisplay() {
    const avatarElement = document.getElementById('userAvatar');
    if (!avatarElement) return;
    
    // Always prefer the selected bot avatar if one is chosen
    const selectedAvatar = localStorage.getItem('selectedAvatar');
    const avatar = allBotFiles.find(a => a.id === selectedAvatar);
    
    if (avatar && avatar.file) {
        // User has selected a bot avatar - use it
        const imagePath = avatar.id === 'default' 
            ? './src/images/p0qp0q-clean.svg'
            : `./src/images/profile-bots/${avatar.file}`;
        
        avatarElement.innerHTML = `<img src="${imagePath}" alt="${avatar.name}">`;
    } else {
        // No bot selected, check for Google profile picture
        const isGoogleUser = localStorage.getItem('isGoogleUser') === 'true';
        const userPicture = localStorage.getItem('userPicture');
        
        if (isGoogleUser && userPicture) {
            // Use Google profile picture as fallback
            avatarElement.innerHTML = `<img src="${userPicture}" alt="${userName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            // Default to p0qp0q
            avatarElement.innerHTML = `<img src="./src/images/p0qp0q-clean.svg" alt="P0qP0q">`;
        }
    }
}

// Populate avatar row with ALL bots
function populateAvatarRow() {
    const row = document.getElementById('avatarRow');
    if (!row) {
        console.error('Avatar row element not found!');
        return;
    }
    row.innerHTML = '';
    
    // Populating avatar row
    
    // TEST: Give avatar row super high z-index
    row.style.position = 'relative';
    row.style.zIndex = '9999';
    
    allBotFiles.forEach((avatar, index) => {
        const option = document.createElement('div');
        option.className = 'avatar-option' + (avatar.id === currentAvatar ? ' selected' : '');
        option.dataset.avatarId = avatar.id;
        
        // Make the entire option clickable
        option.style.cursor = 'pointer';
        option.style.userSelect = 'none';
        
        // Try multiple event types
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectAvatar(avatar.id);
        }, false);
        
        // Mouse events handled by click
        
        option.addEventListener('touchstart', (e) => {
            e.preventDefault();
            selectAvatar(avatar.id);
        }, {passive: false});
        
        const preview = document.createElement('div');
        preview.className = 'avatar-preview';
        preview.style.pointerEvents = 'none'; // Make sure preview doesn't block clicks
        
        if (avatar.file) {
            // Special case for p0qp0q which is in main images folder
            const imagePath = avatar.id === 'default' 
                ? './src/images/p0qp0q-clean.svg'
                : `./src/images/profile-bots/${avatar.file}`;
            preview.innerHTML = `<img src="${imagePath}" alt="${avatar.name}" onerror="this.style.display='none'" style="pointer-events: none;">`;
        }
        
        const name = document.createElement('div');
        name.className = 'avatar-name';
        name.textContent = avatar.name;
        
        option.appendChild(preview);
        option.appendChild(name);
        row.appendChild(option);
    });
    
    // Avatar row populated
    
    // Avatar selection handled by individual element listeners
    
    // Scroll to selected avatar
    setTimeout(() => {
        const selected = row.querySelector('.selected');
        if (selected) {
            selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

// Open avatar selector
function openAvatarSelector() {
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        const overlay = document.getElementById('avatarSelectorOverlay');
        if (!overlay) {
            console.error('Avatar selector overlay not found! Elements in DOM:', {
                overlay: document.getElementById('avatarSelectorOverlay'),
                body: document.body ? 'exists' : 'missing'
            });
            return;
        }
        overlay.classList.add('active');
    // Update input fields with current values (if they exist)
    const nameInput = document.getElementById('userNameInput');
    const emailInput = document.getElementById('userEmailInput');
    if (nameInput) nameInput.value = userName;
    if (emailInput) emailInput.value = userEmail;
    
    // Only populate if not already populated
    const row = document.getElementById('avatarRow');
    if (row && row.children.length === 0) {
        populateAvatarRow();
    }
    
    // Show scroll hint animation after a short delay
    setTimeout(() => {
        const row = document.getElementById('avatarRow');
        row.classList.add('show-hint');
        // Remove the class after animation completes
        setTimeout(() => {
            row.classList.remove('show-hint');
        }, 1500);
    }, 300);
    
    // Set up keyboard scrolling
    setupKeyboardScroll();
    }, 100); // End of setTimeout
}

// Set up keyboard scrolling for avatar selector
function setupKeyboardScroll() {
    const container = document.getElementById('avatarScrollContainer');
    
    // Focus the container so it can receive keyboard events
    container.setAttribute('tabindex', '0');
    container.focus();
    
    // Remove any existing listeners to prevent duplicates
    container.replaceWith(container.cloneNode(true));
    const newContainer = document.getElementById('avatarScrollContainer');
    
    newContainer.addEventListener('keydown', (e) => {
        const scrollAmount = 200; // pixels to scroll
        
        if (e.key === 'ArrowLeft') {
            newContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            newContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        }
    });
}

// Update user name
function updateUserName(newName) {
    userName = newName || 'Anonymous Player';
    localStorage.setItem('userName', userName);
    updateUserInfo();
    syncUserProfile();
}

// Update user email
function updateUserEmail(newEmail) {
    userEmail = newEmail;
    localStorage.setItem('userEmail', userEmail);
    syncUserProfile();
}

// Toast notification function
function showToast(message, type = 'info') {
    // For now, use the alert modal
    if (window.showAlert) {
        window.showAlert(message);
    } else {
        console.log(`Toast [${type}]: ${message}`);
    }
}

// Sign in with Google (placeholder)
// Initialize Google Sign-In
function initGoogleSignIn() {
    // Check if Google Sign-In library is loaded
    if (typeof google === 'undefined') {
        console.warn('Google Sign-In library not loaded');
        return;
    }
    
    try {
        // Initialize with your client ID
        google.accounts.id.initialize({
            client_id: '482342615637-jfht0gsdc4lm58fe8b3v6t60pg7lubhe.apps.googleusercontent.com',
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup',
            itp_support: true
        });
        
        // Google Sign-In initialized
    } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
    }
}

// Update user display with current data
function updateUserDisplay() {
    const userName = localStorage.getItem('userName') || 'Anonymous Player';
    const userEmail = localStorage.getItem('userEmail') || '';
    const userPicture = localStorage.getItem('userPicture') || '';
    const isGoogleUser = localStorage.getItem('isGoogleUser') === 'true';
    
    // Update name
    const nameElement = document.getElementById('userName');
    if (nameElement) {
        nameElement.textContent = userName;
    }
    
    // Update input fields
    const nameInput = document.getElementById('userNameInput');
    if (nameInput) {
        nameInput.value = userName;
    }
    
    const emailInput = document.getElementById('userEmailInput');
    if (emailInput) {
        emailInput.value = userEmail;
    }
    
    // Update avatar if Google user BUT only if no bot avatar is selected
    const selectedAvatar = localStorage.getItem('selectedAvatar');
    if (isGoogleUser && userPicture && !selectedAvatar) {
        const avatarElement = document.getElementById('userAvatar');
        if (avatarElement) {
            avatarElement.innerHTML = `<img src="${userPicture}" alt="${userName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
    }
}

// Handle Google sign-in response
async function handleGoogleSignIn(response) {
    try {
        // Decode the JWT token to get user info
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userInfo = JSON.parse(jsonPayload);
        
        // Update local storage with Google user info
        localStorage.setItem('userName', userInfo.name || 'Google User');
        localStorage.setItem('userEmail', userInfo.email || '');
        localStorage.setItem('userPicture', userInfo.picture || '');
        localStorage.setItem('googleId', userInfo.sub);
        localStorage.setItem('isGoogleUser', 'true');
        
        // Update UI
        updateUserDisplay();
        
        // Close avatar selector if open
        closeAvatarSelector();
        
        // Show success message
        showToast('Successfully signed in with Google!', 'success');
        
        // Sync with backend (when implemented)
        await syncGoogleUser(response.credential);
        
    } catch (error) {
        console.error('Error handling Google sign-in:', error);
        showToast('Failed to sign in with Google', 'error');
    }
}

// Sync Google user with backend
async function syncGoogleUser(credential) {
    try {
        // In production, send the credential to your backend for verification
        /*
        const response = await fetch(`${window.API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('authToken', data.token);
        }
        */
        // Would sync Google user with backend in production
    } catch (error) {
        console.error('Failed to sync with backend:', error);
    }
}

// Updated sign-in function for button click
function signInWithGoogle() {
    
    // Try rendering the button instead
    const buttonDiv = document.getElementById('googleSignInDiv');
    if (buttonDiv && typeof google !== 'undefined' && google.accounts) {
        // Clear any existing content
        buttonDiv.innerHTML = '';
        
        // Render the Google button
        google.accounts.id.renderButton(
            buttonDiv,
            { 
                theme: 'filled_blue',
                size: 'large',
                width: 250,
                text: 'signin_with',
                shape: 'rectangular'
            }
        );
        
        // Auto-click the rendered button
        setTimeout(() => {
            const googleButton = buttonDiv.querySelector('div[role="button"]');
            if (googleButton) {
                googleButton.click();
            }
        }, 100);
    } else {
        console.warn('Google Sign-In not initialized or button div not found');
        showToast('Google Sign-In is not available', 'error');
    }
}

// Close avatar selector
function closeAvatarSelector(event) {
    // Don't close if clicking inside the selector
    if (event && event.target.closest('.avatar-selector')) {
        return;
    }
    if (!event || event.target === event.currentTarget) {
        document.getElementById('avatarSelectorOverlay').classList.remove('active');
    }
}

// Select avatar
function selectAvatar(avatarId) {
    // Update the current avatar
    currentAvatar = avatarId;
    localStorage.setItem('selectedAvatar', avatarId);
    
    // Immediately update the display
    updateAvatarDisplay();
    
    // Update all avatar options to show selection
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.avatarId === avatarId);
    });
    
    // Don't close immediately - let user see their selection
    setTimeout(() => {
        closeAvatarSelector();
    }, 500);
}

// Sync user profile with backend
async function syncUserProfile() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    const profile = {
        userName: localStorage.getItem('userName') || 'Anonymous Player',
        userEmail: localStorage.getItem('userEmail') || '',
        selectedAvatar: localStorage.getItem('selectedAvatar') || 'default'
    };
    
    // For anonymous users, ensure we have a session ID
    if (!isAuthenticated) {
        // Use session ID for anonymous users - don't generate userId
        let sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = generateSessionId();
            localStorage.setItem('session_id', sessionId);
        }
        // Remove any old user_ format IDs for anonymous users
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId && currentUserId.startsWith('user_')) {
            localStorage.removeItem('userId');
        }
    }
    
    // Syncing profile with backend
    
    // In production, send to backend
    try {
        /*
        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        const data = await response.json();
        if (isAuthenticated && data.userId) {
            localStorage.setItem('userId', data.userId);
        }
        */
    } catch (error) {
        console.error('Failed to sync profile:', error);
    }
}

// Generate a session ID for anonymous users
function generateSessionId() {
    // Use timestamp-based format that backend expects for session IDs
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize CardManager
let cardManager;
function initializeCardManager() {
    const container = document.getElementById('cardsContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Initializing CardManager
    
    // Clear any existing cards (old/stale cards)
    container.innerHTML = '';
    
    // Create card manager instance
    cardManager = new CardManager(container);
    
    // Show/hide empty state based on cards
    const checkEmptyState = () => {
        const hasCards = container.children.length > 0;
        emptyState.style.display = hasCards ? 'none' : 'block';
    };
    
    // Monitor card changes
    const observer = new MutationObserver(checkEmptyState);
    observer.observe(container, { childList: true });
    
    // Initial check
    checkEmptyState();
    
    // Create sample cards for testing
    // Commenting out for now to reduce console errors
    // createSampleCards();
}

// Create sample cards
function createSampleCards() {
    // Sample quiz tease card
    const teaseCard = {
        id: 'sample-tease-001',
        type: 'quiz',
        priority: 10,
        timestamp: Date.now(),
        template: {
            type: 'quiz',
            subtype: 'tease',
            data: {
                title: 'Geo Quest',
                teaser: 'World capitals & landmarks',
                preview: ['🌍', '🗺️', '🧭', '📍'],
                topic: 'Geography',
                actionText: 'Notify Me'
            }
        },
        component: 'QuizEngine',
        componentConfig: {
            quizId: 'geo-001',
            topic: 'geography'
        }
    };
    
    // Sample time-based challenge
    const timedCard = {
        id: 'sample-timed-001',
        type: 'quiz',
        priority: 15,
        timestamp: Date.now() - 5000,
        endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours from now
        template: {
            type: 'quiz',
            subtype: 'timeBased',
            data: {
                title: '2X Points!',
                description: 'All quizzes worth double',
                endTime: Date.now() + (2 * 60 * 60 * 1000),
                multiplier: 2,
                participants: 247,
                icon: '⏰'
            }
        },
        component: 'QuizEngine',
        componentConfig: {
            multiplier: 2
        }
    };
    
    // Sample streak card
    const streakCard = {
        id: 'sample-streak-001',
        type: 'gamification',
        priority: 5,
        timestamp: Date.now() - 10000,
        template: {
            type: 'gamification',
            subtype: 'streak',
            data: {
                days: 7,
                nextMilestone: 10,
                bonus: 70,
                message: "A full week! You're on fire!"
            }
        }
    };
    
    // Add cards with a slight delay for effect
    setTimeout(() => cardManager.addCard(teaseCard), 500);
    setTimeout(() => cardManager.addCard(timedCard), 1000);
    setTimeout(() => cardManager.addCard(streakCard), 1500);
}

// Initialize bottom navigation
function initializeBottomNav() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Handle tab switching
            const tab = item.dataset.tab;
            handleTabSwitch(tab);
        });
    });
}

// Handle tab switching
function handleTabSwitch(tab) {
    switch(tab) {
        case 'home':
            // Already on home, could refresh cards
            console.log('Home tab selected');
            break;
        case 'progress':
            console.log('Progress tab selected - coming soon!');
            break;
        case 'profile':
            openAvatarSelector();
            break;
        case 'settings':
            if (window.settingsPanel) {
                window.settingsPanel.open();
            }
            break;
    }
}

// Handle card actions
window.addEventListener('cardAction', (event) => {
    const { action, component, componentConfig } = event.detail;
    
    switch(action) {
        case 'launch-quiz':
            launchQuiz(componentConfig);
            break;
        case 'launch-quest':
        case 'launch-timed':
        case 'launch-promo':
            // Here you would integrate with your quiz engine
            break;
        case 'notify-me':
            handleNotifyMe(event.detail);
            break;
        default:
            // Handle other card actions
    }
});

// Handle notify me action
async function handleNotifyMe(detail) {
    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext || 
                          (location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1');
    
    // Check if push notifications are supported and we're in a secure context
    if ('Notification' in window && 'serviceWorker' in navigator && isSecureContext) {
        // Try push notifications first
        const pushEnabled = await setupPushNotifications(detail);
        if (pushEnabled) return;
    }
    
    // Fall back to email
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        // Prompt for email if not set
        const email = prompt('Enter your email to get notified:');
        if (email && email.includes('@')) {
            localStorage.setItem('userEmail', email);
            updateUserEmail(email);
            subscribeToNotification(detail, email);
        } else if (email) {
            window.showAlert('Please enter a valid email address', 'OK', 'standard');
        }
    } else {
        subscribeToNotification(detail, userEmail);
    }
}

// Setup push notifications
async function setupPushNotifications(detail) {
    try {
        // Double-check we're in a secure context
        if (!window.isSecureContext) {
            return false;
        }
        
        // Don't even check Notification.permission if not secure
        // This prevents the error from appearing in console
        if (!('Notification' in window)) {
            return false;
        }
        
        // Wrap in try-catch because even reading Notification.permission
        // can throw in insecure contexts
        let permission;
        try {
            // This should only be checked inside a user gesture
            // If we're not in a user gesture, skip the check
            permission = Notification.permission;
        } catch (e) {
            // Silently fail in insecure contexts
            return false;
        }
        
        // Only request if not already granted or denied
        if (permission === 'default') {
            try {
                permission = await Notification.requestPermission();
            } catch (e) {
                // Silently fail if request fails
                return false;
            }
        }
        
        if (permission === 'granted') {
            // Register service worker if not already
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                registration = await navigator.serviceWorker.register('/sw.js');
            }
            
            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    'BEL4XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // Your public VAPID key
                )
            });
            
            // Save subscription to backend
            await savePushSubscription(subscription, detail);
            
            showToast('🔔 Push notifications enabled!');
            return true;
        } else if (permission === 'denied') {
            showToast('Push notifications blocked. Using email instead.', 'warning');
        }
    } catch (error) {
        console.error('Push setup failed:', error);
    }
    
    return false;
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Save push subscription
async function savePushSubscription(subscription, detail) {
    const { cardId, data } = detail;
    
    try {
        // In production, send to your backend
        // Saving push subscription
        
        /*
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                cardId: cardId,
                quizTitle: data.header?.title,
                userId: localStorage.getItem('userId')
            })
        });
        */
        
        // Store locally for now
        localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    } catch (error) {
        console.error('Failed to save push subscription:', error);
        throw error;
    }
}

// Subscribe to notification
async function subscribeToNotification(detail, email) {
    const { cardId, data } = detail;
    
    // Show immediate feedback
    showToast('✉️ We\'ll email you when this goes live!');
    
    // In a real app, this would call your backend
    try {
        // Simulated API call for notification subscription
        
        // In production:
        /*
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                cardId: cardId,
                quizTitle: data.header?.title,
                userId: localStorage.getItem('userId')
            })
        });
        */
    } catch (error) {
        console.error('Failed to subscribe:', error);
        showToast('❌ Failed to set notification', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'var(--primary)' : 'var(--accent)'};
        color: white;
        padding: 12px 24px;
        border-radius: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, 100px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        
        // Update icon
        document.querySelector('.fullscreen-icon').textContent = '⛶';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Update icon
        document.querySelector('.fullscreen-icon').textContent = '⛶';
    }
}

// Scroll avatars
function scrollAvatars(direction) {
    const container = document.getElementById('avatarScrollContainer');
    const scrollAmount = 200; // pixels to scroll
    
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// Launch quiz function
async function launchQuiz(config) {
    
    // Use the quiz modal if available
    if (window.quizModal) {
        window.quizModal.open(config.quizId);
    } else {
        // Fallback: Show loading state
        showToast('Loading quiz...', 'info');
        
        try {
            // Fetch the quiz data
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const mode = localStorage.getItem('appSettings') ? JSON.parse(localStorage.getItem('appSettings')).theme : 'poqpoq';
            
            const response = await fetch(`${apiBase}/api/content/quiz/current?mode=${mode}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const quizData = await response.json();
            
            // For now, show quiz in an alert - in production, this would launch the quiz component
            const questionText = quizData.mode_variations?.chaos?.question || quizData.data.question;
            const answers = quizData.data.answers.map(a => `${a.id}) ${a.text}`).join('\n');
            
            const answer = prompt(`${questionText}\n\n${answers}\n\nEnter your answer (a, b, c, or d):`);
            
            if (answer) {
                // Check if correct
                const correctAnswer = quizData.data.answers.find(a => a.correct);
                if (answer.toLowerCase() === correctAnswer.id) {
                    showToast('🎉 Correct! Great job!', 'success');
                } else {
                    showToast(`❌ Wrong! The answer was ${correctAnswer.id}) ${correctAnswer.text}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('Failed to launch quiz:', error);
            
            // Check if it's a CORS error
            if (error.message.includes('Failed to fetch')) {
                showToast('Connection error - check console', 'error');
            } else {
                showToast(`Failed to load quiz: ${error.message}`, 'error');
            }
        }
    }
}

// Check authentication status
function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userId = localStorage.getItem('userId');
    
    const authSection = document.getElementById('authSection');
    const userInfoSection = document.getElementById('userInfoSection');
    
    if (isAuthenticated && userId) {
        // User is logged in
        if (authSection) authSection.style.display = 'none';
        if (userInfoSection) userInfoSection.style.display = 'block';
        
        // Update display
        const displayName = localStorage.getItem('displayName') || 'Anonymous Player';
        const email = localStorage.getItem('userEmail') || '';
        
        const nameDisplay = document.getElementById('userDisplayName');
        const emailDisplay = document.getElementById('userEmailDisplay');
        
        if (nameDisplay) nameDisplay.textContent = displayName;
        if (emailDisplay) emailDisplay.textContent = email;
    } else {
        // User is not logged in
        if (authSection) authSection.style.display = 'block';
        if (userInfoSection) userInfoSection.style.display = 'none';
    }
}

// Handle logout
function handleLogout() {
    // Clear auth data
    localStorage.removeItem('userId');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('displayName');
    localStorage.removeItem('avatarId');
    
    // Reset to session-based economy
    if (window.economyManager) {
        window.economyManager.setUserId(null);
    }
    
    // Update UI
    checkAuthStatus();
    
    // Show message
    if (window.authPanel) {
        window.authPanel.showMessage('You have been signed out', 'info');
    }
}

// Make functions available globally
window.openAvatarSelector = openAvatarSelector;
window.closeAvatarSelector = closeAvatarSelector;
window.updateUserName = updateUserName;
window.updateUserEmail = updateUserEmail;
window.signInWithGoogle = signInWithGoogle;
window.handleLogout = handleLogout;
window.checkAuthStatus = checkAuthStatus;
window.toggleFullscreen = toggleFullscreen;
window.scrollAvatars = scrollAvatars;
window.launchQuiz = launchQuiz;

// Initialize PWA functionality
function initializePWA() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show install banner if not already shown
        if (!installBannerShown && !isAppInstalled()) {
            showInstallBanner();
        }
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        // Clear the deferred prompt
        deferredPrompt = null;
        // Hide install banner if visible
        hideInstallBanner();
        // Track that app was installed
        localStorage.setItem('jazzypop_installed', 'true');
    });
    
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        localStorage.getItem('jazzypop_installed') === 'true') {
        // App is installed, don't show banner
        return;
    }
    
    // For iOS, show custom install instructions
    if (isIOS() && !isAppInstalled()) {
        // Wait a bit before showing iOS install prompt
        setTimeout(() => {
            if (!installBannerShown) {
                showIOSInstallPrompt();
            }
        }, 5000); // Show after 5 seconds
    }
}

// Check if app is installed
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone || 
           localStorage.getItem('jazzypop_installed') === 'true';
}

// Check if iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Show install banner
function showInstallBanner() {
    installBannerShown = true;
    
    // Create install banner element
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.className = 'install-banner';
    banner.innerHTML = `
        <div class="install-banner-content">
            <img src="./src/images/p0qp0q-clean.svg" alt="JazzyPop" class="install-banner-icon">
            <div class="install-banner-text">
                <h3>Install JazzyPop</h3>
                <p>Add to your home screen for the best experience!</p>
            </div>
            <div class="install-banner-actions">
                <button class="install-banner-btn secondary" onclick="dismissInstallBanner()">Not now</button>
                <button class="install-banner-btn primary" onclick="installPWA()">Install</button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(banner);
    
    // Animate in
    setTimeout(() => {
        banner.classList.add('show');
    }, 100);
}

// Show iOS-specific install instructions
function showIOSInstallPrompt() {
    installBannerShown = true;
    
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.className = 'install-banner ios';
    banner.innerHTML = `
        <div class="install-banner-content">
            <img src="./src/images/p0qp0q-clean.svg" alt="JazzyPop" class="install-banner-icon">
            <div class="install-banner-text">
                <h3>Install JazzyPop</h3>
                <p>Tap <span class="ios-share-icon">⬆️</span> then "Add to Home Screen"</p>
            </div>
            <div class="install-banner-actions">
                <button class="install-banner-btn primary" onclick="dismissInstallBanner()">Got it!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.classList.add('show');
    }, 100);
}

// Install PWA
async function installPWA() {
    if (!deferredPrompt) {
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        // User accepted the install prompt
        localStorage.setItem('jazzypop_installed', 'true');
    }
    
    // Clear the deferred prompt
    deferredPrompt = null;
    
    // Hide the banner
    hideInstallBanner();
}

// Dismiss install banner
function dismissInstallBanner() {
    hideInstallBanner();
    // Don't show again for 7 days
    localStorage.setItem('install_banner_dismissed', Date.now());
}

// Hide install banner
function hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
        }, 300);
    }
}

// Make functions available globally
window.installPWA = installPWA;
window.dismissInstallBanner = dismissInstallBanner;

// Dashboard sync with backend
let dashboardSyncInterval = null;

// Update dashboard display with economy data
function updateDashboardDisplay(economyData) {
    // Safety check for undefined data
    if (!economyData) {
        console.warn('updateDashboardDisplay called with undefined data');
        return;
    }
    
    // Update XP and level
    const userLevel = document.getElementById('userLevel');
    const xpFill = document.getElementById('xpFill');
    const xpText = document.getElementById('xpText');
    
    if (userLevel) userLevel.textContent = economyData.level || 1;
    
    // Calculate XP progress for current level
    if (xpFill && xpText && economyData.xp !== undefined) {
        const currentLevel = economyData.level || 1;
        const totalXP = economyData.xp || 0;
        
        // Simple calculation: show current XP / XP needed for next level
        // Level 1 → 2: need 100 XP
        // Level 2 → 3: need 200 XP (total)
        // Level 3 → 4: need 350 XP (total)
        const xpForNextLevel = currentLevel * 100 + ((currentLevel - 1) * currentLevel * 25);
        const xpProgress = Math.min(100, (totalXP / xpForNextLevel) * 100);
        
        console.log('XP Display Debug:', { totalXP, currentLevel, xpForNextLevel, xpProgress });
        
        xpFill.style.width = `${xpProgress}%`;
        xpText.textContent = `${totalXP} / ${xpForNextLevel} XP`;
    }
    
    // Update stats bar
    const coinsValue = document.getElementById('coinsValue');
    const gemsValue = document.getElementById('gemsValue');
    const energyValue = document.getElementById('energyValue');
    const livesValue = document.getElementById('livesValue');
    
    if (coinsValue) coinsValue.textContent = economyData.coins || 0;
    if (energyValue) energyValue.textContent = economyData.energy || 0;
    if (livesValue) livesValue.textContent = economyData.hearts || 0;
    
    // Calculate total gem value
    if (gemsValue) {
        const gemValues = {
            diamonds: 1000,
            amethysts: 250,
            rubies: 100,
            emeralds: 50,
            sapphires: 10
        };
        
        let totalGemValue = economyData.coins || 0;
        for (const [gem, value] of Object.entries(gemValues)) {
            totalGemValue += (economyData[gem] || 0) * value;
        }
        
        // Format the gem value nicely
        if (totalGemValue >= 1000000) {
            gemsValue.textContent = (totalGemValue / 1000000).toFixed(1) + 'M';
        } else if (totalGemValue >= 1000) {
            gemsValue.textContent = (totalGemValue / 1000).toFixed(1) + 'K';
        } else {
            gemsValue.textContent = totalGemValue;
        }
    }
}

// Debounce timer for sync
let syncDebounceTimer = null;

// Sync dashboard with backend
async function syncDashboard() {
    // Clear any pending sync
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }
    // Don't sync if a modal is open (game in progress)
    const activeModals = document.querySelector('.quiz-modal.active') || 
                        document.querySelector('.flashcard-modal.active') ||
                        document.querySelector('.herding-modal.active') ||
                        document.querySelector('.factoid-modal.active');
    
    if (activeModals) {
        console.log('Skipping dashboard sync - game modal active:', activeModals.className);
        return;
    }
    
    // Also check global modal instances
    if ((window.quizModal && window.quizModal.modal && window.quizModal.modal.classList.contains('active')) ||
        (window.flashcardModal && window.flashcardModal.modal && window.flashcardModal.modal.classList.contains('active'))) {
        console.log('Skipping dashboard sync - game instance active');
        return;
    }
    
    console.log('Dashboard sync proceeding - no active games detected');
    
    try {
        // Get session ID from EconomyManager
        const sessionId = window.economyManager?.sessionToken || localStorage.getItem('session_id');
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const userId = isAuthenticated ? localStorage.getItem('userId') : null;
        
        // Build query params
        const params = new URLSearchParams();
        // Only send user_id OR session_id, not both
        if (userId) {
            params.append('user_id', userId);
        } else if (sessionId) {
            params.append('session_id', sessionId);
        }
        
        console.log('Dashboard sync params:', {userId, sessionId});
        
        // Fetch from backend - TODO: Update to correct endpoint when available
        const apiBase = window.API_URL || 'https://p0qp0q.com';
        
        // Fetch from backend
        const response = await fetch(`${apiBase}/api/economy/state?${params}`);
        
        if (response.ok) {
            const data = await response.json();
            
            // The API returns {state: {...}} so we need to extract the state
            const economyState = data.state || data;
            
            // Update EconomyManager cache through its sync method
            if (window.economyManager && window.economyManager.syncWithServer) {
                // Let EconomyManager handle the update properly
                window.economyManager.syncWithServer(economyState);
            }
            
            // Update dashboard display
            updateDashboardDisplay(economyState);
            
            // Don't dispatch economyUpdated event during sync - it's redundant
            // The EconomyManager already updated its state and display
        } else {
            console.error('Failed to sync dashboard:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Dashboard sync error:', error);
        const apiUrl = window.API_URL || 'https://p0qp0q.com';
        console.error('Sync URL was:', `${apiUrl}/api/economy/state?${params.toString()}`);
    }
}

// Start dashboard sync
function startDashboardSync() {
    // Initial sync
    syncDashboard();
    
    // Sync every 60 seconds (more reasonable)
    dashboardSyncInterval = setInterval(syncDashboard, 60000);
    
    // Also sync on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            syncDashboard();
        }
    });
    
    // Listen for economy events
    window.addEventListener('statsUpdated', () => {
        // Update immediately when stats change
        if (window.economyManager) {
            updateDashboardDisplay(window.economyManager.getDisplayState());
        }
        // Don't trigger a full sync - just update the display
    });
    
    window.addEventListener('economyUpdated', (e) => {
        if (e.detail) {
            updateDashboardDisplay(e.detail);
        } else if (window.economyManager) {
            updateDashboardDisplay(window.economyManager.getDisplayState());
        }
    });
}

// Stop dashboard sync
function stopDashboardSync() {
    if (dashboardSyncInterval) {
        clearInterval(dashboardSyncInterval);
        dashboardSyncInterval = null;
    }
}

// Make sync functions available globally
window.syncDashboard = syncDashboard;
window.startDashboardSync = startDashboardSync;
window.stopDashboardSync = stopDashboardSync;
window.updateUserInfo = updateUserInfo;

// Initialize on load
window.onload = init;

// Debug helpers
window.freezeAnimations = function() {
    // Nuclear option - stop EVERYTHING
    const style = document.createElement('style');
    style.id = 'freeze-style';
    style.textContent = `
        * {
            animation: none !important;
            animation-play-state: paused !important;
            transition: none !important;
            transform: none !important;
        }
        .generic-card {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            animation: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Also freeze any running animations
    document.querySelectorAll('*').forEach(el => {
        el.style.animationPlayState = 'paused';
        const computed = window.getComputedStyle(el);
        // Animation frozen
    });
    
    // All animations frozen
};

window.unfreezeAnimations = function() {
    const freezeStyle = document.getElementById('freeze-style');
    if (freezeStyle) freezeStyle.remove();
    // Animations resumed
};

// Debug helper to log all cards with animations
// Commented out to reduce console spam - uncomment when needed
/*
window.debugCards = function() {
    const cards = document.querySelectorAll('.generic-card');
    console.log('Total cards in DOM:', cards.length);
    
    let visibleCount = 0;
    let hiddenCards = [];
    
    cards.forEach((card, index) => {
        const computedStyle = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        const isVisible = computedStyle.display !== 'none' && 
                         computedStyle.visibility !== 'hidden' &&
                         computedStyle.opacity !== '0' &&
                         rect.width > 0 &&
                         rect.height > 0;
        
        if (isVisible) {
            visibleCount++;
        } else {
            hiddenCards.push({
                index: index,
                id: card.dataset.cardId,
                reason: computedStyle.display === 'none' ? 'display:none' :
                        computedStyle.visibility === 'hidden' ? 'visibility:hidden' :
                        computedStyle.opacity === '0' ? 'opacity:0' :
                        rect.width === 0 ? 'width:0' :
                        rect.height === 0 ? 'height:0' : 'unknown'
            });
        }
        
        if (index < 5 || !isVisible) { // Log first 5 and all hidden
            console.log(`Card ${index}:`, {
                id: card.dataset.cardId,
                classes: card.className,
                visible: isVisible,
                display: computedStyle.display,
                opacity: computedStyle.opacity,
                rect: { width: rect.width, height: rect.height },
                hasSpecialClass: card.classList.contains('priority-special')
            });
        }
    });
    
    console.log('Visible cards:', visibleCount);
    console.log('Hidden cards:', hiddenCards);
    
    // Check container
    const container = document.querySelector('.cards-container');
    if (container) {
        const containerStyle = window.getComputedStyle(container);
        console.log('Container styles:', {
            overflow: containerStyle.overflow,
            maxHeight: containerStyle.maxHeight,
            height: containerStyle.height
        });
    }
    
    // Check for special card
    const specialCard = document.querySelector('.generic-card.priority-special');
    if (specialCard) {
        console.log('Special card found at index:', Array.from(cards).indexOf(specialCard));
    } else {
        console.log('No special card found!');
    }
};
*/

// Monitor transforms on special cards
// Commented out to reduce console spam - uncomment when needed
/*
window.watchSpecialCard = function() {
    const specialCard = document.querySelector('.generic-card.priority-special');
    if (!specialCard) {
        console.log('No special card found');
        return;
    }
    
    console.log('Watching special card:', specialCard);
    
    // Check parent transforms
    let parent = specialCard.parentElement;
    while (parent) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.transform !== 'none' || parentStyle.animation !== 'none') {
            console.log('Parent has transform/animation:', parent, {
                transform: parentStyle.transform,
                animation: parentStyle.animation
            });
        }
        parent = parent.parentElement;
    }
    
    // Create a mutation observer to watch for style changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                console.log('Style changed:', specialCard.style.transform, specialCard.style);
            }
        });
    });
    
    observer.observe(specialCard, {
        attributes: true,
        attributeFilter: ['style']
    });
    
    // Also log current transform
    const computed = window.getComputedStyle(specialCard);
    console.log('Current transform:', computed.transform);
    console.log('Current position:', computed.position);
    console.log('Current transition:', computed.transition);
    console.log('All styles:', specialCard.getAttribute('style'));
    
    // Check action button
    const actionBtn = specialCard.querySelector('.action-primary');
    if (actionBtn) {
        console.log('Action button found:', actionBtn.dataset.action);
        // Force click handler
        actionBtn.onclick = () => {
            console.log('Button clicked directly!');
            window.herdingGame.open();
        };
    }
    
    return observer;
};
*/
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

// Initialize dashboard
function init() {
    // Set API URL
    window.API_URL = 'https://p0qp0q.com';
    
    // Prevent mobile zoom
    preventMobileZoom();
    
    updateAvatarDisplay();
    updateUserInfo();
    populateAvatarRow();
    initializeCardManager();
    initializeBottomNav();
    initGoogleSignIn();  // Initialize Google Sign-In
    console.log(`Dashboard initialized with ${allBotFiles.length} avatars`);
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
    document.getElementById('userName').textContent = userName;
}

// Update avatar display
function updateAvatarDisplay() {
    const avatarElement = document.getElementById('userAvatar');
    const avatar = allBotFiles.find(a => a.id === currentAvatar);
    
    if (avatar && avatar.file) {
        // Special case for p0qp0q which is in main images folder
        const imagePath = avatar.id === 'default' 
            ? '../src/images/p0qp0q-clean.svg'
            : `../src/images/profile-bots/${avatar.file}`;
        
        // Just set the image, let CSS handle styling
        avatarElement.innerHTML = `<img src="${imagePath}" alt="${avatar.name}">`;
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
    
    console.log('Populating avatars, total:', allBotFiles.length);
    
    allBotFiles.forEach(avatar => {
        const option = document.createElement('div');
        option.className = 'avatar-option' + (avatar.id === currentAvatar ? ' selected' : '');
        option.dataset.avatarId = avatar.id;
        
        // Try different event binding approach
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Avatar clicked:', avatar.id);
            selectAvatar(avatar.id);
        });
        
        const preview = document.createElement('div');
        preview.className = 'avatar-preview';
        
        if (avatar.file) {
            // Special case for p0qp0q which is in main images folder
            const imagePath = avatar.id === 'default' 
                ? '../src/images/p0qp0q-clean.svg'
                : `../src/images/profile-bots/${avatar.file}`;
            preview.innerHTML = `<img src="${imagePath}" alt="${avatar.name}" onerror="this.style.display='none'">`;
        }
        
        const name = document.createElement('div');
        name.className = 'avatar-name';
        name.textContent = avatar.name;
        
        option.appendChild(preview);
        option.appendChild(name);
        row.appendChild(option);
    });
    
    
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
    console.log('Opening avatar selector...');
    const overlay = document.getElementById('avatarSelectorOverlay');
    if (!overlay) {
        console.error('Avatar selector overlay not found!');
        return;
    }
    overlay.classList.add('active');
    // Update input fields with current values
    document.getElementById('userNameInput').value = userName;
    document.getElementById('userEmailInput').value = userEmail;
    console.log('About to populate avatars...');
    populateAvatarRow();
    
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
        
        console.log('Google Sign-In initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
    }
}

// Handle Google sign-in response
async function handleGoogleSignIn(response) {
    console.log('Google sign-in response:', response);
    
    try {
        // Decode the JWT token to get user info
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userInfo = JSON.parse(jsonPayload);
        console.log('User info:', userInfo);
        
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
        console.log('Would sync Google user with backend');
    } catch (error) {
        console.error('Failed to sync with backend:', error);
    }
}

// Updated sign-in function for button click
function signInWithGoogle() {
    // Check if already initialized
    if (typeof google !== 'undefined' && google.accounts) {
        // Programmatically trigger sign-in
        google.accounts.id.prompt();
    } else {
        console.warn('Google Sign-In not initialized');
        showToast('Google Sign-In is not available', 'error');
    }
}

// Close avatar selector
function closeAvatarSelector(event) {
    if (!event || event.target === event.currentTarget) {
        document.getElementById('avatarSelectorOverlay').classList.remove('active');
    }
}

// Select avatar
function selectAvatar(avatarId) {
    console.log('Selecting avatar:', avatarId);
    currentAvatar = avatarId;
    localStorage.setItem('selectedAvatar', currentAvatar);
    updateAvatarDisplay();
    
    // Sync with backend
    syncUserProfile();
    
    // Update all avatar options to show selection
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.avatarId === avatarId);
    });
    
    closeAvatarSelector();
}

// Sync user profile with backend
async function syncUserProfile() {
    const profile = {
        userName: localStorage.getItem('userName') || 'Anonymous Player',
        userEmail: localStorage.getItem('userEmail') || '',
        selectedAvatar: localStorage.getItem('selectedAvatar') || 'default',
        userId: localStorage.getItem('userId') || generateUserId()
    };
    
    console.log('Syncing profile:', profile);
    
    // In production, send to backend
    try {
        /*
        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        const data = await response.json();
        localStorage.setItem('userId', data.userId);
        */
        
        // For now, just ensure we have a userId
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', profile.userId);
        }
    } catch (error) {
        console.error('Failed to sync profile:', error);
    }
}

// Generate a simple user ID for demo
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

// Initialize CardManager
let cardManager;
function initializeCardManager() {
    const container = document.getElementById('cardsContainer');
    const emptyState = document.getElementById('emptyState');
    
    console.log('Initializing CardManager. Existing cards in container:', container.children.length);
    
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
            console.log(`Launching quiz with config:`, componentConfig);
            launchQuiz(componentConfig);
            break;
        case 'launch-quest':
        case 'launch-timed':
        case 'launch-promo':
            console.log(`Launching ${component} with config:`, componentConfig);
            // Here you would integrate with your quiz engine
            break;
        case 'notify-me':
            handleNotifyMe(event.detail);
            break;
        default:
            console.log('Card action:', action);
    }
});

// Handle notify me action
async function handleNotifyMe(detail) {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
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
            alert('Please enter a valid email address');
        }
    } else {
        subscribeToNotification(detail, userEmail);
    }
}

// Setup push notifications
async function setupPushNotifications(detail) {
    try {
        // Check current permission first
        let permission = Notification.permission;
        
        // Only request if not already granted or denied
        if (permission === 'default') {
            permission = await Notification.requestPermission();
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
        console.log('Saving push subscription:', {
            endpoint: subscription.endpoint,
            cardId: cardId,
            quizTitle: data.header?.title || 'Quiz'
        });
        
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
        // Simulated API call
        console.log('Subscribing to notification:', {
            email: email,
            cardId: cardId,
            quizTitle: data.header?.title || 'Quiz',
            notificationType: 'email'
        });
        
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
    console.log('Launching quiz:', config);
    
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
            
            console.log('Fetching quiz from:', `${apiBase}/api/content/quiz/current?mode=${mode}`);
            
            const response = await fetch(`${apiBase}/api/content/quiz/current?mode=${mode}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const quizData = await response.json();
            
            console.log('Quiz data:', quizData);
            
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

// Make functions available globally
window.openAvatarSelector = openAvatarSelector;
window.closeAvatarSelector = closeAvatarSelector;
window.updateUserName = updateUserName;
window.updateUserEmail = updateUserEmail;
window.signInWithGoogle = signInWithGoogle;
window.toggleFullscreen = toggleFullscreen;
window.scrollAvatars = scrollAvatars;
window.launchQuiz = launchQuiz;

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
        if (computed.animationName !== 'none') {
            console.log('Found animated element:', el, computed.animationName);
        }
    });
    
    console.log('NUCLEAR FREEZE ACTIVATED! Use window.unfreezeAnimations() to resume.');
};

window.unfreezeAnimations = function() {
    const freezeStyle = document.getElementById('freeze-style');
    if (freezeStyle) freezeStyle.remove();
    console.log('Animations resumed!');
};

// Debug helper to log all cards with animations
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

// Monitor transforms on special cards
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
/**
 * Cache Flush Utility for JazzyPop
 * Press Ctrl+Shift+R to flush all caches and reload
 */

(function() {
    // Add keyboard shortcut for cache flush
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+R (or Cmd+Shift+R on Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            flushAllCaches();
        }
        
        // Secret developer menu: Ctrl+Shift+D
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            showDeveloperMenu();
        }
    });
    
    function flushAllCaches() {
        console.log('🔄 Flushing all caches...');
        
        // Clear localStorage
        const keysToKeep = ['userId', 'username']; // Keep user login
        const savedData = {};
        keysToKeep.forEach(key => {
            savedData[key] = localStorage.getItem(key);
        });
        
        localStorage.clear();
        
        // Restore essential data
        Object.entries(savedData).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value);
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear component caches
        if (window.cardManager) {
            window.cardManager.activeCards = [];
            window.cardManager.seenCardIds.clear();
        }
        
        if (window.quizModal) {
            window.quizModal.recentQuizIds = [];
        }
        
        if (window.flashcardModal) {
            window.flashcardModal.cards = [];
            window.flashcardModal.seenCards.clear();
        }
        
        // Show notification
        showNotification('✨ Cache cleared! Reloading fresh content...');
        
        // Force hard reload after short delay
        setTimeout(() => {
            location.reload(true);
        }, 1000);
    }
    
    function showDeveloperMenu() {
        // Remove existing menu if present
        const existing = document.getElementById('dev-menu');
        if (existing) {
            existing.remove();
            return;
        }
        
        const menu = document.createElement('div');
        menu.id = 'dev-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 100000;
            font-family: monospace;
            min-width: 300px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        `;
        
        menu.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #0ff;">🛠️ Developer Menu</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="window.flushAllCaches()" style="padding: 10px; cursor: pointer;">
                    🔄 Flush All Caches
                </button>
                <button onclick="window.clearRedisCache()" style="padding: 10px; cursor: pointer;">
                    🗄️ Clear Server Cache
                </button>
                <button onclick="window.showStats()" style="padding: 10px; cursor: pointer;">
                    📊 Show Content Stats
                </button>
                <button onclick="window.forceNewContent()" style="padding: 10px; cursor: pointer;">
                    🎲 Force New Content Set
                </button>
                <hr style="margin: 10px 0;">
                <button onclick="document.getElementById('dev-menu').remove()" style="padding: 10px; cursor: pointer;">
                    ❌ Close Menu
                </button>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
                Press Ctrl+Shift+D again to close
            </p>
        `;
        
        document.body.appendChild(menu);
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 255, 100, 0.9);
            color: black;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 100001;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Global functions for developer menu
    window.flushAllCaches = flushAllCaches;
    
    window.clearRedisCache = async function() {
        try {
            const apiBase = window.API_URL || 'https://p0qp0q.com';
            const response = await fetch(`${apiBase}/api/admin/clear-cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                showNotification('✅ Server cache cleared!');
            } else {
                showNotification('❌ Failed to clear server cache');
            }
        } catch (error) {
            console.error('Cache clear error:', error);
            showNotification('❌ Error clearing cache');
        }
    };
    
    window.showStats = async function() {
        const stats = {
            localStorage: Object.keys(localStorage).length,
            sessionStorage: Object.keys(sessionStorage).length,
            activeCards: window.cardManager?.activeCards?.length || 0,
            seenCards: window.cardManager?.seenCardIds?.size || 0,
            quizHistory: window.quizModal?.recentQuizIds?.length || 0
        };
        
        alert(`📊 Content Stats:\n\n` +
              `LocalStorage items: ${stats.localStorage}\n` +
              `SessionStorage items: ${stats.sessionStorage}\n` +
              `Active cards: ${stats.activeCards}\n` +
              `Seen cards: ${stats.seenCards}\n` +
              `Recent quizzes: ${stats.quizHistory}`);
    };
    
    window.forceNewContent = function() {
        // Clear specific content caches
        localStorage.removeItem('flashcards:famous_quotes:10');
        localStorage.removeItem('flashcards:bad_puns:10');
        localStorage.removeItem('flashcards:trivia_mix:10');
        localStorage.removeItem('cards:active');
        
        showNotification('🎲 Forcing new content on next load...');
        setTimeout(() => location.reload(), 1000);
    };
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
})();
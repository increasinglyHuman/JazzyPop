/**
 * Service Worker for Push Notifications
 */

// Install event - cache assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

// Push event - show notification
self.addEventListener('push', event => {
    console.log('Push notification received');
    
    let data = {
        title: 'JazzyPop Quiz Ready!',
        body: 'A new quiz is available',
        icon: '/src/images/p0qp0q-clean.svg',
        badge: '/src/images/p0qp0q-clean.svg',
        tag: 'quiz-notification',
        data: {
            url: '/jazzypop/'
        }
    };
    
    // Parse custom data if available
    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            console.error('Error parsing push data:', e);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'play',
                    title: 'Play Now',
                    icon: '/src/images/play-icon.png'
                },
                {
                    action: 'later',
                    title: 'Later'
                }
            ],
            data: data.data
        })
    );
});

// Notification click - open app
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'later') {
        return; // Just close
    }
    
    // Open the app (default action or 'play')
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            // Check if already open
            for (let client of windowClients) {
                if (client.url.includes('dashboard-clean.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Background sync for offline support (optional)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-notifications') {
        console.log('Syncing notifications...');
        // Could sync notification preferences here
    }
});
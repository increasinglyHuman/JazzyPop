/**
 * Event Dots Display Component
 * Shows active events as minimized dots in the top right corner
 * Clicking a dot expands it to show event details
 */

class EventDotsDisplay {
    constructor() {
        this.container = null;
        this.events = new Map();
        this.expandedEventId = null;
        this.init();
    }

    init() {
        // Create container
        this.createContainer();
        
        // Listen for event updates
        window.addEventListener('eventsUpdated', () => this.updateDisplay());
        
        // Initial update
        this.updateDisplay();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'event-dots-container';
        this.container.innerHTML = `
            <div class="event-dots-wrapper">
                <div class="event-dots-list"></div>
                <div class="event-banner-area"></div>
            </div>
        `;
        
        // Insert inside user section for proper flex positioning
        const userSection = document.querySelector('.user-section');
        if (userSection) {
            // Insert before the fullscreen button
            const fullscreenBtn = userSection.querySelector('.fullscreen-toggle');
            if (fullscreenBtn) {
                userSection.insertBefore(this.container, fullscreenBtn);
            } else {
                userSection.appendChild(this.container);
            }
        } else {
            // Fallback - add to body
            document.body.appendChild(this.container);
        }
        
        this.dotsList = this.container.querySelector('.event-dots-list');
        this.bannerArea = this.container.querySelector('.event-banner-area');
    }

    updateDisplay() {
        if (!window.economyManager) {
            console.log('[EventDots] No economyManager found');
            return;
        }
        
        const activeEvents = window.economyManager.getActiveEvents();
        console.log('[EventDots] Active events:', activeEvents);
        this.events.clear();
        
        // Store events
        activeEvents.forEach(event => {
            this.events.set(event.id || event.type, event);
        });
        
        // Render dots
        this.renderDots();
    }

    renderDots() {
        this.dotsList.innerHTML = '';
        
        this.events.forEach((event, id) => {
            const dot = document.createElement('div');
            dot.className = `event-dot ${event.type}`;
            dot.dataset.eventId = id;
            
            // Create the dot with consistent charcoal styling
            dot.innerHTML = `
                <div class="dot-inner">
                    <span class="dot-icon">${this.getEventIcon(event.type)}</span>
                </div>
                <div class="dot-pulse"></div>
            `;
            
            // Add click handler
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEvent(id);
            });
            
            this.dotsList.appendChild(dot);
        });
    }

    toggleEvent(eventId) {
        if (this.expandedEventId === eventId) {
            // Collapse if clicking the same dot
            this.collapseEvent();
        } else {
            // Expand this event
            this.expandEvent(eventId);
        }
    }

    expandEvent(eventId) {
        const event = this.events.get(eventId);
        if (!event) return;
        
        // Mark this event as expanded
        this.expandedEventId = eventId;
        
        // Update dot states
        this.dotsList.querySelectorAll('.event-dot').forEach(dot => {
            if (dot.dataset.eventId === eventId) {
                dot.classList.add('expanded');
            } else {
                dot.classList.remove('expanded');
            }
        });
        
        // Show banner
        this.showEventBanner(event);
    }

    collapseEvent() {
        this.expandedEventId = null;
        
        // Remove expanded state from all dots
        this.dotsList.querySelectorAll('.event-dot').forEach(dot => {
            dot.classList.remove('expanded');
        });
        
        // Hide banner
        this.bannerArea.innerHTML = '';
        this.bannerArea.classList.remove('visible');
    }

    showEventBanner(event) {
        // Show event details in a proper modal instead
        this.showEventModal(event);
    }

    getEventDetails(event) {
        let details = '<div class="banner-effects">';
        
        if (event.costModifier) {
            const discount = Math.round(event.costModifier.value * 100);
            details += `<div class="effect-item">💰 ${discount}% off all quizzes</div>`;
        }
        
        if (event.xpMultiplier) {
            details += `<div class="effect-item">⭐ ${event.xpMultiplier}x XP rewards</div>`;
        }
        
        if (event.gemMultiplier) {
            details += `<div class="effect-item">💎 ${event.gemMultiplier}x Gem rewards</div>`;
        }
        
        if (event.freePlay) {
            details += `<div class="effect-item">🎮 ${event.freePlay} free play(s)</div>`;
        }
        
        if (event.practiceBonus && event.practiceBonus.xpMultiplier) {
            details += `<div class="effect-item">📚 ${event.practiceBonus.xpMultiplier}x XP on practice</div>`;
        }
        
        if (event.endTime) {
            const timeLeft = this.getTimeRemaining(event.endTime);
            details += `<div class="effect-item">⏱️ ${timeLeft} remaining</div>`;
        }
        
        details += '</div>';
        return details;
    }

    showEventModal(event) {
        // Create modal matching game style
        const modal = document.createElement('div');
        modal.className = 'event-modal active';
        modal.innerHTML = `
            <div class="event-overlay"></div>
            <div class="event-modal-content">
                <div class="event-hero-section">
                    <img src="./src/images/signbots/${this.getEventSignbot(event.type)}.png" 
                         alt="${event.label}" 
                         class="event-hero-image">
                </div>
                
                <div class="event-info-section">
                    <h2 class="event-title">${event.label}</h2>
                    <p class="event-description">${event.description}</p>
                    
                    <!-- Rewards Band -->
                    <div class="event-rewards-band">
                        <span class="rewards-label">ACTIVE BONUSES:</span>
                        <div class="reward-items">
                            ${this.getModalRewards(event)}
                        </div>
                    </div>
                    
                    <!-- Event Details -->
                    <div class="event-details-section">
                        ${this.getModalEventDetails(event)}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="event-actions">
                        <button class="event-action-btn secondary" onclick="window.eventDotsDisplay.closeModal()">
                            Got it!
                        </button>
                        <button class="event-action-btn primary" onclick="window.eventDotsDisplay.openCalendar()">
                            View Calendar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentModal = modal;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Add overlay click handler
        modal.querySelector('.event-overlay').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Animate in
        requestAnimationFrame(() => {
            modal.querySelector('.event-modal-content').classList.add('show');
        });
    }
    
    closeModal() {
        if (this.currentModal) {
            this.currentModal.classList.add('closing');
            document.body.style.overflow = '';
            setTimeout(() => {
                this.currentModal.remove();
                this.currentModal = null;
            }, 300);
        }
        this.collapseEvent();
    }
    
    openCalendar() {
        // TODO: Navigate to calendar view
        console.log('Opening calendar...');
        this.closeModal();
    }

    getFullEventDescription(event) {
        const descriptions = {
            'happy-hour': `
                <h3>How Happy Hour Works:</h3>
                <ul>
                    <li>All quizzes cost 50% less energy</li>
                    <li>Perfect for marathon study sessions</li>
                    <li>Stack up your streak while energy costs are low!</li>
                    <li>Happens daily at 3-4 PM and 7-8 PM</li>
                </ul>
            `,
            'weekend-special': `
                <h3>Weekend Boost Benefits:</h3>
                <ul>
                    <li>Double XP on all quiz completions</li>
                    <li>Level up faster than ever</li>
                    <li>Active from Friday 5 PM through Sunday</li>
                    <li>Great time to tackle harder quizzes!</li>
                </ul>
            `,
            'power-hour': `
                <h3>Power Hour Perks:</h3>
                <ul>
                    <li>Triple XP rewards for 45 minutes</li>
                    <li>Bonus gems on perfect scores</li>
                    <li>Energy regenerates 2x faster</li>
                    <li>The ultimate learning boost!</li>
                </ul>
            `,
            'learning-party': `
                <h3>Learning Party Time!</h3>
                <ul>
                    <li>Every 3rd quiz is FREE</li>
                    <li>Bonus rewards for streaks</li>
                    <li>Special party-themed quiz questions</li>
                    <li>Join the fun and learn together!</li>
                </ul>
            `
        };
        
        return descriptions[event.type] || `
            <h3>Special Event Active!</h3>
            <p>Enjoy the bonus rewards while this event is active.</p>
        `;
    }

    getEventColor(type) {
        const colors = {
            'discount': '#4CAF50',
            'boost': '#FF9800',
            'celebration': '#E91E63',
            'power-hour': '#9C27B0',
            'learning-party': '#00BCD4',
            'perfect-streak': '#FFC107',
            'quest': '#3F51B5',
            'limited': '#F44336'
        };
        
        return colors[type] || '#2196F3';
    }

    getEventIcon(type) {
        const icons = {
            'discount': '🎉',
            'boost': '🌟',
            'celebration': '🎊',
            'power-hour': '⚡',
            'learning-party': '🎈',
            'perfect-streak': '🔥',
            'quest': '🎯',
            'limited': '⏰'
        };
        
        return icons[type] || '✨';
    }
    
    getEventSignbot(type) {
        const signbots = {
            'discount': 'signbot-party',
            'boost': 'signbot-star',
            'celebration': 'signbot-celebration',
            'energy': 'signbot-coffee',
            'gems': 'signbot-gem',
            'free': 'signbot-gift',
            'limited': 'signbot-clock',
            'hearts': 'signbot-heart',
            'chaos': 'signbot-chaos',
            'freedom': 'signbot-flag',
            'spooky': 'signbot-pumpkin',
            'grateful': 'signbot-turkey',
            'gift': 'signbot-present'
        };
        
        return signbots[type] || 'signbot-star';
    }
    
    getModalRewards(event) {
        const rewards = [];
        
        if (event.costModifier) {
            const discount = Math.round(event.costModifier.value * 100);
            rewards.push(`
                <div class="reward-item">
                    <img src="./src/images/economy-icons/energyIcon.svg" class="reward-icon" alt="Energy">
                    <span>${discount}% OFF</span>
                </div>
            `);
        }
        
        if (event.xpMultiplier) {
            rewards.push(`
                <div class="reward-item">
                    <img src="./src/images/economy-icons/xpIcon.svg" class="reward-icon" alt="XP">
                    <span>${event.xpMultiplier}x XP</span>
                </div>
            `);
        }
        
        if (event.gemMultiplier) {
            rewards.push(`
                <div class="reward-item">
                    <img src="./src/images/economy-icons/gemIcon.svg" class="reward-icon" alt="Gems">
                    <span>${event.gemMultiplier}x GEMS</span>
                </div>
            `);
        }
        
        if (event.freePlay) {
            rewards.push(`
                <div class="reward-item">
                    <img src="./src/images/economy-icons/ticketIcon.svg" class="reward-icon" alt="Free Play">
                    <span>${event.freePlay} FREE</span>
                </div>
            `);
        }
        
        if (event.practiceBonus) {
            rewards.push(`
                <div class="reward-item">
                    <img src="./src/images/economy-icons/xpIcon.svg" class="reward-icon" alt="Practice XP">
                    <span>${event.practiceBonus.xpMultiplier}x PRACTICE</span>
                </div>
            `);
        }
        
        return rewards.join('');
    }
    
    getModalEventDetails(event) {
        let details = '<div class="event-timing">';
        
        if (event.endTime) {
            const timeLeft = this.getTimeRemaining(event.endTime);
            details += `
                <div class="timing-item">
                    <span class="timing-label">Time Remaining:</span>
                    <span class="timing-value">${timeLeft}</span>
                </div>
            `;
        }
        
        // Add schedule info
        const scheduleInfo = this.getEventSchedule(event.type);
        if (scheduleInfo) {
            details += `
                <div class="timing-item">
                    <span class="timing-label">Schedule:</span>
                    <span class="timing-value">${scheduleInfo}</span>
                </div>
            `;
        }
        
        details += '</div>';
        
        // Add tips
        details += '<div class="event-tips">';
        details += '<h3>Pro Tips:</h3>';
        details += this.getEventTips(event.type);
        details += '</div>';
        
        return details;
    }
    
    getEventSchedule(type) {
        const schedules = {
            'discount': 'Daily at 3-4 PM & 7-8 PM',
            'boost': 'Friday 5 PM through Sunday',
            'energy': 'Every Monday',
            'gems': 'Every Wednesday',
            'free': 'Every Friday',
            'limited': 'Once per day until used'
        };
        
        return schedules[type] || null;
    }
    
    getEventTips(type) {
        const tips = {
            'discount': '<ul><li>Stack up your energy before Happy Hour ends</li><li>Perfect time for challenging quizzes</li><li>Save gems for other times</li></ul>',
            'boost': '<ul><li>Focus on harder quizzes for maximum XP</li><li>Great for leveling up quickly</li><li>Combine with streaks for mega gains</li></ul>',
            'energy': '<ul><li>Energy refills are automatic</li><li>Use them for marathon sessions</li><li>No need to save - they expire daily</li></ul>',
            'gems': '<ul><li>Complete perfect scores for bonus gems</li><li>Higher difficulty = more gems</li><li>Stack with other multipliers</li></ul>',
            'free': '<ul><li>Your first quiz today is FREE</li><li>Choose wisely - make it count</li><li>Resets at midnight</li></ul>',
            'limited': '<ul><li>Bonus only applies to first practice</li><li>Extra XP helps build streaks</li><li>Resets daily at midnight</li></ul>'
        };
        
        return tips[type] || '<ul><li>Enjoy the special bonus!</li></ul>';
    }

    getTimeRemaining(endTime) {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        
        if (diff <= 0) return 'Expired';
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        
        return `${minutes}m`;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.eventDotsDisplay = new EventDotsDisplay();
    });
} else {
    window.eventDotsDisplay = new EventDotsDisplay();
}
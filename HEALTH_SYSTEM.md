# JazzyPop Health System

## Heart Regeneration Mechanics

### 1. Natural Regeneration (Free)
```javascript
const HEART_REGEN_CONFIG = {
    maxHearts: 5,
    regenInterval: 30 * 60 * 1000,  // 30 minutes
    regenAmount: 1,
    regenWhileActive: false,  // Don't regen during quiz
    notificationAt: 5  // Notify when full
};

// Heart regeneration timer
class HeartSystem {
    constructor() {
        this.hearts = this.loadHearts() || 5;
        this.lastLostTime = this.loadLastLostTime();
        this.regenTimer = null;
    }
    
    loseHeart() {
        if (this.hearts > 0) {
            this.hearts--;
            this.lastLostTime = Date.now();
            this.saveState();
            this.startRegenTimer();
            
            if (this.hearts === 0) {
                this.triggerOutOfHearts();
            }
        }
    }
    
    startRegenTimer() {
        // Clear existing timer
        if (this.regenTimer) clearInterval(this.regenTimer);
        
        this.regenTimer = setInterval(() => {
            if (this.hearts < HEART_REGEN_CONFIG.maxHearts) {
                this.hearts++;
                this.saveState();
                
                if (this.hearts === HEART_REGEN_CONFIG.maxHearts) {
                    this.notifyFullHearts();
                    clearInterval(this.regenTimer);
                }
            }
        }, HEART_REGEN_CONFIG.regenInterval);
    }
    
    getTimeUntilNextHeart() {
        if (this.hearts >= HEART_REGEN_CONFIG.maxHearts) return null;
        
        const timeSinceLost = Date.now() - this.lastLostTime;
        const timeUntilNext = HEART_REGEN_CONFIG.regenInterval - (timeSinceLost % HEART_REGEN_CONFIG.regenInterval);
        
        return {
            minutes: Math.floor(timeUntilNext / 60000),
            seconds: Math.floor((timeUntilNext % 60000) / 1000)
        };
    }
}
```

### 2. Gem Purchase Options
```javascript
const HEART_SHOP = {
    refillAll: {
        cost: 100,
        action: 'refill',
        hearts: 5,
        icon: '❤️‍🔥',
        name: 'Full Refill'
    },
    singleHeart: {
        cost: 30,
        action: 'add',
        hearts: 1,
        icon: '❤️',
        name: 'Single Heart'
    },
    doubleHearts: {
        cost: 150,
        action: 'upgrade',
        duration: 60 * 60 * 1000, // 1 hour
        icon: '💕',
        name: 'Double Hearts (1hr)'
    },
    shieldMode: {
        cost: 200,
        action: 'shield',
        duration: 30 * 60 * 1000, // 30 minutes
        icon: '🛡️',
        name: 'Shield Mode (30min)'
    }
};
```

### 3. Out of Hearts Experience
```html
<!-- Out of Hearts Modal -->
<div class="out-of-hearts-modal">
    <div class="modal-content">
        <div class="hearts-empty-icon">💔</div>
        <h2>Out of Hearts!</h2>
        <p>Your hearts will regenerate over time, or you can:</p>
        
        <div class="recovery-options">
            <!-- Wait Timer -->
            <div class="option-card timer-option">
                <div class="option-icon">⏰</div>
                <h3>Wait</h3>
                <p>Next heart in:</p>
                <div class="countdown">28:45</div>
                <button class="btn-secondary" onclick="setReminder()">Remind Me</button>
            </div>
            
            <!-- Purchase Option -->
            <div class="option-card purchase-option">
                <div class="option-icon">💎</div>
                <h3>Use Gems</h3>
                <p>Full refill</p>
                <div class="gem-cost">100 💎</div>
                <button class="btn-primary" onclick="purchaseHearts()">Refill Now</button>
            </div>
            
            <!-- Practice Mode -->
            <div class="option-card practice-option">
                <div class="option-icon">📚</div>
                <h3>Practice Mode</h3>
                <p>Review without losing hearts</p>
                <button class="btn-secondary" onclick="enterPracticeMode()">Practice</button>
            </div>
        </div>
    </div>
</div>
```

## Visual Heart Display States

```css
/* Heart display variations */
.hearts-display {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Full hearts */
.heart-full { color: #ff4b4b; }

/* Empty hearts */
.heart-empty { 
    color: #ff4b4b;
    opacity: 0.3;
}

/* Regenerating heart */
.heart-regenerating {
    color: #ff4b4b;
    opacity: 0.5;
    animation: pulse 2s ease-in-out infinite;
}

/* Shield mode */
.hearts-shielded {
    position: relative;
}
.hearts-shielded::after {
    content: '🛡️';
    position: absolute;
    top: -5px;
    right: -5px;
    font-size: 16px;
}

/* Double hearts mode */
.hearts-doubled {
    background: linear-gradient(45deg, #ff4b4b, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

## Implementation

```javascript
// Real-time heart display update
function updateHeartDisplay() {
    const heartSystem = new HeartSystem();
    const display = document.getElementById('hearts-display');
    const currentHearts = heartSystem.hearts;
    const maxHearts = HEART_REGEN_CONFIG.maxHearts;
    
    // Show current/max format
    display.innerHTML = `❤️(${currentHearts}/${maxHearts})`;
    
    // Add regeneration timer if not full
    if (currentHearts < maxHearts) {
        const timeUntil = heartSystem.getTimeUntilNextHeart();
        if (timeUntil) {
            display.innerHTML += ` <span class="regen-timer">${timeUntil.minutes}:${timeUntil.seconds.toString().padStart(2, '0')}</span>`;
        }
    }
    
    // Update color based on heart level
    if (currentHearts === 0) {
        display.classList.add('hearts-critical');
    } else if (currentHearts === 1) {
        display.classList.add('hearts-warning');
    }
}
```
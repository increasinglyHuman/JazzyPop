# RewardsDisplay Component Usage Guide

## Quick Integration Guide for Modals

### 1. Initialize RewardsDisplay in Your Modal Constructor

```javascript
class YourModal {
    constructor() {
        // ... other initialization
        this.rewardsDisplay = null; // Will hold RewardsDisplay instance
    }
    
    init() {
        // ... other init code
        
        // Initialize rewards display component
        if (window.RewardsDisplay) {
            this.rewardsDisplay = new window.RewardsDisplay();
        }
    }
}
```

### 2. Add HTML Container for Rewards in Your Results Screen

```html
<!-- In your results screen HTML -->
<div class="results-screen">
    <h2>Great Work!</h2>
    
    <!-- Other results content -->
    
    <!-- Rewards container -->
    <div class="rewards-bar-container">
        <h3>You Earned:</h3>
        <div id="rewardsBar" class="rewards-bar">
            <!-- RewardsDisplay will populate this -->
        </div>
    </div>
</div>
```

### 3. Call RewardsDisplay When Showing Results

```javascript
async showResults() {
    // Get rewards from your completion method
    const rewards = await this.awardCompletionBonus();
    
    // Build your results HTML
    const container = document.getElementById('yourContainer');
    container.innerHTML = `
        <div class="results-screen">
            <h2>Great Work!</h2>
            <!-- Your content -->
            <div class="rewards-bar-container">
                <h3>You Earned:</h3>
                <div id="rewardsBar" class="rewards-bar"></div>
            </div>
        </div>
    `;
    
    // Use RewardsDisplay to animate rewards
    if (this.rewardsDisplay && rewards) {
        const rewardsContainer = document.getElementById('rewardsBar');
        if (rewardsContainer) {
            setTimeout(() => {
                this.rewardsDisplay.show(rewards, rewardsContainer, { 
                    size: 'medium',  // 'small', 'medium', or 'large'
                    theme: 'dark'    // 'dark' or 'light'
                });
            }, 300); // Small delay for visual flow
        }
    }
}
```

## Complete Example from FlashcardModal

Here's the exact implementation from FlashcardModal.js:

```javascript
// 1. Constructor setup
constructor() {
    // ... other properties
    this.rewardsDisplay = null; // Reusable rewards display component
}

// 2. Initialization
init() {
    this.createModal();
    this.attachEventListeners();
    
    // Initialize rewards display component
    if (window.RewardsDisplay) {
        this.rewardsDisplay = new window.RewardsDisplay();
    }
}

// 3. In showResults method
async showResults() {
    // Award completion rewards
    const rewards = await this.awardCompletionBonus();
    
    // Build results screen with rewards container
    flashcardContainer.innerHTML = `
        <div class="results-screen factoid-results">
            <h2>Great Work!</h2>
            <div class="results-stats">
                <div class="result-stat">
                    <span class="stat-value">${this.cards.length}</span>
                    <span class="stat-label">Facts Studied</span>
                </div>
            </div>
            <div class="rewards-bar-container">
                <h3>You Earned:</h3>
                <div id="rewardsBar" class="rewards-bar"></div>
            </div>
            <div class="results-actions">
                <button class="btn-primary" onclick="window.flashcardModal.close()">Done</button>
            </div>
        </div>
    `;
    
    // Animate the rewards display
    if (this.rewardsDisplay && rewards) {
        const rewardsContainer = document.getElementById('rewardsBar');
        if (rewardsContainer) {
            setTimeout(() => {
                this.rewardsDisplay.show(rewards, rewardsContainer, { 
                    size: 'medium',
                    theme: 'dark' 
                });
            }, 300);
        }
    }
}
```

## Rewards Object Format

The rewards object should match what EconomyManager returns:

```javascript
{
    xp: 100,          // Experience points
    coins: 50,        // Gold coins
    hearts: 2,        // Rare hearts
    diamonds: 1,      // Ultra-rare diamonds
    sapphires: 3,     // Blue gems
    emeralds: 2,      // Green gems
    rubies: 1,        // Red gems
    amethysts: 1,     // Purple gems
    keys: 1,          // Quest keys
    tickets: 2,       // Event tickets
    giftBox: 1        // Mystery boxes
}
```

## Options for RewardsDisplay.show()

```javascript
{
    size: 'medium',     // 'small' (60px), 'medium' (80px), 'large' (100px)
    theme: 'dark',      // 'dark' or 'light'
    celebrate: true,    // Show celebration effects for high-value rewards
    staggerDelay: 100   // Delay between slot animations (ms)
}
```

## Quick Notification Mode

For instant feedback without slot animation:

```javascript
// Show a quick reward notification
this.rewardsDisplay.showQuickReward(
    { coins: 10, xp: 25 },
    document.body,
    { position: 'top-right' }
);
```

## Integration Checklist

- [ ] Add `this.rewardsDisplay = null` to constructor
- [ ] Initialize with `new window.RewardsDisplay()` in init()
- [ ] Add container div with id="rewardsBar" in results HTML
- [ ] Call `this.rewardsDisplay.show()` with rewards object
- [ ] Make sure your results method is async if using await
- [ ] Test with different reward combinations

## Common Patterns

### Pattern 1: Quiz Completion
```javascript
const rewards = await window.economyManager.processQuizComplete({
    score: this.score,
    totalQuestions: this.questions.length,
    category: this.category,
    difficulty: this.difficulty
});
```

### Pattern 2: Practice Session
```javascript
const rewards = await window.economyManager.processFlashcardComplete({
    category: this.category,
    cardType: 'factoid',
    correctCount: this.correctAnswers,
    totalCards: this.cards.length,
    practiceTime: Date.now() - this.sessionStartTime
});
```

### Pattern 3: Achievement Unlock
```javascript
const rewards = await window.economyManager.processAchievement({
    type: 'first_perfect_score',
    category: this.category
});
```

## Troubleshooting

1. **RewardsDisplay is undefined**: Make sure RewardsDisplay.js loads before your modal
2. **No animation**: Check that the container element exists and has an ID
3. **Rewards not showing**: Verify the rewards object has numeric values > 0
4. **Wrong colors**: The component automatically colors gems based on type

## CSS Requirements

Make sure these are included in your HTML:
```html
<link rel="stylesheet" href="./src/styles/components/rewards-display.css" />
```

The component handles all styling internally, but you can customize the container:
```css
.rewards-bar-container {
    margin: 40px auto;
    padding: 30px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    max-width: 500px;
}
```
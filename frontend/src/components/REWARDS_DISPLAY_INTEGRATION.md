# RewardsDisplay Component Integration Guide

## Overview
The RewardsDisplay component provides a reusable slot machine animation for showing rewards throughout JazzyPop. This document outlines the integration process and backend requirements.

## Component Features
- Slot machine animation for multiple reward types
- Support for all game currencies and resources
- Quick notification mode for single rewards
- Responsive design with size variations
- Theme support (dark/light)
- Celebration effects for high-value rewards

## Backend Requirements

### 1. Rewards Processing Endpoint
Create a centralized endpoint for processing all reward events:

```
POST /api/economy/process-rewards
{
  "userId": "user123",
  "activityType": "quiz_complete" | "flashcard_complete" | "daily_bonus" | "achievement" | "purchase",
  "activityData": {
    // Activity-specific data
    "quizId": "quiz456",
    "score": 8,
    "totalQuestions": 10,
    "timeSpent": 120,
    "streak": 3,
    // etc.
  }
}

Response:
{
  "rewards": {
    "coins": 50,
    "xp": 100,
    "tickets": 2,
    "keys": 0,
    "hearts": 0,
    "diamonds": 0,
    "sapphires": 0,
    "emeralds": 0,
    "rubies": 0,
    "amethysts": 0,
    "giftBox": 0
  },
  "bonuses": {
    "streakBonus": 1.5,
    "dailyBonus": 2.0,
    "eventBonus": 1.0
  },
  "totals": {
    "coins": 1250,  // User's new total
    "xp": 3400,
    // etc.
  },
  "levelUp": false,
  "achievements": []
}
```

### 2. Activity-Specific Endpoints
For better organization, create specific endpoints that internally use the rewards processor:

```
POST /api/quiz/complete
POST /api/flashcard/complete
POST /api/daily/claim
POST /api/achievement/claim
```

### 3. Reward Calculation Logic
Backend should handle:
- Base reward amounts
- Difficulty multipliers
- Streak bonuses
- Daily/weekly bonuses
- Special event multipliers
- VIP/Premium bonuses
- Gift box random rewards

### 4. Database Schema Updates
```sql
-- Rewards history table
CREATE TABLE reward_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50),
  activity_id VARCHAR(100),
  rewards JSONB,
  bonuses JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User inventory updates
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS last_reward_at TIMESTAMP;
```

## Frontend Integration Steps

### 1. Include Required Files
```html
<!-- In index.html -->
<link rel="stylesheet" href="src/styles/components/rewards-display.css">
<script src="src/components/RewardsDisplay.js"></script>
```

### 2. QuizModal Integration
```javascript
// In QuizModal.js showResults() method
async showResults() {
    // ... existing code ...
    
    // Process quiz completion through backend
    const rewardData = await window.economyManager.processQuizComplete({
        quizId: this.currentQuiz.id,
        score: this.score,
        totalQuestions: this.questions.length,
        timeSpent: this.getTimeSpent(),
        difficulty: this.currentQuiz.difficulty
    });
    
    // Create rewards display container
    const rewardsContainer = RewardsDisplay.createRewardsContainer(
        document.querySelector('.quiz-results'),
        'quizRewardsContainer'
    );
    
    // Show rewards animation
    const rewardsDisplay = new RewardsDisplay();
    await rewardsDisplay.show(rewardData.rewards, rewardsContainer, {
        size: 'medium',
        theme: 'dark'
    });
}
```

### 3. FlashcardModal Integration
```javascript
// Replace existing animateRewardSlots method
async showResults() {
    // ... existing code ...
    
    // Award completion rewards
    const rewards = await this.awardCompletionBonus();
    
    if (isFactoidSession) {
        // Use RewardsDisplay instead of custom animation
        const rewardsContainer = document.getElementById('rewardsBar').parentElement;
        const rewardsDisplay = new RewardsDisplay();
        await rewardsDisplay.show(rewards, rewardsContainer, {
            size: 'large'
        });
    }
}
```

### 4. Daily Bonus Integration
```javascript
// In daily bonus modal
async claimDailyBonus() {
    const rewards = await window.economyManager.processDailyBonus();
    
    const container = document.querySelector('.daily-bonus-modal-content');
    const rewardsContainer = RewardsDisplay.createRewardsContainer(container);
    
    const rewardsDisplay = new RewardsDisplay();
    await rewardsDisplay.show(rewards.rewards, rewardsContainer, {
        size: 'large',
        theme: 'light'
    });
}
```

### 5. Quick Notifications
```javascript
// For single reward notifications (e.g., achievement unlocked)
const rewardsDisplay = new RewardsDisplay();
rewardsDisplay.showQuickReward('coins', 100, {
    duration: 3000,
    position: 'top'
});
```

## EconomyManager Updates

Update EconomyManager to work with the new rewards system:

```javascript
// In EconomyManager.js
class EconomyManager {
    // ... existing code ...
    
    async processQuizComplete(quizData) {
        try {
            const response = await fetch('/api/economy/process-rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    userId: this.userId,
                    activityType: 'quiz_complete',
                    activityData: quizData
                })
            });
            
            const result = await response.json();
            
            // Update local state
            this.updateLocalInventory(result.totals);
            
            // Trigger any level up or achievement notifications
            if (result.levelUp) {
                this.handleLevelUp(result.newLevel);
            }
            
            if (result.achievements?.length > 0) {
                this.handleAchievements(result.achievements);
            }
            
            return result;
        } catch (error) {
            console.error('Failed to process quiz rewards:', error);
            // Return minimum rewards as fallback
            return {
                rewards: { coins: 10, xp: 20 },
                bonuses: {},
                totals: this.inventory
            };
        }
    }
    
    async processFlashcardComplete(flashcardData) {
        // Similar implementation
    }
    
    async processDailyBonus() {
        // Similar implementation
    }
}
```

## Testing Checklist

- [ ] Test rewards display in QuizModal after quiz completion
- [ ] Test rewards display in FlashcardModal results
- [ ] Test quick notifications for single rewards
- [ ] Test different reward combinations
- [ ] Test mobile responsiveness
- [ ] Test error handling (backend failure)
- [ ] Test animation performance with many rewards
- [ ] Test accessibility (screen readers, reduced motion)
- [ ] Test theme variations
- [ ] Test gift box special animations

## Performance Considerations

1. **Lazy Loading**: Only load RewardsDisplay when needed
2. **Animation Throttling**: Limit simultaneous animations
3. **Image Optimization**: Ensure reward icons are optimized
4. **Memory Management**: Clean up after animations complete

## Future Enhancements

1. **Sound Effects**
   - Slot machine spinning sound
   - Reward collection sound
   - Celebration sound for big rewards

2. **Particle Effects**
   - Confetti for large rewards
   - Sparkles for gem rewards
   - Coin shower animation

3. **Social Sharing**
   - Share big rewards to social media
   - Friend comparisons
   - Leaderboard integration

4. **Advanced Features**
   - Reward multiplier visualization
   - Combo counter
   - Reward history viewer
   - Predictive rewards (show potential rewards before activity)

## Troubleshooting

### Common Issues

1. **Rewards not displaying**
   - Check console for errors
   - Verify container element exists
   - Ensure CSS is loaded

2. **Animation stuttering**
   - Reduce number of simultaneous slots
   - Check for CSS conflicts
   - Test on lower-end devices

3. **Backend integration issues**
   - Verify API endpoints are correct
   - Check authentication token
   - Monitor network requests

## Support

For questions or issues with integration:
1. Check the console for detailed error messages
2. Review the example implementations in the component file
3. Test with mock data first before backend integration
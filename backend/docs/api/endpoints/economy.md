# Economy Endpoints

Economy endpoints manage the game's currency system, energy management, and reward processing.

## Spend Energy

**POST** `/api/economy/spend-energy`

Deducts energy from the player's economy when starting a game or activity. This endpoint should be called before starting any game mode.

### Request Body
```json
{
  "amount": 10,
  "activity_type": "quiz_start",
  "session_id": "session_abc123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | integer | Yes | Energy to spend (1-100) |
| activity_type | string | Yes | Type: 'quiz_start', 'practice_start', 'flashcard_start', 'bonus_unlock' |
| session_id | string | No | Session identifier |
| user_id | UUID | No | User identifier |

### Success Response (200)
```json
{
  "success": true,
  "remaining_energy": 90,
  "new_state": {
    "energy": 90,
    "hearts": 5,
    "coins": 1250,
    "sapphires": 8,
    "emeralds": 4,
    "rubies": 2,
    "amethysts": 1,
    "diamonds": 0,
    "xp": 4200,
    "level": 8,
    "streak": 3
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "error": "Insufficient energy",
  "required": 10,
  "available": 5
}
```

---

## Process Game Result

**POST** `/api/economy/process-result`

Calculate and apply rewards after game completion. This endpoint processes the game results and updates the player's economy state.

### Query Parameters
- `session_id` (string, optional) - Session identifier
- `user_id` (UUID, optional) - User identifier

### Request Body
```json
{
  "type": "quiz_complete",
  "category": "science",
  "difficulty": "medium",
  "mode": "chaos",
  "correct_answers": 7,
  "total_questions": 10,
  "time_spent": 98.5,
  "perfect_score": false,
  "streak": 2
}
```

### Parameters
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| type | string | Required | Game type: 'quiz_complete', 'practice_complete', 'flashcard_complete' |
| category | string | 'general' | Content category played |
| difficulty | string | 'medium' | Difficulty: 'easy', 'medium', 'hard', 'extreme' |
| mode | string | 'normal' | Game mode: 'normal', 'chaos', 'zen', 'speed' |
| correct_answers | integer | 0 | Number of correct answers |
| total_questions | integer | 1 | Total questions in the game |
| time_spent | float | 0 | Time spent in seconds |
| perfect_score | boolean | false | Whether all answers were correct |
| streak | integer | 0 | Current winning streak |

### Response
```json
{
  "success": true,
  "rewards": {
    "coins": 150,
    "xp": 200,
    "bonus": {
      "perfect_score": false,
      "speed_bonus": true,
      "streak_bonus": 10
    }
  },
  "new_state": {
    "energy": 90,
    "hearts": 5,
    "coins": 1400,
    "sapphires": 8,
    "emeralds": 4,
    "rubies": 2,
    "amethysts": 1,
    "diamonds": 0,
    "xp": 4400,
    "level": 8,
    "streak": 3
  },
  "level_up": {
    "new_level": 9,
    "rewards": {
      "energy_refill": true,
      "bonus_coins": 500,
      "new_unlock": "chaos_mode"
    }
  }
}
```

---

## Get Economy State

**GET** `/api/economy/state`

Retrieve the current economy state including energy, coins, gems, and level.

### Query Parameters
- `session_id` (string, optional) - Session identifier
- `user_id` (UUID, optional) - User identifier

### Response
```json
{
  "state": {
    "energy": 75,
    "hearts": 4,
    "coins": 2500,
    "sapphires": 8,
    "emeralds": 4,
    "rubies": 2,
    "amethysts": 1,
    "diamonds": 0,
    "xp": 4200,
    "level": 8,
    "streak": 3
  }
}
```

## Economy System Overview

### Currencies
1. **Energy** (0-100) - Required to play games, regenerates over time
2. **Hearts** (0-10) - Lives system for certain game modes
3. **Coins** - Basic currency earned from gameplay
4. **Gems** - Premium currencies with different rarities:
   - Sapphires (Blue) - Special purchases
   - Emeralds (Green) - Content unlocking
   - Rubies (Red) - Premium features
   - Amethysts (Purple) - Cosmetic items
   - Diamonds - Ultra-rare, exclusive content

### Reward Calculation
Rewards are calculated based on:
- Game performance (accuracy)
- Time spent
- Difficulty level
- Game mode
- Current streak
- Special bonuses (perfect score, speed completion)

### Level System
- XP is earned from all game activities
- Levels unlock new features and content
- Level-up rewards include energy refills and bonus currencies

## Implementation Notes

1. **Energy Management**: Energy is the primary gate for gameplay. Consider implementing:
   - Natural regeneration (1 energy per minute)
   - Full refill on level up
   - Purchase options with gems

2. **Session vs User**: The system supports both anonymous (session-based) and authenticated (user-based) play.

3. **Transaction Logging**: All economy changes are logged for audit and analytics purposes.

4. **Fallback Behavior**: If database is unavailable, the API returns default economy states to allow gameplay to continue.
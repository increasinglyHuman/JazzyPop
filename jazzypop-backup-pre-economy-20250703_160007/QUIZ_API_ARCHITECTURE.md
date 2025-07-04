# JazzyPop Quiz API Architecture

## Current Issues
1. **QuizModal ignores quiz ID** - Always fetches random quiz instead of the one clicked
2. **Cards endpoint confusion** - Promotional cards vs actual quiz content
3. **Mismatched API calls** - Frontend expects one thing, backend provides another

## Correct API Structure

### Quiz Endpoints (What to Use)

#### 1. Get Multiple Quiz Sets (MAIN ENDPOINT)
```
GET /api/content/quiz/sets
```
Parameters:
- `count` (int): Number of quiz sets to return (1-100)
- `category` (string): Filter by category (optional)
- `mode` (string): Filter by mode (optional)
- `order` (string): Sort order (random|newest|oldest)

Returns: Array of quiz sets, each containing 10 questions

Example:
```javascript
// Get 5 random quiz sets
GET https://p0qp0q.com/api/content/quiz/sets?count=5

// Get 3 gaming quizzes
GET https://p0qp0q.com/api/content/quiz/sets?count=3&category=gaming
```

#### 2. Get Current/Random Quiz
```
GET /api/content/quiz/current
```
Parameters:
- `mode` (string): Preferred mode (optional)
- `exclude` (string): Comma-separated list of quiz IDs to exclude

Returns: Single quiz set

**Issue**: This endpoint doesn't support fetching by specific ID!

### Promotional Cards Endpoint (Deprecated)
```
GET /api/cards/active
```
**DO NOT USE** - Returns promotional "quiz_tease" cards, not actual quizzes

## Required Fixes

### 1. Backend: Add Get Quiz by ID Endpoint
```
GET /api/content/quiz/{quiz_id}
```
This endpoint is missing but needed for the frontend to load specific quizzes.

### 2. Frontend: Fix QuizModal.loadQuiz()
Current (WRONG):
```javascript
async loadQuiz(quizId) {
    // Ignores quizId parameter!
    const url = `${apiBase}/api/content/quiz/current?exclude=${recentQuizIds}`;
}
```

Should be:
```javascript
async loadQuiz(quizId) {
    // Use the specific quiz ID
    const url = `${apiBase}/api/content/quiz/${quizId}`;
}
```

### 3. Frontend: CardManager Already Correct
The CardManager is actually doing the right thing:
1. Fetches from `/api/content/quiz/sets`
2. Transforms quiz data into card format for display
3. Passes quiz_id when card is clicked

## Recommended Architecture

```
[User clicks quiz card]
    |
    v
[CardManager] 
    |
    ├─> Fetches quiz list: GET /api/content/quiz/sets?count=10
    ├─> Displays as cards in UI
    └─> On click: passes quiz_id to QuizModal
    
[QuizModal.open(quiz_id)]
    |
    v
[QuizModal.loadQuiz(quiz_id)]
    |
    └─> Should fetch: GET /api/content/quiz/{quiz_id}
         (Currently fetches random quiz instead!)
```

## Summary
- CardManager is correctly using quiz/sets endpoint
- QuizModal needs to be fixed to use the quiz_id parameter
- Backend needs a new endpoint to fetch quiz by ID
- Remove/deprecate the promotional cards system
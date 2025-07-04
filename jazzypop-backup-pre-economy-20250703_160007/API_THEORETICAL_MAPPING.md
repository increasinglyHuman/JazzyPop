# JazzyPop API Theoretical Mapping

## Frontend → Backend API Flow

### 1. Quiz Flow

#### Loading a Quiz
**Frontend Call (QuizModal.js:143-146)**:
```javascript
const apiBase = window.API_URL || 'http://52.88.234.65:8000';
const url = `${apiBase}/api/content/quiz/current?exclude=${recentQuizIds}${modeParam}`;
```

**Backend Handler (main.py:89-178)**:
- Endpoint: `GET /api/content/quiz/current`
- Parameters: `mode` (optional)
- Database Query: 
  - First checks Redis cache (DISABLED)
  - Queries `content` table for `type = 'quiz_set'`
  - Returns random quiz set with mode variations
- Fallback: Returns hardcoded quiz if database empty

#### Loading Quiz Sets
**Frontend Call (CardManager.js)**:
```javascript
const url = `${apiBase}/api/content/quiz/sets?count=${count}&category=${category}`;
```

**Backend Handler (main.py:237-358)**:
- Endpoint: `GET /api/content/quiz/sets`
- Parameters: count, category, mode, order, include_variations
- Database Query:
  - Queries `content` table for `type = 'quiz_set'`
  - Filters by category if provided
  - Joins with `content_variations` for mode-specific content
  - Returns array of quiz sets

### 2. Flashcard Flow

#### Loading Flashcards
**Frontend Call (FlashcardModal.js)**:
```javascript
const response = await fetch(`${apiBase}/api/flashcards`, {
    method: 'POST',
    body: JSON.stringify({ category, count, user_id })
});
```

**Backend Handler (main.py:431-461)**:
- Endpoint: `POST /api/flashcards`
- Database Query:
  - Calls `db.get_flashcard_content()` 
  - Queries for quote_set, pun_set, joke_set types
  - Returns 10 items from a single set
- Fallback: Generates dynamic content

### 3. Economy Flow

#### Processing Game Results
**Frontend Call (EconomyManager.js)**:
```javascript
const response = await fetch(`${apiBase}/api/economy/process-result`, {
    method: 'POST',
    body: JSON.stringify(gameResult)
});
```

**Backend Handler (main.py:507-530)**:
- Endpoint: `POST /api/economy/process-result`
- Calculates rewards based on game performance
- Updates economy state in database
- Returns new state and rewards

### 4. Database Access Patterns

#### Content Table Structure
```sql
- id (UUID)
- type (text): 'quiz_set', 'quote_set', 'pun_set', etc.
- data (JSONB): Contains the actual content
- metadata (JSONB): Additional info
- is_active (boolean)
- created_at (timestamp)
```

#### Key Issues Identified

1. **Redis Caching Disabled**
   - database.py shows Redis disabled due to "caching issues"
   - All queries hit PostgreSQL directly

2. **URL Configuration Mismatch**
   - Frontend expects: `https://p0qp0q.com`
   - Fallback hardcoded: `http://52.88.234.65:8000`
   - Backend runs on port 8000

3. **Content Type Confusion**
   - Backend expects '_set' types (quiz_set, quote_set)
   - Some code still references individual items

4. **Mode Variations**
   - Stored in separate `content_variations` table
   - Not all content has variations for all modes
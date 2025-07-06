# JazzyPop API Documentation - Current State

## Base URL
- Production: `https://p0qp0q.com/api`
- Local: `http://localhost:8000/api`

## Authentication
Currently no authentication required (to be implemented)

## Endpoints

### Health Check

#### GET /api/health
Check if the API is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-03T12:52:11.788776"
}
```

---

### Quiz Endpoints

#### GET /api/content/quiz/sets
**Primary endpoint for fetching quiz content.** Returns complete quiz sets with 10 questions each.

**Query Parameters:**
- `count` (integer, 1-100): Number of quiz sets to return. Default: 1
- `category` (string): Filter by category. Options: `technology`, `science`, `history`, `geography`, `literature`, `film`, `music`, `art`, `sports`, `nature`, `animals`, `food_cuisine`, `pop_culture`, `mythology`, `space`, `gaming`, `internet_culture`, `architecture`, `ancient_architecture`, `fashion_design`, `inventions`, `famous_lies`, `language_evolution`, `dinosaurs`, `fame_glory`
- `mode` (string): Filter by mode. Options: `random`, `poqpoq`, `chaos`, `zen`, `speed`. Default: `random`
- `order` (string): Sort order. Options: `random`, `newest`, `oldest`. Default: `random`
- `include_variations` (boolean): Include mode variations. Default: `true`

**Example Request:**
```
GET /api/content/quiz/sets?count=5&category=gaming&mode=chaos
```

**Response:**
```json
[
  {
    "id": "uuid-here",
    "type": "quiz_set",
    "data": {
      "title": "Epic Gaming Knowledge Challenge",
      "category": "gaming",
      "questions": [
        {
          "question": "What unexpected connection exists between Pac-Man and pizza?",
          "answers": [
            {"id": "a", "text": "Both were invented in 1980", "correct": false},
            {"id": "b", "text": "Pac-Man was inspired by a pizza with a slice missing", "correct": true},
            {"id": "c", "text": "The first Pac-Man tournament was held in a pizzeria", "correct": false},
            {"id": "d", "text": "Both use the same yellow color (#FFD700)", "correct": false}
          ]
        }
        // ... 9 more questions
      ]
    },
    "mode": "chaos",
    "mode_effects": ["screen_shake", "rainbow_text"],
    "created_at": "2025-01-03T..."
  }
]
```

#### GET /api/content/quiz/current
Get a single random quiz set. Less preferred than `/quiz/sets`.

**Query Parameters:**
- `mode` (string): Preferred mode
- `exclude` (string): Comma-separated list of quiz IDs to exclude

**Response:** Same structure as single item from `/quiz/sets`

---

### Flashcard Endpoints

#### POST /api/flashcards
Get flashcard content for practice mode.

**Request Body:**
```json
{
  "category": "trivia_mix",
  "count": 10,
  "user_id": "optional-user-id"
}
```

**Categories:**
- `famous_quotes` - Quote flashcards (fill-in-the-blank author challenge)
- `bad_puns` - Pun flashcards (multi-page conversation format)
- `knock_knock` - Knock-knock jokes (5-page conversation format)
- `trivia_mix` - Factoids with simple-flip format (fascinating fact on front, mind-blowing detail on back)

**Response:**
```json
{
  "cards": [
    {
      "id": "card-id",
      "category": "Factoid 🤯",
      "type": "factoid",
      "content": "Honey never spoils.",
      "answer": "Archaeologists have found 3000-year-old honey in Egyptian tombs that was still perfectly edible. Its low moisture content and acidic pH create an environment where bacteria can't survive.",
      "challengeType": "simple-flip",
      "difficulty": "medium"
    }
  ]
}
```

#### POST /api/flashcards/track-view
Track that a user has viewed a flashcard.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "content_id": "content-uuid",
  "content_type": "flashcard",
  "metadata": {}
}
```

---

### Economy Endpoints

#### POST /api/economy/process-result
Process game results and calculate rewards.

**Request Body:**
```json
{
  "type": "quiz_complete",
  "category": "science",
  "difficulty": "medium",
  "mode": "chaos",
  "correct_answers": 8,
  "total_questions": 10,
  "time_spent": 120.5,
  "perfect_score": false,
  "streak": 3
}
```

**Response:**
```json
{
  "success": true,
  "rewards": {
    "xp": 15,
    "coins": 45,
    "sapphires": 1
  },
  "new_state": {
    "energy": 90,
    "hearts": 5,
    "coins": 245,
    "sapphires": 3,
    "emeralds": 0,
    "rubies": 1,
    "amethysts": 0,
    "diamonds": 0,
    "xp": 320,
    "level": 3,
    "streak": 3
  },
  "level_up": null
}
```

#### GET /api/economy/state
Get current economy state for a user or session.

**Query Parameters:**
- `session_id` (string): Session identifier
- `user_id` (uuid): User identifier

**Response:**
```json
{
  "state": {
    "energy": 100,
    "hearts": 5,
    "coins": 150,
    "sapphires": 2,
    "emeralds": 0,
    "rubies": 1,
    "amethysts": 0,
    "diamonds": 0,
    "xp": 250,
    "level": 2,
    "streak": 5
  }
}
```

---

### Deprecated Endpoints

#### GET /api/cards/active ⚠️ DEPRECATED
Returns promotional cards. Should not be used - will be removed.

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid category. Must be one of: technology, science, ..."
}
```

### 404 Not Found
```json
{
  "detail": "Quiz not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting
Currently no rate limiting implemented.

## Webhooks
The system uses Discord webhooks for monitoring alerts. These are not part of the public API.
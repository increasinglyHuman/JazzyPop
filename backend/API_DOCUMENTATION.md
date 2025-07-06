# JazzyPop API Documentation
*All the endpoints in one place so we don't go in circles again*

## Base URL
- Production: `https://p0qp0q.com/api`
- Local: `http://localhost:8000/api`

## Quiz Endpoints

### Get Quiz Sets
```
GET /api/content/quiz/sets?count=12
```
Returns quiz sets with economics data, questions, and mode variations.

## Flashcard/Practice Card Endpoints

### Get Flashcards (Including Factoids!)
```
POST /api/flashcards
Content-Type: application/json

{
  "category": "trivia_mix",  // For factoids/trivia
  "count": 10,
  "user_id": "optional-user-id"
}
```

**Available Categories:**
- `trivia_mix` - Returns factoids (simple-flip format with fact/detail)
- `famous_quotes` - Returns quotes
- `bad_puns` - Returns puns
- `knock_knock` - Returns knock-knock jokes

**Important Notes:**
- This is a POST endpoint, NOT GET (historical reasons)
- For `trivia_mix`, it fetches `trivia_set` from database and breaks it into individual cards
- Each trivia_set contains 10 factoids
- Returns fallback "Dynamic trivia_mix content" if no sets found

**Response Format for Factoids:**
```json
{
  "cards": [
    {
      "id": 1,
      "type": "trivia",
      "category": "trivia_mix",
      "fact": "A shrimp's heart is located in its head.",
      "detail": "It's in the thorax behind the rostrum...",
      "content": "A shrimp's heart is located in its head.",
      "answer": "It's in the thorax behind the rostrum...",
      "challengeType": "simple-flip",
      "theme": "animals",
      "difficulty": "medium"
    }
    // ... 9 more cards
  ]
}
```

## Economy Endpoints

### Get Economy State
```
GET /api/economy/state?session_id=xxxxx
```

### Process Game Result
```
POST /api/economy/process-result
```

## Content Generation

### Backend Generators
These run continuously on the server:
- `quiz_set_generator.py` - Generates quiz sets with economics
- `trivia_set_generator.py` - Generates factoid sets (10 per set)
- `pun_set_generator.py` - Generates pun sets
- `quote_set_generator.py` - Generates quote sets
- `joke_set_generator.py` - Generates joke sets

## Database Notes

### Content Types
- `quiz_set` - Full quiz with 10 questions + economics
- `trivia_set` - Set of 10 factoids (simple-flip format)
- `pun_set` - Set of 10 puns
- `quote_set` - Set of 10 quotes
- `joke_set` - Set of 10 jokes

### Key Mappings in database.py
When fetching flashcards, the code maps:
- `trivia_mix` → `trivia_set` (database type)
- `trivia_set` → `trivia` (items key in data)
- Returns all 10 items from the set

## Common Issues & Solutions

### "Dynamic Trivia Mix" showing instead of factoids
- Check if trivia_set_generator is running: `ps aux | grep trivia_set_generator`
- Verify trivia sets exist: Check content table for type='trivia_set'
- Make sure generator uses venv Python

### Economics not showing on quiz cards
- Run: `./venv/bin/python add_economics_to_quiz_sets.py`
- This adds economics to existing quiz sets

### Factoids not appearing
- Frontend calls POST /api/flashcards with category="trivia_mix"
- Backend fetches trivia_set and returns the 10 factoids inside
- Each factoid has: fact, detail, content, answer (for compatibility)

## Testing Commands

### Test Factoid Fetching
```bash
curl -X POST 'https://p0qp0q.com/api/flashcards' \
  -H 'Content-Type: application/json' \
  -d '{"category": "trivia_mix", "count": 10}'
```

### Test Quiz Fetching
```bash
curl 'https://p0qp0q.com/api/content/quiz/sets?count=1'
```

---
*Remember: When in doubt, check this file first before going in circles!*
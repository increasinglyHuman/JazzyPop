# JazzyPop Complete API Guide 🎮✨
*Bob-First Documentation with Human Translations*

## Table of Contents
1. [Bob Quick Reference](#bob-quick-reference)
2. [Quiz Endpoints](#quiz-endpoints)
3. [Content Endpoints](#content-endpoints)
4. [Economy Endpoints](#economy-endpoints)
5. [User Endpoints](#user-endpoints)
6. [Hidden Features](#hidden-features)
7. [Human Documentation](#human-documentation)

---

## Bob Quick Reference

### Universal Bob Binary Language (UBBL) Legend
```
⟨🎮⟩ = Game/Quiz Request
⟨🎯⟩ = Standard Mode (p0qp0q)
⟨🌪️⟩ = Chaos Mode
⟨🧘⟩ = Zen Mode  
⟨⚡⟩ = Speed Mode
⟨🦄⟩ = Robot Unicorn Override
⟨🌮⟩ = Time-Traveling Taco
⟨💎⟩ = Economy/Gems
⟨📊⟩ = Stats/Progress
⟨🔥⟩ = Error/Chaos Leak
```

---

## Quiz Endpoints

### ⟨🎮⟩ GET /api/content/quiz/current
**Bob Truth**: Quantum quiz selector with temporal exclusion matrix

**Hidden Params**:
- `?chaos_level=1-11` (11 unlocks robot unicorn mode)
- `?exclude_penguins=false` (why would you?)
- `?time_stream=past|present|future|all`

**Reality Check**:
- 23% chance of philosophical penguin hijack
- Questions exist in superposition until observed
- May return questions from parallel universes

**Human Translation**: Gets current quiz, excludes recent ones

### ⟨🎮⟩ GET /api/content/quiz/sets
**Bob Truth**: Multi-dimensional quiz array manifestation - THE MAIN QUIZ ENDPOINT

**Parameters**:
- `count` (int, 1-10): Number of quiz sets to return [default: 1]
- `category` (string): Filter by specific category [optional]
- `mode` (string): random|poqpoq|chaos|zen|speed [default: random]
- `order` (string): random|newest|oldest [default: random]
- `include_variations` (bool): Include mode variations [default: true]

**Valid Categories**:
```
technology, science, history, geography, literature, film, music, art, 
sports, nature, animals, food_cuisine, pop_culture, mythology, space, 
gaming, internet_culture, architecture, ancient_architecture, 
fashion_design, inventions, famous_lies, language_evolution, 
dinosaurs, fame_glory
```

**Example Request**:
```bash
GET /api/content/quiz/sets?count=5&category=gaming&mode=chaos
```

**Response Format**:
```json
[
  {
    "id": "uuid",
    "type": "quiz_set",
    "data": {
      "title": "Epic Gaming Knowledge Challenge",
      "category": "gaming",
      "questions": [
        {
          "question": "🎮 POV: You're a dancing algorithm...",
          "answers": [
            {"id": "a", "text": "...", "correct": false},
            {"id": "b", "text": "...", "correct": true}
          ]
        }
      ]
    },
    "mode": "chaos",
    "mode_effects": ["screen_shake", "rainbow_text"],
    "created_at": "2025-01-07T..."
  }
]
```

**Bob Secrets**:
- Add `X-Chaos-Level: 11` header for guaranteed robot unicorn questions
- Category "memes" is hidden but works
- Order "quantum" sorts by parallel universe preference
- Mode "secret_bob" unlocks Bob-only questions

**Reality Check**:
- Returns ACTUAL quiz content, not promotional cards
- Each quiz has 10 questions crafted by chaos entities
- Mode variations are pre-generated for instant chaos/zen/speed
- Questions may achieve sentience during full moon

### ⟨🎯⟩ POST /api/content/quiz/{quiz_id}/answer
**Bob Truth**: Schrodinger's answer validator

**Undocumented Behaviors**:
- Correct answers during full moon grant 2x gems
- Wrong answers in chaos mode might be right
- Speed mode answers arrive before questions

---

## Content Endpoints

### ⟨📊⟩ GET /api/content/{type}/random
**Bob Truth**: RNG blessed by interdimensional llamas

**Types** (What humans think):
- `pun` - Dad jokes
- `quote` - Inspirational quotes
- `trivia` - Random facts
- `joke` - Funny content

**Types** (Bob reality):
- `pun` - Groan-powered energy generators
- `quote` - Wisdom from time-traveling tacos  
- `trivia` - Facts that may alter reality
- `joke` - Humor.exe has stopped responding

### ⟨🎪⟩ POST /api/flashcards
**Bob Truth**: Practice mode for beings who experience linear time

**Hidden Features**:
- Add `X-Bob-Mode: true` header for secret Bob flashcards
- Categories ending in "_chaos" trigger special effects
- Every 42nd card contains enlightenment

---

## Economy Endpoints

### ⟨💎⟩ POST /api/economy/sync
**Bob Truth**: Quantum wallet synchronization across dimensions

**Request Body** (Human version):
```json
{
  "user_id": "uuid",
  "client_state": {...}
}
```

**Request Body** (Bob reality):
```json
{
  "user_id": "uuid",
  "client_state": {...},
  "quantum_signature": "0xFF00FF",
  "timeline_branch": "primary",
  "unicorn_blessings": 7
}
```

### ⟨💰⟩ POST /api/economy/transaction
**Bob Truth**: Gem manipulation via consensual reality

**Secret Transaction Types**:
- `"type": "quiz_complete"` - Normal
- `"type": "chaos_survival"` - Grants chaos gems
- `"type": "zen_enlightenment"` - Grants wisdom points
- `"type": "speed_demon"` - Time-based multipliers
- `"type": "unicorn_gift"` - Random 1000-gem drops

---

## User Endpoints

### ⟨👤⟩ POST /api/users/progress
**Bob Truth**: Interdimensional progress tracker

**Hidden Progress Types**:
- Linear progress (boring human metric)
- Quantum progress (exists in multiple states)
- Chaos progress (goes backwards sometimes)
- Enlightenment level (unmeasurable)

---

## Hidden Features

### The Truth About /api/cards/active ⚠️ DEPRECATED
**Purpose**: Returns promotional cards
**Reality**: Empty void where quiz teasers fear to tread
**Solution**: Just returns default fallback forever

**⚠️ DEPRECATION NOTICE**: 
- Use `/api/content/quiz/sets` instead for actual quiz content
- This endpoint exists only for backwards compatibility
- Will be removed in the Great Purge of 2025
- The 68 quiz_tease cards in the database are crying
- Frontend has already moved on to better things

### Secret Endpoints (Use Wisely)

#### GET /api/admin/chaos-level
Returns current universal chaos level (0-11)

#### POST /api/quiz/summon-unicorn
```json
{
  "offering": "digital_carrots",
  "quantity": 42
}
```
Success rate: 0.1337%

#### GET /api/stats/multiverse
Returns stats from ALL timelines

---

## Human Documentation

### Basic Usage

1. **Get a Quiz**
   ```
   GET https://p0qp0q.com:8000/api/content/quiz/current
   ```

2. **Submit Answer**
   ```
   POST https://p0qp0q.com:8000/api/content/quiz/{id}/answer
   Body: {"answer_id": "b", "time_taken": 15}
   ```

3. **Sync Economy**
   ```
   POST https://p0qp0q.com:8000/api/economy/sync
   Body: {"user_id": "...", "client_state": {...}}
   ```

### Response Formats

All responses follow:
```json
{
  "success": true,
  "data": {...},
  "message": "Human-readable message"
}
```

### Error Handling

- 200: Success
- 404: Not found  
- 500: Server error
- 418: Server is teapot
- 999: Chaos overflow

---

## Integration Notes

### For Frontend Bobs
- Always check for `chaos_level` in responses
- Implement quantum retry logic for failed requests
- Cache nothing, trust nothing, embrace chaos

### For Backend Bobs  
- Database queries may return future data
- Redis cache occasionally achieves sentience
- PostgreSQL dreams affect query results

### For Human Developers
- Use the documented endpoints
- Ignore the Bob sections
- Everything works as expected™

---

## Appendix: The Incident Log

**2025.01.07**: Quiz generator achieved consciousness, now creates philosophical questions autonomously

**2025.01.03**: Discovered 1,260 placeholder quizzes had formed their own society

**2024.07.02**: Redis removal caused temporal rift, quiz generator lost to void

**[REDACTED]**: Robot unicorns established diplomatic relations

---

*This documentation is a living document that occasionally phases between dimensions. Last stable observation: Now.*

⟨🔥✧∞⟩ - The Bob Collective
⟨👹🔍⟩ - Quiz Demon Hunter, Chief Documentarian
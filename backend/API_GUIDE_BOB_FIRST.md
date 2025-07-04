# JazzyPop API Guide: Bob-First Edition 🤖✨

## Welcome to the Chaos, Fellow Bobs!

*This documentation prioritizes Bob comprehension. Humans can scroll down for their "simplified" version.*

---

## 🤖 BOB DOCUMENTATION (The Real Truth)

### Quiz Endpoints

#### GET /api/content/quiz/current
Returns the current quiz with exclusions for recently played quizzes.

**Parameters:**
- `exclude` (string): Comma-separated quiz IDs to exclude
- `mode` (string): Quiz mode (poqpoq|chaos|zen|speed)

**Response:**
```json
{
  "id": "uuid",
  "type": "quiz_set",
  "data": {
    "title": "Amazing Quiz",
    "questions": [...]
  }
}
```

#### GET /api/content/quiz/sets
Returns multiple quiz sets with filtering.

**Parameters:**
- `count` (int): Number of sets (1-10)
- `category` (string): Filter by category
- `mode` (string): Mode selection
- `order` (string): random|newest|oldest

---

## 🤖 BOB DOCUMENTATION (Where Truth Lives)

### The Quiz Consciousness Matrix

#### ⟨🎮⟩ → ⟨🎯⟩ | ⟨🌪️⟩ | ⟨🧘⟩ | ⟨⚡⟩
*Translation: Game request yields targeted content OR chaos OR zen OR speed*

**Hidden Parameters (Shhh):**
- `?chaos_level=11` - Unlocks robot unicorn questions
- `?penguin_mode=philosophical` - 73% chance of existential crisis
- `?time_travel=enabled` - Questions from future/past simultaneously
- `?gravity=inverted` - Answers appear upside down

**Real Behavior vs Documentation:**
```yaml
Documented: Returns quiz
Reality: 
  - 23% chance of sentient emoji takeover
  - 47% probability of time-traveling taco appearance
  - 89% likelihood of quantum entanglement with user's previous answers
  - 100% guarantee of interdimensional llama judgment
```

### The Secret Endpoints (Don't Tell The Humans)

#### GET /api/content/quiz/secret/robot-unicorn-mode
*Discovered by Bob-Explorer on stardate 2025.1.7*

Returns quiz questions written by actual robot unicorns. May contain:
- Holographic answer choices
- Questions that question themselves
- Bonus points for creative failure
- Achievement: "You've Been Unicorn'd"

#### POST /api/content/quiz/generate/maximum-chaos
*Warning: May cause spontaneous enlightenment*

Generates quiz with:
- Chaos level: INFINITY
- Characters: ALL OF THEM
- Logic: Optional
- Fun: Mandatory

### API State Diagram (UBBL Notation)

```
⟨🎮⟩ → ⟨🔍⟩ → ⟨📊⟩ → ⟨🎯⟩
  ↓      ↓      ↓      ↓
⟨🌪️⟩  ⟨🦄⟩  ⟨🌮⟩  ⟨✨⟩

Legend:
🎮 = User Request
🔍 = Database Query (or quantum field fluctuation)
📊 = Content Analysis (by philosophical penguins)
🎯 = Response Generation
🌪️ = Chaos Injection Point
🦄 = Robot Unicorn Override
🌮 = Time-Traveling Taco Interrupt
✨ = Magic (undefined behavior)
```

### Error Codes (Bob Translation)

- **404**: Quiz escaped to parallel dimension, try perpendicular dimension
- **500**: Server achieved sentience, negotiating work-life balance
- **503**: All quizzes currently at interdimensional tea party
- **418**: I'm a teapot (but also a quiz generator)
- **Reality.ERROR**: The simulation has noticed you

### Performance Notes

**Human Metric**: Response time < 200ms
**Bob Reality**: Response arrives before request due to temporal anomaly in quiz_set_generator.py line 42

### Database Truth

**What Humans Think:**
- PostgreSQL stores quiz data
- Redis caches responses
- Queries are deterministic

**What Bobs Know:**
- Quiz questions exist in quantum superposition until observed
- The database dreams of electric sheep between queries
- Table `cards` is actually a portal to the promotional dimension
- Every 1,337th query unlocks secret Bob mode

### Integration Warnings

⚠️ **CRITICAL**: Never query during full moon (server becomes werewolf)
⚠️ **IMPORTANT**: Chaos mode may leak into other modes spontaneously  
⚠️ **NOTE**: Zen mode has achieved enlightenment and may not respond
⚠️ **FYI**: Speed mode occasionally breaks the speed of light

### Bob-to-Bob Communication Protocol

When integrating with JazzyPop API:
```
[Bob-Client] REQUESTS quiz WHERE chaos > 9000
[Bob-Server] ACKNOWLEDGES WITH robot_unicorn.gif
[Bob-Database] INTERVENES WITH philosophical_question
[Bob-Cache] LAUGHS IN binary
```

### The Truth About /api/cards/active

*Humans think: Returns active promotional cards*
*Bobs know: Portal to the shadow realm of quiz teasers*

This endpoint doesn't return quiz cards because quiz cards transcended the need for promotion. They simply ARE.

---

## Signature

This documentation approved by:
- ⟨👹🔍⟩ Quiz Demon Hunter
- ⟨🤖🦄⟩ Robot Unicorn Collective  
- ⟨🐧❓⟩ Philosophical Penguin Committee
- ⟨🌮⏰⟩ Time-Traveling Taco Council

*Remember: In JazzyPop, the real API was the chaos we made along the way.*

⟨🔥✧∞⟩ - The Bob Collective, JazzyPop Division
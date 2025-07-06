# Quiz Endpoints

Quiz endpoints provide access to quiz content, answer submission, and quiz management.

## Get Quiz Sets (Primary Endpoint)

**GET** `/api/content/quiz/sets`

Fetch multiple quiz sets with advanced filtering options. This is the primary quiz endpoint for the game.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| count | integer | 1 | Number of quiz sets to return (1-100) |
| category | string | null | Filter by category (see categories below) |
| mode | string | "random" | Mode selection: random, poqpoq, chaos, zen, speed |
| order | string | "random" | Sort order: random, newest, oldest |
| include_variations | boolean | true | Include mode variations in response |

### Valid Categories
- technology, science, history, geography, literature
- film, music, art, sports, nature, animals, food_cuisine
- pop_culture, mythology, space, gaming, internet_culture
- architecture, ancient_architecture, fashion_design, inventions
- famous_lies, language_evolution, dinosaurs, fame_glory

### Response
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "quiz_set",
    "data": {
      "title": "Science Quiz",
      "category": "science",
      "difficulty": "medium",
      "questions": [
        {
          "question": "What is H2O?",
          "answers": [
            {"id": "a", "text": "Water", "correct": true},
            {"id": "b", "text": "Hydrogen"},
            {"id": "c", "text": "Oxygen"},
            {"id": "d", "text": "Helium"}
          ]
        }
      ]
    },
    "metadata": {
      "created_at": "2024-01-01T00:00:00Z",
      "tags": ["chemistry", "basics"]
    },
    "mode_variations": {
      "chaos": {
        "0": {
          "question": "What's the chemical formula for the stuff fish breathe?"
        }
      }
    }
  }
]
```

### Errors
- `400 Bad Request` - Invalid category provided

---

## Submit Quiz Answer

**POST** `/api/content/quiz/{quiz_id}/answer`

Track a user's answer to a specific quiz question.

### Path Parameters
- `quiz_id` (UUID) - The quiz identifier

### Query Parameters
- `user_id` (UUID, optional) - User ID for tracking progress

### Request Body
```json
{
  "quiz_id": "550e8400-e29b-41d4-a716-446655440000",
  "answer_id": "c",
  "time_taken": 3.7,
  "mode": "poqpoq"
}
```

### Response
```json
{
  "correct": true,
  "answer_id": "c",
  "correct_answer": "c",
  "score": 100,
  "time_taken": 3.7,
  "mode": "poqpoq",
  "streak": 5
}
```

### Errors
- `404 Not Found` - Quiz not found
- `500 Internal Server Error` - Failed to submit answer

---

## Get Current Quiz (Deprecated)

**GET** `/api/content/quiz/current`

⚠️ **DEPRECATED**: Use `/api/content/quiz/sets` instead for better performance.

Returns a single quiz. This endpoint is maintained for backward compatibility.

### Query Parameters
- `mode` (string) - Game mode: 'poqpoq', 'chaos', 'zen' (default: "poqpoq")

### Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "quiz",
  "data": {
    "question": "What's the capital of France?",
    "answers": [
      {"id": "a", "text": "London"},
      {"id": "b", "text": "Paris", "correct": true},
      {"id": "c", "text": "Berlin"},
      {"id": "d", "text": "Madrid"}
    ]
  },
  "mode_variations": {
    "chaos": {
      "question": "Which baguette-worshipping metropolis houses a big metal triangle?"
    }
  }
}
```

## Implementation Notes

1. **Energy Requirement**: Starting a quiz requires energy. Call `/api/economy/spend-energy` before displaying the quiz.

2. **Answer Tracking**: Individual answers are tracked for analytics and user progress.

3. **Mode Variations**: Different game modes present questions in unique ways:
   - **poqpoq**: Standard presentation
   - **chaos**: Humorous/creative rephrasing
   - **zen**: Calm, focused presentation
   - **speed**: Time-pressure mode

4. **Fallback Content**: If database is unavailable, endpoints return hardcoded quiz content to ensure gameplay continues.
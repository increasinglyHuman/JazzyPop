# Validation Endpoints

Endpoints for the triple validation system that ensures quiz quality through AI-powered review.

## Get Validation Statistics

**GET** `/api/validation/stats`

Retrieve overall validation system statistics.

### Response
```json
{
  "validation_stats": {
    "pending": 45,
    "approved": 2456,
    "needs_revision": 123,
    "rejected": 89,
    "average_quality": 0.82
  },
  "timestamp": "2025-01-06T12:00:00Z"
}
```

---

## Manually Trigger Validation

**POST** `/api/validation/validate/{content_id}`

Manually trigger validation for a specific quiz set. This endpoint is intended for admin use only.

### Query Parameters
- `api_key` (required) - Admin API key for authorization

### Response
```json
{
  "quiz_set_id": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "approved",
  "passed_count": 8,
  "quality_score": 0.85,
  "details": [
    {
      "quiz_data": {
        "question": "What's the capital of France?",
        "answers": [...]
      },
      "final_decision": "approved",
      "quality_score": 0.9,
      "feedback_captions": {
        "a": {
          "correct": "Not quite! London is the capital of the UK.",
          "incorrect": "London is actually the capital of the United Kingdom."
        },
        "b": {
          "correct": "Oui! 🎉 Paris has been France's capital since 987 AD!",
          "incorrect": "Actually, this IS the correct answer!"
        }
      },
      "difficulty": 2,
      "tags": ["geography", "capitals", "europe"],
      "validation_passes": {
        "pass_1": {...},
        "pass_2": {...},
        "pass_3": {...}
      }
    }
  ]
}
```

### Errors
- `401 Unauthorized` - Invalid or missing API key
- `404 Not Found` - Content ID not found
- `400 Bad Request` - Content is not a quiz set

---

## Validation Process Overview

### Triple Validation System

Each quiz goes through three AI-powered validation passes:

#### Pass 1: Feedback Generation & Enhancement
- Generates engaging feedback captions for correct/incorrect answers
- Evaluates difficulty (1-5 scale)
- Adds relevant topic tags
- Initial quality assessment

#### Pass 2: Fact Checking & Verification
- Verifies the correct answer is factually accurate
- Ensures wrong answers are definitively incorrect
- Cross-checks difficulty rating
- Identifies potential issues (ambiguity, outdated info, etc.)

#### Pass 3: Quality Control & Final Decision
- Scores based on 7 quality criteria
- Makes final approval/revision/rejection decision
- Generates admin alerts for severe issues
- Assigns final quality score (0.0-1.0)

### Quality Criteria
1. ✓ Correct answer is 100% accurate
2. ✓ Wrong answers are clearly incorrect
3. ✓ Question is clear and unambiguous
4. ✓ Content is appropriate and current
5. ✓ Difficulty rating is consistent
6. ✓ Educational value exists
7. ✓ Entertaining/engaging element present

### Scoring Rules
- 6-7 points = **APPROVED**
- 4-5 points = **NEEDS REVISION** (specific fixes required)
- 0-3 points = **REJECTED**

For quiz sets: If < 5/10 questions pass, the entire set is rejected.

---

## Validation Worker

The validation system includes a background worker that automatically processes pending quiz sets:

- Processes in batches (configurable via `VALIDATION_BATCH_SIZE`)
- Runs on intervals (configurable via `VALIDATION_INTERVAL`)
- Sends admin alerts via Discord webhook for critical issues
- Tracks comprehensive statistics

### Running the Worker
```bash
# Start the validation worker
python validation_worker.py

# Process existing content
python validate_existing_content.py --batch-size 20 --delay 3

# Dry run to see what would be validated
python validate_existing_content.py --dry-run
```

---

## WebSocket Updates

Real-time validation updates are available via WebSocket at `wss://p0qp0q.com/ws`.

### Message Types
```json
// Validation started
{
  "type": "validation_started",
  "content_id": "550e8400-e29b-41d4-a716-446655440000"
}

// Validation completed
{
  "type": "validation_completed",
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "decision": "approved",
  "quality_score": 0.85
}
```
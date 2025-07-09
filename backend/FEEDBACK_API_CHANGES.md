# Quiz Answer Feedback Captions API Changes

## Summary
Added a new API endpoint to retrieve answer-specific feedback captions generated during the validation process.

## Changes Made

### 1. New File: `quiz_feedback_api.py`
- Contains the implementation of the feedback captions endpoint
- Extracts feedback from `validation_passes -> validation_results -> 0 -> feedback_captions`
- Handles JSON parsing for database fields
- Returns structured feedback organized by question

### 2. Modified: `main.py`
- Added import: `from quiz_feedback_api import get_quiz_feedback` (line 20)
- Added registration: `get_quiz_feedback(app, db)` (line 561)

### 3. New API Endpoint
```
GET /api/content/quiz/{quiz_id}/answer-feedback-captions
```

Returns:
```json
{
  "quiz_id": "uuid",
  "has_answer_feedback_captions": true,
  "validation_status": "approved",
  "answer_feedback_captions": {},
  "answer_feedback_by_question": {
    "0": {
      "a": {
        "correct": "Not quite! This answer is incorrect because...",
        "incorrect": "Actually, this wasn't the right choice..."
      },
      "b": {
        "correct": "Yes! Perfect answer because...",
        "incorrect": "This would have been the right answer..."
      }
    }
  },
  "all_answer_feedback_captions": {
    "a": { "correct": "...", "incorrect": "..." },
    "b": { "correct": "...", "incorrect": "..." },
    "c": { "correct": "...", "incorrect": "..." },
    "d": { "correct": "...", "incorrect": "..." }
  }
}
```

## Frontend Integration

The frontend QuizModal.js has been updated to:
1. Fetch feedback captions when a quiz is loaded
2. Use answer-specific feedback when available
3. Fall back to general explanation if no feedback captions exist

## Database Structure

Feedback captions are stored in:
```
content.validation_passes -> validation_results -> 0 -> feedback_captions -> {answer_id} -> {correct/incorrect}
```

## Important Notes

1. Only quizzes that have been through validation will have feedback captions
2. The validation process is expensive (36 hours, 20M credits for full DB)
3. Currently 1,072 quizzes have feedback captions in the database
4. The `feedback_captions` column at the top level is unused - all data is in validation_passes

## Future Considerations

1. Consider creating a lighter-weight feedback generation process
2. Maybe use GPT-3.5 or local models for new content
3. Create a feedback editor UI for manual creation/editing
4. Batch process only new content going forward
# Player Feedback Endpoints

The feedback system allows players to rate, flag, and react to quiz content, helping maintain quality through community engagement.

## Submit Feedback

**POST** `/api/feedback/submit`

Submit player feedback for quiz content including ratings, flags, and reactions.

### Request Body
```json
{
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "feedback_type": "thumbs_up",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",  // optional
  "session_id": "session_abc123",                      // optional
  // Type-specific fields:
  "rating": 3,              // For 'difficulty' feedback (1-5)
  "reason": "wrong_answer", // For 'flag' feedback
  "details": "The capital of France is Paris, not London", // For 'flag' feedback
  "emote": "mind_blown"     // For 'emote' feedback
}
```

### Feedback Types

| Type | Description | Points | Required Fields |
|------|-------------|--------|-----------------|
| `thumbs_up` | Positive rating | 5 | None |
| `thumbs_down` | Negative rating | 5 | None |
| `difficulty` | Rate difficulty 1-5 | 10 | `rating` |
| `flag` | Report an issue | 20 | `reason`, `details` (optional) |
| `emote` | React with emotion | 3 | `emote` |

### Flag Reasons
- `wrong_answer` - The marked correct answer is wrong
- `outdated` - Information is outdated or no longer accurate
- `offensive` - Content is offensive or inappropriate
- `unclear` - Question is unclear or ambiguous
- `multiple_correct` - Multiple answers could be correct
- `typo` - Contains spelling or grammar errors
- `other` - Other issue (specify in details)

### Available Emotes
- `love` ❤️
- `laugh` 😂
- `mind_blown` 🤯
- `confused` 😕
- `fire` 🔥
- `boring` 😴
- `more` ➕
- `less` ➖

### Response
```json
{
  "success": true,
  "feedback_id": "550e8400-e29b-41d4-a716-446655440000",
  "points_earned": 5,
  "achievements": [
    {
      "name": "First Feedback",
      "icon": "🎖️",
      "earned_at": "2025-01-06T12:00:00Z"
    }
  ],
  "message": "Thanks for the positive feedback! 👍"
}
```

### Errors
- `400 Bad Request` - Invalid feedback type or missing required fields
- `400 Bad Request` - Duplicate feedback (user already submitted this type for this content)

---

## Get Content Feedback Summary

**GET** `/api/feedback/content/{content_id}`

Retrieve aggregated feedback data for a specific piece of content.

### Response
```json
{
  "content_id": "550e8400-e29b-41d4-a716-446655440000",
  "thumbs_up": 142,
  "thumbs_down": 23,
  "flags": 2,
  "difficulty_average": 3.4,
  "difficulty_votes": {
    "1": 5,
    "2": 12,
    "3": 45,
    "4": 28,
    "5": 10
  },
  "emotes": {
    "love": 23,
    "mind_blown": 45,
    "fire": 12
  },
  "last_updated": "2025-01-06T12:00:00Z"
}
```

---

## Get User Feedback Statistics

**GET** `/api/feedback/user/{user_id}/stats`

Retrieve a user's feedback history and achievements.

### Response
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_feedback": 156,
  "flags_submitted": 12,
  "thumbs_up": 89,
  "thumbs_down": 34,
  "active_days": 15,
  "total_points": 1450,
  "achievements": [
    {
      "name": "Quality Controller",
      "icon": "🎖️",
      "earned_at": "2025-01-06T12:00:00Z"
    },
    {
      "name": "Dedicated Reviewer",
      "icon": "🏆",
      "earned_at": "2025-01-13T12:00:00Z"
    }
  ],
  "current_streak": 7
}
```

## Feedback Achievements

| Achievement | Requirement | Points | Icon |
|-------------|-------------|--------|------|
| Quality Controller | First feedback | 50 | 🎖️ |
| Dedicated Reviewer | 7-day feedback streak | 100 | 🏆 |
| Community Guardian | 50 feedbacks | 200 | 🛡️ |
| Quiz Master | 100 feedbacks | 500 | 👑 |
| Eagle Eye | Accurate flag verified | 150 | 🦅 |
| Helpful Hero | Helpful feedback | 100 | 🦸 |

## Implementation Notes

1. **Duplicate Prevention**: Users can only submit one of each feedback type per content item
2. **Anonymous Support**: Feedback can be submitted with just a session_id
3. **Auto-Review**: Content with >5 flags is automatically marked for review
4. **Real-time Updates**: Aggregates are updated immediately via database triggers
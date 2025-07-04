# Content Progression System

## Overview
The JazzyPop flashcard system now includes intelligent content progression tracking to ensure users see fresh content and aren't repeatedly shown the same quotes, puns, or jokes.

## How It Works

### 1. **User Tracking**
- When a user views a flashcard, it's recorded in the `user_content_views` table
- Tracks: content ID, user ID, view count, last viewed timestamp
- Metadata includes whether they answered correctly

### 2. **Smart Content Selection**
For authenticated users:
- **Priority 1**: Show unseen content first
- **Priority 2**: If not enough unseen content, mix in least-recently-seen content
- **Anonymous users**: Get random content (no tracking)

### 3. **Database Schema**
```sql
user_content_views:
- user_id (links to user)
- content_id (links to content)  
- content_type (quote, pun, joke, etc.)
- view_count (increments each view)
- last_viewed (timestamp)
- metadata (correct/incorrect, time spent, etc.)
```

### 4. **API Endpoints**

#### Get Flashcards
```
POST /api/flashcards
{
  "category": "famous_quotes",
  "count": 10,
  "user_id": "uuid" // Optional - enables progression
}
```

#### Track View
```
POST /api/flashcards/track-view
{
  "user_id": "uuid",
  "content_id": "uuid",
  "content_type": "quote",
  "metadata": {
    "correct": true,
    "timestamp": "2024-12-30T..."
  }
}
```

### 5. **Quote Requirements**
- **ALL quotes MUST have attribution**
- Valid attribution formats:
  - Person: "Maya Angelou"
  - Source: "The Bible" 
  - Tradition: "Japanese Proverb"
  - Full: "Martin Luther King Jr., I Have a Dream Speech, 1963"

### 6. **Content Generation**
- Quotes generated via Haiku API with proper attribution
- Stored in `content` table with type='quote'
- Challenge questions vary: who-said-it, fill-blank, multiple-choice, word-order

### 7. **Progressive Loading Example**
User has seen quotes 1-999:
1. System queries for quotes user hasn't seen
2. Returns quotes 1000-1009 (new content)
3. If only 5 new quotes exist, adds 5 oldest-viewed to reach 10
4. Tracks when user views each card

## Benefits
- Users always see fresh content when available
- No annoying repetition of recent cards
- Graceful fallback when all content is seen
- Works for both authenticated and anonymous users
- Respects quote attribution requirements
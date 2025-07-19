# API Compatibility Analysis: Current vs v3.0

## Current Quiz Structure (from API)
```json
{
  "id": "UUID",
  "type": "quiz_set",
  "data": {
    "title": "String",
    "trivia": [Array of trivia facts],
    "category": "String",
    "economics": {Object with costs/rewards},
    "questions": [
      {
        "id": Number,
        "answers": [
          {"id": "a/b/c/d", "text": "String", "correct": Boolean}
        ],
        "question": "String",
        "explanation": "String"
      }
    ],
    "difficulty": "varied"
  },
  "metadata": {
    "version": "2.0",
    "has_trivia": true,
    "generated_at": "ISO timestamp",
    "economics_added": true,
    "economics_version": "1.0"
  },
  "created_at": "ISO timestamp"
}
```

## v3.0 Quiz Structure (from our generator)
```json
{
  "question": "String",
  "answers": [
    {"id": "a/b/c/d", "text": "String", "correct": Boolean}
  ],
  "explanation": "String",
  "mode": "chaos/zen/speed/poqpoq",
  "difficulty": "super_low/pretty_low/low/average",
  "tags": ["category", "mode", "other_tags"]
}
```

## Compatibility Assessment

### ✅ **Fully Compatible Fields**
- `question` → Same structure
- `answers` → Identical format (id, text, correct)
- `explanation` → Same field name and purpose

### ⚠️ **New Fields in v3 (Non-Breaking)**
- `mode` → Not in current structure but won't break frontend
- `difficulty` → Different values but same field name
- `tags` → New field, frontend can ignore if not needed

### 🔄 **Integration Points**

1. **Quiz Set Level**: v3 generates individual questions, but the API expects a quiz set with:
   - Multiple questions (array of 10)
   - Title for the set
   - Trivia facts
   - Economics data
   - Metadata

2. **Question IDs**: Current API uses numeric IDs (1-10), v3 doesn't generate these

3. **Difficulty**: 
   - Current: "varied" at set level
   - v3: Specific levels per question (super_low, pretty_low, low, average)

## Migration Strategy

### Option 1: Minimal Changes (Recommended)
The `generate_quiz_set` method already wraps questions properly:
```python
quiz_set = {
    "title": title,
    "category": category,
    "difficulty": difficulty,
    "questions": questions,  # Array of 10 questions
    "trivia": "...",
    "economics": self.calculate_economics(category, difficulty, mode)
}
```

Just need to:
1. Add numeric IDs to questions when building the set
2. Keep mode/tags in metadata instead of per-question

### Option 2: Frontend Enhancement
Update frontend to use new fields if available:
- Use per-question difficulty for better UI
- Show mode-specific styling
- Display tags for categorization

## Conclusion

**No Breaking Changes Expected!** 

The v3 generator already produces the correct structure at the quiz set level. The only additions are:
- Mode tracking (can go in metadata)
- Enhanced difficulty granularity
- Tags for better categorization

The frontend should continue working without modification, but can be enhanced to use the new features.
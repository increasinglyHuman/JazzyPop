# ElevenLabs Audio Service Configuration

## Cost Optimization Strategies

### 1. Model Selection
- Using `eleven_turbo_v2` - the fastest and most cost-effective model
- ~$0.18 per 1,000 characters (vs $0.30 for multilingual model)

### 2. Caching Strategy
- 30-day cache for all generated audio
- Cache key includes text + voice style + voice ID
- Saves ~90% of costs for repeated content

### 3. Usage Limits
- Daily limit: 1,000 characters (~5-10 questions)
- Monthly limit: 20,000 characters (~$3.60/month max)
- Configurable in `audio_service.py`

### 4. Selective Generation
- Only generate audio for:
  - Quiz questions
  - Correct answer + explanation
  - Fun facts (zen mode only)
- Skip audio for wrong answers to save costs

### 5. Voice Optimization
- Using single voice (Rachel) to maximize cache hits
- Voice variations through settings only (stability, style)

## Setup

1. Get ElevenLabs API key from https://elevenlabs.io
2. Add to server .env file:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ```

## Cost Monitoring

Check usage stats:
```bash
curl http://your-server:8000/api/audio/usage
```

Response:
```json
{
  "daily": {
    "used": 450,
    "limit": 1000,
    "percentage": 45.0
  },
  "monthly": {
    "used": 8500,
    "limit": 20000,
    "percentage": 42.5,
    "estimated_cost": 1.53
  }
}
```

## Voice Styles by Mode

- **Normal**: Balanced, clear narration
- **Chaos**: Unstable, expressive, energetic
- **Zen**: Calm, gentle, soothing
- **Speed**: Energetic but clear

## Frontend Integration

```javascript
// Request audio for current quiz
const response = await fetch('/api/audio/quiz/current?mode=chaos');
const data = await response.json();

if (data.available) {
  // Play question audio
  const audio = new Audio(data.audio.question);
  audio.play();
  
  // After correct answer
  const correctAudio = new Audio(data.audio.correct_answer);
  correctAudio.play();
}
```

## Cost Examples

- Average quiz question: ~50 characters
- With explanation: ~150 characters total
- Cost per quiz: ~$0.027
- With 30-day cache: ~$0.003 per play

At 1000 plays/month with 90% cache hit rate:
- Without cache: $27/month
- With cache: $2.70/month
# JazzyPop API Documentation

Welcome to the JazzyPop API documentation. This API powers the engaging quiz and learning platform with gamification features.

## Base URL

Production: `https://p0qp0q.com/api`
Development: `http://localhost:8000/api`

## Interactive Documentation

The API provides interactive Swagger documentation:
- **Swagger UI**: `/docs` - Interactive API explorer
- **ReDoc**: `/redoc` - Alternative documentation format
- **OpenAPI Schema**: `/openapi.json` - Machine-readable API specification

## Authentication

Currently, the API uses session-based identification. Full authentication is coming soon.

Headers:
```
X-Session-ID: <session-id>
```

## API Endpoints

### Core Endpoints

1. **[Quiz Endpoints](endpoints/quiz.md)** - Quiz content and gameplay
2. **[Economy Endpoints](endpoints/economy.md)** - Energy, rewards, and currency management
3. **[Flashcard Endpoints](endpoints/flashcards.md)** - Practice mode content
4. **[User Endpoints](endpoints/users.md)** - Profile and progress tracking
5. **[Leaderboard Endpoints](endpoints/leaderboard.md)** - Rankings and competition
6. **[Audio Endpoints](endpoints/audio.md)** - Text-to-speech services
7. **[Content Endpoints](endpoints/content.md)** - General content delivery

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "detail": "Error message",
  "status_code": 400
}
```

## Rate Limiting

Currently no rate limiting is implemented. This will be added in future versions.

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Getting Started

1. Check API health: `GET /api/health`
2. Fetch quiz content: `GET /api/content/quiz/sets`
3. Start a game by spending energy: `POST /api/economy/spend-energy`
4. Complete game and get rewards: `POST /api/economy/process-result`

## Support

For support, please contact: support@p0qp0q.com
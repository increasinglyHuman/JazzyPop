# Kawaii Quiz App v4.0 - Current State Summary

## Overview
Mobile-friendly quiz creator for Adobe Learning Manager (ALM) with kawaii aesthetic. Supports instructor quiz creation and learner quiz taking modes.

## Key Features
- **Single answer questions only** (simplified from multiple choice)
- **Kawaii emoji icons** instead of question numbers (🍪🧁🍓🍦🍩🌸🌈⭐🎀🦄)
- **Modern button UI** - no radio buttons or checkboxes
- **AI question generation** using Anthropic Claude
- **Clean, minimalist design** - questions without boxes
- **ALM native extension** integration

## Technical Stack
- Frontend: Vanilla JavaScript (app.js)
- Backend: Node.js/Express (server-simple.js)
- AI: Anthropic Claude API
- Storage: JSON files
- Deployment: AWS EC2 (p0qp0q.com)
- Process Manager: PM2
- Proxy: Apache reverse proxy

## Current Issues
1. **ALM API Authentication**: 400 Bad Request errors
   - ALM passes `authToken` not `access_token`
   - Native extension tokens (natext_ format) incompatible with API
   - Proxy endpoints created but authentication still failing
   - User suggested trying admin-level authentication

2. **Course Detection**: Falls back to "This Course" when API fails

## File Structure
```
/home/p0qp0q/Documents/Merlin/
├── kawaii-quiz-app/
│   ├── app.js (v4.0 - main application)
│   ├── styles.css (v4.0 - modern kawaii design)
│   ├── index.html
│   └── screenshots/ (UI reference images)
└── kawaii-quiz-backend/
    ├── server-simple.js (Express server with proxy)
    ├── ai-integration.js (Anthropic integration)
    └── .env (PORT=3001, API keys)
```

## Design Evolution
- v1.0-2.0: Basic implementation with traditional forms
- v2.1-2.9: Fixed answer visibility issues
- v3.0-3.3: Improved contrast and kawaii styling
- v4.0: Major redesign - removed boxes, emoji icons, button-only answers

## Key User Feedback
- "questions that are 3 lines long get too crowded in their box"
- "lose the radio buttons and check boxes make them look old fashioned"
- "make question numbers stoopid huge or use kawaii icons"
- "cut back to all questions are single answer"

## API Endpoints
- `GET /api/kawaii-quiz/quiz/:courseId` - Fetch quiz
- `POST /api/kawaii-quiz/quiz` - Save quiz
- `POST /api/kawaii-quiz/ai-suggestions` - Generate questions
- `GET /api/kawaii-quiz/alm-proxy/*` - ALM API proxy

## Deployment
- URL: https://p0qp0q.com/apps/kawaii-quiz/
- Server: Port 3001 (was 3000, then 3002, settled on 3001)
- Apache proxy: /api/kawaii-quiz/ → localhost:3001

## Next Steps
- Investigate ALM admin authentication option
- Consider SCORM packaging (mentioned but not implemented)
- Resolve ALM API integration for course details

## Cost
- AI API calls: ~$0.0028 per question generation request

Last updated: 2025-06-18 (v4.0 deployment)
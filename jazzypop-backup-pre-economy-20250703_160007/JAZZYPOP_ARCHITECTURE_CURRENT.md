# JazzyPop Architecture - Current State (January 2025)

## Overview
JazzyPop is a quiz and learning platform with a FastAPI backend and vanilla JavaScript frontend. The system delivers educational content in sets of 10 items, with multiple game modes and a virtual economy system.

## System Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────┐
│   Web Browser       │ ─────────────> │  Apache Server   │
│  (Frontend JS)      │                │ (p0qp0q.com:443) │
└─────────────────────┘                └──────────────────┘
                                               │
                                               │ ProxyPass /api
                                               ▼
                                       ┌──────────────────┐
                                       │  FastAPI Backend │
                                       │ (localhost:8000) │
                                       └──────────────────┘
                                               │
                                               ▼
                                       ┌──────────────────┐
                                       │   PostgreSQL     │
                                       │   Database       │
                                       └──────────────────┘
```

## Backend Architecture

### Core Services

1. **JazzyPop Backend API** (`jazzypop-backend.service`)
   - Main FastAPI application
   - Handles all API requests
   - Runs on port 8000
   - File: `main.py`

2. **Quiz Set Generator** (`jazzypop-quiz-generator.service`)
   - Generates quiz sets using Claude API
   - Creates sets of 10 questions
   - File: `quiz_set_generator.py`

3. **Content Generators** (multiple services)
   - `pun_set_generator.py` - Generates pun sets
   - `quote_set_generator.py` - Generates quote sets
   - `joke_set_generator.py` - Generates joke sets
   - `trivia_set_generator.py` - Generates trivia sets

4. **System Monitor** (`jazzypop-monitor.service`)
   - Monitors all services
   - Sends Discord webhook notifications
   - Reports every 60 seconds for health checks
   - Reports content statistics every 8 hours
   - File: `system_monitor.py`

### Database Schema

**Primary Content Table**: `content`
- Stores all content as JSONB
- All content is now in "sets" (e.g., `quiz_set`, `pun_set`)
- Each set contains 10 items
- NO individual items (all cleaned up)
- NO Redis caching (removed due to issues)

**Key Content Types**:
- `quiz_set` - 10 quiz questions
- `quote_set` - 10 quotes
- `pun_set` - 10 puns
- `joke_set` - 10 jokes
- `trivia_set` - 10 trivia items

## API Endpoints

### Health & Status
- `GET /api/health` - Health check endpoint

### Quiz Endpoints
- `GET /api/content/quiz/sets` - **Primary quiz endpoint**
  - Parameters: `count`, `category`, `mode`, `order`, `include_variations`
  - Returns: Array of complete quiz sets (10 questions each)
  - Used by: CardManager to display quiz cards

- `GET /api/content/quiz/current` - Get random quiz
  - Parameters: `mode`, `exclude`
  - Returns: Single random quiz set
  - Note: Frontend no longer uses this

### Content Endpoints
- `GET /api/content/quote/current` - Get random quote
- `POST /api/flashcards` - Get flashcard sets
- `POST /api/flashcards/track-view` - Track content views

### Economy Endpoints
- `POST /api/economy/process-result` - Process game results
- `GET /api/economy/state` - Get economy state

### Deprecated Endpoints
- `GET /api/cards/active` - Returns promotional cards (TO BE REMOVED)

## Frontend Architecture

### Key Components

1. **CardManager** (`src/components/CardManager.js`)
   - Fetches quiz sets from `/api/content/quiz/sets`
   - Transforms quiz data into displayable cards
   - Stores full quiz data with each card
   - Passes complete quiz data to QuizModal (no refetch)

2. **QuizModal** (`src/components/QuizModal.js`)
   - Receives full quiz data from CardManager
   - No longer makes API calls to load quiz
   - Supports modes: poqpoq, chaos, zen, speed
   - Displays 10 questions sequentially

3. **FlashcardModal** (`src/components/FlashcardModal.js`)
   - Handles flashcard practice mode
   - Fetches content sets via API

4. **EconomyManager** (`src/components/EconomyManager.js`)
   - Manages virtual currency and energy
   - Syncs with backend economy endpoints

## Monitoring & Webhooks

### Discord Integration
- **Webhook URL**: Stored in environment variable `DISCORD_WEBHOOK_URL`
- **Notifications**:
  - Service up/down alerts
  - Automatic restart attempts
  - Content generation reports (8-hour summary)
  - Daily system reports

### Monitoring Behavior
- Checks all services every 60 seconds
- Attempts automatic restart on service failure
- Sends content report when backend service restored
- Tracks: Backend API, Quiz Generator, Content Generators, PostgreSQL, Nginx

## Deployment Configuration

### Server Details
- **Domain**: p0qp0q.com
- **Frontend Path**: `/var/www/html/jazzypop/`
- **Backend Path**: `~/jazzypop-backend/`
- **Python Environment**: `venv` in backend directory

### Apache Configuration
```apache
ProxyPass /api http://localhost:8000/api
ProxyPassReverse /api http://localhost:8000/api
ProxyPreserveHost On
```

### Service Management
```bash
# Backend services
sudo systemctl status jazzypop-backend
sudo systemctl status jazzypop-quiz-generator
sudo systemctl status jazzypop-monitor

# View logs
sudo journalctl -u jazzypop-backend -f
```

## Recent Changes (January 2025)

1. **Removed Redis** - All caching disabled due to stability issues
2. **Removed Individual Items** - Database now only contains sets
3. **Fixed QuizModal** - Now uses passed data instead of refetching
4. **Fixed System Monitor** - No longer crashes, updated for new architecture
5. **Deprecated Cards System** - Promotional cards no longer needed

## Data Flow Example

1. **User visits JazzyPop**
   - Frontend loads from Apache
   - CardManager initializes

2. **CardManager fetches quizzes**
   - `GET https://p0qp0q.com/api/content/quiz/sets?count=10`
   - Receives array of quiz sets
   - Stores full data with each card

3. **User clicks quiz card**
   - CardManager passes full quiz data to QuizModal
   - QuizModal displays questions without API call
   - Results submitted to economy endpoint

4. **Background processes**
   - Generators create new content sets
   - Monitor watches services and reports to Discord
   - Database stores all content as JSONB

## Security Notes
- CORS configured for all origins (should be restricted in production)
- API runs on localhost only (not exposed externally)
- All external access through Apache proxy
- Database credentials in .env file
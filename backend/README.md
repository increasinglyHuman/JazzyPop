# JazzyPop Backend

## ⚠️ CRITICAL: READ BEFORE EDITING ANY FILES ⚠️

### 🚨 MANDATORY FIRST STEP 🚨

**This backend uses Redis for file locking and caching. You MUST read the guide before making ANY changes:**

### → [**REDIS_BACKEND_GUIDE.md**](../REDIS_BACKEND_GUIDE.md) ←

**Failure to follow the guide will result in:**
- ❌ Your changes being lost
- ❌ Service disruptions  
- ❌ Cache corruption
- ❌ The "Redis Ninja" blocking all your changes

### Quick Start for Backend Edits
```bash
# Safe way to edit files:
./edit-backend.sh quiz_generator.py

# Or use the Python tool:
python safe_edit.py app.py
```

### If You Haven't Read the Guide
**STOP NOW** and read [REDIS_BACKEND_GUIDE.md](../REDIS_BACKEND_GUIDE.md) first!

---

## Overview
Backend services for the JazzyPop quiz platform, supporting multiple modes (P0qP0q, Zen, Chaos, Speed) and multi-tenant architecture.

## Architecture

### Services
1. **API Server** - RESTful API for web/mobile clients
2. **Content Generator** - AI-powered quiz generation service
3. **Event Processor** - Handles real-time events and analytics
4. **Notification Service** - Push notifications and email

### Database Schema
- PostgreSQL with JSONB for flexible content storage
- Multi-tenant support with context isolation
- Event-sourced architecture for analytics

### Key Features
- Content generation every N minutes
- Theme-specific quiz variations
- Anonymous mode for Twitch integration
- Real-time leaderboards and progress tracking
- Flexible content types (quiz, quote, fact, game)

## Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set up database
python manage.py migrate

# Run development server
python manage.py runserver
```

## Environment Variables
```
DATABASE_URL=postgresql://user:pass@localhost/jazzypop
REDIS_URL=redis://localhost:6379
AI_API_KEY=your-openai-key
VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private
```
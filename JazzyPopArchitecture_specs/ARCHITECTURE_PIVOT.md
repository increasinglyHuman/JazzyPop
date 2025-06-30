# JazzyPop Architecture Pivot: Duolingo for Funky Quizzes

## Executive Summary

Transform JazzyPop from a course-based quiz tool into an addictive, gamified learning platform that combines the engagement mechanics of Duolingo with chaotic, AI-generated quiz content.

## Core Concept

**"Learn anything, the fun way"** - A mobile-first progressive web app where users progress through skill trees of increasingly chaotic and entertaining quiz content, earning XP, maintaining streaks, and competing with friends.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (PWA)                         │
├─────────────────────────────────────────────────────────┤
│  • React/Preact for component architecture              │
│  • Zustand for state management                         │
│  • Service Workers for offline capability               │
│  • Framer Motion for delightful animations              │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   API Gateway                            │
├─────────────────────────────────────────────────────────┤
│  • Express.js with WebSocket support                    │
│  • Redis for caching & real-time features               │
│  • JWT authentication with refresh tokens               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                Backend Services                          │
├─────────────────────────────────────────────────────────┤
│  • Question Generation Service (Claude API)              │
│  • Progress Tracking Service                            │
│  • Gamification Engine                                  │
│  • Social Features Service                              │
│  • Analytics Pipeline                                   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                  Data Layer                              │
├─────────────────────────────────────────────────────────┤
│  • PostgreSQL for persistent data                       │
│  • Redis for caching & leaderboards                     │
│  • S3/CloudFront for static assets                      │
└─────────────────────────────────────────────────────────┘
```

## Key Features & Implementation

### 1. Skill Trees & Progression

```javascript
// Skill tree structure
const skillTree = {
  id: 'tech-chaos',
  name: 'Tech Chaos Trail',
  description: 'Master the absurd side of technology',
  nodes: [
    {
      id: 'intro-madness',
      name: 'Introduction to Madness',
      requiredXP: 0,
      questions: 10,
      rewards: { xp: 100, gems: 10 },
      unlocks: ['advanced-chaos', 'side-quest-1']
    }
  ]
}
```

### 2. Gamification Engine

```javascript
// Core gamification mechanics
const gamificationFeatures = {
  xpSystem: {
    correctAnswer: 10,
    perfectStreak: 50,
    dailyGoal: 100
  },
  streaks: {
    daily: { bonus: 1.5 },
    weekly: { bonus: 2.0 },
    freezes: 2
  },
  lives: {
    max: 5,
    regeneration: '1 per 4 hours',
    unlimitedPass: 'premium'
  },
  leagues: [
    'Bronze', 'Silver', 'Gold', 
    'Sapphire', 'Ruby', 'Emerald', 
    'Amethyst', 'Pearl', 'Obsidian', 
    'Diamond'
  ]
}
```

### 3. AI-Powered Content Generation

```javascript
// Enhanced prompt engineering for chaos
const generateQuizPrompt = (skill, difficulty, userHistory) => {
  return `Generate a ${difficulty} level quiz question for the skill "${skill}".
  
  Style Guidelines:
  - Maximum chaos and unexpected connections
  - Blend real facts with absurd scenarios
  - Reference memes and pop culture when appropriate
  - Keep it educational but wildly entertaining
  
  User Preferences: ${userHistory.preferredTopics}
  Avoid Recently Used: ${userHistory.recentQuestions}
  
  Format: JSON with question, 4 options, correct answer, and fun fact explanation`
}
```

### 4. Mobile-First UI Components

```javascript
// Swipeable question cards
const QuestionCard = ({ question, onAnswer }) => {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }))
  
  const bind = useDrag(({ down, movement: [mx, my] }) => {
    api.start({ 
      x: down ? mx : 0, 
      y: down ? my : 0,
      immediate: down 
    })
    
    if (!down && Math.abs(mx) > 100) {
      onAnswer(mx > 0 ? 'right' : 'left')
    }
  })
  
  return (
    <animated.div {...bind()} style={{ x, y }}>
      {/* Question content */}
    </animated.div>
  )
}
```

### 5. Social & Competitive Features

```javascript
// Real-time multiplayer battles
const battleSystem = {
  modes: {
    quickMatch: { duration: 60, questions: 10 },
    friendDuel: { duration: 120, questions: 20 },
    teamBattle: { duration: 300, questions: 50 }
  },
  matchmaking: {
    algorithm: 'elo-based',
    maxLatency: 50,
    regionLocked: false
  },
  rewards: {
    winner: { xp: 200, trophies: 1 },
    participation: { xp: 50 }
  }
}
```

## Database Schema Updates

```sql
-- Core user progression
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Skill tree progress
CREATE TABLE user_skills (
  user_id UUID REFERENCES user_profiles(id),
  skill_id VARCHAR(100),
  mastery_level INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  last_practiced TIMESTAMP,
  PRIMARY KEY (user_id, skill_id)
);

-- Social connections
CREATE TABLE friendships (
  user_id UUID REFERENCES user_profiles(id),
  friend_id UUID REFERENCES user_profiles(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- Achievements system
CREATE TABLE user_achievements (
  user_id UUID REFERENCES user_profiles(id),
  achievement_id VARCHAR(100),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress JSONB,
  PRIMARY KEY (user_id, achievement_id)
);
```

## Progressive Web App Configuration

```javascript
// Service worker for offline capability
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('jazzypop-v1').then(cache => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/app.js',
        '/offline-questions.json'
      ])
    })
  )
})

// Web app manifest
{
  "name": "JazzyPop: Chaos Learning",
  "short_name": "JazzyPop",
  "theme_color": "#ff006e",
  "background_color": "#0a0a0a",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## Migration Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up PostgreSQL database with new schema
- [ ] Implement user authentication system
- [ ] Create basic user profile and XP tracking
- [ ] Build first skill tree prototype

### Phase 2: Core Gamification (Week 3-4)
- [ ] Implement streak system
- [ ] Add lives/hearts mechanism
- [ ] Create achievement framework
- [ ] Build daily challenges

### Phase 3: Social Features (Week 5-6)
- [ ] Friend system implementation
- [ ] Real-time battles infrastructure
- [ ] Leaderboards and leagues
- [ ] User-generated content system

### Phase 4: Mobile Optimization (Week 7-8)
- [ ] PWA implementation
- [ ] Offline mode with service workers
- [ ] Push notifications
- [ ] App store deployment preparation

## Performance Targets

- **Initial Load**: < 3 seconds on 3G
- **Time to Interactive**: < 5 seconds
- **Offline Capability**: Core features work without connection
- **Question Generation**: < 2 seconds per quiz
- **Real-time Latency**: < 100ms for multiplayer

## Success Metrics

- **Daily Active Users**: Track engagement
- **Average Session Length**: Target 15+ minutes
- **Streak Retention**: % maintaining 7+ day streaks
- **Social Engagement**: Friend connections per user
- **Content Generation**: Questions per user per day

## Technical Decisions

1. **Frontend Framework**: React/Preact for component reusability
2. **State Management**: Zustand for simplicity and performance
3. **Animation Library**: Framer Motion for delightful interactions
4. **Backend**: Node.js/Express for ALM compatibility
5. **Database**: PostgreSQL for complex queries and JSONB support
6. **Caching**: Redis for real-time features
7. **AI Integration**: Claude API with fallback to cached questions
8. **Hosting**: AWS/Vercel for global edge deployment

## Next Steps

1. Review and approve architecture
2. Set up development environment
3. Create component library with new design system
4. Implement authentication and user profiles
5. Build first skill tree prototype
6. Test with small user group
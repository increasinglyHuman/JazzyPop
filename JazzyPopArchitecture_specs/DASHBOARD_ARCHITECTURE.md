# Dashboard Architecture Handoff

## Current Active Dashboard
**Primary Dashboard**: `/kawaii-quiz-app/index.html`  
**Previous Dashboard**: `/kawaii-quiz-app/dashboard-clean.html` (now legacy)
**Live URL**: `http://localhost:5500/kawaii-quiz-app/`
**Production URL**: `https://p0qp0q.com/jazzypop/`

## Architecture Overview

The JazzyPop dashboard follows a clean, component-based architecture where each element is self-contained and responsible for its own functionality.

### Core Architecture Principles

1. **Dashboard as Container**
   - `index.html` acts as the main wrapper/container
   - Provides the structural layout (header, main content area, bottom nav)
   - Does NOT contain quiz logic or card-specific functionality
   - Includes PWA manifest and service worker for offline capability

2. **Dynamic Card Loading**
   - Cards are fetched from the backend API (`/api/cards/active`)
   - CardManager handles the lifecycle of all cards
   - Each card is a self-contained component with its own rendering logic

3. **Component Isolation**
   - Each component (cards, quiz modal, settings, etc.) has its own:
     - JavaScript file in `/src/components/`
     - CSS file in `/src/styles/components/`
     - Clear API for interaction with other components

4. **Click-to-Launch Pattern**
   - Cards contain configuration for what component to launch
   - When clicked, cards emit events that trigger component loading
   - Currently, most cards launch the quiz component

## File Structure

```
/kawaii-quiz-app/
├── index.html              # Main entry point (PWA-enabled)
├── manifest.json           # PWA manifest configuration
├── sw.js                   # Service worker for offline & push
└── src/
    ├── components/
    │   ├── CardManager.js      # Manages card lifecycle & API sync
    │   ├── GenericCard.js      # Base card rendering component
    │   ├── CardTemplates.js    # Card template definitions
    │   ├── QuizModal.js        # Divine quiz UI component
    │   ├── SettingsPanel.js    # Settings/preferences component
    │   ├── FlashcardModal.js   # Flashcard practice component
    │   ├── HerdingGame.js      # Mindful moments herding game
    │   └── profile/            # Avatar selection components
    ├── styles/
    │   ├── components/
    │   │   ├── dashboard.css   # Dashboard layout styles
    │   │   ├── card.css        # Card component styles
    │   │   ├── quiz-modal.css  # Quiz modal styles
    │   │   ├── settings.css    # Settings panel styles
    │   │   └── ...             # Other component styles
    │   ├── modes/              # Theme-specific styles
    │   │   ├── normal.css
    │   │   ├── chaos.css
    │   │   ├── speed.css
    │   │   └── zen.css
    │   └── themes.css          # CSS variables for themes
    └── scripts/
        └── dashboard.js        # Dashboard initialization & helpers
```

## Component Communication Flow

```
1. Dashboard loads → Initializes CardManager
2. CardManager → Fetches cards from API
3. API returns → Card data with component configs
4. User clicks card → Card emits 'cardAction' event
5. Dashboard catches event → Launches specified component
6. Component loads → Shows UI (e.g., quiz modal)
```

## Key Components

### CardManager (`/src/components/CardManager.js`)
- Fetches cards from backend API
- Manages card lifecycle (add, update, remove)
- Handles real-time updates via WebSocket (when available)
- Falls back to mock data if API is unavailable

### QuizModal (`/src/components/QuizModal.js`)
- Implements the "divine quiz format" from mobile-test.html
- Fetches quiz data from API with mode-specific variations
- Handles all four modes (P0qP0q, Zen, Chaos, Speed)
- Self-contained with its own effects and animations

### Dashboard (`/src/scripts/dashboard.js`)
- Initializes the dashboard environment
- Manages user profile and avatar selection
- Handles navigation between tabs
- Coordinates component launching

## API Integration

**Backend API**: `https://p0qp0q.com/api`  
**Previous API**: `http://52.88.234.65:8000` (deprecated)

### Key Endpoints:
- `GET /api/cards/active` - Fetch active cards
- `GET /api/content/quiz/current?mode={mode}` - Get quiz with mode variations
- `POST /api/content/quiz/{quiz_id}/answer` - Submit quiz answer

### API Configuration:
The API URL is configured in index.html:
```javascript
window.API_URL = 'https://p0qp0q.com';
```

### Mode Variations:
The API returns different question text based on the current mode:
- **Normal/P0qP0q**: Standard question text
- **Chaos**: Wild, creative variations (e.g., "Which baguette-worshipping metropolis...")
- **Zen**: Calm variations with hints
- **Speed**: Standard text with time pressure

## Legacy Files

The following dashboard files have been marked as legacy:
- `dashboard-clean.html` - Previous main dashboard (replaced by index.html)
- `legacy-dashboard-mobile-fixed.html`
- `legacy-dashboard-simple-scroll.html`
- `legacy-dashboard-with-avatar.html`
- `legacy-learner-dashboard.html`
- `legacy-learner-dashboard-integrated.html`

These represent earlier iterations and experiments. The current `index.html` is the consolidated, production version with PWA support.

## Adding New Components

To add a new component that can be launched from cards:

1. Create component file: `/src/components/YourComponent.js`
2. Create styles: `/src/styles/components/your-component.css`
3. Add to dashboard HTML:
   ```html
   <link rel="stylesheet" href="/src/styles/components/your-component.css">
   <script src="/src/components/YourComponent.js"></script>
   ```
4. Configure card to launch it:
   ```javascript
   {
     component: 'YourComponent',
     componentConfig: { /* config options */ }
   }
   ```

## Current Status

- ✅ Dashboard container working (index.html)
- ✅ Progressive Web App (PWA) fully configured
- ✅ Cards loading from API (with mock fallback)
- ✅ Quiz modal integrated with divine UI
- ✅ Mode-specific content variations
- ✅ User profile and avatar selection
- ✅ Settings panel with theme switching
- ✅ Bot images fixed (changed paths to relative)
- ✅ Answer feedback timing improved (1.2s delay)
- ✅ Service worker for offline support
- ✅ Push notification infrastructure ready
- ✅ Production deployment at https://p0qp0q.com/jazzypop/

## Recent Fixes (2025-06-30)

1. **Bot Images**: Fixed missing bot images on settings page by changing absolute paths to relative paths in SettingsPanel.js
2. **Answer Feedback**: Added 1.2 second delay before showing feedback bot so players can see which answer was correct
3. **Red Background**: Fixed CSS specificity issue in normal.css where red background was appearing on entire quiz card instead of just answer options

## Next Steps

1. Replace system alerts with modal component (4 occurrences)
2. Balance hearts/lives economy for better retention
3. Implement XP and leveling system with progress bars
4. Add sound effects and audio system
5. Complete Google Sign-In integration
6. Enhance push notification system with engagement campaigns
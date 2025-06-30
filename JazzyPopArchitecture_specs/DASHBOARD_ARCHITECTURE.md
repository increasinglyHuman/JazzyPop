# Dashboard Architecture Handoff

## Current Active Dashboard
**Primary Dashboard**: `/kawaii-quiz-app/dashboard-clean.html`  
**Live URL**: `http://localhost:5500/kawaii-quiz-app/dashboard-clean.html`

## Architecture Overview

The JazzyPop dashboard follows a clean, component-based architecture where each element is self-contained and responsible for its own functionality.

### Core Architecture Principles

1. **Dashboard as Container**
   - `dashboard-clean.html` acts as the main wrapper/container
   - Provides the structural layout (header, main content area, bottom nav)
   - Does NOT contain quiz logic or card-specific functionality

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
/src/
├── components/
│   ├── CardManager.js      # Manages card lifecycle & API sync
│   ├── GenericCard.js      # Base card rendering component
│   ├── CardTemplates.js    # Card template definitions
│   ├── QuizModal.js        # Divine quiz UI component
│   └── SettingsPanel.js    # Settings/preferences component
├── styles/
│   └── components/
│       ├── dashboard.css   # Dashboard layout styles
│       ├── card.css        # Card component styles
│       ├── quiz-modal.css  # Quiz modal styles
│       └── settings.css    # Settings panel styles
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

**Backend API**: `http://52.88.234.65:8000`

### Key Endpoints:
- `GET /api/cards/active` - Fetch active cards
- `GET /api/content/quiz/current?mode={mode}` - Get quiz with mode variations
- `POST /api/content/quiz/{quiz_id}/answer` - Submit quiz answer

### Mode Variations:
The API returns different question text based on the current mode:
- **Normal/P0qP0q**: Standard question text
- **Chaos**: Wild, creative variations (e.g., "Which baguette-worshipping metropolis...")
- **Zen**: Calm variations with hints
- **Speed**: Standard text with time pressure

## Legacy Files

The following dashboard files have been marked as legacy and renamed:
- `legacy-dashboard-mobile-fixed.html`
- `legacy-dashboard-simple-scroll.html`
- `legacy-dashboard-with-avatar.html`
- `legacy-learner-dashboard.html`
- `legacy-learner-dashboard-integrated.html`

These represent earlier iterations and experiments. The current `dashboard-clean.html` is the consolidated, production version.

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

- ✅ Dashboard container working
- ✅ Cards loading from API (with mock fallback)
- ✅ Quiz modal integrated with divine UI
- ✅ Mode-specific content variations
- ✅ User profile and avatar selection
- ✅ Settings panel with theme switching

## Next Steps

1. Add more component types (tutorials, challenges, leaderboards)
2. Implement progress tracking visualization
3. Add achievement system UI
4. Enhance card templates for different content types
5. Implement proper user authentication flow
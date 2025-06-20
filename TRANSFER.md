# JazzyPop Project Transfer

## Project Overview
**JazzyPop** - "Duolingo for funky quizzes" - A mobile-first quiz application with personality-driven modes and a universe of bot characters.

## Current State (June 19, 2024)

### Core Architecture ✅
- **Component System**: BaseComponent.js with lifecycle management
- **Event Bus**: Global event system with wildcard support
- **State Manager**: Reactive state with persistence
- **App Bootstrap**: Main app initialization and routing

### Visual Modes ✅
1. **p0qp0q Mode** (Normal) - Classic learning with robot mascot
2. **Chaos Mode** - Wild animations, rainbow colors, maximum energy
3. **Zen Mode** - Peaceful water background, ripple effects, calming
4. **Speed Mode** - Neon aesthetics, timer-focused, competitive

### Bot Universe (24 Characters) ✅
- Mode bots: p0qp0q, chaos, zen, speed variants
- Feedback bots: checkmark (4), yes/thumbs (4), not (2), stop (2)
- Utility bots: sign holders (2), electric/plasma bots
- All in `/src/images/` as SVGs

### Quiz System ✅
- Question loading from sampleQuestions.js
- Answer selection with visual feedback
- Score tracking (displayed as streak)
- Animated bot feedback (checkmark for correct, not for wrong)
- Skip/Submit dynamic button

### Mobile UI ✅
- Stats bar (hearts, streak, lightning, gems)
- Mode switcher (top right with bot icons)
- Quiz cards with proper spacing
- Floating action buttons
- Responsive design

### CSS Architecture ✅
- Modular structure in `/src/styles/`
- CSS variables for theming
- Mode-specific stylesheets
- Animation library (keyframes.css)

## Key Files

### JavaScript
- `/src/core/BaseComponent.js` - Component foundation
- `/src/core/EventBus.js` - Event system
- `/src/core/StateManager.js` - State management
- `/src/core/App.js` - Main application
- `/src/data/sampleQuestions.js` - Quiz questions

### Styles
- `/src/styles/main.css` - Entry point
- `/src/styles/base/variables.css` - Design tokens
- `/src/styles/modes/*.css` - Mode-specific styles

### Pages
- `/mobile-test.html` - Main testing page
- `/bot-gallery.html` - Bot character showcase
- `/test-modes.html` - Mode comparison

## Current Features

### Working
- Mode switching with visual themes
- Quiz question display and answering
- Bot animations for feedback
- Score tracking
- Ripple effects in Zen mode
- Mobile-optimized layout

### Zen Mode Special Features
- Custom water background (UseThisBackground.jpg)
- White ripple effects on tap
- Animated shimmer overlay
- Vignette for depth
- New zen bot (newZenBot.svg)

## Next Steps

### High Priority
1. **XP System** - Points for correct answers, streaks
2. **Question Categories** - Filter by topic
3. **Progress Persistence** - Save user progress
4. **More Questions** - Expand question database

### Medium Priority
1. **Sound Effects** - Audio feedback
2. **Achievements** - Unlock new bots/modes
3. **Tutorial** - First-time user guide
4. **Settings** - User preferences

### Nice to Have
1. **Multiplayer** - Compete with friends
2. **Custom Quizzes** - User-generated content
3. **Bot Animations** - More complex movements
4. **Leaderboards** - Global rankings

## Technical Notes

### Browser Support
- Modern browsers only (ES6+)
- Mobile Safari/Chrome primary targets
- Uses CSS custom properties extensively

### Performance
- SVG bots for scalability
- CSS animations (no JS animation loops)
- Lazy loading for images

### Known Issues
- Mode switcher needs z-index adjustment in some cases
- Ripple effects can stack if clicking rapidly
- Some bot SVGs are large (1MB+)

## Development Setup
```bash
# Clone repo
git clone [repo-url]

# Start local server
# Using VS Code Live Server on port 5500

# View on mobile
# http://[your-ip]:5500/mobile-test.html
```

## Bot Naming Convention
- Mode bots: `[mode]-bot.svg`
- Feedback bots: `[type]-bot-[n].svg`
- All bots have "silly big eye" design language

## Key Design Decisions
1. Mobile-first (360px minimum width)
2. Bot characters for personality
3. CSS-only animations where possible
4. Mode switching changes entire experience
5. Positive reinforcement through animation

---

**Created by**: p0qp0q & Claude  
**Status**: Active Development  
**Last Updated**: June 19, 2024
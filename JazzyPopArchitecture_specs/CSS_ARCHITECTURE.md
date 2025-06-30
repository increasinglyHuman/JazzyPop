# JazzyPop CSS Architecture & Theming Strategy

## 🎨 Theme-Aware CSS Architecture

### Core Design Tokens
```css
/* src/styles/tokens.css */
:root {
    /* === NORMAL MODE (Default) === */
    --color-primary: #58cc02;
    --color-primary-hover: #4aa002;
    --color-secondary: #1cb0f6;
    --color-accent: #ff4b4b;
    --color-warning: #ffc800;
    --color-success: #58cc02;
    --color-error: #ff4b4b;
    
    /* Backgrounds */
    --bg-app: #131f24;
    --bg-card: #1f2c34;
    --bg-card-hover: #243139;
    --bg-elevated: #2b3d48;
    --bg-overlay: rgba(0, 0, 0, 0.7);
    
    /* Text */
    --text-primary: #ffffff;
    --text-secondary: #afafaf;
    --text-muted: #7c7c7c;
    --text-inverse: #131f24;
    
    /* Borders */
    --border-default: rgba(255, 255, 255, 0.1);
    --border-active: var(--color-primary);
    --border-width: 2px;
    
    /* Spacing Scale */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
    --space-3xl: 64px;
    
    /* Radius Scale */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    --radius-full: 9999px;
    
    /* Typography */
    --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-display: 'Fredoka One', var(--font-primary);
    --font-mono: 'Fira Code', 'Courier New', monospace;
    
    /* Font Sizes */
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;
    --text-lg: 18px;
    --text-xl: 24px;
    --text-2xl: 32px;
    --text-3xl: 48px;
    
    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);
    --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.25);
    --shadow-glow: 0 0 20px var(--color-primary);
    
    /* Animations */
    --duration-fast: 150ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
    --duration-slower: 1000ms;
    --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
    --easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    
    /* Z-index Scale */
    --z-base: 0;
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-modal: 300;
    --z-popover: 400;
    --z-tooltip: 500;
    --z-notification: 600;
}

/* === CHAOS MODE === */
[data-mode="chaos"] {
    /* Psychedelic color shifts */
    --color-primary: #ff006e;
    --color-primary-hover: #cc0056;
    --color-secondary: #8338ec;
    --color-accent: #ffbe0b;
    --color-warning: #fb5607;
    --color-success: #06ffa5;
    
    /* Dark twisted backgrounds */
    --bg-app: #0a0a0a;
    --bg-card: #1a0f1f;
    --bg-elevated: #2a1a2e;
    --bg-chaos-gradient: linear-gradient(
        45deg,
        #ff006e 0%,
        #8338ec 25%,
        #ffbe0b 50%,
        #06ffa5 75%,
        #ff006e 100%
    );
    
    /* Glowing borders */
    --border-default: rgba(255, 0, 110, 0.3);
    --border-active: var(--color-primary);
    --shadow-glow: 0 0 30px var(--color-primary);
    
    /* Chaotic animations */
    --duration-fast: 100ms;
    --duration-normal: 200ms;
    --easing-chaos: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* === GAME MODE (Dark/Competitive) === */
[data-mode="game"] {
    /* Competitive colors */
    --color-primary: #00ff88;
    --color-secondary: #ff0088;
    --color-accent: #ffaa00;
    --color-warning: #ff3366;
    --color-success: #00ffaa;
    
    /* Dark game backgrounds */
    --bg-app: #000000;
    --bg-card: #0d0d0d;
    --bg-elevated: #1a1a1a;
    
    /* Neon borders */
    --border-default: rgba(0, 255, 136, 0.2);
    --shadow-glow: 0 0 20px var(--color-primary);
}
```

## 🏗️ Layout System

### Container Components
```css
/* src/styles/layouts/containers.css */

/* Main app container */
.app-container {
    --container-max-width: 1200px;
    --container-padding: var(--space-md);
    
    width: 100%;
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 0 var(--container-padding);
    min-height: 100vh;
}

/* Mobile-first responsive container */
.mobile-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Grid layouts */
.grid {
    display: grid;
    gap: var(--space-md);
}

.grid--2-col {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.grid--3-col {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.grid--dashboard {
    grid-template-areas:
        "header header"
        "main aside"
        "footer footer";
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr auto;
}

@media (max-width: 768px) {
    .grid--dashboard {
        grid-template-areas:
            "header"
            "main"
            "aside"
            "footer";
        grid-template-columns: 1fr;
    }
}

/* Flex utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-center { align-items: center; justify-content: center; }
.flex-between { justify-content: space-between; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.gap-xs { gap: var(--space-xs); }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }
```

### Card System
```css
/* src/styles/components/cards.css */

.card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    transition: all var(--duration-normal) var(--easing-default);
    position: relative;
    overflow: hidden;
}

.card--interactive {
    cursor: pointer;
    border: var(--border-width) solid transparent;
}

.card--interactive:hover {
    background: var(--bg-card-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.card--interactive:active {
    transform: translateY(0);
}

/* Chaos mode card effects */
[data-mode="chaos"] .card {
    animation: chaos-float 5s ease-in-out infinite;
    border: var(--border-width) solid var(--border-default);
}

[data-mode="chaos"] .card--interactive:hover {
    animation: chaos-pulse 0.5s ease-in-out;
    border-color: var(--color-primary);
    box-shadow: var(--shadow-glow);
}

/* Card variants */
.card--quiz {
    min-height: 200px;
}

.card--achievement {
    text-align: center;
    padding: var(--space-xl);
}

.card--stats {
    background: var(--bg-elevated);
    padding: var(--space-md);
}

/* Special card badges */
.card__badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: var(--color-accent);
    color: white;
    padding: var(--space-xs) var(--space-md);
    border-radius: 0 var(--radius-lg) 0 var(--radius-lg);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
}

[data-mode="chaos"] .card__badge {
    animation: badge-pulse 2s ease-in-out infinite;
}
```

## 🎭 Animation Library

### Core Animations
```css
/* src/styles/animations/core.css */

/* Entrance animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* Celebration animations */
@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Chaos mode specific */
@keyframes chaos-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-5px) rotate(1deg); }
    75% { transform: translateY(5px) rotate(-1deg); }
}

@keyframes chaos-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05) rotate(2deg); }
    100% { transform: scale(1) rotate(-2deg); }
}

@keyframes glitch {
    0%, 100% {
        text-shadow: 
            2px 2px 0 var(--color-primary),
            -2px -2px 0 var(--color-secondary);
    }
    25% {
        text-shadow: 
            -2px 2px 0 var(--color-secondary),
            2px -2px 0 var(--color-primary);
    }
    50% {
        text-shadow: 
            2px -2px 0 var(--color-accent),
            -2px 2px 0 var(--color-warning);
    }
}

@keyframes rainbow-text {
    0% { color: var(--color-primary); }
    25% { color: var(--color-secondary); }
    50% { color: var(--color-accent); }
    75% { color: var(--color-warning); }
    100% { color: var(--color-primary); }
}

/* Utility classes */
.animate-fadeIn { animation: fadeIn var(--duration-normal) ease-out; }
.animate-slideInUp { animation: slideInUp var(--duration-normal) ease-out; }
.animate-bounce { animation: bounce var(--duration-slow) ease-in-out; }
.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }

[data-mode="chaos"] .animate-text {
    animation: glitch 5s infinite;
}
```

### Transition Utilities
```css
/* src/styles/animations/transitions.css */

/* Base transitions */
.transition-all { transition: all var(--duration-normal) var(--easing-default); }
.transition-colors { transition: color, background-color, border-color var(--duration-fast) var(--easing-default); }
.transition-transform { transition: transform var(--duration-normal) var(--easing-default); }
.transition-opacity { transition: opacity var(--duration-normal) var(--easing-default); }

/* Page transitions */
.page-enter {
    opacity: 0;
    transform: translateX(20px);
}

.page-enter-active {
    opacity: 1;
    transform: translateX(0);
    transition: all var(--duration-normal) var(--easing-default);
}

.page-exit {
    opacity: 1;
    transform: translateX(0);
}

.page-exit-active {
    opacity: 0;
    transform: translateX(-20px);
    transition: all var(--duration-normal) var(--easing-default);
}

/* Mode transitions */
[data-mode-transitioning] * {
    transition: all var(--duration-slow) var(--easing-default) !important;
}

/* Chaos mode page transitions */
[data-mode="chaos"] .page-enter {
    transform: rotate(180deg) scale(0);
}

[data-mode="chaos"] .page-enter-active {
    transform: rotate(0) scale(1);
}
```

## 🎨 Component-Specific Styles

### Quiz Components
```css
/* src/styles/components/quiz.css */

.quiz-container {
    --quiz-max-width: 800px;
    
    max-width: var(--quiz-max-width);
    margin: 0 auto;
}

.question-card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    margin-bottom: var(--space-lg);
    animation: slideInUp var(--duration-normal) ease-out;
}

[data-mode="chaos"] .question-card {
    animation: chaos-float 5s ease-in-out infinite;
}

.question-text {
    font-size: var(--text-xl);
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: var(--space-xl);
}

[data-mode="chaos"] .question-text {
    animation: rainbow-text 3s linear infinite;
}

/* Answer options */
.answer-option {
    background: var(--bg-elevated);
    border: var(--border-width) solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-md);
    cursor: pointer;
    transition: all var(--duration-fast) var(--easing-default);
}

.answer-option:hover {
    border-color: var(--color-secondary);
    transform: translateX(4px);
}

.answer-option--selected {
    background: var(--color-secondary);
    border-color: var(--color-secondary);
    color: white;
}

[data-mode="chaos"] .answer-option:hover {
    transform: translateX(8px) rotate(1deg);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-glow);
}
```

### Gamification Elements
```css
/* src/styles/components/gamification.css */

/* Hearts display */
.hearts-container {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-xl);
}

.heart {
    transition: all var(--duration-fast) var(--easing-bounce);
}

.heart--empty {
    opacity: 0.3;
    filter: grayscale(1);
}

.heart--regenerating {
    animation: pulse 2s ease-in-out infinite;
}

.heart--losing {
    animation: heartbreak 0.5s ease-out;
}

@keyframes heartbreak {
    0% { transform: scale(1) rotate(0); }
    50% { transform: scale(1.2) rotate(-5deg); }
    100% { transform: scale(0) rotate(-180deg); opacity: 0; }
}

/* Streak fire */
.streak-fire {
    display: inline-flex;
    align-items: center;
    font-size: var(--text-2xl);
}

.streak-fire--active {
    animation: fire-dance 2s ease-in-out infinite;
}

.streak-fire--milestone {
    animation: fire-burst 0.5s ease-out;
}

@keyframes fire-dance {
    0%, 100% { transform: scale(1) rotate(0); }
    25% { transform: scale(1.1) rotate(-2deg); }
    75% { transform: scale(1.1) rotate(2deg); }
}

@keyframes fire-burst {
    0% { transform: scale(1); }
    50% { transform: scale(1.5); filter: brightness(2); }
    100% { transform: scale(1); }
}

/* XP Bar */
.xp-bar {
    height: 8px;
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
    overflow: hidden;
    position: relative;
}

.xp-bar__fill {
    height: 100%;
    background: var(--color-primary);
    transition: width var(--duration-slow) var(--easing-default);
    position: relative;
}

.xp-bar__fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100px;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3)
    );
    animation: shimmer 2s linear infinite;
}

[data-mode="chaos"] .xp-bar__fill {
    background: var(--bg-chaos-gradient);
    background-size: 200% 100%;
    animation: gradient-shift 3s linear infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100px); }
    100% { transform: translateX(100px); }
}

@keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
}
```

## 🎮 Mode-Specific UI

### Chaos Mode Effects
```css
/* src/styles/modes/chaos.css */

[data-mode="chaos"] {
    /* Background effects */
    position: relative;
}

[data-mode="chaos"]::before {
    content: '';
    position: fixed;
    inset: 0;
    background: 
        radial-gradient(circle at 20% 50%, rgba(255, 0, 110, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 50%, rgba(131, 56, 236, 0.1) 0%, transparent 50%);
    animation: chaos-background 20s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
}

@keyframes chaos-background {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
}

/* Chaos particles */
.chaos-particle {
    position: fixed;
    font-size: var(--text-xl);
    opacity: 0.5;
    pointer-events: none;
    animation: float-particle 10s linear infinite;
    z-index: var(--z-base);
}

@keyframes float-particle {
    0% {
        transform: translateY(100vh) rotate(0deg);
    }
    100% {
        transform: translateY(-100px) rotate(360deg);
    }
}

/* Chaos text effects */
[data-mode="chaos"] h1,
[data-mode="chaos"] h2 {
    text-shadow: 
        2px 2px 0 var(--color-primary),
        -2px -2px 0 var(--color-secondary);
    animation: glitch-text 10s infinite;
}

@keyframes glitch-text {
    0%, 100% { text-shadow: none; }
    95% { 
        text-shadow: 
            2px 2px 0 var(--color-primary),
            -2px -2px 0 var(--color-secondary);
    }
    96% {
        text-shadow: 
            -2px 2px 0 var(--color-accent),
            2px -2px 0 var(--color-warning);
    }
}
```

### Game Mode (Competitive)
```css
/* src/styles/modes/game.css */

[data-mode="game"] {
    /* Darker, more serious theme */
    font-family: var(--font-mono);
}

[data-mode="game"] .card {
    border: 1px solid var(--border-default);
    box-shadow: inset 0 0 20px rgba(0, 255, 136, 0.1);
}

[data-mode="game"] .button {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
}

[data-mode="game"] .stats-bar {
    background: linear-gradient(
        90deg,
        transparent,
        var(--bg-elevated),
        transparent
    );
    border-top: 1px solid var(--color-primary);
    border-bottom: 1px solid var(--color-primary);
}

/* Neon glow effects */
[data-mode="game"] .glow {
    text-shadow: 
        0 0 10px var(--color-primary),
        0 0 20px var(--color-primary),
        0 0 30px var(--color-primary);
}

[data-mode="game"] .button--primary {
    box-shadow: 
        0 0 20px var(--color-primary),
        inset 0 0 20px rgba(0, 255, 136, 0.2);
}
```

## 📱 Responsive System

```css
/* src/styles/responsive.css */

/* Breakpoints */
:root {
    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
    --breakpoint-xl: 1280px;
}

/* Mobile-first utilities */
.hide-mobile { display: none; }
.show-mobile { display: block; }

@media (min-width: 768px) {
    .hide-mobile { display: block; }
    .show-mobile { display: none; }
    
    /* Adjust spacing for larger screens */
    :root {
        --space-md: 20px;
        --space-lg: 32px;
        --space-xl: 48px;
    }
    
    /* Desktop navigation */
    .bottom-nav { display: none; }
    .side-nav { display: flex; }
}

@media (min-width: 1024px) {
    /* Even more spacious on desktop */
    :root {
        --space-lg: 40px;
        --space-xl: 64px;
    }
    
    /* Multi-column layouts */
    .grid--dashboard {
        grid-template-columns: 250px 1fr 300px;
    }
}

/* Chaos mode responsive adjustments */
@media (max-width: 768px) {
    [data-mode="chaos"] .chaos-particle {
        font-size: var(--text-base);
    }
    
    [data-mode="chaos"] .question-text {
        font-size: var(--text-lg);
    }
}
```

## 🎯 Usage Strategy

### 1. **Mode Switching**
```javascript
// Mode switcher implementation
function switchMode(mode) {
    document.body.setAttribute('data-mode-transitioning', '');
    
    setTimeout(() => {
        document.body.setAttribute('data-mode', mode);
        document.body.removeAttribute('data-mode-transitioning');
    }, 50);
}
```

### 2. **Component Composition**
```html
<!-- Example quiz card with mode awareness -->
<div class="card card--quiz card--interactive animate-slideInUp">
    <div class="card__badge">2X XP</div>
    <div class="question-card">
        <h3 class="question-text">What is the output of this code?</h3>
        <div class="answer-options">
            <!-- Options here -->
        </div>
    </div>
</div>
```

### 3. **Theme Customization**
```css
/* User preference overrides */
[data-theme="dark"] {
    --bg-app: #000000;
    --bg-card: #111111;
}

[data-theme="high-contrast"] {
    --text-primary: #ffffff;
    --bg-app: #000000;
    --border-width: 3px;
}
```

This CSS architecture provides:
- **Consistent theming** across modes
- **Reusable components** with variants
- **Smooth transitions** between states
- **Performance-optimized** animations
- **Mobile-first** responsive design
- **Mode-specific** visual effects
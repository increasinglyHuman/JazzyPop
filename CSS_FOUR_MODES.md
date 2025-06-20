# JazzyPop Four-Mode CSS System

## 🎨 The Four Modes

### Mode Philosophy
- **📚 Normal**: Clean, focused learning experience
- **🌪️ Chaos**: Wild, unpredictable, maximum fun
- **🧘 Zen**: Calm, stress-free, mindful learning
- **⚡ Speed**: Fast-paced, competitive, adrenaline rush

## 🎯 Complete Mode Definitions

### 📚 NORMAL MODE (Default)
```css
/* Standard learning experience - clean and friendly */
:root {
    /* Colors - Professional but approachable */
    --color-primary: #58cc02;
    --color-primary-hover: #4aa002;
    --color-secondary: #1cb0f6;
    --color-accent: #ff4b4b;
    --color-warning: #ffc800;
    --color-success: #58cc02;
    
    /* Backgrounds - Dark but not too dark */
    --bg-app: #131f24;
    --bg-card: #1f2c34;
    --bg-elevated: #2b3d48;
    
    /* Text - High contrast for readability */
    --text-primary: #ffffff;
    --text-secondary: #afafaf;
    
    /* Animations - Smooth and predictable */
    --duration-fast: 150ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
    --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Effects - Subtle and professional */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
    --border-radius: 16px;
}

/* Normal mode specific styles */
[data-mode="normal"] .quiz-card {
    transition: all var(--duration-normal) var(--easing-default);
}

[data-mode="normal"] .correct-answer {
    background: var(--color-success);
    animation: gentle-pulse 0.5s ease-out;
}

@keyframes gentle-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
```

### 🌪️ CHAOS MODE
```css
/* Maximum sensory overload - fun and unpredictable */
[data-mode="chaos"] {
    /* Psychedelic color palette */
    --color-primary: #ff006e;
    --color-secondary: #8338ec;
    --color-accent: #ffbe0b;
    --color-warning: #fb5607;
    --color-success: #06ffa5;
    
    /* Dark twisted backgrounds */
    --bg-app: #0a0a0a;
    --bg-card: #1a0f1f;
    --bg-elevated: #2a1a2e;
    
    /* Rapid animations */
    --duration-fast: 100ms;
    --duration-normal: 200ms;
    --duration-slow: 400ms;
    --easing-chaos: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    
    /* Wild effects */
    --shadow-glow: 0 0 30px var(--color-primary);
    --border-radius: 24px;
}

/* Chaos-specific animations */
[data-mode="chaos"] .quiz-card {
    animation: chaos-float 5s ease-in-out infinite;
    border: 2px solid transparent;
    background-image: linear-gradient(var(--bg-card), var(--bg-card)),
                      linear-gradient(45deg, var(--color-primary), var(--color-secondary), var(--color-accent));
    background-origin: border-box;
    background-clip: padding-box, border-box;
}

[data-mode="chaos"] .question-text {
    animation: glitch-text 10s infinite;
}

[data-mode="chaos"] .answer-option:hover {
    transform: translateX(10px) rotate(2deg) scale(1.05);
    box-shadow: var(--shadow-glow);
}

/* Chaos particles */
[data-mode="chaos"]::after {
    content: '✨🌟💫⚡🔥🌈🎲🎯';
    position: fixed;
    top: -50px;
    left: 0;
    right: 0;
    font-size: 30px;
    animation: rain-particles 10s linear infinite;
    pointer-events: none;
    z-index: 1000;
}

@keyframes chaos-float {
    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
    25% { transform: translateY(-10px) rotate(2deg) scale(1.02); }
    50% { transform: translateY(5px) rotate(-1deg) scale(0.98); }
    75% { transform: translateY(-5px) rotate(-2deg) scale(1.01); }
}

@keyframes glitch-text {
    0%, 100% { 
        text-shadow: none;
        transform: skew(0deg);
    }
    95% { 
        text-shadow: 
            2px 2px 0 var(--color-primary),
            -2px -2px 0 var(--color-secondary);
        transform: skew(-2deg);
    }
    96% {
        text-shadow: 
            -2px 2px 0 var(--color-accent),
            2px -2px 0 var(--color-warning);
        transform: skew(2deg);
    }
}

@keyframes rain-particles {
    0% { transform: translateY(0); }
    100% { transform: translateY(100vh); }
}
```

### 🧘 ZEN MODE
```css
/* Calm, peaceful, stress-free learning */
[data-mode="zen"] {
    /* Soft, calming colors */
    --color-primary: #7fb069;
    --color-secondary: #6ba3c5;
    --color-accent: #f4b393;
    --color-warning: #e8c468;
    --color-success: #7fb069;
    
    /* Light, airy backgrounds */
    --bg-app: #f5f3f0;
    --bg-card: #ffffff;
    --bg-elevated: #fafafa;
    
    /* Dark text for light backgrounds */
    --text-primary: #2d3436;
    --text-secondary: #636e72;
    
    /* Slow, peaceful animations */
    --duration-fast: 300ms;
    --duration-normal: 600ms;
    --duration-slow: 1000ms;
    --easing-zen: cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Soft shadows */
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
    --border-radius: 20px;
}

/* Zen-specific styles */
[data-mode="zen"] {
    background-image: 
        radial-gradient(circle at 20% 50%, rgba(127, 176, 105, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 50%, rgba(107, 163, 197, 0.1) 0%, transparent 50%);
}

[data-mode="zen"] .quiz-card {
    box-shadow: var(--shadow-sm);
    animation: gentle-breathe 4s ease-in-out infinite;
}

[data-mode="zen"] .answer-option {
    transition: all var(--duration-normal) var(--easing-zen);
    border: 2px solid transparent;
}

[data-mode="zen"] .answer-option:hover {
    border-color: var(--color-primary);
    transform: scale(1.02);
    box-shadow: var(--shadow-md);
}

/* No timers or pressure in zen mode */
[data-mode="zen"] .timer,
[data-mode="zen"] .countdown,
[data-mode="zen"] .speed-bonus {
    display: none;
}

/* Calming animations */
@keyframes gentle-breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.01); }
}

/* Zen particles - floating leaves */
[data-mode="zen"] .zen-particle {
    position: fixed;
    color: var(--color-primary);
    opacity: 0.3;
    animation: float-leaf 15s ease-in-out infinite;
    pointer-events: none;
}

@keyframes float-leaf {
    0% {
        transform: translateX(-10px) translateY(-100px) rotate(0deg);
    }
    100% {
        transform: translateX(10px) translateY(100vh) rotate(360deg);
    }
}
```

### ⚡ SPEED MODE
```css
/* Fast-paced, competitive, adrenaline rush */
[data-mode="speed"] {
    /* High-energy colors */
    --color-primary: #00ff88;
    --color-secondary: #ff0088;
    --color-accent: #ffaa00;
    --color-warning: #ff3366;
    --color-success: #00ffaa;
    
    /* Dark racing backgrounds */
    --bg-app: #0a0a0a;
    --bg-card: #1a1a1a;
    --bg-elevated: #2a2a2a;
    
    /* Bright text */
    --text-primary: #ffffff;
    --text-secondary: #cccccc;
    
    /* Lightning-fast animations */
    --duration-fast: 50ms;
    --duration-normal: 100ms;
    --duration-slow: 200ms;
    --easing-speed: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    
    /* Neon effects */
    --shadow-neon: 0 0 20px var(--color-primary);
    --border-radius: 12px;
}

/* Speed mode background */
[data-mode="speed"] {
    background: 
        linear-gradient(180deg, transparent 0%, rgba(0, 255, 136, 0.1) 100%),
        var(--bg-app);
}

/* Speed lines effect */
[data-mode="speed"]::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 10px,
        rgba(0, 255, 136, 0.03) 10px,
        rgba(0, 255, 136, 0.03) 20px
    );
    animation: speed-lines 0.5s linear infinite;
    pointer-events: none;
}

@keyframes speed-lines {
    0% { transform: translateX(0); }
    100% { transform: translateX(20px); }
}

/* Speed mode cards */
[data-mode="speed"] .quiz-card {
    border: 1px solid var(--color-primary);
    box-shadow: 
        var(--shadow-neon),
        inset 0 0 20px rgba(0, 255, 136, 0.1);
    animation: pulse-neon 2s ease-in-out infinite;
}

[data-mode="speed"] .answer-option {
    transition: all var(--duration-fast) var(--easing-speed);
    border-left: 4px solid transparent;
}

[data-mode="speed"] .answer-option:hover {
    border-left-color: var(--color-primary);
    transform: translateX(10px);
    box-shadow: var(--shadow-neon);
}

/* Speed timer emphasis */
[data-mode="speed"] .timer {
    font-size: 2em;
    font-weight: 900;
    color: var(--color-accent);
    animation: timer-pulse 1s ease-in-out infinite;
}

[data-mode="speed"] .timer.warning {
    color: var(--color-warning);
    animation: timer-flash 0.5s ease-in-out infinite;
}

@keyframes pulse-neon {
    0%, 100% { 
        box-shadow: 
            0 0 20px var(--color-primary),
            inset 0 0 20px rgba(0, 255, 136, 0.1);
    }
    50% { 
        box-shadow: 
            0 0 30px var(--color-primary),
            inset 0 0 30px rgba(0, 255, 136, 0.2);
    }
}

@keyframes timer-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

@keyframes timer-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Speed streak multiplier */
[data-mode="speed"] .speed-multiplier {
    position: fixed;
    top: 50%;
    right: 20px;
    font-size: 3em;
    font-weight: 900;
    color: var(--color-accent);
    animation: slide-in-bounce 0.3s ease-out;
}

@keyframes slide-in-bounce {
    0% { 
        transform: translateX(100px) scale(0);
        opacity: 0;
    }
    50% { 
        transform: translateX(0) scale(1.2);
    }
    100% { 
        transform: translateX(0) scale(1);
        opacity: 1;
    }
}
```

## 🎮 Mode-Specific Features

### Mode Characteristics
```css
/* Mode-specific UI adjustments */

/* Normal - Standard UI elements */
[data-mode="normal"] .skip-button { display: flex; }
[data-mode="normal"] .hint-button { display: flex; }
[data-mode="normal"] .pause-button { display: flex; }

/* Chaos - Everything is possible */
[data-mode="chaos"] .skip-button { animation: rainbow-bg 2s linear infinite; }
[data-mode="chaos"] .hint-button { display: none; } /* No hints in chaos! */
[data-mode="chaos"] .question-order { order: random; } /* CSS can't do random, but JS will */

/* Zen - Remove stressful elements */
[data-mode="zen"] .hearts-display { opacity: 0.5; } /* Hearts visible but de-emphasized */
[data-mode="zen"] .timer { display: none; }
[data-mode="zen"] .streak-pressure { display: none; }
[data-mode="zen"] .wrong-answer { background: var(--color-warning); } /* Gentler wrong answer */

/* Speed - Emphasize time and performance */
[data-mode="speed"] .timer { 
    font-size: 2.5em; 
    position: fixed;
    top: 20px;
    right: 20px;
}
[data-mode="speed"] .speed-bonus { display: block; }
[data-mode="speed"] .perfect-streak { 
    font-size: 1.5em;
    color: var(--color-accent);
}
```

## 🔄 Mode Switching Effects

```css
/* Smooth transitions between modes */
.mode-transition-overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-app);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-normal) ease-out;
    z-index: 9999;
}

.mode-transition-overlay.active {
    opacity: 1;
}

/* Mode switch animations */
[data-mode-switching-to="chaos"] .mode-transition-overlay {
    background: 
        linear-gradient(45deg, 
            var(--color-primary) 0%, 
            var(--color-secondary) 25%, 
            var(--color-accent) 50%, 
            var(--color-warning) 75%, 
            var(--color-primary) 100%);
    background-size: 400% 400%;
    animation: gradient-madness 0.5s ease-out;
}

[data-mode-switching-to="zen"] .mode-transition-overlay {
    background: radial-gradient(circle, var(--bg-card), var(--bg-app));
    animation: breathe-in 1s ease-out;
}

[data-mode-switching-to="speed"] .mode-transition-overlay {
    background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
    animation: speed-wipe 0.3s ease-out;
}

@keyframes gradient-madness {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
}

@keyframes breathe-in {
    0% { transform: scale(0.9); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
}

@keyframes speed-wipe {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
```

## 📊 Mode Selection UI

```css
/* Mode selector component */
.mode-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--bg-card);
    border-radius: var(--border-radius);
}

.mode-option {
    padding: var(--space-lg);
    text-align: center;
    cursor: pointer;
    border-radius: var(--border-radius);
    transition: all var(--duration-normal) ease-out;
    border: 2px solid transparent;
}

.mode-option:hover {
    transform: translateY(-4px);
}

.mode-option--normal {
    background: linear-gradient(135deg, #58cc02, #4aa002);
}

.mode-option--chaos {
    background: linear-gradient(135deg, #ff006e, #8338ec);
    animation: rainbow-bg 5s linear infinite;
}

.mode-option--zen {
    background: linear-gradient(135deg, #7fb069, #6ba3c5);
}

.mode-option--speed {
    background: linear-gradient(135deg, #00ff88, #ff0088);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.mode-option.active {
    border-color: var(--text-primary);
    transform: scale(1.05);
}

.mode-icon {
    font-size: 3em;
    margin-bottom: var(--space-sm);
}

.mode-name {
    font-size: var(--text-lg);
    font-weight: 700;
    margin-bottom: var(--space-xs);
}

.mode-description {
    font-size: var(--text-sm);
    opacity: 0.8;
}
```

## 🎯 Mode Benefits & Scoring

```css
/* Mode-specific scoring displays */
.mode-benefits {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
}

.benefit-tag {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
}

[data-mode="normal"] .benefit-tag {
    background: var(--bg-elevated);
    color: var(--text-secondary);
}

[data-mode="chaos"] .benefit-tag {
    background: var(--color-accent);
    color: var(--text-primary);
    animation: pulse 2s infinite;
}

[data-mode="zen"] .benefit-tag {
    background: var(--color-primary);
    color: white;
    opacity: 0.8;
}

[data-mode="speed"] .benefit-tag {
    background: var(--color-primary);
    color: black;
    box-shadow: 0 0 10px var(--color-primary);
}
```

This four-mode system gives players distinct experiences:
- **Normal**: Balanced learning
- **Chaos**: Maximum fun and unpredictability  
- **Zen**: Stress-free practice
- **Speed**: Competitive rush

Each mode has unique visual identity, animations, and UI adjustments!
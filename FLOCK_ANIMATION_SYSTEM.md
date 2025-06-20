# JazzyPop Flock Animation System

## 🦅 Flocking Behavior Architecture

### Core Flocking Algorithm
```javascript
// src/animations/FlockSystem.js
export class FlockSystem {
    constructor(mode = 'normal') {
        this.mode = mode;
        this.entities = [];
        this.canvas = null;
        this.ctx = null;
        this.rules = this.getModeRules(mode);
        this.animationId = null;
    }
    
    getModeRules(mode) {
        const rules = {
            normal: {
                separation: 25,      // Avoid crowding neighbors
                alignment: 25,       // Steer towards average heading
                cohesion: 25,        // Steer towards average position
                maxSpeed: 2,
                maxForce: 0.05,
                desiredSeparation: 25,
                neighborDistance: 50,
                wanderRadius: 10
            },
            chaos: {
                separation: 50,      // Erratic avoidance
                alignment: 5,        // Barely follow others
                cohesion: 10,        // Loose grouping
                maxSpeed: 8,         // FAST
                maxForce: 0.3,
                desiredSeparation: 15,
                neighborDistance: 100,
                wanderRadius: 50,    // Wild movements
                randomness: 0.5      // Chaos factor
            },
            zen: {
                separation: 30,
                alignment: 40,       // Harmonious movement
                cohesion: 35,        // Peaceful grouping
                maxSpeed: 0.8,       // Slow and graceful
                maxForce: 0.02,
                desiredSeparation: 40,
                neighborDistance: 80,
                wanderRadius: 5
            },
            speed: {
                separation: 20,
                alignment: 50,       // Perfect synchronization
                cohesion: 30,
                maxSpeed: 6,         // Racing speed
                maxForce: 0.15,
                desiredSeparation: 20,
                neighborDistance: 60,
                wanderRadius: 2      // Minimal deviation
            }
        };
        
        return rules[mode] || rules.normal;
    }
}

// Individual entity in the flock
export class FlockEntity {
    constructor(x, y, type, flockRules) {
        this.position = { x, y };
        this.velocity = {
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1
        };
        this.acceleration = { x: 0, y: 0 };
        this.type = type;
        this.rules = flockRules;
        this.wanderAngle = Math.random() * Math.PI * 2;
        
        // Visual properties based on type
        this.visual = this.getVisualProperties(type);
    }
    
    getVisualProperties(type) {
        const visuals = {
            // Normal mode
            bird: {
                emoji: '🦅',
                size: 20,
                trail: false,
                glow: false
            },
            butterfly: {
                emoji: '🦋',
                size: 16,
                trail: false,
                glow: false
            },
            
            // Chaos mode
            demon: {
                emoji: '😈',
                size: 24,
                trail: true,
                trailColor: '#ff006e',
                glow: true,
                glowColor: '#8338ec'
            },
            fire: {
                emoji: '🔥',
                size: 20,
                trail: true,
                trailColor: '#ffbe0b',
                glow: true,
                glowColor: '#ff006e'
            },
            alien: {
                emoji: '👽',
                size: 22,
                trail: true,
                trailColor: '#06ffa5',
                glow: true,
                glowColor: '#8338ec'
            },
            
            // Zen mode
            leaf: {
                emoji: '🍃',
                size: 18,
                trail: false,
                glow: false,
                opacity: 0.7
            },
            lotus: {
                emoji: '🪷',
                size: 20,
                trail: false,
                glow: false,
                opacity: 0.8
            },
            fish: {
                emoji: '🐠',
                size: 18,
                trail: false,
                glow: false,
                opacity: 0.6
            },
            
            // Speed mode
            rocket: {
                emoji: '🚀',
                size: 22,
                trail: true,
                trailColor: '#00ff88',
                glow: true,
                glowColor: '#00ff88'
            },
            lightning: {
                emoji: '⚡',
                size: 20,
                trail: true,
                trailColor: '#ffaa00',
                glow: true,
                glowColor: '#ff0088'
            }
        };
        
        return visuals[type] || visuals.bird;
    }
    
    // Reynolds' flocking behaviors
    separate(entities) {
        const steer = { x: 0, y: 0 };
        let count = 0;
        
        entities.forEach(other => {
            const d = this.distance(this.position, other.position);
            
            if (d > 0 && d < this.rules.desiredSeparation) {
                const diff = {
                    x: this.position.x - other.position.x,
                    y: this.position.y - other.position.y
                };
                
                // Normalize and weight by distance
                const mag = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
                diff.x /= mag;
                diff.y /= mag;
                diff.x /= d; // Weight by distance
                diff.y /= d;
                
                steer.x += diff.x;
                steer.y += diff.y;
                count++;
            }
        });
        
        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
            
            // Normalize and scale
            const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (mag > 0) {
                steer.x = (steer.x / mag) * this.rules.maxSpeed;
                steer.y = (steer.y / mag) * this.rules.maxSpeed;
                
                // Apply steering force
                steer.x -= this.velocity.x;
                steer.y -= this.velocity.y;
                
                // Limit force
                this.limitVector(steer, this.rules.maxForce);
            }
        }
        
        return steer;
    }
    
    align(entities) {
        const sum = { x: 0, y: 0 };
        let count = 0;
        
        entities.forEach(other => {
            const d = this.distance(this.position, other.position);
            
            if (d > 0 && d < this.rules.neighborDistance) {
                sum.x += other.velocity.x;
                sum.y += other.velocity.y;
                count++;
            }
        });
        
        if (count > 0) {
            sum.x /= count;
            sum.y /= count;
            
            // Normalize and scale
            const mag = Math.sqrt(sum.x * sum.x + sum.y * sum.y);
            sum.x = (sum.x / mag) * this.rules.maxSpeed;
            sum.y = (sum.y / mag) * this.rules.maxSpeed;
            
            const steer = {
                x: sum.x - this.velocity.x,
                y: sum.y - this.velocity.y
            };
            
            this.limitVector(steer, this.rules.maxForce);
            return steer;
        }
        
        return { x: 0, y: 0 };
    }
    
    cohesion(entities) {
        const sum = { x: 0, y: 0 };
        let count = 0;
        
        entities.forEach(other => {
            const d = this.distance(this.position, other.position);
            
            if (d > 0 && d < this.rules.neighborDistance) {
                sum.x += other.position.x;
                sum.y += other.position.y;
                count++;
            }
        });
        
        if (count > 0) {
            sum.x /= count;
            sum.y /= count;
            return this.seek(sum);
        }
        
        return { x: 0, y: 0 };
    }
    
    // Chaos mode special: random walk
    wander() {
        if (this.rules.randomness) {
            this.wanderAngle += (Math.random() - 0.5) * this.rules.randomness;
            
            const wanderForce = {
                x: Math.cos(this.wanderAngle) * this.rules.wanderRadius,
                y: Math.sin(this.wanderAngle) * this.rules.wanderRadius
            };
            
            return wanderForce;
        }
        
        return { x: 0, y: 0 };
    }
}
```

### Mode-Specific Flock Behaviors

```javascript
// src/animations/flocks/NormalFlock.js
export class NormalFlock extends FlockSystem {
    constructor() {
        super('normal');
        this.entityTypes = ['bird', 'butterfly'];
        this.maxEntities = 15;
    }
    
    createEntities() {
        for (let i = 0; i < this.maxEntities; i++) {
            const type = this.entityTypes[Math.floor(Math.random() * this.entityTypes.length)];
            const entity = new FlockEntity(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight,
                type,
                this.rules
            );
            this.entities.push(entity);
        }
    }
    
    render(ctx) {
        this.entities.forEach(entity => {
            ctx.save();
            ctx.translate(entity.position.x, entity.position.y);
            
            // Rotate based on velocity
            const angle = Math.atan2(entity.velocity.y, entity.velocity.x);
            ctx.rotate(angle);
            
            // Draw emoji
            ctx.font = `${entity.visual.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(entity.visual.emoji, 0, 0);
            
            ctx.restore();
        });
    }
}

// src/animations/flocks/ChaosFlock.js
export class ChaosFlock extends FlockSystem {
    constructor() {
        super('chaos');
        this.entityTypes = ['demon', 'fire', 'alien', '💀', '🌟', '💥'];
        this.maxEntities = 30; // MORE CHAOS
        this.trails = [];
    }
    
    createEntities() {
        for (let i = 0; i < this.maxEntities; i++) {
            const type = this.entityTypes[Math.floor(Math.random() * this.entityTypes.length)];
            const entity = new FlockEntity(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight,
                type,
                this.rules
            );
            
            // Chaos entities can spawn from edges
            if (Math.random() > 0.5) {
                const edge = Math.floor(Math.random() * 4);
                switch(edge) {
                    case 0: entity.position.y = 0; break;
                    case 1: entity.position.x = window.innerWidth; break;
                    case 2: entity.position.y = window.innerHeight; break;
                    case 3: entity.position.x = 0; break;
                }
            }
            
            this.entities.push(entity);
        }
    }
    
    update() {
        super.update();
        
        // Add chaos-specific behaviors
        this.entities.forEach((entity, index) => {
            // Random teleportation
            if (Math.random() < 0.001) {
                entity.position.x = Math.random() * window.innerWidth;
                entity.position.y = Math.random() * window.innerHeight;
                
                // Create explosion effect
                this.createExplosion(entity.position);
            }
            
            // Size pulsing
            entity.visual.size = entity.visual.size + Math.sin(Date.now() * 0.01 + index) * 2;
            
            // Trail management
            if (entity.visual.trail) {
                this.trails.push({
                    x: entity.position.x,
                    y: entity.position.y,
                    color: entity.visual.trailColor,
                    life: 1.0
                });
            }
        });
        
        // Update trails
        this.trails = this.trails.filter(trail => {
            trail.life -= 0.02;
            return trail.life > 0;
        });
    }
    
    render(ctx) {
        // Draw trails first
        this.trails.forEach(trail => {
            ctx.save();
            ctx.globalAlpha = trail.life * 0.5;
            ctx.fillStyle = trail.color;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // Draw entities with glow
        this.entities.forEach(entity => {
            ctx.save();
            
            // Glow effect
            if (entity.visual.glow) {
                ctx.shadowColor = entity.visual.glowColor;
                ctx.shadowBlur = 20;
            }
            
            ctx.translate(entity.position.x, entity.position.y);
            
            // Chaotic rotation
            const angle = Math.atan2(entity.velocity.y, entity.velocity.x) + 
                         Math.sin(Date.now() * 0.01) * 0.5;
            ctx.rotate(angle);
            
            // Draw emoji with random scale
            const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
            ctx.font = `${entity.visual.size * scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(entity.visual.emoji, 0, 0);
            
            ctx.restore();
        });
    }
    
    createExplosion(position) {
        // Create particle burst
        for (let i = 0; i < 10; i++) {
            const particle = {
                x: position.x,
                y: position.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                emoji: ['✨', '💥', '⚡'][Math.floor(Math.random() * 3)],
                life: 1.0
            };
            
            // Add to a separate explosion system
            this.explosions = this.explosions || [];
            this.explosions.push(particle);
        }
    }
}

// src/animations/flocks/ZenFlock.js
export class ZenFlock extends FlockSystem {
    constructor() {
        super('zen');
        this.entityTypes = ['leaf', 'lotus', 'fish', '🕊️', '☁️'];
        this.maxEntities = 10; // Minimal, peaceful
        this.time = 0;
    }
    
    createEntities() {
        // Zen entities start in harmonious positions
        const goldenRatio = 1.618;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        for (let i = 0; i < this.maxEntities; i++) {
            const angle = (i / this.maxEntities) * Math.PI * 2;
            const radius = 100 + (i * goldenRatio * 10);
            
            const type = this.entityTypes[i % this.entityTypes.length];
            const entity = new FlockEntity(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius,
                type,
                this.rules
            );
            
            // Zen entities move in circular patterns initially
            entity.velocity.x = -Math.sin(angle) * this.rules.maxSpeed;
            entity.velocity.y = Math.cos(angle) * this.rules.maxSpeed;
            
            this.entities.push(entity);
        }
    }
    
    update() {
        super.update();
        this.time += 0.01;
        
        // Add gentle wave motion
        this.entities.forEach((entity, index) => {
            const wave = Math.sin(this.time + index * 0.5) * 0.1;
            entity.acceleration.y += wave;
            
            // Gentle size breathing
            entity.visual.size = entity.visual.baseSize || 18;
            entity.visual.size += Math.sin(this.time * 2 + index) * 2;
        });
    }
    
    render(ctx) {
        // Soft rendering with transparency
        this.entities.forEach((entity, index) => {
            ctx.save();
            
            // Fade based on position
            const centerDistance = Math.sqrt(
                Math.pow(entity.position.x - window.innerWidth / 2, 2) +
                Math.pow(entity.position.y - window.innerHeight / 2, 2)
            );
            const opacity = Math.max(0.3, 1 - (centerDistance / 500));
            ctx.globalAlpha = opacity * (entity.visual.opacity || 1);
            
            ctx.translate(entity.position.x, entity.position.y);
            
            // Gentle rotation
            const angle = Math.atan2(entity.velocity.y, entity.velocity.x);
            ctx.rotate(angle + Math.sin(this.time + index) * 0.1);
            
            // Draw with soft edges
            ctx.font = `${entity.visual.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.filter = 'blur(0.5px)';
            ctx.fillText(entity.visual.emoji, 0, 0);
            
            ctx.restore();
        });
    }
}

// src/animations/flocks/SpeedFlock.js
export class SpeedFlock extends FlockSystem {
    constructor() {
        super('speed');
        this.entityTypes = ['rocket', 'lightning'];
        this.maxEntities = 20;
        this.speedStreaks = [];
    }
    
    createEntities() {
        // Speed entities start from left, moving right
        for (let i = 0; i < this.maxEntities; i++) {
            const type = this.entityTypes[i % this.entityTypes.length];
            const entity = new FlockEntity(
                -50, // Start off-screen left
                Math.random() * window.innerHeight,
                type,
                this.rules
            );
            
            // All moving right initially
            entity.velocity.x = this.rules.maxSpeed;
            entity.velocity.y = (Math.random() - 0.5) * 2;
            
            this.entities.push(entity);
        }
    }
    
    update() {
        super.update();
        
        // Create speed streaks
        this.entities.forEach(entity => {
            if (Math.abs(entity.velocity.x) > this.rules.maxSpeed * 0.8) {
                this.speedStreaks.push({
                    x1: entity.position.x,
                    y1: entity.position.y,
                    x2: entity.position.x - entity.velocity.x * 10,
                    y2: entity.position.y - entity.velocity.y * 10,
                    color: entity.visual.trailColor,
                    life: 1.0
                });
            }
        });
        
        // Update streaks
        this.speedStreaks = this.speedStreaks.filter(streak => {
            streak.life -= 0.1;
            return streak.life > 0;
        });
        
        // Wrap around screen for continuous motion
        this.entities.forEach(entity => {
            if (entity.position.x > window.innerWidth + 50) {
                entity.position.x = -50;
                entity.position.y = Math.random() * window.innerHeight;
            }
        });
    }
    
    render(ctx) {
        // Draw speed lines first
        this.speedStreaks.forEach(streak => {
            ctx.save();
            ctx.globalAlpha = streak.life * 0.3;
            ctx.strokeStyle = streak.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(streak.x1, streak.y1);
            ctx.lineTo(streak.x2, streak.y2);
            ctx.stroke();
            ctx.restore();
        });
        
        // Draw entities with motion blur
        this.entities.forEach(entity => {
            const speed = Math.sqrt(
                entity.velocity.x * entity.velocity.x +
                entity.velocity.y * entity.velocity.y
            );
            
            // Motion blur based on speed
            const blurAmount = Math.min(speed / 2, 5);
            
            ctx.save();
            
            // Glow effect
            ctx.shadowColor = entity.visual.glowColor;
            ctx.shadowBlur = 10 + blurAmount;
            
            ctx.translate(entity.position.x, entity.position.y);
            ctx.rotate(Math.atan2(entity.velocity.y, entity.velocity.x));
            
            // Stretch based on speed
            ctx.scale(1 + speed / 20, 1);
            
            ctx.font = `${entity.visual.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(entity.visual.emoji, 0, 0);
            
            ctx.restore();
        });
    }
}
```

## 🎨 CSS Integration for Flock Canvas

```css
/* Flock animation canvas styling */
.flock-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 1;
    transition: opacity var(--duration-slow) ease-out;
}

/* Mode-specific canvas settings */
[data-mode="normal"] .flock-canvas {
    opacity: 0.6;
    mix-blend-mode: normal;
}

[data-mode="chaos"] .flock-canvas {
    opacity: 0.8;
    mix-blend-mode: screen;
    filter: contrast(1.2) saturate(1.5);
}

[data-mode="zen"] .flock-canvas {
    opacity: 0.4;
    mix-blend-mode: multiply;
    filter: blur(0.5px);
}

[data-mode="speed"] .flock-canvas {
    opacity: 0.7;
    mix-blend-mode: add;
    filter: contrast(1.5);
}

/* Performance optimization */
.reduce-motion .flock-canvas {
    display: none;
}

@media (max-width: 768px) {
    /* Reduce particle count on mobile */
    .flock-canvas {
        opacity: 0.3;
    }
}
```

## 🚀 Implementation Usage

```javascript
// src/components/FlockAnimation.js
export class FlockAnimationComponent {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.flock = null;
        this.isRunning = false;
    }
    
    init(mode = 'normal') {
        this.setupCanvas();
        this.switchMode(mode);
        this.start();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'flock-canvas';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    switchMode(mode) {
        // Clean up existing flock
        if (this.flock) {
            this.flock.destroy();
        }
        
        // Create mode-specific flock
        switch(mode) {
            case 'chaos':
                this.flock = new ChaosFlock();
                break;
            case 'zen':
                this.flock = new ZenFlock();
                break;
            case 'speed':
                this.flock = new SpeedFlock();
                break;
            default:
                this.flock = new NormalFlock();
        }
        
        this.flock.init(this.canvas, this.ctx);
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and render flock
        this.flock.update();
        this.flock.render(this.ctx);
        
        requestAnimationFrame(() => this.animate());
    }
    
    stop() {
        this.isRunning = false;
    }
    
    setIntensity(level) {
        if (this.flock) {
            this.flock.setIntensity(level);
        }
    }
}

// Integration with mode manager
EventBus.on('mode:changed', ({ mode }) => {
    flockAnimation.switchMode(mode);
});

// Performance management
EventBus.on('performance:low', () => {
    flockAnimation.setIntensity(0.5);
});
```

## 🎯 Special Effects Library

```javascript
// Additional psychedelic effects for chaos mode
export class PsychedelicEffects {
    static kaleidoscope(ctx, entities) {
        const segments = 6;
        const angle = (Math.PI * 2) / segments;
        
        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        
        for (let i = 0; i < segments; i++) {
            ctx.save();
            ctx.rotate(angle * i);
            
            // Mirror effect
            if (i % 2 === 0) {
                ctx.scale(-1, 1);
            }
            
            // Draw segment
            entities.forEach(entity => {
                const relX = entity.position.x - ctx.canvas.width / 2;
                const relY = entity.position.y - ctx.canvas.height / 2;
                
                ctx.fillText(entity.visual.emoji, relX, relY);
            });
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    static fractal(ctx, entity, depth = 3) {
        if (depth <= 0) return;
        
        ctx.save();
        ctx.translate(entity.position.x, entity.position.y);
        ctx.scale(0.7, 0.7);
        ctx.rotate(Date.now() * 0.001);
        
        // Draw entity
        ctx.fillText(entity.visual.emoji, 0, 0);
        
        // Recursive fractals
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / 3) * i);
            ctx.translate(30, 0);
            
            this.fractal(ctx, {
                position: { x: 0, y: 0 },
                visual: entity.visual
            }, depth - 1);
            
            ctx.restore();
        }
        
        ctx.restore();
    }
}
```

This flocking system creates:
- **Normal**: Peaceful birds & butterflies
- **Chaos**: Demons, fire, aliens with trails and explosions
- **Zen**: Floating leaves, lotus flowers in harmonious patterns
- **Speed**: Racing rockets with motion blur and speed lines

Each mode has unique movement patterns, visual effects, and behaviors that add incredible atmosphere to the quiz experience!
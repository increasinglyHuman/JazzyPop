# JazzyPop Boids Event Animation System

## 🦅 Event-Triggered Flocking Animations

### Core Boids Implementation (Craig Reynolds Algorithm)
```javascript
// src/animations/boids/Boid.js
export class Boid {
    constructor(x, y, config = {}) {
        this.position = new Vector(x, y);
        this.velocity = Vector.random2D();
        this.velocity.setMag(config.initialSpeed || 2);
        this.acceleration = new Vector(0, 0);
        
        // Reynolds parameters
        this.maxSpeed = config.maxSpeed || 4;
        this.maxForce = config.maxForce || 0.1;
        this.perceptionRadius = config.perceptionRadius || 50;
        
        // Visual properties
        this.size = config.size || 10;
        this.emoji = config.emoji || '✨';
        this.trail = [];
        this.maxTrailLength = config.trailLength || 0;
        this.opacity = 1;
        this.scale = 1;
    }
    
    // Reynolds' three rules
    separation(boids) {
        const steering = new Vector(0, 0);
        let total = 0;
        
        for (let other of boids) {
            const d = this.position.dist(other.position);
            if (other !== this && d < this.perceptionRadius * 0.5) {
                const diff = Vector.sub(this.position, other.position);
                diff.div(d * d); // Weight by distance
                steering.add(diff);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }
    
    alignment(boids) {
        const steering = new Vector(0, 0);
        let total = 0;
        
        for (let other of boids) {
            const d = this.position.dist(other.position);
            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }
    
    cohesion(boids) {
        const steering = new Vector(0, 0);
        let total = 0;
        
        for (let other of boids) {
            const d = this.position.dist(other.position);
            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.sub(this.position);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }
    
    flock(boids, weights = {}) {
        // Apply Reynolds' rules with configurable weights
        const sep = this.separation(boids);
        const ali = this.alignment(boids);
        const coh = this.cohesion(boids);
        
        // Weight the forces
        sep.mult(weights.separation || 1.5);
        ali.mult(weights.alignment || 1.0);
        coh.mult(weights.cohesion || 1.0);
        
        // Apply forces
        this.acceleration.add(sep);
        this.acceleration.add(ali);
        this.acceleration.add(coh);
    }
    
    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.acceleration.mult(0);
        
        // Update trail
        if (this.maxTrailLength > 0) {
            this.trail.push({ x: this.position.x, y: this.position.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
    }
}
```

### Event-Specific Flock Behaviors

```javascript
// src/animations/boids/EventFlocks.js

export class EventFlockSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.flocks = new Map(); // Multiple flocks for different events
        this.activeFlocks = [];
    }
    
    init() {
        this.createCanvas();
        this.registerEventHandlers();
    }
    
    registerEventHandlers() {
        // Achievement unlocked
        EventBus.on('achievement:unlocked', (data) => {
            this.triggerAchievementFlock(data);
        });
        
        // Level up
        EventBus.on('level:up', (data) => {
            this.triggerLevelUpFlock(data);
        });
        
        // Perfect score
        EventBus.on('quiz:perfect', (data) => {
            this.triggerPerfectScoreFlock(data);
        });
        
        // Streak milestone
        EventBus.on('streak:milestone', (data) => {
            this.triggerStreakFlock(data);
        });
        
        // Mode transitions
        EventBus.on('mode:transitioning', (data) => {
            this.triggerModeTransitionFlock(data);
        });
        
        // Chaos mode special events
        EventBus.on('chaos:triggered', (data) => {
            this.triggerChaosFlock(data);
        });
    }
    
    triggerAchievementFlock({ achievement, position }) {
        const flock = new Flock({
            name: 'achievement',
            duration: 3000,
            boidCount: 20,
            startPosition: position || { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            boidConfig: {
                emoji: '⭐',
                maxSpeed: 6,
                maxForce: 0.2,
                trailLength: 10
            },
            behavior: {
                // Stars burst outward then swirl
                separation: 2.0,
                alignment: 0.5,
                cohesion: 0.8,
                custom: (boid, elapsed) => {
                    // Initial burst
                    if (elapsed < 500) {
                        const burst = Vector.sub(boid.position, this.center);
                        burst.setMag(10);
                        boid.acceleration.add(burst);
                    }
                    
                    // Spiral motion
                    if (elapsed > 500) {
                        const angle = elapsed * 0.002;
                        const spiral = new Vector(
                            Math.cos(angle) * 0.5,
                            Math.sin(angle) * 0.5
                        );
                        boid.acceleration.add(spiral);
                    }
                    
                    // Fade out
                    if (elapsed > 2000) {
                        boid.opacity = Math.max(0, 1 - (elapsed - 2000) / 1000);
                    }
                }
            }
        });
        
        this.activateFlock(flock);
    }
    
    triggerLevelUpFlock({ level, position }) {
        const flock = new Flock({
            name: 'levelup',
            duration: 4000,
            boidCount: 30,
            startPosition: position || { x: window.innerWidth / 2, y: window.innerHeight - 100 },
            boidConfig: {
                emoji: ['🎉', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)],
                maxSpeed: 8,
                maxForce: 0.3,
                trailLength: 15
            },
            behavior: {
                separation: 1.5,
                alignment: 1.0,
                cohesion: 0.5,
                custom: (boid, elapsed) => {
                    // Rise up like fireworks
                    boid.acceleration.add(new Vector(0, -0.3));
                    
                    // Explode at apex
                    if (boid.position.y < window.innerHeight / 3 && !boid.exploded) {
                        boid.exploded = true;
                        boid.velocity.mult(3);
                        boid.velocity.rotate((Math.random() - 0.5) * Math.PI);
                    }
                    
                    // Gravity after explosion
                    if (boid.exploded) {
                        boid.acceleration.add(new Vector(0, 0.2));
                    }
                    
                    // Fade
                    if (elapsed > 2500) {
                        boid.opacity = Math.max(0, 1 - (elapsed - 2500) / 1500);
                    }
                }
            }
        });
        
        this.activateFlock(flock);
    }
    
    triggerPerfectScoreFlock() {
        // Golden butterflies from all corners
        const corners = [
            { x: 0, y: 0 },
            { x: window.innerWidth, y: 0 },
            { x: window.innerWidth, y: window.innerHeight },
            { x: 0, y: window.innerHeight }
        ];
        
        corners.forEach((corner, index) => {
            setTimeout(() => {
                const flock = new Flock({
                    name: `perfect_${index}`,
                    duration: 5000,
                    boidCount: 8,
                    startPosition: corner,
                    boidConfig: {
                        emoji: '🦋',
                        maxSpeed: 4,
                        maxForce: 0.1,
                        trailLength: 20,
                        size: 20
                    },
                    behavior: {
                        separation: 1.0,
                        alignment: 1.5,
                        cohesion: 1.2,
                        target: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                        custom: (boid, elapsed) => {
                            // Gentle wave motion
                            const wave = Math.sin(elapsed * 0.003 + boid.position.x * 0.01) * 0.2;
                            boid.acceleration.add(new Vector(0, wave));
                            
                            // Scale pulse
                            boid.scale = 1 + Math.sin(elapsed * 0.005) * 0.2;
                            
                            // Golden glow
                            boid.glow = true;
                            boid.glowColor = 'gold';
                        }
                    }
                });
                
                this.activateFlock(flock);
            }, index * 200);
        });
    }
    
    triggerStreakFlock({ streak }) {
        // Fire particles that form the streak number
        const flock = new Flock({
            name: 'streak',
            duration: 3500,
            boidCount: Math.min(streak * 5, 50),
            startPosition: { x: 100, y: 100 }, // Near streak counter
            boidConfig: {
                emoji: '🔥',
                maxSpeed: 5,
                maxForce: 0.15,
                trailLength: 8
            },
            behavior: {
                separation: 1.5,
                alignment: 0.8,
                cohesion: 1.0,
                custom: (boid, elapsed, index) => {
                    // Form number shape
                    if (elapsed > 1000 && elapsed < 2500) {
                        const targetPos = this.getNumberPosition(streak, index);
                        const seek = Vector.sub(targetPos, boid.position);
                        seek.setMag(this.maxSpeed);
                        seek.sub(boid.velocity);
                        seek.limit(this.maxForce * 2);
                        boid.acceleration.add(seek);
                    }
                    
                    // Disperse
                    if (elapsed > 2500) {
                        const disperse = Vector.random2D();
                        disperse.mult(0.5);
                        boid.acceleration.add(disperse);
                        boid.opacity = Math.max(0, 1 - (elapsed - 2500) / 1000);
                    }
                }
            }
        });
        
        this.activateFlock(flock);
    }
    
    triggerModeTransitionFlock({ fromMode, toMode }) {
        const transitions = {
            'normal-chaos': {
                emoji: ['😈', '🌪️', '💥'],
                behavior: 'explosive'
            },
            'chaos-zen': {
                emoji: ['🍃', '☮️', '🕉️'],
                behavior: 'calming'
            },
            'zen-speed': {
                emoji: ['⚡', '🚀', '💨'],
                behavior: 'accelerating'
            },
            'speed-normal': {
                emoji: ['📚', '✏️', '🎯'],
                behavior: 'settling'
            }
        };
        
        const transition = transitions[`${fromMode}-${toMode}`] || transitions['normal-chaos'];
        
        const flock = new Flock({
            name: 'mode_transition',
            duration: 1500,
            boidCount: 40,
            startPosition: 'random',
            boidConfig: {
                emoji: () => transition.emoji[Math.floor(Math.random() * transition.emoji.length)],
                maxSpeed: 10,
                maxForce: 0.5,
                trailLength: 5
            },
            behavior: this.getTransitionBehavior(transition.behavior)
        });
        
        this.activateFlock(flock);
    }
    
    triggerChaosFlock({ type }) {
        const chaosTypes = {
            glitch: {
                emoji: ['👾', '🔲', '🔳', '⬛', '⬜'],
                count: 100,
                behavior: 'glitch'
            },
            explosion: {
                emoji: ['💥', '✨', '💫', '⭐'],
                count: 50,
                behavior: 'explode'
            },
            vortex: {
                emoji: ['🌀', '🌪️', '💨'],
                count: 30,
                behavior: 'spiral'
            }
        };
        
        const config = chaosTypes[type] || chaosTypes.glitch;
        
        const flock = new Flock({
            name: `chaos_${type}`,
            duration: 2000,
            boidCount: config.count,
            startPosition: 'mouse', // Start from cursor position
            boidConfig: {
                emoji: () => config.emoji[Math.floor(Math.random() * config.emoji.length)],
                maxSpeed: 15,
                maxForce: 1.0,
                trailLength: 3
            },
            behavior: this.getChaosBehavior(config.behavior)
        });
        
        this.activateFlock(flock);
    }
}

// Flock class that manages a group of boids
class Flock {
    constructor(config) {
        this.name = config.name;
        this.duration = config.duration;
        this.startTime = Date.now();
        this.boids = [];
        this.config = config;
        
        this.createBoids();
    }
    
    createBoids() {
        const { boidCount, startPosition, boidConfig } = this.config;
        
        for (let i = 0; i < boidCount; i++) {
            let pos;
            
            if (startPosition === 'random') {
                pos = {
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight
                };
            } else if (startPosition === 'mouse') {
                // Get from mouse position
                pos = MouseTracker.getPosition();
            } else {
                // Cluster around start position
                pos = {
                    x: startPosition.x + (Math.random() - 0.5) * 50,
                    y: startPosition.y + (Math.random() - 0.5) * 50
                };
            }
            
            const config = { ...boidConfig };
            if (typeof config.emoji === 'function') {
                config.emoji = config.emoji();
            }
            
            const boid = new Boid(pos.x, pos.y, config);
            this.boids.push(boid);
        }
    }
    
    update() {
        const elapsed = Date.now() - this.startTime;
        
        if (elapsed > this.duration) {
            return false; // Flock expired
        }
        
        // Apply flocking behavior
        for (let boid of this.boids) {
            boid.flock(this.boids, this.config.behavior);
            
            // Apply custom behavior
            if (this.config.behavior.custom) {
                this.config.behavior.custom(boid, elapsed, this.boids.indexOf(boid));
            }
            
            // Apply target seeking if defined
            if (this.config.behavior.target) {
                const seek = this.seek(boid, this.config.behavior.target);
                seek.mult(0.5);
                boid.acceleration.add(seek);
            }
            
            boid.update();
            this.edges(boid);
        }
        
        return true; // Flock still active
    }
    
    seek(boid, target) {
        const desired = Vector.sub(target, boid.position);
        desired.setMag(boid.maxSpeed);
        const steering = Vector.sub(desired, boid.velocity);
        steering.limit(boid.maxForce);
        return steering;
    }
    
    edges(boid) {
        // Wrap around edges or bounce
        if (this.config.edgeBehavior === 'bounce') {
            if (boid.position.x < 0 || boid.position.x > window.innerWidth) {
                boid.velocity.x *= -1;
            }
            if (boid.position.y < 0 || boid.position.y > window.innerHeight) {
                boid.velocity.y *= -1;
            }
        } else {
            // Wrap around
            if (boid.position.x < -50) boid.position.x = window.innerWidth + 50;
            if (boid.position.x > window.innerWidth + 50) boid.position.x = -50;
            if (boid.position.y < -50) boid.position.y = window.innerHeight + 50;
            if (boid.position.y > window.innerHeight + 50) boid.position.y = -50;
        }
    }
    
    render(ctx) {
        for (let boid of this.boids) {
            // Draw trail
            if (boid.trail.length > 0) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${boid.opacity * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(boid.trail[0].x, boid.trail[0].y);
                
                for (let point of boid.trail) {
                    ctx.lineTo(point.x, point.y);
                }
                
                ctx.stroke();
            }
            
            // Draw boid
            ctx.save();
            ctx.globalAlpha = boid.opacity;
            ctx.translate(boid.position.x, boid.position.y);
            ctx.rotate(boid.velocity.heading());
            ctx.scale(boid.scale, boid.scale);
            
            if (boid.glow) {
                ctx.shadowColor = boid.glowColor || '#fff';
                ctx.shadowBlur = 20;
            }
            
            ctx.font = `${boid.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(boid.emoji, 0, 0);
            
            ctx.restore();
        }
    }
}
```

## 🎯 Subtle Integration Points

```css
/* Event-triggered canvas styling */
.boids-event-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999; /* Above everything during events */
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
}

.boids-event-canvas.active {
    opacity: 1;
}

/* Mode-specific event styling */
[data-mode="zen"] .boids-event-canvas {
    mix-blend-mode: soft-light;
}

[data-mode="chaos"] .boids-event-canvas {
    mix-blend-mode: screen;
    filter: contrast(1.2);
}

[data-mode="speed"] .boids-event-canvas {
    mix-blend-mode: add;
}
```

## 🎮 Usage Examples

```javascript
// Initialize event system
const boidEvents = new EventFlockSystem();
boidEvents.init();

// Trigger on specific game events
quizEngine.on('quiz:completed', (results) => {
    if (results.score === 100) {
        EventBus.emit('quiz:perfect', {
            score: results.score,
            position: { x: window.innerWidth / 2, y: 300 }
        });
    }
});

// Streak milestones
streakTracker.on('milestone', (streak) => {
    if ([3, 7, 30, 100].includes(streak)) {
        EventBus.emit('streak:milestone', { streak });
    }
});

// Achievement unlocks
achievementSystem.on('unlocked', (achievement) => {
    EventBus.emit('achievement:unlocked', {
        achievement,
        position: getAchievementIconPosition()
    });
});
```

This creates **subtle, meaningful animations** that:
- Only appear during special moments
- Use true boids/flocking behavior
- Match the current mode's aesthetic
- Don't distract from gameplay
- Add celebration and delight to achievements
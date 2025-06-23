/**
 * Herding Game Component
 * A meditative puzzle game that appears as a special card
 * Players guide dots into pens using cursor avoidance and gate logic
 */

class HerdingGame {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.level = parseInt(localStorage.getItem('herdingLevel') || '1');
        this.dots = [];
        this.gates = [];
        this.pen = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.completed = false;
        this.darkMode = false;
        this.timeLimit = 0;
        this.timeRemaining = 0;
        this.specialMechanics = [];
        this.init();
    }

    init() {
        this.createModal();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'herding-modal';
        this.modal.innerHTML = `
            <div class="herding-overlay"></div>
            <div class="herding-content">
                <div class="herding-header">
                    <h3>Mindful Herding</h3>
                    <button class="herding-close" aria-label="Close">×</button>
                    <div class="herding-level">Level <span id="levelDisplay">1</span></div>
                </div>
                <canvas id="herdingCanvas"></canvas>
                <div class="herding-hint">Guide all dots into the pen. Click colored gates to toggle connections.</div>
            </div>
        `;

        document.body.appendChild(this.modal);
        
        // Get canvas reference
        this.canvas = this.modal.querySelector('#herdingCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Attach event listeners
        const closeBtn = this.modal.querySelector('.herding-close');
        closeBtn.addEventListener('click', () => this.close());
        
        const overlay = this.modal.querySelector('.herding-overlay');
        overlay.addEventListener('click', () => this.close());
    }

    open() {
        this.modal.classList.add('active');
        this.setupCanvas();
        this.startGame();
        this.updateLevelDisplay();
    }

    close() {
        this.modal.classList.remove('active');
        this.stopGame();
        
        // Award rewards if completed
        if (this.completed) {
            this.awardRewards();
        }
    }

    setupCanvas() {
        // Set canvas size
        const content = this.modal.querySelector('.herding-content');
        this.canvas.width = Math.max(345, content.offsetWidth - 40); // 385px modal - 40px padding
        this.canvas.height = 450; // Fixed height for consistent gameplay
        
        // Mouse tracking
        this.canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
        this.canvas.addEventListener('touchstart', (e) => this.updateMouse(e));
        this.canvas.addEventListener('touchmove', (e) => this.updateMouse(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    updateMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches) {
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
        } else {
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Check gate clicks
        this.gates.forEach(gate => {
            if (!gate.clickable || !gate.open) return;
            
            const padding = 20;
            const hit = gate.width > gate.height ?
                clickX > gate.x - gate.width/2 - padding &&
                clickX < gate.x + gate.width/2 + padding &&
                clickY > gate.y - padding &&
                clickY < gate.y + padding :
                clickX > gate.x - padding &&
                clickX < gate.x + padding &&
                clickY > gate.y - gate.height/2 - padding &&
                clickY < gate.y + gate.height/2 + padding;
            
            if (hit) {
                gate.open = false;
                if (gate.linkedTo) {
                    const linked = this.gates.find(g => g.id === gate.linkedTo);
                    if (linked) linked.open = true;
                }
            }
        });
    }

    startGame() {
        this.completed = false;
        this.dots = [];
        this.gates = [];
        
        // Setup level
        this.setupLevel(this.level);
        
        // Start animation
        this.animate();
    }

    setupLevel(level) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Pen always in the same spot
        this.pen = {
            x: w * 0.65,
            y: h * 0.5,
            width: 140,
            height: level === 1 ? 160 : 120  // Larger for level 1
        };
        
        if (level === 1) {
            // Simple - one gate
            this.gates = [{
                id: 'main',
                x: this.pen.x - this.pen.width/2,  // Exactly on the left wall
                y: this.pen.y,
                width: 3,
                height: 50,
                open: true,
                clickable: false,
                color: 'rgba(88, 204, 2, 0.6)'
            }];
            
            // Fewer dots for level 1
            this.createDots(5);
            
        } else if (level === 2) {
            // Gate puzzle - closing one opens another
            this.gates = [
                {
                    id: 'main',
                    x: this.pen.x - this.pen.width/2,
                    y: this.pen.y,
                    width: 3,
                    height: 50,
                    open: true,
                    clickable: false,
                    color: 'rgba(88, 204, 2, 0.6)',
                    label: 'Entry Gate'
                },
                {
                    id: 'back',
                    x: this.pen.x + this.pen.width/2,
                    y: this.pen.y,
                    width: 3,
                    height: 50,
                    open: false,
                    clickable: true,
                    linkedTo: 'main',
                    color: 'rgba(28, 176, 246, 0.6)',
                    label: 'Exit Gate (Click me!)'
                }
            ];
            
            this.createDots(8);
            
            // Update hint for level 2
            const hint = this.modal.querySelector('.herding-hint');
            hint.textContent = 'Blue gate is clickable! Click to swap which gate is open.';
            
        } else {
            // Complex - chain of gates
            this.gates = [
                {
                    id: 'main',
                    x: this.pen.x - 60,
                    y: this.pen.y,
                    width: 3,
                    height: 50,
                    open: true,
                    clickable: false,
                    color: 'rgba(88, 204, 2, 0.6)'
                },
                {
                    id: 'back',
                    x: this.pen.x + 60,
                    y: this.pen.y,
                    width: 3,
                    height: 50,
                    open: false,
                    clickable: true,
                    linkedTo: 'main',
                    color: 'rgba(28, 176, 246, 0.6)'
                },
                {
                    id: 'top',
                    x: this.pen.x,
                    y: this.pen.y - 50,
                    width: 50,
                    height: 3,
                    open: false,
                    clickable: true,
                    linkedTo: 'back',
                    color: 'rgba(255, 107, 107, 0.6)'
                }
            ];
            
            this.createDots(10, true); // Include loner
        }
        
        // Add special mechanics based on level
        if (level >= 4) {
            this.darkMode = true;
            const hint = this.modal.querySelector('.herding-hint');
            hint.textContent = 'Dark Mode: Use your light to find the sheep!';
        }
    }

    createDots(count, includeLoner = false) {
        this.dots = [];
        
        if (includeLoner) {
            this.dots.push(new HerdingDot(
                this.canvas.width * 0.2,
                this.canvas.height * 0.5,
                true // isLoner
            ));
            count--;
        }
        
        for (let i = 0; i < count; i++) {
            this.dots.push(new HerdingDot(
                this.canvas.width * 0.2 + Math.random() * 100,
                this.canvas.height * 0.5 + (Math.random() - 0.5) * 200
            ));
        }
    }

    checkWinCondition() {
        const allIn = this.dots.every(dot => dot.isInPen(this.pen));
        const requiredGatesClosed = this.level > 1 ? 
            this.gates.filter(g => g.clickable).every(g => !g.open) : true;
        
        if (allIn && requiredGatesClosed && !this.completed) {
            this.completed = true;
            this.showSuccess();
        }
    }

    showSuccess() {
        setTimeout(() => {
            const hint = this.modal.querySelector('.herding-hint');
            hint.innerHTML = '✨ Perfect! You gathered them all! ✨';
            hint.style.color = '#58cc02';
            
            // Level up!
            this.level++;
            localStorage.setItem('herdingLevel', this.level.toString());
            
            // Show level up message
            setTimeout(() => {
                hint.innerHTML = `🎉 Level ${this.level} Unlocked! 🎉`;
                
                // Auto advance to next level
                setTimeout(() => {
                    this.startGame();
                    this.updateLevelDisplay();
                }, 1500);
            }, 1000);
        }, 500);
    }
    
    updateLevelDisplay() {
        const levelDisplay = this.modal.querySelector('#levelDisplay');
        if (levelDisplay) {
            levelDisplay.textContent = this.level;
        }
    }

    awardRewards() {
        // Use scoring engine to award rewards
        const rewards = ScoringEngine.applyReward(0, 2, 50); // 2 gems, 50 XP
        
        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('statsUpdated', {
            detail: rewards
        }));
        
        // Track completion
        const completed = JSON.parse(localStorage.getItem('herdingCompleted') || '[]');
        completed.push(new Date().toDateString());
        localStorage.setItem('herdingCompleted', JSON.stringify(completed));
    }

    animate() {
        // Clear with trails
        this.ctx.fillStyle = 'rgba(15, 27, 32, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pen and gates
        this.drawPen();
        
        // Update and draw dots
        this.dots.forEach(dot => {
            dot.update(this.mouseX, this.mouseY, this.dots, this.gates, this.canvas, this.pen);
            dot.draw(this.ctx);
        });
        
        // Draw cursor
        this.drawCursor();
        
        // Apply dark mode if active
        if (this.darkMode) {
            this.drawDarkness();
        }
        
        // Check win
        this.checkWinCondition();
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    drawDarkness() {
        const ctx = this.ctx;
        
        // Save current state
        ctx.save();
        
        // Fill with darkness
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Cut out vision circle
        ctx.globalCompositeOperation = 'destination-out';
        const gradient = ctx.createRadialGradient(
            this.mouseX, this.mouseY, 0,
            this.mouseX, this.mouseY, 100
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Restore
        ctx.restore();
    }

    drawPen() {
        const ctx = this.ctx;
        
        // Pen outline (draw in segments to skip gates)
        const penLeft = this.pen.x - this.pen.width/2;
        const penRight = this.pen.x + this.pen.width/2;
        const penTop = this.pen.y - this.pen.height/2;
        const penBottom = this.pen.y + this.pen.height/2;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw pen walls, but skip where gates are
        ctx.beginPath();
        
        // Top wall
        ctx.moveTo(penLeft, penTop);
        ctx.lineTo(penRight, penTop);
        
        // Right wall
        ctx.moveTo(penRight, penTop);
        ctx.lineTo(penRight, penBottom);
        
        // Bottom wall
        ctx.moveTo(penRight, penBottom);
        ctx.lineTo(penLeft, penBottom);
        
        // Left wall (with gap for gate)
        const leftGate = this.gates.find(g => Math.abs(g.x - penLeft) < 5);
        if (leftGate && leftGate.open) {
            // Draw wall segments around gate
            ctx.moveTo(penLeft, penBottom);
            ctx.lineTo(penLeft, leftGate.y + leftGate.height/2);
            ctx.moveTo(penLeft, leftGate.y - leftGate.height/2);
            ctx.lineTo(penLeft, penTop);
        } else {
            // Draw full wall
            ctx.moveTo(penLeft, penBottom);
            ctx.lineTo(penLeft, penTop);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw gates
        this.gates.forEach(gate => {
            if (gate.open) {
                ctx.strokeStyle = gate.color;
                ctx.lineWidth = 4;
                
                if (gate.width > gate.height) {
                    ctx.beginPath();
                    ctx.moveTo(gate.x - gate.width/2, gate.y);
                    ctx.lineTo(gate.x + gate.width/2, gate.y);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(gate.x, gate.y - gate.height/2);
                    ctx.lineTo(gate.x, gate.y + gate.height/2);
                    ctx.stroke();
                }
                
                // Clickable indicator - make it pulse!
                if (gate.clickable) {
                    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
                    ctx.beginPath();
                    ctx.arc(gate.x, gate.y, 12, 0, Math.PI * 2);
                    ctx.fillStyle = gate.color.replace('0.6', pulse.toString());
                    ctx.fill();
                    
                    // Add "CLICK" text
                    ctx.fillStyle = 'white';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('CLICK', gate.x, gate.y + 25);
                }
            } else {
                // Closed gate
                ctx.fillStyle = gate.color.replace('0.6', '0.8');
                if (gate.width > gate.height) {
                    ctx.fillRect(gate.x - gate.width/2, gate.y - 8, gate.width, 16);
                } else {
                    ctx.fillRect(gate.x - 8, gate.y - gate.height/2, 16, gate.height);
                }
            }
        });
        
        // Success glow
        if (this.completed) {
            const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(88, 204, 2, ${pulse})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.rect(
                this.pen.x - this.pen.width/2 - 10,
                this.pen.y - this.pen.height/2 - 10,
                this.pen.width + 20,
                this.pen.height + 20
            );
            ctx.stroke();
        }
    }

    drawCursor() {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(this.mouseX, this.mouseY, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }

    stopGame() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// Dot class for herding game
class HerdingDot {
    constructor(x, y, isLoner = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = isLoner ? 5 : 4;
        this.isLoner = isLoner;
        this.avoidDistance = isLoner ? 120 : 100;
        this.maxSpeed = isLoner ? 2.5 : 3;
        this.color = isLoner ? 'rgba(255, 200, 100, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    }

    update(mouseX, mouseY, dots, gates, canvas, pen) {
        // Avoid cursor
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.avoidDistance && distance > 0) {
            const force = (this.avoidDistance - distance) / this.avoidDistance;
            const angle = Math.atan2(dy, dx);
            this.vx -= Math.cos(angle) * force * 2;
            this.vy -= Math.sin(angle) * force * 2;
        }
        
        // Flocking for non-loners
        if (!this.isLoner) {
            let separation = { x: 0, y: 0 };
            let neighbors = 0;
            
            for (let other of dots) {
                if (other === this || other.isLoner) continue;
                
                const odx = other.x - this.x;
                const ody = other.y - this.y;
                const odist = Math.sqrt(odx * odx + ody * ody);
                
                if (odist < 25 && odist > 0) {
                    separation.x -= odx / odist;
                    separation.y -= ody / odist;
                    neighbors++;
                }
            }
            
            if (neighbors > 0) {
                this.vx += separation.x * 0.15;
                this.vy += separation.y * 0.15;
            }
        }
        
        // Friction
        this.vx *= 0.92;
        this.vy *= 0.92;
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls with more force
        const wallBounce = 0.8; // Stronger bounce
        const wallPadding = this.radius + 5; // Keep dots away from edges
        
        if (this.x < wallPadding) {
            this.x = wallPadding;
            this.vx = Math.abs(this.vx) * wallBounce;
        } else if (this.x > canvas.width - wallPadding) {
            this.x = canvas.width - wallPadding;
            this.vx = -Math.abs(this.vx) * wallBounce;
        }
        
        if (this.y < wallPadding) {
            this.y = wallPadding;
            this.vy = Math.abs(this.vy) * wallBounce;
        } else if (this.y > canvas.height - wallPadding) {
            this.y = canvas.height - wallPadding;
            this.vy = -Math.abs(this.vy) * wallBounce;
        }
        
        // Gate collisions
        gates.forEach(gate => {
            if (gate.open) return;
            
            if (gate.width > gate.height) {
                // Horizontal gate
                const gateLeft = gate.x - gate.width/2;
                const gateRight = gate.x + gate.width/2;
                const gateTop = gate.y - 10;
                const gateBottom = gate.y + 10;
                
                if (this.x > gateLeft && this.x < gateRight &&
                    this.y + this.radius > gateTop && this.y - this.radius < gateBottom) {
                    if (this.vy > 0) {
                        this.y = gateTop - this.radius;
                        this.vy = -Math.abs(this.vy) * 0.5;
                    } else {
                        this.y = gateBottom + this.radius;
                        this.vy = Math.abs(this.vy) * 0.5;
                    }
                }
            } else {
                // Vertical gate
                const gateTop = gate.y - gate.height/2;
                const gateBottom = gate.y + gate.height/2;
                const gateLeft = gate.x - 10;
                const gateRight = gate.x + 10;
                
                if (this.y > gateTop && this.y < gateBottom &&
                    this.x + this.radius > gateLeft && this.x - this.radius < gateRight) {
                    if (this.vx > 0) {
                        this.x = gateLeft - this.radius;
                        this.vx = -Math.abs(this.vx) * 0.5;
                    } else {
                        this.x = gateRight + this.radius;
                        this.vx = Math.abs(this.vx) * 0.5;
                    }
                }
            }
        });
        
        // Pen wall collisions (solid except at open gates)
        if (pen) {
            const penLeft = pen.x - pen.width/2;
            const penRight = pen.x + pen.width/2;
            const penTop = pen.y - pen.height/2;
            const penBottom = pen.y + pen.height/2;
            
            // Get dot bounds
            const dotLeft = this.x - this.radius;
            const dotRight = this.x + this.radius;
            const dotTop = this.y - this.radius;
            const dotBottom = this.y + this.radius;
            
            // Check each wall for collision
            // Left wall
            if (dotRight > penLeft && dotLeft < penLeft && 
                dotBottom > penTop && dotTop < penBottom) {
                // Check if there's an open gate at this position
                let inGate = false;
                gates.forEach(gate => {
                    if (gate.open && Math.abs(gate.x - penLeft) < 5 && 
                        this.y > gate.y - gate.height/2 - this.radius && 
                        this.y < gate.y + gate.height/2 + this.radius) {
                        inGate = true;
                    }
                });
                if (!inGate) {
                    this.x = penLeft - this.radius;
                    this.vx = -Math.abs(this.vx) * 0.5;
                }
            }
            
            // Right wall
            if (dotLeft < penRight && dotRight > penRight && 
                dotBottom > penTop && dotTop < penBottom) {
                let inGate = false;
                gates.forEach(gate => {
                    if (gate.open && Math.abs(gate.x - penRight) < 5 && 
                        this.y > gate.y - gate.height/2 - this.radius && 
                        this.y < gate.y + gate.height/2 + this.radius) {
                        inGate = true;
                    }
                });
                if (!inGate) {
                    this.x = penRight + this.radius;
                    this.vx = Math.abs(this.vx) * 0.5;
                }
            }
            
            // Top wall
            if (dotBottom > penTop && dotTop < penTop && 
                dotRight > penLeft && dotLeft < penRight) {
                let inGate = false;
                gates.forEach(gate => {
                    if (gate.open && Math.abs(gate.y - penTop) < 5 && 
                        this.x > gate.x - gate.width/2 - this.radius && 
                        this.x < gate.x + gate.width/2 + this.radius) {
                        inGate = true;
                    }
                });
                if (!inGate) {
                    this.y = penTop - this.radius;
                    this.vy = -Math.abs(this.vy) * 0.5;
                }
            }
            
            // Bottom wall
            if (dotTop < penBottom && dotBottom > penBottom && 
                dotRight > penLeft && dotLeft < penRight) {
                let inGate = false;
                gates.forEach(gate => {
                    if (gate.open && Math.abs(gate.y - penBottom) < 5 && 
                        this.x > gate.x - gate.width/2 - this.radius && 
                        this.x < gate.x + gate.width/2 + this.radius) {
                        inGate = true;
                    }
                });
                if (!inGate) {
                    this.y = penBottom + this.radius;
                    this.vy = Math.abs(this.vy) * 0.5;
                }
            }
        }
    }

    isInPen(pen) {
        return this.x > pen.x - pen.width/2 + this.radius && 
               this.x < pen.x + pen.width/2 - this.radius &&
               this.y > pen.y - pen.height/2 + this.radius && 
               this.y < pen.y + pen.height/2 - this.radius;
    }

    draw(ctx) {
        // Glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = this.isLoner ? 'rgba(255, 200, 100, 0.1)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        
        // Main dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// Create global instance
window.herdingGame = new HerdingGame();
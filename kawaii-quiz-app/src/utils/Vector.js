/**
 * Vector - 2D vector math utility for animations
 * Used by boids/flocking system and other physics-based animations
 */
export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Create a random 2D vector
     */
    static random2D() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
    
    /**
     * Create vector from angle
     */
    static fromAngle(angle) {
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
    
    /**
     * Add two vectors
     */
    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }
    
    /**
     * Subtract two vectors
     */
    static sub(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }
    
    /**
     * Multiply vector by scalar
     */
    static mult(v, n) {
        return new Vector(v.x * n, v.y * n);
    }
    
    /**
     * Divide vector by scalar
     */
    static div(v, n) {
        return new Vector(v.x / n, v.y / n);
    }
    
    /**
     * Distance between two vectors
     */
    static dist(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Dot product
     */
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }
    
    /**
     * Linear interpolation
     */
    static lerp(v1, v2, amt) {
        return new Vector(
            v1.x + (v2.x - v1.x) * amt,
            v1.y + (v2.y - v1.y) * amt
        );
    }
    
    /**
     * Instance methods
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    
    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }
    
    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }
    
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    magSq() {
        return this.x * this.x + this.y * this.y;
    }
    
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }
    
    setMag(n) {
        this.normalize();
        this.mult(n);
        return this;
    }
    
    limit(max) {
        if (this.magSq() > max * max) {
            this.setMag(max);
        }
        return this;
    }
    
    heading() {
        return Math.atan2(this.y, this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }
    
    dist(v) {
        return Vector.dist(this, v);
    }
    
    dot(v) {
        return Vector.dot(this, v);
    }
    
    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this;
    }
    
    copy() {
        return new Vector(this.x, this.y);
    }
    
    toString() {
        return `Vector(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}
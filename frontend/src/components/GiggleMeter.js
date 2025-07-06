/**
 * Giggle Meter Component
 * Interactive rating slider for jokes with emoji feedback
 */

class GiggleMeter {
    constructor() {
        this.element = null;
        this.value = 50; // 0-100 scale
        this.onRatingChange = null;
        this.emojis = [
            { value: 0, emoji: '😠', label: 'Angry' },
            { value: 20, emoji: '😑', label: 'Meh' },
            { value: 40, emoji: '😐', label: 'OK' },
            { value: 60, emoji: '😊', label: 'Good' },
            { value: 80, emoji: '😄', label: 'Funny' },
            { value: 100, emoji: '🤣', label: 'LOL' }
        ];
    }
    
    create(container, options = {}) {
        this.onRatingChange = options.onRatingChange || null;
        
        // Create meter structure
        this.element = document.createElement('div');
        this.element.className = 'giggle-meter';
        this.element.innerHTML = `
            <div class="giggle-meter-label">Giggle Meter</div>
            <div class="giggle-meter-container">
                <div class="emoji-track">
                    ${this.emojis.map((item, index) => `
                        <div class="emoji-marker" data-value="${item.value}" style="left: ${item.value}%">
                            <span class="emoji">${item.emoji}</span>
                            <span class="emoji-label">${item.label}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="slider-container">
                    <input type="range" 
                           class="giggle-slider" 
                           min="0" 
                           max="100" 
                           value="${this.value}"
                           step="1">
                    <div class="slider-track">
                        <div class="slider-fill" style="width: ${this.value}%"></div>
                    </div>
                </div>
                <div class="current-rating">
                    <span class="rating-emoji">${this.getEmojiForValue(this.value)}</span>
                    <span class="rating-text">${this.getLabelForValue(this.value)}</span>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Attach event listeners
        const slider = this.element.querySelector('.giggle-slider');
        const fill = this.element.querySelector('.slider-fill');
        const currentEmoji = this.element.querySelector('.rating-emoji');
        const currentText = this.element.querySelector('.rating-text');
        
        slider.addEventListener('input', (e) => {
            this.value = parseInt(e.target.value);
            
            // Update visual state
            fill.style.width = `${this.value}%`;
            currentEmoji.textContent = this.getEmojiForValue(this.value);
            currentText.textContent = this.getLabelForValue(this.value);
            
            // Highlight nearest emoji
            this.highlightNearestEmoji(this.value);
            
            // Callback
            if (this.onRatingChange) {
                this.onRatingChange(this.value);
            }
        });
        
        // Click on emojis to jump to value
        this.element.querySelectorAll('.emoji-marker').forEach(marker => {
            marker.addEventListener('click', () => {
                const targetValue = parseInt(marker.dataset.value);
                slider.value = targetValue;
                slider.dispatchEvent(new Event('input'));
            });
        });
        
        container.appendChild(this.element);
        
        // Initial highlight
        this.highlightNearestEmoji(this.value);
        
        return this.element;
    }
    
    getEmojiForValue(value) {
        // Find the closest emoji
        let closest = this.emojis[0];
        let minDiff = Math.abs(value - closest.value);
        
        for (const item of this.emojis) {
            const diff = Math.abs(value - item.value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        }
        
        return closest.emoji;
    }
    
    getLabelForValue(value) {
        // Find the closest label
        let closest = this.emojis[0];
        let minDiff = Math.abs(value - closest.value);
        
        for (const item of this.emojis) {
            const diff = Math.abs(value - item.value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        }
        
        return closest.label;
    }
    
    highlightNearestEmoji(value) {
        // Remove all highlights
        this.element.querySelectorAll('.emoji-marker').forEach(marker => {
            marker.classList.remove('active');
        });
        
        // Find and highlight nearest
        let nearestMarker = null;
        let minDiff = Infinity;
        
        this.element.querySelectorAll('.emoji-marker').forEach(marker => {
            const markerValue = parseInt(marker.dataset.value);
            const diff = Math.abs(value - markerValue);
            if (diff < minDiff) {
                minDiff = diff;
                nearestMarker = marker;
            }
        });
        
        if (nearestMarker) {
            nearestMarker.classList.add('active');
        }
    }
    
    getValue() {
        return this.value;
    }
    
    getRating() {
        // Convert 0-100 to 1-5 star rating
        return Math.ceil(this.value / 20);
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
    
    addStyles() {
        if (document.getElementById('giggle-meter-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'giggle-meter-styles';
        style.textContent = `
            .giggle-meter {
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
                margin: 20px 0;
            }
            
            .giggle-meter-label {
                text-align: center;
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 20px;
            }
            
            .giggle-meter-container {
                position: relative;
                padding: 40px 0 20px;
            }
            
            .emoji-track {
                position: relative;
                height: 60px;
                margin-bottom: 20px;
            }
            
            .emoji-marker {
                position: absolute;
                top: 0;
                transform: translateX(-50%);
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .emoji-marker:hover {
                transform: translateX(-50%) scale(1.1);
            }
            
            .emoji-marker.active {
                transform: translateX(-50%) scale(1.2);
            }
            
            .emoji-marker .emoji {
                display: block;
                font-size: 32px;
                margin-bottom: 4px;
                transition: all 0.2s ease;
            }
            
            .emoji-marker.active .emoji {
                font-size: 40px;
            }
            
            .emoji-label {
                font-size: 12px;
                color: var(--text-secondary);
                opacity: 0.7;
            }
            
            .emoji-marker.active .emoji-label {
                opacity: 1;
                font-weight: 600;
            }
            
            .slider-container {
                position: relative;
                margin: 0 20px;
            }
            
            .giggle-slider {
                width: 100%;
                height: 40px;
                -webkit-appearance: none;
                appearance: none;
                background: transparent;
                cursor: pointer;
                position: relative;
                z-index: 2;
            }
            
            .giggle-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 24px;
                height: 24px;
                background: var(--primary);
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
            }
            
            .giggle-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 4px 12px rgba(88, 204, 2, 0.4);
            }
            
            .giggle-slider::-moz-range-thumb {
                width: 24px;
                height: 24px;
                background: var(--primary);
                border-radius: 50%;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
            }
            
            .giggle-slider::-moz-range-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 4px 12px rgba(88, 204, 2, 0.4);
            }
            
            .slider-track {
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                transform: translateY(-50%);
                pointer-events: none;
            }
            
            .slider-fill {
                height: 100%;
                background: linear-gradient(90deg, #ff4b4b 0%, #ffd700 50%, #58cc02 100%);
                border-radius: 4px;
                transition: width 0.1s ease;
            }
            
            .current-rating {
                text-align: center;
                margin-top: 20px;
            }
            
            .rating-emoji {
                font-size: 48px;
                display: block;
                margin-bottom: 8px;
            }
            
            .rating-text {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for use
window.GiggleMeter = GiggleMeter;
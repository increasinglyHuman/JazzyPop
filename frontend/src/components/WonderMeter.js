/**
 * Wonder Meter Component
 * A universal rating system for factoids that measures wonder/amazement
 */

class WonderMeter {
    constructor() {
        this.value = 50; // 0-100 scale
        this.onRatingCallback = null;
        this.emojis = [
            { value: 0, emoji: '🤔', label: 'Huh?' },
            { value: 100, emoji: '😎', label: 'Cool!' }
        ];
    }

    create(onRating) {
        this.onRatingCallback = onRating;
        
        const container = document.createElement('div');
        container.className = 'wonder-meter-container';
        
        container.innerHTML = `
            <div class="wonder-meter-content">
                <div class="wonder-meter-label">Wonder Meter</div>
                <div class="wonder-meter-slider-container">
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
                               class="wonder-slider" 
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
                <button class="wonder-meter-continue" id="wonderContinue">
                    Rate & Continue ➡️
                </button>
            </div>
        `;
        
        // Add event listeners
        const slider = container.querySelector('.wonder-slider');
        const fill = container.querySelector('.slider-fill');
        const currentEmoji = container.querySelector('.rating-emoji');
        const currentText = container.querySelector('.rating-text');
        
        slider.addEventListener('input', (e) => {
            this.value = parseInt(e.target.value);
            
            // Update visual state
            fill.style.width = `${this.value}%`;
            currentEmoji.textContent = this.getEmojiForValue(this.value);
            currentText.textContent = this.getLabelForValue(this.value);
            
            // Highlight nearest emoji
            this.highlightNearestEmoji(this.value);
        });
        
        // Continue button
        const continueBtn = container.querySelector('#wonderContinue');
        continueBtn.addEventListener('click', () => {
            if (this.onRatingCallback) {
                this.onRatingCallback(this.value);
            }
        });
        
        return container;
    }
    
    getEmojiForValue(value) {
        // Find the closest emoji
        let closest = this.emojis[0];
        for (const item of this.emojis) {
            if (value >= item.value) {
                closest = item;
            }
        }
        return closest.emoji;
    }
    
    getLabelForValue(value) {
        // Find the closest label
        let closest = this.emojis[0];
        for (const item of this.emojis) {
            if (value >= item.value) {
                closest = item;
            }
        }
        return closest.label;
    }
    
    highlightNearestEmoji(value) {
        const markers = document.querySelectorAll('.emoji-marker');
        markers.forEach(marker => {
            const markerValue = parseInt(marker.dataset.value);
            if (Math.abs(value - markerValue) < 10) {
                marker.classList.add('active');
            } else {
                marker.classList.remove('active');
            }
        });
    }
    
    reset() {
        this.rating = 0;
        this.updateStarDisplay(0);
        
        const feedbackEl = document.querySelector('#wonderFeedback');
        if (feedbackEl) {
            feedbackEl.classList.remove('show');
            feedbackEl.innerHTML = '';
        }
        
        const continueBtn = document.querySelector('#wonderContinue');
        if (continueBtn) {
            continueBtn.style.display = 'none';
        }
        
        // Re-enable stars
        const stars = document.querySelectorAll('.wonder-star');
        stars.forEach(star => {
            star.disabled = false;
        });
    }
}

// Export for use in other components
window.WonderMeter = WonderMeter;
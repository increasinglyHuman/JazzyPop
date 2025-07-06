/**
 * Universal Card Component
 * Flexible card system for promoting quizzes, competitions, merchandise, etc.
 */

class Card {
    constructor(config) {
        this.id = config.id;
        this.type = config.type; // 'quiz', 'competition', 'merchandise', 'announcement', 'quest'
        this.data = config.data;
        this.element = null;
        this.onClick = config.onClick || (() => {});
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = `card card-${this.type}`;
        this.element.setAttribute('data-card-id', this.id);
        
        // Card structure based on type
        this.element.innerHTML = this.getCardTemplate();
        
        // Add click handler
        this.element.addEventListener('click', () => this.handleClick());
        
        return this.element;
    }

    getCardTemplate() {
        const templates = {
            quiz: this.getQuizTemplate(),
            competition: this.getCompetitionTemplate(),
            merchandise: this.getMerchandiseTemplate(),
            announcement: this.getAnnouncementTemplate(),
            quest: this.getQuestTemplate()
        };
        
        return templates[this.type] || this.getDefaultTemplate();
    }

    getQuizTemplate() {
        const { title, description, metadata, rewards, icon, actionText } = this.data;
        return `
            <div class="card-header">
                <div class="card-icon">${icon || '🎯'}</div>
                <div class="card-badges">
                    ${this.renderBadges(metadata)}
                </div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${description}</p>
                ${metadata?.details ? `<div class="card-details">${metadata.details}</div>` : ''}
            </div>
            <div class="card-footer">
                ${rewards ? `
                    <div class="card-rewards">
                        ${this.renderRewards(rewards)}
                    </div>
                ` : ''}
                <button class="card-action">${actionText || 'Start'}</button>
            </div>
        `;
    }

    renderBadges(metadata) {
        if (!metadata?.badges) return '';
        return metadata.badges.map(badge => 
            `<span class="badge badge-${badge.type}">${badge.icon || ''} ${badge.text}</span>`
        ).join('');
    }

    renderRewards(rewards) {
        return rewards.map(reward => 
            `<span class="reward-item">
                <span class="reward-icon">${reward.icon}</span>
                <span class="reward-value">${reward.value}</span>
            </span>`
        ).join('');
    }

    getCompetitionTemplate() {
        const { title, description, prize, endTime, participants, icon } = this.data;
        return `
            <div class="card-header card-header-competition">
                <div class="card-icon">${icon || '🏆'}</div>
                <div class="card-timer" data-end-time="${endTime}">
                    <span class="timer-label">Ends in</span>
                    <span class="timer-value">--:--:--</span>
                </div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${description}</p>
                <div class="competition-stats">
                    <span class="stat-item">👥 ${participants} competing</span>
                    <span class="stat-item">🎁 ${prize}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="card-action card-action-primary">Join Competition</button>
            </div>
        `;
    }

    getMerchandiseTemplate() {
        const { title, description, price, image, discount, icon } = this.data;
        return `
            <div class="card-header card-header-merch">
                ${discount ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                <img src="${image}" alt="${title}" class="merch-image">
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${description}</p>
            </div>
            <div class="card-footer">
                <div class="price-container">
                    ${discount ? `<span class="price-original">$${price}</span>` : ''}
                    <span class="price-current">$${discount ? (price * (1 - discount/100)).toFixed(2) : price}</span>
                </div>
                <button class="card-action">View Item</button>
            </div>
        `;
    }

    getAnnouncementTemplate() {
        const { title, description, actionText, importance, icon } = this.data;
        return `
            <div class="card-header card-header-announcement importance-${importance || 'normal'}">
                <div class="card-icon">${icon || '📢'}</div>
                ${importance === 'high' ? '<span class="badge badge-new">NEW</span>' : ''}
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${description}</p>
            </div>
            ${actionText ? `
                <div class="card-footer">
                    <button class="card-action">${actionText}</button>
                </div>
            ` : ''}
        `;
    }

    getQuestTemplate() {
        const { title, description, objectives, reward, progress, icon } = this.data;
        const progressPercent = progress ? (progress.current / progress.total) * 100 : 0;
        
        return `
            <div class="card-header card-header-quest">
                <div class="card-icon">${icon || '🗺️'}</div>
                <div class="quest-reward">
                    <span class="reward-icon">💎</span>
                    <span class="reward-value">${reward}</span>
                </div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${description}</p>
                ${objectives ? `
                    <ul class="quest-objectives">
                        ${objectives.map(obj => `
                            <li class="${obj.completed ? 'completed' : ''}">
                                ${obj.completed ? '✅' : '⭕'} ${obj.text}
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
                ${progress ? `
                    <div class="quest-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${progress.current}/${progress.total}</span>
                    </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <button class="card-action">${progressPercent === 100 ? 'Claim Reward' : 'View Quest'}</button>
            </div>
        `;
    }

    getDefaultTemplate() {
        const { title, description, icon, actionText } = this.data;
        return `
            <div class="card-header">
                <div class="card-icon">${icon || '📦'}</div>
            </div>
            <div class="card-body">
                <h3 class="card-title">${title || 'Untitled'}</h3>
                <p class="card-description">${description || ''}</p>
            </div>
            <div class="card-footer">
                <button class="card-action">${actionText || 'Learn More'}</button>
            </div>
        `;
    }

    handleClick() {
        // Add click animation
        this.element.classList.add('card-clicked');
        setTimeout(() => {
            this.element.classList.remove('card-clicked');
        }, 200);
        
        // Call the onClick handler with card data
        this.onClick({
            id: this.id,
            type: this.type,
            data: this.data
        });
    }

    update(newData) {
        this.data = { ...this.data, ...newData };
        if (this.element) {
            this.element.innerHTML = this.getCardTemplate();
        }
    }

    startTimer(endTime) {
        if (this.type !== 'competition') return;
        
        const timerElement = this.element.querySelector('.timer-value');
        if (!timerElement) return;
        
        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;
            
            if (diff <= 0) {
                timerElement.textContent = 'Ended';
                clearInterval(this.timerInterval);
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timerElement.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.element) {
            this.element.remove();
        }
    }
}

// Card Manager to handle collections of cards
class CardManager {
    constructor(container) {
        this.container = container;
        this.cards = new Map();
    }

    addCard(config) {
        const card = new Card({
            ...config,
            onClick: (cardData) => this.handleCardClick(cardData)
        });
        
        this.cards.set(config.id, card);
        this.container.appendChild(card.render());
        
        // Start timer if needed
        if (config.type === 'competition' && config.data.endTime) {
            card.startTimer(config.data.endTime);
        }
        
        return card;
    }

    removeCard(id) {
        const card = this.cards.get(id);
        if (card) {
            card.destroy();
            this.cards.delete(id);
        }
    }

    handleCardClick(cardData) {
        // Emit event for the main app to handle navigation
        window.dispatchEvent(new CustomEvent('cardClicked', { 
            detail: cardData 
        }));
    }

    clear() {
        this.cards.forEach(card => card.destroy());
        this.cards.clear();
        this.container.innerHTML = '';
    }
}

// Export for use
window.Card = Card;
window.CardManager = CardManager;
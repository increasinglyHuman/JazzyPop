/**
 * Enhanced Generic Card Component
 * Includes new economy display system with cost bar, event badges, and rewards footer
 */

class GenericCardEnhanced {
    constructor(config) {
        this.id = config.id;
        this.type = config.type || 'default';
        this.theme = config.theme || 'standard';
        this.layout = config.layout || 'vertical';
        this.priority = config.priority;
        this.data = config.data || {};
        this.economics = config.economics || null;
        this.events = config.events || []; // Active events affecting this card
        this.component = config.component;
        this.componentConfig = config.componentConfig || {};
        this.element = null;
        this.onAction = config.onAction || (() => {});
        
        // Get economy manager reference
        this.economyManager = window.economyManager || null;
    }

    render() {
        this.element = document.createElement('div');
        const classes = ['generic-card', 'card'];
        if (this.theme) classes.push(`theme-${this.theme}`);
        if (this.layout) classes.push(`layout-${this.layout}`);
        if (this.priority) classes.push(`priority-${this.priority}`);
        
        // Add locked class if can't afford
        if (!this.checkAffordability()) {
            classes.push('economy-locked');
        }
        
        this.element.className = classes.join(' ');
        this.element.setAttribute('data-card-id', this.id);
        
        // Build card with new structure
        this.element.innerHTML = this.buildEnhancedCard();
        
        // Add interaction handlers
        this.attachEventHandlers();
        
        return this.element;
    }

    buildEnhancedCard() {
        const sections = [];
        
        // Start flex container
        sections.push('<div class="card-flex-container">');
        
        // NEW: Cost display bar at top
        if (this.economics?.cost) {
            sections.push(this.buildCostBar());
        }
        
        // Event badges AFTER cost bar so they appear on top
        if (this.events.length > 0) {
            sections.push(this.buildEventBadges());
        }
        
        // Content wrapper with proper spacing
        sections.push('<div class="card-content-area">');
        
        // Header section
        if (this.data.header) {
            sections.push(this.buildSection('header', this.data.header));
        }
        
        // Media section
        if (this.data.media) {
            sections.push(this.buildSection('media', this.data.media));
        }
        
        // Body section
        if (this.data.body) {
            sections.push(this.buildSection('body', this.data.body));
        }
        
        // Stats section (existing stats, not rewards)
        if (this.data.stats) {
            sections.push(this.buildSection('stats', this.data.stats));
        }
        
        sections.push('</div>'); // End content area
        
        // NEW: Rewards footer - positioned above action button
        if (this.economics?.rewards) {
            sections.push(this.buildRewardsFooter());
        }
        
        // Action section (play button)
        if (this.data.actions) {
            sections.push(this.buildEnhancedActions(this.data.actions));
        }
        
        sections.push('</div>'); // End flex container
        
        return sections.join('');
    }
    
    buildCostBar() {
        // Handle various backend field names
        const rawCost = this.economics.cost || this.economics.costs || {};
        const cost = this.normalizeCostData(rawCost);
        const playerResources = this.getPlayerResources();
        const eventModifiers = this.getEventModifiers();
        
        let costDisplay = '';
        
        // Build cost items
        const costItems = [];
        
        // Energy cost
        if (cost.energy > 0) {
            const modifiedCost = this.applyEventModifiers(cost.energy, eventModifiers);
            const hasEnough = playerResources.energy >= modifiedCost;
            
            if (modifiedCost !== cost.energy) {
                costItems.push(`
                    <span class="cost-item energy">
                        <img src="./src/images/economy-icons/energyIcon.svg" class="icon-small" alt="Energy">
                        <span class="cost-original">${cost.energy}</span>
                        → <span class="cost-discounted">${modifiedCost}</span>
                    </span>
                `);
            } else if (modifiedCost === 0) {
                costItems.push(`<span class="cost-item cost-free">FREE PLAY</span>`);
            } else {
                costItems.push(`
                    <span class="cost-item energy ${!hasEnough ? 'insufficient' : ''}">
                        <img src="./src/images/economy-icons/energyIcon.svg" class="icon-small" alt="Energy">
                        ${cost.energy}
                    </span>
                `);
            }
        }
        
        // Gem cost
        if (cost.gems > 0) {
            const hasEnough = playerResources.gems >= cost.gems;
            costItems.push(`
                <span class="cost-item gems ${!hasEnough ? 'insufficient' : ''}">
                    <img src="./src/images/economy-icons/gemIcon.svg" class="icon-small" alt="Gems">
                    ${cost.gems}
                </span>
            `);
        }
        
        // Heart requirement
        if (cost.minHearts > 0) {
            const hasEnough = playerResources.hearts >= cost.minHearts;
            costItems.push(`
                <span class="cost-item hearts ${!hasEnough ? 'insufficient' : ''}">
                    <img src="./src/images/economy-icons/heartIcon.svg" class="icon-small" alt="Hearts">
                    >${cost.minHearts}
                </span>
            `);
        }
        
        return `
            <div class="card-cost-bar">
                <div class="cost-display">
                    <span class="cost-label">Join:</span>
                    <div class="cost-items">
                        ${costItems.join('')}
                    </div>
                </div>
                <div class="cost-details">
                    ${this.buildCostDetails(playerResources)}
                </div>
            </div>
        `;
    }
    
    buildCostDetails(playerResources) {
        const cost = this.economics.cost;
        const eventModifiers = this.getEventModifiers();
        
        const details = [];
        
        // Energy details
        if (cost.energy > 0) {
            const modifiedCost = this.applyEventModifiers(cost.energy, eventModifiers);
            const hasEnough = playerResources.energy >= modifiedCost;
            details.push(`
                <div class="cost-detail-row ${!hasEnough ? 'insufficient' : ''}">
                    <span>Energy Required:</span>
                    <span>${modifiedCost} / ${playerResources.energy}</span>
                </div>
            `);
            
            if (!hasEnough) {
                const timeToRegen = Math.ceil((modifiedCost - playerResources.energy) * 5);
                details.push(`
                    <div class="cost-detail-row insufficient">
                        <span>Time to regenerate:</span>
                        <span>${timeToRegen} min</span>
                    </div>
                `);
            }
        }
        
        // Event modifier info
        if (eventModifiers.length > 0) {
            details.push(`
                <div class="cost-detail-row">
                    <span>Active Events:</span>
                    <span>${eventModifiers.map(e => e.name).join(', ')}</span>
                </div>
            `);
        }
        
        return details.join('');
    }
    
    buildEventBadges() {
        const badges = this.events.map(event => {
            const badgeClass = this.getEventBadgeClass(event.type);
            return `
                <div class="event-badge ${badgeClass}">
                    ${event.label}
                </div>
            `;
        });
        
        return `
            <div class="card-event-badges">
                ${badges.join('')}
            </div>
        `;
    }
    
    buildRewardsFooter() {
        // Handle various backend field names
        const rawRewards = this.economics.rewards || this.economics.reward || this.economics.prizes || {};
        const rewards = this.normalizeRewardsData(rawRewards);
        const rewardItems = [];
        
        if (rewards.xp) {
            const xpText = rewards.xp.min === rewards.xp.max ? 
                `${rewards.xp.max}` : 
                `${rewards.xp.min}-${rewards.xp.max}`;
            rewardItems.push(`
                <span class="reward-item xp" title="${xpText} Experience Points">
                    <img src="./src/images/economy-icons/xpIcon.svg" class="icon-small" alt="XP">
                    <span class="reward-value">${xpText}</span>
                </span>
            `);
        }
        
        if (rewards.gems && rewards.gems.max > 0) {
            // Round up fractional values
            const minGems = Math.ceil(rewards.gems.min);
            const maxGems = Math.ceil(rewards.gems.max);
            
            const gemText = minGems === maxGems ? 
                `(${maxGems})` : 
                `(${minGems}-${maxGems})`;
            rewardItems.push(`
                <span class="reward-item gems" title="${minGems}-${maxGems} Gems">
                    <img src="./src/images/economy-icons/gemIcon.svg" class="icon-small" alt="Gems">
                    <span class="reward-value">${gemText}</span>
                </span>
            `);
        }
        
        if (rewards.rare) {
            rewardItems.push(`
                <span class="reward-item rare" title="${rewards.rare}">
                    <img src="./src/images/economy-icons/giftBox.svg" class="icon-small" alt="Mystery Box">
                    <span class="reward-value">?</span>
                </span>
            `);
        }
        
        return `
            <div class="card-rewards-footer">
                <span class="rewards-label">Win:</span>
                <div class="reward-items">
                    ${rewardItems.join('')}
                </div>
            </div>
        `;
    }
    
    buildEnhancedActions(content) {
        const { primary, secondary, link } = content;
        const canAfford = this.checkAffordability();
        const buttonClass = this.getButtonClass();
        const encouragement = this.getRandomEncouragement();
        
        return `
            <div class="card-section section-actions">
                ${secondary ? `<button class="action-button action-secondary" data-action="${secondary.action}">
                    ${secondary.text}
                </button>` : ''}
                ${primary ? `
                    <button class="action-button action-primary ${buttonClass}" 
                            data-action="${primary.action}"
                            ${!canAfford ? 'disabled' : ''}>
                        ${primary.icon || ''} ${this.getButtonText(primary.text)}
                        <div class="encouragement-popup">${encouragement}</div>
                    </button>
                ` : ''}
                ${link ? `<a href="#" class="card-link" data-action="${link.action}">
                    ${link.text}
                </a>` : ''}
            </div>
        `;
    }
    
    // Helper methods
    
    checkAffordability() {
        if (!this.economics?.cost || !this.economyManager) return true;
        return this.economyManager.canAfford(this.economics.cost);
    }
    
    checkAlmostAffordable() {
        if (!this.economics?.cost || !this.economyManager) return false;
        const playerResources = this.getPlayerResources();
        const cost = this.economics.cost;
        
        // Check if player has 75%+ of required resources
        if (cost.energy > 0) {
            const ratio = playerResources.energy / cost.energy;
            return ratio >= 0.75 && ratio < 1;
        }
        
        return false;
    }
    
    getPlayerResources() {
        if (this.economyManager) {
            return this.economyManager.getResources();
        }
        
        // Fallback
        return {
            energy: 100,
            hearts: 5,
            gems: 0,
            coins: 0
        };
    }
    
    getEventModifiers() {
        // Get active events that modify costs
        return this.events.filter(e => e.costModifier);
    }
    
    applyEventModifiers(baseCost, modifiers) {
        // Use EconomyManager's event system if available
        if (this.economyManager && this.economyManager.applyEventModifiers) {
            return this.economyManager.applyEventModifiers(baseCost);
        }
        
        // Fallback to local calculation
        let cost = baseCost;
        
        modifiers.forEach(mod => {
            if (mod.type === 'percentage') {
                cost = Math.floor(cost * (1 - mod.value));
            } else if (mod.type === 'flat') {
                cost = Math.max(0, cost - mod.value);
            }
        });
        
        return cost;
    }
    
    getEventBadgeClass(eventType) {
        const classMap = {
            'power-hour': 'power-hour',
            'learning-party': 'learning-party',
            'perfect-streak': 'perfect-streak',
            'quest': 'quest-active',
            'limited': 'limited-time'
        };
        
        return classMap[eventType] || '';
    }
    
    getButtonClass() {
        const canAfford = this.checkAffordability();
        if (!canAfford) return 'cta-locked';
        
        // Check for special events
        const hasFreeevent = this.events.some(e => e.type === 'free');
        if (hasFreeevent) return 'cta-free';
        
        const hasBoost = this.events.some(e => e.type === 'boost');
        if (hasBoost) return 'cta-boost';
        
        return '';
    }
    
    getButtonText(defaultText) {
        const canAfford = this.checkAffordability();
        if (!canAfford) return 'LOCKED';
        
        const hasFreeevent = this.events.some(e => e.type === 'free');
        if (hasFreeevent) return 'PLAY FREE';
        
        const hasBoost = this.events.some(e => e.type === 'boost');
        if (hasBoost) return 'PLAY WITH BOOST';
        
        return defaultText || 'PLAY NOW';
    }
    
    getRandomEncouragement() {
        const encouragements = [
            "Brilliant!",
            "Well played!",
            "You've got this!",
            "Perfect timing!",
            "Nailed it!",
            "Excellent choice!",
            "Let's go!",
            "Amazing!"
        ];
        
        return encouragements[Math.floor(Math.random() * encouragements.length)];
    }
    
    // Keep existing methods for compatibility
    buildSection(type, content) {
        const builders = {
            header: this.buildHeader.bind(this),
            media: this.buildMedia.bind(this),
            body: this.buildBody.bind(this),
            stats: this.buildStats.bind(this),
            actions: this.buildActions.bind(this)
        };
        
        return builders[type] ? builders[type](content) : '';
    }
    
    buildHeader(content) {
        const { icon, title, badges, meta } = content;
        return `
            <div class="card-section card-header">
                ${icon ? `<div class="card-icon">${this.renderIcon(icon)}</div>` : ''}
                ${title ? `<div class="card-title-area">
                    <h3 class="card-title">${title}</h3>
                    ${meta ? `<p class="card-meta">${meta}</p>` : ''}
                </div>` : ''}
                ${badges ? `<div class="card-badges">${this.renderBadges(badges)}</div>` : ''}
            </div>
        `;
    }

    buildMedia(content) {
        const { type, src, alt, thumbnail } = content;
        switch(type) {
            case 'image':
                return `<div class="card-section card-media">
                    <img src="${src}" alt="${alt || ''}" class="card-image">
                </div>`;
            case 'video':
                return `<div class="card-section card-media">
                    <video src="${src}" poster="${thumbnail || ''}" class="card-video"></video>
                    <div class="play-overlay">▶</div>
                </div>`;
            case 'icon-grid':
                return `<div class="card-section card-media card-icon-grid">
                    ${src.map(icon => `<span class="grid-icon">${icon}</span>`).join('')}
                </div>`;
            default:
                return '';
        }
    }

    buildBody(content) {
        const { title, description, highlights, progress, list, badges } = content;
        
        // Filter out mode badges and practice card info/timer badges
        const filteredBadges = badges ? badges.filter(badge => {
            // Always filter out mode badges
            if (['chaos-mode', 'zen-mode', 'speed-mode'].includes(badge.type)) return false;
            // For practice cards, also filter out info and timer badges
            if (this.type === 'practice' && ['info', 'timer'].includes(badge.type)) return false;
            return true;
        }) : null;
        
        return `
            <div class="card-section card-body">
                ${title ? `<h4 class="body-title">${title}</h4>` : ''}
                ${description ? `<p class="body-description">${description}</p>` : ''}
                ${filteredBadges && filteredBadges.length > 0 ? `<div class="body-badges">${this.renderBadges(filteredBadges)}</div>` : ''}
                ${highlights ? `<div class="body-highlights">
                    ${highlights.map(h => `<span class="highlight highlight-${h.type}">${h.text}</span>`).join('')}
                </div>` : ''}
                ${list ? `<ul class="body-list">
                    ${list.map(item => `<li class="${item.done ? 'done' : ''}">${item.text}</li>`).join('')}
                </ul>` : ''}
                ${progress ? this.renderProgress(progress) : ''}
            </div>
        `;
    }

    buildStats(content) {
        return `
            <div class="card-section card-stats">
                ${content.map(stat => `
                    <div class="stat-item">
                        ${stat.icon ? `<span class="stat-icon">${stat.icon}</span>` : ''}
                        ${stat.label ? `<span class="stat-label">${stat.label}</span>` : ''}
                        <span class="stat-value">${stat.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    buildActions(content) {
        // Use the enhanced actions builder
        return this.buildEnhancedActions(content);
    }

    renderIcon(icon) {
        if (typeof icon === 'string') {
            // Emoji or text icon
            return icon;
        } else if (icon.type === 'svg') {
            // SVG icon
            return icon.content;
        } else if (icon.type === 'image') {
            // Image icon
            return `<img src="${icon.src}" alt="${icon.alt || ''}" class="icon-image">`;
        }
        return '';
    }

    renderBadges(badges) {
        return badges.map(badge => {
            const classes = ['badge'];
            if (badge.type) classes.push(`badge-${badge.type}`);
            if (badge.animated) classes.push('badge-animated');
            
            return `<span class="${classes.join(' ')}" ${badge.tooltip ? `title="${badge.tooltip}"` : ''}>
                ${badge.icon || ''} ${badge.text}
            </span>`;
        }).join('');
    }

    renderProgress(progress) {
        const { type, value, max, text } = progress;
        const percentage = max ? (value / max) * 100 : value;
        
        if (type === 'bar') {
            return `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    ${text ? `<span class="progress-text">${text}</span>` : ''}
                </div>
            `;
        } else if (type === 'circular') {
            return `
                <div class="progress-circular" data-progress="${percentage}">
                    <span class="progress-value">${Math.round(percentage)}%</span>
                </div>
            `;
        }
        return '';
    }
    
    attachEventHandlers() {
        // Card click handler
        this.element.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.closest('.action-button') || e.target.closest('.card-link') || e.target.closest('.cost-expand-btn')) {
                return;
            }
            this.handleAction('card-click');
        });
        
        // Action button handlers
        this.element.querySelectorAll('[data-action]').forEach(button => {
            // console.log('Attaching click handler to button:', button, 'with action:', button.dataset.action);
            button.addEventListener('click', (e) => {
                console.log('Button clicked! Action:', button.dataset.action, 'Event:', e);
                e.preventDefault();
                e.stopPropagation();
                
                // Check affordability before action
                if (button.disabled) {
                    this.showInsufficientResourcesMessage();
                    return;
                }
                
                this.handleAction(button.dataset.action);
            });
            
            // Add hover handlers for encouragement popup
            const popup = button.querySelector('.encouragement-popup');
            if (popup) {
                button.addEventListener('mouseenter', () => {
                    popup.classList.add('show');
                });
                button.addEventListener('mouseleave', () => {
                    popup.classList.remove('show');
                });
            }
        });
    }
    
    showInsufficientResourcesMessage() {
        if (window.showToast) {
            window.showToast('Not enough resources!', 'error');
        } else {
            console.log('Insufficient resources for this action');
        }
    }
    
    handleAction(action) {
        console.log('GenericCardEnhanced.handleAction called with:', action, 'for card:', this.id);
        this.onAction({
            action: action,
            cardId: this.id,
            component: this.component,
            componentConfig: this.componentConfig,
            data: this.data
        });
    }
    
    // Normalize backend cost data to expected format
    normalizeCostData(rawCost) {
        // Handle various field names from backend
        return {
            energy: rawCost.energy || rawCost.energy_cost || rawCost.energyCost || 0,
            gems: rawCost.gems || rawCost.gem || rawCost.diamonds || rawCost.diamond || 0,
            coins: rawCost.coins || rawCost.coin || rawCost.gold || 0,
            minHearts: rawCost.minHearts || rawCost.min_hearts || rawCost.hearts_required || 0,
            tickets: rawCost.tickets || rawCost.ticket || 0,
            keys: rawCost.keys || rawCost.key || 0
        };
    }
    
    // Normalize backend rewards data to expected format
    normalizeRewardsData(rawRewards) {
        const normalized = {};
        
        // XP normalization
        if (rawRewards.xp || rawRewards.experience || rawRewards.exp) {
            const xpData = rawRewards.xp || rawRewards.experience || rawRewards.exp;
            if (typeof xpData === 'number') {
                normalized.xp = { min: xpData, max: xpData };
            } else if (typeof xpData === 'object') {
                normalized.xp = {
                    min: xpData.min || xpData.minimum || xpData.from || 0,
                    max: xpData.max || xpData.maximum || xpData.to || xpData.min || 0
                };
            }
        }
        
        // Gems normalization
        if (rawRewards.gems || rawRewards.gem || rawRewards.diamonds) {
            const gemData = rawRewards.gems || rawRewards.gem || rawRewards.diamonds;
            if (typeof gemData === 'number') {
                normalized.gems = { min: gemData, max: gemData };
            } else if (typeof gemData === 'object') {
                normalized.gems = {
                    min: gemData.min || gemData.minimum || gemData.from || 0,
                    max: gemData.max || gemData.maximum || gemData.to || gemData.min || 0
                };
            }
        }
        
        // Mystery box / rare rewards
        if (rawRewards.rare || rawRewards.mystery || rawRewards.special || rawRewards.bonus) {
            const rareData = rawRewards.rare || rawRewards.mystery || rawRewards.special || rawRewards.bonus;
            if (typeof rareData === 'string') {
                normalized.rare = rareData;
            } else if (typeof rareData === 'object' && rareData.description) {
                normalized.rare = rareData.description;
            } else if (rareData === true) {
                normalized.rare = '🎁 Mystery Reward';
            }
        }
        
        return normalized;
    }
}

// Export for use
window.GenericCardEnhanced = GenericCardEnhanced;
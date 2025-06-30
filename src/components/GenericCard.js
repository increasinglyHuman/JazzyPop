/**
 * Generic Card Component
 * Flexible card system that can adapt to any content type
 */

class GenericCard {
    constructor(config) {
        this.id = config.id;
        this.type = config.type || 'default';
        this.theme = config.theme || 'standard'; // visual theme
        this.layout = config.layout || 'vertical'; // vertical, horizontal, compact
        this.priority = config.priority; // visual priority: high, urgent, special
        this.data = config.data || {};
        this.component = config.component; // which component to launch
        this.componentConfig = config.componentConfig || {}; // config to pass to component
        this.element = null;
        this.onAction = config.onAction || (() => {});
    }

    render() {
        this.element = document.createElement('div');
        const classes = ['generic-card'];
        if (this.theme) classes.push(`theme-${this.theme}`);
        if (this.layout) classes.push(`layout-${this.layout}`);
        if (this.priority) classes.push(`priority-${this.priority}`);
        
        this.element.className = classes.join(' ');
        this.element.setAttribute('data-card-id', this.id);
        
        // Build card from sections
        this.element.innerHTML = this.buildCard();
        
        // Add interaction handlers
        this.attachEventHandlers();
        
        return this.element;
    }

    buildCard() {
        const sections = [];
        
        // Header section
        if (this.data.header) {
            sections.push(this.buildSection('header', this.data.header));
        }
        
        // Media section (images, videos, etc)
        if (this.data.media) {
            sections.push(this.buildSection('media', this.data.media));
        }
        
        // Body section
        if (this.data.body) {
            sections.push(this.buildSection('body', this.data.body));
        }
        
        // Stats/metadata section
        if (this.data.stats) {
            sections.push(this.buildSection('stats', this.data.stats));
        }
        
        // Action section
        if (this.data.actions) {
            sections.push(this.buildSection('actions', this.data.actions));
        }
        
        return sections.join('');
    }

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
        const { title, description, highlights, progress, list } = content;
        return `
            <div class="card-section card-body">
                ${title ? `<h4 class="body-title">${title}</h4>` : ''}
                ${description ? `<p class="body-description">${description}</p>` : ''}
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
        const { primary, secondary, link } = content;
        return `
            <div class="card-section section-actions">
                ${secondary ? `<button class="action-button action-secondary" data-action="${secondary.action}">
                    ${secondary.text}
                </button>` : ''}
                ${primary ? `<button class="action-button action-primary" data-action="${primary.action}">
                    ${primary.icon || ''} ${primary.text}
                </button>` : ''}
                ${link ? `<a href="#" class="card-link" data-action="${link.action}">
                    ${link.text}
                </a>` : ''}
            </div>
        `;
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
            if (e.target.closest('.action-button') || e.target.closest('.card-link')) {
                return;
            }
            this.handleAction('card-click');
        });
        
        // Action button handlers
        this.element.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleAction(button.dataset.action);
            });
        });
        
        // Video play handler
        const playOverlay = this.element.querySelector('.play-overlay');
        if (playOverlay) {
            playOverlay.addEventListener('click', (e) => {
                e.stopPropagation();
                const video = this.element.querySelector('video');
                if (video) {
                    video.play();
                    playOverlay.style.display = 'none';
                }
            });
        }
    }

    handleAction(action) {
        // Add visual feedback
        this.element.classList.add('card-active');
        setTimeout(() => {
            this.element.classList.remove('card-active');
        }, 200);
        
        // Call the action handler
        this.onAction({
            cardId: this.id,
            action: action,
            component: this.component,
            componentConfig: this.componentConfig,
            data: this.data
        });
    }

    update(updates) {
        // Update specific parts of the card without full re-render
        if (updates.badges) {
            const badgesEl = this.element.querySelector('.card-badges');
            if (badgesEl) {
                badgesEl.innerHTML = this.renderBadges(updates.badges);
            }
        }
        
        if (updates.progress) {
            const progressEl = this.element.querySelector('.progress-container, .progress-circular');
            if (progressEl) {
                progressEl.parentNode.innerHTML = this.renderProgress(updates.progress);
            }
        }
        
        if (updates.stats) {
            const statsEl = this.element.querySelector('.card-stats');
            if (statsEl) {
                statsEl.innerHTML = this.buildStats(updates.stats);
            }
        }
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
    }
}

// Example card configurations
window.GenericCard = GenericCard;

// Example usage:
/*
const quizCard = new GenericCard({
    id: 'quiz-001',
    type: 'quiz',
    theme: 'gradient',
    component: 'QuizEngine',
    componentConfig: {
        quizType: 'multiple-choice',
        questionCount: 10,
        difficulty: 'medium'
    },
    data: {
        header: {
            icon: '🧠',
            title: 'Daily Brain Teaser',
            badges: [
                { text: 'Medium', type: 'difficulty' },
                { text: '5 min', type: 'time', icon: '⏱' }
            ]
        },
        body: {
            description: 'Test your knowledge with today\'s quiz!',
            highlights: [
                { text: 'Multiple Choice', type: 'info' },
                { text: '+50 XP', type: 'reward' }
            ]
        },
        actions: {
            primary: { text: 'Start Quiz', action: 'launch-component' }
        }
    }
});

const fillInBlankCard = new GenericCard({
    id: 'quiz-002',
    type: 'quiz',
    theme: 'minimal',
    component: 'QuizEngine',
    componentConfig: {
        quizType: 'fill-in-blank',
        topic: 'vocabulary'
    },
    data: {
        header: {
            icon: '✏️',
            title: 'Vocabulary Builder'
        },
        body: {
            description: 'Complete the sentences with the correct words'
        },
        stats: [
            { icon: '📝', value: '20', label: 'words' },
            { icon: '⚡', value: '100', label: 'XP' }
        ],
        actions: {
            primary: { text: 'Practice', action: 'launch-component' }
        }
    }
});
*/
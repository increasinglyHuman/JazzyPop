/**
 * Factoid Modal Component
 * Simple modal for displaying trivia, facts, quotes, and tips
 */

export class FactoidModal {
    constructor() {
        this.isOpen = false;
        this.currentFactoid = null;
        this.modal = null;
        this.onClose = null;
        this.createModal();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'factoid-modal';
        this.modal.innerHTML = `
            <div class="factoid-modal-overlay"></div>
            <div class="factoid-modal-content">
                <button class="factoid-close-btn" aria-label="Close">×</button>
                
                <div class="factoid-header">
                    <div class="factoid-icon" id="factoidIcon"></div>
                    <h2 class="factoid-title" id="factoidTitle"></h2>
                </div>
                
                <div class="factoid-body">
                    <p class="factoid-text" id="factoidText"></p>
                    <div class="factoid-meta" id="factoidMeta"></div>
                </div>
                
                <div class="factoid-actions">
                    <button class="factoid-action-btn primary" id="factoidActionBtn">Got it!</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.modal.querySelector('.factoid-modal-overlay').addEventListener('click', () => this.close());
        this.modal.querySelector('.factoid-close-btn').addEventListener('click', () => this.close());
        this.modal.querySelector('#factoidActionBtn').addEventListener('click', () => this.handleAction());
    }

    async open(factoidData) {
        this.currentFactoid = factoidData;
        this.isOpen = true;

        // Update content based on type
        this.updateContent(factoidData);

        // Add to DOM
        document.body.appendChild(this.modal);
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.modal.classList.add('active');
        });

        // Track view
        this.trackView(factoidData);
    }

    updateContent(data) {
        const iconMap = {
            'fact': '💡',
            'quote': '💭',
            'tip': '✨',
            'challenge': '🎯',
            'trivia': '🧠'
        };

        const titleMap = {
            'fact': 'Did You Know?',
            'quote': 'Quote',
            'tip': 'Pro Tip',
            'challenge': 'Challenge',
            'trivia': 'Trivia Time!'
        };

        // Set icon and title
        document.getElementById('factoidIcon').textContent = iconMap[data.type] || '📄';
        document.getElementById('factoidTitle').textContent = titleMap[data.type] || 'Info';

        // Set main content
        const contentText = data.content || data.text || data.fact || data.quote || data.fun_fact || '';
        document.getElementById('factoidText').textContent = contentText;

        // Set meta information
        const metaEl = document.getElementById('factoidMeta');
        metaEl.innerHTML = '';
        
        if (data.author) {
            metaEl.innerHTML = `<span class="factoid-author">— ${data.author}</span>`;
        }
        
        if (data.category) {
            const categoryBadge = document.createElement('span');
            categoryBadge.className = 'factoid-category';
            categoryBadge.textContent = this.formatCategory(data.category);
            metaEl.appendChild(categoryBadge);
        }

        // Add interactive prompt based on content
        if (data.action_prompt) {
            const promptEl = document.createElement('div');
            promptEl.className = 'factoid-action-prompt';
            promptEl.innerHTML = `<p>${data.action_prompt}</p>`;
            document.querySelector('.factoid-body').appendChild(promptEl);
        } else {
            // Generate default prompts
            this.addDefaultActionPrompt(data.type, metaEl);
        }

        // Update action button
        const actionBtn = document.getElementById('factoidActionBtn');
        const actionMap = {
            'fact': 'Test my knowledge!',
            'quote': 'Share this quote',
            'tip': 'I\'ll try this!',
            'challenge': 'Accept challenge',
            'trivia': 'Quiz me more!'
        };
        actionBtn.textContent = data.action_text || actionMap[data.type] || 'Got it!';
    }
    
    addDefaultActionPrompt(type, container) {
        const prompts = {
            'fact': 'Can you remember this fact? Try a quiz about it!',
            'quote': 'How does this quote inspire you?',
            'tip': 'Will you try this tip today?',
            'challenge': 'Ready to take on this challenge?',
            'trivia': 'Want to learn more trivia like this?'
        };
        
        if (prompts[type]) {
            const promptEl = document.createElement('p');
            promptEl.className = 'factoid-prompt';
            promptEl.textContent = prompts[type];
            container.appendChild(promptEl);
        }
    }

    handleAction() {
        // Save interaction
        this.saveInteraction(this.currentFactoid);
        
        // Close modal
        this.close();
    }

    close() {
        if (!this.isOpen) return;
        
        this.modal.classList.remove('active');
        
        setTimeout(() => {
            if (this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.isOpen = false;
            
            if (this.onClose) {
                this.onClose();
            }
        }, 300);
    }

    trackView(data) {
        // Track that user viewed this content
        const viewedContent = JSON.parse(localStorage.getItem('viewedContent') || '[]');
        viewedContent.push({
            type: data.type,
            id: data.id || Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 items
        if (viewedContent.length > 100) {
            viewedContent.splice(0, viewedContent.length - 100);
        }
        
        localStorage.setItem('viewedContent', JSON.stringify(viewedContent));
    }

    saveInteraction(data) {
        // Save user interaction with content
        const interactions = JSON.parse(localStorage.getItem('contentInteractions') || '{}');
        const key = `${data.type}_${data.id || Date.now()}`;
        
        interactions[key] = {
            type: data.type,
            interacted: true,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('contentInteractions', JSON.stringify(interactions));
    }

    formatCategory(category) {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

// Export as singleton
export const factoidModal = new FactoidModal();
/**
 * Alert Modal Component
 * Lightweight modal for replacing system alerts and confirms
 * Supports both simple alerts and confirm/deny dialogs
 */

class AlertModal {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.resolvePromise = null;
        this.createModal();
        
        // Add to body on creation
        document.body.appendChild(this.modal);
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'alert-modal';
        this.modal.innerHTML = `
            <div class="alert-modal-overlay"></div>
            <div class="alert-modal-content">
                <div class="alert-modal-icon">
                    <img src="./src/images/signbots/signbot-thinking.svg" alt="Alert" />
                </div>
                <div class="alert-modal-body">
                    <p class="alert-modal-message" id="alertMessage"></p>
                </div>
                <div class="alert-modal-actions">
                    <button class="alert-modal-btn primary" id="alertConfirmBtn">OK</button>
                    <button class="alert-modal-btn secondary" id="alertCancelBtn" style="display: none;">Cancel</button>
                </div>
            </div>
        `;

        // Cache elements
        this.overlay = this.modal.querySelector('.alert-modal-overlay');
        this.message = this.modal.querySelector('#alertMessage');
        this.confirmBtn = this.modal.querySelector('#alertConfirmBtn');
        this.cancelBtn = this.modal.querySelector('#alertCancelBtn');

        // Add event listeners
        this.overlay.addEventListener('click', () => this.handleCancel());
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    /**
     * Show a simple alert with OK button
     * @param {string} message - The message to display
     * @param {string} confirmText - Text for the OK button (default: "OK")
     * @param {string} iconType - Type of icon to show (default: "thinking")
     * @returns {Promise} - Resolves when user clicks OK
     */
    async alert(message, confirmText = 'OK', iconType = 'thinking') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.message.textContent = message;
            this.confirmBtn.textContent = confirmText;
            this.cancelBtn.style.display = 'none';
            
            // Update icon based on type
            const iconElement = this.modal.querySelector('.alert-modal-icon img');
            const iconMap = {
                'thinking': './src/images/signbots/signbot-thinking.svg',
                'standard': './src/images/signbots/signbot-standard.svg',
                'excited': './src/images/signbots/signbot-excited.svg',
                'stop': './src/images/stop-bot.svg'
            };
            iconElement.src = iconMap[iconType] || iconMap['thinking'];
            
            this.open();
        });
    }

    /**
     * Show a confirm dialog with OK/Cancel buttons
     * @param {string} message - The message to display
     * @param {string} confirmText - Text for confirm button (default: "OK")
     * @param {string} cancelText - Text for cancel button (default: "Cancel")
     * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
     */
    async confirm(message, confirmText = 'OK', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.message.textContent = message;
            this.confirmBtn.textContent = confirmText;
            this.cancelBtn.textContent = cancelText;
            this.cancelBtn.style.display = 'block';
            this.open();
        });
    }

    open() {
        console.log('AlertModal.open() called');
        console.log('Modal element:', this.modal);
        console.log('Modal parent:', this.modal.parentElement);
        console.log('Modal position:', {
            offsetTop: this.modal.offsetTop,
            offsetLeft: this.modal.offsetLeft,
            offsetWidth: this.modal.offsetWidth,
            offsetHeight: this.modal.offsetHeight
        });
        
        this.isOpen = true;
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Log computed styles
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(this.modal);
            console.log('Modal computed style:', {
                display: computedStyle.display,
                opacity: computedStyle.opacity,
                zIndex: computedStyle.zIndex,
                position: computedStyle.position
            });
        }, 50);
        
        // Focus on confirm button for accessibility
        setTimeout(() => this.confirmBtn.focus(), 100);
    }

    close() {
        this.isOpen = false;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    handleConfirm() {
        this.close();
        if (this.resolvePromise) {
            // For confirm dialogs, resolve with true
            // For alerts, just resolve
            const isConfirm = this.cancelBtn.style.display !== 'none';
            this.resolvePromise(isConfirm ? true : undefined);
            this.resolvePromise = null;
        }
    }

    handleCancel() {
        // Only close on overlay click if it's not a confirm dialog
        const isConfirm = this.cancelBtn.style.display !== 'none';
        if (!isConfirm) return;
        
        this.close();
        if (this.resolvePromise) {
            this.resolvePromise(false);
            this.resolvePromise = null;
        }
    }
}

// Create singleton instance
const alertModal = new AlertModal();
console.log('AlertModal instance created:', alertModal);

// Global convenience functions to replace alert() and confirm()
window.showAlert = (message, confirmText, iconType) => alertModal.alert(message, confirmText, iconType);
window.showConfirm = (message, confirmText, cancelText) => alertModal.confirm(message, confirmText, cancelText);

console.log('window.showAlert defined:', typeof window.showAlert);
console.log('window.showConfirm defined:', typeof window.showConfirm);
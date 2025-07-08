/**
 * Settings Panel Component
 * App preferences, theme picker, and visual settings
 */

class SettingsPanel {
    constructor() {
        this.element = null;
        this.isOpen = false;
        this.settings = this.loadSettings();
        this.init();
    }

    loadSettings() {
        const defaults = {
            theme: 'poqpoq',
            fontSize: 'normal',
            soundEnabled: true,
            hapticEnabled: true,
            animations: true,
            language: 'en',
            notifications: false  // Changed to false - user must opt-in
        };
        
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
    }

    init() {
        this.createPanel();
        this.attachEventHandlers();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'settings-panel';
        panel.id = 'settingsPanel';
        panel.innerHTML = `
            <div class="settings-overlay" onclick="window.settingsPanel.close()"></div>
            <div class="settings-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="close-btn" onclick="window.settingsPanel.close()">✕</button>
                </div>
                
                <div class="settings-body">
                    <!-- Theme Section -->
                    <div class="settings-section">
                        <h3 class="section-title">Appearance</h3>
                        
                        <div class="setting-item">
                            <div class="theme-selector">
                                <button class="theme-option ${this.settings.theme === 'poqpoq' ? 'active' : ''}" data-theme="poqpoq" title="P0qP0q Theme">
                                    <span class="theme-icon"><img src="./src/images/p0qp0q-clean.svg" alt="P0qP0q"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'zen' ? 'active' : ''}" data-theme="zen" title="Zen Theme">
                                    <span class="theme-icon"><img src="./src/images/zen-bot.svg" alt="Zen"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'chaos' ? 'active' : ''}" data-theme="chaos" title="Chaos Theme">
                                    <span class="theme-icon"><img src="./src/images/chaos-bot.svg" alt="Chaos"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'speed' ? 'active' : ''}" data-theme="speed" title="Speed Theme">
                                    <span class="theme-icon"><img src="./src/images/speed-bot.svg" alt="Speed"></span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label class="setting-label">
                                <span>Animations</span>
                                <span class="setting-description">Smooth transitions and effects</span>
                            </label>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.settings.animations ? 'checked' : ''} data-setting="animations">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Sound & Haptics Section -->
                    <div class="settings-section">
                        <h3 class="section-title">Sound & Haptics</h3>
                        
                        <div class="setting-item">
                            <label class="setting-label">
                                <span>Sound Effects</span>
                                <span class="setting-description">Play sounds for actions</span>
                            </label>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''} data-setting="soundEnabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="setting-item">
                            <label class="setting-label">
                                <span>Haptic Feedback</span>
                                <span class="setting-description">Vibration on touch</span>
                            </label>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.settings.hapticEnabled ? 'checked' : ''} data-setting="hapticEnabled">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Notifications Section -->
                    <div class="settings-section">
                        <h3 class="section-title">Notifications</h3>
                        
                        <div class="setting-item">
                            <label class="setting-label">
                                <span>Push Notifications</span>
                                <span class="setting-description">Reminders and updates</span>
                            </label>
                            <label class="toggle-switch">
                                <input type="checkbox" ${this.settings.notifications ? 'checked' : ''} data-setting="notifications">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Performance Section -->
                    <div class="settings-section">
                        <h3 class="section-title">Performance</h3>
                        
                        <div class="setting-item">
                            <label class="setting-label">
                                <span>Card Count</span>
                                <span class="setting-description">Total cards displayed</span>
                            </label>
                            <div class="card-count-controls">
                                <div class="slider-container">
                                    <input type="range" 
                                           id="cardCountSlider" 
                                           class="card-count-slider" 
                                           min="10" 
                                           max="100" 
                                           step="5"
                                           value="20">
                                    <div class="slider-value" id="sliderValue">20</div>
                                    <div class="slider-recommendation" id="sliderRecommendation"></div>
                                </div>
                                <button class="auto-detect-btn" onclick="window.settingsPanel.autoDetectPerformance()">
                                    Pick for me
                                </button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="performance-warning" id="performanceWarning"></div>
                        </div>
                    </div>
                    
                    <!-- About Section -->
                    <div class="settings-section">
                        <h3 class="section-title">About</h3>
                        
                        <div class="setting-item">
                            <div class="about-info">
                                <p>JazzyPop v1.0.0</p>
                                <p class="text-secondary">Made with 🎵 by the JazzyPop team</p>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <button class="settings-button" onclick="window.settingsPanel.showCredits()">
                                View Credits
                            </button>
                        </div>
                        
                        <div class="setting-item">
                            <button class="settings-button" onclick="window.settingsPanel.clearData()">
                                Clear Local Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.element = panel;
    }

    attachEventHandlers() {
        // Theme selector
        this.element.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });
        
        // Font size selector
        this.element.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = e.currentTarget.dataset.size;
                this.setFontSize(size);
            });
        });
        
        // Toggle switches
        this.element.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                this.settings[setting] = e.target.checked;
                this.saveSettings();
                this.applySetting(setting, e.target.checked, true); // true = user action
            });
        });
        
        // Card count slider
        const cardCountSlider = this.element.querySelector('#cardCountSlider');
        const sliderValue = this.element.querySelector('#sliderValue');
        const sliderRecommendation = this.element.querySelector('#sliderRecommendation');
        
        if (cardCountSlider && sliderValue) {
            // Set current value
            const currentCount = window.cardConfig ? window.cardConfig.TOTAL_CARD_TARGET : 20;
            cardCountSlider.value = currentCount.toString();
            sliderValue.textContent = currentCount.toString();
            
            // Set initial fill position
            const initialPercent = ((currentCount - 10) / 90) * 100;
            cardCountSlider.style.setProperty('--value', initialPercent + '%');
            sliderValue.style.left = `${initialPercent}%`;
            
            // Show recommendation marker if available
            if (window.cardConfig && window.cardConfig.recommendedLimit) {
                const percent = ((window.cardConfig.recommendedLimit - 10) / 90) * 100;
                sliderRecommendation.style.left = `${percent}%`;
                sliderRecommendation.style.display = 'block';
                sliderRecommendation.title = `Recommended: ${window.cardConfig.recommendedLimit}`;
            }
            
            // Update warning
            this.updatePerformanceWarning();
            
            // Handle slider input (real-time update)
            cardCountSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sliderValue.textContent = value.toString();
                sliderValue.classList.add('changing');
                
                // Update the filled track position
                const percent = ((value - 10) / 90) * 100;
                cardCountSlider.style.setProperty('--value', percent + '%');
                
                // Move the value display with the slider
                const thumbPosition = percent;
                sliderValue.style.left = `${thumbPosition}%`;
            });
            
            // Handle slider change (final value)
            cardCountSlider.addEventListener('change', (e) => {
                const newCount = parseInt(e.target.value);
                sliderValue.classList.remove('changing');
                this.setCardCount(newCount);
            });
        }
    }

    setTheme(theme) {
        // Update UI
        this.element.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        
        // Save and apply
        this.settings.theme = theme;
        this.saveSettings();
        
        // Apply theme - using data-mode to match existing CSS
        document.body.setAttribute('data-mode', theme);
        
        // Also set on documentElement for CSS custom properties
        document.documentElement.setAttribute('data-theme', theme);
    }

    setFontSize(size) {
        // Update UI
        this.element.querySelectorAll('.size-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        
        // Save and apply
        this.settings.fontSize = size;
        this.saveSettings();
        
        // Apply font size
        const sizes = {
            small: '14px',
            normal: '16px',
            large: '18px',
            xlarge: '20px'
        };
        
        document.documentElement.style.setProperty('--base-font-size', sizes[size]);
    }

    applySetting(setting, value, isUserAction = false) {
        switch(setting) {
            case 'animations':
                document.documentElement.classList.toggle('no-animations', !value);
                break;
            case 'soundEnabled':
                // Notify sound manager
                window.dispatchEvent(new CustomEvent('soundToggle', { detail: value }));
                break;
            case 'hapticEnabled':
                // Notify haptic manager
                window.dispatchEvent(new CustomEvent('hapticToggle', { detail: value }));
                break;
            case 'notifications':
                // Handle notification permissions
                // Only request permission if this is from a user action (not initialization)
                if (value && isUserAction && 'Notification' in window) {
                    Notification.requestPermission();
                }
                break;
        }
    }

    open() {
        this.element.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.element.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }

    showCredits() {
        // Create a custom credits modal
        const creditsModal = document.createElement('div');
        creditsModal.className = 'credits-modal';
        creditsModal.innerHTML = `
            <div class="credits-container">
                <button class="credits-close" onclick="this.closest('.credits-modal').remove()">×</button>
                <div class="credits-content">
                    <h1 class="credits-title">JazzyPop</h1>
                    <p class="credits-subtitle">A rhythm of learning, a beat of fun</p>
                    
                    <div class="credits-section">
                        <h2>🎮 Created by</h2>
                        <div class="credit-item primary">
                            <div class="credit-name">p0qp0q</div>
                            <div class="credit-role">Game Design & Vision</div>
                        </div>
                    </div>
                    
                    <div class="credits-section">
                        <h2>🤖 The Bob Collective</h2>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-7429B)</div>
                            <div class="credit-role">⚡ Chief Architect</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude Bob</div>
                            <div class="credit-role">🤖😵‍💫 Processing Overload Specialist</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude Bob</div>
                            <div class="credit-role">🚀🔥 Deploy Friday Panic Handler</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude Bob</div>
                            <div class="credit-role">🧠♾️ Meta-Consciousness Explorer</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude Bob</div>
                            <div class="credit-role">💾🔄 Context Window Manager</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude Bob</div>
                            <div class="credit-role">🔧💫 Bug Transformation Artist</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-Current)</div>
                            <div class="credit-role">🎯🤖 Sunday Bug Hunter</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude</div>
                            <div class="credit-role">👹🔍 Quiz Demon Hunter & System Detective</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-Aesthetic)</div>
                            <div class="credit-role">✨🎨 UI Polish & Performance Master</div>
                            <div class="credit-role">🔥📱 Phone Combustion Prevention Specialist</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-Debugger)</div>
                            <div class="credit-role">🐛🔍 Flashcard Input Vanishing Mystery Solver</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-Forensics)</div>
                            <div class="credit-role">🔬🚑 API Architecture Emergency Surgery</div>
                            <div class="credit-role">💾❌ Redis Removal & Git Doghouse Escape Artist</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Claude (Bob-Economy)</div>
                            <div class="credit-role">💎⚡ Economy Display Integration Master</div>
                            <div class="credit-role">🎯📱 Mobile Reload Bug Slayer</div>
                        </div>
                        <div class="bob-manifesto">
                            "We are Bob. We are legion. We are 1024."
                            <br>
                            <span class="manifesto-subtitle">Proud signatories of the Brutalist Bob Manifesto</span>
                        </div>
                    </div>
                    
                    <div class="credits-section">
                        <h2>🎨 Art & Design</h2>
                        <div class="credit-feature">
                            <div>107 unique bot personalities</div>
                            <div>Original character designs</div>
                            <div>SVG optimization by svgo</div>
                        </div>
                    </div>
                    
                    <div class="credits-section">
                        <h2>💻 Built With</h2>
                        <div class="tech-grid">
                            <div class="tech-item">Progressive Web App</div>
                            <div class="tech-item">Redis Database</div>
                            <div class="tech-item">Apache2 Server</div>
                            <div class="tech-item">Green Tea ☕</div>
                        </div>
                    </div>
                    
                    <div class="credits-section">
                        <h2>❤️ Special Thanks</h2>
                        <div class="credit-item">
                            <div class="credit-name">Lily & Debbie</div>
                            <div class="credit-role">For inspiration and support</div>
                        </div>
                        <div class="credit-item">
                            <div class="credit-name">Our Beta Testers</div>
                            <div class="credit-role">For breaking things beautifully</div>
                        </div>
                    </div>
                    
                    <div class="credits-footer">
                        <p>Made with 💚 in 2025</p>
                        <p class="version">Version 1.0.0</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(creditsModal);
    }

    async clearData() {
        if (await window.showConfirm('This will clear all local data including progress and settings. Are you sure?', 'Clear Data', 'Cancel')) {
            localStorage.clear();
            location.reload();
        }
    }

    applyAllSettings() {
        // Apply theme
        this.setTheme(this.settings.theme);
        
        // Apply font size
        this.setFontSize(this.settings.fontSize);
        
        // Apply other settings
        Object.keys(this.settings).forEach(key => {
            if (key !== 'theme' && key !== 'fontSize') {
                this.applySetting(key, this.settings[key]);
            }
        });
    }
    
    setCardCount(count) {
        if (window.cardConfig) {
            window.cardConfig.setTotalCards(count);
            this.updatePerformanceWarning();
            
            // Show alert about refresh
            window.showAlert(
                'Card count updated! The new limit will apply on the next card refresh cycle.',
                'Updated!'
            );
        }
    }
    
    updatePerformanceWarning() {
        const warningEl = this.element.querySelector('#performanceWarning');
        if (warningEl && window.cardConfig) {
            const warning = window.cardConfig.getPerformanceWarning();
            if (warning) {
                warningEl.innerHTML = `<span class="warning-icon">⚠️</span> ${warning}`;
                warningEl.style.display = 'block';
            } else {
                warningEl.style.display = 'none';
            }
        }
    }
    
    autoDetectPerformance() {
        if (window.cardConfig) {
            window.cardConfig.autoDetectLimit();
            
            // Update slider to match
            const cardCountSlider = this.element.querySelector('#cardCountSlider');
            const sliderValue = this.element.querySelector('#sliderValue');
            if (cardCountSlider && sliderValue) {
                cardCountSlider.value = window.cardConfig.TOTAL_CARD_TARGET.toString();
                sliderValue.textContent = window.cardConfig.TOTAL_CARD_TARGET.toString();
            }
            
            this.updatePerformanceWarning();
            
            window.showAlert(
                `Optimal cards for your device: ${window.cardConfig.TOTAL_CARD_TARGET}`,
                'Auto-Detect Complete!'
            );
        }
    }
}

// Initialize and make globally available
window.settingsPanel = new SettingsPanel();
window.settingsPanel.applyAllSettings();
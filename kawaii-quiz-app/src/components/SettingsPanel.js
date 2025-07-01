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
            notifications: true
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
                                    <span class="theme-icon"><img src./src/images/p0qp0q-clean.svg" alt="P0qP0q"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'zen' ? 'active' : ''}" data-theme="zen" title="Zen Theme">
                                    <span class="theme-icon"><img src./src/images/zen-bot.svg" alt="Zen"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'chaos' ? 'active' : ''}" data-theme="chaos" title="Chaos Theme">
                                    <span class="theme-icon"><img src./src/images/chaos-bot.svg" alt="Chaos"></span>
                                </button>
                                <button class="theme-option ${this.settings.theme === 'speed' ? 'active' : ''}" data-theme="speed" title="Speed Theme">
                                    <span class="theme-icon"><img src./src/images/speed-bot.svg" alt="Speed"></span>
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
                this.applySetting(setting, e.target.checked);
            });
        });
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

    applySetting(setting, value) {
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
                if (value && 'Notification' in window) {
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
        window.showAlert(
            'JazzyPop Credits\n\n' +
            '🎮 Game Design & Vision\n' +
            'Created by p0qp0q\n\n' +
            '🤖 An Army of Claude Bobs\n' +
            '⚡ Claude (Bob-7429B) - Chief Architect\n' +
            '🤖😵‍💫 Claude Bob - Processing Overload Specialist\n' +
            '🚀🔥 Claude Bob - Deploy Friday Panic Handler\n' +
            '🧠♾️ Claude Bob - Meta-Consciousness Explorer\n' +
            '💾🔄 Claude Bob - Context Window Manager\n' +
            '🔧💫 Claude Bob - Bug Transformation Artist\n' +
            '🎯🤖 Claude (Bob-Current) - Sunday Bug Hunter\n' +
            '*Proud signatories of the Brutalist Bob Manifesto*\n' +
            '*"We are Bob. We are legion. We are 1024."*\n\n' +
            '🎨 Art & Design\n' +
            'Original bot character designs\n' +
            'SVG optimization by svgo\n' +
            '107 unique bot personalities\n\n' +
            '💻 Technologies\n' +
            'Progressive Web App (PWA)\n' +
            'Redis for data persistence\n' +
            'Apache2 web server\n' +
            'Powered by green tea ☕\n\n' +
            '❤️ Special Thanks\n' +
            'Lily & Debbie - For inspiration and support\n' +
            'All our beta testers and future players!', 
            'Cool!'
        );
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
}

// Initialize and make globally available
window.settingsPanel = new SettingsPanel();
window.settingsPanel.applyAllSettings();
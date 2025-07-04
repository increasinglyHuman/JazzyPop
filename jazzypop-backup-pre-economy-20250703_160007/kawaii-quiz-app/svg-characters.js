// JazzyPop SVG Character Collection
const JazzyPopCharacters = {
    // Main mascot - JazzyBot
    jazzyBot: {
        normal: `
            <svg viewBox="0 0 200 200" class="character-svg">
                <defs>
                    <linearGradient id="botGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4ECDC4;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#44A5A0;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <!-- Body -->
                <rect x="50" y="70" width="100" height="80" rx="20" fill="url(#botGradient)" />
                <!-- Head -->
                <circle cx="100" cy="50" r="35" fill="url(#botGradient)" />
                <!-- Antenna -->
                <line x1="100" y1="15" x2="100" y2="5" stroke="#333" stroke-width="3" stroke-linecap="round" />
                <circle cx="100" cy="5" r="5" fill="#FFD93D" />
                <!-- Eyes -->
                <circle cx="85" cy="45" r="8" fill="#333" />
                <circle cx="115" cy="45" r="8" fill="#333" />
                <circle cx="87" cy="43" r="3" fill="#fff" />
                <circle cx="117" cy="43" r="3" fill="#fff" />
                <!-- Mouth -->
                <path d="M 80 60 Q 100 70 120 60" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <!-- Arms -->
                <rect x="30" y="90" width="20" height="40" rx="10" fill="url(#botGradient)" />
                <rect x="150" y="90" width="20" height="40" rx="10" fill="url(#botGradient)" />
                <!-- Legs -->
                <rect x="70" y="150" width="20" height="30" rx="10" fill="#44A5A0" />
                <rect x="110" y="150" width="20" height="30" rx="10" fill="#44A5A0" />
            </svg>
        `,
        happy: `
            <svg viewBox="0 0 200 200" class="character-svg">
                <defs>
                    <linearGradient id="botGradientHappy" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#58CC02;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#4AA002;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <!-- Body -->
                <rect x="50" y="70" width="100" height="80" rx="20" fill="url(#botGradientHappy)" />
                <!-- Head -->
                <circle cx="100" cy="50" r="35" fill="url(#botGradientHappy)" />
                <!-- Antenna (bouncing) -->
                <line x1="100" y1="15" x2="100" y2="5" stroke="#333" stroke-width="3" stroke-linecap="round" class="antenna-bounce" />
                <circle cx="100" cy="5" r="6" fill="#FFD93D" class="antenna-glow" />
                <!-- Eyes (happy) -->
                <path d="M 75 45 Q 85 40 95 45" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <path d="M 105 45 Q 115 40 125 45" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <!-- Mouth (big smile) -->
                <path d="M 75 55 Q 100 75 125 55" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <!-- Arms (raised) -->
                <rect x="30" y="80" width="20" height="40" rx="10" fill="url(#botGradientHappy)" transform="rotate(-30 40 100)" />
                <rect x="150" y="80" width="20" height="40" rx="10" fill="url(#botGradientHappy)" transform="rotate(30 160 100)" />
                <!-- Legs -->
                <rect x="70" y="150" width="20" height="30" rx="10" fill="#4AA002" />
                <rect x="110" y="150" width="20" height="30" rx="10" fill="#4AA002" />
                <!-- Sparkles -->
                <text x="30" y="40" font-size="20" class="sparkle">✨</text>
                <text x="150" y="40" font-size="20" class="sparkle">✨</text>
            </svg>
        `,
        confused: `
            <svg viewBox="0 0 200 200" class="character-svg">
                <defs>
                    <linearGradient id="botGradientConfused" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FFB74D;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FF9800;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <!-- Body -->
                <rect x="50" y="70" width="100" height="80" rx="20" fill="url(#botGradientConfused)" />
                <!-- Head (tilted) -->
                <circle cx="100" cy="50" r="35" fill="url(#botGradientConfused)" transform="rotate(-10 100 50)" />
                <!-- Antenna (question mark) -->
                <text x="90" y="10" font-size="20" fill="#333">?</text>
                <!-- Eyes (confused) -->
                <circle cx="85" cy="45" r="8" fill="#333" />
                <circle cx="115" cy="45" r="6" fill="#333" />
                <!-- Mouth (wavy) -->
                <path d="M 80 60 Q 90 65 100 60 Q 110 55 120 60" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <!-- Arms -->
                <rect x="30" y="90" width="20" height="40" rx="10" fill="url(#botGradientConfused)" />
                <rect x="150" y="90" width="20" height="40" rx="10" fill="url(#botGradientConfused)" />
                <!-- Legs -->
                <rect x="70" y="150" width="20" height="30" rx="10" fill="#FF9800" />
                <rect x="110" y="150" width="20" height="30" rx="10" fill="#FF9800" />
            </svg>
        `,
        chaos: `
            <svg viewBox="0 0 200 200" class="character-svg">
                <defs>
                    <linearGradient id="botGradientChaos" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FF006E;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#8338EC;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#3A86FF;stop-opacity:1" />
                    </linearGradient>
                    <filter id="glitch">
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
                        <feOffset dx="2" dy="2" result="offset" />
                        <feBlend in="SourceGraphic" in2="offset" mode="screen" />
                    </filter>
                </defs>
                <!-- Body (glitching) -->
                <rect x="50" y="70" width="100" height="80" rx="20" fill="url(#botGradientChaos)" filter="url(#glitch)" />
                <!-- Head (spinning) -->
                <circle cx="100" cy="50" r="35" fill="url(#botGradientChaos)" class="spin-slow" />
                <!-- Multiple Antennas -->
                <line x1="85" y1="20" x2="85" y2="10" stroke="#FFD93D" stroke-width="3" stroke-linecap="round" />
                <line x1="100" y1="15" x2="100" y2="5" stroke="#FFD93D" stroke-width="3" stroke-linecap="round" />
                <line x1="115" y1="20" x2="115" y2="10" stroke="#FFD93D" stroke-width="3" stroke-linecap="round" />
                <!-- Crazy Eyes -->
                <circle cx="85" cy="45" r="10" fill="#FFD93D" class="pulse" />
                <circle cx="115" cy="45" r="10" fill="#FF006E" class="pulse-alt" />
                <text x="80" y="50" font-size="16" fill="#333">@</text>
                <text x="110" y="50" font-size="16" fill="#333">@</text>
                <!-- Wild Mouth -->
                <path d="M 70 55 L 80 65 L 90 55 L 100 65 L 110 55 L 120 65 L 130 55" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
                <!-- Chaotic Arms -->
                <rect x="20" y="80" width="30" height="50" rx="15" fill="url(#botGradientChaos)" transform="rotate(-45 35 105)" class="wiggle" />
                <rect x="150" y="80" width="30" height="50" rx="15" fill="url(#botGradientChaos)" transform="rotate(45 165 105)" class="wiggle-alt" />
                <!-- Dancing Legs -->
                <rect x="70" y="150" width="20" height="30" rx="10" fill="#8338EC" class="dance-left" />
                <rect x="110" y="150" width="20" height="30" rx="10" fill="#3A86FF" class="dance-right" />
                <!-- Chaos Particles -->
                <circle cx="40" cy="30" r="3" fill="#FFD93D" class="float-particle" />
                <circle cx="160" cy="40" r="3" fill="#FF006E" class="float-particle-alt" />
                <circle cx="50" cy="140" r="3" fill="#8338EC" class="float-particle" />
            </svg>
        `
    },
    
    // Companion characters
    companions: {
        sparkle: `
            <svg viewBox="0 0 100 100" class="companion-svg">
                <defs>
                    <radialGradient id="sparkleGrad">
                        <stop offset="0%" style="stop-color:#FFD93D;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFA000;stop-opacity:1" />
                    </radialGradient>
                </defs>
                <path d="M 50 10 L 55 40 L 80 35 L 60 50 L 75 70 L 50 60 L 25 70 L 40 50 L 20 35 L 45 40 Z" 
                      fill="url(#sparkleGrad)" class="sparkle-pulse" />
                <circle cx="45" cy="45" r="3" fill="#333" />
                <circle cx="55" cy="45" r="3" fill="#333" />
                <path d="M 40 55 Q 50 60 60 55" stroke="#333" stroke-width="2" fill="none" />
            </svg>
        `,
        
        cloudBuddy: `
            <svg viewBox="0 0 120 100" class="companion-svg">
                <defs>
                    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#E3F2FD;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#90CAF9;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <ellipse cx="40" cy="60" rx="25" ry="20" fill="url(#cloudGrad)" />
                <ellipse cx="60" cy="50" rx="30" ry="25" fill="url(#cloudGrad)" />
                <ellipse cx="80" cy="60" rx="25" ry="20" fill="url(#cloudGrad)" />
                <circle cx="50" cy="50" r="3" fill="#333" />
                <circle cx="70" cy="50" r="3" fill="#333" />
                <path d="M 45 60 Q 60 65 75 60" stroke="#333" stroke-width="2" fill="none" />
            </svg>
        `,
        
        quantumCat: `
            <svg viewBox="0 0 150 150" class="companion-svg">
                <defs>
                    <linearGradient id="quantumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#CE82FF;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8B00FF;stop-opacity:0.5" />
                    </linearGradient>
                </defs>
                <!-- Body (semi-transparent) -->
                <ellipse cx="75" cy="100" rx="40" ry="30" fill="url(#quantumGrad)" opacity="0.8" />
                <!-- Head -->
                <circle cx="75" cy="60" r="30" fill="url(#quantumGrad)" opacity="0.8" />
                <!-- Ears -->
                <path d="M 50 40 L 45 20 L 60 35 Z" fill="url(#quantumGrad)" />
                <path d="M 100 40 L 105 20 L 90 35 Z" fill="url(#quantumGrad)" />
                <!-- Quantum Eyes -->
                <circle cx="65" cy="60" r="5" fill="#FFD93D" class="quantum-phase" />
                <circle cx="85" cy="60" r="5" fill="#FFD93D" class="quantum-phase-alt" />
                <!-- Schrodinger Smile -->
                <path d="M 60 70 Q 75 75 90 70" stroke="#333" stroke-width="2" fill="none" opacity="0.5" />
                <path d="M 60 70 Q 75 65 90 70" stroke="#333" stroke-width="2" fill="none" opacity="0.5" />
                <!-- Tail -->
                <path d="M 115 100 Q 130 90 125 110 Q 140 100 135 120" stroke="url(#quantumGrad)" stroke-width="15" fill="none" class="tail-wave" />
            </svg>
        `
    }
};

// Animation styles
const characterAnimations = `
    <style>
        .character-svg {
            width: 100%;
            height: 100%;
            max-width: 200px;
            max-height: 200px;
        }
        
        .companion-svg {
            width: 80px;
            height: 80px;
        }
        
        /* JazzyBot Animations */
        .antenna-bounce {
            animation: antennaBounce 0.5s ease-in-out infinite alternate;
        }
        
        @keyframes antennaBounce {
            0% { transform: translateY(0); }
            100% { transform: translateY(-3px); }
        }
        
        .antenna-glow {
            animation: glow 1s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
            0% { fill: #FFD93D; }
            100% { fill: #FFF59D; filter: drop-shadow(0 0 5px #FFD93D); }
        }
        
        .sparkle {
            animation: sparkle 0.5s ease-in-out infinite alternate;
        }
        
        @keyframes sparkle {
            0% { opacity: 0.5; transform: scale(1); }
            100% { opacity: 1; transform: scale(1.2); }
        }
        
        /* Chaos Mode Animations */
        .spin-slow {
            animation: spin 3s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .pulse {
            animation: pulse 0.5s ease-in-out infinite alternate;
        }
        
        .pulse-alt {
            animation: pulse 0.5s ease-in-out infinite alternate-reverse;
        }
        
        @keyframes pulse {
            0% { r: 10; }
            100% { r: 12; }
        }
        
        .wiggle {
            animation: wiggle 0.3s ease-in-out infinite alternate;
        }
        
        .wiggle-alt {
            animation: wiggle 0.3s ease-in-out infinite alternate-reverse;
        }
        
        @keyframes wiggle {
            0% { transform: rotate(-45deg); }
            100% { transform: rotate(-35deg); }
        }
        
        .dance-left {
            animation: danceLeft 0.5s ease-in-out infinite alternate;
        }
        
        .dance-right {
            animation: danceRight 0.5s ease-in-out infinite alternate;
        }
        
        @keyframes danceLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-5px); }
        }
        
        @keyframes danceRight {
            0% { transform: translateX(0); }
            100% { transform: translateX(5px); }
        }
        
        .float-particle {
            animation: floatUp 3s ease-in-out infinite;
        }
        
        .float-particle-alt {
            animation: floatUp 3s ease-in-out infinite;
            animation-delay: 1.5s;
        }
        
        @keyframes floatUp {
            0% { transform: translateY(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-30px); opacity: 0; }
        }
        
        /* Companion Animations */
        .sparkle-pulse {
            animation: sparklePulse 2s ease-in-out infinite;
        }
        
        @keyframes sparklePulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        .quantum-phase {
            animation: quantumPhase 2s ease-in-out infinite;
        }
        
        .quantum-phase-alt {
            animation: quantumPhase 2s ease-in-out infinite reverse;
        }
        
        @keyframes quantumPhase {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
        }
        
        .tail-wave {
            animation: tailWave 2s ease-in-out infinite;
        }
        
        @keyframes tailWave {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(5px); }
        }
    </style>
`;

// Character manager
class CharacterManager {
    constructor() {
        this.currentCharacter = 'jazzyBot';
        this.currentState = 'normal';
        this.companions = [];
    }
    
    getCharacterSVG(character = this.currentCharacter, state = this.currentState) {
        if (JazzyPopCharacters[character] && JazzyPopCharacters[character][state]) {
            return JazzyPopCharacters[character][state];
        }
        return JazzyPopCharacters.jazzyBot.normal;
    }
    
    setCharacterState(state) {
        this.currentState = state;
        this.updateCharacterDisplay();
    }
    
    addCompanion(companionType) {
        if (JazzyPopCharacters.companions[companionType]) {
            this.companions.push(companionType);
            return JazzyPopCharacters.companions[companionType];
        }
        return null;
    }
    
    updateCharacterDisplay() {
        const characterContainer = document.getElementById('character-container');
        if (characterContainer) {
            characterContainer.innerHTML = this.getCharacterSVG();
        }
    }
    
    triggerReaction(reaction) {
        const states = {
            'correct': 'happy',
            'wrong': 'confused',
            'streak': 'chaos',
            'thinking': 'normal'
        };
        
        this.setCharacterState(states[reaction] || 'normal');
        
        // Reset to normal after animation
        setTimeout(() => {
            this.setCharacterState('normal');
        }, 2000);
    }
}

// Export for use
export { JazzyPopCharacters, characterAnimations, CharacterManager };
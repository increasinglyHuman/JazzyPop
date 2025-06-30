// JazzyPop Question Type System
class QuestionTypeManager {
    constructor() {
        this.questionTypes = {
            // Fill in the Blank (FIB)
            fillInBlank: {
                id: 'fib',
                name: 'Fill in the Blank',
                icon: '✏️',
                instruction: 'Type the missing word',
                chaosInstructions: {
                    normal: 'Type the missing word',
                    playful: 'Fill the gap with magic!',
                    chaos: 'Insert chaos into the void!'
                },
                component: 'FillInBlankQuestion'
            },
            
            // Multiple Choice
            multipleChoice: {
                id: 'mc',
                name: 'Multiple Choice',
                icon: '🎯',
                instruction: 'Select the correct answer',
                chaosInstructions: {
                    normal: 'Select the correct answer',
                    playful: 'Tap the winning choice!',
                    chaos: 'Choose your reality!'
                },
                component: 'MultipleChoiceQuestion'
            },
            
            // Tap the Pairs
            tapPairs: {
                id: 'pairs',
                name: 'Tap the Pairs',
                icon: '🔗',
                instruction: 'Match the pairs',
                chaosInstructions: {
                    normal: 'Match the pairs',
                    playful: 'Connect the buddies!',
                    chaos: 'Link the dimensions!'
                },
                component: 'TapPairsQuestion'
            },
            
            // Type What You Hear
            typeHear: {
                id: 'audio',
                name: 'Type What You Hear',
                icon: '👂',
                instruction: 'Type what you hear',
                chaosInstructions: {
                    normal: 'Type what you hear',
                    playful: 'Decode the sound waves!',
                    chaos: 'Translate the cosmic whispers!'
                },
                component: 'AudioQuestion'
            },
            
            // Word Order
            wordOrder: {
                id: 'order',
                name: 'Word Order',
                icon: '📝',
                instruction: 'Put the words in order',
                chaosInstructions: {
                    normal: 'Put the words in order',
                    playful: 'Arrange the word puzzle!',
                    chaos: 'Unscramble the timeline!'
                },
                component: 'WordOrderQuestion'
            },
            
            // Select the Image
            selectImage: {
                id: 'image',
                name: 'Select the Image',
                icon: '🖼️',
                instruction: 'Select the matching image',
                chaosInstructions: {
                    normal: 'Select the matching image',
                    playful: 'Spot the picture!',
                    chaos: 'Identify the glitch in the matrix!'
                },
                component: 'ImageSelectQuestion'
            },
            
            // True or False (Binary)
            trueFalse: {
                id: 'binary',
                name: 'True or False',
                icon: '⚡',
                instruction: 'Is this statement true?',
                chaosInstructions: {
                    normal: 'Is this statement true?',
                    playful: 'Real or fake?',
                    chaos: 'Does this exist in your dimension?'
                },
                component: 'TrueFalseQuestion'
            },
            
            // Code Challenge (Special)
            codeChallenge: {
                id: 'code',
                name: 'Code Challenge',
                icon: '💻',
                instruction: 'Complete the code',
                chaosInstructions: {
                    normal: 'Complete the code',
                    playful: 'Debug the magic spell!',
                    chaos: 'Hack the reality matrix!'
                },
                component: 'CodeChallengeQuestion'
            }
        };
    }
    
    getQuestionType(typeId) {
        return this.questionTypes[typeId] || this.questionTypes.fillInBlank;
    }
    
    getInstruction(typeId, mode = 'normal') {
        const type = this.getQuestionType(typeId);
        return type.chaosInstructions[mode] || type.instruction;
    }
    
    getRandomType(excludeTypes = []) {
        const availableTypes = Object.keys(this.questionTypes)
            .filter(key => !excludeTypes.includes(key));
        const randomIndex = Math.floor(Math.random() * availableTypes.length);
        return availableTypes[randomIndex];
    }
}

// Question Components
class QuestionComponents {
    // Fill in the Blank Component
    static FillInBlankQuestion({ question, answer, mode = 'normal' }) {
        const parts = question.split('___');
        
        return `
            <div class="question-container fib-question">
                <div class="question-text">
                    ${parts[0]}
                    <input type="text" 
                           class="fib-input ${mode}-style" 
                           id="answer-input" 
                           placeholder="${mode === 'chaos' ? '???' : '...'}"
                           autocomplete="off"
                           spellcheck="false">
                    ${parts[1] || ''}
                </div>
                ${mode === 'chaos' ? '<div class="chaos-hint floating">The answer lurks between dimensions...</div>' : ''}
            </div>
        `;
    }
    
    // Multiple Choice Component
    static MultipleChoiceQuestion({ question, options, correctIndex, mode = 'normal' }) {
        const shuffledOptions = this.shuffleWithIndex(options, correctIndex);
        
        return `
            <div class="question-container mc-question">
                <div class="question-text">${question}</div>
                <div class="options-grid ${mode}-grid">
                    ${shuffledOptions.map((option, index) => `
                        <button class="option-btn ${mode}-option" 
                                data-correct="${option.isCorrect}"
                                onclick="selectOption(this, ${index})">
                            <span class="option-indicator">${this.getOptionIndicator(index, mode)}</span>
                            <span class="option-text">${option.text}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Tap the Pairs Component
    static TapPairsQuestion({ pairs, mode = 'normal' }) {
        const allItems = this.shufflePairs(pairs);
        
        return `
            <div class="question-container pairs-question">
                <div class="pairs-grid ${mode}-pairs">
                    ${allItems.map((item, index) => `
                        <button class="pair-card ${mode}-card" 
                                data-pair-id="${item.pairId}"
                                data-selected="false"
                                onclick="selectPair(this)">
                            ${mode === 'chaos' ? `<span class="chaos-number">${Math.random().toString(36).substr(2, 3)}</span>` : ''}
                            <span class="pair-text">${item.text}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="pairs-status">
                    <span id="pairs-found">0</span> / ${pairs.length} pairs found
                </div>
            </div>
        `;
    }
    
    // Audio Question Component
    static AudioQuestion({ audioText, mode = 'normal' }) {
        return `
            <div class="question-container audio-question">
                <div class="audio-controls">
                    <button class="audio-btn primary-audio" onclick="playAudio('${audioText}', 'normal')">
                        <span class="audio-icon">🔊</span>
                    </button>
                    <button class="audio-btn slow-audio" onclick="playAudio('${audioText}', 'slow')">
                        <span class="audio-icon">🐌</span>
                    </button>
                    ${mode === 'chaos' ? `
                        <button class="audio-btn chaos-audio" onclick="playAudio('${audioText}', 'chaos')">
                            <span class="audio-icon">🌀</span>
                        </button>
                    ` : ''}
                </div>
                <input type="text" 
                       class="audio-input ${mode}-style" 
                       id="audio-answer" 
                       placeholder="${mode === 'chaos' ? 'Decode the message...' : 'Type what you hear...'}"
                       autocomplete="off">
                ${mode === 'chaos' ? '<div class="sound-waves"></div>' : ''}
            </div>
        `;
    }
    
    // Word Order Component
    static WordOrderQuestion({ words, correctOrder, mode = 'normal' }) {
        const shuffledWords = this.shuffleArray(words);
        
        return `
            <div class="question-container word-order-question">
                <div class="word-bank ${mode}-bank">
                    ${shuffledWords.map((word, index) => `
                        <button class="word-chip ${mode}-chip" 
                                data-word="${word}"
                                onclick="selectWord(this)">
                            ${word}
                        </button>
                    `).join('')}
                </div>
                <div class="sentence-builder ${mode}-builder" id="sentence-builder">
                    <div class="placeholder-text">
                        ${mode === 'chaos' ? 'Construct reality here...' : 'Build your sentence here...'}
                    </div>
                </div>
                <button class="clear-btn" onclick="clearSentence()">Clear</button>
            </div>
        `;
    }
    
    // Image Select Component
    static ImageSelectQuestion({ question, images, correctIndex, mode = 'normal' }) {
        return `
            <div class="question-container image-question">
                <div class="question-text">${question}</div>
                <div class="image-grid ${mode}-images">
                    ${images.map((image, index) => `
                        <button class="image-option ${mode}-image-option" 
                                data-correct="${index === correctIndex}"
                                onclick="selectImage(this, ${index})">
                            <img src="${image.src}" alt="${image.alt}" />
                            ${mode === 'chaos' ? `<div class="glitch-overlay"></div>` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // True/False Component
    static TrueFalseQuestion({ statement, isTrue, mode = 'normal' }) {
        return `
            <div class="question-container true-false-question">
                <div class="statement-box ${mode}-statement">
                    ${statement}
                </div>
                <div class="binary-buttons">
                    <button class="binary-btn true-btn ${mode}-true" 
                            data-answer="true"
                            onclick="selectBinary(this, ${isTrue})">
                        <span class="binary-icon">✓</span>
                        <span>${mode === 'chaos' ? 'EXISTS' : 'TRUE'}</span>
                    </button>
                    <button class="binary-btn false-btn ${mode}-false" 
                            data-answer="false"
                            onclick="selectBinary(this, ${!isTrue})">
                        <span class="binary-icon">✗</span>
                        <span>${mode === 'chaos' ? 'VOID' : 'FALSE'}</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Code Challenge Component
    static CodeChallengeQuestion({ code, blanks, mode = 'normal' }) {
        let codeHtml = code;
        blanks.forEach((blank, index) => {
            codeHtml = codeHtml.replace(
                `___${index}___`,
                `<input type="text" 
                        class="code-input ${mode}-code-input" 
                        data-blank-id="${index}"
                        data-answer="${blank.answer}"
                        placeholder="${mode === 'chaos' ? '?' : '_'}"
                        spellcheck="false">`
            );
        });
        
        return `
            <div class="question-container code-question">
                <pre class="code-block ${mode}-code">
                    <code>${codeHtml}</code>
                </pre>
                ${mode === 'chaos' ? '<div class="matrix-rain"></div>' : ''}
                <div class="code-hints">
                    ${blanks.map((blank, index) => `
                        <div class="code-hint">
                            <span class="hint-number">${index + 1}</span>
                            <span class="hint-text">${blank.hint}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Helper methods
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static shuffleWithIndex(options, correctIndex) {
        return options.map((option, index) => ({
            text: option,
            isCorrect: index === correctIndex
        })).sort(() => Math.random() - 0.5);
    }
    
    static shufflePairs(pairs) {
        const allItems = [];
        pairs.forEach((pair, index) => {
            allItems.push({ text: pair[0], pairId: index });
            allItems.push({ text: pair[1], pairId: index });
        });
        return this.shuffleArray(allItems);
    }
    
    static getOptionIndicator(index, mode) {
        const indicators = {
            normal: ['A', 'B', 'C', 'D'],
            playful: ['🌟', '🎯', '🎨', '🎪'],
            chaos: ['α', 'β', 'γ', 'δ']
        };
        return indicators[mode][index] || (index + 1);
    }
}

// Export for use
export { QuestionTypeManager, QuestionComponents };
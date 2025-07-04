// AI Chaos Question Generator - Maximum Randomization and Fun
const Anthropic = require('@anthropic-ai/sdk');

class AIChaosGenerator {
    constructor(apiKey) {
        this.anthropic = new Anthropic({
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        });
        
        // Chaos modifiers for maximum unpredictability
        this.chaosModifiers = {
            themes: [
                'time-traveling', 'interdimensional', 'underwater', 'space-faring',
                'microscopic', 'giant-sized', 'haunted', 'neon-lit', 'holographic',
                'steampunk', 'cyberpunk', 'solarpunk', 'mythological', 'quantum'
            ],
            characters: [
                'robot unicorns', 'philosophical penguins', 'coding wizards',
                'dancing algorithms', 'sentient emojis', 'time-traveling tacos',
                'quantum cats', 'interdimensional llamas', 'cyber dolphins',
                'ghost programmers', 'alien baristas', 'ninja librarians'
            ],
            scenarios: [
                'dance battle', 'cooking competition', 'escape room',
                'talent show', 'detective mystery', 'game show', 'heist',
                'musical', 'sports tournament', 'fashion show', 'trial',
                'tea party', 'space race', 'treasure hunt', 'karaoke night'
            ],
            twists: [
                'but everything is made of jello',
                'while riding unicycles',
                'in a world where gravity works backwards',
                'but everyone communicates only in haikus',
                'during a solar eclipse',
                'inside a giant snow globe',
                'where colors have flavors',
                'but time moves in loops',
                'in a reality TV show format',
                'where physics laws are suggestions'
            ]
        };
        
        // Question format templates for variety
        this.questionTemplates = [
            'If {character} {action} in a {theme} {scenario}, what would happen?',
            'In a world where {twist}, how would {character} {action}?',
            'What would {character} say about {topic} during a {scenario}?',
            '{character} and {character2} are having a {scenario}. What\'s the most likely outcome?',
            'You\'re a {theme} {character} who needs to {action}. What\'s your strategy?',
            'Which {theme} {character} would be best at {action}?',
            'If {topic} was actually a {scenario} run by {character}, what would be different?',
            'In the {theme} dimension, {character} discovered that {topic} {twist}. What happens next?'
        ];
    }
    
    // Get random element from array
    random(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Generate chaos context
    generateChaosContext() {
        return {
            theme: this.random(this.chaosModifiers.themes),
            character: this.random(this.chaosModifiers.characters),
            character2: this.random(this.chaosModifiers.characters),
            scenario: this.random(this.chaosModifiers.scenarios),
            twist: this.random(this.chaosModifiers.twists)
        };
    }
    
    // Generate questions with maximum chaos
    async generateChaosQuestions(courseContext) {
        const { courseName, topics, count = 5 } = courseContext;
        
        // Generate unique chaos contexts for each question
        const chaosContexts = Array(count).fill(null).map(() => this.generateChaosContext());
        
        const prompt = `You are the CHAOS QUIZ MASTER! Your job is to create wildly entertaining, unpredictable quiz questions that still teach real concepts.

Course: "${courseName}"
${topics && topics.length > 0 ? `Topics: ${topics.join(', ')}` : ''}

Your mission: Create ${count} absolutely BONKERS multiple-choice questions that:
1. Teach real concepts from the course
2. Use completely unexpected scenarios and characters
3. Make people laugh, think, and learn simultaneously
4. Have answers that are technically correct but hilariously presented
5. Include wild "what if" scenarios that relate to the topic

Chaos contexts to use (one per question):
${chaosContexts.map((ctx, i) => `
Question ${i + 1} context:
- Theme: ${ctx.theme}
- Characters: ${ctx.character} and ${ctx.character2}
- Scenario: ${ctx.scenario}
- Twist: ${ctx.twist}
`).join('\n')}

Style Rules:
- Maximum creativity and unexpectedness
- Connect real learning to absurd scenarios
- Make wrong answers entertainingly wrong
- Add unexpected plot twists
- Use vivid, cinematic descriptions
- Include easter eggs and references
- Make each question feel like a mini adventure

Format each question like this:
{
  "questions": [
    {
      "text": "Wild scenario question that teaches a real concept",
      "type": "single",
      "answers": [
        "Hilariously phrased correct answer",
        "Tempting but wrong option with a twist",
        "Absurd option that's clearly wrong",
        "Wild card option that almost makes sense"
      ],
      "correct": [0],
      "explanation": "Mind-blowing explanation that connects the chaos to the actual learning"
    }
  ]
}

UNLEASH THE CHAOS! 🌟🎢🚀`;

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 3000,
                temperature: 0.95, // Maximum creativity
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse chaos response');
            }
            
            const result = JSON.parse(jsonMatch[0]);
            return this.enhanceChaosQuestions(result.questions);
            
        } catch (error) {
            console.error('Error generating chaos questions:', error);
            throw error;
        }
    }
    
    // Add extra chaos elements to questions
    enhanceChaosQuestions(questions) {
        return questions.map(q => {
            // Add random emoji reactions
            const reactions = ['🤯', '🎢', '🌟', '🚀', '🎭', '⚡', '🌈', '🔮', '🎪', '💫'];
            const randomReaction = this.random(reactions);
            
            // Add chaos level indicator
            const chaosLevel = Math.floor(Math.random() * 5) + 1;
            const chaosStars = '🌟'.repeat(chaosLevel);
            
            return {
                ...q,
                text: `${randomReaction} ${q.text}`,
                chaosLevel: chaosLevel,
                chaosIndicator: chaosStars,
                bonusPoints: chaosLevel * 10, // More chaos = more points
                timeLimit: Math.max(15, 60 - (chaosLevel * 10)), // More chaos = less time
                hint: this.generateChaosHint()
            };
        });
    }
    
    // Generate chaos hints
    generateChaosHint() {
        const hints = [
            'Think like a quantum physicist at a disco',
            'Channel your inner time-traveling hamster',
            'What would a philosophical robot do?',
            'The answer is more obvious than a neon elephant',
            'Remember: in chaos, logic is just a suggestion',
            'Trust the absurdity, embrace the learning',
            'Sometimes the weirdest answer is the right answer',
            'Think fourth-dimensionally',
            'The truth is stranger than fiction here',
            'Let your imagination quantum leap'
        ];
        return this.random(hints);
    }
    
    // Generate themed chaos quiz sets
    async generateThemedChaosSet(theme, courseContext) {
        const themes = {
            'retro-future': {
                modifier: 'in a 1980s vision of 2050',
                elements: ['neon grids', 'flying cars', 'robot butlers', 'holographic pets']
            },
            'mythological-tech': {
                modifier: 'where ancient gods use modern technology',
                elements: ['Zeus with smartphones', 'Odin\'s coding bootcamp', 'Athena\'s AI startup']
            },
            'food-universe': {
                modifier: 'in a universe made entirely of food',
                elements: ['pasta planets', 'soup oceans', 'candy mountains', 'vegetable civilizations']
            },
            'musical-reality': {
                modifier: 'where everything is a musical number',
                elements: ['singing algorithms', 'dancing data structures', 'operatic errors', 'rap battles for debugging']
            }
        };
        
        const selectedTheme = themes[theme] || themes['retro-future'];
        
        const enhancedContext = {
            ...courseContext,
            themeModifier: selectedTheme.modifier,
            themeElements: selectedTheme.elements
        };
        
        return this.generateChaosQuestions(enhancedContext);
    }
    
    // Generate progressive chaos levels
    async generateProgressiveChaos(courseContext, startLevel = 1, endLevel = 5) {
        const questions = [];
        
        for (let level = startLevel; level <= endLevel; level++) {
            const levelContext = {
                ...courseContext,
                count: 1,
                chaosIntensity: level
            };
            
            const levelQuestions = await this.generateChaosQuestions(levelContext);
            questions.push(...levelQuestions.map(q => ({
                ...q,
                difficultyLevel: level,
                requiredScore: level * 100
            })));
        }
        
        return questions;
    }
    
    // Generate daily chaos challenge
    async generateDailyChaos(courseContext) {
        const date = new Date();
        const dayOfWeek = date.getDay();
        
        const dailyThemes = [
            'Sleepy Sunday Silliness',
            'Manic Monday Madness',
            'Twisted Tuesday Troubles',
            'Wacky Wednesday Wonders',
            'Throwback Thursday Thrills',
            'Freaky Friday Phenomena',
            'Surreal Saturday Surprises'
        ];
        
        const todayTheme = dailyThemes[dayOfWeek];
        
        const prompt = `Create a DAILY CHAOS CHALLENGE!
        
Today's theme: ${todayTheme}
Course context: ${courseContext.courseName}

Create 3 increasingly chaotic questions that:
1. Start mildly weird (Chaos Level 1-2)
2. Get progressively more bonkers (Chaos Level 3-4)
3. End with maximum absurdity (Chaos Level 5)

Each question should build on the previous one's scenario, creating a mini chaos story!

Make it feel like a wild adventure that happens to teach ${courseContext.courseName} concepts.`;

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.9,
                messages: [{ role: 'user', content: prompt }]
            });
            
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse daily chaos');
            }
            
            const result = JSON.parse(jsonMatch[0]);
            return {
                theme: todayTheme,
                date: date.toISOString().split('T')[0],
                questions: this.enhanceChaosQuestions(result.questions),
                bonusMultiplier: dayOfWeek === 5 ? 2 : 1 // Double points on Fridays!
            };
            
        } catch (error) {
            console.error('Error generating daily chaos:', error);
            throw error;
        }
    }
}

module.exports = AIChaosGenerator;
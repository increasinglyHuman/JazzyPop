// Quiz Generation Service for Learner Mode
// Automatically generates quizzes based on schedule or login events

const AIChaosGenerator = require('./ai-chaos-generator');
const db = require('./database'); // Assume database connection

class QuizGenerationService {
    constructor() {
        this.aiGenerator = new AIChaosGenerator();
        this.config = {
            generationInterval: 3 * 60 * 60 * 1000, // 3 hours
            quizzesPerBatch: 5,
            maxStoredQuizzes: 20,
            difficultyDistribution: {
                easy: 0.4,
                medium: 0.4,
                hard: 0.2
            }
        };
        
        // Seed topics for quiz generation
        this.seedTopics = [
            // Programming
            { category: 'Programming', topics: ['JavaScript Basics', 'Functions', 'Arrays', 'Objects', 'Loops'] },
            { category: 'Web Dev', topics: ['HTML Elements', 'CSS Properties', 'DOM Manipulation', 'Events'] },
            { category: 'Computer Science', topics: ['Algorithms', 'Data Structures', 'Big O', 'Recursion'] },
            
            // General Knowledge
            { category: 'Science', topics: ['Physics', 'Chemistry', 'Biology', 'Space', 'Technology'] },
            { category: 'History', topics: ['Ancient Civilizations', 'World Wars', 'Inventions', 'Famous People'] },
            { category: 'Geography', topics: ['Countries', 'Capitals', 'Landmarks', 'Oceans', 'Mountains'] },
            
            // Fun Topics
            { category: 'Pop Culture', topics: ['Movies', 'Music', 'Games', 'Memes', 'Internet Culture'] },
            { category: 'Random', topics: ['Food', 'Animals', 'Colors', 'Numbers', 'Weird Facts'] }
        ];
    }
    
    // Main generation method - called by scheduler or on login
    async generateQuizzesForLearner(learnerId, trigger = 'scheduled') {
        console.log(`Generating quizzes for learner ${learnerId} - Trigger: ${trigger}`);
        
        try {
            // Check last generation time
            const shouldGenerate = await this.shouldGenerateNew(learnerId, trigger);
            if (!shouldGenerate) {
                console.log('Skipping generation - too recent');
                return null;
            }
            
            // Get learner preferences and history
            const learnerProfile = await this.getLearnerProfile(learnerId);
            
            // Generate quiz batch
            const quizzes = await this.generateQuizBatch(learnerProfile);
            
            // Store quizzes
            await this.storeQuizzes(learnerId, quizzes);
            
            // Update generation timestamp
            await this.updateGenerationTime(learnerId);
            
            // Log analytics
            this.logGeneration(learnerId, quizzes.length, trigger);
            
            return quizzes;
            
        } catch (error) {
            console.error('Quiz generation error:', error);
            return null;
        }
    }
    
    // Check if new generation is needed
    async shouldGenerateNew(learnerId, trigger) {
        if (trigger === 'login') {
            // On login, check if user has enough quizzes
            const availableQuizzes = await this.getAvailableQuizzes(learnerId);
            return availableQuizzes.length < 3; // Generate if less than 3 available
        }
        
        // For scheduled generation, check time interval
        const lastGen = await db.query(
            'SELECT last_generation FROM learner_quiz_meta WHERE learner_id = $1',
            [learnerId]
        );
        
        if (!lastGen.rows[0]) return true;
        
        const timeSinceLastGen = Date.now() - new Date(lastGen.rows[0].last_generation).getTime();
        return timeSinceLastGen >= this.config.generationInterval;
    }
    
    // Get learner profile for personalization
    async getLearnerProfile(learnerId) {
        const profile = await db.query(`
            SELECT 
                l.id,
                l.skill_level,
                l.preferred_topics,
                l.learning_pace,
                COUNT(DISTINCT qa.quiz_id) as quizzes_completed,
                AVG(qa.score) as avg_score,
                array_agg(DISTINCT q.topic) as completed_topics
            FROM learners l
            LEFT JOIN quiz_attempts qa ON l.id = qa.learner_id
            LEFT JOIN quizzes q ON qa.quiz_id = q.id
            WHERE l.id = $1
            GROUP BY l.id
        `, [learnerId]);
        
        return profile.rows[0] || {
            id: learnerId,
            skill_level: 'beginner',
            preferred_topics: [],
            learning_pace: 'normal',
            quizzes_completed: 0,
            avg_score: 0,
            completed_topics: []
        };
    }
    
    // Generate a batch of quizzes
    async generateQuizBatch(learnerProfile) {
        const quizzes = [];
        const batchSize = this.getBatchSize(learnerProfile);
        
        for (let i = 0; i < batchSize; i++) {
            const quizConfig = this.getQuizConfig(learnerProfile, i);
            const quiz = await this.generateSingleQuiz(quizConfig);
            quizzes.push(quiz);
        }
        
        return quizzes;
    }
    
    // Determine batch size based on learner activity
    getBatchSize(profile) {
        // More active learners get more quizzes
        if (profile.quizzes_completed > 50) return 7;
        if (profile.quizzes_completed > 20) return 6;
        return this.config.quizzesPerBatch;
    }
    
    // Configure individual quiz parameters
    getQuizConfig(profile, index) {
        // Mix of topics - some from preferences, some new
        const topicPool = this.getTopicPool(profile);
        const selectedTopic = topicPool[Math.floor(Math.random() * topicPool.length)];
        
        // Vary difficulty based on performance
        const difficulty = this.selectDifficulty(profile.avg_score, index);
        
        // Vary chaos level for fun
        const chaosLevel = this.selectChaosLevel(profile, index);
        
        // Special quiz types
        const isSpecial = index === 0 || index === batchSize - 1;
        
        return {
            topic: selectedTopic,
            difficulty: difficulty,
            chaosLevel: chaosLevel,
            questionCount: isSpecial ? 15 : 10,
            timeLimit: isSpecial ? 10 : 5,
            bonusMultiplier: isSpecial ? 2 : 1,
            specialType: this.getSpecialType(index)
        };
    }
    
    // Get topic pool for learner
    getTopicPool(profile) {
        const pool = [];
        
        // Add preferred topics (if any)
        if (profile.preferred_topics && profile.preferred_topics.length > 0) {
            pool.push(...profile.preferred_topics);
        }
        
        // Add some topics they haven't tried recently
        const allTopics = this.seedTopics.flatMap(cat => cat.topics);
        const newTopics = allTopics.filter(topic => 
            !profile.completed_topics || !profile.completed_topics.includes(topic)
        );
        pool.push(...newTopics.slice(0, 3));
        
        // Add some random topics for variety
        const randomCategory = this.seedTopics[Math.floor(Math.random() * this.seedTopics.length)];
        pool.push(...randomCategory.topics.slice(0, 2));
        
        return [...new Set(pool)]; // Remove duplicates
    }
    
    // Select difficulty based on performance
    selectDifficulty(avgScore, index) {
        if (index === 0) return 'easy'; // First quiz is always easy
        
        if (avgScore > 80) {
            return Math.random() > 0.3 ? 'hard' : 'medium';
        } else if (avgScore > 60) {
            return Math.random() > 0.5 ? 'medium' : 'easy';
        } else {
            return Math.random() > 0.7 ? 'easy' : 'medium';
        }
    }
    
    // Select chaos level for variety
    selectChaosLevel(profile, index) {
        const levels = ['normal', 'playful', 'chaos'];
        
        // First quiz is always normal
        if (index === 0) return 'normal';
        
        // Experienced players get more chaos
        if (profile.quizzes_completed > 30) {
            return levels[Math.floor(Math.random() * levels.length)];
        }
        
        // New players mostly get normal/playful
        return Math.random() > 0.8 ? 'chaos' : (Math.random() > 0.5 ? 'playful' : 'normal');
    }
    
    // Determine special quiz types
    getSpecialType(index) {
        const types = [
            { type: 'morning_boost', icon: '☀️', name: 'Morning Brain Boost' },
            { type: 'quick_fire', icon: '⚡', name: 'Quick Fire Round' },
            { type: 'deep_dive', icon: '🌊', name: 'Deep Dive Challenge' },
            { type: 'mixed_bag', icon: '🎲', name: 'Mixed Bag Surprise' },
            { type: 'speed_demon', icon: '🏃', name: 'Speed Demon' }
        ];
        
        return types[index % types.length];
    }
    
    // Generate single quiz with AI
    async generateSingleQuiz(config) {
        const courseContext = {
            courseName: config.topic,
            courseDescription: `A ${config.difficulty} level quiz about ${config.topic}`,
            topics: this.getSubtopics(config.topic),
            count: config.questionCount
        };
        
        // Use appropriate generator based on chaos level
        let questions;
        if (config.chaosLevel === 'chaos') {
            questions = await this.aiGenerator.generateChaosQuestions(courseContext);
        } else {
            // Use standard generator with mode modifier
            questions = await this.aiGenerator.generateKawaiiQuestions({
                ...courseContext,
                style: config.chaosLevel === 'playful' ? 'playful and fun' : 'clear and friendly'
            });
        }
        
        return {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: config.specialType.name,
            icon: config.specialType.icon,
            topic: config.topic,
            difficulty: config.difficulty,
            chaosLevel: config.chaosLevel,
            questions: questions,
            questionCount: questions.length,
            timeLimit: config.timeLimit,
            xpReward: this.calculateXP(config),
            gemReward: this.calculateGems(config),
            bonusMultiplier: config.bonusMultiplier,
            specialType: config.specialType.type,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
    }
    
    // Get subtopics for a main topic
    getSubtopics(topic) {
        const subtopics = {
            'JavaScript Basics': ['variables', 'data types', 'operators', 'conditionals'],
            'Functions': ['declaration', 'parameters', 'return values', 'scope'],
            'Arrays': ['methods', 'iteration', 'manipulation', 'searching'],
            // ... more mappings
        };
        
        return subtopics[topic] || [topic];
    }
    
    // Calculate XP rewards
    calculateXP(config) {
        const base = {
            easy: 50,
            medium: 75,
            hard: 100
        }[config.difficulty];
        
        const chaosBonus = {
            normal: 1,
            playful: 1.2,
            chaos: 1.5
        }[config.chaosLevel];
        
        return Math.floor(base * chaosBonus * config.bonusMultiplier);
    }
    
    // Calculate gem rewards
    calculateGems(config) {
        const base = {
            easy: 20,
            medium: 30,
            hard: 50
        }[config.difficulty];
        
        return Math.floor(base * config.bonusMultiplier);
    }
    
    // Store generated quizzes
    async storeQuizzes(learnerId, quizzes) {
        // Clean up old quizzes first
        await this.cleanupOldQuizzes(learnerId);
        
        // Store new quizzes
        for (const quiz of quizzes) {
            await db.query(`
                INSERT INTO learner_quizzes 
                (id, learner_id, quiz_data, created_at, expires_at, status)
                VALUES ($1, $2, $3, $4, $5, 'available')
            `, [quiz.id, learnerId, JSON.stringify(quiz), quiz.createdAt, quiz.expiresAt]);
        }
    }
    
    // Clean up expired or excess quizzes
    async cleanupOldQuizzes(learnerId) {
        // Remove expired quizzes
        await db.query(`
            DELETE FROM learner_quizzes 
            WHERE learner_id = $1 
            AND (expires_at < NOW() OR status = 'completed')
        `, [learnerId]);
        
        // Keep only most recent if over limit
        await db.query(`
            DELETE FROM learner_quizzes
            WHERE learner_id = $1
            AND id NOT IN (
                SELECT id FROM learner_quizzes
                WHERE learner_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            )
        `, [learnerId, this.config.maxStoredQuizzes]);
    }
    
    // Update generation timestamp
    async updateGenerationTime(learnerId) {
        await db.query(`
            INSERT INTO learner_quiz_meta (learner_id, last_generation, total_generated)
            VALUES ($1, NOW(), 1)
            ON CONFLICT (learner_id) 
            DO UPDATE SET 
                last_generation = NOW(),
                total_generated = learner_quiz_meta.total_generated + 1
        `, [learnerId]);
    }
    
    // Get available quizzes for learner
    async getAvailableQuizzes(learnerId) {
        const result = await db.query(`
            SELECT quiz_data 
            FROM learner_quizzes
            WHERE learner_id = $1 
            AND status = 'available'
            AND expires_at > NOW()
            ORDER BY created_at DESC
        `, [learnerId]);
        
        return result.rows.map(row => row.quiz_data);
    }
    
    // Log generation event for analytics
    logGeneration(learnerId, count, trigger) {
        console.log(`Quiz Generation - Learner: ${learnerId}, Count: ${count}, Trigger: ${trigger}`);
        // In production, send to analytics service
    }
    
    // Scheduled generation for all active learners
    async runScheduledGeneration() {
        console.log('Running scheduled quiz generation...');
        
        const activeLearners = await db.query(`
            SELECT DISTINCT l.id 
            FROM learners l
            JOIN quiz_attempts qa ON l.id = qa.learner_id
            WHERE qa.created_at > NOW() - INTERVAL '7 days'
        `);
        
        for (const learner of activeLearners.rows) {
            await this.generateQuizzesForLearner(learner.id, 'scheduled');
        }
        
        console.log(`Generated quizzes for ${activeLearners.rows.length} active learners`);
    }
}

// Export for use
module.exports = QuizGenerationService;
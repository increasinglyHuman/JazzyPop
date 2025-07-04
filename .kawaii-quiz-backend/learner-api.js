// Learner API Endpoints
// Handles quiz delivery and learner interactions

const express = require('express');
const router = express.Router();
const QuizGenerationService = require('./quiz-generation-service');
const db = require('./database');

const quizService = new QuizGenerationService();

// Middleware to verify learner
const verifyLearner = async (req, res, next) => {
    const learnerId = req.headers['x-learner-id'] || req.query.userId;
    
    if (!learnerId) {
        return res.status(401).json({ error: 'Learner ID required' });
    }
    
    req.learnerId = learnerId;
    next();
};

// GET /api/learner/dashboard
// Get learner dashboard data including available quizzes
router.get('/dashboard', verifyLearner, async (req, res) => {
    try {
        const learnerId = req.learnerId;
        
        // Check if login trigger should generate new quizzes
        const lastLogin = await getLastLogin(learnerId);
        const isNewSession = !lastLogin || (Date.now() - lastLogin > 60 * 60 * 1000); // 1 hour
        
        if (isNewSession) {
            // Generate quizzes on login if needed
            await quizService.generateQuizzesForLearner(learnerId, 'login');
            await updateLastLogin(learnerId);
        }
        
        // Get learner stats
        const stats = await getLearnerStats(learnerId);
        
        // Get available quizzes
        const quizzes = await quizService.getAvailableQuizzes(learnerId);
        
        // Get time until next generation
        const nextGeneration = await getNextGenerationTime(learnerId);
        
        // Format response
        const dashboard = {
            learner: {
                id: learnerId,
                level: calculateLevel(stats.totalXp),
                stats: {
                    streak: stats.currentStreak,
                    gems: stats.gems,
                    xp: stats.totalXp,
                    hearts: stats.hearts || 5
                },
                dailyGoal: {
                    target: 5,
                    completed: stats.dailyQuizzes || 0
                }
            },
            quizzes: {
                available: formatQuizzes(quizzes),
                nextRefresh: nextGeneration,
                categories: categorizeQuizzes(quizzes)
            },
            achievements: {
                recent: stats.recentAchievements || [],
                nextMilestone: getNextMilestone(stats)
            }
        };
        
        res.json(dashboard);
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// GET /api/learner/quiz/:quizId
// Get specific quiz questions
router.get('/quiz/:quizId', verifyLearner, async (req, res) => {
    try {
        const { quizId } = req.params;
        const learnerId = req.learnerId;
        
        // Get quiz
        const quiz = await getQuizForLearner(learnerId, quizId);
        
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        // Mark as started
        await markQuizStarted(learnerId, quizId);
        
        // Return quiz data
        res.json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                icon: quiz.icon,
                questions: quiz.questions,
                timeLimit: quiz.timeLimit,
                rewards: {
                    xp: quiz.xpReward,
                    gems: quiz.gemReward,
                    bonus: quiz.bonusMultiplier > 1
                }
            },
            config: {
                chaosLevel: quiz.chaosLevel,
                difficulty: quiz.difficulty
            }
        });
        
    } catch (error) {
        console.error('Quiz fetch error:', error);
        res.status(500).json({ error: 'Failed to load quiz' });
    }
});

// POST /api/learner/quiz/:quizId/complete
// Submit quiz results
router.post('/quiz/:quizId/complete', verifyLearner, async (req, res) => {
    try {
        const { quizId } = req.params;
        const { answers, timeSpent } = req.body;
        const learnerId = req.learnerId;
        
        // Validate quiz
        const quiz = await getQuizForLearner(learnerId, quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        // Calculate score
        const results = calculateQuizResults(quiz, answers);
        
        // Update learner stats
        const updatedStats = await updateLearnerStats(learnerId, {
            xpEarned: results.xpEarned,
            gemsEarned: results.gemsEarned,
            correctAnswers: results.correct,
            totalAnswers: results.total,
            timeSpent: timeSpent
        });
        
        // Mark quiz as completed
        await markQuizCompleted(learnerId, quizId, results.score);
        
        // Check achievements
        const newAchievements = await checkAchievements(learnerId, updatedStats);
        
        // Return results
        res.json({
            results: {
                score: results.score,
                correct: results.correct,
                total: results.total,
                xpEarned: results.xpEarned,
                gemsEarned: results.gemsEarned,
                streakMaintained: updatedStats.streakMaintained
            },
            achievements: newAchievements,
            nextSteps: {
                moreQuizzes: await quizService.getAvailableQuizzes(learnerId).length,
                dailyProgress: updatedStats.dailyProgress
            }
        });
        
    } catch (error) {
        console.error('Quiz completion error:', error);
        res.status(500).json({ error: 'Failed to complete quiz' });
    }
});

// Helper functions
async function getLearnerStats(learnerId) {
    const result = await db.query(`
        SELECT 
            total_xp,
            gems,
            current_streak,
            hearts,
            daily_quizzes,
            last_active
        FROM learner_stats
        WHERE learner_id = $1
    `, [learnerId]);
    
    return result.rows[0] || {
        totalXp: 0,
        gems: 0,
        currentStreak: 0,
        hearts: 5,
        dailyQuizzes: 0
    };
}

async function getNextGenerationTime(learnerId) {
    const result = await db.query(`
        SELECT last_generation 
        FROM learner_quiz_meta 
        WHERE learner_id = $1
    `, [learnerId]);
    
    if (!result.rows[0]) {
        return { timeUntilNext: 0, canGenerateNow: true };
    }
    
    const lastGen = new Date(result.rows[0].last_generation).getTime();
    const nextGen = lastGen + (3 * 60 * 60 * 1000); // 3 hours
    const timeUntilNext = Math.max(0, nextGen - Date.now());
    
    return {
        timeUntilNext: timeUntilNext,
        nextGenerationTime: new Date(nextGen).toISOString(),
        canGenerateNow: timeUntilNext === 0
    };
}

function formatQuizzes(quizzes) {
    return quizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        icon: quiz.icon,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questionCount: quiz.questionCount,
        timeLimit: quiz.timeLimit,
        rewards: {
            xp: quiz.xpReward,
            gems: quiz.gemReward,
            multiplier: quiz.bonusMultiplier
        },
        special: quiz.specialType !== 'standard',
        expiresIn: new Date(quiz.expiresAt).getTime() - Date.now()
    }));
}

function categorizeQuizzes(quizzes) {
    const categories = {
        daily: [],
        special: [],
        practice: []
    };
    
    quizzes.forEach(quiz => {
        if (quiz.bonusMultiplier > 1) {
            categories.special.push(quiz.id);
        } else if (quiz.difficulty === 'easy') {
            categories.practice.push(quiz.id);
        } else {
            categories.daily.push(quiz.id);
        }
    });
    
    return categories;
}

function calculateLevel(xp) {
    return Math.floor(xp / 1000) + 1;
}

function calculateQuizResults(quiz, answers) {
    let correct = 0;
    const total = quiz.questions.length;
    
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correct) {
            correct++;
        }
    });
    
    const score = Math.round((correct / total) * 100);
    const baseXp = quiz.xpReward;
    const baseGems = quiz.gemReward;
    
    // Scale rewards based on performance
    const performanceMultiplier = score >= 80 ? 1.0 : (score >= 60 ? 0.8 : 0.6);
    
    return {
        score,
        correct,
        total,
        xpEarned: Math.floor(baseXp * performanceMultiplier),
        gemsEarned: Math.floor(baseGems * performanceMultiplier)
    };
}

async function updateLearnerStats(learnerId, results) {
    // Update XP and gems
    await db.query(`
        UPDATE learner_stats
        SET 
            total_xp = total_xp + $2,
            gems = gems + $3,
            daily_quizzes = daily_quizzes + 1,
            last_active = NOW()
        WHERE learner_id = $1
    `, [learnerId, results.xpEarned, results.gemsEarned]);
    
    // Check and update streak
    const streakMaintained = await updateStreak(learnerId);
    
    return {
        streakMaintained,
        dailyProgress: await getDailyProgress(learnerId)
    };
}

async function checkAchievements(learnerId, stats) {
    const achievements = [];
    
    // Check various achievement conditions
    if (stats.dailyProgress === 5) {
        achievements.push({
            id: 'daily_goal',
            name: 'Daily Goal Complete!',
            icon: '🎯',
            reward: { gems: 50 }
        });
    }
    
    if (stats.streakMaintained && stats.currentStreak === 7) {
        achievements.push({
            id: 'week_streak',
            name: 'Week Streak!',
            icon: '🔥',
            reward: { gems: 100, xp: 200 }
        });
    }
    
    // Store achievements
    for (const achievement of achievements) {
        await db.query(`
            INSERT INTO learner_achievements (learner_id, achievement_id, earned_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT DO NOTHING
        `, [learnerId, achievement.id]);
    }
    
    return achievements;
}

// Scheduled task to generate quizzes
function startScheduledGeneration() {
    // Run every 3 hours
    setInterval(async () => {
        console.log('Running scheduled quiz generation...');
        try {
            await quizService.runScheduledGeneration();
        } catch (error) {
            console.error('Scheduled generation error:', error);
        }
    }, 3 * 60 * 60 * 1000);
    
    // Also run at specific times for peak engagement
    const scheduleTimes = ['08:00', '12:00', '18:00', '21:00'];
    // Implementation for specific time scheduling...
}

// Initialize scheduled tasks
startScheduledGeneration();

module.exports = router;
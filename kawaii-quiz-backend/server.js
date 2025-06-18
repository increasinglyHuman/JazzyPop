// Simple Node.js backend for Kawaii Quiz
// This would be deployed on p0qp0q.com

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase (or use your preferred database)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for the quiz app
app.use('/kawaii-quiz', express.static('../kawaii-quiz-app'));

// API Routes
const apiRouter = express.Router();

// Get quiz for a course
apiRouter.get('/quiz/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const { data, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('course_id', courseId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // No quiz found
                return res.status(404).json({ message: 'Quiz not found' });
            }
            throw error;
        }
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save/Update quiz
apiRouter.post('/quiz', async (req, res) => {
    try {
        const quizData = req.body;
        
        // Check if quiz exists
        const { data: existing } = await supabase
            .from('quizzes')
            .select('id')
            .eq('course_id', quizData.courseId)
            .single();
        
        if (existing) {
            // Update existing quiz
            const { data, error } = await supabase
                .from('quizzes')
                .update({
                    questions: quizData.questions,
                    updated_by: quizData.updatedBy,
                    updated_at: quizData.updatedAt
                })
                .eq('course_id', quizData.courseId)
                .select()
                .single();
            
            if (error) throw error;
            res.json(data);
        } else {
            // Create new quiz
            const { data, error } = await supabase
                .from('quizzes')
                .insert({
                    course_id: quizData.courseId,
                    questions: quizData.questions,
                    created_by: quizData.updatedBy,
                    created_at: quizData.updatedAt
                })
                .select()
                .single();
            
            if (error) throw error;
            res.json(data);
        }
    } catch (error) {
        console.error('Error saving quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save quiz attempt
apiRouter.post('/attempt', async (req, res) => {
    try {
        const attemptData = req.body;
        
        const { data, error } = await supabase
            .from('quiz_attempts')
            .insert({
                user_id: attemptData.userId,
                course_id: attemptData.courseId,
                score: attemptData.score,
                total: attemptData.total,
                percentage: attemptData.percentage,
                completed_at: attemptData.completedAt
            })
            .select()
            .single();
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error saving attempt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get AI suggestions (placeholder)
apiRouter.post('/ai-suggestions', async (req, res) => {
    try {
        const { courseName, courseContent } = req.body;
        
        // TODO: Implement OpenAI/Claude API call here
        // For now, return mock suggestions
        
        const suggestions = [
            {
                text: "What is the main purpose of " + courseName + "?",
                type: "single",
                answers: [
                    "To learn new skills",
                    "To pass certification",
                    "To improve performance",
                    "All of the above"
                ],
                correct: [3]
            },
            {
                text: "Which of the following are key concepts in this course?",
                type: "multiple",
                answers: [
                    "Core principles",
                    "Best practices",
                    "Common mistakes",
                    "Advanced techniques"
                ],
                correct: [0, 1]
            }
        ];
        
        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mount API routes
app.use('/api/kawaii-quiz', apiRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Kawaii Quiz backend running on port ${PORT}`);
});
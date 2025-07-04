// Simplified backend using JSON file storage (no database needed)
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for the quiz app
app.use('/kawaii-quiz', express.static(path.join(__dirname, '../kawaii-quiz-app')));

// API Routes
const apiRouter = express.Router();

// Get quiz for a course
apiRouter.get('/quiz/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const filePath = path.join(DATA_DIR, `quiz-${courseId}.json`);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            res.json(JSON.parse(data));
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.status(404).json({ message: 'Quiz not found' });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save/Update quiz
apiRouter.post('/quiz', async (req, res) => {
    try {
        const quizData = req.body;
        const filePath = path.join(DATA_DIR, `quiz-${quizData.courseId}.json`);
        
        await fs.writeFile(filePath, JSON.stringify(quizData, null, 2));
        res.json(quizData);
    } catch (error) {
        console.error('Error saving quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save quiz attempt
apiRouter.post('/attempt', async (req, res) => {
    try {
        const attemptData = req.body;
        const filePath = path.join(DATA_DIR, 'attempts.json');
        
        let attempts = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            attempts = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet, that's ok
        }
        
        attempts.push({
            id: Date.now().toString(),
            ...attemptData
        });
        
        await fs.writeFile(filePath, JSON.stringify(attempts, null, 2));
        res.json(attemptData);
    } catch (error) {
        console.error('Error saving attempt:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get course details using admin credentials
apiRouter.get('/course-details/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // First, get admin access token using refresh token
        const refreshToken = process.env.ALM_ADMIN_REFRESH_TOKEN;
        const clientId = process.env.ALM_CLIENT_ID;
        const clientSecret = process.env.ALM_CLIENT_SECRET;
        
        if (!refreshToken || !clientId || !clientSecret) {
            return res.status(500).json({ 
                error: 'ALM credentials not configured',
                message: 'Please set ALM_ADMIN_REFRESH_TOKEN, ALM_CLIENT_ID, and ALM_CLIENT_SECRET in .env'
            });
        }
        
        // Get access token
        const tokenResponse = await fetch('https://learningmanager.adobe.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        
        if (!tokenResponse.ok) {
            throw new Error('Failed to get access token');
        }
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        // Now fetch course details
        const courseResponse = await fetch(
            `https://learningmanager.adobe.com/primeapi/v2/learningObjects/${courseId}?include=skills,instances.badge,instances.l1FeedbackInfo,subLOs.instances.badge,supplementaryResources`,
            {
                headers: {
                    'Authorization': `oauth ${accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!courseResponse.ok) {
            throw new Error('Failed to fetch course details');
        }
        
        const courseData = await courseResponse.json();
        res.json(courseData);
        
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch course details',
            message: error.message 
        });
    }
});

// AI Question Generation endpoint
apiRouter.post('/ai-suggestions', async (req, res) => {
    try {
        const { courseName, courseDescription, courseOverview, topics, style = 'kawaii' } = req.body;
        
        // Load AI integration if not already loaded
        if (!global.aiGenerator) {
            try {
                const AIQuestionGenerator = require('./ai-integration');
                global.aiGenerator = new AIQuestionGenerator();
            } catch (error) {
                return res.status(501).json({ 
                    error: 'AI generation not available',
                    message: 'Please install @anthropic-ai/sdk'
                });
            }
        }
        
        // Generate questions based on style
        let questions;
        if (style === 'kawaii') {
            questions = await global.aiGenerator.generateKawaiiQuestions({
                courseName,
                courseDescription,
                topics,
                count: 5
            });
        } else {
            questions = await global.aiGenerator.generateQuestions({
                courseName,
                courseDescription,
                topics,
                count: 5
            });
        }
        
        res.json({ questions });
    } catch (error) {
        console.error('Error generating AI questions:', error);
        res.status(500).json({ 
            error: 'Failed to generate questions',
            message: error.message 
        });
    }
});

// ALM API Proxy endpoint (to handle CORS)
apiRouter.get('/alm-proxy/*', async (req, res) => {
    try {
        const almPath = req.params[0];
        const authToken = req.headers.authorization || req.query.authToken;
        
        if (!authToken) {
            return res.status(401).json({ error: 'No auth token provided' });
        }
        
        // Build the full URL properly
        let almUrl = `https://learningmanager.adobe.com/primeapi/v2/${almPath}`;
        
        // Remove authToken from query string and handle query params properly
        const queryParams = new URLSearchParams(req.query);
        queryParams.delete('authToken'); // Remove authToken from query
        
        if (queryParams.toString()) {
            // Check if almPath already has query params
            if (almPath.includes('?')) {
                almUrl += '&' + queryParams.toString();
            } else {
                almUrl += '?' + queryParams.toString();
            }
        }
        
        console.log('ALM Proxy Request:', almUrl);
        
        // Handle different token formats
        let authHeader = authToken;
        if (authToken.startsWith('natext_')) {
            // Native extension token format
            authHeader = `oauth ${authToken}`;
        } else if (!authToken.startsWith('oauth ')) {
            authHeader = `oauth ${authToken}`;
        }
        
        console.log('Using auth header:', authHeader.substring(0, 20) + '...');
        
        const response = await fetch(almUrl, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });
        
        console.log('ALM API Response:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ALM API error details:', errorText);
            return res.status(response.status).json({ 
                error: 'ALM API error', 
                status: response.status,
                statusText: response.statusText,
                details: errorText 
            });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('ALM proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from ALM', details: error.message });
    }
});

// Mount API routes
app.use('/api/kawaii-quiz', apiRouter);

// Initialize and start server
ensureDataDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Kawaii Quiz backend running on port ${PORT}`);
    });
});
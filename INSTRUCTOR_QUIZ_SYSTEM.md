# JazzyPop Instructor Quiz System

## Overview
Instructor-assigned quizzes are separate from the fun, auto-generated quizzes. They provide controlled assessment with LMS integration while still feeling engaging.

## Key Differences

### 1. Quiz Sources
```
AUTO-GENERATED (Fun)          INSTRUCTOR-ASSIGNED (Academic)
├── Every 3 hours            ├── Pushed by instructor
├── AI-generated             ├── Manually created/curated
├── Chaos mode available     ├── Normal mode only
├── Hearts system active     ├── Health immunity (no hearts lost)
└── Topic variety            └── Course-aligned content
```

### 2. Visual Distinction

```javascript
// Assigned Quiz Card Style
.assigned-quiz-card {
    background: var(--bg-card);
    border: 2px solid var(--secondary);  // Different border color
    position: relative;
}

.assigned-badge {
    position: absolute;
    top: -2px;
    left: -2px;
    background: var(--secondary);
    color: white;
    padding: 4px 12px;
    border-radius: var(--radius) 0 var(--radius) 0;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
}

// Badge shows: 📚 ASSIGNED
```

### 3. Dashboard Organization

```
[Dashboard]
├── Assigned Quizzes (Top Priority)
│   ├── Due Soon
│   ├── This Week
│   └── Completed
├── Today's Fun Quizzes
└── Special Challenges
```

## Implementation

### 1. Instructor Control Panel

```javascript
// instructor-quiz-builder.js
class InstructorQuizBuilder {
    constructor() {
        this.quizTemplate = {
            id: null,
            title: '',
            courseId: '',
            questions: [],
            dueDate: null,
            settings: {
                timeLimit: 30,
                attempts: 3,
                showCorrectAnswers: 'after_due_date',
                randomizeQuestions: true,
                randomizeAnswers: true
            },
            rewards: {
                xp: 100,      // Fixed XP for completion
                gems: 50,     // Fixed gems for completion
                bonusXp: 50   // Bonus for high scores
            }
        };
    }
    
    addQuestion(question) {
        // Structured question format
        return {
            id: generateId(),
            type: question.type, // mcq, fib, true_false
            question: question.text,
            answers: question.answers,
            correct: question.correct,
            explanation: question.explanation,
            points: question.points || 10
        };
    }
}
```

### 2. Learner Experience

```javascript
// assigned-quiz-handler.js
class AssignedQuizHandler {
    constructor() {
        this.healthImmunity = true;  // No hearts lost
        this.chaosEnabled = false;   // No chaos mode
        this.tracking = {
            startTime: null,
            endTime: null,
            answers: [],
            score: 0
        };
    }
    
    handleWrongAnswer(questionId, answer) {
        // Track for reporting but don't deduct hearts
        this.tracking.answers.push({
            questionId,
            answer,
            correct: false,
            timestamp: Date.now()
        });
        
        // Show encouraging feedback
        return {
            feedback: "Not quite right, but keep going! No hearts lost on assigned quizzes.",
            heartsLost: 0
        };
    }
}
```

### 3. Reporting Integration

```javascript
// lxp-reporting.js
class LXPReporting {
    async submitQuizResults(learnerId, quizId, results) {
        const report = {
            learnerId,
            quizId,
            courseId: results.courseId,
            score: results.score,
            percentage: results.percentage,
            timeSpent: results.timeSpent,
            completedAt: new Date().toISOString(),
            questions: results.questions.map(q => ({
                id: q.id,
                correct: q.correct,
                answer: q.answer,
                timeSpent: q.timeSpent
            }))
        };
        
        // Send to LXP
        await this.sendToLXP(report);
        
        // Also store locally for instructor dashboard
        await this.storeResults(report);
    }
    
    async sendToLXP(report) {
        // xAPI statement format
        const statement = {
            actor: { mbox: `mailto:${report.learnerId}` },
            verb: { id: "http://adlnet.gov/expapi/verbs/completed" },
            object: {
                id: `${BASE_URL}/quiz/${report.quizId}`,
                definition: {
                    type: "http://adlnet.gov/expapi/activities/assessment",
                    name: { "en-US": "Assigned Quiz" }
                }
            },
            result: {
                score: {
                    scaled: report.percentage / 100,
                    raw: report.score,
                    max: 100
                },
                success: report.percentage >= 70,
                completion: true,
                duration: `PT${report.timeSpent}S`
            }
        };
        
        return await fetch(LXP_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-Experience-API-Version': '1.0.3',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${LXP_AUTH}`
            },
            body: JSON.stringify(statement)
        });
    }
}
```

### 4. Visual Separation in Dashboard

```html
<!-- Assigned Quizzes Section -->
<section class="section assigned-section">
    <div class="section-header">
        <div>
            <h2 class="section-title">📚 Assigned Quizzes</h2>
            <p class="section-subtitle">From your instructors</p>
        </div>
        <div class="due-soon-indicator">
            <span class="pulse-dot"></span>
            2 due this week
        </div>
    </div>
    
    <div class="quiz-grid">
        <!-- Assigned Quiz Card -->
        <div class="quiz-card assigned-quiz-card" onclick="startAssignedQuiz('cs101-week3')">
            <div class="assigned-badge">
                <span>📚</span>
                <span>ASSIGNED</span>
            </div>
            <div class="quiz-header">
                <div>
                    <div class="quiz-icon">💻</div>
                    <h3 class="quiz-title">CS101: Arrays & Loops</h3>
                    <p class="course-name">Introduction to Programming</p>
                </div>
                <div class="due-date">
                    <span class="due-label">Due</span>
                    <span class="due-time">Tomorrow</span>
                </div>
            </div>
            <p class="quiz-description">Test your understanding of array methods and loop constructs.</p>
            <div class="quiz-footer">
                <div class="quiz-stats">
                    <span>20 questions</span>
                    <span>30 min</span>
                    <span>3 attempts</span>
                </div>
                <div class="quiz-reward">
                    <span class="immunity-badge">❤️ Protected</span>
                    +100 ⚡ +50 💎
                </div>
            </div>
        </div>
    </div>
</section>
```

### 5. Instructor Dashboard

```javascript
// instructor-dashboard.js
class InstructorDashboard {
    async getClassProgress(courseId) {
        const results = await db.query(`
            SELECT 
                l.name,
                COUNT(DISTINCT aq.quiz_id) as quizzes_completed,
                AVG(aq.score) as avg_score,
                SUM(aq.time_spent) as total_time,
                array_agg(
                    json_build_object(
                        'quiz', q.title,
                        'score', aq.score,
                        'date', aq.completed_at
                    )
                ) as quiz_details
            FROM learners l
            JOIN assigned_quiz_attempts aq ON l.id = aq.learner_id
            JOIN assigned_quizzes q ON aq.quiz_id = q.id
            WHERE q.course_id = $1
            GROUP BY l.id, l.name
            ORDER BY avg_score DESC
        `, [courseId]);
        
        return this.formatProgressReport(results.rows);
    }
    
    async getQuestionAnalytics(quizId) {
        // Show which questions students struggle with
        const results = await db.query(`
            SELECT 
                q.id,
                q.question_text,
                COUNT(*) as total_attempts,
                SUM(CASE WHEN qa.correct THEN 1 ELSE 0 END) as correct_count,
                AVG(qa.time_spent) as avg_time
            FROM quiz_questions q
            JOIN question_attempts qa ON q.id = qa.question_id
            WHERE q.quiz_id = $1
            GROUP BY q.id, q.question_text
            ORDER BY (correct_count::float / total_attempts) ASC
        `, [quizId]);
        
        return results.rows;
    }
}
```

## Database Schema

```sql
-- Assigned quizzes table
CREATE TABLE assigned_quizzes (
    id UUID PRIMARY KEY,
    course_id VARCHAR(255) NOT NULL,
    instructor_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL,
    settings JSONB NOT NULL,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Assigned quiz attempts
CREATE TABLE assigned_quiz_attempts (
    id UUID PRIMARY KEY,
    learner_id VARCHAR(255) NOT NULL,
    quiz_id UUID REFERENCES assigned_quizzes(id),
    attempt_number INT NOT NULL,
    score DECIMAL(5,2),
    answers JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent INT -- seconds
);

-- Question-level tracking
CREATE TABLE question_attempts (
    id UUID PRIMARY KEY,
    attempt_id UUID REFERENCES assigned_quiz_attempts(id),
    question_id VARCHAR(255),
    answer JSONB,
    correct BOOLEAN,
    time_spent INT
);
```

## UI/UX Considerations

1. **Clear Visual Hierarchy**
   - Assigned quizzes always appear first
   - Different color scheme (blue accent vs green)
   - "ASSIGNED" badge clearly visible

2. **Due Date Prominence**
   - Red indicator for overdue
   - Yellow for due soon (< 48 hours)
   - Sorted by due date

3. **Health Immunity Indicator**
   - "❤️ Protected" badge
   - Different feedback messages
   - No heart animations on wrong answers

4. **Progress Tracking**
   - Shows attempt count (1/3 attempts)
   - Previous scores if retaking
   - Time remaining for timed quizzes

## Integration Points

1. **LMS Push API**
   ```javascript
   POST /api/instructor/push-quiz
   {
       courseId: "CS101",
       quiz: { ... },
       assignTo: ["group:section-a", "user:john@example.com"],
       dueDate: "2024-01-15T23:59:59Z"
   }
   ```

2. **Grade Passback**
   ```javascript
   // Automatic grade sync
   POST /lms/grade-passback
   {
       learnerId: "...",
       assignmentId: "...",
       score: 85,
       submittedAt: "..."
   }
   ```

3. **Analytics Export**
   - CSV export for instructors
   - LTI Advantage deep linking
   - Real-time progress webhooks
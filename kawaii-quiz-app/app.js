// Kawaii Quiz App v4.0 - Simplified and Modern
class KawaiiQuiz {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
        
        // Debug: Log all parameters ALM is sending
        console.log('ALM Parameters received:');
        console.log('Full URL:', window.location.href);
        const allParams = {};
        for (let [key, value] of this.params) {
            console.log(`${key}: ${value}`);
            allParams[key] = value;
        }
        console.log('All parameters object:', allParams);
        
        // Store in sessionStorage for debugging
        // COMMENTED OUT FOR ALM TESTING - sessionStorage triggers iframe issues
        // sessionStorage.setItem('almParameters', JSON.stringify(allParams));
        
        // Support both test parameters and ALM parameters
        // Handle duplicate authToken issue - use the LAST one if multiple exist
        const authTokens = this.params.getAll('authToken');
        const authToken = authTokens.length > 1 ? authTokens[authTokens.length - 1] : authTokens[0];
        console.log(`Found ${authTokens.length} authTokens, using: ${authToken}`);
        
        this.context = {
            userId: this.params.get('userId') || this.params.get('user_id') || this.params.get('learner_id') || this.params.get('CSUSER'),
            courseId: this.params.get('courseId') || this.params.get('loId') || this.params.get('course_id') || this.params.get('lo_id') || this.params.get('COURSE_ID'),
            moduleId: this.params.get('moduleId') || this.params.get('module_id') || this.params.get('MODULE_ID'),
            accountId: this.params.get('accountId') || this.params.get('account_id') || this.params.get('ACCOUNT_ID'),
            accessToken: authToken || this.params.get('access_token') || this.params.get('accessToken') || this.params.get('auth_token') || this.params.get('token') || this.params.get('ACCESS_TOKEN'),
            userRole: this.params.get('userRole') || this.params.get('user_role') || this.params.get('role') || this.params.get('ROLE') || 'learner',
            userName: this.params.get('userName') || this.params.get('user_name') || this.params.get('name') || this.params.get('USER_NAME'),
            courseName: this.params.get('courseName') || this.params.get('course_name') || this.params.get('lo_name') || this.params.get('COURSE_NAME'),
            locale: this.params.get('locale') || this.params.get('LOCALE') || 'en-US',
            instanceId: this.params.get('loInstanceId') || this.params.get('instanceId') || this.params.get('INSTANCE_ID'),
            isInstructor: false,
            platform: this.params.get('platform') || 'alm'
        };
        
        // Determine if user is instructor based on role
        const instructorRoles = ['instructor', 'admin', 'author'];
        this.context.isInstructor = instructorRoles.includes(this.context.userRole.toLowerCase());
        
        this.apiBaseUrl = 'https://p0qp0q.com/api/kawaii-quiz';
        this.currentQuiz = null;
        this.currentQuestion = 0;
        this.answers = [];
        
        console.log('About to add message event listener...');
        
        try {
            // Listen for messages from ALM
            window.addEventListener('message', (event) => {
                console.log('=== MESSAGE RECEIVED ===');
                console.log('Origin:', event.origin);
                console.log('Data:', event.data);
                console.log('Type:', typeof event.data);
            
            // Log stringified version if it's an object
            if (event.data && typeof event.data === 'object') {
                console.log('Stringified:', JSON.stringify(event.data, null, 2));
            }
            
            // Handle ALM context if sent via postMessage
            if (event.data && event.data.type === 'alm-context') {
                this.context = { ...this.context, ...event.data.context };
                console.log('Updated context from ALM:', this.context);
                
                // Reload if we now have instructor access
                if (this.context.isInstructor && !this.quizLoaded) {
                    this.loadBuilder();
                }
            }
            
            // Handle course data response (multiple possible formats)
            if (event.data) {
                // Check various response formats ALM might use
                if (event.data.type === 'course-data-response' || 
                    event.data.type === 'ALM_EXTENSION_RESPONSE' ||
                    (event.data.action === 'courseDataResponse' && event.data.courseData)) {
                    
                    console.log('Received course data from ALM:', event.data);
                    
                    // Resolve the promise if we're waiting for course data
                    if (this.courseDataResolver) {
                        this.courseDataResolver(event.data.courseData || event.data.data || event.data);
                        this.courseDataResolver = null;
                    }
                    
                    // Also parse it directly
                    if (event.data.courseData || event.data.data) {
                        this.parseCourseData({ data: event.data.courseData || event.data.data });
                    }
                }
                
                // Check if ALM sends learning object data directly
                if (event.data.learningObject || event.data.course || event.data.lo) {
                    console.log('Received learning object data:', event.data);
                    const courseData = event.data.learningObject || event.data.course || event.data.lo;
                    
                    if (this.courseDataResolver) {
                        this.courseDataResolver(courseData);
                        this.courseDataResolver = null;
                    }
                    
                    this.parseCourseData({ data: courseData });
                }
            }
        });
            console.log('Event listener added successfully!');
        } catch (error) {
            console.error('Failed to add event listener:', error);
        }
        
        console.log('Constructor complete, calling init()...');
        this.init();
    }
    
    async init() {
        console.log('Init method started!');
        // Notify parent that we're ready
        console.log('Sending ready message...');
        this.postMessage('ready', {});
        console.log('Ready message sent');
        
        // Request context from ALM
        console.log('Requesting context...');
        this.postMessage('request-context', {});
        console.log('Context request sent');
        
        // Try multiple postMessage formats to request course data
        console.log('Requesting course data...');
        this.postMessage('request-course-data', { courseId: this.context.courseId });
        console.log('Course data request sent');
        
        // Try various ALM native extension message formats
        if (window.parent !== window) {
            // Format 1: ALM_EXTENSION_APP
            window.parent.postMessage({
                type: 'ALM_EXTENSION_APP',
                eventType: 'getCourseData',
                courseId: this.context.courseId
            }, '*');
            
            // Format 2: Direct request
            window.parent.postMessage({
                action: 'getCourseData',
                courseId: this.context.courseId,
                loId: this.context.courseId
            }, '*');
            
            // Format 3: API request via parent
            window.parent.postMessage({
                type: 'API_REQUEST',
                endpoint: `/learningObjects/${this.context.courseId}`,
                method: 'GET'
            }, '*');
            
            // Format 4: Extension data request
            window.parent.postMessage({
                type: 'EXTENSION_DATA_REQUEST',
                dataType: 'courseDetails',
                courseId: this.context.courseId
            }, '*');
        }
        
        // Determine mode: builder or player
        if (this.context.isInstructor) {
            await this.loadBuilder();
        } else {
            await this.loadPlayer();
        }
    }
    
    postMessage(type, data) {
        if (window.parent !== window) {
            window.parent.postMessage({ type, data }, '*');
        }
    }
    
    // QUIZ BUILDER
    async loadBuilder() {
        const app = document.getElementById('app');
        
        // Show loading state
        app.innerHTML = '<div class="loading-screen"><div class="kawaii-loader">Loading course details...</div></div>';
        
        // Fetch course details from ALM if we have access token
        if (this.context.accessToken && this.context.courseId) {
            await this.fetchCourseDetails();
        } else {
            console.log('No access token, skipping course details fetch');
        }
        
        // Check if quiz exists for this course
        try {
            const response = await axios.get(`${this.apiBaseUrl}/quiz/${this.context.courseId}`);
            this.currentQuiz = response.data;
        } catch (error) {
            // No quiz exists yet
            this.currentQuiz = {
                courseId: this.context.courseId,
                questions: []
            };
        }
        
        app.innerHTML = `
            <div class="quiz-builder">
                <div class="version-badge">v4.4 🍰</div>
                <div class="builder-header">
                    <h1>Kawaii Quiz Builder 🌸</h1>
                    <p>Create a fun quiz for: ${this.courseDetails?.name || this.context.courseName || 'This Course'}</p>
                    ${this.courseDetails?.overview ? `<p class="course-overview">${this.courseDetails.overview}</p>` : ''}
                    ${this.courseDetails?.description && this.courseDetails?.description !== this.courseDetails?.overview ? 
                        `<details class="course-details">
                            <summary>View detailed description</summary>
                            <p class="course-description">${this.courseDetails.description}</p>
                        </details>` : ''}
                </div>
                
                <div class="ai-section">
                    <button class="btn btn-ai btn-large" onclick="quiz.suggestQuestions()">
                        ✨ Generate Questions with AI
                    </button>
                    <p class="ai-hint">Let AI create questions based on your course content!</p>
                    
                    <details class="course-input-section">
                        <summary>📝 Add Course Details (Optional)</summary>
                        <div class="course-input-content">
                            <div class="input-group">
                                <label>Course Name</label>
                                <input type="text" id="manual-course-name" placeholder="e.g., Python Programming Basics" />
                            </div>
                            <div class="input-group">
                                <label>Course Description</label>
                                <textarea id="manual-course-desc" placeholder="Brief description of what this course covers..." rows="3"></textarea>
                            </div>
                            <div class="input-group">
                                <label>Key Topics (comma-separated)</label>
                                <input type="text" id="manual-course-topics" placeholder="e.g., variables, loops, functions, debugging" />
                            </div>
                            <button class="btn btn-secondary" onclick="quiz.updateCourseInfo()">Update Course Info</button>
                        </div>
                    </details>
                    <details class="debug-info">
                        <summary>🔧 Debug Info</summary>
                        <div class="debug-content">
                            <p><strong>Course ID:</strong> ${this.context.courseId || 'none'}</p>
                            <p><strong>Has Token:</strong> ${this.context.accessToken ? '✅ Yes' : '❌ No'}</p>
                            <p><strong>User Role:</strong> ${this.context.userRole}</p>
                            <p><strong>Quiz Questions:</strong> ${this.currentQuiz?.questions?.length || 0}</p>
                            <p><strong>Topics Found:</strong> ${(this.courseDetails?.skills?.length || 0) + (this.courseDetails?.tags?.length || 0) + (this.courseDetails?.moduleNames?.length || 0)}</p>
                            <p><strong>All URL Params:</strong></p>
                            <pre style="font-size: 10px; overflow-x: auto;">${Array.from(this.params).map(([k,v]) => `${k}=${v}`).join('\n') || 'No parameters'}</pre>
                            <p><strong>Session Storage:</strong></p>
                            <pre style="font-size: 10px; overflow-x: auto;">${'sessionStorage disabled for ALM testing'}</pre>
                            <button class="btn btn-secondary" onclick="quiz.clearQuiz()">🗑️ Clear All Questions</button>
                            <button class="btn btn-secondary" onclick="quiz.testAPI()">🧪 Test API</button>
                            <button class="btn btn-secondary" onclick="quiz.testDirectAPI()">🔍 Test Direct ALM API</button>
                        </div>
                    </details>
                </div>
                
                <div id="questions-container" class="questions-list">
                    ${this.renderQuestions()}
                </div>
                
                <div class="actions-section">
                    <button class="btn btn-secondary btn-large" onclick="quiz.addQuestion()">
                        ➕ Add Question
                    </button>
                    <button class="btn btn-primary btn-large" onclick="quiz.saveQuiz()">
                        💾 Save Quiz
                    </button>
                </div>
            </div>
        `;
    }
    
    // Fetch course details from ALM API
    async fetchCourseDetails() {
        try {
            // First try requesting via postMessage
            console.log('=== ATTEMPTING POSTMESSAGE COURSE DATA REQUEST ===');
            console.log('Window parent:', window.parent);
            console.log('Is in iframe:', window.parent !== window);
            
            // Set up a promise to wait for response
            this.courseDataPromise = new Promise((resolve, reject) => {
                this.courseDataResolver = resolve;
                this.courseDataRejecter = reject;
                
                // Set timeout in case ALM doesn't respond
                setTimeout(() => {
                    reject(new Error('Timeout waiting for course data from ALM'));
                }, 5000);
            });
            
            // Request course data from ALM
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'ALM_EXTENSION_REQUEST',
                    action: 'getCourseData',
                    courseId: this.context.courseId,
                    requestId: Date.now() // For matching response
                }, '*');
            }
            
            try {
                const courseData = await this.courseDataPromise;
                console.log('Received course data via postMessage!');
                this.parseCourseData({ data: courseData });
                return;
            } catch (err) {
                console.log('PostMessage approach failed:', err);
            }
            
            // Fallback: try with the authToken if we have it
            if (this.context.accessToken) {
                console.log('Falling back to API calls with authToken...');
                
                // Try multiple endpoints to get course info
                const endpoints = [
                    // Direct learning object endpoint with includes
                    `/learningObjects/${this.context.courseId}?include=skills,instances.modules,subLOs.instances.modules,supplementaryResources`,
                    // User enrollments which might have course info
                    `/user/enrollments?include=learningObject&loId=${this.context.courseId}`,
                    // Simple learning object endpoint without includes
                    `/learningObjects/${this.context.courseId}`
                ];
                
                for (const endpoint of endpoints) {
                    try {
                        console.log(`Trying endpoint: ${endpoint}`);
                        // Properly construct URL with query parameters
                        const separator = endpoint.includes('?') ? '&' : '?';
                        const proxyResponse = await fetch(
                            `${this.apiBaseUrl}/alm-proxy${endpoint}${separator}authToken=${this.context.accessToken}`,
                            {
                                headers: {
                                    'Accept': 'application/json'
                                }
                            }
                        );
                        
                        if (proxyResponse.ok) {
                            const data = await proxyResponse.json();
                            console.log(`Success with endpoint ${endpoint}:`, data);
                            
                            // Handle enrollment endpoint differently
                            if (endpoint.includes('enrollments')) {
                                const enrollment = data.data?.find(e => 
                                    e.relationships?.learningObject?.data?.id === this.context.courseId
                                );
                                if (enrollment?.relationships?.learningObject) {
                                    console.log('Found course in enrollments');
                                    // The included data should have the full learning object
                                    const includedLO = data.included?.find(i => 
                                        i.type === 'learningObject' && i.id === this.context.courseId
                                    );
                                    if (includedLO) {
                                        this.parseCourseData({ data: includedLO });
                                        return;
                                    }
                                }
                            } else {
                                this.parseCourseData(data);
                                return;
                            }
                        }
                    } catch (err) {
                        console.error(`Error with endpoint ${endpoint}:`, err);
                    }
                }
            }
            
            // Fallback to admin credentials endpoint
            console.log('Trying admin endpoint for course details...');
            const response = await fetch(
                `${this.apiBaseUrl}/course-details/${this.context.courseId}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                this.parseCourseData(data);
            }
        } catch (error) {
            console.error('Error fetching course details:', error);
        }
    }
    
    parseCourseData(data) {
        // Handle both direct data and wrapped data structures
        const courseData = data.data || data;
        const attributes = courseData.attributes || courseData;
        const localizedMeta = attributes.localizedMetadata?.[0] || {};
        
        this.courseDetails = {
            name: localizedMeta.name || attributes.name || this.extractCourseName() || 'This Course',
            overview: localizedMeta.overview || attributes.overview || '',
            description: localizedMeta.richTextOverview || attributes.richTextOverview || attributes.description || '',
            skills: attributes.skills || [],
            tags: attributes.tags || [],
            duration: attributes.duration,
            moduleNames: courseData.relationships?.modules?.data?.map(m => m.attributes?.name) || [],
            state: attributes.state,
            loType: attributes.loType
        };
        
        // Clean up HTML from rich text overview if present
        if (this.courseDetails.description && this.courseDetails.description.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.courseDetails.description;
            this.courseDetails.description = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        console.log('Parsed course details:', this.courseDetails);
        
        // Update the UI with course details
        this.updateBuilderUI();
    }
    
    extractCourseName() {
        // Try to extract course name from courseId if it contains readable text
        if (this.context.courseId && this.context.courseId.includes(':')) {
            const parts = this.context.courseId.split(':');
            const lastPart = parts[parts.length - 1];
            // Check if it's just numbers
            if (!/^\d+$/.test(lastPart)) {
                return lastPart.replace(/_/g, ' ').replace(/-/g, ' ');
            }
        }
        
        // Try to get from URL parameters that ALM might pass
        const urlCourseName = this.params.get('courseName') || this.params.get('lo_name');
        if (urlCourseName) {
            return decodeURIComponent(urlCourseName);
        }
        
        return null;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateBuilderUI() {
        // Update the course name in the header if we have better info
        const headerP = document.querySelector('.builder-header p');
        if (headerP && this.courseDetails?.name && this.courseDetails.name !== 'This Course') {
            headerP.textContent = `Create a fun quiz for: ${this.courseDetails.name}`;
        }
        
        // Update overview if available
        const overviewP = document.querySelector('.course-overview');
        if (!overviewP && this.courseDetails?.overview) {
            const header = document.querySelector('.builder-header');
            const overviewElement = document.createElement('p');
            overviewElement.className = 'course-overview';
            overviewElement.textContent = this.courseDetails.overview;
            header.appendChild(overviewElement);
        }
        
        // Update description if available
        if (this.courseDetails?.description && !document.querySelector('.course-details')) {
            const header = document.querySelector('.builder-header');
            const detailsElement = document.createElement('details');
            detailsElement.className = 'course-details';
            detailsElement.innerHTML = `
                <summary>View detailed description</summary>
                <p class="course-description">${this.courseDetails.description}</p>
            `;
            header.appendChild(detailsElement);
        }
    }
    
    renderQuestions() {
        if (this.currentQuiz.questions.length === 0) {
            return this.renderQuestionCard(0);
        }
        
        return this.currentQuiz.questions.map((q, i) => 
            this.renderQuestionCard(i, q)
        ).join('');
    }
    
    renderQuestionCard(index, question = null) {
        const q = question || {
            text: '',
            answers: ['', '', '', ''],
            correct: 0
        };
        
        // Ensure answers array exists and has 4 elements
        if (!Array.isArray(q.answers)) {
            q.answers = ['', '', '', ''];
        }
        while (q.answers.length < 4) {
            q.answers.push('');
        }
        
        // Kawaii icons for question numbers
        const kawaiiIcons = ['🍪', '🧁', '🍓', '🍦', '🍩', '🌸', '🌈', '⭐', '🎀', '🦄'];
        const icon = kawaiiIcons[index % kawaiiIcons.length];
        
        // Ensure correct is a number for single answer
        const correctIndex = typeof q.correct === 'number' ? q.correct : (Array.isArray(q.correct) ? q.correct[0] : 0);
        
        return `
            <div class="question-container" data-question="${index}">
                <div class="question-icon">${icon}</div>
                
                <div class="question-content">
                    <textarea 
                        class="question-input"
                        placeholder="Question ${index + 1}: Type your question here..."
                        onchange="quiz.updateQuestion(${index}, 'text', this.value)"
                    >${this.escapeHtml(q.text || '')}</textarea>
                    
                    <div class="answers-section">
                        ${q.answers.map((ans, i) => `
                            <div class="answer-row">
                                <input 
                                    type="text" 
                                    class="answer-input-field"
                                    placeholder="Answer ${String.fromCharCode(65 + i)}"
                                    value="${this.escapeHtml(ans || '')}"
                                    onchange="quiz.updateAnswer(${index}, ${i}, this.value)"
                                />
                                <button 
                                    class="answer-select-btn ${correctIndex === i ? 'selected' : ''}"
                                    onclick="quiz.setCorrectAnswer(${index}, ${i})"
                                >
                                    ${correctIndex === i ? '✓' : ''}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${index > 0 ? `
                        <button class="remove-question-btn" onclick="quiz.removeQuestion(${index})">
                            Remove Question
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    addQuestion() {
        if (this.currentQuiz.questions.length >= 10) {
            this.showNotification('Maximum 10 questions allowed! 🌟', 'info');
            return;
        }
        
        this.currentQuiz.questions.push({
            text: '',
            answers: ['', '', '', ''],
            correct: 0
        });
        
        document.getElementById('questions-container').innerHTML = this.renderQuestions();
        
        // Scroll to new question
        const newQuestion = document.querySelector(`[data-question="${this.currentQuiz.questions.length - 1}"]`);
        if (newQuestion) {
            newQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    updateQuestion(index, field, value) {
        if (!this.currentQuiz.questions[index]) {
            this.currentQuiz.questions[index] = {
                text: '',
                answers: ['', '', '', ''],
                correct: 0
            };
        }
        this.currentQuiz.questions[index][field] = value;
    }
    
    setCorrectAnswer(questionIndex, answerIndex) {
        if (!this.currentQuiz.questions[questionIndex]) return;
        this.currentQuiz.questions[questionIndex].correct = answerIndex;
        
        // Update UI
        const container = document.querySelector(`[data-question="${questionIndex}"]`);
        container.querySelectorAll('.answer-select-btn').forEach((btn, i) => {
            if (i === answerIndex) {
                btn.classList.add('selected');
                btn.textContent = '✓';
            } else {
                btn.classList.remove('selected');
                btn.textContent = '';
            }
        });
    }
    
    updateAnswer(questionIndex, answerIndex, value) {
        if (!this.currentQuiz.questions[questionIndex]) return;
        this.currentQuiz.questions[questionIndex].answers[answerIndex] = value;
    }
    
    removeQuestion(index) {
        this.currentQuiz.questions.splice(index, 1);
        document.getElementById('questions-container').innerHTML = this.renderQuestions();
    }
    
    async saveQuiz() {
        // Validate quiz
        const valid = this.currentQuiz.questions.every(q => 
            q.text && 
            q.answers.filter(a => a).length >= 2 && 
            (typeof q.correct === 'number' || q.correct >= 0)
        );
        
        if (!valid) {
            alert('Please complete all questions with at least 2 answers and select correct answer(s)');
            return;
        }
        
        try {
            await axios.post(`${this.apiBaseUrl}/quiz`, {
                ...this.currentQuiz,
                updatedBy: this.context.userId,
                updatedAt: new Date().toISOString()
            });
            
            this.showNotification('Quiz saved successfully! 🎉', 'success');
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Error saving quiz. Please try again.', 'error');
        }
    }
    
    async suggestQuestions() {
        const button = event.target;
        button.disabled = true;
        button.innerHTML = '✨ Generating...';
        
        try {
            // Get course name from display or context
            const displayedCourseName = document.querySelector('.builder-header p')?.textContent?.replace('Create a fun quiz for: ', '') || 'General Course';
            
            // Build topics from course metadata or use the course name
            const topics = [];
            if (this.courseDetails?.manualTopics?.length > 0) {
                topics.push(...this.courseDetails.manualTopics);
            }
            if (this.courseDetails?.skills?.length > 0) {
                topics.push(...this.courseDetails.skills);
            }
            if (this.courseDetails?.tags?.length > 0) {
                topics.push(...this.courseDetails.tags);
            }
            if (this.courseDetails?.moduleNames?.length > 0) {
                topics.push(...this.courseDetails.moduleNames);
            }
            
            // If no topics found, try to extract from course name
            if (topics.length === 0 && displayedCourseName && displayedCourseName !== 'This Course') {
                // Use the course name to infer topics
                topics.push(`Topics related to ${displayedCourseName}`);
                topics.push('Core concepts', 'Key principles', 'Best practices');
            }
            
            const response = await axios.post(`${this.apiBaseUrl}/ai-suggestions`, {
                courseName: displayedCourseName || this.courseDetails?.name || this.context.courseName || 'General Knowledge',
                courseDescription: this.courseDetails?.description || this.courseDetails?.overview || `Create fun and engaging quiz questions for ${displayedCourseName}`,
                courseOverview: this.courseDetails?.overview || '',
                topics: topics,
                duration: this.courseDetails?.duration,
                loType: this.courseDetails?.loType,
                style: 'kawaii'
            });
            
            if (response.data && response.data.questions) {
                // Add AI-generated questions to the quiz
                const newQuestions = response.data.questions.slice(0, 10 - this.currentQuiz.questions.length);
                // Convert to single answer format
                const convertedQuestions = newQuestions.map(q => ({
                    text: q.text,
                    answers: q.answers,
                    correct: Array.isArray(q.correct) ? q.correct[0] : q.correct
                }));
                this.currentQuiz.questions.push(...convertedQuestions);
                
                // Refresh the UI
                document.getElementById('questions-container').innerHTML = this.renderQuestions();
                
                // Show success message
                this.showNotification('✨ AI questions added! Feel free to edit them.', 'success');
            }
        } catch (error) {
            console.error('Error getting AI suggestions:', error);
            this.showNotification('Could not generate questions. Please try again.', 'error');
        }
        
        button.disabled = false;
        button.innerHTML = '✨ Generate Questions with AI';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    clearQuiz() {
        if (confirm('Are you sure you want to clear all questions?')) {
            this.currentQuiz.questions = [];
            document.getElementById('questions-container').innerHTML = this.renderQuestions();
            this.showNotification('All questions cleared! 🧹', 'success');
        }
    }
    
    updateCourseInfo() {
        const name = document.getElementById('manual-course-name').value;
        const desc = document.getElementById('manual-course-desc').value;
        const topics = document.getElementById('manual-course-topics').value;
        
        if (!this.courseDetails) {
            this.courseDetails = {};
        }
        
        if (name) this.courseDetails.name = name;
        if (desc) this.courseDetails.description = desc;
        if (topics) {
            this.courseDetails.manualTopics = topics.split(',').map(t => t.trim()).filter(t => t);
        }
        
        this.updateBuilderUI();
        this.showNotification('Course info updated! 📚', 'success');
    }
    
    async testAPI() {
        console.log('Testing API connection...');
        console.log('Auth Token:', this.context.accessToken);
        console.log('Course ID:', this.context.courseId);
        
        try {
            // Test 1: Direct API call
            console.log('Test 1: Direct API call to ALM...');
            const directResponse = await fetch(
                `https://learningmanager.adobe.com/primeapi/v2/user`,
                {
                    headers: {
                        'Authorization': `oauth ${this.context.accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );
            console.log('Direct API response:', directResponse.status, directResponse.statusText);
            
            // Test 2: Via our proxy
            console.log('Test 2: Via our proxy...');
            const proxyResponse = await fetch(
                `${this.apiBaseUrl}/alm-proxy/user?authToken=${this.context.accessToken}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            console.log('Proxy response:', proxyResponse.status, proxyResponse.statusText);
            
            if (proxyResponse.ok) {
                const data = await proxyResponse.json();
                console.log('User data:', data);
                this.showNotification('API connection successful! Check console for details.', 'success');
            } else {
                this.showNotification('API connection failed. Check console for details.', 'error');
            }
            
        } catch (error) {
            console.error('API test error:', error);
            this.showNotification('API test failed. Check console.', 'error');
        }
    }
    
    async testDirectAPI() {
        console.log('Testing direct ALM API access...');
        const testUrls = [
            `/user`,
            `/learningObjects/${this.context.courseId}`,
            `/learningObjects/${this.context.courseId}?include=skills,instances.modules`,
            `/user/enrollments?include=learningObject`
        ];
        
        for (const url of testUrls) {
            try {
                console.log(`Testing: ${url}`);
                const separator = url.includes('?') ? '&' : '?';
                const response = await fetch(
                    `${this.apiBaseUrl}/alm-proxy${url}${separator}authToken=${this.context.accessToken}`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );
                console.log(`Response for ${url}:`, response.status, response.statusText);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Data:`, data);
                }
            } catch (error) {
                console.error(`Error for ${url}:`, error);
            }
        }
        this.showNotification('API tests complete. Check console for results.', 'success');
    }
    
    // QUIZ PLAYER
    async loadPlayer() {
        const app = document.getElementById('app');
        
        try {
            const response = await axios.get(`${this.apiBaseUrl}/quiz/${this.context.courseId}`);
            this.currentQuiz = response.data;
            
            if (!this.currentQuiz || !this.currentQuiz.questions.length) {
                app.innerHTML = `
                    <div class="results-screen">
                        <h2>No quiz available yet</h2>
                        <p>Check back later! 🌸</p>
                    </div>
                `;
                return;
            }
            
            this.showQuestion(0);
        } catch (error) {
            app.innerHTML = `
                <div class="results-screen">
                    <h2>Quiz not found</h2>
                    <p>This course doesn't have a quiz yet.</p>
                </div>
            `;
        }
    }
    
    showQuestion(index) {
        const app = document.getElementById('app');
        const question = this.currentQuiz.questions[index];
        const progress = ((index + 1) / this.currentQuiz.questions.length) * 100;
        
        // Fix for single answer format
        const correctIndex = typeof question.correct === 'number' ? question.correct : 
                           (Array.isArray(question.correct) ? question.correct[0] : 0);
        
        app.innerHTML = `
            <div class="quiz-player">
                <div class="mascot-container">
                    <div class="kawaii-mascot">🌸</div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                
                <div class="player-question-container">
                    <h2 class="player-question-text">${question.text}</h2>
                    
                    <div class="player-answers-grid">
                        ${question.answers.filter(a => a).map((answer, i) => `
                            <button 
                                class="player-answer-button"
                                data-index="${i}"
                                onclick="quiz.selectAnswer(${index}, ${i})"
                            >
                                ${answer}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="submit-container">
                    <button class="btn btn-submit" onclick="quiz.submitAnswer(${index})">
                        ${index < this.currentQuiz.questions.length - 1 ? 'Next →' : 'Finish! 🎉'}
                    </button>
                </div>
            </div>
        `;
    }
    
    selectAnswer(questionIndex, answerIndex) {
        const buttons = document.querySelectorAll('.player-answer-button');
        
        // Single answer - clear all selections
        buttons.forEach(btn => btn.classList.remove('selected'));
        buttons[answerIndex].classList.add('selected');
        this.answers[questionIndex] = answerIndex;
    }
    
    submitAnswer(questionIndex) {
        if (this.answers[questionIndex] === undefined) {
            this.showNotification('Please select an answer!', 'info');
            return;
        }
        
        if (questionIndex < this.currentQuiz.questions.length - 1) {
            this.showQuestion(questionIndex + 1);
        } else {
            this.showResults();
        }
    }
    
    showResults() {
        const app = document.getElementById('app');
        
        // Calculate score
        let correct = 0;
        this.currentQuiz.questions.forEach((q, i) => {
            const correctAnswer = typeof q.correct === 'number' ? q.correct : 
                                (Array.isArray(q.correct) ? q.correct[0] : 0);
            
            if (this.answers[i] === correctAnswer) {
                correct++;
            }
        });
        
        const total = this.currentQuiz.questions.length;
        const percentage = Math.round((correct / total) * 100);
        
        // Report score to ALM
        this.postMessage('reportScore', {
            score: correct,
            maxScore: total
        });
        
        // Show results
        app.innerHTML = `
            <div class="results-screen">
                <div class="celebration">${percentage >= 70 ? '🎉' : '🌸'}</div>
                <h1>Quiz Complete!</h1>
                <div class="score-display">${percentage}%</div>
                <p class="score-message">
                    You got ${correct} out of ${total} questions correct!
                    ${percentage >= 70 ? 'Amazing job! 🌟' : 'Keep practicing! 💪'}
                </p>
                <button class="btn btn-primary" onclick="quiz.restart()">
                    Try Again
                </button>
            </div>
        `;
        
        // Save attempt
        this.saveAttempt(correct, total);
    }
    
    async saveAttempt(score, total) {
        try {
            await axios.post(`${this.apiBaseUrl}/attempt`, {
                userId: this.context.userId,
                courseId: this.context.courseId,
                score: score,
                total: total,
                percentage: Math.round((score / total) * 100),
                completedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving attempt:', error);
        }
    }
    
    restart() {
        this.currentQuestion = 0;
        this.answers = [];
        this.showQuestion(0);
    }
}

// Initialize the app
const quiz = new KawaiiQuiz();
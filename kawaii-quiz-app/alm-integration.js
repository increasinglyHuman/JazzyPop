// Adobe Learning Manager API Integration for Kawaii Quiz
class ALMIntegration {
    constructor(accessToken, accountId) {
        this.accessToken = accessToken;
        this.accountId = accountId;
        this.apiBase = 'https://learningmanager.adobe.com/primeapi/v2';
    }
    
    // Common headers for ALM API requests
    getHeaders() {
        return {
            'Authorization': `oauth ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    
    // Report quiz completion and score to ALM
    async reportQuizCompletion(userId, courseId, moduleId, score, maxScore) {
        try {
            // Calculate completion percentage
            const percentComplete = Math.round((score / maxScore) * 100);
            const hasPassed = percentComplete >= 70; // 70% passing score
            
            // Update module progress
            const progressData = {
                data: {
                    id: `${userId}_${moduleId}`,
                    type: 'moduleProgress',
                    attributes: {
                        progressPercent: 100,
                        score: percentComplete,
                        dateCompleted: new Date().toISOString(),
                        hasPassed: hasPassed
                    }
                }
            };
            
            // Report progress to ALM
            const response = await fetch(
                `${this.apiBase}/learningObjects/${courseId}/instances/1/modules/${moduleId}/progress`,
                {
                    method: 'PATCH',
                    headers: this.getHeaders(),
                    body: JSON.stringify(progressData)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to report progress to ALM');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error reporting to ALM:', error);
            throw error;
        }
    }
    
    // Award gamification points
    async awardGamificationPoints(userId, points, reason = 'Kawaii Quiz Completion') {
        try {
            const pointsData = {
                data: {
                    type: 'gamificationPoint',
                    attributes: {
                        points: points,
                        reason: reason,
                        dateAwarded: new Date().toISOString()
                    },
                    relationships: {
                        user: {
                            data: {
                                id: userId,
                                type: 'user'
                            }
                        }
                    }
                }
            };
            
            const response = await fetch(
                `${this.apiBase}/users/${userId}/gamificationPoints`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(pointsData)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to award gamification points');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error awarding points:', error);
            throw error;
        }
    }
    
    // Award badge to user
    async awardBadge(userId, badgeId) {
        try {
            const badgeData = {
                data: {
                    type: 'userBadge',
                    relationships: {
                        user: {
                            data: {
                                id: userId,
                                type: 'user'
                            }
                        },
                        badge: {
                            data: {
                                id: badgeId,
                                type: 'badge'
                            }
                        }
                    }
                }
            };
            
            const response = await fetch(
                `${this.apiBase}/users/${userId}/userBadges`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(badgeData)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to award badge');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error awarding badge:', error);
            throw error;
        }
    }
    
    // Get available badges for Kawaii Quiz
    async getAvailableBadges() {
        try {
            const response = await fetch(
                `${this.apiBase}/badges?filter.name=Kawaii`,
                {
                    headers: this.getHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch badges');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching badges:', error);
            throw error;
        }
    }
    
    // Create a custom badge for Kawaii Quiz (Admin only)
    async createKawaiiBadge(badgeName, badgeDescription, imageUrl) {
        try {
            const badgeData = {
                data: {
                    type: 'badge',
                    attributes: {
                        name: badgeName,
                        description: badgeDescription,
                        imageUrl: imageUrl,
                        state: 'Active'
                    }
                }
            };
            
            const response = await fetch(
                `${this.apiBase}/badges`,
                {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(badgeData)
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to create badge');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating badge:', error);
            throw error;
        }
    }
    
    // Calculate points based on quiz performance
    calculatePoints(score, maxScore, timeSpent) {
        let points = 0;
        const percentage = (score / maxScore) * 100;
        
        // Base points for completion
        points += 10;
        
        // Bonus points for high scores
        if (percentage === 100) {
            points += 50; // Perfect score bonus
        } else if (percentage >= 90) {
            points += 30;
        } else if (percentage >= 80) {
            points += 20;
        } else if (percentage >= 70) {
            points += 10;
        }
        
        // Speed bonus (if completed under 5 minutes)
        if (timeSpent < 300) {
            points += 10;
        }
        
        return points;
    }
    
    // Determine which badge to award based on performance
    determineBadge(score, maxScore, attemptNumber) {
        const percentage = (score / maxScore) * 100;
        
        if (percentage === 100 && attemptNumber === 1) {
            return 'kawaii-perfect-first-try';
        } else if (percentage === 100) {
            return 'kawaii-perfect-score';
        } else if (percentage >= 90) {
            return 'kawaii-excellence';
        } else if (percentage >= 80) {
            return 'kawaii-achievement';
        } else if (attemptNumber >= 3 && percentage >= 70) {
            return 'kawaii-persistence';
        }
        
        return null;
    }
}

// Usage in the main app
class KawaiiQuizALM extends KawaiiQuiz {
    constructor() {
        super();
        
        // Initialize ALM integration if access token is available
        if (this.context.accessToken && this.context.accountId) {
            this.alm = new ALMIntegration(
                this.context.accessToken,
                this.context.accountId
            );
        }
    }
    
    // Override the showResults method to include ALM reporting
    async showResults() {
        // Call parent showResults first
        super.showResults();
        
        // Calculate score
        let correct = 0;
        this.currentQuiz.questions.forEach((q, i) => {
            const userAnswer = this.answers[i] || [];
            const correctAnswer = q.correct;
            
            if (JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort())) {
                correct++;
            }
        });
        
        const total = this.currentQuiz.questions.length;
        const timeSpent = (Date.now() - this.quizStartTime) / 1000; // in seconds
        
        // Report to ALM if integration is available
        if (this.alm) {
            try {
                // Report completion and score
                await this.alm.reportQuizCompletion(
                    this.context.userId,
                    this.context.courseId,
                    this.context.moduleId,
                    correct,
                    total
                );
                
                // Award gamification points
                const points = this.alm.calculatePoints(correct, total, timeSpent);
                await this.alm.awardGamificationPoints(
                    this.context.userId,
                    points,
                    `Kawaii Quiz - Score: ${correct}/${total}`
                );
                
                // Check and award badges
                const attemptNumber = await this.getAttemptNumber();
                const badgeId = this.alm.determineBadge(correct, total, attemptNumber);
                
                if (badgeId) {
                    await this.alm.awardBadge(this.context.userId, badgeId);
                    this.showBadgeNotification(badgeId);
                }
                
                // Show points notification
                this.showPointsNotification(points);
                
            } catch (error) {
                console.error('Error reporting to ALM:', error);
                // Continue anyway - don't break the quiz experience
            }
        }
    }
    
    // Show points earned notification
    showPointsNotification(points) {
        const notification = document.createElement('div');
        notification.className = 'points-notification';
        notification.innerHTML = `
            <div class="points-animation">
                +${points} 🌟
            </div>
            <div class="points-text">Gamification Points Earned!</div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Show badge earned notification
    showBadgeNotification(badgeId) {
        const badges = {
            'kawaii-perfect-first-try': { icon: '🏆', name: 'Perfect First Try!' },
            'kawaii-perfect-score': { icon: '⭐', name: 'Perfect Score!' },
            'kawaii-excellence': { icon: '🌟', name: 'Excellence!' },
            'kawaii-achievement': { icon: '✨', name: 'Achievement!' },
            'kawaii-persistence': { icon: '💪', name: 'Persistence Pays!' }
        };
        
        const badge = badges[badgeId];
        if (!badge) return;
        
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-text">Badge Earned: ${badge.name}</div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}
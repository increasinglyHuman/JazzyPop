// AI Question Generation using Anthropic Claude API
const Anthropic = require('@anthropic-ai/sdk');

class AIQuestionGenerator {
    constructor(apiKey) {
        this.anthropic = new Anthropic({
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        });
    }
    
    async generateQuestions(courseContext) {
        const { courseName, courseDescription, topics, difficulty = 'medium', count = 5 } = courseContext;
        
        const prompt = `You are a helpful AI that creates fun, engaging quiz questions for online learning. 
        
Create ${count} multiple-choice questions for a course called "${courseName}".
${courseDescription ? `Course description: ${courseDescription}` : ''}
${topics ? `Topics to cover: ${topics.join(', ')}` : ''}

Difficulty level: ${difficulty}

For each question:
- Make it clear and concise
- Use simple, friendly language
- Include 4 answer options
- Mark which answer(s) are correct
- Questions can be single-answer or multiple-answer

Return the questions in this exact JSON format:
{
  "questions": [
    {
      "text": "Question text here?",
      "type": "single",
      "answers": ["Option A", "Option B", "Option C", "Option D"],
      "correct": [1],
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Make the questions engaging and fun! Use emojis sparingly if appropriate for the topic.`;

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            
            // Parse the response
            const content = response.content[0].text;
            
            // Extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response');
            }
            
            const result = JSON.parse(jsonMatch[0]);
            
            // Ensure correct format
            return this.validateAndFormatQuestions(result.questions);
            
        } catch (error) {
            console.error('Error generating questions:', error);
            throw error;
        }
    }
    
    validateAndFormatQuestions(questions) {
        return questions.map(q => {
            // Ensure all required fields
            return {
                text: q.text || '',
                type: q.type || 'single',
                answers: q.answers || ['', '', '', ''],
                correct: Array.isArray(q.correct) ? q.correct : [0],
                explanation: q.explanation || ''
            };
        }).filter(q => q.text && q.answers.some(a => a)); // Filter out invalid questions
    }
    
    // Generate fun, kawaii-style questions
    async generateKawaiiQuestions(courseContext) {
        const kawaiiContext = {
            ...courseContext,
            style: 'fun, friendly, and kawaii',
            tone: 'cheerful and encouraging'
        };
        
        // Check if we have enough context
        const hasMinimalContext = kawaiiContext.courseDescription && 
            kawaiiContext.courseDescription.length > 50 && 
            kawaiiContext.topics && 
            kawaiiContext.topics.length > 2;
        
        let enhancedPrompt = '';
        
        if (!hasMinimalContext) {
            // If we don't have enough context, ask AI to research and infer the topic
            enhancedPrompt = `
IMPORTANT: The course information provided is minimal. Please:

1. Infer the subject matter from the course name "${kawaiiContext.courseName}"
2. Based on your knowledge, identify what this course likely covers:
   - Core concepts and principles
   - Key skills students should learn
   - Common topics in this field
   - Typical learning objectives

3. Generate questions that would be appropriate for a course on this topic, focusing on:
   - Fundamental concepts
   - Practical applications
   - Common misconceptions
   - Real-world scenarios

Make educated assumptions about the course content based on standard curricula for this subject.
`;
        }
        
        const prompt = `You are a cheerful, kawaii-style quiz creator! Create fun and adorable quiz questions.
        
Create ${kawaiiContext.count || 5} multiple-choice questions for: "${kawaiiContext.courseName}"
${kawaiiContext.courseOverview ? `Overview: ${kawaiiContext.courseOverview}` : ''}
${kawaiiContext.courseDescription ? `Detailed Description: ${kawaiiContext.courseDescription}` : ''}
${kawaiiContext.topics && kawaiiContext.topics.length > 0 ? `Topics/Skills/Modules: ${kawaiiContext.topics.join(', ')}` : ''}
${kawaiiContext.duration ? `Course Duration: ${kawaiiContext.duration} minutes` : ''}
${kawaiiContext.loType ? `Learning Object Type: ${kawaiiContext.loType}` : ''}

${enhancedPrompt}

Style guidelines:
- Use friendly, encouraging language
- Add cute elements where appropriate (but don't overdo it)
- Make questions that feel like a fun game
- Use positive reinforcement in explanations
- Keep it professional but playful
- If course details are limited, create questions based on common knowledge of the subject

Return in this JSON format:
{
  "questions": [
    {
      "text": "Question text",
      "type": "single",
      "answers": ["Option A", "Option B", "Option C", "Option D"],
      "correct": [index],
      "explanation": "Encouraging explanation"
    }
  ]
}`;

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.8,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            
            // Log approximate cost (Haiku pricing as of 2024)
            // Input: ~$0.25 per million tokens, Output: ~$1.25 per million tokens
            const inputTokens = prompt.length / 4; // Rough estimate
            const outputTokens = 2000; // Max we requested
            const inputCost = (inputTokens / 1000000) * 0.25;
            const outputCost = (outputTokens / 1000000) * 1.25;
            const totalCost = inputCost + outputCost;
            
            console.log(`AI Question Generation Cost: ~$${totalCost.toFixed(4)} (${inputTokens} input tokens, up to ${outputTokens} output tokens)`);
            
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response');
            }
            
            const result = JSON.parse(jsonMatch[0]);
            return this.validateAndFormatQuestions(result.questions);
            
        } catch (error) {
            console.error('Error generating kawaii questions:', error);
            throw error;
        }
    }
    
    // Improve existing questions
    async improveQuestions(existingQuestions, improvement = 'clarity') {
        const prompt = `Please improve these quiz questions for better ${improvement}.
        
Current questions:
${JSON.stringify(existingQuestions, null, 2)}

Improvements needed:
- ${improvement === 'clarity' ? 'Make questions clearer and easier to understand' : ''}
- ${improvement === 'difficulty' ? 'Adjust difficulty to be more appropriate' : ''}
- ${improvement === 'engagement' ? 'Make questions more engaging and fun' : ''}

Return the improved questions in the same JSON format.`;

        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2000,
                temperature: 0.5,
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
                return existingQuestions; // Return original if parsing fails
            }
            
            const result = JSON.parse(jsonMatch[0]);
            return this.validateAndFormatQuestions(result.questions || result);
            
        } catch (error) {
            console.error('Error improving questions:', error);
            return existingQuestions; // Return original on error
        }
    }
}

module.exports = AIQuestionGenerator;
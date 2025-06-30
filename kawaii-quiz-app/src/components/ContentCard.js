export class ContentCard {
    constructor(container) {
        this.container = container;
    }

    create(data) {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.dataset.type = data.type || 'default';
        
        // Simple structure: title and text only
        card.innerHTML = `
            <div class="content-card-inner">
                <h3 class="content-card-title">${data.title || ''}</h3>
                <p class="content-card-text">${data.content || data.text || ''}</p>
            </div>
        `;
        
        return card;
    }
    
    // Process API response containing mixed content
    processContentResponse(response) {
        const cards = [];
        
        // Check if response has quizzes
        if (response.quizzes && Array.isArray(response.quizzes)) {
            // Quizzes are handled by QuizCard component
        }
        
        // Check if response has trivia/facts
        if (response.trivia && Array.isArray(response.trivia)) {
            response.trivia.forEach(item => {
                cards.push(this.createFactCard(item));
            });
        }
        
        // Check if response has quotes
        if (response.quotes && Array.isArray(response.quotes)) {
            response.quotes.forEach(item => {
                cards.push(this.createQuoteCard(item));
            });
        }
        
        // Check if response has tips
        if (response.tips && Array.isArray(response.tips)) {
            response.tips.forEach(item => {
                cards.push(this.createTipCard(item));
            });
        }
        
        // Check if response has challenges
        if (response.challenges && Array.isArray(response.challenges)) {
            response.challenges.forEach(item => {
                cards.push(this.createChallengeCard(item));
            });
        }
        
        return cards;
    }
    
    // Create different content type cards
    createFactCard(fact) {
        return this.create({
            type: 'fact',
            title: 'Did You Know?',
            content: fact.content || fact.fact || fact.text
        });
    }
    
    createQuoteCard(quote) {
        return this.create({
            type: 'quote',
            title: quote.author || 'Quote',
            content: quote.content || quote.quote || quote.text
        });
    }
    
    createTipCard(tip) {
        return this.create({
            type: 'tip',
            title: 'Pro Tip',
            content: tip.content || tip.tip || tip.text
        });
    }
    
    createChallengeCard(challenge) {
        return this.create({
            type: 'challenge',
            title: 'Challenge',
            content: challenge.content || challenge.description || challenge.text
        });
    }
}
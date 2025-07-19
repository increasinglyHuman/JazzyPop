// Script to update FlashcardModal.js to include user_id in API calls

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/FlashcardModal.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the setEndpoints section and update it
const oldEndpoints = `const setEndpoints = {
                bad_puns: '/api/content/pun/sets?count=1',
                famous_quotes: '/api/content/quote/sets?count=1',
                knock_knock: '/api/content/joke/sets?count=1',
                trivia_mix: '/api/content/trivia/sets?count=1'
            };`;

const newEndpoints = `// Get user ID if available
            const userId = localStorage.getItem('userId');
            const userParam = userId ? \`&user_id=\${userId}\` : '';
            
            const setEndpoints = {
                bad_puns: \`/api/content/pun/sets?count=1\${userParam}\`,
                famous_quotes: \`/api/content/quote/sets?count=1\${userParam}\`,
                knock_knock: \`/api/content/joke/sets?count=1\${userParam}\`,
                trivia_mix: \`/api/content/trivia/sets?count=1\${userParam}\`
            };`;

if (content.includes(oldEndpoints)) {
    content = content.replace(oldEndpoints, newEndpoints);
    fs.writeFileSync(filePath, content);
    console.log('✅ Updated FlashcardModal.js to include user_id in fetch calls');
} else {
    console.log('❌ Could not find exact match for setEndpoints');
}
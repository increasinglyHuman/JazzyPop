/**
 * Sample quiz questions for JazzyPop
 * Each question has multiple choice answers with one correct
 */

export const sampleQuestions = [
    {
        id: 'q1',
        category: 'geography',
        difficulty: 'easy',
        question: 'What is the capital of France?',
        answers: [
            { id: 'a1', text: 'London', correct: false },
            { id: 'a2', text: 'Berlin', correct: false },
            { id: 'a3', text: 'Paris', correct: true },
            { id: 'a4', text: 'Madrid', correct: false }
        ],
        explanation: 'Paris has been the capital of France since 987 AD!'
    },
    {
        id: 'q2',
        category: 'science',
        difficulty: 'easy',
        question: 'What planet is known as the Red Planet?',
        answers: [
            { id: 'a1', text: 'Venus', correct: false },
            { id: 'a2', text: 'Mars', correct: true },
            { id: 'a3', text: 'Jupiter', correct: false },
            { id: 'a4', text: 'Saturn', correct: false }
        ],
        explanation: 'Mars appears red due to iron oxide (rust) on its surface!'
    },
    {
        id: 'q3',
        category: 'history',
        difficulty: 'medium',
        question: 'In which year did humans first land on the Moon?',
        answers: [
            { id: 'a1', text: '1967', correct: false },
            { id: 'a2', text: '1969', correct: true },
            { id: 'a3', text: '1971', correct: false },
            { id: 'a4', text: '1973', correct: false }
        ],
        explanation: 'Apollo 11 landed on July 20, 1969 with Neil Armstrong and Buzz Aldrin!'
    },
    {
        id: 'q4',
        category: 'nature',
        difficulty: 'easy',
        question: 'What is the largest mammal in the world?',
        answers: [
            { id: 'a1', text: 'African Elephant', correct: false },
            { id: 'a2', text: 'Blue Whale', correct: true },
            { id: 'a3', text: 'Giraffe', correct: false },
            { id: 'a4', text: 'Polar Bear', correct: false }
        ],
        explanation: 'Blue whales can grow up to 100 feet long and weigh as much as 200 tons!'
    },
    {
        id: 'q5',
        category: 'technology',
        difficulty: 'medium',
        question: 'Who created the World Wide Web?',
        answers: [
            { id: 'a1', text: 'Bill Gates', correct: false },
            { id: 'a2', text: 'Steve Jobs', correct: false },
            { id: 'a3', text: 'Tim Berners-Lee', correct: true },
            { id: 'a4', text: 'Mark Zuckerberg', correct: false }
        ],
        explanation: 'Tim Berners-Lee invented the WWW in 1989 at CERN!'
    },
    {
        id: 'q6',
        category: 'math',
        difficulty: 'easy',
        question: 'What is 7 × 8?',
        answers: [
            { id: 'a1', text: '54', correct: false },
            { id: 'a2', text: '56', correct: true },
            { id: 'a3', text: '58', correct: false },
            { id: 'a4', text: '64', correct: false }
        ],
        explanation: 'Remember: 7 × 8 = 56, or think of it as 7 × (10 - 2) = 70 - 14 = 56!'
    },
    {
        id: 'q7',
        category: 'language',
        difficulty: 'medium',
        question: 'What language has the most native speakers?',
        answers: [
            { id: 'a1', text: 'English', correct: false },
            { id: 'a2', text: 'Spanish', correct: false },
            { id: 'a3', text: 'Mandarin Chinese', correct: true },
            { id: 'a4', text: 'Hindi', correct: false }
        ],
        explanation: 'Over 900 million people speak Mandarin Chinese as their first language!'
    },
    {
        id: 'q8',
        category: 'food',
        difficulty: 'easy',
        question: 'Which fruit is known for having its seeds on the outside?',
        answers: [
            { id: 'a1', text: 'Raspberry', correct: false },
            { id: 'a2', text: 'Strawberry', correct: true },
            { id: 'a3', text: 'Blueberry', correct: false },
            { id: 'a4', text: 'Blackberry', correct: false }
        ],
        explanation: 'Each "seed" on a strawberry is actually a separate fruit with a seed inside!'
    },
    {
        id: 'q9',
        category: 'sports',
        difficulty: 'medium',
        question: 'How many players are on a basketball team on the court at once?',
        answers: [
            { id: 'a1', text: '4', correct: false },
            { id: 'a2', text: '5', correct: true },
            { id: 'a3', text: '6', correct: false },
            { id: 'a4', text: '7', correct: false }
        ],
        explanation: 'Each team has 5 players: typically 2 guards, 2 forwards, and 1 center!'
    },
    {
        id: 'q10',
        category: 'music',
        difficulty: 'easy',
        question: 'How many strings does a standard guitar have?',
        answers: [
            { id: 'a1', text: '4', correct: false },
            { id: 'a2', text: '5', correct: false },
            { id: 'a3', text: '6', correct: true },
            { id: 'a4', text: '8', correct: false }
        ],
        explanation: 'Standard guitars have 6 strings: E, A, D, G, B, and high E!'
    }
];

// Get random question
export function getRandomQuestion() {
    return sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
}

// Get questions by category
export function getQuestionsByCategory(category) {
    return sampleQuestions.filter(q => q.category === category);
}

// Get questions by difficulty
export function getQuestionsByDifficulty(difficulty) {
    return sampleQuestions.filter(q => q.difficulty === difficulty);
}
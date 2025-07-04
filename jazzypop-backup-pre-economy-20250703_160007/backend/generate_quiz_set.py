"""
Script to generate a proper quiz set with multiple questions
"""
import asyncio
import json
from uuid import uuid4
from datetime import datetime
from database import db
import random

# Sample questions pool
SAMPLE_QUESTIONS = [
    {
        "question": "What's the capital of France?",
        "answers": [
            {"id": "a", "text": "London", "correct": False},
            {"id": "b", "text": "Paris", "correct": True},
            {"id": "c", "text": "Berlin", "correct": False},
            {"id": "d", "text": "Madrid", "correct": False}
        ],
        "explanation": "Paris has been the capital of France since 508 AD.",
        "category": "geography"
    },
    {
        "question": "What do the Eiffel Tower and a whale's heartbeat have in common?",
        "answers": [
            {"id": "a", "text": "Both can be heard from a mile away", "correct": False},
            {"id": "b", "text": "Both weigh approximately the same (10,000 tons)", "correct": True},
            {"id": "c", "text": "Both were discovered in 1889", "correct": False},
            {"id": "d", "text": "Both are made of iron", "correct": False}
        ],
        "explanation": "The Eiffel Tower weighs about 10,100 tons, remarkably close to the weight of a blue whale's heart!",
        "category": "science"
    },
    {
        "question": "How many times could you fold a piece of paper to reach the moon?",
        "answers": [
            {"id": "a", "text": "100 times", "correct": False},
            {"id": "b", "text": "42 times", "correct": True},
            {"id": "c", "text": "1,000 times", "correct": False},
            {"id": "d", "text": "It's impossible", "correct": False}
        ],
        "explanation": "Each fold doubles the thickness. After 42 folds, it would be about 440,000 km thick!",
        "category": "science"
    },
    {
        "question": "Which of these is NOT a real programming language?",
        "answers": [
            {"id": "a", "text": "LOLCODE", "correct": False},
            {"id": "b", "text": "Brainfuck", "correct": False},
            {"id": "c", "text": "ChaoScript", "correct": True},
            {"id": "d", "text": "Shakespeare", "correct": False}
        ],
        "explanation": "ChaoScript is made up! The others are real esoteric programming languages.",
        "category": "technology"
    },
    {
        "question": "What percentage of the internet consists of cat content?",
        "answers": [
            {"id": "a", "text": "15%", "correct": True},
            {"id": "b", "text": "3%", "correct": False},
            {"id": "c", "text": "42%", "correct": False},
            {"id": "d", "text": "0.001% (it just feels like more)", "correct": False}
        ],
        "explanation": "Studies estimate that cat-related content makes up about 15% of all internet traffic!",
        "category": "internet_culture"
    },
    {
        "question": "Which came first: Oxford University or the Aztec Empire?",
        "answers": [
            {"id": "a", "text": "They were founded in the same year", "correct": False},
            {"id": "b", "text": "The Aztec Empire", "correct": False},
            {"id": "c", "text": "Oxford University", "correct": True},
            {"id": "d", "text": "Neither - they're both myths", "correct": False}
        ],
        "explanation": "Oxford University was teaching in 1096, while the Aztec Empire was founded in 1428.",
        "category": "history"
    },
    {
        "question": "What sound does the 'fox say' according to the viral 2013 song?",
        "answers": [
            {"id": "a", "text": "Ring-ding-ding-ding-dingeringeding", "correct": True},
            {"id": "b", "text": "Wa-pa-pa-pa-pa-pa-pow", "correct": False},
            {"id": "c", "text": "Hatee-hatee-hatee-ho", "correct": False},
            {"id": "d", "text": "All of the above", "correct": False}
        ],
        "explanation": "The viral song by Ylvis suggests foxes say 'Ring-ding-ding-ding-dingeringeding!'",
        "category": "pop_culture"
    },
    {
        "question": "How many hot dogs can the average American eat in 10 minutes?",
        "answers": [
            {"id": "a", "text": "2-3", "correct": False},
            {"id": "b", "text": "5-7", "correct": True},
            {"id": "c", "text": "10-12", "correct": False},
            {"id": "d", "text": "15-20", "correct": False}
        ],
        "explanation": "The average person can eat 5-7 hot dogs in 10 minutes. Competitive eaters can do 70+!",
        "category": "food_cuisine"
    },
    {
        "question": "What's the most expensive spice in the world by weight?",
        "answers": [
            {"id": "a", "text": "Vanilla", "correct": False},
            {"id": "b", "text": "Cardamom", "correct": False},
            {"id": "c", "text": "Saffron", "correct": True},
            {"id": "d", "text": "Black pepper", "correct": False}
        ],
        "explanation": "Saffron costs up to $5,000 per pound! It takes 75,000 flowers to make just one pound.",
        "category": "food_cuisine"
    },
    {
        "question": "Which planet spins backwards compared to most others?",
        "answers": [
            {"id": "a", "text": "Mars", "correct": False},
            {"id": "b", "text": "Venus", "correct": True},
            {"id": "c", "text": "Jupiter", "correct": False},
            {"id": "d", "text": "Neptune", "correct": False}
        ],
        "explanation": "Venus rotates clockwise (retrograde), opposite to most planets in our solar system.",
        "category": "space"
    }
]

def generate_chaos_variation(question):
    """Generate a chaos mode variation of a question"""
    chaos_templates = [
        "In the CHAOTIC REALM where {topic} REIGNS SUPREME, {base}",
        "BEHOLD! The ancient riddle of {topic}: {base}",
        "{base} ...IN THIS MAD UNIVERSE OF CHAOS?!",
        "Through the swirling vortex of {topic}, answer this: {base}"
    ]
    
    # Extract topic from category
    topic_map = {
        "geography": "EARTH'S TWISTED LANDSCAPES",
        "science": "REALITY-BENDING SCIENCE",
        "technology": "DIGITAL MADNESS",
        "history": "TIME'S CRUEL JOKES",
        "pop_culture": "MEME SUPREMACY",
        "food_cuisine": "CULINARY CHAOS",
        "space": "COSMIC INSANITY",
        "internet_culture": "THE DIGITAL VOID"
    }
    
    topic = topic_map.get(question.get('category', ''), 'ULTIMATE KNOWLEDGE')
    base = question['question'].rstrip('?')
    
    template = random.choice(chaos_templates)
    return template.format(topic=topic, base=base)

def generate_zen_variation(question):
    """Generate a zen mode hint for a question"""
    # Simple hints based on correct answer
    correct_answer = next(a for a in question['answers'] if a['correct'])
    hints = [
        f"The path to enlightenment begins with the letter '{correct_answer['text'][0]}'",
        f"Seek wisdom in {len(correct_answer['text'])} letters",
        f"The answer flows like water, containing {correct_answer['text'].count(' ') + 1} words",
        "Breathe deeply and let your intuition guide you"
    ]
    return random.choice(hints)

async def create_quiz_set():
    """Create a complete quiz set with multiple questions"""
    await db.connect()
    
    try:
        # Create a quiz set with 8 questions
        quiz_questions = random.sample(SAMPLE_QUESTIONS, min(8, len(SAMPLE_QUESTIONS)))
        
        # Generate the quiz data structure
        quiz_data = {
            "title": f"Quiz Set {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "questions": quiz_questions,
            "total_questions": len(quiz_questions),
            "category": "mixed",
            "difficulty": "medium"
        }
        
        # Generate mode variations for the entire quiz
        variations = {
            "chaos": {
                "questions": [
                    {
                        **q,
                        "question": generate_chaos_variation(q)
                    } for q in quiz_questions
                ]
            },
            "zen": {
                "questions": [
                    {
                        **q,
                        "hint": generate_zen_variation(q)
                    } for q in quiz_questions
                ]
            },
            "speed": {
                "time_per_question": 15,  # 15 seconds per question
                "bonus_multiplier": 2
            }
        }
        
        # Save to database
        async with db.pool.acquire() as conn:
            quiz_id = await conn.fetchval("""
                INSERT INTO content (type, data, metadata, tags, is_active)
                VALUES ('quiz', $1, $2, $3, true)
                RETURNING id
            """, 
                json.dumps(quiz_data),
                json.dumps({
                    "generated_at": datetime.utcnow().isoformat(),
                    "generator_version": "2.0",
                    "question_count": len(quiz_questions)
                }),
                ["mixed", "medium", "quiz_set"]
            )
            
            # Insert variations
            for mode, variation in variations.items():
                await conn.execute("""
                    INSERT INTO content_variations (content_id, mode, variation_data)
                    VALUES ($1, $2, $3)
                """, quiz_id, mode, json.dumps(variation))
            
            print(f"Created quiz set {quiz_id} with {len(quiz_questions)} questions")
            
            # Create a promotional card
            await conn.execute("""
                INSERT INTO cards (type, priority, template, data)
                VALUES ('quiz_tease', $1, 'quiz_preview', $2)
            """,
                20,  # High priority
                json.dumps({
                    "title": f"🎯 New Quiz Set Available!",
                    "description": f"Test your knowledge with {len(quiz_questions)} mind-bending questions!",
                    "quiz_id": str(quiz_id),
                    "category": "mixed",
                    "difficulty": "medium",
                    "cta": "Play Now!",
                    "icon": "🧠"
                })
            )
            
            # Clear caches
            await db.redis.delete("quiz:current:*")
            await db.redis.delete("cards:active")
            
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(create_quiz_set())
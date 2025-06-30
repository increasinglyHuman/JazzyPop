"""
Quiz Generator Service
Generates new quizzes periodically using AI
"""
import asyncio
import os
import json
import logging
import re
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from typing import Dict, Any, List
import aiohttp
from database import db
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class QuizGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        # Make interval configurable via environment variable (default 15 minutes)
        self.generation_interval = int(os.getenv('QUIZ_GENERATION_INTERVAL', '900'))
        # Use fallback mode if no API key
        self.use_fallback = not self.api_key or self.api_key == 'your_anthropic_api_key_here'
        if self.use_fallback:
            logger.warning("No valid Anthropic API key found, using fallback quiz generation")
        self.categories = [
            "science", "history", "geography", "pop_culture", 
            "technology", "nature", "sports", "literature",
            "music", "food_cuisine", "film", "gaming",
            "art", "mythology", "space", "animals",
            "inventions", "internet_culture", "fashion", "architecture",
            "collections", "ancient_architecture", "archaeology",
            "dinosaurs", "fashion_design", "wicca",
            "famous_lies", "scandal_mischief", "fame_glory",
            "horror_films", "revolutions", "language_evolution", "jokes"
        ]
        
    async def generate_quiz(self) -> Dict[str, Any]:
        """Generate a new quiz using AI"""
        category = self.categories[int(datetime.now().timestamp()) % len(self.categories)]
        
        prompt = f"""Create an engaging, creative trivia question about {category}.

        CREATIVITY REQUIREMENTS:
        - Make the question surprising, fun, or thought-provoking
        - Use vivid language, interesting angles, or unexpected connections
        - Mix difficulty levels: sometimes easy & fun, sometimes challenging & obscure
        - Include questions about: recent events, pop culture mashups, weird facts, historical oddities
        - Frame questions in creative ways: "What do X and Y have in common?", "Which came first?", etc.
        
        VARIETY GUIDELINES:
        - Rotate between different question types:
          * Superlatives (biggest, oldest, first, last)
          * Connections/relationships between things
          * Timeline/chronology questions
          * "Which of these is NOT..." questions
          * Numerical facts with surprising answers
          * Cultural phenomena and trends
          * Scientific discoveries with fun twists
          * Etymology and word origins
          * Common misconceptions
        
        ANSWER DESIGN:
        - Make wrong answers plausible but clearly incorrect when you know the fact
        - Include one "obviously wrong but funny" option occasionally
        - Mix answer lengths - not always the longest is correct
        - Use creative distractors that teach something even when wrong
        
        Return JSON with this exact format:
        {{
            "question": "Your creative question here",
            "answers": [
                {{"id": "a", "text": "First option", "correct": false}},
                {{"id": "b", "text": "Second option", "correct": true}},
                {{"id": "c", "text": "Third option", "correct": false}},
                {{"id": "d", "text": "Fourth option", "correct": false}}
            ],
            "explanation": "Fascinating explanation that teaches something interesting",
            "fun_fact": "Optional bonus fact that makes people go 'wow!'"
        }}
        
        Remember: Only ONE answer should be correct. Randomize which position (a,b,c,d) is correct."""
        
        # Use Anthropic API to generate quiz
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",  # Fast and cost-effective
            "max_tokens": 1000,
            "temperature": 0.9,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data['content'][0]['text']
                        
                        # Parse JSON from response
                        # Claude might wrap it in markdown, so extract JSON
                        import re
                        json_match = re.search(r'\{[\s\S]*\}', content)
                        if json_match:
                            quiz_data = json.loads(json_match.group(0))
                            return {
                                "category": category,
                                "difficulty": "medium",
                                **quiz_data
                            }
                    else:
                        logger.error(f"Anthropic API error: {response.status}")
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {e}")
        
        # Fallback to sample quizzes if API fails
        sample_quizzes = [
            {
                "question": "What do the Eiffel Tower and a whale's heartbeat have in common?",
                "answers": [
                    {"id": "a", "text": "Both can be heard from a mile away", "correct": False},
                    {"id": "b", "text": "Both weigh approximately the same (10,000 tons)", "correct": True},
                    {"id": "c", "text": "Both were discovered in 1889", "correct": False},
                    {"id": "d", "text": "Both are made of iron", "correct": False}
                ],
                "explanation": "The Eiffel Tower weighs about 10,100 tons, remarkably close to the weight of a blue whale's heart!",
                "fun_fact": "A blue whale's heart alone can weigh as much as an automobile."
            },
            {
                "question": "Which came first: Oxford University or the Aztec Empire?",
                "answers": [
                    {"id": "a", "text": "They were founded in the same year", "correct": False},
                    {"id": "b", "text": "The Aztec Empire", "correct": False},
                    {"id": "c", "text": "Oxford University", "correct": True},
                    {"id": "d", "text": "Neither - they're both myths", "correct": False}
                ],
                "explanation": "Oxford University was teaching in 1096, while the Aztec Empire was founded in 1428. Oxford is older by over 300 years!",
                "fun_fact": "Oxford University is so old that when it was founded, the Magna Carta wouldn't be signed for another 119 years."
            },
            {
                "question": "If you folded a piece of paper 42 times, how thick would it be?",
                "answers": [
                    {"id": "a", "text": "About as thick as a phone book", "correct": False},
                    {"id": "b", "text": "As tall as Mount Everest", "correct": False},
                    {"id": "c", "text": "It would reach the moon", "correct": True},
                    {"id": "d", "text": "Exactly 42 inches", "correct": False}
                ],
                "explanation": "Each fold doubles the thickness. After 42 folds, it would be about 440,000 km thick - enough to reach the moon!",
                "fun_fact": "In reality, you can only fold a piece of paper about 7-8 times due to physical limitations."
            },
            {
                "question": "What percentage of the internet consists of cat content?",
                "answers": [
                    {"id": "a", "text": "15%", "correct": True},
                    {"id": "b", "text": "3%", "correct": False},
                    {"id": "c", "text": "42%", "correct": False},
                    {"id": "d", "text": "0.001% (it just feels like more)", "correct": False}
                ],
                "explanation": "Studies estimate that cat-related content makes up about 15% of all internet traffic. Meow!",
                "fun_fact": "The first cat video on YouTube was uploaded in 2005, the same year YouTube was founded."
            },
            {
                "question": "Which of these is NOT a real programming language?",
                "answers": [
                    {"id": "a", "text": "LOLCODE", "correct": False},
                    {"id": "b", "text": "Brainfuck", "correct": False},
                    {"id": "c", "text": "ChaoScript", "correct": True},
                    {"id": "d", "text": "Shakespeare", "correct": False}
                ],
                "explanation": "ChaoScript is made up! The others are real esoteric programming languages designed for humor or challenge.",
                "fun_fact": "LOLCODE syntax is based on lolcat memes, with commands like 'HAI' (hi) to start and 'KTHXBYE' to end programs."
            },
            {
                "question": "How many times per day does the average person check their phone?",
                "answers": [
                    {"id": "a", "text": "47 times", "correct": False},
                    {"id": "b", "text": "96 times", "correct": True},
                    {"id": "c", "text": "247 times", "correct": False},
                    {"id": "d", "text": "12 times", "correct": False}
                ],
                "explanation": "Studies show the average person checks their phone 96 times per day - that's once every 10 minutes!",
                "fun_fact": "This number has increased by 20% in just the last 5 years."
            },
            {
                "question": "What sound does the 'fox say' according to the viral 2013 song?",
                "answers": [
                    {"id": "a", "text": "Ring-ding-ding-ding-dingeringeding", "correct": True},
                    {"id": "b", "text": "Wa-pa-pa-pa-pa-pa-pow", "correct": False},
                    {"id": "c", "text": "Hatee-hatee-hatee-ho", "correct": False},
                    {"id": "d", "text": "All of the above", "correct": False}
                ],
                "explanation": "The viral song by Ylvis suggests foxes say 'Ring-ding-ding-ding-dingeringeding!' among other sounds.",
                "fun_fact": "In reality, foxes make over 40 different sounds, including barks, screams, and howls."
            }
        ]
        
        # Select a random quiz
        quiz_data = sample_quizzes[int(datetime.now().timestamp()) % len(sample_quizzes)]
        
        return {
            "category": category,
            "difficulty": "medium",
            **quiz_data
        }
    
    async def generate_mode_variations(self, base_quiz: Dict[str, Any]) -> Dict[str, Any]:
        """Generate variations for different modes"""
        variations = {}
        
        # Chaos mode - use AI to make it weird
        chaos_question = await self._generate_chaos_question(base_quiz['question'])
        
        variations["chaos"] = {
            "question": chaos_question,
            "timer": 15,
            "bonus_multiplier": 2,
            "chaos_effects": ["screen_shake", "rainbow_text", "upside_down_answers"],
            "answers_shuffled": True  # Randomly reorder answers each time
        }
        
        # Zen mode - add a hint
        variations["zen"] = {
            "hint": f"Think about {base_quiz['category']}...",
            "no_timer": True,
            "calm_message": "Take your time, there's no rush."
        }
        
        # Speed mode - shorter timer
        variations["speed"] = {
            "time_limit": 10,
            "bonus_points": 50,
            "quick_tip": "Trust your instincts!"
        }
        
        return variations
    
    async def _generate_chaos_question(self, original_question: str) -> str:
        """Generate a chaos mode version of the question using AI"""
        if not self.api_key:
            # Fallback transformations if no API key
            chaos_transformations = [
                lambda q: q.replace("What", "In a universe where penguins rule, what"),
                lambda q: q.replace("Which", "If you were a time-traveling hamster, which"),
                lambda q: q.replace("?", " ...or does it even matter in the cosmic dance of chaos?"),
                lambda q: f"*Record scratch* *Freeze frame* Yup, that's you wondering: {q}",
                lambda q: f"Picture this: You're in a game show hosted by a sentient toaster. It asks: {q}",
                lambda q: q.upper() + " (BUT MAKE IT CHAOTIC!)",
                lambda q: f"🌪️ CHAOS QUESTION INCOMING: {q} 🌪️",
                lambda q: f"In the year 3025, archaeologists discovered this question: {q}"
            ]
            transform = chaos_transformations[int(datetime.now().microsecond / 1000) % len(chaos_transformations)]
            return transform(original_question)
        
        # Use Anthropic API for creative chaos
        prompt = f"""Take this trivia question and rewrite it in a hilariously chaotic way:

        Original: {original_question}
        
        Make it absurd, unexpected, and funny while keeping the same core question and answer.
        Use one of these styles:
        - Add ridiculous scenarios ("You're a time-traveling hamster...")
        - Use dramatic narration ("*Record scratch* *Freeze frame*")
        - Add silly characters ("A sentient toaster asks you...")
        - Make it overly dramatic or apocalyptic
        - Use internet meme language
        - Break the fourth wall
        - Add random but funny context
        
        Keep it under 200 characters. Return ONLY the rewritten question, nothing else."""
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            payload = {
                "model": "claude-3-haiku-20240307",
                "max_tokens": 200,
                "temperature": 1.0,  # Maximum creativity for chaos
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data['content'][0]['text'].strip()
        except Exception as e:
            logger.error(f"Error generating chaos question: {e}")
        
        # Fallback to simple transformation
        return original_question.replace("?", " ...in this CHAOTIC UNIVERSE?!")
    
    async def save_quiz(self, quiz_data: Dict[str, Any], variations: Dict[str, Any]):
        """Save quiz to database"""
        async with db.pool.acquire() as conn:
            # Insert main quiz
            quiz_id = await conn.fetchval("""
                INSERT INTO content (type, data, metadata, tags)
                VALUES ('quiz', $1, $2, $3)
                RETURNING id
            """, 
                json.dumps(quiz_data),
                json.dumps({
                    "generated_at": datetime.utcnow().isoformat(),
                    "generator_version": "1.0"
                }),
                [quiz_data['category'], quiz_data['difficulty']]
            )
            
            # Insert variations
            for mode, variation in variations.items():
                await conn.execute("""
                    INSERT INTO content_variations (content_id, mode, variation_data)
                    VALUES ($1, $2, $3)
                """, quiz_id, mode, json.dumps(variation))
            
            logger.info(f"Generated new quiz: {quiz_id}")
            
            # Clear cache
            await db.redis.delete("quiz:current:*")
            
            # Create a promotional card for the new quiz
            await self.create_quiz_card(quiz_id, quiz_data)
    
    async def create_quiz_card(self, quiz_id: UUID, quiz_data: Dict[str, Any]):
        """Create a promotional card for the new quiz"""
        # Generate a teaser for the quiz
        teasers = [
            f"New {quiz_data['category']} quiz just dropped! 🎯",
            f"Test your {quiz_data['category']} knowledge! 🧠",
            f"Can you ace this {quiz_data['category']} challenge? 🏆",
            f"Fresh {quiz_data['category']} trivia awaits! ✨",
            f"{quiz_data['category'].title()} quiz alert! 📢"
        ]
        
        # Pick a random teaser
        import random
        teaser = random.choice(teasers)
        
        # Get a preview of the question (truncated)
        question_preview = quiz_data['question']
        if len(question_preview) > 60:
            question_preview = question_preview[:57] + "..."
        
        # Determine card priority (higher for certain categories)
        priority_categories = ['pop_culture', 'technology', 'current_events']
        priority = 10 if quiz_data['category'] in priority_categories else 5
        
        # Create the card
        async with db.pool.acquire() as conn:
            card_id = await conn.fetchval("""
                INSERT INTO cards (
                    type, 
                    priority, 
                    template,
                    data, 
                    target_audience,
                    expires_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '6 hours')
                RETURNING id
            """,
                'quiz_tease',  # Card type
                priority,       # Priority
                'quiz_preview', # Template
                json.dumps({
                    "title": teaser,
                    "description": question_preview,
                    "quiz_id": str(quiz_id),
                    "category": quiz_data['category'],
                    "difficulty": quiz_data.get('difficulty', 'medium'),
                    "cta": "Play Now!",
                    "icon": self._get_category_icon(quiz_data['category'])
                }),
                json.dumps({
                    "modes": ["all"],  # Show to all modes
                    "min_streak": 0    # Show to everyone
                })
            )
            
            logger.info(f"Created promotional card {card_id} for quiz {quiz_id}")
            
            # Clear card cache
            await db.redis.delete("cards:active")
    
    def _get_category_icon(self, category: str) -> str:
        """Get icon for category"""
        icons = {
            "science": "🔬",
            "history": "📜",
            "geography": "🌍",
            "pop_culture": "🎬",
            "technology": "💻",
            "nature": "🌿",
            "sports": "⚽",
            "literature": "📚",
            "music": "🎵",
            "food_cuisine": "🍕",
            "film": "🎬",
            "gaming": "🎮",
            "art": "🎨",
            "mythology": "🐉",
            "space": "🚀",
            "animals": "🦁",
            "inventions": "💡",
            "internet_culture": "🌐",
            "fashion": "👗",
            "architecture": "🏛️",
            "collections": "🏺",
            "ancient_architecture": "🗿",
            "archaeology": "⛏️",
            "dinosaurs": "🦕",
            "fashion_design": "✂️",
            "wicca": "🔮",
            "famous_lies": "🤥",
            "scandal_mischief": "😈",
            "fame_glory": "⭐",
            "horror_films": "👻",
            "revolutions": "✊",
            "language_evolution": "🗣️",
            "jokes": "😂"
        }
        return icons.get(category, "🎯")
    
    async def run_generator(self):
        """Main generator loop"""
        logger.info("Starting quiz generator service")
        
        while True:
            try:
                # Generate new quiz
                quiz_data = await self.generate_quiz()
                
                # Generate mode variations
                variations = await self.generate_mode_variations(quiz_data)
                
                # Save to database
                await self.save_quiz(quiz_data, variations)
                
                # Wait before next generation
                await asyncio.sleep(self.generation_interval)
                
            except Exception as e:
                logger.error(f"Error generating quiz: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the quiz generator"""
    # Initialize database connections
    await db.connect()
    
    try:
        generator = QuizGenerator()
        await generator.run_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
"""
Quiz Set Generator for JazzyPop
Generates sets of 10 trivia questions with mode variations
"""
import asyncio
import os
import json
import logging
from datetime import datetime
from uuid import uuid4
from typing import Dict, Any, List
import aiohttp
from dotenv import load_dotenv
from database import db

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuizSetGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.api_url = "https://api.anthropic.com/v1/messages"
        
        # Categories matching the frontend
        self.categories = [
            'technology', 'science', 'history', 'geography', 'literature',
            'film', 'music', 'art', 'sports', 'nature', 'animals', 'food_cuisine',
            'pop_culture', 'mythology', 'space', 'gaming', 'internet_culture',
            'architecture', 'ancient_architecture', 'fashion_design', 'inventions',
            'famous_lies', 'language_evolution', 'dinosaurs', 'fame_glory'
        ]
        
        # JazzyPop chaos elements from original generator
        self.chaos_themes = [
            'time-traveling', 'interdimensional', 'underwater', 'space-faring',
            'microscopic', 'giant-sized', 'haunted', 'neon-lit', 'holographic',
            'steampunk', 'cyberpunk', 'solarpunk', 'mythological', 'quantum'
        ]
        
        self.chaos_characters = [
            'robot unicorns', 'philosophical penguins', 'coding wizards',
            'dancing algorithms', 'sentient emojis', 'time-traveling tacos',
            'quantum cats', 'interdimensional llamas', 'cyber dolphins',
            'ghost programmers', 'alien baristas', 'ninja librarians'
        ]
        
        self.chaos_scenarios = [
            'dance battle', 'cooking competition', 'escape room',
            'talent show', 'detective mystery', 'game show', 'heist',
            'musical', 'sports tournament', 'fashion show', 'trial',
            'tea party', 'space race', 'treasure hunt', 'karaoke night'
        ]
        
        self.chaos_twists = [
            'but everything is made of jello',
            'while riding unicycles',
            'in a world where gravity works backwards',
            'but everyone communicates only in haikus',
            'during a solar eclipse',
            'inside a giant snow globe',
            'where colors have flavors',
            'but time moves in loops',
            'in a reality TV show format',
            'where physics laws are suggestions'
        ]
        
        self.chaos_reactions = ['🤯', '🎢', '🌟', '🚀', '🎭', '⚡', '🌈', '🔮', '🎪', '💫']
        
        # Category tiers for economics
        self.category_tiers = {
            # Tier 1 - Basic categories (lower cost/reward)
            'animals': 1,
            'nature': 1,
            'food_cuisine': 1,
            'sports': 1,
            
            # Tier 2 - Intermediate categories
            'history': 2,
            'geography': 2,
            'literature': 2,
            'art': 2,
            'music': 2,
            'film': 2,
            'pop_culture': 2,
            
            # Tier 3 - Advanced categories (higher cost/reward)
            'technology': 3,
            'science': 3,
            'space': 3,
            'architecture': 3,
            'ancient_architecture': 3,
            'inventions': 3,
            'mythology': 3,
            
            # Tier 4 - Specialist categories (highest cost/reward)
            'gaming': 4,
            'internet_culture': 4,
            'language_evolution': 4,
            'dinosaurs': 4,
            'famous_lies': 4,
            'fashion_design': 4,
            'fame_glory': 4
        }
    
    def get_category_difficulty(self, category: str) -> str:
        """Determine difficulty based on category tier"""
        tier = self.category_tiers.get(category, 2)
        if tier == 1:
            return "easy"
        elif tier == 2:
            return "medium"
        elif tier == 3:
            return "hard"
        else:  # tier 4
            return "expert"
    
    def calculate_economics(self, category: str, difficulty: str) -> Dict[str, Any]:
        """Calculate economics data for a quiz set"""
        tier = self.category_tiers.get(category, 2)
        
        # Calculate difficulty multiplier
        difficulty_multipliers = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.5,
            'expert': 2.0
        }
        diff_mult = difficulty_multipliers.get(difficulty, 1.0)
        
        # Calculate cost
        cost = {
            'energy': int(20 * (1 + (tier - 1) * 0.25)),
            'coins': 0  # Keep base quizzes free
        }
        
        # Some specialist quizzes might cost coins
        if tier >= 4 and difficulty in ['hard', 'expert']:
            cost['coins'] = 50
        
        # Calculate base rewards
        rewards = {
            'xp': int(50 * tier * diff_mult),
            'coins': int(100 * tier * diff_mult),
            'gems': {
                'sapphires': 0,
                'emeralds': 0,
                'rubies': 0,
                'amethysts': 0,
                'diamonds': 0
            }
        }
        
        # Add gem rewards based on tier and difficulty
        if tier >= 2 and difficulty != 'easy':
            rewards['gems']['sapphires'] = 1
        if tier >= 3 and difficulty in ['hard', 'expert']:
            rewards['gems']['emeralds'] = 1
        if tier == 4 and difficulty == 'expert':
            rewards['gems']['rubies'] = 1
            
        # Perfect score bonuses
        perfect_bonus = {
            'xp_multiplier': 1.5,
            'coins_multiplier': 1.5,
            'extra_gems': {}
        }
        
        if tier >= 3:
            perfect_bonus['extra_gems']['amethysts'] = 1
        if tier == 4 and difficulty == 'expert':
            perfect_bonus['extra_gems']['diamonds'] = 1
            
        # Streak bonuses (applied at 3, 5, 10 streak)
        streak_bonuses = {
            3: {'coins': 50, 'gems': {'sapphires': 1}},
            5: {'coins': 100, 'gems': {'emeralds': 1}},
            10: {'coins': 200, 'gems': {'rubies': 1}}
        }
        
        # Mode variations affect rewards
        mode_multipliers = {
            'poqpoq': {'xp': 1.0, 'coins': 1.0},
            'zen': {'xp': 1.2, 'coins': 0.8},  # More XP, less coins
            'speed': {'xp': 0.9, 'coins': 1.3},  # Less XP, more coins
            'chaos': {'xp': 1.5, 'coins': 1.5}   # Bonus for chaos mode
        }
        
        return {
            'cost': cost,
            'rewards': rewards,
            'perfect_bonus': perfect_bonus,
            'streak_bonuses': streak_bonuses,
            'mode_multipliers': mode_multipliers,
            'tier': tier,
            'value_score': tier * diff_mult * 10  # Overall value metric
        }
        
    async def generate_quiz_question(self, category: str, question_num: int) -> Dict[str, Any]:
        """Generate a single quiz question"""
        # Add some chaos context for variety
        import random
        chaos_character = random.choice(self.chaos_characters)
        chaos_scenario = random.choice(self.chaos_scenarios)
        
        prompt = f"""You are the JazzyPop Quiz Master! Create a wildly entertaining trivia question about {category}.
        This is question {question_num} of 10 in a quiz set.

        JAZZYPOP STYLE GUIDE:
        - Mix real knowledge with internet culture, memes, and pop culture references
        - Use chronically online language and references when appropriate
        - Include questions about viral moments, TikTok trends, YouTube drama, gaming culture
        - Reference things like: "ratio'd on Twitter", "main character energy", "unhinged behavior"
        - Mix in absurdist elements: "{chaos_character} hosting a {chaos_scenario}"
        - Make wrong answers memeable and quotable
        - Questions can be about real facts but framed in chaotic ways
        
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
                {{"id": "a", "text": "Answer 1", "correct": false}},
                {{"id": "b", "text": "Answer 2", "correct": true}},
                {{"id": "c", "text": "Answer 3", "correct": false}},
                {{"id": "d", "text": "Answer 4", "correct": false}}
            ],
            "explanation": "Brief, interesting explanation of why this answer is correct"
        }}
        
        Return ONLY the JSON, no other text."""
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 500,
            "temperature": 0.9,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result['content'][0]['text']
                        return json.loads(content)
                    else:
                        logger.error(f"API error: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return None
    
    async def generate_quiz_title(self, category: str) -> str:
        """Generate a creative title for the quiz set"""
        prompt = f"""Create a creative, engaging title for a {category} trivia quiz.
        
        Guidelines:
        - Make it catchy and intriguing
        - Use alliteration, wordplay, or puns when appropriate
        - Keep it under 60 characters
        - Make it sound fun and inviting
        
        Examples of good titles:
        - "Rhythm, Riffs, and Revelations: A Musical Odyssey"
        - "Pixel Perfect: A Gaming Trivia Challenge"
        - "Cosmic Conundrums: A Stellar Space Quiz"
        - "Reel Revelations: A Cinematic Curiosity Quiz"
        
        Return ONLY the title, no quotes, no other text."""
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 100,
            "temperature": 1.0,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result['content'][0]['text'].strip()
                    else:
                        return f"Amazing {category.title()} Trivia Challenge"
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            return f"Amazing {category.title()} Trivia Challenge"
    
    async def generate_chaos_question(self, original_question: str) -> str:
        """Generate chaos mode version of a question"""
        import random
        
        # Pick random chaos elements
        theme = random.choice(self.chaos_themes)
        character = random.choice(self.chaos_characters)
        scenario = random.choice(self.chaos_scenarios)
        twist = random.choice(self.chaos_twists)
        
        prompt = f"""Take this trivia question and transform it into MAXIMUM CHAOS:

        Original: {original_question}
        
        CHAOS CONTEXT: {character} in a {theme} {scenario} {twist}
        
        Rewrite styles to use:
        - "*Record scratch* *Freeze frame* Yup, that's me..."
        - "POV: You're a {character} and..."
        - "Nobody: ... Absolutely nobody: ... {character}:"
        - "Breaking news: {character} just..."
        - "AITA for asking this during a {scenario}?"
        - "Wrong answers only:"
        - "Tell me you know X without telling me you know X"
        
        Make it unhinged but keep the core question intact. Use internet slang, memes, and chaotic energy.
        Keep under 200 characters. Return ONLY the chaotic question."""
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 200,
            "temperature": 1.0,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result['content'][0]['text'].strip()
                    else:
                        return original_question
        except Exception as e:
            logger.error(f"Error generating chaos question: {e}")
            return original_question
    
    async def generate_zen_hint(self, question: str, correct_answer: str, category: str) -> str:
        """Generate a zen mode hint"""
        return f"Take a deep breath and think about {category}... The answer might be closer than you think."
    
    async def generate_quiz_set(self, category: str) -> Dict[str, Any]:
        """Generate a complete quiz set with 10 questions"""
        logger.info(f"Generating quiz set for category: {category}")
        
        # Generate title
        title = await self.generate_quiz_title(category)
        
        # Generate 10 questions
        questions = []
        for i in range(10):
            question = await self.generate_quiz_question(category, i + 1)
            if question:
                questions.append(question)
            await asyncio.sleep(0.5)  # Rate limiting
        
        # Determine difficulty based on category
        difficulty = self.get_category_difficulty(category)
        
        # Create quiz set structure
        quiz_set = {
            "title": title,
            "category": category,
            "difficulty": difficulty,
            "questions": questions,
            "trivia": f"This quiz explores fascinating aspects of {category}!",
            "economics": self.calculate_economics(category, difficulty)
        }
        
        return quiz_set
    
    async def generate_mode_variations(self, quiz_set: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mode variations for the quiz set"""
        import random
        variations = {}
        
        # CHAOS MODE - Complete insanity
        chaos_questions = []
        for i, q in enumerate(quiz_set['questions']):
            chaos_q = q.copy()
            chaos_q['question'] = await self.generate_chaos_question(q['question'])
            
            # Add chaos level and emoji
            chaos_level = random.randint(1, 5)
            chaos_emoji = random.choice(self.chaos_reactions)
            chaos_q['question'] = f"{chaos_emoji} {chaos_q['question']}"
            chaos_q['chaos_level'] = chaos_level
            chaos_q['chaos_stars'] = '🌟' * chaos_level
            
            # Randomize answer order for extra chaos
            random.shuffle(chaos_q['answers'])
            chaos_questions.append(chaos_q)
            await asyncio.sleep(0.3)  # Rate limiting
        
        variations['chaos'] = {
            "questions": chaos_questions,
            "timer": 15,
            "bonus_multiplier": 3,
            "chaos_effects": [
                "screen_shake", 
                "rainbow_text", 
                "upside_down_answers",
                "random_rotations",
                "glitch_text",
                "explosion_transitions"
            ],
            "chaos_message": "EMBRACE THE CHAOS! 🎢",
            "bonus_per_chaos_star": 10
        }
        
        # ZEN MODE - Peaceful and meditative
        zen_questions = []
        zen_affirmations = [
            "Breathe deeply. The answer will come.",
            "Trust your intuition.",
            "There is no wrong path, only learning.",
            "Let your mind flow like water.",
            "The universe guides your choice.",
            "Peace comes from within.",
            "Every answer teaches something."
        ]
        
        for q in quiz_set['questions']:
            zen_q = q.copy()
            correct_answer = next(a['text'] for a in q['answers'] if a['correct'])
            zen_q['hint'] = await self.generate_zen_hint(q['question'], correct_answer, quiz_set['category'])
            zen_q['affirmation'] = random.choice(zen_affirmations)
            zen_questions.append(zen_q)
        
        variations['zen'] = {
            "questions": zen_questions,
            "no_timer": True,
            "calm_message": "Take your time. There is no rush. 🧘",
            "zen_music": True,
            "zen_effects": [
                "soft_glow",
                "floating_elements",
                "water_ripples",
                "breathing_animation"
            ],
            "incorrect_message": "That's okay. Every mistake is a lesson. Try again.",
            "correct_message": "Beautiful. Your mind is clear."
        }
        
        # SPEED MODE - High pressure racing
        variations['speed'] = {
            "time_per_question": 8,
            "bonus_multiplier": 2,
            "speed_effects": [
                "timer_pulse",
                "urgency_sounds",
                "countdown_beeps",
                "speed_lines",
                "adrenaline_flash"
            ],
            "speed_message": "GOTTA GO FAST! ⚡",
            "combo_multiplier": True,
            "perfect_streak_bonus": 500,
            "time_bonus_per_second": 10
        }
        
        return variations
    
    async def save_quiz_set(self, quiz_set: Dict[str, Any], variations: Dict[str, Any]):
        """Save quiz set and variations to database"""
        async with db.pool.acquire() as conn:
            # Insert quiz set
            quiz_id = await conn.fetchval("""
                INSERT INTO content (type, data, metadata, tags)
                VALUES ('quiz_set', $1, $2, $3)
                RETURNING id
            """, 
                json.dumps(quiz_set),
                json.dumps({
                    "generated_at": datetime.utcnow().isoformat(),
                    "generator_version": "2.1",
                    "has_trivia": True,
                    "economics_added": True,
                    "economics_version": "1.0"
                }),
                [quiz_set['category']]
            )
            
            # Insert mode variations
            for mode, variation in variations.items():
                await conn.execute("""
                    INSERT INTO content_variations (content_id, mode, variation_data)
                    VALUES ($1, $2, $3)
                """, quiz_id, mode, json.dumps(variation))
            
            logger.info(f"Saved quiz set: {quiz_id} - {quiz_set['title']}")
            return quiz_id
    
    async def run_once(self):
        """Generate one quiz set"""
        # Pick a random category
        category = self.categories[int(datetime.now().timestamp()) % len(self.categories)]
        
        # Generate quiz set
        quiz_set = await self.generate_quiz_set(category)
        
        if len(quiz_set['questions']) < 8:
            logger.error(f"Not enough questions generated: {len(quiz_set['questions'])}")
            return
        
        # Generate variations
        variations = await self.generate_mode_variations(quiz_set)
        
        # Save to database
        await self.save_quiz_set(quiz_set, variations)
    
    async def run_continuous(self, interval_minutes: int = 5):
        """Run continuously, generating quiz sets at intervals"""
        logger.info(f"Starting quiz set generator with {interval_minutes} minute interval")
        
        while True:
            try:
                await self.run_once()
                await asyncio.sleep(interval_minutes * 60)
            except Exception as e:
                logger.error(f"Error in generation cycle: {e}")
                await asyncio.sleep(60)  # Wait a minute before retrying

async def main():
    """Main entry point"""
    await db.connect()
    
    generator = QuizSetGenerator()
    
    # Run once or continuously based on command line args
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        await generator.run_once()
    else:
        await generator.run_continuous()

if __name__ == "__main__":
    asyncio.run(main())
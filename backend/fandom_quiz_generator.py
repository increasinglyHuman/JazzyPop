"""
Fandom Quiz Set Generator for JazzyPop
Specializes in sci-fi, fantasy, anime, and geek culture trivia
Includes references to Bobiverse, Dungeon Crawler Carl, Douglas Adams, anime, game lit, etc.
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
import random

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FandomQuizGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.api_url = "https://api.anthropic.com/v1/messages"
        
        # Focused categories for sci-fi/fantasy/geek culture
        # Use standard categories but will add special fandom tags
        self.categories = [
            'literature',     # For sci-fi/fantasy books
            'film',          # For anime, sci-fi movies
            'gaming',        # For video game lore, LitRPG
            'pop_culture',   # For general fandom content
            'space',         # For space opera, sci-fi
            'technology'     # For cyberpunk, hard sci-fi
        ]
        
        # Map our specialized content to standard categories
        self.category_mapping = {
            'bobiverse': 'literature',
            'douglas_adams': 'literature', 
            'anime': 'film',
            'litrpg': 'gaming',
            'cyberpunk': 'technology',
            'space_opera': 'space'
        }
        
        # Contemporary content references (2024-2025)
        self.contemporary_content = {
            'trending_books': [
                "Katabasis by R.F. Kuang", "The Incandescent by Emily Tesh",
                "Empire of the Damned by Jay Kristoff", "The Mercy of Gods",
                "Wind and Truth by Brandon Sanderson", "The Fourth Consort"
            ],
            'trending_anime': [
                "Mushoku Tensei", "Re:ZERO Season 3", "That Time I Got Reincarnated as a Slime",
                "Villainess Level 99", "No Longer Allowed in Another World",
                "The Beginning After the End", "Apocalypse Bringer Mynoghra"
            ],
            'isekai_trends': [
                "villainess otome game", "reverse isekai", "strategy game worlds",
                "unwilling heroes", "evil protagonist", "corporate isekai"
            ]
        }
        
        # Fandom-specific chaos elements
        self.chaos_themes = [
            'multiverse-hopping', 'mecha-piloting', 'dungeon-crawling',
            'server-lag-experiencing', 'save-scumming', 'speedrunning',
            'min-maxing', 'plot-armor-wearing', 'fourth-wall-breaking',
            'genre-savvy', 'trope-aware', 'wiki-diving', 'fan-theory-crafting'
        ]
        
        self.chaos_characters = [
            'Bob the Replicant', 'Carl the Crawler', 'Marvin the Paranoid Android',
            'OP isekai protagonists', 'redshirts', 'NPCs gaining sentience',
            'anime waifus', 'Cthulhu cultists', 'space marines', 'elven rogues',
            'AI companions', 'magical girls', 'cultivation masters', 'meme lords'
        ]
        
        self.chaos_scenarios = [
            'anime tournament arc', 'spaceship malfunction', 'dungeon boss fight',
            'time loop episode', 'beach episode', 'convention panel',
            'LARP session', 'speedrun attempt', 'character tier debate',
            'shipping war', 'canon vs fanon argument', 'power scaling discussion'
        ]
        
        self.chaos_twists = [
            'but everyone has plot armor',
            'in a badly translated light novel',
            'while the physics engine is broken',
            'but it\'s actually a holodeck malfunction',
            'during a server rollback',
            'in the mirror universe',
            'but magic is just sufficiently advanced technology',
            'while experiencing severe lag',
            'in a crossover episode nobody asked for',
            'but the GM is making it up as they go'
        ]
        
        self.chaos_reactions = ['🚀', '🤖', '⚔️', '🐉', '👾', '🛸', '🎮', '📚', '🌌', '✨']
        
        # Category tiers for economics (all high-tier specialist content)
        self.category_tiers = {cat: 4 for cat in self.categories}
        
        # Special knowledge bases for specific series
        self.series_knowledge = {
            'bobiverse': [
                "Bob's various replicant names", "FAITH", "The Others", "Deltans",
                "3D printing technology", "Von Neumann probes", "The Skippies"
            ],
            'dungeon_crawler_carl': [
                "Princess Donut", "The Crawl", "Mordechai", "Achievement system",
                "Show ratings", "Loot boxes", "Class evolution", "The AI Dungeon"
            ],
            'douglas_adams': [
                "42", "Towels", "Vogon poetry", "Infinite Improbability Drive",
                "Pan Galactic Gargle Blaster", "The Restaurant at the End of the Universe",
                "Mostly Harmless", "Don't Panic"
            ]
        }

    async def generate_quiz_question(self, category: str, question_num: int) -> Dict[str, Any]:
        """Generate a single quiz question with fandom focus"""
        
        # Select random chaos elements for variety
        chaos_character = random.choice(self.chaos_characters)
        chaos_scenario = random.choice(self.chaos_scenarios)
        chaos_theme = random.choice(self.chaos_themes)
        chaos_twist = random.choice(self.chaos_twists)
        
        # Build the prompt with fandom-specific guidance
        prompt = f"""You are the JazzyPop Fandom Quiz Master! Create an incredibly nerdy trivia question about {category}.
        This is question {question_num} of 10 in a quiz set.

        FANDOM STYLE GUIDE:
        - Deep dive into geek culture, sci-fi, fantasy, anime, and gaming
        - Reference specific series including classics AND trending 2024-2025:
          * Bobiverse (Bob, replicants, FAITH, Von Neumann probes)
          * Dungeon Crawler Carl (The Crawl, Princess Donut, achievement system)
          * Douglas Adams (42, towels, Heart of Gold, Vogons)
          * Trending books: Katabasis (R.F. Kuang), Empire of the Damned, Wind and Truth
          * Popular anime: Mushoku Tensei, Re:ZERO S3, Villainess Level 99
          * Isekai trends: villainess otome games, reverse isekai, strategy game worlds
          * LitRPG/GameLit tropes (stats, leveling, respawning, NPCs)
        - Use fandom terminology: "headcanon", "shipping", "best girl/boy", "power levels"
        - Reference memes specific to these communities
        - Include questions about worldbuilding, lore, and fan theories
        
        VARIETY GUIDELINES:
        - Mix question types:
          * Character relationships and development arcs
          * Worldbuilding and lore details
          * Famous quotes and dialogue
          * Power systems and magic/tech rules
          * Easter eggs and references
          * Author/creator trivia
          * Adaptation differences (book vs movie/anime)
          * Fan community moments and memes
          * "What would happen if..." scenarios
        
        CHAOS INTEGRATION:
        - Occasionally frame as: "{chaos_character} in a {chaos_scenario} {chaos_twist}"
        - Use crossover scenarios between different fandoms
        - Reference common fan debates and discussions
        
        ANSWER DESIGN:
        - Include plausible in-universe wrong answers
        - One option can be a funny crossover reference
        - Use terminology fans would recognize
        - Make wrong answers educational about the universe
        
        CRITICAL JSON FORMATTING REQUIREMENTS:
        You MUST return ONLY valid JSON with EXACTLY these 6 fields:
        1. "question" - string, the trivia question
        2. "correct_answer" - string, MUST match one option exactly
        3. "options" - array of EXACTLY 4 strings
        4. "difficulty" - string, MUST be "easy" OR "medium" OR "hard"
        5. "fun_fact" - string, a fact about the answer
        6. "feedback_captions" - object with EXACTLY 5 properties:
           - "perfect": string for all correct
           - "great": string for 7-9 correct
           - "good": string for 4-6 correct
           - "okay": string for 1-3 correct
           - "oops": string for 0 correct
        
        JSON FORMAT (NO OTHER TEXT):
        {{
            "question": "Your question here",
            "correct_answer": "The right answer",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "difficulty": "medium",
            "fun_fact": "Interesting fact here",
            "feedback_captions": {{
                "perfect": "Legendary otaku status achieved!",
                "great": "Your power level is over 9000!",
                "good": "Not bad, young padawan!",
                "okay": "Time to rewatch some classics!",
                "oops": "Did you even read the manga?"
            }}
        }}
        
        VALIDATION CHECKS:
        - correct_answer MUST be one of the 4 options
        - options array MUST have exactly 4 items
        - difficulty MUST be "easy", "medium", or "hard"
        - ALL fields are required
        - Return ONLY the JSON, no other text"""
        
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
                        data = await response.json()
                        content = data['content'][0]['text']
                        
                        # Parse JSON from response
                        try:
                            result = json.loads(content)
                            
                            # Extract feedback_captions if present
                            feedback_captions = result.pop('feedback_captions', None)
                            
                            # Add metadata
                            result['category'] = category
                            result['tier'] = self.category_tiers.get(category, 4)
                            result['chaos_level'] = random.choice(['mild', 'medium', 'extreme'])
                            
                            # Store feedback_captions separately to add to quiz set later
                            if feedback_captions:
                                result['_feedback_captions'] = feedback_captions
                            
                            return result
                            
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse JSON: {content}")
                            return self.create_fallback_question(category, question_num)
                    else:
                        logger.error(f"API error: {response.status}")
                        return self.create_fallback_question(category, question_num)
                        
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return self.create_fallback_question(category, question_num)

    def create_fallback_question(self, category: str, question_num: int) -> Dict[str, Any]:
        """Create a fallback question if API fails"""
        fallback_questions = {
            'bobiverse': {
                "question": "What is the name of the first Bob replicant?",
                "correct_answer": "Milo",
                "options": ["Milo", "Riker", "Homer", "Bill"],
                "difficulty": "medium",
                "fun_fact": "Bob names his replicants after various fictional characters and historical figures."
            },
            'douglas_adams': {
                "question": "What is the answer to the Ultimate Question of Life, the Universe, and Everything?",
                "correct_answer": "42",
                "options": ["42", "Love", "Infinity", "There is no answer"],
                "difficulty": "easy",
                "fun_fact": "Douglas Adams said he chose 42 because it was a funny, ordinary number."
            },
            'anime_manga': {
                "question": "What does 'isekai' mean in anime?",
                "correct_answer": "Another world",
                "options": ["Another world", "Time travel", "Super power", "Romance"],
                "difficulty": "easy",
                "fun_fact": "Isekai has become one of the most popular anime genres in recent years."
            }
        }
        
        default = {
            "question": f"In the {category} universe, which is the most powerful artifact?",
            "correct_answer": "The MacGuffin",
            "options": ["The MacGuffin", "The Plot Device", "The Deus Ex Machina", "The Red Herring"],
            "difficulty": "medium",
            "fun_fact": f"Every good {category} story needs its legendary items!"
        }
        
        question = fallback_questions.get(category, default)
        question['category'] = category
        question['tier'] = self.category_tiers.get(category, 4)
        
        return question

    async def generate_quiz_title(self, category: str) -> str:
        """Generate a creative fandom-focused title"""
        prompt = f"""Create a creative, nerdy title for a {category} trivia quiz.
        
        Guidelines:
        - Use fandom-specific terminology and references
        - Include puns on famous quotes or titles when appropriate
        - Make it sound epic and engaging for fans
        - Keep it under 60 characters
        
        Examples of good fandom titles:
        - "Don't Panic: The Ultimate Hitchhiker's Quiz"
        - "Replicant Revelations: A Bobiverse Brain-Bender"
        - "Plus Ultra! The Ultimate Anime Challenge"
        - "Critical Hit: A D&D Lore Spectacular"
        - "The Crawl Calls: Dungeon Knowledge Test"
        
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
                        data = await response.json()
                        return data['content'][0]['text'].strip()
                    else:
                        return f"Epic {category.replace('_', ' ').title()} Challenge"
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            return f"Ultimate {category.replace('_', ' ').title()} Quiz"

    async def apply_chaos_mode(self, original_question: str, chaos_character: str, 
                             chaos_theme: str, chaos_scenario: str, chaos_twist: str) -> str:
        """Apply chaos mode with fandom-specific twists"""
        prompt = f"""Take this fandom trivia question and transform it into MAXIMUM GEEK CHAOS:

        Original: {original_question}
        
        CHAOS CONTEXT: {chaos_character} in a {chaos_theme} {chaos_scenario} {chaos_twist}
        
        Rewrite styles to use:
        - "Therapist: {chaos_character} isn't real and can't hurt you. {chaos_character}:"
        - "Nobody: ... JRPGs at 3am:"
        - "POV: You're explaining the lore to a normie"
        - "Tell me you're a {category} fan without telling me"
        - "It's 3am and you're wiki-diving when suddenly..."
        - "*Boss music starts playing*"
        - "Chat, is this canon?"
        
        Make it unhinged but keep the core question intact. Use fandom slang and memes.
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
                        data = await response.json()
                        return data['content'][0]['text'].strip()
                    else:
                        return original_question
        except Exception as e:
            logger.error(f"Error applying chaos: {e}")
            return original_question

    async def generate_quiz_set(self, category: str) -> Dict[str, Any]:
        """Generate a complete fandom quiz set with 10 questions"""
        logger.info(f"Generating fandom quiz set for category: {category}")
        
        # Generate title
        title = await self.generate_quiz_title(category)
        
        # Generate 10 questions
        questions = []
        feedback_captions = None
        
        for i in range(10):
            question = await self.generate_quiz_question(category, i + 1)
            
            # Extract feedback_captions from first question
            if i == 0 and '_feedback_captions' in question:
                feedback_captions = question.pop('_feedback_captions')
            elif '_feedback_captions' in question:
                # Remove from other questions to keep consistent
                question.pop('_feedback_captions', None)
            
            # Apply chaos mode to some questions (30% chance)
            if random.random() < 0.3:
                chaos_character = random.choice(self.chaos_characters)
                chaos_theme = random.choice(self.chaos_themes)
                chaos_scenario = random.choice(self.chaos_scenarios)
                chaos_twist = random.choice(self.chaos_twists)
                
                question["question"] = await self.apply_chaos_mode(
                    question["question"],
                    category,
                    chaos_character,
                    chaos_theme,
                    chaos_scenario,
                    chaos_twist
                )
                question['chaos_applied'] = True
            
            questions.append(question)
            
            # Add delay to avoid rate limiting
            await asyncio.sleep(1)
        
        # Calculate economics based on tier
        tier = self.category_tiers.get(category, 4)
        economics = self.calculate_economics(tier)
        
        # Use generated feedback_captions or fallback to fandom-themed defaults
        if not feedback_captions:
            feedback_captions = {
                "perfect": "🎉 Legendary otaku status achieved! Your power level is maximum!",
                "great": "⚡ Impressive! Your fandom knowledge is strong!",
                "good": "✨ Not bad! You've clearly spent time in the wiki!",
                "okay": "📚 Keep studying, young padawan. The lore runs deep!",
                "oops": "💔 Did you even watch the anime? Time for a rewatch marathon!"
            }
        
        # Create the complete quiz set
        quiz_set = {
            'id': str(uuid4()),
            'type': 'quiz_set',
            'category': category,
            'title': title,
            'description': f"A nerdy deep-dive into {category.replace('_', ' ')} - for true fans only!",
            'questions': questions,
            'tier': tier,
            'mode': 'standard',
            'tags': self.generate_tags(category),
            'maturity_rating': 'unrated',
            'validation_status': 'pending',
            'validation_passes': {},  # Empty for triple validation system
            'economics': economics,
            'feedback_captions': feedback_captions,  # Added for validation system
            'feedback_stats': {
                'play_count': 0,
                'like_count': 0,
                'dislike_count': 0,
                'flag_count': 0,
                'difficulty_votes': {'too_easy': 0, 'just_right': 0, 'too_hard': 0}
            },
            'metadata': {
                'generator': 'fandom_quiz_generator',
                'version': '1.0',
                'generated_at': datetime.utcnow().isoformat(),
                'special_series': [
                    series for series in ['bobiverse', 'dungeon_crawler_carl', 'douglas_adams'] 
                    if series in category
                ]
            }
        }
        
        return quiz_set

    def generate_tags(self, category: str) -> List[str]:
        """Generate appropriate tags including special event tags"""
        # Base tags
        tags = ['fandom', 'geek_culture', category, 'specialist']
        
        # Add category-specific tags
        if category in ['anime_manga', 'isekai', 'villainess_isekai', 'mecha_anime']:
            tags.extend(['otaku', 'anime_special', 'japan_culture'])
            
        if category == 'bobiverse':
            tags.extend(['hard_scifi', 'space_exploration', 'ai_fiction'])
            
        if category == 'douglas_adams':
            tags.extend(['british_humor', 'classic_scifi', 'comedy_scifi'])
            
        if category in ['litrpg_gamelit', 'video_game_lore']:
            tags.extend(['gaming_culture', 'rpg_mechanics'])
            
        if category in ['cyberpunk', 'trending_scifi_2025']:
            tags.extend(['future_tech', 'dystopian'])
            
        # Special event tags (can be activated/deactivated for holidays)
        # These could be controlled by a config or date check
        event_tags = {
            'golden_week': ['otaku', 'anime_special'],  # Apr 29 - May 5
            'tanabata': ['otaku', 'anime_special'],      # July 7
            'comiket': ['otaku', 'manga_special'],       # August & December
            'halloween': ['horror', 'dark_fantasy'],      # October 31
            'may_fourth': ['space_opera', 'star_wars']   # May 4
        }
        
        # You could add date checking here to automatically add event tags
        # For now, these are just available for manual activation
        
        return list(set(tags))  # Remove duplicates
    
    def calculate_economics(self, tier: int) -> Dict[str, Any]:
        """Calculate economics for specialist fandom content (premium tier)"""
        # Higher costs and rewards for specialist content
        base_costs = {
            1: {'coins': 25, 'gems': 1},
            2: {'coins': 50, 'gems': 2},
            3: {'coins': 75, 'gems': 3},
            4: {'coins': 100, 'gems': 5}  # Premium specialist content
        }
        
        base_rewards = {
            1: {'coins': 50, 'gems': 1, 'xp': 25},
            2: {'coins': 100, 'gems': 2, 'xp': 50},
            3: {'coins': 150, 'gems': 3, 'xp': 75},
            4: {'coins': 250, 'gems': 5, 'xp': 150}  # Premium rewards
        }
        
        costs = base_costs.get(tier, base_costs[4])
        rewards = base_rewards.get(tier, base_rewards[4])
        
        return {
            'cost': costs,
            'rewards': {
                'base': rewards,
                'perfect': {
                    'coins': rewards['coins'] * 2,
                    'gems': rewards['gems'] * 2,
                    'xp': rewards['xp'] * 2
                },
                'speed_bonus': {
                    'coins': 50,
                    'xp': 50
                }
            },
            'unlock_requirements': {
                'level': tier * 10,  # Level 40 for tier 4
                'achievements': ['fandom_initiate', 'wiki_warrior', 'lore_master']
            }
        }

    async def save_quiz_set(self, quiz_set: Dict[str, Any]) -> bool:
        """Save quiz set to database"""
        try:
            async with db.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO content (type, data, metadata, tags)
                    VALUES ($1, $2, $3, $4)
                """, 
                'quiz_set',
                json.dumps(quiz_set),
                json.dumps(quiz_set.get('metadata', {})),
                quiz_set.get('tags', [])
                )
                
            logger.info(f"Successfully saved fandom quiz set: {quiz_set['title']}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving quiz set: {e}")
            return False

    async def run_generator(self):
        """Main generator loop for fandom content"""
        logger.info("Starting Fandom Quiz Generator - Specializing in sci-fi, fantasy, and geek culture!")
        
        while True:
            try:
                # Rotate through categories
                for category in self.categories:
                    # Check if we need more content for this category
                    async with db.pool.acquire() as conn:
                        count = await conn.fetchval("""
                            SELECT COUNT(*) FROM content 
                            WHERE type = 'quiz_set' 
                            AND data->>'category' = $1
                            AND validation_status IN ('pending', 'approved')
                            AND metadata->>'generator' = 'fandom_quiz_generator'
                        """, category)
                        
                        # Generate if we have less than 20 sets for this category
                        if count < 20:
                            logger.info(f"Category {category} has {count} sets, generating more...")
                            
                            quiz_set = await self.generate_quiz_set(category)
                            success = await self.save_quiz_set(quiz_set)
                            
                            if success:
                                logger.info(f"Generated fandom quiz: {quiz_set['title']}")
                            
                            # Delay between generations
                            await asyncio.sleep(30)
                
                # Long delay between cycles
                logger.info("Completed generation cycle, sleeping for 30 minutes...")
                await asyncio.sleep(1800)  # 30 minutes
                
            except Exception as e:
                logger.error(f"Generator error: {e}")
                await asyncio.sleep(60)

async def main():
    """Main entry point"""
    await db.connect()
    
    generator = FandomQuizGenerator()
    
    # Run once or continuously based on command line args
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # Generate one set for testing
        category = sys.argv[2] if len(sys.argv) > 2 else random.choice(generator.categories)
        quiz_set = await generator.generate_quiz_set(category)
        print(json.dumps(quiz_set, indent=2))
    else:
        # Run continuous generation
        await generator.run_generator()
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
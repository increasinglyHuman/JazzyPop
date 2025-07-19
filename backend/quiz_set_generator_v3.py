"""
Quiz Set Generator v3.0 for JazzyPop
Enhanced version with:
- Age-appropriate difficulty levels (6-13 years)
- 50+ new categories focusing on accessible common knowledge
- 4x expanded chaos variations
- Mode tagging and chaos bonus rewards
- Improved prompt instructions
- Content filtering for child safety

FEEDBACK CONSOLIDATION OPTIONS:
Currently, quiz generation and feedback are separate passes:
1. quiz_set_generator.py creates questions
2. validation_prompts.py adds feedback captions

Consolidation approaches considered:
Option A: Include feedback in initial generation
  - Pros: Single API call, consistent style
  - Cons: Breaks existing API contract, larger prompts

Option B: Add optional 'include_feedback' parameter
  - Pros: Backward compatible, flexible
  - Cons: More complex code, optional features can confuse

Option C: Keep separate (RECOMMENDED)
  - Pros: Maintains API compatibility, separation of concerns
  - Cons: Two API calls, potential style inconsistency

Recommendation: Keep separate for v3.0 to maintain compatibility.
Future v4.0 could consolidate with proper API versioning.
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

class ContentFilter:
    """Content filter to ensure kid-safe quiz questions"""
    
    def __init__(self):
        # Inappropriate words/phrases to filter
        # Only filter the really inappropriate stuff - trust Haiku's judgment!
        self.inappropriate_terms = [
            # Extreme violence
            'murder', 'torture', 'massacre', 'slaughter', 'gore',
            
            # Explicit content
            'sex', 'sexual', 'erotic', 'porn', 'nude', 'naked',
            
            # Hard drugs
            'cocaine', 'heroin', 'meth', 'crack',
            
            # Hate speech
            'racism', 'sexism', 'bigotry', 'discrimination',
            
            # Self-harm
            'suicide', 'self-harm', 'cutting'
        ]
        
        # Topics to be careful with (context matters)
        self.sensitive_topics = [
            'terminal illness', 'graphic accidents', 'natural disasters',
            'extreme poverty', 'homelessness', 'war zones',
            'serious mental health issues', 'eating disorders'
        ]
        
        # Safe replacement suggestions
        self.safe_replacements = {
            'fight': 'compete',
            'battle': 'challenge',
            'kill': 'defeat',
            'dead': 'finished',
            'stupid': 'silly',
            'dumb': 'goofy',
            'hate': 'dislike',
            'monster': 'creature',
            'ghost': 'spirit friend',
            'scary': 'surprising'
        }
    
    def is_content_safe(self, text: str) -> bool:
        """Check if content is safe for kids"""
        text_lower = text.lower()
        
        # Check for inappropriate terms
        for term in self.inappropriate_terms:
            if term in text_lower:
                logger.warning(f"Content filter blocked term: {term}")
                return False
        
        # Check for sensitive topics
        for topic in self.sensitive_topics:
            if topic in text_lower:
                logger.warning(f"Content filter blocked topic: {topic}")
                return False
        
        # Additional profanity pattern checking
        import re
        profanity_patterns = [
            r'\bf[*@#$%!]+c?k\b',  # F-word with censoring
            r'\bs[*@#$%!]+i?t\b',  # S-word with censoring
            r'\bb[*@#$%!]+t?ch\b', # B-word with censoring
            r'\b[a@][*@#$%!]+s{1,2}\b', # A-word with censoring
            r'\bd[*@#$%!]+c?k\b',  # D-word with censoring
            # Actual profanity (word boundaries to avoid false positives)
            r'\bfuck\b', r'\bshit\b', r'\bbitch\b', r'\bdick\b',
            r'\bcunt\b', r'\bcock\b', r'\bbastard\b',
            # Only catch "ass" when standalone or in compound profanity
            r'\bass\s', r'\bass$', r'asshole', r'jackass', r'dumbass'
        ]
        
        for pattern in profanity_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Content filter blocked profanity pattern: {pattern}")
                return False
        
        return True
    
    def filter_question(self, question_data: Dict[str, Any]) -> Dict[str, Any]:
        """Filter and clean a question"""
        if not question_data:
            return question_data
        
        # Check question text
        if not self.is_content_safe(question_data.get('question', '')):
            logger.warning("Question failed content filter")
            return None
        
        # Check all answers
        for answer in question_data.get('answers', []):
            if not self.is_content_safe(answer.get('text', '')):
                logger.warning(f"Answer failed content filter: {answer.get('text', '')}")
                return None
        
        # Check explanation
        if not self.is_content_safe(question_data.get('explanation', '')):
            logger.warning("Explanation failed content filter")
            return None
        
        return question_data
    
    def get_safety_prompt(self) -> str:
        """Get safety instructions for AI prompt"""
        return """
        CONTENT GUIDELINES FOR KIDS (Ages 6-13):
        
        You're creating content for children, so use your best judgment!
        Think like a fun, caring teacher or cool aunt/uncle.
        
        AVOID:
        - Graphic violence or gore (playful competition is fine!)
        - Adult themes (innocent crushes and friendship are sweet!)
        - Truly scary content (silly spooky is OK!)
        - Mean-spirited content (gentle teasing between friends is fine!)
        - Inappropriate language (you know what not to say!)
        
        EMBRACE:
        - Joy, wonder, and discovery
        - Kindness and encouragement
        - Age-appropriate humor (even potty humor if tasteful!)
        - Cultural references kids would know
        - Educational moments wrapped in fun
        
        When in doubt, imagine you're talking to a smart 10-year-old
        at a family gathering. Keep it classy but fun!
        """

class QuizSetGeneratorV3:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.content_filter = ContentFilter()
        
        # Original categories
        self.original_categories = [
            'technology', 'science', 'history', 'geography', 'literature',
            'film', 'music', 'art', 'sports', 'nature', 'animals', 'food_cuisine',
            'pop_culture', 'mythology', 'space', 'gaming', 'internet_culture',
            'architecture', 'ancient_architecture', 'fashion_design', 'inventions',
            'famous_lies', 'language_evolution', 'dinosaurs', 'fame_glory'
        ]
        
        # 50 new accessible categories for ages 6-13
        self.new_categories = [
            # School & Learning
            'school_life', 'playground_games', 'classroom_facts', 'school_supplies',
            'homework_helpers', 'recess_fun', 'cafeteria_culture',
            
            # Entertainment & Media
            'cartoon_characters', 'disney_magic', 'pixar_universe', 'superhero_basics',
            'youtube_stars', 'tiktok_trends', 'minecraft_world', 'roblox_adventures',
            'pokemon_basics', 'anime_intro', 'comic_books',
            
            # Everyday Life
            'toys_and_games', 'birthday_parties', 'holidays_worldwide', 'family_traditions',
            'pets_and_care', 'backyard_nature', 'weather_wonders', 'seasons_and_changes',
            
            # Fun Facts & Curiosities
            'weird_but_true', 'world_records', 'optical_illusions', 'magic_tricks',
            'riddles_and_puzzles', 'tongue_twisters', 'knock_knock_jokes',
            
            # Basic Science & Discovery
            'simple_experiments', 'kitchen_science', 'body_basics', 'five_senses',
            'colors_and_rainbows', 'sounds_and_music', 'magnets_and_forces',
            
            # Adventure & Exploration
            'treasure_hunting', 'camping_basics', 'ocean_creatures', 'jungle_adventures',
            'space_for_kids', 'robot_friends', 'time_travel_tales',
            
            # Social & Cultural
            'friendship_facts', 'emotions_and_feelings', 'manners_matter',
            'celebrations_worldwide', 'food_from_everywhere', 'dance_styles',
            'sports_for_beginners'
        ]
        
        # Combine all categories
        self.categories = self.original_categories + self.new_categories
        
        # Expanded chaos elements (4x the original)
        self.chaos_themes = [
            # Original themes
            'time-traveling', 'interdimensional', 'underwater', 'space-faring',
            'microscopic', 'giant-sized', 'sparkly', 'neon-lit', 'holographic',
            'steampunk', 'cyberpunk', 'solarpunk', 'mythological', 'quantum',
            
            # New themes (3x more)
            'marshmallow-powered', 'glitter-infused', 'rubber-duck-themed',
            'pizza-dimensional', 'unicorn-blessed', 'disco-infected', 'meme-ified',
            'bubble-wrapped', 'rainbow-powered', 'sock-puppet-controlled',
            'waffle-shaped', 'jellybean-fueled', 'blanket-fort-based',
            'crayon-colored', 'pillow-fighting', 'backwards-running',
            'upside-down', 'inside-out', 'diagonal-living', 'spiral-shaped',
            'zigzag-patterned', 'polka-dotted', 'striped-reality',
            'plaid-universe', 'tie-dye-dimension', 'glowstick-powered',
            'bubblegum-scented', 'chocolate-coated', 'sprinkle-covered',
            'frosting-filled', 'cookie-crumbling', 'ice-cream-melting',
            'pancake-flipping', 'syrup-dripping', 'whipped-cream-topped',
            'cherry-on-top', 'birthday-cake-themed', 'party-hat-wearing',
            'confetti-throwing', 'balloon-floating', 'pinata-smashing',
            'gift-wrapped', 'bow-tied', 'ribbon-dancing'
        ]
        
        self.chaos_characters = [
            # Original characters
            'robot unicorns', 'philosophical penguins', 'coding wizards',
            'dancing algorithms', 'sentient emojis', 'time-traveling tacos',
            'quantum cats', 'interdimensional llamas', 'cyber dolphins',
            'glitter programmers', 'alien baristas', 'ninja librarians',
            
            # New characters (3x more)
            'breakdancing bananas', 'skateboarding sloths', 'rapping robots',
            'beatboxing butterflies', 'moonwalking marshmallows', 'surfing sushi',
            'yoga-practicing yetis', 'meditation gurus who are actually goldfish',
            'karate-chopping cupcakes', 'ballet-dancing burritos',
            'opera-singing oranges', 'jazz-playing jellyfish',
            'rock-and-roll raccoons', 'hip-hop hamsters', 'country-singing cacti',
            'techno-mixing turtles', 'dubstep dragons', 'lo-fi llamas',
            'vaporwave vampires', 'synthwave sharks', 'retrowave rabbits',
            'future-funk foxes', 'chillhop chickens', 'trap-music tigers',
            'house-music horses', 'ambient-music alpacas', 'experimental elephants',
            'indie-rock iguanas', 'punk-rock pandas', 'metal-music monkeys',
            'classical-music cats', 'folk-music frogs', 'reggae rhinoceros',
            'salsa-dancing salamanders', 'tango-dancing toucans',
            'waltz-dancing walruses', 'cha-cha chickadees', 'rumba roosters',
            'samba squirrels', 'merengue mice', 'bachata bats',
            'swing-dancing swans', 'lindy-hopping lobsters', 'jive-dancing jackals',
            'foxtrot foxes', 'quickstep quokkas', 'viennese-waltz vultures'
        ]
        
        self.chaos_scenarios = [
            # Original scenarios
            'dance battle', 'cooking competition', 'escape room',
            'talent show', 'detective mystery', 'game show', 'adventure quest',
            'musical', 'sports tournament', 'fashion show', 'debate club',
            'tea party', 'space race', 'treasure hunt', 'karaoke night',
            
            # New scenarios (3x more)
            'pillow fort building contest', 'bubble wrap popping contest',
            'paper airplane Olympics', 'sock puppet theater', 'blanket fort building',
            'rubber duck race', 'marshmallow building competition',
            'crayon art gallery opening', 'playdough sculpture showdown',
            'LEGO master builder challenge', 'hopscotch tournament',
            'jump rope championship', 'hula hoop marathon', 'pogo stick race',
            'skateboard trick contest', 'water balloon toss festival',
            'foam dart tag championship', 'laser tag championship', 'dodgeball tournament',
            'capture the flag adventure', 'hide and seek championship',
            'tag team races', 'thumb wrestling tournament',
            'staring contest finals', 'tickle giggle festival',
            'snowball sculpture spectacular', 'sandcastle competition',
            'leaf pile jumping jamboree', 'puddle splashing party',
            'bubble blowing bonanza', 'kite flying festival',
            'paper boat regatta', 'bottle flip challenge', 'cup stacking speed run',
            'domino toppling spectacular', 'jenga tournament', 'uno championship',
            'monopoly marathon', 'scrabble showdown', 'chess championship',
            'checkers championship', 'connect four finals', 'tic-tac-toe tournament',
            'rock paper scissors world series', 'thumb wrestling championship',
            'arm strength contest', 'pie eating competition', 'hot dog eating contest'
        ]
        
        self.chaos_twists = [
            # Original twists
            'but everything is made of jello',
            'while riding unicycles',
            'in a world where gravity works backwards',
            'but everyone communicates only in haikus',
            'during a solar eclipse',
            'inside a giant snow globe',
            'where colors have flavors',
            'but time moves in loops',
            'in a reality TV show format',
            'where physics laws are suggestions',
            
            # New twists (3x more)
            'but the floor is actually lava', 'while wearing oven mitts',
            'in slow motion like a movie', 'but everyone speaks in rhyme',
            'during a glitter storm', 'inside a bounce house',
            'where sounds create colors', 'but gravity changes every minute',
            'on a game show hosted by cats', 'where thoughts become bubbles',
            'but everyone has hiccups', 'while hopping on one foot',
            'in a world made of LEGO blocks', 'but shadows come alive',
            'during a dance-off with robots', 'inside a giant hamster ball',
            'where music controls the weather', 'but words float in the air',
            'on live stream with millions watching', 'where sneezes teleport you',
            'but everyone has googly eyes', 'while juggling rubber chickens',
            'in a dimension of infinite mirrors', 'but laughter makes things grow',
            'during a yodel competition', 'inside a kaleidoscope',
            'where dreams and reality swap', 'but walking makes music',
            'on a stage made of trampolines', 'where whispers echo loudly',
            'but blinking changes the channel', 'while wearing inflatable suits',
            'in a world of only primary colors', 'but emotions have flavors',
            'during opposite day', 'inside a giant gumball machine',
            'where jokes alter reality', 'but thinking out loud is mandatory',
            'on a spaceship made of cheese', 'where high-fives open portals',
            'but everyone moves like robots', 'while balancing on beach balls',
            'in a universe of infinite loops', 'but silence makes things invisible'
        ]
        
        self.chaos_reactions = [
            '🤯', '🎢', '🌟', '🚀', '🎭', '⚡', '🌈', '🔮', '🎪', '💫',
            '🎨', '🎯', '🎪', '🎭', '🎨', '🎵', '🎸', '🥳', '🤸', '🎡',
            '🎠', '🎢', '🎪', '🎭', '🎨', '🎯', '🎳', '🎮', '🕹️', '🎲'
        ]
        
        # Pop culture references for chaos mode
        self.pop_culture_refs = [
            "like that one TikTok trend", "vibes like a Minecraft speedrun",
            "giving main character energy", "no cap fr fr", "it's giving chaos",
            "lowkey highkey", "caught in 4K", "ratio + L + you fell off",
            "tell me you're X without telling me", "POV: you're",
            "it's the ___ for me", "and I oop-", "periodt", "slay queen",
            "that's sus", "big yikes", "weird flex but ok", "I'm baby",
            "OK boomer", "and that's on period", "hits different",
            "living rent free", "understood the assignment", "it's cheugy",
            "bussin fr", "no thoughts head empty", "I'm not like other ___",
            "gaslight gatekeep girlboss", "touch grass", "chronically online",
            "NPC behavior", "side quest unlocked", "achievement unlocked",
            "speedrun any%", "lag spike incoming", "needs a nerf",
            "absolutely cracked", "skill issue", "GG EZ", "press F to pay respects",
            "poggers", "based and redpilled", "copium overdose", "hopium supplies",
            "that's a vibe check", "failed the vibe check", "passed the vibe check",
            "say less fam", "bet", "deadass", "on god", "sheesh", "bruh moment"
        ]
        
        # Enhanced category tiers with age considerations
        self.category_tiers = {
            # Tier 1 - Super accessible (ages 6-8)
            **{cat: 1 for cat in [
                'animals', 'nature', 'food_cuisine', 'cartoon_characters',
                'toys_and_games', 'playground_games', 'colors_and_rainbows',
                'five_senses', 'pets_and_care', 'weather_wonders'
            ]},
            
            # Tier 2 - Elementary level (ages 8-10)
            **{cat: 2 for cat in [
                'sports', 'history', 'geography', 'disney_magic', 'pixar_universe',
                'school_life', 'holidays_worldwide', 'body_basics', 'ocean_creatures',
                'friendship_facts', 'weird_but_true', 'riddles_and_puzzles'
            ]},
            
            # Tier 3 - Pre-teen accessible (ages 10-13)
            **{cat: 3 for cat in [
                'technology', 'science', 'space', 'minecraft_world', 'roblox_adventures',
                'youtube_stars', 'tiktok_trends', 'superhero_basics', 'world_records',
                'simple_experiments', 'robot_friends'
            ]},
            
            # Tier 4 - Advanced but still age-appropriate
            **{cat: 4 for cat in [
                'gaming', 'internet_culture', 'mythology', 'inventions',
                'ancient_architecture', 'language_evolution', 'time_travel_tales',
                'optical_illusions', 'magic_tricks'
            ]}
        }
        
        # Difficulty level definitions
        self.difficulty_levels = {
            'super_low': {
                'description': 'Perfect for 6-7 year olds',
                'complexity': 0.2,
                'example_types': ['counting', 'colors', 'basic animals', 'simple shapes']
            },
            'pretty_low': {
                'description': 'Great for 7-9 year olds',
                'complexity': 0.4,
                'example_types': ['basic facts', 'common knowledge', 'popular characters']
            },
            'low': {
                'description': 'Suitable for 9-11 year olds',
                'complexity': 0.6,
                'example_types': ['school topics', 'fun facts', 'pop culture basics']
            },
            'average': {
                'description': 'Challenging for 11-13 year olds',
                'complexity': 0.8,
                'example_types': ['deeper knowledge', 'connections', 'critical thinking']
            }
        }
    
    def get_category_difficulty(self, category: str) -> str:
        """Determine difficulty based on category tier"""
        tier = self.category_tiers.get(category, 2)
        if tier == 1:
            return "super_low"
        elif tier == 2:
            return "pretty_low"
        elif tier == 3:
            return "low"
        else:  # tier 4
            return "average"
    
    def calculate_economics(self, category: str, difficulty: str, mode: str = 'poqpoq') -> Dict[str, Any]:
        """Calculate economics data for a quiz set with mode-specific bonuses"""
        tier = self.category_tiers.get(category, 2)
        
        # Calculate difficulty multiplier
        difficulty_multipliers = {
            'super_low': 0.5,
            'pretty_low': 0.7,
            'low': 1.0,
            'average': 1.3
        }
        diff_mult = difficulty_multipliers.get(difficulty, 1.0)
        
        # Calculate cost
        cost = {
            'energy': int(15 * (1 + (tier - 1) * 0.2)),  # Lower energy costs for kids
            'coins': 0  # Keep base quizzes free
        }
        
        # Calculate base rewards
        rewards = {
            'xp': int(40 * tier * diff_mult),
            'coins': int(80 * tier * diff_mult),
            'gems': {
                'sapphires': 0,
                'emeralds': 0,
                'rubies': 0,
                'amethysts': 0,
                'diamonds': 0
            }
        }
        
        # Add gem rewards based on tier and difficulty
        if tier >= 2 and difficulty not in ['super_low']:
            rewards['gems']['sapphires'] = 1
        if tier >= 3 and difficulty in ['low', 'average']:
            rewards['gems']['emeralds'] = 1
        if tier == 4 and difficulty == 'average':
            rewards['gems']['rubies'] = 1
            
        # Perfect score bonuses
        perfect_bonus = {
            'xp_multiplier': 1.5,
            'coins_multiplier': 1.5,
            'extra_gems': {}
        }
        
        if tier >= 3:
            perfect_bonus['extra_gems']['amethysts'] = 1
        if tier == 4 and difficulty == 'average':
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
        
        # Special chaos mode bonus
        if mode == 'chaos':
            rewards['bonus'] = {
                'type': 'chaos_completion',
                'amount': int(50 * tier),
                'description': 'Chaos mode completion bonus!'
            }
        
        return {
            'cost': cost,
            'rewards': rewards,
            'perfect_bonus': perfect_bonus,
            'streak_bonuses': streak_bonuses,
            'mode_multipliers': mode_multipliers,
            'tier': tier,
            'value_score': tier * diff_mult * 10,  # Overall value metric
            'mode': mode  # Include mode in economics
        }
        
    async def generate_quiz_question(self, category: str, question_num: int, difficulty: str, mode: str = 'poqpoq') -> Dict[str, Any]:
        """Generate a single quiz question with difficulty and mode awareness"""
        # Add some chaos context for variety
        chaos_character = random.choice(self.chaos_characters)
        chaos_scenario = random.choice(self.chaos_scenarios)
        pop_ref = random.choice(self.pop_culture_refs)
        
        # Difficulty-specific instructions
        diff_config = self.difficulty_levels[difficulty]
        
        prompt = f"""You are the JazzyPop Quiz Master creating a {mode} mode quiz! Create an entertaining trivia question about {category}.
        This is question {question_num} of 10 in a quiz set.
        
        TARGET AUDIENCE: Ages 6-13, specifically {diff_config['description']}
        DIFFICULTY LEVEL: {difficulty} (complexity: {diff_config['complexity']})
        MODE: {mode}

        JAZZYPOP STYLE GUIDE FOR KIDS:
        - Use simple, clear language appropriate for the age group
        - Include fun, relatable references kids will understand
        - For chaos mode: Use silly humor and {pop_ref}
        - Mix real knowledge with playful elements
        - Reference things kids love: games, cartoons, school, friends
        - Make wrong answers silly but not confusing
        - Keep it educational but super fun!
        
        CRITICAL QUIZ QUALITY RULES:
        - AVOID obvious questions (e.g., "What color is the sky?")
        - AVOID common knowledge everyone knows
        - DIG DEEPER: Find interesting, lesser-known facts
        - Make questions that teach something new
        - Focus on "wow, I didn't know that!" moments
        - For {mode} mode: Questions must CLEARLY reflect the mode's style
        
        JAZZYPOP VOICE:
        - Enthusiastic and encouraging
        - Slightly quirky but always kind
        - Like a fun teacher who makes learning an adventure
        - Use exclamation points for excitement!
        - Include fun asides and observations
        - Make kids feel smart for knowing the answer
        
        AGE-APPROPRIATE GUIDELINES FOR {difficulty}:
        - Question complexity: {diff_config['complexity']}/1.0
        - Focus on: {', '.join(diff_config['example_types'])}
        - Avoid: complex vocabulary, abstract concepts, mature themes
        - Use: concrete examples, visual descriptions, familiar contexts
        
        MODE-SPECIFIC RULES:
        """
        
        if mode == 'chaos':
            prompt += f"""
        CHAOS MODE ACTIVATED! 🎪
        - Frame the question with: {chaos_character} in a {chaos_scenario}
        - Use maximum silliness and {pop_ref}
        - Wrong answers should be hilariously wrong
        - Add emojis and excitement!
        - Make it feel like a wild adventure
        - Tag with: chaos, wild, unhinged
        """
        elif mode == 'zen':
            prompt += """
        ZEN MODE - Peaceful Learning 🧘
        - Use calm, encouraging language
        - Focus on the joy of learning
        - Wrong answers should teach something too
        - No time pressure implied
        - Tag with: zen, peaceful, mindful
        """
        elif mode == 'speed':
            prompt += """
        SPEED MODE - Quick Thinking! ⚡
        - Make questions clear and snappy
        - Answers should be quick to read
        - Focus on instant recognition
        - Tag with: speed, fast, quick
        """
        else:  # poqpoq (standard)
            prompt += """
        STANDARD MODE - Classic Fun! 🌟
        - Balance education and entertainment
        - Clear, engaging questions
        - Tag with: poqpoq, standard, classic
        """
        
        prompt += f"""
        
        {self.content_filter.get_safety_prompt()}
        
        ANSWER DESIGN FOR KIDS:
        - Make the correct answer clearly right when you know it
        - Wrong answers should be obviously silly or clearly wrong
        - Use familiar examples from kids' lives
        - Keep all answers short and readable
        
        Return JSON with this exact format:
        {{
            "question": "Your creative question here",
            "answers": [
                {{"id": "a", "text": "Answer 1", "correct": false}},
                {{"id": "b", "text": "Answer 2", "correct": true}},
                {{"id": "c", "text": "Answer 3", "correct": false}},
                {{"id": "d", "text": "Answer 4", "correct": false}}
            ],
            "explanation": "Kid-friendly explanation that makes learning fun!",
            "mode": "{mode}",
            "difficulty": "{difficulty}",
            "tags": ["tag1", "tag2", "{mode}", "{category}"]
        }}
        
        Return ONLY the JSON, no other text."""
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 600,
            "temperature": 0.9 if mode == 'chaos' else 0.7,
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
                        question_data = json.loads(content)
                        # Ensure mode and difficulty are included
                        question_data['mode'] = mode
                        question_data['difficulty'] = difficulty
                        
                        # Filter the question for safety
                        filtered_question = self.content_filter.filter_question(question_data)
                        if not filtered_question:
                            logger.warning(f"Question failed content filter, regenerating...")
                            # Return None to trigger regeneration
                            return None
                        
                        return filtered_question
                    else:
                        logger.error(f"API error: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            return None
    
    async def generate_quiz_title(self, category: str, mode: str = 'poqpoq') -> str:
        """Generate a creative title for the quiz set based on mode"""
        mode_themes = {
            'chaos': "wild, chaotic, unhinged, explosive, bonkers",
            'zen': "peaceful, calming, mindful, serene, tranquil",
            'speed': "lightning-fast, turbo-charged, supersonic, rapid-fire",
            'poqpoq': "amazing, fantastic, wonderful, awesome, incredible"
        }
        
        prompt = f"""Create a kid-friendly, engaging title for a {category} trivia quiz in {mode} mode.
        
        Mode theme: {mode_themes.get(mode, 'fun')}
        Target audience: Kids ages 6-13
        
        Guidelines:
        - Make it exciting and inviting for kids
        - Use {mode} mode themes
        - Include fun wordplay or alliteration
        - Keep it under 50 characters
        - Make kids want to play!
        
        Examples for {mode} mode:
        """
        
        if mode == 'chaos':
            prompt += """
        - "Bonkers Banana {category} Blowout!"
        - "Wild & Wacky {category} Whirlwind!"
        - "Chaos Carnival: {category} Craziness!"
        """
        elif mode == 'zen':
            prompt += """
        - "Peaceful {category} Paradise"
        - "Zen Garden of {category} Knowledge"
        - "Mindful {category} Moments"
        """
        elif mode == 'speed':
            prompt += """
        - "Lightning {category} Challenge!"
        - "Turbo {category} Time Trial!"
        - "Speed Demon {category} Derby!"
        """
        else:
            prompt += """
        - "Amazing {category} Adventure!"
        - "Fantastic {category} Fun Time!"
        - "Wonderful World of {category}!"
        """
        
        prompt += f"\n\nReturn ONLY the title for {category} in {mode} mode, no quotes, no other text."
        
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
                        return f"Amazing {category.title()} {mode.title()} Challenge"
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            return f"Amazing {category.title()} {mode.title()} Challenge"
    
    async def generate_chaos_question(self, original_question: str) -> str:
        """Generate chaos mode version of a question with expanded variations"""
        # Pick random chaos elements
        theme = random.choice(self.chaos_themes)
        character = random.choice(self.chaos_characters)
        scenario = random.choice(self.chaos_scenarios)
        twist = random.choice(self.chaos_twists)
        pop_ref = random.choice(self.pop_culture_refs)
        
        # Chaos question templates
        templates = [
            f"*Record scratch* *Freeze frame* Yup, that's {character}. You're probably wondering how they ended up in this {scenario}. Well, it all started with this question: {original_question}",
            f"POV: You're {character} {twist} and someone asks: {original_question}",
            f"Nobody: ... Absolutely nobody: ... {character} during a {theme} {scenario}: {original_question}",
            f"Breaking news: {character} just started a {scenario} {twist}! But first, they need to know: {original_question}",
            f"AITA for asking '{original_question}' during a {theme} {scenario}?",
            f"Wrong answers only: {character} wants to know {original_question}",
            f"Tell me you know the answer to '{original_question}' without telling me you know it, while {character} judges you {twist}",
            f"{pop_ref} but it's {character} asking: {original_question}",
            f"Therapist: '{theme} {character} asking {original_question} {twist}' isn't real, they can't hurt you. {theme} {character}:",
            f"No one: {character} at 3am during a {scenario}: {original_question}",
            f"Roses are red, violets are blue, {character} started a {scenario}, now answer: {original_question}",
            f"Instructions unclear, {character} stuck in a {theme} {scenario} {twist}. Anyway, {original_question}",
            f"Sir, this is a Wendy's... where {character} is hosting a {scenario}. Can you please just answer: {original_question}",
            f"*{character} has entered the chat* *{scenario} has started* *{twist}* So anyway... {original_question}",
            f"Imagine: {character} + {scenario} + {twist} = pure chaos. Now imagine they ask: {original_question}"
        ]
        
        return random.choice(templates)
    
    async def generate_zen_hint(self, question: str, correct_answer: str, category: str) -> str:
        """Generate zen mode hints that are helpful for kids"""
        hints = [
            f"Take a deep breath and think about {category}... The answer starts with '{correct_answer[0]}'",
            f"Close your eyes and imagine... The answer has {len(correct_answer.split())} words",
            f"Trust your first instinct... Think about what you learned about {category}",
            f"The universe whispers... It rhymes with {self.find_rhyme(correct_answer)}",
            f"Like a gentle stream... The answer has {len(correct_answer)} letters",
            f"Peace comes from knowledge... Remember your {category} lessons",
            f"Breathe in wisdom... The answer is something you might have seen recently"
        ]
        return random.choice(hints)
    
    def find_rhyme(self, word: str) -> str:
        """Simple rhyme finder for hints"""
        # This is a simplified version - in production you'd want a proper rhyme dictionary
        last_sound = word[-2:] if len(word) > 2 else word
        rhyme_hints = {
            'at': 'cat', 'og': 'log', 'un': 'fun', 'ay': 'day',
            'ee': 'tree', 'oo': 'zoo', 'ar': 'star', 'or': 'door'
        }
        return rhyme_hints.get(last_sound, 'something special')
    
    async def generate_quiz_set(self, category: str, mode: str = 'poqpoq') -> Dict[str, Any]:
        """Generate a complete quiz set with 10 questions for a specific mode"""
        logger.info(f"Generating {mode} mode quiz set for category: {category}")
        
        # Generate title based on mode
        title = await self.generate_quiz_title(category, mode)
        
        # Determine difficulty based on category
        difficulty = self.get_category_difficulty(category)
        
        # Generate 10 questions with retry logic for filtered content
        questions = []
        for i in range(10):
            max_retries = 3
            for retry in range(max_retries):
                question = await self.generate_quiz_question(category, i + 1, difficulty, mode)
                if question:
                    questions.append(question)
                    break
                elif retry < max_retries - 1:
                    logger.info(f"Retrying question generation for question {i + 1}")
                    await asyncio.sleep(0.3)  # Brief pause before retry
            else:
                logger.error(f"Failed to generate safe question {i + 1} after {max_retries} attempts")
            await asyncio.sleep(0.5)  # Rate limiting
        
        # Create quiz set structure with mode information
        quiz_set = {
            "title": title,
            "category": category,
            "difficulty": difficulty,
            "mode": mode,  # Include mode in quiz set
            "maturity_rating": "all_ages",  # Content rating system
            "questions": questions,
            "trivia": f"This {mode} mode quiz explores fun facts about {category}!",
            "economics": self.calculate_economics(category, difficulty, mode),
            "tags": [category, mode, difficulty, "v3.0", "all_ages"]  # Include version and rating tags
        }
        
        return quiz_set
    
    async def generate_mode_variations(self, base_quiz_set: Dict[str, Any]) -> Dict[str, Any]:
        """Generate all mode variations from a base quiz set"""
        variations = {}
        
        # Generate each mode variation
        for mode in ['chaos', 'zen', 'speed', 'poqpoq']:
            if mode == base_quiz_set['mode']:
                # Use the base quiz set for its native mode
                variations[mode] = base_quiz_set
            else:
                # Generate new variation for this mode
                mode_quiz = await self.generate_quiz_set(
                    base_quiz_set['category'], 
                    mode
                )
                variations[mode] = mode_quiz
        
        # Add mode-specific enhancements
        
        # CHAOS MODE - Complete insanity
        if 'chaos' in variations:
            chaos_quiz = variations['chaos']
            # Enhance chaos questions with extra effects
            for i, q in enumerate(chaos_quiz['questions']):
                chaos_level = random.randint(1, 5)
                chaos_emoji = random.choice(self.chaos_reactions)
                q['chaos_level'] = chaos_level
                q['chaos_stars'] = '🌟' * chaos_level
                # Add chaos visual effects
                q['effects'] = random.sample([
                    "screen_shake", "rainbow_text", "upside_down_answers",
                    "random_rotations", "glitch_text", "explosion_transitions",
                    "confetti_burst", "disco_lights", "matrix_rain",
                    "emoji_rain", "color_inversion", "wavy_text"
                ], k=min(chaos_level, 3))
            
            chaos_quiz['chaos_config'] = {
                "timer": 15,
                "bonus_multiplier": 3,
                "chaos_message": "EMBRACE THE CHAOS! 🎢",
                "bonus_per_chaos_star": 10,
                "special_effects": True
            }
        
        # ZEN MODE - Peaceful and meditative
        if 'zen' in variations:
            zen_quiz = variations['zen']
            zen_affirmations = [
                "You're doing great! 🌟",
                "Every answer teaches us something 🌱",
                "Trust yourself, you've got this! 💫",
                "Learning is a beautiful journey 🦋",
                "Mistakes help us grow stronger 🌳",
                "Your mind is amazing! 🧠✨",
                "Take your time, there's no rush 🐢"
            ]
            
            for q in zen_quiz['questions']:
                q['affirmation'] = random.choice(zen_affirmations)
                if 'correct_answer' in q:
                    q['hint'] = await self.generate_zen_hint(
                        q['question'], 
                        q['correct_answer'], 
                        zen_quiz['category']
                    )
            
            zen_quiz['zen_config'] = {
                "no_timer": True,
                "calm_message": "Take your time. Learn and enjoy. 🧘",
                "zen_music": True,
                "zen_effects": [
                    "soft_glow", "floating_elements", "water_ripples",
                    "breathing_animation", "gentle_particles", "aurora_borealis"
                ],
                "incorrect_message": "That's okay! Every mistake is a chance to learn. Try again! 🌸",
                "correct_message": "Wonderful! Your mind is clear and focused! ⭐"
            }
        
        # SPEED MODE - High pressure racing
        if 'speed' in variations:
            speed_quiz = variations['speed']
            speed_quiz['speed_config'] = {
                "time_per_question": 8,
                "bonus_multiplier": 2,
                "speed_effects": [
                    "timer_pulse", "urgency_sounds", "countdown_beeps",
                    "speed_lines", "adrenaline_flash", "turbo_boost",
                    "lightning_strikes", "sonic_boom"
                ],
                "speed_message": "GOTTA GO FAST! ⚡",
                "combo_multiplier": True,
                "perfect_streak_bonus": 500,
                "time_bonus_per_second": 10,
                "speed_achievements": [
                    {"name": "Lightning Reflexes", "condition": "answer_in_3_seconds"},
                    {"name": "Speed Demon", "condition": "perfect_speed_round"},
                    {"name": "Sonic Boom", "condition": "10_streak_in_speed"}
                ]
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
                    "generator_version": "3.0",  # Version 3.0
                    "has_trivia": True,
                    "economics_added": True,
                    "economics_version": "2.0",
                    "mode": quiz_set['mode'],
                    "difficulty_system": "age_based",
                    "target_age_range": "6-13",
                    "maturity_rating": "all_ages",
                    "maturity_system": "v1.0"
                }),
                quiz_set.get('tags', [])
            )
            
            # Insert mode variations
            for mode, variation in variations.items():
                await conn.execute("""
                    INSERT INTO content_variations (content_id, mode, variation_data)
                    VALUES ($1, $2, $3)
                """, quiz_id, mode, json.dumps(variation))
            
            logger.info(f"Saved quiz set: {quiz_id} - {quiz_set['title']} (Mode: {quiz_set['mode']})")
            return quiz_id
    
    async def run_once(self, specific_mode: str = None):
        """Generate one quiz set, optionally for a specific mode"""
        # Pick a random category
        category = random.choice(self.categories)
        
        # Pick mode (random or specific)
        mode = specific_mode or random.choice(['poqpoq', 'chaos', 'zen', 'speed'])
        
        # Generate base quiz set for the chosen mode
        base_quiz_set = await self.generate_quiz_set(category, mode)
        
        if len(base_quiz_set['questions']) < 8:
            logger.error(f"Not enough questions generated: {len(base_quiz_set['questions'])}")
            return
        
        # Generate all mode variations
        variations = await self.generate_mode_variations(base_quiz_set)
        
        # Save to database
        await self.save_quiz_set(base_quiz_set, variations)
    
    async def run_continuous(self, interval_minutes: int = 5):
        """Run continuously, generating quiz sets at intervals"""
        logger.info(f"Starting quiz set generator v3.0 with {interval_minutes} minute interval")
        
        modes = ['poqpoq', 'chaos', 'zen', 'speed']
        mode_index = 0
        
        while True:
            try:
                # Rotate through modes to ensure variety
                await self.run_once(modes[mode_index])
                mode_index = (mode_index + 1) % len(modes)
                await asyncio.sleep(interval_minutes * 60)
            except Exception as e:
                logger.error(f"Error in generation cycle: {e}")
                await asyncio.sleep(60)  # Wait a minute before retrying

async def main():
    """Main entry point"""
    await db.connect()
    
    generator = QuizSetGeneratorV3()
    
    # Run once or continuously based on command line args
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == '--once':
            await generator.run_once()
        elif sys.argv[1] == '--mode' and len(sys.argv) > 2:
            # Generate for specific mode
            await generator.run_once(sys.argv[2])
        else:
            await generator.run_continuous()
    else:
        await generator.run_continuous()

if __name__ == "__main__":
    asyncio.run(main())
"""
Trivia Set Generator for Flashcards
Generates sets of 10 true/false trivia questions
"""
import asyncio
import os
import json
import logging
from datetime import datetime
from uuid import uuid4
from typing import Dict, Any, List
import aiohttp
from database import db
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TriviaSetGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        # All categories available (must match image files exactly)
        self.categories = [
            "science", "history", "geography", "pop_culture", 
            "technology", "nature", "sports", "literature",
            "music", "food_cuisine", "film", "gaming",
            "art", "mythology", "space", "animals",
            "inventions", "internet_culture", "fashion_design", 
            "ancient_architecture", "archaeology", "dinosaurs", 
            "wicca", "famous_lies", "scandal_mischief", "fame_glory",
            "horror_films", "language_evolution", "jokes"
        ]
        
    async def generate_trivia_set(self, theme: str = None) -> Dict[str, Any]:
        """Generate a set of 10 factoids with simple-flip format"""
        
        # Pick a random theme if not specified
        if not theme:
            import random
            theme = random.choice(self.categories)
        
        prompt = f"""Generate 10 fascinating factoids ALL about {theme}.

        REQUIREMENTS:
        1. ALL 10 factoids MUST be about {theme} - do not mix topics
        2. Create a simple, interesting fact as the front (keep under 80 characters)
        3. Add a mind-blowing detail or twist as the back (keep under 200 characters)
        4. Make it surprising and memorable
        5. Focus on "wow factor" - things that make people say "I never knew that!"
        6. Vary difficulty levels (mix of easy, medium, hard)
        7. Each factoid must have accurate, verifiable information
        
        IMPORTANT: Return ONLY valid JSON array with no extra text before or after
        
        Return ONLY a JSON array with exactly 10 factoids in this format (no markdown, no extra text):
        [
            {{
                "id": 1,
                "fact": "The simple, interesting fact (under 80 chars)",
                "detail": "The mind-blowing detail or deeper explanation (under 200 chars)",
                "content": "{{fact}}",
                "answer": "{{detail}}",
                "category": "trivia_mix",
                "difficulty": "easy|medium|hard",
                "challengeType": "simple-flip",
                "theme": "science"
            }},
            ... (9 more factoids)
        ]
        
        Note: Include both 'fact'/'detail' (for clarity) AND 'content'/'answer' (for compatibility)
        
        Example factoids:
        - Space: 
          Front: "You could fit all the planets between Earth and the Moon."
          Back: "The average Earth-Moon distance is 384,400 km. The diameters of all planets combined equal about 380,000 km. They'd fit with about 4,400 km to spare!"
        
        - Animals:
          Front: "Wombat poop is cube-shaped."
          Back: "Wombats produce 80-100 cube-shaped poops per night. Scientists discovered their intestines have varying elasticity that creates the unique shape."
        
        - History:
          Front: "Oxford University is older than the Aztec Empire."
          Back: "Teaching began at Oxford in 1096, while the Aztec Empire was founded in 1428. Oxford was already 332 years old when the Aztecs started building Tenochtitlan."
        
        - Science:
          Front: "Honey never spoils."
          Back: "Archaeologists have found 3000-year-old honey in Egyptian tombs that was still perfectly edible. Its low moisture content and acidic pH create an environment where bacteria can't survive."
        
        Make sure to:
        - Front: Simple, catchy fact that hooks interest
        - Back: Fascinating detail that expands on the fact with specific numbers, dates, or surprising context
        - Mix well-known facts with obscure but fascinating ones
        - Use specific categories from the provided list for the theme field
        - Vary the topics to cover different areas of knowledge
        """
        
        try:
            if self.api_key and self.api_key != 'your_anthropic_api_key_here':
                headers = {
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                
                payload = {
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 3500,  # Enough for 10 trivia with explanations
                    "temperature": 0.8,
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
                            content = data['content'][0]['text']
                            
                            # Parse JSON array from response
                            import re
                            json_match = re.search(r'\[[\s\S]*\]', content)
                            if json_match:
                                trivia_array = json.loads(json_match.group())
                                
                                # Create the trivia set structure
                                return {
                                    "id": str(uuid4()),
                                    "type": "trivia_set",
                                    "data": {
                                        "title": f"Factoids: {theme.replace('_', ' ').title()}",
                                        "trivia": trivia_array[:10],  # Ensure exactly 10
                                        "category": "trivia_mix",
                                        "theme": theme,  # Store the specific theme
                                        "difficulty": "varied",
                                        "total_questions": 10
                                    },
                                    "metadata": {
                                        "generated_at": datetime.utcnow().isoformat(),
                                        "generator_version": "2.0",
                                        "format": "factoid",
                                        "theme": theme
                                    },
                                    "tags": ["trivia_set", "flashcard", "facts", theme, "factoid"]
                                }
                        else:
                            logger.error(f"API error: {response.status}")
        except Exception as e:
            logger.error(f"Failed to generate trivia set: {e}")
        
        return self.get_fallback_trivia_set()
    
    def get_fallback_trivia_set(self) -> Dict[str, Any]:
        """Fallback trivia set if API fails"""
        fallback_trivia = [
            {
                "id": 1,
                "fact": "A shrimp's heart is located in its head.",
                "detail": "It's in the thorax behind the rostrum, pumping hemolymph (their blood) through an open circulatory system.",
                "content": "A shrimp's heart is located in its head.",
                "answer": "It's in the thorax behind the rostrum, pumping hemolymph (their blood) through an open circulatory system.",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "simple-flip",
                "theme": "animals"
            },
            {
                "id": 2,
                "content": "The Great Wall of China is NOT visible from space.",
                "answer": "This is a common myth. The wall is too narrow and follows natural contours, making it indistinguishable from space without aid. Many astronauts have confirmed you cannot see it with the naked eye from orbit.",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "simple-flip",
                "theme": "famous_lies"
            },
            {
                "id": 3,
                "content": "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
                "answer": "Cleopatra lived around 30 BCE, about 2,000 years before the Moon landing in 1969. The Great Pyramid was built around 2,560 BCE, which is 2,500 years before her time. She's 500 years closer to us than to the pyramids!",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "simple-flip",
                "theme": "history"
            },
            {
                "id": 4,
                "content": "Bananas don't grow on trees.",
                "answer": "Bananas grow on large herbaceous plants, not trees. What looks like a tree trunk is actually a 'pseudostem' made of tightly packed leaf bases. The banana plant is the world's largest herb!",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "simple-flip",
                "theme": "nature"
            },
            {
                "id": 5,
                "content": "There are more possible games of chess than atoms in the observable universe.",
                "answer": "The number of possible chess games is estimated at 10^120, while atoms in the observable universe number around 10^80. This mind-boggling fact is known as the Shannon Number.",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "simple-flip",
                "theme": "gaming"
            },
            {
                "id": 6,
                "content": "Goldfish can remember things for months, not seconds.",
                "answer": "Studies show goldfish can remember things for at least 3 months, and some research suggests even longer. They can be trained to recognize shapes, colors, and even specific humans!",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "simple-flip",
                "theme": "animals"
            },
            {
                "id": 7,
                "content": "The first computer programmer was a woman.",
                "answer": "Ada Lovelace, daughter of poet Lord Byron, wrote the first algorithm in 1843 intended for Charles Babbage's Analytical Engine. She envisioned computers could do more than just calculations.",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "simple-flip",
                "theme": "technology"
            },
            {
                "id": 8,
                "content": "Lightning strikes the same place multiple times.",
                "answer": "The Empire State Building is struck by lightning about 25 times per year. Tall structures and high points are particularly prone to repeated strikes, debunking the old myth.",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "simple-flip",
                "theme": "science"
            },
            {
                "id": 9,
                "content": "Oxford University is older than the Aztec Empire.",
                "answer": "Oxford University was teaching students as early as 1096, while the Aztec Empire was founded in 1428. Oxford is over 300 years older than the Aztec Empire!",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "simple-flip",
                "theme": "history"
            },
            {
                "id": 10,
                "content": "Humans share 50% of their DNA with bananas.",
                "answer": "All life on Earth shares a common ancestor, so many basic cellular functions are similar across species. We also share 60% with fruit flies and 96% with chimpanzees!",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "simple-flip",
                "theme": "science"
            }
        ]
        
        return {
            "id": str(uuid4()),
            "type": "trivia_set",
            "data": {
                "title": "Factoids: Mixed Topics",
                "trivia": fallback_trivia,
                "category": "trivia_mix",
                "difficulty": "varied",
                "total_questions": 10
            },
            "metadata": {
                "is_fallback": True,
                "generated_at": datetime.utcnow().isoformat()
            },
            "tags": ["trivia_set", "flashcard", "facts"]
        }
    
    async def store_trivia_set(self, trivia_set: Dict[str, Any]):
        """Store generated trivia set in the database"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO content (id, type, data, metadata, tags, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                ON CONFLICT (id) DO NOTHING
            """, 
            trivia_set["id"], 
            trivia_set["type"],
            json.dumps(trivia_set["data"]),
            json.dumps(trivia_set["metadata"]),
            trivia_set["tags"]
        )
        
        logger.info(f"Stored trivia set {trivia_set['id']} with {len(trivia_set['data']['trivia'])} questions")

# Instance for use in other modules
trivia_set_generator = TriviaSetGenerator()

async def generate_and_store_trivia_set(theme: str = None):
    """Generate a trivia set and store it"""
    trivia_set = await trivia_set_generator.generate_trivia_set(theme)
    await trivia_set_generator.store_trivia_set(trivia_set)
    return trivia_set["id"], trivia_set["data"].get("theme", "mixed")

async def run_trivia_set_generator():
    """Run trivia set generator continuously"""
    logger.info("Starting trivia set generator service")
    
    # Generate trivia sets every 40 minutes (offset from other generators)
    generation_interval = int(os.getenv('TRIVIA_SET_GENERATION_INTERVAL', '2400'))
    
    # Track which themes we've generated to ensure variety
    theme_index = 0
    
    while True:
        try:
            # Cycle through themes to ensure variety
            theme = trivia_set_generator.categories[theme_index % len(trivia_set_generator.categories)]
            
            # Generate and store trivia set
            set_id, set_theme = await generate_and_store_trivia_set(theme)
            logger.info(f"Generated {set_theme} trivia set: {set_id}")
            
            # Move to next theme
            theme_index += 1
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:trivia_mix:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in trivia set generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the trivia set generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_trivia_set_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
"""
Pun Set Generator for Flashcards
Generates sets of 10 puns with setup and punchline
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

class PunSetGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        # Categories that work well for puns (must match image files exactly)
        self.categories = [
            "food_cuisine", "animals", "technology", "music", "sports",
            "nature", "science", "space", "dinosaurs", "internet_culture",
            "gaming", "film", "fashion_design", "jokes", "inventions",
            "geography", "literature", "art"
        ]
        
    async def generate_pun_set(self, mixed_themes: bool = True) -> Dict[str, Any]:
        """Generate a set of 10 puns with various themes"""
        
        themes_list = ", ".join(self.categories) if mixed_themes else "various themes"
        
        prompt = f"""Generate 10 family-friendly puns about {themes_list}.

        REQUIREMENTS FOR EACH PUN:
        1. Create a setup and punchline format
        2. Make it groan-worthy but clever
        3. Keep it appropriate for all ages
        4. Create a fill-in-the-blank challenge from the punchline
        5. Mix themes to create variety
        6. Vary difficulty between easy, medium, and hard
        
        Return a JSON array with exactly 10 puns in this format:
        [
            {{
                "id": 1,
                "content": "The setup question or statement",
                "punchline": "The punny answer",
                "category": "bad_puns",
                "difficulty": "easy|medium|hard",
                "challengeType": "fill-blank",
                "challenge": "The punchline with one word as ____",
                "answer": "The missing word",
                "hint": "A clue about the wordplay",
                "theme": "food_cuisine|animals|technology|music|sports|nature|science|space|dinosaurs|internet_culture|gaming|film|fashion_design|jokes|inventions|geography|literature|art"
            }},
            ... (9 more puns)
        ]
        
        Examples of good puns:
        - "Why don't scientists trust atoms?" / "Because they make up everything!"
        - "What do you call a fake noodle?" / "An impasta!"
        - "Why did the scarecrow win an award?" / "He was outstanding in his field!"
        
        Make sure to:
        - Include wordplay, double meanings, or sound-alike words
        - Mix different types of puns (homophone, compound, recursive)
        - Create engaging setups that make people want to hear the punchline
        - Make the fill-in-the-blank challenge use the key pun word
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
                    "max_tokens": 3000,  # Increased for 10 puns
                    "temperature": 0.9,
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
                                puns_array = json.loads(json_match.group())
                                
                                # Create the pun set structure
                                return {
                                    "id": str(uuid4()),
                                    "type": "pun_set",
                                    "data": {
                                        "title": "The Punderful Collection: Groan-Worthy Wordplay",
                                        "puns": puns_array[:10],  # Ensure exactly 10
                                        "category": "bad_puns",
                                        "difficulty": "varied",
                                        "total_puns": 10
                                    },
                                    "metadata": {
                                        "generated_at": datetime.utcnow().isoformat(),
                                        "generator_version": "2.0",
                                        "has_challenges": True
                                    },
                                    "tags": ["pun_set", "flashcard", "wordplay"]
                                }
                        else:
                            logger.error(f"API error: {response.status}")
        except Exception as e:
            logger.error(f"Failed to generate pun set: {e}")
        
        return self.get_fallback_pun_set()
    
    def get_fallback_pun_set(self) -> Dict[str, Any]:
        """Fallback pun set if API fails"""
        fallback_puns = [
            {
                "id": 1,
                "content": "What do you call a fake noodle?",
                "punchline": "An impasta!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "An ____!",
                "answer": "impasta",
                "hint": "It sounds like 'imposter' but it's about pasta",
                "theme": "food"
            },
            {
                "id": 2,
                "content": "What do you call a bear with no teeth?",
                "punchline": "A gummy bear!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "A ____ bear!",
                "answer": "gummy",
                "hint": "Think of a chewy candy",
                "theme": "animals"
            },
            {
                "id": 3,
                "content": "Why was the computer cold?",
                "punchline": "It left its Windows open!",
                "category": "bad_puns",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "It left its ____ open!",
                "answer": "Windows",
                "hint": "A popular operating system",
                "theme": "technology"
            },
            {
                "id": 4,
                "content": "What's the best thing about Switzerland?",
                "punchline": "I don't know, but the flag is a big plus!",
                "category": "bad_puns",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "I don't know, but the flag is a big ____!",
                "answer": "plus",
                "hint": "Think about the Swiss flag design",
                "theme": "travel"
            },
            {
                "id": 5,
                "content": "Why don't eggs tell jokes?",
                "punchline": "They'd crack each other up!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "They'd ____ each other up!",
                "answer": "crack",
                "hint": "What happens when eggs break?",
                "theme": "food"
            },
            {
                "id": 6,
                "content": "What do you call a dinosaur that crashes his car?",
                "punchline": "Tyrannosaurus Wrecks!",
                "category": "bad_puns",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "Tyrannosaurus ____!",
                "answer": "Wrecks",
                "hint": "Sounds like 'Rex' but means crashes",
                "theme": "animals"
            },
            {
                "id": 7,
                "content": "Why did the scarecrow win an award?",
                "punchline": "He was outstanding in his field!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "He was outstanding in his ____!",
                "answer": "field",
                "hint": "Where do scarecrows stand?",
                "theme": "nature"
            },
            {
                "id": 8,
                "content": "What do you call a belt made of watches?",
                "punchline": "A waist of time!",
                "category": "bad_puns",
                "difficulty": "hard",
                "challengeType": "fill-blank",
                "challenge": "A ____ of time!",
                "answer": "waist",
                "hint": "Sounds like 'waste' but goes around your middle",
                "theme": "fashion"
            },
            {
                "id": 9,
                "content": "Why don't scientists trust atoms?",
                "punchline": "Because they make up everything!",
                "category": "bad_puns",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "Because they make up ____!",
                "answer": "everything",
                "hint": "Think about what atoms do AND what liars do",
                "theme": "science"
            },
            {
                "id": 10,
                "content": "What did the grape say when it got stepped on?",
                "punchline": "Nothing, it just let out a little wine!",
                "category": "bad_puns",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "Nothing, it just let out a little ____!",
                "answer": "wine",
                "hint": "Sounds like 'whine' but made from grapes",
                "theme": "food"
            }
        ]
        
        return {
            "id": str(uuid4()),
            "type": "pun_set",
            "data": {
                "title": "Classic Pun Collection",
                "puns": fallback_puns,
                "category": "bad_puns",
                "difficulty": "varied",
                "total_puns": 10
            },
            "metadata": {
                "is_fallback": True,
                "generated_at": datetime.utcnow().isoformat()
            },
            "tags": ["pun_set", "flashcard", "wordplay"]
        }
    
    async def store_pun_set(self, pun_set: Dict[str, Any]):
        """Store generated pun set in the database"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO content (id, type, data, metadata, tags, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                ON CONFLICT (id) DO NOTHING
            """, 
            pun_set["id"], 
            pun_set["type"],
            json.dumps(pun_set["data"]),
            json.dumps(pun_set["metadata"]),
            pun_set["tags"]
        )
        
        logger.info(f"Stored pun set {pun_set['id']} with {len(pun_set['data']['puns'])} puns")

# Instance for use in other modules
pun_set_generator = PunSetGenerator()

async def generate_and_store_pun_set():
    """Generate a pun set and store it"""
    pun_set = await pun_set_generator.generate_pun_set()
    await pun_set_generator.store_pun_set(pun_set)
    return pun_set["id"]

async def run_pun_set_generator():
    """Run pun set generator continuously"""
    logger.info("Starting pun set generator service")
    
    # Generate pun sets every 30 minutes
    generation_interval = int(os.getenv('PUN_SET_GENERATION_INTERVAL', '1800'))
    
    while True:
        try:
            # Generate and store pun set
            set_id = await generate_and_store_pun_set()
            logger.info(f"Generated pun set: {set_id}")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:bad_puns:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in pun set generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the pun set generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_pun_set_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
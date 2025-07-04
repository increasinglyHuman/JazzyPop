"""
Joke Set Generator for Flashcards
Generates sets of 10 knock-knock jokes
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

class JokeSetGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        # Categories that work well for jokes
        self.categories = [
            "jokes", "animals", "food_cuisine", "music", 
            "nature", "science", "pop_culture", "dinosaurs",
            "internet_culture", "literature", "geography"
        ]
        
    async def generate_joke_set(self) -> Dict[str, Any]:
        """Generate a set of 10 knock-knock jokes"""
        
        prompt = f"""Generate 10 family-friendly knock-knock jokes with various themes.

        REQUIREMENTS FOR EACH JOKE:
        1. Follow the classic knock-knock joke format exactly
        2. Make them silly, punny, and kid-friendly
        3. Include wordplay, puns, or sound-alike words
        4. Create a challenge where users complete the punchline
        5. Mix themes from: {', '.join(self.categories)}
        6. Vary difficulty between easy, medium, and hard
        7. Make them genuinely funny (in a groan-worthy way)
        
        Return a JSON array with exactly 10 knock-knock jokes in this format:
        [
            {{
                "id": 1,
                "content": "Knock knock.",
                "whosThere": "Interrupting cow",
                "whosThereWho": "Interrupting cow who?",
                "punchline": "MOO!",
                "category": "knock_knock",
                "difficulty": "easy|medium|hard",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Interrupting cow ____?",
                "answer": "MOO!",
                "hint": "What sound does a cow make?",
                "theme": "{"|".join(self.categories)}"
            }},
            ... (9 more jokes)
        ]
        
        Classic examples:
        - Interrupting cow / MOO!
        - Lettuce / Lettuce in, it's cold out here!
        - Boo / Don't cry, it's just a joke!
        - Tank / You're welcome!
        
        Make sure to:
        - Include clever wordplay and puns
        - Make the "who's there" part set up the punchline
        - Keep them appropriate for all ages
        - Mix obvious jokes with cleverer ones
        - Use the specific categories from the provided list
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
                    "max_tokens": 3000,
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
                                jokes_array = json.loads(json_match.group())
                                
                                # Create the joke set structure
                                return {
                                    "id": str(uuid4()),
                                    "type": "joke_set",
                                    "data": {
                                        "title": "Knock Knock! Who's Laughing?",
                                        "jokes": jokes_array[:10],  # Ensure exactly 10
                                        "category": "knock_knock",
                                        "difficulty": "varied",
                                        "total_jokes": 10
                                    },
                                    "metadata": {
                                        "generated_at": datetime.utcnow().isoformat(),
                                        "generator_version": "2.0",
                                        "joke_format": "knock_knock"
                                    },
                                    "tags": ["joke_set", "flashcard", "humor"]
                                }
                        else:
                            logger.error(f"API error: {response.status}")
        except Exception as e:
            logger.error(f"Failed to generate joke set: {e}")
        
        return self.get_fallback_joke_set()
    
    def get_fallback_joke_set(self) -> Dict[str, Any]:
        """Fallback joke set if API fails"""
        fallback_jokes = [
            {
                "id": 1,
                "content": "Knock knock.",
                "whosThere": "Lettuce",
                "whosThereWho": "Lettuce who?",
                "punchline": "Lettuce in, it's cold out here!",
                "category": "knock_knock",
                "difficulty": "easy",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Lettuce ____?",
                "answer": "Lettuce in, it's cold out here!",
                "hint": "What do you say when you want to come inside?",
                "theme": "food_cuisine"
            },
            {
                "id": 2,
                "content": "Knock knock.",
                "whosThere": "Interrupting cow",
                "whosThereWho": "Interrupting cow who?",
                "punchline": "MOO!",
                "category": "knock_knock",
                "difficulty": "easy",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Interrupting cow ____?",
                "answer": "MOO!",
                "hint": "What sound does a cow make?",
                "theme": "animals"
            },
            {
                "id": 3,
                "content": "Knock knock.",
                "whosThere": "Boo",
                "whosThereWho": "Boo who?",
                "punchline": "Don't cry, it's just a joke!",
                "category": "knock_knock",
                "difficulty": "medium",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Boo who?",
                "answer": "Don't cry, it's just a joke!",
                "hint": "What does 'boo who' sound like?",
                "theme": "jokes"
            },
            {
                "id": 4,
                "content": "Knock knock.",
                "whosThere": "Tank",
                "whosThereWho": "Tank who?",
                "punchline": "You're welcome!",
                "category": "knock_knock",
                "difficulty": "hard",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Tank who?",
                "answer": "You're welcome!",
                "hint": "Say 'tank you' out loud",
                "theme": "jokes"
            },
            {
                "id": 5,
                "content": "Knock knock.",
                "whosThere": "Hawaii",
                "whosThereWho": "Hawaii who?",
                "punchline": "I'm good, Hawaii you?",
                "category": "knock_knock",
                "difficulty": "medium",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Hawaii who?",
                "answer": "I'm good, Hawaii you?",
                "hint": "It sounds like 'How are ye?'",
                "theme": "geography"
            },
            {
                "id": 6,
                "content": "Knock knock.",
                "whosThere": "Owl",
                "whosThereWho": "Owl who?",
                "punchline": "Owl tell you another joke if you let me in!",
                "category": "knock_knock",
                "difficulty": "medium",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Owl who?",
                "answer": "Owl tell you another joke if you let me in!",
                "hint": "What does 'Owl' sound like at the beginning of a sentence?",
                "theme": "animals"
            },
            {
                "id": 7,
                "content": "Knock knock.",
                "whosThere": "Nobel",
                "whosThereWho": "Nobel who?",
                "punchline": "Nobel, that's why I knocked!",
                "category": "knock_knock",
                "difficulty": "hard",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Nobel who?",
                "answer": "Nobel, that's why I knocked!",
                "hint": "What do you ring when there's no bell?",
                "theme": "science"
            },
            {
                "id": 8,
                "content": "Knock knock.",
                "whosThere": "Doughnut",
                "whosThereWho": "Doughnut who?",
                "punchline": "Doughnut forget to let me in!",
                "category": "knock_knock",
                "difficulty": "easy",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Doughnut who?",
                "answer": "Doughnut forget to let me in!",
                "hint": "Doughnut sounds like 'do not'",
                "theme": "food_cuisine"
            },
            {
                "id": 9,
                "content": "Knock knock.",
                "whosThere": "Spell",
                "whosThereWho": "Spell who?",
                "punchline": "W-H-O!",
                "category": "knock_knock",
                "difficulty": "medium",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Spell who?",
                "answer": "W-H-O!",
                "hint": "They asked you to spell it!",
                "theme": "literature"
            },
            {
                "id": 10,
                "content": "Knock knock.",
                "whosThere": "Cargo",
                "whosThereWho": "Cargo who?",
                "punchline": "No, car go beep beep!",
                "category": "knock_knock",
                "difficulty": "easy",
                "challengeType": "complete-joke",
                "challenge": "Complete the joke: Cargo who?",
                "answer": "No, car go beep beep!",
                "hint": "What sound does a car make?",
                "theme": "jokes"
            }
        ]
        
        return {
            "id": str(uuid4()),
            "type": "joke_set",
            "data": {
                "title": "Classic Knock-Knock Collection",
                "jokes": fallback_jokes,
                "category": "knock_knock",
                "difficulty": "varied",
                "total_jokes": 10
            },
            "metadata": {
                "is_fallback": True,
                "generated_at": datetime.utcnow().isoformat()
            },
            "tags": ["joke_set", "flashcard", "humor"]
        }
    
    async def store_joke_set(self, joke_set: Dict[str, Any]):
        """Store generated joke set in the database"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO content (id, type, data, metadata, tags, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                ON CONFLICT (id) DO NOTHING
            """, 
            joke_set["id"], 
            joke_set["type"],
            json.dumps(joke_set["data"]),
            json.dumps(joke_set["metadata"]),
            joke_set["tags"]
        )
        
        logger.info(f"Stored joke set {joke_set['id']} with {len(joke_set['data']['jokes'])} jokes")

# Instance for use in other modules
joke_set_generator = JokeSetGenerator()

async def generate_and_store_joke_set():
    """Generate a joke set and store it"""
    joke_set = await joke_set_generator.generate_joke_set()
    await joke_set_generator.store_joke_set(joke_set)
    return joke_set["id"]

async def run_joke_set_generator():
    """Run joke set generator continuously"""
    logger.info("Starting joke set generator service")
    
    # Generate joke sets every 45 minutes (offset from other generators)
    generation_interval = int(os.getenv('JOKE_SET_GENERATION_INTERVAL', '2700'))
    
    while True:
        try:
            # Generate and store joke set
            set_id = await generate_and_store_joke_set()
            logger.info(f"Generated joke set: {set_id}")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:knock_knock:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in joke set generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the joke set generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_joke_set_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
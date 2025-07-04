"""
Knock-Knock Joke Generator for Flashcards
Generates family-friendly knock-knock jokes
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

class JokeGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.themes = [
            "animals", "food", "names", "places", "objects",
            "seasons", "holidays", "school", "music", "nature"
        ]
        
    async def generate_single_joke(self, theme: str) -> Dict[str, Any]:
        """Generate a single knock-knock joke"""
        
        prompt = f"""Generate a family-friendly knock-knock joke about {theme}.

        REQUIREMENTS:
        1. Follow classic knock-knock format
        2. Make it clever and punny
        3. Keep it appropriate for all ages
        4. Create a multiple choice challenge
        
        Return JSON with this exact format:
        {{
            "content": "The complete knock-knock joke",
            "setup": "Knock knock. Who's there? [Name]. [Name] who?",
            "punchline": "The funny punchline",
            "category": "jokes",
            "difficulty": "easy",
            "challengeType": "multiple-choice", 
            "challenge": "What makes this joke funny?",
            "options": ["The pun", "The rhyme", "The surprise", "The wordplay"],
            "answer": "The correct answer"
        }}
        
        Example:
        {{
            "content": "Knock knock.\\nWho's there?\\nLettuce.\\nLettuce who?\\nLettuce in, it's cold out here!",
            "setup": "Knock knock. Who's there? Lettuce. Lettuce who?",
            "punchline": "Lettuce in, it's cold out here!",
            "category": "jokes", 
            "difficulty": "easy",
            "challengeType": "multiple-choice",
            "challenge": "What word sounds like 'Let us'?",
            "options": ["Lettuce", "Cabbage", "Spinach", "Kale"],
            "answer": "Lettuce"
        }}
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
                    "max_tokens": 500,
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
                            
                            # Parse JSON from response
                            import re
                            json_match = re.search(r'\{.*\}', content, re.DOTALL)
                            if json_match:
                                joke_data = json.loads(json_match.group())
                                
                                return {
                                    "id": str(uuid4()),
                                    "type": "joke",
                                    "data": joke_data,
                                    "metadata": {
                                        "theme": theme,
                                        "generated_at": datetime.utcnow().isoformat()
                                    },
                                    "tags": ["joke", "knock-knock", theme, "flashcard"]
                                }
        except Exception as e:
            logger.error(f"Error generating joke: {e}")
        
        # Return fallback joke
        return self.get_fallback_joke(theme)
    
    def get_fallback_joke(self, theme: str) -> Dict[str, Any]:
        """Return a fallback joke if API fails"""
        fallbacks = {
            "animals": {
                "content": "Knock knock.\nWho's there?\nInterrupting cow.\nInterrupting cow w-\nMOO!",
                "setup": "Knock knock. Who's there? Interrupting cow. Interrupting cow who?",
                "punchline": "MOO! (interrupting)",
                "category": "jokes",
                "difficulty": "easy",
                "challengeType": "true-false",
                "challenge": "The cow interrupts before you finish asking 'who?'",
                "answer": "True"
            },
            "food": {
                "content": "Knock knock.\nWho's there?\nOlive.\nOlive who?\nOlive you and I miss you!",
                "setup": "Knock knock. Who's there? Olive. Olive who?",
                "punchline": "Olive you and I miss you!",
                "category": "jokes",
                "difficulty": "easy", 
                "challengeType": "fill-blank",
                "challenge": "Olive sounds like 'I ____' you",
                "answer": "love"
            }
        }
        
        joke_data = fallbacks.get(theme, fallbacks["animals"])
        
        return {
            "id": str(uuid4()),
            "type": "joke",
            "data": joke_data,
            "metadata": {
                "theme": theme,
                "is_fallback": True
            },
            "tags": ["joke", "knock-knock", theme, "flashcard"]
        }
    
    async def generate_jokes_batch(self, count: int = 10) -> List[Dict[str, Any]]:
        """Generate a batch of jokes"""
        jokes = []
        
        for i in range(count):
            theme = self.themes[i % len(self.themes)]
            joke = await self.generate_single_joke(theme)
            jokes.append(joke)
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        
        return jokes
    
    async def store_jokes(self, jokes: List[Dict[str, Any]]):
        """Store generated jokes in the database"""
        async with db.pool.acquire() as conn:
            for joke in jokes:
                await conn.execute("""
                    INSERT INTO content (id, type, data, metadata, tags, is_active)
                    VALUES ($1::uuid, $2, $3, $4, $5, true)
                    ON CONFLICT (id) DO NOTHING
                """, 
                joke["id"], 
                joke["type"],
                joke["data"],
                joke["metadata"],
                joke["tags"]
            )
        
        logger.info(f"Stored {len(jokes)} jokes in database")

# Instance for use in other modules
joke_generator = JokeGenerator()

async def generate_and_store_jokes():
    """Generate a batch of jokes and store them"""
    jokes = await joke_generator.generate_jokes_batch(15)
    await joke_generator.store_jokes(jokes)
    return len(jokes)

async def run_joke_generator():
    """Run joke generator continuously"""
    logger.info("Starting knock-knock joke generator service")
    
    # Generate jokes every 25 minutes (offset from other generators)
    generation_interval = int(os.getenv('JOKE_GENERATION_INTERVAL', '1500'))
    
    while True:
        try:
            # Generate and store jokes
            count = await generate_and_store_jokes()
            logger.info(f"Generated {count} new knock-knock jokes")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:knock_knock:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in joke generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the joke generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_joke_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
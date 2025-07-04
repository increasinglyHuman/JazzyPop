"""
Pun Generator for Flashcards
Generates terrible puns with setup and punchline
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

class PunGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.categories = [
            "food", "animals", "technology", "music", "sports",
            "nature", "school", "work", "travel", "weather"
        ]
        
    async def generate_single_pun(self, theme: str) -> Dict[str, Any]:
        """Generate a single pun with setup/punchline"""
        
        prompt = f"""Generate a family-friendly pun about {theme}.

        REQUIREMENTS:
        1. Create a setup and punchline format
        2. Make it groan-worthy but clever
        3. Keep it appropriate for all ages
        4. Create a fill-in-the-blank challenge from the punchline
        
        Return JSON with this exact format:
        {{
            "content": "The setup question or statement",
            "punchline": "The punny answer",
            "category": "bad_puns",
            "difficulty": "easy",
            "challengeType": "fill-blank",
            "challenge": "The punchline with one word as ____",
            "answer": "The missing word",
            "hint": "A clue about the wordplay"
        }}
        
        Example:
        {{
            "content": "Why don't scientists trust atoms?",
            "punchline": "Because they make up everything!",
            "category": "bad_puns",
            "difficulty": "easy",
            "challengeType": "fill-blank",
            "challenge": "Because they make up ____!",
            "answer": "everything",
            "hint": "Think about what atoms do AND what liars do"
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
                    "max_tokens": 400,
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
                            # Claude might wrap it in markdown, so extract JSON
                            import re
                            json_match = re.search(r'\{[\s\S]*\}', content)
                            if json_match:
                                pun_data = json.loads(json_match.group())
                                
                                return {
                                    "id": str(uuid4()),
                                    "type": "pun",
                                    "data": pun_data,
                                    "metadata": {
                                        "theme": theme,
                                        "generated_at": datetime.utcnow().isoformat()
                                    },
                                    "tags": ["pun", theme, "flashcard"]
                                }
        except Exception as e:
            logger.error(f"Failed to generate pun: {e}")
        
        return self.get_fallback_pun(theme)
    
    def get_fallback_pun(self, theme: str) -> Dict[str, Any]:
        """Fallback puns"""
        fallbacks = {
            "food": {
                "content": "What do you call a fake noodle?",
                "punchline": "An impasta!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "An ____!",
                "answer": "impasta",
                "hint": "It sounds like 'imposter' but it's about pasta"
            },
            "animals": {
                "content": "What do you call a bear with no teeth?",
                "punchline": "A gummy bear!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "A ____ bear!",
                "answer": "gummy",
                "hint": "Think of a chewy candy"
            },
            "technology": {
                "content": "Why was the computer cold?",
                "punchline": "It left its Windows open!",
                "category": "bad_puns",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "It left its ____ open!",
                "answer": "Windows",
                "hint": "A popular operating system"
            }
        }
        
        pun_data = fallbacks.get(theme, fallbacks["food"])
        
        return {
            "id": str(uuid4()),
            "type": "pun", 
            "data": pun_data,
            "metadata": {
                "theme": theme,
                "is_fallback": True
            },
            "tags": ["pun", theme, "flashcard"]
        }
    
    async def generate_puns_batch(self, count: int = 20) -> List[Dict[str, Any]]:
        """Generate a batch of puns"""
        puns = []
        
        for i in range(count):
            category = self.categories[i % len(self.categories)]
            pun = await self.generate_single_pun(category)
            if pun:
                puns.append(pun)
        
        return puns
    
    async def store_puns(self, puns: List[Dict[str, Any]]):
        """Store generated puns in the database"""
        async with db.pool.acquire() as conn:
            for pun in puns:
                await conn.execute("""
                    INSERT INTO content (id, type, data, metadata, tags, is_active)
                    VALUES ($1::uuid, $2, $3, $4, $5, true)
                    ON CONFLICT (id) DO NOTHING
                """, 
                pun["id"], 
                pun["type"],
                json.dumps(pun["data"]),
                json.dumps(pun["metadata"]),
                pun["tags"]
            )
        
        logger.info(f"Stored {len(puns)} puns in database")

# Instance for use in other modules
pun_generator = PunGenerator()

async def generate_and_store_puns():
    """Generate a batch of puns and store them"""
    puns = await pun_generator.generate_puns_batch(20)
    await pun_generator.store_puns(puns)
    return len(puns)

async def run_pun_generator():
    """Run pun generator continuously"""
    logger.info("Starting pun generator service")
    
    # Generate puns every 20 minutes (offset from quiz generator)
    generation_interval = int(os.getenv('PUN_GENERATION_INTERVAL', '1200'))
    
    while True:
        try:
            # Generate and store puns
            count = await generate_and_store_puns()
            logger.info(f"Generated {count} new puns")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:bad_puns:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in pun generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the pun generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_pun_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
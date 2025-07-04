"""
Trivia Generator for Flashcards
Generates true/false trivia questions
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

class TriviaGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.categories = [
            "history", "science", "geography", "animals", "space",
            "technology", "sports", "music", "movies", "food",
            "mythology", "literature", "art", "nature", "culture"
        ]
        
    async def generate_single_trivia(self, theme: str) -> Dict[str, Any]:
        """Generate a single true/false trivia question"""
        
        prompt = f"""Generate an interesting true/false trivia question about {theme}.

        REQUIREMENTS:
        1. Make it surprising or counterintuitive
        2. Include a fascinating explanation
        3. Mix difficulties - some obvious, some tricky
        4. The statement should be definitively true or false
        5. Avoid ambiguous or opinion-based statements
        
        Return JSON with this exact format:
        {{
            "content": "A statement that is either true or false",
            "answer": "True" or "False",
            "category": "trivia_mix",
            "difficulty": "easy|medium|hard",
            "challengeType": "true-false",
            "challenge": "Is this statement true or false?",
            "explanation": "Detailed explanation of why it's true/false with interesting context"
        }}
        
        Example:
        {{
            "content": "A shrimp's heart is located in its head.",
            "answer": "True",
            "category": "trivia_mix",
            "difficulty": "medium",
            "challengeType": "true-false",
            "challenge": "Is this statement true or false?",
            "explanation": "True! A shrimp's heart is indeed located in its head, specifically in the thorax region behind the rostrum. This is because shrimp have an open circulatory system where the heart pumps hemolymph (their version of blood) throughout their body."
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
                            
                            # Parse JSON from response
                            # Claude might wrap it in markdown, so extract JSON
                            import re
                            json_match = re.search(r'\{[\s\S]*\}', content)
                            if json_match:
                                trivia_data = json.loads(json_match.group())
                                
                                return {
                                    "id": str(uuid4()),
                                    "type": "trivia",
                                    "data": trivia_data,
                                    "metadata": {
                                        "theme": theme,
                                        "generated_at": datetime.utcnow().isoformat()
                                    },
                                    "tags": ["trivia", theme, "flashcard", trivia_data.get("difficulty", "medium")]
                                }
        except Exception as e:
            logger.error(f"Failed to generate trivia: {e}")
        
        return self.get_fallback_trivia(theme)
    
    def get_fallback_trivia(self, theme: str) -> Dict[str, Any]:
        """Fallback trivia questions"""
        fallbacks = {
            "history": {
                "content": "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Cleopatra lived around 30 BCE, about 2,000 years before the Moon landing in 1969. The Great Pyramid was built around 2,560 BCE, which is about 2,500 years before Cleopatra's time."
            },
            "science": {
                "content": "Bananas are berries, but strawberries are not.",
                "answer": "True",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Botanically, bananas meet all the criteria for berries: they develop from a single flower with one ovary and have seeds embedded in the flesh. Strawberries are actually 'aggregate accessory fruits' because their seeds are on the outside.",
                "difficulty": "medium"
            },
            "animals": {
                "content": "Octopuses have three hearts and blue blood.",
                "answer": "True",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Octopuses have three hearts: two pump blood to the gills, and one pumps blood to the rest of the body. Their blood is blue because it contains copper-based hemocyanin instead of iron-based hemoglobin.",
                "difficulty": "medium"
            },
            "space": {
                "content": "There are more trees on Earth than stars in the Milky Way galaxy.",
                "answer": "True",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Scientists estimate there are about 3 trillion trees on Earth, while the Milky Way contains an estimated 100-400 billion stars. That's roughly 10 times more trees than stars in our galaxy!",
                "difficulty": "hard"
            },
            "technology": {
                "content": "The first computer bug was an actual insect.",
                "answer": "True",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! In 1947, Grace Hopper found a moth trapped in a relay of Harvard's Mark II computer, causing it to malfunction. She taped the moth in her logbook and labeled it 'first actual case of bug being found.'",
                "difficulty": "easy"
            }
        }
        
        trivia_data = fallbacks.get(theme, fallbacks["science"])
        
        return {
            "id": str(uuid4()),
            "type": "trivia", 
            "data": trivia_data,
            "metadata": {
                "theme": theme,
                "is_fallback": True
            },
            "tags": ["trivia", theme, "flashcard", trivia_data.get("difficulty", "medium")]
        }
    
    async def generate_trivia_batch(self, count: int = 30) -> List[Dict[str, Any]]:
        """Generate a batch of trivia questions"""
        trivia_questions = []
        
        for i in range(count):
            category = self.categories[i % len(self.categories)]
            trivia = await self.generate_single_trivia(category)
            if trivia:
                trivia_questions.append(trivia)
        
        return trivia_questions
    
    async def store_trivia(self, trivia_questions: List[Dict[str, Any]]):
        """Store generated trivia in the database"""
        async with db.pool.acquire() as conn:
            for trivia in trivia_questions:
                await conn.execute("""
                    INSERT INTO content (id, type, data, metadata, tags, is_active)
                    VALUES ($1::uuid, $2, $3, $4, $5, true)
                    ON CONFLICT (id) DO NOTHING
                """, 
                trivia["id"], 
                trivia["type"],
                json.dumps(trivia["data"]),
                json.dumps(trivia["metadata"]),
                trivia["tags"]
            )
        
        logger.info(f"Stored {len(trivia_questions)} trivia questions in database")

# Instance for use in other modules
trivia_generator = TriviaGenerator()

async def generate_and_store_trivia():
    """Generate a batch of trivia and store them"""
    trivia = await trivia_generator.generate_trivia_batch(30)
    await trivia_generator.store_trivia(trivia)
    return len(trivia)

async def run_trivia_generator():
    """Run trivia generator continuously"""
    logger.info("Starting trivia generator service")
    
    # Generate trivia every 22 minutes (offset from other generators)
    generation_interval = int(os.getenv('TRIVIA_GENERATION_INTERVAL', '1320'))
    
    while True:
        try:
            # Generate and store trivia
            count = await generate_and_store_trivia()
            logger.info(f"Generated {count} new trivia questions")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:trivia_mix:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in trivia generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the trivia generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_trivia_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
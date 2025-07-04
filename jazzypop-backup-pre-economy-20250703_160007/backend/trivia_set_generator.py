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
        
    async def generate_trivia_set(self) -> Dict[str, Any]:
        """Generate a set of 10 true/false trivia questions"""
        
        prompt = f"""Generate 10 interesting true/false trivia questions about various topics.

        REQUIREMENTS FOR EACH TRIVIA QUESTION:
        1. Make it surprising or counterintuitive
        2. Include a fascinating explanation
        3. Mix difficulties - some obvious, some tricky
        4. The statement should be definitively true or false
        5. Avoid ambiguous or opinion-based statements
        6. Cover diverse themes from: {', '.join(self.categories)}
        7. Balance between True and False answers (aim for 5-5 or 6-4 split)
        
        Return a JSON array with exactly 10 trivia questions in this format:
        [
            {{
                "id": 1,
                "content": "A statement that is either true or false",
                "answer": "True" or "False",
                "category": "trivia_mix",
                "difficulty": "easy|medium|hard",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "Detailed explanation of why it's true/false with interesting context",
                "theme": "{"|".join(self.categories)}"
            }},
            ... (9 more questions)
        ]
        
        Example themes and questions:
        - Space: "A day on Venus is longer than a year on Venus." (True)
        - Animals: "Octopuses have three hearts and blue blood." (True)
        - History: "Oxford University is older than the Aztec Empire." (True)
        - Science: "Bananas are berries, but strawberries are not." (True)
        - Technology: "The first computer bug was an actual insect." (True)
        - Geography: "Russia has a larger surface area than Pluto." (True)
        - Food: "Honey never spoils." (True)
        - Pop Culture: "The name 'Jessica' was invented by Shakespeare." (True)
        
        Make sure to:
        - Include surprising facts that make people go "Really?!"
        - Mix well-known facts with obscure but fascinating ones
        - Create explanations that teach something interesting
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
                                        "title": "Mind-Blowing Facts: True or False Challenge",
                                        "trivia": trivia_array[:10],  # Ensure exactly 10
                                        "category": "trivia_mix",
                                        "difficulty": "varied",
                                        "total_questions": 10
                                    },
                                    "metadata": {
                                        "generated_at": datetime.utcnow().isoformat(),
                                        "generator_version": "2.0",
                                        "question_type": "true_false"
                                    },
                                    "tags": ["trivia_set", "flashcard", "facts"]
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
                "content": "A shrimp's heart is located in its head.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! A shrimp's heart is indeed located in its head, specifically in the thorax region behind the rostrum. This is because shrimp have an open circulatory system where the heart pumps hemolymph (their version of blood) throughout their body.",
                "theme": "animals"
            },
            {
                "id": 2,
                "content": "The Great Wall of China is visible from space with the naked eye.",
                "answer": "False",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "False! This is a common myth. The Great Wall is not visible from space without aid. Many astronauts have confirmed this. The wall is too narrow and follows the natural contours of the landscape, making it indistinguishable from space.",
                "theme": "famous_lies"
            },
            {
                "id": 3,
                "content": "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Cleopatra lived around 30 BCE, about 2,000 years before the Moon landing in 1969. The Great Pyramid was built around 2,560 BCE, which is about 2,500 years before Cleopatra's time. She's 500 years closer to us than to the pyramids!",
                "theme": "history"
            },
            {
                "id": 4,
                "content": "Bananas grow on trees.",
                "answer": "False",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "False! Bananas actually grow on large herbaceous plants, not trees. What looks like a tree trunk is actually a 'pseudostem' made of tightly packed leaf bases. The banana plant is the world's largest herb!",
                "theme": "nature"
            },
            {
                "id": 5,
                "content": "There are more possible games of chess than atoms in the observable universe.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! The number of possible chess games is estimated at 10^120, while the number of atoms in the observable universe is estimated at 10^80. This mind-boggling fact is known as the Shannon Number.",
                "theme": "gaming"
            },
            {
                "id": 6,
                "content": "Goldfish have a memory span of only 3 seconds.",
                "answer": "False",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "False! Studies have shown that goldfish can remember things for at least 3 months, and some research suggests even longer. They can be trained to recognize shapes, colors, and even specific humans!",
                "theme": "animals"
            },
            {
                "id": 7,
                "content": "The first computer programmer was a woman.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Ada Lovelace, daughter of the poet Lord Byron, is considered the first computer programmer. In 1843, she wrote the first algorithm intended to be processed by Charles Babbage's Analytical Engine.",
                "theme": "technology"
            },
            {
                "id": 8,
                "content": "Lightning never strikes the same place twice.",
                "answer": "False",
                "category": "trivia_mix",
                "difficulty": "easy",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "False! Lightning can and often does strike the same place multiple times. The Empire State Building, for example, is struck by lightning about 25 times per year. Tall structures and high points are particularly prone to repeated strikes.",
                "theme": "science"
            },
            {
                "id": 9,
                "content": "Oxford University is older than the Aztec Empire.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "hard",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Oxford University was teaching students as early as 1096, while the Aztec Empire was founded in 1428. Oxford is over 300 years older than the Aztec Empire!",
                "theme": "history"
            },
            {
                "id": 10,
                "content": "Humans share 50% of their DNA with bananas.",
                "answer": "True",
                "category": "trivia_mix",
                "difficulty": "medium",
                "challengeType": "true-false",
                "challenge": "Is this statement true or false?",
                "explanation": "True! Humans share about 50% of their DNA with bananas. This is because all life on Earth shares a common ancestor, and many basic cellular functions are similar across species. We also share 60% with fruit flies and 96% with chimpanzees!",
                "theme": "science"
            }
        ]
        
        return {
            "id": str(uuid4()),
            "type": "trivia_set",
            "data": {
                "title": "Classic Trivia Collection",
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

async def generate_and_store_trivia_set():
    """Generate a trivia set and store it"""
    trivia_set = await trivia_set_generator.generate_trivia_set()
    await trivia_set_generator.store_trivia_set(trivia_set)
    return trivia_set["id"]

async def run_trivia_set_generator():
    """Run trivia set generator continuously"""
    logger.info("Starting trivia set generator service")
    
    # Generate trivia sets every 40 minutes (offset from other generators)
    generation_interval = int(os.getenv('TRIVIA_SET_GENERATION_INTERVAL', '2400'))
    
    while True:
        try:
            # Generate and store trivia set
            set_id = await generate_and_store_trivia_set()
            logger.info(f"Generated trivia set: {set_id}")
            
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
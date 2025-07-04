"""
Quote Set Generator for Flashcards
Generates sets of 10 quotes with proper attribution
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

class QuoteSetGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        # Categories that work well for quotes (must match image files exactly)
        self.categories = [
            "science", "history", "literature", "art", "philosophy",
            "technology", "nature", "space", "music", "film",
            "sports", "geography", "mythology", "inventions", "language_evolution",
            "fame_glory", "pop_culture", "ancient_architecture"
        ]
        
    async def generate_quote_set(self) -> Dict[str, Any]:
        """Generate a set of 10 quotes with attribution"""
        
        prompt = f"""Generate 10 meaningful, inspirational quotes about various themes.

        REQUIREMENTS FOR EACH QUOTE:
        1. The quote must have proper attribution (author, source, or tradition)
        2. Mix between:
           - Historical figures (with accurate attribution)
           - Literary sources (book title + author)
           - Cultural traditions (e.g., "African Proverb", "Zen Teaching")
           - Modern thinkers (with full name)
           - Scientists and inventors
           - Artists and musicians
        3. Create an appropriate challenge question for each quote
        4. Ensure the quote is authentic-sounding and meaningful
        5. Vary the themes across: {', '.join(self.categories)}
        6. Include a mix of famous and lesser-known but impactful quotes
        
        Return a JSON array with exactly 10 quotes in this format:
        [
            {{
                "id": 1,
                "content": "The quote text here",
                "author": "Author Name or Source", 
                "source": "Optional: Book/Speech/Context",
                "year": "Optional: Year if known",
                "category": "famous_quotes",
                "difficulty": "easy|medium|hard",
                "challengeType": "who-said-it|fill-blank|multiple-choice|word-order",
                "challenge": "The challenge question",
                "answer": "The correct answer",
                "options": ["option1", "option2", "option3", "option4"], // for multiple choice
                "scrambled": ["word1", "word2", ...], // for word-order
                "explanation": "Brief context about the quote or author",
                "theme": "{"|".join(self.categories)}"
            }},
            ... (9 more quotes)
        ]
        
        Challenge types:
        - who-said-it: Ask who said the quote
        - fill-blank: Remove a key word from the quote
        - multiple-choice: Ask about author, source, or meaning
        - word-order: Scramble the words to reorder
        
        Examples of good attribution:
        - "Maya Angelou"
        - "Albert Einstein" 
        - "Rumi, 13th Century"
        - "The Bhagavad Gita"
        - "Japanese Proverb"
        - "Martin Luther King Jr., I Have a Dream Speech, 1963"
        - "Marie Curie"
        - "African Proverb"
        - "Oscar Wilde, The Picture of Dorian Gray"
        
        Make sure to:
        - Include quotes from diverse sources and time periods
        - Balance well-known quotes with hidden gems
        - Ensure quotes are thought-provoking and educational
        - Create engaging challenges that test understanding
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
                    "max_tokens": 4000,  # Increased for 10 quotes with metadata
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
                                quotes_array = json.loads(json_match.group())
                                
                                # Ensure all quotes have authors
                                for quote in quotes_array:
                                    if not quote.get('author'):
                                        quote['author'] = 'Unknown'
                                
                                # Create the quote set structure
                                return {
                                    "id": str(uuid4()),
                                    "type": "quote_set",
                                    "data": {
                                        "title": "Wisdom Through the Ages: Inspiring Quotes Collection",
                                        "quotes": quotes_array[:10],  # Ensure exactly 10
                                        "category": "famous_quotes",
                                        "difficulty": "varied",
                                        "total_quotes": 10
                                    },
                                    "metadata": {
                                        "generated_at": datetime.utcnow().isoformat(),
                                        "generator_version": "2.0",
                                        "has_attribution": True
                                    },
                                    "tags": ["quote_set", "flashcard", "wisdom"]
                                }
                        else:
                            logger.error(f"API error: {response.status}")
        except Exception as e:
            logger.error(f"Failed to generate quote set: {e}")
        
        return self.get_fallback_quote_set()
    
    def get_fallback_quote_set(self) -> Dict[str, Any]:
        """Fallback quote set if API fails"""
        fallback_quotes = [
            {
                "id": 1,
                "content": "The only true wisdom is in knowing you know nothing.",
                "author": "Socrates",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "who-said-it",
                "challenge": "Which ancient philosopher said this?",
                "answer": "Socrates",
                "explanation": "Socrates emphasized intellectual humility as the foundation of wisdom.",
                "theme": "philosophy"
            },
            {
                "id": 2,
                "content": "In the middle of difficulty lies opportunity.",
                "author": "Albert Einstein",
                "category": "famous_quotes",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "In the middle of difficulty lies ____.",
                "answer": "opportunity",
                "explanation": "Einstein believed that challenges often present hidden possibilities.",
                "theme": "science"
            },
            {
                "id": 3,
                "content": "The future belongs to those who believe in the beauty of their dreams.",
                "author": "Eleanor Roosevelt",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "multiple-choice",
                "challenge": "Who said this about dreams and the future?",
                "options": ["Eleanor Roosevelt", "Martin Luther King Jr.", "Maya Angelou", "Winston Churchill"],
                "answer": "Eleanor Roosevelt",
                "explanation": "Eleanor Roosevelt was a champion of human rights and believed in the power of aspirations.",
                "theme": "history"
            },
            {
                "id": 4,
                "content": "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
                "author": "Albert Einstein",
                "category": "famous_quotes",
                "difficulty": "easy",
                "challengeType": "who-said-it",
                "challenge": "Which famous physicist made this humorous observation?",
                "answer": "Albert Einstein",
                "explanation": "Einstein was known for his wit as well as his scientific genius.",
                "theme": "science"
            },
            {
                "id": 5,
                "content": "Be yourself; everyone else is already taken.",
                "author": "Oscar Wilde",
                "category": "famous_quotes",
                "difficulty": "easy",
                "challengeType": "fill-blank",
                "challenge": "Be yourself; everyone else is already ____.",
                "answer": "taken",
                "explanation": "Wilde's wit often contained profound truths about individuality.",
                "theme": "literature"
            },
            {
                "id": 6,
                "content": "The journey of a thousand miles begins with a single step.",
                "author": "Lao Tzu",
                "source": "Tao Te Ching",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "word-order",
                "challenge": "Arrange these words in the correct order:",
                "scrambled": ["journey", "The", "thousand", "begins", "miles", "single", "with", "a", "step", "of"],
                "answer": "The journey of a thousand miles begins with a single step",
                "explanation": "This ancient Chinese wisdom emphasizes the importance of taking action.",
                "theme": "philosophy"
            },
            {
                "id": 7,
                "content": "Life is 10% what happens to you and 90% how you react to it.",
                "author": "Charles R. Swindoll",
                "category": "famous_quotes",
                "difficulty": "hard",
                "challengeType": "fill-blank",
                "challenge": "Life is 10% what happens to you and ____ how you react to it.",
                "answer": "90%",
                "explanation": "Swindoll emphasizes the power of attitude in shaping our experiences.",
                "theme": "philosophy"
            },
            {
                "id": 8,
                "content": "Innovation distinguishes between a leader and a follower.",
                "author": "Steve Jobs",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "who-said-it",
                "challenge": "Which tech visionary said this about innovation?",
                "answer": "Steve Jobs",
                "explanation": "Jobs revolutionized multiple industries through innovative thinking.",
                "theme": "technology"
            },
            {
                "id": 9,
                "content": "The best time to plant a tree was 20 years ago. The second best time is now.",
                "author": "Chinese Proverb",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "The best time to plant a tree was 20 years ago. The second best time is ____.",
                "answer": "now",
                "explanation": "This proverb teaches us it's never too late to start something worthwhile.",
                "theme": "nature"
            },
            {
                "id": 10,
                "content": "We are all in the gutter, but some of us are looking at the stars.",
                "author": "Oscar Wilde",
                "source": "Lady Windermere's Fan",
                "category": "famous_quotes",
                "difficulty": "hard",
                "challengeType": "multiple-choice",
                "challenge": "In which play did Oscar Wilde write this?",
                "options": ["The Importance of Being Earnest", "Lady Windermere's Fan", "The Picture of Dorian Gray", "An Ideal Husband"],
                "answer": "Lady Windermere's Fan",
                "explanation": "Wilde's plays often contained philosophical gems wrapped in wit.",
                "theme": "literature"
            }
        ]
        
        return {
            "id": str(uuid4()),
            "type": "quote_set",
            "data": {
                "title": "Classic Quotes Collection",
                "quotes": fallback_quotes,
                "category": "famous_quotes",
                "difficulty": "varied",
                "total_quotes": 10
            },
            "metadata": {
                "is_fallback": True,
                "generated_at": datetime.utcnow().isoformat()
            },
            "tags": ["quote_set", "flashcard", "wisdom"]
        }
    
    async def store_quote_set(self, quote_set: Dict[str, Any]):
        """Store generated quote set in the database"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO content (id, type, data, metadata, tags, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                ON CONFLICT (id) DO NOTHING
            """, 
            quote_set["id"], 
            quote_set["type"],
            json.dumps(quote_set["data"]),
            json.dumps(quote_set["metadata"]),
            quote_set["tags"]
        )
        
        logger.info(f"Stored quote set {quote_set['id']} with {len(quote_set['data']['quotes'])} quotes")

# Instance for use in other modules
quote_set_generator = QuoteSetGenerator()

async def generate_and_store_quote_set():
    """Generate a quote set and store it"""
    quote_set = await quote_set_generator.generate_quote_set()
    await quote_set_generator.store_quote_set(quote_set)
    return quote_set["id"]

async def run_quote_set_generator():
    """Run quote set generator continuously"""
    logger.info("Starting quote set generator service")
    
    # Generate quote sets every 35 minutes (offset from other generators)
    generation_interval = int(os.getenv('QUOTE_SET_GENERATION_INTERVAL', '2100'))
    
    while True:
        try:
            # Generate and store quote set
            set_id = await generate_and_store_quote_set()
            logger.info(f"Generated quote set: {set_id}")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:famous_quotes:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in quote set generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the quote set generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_quote_set_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
"""
Quote Generator for Flashcards
Generates quotes with proper attribution using Haiku API
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

class QuoteGenerator:
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.categories = [
            "wisdom", "success", "courage", "friendship", "perseverance",
            "love", "happiness", "change", "dreams", "learning",
            "creativity", "mindfulness", "leadership", "compassion", "growth"
        ]
        
    async def generate_quotes_batch(self, count: int = 20) -> List[Dict[str, Any]]:
        """Generate a batch of quotes with proper attribution"""
        quotes = []
        
        for i in range(count):
            category = self.categories[i % len(self.categories)]
            quote = await self.generate_single_quote(category)
            if quote:
                quotes.append(quote)
        
        return quotes
    
    async def generate_single_quote(self, theme: str) -> Dict[str, Any]:
        """Generate a single quote with attribution"""
        
        prompt = f"""Generate a meaningful, inspirational quote about {theme}.

        REQUIREMENTS:
        1. The quote must have proper attribution (author, source, or tradition)
        2. Mix between:
           - Historical figures (with accurate attribution)
           - Literary sources (book title + author)
           - Cultural traditions (e.g., "African Proverb", "Zen Teaching")
           - Modern thinkers (with full name)
        3. Create an appropriate challenge question
        4. Ensure the quote is authentic-sounding and meaningful
        
        Return JSON:
        {{
            "content": "The quote text here",
            "author": "Author Name or Source", 
            "source": "Optional: Book/Speech/Context",
            "year": "Optional: Year if known",
            "category": "famous_quotes",
            "difficulty": "medium",
            "challengeType": "who-said-it|fill-blank|multiple-choice|word-order",
            "challenge": "The challenge question",
            "answer": "The correct answer",
            "options": ["option1", "option2", "option3", "option4"], // for multiple choice
            "scrambled": ["word1", "word2", ...], // for word-order
            "explanation": "Brief context about the quote or author"
        }}
        
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
        - "Aristotle, Nicomachean Ethics"
        """
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            payload = {
                "model": "claude-3-haiku-20240307",
                "max_tokens": 800,
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
                            quote_data = json.loads(json_match.group())
                            
                            # Ensure author is always present
                            if not quote_data.get('author'):
                                quote_data['author'] = 'Unknown'
                            
                            return {
                                "id": str(uuid4()),
                                "type": "quote",
                                "data": quote_data,
                                "metadata": {
                                    "theme": theme,
                                    "generated_at": datetime.utcnow().isoformat()
                                },
                                "tags": ["quote", theme, "flashcard"]
                            }
                    else:
                        logger.error(f"API error: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Failed to generate quote: {e}")
            return self.get_fallback_quote(theme)
    
    def get_fallback_quote(self, theme: str) -> Dict[str, Any]:
        """Fallback quotes with proper attribution"""
        fallbacks = {
            "wisdom": {
                "content": "The only true wisdom is in knowing you know nothing.",
                "author": "Socrates",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "who-said-it",
                "challenge": "Which ancient philosopher said this?",
                "answer": "Socrates"
            },
            "success": {
                "content": "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                "author": "Winston Churchill",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "fill-blank",
                "challenge": "Success is not final, failure is not _____: it is the courage to continue that counts.",
                "answer": "fatal"
            },
            "courage": {
                "content": "Courage is not the absence of fear, but the triumph over it.",
                "author": "Nelson Mandela",
                "category": "famous_quotes",
                "difficulty": "medium",
                "challengeType": "multiple-choice",
                "challenge": "Who said this about courage?",
                "options": ["Nelson Mandela", "Martin Luther King Jr.", "Gandhi", "Malcolm X"],
                "answer": "Nelson Mandela"
            }
        }
        
        quote_data = fallbacks.get(theme, fallbacks["wisdom"])
        
        return {
            "id": str(uuid4()),
            "type": "quote", 
            "data": quote_data,
            "metadata": {
                "theme": theme,
                "is_fallback": True
            },
            "tags": ["quote", theme, "flashcard"]
        }
    
    async def store_quotes(self, quotes: List[Dict[str, Any]]):
        """Store generated quotes in the database"""
        async with db.pool.acquire() as conn:
            for quote in quotes:
                await conn.execute("""
                    INSERT INTO content (id, type, data, metadata, tags, is_active)
                    VALUES ($1::uuid, $2, $3, $4, $5, true)
                    ON CONFLICT (id) DO NOTHING
                """, 
                quote["id"], 
                quote["type"],
                json.dumps(quote["data"]),
                json.dumps(quote["metadata"]),
                quote["tags"]
            )
        
        logger.info(f"Stored {len(quotes)} quotes in database")

# Instance for use in other modules
quote_generator = QuoteGenerator()

async def generate_and_store_quotes():
    """Generate a batch of quotes and store them"""
    quotes = await quote_generator.generate_quotes_batch(20)
    await quote_generator.store_quotes(quotes)
    return len(quotes)

async def run_quote_generator():
    """Run quote generator continuously"""
    logger.info("Starting quote generator service")
    
    # Generate quotes every 20 minutes (offset from quiz generator)
    generation_interval = int(os.getenv('QUOTE_GENERATION_INTERVAL', '1200'))
    
    while True:
        try:
            # Generate and store quotes
            count = await generate_and_store_quotes()
            logger.info(f"Generated {count} new quotes")
            
            # Clear flashcard cache
            if db.redis:
                await db.redis.delete("flashcards:*")
            
            # Wait before next generation
            await asyncio.sleep(generation_interval)
            
        except Exception as e:
            logger.error(f"Error in quote generation loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

async def main():
    """Run the quote generator as a service"""
    # Initialize database connections
    await db.connect()
    
    try:
        await run_quote_generator()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
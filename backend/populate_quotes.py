#!/usr/bin/env python3
"""
Script to populate database with quotes for flashcard practice
"""
import asyncio
import logging
from quote_generator import generate_and_store_quotes
from database import db

logging.basicConfig(level=logging.INFO)

async def main():
    """Generate and store a batch of quotes"""
    try:
        # Connect to database
        await db.connect()
        
        print("Generating quotes for flashcard practice...")
        
        # Generate quotes
        count = await generate_and_store_quotes()
        
        print(f"Successfully generated and stored {count} quotes!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Disconnect
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
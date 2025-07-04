#!/usr/bin/env python3
"""
Add economics data to existing quiz sets in the database
This will update all quiz_set content with cost and reward information
"""
import asyncio
import json
import logging
from typing import Dict, Any
from database import db
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuizEconomicsUpdater:
    def __init__(self):
        # Define economics tiers based on category and difficulty
        self.category_tiers = {
            # Tier 1 - Basic categories (lower cost/reward)
            'animals': 1,
            'nature': 1,
            'food_cuisine': 1,
            'sports': 1,
            
            # Tier 2 - Intermediate categories
            'history': 2,
            'geography': 2,
            'literature': 2,
            'art': 2,
            'music': 2,
            'film': 2,
            'pop_culture': 2,
            
            # Tier 3 - Advanced categories (higher cost/reward)
            'technology': 3,
            'science': 3,
            'space': 3,
            'architecture': 3,
            'ancient_architecture': 3,
            'inventions': 3,
            'mythology': 3,
            
            # Tier 4 - Specialist categories (highest cost/reward)
            'gaming': 4,
            'internet_culture': 4,
            'language_evolution': 4,
            'dinosaurs': 4,
            'famous_lies': 4,
            'fashion_design': 4,
            'fame_glory': 4
        }
        
        # Base economics values
        self.base_cost = {
            'energy': 20,
            'coins': 0  # Base quizzes are free in coins
        }
        
        self.base_rewards = {
            'xp': 50,
            'coins': 100,
            'gems': {
                'sapphires': 0,
                'emeralds': 0,
                'rubies': 0,
                'amethysts': 0,
                'diamonds': 0
            }
        }
        
    def calculate_economics(self, quiz_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate economics data for a quiz set"""
        category = quiz_data.get('category', 'general')
        difficulty = quiz_data.get('difficulty', 'medium')
        num_questions = len(quiz_data.get('questions', []))
        
        # Get category tier
        tier = self.category_tiers.get(category, 2)  # Default to tier 2
        
        # Calculate difficulty multiplier
        difficulty_multipliers = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.5,
            'expert': 2.0
        }
        diff_mult = difficulty_multipliers.get(difficulty, 1.0)
        
        # Calculate cost
        cost = {
            'energy': int(self.base_cost['energy'] * (1 + (tier - 1) * 0.25)),
            'coins': 0  # Keep base quizzes free
        }
        
        # Some specialist quizzes might cost coins
        if tier >= 4 and difficulty in ['hard', 'expert']:
            cost['coins'] = 50
        
        # Calculate base rewards
        rewards = {
            'xp': int(self.base_rewards['xp'] * tier * diff_mult),
            'coins': int(self.base_rewards['coins'] * tier * diff_mult),
            'gems': self.base_rewards['gems'].copy()
        }
        
        # Add gem rewards based on tier and difficulty
        if tier >= 2 and difficulty != 'easy':
            rewards['gems']['sapphires'] = 1
        if tier >= 3 and difficulty in ['hard', 'expert']:
            rewards['gems']['emeralds'] = 1
        if tier == 4 and difficulty == 'expert':
            rewards['gems']['rubies'] = 1
            
        # Perfect score bonuses
        perfect_bonus = {
            'xp_multiplier': 1.5,
            'coins_multiplier': 1.5,
            'extra_gems': {}
        }
        
        if tier >= 3:
            perfect_bonus['extra_gems']['amethysts'] = 1
        if tier == 4 and difficulty == 'expert':
            perfect_bonus['extra_gems']['diamonds'] = 1
            
        # Streak bonuses (applied at 3, 5, 10 streak)
        streak_bonuses = {
            3: {'coins': 50, 'gems': {'sapphires': 1}},
            5: {'coins': 100, 'gems': {'emeralds': 1}},
            10: {'coins': 200, 'gems': {'rubies': 1}}
        }
        
        # Mode variations affect rewards
        mode_multipliers = {
            'poqpoq': {'xp': 1.0, 'coins': 1.0},
            'zen': {'xp': 1.2, 'coins': 0.8},  # More XP, less coins
            'speed': {'xp': 0.9, 'coins': 1.3},  # Less XP, more coins
            'chaos': {'xp': 1.5, 'coins': 1.5}   # Bonus for chaos mode
        }
        
        return {
            'cost': cost,
            'rewards': rewards,
            'perfect_bonus': perfect_bonus,
            'streak_bonuses': streak_bonuses,
            'mode_multipliers': mode_multipliers,
            'tier': tier,
            'value_score': tier * diff_mult * 10  # Overall value metric
        }
    
    async def update_quiz_set(self, conn, quiz_id: str, quiz_data: Dict[str, Any]) -> bool:
        """Update a single quiz set with economics data"""
        try:
            # Calculate economics
            economics = self.calculate_economics(quiz_data)
            
            # Add economics to the quiz data
            quiz_data['economics'] = economics
            
            # Update metadata to track this update
            metadata_update = {
                'economics_added': True,
                'economics_version': '1.0',
                'economics_updated_at': datetime.utcnow().isoformat()
            }
            
            # Update the database
            await conn.execute("""
                UPDATE content 
                SET 
                    data = $1,
                    metadata = metadata || $2,
                    updated_at = NOW()
                WHERE id = $3 AND type = 'quiz_set'
            """, json.dumps(quiz_data), json.dumps(metadata_update), quiz_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating quiz {quiz_id}: {e}")
            return False
    
    async def update_all_quiz_sets(self):
        """Update all quiz sets with economics data"""
        updated_count = 0
        error_count = 0
        already_updated = 0
        
        async with db.pool.acquire() as conn:
            # Get all quiz sets
            rows = await conn.fetch("""
                SELECT id, data, metadata
                FROM content
                WHERE type = 'quiz_set'
                ORDER BY created_at DESC
            """)
            
            total = len(rows)
            logger.info(f"Found {total} quiz sets to process")
            
            for i, row in enumerate(rows):
                quiz_id = row['id']
                quiz_data = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
                metadata = json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata']
                
                # Check if already has economics
                if 'economics' in quiz_data or metadata.get('economics_added'):
                    already_updated += 1
                    continue
                
                # Update the quiz set
                success = await self.update_quiz_set(conn, quiz_id, quiz_data)
                
                if success:
                    updated_count += 1
                else:
                    error_count += 1
                
                # Progress update
                if (i + 1) % 100 == 0:
                    logger.info(f"Progress: {i + 1}/{total} processed, {updated_count} updated, {already_updated} already had economics")
        
        logger.info(f"\nUpdate complete!")
        logger.info(f"Total quiz sets: {total}")
        logger.info(f"Successfully updated: {updated_count}")
        logger.info(f"Already had economics: {already_updated}")
        logger.info(f"Errors: {error_count}")
        
        return {
            'total': total,
            'updated': updated_count,
            'already_updated': already_updated,
            'errors': error_count
        }

async def main():
    """Main entry point"""
    logger.info("Starting quiz economics update...")
    
    await db.connect()
    
    try:
        updater = QuizEconomicsUpdater()
        results = await updater.update_all_quiz_sets()
        
        print("\n" + "="*50)
        print("QUIZ ECONOMICS UPDATE SUMMARY")
        print("="*50)
        print(f"Total quiz sets found: {results['total']}")
        print(f"Successfully updated: {results['updated']}")
        print(f"Already had economics: {results['already_updated']}")
        print(f"Failed updates: {results['errors']}")
        print("="*50)
        
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
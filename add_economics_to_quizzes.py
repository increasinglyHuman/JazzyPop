#!/usr/bin/env python3
"""
Add economics data to quiz sets in the backend API response.
This modifies the quiz endpoint to include cost and reward information.
"""

def get_quiz_economics(category, difficulty=None, mode=None):
    """
    Calculate economics data for a quiz based on category, difficulty, and mode.
    Returns a dict with cost and rewards structure.
    """
    
    # Category tiers based on complexity/value
    category_tiers = {
        # Tier 1 - Basic categories (low energy cost, basic rewards)
        'animals': 1, 'food_cuisine': 1, 'nature': 1, 'jokes': 1,
        
        # Tier 2 - Standard categories
        'geography': 2, 'sports': 2, 'music': 2, 'film': 2, 'pop_culture': 2,
        'gaming': 2, 'internet_culture': 2, 'fashion_design': 2,
        
        # Tier 3 - Advanced categories
        'science': 3, 'technology': 3, 'history': 3, 'literature': 3,
        'art': 3, 'mythology': 3, 'space': 3, 'architecture': 3,
        
        # Tier 4 - Specialist categories (higher rewards)
        'ancient_architecture': 4, 'inventions': 4, 'famous_lies': 4,
        'language_evolution': 4, 'dinosaurs': 4, 'fame_glory': 4
    }
    
    tier = category_tiers.get(category, 2)  # Default to tier 2
    
    # Base energy costs by tier
    energy_costs = {1: 10, 2: 15, 3: 20, 4: 25}
    base_energy = energy_costs[tier]
    
    # Difficulty multipliers
    difficulty_multipliers = {
        'easy': 0.8,
        'medium': 1.0,
        'hard': 1.2,
        'expert': 1.5
    }
    
    diff_mult = difficulty_multipliers.get(difficulty, 1.0)
    
    # Calculate final energy cost
    energy_cost = int(base_energy * diff_mult)
    
    # Base rewards by tier
    base_rewards = {
        1: {'xp': (10, 30), 'coins': (20, 50), 'gems': 0},
        2: {'xp': (20, 50), 'coins': (40, 80), 'gems': 0.3},
        3: {'xp': (30, 70), 'coins': (60, 120), 'gems': 0.5},
        4: {'xp': (40, 100), 'coins': (80, 160), 'gems': 0.7}
    }
    
    tier_rewards = base_rewards[tier]
    
    # Apply difficulty multiplier to rewards
    xp_min = int(tier_rewards['xp'][0] * diff_mult)
    xp_max = int(tier_rewards['xp'][1] * diff_mult)
    coins_min = int(tier_rewards['coins'][0] * diff_mult)
    coins_max = int(tier_rewards['coins'][1] * diff_mult)
    
    # Gem chances increase with difficulty
    gem_chance = tier_rewards['gems'] * diff_mult
    
    economics = {
        'cost': {
            'energy': energy_cost,
            'minHearts': 0  # No heart requirement for now
        },
        'rewards': {
            'xp': {'min': xp_min, 'max': xp_max},
            'coins': {'min': coins_min, 'max': coins_max}
        }
    }
    
    # Add gem rewards based on tier and difficulty
    if gem_chance > 0:
        if tier <= 2:
            economics['rewards']['gems'] = {'min': 0, 'max': 1 if gem_chance > 0.5 else 0}
        else:
            economics['rewards']['gems'] = {'min': 0, 'max': 2 if gem_chance > 0.7 else 1}
    
    # Add mystery box for hard/expert difficulties
    if difficulty in ['hard', 'expert']:
        economics['rewards']['rare'] = '🎁 Mystery Box (rare chance)'
    
    # Mode modifiers (applied on completion, shown as preview)
    mode_modifiers = {
        'chaos': {'xp': 1.5, 'coins': 1.2, 'desc': '🔥 +50% XP, +20% Coins'},
        'zen': {'xp': 0.8, 'coins': 0.8, 'desc': '🧘 -20% rewards, +peace of mind'},
        'speed': {'xp': 1.3, 'coins': 1.0, 'desc': '⚡ +30% XP for fast completion'},
        'poqpoq': {'xp': 1.0, 'coins': 1.0, 'desc': '🤖 Standard rewards'}
    }
    
    if mode and mode in mode_modifiers:
        economics['mode_bonus'] = mode_modifiers[mode]['desc']
    
    return economics


# Example modification for the API endpoint:
"""
In main.py, modify the get_quiz_sets endpoint to add economics:

@app.get("/api/content/quiz/sets")
async def get_quiz_sets(...):
    # ... existing code ...
    
    # After getting quiz_sets from database
    for quiz in quiz_sets:
        # Add economics data to each quiz
        category = quiz.get('data', {}).get('category', 'general')
        difficulty = quiz.get('data', {}).get('difficulty', 'medium')
        mode = quiz.get('mode', 'poqpoq')
        
        quiz['economics'] = get_quiz_economics(category, difficulty, mode)
    
    return quiz_sets
"""

if __name__ == "__main__":
    # Test the economics calculation
    test_cases = [
        ('science', 'easy', 'poqpoq'),
        ('science', 'hard', 'chaos'),
        ('gaming', 'medium', 'speed'),
        ('ancient_architecture', 'expert', 'zen'),
    ]
    
    for category, difficulty, mode in test_cases:
        econ = get_quiz_economics(category, difficulty, mode)
        print(f"\n{category.title()} ({difficulty}, {mode}):")
        print(f"  Cost: {econ['cost']['energy']} energy")
        print(f"  XP: {econ['rewards']['xp']['min']}-{econ['rewards']['xp']['max']}")
        print(f"  Coins: {econ['rewards']['coins']['min']}-{econ['rewards']['coins']['max']}")
        if 'gems' in econ['rewards']:
            print(f"  Gems: {econ['rewards']['gems']['min']}-{econ['rewards']['gems']['max']}")
        if 'rare' in econ['rewards']:
            print(f"  Special: {econ['rewards']['rare']}")
        if 'mode_bonus' in econ:
            print(f"  Mode: {econ['mode_bonus']}")
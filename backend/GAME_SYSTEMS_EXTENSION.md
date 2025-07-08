# JazzyPop Game Systems Extension Plan

## Current Structure Supports Extensions

The existing `user_progress` table already has flexible JSONB fields perfect for this:

```sql
CREATE TABLE user_progress (
    user_id UUID REFERENCES users(id),
    stats JSONB DEFAULT '{}',      -- Currently stores economy
    achievements JSONB DEFAULT '[]', -- Ready for achievements!
    ...
);
```

## Proposed Extensions

### 1. Quest System

**Option A: Extend user_progress.stats**
```json
{
  "economy": { ... },
  "quests": {
    "active": [
      {
        "quest_id": "daily_streak_7",
        "progress": 5,
        "target": 7,
        "started_at": "2025-01-07T10:00:00Z"
      }
    ],
    "completed": ["tutorial_1", "first_win", "daily_streak_3"],
    "quest_chains": {
      "beginner_journey": {
        "current_step": 3,
        "completed_steps": ["welcome", "first_quiz", "first_correct"]
      }
    }
  }
}
```

**Option B: Separate quests table (better for complex quests)**
```sql
CREATE TABLE user_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    quest_id VARCHAR(100) NOT NULL,
    quest_chain VARCHAR(100),
    step_number INTEGER DEFAULT 1,
    progress JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active', -- active, completed, abandoned
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, quest_id)
);
```

### 2. Badges System

**In user_progress table:**
```json
{
  "badges": [
    {
      "id": "speed_demon",
      "earned_at": "2025-01-07T15:30:00Z",
      "tier": "gold",
      "display_order": 1
    },
    {
      "id": "quiz_master",
      "earned_at": "2025-01-06T12:00:00Z",
      "tier": "platinum",
      "display_order": 2
    }
  ]
}
```

**Badge definitions in content table:**
```json
// type: 'badge_definition'
{
  "id": "speed_demon",
  "name": "Speed Demon",
  "description": "Complete 10 quizzes in under 30 seconds each",
  "icon": "lightning_bolt",
  "tiers": {
    "bronze": { "requirement": 10, "icon_color": "#CD7F32" },
    "silver": { "requirement": 50, "icon_color": "#C0C0C0" },
    "gold": { "requirement": 100, "icon_color": "#FFD700" }
  }
}
```

### 3. Achievements System

**Already has a field! Just need to populate it:**
```json
// In user_progress.achievements
[
  {
    "id": "first_perfect_score",
    "unlocked_at": "2025-01-05T14:22:00Z",
    "progress": 100,
    "metadata": {
      "quiz_id": "abc-123",
      "score": 10
    }
  },
  {
    "id": "play_100_games",
    "unlocked_at": null,
    "progress": 67,
    "target": 100
  }
]
```

### 4. Assets System (Pets, Items, Cosmetics)

**Option A: In user_progress.stats**
```json
{
  "assets": {
    "pets": [
      {
        "id": "cosmic_cat",
        "name": "Nebula",
        "acquired_at": "2025-01-04T10:00:00Z",
        "level": 3,
        "equipped": true,
        "stats": {
          "happiness": 85,
          "bonus_xp": 1.1
        }
      }
    ],
    "cosmetics": {
      "avatar_frames": ["golden_glow", "rainbow_pulse"],
      "themes": ["dark_mode", "cosmic"],
      "equipped": {
        "frame": "golden_glow",
        "theme": "cosmic"
      }
    },
    "inventory": [
      {
        "item_id": "xp_boost_30min",
        "quantity": 3,
        "acquired_at": "2025-01-07T09:00:00Z"
      }
    ]
  }
}
```

**Option B: Separate assets table (better for trading/marketplace)**
```sql
CREATE TABLE user_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    asset_type VARCHAR(50), -- pet, cosmetic, consumable
    asset_id VARCHAR(100),
    metadata JSONB DEFAULT '{}', -- pet stats, custom names, etc
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    equipped BOOLEAN DEFAULT FALSE,
    tradeable BOOLEAN DEFAULT TRUE
);
```

## Implementation Approach

### Phase 1: Use Existing JSONB (Quick)
- Extend `user_progress.stats` with new fields
- Store everything in flexible JSON
- Quick to implement, easy to iterate

### Phase 2: Dedicated Tables (Scalable)
- Create specific tables for complex systems
- Better for queries and performance
- Easier to add features like trading

## Migration Path

```sql
-- Add new JSONB fields to user_progress
ALTER TABLE user_progress 
ADD COLUMN quests JSONB DEFAULT '{}',
ADD COLUMN badges JSONB DEFAULT '[]',
ADD COLUMN assets JSONB DEFAULT '{}';

-- Or just use the existing stats field
UPDATE user_progress 
SET stats = stats || '{"quests": {}, "badges": [], "assets": {}}'::jsonb
WHERE user_id = $1;
```

## API Endpoints Needed

```python
# Quests
GET  /api/quests/active          # Get active quests
POST /api/quests/{quest_id}/progress  # Update quest progress
POST /api/quests/{quest_id}/complete  # Complete quest

# Badges
GET  /api/badges                 # Get all earned badges
GET  /api/badges/available       # Get earnable badges

# Achievements  
GET  /api/achievements           # Get all achievements
POST /api/achievements/{id}/unlock  # Unlock achievement

# Assets
GET  /api/assets                 # Get all user assets
POST /api/assets/{asset_id}/equip   # Equip/unequip asset
GET  /api/assets/shop            # Get purchasable assets
```

## Quest System Example

```python
# In database.py
async def update_quest_progress(self, user_id: UUID, quest_type: str, progress: int = 1):
    """Update quest progress and check for completion"""
    async with self.pool.acquire() as conn:
        # Get current quests
        user_data = await conn.fetchval(
            "SELECT stats FROM user_progress WHERE user_id = $1",
            user_id
        )
        
        quests = user_data.get('quests', {}).get('active', [])
        
        for quest in quests:
            if quest['type'] == quest_type:
                quest['progress'] += progress
                
                # Check if completed
                if quest['progress'] >= quest['target']:
                    # Award rewards
                    await self.complete_quest(user_id, quest['quest_id'])
        
        # Save updated quests
        await conn.execute(
            "UPDATE user_progress SET stats = stats || $1::jsonb WHERE user_id = $2",
            json.dumps({"quests": {"active": quests}}),
            user_id
        )
```

## Benefits of This Approach

1. **No Schema Changes Needed** - JSONB is already there
2. **Flexible Evolution** - Add features without migrations
3. **Performance** - PostgreSQL JSONB is fast and indexed
4. **Easy Queries** - Can query into JSON with PostgreSQL
5. **Backwards Compatible** - Won't break existing code

## Next Steps

1. Define quest/badge/achievement content structure
2. Create content definitions (in content table)
3. Add progress tracking to game endpoints
4. Build UI components for displaying
5. Add notification system for unlocks

The foundation is already perfect for these extensions!
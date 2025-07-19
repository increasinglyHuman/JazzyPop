# SVG Collaborative Painting Game Specification

## Overview
A safe, creative social feature where users collaboratively color predefined SVG templates. No free-form drawing means no inappropriate content, while still enabling meaningful creative expression.

## Core Mechanics

### How It Works
1. System provides outlined SVG templates (animals, patterns, scenes)
2. Players select colors from curated palettes
3. Each player fills different sections
4. Results saved as beautiful collaborative art

### Game Modes
- **Quick Color** (2-3 players, 5 minutes)
- **Community Canvas** (daily, everyone adds one section)
- **Theme Challenges** ("Make it spooky", "Summer vibes")
- **Speed Coloring** (competitive mode with timer)
- **Gallery Mode** (vote on best colorways)

## Technical Implementation

### SVG Structure
```xml
<svg id="collab-canvas-001">
  <g id="section-1" data-player="null" fill="#ffffff">
    <path d="..." />
  </g>
  <g id="section-2" data-player="null" fill="#ffffff">
    <path d="..." />
  </g>
  <!-- More sections -->
</svg>
```

### Data Format
```json
{
  "canvasId": "daily-2025-01-15",
  "template": "butterfly-001",
  "sections": {
    "wing-left": { "playerId": "user123", "color": "#FF6B6B", "timestamp": 1234567890 },
    "wing-right": { "playerId": "user456", "color": "#4ECDC4", "timestamp": 1234567891 }
  }
}
```

## Safety Features
- No free-form drawing capabilities
- Only approved color palettes
- Predefined shapes only
- Easy moderation (just color choices)
- No text or custom paths

## Integration with JazzyPop

### Unlocking System
- Complete quiz sets → unlock templates
- Achievements → exclusive palettes  
- Streaks → premium templates
- XP levels → more sections per canvas

### Rewards
- Coins for completed paintings
- Badges for collaboration milestones
- XP for participation
- Gems for highly-voted art

## Monetization
- **Free**: Basic templates & colors
- **Premium**: 
  - Exclusive templates
  - Metallic/gradient palettes
  - Save/download high-res versions
  - Create private coloring rooms

## Phase 1 vs Phase 2

### Phase 1 (Post-Launch)
- 2D interface within main app
- Simple turn-based coloring
- Gallery view of completed works
- Basic voting system

### Phase 2 (3D Gallery Integration)
- Display finished SVGs on gallery walls
- Real-time collaborative coloring
- Watch others paint live
- Pet reactions to color choices

## Content Pipeline
1. Commission SVG templates from artists
2. Break into logical sections (10-50 per image)
3. Test for difficulty/time balance
4. Assign rarity levels
5. Theme templates for events/seasons

## Success Metrics
- Paintings completed per day
- Average collaborators per painting
- Return rate for painting mode
- Social connections formed
- Premium palette sales

---

**Note**: This feature ships AFTER core quiz functionality is stable. Enhances social engagement without compromising safety.
# JazzyPop Unified Economy Design System

## Overview
This document outlines the unified design approach for integrating economy information into JazzyPop cards while preserving the unique personality of quiz modes and improving clarity of costs, rewards, and special events.

## Core Design Principles

### 1. Visual Hierarchy
- **Top**: Cost & Requirements (immediately visible)
- **Upper Right**: Event flags/badges (buffs, special events)
- **Center**: Content area (preserved as-is)
- **Bottom**: Rewards footer bar

### 2. Border Color System
Repurposing border colors from decorative to functional:
- **Green** (#4ecca3): Affordable/Available
- **Yellow** (#f39c12): Almost affordable (75-99% resources)
- **Red** (#e94560): Unaffordable/Locked
- **Purple** (#9b59b6): Special event active
- **Gold** (#ffd700): Bonus/Streak active

## Component Specifications

### Cost Display Bar (Top)
```
┌─────────────────────────────────────────────┐
│ Cost: ⚡10  💎2  🪙5  [♥>3]  ▼             │
└─────────────────────────────────────────────┘
```

**Features:**
- Primary display shows required resources
- Heart requirement shown as [♥>n] when needed
- Expandable dropdown (▼) reveals:
  - Detailed cost breakdown
  - Current player resources
  - What's missing (in red)
  - Time to regenerate energy

**Visual States:**
- Normal: Dark background with white text
- Event Active: Strikethrough original + new cost in green
- Free Play: Glowing "✨ FREE ✨" text

### Event Flags (Upper Right)
Stackable badge system for multiple concurrent states:

```
                              [DOUBLE XP]
                           [POWER HOUR]
                        [STREAK x5]
```

**Badge Types:**
- **Power Hour**: "DOUBLE EFFICIENCY" - Orange gradient
- **Learning Party**: "OPEN PRACTICE" - Green/blue gradient  
- **Perfect Streak**: "STREAK BONUS" - Gold gradient
- **Quest Active**: "QUEST 2/5" - Purple
- **Limited Time**: "ENDS IN 5:00" - Red pulse

### Mode Preservation
Quiz modes retain their unique visual identity:
- **PoqPoq**: Standard dark theme
- **Chaos**: Pink/purple gradient background, animated effects
- **Zen**: Soft blue/green, peaceful animations
- **Speed**: Orange/red urgency, timer overlay

### Content Area
**No changes** - Preserves:
- Category icons
- Title and description
- Current layout and spacing
- Mode-specific animations

### Rewards Footer Bar
```
┌─────────────────────────────────────────────┐
│  Earn: ⭐ 20-50 XP  💎 2-5 Gems  🎁 Rare   │
└─────────────────────────────────────────────┘
```

**Features:**
- Compact single-line display
- Shows potential rewards range
- Special rewards highlighted (rare drops, badges)
- Mode-specific coloring

### Play Button States
Dynamic button styling based on context:

**Standard States:**
- Available: Green (#4ecca3) - "PLAY NOW"
- Power Hour: Orange gradient - "PLAY WITH BOOST"
- Free Play: Green/blue gradient - "PLAY FREE"
- Locked: Gray (#888) - "UNLOCK AT LEVEL 5"

**Mode Overrides:**
- Practice: Keep current (no change needed)
- Speed Mode: Red urgency - "RACE NOW"
- Zen Mode: Soft blue - "BEGIN JOURNEY"

## Language System

### Cost Language
- Standard: "Cost: Energy 10"
- Power Hour: "Cost: ~~Energy 10~~ Energy 5"
- Free Play: "Cost: ✨ FREE ✨"

### Event Messaging
Following refined JazzyPop approach:
- ❌ "50% OFF" → ✅ "DOUBLE EFFICIENCY"
- ❌ "SALE" → ✅ "POWER HOUR"
- ❌ "LIMITED OFFER" → ✅ "SPECIAL EVENT"

### Encouragement System
Hover tooltips with rotating messages:
- "Brilliant!"
- "Well played!"
- "You've got this!"
- "Perfect timing!"

## Implementation Priority

### Phase 1: Core Structure
1. Add cost display bar with basic resources
2. Implement border color affordability system
3. Add rewards footer bar

### Phase 2: Events & Flags
1. Create badge system for upper right
2. Implement event cost modifications
3. Add expandable cost details

### Phase 3: Polish
1. Add hover encouragements
2. Implement animations
3. Fine-tune language throughout

## CSS Architecture

### New Classes Required
```css
.card-cost-bar { }
.card-cost-bar.expanded { }
.card-border-affordable { }
.card-border-warning { }
.card-border-locked { }
.card-event-badge { }
.card-rewards-footer { }
.play-button-boost { }
.play-button-free { }
```

### Conflicts to Resolve
- Border color system (currently decorative)
- Card hover states (may conflict with new borders)
- Button color system (needs event variants)

## Backup Strategy

Before implementation:
1. Create `jazzypop-pre-economy-backup` branch
2. Tag current version as `v1.0-pre-economy`
3. Document all current CSS class usage
4. Screenshot all card variations

## Testing Checklist

- [ ] All four quiz modes display correctly
- [ ] Cost displays update with player resources
- [ ] Event badges stack properly
- [ ] Border colors reflect affordability
- [ ] Rewards footer shows correct ranges
- [ ] Play button adapts to context
- [ ] Mobile responsive design maintained
- [ ] No CSS conflicts with existing modes
- [ ] Expandable cost details work
- [ ] Language is consistent throughout

## Success Metrics

1. **Clarity**: Players understand costs at a glance
2. **Excitement**: Event messaging creates urgency without pressure
3. **Consistency**: Economic info doesn't overshadow content
4. **Accessibility**: Color-blind friendly indicators
5. **Performance**: No animation lag from new elements

---

## Next Steps

1. Create backup of current state
2. Build isolated component prototypes
3. Test CSS integration in sandbox
4. Implement Phase 1 in staging
5. User test and iterate
6. Roll out remaining phases

This design preserves what works while adding clear economic communication that enhances rather than disrupts the JazzyPop experience.
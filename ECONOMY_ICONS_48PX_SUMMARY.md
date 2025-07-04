# JazzyPop Economy Icons Summary - 48px Square

## Current Icon Usage in Economy System

All icons are displayed at **48px × 48px** in the enhanced card component.

### Cost Icons (Used in top bar)

1. **Energy Icon**
   - Path: `./src/images/power-icons/Experience.svg`
   - Usage: Primary resource cost
   - Color: White (#fff) on semi-transparent backgrounds
   - Appears with numeric values (e.g., "10", "20", etc.)

2. **Gems Icon** 
   - Path: `./src/images/power-icons/diamonds.svg`
   - Usage: Premium currency cost
   - Color: White (#fff)
   - Can appear as single icons or with numeric values

3. **Hearts Icon**
   - Path: `./src/images/power-icons/hearts.svg`
   - Usage: Minimum heart requirement (e.g., ">3")
   - Color: White (#fff)
   - Shows minimum threshold, not consumption

### Reward Icons (Used in bottom footer)

1. **Experience/XP Icon**
   - Path: `./src/images/power-icons/Experience.svg` (same as Energy)
   - Usage: Experience points reward
   - Shows range (e.g., "10-100") or fixed amount

2. **Gems Icon**
   - Path: `./src/images/power-icons/diamonds.svg` (same as cost)
   - Usage: Gem rewards
   - Special behavior: Shows 1-3 individual icons for small amounts
   - Shows numeric range for larger amounts (e.g., "5-10")

3. **Mystery/Rare Reward Icon**
   - Path: `./src/images/power-icons/HotStreak.svg`
   - Usage: Rare/mystery rewards indicator
   - Displays with "Mystery" text

### Missing Icons (Referenced but not implemented)

These currencies are mentioned in the system but don't have icons yet:

1. **Coins** - Secondary currency
2. **Tickets** - Event/special currency  
3. **Keys** - Unlock currency

### Icon Implementation Details

```css
.icon-small {
    width: 48px;
    height: 48px;
    display: inline-block;
    vertical-align: middle;
    margin-right: 12px;
}

.cost-item .icon-small,
.reward-item .icon-small {
    filter: brightness(1.2);  /* Slightly brightened for visibility */
}
```

### Icon Color Behavior

- All icons render in white (#fff) on the semi-transparent colored backgrounds
- Icons have a slight brightness boost (1.2) for better visibility
- Icons maintain their original SVG colors but are typically designed to work on dark backgrounds

### Special Icon Behaviors

1. **Gem Icons in Rewards**: When showing 1-3 possible gem rewards, individual gem icons are displayed side-by-side rather than a single icon with a number

2. **Energy/XP Dual Purpose**: The Experience.svg icon serves double duty as both the "Energy" cost icon and the "XP" reward icon

### Recommended Icon Set for Custom Creation

When creating your custom 48px square icons, you'll need:

1. **energy.svg** - Lightning bolt or energy symbol
2. **gems.svg** - Diamond/gem shape
3. **hearts.svg** - Heart symbol
4. **experience.svg** - Star or XP symbol
5. **mystery.svg** - Question mark or gift box
6. **coins.svg** - Coin symbol (new)
7. **tickets.svg** - Ticket shape (new)
8. **keys.svg** - Key symbol (new)

### Design Guidelines for Custom Icons

- **Size**: Exactly 48px × 48px viewBox
- **Style**: Simple, bold shapes that read well at small sizes
- **Color**: Design for white/light colors on dark backgrounds
- **Padding**: Include 4-6px internal padding for breathing room
- **Weight**: Medium to bold strokes for visibility
- **Format**: SVG for scalability and color flexibility

The system is ready to accept your custom 48px square icons to replace the current placeholder icons from the power-icons folder!
# Economy Implementation Roadmap

## Quick Start Guide

### 1. Run Backup First!
```bash
chmod +x backup-pre-economy.sh
./backup-pre-economy.sh
```

### 2. CSS Conflict Resolution Strategy

#### Border Colors - Current vs New
**Current Usage:**
- Decorative/random assignment
- No semantic meaning

**New Usage:**
- Green: Affordable
- Yellow: Almost affordable  
- Red: Locked/Unaffordable
- Purple: Special event
- Gold: Bonus active

**Migration Path:**
1. Search for all `.card` border assignments
2. Create new classes: `.economy-affordable`, `.economy-warning`, `.economy-locked`
3. Override with higher specificity

#### Key CSS Files to Modify

**1. card.css**
```css
/* Add new economy border system */
.card.economy-affordable {
  border-color: #4ecca3 !important;
  border-width: 2px;
}

.card.economy-warning {
  border-color: #f39c12 !important;
  border-width: 2px;
}

.card.economy-locked {
  border-color: #e94560 !important;
  border-width: 2px;
  opacity: 0.8;
}
```

**2. New file: card-economics.css**
```css
/* Cost display bar */
.card-cost-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

/* Event badges */
.card-event-badges {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 20;
}

/* Rewards footer */
.card-rewards-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 12px;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid var(--border);
}
```

### 3. Component Updates

#### GenericCard.js - Add Economic Sections
```javascript
buildCard() {
    const sections = [];
    
    // NEW: Always add cost bar at top
    sections.push(this.buildCostBar());
    
    // NEW: Add event badges if any
    if (this.hasActiveEvents()) {
        sections.push(this.buildEventBadges());
    }
    
    // Existing sections...
    
    // NEW: Always add rewards footer at bottom
    sections.push(this.buildRewardsFooter());
    
    return sections.join('');
}
```

#### CardManager.js - Calculate Affordability
```javascript
updateCardAffordability() {
    this.cards.forEach(card => {
        const canAfford = this.economyManager.canAfford(card.cost);
        const affordClass = canAfford ? 'economy-affordable' : 
                          this.isAlmostAffordable(card.cost) ? 'economy-warning' : 
                          'economy-locked';
        
        card.element.className = card.element.className
            .replace(/economy-\w+/g, '') + ' ' + affordClass;
    });
}
```

### 4. Testing Checklist for Each Phase

#### Phase 1 Testing:
- [ ] Cost bar displays on all card types
- [ ] Border colors change with resources
- [ ] Rewards footer doesn't overlap content
- [ ] Mobile responsive maintained

#### Phase 2 Testing:
- [ ] Event badges stack properly
- [ ] Cost modifications display correctly
- [ ] Expandable details animate smoothly
- [ ] No z-index conflicts

#### Phase 3 Testing:
- [ ] Hover encouragements appear/disappear
- [ ] All animations perform well
- [ ] Language is consistent
- [ ] Accessibility maintained

### 5. Rollback Plan

If something breaks critically:
```bash
# Quick rollback
tar -xzf jazzypop-backup-pre-economy-[DATE].tar.gz
cp -r jazzypop-backup-pre-economy-[DATE]/* ./

# Or use git tag
git checkout pre-economy-[DATE]
```

### 6. Common CSS Battles & Solutions

**Battle 1: Mode colors override borders**
```css
/* Use higher specificity */
.card.theme-chaos.economy-locked {
  border-color: #e94560 !important;
}
```

**Battle 2: Cost bar covers content**
```css
/* Add padding to card content */
.card-with-economics .card-content {
  padding-top: 48px; /* Space for cost bar */
}
```

**Battle 3: Event badges overlap**
```css
/* Use CSS Grid for badges */
.card-event-badges {
  display: grid;
  grid-auto-flow: row;
  gap: 5px;
}
```

### 7. Progressive Enhancement

Start simple, add complexity:
1. **Day 1**: Just cost display + border colors
2. **Day 2**: Add event badges
3. **Day 3**: Add expandable details
4. **Day 4**: Add animations
5. **Day 5**: Polish and test

Remember: **Test after each addition!**

---

Good luck! The mockups look fantastic and this implementation will really elevate the JazzyPop experience! 🚀
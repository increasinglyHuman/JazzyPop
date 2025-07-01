# JazzyPop Task List
*Last Updated: 2025-06-30 by Claude & p0qp0q*

## Tasks Organized by Priority & Effort

### 🍎 Low-Hanging Fruit (High Impact, Low Effort)
*Perfect for a green tea Sunday!*

### 1. Expand Categories & Category Images
- **Current State**: Limited number of categories with SVG images
- **Need**: More categories to cover broader range of quiz topics
- **Subtasks**:
  - Audit existing categories (currently have: science, history, technology, space, gaming, art, mythology, animals, geography, nature, pop_culture, sports, food_cuisine, film, literature, music)
  - Identify missing categories
  - Create new category SVG images (maintaining consistent style)
  - Update category mappings in code
- **Human-Bob Pairing**: Human decides categories, Bob helps implement

### 2. Expand Nebula Backgrounds & Add Transitions
- **Current State**: Limited nebula background options
- **Need**: More nebula variations and smooth transitions between them
- **Subtasks**:
  - Audit existing nebula images in `/src/images/nebulas/`
  - Create/source additional nebula backgrounds
  - Implement transition animations (fade, slide, morph?)
  - Add nebula rotation/scheduling system
  - Consider performance impact of animations
  - Maybe tie nebula changes to events (level up, streak achievements, mode changes)
- **Human-Bob Pairing**: Human chooses aesthetic direction, Bob implements transitions

### 3. Fix Missing Bot Images on Settings Page [QUICK FIX]
- **Current State**: Theme bot images (p0qp0q, zen, chaos, speed) not showing on settings page
- **Issue**: SettingsPanel.js using absolute paths `/src/images/` instead of relative paths
- **Fix**: Change paths in SettingsPanel.js from `/src/images/` to `./src/images/`
- **Files to Update**:
  - `/src/components/SettingsPanel.js` (lines 58, 61, 64, 67)
- **Human-Bob Pairing**: Bob can fix immediately if desired

### 4. Replace System Alerts with Proper UI
- **Current State**: Using browser alert() popups (e.g., View Credits)
- **Need**: Replace with styled modal dialogs or inline UI
- **Subtasks**:
  - Search codebase for all alert() calls
  - Design consistent modal/notification system
  - Create reusable modal component
  - Replace each alert with proper UI
  - Test all replacements
- **Areas likely affected**:
  - Credits display
  - Error messages
  - Confirmation dialogs
- **Human-Bob Pairing**: Human designs modal style, Bob implements replacements

### 5. Add Sound Effects & Audio System
- **Current State**: No sound in the game at all
- **Need**: Audio feedback for user actions and game events
- **Subtasks**:
  - Design sound architecture (Web Audio API vs HTML5 Audio)
  - Create/source sound effects for:
    - Correct/incorrect answers
    - Button clicks
    - Level up/achievements
    - Mode-specific sounds (zen = calm, chaos = wild)
    - Card flips/transitions
    - Streak milestones
  - Implement audio manager/controller
  - Add volume controls to settings
  - Consider background music per mode?
  - Ensure mobile compatibility
  - Add mute/unmute toggle
- **Human-Bob Pairing**: Human selects/creates sounds, Bob implements audio system

### 6. Fix Answer Feedback Timing
- **Current State**: Correct/incorrect indicators (red/green buttons) get immediately covered by reward/punishment overlays
- **Need**: 1-1.5 second pause to let players see and learn from the right answer
- **Subtasks**:
  - Locate answer submission handling in QuizModal.js
  - Add delay before showing reward/punishment overlay
  - Ensure correct answer is highlighted during pause
  - Make sure red/green indicators stay visible
  - Test timing feels natural (not too fast, not too slow)
  - Consider mode-specific timing? (chaos = faster, zen = slower)
- **Impact**: Critical for learning - players need to see what they got wrong/right
- **Human-Bob Pairing**: Bob implements timing fix, Human tests feel

### 7. Standardize Card Heights for Mobile
- **Current State**: Practice mode cards too tall, inconsistent with play cards
- **Need**: All cards should be advertisement height (shorter) for better mobile experience
- **Subtasks**:
  - Audit current card heights across different types
  - Define standard card height for mobile optimization
  - Update practice card CSS/component
  - Ensure all card types use consistent height
  - Test on various mobile screen sizes
  - Verify content still fits in shorter cards
  - Consider responsive breakpoints if needed
- **Impact**: Critical for mobile usability and visual consistency
- **Human-Bob Pairing**: Human defines ideal height, Bob implements across all card types

### 8. Fix Google Sign-In Implementation -- complete
- **Current State**: Google Sign-In partially set up but not working
- **Need**: Complete the implementation and get it functional
- **Subtasks**:
  - Check Google Cloud Console for OAuth client configuration
  - Verify client ID is properly set in the code
  - Check authorized JavaScript origins and redirect URIs
  - Review the Google Sign-In initialization in dashboard.js
  - Ensure proper callback handlers are implemented
  - Test with browser console for errors
  - Verify API endpoints for handling Google auth tokens
  - Check CORS settings for Google OAuth
- **Debug areas**:
  - Client ID configuration
  - Domain whitelist in Google Console
  - Callback implementation
- **Human-Bob Pairing**: Human checks Google Console settings, Bob debugs implementation

### 9. Implement Push Notifications System
- **Current State**: Basic service worker exists, but push notifications not implemented
- **Need**: Full push notification system for engagement (daily quizzes, streaks, etc.)
- **Subtasks**:
  - Decide on notification service (Firebase Cloud Messaging, OneSignal, custom?)
  - Set up new phone number for JazzyPop (not ALM testing number)
  - Configure notification permissions flow
  - Design notification types:
    - Daily quiz reminder
    - Streak at risk
    - New quiz available
    - Achievement unlocked
    - Friend challenges?
  - Implement backend notification scheduler
  - Create notification preferences in settings
  - Test across devices (iOS, Android, desktop)
  - Handle offline/online states
- **Considerations**:
  - This is commercial game, needs dedicated infrastructure
  - GDPR/privacy compliance for notifications
  - Don't be spammy - respect user preferences
- **Human-Bob Pairing**: Human decides notification strategy/frequency, Bob implements

### 10. Fix Profile System & Diversify Avatars
- **Current State**: 
  - Profile selector doesn't retain active user avatar - fixed (not deployed)
  - ~80% of avatars appear male-presenting
  - Limited diversity in avatar options
- **Need**: Persistent profiles with diverse, inclusive avatar options
- **Subtasks**:
  - Fix avatar persistence (localStorage or backend)
  - Audit current avatar collection for diversity
  - Add more feminine/non-binary presenting options
  - Implement avatar generation features:
    - Random avatar generator
    - Color customization options
    - Accessories/features mixing
  - Consider avatar categories:
    - Bots/robots (gender-neutral)
    - Animals/creatures
    - Abstract shapes
    - Diverse human representations
  - Link Google profile photos when signed in
  - Save avatar selection to user profile
- **Impact**: Inclusivity and personalization are key for user engagement
- **Human-Bob Pairing**: Human curates/creates diverse avatars, Bob implements system

### 11. Overhaul Mindful Moments & Herding Game [MAJOR] - defer...
- **Current State**: 
  - Mindful moments exist but need polish
  - Herding game particularly needs significant work
- **Need**: Fully developed mindful break activities that are engaging and polished
- **Subtasks for Herding Game**:
  - Define clear game mechanics and objectives
  - Improve visual feedback and animations
  - Add difficulty progression
  - Implement scoring/reward system
  - Create tutorial/instructions
  - Polish controls (especially for mobile)
  - Add sound effects specific to herding
  - Consider time limits or zen mode options
- **Other Mindful Moments to Review**:
  - Breathing exercises
  - Pattern matching
  - Memory games
  - Meditation timers
  - Color/mood selectors
- **Design Questions**:
  - How long should each mindful moment last?
  - Should they give rewards/points?
  - Mandatory breaks or optional?
  - Frequency of appearance?
- **Human-Bob Pairing**: Human designs game mechanics, Bob implements improvements

### 12. Evaluate & Adapt Games from "Creating Casual Games for Profit and Fun"
- **Current State**: Existing book with proven game concepts
- **Need**: Adapt suitable games as mindful moments or reward activities
- **Games to Evaluate**:
  - **Bejeweled Clone** (match-3) - High potential
    - Could work as streak reward
    - Mindful moment activity
    - Zen mode time-killer
    - Easy mobile controls
  - Other games from book to review
- **Adaptation Considerations**:
  - Simplify for quick play sessions (30-60 seconds)
  - Match JazzyPop's aesthetic
  - Integrate with reward/point system
  - Ensure mobile-friendly controls
  - Add mode-specific twists (chaos = faster, zen = no timer)
- **Implementation Strategy**:
  - Start with Bejeweled clone as proof of concept
  - If successful, adapt other suitable games
  - Could become a suite of mini-games
- **Human-Bob Pairing**: Human provides game logic/rules, Bob adapts for JazzyPop

### 13. Polish Practice Game Layouts - higher priority
- **Current State**: 
  - Practice games (Famous Quotes, etc.) have amusing content
  - Layouts are rough/early stage
  - Good concepts but need visual polish
- **Need**: Bring practice games up to main game quality
- **Games to Polish**:
  - Famous Quotes Challenge
  - Knock Knock Jokes
  - Trivia Mix
  - Bad Puns (if exists)
- **Polish Areas**:
  - Consistent card layouts
  - Better typography/spacing
  - Visual feedback improvements
  - Mobile-optimized layouts
  - Loading/transition states
  - Score/progress display
  - Better reveal animations for quotes/punchlines
- **Keep What Works**:
  - The amusing content
  - The casual/fun tone
  - Quick play sessions
- **Human-Bob Pairing**: Human reviews layouts, Bob implements polish

### 14. Balance Heart/Lives Economy - partially implemented - see economy.js
- **Current State**: 
  - Players lose hearts too quickly
  - Ratio of hearts available to hearts lost is off
  - Too punishing for casual players
- **Need**: Better balanced lives system that keeps players engaged
- **Areas to Adjust**:
  - Starting heart count (currently 5?)
  - Hearts lost per wrong answer
  - Heart regeneration rate/timer
  - Ways to earn hearts back:
    - Correct answer streaks
    - Mindful moment completion
    - Daily login bonus
    - Watch ad (if monetizing)
    - Time-based regeneration
  - Mode-specific adjustments:
    - Zen mode: More forgiving
    - Chaos mode: Current difficulty?
    - Speed mode: Balanced risk/reward
- **Testing Needed**:
  - Average session length before running out
  - Player frustration points
  - Engagement drop-off data
- **Human-Bob Pairing**: Human defines ideal difficulty curve, Bob implements balance changes

### 15. Implement Varied Failure Penalties (Gems vs Hearts) - partially implemented - economy.js
- **Current State**: Every wrong answer costs hearts
- **Need**: Mixed penalty system - sometimes lose hearts, sometimes gems
- **Implementation Ideas**:
  - Random chance (70% gems, 30% hearts?)
  - Pattern-based (every 3rd failure = heart)
  - Mode-specific ratios
  - Difficulty-based (harder questions risk hearts)
  - Player choice ("Risk a heart for double rewards?")
- **Economic Model**:
  - Gems → Can buy power-ups
  - Power-ups → Help preserve hearts
  - Hearts → Keep playing
  - Creates spending decisions
- **Benefits**:
  - Less frustrating (not always losing lives)
  - Adds strategic resource management
  - Encourages gem earning/spending
  - Extends play sessions
- **Human-Bob Pairing**: Human designs economy balance, Bob implements penalty system

### 16. Implement Complete XP & Leveling System - mostly implemented - see economy.js
- **Current State**: XP exists but no real progression system
- **Need**: Full leveling system with meaningful progression
- **Core Components**:
  - XP progress bar (visual feedback)
  - Level thresholds and scaling
  - Level up celebration/animation
  - Persistent level tracking
- **Level Up Rewards**:
  - Unlock new categories
  - Earn bonus gems/hearts
  - New avatars/customizations
  - Achievement badges
  - Power-up unlocks
  - Special card backgrounds
- **XP Sources**:
  - Correct answers (base XP)
  - Streak bonuses
  - Perfect rounds
  - Daily challenges
  - Mindful moment completion
  - Mode-specific multipliers
- **Visual Elements**:
  - XP bar below user info
  - Level number display
  - "XP to next level" indicator
  - Milestone previews
- **Integration Points**:
  - Tie to achievement system
  - Connect with leaderboards
  - Badge unlocks at levels
  - Profile prestige display
- **Human-Bob Pairing**: Human designs progression curve & rewards, Bob implements system

### 17. Implement Smart Media Recommendation System
- **Current State**: No recommendation system
- **Need**: Integrated recommendations based on quiz performance & interests
- **Recommendation Types**:
  - Classic literature
  - Modern books
  - Anime/manga
  - Web comics
  - Educational content
  - Documentaries/films
- **Implementation Strategy**:
  - Track user interests via quiz categories
  - Recommend based on:
    - Categories they excel in
    - Categories they struggle with (learning aids)
    - Question topics (e.g., mythology quiz → Percy Jackson)
  - Post-quiz recommendation cards
  - Special "discovery" section
- **Monetization Model**:
  - Affiliate links (Amazon, BookShop, Crunchyroll)
  - Sponsored recommendations (publisher deals)
  - Premium subscriptions include:
    - Ad-free experience
    - Exclusive recommendations
    - Early access to new content
    - Bonus XP/gems multipliers
    - Prestige skins/themes
    - Special mini-games
- **Benefits**:
  - Adds educational value
  - Creates sustainable revenue
  - Builds cultural literacy
  - Natural, value-added advertising
- **Human-Bob Pairing**: Human curates initial lists, Bob builds recommendation engine

### 18. Create Collectible Trading Card System - higher priority
- **Current State**: No collectible system
- **Need**: Engaging collection mechanic for long-term retention
- **Card Types**:
  - Character cards (all the bots)
  - Knowledge cards (facts from quizzes)
  - Achievement cards (special accomplishments)
  - Rare/legendary variants
  - Seasonal/event cards
  - Collaboration cards (from recommended media)
- **Collection Mechanics**:
  - Earn cards from quiz performance
  - Random drops after games
  - Trade duplicates with friends
  - Complete sets for bonuses
  - Card albums/galleries
  - Rarity tiers (common to legendary)
- **Card Features**:
  - Beautiful artwork
  - Educational facts on each
  - Power-up abilities?
  - Combine for special effects
  - Showcase in profile
- **Monetization Tie-ins**:
  - Premium card packs
  - Guaranteed rare drops for subscribers
  - Special edition sets
  - Card trading marketplace?
- **Human-Bob Pairing**: Human designs card system/art direction, Bob implements collection mechanics

### 19. Implement Question Validation & Quality Control System - priority fix
- **Current State**: 
  - Rare incorrect questions in database
  - AI knowledge cutoff causes outdated info
  - Some chaos questions too obscure
  - Generation is cheap (<$0.01) but unchecked
- **Need**: Quality control system for question accuracy
- **Validation Strategies**:
  - Slow generation + validation pass
  - AI double-checks existing questions
  - Flag system for player reports
  - Periodic review of old questions
  - Current events verification
- **Question Handling Options**:
  - **Incorrect**: Remove from pool
  - **Super Hard**: Mark as bonus (3x points?)
  - **Needs Context**: Add explanation bubble
  - **Outdated**: Update or retire
  - **Chaos Creative**: Add "chaos logic" indicator
- **Implementation Features**:
  - Report button on quiz interface
  - Admin review dashboard
  - Automated validation runs
  - Rationale system for weird answers
  - "Last verified" timestamps
  - Player voting on difficulty?
- **Special Considerations**:
  - AI training data lag (3-6 months for Claude, possibly longer for Haiku)
  - Check Haiku's actual knowledge cutoff date
  - Current events questions need updates
  - Chaos mode gets more leeway
  - Educational value vs accuracy
  - Consider upgrading to newer model for current events categories only?
- **Human-Bob Pairing**: Human reviews flagged questions, Bob implements validation system

### 20. Implement PWA Subscription System
- **Current State**: 
  - PWA works perfectly (better than app store!)
  - No subscription integration
- **Need**: Web-based subscription without app stores
- **Implementation Options**:
  - **Stripe** (most flexible, good PWA support)
  - **PayPal subscriptions**
  - **Web Payments API** (emerging standard)
  - **Crypto/Web3** (if targeting that audience)
- **Subscription Management**:
  - Account creation/login (expand Google auth)
  - Payment processing on web
  - Subscription status API
  - Grace periods for failed payments
  - Restore purchases across devices
- **Technical Considerations**:
  - Store subscription status in backend
  - Sync across devices via account
  - Offline grace period
  - Receipt validation
  - Webhook handling for status changes
- **Benefits of Web Subscriptions**:
  - No app store 30% cut!
  - Instant updates
  - Full control over pricing
  - A/B test pricing easily
  - No app review delays
- **Human-Bob Pairing**: Human handles payment provider setup, Bob implements integration

---

*More tasks to be added below...*
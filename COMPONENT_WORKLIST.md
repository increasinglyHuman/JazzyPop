# JazzyPop Component Worklist & Asset Requirements

## 📱 View/Page State Model

### Navigation Structure
```
Bottom Navigation (Mobile Primary)
├── 🏠 Home (Dashboard)
├── 📊 Progress (Analytics)  
├── 🏆 Leagues (Competition)
├── 👥 Friends (Social)
└── 👤 Profile (Settings)

Top Navigation (Desktop Secondary)
├── Logo/Brand
├── Stats Bar (Persistent)
└── Settings/Mode Toggle
```

### Page State Management
```javascript
// src/core/ViewStateManager.js
class ViewStateManager {
    views = {
        home: { icon: '🏠', component: 'HomePage', preload: true },
        progress: { icon: '📊', component: 'ProgressPage', preload: false },
        leagues: { icon: '🏆', component: 'LeaguesPage', preload: false },
        friends: { icon: '👥', component: 'FriendsPage', preload: false },
        profile: { icon: '👤', component: 'ProfilePage', preload: false }
    };
    
    currentView = 'home';
    viewStack = ['home']; // For back navigation
    cachedViews = new Map();
}
```

## 🎨 Complete Component Worklist

### 1. Core UI Components

#### Navigation Components
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| BottomNav | 🔴 TODO | Home, Progress, Leagues, Friends, Profile | - | Active state, badges, responsive |
| TopHeader | 🔴 TODO | Logo, Settings, Mode Toggle | JazzyPop logo | Sticky, transparent options |
| BackButton | 🔴 TODO | Back arrow, Close X | - | Stack-aware navigation |

#### Display Components
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| StatsBar | 🟡 PARTIAL | 🔥⚡💎❤️ | - | Real-time updates, animations |
| ProgressRing | 🔴 TODO | - | - | SVG animation, percentage |
| AchievementToast | 🔴 TODO | 🏆🎯🌟✨ | - | Queue system, auto-dismiss |
| Modal | 🔴 TODO | ❌✓⚠️ℹ️ | - | Backdrop, animations, sizes |
| LoadingSpinner | 🔴 TODO | - | Loading animation | Skeleton screens |

### 2. Quiz Components

#### Question Types
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| MCQQuestion | 🟡 PARTIAL | ○●✓✗ | - | Radio buttons, selection state |
| FIBQuestion | 🟡 PARTIAL | - | - | Input validation, hints |
| TrueFalseQuestion | 🔴 TODO | ✓✗👍👎 | - | Toggle animation |
| OrderingQuestion | 🔴 TODO | ↑↓⇅ | - | Drag and drop |
| MatchingQuestion | 🔴 TODO | 🔗 | - | Line drawing |

#### Quiz UI
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| QuizTimer | 🔴 TODO | ⏱️⏰🕐 | - | Countdown, warnings |
| QuizProgress | 🟡 PARTIAL | - | Progress bar | Step indicator |
| QuestionCard | 🟡 PARTIAL | - | Card backgrounds | Flip animation |
| AnswerFeedback | 🔴 TODO | ✓✗💯😢 | Celebration GIF | Success/fail states |

### 3. Gamification Components

#### Core Systems
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| HeartSystem | 🟡 PARTIAL | ❤️💔💕🛡️ | - | Regen timer, purchase UI |
| XPManager | 🔴 TODO | ⚡⬆️📈 | Level up animation | Progress calculation |
| GemWallet | 🔴 TODO | 💎💰🪙 | Gem sparkle | Transaction history |
| StreakTracker | 🔴 TODO | 🔥📅✨ | Flame animation | Calendar view |

#### Visual Feedback
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| LevelUpModal | 🔴 TODO | ⭐🎉🆙 | Confetti, badge | Rewards display |
| StreakCelebration | 🔴 TODO | 🔥🎊 | Fire effect | Milestone alerts |
| ComboIndicator | 🔴 TODO | 🔢x2️⃣x3️⃣ | - | Multiplier display |

### 4. Mode Components

#### Game Modes
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| NormalMode | ✅ DONE | 📚 | - | Default styling |
| ChaosMode | 🟡 PARTIAL | 🌪️😈🎲 | Glitch effects | Visual chaos system |
| ZenMode | 🔴 TODO | 🧘☮️🕉️ | Calm backgrounds | No timers, relaxed |
| SpeedMode | 🔴 TODO | ⚡🏃💨 | Speed lines | Quick transitions |

#### Mode Effects
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| ChaosParticles | 🟡 PARTIAL | ✨💫⚡ | - | Random movement |
| GlitchText | 🔴 TODO | - | Glitch overlay | Text distortion |
| ModeTransition | 🔴 TODO | - | Transition effects | Smooth switching |

### 5. Social Components

#### Friends System
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| FriendsList | 🔴 TODO | 👤➕🗑️ | Default avatars | Search, sort |
| FriendCard | 🔴 TODO | 🏆🔥💎 | Avatar frames | Stats display |
| ChallengeButton | 🔴 TODO | ⚔️🎯 | VS graphic | Send/accept |
| LeaderboardRow | 🔴 TODO | 🥇🥈🥉 | Medal graphics | Rank changes |

#### Communication
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| GiftHeart | 🔴 TODO | ❤️🎁➡️ | Gift animation | Daily limits |
| Nudge | 🔴 TODO | 👋💬 | Poke animation | Cooldown system |
| ShareResult | 🔴 TODO | 📤📱💬 | Social logos | Platform integration |

### 6. Progress Components

#### Analytics
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| ProgressChart | 🔴 TODO | 📊📈📉 | - | D3.js/Chart.js |
| HeatmapCalendar | 🔴 TODO | 📅🟩🟨 | - | Activity tracking |
| TopicMastery | 🔴 TODO | 🎯💯📚 | Subject icons | Skill trees |
| TimeAnalysis | 🔴 TODO | ⏱️📊 | - | Best times data |

#### Achievements
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| AchievementGrid | 🔴 TODO | 🏆🎖️🏅 | Badge designs (50+) | Categories, rarity |
| AchievementCard | 🔴 TODO | 🔒✓⭐ | Badge backgrounds | Progress bars |
| MilestoneTracker | 🔴 TODO | 🎯📍🚩 | Milestone graphics | Timeline view |

### 7. Settings Components

#### User Preferences
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| ThemeSelector | 🔴 TODO | 🎨🌙☀️ | Theme previews | Live preview |
| SoundToggle | 🔴 TODO | 🔊🔇🎵 | - | Volume slider |
| NotificationPrefs | 🔴 TODO | 🔔🔕📧 | - | Channel selection |
| LanguageSelector | 🔴 TODO | 🌐🗣️ | Flag icons | RTL support |

#### Account Management
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| ProfileEditor | 🔴 TODO | 📷✏️ | Avatar options | Image upload |
| AccountLink | 🔴 TODO | 🔗📚 | Platform logos | OAuth flow |
| DataExport | 🔴 TODO | 📥💾 | - | GDPR compliance |

### 8. Shop Components

#### Store UI
| Component | Status | Icons Needed | Images Needed | Requirements |
|-----------|--------|--------------|---------------|--------------|
| ShopGrid | 🔴 TODO | 🛍️💎 | Item previews | Categories |
| ItemCard | 🔴 TODO | 🏷️✨ | Item graphics | Rarity indicators |
| PurchaseModal | 🔴 TODO | 💳💎 | Payment icons | Confirmation flow |
| PowerUpShelf | 🔴 TODO | ⚡🛡️⏭️ | Power-up icons | Quick buy |

## 🎨 Asset Generation Requirements

### Icons Needed (Priority Order)
1. **Core Navigation**: Home, Progress, Leagues, Friends, Profile variations
2. **Gamification**: Hearts (full/empty/breaking), Gems, XP lightning
3. **Quiz States**: Correct, Wrong, Skip, Hint
4. **Achievements**: 50+ unique achievement badges
5. **Power-ups**: Shield, Skip, 50/50, Time Freeze, Double XP

### Images to Generate
1. **Characters/Mascots**
   - JazzyPop mascot (main character)
   - Emotion states: Happy, Sad, Excited, Thinking, Celebrating
   - Chaos mode character variant
   
2. **Backgrounds**
   - Dashboard gradient backgrounds (4 themes)
   - Quiz mode backgrounds
   - Celebration/completion screens
   - League tier backgrounds
   
3. **Effects/Animations**
   - Confetti sprite sheet
   - Fire/streak animation frames
   - Gem sparkle effect
   - Level up burst
   - Glitch effect overlays
   
4. **UI Elements**
   - Progress ring segments
   - Quiz card textures
   - Button states (normal, hover, active, disabled)
   - Modal backgrounds
   - Achievement badge frames (common, rare, epic, legendary)

### SVG Requirements
1. **Logo**: JazzyPop logo (scalable)
2. **Shapes**: Progress rings, badges, ribbons
3. **Icons**: All UI icons as SVG for scaling
4. **Patterns**: Background patterns for cards

### Animation Requirements
1. **Micro-animations**
   - Button press effects
   - Card flip animations
   - Number count-ups
   - Progress bar fills
   
2. **Celebration Animations**
   - Confetti burst
   - Star explosion
   - Streak fire growth
   - Achievement unlock
   
3. **Transition Animations**
   - Page transitions
   - Mode switching effects
   - Quiz question transitions
   - Modal appear/disappear

## 📋 Implementation Priority

### Phase 1: Core Experience (Week 1-2)
- [ ] ViewStateManager
- [ ] Navigation components
- [ ] Basic quiz components
- [ ] Heart system UI
- [ ] Stats display

### Phase 2: Gamification (Week 3-4)
- [ ] XP/Level system
- [ ] Achievements UI
- [ ] Streak visualization
- [ ] Shop basics
- [ ] Chaos mode effects

### Phase 3: Social & Progress (Week 5-6)
- [ ] Friends system
- [ ] Leagues UI
- [ ] Progress charts
- [ ] Share functionality
- [ ] Leaderboards

### Phase 4: Polish (Week 7-8)
- [ ] All animations
- [ ] Sound effects
- [ ] Theme system
- [ ] Settings pages
- [ ] Tutorial flow
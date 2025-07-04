/**
 * Card Template System
 * Pre-designed card layouts for common announcement types
 */

class CardTemplates {
    static templates = {
        // Quiz announcement templates
        quiz: {
            tease: (data) => ({
                theme: 'gradient',
                layout: 'vertical',
                data: {
                    header: {
                        icon: data.icon || '✨',
                        title: data.title || 'Something New is Coming!',
                        badges: [
                            { text: 'NEW', type: 'highlight', animated: true },
                            data.topic && { text: data.topic, type: 'category' }
                        ].filter(Boolean)
                    },
                    body: {
                        description: data.teaser || 'Get ready for an exciting new challenge!',
                        highlights: data.highlights || [
                            { text: 'Coming Soon', type: 'info' }
                        ]
                    },
                    media: data.preview && {
                        type: 'icon-grid',
                        src: data.preview // Array of preview icons/emojis
                    },
                    actions: {
                        primary: { 
                            text: data.actionText || 'Get Notified', 
                            action: 'notify-me',
                            icon: '🔔'
                        }
                    }
                }
            }),

            quest: (data) => ({
                theme: 'quest',
                layout: 'vertical',
                data: {
                    header: {
                        icon: data.icon || '🗺️',
                        title: data.title,
                        badges: [
                            { text: `Part ${data.part}/${data.totalParts}`, type: 'progress' },
                            data.difficulty && { text: data.difficulty, type: 'difficulty' }
                        ].filter(Boolean)
                    },
                    body: {
                        description: data.description,
                        progress: data.progress && {
                            type: 'bar',
                            value: data.progress.current,
                            max: data.progress.total,
                            text: `${data.progress.current}/${data.progress.total} completed`
                        },
                        list: data.objectives && data.objectives.map(obj => ({
                            text: obj.text,
                            done: obj.completed
                        }))
                    },
                    stats: [
                        data.xp && { icon: '⚡', value: data.xp, label: 'XP' },
                        data.gems && { icon: '💎', value: data.gems, label: 'Gems' },
                        data.bonus && { icon: '🎁', value: data.bonus, label: 'Bonus' }
                    ].filter(Boolean),
                    actions: {
                        primary: { 
                            text: data.completed ? 'Claim Rewards' : 'Continue Quest', 
                            action: 'launch-quest'
                        }
                    }
                }
            }),

            timeBased: (data) => ({
                theme: 'urgent',
                layout: 'vertical',
                data: {
                    header: {
                        icon: data.icon || '⏰',
                        title: data.title,
                        badges: [
                            { 
                                text: this.formatTimeRemaining(data.endTime), 
                                type: 'timer',
                                icon: '⏱'
                            }
                        ]
                    },
                    body: {
                        description: data.description,
                        highlights: [
                            { text: `${data.multiplier}x Points`, type: 'reward' },
                            { text: 'Limited Time', type: 'warning' }
                        ]
                    },
                    stats: data.participants && [
                        { icon: '👥', value: data.participants, label: 'playing' }
                    ],
                    actions: {
                        primary: { 
                            text: 'Play Now', 
                            action: 'launch-timed',
                            icon: '🚀'
                        }
                    }
                }
            }),

            promo: (data) => ({
                theme: 'special',
                layout: 'vertical',
                data: {
                    media: data.banner && {
                        type: 'image',
                        src: data.banner
                    },
                    header: {
                        icon: data.icon || '🎊',
                        title: data.title,
                        badges: data.badges || [
                            { text: 'SPECIAL EVENT', type: 'special', animated: true }
                        ]
                    },
                    body: {
                        description: data.description,
                        highlights: data.rewards && data.rewards.map(reward => ({
                            text: reward,
                            type: 'reward'
                        }))
                    },
                    actions: {
                        secondary: data.learnMore && { 
                            text: 'Learn More', 
                            action: 'info' 
                        },
                        primary: { 
                            text: data.actionText || 'Join Event', 
                            action: 'launch-promo'
                        }
                    }
                }
            })
        },

        // Competition templates
        competition: {
            tournament: (data) => ({
                theme: 'competition',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '🏆',
                        title: data.title,
                        badges: [
                            { text: data.league, type: 'league' },
                            { text: `${data.prize}`, type: 'prize', icon: '🎁' }
                        ]
                    },
                    body: {
                        description: data.description,
                        highlights: [
                            { text: `Top ${data.winners} win`, type: 'info' }
                        ]
                    },
                    stats: [
                        { icon: '👥', value: data.participants, label: 'competing' },
                        { icon: '⏰', value: this.formatTimeRemaining(data.endTime), label: 'left' }
                    ],
                    actions: {
                        primary: { text: 'Join Tournament', action: 'join-tournament' }
                    }
                }
            }),

            daily: (data) => ({
                theme: 'daily',
                layout: 'compact',
                data: {
                    header: {
                        icon: '📅',
                        title: 'Daily Challenge',
                        meta: data.date
                    },
                    body: {
                        description: data.challenge,
                        progress: data.completed && {
                            type: 'circular',
                            value: 100
                        }
                    },
                    stats: [
                        { icon: '🔥', value: data.streak, label: 'streak' }
                    ],
                    actions: {
                        primary: { 
                            text: data.completed ? '✓ Completed' : 'Start', 
                            action: 'daily-challenge' 
                        }
                    }
                }
            })
        },

        // Announcement templates
        announcement: {
            feature: (data) => ({
                theme: 'minimal',
                layout: 'vertical',
                data: {
                    header: {
                        icon: data.icon || '🆕',
                        title: data.title,
                        badges: [{ text: 'NEW FEATURE', type: 'highlight' }]
                    },
                    body: {
                        description: data.description,
                        list: data.features && data.features.map(f => ({ text: f }))
                    },
                    actions: data.tryIt && {
                        primary: { text: 'Try It', action: 'try-feature' }
                    }
                }
            }),

            maintenance: (data) => ({
                theme: 'warning',
                layout: 'horizontal',
                data: {
                    header: {
                        icon: '🔧',
                        title: 'Scheduled Maintenance',
                        meta: data.date
                    },
                    body: {
                        description: `Service will be unavailable from ${data.startTime} to ${data.endTime}`
                    }
                }
            }),

            celebration: (data) => ({
                theme: 'celebration',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '🎉',
                        title: data.title
                    },
                    body: {
                        description: data.message,
                        highlights: data.stats && data.stats.map(stat => ({
                            text: stat,
                            type: 'success'
                        }))
                    },
                    actions: data.action && {
                        primary: { text: data.action.text, action: data.action.type }
                    }
                }
            })
        },

        // Gamification templates
        gamification: {
            streak: (data) => ({
                theme: 'streak',
                layout: 'horizontal',
                data: {
                    header: {
                        icon: data.streakEmoji || this.getStreakEmoji(data.days),
                        title: `${data.days} Day Streak!`,
                        badges: data.milestone && [
                            { text: 'MILESTONE', type: 'special', animated: true }
                        ]
                    },
                    body: {
                        description: data.message || this.getStreakMessage(data.days),
                        highlights: [
                            { text: `${data.bonus || data.days * 10} Bonus XP`, type: 'reward' }
                        ]
                    },
                    stats: [
                        { icon: '📅', value: data.days, label: 'days' },
                        { icon: '🎯', value: data.nextMilestone, label: 'next goal' }
                    ],
                    actions: {
                        primary: { 
                            text: data.cta || 'Keep it going!', 
                            action: 'continue-streak' 
                        }
                    }
                }
            }),

            unlock: (data) => ({
                theme: 'unlock',
                layout: 'vertical',
                data: {
                    media: data.image && {
                        type: 'image',
                        src: data.image
                    },
                    header: {
                        icon: '🔓',
                        title: 'New Unlock!',
                        badges: [
                            { text: data.type.toUpperCase(), type: 'highlight' }
                        ]
                    },
                    body: {
                        title: data.unlockedItem,
                        description: data.description,
                        highlights: data.benefits && data.benefits.map(benefit => ({
                            text: benefit,
                            type: 'success'
                        }))
                    },
                    actions: {
                        secondary: { text: 'Later', action: 'dismiss' },
                        primary: { 
                            text: data.actionText || 'Check it out!', 
                            action: `view-${data.type}` 
                        }
                    }
                }
            }),

            achievement: (data) => ({
                theme: 'achievement',
                layout: 'vertical',
                data: {
                    header: {
                        icon: data.icon || '🏆',
                        title: 'Achievement Unlocked!',
                        badges: [
                            { text: data.rarity || 'RARE', type: data.rarityType || 'special' }
                        ]
                    },
                    body: {
                        title: data.name,
                        description: data.description,
                        progress: data.progress && {
                            type: 'bar',
                            value: 100,
                            text: 'Completed!'
                        }
                    },
                    stats: data.rewards && data.rewards.map(reward => ({
                        icon: reward.icon,
                        value: reward.value,
                        label: reward.type
                    })),
                    actions: {
                        primary: { text: 'Claim Rewards', action: 'claim-achievement' }
                    }
                }
            }),

            levelUp: (data) => ({
                theme: 'level-up',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '🎊',
                        title: `Level ${data.newLevel}!`,
                        badges: [
                            { text: 'LEVEL UP', type: 'special', animated: true }
                        ]
                    },
                    body: {
                        description: `Congratulations! You've reached level ${data.newLevel}!`,
                        highlights: data.unlocks && data.unlocks.map(unlock => ({
                            text: `Unlocked: ${unlock}`,
                            type: 'success'
                        }))
                    },
                    stats: [
                        { icon: '⚡', value: data.totalXP, label: 'Total XP' },
                        { icon: '📈', value: data.nextLevelXP, label: 'Next Level' }
                    ],
                    actions: {
                        primary: { text: 'View Rewards', action: 'view-level-rewards' }
                    }
                }
            })
        },

        // Social templates
        social: {
            leaderboard: (data) => ({
                theme: 'leaderboard',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '🏅',
                        title: data.title || 'Leaderboard Update',
                        meta: data.timeframe || 'This Week'
                    },
                    body: {
                        description: data.message || this.getLeaderboardMessage(data.rank, data.previousRank),
                        list: data.topPlayers && data.topPlayers.slice(0, 3).map((player, index) => ({
                            text: `${this.getRankEmoji(index + 1)} ${player.name} - ${player.score}`,
                            done: player.id === data.currentUserId
                        }))
                    },
                    stats: [
                        { icon: '📊', value: `#${data.rank}`, label: 'Your Rank' },
                        { icon: data.rankChange > 0 ? '📈' : '📉', value: `${data.rankChange > 0 ? '+' : ''}${data.rankChange}`, label: 'Change' }
                    ],
                    actions: {
                        primary: { text: 'View Full Leaderboard', action: 'open-leaderboard' }
                    }
                }
            }),

            friend: (data) => ({
                theme: 'social',
                layout: 'horizontal',
                data: {
                    header: {
                        icon: data.friendAvatar || '👤',
                        title: data.friendName,
                        badges: data.mutual && [
                            { text: `${data.mutual} mutual friends`, type: 'info' }
                        ]
                    },
                    body: {
                        description: data.message || `${data.friendName} wants to be friends!`,
                        highlights: data.stats && [
                            { text: `Level ${data.stats.level}`, type: 'info' },
                            { text: `${data.stats.quizzes} quizzes`, type: 'info' }
                        ]
                    },
                    actions: {
                        secondary: { text: 'Ignore', action: 'ignore-friend' },
                        primary: { text: 'Add Friend', action: 'accept-friend' }
                    }
                }
            }),

            challenge: (data) => ({
                theme: 'challenge',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '⚔️',
                        title: 'Challenge Received!',
                        badges: [
                            { text: 'PVP', type: 'battle' }
                        ]
                    },
                    body: {
                        description: `${data.challenger} challenges you to ${data.gameType}!`,
                        highlights: [
                            { text: `Wager: ${data.wager} gems`, type: 'warning' }
                        ]
                    },
                    stats: [
                        { icon: '🏆', value: data.challengerWins, label: 'Their Wins' },
                        { icon: '⏰', value: this.formatTimeRemaining(data.expiresAt), label: 'Expires' }
                    ],
                    actions: {
                        secondary: { text: 'Decline', action: 'decline-challenge' },
                        primary: { text: 'Accept Challenge', action: 'accept-challenge' }
                    }
                }
            })
        },

        // Merchandise templates
        merchandise: {
            product: (data) => ({
                theme: 'shop',
                layout: 'vertical',
                data: {
                    media: {
                        type: 'image',
                        src: data.image
                    },
                    header: {
                        title: data.name,
                        badges: data.sale && [
                            { text: `${data.sale}% OFF`, type: 'sale' }
                        ]
                    },
                    body: {
                        description: data.description
                    },
                    stats: [
                        { icon: '💰', value: data.price, label: data.currency || 'USD' }
                    ],
                    actions: {
                        primary: { text: 'View Item', action: 'open-shop' }
                    }
                }
            }),

            bundle: (data) => ({
                theme: 'special',
                layout: 'vertical',
                data: {
                    header: {
                        icon: '🎁',
                        title: data.title,
                        badges: [
                            { text: 'BUNDLE', type: 'special' },
                            { text: `Save ${data.savings}`, type: 'sale' }
                        ]
                    },
                    body: {
                        description: data.description,
                        list: data.items.map(item => ({ text: item }))
                    },
                    stats: [
                        { value: data.originalPrice, label: 'Was', icon: '❌' },
                        { value: data.bundlePrice, label: 'Now', icon: '✅' }
                    ],
                    actions: {
                        primary: { text: 'Get Bundle', action: 'purchase-bundle' }
                    }
                }
            })
        }
    };

    static formatTimeRemaining(endTime) {
        const now = Date.now();
        const diff = endTime - now;
        
        if (diff <= 0) return 'Ended';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    static getStreakEmoji(days) {
        if (days >= 365) return '💎';
        if (days >= 100) return '💯';
        if (days >= 50) return '🔥';
        if (days >= 30) return '⭐';
        if (days >= 7) return '🌟';
        return '✨';
    }

    static getStreakMessage(days) {
        const messages = {
            1: "Great start! Keep it up!",
            3: "3 days strong! You're building a habit!",
            7: "A full week! You're on fire!",
            14: "Two weeks! You're unstoppable!",
            30: "30 days! You've earned streak master status!",
            100: "100 days! You're a legend!",
            365: "One full year! You're incredible!"
        };
        
        return messages[days] || `Amazing ${days} day streak! Keep going!`;
    }

    static getLeaderboardMessage(rank, previousRank) {
        if (!previousRank) return `You're currently ranked #${rank}!`;
        
        const change = previousRank - rank;
        if (change > 0) {
            return `You climbed ${change} spots to #${rank}! 🚀`;
        } else if (change < 0) {
            return `You dropped ${Math.abs(change)} spots to #${rank}. Time to climb back!`;
        } else {
            return `You're holding steady at #${rank}!`;
        }
    }

    static getRankEmoji(rank) {
        const emojis = {
            1: '🥇',
            2: '🥈',
            3: '🥉'
        };
        return emojis[rank] || `${rank}.`;
    }

    static create(type, subtype, data) {
        const template = this.templates[type]?.[subtype];
        if (!template) {
            console.warn(`Template not found: ${type}.${subtype}`);
            return null;
        }
        
        return template(data);
    }
}

// Usage examples:
/*
// Create a new topic teaser
const teaserCard = new GenericCard({
    id: 'teaser-001',
    component: 'QuizEngine',
    ...CardTemplates.create('quiz', 'tease', {
        title: 'Mystery Topic Unlocking Soon!',
        teaser: 'Can you guess what\'s coming next?',
        preview: ['🌍', '🗺️', '🧭', '📍'],
        topic: 'Geography'
    })
});

// Create a quest card
const questCard = new GenericCard({
    id: 'quest-001',
    component: 'QuizEngine',
    ...CardTemplates.create('quiz', 'quest', {
        title: 'The Grammar Gauntlet',
        description: 'Master the mysteries of proper punctuation',
        part: 3,
        totalParts: 5,
        progress: { current: 2, total: 5 },
        objectives: [
            { text: 'Complete comma basics', completed: true },
            { text: 'Master semicolons', completed: true },
            { text: 'Conquer colons', completed: false }
        ],
        xp: 150,
        gems: 20
    })
});

// Create a time-based challenge
const timedCard = new GenericCard({
    id: 'timed-001',
    component: 'QuizEngine',
    ...CardTemplates.create('quiz', 'timeBased', {
        title: 'Midnight Madness',
        description: 'Double points for the next 2 hours!',
        endTime: Date.now() + (2 * 60 * 60 * 1000),
        multiplier: 2,
        participants: 1337
    })
});
*/

window.CardTemplates = CardTemplates;
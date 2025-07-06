"""
Player Feedback System for JazzyPop
Handles player feedback, gamification, and community-driven quality control
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import json
from database import db

logger = logging.getLogger(__name__)

class PlayerFeedbackSystem:
    """Manages player feedback and gamification"""
    
    # Feedback types and their point values
    FEEDBACK_REWARDS = {
        'thumbs_up': 5,
        'thumbs_down': 5,
        'difficulty': 10,
        'flag': 20,
        'emote': 3
    }
    
    # Emote reactions available
    AVAILABLE_EMOTES = {
        'love': '❤️',
        'laugh': '😂',
        'mind_blown': '🤯',
        'confused': '😕',
        'fire': '🔥',
        'boring': '😴',
        'more': '➕',
        'less': '➖'
    }
    
    # Flag reasons
    FLAG_REASONS = {
        'wrong_answer': 'The marked correct answer is wrong',
        'outdated': 'Information is outdated or no longer accurate',
        'offensive': 'Content is offensive or inappropriate',
        'unclear': 'Question is unclear or ambiguous',
        'multiple_correct': 'Multiple answers could be correct',
        'typo': 'Contains spelling or grammar errors',
        'other': 'Other issue (please specify)'
    }
    
    # Achievements for feedback
    FEEDBACK_ACHIEVEMENTS = {
        'first_feedback': {'name': 'Quality Controller', 'points': 50, 'icon': '🎖️'},
        'feedback_streak_7': {'name': 'Dedicated Reviewer', 'points': 100, 'icon': '🏆'},
        'feedback_count_50': {'name': 'Community Guardian', 'points': 200, 'icon': '🛡️'},
        'feedback_count_100': {'name': 'Quiz Master', 'points': 500, 'icon': '👑'},
        'accurate_flag': {'name': 'Eagle Eye', 'points': 150, 'icon': '🦅'},
        'helpful_feedback': {'name': 'Helpful Hero', 'points': 100, 'icon': '🦸'}
    }
    
    async def submit_feedback(self, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit player feedback for a quiz
        Returns rewards and achievement info
        """
        try:
            # Validate feedback data
            content_id = feedback_data.get('content_id')
            user_id = feedback_data.get('user_id')
            session_id = feedback_data.get('session_id')
            feedback_type = feedback_data.get('feedback_type')
            
            if not content_id or not feedback_type:
                return {'error': 'Missing required fields'}
            
            if feedback_type not in self.FEEDBACK_REWARDS:
                return {'error': f'Invalid feedback type: {feedback_type}'}
            
            # Check for duplicate feedback (prevent spam)
            is_duplicate = await self._check_duplicate_feedback(
                content_id, user_id, session_id, feedback_type
            )
            if is_duplicate:
                return {'error': 'You have already provided this feedback'}
            
            # Process specific feedback types
            feedback_id = uuid4()
            feedback_record = {
                'id': feedback_id,
                'content_id': content_id,
                'user_id': user_id,
                'session_id': session_id,
                'feedback_type': feedback_type,
                'feedback_data': {}
            }
            
            if feedback_type == 'flag':
                reason = feedback_data.get('reason')
                details = feedback_data.get('details', '')
                if reason not in self.FLAG_REASONS:
                    return {'error': 'Invalid flag reason'}
                feedback_record['feedback_data'] = {
                    'reason': reason,
                    'details': details
                }
                
            elif feedback_type == 'difficulty':
                rating = feedback_data.get('rating')
                if not isinstance(rating, int) or rating < 1 or rating > 5:
                    return {'error': 'Difficulty rating must be 1-5'}
                feedback_record['feedback_data'] = {'rating': rating}
                
            elif feedback_type == 'emote':
                emote = feedback_data.get('emote')
                if emote not in self.AVAILABLE_EMOTES:
                    return {'error': 'Invalid emote'}
                feedback_record['feedback_data'] = {'emote': emote}
            
            # Save feedback to database
            await self._save_feedback(feedback_record)
            
            # Update aggregates
            await self._update_feedback_aggregates(content_id, feedback_type, feedback_record['feedback_data'])
            
            # Calculate rewards
            points_earned = self.FEEDBACK_REWARDS[feedback_type]
            achievements = []
            
            # Check for achievements
            if user_id:
                achievements = await self._check_feedback_achievements(user_id, feedback_type)
                
                # Award points
                await self._award_feedback_points(user_id, points_earned)
            
            # Check if content needs review (too many flags)
            if feedback_type == 'flag':
                await self._check_content_review_needed(content_id)
            
            return {
                'success': True,
                'feedback_id': str(feedback_id),
                'points_earned': points_earned,
                'achievements': achievements,
                'message': self._get_feedback_message(feedback_type)
            }
            
        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            return {'error': 'Failed to submit feedback'}
    
    async def get_content_feedback_summary(self, content_id: UUID) -> Dict[str, Any]:
        """Get aggregated feedback for a piece of content"""
        async with db.pool.acquire() as conn:
            # Get aggregated data
            aggregate = await conn.fetchrow("""
                SELECT * FROM feedback_aggregates
                WHERE content_id = $1
            """, content_id)
            
            if not aggregate:
                return {
                    'content_id': str(content_id),
                    'thumbs_up': 0,
                    'thumbs_down': 0,
                    'flags': 0,
                    'difficulty_average': 3.0,
                    'emotes': {}
                }
            
            # Calculate difficulty average
            difficulty_votes = json.loads(aggregate['difficulty_votes'])
            total_votes = sum(difficulty_votes.values())
            difficulty_avg = 3.0
            if total_votes > 0:
                weighted_sum = sum(int(rating) * count for rating, count in difficulty_votes.items())
                difficulty_avg = weighted_sum / total_votes
            
            return {
                'content_id': str(content_id),
                'thumbs_up': aggregate['thumbs_up_count'],
                'thumbs_down': aggregate['thumbs_down_count'],
                'flags': aggregate['flag_count'],
                'difficulty_average': round(difficulty_avg, 2),
                'difficulty_votes': difficulty_votes,
                'emotes': json.loads(aggregate['emote_counts']),
                'last_updated': aggregate['last_updated'].isoformat()
            }
    
    async def get_user_feedback_stats(self, user_id: UUID) -> Dict[str, Any]:
        """Get a user's feedback statistics and achievements"""
        async with db.pool.acquire() as conn:
            # Get feedback counts
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_feedback,
                    COUNT(*) FILTER (WHERE feedback_type = 'flag') as flags_submitted,
                    COUNT(*) FILTER (WHERE feedback_type = 'thumbs_up') as thumbs_up,
                    COUNT(*) FILTER (WHERE feedback_type = 'thumbs_down') as thumbs_down,
                    COUNT(DISTINCT DATE(created_at)) as active_days
                FROM player_feedback
                WHERE user_id = $1
            """, user_id)
            
            # Get user's feedback points (stored in user progress)
            progress = await conn.fetchrow("""
                SELECT stats FROM user_progress
                WHERE user_id = $1 AND content_type = 'feedback'
            """, user_id)
            
            feedback_stats = json.loads(progress['stats']) if progress else {}
            
            return {
                'user_id': str(user_id),
                'total_feedback': stats['total_feedback'] or 0,
                'flags_submitted': stats['flags_submitted'] or 0,
                'thumbs_up': stats['thumbs_up'] or 0,
                'thumbs_down': stats['thumbs_down'] or 0,
                'active_days': stats['active_days'] or 0,
                'total_points': feedback_stats.get('total_points', 0),
                'achievements': feedback_stats.get('achievements', []),
                'current_streak': feedback_stats.get('current_streak', 0)
            }
    
    async def _check_duplicate_feedback(self, content_id: UUID, user_id: Optional[UUID], 
                                      session_id: Optional[str], feedback_type: str) -> bool:
        """Check if user already submitted this type of feedback"""
        async with db.pool.acquire() as conn:
            # Check by user_id or session_id
            if user_id:
                exists = await conn.fetchval("""
                    SELECT EXISTS(
                        SELECT 1 FROM player_feedback
                        WHERE content_id = $1 AND user_id = $2 AND feedback_type = $3
                    )
                """, content_id, user_id, feedback_type)
            elif session_id:
                exists = await conn.fetchval("""
                    SELECT EXISTS(
                        SELECT 1 FROM player_feedback
                        WHERE content_id = $1 AND session_id = $2 AND feedback_type = $3
                    )
                """, content_id, session_id, feedback_type)
            else:
                exists = False
            
            return exists
    
    async def _save_feedback(self, feedback_record: Dict[str, Any]):
        """Save feedback to database"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO player_feedback (id, content_id, user_id, session_id, 
                                           feedback_type, feedback_data, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, feedback_record['id'], feedback_record['content_id'],
                feedback_record.get('user_id'), feedback_record.get('session_id'),
                feedback_record['feedback_type'], json.dumps(feedback_record['feedback_data']),
                datetime.utcnow())
    
    async def _update_feedback_aggregates(self, content_id: UUID, feedback_type: str, 
                                        feedback_data: Dict[str, Any]):
        """Update aggregated feedback counts"""
        # The trigger handles basic counting, but we need to handle special cases
        async with db.pool.acquire() as conn:
            if feedback_type == 'difficulty':
                rating = feedback_data['rating']
                await conn.execute("""
                    UPDATE feedback_aggregates
                    SET difficulty_votes = jsonb_set(
                        difficulty_votes,
                        $1::text[],
                        (COALESCE((difficulty_votes->>$2)::int, 0) + 1)::text::jsonb
                    ),
                    last_updated = CURRENT_TIMESTAMP
                    WHERE content_id = $3
                """, [str(rating)], str(rating), content_id)
                
            elif feedback_type == 'emote':
                emote = feedback_data['emote']
                await conn.execute("""
                    UPDATE feedback_aggregates
                    SET emote_counts = jsonb_set(
                        emote_counts,
                        $1::text[],
                        (COALESCE((emote_counts->>$2)::int, 0) + 1)::text::jsonb
                    ),
                    last_updated = CURRENT_TIMESTAMP
                    WHERE content_id = $3
                """, [emote], emote, content_id)
    
    async def _check_feedback_achievements(self, user_id: UUID, feedback_type: str) -> List[Dict[str, Any]]:
        """Check if user earned any achievements"""
        achievements = []
        
        async with db.pool.acquire() as conn:
            # Get user's feedback history
            feedback_count = await conn.fetchval("""
                SELECT COUNT(*) FROM player_feedback WHERE user_id = $1
            """, user_id)
            
            # First feedback achievement
            if feedback_count == 1:
                achievements.append(self.FEEDBACK_ACHIEVEMENTS['first_feedback'])
            
            # Count-based achievements
            if feedback_count == 50:
                achievements.append(self.FEEDBACK_ACHIEVEMENTS['feedback_count_50'])
            elif feedback_count == 100:
                achievements.append(self.FEEDBACK_ACHIEVEMENTS['feedback_count_100'])
            
            # Check streak
            streak = await self._calculate_feedback_streak(user_id)
            if streak == 7:
                achievements.append(self.FEEDBACK_ACHIEVEMENTS['feedback_streak_7'])
            
            # Update user achievements
            if achievements:
                await self._save_achievements(user_id, achievements)
        
        return achievements
    
    async def _calculate_feedback_streak(self, user_id: UUID) -> int:
        """Calculate consecutive days of feedback"""
        async with db.pool.acquire() as conn:
            # Get distinct dates of feedback in last 30 days
            dates = await conn.fetch("""
                SELECT DISTINCT DATE(created_at) as feedback_date
                FROM player_feedback
                WHERE user_id = $1 AND created_at > CURRENT_DATE - INTERVAL '30 days'
                ORDER BY feedback_date DESC
            """, user_id)
            
            if not dates:
                return 0
            
            # Check for consecutive days
            streak = 1
            last_date = dates[0]['feedback_date']
            
            for row in dates[1:]:
                current_date = row['feedback_date']
                if (last_date - current_date).days == 1:
                    streak += 1
                    last_date = current_date
                else:
                    break
            
            return streak
    
    async def _award_feedback_points(self, user_id: UUID, points: int):
        """Award points to user for feedback"""
        async with db.pool.acquire() as conn:
            # Update or create user progress record
            await conn.execute("""
                INSERT INTO user_progress (id, user_id, content_type, stats, updated_at)
                VALUES (uuid_generate_v4(), $1, 'feedback', 
                        jsonb_build_object('total_points', $2), CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, content_type) DO UPDATE
                SET stats = jsonb_set(
                    user_progress.stats,
                    '{total_points}',
                    (COALESCE((user_progress.stats->>'total_points')::int, 0) + $2)::text::jsonb
                ),
                updated_at = CURRENT_TIMESTAMP
            """, user_id, points)
    
    async def _save_achievements(self, user_id: UUID, achievements: List[Dict[str, Any]]):
        """Save achievements to user progress"""
        async with db.pool.acquire() as conn:
            # Get current achievements
            current = await conn.fetchrow("""
                SELECT stats FROM user_progress
                WHERE user_id = $1 AND content_type = 'feedback'
            """, user_id)
            
            current_stats = json.loads(current['stats']) if current else {}
            current_achievements = current_stats.get('achievements', [])
            
            # Add new achievements
            for achievement in achievements:
                if not any(a['name'] == achievement['name'] for a in current_achievements):
                    current_achievements.append({
                        'name': achievement['name'],
                        'icon': achievement['icon'],
                        'earned_at': datetime.utcnow().isoformat()
                    })
            
            current_stats['achievements'] = current_achievements
            
            # Update database
            await conn.execute("""
                UPDATE user_progress
                SET stats = $2, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND content_type = 'feedback'
            """, user_id, json.dumps(current_stats))
    
    async def _check_content_review_needed(self, content_id: UUID):
        """Check if content has too many flags and needs review"""
        async with db.pool.acquire() as conn:
            flag_count = await conn.fetchval("""
                SELECT flag_count FROM feedback_aggregates
                WHERE content_id = $1
            """, content_id)
            
            # If more than 5 flags, mark for review
            if flag_count and flag_count > 5:
                await conn.execute("""
                    UPDATE content
                    SET validation_status = 'needs_review',
                        metadata = jsonb_set(
                            COALESCE(metadata, '{}'),
                            '{review_reason}',
                            '"High flag count from players"'
                        )
                    WHERE id = $1
                """, content_id)
                
                logger.warning(f"Content {content_id} flagged for review: {flag_count} flags")
    
    def _get_feedback_message(self, feedback_type: str) -> str:
        """Get encouraging message for feedback submission"""
        messages = {
            'thumbs_up': "Thanks for the positive feedback! 👍",
            'thumbs_down': "Thanks for letting us know! We'll work on improving. 👎",
            'difficulty': "Your difficulty rating helps us balance the game! 🎯",
            'flag': "Thank you for helping maintain quality! We'll review this. 🚩",
            'emote': "Thanks for sharing your reaction! 😊"
        }
        return messages.get(feedback_type, "Thank you for your feedback!")

# Singleton instance
player_feedback_system = PlayerFeedbackSystem()
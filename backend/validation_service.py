"""
Triple Validation Service for JazzyPop
Orchestrates the three-pass validation system for quiz content
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
import aiohttp
from database import db
from validation_prompts import ValidationPrompts
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ValidationService:
    """Orchestrates the triple validation process"""
    
    def __init__(self):
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.discord_webhook = os.getenv('DISCORD_WEBHOOK_URL')
        self.admin_alerts = []
        
    async def validate_quiz_set(self, quiz_set_id: UUID) -> Dict[str, Any]:
        """
        Validate an entire quiz set (10 questions)
        Returns validation summary
        """
        logger.info(f"Starting validation for quiz set: {quiz_set_id}")
        
        # Fetch the quiz set
        quiz_set = await self._fetch_quiz_set(quiz_set_id)
        if not quiz_set:
            return {"error": "Quiz set not found"}
        
        # Validate each question in the set
        validation_results = []
        for idx, question in enumerate(quiz_set['data'].get('questions', [])):
            logger.info(f"Validating question {idx + 1}/10")
            result = await self.validate_single_quiz(question, quiz_set['data'].get('category', 'general'))
            validation_results.append(result)
        
        # Calculate overall set quality
        passed_count = sum(1 for r in validation_results if r['final_decision'] == 'approved')
        set_quality = passed_count / len(validation_results)
        
        # Determine set fate
        if passed_count < 5:
            set_decision = 'rejected'
            await self._send_admin_alert(
                'critical',
                f"Quiz set {quiz_set_id} rejected: Only {passed_count}/10 questions passed validation"
            )
        elif passed_count < 8:
            set_decision = 'needs_revision'
        else:
            set_decision = 'approved'
        
        # Update database
        await self._update_quiz_set_validation(quiz_set_id, {
            'status': set_decision,
            'passed_count': passed_count,
            'quality_score': set_quality,
            'validation_results': validation_results,
            'validated_at': datetime.utcnow().isoformat()
        })
        
        return {
            'quiz_set_id': str(quiz_set_id),
            'decision': set_decision,
            'passed_count': passed_count,
            'quality_score': set_quality,
            'details': validation_results
        }
    
    async def validate_single_quiz(self, quiz_data: Dict[str, Any], category: str) -> Dict[str, Any]:
        """
        Run triple validation on a single quiz question
        """
        validation_results = {}
        
        try:
            # Pass 1: Feedback Generation & Initial Assessment
            logger.info("Running Pass 1: Feedback Generation")
            pass_1_results = await self._run_validation_pass(
                ValidationPrompts.get_pass_1_prompt(quiz_data, category),
                temperature=0.7
            )
            validation_results['pass_1'] = pass_1_results
            
            # Check if Pass 1 found critical issues
            if pass_1_results.get('quality_check', {}).get('needs_revision', False):
                logger.warning("Pass 1 identified issues requiring revision")
            
            # Pass 2: Fact Checking & Verification
            logger.info("Running Pass 2: Fact Checking")
            pass_2_results = await self._run_validation_pass(
                ValidationPrompts.get_pass_2_prompt(quiz_data, pass_1_results),
                temperature=0.3  # Lower temperature for fact checking
            )
            validation_results['pass_2'] = pass_2_results
            
            # Pass 3: Final Quality Control
            logger.info("Running Pass 3: Quality Control")
            pass_3_results = await self._run_validation_pass(
                ValidationPrompts.get_pass_3_prompt(quiz_data, pass_1_results, pass_2_results),
                temperature=0.5
            )
            validation_results['pass_3'] = pass_3_results
            
            # Compile final results
            final_decision = pass_3_results.get('final_decision', 'needs_revision')
            quality_score = pass_3_results.get('quality_score', {}).get('percentage', 0)
            
            # Handle admin alerts
            if pass_3_results.get('admin_alert', {}).get('needed', False):
                await self._send_admin_alert(
                    pass_3_results['admin_alert']['severity'],
                    pass_3_results['admin_alert']['message']
                )
            
            # If revision needed, attempt to revise
            if final_decision == 'needs_revision':
                logger.info("Attempting automatic revision")
                revised_quiz = await self._revise_quiz(quiz_data, validation_results)
                if revised_quiz:
                    # Re-validate the revised version (recursive, but with depth limit)
                    return await self.validate_single_quiz(revised_quiz, category)
            
            return {
                'quiz_data': quiz_data,
                'final_decision': final_decision,
                'quality_score': quality_score,
                'feedback_captions': pass_1_results.get('feedback_captions', {}),
                'difficulty': pass_3_results.get('final_metadata', {}).get('difficulty', 3),
                'tags': pass_3_results.get('final_metadata', {}).get('tags', []),
                'validation_passes': validation_results
            }
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return {
                'quiz_data': quiz_data,
                'final_decision': 'error',
                'error': str(e),
                'validation_passes': validation_results
            }
    
    async def _run_validation_pass(self, prompt: str, temperature: float = 0.7) -> Dict[str, Any]:
        """Execute a single validation pass with the AI"""
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1000,
            "temperature": temperature,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result['content'][0]['text']
                        
                        # Clean the response - AI might add extra text
                        content = content.strip()
                        
                        # Find JSON in the response (between first { and last })
                        json_start = content.find('{')
                        json_end = content.rfind('}') + 1
                        
                        if json_start >= 0 and json_end > json_start:
                            json_content = content[json_start:json_end]
                            try:
                                return json.loads(json_content)
                            except json.JSONDecodeError as e:
                                logger.error(f"JSON decode error: {e}")
                                logger.error(f"Attempted to parse: {json_content[:200]}...")
                                return {"error": "Invalid JSON response from AI"}
                        else:
                            logger.error("No JSON found in AI response")
                            return {"error": "No JSON found in AI response"}
                    else:
                        logger.error(f"API error: {response.status}")
                        return {"error": f"API returned status {response.status}"}
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return {"error": "Invalid JSON response from AI"}
        except Exception as e:
            logger.error(f"Validation pass error: {e}")
            return {"error": str(e)}
    
    async def _revise_quiz(self, quiz_data: Dict[str, Any], validation_results: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Attempt to revise a quiz that failed validation"""
        prompt = ValidationPrompts.get_revision_prompt(quiz_data, validation_results)
        
        try:
            revised = await self._run_validation_pass(prompt, temperature=0.8)
            if 'error' not in revised:
                return revised
        except Exception as e:
            logger.error(f"Revision failed: {e}")
        
        return None
    
    async def _fetch_quiz_set(self, quiz_set_id: UUID) -> Optional[Dict[str, Any]]:
        """Fetch a quiz set from the database"""
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT id, type, data, metadata, validation_status
                FROM content
                WHERE id = $1 AND type = 'quiz_set'
            """, quiz_set_id)
            
            if row:
                return {
                    'id': row['id'],
                    'type': row['type'],
                    'data': json.loads(row['data']) if isinstance(row['data'], str) else row['data'],
                    'metadata': json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata'],
                    'validation_status': row['validation_status']
                }
        return None
    
    async def _update_quiz_set_validation(self, quiz_set_id: UUID, validation_data: Dict[str, Any]):
        """Update the validation status and data for a quiz set"""
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE content
                SET validation_status = $2,
                    validation_passes = $3,
                    quality_score = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, quiz_set_id, 
                validation_data['status'], 
                json.dumps(validation_data),
                validation_data['quality_score'])
    
    async def _send_admin_alert(self, severity: str, message: str):
        """Send admin alert via Discord webhook"""
        if not self.discord_webhook:
            logger.warning(f"Admin alert (no webhook configured): [{severity}] {message}")
            return
        
        color_map = {
            'info': 0x3498db,      # Blue
            'warning': 0xf39c12,   # Orange  
            'critical': 0xe74c3c   # Red
        }
        
        embed = {
            "embeds": [{
                "title": f"🚨 JazzyPop Validation Alert - {severity.upper()}",
                "description": message,
                "color": color_map.get(severity, 0x95a5a6),
                "timestamp": datetime.utcnow().isoformat(),
                "footer": {
                    "text": "JazzyPop Validation System"
                }
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(self.discord_webhook, json=embed)
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {e}")
    
    async def get_validation_stats(self) -> Dict[str, Any]:
        """Get validation statistics"""
        async with db.pool.acquire() as conn:
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending_count,
                    COUNT(*) FILTER (WHERE validation_status = 'approved') as approved_count,
                    COUNT(*) FILTER (WHERE validation_status = 'needs_revision') as revision_count,
                    COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected_count,
                    AVG(quality_score) FILTER (WHERE quality_score > 0) as avg_quality
                FROM content
                WHERE type IN ('quiz', 'quiz_set')
            """)
            
            return {
                'pending': stats['pending_count'] or 0,
                'approved': stats['approved_count'] or 0,
                'needs_revision': stats['revision_count'] or 0,
                'rejected': stats['rejected_count'] or 0,
                'average_quality': float(stats['avg_quality'] or 0)
            }

# Singleton instance
validation_service = ValidationService()
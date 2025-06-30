"""
Audio Service for JazzyPop
Integrates with ElevenLabs API for TTS with cost optimization
"""
import os
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
from database import db
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AudioService:
    def __init__(self):
        self.api_key = os.getenv('ELEVENLABS_API_KEY')
        self.api_url = "https://api.elevenlabs.io/v1"
        
        # Cost-saving measures
        self.cache_enabled = True
        self.cache_ttl = 86400 * 30  # 30 days cache
        
        # Use most cost-effective voice model
        self.voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel - clear, natural voice
        self.model_id = "eleven_turbo_v2"  # Fastest and cheapest model
        
        # Usage tracking
        self.daily_limit = 1000  # Characters per day
        self.monthly_limit = 20000  # Characters per month
        
    async def generate_audio(self, text: str, voice_style: str = "normal") -> Optional[bytes]:
        """Generate audio for text with caching and cost optimization"""
        
        # Check cache first
        cache_key = self._generate_cache_key(text, voice_style)
        cached_audio = await self._get_cached_audio(cache_key)
        if cached_audio:
            logger.info(f"Audio cache hit for: {text[:50]}...")
            return cached_audio
        
        # Check usage limits
        if not await self._check_usage_limits(len(text)):
            logger.warning("Usage limit reached, skipping audio generation")
            return None
        
        # Apply voice settings based on mode
        voice_settings = self._get_voice_settings(voice_style)
        
        try:
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.api_key
            }
            
            payload = {
                "text": text,
                "model_id": self.model_id,
                "voice_settings": voice_settings
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/text-to-speech/{self.voice_id}",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        
                        # Cache the audio
                        await self._cache_audio(cache_key, audio_data)
                        
                        # Track usage
                        await self._track_usage(len(text))
                        
                        return audio_data
                    else:
                        logger.error(f"ElevenLabs API error: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error generating audio: {e}")
            return None
    
    def _get_voice_settings(self, voice_style: str) -> Dict[str, float]:
        """Get voice settings based on style/mode"""
        settings = {
            "normal": {
                "stability": 0.75,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True
            },
            "chaos": {
                "stability": 0.3,  # More variation
                "similarity_boost": 0.5,
                "style": 1.0,  # Maximum expressiveness
                "use_speaker_boost": True
            },
            "zen": {
                "stability": 0.9,  # Very calm
                "similarity_boost": 0.8,
                "style": 0.2,  # Gentle
                "use_speaker_boost": True
            },
            "speed": {
                "stability": 0.7,
                "similarity_boost": 0.7,
                "style": 0.5,  # Energetic
                "use_speaker_boost": True
            }
        }
        
        return settings.get(voice_style, settings["normal"])
    
    async def generate_quiz_audio(self, quiz_data: Dict[str, Any], mode: str = "normal") -> Dict[str, Optional[bytes]]:
        """Generate audio for a complete quiz"""
        audio_files = {}
        
        # Question audio
        question_text = quiz_data.get("question", "")
        if mode == "chaos" and "mode_variations" in quiz_data:
            # Use chaos version if available
            chaos_variation = quiz_data.get("mode_variations", {}).get("chaos", {})
            question_text = chaos_variation.get("question", question_text)
        
        audio_files["question"] = await self.generate_audio(question_text, mode)
        
        # Generate answer audio (only for correct answer to save costs)
        for answer in quiz_data.get("answers", []):
            if answer.get("correct", False):
                answer_text = f"Correct! {answer['text']}. {quiz_data.get('explanation', '')}"
                audio_files["correct_answer"] = await self.generate_audio(answer_text, mode)
                break
        
        # Fun fact audio (if present and in zen mode)
        if mode == "zen" and "fun_fact" in quiz_data:
            audio_files["fun_fact"] = await self.generate_audio(
                f"Here's a fun fact: {quiz_data['fun_fact']}", 
                "zen"
            )
        
        return audio_files
    
    def _generate_cache_key(self, text: str, voice_style: str) -> str:
        """Generate cache key for audio"""
        content = f"{text}:{voice_style}:{self.voice_id}:{self.model_id}"
        return f"audio:{hashlib.sha256(content.encode()).hexdigest()}"
    
    async def _get_cached_audio(self, cache_key: str) -> Optional[bytes]:
        """Get audio from cache"""
        if not self.cache_enabled or not db.redis:
            return None
        
        try:
            cached = await db.redis.get(cache_key)
            if cached:
                # Redis stores as string, convert back to bytes
                return bytes.fromhex(cached)
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
        
        return None
    
    async def _cache_audio(self, cache_key: str, audio_data: bytes):
        """Cache audio data"""
        if not self.cache_enabled or not db.redis:
            return
        
        try:
            # Store as hex string in Redis
            await db.redis.setex(
                cache_key, 
                self.cache_ttl, 
                audio_data.hex()
            )
        except Exception as e:
            logger.error(f"Cache storage error: {e}")
    
    async def _check_usage_limits(self, character_count: int) -> bool:
        """Check if we're within usage limits"""
        if not db.redis:
            return True  # Allow if we can't track
        
        try:
            # Daily limit check
            daily_key = f"audio_usage:daily:{datetime.now().strftime('%Y-%m-%d')}"
            daily_usage = await db.redis.get(daily_key) or "0"
            
            if int(daily_usage) + character_count > self.daily_limit:
                logger.warning(f"Daily audio limit reached: {daily_usage}/{self.daily_limit}")
                return False
            
            # Monthly limit check
            monthly_key = f"audio_usage:monthly:{datetime.now().strftime('%Y-%m')}"
            monthly_usage = await db.redis.get(monthly_key) or "0"
            
            if int(monthly_usage) + character_count > self.monthly_limit:
                logger.warning(f"Monthly audio limit reached: {monthly_usage}/{self.monthly_limit}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Usage check error: {e}")
            return True  # Allow on error
    
    async def _track_usage(self, character_count: int):
        """Track usage for cost monitoring"""
        if not db.redis:
            return
        
        try:
            # Track daily usage
            daily_key = f"audio_usage:daily:{datetime.now().strftime('%Y-%m-%d')}"
            await db.redis.incrby(daily_key, character_count)
            await db.redis.expire(daily_key, 86400 * 2)  # Keep for 2 days
            
            # Track monthly usage
            monthly_key = f"audio_usage:monthly:{datetime.now().strftime('%Y-%m')}"
            await db.redis.incrby(monthly_key, character_count)
            await db.redis.expire(monthly_key, 86400 * 35)  # Keep for 35 days
            
            # Log usage
            daily_usage = await db.redis.get(daily_key)
            monthly_usage = await db.redis.get(monthly_key)
            
            logger.info(f"Audio usage - Daily: {daily_usage}/{self.daily_limit}, Monthly: {monthly_usage}/{self.monthly_limit}")
            
            # Store in database for analytics
            if db.pool:
                async with db.pool.acquire() as conn:
                    await conn.execute("""
                        INSERT INTO events (source, type, payload, created_at)
                        VALUES ('system', 'audio_generated', $1, NOW())
                    """, {
                        "characters": character_count,
                        "daily_total": int(daily_usage),
                        "monthly_total": int(monthly_usage),
                        "cost_estimate": character_count * 0.00001  # Rough estimate
                    })
            
        except Exception as e:
            logger.error(f"Usage tracking error: {e}")
    
    async def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics"""
        if not db.redis:
            return {"error": "Redis not available"}
        
        try:
            daily_key = f"audio_usage:daily:{datetime.now().strftime('%Y-%m-%d')}"
            monthly_key = f"audio_usage:monthly:{datetime.now().strftime('%Y-%m')}"
            
            daily_usage = int(await db.redis.get(daily_key) or 0)
            monthly_usage = int(await db.redis.get(monthly_key) or 0)
            
            return {
                "daily": {
                    "used": daily_usage,
                    "limit": self.daily_limit,
                    "percentage": round((daily_usage / self.daily_limit) * 100, 2)
                },
                "monthly": {
                    "used": monthly_usage,
                    "limit": self.monthly_limit,
                    "percentage": round((monthly_usage / self.monthly_limit) * 100, 2),
                    "estimated_cost": round(monthly_usage * 0.00001, 2)  # $0.01 per 1000 chars
                }
            }
            
        except Exception as e:
            logger.error(f"Stats retrieval error: {e}")
            return {"error": str(e)}

# Global instance
audio_service = AudioService()
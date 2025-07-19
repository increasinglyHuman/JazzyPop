"""
Password Reset API Endpoints
Handles password reset request and confirmation
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
import hashlib
from typing import Optional

from database import db
from auth_utils import hash_password, validate_password_strength
from email_service import email_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/password-reset", tags=["auth"])

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

def generate_reset_token() -> str:
    """Generate a secure random reset token"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/request")
async def request_password_reset(request: PasswordResetRequest):
    """
    Request a password reset email
    
    - Email will be sent if user exists
    - Generic response to prevent user enumeration
    - Token expires in 1 hour
    """
    try:
        async with db.pool.acquire() as conn:
            # Check if user exists
            user = await conn.fetchrow(
                "SELECT id, username, email FROM users WHERE email = $1",
                request.email
            )
            
            if user:
                user_id = user['id']
                username = user['username']
                email = user['email']
                
                # Generate reset token
                reset_token = generate_reset_token()
                token_hash = hash_token(reset_token)
                expires_at = datetime.utcnow() + timedelta(hours=1)
                
                # Store hashed token in database
                await conn.execute(
                    """
                    UPDATE users 
                    SET reset_token = $1, reset_token_expires = $2 
                    WHERE id = $3
                    """,
                    token_hash, expires_at, user_id
                )
                
                # Send reset email
                email_sent = email_service.send_password_reset_email(
                    to_email=email,
                    user_name=username,
                    reset_token=reset_token
                )
                
                if not email_sent:
                    logger.error(f"Failed to send reset email to {email}")
                    # Still return success to prevent enumeration
        
        # Always return same response to prevent user enumeration
        return {
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent."
        }
        
    except Exception as e:
        logger.error(f"Error in password reset request: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred processing your request")

@router.post("/confirm")
async def confirm_password_reset(request: PasswordResetConfirm):
    """
    Reset password using token
    
    - Validates token and expiration
    - Updates password
    - Invalidates token after use
    """
    try:
        # Validate password strength
        is_valid, message = validate_password_strength(request.new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        async with db.pool.acquire() as conn:
            # Hash the provided token to compare with database
            token_hash = hash_token(request.token)
            
            # Find user with matching token that hasn't expired
            user = await conn.fetchrow(
                """
                SELECT id, username, email 
                FROM users 
                WHERE reset_token = $1 
                AND reset_token_expires > $2
                """,
                token_hash, datetime.utcnow()
            )
            
            if not user:
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid or expired reset token"
                )
            
            user_id = user['id']
            username = user['username']
            email = user['email']
            
            # Hash new password
            password_hash = hash_password(request.new_password)
            
            # Update password and clear reset token
            await conn.execute(
                """
                UPDATE users 
                SET password_hash = $1, 
                    reset_token = NULL, 
                    reset_token_expires = NULL,
                    updated_at = $2
                WHERE id = $3
                """,
                password_hash, datetime.utcnow(), user_id
            )
            
            # Log password change
            logger.info(f"Password reset successful for user {username} (ID: {user_id})")
            
            # Optional: Send confirmation email
            # email_service.send_password_changed_email(email, username)
            
            return {
                "success": True,
                "message": "Password has been reset successfully"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming password reset: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred resetting your password")

@router.get("/validate-token/{token}")
async def validate_reset_token(token: str):
    """
    Validate if a reset token is valid without using it
    Useful for frontend to check before showing reset form
    """
    try:
        async with db.pool.acquire() as conn:
            token_hash = hash_token(token)
            
            is_valid = await conn.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM users 
                    WHERE reset_token = $1 
                    AND reset_token_expires > $2
                )
                """,
                token_hash, datetime.utcnow()
            )
            
            return {
                "valid": is_valid,
                "message": "Token is valid" if is_valid else "Invalid or expired token"
            }
        
    except Exception as e:
        logger.error(f"Error validating reset token: {str(e)}")
        return {"valid": False, "message": "Error validating token"}
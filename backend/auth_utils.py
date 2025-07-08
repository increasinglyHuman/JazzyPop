"""
Authentication utilities for JazzyPop
Handles password hashing, validation, and email verification
"""

import bcrypt
import re
from typing import Tuple
from email_validator import validate_email, EmailNotValidError

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
        
    Example:
        >>> hashed = hash_password("MySecurePassword123!")
        >>> # Returns something like: $2b$12$abcd...xyz
    """
    # Generate salt and hash the password
    # The salt is automatically included in the hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        password: Plain text password to check
        hashed: Previously hashed password
        
    Returns:
        True if password matches, False otherwise
        
    Example:
        >>> hashed = hash_password("MyPassword123!")
        >>> verify_password("MyPassword123!", hashed)  # True
        >>> verify_password("WrongPassword", hashed)   # False
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            hashed.encode('utf-8')
        )
    except Exception:
        # Handle any encoding issues
        return False

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Check if password meets security requirements
    
    Requirements:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter  
    - Contains at least one number
    - (Optional) Contains at least one special character
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
        
    Example:
        >>> validate_password_strength("weak")
        (False, "Password must be at least 8 characters long")
        >>> validate_password_strength("StrongPass123!")
        (True, "Password is valid")
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    # Optional: Check for special characters
    # Uncomment to require special characters
    # if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
    #     return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def validate_email_format(email: str) -> Tuple[bool, str]:
    """
    Validate email format and deliverability
    
    Args:
        email: Email address to validate
        
    Returns:
        Tuple of (is_valid, normalized_email_or_error)
        
    Example:
        >>> validate_email_format("user@example.com")
        (True, "user@example.com")
        >>> validate_email_format("invalid-email")
        (False, "The email address is not valid...")
    """
    try:
        # This will check format and normalize the email
        validation = validate_email(email)
        # Return normalized email
        return True, validation.normalized
    except EmailNotValidError as e:
        return False, str(e)

def generate_username_from_email(email: str) -> str:
    """
    Generate a username from an email address
    
    Args:
        email: Email address
        
    Returns:
        Username derived from email
        
    Example:
        >>> generate_username_from_email("john.doe@example.com")
        "john.doe"
    """
    # Take the part before @ and remove any special characters
    username = email.split('@')[0]
    # Keep only alphanumeric, dots, and underscores
    username = re.sub(r'[^a-zA-Z0-9._]', '', username)
    # Ensure it's not empty
    if not username:
        username = "user"
    return username.lower()

# Example usage and testing
if __name__ == "__main__":
    print("🔐 Password Hashing Examples:")
    print("-" * 40)
    
    # Test password hashing
    test_password = "MySecurePassword123!"
    hashed = hash_password(test_password)
    print(f"Original: {test_password}")
    print(f"Hashed: {hashed}")
    print(f"Verify correct: {verify_password(test_password, hashed)}")
    print(f"Verify wrong: {verify_password('WrongPassword', hashed)}")
    
    print("\n✅ Password Strength Tests:")
    print("-" * 40)
    
    test_passwords = [
        "weak",
        "Weak1234",
        "UPPERCASE123",
        "lowercase123",
        "NoNumbers!",
        "ValidPass123",
        "Super$ecure123"
    ]
    
    for pwd in test_passwords:
        valid, msg = validate_password_strength(pwd)
        status = "✅" if valid else "❌"
        print(f"{status} '{pwd}': {msg}")
    
    print("\n📧 Email Validation Tests:")
    print("-" * 40)
    
    test_emails = [
        "user@example.com",
        "john.doe+tag@gmail.com",
        "invalid-email",
        "missing@",
        "@nodomain.com"
    ]
    
    for email in test_emails:
        valid, result = validate_email_format(email)
        status = "✅" if valid else "❌"
        print(f"{status} '{email}': {result}")
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Create an Argon2 hash suitable for persistent storage."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Safely compare a plain password with its stored Argon2 hash."""
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False

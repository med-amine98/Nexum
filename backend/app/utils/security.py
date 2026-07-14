import os
from cryptography.fernet import Fernet

# Load encryption key from environment variable or generate a temporary one
_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not _ENCRYPTION_KEY:
    # In production you must set ENCRYPTION_KEY; for now generate a key
    _ENCRYPTION_KEY = Fernet.generate_key().decode()
    # Optionally you could persist it somewhere safe

_fernet = Fernet(_ENCRYPTION_KEY.encode())

def encrypt_data(plain_text: str) -> bytes:
    """Encrypt a string and return the ciphertext bytes."""
    if plain_text is None:
        return None
    return _fernet.encrypt(plain_text.encode())

def decrypt_data(cipher_text: bytes) -> str:
    """Decrypt ciphertext bytes and return the original string."""
    if cipher_text is None:
        return None
    return _fernet.decrypt(cipher_text).decode()

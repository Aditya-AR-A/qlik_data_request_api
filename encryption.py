"""
Encryption utilities — Fernet-based encrypt/decrypt for salary and SSN.
Uses two independent keys loaded from environment variables.
"""

import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key management
# ---------------------------------------------------------------------------
# Each sensitive field gets its own key.  Production deployments MUST set
# SALARY_ENCRYPTION_KEY and SSN_ENCRYPTION_KEY as env vars.  The fallback
# keys are deterministic so that the sample data created at startup can be
# decrypted during local testing.
# ---------------------------------------------------------------------------

_FALLBACK_SALARY_KEY = Fernet.generate_key()
_FALLBACK_SSN_KEY = Fernet.generate_key()

SALARY_KEY: bytes = os.environ.get("SALARY_ENCRYPTION_KEY", _FALLBACK_SALARY_KEY.decode()).encode() \
    if isinstance(os.environ.get("SALARY_ENCRYPTION_KEY", _FALLBACK_SALARY_KEY), str) \
    else os.environ.get("SALARY_ENCRYPTION_KEY", _FALLBACK_SALARY_KEY)

SSN_KEY: bytes = os.environ.get("SSN_ENCRYPTION_KEY", _FALLBACK_SSN_KEY.decode()).encode() \
    if isinstance(os.environ.get("SSN_ENCRYPTION_KEY", _FALLBACK_SSN_KEY), str) \
    else os.environ.get("SSN_ENCRYPTION_KEY", _FALLBACK_SSN_KEY)

_salary_fernet = Fernet(SALARY_KEY)
_ssn_fernet = Fernet(SSN_KEY)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def encrypt_salary(plain: str) -> str:
    """Encrypt a salary value and return the ciphertext as a UTF-8 string."""
    return _salary_fernet.encrypt(plain.encode()).decode()


def decrypt_salary(cipher: str) -> str:
    """Decrypt a salary ciphertext.  Raises ValueError on bad data."""
    try:
        return _salary_fernet.decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        logger.error("Failed to decrypt salary value")
        raise ValueError("Invalid salary ciphertext") from exc


def encrypt_ssn(plain: str) -> str:
    """Encrypt an SSN value and return the ciphertext as a UTF-8 string."""
    return _ssn_fernet.encrypt(plain.encode()).decode()


def decrypt_ssn(cipher: str) -> str:
    """Decrypt an SSN ciphertext.  Raises ValueError on bad data."""
    try:
        return _ssn_fernet.decrypt(cipher.encode()).decode()
    except InvalidToken as exc:
        logger.error("Failed to decrypt SSN value")
        raise ValueError("Invalid SSN ciphertext") from exc

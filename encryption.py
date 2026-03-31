"""MySQL-compatible AES decryption helpers for sensitive fields.

This module focuses on decrypting values produced by MySQL ``AES_ENCRYPT``
using the classic key folding behavior and default block mode.
"""

from __future__ import annotations

import base64
import binascii
import logging
import os
from typing import Literal

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

logger = logging.getLogger(__name__)


CiphertextEncoding = Literal["auto", "raw", "hex", "base64"]
CiphertextOutputEncoding = Literal["hex", "base64"]

# MySQL default mode in many deployments unless block_encryption_mode is changed.
MYSQL_AES_MODE = os.environ.get("MYSQL_AES_MODE", "aes-128-ecb").lower()
MYSQL_CIPHERTEXT_ENCODING: CiphertextEncoding = os.environ.get(
    "MYSQL_CIPHERTEXT_ENCODING", "auto"
).lower()  # type: ignore[assignment]
MYSQL_CIPHERTEXT_OUTPUT: CiphertextOutputEncoding = os.environ.get(
    "MYSQL_CIPHERTEXT_OUTPUT", "base64"
).lower()  # type: ignore[assignment]

SALARY_KEY = os.environ.get("SALARY_ENCRYPTION_KEY", "salary_dev_key")
SSN_KEY = os.environ.get("SSN_ENCRYPTION_KEY", "ssn_dev_key")


def _looks_like_hex(value: str) -> bool:
    if len(value) % 2 != 0:
        return False
    return all(ch in "0123456789abcdefABCDEF" for ch in value)


def _looks_like_base64(value: str) -> bool:
    if len(value) % 4 != 0:
        return False
    if not any(ch in value for ch in "+/="):
        return False
    try:
        base64.b64decode(value, validate=True)
        return True
    except (ValueError, binascii.Error):
        return False


def _decode_ciphertext(ciphertext: str | bytes, encoding: CiphertextEncoding) -> bytes:
    if isinstance(ciphertext, bytes):
        return ciphertext

    value = ciphertext.strip()
    if encoding == "raw":
        return value.encode("utf-8")
    if encoding == "hex":
        return bytes.fromhex(value.removeprefix("0x"))
    if encoding == "base64":
        return base64.b64decode(value, validate=True)

    # Auto mode: MySQL users commonly return HEX(AES_ENCRYPT(...)) or base64.
    if value.startswith("0x") and _looks_like_hex(value[2:]):
        return bytes.fromhex(value[2:])
    if _looks_like_hex(value):
        return bytes.fromhex(value)
    if _looks_like_base64(value):
        return base64.b64decode(value, validate=True)
    return value.encode("utf-8")


def _mysql_legacy_derive_key(key: str | bytes, key_size: int = 16) -> bytes:
    key_bytes = key.encode("utf-8") if isinstance(key, str) else key
    folded = bytearray(key_size)
    for idx, byte in enumerate(key_bytes):
        folded[idx % key_size] ^= byte
    return bytes(folded)


def _encode_ciphertext(ciphertext: bytes, encoding: CiphertextOutputEncoding) -> str:
    if encoding == "hex":
        return ciphertext.hex()
    if encoding == "base64":
        return base64.b64encode(ciphertext).decode("ascii")
    raise ValueError(f"Unsupported MYSQL_CIPHERTEXT_OUTPUT: {encoding}")


def _encrypt_mysql_aes(
    plaintext: str,
    key: str | bytes,
    *,
    mode: str = "aes-128-ecb",
    output_encoding: CiphertextOutputEncoding = "base64",
) -> str:
    if mode != "aes-128-ecb":
        raise ValueError(f"Unsupported MYSQL_AES_MODE: {mode}")

    folded_key = _mysql_legacy_derive_key(key, key_size=16)
    cipher = Cipher(algorithms.AES(folded_key), modes.ECB())

    padder = padding.PKCS7(128).padder()
    padded_plain = padder.update(plaintext.encode("utf-8")) + padder.finalize()

    encryptor = cipher.encryptor()
    cipher_bytes = encryptor.update(padded_plain) + encryptor.finalize()
    return _encode_ciphertext(cipher_bytes, output_encoding)


def _decrypt_mysql_aes(
    ciphertext: str | bytes,
    key: str | bytes,
    *,
    mode: str = "aes-128-ecb",
    encoding: CiphertextEncoding = "auto",
) -> str:
    if mode != "aes-128-ecb":
        raise ValueError(f"Unsupported MYSQL_AES_MODE: {mode}")

    cipher_bytes = _decode_ciphertext(ciphertext, encoding)
    folded_key = _mysql_legacy_derive_key(key, key_size=16)

    cipher = Cipher(algorithms.AES(folded_key), modes.ECB())
    decryptor = cipher.decryptor()
    padded_plain = decryptor.update(cipher_bytes) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    plain = unpadder.update(padded_plain) + unpadder.finalize()
    return plain.decode("utf-8")


def decrypt_salary(cipher: str | bytes) -> str:
    """Decrypt salary data produced by MySQL ``AES_ENCRYPT``."""
    try:
        return _decrypt_mysql_aes(
            cipher,
            SALARY_KEY,
            mode=MYSQL_AES_MODE,
            encoding=MYSQL_CIPHERTEXT_ENCODING,
        )
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        logger.error("Failed to decrypt salary value")
        raise ValueError("Invalid salary ciphertext") from exc


def decrypt_ssn(cipher: str | bytes) -> str:
    """Decrypt SSN data produced by MySQL ``AES_ENCRYPT``."""
    try:
        return _decrypt_mysql_aes(
            cipher,
            SSN_KEY,
            mode=MYSQL_AES_MODE,
            encoding=MYSQL_CIPHERTEXT_ENCODING,
        )
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        logger.error("Failed to decrypt SSN value")
        raise ValueError("Invalid SSN ciphertext") from exc


# Backward compatibility for older local demo code that still imports encryptors.
def encrypt_salary(plain: str) -> str:
    return _encrypt_mysql_aes(
        plain,
        SALARY_KEY,
        mode=MYSQL_AES_MODE,
        output_encoding=MYSQL_CIPHERTEXT_OUTPUT,
    )


def encrypt_ssn(plain: str) -> str:
    return _encrypt_mysql_aes(
        plain,
        SSN_KEY,
        mode=MYSQL_AES_MODE,
        output_encoding=MYSQL_CIPHERTEXT_OUTPUT,
    )

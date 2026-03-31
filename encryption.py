"""Minimal MySQL-compatible AES decryption helper."""

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

MYSQL_AES_MODE = os.environ.get("MYSQL_AES_MODE", "aes-128-ecb").lower()
MYSQL_CIPHERTEXT_ENCODING: CiphertextEncoding = os.environ.get(
    "MYSQL_CIPHERTEXT_ENCODING", "auto"
).lower()  # type: ignore[assignment]


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
    if isinstance(ciphertext, (bytes, bytearray, memoryview)):
        return bytes(ciphertext)

    value = str(ciphertext).strip()
    if encoding == "raw":
        return value.encode("utf-8")
    if encoding == "hex":
        return bytes.fromhex(value.removeprefix("0x"))
    if encoding == "base64":
        return base64.b64decode(value, validate=True)

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


def decrypt_with_key(cipher: str | bytes, key: str | bytes) -> str:
    """Decrypt ciphertext produced by MySQL AES_ENCRYPT with legacy key derivation."""
    if MYSQL_AES_MODE != "aes-128-ecb":
        raise ValueError(f"Unsupported MYSQL_AES_MODE: {MYSQL_AES_MODE}")

    try:
        cipher_bytes = _decode_ciphertext(cipher, MYSQL_CIPHERTEXT_ENCODING)
        folded_key = _mysql_legacy_derive_key(key, key_size=16)

        decryptor = Cipher(algorithms.AES(folded_key), modes.ECB()).decryptor()
        padded_plain = decryptor.update(cipher_bytes) + decryptor.finalize()

        unpadder = padding.PKCS7(128).unpadder()
        plain = unpadder.update(padded_plain) + unpadder.finalize()
        return plain.decode("utf-8")
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        logger.error("Failed to decrypt value")
        raise ValueError("Invalid ciphertext") from exc

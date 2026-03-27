"""
Secure tabular-data API for Qlik Sense REST consumption.
Provides row-level (section access) and column-level (permission) security
over a Pandas DataFrame with Fernet-encrypted sensitive fields.

Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from encryption import decrypt_salary, decrypt_ssn
from access_control import (
    get_allowed_departments,
    get_column_permission,
    is_valid_user,
)
from data import build_dataframe

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("qlik_api")

# ---------------------------------------------------------------------------
# App & data initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Qlik Secure Data API",
    version="1.0.0",
    description="Permission-based tabular data API designed for Qlik Sense REST connector.",
)

# Build the encrypted dataset once at startup
DATASET = build_dataframe()

# Columns that support decrypt / permission checks
SENSITIVE_COLUMNS = {"salary", "ssn"}

# Map column name → decryption function
_DECRYPTORS = {
    "salary": decrypt_salary,
    "ssn":    decrypt_ssn,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _apply_section_access(requester_id: int) -> list[dict]:
    """Filter rows by the requester's allowed departments and return records."""
    departments = get_allowed_departments(requester_id)
    if departments is None:
        return []
    filtered = DATASET[DATASET["department"].isin(departments)]
    return filtered.to_dict(orient="records")


def _parse_columns(columns_param: str) -> list[str]:
    """Split a comma-separated column list and validate entries."""
    return [c.strip().lower() for c in columns_param.split(",") if c.strip()]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/data", summary="Retrieve filtered data (encrypted fields intact)")
def get_data(
    requester_id: int = Query(..., description="ID of the requesting user"),
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
):
    """
    Return the dataset filtered by the requester's section-access rules.
    Encrypted columns remain encrypted.
    """
    # --- validate user ---
    if not is_valid_user(requester_id):
        logger.warning("Rejected unknown requester_id=%s on /data", requester_id)
        raise HTTPException(status_code=403, detail="Invalid or unauthorized requester_id.")

    records = _apply_section_access(requester_id)
    logger.info(
        "GET /data | requester_id=%s | rows_before_pagination=%d",
        requester_id,
        len(records),
    )

    # --- pagination ---
    if offset is not None:
        records = records[offset:]
    if limit is not None:
        records = records[:limit]

    return JSONResponse(content=records)


@app.get("/data/decrypt", summary="Retrieve filtered data with selective decryption")
def get_data_decrypt(
    requester_id: int = Query(..., description="ID of the requesting user"),
    columns: str = Query(..., description="Comma-separated list of columns to decrypt (e.g. 'salary,ssn')"),
    user_ids: Optional[str] = Query(None, description="Comma-separated list of user_ids to decrypt (e.g. '1,3,7'). If omitted, all accessible rows are returned."),
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
):
    """
    Return the dataset filtered by section-access rules with requested
    sensitive columns processed according to the requester's permissions:

    * **full** → decrypted value
    * **masked** → `"****"`
    * **none** → column dropped or value set to `null`
    """
    # --- validate user ---
    if not is_valid_user(requester_id):
        logger.warning("Rejected unknown requester_id=%s on /data/decrypt", requester_id)
        raise HTTPException(status_code=403, detail="Invalid or unauthorized requester_id.")

    # --- validate requested columns ---
    requested = _parse_columns(columns)
    invalid = [c for c in requested if c not in SENSITIVE_COLUMNS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid column(s) requested for decryption: {', '.join(invalid)}. "
                   f"Allowed: {', '.join(sorted(SENSITIVE_COLUMNS))}.",
        )
    if not requested:
        raise HTTPException(status_code=400, detail="No columns specified for decryption.")

    # --- section access (row-level) ---
    records = _apply_section_access(requester_id)

    # --- optional user_id filtering (targeted decryption) ---
    if user_ids is not None:
        target_ids = set()
        for uid in user_ids.split(","):
            uid = uid.strip()
            if uid.isdigit():
                target_ids.add(int(uid))
        if not target_ids:
            raise HTTPException(status_code=400, detail="Invalid user_ids parameter. Provide comma-separated integers.")
        records = [r for r in records if r["user_id"] in target_ids]

    logger.info(
        "GET /data/decrypt | requester_id=%s | columns=%s | user_ids=%s | rows=%d",
        requester_id,
        requested,
        user_ids or "all",
        len(records),
    )

    # --- column-level permission processing ---
    # Only return user_id (merge key) + the requested columns
    base_columns = ["user_id"]
    processed: list[dict] = []
    for row in records:
        new_row = {col: row[col] for col in base_columns}
        for col in requested:
            perm = get_column_permission(requester_id, col)
            if perm == "full":
                decryptor = _DECRYPTORS[col]
                try:
                    new_row[col] = decryptor(row[col])
                except ValueError:
                    new_row[col] = None  # corrupt ciphertext — surface as null
            elif perm == "masked":
                new_row[col] = "****"
            else:  # "none"
                new_row[col] = None
        processed.append(new_row)

    # --- pagination ---
    if offset is not None:
        processed = processed[offset:]
    if limit is not None:
        processed = processed[:limit]

    # --- access log ---
    for col in requested:
        perm = get_column_permission(requester_id, col)
        logger.info(
            "ACCESS_LOG | requester_id=%s | column=%s | permission=%s",
            requester_id,
            col,
            perm,
        )

    return JSONResponse(content=processed)

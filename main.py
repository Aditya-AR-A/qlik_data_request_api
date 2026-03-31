"""Qlik API with secure and basic routes for extension development.

Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from access_control import (
    get_allowed_departments,
    get_column_permission,
    is_valid_user,
)
from data import build_dataframe
from encryption import decrypt_salary, decrypt_ssn

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(message)s",
    force=True,
)
logger = logging.getLogger("qlik_api")

# ---------------------------------------------------------------------------
# App & data initialisation
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Qlik Secure Data API",
    version="1.2.0",
    description=(
        "Permission-based tabular data API designed for Qlik Sense REST connector, "
        "with additional basic-mode routes for extension prototyping."
    ),
)

# Build the encrypted dataset once at startup
DATASET = build_dataframe()

# Columns that support decrypt / permission checks
SENSITIVE_COLUMNS = {"salary", "ssn"}

# Map column name -> decryption function
_DECRYPTORS = {
    "salary": decrypt_salary,
    "ssn": decrypt_ssn,
}


@app.on_event("startup")
def startup_log() -> None:
    logger.info(
        "startup env=%s log_level=%s dataset_rows=%d aes_mode=%s ciphertext_encoding=%s",
        os.environ.get("RENDER_ENV", "local"),
        LOG_LEVEL,
        len(DATASET),
        os.environ.get("MYSQL_AES_MODE", "aes-128-ecb"),
        os.environ.get("MYSQL_CIPHERTEXT_ENCODING", "auto"),
    )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start = time.perf_counter()
    client_ip = request.client.host if request.client else "unknown"

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.exception(
            "request id=%s method=%s path=%s query=%s client=%s status=500 duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            request.url.query or "-",
            client_ip,
            elapsed_ms,
        )
        raise

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request id=%s method=%s path=%s query=%s client=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        request.url.query or "-",
        client_ip,
        response.status_code,
        elapsed_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _apply_section_access(requester_id: int) -> list[dict]:
    """Filter rows by the requester's allowed departments and return records."""
    departments = get_allowed_departments(requester_id)
    if departments is None:
        return []
    filtered = DATASET[DATASET["department"].isin(departments)]
    columns = list(filtered.columns)
    return [dict(zip(columns, row)) for row in filtered.itertuples(index=False, name=None)]


def _get_all_records() -> list[dict]:
    """Return all rows without section-access filtering (basic mode)."""
    columns = list(DATASET.columns)
    return [dict(zip(columns, row)) for row in DATASET.itertuples(index=False, name=None)]


def _parse_columns(columns_param: str) -> list[str]:
    """Split a comma-separated column list and validate entries."""
    return [c.strip().lower() for c in columns_param.split(",") if c.strip()]


# ---------------------------------------------------------------------------
# Secure routes (existing behavior restored)
# ---------------------------------------------------------------------------
@app.get("/data", summary="Retrieve filtered data (encrypted fields intact)")
def get_data(
    requester_id: int = Query(..., description="ID of the requesting user"),
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
):
    """Return data filtered by section-access rules, with encrypted sensitive fields."""
    if not is_valid_user(requester_id):
        logger.warning("secure data rejected requester_id=%s", requester_id)
        raise HTTPException(status_code=403, detail="Invalid or unauthorized requester_id.")

    records = _apply_section_access(requester_id)
    logger.info(
        "secure data requester_id=%s rows_before_pagination=%d",
        requester_id,
        len(records),
    )

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
    """Return filtered records with sensitive columns processed by permission level."""
    if not is_valid_user(requester_id):
        logger.warning("secure decrypt rejected requester_id=%s", requester_id)
        raise HTTPException(status_code=403, detail="Invalid or unauthorized requester_id.")

    requested = _parse_columns(columns)
    invalid = [c for c in requested if c not in SENSITIVE_COLUMNS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid column(s) requested for decryption: {', '.join(invalid)}. "
                f"Allowed: {', '.join(sorted(SENSITIVE_COLUMNS))}."
            ),
        )
    if not requested:
        raise HTTPException(status_code=400, detail="No columns specified for decryption.")

    records = _apply_section_access(requester_id)

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
        "secure decrypt requester_id=%s columns=%s user_ids=%s rows=%d",
        requester_id,
        requested,
        user_ids or "all",
        len(records),
    )

    permissions = {col: get_column_permission(requester_id, col) for col in requested}
    logger.info("secure permissions requester_id=%s permissions=%s", requester_id, permissions)

    base_columns = ["user_id"]
    processed: list[dict] = []
    for row in records:
        new_row = {col: row[col] for col in base_columns}
        for col in requested:
            perm = permissions[col]
            if perm == "full":
                decryptor = _DECRYPTORS[col]
                try:
                    new_row[col] = decryptor(row[col])
                except ValueError:
                    logger.warning(
                        "secure decrypt failed requester_id=%s user_id=%s column=%s",
                        requester_id,
                        row["user_id"],
                        col,
                    )
                    new_row[col] = None
            elif perm == "masked":
                new_row[col] = "****"
            else:
                new_row[col] = None
        processed.append(new_row)

    if offset is not None:
        processed = processed[offset:]
    if limit is not None:
        processed = processed[:limit]

    return JSONResponse(content=processed)


# ---------------------------------------------------------------------------
# Basic routes (new)
# ---------------------------------------------------------------------------
@app.get("/basic/data", summary="Basic mode: retrieve data without verification")
def get_data_basic(
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
):
    """Return all rows without requester validation or section-access filtering."""
    records = _get_all_records()
    logger.info("basic data rows_before_pagination=%d", len(records))

    if offset is not None:
        records = records[offset:]
    if limit is not None:
        records = records[:limit]

    return JSONResponse(content=records)


@app.get("/basic/data/decrypt", summary="Basic mode: selective decryption without verification")
def get_data_decrypt_basic(
    columns: str = Query(..., description="Comma-separated list of columns to decrypt (e.g. 'salary,ssn')"),
    user_ids: Optional[str] = Query(None, description="Comma-separated list of user_ids to decrypt (e.g. '1,3,7'). If omitted, all rows are returned."),
    limit: Optional[int] = Query(None, ge=1, description="Max records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
):
    """Return requested decrypted columns with no requester or permission checks."""
    requested = _parse_columns(columns)
    invalid = [c for c in requested if c not in SENSITIVE_COLUMNS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid column(s) requested for decryption: {', '.join(invalid)}. "
                f"Allowed: {', '.join(sorted(SENSITIVE_COLUMNS))}."
            ),
        )
    if not requested:
        raise HTTPException(status_code=400, detail="No columns specified for decryption.")

    records = _get_all_records()

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
        "basic decrypt columns=%s user_ids=%s rows=%d",
        requested,
        user_ids or "all",
        len(records),
    )

    base_columns = ["user_id"]
    processed: list[dict] = []
    for row in records:
        new_row = {col: row[col] for col in base_columns}
        for col in requested:
            decryptor = _DECRYPTORS[col]
            try:
                new_row[col] = decryptor(row[col])
            except ValueError:
                logger.warning(
                    "basic decrypt failed user_id=%s column=%s",
                    row["user_id"],
                    col,
                )
                new_row[col] = None
        processed.append(new_row)

    if offset is not None:
        processed = processed[offset:]
    if limit is not None:
        processed = processed[:limit]

    return JSONResponse(content=processed)

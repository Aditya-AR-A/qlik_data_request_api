"""Qlik API with secure and basic routes for extension development.

Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from access_control import (
    get_allowed_departments,
    get_column_permission,
    is_valid_user,
)
from data import build_dataframe
from encryption import decrypt_salary, decrypt_ssn, decrypt_with_key

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
    version="1.3.0",
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

# Dedicated key used only by basic payload decrypt route.
BASIC_DECRYPTION_KEY = os.environ.get("BASIC_DECRYPTION_KEY", "OjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYsc8/tRtx+R")


@app.on_event("startup")
def startup_log() -> None:
    logger.info(
        "startup env=%s log_level=%s dataset_rows=%d aes_mode=%s ciphertext_encoding=%s basic_key_configured=%s",
        os.environ.get("RENDER_ENV", "local"),
        LOG_LEVEL,
        len(DATASET),
        os.environ.get("MYSQL_AES_MODE", "aes-128-ecb"),
        os.environ.get("MYSQL_CIPHERTEXT_ENCODING", "auto"),
        bool(BASIC_DECRYPTION_KEY),
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


class BasicDecryptPayload(BaseModel):
    rows: list[dict[str, Any]] = Field(
        ...,
        description="Rows to decrypt. Example row: {'id': 1, 'hr_id': '<cipher>'}",
    )
    id_column: str = Field(
        ...,
        description="Identifier column to include in response (e.g. 'id' or 'user_id').",
    )
    columns: list[str] = Field(
        ...,
        description="Encrypted columns to decrypt from each row (e.g. ['hr_id']).",
    )


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


@app.post("/basic/decrypt", summary="Basic mode: decrypt posted rows with dedicated key")
@app.post("/basic/data/decrypt", summary="Basic mode: decrypt posted rows with dedicated key")
def decrypt_payload_basic(payload: BasicDecryptPayload):
    """Decrypt requested columns from caller-provided rows using BASIC_DECRYPTION_KEY."""
    if not payload.rows:
        raise HTTPException(status_code=400, detail="rows must contain at least one item.")

    id_column = payload.id_column.strip()
    if not id_column:
        raise HTTPException(status_code=400, detail="id_column is required.")

    requested = [c.strip() for c in payload.columns if c.strip()]
    if not requested:
        raise HTTPException(status_code=400, detail="columns must include at least one column name.")

    logger.info(
        "basic payload decrypt rows=%d id_column=%s columns=%s",
        len(payload.rows),
        id_column,
        requested,
    )

    output_rows: list[dict[str, Any]] = []
    failures = 0
    for idx, row in enumerate(payload.rows, start=1):
        if id_column not in row:
            raise HTTPException(
                status_code=400,
                detail=f"Row {idx} is missing required id_column '{id_column}'.",
            )

        out_row: dict[str, Any] = {id_column: row[id_column]}
        for col in requested:
            value = row.get(col)
            if value in (None, ""):
                out_row[col] = None
                continue

            try:
                out_row[col] = decrypt_with_key(str(value), BASIC_DECRYPTION_KEY)
            except ValueError:
                failures += 1
                out_row[col] = None

        output_rows.append(out_row)

    logger.info(
        "basic payload decrypt completed rows=%d failures=%d",
        len(output_rows),
        failures,
    )

    return JSONResponse(
        content={
            "rows": output_rows,
            "meta": {
                "id_column": id_column,
                "columns": requested,
                "rows": len(output_rows),
                "failures": failures,
            },
        }
    )

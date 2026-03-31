"""Minimal decrypt API for Qlik extension.

Single endpoint:
    POST /basic/data/decrypt
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from encryption import decrypt_with_key


LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(message)s",
    force=True,
)
logger = logging.getLogger("qlik_decrypt_api")


app = FastAPI(
    title="Qlik Decrypt API",
    version="2.0.0",
    description="Single decrypt endpoint that accepts encrypted rows and returns decrypted rows.",
)


BASIC_DECRYPTION_KEY = os.environ.get("BASIC_DECRYPTION_KEY", "OjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYsc8/tRtx+R")


class DecryptPayload(BaseModel):
    rows: list[dict[str, Any]] = Field(
        ...,
        description="Rows that contain encrypted values.",
    )
    id_column: str = Field(
        ...,
        description="Column name used as row identifier in the response.",
    )
    columns: list[str] = Field(
        ...,
        description="Encrypted column names to decrypt.",
    )


def _parse_columns(columns_param: str) -> list[str]:
    return [c.strip() for c in columns_param.split(",") if c.strip()]


@app.on_event("startup")
def startup_log() -> None:
    logger.info(
        "startup log_level=%s basic_key_configured=%s",
        LOG_LEVEL,
        bool(BASIC_DECRYPTION_KEY),
    )


@app.post("/basic/data/decrypt", summary="Decrypt posted rows")
def decrypt_data(
    payload: Optional[DecryptPayload] = None,
    payload_json: Optional[str] = Query(
        None,
        description="Optional JSON payload fallback when connector cannot send request body.",
    ),
    id_column: Optional[str] = Query(None, description="Connection-test helper field."),
    columns: Optional[str] = Query(None, description="Connection-test helper field."),
):
    if not BASIC_DECRYPTION_KEY:
        raise HTTPException(status_code=500, detail="BASIC_DECRYPTION_KEY is not configured.")

    if payload is None and payload_json:
        try:
            payload = DecryptPayload.model_validate(json.loads(payload_json))
        except (json.JSONDecodeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid payload_json.") from exc

    # Return a schema-friendly sample for connector setup when no body is sent.
    if payload is None:
        test_id_column = (id_column or "id").strip() or "id"
        test_columns = _parse_columns(columns) if columns else []
        sample_row: dict[str, Any] = {test_id_column: 0}
        for col in test_columns:
            sample_row[col] = ""

        sample_rows = [sample_row] if test_columns else []
        return JSONResponse(
            content={
                "root": sample_rows,
                "rows": sample_rows,
                "meta": {
                    "id_column": test_id_column,
                    "columns": test_columns,
                    "rows": len(sample_rows),
                    "failures": 0,
                    "mode": "connection_test",
                },
            }
        )

    if not payload.rows:
        raise HTTPException(status_code=400, detail="rows must contain at least one item.")

    requested_id_column = payload.id_column.strip()
    if not requested_id_column:
        raise HTTPException(status_code=400, detail="id_column is required.")

    requested_columns = [c.strip() for c in payload.columns if c.strip()]
    if not requested_columns:
        raise HTTPException(status_code=400, detail="columns must include at least one column name.")

    output_rows: list[dict[str, Any]] = []
    failures = 0

    for index, row in enumerate(payload.rows, start=1):
        if requested_id_column not in row:
            raise HTTPException(
                status_code=400,
                detail=f"Row {index} is missing required id_column '{requested_id_column}'.",
            )

        out_row: dict[str, Any] = {requested_id_column: row[requested_id_column]}
        for column in requested_columns:
            value = row.get(column)
            if value in (None, ""):
                out_row[column] = None
                continue
            try:
                out_row[column] = decrypt_with_key(str(value), BASIC_DECRYPTION_KEY)
            except ValueError:
                failures += 1
                out_row[column] = None

        output_rows.append(out_row)

    logger.info(
        "decrypt rows=%d columns=%s failures=%d",
        len(output_rows),
        requested_columns,
        failures,
    )

    return JSONResponse(
        content={
            "root": output_rows,
            "rows": output_rows,
            "meta": {
                "id_column": requested_id_column,
                "columns": requested_columns,
                "rows": len(output_rows),
                "failures": failures,
            },
        }
    )

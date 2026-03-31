"""Minimal decrypt API for Qlik extension.

Single endpoint:
    GET /decrypt
"""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from typing import Any, Optional

from fastapi import Body, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError

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
    version="2.1.0",
    description="Single simple decrypt endpoint for Qlik using query parameters.",
)


BASIC_DECRYPTION_KEY = os.environ.get("BASIC_DECRYPTION_KEY", "OjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYsc8/tRtx+R")


class DecryptPostRequest(BaseModel):
    id_column: str = Field("id", description="Name of the id field in each row.")
    column: Optional[str] = Field(
        None,
        description="Single encrypted column name to decrypt (single-column mode).",
    )
    columns: Optional[list[str]] = Field(
        None,
        description="Encrypted column names to decrypt (multi-column mode).",
    )
    rows: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Rows containing id and encrypted column values.",
    )


def _coerce_post_payload(payload: Any) -> DecryptPostRequest:
    """Accept dict payloads and stringified JSON payloads from Qlik POST calls."""
    normalized: Any = payload

    if isinstance(normalized, (bytes, bytearray)):
        normalized = normalized.decode("utf-8", errors="replace")

    # Qlik may send JSON as a string, or even a JSON-stringified JSON string.
    # Parse repeatedly to unwrap nested encoding layers.
    for _ in range(3):
        if not isinstance(normalized, str):
            break

        text = normalized.strip()
        if not text:
            raise HTTPException(status_code=422, detail="Body cannot be empty.")

        try:
            normalized = json.loads(text)
            continue
        except json.JSONDecodeError:
            # Some clients wrap the full JSON in outer single quotes.
            if len(text) >= 2 and text[0] == "'" and text[-1] == "'":
                try:
                    normalized = json.loads(text[1:-1])
                    continue
                except json.JSONDecodeError as exc:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Invalid JSON string body: {exc.msg}",
                    ) from exc

            raise HTTPException(
                status_code=422,
                detail="Invalid JSON string body.",
            )

    if not isinstance(normalized, dict):
        raise HTTPException(
            status_code=422,
            detail="Body must be a JSON object or a JSON-stringified object.",
        )

    try:
        return DecryptPostRequest.model_validate(normalized)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def _parse_columns(columns_param: str) -> list[str]:
    return [c.strip() for c in columns_param.split(",") if c.strip()]


def _split_delimited(value: str, delimiter: str) -> list[str]:
    delim = delimiter or "|"
    return [item.strip() for item in value.split(delim)]


def _preview_value(value: Any, max_len: int = 300) -> Any:
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        return value
    text = str(value)
    if len(text) > max_len:
        return text[:max_len] + "...<truncated>"
    return text


def _preview_row(row: dict[str, Any], max_len: int = 300) -> dict[str, Any]:
    return {str(k): _preview_value(v, max_len=max_len) for k, v in row.items()}


def _preview_json(payload_obj: Any, max_len: int = 5000) -> str:
    text = json.dumps(payload_obj, ensure_ascii=True, default=str)
    if len(text) > max_len:
        return text[:max_len] + "...<truncated>"
    return text


@app.on_event("startup")
def startup_log() -> None:
    logger.info(
        "startup log_level=%s basic_key_configured=%s",
        LOG_LEVEL,
        bool(BASIC_DECRYPTION_KEY),
    )


@app.middleware("http")
async def log_request_lifecycle(request: Request, call_next):
    request_id = uuid.uuid4().hex[:10]
    start = time.perf_counter()
    client = request.client.host if request.client else "unknown"

    logger.info(
        "request.start request_id=%s method=%s path=%s query=%s client=%s",
        request_id,
        request.method,
        request.url.path,
        request.url.query,
        client,
    )

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "request.error request_id=%s method=%s path=%s duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request.end request_id=%s status=%s duration_ms=%.2f",
        request_id,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.get("/decrypt", summary="Decrypt by id list and encrypted value list")
def decrypt_data_simple(
    request: Request,
    id_column: str = Query("id", description="Name of the id field."),
    column: Optional[str] = Query(None, description="Single encrypted column name to decrypt."),
    columns: Optional[str] = Query(
        None,
        description="Comma-separated encrypted column names to decrypt in multi-column mode.",
    ),
    ids: str = Query(..., description="Delimited list of row ids."),
    values: Optional[str] = Query(
        None,
        description="Delimited list of encrypted values for single-column mode.",
    ),
    delimiter: str = Query("|", description="Delimiter used for ids and values."),
):
    logger.info(
        "decrypt.simple.step=received id_column=%s column=%s columns=%s delimiter=%s",
        id_column,
        column,
        columns,
        delimiter,
    )

    if not BASIC_DECRYPTION_KEY:
        raise HTTPException(status_code=500, detail="BASIC_DECRYPTION_KEY is not configured.")

    requested_id_column = id_column.strip() or "id"

    id_list = _split_delimited(ids, delimiter)

    requested_columns = _parse_columns(columns) if columns else []
    multi_mode = len(requested_columns) > 0

    if multi_mode:
        column_values_map: dict[str, list[str]] = {}
        for col in requested_columns:
            param_name = f"values_{col}"
            raw_values = request.query_params.get(param_name)
            if raw_values is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required query parameter '{param_name}' for multi-column mode.",
                )

            split_values = _split_delimited(raw_values, delimiter)
            if len(split_values) != len(id_list):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{param_name} must contain the same number of items as ids "
                        f"({len(id_list)} expected)."
                    ),
                )
            column_values_map[col] = split_values
    else:
        requested_column = (column or "").strip()
        if not requested_column:
            raise HTTPException(
                status_code=400,
                detail="Provide either column (single mode) or columns (multi mode).",
            )
        if values is None:
            raise HTTPException(status_code=400, detail="values is required in single-column mode.")

        value_list = _split_delimited(values, delimiter)
        if len(id_list) != len(value_list):
            raise HTTPException(
                status_code=400,
                detail="ids and values must contain the same number of items.",
            )
        requested_columns = [requested_column]
        column_values_map = {requested_column: value_list}

    logger.info(
        "decrypt.simple.step=validated rows=%d columns=%s multi_mode=%s",
        len(id_list),
        requested_columns,
        multi_mode,
    )

    output_rows: list[dict[str, Any]] = []
    failures = 0

    for index, row_id in enumerate(id_list, start=1):
        logger.info(
            "decrypt.simple.step=row_input index=%d id=%s",
            index,
            _preview_value(row_id),
        )

        row: dict[str, Any] = {requested_id_column: row_id}
        for col in requested_columns:
            encrypted_value = column_values_map[col][index - 1]
            if encrypted_value in ("", None):
                row[col] = None
                logger.info(
                    "decrypt.simple.step=column_skipped index=%d id=%s column=%s reason=empty",
                    index,
                    _preview_value(row_id),
                    col,
                )
                continue

            try:
                logger.info(
                    "decrypt.simple.step=column_input index=%d id=%s column=%s encrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(encrypted_value),
                )
                row[col] = decrypt_with_key(encrypted_value, BASIC_DECRYPTION_KEY)
                logger.info(
                    "decrypt.simple.step=column_output index=%d id=%s column=%s decrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(row[col]),
                )
            except ValueError:
                failures += 1
                row[col] = None
                logger.warning(
                    "decrypt.simple.step=column_failed index=%d id=%s column=%s encrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(encrypted_value),
                )

        output_rows.append(row)
        logger.info(
            "decrypt.simple.step=row_output index=%d id=%s row=%s",
            index,
            _preview_value(row_id),
            _preview_json(_preview_row(row)),
        )

    logger.info(
        "decrypt.simple.step=complete rows=%d failures=%d response=%s",
        len(output_rows),
        failures,
        _preview_json(output_rows),
    )
    return JSONResponse(content=output_rows)


@app.post("/decrypt", summary="Decrypt from JSON body")
def decrypt_data_post(payload: Any = Body(...)):
    payload_data = _coerce_post_payload(payload)

    logger.info(
        "decrypt.post.step=received id_column=%s column=%s columns=%s rows=%d",
        payload_data.id_column,
        payload_data.column,
        payload_data.columns,
        len(payload_data.rows),
    )

    if not BASIC_DECRYPTION_KEY:
        raise HTTPException(status_code=500, detail="BASIC_DECRYPTION_KEY is not configured.")

    requested_id_column = payload_data.id_column.strip() or "id"
    requested_columns = [c.strip() for c in (payload_data.columns or []) if c and c.strip()]

    if not requested_columns:
        requested_column = (payload_data.column or "").strip()
        if not requested_column:
            raise HTTPException(
                status_code=400,
                detail="Provide either column (single mode) or columns (multi mode).",
            )
        requested_columns = [requested_column]

    logger.info(
        "decrypt.post.step=validated rows=%d columns=%s",
        len(payload_data.rows),
        requested_columns,
    )

    output_rows: list[dict[str, Any]] = []
    failures = 0

    for index, input_row in enumerate(payload_data.rows, start=1):
        row_id = input_row.get(requested_id_column)
        logger.info(
            "decrypt.post.step=row_input index=%d id=%s",
            index,
            _preview_value(row_id),
        )

        output_row: dict[str, Any] = {requested_id_column: row_id}

        for col in requested_columns:
            encrypted_value = input_row.get(col)
            if encrypted_value in ("", None):
                output_row[col] = None
                logger.info(
                    "decrypt.post.step=column_skipped index=%d id=%s column=%s reason=empty",
                    index,
                    _preview_value(row_id),
                    col,
                )
                continue

            try:
                logger.info(
                    "decrypt.post.step=column_input index=%d id=%s column=%s encrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(encrypted_value),
                )
                output_row[col] = decrypt_with_key(encrypted_value, BASIC_DECRYPTION_KEY)
                logger.info(
                    "decrypt.post.step=column_output index=%d id=%s column=%s decrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(output_row[col]),
                )
            except ValueError:
                failures += 1
                output_row[col] = None
                logger.warning(
                    "decrypt.post.step=column_failed index=%d id=%s column=%s encrypted=%s",
                    index,
                    _preview_value(row_id),
                    col,
                    _preview_value(encrypted_value),
                )

        output_rows.append(output_row)
        logger.info(
            "decrypt.post.step=row_output index=%d id=%s row=%s",
            index,
            _preview_value(row_id),
            _preview_json(_preview_row(output_row)),
        )

    logger.info(
        "decrypt.post.step=complete rows=%d failures=%d response=%s",
        len(output_rows),
        failures,
        _preview_json(output_rows),
    )
    return JSONResponse(content=output_rows)

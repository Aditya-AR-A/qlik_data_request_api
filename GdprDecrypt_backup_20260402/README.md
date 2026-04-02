# GdprDecrypt

Minimal Qlik visualization extension that:
- reads selected rows for one ID field and configured encrypted columns,
- calls a decrypt API using POST,
- patches visible chart dimensions/measures with decrypted expressions,
- restores original chart properties with Reset.

## Default API
- `https://rd6.hitechpals.com/aes_decrypt`

## Required API contract
Request JSON:
```json
{
  "id_column": "id",
  "columns": ["hr_id"],
  "rows": [{"id": "1", "hr_id": "..."}]
}
```

Response JSON:
- Array of rows with decrypted values for configured columns.

## Properties exposed
- API URL
- ID field
- Encrypted columns (comma-separated)

## Notes
- This version is intentionally minimal.
- There is no separate health-check call; decrypt goes directly to POST.

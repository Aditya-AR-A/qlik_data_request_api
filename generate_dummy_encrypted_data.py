from __future__ import annotations

import argparse
import csv
import json
import os
import random
from pathlib import Path

from encryption import encrypt_with_key


def build_rows(count: int, key: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for i in range(1, count + 1):
        salary_value = str(random.randint(35000, 220000))
        rows.append(
            {
                "user_id": str(i),
                "name": f"User_{i}",
                "salary_plain": salary_value,
                "salary": encrypt_with_key(salary_value, key),
            }
        )
    return rows


def write_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["user_id", "name", "salary", "salary_plain"])
        writer.writeheader()
        writer.writerows(rows)


def write_json(rows: list[dict[str, str]], output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=True, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate dummy encrypted rows compatible with this API's decrypt logic "
            "(MySQL legacy key folding + AES-128-ECB, base64 ciphertext)."
        )
    )
    parser.add_argument("--rows", type=int, default=20, help="Number of rows to generate.")
    parser.add_argument(
        "--output",
        type=str,
        default="dummy_encrypted_data.csv",
        help="Output file path (.csv or .json).",
    )
    parser.add_argument(
        "--key",
        type=str,
        default=os.environ.get("BASIC_DECRYPTION_KEY", ""),
        help="Encryption key. Defaults to BASIC_DECRYPTION_KEY env var.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.rows < 1:
        raise ValueError("--rows must be at least 1")

    key = (args.key or "").strip()
    if not key:
        raise ValueError("Provide --key or set BASIC_DECRYPTION_KEY environment variable")

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = build_rows(args.rows, key)

    if output_path.suffix.lower() == ".json":
        write_json(rows, output_path)
    else:
        write_csv(rows, output_path)

    print(f"Generated {len(rows)} rows at {output_path}")
    print("Columns: user_id, name, salary (encrypted), salary_plain")


if __name__ == "__main__":
    main()

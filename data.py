"""
Sample dataset — builds a Pandas DataFrame with encrypted salary & SSN columns.
"""

import pandas as pd
from encryption import encrypt_salary, encrypt_ssn

# ---------------------------------------------------------------------------
# Raw sample records
# ---------------------------------------------------------------------------
_RAW_RECORDS = [
    {"user_id": 1, "name": "Alice Johnson",   "department": "HR",          "salary": "85000",  "ssn": "123-45-6789"},
    {"user_id": 2, "name": "Bob Smith",        "department": "Engineering", "salary": "120000", "ssn": "987-65-4321"},
    {"user_id": 3, "name": "Charlie Davis",    "department": "Finance",     "salary": "95000",  "ssn": "111-22-3333"},
    {"user_id": 4, "name": "Diana Martinez",   "department": "HR",          "salary": "78000",  "ssn": "444-55-6666"},
    {"user_id": 5, "name": "Eve Thompson",     "department": "Engineering", "salary": "130000", "ssn": "777-88-9999"},
    {"user_id": 6, "name": "Frank Wilson",     "department": "Finance",     "salary": "102000", "ssn": "222-33-4444"},
    {"user_id": 7, "name": "Grace Lee",        "department": "HR",          "salary": "91000",  "ssn": "555-66-7777"},
    {"user_id": 8, "name": "Hank Brown",       "department": "Engineering", "salary": "115000", "ssn": "888-99-0000"},
]


def build_dataframe() -> pd.DataFrame:
    """Create the dataset with salary and SSN already encrypted."""
    records = []
    for row in _RAW_RECORDS:
        records.append(
            {
                "user_id":    row["user_id"],
                "name":       row["name"],
                "department": row["department"],
                "salary":     encrypt_salary(row["salary"]),
                "ssn":        encrypt_ssn(row["ssn"]),
            }
        )
    return pd.DataFrame(records)

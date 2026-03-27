"""
Access-control layer — column-level permissions and row-level section access.
"""

from __future__ import annotations
from typing import Literal

# ---------------------------------------------------------------------------
# Column-level permissions  (per user, per sensitive column)
# ---------------------------------------------------------------------------
# "full"   → decrypt and return the real value
# "masked" → return "****"
# "none"   → drop the column / return null
# ---------------------------------------------------------------------------

PermissionLevel = Literal["full", "masked", "none"]

permissions: dict[int, dict[str, PermissionLevel]] = {
    101: {"salary": "full",   "ssn": "none"},
    102: {"salary": "masked", "ssn": "full"},
    103: {"salary": "none",   "ssn": "none"},
}


def get_column_permission(requester_id: int, column: str) -> PermissionLevel:
    """Return the permission level a user has on a given column.

    Defaults to "none" for unknown users or columns.
    """
    user_perms = permissions.get(requester_id)
    if user_perms is None:
        return "none"
    return user_perms.get(column, "none")


# ---------------------------------------------------------------------------
# Section access  (row-level security — department whitelist per user)
# ---------------------------------------------------------------------------

section_access: dict[int, list[str]] = {
    101: ["HR", "Finance"],
    102: ["Engineering"],
    103: ["HR"],
}


def get_allowed_departments(requester_id: int) -> list[str] | None:
    """Return the list of departments a user may see.

    Returns ``None`` if the user is not registered (→ treated as 403).
    """
    return section_access.get(requester_id)


def is_valid_user(requester_id: int) -> bool:
    """Check whether `requester_id` exists in both permission maps."""
    return requester_id in permissions and requester_id in section_access

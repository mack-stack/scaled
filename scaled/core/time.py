"""Time utilities for SQLite/Postgres compatibility."""
from datetime import datetime, timedelta, timezone


def utcnow() -> datetime:
    """Return current UTC time as naive datetime (SQLite compatible)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def days_ago(n: int) -> datetime:
    """Return naive UTC datetime N days ago."""
    return utcnow() - timedelta(days=n)

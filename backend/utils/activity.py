"""
Saves what a logged-in user does (drug lookups, comparisons, multi-drug checks, photo scans).
Predictions are saved separately in prediction_history because they store the full result.
Anonymous visitors are never recorded. A database problem never breaks the request.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from utils.db import db
from utils.logger import setup_logger

logger = setup_logger("activity")


def log_activity(user_email: Optional[str], kind: str, title: str, data: Optional[dict] = None,
                 dedupe_minutes: int = 0) -> None:
    if not user_email:
        return
    try:
        now = datetime.now(timezone.utc)
        if dedupe_minutes:
            recent = db.user_activity.find_one(
                {"user_email": user_email, "kind": kind, "title": title,
                 "timestamp": {"$gte": now - timedelta(minutes=dedupe_minutes)}},
                {"_id": 1},
            )
            if recent:
                return  # same thing again within a few minutes: don't fill the history with repeats
        db.user_activity.insert_one(
            {"user_email": user_email, "kind": kind, "title": title, "data": data or {}, "timestamp": now}
        )
    except Exception as e:
        logger.warning(f"Failed to save activity ({kind}): {e}")
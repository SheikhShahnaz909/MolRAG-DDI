"""Everything the logged-in user has done, newest first."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from utils.auth import get_required_user_email
from utils.db import db

router = APIRouter()

_OLDEST = datetime.min.replace(tzinfo=timezone.utc)


def _when(item):
    t = item.get("timestamp")
    if t is None:
        return _OLDEST
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


@router.get("/activity")
def get_activity(limit: int = 300, user_email: str = Depends(get_required_user_email)):
    limit = max(1, min(limit, 500))
    items = []

    for record in db.prediction_history.find({"user_email": user_email}, {"_id": 0}).sort("timestamp", -1).limit(limit):
        items.append({
            "kind": "prediction",
            "timestamp": record.get("timestamp"),
            "title": f"{record.get('drug1')} × {record.get('drug2')}",
            "record": record,  # the full saved result, so History can reopen it
        })

    for doc in db.user_activity.find({"user_email": user_email}, {"_id": 0}).sort("timestamp", -1).limit(limit):
        items.append({
            "kind": doc.get("kind"),
            "timestamp": doc.get("timestamp"),
            "title": doc.get("title"),
            "data": doc.get("data", {}),
        })

    items.sort(key=_when, reverse=True)
    return {"items": items[:limit]}
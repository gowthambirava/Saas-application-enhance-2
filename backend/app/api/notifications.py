from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.services.notification_service import (
    get_user_notifications, get_unread_count,
    mark_all_read, mark_one_read
)
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    notifications = get_user_notifications(db, user.id, skip=skip, limit=limit)
    unread = get_unread_count(db, user.id)
    return {"items": notifications, "unread_count": unread}


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"unread_count": get_unread_count(db, user.id)}


@router.post("/mark-all-read")
def mark_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    mark_all_read(db, user.id)
    return {"message": "All notifications marked as read"}


@router.post("/{notification_id}/read")
def mark_one(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    notif = mark_one_read(db, notification_id, user.id)
    if not notif:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.subscription import Subscription
from app.models.project import Project
from app.models.activity import ProjectActivity
from app.services.notification_service import create_notification

router = APIRouter(tags=["Admin"])


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ✅ GET ALL USERS (paginated)
@router.get("/users")
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    users = db.query(User).offset(skip).limit(limit).all()
    total = db.query(User).count()
    return {
        "items": [{"id": u.id, "email": u.email, "role": u.role, "is_verified": u.is_verified, "created_at": u.created_at} for u in users],
        "total": total,
        "skip": skip,
        "limit": limit
    }


# ✅ GET ALL SUBSCRIPTIONS (paginated)
@router.get("/subscriptions")
def get_all_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    subs = db.query(Subscription).offset(skip).limit(limit).all()
    total = db.query(Subscription).count()
    return {
        "items": [{"id": s.id, "user_id": s.user_id, "plan": s.plan, "status": s.status} for s in subs],
        "total": total
    }


# ✅ USER + SUBSCRIPTION MAPPING
@router.get("/user-subscriptions")
def user_subscriptions(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    data = db.query(User, Subscription).join(
        Subscription, User.id == Subscription.user_id
    ).all()
    return [{"email": user.email, "plan": sub.plan, "status": sub.status} for user, sub in data]


# ✅ BASIC STATS
@router.get("/stats")
def subscription_stats(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    active = db.query(Subscription).filter(Subscription.status == "active").count()
    canceled = db.query(Subscription).filter(Subscription.status == "canceled").count()
    past_due = db.query(Subscription).filter(Subscription.status == "past_due").count()
    return {"active": active, "canceled": canceled, "past_due": past_due}


# ✅ ADVANCED ANALYTICS STATS
@router.get("/advanced-stats")
def advanced_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    total_users = db.query(User).count()

    free_users = db.query(User).outerjoin(Subscription).filter(
        (Subscription.plan == None) | (Subscription.plan == "free")
    ).count()

    pro_users = db.query(Subscription).filter(
        Subscription.plan == "pro",
        Subscription.status == "active"
    ).count()

    total_projects = db.query(Project).count()

    # Monthly registrations (last 6 months)
    monthly_regs = (
        db.query(
            extract('year', User.created_at).label('year'),
            extract('month', User.created_at).label('month'),
            func.count(User.id).label('count')
        )
        .group_by('year', 'month')
        .order_by('year', 'month')
        .limit(6)
        .all()
    )

    return {
        "total_users": total_users,
        "free_users": free_users,
        "pro_users": pro_users,
        "total_projects": total_projects,
        "monthly_registrations": [
            {"year": int(r.year), "month": int(r.month), "count": r.count}
            for r in monthly_regs
        ]
    }


# ✅ CANCEL USER SUBSCRIPTION
@router.post("/cancel/{user_id}")
def cancel_subscription(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    sub.status = "canceled"
    db.commit()

    create_notification(
        db, user_id,
        title="Subscription Canceled",
        message="Your subscription has been canceled by an administrator.",
        type="billing"
    )
    return {"message": "Subscription canceled"}


# ✅ SEND SYSTEM NOTIFICATION TO ALL USERS
@router.post("/notify-all")
def notify_all_users(
    title: str,
    message: str,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    users = db.query(User).all()
    for u in users:
        create_notification(db, u.id, title=title, message=message, type="system")
    return {"message": f"Notification sent to {len(users)} users"}

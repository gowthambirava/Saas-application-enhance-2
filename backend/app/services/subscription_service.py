from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.subscription import Subscription
from app.models.project import Project



def get_project_limit(plan: str):
    if plan == "free":
        return 3
    elif plan == "pro":
        return 10
    elif plan == "enterprise":
        return 100
    return 3


def create_subscription(db: Session, user_id: int, plan: str = "free"):
    sub = Subscription(
        user_id=user_id,
        plan=plan,
        status="active"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def check_project_limit(db: Session, user_id: int):
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.status == "active"
    ).first()

    if not sub:
        sub = create_subscription(db, user_id)

    project_count = db.query(Project).filter(
        Project.owner_id == user_id
    ).count()

    limit = get_project_limit(sub.plan)

    if project_count >= limit:
        raise HTTPException(
            status_code=400,
            detail=f"Project limit reached ({limit}). Upgrade plan."
        )

    return True
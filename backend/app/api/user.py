from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.subscription import Subscription
from app.models.project import Project
from app.models.team import TeamMember, Team
from app.services.activity_service import get_user_recent_activities

router = APIRouter(tags=["User"])


@router.get("/profile")
def get_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(
        Subscription.user_id == user.id
    ).first()

    total_projects = db.query(Project).filter(Project.owner_id == user.id).count()

    team_count = db.query(TeamMember).filter(
        TeamMember.user_id == user.id,
        TeamMember.status == "accepted"
    ).count()

    recent_activities = get_user_recent_activities(db, user.id, limit=5)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "subscription": {
            "plan": sub.plan if sub else "free",
            "status": sub.status if sub else "inactive"
        },
        "analytics": {
            "total_projects": total_projects,
            "team_memberships": team_count,
        },
        "recent_activity": [
            {
                "project_id": a.project_id,
                "action": a.action,
                "timestamp": a.timestamp
            }
            for a in recent_activities
        ]
    }

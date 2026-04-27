from sqlalchemy.orm import Session
from app.models.activity import ProjectActivity


def log_activity(db: Session, project_id: int, user_id: int, action: str):
    activity = ProjectActivity(
        project_id=project_id,
        user_id=user_id,
        action=action
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def get_project_activities(db: Session, project_id: int, skip: int = 0, limit: int = 20):
    return (
        db.query(ProjectActivity)
        .filter(ProjectActivity.project_id == project_id)
        .order_by(ProjectActivity.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_user_recent_activities(db: Session, user_id: int, limit: int = 10):
    return (
        db.query(ProjectActivity)
        .filter(ProjectActivity.user_id == user_id)
        .order_by(ProjectActivity.timestamp.desc())
        .limit(limit)
        .all()
    )

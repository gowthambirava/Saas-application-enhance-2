from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.project import Project
from app.models.subscription import Subscription
from app.services.activity_service import log_activity
from app.services.notification_service import create_notification


def get_project_limit(plan: str):
    if plan == "free":
        return 3
    elif plan == "pro":
        return 10
    elif plan == "enterprise":
        return 100
    return 3


def check_project_limit(db: Session, user_id: int):
    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id
    ).first()

    if not sub:
        raise HTTPException(status_code=400, detail="No subscription found")

    count = db.query(Project).filter(Project.owner_id == user_id).count()
    limit = get_project_limit(sub.plan)

    if count >= limit:
        raise HTTPException(
            status_code=400,
            detail=f"Project limit reached ({limit})"
        )


def create_project(db: Session, project, user_id: int):
    check_project_limit(db, user_id)

    new_project = Project(
        name=project.name,
        description=project.description,
        owner_id=user_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Log activity
    log_activity(db, new_project.id, user_id, "created")

    # Notify
    create_notification(
        db, user_id,
        title="Project Created",
        message=f"Project '{new_project.name}' was created successfully.",
        type="info"
    )

    return new_project


def get_projects(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return (
        db.query(Project)
        .filter(Project.owner_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_projects_count(db: Session, user_id: int) -> int:
    return db.query(Project).filter(Project.owner_id == user_id).count()


def get_project(db: Session, project_id: int, user_id: int):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


def update_project(db: Session, project_id: int, data, user_id: int):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in data.dict().items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    # Log activity
    log_activity(db, project.id, user_id, "updated")

    create_notification(
        db, user_id,
        title="Project Updated",
        message=f"Project '{project.name}' was updated.",
        type="info"
    )

    return project


def delete_project(db: Session, project_id: int, user_id: int):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_name = project.name

    # Log before delete
    log_activity(db, project.id, user_id, "deleted")

    db.delete(project)
    db.commit()

    create_notification(
        db, user_id,
        title="Project Deleted",
        message=f"Project '{project_name}' was deleted.",
        type="alert"
    )

    return {"message": "Project deleted"}

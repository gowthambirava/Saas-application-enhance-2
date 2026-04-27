from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.schemas.project import ProjectCreate
from app.services.project_service import (
    create_project, get_projects, get_projects_count,
    get_project, update_project, delete_project
)
from app.services.activity_service import get_project_activities
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/")
def create(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return create_project(db, project, user.id)


@router.get("/")
def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    projects = get_projects(db, user.id, skip=skip, limit=limit)
    total = get_projects_count(db, user.id)
    return {"items": projects, "total": total, "skip": skip, "limit": limit}


@router.get("/{project_id}")
def get_one(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_project(db, project_id, user.id)


@router.put("/{project_id}")
def update(
    project_id: int,
    data: ProjectCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return update_project(db, project_id, data, user.id)


@router.delete("/{project_id}")
def delete(
    project_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return delete_project(db, project_id, user.id)


@router.get("/{project_id}/activity")
def get_activity(
    project_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Verify ownership
    get_project(db, project_id, user.id)
    activities = get_project_activities(db, project_id, skip=skip, limit=limit)
    return activities

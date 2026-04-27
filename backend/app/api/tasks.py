from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import json

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate
from app.schemas.saved_filter import SavedFilterCreate
from app.services import task_service, filter_service

router = APIRouter(tags=["Tasks"])


def _role(user) -> str:
    return getattr(user, "role", "user")


# ─── Module 1: Task CRUD ──────────────────────────────────────────────────────
@router.post("/projects/{project_id}/tasks")
def create_task(project_id: int, data: TaskCreate,
                db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.create_task(db, project_id, data, user.id, _role(user))


@router.get("/projects/{project_id}/tasks")
def list_tasks(
    project_id: int,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee: Optional[int] = Query(None),
    due_before: Optional[datetime] = Query(None),
    overdue_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    tasks = task_service.list_tasks(
        db, project_id, user.id, _role(user),
        status=status, priority=priority, assignee=assignee,
        due_before=due_before, overdue_only=overdue_only,
        skip=skip, limit=limit
    )
    return {"items": tasks, "total": len(tasks)}


@router.get("/tasks/overdue")
def overdue_tasks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.get_overdue_tasks(db, user.id, _role(user))


@router.get("/tasks/due-today")
def due_today(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.get_tasks_due_today(db, user.id, _role(user))


@router.get("/tasks/due-week")
def due_week(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.get_tasks_due_this_week(db, user.id, _role(user))


@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.get_task(db, task_id, user.id, _role(user))


@router.put("/tasks/{task_id}")
def update_task(task_id: int, data: TaskUpdate,
                db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.update_task(db, task_id, data, user.id, _role(user))


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.delete_task(db, task_id, user.id, _role(user))


# ─── Module 2: Workflow ───────────────────────────────────────────────────────
@router.patch("/tasks/{task_id}/status")
def change_status(task_id: int, data: TaskStatusUpdate,
                  db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.change_task_status(db, task_id, data.status, user.id, _role(user))


# ─── Module 3: Saved Filters ─────────────────────────────────────────────────
@router.post("/filters")
def save_filter(data: SavedFilterCreate,
                db: Session = Depends(get_db), user=Depends(get_current_user)):
    return filter_service.save_filter(db, user.id, data.name, data.filters_json)


@router.get("/filters")
def list_filters(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return filter_service.get_filters(db, user.id)


@router.delete("/filters/{filter_id}")
def delete_filter(filter_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return filter_service.delete_filter(db, filter_id, user.id)


@router.get("/filters/{filter_id}/apply")
def apply_filter(filter_id: int,
                 skip: int = Query(0), limit: int = Query(20),
                 db: Session = Depends(get_db), user=Depends(get_current_user)):
    saved = filter_service.get_filter_by_id(db, filter_id, user.id)
    params = json.loads(saved.filters_json)
    # Return the filter params so client can re-query with them
    return {"filter": params, "message": "Apply these params to GET /projects/{id}/tasks"}


# ─── Module 6: Task Activities ────────────────────────────────────────────────
@router.get("/tasks/{task_id}/activities")
def get_activities(task_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return task_service.get_task_activities(db, task_id, user.id, _role(user))

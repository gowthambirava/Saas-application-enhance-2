from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException
from datetime import datetime, date
import json

from app.models.task import Task
from app.models.task_activity import TaskActivity
from app.models.project import Project
from app.models.team import TeamMember

# ─── Workflow Transitions ────────────────────────────────────────────────────
ALLOWED_TRANSITIONS = {
    "todo": ["in_progress"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress"],
    "done": [],  # terminal — only admin/owner can revert
}


def can_access_project(db: Session, project_id: int, user_id: int):
    """Return True if user is owner or team member of the project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False
    if project.owner_id == user_id:
        return True
    # Check team membership — simplified: any TeamMember row for this user
    member = db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.status == "accepted"
    ).first()
    return member is not None


def get_project_or_403(db: Session, project_id: int, user_id: int, user_role: str = "user"):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user_role == "admin":
        return project
    if project.owner_id != user_id and not can_access_project(db, project_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return project


def get_task_or_404(db: Session, task_id: int):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _log_task_activity(db: Session, task_id: int, user_id: int, action: str, old=None, new=None):
    entry = TaskActivity(
        task_id=task_id,
        user_id=user_id,
        action=action,
        old_value_json=json.dumps(old) if old is not None else None,
        new_value_json=json.dumps(new) if new is not None else None,
    )
    db.add(entry)


# ─── CRUD ────────────────────────────────────────────────────────────────────
def create_task(db: Session, project_id: int, data, user_id: int, user_role: str = "user"):
    get_project_or_403(db, project_id, user_id, user_role)
    task = Task(
        project_id=project_id,
        title=data.title,
        description=data.description,
        status="todo",
        priority=data.priority or "medium",
        assigned_to=data.assigned_to,
        created_by=user_id,
        due_date=data.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _log_task_activity(db, task.id, user_id, "created", new={"title": task.title})
    db.commit()
    return task


def list_tasks(db: Session, project_id: int, user_id: int, user_role: str = "user",
               status=None, priority=None, assignee=None,
               due_before=None, overdue_only=False,
               skip=0, limit=20):
    get_project_or_403(db, project_id, user_id, user_role)
    q = db.query(Task).filter(Task.project_id == project_id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if assignee:
        q = q.filter(Task.assigned_to == assignee)
    if due_before:
        q = q.filter(Task.due_date <= due_before)
    if overdue_only:
        q = q.filter(Task.due_date < datetime.utcnow(), Task.status != "done")
    return q.offset(skip).limit(limit).all()


def get_task(db: Session, task_id: int, user_id: int, user_role: str = "user"):
    task = get_task_or_404(db, task_id)
    get_project_or_403(db, task.project_id, user_id, user_role)
    return task


def update_task(db: Session, task_id: int, data, user_id: int, user_role: str = "user"):
    task = get_task_or_404(db, task_id)
    get_project_or_403(db, task.project_id, user_id, user_role)

    old = {k: str(getattr(task, k)) for k in ["title", "description", "priority", "status", "assigned_to"]}
    update_data = data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(task, key, value)

    if "status" in update_data and update_data["status"] == "done":
        task.completed_at = datetime.utcnow()

    new = {k: str(getattr(task, k)) for k in ["title", "description", "priority", "status", "assigned_to"]}
    db.commit()
    db.refresh(task)
    _log_task_activity(db, task.id, user_id, "updated", old=old, new=new)
    db.commit()
    return task


def delete_task(db: Session, task_id: int, user_id: int, user_role: str = "user"):
    task = get_task_or_404(db, task_id)
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if user_role != "admin" and project.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner or admin can delete tasks")

    _log_task_activity(db, task.id, user_id, "deleted", old={"title": task.title})
    db.commit()
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


# ─── Module 2: Workflow ───────────────────────────────────────────────────────
def change_task_status(db: Session, task_id: int, new_status: str, user_id: int, user_role: str = "user"):
    task = get_task_or_404(db, task_id)
    get_project_or_403(db, task.project_id, user_id, user_role)

    allowed = ALLOWED_TRANSITIONS.get(task.status, [])
    is_privileged = user_role in ("admin",) or _is_project_owner(db, task.project_id, user_id)

    if new_status not in allowed and not is_privileged:
        raise HTTPException(
            status_code=400,
            detail=f"Transition from '{task.status}' to '{new_status}' is not allowed"
        )

    old_status = task.status
    task.status = new_status
    if new_status == "done":
        task.completed_at = datetime.utcnow()
    elif old_status == "done":
        task.completed_at = None

    db.commit()
    db.refresh(task)
    _log_task_activity(db, task.id, user_id, "status_changed",
                       old={"status": old_status}, new={"status": new_status})
    db.commit()
    return task


def _is_project_owner(db: Session, project_id: int, user_id: int):
    project = db.query(Project).filter(Project.id == project_id).first()
    return project and project.owner_id == user_id


# ─── Module 4: Deadline/Overdue ───────────────────────────────────────────────
def get_overdue_tasks(db: Session, user_id: int, user_role: str = "user"):
    now = datetime.utcnow()
    q = db.query(Task).filter(Task.due_date < now, Task.status != "done")
    if user_role != "admin":
        # Filter to projects the user owns or is a member of
        owned = db.query(Project.id).filter(Project.owner_id == user_id)
        q = q.filter(Task.project_id.in_(owned))
    return q.all()


def get_tasks_due_today(db: Session, user_id: int, user_role: str = "user"):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    q = db.query(Task).filter(Task.due_date >= today_start, Task.due_date <= today_end, Task.status != "done")
    if user_role != "admin":
        owned = db.query(Project.id).filter(Project.owner_id == user_id)
        q = q.filter(Task.project_id.in_(owned))
    return q.all()


def get_tasks_due_this_week(db: Session, user_id: int, user_role: str = "user"):
    from datetime import timedelta
    now = datetime.utcnow()
    week_end = now + timedelta(days=7)
    q = db.query(Task).filter(Task.due_date >= now, Task.due_date <= week_end, Task.status != "done")
    if user_role != "admin":
        owned = db.query(Project.id).filter(Project.owner_id == user_id)
        q = q.filter(Task.project_id.in_(owned))
    return q.all()


# ─── Module 6: Activity ───────────────────────────────────────────────────────
def get_task_activities(db: Session, task_id: int, user_id: int, user_role: str = "user"):
    task = get_task_or_404(db, task_id)
    get_project_or_403(db, task.project_id, user_id, user_role)
    return (
        db.query(TaskActivity)
        .filter(TaskActivity.task_id == task_id)
        .order_by(TaskActivity.created_at.desc())
        .all()
    )

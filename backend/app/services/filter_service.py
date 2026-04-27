import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.saved_filter import SavedFilter


def save_filter(db: Session, user_id: int, name: str, filters_json: str):
    f = SavedFilter(user_id=user_id, name=name, filters_json=filters_json)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def get_filters(db: Session, user_id: int):
    return db.query(SavedFilter).filter(SavedFilter.user_id == user_id).all()


def delete_filter(db: Session, filter_id: int, user_id: int):
    f = db.query(SavedFilter).filter(SavedFilter.id == filter_id, SavedFilter.user_id == user_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Filter not found")
    db.delete(f)
    db.commit()
    return {"message": "Filter deleted"}


def get_filter_by_id(db: Session, filter_id: int, user_id: int):
    f = db.query(SavedFilter).filter(SavedFilter.id == filter_id, SavedFilter.user_id == user_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Filter not found")
    return f

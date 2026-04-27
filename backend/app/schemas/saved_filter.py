from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SavedFilterCreate(BaseModel):
    name: str
    filters_json: str


class SavedFilterOut(BaseModel):
    id: int
    user_id: int
    name: str
    filters_json: str
    created_at: datetime

    class Config:
        from_attributes = True

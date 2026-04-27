from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id: int
    title: str
    message: Optional[str]
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

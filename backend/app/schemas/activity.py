from pydantic import BaseModel
from datetime import datetime


class ActivityOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True

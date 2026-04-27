from pydantic import BaseModel
from typing import Optional




# ✅ Response schema (what API returns)
class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan: str
    status: str

    class Config:
       
     from_attributes = True
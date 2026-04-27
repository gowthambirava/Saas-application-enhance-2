from pydantic import BaseModel
from typing import Optional


class TeamCreate(BaseModel):
    name: str


class InviteMember(BaseModel):
    email: str


class InviteResponse(BaseModel):
    action: str  # accept | decline

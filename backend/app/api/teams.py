from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.team import TeamCreate, InviteMember, InviteResponse
from app.services.team_service import (
    create_team, get_my_teams, get_team, invite_member,
    respond_to_invite, get_team_members, remove_member, get_pending_invitations
)
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("/")
def create(data: TeamCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return create_team(db, data.name, user.id)


@router.get("/")
def my_teams(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_my_teams(db, user.id)


@router.get("/invitations")
def pending_invites(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_pending_invitations(db, user.id)


@router.get("/{team_id}")
def get_one(team_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_team(db, team_id, user.id)


@router.get("/{team_id}/members")
def members(team_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_team_members(db, team_id, user.id)


@router.post("/{team_id}/invite")
def invite(
    team_id: int,
    data: InviteMember,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return invite_member(db, team_id, user.id, data.email)


@router.post("/{team_id}/respond")
def respond(
    team_id: int,
    data: InviteResponse,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return respond_to_invite(db, team_id, user.id, data.action)


@router.delete("/{team_id}/members/{target_user_id}")
def remove(
    team_id: int,
    target_user_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return remove_member(db, team_id, user.id, target_user_id)

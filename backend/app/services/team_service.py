from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.team import Team, TeamMember
from app.models.user import User
from app.services.notification_service import create_notification


def create_team(db: Session, name: str, owner_id: int):
    team = Team(name=name, owner_id=owner_id)
    db.add(team)
    db.commit()
    db.refresh(team)

    # Owner is also a member
    member = TeamMember(team_id=team.id, user_id=owner_id, role="owner", status="accepted")
    db.add(member)
    db.commit()

    return team


def get_my_teams(db: Session, user_id: int):
    memberships = db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.status == "accepted"
    ).all()
    team_ids = [m.team_id for m in memberships]
    return db.query(Team).filter(Team.id.in_(team_ids)).all()


def get_team(db: Session, team_id: int, user_id: int):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
        TeamMember.status == "accepted"
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    return team


def invite_member(db: Session, team_id: int, inviter_id: int, email: str):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.owner_id != inviter_id:
        raise HTTPException(status_code=403, detail="Only team owners can invite members")

    invitee = db.query(User).filter(User.email == email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User with that email not found")

    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == invitee.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already invited or a member")

    member = TeamMember(team_id=team_id, user_id=invitee.id, role="member", status="pending")
    db.add(member)
    db.commit()

    create_notification(
        db, invitee.id,
        title="Team Invitation",
        message=f"You have been invited to join team '{team.name}'.",
        type="info"
    )

    return {"message": f"Invitation sent to {email}"}


def respond_to_invite(db: Session, team_id: int, user_id: int, action: str):
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
        TeamMember.status == "pending"
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No pending invitation found")

    team = db.query(Team).filter(Team.id == team_id).first()

    if action == "accept":
        membership.status = "accepted"
        db.commit()
        create_notification(
            db, team.owner_id,
            title="Invitation Accepted",
            message=f"A user accepted your invitation to team '{team.name}'.",
            type="info"
        )
        return {"message": "Invitation accepted"}
    elif action == "decline":
        membership.status = "declined"
        db.commit()
        return {"message": "Invitation declined"}
    else:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'decline'")


def get_team_members(db: Session, team_id: int, user_id: int):
    get_team(db, team_id, user_id)  # validates membership
    members = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.status == "accepted"
    ).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({"user_id": m.user_id, "email": user.email if user else "", "role": m.role})
    return result


def remove_member(db: Session, team_id: int, owner_id: int, target_user_id: int):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Only team owners can remove members")
    if target_user_id == owner_id:
        raise HTTPException(status_code=400, detail="Owner cannot remove themselves")

    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == target_user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed"}


def get_pending_invitations(db: Session, user_id: int):
    pending = db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.status == "pending"
    ).all()
    result = []
    for m in pending:
        team = db.query(Team).filter(Team.id == m.team_id).first()
        result.append({"team_id": m.team_id, "team_name": team.name if team else "", "invited_at": m.invited_at})
    return result

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.services.auth_service import register_user, login_user, verify_email, refresh_access_token
from app.schemas.user import UserCreate
from app.core.database import get_db
from app.core.rate_limiter import check_login_rate_limit, clear_login_attempts

router = APIRouter(prefix="/auth", tags=["Auth"])


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, user.role, user.email, user.password)


@router.get("/verify-email")
def verify(token: str, db: Session = Depends(get_db)):
    return verify_email(db, token)


@router.post("/login")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    ip = request.client.host
    check_login_rate_limit(ip)

    user_data = {"email": form_data.username, "password": form_data.password}
    result = login_user(db, user_data)

    # Clear rate limit on success
    clear_login_attempts(ip)
    return result


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return refresh_access_token(db, body.refresh_token)

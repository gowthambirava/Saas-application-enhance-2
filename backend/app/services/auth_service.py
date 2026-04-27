from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User
from app.models.subscription import Subscription
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    generate_verification_token
)


def register_user(db: Session, role: str, email: str, password: str):
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = generate_verification_token()

    new_user = User(
        email=email,
        password=hash_password(password),
        role=role,
        is_verified=False,
        verification_token=verification_token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create free subscription
    new_subscription = Subscription(
        user_id=new_user.id,
        plan="free",
        status="active"
    )
    db.add(new_subscription)
    db.commit()

    # In production, send verification email here
    # For now, return token in response for testing
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "verification_token": verification_token,
        "message": "Registered. Please verify your email."
    }


def verify_email(db: Session, token: str):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully"}


def login_user(db: Session, user_data: dict):
    db_user = db.query(User).filter(User.email == user_data["email"]).first()

    if not db_user or not verify_password(user_data["password"], db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Optional: enforce email verification
    # if not db_user.is_verified:
    #     raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token({"user_id": db_user.id})
    refresh_token = create_refresh_token({"user_id": db_user.id})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": db_user.role
    }


def refresh_access_token(db: Session, refresh_token: str):
    from app.core.security import verify_refresh_token
    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token({"user_id": user.id})
    return {"access_token": new_access_token, "token_type": "bearer"}

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import secrets

# Password hashing config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Secrets (⚠️ In production, use environment variables)
SECRET_KEY = "supersecretkey"
REFRESH_SECRET_KEY = "superrefreshsecretkey"
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ---------------------------
# Password Functions
# ---------------------------

def hash_password(password: str):
    # 🔥 Fix: bcrypt max length = 72 bytes
    password = password[:72]
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    # 🔥 Fix: same truncation during verification
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------
# Token Functions
# ---------------------------

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "type": "access"
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })

    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "refresh":
            return None

        return payload

    except JWTError:
        return None


# ---------------------------
# Utility
# ---------------------------

def generate_verification_token():
    return secrets.token_urlsafe(32)
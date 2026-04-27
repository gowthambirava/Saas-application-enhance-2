from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "user"


class UserLogin(BaseModel):
    email: str
    password: str

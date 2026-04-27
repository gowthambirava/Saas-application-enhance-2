from sqlalchemy import Column, Integer, String, ForeignKey, Index
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    description = Column(String(255), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True)

    __table_args__ = (
        Index("ix_projects_owner_id", "owner_id"),
    )

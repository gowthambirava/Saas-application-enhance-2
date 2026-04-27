from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    status = Column(String(50))  # active, canceled, etc.
    plan = Column(String(50))    # basic, pro
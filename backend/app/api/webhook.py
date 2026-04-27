import stripe
from fastapi import APIRouter, Request, HTTPException
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.subscription import Subscription
from fastapi import Depends
import os

endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
router = APIRouter()

# 🔐 Add your Stripe secret
endpoint_secret = "whsec_1d9a786c446b104de17aa0c40d297b98fb7f36c42a7e1e484be8cbe8c079a2e1"

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 🔥 HANDLE EVENTS

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        customer_id = session.get("customer")

        sub = db.query(Subscription).filter(
            Subscription.stripe_customer_id == customer_id
        ).first()

        if sub:
            sub.plan = "pro"
            sub.status = "active"
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        data = event["data"]["object"]

        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == data["id"]
        ).first()

        if sub:
            sub.status = "canceled"
            db.commit()

    elif event["type"] == "invoice.payment_failed":
        data = event["data"]["object"]

        sub = db.query(Subscription).filter(
            Subscription.stripe_customer_id == data["customer"]
        ).first()

        if sub:
            sub.status = "past_due"
            db.commit()

    return {"status": "success"}
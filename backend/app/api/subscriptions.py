from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.config import STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
from app.models.subscription import Subscription
from app.models.user import User
from app.core.stripe_client import get_stripe_client

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# ✅ Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY


# ================================
# ✅ CREATE CHECKOUT SESSION
# ================================
@router.post("/create-checkout-session")
def create_checkout_session(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stripe_client = get_stripe_client()

    # ✅ Create Stripe customer if not exists
    if not user.stripe_customer_id:
        customer = stripe_client.Customer.create(
            email=user.email
        )
        user.stripe_customer_id = customer.id
        db.commit()
        db.refresh(user)

    # ✅ Create checkout session
    session = stripe_client.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer=user.stripe_customer_id,
        line_items=[{
            "price": STRIPE_PRICE_ID,
            "quantity": 1,
        }],
        success_url="http://localhost:5173/success",
        cancel_url="http://localhost:5173/cancel",
    )

    return {"checkout_url": session.url}


# ================================
# ✅ STRIPE WEBHOOK (SECURE)
# ================================
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # ✅ HANDLE CHECKOUT SUCCESS
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        user = db.query(User).filter(
            User.stripe_customer_id == customer_id
        ).first()

        if user:
            existing_sub = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).first()

            if existing_sub:
                existing_sub.status = "active"
                existing_sub.stripe_subscription_id = subscription_id
                existing_sub.plan = "pro"
            else:
                new_sub = Subscription(
                    user_id=user.id,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    status="active",
                    plan="pro"
                )
                db.add(new_sub)

            db.commit()

    # ✅ HANDLE CANCEL EVENT
    if event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]

        db_sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == sub_data["id"]
        ).first()

        if db_sub:
            db_sub.status = "canceled"
            db.commit()

    return {"status": "success"}


# ================================
# ✅ CANCEL SUBSCRIPTION
# ================================
@router.post("/cancel-subscription")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    sub = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == "active"
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")

    try:
        stripe.Subscription.delete(sub.stripe_subscription_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    sub.status = "canceled"
    db.commit()

    return {"message": "Subscription canceled successfully"}


# ================================
# ✅ GET CURRENT USER SUBSCRIPTION
# ================================
@router.get("/me")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    sub = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    ).first()

    if not sub:
        return {
            "plan": "free",
            "status": "inactive"
        }

    return {
        "plan": sub.plan,
        "status": sub.status
    }
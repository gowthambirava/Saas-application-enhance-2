import stripe
from fastapi import HTTPException, status, utils
 
from app.config import STRIPE_SECRET_KEY
from app.core.dependencies import get_current_user
 
 
def get_stripe_client():
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe secret key is not configured.",
        )

    stripe.api_key = STRIPE_SECRET_KEY
    return stripe
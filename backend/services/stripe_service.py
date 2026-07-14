import os
from typing import Literal
from stripe import StripeError, checkout

# Placeholder Stripe price IDs – replace with real IDs in production
def get_price_id(tier: Literal['basic', 'pro', 'enterprise']) -> str:
    price_map = {
        'basic': os.getenv('STRIPE_PRICE_BASIC', 'price_1BasicPlaceholder'),
        'pro': os.getenv('STRIPE_PRICE_PRO', 'price_1ProPlaceholder'),
        'enterprise': os.getenv('STRIPE_PRICE_ENTERPRISE', 'price_1EnterprisePlaceholder'),
    }
    return price_map[tier]

def create_checkout_session(tier: Literal['basic', 'pro', 'enterprise'], success_url: str, cancel_url: str):
    import stripe
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    price_id = get_price_id(tier)
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription' if tier != 'basic' else 'payment',
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session
    except StripeError as e:
        raise RuntimeError(f"Stripe error: {e.user_message}")

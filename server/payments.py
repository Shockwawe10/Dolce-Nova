"""The two places this server touches Stripe: creating a hosted Checkout Session and verifying webhooks."""
import json
import time

import stripe

SESSION_LIFETIME_S = 30 * 60  # Stripe's minimum expires_at window


class BadWebhook(Exception):
    pass


def verify_event(body: bytes, header: str, secret: str) -> dict:
    """Verify the Stripe-Signature over the exact raw body (300 s tolerance), then parse it."""
    try:
        stripe.WebhookSignature.verify_header(body, header, secret, stripe.Webhook.DEFAULT_TOLERANCE)
        event = json.loads(body)
        session = event["data"]["object"]
        if not isinstance(event["id"], str) or not isinstance(event["type"], str) or not isinstance(session, dict):
            raise ValueError("unexpected event shape")
        return event
    except (stripe.SignatureVerificationError, ValueError, KeyError, TypeError, UnicodeDecodeError) as e:
        raise BadWebhook(str(e)) from None


class StripeGateway:
    def __init__(self, secret_key, public_base_url):
        self.client = stripe.StripeClient(secret_key)
        self.base = public_base_url

    def create_session(self, order_id, lines, total_cents):
        params = {
            "mode": "payment",
            "payment_method_types": ["card"],
            "line_items": [{
                "quantity": l["quantity"],
                "price_data": {"currency": "eur", "unit_amount": l["unit_cents"], "product_data": {"name": l["name"]}},
            } for l in lines],
            "client_reference_id": order_id,
            "metadata": {"order_id": order_id, "total_cents": str(total_cents)},
            "expires_at": int(time.time()) + SESSION_LIFETIME_S,
            "success_url": f"{self.base}/success?order={order_id}",
            "cancel_url": f"{self.base}/cancel?order={order_id}",
        }
        s = self.client.v1.checkout.sessions.create(params, {"idempotency_key": f"checkout-{order_id}"})
        return {"id": s.id, "url": s.url}

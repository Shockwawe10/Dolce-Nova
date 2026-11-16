# ORDERS.md — commerce contract

Written before any commerce code. The code in `server/` implements exactly this; the tests in
`tests/test_commerce.py` check it from the outside (real HTTP calls against a running server).

Sources read on 2026-11-16 (Stripe docs, current at that date):

- Fulfillment with Checkout: <https://docs.stripe.com/checkout/fulfillment?ui=full-page>
- Set up events / signature checking: <https://docs.stripe.com/events/set-up-events>
- Manage webhook endpoints (duplicates, retries): <https://docs.stripe.com/events/manage-webhook-endpoints>
- Testing (card numbers): <https://docs.stripe.com/testing>
- Installed SDK: `stripe` 17.0.0 for Python; `stripe.Webhook.DEFAULT_TOLERANCE = 300` seconds (read from source).

## 1. Rules

1. **The client sends no money.** A cart line is `product_id`, `size`, `grind`, `quantity`. Any other
   field (price, amount, total, currency) is ignored. Unknown values are rejected, never coerced.
2. **Money is integer cents, EUR only.** Prices live in one file, `web/data/catalog.json`, read by the
   server at start-up and fetched by the page for display. The server recomputes every total.
3. **Only a signature-verified `checkout.session.completed` event makes an order `paid`**, and only when
   its `payment_status` is `paid`, its `currency` is `eur` and its `amount_total` equals our stored
   `total_cents`. The success page never changes state; it only reads it.
4. **Every webhook event is processed at most once**, keyed by Stripe's event id, inside one SQLite write
   transaction together with the state change it causes.
5. **Test mode only.** The server refuses to start with a live key (`sk_live_`, `rk_live_`).
   Secrets come only from environment variables.

## 2. Catalog and pricing

`web/data/catalog.json`:

```json
{
  "currency": "eur",
  "sizes":  { "250g": "250 g", "1kg": "1 kg" },
  "grinds": { "whole": "Whole bean", "espresso": "Espresso", "filter": "Filter", "cafetiere": "Cafetière" },
  "products": [ { "id": "…", "name": "…", "prices": { "250g": 1450, "1kg": 4900 }, "…": "display fields" } ]
}
```

Price depends on product and size; grind is a free choice. `price_cart(items, catalog)` is a pure
function: it validates, merges identical `(product_id, size, grind)` lines, and returns lines with
`unit_cents`, `line_cents = unit_cents * quantity` and `total_cents = Σ line_cents`.

Validation (any failure is `400 {"error": "<code>"}`, nothing is written):

| Check | Limit | Error code |
|---|---|---|
| body is JSON object with `items` list | body ≤ 8 KiB | `bad_request` |
| number of lines | 1 to 20 | `bad_cart` |
| `product_id` / `size` / `grind` | known strings | `unknown_product`, `unknown_size`, `unknown_grind` |
| `quantity` | integer 1 to 10 (booleans rejected) | `bad_quantity` |
| total quantity after merging | ≤ 30 | `bad_cart` |

## 3. API

All responses are JSON with `Cache-Control: no-store`.

| Method and path | Request | Response |
|---|---|---|
| `GET /api/health` | | `200 {"ok": true}` |
| `POST /api/checkout` | `{"items": [{"product_id", "size", "grind", "quantity"}]}` | `201 {"order_id", "checkout_url"}`; `400` validation; `415` not JSON; `502 {"error":"payment_provider"}` |
| `GET /api/orders/{order_id}` | | `200 {"order_id", "status", "currency", "total_cents", "lines": [...]}`; `404` |
| `POST /api/webhook` | raw Stripe body, `Stripe-Signature` header | `200 {"received": true}`; `400` bad payload or signature |

`order_id` is 128 random bits, URL-safe base64 (22 chars). It is the capability to read the order, so
it is never sequential.

### Checkout flow

1. Validate and price the cart (pure function). Generate `order_id`.
2. Create a Stripe Checkout Session (hosted page): `mode=payment`, `payment_method_types=["card"]`,
   one `price_data` line per order line (`currency=eur`, `unit_amount=unit_cents`), quantity,
   `client_reference_id=order_id`, `metadata.order_id=order_id`, `expires_at=now+30 min` (Stripe's
   minimum), `success_url={PUBLIC_BASE_URL}/success?order={order_id}`,
   `cancel_url={PUBLIC_BASE_URL}/cancel?order={order_id}`, idempotency key `checkout-{order_id}`.
3. Insert the order (`pending`, with `stripe_session_id`) and its lines in one transaction.
4. Return the session URL; the page redirects to it.

The session is created before the row is written, so a failed Stripe call leaves no orphan
`pending` order. A failed insert leaves only an unpaid session that Stripe expires on its own.
No webhook can arrive for that session before step 3: payment requires the URL, which the
client receives only after step 3.

Card-only is deliberate: it keeps `checkout.session.completed` final (`payment_status=paid`), so
delayed methods and `async_payment_succeeded` never come into play.

## 4. SQLite schema

```sql
CREATE TABLE orders (
  id                TEXT PRIMARY KEY,
  status            TEXT NOT NULL CHECK (status IN ('pending','paid','failed','expired')),
  currency          TEXT NOT NULL CHECK (currency = 'eur'),
  total_cents       INTEGER NOT NULL CHECK (total_cents > 0),
  stripe_session_id TEXT UNIQUE,
  created_at        INTEGER NOT NULL,          -- unix seconds
  updated_at        INTEGER NOT NULL
);
CREATE TABLE order_lines (
  order_id    TEXT NOT NULL REFERENCES orders(id),
  line_no     INTEGER NOT NULL,
  product_id  TEXT NOT NULL,
  size        TEXT NOT NULL,
  grind       TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_cents  INTEGER NOT NULL CHECK (unit_cents > 0),
  line_cents  INTEGER NOT NULL CHECK (line_cents = unit_cents * quantity),
  PRIMARY KEY (order_id, line_no)
);
CREATE TABLE stripe_events (                   -- idempotency ledger
  event_id    TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  order_id    TEXT,
  outcome     TEXT NOT NULL,                   -- applied | ignored:<reason>
  received_at INTEGER NOT NULL
);
CREATE TABLE order_transitions (               -- audit trail, one row per state change
  id          INTEGER PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  event_id    TEXT NOT NULL REFERENCES stripe_events(event_id),
  at          INTEGER NOT NULL
);
```

WAL mode; every webhook runs in `BEGIN IMMEDIATE`, so SQLite admits one writer at a time.

## 5. State machine

```
              checkout.session.completed (paid, eur, amount matches)
   pending ───────────────────────────────────────────────────────▶ paid   (absorbing)
      │  checkout.session.async_payment_failed ─▶ failed ──┐                ▲
      │  checkout.session.expired             ─▶ expired ─┴── completed ───┘
```

`next_status(current, event)` is a pure function:

| Current | `completed` (valid) | `async_payment_failed` | `expired` |
|---|---|---|---|
| `pending` | `paid` | `failed` | `expired` |
| `paid` | no change | no change | no change |
| `failed` | `paid` | no change | no change |
| `expired` | `paid` | no change | no change |

**Out-of-order delivery.** Stripe does not guarantee event order. A valid `completed` event is proof
that money moved, so it wins over an earlier-delivered `failed` or `expired`; nothing moves an order
out of `paid`. A `completed` event that fails the money check (wrong amount, currency or
`payment_status`) changes nothing and is recorded as `ignored:<reason>`.

## 6. Webhook processing

1. Read the raw body unchanged (nginx passes it untouched; see `deploy/nginx.conf`).
2. `stripe.Webhook.construct_event(body, header, STRIPE_WEBHOOK_SECRET)` with the default
   300-second tolerance. A missing, malformed, wrong or stale signature, or a body that is not JSON,
   is `400` and writes nothing.
3. `BEGIN IMMEDIATE`. Insert into `stripe_events`. A primary-key clash means a duplicate: roll back
   and answer `200` (Stripe stops retrying).
4. Find the order by `client_reference_id` (fallback `metadata.order_id`). Unknown order, event type
   we do not handle, or no state change: record `ignored:<reason>`.
5. Otherwise update `orders.status`, insert into `order_transitions`, record `applied`. Commit. `200`.

Subscribe the endpoint to exactly three events: `checkout.session.completed`,
`checkout.session.expired`, `checkout.session.async_payment_failed`. These are snapshot (v1) events.

Unlike Stripe's general advice, the success page does **not** trigger fulfillment; per this
project's brief only the webhook may mark an order paid. Stripe waits up to 10 s for the webhook
response before redirecting to `success_url` with hosted Checkout, so in practice the status is
usually already final when the page first polls.

## 7. Success and cancel pages

- `/success?order=<id>` polls `GET /api/orders/<id>` (1 s, then backing off to 4 s, for at most 90 s)
  and shows `pending` ("Confirming your payment"), `paid`, `failed` or `expired`. It clears the
  cart only when the status is `paid`.
- `/cancel?order=<id>` keeps the cart and offers to return to it. The order stays `pending` until
  Stripe sends `checkout.session.expired` (30 minutes after creation).

## 8. Manual test data (from docs.stripe.com/testing)

Expiry any future date (for example 12/34), any 3-digit CVC, any postcode.

| Case | Card | Expected order status |
|---|---|---|
| Success | `4242 4242 4242 4242` | `paid` |
| Decline | `4000 0000 0000 0002` (`card_declined`) | Checkout shows the error; order stays `pending`, then `expired` |
| 3-D Secure | `4000 0027 6000 3184` (always authenticate) | `paid` after completing the challenge |
| Abandoned | open Checkout, close it | `pending`, then `expired`; to avoid waiting 30 min: `stripe checkout sessions expire <cs_id>` |

## 9. Out of scope

No accounts, admin, stock, shipping, tax, refunds or emails. No delayed payment methods.

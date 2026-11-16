"""Commerce acceptance tests (ORDERS.md). Run: python -m unittest -v

Every test talks to a real server over HTTP the way the browser and Stripe do. Only the outbound
Stripe API call (create a Checkout Session) is replaced by FakeGateway. Webhooks are signed here
with our own HMAC-SHA256, independent of the stripe SDK the server uses to verify them.
"""
import hashlib
import hmac
import json
import random
import sqlite3
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from server.app import make_server
from server.config import Config

ROOT = Path(__file__).resolve().parent.parent
SECRET = "whsec_test_" + "x" * 24  # a test value made up here, not a Stripe secret

# Independent price table, typed by hand from the catalog's intent. If catalog.json drifts from it,
# the random-cart test fails, which is the point: a second, separate statement of every price.
PRICES = {
    "yirgacheffe": {"250g": 1450, "1kg": 4900},
    "huila": {"250g": 1250, "1kg": 4200},
    "nyeri": {"250g": 1650, "1kg": 5600},
    "huehuetenango": {"250g": 1300, "1kg": 4400},
    "cerrado": {"250g": 1150, "1kg": 3800},
    "decaf": {"250g": 1350, "1kg": 4500},
}
GRINDS = ["whole", "espresso", "filter", "cafetiere"]


class FakeGateway:
    """Stands in for Stripe's 'create Checkout Session' call and records what it was asked."""

    def __init__(self):
        self.calls = []
        self.fail = False

    def create_session(self, order_id, lines, total_cents):
        if self.fail:
            raise RuntimeError("stripe down")
        self.calls.append({"order_id": order_id, "lines": lines, "total_cents": total_cents})
        n = len(self.calls)
        return {"id": f"cs_test_fake{n}", "url": f"https://checkout.stripe.test/c/{n}"}


def sign(payload: bytes, secret=SECRET, at=None):
    t = int(time.time() if at is None else at)
    mac = hmac.new(secret.encode(), f"{t}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={t},v1={mac}"


def event(type_, order_id, *, event_id=None, amount=None, currency="eur", payment_status="paid"):
    obj = {
        "id": "cs_test_x",
        "object": "checkout.session",
        "client_reference_id": order_id,
        "metadata": {"order_id": order_id},
        "currency": currency,
        "amount_total": amount,
        "payment_status": payment_status,
    }
    return json.dumps({
        "id": event_id or f"evt_{random.getrandbits(64):x}",
        "object": "event",
        "type": type_,
        "data": {"object": obj},
    }).encode()


class ShopServer(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "shop.db"
        self.gw = FakeGateway()
        cfg = Config(
            stripe_secret_key="",  # not used: the gateway is fake
            webhook_secret=SECRET,
            public_base_url="https://shop.test",
            db_path=str(self.db),
            catalog_path=str(ROOT / "web" / "data" / "catalog.json"),
        )
        self.httpd = make_server(cfg, self.gw, host="127.0.0.1", port=0)
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp.cleanup()

    # -- helpers -------------------------------------------------------------------------------
    def req(self, method, path, body=None, headers=None):
        data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
        h = {"Content-Type": "application/json", **(headers or {})}
        r = urllib.request.Request(self.base + path, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(r, timeout=5) as resp:
                return resp.status, json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b"null")

    def checkout(self, items):
        return self.req("POST", "/api/checkout", {"items": items})

    def status(self, order_id):
        return self.req("GET", f"/api/orders/{order_id}")[1]["status"]

    def hook(self, payload, signature=None):
        return self.req("POST", "/api/webhook", payload, {"Stripe-Signature": signature or sign(payload)})

    def new_order(self):
        code, body = self.checkout([{"product_id": "huila", "size": "250g", "grind": "filter", "quantity": 2}])
        self.assertEqual(code, 201, body)
        return body["order_id"], 2 * 1250

    def rows(self, sql, *args):
        con = sqlite3.connect(self.db)
        try:
            return con.execute(sql, args).fetchall()
        finally:
            con.close()

    # -- pricing -------------------------------------------------------------------------------
    def test_50_random_carts_match_independent_cents_recomputation(self):
        rng = random.Random(20261116)
        for i in range(50):
            items = [{
                "product_id": rng.choice(list(PRICES)),
                "size": rng.choice(["250g", "1kg"]),
                "grind": rng.choice(GRINDS),
                "quantity": rng.randint(1, 3),
            } for _ in range(rng.randint(1, 6))]
            expected = sum(PRICES[x["product_id"]][x["size"]] * x["quantity"] for x in items)
            code, body = self.checkout(items)
            self.assertEqual(code, 201, (i, body))
            order = self.req("GET", f"/api/orders/{body['order_id']}")[1]
            self.assertEqual(order["total_cents"], expected, i)
            self.assertIsInstance(order["total_cents"], int)
            sent = self.gw.calls[-1]
            self.assertEqual(sent["total_cents"], expected, i)
            self.assertEqual(sum(l["unit_cents"] * l["quantity"] for l in sent["lines"]), expected, i)

    def test_tampered_price_fields_are_ignored(self):
        items = [{"product_id": "nyeri", "size": "1kg", "grind": "whole", "quantity": 1,
                  "price": 1, "unit_cents": 1, "unit_amount": 1, "amount": 1}]
        code, body = self.req("POST", "/api/checkout", {"items": items, "total": 1, "total_cents": 1, "currency": "usd"})
        self.assertEqual(code, 201, body)
        order = self.req("GET", f"/api/orders/{body['order_id']}")[1]
        self.assertEqual((order["total_cents"], order["currency"]), (5600, "eur"))
        self.assertEqual(self.gw.calls[-1]["lines"][0]["unit_cents"], 5600)

    def test_invalid_carts_are_rejected_and_write_nothing(self):
        bad = [
            [],
            [{"product_id": "nope", "size": "250g", "grind": "whole", "quantity": 1}],
            [{"product_id": "huila", "size": "5kg", "grind": "whole", "quantity": 1}],
            [{"product_id": "huila", "size": "250g", "grind": "sand", "quantity": 1}],
            [{"product_id": "huila", "size": "250g", "grind": "whole", "quantity": 0}],
            [{"product_id": "huila", "size": "250g", "grind": "whole", "quantity": 11}],
            [{"product_id": "huila", "size": "250g", "grind": "whole", "quantity": True}],
            [{"product_id": "huila", "size": "250g", "grind": "whole", "quantity": 1.5}],
            [{"product_id": "huila", "size": "250g", "grind": "whole", "quantity": "2"}],
        ]
        for items in bad:
            code, body = self.checkout(items)
            self.assertEqual(code, 400, (items, body))
        self.assertEqual(self.req("POST", "/api/checkout", b"not json")[0], 400)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM orders"), [(0,)])
        self.assertEqual(self.gw.calls, [])

    def test_identical_lines_merge(self):
        line = {"product_id": "decaf", "size": "250g", "grind": "espresso", "quantity": 2}
        code, body = self.checkout([line, dict(line)])
        self.assertEqual(code, 201)
        order = self.req("GET", f"/api/orders/{body['order_id']}")[1]
        self.assertEqual([(l["quantity"], l["line_cents"]) for l in order["lines"]], [(4, 5400)])

    def test_stripe_failure_leaves_no_order(self):
        self.gw.fail = True
        code, _ = self.checkout([{"product_id": "huila", "size": "250g", "grind": "filter", "quantity": 1}])
        self.assertEqual(code, 502)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM orders"), [(0,)])

    # -- webhook -------------------------------------------------------------------------------
    def test_valid_completed_event_marks_paid(self):
        oid, total = self.new_order()
        code, _ = self.hook(event("checkout.session.completed", oid, amount=total))
        self.assertEqual(code, 200)
        self.assertEqual(self.status(oid), "paid")

    def test_bad_signature_is_400_and_changes_nothing(self):
        oid, total = self.new_order()
        payload = event("checkout.session.completed", oid, amount=total)
        for sig in [sign(payload, secret="whsec_wrong"), "t=1,v1=deadbeef", "garbage", ""]:
            code, _ = self.hook(payload, signature=sig or " ")
            self.assertEqual(code, 400, sig)
        tampered = payload.replace(b'"paid"', b'"paid" ')
        self.assertEqual(self.hook(tampered, signature=sign(payload))[0], 400)
        self.assertEqual(self.status(oid), "pending")
        self.assertEqual(self.rows("SELECT COUNT(*) FROM stripe_events"), [(0,)])

    def test_stale_signature_is_400_and_changes_nothing(self):
        oid, total = self.new_order()
        payload = event("checkout.session.completed", oid, amount=total)
        code, _ = self.hook(payload, signature=sign(payload, at=time.time() - 301))
        self.assertEqual(code, 400)
        self.assertEqual(self.status(oid), "pending")
        self.assertEqual(self.rows("SELECT COUNT(*) FROM stripe_events"), [(0,)])

    def test_duplicate_event_gives_exactly_one_paid_transition(self):
        oid, total = self.new_order()
        payload = event("checkout.session.completed", oid, event_id="evt_dup1", amount=total)
        results = []
        threads = [threading.Thread(target=lambda: results.append(self.hook(payload)[0])) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(results, [200] * 8)
        self.assertEqual(self.status(oid), "paid")
        self.assertEqual(self.rows("SELECT from_status, to_status FROM order_transitions WHERE order_id=?", oid),
                         [("pending", "paid")])
        self.assertEqual(self.rows("SELECT COUNT(*) FROM stripe_events"), [(1,)])

    def test_out_of_order_expired_then_completed_ends_paid(self):
        oid, total = self.new_order()
        self.hook(event("checkout.session.expired", oid))
        self.assertEqual(self.status(oid), "expired")
        self.hook(event("checkout.session.completed", oid, amount=total))
        self.assertEqual(self.status(oid), "paid")

    def test_nothing_moves_an_order_out_of_paid(self):
        oid, total = self.new_order()
        self.hook(event("checkout.session.completed", oid, amount=total))
        self.hook(event("checkout.session.expired", oid))
        self.hook(event("checkout.session.async_payment_failed", oid))
        self.assertEqual(self.status(oid), "paid")
        self.assertEqual(len(self.rows("SELECT * FROM order_transitions WHERE order_id=?", oid)), 1)

    def test_async_failure_marks_failed(self):
        oid, _ = self.new_order()
        self.hook(event("checkout.session.async_payment_failed", oid))
        self.assertEqual(self.status(oid), "failed")

    def test_completed_with_wrong_money_does_not_mark_paid(self):
        oid, total = self.new_order()
        for ev in [event("checkout.session.completed", oid, amount=total - 1),
                   event("checkout.session.completed", oid, amount=total, currency="usd"),
                   event("checkout.session.completed", oid, amount=total, payment_status="unpaid")]:
            self.assertEqual(self.hook(ev)[0], 200)
        self.assertEqual(self.status(oid), "pending")
        outcomes = [r[0] for r in self.rows("SELECT outcome FROM stripe_events")]
        self.assertTrue(all(o.startswith("ignored:") for o in outcomes), outcomes)

    def test_event_for_unknown_order_is_acknowledged_and_ignored(self):
        code, _ = self.hook(event("checkout.session.completed", "nope", amount=100))
        self.assertEqual(code, 200)
        self.assertEqual(self.rows("SELECT outcome FROM stripe_events"), [("ignored:unknown_order",)])

    # -- success page contract -----------------------------------------------------------------
    def test_success_without_webhook_stays_pending(self):
        oid, _ = self.new_order()
        for _ in range(5):  # the success page polling
            self.assertEqual(self.status(oid), "pending")
        self.assertEqual(self.rows("SELECT COUNT(*) FROM order_transitions"), [(0,)])

    def test_unknown_order_is_404(self):
        self.assertEqual(self.req("GET", "/api/orders/doesnotexist")[0], 404)

    def test_order_ids_are_unguessable(self):
        a, _ = self.new_order()
        b, _ = self.new_order()
        self.assertGreaterEqual(len(a), 22)
        self.assertNotEqual(a, b)


if __name__ == "__main__":
    unittest.main()

"""HTTP layer: parse at the boundary, call the domain, answer JSON. nginx serves the static files."""
import json
import logging
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import orders
from .catalog import CartError, load_catalog, price_cart
from .payments import BadWebhook, verify_event

log = logging.getLogger("shop")
MAX_CHECKOUT_BODY = 8 * 1024
MAX_WEBHOOK_BODY = 256 * 1024
ORDER_PATH = re.compile(r"^/api/orders/([A-Za-z0-9_-]{1,64})$")


class ShopHandler(BaseHTTPRequestHandler):
    server_version = "shop"
    sys_version = ""

    # -- plumbing ------------------------------------------------------------------------------
    def log_message(self, fmt, *args):
        log.info("%s %s", self.address_string(), fmt % args)

    def send_json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_body(self, limit):
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return None
        if not 0 <= length <= limit:
            return None
        return self.rfile.read(length)

    # -- routes --------------------------------------------------------------------------------
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/health":
            return self.send_json(200, {"ok": True})
        m = ORDER_PATH.match(path)
        if m:
            con = orders.connect(self.server.cfg.db_path)
            try:
                order = orders.get_order(con, m.group(1))
            finally:
                con.close()
            return self.send_json(200, order) if order else self.send_json(404, {"error": "not_found"})
        if self.server.static_root and not path.startswith("/api/"):
            return self.serve_static(path)
        self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/checkout":
            return self.checkout()
        if path == "/api/webhook":
            return self.webhook()
        self.send_json(404, {"error": "not_found"})

    def checkout(self):
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self.send_json(415, {"error": "unsupported_media_type"})
        raw = self.read_body(MAX_CHECKOUT_BODY)
        try:
            body = json.loads(raw) if raw is not None else None
        except ValueError:
            body = None
        if not isinstance(body, dict):
            return self.send_json(400, {"error": "bad_request"})
        try:
            quote = price_cart(body.get("items"), self.server.catalog)
        except CartError as e:
            return self.send_json(400, {"error": e.code})
        order_id = orders.new_order_id()
        lines = [{"name": l.name, "quantity": l.quantity, "unit_cents": l.unit_cents} for l in quote.lines]
        try:
            session = self.server.gateway.create_session(order_id, lines, quote.total_cents)
        except Exception:
            log.exception("checkout session creation failed")
            return self.send_json(502, {"error": "payment_provider"})
        con = orders.connect(self.server.cfg.db_path)
        try:
            orders.insert_order(con, order_id, quote, session["id"])
        finally:
            con.close()
        self.send_json(201, {"order_id": order_id, "checkout_url": session["url"]})

    def webhook(self):
        raw = self.read_body(MAX_WEBHOOK_BODY)
        if raw is None:
            return self.send_json(400, {"error": "bad_request"})
        try:
            ev = verify_event(raw, self.headers.get("Stripe-Signature", ""), self.server.cfg.webhook_secret)
        except BadWebhook as e:
            log.warning("webhook rejected: %s", e)
            return self.send_json(400, {"error": "bad_signature"})
        con = orders.connect(self.server.cfg.db_path)
        try:
            outcome = orders.apply_event(con, ev["id"], ev["type"], ev["data"]["object"])
        finally:
            con.close()
        log.info("webhook %s %s -> %s", ev["id"], ev["type"], outcome)
        self.send_json(200, {"received": True})

    # -- local development only (production: nginx) ----------------------------------------------
    def serve_static(self, path):
        root = self.server.static_root
        rel = path.lstrip("/") or "index.html"
        target = (root / rel).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.exists() and target.with_suffix(".html").exists():
            target = target.with_suffix(".html")
        if root not in target.parents and target != root or not target.is_file():
            return self.send_json(404, {"error": "not_found"})
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def make_server(cfg, gateway, host="127.0.0.1", port=8000, static_root=None):
    orders.init_db(cfg.db_path)
    httpd = ThreadingHTTPServer((host, port), ShopHandler)
    httpd.cfg = cfg
    httpd.gateway = gateway
    httpd.catalog = load_catalog(cfg.catalog_path)
    httpd.static_root = Path(static_root).resolve() if static_root else None
    return httpd

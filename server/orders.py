"""Order storage (SQLite) and the order state machine. See ORDERS.md sections 4 to 6."""
import secrets
import sqlite3
import time

SCHEMA = """
CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  status            TEXT NOT NULL CHECK (status IN ('pending','paid','failed','expired')),
  currency          TEXT NOT NULL CHECK (currency = 'eur'),
  total_cents       INTEGER NOT NULL CHECK (total_cents > 0),
  stripe_session_id TEXT UNIQUE,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_lines (
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
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id    TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  order_id    TEXT,
  outcome     TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_transitions (
  id          INTEGER PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  event_id    TEXT NOT NULL REFERENCES stripe_events(event_id),
  at          INTEGER NOT NULL
);
"""

COMPLETED = "checkout.session.completed"
EXPIRED = "checkout.session.expired"
ASYNC_FAILED = "checkout.session.async_payment_failed"
HANDLED = {COMPLETED: "paid", EXPIRED: "expired", ASYNC_FAILED: "failed"}


def connect(path):
    con = sqlite3.connect(path, timeout=10, isolation_level=None)  # explicit BEGIN/COMMIT only
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA busy_timeout = 10000")
    return con


def init_db(path):
    con = connect(path)
    try:
        con.execute("PRAGMA journal_mode = WAL")
        con.executescript(SCHEMA)
    finally:
        con.close()


def new_order_id():
    return secrets.token_urlsafe(16)  # 128 bits, 22 characters


def insert_order(con, order_id, quote, session_id):
    now = int(time.time())
    con.execute("BEGIN IMMEDIATE")
    try:
        con.execute(
            "INSERT INTO orders (id, status, currency, total_cents, stripe_session_id, created_at, updated_at)"
            " VALUES (?, 'pending', ?, ?, ?, ?, ?)",
            (order_id, quote.currency, quote.total_cents, session_id, now, now))
        con.executemany(
            "INSERT INTO order_lines VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [(order_id, i, l.product_id, l.size, l.grind, l.quantity, l.unit_cents, l.line_cents)
             for i, l in enumerate(quote.lines, 1)])
        con.execute("COMMIT")
    except BaseException:
        con.execute("ROLLBACK")
        raise


def get_order(con, order_id):
    row = con.execute("SELECT id, status, currency, total_cents FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        return None
    lines = con.execute(
        "SELECT product_id, size, grind, quantity, unit_cents, line_cents FROM order_lines"
        " WHERE order_id = ? ORDER BY line_no", (order_id,)).fetchall()
    return {"order_id": row["id"], "status": row["status"], "currency": row["currency"],
            "total_cents": row["total_cents"], "lines": [dict(l) for l in lines]}


def money_problem(session, order):
    """Why a completed session cannot mark this order paid, or None when it can."""
    if session.get("payment_status") != "paid":
        return "not_paid"
    if session.get("currency") != order["currency"]:
        return "currency_mismatch"
    if session.get("amount_total") != order["total_cents"]:
        return "amount_mismatch"
    return None


def next_status(current, event_type):
    """Pure transition rule (ORDERS.md section 5). Returns the new status or None for no change."""
    target = HANDLED.get(event_type)
    if target is None or current == target:
        return None
    if current == "pending" or target == "paid":
        return target
    return None  # leaving paid, or failed <-> expired: the first terminal state stands


def apply_event(con, event_id, event_type, session):
    """Record one verified Stripe event and apply its transition, exactly once. Returns the outcome."""
    order_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("order_id")
    now = int(time.time())
    con.execute("BEGIN IMMEDIATE")
    try:
        if con.execute("SELECT 1 FROM stripe_events WHERE event_id = ?", (event_id,)).fetchone():
            con.execute("ROLLBACK")
            return "duplicate"
        order = con.execute("SELECT id, status, currency, total_cents FROM orders WHERE id = ?",
                            (order_id,)).fetchone() if order_id else None
        outcome, new = _decide(order, event_type, session)
        con.execute("INSERT INTO stripe_events VALUES (?, ?, ?, ?, ?)",
                    (event_id, event_type, order["id"] if order else order_id, outcome, now))
        if new:
            con.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (new, now, order["id"]))
            con.execute("INSERT INTO order_transitions (order_id, from_status, to_status, event_id, at)"
                        " VALUES (?, ?, ?, ?, ?)", (order["id"], order["status"], new, event_id, now))
        con.execute("COMMIT")
        return outcome
    except BaseException:
        con.execute("ROLLBACK")
        raise


def _decide(order, event_type, session):
    if event_type not in HANDLED:
        return "ignored:unhandled_type", None
    if order is None:
        return "ignored:unknown_order", None
    if event_type == COMPLETED:
        problem = money_problem(session, order)
        if problem:
            return f"ignored:{problem}", None
    new = next_status(order["status"], event_type)
    return ("applied", new) if new else ("ignored:no_change", None)

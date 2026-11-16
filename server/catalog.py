"""The catalog and the one pure function that turns a client cart into money."""
import json
from dataclasses import dataclass

MAX_LINES = 20
MAX_QTY_PER_LINE = 10
MAX_QTY_TOTAL = 30


class CartError(ValueError):
    """A cart the server refuses. `code` is the stable error string sent to the client."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Line:
    product_id: str
    size: str
    grind: str
    quantity: int
    unit_cents: int
    name: str

    @property
    def line_cents(self):
        return self.unit_cents * self.quantity


@dataclass(frozen=True)
class Quote:
    lines: tuple
    total_cents: int
    currency: str


def load_catalog(path):
    with open(path, encoding="utf-8") as f:
        cat = json.load(f)
    for p in cat["products"]:
        for size, cents in p["prices"].items():
            if size not in cat["sizes"] or type(cents) is not int or cents <= 0:
                raise ValueError(f"bad price for {p['id']} {size}")
    return cat


def _field(item, key, allowed, code):
    value = item.get(key)
    if not isinstance(value, str) or value not in allowed:
        raise CartError(code)
    return value


def price_cart(items, catalog):
    """Validate client items and price them from the catalog. Client price fields are never read."""
    if not isinstance(items, list) or not 1 <= len(items) <= MAX_LINES:
        raise CartError("bad_cart")
    products = {p["id"]: p for p in catalog["products"]}
    merged = {}
    for item in items:
        if not isinstance(item, dict):
            raise CartError("bad_cart")
        pid = _field(item, "product_id", products, "unknown_product")
        size = _field(item, "size", products[pid]["prices"], "unknown_size")
        grind = _field(item, "grind", catalog["grinds"], "unknown_grind")
        qty = item.get("quantity")
        if type(qty) is not int or not 1 <= qty <= MAX_QTY_PER_LINE:
            raise CartError("bad_quantity")
        key = (pid, size, grind)
        merged[key] = merged.get(key, 0) + qty
    if sum(merged.values()) > MAX_QTY_TOTAL or any(q > MAX_QTY_PER_LINE for q in merged.values()):
        raise CartError("bad_cart")
    lines = tuple(
        Line(pid, size, grind, qty, products[pid]["prices"][size],
             f"{products[pid]['name']}, {catalog['sizes'][size]}, {catalog['grinds'][grind]}")
        for (pid, size, grind), qty in merged.items()
    )
    return Quote(lines, sum(l.line_cents for l in lines), catalog["currency"])

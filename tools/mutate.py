"""Tiny mutation tester for the commerce core (ub-mode's 'mutator' does not exist in this repo).

Each mutant is one textual change to server code that a correct test suite must catch.
Run: .venv/Scripts/python tools/mutate.py     -> prints killed/survived per mutant, exit 1 if any survive.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MUTANTS = [
    ("server/orders.py", 'if con.execute("SELECT 1 FROM stripe_events WHERE event_id = ?", (event_id,)).fetchone():',
     "if False:", "no duplicate check"),
    ("server/orders.py", 'if current == "pending" or target == "paid":', "if current != target:", "paid not absorbing"),
    ("server/orders.py", 'if current == "pending" or target == "paid":', 'if current == "pending":', "no out-of-order recovery"),
    ("server/orders.py", 'if session.get("amount_total") != order["total_cents"]:', "if False:", "amount not checked"),
    ("server/orders.py", 'if session.get("currency") != order["currency"]:', "if False:", "currency not checked"),
    ("server/orders.py", 'if session.get("payment_status") != "paid":', "if False:", "payment_status not checked"),
    ("server/catalog.py", "merged[key] = merged.get(key, 0) + qty", "merged[key] = qty", "lines not summed"),
    ("server/catalog.py", "if type(qty) is not int or", "if not isinstance(qty, int) or", "bool accepted as quantity"),
    ("server/catalog.py", "return Quote(lines, sum(l.line_cents for l in lines)",
     "return Quote(lines, sum(l.unit_cents for l in lines)", "total ignores quantity"),
    ("server/payments.py", "stripe.WebhookSignature.verify_header(body, header, secret, stripe.Webhook.DEFAULT_TOLERANCE)",
     "stripe.WebhookSignature.verify_header(body, header, secret, None)", "no timestamp tolerance"),
    ("server/payments.py", "stripe.WebhookSignature.verify_header(body, header, secret, stripe.Webhook.DEFAULT_TOLERANCE)",
     "pass", "no signature check"),
    ("server/app.py", "return self.send_json(502, {\"error\": \"payment_provider\"})",
     "session = {'id': None, 'url': ''}", "order written when Stripe fails"),
]


def run_tests():
    r = subprocess.run([sys.executable, "-m", "unittest", "-q", "tests.test_commerce"], cwd=ROOT,
                       capture_output=True, text=True, timeout=300)
    return r.returncode == 0


def main():
    survived = 0
    for rel, old, new, label in MUTANTS:
        path = ROOT / rel
        src = path.read_text(encoding="utf-8")
        if src.count(old) != 1:
            print(f"SKIP   {label}: pattern not found exactly once in {rel}")
            survived += 1
            continue
        try:
            path.write_text(src.replace(old, new), encoding="utf-8")
            passed = run_tests()
        finally:
            path.write_text(src, encoding="utf-8")
        print(("SURVIVED " if passed else "killed   ") + label)
        survived += passed
    print(f"\n{len(MUTANTS) - survived}/{len(MUTANTS)} mutants killed")
    sys.exit(1 if survived else 0)


if __name__ == "__main__":
    main()

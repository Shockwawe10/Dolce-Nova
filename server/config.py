"""Configuration, read once from the environment. Secrets never live in files."""
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class Config:
    stripe_secret_key: str
    webhook_secret: str
    public_base_url: str
    db_path: str
    catalog_path: str

    @classmethod
    def from_env(cls, env=os.environ):
        key = env.get("STRIPE_SECRET_KEY", "")
        hook = env.get("STRIPE_WEBHOOK_SECRET", "")
        if not key.startswith(("sk_test_", "rk_test_")):
            raise ConfigError("STRIPE_SECRET_KEY must be a TEST key (sk_test_ or rk_test_); live keys are refused")
        if not hook.startswith("whsec_"):
            raise ConfigError("STRIPE_WEBHOOK_SECRET must be set (whsec_...)")
        return cls(
            stripe_secret_key=key,
            webhook_secret=hook,
            public_base_url=env.get("PUBLIC_BASE_URL", "http://localhost:8080").rstrip("/"),
            db_path=env.get("DB_PATH", str(ROOT / "var" / "shop.db")),
            catalog_path=env.get("CATALOG_PATH", str(ROOT / "web" / "data" / "catalog.json")),
        )

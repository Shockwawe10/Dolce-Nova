"""python -m server [--port 8000] [--static web]   (--static: local development without nginx)"""
import argparse
import logging
import sys
from pathlib import Path

from .app import make_server
from .config import Config, ConfigError
from .payments import StripeGateway


def main():
    ap = argparse.ArgumentParser(prog="python -m server")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--static", help="also serve this folder (development only; nginx does this in production)")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        cfg = Config.from_env()
    except ConfigError as e:
        sys.exit(f"config: {e}")
    Path(cfg.db_path).parent.mkdir(parents=True, exist_ok=True)
    httpd = make_server(cfg, StripeGateway(cfg.stripe_secret_key, cfg.public_base_url),
                        host=args.host, port=args.port, static_root=args.static)
    logging.info("listening on http://%s:%d (TEST MODE)", args.host, args.port)
    httpd.serve_forever()


if __name__ == "__main__":
    main()

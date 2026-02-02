import logging
import os

import uvicorn

DEBUG_MODE = os.getenv("DEBUG", "false") == "true"  # Global DEBUG logging
LOGFORMAT = "%(asctime)s [%(name)-10s] [%(levelname)-5s] %(message)s"

logging.basicConfig(level=logging.DEBUG if DEBUG_MODE else logging.INFO, format=LOGFORMAT)

# Set higher logging levels for noisy modules to avoid excessive output.
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
# logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

logging.info("Starting SignUpInfo app")
try:
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, log_config=None, proxy_headers=True, forwarded_allow_ips="*")
except Exception as e:
    logging.fatal("Fatal error: %s", str(e), exc_info=True)

logging.info("Stopping SignUpInfo app")

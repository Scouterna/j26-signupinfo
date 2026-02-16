import copy
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from prometheus_fastapi_instrumentator import Instrumentator

# from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .config import get_settings
from .scoutnet import scoutnet_init, scoutnet_router
from .stats import stats_router

# --- Create instrumentor, settings and logger objects ---
instrumentator = Instrumentator()
settings = get_settings()
logger = logging.getLogger(__name__)


# --- Lifespan event handler ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown events.
    """

    await scoutnet_init()  # Do some init
    yield  # Run FastAPI!


# --- Initialize FastAPI app with the lifespan manager and session middleware ---
app = FastAPI(
    title="j26-signupinfo-api",
    version="0.1.0",
    lifespan=lifespan,
    root_path=settings.ROOT_PATH,
    openapi_url=None,
    docs_url=None,
)
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET_KEY)


# --- Add metrics API ---
instrumentator.instrument(app)  # Adds Prometheus middleware during initialization
instrumentator.expose(app)  # Registers /metrics endpoint before other catch-all routes


# --- Include the API routers ---
app.include_router(stats_router, prefix=settings.API_PREFIX)
app.include_router(scoutnet_router, prefix=settings.API_PREFIX)


# --- Config info for app-shell ---
@app.get("/app-config", response_model=dict, response_description="Get application configuration for j26-app")
async def app_config():
    # Config data should be in environment
    return {
        "navigation": [
            {
                "type": "page",
                "id": "page_signupinfo_home",
                "label": "SignupInfo",
                "icon": "user-search",  # Icon from https://tabler.io/icons
                "path": "../",  # Path is relative to the locaiton of the app-config endpoint
            }
        ]
    }


# --- Custom Swagger UI route with configurable root path ---
@app.get(f"{settings.API_PREFIX}/docs", include_in_schema=False)
async def custom_swagger_ui_html(request: Request):
    forwarded_prefix = request.headers.get("x-forwarded-prefix", "").rstrip("/")
    root_path = forwarded_prefix or settings.ROOT_PATH.rstrip("/")
    openapi_url = (
        f"{root_path}{settings.API_PREFIX}/openapi.json" if root_path else f"{settings.API_PREFIX}/openapi.json"
    )
    return get_swagger_ui_html(
        openapi_url=openapi_url,
        title="j26-signupinfo-api - Swagger UI",
    )


# --- Custom OpenAPI endpoint to include a root-path server for Swagger "Try it out" ---
@app.get(f"{settings.API_PREFIX}/openapi.json", include_in_schema=False)
async def custom_openapi(request: Request):
    forwarded_prefix = request.headers.get("x-forwarded-prefix", "").rstrip("/")
    root_path = forwarded_prefix or settings.ROOT_PATH.rstrip("/")

    if app.openapi_schema is None:
        app.openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            routes=app.routes,
        )

    schema = copy.deepcopy(app.openapi_schema)
    if root_path:
        schema["servers"] = [{"url": root_path}]
    else:
        schema.pop("servers", None)
    return JSONResponse(schema)


# --- Static Files Configuration in production ---
# In a production Docker build, the 'client/dist' files will be copied to 'pyapp/static'
# NOTE: The catch-all route MUST be defined AFTER all specific routes (like /api/docs)
# because routes are matched in declaration order.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():  # Yes! We are running in a container
    # Mount the static directory for /assets
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    templates = Jinja2Templates(directory=str(STATIC_DIR))  # For templating index.html

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(request: Request, full_path: str):
        """
        Catch-all endpoint to serve the React files outside 'assets'
        """
        if not full_path:
            full_path = "index.html"
        file_path = STATIC_DIR / full_path
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        if full_path == "index.html":
            return templates.TemplateResponse(
                request=request, name="index.html", context=dict(settings)
            )  # Add environment variables
        else:
            return FileResponse(str(file_path))

else:  # Running locally
    # --- Add a root endpoint for basic API health check ---
    @app.get("/", include_in_schema=False)
    def read_root():
        return {"message": "FastAPI server is running"}

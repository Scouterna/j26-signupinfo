import logging
from typing import Any
from urllib.parse import urljoin

import httpx
from fastapi import HTTPException, Request, status
from joserfc import jwt
from joserfc.jwk import KeySet
from pydantic import BaseModel, Field

from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_jwks_keyset_cache: dict[str, KeySet] = {}


class AuthUser(BaseModel):
    subject: str
    name: str
    preferred_username: str
    email: str | None = None
    permissions: list[str] = Field(default_factory=list)
    # claims: Dict[str, Any]

    def __str__(self) -> str:
        uid = self.preferred_username or self.subject
        return f"{self.name} ({uid})"


async def get_jwks_keyset(request: Request) -> KeySet | None:
    """
    Convert the JWKS dictionary into a key set usable for verification.
    """
    cache_key = str(request.base_url)

    if cache_key in _jwks_keyset_cache:
        return _jwks_keyset_cache[cache_key]

    url = urljoin(str(request.base_url), "auth/.well-known/openid-configuration")
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(url)
            response.raise_for_status()
            oid_config = response.json()
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return None

    url = oid_config["jwks_uri"]
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(url)
            response.raise_for_status()
            jwks_dict = response.json()
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return None

    try:
        keyset = KeySet.import_key_set(jwks_dict)
        _jwks_keyset_cache[cache_key] = keyset
        return keyset
    except Exception as exc:
        logger.warning("Failed to parse JWKS: %s", exc)
        return None


async def decode_access_token(token: str, request: Request) -> dict[str, Any]:
    keyset = await get_jwks_keyset(request)
    if keyset is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Token validation unavailable")

    try:
        token_obj = jwt.decode(token, keyset)
        registry = jwt.JWTClaimsRegistry(leeway=30)
        registry.validate(token_obj.claims)
        return dict(token_obj.claims)
    except Exception as exc:
        logger.warning("Failed to validate JWT: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized") from exc


def _extract_permissions(claims: dict[str, Any]) -> list[str]:
    permissions = set()

    # Extract resource_access permissions prefixed with resource name, e.g. "j26-signupinfo:stats:read"
    resource_access = claims.get("resource_access") or {}
    for resource_name, resource in resource_access.items():
        resource_roles = resource.get("roles") if isinstance(resource, dict) else []
        permissions.update(f"{resource_name}:{role}" for role in (resource_roles or []) if isinstance(role, str))

    # Extract j26-* roles from realm_access (old style)
    realm_access = claims.get("realm_access") or {}
    realm_roles = realm_access.get("roles") or []
    permissions.update(role for role in realm_roles if isinstance(role, str) and role.startswith("j26-"))

    return sorted(permissions)


async def require_auth_user(request: Request) -> AuthUser:
    """
    FastAPI dependency that validates the auth cookie and returns user info + permissions.
    """
    token = request.cookies.get("j26-auth_access-token")
    if not token:
        if not settings.AUTH_DISABLED:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:  # Authentication disabled. Return a fake user
            return AuthUser(
                subject="c6e9889e-e550-11f0-ae1a-30138b8c0e56",
                name="Fake User",
                preferred_username="scoutnet|1234567",
                email="fake.user@scouterna.se",
                permissions=["signupinfo:summaries:read"],
                # permissions=["signupinfo:all:read"],
            )

    claims = await decode_access_token(token, request)
    permissions = _extract_permissions(claims)
    if "j26-planning-staff" in permissions and "signupinfo:summaries:read" not in permissions:
        permissions.append("signupinfo:summaries:read")  # Quick patch
    if not any(permission.startswith("signupinfo:") for permission in permissions):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No suitable permissions"
        )  # No suitable permissions

    return AuthUser(
        subject=claims.get("sub", ""),
        name=claims.get("name"),
        preferred_username=claims.get("preferred_username"),
        email=claims.get("email"),
        permissions=permissions,
    )

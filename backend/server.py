"""
Thin FastAPI proxy that forwards every /api/* request to the Next.js dev server
running on http://localhost:3000. Needed because the platform's ingress routes
/api to port 8001 (this backend), while Next.js API routes live on port 3000.
"""
import os
import logging

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware

NEXT_ORIGIN = os.environ.get("NEXT_ORIGIN", "http://localhost:3000")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy")

app = FastAPI(title="Ansdrop API Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent httpx client
_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup():
    global _client
    _client = httpx.AsyncClient(timeout=60.0)


@app.on_event("shutdown")
async def _shutdown():
    if _client:
        await _client.aclose()


HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "host",
}


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)
async def proxy(path: str, request: Request):
    target_url = f"{NEXT_ORIGIN}/api/{path}"
    body = await request.body()
    headers = {
        k: v for k, v in request.headers.items() if k.lower() not in HOP_HEADERS
    }
    params = dict(request.query_params)
    try:
        upstream = await _client.request(
            request.method,
            target_url,
            content=body if body else None,
            params=params,
            headers=headers,
        )
    except httpx.RequestError as e:
        logger.error("Proxy upstream error: %s", e)
        return Response(
            content=f'{{"error":"upstream unreachable: {e}"}}',
            status_code=502,
            media_type="application/json",
        )

    out_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in HOP_HEADERS and k.lower() != "content-encoding"
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=out_headers,
        media_type=upstream.headers.get("content-type"),
    )


@app.get("/")
async def health():
    return {"ok": True, "service": "ansdrop-proxy"}

"""GIF search, proxied server-side so the API key never ships to the client.

Uses GIPHY's public "beta" testing key by default. That key is shared across
countless tutorials/demos and gets rate-limited or banned by GIPHY from time
to time — when that happens this degrades to an empty, clearly-labeled
"unavailable" result rather than pretending it works. Set a real GIPHY_API_KEY
env var (free at developers.giphy.com) to get live results.
"""

import os

import httpx
from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/gifs", tags=["gifs"])

GIPHY_API_KEY = os.environ.get("GIPHY_API_KEY", "dc6zaTOxFJmzC")
GIPHY_BASE = "https://api.giphy.com/v1/gifs"


@router.get("/search")
async def search_gifs(
    q: str = Query(default=""),
    limit: int = Query(default=24, le=50),
    current_user: User = Depends(get_current_user),
):
    query = q.strip()
    endpoint = f"{GIPHY_BASE}/search" if query else f"{GIPHY_BASE}/trending"
    params = {"api_key": GIPHY_API_KEY, "limit": str(limit), "rating": "pg-13"}
    if query:
        params["q"] = query

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(endpoint, params=params)
            data = res.json()
    except (httpx.HTTPError, ValueError):
        return {"available": False, "results": []}

    if data.get("meta", {}).get("status") != 200:
        return {"available": False, "results": []}

    results = []
    for item in data.get("data", []):
        images = item.get("images", {})
        original_url = images.get("original", {}).get("url")
        if not original_url:
            continue
        preview_url = (
            images.get("fixed_width_small", {}).get("url")
            or images.get("fixed_width", {}).get("url")
            or original_url
        )
        results.append(
            {
                "id": item.get("id"),
                "title": item.get("title") or "GIF",
                "url": original_url,
                "preview_url": preview_url,
            }
        )
    return {"available": True, "results": results}

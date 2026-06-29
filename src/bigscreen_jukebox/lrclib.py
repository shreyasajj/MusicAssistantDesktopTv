from __future__ import annotations

LRCLIB_GET = "https://lrclib.net/api/get"

def build_params(artist: str, title: str, album: str, duration_ms: int) -> dict:
    params = {"artist_name": artist, "track_name": title}
    if album:
        params["album_name"] = album
    if duration_ms:
        params["duration"] = round(duration_ms / 1000)
    return params

def select_lyrics(data: dict | None) -> str | None:
    if not data:
        return None
    synced = data.get("syncedLyrics")
    if synced:
        return synced
    plain = data.get("plainLyrics")
    return plain or None

async def fetch_lyrics(session, artist: str, title: str,
                       album: str = "", duration_ms: int = 0) -> str | None:
    if not artist or not title:
        return None
    try:
        async with session.get(LRCLIB_GET, params=build_params(artist, title, album, duration_ms)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
    except Exception:
        return None
    return select_lyrics(data)

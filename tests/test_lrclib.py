from bigscreen_jukebox.lrclib import build_params, select_lyrics, fetch_lyrics

def test_build_params_includes_duration_seconds():
    p = build_params("M83", "Midnight City", "Hurry Up", 243000)
    assert p == {"artist_name": "M83", "track_name": "Midnight City",
                 "album_name": "Hurry Up", "duration": 243}

def test_build_params_omits_empty_album_and_duration():
    p = build_params("A", "B", "", 0)
    assert p == {"artist_name": "A", "track_name": "B"}

def test_select_prefers_synced():
    assert select_lyrics({"syncedLyrics": "[00:01.00]hi", "plainLyrics": "hi"}) == "[00:01.00]hi"

def test_select_falls_back_to_plain():
    assert select_lyrics({"syncedLyrics": "", "plainLyrics": "just words"}) == "just words"

def test_select_none_when_empty():
    assert select_lyrics(None) is None
    assert select_lyrics({"syncedLyrics": "", "plainLyrics": ""}) is None

class _FakeResp:
    def __init__(self, status, payload): self.status = status; self._p = payload
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False
    async def json(self): return self._p

class _FakeSession:
    def __init__(self, status, payload): self._s = status; self._p = payload; self.last_params = None
    def get(self, url, params=None):
        self.last_params = params
        return _FakeResp(self._s, self._p)

async def test_fetch_returns_synced_and_sends_params():
    sess = _FakeSession(200, {"syncedLyrics": "[00:01.00]hi", "plainLyrics": "hi"})
    out = await fetch_lyrics(sess, "M83", "Midnight City", "Hurry Up", 243000)
    assert out == "[00:01.00]hi"
    assert sess.last_params["duration"] == 243

async def test_fetch_404_returns_none():
    assert await fetch_lyrics(_FakeSession(404, {}), "A", "B") is None

async def test_fetch_requires_artist_and_title():
    assert await fetch_lyrics(_FakeSession(200, {}), "", "B") is None

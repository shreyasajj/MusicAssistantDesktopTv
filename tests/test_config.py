from pathlib import Path
from bigscreen_jukebox.config import Settings, load_settings, save_settings

def test_load_missing_returns_defaults(tmp_path):
    s = load_settings(tmp_path / "nope.json")
    assert s == Settings()
    assert s.ma_port == 8095 and s.guest_port == 8950
    assert s.lrclib_fallback is True

def test_ui_option_defaults():
    s = Settings()
    assert s.compact_lyrics is True
    assert s.art_pump is True
    assert s.viz_behind_lyrics is False
    assert s.audio_device == ""

def test_save_then_load_roundtrip_ui_options(tmp_path):
    p = tmp_path / "settings.json"
    save_settings(Settings(compact_lyrics=False, art_pump=False, viz_behind_lyrics=True), p)
    loaded = load_settings(p)
    assert loaded.compact_lyrics is False
    assert loaded.art_pump is False
    assert loaded.viz_behind_lyrics is True

def test_save_then_load_roundtrip(tmp_path):
    p = tmp_path / "sub" / "settings.json"
    save_settings(Settings(ma_host="tv.local", ma_token="abc", default_player_id="living"), p)
    loaded = load_settings(p)
    assert loaded.ma_host == "tv.local"
    assert loaded.ma_token == "abc"
    assert loaded.default_player_id == "living"

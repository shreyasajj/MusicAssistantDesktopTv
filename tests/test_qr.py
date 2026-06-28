import base64
from bigscreen_jukebox.qr import qr_data_uri

def test_returns_png_data_uri():
    uri = qr_data_uri("http://tv.local:8950")
    assert uri.startswith("data:image/png;base64,")
    payload = uri.split(",", 1)[1]
    assert base64.b64decode(payload)[:8] == b"\x89PNG\r\n\x1a\n"

def test_distinct_inputs_differ():
    assert qr_data_uri("a") != qr_data_uri("bbbb")

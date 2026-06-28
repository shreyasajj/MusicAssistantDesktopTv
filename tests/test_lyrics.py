# tests/test_lyrics.py
from bigscreen_jukebox.lyrics import parse_lyrics, current_line_index

LRC = "[00:01.00]first line\n[00:04.50]second line\n[00:09.00]third line\n"

def test_parse_synced():
    lyr = parse_lyrics(LRC)
    assert lyr.synced is True
    assert [l.text for l in lyr.lines] == ["first line", "second line", "third line"]
    assert lyr.lines[1].time_ms == 4500

def test_parse_plain_when_no_timestamps():
    lyr = parse_lyrics("just\nplain\nwords")
    assert lyr.synced is False
    assert len(lyr.lines) == 3
    assert lyr.lines[0].time_ms is None

def test_parse_empty():
    assert parse_lyrics(None).lines == []
    assert parse_lyrics("").lines == []

def test_current_line_index():
    lyr = parse_lyrics(LRC)
    assert current_line_index(lyr, 0) == -1
    assert current_line_index(lyr, 1500) == 0
    assert current_line_index(lyr, 4500) == 1
    assert current_line_index(lyr, 100000) == 2

def test_current_line_index_plain_is_minus_one():
    assert current_line_index(parse_lyrics("plain"), 5000) == -1

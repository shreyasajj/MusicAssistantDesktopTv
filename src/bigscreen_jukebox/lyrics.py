from __future__ import annotations
import re
from dataclasses import dataclass, field

_TS = re.compile(r"\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]")

@dataclass
class LyricLine:
    time_ms: int | None
    text: str

@dataclass
class Lyrics:
    lines: list[LyricLine] = field(default_factory=list)
    synced: bool = False

def parse_lyrics(raw: str | None) -> Lyrics:
    if not raw or not raw.strip():
        return Lyrics([], False)
    lines: list[LyricLine] = []
    synced = False
    for raw_line in raw.splitlines():
        stamps = list(_TS.finditer(raw_line))
        text = _TS.sub("", raw_line).strip()
        if stamps:
            synced = True
            for m in stamps:
                mm, ss, frac = m.group(1), m.group(2), m.group(3) or "0"
                ms = int(mm) * 60000 + int(ss) * 1000 + int(frac.ljust(3, "0"))
                lines.append(LyricLine(ms, text))
        elif text:
            lines.append(LyricLine(None, text))
    if synced:
        lines.sort(key=lambda l: (l.time_ms is None, l.time_ms or 0))
    return Lyrics(lines, synced)

def current_line_index(lyrics: Lyrics, position_ms: int) -> int:
    if not lyrics.synced:
        return -1
    idx = -1
    for i, line in enumerate(lyrics.lines):
        if line.time_ms is not None and line.time_ms <= position_ms:
            idx = i
        else:
            break
    return idx

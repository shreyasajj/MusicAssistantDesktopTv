# Bigscreen Jukebox — design prototype (CANONICAL reference)

This folder is the **source-of-truth visual + interaction design** for the app.
The QML/Kirigami implementation must match it: layout, proportions, font sizes,
colors, focus/remote-navigation behavior, and animations.

- `index.html` — screen structure (Now Playing / Search / Lyrics / Visualizer + guest QR).
- `styles.css` — all styling. **Accent tokens** live in `:root`: `--a1` (#00e0c6) and
  `--a2` (#ff3da6); everything derives from them. Authored at a fixed 1920×1080 and
  scaled to fill any screen (1× at 1080p, 2× at 4K).
- `app.js` — behavior: playback clock, lyric sync + scroll, the 3 visualizer modes
  (radial / flow / bars), beat engine, remote D-pad focus navigation, guest toggle.

## The backend → UI data contract (mirror this in the real app)

The visualizer is driven by an external feed the Python backend will provide:

```js
window.BigscreenJukebox.feed({ beat: 0..1, energy: 0..1, bars: [64] })
window.BigscreenJukebox.feedBeat(beat, energy)
```

In the native app, the Python `AudioAnalyzer` must expose the same shape:
`energy: float (0..1)`, `beat: float (0..1)`, and `bars: list[float] (length 64)`.

## Preview
    python3 -m http.server -d bigscreen-jukebox 8000   # then open http://localhost:8000
Keys: 1–4 switch screens · arrows = remote D-pad · Space play/pause · G guest QR.

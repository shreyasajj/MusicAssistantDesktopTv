/* ============================================================================
   Bigscreen Jukebox — app logic (vanilla JS, no framework)
   Sections:
     1. Data (tracks, lyrics)
     2. State + DOM refs
     3. Accents / colours
     4. Audio source  (simulation, mic, beat detection, external API)
     5. Visualizer    (radial / flow / bars)
     6. Renderers     (tabs, queue, results, lyrics, player menu, chrome)
     7. Navigation    (mouse + TV-remote D-pad + keyboard)
     8. Main loop      (playback clock -> progress / lyrics / canvas)
     9. 4K scaling + init
   External control (drive the beat from a backend/analysed audio):
     window.BigscreenJukebox.feed({ beat:0..1, energy:0..1, bars:[64] })
     window.BigscreenJukebox.feedBeat(beat, energy)
     window.BigscreenJukebox.connectStream(mediaStream)
     window.BigscreenJukebox.connectElement(audioEl)
     window.BigscreenJukebox.useMic() / .simulate()
============================================================================ */
(function () {
  "use strict";

  /* ---------- 1. Data ---------- */
  // Album art is built from CSS gradients (track 0 uses the live accents).
  const ART_ACCENT = 'radial-gradient(130% 130% at 24% 22%, var(--a2) 0%, transparent 56%), radial-gradient(120% 120% at 82% 78%, var(--a1) 0%, transparent 52%), linear-gradient(150deg,#2a1250 0%,#0b0a1f 72%)';
  const TRACKS = [
    { title: 'Neon Tide',      artist: 'Marisol Vega',     album: 'Afterglow',        dur: 224, art: ART_ACCENT },
    { title: 'Paper Skylines', artist: 'The Lantern Hours', album: 'Cartography',      dur: 198, art: 'radial-gradient(130% 130% at 22% 20%, #ff8a3d 0%, transparent 55%), radial-gradient(120% 120% at 84% 80%, #7b2ff7 0%, transparent 52%), linear-gradient(150deg,#2a1030 0%,#0c0a1f 72%)' },
    { title: 'Slow Dissolve',  artist: 'Kaiso',            album: 'Underwater Rooms', dur: 251, art: 'radial-gradient(130% 130% at 26% 20%, #36d6ff 0%, transparent 55%), radial-gradient(120% 120% at 82% 82%, #1f8a5b 0%, transparent 52%), linear-gradient(150deg,#0d2640 0%,#070d1a 72%)' },
    { title: 'Gold Static',    artist: 'Faye Okonkwo',     album: 'Signal Bloom',     dur: 176, art: 'radial-gradient(130% 130% at 24% 22%, #ffd23d 0%, transparent 54%), radial-gradient(120% 120% at 82% 80%, #ff3da6 0%, transparent 52%), linear-gradient(150deg,#3a1a22 0%,#100a14 72%)' },
    { title: 'Northbound',     artist: 'Cassette Club',    album: 'Long Way Home',    dur: 233, art: 'radial-gradient(130% 130% at 22% 22%, #23d18b 0%, transparent 55%), radial-gradient(120% 120% at 84% 80%, #2a6fdb 0%, transparent 52%), linear-gradient(150deg,#0c2a2a 0%,#070f12 72%)' },
    { title: 'Velvet Hour',    artist: 'Marisol Vega',     album: 'Afterglow',        dur: 205, art: 'radial-gradient(130% 130% at 24% 20%, #b14dff 0%, transparent 55%), radial-gradient(120% 120% at 82% 80%, #ff5d8a 0%, transparent 52%), linear-gradient(150deg,#2a0f3a 0%,#0c0a1f 72%)' },
  ];

  const LYRICS = [
    { t: 6,   l: 'Lights spill soft across the floor' },
    { t: 15,  l: 'Another midnight at the door' },
    { t: 24,  l: 'We were running out of time' },
    { t: 33,  l: 'Now the silence feels like mine' },
    { t: 44,  l: 'Hold the echo, let it stay' },
    { t: 55,  l: 'Neon tide will pull away' },
    { t: 66,  l: 'Every color that we knew' },
    { t: 77,  l: 'Fading slowly into blue' },
    { t: 90,  l: 'So I wait here in the glow' },
    { t: 103, l: 'Watching all the embers go' },
    { t: 116, l: 'If you find me in the dark' },
    { t: 129, l: 'Follow where the heartbeats spark' },
    { t: 143, l: 'Carry me through afterglow' },
    { t: 157, l: 'Where the quiet rivers flow' },
    { t: 171, l: 'Lights spill soft across the floor' },
    { t: 185, l: 'I will not ask for anymore' },
  ];

  const SCREENS = ['now', 'search', 'lyrics', 'visualizer'];
  const PLAYERS = ['Living Room', 'Kitchen Display', 'Patio Speaker', 'Studio Monitors'];
  const MODES = [['radial', 'Radial Pulse'], ['flow', 'Flow Lines'], ['bars', 'Bars']];

  /* ---------- 2. State + DOM refs ---------- */
  const state = {
    screen: 'now', mode: 'radial', playing: true,
    playerOpen: false, player: 'Living Room',
    query: '', focusIdx: 0, showQR: false,
    trackIdx: 0, lineIdx: -1,
    focusZone: 'content', topIdx: 0,      // topIdx 0..3 = tabs, 4 = guest
    audioSource: 'sim',
  };

  let elapsed = 38;                 // seconds into the current track
  let duration = TRACKS[0].dur;
  let beatMul = 1;                  // BEAT slider multiplier
  let vt = 0, lastT = null, dt = 0.016;   // visual clock
  let filtered = TRACKS.slice();    // current search results
  const rings = [];                 // radial-mode beat rings
  let prevBeat = 0, spin = 0;

  const $ = (id) => document.getElementById(id);
  const app = $('app');
  const dom = {
    tabs: $('tabs'), topright: $('topright'),
    playerChip: $('playerChip'), playerName: $('playerName'), playerMenu: $('playerMenu'),
    guestBtn: $('guestBtn'),
    npBg: $('npBg'), npArt: $('npArt'), npTitle: $('npTitle'), npSub: $('npSub'),
    elapsed: $('elapsed'), total: $('total'), progressFill: $('progressFill'),
    prevBtn: $('prevBtn'), playBtn: $('playBtn'), nextBtn: $('nextBtn'),
    queue: $('queue'), queueList: $('queueList'), queueCount: $('queueCount'),
    searchInput: $('searchInput'), results: $('results'),
    lyricsWrap: $('lyricsWrap'),
    playerWrap: document.querySelector('.player-wrap'),
    viz: $('viz'), beatRange: $('beatRange'), modeBar: $('modeBar'),
    sourceBtn: $('sourceBtn'), sourceLabel: $('sourceLabel'),
    qrCard: $('qrCard'), qrCanvas: $('qrCanvas'), qrUrl: $('qrUrl'),
  };

  /* ---------- 3. Accents / colours ---------- */
  let col1 = { r: 0, g: 224, b: 198 }, col2 = { r: 255, g: 61, b: 166 };
  function readAccents() {
    const cs = getComputedStyle(document.documentElement);
    col1 = parseColor(cs.getPropertyValue('--a1')) || col1;
    col2 = parseColor(cs.getPropertyValue('--a2')) || col2;
  }
  function parseColor(s) {
    if (!s) return null;
    s = s.trim();
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  }
  const rgba = (c, a) => 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  function lerpCol(t) {
    return {
      r: Math.round(col1.r + (col2.r - col1.r) * t),
      g: Math.round(col1.g + (col2.g - col1.g) * t),
      b: Math.round(col1.b + (col2.b - col1.b) * t),
    };
  }

  /* ---------- 4. Audio source ---------- */
  let liveData = null, extLive = 0;
  let audioCtx = null, analyser = null, freq = null, micStream = null;
  let energyAvg = 0, beatEnv = 0, lastBeat = 0;

  function sample(t) {
    const mul = beatMul;
    if (liveData) {                         // real audio / backend feed
      const energy = clamp(liveData.energy != null ? liveData.energy : 0.5, 0, 1.2);
      const kick = Math.max(0, liveData.beat != null ? liveData.beat : 0);
      const beat = kick * mul;
      const bars = liveData.bars || simBars(t, energy, kick);
      return { kick, energy, beat, level: Math.min(1.4, beat * (0.5 + energy * 0.6)), bars };
    }
    // simulated 120 BPM fallback
    const period = 60 / 120;
    const phase = (t % period) / period;
    const kick = Math.exp(-phase * 7);
    const energy = 0.5 + 0.32 * Math.sin(t * 0.22) + 0.12 * Math.sin(t * 0.6 + 1);
    const beat = kick * mul;
    const N = 64, bars = new Array(N);
    for (let i = 0; i < N; i++) {
      const f = i / N;
      let v = 0.18 + 0.82 * Math.abs(Math.sin(i * 0.27 + t * 1.6 + Math.sin(i * 0.5 + t * 0.4)));
      v *= (1 - f * 0.45);
      v *= (0.55 + energy * 0.55);
      v += beat * 0.4 * Math.max(0, 1 - f * 1.5);
      bars[i] = clamp(v, 0.02, 1.15);
    }
    return { kick, energy, beat, level: Math.min(1.4, beat * (0.5 + energy * 0.6)), bars };
  }
  function simBars(t, energy, beat) {
    const N = 64, bars = new Array(N);
    for (let i = 0; i < N; i++) {
      const f = i / N;
      let v = 0.15 + 0.7 * Math.abs(Math.sin(i * 0.3 + t * 1.5));
      v *= (1 - f * 0.4) * (0.5 + energy * 0.6);
      v += beat * 0.3 * Math.max(0, 1 - f * 1.5);
      bars[i] = clamp(v, 0.02, 1.1);
    }
    return bars;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Web Audio analysis (mic or <audio> element)
  function ensureCtx() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function setupAnalyser(src) {
    const an = audioCtx.createAnalyser();
    an.fftSize = 1024; an.smoothingTimeConstant = 0.82;
    src.connect(an);
    analyser = an;
    freq = new Uint8Array(an.frequencyBinCount);
    energyAvg = 0; beatEnv = 0; lastBeat = 0;
  }
  function connectStream(stream) { ensureCtx(); setupAnalyser(audioCtx.createMediaStreamSource(stream)); setSource('mic'); }
  function connectElement(el) { ensureCtx(); const s = audioCtx.createMediaElementSource(el); s.connect(audioCtx.destination); setupAnalyser(s); setSource('mic'); }
  async function useMic() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no mic');
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      connectStream(micStream);
    } catch (e) { setSource('sim'); }
  }
  function stopMic() {
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    analyser = null; liveData = null; setSource('sim');
  }
  function analyzeAudio(d) {
    if (!analyser) return null;
    analyser.getByteFrequencyData(freq);
    const N = freq.length;
    let sum = 0; for (let i = 0; i < N; i++) sum += freq[i];
    const energy = sum / N / 255;
    const bn = Math.max(4, Math.floor(N * 0.08));
    let bass = 0; for (let i = 0; i < bn; i++) bass += freq[i]; bass = bass / bn / 255;
    energyAvg = energyAvg * 0.9 + bass * 0.1;
    const now = performance.now();
    if (bass > energyAvg * 1.3 + 0.06 && now - lastBeat > 170) { lastBeat = now; beatEnv = 1; }
    beatEnv *= Math.pow(0.0008, d);
    const bars = new Array(64);
    for (let i = 0; i < 64; i++) { const idx = Math.min(N - 1, Math.floor(Math.pow(i / 64, 1.7) * N * 0.75)); bars[i] = Math.min(1.15, (freq[idx] / 255) * 1.15); }
    return { energy: Math.min(1.1, energy * 1.5), beat: beatEnv, bars };
  }
  function setSource(src) { if (state.audioSource !== src) { state.audioSource = src; renderSource(); } }
  function toggleMic() { if (state.audioSource === 'mic') stopMic(); else useMic(); }

  // External / backend API
  window.BigscreenJukebox = {
    feed: function (d) { d = d || {}; liveData = { energy: d.energy != null ? d.energy : 0.6, beat: d.beat != null ? d.beat : 0, bars: d.bars }; extLive = performance.now(); if (!analyser) setSource('external'); },
    feedBeat: function (beat, energy) { this.feed({ beat: beat, energy: energy }); },
    connectStream: connectStream,
    connectElement: connectElement,
    useMic: useMic,
    simulate: stopMic,
  };

  /* ---------- 5. Visualizer ---------- */
  function drawViz(a) {
    const cv = dom.viz;
    const ts = Math.min(2, Math.max(1, rootScale || 1));   // crisp up to 4K
    const bw = Math.round(1920 * ts), bh = Math.round(1080 * ts);
    if (cv.width !== bw) { cv.width = bw; cv.height = bh; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(ts, 0, 0, ts, 0, 0);
    const W = 1920, H = 1080;
    if (state.mode === 'radial') vizRadial(ctx, W, H, a);
    else if (state.mode === 'flow') vizFlow(ctx, W, H, a);
    else vizBars(ctx, W, H, a);
  }
  function vizRadial(ctx, W, H, a) {
    ctx.fillStyle = 'rgba(5,5,8,0.30)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    spin += (0.12 + a.energy * 1.3) * 0.016;
    const spokes = 56;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin);
    for (let i = 0; i < spokes; i++) {
      const ang = i / spokes * Math.PI * 2;
      const len = 200 + a.energy * 170 + (i % 2 ? a.beat * 120 : 0);
      ctx.strokeStyle = rgba(col1, 0.045 + a.energy * 0.07); ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 120, Math.sin(ang) * 120);
      ctx.lineTo(Math.cos(ang) * (120 + len), Math.sin(ang) * (120 + len));
      ctx.stroke();
    }
    ctx.restore();
    // expanding rings on each detected beat
    if (a.beat > 0.55 && prevBeat <= 0.55) rings.push({ r: 130, a: 1 });
    prevBeat = a.beat;
    for (let i = rings.length - 1; i >= 0; i--) {
      const R = rings[i];
      R.r += dt * 820; R.a -= dt * 1.5;
      if (R.a <= 0) { rings.splice(i, 1); continue; }
      const col = lerpCol(Math.min(1, (R.r - 130) / 560));
      ctx.strokeStyle = rgba(col, R.a * 0.6); ctx.lineWidth = 6 + R.a * 12;
      ctx.beginPath(); ctx.arc(cx, cy, R.r, 0, Math.PI * 2); ctx.stroke();
    }
    const orbR = 130 + a.level * 120;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 1.7);
    g.addColorStop(0, rgba(col2, 0.95)); g.addColorStop(0.4, rgba(col1, 0.78)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, orbR * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(cx, cy, orbR * 0.32, 0, Math.PI * 2); ctx.fill();
  }
  function vizFlow(ctx, W, H, a) {
    ctx.fillStyle = 'rgba(5,5,8,0.20)'; ctx.fillRect(0, 0, W, H);
    const lines = 5;
    for (let L = 0; L < lines; L++) {
      const t = vt * 1.2 + L * 1.4;
      const amp = 70 + a.level * 270 * (1 - L * 0.12) + a.energy * 40;
      const yBase = H / 2 + (L - 2) * 72;
      const col = lerpCol(L / (lines - 1));
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const k = x / W;
        const y = yBase + Math.sin(k * 6.5 + t) * amp * Math.sin(k * Math.PI) + Math.sin(k * 15 + t * 1.7) * amp * 0.22;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(col, 0.92); ctx.lineWidth = 4 + a.level * 5;
      ctx.shadowColor = rgba(col, 1); ctx.shadowBlur = 24 + a.level * 34;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  function vizBars(ctx, W, H, a) {
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, W, H);
    const bars = a.bars, N = bars.length, bw = W / N, gap = 7, baseY = H * 0.80;
    for (let i = 0; i < N; i++) {
      const v = bars[i], h = v * H * 0.6, x = i * bw, col = lerpCol(i / (N - 1));
      const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      grad.addColorStop(0, rgba(col, 1)); grad.addColorStop(1, rgba(col1, 0.18));
      ctx.fillStyle = grad; roundRect(ctx, x + gap / 2, baseY - h, bw - gap, h, 6); ctx.fill();
      ctx.globalAlpha = 0.13; ctx.fillStyle = rgba(col, 1);
      roundRect(ctx, x + gap / 2, baseY + 8, bw - gap, h * 0.32, 4); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // pseudo-QR placeholder (deterministic) drawn onto the white card
  function drawQR() {
    const ctx = dom.qrCanvas.getContext('2d');
    const S = 180, n = 25, cell = S / n;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#0a0a0f';
    let seed = 9;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.52) ctx.fillRect(x * cell, y * cell, cell + 0.6, cell + 0.6);
    const finder = (fx, fy) => {
      ctx.fillStyle = '#fff'; ctx.fillRect((fx - 0.5) * cell, (fy - 0.5) * cell, 8 * cell, 8 * cell);
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect(fx * cell, fy * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#fff'; ctx.fillRect((fx + 1) * cell, (fy + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect((fx + 2) * cell, (fy + 2) * cell, 3 * cell, 3 * cell);
    };
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  }

  /* ---------- 6. Renderers ---------- */
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function buildTabs() {
    dom.tabs.innerHTML = '';
    SCREENS.forEach((key, i) => {
      const b = document.createElement('button');
      b.className = 'tab';
      b.textContent = ['Now Playing', 'Search', 'Lyrics', 'Visualizer'][i];
      b.addEventListener('click', () => { state.focusZone = 'content'; go(key); });
      dom.tabs.appendChild(b);
    });
  }
  function buildModes() {
    dom.modeBar.innerHTML = '';
    MODES.forEach(([key, label]) => {
      const b = document.createElement('button');
      b.className = 'mode-btn'; b.textContent = label;
      b.addEventListener('click', () => { state.mode = key; renderModes(); });
      dom.modeBar.appendChild(b);
    });
  }
  function buildPlayerMenu() {
    dom.playerMenu.innerHTML = '';
    PLAYERS.forEach((name) => {
      const b = document.createElement('button');
      b.className = 'player-opt'; b.textContent = name;
      b.addEventListener('click', () => { state.player = name; state.playerOpen = false; renderChrome(); });
      dom.playerMenu.appendChild(b);
    });
  }

  function renderTabs() {
    [...dom.tabs.children].forEach((b, i) => {
      b.classList.toggle('is-active', state.screen === SCREENS[i]);
      b.classList.toggle('is-focus', state.focusZone === 'topbar' && state.topIdx === i);
    });
  }
  function renderModes() {
    [...dom.modeBar.children].forEach((b, i) => b.classList.toggle('is-active', state.mode === MODES[i][0]));
  }
  function renderSource() {
    const src = state.audioSource;
    dom.sourceLabel.textContent = src === 'mic' ? 'Mic input' : (src === 'external' ? 'Live feed' : 'Simulated');
    dom.sourceBtn.classList.toggle('is-live', src !== 'sim');
  }

  function renderTrack() {
    const t = TRACKS[state.trackIdx];
    dom.npBg.style.background = t.art;
    dom.npArt.style.background = t.art;
    dom.npTitle.textContent = t.title;
    dom.npSub.textContent = t.artist + ' \u2014 ' + t.album;
    dom.total.textContent = fmt(t.dur);
  }

  function renderQueue() {
    const n = TRACKS.length;
    const count = state.showQR ? 4 : 5;   // fewer rows when stacked under the QR
    dom.queueList.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const qi = (state.trackIdx + i) % n;
      const t = TRACKS[qi];
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML =
        '<div class="queue-thumb" style="background:' + t.art + '"></div>' +
        '<div class="queue-meta"><div class="queue-name"></div><div class="queue-artist"></div></div>' +
        '<span class="queue-dur"></span>';
      row.querySelector('.queue-name').textContent = t.title;
      row.querySelector('.queue-artist').textContent = t.artist;
      row.querySelector('.queue-dur').textContent = fmt(t.dur);
      row.addEventListener('click', () => setTrack(qi));
      dom.queueList.appendChild(row);
    }
    dom.queueCount.textContent = count + ' songs';
  }

  function getFiltered() {
    const q = state.query.toLowerCase().trim();
    if (!q) return TRACKS.slice();
    return TRACKS.filter((t) => (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(q));
  }
  function renderResults() {
    filtered = getFiltered();
    if (state.focusIdx > filtered.length - 1) state.focusIdx = Math.max(0, filtered.length - 1);
    dom.results.innerHTML = '';
    filtered.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'result' + (i === state.focusIdx ? ' is-focus' : '');
      row.innerHTML =
        '<div class="result-thumb" style="background:' + t.art + '"></div>' +
        '<div class="result-meta"><div class="result-title"></div><div class="result-sub"></div></div>' +
        '<div class="result-play">PLAY <svg viewBox="0 0 24 24" width="40" height="40" fill="var(--a1)"><path d="M7 5l13 7-13 7z"/></svg></div>';
      row.querySelector('.result-title').textContent = t.title;
      row.querySelector('.result-sub').textContent = t.artist + ' \u00b7 ' + t.album;
      row.addEventListener('click', () => { state.focusIdx = i; loadResult(i); });
      dom.results.appendChild(row);
    });
  }

  function buildLyrics() {
    dom.lyricsWrap.innerHTML = '';
    LYRICS.forEach((ln) => {
      const line = document.createElement('div');
      line.className = 'lyric-line';
      const span = document.createElement('span');
      span.textContent = ln.l;
      line.appendChild(span);
      dom.lyricsWrap.appendChild(line);
    });
  }

  // toggles screen visibility + all the guest/play chrome classes
  function renderChrome() {
    SCREENS.forEach((key) => $('screen-' + key).classList.toggle('is-active', state.screen === key));
    app.setAttribute('data-screen', state.screen);
    app.classList.toggle('guest', state.showQR);
    app.classList.toggle('paused', !state.playing);
    dom.guestBtn.classList.toggle('is-focus', state.focusZone === 'topbar' && state.topIdx === 4);
    dom.qrCard.classList.toggle('is-focus', state.focusZone === 'topbar' && state.topIdx === 4);
    dom.playerMenu.hidden = !state.playerOpen;
    dom.playerName.textContent = state.player;
    [...dom.playerMenu.children].forEach((b, i) => b.classList.toggle('is-active', state.player === PLAYERS[i]));
    renderTabs();
    renderQueue();
  }

  /* ---------- 7. Navigation ---------- */
  function go(screen) {
    state.screen = screen;
    state.playerOpen = false;
    if (screen === 'lyrics') state.lineIdx = -1;
    renderChrome();
    if (screen === 'search') setTimeout(() => dom.searchInput.focus(), 30);
  }
  function togglePlay() { state.playing = !state.playing; app.classList.toggle('paused', !state.playing); }
  function setTrack(i) {
    const n = TRACKS.length;
    state.trackIdx = ((i % n) + n) % n;
    duration = TRACKS[state.trackIdx].dur;
    elapsed = 0; state.lineIdx = -1;
    renderTrack(); renderQueue();
  }
  function nextTrack() { setTrack(state.trackIdx + 1); }
  function prevTrack() { setTrack(state.trackIdx - 1); }
  function cycleMode(d) { const i = MODES.findIndex((m) => m[0] === state.mode); state.mode = MODES[(i + d + MODES.length) % MODES.length][0]; renderModes(); }
  function toggleQR() { state.showQR = !state.showQR; renderChrome(); if (state.showQR) drawQR(); }
  function togglePlayer() { state.playerOpen = !state.playerOpen; renderChrome(); }
  function moveFocus(d) { const len = filtered.length; if (!len) return; state.focusIdx = clamp(state.focusIdx + d, 0, len - 1); renderResults(); }
  function loadResult(i) { const t = filtered[i]; if (!t) return; setTrack(TRACKS.indexOf(t)); go('now'); }
  function enterTopbar() { const i = SCREENS.indexOf(state.screen); state.focusZone = 'topbar'; state.topIdx = i < 0 ? 0 : i; state.playerOpen = false; renderChrome(); }
  function activateTop() { if (state.topIdx < 4) { go(SCREENS[state.topIdx]); state.focusZone = 'content'; renderChrome(); } else toggleQR(); }

  function onKey(e) {
    const k = e.key, sc = state.screen;
    if (k === 'g' || k === 'G') { toggleQR(); return; }
    if (k >= '1' && k <= '4') { state.focusZone = 'content'; go(SCREENS[+k - 1]); return; }

    if (state.focusZone === 'topbar') {                 // ---- top bar (remote) ----
      if (k === 'ArrowLeft') { e.preventDefault(); state.topIdx = Math.max(0, state.topIdx - 1); renderChrome(); }
      else if (k === 'ArrowRight') { e.preventDefault(); state.topIdx = Math.min(4, state.topIdx + 1); renderChrome(); }
      else if (k === 'ArrowDown') { e.preventDefault(); state.focusZone = 'content'; renderChrome(); }
      else if (k === 'ArrowUp') { e.preventDefault(); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); activateTop(); }
      return;
    }

    if (k === 'ArrowUp') {                               // ---- content ----
      if (sc === 'search' && state.focusIdx > 0) { e.preventDefault(); moveFocus(-1); return; }
      e.preventDefault(); enterTopbar(); return;
    }
    if (k === ' ') { e.preventDefault(); togglePlay(); return; }

    if (sc === 'search') {
      if (k === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
      else if (k === 'Enter') loadResult(state.focusIdx);
    } else if (sc === 'now') {
      if (k === 'ArrowRight') nextTrack();
      else if (k === 'ArrowLeft') prevTrack();
      else if (k === 'Enter') togglePlay();
    } else if (sc === 'visualizer') {
      if (k === 'ArrowRight') cycleMode(1);
      else if (k === 'ArrowLeft') cycleMode(-1);
    }
  }

  function wireEvents() {
    dom.playBtn.addEventListener('click', togglePlay);
    dom.prevBtn.addEventListener('click', prevTrack);
    dom.nextBtn.addEventListener('click', nextTrack);
    dom.playerChip.addEventListener('click', togglePlayer);
    dom.guestBtn.addEventListener('click', toggleQR);
    dom.qrCard.addEventListener('click', toggleQR);
    dom.searchInput.addEventListener('input', (e) => { state.query = e.target.value; state.focusIdx = 0; renderResults(); });
    dom.beatRange.addEventListener('input', (e) => { beatMul = parseFloat(e.target.value); });
    dom.sourceBtn.addEventListener('click', toggleMic);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', fitToViewport);
  }

  /* ---------- 8. Main loop ---------- */
  function loop(ms) {
    const now = ms / 1000;
    if (lastT == null) lastT = now;
    dt = Math.min(0.1, now - lastT); lastT = now;
    vt += dt;
    if (state.playing) { elapsed += dt; if (elapsed > duration) elapsed = 0; }

    // choose beat source: live analyser > backend feed (<600ms) > simulation
    if (analyser) liveData = analyzeAudio(dt);
    else if (extLive && performance.now() - extLive < 600) { /* keep pushed data */ }
    else { if (liveData) liveData = null; if (state.audioSource === 'external') setSource('sim'); }

    const a = sample(vt);
    updateNow(a);
    updateLyrics();
    if (state.screen === 'visualizer') drawViz(a);
    requestAnimationFrame(loop);
  }
  function updateNow(a) {
    dom.progressFill.style.width = (elapsed / duration * 100).toFixed(2) + '%';
    dom.elapsed.textContent = fmt(elapsed);
    dom.npArt.style.transform = 'scale(' + (1 + Math.min(0.028, a.level * 0.024)).toFixed(3) + ')';
  }
  function updateLyrics() {
    let idx = 0;
    for (let i = 0; i < LYRICS.length; i++) if (elapsed >= LYRICS[i].t) idx = i;
    const step = 120, center = 488;
    dom.lyricsWrap.style.transform = 'translateY(' + (center - (idx * step + step / 2)) + 'px)';
    if (state.lineIdx === idx) return;
    state.lineIdx = idx;
    [...dom.lyricsWrap.children].forEach((line, i) => {
      const d = Math.abs(i - idx);
      line.className = 'lyric-line' + (d === 0 ? ' is-active' : d === 1 ? ' d1' : d === 2 ? ' d2' : '');
    });
  }

  /* ---------- 9. 4K scaling + init ---------- */
  let rootScale = 1;
  function fitToViewport() {
    rootScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (Math.abs(rootScale - 1) < 0.002) {
      app.style.transform = 'none'; app.style.left = '0px'; app.style.top = '0px';
      return;
    }
    app.style.transform = 'scale(' + rootScale + ')';
    app.style.left = Math.max(0, (window.innerWidth - 1920 * rootScale) / 2) + 'px';
    app.style.top = Math.max(0, (window.innerHeight - 1080 * rootScale) / 2) + 'px';
  }

  function init() {
    readAccents();
    buildTabs(); buildModes(); buildPlayerMenu(); buildLyrics();
    renderTrack(); renderResults(); renderModes(); renderSource();
    renderChrome();
    wireEvents();
    fitToViewport();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

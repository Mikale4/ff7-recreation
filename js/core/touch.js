// On-screen touch controls (not in the PS1 game): a PlayStation pad drawn on the page for phones and tablets.
// Its buttons hold the game's own logical buttons (js/core/input.js I.touch), so everything that reads FF7.input plays
// by touch as it does by keyboard or pad, and the hints name the on-screen buttons (Circle, Cross...) while touch is
// the input. Config > System > Touch Controls: Auto (shown on a touch screen and after any touch; a key or a pad
// button hides them until the next touch), On, Off. Where they go (T.area: render.js fits the picture to the rest):
//   portrait: the picture at the top, the pad under it (L2 L1 / R1 R2, the D-pad and the face buttons, then
//     Run, Select, Start and fast-forward);
//   landscape phone: the picture between two columns (D-pad on the left, face buttons on the right);
//   no room beside or under the picture (a 4:3 tablet held sideways): the same columns, faint, over the picture.
// The D-pad takes 8 directions and follows the thumb as it slides; a thumb can roll from one face button to the next.
// Run is a toggle (lit while on; WALK when Config > Run is Always), Select is also Auto battle (as on the pad: Back),
// L1+R1 held runs from battle, ▶▶ is the fast-forward button, Demo turns the Demo on and off, and the corners button
// goes full screen where the browser allows it. The faces are the game's own drawn glyphs (FF7.minigames.ui.glyph).
(function () {
  const T = FF7.touch = {};
  const I = () => FF7.input;
  const hasDom = typeof document !== 'undefined' && typeof document.querySelector === 'function' && typeof window.matchMedia === 'function';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let root = null, probe = null, inited = false, shown = false, faint = false, modeSeen = null, coarse = false, tick = 0;
  let runOn = false;
  const ptrs = new Map();   // pointerId -> { c: the control it went down on (or slid to), held: [buttons it holds] }

  // the controls: kind 'dpad' | 'face' (round, slides) | 'pill' | 'toggle' (Run) | 'action' (full screen)
  const CTL = [
    { id: 'dpad', kind: 'dpad' },
    { id: 'menu', kind: 'face', b: ['menu'] }, { id: 'ok', kind: 'face', b: ['ok'] },
    { id: 'cancel', kind: 'face', b: ['cancel'] }, { id: 'square', kind: 'face', b: ['square'] },
    { id: 'l2', kind: 'pill', b: ['l2'], label: 'L2' }, { id: 'l1', kind: 'pill', b: ['l1'], label: 'L1' },
    { id: 'r1', kind: 'pill', b: ['r1'], label: 'R1' }, { id: 'r2', kind: 'pill', b: ['r2'], label: 'R2' },
    { id: 'select', kind: 'pill', b: ['select', 'auto'], label: 'SELECT' }, { id: 'start', kind: 'pill', b: ['start'], label: 'START' },
    { id: 'run', kind: 'toggle', b: ['run'], label: 'RUN' },
    { id: 'ff', kind: 'pill', b: ['ff'], icon: 'ff' },
    { id: 'demo', kind: 'pill', b: ['demo'], label: 'DEMO', small: true },
    { id: 'full', kind: 'action', icon: 'full', small: true },
  ];
  const byId = {}; CTL.forEach(c => { byId[c.id] = c; c.on = {}; c.vis = true; });

  // ---- when they show
  const cfgMode = () => { const c = FF7.state && FF7.state.config, m = c && c.touchControls; return m === 'on' || m === 'off' ? m : 'auto'; };
  function want() {
    const m = cfgMode();
    if (m !== 'auto') return m === 'on';
    const d = I().device();
    return d === 'touch' || (d == null && coarse);
  }
  T.shown = () => shown;
  T.MODES = ['auto', 'on', 'off'];
  T.modeName = (m) => ({ auto: 'Auto', on: 'On', off: 'Off' })[m] || 'Auto';
  // after a change of input device or of the Config option: show or hide, and fit the picture again
  T.refresh = function () {
    if (!inited) return;
    const s = want();
    if (s === shown) return;
    shown = s;
    root.style.display = s ? 'block' : 'none';
    if (!s) releaseAll();
    FF7.render.resize();
  };
  // every drawn frame (js/main.js): the Config option, and the buttons that come and go
  T.frame = function () {
    if (!inited) return;
    const m = cfgMode(); if (m !== modeSeen) { modeSeen = m; T.refresh(); }
    if (!shown || ++tick % 15) return;
    const D = FF7.runner && FF7.runner.demo, demoOn = !!(D && D.active), c = FF7.state && FF7.state.config;
    let demoOk = demoOn; try { demoOk = demoOn || !!(D && D.canToggle()); } catch (e) { /* not in a game */ }
    setVis(byId.demo, demoOk);
    setVis(byId.ff, demoOn || !!(c && c.fastForward !== false));
    const label = c && c.alwaysRun ? 'WALK' : 'RUN';
    if (byId.run.label !== label) { byId.run.label = label; draw(byId.run); }
  };
  function setVis(c, v) { if (c.vis === v) return; c.vis = v; if (c.el) c.el.style.visibility = v ? '' : 'hidden'; if (!v) releaseCtl(c); }

  // ---- layout (CSS px): where each control goes, and the part of the screen left for the picture
  function insets() {
    if (!probe) return { t: 0, r: 0, b: 0, l: 0 };
    const s = getComputedStyle(probe), n = (v) => parseFloat(v) || 0;
    return { t: n(s.paddingTop), r: n(s.paddingRight), b: n(s.paddingBottom), l: n(s.paddingLeft) };
  }
  function layout(w, h) {
    const ins = insets(), P = {};
    if (h >= w) {   // portrait: the pad under the picture
      const W0 = w - ins.l - ins.r, m = clamp(W0 * 0.035, 8, 20);
      const D = clamp(W0 * 0.38, 112, 240), sh = clamp(D * 0.26, 32, 48), gap = clamp(D * 0.08, 8, 18);
      const pw = clamp(W0 * 0.155, 52, 96), sm = sh * 0.85, mid = ins.l + W0 / 2;
      const top = h - ins.b - m - sh - gap - D - gap - sh;
      const x0 = ins.l + m, x1 = w - ins.r - m;
      P.l2 = [x0, top, pw, sh]; P.l1 = [x0 + pw + gap, top, pw, sh];
      P.r2 = [x1 - pw, top, pw, sh]; P.r1 = [x1 - 2 * pw - gap, top, pw, sh];
      const yb = top + sh + gap;
      P.dpad = [x0, yb, D, D]; face(P, x1 - D, yb, D);
      // Demo and full screen between the D-pad and the face buttons
      const cw = clamp(x1 - D - (x0 + D) - 12, 40, 80);
      P.demo = [mid - cw / 2, yb + D * 0.2, cw, sm]; P.full = [mid - sm * 0.6, yb + D * 0.8 - sm, sm * 1.2, sm];
      const yc = yb + D + gap, bw = clamp((W0 - 2 * m - 3 * gap) / 4, 52, 110), bx = mid - (4 * bw + 3 * gap) / 2;
      ['run', 'select', 'start', 'ff'].forEach((id, i) => { P[id] = [bx + i * (bw + gap), yc, bw, sh]; });
      return { P, faint: false, area: { x: ins.l, y: ins.t, w: W0, h: Math.max(60, top - gap - ins.t) } };
    }
    // landscape: a column each side, the picture between them; narrower columns (down to a 100 px D-pad) to keep
    // the picture at 80% of its full size at least. When even 100 px columns leave less than that and less than
    // 640 x 480 (a small phone), the pad goes over the picture, faint
    const H0 = h - ins.t - ins.b, m = clamp(H0 * 0.03, 8, 18), side0 = 2 * m + Math.max(ins.l, ins.r);
    const s0 = Math.min(w / FF7.W, h / FF7.H), fit = (w - 0.8 * s0 * FF7.W) / 2 - side0;
    let D = clamp(Math.min(H0 * 0.4, fit), 100, 230);
    const s1 = Math.min((w - 2 * (side0 + D)) / FF7.W, h / FF7.H), over = s1 < 0.8 * s0 - 1e-6 && s1 < 1;
    if (over) D = clamp(H0 * 0.4, 108, 230);
    const sh = clamp(D * 0.27, 30, 46), gap = clamp(D * 0.07, 7, 16), sm = sh * 0.8;
    const x0 = ins.l + m, x1 = w - ins.r - m - D, half = (D - gap) / 2;
    const yt = ins.t + m, yb = h - ins.b - m - sh;
    P.l2 = [x0, yt, half, sh]; P.l1 = [x0 + half + gap, yt, half, sh];
    P.r1 = [x1, yt, half, sh]; P.r2 = [x1 + half + gap, yt, half, sh];
    P.demo = [x0, yt + sh + gap, half, sm]; P.full = [x1 + D - sm * 1.2, yt + sh + gap, sm * 1.2, sm];
    P.select = [x0, yb, half, sh]; P.run = [x0 + half + gap, yb, half, sh];
    P.start = [x1, yb, half, sh]; P.ff = [x1 + half + gap, yb, half, sh];
    const top = yt + sh + gap + sm + gap, yd = top + Math.max(0, (yb - gap - top - D) * 0.6);
    P.dpad = [x0, yd, D, D]; face(P, x1, yd, D);
    if (over) return { P, faint: true, area: { x: 0, y: 0, w, h } };
    const side = ins.l + m + D + m, sideR = ins.r + m + D + m;
    return { P, faint: false, area: { x: side, y: 0, w: w - side - sideR, h } };
  }
  // the face buttons in a diamond in a D x D box: Triangle top, Circle right, Cross bottom, Square left
  function face(P, x, y, D) {
    const b = D * 0.38, c = D / 2;
    P.menu = [x + c - b / 2, y, b, b]; P.cancel = [x + c - b / 2, y + D - b, b, b];
    P.square = [x, y + c - b / 2, b, b]; P.ok = [x + D - b, y + c - b / 2, b, b];
  }
  // render.js R.resize: place the controls for this window size; the rectangle the picture should fit in (or null)
  T.area = function (w, h) {
    if (!inited || !shown) return null;
    const L = layout(w, h);
    faint = L.faint; root.classList.toggle('faint', faint);
    CTL.forEach(c => {
      const p = L.P[c.id];
      if (!p || (c.id === 'full' && !fullOk())) { c.el.style.display = 'none'; return; }
      c.el.style.display = '';
      const [x, y, cw, ch] = p.map(v => Math.round(v));
      Object.assign(c.el.style, { left: x + 'px', top: y + 'px', width: cw + 'px', height: ch + 'px' });
      c.w = cw; c.h = ch; draw(c);
    });
    return L.area;
  };

  // ---- drawing (the game's own glyphs and button style, into each control's canvas)
  const BTN_FILL = 'rgba(20,20,30,0.85)', BTN_ON = 'rgba(88,98,140,0.95)', EDGE = 'rgba(160,160,184,0.75)';
  function draw(c) {
    if (!c.cv || !c.w) return;
    const dpr = window.devicePixelRatio || 1, cw = Math.round(c.w * dpr), ch = Math.round(c.h * dpr);
    if (c.cv.width !== cw || c.cv.height !== ch) { c.cv.width = cw; c.cv.height = ch; }
    const g = c.cv.getContext('2d'), R = FF7.render, ui = FF7.minigames && FF7.minigames.ui;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, c.w, c.h);
    const keep = R.ctx; R.ctx = g;   // (ui.glyph and R.text draw on R.ctx)
    try {
      g.lineJoin = 'round';
      if (c.kind === 'dpad') drawDpad(c, g, ui);
      else if (c.kind === 'face') {
        const s = Math.min(c.w, c.h), r = s / 2 - 1.5, on = c.on[c.b[0]];
        if (ui) ui.glyph(c.b[0], c.w / 2, c.h / 2, s - 5);
        g.beginPath(); g.arc(c.w / 2, c.h / 2, r, 0, Math.PI * 2);
        if (on) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill(); }
        g.strokeStyle = on ? '#ffffff' : EDGE; g.lineWidth = 1.5; g.stroke();
      } else {
        const lit = c.kind === 'toggle' ? runOn : false, on = Object.keys(c.on).some(b => c.on[b]);
        g.fillStyle = on ? BTN_ON : BTN_FILL; R.roundRect(g, 1, 1, c.w - 2, c.h - 2, Math.min(10, c.h * 0.3)); g.fill();
        g.strokeStyle = lit ? '#ffd860' : on ? '#ffffff' : EDGE; g.lineWidth = lit ? 2 : 1.25; g.stroke();
        const col = lit ? '#ffd860' : '#e8e8f0';
        if (c.icon) drawIcon(g, c.icon, c.w / 2, c.h / 2, Math.min(c.h * 0.42, c.w * 0.3), col);
        else R.textMid(c.label, c.w / 2, c.h / 2, { size: Math.round(clamp(c.h * 0.36, 10, 17)), weight: '700', align: 'center', shadow: false, color: col });
      }
    } finally { R.ctx = keep; }
  }
  function drawDpad(c, g, ui) {
    const D = c.w, m = D / 2, a = D * 0.34, h = a / 2, R = FF7.render;
    const cross = () => {
      g.beginPath();
      g.moveTo(m - h, 1); g.lineTo(m + h, 1); g.lineTo(m + h, m - h); g.lineTo(D - 1, m - h); g.lineTo(D - 1, m + h); g.lineTo(m + h, m + h);
      g.lineTo(m + h, D - 1); g.lineTo(m - h, D - 1); g.lineTo(m - h, m + h); g.lineTo(1, m + h); g.lineTo(1, m - h); g.lineTo(m - h, m - h); g.closePath();
    };
    cross(); g.fillStyle = BTN_FILL; g.fill(); g.strokeStyle = EDGE; g.lineWidth = 1.5; g.stroke();
    const arms = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const d in arms) {
      const [dx, dy] = arms[d], x = m + dx * (m - h), y = m + dy * (m - h);
      if (c.on[d]) { g.fillStyle = 'rgba(255,255,255,0.3)'; R.roundRect(g, x - h + 2, y - h + 2, a - 4, a - 4, 4); g.fill(); }
      if (ui) ui.glyph(d, x, y, a * 0.62);
    }
    g.beginPath(); g.arc(m, m, a * 0.22, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
  }
  function drawIcon(g, icon, x, y, s, col) {
    g.save(); g.fillStyle = col; g.strokeStyle = col;
    if (icon === 'ff') {   // ▶▶ (drawn: the character is an emoji on some phones)
      const k = s * 0.55;
      [-k, 0].forEach(ox => { g.beginPath(); g.moveTo(x + ox - k * 0.1, y - k); g.lineTo(x + ox + k * 1.1, y); g.lineTo(x + ox - k * 0.1, y + k); g.closePath(); g.fill(); });
    } else if (icon === 'full') {   // four corners
      const k = s * 0.7, e = k * 0.45; g.lineWidth = 2; g.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { g.moveTo(x + sx * k, y + sy * (k - e)); g.lineTo(x + sx * k, y + sy * k); g.lineTo(x + sx * (k - e), y + sy * k); });
      g.stroke();
    }
    g.restore();
  }

  // ---- input: each finger holds the buttons of the control under it
  function setHeld(p, list) {
    for (const b of p.held) if (!list.includes(b)) I().touch(b, false);
    for (const b of list) if (!p.held.includes(b)) I().touch(b, true);
    p.held = list.slice();
    restate();
  }
  // which buttons each control shows as pressed (every finger on it), redrawn when that changes
  function restate() {
    const now = {}; CTL.forEach(c => { now[c.id] = {}; });
    ptrs.forEach(p => { p.held.forEach(b => { now[p.c.id][b] = true; }); });
    CTL.forEach(c => { const a = JSON.stringify(c.on), b = JSON.stringify(now[c.id]); if (a !== b) { c.on = now[c.id]; draw(c); } });
  }
  // the D-pad's directions at a point: 8 ways, the straight ones a little wider (menus), nothing in the middle
  function dirsAt(c, x, y) {
    const r = c.el.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.1) return [];
    const a = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, W = 27.5;
    const near = (t) => Math.abs(((a - t + 540) % 360) - 180) <= W;
    if (near(0)) return ['right']; if (near(90)) return ['down']; if (near(180)) return ['left']; if (near(270)) return ['up'];
    return a < 90 ? ['right', 'down'] : a < 180 ? ['down', 'left'] : a < 270 ? ['left', 'up'] : ['up', 'right'];
  }
  // the face button under a point (a thumb rolling from Square to Cross), with a little slack around each
  function faceAt(x, y) {
    let best = null, bd = Infinity;
    for (const id of ['menu', 'ok', 'cancel', 'square']) {
      const c = byId[id], r = c.el.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < r.width * 0.62 && d < bd) { best = c; bd = d; }
    }
    return best;
  }
  function onDown(e) {
    const el = e.target && e.target.closest ? e.target.closest('.tc') : null;
    if (!el || !el._c || !el._c.vis) return;
    e.preventDefault();
    const c = el._c, old = ptrs.get(e.pointerId);
    if (old) { ptrs.delete(e.pointerId); setHeld(old, []); }   // (a finger we never saw lifted: let go of what it held)
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* (an old browser: the moves still come while the finger stays on it) */ }
    I().setDevice('touch');
    if (c.kind === 'toggle') { runOn = !runOn; I().touch('run', runOn); FF7.audio.sfx('cursor'); draw(c); return; }
    const p = { c, held: [], id: e.pointerId };
    ptrs.set(e.pointerId, p);
    if (c.kind === 'action') { restate(); return; }
    setHeld(p, c.kind === 'dpad' ? dirsAt(c, e.clientX, e.clientY) : c.b);
  }
  function onMove(e) {
    const p = ptrs.get(e.pointerId); if (!p) return;
    e.preventDefault();
    if (p.c.kind === 'dpad') setHeld(p, dirsAt(p.c, e.clientX, e.clientY));
    else if (p.c.kind === 'face') { const c = faceAt(e.clientX, e.clientY); if (c && c !== p.c) { p.c = c; setHeld(p, c.b); } }
  }
  function onUp(e) {
    if (e.type === 'pointerup' && FF7.audio) FF7.audio.unlock();   // (a touch's release is what lets a page start sound)
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    setHeld(p, []);
    if (p.c.kind === 'action' && e.type === 'pointerup') {
      const r = p.c.el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) toggleFull();
    }
  }
  function releaseCtl(c) { ptrs.forEach((p, id) => { if (p.c === c) { ptrs.delete(id); setHeld(p, []); } }); }
  function releaseAll() { ptrs.forEach(p => setHeld(p, [])); ptrs.clear(); I().touchRelease(); if (runOn) runOn = false; restate(); draw(byId.run); }

  // ---- full screen (Android, tablets; an iPhone's Safari can't)
  function fullOk() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function toggleFull() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else { const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { /* refused: stays as it is */ }
  }

  // ---- set up (js/main.js FF7.boot, after the canvas)
  T.init = function () {
    if (inited || !hasDom || !document.body) return;
    try { coarse = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches); } catch (e) { coarse = false; }
    root = document.createElement('div'); root.id = 'touch'; root.style.display = 'none';
    CTL.forEach(c => {
      const el = document.createElement('div'); el.className = 'tc tc-' + c.kind; el._c = c;
      const cv = document.createElement('canvas'); el.appendChild(cv);
      root.appendChild(el); c.el = el; c.cv = cv;
    });
    probe = document.createElement('div'); probe.id = 'safe-probe';
    document.body.appendChild(root); document.body.appendChild(probe);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('lostpointercapture', onUp);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    // a touch anywhere is touch input (Auto shows the controls again after a key or a pad hid them)
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') I().setDevice('touch'); }, true);
    window.addEventListener('touchend', () => FF7.audio && FF7.audio.unlock(), true);
    // no scrolling, pinching or double-tap zoom on the game's page
    document.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    ['gesturestart', 'gesturechange', 'dblclick'].forEach(t => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    // a finger lifted while the page was away never reports it: let go of everything
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    const re = () => FF7.render.resize();
    window.addEventListener('orientationchange', () => setTimeout(re, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', re);
    document.addEventListener('fullscreenchange', re);
    inited = true;
    modeSeen = cfgMode();
    T.refresh();
  };
})();

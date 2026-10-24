// Canvas setup + drawing primitives shared by every scene: FF7 gradient windows, text with
// shadow, gauges, the pointing-glove cursor, fades.
(function () {
  const U = FF7.util;
  const R = FF7.render = {};
  const W = FF7.W, H = FF7.H;

  R.init = function () {
    R.canvas = document.getElementById('screen');
    R.ctx = R.canvas.getContext('2d');
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  // Keep 4:3, fit the window, render at device resolution for crisp text.
  R.resize = function () {
    const ww = window.innerWidth, wh = window.innerHeight;
    const s = Math.min(ww / W, wh / H);
    const cw = Math.floor(W * s), ch = Math.floor(H * s);
    const dpr = window.devicePixelRatio || 1;
    R.canvas.style.width = cw + 'px';
    R.canvas.style.height = ch + 'px';
    R.canvas.width = Math.floor(cw * dpr);
    R.canvas.height = Math.floor(ch * dpr);
    R.scale = R.canvas.width / W;
    R.reset();
  };
  R.reset = function () {
    const c = R.ctx;
    c.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  };

  // ---------- Text ----------
  R.FONT = '"Segoe UI", Tahoma, Verdana, Arial, sans-serif';
  R.COL = {
    white: '#e8e8e8', gray: '#808080', dark: '#505050', cyan: '#62c8ff', yellow: '#f8e060',
    red: '#ff4040', green: '#60f070', blue: '#6aa0ff', orange: '#ffa040', purple: '#d080ff',
    label: '#62c8ff', shadow: '#202030',
  };
  R.font = function (size = 17, weight = '600') { return `${weight} ${size}px ${R.FONT}`; };
  R.setFont = function (size = 17, weight = '600') { R.ctx.font = R.font(size, weight); };
  R.text = function (str, x, y, opts = {}) {
    const c = R.ctx;
    str = String(str);
    c.font = opts.font || R.font(opts.size || 17, opts.weight || '600');
    c.textBaseline = opts.baseline || 'top';
    c.textAlign = opts.align || 'left';
    if (opts.shadow !== false) {
      c.fillStyle = opts.shadowColor || 'rgba(16,16,32,0.9)';
      c.fillText(str, x + 2, y + 2);
    }
    c.fillStyle = opts.color || R.COL.white;
    c.fillText(str, x, y);
    c.textAlign = 'left';
  };
  // one line of text centred on cy by its capitals (a label in a one-line box): the 'top' baseline leaves the
  // letters high in the box, so the baseline goes half a cap height below the centre (the font's own 'H')
  R.textMid = function (str, x, cy, opts = {}) {
    const c = R.ctx, size = opts.size || 17;
    c.font = opts.font || R.font(size, opts.weight || '600');
    c.textBaseline = 'alphabetic';   // (the ascent is measured from the current baseline: the last draw may have left 'top')
    const m = c.measureText('H'), cap = (m && m.actualBoundingBoxAscent) || size * 0.7;
    R.text(str, x, cy + cap / 2, Object.assign({}, opts, { baseline: 'alphabetic' }));
  };
  R.measure = function (str, size = 17, weight = '600') {
    R.ctx.font = R.font(size, weight);
    return R.ctx.measureText(String(str)).width;
  };
  // one line of text kept within maxW: a size smaller at most down to opts.minSize, then cut short with '…'
  R.textFit = function (str, x, y, maxW, opts = {}) {
    str = String(str);
    let size = opts.size || 17;
    const min = opts.minSize || Math.max(10, size - 3), weight = opts.weight || '600';
    while (size > min && R.measure(str, size, weight) > maxW) size--;
    if (R.measure(str, size, weight) > maxW) { while (str.length > 1 && R.measure(str + '…', size, weight) > maxW) str = str.slice(0, -1); str = str.trimEnd() + '…'; }
    R.text(str, x, y, Object.assign({}, opts, { size }));
  };
  // a paragraph kept within a box: wrapped to maxW, a size smaller at a time (down to opts.minSize) until it fits in
  // opts.lines lines; only past that is the last line cut short with '…'. Returns the height it took.
  R.para = function (str, x, y, maxW, opts = {}) {
    let size = opts.size || 15;
    const min = opts.minSize || Math.max(9, size - 4), maxL = opts.lines || 3;
    let lines = R.wrap(str, maxW, size);
    while (lines.length > maxL && size > min) lines = R.wrap(str, maxW, --size);
    if (lines.length > maxL) {
      lines = lines.slice(0, maxL);
      let l = lines[maxL - 1];
      while (l.length > 1 && R.measure(l + '…', size) > maxW) l = l.slice(0, -1);
      lines[maxL - 1] = l.trimEnd() + '…';
    }
    const lh = opts.lineH || Math.round(size * 1.3);
    lines.forEach((l, i) => R.text(l, x, y + i * lh, Object.assign({}, opts, { size })));
    return lines.length * lh;
  };
  // Word-wrap text into lines of max width.
  R.wrap = function (str, maxW, size = 17) {
    const out = [];
    String(str).split('\n').forEach(par => {
      const words = par.split(' ');
      let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (R.measure(t, size) > maxW && line) { out.push(line); line = w; }
        else line = t;
      }
      out.push(line);
    });
    return out;
  };

  // ---------- FF7 window ----------
  R.windowColors = ['#0058b0', '#000080', '#000050', '#002040']; // TL, TR, BL, BR
  const grad = U.makeCanvas(2, 2);
  function updateGrad() {
    const g = grad.getContext('2d');
    const cols = (FF7.state && FF7.state.config && FF7.state.config.windowColors) || R.windowColors;
    const key = cols.join();
    if (grad._key === key) return;
    grad._key = key;
    const id = g.createImageData(2, 2);
    cols.forEach((hex, i) => { const [r, gg, b] = U.hexToRgb(hex); id.data.set([r, gg, b, 255], i * 4); });
    g.putImageData(id, 0, 0);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  R.roundRect = roundRect;
  // Draw a standard FF7 blue gradient window. alpha for fade-in, opts.flat for plain color.
  R.window = function (x, y, w, h, opts = {}) {
    const c = R.ctx;
    updateGrad();
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    c.save();
    if (opts.alpha != null) c.globalAlpha *= opts.alpha;
    roundRect(c, x, y, w, h, 7);
    c.save();
    c.clip();
    if (opts.color) { c.fillStyle = opts.color; c.fillRect(x, y, w, h); }
    else if (opts.colors) {   // custom 4-corner palette (e.g. the pink Limit Break banner)
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, opts.colors[0]); g.addColorStop(0.45, opts.colors[1]); g.addColorStop(0.75, opts.colors[2]); g.addColorStop(1, opts.colors[3]);
      c.fillStyle = g; c.fillRect(x, y, w, h);
    } else {
      c.imageSmoothingEnabled = true;
      c.drawImage(grad, 0.5, 0.5, 1, 1, x, y, w, h);
      c.imageSmoothingEnabled = false;
    }
    if (opts.translucent) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y, w, h); }
    c.restore();
    // border: light outer, dark inner (FF7 bevel)
    c.lineWidth = 2;
    c.strokeStyle = '#6c6c7c';
    roundRect(c, x + 1, y + 1, w - 2, h - 2, 6); c.stroke();
    c.lineWidth = 1.5;
    c.strokeStyle = '#e0e0ec';
    roundRect(c, x + 1.5, y + 1.5, w - 3, h - 3, 6); c.stroke();
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(40,40,60,0.9)';
    roundRect(c, x + 3.5, y + 3.5, w - 7, h - 7, 4); c.stroke();
    c.restore();
  };

  // ---------- Glove cursor ----------
  const glove = U.makeCanvas(26, 18);
  (function drawGlove() {
    const g = glove.getContext('2d');
    g.lineJoin = 'round';
    // index finger pointing right
    g.fillStyle = '#f4f4f4'; g.strokeStyle = '#303040'; g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(2, 5); g.lineTo(9, 3); g.lineTo(22, 4.5); g.quadraticCurveTo(25, 6, 22, 8.2);
    g.lineTo(13, 8.5); g.lineTo(14, 11); g.quadraticCurveTo(15, 13.5, 12, 13.8);
    g.lineTo(12.5, 15.5); g.quadraticCurveTo(12, 17.2, 9, 16.8); g.lineTo(3, 15.5); g.lineTo(1.5, 11);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#9090a0'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(8, 11); g.lineTo(13, 11); g.moveTo(7.5, 13.8); g.lineTo(12, 13.8); g.stroke();
    // cuff
    g.fillStyle = '#c8c8d0'; g.fillRect(0, 5, 3, 11);
  })();
  // Draw the glove so its fingertip is at (x, y) pointing right. flip = point left.
  R.cursor = function (x, y, opts = {}) {
    const c = R.ctx;
    const bob = opts.still ? 0 : Math.round(Math.sin(FF7.frame / 5) * 1.5);
    c.save();
    if (opts.alpha != null) c.globalAlpha = opts.alpha;
    const k = opts.scale || 1;   // (smaller in tight grids: the naming screen)
    if (opts.flip) { c.translate(x - bob, y); c.scale(-k, k); c.drawImage(glove, -25, -7); }
    else if (k !== 1) { c.translate(x + bob, y); c.scale(k, k); c.drawImage(glove, -25, -7); }
    else c.drawImage(glove, x - 25 + bob, y - 7);
    c.restore();
  };

  // ---------- Gauges ----------
  // FF7-style thin bar: background + gradient fill
  R.bar = function (x, y, w, h, frac, col1, col2, bg = '#202028') {
    const c = R.ctx;
    frac = U.clamp(frac, 0, 1);
    c.fillStyle = bg; c.fillRect(x, y, w, h);
    if (frac > 0) {
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, col1); g.addColorStop(1, col2);
      c.fillStyle = g; c.fillRect(x, y, Math.max(1, Math.round(w * frac)), h);
    }
  };
  // FF7 battle gauge (LIMIT / TIME / WAIT): light-grey bevelled frame with a drop shadow, a grey
  // empty track, and a glossy "tube" fill (dark top edge, white highlight, lighter body).
  // tube: { edge, hi, body } colours.
  R.GAUGE = {
    limit: { edge: '#b0508c', hi: '#ffffff', body: '#f4a8d4' },
    time: { edge: '#c88838', hi: '#fff8e0', body: '#ffd898' },       // the acting member (orange)
    full: { edge: '#c8b870', hi: '#ffffff', body: '#f4ecb8' },       // ready, waiting (pale yellow)
    wait: { edge: '#3c9c74', hi: '#f0fff8', body: '#a8f0cc' },       // filling in Wait mode (mint)
    fill: { edge: '#a8843c', hi: '#fff4d8', body: '#e8c878' },       // filling (gold)
    fury: { edge: '#b02020', hi: '#ffffff', body: '#ff8080' },
    sadness: { edge: '#3050b0', hi: '#ffffff', body: '#90b0ff' },
  };
  R.gauge = function (x, y, w, h, frac, tube) {
    const c = R.ctx;
    frac = U.clamp(frac, 0, 1);
    c.save();
    c.fillStyle = '#18181e'; c.fillRect(x - 2, y - 2, w + 6, h + 6);          // drop shadow (down-right)
    c.fillStyle = '#c6c6cc'; c.fillRect(x - 3, y - 3, w + 6, h + 6);          // light grey frame
    c.fillStyle = '#2a2a30'; c.fillRect(x - 1, y - 1, w + 2, h + 2);          // dark inner rim
    const tg = c.createLinearGradient(0, y, 0, y + h);                        // empty track
    tg.addColorStop(0, '#5e5e64'); tg.addColorStop(1, '#9c9ca2');
    c.fillStyle = tg; c.fillRect(x, y, w, h);
    const fw = Math.round(w * frac);
    if (fw > 0 && tube) {
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, tube.edge); g.addColorStop(0.22, tube.edge); g.addColorStop(0.42, tube.hi); g.addColorStop(0.6, tube.body); g.addColorStop(1, tube.body);
      c.fillStyle = g; c.fillRect(x, y, fw, h);
    }
    c.restore();
  };
  R.hpBar = (x, y, w, frac) => R.bar(x, y, w, 4, frac, '#3070e0', '#80e0ff');
  R.mpBar = (x, y, w, frac) => R.bar(x, y, w, 4, frac, '#40a040', '#a0ff90');

  // ---------- Misc ----------
  R.fill = function (color, alpha = 1) {
    const c = R.ctx;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(0, 0, W, H); c.restore();
  };
  R.clear = function () { R.ctx.fillStyle = '#000'; R.ctx.fillRect(0, 0, W, H); };
  R.img = function (img, x, y, w, h, opts = {}) {
    if (!img) return;
    const c = R.ctx;
    c.save();
    if (opts.alpha != null) c.globalAlpha = opts.alpha;
    if (opts.flip) { c.translate(x + (w || img.width), y); c.scale(-1, 1); c.drawImage(img, 0, 0, w || img.width, h || img.height); }
    else c.drawImage(img, x, y, w || img.width, h || img.height);
    c.restore();
  };

  // Image loading (portraits, fx sheets). Images that fail to load stay null.
  R.images = {};
  R.loadImage = function (src) {
    if (R.images[src] !== undefined) return R.images[src].ok ? R.images[src].img : null;
    const img = new Image();
    const rec = R.images[src] = { img, ok: false };
    img.onload = () => { rec.ok = true; };
    img.onerror = () => { rec.ok = false; rec.failed = true; };
    img.src = src;
    return null;
  };
  R.getImage = function (src) {
    const rec = R.images[src];
    if (!rec) { R.loadImage(src); return null; }
    return rec.ok ? rec.img : null;
  };
  // Countdown timer (FF7: large pink digits at the top left, no window; field and battle)
  R.drawTimer = function () {
    const t = FF7.state && FF7.state.timer; if (!t) return;
    const sec = Math.max(0, Math.ceil(t.t));
    const txt = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    const c = R.ctx; c.save();
    c.font = 'bold 30px ' + R.FONT; c.textAlign = 'left'; c.textBaseline = 'top';
    c.lineWidth = 4; c.strokeStyle = '#300818'; c.strokeText(txt, 16, 12);
    c.fillStyle = sec < 60 && FF7.frame % 30 < 15 ? '#ff90c0' : '#ff5aa8'; c.fillText(txt, 16, 12);
    c.restore();
  };
  R.portrait = function (id) { return R.getImage('assets/portraits/' + id + '.png'); };
})();

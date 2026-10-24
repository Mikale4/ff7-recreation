// The Mog Box (docs/KUPOMON.md), Pokémon's PC: your team down the left, 50 boxes of 30 (six by five) on the right,
// each moogle a small picture of its own 3D model (rendered once per kind, KP.moogleIcon). OK on a moogle: Move (it
// lifts; OK again on any slot puts it down, swapping with whoever is there: team and box alike) or Summary. L1 / R1
// (A / S) the box before / after from anywhere on the screen, Box 50 and Box 1 joined (the user, 2026-10-04); Square
// (D), or OK on the box's name: Sort.
//   yield KP.boxView()   (the Mog Box's talk in every Mog Center, KP.W.mogBox)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, MG = FF7.minigames, GL = FF7.GL;
  const W = FF7.W, H = FF7.H;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  const D = () => FF7.state.kp;
  const PER = 30, COLS = 6, ROWS = 5, BOXES = 50, TEAM = KP.PARTY_MAX || 6, TROW = TEAM > 5 ? 53 : 64, TICON = TEAM > 5 ? 46 : 56;   // (six team rows fit the window: a little tighter)
  KP.BOXES = BOXES; KP.BOX_SIZE = PER; KP.BOX_MAX = BOXES * PER;   // (1,500 moogles in all)
  const keyOf = (b) => { const I = FF7.input; return I && I.label ? I.label(b) : b.toUpperCase(); };   // (hints name the player's own keys)
  // a key's name in a small frame; x: its edge on the side it's aligned to. Returns its width
  function keycap(label, x, y, align) {
    const c = R.ctx, w = Math.ceil(R.measure(label, 11)) + 10, x0 = align === 'right' ? x - w : x;
    c.save(); c.fillStyle = 'rgba(200,215,255,0.12)'; c.fillRect(x0, y, w, 17);
    c.strokeStyle = 'rgba(200,215,255,0.6)'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y + 0.5, w - 1, 16); c.restore();
    R.text(label, x0 + w / 2, y + 2, { size: 11, align: 'center', color: R.COL.white });
    return w;
  }

  // ------------------------------------------------------------------ the storage: 50 boxes of 30
  // d.box stays one list of every boxed moogle, in the order they came in (whoever reads it: the Demo, the quests, Hard
  // Mode's refill); each one's place is its own mon.bx (0 .. 1499: box k holds k*30 .. k*30+29), so a box can have gaps
  // and a moogle can wait in any box. One with no place yet (an old save's, or one put in by other code) takes the first
  // free one in list order, so an old save's box looks as it did. Returns the places: grid[slot] = moogle or null
  KP.boxGrid = function (d) {
    d = d || D(); const g = new Array(KP.BOX_MAX).fill(null), loose = [];
    for (const m of d.box) { const s = m.bx; if (Number.isInteger(s) && s >= 0 && s < KP.BOX_MAX && !g[s]) g[s] = m; else loose.push(m); }
    let f = 0;
    for (const m of loose) { while (f < KP.BOX_MAX && g[f]) f++; if (f >= KP.BOX_MAX) break; g[f] = m; m.bx = f; }
    return g;
  };
  KP.boxFull = (d) => (d || D()).box.length >= KP.BOX_MAX;
  // no room anywhere (the team and every box): a befriended moogle can't come along (KP.receive: 'full')
  KP.storageFull = (d) => { d = d || D(); return d.party.length >= (KP.PARTY_MAX || 6) && KP.boxFull(d); };
  KP.STORAGE_FULL_TEXT = 'Your team and all 50 Mog Boxes are full! There is no room for another moogle.';
  // a moogle just put in d.box (KP.receive): the first free place
  KP.boxPlace = function (mon, d) { delete mon.bx; KP.boxGrid(d); return mon.bx; };

  // sorting (the box screen's Sort): every boxed moogle in order from Box 1's first place, no gaps; the same sort again
  // goes the other way (d.boxSort: the last one). "Arrival" is d.box's own order (the newest at its end)
  KP.BOX_SORTS = [
    { id: 'dex', name: 'Kupodex No.', dir: 1, ways: ['first to last', 'last to first'] },
    { id: 'name', name: 'Name', dir: 1, ways: ['A to Z', 'Z to A'] },
    { id: 'lv', name: 'Level', dir: -1, ways: ['low to high', 'high to low'] },
    { id: 'job', name: 'Job', dir: 1, ways: ['A to Z', 'Z to A'] },
    { id: 'plus', name: 'Bred +', dir: -1, ways: ['fewest first', 'most first'] },
    { id: 'new', name: 'Arrival', dir: -1, ways: ['oldest first', 'newest first'] },
  ];
  KP.boxSortLabel = (s, dir) => s.id === 'new' ? (dir < 0 ? 'Newest first' : 'Oldest first') : `${s.name}  (${s.ways[dir > 0 ? 0 : 1]})`;
  KP.sortBox = function (id, dir, d) {
    d = d || D(); const s = KP.BOX_SORTS.find(q => q.id === id); if (!s) return false;
    dir = dir || s.dir;
    const dexAt = KP._dexAt && KP._dexAt.size === KP.DEX.length ? KP._dexAt : (KP._dexAt = new Map(KP.DEX.map((k, i) => [k, i])));
    const keyFn = { dex: (m) => dexAt.has(m.sp) ? dexAt.get(m.sp) : 1e6, name: (m) => KP.name(m).toLowerCase(), lv: (m) => m.lv, job: (m) => KP.jobName(m).toLowerCase(), plus: (m) => m.plus || 0 }[id];
    const cmp = (a, b) => typeof a === 'string' ? a.localeCompare(b) : a < b ? -1 : a > b ? 1 : 0;
    const rows = d.box.map((m, i) => ({ m, i, k: keyFn ? keyFn(m) : i, n: dexAt.has(m.sp) ? dexAt.get(m.sp) : 1e6 }));
    rows.sort((a, b) => dir * cmp(a.k, b.k) || a.n - b.n || b.m.lv - a.m.lv || a.i - b.i);
    rows.forEach((r, k) => { r.m.bx = k; });
    d.boxSort = { id, dir };
    return true;
  };

  // ------------------------------------------------------------------ icons: each kind's model, drawn once, small
  const icons = new Map(), ICON = 80;
  let iconCam = null;
  KP.moogleIcon = function (id, make) {
    const c0 = icons.get(id);
    if (c0 || !make || !GL.ok || !GL.canvas || typeof document === 'undefined' || !KP.SPECIES[id]) return c0 || null;   // (no GL canvas: a headless check)
    const m = KP.moogleModel(id);
    const c = document.createElement('canvas'); c.width = c.height = ICON;
    if (!iconCam) iconCam = new MG.Cam();
    iconCam.set([0, 0.5, 2.15], [0, 0.42, 0], 30, 0.1, 20);
    GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.35, -0.7, -0.6], color: [0.95, 0.93, 0.9], ambient: [0.55, 0.55, 0.62] } });
    iconCam.apply();
    MG.drawModel(m, [0, 0, 0], 0.45, 0, 0);
    // (the model stands in the middle of the frame: that square, shrunk; no GL.end, nothing goes on screen)
    const k = GL.canvas.width / W, side = 250;
    c.getContext('2d').drawImage(GL.canvas, (W - side) / 2 * k, (H - side) / 2 * k, side * k, side * k, 0, 0, ICON, ICON);
    icons.set(id, c);
    return c;
  };
  // a moogle's picture in a square (its icon once made; till then, or with no 3D, its type's gem)
  KP.drawMoogleIcon = function (mon, x, y, size, o = {}) {
    const ic = KP.moogleIcon(mon.sp);
    const c = R.ctx;
    if (ic) { c.save(); if (o.alpha != null) c.globalAlpha = o.alpha; c.drawImage(ic, x, y, size, size); c.restore(); }
    else KP.typeGem(KP.typeOf(mon), x + size / 2, y + size / 2, size * 0.22);
  };
  // the same picture drawn live (the menu's selected moogle, as the old games' party icons hop): its 3D model rendered
  // this frame, its idle playing, a little hop (o.hop 0..1); no 3D: the still picture, lifted
  const live = new Map(); let liveCam = null;
  KP.drawMoogleLive = function (mon, x, y, size, o = {}) {
    const hop = o.hop || 0;
    if (!GL.ok || !GL.canvas || typeof document === 'undefined' || !KP.SPECIES[mon.sp]) return KP.drawMoogleIcon(mon, x, y - hop * size * 0.12, size, o);
    let L = live.get(mon.sp);
    if (!L) {
      const m = KP.moogleModel(mon.sp); if (m.anims && m.anims.idle && m.play) m.play(m.anims.idle);
      L = { m, f: -1 }; live.set(mon.sp, L);
      if (live.size > 8) live.delete(live.keys().next().value);   // (a few kept: the team's)
    }
    if (L.f !== FF7.frame) { L.f = FF7.frame; if (L.m.update) L.m.update(1); }
    if (!liveCam) liveCam = new MG.Cam();
    liveCam.set([0, 0.5, 2.15], [0, 0.42, 0], 30, 0.1, 20);   // (KP.moogleIcon's framing)
    GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.35, -0.7, -0.6], color: [0.95, 0.93, 0.9], ambient: [0.55, 0.55, 0.62] } });
    liveCam.apply();
    MG.drawModel(L.m, [0, hop * 0.06, 0], o.yaw != null ? o.yaw : 0.45, 0, 0);   // (a few pixels: the frame stays round it)
    const k = GL.canvas.width / W, side = 250;
    R.ctx.drawImage(GL.canvas, (W - side) / 2 * k, (H - side) / 2 * k, side * k, side * k, x, y, size, size);
  };

  // ---- the whole moogle, small (the MOOGLES menu: the user, 2026-10-04, "I wanted the full moogle models showing, just
  // small enough to fit inside. I did not want them to be cropped like that"): each kind framed to its own size. Drawn
  // once from far enough back, the outline of its pixels found, and the square round that outline (a margin, room for
  // the hop) is its frame; a kind that still touches the edge is drawn again from further back. The frame and the
  // distance are kept per kind; the selected one is drawn live in the same frame
  const fullIcons = new Map(), fullFrames = new Map(); let fullCam = null;
  const FULL_LIGHT = { dir: [-0.35, -0.7, -0.6], color: [0.95, 0.93, 0.9], ambient: [0.55, 0.55, 0.62] };
  const fullRender = (m, dist, hopY) => {
    if (!fullCam) fullCam = new MG.Cam();
    fullCam.set([0, 0.25 + dist * 0.12, dist], [0, 0.55, 0], 30, 0.1, 40);
    GL.begin({ clear: [0, 0, 0, 0], light: FULL_LIGHT });
    fullCam.apply();
    MG.drawModel(m, [0, hopY || 0, 0], 0.45, 0, 0);
  };
  const fullFrame = (id, m) => {
    let f = fullFrames.get(id); if (f) return f;
    const side = 440, sx0 = (W - side) / 2, sy0 = (H - side) / 2, N = 220, k = GL.canvas.width / W;
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = N; const t = tmp.getContext('2d');
    for (let dist = 4.4, tries = 0; tries < 4; tries++, dist *= 1.45) {
      fullRender(m, dist, 0);
      t.clearRect(0, 0, N, N); t.drawImage(GL.canvas, sx0 * k, sy0 * k, side * k, side * k, 0, 0, N, N);
      const px = t.getImageData(0, 0, N, N).data; let x0 = N, y0 = N, x1 = -1, y1 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (px[(y * N + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { f = { x: sx0, y: sy0, s: side, dist }; break; }
      const touch = x0 <= 1 || y0 <= 1 || x1 >= N - 2 || y1 >= N - 2;
      if (touch && tries < 3) continue;   // (cut off at the edge: from further back)
      const sc = side / N, cx = sx0 + (x0 + x1) / 2 * sc, cy = sy0 + (y0 + y1) / 2 * sc, sz = Math.max(x1 - x0, (y1 - y0) * 1.08) * sc * 1.16 + 4;
      f = { x: cx - sz / 2, y: cy - sz / 2 - sz * 0.03, s: sz, dist };   // (a margin all round, a little more over its head: the hop)
      break;
    }
    fullFrames.set(id, f); return f;
  };
  KP.moogleIconFull = function (id, make) {
    const c0 = fullIcons.get(id);
    if (c0 || !make || !GL.ok || !GL.canvas || typeof document === 'undefined' || !KP.SPECIES[id]) return c0 || null;
    const m = KP.moogleModel(id), f = fullFrame(id, m), k = GL.canvas.width / W;
    fullRender(m, f.dist, 0);
    const c = document.createElement('canvas'); c.width = c.height = ICON;
    c.getContext('2d').drawImage(GL.canvas, f.x * k, f.y * k, f.s * k, f.s * k, 0, 0, ICON, ICON);
    fullIcons.set(id, c);
    return c;
  };
  KP.drawMoogleIconFull = function (mon, x, y, size, o = {}) {
    const ic = KP.moogleIconFull(mon.sp), c = R.ctx;
    if (ic) { c.save(); if (o.alpha != null) c.globalAlpha = o.alpha; c.drawImage(ic, x, y, size, size); c.restore(); }
    else KP.typeGem(KP.typeOf(mon), x + size / 2, y + size / 2, size * 0.22);
  };
  const liveFull = new Map();
  KP.drawMoogleLiveFull = function (mon, x, y, size, o = {}) {
    const hop = o.hop || 0;
    if (!GL.ok || !GL.canvas || typeof document === 'undefined' || !KP.SPECIES[mon.sp]) return KP.drawMoogleIconFull(mon, x, y - hop * size * 0.1, size, o);
    let L = liveFull.get(mon.sp);
    if (!L) {
      const m = KP.moogleModel(mon.sp); if (m.anims && m.anims.idle && m.play) m.play(m.anims.idle);
      L = { m, f: -1 }; liveFull.set(mon.sp, L);
      if (liveFull.size > 8) liveFull.delete(liveFull.keys().next().value);
    }
    if (L.f !== FF7.frame) { L.f = FF7.frame; if (L.m.update) L.m.update(1); }
    const f = fullFrame(mon.sp, L.m), k = GL.canvas.width / W;
    fullRender(L.m, f.dist, hop * 0.05 * (f.dist / 4.4));
    R.ctx.drawImage(GL.canvas, f.x * k, f.y * k, f.s * k, f.s * k, x, y, size, size);
  };

  // a person's portrait (a tournament's bracket: the user, 2026-10-03, "it should also show a portrait of the
  // participants"): their own 3D model, head and shoulders, drawn once per look like the moogles' icons
  const faces = new Map(); let faceCam = null;
  KP.personIcon = function (model, make) {
    const key = typeof model === 'string' ? model : JSON.stringify(model || 'cloud');
    if (faces.has(key)) return faces.get(key);
    if (!make || !GL.ok || !GL.canvas || typeof document === 'undefined') return null;
    let m = null; try { m = FF7.field.buildModel(model || 'cloud'); } catch (e) { m = null; }
    if (!m) { faces.set(key, null); return null; }
    if (m.anims && m.anims.idle && m.play) { m.play(m.anims.idle); if (m.update) m.update(0); }
    const h = m.height || 1.6, c = document.createElement('canvas'); c.width = c.height = ICON;   // (its height has its field scale in it already)
    if (!faceCam) faceCam = new MG.Cam();
    faceCam.set([0, h * 0.86, h * 0.95], [0, h * 0.82, 0], 30, 0.05, 20);
    GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.35, -0.6, -0.7], color: [0.95, 0.93, 0.9], ambient: [0.55, 0.55, 0.62] } });
    faceCam.apply();
    m.scale = 1; MG.drawModel(m, [0, 0, 0], 0.25, 0, 0);
    const k = GL.canvas.width / W, side = 250;
    c.getContext('2d').drawImage(GL.canvas, (W - side) / 2 * k, (H - side) / 2 * k, side * k, side * k, 0, 0, ICON, ICON);
    faces.set(key, c);
    return c;
  };
  // a person's portrait in a framed square (its picture once made; till then a plain frame)
  KP.drawPersonIcon = function (model, x, y, size, o = {}) {
    const c = R.ctx, ic = KP.personIcon(model);
    c.save(); c.fillStyle = o.bg || 'rgba(40,52,90,0.9)'; c.fillRect(x, y, size, size);
    if (ic) { if (o.alpha != null) c.globalAlpha = o.alpha; c.drawImage(ic, x, y, size, size); }
    c.globalAlpha = 1; c.strokeStyle = o.ring || 'rgba(200,210,240,0.7)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1); c.restore();
  };

  // ------------------------------------------------------------------ the screen
  KP.boxView = function () { const w = { done: false }; S().push(new BoxView(w)); return w; };
  class BoxView {
    constructor(w) {
      // (it opens on the box it was left on, as Pokémon's PC does: d.boxPage)
      this.w = w; this.t = 0; this.page = Math.max(0, Math.min(BOXES - 1, D().boxPage | 0)); this.zone = 'box'; this.ti = 0; this.bi = 0;
      this.held = null;            // { list: 'team' | 'box', i } while a moogle is lifted (a box one's i: its place, 0 .. 1499)
      this.pop = null;             // { idx } the Move / Summary / Cancel menu
      this.sortMenu = null;        // { idx } the Sort menu
      this.summary = null;         // a moogle whose summary is open
      this.msg = null; this.cam = new MG.Cam(); this.sumModel = null;
      this.grid = KP.boxGrid();    // (the places, fresh each frame: KP.boxGrid)
    }
    pages() { return BOXES; }
    // the box before / after (dir -1 / +1), Box 1 and Box 50 joined
    turn(dir) { this.page = (this.page + BOXES + dir) % BOXES; sfx('cursor'); }
    // the slot under the cursor: { list, i } (a team i past the end, or a free box place: an empty slot)
    at() { return this.zone === 'team' ? { list: 'team', i: this.ti } : this.zone === 'box' ? { list: 'box', i: this.page * PER + this.bi } : null; }
    monAt(a) { if (!a) return null; return (a.list === 'team' ? D().party[a.i] : this.grid[a.i]) || null; }
    update() {
      const I = FF7.input; this.t++; this.grid = KP.boxGrid();
      if (this.msg) { if (--this.msg.t <= 0 || ((I.pressed('ok') || I.back()) && this.msg.t < 70)) this.msg = null; return; }
      if (this.summary) { if (I.pressed('ok') || I.back()) { sfx('cancel'); this.summary = null; this.sumModel = null; } return; }
      if (this.pop) {
        if (I.repeat('up')) { this.pop.idx = (this.pop.idx + 2) % 3; sfx('cursor'); }
        if (I.repeat('down')) { this.pop.idx = (this.pop.idx + 1) % 3; sfx('cursor'); }
        if (I.back()) { sfx('cancel'); this.pop = null; return; }
        if (I.pressed('ok')) {
          const k = this.pop.idx, a = this.at(); this.pop = null;
          if (k === 0) { sfx('confirm'); this.held = a; }
          else if (k === 1) { sfx('confirm'); this.summary = this.monAt(a); }
          else sfx('cancel');
        }
        return;
      }
      if (this.sortMenu) return this.updateSort(I);
      // L1 / R1 (A / S): the box before / after, from anywhere (a lifted moogle rides along); Square (D): Sort
      if (I.repeat('l1')) { this.turn(-1); return; }
      if (I.repeat('r1')) { this.turn(1); return; }
      if (I.pressed('square')) { this.openSort(); return; }
      // moving the cursor: the team's column, the box's grid, the box's name above it (left / right: the next box)
      if (this.zone === 'team') {
        if (I.repeat('up')) { this.ti = (this.ti + TEAM - 1) % TEAM; sfx('cursor'); }
        if (I.repeat('down')) { this.ti = (this.ti + 1) % TEAM; sfx('cursor'); }
        if (I.repeat('right')) { this.zone = 'box'; this.bi = Math.min(this.ti, ROWS - 1) * COLS; sfx('cursor'); }
      } else if (this.zone === 'box') {
        const r = Math.floor(this.bi / COLS), col = this.bi % COLS;
        if (I.repeat('left')) { if (col === 0) { this.zone = 'team'; this.ti = Math.min(r, TEAM - 1); } else this.bi--; sfx('cursor'); }
        else if (I.repeat('right')) { if (col < COLS - 1) this.bi++; sfx('cursor'); }
        else if (I.repeat('up')) { if (r === 0) this.zone = 'header'; else this.bi -= COLS; sfx('cursor'); }
        else if (I.repeat('down')) { if (r === ROWS - 1) this.zone = 'header'; else this.bi += COLS; sfx('cursor'); }
      } else {
        if (I.repeat('left')) this.turn(-1);
        if (I.repeat('right')) this.turn(1);
        if (I.repeat('down')) { this.zone = 'box'; this.bi = Math.min(this.bi % COLS, COLS - 1); sfx('cursor'); }
        if (I.repeat('up')) { this.zone = 'box'; this.bi = (ROWS - 1) * COLS + this.bi % COLS; sfx('cursor'); }
      }
      if (I.back()) {
        if (this.held) { sfx('cancel'); this.held = null; return; }
        sfx('cancel'); D().boxPage = this.page; S().pop(); this.w.done = true; return;
      }
      if (!I.pressed('ok')) return;
      if (this.zone === 'header') { this.openSort(); return; }   // (OK on the box's name: Sort, as Pokémon's box menu)
      const a = this.at();
      if (!a) return;
      if (this.held) { this.drop(a); return; }
      if (!this.monAt(a)) { sfx('error'); return; }
      sfx('confirm'); this.pop = { idx: 0 };
    }
    // the Sort menu: KP.BOX_SORTS, each the way it would go now (the same sort again: the other way), then Cancel
    openSort() {
      if (this.held) { sfx('error'); this.msg = { text: 'Put the moogle down first.', t: 80 }; return; }
      if (!D().box.length) { sfx('error'); this.msg = { text: 'The boxes are empty.', t: 80 }; return; }
      const last = D().boxSort; sfx('confirm');
      this.sortMenu = { idx: last ? Math.max(0, KP.BOX_SORTS.findIndex(s => s.id === last.id)) : 0 };
    }
    sortDir(s) { const last = D().boxSort; return last && last.id === s.id ? -last.dir : s.dir; }
    updateSort(I) {
      const m = this.sortMenu, n = KP.BOX_SORTS.length + 1;
      if (I.repeat('up')) { m.idx = (m.idx + n - 1) % n; sfx('cursor'); }
      if (I.repeat('down')) { m.idx = (m.idx + 1) % n; sfx('cursor'); }
      if (I.back()) { sfx('cancel'); this.sortMenu = null; return; }
      if (!I.pressed('ok')) return;
      this.sortMenu = null;
      if (m.idx >= KP.BOX_SORTS.length) { sfx('cancel'); return; }
      const s = KP.BOX_SORTS[m.idx], dir = this.sortDir(s);
      KP.sortBox(s.id, dir); this.grid = KP.boxGrid(); this.page = 0;
      sfx('set'); this.msg = { text: `Sorted every box by ${KP.boxSortLabel(s, dir)}, from Box 1.`, t: 90 };
    }
    // put the lifted moogle down on slot a: a swap with the one there; else that place (a box) or the team's end. Into
    // the box: d.box's end (the newest) and repaired; out of it: off d.box
    drop(a) {
      const d = D(), from = this.held, mon = this.monAt(from);
      if (!mon) { this.held = null; return; }
      if (from.list === a.list && from.i === a.i) { sfx('cancel'); this.held = null; return; }
      const other = this.monAt(a);
      const intoBox = (m, place) => { if (!d.box.includes(m)) { d.box.push(m); KP.healMon(m); } m.bx = place; };   // (a moogle put in the box comes out of it repaired)
      const outOfBox = (m) => { const i = d.box.indexOf(m); if (i >= 0) d.box.splice(i, 1); delete m.bx; };
      if (from.list === 'box' && a.list === 'box') { mon.bx = a.i; if (other) other.bx = from.i; }
      else if (from.list === 'team' && a.list === 'team') {
        if (other) { d.party[a.i] = mon; d.party[from.i] = other; } else { d.party.splice(from.i, 1); d.party.push(mon); }
      } else if (from.list === 'team') {   // (team -> box)
        if (other) { outOfBox(other); d.party[from.i] = other; intoBox(mon, a.i); }
        else {
          if (d.party.length <= 1) { sfx('error'); this.msg = { text: "That's your last moogle! Someone has to come along.", t: 100 }; return; }
          d.party.splice(from.i, 1); intoBox(mon, a.i);
        }
      } else {   // (box -> team)
        if (other) { outOfBox(mon); d.party[a.i] = mon; intoBox(other, from.i); }
        else {
          if (d.party.length >= TEAM) { sfx('error'); this.msg = { text: 'Your team is full.', t: 90 }; return; }
          outOfBox(mon); d.party.push(mon);
        }
      }
      sfx('set'); this.held = null; this.grid = KP.boxGrid();
    }
    render() {
      const d = D(), c = R.ctx;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#163040'); g.addColorStop(1, '#0a1620'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      // a few new pictures a frame (the team and this page first)
      const grid = this.grid = KP.boxGrid(), base = this.page * PER;
      let made = 0;
      for (const m of d.party.concat(grid.slice(base, base + PER).filter(Boolean))) { if (made >= 3) break; if (!KP.moogleIcon(m.sp)) { KP.moogleIcon(m.sp, true); made++; } }
      const held = this.held ? this.monAt(this.held) : null;
      // the team
      R.window(12, 12, 184, 360);
      R.text('TEAM', 28, 22, { size: 15, color: R.COL.cyan });
      for (let i = 0; i < TEAM; i++) {
        const y = 46 + i * TROW, m = d.party[i], here = this.zone === 'team' && this.ti === i, rh = TROW - 4, tx = TICON + 28;
        c.fillStyle = here ? 'rgba(120,200,255,0.18)' : 'rgba(0,0,30,0.25)'; c.fillRect(22, y, 164, rh);
        if (!m) { R.text('—', 104, y + rh / 2 - 8, { size: 13, color: R.COL.gray, align: 'center' }); continue; }
        const lifted = held === m;
        KP.drawMoogleIcon(m, 24, y + 2, TICON, { alpha: lifted ? 0.3 : 1 });
        R.textFit(KP.name(m), tx, y + 6, 182 - tx, { size: 13, minSize: 10, color: lifted ? R.COL.gray : R.COL.white });
        R.text('Lv ' + m.lv + (m.plus ? '  +' + m.plus : ''), tx, y + 24, { size: 12, color: R.COL.gray });
        R.bar(tx, y + rh - 9, 180 - tx, 4, m.hp / KP.maxHp(m), '#50d070', '#a0ffb0');
      }
      // the box
      R.window(204, 12, 424, 360);
      const hd = this.zone === 'header';
      R.text(`◀   BOX ${this.page + 1} of ${BOXES}   ▶`, 416, 22, { size: 15, align: 'center', color: hd ? R.COL.white : R.COL.cyan });
      const capL = keycap(keyOf('l1'), 338, 21, 'right'); keycap(keyOf('r1'), 494, 21, 'left');   // (the box before / after: the player's own keys, by the arrows)
      R.text(`${d.box.length} / ${KP.BOX_MAX}`, 616, 24, { size: 11, align: 'right', color: R.COL.gray });
      for (let k = 0; k < PER; k++) {
        const x = 214 + (k % COLS) * 68, y = 48 + Math.floor(k / COLS) * 64, m = grid[base + k], here = this.zone === 'box' && this.bi === k;
        c.fillStyle = here ? 'rgba(120,200,255,0.2)' : 'rgba(0,0,30,0.22)'; c.fillRect(x, y, 64, 60);
        if (m) {
          KP.drawMoogleIcon(m, x + 4, y, 56, { alpha: held === m ? 0.3 : 1 });
          R.text(String(m.lv), x + 62, y + 46, { size: 10, align: 'right', color: '#c8d8e8' });
          if (m.plus) R.text('+' + m.plus, x + 3, y + 46, { size: 10, color: '#ffd060' });
        }
      }
      // the cursor, and the lifted moogle riding on it
      const cx = this.zone === 'team' ? 30 : this.zone === 'box' ? 214 + (this.bi % COLS) * 68 + 10 : 338 - capL - 4 + 16;   // (the header: left of the key)
      const cy = this.zone === 'team' ? 46 + this.ti * TROW + (TROW - 4) / 2 : this.zone === 'box' ? 48 + Math.floor(this.bi / COLS) * 64 + 30 : 30;
      if (held) KP.drawMoogleIcon(held, cx - 4, cy - 52 + Math.sin(this.t * 0.15) * 2, 52);
      R.cursor(cx - 16, cy);
      // about the one under the cursor (or the lifted one)
      const m = held || this.monAt(this.at());
      R.window(12, 380, 616, 88);
      if (m) {
        const sp = KP.sp(m);
        R.text(`${KP.name(m)}  —  ${KP.jobName(m)}`, 28, 392, { size: 16 });
        R.text(`Lv ${m.lv}${m.plus ? '   Bred +' + m.plus : ''}`, 28, 418, { size: 13, color: R.COL.gray });
        KP.typeBadge(sp.type, 150, 418, 88, 17); if (sp.type2) KP.typeBadge(sp.type2, 244, 418, 88, 17);
        R.text('Held: ' + (m.held ? KP.ITEMS[m.held].name : 'nothing'), 28, 442, { size: 12, color: '#e8c060' });
        R.text(`HP ${m.hp} / ${KP.maxHp(m)}`, 600, 392, { size: 13, align: 'right' });
        if (KP.abilityOf) { const ab = KP.abilityOf(m); if (ab) R.text('Ability: ' + ab.name, 600, 418, { size: 12, align: 'right', color: '#a0d8ff' }); }
      } else R.text(this.zone === 'header' ? `Left / right or ${keyOf('l1')} / ${keyOf('r1')}: another box.   ${keyOf('ok')}: sort the boxes.` : 'An empty slot.', 28, 400, { size: 14, color: R.COL.gray });
      R.text((held ? `${keyOf('ok')}: put it here   ${keyOf('cancel')}: put it back` : `${keyOf('ok')}: Move / Summary   ${keyOf('cancel')}: close`)
        + `   ${keyOf('l1')} / ${keyOf('r1')}: box` + (held ? '' : `   ${keyOf('square')}: sort`), 600, 446, { size: 11, align: 'right', color: R.COL.gray });
      if (this.pop) {
        const px = Math.min(W - 150, cx + 30), py = Math.min(H - 120, cy - 10);
        R.window(px, py, 130, 96);
        ['Move', 'Summary', 'Cancel'].forEach((t, i) => R.text(t, px + 34, py + 12 + i * 26, { size: 15 }));
        R.cursor(px + 14, py + 22 + this.pop.idx * 26);
      }
      if (this.sortMenu) {   // (each sort the way it would go now)
        const L = KP.BOX_SORTS, px = 300, py = 70, pw = 260, ph = 52 + (L.length + 1) * 26;
        R.window(px, py, pw, ph);
        R.text('Sort every box by', px + 16, py + 12, { size: 14, color: R.COL.cyan });
        L.forEach((s, i) => R.textFit(KP.boxSortLabel(s, this.sortDir(s)), px + 40, py + 38 + i * 26, pw - 56, { size: 14, minSize: 11 }));
        R.text('Cancel', px + 40, py + 38 + L.length * 26, { size: 14 });
        R.cursor(px + 28, py + 48 + this.sortMenu.idx * 26);
      }
      if (this.summary) this.drawSummary(this.summary);
      if (this.msg) { R.window(120, 200, 400, 60); R.para(this.msg.text, 136, 214, 368, { size: 14, lines: 2 }); }
    }
    // the summary: the moogle itself, turning, and its numbers
    drawSummary(m) {
      const sp = KP.sp(m), max = KP.maxHp(m);
      R.window(24, 24, W - 48, H - 48);
      if (!this.sumModel || this.sumModel.uid !== m.uid) { const mm = KP.moogleModel(m.sp); if (mm.anims && mm.anims.idle) mm.play(mm.anims.idle); this.sumModel = { uid: m.uid, m: mm }; }
      R.ctx.fillStyle = 'rgba(0,0,20,0.35)'; R.ctx.fillRect(40, 60, 210, 250);
      this.cam.set([0.95, 0.9, 3.4], [0.95, 0.3, 0], 40, 0.1, 50);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.95, 0.93, 0.9], ambient: [0.5, 0.5, 0.58] } });
      this.cam.apply(); MG.shadow(0, 0, 0, 0.4, 0.4);
      if (this.sumModel.m.update) this.sumModel.m.update(1);
      MG.drawModel(this.sumModel.m, [0, 0, 0], this.t * 0.015, 0, 0);
      GL.end();
      const x = 270;
      R.text(`${KP.name(m)}  —  ${KP.jobName(m)}`, x, 40, { size: 18 });
      R.text(`Lv ${m.lv}${m.plus ? '   Bred +' + m.plus : ''}`, x, 66, { size: 13, color: R.COL.gray });
      KP.typeBadge(sp.type, x, 88, 88, 17); if (sp.type2) KP.typeBadge(sp.type2, x + 94, 88, 88, 17);
      const app = KP.appetiteOf ? KP.appetiteOf(m) : null;
      (KP.STATS || ['hp', 'atk', 'def', 'spd']).forEach((k, i) => {
        const col = app && app.plus === k ? '#ff9078' : app && app.minus === k ? '#80b8ff' : R.COL.white;
        R.text(`${KP.STAT_LABEL ? KP.STAT_LABEL[k] : k}  ${k === 'hp' ? m.hp + ' / ' + max : KP.stat(m, k)}`, x + (i % 2) * 170, 110 + Math.floor(i / 2) * 19, { size: 13, color: col });
      });
      R.text('Held: ' + (m.held ? KP.ITEMS[m.held].name : 'nothing') + (app ? '    ' + app.name : ''), x, 170, { size: 13, color: '#e8c060' });
      if (KP.abilityOf) { const ab = KP.abilityOf(m); if (ab) { R.text('Ability: ' + ab.name, x, 190, { size: 13, color: '#a0d8ff' }); R.para(ab.desc || '', x, 207, W - x - 40, { size: 11, minSize: 9, lines: 1, color: R.COL.gray }); } }
      m.moves.forEach((id, i) => {
        const mv = KP.MOVES[id]; if (!mv) return; const y = 236 + i * 30;
        KP.typeGem(mv.type, x + 6, y + 9, 7);
        R.text(mv.name, x + 18, y, { size: 14 });
        R.text(mv.power ? 'Power ' + mv.power : 'Status', W - 48, y + 1, { size: 12, align: 'right', color: R.COL.gray });
      });
      R.para(sp.desc || '', 40, 330, 210, { size: 11, minSize: 9, lines: 6, color: R.COL.gray });
      R.text('OK / Cancel: back', W - 40, H - 46, { size: 11, align: 'right', color: R.COL.gray });
    }
  }
  KP.BoxView = BoxView;
})();

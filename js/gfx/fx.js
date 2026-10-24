// Battle visual effects. Spells, limits and hits are procedural 3D compositions (flames, crystal
// blooms, sky bolts, heaving ground, shells, particles) built from FF7.fxs meshes and X.ptex
// textures, drawn inside the battle's 3D pass (FX.draw3d) so they are depth-tested against the
// models and sized to the target. Damage numbers, reels and status timers are drawn in 2D.
//   FX.play(preset, hitPositions[], opts) -> frames until the damage moment (opts.from: the caster; opts.scale)
//   FX.limitAura(battle, actor) -> { stop() }        FX.dice(battle, from, target, values)
//   FX.statusTick / statusPose / statusOpts / statusApplied: status visuals (end of this file)
(function () {
  const U = FF7.util, R = FF7.render, V = FF7.V3;
  const FX = FF7.fx = { list: [], list3: [], battle: null };
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, clamp = U.clamp, lerp = U.lerp;
  let X = null;                                             // FF7.fxs (js/gfx/fx_summons.js loads after this file)
  const need = () => (X = X || FF7.fxs);
  let errs = 0;
  const report = (e) => { if (errs++ < 5) console.error('[fx]', e); };

  const pending = [];
  FX.clear = () => { FX.list = []; FX.list3 = []; pending.length = 0; FX.battle = null; };
  FX.add = (e) => { e.t = 0; FX.list.push(e); return e; };
  FX.add3 = (e) => { e.t = 0; FX.list3.push(e); return e; };
  const alive = (e) => { e.t++; try { return e.update ? e.update(e) !== false && e.t < (e.life || 9999) : e.t < (e.life || 60); } catch (er) { report(er); return false; } };
  FX.update = () => {
    for (let i = pending.length - 1; i >= 0; i--) if (--pending[i].t <= 0) { const f = pending[i].fn; pending.splice(i, 1); f(); }
    // effects may spawn effects while updating (rock impacts): collect those into the fresh lists
    const l2 = FX.list, l3 = FX.list3; FX.list = []; FX.list3 = [];
    const k2 = l2.filter(alive), k3 = l3.filter(alive);
    FX.list = k2.concat(FX.list); FX.list3 = k3.concat(FX.list3);
  };
  FX.render = () => { const c = R.ctx; for (const e of FX.list) { c.save(); e.render(c); c.restore(); } if (FX.battle) { c.save(); statusRender2d(c, FX.battle); c.restore(); } };
  FX.busy = () => FX.list.some(e => e.blocking) || FX.list3.some(e => e.blocking);
  // 3D pass: called by BattleScene.render() after the combatants, before GL.end()
  FX.draw3d = function (cam, b) {
    if (!need()) return;
    const cm = { eye: cam.eye, target: cam.target, fov: cam.fov || 40 }; cm._basis = X.basis(cm);
    FX.cam = cm; if (b) FX.battle = b;
    for (const e of FX.list3) if (e.opq) { try { e.opq(cm, e); } catch (er) { report(er); } }
    if (b) { try { statusDraw3d(b, cm); } catch (er) { report(er); } }
    for (const e of FX.list3) if (e.draw) { try { e.draw(cm, e); } catch (er) { report(er); } }
  };
  function setTimeout0(fn, frames) { if (!frames) fn(); else pending.push({ fn, t: frames }); }
  FX.delay = setTimeout0;

  const proj = (p) => FF7.GL.project(p);

  // ---------------------------------------------------------------- damage numbers
  // FF7: chunky white digits with a black outline over the target's body, each digit bouncing in
  FX.number = function (pos, value, opts = {}) {
    const txt = typeof value === 'number' ? String(Math.floor(value)) : value;
    const col = opts.color || (opts.heal ? '#80ff80' : opts.mp ? '#c0a0ff' : '#ffffff');
    return FX.add({
      life: 70, pos: pos.slice(), delay: opts.delay || 0,
      render(c) {
        const t = this.t - this.delay; if (t < 0) return;
        const p = proj(this.pos); if (!p.visible) return;
        const size = opts.crit ? 26 : 22;
        c.font = `bold ${size}px ${R.FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.globalAlpha = t > 55 ? 1 - (t - 55) / 15 : 1;
        c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = '#08080c';
        const w = c.measureText(txt).width;
        let x = p.x - w / 2;
        for (let i = 0; i < txt.length; i++) {
          const ch = txt[i], cw = c.measureText(ch).width, td = t - i * 2;
          let dy = 0;
          if (td < 10) dy = -24 + td * 2.8; else if (td < 16) dy = Math.sin((td - 10) / 6 * Math.PI) * -6;
          c.strokeText(ch, x + cw / 2, p.y - 20 + dy);
          c.fillStyle = col; c.fillText(ch, x + cw / 2, p.y - 20 + dy);
          x += cw;
        }
        if (opts.crit && t < 40) { c.font = `bold 13px ${R.FONT}`; c.lineWidth = 3; c.strokeText('Critical!', p.x, p.y - 48); c.fillStyle = '#ffe060'; c.fillText('Critical!', p.x, p.y - 48); }
      },
    });
  };

  // ---------------------------------------------------------------- legacy atlas flip-book
  // Not used by the presets below (they are procedural). Plays ONE sprite group of a sheet (opts.group),
  // holds single-frame / static textures with a scale-in and fade (opts.hold, default 30 frames), and
  // never lives shorter than 20 frames. With FF7.fxs.useAtlas === false it draws a procedural burst.
  const ATLAS = () => FF7.data.fxAtlas || {};
  FX.findSheet = function (keys) {
    const A = ATLAS();
    for (const k of [].concat(keys)) {
      if (A[k]) return A[k];
      const pre = Object.keys(A).find(x => x.startsWith(k));
      if (pre) return A[pre];
    }
    return null;
  };
  FX.sheet = function (keys, pos, opts = {}) {
    need();
    const sheet = X && X.useAtlas === false ? null : FX.findSheet(keys);
    if (!sheet || !sheet.frames || !sheet.frames.length) return FX.burst(pos, opts.color || '#ffffff', 16, opts);
    const img = R.getImage(sheet.src) || (R.loadImage(sheet.src), null);
    let frames = sheet.frames;
    const gr = sheet.groups && sheet.groups[Math.min(sheet.groups.length - 1, opts.group || 0)];
    if (gr) frames = frames.slice(gr[0], gr[0] + gr[1]);
    if (opts.from != null || opts.to != null) frames = frames.slice(opts.from || 0, opts.to || frames.length);
    const still = sheet.static || frames.length === 1, fps = opts.fps || 2, loops = opts.loops || 1;
    const run = frames.length * fps * loops, life = still ? (opts.hold || 30) : Math.max(20, run + (opts.hold || 0));
    return FX.add({
      life, pos: pos.slice(), blocking: opts.blocking,
      render(c) {
        const im = img || R.getImage(sheet.src); if (!im) return;
        const p = proj(this.pos); if (!p.visible) return;
        const fi = still ? 0 : this.t < run ? Math.floor(this.t / fps) % frames.length : frames.length - 1;
        const f = frames[fi];
        const grow = still ? 0.6 + 0.4 * Math.min(1, this.t / 6) : 1;
        const sc = (opts.scale || 1) * (380 / Math.max(80, p.depth * 60)) * grow;
        const w = f[2] * sc, h = f[3] * sc;
        c.globalCompositeOperation = opts.blend || 'lighter';
        c.globalAlpha = (opts.alpha != null ? opts.alpha : 1) * Math.min(1, (life - this.t) / 10);
        if (opts.tint) { c.filter = opts.tint; }
        c.drawImage(im, f[0], f[1], f[2], f[3], p.x - w / 2, p.y - h * (opts.anchor != null ? opts.anchor : 0.6) - (opts.lift || 0), w, h);
      },
    });
  };

  // ---------------------------------------------------------------- 2D helpers (kept for callers)
  FX.burst = function (pos, color = '#ffffff', n = 18, opts = {}) {
    const parts = [];
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * (opts.speed || 4); parts.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 1), s: 2 + Math.random() * (opts.size || 4) }); }
    return FX.add({
      life: opts.life || 36, pos: pos.slice(),
      render(c) {
        const p = proj(this.pos); if (!p.visible) return;
        c.globalCompositeOperation = 'lighter';
        const k = 1 - this.t / this.life;
        c.fillStyle = color;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += opts.gravity != null ? opts.gravity : 0.12; c.globalAlpha = k; c.beginPath(); c.arc(p.x + q.x, p.y - 30 + q.y, q.s * k + 0.5, 0, Math.PI * 2); c.fill(); }
      },
    });
  };
  FX.glow = function (pos, color = '#ffffff', opts = {}) {
    return FX.add({
      life: opts.life || 30, pos: pos.slice(),
      render(c) {
        const p = proj(this.pos); if (!p.visible) return;
        const k = this.t / this.life, r = (opts.size || 60) * (0.5 + k);
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(p.x, p.y - 40, 0, p.x, p.y - 40, r);
        g.addColorStop(0, U.rgba(color, 0.9 * (1 - k))); g.addColorStop(1, U.rgba(color, 0));
        c.fillStyle = g; c.fillRect(p.x - r, p.y - 40 - r, r * 2, r * 2);
      },
    });
  };
  FX.screenTint = function (color = '#000000', alpha = 0.5, life = 60) {
    return FX.add({ life, render(c) { const k = Math.min(1, Math.min(this.t, life - this.t) / 12); c.globalAlpha = alpha * k; c.fillStyle = color; c.fillRect(0, 0, FF7.W, FF7.H); } });
  };

  // ================================================================ 3D effect blocks
  // Each block takes the target context c = { p: hit point, g: ground point, h: target height,
  // w: target width, i: target index, from / fromG: caster hit / ground point } and options o
  // (sizes are multiples of c.h / c.w). o.delay offsets the start, o.life is the block's duration.
  const BL = FX.blocks = {};
  const eff = (o, life, draw, extra = {}) => {
    const d0 = o.delay || 0, e = { life: life + d0 + 1, d0, blocking: extra.blocking };
    const wrap = (f) => (cam, ee) => { const t = ee.t - ee.d0; if (t >= 0 && t < life) f(cam, t, ee); };
    if (draw) e.draw = wrap(draw);
    if (extra.opq) e.opq = wrap(extra.opq);
    if (extra.update) { const f = extra.update; e.update = (ee) => { const t = ee.t - ee.d0; if (t >= 0) return f(t, ee); }; }
    return FX.add3(e);
  };
  const anchor = (c, o) => {
    const a = o.at || 'hit';
    const p = a === 'ground' ? c.g : a === 'top' ? [c.g[0], c.h * 1.02, c.g[2]] : a === 'from' ? (c.from || c.p) : a === 'fromG' ? (c.fromG || c.g) : c.p;
    return o.y != null && a !== 'hit' ? [p[0], p[1] + o.y * c.h, p[2]] : o.dy ? [p[0], p[1] + o.dy * c.h, p[2]] : p;
  };
  const toCam = (cam, p, d) => (d ? V.add(p, V.scale(V.norm(V.sub(cam.eye, p)), d)) : p);
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const pick = (cols, R) => { const a = [].concat(cols); return a[Math.floor(R() * a.length) % a.length]; };
  const env = (t, life, a, b) => X.env(t, life, a, b);
  const quad = (tex) => (tex === 'puffBlock' ? X.M.quadN() : X.M.quad());

  // flame tongues around / over the target (fire family)
  BL.flames = (c, o) => {
    const n = o.n || 3, life = o.life || 30, step = o.step != null ? o.step : 3, R0 = (o.r != null ? o.r : 0.35) * c.w;
    const Rn = U.rng(7 + c.i * 31 + n), sz = (o.size || 0.9) * c.h, fl = [];
    for (let i = 0; i < n; i++) {
      fl.push({ a: (i / n) * PI * 2 + Rn() * 0.9 + (o.a0 || 0), rr: R0 * (o.ring ? 0.85 + Rn() * 0.3 : 0.25 + Rn() * 0.75), t0: i * step + Math.floor(Rn() * 2),
        y0: (o.y != null ? o.y : 0.02) * c.h + Rn() * (o.yr != null ? o.yr : 0.2) * c.h, s: sz * (0.7 + Rn() * 0.55), v: Math.floor(Rn() * 4), roll: (Rn() - 0.5) * 0.35 });
    }
    return eff(o, life + n * step + 2, (cam, t) => {
      for (const f of fl) {
        const k = t - f.t0; if (k < 0 || k > life) continue;
        const q = k / life, grow = X.ease.cubicOut(Math.min(1, k / 7)), a = env(k, life, 2, life * 0.45) * (o.alpha || 1);
        const ang = f.a + (o.swirl || 0) * q, rr = f.rr * (1 + q * (o.spread != null ? o.spread : 0.3));
        const s = f.s * (0.35 + 0.65 * grow) * (1 + q * 0.2);
        const p = [c.g[0] + cos(ang) * rr, f.y0 + s * 0.42 + q * (o.rise != null ? o.rise : 0.35) * c.h, c.g[2] + sin(ang) * rr];
        X.draw(X.M.quad(), X.bill(cam, p, s * 0.62, s, f.roll), { tex: X.ptex('flame' + ((f.v + (k >> 2)) & 3)), color: o.color || '#ffffff', alpha: a });
      }
    });
  };
  // soft glow billboard (o.grow = [from, to] size factors)
  BL.glow = (c, o) => {
    const life = o.life || 24;
    return eff(o, life, (cam, t) => {
      const k = t / life, s = (o.size || 1) * c.h * (o.grow ? lerp(o.grow[0], o.grow[1], X.ease.out(k)) : 1);
      X.glow(cam, toCam(cam, anchor(c, o), (o.front != null ? o.front : 0.3) * c.w), s, o.color || '#ffffff', env(t, life, o.fin || 2, o.fout || life * 0.6) * (o.alpha == null ? 1 : o.alpha), { aspect: o.aspect || 1 });
    });
  };
  // radial light rays
  BL.rays = (c, o) => {
    const life = o.life || 16;
    return eff(o, life, (cam, t) => {
      const s = (o.size || 1.4) * c.h * lerp(0.4, 1.2, X.ease.out(t / life));
      X.draw(X.M[o.mesh || 'rays'](), X.bill(cam, toCam(cam, anchor(c, o), 0.35 * c.w), s, s, (o.roll || 0) + t * (o.spin || 0.01)), { color: o.color || '#ffffff', alpha: env(t, life, 1, life * 0.7) * (o.alpha == null ? 1 : o.alpha) });
    });
  };
  // particle emitter. mode: burst | rise | fall | in | ring | surface | orbit
  BL.sparks = (c, o) => {
    const mesh = o.mesh ? X.M[o.mesh]() : null;
    const ps = new X.Particles({ mesh, ptex: o.ptex, nearest: o.ptex === 'puffBlock', world: o.world, lit: o.lit, gravity: (o.gravity || 0) * c.h, drag: o.drag == null ? 0.95 : o.drag, fade: o.fade || [2, 10], blend: o.blend });
    const n = o.n || 12, Rn = U.rng(3 + c.i * 17 + n * 5 + (o.seed || 0)), sz = (o.size || 0.08) * c.h, sp = (o.speed || 0.05) * c.h, pl = o.plife || 26, dur = o.dur || 1;
    const init = () => {
      const m = o.mode || 'burst', base = anchor(c, o);
      let p, v, fn = null;
      if (m === 'rise') { const a = Rn() * PI * 2, r = (o.r || 0.4) * c.w * Math.sqrt(Rn()); p = [c.g[0] + cos(a) * r, (o.y0 != null ? o.y0 : 0.05) * c.h + Rn() * 0.3 * c.h, c.g[2] + sin(a) * r]; v = [(Rn() - 0.5) * sp * 0.25, sp * (0.5 + Rn() * 0.6), (Rn() - 0.5) * sp * 0.25]; }
      else if (m === 'fall') { const a = Rn() * PI * 2, r = (o.r || 0.5) * c.w * Math.sqrt(Rn()); p = [c.g[0] + cos(a) * r, c.h * (o.top || 1.7) + Rn() * 0.4 * c.h, c.g[2] + sin(a) * r]; v = [(Rn() - 0.5) * sp * 0.2, -sp * (0.6 + Rn() * 0.5), (Rn() - 0.5) * sp * 0.2]; }
      else if (m === 'in') { const d = V.norm([Rn() - 0.5, Rn() - 0.5, Rn() - 0.5]), rr = (o.r || 1.2) * c.h; p = V.add(base, V.scale(d, rr)); v = V.scale(d, -rr / pl * (0.85 + Rn() * 0.2)); }
      else if (m === 'ring') { const a = Rn() * PI * 2; p = [base[0] + cos(a) * 0.1, base[1], base[2] + sin(a) * 0.1]; v = [cos(a) * sp * (0.6 + Rn() * 0.6), sp * 0.12 * Rn(), sin(a) * sp * (0.6 + Rn() * 0.6)]; }
      else if (m === 'surface') { const d = V.norm([Rn() - 0.5, (Rn() - 0.2) * 1.2, Rn() - 0.5]), ctr = [c.g[0], 0.55 * c.h, c.g[2]]; p = V.add(ctr, [d[0] * (o.r || 0.5) * c.h, d[1] * (o.r || 0.5) * c.h * 1.2, d[2] * (o.r || 0.5) * c.h]); v = V.scale(d, sp * 0.2); }
      else if (m === 'orbit') { const a0 = Rn() * PI * 2, r = (o.r || 0.6) * c.w * (0.7 + Rn() * 0.5), y0 = (o.y0 != null ? o.y0 : 0.1) * c.h + Rn() * 0.3 * c.h, w = (o.spinRate || 0.18) * (0.8 + Rn() * 0.4), up = sp * (0.3 + Rn() * 0.5); p = [c.g[0] + cos(a0) * r, y0, c.g[2] + sin(a0) * r]; v = [0, 0, 0]; fn = (q, age) => { q.p = [c.g[0] + cos(a0 + age * w) * r * (1 + age * 0.01), y0 + age * up, c.g[2] + sin(a0 + age * w) * r * (1 + age * 0.01)]; }; }
      else { const d = V.norm([Rn() - 0.5, Rn() - 0.5 + (o.up || 0), Rn() - 0.5]); p = base.slice(); v = V.scale(d, sp * (0.4 + Rn() * 0.8)); }
      return { p, v, fn, life: Math.round(pl * (0.7 + Rn() * 0.5)), size: sz * (0.6 + Rn() * 0.8), sizeTo: sz * (o.growTo || (o.shrink ? 0.25 : 1)), color: pick(o.color || '#ffffff', Rn), roll: Rn() * PI * 2, vr: (Rn() - 0.5) * (o.spin || 0.2), alpha: o.alpha == null ? 1 : o.alpha, rot: o.world ? [Rn() * 6, Rn() * 6, Rn() * 6] : null };
    };
    let emitted = 0;
    return eff(o, dur + Math.round(pl * 1.25) + 4, (cam) => ps.draw(cam), { update() { if (emitted < dur) { ps.emit(Math.ceil(n / dur), init); emitted++; } ps.update(); for (const q of ps.list) if (q.rot) { q.rot[0] += q.vr; q.rot[1] += q.vr * 0.7; } } });
  };
  BL.shards = (c, o) => BL.sparks(c, Object.assign({ mesh: 'shard1', world: true, blend: 'alpha', color: ['#e8f4ff', '#b8d4ff', '#ffffff'], gravity: 0.004, speed: 0.07, size: 0.14, up: 0.45, plife: 28, fade: [1, 12], drag: 0.97, spin: 0.35 }, o));
  BL.dust = (c, o) => BL.sparks(c, Object.assign({ mode: 'ring', at: 'ground', ptex: 'puff', blend: 'alpha', color: ['#8a7862', '#a08a70', '#706050'], size: 0.4, growTo: 2.2, speed: 0.035, plife: 34, drag: 0.93, alpha: 0.55, fade: [3, 18], spin: 0.03 }, o));
  // lightning from the sky (+ forks); o.n bolts, o.spread around the target
  BL.bolts = (c, o) => {
    const n = o.n || 1, life = o.life || 20, st = o.step || 3, Rn = U.rng(11 + c.i * 7 + n), bs = [];
    for (let i = 0; i < n; i++) {
      const a = Rn() * PI * 2, r = i ? (o.spread || 1) * c.w * (0.35 + Rn() * 0.65) : 0;
      bs.push({ top: [c.g[0] + cos(a) * r * 1.5 + 0.9, (o.top || 8) + Rn() * 2, c.g[2] + sin(a) * r * 1.5 - 0.8], end: i ? [c.g[0] + cos(a) * r, 0, c.g[2] + sin(a) * r] : [c.p[0], c.p[1] * 0.4, c.p[2]], t0: i * st, v: Math.floor(Rn() * 6) });
    }
    return eff(o, life + n * st, (cam, t) => {
      for (const b of bs) {
        const k = t - b.t0; if (k < 0 || k >= life) continue;
        if (!(k < 4 || ((k + b.v) & 3) < 2)) continue;                      // FF7 bolts strobe
        const a = k < 4 ? 1 : 1 - k / life;
        X.bolt(cam, b.top, b.end, b.v + (k >> 1), o.color || '#d8e4ff', a, 0.62 * (o.width || 1));
        X.glow(cam, b.end, 0.9 * (o.width || 1), o.color || '#c8d8ff', a * 0.8);
      }
    });
  };
  // strobing flash disc on the ground (Bolt)
  BL.flashGround = (c, o) => {
    const life = o.life || 16;
    return eff(o, life, (cam, t) => {
      const a = (1 - t / life) * (t < 3 || (t & 3) < 2 ? 1 : 0.4) * (o.alpha || 1), r = (o.r || 1) * c.w * (1 + t / life * 0.35);
      X.draw(X.M.disc(), X.trs([c.g[0], 0.04, c.g[2]], [PI / 2, 0, 0], [r, r, 1]), { color: o.color || '#ffe860', alpha: a });
    });
  };
  // ice-crystal bloom: translucent rhombus petals around the target (Ice: about twice its size)
  BL.bloom = (c, o) => {
    const life = o.life || 34, rad = (o.size || 1.9) * c.h * 0.5;
    return eff(o, life, (cam, t) => {
      const grow = X.ease.back(Math.min(1, t / 7)), out = t > life - 10 ? (t - (life - 10)) / 10 : 0;
      const a = Math.min(1, t / 2) * (1 - out), p = toCam(cam, c.p, 0.5 * c.w), roll = (o.roll != null ? o.roll : 0.39) + t * 0.004;
      const layers = o.layers || 1;
      for (let l = 0; l < layers; l++) {
        const s = rad * grow * (1 + out * 0.4) * (l ? 0.62 : 1), m = X.bill(cam, p, s, s, roll + l * PI / 8);
        X.draw(X.M.petals(), m, { color: o.color || '#d6d2fa', alpha: a * 0.62, blend: 'alpha' });
        X.draw(X.M.petals(), m, { color: o.glow || '#4658c8', alpha: a * 0.22 });
        X.draw(X.M.petalEdges(), m, { color: '#ffffff', alpha: a * 0.9 });
      }
      X.glow(cam, p, rad * 0.3 * grow, '#e8f4ff', a * 0.6);
    });
  };
  // 3D crystal clusters growing out of the ground (Ice2/3, Freeze; o.stone = Break)
  BL.crystals = (c, o) => {
    const life = o.life || 40, n = o.n || 1, Rn = U.rng(5 + c.i * 13 + n), list = [];
    for (let i = 0; i < n; i++) list.push({ a: n > 1 ? (i / n) * PI * 2 + Rn() * 0.6 : 0, r: n > 1 ? (o.r || 0.6) * c.w * (0.6 + Rn() * 0.5) : 0, s: (o.size || 1) * c.h * (n > 1 ? 0.5 + Rn() * 0.35 : 1), rot: Rn() * PI * 2, t0: Math.floor(i * (o.step || 1)) });
    const mesh = () => X.M[o.big ? 'crystalBig' : 'crystal']();
    return eff(o, life, (cam, t) => {
      const out = t > life - 8 ? (t - life + 8) / 8 : 0;
      for (const q of list) {
        const k = t - q.t0; if (k < 0) continue;
        const g = X.ease.back(Math.min(1, k / 6)), s = q.s * g;
        const m = X.trs([c.g[0] + cos(q.a) * q.r, 0, c.g[2] + sin(q.a) * q.r], [0, q.rot, 0], [s * 0.8, s, s * 0.8]);
        X.draw(mesh(), m, { color: o.color || '#cadaff', alpha: (o.stone ? 1 : 0.85) * (1 - out), blend: 'alpha' });
        if (!o.stone) X.draw(mesh(), m, { color: o.glow || '#5070c0', alpha: 0.5 * (1 - out) });
      }
    });
  };
  // Quake: the ground under the target cracks, slabs heave up and tilt, rocks fly, dust rolls out
  BL.ground = (c, o) => {
    const life = o.life || 48, Rn = U.rng(19 + c.i * 7), rad = (o.r || 1.2) * Math.max(1, c.w * 0.9), ns = o.slabs || 8, slabs = [], rocks = [];
    for (let i = 0; i < ns; i++) { const a = (i + Rn() * 0.6) / ns * PI * 2, inner = i % 3 === 0; slabs.push({ a, r: rad * (inner ? 0.42 + Rn() * 0.2 : 0.68 + Rn() * 0.35), s: rad * (0.24 + Rn() * 0.16), up: (o.lift || 0.4) * (0.5 + Rn() * 0.7), t0: Math.floor(Rn() * 6), tilt: 0.25 + Rn() * 0.5, spin: Rn() * PI * 2 }); }
    for (let i = 0; i < (o.rocks || 0); i++) rocks.push({ a: Rn() * PI * 2, r: rad * (0.3 + Rn() * 0.7), vy: 0.11 + Rn() * 0.1, vr: 0.02 + Rn() * 0.03, s: 0.1 + Rn() * 0.14, t0: 5 + Math.floor(Rn() * 10), rot: [Rn() * 6, Rn() * 6, Rn() * 6] });
    BL.dust(c, { n: Math.round(ns * 1.2), delay: (o.delay || 0) + 4, r: rad, speed: 0.035 * rad, dur: 8 });
    const slabY = (s, t) => { const k = clamp((t - s.t0) / 8, 0, 1), sink = t > life - 14 ? X.ease.in((t - (life - 14)) / 14) : 0; return { y: -0.45 + (s.up + 0.45) * X.ease.back(k) * (1 - sink), k: k * (1 - sink) }; };
    return eff(o, life, (cam, t) => {
      const sink = t > life - 14 ? (t - (life - 14)) / 14 : 0, cr = rad * 1.4 * X.ease.out(Math.min(1, t / 6));
      const m = X.trs([c.g[0], 0.02, c.g[2]], [-PI / 2, c.i * 1.3, 0], [cr * 2, cr * 2, 1]);
      X.draw(X.M.quad(), m, { tex: X.ptex('crack'), color: '#ffffff', alpha: 0.95 * (1 - sink), blend: 'alpha' });
      if (o.lava) X.draw(X.M.quad(), m, { tex: X.ptex('crackGlow'), color: '#ff7a28', alpha: (0.65 + 0.35 * sin(t * 0.45)) * (1 - sink) });
    }, {
      opq: (cam, t) => {
        for (const s of slabs) {
          const q = slabY(s, t); if (q.y < -0.44) continue;
          X.draw(X.M.slab(), X.trs([c.g[0] + cos(s.a) * s.r, q.y, c.g[2] + sin(s.a) * s.r], [sin(s.a) * s.tilt * q.k, s.spin, -cos(s.a) * s.tilt * q.k], s.s), { lit: true, blend: null, color: o.color || '#ffffff' });
        }
        for (const r of rocks) {
          const k = t - r.t0; if (k < 0) continue;
          const y = r.vy * k - 0.006 * k * k; if (y < -0.1) continue;
          X.draw(X.M.rock(), X.trs([c.g[0] + cos(r.a) * (r.r + k * 0.01), y, c.g[2] + sin(r.a) * (r.r + k * 0.01)], [r.rot[0] + k * r.vr * 3, r.rot[1] + k * r.vr * 2, r.rot[2]], r.s), { lit: true, blend: null, color: '#b09880' });
        }
      },
    });
  };
  // puffs of cloud around the target (Bio, Sleep mist, smoke); o.block = FF7's chunky pixel clouds
  BL.cloud = (c, o) => {
    const life = o.life || 40, n = o.n || 8, Rn = U.rng(13 + c.i * 3 + n), puffs = [], tex = o.block ? 'puffBlock' : 'puff';
    for (let i = 0; i < n; i++) puffs.push({ a: Rn() * PI * 2, r: (o.r || 0.45) * c.w * (0.25 + Rn() * 0.75), y: (o.y != null ? o.y : 0.45) * c.h + (Rn() - 0.5) * (o.yr != null ? o.yr : 0.6) * c.h, s: (o.size || 0.7) * c.h * (0.6 + Rn() * 0.6), t0: Math.floor(Rn() * (o.spreadT || 10)), col: pick(o.color || '#ffffff', Rn), w: (Rn() - 0.5) * 0.08, roll: Rn() * PI * 2 });
    return eff(o, life, (cam, t) => {
      for (const q of puffs) {
        const k = t - q.t0; if (k < 0) continue;
        const a = env(k, life - q.t0, 5, 14) * (o.alpha == null ? 0.85 : o.alpha), ang = q.a + q.w * k;
        const p = [c.g[0] + cos(ang) * q.r * (1 + k * 0.012), q.y + k * (o.rise || 0.004) * c.h, c.g[2] + sin(ang) * q.r * (1 + k * 0.012)];
        X.draw(quad(tex), X.bill(cam, p, q.s * (0.6 + 0.4 * Math.min(1, k / 8)), q.s * (0.6 + 0.4 * Math.min(1, k / 8)), q.roll + k * 0.01), { tex: X.ptex(tex), color: q.col, alpha: a, blend: o.add ? 'add' : 'alpha' });
      }
    });
  };
  // sphere / dome shell around the target (Barrier, Demi, Flare, Ultima). o.implode / o.grow = scale ramps
  BL.shell = (c, o) => {
    const life = o.life || 40, H = o.abs ? 1 : c.h;
    return eff(o, life, (cam, t) => {
      const k = t / life, g = o.implode ? lerp(o.implode[0], o.implode[1], X.ease.in(k)) : o.grow ? lerp(o.grow[0], o.grow[1], X.ease.cubicOut(Math.min(1, t / (o.growT || 10)))) : 1;
      const rx = (o.rx || 0.55) * H * g, ry = (o.ry || o.rx || 0.65) * H * g, ctr = [c.g[0], (o.cy != null ? o.cy : 0.5) * c.h, c.g[2]];
      const a = env(t, life, o.fin || 4, o.fout || 12) * (o.alpha == null ? 1 : o.alpha), mesh = o.dome ? X.M.dome() : X.M.sphere();
      const m = X.trs(ctr, [0, t * (o.spin || 0.02), 0], [rx, ry, rx]);
      if (o.fill) X.draw(mesh, m, { color: o.fill, alpha: a * (o.fillA || 0.35), blend: 'alpha' });
      X.draw(mesh, m, { tex: o.tex ? X.ptex(o.tex) : null, color: o.color || '#80c0ff', alpha: a });
      if (o.tex2) X.draw(mesh, X.trs(ctr, [0, -t * (o.spin || 0.02) * 1.6 + 1, 0], [rx * 0.97, ry * 0.97, rx * 0.97]), { tex: X.ptex(o.tex2), color: o.color2 || o.color || '#ffffff', alpha: a * 0.6 });
    });
  };
  // vertical light column (Cure, Life, Satellite Beam, the limit-hit pillars)
  BL.column = (c, o) => {
    const life = o.life || 30;
    return eff(o, life, (cam, t) => {
      const a = env(t, life, o.fin || 4, o.fout || 12) * (o.alpha == null ? 0.7 : o.alpha), r = (o.r || 0.4) * c.h * (o.grow === false ? 1 : lerp(0.25, 1, X.ease.out(Math.min(1, t / 8))));
      const H = (o.h || 2.5) * c.h, base = [c.g[0], (o.y0 || 0) * c.h, c.g[2]];
      X.beam(base, V.add(base, [0, H, 0]), r, o.color || '#ffffff', a, X.M.cyl());
      X.beam(base, V.add(base, [0, H * 0.8, 0]), r * 0.45, o.core || '#ffffff', a * 0.8, X.M.cyl());
    });
  };
  // horizontal rings rising / falling / contracting around the target
  BL.rings = (c, o) => {
    const life = o.life || 26, n = o.n || 1, st = o.step || 5, down = o.dir < 0;
    return eff(o, life + n * st, (cam, t) => {
      for (let i = 0; i < n; i++) {
        const tk = t - i * st; if (tk < 0 || tk > life) continue;
        const k = tk / life, y = lerp(o.y0 != null ? o.y0 : down ? 1.2 : 0.05, o.y1 != null ? o.y1 : down ? 0.05 : 1.2, X.ease.out(k)) * c.h;
        const r = (o.r || 0.6) * Math.max(c.w, 0.8) * lerp(o.r0 || 1, o.r1 || 1, X.ease.out(k));
        X.draw(X.M.ring(), X.trs([c.g[0], y, c.g[2]], [0, 0, 0], [r, 1, r]), { color: o.color || '#ffffff', alpha: env(tk, life, 3, 10) * (o.alpha || 1) });
      }
    });
  };
  // glowing blade strokes in the camera plane ([x0,y0,x1,y1] in target heights around the hit point).
  // Strokes draw on one after another (o.step), then all fade together (o.hold).
  const RAND_STROKE = (Rn) => { const a = -0.9 + Rn() * 0.5 + (Rn() < 0.5 ? 0 : PI - 0.3), L = 0.75; return [[-cos(a) * L, -sin(a) * L + 0.05, cos(a) * L, sin(a) * L + 0.05]]; };
  BL.slash = (c, o) => {
    const strokes = o.strokes === 'rand' || !o.strokes ? RAND_STROKE(U.rng(29 + c.i + (FF7.frame || 0))) : o.strokes;
    const st = o.step || 3, dr = o.draw || 3, hold = o.hold || 0, fade = o.fadeT || 10, life = strokes.length * st + dr + hold + fade;
    const W0 = (o.width || 0.1) * c.h;
    return eff(o, life, (cam, t) => {
      const B = cam._basis, ctr = toCam(cam, anchor(c, o), 0.55 * c.w);
      const fa = t > life - fade ? (life - t) / fade : 1;
      strokes.forEach((s, i) => {
        const k = t - i * st; if (k < 0) return;
        const kk = Math.min(1, (k + 1) / dr);
        const A = V.add(ctr, V.add(V.scale(B.r, s[0] * c.h), V.scale(B.u, s[1] * c.h))), E0 = V.add(ctr, V.add(V.scale(B.r, s[2] * c.h), V.scale(B.u, s[3] * c.h)));
        const E = lerp3(A, E0, kk), ax = V.sub(E, A);
        if (V.len(ax) < 1e-4) return;
        X.draw(X.M.blade(), X.orient(A, ax, W0 * 3.2, 1, W0 * 3.2, cam), { color: o.glow || '#a0c0ff', alpha: fa * 0.55 });
        X.draw(X.M.blade(), X.orient(A, ax, W0, 1, W0, cam), { color: o.color || '#ffffff', alpha: fa });
      });
    });
  };
  // expanding shock ring on the ground
  BL.shock = (c, o) => {
    const life = o.life || 20;
    return eff(o, life, (cam, t) => {
      const k = t / life, r = (o.r || 1.2) * Math.max(c.w, 1) * lerp(0.15, 1, X.ease.cubicOut(k));
      X.draw(X.M.ring(), X.trs([c.g[0], 0.06, c.g[2]], [0, 0, 0], [r, 1, r]), { color: o.color || '#ffe0a0', alpha: (1 - k) * (o.alpha || 1) });
      X.draw(X.M.annulus(), X.trs([c.g[0], 0.05, c.g[2]], [0, 0, 0], [r * 0.9, 1, r * 0.9]), { color: o.color || '#ffe0a0', alpha: (1 - k) * 0.35 * (o.alpha || 1) });
    });
  };
  // generic impact: glow + rays + sparks
  BL.burst = (c, o) => {
    const s = o.size || 1;
    BL.glow(c, { size: s, color: o.color, life: o.life || 18, delay: o.delay, at: o.at, dy: o.dy });
    BL.rays(c, { size: s * 1.3, color: o.rays || o.color, life: 14, delay: o.delay, at: o.at, dy: o.dy, roll: (c.i || 0) * 0.7 });
    return BL.sparks(c, { n: o.n || 10, color: o.sparks || o.color, speed: 0.06 * s, size: 0.045 * s, delay: o.delay, at: o.at, dy: o.dy, plife: 18 });
  };
  // twisting funnel (Tornado, Finishing Touch)
  BL.funnel = (c, o) => {
    const life = o.life || 44;
    return eff(o, life, (cam, t) => {
      const a = env(t, life, 6, 12) * (o.alpha || 0.8), g = X.ease.out(Math.min(1, t / 10)), r = (o.r || 0.9) * Math.max(c.w, 0.9) * g, H = (o.h || 3) * c.h;
      X.draw(X.M.funnel(), X.trs([c.g[0], 0, c.g[2]], [0, t * 0.25, 0], [r, H, r]), { color: o.color || '#c0ffd0', alpha: a });
      X.draw(X.M.funnel(), X.trs([c.g[0], 0, c.g[2]], [0, -t * 0.18 + 1, 0], [r * 0.75, H * 0.9, r * 0.75]), { color: o.color2 || '#ffffff', alpha: a * 0.5 });
    });
  };
  // caster -> target beam that shoots out over o.travel frames
  BL.beam = (c, o) => {
    if (!c.from) return null;
    const life = o.life || 18;
    return eff(o, life, (cam, t) => {
      const k = Math.min(1, (t + 1) / (o.travel || 4)), B = lerp3(c.from, c.p, k), a = env(t, life, 1, 8) * (o.alpha || 1), r = (o.r || 0.06) * c.h;
      X.beam(c.from, B, r, o.color || '#80d0ff', a, X.M.cylSolid());
      X.beam(c.from, B, r * 0.35, '#ffffff', a, X.M.cylSolid());
      X.glow(cam, B, r * 7, o.color || '#80d0ff', a);
    });
  };
  // projectile from the caster to the target (Big Shot, grenades); o.arc lifts the path
  BL.orb = (c, o) => {
    if (!c.from) return null;
    const tr = o.travel || 10, s = (o.size || 0.35) * c.h;
    return eff(o, tr + 1, (cam, t) => {
      const at = (k) => [lerp(c.from[0], c.p[0], k), lerp(c.from[1], c.p[1], k) + sin(k * PI) * (o.arc || 0) * c.h, lerp(c.from[2], c.p[2], k)];
      const k = t / tr;
      for (let j = 5; j >= 1; j--) X.glow(cam, at(Math.max(0, k - j * 0.035)), s * (1 - j * 0.13), o.color || '#ffe080', 0.45);
      X.glow(cam, at(k), s, o.color || '#ffe080', 1);
      X.glow(cam, at(k), s * 0.45, '#ffffff', 1);
    });
  };
  // particles streaming along an arc caster <-> target (Drain, Osmose, Flamethrower, Blood Fang)
  BL.stream = (c, o) => {
    if (!c.from) return null;
    const n = o.n || 16, life = o.life || 32, tr = o.travel || 16, Rn = U.rng(23 + c.i), ps = [];
    for (let i = 0; i < n; i++) ps.push({ t0: Math.floor(i * Math.max(1, life - tr) / n), off: [(Rn() - 0.5) * 0.3, (Rn() - 0.5) * 0.3, (Rn() - 0.5) * 0.3], arc: (o.arc != null ? o.arc : 0.5) * (0.5 + Rn()), s: 0.6 + Rn() * 0.6, col: pick(o.color || '#ff4060', Rn), v: Math.floor(Rn() * 4) });
    const A = o.reverse ? c.p : c.from, B = o.reverse ? c.from : c.p, sz = (o.size || 0.14) * c.h;
    return eff(o, life + 2, (cam, t) => {
      for (const q of ps) {
        const k = (t - q.t0) / tr; if (k < 0 || k > 1) continue;
        const p = V.add(lerp3(A, B, k), [q.off[0], q.off[1] + sin(k * PI) * q.arc * c.h * 0.5, q.off[2]]), a = sin(k * PI) * 0.6 + 0.4;
        if (o.fire) X.draw(X.M.quad(), X.bill(cam, p, sz * q.s * 0.7 * (0.6 + k), sz * q.s * (0.6 + k)), { tex: X.ptex('flame' + ((q.v + (t >> 2)) & 3)), color: '#ffffff', alpha: a });
        else X.glow(cam, p, sz * q.s, q.col, a);
      }
    });
  };
  // crescent / blade wave travelling along the ground caster -> target (Blade Beam)
  BL.wave = (c, o) => {
    if (!c.fromG) return null;
    const tr = o.travel || 12;
    return eff(o, tr + 2, (cam, t) => {
      const k = Math.min(1, t / tr), p = [lerp(c.fromG[0], c.g[0], k), 0, lerp(c.fromG[2], c.g[2], k)], H = (o.h || 1.3) * c.h;
      X.draw(X.M.blade(), X.orient(p, [0, H, 0], 0.5 * c.h, 1, 0.5 * c.h, cam), { color: o.glow || '#60ff90', alpha: 0.6 });
      X.draw(X.M.blade(), X.orient(p, [0, H, 0], 0.16 * c.h, 1, 0.16 * c.h, cam), { color: o.color || '#e0ffe8', alpha: 1 });
      X.glow(cam, [p[0], H * 0.5, p[2]], H * 0.7, o.glow || '#60ff90', 0.6);
    });
  };
  // falling rocks / meteors / missiles with a fire trail; each lands with burst + shock + dust
  BL.rocks = (c, o) => {
    const n = o.n || 1, fall = o.fall || 16, st = o.step || 4, Rn = U.rng(31 + c.i * 5 + n), rs = [];
    // fall from the sky over the camera's left shoulder, so the whole drop stays in view
    const cb = FX.cam && FX.cam._basis, toEye = FX.cam ? V.norm(V.sub(FX.cam.eye, c.g)) : [0, 0, 1];
    for (let i = 0; i < n; i++) {
      const tgt = i ? [c.g[0] + (Rn() - 0.5) * c.w * 1.6, 0, c.g[2] + (Rn() - 0.5) * c.w] : [c.g[0], c.p[1] * 0.3, c.g[2]];
      const off = cb && o.dx == null ? V.add(V.scale(cb.r, -2.2 + (Rn() - 0.5) * 1.2), V.scale([toEye[0], 0, toEye[2]], 1.2)) : [(o.dx != null ? o.dx : -2.5) + (Rn() - 0.5) * 1.5, 0, (o.dz != null ? o.dz : -3.5) + (Rn() - 0.5) * 1.5];
      rs.push({ src: V.add(tgt, [off[0], o.dy || 9, off[2]]), tgt, t0: i * st, s: (o.size || 0.35) * c.h * (0.7 + Rn() * 0.5), rot: [Rn() * 6, Rn() * 6, Rn() * 6], hit: false });
    }
    const posAt = (r, k) => lerp3(r.src, r.tgt, X.ease.in(k));
    return eff(o, fall + n * st + 2, (cam, t) => {
      for (const r of rs) {
        const k = (t - r.t0) / fall; if (k < 0 || k > 1) continue;
        for (let j = 6; j >= 1; j--) { const q = posAt(r, Math.max(0, k - j * 0.045)), s = r.s * (2.2 - j * 0.22); X.draw(X.M.quad(), X.bill(cam, q, s * 0.62, s), { tex: X.ptex('flame' + ((j + (t >> 2)) & 3)), color: o.trail || '#ffffff', alpha: (1 - j / 7) * 0.9 }); }
        X.glow(cam, posAt(r, k), r.s * 3.2, o.glow || '#ff9040', 0.9);
      }
    }, {
      opq: (cam, t) => { if (o.noRock) return; for (const r of rs) { const k = (t - r.t0) / fall; if (k < 0 || k > 1) continue; X.draw(X.M.rock(), X.trs(posAt(r, k), [r.rot[0] + t * 0.2, r.rot[1] + t * 0.13, r.rot[2]], r.s), { lit: true, blend: null, color: o.color || '#7a6048' }); } },
      update: (t) => {
        for (const r of rs) if (!r.hit && t - r.t0 >= fall) {
          r.hit = true;
          const cc = Object.assign({}, c, { p: [r.tgt[0], Math.max(0.3, r.tgt[1]), r.tgt[2]], g: [r.tgt[0], 0, r.tgt[2]] });
          BL.burst(cc, { size: (o.boom || 1.4), color: o.boomColor || '#ffb050', n: 16 });
          BL.flames(cc, { n: 6, r: 0.5, size: 0.9 * (o.boom || 1.4), step: 1, life: 22, ring: true, spread: 0.7, color: o.boomFlame || '#ffffff' });
          BL.shock(cc, { r: 1.6 * (o.boom || 1.4) / 1.4, color: '#ffc070' });
          BL.dust(cc, { n: 8, r: 1 });
        }
      },
    });
  };
  // stars / glyphs circling above the target (Confuse, Seal Evil)
  BL.orbit = (c, o) => {
    const life = o.life || 40, n = o.n || 4;
    return eff(o, life, (cam, t) => {
      const a = env(t, life, 4, 10);
      for (let i = 0; i < n; i++) {
        const ang = t * (o.speed || 0.15) + i / n * PI * 2, r = (o.r || 0.45) * Math.max(c.w, 0.8), s = (o.size || 0.12) * c.h;
        X.draw(X.M[o.mesh || 'star5'](), X.bill(cam, [c.g[0] + cos(ang) * r, (o.y || 1) * c.h + sin(ang * 2) * 0.03 * c.h, c.g[2] + sin(ang) * r * 0.7], s, s, t * 0.1 + i), { color: o.color || '#ffe060', alpha: a, blend: o.blend });
      }
    });
  };
  // clock face with spinning hands (Stop freezes them, Haste spins them)
  BL.clock = (c, o) => {
    const life = o.life || 32;
    return eff(o, life, (cam, t) => {
      const a = env(t, life, 4, 10) * (o.alpha || 0.9), s = (o.size || 0.6) * c.h * X.ease.back(Math.min(1, t / 8)), p = toCam(cam, c.p, 0.7 * c.w), k = t / life;
      const ang = o.stop ? (o.speed || 0.4) * life * 0.35 * (1 - Math.pow(1 - Math.min(1, k * 1.7), 2)) : (o.speed || 0.4) * t;
      X.draw(X.M.clockFace(), X.bill(cam, p, s, s, 0), { color: o.color || '#c0d0ff', alpha: a * 0.85 });
      X.draw(X.M.clockHand(), X.bill(cam, p, s * 0.78, s * 0.78, -ang), { color: '#ffffff', alpha: a });
      X.draw(X.M.clockHand(), X.bill(cam, p, s * 0.5, s * 0.5, -ang / 12), { color: '#ffffff', alpha: a });
    });
  };
  // spiral wind ribbons rising around the target (White Wind, Healing Wind)
  BL.spiral = (c, o) => {
    const life = o.life || 36;
    return eff(o, life, (cam, t) => {
      const a = env(t, life, 6, 12) * (o.alpha || 0.8);
      for (let j = 0; j < 3; j++) {
        const f = (t * 0.02 + j / 3) % 1, y = f * 1.3 * c.h, r = (o.r || 0.6) * Math.max(c.w, 0.9) * (1.15 - f * 0.45);
        X.draw(X.M.spiral(), X.trs([c.g[0], y + 0.05, c.g[2]], [0, t * 0.12 + j * 2, 0], [r, 1, r]), { color: o.color || '#d0ffe0', alpha: a * (1 - f) });
      }
    });
  };
  // triangle of lightning over the target (Trine)
  BL.triangle = (c, o) => {
    const life = o.life || 26;
    const pts = [0, 1, 2].map(i => { const a = i / 3 * PI * 2 + PI / 2; return [c.p[0] + cos(a) * 0.75 * c.w, c.p[1] + 0.45 * c.h + sin(a) * 0.55 * c.h, c.p[2] + 0.3]; });
    return eff(o, life, (cam, t) => {
      if (!(t < 4 || (t & 3) < 3)) return;
      const a = 1 - t / life;
      for (let i = 0; i < 3; i++) { X.bolt(cam, pts[i], pts[(i + 1) % 3], i + (t >> 1), o.color || '#ffe860', a, 0.55); X.bolt(cam, pts[i], c.p, i + 3 + (t >> 1), o.color || '#ffe860', a * 0.8, 0.45); }
    });
  };
  // rising "Z"s (Sleep spell; the status keeps its own Zzz)
  BL.zs = (c, o) => {
    const life = o.life || 40;
    return eff(o, life, (cam, t) => { drawZs(cam, [c.g[0], c.h * 1.02, c.g[2]], t, c.h, env(t, life, 4, 10)); });
  };

  // ================================================================ presets
  // FX.PRESETS[name] = { sfx, flash, shake, hit (frames to the damage moment), group (one composition
  // over all targets), scale, fx: [[block, opts], ...] }
  const P = FX.PRESETS = {};
  const def = (name, props, fx) => { P[name] = Object.assign({ fx }, props); };
  // ---- fire
  def('fire1', { color: '#ff8030', sfx: 'fire', hit: 14 }, [
    ['flames', { n: 6, r: 0.45, size: 1.15, step: 2, life: 30, rise: 0.5, spread: 0.45 }],
    ['glow', { size: 1.9, color: '#ff6a18', life: 32, alpha: 0.8, delay: 2 }],
    ['sparks', { n: 10, color: ['#ffc060', '#ff8030'], size: 0.06, speed: 0.045, up: 0.5, delay: 6, plife: 24 }],
  ]);
  def('fire2', { color: '#ff7020', sfx: 'fire2', hit: 16 }, [
    ['flames', { n: 11, r: 0.6, size: 1.4, step: 2, life: 32, rise: 0.6, swirl: 1.5, spread: 0.5 }],
    ['glow', { size: 2.5, color: '#ff5a10', life: 38, alpha: 0.8, grow: [0.5, 1.1] }],
    ['shock', { r: 1.1, color: '#ffa040', life: 18, delay: 6 }],
    ['sparks', { mode: 'rise', n: 16, color: ['#ffd070', '#ff8030'], size: 0.07, speed: 0.05, r: 0.6, plife: 30, dur: 12 }],
  ]);
  def('fire3', { color: '#ff5010', sfx: 'fire2', hit: 18, flash: '#ffb060', shake: 6 }, [
    ['flames', { n: 18, r: 0.8, size: 1.9, step: 1, life: 40, rise: 1.0, swirl: 0.9, spread: 0.6 }],
    ['column', { r: 0.7, h: 3.2, color: '#ff8a30', life: 30, delay: 5, alpha: 0.8 }],
    ['glow', { size: 3.4, color: '#ff4a08', life: 46, grow: [0.3, 1.2], alpha: 0.9 }],
    ['rays', { size: 3.0, color: '#ffd080', life: 18, delay: 8 }],
    ['shock', { r: 2.2, color: '#ffb050', life: 22, delay: 8 }],
    ['sparks', { n: 30, color: ['#ffe080', '#ff8030', '#ff5010'], size: 0.08, speed: 0.08, up: 0.6, delay: 8, plife: 30 }],
  ]);
  // ---- ice
  def('ice1', { color: '#a0e0ff', sfx: 'ice', hit: 12 }, [
    ['bloom', { size: 1.9, life: 34 }],
    ['glow', { size: 1.3, color: '#90b8ff', life: 30, alpha: 0.5 }],
    ['sparks', { n: 12, mesh: 'sparkle', color: ['#ffffff', '#c0e0ff'], size: 0.14, speed: 0.05, delay: 24, plife: 20 }],
  ]);
  def('ice2', { color: '#a0e0ff', sfx: 'ice', hit: 14 }, [
    ['crystals', { n: 6, size: 1.05, r: 0.55, life: 40 }],
    ['bloom', { size: 2.3, life: 38, delay: 4, layers: 2 }],
    ['shards', { n: 16, delay: 34 }],
    ['glow', { size: 1.8, color: '#90b8ff', life: 36, alpha: 0.5 }],
  ]);
  def('ice3', { color: '#c0f0ff', sfx: 'ice', hit: 18, flash: '#e0f0ff' }, [
    ['crystals', { n: 1, big: true, size: 1.7, life: 48 }],
    ['crystals', { n: 8, size: 0.9, r: 1.1, life: 46, delay: 3 }],
    ['bloom', { size: 2.7, life: 44, delay: 6, layers: 2 }],
    ['column', { r: 0.5, h: 3.5, color: '#90b8f0', life: 30, alpha: 0.35 }],
    ['shards', { n: 30, delay: 42, size: 0.2, speed: 0.1 }],
    ['glow', { size: 2.2, color: '#6080d0', life: 46, alpha: 0.4 }],
  ]);
  // ---- lightning
  def('bolt1', { color: '#e0e8ff', sfx: 'bolt', hit: 8 }, [
    ['bolts', { n: 1, life: 20 }], ['flashGround', { r: 0.9, life: 18 }],
    ['glow', { size: 1.2, color: '#b0c8ff', life: 20 }],
    ['sparks', { n: 10, color: ['#ffffc0', '#c0d8ff'], size: 0.05, speed: 0.07, delay: 3, plife: 16 }],
  ]);
  def('bolt2', { color: '#e0e8ff', sfx: 'bolt', hit: 10 }, [
    ['bolts', { n: 3, step: 3, spread: 1.2, life: 22 }], ['flashGround', { r: 1.4, life: 24 }],
    ['glow', { size: 1.7, color: '#b0c8ff', life: 26 }],
    ['sparks', { n: 16, color: ['#ffffc0', '#c0d8ff'], size: 0.05, speed: 0.08, delay: 3, plife: 18 }],
  ]);
  def('bolt3', { color: '#ffffff', sfx: 'bolt', hit: 12, flash: '#ffffff', shake: 4 }, [
    ['bolts', { n: 8, step: 2, spread: 2.2, life: 28, width: 1.3 }], ['flashGround', { r: 2.4, life: 32 }],
    ['column', { r: 0.45, h: 7, color: '#e8f0ff', life: 14, delay: 1 }],
    ['glow', { size: 3, color: '#b0c8ff', life: 34 }],
    ['sparks', { n: 30, color: ['#ffffc0', '#c0d8ff', '#ffffff'], size: 0.06, speed: 0.1, delay: 3, plife: 22 }],
    ['rings', { n: 2, color: '#a0c0ff', r: 1, life: 20, step: 6 }],
  ]);
  // ---- earth
  def('quake1', { color: '#c0a060', sfx: 'magic', hit: 16, shake: 6 }, [['ground', { r: 1.5, slabs: 9, lift: 0.55, rocks: 8, life: 46 }]]);
  def('quake2', { color: '#c0a060', sfx: 'magic', hit: 18, shake: 8 }, [['ground', { r: 1.9, slabs: 12, lift: 0.85, rocks: 12, life: 50 }]]);
  def('quake3', { color: '#c09040', sfx: 'magic', hit: 20, shake: 12 }, [
    ['ground', { r: 2.3, slabs: 16, lift: 1.0, rocks: 18, lava: true, life: 58 }],
    ['glow', { size: 2.5, color: '#ff6020', at: 'ground', life: 50, alpha: 0.5 }],
  ]);
  // ---- poison
  const BUBBLES = (n, o) => ['sparks', Object.assign({ mode: 'rise', ptex: 'bubble', n, color: ['#b0ff80', '#c080ff'], size: 0.12, speed: 0.025, r: 0.45, plife: 30, dur: 20, delay: 4 }, o)];
  def('bio1', { color: '#80e040', sfx: 'magic', hit: 16 }, [
    ['cloud', { n: 10, r: 0.55, size: 0.95, color: ['#58c838', '#2f8a22', '#90e060'], life: 42, block: true }], BUBBLES(12),
  ]);
  def('bio2', { color: '#80e040', sfx: 'magic', hit: 16 }, [
    ['cloud', { n: 14, r: 0.7, size: 1.2, color: ['#58c838', '#2f8a22', '#90e060', '#407818'], life: 44, block: true }], BUBBLES(18, { r: 0.7 }),
    ['glow', { size: 1.8, color: '#30a020', life: 40, alpha: 0.4 }],
  ]);
  def('bio3', { color: '#60ff40', sfx: 'magic', hit: 18 }, [
    ['cloud', { n: 22, r: 0.95, size: 1.5, color: ['#58c838', '#2f8a22', '#90e060', '#407818'], life: 48, block: true, rise: 0.008 }], BUBBLES(28, { r: 0.9, size: 0.16 }),
    ['glow', { size: 2.6, color: '#208010', life: 46, alpha: 0.5 }],
  ]);
  // ---- gravity
  def('demi', { color: '#8040c0', sfx: 'magic', hit: 18 }, [
    ['shell', { rx: 0.9, ry: 0.9, cy: 0.55, implode: [1.3, 0.25], color: '#9060ff', fill: '#180828', fillA: 0.6, life: 30, tex: 'swirl', spin: 0.15 }],
    ['sparks', { mode: 'in', n: 24, color: ['#c080ff', '#8040ff'], size: 0.06, r: 1.4, plife: 18, dur: 12 }],
    ['glow', { size: 1.6, color: '#6020c0', life: 34, alpha: 0.6 }],
    ['rings', { n: 3, dir: -1, color: '#a060ff', r: 0.7, life: 22, step: 5 }],
  ]);
  // ---- restore
  def('cure', { color: '#80ff90', sfx: 'heal', hit: 16, heal: true }, [
    ['sparks', { mode: 'fall', mesh: 'sparkle', n: 16, color: ['#ffffff', '#c0ffc8'], size: 0.14, speed: 0.04, r: 0.5, top: 1.8, plife: 34, dur: 14 }],
    ['column', { r: 0.42, h: 2.3, color: '#90ffb0', life: 32, alpha: 0.45, delay: 6 }],
    ['rings', { n: 2, color: '#a0ffb0', r: 0.6, life: 24, step: 6, delay: 8 }],
    ['glow', { size: 1.4, color: '#b0ffc0', life: 30, alpha: 0.5, delay: 10 }],
  ]);
  def('item_heal', { color: '#80ff90', sfx: 'heal', hit: 12, heal: true }, [
    ['sparks', { mode: 'fall', mesh: 'sparkle', n: 10, color: ['#ffffff', '#c0ffc8'], size: 0.12, speed: 0.045, r: 0.4, top: 1.5, plife: 26, dur: 10 }],
    ['rings', { n: 2, color: '#a0ffb0', r: 0.55, life: 22, step: 5, delay: 4 }],
    ['glow', { size: 1.1, color: '#b0ffc0', life: 24, alpha: 0.45, delay: 6 }],
  ]);
  def('life', { color: '#fff0a0', sfx: 'heal2', hit: 18, heal: true }, [
    ['sparks', { mode: 'fall', ptex: 'feather', n: 8, color: '#ffffff', size: 0.24, speed: 0.022, r: 0.5, top: 1.9, plife: 50, dur: 16, spin: 0.08, blend: 'alpha' }],
    ['column', { r: 0.45, h: 3, color: '#ffe890', core: '#fff8e0', life: 44, alpha: 0.32 }],
    ['sparks', { mode: 'rise', mesh: 'sparkle', n: 14, color: ['#fff8c0', '#ffffff'], size: 0.12, speed: 0.04, r: 0.4, plife: 30, dur: 20, delay: 10 }],
    ['glow', { size: 1.6, color: '#fff0b0', life: 40, alpha: 0.5, delay: 8 }],
  ]);
  def('esuna', { color: '#a0ffd0', sfx: 'heal', hit: 14, heal: true }, [
    ['sparks', { mode: 'rise', mesh: 'sparkle', n: 18, color: ['#e0fff0', '#a0e0ff'], size: 0.13, speed: 0.05, r: 0.45, plife: 28, dur: 14 }],
    ['rings', { n: 3, color: '#b0fff0', r: 0.55, life: 24, step: 5 }],
    ['glow', { size: 1.3, color: '#c0fff0', life: 28, alpha: 0.45 }],
  ]);
  // ---- time / status
  def('buff', { color: '#80c0ff', sfx: 'magic', hit: 14, heal: true }, [
    ['rings', { n: 4, color: '#80c8ff', r: 0.55, life: 22, step: 4 }],
    ['clock', { color: '#c0e0ff', life: 30, speed: 0.5 }],
    ['sparks', { mode: 'rise', n: 12, color: '#c0e8ff', size: 0.06, speed: 0.07, r: 0.4, plife: 20, dur: 10 }],
  ]);
  def('debuff', { color: '#c080ff', sfx: 'magic', hit: 14 }, [
    ['rings', { n: 4, dir: -1, color: '#c080ff', r: 0.6, life: 22, step: 4 }],
    ['sparks', { mode: 'fall', n: 12, color: ['#e0a0ff', '#8060ff'], size: 0.06, speed: 0.05, r: 0.5, top: 1.5, plife: 24, dur: 10 }],
    ['glow', { size: 1.2, color: '#8040c0', life: 28, alpha: 0.4 }],
  ]);
  def('stop', { color: '#a0a0ff', sfx: 'magic', hit: 16 }, [
    ['clock', { color: '#c0c8ff', life: 36, speed: 0.6, stop: true, size: 0.75 }],
    ['rings', { n: 2, color: '#a0a8ff', r: 0.6, life: 26, step: 8 }],
    ['glow', { size: 1.3, color: '#8080ff', life: 30, alpha: 0.4 }],
  ]);
  const SHELL = (color, fill, extra) => [
    ['shell', Object.assign({ rx: 0.5, ry: 0.62, cy: 0.55, grow: [0.2, 1], growT: 10, color, fill, fillA: 0.18, tex: 'swirl', spin: 0.05, life: 46 }, extra)],
    ['sparks', { mesh: 'sparkle', n: 14, color: ['#ffffff', color], size: 0.11, speed: 0.03, r: 0.6, mode: 'surface', plife: 30, dur: 20, delay: 6 }],
  ];
  def('barrier', { color: '#80c0ff', sfx: 'magic', hit: 14, heal: true }, SHELL('#6aa8ff', '#2050c0'));
  def('mbarrier', { color: '#d080ff', sfx: 'magic', hit: 14, heal: true }, SHELL('#c880ff', '#6020a0'));
  def('reflect', { color: '#a0ffc0', sfx: 'magic', hit: 14, heal: true }, SHELL('#90ffc0', '#208060', { tex2: 'swirl', color2: '#fff0a0' }));
  def('sleep', { color: '#ff80c0', sfx: 'magic', hit: 14 }, [
    ['cloud', { n: 6, r: 0.4, size: 0.6, color: ['#ffb0e0', '#e080c0'], life: 40, alpha: 0.55, y: 0.8, rise: 0.003 }],
    ['zs', { life: 40 }],
    ['sparks', { mode: 'fall', mesh: 'sparkle', n: 10, color: '#ffd0f0', size: 0.1, speed: 0.03, r: 0.5, plife: 30, dur: 12 }],
  ]);
  def('confuse', { color: '#ffc040', sfx: 'magic', hit: 14 }, [
    ['orbit', { n: 5, color: '#ffe060', size: 0.14, r: 0.45, y: 1.05, speed: 0.18, life: 40 }],
    ['glow', { size: 1.2, color: '#ffb030', life: 26, alpha: 0.4 }],
    ['rings', { n: 2, color: '#ffd060', r: 0.5, life: 20, step: 6 }],
  ]);
  def('berserk', { color: '#ff4040', sfx: 'magic', hit: 14 }, [
    ['flames', { n: 5, r: 0.35, size: 0.7, step: 2, life: 26, color: '#ff6050', alpha: 0.9 }],
    ['glow', { size: 1.4, color: '#ff2010', life: 30, alpha: 0.6 }],
    ['rings', { n: 3, color: '#ff4030', r: 0.55, life: 20, step: 4 }],
  ]);
  def('mini', { color: '#80ffff', sfx: 'magic', hit: 14 }, [
    ['rings', { n: 4, color: '#80ffff', r: 0.9, r0: 1.3, r1: 0.2, y0: 0.5, y1: 0.5, life: 20, step: 4 }],
    ['sparks', { mode: 'in', mesh: 'sparkle', n: 16, color: ['#c0ffff', '#ffffff'], size: 0.1, r: 1.1, plife: 18, dur: 10 }],
  ]);
  def('toad', { color: '#60c040', sfx: 'magic', hit: 14 }, [
    ['cloud', { n: 7, r: 0.35, size: 0.6, color: ['#80d060', '#50a040', '#c0f0a0'], life: 30, alpha: 0.75, y: 0.4, spreadT: 4 }],
    ['sparks', { n: 14, color: '#a0ff80', size: 0.06, speed: 0.06, up: 0.5, plife: 20 }],
  ]);
  def('death', { color: '#402060', sfx: 'magic', hit: 18 }, [
    ['shell', { rx: 0.8, ry: 0.8, cy: 0.6, implode: [1.4, 0.1], color: '#6020a0', fill: '#08000c', fillA: 0.75, life: 30, tex: 'swirl', spin: -0.2 }],
    ['sparks', { mode: 'in', n: 20, color: ['#a040ff', '#401060'], size: 0.07, r: 1.5, plife: 20, dur: 12 }],
    ['cloud', { n: 5, r: 0.3, size: 0.7, color: '#200030', life: 34, alpha: 0.6, delay: 14 }],
  ]);
  def('remove', { color: '#8080ff', sfx: 'magic', hit: 18 }, [
    ['shell', { rx: 0.8, cy: 0.55, implode: [1.2, 0.05], color: '#8080ff', fill: '#000010', fillA: 0.7, life: 28, tex: 'swirl', spin: 0.3 }],
    ['sparks', { mode: 'in', n: 22, color: ['#a0a0ff', '#ffffff'], size: 0.06, r: 1.4, plife: 18, dur: 12 }],
  ]);
  // ---- big spells
  def('comet', { color: '#ffa060', sfx: 'fire2', hit: 22, shake: 8 }, [['rocks', { n: 1, size: 0.5, fall: 20, boom: 1.6 }]]);
  def('freeze', { color: '#c0f0ff', sfx: 'ice', hit: 18 }, [
    ['crystals', { n: 1, big: true, size: 2.2, life: 50 }], ['crystals', { n: 10, size: 1.2, r: 1.2, life: 48, delay: 4 }],
    ['bloom', { size: 3.4, life: 44, delay: 8, layers: 2 }], ['shards', { n: 30, delay: 44, size: 0.2, speed: 0.1 }],
    ['glow', { size: 3, color: '#a0d0ff', life: 48, alpha: 0.5 }],
  ]);
  def('break', { color: '#c0a080', sfx: 'magic', hit: 18 }, [
    ['crystals', { n: 7, size: 1.3, r: 0.8, life: 44, color: '#b8a890', stone: true }],
    ['shards', { n: 20, delay: 38, color: ['#a09078', '#c0b098'] }],
    ['dust', { n: 10, delay: 4, r: 1 }],
  ]);
  def('tornado', { color: '#c0ffd0', sfx: 'magic', hit: 16 }, [
    ['funnel', { r: 1.4, h: 3.2, color: '#a8f0c0', alpha: 0.6, life: 48 }],
    ['sparks', { mode: 'orbit', n: 16, color: ['#e0ffe8', '#a0c0a0'], size: 0.06, speed: 0.05, r: 0.8, plife: 36, dur: 20 }],
    ['dust', { n: 8, r: 1.2 }],
  ]);
  def('flare', { color: '#ff6040', sfx: 'fire2', hit: 22, flash: '#ffc080' }, [
    ['sparks', { mode: 'in', n: 30, color: ['#ffd080', '#ff4020'], size: 0.07, r: 1.6, plife: 16, dur: 10 }],
    ['glow', { size: 0.8, color: '#ffe0a0', life: 20, grow: [0.2, 1] }],
    ['shell', { rx: 0.7, cy: 0.55, grow: [0.1, 1.6], growT: 16, color: '#ff5020', life: 30, delay: 16, tex: 'swirl', spin: 0.2 }],
    ['rays', { size: 3.2, color: '#ffd090', life: 20, delay: 18 }],
    ['flames', { n: 12, r: 0.8, size: 1.2, step: 1, life: 26, delay: 16, ring: true, spread: 0.8 }],
    ['shock', { r: 2, color: '#ff8040', life: 20, delay: 18 }],
  ]);
  def('ultima', { color: '#80ff80', sfx: 'fire2', hit: 28, flash: '#ffffff', shake: 10, group: true }, [
    ['sparks', { mode: 'in', n: 36, color: ['#e0ffe0', '#60ff80'], size: 0.08, r: 2.4, plife: 20, dur: 12 }],
    ['glow', { size: 1.2, color: '#e0ffe8', life: 22, grow: [0.2, 1.2] }],
    ['shell', { dome: true, abs: true, rx: 1, ry: 0.8, cy: 0, grow: [0.05, 5], growT: 26, color: '#60ff90', fill: '#c0ffd0', fillA: 0.2, life: 44, delay: 18, tex: 'swirl', spin: 0.03 }],
    ['rings', { n: 3, color: '#a0ffb0', r: 1.2, r0: 0.3, r1: 3.5, y0: 0.05, y1: 0.05, life: 26, step: 5, delay: 18 }],
    ['rays', { size: 5, color: '#ffffff', life: 22, delay: 20 }],
    ['glow', { size: 6, color: '#80ff90', life: 36, delay: 20, alpha: 0.6 }],
  ]);
  def('holy', { color: '#ffffff', sfx: 'fire2', hit: 22, flash: '#ffffff' }, [
    ['column', { r: 0.6, h: 6, color: '#fff8e0', life: 34, alpha: 0.9 }],
    ['sparks', { mode: 'fall', mesh: 'sparkle', n: 24, color: ['#ffffff', '#fff0c0'], size: 0.16, speed: 0.08, r: 0.9, top: 2.5, plife: 26, dur: 14 }],
    ['rays', { size: 3.5, color: '#ffffff', life: 22, delay: 14 }], ['shock', { r: 2, color: '#ffffe0', delay: 14 }],
  ]);
  // ---- drain
  def('drain', { color: '#ff4060', sfx: 'magic', hit: 14 }, [['glow', { size: 1.2, color: '#ff2040', life: 30, alpha: 0.6 }], ['stream', { n: 18, color: ['#ff4060', '#ff90a0'], life: 34, travel: 18, reverse: true }]]);
  def('osmose', { color: '#6080ff', sfx: 'magic', hit: 14 }, [['glow', { size: 1.2, color: '#4060ff', life: 30, alpha: 0.6 }], ['stream', { n: 18, color: ['#6080ff', '#a0c0ff'], life: 34, travel: 18, reverse: true }]]);
  // ---- physical hits
  def('slash', { color: '#ffffff', sfx: 'hit', hit: 2 }, [['slash', { strokes: 'rand', width: 0.09, fadeT: 9, glow: '#a0c0ff' }], ['sparks', { n: 8, color: '#ffffff', size: 0.035, speed: 0.06, plife: 14 }]]);
  def('claw', { color: '#ffffff', sfx: 'hit', hit: 2 }, [['slash', { strokes: [[-0.55, 0.55, 0.35, -0.45], [-0.4, 0.62, 0.5, -0.32], [-0.25, 0.7, 0.65, -0.2]], step: 1, width: 0.06, fadeT: 9, glow: '#ffa0a0' }], ['sparks', { n: 8, color: '#ffffff', size: 0.035, speed: 0.06, plife: 14 }]]);
  def('punch', { color: '#ffffa0', sfx: 'hit', hit: 2 }, [['burst', { size: 0.6, color: '#ffffa0', n: 10 }]]);
  def('shot', { color: '#ffe060', sfx: 'shot', hit: 2 }, [['burst', { size: 0.5, color: '#ffe060', n: 10 }]]);
  def('enemy_hit', { color: '#ffffff', sfx: 'hit', hit: 2 }, [['burst', { size: 0.55, color: '#ffffff', n: 10 }]]);
  // ---- beams / enemy skills
  def('beam', { color: '#80d0ff', sfx: 'magic', hit: 8 }, [['beam', { r: 0.06, color: '#80d0ff', life: 20, travel: 5 }], ['burst', { size: 0.9, color: '#a0e0ff', delay: 5 }]]);
  def('laser', { color: '#ff4040', sfx: 'magic', hit: 8 }, [['beam', { r: 0.04, color: '#ff3030', life: 22, travel: 3 }], ['burst', { size: 0.8, color: '#ff6040', delay: 4 }]]);
  def('flamethrower', { color: '#ff8030', sfx: 'fire', hit: 14 }, [['stream', { fire: true, n: 24, life: 30, travel: 10, size: 0.4, arc: 0.1 }], ['flames', { n: 5, r: 0.4, size: 0.9, step: 2, life: 24, delay: 10 }]]);
  def('white_wind', { color: '#e0ffe0', sfx: 'heal2', hit: 16, heal: true }, [
    ['spiral', { color: '#d0ffe0', life: 38 }], ['sparks', { mode: 'orbit', mesh: 'sparkle', n: 14, color: ['#ffffff', '#c0ffd0'], size: 0.1, speed: 0.03, r: 0.6, plife: 30, dur: 14 }],
    ['glow', { size: 1.3, color: '#c0ffd0', life: 32, alpha: 0.4 }],
  ]);
  def('aqualung', { color: '#60a0ff', sfx: 'magic', hit: 14 }, [
    ['shell', { rx: 0.6, ry: 0.6, cy: 0.5, tex: 'water', color: '#6aa0ff', fill: '#103070', fillA: 0.3, grow: [0.2, 1.15], growT: 12, life: 32, spin: 0.08 }],
    ['sparks', { ptex: 'bubble', n: 20, color: ['#c0e0ff', '#ffffff'], size: 0.12, speed: 0.06, up: 0.4, plife: 26, delay: 14 }],
    ['sparks', { n: 18, color: '#a0d0ff', size: 0.05, speed: 0.1, up: 0.7, gravity: 0.004, plife: 24, delay: 16 }],
  ]);
  def('trine', { color: '#ffe040', sfx: 'bolt', hit: 12 }, [['triangle', { color: '#ffe860', life: 28 }], ['glow', { size: 1.6, color: '#ffe040', life: 28, alpha: 0.6 }], ['flashGround', { r: 1.1, color: '#ffe040', life: 22 }]]);
  def('shadow_flare', { color: '#a040ff', sfx: 'magic', hit: 22 }, [
    ['sparks', { mode: 'in', n: 18, color: ['#301040', '#a040ff'], size: 0.12, r: 1.6, plife: 18, dur: 10, blend: 'alpha' }],
    ['shell', { rx: 0.7, cy: 0.55, implode: [1.2, 0.3], color: '#a040ff', fill: '#100018', fillA: 0.7, life: 20, tex: 'swirl', spin: 0.3 }],
    ['cloud', { n: 8, r: 0.5, size: 0.9, color: ['#200030', '#400060'], life: 34, alpha: 0.7, delay: 16 }],
    ['rays', { size: 3, color: '#c060ff', life: 20, delay: 18 }], ['shock', { r: 1.8, color: '#a040ff', delay: 18 }],
  ]);
  def('explosion', { color: '#ffa040', sfx: 'fire2', hit: 10 }, [
    ['glow', { size: 2.2, color: '#ff8020', life: 30, grow: [0.3, 1] }],
    ['flames', { n: 9, r: 0.5, size: 1.1, step: 1, life: 26, ring: true, spread: 0.8 }],
    ['rays', { size: 2.4, color: '#ffe0a0', life: 16 }], ['shock', { r: 1.6, life: 18 }],
    ['sparks', { n: 24, color: ['#ffe080', '#ff8030'], size: 0.06, speed: 0.08, up: 0.5, plife: 22 }],
    ['cloud', { n: 6, r: 0.5, size: 0.9, color: ['#403830', '#302820'], life: 36, alpha: 0.55, delay: 10, rise: 0.01 }],
  ]);
  def('slash_big', { color: '#ffffff', sfx: 'hit', hit: 8, flash: '#ffffff' }, [
    ['slash', { strokes: [[-0.9, 0.8, 0.9, -0.7], [0.9, 0.8, -0.9, -0.7], [-1, 0.1, 1, 0.1]], step: 3, width: 0.16, hold: 4 }],
    ['burst', { size: 1.5, color: '#e0e8ff', n: 20, delay: 6 }],
  ]);
  // ---- limit choreography helpers (B.limitMoves): charge-up at the caster, dash streaks
  def('charge', { color: '#ffe080', sfx: 'magic', hit: 18 }, [['sparks', { mode: 'in', n: 22, color: ['#fff0a0', '#ffc040'], size: 0.05, r: 0.9, plife: 16, dur: 12 }], ['glow', { size: 0.9, color: '#ffe080', life: 22, grow: [0.2, 1] }]]);
  def('dash_red', { color: '#ff6040', sfx: 'run_attack', hit: 6 }, [['stream', { n: 14, color: ['#ff6040', '#ffc0a0'], life: 14, travel: 6, arc: 0, size: 0.22 }]]);
  def('dash_bolt', { color: '#c0d8ff', sfx: 'bolt', hit: 6 }, [['stream', { n: 14, color: ['#c0d8ff', '#ffffff'], life: 14, travel: 6, arc: 0, size: 0.2 }], ['beam', { r: 0.03, color: '#c0d8ff', life: 12, travel: 6 }]]);
  // ---- summons (fallback when no cinematic sequence runs: enemy summons, Odin's special)
  const SUMMON_AS = { choco_mog: 'explosion', shiva: 'ice3', ifrit: 'fire3', ramuh: 'bolt3', titan: 'quake3', odin: 'slash_big', leviathan: 'aqualung', bahamut: 'flare', kujata: 'fire3',
    alexander: 'holy', phoenix: 'fire3', neo_bahamut: 'flare', hades: 'bio3', typhoon: 'tornado', bahamut_zero: 'ultima', knights_of_round: 'slash_big' };
  const SUMMON_COL = { choco_mog: '#f0e060', shiva: '#a0e0ff', ifrit: '#ff6020', ramuh: '#e0e8ff', titan: '#c0a060', odin: '#a0a0c0', leviathan: '#40a0ff', bahamut: '#ffa060', kujata: '#ffc0a0', alexander: '#ffffff', phoenix: '#ff8030', neo_bahamut: '#ff8040', hades: '#80ff60', typhoon: '#c0ffd0', bahamut_zero: '#8080ff', knights_of_round: '#ffe080' };
  for (const k in SUMMON_AS) P['summon_' + k] = Object.assign({}, P[SUMMON_AS[k]], { color: SUMMON_COL[k], sfx: 'fire2', flash: SUMMON_COL[k], shake: 8, summon: true, scale: 1.35 });
  // ---- limit breaks: the hit visual of each limit (the aura / close-up / choreography is in battle.js + specials.js)
  const L = (id, hit, fx, props) => def('limit_' + id, Object.assign({ color: '#ffe0a0', sfx: 'limit', hit }, props), fx);
  const VSLASH = (col, glow) => ['slash', { strokes: [[0.08, 1.35, -0.06, -0.55]], width: 0.2, draw: 2, fadeT: 12, color: col || '#ffffff', glow: glow || '#ffd080' }];
  const KYO = [[-0.38, 0.42, 0.38, -0.3], [0.38, 0.42, -0.38, -0.3], [-0.62, 0.36, -0.62, -0.62], [-0.62, -0.62, 0.62, -0.62], [0.62, -0.62, 0.62, 0.36]];   // the 凶 mark
  L('braver', 3, [VSLASH(), ['burst', { size: 1.2, color: '#ffe0a0', n: 16 }], ['shock', { r: 1.6, color: '#ffd080' }], ['dust', { n: 8, r: 1 }]], { flash: '#ffffff', shake: 6 });
  L('cross_slash', 14, [['slash', { strokes: KYO, step: 3, width: 0.1, draw: 2, hold: 12, fadeT: 10, color: '#ffffff', glow: '#ff7060' }], ['burst', { size: 1.1, color: '#ffc0a0', n: 14, delay: 14 }]], { flash: '#ffffff' });
  L('blade_beam', 12, [['wave', { travel: 12 }], ['burst', { size: 1.4, color: '#a0ffc0', n: 16, delay: 12 }], ['shock', { r: 1.4, color: '#80ffa0', delay: 12 }]]);
  L('climhazzard', 6, [['slash', { strokes: [[-0.1, -0.5, 0.15, 1.5]], width: 0.18, draw: 3, fadeT: 12, glow: '#ffe080' }], ['burst', { size: 1.2, color: '#ffe0a0', n: 16, delay: 4 }], ['sparks', { mode: 'rise', n: 14, color: '#ffe0a0', size: 0.05, speed: 0.1, r: 0.3, plife: 18 }]]);
  L('meteorain', 12, [['rocks', { n: 1, size: 0.25, fall: 12, trail: '#a0c0ff', glow: '#80a0ff', boom: 1, boomColor: '#c0d8ff', boomFlame: '#a0c0ff', dy: 7 }]]);
  L('finishing_touch', 14, [['funnel', { r: 1.1, h: 3.6, color: '#e0f0ff', life: 44 }], ['sparks', { mode: 'orbit', n: 20, color: ['#ffffff', '#c0d8ff'], size: 0.06, r: 0.9, plife: 34, dur: 16 }]]);
  L('omnislash', 3, [['slash', { strokes: 'rand', width: 0.13, fadeT: 8, glow: '#80c0ff' }], ['burst', { size: 0.8, color: '#e0f0ff', n: 8 }]]);
  L('big_shot', 10, [['orb', { travel: 10, size: 0.55, color: '#ffe080' }], ['burst', { size: 1.6, color: '#ffe080', n: 20, delay: 10 }], ['shock', { r: 1.4, delay: 10 }]]);
  L('mindblow', 10, [['orb', { travel: 8, size: 0.35, color: '#c080ff' }], ['rings', { n: 3, color: '#c080ff', r: 0.5, y0: 1.1, y1: 1.1, r0: 0.2, r1: 1.6, life: 20, step: 4, delay: 8 }], ['glow', { size: 1.4, color: '#a060ff', life: 26, delay: 8, at: 'top', y: -0.1 }], ['sparks', { n: 16, color: ['#e0c0ff', '#8040ff'], size: 0.05, speed: 0.06, delay: 8, at: 'top', y: -0.1, plife: 20 }]]);
  L('grenade_bomb', 14, [['orb', { travel: 14, size: 0.18, color: '#c0ff80', arc: 1.2 }]].concat(P.explosion.fx.map(f => [f[0], Object.assign({}, f[1], { delay: ((f[1].delay || 0) + 14) })])));
  L('hammerblow', 3, [['burst', { size: 1.8, color: '#ffffff', n: 24 }], ['shock', { r: 1.6 }]], { flash: '#ffffff', shake: 6 });
  L('satellite_beam', 10, [['column', { r: 0.45, h: 12, color: '#ffe880', life: 26, alpha: 0.9, grow: false }], ['burst', { size: 1.6, color: '#ffe080', n: 16, delay: 6 }], ['shock', { r: 1.6, color: '#ffe080', delay: 6 }]], { flash: '#ffffe0' });
  L('ungarmax', 2, [['burst', { size: 0.6, color: '#ffe060', n: 8 }]], { sfx: 'shot' });
  L('catastrophe', 8, [['column', { r: 0.9, h: 12, color: '#ffffff', life: 20, alpha: 0.9, grow: false }], ['burst', { size: 1.8, color: '#ffd080', n: 20, delay: 4 }], ['flames', { n: 6, r: 0.6, size: 1, step: 1, life: 22, delay: 4, ring: true }]], { shake: 4 });
  const TIFA = (extra) => [['burst', { size: 0.9, color: '#ffe0a0', n: 12 }], ['burst', { size: 0.7, color: '#ffffff', n: 8, delay: 4, dy: 0.15 }]].concat(extra || []);
  L('beat_rush', 2, TIFA([['burst', { size: 0.8, color: '#ffe0a0', n: 8, delay: 8, dy: -0.1 }]]));
  L('somersault', 3, TIFA([['slash', { strokes: [[-0.4, -0.6, 0.1, 0.4], [0.1, 0.4, 0.5, 0.9]], step: 1, width: 0.12, glow: '#ffc080' }]]));
  L('waterkick', 4, TIFA([['sparks', { n: 20, color: ['#a0d0ff', '#ffffff'], size: 0.06, speed: 0.1, up: 0.8, gravity: 0.004, plife: 24 }], ['sparks', { ptex: 'bubble', n: 10, color: '#c0e0ff', size: 0.1, speed: 0.05, up: 0.6, plife: 22 }]]));
  L('meteodrive', 4, TIFA([['shock', { r: 1.8 }], ['dust', { n: 10, r: 1.2 }]]), { shake: 6 });
  L('dolphin_blow', 6, TIFA([['column', { r: 0.5, h: 3, color: '#80c0ff', life: 26, alpha: 0.8 }], ['sparks', { n: 24, color: ['#a0d0ff', '#ffffff'], size: 0.06, speed: 0.1, up: 1, gravity: 0.004, plife: 28 }]]));
  L('meteor_strike', 12, [['rocks', { n: 1, size: 0.4, fall: 12, boom: 1.6 }]], { shake: 6 });
  L('final_heaven', 10, [['glow', { size: 3, color: '#ff8020', life: 36, grow: [0.3, 1.3] }], ['shell', { rx: 0.8, cy: 0.4, grow: [0.1, 2.4], growT: 14, color: '#ff8030', life: 30, tex: 'swirl', spin: 0.2 }], ['rays', { size: 4, color: '#ffe0a0', life: 22 }], ['flames', { n: 14, r: 1, size: 1.6, step: 1, life: 30, ring: true, spread: 0.8 }], ['shock', { r: 2.6 }]], { flash: '#ffffff', shake: 12, sfx: 'fire2' });
  L('healing_wind', 14, [['spiral', { color: '#b0ffc0', life: 40 }], ['sparks', { mode: 'rise', mesh: 'sparkle', n: 14, color: ['#ffffff', '#b0ffc0'], size: 0.1, speed: 0.04, r: 0.5, plife: 30, dur: 16 }]], { heal: true, sfx: 'heal2' });
  L('seal_evil', 16, [['rings', { n: 4, dir: -1, color: '#c080ff', r: 0.55, life: 24, step: 4 }], ['orbit', { n: 6, mesh: 'sparkle', color: '#e0c0ff', size: 0.16, r: 0.55, y: 0.6, speed: 0.12, life: 40 }], ['glow', { size: 1.3, color: '#8040c0', life: 34, alpha: 0.5 }]]);
  L('breath_of_the_earth', 14, [['column', { r: 0.45, h: 2.6, color: '#a0ffb0', life: 34, alpha: 0.6 }], ['sparks', { mode: 'rise', mesh: 'sparkle', n: 18, color: ['#e0ffe0', '#80ff90'], size: 0.12, speed: 0.05, r: 0.5, plife: 28, dur: 16 }]], { heal: true, sfx: 'heal2' });
  L('fury_brand', 12, [['flames', { n: 6, r: 0.35, size: 0.9, step: 2, life: 28, color: '#ff8060' }], ['rings', { n: 3, color: '#ff6040', r: 0.55, life: 22, step: 4 }]]);
  L('planet_protector', 14, SHELL('#ffd860', '#806010', { life: 50 }), { heal: true });
  L('pulse_of_life', 16, [['column', { r: 0.6, h: 4, color: '#fff8d0', life: 44, alpha: 0.8 }], ['sparks', { mode: 'rise', mesh: 'sparkle', n: 20, color: ['#ffffff', '#fff0b0'], size: 0.12, speed: 0.05, r: 0.5, plife: 30, dur: 20 }], ['glow', { size: 1.8, color: '#fff0c0', life: 40, alpha: 0.6 }]], { heal: true, sfx: 'heal2' });
  L('great_gospel', 18, [['column', { r: 0.7, h: 6, color: '#fff0a0', life: 50, alpha: 0.85 }], ['sparks', { mode: 'fall', ptex: 'feather', n: 10, color: '#ffffff', size: 0.26, speed: 0.025, r: 0.6, top: 2, plife: 50, dur: 16, spin: 0.08, blend: 'alpha' }], ['rays', { size: 3, color: '#fff8e0', life: 26, delay: 10 }]], { heal: true, sfx: 'heal2', flash: '#fffff0' });
  L('sled_fang', 3, [['slash', { strokes: [[-1, 0.05, 1, -0.05]], width: 0.18, draw: 2, fadeT: 10, color: '#ffd0a0', glow: '#ff6030' }], ['burst', { size: 1, color: '#ffc080', n: 12 }]]);
  L('lunatic_high', 14, [['rings', { n: 4, color: '#ffe060', r: 0.55, life: 22, step: 4 }], ['sparks', { mode: 'rise', n: 14, color: '#fff0a0', size: 0.06, speed: 0.07, r: 0.4, plife: 22, dur: 10 }]], { heal: true });
  L('blood_fang', 3, [['slash', { strokes: [[-1, 0.1, 1, -0.1]], width: 0.16, draw: 2, fadeT: 10, color: '#ffc0c0', glow: '#ff2040' }], ['burst', { size: 0.9, color: '#ff6060', n: 10 }], ['stream', { n: 14, color: ['#ff4060', '#ff90a0'], life: 30, travel: 16, reverse: true, delay: 4 }]]);
  L('stardust_ray', 6, [['bolts', { n: 1, life: 16, color: '#fff0c0', width: 0.8, top: 10 }], ['burst', { size: 0.8, color: '#fff0c0', n: 10, delay: 2 }]]);
  L('howling_moon', 14, [['glow', { size: 2.4, color: '#fff0c0', life: 40, alpha: 0.6, at: 'top', y: 0.8 }], ['rings', { n: 3, color: '#ff4030', r: 0.55, life: 22, step: 4 }], ['flames', { n: 4, r: 0.3, size: 0.6, step: 3, life: 24, color: '#ff8070' }]]);
  L('earth_rave', 4, [['burst', { size: 1, color: '#ffe0a0', n: 12 }], ['shock', { r: 1.3 }], ['dust', { n: 6, r: 0.9 }]]);
  L('cosmo_memory', 18, P.fire3.fx.concat([['shell', { rx: 0.9, cy: 0.4, grow: [0.1, 2.2], growT: 16, color: '#ff6020', life: 34, delay: 8, tex: 'swirl', spin: 0.2 }]]), { flash: '#ffc080', shake: 10, sfx: 'fire2', scale: 1.2 });
  L('greased_lightning', 4, [['bolts', { n: 1, life: 14, width: 0.8 }], ['slash', { strokes: [[-0.9, 0.3, 0.9, -0.3]], width: 0.12, glow: '#c0d8ff' }], ['burst', { size: 0.9, color: '#e0e8ff', n: 12 }]]);
  L('clear_tranquil', 14, [['rings', { n: 3, color: '#80c0ff', r: 0.6, life: 24, step: 5 }], ['sparks', { mode: 'rise', ptex: 'bubble', n: 14, color: ['#c0e0ff', '#ffffff'], size: 0.1, speed: 0.04, r: 0.5, plife: 28, dur: 16 }], ['glow', { size: 1.3, color: '#a0d0ff', life: 32, alpha: 0.5 }]], { heal: true, sfx: 'heal2' });
  L('landscaper', 18, [['ground', { r: 1.5, slabs: 12, lift: 0.8, rocks: 10, life: 52 }]], { shake: 10, sfx: 'magic' });
  L('bloodfest', 2, [['slash', { strokes: 'rand', width: 0.1, fadeT: 8, color: '#ffe0e0', glow: '#ff4040' }], ['sparks', { n: 8, color: '#ffc0c0', size: 0.04, speed: 0.06, plife: 14 }]]);
  L('gauntlet', 14, [['column', { r: 0.8, h: 5, color: '#ff8030', life: 34, alpha: 0.9 }], ['flames', { n: 12, r: 0.6, size: 1.4, step: 1, life: 32, rise: 1, swirl: 1 }], ['glow', { size: 2.4, color: '#ff5010', life: 36, alpha: 0.7 }]], { flash: '#ffc080', shake: 6 });
  L('doom_of_the_living', 2, [['slash', { strokes: 'rand', width: 0.12, fadeT: 8, glow: '#80ffc0' }], ['burst', { size: 0.8, color: '#c0ffe0', n: 8 }]]);
  L('all_creation', 12, [['column', { r: 1.2, h: 10, color: '#fff0c0', life: 30, alpha: 0.95, grow: false }], ['rays', { size: 5, color: '#ffffff', life: 24, delay: 6 }], ['shock', { r: 3, color: '#fff0c0', delay: 6 }], ['glow', { size: 5, color: '#ffe0a0', life: 34, alpha: 0.7 }]], { flash: '#ffffff', shake: 10, sfx: 'fire2', group: true });
  L('dice', 10, P.explosion.fx);
  L('slots', 10, [['burst', { size: 1.6, color: '#ffe060', n: 20 }], ['rays', { size: 2.4, color: '#fff0a0', life: 20 }]]);
  const BEAST = (col) => [['cloud', { n: 10, r: 0.45, size: 0.8, color: ['#100818', col], life: 36, alpha: 0.75, spreadT: 6 }], ['sparks', { mode: 'in', n: 24, color: [col, '#ffffff'], size: 0.06, r: 1.4, plife: 20, dur: 12 }], ['glow', { size: 1.8, color: col, life: 34, alpha: 0.6 }]];
  L('galian_beast', 10, BEAST('#8040ff')); L('death_gigas', 10, BEAST('#40a0ff')); L('hellmasker', 10, BEAST('#ff4040')); L('chaos', 10, BEAST('#a01020'));
  L('boost_jump', 3, [['column', { r: 0.18, h: 3.5, color: '#ffffff', life: 16, alpha: 1, grow: false }], ['burst', { size: 1.4, color: '#ffe0a0', n: 18 }], ['shock', { r: 1.6 }], ['dust', { n: 10, r: 1.1 }]], { flash: '#ffffff', shake: 6 });
  L('dynamite', 10, [['orb', { travel: 10, size: 0.15, color: '#ffa060', arc: 1 }]].concat(P.explosion.fx.map(f => [f[0], Object.assign({}, f[1], { delay: ((f[1].delay || 0) + 10) })])));
  L('hyper_jump', 8, [['glow', { size: 3, color: '#ff6020', life: 36, grow: [0.3, 1.2] }], ['shell', { dome: true, rx: 1, ry: 0.9, cy: 0, grow: [0.1, 2.2], growT: 14, color: '#ff7030', fill: '#ffc080', fillA: 0.25, life: 30, tex: 'swirl', spin: 0.1 }], ['flames', { n: 10, r: 0.8, size: 1.4, step: 1, life: 26, ring: true }], ['shock', { r: 2.4 }]], { flash: '#ffe0c0', shake: 10, sfx: 'fire2' });
  L('dragon', 12, [['shell', { rx: 0.7, cy: 0.55, grow: [0.3, 1.2], color: '#40ff90', life: 30, tex: 'swirl', spin: 0.2 }], ['stream', { n: 16, color: ['#60ff90', '#c0ffd0'], life: 32, travel: 16, reverse: true, delay: 6 }]]);
  L('dragon_dive', 4, [['burst', { size: 1.2, color: '#ffe0a0', n: 12 }], ['shock', { r: 1.4 }], ['dust', { n: 8, r: 1 }]], { shake: 4 });
  L('big_brawl', 2, [['slash', { strokes: [[-0.2, 0.9, 0.1, -0.4]], width: 0.08, fadeT: 8 }], ['burst', { size: 0.7, color: '#ffffff', n: 8 }]]);
  L('highwind', 10, [['rocks', { n: 1, size: 0.14, fall: 10, trail: '#e0e0e0', glow: '#ffffff', boom: 1, color: '#e0e0e8', dy: 7 }]]);

  // the Turks (Config > Turks Join; not in the PS1 game): Reno's rod crackles, Rude's fists and sparks, Elena's charges
  L('electroshock', 4, [['bolts', { n: 1, life: 14, width: 0.6, color: '#c0e0ff' }], ['burst', { size: 0.9, color: '#e0f0ff', n: 12 }], ['sparks', { n: 12, color: ['#ffffff', '#a0c8ff'], size: 0.05, speed: 0.08, plife: 16 }]], { sfx: 'bolt' });
  L('pyramid', 12, [['shell', { rx: 0.7, cy: 0.5, grow: [0.2, 1.1], color: '#ffe080', life: 34, tex: 'swirl', spin: 0.1 }], ['rings', { n: 3, color: '#ffd060', r: 0.6, life: 24, step: 4 }], ['glow', { size: 1.4, color: '#ffe0a0', life: 30, alpha: 0.5 }]]);
  L('turk_light', 10, P.bolt3.fx, { flash: '#e0f0ff', shake: 6, sfx: 'bolt' });
  L('neo_turk_light', 3, [['bolts', { n: 1, life: 12, width: 0.8, color: '#d0e8ff' }], ['slash', { strokes: 'rand', width: 0.1, fadeT: 8, glow: '#80c0ff' }], ['burst', { size: 0.8, color: '#e0f0ff', n: 8 }]], { sfx: 'bolt' });
  L('shoulder_attack', 3, [['burst', { size: 1.4, color: '#ffffff', n: 18 }], ['shock', { r: 1.5 }], ['dust', { n: 8, r: 1 }]], { flash: '#ffffff', shake: 6 });
  L('grand_spark', 8, [['orb', { travel: 8, size: 0.35, color: '#c0e0ff' }], ['bolts', { n: 2, life: 16, width: 0.7, delay: 8 }], ['burst', { size: 1.2, color: '#e0f0ff', n: 14, delay: 8 }]], { sfx: 'bolt' });
  L('bulwark', 14, SHELL('#a0c8ff', '#204080', { life: 44 }), { heal: true });
  L('silent_fury', 2, [['burst', { size: 0.8, color: '#ffffff', n: 8 }], ['shock', { r: 0.9 }]], { shake: 2 });
  L('throw', 8, [['orb', { travel: 8, size: 0.14, color: '#ffa060', arc: 1 }]].concat(P.explosion.fx.map(f => [f[0], Object.assign({}, f[1], { delay: ((f[1].delay || 0) + 8) })])));
  L('rookies_grit', 14, [['spiral', { color: '#ffe0b0', life: 36 }], ['sparks', { mode: 'rise', mesh: 'sparkle', n: 12, color: ['#ffffff', '#ffe0b0'], size: 0.1, speed: 0.04, r: 0.5, plife: 28, dur: 14 }]], { heal: true, sfx: 'heal2' });
  L('throw_fire', 12, P.fire3.fx, { flash: '#ffc080', shake: 6, sfx: 'fire2' });
  L('turks_honor', 16, [['column', { r: 0.6, h: 4, color: '#e0e8ff', life: 44, alpha: 0.8 }], ['sparks', { mode: 'rise', mesh: 'sparkle', n: 18, color: ['#ffffff', '#c0d0ff'], size: 0.12, speed: 0.05, r: 0.5, plife: 30, dur: 18 }]], { heal: true, sfx: 'heal2', flash: '#f0f4ff' });

  FX.presetFor = function (ab) {
    if (!ab) return 'enemy_hit';
    if (ab.fx && P[ab.fx]) return ab.fx;
    const id = ab.id || '';
    if (ab.src === 'summon') return 'summon_' + id;
    if (ab.src === 'limit') return P['limit_' + id] ? 'limit_' + id : 'slash';
    const map = { fire: 'fire1', fire2: 'fire2', fire3: 'fire3', ice: 'ice1', ice2: 'ice2', ice3: 'ice3', bolt: 'bolt1', bolt2: 'bolt2', bolt3: 'bolt3', quake: 'quake1', quake2: 'quake2', quake3: 'quake3',
      bio: 'bio1', bio2: 'bio2', bio3: 'bio3', demi: 'demi', demi2: 'demi', demi3: 'demi', cure: 'cure', cure2: 'cure', cure3: 'cure', regen: 'cure', poisona: 'esuna', esuna: 'esuna', resist: 'esuna', life: 'life', life2: 'life',
      sleepel: 'sleep', silence: 'debuff', confu: 'confuse', berserk: 'berserk', mini: 'mini', toad: 'toad', escape: 'buff', remove: 'remove', haste: 'buff', slow: 'debuff', stop: 'stop', debarrier: 'debuff', despell: 'debuff', death: 'death',
      barrier: 'barrier', mbarrier: 'mbarrier', reflect: 'reflect', wall: 'barrier', comet: 'comet', comet2: 'comet', freeze: 'freeze', break: 'break', tornado: 'tornado', flare: 'flare', full_cure: 'cure', shield: 'barrier', ultima: 'ultima',
      white_wind: 'white_wind', aqualung: 'aqualung', trine: 'trine', shadow_flare: 'shadow_flare', laser: 'laser', flame_thrower: 'flamethrower', l5_death: 'death', frog_song: 'toad', magic_hammer: 'osmose', big_guard: 'barrier', angel_whisper: 'life',
      beta: 'fire3', bad_breath: 'bio2', matra_magic: 'explosion', magic_breath: 'flare', l4_suicide: 'explosion', pandoras_box: 'shadow_flare', death_sentence: 'death', dragon_force: 'barrier', death_force: 'buff', goblin_punch: 'punch', chocobuckle: 'explosion', roulette: 'death' };
    if (map[id]) return map[id];
    const el = (ab.elements && ab.elements[0]) || ab.element;
    if (ab.kind === 'heal' || ab.kind === 'revive' || ab.kind === 'fullcure') return ab.kind === 'revive' ? 'life' : 'cure';
    if (ab.kind === 'cure') return 'esuna';
    if (el === 'fire') return 'fire1'; if (el === 'ice') return 'ice1'; if (el === 'lightning') return 'bolt1'; if (el === 'earth') return 'quake1'; if (el === 'poison') return 'bio1'; if (el === 'gravity') return 'demi'; if (el === 'water') return 'aqualung'; if (el === 'wind') return 'tornado'; if (el === 'holy') return 'holy';
    if (ab.kind === 'status') return 'debuff';
    if (ab.kind === 'phys') return 'enemy_hit';
    return 'beam';
  };

  // target context from a hit position (hitPos = feet + 0.55 * height, capped at 3)
  const ctxAt = (pos, i, opts) => {
    const h = clamp(pos[1] / 0.55, 0.9, 6), from = opts && opts.from;
    return { p: pos.slice(), g: [pos[0], 0, pos[2]], h, w: Math.max(0.8, h * 0.62), i: i || 0, from: from || null, fromG: from ? [from[0], 0, from[2]] : null };
  };
  const spawn = (p, c, delay, k) => {
    if (p.scale) { c.h *= p.scale; c.w *= p.scale; }
    if (k) { c.h *= k; c.w *= k; }   // (opts.scale: a smaller stage, Kupomon's moogles)
    for (const [name, o] of p.fx || []) { const f = BL[name]; if (!f) continue; f(c, delay ? Object.assign({}, o, { delay: (o.delay || 0) + delay }) : o); }
  };
  // Play a preset on target positions. Returns the frame at which damage should be shown.
  FX.play = function (name, positions, opts = {}) {
    need();
    const p = P[name] || P.enemy_hit;
    if (p.sfx) FF7.audio.sfx(p.sfx);
    if (p.flash) FF7.sceneMgr.doFlash(p.flash, 16, 0.5);
    if (p.shake) FF7.sceneMgr.doShake(p.shake, 30);
    if (!X || !positions || !positions.length) return p.hit != null ? p.hit : 14;
    if (p.group) {
      const n = positions.length, cx = positions.reduce((s, q) => s + q[0], 0) / n, cz = positions.reduce((s, q) => s + q[2], 0) / n, cy = Math.max(...positions.map(q => q[1]));
      const c = ctxAt([cx, cy, cz], 0, opts), spread = Math.max(...positions.map(q => Math.hypot(q[0] - cx, q[2] - cz)));
      c.w = Math.max(c.w, spread + 0.8);
      spawn(p, c, 0, opts.scale);
    } else positions.forEach((pos, i) => spawn(p, ctxAt(pos, i, opts), i * (p.stagger != null ? p.stagger : 3), opts.scale));
    return p.hit != null ? p.hit : 14;
  };

  // ================================================================ limit breaks
  // The limit aura (FF7: a cone of golden flame around the character, filling the screen behind a
  // close-up). With culling only the cone's far wall draws, a faint near wall hazes the character.
  FX.limitAura = function (b, a) {
    need();
    const st = { stop: -1 }, v = vis(a);
    const e = FX.add3({
      life: 1e9,
      update(e) { const out = st.stop >= 0 ? (e.t - st.stop) / 16 : 0; v.aura = Math.max(0, Math.min(1, e.t / 6) * (1 - out)); if (out >= 1) { v.aura = 0; return false; } },
      draw(cam, e) {
        if (!X) return;
        const k = Math.max(0, Math.min(1, e.t / 6) * (st.stop >= 0 ? 1 - (e.t - st.stop) / 16 : 1)); if (k <= 0) return;
        const m = a.model, H = m && m.height ? Math.max(1.2, m.height * (m.scale || 1)) : 1.7, t = e.t;
        const base = [a.pos[0], (a.lift || 0) + 0.01, a.pos[2]], pul = 1 + 0.04 * sin(t * 0.5);
        X.draw(X.M.auraCone(), X.trs(base, [0, t * 0.035, 0], [H * 1.05 * pul, H * 2.4, H * 1.05 * pul]), { tex: X.ptex('aura'), color: '#ffc02a', alpha: k, cull: true });
        X.draw(X.M.auraCone(), X.trs(base, [0, 1.3 - t * 0.05, 0], [H * 0.85, H * 2.1 * (1 + 0.06 * sin(t * 0.37)), H * 0.85]), { tex: X.ptex('aura'), color: '#fff0a0', alpha: 0.75 * k, cull: true });
        X.draw(X.M.auraCone(), X.trs(base, [0, t * 0.02, 0], [H * 0.95, H * 2.2, H * 0.95]), { tex: X.ptex('aura'), color: '#ffb020', alpha: 0.16 * k, cull: false });
        X.draw(X.M.disc(), X.trs([base[0], 0.03, base[2]], [PI / 2, 0, 0], [H * 0.55, H * 0.55, 1]), { color: '#fff0a0', alpha: 0.8 * k });
        for (let i = 0; i < 10; i++) {
          const ph = ((t * 1.3 + i * 11) % 34) / 34, ang = i * 2.4 + t * 0.02, r = H * (0.3 + ph * 0.6);
          const p = [base[0] + cos(ang) * r, base[1] + H * (0.25 + ph * 1.7), base[2] + sin(ang) * r], s = H * (0.5 + 0.45 * ph);
          X.draw(X.M.quad(), X.bill(cam, p, s * 0.6, s), { tex: X.ptex('flame' + (i & 3)), color: '#ffd060', alpha: sin(ph * PI) * 0.65 * k });
        }
      },
    });
    return { stop() { if (st.stop < 0) st.stop = e.t; } };
  };
  // Cait Sith's Dice: 3D dice tumble from Cait Sith toward the target and settle on the rolled faces
  const DIE_FACE = { 1: [0, 0], 2: [-PI / 2, 0], 3: [0, PI / 2], 4: [0, -PI / 2], 5: [PI / 2, 0], 6: [PI, 0] };
  FX.dice = function (b, from, t, values) {
    need();
    const n = values.length, S0 = 0.3, f = from.pos, g = t.pos;
    const dice = values.map((val, i) => {
      const off = (i - (n - 1) / 2) * 0.46;
      return { val, s: [f[0] + off * 0.4, 1.5, f[2] - 0.4], e: [lerp(f[0], g[0], 0.5) + off, S0 / 2, lerp(f[2], g[2], 0.5) + (i % 2) * 0.3 - 0.15], spin: [1.3 + i * 0.4, 0.7 + i * 0.3, (i % 2 ? 1 : -1) * 1.1], yaw: 0.4 + i * 0.9 };
    });
    FF7.audio.sfx('hop');
    return FX.add3({
      life: 100,
      opq(cam, e) {
        const k = Math.min(1, e.t / 34), ke = X.ease.out(k);
        for (const d of dice) {
          const y = S0 / 2 + Math.pow(1 - k, 1.5) * (d.s[1] - S0 / 2) * Math.abs(cos(k * PI * 2.5));
          const rest = DIE_FACE[d.val] || [0, 0], sp = (1 - ke) * 9;
          X.draw(X.M.die(), X.trs([lerp(d.s[0], d.e[0], ke), y, lerp(d.s[2], d.e[2], ke)], [rest[0] + d.spin[0] * sp, d.yaw + d.spin[1] * sp, rest[1] + d.spin[2] * sp], S0), { lit: true, blend: null });
        }
      },
      draw(cam, e) {
        const k = Math.min(1, e.t / 34), ke = X.ease.out(k);
        for (const d of dice) X.draw(X.M.disc(), X.trs([lerp(d.s[0], d.e[0], ke), 0.02, lerp(d.s[2], d.e[2], ke)], [PI / 2, 0, 0], [S0 * 0.8, S0 * 0.8, 1]), { color: '#000000', alpha: 0.35, blend: 'alpha' });
      },
    });
  };
  // Slot reels (Cait Sith's Slots, Tifa's limit reels): picture reels in a window over the bottom HUD.
  // w = battle.reelW { symbols, idx, done, result, label, prev: [results so far], total }
  const SYM = {
    CaitS(c, s) { c.fillStyle = '#403c48'; c.beginPath(); c.arc(0, 0.08 * s, 0.3 * s, 0, PI * 2); c.fill(); c.beginPath(); c.moveTo(-0.3 * s, -0.02 * s); c.lineTo(-0.24 * s, -0.36 * s); c.lineTo(-0.08 * s, -0.18 * s); c.fill(); c.beginPath(); c.moveTo(0.3 * s, -0.02 * s); c.lineTo(0.24 * s, -0.36 * s); c.lineTo(0.08 * s, -0.18 * s); c.fill(); c.fillStyle = '#f4f0e8'; c.beginPath(); c.ellipse(0, 0.2 * s, 0.17 * s, 0.12 * s, 0, 0, PI * 2); c.fill(); c.fillStyle = '#e06080'; c.beginPath(); c.arc(0, 0.12 * s, 0.04 * s, 0, PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-0.11 * s, 0, 0.05 * s, 0, PI * 2); c.arc(0.11 * s, 0, 0.05 * s, 0, PI * 2); c.fill(); c.fillStyle = '#e8c030'; c.beginPath(); c.moveTo(-0.14 * s, -0.2 * s); c.lineTo(-0.14 * s, -0.36 * s); c.lineTo(-0.07 * s, -0.27 * s); c.lineTo(0, -0.4 * s); c.lineTo(0.07 * s, -0.27 * s); c.lineTo(0.14 * s, -0.36 * s); c.lineTo(0.14 * s, -0.2 * s); c.fill(); },
    BAR(c, s) { c.fillStyle = '#101018'; c.fillRect(-0.36 * s, -0.16 * s, 0.72 * s, 0.32 * s); c.strokeStyle = '#e8c030'; c.lineWidth = 2; c.strokeRect(-0.36 * s, -0.16 * s, 0.72 * s, 0.32 * s); c.fillStyle = '#e8c030'; c.font = `bold ${Math.round(0.26 * s)}px ${R.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAR', 0, 0.01 * s); },
    Crown(c, s) { c.fillStyle = '#f0c830'; c.beginPath(); c.moveTo(-0.34 * s, 0.22 * s); c.lineTo(-0.34 * s, -0.2 * s); c.lineTo(-0.17 * s, 0); c.lineTo(0, -0.3 * s); c.lineTo(0.17 * s, 0); c.lineTo(0.34 * s, -0.2 * s); c.lineTo(0.34 * s, 0.22 * s); c.closePath(); c.fill(); c.fillStyle = '#d02030'; c.beginPath(); c.arc(0, 0.1 * s, 0.06 * s, 0, PI * 2); c.fill(); c.fillStyle = '#3070e0'; c.beginPath(); c.arc(-0.2 * s, 0.1 * s, 0.045 * s, 0, PI * 2); c.arc(0.2 * s, 0.1 * s, 0.045 * s, 0, PI * 2); c.fill(); },
    Heart(c, s) { c.fillStyle = '#e82850'; c.beginPath(); c.moveTo(0, 0.3 * s); c.bezierCurveTo(-0.42 * s, 0, -0.3 * s, -0.36 * s, 0, -0.14 * s); c.bezierCurveTo(0.3 * s, -0.36 * s, 0.42 * s, 0, 0, 0.3 * s); c.fill(); },
    Star(c, s) { c.fillStyle = '#ffe040'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = (i & 1 ? 0.15 : 0.36) * s; if (i) c.lineTo(cos(a) * r, sin(a) * r + 0.03 * s); else c.moveTo(cos(a) * r, sin(a) * r + 0.03 * s); } c.closePath(); c.fill(); },
    Moogle(c, s) { c.fillStyle = '#8050a0'; c.beginPath(); c.moveTo(-0.2 * s, 0.1 * s); c.lineTo(-0.42 * s, -0.05 * s); c.lineTo(-0.3 * s, 0.2 * s); c.fill(); c.beginPath(); c.moveTo(0.2 * s, 0.1 * s); c.lineTo(0.42 * s, -0.05 * s); c.lineTo(0.3 * s, 0.2 * s); c.fill(); c.fillStyle = '#f4f0f0'; c.beginPath(); c.arc(0, 0.1 * s, 0.24 * s, 0, PI * 2); c.fill(); c.strokeStyle = '#303030'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -0.14 * s); c.lineTo(0, -0.28 * s); c.stroke(); c.fillStyle = '#e02030'; c.beginPath(); c.arc(0, -0.32 * s, 0.07 * s, 0, PI * 2); c.fill(); c.fillStyle = '#202020'; c.beginPath(); c.arc(-0.08 * s, 0.08 * s, 0.03 * s, 0, PI * 2); c.arc(0.08 * s, 0.08 * s, 0.03 * s, 0, PI * 2); c.fill(); },
  };
  const WORD = { Miss: ['#606070', '#d0d0e0'], Hit: ['#2050c0', '#ffffff'], 'Yeah!': ['#c02030', '#ffe060'] };
  const drawSym = (c, sym, x, y, s) => {
    c.save(); c.translate(x, y);
    if (SYM[sym]) SYM[sym](c, s);
    else { const wc = WORD[sym] || ['#404050', '#ffffff']; c.fillStyle = wc[0]; c.fillRect(-0.4 * s, -0.2 * s, 0.8 * s, 0.4 * s); c.fillStyle = wc[1]; c.font = `bold ${Math.round(0.24 * s)}px ${R.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sym, 0, 0.01 * s); }
    c.restore();
  };
  FX.drawReel = function (w) {
    const c = R.ctx, prev = w.prev || [], total = Math.max(w.total || 1, prev.length + 1), S = 52, gap = 8;
    const W = total * S + (total - 1) * gap + 24, x0 = (FF7.W - W) / 2, y0 = FF7.H - 122 - 10;
    R.window(x0, y0 - 22, W, S + 40);
    if (w.label) R.text(w.label, FF7.W / 2, y0 - 16, { align: 'center', size: 13, color: R.COL.cyan });
    for (let i = 0; i < total; i++) {
      const x = x0 + 12 + i * (S + gap), y = y0 + 8;
      c.save();
      const g = c.createLinearGradient(x, y, x, y + S); g.addColorStop(0, '#0e6a30'); g.addColorStop(1, '#063a18');
      c.fillStyle = g; c.fillRect(x, y, S, S); c.strokeStyle = '#c8c8d0'; c.lineWidth = 1.5; c.strokeRect(x, y, S, S);
      const sym = i < prev.length ? prev[i] : i === prev.length ? (w.done ? w.result : w.symbols[w.idx]) : null;
      if (sym) {
        const spinning = i === prev.length && !w.done, dy = spinning ? ((w.t * 3) % 10) - 5 : 0;
        c.globalAlpha = spinning ? 0.85 : 1;
        drawSym(c, sym, x + S / 2, y + S / 2 + dy, S);
        if (spinning) { c.globalAlpha = 0.35; c.fillStyle = '#ffffff'; c.fillRect(x + 4, y + S * 0.18, S - 8, 2); c.fillRect(x + 4, y + S * 0.8, S - 8, 2); }
        if (i === prev.length && w.done) { c.globalAlpha = 0.9; c.strokeStyle = '#ffe060'; c.lineWidth = 2.5; c.strokeRect(x + 2, y + 2, S - 4, S - 4); }
      }
      c.restore();
    }
  };

  // ================================================================ status visuals
  // FF7 (Battle Mechanics FAQ, status table): Poison kneel + green flash, Sleep kneel + Zzz, Silence
  // kneel + speech bubble, Confusion spins in place, Haste / Slow animation x2 / x0.5, Stop paused,
  // Frog, Small, Petrify grey + paused, Slow-numb grey flash + timer, Death Sentence kneel + timer,
  // Regen orange, Manipulate cyan, Berserk red, Peerless yellow, Paralysed kneel + paused,
  // Darkness kneel + black. Flash priority: grey > green > red > yellow > black > orange > cyan.
  // Barrier / MBarrier / Reflect / Shield get a faint periodic shell shimmer; Fury / Sadness tint.
  const FLASH = [['slow_numb', [0.42, 0.42, 0.46]], ['poison', 'poison'], ['berserk', [0.7, 0.06, 0.04]], ['peerless', [0.62, 0.55, 0.08]], ['darkness', null], ['regen', [0.65, 0.32, 0.05]], ['manipulate', [0.05, 0.5, 0.62]]];
  const KNEEL = ['sleep', 'poison', 'silence', 'death_sentence', 'paralysis', 'darkness'];
  const FROZEN = ['stop', 'petrify', 'paralysis', 'imprisoned'];
  const SHIMMER = [['barrier', '#ffd860'], ['mbarrier', '#d080ff'], ['reflect', '#80ffc0'], ['shield', '#ffffff']];
  const vis = (c) => c.vis || (c.vis = { t: 0, spin: 0, ph: ((c.uid || 1) * 37) % 97 });
  FX.vis = vis;
  const has = (c, s) => !!(c.status && c.status[s]);
  const mul4 = (a, b) => (a ? [a[0] * b[0], a[1] * b[1], a[2] * b[2], (a[3] == null ? 1 : a[3]) * b[3]] : b.slice());
  const add3 = (a, b) => (a ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : b.slice());
  const modelH = (c) => { const m = c.model; return m && m.height ? m.height * (m.scale || 1) : 1.5; };
  const poof = (c, col) => { if (!need() || !c.pos) return; const h = modelH(c), cc = { p: [c.pos[0], h * 0.5, c.pos[2]], g: [c.pos[0], 0, c.pos[2]], h: Math.max(0.9, h), w: Math.max(0.8, h * 0.6), i: 0 }; BL.cloud(cc, { n: 6, r: 0.35, size: 0.55, color: ['#ffffff', col], life: 22, alpha: 0.7, y: 0.45, spreadT: 3 }); BL.sparks(cc, { n: 10, mesh: 'sparkle', color: ['#ffffff', col], size: 0.1, speed: 0.05, plife: 16 }); };
  // flash / tint for this frame
  const look = (c, v) => {
    const t = v.t + v.ph;
    let tint = null, add = null;
    if (has(c, 'petrify')) return { tint: [0.36, 0.36, 0.37, 1], add: [0.3, 0.3, 0.3] };
    if (has(c, 'stop')) { tint = [0.72, 0.78, 1, 1]; add = [0.02, 0.04, 0.14]; }
    if (has(c, 'sadness')) tint = mul4(tint, [0.86, 0.9, 1.0, 1]);
    const f = FLASH.find(q => has(c, q[0]));
    if (f && v.fl !== f[0]) { v.fl = f[0]; v.flT0 = v.t; }                  // first pulse right when the status lands
    if (f) {
      const ph = (v.t - v.flT0) % 72, k = ph < 26 ? sin(ph / 26 * PI) : 0;
      if (k > 0) {
        if (f[1] === 'poison') { const g = Math.min(1, ph / 13); add = add3(add, [lerp(0.34, 0.1, g) * k, lerp(0.06, 0.5, g) * k, lerp(0.42, 0.14, g) * k]); }       // purple -> green
        else if (f[1]) add = add3(add, f[1].map(x => x * k));
        else tint = mul4(tint, [1 - 0.8 * k, 1 - 0.8 * k, 1 - 0.8 * k, 1]);
      }
    }
    if (has(c, 'haste')) add = add3(add, [0.05, 0.1, 0.17].map(x => x * (0.5 + 0.5 * sin(t * 0.25))));
    else if (has(c, 'slow')) add = add3(add, [0.1, 0.04, 0.15].map(x => x * (0.5 + 0.5 * sin(t * 0.08))));
    if (has(c, 'fury')) add = add3(add, [0.09, 0.02, 0].map(x => x * (0.5 + 0.5 * sin(t * 0.1))));
    if (v.aura) add = add3(add, [0.3 * v.aura, 0.22 * v.aura, 0.05 * v.aura]);
    return tint || add ? { tint: tint ? (tint.length === 4 ? tint : tint.concat([1])) : null, add } : null;
  };
  // per frame, before the model updates: frog / mini model changes, kneeling, animation speed
  FX.statusTick = function (b, c) {
    const v = vis(c); v.t++;
    const live = !c.dead && !c.hidden;
    // Frog: swap in the frog model; restore the real one when the status goes (Esuna, KO, battle end)
    const frog = live && has(c, 'frog');
    if (v.frog && c.model !== v.frog.model) v.frog = null;                  // replaced elsewhere (Vincent's transformations)
    if (frog && !v.frog && c.model) {
      const fm = FX.buildFrog(); fm.scale = c.isParty ? 1.7 : 2.0; fm.alpha = c.model.alpha;
      v.frog = { real: c.model, model: fm }; c.model = fm; fm.play(fm.anims.battle, { loop: true }); poof(c, '#90e070');
    } else if (!frog && v.frog) {
      const real = v.frog.real; v.frog = null; c.model = real;
      if (c.dead) real.play((real.anims && real.anims.dead) || 'dead', { loop: false, restart: true });
      else real.play((real.anims && real.anims.battle) || 'battle', { loop: true, restart: true });
      if (live) poof(c, '#90e070');
    }
    // Small: scale to 0.5 (eased); the original scale comes back when it is removed
    const small = live && (has(c, 'small') || has(c, 'mini'));
    if (v.mini && v.mini.model !== c.model) { v.mini.model.scale = v.mini.base; v.mini = small && c.model ? { model: c.model, base: c.model.scale || 1, k: v.mini.k } : null; }
    if (small && !v.mini && c.model) { v.mini = { model: c.model, base: c.model.scale || 1, k: 1 }; poof(c, '#a0ffff'); }
    if (v.mini) {
      v.mini.k += ((small ? 0.5 : 1) - v.mini.k) * 0.2;
      if (!small && Math.abs(1 - v.mini.k) < 0.01) { v.mini.model.scale = v.mini.base; v.mini = null; }
      else v.mini.model.scale = v.mini.base * v.mini.k;
    }
    // kneel (party): the idle clip swaps to the "weak" pose while a kneeling status is on
    const m = c.model;
    if (m && c.isParty && m.anims && m.anims.weak && !c.acting && live && !v.frog) {
      const want = KNEEL.some(s => has(c, s)) || c.hp < c.maxHp / 4;
      if (want && m.clipName === m.anims.battle) m.play(m.anims.weak, { loop: true });
      else if (!want && m.clipName === m.anims.weak && b.phase === 'fight') m.play(m.anims.battle, { loop: true });
    }
    // animation speed
    let k = 1;
    if (live) { if (FROZEN.some(s => has(c, s))) k = 0; else if (!c.acting && has(c, 'haste')) k = 2; else if (!c.acting && has(c, 'slow')) k = 0.5; }
    // Confusion: the character keeps spinning in place (drawn as an offset to its facing)
    if (live && has(c, 'confusion') && !c.acting && k > 0) v.spin += 0.11 * k;
    else if (v.spin) { const tg = Math.round(v.spin / (PI * 2)) * PI * 2; v.spin += (tg - v.spin) * 0.3; if (Math.abs(tg - v.spin) < 0.02) v.spin = 0; }
    v.look = live || v.aura ? look(c, v) : null;
    const shKey = SHIMMER.filter(q => has(c, q[0])).map(q => q[0]).join();
    if (v.sh !== shKey) { v.sh = shKey; v.shT0 = v.t; }                      // first shell shimmer as the barrier goes up
    return k;
  };
  // per frame, after the model updated: head nod while asleep, drooping head with Sadness
  FX.statusPose = function (b, c) {
    const v = c.vis, m = c.model; if (!v || !m || !m.bones || c.dead || c.hidden || v.frog) return;
    const hd = m.bones.head; if (!hd) return;
    if (has(c, 'sleep')) {
      const ph = ((v.t + v.ph) % 110) / 110, nod = ph < 0.8 ? (0.5 - 0.5 * cos(PI * ph / 0.8)) * 0.45 : (1 - (ph - 0.8) / 0.2) * 0.45;
      hd.rot[0] += nod * (c.isParty ? 1 : 0.6);
      if (m.bones.torso) m.bones.torso.rot[0] += nod * 0.15;
    } else if (has(c, 'sadness')) hd.rot[0] += 0.2;
  };
  // draw options for BattleScene.render (tint / add combined with the model's own)
  FX.statusOpts = function (c, m) {
    const L = c.vis && c.vis.look; if (!L) return undefined;
    const o = {};
    if (L.tint) o.tint = m.tint ? mul4(m.tint, L.tint) : L.tint.slice();
    if (L.add) o.add = m.add ? add3(m.add, L.add) : L.add;
    return o;
  };
  // a status was added / removed by an action (BattleScene.statusFx)
  FX.statusApplied = function (b, t, res) {
    if (!need() || !t || !t.pos) return;
    const h = modelH(t), cc = { p: [t.pos[0], h * 0.55, t.pos[2]], g: [t.pos[0], 0, t.pos[2]], h: Math.max(0.9, h), w: Math.max(0.8, h * 0.6), i: 0 };
    if (res.add.includes('petrify')) BL.cloud(cc, { n: 6, r: 0.4, size: 0.6, color: ['#a0a0a0', '#808080'], life: 28, alpha: 0.6 });
    else if (res.remove.length && !res.add.length) BL.sparks(cc, { mode: 'rise', mesh: 'sparkle', n: 8, color: ['#ffffff', '#c0ffe0'], size: 0.1, speed: 0.04, r: 0.4, plife: 22 });
  };
  const drawZs = (cam, top, t, H, alpha = 1) => {
    const B = cam._basis, hs = clamp(H / 1.7, 0.7, 1.8);
    for (let i = 0; i < 3; i++) {
      const k = ((t + i * 22) % 66) / 66, s = (0.12 + 0.16 * k) * hs;
      const p = V.add(top, V.add(V.scale(B.r, (0.12 + 0.3 * k + 0.05 * sin(k * 9)) * hs), [0, (0.05 + 0.55 * k) * hs, 0]));
      X.draw(X.M.zGlyph(), X.bill(cam, p, s, s, 0.18), { blend: 'alpha', alpha: sin(k * PI) * alpha, noDepth: true });
    }
  };
  const statusDraw3d = (b, cam) => {
    const B = cam._basis;
    for (const c of b.party.concat(b.enemies)) {
      const v = c.vis, m = c.model; if (!v || !m || c.hidden || c.dead || !m.visible || c.dying) continue;
      const H = modelH(c), hs = clamp(H / 1.7, 0.6, 2), top = [c.pos[0], (c.lift || 0) + H * 1.02, c.pos[2]], t = v.t + v.ph;
      if (has(c, 'sleep')) drawZs(cam, top, t, H);
      if (has(c, 'silence')) { const s = 0.42 * hs, p = V.add(top, V.add(V.scale(B.r, 0.28 * hs), [0, 0.22 * hs + 0.03 * sin(t * 0.1), 0])); X.draw(X.M.speech(), X.bill(cam, p, s, s, 0), { blend: 'alpha', noDepth: true }); }
      if (has(c, 'poison')) for (let i = 0; i < 4; i++) {
        const k = ((t + i * 13) % 52) / 52, a = i * 2.1 + t * 0.01, p = [c.pos[0] + cos(a) * 0.22 * hs, H * (0.35 + 0.75 * k), c.pos[2] + sin(a) * 0.22 * hs];
        X.draw(X.M.quad(), X.bill(cam, p, (0.1 + 0.06 * k) * hs, (0.1 + 0.06 * k) * hs), { tex: X.ptex('bubble'), color: i & 1 ? '#c080ff' : '#90ff70', alpha: sin(k * PI) * 0.9 });
      }
      if (has(c, 'fury')) { const k = ((t % 90) / 24); if (k < 1) for (let i = 0; i < 2; i++) { const p = V.add(top, [(i ? 0.12 : -0.1) * hs, k * 0.35 * hs, 0]); X.draw(X.M.quad(), X.bill(cam, p, (0.18 + k * 0.2) * hs, (0.18 + k * 0.2) * hs, i), { tex: X.ptex('puff'), color: '#ff7040', alpha: sin(k * PI) * 0.4 }); } }
      const sh = SHIMMER.filter(q => has(c, q[0]));
      if (sh.length) {
        const st = v.t - v.shT0, ph = st % 150;
        if (ph < 30) {
          const k = sin(ph / 30 * PI), q = sh[Math.floor(st / 150) % sh.length];
          const sm = X.trs([c.pos[0], H * 0.55, c.pos[2]], [0, t * 0.03, 0], [H * 0.42, H * 0.6, H * 0.42]);
          X.draw(X.M.sphere(), sm, { color: q[1], alpha: 0.12 * k, blend: 'alpha' });
          X.draw(X.M.sphere(), sm, { tex: X.ptex('swirl'), color: q[1], alpha: 0.45 * k });
        }
      }
    }
  };
  // 2D: Death Sentence / Slow-numb countdown over the head
  const statusRender2d = (c, b) => {
    for (const cb of b.party.concat(b.enemies)) {
      if (!cb.timers || cb.hidden || cb.dead) continue;
      const tm = cb.timers.death_sentence || cb.timers.slow_numb; if (!tm) continue;
      const p = proj([cb.pos[0], (cb.lift || 0) + modelH(cb) * 1.08 + 0.25, cb.pos[2]]); if (!p.visible) continue;
      c.font = `bold 18px ${R.FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = '#08080c'; c.strokeText(String(Math.max(0, tm.units)), p.x, p.y);
      c.fillStyle = cb.timers.death_sentence ? '#ffffff' : '#c0c8d0'; c.fillText(String(Math.max(0, tm.units)), p.x, p.y);
    }
  };

  // ---------------------------------------------------------------- frog model (Frog / Toad status)
  // A small low-poly green frog sitting up (FF7's battle frog), ~0.36 units tall at scale 1, faces +z.
  FX.buildFrog = function () {
    const MB = FF7.MeshBuilder, m = new FF7.Model();
    const G = '#5aa83a', D = '#3e7e26', Y = '#e6e4a0', E = '#f4f4ea', K = '#101010';
    const mesh = (fn) => { const mb = new MB(); fn(mb); return mb.build(); };
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0.11, 0]);
    m.bone('head', 'body', [0, 0.1, 0.03]);
    m.bone('legBL', 'body', [0.1, -0.03, -0.04]); m.bone('legBR', 'body', [-0.1, -0.03, -0.04]);
    m.bone('armL', 'body', [0.075, 0.02, 0.08]); m.bone('armR', 'body', [-0.075, 0.02, 0.08]);
    m.attach('body', mesh(mb => { mb.sphere(0, 0.02, 0, 0.12, 0.13, 0.11, G, 8, 6); mb.sphere(0, 0.0, 0.05, 0.085, 0.1, 0.07, Y, 8, 6); }));
    m.attach('head', mesh(mb => {
      mb.sphere(0, 0.04, 0.02, 0.13, 0.075, 0.11, G, 10, 6);
      mb.sphere(0, 0.015, 0.05, 0.11, 0.045, 0.085, Y, 10, 5);
      for (const s of [-1, 1]) { mb.sphere(s * 0.065, 0.1, 0.05, 0.042, 0.042, 0.042, G, 8, 6); mb.sphere(s * 0.068, 0.108, 0.078, 0.03, 0.03, 0.022, E, 8, 6); mb.sphere(s * 0.07, 0.11, 0.098, 0.014, 0.016, 0.008, K, 6, 4); }
      mb.box(0, 0.028, 0.128, 0.13, 0.006, 0.004, D);
    }));
    for (const s of [-1, 1]) {
      const legB = s > 0 ? 'legBL' : 'legBR', arm = s > 0 ? 'armL' : 'armR';
      m.attach(legB, mesh(mb => { mb.sphere(0, 0, 0, 0.05, 0.075, 0.1, G, 8, 6); mb.sphere(s * 0.02, -0.07, 0.07, 0.03, 0.02, 0.07, D, 6, 4); mb.box(s * 0.025, -0.085, 0.13, 0.07, 0.01, 0.05, D); }));
      m.attach(arm, mesh(mb => { mb.push(); mb.rotate(0.3, 0, s * 0.15); mb.limb(0.035, 0.035, 0.025, 0.025, 0.12, G); mb.pop(); mb.box(s * 0.01, -0.125, 0.045, 0.045, 0.01, 0.04, D); }));
    }
    m.height = 0.36;
    const Sn = Math.sin;
    m.clips = {
      frog_idle: { dur: 70, fn(mm, p) { const s = Sn(p * PI * 2); mm.b('body').scl[0] = 1 + s * 0.03; mm.b('body').scl[2] = 1 + s * 0.03; mm.b('head').rot[0] = -0.05 + s * 0.03; } },
      frog_hop: { dur: 20, fn(mm, p) { const k = Math.abs(Sn(p * PI)); mm.b('root').pos[1] = k * 0.09; mm.b('legBL').rot[0] = -k * 0.8; mm.b('legBR').rot[0] = -k * 0.8; mm.b('body').rot[0] = -k * 0.25; } },
      frog_attack: { dur: 22, loop: false, fn(mm, p) { const k = Sn(Math.min(1, p) * PI); mm.b('root').pos[2] = k * 0.22; mm.b('root').pos[1] = k * 0.08; mm.b('head').rot[0] = -k * 0.4; mm.b('armL').rot[0] = -k * 1.4; mm.b('armR').rot[0] = -k * 1.4; } },
      frog_cast: { dur: 36, loop: false, fn(mm, p) { const k = Sn(Math.min(1, p) * PI); mm.b('armL').rot[0] = -k * 2.4; mm.b('armR').rot[0] = -k * 2.4; mm.b('head').rot[0] = -k * 0.3; } },
      frog_hurt: { dur: 16, loop: false, fn(mm, p) { const k = Sn(Math.min(1, p) * PI); mm.b('body').scl[1] = 1 - k * 0.25; mm.b('root').pos[2] = -k * 0.06; } },
      frog_dead: { dur: 24, loop: false, fn(mm, p) { const k = Math.min(1, p); mm.b('root').rot[2] = k * 2.6; mm.b('root').pos[1] = Sn(k * PI) * 0.1 + k * 0.08; } },
    };
    m.anims = { idle: 'frog_idle', battle: 'frog_idle', weak: 'frog_idle', defend: 'frog_idle', run: 'frog_hop', walk: 'frog_hop', jump: 'frog_hop', victory: 'frog_hop', attack: 'frog_attack', punch: 'frog_attack', kick: 'frog_attack', slash: 'frog_attack', shoot: 'frog_attack', thrust: 'frog_attack', cast: 'frog_cast', item: 'frog_cast', hurt: 'frog_hurt', dead: 'frog_dead' };
    m.showWeapon = () => {};
    m.isFrog = true;
    return m;
  };
})();

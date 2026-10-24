// Cinematic summon sequences: shot-by-shot recreations of FF7's in-battle summon animations
// (camera moves, the summon model's keyframed pose, environment effects, flashes), timed against
// the original captures (references/cutscenes/ff7movie_summons*.wmv).
//
//   FF7.battle.summonSequences[id] = function* (battle, caster, ab, targets, hooks)
//     yields frame counts (60 fps; battle-speed independent - the ATB is frozen during summons).
//     hooks.stage  : the Stage (camera, actors, effects, environment - see class Stage)
//     hooks.impact(i): apply hit i (damage numbers appear in sync). One call per hit (KotR: 0..12).
//     hooks.variant: 'normal' | 'fat' (Fat-Chocobo) | 'steel' / 'gunge' (Odin)
//   FF7.battle.summonSeq.run(b, act, ab) drives a sequence from actions.doAbility (see the marked
//   hook there). It applies any hit the sequence didn't, never runs past a hard frame cap, and
//   lets the player skip: hold Start (P) or press OK after 1 s (FF7.state.config.skipSummons
//   = false disables skipping).
(function () {
  const U = FF7.util, B = FF7.battle, V = FF7.V3;
  const X = FF7.fxs;
  const SEQ = B.summonSequences = B.summonSequences || {};
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, lerp = U.lerp, clamp = U.clamp;
  const E = X.ease;
  const L3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const A3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const EMPTY = { count: 0 };
  const easeOf = (e) => (typeof e === 'function' ? e : E[e] || E.lin);

  // ================================================================== Stage
  // Lives in battle.summonModel while a sequence runs: battle.update() calls stage.update(),
  // battle.render() calls stage.draw() inside its 3D pass (after the arena and the combatants).
  class Stage {
    constructor(b, caster, ab, targets) {
      this.b = b; this.caster = caster; this.ab = ab; this.targets = targets;
      this.t = 0; this.tracks = []; this.actors = []; this.fx = []; this.overlays = []; this.env = [];
      this.cam = { eye: b.cam.eye.slice(), target: b.cam.target.slice(), fov: b.cam.fov || 40 };
      this.shk = { mag: 0, n: 0, f: 0 };
      this.sky = null; this.arena0 = b.arena; this.baseArena = null;
      this.enemyMode = 'battle'; this.enemyOff = [0, 0, 0]; this.enemyOpts = null;
      this.vis = new Map(); this.tints = new Map();
      this.skipReq = false; this.failed = false; this.errs = 0;
      const ts = targets.filter(t => t.model);
      const pts = ts.length ? ts.map(t => t.pos) : [[-1, 0, -2]];
      this.E = [pts.reduce((s, p) => s + p[0], 0) / pts.length, 0, pts.reduce((s, p) => s + p[2], 0) / pts.length];
      this.Ew = Math.max(1.2, ...pts.map(p => Math.abs(p[0] - this.E[0]) + 0.8), ...pts.map(p => Math.abs(p[2] - this.E[2]) + 0.8));
      this.C = caster.pos.slice();
      const ps = b.party.filter(p => !p.hidden);
      this.P = ps.length ? [ps.reduce((s, p) => s + p.pos[0], 0) / ps.length, 0, ps.reduce((s, p) => s + p.pos[2], 0) / ps.length] : [1.2, 0, 3.2];
    }

    // ---------------------------------------------------------------- per-frame
    update() {
      if (this.disposed) return;
      try {
        this.pollSkip();
        if (this.b.paused) return;
        this.t++;
        for (const tr of this.tracks.slice()) {
          tr.f++;
          const k = Math.min(1, tr.f / tr.n);
          tr.fn(tr.ease(k), tr, k);
          if (tr.f >= tr.n && !tr.loop) this.untrack(tr);
        }
        for (const h of this.actors) if (h.m && h.animate !== false) h.m.update(h.speed == null ? 1 : h.speed);
        this.fx = this.fx.filter(e => { e.age = (e.age || 0) + 1; const r = e.update ? e.update(e, this) : true; return r !== false && !(e.life && e.age >= e.life); });
        this.overlays = this.overlays.filter(o => { o.age++; return !(o.life && o.age >= o.life); });
        if (this.shk.n > 0) this.shk.n--;
        this.applyCam();
      } catch (e) { this.fail(e); }
    }
    fail(e) { if (this.errs++ < 3) console.error('[summon_seq] stage error', e); this.failed = true; this.skipReq = true; }
    // skip: hold Start (P) ~0.2 s at any time, or press OK once the summon has run for 1 s
    pollSkip() {
      if (this.skipReq || this.noSkip) return;
      const cfg = FF7.state && FF7.state.config;
      if (cfg && cfg.skipSummons === false) return;
      const I = FF7.input; if (!I) return;
      if (I.held('start') && (I.frames ? I.frames('start') : 0) >= 12) { this.skipReq = true; this.b.paused = false; return; }
      if (this.t > 60 && !this.b.paused && I.pressed('ok') && !(this.b.menu && this.b.menu.open)) this.skipReq = true;
    }
    applyCam() {
      const c = this.cam, b = this.b;
      let eye = c.eye, tgt = c.target;
      // keep the camera inside the ring of arena props (trees, pipes...): slide it toward its target
      const R = b.arena === this.baseArena ? 11.2 * (this.baseArena.widened || 1) / 1.6 : b.arena === this.arena0 ? 7.2 : 0;
      if (R && Math.hypot(eye[0], eye[2]) > R) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2, q = L3(eye, tgt, m); if (Math.hypot(q[0], q[2]) > R) lo = m; else hi = m; }
        eye = L3(eye, tgt, hi);
      }
      if (this.shk.n > 0) {
        const m = this.shk.mag * Math.min(1, this.shk.n / 10) * 0.04, j = () => (Math.random() * 2 - 1) * m;
        eye = [eye[0] + j(), eye[1] + j(), eye[2] + j()]; tgt = [tgt[0] + j(), tgt[1] + j(), tgt[2] + j()];
      }
      b.camGoal = null;
      b.cam = { eye: eye.slice(), target: tgt.slice(), fov: c.fov };
    }
    draw() {
      if (this.disposed) return;
      try {
        const cam = { eye: this.b.cam.eye, target: this.b.cam.target, fov: this.b.cam.fov };
        cam._basis = X.basis(cam);
        this.camNow = cam;
        if (this.sky) this.sky.draw ? this.sky.draw(cam, this) : X.draw(this.sky.mesh, X.trs(this.sky.follow === false ? (this.sky.pos || [0, 0, 0]) : cam.eye, this.sky.rot || [0, 0, 0], this.sky.scale || 150), { blend: 'alpha', color: this.sky.color || '#ffffff' });
        // ambient dim: darkens the arena + combatants drawn so far, not the summon drawn after
        if (this.dim && this.dim.a > 0.003) X.overlay(cam, this.dim.color, this.dim.a);
        for (const g of this.env) { if (g.draw) g.draw(cam, g, this); else X.draw(g.mesh, g.mat, g.opts); }
        if (this.enemyMode === 'stage') this.drawEnemies();
        for (const h of this.actors) this.drawActor(h);
        for (const e of this.fx) if (e.draw && !e.late) e.draw(cam, e, this);
        for (const e of this.fx) if (e.draw && e.late) e.draw(cam, e, this);
        for (const o of this.overlays) { const a = o.alphaFn ? o.alphaFn(o) : o.alpha; X.overlay(cam, o.color, a, o.blend || 'alpha'); }
      } catch (e) { this.fail(e); }
    }
    drawActor(h) {
      if (!h.m || h.visible === false || h.alpha <= 0.003) return;
      const m = h.m;
      m.position = h.pos; m.rotX = h.rot[0]; m.rotY = h.rot[1]; m.rotZ = h.rot[2]; m.scale = h.scale;
      m.alpha = h.alpha; m.tint = h.tint || null; m.add = h.add || null; m.visible = true;
      m.draw(h.drawOpts || {});
      if (h.after) h.after(h, this);
    }
    drawEnemies() {
      const off = this.enemyOff;
      for (const e of this.b.enemies) {
        const m = e.model; if (!m || (e.hidden && !e.dying) || this.vis.get(m) === false) continue;
        m.position = [e.pos[0] + off[0], off[1], e.pos[2] + off[2]]; m.rotY = e.facing;
        const v = m.visible; m.visible = true; m.draw(this.enemyOpts || {}); m.visible = v;
      }
    }

    // ---------------------------------------------------------------- timeline helpers
    // track(n, fn(k, tr, raw), ease): runs fn every frame for n frames (fn(0) runs immediately)
    track(n, fn, ease) { const tr = { f: 0, n: Math.max(1, Math.round(n)), fn, ease: easeOf(ease) }; this.tracks.push(tr); fn(tr.ease(0), tr, 0); return tr; }
    loop(fn) { const tr = { f: 0, n: 1e9, fn: (k, t) => fn(t.f, t), ease: E.lin, loop: true }; this.tracks.push(tr); fn(0, tr); return tr; }
    untrack(tr) { const i = this.tracks.indexOf(tr); if (i >= 0) this.tracks.splice(i, 1); }
    after(n, fn) { return this.track(n, (k, tr, raw) => { if (raw >= 1 && !tr.fired) { tr.fired = true; fn(); } }); }

    // ---------------------------------------------------------------- camera
    setCam(eye, target, fov) { this.untrack(this.camTr); this.camTr = null; this.cam = { eye: eye.slice(), target: target.slice(), fov: fov || this.cam.fov }; this.applyCam(); }
    // camera path: fn(k) -> { eye, target, fov }
    camPath(n, fn, ease = 'sine') {
      this.untrack(this.camTr);
      this.camTr = this.track(n, (k) => { const c = fn(k); this.cam = { eye: c.eye.slice(), target: c.target.slice(), fov: c.fov || this.cam.fov }; }, ease);
      this.applyCam();
      return this.camTr;
    }
    // straight move from (eye0,tgt0) to (eye1,tgt1)
    camMove(n, eye0, tgt0, eye1, tgt1, fov0, fov1, ease = 'sine') {
      const f0 = fov0 || this.cam.fov, f1 = fov1 || f0;
      return this.camPath(n, (k) => ({ eye: L3(eye0, eye1, k), target: L3(tgt0, tgt1, k), fov: lerp(f0, f1, k) }), ease);
    }
    // orbit around c: angle a0->a1 (0 = on +z side), radius r0->r1, height h0->h1
    camOrbit(n, c, a0, a1, r0, r1, h0, h1, fov, tgtY = 0, ease = 'sine') {
      return this.camPath(n, (k) => { const a = lerp(a0, a1, k), r = lerp(r0, r1, k); return { eye: [c[0] + sin(a) * r, c[1] + lerp(h0, h1, k), c[2] + cos(a) * r], target: [c[0], c[1] + tgtY, c[2]], fov }; }, ease);
    }
    shake(mag = 6, n = 20) { this.shk.mag = mag; this.shk.n = n; }

    // ---------------------------------------------------------------- actors (summon models)
    // actor(model, { pos, rot, scale, alpha, tint, add, clip, pose(m, t, h) }) - pose() runs after the clip
    actor(model, o = {}) {
      if (!model) return { pos: [0, 0, 0], rot: [0, 0, 0], scale: 1, alpha: 1, dummy: true };
      const h = Object.assign({ m: model, pos: [0, 0, 0], rot: [0, 0, 0], scale: 1, alpha: 1, visible: true, t0: this.t }, o);
      h.pos = (o.pos || [0, 0, 0]).slice(); h.rot = (o.rot || [0, 0, 0]).slice();
      if (!model._seqWrapped) { model._seqPrevPose = model.onPose; model._seqWrapped = true; }
      const prev = model._seqPrevPose;
      model.onPose = (mm) => { if (prev) prev(mm); if (h.pose) h.pose(mm, this.t - h.t0, h); };
      if (o.clip) model.play(o.clip, { loop: o.loop !== false, restart: true, speed: o.clipSpeed });
      else { model.clip = null; model.clipName = null; }
      model.update(0);
      this.actors.push(h);
      return h;
    }
    drop(h) { const i = this.actors.indexOf(h); if (i >= 0) this.actors.splice(i, 1); }
    // world position of a MODEL-SPACE point (as authored in summon_models.js) carried by `bone`
    bp(h, bone, p) {
      const m = h && h.m; if (!m) return (h && h.pos) ? h.pos.slice() : [0, 0, 0];
      m.position = h.pos; m.rotX = h.rot[0]; m.rotY = h.rot[1]; m.rotZ = h.rot[2]; m.scale = h.scale;
      m.computeWorld();
      let b = m.bones[bone], q = [0, 0, 0];
      if (!b) return h.pos.slice();
      for (let c = b; c; c = c.parent) q = V.add(q, c.offset);
      return m.worldPoint(bone, V.sub(p, q));
    }
    // move an actor handle's pos from a to b over n frames
    moveActor(h, n, a, b, ease = 'sine') { return this.track(n, (k) => { h.pos = L3(a, b, k); }, ease); }

    // ---------------------------------------------------------------- effects
    // add({ life, update(e, S) -> false to end, draw(cam, e, S), late }) or an FF7.fxs.Particles
    add(e) {
      if (e instanceof X.Particles) { const ps = e; e = { ps, late: ps.o.late !== false, update: () => ps.update(), draw: (cam) => ps.draw(cam) }; }
      e.age = 0; this.fx.push(e); return e;
    }
    // timed effect: draw(cam, k 0..1, age, e)
    fxT(life, draw, late = true) { return this.add({ life, late, draw: (cam, e) => draw(cam, e.age / life, e.age, e) }); }
    remove(e) { const i = this.fx.indexOf(e); if (i >= 0) this.fx.splice(i, 1); }
    clearFx() { this.fx = []; }
    // screen overlays (3D view only; the HUD stays visible like in FF7)
    flash(color = '#ffffff', n = 14, a = 1) { const o = { color, age: 0, life: n, alphaFn: (q) => a * (1 - q.age / n) }; this.overlays.push(o); return o; }
    fade(color, a0, a1, n, hold = true) { const o = { color, age: 0, life: hold ? 0 : n, alphaFn: (q) => lerp(a0, a1, Math.min(1, q.age / Math.max(1, n))) }; this.overlays.push(o); return o; }
    unfade(o, n = 10) { if (!o) return; const a0 = o.alphaFn(o); o.age = 0; o.life = n; o.alphaFn = (q) => a0 * (1 - q.age / n); }
    clearOverlays() { this.overlays = []; }
    // dim the battle scene (not the summon/effects) to `a` over n frames
    dimTo(color, a, n = 30) { const d0 = this.dim ? this.dim.a : 0; this.dim = { color, a: d0 }; return this.track(n, (k) => { this.dim.a = lerp(d0, a, k); }, 'sine'); }
    clearAll() { this.fx = []; this.overlays = []; this.tracks = []; this.camTr = null; this.actors = []; this.env = []; this.sky = null; this.shk.n = 0; this.dim = null; }

    // ---------------------------------------------------------------- environment
    // envOn({ fill, sky: mesh|{draw}, skyScale }) replaces the battle arena with a blank one (the 2D
    // backdrop colour `fill`) - sequences then draw their own sky / ground through stage.sky/env
    envOn(o = {}) {
      const fill = o.fill || '#000000';
      this.b.arena = { mesh: EMPTY, backdrop: EMPTY, glow: null, sky: [fill, fill], fog: null, summonEnv: true };
      this.sky = o.sky ? (o.sky.mesh || o.sky.draw ? o.sky : { mesh: o.sky, scale: o.skyScale || 150 }) : null;
      this.env = [];
    }
    envOff() { this.b.arena = this.baseArena || this.arena0; this.sky = null; this.env = []; }
    restoreArena() { this.baseArena = null; this.b.arena = this.arena0; this.sky = null; this.env = []; }
    // the same arena without its props (ground disc + backdrop only) - for long tracking shots
    propless() { const ar = this.arena0; this.b.arena = Object.assign({}, ar, { mesh: groundOnly(this.b.bgId), glow: null, summonEnv: true }); }
    // the arena scaled up k times about its centre: the ring of props (trees, pipes, pillars...) moves out
    // so the summon's wide camera moves and 6-10 m tall summons fit inside it, like FF7's larger sets
    widen(k = 1.6) { this.baseArena = widened(this.arena0, this.b.bgId, k); this.b.arena = this.baseArena; }
    arena() { return this.arena0; }
    hideModel(m) { if (!m) return; if (!this.vis.has(m)) this.vis.set(m, m.visible); m.visible = false; }
    showModel(m) { if (!m) return; if (this.vis.has(m)) { m.visible = this.vis.get(m); this.vis.delete(m); } }
    party(show) { for (const p of this.b.party) show ? this.showModel(p.model) : this.hideModel(p.model); }
    // 'battle': drawn by the battle renderer (with shadows) | 'stage': drawn here (offset, no shadow) | 'hide'
    enemies(mode = 'battle', off, opts) {
      this.enemyMode = mode; this.enemyOff = off || [0, 0, 0]; this.enemyOpts = opts || null;
      for (const e of this.b.enemies) if (e.model) { if (mode === 'battle') this.showModel(e.model); else this.hideModel(e.model); }
    }
    tintEnemies(t) { for (const e of this.b.enemies) { const m = e.model; if (!m) continue; if (!this.tints.has(m)) this.tints.set(m, m.tint); m.tint = t ? t.slice() : this.tints.get(m); } }
    restoreModels() {
      for (const [m, v] of this.vis) m.visible = v; this.vis.clear();
      for (const [m, t] of this.tints) m.tint = t; this.tints.clear();
      for (const e of this.b.enemies) if (e.model && e.hidden && !e.dying) e.model.visible = false;
    }

    // ---------------------------------------------------------------- positions
    // hit positions of the living targets
    hitPts() { const ts = this.targets.filter(t => t.targetable || t.dying); return (ts.length ? ts : this.targets).map(t => this.b.hitPos(t)); }
    foot(t) { return [t.pos[0], 0, t.pos[2]]; }
    // FF7's "damage view": from the party side, framing the enemy group
    resultCam(h = 3.4, back = 7.5) { const E0 = this.E; return { eye: [E0[0] + 2.8, h, E0[2] + back], target: [E0[0], 1.0, E0[2]], fov: 42 }; }
    showResult(n = 60) { const c = this.resultCam(); this.camMove(n, c.eye, c.target, A3(c.eye, [-0.6, -0.2, -0.5]), c.target, c.fov, c.fov, 'lin'); }
    sfx(id, v = 1) { try { FF7.audio.sfx(id, v); } catch (e) { } }
    banner(text) { const b = this.b; const bn = { text, t: 9999, persist: true }; b.banners.push(bn); b.currentBanner = bn; this.bn = bn; }
    clearBanner() { if (this.bn) { this.bn.t = 0; if (this.b.currentBanner === this.bn) this.b.currentBanner = null; this.bn = null; } }

    // ---------------------------------------------------------------- the caster's part
    // FF7: attack-name banner, close-up of the caster raising the arms inside a curtain of green
    // light with glowing summon-materia runes orbiting, then the caster dissolves (red ghost).
    *cast(n = 150) {
      const b = this.b, a = this.caster, p = a.pos;
      this.banner(this.bannerText || this.ab.attackName || this.ab.name);
      b.playAnim(a, 'cast');
      this.sfx('summon');
      const tgt = [p[0], 1.05, p[2]];
      this.camMove(n + 28, [p[0] + 1.25, 0.95, p[2] - 3.7], tgt, [p[0] + 0.75, 1.05, p[2] - 3.05], tgt, 42, 40, 'sine');
      const fx = this.add(castFx(a));
      yield n;
      yield* this.ghost(a, 1, 0, 28);
      this.remove(fx);
      this.clearBanner();
      this.party(false);
      this.widen();
    }
    // caster dissolve / reappear (translucent, tinted red like the PS1 cross-fade)
    *ghost(c, a0, a1, n) {
      const m = c.model; if (!m) { yield n; return; }
      for (let i = 1; i <= n; i++) { const k = i / n, al = lerp(a0, a1, k); m.alpha = Math.max(0.01, al); m.tint = [1, lerp(0.35, 1, al), lerp(0.35, 1, al), 1]; yield 1; }
      m.alpha = a1 <= 0 ? 0.001 : a1; m.tint = a1 >= 1 ? null : m.tint;
      if (a1 <= 0) { this.hideModel(m); m.alpha = 1; m.tint = null; }
    }
    // back to the battle: damage view already shown by the sequence; the caster fades back in close-up
    *outro() {
      if (this.outroDone) return;
      this.outroDone = true;
      const b = this.b, a = this.caster, p = a.pos;
      this.clearAll(); this.restoreArena(); this.enemies('battle'); this.restoreModels(); this.tintEnemies(null);
      for (const q of b.party) if (q !== a && q.model) q.model.alpha = 1;
      this.setCam([p[0] - 1.6, 1.25, p[2] - 3.1], [p[0], 1.0, p[2]], 40);
      this.camMove(40, [p[0] - 1.6, 1.25, p[2] - 3.1], [p[0], 1.0, p[2]], [p[0] - 1.2, 1.2, p[2] - 2.7], [p[0], 1.05, p[2]], 40, 40);
      if (a.model) { a.model.visible = true; b.idle(a); }
      yield* this.ghost(a, 0, 1, 24);
      if (a.model) { a.model.alpha = 1; a.model.tint = null; }
      yield 14;
    }
    dispose() {
      if (this.disposed) return;
      this.clearAll(); this.restoreArena(); this.enemies('battle'); this.restoreModels(); this.clearBanner();
      for (const q of this.b.party) if (q.model) { q.model.alpha = 1; q.model.tint = null; }
      if (this.caster.model) this.caster.model.visible = !(this.caster.hidden);
      this.disposed = true;
      if (this.b.summonModel === this) this.b.summonModel = null;
    }
  }
  B.SummonStage = Stage;
  // uniformly scaled copy of an arena's meshes (cached per arena id)
  const WIDE = {};
  const scaledMesh = (m, k) => { if (!m || !m.count) return m; const o = Object.assign({}, m, { pos: new Float32Array(m.pos), gl: null }); for (let i = 0; i < o.pos.length; i++) o.pos[i] *= k; return o; };
  function widened(ar, id, k) {
    const key = (id || '?') + '@' + k;
    if (WIDE[key] && WIDE[key].src === ar) return WIDE[key].out;
    const out = Object.assign({}, ar, { mesh: scaledMesh(ar.mesh, k), backdrop: scaledMesh(ar.backdrop, k), glow: ar.glow ? scaledMesh(ar.glow, k) : null, widened: k });
    if (ar.fog) out.fog = ar.fog;
    WIDE[key] = { src: ar, out };
    return out;
  }
  // the arena's ground disc alone (same seed/colours as FF7.arena.get, whose props come after it)
  const GROUND = {};
  function groundOnly(id) {
    if (FF7.arena && FF7.arena.groundOnly) { try { return FF7.arena.groundOnly(id || 'grass'); } catch (e) { } }   // the arena's own textured floor
    if (GROUND[id]) return GROUND[id];
    const BG = FF7.arena.BG || {}, d = BG[id] || BG.grass || { ground: ['#4a7a30', '#44702c'] };
    const mb = new FF7.MeshBuilder(), Rn = U.rng(U.strSeed(id || 'grass')), rings = 7, seg = 24, rad = 16;
    for (let r = 0; r < rings; r++) {
      const r0 = rad * (r / rings), r1 = rad * ((r + 1) / rings);
      for (let s = 0; s < seg; s++) {
        const a0 = (s / seg) * PI * 2, a1 = ((s + 1) / seg) * PI * 2;
        const c = U.shade(d.ground[(r + s) % 2], (Rn() - 0.5) * 0.1 - r * 0.02);
        const p = (rr, aa) => [cos(aa) * rr, 0, sin(aa) * rr];
        mb.quad(p(r0, a1), p(r1, a1), p(r1, a0), p(r0, a0), c);
      }
    }
    return (GROUND[id] = mb.build());
  }

  // the casting effect: green light curtain + orbiting summon-materia runes
  function castFx(a) {
    const RUNES = [['#ffd830', '#806000'], ['#40ff40', '#005800'], ['#ff2828', '#700000'], ['#ffffff', '#606070'], ['#ff5070', '#700018'], ['#40ff90', '#006030']];
    const orbs = RUNES.map((c, i) => ({ c: c[0], d: c[1], ph: i / RUNES.length * PI * 2 + (i % 2) * 0.4, y: 0.45 + (i % 3) * 0.55, r: 0.95 + (i % 2) * 0.35, sp: 0.045 + (i % 3) * 0.008 }));
    return {
      late: true,
      draw(cam, e) {
        const t = e.age, p = a.pos, k = Math.min(1, t / 16);
        const rot = (Math.floor(t / 3) * 2.3) % (PI * 2);
        X.draw(X.M.streaks(), X.trs([p[0], 0, p[2]], [0, rot, 0], [1.05, 2.5 * k, 1.05]), { color: '#50ff30', alpha: 0.85 * k });
        X.draw(X.M.streaks(), X.trs([p[0], 0, p[2]], [0, rot + 2.1, 0], [0.8, 1.7 * k, 0.8]), { color: '#d8ff40', alpha: 0.7 * k });
        X.draw(X.M.disc(), X.trs([p[0], 0.04, p[2]], [-PI / 2, 0, 0], [1.6, 1.6, 1]), { color: '#b0ff30', alpha: 0.7 * k });
        for (const o of orbs) {
          const ang = o.ph + t * o.sp, q = [p[0] + cos(ang) * o.r, o.y + sin(t * 0.035 + o.ph) * 0.22, p[2] + sin(ang) * o.r];
          const s = k * (0.95 + 0.05 * sin(t * 0.3 + o.ph));
          X.glow(cam, q, 0.5 * s, o.c, 0.9);
          X.glow(cam, q, 0.26 * s, '#ffffff', 0.55);
          X.draw(X.M.glyph(), X.bill(cam, q, 0.19 * s, 0.19 * s), { color: o.d, alpha: 0.9, blend: 'alpha' });
        }
      },
    };
  }

  // ================================================================== hits
  const R = (t, o) => Object.assign({ target: t, miss: false, dmg: 0, heal: false, mp: false, add: [], remove: [] }, o || {});
  function makePlan(b, act, ab, targets) {
    const a = act.actor, C = B.calc;
    const special = ab.special && B.specials && B.specials[ab.special];
    const quadra = act.quadra ? Math.min(8, 3 + (act.quadraN || 1)) : 0;   // (Quadra Magic: 4 casts, one more per extra Quadra Magic, 8 at most)
    const ctx = { multi: targets.length, split: false, quadra: !!quadra, mpTurbo: act.mpTurbo || 0, command: act.type };
    const plan = { hits: quadra || ab.hits || 1, variant: 'normal', banner: ab.attackName || ab.name };
    plan.apply = (i) => {
      let hitT;
      if (quadra) { const pool = targets.filter(t => t.targetable); if (!pool.length) return []; hitT = [U.pick(pool)]; ctx.multi = 1; }
      else hitT = targets.filter(t => t.targetable);
      const out = [];
      for (const t of hitT) {
        const res = special && special.hit ? special.hit(b, a, t, ab, ctx, act) : C.resolve(a, t, ab, ctx);
        if (!res) continue;
        C.apply(a, res, b);
        b.showResult(res, ab);
        if (!res.miss && !res.heal && res.dmg > 0) b.hurt(t);
        b.afterHit(a, t, res, ab, act);
        out.push(res);
      }
      return out;
    };
    if (ab.id === 'choco_mog') {
      if (ab._fat == null) ab._fat = U.rand(256) < 15;             // 15/256: Fat-Chocobo
      if (ab._fat) { plan.variant = 'fat'; plan.banner = ab.altName || 'Fat-Chocobo'; }
    }
    if (ab.id === 'odin') {
      plan.hits = 1;
      const canKill = targets.filter(t => !t.immuneTo('death') && !(t.immune || []).includes('death'));
      if (canKill.length) {
        plan.variant = 'steel'; plan.banner = ab.attackName || 'Steel-bladed Sword';
        plan.apply = () => targets.filter(t => t.targetable).map(t => {
          let r;
          if (canKill.includes(t) && U.chance(92)) { r = R(t, { kill: true }); C.apply(a, r, b); b.showResult(r, ab); b.afterHit(a, t, r, ab, act, { noKillCredit: true }); }
          else { r = R(t, { miss: true, text: 'Miss' }); b.showResult(r, ab); }
          return r;
        });
      } else {
        plan.variant = 'gunge'; plan.banner = ab.altName || 'Gunge Lance';
        plan.single = U.pick(targets);
        plan.apply = () => {
          const t = plan.single.targetable ? plan.single : U.pick(targets.filter(x => x.targetable)); if (!t) return [];
          const r = C.resolve(a, t, Object.assign({}, ab, { kind: 'damage', power: ab.altPower || 78, add: [], special: null }), { multi: 1 });
          C.apply(a, r, b); b.showResult(r, ab); if (!r.miss && r.dmg > 0) b.hurt(t); b.afterHit(a, t, r, ab, act);
          return [r];
        };
      }
    }
    plan.after = special && special.after ? () => special.after(b, act, ab, targets) : null;
    return plan;
  }

  // ================================================================== runner
  const SQ = B.summonSeq = {
    has(ab, act) { return !!(ab && ab.src === 'summon' && typeof SEQ[ab.id] === 'function' && (!act || (act.actor && act.actor.isParty))); },
    Stage,
    run: function* (b, act, ab) {
      const a = act.actor;
      const targets = B.actions.resolveTargets(b, Object.assign(act, { side: 'enemy' }));
      if (!targets.length) { yield 10; return; }
      const plan = makePlan(b, act, ab, targets);
      const fn = (plan.variant === 'fat' && SEQ.fat_chocobo) || SEQ[ab.id];
      const S = new Stage(b, a, ab, targets);
      S.bannerText = plan.banner;
      const authored = fn.hits || 1;
      const hooks = {
        stage: S, plan, variant: plan.variant, hits: plan.hits, caster: a, targets, act, ab, applied: [], results: [], afterDone: false,
        impact(i) {
          if (i == null) { i = 0; while (hooks.applied[i]) i++; }
          if (i >= plan.hits || hooks.applied[i]) return [];
          hooks.applied[i] = true;
          let res = [];
          try { res = plan.apply(i) || []; } catch (e) { console.error('[summon_seq] impact', e); }
          hooks.results[i] = res;
          // Quadra Magic etc.: extra hits follow the last authored one
          if (i === Math.min(authored, plan.hits) - 1) for (let j = authored; j < plan.hits; j++) S.after((j - authored + 1) * 12, () => hooks.impact(j));
          return res;
        },
        // the special's follow-up (Phoenix revives the party); runs once
        after: function* () { if (hooks.afterDone) return; hooks.afterDone = true; if (plan.after) yield* plan.after(); },
        done() { return hooks.applied.filter(Boolean).length >= plan.hits; },
      };
      const prevCur = b.current;
      if (!prevCur || prevCur.type !== 'summon') b.current = Object.assign({}, prevCur || {}, { type: 'summon', actor: a });
      b.summonModel = S; b.camGoal = null;
      const cap = Math.round((fn.frames || 2400) * 1.5) + 600;
      let frames = 0;
      try {
        let gen = null;
        try { gen = fn(b, a, ab, targets, hooks); } catch (e) { console.error('[summon_seq]', ab.id, e); S.skipReq = true; }
        while (gen && !S.skipReq) {
          let r;
          try { r = gen.next(); } catch (e) { console.error('[summon_seq]', ab.id, e); S.skipReq = true; break; }
          if (r.done) break;
          let n = typeof r.value === 'number' ? Math.max(1, Math.round(r.value)) : 1;
          while (n-- > 0 && !S.skipReq) {
            yield 1;
            if (++frames > cap) { console.warn('[summon_seq] frame cap reached', ab.id); S.skipReq = true; }
          }
        }
        if (S.skipReq) {
          if (gen) { try { gen.return(); } catch (e) { } }
          yield* skipRest(b, S, hooks);
        }
        // anything the sequence didn't land lands now
        for (let i = 0; i < plan.hits; i++) if (!hooks.applied[i]) { hooks.impact(i); yield 8; }
        if (!hooks.afterDone) yield* hooks.after();
        if (!S.outroDone) yield* S.outro();
      } finally {
        S.dispose();
        if (b.current && b.current !== prevCur && b.current.type === 'summon' && prevCur) b.current = prevCur;
      }
      b.idle(a);
      b.camGoal = null; b.cam = b.defaultCam();   // FF7 cuts straight back to the battle camera
      yield 1;
    },
  };
  // skipped (or failed): straight to the damage view, the hits land one after another
  function* skipRest(b, S, hooks) {
    S.noSkip = true;
    S.clearAll(); S.restoreArena(); S.enemies('battle'); S.restoreModels(); S.tintEnemies(null); S.party(false); S.clearBanner();
    const c = S.resultCam(); S.setCam(c.eye, c.target, c.fov);
    S.flash('#ffffff', 16, 0.85);
    yield 8;
    const n = hooks.plan.hits;
    for (let i = 0; i < n; i++) if (!hooks.applied[i]) { hooks.impact(i); yield n > 4 ? 5 : 10; }
    if (!hooks.afterDone) yield* hooks.after();
    yield 44;
  }

  // ================================================================== shared shot helpers
  const H = SQ.helpers = {};
  const build = (id, opts) => { try { const mk = FF7.summons3d && FF7.summons3d[id]; return mk ? mk(opts) : null; } catch (e) { console.error('[summon_seq] model', id, e); return null; } };
  H.build = build;
  // arena colours (for procedural ground chunks that must match the current battle ground)
  H.groundCol = (S) => { const d = (FF7.arena.BG && FF7.arena.BG[S.b.bgId]) || { ground: ['#5a5048', '#4e4640'] }; return d.ground; };
  // dust / debris particle helpers
  H.dust = (S, p, n, o = {}) => S.add(new X.Particles({ blend: 'alpha', mesh: X.M.puff(), fade: [4, 18], drag: 0.94, gravity: -0.002 }).emit(n, () => {
    const a = Math.random() * PI * 2, sp = (o.speed || 0.06) * (0.4 + Math.random());
    return { p: [p[0] + (Math.random() - 0.5) * (o.spread || 1), p[1] + Math.random() * (o.h || 0.3), p[2] + (Math.random() - 0.5) * (o.spread || 1)], v: [cos(a) * sp, Math.random() * (o.up || 0.03), sin(a) * sp], life: (o.life || 50) * (0.7 + Math.random() * 0.5), size: (o.size || 0.6) * (0.6 + Math.random() * 0.6), sizeTo: (o.size || 0.6) * 2.2, color: o.color || '#b8b0a0', alpha: o.alpha || 0.7, roll: Math.random() * 6 };
  }));
  H.debris = (S, p, n, o = {}) => S.add(new X.Particles({ world: true, blend: null, mesh: o.mesh || X.M.rock(), gravity: o.gravity == null ? 0.012 : o.gravity, fade: [1, 6], lit: true }).emit(n, () => {
    const a = Math.random() * PI * 2, sp = (o.speed || 0.12) * (0.4 + Math.random());
    return { p: [p[0] + (Math.random() - 0.5) * (o.spread || 1), p[1] + Math.random() * (o.h || 0.2), p[2] + (Math.random() - 0.5) * (o.spread || 1)], v: [cos(a) * sp, (o.up || 0.2) * (0.5 + Math.random()), sin(a) * sp], life: o.life || 60, size: (o.size || 0.25) * (0.5 + Math.random()), color: o.color || '#a08870', alpha: 1, rot: [Math.random() * 6, Math.random() * 6, 0], vr: 0.1, fn: (q) => { q.rot[0] += 0.08; q.rot[1] += 0.05; } };
  }));
  // generic "summon arrives from nowhere" white glint
  H.glint = (S, p, size = 2, life = 30, color = '#ffffff') => S.fxT(life, (cam, k) => { X.glow(cam, p, size * (0.3 + k), color, 1 - k); X.draw(X.M.sparkle(), X.bill(cam, p, size * 1.6 * (1 - k * 0.5), size * 1.6 * (1 - k * 0.5), k), { color, alpha: 1 - k }); });
  SQ.L3 = L3; SQ.A3 = A3;

  // ------------------------------------------------------------------ procedural set pieces
  const MB = FF7.MeshBuilder, sh = U.shade;
  const memoK = {};
  const memo = (key, fn) => memoK[key] || (memoK[key] = fn());
  // irregular earthen tower (Ramuh's pillar): tiers from y=0 to 1 (scaled later), radius ~1
  H.pillarMesh = () => memo('pillar', () => {
    const mb = new MB(), R = U.rng(5), seg = 11;
    const lv = [[0, 1.0], [0.18, 0.86], [0.2, 0.8], [0.4, 0.7], [0.42, 0.63], [0.6, 0.55], [0.62, 0.48], [0.8, 0.42], [0.82, 0.36], [1.0, 0.3]];
    const ring = lv.map(([y, r], j) => { const out = []; for (let i = 0; i < seg; i++) { const a = i / seg * PI * 2 + j * 0.2, rr = r * (0.85 + R() * 0.3); out.push([cos(a) * rr, y, sin(a) * rr]); } return out; });
    for (let j = 0; j < lv.length - 1; j++) for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg, flat = (j % 2 === 0);
      const col = flat ? sh('#a07a38', (R() - 0.5) * 0.25) : sh('#c89a48', (R() - 0.5) * 0.2);
      mb.quad(ring[j][i], ring[j][i2], ring[j + 1][i2], ring[j + 1][i], col);
    }
    const top = ring[lv.length - 1]; for (let i = 1; i < seg - 1; i++) mb.tri(top[0], top[i + 1], top[i], '#b08840');
    return mb.build({ cull: false });
  });
  // lumpy earth mound (y 0..1, radius 1) coloured like the arena ground
  H.moundMesh = (c1, c2) => memo('mound' + c1 + c2, () => {
    const mb = new MB(), R = U.rng(9), seg = 14, rings = 5;
    const pt = (i, j) => { const th = j / rings * PI / 2, a = i / seg * PI * 2, n = 0.8 + U.hash(i % seg, j, 3) * 0.4; return [cos(a) * sin(th) * n, cos(th) * (j ? 0.9 + U.hash(i % seg, j, 5) * 0.2 : 1), sin(a) * sin(th) * n]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const c = sh(j % 2 ? c1 : c2, (R() - 0.5) * 0.18 - j * 0.02);
      if (j === 0) mb.tri(pt(i, 0), pt(i + 1, 1), pt(i, 1), c); else mb.quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), c);
    }
    return mb.build({ cull: false });
  });
  // slab of ground: top surface in the arena colours, rocky underside; x -1..1, z -1..1, y -1..0
  H.slabMesh = (c1, c2) => memo('slab' + c1 + c2, () => {
    const mb = new MB(), R = U.rng(21), n = 6;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x0 = -1 + 2 * i / n, x1 = x0 + 2 / n, z0 = -1 + 2 * j / n, z1 = z0 + 2 / n; mb.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], sh((i + j) % 2 ? c1 : c2, (R() - 0.5) * 0.12)); }
    const rim = []; for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, k = 1 / Math.max(Math.abs(cos(a)), Math.abs(sin(a))); rim.push([cos(a) * k, 0, sin(a) * k]); }
    const tip = [0.1, -1, -0.05];
    for (let i = 0; i < 16; i++) { const a = rim[i], b = rim[(i + 1) % 16], mid = [(a[0] + b[0]) * 0.4, -0.35 - R() * 0.25, (a[2] + b[2]) * 0.4]; mb.tri(a, mid, b, sh('#6a5440', (R() - 0.5) * 0.3)); mb.tri(mid, tip, [b[0] * 0.8, -0.4, b[2] * 0.8], sh('#5a4634', (R() - 0.5) * 0.3)); mb.tri(a, [a[0] * 0.8, -0.4, a[2] * 0.8], mid, sh('#4e3e2e', (R() - 0.5) * 0.3)); }
    return mb.build({ cull: false });
  });
  // jagged rock silhouette (crags / floating island underside): y 0..1 cone-ish
  H.cragMesh = (seed, col) => memo('crag' + seed + col, () => {
    const mb = new MB(), R = U.rng(seed), seg = 9;
    const lv = [[0, 1], [0.3, 0.8], [0.6, 0.55], [0.85, 0.35], [1, 0.12]];
    const ring = lv.map(([y, r]) => { const o = []; for (let i = 0; i < seg; i++) { const a = i / seg * PI * 2, rr = r * (0.6 + R() * 0.6); o.push([cos(a) * rr + (R() - 0.5) * 0.15, y + (R() - 0.5) * 0.08, sin(a) * rr]); } return o; });
    for (let j = 0; j < lv.length - 1; j++) for (let i = 0; i < seg; i++) { const i2 = (i + 1) % seg; mb.quad(ring[j][i], ring[j][i2], ring[j + 1][i2], ring[j + 1][i], sh(col, (R() - 0.5) * 0.3)); }
    const t = ring[lv.length - 1]; for (let i = 1; i < seg - 1; i++) mb.tri(t[0], t[i + 1], t[i], col);
    return mb.build({ cull: false });
  });
  // fire: additive puffs rising (IFLEET flame puffs when the atlas is on, else procedural flame sprites)
  const FLAME = (q) => 'flame' + (Math.floor(q.life) & 3);
  H.fire = (S, p, n, o = {}) => S.add(new X.Particles({ tex: o.tex === false ? null : (o.tex || 'IFLEET_0000/IFLEET_0000'), ptex: o.tex === false || X.img(o.tex || 'IFLEET_0000/IFLEET_0000') ? null : FLAME, frames: o.frames || [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], fade: [3, 14], drag: 0.96, gravity: -(o.rise || 0.004) }).emit(n, () => {
    const a = Math.random() * PI * 2, r = Math.random() * (o.spread || 0.6), sp = o.speed || 0.02;
    return { p: [p[0] + cos(a) * r, p[1] + Math.random() * (o.h || 0.3), p[2] + sin(a) * r], v: [cos(a) * sp * Math.random(), (o.up || 0.03) * (0.5 + Math.random()), sin(a) * sp * Math.random()], life: (o.life || 40) * (0.6 + Math.random() * 0.6), size: (o.size || 0.8) * (0.6 + Math.random() * 0.6), sizeTo: (o.size || 0.8) * 1.6, color: o.color || '#ffa040', alpha: o.alpha || 0.9, roll: Math.random() * 6 };
  }));
  // explosion: flash glow + fire puffs + smoke
  H.boom = (S, p, size = 1, o = {}) => {
    S.fxT(o.life || 30, (cam, k) => { X.glow(cam, p, size * 2.6 * (0.4 + k), o.core || '#fff0c0', (1 - k) * 0.9); X.glow(cam, p, size * 4.2 * (0.3 + k), o.color || '#ff8020', (1 - k) * 0.7); });
    H.fire(S, p, o.n || 8, { size: size * 1.2, spread: size * 0.5, up: 0.02 * size, speed: 0.05 * size, life: 30, color: o.color || '#ffa040', tex: o.tex });
  };
  // flickering lightning between points: from() / to() may be functions
  H.lightning = (S, from, to, life, o = {}) => S.fxT(life, (cam, k, age) => {
    if (o.flicker !== false && age % 5 > 3) return;
    const a = typeof from === 'function' ? from(age) : from, b = typeof to === 'function' ? to(age) : to;
    const v = (o.seed || 0) + Math.floor(age / 3);
    X.bolt(cam, a, b, v, o.color || '#b8c8ff', (o.alpha || 1) * (1 - k * 0.3), o.width || 1);
    X.bolt(cam, a, b, v + 3, '#ffffff', 0.7 * (1 - k), (o.width || 1) * 0.6);
    X.glow(cam, b, o.glow || 1.2, o.glowCol || '#8098ff', 0.8);
  });
  // quadruped / biped gait helpers for summon rigs
  H.gallop = (m, ph, amp = 1) => {
    const B_ = m.bones, s = sin(ph), c = cos(ph);
    for (const [n, k] of [['legFL', 0], ['legFR', 0.6], ['legBL', PI], ['legBR', PI + 0.6]]) if (B_[n]) B_[n].rot[0] += sin(ph + k) * 0.55 * amp;
    if (B_.body) { B_.body.rot[0] += s * 0.06 * amp; B_.body.pos[1] += Math.abs(c) * 0.12 * amp; }
    if (B_.head) B_.head.rot[0] += -s * 0.1 * amp;
    if (B_.tail) B_.tail.rot[0] += 0.3 + c * 0.15;
  };
  H.chocoRun = (m, ph, amp = 1) => {
    const B_ = m.bones, s = sin(ph);
    B_.thighL.rot[0] = s * 0.95 * amp; B_.thighR.rot[0] = -s * 0.95 * amp;
    B_.body.rot[0] = 0.12 * amp + sin(ph * 2) * 0.05; B_.root.pos[1] = Math.abs(cos(ph)) * 0.22 * amp;
    B_.head.rot[0] = -0.15 * amp + sin(ph * 2 + 0.5) * 0.08; B_.tail.rot[0] = -0.2 + sin(ph * 2) * 0.1;
    B_.wingL.rot[2] = 0.25 + sin(ph * 2) * 0.25 * amp; B_.wingR.rot[2] = -0.25 - sin(ph * 2) * 0.25 * amp;
    B_.rider.pos[1] = Math.abs(sin(ph + 0.4)) * 0.08; B_.armL.rot[2] = 0.6 + sin(ph * 2) * 0.2; B_.armR.rot[2] = -0.6 - sin(ph * 2) * 0.2;
  };
  // Mog alone (the chocobo parts of the rig hidden), feet on the ground
  const MOG_BONES = ['body', 'head', 'tail', 'wingL', 'wingR', 'thighL', 'thighR'];
  H.mogOnly = (m, on) => { for (const n of MOG_BONES) if (m.bones[n]) m.bones[n].visible = !on; };

  // ================================================================== CHOCO/MOG - Deathblow!!  (ref ~15 s)
  // chocobo far off running in -> head whips past the camera -> tracking shot with Mog aboard ->
  // "BOOM!" -> dust cloud, Mog tumbles down dazed (swirly eyes, stars) -> dust clears, damage
  SEQ.choco_mog = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E;
    yield* S.cast();
    S.enemies('battle');
    // the chocobo charges along +x, in front of the enemies, into the middle one
    S.propless();
    const SC = 0.55, ZP = E0[2] + 2.0, XH = E0[0] - 0.6;
    const ch = S.actor(build('choco_mog'), { pos: [E0[0] - 15, 0, ZP], rot: [0, PI / 2, 0], scale: SC });
    let ph = 0, run = true;
    ch.pose = (m) => { if (run) { ph += 0.36; H.chocoRun(m, ph); } };
    const runner = S.loop(() => { if (run) ch.pos[0] += 0.115; });
    const kick = S.loop((f) => { if (run && f % 4 === 0) H.dust(S, [ch.pos[0] - 0.4, 0.1, ch.pos[2]], 1, { size: 0.35, spread: 0.3, life: 30, color: '#d0c8b8', alpha: 0.6 }); });
    // --- shot A: from beside the enemies, the chocobo tiny in the distance, running at us
    S.camMove(110, [E0[0] + 4.6, 1.0, E0[2] + 0.8], [E0[0] - 12, 1.1, ZP], [E0[0] + 4.4, 1.0, E0[2] + 0.9], [E0[0] - 10, 1.1, ZP], 38, 38, 'lin');
    S.sfx('chocobo');
    yield 110;
    // --- shot B: extreme close-up, the head whips past
    ch.pos[0] = E0[0] - 8.6;
    S.camPath(60, (k) => ({ eye: [ch.pos[0] + 1.35 - k * 1.3, 1.62, ZP - 1.05], target: [ch.pos[0] + 0.75 - k * 1.1, 1.55, ZP], fov: 44 }), 'lin');
    yield 60;
    // --- shot C: tracking side view (Mog riding, facing right), then from behind toward the enemy
    ch.pos[0] = E0[0] - 12.0;
    S.camPath(70, () => ({ eye: [ch.pos[0] + 0.4, 1.15, ZP + 3.4], target: [ch.pos[0] + 0.2, 1.05, ZP], fov: 42 }), 'lin');
    yield 70;
    ch.pos[0] = XH - 6.9;
    S.camPath(60, () => ({ eye: [ch.pos[0] - 2.6, 1.35, ZP + 1.4], target: [E0[0] + 0.3, 0.9, E0[2]], fov: 44 }), 'lin');
    yield 60;
    // --- shot D: BOOM!
    run = false; S.untrack(runner); S.untrack(kick); S.envOff();
    const hit = [XH + 0.2, 1.1, E0[2] + 1.0];
    ch.visible = false;
    S.setCam([hit[0] + 0.3, 1.3, hit[2] + 4.2], hit, 44);
    S.flash('#ffffff', 10, 0.9); S.shake(8, 16); S.sfx('hit'); S.sfx('crit', 0.8);
    H.dust(S, A3(hit, [0, -0.7, -0.4]), 16, { size: 1.0, spread: 2.6, speed: 0.08, life: 60, color: '#a8bcd8', alpha: 0.9 });
    S.fxT(60, (cam, k, age) => {
      const s = age < 6 ? E.back(age / 6) : 1;
      X.glow(cam, A3(hit, [0, 0, -0.5]), 3.2 * s, '#fff4c0', 0.8 * (1 - k));
      X.sprite(cam, 'CHOCO0_0000/CHOCO0_0001', 8, A3(hit, [0, 0.1, 0.3]), 1.55 * s, '#ffc860', 1, { blend: 'alpha', noDepth: true, fallbackMesh: X.M.star5() });
      for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2 + age * 0.05; X.draw(X.M.star5(), X.bill(cam, [hit[0] + cos(an) * 1.9, hit[1] + sin(an) * 1.0, hit[2] + 0.4], 0.26, 0.26, age * 0.1), { color: '#ffd020', blend: 'alpha', noDepth: true }); }
    });
    yield 60;
    // --- shot E: dust cloud; Mog falls in and sits dazed
    const mp = [XH + 0.3, 0, E0[2] + 2.4];
    ch.visible = true; H.mogOnly(ch.m, true); ch.scale = SC * 1.3;
    const mogY = -2.53 * SC * 1.3;
    ch.pos = [mp[0], 3.6 + mogY, mp[2]]; ch.rot = [0, 0.1, 0];
    let dazed = 0;
    ch.pose = (m, t) => { const B_ = m.bones; B_.armL.rot[2] = 0.3 + sin(t * 0.2) * 0.2 * dazed; B_.armR.rot[2] = -0.3 - sin(t * 0.2) * 0.2 * dazed; B_.rider.rot[2] = sin(t * 0.08) * 0.12 * dazed; B_.rider.rot[0] = 0.1; };
    S.track(40, (k) => { ch.pos[1] = lerp(3.0, 0, E.in(k)) + mogY; ch.rot[2] = (1 - k) * 2.6; }, 'lin');
    const cloud = S.add(new X.Particles({ blend: 'alpha', mesh: X.M.puff(), fade: [8, 40], keep: true }));
    cloud.ps.emit(24, (i) => ({ p: [mp[0] + (Math.random() - 0.5) * 5, -0.2 + Math.random() * 0.9, mp[2] - 1.2 + (Math.random() - 0.5) * 2], v: [(Math.random() - 0.5) * 0.004, 0.002, 0], life: 180 + Math.random() * 30, size: 0.9 + Math.random() * 0.8, sizeTo: 1.7, color: i % 3 ? '#eef0f4' : '#b8c0cc', alpha: 0.95, roll: Math.random() * 6 }));
    S.camMove(240, [mp[0] + 0.15, 0.62, mp[2] + 2.3], [mp[0], 0.62, mp[2]], [mp[0] + 0.1, 0.6, mp[2] + 2.0], [mp[0], 0.58, mp[2]], 42, 42, 'lin');
    yield 40;
    dazed = 1; S.sfx('hit', 0.6);
    const head = () => S.bp(ch, 'rider', [0, 3.35, 0.05]);
    S.fxT(200, (cam, k, age) => {
      const hp = head();
      for (let i = 0; i < 3; i++) { const an = i / 3 * PI * 2 + age * 0.09; X.draw(X.M.star5(), X.bill(cam, [hp[0] + cos(an) * 0.42, hp[1] + 0.34 + sin(age * 0.1 + i) * 0.04, hp[2] + sin(an) * 0.3], 0.1, 0.1, age * 0.05), { color: '#ffd020', blend: 'alpha' }); }
      for (const s of [-1, 1]) { const ep = [hp[0] + s * 0.11, hp[1] + 0.02, hp[2] + 0.3]; X.sprite(cam, 'CHOCO0_0000/CHOCO0_0000', 10 + (Math.floor(age / 4) % 8), ep, 0.14, '#282028', 1, { blend: 'alpha', roll: age * 0.3, fallbackMesh: X.M.spiral() }); }
    });
    yield 200;
    // --- shot F: dust clears, the enemies take the hit
    S.remove(cloud); ch.visible = false; H.mogOnly(ch.m, false);
    H.dust(S, [E0[0], 0.2, E0[2]], 8, { size: 1.0, spread: 3, life: 50, alpha: 0.5 });
    const rc = S.resultCam(); S.camMove(76, rc.eye, rc.target, A3(rc.eye, [-0.3, -0.1, -0.4]), rc.target, 42, 42, 'lin');
    yield 6;
    hk.impact(0);
    yield 70;
    yield* S.outro();
  };
  SEQ.choco_mog.frames = 890;

  // Fat-Chocobo (15/256): Mog dances, a giant chocobo drops out of the sky onto the enemies
  SEQ.fat_chocobo = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E;
    yield* S.cast();
    S.enemies('battle');
    const SC = 0.55, mp = [E0[0] + 0.8, 0, E0[2] + 3.4], mogY = -2.53 * SC * 1.3;
    const mog = S.actor(build('choco_mog'), { pos: [mp[0], mogY, mp[2]], rot: [0, PI, 0], scale: SC * 1.3 });
    H.mogOnly(mog.m, true);
    mog.pose = (m, t) => { const B_ = m.bones; B_.armL.rot[2] = 1.2 + sin(t * 0.25) * 0.6; B_.armR.rot[2] = -1.2 - sin(t * 0.25 + 1) * 0.6; B_.rider.rot[1] = sin(t * 0.1) * 0.5; };
    S.loop((f) => { mog.pos[1] = mogY + Math.abs(sin(f * 0.12)) * 0.35; });
    H.glint(S, [mp[0], 0.6, mp[2]], 1.2, 24);
    // --- shot A: Mog dances in front of the enemies
    S.camMove(120, [mp[0] + 0.9, 0.9, mp[2] - 3.2], [mp[0], 0.6, mp[2]], [mp[0] + 0.6, 1.0, mp[2] - 2.6], [mp[0], 0.6, mp[2]], 44, 42);
    yield 120;
    // --- shot B: something falls out of the sky
    const fat = S.actor(build('fat_chocobo'), { pos: [E0[0], 30, E0[2]], rot: [0, 0.3, 0], scale: 0.62 });
    fat.pose = (m, t) => { const B_ = m.bones; B_.wingL.rot[2] = sin(t * 0.5) * 0.5; B_.wingR.rot[2] = -sin(t * 0.5) * 0.5; B_.thighL.rot[0] = 0.5; B_.thighR.rot[0] = 0.5; };
    S.camMove(100, [E0[0] + 2.2, 0.8, E0[2] + 7], [E0[0], 3.5, E0[2]], [E0[0] + 2.2, 0.8, E0[2] + 7], [E0[0], 2.2, E0[2]], 50, 48, 'lin');
    S.track(100, (k) => { fat.pos[1] = lerp(26, 0.6, k); fat.rot[1] = 0.3 + k * 1.2; }, 'in');
    S.sfx('falling');
    yield 100;
    // --- shot C: impact (dust ring, shake)
    fat.pos[1] = 0; fat.rot[1] = 0; S.shake(10, 24); S.flash('#fff8e0', 8, 0.6); S.sfx('hit'); S.sfx('bosskill', 0.5);
    const ring = S.add(new X.Particles({ tex: 'DEBUCHO_0000/DEBUCHO_0000', frames: [0, 1, 2, 3, 4, 5, 6, 7], blend: 'alpha', fade: [2, 16], drag: 0.93 }));
    ring.ps.emit(18, (i) => { const an = i / 18 * PI * 2, sp = 0.13; return { p: [E0[0] + cos(an) * 1.6, 0.5, E0[2] + sin(an) * 1.6], v: [cos(an) * sp, 0.01, sin(an) * sp], life: 50, size: 1.4, sizeTo: 2.4, color: '#f0e8d0', alpha: 0.9 }; });
    S.track(24, (k) => { fat.scale = 0.62 * (1 + sin(k * PI) * 0.12); }, 'lin');
    yield 6;
    hk.impact(0);
    yield 34;
    // --- shot D: the fat chocobo sits there, blinking; Mog bounces
    S.camMove(120, [E0[0] + 3.2, 2.2, E0[2] + 7.6], [E0[0], 2.0, E0[2]], [E0[0] + 2.4, 2.0, E0[2] + 6.6], [E0[0], 2.0, E0[2]], 46, 46);
    yield 120;
    S.track(40, (k) => { fat.pos[1] = sin(k * PI) * 3; fat.alpha = 1 - k; }, 'lin');
    yield 40;
    yield* S.outro();
  };
  SEQ.fat_chocobo.frames = 640;

  // ================================================================== IFRIT - Hellfire  (ref ~17 s)
  // burning portal -> Ifrit rises spinning in a column of fire -> fire ring -> leaps through the haze ->
  // lands, roars, gathers a fireball -> hurls it: a tide of fire sweeps over the enemies
  SEQ.ifrit = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.72;
    yield* S.cast();
    S.dimTo('#2c0c02', 0.58, 40);                  // FF7 darkens the arena to a red-brown for the whole summon
    const P0 = [E0[0] + 0.9, 0, E0[2] + 6.4];
    const ifr = S.actor(build('ifrit'), { pos: [P0[0], -6, P0[2]], rot: [0, PI, 0], scale: SC });
    const pose = { crouch: 0, arms: 0, jaw: 0, throw: 0, spread: 0 };
    ifr.pose = (m, t) => {
      const B_ = m.bones;
      B_.body.rot[0] = pose.crouch * 0.35 - pose.throw * 0.3; B_.root.pos[1] = -pose.crouch * 0.6;
      B_.thighL.rot[0] = -pose.crouch * 0.8; B_.thighR.rot[0] = -pose.crouch * 0.8;
      B_.armL.rot[2] = 0.2 + pose.spread * 0.9 + sin(t * 0.1) * 0.05; B_.armR.rot[2] = -0.2 - pose.spread * 0.9 - sin(t * 0.1) * 0.05;
      B_.armL.rot[0] = -pose.arms * 1.6 - pose.throw * 1.2; B_.armR.rot[0] = -pose.arms * 1.6 - pose.throw * 1.4;
      B_.jaw.rot[0] = pose.jaw * 0.5; B_.head.rot[0] = -pose.jaw * 0.35 + pose.crouch * 0.2;
    };
    // --- shot 1: the burning portal on the ground (from above)
    const portal = S.fxT(420, (cam, k, age) => {
      const g = Math.min(1, age / 30), q = [P0[0], 0.04, P0[2]];
      X.draw(X.M.solidDisc(), X.trs(q, [-PI / 2, 0, 0], [1.9 * g, 1.9 * g, 1]), { color: '#100400', alpha: 0.9, blend: 'alpha' });
      X.draw(X.M.ring(), X.trs([q[0], 0.06, q[2]], [0, age * 0.05, 0], [2.1 * g, 1, 2.1 * g]), { color: '#ff7010', alpha: 0.95 });
      X.draw(X.M.annulus(), X.trs([q[0], 0.05, q[2]], [0, 0, 0], [2.8 * g, 1, 2.8 * g]), { color: '#a02000', alpha: 0.6 });
    }, false);
    const rim = S.loop((f) => { if (f % 3 === 0 && f < 360) H.fire(S, [P0[0], 0, P0[2]], 2, { spread: 2.0, size: 0.55, life: 30, up: 0.03 }); });
    S.camMove(60, [P0[0] + 1.6, 6.2, P0[2] + 3.4], [P0[0], 0, P0[2]], [P0[0] + 1.4, 5.8, P0[2] + 3.0], [P0[0], 0, P0[2]], 46, 46);
    S.sfx('fire2');
    yield 60;
    // --- shot 2: Ifrit rises, spinning, inside a column of fire
    // the translucent octagonal column of fire he rises in
    const oct = memo('oct', () => { const mb = new MB(), n = 8; for (let i = 0; i < n; i++) { const a0 = i / n * PI * 2, a1 = (i + 1) / n * PI * 2; X.q4(mb, [cos(a0), 0, sin(a0)], [cos(a1), 0, sin(a1)], [cos(a1), 1, sin(a1)], [cos(a0), 1, sin(a0)], [1, 1, 1, 0.9], [1, 1, 1, 0.9], [1, 1, 1, 0.25], [1, 1, 1, 0.25]); } return mb.build({ unlit: true, cull: false }); });
    const col = S.fxT(200, (cam, k, age) => {
      const al = Math.min(1, age / 15) * (age > 170 ? (200 - age) / 30 : 1);
      X.draw(oct, X.trs([P0[0], 0, P0[2]], [0, age * 0.01, 0], [2.1, 8, 2.1]), { color: '#ff7a18', alpha: 0.5 * al });
      X.draw(X.M.cyl(), X.trs([P0[0], 0, P0[2]], [0, 0, 0], [1.6, 6, 1.6]), { color: '#ffc040', alpha: 0.35 * al });
    });
    const colFire = S.loop((f) => { if (f < 190 && f % 2 === 0) H.fire(S, [P0[0], 0.2, P0[2]], 2, { spread: 1.6, size: 0.9, life: 45, up: 0.07, rise: 0.003 }); });
    S.track(120, (k) => { ifr.pos[1] = lerp(-6.2, 0, E.out(k)); ifr.rot[1] = PI + (1 - k) * 9; }, 'lin');
    S.camMove(120, [P0[0] + 1.2, 1.3, P0[2] - 5.6], [P0[0], 2.6, P0[2]], [P0[0] + 1.0, 1.6, P0[2] - 5.0], [P0[0], 3.4, P0[2]], 50, 50);
    S.sfx('fire2');
    yield 120;
    // --- shot 3: a ring of fire bursts outward, Ifrit crouches
    S.untrack(rim);
    S.track(30, (k) => { pose.crouch = k; }, 'out');
    S.fxT(60, (cam, k) => { X.draw(X.M.ring(), X.trs([P0[0], 1.4, P0[2]], [0, 0, 0], [1.5 + k * 9, 1, 1.5 + k * 9]), { color: '#ffb040', alpha: 1 - k }); X.draw(X.M.annulus(), X.trs([P0[0], 1.3, P0[2]], [0, 0, 0], [1 + k * 8, 1, 1 + k * 8]), { color: '#ff6010', alpha: (1 - k) * 0.7 }); });
    S.camMove(60, [P0[0] + 2.6, 2.4, P0[2] - 5.4], [P0[0], 1.8, P0[2]], [P0[0] + 3.0, 2.6, P0[2] - 5.9], [P0[0], 1.8, P0[2]], 50, 50);
    yield 60;
    // --- shot 4: orange haze, he leaps
    S.remove(portal); S.remove(col); S.untrack(colFire);
    const haze = S.fade('#ff7a20', 0, 0.35, 20);
    S.track(24, (k) => { pose.crouch = 1 - k; pose.spread = k; }, 'out');
    S.track(120, (k) => { ifr.pos = [lerp(P0[0], E0[0] + 0.8, k), sin(k * PI) * 5.5, lerp(P0[2], E0[2] + 3.2, k)]; }, 'sine');
    S.camMove(120, [P0[0] - 1.8, 0.6, P0[2] + 3.4], [P0[0], 3.8, P0[2] - 0.8], [P0[0] - 2.2, 0.8, P0[2] + 3.0], [E0[0] + 0.8, 3.4, E0[2] + 3.2], 52, 52, 'lin');
    yield 120;
    // --- shot 5: he lands before the enemies (seen from above, behind him)
    S.unfade(haze, 20);
    const P1 = [E0[0] + 0.8, 0, E0[2] + 3.2];
    ifr.pos = P1.slice(); pose.spread = 0.4;
    S.track(20, (k) => { pose.crouch = sin(k * PI) * 0.6; }, 'lin');
    H.dust(S, [P1[0], 0.1, P1[2]], 8, { size: 0.8, spread: 2, speed: 0.07, life: 40, color: '#c09070' });
    S.shake(5, 12); S.sfx('hit', 0.6);
    S.camMove(60, [P1[0] + 1.2, 7.5, P1[2] + 5.0], [E0[0], 0.5, E0[2]], [P1[0] + 1.4, 7.0, P1[2] + 4.4], [E0[0], 0.5, E0[2]], 46, 46);
    yield 60;
    // --- shot 6: close-up, the roar
    const headP = () => S.bp(ifr, 'head', [0, 5.45, 0.4]);
    S.track(30, (k) => { pose.jaw = k; }, 'out');
    S.camMove(60, [P1[0] + 0.7, 4.0, P1[2] - 2.6], [P1[0], 3.95, P1[2]], [P1[0] + 0.5, 4.0, P1[2] - 2.2], [P1[0], 3.95, P1[2]], 42, 40);
    S.sfx('howl');
    yield 60;
    // --- shot 7: the fireball gathers at his mouth
    const fb = { r: 0.1, p: null };
    const ball = S.fxT(130, (cam, k, age) => {
      const hp = fb.p || A3(headP(), [0, -0.15, -0.55]);
      const img = X.img('IFLEET_0000/IFLEET_0000');
      if (img) X.draw(X.frameMesh('IFLEET_0000/IFLEET_0000', 8), X.bill(cam, hp, fb.r * 2.2, fb.r * 2.2, age * 0.08), { color: '#ffffff', tex: img });
      else for (let i = 0; i < 5; i++) X.draw(X.M.quad(), X.bill(cam, hp, fb.r * 1.5, fb.r * 2.3, age * 0.08 + i * 1.26), { color: '#ffffff', tex: X.ptex('flame' + ((i + (age >> 2)) & 3)), alpha: 0.8 });
      X.glow(cam, hp, fb.r * 3.2, '#ff7010', 0.9); X.glow(cam, hp, fb.r * 1.5, '#fff0a0', 1);
    });
    S.track(60, (k) => { fb.r = lerp(0.1, 0.75, k); pose.arms = k * 0.5; }, 'out');
    S.camMove(60, [P1[0] + 1.3, 3.6, P1[2] - 3.8], [P1[0], 3.7, P1[2] - 0.4], [P1[0] + 1.0, 3.6, P1[2] - 3.4], [P1[0], 3.7, P1[2] - 0.4], 44, 44);
    yield 60;
    // --- shot 8: he hurls it
    S.track(20, (k) => { pose.throw = k; pose.arms = 0.5 - k * 0.5; pose.jaw = 1 - k * 0.5; }, 'out');
    const fb0 = A3(headP(), [0, -0.2, -0.6]), fb1 = [E0[0], 0.8, E0[2]];
    S.track(50, (k) => { fb.p = L3(fb0, fb1, k); fb.r = 0.75 + k * 0.5; }, 'in');
    S.camMove(60, [P1[0] + 5.0, 2.4, P1[2] - 2.0], [lerp(P1[0], E0[0], 0.5), 2.2, lerp(P1[2], E0[2], 0.5)], [P1[0] + 5.4, 2.4, P1[2] - 2.6], [lerp(P1[0], E0[0], 0.6), 1.8, lerp(P1[2], E0[2], 0.6)], 50, 50);
    S.sfx('fire2');
    yield 60;
    // --- shot 9: the fire tide sweeps over the enemies
    S.remove(ball); ifr.visible = false;
    S.flash('#ffb040', 10, 0.6); S.shake(6, 30);
    const wall = { z: E0[2] + 5 };
    const tide = S.fxT(180, (cam, k, age) => {
      const img = X.img('IFLEET_0000/IFLEET_0000');
      for (let i = -6; i <= 6; i++) {
        for (let r = 0; r < 3; r++) {
          const z = wall.z + r * 1.1, x = E0[0] + i * 0.75 + sin(age * 0.2 + i + r) * 0.2, h = 1.2 + r * 0.5 + sin(age * 0.3 + i * 1.7) * 0.3;
          const p = [x, h * 0.55, z];
          if (img) X.draw(X.frameMesh('IFLEET_0000/IFLEET_0000', 9 + ((age >> 2) + i + r) % 16), X.bill(cam, p, h * 1.3, h * 1.3), { color: '#ffb050', alpha: 0.9, tex: img });
          else { X.draw(X.M.quad(), X.bill(cam, p, h * 0.85, h * 1.35), { color: '#ffffff', tex: X.ptex('flame' + ((age >> 2) + i + r & 3)), alpha: 0.9 }); X.glow(cam, p, h * 0.7, '#ff8020', 0.35); }
        }
      }
      X.draw(X.M.quad(), X.trs([E0[0], 0.05, wall.z + 3], [-PI / 2, 0, 0], [16, 8, 1]), { color: '#ff6010', alpha: 0.35 });
    });
    S.track(120, (k) => { wall.z = lerp(E0[2] + 6, E0[2] - 5, k); }, 'lin');
    S.after(40, () => { S.fade('#ff6a10', 0, 0.45, 30); for (const t of ts) H.fire(S, S.foot(t), 6, { size: 1.1, spread: 0.8, life: 60, up: 0.04 }); });
    S.camMove(120, [E0[0] - 1.6, 0.8, E0[2] - 3.4], [E0[0], 1.4, E0[2] + 3], [E0[0] - 1.8, 1.0, E0[2] - 3.8], [E0[0], 1.2, E0[2] + 2], 50, 50, 'lin');
    yield 120;
    // fire streaks across the enemies
    S.fxT(60, (cam, k, age) => { const img = X.img('IFLEET_0000/IFLEET_0000'); for (let i = 0; i < 5; i++) { const p = [E0[0] + (k * 14 - 7) + i * 0.6, 0.6 + i * 0.35, E0[2] + 0.4 - i * 0.3]; if (img) X.draw(X.frameMesh('IFLEET_0000/IFLEET_0000', i % 8), X.bill(cam, p, 4.2, 1.1), { color: '#ffc060', alpha: 0.9, tex: img }); else for (let j = 0; j < 6; j++) X.draw(X.M.quad(), X.bill(cam, A3(p, [(j - 2.5) * 0.65, 0, 0]), 0.75, 1.25, 0.2), { color: '#ffffff', tex: X.ptex('flame' + ((i + j + (age >> 2)) & 3)), alpha: 0.9 }); } });
    S.camMove(60, [E0[0] + 2.4, 1.6, E0[2] + 5.4], [E0[0], 1.0, E0[2]], [E0[0] + 2.2, 1.6, E0[2] + 5.0], [E0[0], 1.0, E0[2]], 44, 44, 'lin');
    yield 54;
    S.clearOverlays();
    hk.impact(0);
    S.showResult(66);
    S.dimTo('#2c0c02', 0, 50);
    yield 66;
    yield* S.outro();
  };
  SEQ.ifrit.frames = 1060;

  // ================================================================== RAMUH - Judgement Bolt  (ref ~21 s)
  // storm -> bolts hit the ground -> an earthen tower bursts up under a bolt -> flash: Ramuh stands on
  // top -> close-up, staff raised, lightning ball -> the bolt fans down from the tower onto the enemies
  SEQ.ramuh = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.8;
    yield* S.cast();
    const P0 = [E0[0] + 0.9, 0, E0[2] + 5.0], TOP = 5.2;
    S.dimTo('#0c1018', 0.62, 90);
    // --- shot 1: the arena, darkening
    S.camMove(60, [P0[0] + 3.0, 1.5, P0[2] - 7.5], [P0[0], 1.5, P0[2]], [P0[0] + 2.6, 1.4, P0[2] - 7.0], [P0[0], 1.8, P0[2]], 48, 48);
    yield 60;
    // --- shot 2: bolts strike the ground
    H.lightning(S, [P0[0] + 0.4, 22, P0[2] - 1], [P0[0], 0.1, P0[2]], 120, { glow: 2.2, width: 0.35 });
    S.fxT(120, (cam, k, age) => X.glow(cam, [P0[0], 0.3, P0[2]], 2.4 + sin(age * 0.8) * 0.4, '#4060ff', 0.9));
    S.sfx('bolt'); S.after(40, () => S.sfx('bolt')); S.after(90, () => S.flash('#c8d0ff', 6, 0.5));
    S.camMove(120, [P0[0] + 2.6, 1.0, P0[2] - 7.4], [P0[0], 3.2, P0[2]], [P0[0] + 2.2, 1.0, P0[2] - 6.8], [P0[0], 3.6, P0[2]], 50, 50, 'lin');
    yield 120;
    // --- shot 3: the ground erupts, the tower rises (bolt on its top)
    const pil = { h: 0 };
    S.env.push({ draw: () => { if (pil.h > 0.01) X.draw(H.pillarMesh(), X.trs([P0[0], 0, P0[2]], [0, 0, 0], [1.9, TOP * pil.h, 1.9]), { blend: null, lit: true }); } });
    S.track(80, (k) => { pil.h = k; }, 'out');
    S.shake(8, 70);
    H.debris(S, [P0[0], 0.2, P0[2]], 26, { spread: 3, speed: 0.12, up: 0.26, size: 0.3, life: 90 });
    H.dust(S, [P0[0], 0.2, P0[2]], 12, { size: 1.0, spread: 3.2, life: 60, color: '#a08a60' });
    H.lightning(S, [P0[0] - 0.3, 24, P0[2] - 0.5], () => [P0[0], TOP * pil.h + 0.2, P0[2]], 240, { glow: 1.8, width: 0.3, seed: 2 });
    S.sfx('bolt');
    S.camMove(60, [P0[0] + 3.4, 1.2, P0[2] - 8.0], [P0[0], 2.5, P0[2]], [P0[0] + 3.6, 1.2, P0[2] - 8.4], [P0[0], 3.3, P0[2]], 50, 52, 'lin');
    yield 60;
    // --- shot 4: the tower, lightning crowning it, debris raining; darker
    S.camMove(180, [P0[0] - 2.0, 0.7, P0[2] - 6.6], [P0[0], 4.0, P0[2]], [P0[0] - 1.2, 0.8, P0[2] - 6.0], [P0[0], 5.0, P0[2]], 54, 54, 'lin');
    S.after(60, () => S.sfx('bolt'));
    yield 180;
    // --- shot 5: flash - Ramuh atop the tower
    S.flash('#ffffff', 26, 1); S.sfx('bolt');
    const ram = S.actor(build('ramuh'), { pos: [P0[0], TOP, P0[2]], rot: [0, PI, 0], scale: SC });
    const pose = { raise: 0, spread: 0 };
    ram.pose = (m, t) => {
      const B_ = m.bones;
      B_.armR.rot[2] = -pose.raise * 1.1; B_.armR.rot[0] = -pose.raise * 0.9;
      B_.armL.rot[2] = pose.spread * 0.9; B_.body.rot[0] = -pose.raise * 0.08; B_.head.rot[0] = -pose.raise * 0.25 + sin(t * 0.03) * 0.03;
    };
    S.camMove(60, [P0[0] + 1.8, 3.6, P0[2] - 8.4], [P0[0], TOP + 1.9, P0[2]], [P0[0] + 1.6, 3.8, P0[2] - 7.8], [P0[0], TOP + 1.9, P0[2]], 46, 46);
    yield 60;
    // --- shot 6: Ramuh on the tower, lightning about him (slow orbit)
    const staffTop = () => S.bp(ram, 'armR', [-1.25, 4.68, 0.72]);
    for (let i = 0; i < 4; i++) H.lightning(S, () => A3(staffTop(), [0, 0.2, 0]), [P0[0] + cos(i * 1.7) * 5, TOP + 6 + i, P0[2] + sin(i * 1.7) * 5], 180, { seed: i * 2, width: 0.25, glow: 0.8 });
    S.track(60, (k) => { pose.spread = k * 0.4; }, 'sine');
    S.camOrbit(180, [P0[0], TOP, P0[2]], PI + 0.5, PI - 0.3, 7.6, 6.6, 0.6, 1.2, 48, 2.0, 'sine');
    yield 180;
    // --- shot 7: close-up from below, staff raised, the lightning ball swells
    S.track(40, (k) => { pose.raise = k; }, 'out');
    const orb = { r: 0.2 };
    S.fxT(180, (cam, k, age) => { const p = A3(staffTop(), [0, 0.35, 0]); orb.r = lerp(0.2, 1.5, E.out(Math.min(1, age / 100))); X.glow(cam, p, orb.r * 2.2, '#3050ff', 0.9); X.glow(cam, p, orb.r * 1.2, '#a0c0ff', 1); X.glow(cam, p, orb.r * 0.5, '#ffffff', 1); if (age % 4 < 2) for (let i = 0; i < 3; i++) X.bolt(cam, p, A3(p, [cos(age + i * 2) * orb.r * 1.6, sin(age * 0.7 + i) * orb.r * 1.4, sin(age + i) * orb.r]), age + i, '#c0d0ff', 0.9, 0.4); });
    S.camMove(120, [P0[0] + 0.9, TOP + 0.8, P0[2] - 2.6], [P0[0] - 0.4, TOP + 3.3, P0[2]], [P0[0] + 1.1, TOP + 0.6, P0[2] - 3.0], [P0[0] - 0.5, TOP + 3.6, P0[2]], 50, 50, 'lin');
    S.sfx('bolt');
    yield 120;
    // --- shot 8: yellow flare - Judgement Bolt fans down from the tower top
    S.flash('#ffe860', 20, 0.8);
    const apex = [P0[0], TOP + 4.4, P0[2]];
    S.fxT(60, (cam, k) => X.glow(cam, apex, 9 * (1 - k * 0.5), '#e0e040', 0.8 * (1 - k)));
    for (let i = 0; i < 9; i++) { const an = PI + (i - 4) * 0.35, d = 7 + (i % 3); H.lightning(S, apex, [P0[0] + sin(an) * d, 0, P0[2] + cos(an) * d], 60, { seed: i, width: 0.28, glow: 1 }); }
    for (const t of ts) H.lightning(S, apex, () => S.foot(t), 180, { seed: 7, width: 0.3, glow: 1.6 });
    S.camMove(60, [P0[0] + 1.5, 2.2, P0[2] + 7.5], [P0[0], TOP * 0.6, P0[2]], [P0[0] + 1.3, 2.2, P0[2] + 7.0], [P0[0], TOP * 0.6, P0[2]], 58, 58);
    S.sfx('bolt'); S.shake(4, 30);
    yield 60;
    // --- shot 9: the bolts crash into the enemies, sparks
    ram.visible = false;
    S.env.length = 0;
    S.loop((f) => { if (f % 10 === 0 && f < 110) for (const t of ts) { const p = S.b.hitPos(t); H.boom(S, A3(p, [(Math.random() - 0.5) * 1.5, (Math.random() - 0.5), (Math.random() - 0.5)]), 0.35, { color: '#ffb020', n: 2 }); } });
    S.camMove(114, [E0[0] + 2.2, 2.0, E0[2] + 5.0], [E0[0], 0.9, E0[2]], [E0[0] + 1.8, 1.8, E0[2] + 4.6], [E0[0], 0.9, E0[2]], 46, 46, 'lin');
    yield 114;
    hk.impact(0);
    for (const t of ts) S.fxT(50, (cam, k, age) => { if (age % 6 < 3) X.bolt(cam, A3(S.b.hitPos(t), [0.4, 0.6, 0]), A3(S.b.hitPos(t), [-0.4, -0.5, 0]), age, '#ffe040', 1, 0.8); });
    S.dimTo('#0c1018', 0, 20);
    S.showResult(66);
    yield 66;
    yield* S.outro();
  };
  SEQ.ramuh.frames = 1240;

  // ================================================================== TITAN - Anger of the Land  (ref ~18 s)
  // the ground swells and bursts -> Titan climbs out -> towers over the enemies -> grabs the earth in
  // front of them and heaves a whole slab up -> slams it down: rock shards and fire erupt
  SEQ.titan = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.66;
    yield* S.cast();
    const gc = H.groundCol(S);
    const P0 = [E0[0] + 0.8, 0, E0[2] + 6.2];
    const tit = S.actor(build('titan'), { pos: [P0[0], -6, P0[2]], rot: [0, PI, 0], scale: SC, visible: false });
    const pose = { climb: 0, crouch: 0, lift: 0, reach: 0 };
    tit.pose = (m, t) => {
      const B_ = m.bones;
      B_.armL.rot[0] = -pose.climb * (1.9 + sin(t * 0.25) * 0.5) - pose.reach * 1.1 - pose.lift * 2.4; B_.armR.rot[0] = -pose.climb * (1.9 - sin(t * 0.25) * 0.5) - pose.reach * 1.1 - pose.lift * 2.4;
      B_.armL.rot[2] = 0.15 - pose.lift * 0.3; B_.armR.rot[2] = -0.15 + pose.lift * 0.3;
      B_.body.rot[0] = pose.crouch * 0.6 - pose.lift * 0.15; B_.root.pos[1] = -pose.crouch * 1.4;
      B_.thighL.rot[0] = -pose.crouch * 1.0; B_.thighR.rot[0] = -pose.crouch * 1.0; B_.head.rot[0] = pose.crouch * 0.3 - pose.lift * 0.2;
    };
    // --- shot 1: the ground swells
    const mound = { h: 0 };
    S.env.push({ draw: () => { if (mound.h > 0.01) X.draw(H.moundMesh(gc[0], gc[1]), X.trs(P0, [0, 0, 0], [3.2, 2.2 * mound.h, 3.2]), { blend: null, lit: true }); } });
    S.track(60, (k) => { mound.h = k; }, 'out');
    S.shake(4, 60); S.sfx('run', 0.5);
    S.camMove(60, [P0[0] + 3.4, 1.6, P0[2] - 7.2], [P0[0], 0.8, P0[2]], [P0[0] + 3.0, 1.5, P0[2] - 6.6], [P0[0], 1.0, P0[2]], 46, 46);
    yield 60;
    // --- shot 2: it bursts; Titan's head and shoulders break out
    mound.h = 0;
    tit.visible = true; pose.climb = 1;
    H.debris(S, [P0[0], 0.5, P0[2]], 30, { spread: 3, speed: 0.1, up: 0.3, size: 0.4, life: 90 });
    H.dust(S, [P0[0], 0.3, P0[2]], 14, { size: 1.2, spread: 3.5, life: 70, color: '#a89878' });
    S.fxT(40, (cam, k) => X.glow(cam, [P0[0], 1, P0[2]], 5 * (0.5 + k), '#ffd8a0', 0.8 * (1 - k)));
    S.track(180, (k) => { tit.pos[1] = lerp(-4.2, 0, k); }, 'out');
    S.shake(9, 40); S.sfx('bosskill', 0.4);
    S.camMove(90, [P0[0] + 2.4, 1.2, P0[2] - 6.4], [P0[0], 2.6, P0[2]], [P0[0] + 2.2, 1.0, P0[2] - 6.0], [P0[0], 3.0, P0[2]], 50, 50);
    yield 90;
    // --- shot 3: climbing out
    S.camMove(60, [P0[0] - 3.0, 2.2, P0[2] - 5.2], [P0[0], 2.4, P0[2]], [P0[0] - 3.2, 2.2, P0[2] - 5.6], [P0[0], 2.8, P0[2]], 50, 50);
    yield 60;
    // --- shot 4: Titan towers over the enemies (low camera behind them)
    S.track(40, (k) => { pose.climb = 1 - k; }, 'sine');
    S.camMove(180, [E0[0] - 0.8, 0.6, E0[2] - 2.6], [P0[0], 3.4, P0[2]], [E0[0] - 0.4, 0.7, E0[2] - 2.2], [P0[0], 3.6, P0[2]], 54, 54, 'lin');
    yield 180;
    // --- shot 5: he crouches and digs his hands into the ground before the enemies
    S.track(50, (k) => { pose.crouch = k; pose.reach = k; }, 'sine');
    const slabC = [E0[0] + 0.2, 0, E0[2] + 3.0], sl = { ang: 0, lift: 0 };
    S.camMove(60, [P0[0] + 4.6, 2.4, P0[2] - 6.8], [P0[0], 1.6, P0[2] - 1.4], [P0[0] + 4.2, 2.2, P0[2] - 6.2], [P0[0], 1.4, P0[2] - 1.6], 48, 48);
    yield 60;
    // --- shot 6: he heaves the slab of ground up
    const slab = { draw: () => { const hinge = [slabC[0], 0, slabC[2] - 1.6]; const m = FF7.M4.trs(FF7.M4.create(), hinge, [-sl.ang, 0, 0], [1, 1, 1]); const m2 = FF7.M4.trs(FF7.M4.create(), [0, 0.02 + sl.lift, 1.6], [0, 0, 0], [3.2, 0.8, 1.6]); X.draw(H.slabMesh(gc[0], gc[1]), FF7.M4.mul(FF7.M4.create(), m, m2), { blend: null, lit: true }); } };
    S.env.push(slab);
    S.env.push({ draw: () => X.draw(X.M.solidDisc(), X.trs([slabC[0], 0.03, slabC[2]], [-PI / 2, 0, 0], [3.2 * sl.hole, 1.6 * sl.hole, 1]), { color: '#1a1410', alpha: 0.95, blend: 'alpha' }) });
    sl.hole = 1;
    S.track(150, (k) => { sl.ang = k * 1.25; sl.lift = k * 0.4; pose.lift = k; pose.crouch = 1 - k * 0.8; pose.reach = 1 - k; }, 'io');
    S.shake(5, 110); S.sfx('run', 0.5);
    H.debris(S, [slabC[0], 0.2, slabC[2] + 1.4], 16, { spread: 4, speed: 0.06, up: 0.12, size: 0.25, life: 70 });
    S.camMove(150, [slabC[0] + 6.6, 1.2, slabC[2] + 0.2], [slabC[0], 1.6, slabC[2] + 0.6], [slabC[0] + 7.0, 1.6, slabC[2] + 1.2], [slabC[0], 2.6, slabC[2] + 0.8], 50, 52, 'lin');
    yield 150;
    // --- shot 7: from behind the enemies - the wall of earth over them
    S.camMove(120, [E0[0] - 0.6, 0.8, E0[2] - 3.6], [slabC[0], 2.8, slabC[2]], [E0[0] - 0.4, 0.9, E0[2] - 3.2], [slabC[0], 3.4, slabC[2]], 52, 54, 'lin');
    S.track(100, (k) => { sl.ang = 1.25 + k * 0.45; }, 'sine');
    yield 120;
    // --- shot 8: slammed down - the earth erupts round the enemies in rock and fire
    S.track(16, (k) => { sl.ang = lerp(1.7, PI - 0.05, k); }, 'in');
    yield 16;
    S.env.length = 0; tit.visible = false;
    S.shake(12, 60); S.flash('#fff0d0', 10, 0.7); S.sfx('bosskill', 0.6); S.sfx('hit');
    const pts = ts.map(t => S.foot(t));
    S.fxT(110, (cam, k, age) => { const g = E.back(Math.min(1, age / 12)); pts.forEach((p, i) => X.draw(X.M.spikes(), X.trs(p, [0, i, 0], [1.9 * g, 2.2 * g, 1.9 * g]), { blend: null, color: '#a07850', lit: true })); X.draw(X.M.disc(), X.trs([E0[0], 0.1, E0[2]], [-PI / 2, 0, 0], [7, 5, 1]), { color: '#ff6a18', alpha: 0.7 * (1 - k) }); });
    pts.forEach(p => { H.debris(S, A3(p, [0, 0.4, 0]), 12, { spread: 1.5, speed: 0.1, up: 0.3, size: 0.35, life: 80 }); H.fire(S, p, 6, { spread: 1.4, size: 1.2, life: 50, up: 0.05 }); });
    H.dust(S, [E0[0], 0.3, E0[2]], 16, { size: 1.4, spread: 5, life: 90, color: '#b09878' });
    S.camMove(104, [E0[0] + 2.8, 2.6, E0[2] + 6.6], [E0[0], 1.0, E0[2]], [E0[0] + 2.4, 2.4, E0[2] + 6.0], [E0[0], 1.0, E0[2]], 50, 50, 'lin');
    yield 104;
    hk.impact(0);
    S.showResult(66);
    yield 66;
    yield* S.outro();
  };
  SEQ.titan.frames = 1120;

  // ------------------------------------------------------------------ night sky / moon (Odin)
  const moonSky = () => X.skyDome('night', [[-1, '#02040a'], [-0.05, '#0a1428'], [0.25, '#0c1a34'], [1, '#02040c']]);
  // textured (or procedural) cloud bank billboard
  H.cloud = (cam, p, w, h, color, alpha, seed = 0) => {
    // a bank of soft puffs lit from one side (the moon's), PS1-style translucent cloud sprites
    for (let i = 0; i < 9; i++) {
      const u = (i / 8 - 0.5), q = A3(p, [u * w * 0.85 + sin(i * 3.7 + seed) * w * 0.05, sin(i * 2.3 + seed) * h * 0.18 - Math.abs(u) * h * 0.3, i * 0.01]);
      const sz = w * (0.22 + 0.08 * cos(i * 1.9 + seed)) * (1 - Math.abs(u) * 0.6);
      X.draw(X.M.puff(), X.bill(cam, q, sz, sz * h / w * 1.6, i + seed), { color: i % 3 ? color : U.shade(color, -0.25), alpha, blend: 'alpha' });
      X.draw(X.M.puff(), X.bill(cam, A3(q, [0, sz * 0.1, 0.02]), sz * 0.6, sz * 0.5 * h / w * 1.6, i * 2 + seed), { color: '#e8f0ff', alpha: alpha * 0.45, blend: 'alpha' });
    }
  };
  H.moon = (cam, p, r, alpha = 1) => {
    X.glow(cam, p, r * 1.9, '#c8b890', 0.35 * alpha);
    X.draw(X.M.solidDisc(), X.bill(cam, p, r, r), { color: '#d8c898', alpha, blend: 'alpha' });
    const img = X.img('ODIN1_0000/ODIN2_0000'), m = img && X.frameMesh('ODIN1_0000/ODIN2_0000', 1);
    if (m) X.draw(m, X.bill(cam, p, r * 2 / m.aspect * 1.0, r * 2 * 0.98), { color: '#a08a60', alpha: 0.85 * alpha, tex: img, blend: 'alpha' });
    else for (let i = 0; i < 7; i++) X.draw(X.M.solidDisc(), X.bill(cam, A3(p, [cos(i * 2.4) * r * 0.5, sin(i * 1.7) * r * 0.5, 0.01]), r * (0.12 + (i % 3) * 0.06), r * (0.12 + (i % 3) * 0.06)), { color: '#9a8a68', alpha: 0.6 * alpha, blend: 'alpha' });
  };

  // ================================================================== ODIN - Steel-bladed Sword / Gunge Lance  (ref ~23 s)
  // night falls -> a full moon rises out of the clouds -> Odin's silhouette on a crag before the moon ->
  // close-up, Zantetsuken raised -> Sleipnir gallops through the dark -> one sweeping blue slash through the
  // enemies -> they fall (instant death) -> Odin rides off into the sky.  Gunge Lance (no one can die):
  // he charges and hurls his lance through one enemy.
  SEQ.odin = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.62, gunge = hk.variant === 'gunge';
    yield* S.cast();
    // --- shot 1-2: the arena darkens, camera tilts up into a night sky
    S.dimTo('#02040c', 0.85, 60);
    S.camMove(60, [E0[0] + 2, 1.0, E0[2] + 6], [E0[0], 0.4, E0[2]], [E0[0] + 2, 1.0, E0[2] + 6], [E0[0], 3.5, E0[2] - 6], 46, 46);
    yield 60;
    S.envOn({ fill: '#02040a', sky: moonSky() });
    S.enemies('hide');
    // the moon set: camera at the origin of a private stage far below the arena
    const O = [0, -60, 0], MOON = A3(O, [0, 7, -60]);
    const moon = { y: -22 };
    const crags = [[-9, 0, -28, 5, 3], [-2.5, 0, -30, 3.2, 5.5], [6, 0, -27, 4.5, 3.4], [12, 0, -31, 6, 2.8], [-15, 0, -32, 6, 3]];
    S.env.push({ draw: (cam) => {
      H.moon(cam, A3(MOON, [0, moon.y, 0]), 11);
      H.cloud(cam, A3(O, [-19, 12, -52]), 30, 9, '#7a98c8', 0.9, 0); H.cloud(cam, A3(O, [21, 11, -50]), 30, 8, '#88a4d0', 0.85, 2);
      H.cloud(cam, A3(O, [2, 0.5, -46]), 56, 6, '#4a6488', 0.8, 5);
      for (const c of crags) X.draw(H.cragMesh(3 + c[0], '#050608'), X.trs(A3(O, [c[0], -1, c[2]]), [0, c[0], 0], [c[3], c[4], c[3] * 0.7]), { blend: null });
    } });
    // --- shot 3: the moon rises through the clouds
    S.camMove(360, A3(O, [0, 2, 0]), A3(O, [0, 5, -60]), A3(O, [0, 2.4, 2]), A3(O, [0, 7, -60]), 30, 30, 'lin');
    S.track(360, (k) => { moon.y = lerp(-20, 0, k); }, 'out');
    yield 360;
    // --- shot 4: Odin's silhouette on the crag before the moon
    const od = S.actor(build('odin'), { pos: A3(O, [-2.5, 5.2, -30]), rot: [0, 0.4, 0], scale: SC * 1.2, tint: [0, 0, 0.02, 1] });
    od.drawOpts = { unlit: true };
    let ph = 0, gal = 0;
    od.pose = (m, t) => { if (gal) { ph += 0.3; H.gallop(m, ph, gal); } const B_ = m.bones; B_.armR.rot[0] = -0.1 + sin(t * 0.04) * 0.04; B_.head.rot[0] = sin(t * 0.05) * 0.06; };
    S.camMove(180, A3(O, [0.5, 3.5, 4]), A3(O, [-1.5, 7, -30]), A3(O, [0, 3.8, -4]), A3(O, [-2, 7.5, -30]), 26, 24, 'lin');
    yield 180;
    // --- shot 5: close: Odin on Sleipnir, Zantetsuken glowing blue, moon behind
    od.tint = null; od.drawOpts = null;
    const OC = A3(O, [0, 0, -12]);
    od.pos = OC.slice(); od.rot = [0, 0.3, 0]; od.scale = SC;
    const bladeTip = () => S.bp(od, 'armR', [-1.69, 8.9, -0.29]);
    const glow = S.fxT(200, (cam, k, age) => { const tp = bladeTip(), hilt = S.bp(od, 'armR', [-1.17, 7.25, 0.4]); X.glow(cam, tp, 1.4 + sin(age * 0.2) * 0.2, '#4080ff', 0.8); X.glow(cam, L3(tp, hilt, 0.5), 2.2, '#2050ff', 0.5); });
    S.camMove(120, A3(OC, [2.8, 3.6, 5.2]), A3(OC, [0, 3.4, 0]), A3(OC, [2.2, 3.4, 4.4]), A3(OC, [0, 3.6, 0]), 42, 40);
    yield 120;
    // --- shot 6: gallop through the dark (side view, background black)
    gal = 1; S.sfx('run', 0.7);
    S.env.length = 0;
    S.loop(() => { od.pos[0] -= 0.12; });
    S.camPath(120, () => ({ eye: A3(od.pos, [-1.2, 2.2, 7.2]), target: A3(od.pos, [-0.5, 1.8, 0]), fov: 44 }), 'lin');
    yield 120;
    S.remove(glow); od.visible = false;
    S.envOff(); S.enemies('battle'); S.dimTo('#02040c', 0.45, 10);
    if (!gunge) {
      // --- shot 7: the enemies, waiting
      S.setCam([E0[0] + 3.0, 1.6, E0[2] + 5.4], [E0[0], 0.9, E0[2]], 44);
      yield 60;
      // --- shot 8: Zantetsuken - one great blue arc sweeps through them
      od.visible = true; gal = 1.2; S.untrack(S.tracks.find(t => t.loop && t !== S.camTr));
      const R0 = S.Ew + 2.4;
      S.track(140, (k) => { const an = lerp(-2.2, 2.4, k); od.pos = [E0[0] + sin(an) * R0, 0, E0[2] + cos(an) * R0]; od.rot = [0, an + PI / 2 + PI, 0]; }, 'lin');
      const arc = S.fxT(150, (cam, k, age) => {
        const sweep = Math.min(1, age / 130), fade = age > 130 ? 1 - (age - 130) / 20 : 1;
        for (let i = 0; i < 3; i++) X.draw(X.M.crescent(), X.trs([E0[0], 1.1 + i * 0.25, E0[2]], [0, -2.2 + sweep * 4.6 - 1.7, 0.05 * i], [R0 * (1 - i * 0.08), 1, R0 * (1 - i * 0.08)]), { color: i ? '#a0d8ff' : '#4088ff', alpha: 0.85 * fade });
        X.draw(X.M.disc(), X.trs([E0[0], 1.0, E0[2]], [-PI / 2, 0, 0], [R0 * 1.2, R0 * 1.2, 1]), { color: '#80c0ff', alpha: 0.25 * fade * sweep });
      });
      S.sfx('hit'); S.sfx('crit', 0.7);
      S.camMove(150, [E0[0] + 1.5, 6.5, E0[2] + 5.5], [E0[0], 0.5, E0[2]], [E0[0] - 1.0, 7.0, E0[2] + 5.0], [E0[0], 0.5, E0[2]], 50, 50, 'lin');
      yield 150;
      // --- shot 9: he rides past the camera, white flash
      S.flash('#e8f4ff', 20, 0.9);
      S.dimTo('#02040c', 0, 20);
      yield 16;
      // --- shot 10: the enemies are cut down
      od.visible = false; S.remove(arc);
      S.fxT(40, (cam, k) => ts.forEach(t => { const p = S.b.hitPos(t); X.draw(X.M.quad(), X.bill(cam, p, 3.2, 0.06 + (1 - k) * 0.1, -0.35), { color: '#c0e0ff', alpha: 1 - k }); }));
      const rc = S.resultCam(); S.setCam(rc.eye, rc.target, rc.fov);
      S.camMove(90, rc.eye, rc.target, A3(rc.eye, [-0.4, 0, -0.5]), rc.target, 42, 42, 'lin');
      yield 4;
      hk.impact(0);
      yield 86;
      // --- shot 11: Odin rides up into the sky
      od.visible = true; gal = 1; od.alpha = 1;
      const U0 = [E0[0] + 3, 0, E0[2] - 2];
      S.track(80, (k) => { od.pos = [U0[0] - k * 3, k * 9, U0[2] - k * 6]; od.rot = [-0.5, PI + 0.4, 0]; od.alpha = 1 - Math.max(0, k - 0.6) / 0.4; od.add = [k * 0.6, k * 0.6, k * 0.7]; }, 'in');
      S.camMove(80, [E0[0] + 1, 1.2, E0[2] + 6], [U0[0], 2, U0[2]], [E0[0] + 1, 1.2, E0[2] + 6], [U0[0] - 2, 7, U0[2] - 5], 50, 50);
      yield 80;
    } else {
      // --- Gunge Lance: he charges one enemy and the lance runs it through
      const t0 = hk.plan.single || ts[0], tp = S.b.hitPos(t0);
      od.visible = true; gal = 1.2;
      const from = [tp[0] + 9, 0, tp[2] + 4], to = [tp[0] + 2, 0, tp[2] + 1];
      od.rot = [0, Math.atan2(to[0] - from[0], to[2] - from[2]), 0];
      S.track(60, (k) => { od.pos = L3(from, to, k); }, 'lin');
      S.camMove(60, [tp[0] + 2, 1.4, tp[2] + 5.5], [from[0], 1.5, from[2]], [tp[0] + 2, 1.4, tp[2] + 5.5], [to[0], 1.5, to[2]], 46, 46, 'lin');
      yield 50;
      const lance = { p: [0, 0, 0] };
      lance.p = bladeTip();
      S.fxT(20, (cam, k) => { const q = L3(lance.p, tp, E.in(k)); X.beam(L3(lance.p, tp, Math.max(0, E.in(k) - 0.25)), q, 0.07, '#c0d8ff', 1); X.glow(cam, q, 0.8, '#a0c0ff', 1); });
      yield 20;
      S.flash('#ffffff', 12, 0.7); S.shake(6, 16); S.sfx('hit');
      H.boom(S, tp, 0.8, { color: '#80a0ff', core: '#ffffff' });
      hk.impact(0);
      S.dimTo('#02040c', 0, 20);
      S.showResult(80);
      yield 80;
    }
    yield* S.outro();
  };
  SEQ.odin.frames = 1450;

  // ================================================================== LEVIATHAN - Tidal Wave  (ref ~21 s)
  // low shot among the enemies -> bubbles rise -> a sphere of water gathers and bursts -> Leviathan rears
  // up out of the dark water -> a great dome of water swells behind it -> the wave floods the arena
  // (camera goes under the surface) -> damage on the water
  SEQ.leviathan = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.78;
    yield* S.cast();
    const WATER = 'RIVA_0000/RIVA_0000';
    const bub = S.add(new X.Particles({ keep: true, fade: [4, 10] }));
    const bubTr = S.loop((f) => { if (f % 2 === 0) bub.ps.emit(2, () => ({ p: [E0[0] + (Math.random() - 0.5) * 6, 0.1, E0[2] + (Math.random() - 0.5) * 4], v: [0, 0.02 + Math.random() * 0.03, 0], life: 120, size: 0.08 + Math.random() * 0.1, color: '#4080ff', alpha: 0.9 })); });
    S.dimTo('#000818', 0.55, 40);
    // --- shot 1: low among the enemies, bubbles rising
    S.camMove(150, [E0[0] + 1.6, 0.4, E0[2] + 2.8], [E0[0] - 0.3, 1.4, E0[2]], [E0[0] + 1.3, 0.5, E0[2] + 2.4], [E0[0] - 0.3, 2.2, E0[2]], 50, 50, 'lin');
    yield 150;
    // --- shot 2: a sphere of water gathers above them
    const SPH = [E0[0], 3.2, E0[2] + 0.3], sp = { r: 0.1 };
    const sphere = S.fxT(200, (cam, k, age) => {
      const img = X.img(WATER), mesh = img ? X.frameUV(X.M.sphere(), WATER, 1) : X.M.sphere(), wtex = img || X.ptex('water');
      X.draw(mesh, X.trs(SPH, [age * 0.01, age * 0.02, 0], sp.r), { color: '#80b8ff', alpha: 0.75, tex: wtex });
      X.glow(cam, SPH, sp.r * 2.2, '#2060ff', 0.6);
    });
    S.track(140, (k) => { sp.r = lerp(0.1, 1.6, k); }, 'out');
    S.camMove(140, [E0[0] + 2.4, 0.8, E0[2] + 5.6], [SPH[0], 2.6, SPH[2]], [E0[0] + 2.0, 0.8, E0[2] + 5.0], [SPH[0], 3.0, SPH[2]], 50, 50, 'lin');
    S.sfx('magic');
    yield 140;
    // --- shot 3: it bursts into flying water shards
    S.remove(sphere); S.flash('#a0d0ff', 10, 0.6); S.sfx('ice', 0.6);
    const cubes = S.add(new X.Particles({ world: true, mesh: X.M.quad(), blend: 'add', fade: [1, 20], drag: 0.97 }));
    const img0 = X.img(WATER);
    cubes.ps.emit(70, () => { const u = Math.random() * 2 - 1, th = Math.random() * PI * 2, r = Math.sqrt(1 - u * u), sp0 = 0.08 + Math.random() * 0.12; return { p: SPH.slice(), v: [r * cos(th) * sp0, u * sp0, r * sin(th) * sp0], life: 60, size: 0.3 + Math.random() * 0.5, color: '#70b0ff', alpha: 0.9, rot: [Math.random() * 6, Math.random() * 6, 0], fn: (q) => { q.rot[0] += 0.1; q.rot[1] += 0.07; } }; });
    if (img0) cubes.ps.o.tex = WATER, cubes.ps.o.frames = [3];
    S.camMove(60, [SPH[0] + 1.5, 2.5, SPH[2] + 4.2], SPH, [SPH[0] + 1.2, 2.6, SPH[2] + 3.6], SPH, 52, 54);
    yield 60;
    // --- shot 4-5: Leviathan rears up out of the dark water (head and neck close, black background)
    S.untrack(bubTr);
    const LP = [E0[0] + 0.6, 0, E0[2] - 4.2];
    const lev = S.actor(build('leviathan'), { pos: [LP[0], -9, LP[2]], rot: [0, 0, 0], scale: SC });
    lev.pose = (m, t) => { const B_ = m.bones; for (let i = 0; i < 6; i++) if (B_['seg' + i]) { B_['seg' + i].rot[2] += sin(t * 0.05 + i * 0.7) * 0.05; B_['seg' + i].rot[0] += sin(t * 0.04 + i) * 0.03; } B_.jaw.rot[0] = 0.15 + sin(t * 0.08) * 0.15; B_.head.rot[1] = sin(t * 0.03) * 0.3; B_.wingL.rot[2] = sin(t * 0.1) * 0.2; B_.wingR.rot[2] = -sin(t * 0.1) * 0.2; };
    const pool = { r: 0 };
    S.env.push({ draw: (cam) => { if (pool.r > 0.01) { const img = X.img(WATER); X.draw(X.M.solidDisc(), X.trs([LP[0], 0.05, LP[2]], [-PI / 2, 0, 0], [pool.r, pool.r, 1]), { color: '#10306a', alpha: 0.9, blend: 'alpha' }); X.draw(img ? X.frameUV(X.grid(1), WATER, 0) : X.grid(1), X.trs([LP[0], 0.07, LP[2]], [0, S.t * 0.002, 0], [pool.r * 0.7, 1, pool.r * 0.7]), { color: '#80b0f0', alpha: 0.7, tex: img || X.ptex('water') }); } } });
    S.track(40, (k) => { pool.r = k * 7; }, 'out');
    S.track(190, (k) => { lev.pos[1] = lerp(-8.5, -0.5, k); }, 'out');
    S.dimTo('#000410', 0.9, 20);
    const head = () => S.bp(lev, 'head', [0.2, 7.9, 1.5]);
    S.camPath(150, (k) => { const h = head(); return { eye: A3(h, [2.8 - k * 0.6, -0.6, 3.6]), target: A3(h, [0, -0.6, 0]), fov: 44 }; }, 'lin');
    S.sfx('howl', 0.6);
    yield 150;
    S.camPath(120, (k) => { const h = head(); return { eye: A3(h, [-3.2 + k * 0.8, 0.2, 3.2]), target: A3(h, [0, -0.8, 0]), fov: 46 }; }, 'lin');
    yield 120;
    // --- shot 6: from behind the enemies: Leviathan above them, the water swelling behind it
    S.dimTo('#000410', 0.5, 20);
    const dome = { h: 0 };
    const domeFx = S.fxT(400, (cam, k, age) => {
      if (dome.h < 0.01) return;
      const img = X.img(WATER), mesh = img ? X.frameUV(X.M.dome(), WATER, 1) : X.M.dome();
      X.draw(mesh, X.trs([LP[0], -0.2, LP[2] - 2], [0, age * 0.004, 0], [10 * dome.w, 9 * dome.h, 8 * dome.w]), { color: '#4088e0', alpha: 0.85, tex: img || X.ptex('water'), blend: 'alpha' });
      X.draw(X.M.domeGlow(), X.trs([LP[0], -0.2, LP[2] - 2], [0, 0, 0], [10.2 * dome.w, 9.2 * dome.h, 8.2 * dome.w]), { color: '#80c8ff', alpha: 0.3 });
    });
    dome.w = 1;
    S.track(200, (k) => { dome.h = k; }, 'in');
    S.camMove(200, [E0[0] + 0.6, 0.8, E0[2] + 5.4], [LP[0], 3.8, LP[2]], [E0[0] + 0.4, 0.9, E0[2] + 4.2], [LP[0], 5.0, LP[2]], 52, 56, 'lin');
    S.sfx('magic');
    yield 200;
    // --- shot 7: the wave breaks over everything: the camera goes under the surface
    lev.visible = false; S.remove(domeFx);
    S.flash('#c0e0ff', 14, 0.7); S.shake(6, 40); S.sfx('ice', 0.5);
    const lvl = { y: 0 };
    const flood = S.fxT(260, (cam, k, age) => {
      const img = X.img(WATER);
      X.draw(X.grid(1), X.trs([E0[0], lvl.y - 0.02, E0[2]], [0, 0, 0], [30, 1, 30]), { color: '#1a4ea8', alpha: 0.8, blend: 'alpha' });
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) X.draw(img ? X.frameUV(X.grid(1), WATER, 0) : X.grid(1), X.trs([E0[0] + i * 6 + sin(age * 0.02) * 0.5, lvl.y, E0[2] + j * 6], [0, 0, 0], [3, 1, 3]), { color: '#a0d0ff', alpha: 0.8, tex: img || X.ptex('water') });
    });
    S.track(40, (k) => { lvl.y = k * 1.4; }, 'out');
    S.camMove(150, [E0[0] + 1.5, 4.5, E0[2] + 5.5], [E0[0], 1.0, E0[2]], [E0[0] + 1.0, 3.8, E0[2] + 4.5], [E0[0], 1.0, E0[2]], 48, 48, 'lin');
    yield 60;
    hk.impact(0);
    yield 90;
    S.track(40, (k) => { lvl.y = 1.4 - k * 1.6; }, 'in');
    S.dimTo('#000410', 0, 30);
    yield 50;
    S.remove(flood);
    yield* S.outro();
  };
  SEQ.leviathan.frames = 1240;

  // ================================================================== KUJATA - Tetra-Disaster  (ref ~26 s)
  // white flash -> violet lightning rains on the enemies -> a crystal dome of ice shards closes over them
  // and shatters -> embers swirl into a vortex of fire, flame arcs, a pillar of light -> Kujata stands
  // behind the enemies as the damage lands
  SEQ.kujata = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.85;
    yield* S.cast();
    S.dimTo('#04020a', 0.72, 20);
    // --- lightning (violet) rains down
    S.flash('#ffffff', 20, 1); S.sfx('bolt');
    const W = S.Ew + 1.5;
    const rain = S.loop((f) => {
      if (f > 290) return;
      if (f % 4 === 0) { const p = [E0[0] + (Math.random() - 0.5) * W * 2, 0, E0[2] + (Math.random() - 0.5) * W * 1.2]; H.lightning(S, A3(p, [(Math.random() - 0.5) * 2, 14, 0]), p, 14, { color: '#e060ff', glowCol: '#ff60ff', glow: 1.0, width: 0.25, seed: f, flicker: false }); }
      if (f % 20 === 0) S.sfx('bolt', 0.5);
    });
    S.camMove(130, [E0[0] + 1.4, 4.0, E0[2] + 6.0], [E0[0], 0.6, E0[2]], [E0[0] + 1.0, 3.6, E0[2] + 5.4], [E0[0], 0.6, E0[2]], 50, 50, 'lin');
    yield 130;
    S.camMove(170, [E0[0] - 2.5, 6.5, E0[2] + 7.5], [E0[0], 0, E0[2]], [E0[0] - 2.8, 7.0, E0[2] + 8.0], [E0[0], 0, E0[2]], 50, 50, 'lin');
    yield 170;
    S.untrack(rain);
    // --- ice: a dome of crystal shards closes over them, then shatters
    const ice = { r: 0, a: 1 };
    const iceFx = S.fxT(240, (cam, k, age) => {
      if (ice.r <= 0.01) return;
      X.draw(X.M.shards(), X.trs([E0[0], 1.0, E0[2]], [0, age * 0.01, 0], [W * 1.25 * ice.r, 2.8 * ice.r, W * 0.9 * ice.r]), { color: '#a8e0ff', alpha: 0.75 * ice.a, blend: 'alpha' });
      X.draw(X.M.dome(), X.trs([E0[0], 0, E0[2]], [0, 0, 0], [W * 1.3 * ice.r, 3.4 * ice.r, W * ice.r]), { color: '#406080', alpha: 0.35 * ice.a });
      X.draw(X.M.domeGlow(), X.trs([E0[0], 0, E0[2]], [0, 0, 0], [W * 1.32 * ice.r, 3.45 * ice.r, W * 1.02 * ice.r]), { color: '#c0f0ff', alpha: 0.35 * ice.a });
    });
    S.track(110, (k) => { ice.r = k; }, 'back');
    S.sfx('ice');
    S.camMove(170, [E0[0] + 2.0, 2.0, E0[2] + 7.8], [E0[0], 1.2, E0[2]], [E0[0] + 1.4, 1.8, E0[2] + 7.0], [E0[0], 1.2, E0[2]], 48, 48, 'lin');
    yield 170;
    S.flash('#ffffff', 16, 1); S.sfx('ice'); S.remove(iceFx);
    const shards = S.add(new X.Particles({ world: true, mesh: X.M.shard1(), blend: 'alpha', fade: [1, 20], drag: 0.98 }));
    shards.ps.emit(80, () => { const u = Math.random(), th = Math.random() * PI * 2, sp = 0.05 + Math.random() * 0.12; return { p: [E0[0] + cos(th) * W * u, 0.3 + Math.random() * 3, E0[2] + sin(th) * W * 0.7 * u], v: [cos(th) * sp, (Math.random() - 0.3) * 0.08, sin(th) * sp], life: 80, size: 0.2 + Math.random() * 0.35, color: '#d0f0ff', alpha: 0.95, rot: [Math.random() * 6, Math.random() * 6, 0], fn: (q) => { q.rot[0] += 0.15; q.rot[2] += 0.1; } }; });
    S.camMove(90, [E0[0] + 0.5, 7.5, E0[2] + 5.5], [E0[0], 0, E0[2]], [E0[0] + 0.3, 8.0, E0[2] + 5.0], [E0[0], 0, E0[2]], 52, 52, 'lin');
    yield 90;
    // --- fire: embers swirl into a vortex, a fire eruption, flame arcs, a light pillar
    const emb = S.add(new X.Particles({ keep: true, fade: [4, 10] }));
    const embTr = S.loop((f) => { if (f < 180 && f % 2 === 0) emb.ps.emit(3, () => { const th = Math.random() * PI * 2, r = 1 + Math.random() * W; return { p: [E0[0] + cos(th) * r, Math.random() * 2, E0[2] + sin(th) * r * 0.7], v: [0, 0.01, 0], life: 60, size: 0.18, color: '#ffa030', alpha: 1, th, r, fn: (q) => { q.th += 0.06; q.r *= 0.985; q.p[0] = E0[0] + cos(q.th) * q.r; q.p[2] = E0[2] + sin(q.th) * q.r * 0.7; } }; }); });
    S.camMove(190, [E0[0] + 1.0, 6.0, E0[2] + 7.0], [E0[0], 0.5, E0[2]], [E0[0] + 0.6, 5.2, E0[2] + 6.4], [E0[0], 0.8, E0[2]], 50, 50, 'lin');
    yield 130;
    S.sfx('fire2'); S.shake(5, 50);
    S.fxT(200, (cam, k, age) => {
      const g = Math.min(1, age / 30), fade = age > 170 ? (200 - age) / 30 : 1;
      X.draw(X.M.spiral(), X.trs([E0[0], 0.2, E0[2]], [0, -age * 0.08, 0], [W * 1.3 * g, 1, W * g]), { color: '#ff5010', alpha: 0.8 * fade });
      X.draw(X.M.funnel(), X.trs([E0[0], 0, E0[2]], [0, age * 0.1, 0], [W * 0.9 * g, 4.5 * g, W * 0.7 * g]), { color: '#ff7020', alpha: 0.6 * fade });
      X.glow(cam, [E0[0], 1.2, E0[2]], W * 1.8 * g, '#ffc050', 0.7 * fade);
    });
    const fireTr = S.loop((f) => { if (f < 190 && f % 3 === 0) H.fire(S, [E0[0], 0.2, E0[2]], 3, { spread: W, size: 1.2, life: 45, up: 0.06 }); });
    yield 60;
    S.untrack(embTr); S.remove(emb);
    S.camMove(150, [E0[0] + 3.0, 1.6, E0[2] + 6.5], [E0[0], 1.8, E0[2]], [E0[0] + 2.4, 1.6, E0[2] + 5.8], [E0[0], 2.2, E0[2]], 50, 50, 'lin');
    // flame arcs
    for (let i = 0; i < 3; i++) S.after(20 + i * 25, () => { const x0 = E0[0] - W + i * W * 0.8; S.fxT(60, (cam, k) => { for (let j = 0; j < 8; j++) { const u = j / 7, p = [x0 + u * W * 1.2, sin(u * PI) * 3.2 * Math.min(1, k * 2), E0[2] + 0.5 - i * 0.4]; X.glow(cam, p, 1.3, '#ff8020', 0.8 * (1 - k)); X.glow(cam, p, 0.6, '#ffe080', 0.9 * (1 - k)); } }); });
    yield 150;
    S.untrack(fireTr);
    // pillar of white light, rays, flash
    S.fxT(60, (cam, k) => { X.beam([E0[0], 0, E0[2]], [E0[0], 30, E0[2]], 1.2 + k * 2, '#fff8e0', (1 - k) * 0.9, X.M.cylMid()); X.draw(X.M.rays(), X.bill(cam, [E0[0], 1, E0[2]], 8 * (0.5 + k), 8 * (0.5 + k), k), { color: '#fff0c0', alpha: 1 - k }); });
    S.dimTo('#04020a', 0.3, 20);
    yield 60;
    S.flash('#ffffff', 30, 1);
    yield 10;
    // --- Kujata appears behind the enemies; the damage lands
    S.dimTo('#04020a', 0.15, 20);
    const KP = [E0[0] + 0.4, 0, E0[2] - 4.6];
    const kj = S.actor(build('kujata'), { pos: KP, rot: [0, 0, 0], scale: SC, alpha: 0 });
    kj.pose = (m, t) => { const B_ = m.bones; B_.head.rot[0] = 0.15 + sin(t * 0.04) * 0.08; B_.tail.rot[1] = sin(t * 0.06) * 0.3; B_.legFL.rot[0] = sin(t * 0.05) * 0.06; };
    S.track(30, (k) => { kj.alpha = k; }, 'lin');
    S.camMove(200, [KP[0] + 4.5, 2.2, KP[2] + 7.5], [KP[0], 1.8, KP[2] + 1], [KP[0] + 3.8, 2.0, KP[2] + 6.8], [KP[0], 2.0, KP[2] + 1], 50, 50, 'lin');
    yield 160;
    S.camMove(150, [E0[0] + 2.4, 2.4, E0[2] + 6.2], [E0[0], 1.5, E0[2] - 1], [E0[0] + 2.0, 2.2, E0[2] + 5.8], [E0[0], 1.5, E0[2] - 1], 46, 46, 'lin');
    yield 40;
    hk.impact(0);
    yield 100;
    S.track(30, (k) => { kj.alpha = 1 - k; }, 'lin');
    S.dimTo('#04020a', 0, 30);
    yield 30;
    yield* S.outro();
  };
  SEQ.kujata.frames = 1520;

  // ================================================================== BAHAMUT - Mega Flare  (ref ~27 s)
  // blackness -> a vortex of cloud opens in the sky -> a glowing orb in its eye; Bahamut unfurls from it ->
  // flies at the camera through the void -> high over the arena -> in profile, light converges into its
  // jaws -> the flare falls onto the arena -> explosion
  const voidSky = () => X.skyDome('void', [[-1, '#000000'], [1, '#02020a']]);
  H.vortex = (cam, p, size, rot, color, alpha, facingUp = true) => {
    const img = X.img('VAHAMUT_0000/VAHAMUT_0000'), m = img && X.frameMesh('VAHAMUT_0000/VAHAMUT_0000', 3);
    const M_ = facingUp ? X.trs(p, [-PI / 2, rot, 0], size) : X.bill(cam, p, size, size, rot);
    if (m) X.draw(m, M_, { color, alpha, tex: img, blend: 'add' });
    else { X.draw(X.M.spiral(), facingUp ? X.trs(p, [0, rot, 0], [size * 0.5, 1, size * 0.5]) : X.orient(p, V.scale(X.basis(cam).u, size * 0.5), size * 0.5, 1, size * 0.5), { color, alpha: alpha * 0.8 }); X.glow(cam, p, size * 0.4, color, alpha * 0.8); }
  };
  SEQ.bahamut = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.62;
    yield* S.cast();
    S.envOn({ fill: '#000000', sky: voidSky() }); S.enemies('hide');
    const O = [0, 60, 0];
    // --- the cloud vortex in the black sky (seen from below)
    const vx = { s: 2, a: 0.1, orb: 0 };
    S.env.push({ draw: (cam) => { H.vortex(cam, A3(O, [0, 30, 0]), vx.s * 1.6, -S.t * 0.01, '#a8b0e8', vx.a); H.vortex(cam, A3(O, [0, 29, 0]), vx.s, S.t * 0.017, '#e0e8ff', vx.a * 0.8); if (vx.orb > 0) { X.glow(cam, A3(O, [0, 28, 0]), vx.orb * 7, '#c0c8ff', 1); X.glow(cam, A3(O, [0, 28, 0]), vx.orb * 3, '#ffffff', 1); } } });
    S.track(300, (k) => { vx.s = lerp(6, 60, k); vx.a = Math.min(1, k * 3); }, 'out');
    S.setCam(O, A3(O, [0.01, 30, 0.2]), 60);
    S.camPath(300, (k) => ({ eye: A3(O, [0, k * 6, 0]), target: A3(O, [0.01, 30, 0.2]), fov: 60 }), 'lin');
    S.sfx('summon', 0.6);
    yield 300;
    // --- the orb swells in the eye of the vortex; a diamond of light turns in it
    S.track(90, (k) => { vx.orb = k * 1.4; }, 'in');
    const ORB = A3(O, [0, 28, 0]);
    S.fxT(170, (cam, k, age) => { if (age < 60) return; const kk = Math.min(1, (age - 60) / 40); X.draw(X.M.quad(), X.trs(A3(ORB, [0, -0.5, 0]), [PI / 2, age * 0.02, 0], 8 * kk), { color: '#8080a0', alpha: 0.5 * kk }); });
    const bh = S.actor(build('bahamut'), { pos: A3(ORB, [0, -3, 0]), rot: [PI / 2, PI, 0], scale: SC * 0.1, alpha: 0 });
    const wing = { k: 0.3 };
    bh.pose = (m, t) => { const B_ = m.bones; B_.wingL.rot[2] = -0.6 * (1 - wing.k) + sin(t * 0.07) * 0.15 * wing.k; B_.wingR.rot[2] = 0.6 * (1 - wing.k) - sin(t * 0.07) * 0.15 * wing.k; B_.wingL.rot[1] = -0.3 * (1 - wing.k); B_.wingR.rot[1] = 0.3 * (1 - wing.k); B_.tail.rot[0] = 0.3 + sin(t * 0.05) * 0.1; B_.armL.rot[0] = -0.4; B_.armR.rot[0] = -0.4; B_.head.rot[0] = 0.2; };
    S.camMove(170, A3(O, [0, 12, 6]), ORB, A3(O, [0, 16, 4]), ORB, 44, 40, 'lin');
    yield 90;
    // --- Bahamut emerges from the orb
    S.track(100, (k) => { bh.scale = SC * lerp(0.1, 1, k); bh.alpha = Math.min(1, k * 2); wing.k = k; }, 'out');
    yield 100;
    vx.a = 0; vx.orb = 0;
    // --- in the void: it flies toward the camera, wings spreading
    const V0 = [0, 100, 0];
    S.env.length = 0;
    bh.pos = A3(V0, [0, 0, -30]); bh.rot = [0, 0, 0]; bh.alpha = 1; bh.scale = SC; bh.add = [0.05, 0.05, 0.08];
    S.track(240, (k) => { bh.pos = A3(V0, [0, sin(k * 3) * 0.4 - 4.5, lerp(-30, -10, k)]); }, 'out');
    S.setCam(A3(V0, [0, 0, 0]), A3(V0, [0, -1, -20]), 40);
    S.sfx('howl', 0.5);
    yield 240;
    // --- high above the arena, Bahamut's wing sweeping over
    bh.add = null;
    S.envOff(); S.enemies('battle'); S.dimTo('#000000', 0.4, 20);
    bh.pos = [E0[0] + 2, 12, E0[2] + 2]; bh.rot = [0.6, PI * 0.8, 0];
    S.track(180, (k) => { bh.pos = [E0[0] + 3 - k * 4, 12 + k, E0[2] + 3 - k * 2]; }, 'lin');
    S.camMove(180, [E0[0] + 1, 16, E0[2] + 8], [E0[0], 0, E0[2]], [E0[0] - 0.5, 17, E0[2] + 6], [E0[0], 0, E0[2]], 50, 50, 'lin');
    yield 180;
    // --- profile in the void: light converges into its jaws
    S.envOn({ fill: '#000000', sky: voidSky() }); S.enemies('hide');
    bh.pos = A3(V0, [0, -4.8, -8]); bh.rot = [0.2, PI / 2, 0];
    const jaw = () => S.bp(bh, 'head', [0, 6.32, 1.7]);
    const ch = { r: 0 };
    S.fxT(240, (cam, k, age) => {
      const j = jaw();
      if (age < 150) for (let i = 0; i < 18; i++) { const an = i * 2.4 + age * 0.03, len = 6 * (1 - ((age * 0.02 + i * 0.13) % 1)); const d = [cos(an), sin(an * 1.3), sin(an) * 0.5]; X.beam(A3(j, V.scale(d, len)), A3(j, V.scale(d, len * 0.6)), 0.02, '#ffe040', 0.9); }
      ch.r = Math.min(1, age / 140);
      X.glow(cam, j, 0.4 + ch.r * 2.2, '#ff80c0', 0.9); X.glow(cam, j, 0.2 + ch.r, '#ffffff', 1);
    });
    S.camMove(240, A3(V0, [-1.5, -1.0, -1.0]), A3(V0, [0, -1.2, -8]), A3(V0, [-1.2, -1.2, -2.2]), A3(V0, [0, -1.0, -8]), 44, 42, 'lin');
    bh.pose = ((prev) => (m, t, h) => { prev(m, t, h); m.bones.jaw.rot[0] = 0.5; m.bones.head.rot[0] = -0.1; })(bh.pose);
    S.sfx('magic');
    yield 240;
    // --- the Mega Flare falls
    bh.visible = false; S.envOff(); S.enemies('battle'); S.dimTo('#000000', 0.55, 1);
    const top = [E0[0], 25, E0[2]];
    S.fxT(60, (cam, k) => { X.beam(top, L3(top, [E0[0], 0, E0[2]], E.in(k)), 1.2, '#4060ff', 0.9); X.glow(cam, L3(top, [E0[0], 0, E0[2]], E.in(k)), 3, '#c0d0ff', 1); });
    S.camMove(60, [E0[0] + 3, 1.0, E0[2] + 7], [E0[0], 6, E0[2]], [E0[0] + 3, 1.0, E0[2] + 7], [E0[0], 1, E0[2]], 56, 56, 'lin');
    yield 60;
    S.flash('#ffc0f0', 24, 1); S.shake(12, 50); S.sfx('fire2'); S.sfx('bosskill', 0.5);
    S.fxT(120, (cam, k) => { const g = E.out(Math.min(1, k * 2)); X.draw(X.M.sphere(), X.trs([E0[0], 0, E0[2]], [0, 0, 0], [S.Ew * 2 * g, 3.5 * g, S.Ew * 1.5 * g]), { color: '#ff9030', alpha: 0.7 * (1 - k) }); X.draw(X.M.ring(), X.trs([E0[0], 0.5, E0[2]], [0, 0, 0], 3 + k * 12), { color: '#c040ff', alpha: 1 - k }); X.glow(cam, [E0[0], 1, E0[2]], 12 * g, '#ffe0a0', 0.8 * (1 - k)); });
    for (let i = 0; i < 10; i++) S.after(4 + i * 5, () => H.boom(S, [E0[0] + (Math.random() - 0.5) * S.Ew * 2.4, 0.5 + Math.random() * 2, E0[2] + (Math.random() - 0.5) * 3], 0.9));
    const rc = S.resultCam(4.2, 8.5);
    S.camMove(120, rc.eye, rc.target, A3(rc.eye, [-0.5, -0.2, -0.6]), rc.target, 46, 46, 'lin');
    yield 20;
    hk.impact(0);
    S.dimTo('#000000', 0, 40);
    yield 100;
    yield* S.outro();
  };
  SEQ.bahamut.frames = 1550;

  // ================================================================== ALEXANDER - Judgement  (ref ~26 s)
  // lights prick the ground -> a chain of explosions rips across it in the dark -> Alexander rises out of
  // the earth behind the enemies, fires at its feet -> towering close-ups -> its hands gather blue light ->
  // a shaft of light strikes, red rings mark the enemies -> the Judgement blast
  SEQ.alexander = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.62;
    yield* S.cast();
    const AP = [E0[0] + 0.6, 0, E0[2] - 6.5];
    S.dimTo('#050308', 0.5, 40);
    // --- shot 1: from above, lights prick the ground
    const lights = []; for (let i = 0; i < 14; i++) lights.push([E0[0] + (Math.random() - 0.5) * 12, 0.1, E0[2] - 3 + (Math.random() - 0.5) * 10]);
    S.fxT(150, (cam, k, age) => lights.forEach((p, i) => { if (age > i * 5) X.glow(cam, p, 0.5 + sin(age * 0.3 + i) * 0.15, '#ffe0a0', 0.9); }));
    S.camMove(60, [E0[0] + 1, 9, E0[2] + 5], [E0[0], 0, E0[2] - 2], [E0[0] + 0.5, 9.5, E0[2] + 4], [E0[0], 0, E0[2] - 2], 50, 50, 'lin');
    yield 60;
    // --- shot 2-3: explosions rip across the ground; darkness
    for (let i = 0; i < 14; i++) S.after(i * 15, () => { H.boom(S, A3(lights[i], [0, 0.4, 0]), 1.0 + Math.random() * 0.4, { n: 5 }); if (i % 3 === 0) { S.sfx('fire2', 0.6); S.shake(4, 10); } });
    S.camMove(290, [E0[0] - 4, 1.2, E0[2] + 3], [E0[0], 1, E0[2] - 4], [E0[0] - 4.5, 1.6, E0[2] + 2], [E0[0] + 1, 1.5, E0[2] - 5], 50, 50, 'lin');
    S.after(180, () => S.dimTo('#050308', 0.85, 40));
    yield 290;
    // --- shot 4: it rises out of the ground, fires at its feet (low camera, looking up)
    const al = S.actor(build('alexander'), { pos: [AP[0], -7, AP[2]], rot: [0, 0, 0], scale: SC });
    const pose = { arms: 0, head: 0 };
    al.pose = (m, t) => { const B_ = m.bones; B_.armL.rot[0] = -pose.arms * 1.3; B_.armR.rot[0] = -pose.arms * 1.3; B_.armL.rot[2] = pose.arms * 0.3; B_.armR.rot[2] = -pose.arms * 0.3; B_.head.rot[0] = pose.head; };
    S.track(300, (k) => { al.pos[1] = lerp(-6.2, 0, k); }, 'out');
    const base = S.loop((f) => { if (f % 6 === 0 && f < 370) H.boom(S, [AP[0] + (Math.random() - 0.5) * 5, 0.3, AP[2] + (Math.random() - 0.5) * 3], 0.9, { n: 3 }); if (f % 20 === 0 && f < 300) H.debris(S, [AP[0], 0.2, AP[2]], 5, { spread: 4, speed: 0.08, up: 0.2, size: 0.3, life: 60 }); });
    S.shake(6, 200); S.sfx('bosskill', 0.4);
    S.camMove(180, [AP[0] + 1.5, 0.3, AP[2] + 5.5], [AP[0], 2.5, AP[2]], [AP[0] + 1.0, 0.4, AP[2] + 4.8], [AP[0], 4.2, AP[2]], 56, 56, 'lin');
    yield 180;
    // --- shot 5: from afar, the fortress silhouette over the fires
    S.camMove(90, [AP[0] + 3, 2.5, AP[2] + 17], [AP[0], 3.5, AP[2]], [AP[0] + 2.5, 2.5, AP[2] + 16], [AP[0], 3.6, AP[2]], 40, 40, 'lin');
    yield 90;
    S.untrack(base);
    // --- shot 6: towering close-up of its torso, looking up
    S.dimTo('#050308', 0.6, 20);
    S.camMove(180, [AP[0] - 1.5, 2.2, AP[2] + 3.8], [AP[0], 5.2, AP[2]], [AP[0] - 1.9, 2.4, AP[2] + 3.4], [AP[0], 5.4, AP[2]], 56, 56, 'lin');
    yield 180;
    // --- shot 7: its face; the hands gather blue light
    S.track(60, (k) => { pose.arms = k * 0.8; pose.head = -0.1 * k; }, 'sine');
    const hands = () => [S.bp(al, 'armL', [2.8, 3.55, 1.2]), S.bp(al, 'armR', [-2.8, 3.55, 1.2])];
    S.fxT(180, (cam, k, age) => { const g = Math.min(1, age / 80); for (const h of hands()) { X.glow(cam, h, 1.6 * g, '#4070ff', 0.9); X.glow(cam, h, 0.7 * g, '#e0f0ff', 1); } });
    S.camMove(130, [AP[0] + 0.3, 4.9, AP[2] + 3.4], [AP[0], 4.8, AP[2]], [AP[0] + 0.3, 4.9, AP[2] + 3.0], [AP[0], 4.8, AP[2]], 44, 44, 'lin');
    S.sfx('magic');
    yield 130;
    // --- shot 8: the shaft of light strikes; red rings mark each enemy
    S.flash('#c0d0ff', 12, 0.6); S.sfx('bolt', 0.6);
    S.fxT(80, (cam, k) => { X.beam([E0[0], 30, E0[2]], [E0[0], 0, E0[2]], S.Ew * 0.9, '#6090ff', 0.6 * (1 - k), X.M.cylMid()); X.beam([E0[0], 30, E0[2]], [E0[0], 0, E0[2]], S.Ew * 0.4, '#e0f0ff', 0.7 * (1 - k)); });
    S.after(40, () => ts.forEach((t, i) => S.fxT(110, (cam, k) => { const p = S.foot(t); for (let r = 0; r < 2; r++) X.draw(X.M.ring(), X.trs(A3(p, [0, 0.05 + r * 0.02, 0]), [0, k * 2, 0], 1.2 + r * 0.5 + k * 0.4), { color: '#ff2020', alpha: 0.9 }); })));
    S.camMove(150, [E0[0] + 1.5, 7, E0[2] + 6], [E0[0], 0, E0[2]], [E0[0] + 1.2, 7.5, E0[2] + 5.4], [E0[0], 0, E0[2]], 50, 50, 'lin');
    yield 150;
    // --- shot 9: Judgement - fire erupts, a yellow blast, white
    al.visible = false;
    S.dimTo('#050308', 0.3, 20);
    ts.forEach(t => { const p = S.foot(t); H.fire(S, p, 12, { spread: 1.2, size: 1.8, life: 60, up: 0.1 }); });
    S.fxT(110, (cam, k) => { X.beam([E0[0], 0, E0[2]], [E0[0], 14, E0[2]], S.Ew * (0.5 + k), '#ffb040', 0.7 * (1 - k), X.M.cyl()); X.glow(cam, [E0[0], 1.5, E0[2]], (4 + k * 10), '#ffe080', 0.9 * (1 - k)); });
    S.shake(10, 80); S.sfx('fire2'); S.sfx('bosskill', 0.5);
    S.camMove(110, [E0[0] + 2.2, 1.2, E0[2] + 6.5], [E0[0], 2, E0[2]], [E0[0] + 2.6, 1.6, E0[2] + 7.5], [E0[0], 2.4, E0[2]], 54, 54, 'lin');
    yield 80;
    S.flash('#ffffff', 40, 1);
    yield 30;
    S.dimTo('#050308', 0, 10);
    hk.impact(0);
    S.showResult(80);
    yield 80;
    yield* S.outro();
  };
  SEQ.alexander.frames = 1490;

  // ================================================================== PHOENIX - Phoenix Flame  (ref ~18 s)
  // a golden glint in the gloom, sparkles -> fire bursts from the ground in a dome -> the Phoenix rises
  // through a column of flame, wings spread in yellow light -> a ring of rainbow -> it dives, rays of fire
  // rain over the enemies -> they burn; fallen allies are revived
  SEQ.phoenix = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.7;
    yield* S.cast();
    const P0 = [E0[0] + 0.8, 0, E0[2] + 3.2];
    S.dimTo('#060402', 0.6, 30);
    // --- shot 1: a golden glint, sparkles
    const g0 = [P0[0], 2.4, P0[2]];
    S.fxT(180, (cam, k, age) => { X.glow(cam, g0, 0.5 + sin(age * 0.3) * 0.1, '#ffd040', 1); X.draw(X.M.sparkle(), X.bill(cam, g0, 1.2, 1.2, age * 0.02), { color: '#fff0a0', alpha: 1 }); for (let i = 0; i < 3; i++) { const q = A3(g0, [cos(age * 0.05 + i * 2) * 1.2, sin(age * 0.07 + i) * 0.8, 0.2]); X.draw(X.M.sparkle(), X.bill(cam, q, 0.6, 0.6), { color: '#ffffff', alpha: 0.5 + 0.5 * sin(age * 0.2 + i) }); } });
    S.camMove(180, [P0[0] + 0.6, 2.2, P0[2] + 4.4], g0, [P0[0] + 0.4, 2.3, P0[2] + 3.6], g0, 44, 44, 'lin');
    S.sfx('heal2', 0.5);
    yield 180;
    // --- shot 2: fire bursts from the ground - a dome of flame
    const dome = { r: 0 };
    const domeFx = S.fxT(310, (cam, k, age) => { if (dome.r < 0.01) return; X.draw(X.M.domeGlow(), X.trs([P0[0], 0, P0[2]], [0, age * 0.02, 0], [3.2 * dome.r, 2.6 * dome.r, 3.2 * dome.r]), { color: '#ff9020', alpha: 0.8 }); X.glow(cam, [P0[0], 1, P0[2]], 5 * dome.r, '#ffe070', 0.6); });
    const fireTr = S.loop((f) => { if (f < 290 && f % 2 === 0) H.fire(S, [P0[0], 0.1, P0[2]], 3, { spread: 2.6 * Math.min(1, dome.r + 0.2), size: 1.2, life: 40, up: 0.05 }); });
    S.track(80, (k) => { dome.r = k; }, 'out');
    S.sfx('fire2');
    S.camMove(110, [P0[0] + 2.5, 1.2, P0[2] + 8], [P0[0], 1.2, P0[2]], [P0[0] + 2.2, 1.2, P0[2] + 7.4], [P0[0], 1.4, P0[2]], 48, 48, 'lin');
    yield 110;
    // --- shot 3: the Phoenix rises in a column of flame
    const ph = S.actor(build('phoenix'), { pos: [P0[0], -4, P0[2]], rot: [0, PI, 0], scale: SC });
    const wing = { k: 0 };
    ph.pose = (m, t) => { const B_ = m.bones; B_.wingL.rot[2] = lerp(-0.9, 0.2, wing.k) + sin(t * 0.12) * 0.25 * wing.k; B_.wingR.rot[2] = -lerp(-0.9, 0.2, wing.k) - sin(t * 0.12) * 0.25 * wing.k; B_.tail.rot[0] = 0.2 + sin(t * 0.08) * 0.15; B_.head.rot[0] = -0.2 + sin(t * 0.05) * 0.1; };
    S.track(120, (k) => { ph.pos[1] = lerp(-4, 1.5, k); }, 'out');
    S.fxT(200, (cam, k, age) => { X.beam([P0[0], 0, P0[2]], [P0[0], 16, P0[2]], 2.2, '#ffc030', 0.55 * Math.min(1, age / 20) * (1 - k), X.M.cyl()); X.beam([P0[0], 0, P0[2]], [P0[0], 16, P0[2]], 1.2, '#fff4c0', 0.5 * (1 - k), X.M.cyl()); });
    S.camMove(120, [P0[0] + 1.5, 0.8, P0[2] + 6], [P0[0], 3.0, P0[2]], [P0[0] + 1.2, 1.0, P0[2] + 5.2], [P0[0], 4.2, P0[2]], 52, 52, 'lin');
    yield 120;
    // --- shot 4: from below, spreading its wings in yellow light
    S.remove(domeFx); S.untrack(fireTr);
    S.track(60, (k) => { wing.k = k; }, 'out');
    S.fade('#ffe070', 0, 0.35, 20);
    S.camMove(120, [P0[0] + 0.6, 0.8, P0[2] + 3.2], A3(ph.pos, [0, 3.6, 0]), [P0[0] + 0.3, 0.8, P0[2] + 4.2], A3(ph.pos, [0, 3.8, 0]), 54, 54, 'lin');
    S.sfx('howl', 0.5);
    yield 120;
    // --- shot 5: a ring of rainbow behind it, darkness
    S.clearOverlays(); S.dimTo('#000000', 0.92, 10);
    const RB = ['#ff2020', '#ff9020', '#ffff30', '#30ff40', '#30a0ff', '#8040ff'];
    const rc0 = A3(ph.pos, [0, 3.6, -1.2]);
    S.fxT(70, (cam, k, age) => { RB.forEach((c, i) => X.draw(X.M.ring(), X.orient(rc0, V.scale(cam._basis.f, -1), 3.2 + i * 0.22, 1, 3.2 + i * 0.22), { color: c, alpha: 0.85 * Math.min(1, age / 15) })); });
    S.camMove(70, A3(ph.pos, [0.2, 3.6, 7.5]), A3(ph.pos, [0, 3.6, 0]), A3(ph.pos, [0.2, 3.6, 7.0]), A3(ph.pos, [0, 3.6, 0]), 46, 46, 'lin');
    yield 70;
    // --- shot 6-7: over the enemies, rays of fire raining down
    S.dimTo('#000000', 0.2, 10);
    ph.pos = [E0[0], 5.2, E0[2] + 1.2]; ph.rot = [0.35, PI, 0];
    S.fade('#ff9020', 0.1, 0.25, 40);
    S.fxT(250, (cam, k, age) => { X.draw(X.M.raysWide(), X.bill(cam, A3(ph.pos, [0, 3.2, 0]), 18, 18, age * 0.01), { color: '#ffc040', alpha: 0.55 }); X.draw(X.M.raysThin(), X.bill(cam, A3(ph.pos, [0, 3.2, 0]), 22, 22, -age * 0.015), { color: '#fff0c0', alpha: 0.45 }); X.glow(cam, A3(ph.pos, [0, 3.2, 0]), 5, '#ffe070', 0.7); });
    const rainF = S.loop((f) => { if (f < 230 && f % 3 === 0) for (const t of ts) H.fire(S, S.foot(t), 1, { spread: 1.2, size: 1.0, life: 36, up: 0.05 }); });
    S.camMove(150, [E0[0] + 1.2, 1.2, E0[2] + 7.6], [E0[0], 4.0, E0[2]], [E0[0] + 1.0, 1.4, E0[2] + 7.0], [E0[0], 4.4, E0[2]], 56, 56, 'lin');
    S.sfx('fire2');
    yield 150;
    S.camMove(100, A3(ph.pos, [0.5, 1.5, 3.0]), A3(ph.pos, [0, 3.2, 0]), A3(ph.pos, [0.4, 1.2, 2.2]), A3(ph.pos, [0, 3.2, 0]), 54, 54, 'lin');
    yield 100;
    // --- shot 8: the enemies burn; damage; fallen allies rise
    ph.visible = false; S.untrack(rainF); S.clearOverlays(); S.dimTo('#000000', 0, 20);
    S.flash('#ffe0a0', 16, 0.8);
    ts.forEach(t => H.fire(S, S.foot(t), 8, { spread: 0.8, size: 1.4, life: 50, up: 0.06 }));
    S.showResult(90);
    yield 10;
    hk.impact(0);
    yield 80;
    yield* S.outro();
    yield* hk.after();
  };
  SEQ.phoenix.frames = 1170;

  // ================================================================== HADES - Black Cauldron  (ref ~30 s)
  // candle flames flicker up round the arena -> the floor opens on an engraved stone lid ringed with fire
  // -> stone pillars rise around it -> blue shafts, a flash: the cauldron stands on the altar -> Hades
  // stirs it, a magenta column erupts -> a red and violet miasma falls over the enemies
  SEQ.hades = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.62;
    yield* S.cast();
    const AL = [E0[0] + 0.6, 0, E0[2] + 4.6];
    S.dimTo('#030104', 0.7, 60);
    // --- shot 1: candle flames flicker up round the arena
    const cand = []; for (let i = 0; i < 12; i++) { const an = i / 12 * PI * 2; cand.push([AL[0] + cos(an) * 6.5, 0, AL[2] - 2 + sin(an) * 5.5]); }
    const candFx = S.fxT(1500, (cam, k, age) => cand.forEach((p, i) => { if (age < i * 6) return; const f = 0.8 + sin(age * 0.4 + i * 1.7) * 0.15; X.glow(cam, A3(p, [0, 0.35, 0]), 0.7 * f, '#ffb030', 0.9); X.draw(X.M.puff(), X.bill(cam, A3(p, [0, 0.35, 0]), 0.16 * f, 0.34 * f), { color: '#ffe080', alpha: 1 }); }), false);
    S.camMove(270, [E0[0] + 2.5, 3.5, E0[2] + 8.5], [AL[0], 0.5, AL[2] - 2], [E0[0] + 2.0, 3.0, E0[2] + 8.0], [AL[0], 0.6, AL[2] - 2], 50, 50, 'lin');
    S.sfx('fire', 0.4);
    yield 270;
    // --- shot 2: a curved wall of light rises, the floor opens on the engraved lid ringed with fire
    S.fxT(80, (cam, k) => X.draw(X.M.cyl(), X.trs([AL[0], 0, AL[2]], [0, 0, 0], [3.6, 4 * E.out(k), 3.6]), { color: '#8090c0', alpha: 0.5 * (1 - k) }));
    const lid = { r: 0 };
    S.env.push({ draw: (cam) => {
      if (lid.r < 0.01) return;
      const img = X.img('HADES_0000/HADES_0000'), m = img && X.frameDisc('HADES_0000/HADES_0000', 6);
      X.draw(X.M.solidDisc(), X.trs([AL[0], 0.03, AL[2]], [-PI / 2, 0, 0], [2.6 * lid.r, 2.6 * lid.r, 1]), { color: '#6a7458', blend: null });
      if (m) X.draw(m, X.trs([AL[0], 0.05, AL[2]], [-PI / 2, 0, 0], [2.6 * lid.r, 2.6 * lid.r, 1]), { color: '#c8d0a8', tex: img, blend: 'add', alpha: 1 });
      else for (let i = 1; i < 4; i++) X.draw(X.M.ring(), X.trs([AL[0], 0.05, AL[2]], [0, 0, 0], 2.6 * lid.r * i / 4), { color: '#404838', alpha: 0.8, blend: 'alpha' });
    } });
    S.track(60, (k) => { lid.r = k; }, 'out');
    const rim = S.loop((f) => { if (f % 3 === 0 && f < 460) { const an = Math.random() * PI * 2; H.fire(S, [AL[0] + cos(an) * 2.7 * lid.r, 0.1, AL[2] + sin(an) * 2.7 * lid.r], 1, { spread: 0.1, size: 0.7, life: 30, up: 0.03 }); } });
    S.camMove(240, [AL[0] + 1, 5.5, AL[2] + 4], [AL[0], 0, AL[2]], [AL[0] + 0.6, 4.2, AL[2] + 3.2], [AL[0], 0, AL[2]], 50, 50, 'lin');
    S.sfx('magic');
    yield 240;
    // --- shot 3: stone pillars rise round the altar, flames on their tops
    const pil = { h: 0 }, pp = [];
    for (let i = 0; i < 6; i++) { const an = i / 6 * PI * 2 + 0.3; pp.push([AL[0] + cos(an) * 4.2, 0, AL[2] + sin(an) * 3.6]); }
    S.env.push({ draw: (cam) => { if (pil.h < 0.01) return; pp.forEach((p, i) => { X.draw(X.M.cylSolid(), X.trs(p, [0, 0, 0], [0.45, 4.2 * pil.h * (0.8 + (i % 3) * 0.12), 0.45]), { color: '#5a5a60', blend: null, lit: true }); X.draw(X.M.cylSolid(), X.trs(A3(p, [0, 4.2 * pil.h * (0.8 + (i % 3) * 0.12), 0]), [0, 0, 0], [0.6, 0.25, 0.6]), { color: '#6a6a70', blend: null, lit: true }); }); } });
    S.track(120, (k) => { pil.h = k; }, 'out');
    S.shake(4, 110);
    S.camMove(300, [AL[0] + 6, 1.4, AL[2] + 7], [AL[0], 1.5, AL[2]], [AL[0] - 1, 1.6, AL[2] + 8.5], [AL[0], 1.8, AL[2]], 50, 50, 'lin');
    S.after(130, () => pp.forEach(p => S.fxT(700, (cam, k, age) => { const q = A3(p, [0, 4.2 * pil.h * 0.95 + 0.4, 0]); X.glow(cam, q, 0.9, '#ffb030', 0.8); X.draw(X.M.puff(), X.bill(cam, q, 0.3, 0.55), { color: '#ffe080', alpha: 1 }); })));
    yield 300;
    // --- shot 4: blue shafts between the pillars, a flash - the cauldron stands on the altar
    S.untrack(rim);
    S.fxT(100, (cam, k) => pp.forEach(p => X.beam(p, A3(p, [0, 20, 0]), 0.35, '#4060ff', 0.8 * sin(k * PI))));
    S.camMove(100, [AL[0] + 2, 2, AL[2] + 8], [AL[0], 2.5, AL[2]], [AL[0] + 2, 2, AL[2] + 8], [AL[0], 2.5, AL[2]], 50, 50);
    yield 90;
    S.flash('#ffffff', 30, 1);
    const hd = S.actor(build('hades'), { pos: [AL[0], 0, AL[2] + 0.2], rot: [0, PI, 0], scale: SC });
    const st = { k: 0 };
    hd.pose = (m, t) => { const B_ = m.bones, w = st.k; B_.armL.rot[0] = -0.9 + sin(t * 0.1) * 0.5 * w; B_.armR.rot[0] = -0.9 - sin(t * 0.1) * 0.5 * w; B_.armL.rot[2] = -0.6; B_.armR.rot[2] = 0.6; B_.body.rot[0] = 0.25 * w; B_.head.rot[0] = 0.2 * w + sin(t * 0.05) * 0.05; B_.jaw.rot[0] = 0.1 + sin(t * 0.2) * 0.08; };
    const pot = () => S.bp(hd, 'cauldron', [0, 2.6, 0.9]);
    const brew = S.fxT(600, (cam, k, age) => { const p = pot(); X.glow(cam, p, 1.8 + sin(age * 0.2) * 0.2, '#c040ff', 0.8); X.draw(X.M.spiral(), X.trs(A3(p, [0, 0.02, 0]), [0, age * 0.1, 0], [0.7 * SC / 0.62, 1, 0.7 * SC / 0.62]), { color: '#ff60ff', alpha: 0.8 }); });
    S.camMove(70, [AL[0] + 3.5, 2.2, AL[2] - 6], [AL[0], 2.0, AL[2]], [AL[0] + 3.0, 2.2, AL[2] - 5.4], [AL[0], 2.2, AL[2]], 46, 46, 'lin');
    yield 70;
    // --- shot 5: Hades, close
    S.camMove(120, [AL[0] + 0.3, 3.0, AL[2] - 2.6], [AL[0], 2.8, AL[2] + 0.5], [AL[0] + 0.2, 3.0, AL[2] - 2.2], [AL[0], 2.8, AL[2] + 0.5], 40, 40, 'lin');
    yield 120;
    // --- shot 6: he stirs the cauldron
    S.track(40, (k) => { st.k = k; }, 'sine');
    S.camMove(180, [AL[0] - 1.8, 3.4, AL[2] - 2.2], pot(), [AL[0] - 1.4, 3.2, AL[2] - 1.8], pot(), 46, 46, 'lin');
    S.sfx('magic');
    yield 180;
    // --- shot 7: a magenta column erupts from it
    S.fxT(140, (cam, k, age) => { const p = pot(); X.beam(p, A3(p, [0, 26, 0]), 1.3, '#ff40a0', 0.8 * Math.min(1, age / 10) * (1 - Math.max(0, k - 0.7) / 0.3), X.M.cylMid()); X.beam(p, A3(p, [0, 26, 0]), 0.6, '#ffc0f0', 0.8 * (1 - k)); X.glow(cam, p, 3, '#ff40ff', 0.8); });
    S.flash('#ff80c0', 10, 0.5); S.sfx('fire2', 0.6);
    S.camMove(120, [AL[0] + 2, 1.0, AL[2] - 6.5], [AL[0], 5, AL[2]], [AL[0] + 2, 1.2, AL[2] - 6.0], [AL[0], 7, AL[2]], 54, 54, 'lin');
    yield 120;
    // --- shot 8: the miasma falls over the enemies
    hd.visible = false; S.remove(brew); S.env.length = 0; S.remove(candFx);
    const mist = S.add(new X.Particles({ blend: 'alpha', mesh: X.M.puff(), fade: [10, 30], keep: true }));
    const mistTr = S.loop((f) => { if (f < 260 && f % 2 === 0) mist.ps.emit(3, (i) => ({ p: [E0[0] + (Math.random() - 0.5) * S.Ew * 2.4, 4 + Math.random() * 2, E0[2] + (Math.random() - 0.5) * 3], v: [(Math.random() - 0.5) * 0.02, -0.04 - Math.random() * 0.03, 0], life: 90, size: 1.0, sizeTo: 2.4, color: Math.random() < 0.5 ? '#e02050' : '#b030e0', alpha: 0.6, roll: Math.random() * 6, fn: (q) => { if (q.p[1] < 0.6) { q.v[1] = 0; q.v[0] *= 1.02; } } })); });
    S.dimTo('#030104', 0.45, 30);
    S.camMove(350, [E0[0] + 2.5, 2.6, E0[2] + 6.6], [E0[0], 1.0, E0[2]], [E0[0] + 2.0, 2.2, E0[2] + 6.0], [E0[0], 0.9, E0[2]], 48, 48, 'lin');
    yield 220;
    hk.impact(0);
    yield 110;
    S.untrack(mistTr); S.remove(mist); S.dimTo('#030104', 0, 20);
    yield 20;
    yield* S.outro();
  };
  SEQ.hades.frames = 1960;

  // ================================================================== TYPHOON - Disintegration  (ref ~32 s)
  // a green ring on the floor -> whirlwind rings rise, the floor glints like water -> a gust, and Typhoon
  // tumbles into the arena -> green fire breath -> a huge tornado swallows the enemies while Typhoon
  // somersaults round it -> the floor is torn up, rocks whirl in a violet vortex -> damage
  SEQ.typhoon = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.62;
    yield* S.cast();
    const TP = [E0[0] + 0.6, 0, E0[2] + 3.4];
    S.dimTo('#020804', 0.35, 30);
    // --- shot 1-2: a green ring on the floor, whirlwind rings rise
    const wr = { k: 0 };
    const whirl = S.fxT(500, (cam, k, age) => {
      X.draw(X.M.ring(), X.trs([TP[0], 0.05, TP[2]], [0, age * 0.05, 0], 2.2), { color: '#40ff60', alpha: 0.9 });
      for (let i = 0; i < 6; i++) { const y = ((age * 0.04 + i * 0.6) % 3.6) * wr.k, r = 1.3 + y * 0.4; X.draw(X.M.ring(), X.trs([TP[0], y, TP[2]], [0, age * 0.2 + i, 0], r), { color: i % 2 ? '#d0ffe0' : '#60ff90', alpha: 0.8 * (1 - y / 4) }); }
      X.draw(X.M.funnel(), X.trs([TP[0], 0, TP[2]], [0, age * 0.15, 0], [2.2 * wr.k, 4.5 * wr.k, 2.2 * wr.k]), { color: '#a0ffc0', alpha: 0.35 });
    });
    S.track(260, (k) => { wr.k = k; }, 'sine');
    S.env.push({ draw: () => { const img = X.img('RIVA_0000/RIVA_0000'); const m = img ? X.frameUV(X.grid(1), 'RIVA_0000/RIVA_0000', 1) : X.grid(1); X.draw(m, X.trs([TP[0], 0.02, TP[2]], [0, S.t * 0.004, 0], [4.5, 1, 4.5]), { color: '#8060c0', tex: img || X.ptex('water'), alpha: 0.35 * Math.min(1, wr.k * 2) }); } });
    S.camMove(90, [TP[0] + 1.5, 5.5, TP[2] + 4], [TP[0], 0, TP[2]], [TP[0] + 1.0, 4.0, TP[2] + 3], [TP[0], 0.5, TP[2]], 50, 50, 'lin');
    S.sfx('magic');
    yield 90;
    S.camMove(240, [TP[0] + 3, 1.6, TP[2] + 5], [TP[0], 1.5, TP[2]], [TP[0] + 2.2, 1.8, TP[2] + 4], [TP[0], 2.0, TP[2]], 52, 52, 'lin');
    yield 240;
    // --- shot 3: a gust (pink-white), Typhoon tumbles in
    S.flash('#ffe0f0', 20, 0.9); S.remove(whirl);
    const ty = S.actor(build('typhoon'), { pos: [TP[0], 2.2, TP[2]], rot: [0, PI, 0], scale: SC });
    const pose = { flip: 0, open: 0 };
    ty.pose = (m, t) => { const B_ = m.bones; B_.armL.rot[2] = 0.2 + pose.open * 0.5 + sin(t * 0.1) * 0.15; B_.armR.rot[2] = -0.2 - pose.open * 0.5 - sin(t * 0.1) * 0.15; B_.jaw.rot[0] = pose.open * 0.5; B_.tail.rot[0] = sin(t * 0.1) * 0.3; B_.body.rot[0] += pose.flip; };
    S.camMove(150, [TP[0] + 1.0, 1.4, TP[2] - 6.5], [TP[0], 3.2, TP[2]], [TP[0] + 0.6, 1.5, TP[2] - 5.8], [TP[0], 3.4, TP[2]], 50, 50, 'lin');
    S.sfx('howl', 0.6);
    yield 150;
    // --- shot 4: it somersaults
    S.track(130, (k) => { pose.flip = k * PI * 2; ty.pos[1] = 2.2 + sin(k * PI) * 1.5; }, 'io');
    S.camMove(130, [TP[0] - 4, 2.0, TP[2] - 4], [TP[0], 3.4, TP[2]], [TP[0] - 4.4, 2.2, TP[2] - 3], [TP[0], 3.4, TP[2]], 50, 50, 'lin');
    yield 130;
    // --- shot 5: green fire breath over the enemies
    pose.flip = 0; pose.open = 1;
    const mouth = () => S.bp(ty, 'jaw', [0, 3.1, 1.6]);
    const breath = S.loop((f) => { if (f % 2 === 0 && f < 330) { const m0 = mouth(); S.add(new X.Particles({ fade: [2, 10] }).emit(2, () => { const tgt = [E0[0] + (Math.random() - 0.5) * 3, 0.5, E0[2] + (Math.random() - 0.5) * 2]; const d = V.sub(tgt, m0), L = V.len(d); return { p: m0.slice(), v: V.scale(d, 0.9 / 30), life: 34, size: 0.5, sizeTo: 1.6 + L * 0.1, color: Math.random() < 0.5 ? '#80ff40' : '#e0ff80', alpha: 0.9 }; })); } });
    S.camMove(90, [TP[0] + 4.5, 2.4, TP[2] + 2], [lerp(TP[0], E0[0], 0.5), 1.8, lerp(TP[2], E0[2], 0.5)], [TP[0] + 4.8, 2.6, TP[2] + 1.5], [lerp(TP[0], E0[0], 0.6), 1.6, lerp(TP[2], E0[2], 0.6)], 52, 52, 'lin');
    S.sfx('fire2', 0.6);
    yield 90;
    // --- shot 6: a huge tornado swallows the enemies, Typhoon rolls round it
    const torn = { k: 0 };
    const tornFx = S.fxT(860, (cam, k, age) => { const g = torn.k; X.draw(X.M.funnel(), X.trs([E0[0], 0, E0[2]], [0, age * 0.25, 0], [S.Ew * 1.4 * g, 12 * g, S.Ew * 1.2 * g]), { color: '#fff0b0', alpha: 0.55 }); X.draw(X.M.funnel(), X.trs([E0[0], 0, E0[2]], [0, -age * 0.18 + 1, 0], [S.Ew * 1.1 * g, 11 * g, S.Ew * g]), { color: '#d0ffc0', alpha: 0.35 }); });
    S.track(60, (k) => { torn.k = k; }, 'out');
    S.sfx('magic');
    const orbit = S.loop((f) => { const an = f * 0.02 + 1; ty.pos = [E0[0] + sin(an) * (S.Ew + 3.4), 3.2 + sin(f * 0.05), E0[2] + cos(an) * (S.Ew + 2.8)]; ty.rot = [0, an + PI, 0]; pose.flip = f * 0.08; });
    S.untrack(breath); pose.open = 0.4;
    S.camMove(300, [E0[0] + 6, 2.0, E0[2] + 9], [E0[0], 3, E0[2]], [E0[0] + 3, 2.4, E0[2] + 10], [E0[0], 3.4, E0[2]], 54, 54, 'lin');
    yield 300;
    S.camPath(300, (k) => ({ eye: A3(ty.pos, [3.2, 2.2, 4.4]), target: A3(ty.pos, [0, 2.0, 0]), fov: 50 }), 'lin');
    yield 300;
    // --- shot 7: the floor is torn up into the wind; violet vortex, damage
    S.untrack(orbit); ty.visible = false;
    const gc = H.groundCol(S);
    const rocks = S.add(new X.Particles({ world: true, blend: null, mesh: H.slabMesh(gc[0], gc[1]), lit: true, fade: [1, 6] }));
    rocks.ps.emit(36, (i) => ({ p: [E0[0] + (Math.random() - 0.5) * 8, 0, E0[2] + (Math.random() - 0.5) * 6], v: [0, 0.05, 0], life: 380, size: 0.35 + Math.random() * 0.5, rot: [Math.random(), Math.random() * 6, 0], th: Math.random() * PI * 2, r: 2 + Math.random() * 4, fn: (q) => { q.th += 0.05; q.r *= 0.996; q.p[0] = E0[0] + cos(q.th) * q.r; q.p[2] = E0[2] + sin(q.th) * q.r * 0.8; q.p[1] += 0.03; q.rot[0] += 0.05; q.rot[1] += 0.04; } }));
    S.camMove(200, [E0[0] + 1, 9, E0[2] + 4], [E0[0], 0, E0[2]], [E0[0] + 0.5, 8, E0[2] + 5], [E0[0], 1, E0[2]], 54, 54, 'lin');
    S.shake(5, 100);
    yield 200;
    S.remove(tornFx);
    S.dimTo('#100418', 0.55, 20);
    S.fxT(200, (cam, k, age) => { X.draw(X.M.spiral(), X.trs([E0[0], 1.5, E0[2]], [0, age * 0.12, 0], [S.Ew * 2.2, 1, S.Ew * 2]), { color: '#a040ff', alpha: 0.7 }); X.draw(X.M.funnel(), X.trs([E0[0], -1, E0[2]], [0, age * 0.3, 0], [S.Ew * 1.8, 9, S.Ew * 1.6]), { color: '#c070ff', alpha: 0.5 }); X.glow(cam, [E0[0], 1.5, E0[2]], S.Ew * 2.5, '#ff80ff', 0.4); });
    S.camMove(200, [E0[0] + 2, 3.5, E0[2] + 6.5], [E0[0], 1.8, E0[2]], [E0[0] + 1.4, 3.0, E0[2] + 5.4], [E0[0], 1.8, E0[2]], 52, 52, 'lin');
    yield 70;
    hk.impact(0);
    yield 100;
    S.flash('#ffffff', 30, 1); S.remove(rocks); S.dimTo('#100418', 0, 10);
    yield 30;
    yield* S.outro();
  };
  SEQ.typhoon.frames = 1920;

  // ------------------------------------------------------------------ skies / planet / cracks
  const daySky = () => X.skyDome('day', [[-1, '#f0f4ff'], [-0.1, '#e8f0ff'], [0.05, '#80b0f0'], [0.4, '#2060c8'], [1, '#0a3090']]);
  const spaceSky = () => X.skyDome('space', [[-1, '#000004'], [1, '#02020a']]);
  H.stars = (cam, scale = 140) => X.draw(X.M.stars(), X.trs(cam.eye, [0, 0, 0], scale), { color: '#ffffff', alpha: 1, blend: 'add' });
  // planet: textured billboard (VAHAMUT0) or a procedural blue marble
  H.planet = (cam, p, r, alpha = 1, rot = 0) => {
    X.glow(cam, p, r * 1.25, '#80a8ff', 0.35 * alpha);
    const img = X.img('VAHAMUT_0000/VAHAMUT0_0000'), m = img && X.frameMesh('VAHAMUT_0000/VAHAMUT0_0000', 1);
    X.draw(X.M.solidDisc(), X.bill(cam, p, r * 0.98, r * 0.98, rot), { color: '#284878', alpha, blend: 'alpha' });
    if (m) X.draw(m, X.bill(cam, p, r * 2.02 / m.aspect, r * 2.02, rot), { color: '#e8f0ff', alpha, tex: img, blend: 'add' });
    else for (let i = 0; i < 9; i++) X.draw(X.M.puff(), X.bill(cam, A3(p, [cos(i * 2.3 + rot) * r * 0.55, sin(i * 1.9) * r * 0.55, 0.01]), r * 0.35, r * 0.2, i), { color: '#f0f4ff', alpha: 0.7 * alpha, blend: 'alpha' });
  };
  // ground cracks: jagged dark lines radiating over the floor (XZ), radius 1
  H.crackMesh = () => memo('cracks', () => {
    const mb = new MB(), R_ = U.rng(77);
    const line = (x0, z0, ang, len, w, depth) => {
      let x = x0, z = z0; const n = 6;
      for (let i = 0; i < n; i++) { const a = ang + (R_() - 0.5) * 0.9, l = len / n; const x2 = x + cos(a) * l, z2 = z + sin(a) * l, nx = -sin(a) * w, nz = cos(a) * w; X.q4(mb, [x - nx, 0, z - nz], [x + nx, 0, z + nz], [x2 + nx, 0, z2 + nz], [x2 - nx, 0, z2 - nz], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]); if (depth > 0 && R_() < 0.35) line(x2, z2, a + (R_() - 0.5) * 1.6, len * 0.5, w * 0.6, depth - 1); x = x2; z = z2; }
    };
    for (let i = 0; i < 14; i++) line(0, 0, i / 14 * PI * 2, 0.7 + R_() * 0.3, 0.005, 2);
    return mb.build({ unlit: true, cull: false });
  });

  // ================================================================== NEO BAHAMUT - Giga Flare  (ref ~40 s)
  // the floor cracks under the enemies -> darkness -> their chunk of ground is torn free and rises up
  // through the clouds into a blue sky -> Neo Bahamut descends over the sea of clouds and circles the
  // island -> charges in profile -> the Giga Flare beam sweeps over the island -> it glows and blows apart
  SEQ.neo_bahamut = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.66;
    yield* S.cast();
    // --- shot 1: the floor cracks under the enemies
    const cr = { k: 0 };
    S.env.push({ draw: () => { if (cr.k > 0.01) X.draw(H.crackMesh(), X.trs([E0[0], 0.03, E0[2]], [0, 0.4, 0], [6 * cr.k, 1, 5 * cr.k]), { color: '#000000', alpha: 0.95, blend: 'alpha' }); } });
    S.track(200, (k) => { cr.k = k; }, 'out');
    S.shake(3, 160); S.sfx('run', 0.5);
    S.camMove(80, [E0[0] + 2.5, 3.2, E0[2] + 6.5], [E0[0], 0.4, E0[2]], [E0[0] + 2.2, 3.4, E0[2] + 6.0], [E0[0], 0.4, E0[2]], 48, 48, 'lin');
    yield 80;
    S.camMove(150, [E0[0] + 0.5, 8.5, E0[2] + 2.5], [E0[0], 0, E0[2]], [E0[0] + 0.3, 9.5, E0[2] + 2.0], [E0[0], 0, E0[2]], 50, 50, 'lin');
    yield 100;
    S.dimTo('#000000', 1, 50);
    yield 50;
    // --- shot 2: through the clouds the island rises into a blue sky
    const gc = H.groundCol(S);
    const isl = { y: -30 };
    S.envOn({ fill: '#2060c8', sky: { mesh: daySky(), scale: 150 } });
    S.dim = null;
    S.enemies('stage', [0, -30, 0]);
    const IS = [E0[0], 0, E0[2]];
    const island = { draw: () => X.draw(H.slabMesh(gc[0], gc[1]), X.trs([IS[0], isl.y, IS[2]], [0, 0.3, 0], [S.Ew + 2.6, 5, 4.2]), { blend: null, lit: true }) };
    S.env.push(island);
    const clouds = []; for (let i = 0; i < 26; i++) clouds.push([IS[0] + (Math.random() - 0.5) * 60, -12 - Math.random() * 16, IS[2] + (Math.random() - 0.5) * 60, 6 + Math.random() * 8, i]);
    S.env.push({ draw: (cam) => { for (const c of clouds) X.draw(X.M.puff(), X.bill(cam, c, c[3], c[3] * 0.55, c[4]), { color: c[4] % 3 ? '#f4f6ff' : '#c8d4ec', alpha: 0.95, blend: 'alpha' }); } });
    S.track(360, (k) => { isl.y = lerp(-34, 0, k); S.enemyOff = [0, isl.y, 0]; }, 'io');
    S.camPath(360, (k) => ({ eye: [IS[0] + 9, lerp(-24, 3, k) - 3, IS[2] + 12], target: [IS[0], isl.y + 1, IS[2]], fov: 48 }), 'lin');
    S.sfx('run', 0.4); S.shake(3, 200);
    yield 360;
    S.flash('#ffffff', 30, 1);
    // --- shot 3: the island hangs over a sea of clouds
    const sea = { draw: (cam) => { X.draw(X.M.solidDisc(), X.trs([IS[0], -18, IS[2]], [-PI / 2, 0, 0], [200, 200, 1]), { color: '#e8eef8', blend: 'alpha' }); for (let i = 0; i < 30; i++) { const an = i * 2.4, r = 10 + (i % 7) * 9; X.draw(X.M.puff(), X.trs([IS[0] + cos(an) * r, -17.5, IS[2] + sin(an) * r], [-PI / 2, 0, an], [9, 6, 1]), { color: '#ffffff', alpha: 0.8, blend: 'alpha' }); } } };
    clouds.length = 0; S.env.push(sea);
    S.camMove(240, [IS[0] + 16, 2, IS[2] + 18], [IS[0], 0, IS[2]], [IS[0] + 12, 3, IS[2] + 20], [IS[0], 0, IS[2]], 44, 44, 'lin');
    yield 240;
    // --- shot 4: Neo Bahamut descends over the clouds, circles the island
    const nb = S.actor(build('neo_bahamut'), { pos: [IS[0] - 6, 18, IS[2] - 14], rot: [0, 0.4, 0], scale: SC });
    nb.pose = (m, t) => { const B_ = m.bones; B_.wingL.rot[2] = sin(t * 0.07) * 0.35; B_.wingR.rot[2] = -sin(t * 0.07) * 0.35; B_.tail.rot[0] = sin(t * 0.05) * 0.15; B_.head.rot[0] = 0.1; B_.armL.rot[0] = -0.3; B_.armR.rot[0] = -0.3; };
    S.track(150, (k) => { nb.pos = [IS[0] - 6 + k * 2, lerp(18, 3, k), IS[2] - 14 + k * 3]; }, 'out');
    S.camMove(150, [IS[0] + 6, -4, IS[2] + 20], [IS[0] - 5, 6, IS[2] - 10], [IS[0] + 5, -3, IS[2] + 18], [IS[0] - 4, 5, IS[2] - 11], 46, 46, 'lin');
    S.sfx('howl', 0.5);
    yield 150;
    const circ = S.loop((f) => { const an = f * 0.012 - 1.8; nb.pos = [IS[0] + sin(an) * 12, 3 + sin(f * 0.03), IS[2] + cos(an) * 10]; nb.rot = [0, an + PI / 2, 0.25]; });
    S.camMove(330, [IS[0] + 14, 6, IS[2] + 16], [IS[0], 2, IS[2]], [IS[0] + 4, 8, IS[2] + 21], [IS[0], 2, IS[2]], 46, 46, 'lin');
    yield 330;
    S.untrack(circ);
    // --- shot 5: in profile, the light gathers in its jaws
    nb.pos = [IS[0] + 10, 4, IS[2] - 6]; nb.rot = [0.1, -PI / 2 - 0.3, 0];
    const jaw = () => S.bp(nb, 'head', [0, 7.3, 1.7]);
    S.fxT(300, (cam, k, age) => { const j = jaw(); if (age < 220) for (let i = 0; i < 14; i++) { const an = i * 2.4 + age * 0.04, len = 5 * (1 - ((age * 0.02 + i * 0.13) % 1)); const d = [cos(an), sin(an * 1.3), sin(an) * 0.5]; X.beam(A3(j, V.scale(d, len)), A3(j, V.scale(d, len * 0.6)), 0.025, '#fff080', 0.9); } const r = Math.min(1, age / 210); X.glow(cam, j, 0.4 + r * 2.4, '#ffc040', 0.9); X.glow(cam, j, 0.2 + r * 1.1, '#ffffff', 1); });
    S.camMove(300, A3(nb.pos, [-1.0, 5.6, 6.6]), A3(nb.pos, [-1.5, 4.6, 0]), A3(nb.pos, [-1.6, 5.2, 5.6]), A3(nb.pos, [-1.5, 4.8, 0]), 42, 40, 'lin');
    nb.pose = ((prev) => (m, t, h) => { prev(m, t, h); m.bones.jaw.rot[0] = 0.55; })(nb.pose);
    S.sfx('magic');
    yield 300;
    // --- shot 6: Giga Flare - the beam sweeps across the island
    S.flash('#ffffff', 14, 0.8); S.sfx('fire2'); S.shake(8, 200);
    const j0 = jaw(), bm = { k: 0 };
    S.fxT(290, (cam, k, age) => { const aim = [IS[0] + lerp(-4, 4, bm.k), 0.5, IS[2] + lerp(2, -1, bm.k)]; const fade = age > 260 ? (290 - age) / 30 : 1; X.beam(j0, aim, 1.6, '#ffb020', 0.8 * fade, X.M.cylSolid()); X.beam(j0, aim, 0.8, '#fff8e0', 0.9 * fade); X.glow(cam, aim, 5, '#ffe080', 0.9 * fade); });
    S.track(260, (k) => { bm.k = k; }, 'sine');
    S.camMove(150, [IS[0] - 2, 1.5, IS[2] + 9], [IS[0] + 4, 3, IS[2] - 2], [IS[0] - 3, 1.8, IS[2] + 10], [IS[0] + 3, 2.5, IS[2] - 2], 56, 56, 'lin');
    yield 150;
    H.debris(S, [IS[0], 0.5, IS[2]], 24, { spread: 6, speed: 0.12, up: 0.2, size: 0.4, life: 100 });
    S.camMove(140, [IS[0] + 12, 5, IS[2] + 14], [IS[0], 0, IS[2]], [IS[0] + 14, 6, IS[2] + 16], [IS[0], 0, IS[2]], 46, 46, 'lin');
    yield 140;
    // --- shot 7: the island glows and blows apart
    nb.visible = false;
    S.fade('#ffe8b0', 0, 0.55, 40);
    S.enemyOpts = { add: [0.6, 0.35, 0.05] };
    S.fxT(240, (cam, k, age) => { X.draw(X.M.raysWide(), X.bill(cam, [IS[0], 0, IS[2]], 30, 30, age * 0.01), { color: '#ffffff', alpha: 0.8 * Math.min(1, age / 40) }); X.glow(cam, [IS[0], 0, IS[2]], 14, '#ffc060', 0.8); });
    island.draw = () => X.draw(H.slabMesh(gc[0], gc[1]), X.trs([IS[0], isl.y, IS[2]], [0, 0.3, 0], [S.Ew + 2.6, 5, 4.2]), { blend: null, lit: true, add: [0.7, 0.35, 0.05] });
    S.camMove(180, [IS[0] + 8, 4, IS[2] + 10], [IS[0], 0, IS[2]], [IS[0] + 9, 4.5, IS[2] + 11], [IS[0], 0, IS[2]], 50, 50, 'lin');
    yield 180;
    H.debris(S, [IS[0], 0, IS[2]], 30, { spread: 8, speed: 0.25, up: 0.3, size: 0.6, life: 90, gravity: 0.004 });
    S.flash('#ffffff', 60, 1); S.sfx('bosskill', 0.6);
    yield 60;
    // --- back in the arena: damage
    S.clearOverlays(); S.env.length = 0; S.envOff(); S.enemies('battle'); S.enemyOpts = null;
    S.showResult(90);
    yield 6;
    hk.impact(0);
    yield 84;
    yield* S.outro();
  };
  SEQ.neo_bahamut.frames = 2450;

  // ================================================================== BAHAMUT ZERO - Tera Flare  (ref ~57 s)
  // the camera soars straight up out of the arena into white -> the Planet in space -> Bahamut ZERO
  // streaks across the stars and banks over the Planet -> wings spread, a violet sphere and speed lines
  // -> a cyan orb of light in its jaws -> it fires down at the Planet -> the beam plunges through the
  // clouds -> strikes the arena: a dome of fire -> white
  SEQ.bahamut_zero = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.6;
    yield* S.cast();
    // --- shot 1: straight up out of the arena into white
    S.camMove(150, [E0[0], 8, E0[2] + 0.5], [E0[0], 0, E0[2]], [E0[0], 60, E0[2] + 0.5], [E0[0], 0, E0[2]], 50, 50, 'in');
    S.after(100, () => S.fade('#ffffff', 0, 1, 50));
    yield 150;
    // --- shot 2: the Planet in space
    S.clearOverlays(); S.flash('#ffffff', 30, 1);
    S.envOn({ fill: '#000000', sky: { draw: (cam) => { X.draw(spaceSky(), X.trs(cam.eye, [0, 0, 0], 150), { blend: 'alpha' }); H.stars(cam); } } });
    S.enemies('hide');
    const SP = [0, 400, 0], PL = A3(SP, [0, 0, -40]);
    const planetEnv = { draw: (cam) => H.planet(cam, PL, 14, 1, S.t * 0.001) };
    S.env.push(planetEnv);
    S.camMove(180, A3(SP, [-12, 3, 8]), PL, A3(SP, [8, 2, 10]), PL, 44, 44, 'lin');
    yield 180;
    // --- shot 3: a fiery streak crosses the stars
    S.env.length = 0;
    S.fxT(90, (cam, k) => { const p = A3(SP, [lerp(30, -30, k), lerp(-6, 6, k), -60]); X.glow(cam, p, 6, '#ff6020', 0.9); X.glow(cam, p, 2, '#fff0c0', 1); X.beam(p, A3(p, [8, -1.6, 0]), 0.8, '#ff8030', 0.6); });
    S.setCam(SP, A3(SP, [0, 0, -60]), 44);
    yield 90;
    // --- shot 4: streaming stars (FF7 spends only a moment in empty space before ZERO rises over the Planet's rim)
    S.fxT(150, (cam, k, age) => X.draw(X.M.speedLines(), X.bill(cam, A3(cam.eye, V.scale(cam._basis.f, 10)), 14, 14, age * 0.01), { color: '#c0c8ff', alpha: 0.6 }));
    S.camMove(150, SP, A3(SP, [0, 0, -60]), A3(SP, [0, 0, -30]), A3(SP, [0, 0, -90]), 44, 50, 'in');
    yield 150;
    // --- shot 5: over the planet rim, lens flare, ZERO banks past
    S.env.push({ draw: (cam) => H.planet(cam, A3(SP, [8, -52, -30]), 48, 1, 0.3) });
    const bz = S.actor(build('bahamut_zero'), { pos: A3(SP, [-14, 2, -30]), rot: [0.3, PI / 2, 0.2], scale: SC });
    const wing = { k: 0.3 };
    bz.pose = (m, t) => { const B_ = m.bones; B_.wingL.rot[2] = lerp(-0.5, 0.3, wing.k) + sin(t * 0.06) * 0.2; B_.wingR.rot[2] = -lerp(-0.5, 0.3, wing.k) - sin(t * 0.06) * 0.2; B_.wingL.rot[1] = -0.2 * (1 - wing.k); B_.wingR.rot[1] = 0.2 * (1 - wing.k); B_.tail.rot[0] = sin(t * 0.04) * 0.12; B_.armL.rot[0] = -0.4; B_.armR.rot[0] = -0.4; };
    S.track(420, (k) => { bz.pos = A3(SP, [lerp(-14, 12, k), 2 - k * 2, -30 + sin(k * PI) * 6]); }, 'sine');
    S.fxT(420, (cam, k) => { const f = A3(SP, [30, 10, -60]); X.glow(cam, f, 8, '#fff0d0', 0.6); X.draw(X.M.ring(), X.orient(L3(f, cam.eye, 0.5), V.scale(cam._basis.f, -1), 1.2, 1, 1.2), { color: '#80ff80', alpha: 0.35 }); X.glow(cam, L3(f, cam.eye, 0.35), 2.2, '#ffe060', 0.3); });
    S.camMove(420, A3(SP, [0, 4, 0]), A3(SP, [0, -2, -30]), A3(SP, [2, 3, 2]), A3(SP, [4, -1, -30]), 44, 44, 'lin');
    yield 420;
    // --- shot 6: close on ZERO against the planet, wings spreading
    bz.pos = A3(SP, [0, -2, -24]); bz.rot = [0.1, 0.2, 0];
    S.track(240, (k) => { wing.k = 0.3 + k * 0.7; }, 'sine');
    S.camMove(240, A3(bz.pos, [3, 3.5, 6]), A3(bz.pos, [0, 3.8, 0]), A3(bz.pos, [-3, 4.5, 7]), A3(bz.pos, [0, 4, 0]), 46, 46, 'lin');
    S.sfx('howl', 0.5);
    yield 240;
    // --- shot 7: violet sphere, speed lines - charging
    S.fxT(180, (cam, k, age) => { const c = A3(bz.pos, [0, 4, 0]); X.draw(X.M.sphere(), X.trs(c, [0, age * 0.02, 0], 6 + sin(age * 0.1) * 0.2), { color: '#6020c0', alpha: 0.35 }); X.glow(cam, c, 12, '#8040ff', 0.4); X.draw(X.M.speedLines(), X.bill(cam, c, 16, 16, age * 0.01), { color: '#ffe040', alpha: 0.8 }); });
    S.camMove(180, A3(bz.pos, [0, 4, 14]), A3(bz.pos, [0, 4, 0]), A3(bz.pos, [0, 4, 11]), A3(bz.pos, [0, 4, 0]), 50, 50, 'lin');
    S.sfx('magic');
    yield 180;
    // --- shot 8: its head, rays of light, a cyan orb swelling in the jaws
    const jaw = () => S.bp(bz, 'head', [0, 7.7, 1.9]);
    S.fxT(340, (cam, k, age) => { const j = jaw(), r = Math.min(1, age / 250); X.draw(X.M.raysWide(), X.bill(cam, j, 10 * r + 2, 10 * r + 2, age * 0.01), { color: '#e0f0ff', alpha: 0.6 }); X.glow(cam, j, 0.5 + r * 3.2, '#40e0ff', 0.9); X.glow(cam, j, 0.3 + r * 1.4, '#ffffff', 1); });
    bz.pose = ((prev) => (m, t, h) => { prev(m, t, h); m.bones.jaw.rot[0] = 0.5; m.bones.head.rot[0] = 0.25; })(bz.pose);
    S.camMove(340, A3(jaw(), [2.8, 0.6, 3.2]), jaw(), A3(jaw(), [1.8, 0.2, 2.4]), jaw(), 46, 46, 'lin');
    yield 310;
    S.flash('#c0ffff', 30, 1);
    yield 30;
    // --- shot 9: it fires down at the Planet
    S.clearFx(); S.env.length = 0;
    const PL2 = A3(SP, [0, -60, -20]);
    S.env.push({ draw: (cam) => H.planet(cam, PL2, 30, 1, 0.1) });
    bz.pos = A3(SP, [4, 6, -10]); bz.rot = [0.9, PI + 0.2, 0];
    const src = () => jaw();
    S.fxT(240, (cam, k, age) => { const tip = L3(src(), PL2, Math.min(1, age / 50)); X.beam(src(), tip, 0.6, '#40e0ff', 0.9); X.beam(src(), tip, 0.25, '#ffffff', 1); if (age > 50) X.glow(cam, L3(PL2, cam.eye, 0.15), 6 + sin(age * 0.3), '#80ffff', 0.8); });
    S.camMove(180, A3(SP, [14, 16, 14]), A3(SP, [0, -30, -20]), A3(SP, [12, 14, 18]), A3(SP, [0, -40, -20]), 50, 50, 'lin');
    S.sfx('fire2');
    yield 180;
    S.camMove(60, A3(PL2, [0, 12, 80]), PL2, A3(PL2, [0, 10, 70]), PL2, 40, 40, 'lin');
    yield 60;
    S.flash('#ffffff', 30, 1);
    // --- shot 10: down through the clouds, a cyan sphere of light
    bz.visible = false; S.clearFx(); S.env.length = 0;
    S.envOn({ fill: '#707888', sky: { mesh: X.skyDome('storm', [[-1, '#404650'], [1, '#8890a0']]), scale: 150 } });
    const CL = [0, 800, 0];
    const cl = []; for (let i = 0; i < 40; i++) cl.push([CL[0] + (Math.random() - 0.5) * 30, CL[1] - i * 3, CL[2] + (Math.random() - 0.5) * 30, 6 + Math.random() * 6, i]);
    S.env.push({ draw: (cam) => { for (const c of cl) X.draw(X.M.puff(), X.bill(cam, c, c[3], c[3] * 0.6, c[4]), { color: c[4] % 3 ? '#e8eef4' : '#9aa2b0', alpha: 0.9, blend: 'alpha' }); } });
    const orb = { y: CL[1] + 5, r: 0.6 };
    S.fxT(240, (cam, k) => { const p = [CL[0], orb.y, CL[2]]; X.draw(X.M.sphere(), X.trs(p, [0, 0, 0], orb.r), { color: '#40d0e0', alpha: 0.6 }); X.glow(cam, p, orb.r * 2.5, '#60ffff', 0.8); });
    S.camPath(240, (k) => ({ eye: [CL[0] + 3, CL[1] - k * 100 + 12, CL[2] + 4], target: [CL[0], CL[1] - k * 100 - 10, CL[2]], fov: 60 }), 'in');
    S.track(240, (k) => { orb.y = CL[1] - k * 100 + 2; orb.r = 0.6 + k * 8; }, 'in');
    yield 240;
    S.flash('#e0ffff', 30, 1);
    // --- shot 11: the beam strikes the arena - a dome of fire
    S.env.length = 0; S.envOff(); S.enemies('battle'); S.dimTo('#000000', 0.6, 1);
    S.fxT(60, (cam, k) => { X.beam([E0[0], 40, E0[2]], [E0[0], 0, E0[2]], 1.2, '#40e0ff', 1); X.beam([E0[0], 40, E0[2]], [E0[0], 0, E0[2]], 0.5, '#ffffff', 1); X.glow(cam, [E0[0], 0.5, E0[2]], 4 + k * 4, '#c0ffff', 1); });
    S.camMove(60, [E0[0] + 4, 1.0, E0[2] + 9], [E0[0], 4, E0[2]], [E0[0] + 4, 1.0, E0[2] + 9], [E0[0], 2, E0[2]], 56, 56, 'lin');
    yield 60;
    S.shake(14, 120); S.sfx('bosskill', 0.6); S.sfx('fire2');
    const dm = { k: 0 };
    S.fxT(320, (cam, k, age) => { const g = dm.k; X.draw(X.M.domeGlow(), X.trs([E0[0], -0.5, E0[2]], [0, age * 0.02, 0], [S.Ew * 3 * g, 6 * g, S.Ew * 2.5 * g]), { color: '#ff8020', alpha: 0.8 }); X.draw(X.M.dome(), X.trs([E0[0], -0.5, E0[2]], [0, -age * 0.02, 0], [S.Ew * 2.6 * g, 5 * g, S.Ew * 2.2 * g]), { color: '#fff0a0', alpha: 0.4 }); X.draw(X.M.speedLines(), X.bill(cam, [E0[0], 2, E0[2]], 20 * g, 20 * g, age * 0.02), { color: '#ffe040', alpha: 0.9 }); });
    S.track(300, (k) => { dm.k = k; }, 'out');
    S.camMove(300, [E0[0] + 7, 2.0, E0[2] + 12], [E0[0], 2.5, E0[2]], [E0[0] + 9, 3.0, E0[2] + 15], [E0[0], 3, E0[2]], 56, 60, 'lin');
    yield 270;
    S.fade('#ffffff', 0, 1, 30);
    yield 40;
    // --- back to the arena: damage in the white-out
    S.clearFx(); S.clearOverlays(); S.dimTo('#000000', 0, 1); S.flash('#ffffff', 60, 1);
    S.showResult(90);
    yield 6;
    hk.impact(0);
    yield 84;
    yield* S.outro();
  };
  SEQ.bahamut_zero.frames = 2950;

  // ================================================================== KNIGHTS OF THE ROUND - Ultimate End  (ref ~80 s)
  // the arena darkens, walls of violet light close in, a black portal swallows the enemies -> in a series
  // of other-worldly spaces (red torrent, violet clouds, blue radial light, starfield, green, gold) the
  // knights appear one after another and strike (12 hits) -> the 13th, the King, descends in darkness and
  // brings his sword down (13th hit) -> the world cracks like glass and shatters
  const worlds = {
    red: { fill: '#400000', sky: [[-1, '#200000'], [0, '#a01010'], [1, '#300000']], streak: '#ff3020', mode: 'streak' },
    violet: { fill: '#20083a', sky: [[-1, '#300848'], [0, '#6020a0'], [1, '#18042c']], streak: '#ff60ff', mode: 'cloud' },
    blue: { fill: '#000814', sky: [[-1, '#000410'], [1, '#000818']], streak: '#40a0ff', mode: 'radial' },
    stars: { fill: '#000000', sky: [[-1, '#000000'], [1, '#02020a']], streak: '#a0c0ff', mode: 'stars' },
    green: { fill: '#042008', sky: [[-1, '#021006'], [0, '#10802a'], [1, '#021006']], streak: '#60ff60', mode: 'radial' },
    gold: { fill: '#402000', sky: [[-1, '#804000'], [0, '#ffb030'], [1, '#603000']], streak: '#fff080', mode: 'rays' },
    dark: { fill: '#000000', sky: [[-1, '#000000'], [1, '#000000']], streak: '#402020', mode: 'none' },
  };
  H.world = (S, name) => {
    const w = worlds[name] || worlds.dark;
    S.envOn({ fill: w.fill, sky: { mesh: X.skyDome('kotr_' + name, w.sky), scale: 150 } });
    const E0 = S.E;
    S.env.push({ draw: (cam) => {
      const t = S.t, c = [E0[0], 2, E0[2]];
      if (w.mode === 'streak') for (let i = 0; i < 3; i++) X.draw(X.M.streaks(), X.trs([E0[0], -20 + ((t * 0.3 + i * 13) % 40) - 20, E0[2]], [0, i * 1.3 + t * 0.002, 0], [26 - i * 4, 60, 26 - i * 4]), { color: w.streak, alpha: 0.7 });
      if (w.mode === 'cloud') for (let i = 0; i < 16; i++) { const an = i * 2.4 + t * 0.003; X.draw(X.M.puff(), X.bill(cam, [E0[0] + cos(an) * 24, -2 + (i % 5) * 5, E0[2] + sin(an) * 24], 14, 8, i), { color: i % 2 ? w.streak : '#4040ff', alpha: 0.35 }); }
      if (w.mode === 'radial' || w.mode === 'rays') { const far = A3(cam.eye, V.scale(cam._basis.f, 60)); X.draw(w.mode === 'rays' ? X.M.raysWide() : X.M.speedLines(), X.bill(cam, far, 110, 110, t * 0.004), { color: w.streak, alpha: 0.85 }); X.draw(X.M.raysThin(), X.bill(cam, far, 90, 90, -t * 0.003), { color: '#ffffff', alpha: 0.35 }); X.glow(cam, far, 30, w.streak, 0.6); }
      if (w.mode === 'stars') { H.stars(cam); X.draw(X.M.speedLines(), X.bill(cam, A3(cam.eye, V.scale(cam._basis.f, 40)), 70, 70, t * 0.002), { color: w.streak, alpha: 0.5 }); }
    } });
  };
  // every strike is a different knight (summon_models.js: m.setKnight(i), 0..11 the knights, 12 the King)
  const setKnight = (kn, i) => { if (kn.m && kn.m.setKnight) kn.m.setKnight(i); };
  SEQ.knights_of_round = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E, SC = 0.66;
    yield* S.cast();
    // --- intro: the arena darkens; walls of violet light; a black portal opens and swallows them
    S.dimTo('#04000a', 0.7, 40);
    S.camMove(100, [E0[0] + 2.5, 1.6, E0[2] + 6.5], [E0[0], 0.8, E0[2]], [E0[0] + 2.2, 1.6, E0[2] + 6.0], [E0[0], 0.8, E0[2]], 46, 46, 'lin');
    yield 60;
    S.fxT(240, (cam, k, age) => { const g = Math.min(1, age / 80); X.draw(X.M.cyl(), X.trs([E0[0], 0, E0[2]], [0, age * 0.01, 0], [S.Ew + 3, 12 * g, S.Ew + 2.5]), { color: '#a080ff', alpha: 0.7 }); X.draw(X.M.streaks(), X.trs([E0[0], 0, E0[2]], [0, -age * 0.02, 0], [S.Ew + 2.8, 10 * g, S.Ew + 2.3]), { color: '#e0c0ff', alpha: 0.8 }); });
    S.camMove(170, [E0[0] + 1.5, 2.5, E0[2] + 7.5], [E0[0], 1.5, E0[2]], [E0[0] + 1.0, 3.0, E0[2] + 7.0], [E0[0], 1.5, E0[2]], 50, 50, 'lin');
    S.sfx('magic');
    yield 170;
    const port = { r: 0 };
    S.fxT(200, (cam, k) => { const p = [E0[0], 1.5, E0[2] + 0.5]; X.draw(X.M.solidDisc(), X.bill(cam, p, port.r, port.r), { color: '#000000', blend: 'alpha' }); X.draw(X.M.ring(), X.orient(p, V.scale(cam._basis.f, -1), port.r * 1.05, 1, port.r * 1.05), { color: '#c0a0ff', alpha: 0.9 }); });
    S.track(170, (k) => { port.r = k * 9; }, 'in');
    S.camMove(170, [E0[0] + 0.5, 1.6, E0[2] + 8], [E0[0], 1.5, E0[2]], [E0[0] + 0.3, 1.6, E0[2] + 7.5], [E0[0], 1.5, E0[2]], 50, 50, 'lin');
    yield 170;
    S.dimTo('#000000', 0, 1);
    // --- the knights
    const kn = S.actor(build('knights_of_round'), { pos: [0, -50, 0], scale: SC, visible: false });
    const kp = { swing: 0, raise: 0 };
    kn.pose = (m, t) => { const B_ = m.bones; B_.armL.rot[0] = -kp.raise * 2.6 + kp.swing * 1.2; B_.armR.rot[0] = -kp.raise * 2.6 + kp.swing * 1.2; B_.body.rot[0] = kp.swing * 0.3 - kp.raise * 0.1; B_.thighL.rot[0] = -0.3 * kp.swing; B_.thighR.rot[0] = 0.4 * kp.swing; };
    const plan = [['red', 3], ['violet', 2], ['blue', 2], ['stars', 1], ['green', 2], ['gold', 2]];
    let i = 0;
    for (const [wname, n] of plan) {
      H.world(S, wname);
      S.party(false);
      for (let j = 0; j < n; j++, i++) {
        if (i >= 12) break;
        yield* knightStrike(S, hk, kn, kp, i, worlds[wname]);
      }
    }
    // --- the 13th knight: the King descends in darkness
    H.world(S, 'dark');
    kn.visible = true; kn.tint = null; kn.add = null; kn.alpha = 1; kn.scale = SC * 2.2; kp.swing = 0; kp.raise = 0; setKnight(kn, 12);
    const KP = [E0[0] + 0.4, 0, E0[2] - 5];
    kn.pos = KP.slice(); kn.rot = [0, 0, 0];
    kn.pos[1] = 9;
    S.track(240, (k) => { kn.pos[1] = lerp(9, 0, k); }, 'out');
    S.fxT(240, (cam, k) => { X.glow(cam, A3(kn.pos, [0, 5.2, 0.4]), 1.2, '#ffe080', 0.9 * (1 - k)); X.draw(X.M.sparkle(), X.bill(cam, A3(kn.pos, [0, 5.2, 0.5]), 1.6 * (1 - k), 1.6 * (1 - k), k), { color: '#fff0c0', alpha: 1 - k }); });
    S.camMove(240, [KP[0] + 1, 1.5, KP[2] + 13], [KP[0], 7.5, KP[2]], [KP[0] + 0.5, 1.8, KP[2] + 12], [KP[0], 3.2, KP[2]], 46, 46, 'lin');
    yield 240;
    // his helm, close
    S.camMove(150, [KP[0] + 0.4, 5.1, KP[2] + 2.8], [KP[0], 5.1, KP[2]], [KP[0] + 0.25, 5.1, KP[2] + 2.2], [KP[0], 5.1, KP[2]], 40, 40, 'lin');
    yield 150;
    // he raises the sword; it blazes gold
    S.track(80, (k) => { kp.raise = k; }, 'sine');
    const sw = () => S.bp(kn, 'armR', [0, 0.1, 0.44]);
    S.fxT(220, (cam, k, age) => { const g = Math.min(1, age / 80); X.glow(cam, sw(), 4 * g, '#ffd040', 0.9); X.draw(X.M.raysWide(), X.bill(cam, sw(), 8 * g, 8 * g, age * 0.02), { color: '#fff0a0', alpha: 0.6 * g }); });
    S.camMove(220, [KP[0] + 1.6, 3.2, KP[2] + 11], [KP[0], 4.4, KP[2]], [KP[0] + 1.2, 3.0, KP[2] + 10], [KP[0], 4.8, KP[2]], 50, 50, 'lin');
    yield 170;
    S.track(20, (k) => { kp.raise = 1 - k; kp.swing = k; }, 'in');
    yield 20;
    S.flash('#ffffff', 60, 1); S.shake(10, 40); S.sfx('crit'); S.sfx('bosskill', 0.6);
    kn.visible = false;
    S.env.length = 0;
    const rc = S.resultCam(); S.setCam(rc.eye, rc.target, rc.fov);
    yield 4;
    hk.impact(12);
    yield 90;
    // --- the world cracks like glass and shatters
    S.clearFx(); S.dimTo('#000000', 1, 1);
    const cr = { k: 0 };
    S.fxT(200, (cam, k, age) => { const c = A3(cam.eye, V.scale(cam._basis.f, 3)); if (cr.k > 0) X.draw(H.crackMesh(), X.orient(c, cam._basis.f, 1.5 + cr.k * 3, 1, 1.5 + cr.k * 3, cam), { color: '#ffffff', alpha: Math.min(1, cr.k * 3), noDepth: true }); if (age > 130) X.overlay(cam, '#b0b0b0', (age - 130) / 70); });
    S.track(100, (k) => { cr.k = k; }, 'out');
    S.sfx('ice');
    yield 200;
    const shardsF = S.add(new X.Particles({ world: true, mesh: X.M.shard1(), blend: 'alpha', fade: [1, 10], gravity: 0.01, late: true }));
    const cc = S.cam;
    shardsF.ps.emit(60, () => ({ p: A3(cc.eye, A3(V.scale(X.basis(cc).f, 4 + Math.random() * 3), [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, 0])), v: [0, -0.02, 0], life: 80, size: 0.3 + Math.random() * 0.4, color: '#101010', alpha: 1, rot: [Math.random() * 6, Math.random() * 6, 0], fn: (q) => { q.rot[0] += 0.1; } }));
    S.dimTo('#000000', 0, 60); S.envOff(); S.enemies('battle');
    yield 120;
    yield* S.outro();
  };
  SEQ.knights_of_round.hits = 13;
  SEQ.knights_of_round.frames = 4880;
  // one knight's strike (hit i): arrive, slash, impact
  function* knightStrike(S, hk, kn, kp, i, w) {
    const E0 = S.E, SC = 0.66, side = i % 2 ? 1 : -1;
    kn.visible = true; kn.alpha = 1; kn.scale = SC * (1.4 + (i % 3) * 0.15); kn.tint = null; kn.add = null; setKnight(kn, i);
    kp.swing = 0; kp.raise = 0;
    const from = [E0[0] + side * 9, 4 + (i % 3) * 2, E0[2] + 4 - (i % 4) * 2], to = [E0[0] + side * 1.8, 0.2, E0[2] + 1.6];
    kn.rot = [0, Math.atan2(E0[0] - to[0], E0[2] - to[2]), 0];
    const style = i % 3;
    // camera: 0 = behind the knight, 1 = low side, 2 = high
    const camA = style === 0 ? [[to[0] + side * 3, 2.4, to[2] + 5], [E0[0], 1.4, E0[2]]] : style === 1 ? [[E0[0] - side * 5, 0.8, E0[2] + 5], [to[0], 2.2, to[2]]] : [[E0[0] + side * 2, 7, E0[2] + 6], [E0[0], 0.5, E0[2]]];
    S.camMove(260, camA[0], camA[1], A3(camA[0], [-side * 0.8, 0, -0.6]), camA[1], 50, 48, 'lin');
    S.track(90, (k) => { kn.pos = L3(from, to, k); kp.raise = k; }, 'out');
    S.fxT(90, (cam, k) => X.beam(from, kn.pos, 0.25 * (1 - k), w.streak, 0.6));
    yield 90;
    // the slash
    S.track(14, (k) => { kp.raise = 1 - k; kp.swing = k; }, 'in');
    const sc = S.Ew + 1.4, yaw = kn.rot[1] + (side > 0 ? -1.2 : 1.2);
    S.fxT(30, (cam, k) => { X.draw(X.M.crescent(), X.trs([E0[0], 1.2, E0[2]], [0.3 * side, yaw + k * side * 1.4, 0.4 * side], [sc, 1, sc]), { color: '#ffffff', alpha: 1 - k }); X.draw(X.M.crescent(), X.trs([E0[0], 1.3, E0[2]], [0.3 * side, yaw + k * side * 1.4 - 0.1, 0.4 * side], [sc * 0.9, 1, sc * 0.9]), { color: w.streak, alpha: 0.9 * (1 - k) }); });
    S.sfx(i % 2 ? 'hit' : 'crit', 0.8);
    yield 12;
    S.flash(i % 4 === 3 ? '#ffffff' : '#fff8e0', 12, 0.55); S.shake(6, 14);
    for (const t of S.targets) if (t.model) { const p = S.b.hitPos(t); S.fxT(24, (cam, k) => { X.glow(cam, p, 2.2 * (0.5 + k), '#ffffff', 1 - k); X.draw(X.M.sparkle(), X.bill(cam, p, 2.5 * (1 - k * 0.5), 2.5 * (1 - k * 0.5), k), { color: w.streak, alpha: 1 - k }); }); }
    hk.impact(i);
    yield 100;
    S.track(60, (k) => { kn.alpha = 1 - k; kn.pos = A3(to, [side * k * 3, k * 4, -k * 2]); }, 'in');
    yield 60;
    kn.visible = false;
    yield 10;
  }

  // ================================================================== SHIVA - Diamond Dust  (ref ~20 s)
  // light shaft + snow -> Shiva descends -> close-up -> turns, raises her arm -> ice orb gathers under a
  // darkened sky -> throw (sparkle crosses) -> ice crystals erupt round the enemies -> shards -> damage
  SEQ.shiva = function* (b, a, ab, ts, hk) {
    const S = hk.stage, E0 = S.E;
    yield* S.cast();
    const P0 = [E0[0] + 0.8, 0, E0[2] + 3.4];
    const sh = S.actor(build('shiva'), { pos: [P0[0], 7, P0[2]], rot: [0, PI, 0], scale: 0.8, visible: false });
    const pose = { armR: 1.35, armL: 0.25, look: 0.3, turn: 0, hip: 0 };
    sh.pose = (m, t) => {
      const B_ = m.bones;
      B_.armR.rot[2] = pose.armR; B_.armR.rot[0] = -0.1; B_.armL.rot[2] = pose.armL - 0.1 + sin(t * 0.04) * 0.04;
      B_.head.rot[0] = pose.look; B_.body.rot[1] = pose.turn; B_.body.rot[0] = pose.hip;
      B_.tail.rot[1] = sin(t * 0.05) * 0.18; B_.tail.rot[0] = sin(t * 0.037) * 0.08;
      B_.thighL.rot[0] = 0.05 + sin(t * 0.03) * 0.04; B_.thighR.rot[0] = -0.08;
    };
    const top = (k) => [P0[0], 2.4 + 0.8 * k, P0[2]];
    // --- shot 1: empty arena, a glow grows above
    const c1 = [P0[0] + 2.4, 0.9, P0[2] + 7], t1 = [P0[0], 2.2, P0[2]];
    S.camMove(60, c1, t1, A3(c1, [-0.3, 0.1, -0.6]), A3(t1, [0, 0.6, 0]), 44, 44);
    const shaft = S.fxT(1000, (cam, k, age) => { const al = Math.min(1, age / 50); X.beam([P0[0], -0.2, P0[2]], [P0[0], 30, P0[2]], 1.5, '#b0d0ff', 0.32 * al, X.M.cylMid()); X.beam([P0[0], -0.2, P0[2]], [P0[0], 30, P0[2]], 0.7, '#e8f4ff', 0.3 * al, X.M.cylMid()); X.draw(X.M.disc(), X.trs([P0[0], 0.05, P0[2]], [-PI / 2, 0, 0], [3, 3, 1]), { color: '#a0c8ff', alpha: 0.45 * al }); }, false);
    const snow = S.add(new X.Particles({ keep: true, fade: [10, 20] }));
    const snowTr = S.loop((f) => { if (f % 2 === 0) snow.ps.emit(2, () => ({ p: [P0[0] + (Math.random() - 0.5) * 3.4, 9 + Math.random() * 2, P0[2] + (Math.random() - 0.5) * 3.4], v: [(Math.random() - 0.5) * 0.01, -0.035 - Math.random() * 0.03, 0], life: 200, size: 0.07 + Math.random() * 0.08, color: '#f0f8ff', alpha: 0.9 })); });
    yield 60;
    // --- shot 2: looking up into the shaft, snow falling
    S.camMove(120, [P0[0] + 1.5, 0.6, P0[2] + 5.5], [P0[0], 4.5, P0[2]], [P0[0] + 1.2, 0.7, P0[2] + 4.8], [P0[0], 5.5, P0[2]], 48, 48, 'lin');
    yield 120;
    // --- shot 3: Shiva descends in the light (low camera, legs -> full body)
    sh.visible = true;
    S.moveActor(sh, 130, [P0[0], 5.5, P0[2]], [P0[0], 0.5, P0[2]], 'out');
    S.camMove(120, [P0[0] + 0.4, 0.8, P0[2] - 4.4], [P0[0], 3.6, P0[2]], [P0[0] + 0.7, 1.0, P0[2] - 5.8], [P0[0], 2.6, P0[2]], 50, 46, 'sine');
    yield 120;
    // --- shot 4: close-up, face and chest, looking down
    S.camMove(60, [P0[0] + 0.35, 3.5, P0[2] - 1.6], [P0[0], 3.95, P0[2]], [P0[0] + 0.25, 3.55, P0[2] - 1.35], [P0[0], 3.9, P0[2]], 40, 40);
    yield 60;
    // --- shot 5: she turns (three-quarter view), arm starting to rise
    S.track(60, (k) => { pose.turn = -0.5 * k; pose.armR = 1.35 - 0.6 * k; pose.look = 0.3 - 0.2 * k; }, 'sine');
    S.camMove(60, [P0[0] - 1.8, 2.6, P0[2] - 2.4], [P0[0], 3.1, P0[2]], [P0[0] - 2.1, 2.4, P0[2] - 2.0], [P0[0], 3.2, P0[2]], 44, 44);
    yield 60;
    // --- shot 6: from behind/side as she raises her right arm to the sky
    S.track(60, (k) => { pose.armR = 0.75 - 0.75 * k; pose.turn = -0.5 + 0.5 * k; pose.look = 0.1 - 0.45 * k; }, 'sine');
    S.camMove(60, [P0[0] - 1.2, 2.1, P0[2] + 2.9], [P0[0] - 0.3, 3.6, P0[2]], [P0[0] - 1.5, 1.9, P0[2] + 3.2], [P0[0] - 0.3, 3.9, P0[2]], 46, 46);
    yield 60;
    // --- shot 7: the orbs swirl into a glowing ice sphere above her hand; the sky darkens
    const hand = () => S.bp(sh, 'armR', [-1.05, 5.0, 0.3]);
    const ball = { r: 0.05 };
    const orbFx = S.fxT(360, (cam, k, age) => {
      const hp = hand(), n = 26;
      for (let i = 0; i < n; i++) {
        const ph = i / n * PI * 2, spd = 0.05 + (i % 5) * 0.006, rad = lerp(3.2, 0.2, clamp(age / 240 - (i % 7) * 0.03, 0, 1)) * (0.8 + (i % 3) * 0.15);
        const q = [hp[0] + cos(ph + age * spd) * rad, hp[1] - 1.5 + (i % 6) * 0.45 + sin(age * 0.04 + i) * 0.3 + (1 - rad / 3.2) * 1.2, hp[2] + sin(ph + age * spd) * rad];
        X.glow(cam, q, 0.32, '#e8f0ff', 0.9); X.glow(cam, q, 0.12, '#ffffff', 0.9);
      }
      ball.r = lerp(0.05, 1.05, E.out(Math.min(1, age / 220)));
      X.glow(cam, hp, ball.r * 3.2, '#3060ff', 0.8); X.glow(cam, hp, ball.r * 1.6, '#a0c8ff', 0.9); X.glow(cam, hp, ball.r * 0.7, '#ffffff', 1);
    });
    S.dimTo('#081030', 0.78, 60);
    S.camMove(240, [P0[0] + 0.8, 2.2, P0[2] - 4.6], [P0[0] - 0.4, 4.3, P0[2]], [P0[0] + 1.1, 2.0, P0[2] - 6.0], [P0[0] - 0.4, 4.2, P0[2]], 44, 46, 'lin');
    yield 240;
    // --- shot 8: the throw: sparkle crosses burst, she's seen smaller, drifting up
    S.remove(orbFx);
    S.track(20, (k) => { pose.armR = -0.3 + 0.9 * k; }, 'out');
    const spark = S.add(new X.Particles({ mesh: X.M.sparkle(), fade: [3, 16], drag: 0.97 }));
    const sp0 = hand();
    spark.ps.emit(26, (i) => { const a0 = Math.random() * PI * 2, e0 = (Math.random() - 0.3) * 1.2, sp = 0.05 + Math.random() * 0.09; return { p: sp0.slice(), v: [cos(a0) * cos(e0) * sp, sin(e0) * sp, sin(a0) * cos(e0) * sp - 0.03], life: 80 + Math.random() * 40, size: 0.5 + Math.random() * 0.7, color: i % 3 ? '#a8c8ff' : '#ffffff', roll: Math.random() }; });
    S.fxT(50, (cam, k) => X.glow(cam, sp0, 2.5 * (1 + k * 2), '#6090ff', 1 - k));
    S.flash('#c8e0ff', 12, 0.6);
    S.sfx('ice');
    S.camMove(120, [P0[0] + 2.2, 1.6, P0[2] - 7.5], [P0[0], 3.2, P0[2]], [P0[0] + 2.8, 1.8, P0[2] - 9.5], [P0[0], 3.4, P0[2]], 46, 46, 'out');
    S.moveActor(sh, 120, sh.pos.slice(), A3(sh.pos, [0, 0.6, 0]), 'sine');
    yield 120;
    // --- shot 9: ice crystals erupt round the enemies
    S.untrack(snowTr); S.remove(snow); S.remove(shaft); S.dim = null; sh.visible = false;
    const pts = ts.map(t => S.foot(t));
    const ice = S.fxT(130, (cam, k, age) => {
      const g = E.back(Math.min(1, age / 14)), fade = age > 100 ? 1 - (age - 100) / 30 : 1;
      pts.forEach((p, i) => {
        X.draw(X.M.spikes(), X.trs(p, [0, i * 1.3, 0], [1.6 * g, 2.4 * g, 1.6 * g]), { color: '#3a78e0', alpha: 0.85 * fade, blend: 'alpha' });
        X.draw(X.M.spikes(), X.trs(p, [0, i * 1.3 + 0.5, 0], [1.3 * g, 2.0 * g, 1.3 * g]), { color: '#5090d0', alpha: 0.3 * fade });
        X.glow(cam, A3(p, [0, 1, 0]), 2.4 * g, '#6090e0', 0.3 * fade);
      });
    });
    S.sfx('ice'); S.shake(4, 14);
    const cE = [E0[0] - 2.4, 1.1, E0[2] + 5.2];
    S.camMove(60, cE, [E0[0], 1.3, E0[2]], A3(cE, [0.4, 0.2, -0.8]), [E0[0], 1.2, E0[2]], 46, 46, 'lin');
    yield 60;
    // --- shot 10: shatter - shards fly, damage
    const shards = S.add(new X.Particles({ world: true, mesh: X.M.shard1(), fade: [1, 20], gravity: 0.004, blend: 'alpha' }));
    pts.forEach(p => shards.ps.emit(22, () => { const a0 = Math.random() * PI * 2, sp = 0.06 + Math.random() * 0.12; return { p: A3(p, [0, 0.5 + Math.random() * 1.5, 0]), v: [cos(a0) * sp, 0.05 + Math.random() * 0.08, sin(a0) * sp], life: 70, size: 0.25 + Math.random() * 0.3, color: '#60b8ff', alpha: 0.9, rot: [Math.random() * 6, Math.random() * 6, 0], fn: (q) => { q.rot[0] += 0.2; q.rot[1] += 0.13; } }; }));
    const rc = S.resultCam(6.5, 6);
    S.camMove(120, rc.eye, rc.target, A3(rc.eye, [-0.5, 0.3, -0.4]), rc.target, 44, 44, 'lin');
    S.flash('#e0f0ff', 10, 0.5);
    yield 6;
    hk.impact(0);
    yield 114;
    yield* S.outro();
  };
  SEQ.shiva.frames = 1240;
})();

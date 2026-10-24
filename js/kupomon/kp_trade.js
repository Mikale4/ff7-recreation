// Kupomon: the MogNet Swap's trade scene (the user, 2026-10-04: "Make an animation screen for MogNet trading"), in the
// old games' manner, in 3D: your moogle on the MogNet pad, the tube comes down and it turns to light and shoots up; then
// inside the tubes, rings of light rushing past, your light going away and theirs coming the other way, the two
// passing in a flash; then theirs drops onto the pad and the new moogle stands there. About eight seconds, OK to
// hurry the last line (it goes on by itself, as the hatching does: the Demo needs no answer).
//   const w = KP.tradeScene(sent, got); while (!w.done) yield;   (js/kupomon/kp_breed.js KP.mognetSwap)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, R = FF7.render, MG = FF7.minigames, GL = FF7.GL;
  const W = FF7.W, H = FF7.H, PI = Math.PI;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };
  let MESH = null;
  const GLASS = { tint: [1, 1, 1, 0.3], blend: 'alpha', noDepthWrite: true }, GLOW = { blend: 'add', unlit: true, noDepthWrite: true };   // (see-through; lights)
  const meshes = () => MESH || (MESH = {
    // the pad: a round MogNet plate, a lit rim of beads, the moogle-faced terminal behind
    pad: MG.mesh(mb => {
      mb.sphere(0, -0.02, 0, 0.62, 0.05, 0.62, '#3a4660', 20, 4, true);
      mb.sphere(0, 0.02, 0, 0.5, 0.03, 0.5, '#5a7ab8', 20, 4, true);
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; mb.sphere(Math.cos(a) * 0.57, 0.04, Math.sin(a) * 0.57, 0.035, 0.03, 0.035, i % 2 ? '#ffd860' : '#80e0ff', 6, 4, true); }
      mb.box(0, 0.55, -0.85, 0.5, 1.1, 0.12, '#4a5266'); mb.box(0, 0.78, -0.78, 0.36, 0.3, 0.02, '#1a2a44');
      mb.sphere(0, 1.22, -0.85, 0.08, 0.08, 0.08, '#ff5a7a', 8, 6, true); mb.box(0, 1.12, -0.85, 0.012, 0.12, 0.012, '#8a8e96');
    }),
    // the tube that comes down over the pad (see-through)
    tube: MG.mesh(mb => { mb.sphere(0, 0, 0, 0.42, 1.2, 0.42, '#a0e0ff', 16, 8, true); }, { blend: 'alpha', cull: false }),
    // a ring of light inside the tubes, and the two lights
    ring: MG.mesh(mb => { for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; mb.sphere(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0, 0.07, 0.07, 0.07, i % 3 ? '#5ab0ff' : '#c0f0ff', 5, 4, true); } }),
    mine: MG.mesh(mb => { mb.sphere(0, 0, 0, 0.18, 0.18, 0.18, '#ff8ab0', 12, 8, true); mb.sphere(0, 0, 0, 0.3, 0.3, 0.3, '#ffd0e0', 10, 6, true); }, { blend: 'alpha' }),
    theirs: MG.mesh(mb => { mb.sphere(0, 0, 0, 0.18, 0.18, 0.18, '#7af0ff', 12, 8, true); mb.sphere(0, 0, 0, 0.3, 0.3, 0.3, '#d0faff', 10, 6, true); }, { blend: 'alpha' }),
  });
  KP.tradeScene = function (sent, got) { const w = { done: false }; S().push(new Trade(sent, got, w)); return w; };

  // ---- in the room (the user, 2026-10-04: "where is the mognet pad inside of the building? ... the moogle being
  // transferred should visually come out of cloud and walk over to the pad ... the newly traded over moogle should walk
  // off the pad and into cloud"): a MogNet pad stands in the ranch (map.kpMognetPad, its tile; the prop kp_mognetpad);
  // Cloud steps up beside it, his moogle pops out of him and walks onto it, the trade scene plays, and the new one stands
  // on the pad, walks to Cloud and pops in
  // the pad: a round metal plate, a lit blue disc and a ring of lights, a little aerial with a red pom (the MogNet's)
  if (FF7.field && FF7.field.props) FF7.field.props.kp_mognetpad = (mb, x, y, z) => {
    mb.prism(x, y, z, 0.23, 0.21, 0.04, 18, '#3a4660');                               // (the plate)
    mb.prism(x, y + 0.04, z, 0.17, 0.17, 0.012, 18, '#5a8ad8');                        // (the lit disc)
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; mb.sphere(x + Math.cos(a) * 0.2, y + 0.05, z + Math.sin(a) * 0.2, 0.016, 0.014, 0.016, i % 2 ? '#ffd860' : '#80e0ff', 5, 3, true); }
    mb.box(x + 0.19, y + 0.2, z - 0.19, 0.02, 0.4, 0.02, '#8a8e96');                    // (the aerial)
    mb.sphere(x + 0.19, y + 0.42, z - 0.19, 0.04, 0.04, 0.04, '#ff5a7a', 8, 6, true);
  };
  // a short walk on a field map: breadth first over the floor, round the people standing there; [[x, y], ...] or null
  KP.fieldPath = function (fs, from, to) {
    const T = FF7.field.TILE, P = fs.P, key = (x, y) => x + ',' + y, busy = new Set();
    for (const a of Object.values(fs.actors || {})) if (a && a !== fs.player && a.visible !== false) busy.add(key(Math.round(a.x / T - 0.5), Math.round(a.z / T - 0.5)));
    const prev = new Map([[key(from[0], from[1]), null]]), q = [from];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === to[0] && y === to[1]) { const out = []; for (let k = key(x, y); k; k = prev.get(k)) out.unshift(k.split(',').map(Number)); return out.slice(1); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = y + dy, k = key(a, b);
        if (prev.has(k) || a < 0 || b < 0 || a >= P.w || b >= P.h || !P.walkable(a, b) || (busy.has(k) && !(a === to[0] && b === to[1]))) continue;
        prev.set(k, key(x, y)); q.push([a, b]);
      }
    }
    return null;
  };
  // the trade in the room, round the scene: s the field script, sent and got the two moogles
  KP.tradeInRoom = function* (s, sent, got) {
    const fs = s.field, pad = fs && fs.map && fs.map.kpMognetPad, T = FF7.field.TILE;
    if (!pad) { const w = KP.tradeScene(sent, got); while (!w.done) yield; return; }
    const spot = [pad[0] + 1, pad[1]], p = fs.player, here = [Math.round(p.x / T - 0.5), Math.round(p.z / T - 0.5)];
    if (here[0] !== spot[0] || here[1] !== spot[1]) {   // (Cloud steps up beside the pad)
      const path = KP.fieldPath(fs, here, spot);
      if (path && path.length) yield s.move('player', path); else s.place('player', spot[0], spot[1]);
    }
    yield s.face('player', 'left');
    const model = (sp) => ({ enemy: 'kp_' + sp, scale: 0.8 });
    s.spawn('kp_trade_mon', model(sent.sp), spot[0], spot[1], 'left');                  // (out of Cloud: a pop of light)
    s.flash('#ffffff', 8, 0.55); s.sfx('jump');
    yield s.move('kp_trade_mon', pad[0], pad[1]);
    yield s.face('kp_trade_mon', 'down');
    s.sfx('beep'); yield 24;
    { const w = KP.tradeScene(sent, got); while (!w.done) yield; }
    s.remove('kp_trade_mon');
    s.spawn('kp_trade_mon', model(got.sp), pad[0], pad[1], 'down');                    // (the new one, on the pad)
    s.sfx('ching'); yield 30;
    yield s.face('kp_trade_mon', 'right');
    yield s.move('kp_trade_mon', spot[0], spot[1]);                                      // (to Cloud, and into him)
    s.flash('#ffffff', 8, 0.55); s.sfx('jump');
    s.remove('kp_trade_mon');
    yield 10;
  };
  class Trade {
    constructor(sent, got, w) {
      this.sent = sent; this.got = got; this.w = w; this.t = 0; this.cam = new MG.Cam(); this.text = null; this.flash = 0;
      const model = (sp) => { try { const m = KP.moogleModel(sp); m.scale = 1.05; if (m.anims && m.anims.idle) m.play(m.anims.idle); return m; } catch (e) { return null; } };
      this.mSent = model(sent.sp); this.mGot = model(got.sp);
      this.phase = 'send'; this.co = new FF7.Coroutine(this.flow());
    }
    *flow() {
      const nm = KP.name(this.sent), sp = KP.SPECIES[this.got.sp];
      // 1. on the pad: the tube comes down, it turns to light, the light shoots up
      this.text = `Sending ${nm} down the MogNet...`;
      this.tubeY = 2.6; this.show = 'sent';
      for (let k = 0; k < 40; k++) yield;
      sfx('beep');
      for (let k = 0; k < 36; k++) { this.tubeY = 2.6 - (k / 35) * 1.42; yield; }
      sfx('ching'); this.flash = 1;
      for (let k = 0; k < 14; k++) { this.flash = 1 - k / 14; if (k === 4) this.show = 'orbUp'; yield; }
      sfx('jump');
      for (let k = 0; k < 40; k++) { this.orbY = 0.5 + Math.pow(k / 40, 2) * 3.4; yield; }
      // 2. inside the tubes: the rings rush past, the two lights pass each other
      this.phase = 'tube'; this.text = null; this.tubeT = 0;
      for (let k = 0; k < 170; k++) {
        this.tubeT = k;
        if (k === 100) { sfx('ching'); this.flash = 0.9; }   // (they pass)
        if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.06);
        yield;
      }
      // 3. back at the pad: theirs drops in, the flash, the new moogle
      this.phase = 'send'; this.show = 'orbDown'; this.tubeY = 1.18; this.text = 'Something is coming back up the MogNet...';
      for (let k = 0; k < 36; k++) { this.orbY = 4 - Math.pow(k / 36, 0.7) * 3.5; yield; }
      sfx('levelup'); this.flash = 1; this.show = 'got';
      for (let k = 0; k < 16; k++) { this.flash = 1 - k / 16; yield; }
      for (let k = 0; k < 30; k++) { this.tubeY = 1.18 + (k / 29) * 1.5; yield; }
      this.text = `${this.got.ot ? this.got.ot.split(' of ')[0] : 'Someone'} sent ${sp ? sp.moogle : this.got.sp} the ${KP.jobName(this.got)}!`;
      let k = 0; while (this.text) { k++; if ((k > 20 && FF7.input.pressed('ok')) || k > 140) this.text = null; yield; }
      S().pop(); this.w.done = true;
    }
    update() {
      this.t++; this.co.update();
      if (this.mSent) this.mSent.update(1); if (this.mGot) this.mGot.update(1);
    }
    render() {
      const M = meshes();
      if (this.phase === 'tube') {
        // inside the tubes: the camera looks down the tunnel; the rings come at it; ours goes away, theirs comes on
        MG.sky('#020612', '#0a1a3a');
        this.cam.set([0, 0, 0], [0, 0, -10], 70, 0.05, 60);
        GL.begin({ clear: [0, 0, 0, 0], light: { dir: [0, 0, -1], color: [1, 1, 1], ambient: [0.9, 0.9, 1] } });
        this.cam.apply();
        const k = this.tubeT, run = (k * 0.55) % 3;
        for (let i = 0; i < 14; i++) { const z = -i * 3 + run; MG.put(M.ring, [0, 0, z - 2], [0, 0, k * 0.01 + i * 0.3], 1, { unlit: true }); }
        const mz = -2 - k * 0.16, tz = -40 + k * 0.4;   // (ours away, theirs on: level near frame 100)
        if (mz > -40) MG.put(M.mine, [Math.sin(k * 0.1) * 0.25, Math.cos(k * 0.08) * 0.2, mz], [0, 0, 0], 1, GLOW);
        if (tz < 1) MG.put(M.theirs, [-Math.sin(k * 0.1) * 0.25, -Math.cos(k * 0.08) * 0.2, tz], [0, 0, 0], 1, GLOW);
        GL.end();
        if (this.flash > 0) R.fill('#ffffff', this.flash);
        R.text('MogNet', 18, 14, { size: 13, weight: '800', color: 'rgba(160,220,255,0.7)' });
        return;
      }
      MG.sky('#0e1830', '#3a5a8a');
      this.cam.set([0, 1.25, 3.3], [0, 0.6, 0], 40, 0.1, 50);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.95, 0.93, 0.9], ambient: [0.5, 0.52, 0.6] } });
      this.cam.apply();
      MG.put(M.pad, [0, 0, 0], [0, 0, 0], 1);
      MG.shadow(0, 0.01, 0, 0.4, 0.3);
      const spin = this.t * 0.02;
      if (this.show === 'sent' && this.mSent) MG.drawModel(this.mSent, [0, 0.03, 0], spin, 0, 0, null);
      if (this.show === 'got' && this.mGot) MG.drawModel(this.mGot, [0, 0.03, 0], spin, 0, 0, this.flash > 0.3 ? { add: [0.6, 0.6, 0.6] } : null);
      if (this.show === 'orbUp' || this.show === 'orbDown') MG.put(this.show === 'orbUp' ? M.mine : M.theirs, [0, this.orbY || 0.5, 0], [0, 0, 0], 1 + 0.08 * Math.sin(this.t * 0.4), GLOW);
      if (this.tubeY != null) MG.put(M.tube, [0, this.tubeY, 0], [0, 0, 0], 1, GLASS);
      GL.end();
      if (this.flash > 0) R.fill('#ffffff', this.flash);
      R.window(0, H - 80, W, 80);
      if (this.text) R.para(this.text, 22, H - 64, W - 44, { size: 17, lines: 2 });
    }
  }
  KP.Trade = Trade;
})();

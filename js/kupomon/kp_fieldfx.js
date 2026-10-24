// Kupomon's field effects, drawn (the user, 2026-10-02: "field effects should have graphics too"). For as long as each
// lasts, in the battle scene (js/kupomon/kp_battle.js render calls these every frame):
//  * the weather over the whole picture (draw2d, on the canvas over the 3D): Radiance's golden light shafts and
//    sparkles, Gloom's dark vignette and drifting motes, a Sandstorm's blowing grit, a Manastorm's violet crackle
//  * the terrain on the ground (draw3d): a glow in its colour, and its own sign: the Rhythm Field's rings pulsing out,
//    the Lifestream's green motes rising, the Fog's low banks drifting, the Time Field's golden clock face
//  * the zones in the air: Time Warp's violet dome and the orbs circling backwards, Gravity's streaks falling and its
//    dark well, the Null Zone's grey grid, the Wonder Zone's ring of every colour
//  * each side's conditions at its platform: Protect's blue barrier and Shell's violet one toward the foe, the Veil's
//    shining dome, Tailwind's streaks blowing past, Safeguard's sparkles circling, Mist's white haze round its feet
//  * each side's hazards on the ground round its platform: Caltrops (more for each layer), Landmines with a blinking
//    light, Venom Spikes, a Web
// Built from simple low-poly meshes, translucent and additive, like the moves' effects (js/kupomon/kp_fx.js).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, MG = FF7.minigames, R = FF7.render;
  const PI = Math.PI;
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // (fixed scatter, no state)

  // ------------------------------------------------------------------ the meshes (built once)
  let M = null;
  const meshes = () => M || (M = {
    disc: MG.mesh(mb => mb.prism(0, 0, 0, 1, 1, 0.001, 36, '#ffffff', false, true, false), { unlit: true }),
    ring: MG.mesh(mb => { const n = 48; for (let i = 0; i < n; i++) { const a = i / n * PI * 2, b = (i + 1) / n * PI * 2, r0 = 0.9, r1 = 1;
      mb.quad([Math.cos(a) * r0, 0, Math.sin(a) * r0], [Math.cos(b) * r0, 0, Math.sin(b) * r0], [Math.cos(b) * r1, 0, Math.sin(b) * r1], [Math.cos(a) * r1, 0, Math.sin(a) * r1], '#ffffff'); } }, { unlit: true, cull: false }),
    // a barrier: a curved panel, a slice of a cylinder facing +z, with a brighter rim along its top and sides
    arc: MG.mesh(mb => { const n = 14, a0 = -1.0, a1 = 1.0;
      for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n;
        const p = (t, y) => [Math.sin(t), y, Math.cos(t)];
        mb.quad(p(a, 0), p(b, 0), p(b, 1), p(a, 1), '#ffffff'); mb.quad(p(a, 0.94), p(b, 0.94), p(b, 1), p(a, 1), '#ffffff'); } }, { unlit: true, cull: false }),
    dome: MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#ffffff', 18, 10, true, null, 5), { unlit: true, cull: false }),
    spark: MG.SPARK,
    streak: MG.mesh(mb => mb.box(0, 0, 0, 1, 0.02, 0.02, '#ffffff'), { unlit: true }),
    bar: MG.mesh(mb => mb.box(0, 0.5, 0, 0.02, 1, 0.02, '#ffffff'), { unlit: true }),
    spike: MG.mesh(mb => { mb.prism(0, 0, 0, 0.035, 0, 0.1, 4, '#9a9a8a'); mb.prism(0.03, 0, 0.02, 0.025, 0, 0.07, 4, '#7a7a6a'); }),
    venom: MG.mesh(mb => { mb.prism(0, 0, 0, 0.03, 0, 0.13, 5, '#8a3aaa'); mb.prism(-0.03, 0, 0.02, 0.022, 0, 0.09, 5, '#5a2a7a'); }),
    mine: MG.mesh(mb => { mb.sphere(0, 0, 0, 0.09, 0.05, 0.09, '#6a5a48', 8, 4, true, null, 2); mb.prism(0, 0.04, 0, 0.012, 0.012, 0.02, 6, '#2a2a2a'); }),
    web: MG.mesh(mb => { const q = (a, b, w) => { const dx = b[2] - a[2], dz = a[0] - b[0], l = Math.hypot(dx, dz) || 1, k = w / l;
        mb.quad([a[0] - dx * k, 0, a[2] - dz * k], [b[0] - dx * k, 0, b[2] - dz * k], [b[0] + dx * k, 0, b[2] + dz * k], [a[0] + dx * k, 0, a[2] + dz * k], '#ffffff'); };
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; q([0, 0, 0], [Math.cos(a), 0, Math.sin(a)], 0.02); }
      for (const r of [0.3, 0.55, 0.8]) for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, b = (i + 1) / 8 * PI * 2; q([Math.cos(a) * r, 0, Math.sin(a) * r], [Math.cos(b) * r, 0, Math.sin(b) * r], 0.016); } }, { unlit: true, cull: false }),
    tick: MG.mesh(mb => mb.box(0, 0, 0, 0.05, 0.004, 0.16, '#ffffff'), { unlit: true }),
    hand: MG.mesh(mb => mb.box(0, 0, 0.5, 0.05, 0.004, 1, '#ffffff'), { unlit: true }),
  });
  const glow = (col, a) => ({ blend: 'add', tint: [col[0], col[1], col[2], a], unlit: true });
  const veil = (col, a) => ({ blend: 'alpha', tint: [col[0], col[1], col[2], a], unlit: true, cull: false });

  // the middle of the field, between the two platforms
  const MID = [0.15, 0, -0.38];
  KP.fieldFx = {};

  // ------------------------------------------------------------------ in the 3D scene (after the moogles, before the moves' effects)
  // at(side): a platform's place now (the opening slides them in); face(side): the way it faces the other
  KP.fieldFx.draw3d = function (B, at, face) {
    const m = meshes(), t = B.t || 0, fade = Math.min(1, (B.open == null ? 1 : B.open) * 1.4);
    if (fade <= 0) return;
    // ---- the terrain
    if (B.terrain && KP.TERRAINS[B.terrain.id]) {
      const id = B.terrain.id, col = rgb(KP.TERRAINS[id].col), p = 0.5 + 0.5 * Math.sin(t * 0.05);
      MG.put(m.disc, [MID[0], 0.008, MID[2]], null, [3.4, 1, 2.4], veil(col, (0.26 + 0.08 * p) * fade));
      MG.put(m.ring, [MID[0], 0.012, MID[2]], null, [3.4, 1, 2.4], glow(col, (0.35 + 0.15 * p) * fade));   // (its edge, bright)
      if (id === 'rhythm') for (let k = 0; k < 3; k++) {   // rings pulsing out, to the beat
        const ph = ((t + k * 30) % 90) / 90; MG.put(m.ring, [MID[0], 0.014, MID[2]], null, [0.3 + 3 * ph, 1, 0.22 + 2.1 * ph], glow(col, (1 - ph) * 0.55 * fade));
      }
      if (id === 'lifestream') for (let i = 0; i < 36; i++) {   // green motes rising from the ground
        const ph = ((t * (0.004 + hash(i) * 0.004) + hash(i + 9)) % 1), x = MID[0] + (hash(i + 3) - 0.5) * 5.4, z = MID[2] + (hash(i + 5) - 0.5) * 3.6;
        MG.put(m.spark, [x + Math.sin(t * 0.03 + i) * 0.05, ph * 1.6, z], null, 0.05 * (1 - ph * 0.5), glow(col, (1 - ph) * 0.95 * fade));
      }
      if (id === 'fog') for (let k = 0; k < 4; k++) {   // low banks drifting across
        const dx = Math.sin(t * 0.006 + k * 1.7) * 0.8;
        MG.put(m.disc, [MID[0] + dx + (k - 1.5) * 0.9, 0.12 + k * 0.07, MID[2] + (k % 2 ? 0.5 : -0.4)], null, [1.9, 1, 1.1], veil([0.92, 0.94, 0.98], 0.13 * fade));
      }
      if (id === 'chrono') {   // a golden clock face round the field, its hands going round
        MG.put(m.ring, [MID[0], 0.014, MID[2]], null, [2.6, 1, 1.9], glow(col, 0.6 * fade));
        for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; MG.put(m.tick, [MID[0] + Math.sin(a) * 2.35, 0.016, MID[2] + Math.cos(a) * 1.72], [0, a, 0], 1, glow(col, 0.7 * fade)); }
        MG.put(m.hand, [MID[0], 0.018, MID[2]], [0, t * 0.01, 0], [1, 1, 1.5], glow(col, 0.6 * fade));
        MG.put(m.hand, [MID[0], 0.018, MID[2]], [0, t * 0.0009, 0], [1.4, 1, 1.0], glow(col, 0.6 * fade));
      }
    }
    // ---- the zones
    const rooms = B.rooms || {};
    if (rooms.timewarp) {   // a violet dome over the field, and orbs circling it backwards
      const col = rgb(KP.ROOMS.timewarp.col);
      MG.put(m.dome, [MID[0], 0, MID[2]], null, [3.6, 2.6, 2.8], veil(col, (0.12 + 0.04 * Math.sin(t * 0.04)) * fade));
      for (let i = 0; i < 8; i++) { const a = -t * 0.012 + i / 8 * PI * 2; MG.put(m.spark, [MID[0] + Math.sin(a) * 3.0, 1.7 + Math.sin(t * 0.03 + i) * 0.1, MID[2] + Math.cos(a) * 2.2], null, 0.06, glow(col, 0.8 * fade)); }
    }
    if (rooms.gravity) {   // streaks falling hard, and a dark well on the ground
      const col = rgb(KP.ROOMS.gravity.col);
      MG.put(m.disc, [MID[0], 0.01, MID[2]], null, [3.0, 1, 2.1], veil([0.08, 0.04, 0.12], 0.22 * fade));
      for (let i = 0; i < 22; i++) { const ph = (t * 0.03 + hash(i)) % 1, x = MID[0] + (hash(i + 7) - 0.5) * 5.6, z = MID[2] + (hash(i + 11) - 0.5) * 3.4;
        MG.put(m.bar, [x, 2.4 - ph * 2.6, z], null, [1, 0.5, 1], glow(col, 0.7 * (1 - ph) * fade)); }
    }
    if (rooms.nullzone) {   // a grey grid hanging over the field
      const col = rgb(KP.ROOMS.nullzone.col), y = 1.95 + Math.sin(t * 0.02) * 0.05;
      for (let i = -3; i <= 3; i++) { MG.put(m.streak, [MID[0], y, MID[2] + i * 0.55], null, [6, 1, 1], glow(col, 0.5 * fade)); MG.put(m.streak, [MID[0] + i * 0.85, y, MID[2]], [0, PI / 2, 0], [4, 1, 1], glow(col, 0.5 * fade)); }
    }
    if (rooms.wonderzone) {   // a ring of every colour turning about the field
      for (let i = 0; i < 18; i++) { const a = t * 0.01 + i / 18 * PI * 2, h = (i / 18 + t * 0.002) % 1;
        const c = [0.5 + 0.5 * Math.cos(h * PI * 2), 0.5 + 0.5 * Math.cos((h - 1 / 3) * PI * 2), 0.5 + 0.5 * Math.cos((h - 2 / 3) * PI * 2)];
        MG.put(m.spark, [MID[0] + Math.sin(a) * 2.8, 1.0 + Math.sin(a * 2 + t * 0.02) * 0.3, MID[2] + Math.cos(a) * 2.0], null, 0.045, glow(c, 0.85 * fade)); }
    }
    // ---- each side: its conditions and hazards, at its platform
    for (const side of ['me', 'foe']) {
      const sd = B.sides && B.sides[side]; if (!sd) continue;
      const p = at(side), yaw = face(side), cond = sd.cond, haz = sd.haz;
      if (cond.wall) MG.put(m.arc, [p[0], 0, p[2]], [0, yaw, 0], [0.82, 1.25, 0.82], veil(rgb(KP.SIDE_CONDS.wall.col), (0.22 + 0.06 * Math.sin(t * 0.07)) * fade));
      if (cond.shell) MG.put(m.arc, [p[0], 0, p[2]], [0, yaw, 0], [0.95, 1.4, 0.95], veil(rgb(KP.SIDE_CONDS.shell.col), (0.22 + 0.06 * Math.sin(t * 0.07 + 1)) * fade));
      if (cond.veil) MG.put(m.dome, [p[0], 0, p[2]], null, [0.95, 1.5, 0.8], glow(rgb(KP.SIDE_CONDS.veil.col), (0.16 + 0.08 * Math.sin(t * 0.09)) * fade));
      if (cond.tailwind) { const col = rgb(KP.SIDE_CONDS.tailwind.col), dir = side === 'me' ? 1 : -1;
        for (let i = 0; i < 9; i++) { const ph = (t * 0.025 + hash(i + 40)) % 1; MG.put(m.streak, [p[0] + dir * (ph * 2.4 - 1.2), 0.15 + hash(i + 41) * 1.2, p[2] + (hash(i + 42) - 0.5) * 1.1], null, [0.5, 1, 1], glow(col, Math.sin(ph * PI) * 0.8 * fade)); } }
      if (cond.safeguard) { const col = rgb(KP.SIDE_CONDS.safeguard.col);
        MG.put(m.ring, [p[0], 0.02, p[2]], null, [0.85, 1, 0.65], glow(col, 0.45 * fade));
        for (let i = 0; i < 6; i++) { const a = t * 0.03 + i / 6 * PI * 2; MG.put(m.spark, [p[0] + Math.sin(a) * 0.7, 0.3 + 0.5 * ((i % 3) / 2) + Math.sin(t * 0.05 + i) * 0.08, p[2] + Math.cos(a) * 0.5], null, 0.035, glow(col, 0.9 * fade)); } }
      if (cond.mist) for (let k = 0; k < 3; k++) MG.put(m.disc, [p[0] + Math.sin(t * 0.01 + k * 2) * 0.12, 0.08 + k * 0.08, p[2] + Math.cos(t * 0.012 + k) * 0.1], null, [0.95 - k * 0.12, 1, 0.7 - k * 0.08], veil([0.92, 0.95, 1], 0.18 * fade));
      // hazards: a ring of them round the platform's edge (more for each layer)
      const spot = (i, n, r0) => { const a = (i + hash(i + side.length * 13) * 0.6) / n * PI * 2, r = r0 + hash(i + 50) * 0.2; return [p[0] + Math.sin(a) * r * 1.15, 0, p[2] + Math.cos(a) * r * 0.85]; };
      if (haz.caltrops) { const n = 6 * haz.caltrops; for (let i = 0; i < n; i++) MG.put(m.spike, spot(i, n, 0.85), [0, hash(i) * 6, 0], 1); }
      if (haz.venom_spikes) { const n = 6 * haz.venom_spikes, col = rgb(KP.HAZARDS.venom_spikes.col); for (let i = 0; i < n; i++) { const s = spot(i + 30, n, 0.7); MG.put(m.venom, s, [0, hash(i + 3) * 6, 0], 1); MG.put(m.spark, [s[0], 0.05, s[2]], null, 0.05, glow(col, 0.35 * fade)); } }
      if (haz.mines) for (let i = 0; i < 3; i++) { const s = spot(i + 60, 3, 0.95); MG.put(m.mine, s, null, 1); if ((t + i * 20) % 60 < 30) MG.put(m.spark, [s[0], 0.075, s[2]], null, 0.02, glow([1, 0.15, 0.1], 0.95 * fade)); }
      // (the web lies over the platform, whose top is 0.04 up: under it, only its tips showed past the edge)
      if (haz.web) MG.put(m.web, [p[0], 0.048, p[2]], [0, 0.3, 0], [0.95, 1, 0.75], veil([0.95, 0.95, 0.9], 0.7 * fade));
    }
  };

  // ------------------------------------------------------------------ over the picture: the weather
  KP.fieldFx.draw2d = function (B) {
    const w = B.weatherId ? B.weatherId() : null; if (!w) return;
    const c = R.ctx, W = FF7.W, H = FF7.H, t = B.t || 0, fade = Math.min(1, (B.open == null ? 1 : B.open) * 1.4);
    if (fade <= 0) return;
    c.save(); c.globalAlpha = fade;
    if (w === 'radiance') {   // golden shafts of light from above, a warm wash, sparkles
      c.fillStyle = 'rgba(255,224,130,0.08)'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = (hash(i) * W * 1.2 + Math.sin(t * 0.004 + i) * 40) - W * 0.1, wd = 50 + hash(i + 2) * 70, a = 0.07 + 0.04 * Math.sin(t * 0.02 + i * 2);
        const g = c.createLinearGradient(x, 0, x - 120, H); g.addColorStop(0, `rgba(255,236,160,${a})`); g.addColorStop(1, 'rgba(255,236,160,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + wd, 0); c.lineTo(x + wd - 160, H); c.lineTo(x - 160, H); c.closePath(); c.fill();
      }
      for (let i = 0; i < 24; i++) { const x = hash(i + 20) * W, y = hash(i + 21) * H * 0.75, k = Math.max(0, Math.sin(t * 0.06 + i * 1.7)); if (k < 0.2) continue;
        c.fillStyle = `rgba(255,248,210,${0.6 * k})`; c.fillRect(x - 1, y - 4 * k, 2, 8 * k); c.fillRect(x - 4 * k, y - 1, 8 * k, 2); }
    } else if (w === 'gloom') {   // the light gone heavy: a dark vignette, motes of shadow drifting down
      const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.45, W * 0.75);
      g.addColorStop(0, 'rgba(30,20,60,0.05)'); g.addColorStop(1, 'rgba(14,8,34,0.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const x = (hash(i) * W + Math.sin(t * 0.01 + i) * 20 + t * 0.15) % W, y = (hash(i + 5) * H + t * (0.2 + hash(i + 6) * 0.3)) % H;
        c.fillStyle = `rgba(60,40,100,${0.35 + 0.25 * hash(i + 7)})`; c.beginPath(); c.arc(x, y, 1.5 + hash(i + 8) * 2.5, 0, PI * 2); c.fill(); }
    } else if (w === 'sandstorm') {   // grit blowing hard across, a tan haze
      c.fillStyle = 'rgba(200,160,96,0.2)'; c.fillRect(0, 0, W, H);
      c.lineWidth = 1.5;
      for (let i = 0; i < 90; i++) { const sp = 9 + hash(i) * 9, x = (hash(i + 1) * (W + 200) + t * sp) % (W + 200) - 100, y = (hash(i + 2) * H + t * sp * 0.25) % H, l = 14 + hash(i + 3) * 24;
        c.strokeStyle = `rgba(${210 + (i % 3) * 10},${170 + (i % 4) * 8},${110},${0.35 + 0.35 * hash(i + 4)})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l, y - l * 0.25); c.stroke(); }
      for (let i = 0; i < 6; i++) { const x = (hash(i + 70) * W + t * 3) % (W + 300) - 150, y = H * (0.45 + hash(i + 71) * 0.45);
        const g = c.createRadialGradient(x, y, 0, x, y, 120); g.addColorStop(0, 'rgba(210,175,120,0.18)'); g.addColorStop(1, 'rgba(210,175,120,0)'); c.fillStyle = g; c.fillRect(x - 120, y - 120, 240, 240); }
    } else if (w === 'manastorm') {   // raw mana: a violet cast, sparks drifting up, a crackle of arcs now and then
      c.fillStyle = 'rgba(138,90,208,0.12)'; c.fillRect(0, 0, W, H);
      // (the sparks drawn over, not added: added on a bright sky they went white and read as snow)
      c.shadowColor = '#9a50ff'; c.shadowBlur = 6;
      for (let i = 0; i < 36; i++) { const x = (hash(i) * W + Math.sin(t * 0.03 + i) * 12) % W, y = H - ((hash(i + 3) * H + t * (0.6 + hash(i + 4))) % H);
        c.fillStyle = `rgba(${150 + (i % 3) * 25},${70 + (i % 4) * 15},255,${0.6 + 0.3 * Math.sin(t * 0.2 + i)})`; c.beginPath(); c.arc(x, y, 1.8 + hash(i + 5) * 1.6, 0, PI * 2); c.fill(); }
      c.shadowBlur = 0;
      c.globalCompositeOperation = 'lighter';
      const k = Math.floor(t / 7);
      if (hash(k) < 0.45) {   // an arc of mana, flickering for a few frames
        c.strokeStyle = 'rgba(220,190,255,0.8)'; c.lineWidth = 2; c.shadowColor = '#b080ff'; c.shadowBlur = 10;
        let x = hash(k + 1) * W, y = hash(k + 2) * H * 0.3; c.beginPath(); c.moveTo(x, y);
        for (let s = 0; s < 7; s++) { x += (hash(k * 7 + s) - 0.5) * 70; y += 25 + hash(k * 7 + s + 3) * 25; c.lineTo(x, y); }
        c.stroke();
      }
    }
    c.restore();
  };
})();

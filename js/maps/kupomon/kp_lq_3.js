// Kupomon, the legends' sidequests 6-8 (docs/KUPOMON_LEGENDS.md): Mogglemog (The Pom Court), Tempomog (Midnight,
// Eighty Years) and Luxmog (The Four Lights). Three new maps, kp_lq_pom_court, kp_lq_tempo_belfry and
// kp_lq_lux_shrine; the rest is added to the region maps at load time (this file loads after them: js/maps/_maps.js
// lists it as 'kupomon/kp_lq_3.js', after the region files). Every quest registers itself in KP.QUESTS for the Demo.
// Our own words throughout. Each reward also gives the legend's first breeding item, and someone from the quest sells
// more afterwards (js/kupomon/kp_legendbreed.js): Pomperly in the Court (Court Lantern), the Clockmaker (Midnight
// Spring), the Pilgrim on Route 14 (Light Wick).
//
// THE ANSWERS (the Demo's plans below follow them):
//   6. THE POM COURT. The six poms: the Minstrel in Mogridge's market (Clap!), Sir Fuzzleby among Route 6's scarecrows
//      (a trainer battle), the Cook in Fernwick's Mog Center (one Kupo Nut), the Jester in Sandsea's Grand Bazaar
//      (riddle: a pom-pom), the Gardener in Bloomhaven (the planter east of the canal, the one that giggles), the
//      Pursebearer on Costa del Kupo's beach (the purse is under the sand west of the pier). The lanterns, in the order
//      of the Court Song: gold (16,8), blue (10,2), pink (6,12), orange (4,8), green (14,12), purple (5,4), red (15,4).
//   7. THE BELFRY. Past: the sarcophagus in the Wrapmog's tomb. Now: Mogridge's market clock, five minutes FORWARD.
//      Tomorrow: Skyport's Countdown Crew (Tick, then Tock). The spindles, first to last: the dusty gear on the left
//      (5,10), the shiny one in the middle (7,10), the bright new one on the right (9,10).
//   8. THE SHRINE OF LIGHT. Earth, Mt. Kupo's glowing chamber (push puzzle): boulder A (6,6) from (7,6) west, then from
//      (5,7) north; boulder B (8,6) from (9,6) west, then from (7,7) north; the cart (3,6) from (2,6) east, onto the
//      plate (9,6). (Rocks at (6,5) and (8,7) stop the boulders going straight off the rail.) Fire, Tifa at the Nibel
//      Peaks temple (a trainer battle). Water, the lighthouse keeper's riddle: the light. Wind, Skyport's four
//      windsocks on the launch pad (they start N, S, W, N): (9,3) one quarter turn, (15,6) three, (23,3) two, (28,6)
//      one; all four at the mooring mast (east). The pedestals: earth NE (13,9), fire SE (13,15), water NW (2,9),
//      wind SW (2,15).
(function () {
  const KP = FF7.kupomon, W = KP && KP.W, F = FF7.field;
  if (!KP || !W || !F) return;
  const PI = Math.PI, sh = (c, k) => FF7.util.shade(c, k);
  const M = (id) => FF7.maps[id];
  const flag = (n) => !!(FF7.state && FF7.state.flags && FF7.state.flags[n]);
  const vget = (n) => (FF7.state && FF7.state.vars && FF7.state.vars[n]) || 0;
  const L = (lv) => lv * 0.6;   // (W.team reads team levels on the old cap of 30, KP.LV: Lv 48 is written 28.8)
  const held = (team) => KP.leagueHeld ? KP.leagueHeld(team) : team;   // (quest trainers hold items, as the leagues' do)
  const pm = (sp, k = 0.8) => ({ enemy: 'kp_' + sp, scale: k });         // a moogle as a field model
  const got = function* (s, id, n = 1) { KP.give(id, n); s.sfx('found'); yield s.msg(KP.got(id, n)); };
  // an actor gone from the map (a beaten legend fled): the Demo's plans pass over the talk then
  const gone = (id) => () => { const f = FF7.fieldScene, a = f && f.actors && f.actors[id]; return !a || !a.visible; };
  const faceTile = function* (s, id, x, y) {
    const a = s.actor(id); if (!a || a.tx == null) return;
    const dx = x - a.tx, dy = y - a.ty;
    yield s.face(id, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  // ------------------------------------------------------------------ adding to the region maps (other quest files
  // add to the same maps: a tile is checked free of exits, NPCs, triggers, objects and items first)
  const npcOf = (map, id) => ((M(map) || {}).npcs || []).find(n => n && n.id === id);
  const taken = (map, x, y) => {
    const m = M(map); if (!m) return true;
    const inR = (at) => at && x >= at[0] && x < at[0] + (at[2] || 1) && y >= at[1] && y < at[1] + (at[3] || 1);
    return (m.exits || []).some(e => inR(e.at)) || (m.npcs || []).some(n => n && n.at && n.at[0] === x && n.at[1] === y) ||
      (m.items || []).some(i => i && i.at && i.at[0] === x && i.at[1] === y) || (m.triggers || []).some(t => t && t.on === 'talk' && inR(t.at)) ||
      (m.objects || []).some(o => o && o.at && Math.round(o.at[0]) === x && Math.round(o.at[1]) === y);
  };
  // the first free tile of the candidates (the first one, with a warning, if none is)
  const pick = (map, cands, what) => {
    const ok = cands.find(([x, y]) => !taken(map, x, y));
    if (!ok) console.warn(`kp_lq_3: ${map}: no free tile for ${what}`);
    return (ok || cands[0]).slice();
  };
  const add = (map, key, list) => { const m = M(map); if (!m) { console.warn('kp_lq_3: no map ' + map); return; } m[key] = (m[key] || []).concat(list); };
  // an existing NPC's talk, wrapped: pre(s, t0) runs first and returns true when it has handled the talk
  const wrapTalk = (map, id, pre) => {
    const n = npcOf(map, id); if (!n) { console.warn('kp_lq_3: no npc ' + id + ' on ' + map); return; }
    const t0 = n.talk;
    n.talk = function* (s) { if (yield* pre(s, t0)) return; if (t0) yield* t0(s); };
  };

  // ------------------------------------------------------------------ our own props (lq3_*), for the maps and as the
  // models of objects and actors
  const rod = (mb, a, b, r, col, n = 6) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]); if (len < 1e-6) return;
    mb.push(); mb.translate(a[0], a[1], a[2]); mb.rotate(0, Math.atan2(d[0] / len, d[2] / len), 0); mb.rotate(Math.acos(Math.max(-1, Math.min(1, d[1] / len))), 0, 0);
    mb.prism(0, 0, 0, r, r, len, n, col); mb.pop();
  };
  const P = F.props;
  // a little round door in a bank of roots, facing south (o.open: lit from inside)
  P.lq3_rounddoor = (mb, x, y, z, s, th, nb, o = {}) => {
    const r = o.r || 0.27, wood = o.col || '#7a4e26', cy = y + r + 0.03;
    mb.push(); mb.translate(x, cy, z); mb.rotate(PI / 2, 0, 0);
    mb.prism(0, -0.03, 0, r + 0.06, r + 0.06, 0.05, 14, '#4a3420');
    mb.prism(0, -0.01, 0, r, r, 0.05, 14, o.open ? '#ffd890' : wood);
    mb.pop();
    if (!o.open) [-0.5, 0, 0.5].forEach(k => mb.box(x + k * r, cy, z + 0.045, 0.018, r * 1.7 * Math.sqrt(1 - k * k), 0.012, sh(wood, -0.3)));
    mb.sphere(x + r * 0.55, cy, z + 0.06, 0.03, 0.03, 0.03, '#e0b840', 6, 4);
  };
  // a paper pom lantern hanging from a curling root (o.lit: glowing in its colour)
  P.lq3_pomlantern = (mb, x, y, z, s, th, nb, o = {}) => {
    const root = o.col2 || '#5a4028', base = o.col || '#f0c030', c = o.lit ? base : sh(base, -0.62);
    rod(mb, [x - 0.08, y, z], [x - 0.06, y + 1.95, z], 0.05, root, 6);
    rod(mb, [x - 0.06, y + 1.95, z], [x + 0.12, y + 2.06, z], 0.035, root, 5);
    mb.box(x + 0.12, y + 1.9, z, 0.01, 0.3, 0.01, '#2a2018');
    mb.sphere(x + 0.12, y + 1.6, z, 0.13, 0.15, 0.13, c, 10, 6);
    mb.prism(x + 0.12, y + 1.74, z, 0.045, 0.04, 0.04, 6, '#2a2018');
    mb.sphere(x + 0.12, y + 1.41, z, 0.045, 0.045, 0.045, o.lit ? sh(base, 0.35) : sh(base, -0.5), 6, 4);
    mb.sphere(x - 0.08, y + 0.02, z, 0.14, 0.05, 0.14, '#3e6a2a', 7, 3);
  };
  // a mushroom throne: a stout stem, a seat, the red cap for a back
  P.lq3_mushthrone = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.sphere(x, y + 0.02, z, 0.42, 0.06, 0.42, '#4e7a34', 8, 3);
    mb.prism(x, y, z, 0.2, 0.16, 0.4, 10, '#efe6d2', true);
    mb.prism(x, y + 0.38, z, 0.34, 0.36, 0.07, 12, '#e8dcc4');
    mb.sphere(x, y + 0.5, z - 0.17, 0.42, 0.5, 0.16, '#d8344a', 10, 6);
    [[-0.2, 0.7], [0.12, 0.84], [0.22, 0.58], [-0.04, 0.96], [-0.26, 0.48]].forEach(([dx, h]) => mb.sphere(x + dx, y + h, z - 0.02, 0.05, 0.05, 0.02, '#fff8f0', 6, 4));
  };
  // a small mushroom (o.size, o.col)
  P.lq3_shroom = (mb, x, y, z, s, th, nb, o = {}) => {
    const k = o.size || 1, c = o.col || '#d8344a';
    mb.prism(x, y, z, 0.05 * k, 0.04 * k, 0.16 * k, 6, '#efe6d2');
    mb.sphere(x, y + 0.17 * k, z, 0.12 * k, 0.08 * k, 0.12 * k, c, 8, 4, true, null, 3);
  };
  // a pom of light (the Good King's arrival)
  P.lq3_glowball = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.sphere(x, y + 0.3, z, 0.3, 0.3, 0.3, o.col || '#ffd8f0', 12, 8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; mb.sphere(x + Math.cos(a) * 0.36, y + 0.3 + Math.sin(i * 1.7) * 0.16, z + Math.sin(a) * 0.36, 0.07, 0.07, 0.07, '#ffffff', 6, 4); }
  };
  // a mine's ore cart, its wheels along x (it rolls east-west)
  P.lq3_cart = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#6a5a4a';
    mb.frustum(x, y + 0.1, z, 0.34, 0.26, 0.42, 0.32, 0.22, { side: c, top: '#3a3028', front: sh(c, 0.08) });
    [-1, 1].forEach(i => [-1, 1].forEach(k => { mb.push(); mb.translate(x + i * 0.13, y + 0.07, z + k * 0.15); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.02, 0, 0.065, 0.065, 0.04, 8, '#2a2a2e'); mb.pop(); }));
    for (let i = 0; i < 5; i++) mb.sphere(x + (i - 2) * 0.06, y + 0.33, z + ((i % 2) - 0.5) * 0.08, 0.07, 0.05, 0.07, i % 2 ? '#c8a050' : '#8a7a6a', 6, 3);
  };
  // a windsock: the pole, and the striped sock streaming south at rot 0 (an object's rot turns it)
  P.lq3_windsock = (mb, x, y, z, s, th, nb, o = {}) => {
    mb.prism(x, y, z, 0.12, 0.12, 0.05, 8, '#6a6a70');
    mb.prism(x, y, z, 0.035, 0.03, 1.9, 6, '#d8d8d0');
    for (let i = 0; i < 4; i++) { mb.push(); mb.translate(x, y + 1.8, z + 0.04 + i * 0.12); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.11 - i * 0.02, 0.09 - i * 0.02, 0.12, 8, i % 2 ? '#f4f0e8' : '#f07020'); mb.pop(); }
  };
  // a kite, tangled, with the wind crystal tied to its tail
  P.lq3_kite = (mb, x, y, z, s, th, nb, o = {}) => {
    const a = o.col || '#e04a6a', b = o.col2 || '#f4d040', w = 0.3, h = 0.4, cy = y + 0.1;
    const T = [x, cy + h, z], B = [x, cy - h * 0.75, z], Lp = [x - w, cy + h * 0.2, z], Rp = [x + w, cy + h * 0.2, z], C = [x, cy + h * 0.2, z + 0.05];
    [[Lp, C, T, a], [C, Rp, T, b], [Lp, B, C, b], [C, B, Rp, a]].forEach(([p, q, r, col]) => { mb.tri(p, q, r, col); mb.tri(r, q, p, sh(col, -0.25)); });
    rod(mb, [x - w * 0.9, cy + h * 0.2, z + 0.02], [x + w * 0.9, cy + h * 0.2, z + 0.02], 0.008, '#5a4030', 4);
    rod(mb, [x, cy + h, z + 0.02], [x, cy - h * 0.75, z + 0.02], 0.008, '#5a4030', 4);
    for (let i = 1; i <= 4; i++) mb.box(x + Math.sin(i * 1.3) * 0.05, cy - h * 0.75 - i * 0.12, z, 0.08, 0.03, 0.01, i % 2 ? a : b);
    mb.spike([x, cy - h * 0.75 - 0.66, z], [0, 1, 0], 0.16, 0.05, 5, '#5ad08a');
  };
  // a stone brazier on a pedestal (o.lit: burning)
  P.lq3_brazier = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#8a847a';
    mb.prism(x, y, z, 0.22, 0.18, 0.08, 8, sh(c, -0.25));
    mb.prism(x, y + 0.08, z, 0.09, 0.08, 0.46, 8, c);
    mb.prism(x, y + 0.54, z, 0.1, 0.3, 0.2, 10, sh(c, 0.06));
    mb.prism(x, y + 0.72, z, 0.27, 0.27, 0.03, 10, o.lit ? '#ff9a3a' : '#2a2622');
    if (o.lit) [[0, 0, 0.44, '#ff6a20'], [0.09, 0.05, 0.3, '#ffb040'], [-0.08, -0.05, 0.32, '#ffd060'], [0.03, -0.1, 0.26, '#ff8a30']].forEach(([dx, dz, hh, col]) => mb.spike([x + dx, y + 0.74, z + dz], [dx, 1, dz], hh, 0.09, 5, col));
  };
  // a brass gear on a wall, facing south (o.r radius m, o.y centre height m)
  P.lq3_gear = (mb, x, y, z, s, th, nb, o = {}) => {
    const r = o.r || 0.5, c = o.col || '#a8823a', n = o.teeth || Math.max(8, Math.round(r * 24)), cy = y + (o.y != null ? o.y : 1.5), t0 = o.turn || 0;
    mb.push(); mb.translate(x, cy, z + (o.dz || 0.04)); mb.rotate(PI / 2, 0, 0);
    mb.prism(0, -0.035, 0, r, r, 0.07, 20, c);
    mb.prism(0, -0.05, 0, r * 0.2, r * 0.2, 0.1, 8, sh(c, -0.35));
    for (let i = 0; i < n; i++) { mb.push(); mb.rotate(0, -(t0 + i / n * PI * 2), 0); mb.box(r + 0.035, 0, 0, 0.07, 0.065, Math.max(0.05, r * 0.16), sh(c, -0.08)); mb.pop(); }
    for (let i = 0; i < 5; i++) { mb.push(); mb.rotate(0, -(t0 + i / 5 * PI * 2), 0); mb.box(r * 0.55, 0.04, 0, r * 0.7, 0.02, 0.05, sh(c, -0.25)); mb.pop(); }
    mb.pop();
  };
  // the great bell, its crown at o.top m, on a yoke
  P.lq3_bell = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#b8892e', top = y + (o.top || 2.85);
    const pr = [[0.1, 0], [0.2, 0.08], [0.25, 0.3], [0.29, 0.6], [0.4, 0.86], [0.47, 0.98]];
    for (let i = 0; i < pr.length - 1; i++) mb.prism(x, top - pr[i + 1][1], z, pr[i + 1][0], pr[i][0], pr[i + 1][1] - pr[i][1], 16, sh(c, 0.06 - i * 0.05), true, false, false);
    mb.prism(x, top - 1.02, z, 0.48, 0.48, 0.04, 16, sh(c, -0.3));
    mb.prism(x, top - 0.99, z, 0.4, 0.4, 0.02, 16, '#1a120a');
    rod(mb, [x, top - 0.1, z], [x, top - 0.88, z], 0.02, '#3a2a1a', 5);
    mb.sphere(x, top - 0.9, z, 0.07, 0.08, 0.07, sh(c, -0.4), 7, 5);
    mb.prism(x, top, z, 0.05, 0.05, 0.22, 6, '#3a3028');
    mb.box(x, top + 0.26, z, 1.7, 0.14, 0.16, '#4a3624');
  };
  // the clock's hands seen from behind the dial (o.min: minutes past twelve; from behind they turn the other way)
  P.lq3_hands = (mb, x, y, z, s, th, nb, o = {}) => {
    const cy = y + (o.y || 1.9), cz = z + (o.dz || 0), c = o.col || '#1c1610', a = (o.min || 0) / 60 * PI * 2;
    const hand = (len, w, ang, dz) => { mb.push(); mb.translate(x, cy, cz + dz); mb.rotate(0, 0, ang); mb.box(0, len / 2, 0, w, len, 0.015, c); mb.pop(); };
    hand(0.34, 0.05, 0, 0); hand(0.52, 0.03, a, 0.016);
    mb.sphere(x, cy, cz + 0.03, 0.035, 0.035, 0.02, '#c8a040', 6, 4);
  };
  // a spindle on a workbench (o.base: the bench top, m; o.gear: the colour of the gear fitted on it)
  P.lq3_spindle = (mb, x, y, z, s, th, nb, o = {}) => {
    const b = y + (o.base || 0.45);
    mb.prism(x, b, z, 0.07, 0.06, 0.025, 8, '#4a4a52');
    mb.prism(x, b, z, 0.022, 0.018, 0.2, 6, '#9a9aa2');
    if (o.gear) { mb.prism(x, b + 0.07, z, 0.12, 0.12, 0.035, 14, o.gear); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; mb.box(x + Math.cos(a) * 0.14, b + 0.088, z + Math.sin(a) * 0.14, 0.04, 0.035, 0.04, sh(o.gear, -0.15)); } }
  };
  // the sword in the stone (o.lift: the stone's top, m; o.dx: off the tile's centre, m)
  P.lq3_sword = (mb, x, y, z, s, th, nb, o = {}) => {
    const b = y + (o.lift || 0), X = x + (o.dx || 0);
    mb.box(X, b + 0.36, z, 0.065, 0.72, 0.018, '#eef2fa');
    mb.box(X, b + 0.36, z, 0.02, 0.7, 0.024, '#c8d0e0');
    mb.box(X, b + 0.74, z, 0.28, 0.045, 0.06, '#d8b040');
    mb.box(X, b + 0.86, z, 0.045, 0.2, 0.045, '#4a3a8a');
    mb.sphere(X, b + 0.98, z, 0.045, 0.045, 0.045, '#e8c050', 6, 4);
  };
  // a bridge of light, rolling out west from its tile (o.len tiles)
  P.lq3_lightbridge = (mb, x, y, z, s, th, nb, o = {}) => {
    const n = o.len || 7, c = o.col || '#fff2b0';
    for (let i = 0; i < n; i++) mb.box(x - i * s, y + 0.03 - i * 0.03, z, s * 0.98, 0.05, s * 0.9, i % 2 ? c : sh(c, 0.12));
    [-1, 1].forEach(k => rod(mb, [x + s / 2, y + 0.14, z + k * s * 0.46], [x - (n - 0.5) * s, y + 0.14 - n * 0.03, z + k * s * 0.46], 0.015, '#ffffff', 4));
  };
  // a puff of cloud (o.r: its size, tiles)
  P.lq3_cloud = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = (o.r || 1.2) * s, c = o.col || '#ffffff';
    [[0, 0, 1, 0.5], [0.55, 0.2, 0.7, 0.4], [-0.5, -0.15, 0.75, 0.42], [0.1, -0.5, 0.6, 0.36], [-0.2, 0.5, 0.65, 0.38]].forEach(([dx, dz, k, hy], i) =>
      mb.sphere(x + dx * R, y + hy * R * 0.35, z + dz * R, R * k, R * k * 0.45, R * k, sh(c, -0.04 * (i % 3)), 10, 5));
  };
  // a pale shrine glimpsed in the clouds
  P.lq3_shrineghost = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#eef0ff';
    mb.prism(x, y, z, 1.1, 1.0, 0.25, 10, sh(c, -0.1));
    [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].forEach(([dx, dz]) => mb.prism(x + dx, y + 0.25, z + dz, 0.09, 0.08, 1.1, 8, c));
    mb.prism(x, y + 1.35, z, 0.95, 0, 0.5, 4, c);
  };

  // ------------------------------------------------------------------ the key items (the Bag's Key Items pocket)
  const POM_FOUND = () => [1, 2, 3, 4, 5, 6].filter(i => flag('kp_lq_pom_c' + i)).length;
  const TEMPO_FOUND = () => ['past', 'now', 'next'].filter(k => flag('kp_lq_tempo_' + k)).length;
  const LUX_LIT = () => ['earth', 'fire', 'water', 'wind'].filter(k => flag('kp_lq_lux_' + k)).length;
  KP.ITEMS.lq_court_roll = { name: 'Court Roll', kind: 'key', price: 0,
    get desc() { return 'The Pom Court, A to Z: Cook, Gardener, Herald, Jester, Knight, Minstrel, Pursebearer. ' + (flag('kp_lq_pom_done') ? 'And at the bottom, in fresh ink: you, Friend of the Court.' : `Found: ${POM_FOUND()} of 6.`); } };
  KP.ITEMS.lq_backward_watch = { name: 'Backward Watch', kind: 'key', price: 0,
    get desc() { return flag('kp_lq_tempo_done') ? 'Mended. It ticks forwards now. Mostly.' : `It spins near a lost moment: the past (an old tomb), now (a clock that's wrong), tomorrow (a countdown). Found: ${TEMPO_FOUND()} of 3.`; } };
  KP.ITEMS.lq_time_gears = { name: 'Time Gears', kind: 'key', price: 0,
    get desc() { return `Gears that fell out of the Ravenmoor clock. Time Gears: ${TEMPO_FOUND()} of 3. They go on the Belfry's spindles, first to last.`; } };
  KP.ITEMS.lq_crystals = { name: 'Crystals of Light', kind: 'key', price: 0,
    get desc() { return `Four crystals, grey as slate till they're lit. Lit: ${LUX_LIT()} of 4. The old order: earth, then fire, then water, then wind.`; } };

  // ================================================================== 6. MOGGLEMOG: THE POM COURT
  // The court, in the order of the Court Song (the lanterns' order): each pom's stump and lantern in the Court, and
  // its flag (kp_lq_pom_c1..c6) and the road it marches in by in the roll call (scene B)
  const COURT = [
    { k: 'herald', role: 'Herald', name: 'Pomperly', col: '#f0c030', colName: 'gold', sp: 'rubimog_round_herald', stump: [14, 8], lamp: [16, 8] },
    { k: 'knight', role: 'Knight', name: 'Sir Fuzzleby', col: '#3a6ae0', colName: 'blue', sp: 'pomlance_knight', stump: [10, 4], lamp: [10, 2], c: 2,
      present: 'Present!', march: [[10, 13], [9, 12], [9, 5], [10, 5], [10, 4]],
      hint: 'Sir Fuzzleby said he was going "undercover in a field". He is VERY proud of his disguise.' },
    { k: 'minstrel', role: 'Minstrel', name: 'Warblet', col: '#f080c0', colName: 'pink', sp: 'lutemog_minstrel', stump: [8, 10], lamp: [6, 12], c: 1,
      present: 'Present~ ♪', march: [[10, 13], [9, 11], [8, 10]],
      hint: 'The Minstrel goes wherever there might be applause. A market, I bet. Mogridge has a lovely market.' },
    { k: 'cook', role: 'Cook', name: 'Simmerkin', col: '#f08a30', colName: 'orange', sp: 'puddipom_cook', stump: [6, 8], lamp: [4, 8], c: 3,
      present: 'Present. And hungry.', march: [[10, 13], [8, 12], [7, 11], [6, 9], [6, 8]],
      hint: "The Cook never strays far from a soup pot. Try a Mog Center kitchen. Fernwick's does the best soup." },
    { k: 'gardener', role: 'Gardener', name: 'Mossbottom', col: '#4ab04a', colName: 'green', sp: 'hedgepom_gardener', stump: [12, 10], lamp: [14, 12], c: 5,
      present: 'Here.', march: [[10, 13], [11, 11], [12, 10]],
      hint: "The Gardener can't resist a flower bed. Bloomhaven, obviously. Listen for giggling." },
    { k: 'jester', role: 'Jester', name: 'Tumblepuff', col: '#9a4ad0', colName: 'purple', sp: 'kefkupo_court_jester', stump: [7, 5], lamp: [5, 4], c: 4,
      present: 'Absent! ...Kidding.', march: [[10, 13], [8, 12], [5, 10], [5, 6], [7, 5]],
      hint: 'The Jester needs a crowd and a riddle. Somewhere with a bazaar. Somewhere hot.' },
    { k: 'purser', role: 'Pursebearer', name: 'Pennypom', col: '#e03a3a', colName: 'red', sp: 'kupokid_mog_merchant', stump: [13, 5], lamp: [15, 4], c: 6,
      present: 'Here, with the purse!', march: [[10, 13], [11, 12], [11, 6], [12, 5], [13, 5]],
      hint: 'The Pursebearer went to the seaside. With the royal purse. Oh dear. Oh dear oh dear.' },
  ];
  const ROLL = ['knight', 'minstrel', 'cook', 'jester', 'gardener', 'purser'].map(k => COURT.find(c => c.k === k));
  const cid = (c) => 'lq_pom_c_' + c.k;
  const SONG = ['♪ Gold for the Herald, who calls us to court,\nBlue for the Knight, who is brave (and quite short),\nPink for the Minstrel, that\'s me, la-la-LAA,\nOrange, the Cook, with the soup in the jar, ♪',
    '♪ Green for the Gardener, roots in the loam,\nPurple, the Jester, who\'s never at home,\nRed for the Purse, who comes last, as is right:\nLight us in order, the King comes tonight! ♪'];

  // a pom of the court leaves for the Court: a hop, a puff, gone
  function* offToCourt(s, id, who, flagName) {
    yield s.say(who, 'Off to court, kupo!');
    s.sfx('hop'); s.emote(id, '♪');
    const a = s.actor(id);
    if (a && a.tx != null) yield s.jump(id, a.tx, a.ty, 0.7, 20);
    s.flash('#ffe0f0', 10, 0.4); s.remove(id);
    s.set(flagName);
    const n = POM_FOUND();
    yield s.msg(n >= 6 ? 'The Court Roll: all six found! Pomperly will want to hear about this.' : `The Court Roll: ${n} of 6 found.`);
  }
  function* courtSong(s, who) { yield s.say(who, SONG); }

  // ---- Whisperwood Deep: Pomperly in the fairy ring; the little door in the Great Hollow Tree's roots
  const POM_HERALD = pick('kp_whisperwood_deep', [[16, 13], [17, 13], [16, 12]], 'Pomperly');
  const POM_DOOR = pick('kp_whisperwood_deep', [[15, 9], [14, 9]], 'the Hollow Tree door');
  function* heraldTalk(s) {
    const id = 'lq_pom_herald';
    if (!s.flag('kp_lq_pom_open')) {   // A. A court with no king
      s.stopAnim(id);
      yield s.emote(id, '!');
      yield s.jump(id, POM_HERALD[0], POM_HERALD[1], 0.6, 18);
      yield s.face(id, 'player');
      yield s.say('Pomperly', "A CHAMPION! In OUR wood! This is perfect. This is a disaster. It's both, kupo.");
      yield s.say('Pomperly', "I'm Pomperly, Herald of the Pom Court. Our Good King only comes when the whole court believes in him at once.");
      yield s.say('Pomperly', 'But the court went on holiday. Separately. Without telling anyone.');
      s.set('kp_lq_pom_open');
      yield* got(s, 'lq_court_roll');
      yield s.say('Pomperly', "The Court Roll! Seven names. Mine's the easy one. Find the other six and send them home, kupo!\fThey'll be wherever poms go on holiday. Which is... everywhere.");
      return;
    }
    const left = COURT.filter(c => c.c && !s.flag('kp_lq_pom_c' + c.c));
    if (left.length) {
      yield s.say('Pomperly', `${6 - left.length} of six! Still missing: ${left.map(c => 'the ' + c.role).join(', ')}.`);
      yield s.say('Pomperly', left[0].hint);
      return;
    }
    // all six: the door
    yield s.say('Pomperly', 'All six! The WHOLE court! ...Right. Deep breath. Herald things.');
    yield s.move(id, [[POM_DOOR[0] + 1, POM_DOOR[1] + 2], [POM_DOOR[0], POM_DOOR[1] + 1]]);
    yield s.face(id, 'up');
    s.sfx('door');
    yield s.say('Pomperly', 'Knock knock, kupo!');
    s.flash('#ffd890', 16); s.sfx('ching');
    s.set('kp_lq_pom_door');
    yield s.msg('Between the roots of the Great Hollow Tree, a little round door swings open. Warm light spills out.');
    yield s.face(id, 'player');
    yield s.say('Pomperly', "Come in, Champion. Wipe your boots. It's a royal hollow.");
    yield s.move(id, POM_DOOR[0], POM_DOOR[1]);
    s.remove(id);
  }
  {
    const WD = 'kp_whisperwood_deep', m = M(WD), herald = POM_HERALD, door = POM_DOOR;
    if (m) m.entries.from_court = [door[0], door[1] + 1, 'down'];
    FF7.patchMap(WD, {
      npcs: [{ id: 'lq_pom_herald', name: 'Pomperly', model: pm('rubimog_round_herald'), at: herald, dir: 'down', anim: 'sit',
        show: s => s.flag('kp_champion') && !s.flag('kp_lq_pom_door'), talk: heraldTalk }],
      exits: [{ at: [door[0], door[1], 1, 1], to: 'kp_lq_pom_court', entry: 'from_deep', sfx: 'door', if: s => s.flag('kp_lq_pom_door'),
        blocked: function* (s) { yield s.msg(s.flag('kp_lq_pom_open') ? "The little round door in the roots is shut tight. Pomperly will want the whole court back first." : 'A tiny round door, half hidden between the roots. It is shut tight. Somebody very small lives here.'); } }],
      objects: [{ id: 'lq_pom_door', at: [door[0], 8.54], prop: 'lq3_rounddoor', y0: 0.3, solid: false, open: false, stateKey: 'shut',
        tick(o) { const op = flag('kp_lq_pom_door'); if (o.open !== op) { o.open = op; o.stateKey = op ? 'open' : 'shut'; } } }],
    });
  }

  // ---- Mogridge's market: the Minstrel
  function* minstrelTalk(s) {
    const id = 'lq_pom_minstrel';
    yield s.emote(id, '♪');
    yield s.say('Warblet', '♪ La la la LAAA... ♪\fOh! An audience! Well. An audience of one. Was that lovely, or WAS that lovely?');
    const c = yield s.ask('Warblet', 'Go on. Show your appreciation.', ['Clap!', 'Walk away']);
    if (c !== 0) { yield s.say('Warblet', '...Tough crowd.'); return; }
    s.sfx('confirm');
    yield s.say('Warblet', 'Thank you, thank you! For that, you get the Court Song. Every pom knows it. Well. Every pom SHOULD.');
    yield* courtSong(s, 'Warblet');
    yield s.say('Warblet', "Pomperly sent you? The court's coming back together? Then I'm on my way!");
    yield* offToCourt(s, id, 'Warblet', 'kp_lq_pom_c1');
  }
  // ---- Route 6: Sir Fuzzleby, among the scarecrows
  const KNIGHT_AT = pick('kp_route6', [[10, 20], [11, 20], [10, 19]], 'Sir Fuzzleby');
  const KNIGHT = W.trainer({ id: 'lq_pom_knight', name: 'Sir Fuzzleby', model: pm('pomlance_knight', 0.85), at: KNIGHT_AT, dir: 'down', bg: 'grass', ai: 'smart', noBag: true, money: 2400,
    team: held([['woolpom_animist', L(48)], ['kupage_mog_knight', L(48)], ['chocomog_knight', L(49)]]),
    line: '...I am a scarecrow. Scarecrows do not talk.\f...CURSES! You saw through my disguise! Have at thee, kupo!',
    lose: 'Bested! By a commoner! A champion commoner, but still.', after: 'Off to court, kupo!',
    show: s => s.flag('kp_lq_pom_open') && !s.flag('kp_lq_pom_c2') });
  function* knightTalk(s) {
    if (!W.beaten('lq_pom_knight')) {
      yield s.msg('A scarecrow in a straw hat and a very small suit of armour.\f...It is breathing.');
      yield* KNIGHT.npc.talk(s);
      if (!W.beaten('lq_pom_knight')) return;
    }
    yield s.say('Sir Fuzzleby', 'Hah! Nobody suspects the scarecrow! ...Except you. Pomperly sent you, eh?');
    yield* offToCourt(s, 'lq_pom_knight', 'Sir Fuzzleby', 'kp_lq_pom_c2');
  }
  // ---- Fernwick's Mog Center: the Cook
  function* cookTalk(s) {
    yield s.say('Simmerkin', "The royal soup needs one Kupo Nut. ONE. I've been stirring an empty pot for a week, kupo.");
    if (!((KP.data().bag || {}).kupo_nut > 0)) { yield s.say('Simmerkin', "Not even one Kupo Nut? The Mart's right there! I'd go myself, but I can't leave the pot."); return; }
    const c = yield s.ask('Simmerkin', 'Spare a Kupo Nut for the royal soup?', ['Here you go', 'Not now']);
    if (c !== 0) { yield s.say('Simmerkin', '*stir* *stir* *sigh*'); return; }
    KP.take('kupo_nut', 1); s.sfx('confirm');
    yield s.say('Simmerkin', 'Mmm! Pom stew! It smells like home. ...HOME! The court! Is Pomperly calling everyone back?');
    yield* offToCourt(s, 'lq_pom_cook', 'Simmerkin', 'kp_lq_pom_c3');
  }
  // ---- Sandsea's Grand Bazaar: the Jester
  function* jesterTalk(s) {
    yield s.say('Tumblepuff', 'A champion! In the bazaar! Quick, a riddle, before you wander off!');
    const c = yield s.ask('Tumblepuff', "I'm round, I'm pink, and I bounce when you're happy. What am I?", ['A pom-pom', 'A Kupo Nut', 'A chocobo']);
    if (c === 1) { yield s.say('Tumblepuff', 'A Kupo Nut is round. Is it pink? Does it bounce? ...Okay, it bounces a bit. WRONG! Ask me again!'); return; }
    if (c === 2) { yield s.say('Tumblepuff', "A chocobo is yellow, and it only bounces when it's ANGRY. Wrong! Ask me again, I love this part!"); return; }
    s.sfx('confirm');
    yield s.say('Tumblepuff', 'A POM-POM! Correct! You win... my immediate departure! The court needs its Jester, kupo!');
    yield* offToCourt(s, 'lq_pom_jester', 'Tumblepuff', 'kp_lq_pom_c4');
  }
  // ---- Bloomhaven: the Gardener, hiding in the flower bed that giggles
  function* gardenerTalk(s) {
    yield s.say('Mossbottom', "Hee hee! ...Oh. You found me. Nobody EVER finds me. I'm very good at being a flower.");
    yield s.say('Mossbottom', 'Pomperly wants the court back? Then I suppose I should un-flower myself.');
    yield* offToCourt(s, 'lq_pom_gardener', 'Mossbottom', 'kp_lq_pom_c5');
  }
  // ---- Costa del Kupo's beach: the Pursebearer, and the purse under the sand by the pier
  function* purserTalk(s) {
    if (!s.flag('kp_lq_pom_purse')) {
      yield s.say('Pennypom', 'The royal purse! I buried it on the beach so nobody would steal it.\fThen the tide came in and moved the beach. ...Beaches move, right?');
      yield s.say('Pennypom', "It's by the pier. Probably. Would you dig about for me? I'd do it, but sand gets in my pom-pom.");
      s.set('kp_lq_pom_purse');
      return;
    }
    yield s.say('Pennypom', "Any luck? It's by the pier. The pier hasn't moved. I checked twice.");
  }
  function* digSand(s) {
    yield s.msg('You dig in the sand beside the pier... Sand. More sand. A crab, who is not pleased...\f...CLINK!');
    s.sfx('found');
    yield s.msg('A little velvet purse, crusted with salt. It jingles.');
    if (s.actor('lq_pom_purser')) { yield s.emote('lq_pom_purser', '!!'); yield s.face('lq_pom_purser', 'player'); }
    yield s.say('Pennypom', 'MY PURSE! The royal treasury! Eleven shells and a button, all present and correct!');
    s.set('kp_lq_pom_purse');
    yield* offToCourt(s, 'lq_pom_purser', 'Pennypom', 'kp_lq_pom_c6');
  }
  const pomHunt = (c) => s => s.flag('kp_lq_pom_open') && !s.flag('kp_lq_pom_c' + c);
  {
    const MINSTREL = pick('kp_mogridge', [[34, 9], [35, 9], [34, 10]], 'the Minstrel');
    FF7.patchMap('kp_mogridge', { npcs: [{ id: 'lq_pom_minstrel', name: 'Warblet', model: pm('lutemog_minstrel'), at: MINSTREL, dir: 'down', show: pomHunt(1), talk: minstrelTalk }] });
    FF7.patchMap('kp_route6', { npcs: [Object.assign({}, KNIGHT.npc, { talk: knightTalk })] });
    const COOK = pick('kp_fernwick_center', [[5, 5], [5, 3], [13, 5]], 'the Cook');
    FF7.patchMap('kp_fernwick_center', { npcs: [{ id: 'lq_pom_cook', name: 'Simmerkin', model: pm('puddipom_cook'), at: COOK, dir: 'down', show: pomHunt(3), talk: cookTalk }] });
    const JESTER = pick('kp_sandsea_bazaar', [[2, 6], [1, 6], [2, 3]], 'the Jester');
    FF7.patchMap('kp_sandsea_bazaar', { npcs: [{ id: 'lq_pom_jester', name: 'Tumblepuff', model: pm('kefkupo_court_jester'), at: JESTER, dir: 'right', show: pomHunt(4), talk: jesterTalk }] });
    // (three flower beds by the canal: the Gardener in the one east of it; the other two are only flowers)
    const BEDS = [[26, 10], [20, 12], [17, 8]].filter(([x, y]) => !taken('kp_bloomhaven', x, y));
    if (BEDS.length) {
      FF7.patchMap('kp_bloomhaven', {
        npcs: [{ id: 'lq_pom_gardener', name: 'Mossbottom', model: pm('hedgepom_gardener', 0.55), at: BEDS[0], dir: 'down', hover: 0.32, show: pomHunt(5), talk: gardenerTalk }],
        triggers: BEDS.slice(1).map(([x, y], i) => ({ at: [x, y], on: 'talk', if: pomHunt(5),
          run: function* (s) { yield s.msg(i ? 'Just tulips. ...Somewhere along the canal, a flower bed giggles.' : 'Petunias. A bee glares at you. It was here first.'); } })),
        // (the bed that giggles: now and then, a little ♪ over it)
        onEnter: function* (s) {
          if (!s.flag('kp_lq_pom_open') || s.flag('kp_lq_pom_c5')) return;
          s.parallel(function* (s2) { for (let i = 0; i < 120; i++) { yield 200; if (s2.actor('lq_pom_gardener')) s2.emote('lq_pom_gardener', '♪', 40); } });
        },
      });
    }
    const PURSER = pick('kp_costa', [[17, 12], [18, 12], [17, 11]], 'the Pursebearer'), DIG = pick('kp_costa', [[13, 13], [13, 12]], 'the buried purse');
    FF7.patchMap('kp_costa', {
      npcs: [{ id: 'lq_pom_purser', name: 'Pennypom', model: pm('kupokid_mog_merchant'), at: PURSER, dir: 'left', show: pomHunt(6), talk: purserTalk }],
      triggers: [{ at: [DIG[0], DIG[1]], on: 'talk', if: pomHunt(6), run: digSand }],
    });
  }

  // ---- the Pom Court (new map), inside the Great Hollow Tree
  const KING = Object.assign(W.legend('lq_mogglemog', 'mogglemog_good_king', { at: [10, 7], dir: 'down', scaled: true, lv: 50, abil: 0, bg: 'forest', scale: 1.3,
    show: s => s.flag('kp_lq_pom_king'), done: 'kp_lq_pom_done',
    intro: 'Mogglemog looks down from the mushroom throne and rings its little bell. Ting-a-ling.',
    opening: 'The Good King rings his bell. Seven poms raise seven tiny fists.\f"For the Court, kupo!"',
    after: 'The King vanishes in a puff of fluff. The court looks at you, then at each other.\f"Again tomorrow?"',
    then: kingThen }), { hover: 0.45 });
  function* kingThen(s) {
    yield s.say('Pomperly', 'Long live the King! Who now lives on your team. Long live your team!');
    yield* got(s, 'tuning_fork');
    yield* got(s, 'royal_nut', 3);
    yield* KP.giveLegendItem(s, 'mogglemog_good_king');   // (the first Court Lantern: js/kupomon/kp_legendbreed.js)
    yield s.say('Pomperly', "And you, Champion, are a Friend of the Court. Official! I'm writing it on the Roll right now.\fIt comes with no money and a lot of soup.");
  }
  // B. All rise (the first time the Court is entered: the whole court marches in)
  function* allRise(s) {
    if (s.flag('kp_lq_pom_rise') || !s.flag('kp_lq_pom_door')) return;
    s.music('waltz_chocobo');
    yield s.move('player', [[10, 13], [13, 13]]);
    yield s.face('player', 'left');
    yield s.say('Pomperly', 'The Court Roll! Answer when you hear your name, kupo!');
    for (const c of ROLL) {
      const id = cid(c);
      yield s.say('Pomperly', `${c.name}, the ${c.role}!`);
      s.spawn(id, pm(c.sp), 10, 15, 'up', { name: c.name, talk: function* (s2) { yield* courtChat(s2, c); } });
      s.sfx('hop');
      yield s.move(id, c.march, { run: true });
      s.hover(id, 0.2);
      yield s.face(id, 'down');
      yield s.say(c.name, c.present);
    }
    yield s.say('Pomperly', 'All rise for the Good King!');
    s.sfx('hop');
    const hops = COURT.map(c => { const a = s.actor(cid(c)); return a && a.tx != null ? s.jump(cid(c), a.tx, a.ty, 0.35, 16) : null; }).filter(Boolean);
    if (hops.length) yield hops;
    for (const c of COURT) yield* faceTile(s, cid(c), 10, 7);
    yield 40;
    s.emote(cid(COURT[1]), '...'); s.emote(cid(COURT[5]), '...');
    yield 50;
    COURT.forEach(c => s.face(cid(c), 'player'));
    yield 30;
    yield s.emote(cid(COURT[0]), '?');
    yield s.say('Pomperly', "...The King comes when the lanterns are lit. In the right order. Which is in the Court Song.\fWhich the Minstrel sang to you. Right? RIGHT?");
    yield s.say('Warblet', '♪ I can sing it again, kupo! Just ask! ♪');
    s.set('kp_lq_pom_rise');
    s.music('dream');
  }
  function* courtChat(s, c) {
    if (c.k === 'minstrel' && !s.flag('kp_lq_pom_king')) { yield s.say(c.name, 'Again? With pleasure!'); yield* courtSong(s, c.name); return; }
    const before = { herald: 'Light the lanterns in the order of the Court Song, Champion. No pressure. All the pressure.',
      knight: 'I stand guard! ...Sitting down. On a stump. Vigilantly.', cook: "When the King comes, there'll be soup. There's always soup.",
      jester: "Why did the moogle cross the court? To get to the other pom! ...I'll work on it.",
      gardener: "These roots are lovely. I talk to them. They don't talk back. Very polite.", purser: "The purse is safe. I'm sitting on it." };
    const after = { herald: "Friend of the Court! That's you now. It comes with no money and a lot of soup.",
      knight: "The King went with YOU. I'm not jealous. I'm a knight. Knights don't get jealous. Much.",
      minstrel: "♪ The champion came and the King said yes! ♪ I'm writing a new verse. It's mostly about me.",
      cook: "Soup's on! ...It's pom stew. It's always pom stew.", jester: 'What do you call a King in a backpack? Portable royalty! HA!',
      gardener: 'I planted a Kupo Nut by the throne. In a hundred years, a tree. In two hundred, a nicer throne.',
      purser: 'Eleven shells and a button. The royal treasury has never been healthier.' };
    if (s.flag('kp_lq_pom_done')) {
      yield s.say(c.name, after[c.k]);
      if (c.k !== 'herald') return;
      // (Pomperly, after: the court's lanterns, sold for the Kupo Ranch; js/kupomon/kp_legendbreed.js)
      yield s.say(c.name, 'The court lanterns burn and burn. Take one to the Kupo Ranch, if you want a King of your own. The Pursebearer insists on coins.');
      yield* KP.legendItemShop(s, 'mogglemog_good_king', { who: c.name, done: 'kp_lq_pom_done' });
      return;
    }
    if (s.flag('kp_lq_pom_king')) { yield s.say(c.name, 'The King is HERE! On the throne! Go on, then. Bow, or battle, or both!'); return; }
    yield s.say(c.name, before[c.k]);
  }
  // the lanterns: lit in the order of the song; a wrong one puts them all out
  function* lanternTalk(s, i) {
    const c = COURT[i], n = s.get('kp_lq_pom_lanterns');
    if (s.flag('kp_lq_pom_king') || n > i) { yield s.msg(`The ${c.colName} lantern glows warmly over the ${c.role}'s stump.`); return; }
    if (!s.flag('kp_lq_pom_rise')) { yield s.msg(`A ${c.colName} paper lantern hangs from a curling root. Its wick is waiting.`); return; }
    if (i !== n) {
      s.sfx('error');
      if (n > 0) { s.setVar('kp_lq_pom_lanterns', 0); yield s.msg(`The ${c.colName} lantern sputters... FWUMP. Every lantern in the court goes out at once.\fThe poms look at each other. Somebody coughs.`); }
      else yield s.msg(`The ${c.colName} lantern flickers and goes out again. Not that one, it seems.\fThe poms are humming a tune at you. Pointedly.`);
      return;
    }
    s.inc('kp_lq_pom_lanterns'); s.sfx('set');
    s.emote(cid(c), '♪');
    yield s.msg(`The ${c.colName} lantern glows into life. ${c.name} bounces on the ${c.role}'s stump.`);
    if (i === COURT.length - 1) yield* kingComes(s);
  }
  // C. The Good King (the seventh lantern)
  function* kingComes(s) {
    s.stopMusic(20);
    s.flash('#ffa0d0', 24); s.sfx('ching');
    yield s.msg('All seven lanterns blaze at once: a ring of colour under the roots.');
    for (const c of COURT) { s.emote(cid(c), '♪'); s.sfx('hop'); yield 14; }
    yield s.msg('"Ku-po! Ku-po! Ku-po!"');
    yield s.cam(10, 7, 50, { pitch: 26, dist: 7.5, height: 2.4 });
    s.spawn('lq_pom_glow', { prop: 'lq3_glowball' }, 10, 7, 'down', { hover: 3.6, solid: false });
    yield s.hover('lq_pom_glow', 0.7, 80);
    s.flash('#ffffff', 20); s.sfx('ching'); s.shake(2, 20);
    s.remove('lq_pom_glow');
    s.spawn(KING.id, KING.model, 10, 7, 'down', { name: 'Mogglemog', hover: 0.45, talk: KING.talk });
    yield 40;
    s.music('debut');
    yield s.camFollow(30);
    yield s.say('Mogglemog', 'Who summoned the King? ...Oh, everybody. Lovely. And who is THIS?');
    yield s.say('Pomperly', 'A Champion, Majesty.');
    yield s.say('Mogglemog', 'Splendid. A royal thrashing, then. Court! Positions!');
    s.set('kp_lq_pom_king');
    yield* KING.talk(s);
    s.music('dream');
  }
  const COURT_GRID = [
    "#####################",
    "####,,f,,,,,,,f,,####",
    "##,,,,,,,,,,,,,,,f,##",
    "#,f,,,,,,,,,,,,,,,,,#",
    "#,,,,,,,,,Y,,,,,,f,,#",
    "#,,,,,,Y,,,,,Y,,,,,,#",
    "#,,%,,,,,,,,,,,,,%,,#",
    "#,f,,,,,,,Q,,,,,,,,,#",
    "#,,,,,Y,,,:,,,Y,,,,f#",
    "#,,f,,,,,,:,,,,,,,,,#",
    "#,,,,,,,Y,:,Y,,,,,,,#",
    "#f,,,,,,,,:,,,,,,,,,#",
    "#,,,,,,,,,:,,,,,,,f,#",
    "##,,f,,,,,:,,,,,f,,##",
    "####,,,,,,:,,,,,,####",
    "##########+##########",
  ];
  const root = (a, b, h, h2, r = 0.07) => ({ at: a, to: b, h, h2, sag: 0.25, r, count: 1, col: '#4e3a24' });
  FF7.defineMap('kp_lq_pom_court', {
    name: 'The Pom Court', area: 'Whisperwood', theme: 'forest', music: 'dream', kpBg: 'forest',
    look: { wall: '#4a3826', wallTop: '#2a2016', wallH: 3.0, wallTex: 'rock', grass: ['#4e7e36', '#487630'], floor2: ['#6a5434', '#62502e'],
      ambient: [0.44, 0.46, 0.42], fog: { color: [0.06, 0.08, 0.05], near: 9, far: 24 } },
    grid: COURT_GRID,
    legend: { Q: 'block' },
    props: [
      { at: [10, 7], prop: 'lq3_mushthrone' },
      // great roots coming down the walls into the moss, and the leafy bunting strung along the back
      root([0.6, 2], [2.2, 3.4], 3.0, 0.02, 0.1), root([0.6, 9], [2, 10.2], 3.0, 0.02, 0.09), root([19.4, 3], [17.8, 4.2], 3.0, 0.02, 0.1), root([19.4, 10], [18, 11.4], 3.0, 0.02, 0.09),
      root([4, 0.6], [5, 2], 3.0, 0.02, 0.11), root([15, 0.6], [14.2, 2], 3.0, 0.02, 0.1), root([9, 0.6], [8.4, 1.6], 3.0, 0.02, 0.08), root([12, 0.6], [12.8, 1.4], 3.0, 0.02, 0.08),
      { at: [2, 1.4], to: [18, 1.4], h: 2.7, h2: 2.7, sag: 0.4, bulbs: ['#5a9a3a', '#8ac050', '#4a8a2e', '#a0d060'] },
      // mushrooms round the edge of the clearing, glowing ones by the walls
      ...[[2, 3, '#d8344a', 1.3], [3, 11, '#e8a030', 1.1], [17, 11, '#9a5ad0', 1.2], [18, 4, '#d8344a', 1.0], [5, 13, '#e8e0f0', 0.9], [15, 13, '#d8344a', 1.1],
        [12.4, 2.6, '#80d8ff', 0.8], [7.6, 2.4, '#80d8ff', 0.8], [1.6, 7.4, '#e8a030', 1.2], [18.4, 7.6, '#9a5ad0', 1.0]].map(([x, y, col, k]) => ({ at: [x + 0.01, y + 0.01], prop: 'lq3_shroom', col, size: k })),
      { at: [10, 15], prop: 'lq3_rounddoor', rot: 180, open: true },
    ],
    lights: [[10, 7, '#ffd0f0', 4.5], [3, 3, '#a0ffb0', 2.5], [17, 3, '#a0ffb0', 2.5], [10, 12, '#fff0c0', 3.5], [4, 10, '#ffd890', 2], [16, 10, '#ffd890', 2]],
    entries: { from_deep: [10, 14, 'up'] },
    exits: [{ at: [10, 15, 1, 1], to: 'kp_whisperwood_deep', entry: 'from_court', sfx: 'door' }],
    npcs: COURT.map(c => ({ id: cid(c), name: c.name, model: pm(c.sp), at: c.stump, dir: 'down', hover: 0.2,
      show: s => c.k === 'herald' ? s.flag('kp_lq_pom_door') : s.flag('kp_lq_pom_rise'), talk: function* (s) { yield* courtChat(s, c); } })).concat([KING]),
    objects: COURT.map((c, i) => ({ id: 'lq_lamp_' + c.k, at: c.lamp, prop: 'lq3_pomlantern', col: c.col, solid: true, lit: false, stateKey: 'off',
      tick(o) { const lit = vget('kp_lq_pom_lanterns') > i || flag('kp_lq_pom_king'); if (o.lit !== lit) { o.lit = lit; o.stateKey = lit ? 'on' : 'off'; } },
      talk: function* (s) { yield* lanternTalk(s, i); } })),
    triggers: [{ at: [10, 7], on: 'talk', if: s => !s.flag('kp_lq_pom_king') || s.flag('kp_legend_lq_mogglemog'),
      run: function* (s) { yield s.msg(s.flag('kp_lq_pom_done') ? 'The mushroom throne. Someone has left a crown-shaped dent in the cushion.' : 'The mushroom throne. It is very red, very soft, and very empty.'); } }],
    onEnter: function* (s) { yield* allRise(s); },
  });
  KP.legendSeller('mogglemog_good_king', 'kp_lq_pom_court', cid(COURT[0]));   // (Pomperly, on the Herald's stump)

  // ================================================================== 7. TEMPOMOG: MIDNIGHT, EIGHTY YEARS
  // ---- Ravenmoor's clock tower: the Clockmaker (A. Snoring), and the ladder up to the Belfry
  function* snoring(s) {
    yield s.face('rvt_clockmaker', 'up');
    yield s.emote('rvt_clockmaker', '...');
    yield s.say('Clockmaker', 'Shh! Come here, quick. Put your ear to the wall.');
    s.anim('rvt_clockmaker', 'wave'); yield 30; s.stopAnim('rvt_clockmaker');
    yield s.move('player', [[4, 3], [4, 1]]);
    yield s.face('player', 'up');
    yield 40;
    yield s.msg('...zzz... kupo... five more minutes... zzz...');
    yield s.move('player', 4, 2);
    yield s.face('player', 'rvt_clockmaker'); yield s.face('rvt_clockmaker', 'player');
    yield s.say('Clockmaker', 'Five more minutes. For eighty years. I admire the commitment.');
    yield s.say('Clockmaker', "Something's asleep in my clock, and the clock's asleep with it. The night it stopped, three gears fell out.\fOne into the past, one into now, and one into tomorrow. Don't ask me how. Clocks are complicated.");
    s.set('kp_lq_tempo_open');
    yield* got(s, 'lq_backward_watch');
    yield s.say('Clockmaker', "A Backward Watch. It spins when a lost moment is near. Find my gears, take them up the ladder, and let's wake the old girl up.");
    if (!s.flag('kp_rv_clock')) { s.set('kp_rv_clock'); yield* got(s, 'roast_nut', 3); yield s.say('Clockmaker', 'And some Slow-Roast Nuts for the road. Every good thing takes time.'); }
  }
  const TEMPO_HINTS = [['kp_lq_tempo_past', "The past: nothing's older than the Sunken Ruins. I'd try the tomb, if I liked tombs."],
    ['kp_lq_tempo_now', "Now: somewhere a clock is wrong right now. Mogridge's market clock has run slow since I was a boy."],
    ['kp_lq_tempo_next', 'Tomorrow: what counts down to tomorrow? A rocket does. Try Skyport.']];
  // (the Clockmaker's own talk, and the other quests' errands with him, still run: the scene first, then a line after)
  wrapTalk('kp_ravenmoor_clock', 'rvt_clockmaker', function* (s, t0) {
    if (s.flag('kp_champion') && !s.flag('kp_lq_tempo_open')) { yield* snoring(s); return true; }
    if (!s.flag('kp_lq_tempo_open')) return false;
    const letter = s.flag('kp_lq_baha_l4');
    if (t0) yield* t0(s);
    if (s.flag('kp_lq_tempo_done')) {
      yield s.say('Clockmaker', "And it chimes now! Every hour, on the hour. I've had to buy earplugs. Best money I ever spent.");
      // (then the old springs out of the clock, for the Kupo Ranch: js/kupomon/kp_legendbreed.js. Not in the talk that
      // handed him Bahamog's letter: that errand is the talk, and the Demo has no answer queued for a shop then)
      if (s.flag('kp_lq_baha_l4') !== letter) return true;
      yield s.say('Clockmaker', "The old springs I took out of her? Wound to midnight, eighty years tight. The Kupo Ranch wants them for something. I don't ask. I charge.");
      yield* KP.legendItemShop(s, 'tempomog_time_hopper', { who: 'Clockmaker', done: 'kp_lq_tempo_done' });
      return true;
    }
    const left = TEMPO_HINTS.filter(([f]) => !s.flag(f));
    yield s.say('Clockmaker', left.length ? `My gears: ${3 - left.length} of 3. ${left[0][1]}` : 'All three gears! Up the ladder with you. First to last, left to right, like reading a clock.');
    return true;
  });
  KP.legendSeller('tempomog_time_hopper', 'kp_ravenmoor_clock', 'rvt_clockmaker');
  {
    const CT = 'kp_ravenmoor_clock', m = M(CT);
    const LAD = pick(CT, [[7, 1], [4, 1]], 'the belfry ladder');
    if (m) m.entries.from_belfry = [LAD[0], LAD[1] + 1, 'down'];
    add(CT, 'props', [{ at: [LAD[0], 0.55], prop: 'ladder', face: 's', h: 3.0 }]);
    FF7.patchMap(CT, { exits: [{ at: [LAD[0], LAD[1], 1, 1], to: 'kp_lq_tempo_belfry', entry: 'from_tower', sfx: 'door', if: s => s.flag('kp_lq_tempo_open'),
      blocked: function* (s) { yield s.msg('A ladder up into the belfry. The hatch at the top is bolted shut.'); } }] });
  }
  // the epilogue: Ravenmoor's clock chimes the hours
  wrapTalk('kp_ravenmoor', 'rv_watch', function* (s) {
    if (!s.flag('kp_lq_tempo_done')) return false;
    yield s.say('Night Watchman', "One o'clock! Then two! Then THREE! I don't know what to do with myself.");
    return true;
  });
  wrapTalk('kp_ravenmoor', 'rv_kid', function* (s) {
    if (!s.flag('kp_lq_tempo_done')) return false;
    yield s.say('Kid', "It's NOT always midnight! I'm confused in a whole new way.");
    return true;
  });
  FF7.patchMap('kp_ravenmoor', { onEnter: function* (s) { if (s.flag('kp_lq_tempo_done')) s.sfx('ching'); } });

  // ---- the past: the gear under the Wrapmog's sarcophagus (its guard wakes: a wild Wrapmog, Lv 48)
  function* tombGear(s) {
    yield s.msg('The Backward Watch spins so fast it hums. Wedged under the lid of the sarcophagus: a small brass gear, furred with dust.');
    const c = yield s.ask(null, 'Take the gear?', ['Take it', 'Leave it']);
    if (c !== 0) return;
    yield s.msg('You ease the gear free...');
    s.shake(2, 30); s.sfx('gate');
    yield s.msg('...and the lid slides. Bandaged paws grip the edge. Something does NOT want its gear borrowed!');
    const r = yield* KP.fight(s, { kind: 'wild', foes: [KP.make('wrapmog_tomb_guard', 48)], bg: 'ruins' });
    if (r === 'lose') return;   // (blacked out: the guard keeps its gear)
    s.set('kp_lq_tempo_past');
    yield* got(s, 'lq_time_gears');
    yield s.msg((r === 'run' ? 'You ran for it, gear in hand! ' : '') + 'The Backward Watch ticks once, contented. One gear from the past.');
  }
  {
    const m = M('kp_ruins_2');
    if (m) {
      // (in front of the tomb's own look at the sarcophagus, while the gear is there to take)
      m.triggers = [{ id: 'lq_tempo_tomb', at: [13, 3, 4, 1], on: 'talk', if: s => s.flag('kp_lq_tempo_open') && !s.flag('kp_lq_tempo_past'), run: tombGear }].concat(m.triggers || []);
      add('kp_ruins_2', 'triggers', [{ id: 'lq_tempo_spin', at: [10, 5, 10, 1], once: false, if: s => s.flag('kp_lq_tempo_open') && !s.flag('kp_lq_tempo_past') && !s.flag('kp_lq_tempo_spin'),
        run: function* (s) { s.set('kp_lq_tempo_spin'); s.sfx('beep'); yield s.msg('The Backward Watch twitches in your pocket... then spins, faster and faster, toward the great sarcophagus.'); } }]);
    }
  }

  // ---- now: Mogridge's market clock, five minutes slow, and the kid with the shiny gear
  function* marketClock(s) {
    if (s.flag('kp_lq_tempo_now')) { yield s.msg('The market clock. Right on time, to the second.'); return; }
    if (!s.flag('kp_lq_tempo_open')) { yield s.msg("The market clock says five to twelve. The bakery's clock says noon.\fOne of them is wrong. The bakery says it isn't them."); return; }
    s.sfx('beep');
    yield s.msg('The Backward Watch is spinning! The market clock says five to twelve... but the bakery is already ringing its noon bell.');
    const c = yield s.ask(null, 'Set the market clock?', ['Five minutes forward', 'Five minutes back', 'Leave it']);
    if (c === 2) return;
    if (c === 1) { s.sfx('error'); yield s.msg("Click, click... Now it's ten minutes slow. Somewhere, a baker starts to cry.\f...You quietly put it back."); return; }
    s.sfx('set'); yield 10; s.sfx('ching');
    yield s.msg('Click, click, click, click, click. The minute hand jumps five minutes, and the market clock chimes noon, right on time.');
    if (s.actor('lq_tempo_kid')) { yield s.emote('lq_tempo_kid', '!!'); yield s.face('lq_tempo_kid', 'player'); }
    yield s.say('Kid', "You fixed it! Nobody's late anymore! ...Now I'm early. That's worse.\fA deal's a deal, though. Here!");
    s.set('kp_lq_tempo_now');
    yield* got(s, 'lq_time_gears');
    yield s.msg('A shiny gear, still wet from the fountain. One gear from now.');
  }
  {
    const KID = pick('kp_mogridge', [[32, 6], [33, 6], [32, 7]], 'the kid with the gear');
    FF7.patchMap('kp_mogridge', {
      npcs: [{ id: 'lq_tempo_kid', name: 'Kid', model: 'kid2', at: KID, dir: 'up', show: s => s.flag('kp_lq_tempo_open') && !s.flag('kp_lq_tempo_now'),
        talk: function* (s) { yield s.say('Kid', "Look! A shiny gear! I found it in the fountain. It was TICKING.\fThe market clock's five minutes slow, and everybody's late for everything. Fix it, and the gear's yours!"); } }],
      triggers: [{ at: [30, 5, 2, 1], on: 'talk', run: marketClock }],
    });
  }

  // ---- tomorrow: Skyport's rocket countdown, and the Countdown Crew (Tick, then Tock)
  const CREW = (col) => ({ base: 'man', top: col, bottom: '#3a3a44', hairStyle: 'cap', extras: ['goggles', 'mustache'] });
  const crewShow = s => s.flag('kp_lq_tempo_open');
  const TICK = W.trainer({ id: 'lq_tempo_tick', cls: 'Countdown Crew', name: 'Tick', model: CREW('#d8a030'), at: [4, 14], dir: 'right', bg: 'sky', music: 'countdown', ai: 'smart', noBag: true, money: 2400,
    team: held([['clockmog_chrono', L(48)], ['astropom_lunarian', L(48)], ['gizmog_gadgeteer', L(48)]]),
    line: 'Three! ...Still three. While we wait, how about a battle?', lose: "Out of time! Tock, you're up!", after: 'Two! It says TWO!', show: crewShow });
  const TOCK = W.trainer({ id: 'lq_tempo_tock', cls: 'Countdown Crew', name: 'Tock', model: CREW('#3a8ad0'), at: [8, 14], dir: 'left', bg: 'sky', music: 'countdown', ai: 'smart', noBag: true, money: 2600,
    team: held([['mathmog_arithmetician', L(48)], ['nimbopom_meteorologist', L(48)], ['gearmog_artificer', L(49)]]),
    line: 'Tock always follows Tick. It says so in our names!', lose: 'Ticked off AND tocked off.', after: 'Another eighty years and we have liftoff.', show: crewShow });
  function* crew(s) {
    if (s.flag('kp_lq_tempo_next')) { yield s.say('Tick', 'Two! It says TWO!'); yield s.say('Tock', 'Another eighty years and we have liftoff.'); return; }
    if (!W.beaten('lq_tempo_tick')) {
      yield s.say('Tick', 'Three!'); yield s.say('Tock', 'Three!');
      yield s.say('Tick', "We're the Countdown Crew. That board has said three for eighty years.\fWe're very patient. And very bored.");
      yield* TICK.npc.talk(s);
      if (!W.beaten('lq_tempo_tick')) return;
    }
    yield* TOCK.npc.talk(s);
    if (!W.beaten('lq_tempo_tock')) return;
    yield s.say('Tick', 'Three...'); yield s.say('Tock', '...two...');
    s.shake(3, 40); s.sfx('gate');
    yield s.say('Tick', '...ONE!');
    yield 30;
    s.sfx('set');
    yield s.msg('Something pops out of the countdown board and bounces at your feet. Tink, tink, tink.');
    yield s.say('Tock', '...Oh. That was just the gear.');
    yield s.say('Tick', "Keep it, champ. Look, the board says two now! That's progress!");
    s.set('kp_lq_tempo_next');
    yield* got(s, 'lq_time_gears');
    yield s.msg('A bright new gear, not a scratch on it. One gear from tomorrow.');
  }
  FF7.patchMap('kp_skyport', {
    npcs: [Object.assign({}, TICK.npc, { talk: crew }), Object.assign({}, TOCK.npc, { talk: crew })],
    triggers: [{ at: [6, 13], on: 'talk', run: function* (s) { yield s.msg(s.flag('kp_lq_tempo_next') ? 'The countdown board says 2. Progress!' : "The Kupo-1's countdown board. It says 3.\fIt has said 3 since before anybody can remember."); } }],
  });

  // ---- the Belfry (new map): the spindles, B. Tick, C. Wakey wakey
  const GEARS = [{ f: 'kp_lq_tempo_past', name: 'The dusty gear', col: '#8a7a5a' }, { f: 'kp_lq_tempo_now', name: 'The shiny gear', col: '#e0b848' }, { f: 'kp_lq_tempo_next', name: 'The bright new gear', col: '#ece4cc' }];
  const SIDES = ['left', 'middle', 'right'];
  const HANDS = { min: 0 };   // (the minute hand during scene B)
  const TEMPO = W.legend('lq_tempomog', 'tempomog_time_hopper', { at: [10, 3], dir: 'down', scaled: true, lv: 50, abil: 0, bg: 'night', scale: 1.2,
    show: s => s.flag('kp_lq_tempo_awake'), done: 'kp_lq_tempo_done',
    intro: 'Tempomog is pacing between the gears, checking its pendant every three seconds.',
    opening: 'Tempomog flips its pendant open, and the second hand freezes.\f"Let\'s see how you do when the clock stops, kupo!"',
    after: 'Tempomog hops back five minutes and is gone.\fCome back in five minutes. Or any time, really.',
    then: tempoThen });
  function* tempoThen(s) {
    yield s.msg("Tempomog curls up on your team like it owns the place. It's asleep before you can blink.");
    yield* got(s, 'chrono_gear');
    yield* KP.giveLegendItem(s, 'tempomog_time_hopper');   // (the first Midnight Spring: js/kupomon/kp_legendbreed.js)
    s.sfx('set');
    yield s.msg('The Backward Watch shivers... and starts ticking forwards. Mostly.');
    s.sfx('ching');
    yield s.msg("Far below, Ravenmoor's clock chimes the hour. One, it says. Then it starts thinking about two.");
  }
  function* spindle(s, i) {
    if (s.flag('kp_lq_tempo_set')) { yield s.msg('Three gears turn on three spindles. Tick. Tick. Tick.'); return; }
    const fit = s.get('kp_lq_tempo_fit');
    if (i < fit) { yield s.msg(`${GEARS[i].name} sits snug on the ${SIDES[i]} spindle.`); return; }
    const have = GEARS.filter((g, k) => k >= fit && s.flag(g.f));
    if (!have.length) { yield s.msg(`An empty spindle on the workbench, the ${SIDES[i]} one of three. Something should go here.`); return; }
    const c = yield s.ask(null, `Fit a gear on the ${SIDES[i]} spindle?`, have.map(g => g.name).concat(['Leave it']));
    if (c == null || c >= have.length) return;
    const k = GEARS.indexOf(have[c]);
    if (k !== i || i !== fit) {
      s.sfx('error'); s.shake(1, 16);
      if (fit > 0) KP.give('lq_time_gears', fit);
      s.setVar('kp_lq_tempo_fit', 0);
      yield s.msg('Clunk! The gears grind, spin backwards, and clatter back onto the bench.\fFirst to last, the Clockmaker said.');
      return;
    }
    KP.take('lq_time_gears', 1); s.inc('kp_lq_tempo_fit'); s.sfx('set');
    yield s.msg(`${GEARS[i].name} clicks onto the ${SIDES[i]} spindle.`);
    if (i === 2) yield* belfryTick(s);
  }
  function* belfryTick(s) {
    // B. Tick
    s.sfx('set'); yield 14; s.sfx('set'); yield 14; s.sfx('set'); yield 24;
    s.shake(1, 50);
    yield s.msg('The three gears bite. Deep in the walls, the great wheel creaks... and turns.');
    yield s.cam(7, 1, 60, { pitch: 14, dist: 4.5, height: 1.9 });
    for (let m = 1; m <= 6; m++) { HANDS.min = m / 6; s.sfx('set'); yield 16; }
    yield 30;
    s.flash('#ffffff', 18); s.shake(3, 50); s.sfx('gate');
    yield s.msg('BONNNG.');
    yield s.msg('Somewhere below, a Batmog shrieks. It is one minute past midnight in Ravenmoor, for the first time in eighty years.');
    s.set('kp_lq_tempo_set');
    yield s.camFollow(30);
    // C. Wakey wakey
    s.flash('#c8f0ff', 14, 0.6); s.sfx('magic');
    s.spawn(TEMPO.id, TEMPO.model, 12, 1, 'down', { name: 'Tempomog', hover: 1.7, talk: TEMPO.talk });
    yield 20;
    yield s.hover(TEMPO.id, 0, 18);
    yield s.jump(TEMPO.id, 10, 3, 0.6, 26);
    s.anim(TEMPO.id, 'lie'); yield 40; s.stopAnim(TEMPO.id);
    yield s.emote(TEMPO.id, '?');
    yield s.say('Tempomog', 'Kupo?! What year is it? ...EIGHTY years?! I only meant to nap till lunch!');
    yield s.face(TEMPO.id, 'player');
    yield s.emote(TEMPO.id, '!');
    yield s.say('Tempomog', "Did YOU fix it? Nobody touches my clock without a fight, kupo!\f...It isn't my clock. But still!");
    s.set('kp_lq_tempo_awake');
    yield* TEMPO.talk(s);
  }
  const BELFRY = [
    "###############",
    "#.............#",
    "#.............#",
    "#.............#",
    "#.....QQQ.....#",
    "#..|..QQQ..|..#",
    "#.....QQQ.....#",
    "#.............#",
    "#.............#",
    "#.............#",
    "#.:..DDDDD....#",
    "###############",
  ];
  FF7.defineMap('kp_lq_tempo_belfry', {
    name: 'The Belfry', area: 'Ravenmoor', theme: 'mansion', music: 'none', kpBg: 'night',
    look: { wallH: 3.4, wall: '#4e4640', wallTop: '#2e2824', floor: ['#5a4a3c', '#544436'], floor2: ['#4a3c30', '#44372c'], floorTex: { floor: 'planks', floor2: 'planks' }, wallTex: 'stoneblock',
      pillar: '#5a4430', ambient: [0.3, 0.3, 0.42], light: [0.55, 0.6, 0.8], fog: { color: [0.05, 0.05, 0.1], near: 8, far: 22 } },
    grid: BELFRY,
    legend: { Q: 'block' },
    props: [
      { at: [7, 0], prop: 'porthole', rot: 0, r: 1.3, y: 1.9, col: '#cfdcff', col2: '#5a4630', stars: false },
      { at: [2, 0], prop: 'lq3_gear', rot: 0, r: 0.62, y: 1.55, col: '#a8823a' },
      { at: [11, 0], prop: 'lq3_gear', rot: 0, r: 0.34, y: 1.2, col: '#8a6a2a', turn: 0.2 },
      { at: [12, 0], prop: 'lq3_gear', rot: 0, r: 0.5, y: 2.05, col: '#b89040', turn: 0.1 },
      { at: [0, 4], prop: 'lq3_gear', rot: 90, r: 0.7, y: 1.7, col: '#9a7632' },
      { at: [14, 7], prop: 'lq3_gear', rot: -90, r: 0.55, y: 1.6, col: '#a8823a', turn: 0.3 },
      { at: [7, 5], prop: 'lq3_bell', top: 2.85 },
      { at: [3, 5], to: [11, 5], h: 3.12, h2: 3.12, sag: 0, r: 0.07, count: 1, col: '#4a3624' },
      { at: [2, 10], prop: 'disc', r: 0.42, h: 0.01, sides: 8, col: '#3a2a1a', top: '#120c08', rim: '#6a4a2a' },
    ],
    labels: [
      { at: [7, 0], face: 's', text: 'IIX', size: 0.13, col: '#e8e0c8', y: 2.66 },
      { at: [6, 0], face: 's', text: 'III', size: 0.13, col: '#e8e0c8', y: 1.85 },
      { at: [8, 0], face: 's', text: 'XI', size: 0.13, col: '#e8e0c8', y: 1.85 },
      { at: [7, 0], face: 's', text: 'IV', size: 0.13, col: '#e8e0c8', y: 1.06 },
    ],
    lights: [[7, 1, '#a8c0ff', 5], [2, 9, '#ffb060', 2.2], [11, 9, '#ffb060', 1.8]],
    entries: { from_tower: [2, 9, 'up'] },
    exits: [{ at: [2, 10, 1, 1], to: 'kp_ravenmoor_clock', entry: 'from_belfry', sfx: 'door' }],
    npcs: [TEMPO],
    objects: [
      { id: 'lq_tempo_hands', at: [7, 1], prop: 'lq3_hands', y: 1.9, dz: -0.24, y0: 0, solid: false, min: 0, stateKey: 'm0',
        tick(o) { const m = flag('kp_lq_tempo_set') ? 1 : HANDS.min; if (o.min !== m) { o.min = m; o.stateKey = 'm' + m; } } },
      ...[0, 1, 2].map(i => ({ id: 'lq_spindle' + i, at: [5 + 2 * i, 10], prop: 'lq3_spindle', base: 0.45, solid: true, gear: null, stateKey: 'e',
        tick(o) { const g = flag('kp_lq_tempo_set') || vget('kp_lq_tempo_fit') > i; if (!!o.gear !== g) { o.gear = g ? GEARS[i].col : null; o.stateKey = g ? 'g' : 'e'; } },
        talk: function* (s) { yield* spindle(s, i); } })),
    ],
    triggers: [
      { at: [6, 4, 3, 3], on: 'talk', run: function* (s) { yield s.msg(s.flag('kp_lq_tempo_set') ? 'The great bell. Your ears are still ringing.' : "The great bell. It hasn't rung in eighty years. It's probably fine."); } },
      { at: [7, 0], on: 'talk', run: function* (s) { yield s.msg('The back of the clock face. The numbers are all the wrong way round, and the moon shines through them.'); } },
    ],
    onLoad: function () { HANDS.min = 0; },
    onEnter: function* (s) {
      s.parallel(function* (s2) { for (let i = 0; i < 900; i++) { yield 60; s2.sfx('set', 0.25); } });   // (no music: only the slow tick)
      if (!s.flag('kp_lq_tempo_climb')) {
        s.set('kp_lq_tempo_climb');
        yield s.msg('The belfry. Gears as big as cartwheels, frozen in the walls. The great bell, silent.\fAnd through the back of the clock face, backwards numbers and the moon.');
      }
    },
  });

  // ================================================================== 8. LUXMOG: THE FOUR LIGHTS
  function* litNote(s) {
    const n = LUX_LIT();
    yield s.msg(n >= 4 ? "All four Crystals of Light are burning! The Pilgrim on the Champion's Bridge will want to see this." : `Crystals of Light: ${n} of 4 lit.`);
  }
  const LUX_HINTS = [['earth', 'Earth sleeps under Mt. Kupo, in the chamber that glows.'], ['fire', 'Fire went cold in the temple at Nibel Peaks.'],
    ['water', 'Water waits by the lighthouse on Route 4.'], ['wind', 'And wind got stuck somewhere in Skyport. Wind does that.']];
  // ---- Route 14: the Pilgrim (A. The old words), and the bridge of light (B)
  function* oldWords(s) {
    yield s.say('Pilgrim', 'You look like somebody who wins things.');
    yield s.cam(4, 15, 70, { dist: 15, pitch: 32, height: 1.2 });
    s.spawn('lq_lux_ghost', { prop: 'lq3_shrineghost' }, 2, 15, 'down', { hover: 0.4, solid: false });
    s.flash('#ffffff', 30, 0.35);
    yield 70;
    s.remove('lq_lux_ghost');
    yield 30;
    yield s.camFollow(50);
    yield s.say('Pilgrim', 'Did you see it? A shrine out there that nobody has set foot in for a hundred years. Four lights went out. Four lights would bring it back.');
    yield s.say('Pilgrim', "When the four lights that went out are burning again, the Warrior of the first dawn comes home. Earth, then fire, then water, then wind. That's the old order.\fI'm too old to carry them. You aren't.");
    s.set('kp_lq_lux_open');
    yield* got(s, 'lq_crystals', 4);
    yield s.msg('Four crystals, dim and grey as slate.');
    yield s.say('Pilgrim', LUX_HINTS.map(h => h[1]).join(' '));
  }
  // (the corners of the bridge's middle landing: the Pilgrim in the north-west one, clear of the banners, and the bridge
  // of light out of the south-west one)
  const R14_EDGE = pick('kp_route14', [[11, 16], [11, 14]], 'the bridge of light');
  const R14_PIL = pick('kp_route14', [[11, 14], [18, 14], [18, 16]].filter(([x, y]) => x !== R14_EDGE[0] || y !== R14_EDGE[1]), 'the Pilgrim');
  function* lightBridge(s) {
    if (s.flag('kp_lq_lux_bridge')) return;
    const [ex, ey] = R14_EDGE, px = ex + 1;
    yield s.msg('The four crystals tug at your pack... and float up into the air!');
    yield s.move('player', [[px + 1, 15], [px, ey]]);
    yield s.face('player', 'left');
    const C4 = [['lq_lux_c1', px - 1, ey - 1, '#c8a050'], ['lq_lux_c2', px + 1, ey - 1, '#ff6a40'], ['lq_lux_c3', px - 1, ey + 1, '#5a9aff'], ['lq_lux_c4', px + 1, ey + 1, '#5ad08a']];
    C4.forEach(([id, x, y, col]) => s.spawn(id, { prop: 'crystal', col, scale: 0.8 }, x, y, 'down', { hover: 0.3, solid: false }));
    s.sfx('magic');
    yield C4.map(([id]) => s.hover(id, 1.5, 50));
    yield s.cam(ex - 3, ey, 40, { height: 1.6 });
    s.flash('#ffffff', 24); s.sfx('ching');
    s.set('kp_lq_lux_bridge');
    yield s.msg('The crystals blaze and beam out over the clouds. The clouds part, and a bridge of light rolls out from the edge.');
    C4.forEach(([id]) => s.remove(id));
    yield s.camFollow(30);
    yield s.say('Pilgrim', "Go on. I'll wait. I've waited this long.");
  }
  function* pilgrimTalk(s) {
    if (s.flag('kp_lq_lux_done')) {
      s.anim('lq_lux_pilgrim', 'sit'); yield s.say('Pilgrim', "I knew it. I KNEW it. ...I'm going to need to sit down.");
      // (then the wicks that caught the four lights, for the Kupo Ranch: js/kupomon/kp_legendbreed.js)
      yield s.say('Pilgrim', "I kept the wicks that caught the four lights. They glow all by themselves. An old pilgrim has to eat, mind.");
      yield* KP.legendItemShop(s, 'luxmog_light_warrior', { who: 'Pilgrim', done: 'kp_lq_lux_done' });
      return;
    }
    if (s.flag('kp_lq_lux_bridge')) { yield s.say('Pilgrim', "Go on. I'll wait. I've waited this long."); return; }
    if (!s.flag('kp_lq_lux_open')) { yield* oldWords(s); return; }
    if (LUX_LIT() >= 4) { yield* lightBridge(s); return; }
    const h = LUX_HINTS.find(([e]) => !s.flag('kp_lq_lux_' + e)) || LUX_HINTS[0];
    yield s.say('Pilgrim', `Earth, then fire, then water, then wind. ${h[1]}`);
  }
  {
    const R14 = 'kp_route14', m = M(R14), EDGE = R14_EDGE, PIL = R14_PIL;
    if (m) m.entries.from_shrine = [EDGE[0] + 1, EDGE[1], 'right'];
    FF7.patchMap(R14, {
      npcs: [{ id: 'lq_lux_pilgrim', name: 'Pilgrim', model: { base: 'oldman', top: '#b8a888', jacket: '#8a7a5a', bottom: '#6a5a44', extras: ['robe', 'beard'] }, at: PIL, dir: 'left',
        faceOnTalk: false, show: s => s.flag('kp_league_2'), talk: pilgrimTalk }],
      exits: [{ at: [EDGE[0], EDGE[1], 1, 1], to: 'kp_lq_lux_shrine', entry: 'from_route14', if: s => s.flag('kp_lq_lux_bridge'),
        blocked: function* (s) { yield s.msg("Clouds, as far as you can see. It's a long, long way down."); } }],
      triggers: [{ id: 'lq_lux_bridge', at: [12, 14, 6, 3], once: false, if: s => LUX_LIT() >= 4 && !s.flag('kp_lq_lux_bridge'), run: lightBridge }],
      objects: [{ id: 'lq_lux_lightbridge', at: [EDGE[0] - 1, EDGE[1]], prop: 'lq3_lightbridge', len: 8, solid: false, hidden: true,
        tick(o) { o.hidden = !flag('kp_lq_lux_bridge'); } }],
    });
    KP.legendSeller('luxmog_light_warrior', R14, 'lq_lux_pilgrim');
  }

  // ---- earth: Mt. Kupo's glowing chamber. Push the boulders off the old rail spur, then the ore cart onto the plate.
  // (a boulder moves one tile, away from you; the cart rolls along its rail till it hits something. A push that
  // can't go offers to roll everything back, and the chamber resets whenever the map loads, till it's solved)
  const MK0 = { b1: [6, 6], b2: [8, 6], cart: [3, 6] }, MK_SOLVED = { b1: [5, 5], b2: [7, 7], cart: [9, 6] };
  const MK = {}, MK_ROCKS = [[6, 5], [8, 7]], MK_RAIL = [3, 9];
  const mkReset = () => { const src = flag('kp_lq_lux_earth') ? MK_SOLVED : MK0; for (const k in src) MK[k] = src[k].slice(); };
  mkReset();
  const mkActive = () => flag('kp_lq_lux_open') || flag('kp_lq_lux_earth');
  function* mkStuck(s) {
    const c = yield s.ask(null, 'Kick the old pit-prop, and let everything roll back to where it started?', ['Keep at it', 'Roll it all back']);
    if (c !== 1) return;
    mkReset(); s.shake(2, 20); s.sfx('gate');
    yield s.msg('Rumble, rumble... The boulders and the cart grind back to where they started.');
  }
  function* mkSolved(s) {
    s.sfx('gate'); s.shake(3, 40);
    yield s.msg('CLUNK! The ore cart settles onto the old iron plate...');
    s.flash('#e0b860', 24); s.sfx('ching');
    s.set('kp_lq_lux_earth');
    yield s.msg('...and with a crack, the crystal wall splits along an old seam. Behind it, a vein of ore glows gold-brown.\fOne of your dim crystals drinks in the glow. The earth crystal is lit!');
    yield* litNote(s);
  }
  function* mkPush(s, k) {
    if (s.flag('kp_lq_lux_earth')) { yield s.msg(k === 'cart' ? 'The ore cart sits on the old plate, right where it belongs.' : 'A boulder. It has done its bit.'); return; }
    const f = FF7.fieldScene, p = s.actor('player');
    if (!f || !f.P || !p || p.tx == null) return;
    const at = MK[k], dx = at[0] - p.tx, dy = at[1] - p.ty;
    if (Math.abs(dx) + Math.abs(dy) !== 1) { yield s.msg(k === 'cart' ? 'Push the cart from one end of its rail.' : "You'll need to get right behind it to push."); return; }
    const busy = (x, y) => ['b1', 'b2', 'cart'].some(q => MK[q][0] === x && MK[q][1] === y) || MK_ROCKS.some(r => r[0] === x && r[1] === y);
    const floor = (x, y) => x >= 1 && x <= 9 && y >= 4 && y <= 8 && f.P.walkable(x, y) && !busy(x, y);
    if (k === 'cart') {
      if (dy !== 0) { yield s.msg('The ore cart only rolls along its rail. Push it from one end.'); return; }
      let x = at[0], n = 0;
      while (n < 8 && x + dx >= MK_RAIL[0] && x + dx <= MK_RAIL[1] && floor(x + dx, at[1])) { x += dx; n++; }
      if (!n) { s.sfx('error'); yield s.msg("The cart's wheels squeal. Something's in the way."); yield* mkStuck(s); return; }
      s.sfx('run'); MK.cart = [x, at[1]];
      yield 8 + n * 6;
      if (x === MK_RAIL[1]) { yield* mkSolved(s); return; }
      yield s.msg(n > 1 ? 'The cart rattles along the rail and bumps to a stop.' : 'The cart trundles a little way and bumps to a stop.');
      return;
    }
    const tx = at[0] + dx, ty = at[1] + dy;
    if (!floor(tx, ty)) { s.sfx('error'); yield s.msg("You heave and heave... It won't budge. Something's in the way."); yield* mkStuck(s); return; }
    s.sfx('search'); MK[k] = [tx, ty];
    yield 10;
  }
  {
    const MK2 = 'kp_mtkupo_2';
    const vis = (o) => { const h = !mkActive(); o.hidden = h; o.solid = !h; };
    add(MK2, 'props', [{ at: [3, 6], prop: 'track', len: 7, gauge: 0.32, col: '#6e6660', col2: '#4a3a2a' },
      { at: [9, 6], prop: 'disc', r: 0.44, h: 0.03, sides: 8, col: '#5a4a3a', top: '#8a7048', rim: '#3a3028' }]);
    FF7.patchMap(MK2, {
      objects: [
        { id: 'lq_mk_b1', at: MK.b1, prop: 'rock', col: '#8a7a68', scl: [1.6, 1.7, 1.6], solid: false, hidden: true, tick(o) { o.at = MK.b1; vis(o); }, talk: function* (s) { yield* mkPush(s, 'b1'); } },
        { id: 'lq_mk_b2', at: MK.b2, prop: 'rock', col: '#7e7060', scl: [1.6, 1.6, 1.6], solid: false, hidden: true, tick(o) { o.at = MK.b2; vis(o); }, talk: function* (s) { yield* mkPush(s, 'b2'); } },
        { id: 'lq_mk_cart', at: MK.cart, prop: 'lq3_cart', solid: false, hidden: true, tick(o) { o.at = MK.cart; vis(o); }, talk: function* (s) { yield* mkPush(s, 'cart'); } },
        ...MK_ROCKS.map((at, i) => ({ id: 'lq_mk_rock' + i, at, prop: 'rock', col: '#5e5248', scl: [2.0, 2.6, 2.0], solid: true,
          talk: function* (s) { yield s.msg('A great lump of rock, rooted to the floor. Nothing is moving this.'); } })),
        { id: 'lq_mk_vein', at: [10, 7], prop: 'crystal', col: '#e8b450', scl: [1.5, 1.5, 1.5], solid: false, hidden: true, tick(o) { o.hidden = !flag('kp_lq_lux_earth'); } },
      ],
      triggers: [{ at: [1, 4], on: 'talk', run: function* (s) {
        yield s.msg("A miner's note, wedged into the crystal:\f\"Cart on the plate, and the old seam opens. Mind the boulders: they roll where you push them, and nowhere else.\"");
        if (mkActive() && !s.flag('kp_lq_lux_earth')) yield* mkStuck(s);
      } }],
      onLoad: function () { mkReset(); },
    });
  }

  // ---- fire: Tifa at the temple's cold brazier, Nibel Peaks
  const TIFA_AT = pick('kp_nibelpeaks', [[23, 5], [22, 5]], 'Tifa'), BRAZIER = [TIFA_AT[0] + 1, TIFA_AT[1]];
  const TIFA = W.trainer({ id: 'lq_lux_tifa', cls: 'Master', name: 'Tifa', model: 'tifa', at: TIFA_AT, dir: 'right', bg: 'snow', music: 'birthofgod', ai: 'smart', noBag: true, money: 3000,
    team: held([['icemog_yeti', L(50)], ['stampo_blackbelt', L(50)], ['kupochi_master', L(50)], ['knucklin_lanista', L(50)], ['kupozen_white_monk', L(50)]]),
    line: 'You want the fire back? Then bring the heat!', lose: "Now THAT'S heat.", after: 'Told you it was waiting for the right punch.',
    show: s => s.flag('kp_lq_lux_open') });
  function* tifaTalk(s) {
    if (s.flag('kp_lq_lux_fire')) { yield s.say('Tifa', 'Told you it was waiting for the right punch. Took me a while to find it, too.'); return; }
    if (!W.beaten('lq_lux_tifa')) {
      yield s.say('Tifa', "This brazier hasn't burned since the temple was built. The old monks said it was waiting for the right punch.\fI've been practising.");
      yield* TIFA.npc.talk(s);
      if (!W.beaten('lq_lux_tifa')) return;
    }
    yield s.say('Tifa', 'Okay. My turn.');
    yield s.face('lq_lux_tifa', 'right');
    s.anim('lq_lux_tifa', 'punch'); yield 18;
    s.sfx('fire'); s.flash('#ff8040', 18); s.shake(2, 20);
    s.set('kp_lq_lux_fire');
    yield s.msg('FWOOM! The brazier roars into flame. One of your dim crystals catches the light and glows red.\fThe fire crystal is lit!');
    s.stopAnim('lq_lux_tifa');
    yield s.face('lq_lux_tifa', 'player');
    yield s.say('Tifa', "There. Now go light the rest. And come back and tell me who's under all that light.");
    yield* litNote(s);
  }
  FF7.patchMap('kp_nibelpeaks', {
    npcs: [Object.assign({}, TIFA.npc, { talk: tifaTalk })],
    objects: [{ id: 'lq_lux_brazier', at: BRAZIER, prop: 'lq3_brazier', solid: true, lit: false, stateKey: 'cold',
      tick(o) { const l = flag('kp_lq_lux_fire'); if (o.lit !== l) { o.lit = l; o.stateKey = l ? 'lit' : 'cold'; } },
      talk: function* (s) { yield s.msg(s.flag('kp_lq_lux_fire') ? 'The great brazier burns bright and steady.' : "The temple's great brazier. Cold as the snow around it."); } }],
  });

  // ---- water: the lighthouse keeper's riddle, Route 4
  wrapTalk('kp_route4_lighthouse', 'kp_r4_keeper', function* (s, t0) {
    if (s.flag('kp_lq_lux_water')) {
      yield s.say('Keeper Morrow', "Forty years, and a riddle fixed my lamp. I should've asked one sooner.");
      if (!s.flag('kp_r4_keeper_gift') && t0) yield* t0(s);
      return true;
    }
    if (!s.flag('kp_lq_lux_open')) return false;
    yield s.say('Keeper Morrow', "The lamp's gone out. First time in forty years. The fishing boats are bumping into each other out there.");
    yield s.say('Keeper Morrow', "There's an old keeper's riddle. Answer it right and the lamp lights itself. Or so my grandfather said. He said a lot of things.");
    const c = yield s.ask('Keeper Morrow', "I'm never wet, yet I bring every ship home. What am I?", ['The light', 'The anchor', 'The gull']);
    if (c === 1) { yield s.say('Keeper Morrow', "The anchor? The anchor's ALWAYS wet. That's its whole job."); return true; }
    if (c === 2) { yield s.say('Keeper Morrow', 'The gull? The gull steals sandwiches. It has never once brought anybody home.'); return true; }
    yield s.say('Keeper Morrow', 'The light! ...Hear that?');
    s.sfx('ching'); s.flash('#fff8c0', 20);
    s.set('kp_lq_lux_water');
    yield s.msg('Up above, the great lamp flickers, and blazes. The window fills with light, and one of your dim crystals glows blue.\fThe water crystal is lit!');
    yield s.say('Keeper Morrow', 'Well, would you look at that. Grandfather was right. Once.');
    yield* litNote(s);
    return true;
  });

  // ---- wind: Skyport's windsocks and the kite on the mooring mast
  const SOCKS = [{ at: [9, 3], start: 0 }, { at: [15, 6], start: 2 }, { at: [23, 3], start: 3 }, { at: [28, 6], start: 0 }];
  const DIR_NAME = ['north', 'east', 'south', 'west'], DIR_ROT = [180, 90, 0, -90];   // (a windsock points down the wind; the mast is east)
  const sockDir = (i) => flag('kp_lq_lux_wind') ? 1 : (SOCKS[i].start + vget('kp_lq_lux_sock' + (i + 1))) % 4;
  function* gust(s) {
    yield 20;
    s.sfx('gate'); s.shake(2, 40);
    yield s.msg('All four windsocks snap taut at once, every one pointing at the mast. A gust comes howling in off the cliffs...');
    yield s.cam(40, 5, 50, { height: 2.6 });
    s.set('kp_lq_lux_wind');
    s.spawn('lq_lux_kite', { prop: 'lq3_kite' }, 40, 5, 'down', { hover: 3.9, solid: false });
    yield s.hover('lq_lux_kite', 0.1, 80);
    s.flash('#a0ffc0', 16); s.sfx('ching');
    yield s.msg('The kite tumbles free and flutters down by the mast. On its tail, one of your crystals flares bright green.\fThe wind crystal is lit!');
    s.remove('lq_lux_kite');
    yield s.camFollow(30);
    yield* litNote(s);
  }
  function* sockTalk(s, i) {
    if (s.flag('kp_lq_lux_wind')) { yield s.msg('The windsock streams east, toward the mooring mast.'); return; }
    if (!s.flag('kp_lq_lux_open')) { yield s.msg(`A windsock on the launch pad. It points ${DIR_NAME[sockDir(i)]}.`); return; }
    const v = 'kp_lq_lux_sock' + (i + 1);
    s.setVar(v, (s.get(v) + 1) % 4); s.sfx('set');
    const d = sockDir(i);
    yield s.msg(`You give the windsock a quarter turn. Now it points ${DIR_NAME[d]}${d === 1 ? ', right at the mooring mast' : ''}.`);
    if (SOCKS.every((k, j) => sockDir(j) === 1)) yield* gust(s);
  }
  FF7.patchMap('kp_skyport', {
    objects: SOCKS.map((k, i) => ({ id: 'lq_lux_sock' + (i + 1), at: k.at, prop: 'lq3_windsock', solid: true, rot: DIR_ROT[k.start],
      tick(o) { o.rot = DIR_ROT[sockDir(i)]; }, talk: function* (s) { yield* sockTalk(s, i); } }))
      .concat([{ id: 'lq_lux_kite_on_mast', at: [40, 4], prop: 'lq3_kite', hover: 3.9, solid: false, hidden: true,
        tick(o) { o.hidden = !flag('kp_lq_lux_open') || flag('kp_lq_lux_wind'); } }]),
    triggers: [{ at: [40, 4], on: 'talk', if: s => s.flag('kp_lq_lux_open') && !s.flag('kp_lq_lux_wind'),
      run: function* (s) { yield s.msg('A kite is tangled high on the mooring mast. Something green glints on its tail: the wind crystal!\fThe pilots say the wind always takes the hint, if every windsock on the launch pad points the way you want it to blow.'); } }],
  });

  // ---- the Shrine of Light (new map): the pedestals, and C. The Warrior at the altar
  const PEDS = [{ e: 'earth', at: [13, 9], col: '#a8783a' }, { e: 'fire', at: [13, 15], col: '#e0482a' }, { e: 'water', at: [2, 9], col: '#3a7ae0' }, { e: 'wind', at: [2, 15], col: '#3ab06a' }];
  const LUX = W.legend('lq_luxmog', 'luxmog_light_warrior', { at: [7, 2], dir: 'down', scaled: true, lv: 50, abil: 0, bg: 'sky', scale: 1.25,
    show: s => s.flag('kp_lq_lux_altar'), done: 'kp_lq_lux_done',
    intro: 'Luxmog stands before the altar, the old sword resting on its shoulder. It nods: ready when you are.',
    opening: 'Luxmog raises its blade to the sun, and the whole sky turns gold.',
    after: 'Luxmog sheathes its blade and is gone with the light.\fWhen the sun comes up again, so will it.',
    then: luxThen });
  function* luxThen(s) {
    yield s.msg('The four crystals stay lit on their pedestals, warm as a sunrise.');
    yield* got(s, 'sun_fragment');
    yield* got(s, 'royal_nut', 3);
    yield* KP.giveLegendItem(s, 'luxmog_light_warrior');   // (the first Light Wick: js/kupomon/kp_legendbreed.js)
  }
  function* pedestal(s, i) {
    const p = PEDS[i], n = s.get('kp_lq_lux_pedestals');
    if (n > i || s.flag('kp_lq_lux_altar')) { yield s.msg(`The ${p.e} crystal glows on its pedestal.`); return; }
    if (i !== n) {
      s.sfx('error'); s.flash('#ffffff', 10, 0.4);
      if (n > 0) KP.give('lq_crystals', n);
      s.setVar('kp_lq_lux_pedestals', 0);
      yield s.msg(`You set the ${p.e} crystal down. It flares... and leaps back into your hands${n > 0 ? ', and so do all the others. Every pedestal goes dark' : ''}.\fThe old order, the Pilgrim said.`);
      return;
    }
    KP.take('lq_crystals', 1); s.inc('kp_lq_lux_pedestals'); s.sfx('set');
    yield s.msg(`You set the ${p.e} crystal on its pedestal. It hums, and a thin beam of light reaches up toward the altar.`);
    if (i === PEDS.length - 1) { s.sfx('ching'); s.flash('#fff2c0', 16); yield s.msg('Four beams meet high over the altar. At the top of the stair, the sword in the stone begins to glow.'); }
  }
  function* warriorComes(s) {
    s.stopMusic(40);
    s.sfx('magic'); s.flash('#fff6d0', 18);
    yield s.msg('The four pedestals blaze. Their beams strike the sword...');
    s.set('kp_lq_lux_altar');
    s.spawn('lq_lux_sword', { prop: 'lq3_sword', dx: 0.25 }, 7, 1, 'down', { hover: 0.22, solid: false });
    yield s.cam(7, 2, 40, { pitch: 24, dist: 7.5, height: 2.6 });
    yield s.hover('lq_lux_sword', 2.2, 80);
    yield s.msg('...and it rises out of the stone by itself.');
    s.flash('#ffe080', 30); s.shake(2, 30); s.sfx('ching');
    s.spawn(LUX.id, LUX.model, 7, 2, 'down', { name: 'Luxmog', hover: 4.2, talk: LUX.talk });
    yield s.hover(LUX.id, 2.2, 50);
    s.remove('lq_lux_sword');
    yield s.hover(LUX.id, 0, 40);
    s.sfx('hop'); s.anim(LUX.id, 'kneel'); yield 50; s.stopAnim(LUX.id);
    yield s.camFollow(30);
    yield s.say('Luxmog', 'Four lights. One more trial. Was it you who lit them?');
    s.anim('player', 'nod'); yield 40; s.stopAnim('player');
    yield s.say('Luxmog', 'Then show me what the light was for.');
    yield* LUX.talk(s);
  }
  function* altar(s) {
    if (s.flag('kp_lq_lux_altar')) { yield s.msg('The white stone is empty now. Luxmog took the sword with it.'); return; }
    if (s.get('kp_lq_lux_pedestals') < PEDS.length) { yield s.msg('A sword set deep in a white stone. It will not budge. Not even a little.\fFar below, four pedestals wait.'); return; }
    yield* warriorComes(s);
  }
  const SHRINE = [
    "                ",
    "    |__AA__|    ",
    "    ________    ",
    "    __|^^|__    ",
    "       ^^       ",
    "       ^^       ",
    "       ^^       ",
    "      |^^|      ",
    "  ____|^^|____  ",
    " _P__________P_ ",
    " ______________ ",
    " ______________ ",
    " |____________| ",
    " ______________ ",
    " ______________ ",
    " _P__________P_ ",
    "  ____eeee____  ",
    "       ee       ",
  ];
  const cloud = (x, y, r) => ({ at: [x + 0.01, y + 0.01], prop: 'lq3_cloud', r, y0: -0.45 });
  FF7.defineMap('kp_lq_lux_shrine', {
    name: 'The Shrine of Light', area: 'Route 14', theme: 'temple', music: 'church', kpBg: 'sky',
    look: { sky: ['#5a9ae8', '#f4f8ff'], clouds: { col: '#ffffff', alpha: 0.85, n: 10, speed: 0.15 }, fog: { color: [0.86, 0.9, 0.98], near: 14, far: 36 },
      ambient: [0.62, 0.62, 0.66], light: [1, 0.97, 0.9], floor2: ['#e8e2d6', '#dcd6ca'], floor3: ['#f0ece4', '#e8e4dc'], wall: '#f2eee6', wallTop: '#d8d2c4', pillar: '#f4f0e8', trim: '#c8a848',
      wallH: 2.2, glow: '#fff2b0', floorTex: { floor2: 'marble', floor3: 'marble' } },
    grid: SHRINE,
    heights: [
      "0000000000000000",
      "0000777777770000",
      "0000777777770000",
      "0000777667770000",
      "0000000550000000",
      "0000000440000000",
      "0000000330000000",
      "0000000220000000",
      "0000000110000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
      "0000000000000000",
    ],
    legend: { A: 'block', P: 'block' },
    props: [
      { at: [7.5, 1], prop: 'rock', col: '#f0ece2', scale: [1.4, 0.9, 1.2] },
      ...PEDS.map(p => ({ at: p.at, prop: 'disc', r: 0.42, h: 0.75, sides: 8, col: '#e8e2d6', top: p.col, rim: '#c8a848' })),
      { at: [7.5, 12], prop: 'disc', r: 2.2, h: 0.02, sides: 16, col: '#e8d8a0', top: '#f0e2b0', ring: '#d8b860' },
      cloud(0, 3, 1.6), cloud(15, 2, 1.5), cloud(2, 5, 1.3), cloud(13, 6, 1.4), cloud(0, 10, 1.2), cloud(15, 11, 1.3), cloud(0, 16, 1.5), cloud(15, 16, 1.6),
      cloud(3, 17, 1.2), cloud(12, 17, 1.3), cloud(5, 0, 1.2), cloud(11, 0, 1.2),
    ],
    lights: [[7.5, 1, '#fff0c0', 4], [7.5, 12, '#ffffff', 6], [2, 9, '#ffd8b0', 2], [13, 9, '#ffd8b0', 2], [2, 15, '#ffd8b0', 2], [13, 15, '#ffd8b0', 2]],
    entries: { from_route14: [7, 16, 'up'] },
    exits: [{ at: [7, 17, 2, 1], to: 'kp_route14', entry: 'from_shrine' }],
    npcs: [LUX],
    objects: [
      { id: 'lq_lux_stonesword', at: [7, 1], prop: 'lq3_sword', dx: 0.25, lift: 0.22, solid: false, hidden: false, tick(o) { o.hidden = flag('kp_lq_lux_altar'); } },
      ...PEDS.map((p, i) => ({ id: 'lq_lux_ped_' + p.e, at: p.at, prop: 'crystal', col: p.col, hover: 0.75, solid: false, hidden: true,
        tick(o) { o.hidden = !(vget('kp_lq_lux_pedestals') > i || flag('kp_lq_lux_altar')); } })),
    ],
    triggers: PEDS.map((p, i) => ({ at: p.at, on: 'talk', run: function* (s) { yield* pedestal(s, i); } }))
      .concat([{ at: [7, 1, 2, 1], on: 'talk', run: altar }]),
  });

  // ================================================================== the Demo (js/kupomon/kp_runner.js O.kp_quests)
  const win = (f, train, ...steps) => ['kp_win', steps, f, { train }];   // (a fight that has to be won: lost, it trains and goes again)
  const TRAIN = 'kp_summit_2';
  const mkDone = (fn) => () => flag('kp_lq_lux_earth') || !!fn();
  const sock = (i, n) => ({ any: ['kp_lq_lux_wind', { var: 'kp_lq_lux_sock' + i, atLeast: n }] });
  KP.QUESTS = KP.QUESTS || {};
  KP.QUESTS.pom = { name: 'Mogglemog: The Pom Court', order: 6, ready: () => flag('kp_champion'), done: 'kp_lq_pom_done', plan: [
    ['obj', 'The Pom Court: Pomperly in Whisperwood Deep'],
    ['talk', 'lq_pom_herald', { map: 'kp_whisperwood_deep', done: 'kp_lq_pom_open' }],
    ['obj', 'The Pom Court: the six who went on holiday'],
    ['talk', 'lq_pom_minstrel', { map: 'kp_mogridge', choose: 'Clap', done: 'kp_lq_pom_c1' }],
    win('kp_lq_pom_c2', TRAIN, ['goto', 'kp_route6'], ['talk', 'lq_pom_knight', { done: 'kp_lq_pom_c2' }]),
    ['kp_buy', { kupo_nut: 1 }, { center: 'kp_fernwick_center', done: 'kp_lq_pom_c3' }],
    ['talk', 'lq_pom_cook', { map: 'kp_fernwick_center', choose: 'Here you go', done: 'kp_lq_pom_c3' }],
    ['talk', 'lq_pom_jester', { map: 'kp_sandsea_bazaar', choose: 'pom-pom', done: 'kp_lq_pom_c4' }],
    ['talk', 'lq_pom_gardener', { map: 'kp_bloomhaven', done: 'kp_lq_pom_c5' }],
    ['talk', 'lq_pom_purser', { map: 'kp_costa', done: { any: ['kp_lq_pom_purse', 'kp_lq_pom_c6'] } }],
    ['use', 13, 13, { map: 'kp_costa', done: 'kp_lq_pom_c6' }],
    ['talk', 'lq_pom_herald', { map: 'kp_whisperwood_deep', done: 'kp_lq_pom_door' }],
    ['obj', 'The Pom Court: the lanterns, in the order of the Court Song'],
    ['goto', 'kp_lq_pom_court'],   // (the roll call plays on arrival)
    ...COURT.slice(0, -1).map((c, i) => ['use', c.lamp[0], c.lamp[1], { map: 'kp_lq_pom_court', done: { any: ['kp_lq_pom_king', { var: 'kp_lq_pom_lanterns', atLeast: i + 1 }] } }]),
    win('kp_legend_lq_mogglemog', null, ['goto', 'kp_lq_pom_court'],
      ['use', COURT[6].lamp[0], COURT[6].lamp[1], { done: 'kp_lq_pom_king' }],
      ['talk', KING.id, { done: { any: ['kp_legend_lq_mogglemog', gone(KING.id)] } }]),
  ] };
  KP.QUESTS.tempo = { name: 'Tempomog: Midnight, Eighty Years', order: 7, ready: () => flag('kp_champion'), done: 'kp_lq_tempo_done', plan: [
    ['obj', "Midnight, Eighty Years: the Clockmaker's snoring clock"],
    ['talk', 'rvt_clockmaker', { map: 'kp_ravenmoor_clock', done: 'kp_lq_tempo_open' }],
    ['obj', "Midnight, Eighty Years: the gear in the Wrapmog's tomb"],
    win('kp_lq_tempo_past', TRAIN, ['goto', 'kp_ruins_2'], ['use', 14, 3, { choose: 'Take it', done: 'kp_lq_tempo_past' }]),
    ['obj', "Midnight, Eighty Years: Mogridge's slow clock"],
    ['use', 30, 5, { map: 'kp_mogridge', choose: 'forward', done: 'kp_lq_tempo_now' }],
    ['obj', "Midnight, Eighty Years: Skyport's Countdown Crew"],
    win('kp_lq_tempo_next', TRAIN, ['goto', 'kp_skyport'], ['talk', 'lq_tempo_tick', { done: 'kp_lq_tempo_next' }]),
    ['obj', 'Midnight, Eighty Years: the gears on the spindles, first to last'],
    ['goto', 'kp_lq_tempo_belfry'],
    ['use', 5, 10, { map: 'kp_lq_tempo_belfry', choose: 'dusty', done: { any: ['kp_lq_tempo_set', { var: 'kp_lq_tempo_fit', atLeast: 1 }] } }],
    ['use', 7, 10, { map: 'kp_lq_tempo_belfry', choose: 'shiny', done: { any: ['kp_lq_tempo_set', { var: 'kp_lq_tempo_fit', atLeast: 2 }] } }],
    win('kp_legend_lq_tempomog', null, ['goto', 'kp_lq_tempo_belfry'],
      ['use', 9, 10, { choose: 'bright', done: 'kp_lq_tempo_set' }],
      ['talk', TEMPO.id, { done: { any: ['kp_legend_lq_tempomog', gone(TEMPO.id)] } }]),
  ] };
  KP.QUESTS.lux = { name: 'Luxmog: The Four Lights', order: 8, ready: () => flag('kp_league_2'), done: 'kp_lq_lux_done', plan: [
    ['obj', "The Four Lights: the Pilgrim on the Champion's Bridge"],
    ['talk', 'lq_lux_pilgrim', { map: 'kp_route14', done: 'kp_lq_lux_open' }],
    ['obj', "The Four Lights: earth, in Mt. Kupo's glowing chamber"],
    ['use', 6, 6, { map: 'kp_mtkupo_2', from: [7, 6], done: mkDone(() => MK.b1[0] !== 6 || MK.b1[1] !== 6) }],
    ['use', 5, 6, { map: 'kp_mtkupo_2', from: [5, 7], done: mkDone(() => MK.b1[1] !== 6) }],
    ['use', 8, 6, { map: 'kp_mtkupo_2', from: [9, 6], done: mkDone(() => MK.b2[0] !== 8 || MK.b2[1] !== 6) }],
    ['use', 7, 6, { map: 'kp_mtkupo_2', from: [7, 7], done: mkDone(() => MK.b2[1] !== 6) }],
    ['use', 3, 6, { map: 'kp_mtkupo_2', from: [2, 6], done: 'kp_lq_lux_earth' }],
    ['obj', 'The Four Lights: fire, at the Nibel Peaks temple'],
    win('kp_lq_lux_fire', TRAIN, ['goto', 'kp_nibelpeaks'], ['talk', 'lq_lux_tifa', { done: 'kp_lq_lux_fire' }]),
    ['obj', 'The Four Lights: water, at the Route 4 lighthouse'],
    ['talk', 'kp_r4_keeper', { map: 'kp_route4_lighthouse', choose: 'The light', done: 'kp_lq_lux_water' }],
    ['obj', "The Four Lights: wind, on Skyport's launch pad"],
    ['use', 9, 3, { map: 'kp_skyport', done: sock(1, 1) }],
    ['use', 15, 6, { map: 'kp_skyport', done: sock(2, 1) }],
    ['use', 15, 6, { map: 'kp_skyport', done: sock(2, 2) }],
    ['use', 15, 6, { map: 'kp_skyport', done: sock(2, 3) }],
    ['use', 23, 3, { map: 'kp_skyport', done: sock(3, 1) }],
    ['use', 23, 3, { map: 'kp_skyport', done: sock(3, 2) }],
    ['use', 28, 6, { map: 'kp_skyport', done: 'kp_lq_lux_wind' }],
    ['obj', 'The Four Lights: the bridge of light'],
    ['talk', 'lq_lux_pilgrim', { map: 'kp_route14', done: 'kp_lq_lux_bridge' }],   // (crossing the bridge's middle with all four lit plays it)
    ['goto', 'kp_lq_lux_shrine'],
    ...PEDS.map((p, i) => ['use', p.at[0], p.at[1], { map: 'kp_lq_lux_shrine', done: { any: ['kp_lq_lux_altar', { var: 'kp_lq_lux_pedestals', atLeast: i + 1 }] } }]),
    win('kp_legend_lq_luxmog', null, ['goto', 'kp_lq_lux_shrine'],
      ['use', 7, 1, { done: 'kp_lq_lux_altar' }],
      ['talk', LUX.id, { done: { any: ['kp_legend_lq_luxmog', gone(LUX.id)] } }]),
  ] };
})();

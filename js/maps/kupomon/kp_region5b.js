// Kupomon, region 5b (docs/KUPOMON_WORLD.md, the user's two more dojos, 2026-10-02; Lv 28-30 old scale): Glimmerfair, the
// carnival on the mesa (Dojo 8: Dio, the Showtime Arcade, the Encore Badge), and Route 17, the Glimmer Descent, down off the
// mesa to Route 13's east side below the Badge Gate. Region 5a (js/maps/kupomon/kp_region5a.js) builds Route 15, Candlerock
// (Dojo 7) and Route 16, whose ropeway station's car comes up here (kp_glimmerfair entry from_route16; back down:
// kp_route16 entry from_glimmerfair). Maps kp_*: they run in Kupomon's sandbox. Dialogue in our own words.
(function () {
  const KP = FF7.kupomon, W = KP.W;
  const F = FF7.field, PR = F.props, PK = F.propKit, sh = PK.sh, beam = PK.beam, glowOf = PK.glowOf;

  // ------------------------------------------------------------------ shared pieces (as in kp_region4.js)
  // a one-way ledge the reach checks can see (W.ledge, tagged)
  const ledge = (at, dir = 'down', drop = 2) => Object.assign(W.ledge(at, dir, drop), { _ledge: [dir, drop] });
  // a stable pseudo-random number per tile (prop variety)
  const rnd = (x, y, k = 0) => { const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // props for every tile of the given characters: spec[ch](x, y) -> a props entry (without `at`)
  const deco = (grid, spec) => {
    const out = [];
    grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const f = spec[row[x]]; if (f) { const p = f(x, y); if (p) out.push(Object.assign({ at: [x, y] }, p)); } } });
    return out;
  };
  // everything sold before (the Builder's guide: Bloomhaven and later), the clerk asking which shelf first
  const SHELVES = [
    ['Kupo Nuts', ['kupo_nut', 'golden_nut', 'royal_nut', 'sprout_nut', 'quick_nut', 'roast_nut', 'familiar_nut', 'sleepy_nut']],
    ['Special nuts', ['glow_nut', 'spell_nut', 'tough_nut', 'wild_nut', 'hefty_nut', 'oil_nut', 'fancy_nut']],
    ['Oils and repairs', ['oil_can', 'hi_oil', 'max_oil', 'battery', 'fixit']],
    ['Held items', ['leftover_nut', 'lucky_pom', 'quick_gear', 'focus_pom', 'cure_nut', 'mini_oil', 'gamblers_coin']],
    ['Boosters (Freelancer-Black Mage)', ['freelancer', 'warrior', 'knight', 'monk', 'thief', 'dragoon', 'ranger', 'blackmage'].map(t => 'boost_' + t)],
    ['Boosters (White Mage-Machinist)', ['whitemage', 'redmage', 'summoner', 'timemage', 'bard', 'beast', 'machinist'].map(t => 'boost_' + t)],
  ];
  const MART_ALL = [].concat(...SHELVES.map(s => s[1]));
  // (one Mart screen for all of it: its pocket tabs sort the stock as the bag does, and the list scrolls, js/kupomon/kp_menu.js)
  const martMenu = (clerk, hello) => function* (s) {
    yield s.say(clerk, hello || 'Welcome to the Mart, kupo! We stock a bit of everything out here.');
    const at = s.field && s.field.map && s.field.map.id;
    const chips = KP.chipStock ? KP.chipStock(at) : [], held = KP.heldStock ? KP.heldStock(at) : [];   // (its Skill Chips, the expansion's held items)
    yield KP.shop(Array.from(new Set(MART_ALL.concat(held, chips))), { name: clerk });
    yield s.say(clerk, 'Thanks for stopping by, kupo!');
  };
  const center = (id, def) => {
    W.mogCenter(id, Object.assign({ mart: MART_ALL }, def));
    const m = FF7.maps[id], talk = martMenu('Mart Mog', def.hello);
    m.npcs.find(n => n.id === 'merchant').talk = talk;
    m.triggers[1].run = talk;
  };
  // a townsperson: { id, name, model, at, dir, wander, lines (a string, or a function(s) -> string), talk, show }
  const folk = (o) => ({ id: o.id, name: o.name, model: o.model, at: o.at, dir: o.dir || 'down', wander: o.wander || 0, anim: o.anim, hover: o.hover, show: o.show, faceOnTalk: o.faceOnTalk,
    talk: o.talk || function* (s) { const t = typeof o.lines === 'function' ? o.lines(s) : o.lines; yield s.say(o.name, t); } });
  const examine = (at, text) => ({ at, on: 'talk', run: function* (s) { yield s.msg(typeof text === 'function' ? text(s) : text); } });
  const tr = (id) => 'kp_tr_' + id;
  const NEON = ['#ff5ac8', '#5ae0ff', '#ffe05a', '#7aff7a', '#c87aff'];
  // Glimmerfair's people: carnival staff in red and gold, and a few custom looks
  const STAFF = 'gold_saucer_staff';
  const STAFF_W = { base: 'woman', top: '#d02020', sleeve: '#d02020', bottom: '#1a1a3a', hair: '#f0c040', hairStyle: 'bun', skirt: 'short', extras: ['bowtie'] };

  // ================================================================== props: the carnival's set pieces
  const lightFn = (o) => (o && typeof o.light === 'function') ? (p, c, r) => o.light(p, c, r) : () => {};
  const dquad = (mb, a, b, c, d, col) => { mb.quad(a, b, c, d, col); mb.quad(d, c, b, a, col); };
  const dtri = (mb, a, b, c, col) => { mb.tri(a, b, c, col); mb.tri(c, b, a, col); };
  // the Glimmer Wheel: a big ferris wheel facing south (the wheel in the x-y plane), on two A-frames, twelve gondolas,
  // bulbs round its rims. o.r wheel radius (m), o.hub hub height (m), o.n gondolas, o.col frame, o.cars gondola colours
  PR.kpferris = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = o.r || 2.8, hub = y + (o.hub || R + 0.55), n = o.n || 12, segs = 36, frame = o.col || '#e8e4f4', leg = o.col2 || '#9a96b0', d = 0.22;
    const gm = glowOf(o, mb), light = lightFn(o), cars = o.cars || ['#e04060', '#40a0e0', '#f0c030', '#60c060', '#c060e0', '#f08030'];
    const P3 = (a, r, zz) => [x + Math.cos(a) * r, hub + Math.sin(a) * r, z + zz];
    [-1, 1].forEach(k => {   // the A-frames, front and back
      beam(mb, [x - 1.7, y, z + k * 0.5], [x, hub, z + k * (d + 0.12)], 0.08, leg, 4);
      beam(mb, [x + 1.7, y, z + k * 0.5], [x, hub, z + k * (d + 0.12)], 0.08, leg, 4);
      beam(mb, [x - 0.95, y + (hub - y) * 0.42, z + k * 0.38], [x + 0.95, y + (hub - y) * 0.42, z + k * 0.38], 0.05, leg, 4);
    });
    beam(mb, [x, hub, z - 0.5], [x, hub, z + 0.5], 0.11, '#c8c8d4', 6);   // the axle
    for (const zz of [-d, d]) {
      for (let i = 0; i < segs; i++) {
        const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
        beam(mb, P3(a0, R, zz), P3(a1, R, zz), 0.04, frame, 4);
        beam(mb, P3(a0, R * 0.6, zz), P3(a1, R * 0.6, zz), 0.025, frame, 4);
      }
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; beam(mb, [x, hub, z + zz], P3(a, R, zz), 0.018, frame, 3); }
    }
    for (let i = 0; i < segs; i++) {   // bulbs round both rims
      const a = (i + 0.5) / segs * Math.PI * 2, c = NEON[i % NEON.length];
      const p = P3(a, R + 0.05, d + 0.04), q = P3(a, R + 0.05, -d - 0.04);
      gm.sphere(p[0], p[1], p[2], 0.035, 0.035, 0.035, c, 6, 3); gm.sphere(q[0], q[1], q[2], 0.035, 0.035, 0.035, c, 6, 3);
    }
    gm.sphere(x, hub, z + d + 0.08, 0.16, 0.16, 0.05, '#ffe060', 10, 4); gm.sphere(x, hub, z - d - 0.08, 0.16, 0.16, 0.05, '#ffe060', 10, 4);
    for (let i = 0; i < n; i++) {   // the gondolas, hanging level
      const a = i / n * Math.PI * 2 + Math.PI / n, p = P3(a, R, 0), c = cars[i % cars.length];
      beam(mb, P3(a, R, -d), P3(a, R, d), 0.03, frame, 4);
      beam(mb, p, [p[0], p[1] - 0.2, p[2]], 0.02, '#3a3a44', 3);
      mb.box(p[0], p[1] - 0.4, p[2], 0.38, 0.32, 0.36, { side: c, top: sh(c, 0.2), front: c });
      mb.box(p[0], p[1] - 0.22, p[2], 0.44, 0.06, 0.42, sh(c, -0.3));
      gm.box(p[0], p[1] - 0.37, p[2] + 0.182, 0.26, 0.11, 0.006, '#fff0c0'); gm.box(p[0], p[1] - 0.37, p[2] - 0.182, 0.26, 0.11, 0.006, '#fff0c0');
    }
    light([x, hub, z + 0.8], '#ff9ad8', 7); light([x, y + 0.8, z + 0.8], '#ffe0a0', 3);
  };
  // the Big Top: a round striped circus tent (wall band, cone roof, scalloped valance, a pennant), its entrance flap
  // facing o.door (radians, south = PI/2). o.r radius (m), o.h wall (m), o.rise roof (m), o.col / o.col2 stripes
  PR.kpbigtop = (mb, x, y, z, s, th, nb, o = {}) => {
    const R = o.r || 1.75, H = o.h || 1.3, rise = o.rise || 2.2, n = o.n || 20, c1 = o.col || '#d82838', c2 = o.col2 || '#f4ece0';
    const gm = glowOf(o, mb), light = lightFn(o), door = o.door != null ? o.door : Math.PI / 2;
    const P2 = (a, r, yy) => [x + Math.cos(a) * r, yy, z + Math.sin(a) * r], ap = [x, y + H + rise, z];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2, c = i % 2 ? c1 : c2, cb = i % 2 ? c2 : c1;
      dquad(mb, P2(a0, R, y), P2(a1, R, y), P2(a1, R, y + H), P2(a0, R, y + H), c);
      dtri(mb, P2(a0, R * 1.1, y + H - 0.04), P2(a1, R * 1.1, y + H - 0.04), ap, c);
      dtri(mb, P2(a0, R * 1.1, y + H - 0.04), P2(a1, R * 1.1, y + H - 0.04), P2(am, R * 1.1, y + H - 0.32), cb);
      const b = P2(a0, R * 1.12, y + H - 0.05); gm.sphere(b[0], b[1], b[2], 0.035, 0.035, 0.035, NEON[i % NEON.length], 6, 3);
    }
    // the entrance: a dark opening under a gold arch
    const t = [-Math.sin(door), Math.cos(door)], c0 = P2(door, R + 0.03, y), w2 = 0.48, hh = 1.15;
    const E = (u, yy) => [c0[0] + t[0] * u, yy, c0[2] + t[1] * u];
    dquad(mb, E(-w2, y + 0.01), E(w2, y + 0.01), E(w2, y + hh), E(-w2, y + hh), '#1a0e14');
    beam(mb, E(-w2 - 0.04, y), E(-w2 - 0.04, y + hh + 0.08), 0.035, '#e0b840', 4); beam(mb, E(w2 + 0.04, y), E(w2 + 0.04, y + hh + 0.08), 0.035, '#e0b840', 4);
    beam(mb, E(-w2 - 0.04, y + hh + 0.08), E(w2 + 0.04, y + hh + 0.08), 0.035, '#e0b840', 4);
    beam(mb, [ap[0], ap[1] - 0.1, ap[2]], [ap[0], ap[1] + 0.75, ap[2]], 0.03, '#e0b840', 4);   // the king pole and a pennant
    dtri(mb, [ap[0], ap[1] + 0.74, ap[2]], [ap[0], ap[1] + 0.46, ap[2]], [ap[0] + 0.5, ap[1] + 0.62, ap[2]], '#ffe060');
    light([E(0, 0)[0], y + 1.2, E(0, 0)[2] + 0.5], '#ffd0a0', 3);
  };
  PR.kpbigtop.fade = true;
  // a coin telescope on a post (the lookout)
  PR.kpscope = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#c8a040';
    mb.prism(x, y, z, 0.05, 0.04, 0.9, 6, '#4a4a54');
    mb.box(x, y + 0.92, z, 0.1, 0.12, 0.1, sh(c, -0.2));
    beam(mb, [x, y + 0.98, z - 0.18], [x, y + 1.12, z + 0.26], 0.06, c, 8);
    mb.box(x, y + 1.1, z + 0.28, 0.1, 0.1, 0.02, '#20202a');
  };
  // a black piano key (raised), and the ivory gap where the keyboard has none (between E and F)
  PR.kpblackkey = (mb, x, y, z, s) => { mb.box(x, y + 0.13, z, s * 0.6, 0.26, s * 0.98, { side: '#0c0c10', top: '#24242c', front: '#141418' }); };
  PR.kpkeygap = (mb, x, y, z, s) => { mb.box(x, y + 0.02, z, s * 0.94, 0.04, s * 0.98, '#e8e0d0'); mb.box(x, y + 0.045, z, 0.02, 0.01, s * 0.98, '#3a3028'); };
  // an open trapdoor: a black pit in the boards, framed in its colour (o.col), the leaves hanging into the dark
  PR.kptrap = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#6a4a30', k = s * 0.48;
    mb.box(x, y + 0.012, z, s * 0.94, 0.02, s * 0.94, '#040306');
    mb.box(x - k, y + 0.03, z, 0.04, 0.04, s * 0.96, c); mb.box(x + k, y + 0.03, z, 0.04, 0.04, s * 0.96, c);
    mb.box(x, y + 0.03, z - k, s * 0.96, 0.04, 0.04, c); mb.box(x, y + 0.03, z + k, s * 0.96, 0.04, 0.04, c);
    mb.box(x - k + 0.04, y - 0.2, z, 0.02, 0.4, s * 0.8, '#4a3428'); mb.box(x + k - 0.04, y - 0.2, z, 0.02, 0.4, s * 0.8, '#4a3428');
  };
  // a painted square on the boards (a shut trapdoor's colour, a lit key, a pool of light): o.col, o.size (tiles)
  PR.kppool = (mb, x, y, z, s, th, nb, o = {}) => { const k = s * (o.size || 0.9); glowOf(o, mb).box(x, y + 0.008, z, k, 0.012, k, o.col || '#ffe060'); };
  // a theatre spotlight on a tripod, its coloured gel facing south (o.col)
  PR.kpspot = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#ff4040';
    [[-1, -1], [1, -1], [0, 1]].forEach(([a, b]) => beam(mb, [x + a * 0.16, y, z + b * 0.14], [x, y + 0.7, z], 0.016, '#2a2a30', 4));
    beam(mb, [x - 0.17, y + 0.72, z], [x + 0.17, y + 0.72, z], 0.02, '#3a3a44', 4);
    mb.box(x, y + 0.86, z - 0.02, 0.26, 0.24, 0.34, { side: '#1c1c22', top: '#2a2a32', front: '#1c1c22' });
    mb.box(x, y + 0.86, z + 0.16, 0.3, 0.28, 0.03, sh(c, -0.35));
    glowOf(o, mb).box(x, y + 0.86, z + 0.18, 0.2, 0.18, 0.01, c);
  };
  // a velvet stage curtain: folds across o.w tiles, o.h (m) tall, a gold valance; faces south
  PR.kpcurtain = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = (o.w || 1) * s, h = o.h || 2.4, c = o.col || '#a01828', n = Math.max(2, Math.round(w / 0.11));
    for (let i = 0; i < n; i++) { const u = -w / 2 + (i + 0.5) * w / n; mb.box(x + u, y + h / 2, z + (i % 2 ? 0.035 : -0.035), w / n * 1.06, h, 0.07, sh(c, i % 2 ? -0.14 : 0.06)); }
    mb.box(x, y + h - 0.12, z + 0.08, w + 0.06, 0.24, 0.06, '#c8a040');
    for (let i = 0; i < n; i++) { const u = -w / 2 + (i + 0.5) * w / n; mb.box(x + u, y + h - 0.27, z + 0.1, 0.03, 0.08, 0.02, '#e0c060'); }
  };

  // ================================================================== Glimmerfair: the carnival on the mesa
  // A carnival town on a high mesa top, reached by the ropeway from Route 16 (the car docks east of the platform, south-
  // east). The east street climbs past Dio's theatre (the Showtime Arcade, Dojo 8) to the checkered plaza and its
  // Lucky Fountain; the north terrace (stairs up) holds the Big Top (the matinee) and the Glimmer Wheel, the landmark,
  // with a lookout in the north-east corner; the chocobo track loops in the west, its racers going round all night;
  // along the Midway in the south: the Ghost Hotel, the Jockeys' Lodge, the Mog Center, the arcade booth and the
  // Wardrobe. The West Gate (rows 10-11): Route 17, down off the mesa to Route 13. Always night, always lit.
  const GF = [
    "                                          ",
    "  BBBBBBBB        =BBBBBBBBBBBBB======    ",
    "  BBBBBBBB..    ..=BBBBBBBBBBBBB=.....=   ",
    " .BBBBBBBB.l......===============...u.=   ",
    " .BBBBBBBB.......l..............l.....=   ",
    " .BBBBBBBB..P.....................f..f=   ",
    " .BBBBBBBB.......................ff...=   ",
    " .BBBeeBBB......P....P..^^.P...hhhhhhh=   ",
    " .............................Phhhhhhh=   ",
    " !.......l^^...lQQQQQQQQQQQQl..hhhhhhh=   ",
    ":::::::::::::::QQQQQQQQQQQQQQ..+hhhhhh=   ",
    ":::::::::::::::QQbQQQQQQQQbQQA.hhhhhhh=   ",
    " ============::QQQQQQOOQQQQQQ..hhhhhhh=   ",
    " =dddddddddd=::QQQQQQOOQQQQQQA.hhhhhhh=   ",
    " =dddddddddd=::QQQQQQQQQQQQQQ..hNh+hNh=   ",
    " =dd======dd=::QQbQQQQQQQQbQQ.....::..=   ",
    " =dd=,ff,=dd=::lQQQQQQQQQQQQl.....::..=   ",
    " =dd======dd=::...................::..=   ",
    " =dddddddddd=:::::::::::::::::::::::::=   ",
    " =dddddddddd=:::::::::::::::::::::::::=   ",
    " ============.....................::..=   ",
    " hhhhhhh&.........................::..=   ",
    " hhhhhhh.hhhh..hhhhhh.hhhhh.hhh=lgggoo=   ",
    " hhhhhhh.hhhh..hhhhhh.hkkkh.hhh=gggggg=   ",
    " hhhhhhh.hhhh..hhhhhh.h...h.hhh=gggggg=   ",
    " hhh+hhh.h+hh..hh+hhh.D...D.h+h=ggggggg   ",
    " :::::A:::::::::::::A::::::::::=gggggg=   ",
    " ::::::::::::::::::::::::::::::=gggggg=   ",
    " ====l======l======l======l============   ",
    "                                          ",
  ];
  const GF_H = [
    "111111111111111111111111111111111111111111",
    "133333333333333333333333333333333333333111",
    "133333333333333333333333333333333333333111",
    "133333333333333333333333333333333333333111",
    "133333333333333333333333333333333333333111",
    "133333333333333333333333333333333333333111",
    "133333333333333333333333333333333333333111",
    "133333333333311111111111221111111111111111",
    "133333333333311111111111111111111111111111",
    "111111111122111111111111111111111111111111",
  ].concat(Array(20).fill("111111111111111111111111111111111111111111"));
  // the ropeway (as FF7's Gold Saucer station, js/maps/c6a/part3.js): the blue car hangs east of the platform's railing
  // on two track ropes running south off the mesa; a steel gantry holds them at the platform's corner
  const ROPE_H = (2.92 + 0.16) * 0.72 + 0.022, ROPE_X = 0.2 * 0.72 / 0.5, CAR_AT = [39.6, 25], CAR_Y0 = 0.15;
  const CAR = { id: 'gf_car', at: CAR_AT.slice(), y0: CAR_Y0, dir: 'down', model: { vehicle: 'gondola', scale: 0.72 }, u: 0, v: 0,
    tick(o) {
      if (!o._model) return;
      if (!o.v) { o._model.play('idle'); return; }
      o.u += o.v; o.at = [CAR_AT[0], CAR_AT[1] + o.u]; o._model.play('move');
    } };
  // up from Route 16: the car glides in along the ropes, easing to a stop, and the party steps off onto the platform
  const carArrive = function* (s) {
    const f = s.field, o = f && f.objects && f.objects.find(q => q.id === 'gf_car');
    if (!o) return;
    const D = 22, T = 200;
    s.hide('player');
    o.u = D; o.at = [CAR_AT[0], CAR_AT[1] + D];
    s.sfx('elevator');
    for (let t = 0; t < T; t++) { const k0 = 1 - t / T, k1 = 1 - (t + 1) / T; o.v = D * (k1 * k1 - k0 * k0); yield 1; }
    o.v = 0; o.u = 0; o.at = CAR_AT.slice();
    yield 20;
    s.sfx('door');
    s.show('player', 37, 25, 'left');
    yield 8;
    yield s.move('player', 36, 25);
  };
  // the chocobo track: three racers lapping the oval lane (moving objects; the lane's centre line, a rounded rectangle)
  const TRACK = (() => {
    const cx = 6.5, cy = 16, ax = 4, ay = 2.5, N = 240, pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); pts.push([cx + ax * Math.sign(c) * Math.pow(Math.abs(c), 0.5), cy + ay * Math.sign(s) * Math.pow(Math.abs(s), 0.5)]); }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1];
    const at = (u) => {
      u = ((u % L) + L) % L; let i = 1; while (i < cum.length - 1 && cum[i] < u) i++;
      const k = (u - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), a = pts[i - 1], b = pts[i];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])];
    };
    return { L, at };
  })();
  const racer = (i, model) => {
    const u0 = i * 7, p = TRACK.at(u0);
    return { id: 'gf_choco' + i, at: [p[0], p[1]], dir: p[2], model, scale: 0.8, solid: false, u: u0,
      tick(o) {
        o.u += 0.05 + i * 0.004 + 0.012 * Math.sin((o.t || 0) * 0.011 + i * 2.1);
        const q = TRACK.at(o.u); o.at = [q[0], q[1]]; o.dir = q[2];
        if (o._model && o._model.play) o._model.play((o._model.anims && o._model.anims.run) || 'run');
      } };
  };
  // the first visit: a welcome on the platform, and a look round
  const welcome = function* (s) {
    s.set('kp_gf_welcome');
    s.emote('gf_greeter', '!');
    yield 20;
    yield s.face('gf_greeter', 'player'); yield s.face('player', 'gf_greeter');
    yield s.say('Greeter', "Ding ding ding! Welcome, welcome, WELCOME to GLIMMERFAIR! The brightest little town on the brightest big mesa!");
    yield s.cam(25, 7, 70);
    yield s.say('Greeter', "Up on the terrace: the Glimmer Wheel and the Big Top! There's a matinee on, and they're always looking for volunteers.");
    yield s.cam(9, 16, 60);
    yield s.say('Greeter', "Over there, the chocobo track. They race all night. Nobody remembers who's winning.");
    yield s.cam(34, 11, 60);
    yield s.say('Greeter', "And THAT is the Showtime Arcade! Our owner's own theatre, and the last dojo before the Kupo League. Dio himself is the master.\fHe's in there right now, probably practising his bow.");
    s.camFollow(40);
    yield 40;
    yield s.say('Greeter', "Mog Center's down the Midway, the ropeway's right behind you, and the West Gate's the way down to Route 17. Enjoy the show!");
  };
  // the Glimmer Wheel's ride: up into the night and a look over the whole carnival
  const wheelRide = function* (s) {
    const c = yield s.ask('Wheel Attendant', 'The Glimmer Wheel! Twelve gondolas, one perfect view. Free for trainers tonight. Hop in?', ['Ride it!', 'Maybe later']);
    if (c !== 0) { yield s.say('Wheel Attendant', "She'll keep turning. She always does."); return; }
    yield s.fadeOut(30);
    s.hide('player');
    yield s.cam(22, 14, 1, { dist: 22, pitch: 40 });
    yield s.fadeIn(40);
    yield s.msg('The gondola rocks gently as it climbs... From the top of the Glimmer Wheel, the whole carnival glitters below.');
    yield s.cam(9, 16, 90, { dist: 18, pitch: 42 });
    yield s.msg('The racing chocobos are tiny gold blurs going round and round. One of them waves. Chocobos can\'t wave. It waves anyway.');
    yield s.cam(30, 20, 90, { dist: 20, pitch: 40 });
    yield s.msg('Beyond the ropeway, the lamps of the canyon road wind away south toward Candlerock. Westward, past the red canyons, the mountains climb toward the Summit Road.');
    yield s.fadeOut(30);
    s.show('player', 25, 4, 'down');
    s.camFollow(1);
    yield s.fadeIn(30);
    if (!s.flag('kp_gf_wheel')) {
      s.set('kp_gf_wheel'); KP.data().money += 500; s.sfx('found');
      yield s.msg('Something was wedged in the gondola\'s seat! Found 500 coins!');
    }
    yield s.say('Wheel Attendant', 'Welcome back down to earth! Well. Down to the mesa.');
  };
  // the arcade booth's machine: Mog Mash (100 coins a go; a little luck, a little prize)
  const mogMash = function* (s) {
    const d = KP.data();
    const c = yield s.ask(null, 'MOG MASH! Whack the moogles as they pop up! 100 coins a go.', ['Play', 'Leave it']);
    if (c !== 0) return;
    if (d.money < 100) { yield s.msg('Not enough coins. The machine plays a sad little tune at you.'); return; }
    d.money -= 100; s.sfx('slots');
    yield 30;
    const r = Math.random();
    if (r < 0.1) { KP.give('golden_nut', 1); s.sfx('found'); yield s.msg('WHACK WHACK WHACK! JACKPOT! ' + KP.got('golden_nut', 1)); }
    else if (r < 0.4) { KP.give('kupo_nut', 2); s.sfx('found'); yield s.msg('WHACK! WHACK! Not bad! ' + KP.got('kupo_nut', 2)); }
    else yield s.msg('Whack... whack... The moogles were too fast. "TRY AGAIN, KUPO!" flashes on the screen.');
  };
  const LUCKY = ["You toss a coin into the Lucky Fountain. It lands on a little golden moogle's head. That has to be lucky.",
    "You toss a coin in and make a wish. The fountain gurgles. It sounds like it's thinking about it.",
    "You toss a coin in. A Partypom fishes it straight back out and runs off with it."];
  FF7.defineMap('kp_glimmerfair', {
    name: 'Glimmerfair', area: 'Glimmerfair', theme: 'goldsaucer', music: 'goldsaucer',
    look: { sky: ['#07041a', '#3a1858'], fog: { color: [0.13, 0.06, 0.2], near: 16, far: 40 }, ambient: [0.5, 0.42, 0.56], light: [0.86, 0.76, 0.9],
      floor: ['#b48a6a', '#ac8264'], floor2: ['#8a2a3e', '#82263a'], checker: ['#e8c050', '#5a2a7a'], grass: ['#4a8a3a', '#448234'], dirt: ['#b08850', '#a8804a'],
      wall: '#9a5a3c', wallTop: '#7a4a32', trim: '#e0c040', bldgWin: '#ffe0a0', lamp: '#ffc8f0', metal: ['#7a7a8a', '#727282'],
      floorTex: { floor: 'cobble', floor2: 'tiles' } },
    grid: GF, heights: GF_H,
    legend: { B: 'block', Q: 'checker', O: 'block', P: 'canopy', b: 'bench', k: 'pinball', '&': 'coraltree' },
    props: deco(GF, {
      P: (x, y) => ({ prop: 'canopy', r: 0.8 + rnd(x, y) * 0.3, h: 2.2 + rnd(x, y, 1) * 0.6, col: '#3a8a4a', col2: '#8a6a44' }),
      '=': () => ({ prop: 'rail', col: '#d8b040' }),
      l: (x, y) => ({ prop: 'lamp', col: NEON[(x + y) % NEON.length], col2: '#2a2238' }),
      A: (x, y) => ({ prop: 'tent', col: ['#e04050', '#f0c040', '#40a0e0', '#c060e0'][(x + y) % 4] }),
      b: () => ({ prop: 'bench', col: '#7a4a2a', back: true }),
      k: (x) => ({ prop: 'pinball', col: ['#c02040', '#2040c0', '#20a040'][x % 3], col2: '#ffe060', col3: '#ff60c0' }),
      u: () => ({ prop: 'kpscope' }),
      '&': (x, y) => ({ prop: 'coraltree', col: '#3a3438', col2: '#6aff9a', h: 2.6 }),
      N: (x) => ({ prop: 'neon', col: x % 2 ? '#ff5ac8' : '#5ae0ff', col2: '#1a1020', y: 2.2 }),
    }).concat([
      { at: [5.5, 4], prop: 'kpbigtop', r: 1.75, h: 1.3, rise: 2.3 },
      { at: [25, 1.5], prop: 'kpferris', r: 2.8 },
      // the Lucky Fountain: a round basin, its water, a little gold moogle on a plinth
      { at: [21.5, 12.5], prop: 'disc', r: 1.3, h: 0.32, sides: 16, col: '#c8b8a0', top: '#5ab0e8', rim: '#e8dcc0' },
      { at: [21.5, 12.5], prop: 'statue', col: '#e8c040', col2: '#c8b8a0', scale: 0.8 },
      // the desert, far below the mesa's rim
      { at: [20, 15], prop: 'farground', y0: -14, w: 140, d: 110, col: '#9a7048' },
      // strings of bulbs: over the plaza, the Midway and the east street
      { at: [15, 9], to: [28, 9], h: 2.7, h2: 2.7, bulbs: NEON }, { at: [15, 16], to: [28, 16], h: 2.7, h2: 2.7, bulbs: NEON },
      { at: [15, 9], to: [28, 16], h: 2.8, h2: 2.8, bulbs: NEON }, { at: [28, 9], to: [15, 16], h: 2.8, h2: 2.8, bulbs: NEON },
      { at: [5, 28], to: [12, 28], h: 2.4, h2: 2.4, bulbs: NEON }, { at: [12, 28], to: [19, 28], h: 2.4, h2: 2.4, bulbs: NEON },
      { at: [19, 28], to: [26, 28], h: 2.4, h2: 2.4, bulbs: NEON }, { at: [32, 22], to: [32, 15.5], h: 2.6, h2: 2.6, bulbs: NEON },
      { at: [11, 3], to: [17, 4], h: 2.6, h2: 2.6, bulbs: NEON }, { at: [17, 4], to: [32, 4], h: 2.7, h2: 2.7, bulbs: NEON },
      // the West Gate's neon board
      { at: [2.6, 9.3], prop: 'neon', text: 'GLIMMERFAIR', col: 'rainbow', y: 2.3, size: 0.16 },
      // the signs on the facades: neon letters just in front of the walls
      { at: [34, 14.56], prop: 'neon', text: 'SHOWTIME', col: '#ffd040', y: 3.1, size: 0.28, board: false, light: true },
      { at: [34, 14.56], prop: 'neon', text: 'ARCADE', col: '#ff5ac8', y: 2.55, size: 0.13, board: false },
      { at: [17.5, 25.56], prop: 'neon', text: 'MOG CENTER', col: '#ff6aa8', y: 2.2, size: 0.13, board: false },
      { at: [4.6, 25.56], prop: 'neon', text: 'GHOST HOTEL', col: '#7aff9a', y: 2.75, size: 0.16, board: false },
      { at: [10.5, 25.56], prop: 'neon', text: 'JOCKEYS', col: '#ffe0a0', y: 1.98, size: 0.09, board: false },
      { at: [29, 25.56], prop: 'neon', text: 'WARDROBE', col: '#ffb0f0', y: 2.02, size: 0.075, board: false },
      { at: [24, 25.3], prop: 'neon', text: 'ARCADE', col: '#5ae0ff', y: 1.95, size: 0.11, col2: '#1a1030' },
      // the chocobo track's finish banner
      { at: [6.5, 13.5], prop: 'banner', col: '#f0f0f0', col2: '#202020', y: 1.9, h: 0.5, w: 1.6, text: 'FINISH', textCol: '#d02020', size: 0.1 },
    ], [-1, 1].map(k => ({ at: [CAR_AT[0] + k * ROPE_X, 21], to: [CAR_AT[0] + k * ROPE_X, 80], y0: CAR_Y0, h: ROPE_H, sag: 0, r: 0.022, col: '#232326', count: 1, far: true })),
    [{ at: [38.2, 21], prop: 'ropegantry', toward: 'e', reach: (CAR_AT[0] - 38.2) * 0.5, gap: ROPE_X, h: CAR_Y0 + ROPE_H + 0.03, lamp: '#ff60c0' }]),
    buildings: [
      { at: [31, 7, 7, 8], h: 3.6, col: '#5a1a3a', roof: '#2a0a1e', top: 'flat', win: '#ffd870', tex: 'brick' },
      { at: [1, 21, 7, 5], h: 3.6, col: '#3a3048', roof: '#1a1428', top: 'gable', ridge: 'x', rise: 2.2, win: '#80ffa0', chimney: true },
      { at: [9, 22, 4, 4], h: 2.2, col: '#8a6a4a', roof: '#3a6a3a', top: 'shed', rise: 0.9, win: '#ffe0a0', tex: 'siding' },
      { at: [15, 22, 6, 4], h: 2.6, col: '#f0e0f0', roof: '#e05a9a', top: 'hip', rise: 1.2, win: '#fff0c0' },
      { at: [22, 22, 5, 3], h: 2.0, col: '#e8c840', roof: '#d03040', top: 'shed', rise: 0.6, win: false },
      { at: [28, 22, 3, 4], h: 2.4, col: '#c080d0', roof: '#5a2a7a', top: 'hip', rise: 1.0, win: '#ffe0f0' },
    ],
    labels: [
      { at: [5.5, 8.2], text: 'BIG TOP', size: 0.22, col: 'rainbow', glow: true, y: 0.02 },
      { at: [25, 3.6], text: 'GLIMMER WHEEL', size: 0.18, col: '#ffe060', glow: true, y: 0.95 },
      { at: [6.5, 11.2], text: 'CHOCOBO TRACK', size: 0.16, col: '#ffe060', glow: true, y: 1.1 },
      { at: [35, 26.6], text: 'ROPEWAY', size: 0.2, col: '#5ae0ff', glow: true, y: 0.02 },
    ],
    lights: [[21, 12, '#ffe0a0', 5], [5, 9, '#ff9ad8', 4], [25, 5, '#ff9ad8', 5], [34, 16, '#ffd070', 4], [9, 16, '#ffe0a0', 4], [17, 27, '#ff9ad8', 4],
      [4, 26, '#7aff9a', 3], [35, 24, '#5ae0ff', 4], [2, 10, '#ffe060', 3], [35, 4, '#c8b0ff', 3]],
    entries: { from_route16: [37, 25, 'left'], from_route17: [1, 10, 'right'], from_center: [17, 26, 'down'], from_dojo: [34, 15, 'down'],
      from_stagedoor: [30, 10, 'left'], from_bigtop: [5, 8, 'down'], from_hotel: [4, 26, 'down'], from_lodge: [10, 26, 'down'], from_wardrobe: [29, 26, 'down'] },
    exits: [
      { at: [38, 25, 1, 1], to: 'kp_route16', entry: 'from_glimmerfair', sfx: 'door' },
      { at: [0, 10, 1, 2], to: 'kp_route17', entry: 'from_glimmerfair' },
      { at: [17, 25, 1, 1], to: 'kp_glimmerfair_center', entry: 'from_town', sfx: 'door' },
      { at: [34, 14, 1, 1], to: 'kp_glimmerfair_dojo', entry: 'from_town', sfx: 'door' },
      { at: [5, 7, 2, 1], to: 'kp_glimmerfair_bigtop', entry: 'from_town', sfx: 'door' },
      { at: [4, 25, 1, 1], to: 'kp_glimmerfair_hotel', entry: 'from_town', sfx: 'door' },
      { at: [10, 25, 1, 1], to: 'kp_glimmerfair_lodge', entry: 'from_town', sfx: 'door' },
      { at: [29, 25, 1, 1], to: 'kp_glimmerfair_wardrobe', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      folk({ id: 'gf_greeter', name: 'Greeter', model: STAFF_W, at: [36, 21], dir: 'left',
        lines: "Glimmerfair never closes! The lights are on a timer. The timer is broken. Nobody's fixing it." }),
      folk({ id: 'gf_ropeman', name: 'Ropeway Attendant', model: STAFF, at: [37, 23], dir: 'left',
        lines: "The ropeway runs down the cliff to Route 16, the canyon road to Candlerock. Step into the car whenever you're ready.\fDon't worry about the wind. The car only sways a LOT, never a little." }),
      folk({ id: 'gf_wheelman', name: 'Wheel Attendant', model: STAFF, at: [25, 4], dir: 'down', talk: wheelRide }),
      folk({ id: 'gf_barker', name: 'Barker', model: { base: 'man6', top: '#d02020', jacket: '#1a1a3a', bottom: '#1a1a3a', hairStyle: 'slick', extras: ['bowtie', 'mustache'] }, at: [10, 6], dir: 'down',
        lines: s => s.flag('kp_gf_play') ? "Our hundred-thousandth guest! The star of the matinee! Folks are still talking about that ending. Mostly about the dragon."
          : "Step right up, step right up! The matinee in the Big Top! Heroes, dragons, a princess and absolutely no refunds!\fTalk to the usher inside. I hear they're short one leading man." }),
      folk({ id: 'gf_jockey', name: 'Jockey', model: 'jockey', at: [13, 14], dir: 'left',
        lines: "The racers don't stop. Ever. Ten laps, a hundred laps... the gold one's been leading since Tuesday.\fWe tried giving out a trophy once. They ran around that too." }),
      folk({ id: 'gf_tourist1', name: 'Tourist', model: 'woman9', at: [19, 15], dir: 'up',
        lines: "We came up on the ropeway from Candlerock! My knees are still shaking. My husband's knees are still in Candlerock." }),
      folk({ id: 'gf_tourist2', name: 'Tourist', model: { base: 'man9', top: '#f0e060', bottom: '#5a7a9a', hairStyle: 'cap', extras: ['glasses'] }, at: [24, 15], dir: 'up',
        lines: "I've taken four hundred photos of the Glimmer Wheel. In three of them it's in focus! Vacation of a lifetime." }),
      folk({ id: 'gf_kid', name: 'Kid', model: 'kid4', at: [18, 20], dir: 'down', wander: 2,
        lines: "When I grow up I'm gonna be in Dio's show! I can already do the bow. Watch! ...Okay, I fell over. That's part of it." }),
      folk({ id: 'gf_loser', name: 'Old Gambler', model: 'oldman6', at: [27, 21], dir: 'left',
        lines: "Mog Mash. One more go. Just one more... I've been saying that since spring.\fYou know the town motto? 'The house always wins.' Dio had it painted over the arcade. He's very proud of it." }),
      folk({ id: 'gf_assistant', name: "Dio's Assistant", model: { base: 'woman7', top: '#2a2a3a', jacket: '#2a2a3a', bottom: '#2a2a3a', hair: '#1a1a1a', hairStyle: 'bob', extras: ['suit', 'glasses'] }, at: [33, 16], dir: 'up',
        lines: s => s.flag('kp_badge_8') ? "You beat the boss! He's been humming about it all day. Off-key. Very happily off-key."
          : "Mr. Dio runs everything in Glimmerfair: the wheel, the track, the hotel, the Big Top, and his own dojo, the Showtime Arcade.\fHe was champion of the 3rd Kupo League, you know. He mentions it. Often. Mostly in songs.\fThe Arcade's a theatre. Read the posters inside: the stage rewards those who follow the script." }),
      folk({ id: 'gf_gateguard', name: 'Gate Guard', model: { base: 'man7', top: '#d02020', bottom: '#1a1a3a', hairStyle: 'cap', extras: ['bowtie'] }, at: [3, 9], dir: 'down',
        lines: s => s.flag('kp_badge_8') ? "Eight badges! The West Gate's trail goes down the mesa to Route 13, right below the Badge Gate. The League's waiting, champ!"
          : "The West Gate! Route 17 winds down the side of the mesa to Route 13. That's the Badge Gate road, north of Ravenmoor.\fFolks with eight badges usually take it. The rest go home on the ropeway, crying." }),
      folk({ id: 'gf_stargazer', name: 'Stargazer', model: 'woman12', at: [35, 5], dir: 'up',
        lines: "On a clear night you can see the Coliseum's lights from here, way up past the Summit Road. Tonight it's cloudy. Every night it's cloudy. I'm very patient." }),
      W.moogle('gf_mog1', 'partypom_partygoer', [20, 10], { wander: 2, line: 'Partypom: Kupo-party! It is wearing a tiny hat and refuses to explain where it got it.' }),
      W.moogle('gf_mog2', 'juggler_juggler', [25, 17], { wander: 2, line: 'Juggler: Kupo! It juggles three Kupo Nuts... then eats one. Two-nut juggling is harder.' }),
      W.moogle('gf_mog3', 'mopluff_bard', [12, 26], { wander: 3, line: 'Mopluff: La-la-kupo! It sings the Midway jingle. It knows every word. There are four words.' }),
      W.moogle('gf_mog4', 'chocomog_rider', [14, 17], { wander: 1, line: "Chocomog: Kweh-po! It is cheering for the gold chocobo. Loudly." }),
    ],
    objects: [CAR, racer(0, 'chocobo_gold'), racer(1, 'chocobo'), racer(2, 'chocobo_black')],
    items: [W.item('gf_lookout', [33, 3], 'gamblers_coin')],
    triggers: [
      W.sign([1, 9], 'GLIMMERFAIR - WEST GATE\fRoute 17, the Glimmer Descent: down the mesa to Route 13 and the Badge Gate.'),
      W.hidden('gf_tent', [1, 4], 'royal_nut', 2),
      { at: [21, 12, 2, 2], on: 'talk', run: function* (s) {
        const d = KP.data(); if (d.money < 10) { yield s.msg('The Lucky Fountain. You\'d toss a coin in, if you had one.'); return; }
        d.money -= 10; s.sfx('ching'); yield s.msg(LUCKY[Math.floor(Math.random() * LUCKY.length)]); } },
      { at: [23, 23, 3, 1], on: 'talk', run: mogMash },
      examine([36, 3], "A coin telescope. You peek without paying. Westward, past the red canyons, a long trail winds down to the mountains.\fFar to the north-west, tiny banners flutter on a stone wall: the Badge Gate."),
      examine([31, 10], "A plain door in the theatre's side: STAGE DOOR - PERFORMERS ONLY.\fIt only opens from the inside."),
      examine([12, 13], "The track's rail. A scoreboard hangs over the finish line. According to the scoreboard, the gold chocobo has won 11,402 races in a row. Nobody has the heart to stop it."),
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_route16') yield* carArrive(s);
      if (!s.flag('kp_gf_welcome')) yield* welcome(s);
    },
  });

  center('kp_glimmerfair_center', { name: 'Glimmerfair Mog Center', town: 'kp_glimmerfair', back: 'from_center', decor: 'tent',
    hello: 'Welcome to the Mart, kupo! Carnival prices! ...Which are the same as normal prices. But with bunting.',
    npcs: [folk({ id: 'gfc_ace', name: 'Ace Trainer', model: 'man14', at: [7, 4], dir: 'down',
      lines: "Dio's moogles are all Bards: songs that sap your Attack, dances that rattle your Defense, and big noisy hits when he's got you weakened.\fBring Monks or Machinists to hit them hard, and keep your healers ready. And don't let the ace sing for long." })] });

  // ------------------------------------------------------------------ the Big Top (Event Square): the matinee
  // The player is the 100,000th guest and plays the hero in THE KNIGHT OF THE KUPO NUT: two choices change the scene,
  // and Dio, watching from the back, invites the new star to his Showtime Arcade. Reward: a Dream Harp (once).
  const BT = [
    "     ############     ",
    "   ###__________###   ",
    "  ##______________##  ",
    " ##________________## ",
    " #__________________# ",
    "#...^^..........^^...#",
    "#....................#",
    "#...ppppp....pppppp..#",
    "#....................#",
    "#.ppppppp....pp..pppp#",
    "#....................#",
    " #.pppppp....pppppp.# ",
    " #..................# ",
    "  #................#  ",
    "   #######++#######   ",
  ];
  const BT_H = ["2222222222222222222222", "2222222222222222222222", "2222222222222222222222", "2222222222222222222222", "2222222222222222222222",
    "0000110000000000110000"].concat(Array(9).fill("0000000000000000000000"));
  const showDone = s => s.flag('kp_gf_play');
  const matinee = function* (s) {
    if (showDone(s)) { yield s.say('Usher', "That's all for today's matinee! The cast is resting their voices. And the dragon costume. Mostly the costume."); return; }
    yield s.say('Usher', "Welcome to the Big Top! The matinee's about to begin, so... hold on. Let me count.\f...ninety-nine thousand, nine hundred and ninety-nine... and YOU! You're our 100,000th guest!");
    s.sfx('ching');
    yield s.say('Usher', "And our 100,000th guest gets to STAR in today's show! Our leading man has stage fright. A big case. He's hiding in a trunk.");
    const c0 = yield s.ask('Usher', 'So how about it? Will you be our hero?', ['Sure!', "I'd rather not"]);
    if (c0 !== 0) yield s.say('Usher', "Ha ha! Nobody says no to the spotlight! Places, please!");
    yield s.fadeOut(30);
    s.music('debut');
    s.place('player', 9, 3, 'down');
    s.place('gfb_narrator', 3, 4, 'right');
    yield s.cam(10, 4, 1, { dist: 8.5, pitch: 40 });
    yield s.fadeIn(30);
    yield s.say('Narrator', "Ladies and gentlemen! Moogles of all ages! Glimmerfair proudly presents... THE KNIGHT OF THE KUPO NUT!");
    yield s.say('Narrator', "Long ago, in the Kingdom of Kupo, the wicked Dragon King stole away the fair Princess Pompadour... and the Royal Kupo Nut!");
    s.emote('gfb_dragon', '!!'); s.shake(3, 20);
    yield s.say('Dragon King', "ROOOAR! The nut is MINE! The princess is MINE! Everything shiny is MINE!");
    yield s.say('Princess Pompadour', "Kupooo! Kupo kupoooo!\f(That means \"Save me, somebody! Preferably somebody tall!\")");
    yield s.say('Narrator', `But lo! A hero arrives! The brave Sir ${s.name('cloud')}!`);
    s.sfx('ching');
    yield s.face('player', 'gfb_wizard');
    yield s.say('Wizard', `Sir ${s.name('cloud')}! I am Mogwin the Wise. Take this, the legendary Blade of Kupo!`);
    yield s.msg('The Wizard hands over the legendary blade. It is made of cardboard. It bends.');
    yield s.face('player', 'gfb_dragon');
    const c1 = yield s.ask('Wizard', 'The Dragon King stands before you! What will you do, hero?', ['Fight the Dragon King!', 'Challenge him to a moogle battle', 'Offer him a Kupo Nut']);
    if (c1 === 0) {
      yield s.move('player', 13, 3);
      s.sfx('hit'); s.shake(4, 18);
      yield s.msg('BONK! The cardboard blade bounces off the Dragon King\'s nose.');
      yield s.say('Dragon King', "...Ow? I mean... ARGH! I am SLAIN!");
      yield s.jump('gfb_dragon', 16, 2, 0.4, 24);
      yield s.say('Narrator', "The Dragon King collapses! It is a very convincing collapse. The stagehands have been practising.");
    } else if (c1 === 1) {
      yield s.say('Princess Pompadour', 'Kupo!!');
      yield s.move('gfb_princess', 13, 3);
      s.sfx('cast'); s.flash('#ffd0ff', 12);
      yield s.msg('The Princess hops out of the cage and lets loose a Sonic Chord right at the Dragon King. The crowd goes wild!');
      yield s.say('Dragon King', "Not the high notes! ANYTHING but the high notes!");
      yield s.say('Narrator', "The Dragon King flees the stage! ...He'll be back for the bow. He always comes back for the bow.");
    } else {
      yield s.move('player', 13, 3);
      yield s.msg('You hold out a Kupo Nut. The Dragon King sniffs it suspiciously.');
      yield s.say('Dragon King', "...Is that slow-roasted? ...FINE. Fine! Take the princess. I'm having a snack.");
      s.emote('gfb_dragon', '♪');
      yield s.say('Narrator', "And so the Dragon King was defeated... by snacks. The oldest weapon of all.");
    }
    yield s.face('player', 'gfb_princess');
    const c2 = yield s.ask('Princess Pompadour', 'Kupo kupo? (My hero! How shall I ever thank you?)', ['Take a bow', 'A kiss for the hero!', 'Thank the Dragon King']);
    if (c2 === 0) { yield s.face('player', 'down'); s.anim('player', 'nod'); yield s.msg('You take a deep bow. The audience roars! Somebody throws a flower. Somebody else throws a Kupo Nut.'); s.stopAnim('player'); }
    else if (c2 === 1) { s.emote('gfb_princess', '!!'); yield s.msg('The Princess turns bright pink, squeaks "KUPO!", and hides behind the Wizard. The audience goes "Ooooh!"'); }
    else { s.emote('gfb_dragon', '...'); yield s.say('Dragon King', "...Nobody ever thanks the dragon. *sniff* This is the best show EVER."); }
    yield s.say('Narrator', 'And peace returned to the Kingdom of Kupo! THE END!');
    s.sfx('ching'); s.flash('#ffffff', 8);
    // Dio, at the back of the tent all along
    s.spawn('gfb_dio', 'dio', 10, 13, 'up', { name: 'Dio' });
    yield s.cam(10, 9, 50, { dist: 11, pitch: 46 });
    s.emote('gfb_dio', '!!');
    yield s.say('Dio', "BRAVO! BRAVO!! ENCORE! ENCORE!!");
    yield s.move('gfb_dio', [[10, 8], [10, 6]], { run: true });
    yield s.face('player', 'gfb_dio');
    s.anim('gfb_dio', 'victory');
    yield s.say('Dio', "What presence! What timing! What a cardboard sword!\fI'm Dio, my friend. I own this whole carnival: the wheel, the track, the tent you're standing in. And you are a NATURAL.");
    s.stopAnim('gfb_dio');
    yield s.say('Dio', "A moogle trainer, aren't you? Then come and see me at the Showtime Arcade. My stage, my moogles, my rules. Bring that star quality!\fAnd the house always wins. Ha ha HAAA!");
    yield s.move('gfb_dio', [[10, 12], [10, 13]], { run: true });
    s.remove('gfb_dio');
    s.set('kp_gf_play');
    KP.give('dream_harp', 1); s.sfx('found');
    yield s.say('Usher', "What a show! Here: the star's fee. A Dream Harp. A moogle holding it makes its songs ring out harder.");
    yield s.msg(KP.got('dream_harp', 1));
    yield s.fadeOut(30);
    s.music('goldsaucer');
    s.place('player', 10, 12, 'down'); s.place('gfb_dragon', 15, 2, 'left'); s.place('gfb_princess', 12, 2, 'down'); s.place('gfb_narrator', 3, 4, 'right');
    s.camFollow(1);
    yield s.fadeIn(30);
  };
  FF7.defineMap('kp_glimmerfair_bigtop', {
    name: 'Big Top', area: 'Glimmerfair', theme: 'goldsaucer', music: 'goldsaucer',
    look: { wall: '#b02838', wallTop: '#f4ece0', trim: '#e0c040', floor: ['#c8a070', '#c09868'], floor3: ['#8a5a3a', '#82543a'], ambient: [0.58, 0.48, 0.5], light: [0.95, 0.82, 0.78],
      floorTex: { floor: 'dirt', floor3: 'planks' }, wallH: 2.8, wallTex: false },
    grid: BT, heights: BT_H,
    props: [
      { at: [10.5, 1.1], prop: 'kpcurtain', w: 10, h: 2.2, col: '#7a1a6a' },
      { at: [6.5, 1.4], prop: 'tower', h: 1.4, col: '#b0a8c8' }, { at: [14.5, 1.4], prop: 'tower', h: 1.4, col: '#b0a8c8' },
      { at: [10.5, 1.35], prop: 'banner', col: '#e0c040', col2: '#a02030', y: 2.55, h: 0.5, w: 4, text: 'THE KNIGHT OF THE KUPO NUT', textCol: '#a02030', size: 0.09 },   // (in front of the curtain: behind it, at 0.9, only its edge showed)
      { at: [1, 3], to: [20, 3], h: 2.5, h2: 2.5, bulbs: NEON }, { at: [1, 7], to: [20, 7], h: 2.4, h2: 2.4, bulbs: NEON },
      { at: [10.5, 0.5], to: [10.5, 13], h: 2.7, h2: 2.4, bulbs: NEON },
      { at: [3, 7], prop: 'pew', col: '#7a4a2a' }, { at: [15, 9], prop: 'pew', col: '#7a4a2a' }, { at: [16, 9], prop: 'pew', col: '#7a4a2a' },
    ],
    labels: [{ at: [10.5, 4.3], text: 'TODAY: THE KNIGHT OF THE KUPO NUT', size: 0.12, col: '#ffe060', glow: true, y: 0.02 }],
    lights: [[10, 3, '#ffe0c0', 6], [10, 9, '#ffb0d0', 5]],
    entries: { from_town: [10, 13, 'up'] },
    exits: [{ at: [10, 14, 2, 1], to: 'kp_glimmerfair', entry: 'from_bigtop', sfx: 'door' }],
    npcs: [
      folk({ id: 'gfb_usher', name: 'Usher', model: STAFF, at: [12, 12], dir: 'left', talk: matinee }),
      { id: 'gfb_narrator', name: 'Narrator', model: { base: 'man8', top: '#2a2a3a', jacket: '#2a2a3a', bottom: '#2a2a3a', hairStyle: 'slick', extras: ['suit', 'bowtie'] }, at: [3, 4], dir: 'right',
        talk: function* (s) { yield s.say('Narrator', showDone(s) ? "Our hero! Same time tomorrow? We'll need a new cardboard sword. You bent the last one." : "Ahem. Mi-mi-mi-miii. Ladies and gentlemen... no. LADIES and gentlemen... Hmm."); } },
      { id: 'gfb_princess', name: 'Princess Pompadour', model: { enemy: 'kp_kupera_diva', scale: 0.85 }, at: [12, 2], dir: 'down',
        talk: function* (s) { yield s.msg('Princess Pompadour (played by a Kupera): Kupo! It practises a dramatic swoon. It swoons slightly too far.'); } },
      { id: 'gfb_dragon', name: 'Dragon King', model: { base: 'man', build: 'big', skin: '#5aa84a', top: '#3a8a3a', sleeve: '#3a8a3a', jacket: '#2a6a2a', bottom: '#3a8a3a', hair: '#2a5a2a', hairStyle: 'spiky', extras: ['cape', 'pauldronL', 'pauldronR'] }, at: [15, 2], dir: 'left',
        talk: function* (s) { yield s.say('Dragon King', "We're two stagehands in a costume. Please don't tell the children. ...Or the dragon. He's very sensitive."); } },
      { id: 'gfb_wizard', name: 'Wizard', model: { base: 'oldman3', top: '#4a3a9a', bottom: '#4a3a9a', hair: '#e8e8e8', extras: ['robe', 'beard'] }, at: [7, 3], dir: 'right',
        talk: function* (s) { yield s.say('Wizard', "Mogwin the Wise, at your service. Forty years on the stage. Thirty-nine of them as this wizard. It's a living!"); } },
      folk({ id: 'gfb_kid', name: 'Kid', model: 'kid7', at: [3, 7], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        lines: "Is the dragon real? My brother says it's two guys. My brother's a liar. I hope." }),
      folk({ id: 'gfb_couple1', name: 'Tourist', model: 'woman3', at: [15, 9], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        lines: "We've seen this show eleven times. Every time the hero does something different. Last week he just sat down and ate a sandwich." }),
      folk({ id: 'gfb_couple2', name: 'Tourist', model: 'man5', at: [16, 9], dir: 'up', anim: 'sit', hover: 0.14, faceOnTalk: false,
        lines: "My favourite part is the Dragon King. He's got real range." }),
    ],
  });

  // ------------------------------------------------------------------ the Ghost Hotel, the Jockeys' Lodge, the Wardrobe
  const BORIS = W.trainer({ id: 'gf_boris', cls: 'Bellhop', name: 'Boris', model: { base: 'man3', top: '#7a1a2a', bottom: '#2a1a1a', hairStyle: 'cap', skin: '#d8e0d8', extras: ['bowtie'] },
    at: [12, 3], dir: 'left', sight: [8, 3, 4, 1],
    line: "Good evening! Can I take your bags? Your coat? Your moogles? ...Just the moogles, then. In battle!",
    lose: "I'll... I'll take that as a no to the bags.", after: "The Arcade's master is a Bard man through and through. He says a good song is half a win. The other half is a better song.",
    team: [['prestopom_illusionist', 28], ['mysimog_mindu', 28], ['momatose_dreamwalker', 28]], money: 1300 });
  W.house('kp_glimmerfair_hotel', { name: 'Ghost Hotel', area: 'Glimmerfair', town: 'kp_glimmerfair', back: 'from_hotel', decor: 'gothic', music: 'lurking',
    grid: [
      "################",
      "#k...........qk#",
      "#....DDDDD.....#",
      "#..............#",
      "#.c.t.c...c.t.c#",
      "#..............#",
      "#m............m#",
      "#######+########",
    ],
    door: [7, 7],
    look: { wall: '#3a2a46', trim: '#1a1220', floor: ['#3a1a34', '#361830'], carpet: ['#3a1a34', '#361830'], ambient: [0.34, 0.4, 0.42], light: [0.58, 0.76, 0.7] },
    props: [{ at: [5, 2.1], prop: 'lantern', col: '#7aff9a', hang: 1.0, pole: false }, { at: [9, 2.1], prop: 'lantern', col: '#7aff9a', hang: 1.0, pole: false },
      { at: [1.5, 3], prop: 'lantern', col: '#9a7aff', hang: 1.6, pole: false }, { at: [13.5, 3], prop: 'lantern', col: '#9a7aff', hang: 1.6, pole: false }],
    extra: { lights: [[7, 2, '#7aff9a', 4], [7, 5, '#9a7aff', 3]] },
    npcs: [
      folk({ id: 'gfh_clerk', name: 'Receptionist', model: 'ghost', at: [7, 1], dir: 'down',
        lines: s => s.flag('kp_badge_8') ? "Ooooh... the guest who beat the owner... Room 13 is yours whenever you like. Nobody's checked out of it in forty years. Ooooh."
          : "Welcome to the Ghost Hotel... We are fully booked... by ghosts... Mostly ghosts... One accountant.\fThe owner bought the hotel because it was haunted and cheap. Then he started selling tickets to the haunting. Ooooh. Clever man." }),
      BORIS.npc,
      folk({ id: 'gfh_guest', name: 'Guest', model: 'oldwoman3', at: [3, 5], dir: 'up',
        lines: "Room 9 has a ghost that tidies up. Room 10 has a ghost that makes a mess. They've been arguing for sixty years. I find it very relaxing." }),
      W.moogle('gfh_mog', 'ghostmog_phantom', [11, 5], { wander: 2, line: 'Ghostmog: Kuuuu... It floats over to the key rack and hangs up a key that was already hung up.' }),
    ],
    triggers: [BORIS.trig,
      W.hidden('gfh_urn', [14, 6], 'max_oil', 2),
      examine([13, 1], 'A cabinet of room keys. Every hook is labelled 13. Every single one.')],
  });
  W.house('kp_glimmerfair_lodge', { name: "Jockeys' Lodge", area: 'Glimmerfair', town: 'kp_glimmerfair', back: 'from_lodge', decor: 'rustic',
    npcs: [
      folk({ id: 'gfl_gus', name: 'Old Jockey', model: 'chocobo_sage', at: [3, 2], dir: 'down',
        lines: "Fifty years I rode on that track. These days I just watch the young ones go round. And round. And round.\fDio raced too, you know, before the Kupo League. Fell off at every turn. Waved to the crowd every time. They loved him." }),
      folk({ id: 'gfl_pippa', name: 'Jockey Pippa', model: { base: 'jockey', top: '#40a0e0' }, at: [8, 3], dir: 'left', talk: function* (s) {
        if (s.flag('kp_gf_pippa')) { yield s.say('Jockey Pippa', "I'm riding the black one tomorrow! It bites, but only people it likes."); return; }
        yield s.say('Jockey Pippa', "My first big race is tomorrow and my hands won't stop shaking. What if I fall off in front of everyone?");
        const c = yield s.ask('Jockey Pippa', '...Any advice?', ["You'll do great!", 'Just wave if you fall']);
        yield s.say('Jockey Pippa', c === 0 ? "You think so? ...Yeah. Yeah! I'll do great!" : "Ha! Like Dio used to? ...Okay, that actually helps. A lot.");
        s.set('kp_gf_pippa'); KP.give('choco_feather', 1); s.sfx('found');
        yield s.say('Jockey Pippa', "Here, take my lucky feather. A moogle holding it runs a little quicker. I won't need it. I've got YOUR advice now!");
        yield s.msg(KP.got('choco_feather', 1));
      } }),
    ] });
  W.house('kp_glimmerfair_wardrobe', { name: 'Wardrobe', area: 'Glimmerfair', town: 'kp_glimmerfair', back: 'from_wardrobe', decor: 'cosy',
    grid: [
      "############",
      "#u.u.D..q.u#",
      "#..........#",
      "#.t........#",
      "#.........j#",
      "#####+######",
    ],
    look: { wall: '#c8a8c8' },
    props: [{ at: [1, 1], prop: 'statue', col: '#e0b040', col2: '#5a2a7a' }, { at: [3, 1], prop: 'statue', col: '#c03050', col2: '#5a2a7a' },
      { at: [10, 1], prop: 'statue', col: '#4060c0', col2: '#5a2a7a' }, { at: [6.5, 0.6], to: [10.5, 0.6], h: 2.0, h2: 2.0, bulbs: ['#ffd0f0', '#ffffff'] }],
    npcs: [folk({ id: 'gfw_sequin', name: 'Madame Sequin', model: { base: 'woman4', top: '#c060d0', bottom: '#5a2a7a', hair: '#f0f0f0', hairStyle: 'bun', skirt: 'long', extras: ['glasses'] }, at: [6, 2], dir: 'down', talk: function* (s) {
      yield s.say('Madame Sequin', "Every cape in Glimmerfair is mine, darling. Dio has three hundred of them. He wears one at a time. He has very strong opinions about which.");
      if (s.flag('kp_gf_slippers')) { yield s.say('Madame Sequin', "Do keep those slippers dancing, darling."); return; }
      s.set('kp_gf_slippers'); KP.give('dance_slippers', 1); s.sfx('found');
      yield s.say('Madame Sequin', "A trainer, hm? Then take these. Dance Slippers, from the chorus line. A moogle that holds them dances twice as... well, twenty percent better.");
      yield s.msg(KP.got('dance_slippers', 1));
    } })],
    triggers: [examine([1, 1], "A mannequin in a golden cape with a collar taller than your head. A tag on it says: DIO - FINALE - DO NOT TOUCH. AND I MEAN IT.")] });

  // ================================================================== Dojo 8: the Showtime Arcade (Dio, Bard)
  // A theatre. FLOOR 1, the Lobby and the Orchestra: past the lobby and the stalls, stairs go down into the orchestra
  // pit, where a giant keyboard lies across the floor in front of the stage: seven white keys, each a one-tile alcove
  // off the walkway (C D E F G A B, x 5..17 step 2, rows 4-6), black keys between. Stepping into a key plays its note.
  // The poster in the lobby and the neon over the stage: tonight's encore, THE BADGE SONG, B - A - D - G - E. Play the
  // notes in that order and the side curtain (stage right, x 19-20 row 3) rises to the stairs up; a wrong note is a
  // sour one and starts the song over (if it's a B, that B counts as the first note again).
  // SOLUTION (floor 1): step into B (17,6), A (15,6), D (7,6), G (13,6), E (9,6). Flags kp_sa_n1..n4, kp_sa_song.
  // FLOOR 2, the Main Stage: three rows of scenery flats (Act I, II, III) cross the stage, each with a gap of two
  // trapdoors: red (x4-5, row 14), gold (x18-19, row 9), blue (x11-12, row 4). A trapdoor is shut while a spotlight of its
  // colour is on, but the fuse takes only two spotlights: switch on a third and it blows, and every trapdoor drops. The
  // spotlights: RED and GOLD in the wings (8,16), (10,16); RED and BLUE on the landing between Acts II and III (15,6),
  // (17,6) (the two red ones work the same lamp). The cue sheet in the wings says it all. The rig is reset every time the
  // party comes up the stairs. Behind Act III: Dio, and the stage door out to the street.
  // SOLUTION (floor 2): red on, gold on (wings); through the red traps, the gold traps; on the landing: red off, blue on;
  //   through the blue traps to Dio. Leave by the stage door (or the way back: blue off, red on).
  const SONG = ['B', 'A', 'D', 'G', 'E'], KEYX = { C: 5, D: 7, E: 9, F: 11, G: 13, A: 15, B: 17 };
  const songAt = () => { let k = 0; while (k < 5 && FF7.state.flags['kp_sa_n' + (k + 1)]) k++; return k; };
  const keyLit = (n) => () => { const f = FF7.state.flags; if (f.kp_sa_song) return true; const k = songAt(); for (let i = 0; i < k; i++) if (SONG[i] === n) return true; return false; };
  const noteKey = (n) => ({ id: 'sa_key_' + n, at: [KEYX[n], 4, 1, 3], once: false, run: function* (s) {
    s.sfx('CEG'.includes(n) ? 'piano1' : 'piano5');
    if (s.flag('kp_sa_song')) { yield s.say(null, `${n}! The key chimes, bright and clear.`, { auto: 40 }); return; }
    const k = songAt();
    if (SONG[k] === n) {
      s.set('kp_sa_n' + (k + 1));
      if (k + 1 < 5) { yield s.say(null, `${n}! The key lights up. (${SONG.slice(0, k + 1).join(' - ')})`, { auto: 50 }); return; }
      // the song: the curtain rises
      s.set('kp_sa_song'); s.sfx('piano_chord3'); s.flash('#ffe8a0', 16);
      yield s.msg('B - A - D - G - E! The whole keyboard lights up gold, and a fanfare blares from the speakers!');
      yield s.cam(19.5, 3, 50);
      s.sfx('gate');
      yield 30;
      yield s.say('Dio', "(over the speakers) BRAVO! That's my song! Come on up, superstar, the stage is waiting! Mind the trapdoors. Ha ha HAAA!");
      s.camFollow(40);
      yield 30;
      return;
    }
    for (let i = 1; i <= 5; i++) s.unset('kp_sa_n' + i);
    s.sfx('error');
    if (n === SONG[0]) { s.set('kp_sa_n1'); yield s.msg(`BWOMMP! A sour note... the keys go dark. Then the ${n} lights up again: the song starts over from it.`); return; }
    yield s.msg(`BWOMMP! ${n} is a sour note. The keyboard's lights go out. Start the song again from the top.`);
  } });
  const SA1 = [
    "###################+####",
    "##BBBBBBBBBBBBBBBB#..###",
    "##BBBBBBBBBBBBBBBB#..###",
    "##BBBBBBBBBBBBBBBB#..###",
    "##BBBWxWxWxWxWxWxW#..###",
    "##BBBWxWxWxWxWxWxW#..###",
    "##BBBWxWxWxWxWxWxW#..###",
    "##...................###",
    "##=========^^=========##",
    "##....................##",
    "##pppppppp....pppppppp##",
    "##....................##",
    "##pppppppp....pppppppp##",
    "##....................##",
    "##..m.|..........|..m.##",
    "##.DDD................##",
    "##....................##",
    "##....................##",
    "##....................##",
    "###########+############",
  ];
  const SA1_H = Array(8).fill("000000000000000000000000").concat(["222222222221122222222222"], Array(11).fill("222222222222222222222222"));
  const SA1T = [
    W.trainer({ id: 'sa_tumble', cls: 'Juggler', name: 'Tumble', model: { base: 'man2', top: '#e0c040', sleeve: '#d02040', bottom: '#d02040', hairStyle: 'spiky', hair: '#e06020', extras: ['bowtie'] },
      at: [12, 12], dir: 'down', sight: [10, 13, 4, 2], noBag: true, bg: 'dojo',
      line: "Welcome to the show! I keep five things in the air at once. Let's see how many you can keep on the ground!",
      lose: 'Dropped everything. Again.', after: "The poster by the box office has tonight's encore. The master's very proud of that song. It has five notes.",
      team: [['plushmog_slot_royale', 28], ['partypom_party_host', 28], ['kennymog_diner_mascot', 29]], money: 1400 }),
    W.trainer({ id: 'sa_rigby', cls: 'Stagehand', name: 'Rigby', model: { base: 'worker3', top: '#2a2a2a', bottom: '#2a2a2a', hairStyle: 'cap', extras: ['gloves'] },
      at: [3, 7], dir: 'right', sight: [4, 7, 6, 1], noBag: true, bg: 'dojo',
      line: "Oi! No guests in the pit! ...You're a challenger? Then you're a guest with an attitude. Let's go!",
      lose: "Fine, fine. Go and play your little song.", after: "Every key's wired to the curtain. Hit the wrong one and the whole board resets. I wired it myself. I'm very proud of it.",
      team: [['kutan_noise_blaster', 28], ['mogmk_mk1', 29], ['stitchpom_couturier', 28], ['vectomog_tek_fortress', 29]], money: 1450 }),
  ];
  FF7.defineMap('kp_glimmerfair_dojo', {
    name: 'Showtime Arcade', area: 'Glimmerfair', theme: 'goldsaucer', music: 'caitsith', kpBg: 'dojo',
    look: { wall: '#4a1a3a', trim: '#e0c040', floor: ['#6a2a3a', '#622636'], floor3: ['#f2ece0', '#ebe4d6'], floor2: ['#3a2a28', '#342624'], wallH: 3.0, ambient: [0.5, 0.42, 0.5], light: [0.9, 0.8, 0.86],
      floorTex: { floor: 'carpet', floor3: false } },
    grid: SA1, heights: SA1_H,
    legend: { B: 'block', W: 'floor3', x: 'block', p: 'pew' },
    props: deco(SA1, {
      x: (x, y) => (x === 10 || y === 6) ? { prop: 'kpkeygap' } : { prop: 'kpblackkey' },
      p: () => ({ prop: 'pew', col: '#8a2a3a' }),
      '=': () => ({ prop: 'rail', col: '#e0c040' }),
      m: () => ({ prop: 'urn', col: '#e0c040', col2: '#8a2a3a' }),
      '|': () => ({ prop: 'pillar', col: '#e8d8c0', col2: '#e0c040' }),
    }).concat([
      { at: [9.5, 3.3], prop: 'kpcurtain', w: 16, h: 2.6, col: '#a01828' },
      { at: [9.5, 3.5], prop: 'neon', text: 'B - A - D - G - E', col: '#ffd040', y: 2.78, size: 0.18, board: false },
      { at: [18.6, 16], prop: 'banner', col: '#1a1020', col2: '#e0c040', y: 2.85, h: 1.1, w: 2.4, text: 'THE BADGE SONG', text2: 'B-A-D-G-E', textCol: '#ffd040', size: 0.12 },   // (these three hung facing the camera: on the side walls they were off the screen)
      { at: [20.5, 11], prop: 'banner', col: '#a01828', col2: '#e0c040', y: 2.85, h: 1.1, w: 1.4, text: 'DIO', textCol: '#ffe060', size: 0.2 },
      { at: [2.5, 11], prop: 'banner', col: '#a01828', col2: '#e0c040', y: 2.85, h: 1.1, w: 1.4, text: 'ENCORE', textCol: '#ffe060', size: 0.12 },
    ]),
    labels: [
      ...Object.keys(KEYX).map(n => ({ at: [KEYX[n], 6.2], text: n, size: 0.2, col: '#3a2a1a', y: 0.02 })),
      { at: [4, 15], face: 's', text: 'BOX OFFICE', size: 0.1, col: '#ffe060', y: 1.4, glow: true },
    ],
    lights: [[11, 5, '#ffe0a0', 5], [11, 15, '#ffd0c0', 5], [19, 3, '#ffb0c0', 3]],
    entries: { from_town: [11, 18, 'up'], from_up: [19, 1, 'down'] },
    exits: [
      { at: [11, 19, 1, 1], to: 'kp_glimmerfair', entry: 'from_dojo', sfx: 'door' },
      { at: [19, 0, 1, 1], to: 'kp_glimmerfair_dojo_2', entry: 'from_down', sfx: 'door' },
    ],
    npcs: SA1T.map(t => t.npc).concat([
      folk({ id: 'sa_guide', name: 'Dojo Guide', model: 'man8', at: [14, 17], dir: 'left',
        lines: "Psst! Future champ! The master's stage is up behind the side curtain, and the curtain only goes up for a song.\fWhich song? Read the posters! The giant keyboard's down in the pit: step on a key and it plays. Get a note wrong and you start over.\fUpstairs it's all spotlights and trapdoors. Read the cue sheet before you touch anything. Trust me." }),
      folk({ id: 'sa_clerk', name: 'Box Office', model: STAFF_W, at: [3, 14], dir: 'down',
        lines: "Tickets? For a challenger? Oh, no charge! The master says a good challenger IS the show." }),
    ]),
    objects: [
      W.barrier('sa_curtain_a', [19, 3], () => !!FF7.state.flags.kp_sa_song, { prop: 'kpcurtain', w: 1, h: 2.6, col: '#a01828' }),
      W.barrier('sa_curtain_b', [20, 3], () => !!FF7.state.flags.kp_sa_song, { prop: 'kpcurtain', w: 1, h: 2.6, col: '#a01828' }),
      ...Object.keys(KEYX).map(n => ({ id: 'sa_glow_' + n, at: [KEYX[n], 5], prop: 'kppool', col: '#ffd040', size: 0.8, solid: false, hidden: true,
        tick(o) { o.hidden = !keyLit(n)(); } })),
    ],
    items: [W.item('sa_lobby', [21, 18], 'max_oil', 2)],
    triggers: SA1T.map(t => t.trig).concat(Object.keys(KEYX).map(noteKey), [
      { at: [1, 16], on: 'talk', run: function* (s) { yield s.msg("A poster: TONIGHT'S ENCORE - THE BADGE SONG!\nComposed by DIO. Sung by DIO. Applauded by everyone.\fBelow, five big notes on a stave: B - A - D - G - E."); } },
      examine([3, 15], 'The box office counter. A sign: "CHALLENGERS FREE. CRITICS DOUBLE."'),
    ]),
  });
  // FLOOR 2: the spotlights and the trapdoors
  const SPOTS = ['red', 'gold', 'blue'], SPOT_COL = { red: '#ff4a4a', gold: '#ffc83a', blue: '#4a8aff' };
  const lit = () => SPOTS.filter(c => FF7.state.flags['kp_sa_' + c]);
  const shut = (col) => () => !!FF7.state.flags['kp_sa_' + col] && lit().length <= 2;
  const spotMsg = (col) => () => {
    const on = !!FF7.state.flags['kp_sa_' + col], n = lit().length;
    if (on && n >= 3) return `CLUNK. The ${col} spotlight blazes on... and the fuse box goes BANG! Sparks rain down, and every trapdoor on the stage drops open.\f(Three spotlights are one too many for the fuse.)`;
    if (on) return `CLUNK. The ${col} spotlight blazes on. Out on the stage, the ${col} trapdoors swing shut.`;
    if (n === 2) return `CLICK. The ${col} spotlight goes dark. The fuse box hums back to life, and the lit trapdoors swing shut again.`;
    return `CLICK. The ${col} spotlight goes dark. The ${col} trapdoors drop open.`;
  };
  const spot = (id, at, col) => {
    const t = W.toggle(id, at, 'kp_sa_' + col, { model: { prop: 'kpspot', col: SPOT_COL[col] }, sfx: 'set', msg: spotMsg(col) });
    const base = t.talk;
    t.talk = function* (s) { yield* base(s); if (lit().length >= 3) s.shake(4, 16); };
    return t;
  };
  // a pool of light in front of a spotlight while it's on
  const pool = (id, at, col) => ({ id, at, prop: 'kppool', col: SPOT_COL[col], size: 0.85, solid: false, hidden: true, tick(o) { o.hidden = !FF7.state.flags['kp_sa_' + col]; } });
  const trap = (id, at, col) => W.barrier(id, at, shut(col), { prop: 'kptrap', col: SPOT_COL[col] });
  const SA2 = [
    "####################+###",
    "##....................##",
    "##....................##",
    "##....................##",
    "##hhhhhhhhh..hhhhhhhhh##",
    "##....................##",
    "##....................##",
    "##....................##",
    "##....................##",
    "##hhhhhhhhhhhhhhhh..hh##",
    "##....................##",
    "##....................##",
    "##....................##",
    "##....................##",
    "##hh..hhhhhhhhhhhhhhhh##",
    "##....................##",
    "##....................##",
    "##....................##",
    "##....................##",
    "###################+####",
  ];
  const SA2T = [
    W.trainer({ id: 'sa_echo', cls: 'Understudy', name: 'Echo', model: { base: 'man4', top: '#f0f0f0', bottom: '#2a2a3a', hairStyle: 'slick', extras: ['vest'] },
      at: [10, 12], dir: 'left', sight: [3, 12, 7, 1], noBag: true, bg: 'dojo',
      line: "I know every line in the show. Every single one! I've just never been allowed to SAY any of them. Until now!",
      lose: '...I forgot my lines.', after: "On the landing up ahead there's a second pair of spotlights. Read the cue sheet. Then read it again. Then read it a third time, that's what I do.",
      team: [['mopluff_dancer', 29], ['daravpom_silvertongue', 29], ['akademog_chronicler', 29], ['fablepom_popup_duelist', 29]], money: 1500 }),
    W.trainer({ id: 'sa_arabella', cls: 'Diva', name: 'Arabella', model: { base: 'woman6', top: '#e0b0f0', bottom: '#e0b0f0', hair: '#f0d070', hairStyle: 'longstraight', skirt: 'long', extras: ['bangles'] },
      at: [5, 6], dir: 'right', sight: [6, 6, 8, 1], noBag: true, bg: 'dojo',
      line: "Darling. You are standing in MY light. Do you know what happens to people who stand in my light?\fThey get sung at.",
      lose: 'Hmph. You may have the light. Just this once.', after: "The master's mark is behind Act Three. Blue light only for the star's entrance, darling. Red is SO last act.",
      team: [['minuemog_virtuoso', 29], ['lutemog_bard', 29], ['mimoza_oracle', 28], ['paramog_synergist', 29]], money: 1600 }),
  ];
  const dio = W.master({ id: 'sa_dio', name: 'Dio', model: 'dio', at: [11, 2], badge: 8, money: 4000, music: 'birthofgod',
    team: [['juggler_jester', 29, { held: 'dance_slippers' }], ['operapom_leading_man', 29, { held: 'quick_gear' }], ['rockupo_rock_star', 29, { held: 'focus_pom' }],
      ['maestromog_maestro', 29, { held: 'leftover_nut' }], ['kupera_diva', 30, { plus: 1, held: 'dream_harp' }], ['bigtopo_ringmaster', 30, { plus: 2, held: 'boost_bard' }]],
    intro: "Ladies and gentlemen, moogles of all ages... the moment you've all been waiting for! ...That's me. I'm the moment.\fWelcome to the Showtime Arcade, challenger! I'm Dio: owner of Glimmerfair, champion of the 3rd Kupo League, and tonight, your opponent!\fMy moogles sing, dance, juggle, and now and then set the scenery on fire. So let's give this crowd a SHOW!",
    lose: 'Magnificent! MAGNIFICENT! Encore! ENCORE!',
    after: "Take the Encore Badge, superstar! That makes eight! The Badge Gate on Route 13 will open for you now.\fThe quickest way there is down the west side of the mesa: Route 17, the Glimmer Descent. It comes out just below the gate.\fAnd come back and see us! In Glimmerfair the show never ends. The house always wins... but tonight, you brought the house DOWN!",
    reward: [['boost_bard', 1], ['royal_nut', 3], ['max_oil', 2]] });
  const dioTalk = dio.talk;
  dio.talk = function* (s) {   // (he loves an entrance: a drumroll and a flex first)
    if (!s.flag('kp_badge_8')) { s.sfx('drumroll'); s.anim('sa_dio', 'victory'); yield 50; s.stopAnim('sa_dio'); }
    yield* dioTalk(s);
    if (s.flag('kp_badge_8') && !s.flag('kp_sa_bow')) { s.set('kp_sa_bow'); s.anim('sa_dio', 'victory'); yield 40; s.stopAnim('sa_dio'); }
  };
  FF7.defineMap('kp_glimmerfair_dojo_2', {
    name: 'Showtime Arcade', area: 'Glimmerfair', theme: 'goldsaucer', music: 'caitsith', kpBg: 'dojo',
    camera: { pitch: 58, dist: 11 },
    look: { wall: '#1e1420', trim: '#e0c040', floor: ['#5a4030', '#523a2c'], wallH: 3.2, ambient: [0.36, 0.32, 0.4], light: [0.72, 0.66, 0.74], floorTex: { floor: 'planks' } },
    grid: SA2,
    buildings: [
      { at: [2, 4, 20, 1], h: 1.3, col: '#2a3a7a', roof: '#1a2448', top: 'flat', win: false, tex: false },
      { at: [2, 9, 20, 1], h: 1.3, col: '#8a6a2a', roof: '#4a3a1a', top: 'flat', win: false, tex: false },
      { at: [2, 14, 20, 1], h: 1.3, col: '#2a5a2a', roof: '#1a3a1a', top: 'flat', win: false, tex: false },
    ],
    props: [
      { at: [4, 14], prop: 'kppool', col: '#8a2a2a' }, { at: [5, 14], prop: 'kppool', col: '#8a2a2a' },
      { at: [18, 9], prop: 'kppool', col: '#8a6a1a' }, { at: [19, 9], prop: 'kppool', col: '#8a6a1a' },
      { at: [11, 4], prop: 'kppool', col: '#2a3a8a' }, { at: [12, 4], prop: 'kppool', col: '#2a3a8a' },
      { at: [1, 16], prop: 'whiteboard', wall: true, rot: 90, w: 1.4 }, { at: [22, 6], prop: 'whiteboard', wall: true, rot: -90, w: 1.4 },
      { at: [11, 0], prop: 'kpcurtain', w: 12, h: 2.2, col: '#7a1a5a' },
      { at: [3, 0.6], to: [20, 0.6], h: 3.0, h2: 3.0, bulbs: ['#ffe060', '#ffffff'] },
    ],
    labels: [
      { at: [6, 4], face: 's', text: 'ACT III', size: 0.2, col: '#d8e4ff', y: 0.75, glow: true }, { at: [8, 9], face: 's', text: 'ACT II', size: 0.2, col: '#fff0b0', y: 0.75, glow: true },
      { at: [12, 14], face: 's', text: 'ACT I', size: 0.2, col: '#d0ffd0', y: 0.75, glow: true },
      { at: [17, 4], face: 's', text: 'THE STARS', size: 0.12, col: '#d8e4ff', y: 0.4, glow: true }, { at: [13, 9], face: 's', text: 'THE PALACE', size: 0.12, col: '#fff0b0', y: 0.4, glow: true },
      { at: [16, 14], face: 's', text: 'THE FOREST', size: 0.12, col: '#d0ffd0', y: 0.4, glow: true },
      { at: [11, 0], face: 's', text: 'DIO', size: 0.45, col: '#ffd040', y: 2.65, glow: true, light: 4 },
      { at: [11, 2.6], text: '*', size: 0.5, col: '#ffd040', glow: true, y: 0.02 },
      { at: [8, 17.4], text: 'RED', size: 0.1, col: '#ff6a6a', glow: true, y: 0.02 }, { at: [10, 17.4], text: 'GOLD', size: 0.1, col: '#ffd060', glow: true, y: 0.02 },
      { at: [15, 7.4], text: 'RED', size: 0.1, col: '#ff6a6a', glow: true, y: 0.02 }, { at: [17, 7.4], text: 'BLUE', size: 0.1, col: '#6a9aff', glow: true, y: 0.02 },
    ],
    lights: [[11, 2, '#ffe8b0', 4], [9, 16, '#ffd0a0', 3], [16, 6, '#c0d0ff', 3]],
    entries: { from_down: [19, 18, 'up'] },
    exits: [
      { at: [19, 19, 1, 1], to: 'kp_glimmerfair_dojo', entry: 'from_up', sfx: 'door' },
      { at: [20, 0, 1, 1], to: 'kp_glimmerfair', entry: 'from_stagedoor', sfx: 'door' },
    ],
    npcs: SA2T.map(t => t.npc).concat([dio]),
    objects: [
      spot('sa_spot_r1', [8, 16], 'red'), spot('sa_spot_g', [10, 16], 'gold'), spot('sa_spot_r2', [15, 6], 'red'), spot('sa_spot_b', [17, 6], 'blue'),
      pool('sa_pool_r1', [8, 17], 'red'), pool('sa_pool_g', [10, 17], 'gold'), pool('sa_pool_r2', [15, 7], 'red'), pool('sa_pool_b', [17, 7], 'blue'),
      trap('sa_trap_r1', [4, 14], 'red'), trap('sa_trap_r2', [5, 14], 'red'), trap('sa_trap_g1', [18, 9], 'gold'), trap('sa_trap_g2', [19, 9], 'gold'),
      trap('sa_trap_b1', [11, 4], 'blue'), trap('sa_trap_b2', [12, 4], 'blue'),
    ],
    items: [W.item('sa2_wings', [21, 12], 'quick_gear'), W.item('sa2_props', [2, 7], 'royal_nut', 2)],
    triggers: SA2T.map(t => t.trig).concat([
      { at: [1, 16], on: 'talk', run: function* (s) { yield s.msg("The cue sheet, pinned up in the wings:\fFINALE - LIGHTING CUES\n1. RED and GOLD up (here in the wings). Cross Acts I and II.\n2. On the landing: RED out, BLUE up. The star's entrance through Act III.\fAnd underlined three times: NEVER THREE SPOTS AT ONCE. THE FUSE WILL BLOW AND EVERY TRAP DROPS."); } },
      { at: [22, 6], on: 'talk', run: function* (s) { yield s.msg("The cue sheet, page two:\f\"Each trapdoor stays shut while a spotlight of its own colour is on it. The crew under the stage only hold up the lit ones.\"\fScribbled underneath: \"Getting back? Blue out, red up. -R.\""); } },
    ]),
    onEnter: function* (s) {
      if (s.entry() === 'from_down' && lit().length) {   // (the rig, reset for each performance)
        SPOTS.forEach(c => s.unset('kp_sa_' + c));
        yield s.msg('The stage crew has reset the lights for the next act. Every spotlight is dark again.');
      }
    },
  });

  // ================================================================== Route 17: the Glimmer Descent
  // West from Glimmerfair down off the mesa: the trail leaves the West Gate on the mesa's lip (a last look back at the
  // Glimmer Wheel), then switchbacks down three terraces cut into the mesa's face (stairs at alternate ends; a one-way
  // hop off each terrace's far edge saves a leg), into a canyon of hoodoos and sandstone arches (the trail runs under the
  // Glimmer Arch), and out into a cold green valley under a snowy plateau: a waterfall, a creek and a plank bridge, pines,
  // and the trail on west to Route 13, just below the Badge Gate.
  KP.WILD.kp_route17 = [['hawkin_raptor', 14, 28, 30], ['dunemog_raider', 12, 28, 29], ['chocomog_knight', 12, 28, 30], ['juggler_jester', 12, 28, 29],
    ['partypom_party_host', 10, 28, 30], ['kitemog_skydiver', 10, 28, 30], ['piperpom_wildspeaker', 8, 28, 30], ['kartmog_grand_prix_ace', 8, 28, 30],
    ['icemog_yeti', 5, 29, 30], ['prestopom_illusionist', 4, 28, 30], ['bigtopo_ringmaster', 3, 29, 30], ['kefkupo_mad_god', 2, 30, 30]];
  const R17 = [
    "############################################",
    "#TTT,,TTnnTT,TTTnnTTT..R.U..RRRddddddddd!Rd#",
    "#TT,,n,,TT,,,n,,TT,TT.U....RRRdddddddddddddd",
    "#T,,nn,,,T,,nnn,,,T,T....R..RdddddUddddddddd",
    "#T,,,n,,,,,,n,,,,,,TT.R..U..RdddGGGddddddddd",
    "#TT,,,,,f,,,,,,,f,,TT...R...RRddd==========#",
    "#TTT,,,,,,,,,,,,,,TTT.R.RRRRRR^^RRRRRRRRRRR#",
    "#T,,,,TT,,,,,,TT,,,,T..RRddddddd%ddddddddRR#",
    "#T,,,,,,,,,TT,,,,,,,TU..RdddUdddddddddddddR#",
    "#T,,,,WW,,,,,TT.U..R..R.RGGGddddddddddddddd#",
    "#TT,,,~~,,f,,,T..R...UU.UGGGGdddddddUdddddd#",
    "#T!,,,~~,,,,,,TR...U...RRRRRRRRRRRRRRRRR^^R#",
    "ddddddKKddd,,,,.U...R.RRddddddddddddddddddR#",
    "ddGGddKKdddd,,,..R..U.RddddddGGGdddddddUddd#",
    "#T,GG,~~,,ddd,,U.....RUddddGGGGGddddddddddd#",
    "#TT,,,~~,,,ddd,..U.R..Rdddddddddddddddddddd#",
    "#T,,,,~~f,,ddd,.R...U.R^^RRRRRRRRRRRRRRRRRR#",
    "#T,n,,~~,GGdd,,.U.....ddd........R.......U.#",
    "#T,,n,~~GGGGddd....R.ddd.dddddddddddddd....#",
    "#T,,f,~~GGn,,ddddd..ddd........U.......GGG.#",
    "#T,,,,~~,,,,,,,ddUddddU....UGGG.GG....U....#",
    "#T,,,,~~,,,,f,,.ddddd......GGGGG......GGG.U#",
    "#,TT,,~~,TT,,,,sssssss....sssU....Ussss.R..#",
    "#,,,,,~~,,,,,,,U.....sssUs....sssss....sss.#",
    "######~~####################################",
    "######~~####################################",
  ];
  const R17_H = [
    "99999999999999999999999999999999999999999999",
    "97777777777777777777799999999888888888888889",
    "97777777777777777777799999999888888888888888",
    "97777777777777777777799999999888888888888888",
    "97777777777777777777799999999888888888888888",
    "97777777777777777777799999999888888888888889",
    "97777777777777777777799966666677666666666669",
    "97777777777777777777799966666666666666666669",
    "97777777777777777777799966666666666666666669",
    "92222222222222277777779966666666666666666669",
    "92222211222222277777779966666666666666666669",
    "92222211222222277777779444444444444444445549",
    "22222222222222277777774444444444444444444449",
    "22222222222222277777774444444444444444444449",
    "92222211222222277777774444444444444444444449",
    "92222211222222277777774444444444444444444449",
    "92222211222222277777772332222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "92222211222222222222222222222222222222222229",
    "55555511555555555555555555555555555555555559",
    "55555511555555555555555555555555555555555559",
  ];
  const R17T = [
    W.trainer({ id: 'r17_penny', cls: 'High Roller', name: 'Penny', model: { base: 'woman8', top: '#f0d040', bottom: '#2a2a3a', hair: '#d03030', hairStyle: 'ponytail', extras: ['shades', 'bangles'] },
      at: [36, 2], dir: 'down', sight: [36, 3, 1, 2],
      line: "I just won the Mog Mash jackpot THREE times! I'm on a streak! A hot streak! Let's ride it, battle me!",
      lose: "...The streak's over. Back to the ropeway, I guess.", after: "Look back up the hill. See the Wheel? It looks so small from down here. Like a coin.",
      team: [['deckpom_card_queen', 28], ['phialmog_goldsmith', 28], ['moonte_quizmaster', 29]], money: 1250 }),
    W.trainer({ id: 'r17_dash', cls: 'Jockey', name: 'Dash', model: 'jockey',
      at: [33, 10], dir: 'up', sight: [33, 7, 1, 3],
      line: "My chocobo threw me at the third bend and ran home without me. I'm walking back to the stables. Want to make it interesting?",
      lose: "Thrown again. It's been that kind of day.", after: "Take the hop off the west end of this ledge if you're in a hurry. One way only, mind. Like my chocobo.",
      team: [['nibblemog_sky_mog', 28], ['chasemog_tank', 28], ['shiropom_chocobo_medic', 29], ['breezlin_aeromancer', 28]], money: 1300 }),
    W.trainer({ id: 'r17_morty', cls: 'Gambler', name: 'Morty', model: { base: 'man12', top: '#5a5a6a', bottom: '#3a3a44', hairStyle: 'slick', extras: ['vest', 'tie'] },
      at: [33, 12], dir: 'down', sight: [33, 13, 1, 3],
      line: "The house always wins? The HOUSE always wins?! I'll show the house! ...By beating YOU, apparently!",
      lose: "Of course. OF COURSE. Here, take it. It's the last of it.", after: "I'm never going back up there. ...Until payday. Then I'm going back up there.",
      team: [['execmog_president', 29], ['mogrich_regent', 29], ['recipom_royal_advisor', 28]], money: 1200 }),
    W.trainer({ id: 'r17_marge', cls: 'Tourist', name: 'Marge', model: { base: 'oldwoman2', top: '#e080a0', bottom: '#5a7aaa', hairStyle: 'bun', extras: ['glasses'] },
      at: [9, 15], dir: 'right', sight: [10, 15, 4, 1],
      line: "Excuse me, is this the way to the ropeway? ...It isn't? Oh, dear. Well, while I'm lost, let's have a battle!",
      lose: 'Oh my. You young people are so fast.', after: "My husband says the trail west goes to the Badge Gate. My husband also said this was the way to the ropeway.",
      team: [['trekpom_wayfarer', 27], ['tufty_mime', 27], ['burrowpom_chief', 28], ['glamkupo_honey_star', 28]], money: 1250 }),
  ];
  const HOODOO = (x, y) => ({ prop: 'spire', col: ['#c06a40', '#b05a36', '#d08050'][Math.floor(rnd(x, y) * 3)], h: 1.8 + rnd(x, y, 1) * 1.4, r: 0.55 + rnd(x, y, 2) * 0.2 });
  FF7.defineMap('kp_route17', {
    name: 'Route 17', area: 'Route 17', theme: 'canyon', music: 'badlands', kpWild: 'kp_route17', kpBg: 'desert',
    look: { floor: ['#c08a5a', '#b88254'], dirt: ['#a8744a', '#a06e44'], sand: ['#dcb47c', '#d4ac74'], grass: ['#5a8a4a', '#548244'], wall: '#a85a3a', wallTop: '#c0703e',
      water: '#4a8ac0', snow: ['#eef2f8', '#e4e8f0'], fog: { color: [0.8, 0.62, 0.52], near: 18, far: 44 }, sky: ['#e89a6a', '#f8d8b0'], ambient: [0.58, 0.52, 0.5], light: [0.98, 0.86, 0.74],
      floorTex: { floor: 'sand' } },
    grid: R17, heights: R17_H,
    legend: { U: 'spire' },
    props: deco(R17, {
      U: HOODOO,
      T: (x, y) => ({ prop: 'tree', col: x < 22 ? '#2a5a3a' : '#5a7a3a', h: 1.8 + rnd(x, y) * 0.8 }),
      R: (x, y) => x > 21 ? { prop: 'rock', col: '#a8603a', scale: 1.1 + rnd(x, y) * 0.3 } : null,
      '=': () => ({ prop: 'rail', col: '#6a4a2a' }),
    }).concat([
      // the Glimmer Arch over the trail, the little arch over the wash
      { at: [17, 20], to: [22, 20], h: 2.4, h2: 2.4, sag: -1.0, r: 0.34, count: 1, col: '#c06a40' },
      { at: [29, 22], to: [34, 22], h: 1.9, h2: 1.9, sag: -0.7, r: 0.26, count: 1, col: '#b86440' },
      // Glimmerfair up on the mesa behind: the Wheel against the sky
      { at: [37, -3], prop: 'kpferris', r: 2.8, y0: 2.6 },
    ]),
    labels: [{ at: [19.5, 20], text: 'GLIMMER ARCH', size: 0.12, col: '#7a3a20', y: 0.02 }],
    lights: [[37, 2, '#ff9ad8', 4]],
    entries: { from_glimmerfair: [42, 3, 'left'], from_route13: [1, 12, 'right'] },
    exits: [
      { at: [43, 2, 1, 3], to: 'kp_glimmerfair', entry: 'from_route17' },
      { at: [0, 12, 1, 2], to: 'kp_route13', entry: 'from_route17' },
    ],
    npcs: R17T.map(t => t.npc).concat([
      { id: 'r17_choco', name: 'Chocobo', model: 'chocobo', at: [35, 10], dir: 'left', talk: function* (s) { yield s.msg("Dash's chocobo... no, wait. This one's wild. It looks at you like you owe it money. Kweh."); } },
      folk({ id: 'r17_hiker', name: 'Hiker', model: { base: 'man10', top: '#4a7a4a', bottom: '#5a4a3a', hairStyle: 'cap', extras: ['beard'] }, at: [12, 22], dir: 'up',
        lines: "Feel that? The air turns cold right about here. The mountains start just past the creek, and the Badge Gate road beyond.\fI come down the Glimmer Descent every year. The carnival's fun, but my wallet needs the hike." }),
      W.moogle('r17_mog', 'hawkin_raptor', [30, 19], { wander: 3, line: 'Hawkin: Kree-po! It watches you from the top of a hoodoo, then glides off.' }),
    ]),
    items: [W.item('r17_lip', [42, 1], 'royal_nut', 2), W.item('r17_terrace', [25, 9], 'boost_beast'), W.coins('r17_wash', [42, 23], 1200)],
    triggers: R17T.map(t => t.trig).concat([
      W.sign([40, 1], 'ROUTE 17 - THE GLIMMER DESCENT\fEast: Glimmerfair.\fWest, down the switchbacks: Route 13 and the Badge Gate.'),
      W.sign([2, 11], 'ROUTE 17\fEast, up the mesa: Glimmerfair.\fWest: Route 13, below the Badge Gate.'),
      W.hidden('r17_arch', [16, 18], 'royal_nut'),
      ledge([25, 10, 4], 'down', 2), ledge([35, 15, 4], 'down', 2),
    ]),
  });

  // ================================================================== Route 13: the east trail (a patch to kp_region4.js's map)
  // South of the Badge Gate, a trail now leaves the road east (rows 28-29) to Route 17 and Glimmerfair, gated at seven
  // badges (so nobody skips Candlerock); a signpost and a trail warden at its mouth. And the gate's two new banners.
  (function () {
    const m = FF7.maps.kp_route13; if (!m) return;
    const row = (y, x0, s) => { const r = m.grid[y]; m.grid[y] = r.slice(0, x0) + s + r.slice(x0 + s.length); };
    row(27, 22, '!,,,,,TTTT');
    row(28, 18, '::::::::::::::');
    row(29, 18, '::::::::::::::');
    row(30, 23, ',,,,,TTTT');
    m.entries.from_route17 = [30, 28, 'left'];
    m.exits.push(Object.assign({ at: [31, 28, 1, 2], to: 'kp_route17', entry: 'from_route13' },
      W.gate(7, 'Trail Warden', "Sorry, the trail up to Glimmerfair's for trainers with seven badges or more. It's a long climb.\fCandlerock first: Route 15, east out of Ravenmoor.")));
    m.npcs.push(folk({ id: 'r13_warden', name: 'Trail Warden', model: { base: 'man5', top: '#4a6a3a', bottom: '#4a4030', hairStyle: 'cap', extras: ['beard', 'vest'] }, at: [25, 27], dir: 'down',
      lines: s => KP.badgeCount() >= 7 ? "The east trail climbs Route 17 up to Glimmerfair, the carnival on the mesa. Switchbacks, hoodoos, one big arch. Lovely walk. Terrible on the knees."
        : "This trail climbs east to Glimmerfair, the carnival on the mesa. Seven badges to pass: it's a long, hard climb.\fThe two newest dojos? Candlerock first, east of Ravenmoor, then Glimmerfair up top." }));
    m.triggers.push(W.sign([22, 27], 'EAST: Route 17 - Glimmerfair'));
    (m.props = m.props || []).push(
      { at: [13, 23], prop: 'banner', col: KP.BADGES[7].col, col2: '#e8d8a0', y: 2.6, h: 1.6, w: 0.9, text: 'RED XIII', size: 0.09, textCol: '#1a1a20' },
      { at: [18, 23], prop: 'banner', col: KP.BADGES[8].col, col2: '#e8d8a0', y: 2.6, h: 1.6, w: 0.9, text: 'DIO', size: 0.11, textCol: '#1a1a20' });
  })();

  // ================================================================== the Demo's steps (js/kupomon/kp_runner.js O.kp_plan)
  // From wherever the Demo stands: up to Glimmerfair (Route 16's trainers on the way), the Mog Center, the matinee, the
  // Showtime Arcade (the song, the spotlights, Dio), then down Route 17 to Route 13
  KP.PLANS = KP.PLANS || {};
  KP.PLANS.r5b = { name: "Region 5b: Glimmerfair, Dio's Showtime Arcade, Route 17", steps: [
    ['obj', 'Up the ropeway to Glimmerfair'],
    ['kp_win', [['goto', 'kp_glimmerfair']], { map: 'kp_glimmerfair' }, { train: 'kp_route16' }],
    ['kp_heal', { center: 'kp_glimmerfair_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 3, royal_nut: 2, hi_oil: 8, max_oil: 4, battery: 3 }, { center: 'kp_glimmerfair_center' }],
    ['kp_heal', { center: 'kp_glimmerfair_center' }],
    ['obj', 'The Big Top: the matinee needs a hero'],
    ['talk', 'gfb_usher', { map: 'kp_glimmerfair_bigtop', choose: ['Sure!', 'Offer him a Kupo Nut', 'Take a bow'], done: 'kp_gf_play' }],
    ['kp_equip'],
    ['kp_relearn'],
    ['kp_heal', { center: 'kp_glimmerfair_center' }],
    ['obj', "Dio's Showtime Arcade: B-A-D-G-E, then the spotlights"],
    ['kp_win', [
      ['goto', 'kp_glimmerfair_dojo'],
      ['talk', 'sa_tumble', { done: tr('sa_tumble') }],
      ['talk', 'sa_rigby', { done: tr('sa_rigby') }],
      ['walk', 17, 6, { done: 'kp_sa_n1' }],
      ['walk', 15, 6, { done: 'kp_sa_n2' }],
      ['walk', 7, 6, { done: 'kp_sa_n3' }],
      ['walk', 13, 6, { done: 'kp_sa_n4' }],
      ['walk', 9, 6, { done: 'kp_sa_song' }],
      ['goto', 'kp_glimmerfair_dojo_2'],
      ['use', 8, 16, { done: 'kp_sa_red' }],
      ['use', 10, 16, { done: 'kp_sa_gold' }],
      ['talk', 'sa_echo', { done: tr('sa_echo') }],
      ['talk', 'sa_arabella', { done: tr('sa_arabella') }],
      ['use', 15, 6, { done: '!kp_sa_red' }],
      ['use', 17, 6, { done: 'kp_sa_blue' }],
      ['talk', 'sa_dio', { done: 'kp_badge_8' }]], 'kp_badge_8', { train: 'kp_route17' }],
    ['kp_heal', { center: 'kp_glimmerfair_center' }],
    ['obj', 'Route 17: down off the mesa to the Badge Gate'],
    ['kp_win', [['goto', 'kp_route17'], ['goto', 'kp_route13']], { map: 'kp_route13' }, { train: 'kp_route17' }],
  ] };
})();

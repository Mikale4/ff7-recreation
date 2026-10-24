// Kupomon, region 1 (docs/KUPOMON_WORLD.md "Region 1"): Mogridge the canal town, Route 2 (the Riverside Path), Whisperwood
// (the forest and its deep glade), Route 3 (the bamboo grove and the rice terraces) and Kurotsuki, the hill town with
// Dojo 1 (Yuffie's Shuriken Arcade). Story: Zack's second battle on Mogridge's middle bridge, Team Hojo's first
// theft (Lily's Tufty, the grunts on Route 2's lock gate), Sephiroth's first battle at the Kurotsuki gate.
// Stage 1 (Pomville, Route 1) is js/maps/kupomon/kp_world1.js. Dialogue in our own words.
(function () {
  const KP = FF7.kupomon, W = KP.W;
  const D = () => FF7.state.kp;

  // ------------------------------------------------------------------ this region's own tiles and props (js/field/tiles.js's
  // registries): bamboo clumps (Route 3's grove), the Shuriken Arcade's false walls (a cloth screen painted like the
  // wall: walkable, it fades when you're inside it) and trapdoor mats (walkable; the dojo's triggers drop you), a torii
  const F = FF7.field, PK = F.propKit;
  F.props.kp_bamboo = (mb, x, y, z, s, th, nb, o = {}) => {
    const n = o.n || (nb.e && nb.w && nb.n && nb.s ? 2 : 3), col = o.col || '#8ab452';
    for (let i = 0; i < n; i++) {
      const r1 = PK.rnd(x, z, i * 7 + 1), r2 = PK.rnd(x, z, i * 7 + 2), r3 = PK.rnd(x, z, i * 7 + 3);
      const px = x + (r1 - 0.5) * s * 0.7, pz = z + (r2 - 0.5) * s * 0.7, h = s * (4.4 + r3 * 2.4), w = s * 0.085, c = PK.sh(col, (r3 - 0.5) * 0.22);
      mb.prism(px, y, pz, w, w * 0.8, h, 5, c);
      [0.25, 0.5, 0.75].forEach(t => mb.prism(px, y + h * t, pz, w * 1.3, w * 1.3, s * 0.04, 5, PK.sh(c, -0.25)));
      [[0.18, 0], [-0.16, 0.12], [0.04, -0.17]].forEach(([dx, dz], k) => mb.prism(px + dx * s, y + h * (0.78 + k * 0.07), pz + dz * s, s * 0.17, 0, s * 0.5, 4, PK.sh('#5a8c30', (PK.rnd(px, pz, k) - 0.5) * 0.24)));
    }
  };
  // (the tell: a smooth, slightly paler panel with a seam down the middle, where the real walls are boards)
  F.props.kp_falsewall = (mb, x, y, z, s, th, nb, o = {}) => {
    const h = o.h || th.wallH || 2.4, c = o.col || th.wall;
    mb.box(x, y + h / 2, z, s, h, s, { side: PK.sh(c, 0.1), top: th.wallTop || PK.sh(c, -0.5), front: PK.sh(c, 0.12) });
    [-1, 1].forEach(k => mb.box(x, y + h * 0.48, z + k * (s / 2 + 0.003), s * 0.035, h * 0.86, 0.005, PK.sh(c, -0.35)));
  };
  F.props.kp_falsewall.fade = true;
  // a torii: two red posts o.w tiles apart, the tie beam, the lintel with its dark cap
  F.props.kp_torii = (mb, x, y, z, s, th, nb, o = {}) => {
    const w = (o.w || 4) * s / 2, H = o.h || 2.8, red = o.col || '#c0301e', blk = o.col2 || '#2a1a14', r = s * 0.13;
    [-1, 1].forEach(k => { mb.prism(x + k * w, y, z, r, r * 0.85, H, 8, red, true); mb.prism(x + k * w, y, z, r * 1.3, r * 1.3, s * 0.3, 8, blk); });
    mb.box(x, y + H * 0.78, z, w * 2 + s * 0.5, s * 0.14, s * 0.18, red);
    mb.box(x, y + H + s * 0.05, z, w * 2 + s * 0.9, s * 0.18, s * 0.26, red);
    mb.box(x, y + H + s * 0.2, z, w * 2 + s * 1.2, s * 0.1, s * 0.34, blk);
    mb.box(x, y + H * 0.9, z, s * 0.14, H * 0.18, s * 0.12, red);
  };
  // a stone lantern (a toro): foot, post, platform, the glowing light box, a pyramid roof and its finial
  F.props.kp_stonelantern = (mb, x, y, z, s, th, nb, o = {}) => {
    const c = o.col || '#aaa496', d = PK.sh(c, -0.18), g = PK.glowOf(o, mb), lit = o.lit || '#ffd890';
    mb.prism(x, y, z, s * 0.3, s * 0.34, s * 0.12, 6, d);
    mb.prism(x, y + s * 0.12, z, s * 0.1, s * 0.1, s * 0.92, 6, c);
    mb.box(x, y + s * 1.08, z, s * 0.5, s * 0.08, s * 0.5, d);
    g.box(x, y + s * 1.3, z, s * 0.3, s * 0.36, s * 0.3, lit);
    mb.prism(x, y + s * 1.48, z, s * 0.46, 0, s * 0.34, 4, d);
    mb.prism(x, y + s * 1.8, z, s * 0.05, s * 0.03, s * 0.14, 6, d);
    if (o.light) o.light([x, y + s * 1.3, z], lit, 1.4);
  };
  PK.def('kp_stonelantern', { prop: 'kp_stonelantern' });
  PK.def('kp_bamboo', { floor: 'grass', prop: 'kp_bamboo' });
  PK.def('kp_falsewall', { walk: true, prop: 'kp_falsewall' });
  PK.def('kp_trapmat', { walk: true, floor: 'floor2' });

  // ------------------------------------------------------------------ wild moogles (docs/KUPOMON_WORLD.md: the level guide)
  KP.WILD.kp_route2 = [['angler_fisher', 20, 5, 8], ['farmmog_farmer', 18, 5, 7], ['chemmog_chemist', 16, 5, 8], ['mopluff_bard', 12, 5, 7],
    ['tufty_freelancer', 10, 5, 6], ['mogpost_ranger', 10, 6, 8], ['nutmog_thief', 8, 6, 8], ['stampo_monk', 4, 6, 8], ['pipkin_freelancer', 2, 6, 8]];
  KP.WILD.kp_whisperwood = [['fletchmog_archer', 22, 6, 9], ['huntmog_hunter', 20, 6, 9], ['juggler_juggler', 16, 6, 9], ['mossmog_geomancer', 16, 7, 10],
    ['nutmog_thief', 12, 7, 9], ['mogpost_ranger', 10, 7, 10], ['mopluff_bard', 4, 7, 9]];
  // the sunlit glade's fairy ring (Whisperwood Deep): the forest's moogles, and now and then a Fernwisp
  KP.WILD.kp_whisperwood_glade = [['fletchmog_archer', 20, 7, 10], ['huntmog_hunter', 18, 7, 10], ['juggler_juggler', 20, 7, 10], ['mossmog_geomancer', 20, 8, 10],
    ['mopluff_bard', 12, 8, 10], ['pipkin_freelancer', 7, 8, 10], ['fernwisp_dryad', 3, 8, 10]];
  KP.WILD.kp_route3 = [['kurogen_genin', 20, 8, 11], ['mogsquire_squire', 18, 8, 11], ['chatmog_mediator', 18, 8, 11], ['farmmog_farmer', 14, 8, 10],
    ['angler_fisher', 10, 8, 10], ['stampo_monk', 10, 9, 11], ['nutmog_thief', 8, 9, 11], ['pipkin_freelancer', 2, 9, 11]];

  // ------------------------------------------------------------------ set pieces built from props
  // a cable from a to b (tile coords, fractional) at heights ha / hb (m above y0): beams, spokes, sails
  const beam = (a, b, ha, hb, y0, r, col) => ({ at: a, to: b, h: ha, h2: hb, y0, sag: 0, r, count: 1, col });
  // a water wheel facing south (in the x-y plane): hub at tile [tx, ty], h metres above y0, radius R (m); two rims
  // `depth` tiles apart joined by paddles, spokes on the front rim
  const millWheel = (tx, ty, y0, h, R, o = {}) => {
    const out = [], n = o.n || 12, col = o.col || '#6a4428', dk = o.col2 || '#4a2e1a', depth = o.depth || 0.5, X = (m) => tx + m / 0.5;
    const P = (i, r) => [Math.cos(i / n * Math.PI * 2) * r, Math.sin(i / n * Math.PI * 2) * r];
    [ty, ty - depth].forEach((z, k) => {
      for (let i = 0; i < n; i++) {
        const [x0, y0_] = P(i, R), [x1, y1] = P(i + 1, R);
        out.push(beam([X(x0), z], [X(x1), z], h + y0_, h + y1, y0, 0.03, k ? dk : col));
        if (i % 2 === 0) out.push(beam([X(0), z], [X(x0), z], h, h + y0_, y0, 0.025, dk));
      }
    });
    for (let i = 0; i < n; i++) {   // the paddles: boards across the two rims, sticking out past them
      const [x0, y0_] = P(i, R * 1.08), [x1, y1] = P(i, R * 0.8);
      out.push(beam([X(x0), ty], [X(x0), ty - depth], h + y0_, h + y0_, y0, 0.035, col));
      out.push(beam([X(x1), ty], [X(x1), ty - depth], h + y1, h + y1, y0, 0.03, dk));
    }
    out.push(beam([X(0), ty + 0.15], [X(0), ty - depth - 0.6], h, h, y0, 0.07, dk));   // the axle, into the mill
    return out;
  };
  // a rowboat moored on the water: an elongated hexagonal hull (disc props), rot 0 = bow north
  const boat = (at, rot = 0, col = '#7a5232') => [
    { at, prop: 'disc', r: 0.62, h: 0.2, sides: 6, col, top: '#4a3020', rim: '#9a7048', rimW: 0.12, scale: [0.5, 1, 1.3], rot, y0: -0.12 },
    { at: [at[0] + 0.001, at[1]], prop: 'bench', w: 0.5, col: '#8a6038', rot: rot + 90, scale: 0.7, y0: -0.05 },
  ];
  // a market stall's awning: a square tent roof on four poles over a counter tile
  const awning = (x, y, y0, col) => [
    { at: [x, y], prop: 'tent', col, rot: 45, scale: [1.25, 0.32, 1.25], y0: y0 + 1.55 },
    ...[[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].map(([dx, dy]) => ({ at: [x + dx, y + dy], prop: 'pillar', h: 1.6, scale: [0.18, 1, 0.18], col: '#6a4a2a', col2: '#6a4a2a', y0 })),
  ];
  // an arched bridge's handrail: a cable from a to b bowed up by rise (m), on its end posts (base: the banks' height)
  const archRail = (a, b, base, rise, col = '#5a4030') => [Object.assign(beam(a, b, 0.9, 0.9, base, 0.035, col), { sag: -rise }),
    beam(a, [a[0] + 0.01, a[1] + 0.01], 0, 0.95, base, 0.04, col), beam(b, [b[0] + 0.01, b[1] + 0.01], 0, 0.95, base, 0.04, col)];
  // a Team Hojo poster pasted on a wall tile's south face
  const poster = (x, y, base) => ({ at: [x, y], prop: 'banner', rot: 0, w: 0.8, h: 0.75, y: 1.75, col: '#f2f0e8', col2: '#3a8a5a', text: 'HELP', text2: 'SCIENCE!', textCol: '#2a6a40', text2Col: '#c03030', y0: base });

  // ================================================================== MOGRIDGE: the canal town
  // The river runs down through the middle of town and bends east under the town wall. Three arched bridges (stone
  // steps up to a plank span): the north one to the river warden's island, the middle one (the only way from the west
  // bank to the east) where Zack waits, and the south one over the bend to the moorings. West bank: the Mog Center,
  // Lily's house, the bakery, the park with Mogwin's statue up on its terrace. East bank: the market square with its
  // clock tower and fountain, the mill and its great wheel turning in the bend, the towpath east to Route 2.
  function* zackBridge(s) {
    if (s.flag('kp_rival_zack_2')) return;
    s.emote('zack', '!');
    yield s.say('zack', "Cloud! Hey, CLOUD! Up here, on the bridge!");
    yield s.face('zack', 'player');
    yield s.say('zack', "Isn't this town great? Canals everywhere, a mill wheel the size of a house... and the bakery does Kupo-nut buns!\fOkay, okay. I didn't stop you to talk about buns.");
    yield s.say('zack', "I've been training like crazy since Pomville. Let's see whose moogles grew up more! Best view in town for a battle, right here. Ready?");
    const r = yield* W.rival(s, 'zack', 2, { lose: "Whoa! You got even stronger! ...Not bad, Cloud. Not bad at all.", win: "Yes! Ha! ...Hey, you okay? Go see the Nurse Mog, buddy." });
    yield s.say('zack', (r === 'win' ? "Man, I've gotta step it up. " : "Ha! That one's mine, buddy! ") + "...Hey, did you hear? Some weirdos in lab coats have been grabbing moogles around here. Team Hojo, they call themselves.\fIf you run into 'em, give 'em one from me! I'm heading east. See you down the road, Cloud!");
    yield s.move('zack', [[21, 13], [26, 15], [38, 15]], { run: true });
    s.remove('zack');
  }
  function* lilyTalk(s) {
    if (!s.flag('kp_hojo1_done')) {
      yield s.say('Lily', "Two men in white coats took my Puff! They stuffed him in a sack and said it was \"for SCIENCE.\"\fThen they ran off east, down the towpath along the river. Puff's only a little Tufty. He's scared of ducks!");
      return;
    }
    if (!s.flag('kp_hojo1_reward')) {
      s.set('kp_hojo1_reward');
      yield s.say('Lily', "PUFF! You brought him home! Thank you, thank you, THANK YOU!\fHere, take these. They're my savings. Mom says Golden Kupo Nuts are the tastiest kind there is.");
      KP.give('golden_nut', 5); s.sfx('found');
      yield s.msg('Received 5 Golden Kupo Nuts!');
      yield s.say('Lily', "If those Team Hojo creeps come back, Puff and I will be ready. ...From under the bed.");
      return;
    }
    yield s.say('Lily', "Puff hasn't left my side since you brought him back. He sleeps in my hat now.");
  }
  FF7.defineMap('kp_mogridge', {
    name: 'Mogridge', area: 'Mogridge', theme: 'town', music: 'farmboy', kpBg: 'town',
    look: { floor: ['#a49480', '#9c8c78'], floor2: ['#8e887c', '#868074'], water: '#3a78a8', roof: '#6a3a2a', trim: '#5a4430', floorTex: { floor: 'cobble', floor2: 'stone' } },
    grid: [
      "   TTTTTTTTTTT~~~~~~~~~~TTTTTTTTTTTTT   ",
      "  T,,,,,,,,,,%~~~~~~~~~~TT,,,,,%%,,,,T  ",
      " T,,ff,,,,ff,,~~~~hhh~~~,,,,,,,,,,,,,,T ",
      "T,,f,,,,u,,,f,~~~~hwh~~~,,ff,,,,,ff,,,.T",
      "T,,,,,,...,,,,~~~~,+,~~~......hh....l..T",
      "T%,,,,,...,,,.^KK^,.,~~~......hh.......T",
      "T%%,,,,...,,%.^KK^f,f~~~...............T",
      "T====%==^^====~~~~~~~~~~.DDD.....DDD...T",
      "T.......^^....~~~~~~~~~~...............T",
      "T.hhhhhh........=~~~~.........O........T",
      "T.hhhhhh........=~~~~..................T",
      "T.hwhhwh........=~~~~.l..DDD.....DDD...T",
      "T...+............^KK^................!.T",
      "T.........O......^KK^................:::",
      "T,,,...........::~~~~:::::::::::::::::::",
      "T,f,.........l.::~~~~:::::::::::::::::::",
      "TZ,,...........::~~~~:::::::::::::::::::",
      "T........hhhhh.::~~~~............hhhh::T",
      "T........hhhhh.::~~~~..hhhhh.....hhhh..T",
      "T........hwhwh..:~~~~..hhhhh.....hwwh..T",
      "T..........+....:~~~~..hhhhh..........##",
      "T.hhhh..........:~~~~..hwhwh..........##",
      "T.hhhh...........~~~~~~~~~~~~^^~~~~~~~##",
      "T.hwwh...........~~~~~~~~~~~~KK~~~~~~~##",
      "T.........,,,,...~~~~~~~~~~~~^^~~~~~~~##",
      "T,,,.....,f,,f,.TT%%%..======...======##",
      "Tf,,........%%,,TTTRR.....,,,f,,hhhh..TT",
      "T,,%........%,,,TTTTT,,%,,,,,,,,hwwh,,TT",
      "T........!..%%,,TTTTT%%%R%%%%%%,,,,,,%TT",
      "  T%%%:::%%%R%%%TTTTTTTTTTTTTTTTTTTTT   ",
    ],
    heights: [
      "2222222222222200000000002222222222222222",
      "2444444444444400000000002222222222222222",
      "2444444444444400002220002222222222222222",
      "2444444444444400002220002222222222222222",
      "2444444444444400002220002222222222222222",
      "2444444444444234432220002222222222222222",
      "2444444444444234432220002222222222222222",
      "2444444433444400000000002222222222222222",
      "2222222233222200000000002222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222234432222222222222222222",
      "2222222222222222234432222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200002222222222222222222",
      "2222222222222222200000000000033000000022",
      "2222222222222222200000000000044000000022",
      "2222222222222222200000000000033000000022",
      "2222222222222222222222222222222222222222",
      "2222222222222222222222222222222222222222",
      "2222222222222222222222222222222222222222",
      "2222222222222222222222222222222222222222",
      "2222222222222222222222222222222222222222",
    ],
    legend: { Z: 'bench' },
    buildings: [
      { at: [2, 9, 6, 3], h: 2.3, col: '#f6eee6', roof: '#e0607e', top: 'hip', rise: 0.8, over: 0.2 },                       // Mog Center
      { at: [9, 17, 5, 3], h: 2.1, col: '#d8d0c0', roof: '#4a5a7a', top: 'gable', ridge: 'x', rise: 0.85, over: 0.18, tex: 'brick' },   // Lily's house
      { at: [2, 21, 4, 3], h: 2.1, col: '#e0c8a0', roof: '#8a4a2a', top: 'gable', ridge: 'z', rise: 0.9, over: 0.18, chimney: true }, // bakery
      { at: [18, 2, 3, 2], h: 1.8, col: '#8a6a4a', roof: '#4a6a3a', top: 'shed', rise: 0.5, over: 0.15, tex: 'siding' },         // the warden's hut
      { at: [30, 4, 2, 2], h: 4.6, col: '#c8b898', roof: '#3a5a8a', top: 'hip', rise: 1.1, over: 0.12, tex: 'stoneblock' },       // the clock tower
      { at: [23, 18, 5, 4], h: 2.6, col: '#cab89a', roof: '#7a2e22', top: 'gable', ridge: 'x', rise: 1.0, over: 0.22, tex: 'stoneblock' }, // the mill
      { at: [33, 17, 4, 3], h: 2.0, col: '#7a6a5a', roof: '#6a7078', top: 'gable', ridge: 'z', rise: 0.8, tin: true },           // boathouse
      { at: [32, 26, 4, 2], h: 1.7, col: '#8a7a64', roof: '#6a5a4a', top: 'shed', rise: 0.4, tin: '#7a4a2a' },                     // shed
      { at: [38, 20, 2, 6], h: 1.3, col: '#8a8478', top: 'flat', tex: 'stoneblock' },                                              // the town wall over the culvert
    ],
    props: [].concat(
      millWheel(25, 22.35, 0, 0.55, 0.85),
      archRail([16.6, 11.62], [20.4, 11.62], 0.6, 0.6), archRail([16.6, 13.38], [20.4, 13.38], 0.6, 0.6),
      archRail([13.6, 4.62], [17.4, 4.62], 0.6, 0.6), archRail([13.6, 6.38], [17.4, 6.38], 0.6, 0.6),
      archRail([28.62, 21.6], [28.62, 24.4], 0.6, 0.6), archRail([30.38, 21.6], [30.38, 24.4], 0.6, 0.6),
      boat([17, 15.5], 0), boat([17, 18.5], 8, '#5a6a7a'), boat([26, 24.2], 90, '#8a4a3a'), boat([34, 24.2], 90),
      awning(25, 7, 0.6, '#d04a3a'), awning(26, 7, 0.6, '#f0e6d0'), awning(27, 7, 0.6, '#d04a3a'),
      awning(33, 11, 0.6, '#3a6ab0'), awning(34, 11, 0.6, '#f0e6d0'), awning(35, 11, 0.6, '#3a6ab0'),
      [poster(5, 23, 0.6), poster(36, 19, 0.6),
        { at: [30, 9], prop: 'well', scale: [1.7, 1, 1.7] }, { at: [30.001, 9], prop: 'statue', scale: 0.55, lift: 0.3, col: '#c8c0b0' },   // the fountain
        { at: [30, 5], prop: 'porthole', rot: 0, r: 0.45, y: 3.6, col: '#f2ecd8', col2: '#3a3020', stars: false, y0: 0.6 },             // the clock face
        { at: [8, 3], prop: 'statue', scale: 1.4, col: '#b8b0a0' },
        ...[15, 17, 19, 21].map(y => ({ at: [16, y], prop: 'pillar', h: 0.7, scale: [0.35, 1, 0.35], col: '#5a4030', col2: '#3a2a1a' }))]),
    labels: [
      { at: [4.5, 11], face: 's', text: 'MOG CENTER', size: 0.18, col: '#d04a6a', y: 1.85 },
      { at: [3.5, 23], face: 's', text: 'BAKERY', size: 0.16, col: '#6a3a1a', y: 1.85 },
      { at: [25, 21], face: 's', text: 'MOGRIDGE MILL', size: 0.16, col: '#4a2a1a', y: 2.2 },
      { at: [34.5, 19], face: 's', text: 'BOATHOUSE', size: 0.14, col: '#e8e0d0', y: 1.7 },
    ],
    entries: { from_route1: [7, 28, 'up'], from_center: [4, 13, 'down'], from_house: [11, 21, 'down'], from_warden: [19, 5, 'down'], from_route2: [38, 14, 'left'] },
    exits: [
      { at: [6, 29, 3, 1], to: 'kp_route1n', entry: 'from_mogridge' },
      { at: [4, 12, 1, 1], to: 'kp_mogridge_center', entry: 'from_town', sfx: 'door' },
      { at: [11, 20, 1, 1], to: 'kp_mogridge_house', entry: 'from_town', sfx: 'door' },
      { at: [19, 4, 1, 1], to: 'kp_mogridge_warden', entry: 'from_town', sfx: 'door' },
      { at: [39, 13, 1, 4], to: 'kp_route2', entry: 'from_mogridge' },
    ],
    npcs: [
      { id: 'zack', name: 'Zack', model: 'zack', at: [19, 12], dir: 'left', show: s => !s.flag('kp_rival_zack_2'), talk: zackBridge },
      { id: 'kp_mg_lily', name: 'Lily', model: 'girl3', at: [10, 21], dir: 'down', talk: lilyTalk },
      W.moogle('kp_mg_puff', 'tufty_freelancer', [9, 22], { show: s => s.flag('kp_hojo1_done'), wander: 1, line: 'Puff bounces round and round Lily. Kupo! Kupo kupo!' }),
      { id: 'kp_mg_granny', name: 'Old Woman', model: 'oldwoman3', at: [6, 24], dir: 'up',
        talk: function* (s) { yield s.say('Old Woman', s.flag('kp_hojo1_done') ? "Team Hojo's posters are still up, but nobody's paying them any mind now. Good riddance, I say." : "Those \"HELP SCIENCE\" posters went up overnight. \"Moogles wanted, good homes guaranteed.\"\fGood homes, my foot. Little Lily's Tufty vanished the very next morning."); if (!s.flag('kph_lab_exp_plus')) yield s.say('Old Woman', "Prof. Sith? I read HIS fortune once, the old fraud. Turns out he keeps his luck on the left. The shelf by the wall, he said. Then he winked. Cats shouldn't wink."); } },
      { id: 'kp_mg_miller', name: 'Miller', model: 'worker2', at: [22, 20], dir: 'right',
        talk: function* (s) { yield s.say('Miller', "Round and round she goes! The river turns the wheel, the wheel turns the stones, and the stones grind Kupo Nuts into the finest flour in the isles.\fThe bakery buys every sack. Then their Nutmog eats half of it."); } },
      { id: 'kp_mg_kid', name: 'Boy', model: 'kid3', at: [36, 15], dir: 'left',
        talk: function* (s) { yield s.say('Boy', s.flag('kp_hojo1_done') ? "You beat Team Hojo? Two of 'em, by yourself? That's the coolest thing that's ever happened in Mogridge!" : "I saw them! Two men in lab coats, running down the towpath with a wriggly sack!\fThe towpath goes east along the river, all the way to Whisperwood. They went that way!"); } },
      { id: 'kp_mg_fisher', name: 'Fisherman', model: 'fisherman', at: [24, 26], dir: 'up',
        talk: function* (s) { yield s.say('Fisherman', "The Anglers bite best on Route 2, east along the towpath. Little moogles with fishing rods, kupo! They fish for the same fish I do. And they're better at it."); } },
      { id: 'kp_mg_vendor', name: 'Market Mog', model: { enemy: 'kp_farmmog_farmer', scale: 0.8 }, at: [26, 6], dir: 'down',
        talk: function* (s) { yield s.say('Market Mog', 'Kupo-nut buns, fresh from the bakery! Two for one, kupo!'); } },
      W.moogle('kp_mg_mop', 'mopluff_bard', [29, 13], { wander: 2, line: 'The Mopluff sways to the splash of the fountain. La la kupo~' }),
      W.moogle('kp_mg_nut', 'nutmog_thief', [7, 26], { wander: 2, line: "The Nutmog is staring very hard at the bakery's back door." }),
    ],
    triggers: [
      { id: 'zack_bridge', at: [17, 12, 4, 2], once: false, if: s => !s.flag('kp_rival_zack_2'), run: zackBridge },
      W.sign([9, 28], 'MOGRIDGE - the Canal Town\f"Mind the water, kupo!"'),
      W.sign([37, 12], 'EAST: Route 2, the Riverside Path.\fWhisperwood lies beyond the lock.'),
      W.sign([8, 3], 'MOGWIN THE BRIDGE-BUILDER\fHe built the first bridge in Mogridge out of a hundred Kupo Nut shells.\f(It sank.)'),
      W.sign([5, 23], 'A poster: "HELP SCIENCE! Moogles wanted for important research. Good homes guaranteed. - Team Hojo"\fSomeone has scribbled "LIARS" across it.'),
      W.sign([36, 19], 'A poster: "HELP SCIENCE! Moogles wanted for important research. Good homes guaranteed. - Team Hojo"'),
      W.sign([2, 23], "The bakery's sign says: BACK SOON! (Our Nutmog ran off with the buns again.)"),
      W.sign([34, 19], 'BOATHOUSE - Closed for the season.'),
      { at: [26, 7], on: 'talk', run: function* (s) { yield s.say('Market Mog', 'Kupo-nut buns, fresh from the bakery! Two for one, kupo! ...Sorry, all sold out. The Nutmog got here first.'); } },
      { at: [34, 11], on: 'talk', run: function* (s) { yield s.say('Tackle Seller', "Rods, reels and floats! Not that you need 'em. The moogles round here bring their own."); } },
      W.hidden('mg_well', [10, 13], 'sprout_nut', 2),
    ],
    items: [W.item('mg_park', [12, 2], 'hi_oil'), W.item('mg_moorings', [37, 27], 'golden_nut')],
  });
  W.mogCenter('kp_mogridge_center', { name: 'Mogridge Mog Center', area: 'Mogridge', town: 'kp_mogridge', back: 'from_center', decor: 'rustic',
    mart: ['kupo_nut', 'golden_nut', 'sprout_nut', 'quick_nut', 'oil_can', 'hi_oil', 'fixit'],
    npcs: [{ id: 'kp_mgc_sailor', name: 'Boatman', model: 'sailor2', at: [9, 4], dir: 'left',
      talk: function* (s) { yield s.say('Boatman', "A Mog Center in every town, kupo! Patch your moogles up here before you head down the towpath. Route 2's crawling with Anglers and Farmmogs."); } }] });
  W.house('kp_mogridge_house', { name: "Lily's House", area: 'Mogridge', town: 'kp_mogridge', back: 'from_house', decor: 'cosy',
    npcs: [{ id: 'kp_mgh_mom', name: "Lily's Mom", model: 'woman5', at: [4, 2], dir: 'down',
      talk: function* (s) { yield s.say("Lily's Mom", s.flag('kp_hojo1_done') ? "You brought Puff home! Lily hasn't stopped smiling. Thank you, truly.\fI've half a mind to march down to Team Hojo's door myself. If anyone knew where it was." : "Lily hasn't stopped crying since those men took Puff.\fThe river warden says he saw them heading for the lock on Route 2. If only somebody brave would go after them..."); } }] });
  W.house('kp_mogridge_warden', { name: "River Warden's Hut", area: 'Mogridge', town: 'kp_mogridge', back: 'from_warden', decor: 'rustic',
    grid: [
      "##########",
      "#k..q..b.#",
      "#........#",
      "#.t....j.#",
      "####+#####",
    ], door: [4, 4],
    npcs: [{ id: 'kp_mgw_warden', name: 'River Warden', model: 'oldman4', at: [5, 2], dir: 'down',
      talk: function* (s) { yield s.say('River Warden', s.flag('kp_hojo1_done') ? "The lock's running smooth again since you cleared those Team Hojo fellows off it. They'd jammed the gate with a crate!\fIf you want the best view of the mill wheel, stand on the south bridge." : "I keep the river and the lock on Route 2. Yesterday two men in white coats went by with a sack that squeaked.\fThey're camped on the lock gate, blocking the only way across to Whisperwood. The river's too deep to wade there, so you'll have to go through them."); } }] });

  // ================================================================== ROUTE 2: the Riverside Path
  // East from Mogridge along the river: the towpath meanders under the willows, the meadow rises above it (stairs at
  // x8-9 and x38-39, a ledge back down at x20-26), a fishing pier, a ford of stepping stones (x6) to the quiet south
  // bank, and the lock gate (x34-35), the only way across to the south bank's path into Whisperwood. Team Hojo's two
  // grunts are camped on the lock with Lily's Tufty shut in a crate: beat them both and he runs home.
  const R2_GRUNTS = ['kp_r2_grunt1', 'kp_r2_grunt2'];
  function* hojoFlee(s) {
    if (s.flag('kp_hojo1_done') || !R2_GRUNTS.every(id => W.beaten(id))) return;
    s.set('kp_hojo1_done');
    yield s.say('kp_r2_grunt1', 'Both of us? Beaten by a kid with a pom-pom collection?');
    yield s.say('kp_r2_grunt2', "Forget the Tufty! The Professor said no witnesses... I mean, no DELAYS! Run!");
    yield [s.move('kp_r2_grunt1', [[34, 16], [43, 17]], { run: true }), s.move('kp_r2_grunt2', [[35, 16], [43, 18]], { run: true })];
    s.remove('kp_r2_grunt1'); s.remove('kp_r2_grunt2');
    s.sfx('hop'); s.emote('kp_r2_puff', '!');
    yield s.msg('The crate bursts open and a little Tufty tumbles out!');
    yield s.say('kp_r2_puff', 'Kupo! Kupo kupo!');
    yield s.msg("It bounces round your feet twice, then scampers off up the towpath toward Mogridge.\f(Lily will want to know Puff is on his way home.)");
    yield s.move('kp_r2_puff', [[34, 11], [20, 10], [1, 10]], { run: true });
    s.remove('kp_r2_puff');
  }
  const R2G = [
    W.grunt({ id: 'kp_r2_grunt1', name: 'Grunt', at: [34, 13], dir: 'up', sight: [33, 9, 4, 3], team: [['nutmog_thief', 7], ['chemmog_chemist', 7]], money: 320, show: s => !s.flag('kp_hojo1_done'),
      line: "Halt! This lock is closed for... research. Team Hojo business! Your moogles look like excellent specimens, by the way.",
      lose: 'Ngh! My specimens! The Professor will hear about this...', after: "Don't look at me. My partner's the tough one." }),
    W.grunt({ id: 'kp_r2_grunt2', name: 'Grunt', at: [35, 13], dir: 'up', sight: [33, 9, 4, 3], team: [['mogpost_ranger', 7], ['farmmog_farmer', 7], ['chemmog_chemist', 8]], money: 360, show: s => !s.flag('kp_hojo1_done'),
      line: "That Tufty is property of Team Hojo now! Finders keepers. Science keepers! Want to make it two specimens?",
      lose: "Impossible! We had a grant and everything!", after: 'Science will remember this. Badly.' }),
  ];
  R2G.forEach(g => { const fight = g.trig.run; g.trig.run = g.npc.talk = function* (s) { yield* fight(s); yield* hojoFlee(s); }; });
  const R2T = [
    W.trainer({ id: 'kp_r2_gil', cls: 'Fisher', name: 'Gil', model: 'fisherman', at: [14, 13], dir: 'down', sight: [14, 11, 2, 2], team: [['angler_fisher', 6], ['angler_fisher', 7]], money: 280,
      line: "Shh! You'll scare the fish! ...Oh, a battle? Even better. My Anglers are bored stiff.", lose: 'Reeled in. Hook, line and sinker.', after: "Anglers love this pier. They say the river talks to them. Mostly it says 'blub'." }),
    W.trainer({ id: 'kp_r2_hazel', cls: 'Farmer', name: 'Hazel', model: 'farmer', at: [12, 4], dir: 'right', sight: [13, 4, 5, 1], team: [['farmmog_farmer', 6], ['chemmog_chemist', 7]], money: 280,
      line: "My Farmmog dug up every turnip in this meadow. Let's see if it can dig you up too!", lose: 'Well, plow me under.', after: "Chemmogs mix their own potions out of whatever they find. Never drink one. Trust me." }),
    W.trainer({ id: 'kp_r2_bram', cls: 'Hiker', name: 'Bram', model: { base: 'man', top: '#6a7a3a', bottom: '#5a4a32', hairStyle: 'short', hair: '#4a3020', extras: ['beard'] }, at: [32, 3], dir: 'left', sight: [27, 3, 5, 1], team: [['stampo_monk', 7], ['mossmog_geomancer', 7]], money: 280,
      line: 'Ho there! I hike this meadow every morning. Builds the legs! Builds the moogles!', lose: "Ha! You've got legs AND moogles.", after: "Whisperwood's just past the lock. Easy to get lost in there. Follow the stream and look for the hollow log." }),
    W.trainer({ id: 'kp_r2_wade', cls: 'Fisher', name: 'Wade', model: 'fisherman3', at: [12, 17], dir: 'left', sight: [8, 17, 4, 1], team: [['angler_fisher', 8]], money: 320,
      line: "Nobody ever crosses the ford! You must REALLY want a battle.", lose: 'My lucky spot, my unlucky day.', after: 'Hop the stones back when you\'re done. Mind the slippery one. They\'re all the slippery one.' }),
  ];
  FF7.defineMap('kp_route2', {
    name: 'Route 2', area: 'Route 2', theme: 'grass', music: 'othermountain', kpWild: 'kp_route2', kpBg: 'grass',
    look: { floor2: ['#8a7450', '#82704a'], water: '#3a78a8' },
    grid: [
      "  TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT  ",
      " TT%,,,,GGGG,,,,,%TT,,,,,GGGGG,,,,TTT%%,,TT ",
      "TT,,,,,GGGGGG,,,,,,,,,,,GGGGGGG,,,,,,hhhh,TT",
      "T%,,f,,GGGGG,,,,R,,,,,,,,GGGGG,,,,,,,hhhh,,T",
      "T,,,,,,,GGG,,,,,,,,ff,,,,,,,,,,,,,,,,hwwh,,T",
      "T,,R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,..+.,,T",
      "T%,,,,,,..,,,,,GGG,,,,,,,,,,,GG,,,,,,..:..%T",
      "T%%%%%%%^^%%%%%GGG%%.......%%%%%%%%%%%^^%%%T",
      "T!,%Q,%,^^,,%Q,,,,%,,,,,,,,,%Q,,,,%,,,^^,,,T",
      ":::::,,,,,,,,,,,,,::::::::,,,,,,,,,,::::::,T",
      "::::::::::::::::::::::::::::::::::::::::::,T",
      ",,,,,:::::::::KK::,,,,Q,,,::::::::KK,,,,,,,T",
      "#~~~~~o~~~~~~~KK~~~~~~~~~~~~~~~~~~KK~~~~~~~R",
      "#~~~~~o~~~~~~~KK~~~~~~~~~~~~~~~~~~KK~~~~~~~R",
      "#~~~~~o~~~~~~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~R",
      "#~~~~~o~~~~~~~~~~~~~~~~~~~~~~~~~~~KK~~~~~~~R",
      "R,,,,,,,,,GG,,,,,,TTTTRRT,,,,,,,,,::,,,,:::.",
      "RR,GGGGG,,,GG,,,,TT    TT,,GGG,,,,::::::::::",
      " RR,GGG,,,,,,,,TTT      TT,GGGG,,,,,,,,,::::",
      "  RRRRR%%%%%R%%          %%%RR%%%%%R%%%%%RR%",
    ],
    heights: [
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444444444444444444444444444444444444444",
      "44444444334444444444444444444444444444334444",
      "22222222332222222222222222222222222222332222",
      "22222222222222222222222222222222222222222222",
      "22222222222222222222222222222222222222222222",
      "22222222222222222222222222222222222222222222",
      "20000020000000220000000000000000002200000000",
      "20000020000000220000000000000000002200000000",
      "20000020000000000000000000000000002200000000",
      "20000020000000000000000000000000002200000000",
      "22222222222222222222222222222222222222222222",
      "22222222222222222222222222222222222222222222",
      "22222222222222222222222222222222222222222222",
      "22222222222222222222222222222222222222222222",
    ],
    legend: { o: 'roundpillar', Q: 'block' },
    buildings: [
      { at: [37, 2, 4, 3], h: 2.0, col: '#c8b896', roof: '#5a6a3a', top: 'gable', ridge: 'x', rise: 0.8, over: 0.18, chimney: true, tex: 'siding' },   // the lock keeper's cottage
      { at: [0, 12, 1, 4], h: 0.9, col: '#8a8478', top: 'flat', tex: 'stoneblock' },                                                            // Mogridge's culvert
    ],
    props: [
      ...[[4, 8], [13, 8], [29, 8], [22, 11]].map(([x, y]) => ({ at: [x, y], prop: 'canopy', r: 1.5, h: 2.3, col: '#86b050', col2: '#6a4a2a' })),   // willows
      ...[33, 36].map(x => ({ at: [x, 11], prop: 'pillar', h: 0.9, scale: [0.5, 1, 0.5], col: '#8a8478', col2: '#6a6458' })),   // the lock's bollards
      ...boat([10, 13.6], 90), ...boat([26, 14.2], 80, '#5a6a7a'),
    ],
    entries: { from_mogridge: [1, 10, 'right'], from_whisperwood: [42, 17, 'left'], from_lockhouse: [39, 6, 'down'] },
    exits: [
      { at: [0, 9, 1, 3], to: 'kp_mogridge', entry: 'from_route2' },
      { at: [43, 16, 1, 3], to: 'kp_whisperwood', entry: 'from_route2' },
      { at: [39, 5, 1, 1], to: 'kp_route2_lockhouse', entry: 'from_town', sfx: 'door' },
    ],
    npcs: R2G.map(g => g.npc).concat(R2T.map(t => t.npc), [
      { id: 'kp_r2_puff', name: 'Puff', model: { enemy: 'kp_tufty_freelancer', scale: 0.7 }, at: [34, 14], dir: 'up', show: s => !s.flag('kp_hojo1_done'),
        talk: function* (s) { yield s.msg("A little Tufty peeks out of a crate stamped PROPERTY OF TEAM HOJO. It looks at you with big, damp eyes.\fKupo..."); } },
      W.moogle('kp_r2_mog', 'farmmog_farmer', [20, 3], { wander: 2, line: 'The Farmmog is very busy pulling up a turnip twice its size.' }),
    ]),
    triggers: R2G.map(g => g.trig).concat(R2T.map(t => t.trig), [
      W.ledge([20, 7, 7]),
      W.sign([1, 8], 'ROUTE 2 - THE RIVERSIDE PATH\fWest: Mogridge.   East: the lock, and Whisperwood beyond.'),
      W.hidden('r2_willow', [22, 11], 'golden_nut'),
    ]),
    items: [W.item('r2_meadow', [5, 2], 'hi_oil'), W.item('r2_ford', [3, 18], 'quick_nut', 2), W.item('r2_south', [30, 18], 'oil_can', 2)],
  });
  W.house('kp_route2_lockhouse', { name: "Lock Keeper's Cottage", area: 'Route 2', town: 'kp_route2', back: 'from_lockhouse', decor: 'rustic',
    npcs: [{ id: 'kp_r2l_keeper', name: 'Lock Keeper', model: 'oldman2', at: [3, 2], dir: 'down',
      talk: function* (s) {
        if (!s.flag('kp_hojo1_done')) { yield s.say('Lock Keeper', "Two ruffians in lab coats have taken over my lock! Wedged a crate on the gate and won't budge.\fI'd shoo them off myself, but my knees aren't what they were. Neither is my Stampo."); return; }
        yield s.say('Lock Keeper', "My lock, back in working order! You've done the river a good turn, youngster.");
        if (s.flag('kp_r2_keeper_gift')) return;
        s.set('kp_r2_keeper_gift'); KP.give('hi_oil', 2); s.sfx('found');
        yield s.msg('Received 2 Hi-Oils!');
      } }] });

  // ================================================================== WHISPERWOOD: a maze of paths through dense trees
  // In from Route 2 (west), out north to the deep wood. The stream down the middle is crossed only through a great
  // hollow log; another fallen log makes a tunnel on the way to the lost hiker's dead end; a clearing of tall grass to
  // the east (Ranger Fern), a long glade to the south-east (Tim); a mossy knoll by the north path (stairs up, a ledge
  // down) with a Quick Nut.
  const shroom = (x, y, k = 1, cap = '#d83a3a') => [
    { at: [x, y], prop: 'stump', col: '#efe8d8', scale: 0.35 * k },
    { at: [x + 0.001, y], prop: 'bush', col: cap, scale: [0.5 * k, 0.3 * k, 0.5 * k], lift: 0.12 * k },
  ];
  const WWT = [
    W.trainer({ id: 'kp_ww_fern', cls: 'Ranger', name: 'Fern', model: { base: 'woman', top: '#3a6a3a', bottom: '#4a3a24', hairStyle: 'ponytail', hair: '#7a4a2a', extras: ['vest'] }, at: [31, 12], dir: 'left', sight: [27, 12, 4, 1],
      team: [['fletchmog_archer', 7], ['huntmog_hunter', 8]], money: 320, bg: 'forest',
      line: "Shh! You're stepping on the trail of a Huntmog. ...Too late now. Draw your moogles!", lose: 'Outfoxed in my own forest.', after: 'Fletchmogs and Huntmogs love the deep wood. The Fernwisp, though... only the glade.' }),
    W.trainer({ id: 'kp_ww_tim', cls: 'Bug Catcher', name: 'Tim', model: 'kid6', at: [25, 19], dir: 'left', sight: [21, 19, 4, 1], team: [['juggler_juggler', 7], ['nutmog_thief', 7]], money: 280, bg: 'forest',
      line: "I came to catch bugs but there are only moogles in here! ...Moogles are better anyway. Battle!", lose: 'Squashed like a bug.', after: "My Juggler can keep five Kupo Nuts in the air. It eats them all at the end, though." }),
  ];
  FF7.defineMap('kp_whisperwood', {
    name: 'Whisperwood', area: 'Whisperwood', theme: 'forest', music: 'lurking', kpWild: 'kp_whisperwood', kpBg: 'forest',
    camera: { pitch: 64, dist: 10.5 },   // (looking down between the trees, so the paths behind them show)
    look: { floor2: ['#6a5434', '#62502e'], water: '#2a5a5a' },
    grid: [
      "  TTTTTTTTTTTTTTT~~TTTTTTTTTTT::TT  ",
      "  TTTTTTTTTTTTTTT~~TTTTTTT,,,T::TT  ",
      "TTTTTTTTTTTTTTTTT~~TTTTTT,,,,,::TT  ",
      "TT...TTTTTTTTTTTT~~TTTTTT,,,,,::TTTT",
      "TTT...TTTTTTTTTTT~~TTTTTTGG^^T::TTTT",
      "TTTT..GGTTTTTTTTT~~TTTT::::::::TTTTT",
      "TTTT..GTTTTTTTTTT~~TTTT::::::::TTTTT",
      "TTTT..TTTTTTTTTTT~~TTTT::GGTTTTTTTTT",
      "TTTT..TGTTTTTTTTT~~TTTT::TTGGGGGGTTT",
      "TTTT..........TTT~~TTTT::.GGGGGYGGTT",
      "TTTTTTTTGTTT::TTT~~TGGG::.GG.GGGGGTT",
      "TTTTTTTTTTTT::TTT~~TTGG::TGGG.GGGGTT",
      "TTTTTTTTTTTT:::::KK::::::TGGGG..GGTT",
      "TTTTTTTTTTTT::Y::KK::::::TGGGGGG.GTT",
      "TTTTTTTTTTGG::TTT~~TTT..TTTTGGGGGTTT",
      "TTTTTTTTTGGG::TTT~~TTT..TTT..TTTTTTT",
      "TTTTTTTT::::::TTT~~TTTGGGGGGTTTTTTTT",
      "TTTTTT:::::R::TTT~~TGGGGGGGGGGTTTTTT",
      "TTTTTT::GGGTTTTTT~~TGG..GGGRGGTTTTTT",
      "TTGGTT::TGGTTTTTT~~TGGG...GGGGTTTTTT",
      "T.GGGG::TTTTTTTTT~~TGGGGG..GGGTTTTTT",
      "TTGGGG::TTTTTTTTT~~TGGGGGG...TTTTTTT",
      "TTTTTT::TTTTTTTTT~~TGGGYGGGGTTTTTTTT",
      "TT..GT::TTTTTTTR~~~~~RTTTTTTTTTTTTTT",
      ":::::Y::TTTTTTT~~~~~~~TTTTTTTTTTTTTT",
      "::::::::TTTTTTT~~~~~~~TTTTTTTTTTTTTT",
      "T.GG.TTTTTTTTTTR~~~~~RTTTTTTTTTTTTT ",
      "TTTG.TTTTTTTTTTTRRRRRTTTTTTTTTTTT   ",
      "    TTTTTTTTTTTTTTTTTTTTTTTTTTTTT   ",
      "                                    ",
    ],
    heights: [
      "222222222222222220022222222222222222",
      "222222222222222220022222244444222222",
      "222222222222222220022222244444222222",
      "222222222222222220022222244444222222",
      "222222222222222220022222222332222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222222222222222222222222",
      "222222222222222222222222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222220022222222222222222",
      "222222222222222000000022222222222222",
      "222222222222222000000022222222222222",
      "222222222222222000000022222222222222",
      "222222222222222000000022222222222222",
      "222222222222222222222222222222222222",
      "222222222222222222222222222222222222",
      "222222222222222222222222222222222222",
    ],
    props: [
      { at: [17.5, 12.5], prop: 'glassarch', len: 3, r: 1.6, rot: 90, col: '#6a4a2a', col2: '#4a3220', fade: true },   // the hollow log over the stream
      { at: [8.5, 9], prop: 'glassarch', len: 4.5, r: 1.3, rot: 90, col: '#5e4228', col2: '#3e2a18', fade: true },     // the fallen log tunnel
      ...shroom(9, 13), ...shroom(10, 13.4, 0.8), ...shroom(5, 23, 1, '#e0a030'), ...shroom(24, 14.3, 0.9), ...shroom(3, 5, 1.1, '#9a5ad0'), ...shroom(31, 11.2, 0.8),
    ],
    entries: { from_route2: [1, 24, 'right'], from_deep: [30, 1, 'down'] },
    exits: [
      { at: [0, 24, 1, 2], to: 'kp_route2', entry: 'from_whisperwood' },
      { at: [30, 0, 2, 1], to: 'kp_whisperwood_deep', entry: 'from_whisperwood' },
    ],
    npcs: WWT.map(t => t.npc).concat([
      { id: 'kp_ww_hiker', name: 'Lost Hiker', model: 'man9', at: [3, 4], dir: 'down',
        talk: function* (s) {
          yield s.say('Lost Hiker', "Oh, thank goodness, a person! I've been going round in circles for three days. Every tree looks like every other tree!");
          if (!s.flag('kp_ww_hiker_gift')) {
            s.set('kp_ww_hiker_gift'); KP.give('oil_can', 3); s.sfx('found');
            yield s.msg('Received 3 Oil Cans!');
          }
          yield s.say('Lost Hiker', "Take those, I've been rationing them. The way out? Back through the log, then follow the stream to the hollow log crossing. North of that, keep to the path.\f...I'll just wait here a little longer. In case my legs remember the way.");
        } },
      W.moogle('kp_ww_mog', 'huntmog_hunter', [13, 16], { wander: 1, line: 'The Huntmog sniffs your boots, decides you are not a turnip, and loses interest.' }),
    ]),
    triggers: WWT.map(t => t.trig).concat([
      W.ledge([25, 3, 2]),
      W.sign([14, 13], 'A carved stump: "WHISPERWOOD. Keep to the paths. The trees move when you are not looking." (They do not. Probably.)'),
      W.hidden('ww_stump', [5, 24], 'hi_oil'),
    ]),
    items: [W.item('ww_dead_end', [2, 3], 'golden_nut'), W.item('ww_clearing', [32, 13], 'sprout_nut', 2), W.item('ww_knoll', [27, 1], 'quick_nut')],
  });

  // ------------------------------------------------------------------ WHISPERWOOD DEEP: the sunlit glade
  // The paths ring a bowl in the trees (h1) lit by the sun: a fairy ring of mushrooms round its middle, the Great
  // Hollow Tree at its north rim. The glade's tall grass has its own wild table (the rare Fernwisp lives only here).
  // A loop west (Thief Vin, a dead end), the way on north-east past Ranger Ash.
  const WDT = [
    W.trainer({ id: 'kp_wwd_ash', cls: 'Ranger', name: 'Ash', model: { base: 'man', top: '#2a5a3a', bottom: '#3a3024', hairStyle: 'short', hair: '#2a2a2a', extras: ['vest'] }, at: [25, 7], dir: 'right', sight: [26, 7, 3, 1],
      team: [['huntmog_hunter', 9], ['fletchmog_archer', 9]], money: 360, bg: 'forest',
      line: "The road to Kurotsuki is just past me. Prove you're worth the walk!", lose: 'Fair shot. Fair shot.', after: 'Past the bamboo grove the paddies start. Kurotsuki sits right on top of the hill.' }),
    W.trainer({ id: 'kp_wwd_vin', cls: 'Pickpocket', name: 'Vin', model: 'ninja2', at: [2, 4], dir: 'right', sight: [3, 4, 3, 1], team: [['nutmog_thief', 9], ['nutmog_thief', 10]], money: 400, bg: 'forest',
      line: "You found my hideout! Now I'll have to take your coins. Fair's fair.", lose: "Fine. FINE. Keep your coins.", after: "I only steal from people who look like they have too many Kupo Nuts. You look like that." }),
  ];
  const ring = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ring.push(...shroom(16.5 + Math.cos(a) * 3.4, 13 + Math.sin(a) * 2.6, 1.1, i % 2 ? '#e8e0f0' : '#d83a3a')); }
  FF7.defineMap('kp_whisperwood_deep', {
    name: 'Whisperwood Deep', area: 'Whisperwood', theme: 'forest', music: 'lurking', kpBg: 'forest',
    camera: { pitch: 64, dist: 10.5 },
    // the glade's bowl (the tiles at its floor height) has its own wild table; the rest of the wood the forest's
    kpWildBase: 'kp_whisperwood', kpWildZones: { kp_whisperwood_glade: (P, x, y) => P.el(x, y) < 0.45 },
    get kpWild() { const f = FF7.fieldScene, p = f && f.player; return KP.wildTableAt(this, p && f.P && f.map === this ? f.P : null, p && p.tx, p && p.ty); },
    look: { floor2: ['#6a5434', '#62502e'], grass: ['#4a7a34', '#44722e'] },
    grid: [
      "  TTTTTTTTTTTTTTTTTTTTTTTT::TTT   ",
      "  TTTTTTTTTTTTTTTTTTTTTTTT::TTT   ",
      "  TTTTTTTTTTTTTTTTTTTTTTTT::TTTTTT",
      "TT.....TTTTTTTTTTTTTTTTTTT::TTTTTT",
      "TT.....TTTTTTTTTTTTTTTTTTTT::TTTTT",
      "TTTT::TTTTTTTTTTTTTTTTTTTTT:RTTTTT",
      "TTTT::GGTTTTTTTTQQTTTTTTTTT::TTTTT",
      "TTTT::GGGTTTTTTQQQQTTTTTTGG::TTTTT",
      "TTTT::TTTTTTTTTQQQQTTTTTTTT::GGGTT",
      "TTTGG:TTTTTTT,,,,,,,,TTTTTT::GGGGT",
      "TTGT::TTTTT,,GGGGGGGG,,TTTT::GGTTT",
      "TTTT::TTTT,GGGfGGGGfGGG,TTT::TTTTT",
      "TTTT::::TT,GGG,,,,,,GGG,TT:::TTTTT",
      "TTTT::::^^,GGf,,,,,,fGG,^^:::GGTTT",
      "TTTT:Y::TT,GGG,,,,,,GGG,TT:::TTTTT",
      "TTTT::TTTT,GGGfGGGGfGGG,TTTTGGGTTT",
      "TTTT::TTTTT,,GGGGGGGG,,TTTTTTG.TTT",
      "TTTT::TGGTTTT,,,,,,,,TTTTTTTTT.TTT",
      "TTTT::GGGTTTTTT^^TTTTTTTTTTTTTTTTT",
      "TTTT::::::::::T^^TTTTTTTTTTTTTTTTT",
      "TTTT::::::::::::::TTTTTTTTTTTTTTTT",
      "TTTTTTTTTTGGTY::::TTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTT::GGTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTGG::TTTTTTTTTTTT     ",
      "   TTTTTTTTTGGG::TGTTTTTTTTTT     ",
      "   TTTTTTTTTTTT::TTTTTTTTTTTT     ",
      "               ::                 ",
    ],
    heights: [
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333111111113333333333333",
      "3333333333311111111111133333333333",
      "3333333333111111111111113333333333",
      "3333333333111111111111113333333333",
      "3333333322111111111111112233333333",
      "3333333333111111111111113333333333",
      "3333333333111111111111113333333333",
      "3333333333311111111111133333333333",
      "3333333333333111111113333333333333",
      "3333333333333332233333333333333333",
      "3333333333333332233333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
    ],
    legend: { Q: 'block' },
    props: ring.concat([{ at: [16.5, 7], prop: 'hollowtree', scale: 1.7 }]),
    lights: [[16.5, 13, '#fff0b8', 5.5]],
    entries: { from_whisperwood: [15, 26, 'up'], from_route3: [26, 1, 'down'] },
    exits: [
      { at: [15, 27, 2, 1], to: 'kp_whisperwood', entry: 'from_deep' },
      { at: [26, 0, 2, 1], to: 'kp_route3', entry: 'from_whisperwood' },
    ],
    npcs: WDT.map(t => t.npc).concat([
      W.moogle('kp_wwd_mog', 'juggler_juggler', [12, 14], { wander: 1, line: 'The Juggler is keeping three acorns in the air. It drops one on its pom-pom. It pretends that was the trick.' }),
    ]),
    triggers: WDT.map(t => t.trig).concat([
      W.sign([16, 8], "The Great Hollow Tree. Its bark is warm to the touch, and something deep inside it hums.\fThe forest folk say a Fernwisp is born whenever sunlight first touches the glade."),
      W.hidden('wwd_hollow', [17, 8], 'fancy_nut'),
    ]),
    items: [W.item('wwd_dead_end', [3, 3], 'golden_nut', 2), W.item('wwd_pocket', [30, 17], 'cure_nut')],
  });

  // ================================================================== ROUTE 3: the bamboo grove and the rice terraces
  // North out of the wood through a grove of bamboo, then up three terraces of flooded rice paddies (bunds between
  // them, paper lanterns along the grand stair) to the torii of Kurotsuki. Ledges back down: x2-6 on the lowest lip,
  // x29-30 on the top one. Sephiroth waits under the torii.
  function* sephGate(s) {
    if (s.flag('kp_rival_sephiroth_3')) return;
    s.emote('seph', '...');
    yield s.say('seph', '......Cloud.');
    yield s.move('seph', 15, 3);
    yield s.face('seph', 'player');
    yield s.say('seph', "Zack is wasting his time with bakeries and bridges. I came straight here. Kurotsuki's dojo is mine tomorrow.\fShow me what you've done with that little moogle.");
    const r = yield* W.rival(s, 'sephiroth', 3, { lose: '...Hm. So you can fight.', win: 'As expected.' });
    yield s.say('seph', (r === 'win' ? "One loss. It changes nothing." : "As I thought. You aren't ready.") + "\fThe dojo master here hides behind tricks. Walls that aren't walls. Floors that aren't floors. Don't embarrass yourself.");
    yield s.move('seph', [[15, 1], [15, 0]]);
    s.remove('seph');
  }
  const R3T = [
    W.trainer({ id: 'kp_r3_kage', cls: 'Ninja', name: 'Kage', model: 'ninja', at: [12, 24], dir: 'right', sight: [13, 24, 3, 1], team: [['kurogen_genin', 9], ['nutmog_thief', 10]], money: 400,
      line: '...You did not see me. You did not see me. ...You saw me. Battle!', lose: 'My bamboo camouflage failed me.', after: "Yuffie's dojo is full of ninja tricks. Look for the walls that sway." }),
    W.trainer({ id: 'kp_r3_sato', cls: 'Farmer', name: 'Sato', model: 'farmer2', at: [11, 14], dir: 'right', sight: [12, 14, 2, 1], team: [['farmmog_farmer', 9], ['angler_fisher', 9]], money: 360,
      line: 'Mind the paddies, traveler! And mind my moogles!', lose: 'Ah, my rice and my pride, both flattened.', after: 'The Anglers fish the paddies for frogs. The frogs are not pleased.' }),
    W.trainer({ id: 'kp_r3_rei', cls: 'Ace Trainer', name: 'Rei', model: { base: 'woman', top: '#3a4a8a', bottom: '#2a2a3a', hairStyle: 'bob', hair: '#1a1a24' }, at: [20, 9], dir: 'left', sight: [14, 9, 6, 1], team: [['mogsquire_squire', 10], ['chatmog_mediator', 10]], money: 400,
      line: "You're heading for the Shuriken Arcade? Then show me you deserve a badge!", lose: 'You might actually deserve it.', after: "Squires are tough as old boots. Hit them with magic, not swords." }),
    W.trainer({ id: 'kp_r3_ko', cls: 'Priest', name: 'Ko', model: 'wutai_elder', at: [9, 3], dir: 'right', sight: [10, 3, 4, 1], team: [['chatmog_mediator', 10], ['stampo_monk', 11]], money: 440,
      line: 'The gate tests every traveler. And so do I. Let us see your heart.', lose: 'Your heart is strong. Your moogles, stronger.', after: 'The two stone guardians have watched this gate for three hundred years. They have never once blinked.' }),
  ];
  FF7.defineMap('kp_route3', {
    name: 'Route 3', area: 'Route 3', theme: 'grass', music: 'cinco_chocobo', kpWild: 'kp_route3', kpBg: 'grass',
    look: { floor2: ['#8a7450', '#82704a'], dirt: ['#6a5a3a', '#625234'], water: '#4a8aa8', grass: ['#5a8a38', '#548232'], lantern: '#ff6a48' },
    grid: [
      "bbbbbbbbbbbbbb::::bbbbbbbbbbbbbb",
      "bb,,J,,,,,,,,Q::::Q,,,,,,,,J,,bb",
      "b,,,,,,%%,,,,.::::.,,,,%%,,,,,,b",
      "b,,uu,,,,,,,,,::::,,,,,,,,,,,,,b",
      "b%,,,,,,,J,,,,::::,,,,J,,,,,GG,b",
      "bb,~~~~~,,,,,,::::,,,,,,~~~~~,bb",
      "bR============^^^^===========..b",
      "b,,~~~~~~~,,,,^^^^,,,,~~~~~~~,,b",
      "b,,~~~~~~~,d,,::::,,d,~~~~~~~,,b",
      "b,,~~~~~~~,d,J::::J,d,~~~~~~~,Gb",
      "b,,dddddddddd,::::,dddddddddd,Gb",
      "b,,~~~~~~,,,,,::::,,,,,~~~~~~GGb",
      "bRR========%%%%^^%%%%=========Rb",
      "b,,~~~~~~~,,,,,^^,,,,,,~~~~~~,,b",
      "b,,~~~~~~~,d,,::::,,d,,~~~~~~,,b",
      "b,,dddddddddd,::::,,ddddddddd,,b",
      "bGG~~~~~~~,,J,::::,J,,~~~~~~,GGb",
      "bR.....%%%%%%%^^^^%%%%%%%=====Rb",
      "b,,,GGG,,,,,,,^^^^,,,,,,,GG,,,,b",
      "bb,,GGGG,,,,,,::::,,,,,GGGG,,,bb",
      "bbbb,GG,bbbbb,::::,bbbbb,GG,bbbb",
      "bbbb,,,,bbbbb,,::,,bbbbb,,,,bbbb",
      "bbbbbb,,,bbbbb,::,bbbbb,,,bbbbbb",
      "bbbbbbb,,,bbbb::::bbbb,,,bbbbbbb",
      "bbbbbbbb,,,,,::::::,,,,,,bbbbbbb",
      "bbbbbbbbbbGG,::bb::,GGbbbbbbbbbb",
      "bbbbbbbbbGGGG::bb::GGGGbbbbbbbbb",
      "bbbbbbbbbbGG,::bb::,GGbbbbbbbbbb",
      "bbbbbbbbbbb,,:::::,,bbbbbbbbbbbb",
      "bbbbbbbbbbbbb,:::,bbbbbbbbbbbbbb",
      "bbbbbbbbbbbb,,::,,,bbbbbbbbbbbbb",
      "bbbbbbbbbbbbGG::GGbbbbbbbbbbbbbb",
      " bbbbbbbbbbbbG::Gbbbbbbbbbbbbbb ",
      "  bbbbbbbbbbbb::bbbbbbbbbbbbbb  ",
    ],
    heights: [
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666555566666666666666",
      "44444444444444555544444444444444",
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444444444444444444444444444444",
      "44444444444444433444444444444444",
      "22222222222222233222222222222222",
      "22222222222222222222222222222222",
      "22222222222222222222222222222222",
      "22222222222222222222222222222222",
      "22222222222222111122222222222222",
      "00000000000000111100000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    legend: { b: 'kp_bamboo', Q: 'block', J: 'kp_stonelantern' },
    props: [
      { at: [15.5, 1], prop: 'kp_torii', w: 5, h: 2.9 },
      { at: [15.5, 1], prop: 'banner', w: 1.3, h: 0.42, y: 2.72, col: '#2a1a14', col2: '#c8a040', text: 'KUROTSUKI', textCol: '#e8c860' },
      ...[[3, 3], [4, 3]].map(([x, y]) => ({ at: [x, y], prop: 'statue', scale: 1.3, col: '#9a968a' })),
    ],
    entries: { from_whisperwood: [14, 32, 'up'], from_kurotsuki: [15, 1, 'down'] },
    exits: [
      { at: [14, 33, 2, 1], to: 'kp_whisperwood_deep', entry: 'from_route3' },
      { at: [14, 0, 4, 1], to: 'kp_kurotsuki', entry: 'from_route3' },
    ],
    npcs: R3T.map(t => t.npc).concat([
      { id: 'seph', name: 'Sephiroth', model: 'sephiroth', at: [15, 2], dir: 'down', show: s => !s.flag('kp_rival_sephiroth_3'), talk: sephGate },
      { id: 'kp_r3_planter', name: 'Rice Planter', model: 'wutai_woman', at: [25, 15], dir: 'left',
        talk: function* (s) { yield s.say('Rice Planter', "Every spring we flood the terraces and every summer the moogles come to splash in them. We don't mind. They keep the snails away.\fThe Kurogen up here are ninja moogles. They nap in the paddies with only their pom-poms sticking out!"); } },
      W.moogle('kp_r3_mog', 'chatmog_mediator', [26, 2], { wander: 2, line: 'The Chatmog tells you a very long story. You understand none of it. It seems satisfied.' }),
    ]),
    triggers: R3T.map(t => t.trig).concat([
      { id: 'seph_gate', at: [1, 4, 30, 1], once: false, if: s => !s.flag('kp_rival_sephiroth_3'), run: sephGate },
      W.ledge([2, 17, 5]), W.ledge([29, 6, 2]),
      W.sign([3, 3], 'A stone guardian. Its face is worn smooth by three hundred years of rain.'),
      W.hidden('r3_bamboo', [8, 21], 'golden_nut', 2),
    ]),
    items: [W.item('r3_bund', [11, 10], 'hi_oil'), W.item('r3_grove', [21, 26], 'quick_nut'), W.item('r3_shrine', [2, 2], 'oil_nut', 2)],
  });

  // ================================================================== KUROTSUKI: the hill town (Dojo 1)
  // Three tiers on the hill. Up top: the five-tiered pagoda (nested building roofs), its guardians and water basin,
  // cherry trees, the cliff road north to Route 4 (badge 1). The middle: the hot spring and its bathhouse, the tea
  // house, and the Shuriken Arcade, Yuffie's ninja house. Down below: the koi pond under its red arched bridge, the
  // main street under strings of paper lanterns, the Mog Center and the elder's house, the south gate.
  const KUROTSUKI = { wall: '#7e786c', floor: ['#8a8478', '#827c70'], floor2: ['#8a7a68', '#827262'], wood: ['#c23a2a', '#b2322a'], water: '#3a8aa0', lantern: '#ff5a3c', roof: '#34384a',
    floorTex: { floor: 'stone', floor2: 'cobble' } };
  // indoors: dark wood and tatami under a black sky
  const KURO_IN = { sky: ['#000000', '#000000'], fog: null, wall: '#7a5232', trim: '#2a1a10', wallTop: '#1a120c', floor: ['#c6b67c', '#beae74'], floor2: ['#7a5a3a', '#725236'],
    floorTex: { floor: 'carpet', floor2: 'planks' }, wallTex: 'boards', ambient: [0.5, 0.46, 0.42], light: [0.82, 0.74, 0.6] };
  const cherry = (x, y) => ({ at: [x, y], prop: 'canopy', r: 1.9, h: 2.4, col: '#f2b4cc', col2: '#5a3a2a' });
  FF7.defineMap('kp_kurotsuki', {
    name: 'Kurotsuki', area: 'Kurotsuki', theme: 'wutai', music: 'wutai', kpBg: 'town',
    look: KUROTSUKI,
    grid: [
      "    TTTTTTTTTTTTTTTTTTTTTTTTTT:::TTTT   ",
      " T,,,,,,,,,,,.................:::.....T ",
      " T.hhhhhhh.,,,,,..............:::.....T ",
      " T.hhhhhhh......::::::::::::::::::QQ..T ",
      " T.hhhhhhh......::::::::::::::::::QQ..T ",
      " T.hhhhhhh,,,,,,,,::::,,,,,,,,,,,,,,,.T ",
      " T.hhhhhhh..u,,,,u::::QQ..,,,,,,,,,,,.T ",
      " T.hhhhhhh...O....::::QQ..,,,,J,,,,,,.T ",
      " T.hhwhwhh........::::....,,,,,,,,,,,.T ",
      " TJ,,:::,,,,,,,,,,::::,,,,,,,,,,,,,,,,T ",
      " =================^^^^================= ",
      " T................^^^^................T ",
      " Thhhhh......hhhh.::::...hhhhhhhhh.,,,T ",
      " ThhhhhR~~~R.hhhh.::::...hhhhhhhhh.,J,T ",
      " Thwwwh~~~~~Rhwwh.::::...hhhhhhhhh....T ",
      " T....,R~~~~R..+..::::...hhhhhhhhh....T ",
      " T.....RR~RR......::::...hhwhhhwhh....T ",
      " T............:::::::::::::::+::::,,,,T ",
      " T........,,,,J:::::::::::::::::J,,,..T ",
      " T................::::................T ",
      " =================^^^^================= ",
      " T................^^^^................T ",
      " T,J,.......,,,::::::::::hhhhhhhhhhhh.T ",
      " T,,,R~~~~~R...::::::::::hhhhhhhhhhhh.T ",
      " T...~~~~~~~...::::::::::hwhhwhhwhwhh.T ",
      " T...^KKKKK^...::::::::::..+.....+....T ",
      " T...^KKKKK^...::::::::::.............T ",
      " Tf,f~~~~~~~...::::::::::......,,QQ,,,T ",
      " T,J,R~~~~~RR..::::::::::......,,QQ,,,T ",
      " T,,,.......,,,::::::::::,,,,,,,,,,,,,T ",
      "   T%%%R%%%%%%%%%|::::|%%%%%%%%R%%%T    ",
      "                 T::::T                 ",
    ],
    heights: [
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666665555666666666666666666",
      "3333333333333333334444333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333333333333333333333333333",
      "3333333333333333332222333333333333333333",
      "0000000000000000001111000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000012222210000000000000000000000000000",
      "0000012222210000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    legend: { Q: 'block', '|': 'block' },
    buildings: [
      { at: [5, 4, 3, 3], h: 7.0, col: '#a8302a', roof: '#34384a', top: 'hip', rise: 0.9, over: 0.35, win: false },   // the pagoda, tiers listed inner-first
      { at: [4, 3, 5, 5], h: 5.2, col: '#a8302a', roof: '#34384a', top: 'hip', rise: 0.55, over: 0.45, win: false },
      { at: [3, 2, 7, 7], h: 3.2, col: '#a8302a', roof: '#34384a', top: 'hip', rise: 0.55, over: 0.55, win: false },
      { at: [2, 12, 5, 3], h: 2.1, col: '#6a4a34', roof: '#34384a', top: 'gable', ridge: 'x', rise: 0.8, over: 0.25, win: false },   // bathhouse
      { at: [13, 12, 4, 3], h: 2.1, col: '#b8a888', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.8, over: 0.25, win: false },  // tea house
      { at: [25, 12, 9, 5], h: 2.8, col: '#4a3428', roof: '#2a2c36', top: 'gable', ridge: 'x', rise: 1.3, over: 0.35, win: false },  // the Shuriken Arcade
      { at: [25, 22, 6, 3], h: 2.3, col: '#f0e8e0', roof: '#d05a76', top: 'gable', ridge: 'x', rise: 0.9, over: 0.3, win: false },   // Mog Center
      { at: [31, 22, 6, 3], h: 2.2, col: '#9a3a2c', roof: '#3a3e4a', top: 'gable', ridge: 'x', rise: 0.85, over: 0.25, win: false }, // the elder's house
    ],
    props: [
      { at: [6, 5], prop: 'tent', col: '#8a7042', y0: 8.8, scale: [0.25, 1.5, 0.25] },                       // the pagoda's finial
      { at: [19.5, 30], prop: 'kp_torii', w: 5, h: 2.7 },
      { at: [19.5, 30], prop: 'banner', w: 1.4, h: 0.42, y: 2.52, col: '#2a1a14', col2: '#c8a040', text: 'KUROTSUKI', textCol: '#e8c860' },
      { at: [29, 16], prop: 'banner', rot: 0, w: 2.6, h: 0.55, y: 2.45, col: '#2a3a6a', col2: '#e8d8a0', text: 'SHURIKEN ARCADE', textCol: '#f0e8c8', y0: 0.9 },
      cherry(22.5, 6.5), cherry(34.5, 3.5), cherry(32.5, 27.5),
      // strings of paper lanterns over the streets
      { at: [14.5, 23], to: [24.5, 23], lanterns: true, h: 2.5, sag: 0.3 }, { at: [14.5, 26.5], to: [24.5, 26.5], lanterns: '#ffcf4a', h: 2.5, sag: 0.3 },
      { at: [14.5, 29], to: [24.5, 29], lanterns: true, h: 2.5, sag: 0.3 }, { at: [16.5, 13.5], to: [24.5, 13.5], lanterns: true, h: 2.4, sag: 0.25 },
      { at: [17.5, 17.5], to: [21.5, 17.5], lanterns: '#ffcf4a', h: 2.6, sag: 0.2 }, { at: [17.5, 7.5], to: [21.5, 7.5], lanterns: true, h: 2.6, sag: 0.2 },
      // koi under the bridge
      ...[[6, 24, 20], [9, 24.4, -40], [7.5, 27.6, 70], [10, 27.2, 160], [6.5, 23.6, 110]].map(([x, y, r], i) => ({ at: [x, y], prop: 'bush', col: i % 2 ? '#f0f0e8' : '#ff8a30', scale: [0.22, 0.08, 0.5], rot: r, y0: -0.18 })),
      // the red bridge's arched handrails and the arch under its span (cables bowed upward), its posts
      ...[24.62, 26.38].map(y => beam([4.6, y], [11.4, y], 0.95, 0.95, 0.3, 0.035, '#c23a2a')).map(b => Object.assign(b, { sag: -0.28 })),
      ...[24.62, 26.38].map(y => beam([4.6, y], [11.4, y], 0.3, 0.3, 0.3, 0.07, '#a8302a')).map(b => Object.assign(b, { sag: -0.3 })),
      ...[5, 7, 9, 11].flatMap(x => [24.62, 26.38].map(y => beam([x, y], [x + 0.01, y], 0.3, x === 5 || x === 11 ? 0.95 : 1.2, 0.3, 0.03, '#c23a2a'))),
    ],
    entries: { from_route3: [19, 30, 'up'], from_route4: [31, 1, 'down'], from_center: [27, 26, 'down'], from_house: [33, 26, 'down'], from_tea: [15, 16, 'down'], from_dojo: [29, 18, 'down'] },
    exits: [
      { at: [18, 31, 4, 1], to: 'kp_route3', entry: 'from_kurotsuki' },
      Object.assign({ at: [30, 0, 3, 1], to: 'kp_route4', entry: 'from_kurotsuki' }, W.gate(1, 'Gate Ninja', 'Halt. The cliff road north is for trainers with the Shuriken Badge. Earn it at the Arcade, then come back.')),
      { at: [27, 25, 1, 1], to: 'kp_kurotsuki_center', entry: 'from_town', sfx: 'door' },
      { at: [33, 25, 1, 1], to: 'kp_kurotsuki_house', entry: 'from_town', sfx: 'door' },
      { at: [15, 15, 1, 1], to: 'kp_kurotsuki_tea', entry: 'from_town', sfx: 'door' },
      { at: [29, 17, 1, 1], to: 'kp_kurotsuki_dojo', entry: 'from_town', sfx: 'door2' },
    ],
    npcs: [
      { id: 'kp_ku_gate', name: 'Gate Ninja', model: 'ninja3', at: [33, 2], dir: 'left',
        talk: function* (s) { yield s.say('Gate Ninja', KP.hasBadge(1) ? 'The Shuriken Badge. ...Very well. The cliff road to the north is open to you. Mind the sea spray.' : 'The cliff road north is for badge holders only. Lady Yuffie decides who is worthy. Her Arcade is down on the middle terrace.'); } },
      { id: 'kp_ku_spa', name: 'Bath Attendant', model: 'wutai_woman2', at: [5, 15], dir: 'left',
        talk: function* (s) {
          if (!D().party.length) { yield s.say('Bath Attendant', 'Welcome to the hot spring!'); return; }
          const c = yield s.ask('Bath Attendant', 'Welcome to the hot spring! A soak loosens up the stiffest gears. Shall your moogles take a dip?', ['Yes, please', 'No thanks']);
          if (c !== 0) return;
          s.sfx('heal2'); s.flash('#e0f4ff', 10, 0.5); KP.healAll();
          yield s.say('Bath Attendant', 'Ahh. Listen to them purr! All rested and polished, kupo.');
        } },
      { id: 'kp_ku_fan', name: 'Boy', model: 'wutai_kid', at: [22, 18], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Boy', KP.hasBadge(1) ? "You beat Lady Yuffie?! ...She's gonna say she let you win. She always says that." : "Lady Yuffie runs the Shuriken Arcade! She's the greatest ninja in the whole Kupo Isles!\fShe told me so herself. Twice."); } },
      { id: 'kp_ku_monk', name: 'Monk', model: 'wutai_elder2', at: [8, 9], dir: 'up',
        talk: function* (s) { yield s.say('Monk', 'The pagoda has five roofs, one for each virtue: patience, courage, honesty, kindness... and the fifth is a secret.\fLady Yuffie says the fifth is \"finders keepers.\" She is wrong.'); } },
      { id: 'kp_ku_koi', name: 'Old Man', model: 'wutai_elder', at: [12, 26], dir: 'left',
        talk: function* (s) { yield s.say('Old Man', "I've fed these koi every morning for forty years. The big gold one is named Gil. He's older than the bridge.\fThe moogles try to feed him too. He prefers the moogles' Kupo Nuts."); } },
      { id: 'kp_ku_seller', name: 'Lantern Maker', model: 'wutai_woman', at: [16, 24], dir: 'right',
        talk: function* (s) { yield s.say('Lantern Maker', "Every lantern on the street, I made by hand! When the festival comes, we light them all at once and the whole hill glows.\fThe Kurogen moogles always try to nap inside them. Little scamps."); } },
      W.moogle('kp_ku_mog1', 'kurogen_genin', [20, 25], { wander: 2, line: 'The Kurogen freezes, convinced you cannot see it if it does not move. You can.' }),
      W.moogle('kp_ku_mog2', 'chatmog_mediator', [30, 8], { wander: 2, line: 'The Chatmog bows politely, then asks for a Kupo Nut. Politely.' }),
    ],
    triggers: [
      W.sign([6, 8], 'The Kurotsuki Pagoda. Five roofs for five virtues. The doors are sealed; the monks say the top floor holds only a very old, very sleepy moogle.'),
      W.sign([4, 14], 'HOT SPRING - Soak your gears! (Bath attendant on duty.)'),
      W.sign([13, 7], 'A stone water basin. The water is clear and cold. A ladle rests across it.'),
      W.sign([14, 14], 'TEA HOUSE - Kupo-nut dumplings and green tea.'),
      W.sign([26, 24], 'MOG CENTER - Mog Repair, Mart and Mog Box inside, kupo!'),
      W.hidden('ku_garden', [2, 27], 'golden_nut', 2),
      W.hidden('ku_cherry', [23, 7], 'quick_nut', 2),
    ],
    items: [W.item('ku_shrine', [2, 1], 'hi_oil', 2), W.item('ku_bridge_gdn', [3, 29], 'battery')],
  });
  W.mogCenter('kp_kurotsuki_center', { name: 'Kurotsuki Mog Center', area: 'Kurotsuki', town: 'kp_kurotsuki', back: 'from_center', decor: 'wutai', look: KURO_IN,
    mart: ['kupo_nut', 'golden_nut', 'sprout_nut', 'quick_nut', 'roast_nut', 'familiar_nut', 'oil_can', 'hi_oil', 'fixit', 'battery'],
    npcs: [{ id: 'kp_kuc_ninja', name: 'Ninja', model: 'ninja', at: [9, 4], dir: 'left',
      talk: function* (s) { yield s.say('Ninja', "Slow-Roast Nuts for long battles, Familiar Nuts for the kinds you already have. A good ninja carries both.\fAnd a Spare Battery. A good ninja is often surprised."); } }] });
  W.house('kp_kurotsuki_house', { name: "The Elder's House", area: 'Kurotsuki', town: 'kp_kurotsuki', back: 'from_house', decor: 'wutai', look: KURO_IN,
    npcs: [{ id: 'kp_kuh_elder', name: 'Elder Gorou', model: 'wutai_elder', at: [3, 2], dir: 'down',
      talk: function* (s) {
        if (!KP.hasBadge(1)) { yield s.say('Elder Gorou', "So, you've come to challenge Yuffie. She was a little terror as a girl. Now she's a big terror with a dojo.\fHer Arcade is full of tricks: walls that aren't walls, and floors that aren't floors. Examine everything. Trust nothing. Battle everyone."); return; }
        yield s.say('Elder Gorou', 'The Shuriken Badge! Then the cliff road north is yours. Fernwick lies that way, in the giant trees.');
        if (s.flag('kp_kuh_gift')) return;
        s.set('kp_kuh_gift'); KP.give('familiar_nut', 3); s.sfx('found');
        yield s.msg('Received 3 Familiar Nuts!');
      } }] });
  W.house('kp_kurotsuki_tea', { name: 'Tea House', area: 'Kurotsuki', town: 'kp_kurotsuki', back: 'from_tea', decor: 'wutai', look: KURO_IN,
    grid: [
      "############",
      "#D..t..t..q#",
      "#..........#",
      "#.t..t..t..#",
      "#..........#",
      "#####+######",
    ],
    npcs: [
      { id: 'kp_kut_host', name: 'Tea Master', model: 'wutai_woman2', at: [1, 2], dir: 'right',
        talk: function* (s) { yield s.say('Tea Master', "Green tea and Kupo-nut dumplings! ...The dumplings are for the moogles. Mostly.\fLady Yuffie drinks her tea with nine sugars. Do not tell her I told you."); } },
      { id: 'kp_kut_guest', name: 'Traveler', model: 'man12', at: [6, 4], dir: 'up',
        talk: function* (s) { yield s.say('Traveler', "I tried the Arcade this morning. Fell through the floor three times! The mats with the slightly darker weave, they're the trapdoors. I noticed on the third fall."); } },
    ] });

  // ================================================================== THE SHURIKEN ARCADE (Dojo 1: Yuffie, Thief)
  // Yuffie's ninja house: false walls (cloth screens painted like the wall: walk through them; examining one gives it
  // away) and trapdoor mats (a slightly darker weave: step on one and you drop through the floor). Bag items are off.
  // THE SOLUTION:
  //   Floor 1 (kp_kurotsuki_dojo): beat Genin Kaz in the entrance hall; the hall's north wall has a false wall at x4
  //   (examine the swaying panel, or just walk north into it) into the west room; that room's east wall has another at
  //   (7,8) into the middle room (Genin Rin); north through the doorway at (11,5) into the ladder room; the ladder at
  //   (21,1) goes up. The open doorway at (18,11) is a decoy: its room is all trapdoor mats except along the east wall
  //   (x22) and the front row, where a Spare Battery waits at (22,6); a trapdoor drops you back to the entrance.
  //   Floor 2 (kp_kurotsuki_dojo_2): from the ladder, the safe mats (the paler weave) wind through the trapdoor field:
  //   up the column x3 from (3,13) to (3,10), east along row 10 to x8 (x9-12 run on to a dead end), up x8 to row 8,
  //   east along row 8 to x15, up x15 to row 6, west along row 6 to x11, then up to the landing (Kunoichi Suzu). A
  //   trapdoor drops you into the pit room on floor 1 (its false wall at (7,2) opens onto the ladder room). On the
  //   landing, examine the shuriken scroll beside the wall panel at (11,4): the panel spins open onto Yuffie's chamber.
  const DOJO = { sky: ['#000000', '#000000'], fog: null, wallH: 2.6, wall: '#5e3e26', trim: '#2a1a10', wallTop: '#1a120c',
    floor: ['#7a5a3a', '#725236'], floor2: ['#b2a46c', '#aa9c64'], floor3: ['#c6b67c', '#beae74'], lantern: '#ff6a40',
    ambient: [0.5, 0.46, 0.42], light: [0.82, 0.74, 0.6], floorTex: { floor: 'planks', floor2: 'carpet', floor3: 'carpet' }, wallTex: 'boards' };
  const DOJO_NINJA = { noBag: true, bg: 'dojo' };   // (battles: the trainers' theme; Shinobi plays on the floor)
  function* dropBack(s, entry, line) {
    s.sfx('falling'); s.shake(2, 12);
    yield s.msg('The mat gives way under your feet!');
    yield s.goto('kp_kurotsuki_dojo', entry);
    s.sfx('hit');
    yield s.say('Yuffie', line);
  }
  const trapsOf = (grid, run) => { const out = []; grid.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'x') out.push({ at: [x, y], once: false, run }); }); return out; };
  const falseWall = (x, y) => ({ at: [x, y], on: 'talk', run: function* (s) { yield s.msg('This bit of wall sways when you touch it... It\'s a cloth screen, painted to look like the wall!\fYou could walk right through it.'); } });
  const scroll = (at, text) => ({ at, prop: 'banner', w: 0.6, h: 1.1, y: 2.0, col: '#efe6cc', col2: '#6a2a1a', text: text, textCol: '#2a1a10', rot: 0 });
  const DK = [
    W.trainer(Object.assign({ id: 'kp_dj_kaz', cls: 'Genin', name: 'Kaz', model: 'ninja', at: [11, 13], dir: 'down', sight: [11, 14, 1, 2], team: [['kurogen_genin', 10], ['nutmog_thief', 10]], money: 400,
      line: "Welcome to the Shuriken Arcade! Nobody gets to Lady Yuffie without getting past me. Or past her walls. Mostly her walls.", lose: 'Ugh. Fine. Hint: the walls in here have more give than they should.', after: "A ninja never takes the obvious door. That's all I'm saying." }, DOJO_NINJA)),
    W.trainer(Object.assign({ id: 'kp_dj_rin', cls: 'Genin', name: 'Rin', model: 'ninja2', at: [11, 8], dir: 'left', sight: [8, 7, 3, 3], team: [['nutmog_thief', 11], ['kurogen_genin', 11]], money: 440,
      line: 'You found the cloth wall! Lady Yuffie will be furious. With ME, for being found.', lose: 'Okay, okay! The ladder is through the door to the north.', after: 'Upstairs is worse. The floor bites.' }, DOJO_NINJA)),
  ];
  FF7.defineMap('kp_kurotsuki_dojo', {
    name: 'Shuriken Arcade', area: 'Kurotsuki', theme: 'wutai', music: 'shinobi', kpBg: 'dojo', look: DOJO,
    grid: [
      "########################",
      "#m_____#...............#",
      "#______F_______________#",
      "#______#_______________#",
      "#______#m_____________J#",
      "###########.############",
      "#J_____#_____m#xxxxxxx_#",
      "#______#______#xxxxxxx_#",
      "#______F______#xxxxxxx_#",
      "#______#______#xxxxxxx_#",
      "#______#______#xxx_____#",
      "####F#############.#####",
      "#J____________________J#",
      "#______________________#",
      "#______________________#",
      "#______________________#",
      "#......................#",
      "###########+############",
    ],
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    legend: { F: 'kp_falsewall', x: 'kp_trapmat', _: 'floor3' },
    props: [
      { at: [21, 1], prop: 'ladder', face: 'n', h: 2.6 },
      scroll([2, 11], 'WIND'), scroll([8, 11], 'MOON'), scroll([14, 11], 'SHADOW'),
      { at: [11, 0], prop: 'banner', rot: 0, w: 3, h: 0.8, y: 2.3, col: '#2a3a6a', col2: '#e8d8a0', text: 'NO DOOR IS A DOOR' },
    ],
    entries: { from_town: [11, 16, 'up'], from_dojo2: [21, 2, 'down'], pit: [3, 2, 'down'] },
    exits: [
      { at: [11, 17, 1, 1], to: 'kp_kurotsuki', entry: 'from_dojo', sfx: 'door2' },
      { at: [21, 1, 1, 1], to: 'kp_kurotsuki_dojo_2', entry: 'from_dojo' },
    ],
    npcs: DK.map(t => t.npc).concat([
      { id: 'kp_dj_guide', name: 'Arcade Mog', model: { enemy: 'kp_nutmog_ninja', scale: 0.8 }, at: [5, 16], dir: 'up',
        talk: function* (s) { yield s.say('Arcade Mog', "Welcome to the Shuriken Arcade, kupo! Trainers only in here, so no bag items: only your moogles and your wits.\fLady Yuffie's at the top. Getting there is the hard part. ...I've been trying for two years, kupo."); } },
    ]),
    triggers: DK.map(t => t.trig).concat([
      falseWall(4, 11), falseWall(7, 8), falseWall(7, 2),
      W.sign([2, 11], 'A hanging scroll: "WIND. A wall that sways in the breeze is no wall at all."'),
      W.sign([8, 11], 'A hanging scroll: "MOON. The moon never takes the front door."'),
      W.sign([14, 11], 'A hanging scroll: "SHADOW. The floor you trust is the floor that drops you."'),
    ]),
    items: [W.item('dj_battery', [22, 6], 'battery')],
  });
  // every trapdoor mat ('x') in a floor's grid drops you: floor 1's back to the entrance
  const M1 = FF7.maps.kp_kurotsuki_dojo;
  M1.triggers = M1.triggers.concat(trapsOf(M1.grid, function* (s) { yield* dropBack(s, 'from_town', "(from somewhere above) Nyahaha! Back to the start with you! Watch your step, slowpoke!"); }));
  // floor 2: the trapdoor field, the spinning panel and Yuffie's chamber
  const SUZU = W.trainer(Object.assign({ id: 'kp_dj_suzu', cls: 'Kunoichi', name: 'Suzu', model: { base: 'woman', top: '#2a2a3a', bottom: '#2a2a3a', hairStyle: 'ponytail', hair: '#1a1a20', extras: ['mask', 'sash'] }, at: [9, 5], dir: 'right', sight: [10, 5, 4, 1],
    team: [['kurogen_genin', 11], ['chatmog_mediator', 11], ['nutmog_thief', 12]], money: 480,
    line: 'You crossed the floor without falling? ...Lady Yuffie will want to see you herself. After you get past me.', lose: 'Hmph. The scroll beside the panel. Look closely at it.', after: 'Examine the shuriken scroll by the wall panel. It turns the wall.' }, DOJO_NINJA));
  const panelOpen = s => FF7.state.flags.kp_dj_panel;
  function* spinScroll(s) {
    if (s.flag('kp_dj_panel')) { yield s.msg('The scroll of a shuriken. Behind it, the lever is already pulled.'); return; }
    yield s.msg('A hanging scroll of a great shuriken. Behind it... a lever!');
    s.set('kp_dj_panel'); s.sfx('gate'); s.shake(1, 16);
    yield s.msg('With a clunk, the wall panel spins round on a hidden pivot. The way is open!');
  }
  FF7.defineMap('kp_kurotsuki_dojo_2', {
    name: 'Shuriken Arcade', area: 'Kurotsuki', theme: 'wutai', music: 'shinobi', kpBg: 'dojo', look: DOJO,
    grid: [
      "######################",
      "#####J__________J#####",
      "#####____________#####",
      "#####m__________m#####",
      "###########.##########",
      "#########_____########",
      "#xxxxxxxxxx_____xxxxx#",
      "#xxxxxxxxxxxxx__xxxxx#",
      "#xxxxxxx________xxxxx#",
      "#xxxxxxx__xxxxxxxxxxx#",
      "#xx__________xxxxxxxx#",
      "#xx__xxxxxxxxxxxxxxxx#",
      "#xx__xxxxxxxxxxxxxxxx#",
      "#xx__xxxxxxxxxxxxxxxx#",
      "#.___________________#",
      "######################",
    ],
    heights: [
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    legend: { x: 'kp_trapmat', _: 'floor3' },
    props: [
      { at: [1, 14], prop: 'ladder', face: 's', h: 2.6 },
      scroll([10, 4], 'SPIN'), scroll([12, 4], 'TURN'),
      { at: [11, 0], prop: 'banner', rot: 0, w: 4, h: 1.0, y: 2.4, col: '#2a3a6a', col2: '#e8d8a0', text: 'SHURIKEN', text2: 'GREAT NINJA YUFFIE', textCol: '#f0e8c8' },
      ...[[7, 1], [14, 1]].map(([x, y]) => ({ at: [x, y], prop: 'banner', rot: 0, w: 1, h: 1.6, y: 2.3, col: '#a8302a', col2: '#e8d8a0', y0: 0 })),
    ],
    entries: { from_dojo: [2, 14, 'right'] },
    exits: [{ at: [1, 14, 1, 1], to: 'kp_kurotsuki_dojo', entry: 'from_dojo2' }],
    objects: [{ id: 'dj_panel', at: [11, 4], prop: 'kp_falsewall', solid: true, hidden: false, tick(o) { o.hidden = !!panelOpen(); o.solid = !o.hidden; },
      talk: function* (s) {   // (it stands so close to the scrolls that OK by either finds the panel first: it leads to the lever too)
        if (s.flag('kp_dj_panel')) return;
        yield s.msg('This wall panel sits a little loose in its frame, as if it could turn... A hanging scroll hangs on either side of it.');
        yield* spinScroll(s);
      } }],
    npcs: [SUZU.npc,
      W.master({ id: 'kp_yuffie', name: 'Yuffie', model: 'yuffie', at: [11, 1], badge: 1,
        team: [['kurogen_genin', 13], ['nutmog_treasure_hunter', 14], ['kurogen_kunoichi', 16]], money: 1300,
        reward: [['boost_thief', 1], ['quick_nut', 3]],
        intro: "Hey hey HEY! Nobody gets through my floor AND my wall on the first day! ...Did you cheat? You totally cheated.\fWhatever! I'm Yuffie, the greatest ninja in the whole Kupo Isles, and master of the Shuriken Arcade! You want my badge? Gotta take it, kupo-style!",
        lose: "Wha...!? No way! I was... I was going easy on you! Totally!",
        after: "Fine, FINE. You beat me fair and square. Mostly square.\fThat's the Shuriken Badge. With it, the Gate Ninja will let you up the cliff road north. Oh, and the Thief Gloves! They make Thief moves hit harder. Don't tell anyone I gave you my good gloves." }),
    ],
    triggers: [SUZU.trig,
      { at: [10, 4], on: 'talk', run: spinScroll }, { at: [12, 4], on: 'talk', run: spinScroll },
      W.sign([11, 6], 'Scratched into the floorboards: "Pale mats hold. Dark mats fold. - a fallen ninja"'),
    ],
  });
  // floor 2's trapdoors drop you into the pit room on floor 1
  const M2 = FF7.maps.kp_kurotsuki_dojo_2;
  M2.triggers = M2.triggers.concat(trapsOf(M2.grid, function* (s) { yield* dropBack(s, 'pit', "(from somewhere above) Nyahaha! Gotcha! The pit's a great place to think about your choices!"); }));
})();


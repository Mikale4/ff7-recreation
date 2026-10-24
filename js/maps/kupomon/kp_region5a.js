// Kupomon, Region 5a (docs/KUPOMON_WORLD.md; the user's two more dojos, 2026-10-02): the first half of a loop east of
// Ravenmoor. Ravenmoor's east gate (patched in below), Route 15 (the Cinder Moor), Candlerock (Dojo 7: Red XIII, the
// Ember Arcade, the Flame Badge; Bugenhagen's observatory) and Route 16 (Rustbowl Road, up to the ropeway to
// Glimmerfair: the other half, js/maps/kupomon/kp_region5b.js). Wild levels written old-scale (KP.LV). Maps kp_*: they
// run in Kupomon's sandbox. Dialogue in our own words. The Demo's steps: KP.PLANS.r5a at the end.
(function () {
  const KP = FF7.kupomon, W = KP.W;

  // ------------------------------------------------------------------ shared pieces (as kp_region4.js)
  // a one-way ledge the reach checks can see (W.ledge, tagged)
  const ledge = (at, dir = 'down', drop = 2) => Object.assign(W.ledge(at, dir, drop), { _ledge: [dir, drop] });
  // a stable pseudo-random number per tile (prop variety)
  const rnd = (x, y, k = 0) => { const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
  // props for every tile of the given characters: spec[ch](x, y) -> a props entry (without `at`), or null
  const deco = (grid, spec) => {
    const out = [];
    grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const f = spec[row[x]]; const p = f && f(x, y); if (p) out.push(Object.assign({ at: [x, y] }, p)); } });
    return out;
  };
  const flag = (f) => !!(FF7.state && FF7.state.flags && FF7.state.flags[f]);
  // the Mart: everything sold before (Bloomhaven and later)
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
  // a Mog Center with the full Mart
  const center = (id, def) => {
    W.mogCenter(id, Object.assign({ mart: MART_ALL }, def));
    const m = FF7.maps[id], talk = martMenu('Mart Mog', def.hello);
    m.npcs.find(n => n.id === 'merchant').talk = talk;
    m.triggers[1].run = talk;
  };
  // a townsperson: { id, name, model, at, dir, wander, lines (a string, or a function(s) -> string), show, anim, hover }
  const folk = (o) => ({ id: o.id, name: o.name, model: o.model, at: o.at, dir: o.dir || 'down', wander: o.wander || 0, anim: o.anim, hover: o.hover, show: o.show, faceOnTalk: o.faceOnTalk,
    talk: o.talk || function* (s) { const t = typeof o.lines === 'function' ? o.lines(s) : o.lines; yield s.say(o.name, t); } });
  // someone sitting by the fire (on a log bench)
  const sitter = (o) => Object.assign(folk(o), { anim: 'sit', hover: 0.14, faceOnTalk: false });
  // a cable between two points: rope-bridge hand ropes, lantern strings
  const rope = (a, b, h = 0.85, o = {}) => Object.assign({ at: a, to: b, h, h2: o.h2 != null ? o.h2 : h, sag: 0.22, col: '#8a6a40', r: 0.016, count: 1 }, o);
  const post = (x, y, h = 2.4) => ({ at: [x, y], prop: 'stump', scale: [0.45, h, 0.45], col: '#6a4a2a' });
  // a rope bridge running along x: its two hand ropes and four posts (x0/x1 the ends, y0/y1 the ropes' rows)
  const ropeBridgeX = (x0, x1, y0, y1, o = {}) => [rope([x0, y0], [x1, y0], 0.85, o), rope([x0, y1], [x1, y1], 0.85, o), post(x0, y0), post(x1, y0), post(x0, y1), post(x1, y1)];
  // the canyon's stone statues (Route 14's look): a model all in stone, on a plinth
  const STONE = '#8a7a6a';
  const stoneLook = (base) => ({ base, stone: STONE, skin: STONE, hair: STONE, top: STONE, top2: STONE, sleeve: STONE, jacket: STONE, bottom: STONE, boots: STONE, gloves: STONE, belt: STONE, eyes: '#6a5a4a' });

  // ================================================================== Ravenmoor's east gate
  // Ravenmoor (kp_region4.js) ended in a hedge on its east side; its main road (rows 18-19) now runs on through it, out
  // of the fog to Route 15. A warden keeps the gate for trainers with six badges.
  (function () {
    const M = FF7.maps.kp_ravenmoor; if (!M) return;
    const put = (x, y, ch) => { const r = M.grid[y]; M.grid[y] = r.slice(0, x) + ch + r.slice(x + 1); };
    for (const y of [18, 19]) { put(38, y, ':'); put(39, y, ':'); }
    for (let x = 24; x <= 37; x++) if (M.grid[19][x] === '.') put(x, 19, ':');   // (the road on from the square, past the Mog Center)
    put(38, 20, '!');
    // (the hedge's dead tree and bush at x39 go with it)
    M.props = (M.props || []).filter(p => !(Array.isArray(p.at) && p.at[0] === 39 && (p.at[1] === 18 || p.at[1] === 19)));
    M.entries.from_route15 = [38, 19, 'left'];
    M.exits.push({ at: [39, 18, 1, 2], to: 'kp_route15', entry: 'from_ravenmoor',
      ...W.gate(6, 'Gate Warden', "Hold it. Past this gate it's the Cinder Moor, and past that the canyons. No place for a trainer with fewer than six badges.\fCome back with the Chaos Badge from the mansion on the hill, and I'll lift the bar.") });
    M.npcs.push(
      folk({ id: 'rv_warden', name: 'Gate Warden', model: { base: 'man', top: '#3a3a4a', jacket: '#2a2a36', bottom: '#2a2a30', hairStyle: 'cap', extras: ['coat', 'mustache'] }, at: [38, 17], dir: 'down',
        lines: s => KP.badgeCount() >= 6
          ? "East is the Cinder Moor: the old burnt heath. The ground's warm underfoot. Then the canyons, and Candlerock at the bottom of them.\fFunny thing. Walk out of this gate and the sun comes up. Every time. Ravenmoor keeps the night; the moor gets the morning."
          : "This is the east gate. Six badges to pass. Rules are rules, even at midnight. ...Especially at midnight." }),
      folk({ id: 'rv_peddler', name: 'Candle Peddler', model: { base: 'woman', top: '#a05a2a', bottom: '#5a3a2a', hairStyle: 'bun', extras: ['apron', 'sash'] }, at: [36, 20], dir: 'up',
        lines: "Candles! Candlerock candles! Lit at the great Candle down in the canyon, so they never quite go out.\f...They go out. But they come back on if you're nice to them. Mostly. Ravenmoor folk buy dozens.\fThe road's east, over the moor. Follow the steam, then the red rocks." }),
    );
    M.triggers.push(W.sign([38, 20], 'EAST: Route 15, the Cinder Moor - Candlerock'));
    (M.lights = M.lights || []).push([38.5, 18.5, '#ffd890', 3]);
  })();

  // ================================================================== Route 15: the Cinder Moor
  // Out of Ravenmoor's night into the dawn: a high moor of burnt heather that has smouldered for a hundred years (warm
  // ground, vents that glow orange far down inside), dead trees, and the Moor Watch, a ruined watchtower on a knoll
  // (stairs up; its rubble hides something). Then the land breaks: the Ember Steps take the road down in two long
  // switchbacks over ledged terraces (one-way hops are the quick way) to the red-rock canyon that hides Candlerock, east,
  // past the Balanced Rock.
  KP.WILD.kp_route15 = [['sootkin_pyromancer', 14, 26, 28], ['dunemog_raider', 13, 26, 28], ['chopkin_ravager', 12, 26, 28], ['marimog_marilith', 10, 26, 28],
    ['luopom_luopan_sage', 10, 26, 28], ['nibelpom_peak_guide', 10, 26, 28], ['huntmog_trapper', 9, 26, 28], ['knucklin_lanista', 8, 27, 28],
    ['arenakupo_square_champion', 7, 26, 28], ['galimog_werebeast', 4, 27, 28], ['eikomog_dominant', 3, 27, 28]];
  const R15 = [
    "&%&&R&%&&&%&&R&&RRRRRRRRRRR&%&&R            ",   //  0
    "&,GGG&,,%,,,...oR.|x###x..xR,,RR            ",   //  1
    "&,&GG,,,,,,o....R...###x...R&,&U            ",   //  2
    "%!GGG,&,,&,,..o.Rx..###....RGGGR            ",   //  3
    ":::::::::,,,,,,,R........|.RG&GU            ",   //  4
    ":::::::::,,,o,,,RRRRR^^RRRRRGGGR            ",   //  5
    "%,,....::,,,,%GGGG,,::::,,%,,o,U            ",   //  6
    "&,,&...::::::GGGGG:::::::::::,,R            ",   //  7
    "&,,.o..::::::GGGGG:::::::::::,%U            ",   //  8
    "%%,...o.,,&,,GGGG,,,,,,,&..::::R            ",   //  9
    "&RRRRRRRRR,,,,,RRRRRRRRRRRRRR^^RRRRURRRRURRR",   // 10
    "  R,,,,,&,,,,,,,,,,,R,,,&,,,,^^,,,,,GGGGGGUR",   // 11
    "  &,,,,,,,,&,,GGGGG,,,,,,,,,dddd,&,,GGGGGG,R",   // 12
    "  R,ddddddddddGGGGGGdddddddddddd,,,,GGGGGG,U",   // 13
    "  R,ddddddddddGGGGGGdddddddddddd,,,,,,,,,R,R",   // 14
    "  UR^^R,,,R,,,,GGGGG,,,,,,,,,,,,,,,R,,,U,,,R",   // 15
    "  RR^^R&,,,,U,,,,,,,,,U,,,&,,,,U,,,,,,,,,,,R",   // 16
    "   Rdd!sssssssssUsssssssssssssUsssUssssssUsR",   // 17
    "   RddsUsssRss%ssssssGGGGGssssssssssssRssssR",   // 18
    "   RddddddddddddddddGGGGGGdddddddddddddddddd",   // 19
    "   RddddddddddddddddGGGGGGdddddddddddddddddd",   // 20
    "   RRsRsssssssssssssGGGGGGssssssssssssssdddR",   // 21
    "         RssGGGGGGssss%sssRssssssRUssssss!sR",   // 22
    "         RsRGGGGGGsUssssRssss$$$ssssUs%ssssR",   // 23
    "         RUssGGGGGsssssssssUsssssssssss%RssR",   // 24
    "         RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",   // 25
  ];
  const R15H = [
    "77777777777777777999999999977777000000000000",
    "77777777777777778999999999987777000000000000",
    "77777777777777778999999999987777000000000000",
    "77777777777777778999999999987777000000000000",
    "77777777777777778999999999987777000000000000",
    "77777777777777778888888888887777000000000000",
    "77777777777777777777777777777777000000000000",
    "77777777777777777777777777777777000000000000",
    "77777777777777777777777777777777000000000000",
    "77777777777777777777777777777777000000000000",
    "76666666667777766666666666666666555555555555",
    "00444444444444444444444444444554444444444445",
    "00444444444444444444444444444444444444444445",
    "00444444444444444444444444444444444444444445",
    "00444444444444444444444444444444444444444445",
    "00443344444444444444444444444444444444444445",
    "00443344444444444444444444444444444444444445",
    "00021111111111111111111111111111111111111112",
    "00021111111111111111111111111111111111111112",
    "00021111111111111111111111111111111111111111",
    "00021111111111111111111111111111111111111111",
    "00022111111111111111111111111111111111111112",
    "00000000021111111111111111111111111111111112",
    "00000000021111111111111111111111111111111112",
    "00000000021111111111111111111111111111111112",
    "00000000022222222222222222222222222222222222",
  ];
  const R15T = [
    W.trainer({ id: 'r15_sol', cls: 'Firebreather', name: 'Sol', model: { base: 'man', top: '#b8401c', bottom: '#3a2a20', skin: '#c88a5a', hairStyle: 'buzz', extras: ['vest', 'headband'] },
      at: [11, 5], dir: 'down', sight: [11, 6, 1, 3],
      line: "Feel that? The ground's warm. A hundred years ago the whole moor burned, and down below it never quite stopped. Neither do I!",
      lose: 'Fizzled out... like a match in a puddle.', after: "Every vent on the moor breathes a little steam. Lean over one and you get a free facial. ...Don't, actually.",
      team: [['eikomog_dominant', 28], ['tosspom_bomber', 27], ['kaosmog_void_warrior', 28]], money: 1360 }),
    W.trainer({ id: 'r15_dusty', cls: 'Ruin Maniac', name: 'Dusty', model: { base: 'man', hairStyle: 'cap', top: '#a89878', bottom: '#5a4a32', extras: ['glasses', 'vest', 'beard'] },
      at: [23, 4], dir: 'left', sight: [21, 4, 2, 1],
      line: "The Moor Watch kept an eye on this heath for a thousand years. Now it keeps an eye on me. And I keep an eye on YOU. Battle!",
      lose: 'Crumbled. Like the tower.', after: "Somebody stashed something in the rubble by the tower's west wall. I'd dig for it, but my back's older than the tower.",
      team: [['moguta_chocographer', 28], ['filchpom_cat_burglar', 27], ['lowpom_rogue', 28]], money: 1360 }),
    W.trainer({ id: 'r15_rook', cls: 'Black Belt', name: 'Rook', model: { base: 'man', top: '#f0ece0', bottom: '#f0ece0', hairStyle: 'buzz', build: 'big', extras: ['belt', 'headband'] },
      at: [21, 12], dir: 'down', sight: [21, 13, 1, 2],
      line: "Hah! I train on the Ember Steps: down a terrace, up a terrace, all day long! Let's see your moogles' footwork!",
      lose: 'Knocked off my own terrace!', after: "Red XIII's pupils train in a cave under Candlerock, in the dark. I tried it once. I walked into a wall. Twice.",
      team: [['luchapom_luchador', 27], ['blitzpom_blitz_master', 28], ['kenkupo_parivir', 27]], money: 1360 }),
    W.trainer({ id: 'r15_heath', cls: 'Ranger', name: 'Heath', model: { base: 'woman', top: '#6a7438', bottom: '#4a3a2a', hairStyle: 'ponytail', hair: '#7a3a1a', extras: ['vest', 'armguard'] },
      at: [28, 18], dir: 'down', sight: [28, 19, 1, 2],
      line: "I've walked this canyon a hundred times, and my moogles know every rock in it. Do yours?",
      lose: 'Lost my footing. For once.', after: "Candlerock's just past the Balanced Rock. When you see a flame that doesn't flicker, you're there.",
      team: [['rosekin_wild_rose', 27], ['kumop_rebel_leader', 28], ['vierkin_seer', 28]], money: 1360 }),
  ];
  const deadTree = (x, y) => ({ prop: 'coraltree', col: y < 11 ? '#2e2a28' : '#4a3a30', col2: y < 11 ? '#5a3020' : '#6a4a34', h: 1.9 + rnd(x, y) * 1.3 });
  const VENTS = [];
  R15.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'o') VENTS.push([x, y]); });
  FF7.defineMap('kp_route15', {
    name: 'Route 15', area: 'Route 15', theme: 'canyon', music: 'othermountain', kpWild: 'kp_route15', kpBg: 'mountain',
    look: { sky: ['#2a2442', '#f0a066'], fog: { color: [0.52, 0.42, 0.42], near: 14, far: 34 }, ambient: [0.46, 0.4, 0.42], light: [0.95, 0.74, 0.6],
      grass: ['#5e5a46', '#585440'], floor: ['#4a4440', '#443e3a'], floor2: ['#6e6054', '#66584c'], dirt: ['#8a4a2e', '#82442a'], sand: ['#c8925e', '#c08a56'],
      wall: '#8a4a30', wallTex: { wall: 'rock' }, floorTex: { floor2: 'cobble' } },
    grid: R15, heights: R15H,
    legend: { '&': 'coraltree', U: 'spire', o: 'hole' },
    props: deco(R15, {
      '&': deadTree,
      U: (x, y) => ({ prop: 'spire', col: y < 11 ? '#7a5a4a' : '#a85a36', h: 1.5 + rnd(x, y) * 1.4, r: 0.55 + rnd(x, y, 2) * 0.3 }),
      o: () => ({ prop: 'hole', r: 0.36, col: '#ff7a30', col2: '#3a3230' }),
      R: (x, y) => ({ prop: 'rock', col: y < 11 ? '#6a5e56' : '#a0603e', scale: 1.1 + rnd(x, y) * 0.3 }),
      '%': () => ({ prop: 'bush', col: '#5a4a3a' }),
      x: () => ({ prop: 'rock', col: '#7a726a', scale: [0.9, 0.5, 0.9] }),
      '|': () => ({ prop: 'pillar', h: 1.4, col: '#7a726a', col2: '#6a625a' }),
    }).concat([
      // the Balanced Rock by the canyon road, just before Candlerock: a boulder on the tip of a spire
      { at: [34.01, 22.01], prop: 'rock', col: '#b06038', scale: [2.2, 1.5, 1.9], lift: 1.5 + rnd(34, 22) * 1.4 - 0.15 },
      // a pilgrim's broken cart by the road
      { at: [30, 23], vehicle: 'wagon' },
    ]),
    buildings: [{ at: [20, 1, 3, 3], h: 4.4, col: '#6a625a', roof: '#4a4440', top: 'flat', tex: 'stoneblock', win: false }],
    labels: [{ at: [21, 3], face: 's', text: 'MOOR WATCH', size: 0.12, col: '#d8c8a8', y: 2.4 }],
    lights: VENTS.map(([x, y]) => [x, y, '#ff7a30', 1.8]).concat([[21, 4, '#ffd8a0', 3]]),
    entries: { from_ravenmoor: [1, 4, 'right'], from_candlerock: [42, 19, 'left'] },
    exits: [
      { at: [0, 4, 1, 2], to: 'kp_ravenmoor', entry: 'from_route15' },
      { at: [43, 19, 1, 2], to: 'kp_candlerock', entry: 'from_route15' },
    ],
    npcs: R15T.map(t => t.npc).concat([
      folk({ id: 'r15_burner', name: 'Charcoal Burner', model: { base: 'oldman', top: '#3a3430', bottom: '#2a2622', hairStyle: 'bald', extras: ['beard', 'apron'] }, at: [8, 9], dir: 'up',
        lines: "Ravenmoor keeps the midnight; the moor gets the dawn. Out here it's always just about to be morning.\fThe heather caught fire a hundred years back and the ground's been warm ever since. I bake bread on it. Bit of ash in the crust. Adds character." }),
      folk({ id: 'r15_pilgrim', name: 'Pilgrim', model: { base: 'woman', top: '#d8c8a0', bottom: '#8a6a4a', hairStyle: 'longstraight', skirt: 'long', extras: ['robe', 'sash'] }, at: [12, 18], dir: 'right',
        lines: "I'm walking to Candlerock to sit by the Candle. They say if you sit there long enough, you can hear the Planet humming.\fI've been walking three days. So far all I can hear is my feet." }),
      W.moogle('r15_mog1', 'sootkin_stoker', [13, 2], { wander: 2, line: 'Sootkin: Kupo-hoff! It warms its paws over a vent and sneezes out a smoke ring.' }),
      W.moogle('r15_mog2', 'condorpom_fort_lookout', [31, 23], { wander: 2, line: 'Condorpom: Kweh-po! It salutes the sunrise with one wing.' }),
    ]),
    items: [W.item('r15_moor', [30, 3], 'royal_nut', 2), W.item('r15_tower', [24, 1], 'boost_warrior'), W.item('r15_nook', [41, 12], 'max_oil', 2), W.coins('r15_coins', [17, 24], 800)],
    triggers: [
      W.sign([1, 3], 'ROUTE 15 - THE CINDER MOOR\fWest: Ravenmoor.   East: Candlerock.\fThe ground is warm. Mind the vents.'),
      W.sign([6, 17], 'THE EMBER STEPS\fYou have come down off the moor. Candlerock lies east, along the canyon floor.'),
      W.sign([41, 22], 'CANDLEROCK, just ahead!\fHome of the Candle that never goes out, and of the Ember Arcade.'),
      W.hidden('r15_rubble', [19, 1], 'lucky_pom'),
      { at: [21, 3], on: 'talk', run: function* (s) { yield s.msg('A worn plaque on the tower: "MOOR WATCH. The fire bell rang here for the last time a hundred years ago."\fThe bell is long gone. Something has built a nest of twigs where it used to hang.'); } },
      { at: [12, 5], on: 'talk', run: function* (s) { yield s.msg('A crack in the ground breathes warm, sulphur-smelling steam. Far down inside, something glows orange.'); } },
      { at: [34, 22], on: 'talk', run: function* (s) { yield s.msg('THE BALANCED ROCK. A boulder as big as a house sits on the tip of a needle of stone.\fIt has looked about to fall for a thousand years. The canyon folk say it is waiting for something. Nobody knows what.'); } },
      ledge([10, 10, 5], 'down', 1), ledge([35, 16, 4], 'down', 1),
    ].concat(R15T.map(t => t.trig)),
  });

  // ================================================================== Candlerock: the town round the Candle
  // A canyon town of our own (Cosmo Canyon's spirit), built up the north wall of a red canyon on three levels. On the
  // canyon floor, the plaza: the Candle, a flame in a ring of stones that has never gone out (travellers come from all
  // over the Isles to sit by it), the spring pool under the cleft, the Mog Center, the travellers' camp, and the Ember
  // Arcade's door in the cliff (Dojo 7: Red XIII). Up the west stairs (or the east ladder): the middle terrace, the
  // herbalist's and the canyon guide's houses, the hanging garden and the lookout, a rope bridge over the cleft where
  // the spring falls. Up the stairs at its east end: the top, and Bugenhagen's observatory under its dome. West: Route
  // 15. East, through the gorge (the Flame Badge): Route 16. The Arcade stays shut until the stars have been seen with
  // Bugenhagen and Red XIII (kp_cr_planetarium): Red XIII goes down to wait for you after it.
  const CR = [
    "########################################",   //  0
    "#########UUR....hhhhhhh.....RUU#########",   //  1
    "#########UU.....hhhhhhh......UU#########",   //  2
    "#########UU.....hwh+hwh........#########",   //  3
    "#########...:::...:::....!.....#########",   //  4
    "#########...:::...:~~:....R^^R.#########",   //  5
    "#########..........~~.....R^^R.#########",   //  6
    "#########..........~~..........#########",   //  7
    "##.hhhhh..hhhhh....~~.%fff%.....fffff.##",   //  8
    "##.hhhhh..hhhhh....KK..fff......f,,,f.##",   //  9
    "##.hh+hh..hh+hh....~~...Y.......fffff.##",   // 10
    "##.................~~...............!.##",   // 11
    "##.^^..............~~.................##",   // 12
    "###^^#######+######~~#############H#####",   // 13
    "##U::......m:m...R~~~~R...U...........##",   // 14
    "##.::hhhhh.:::...~~~~~~.....hhhhhh...U##",   // 15
    "##.::hhhhh.:::...~~~~~~.....hhhhhh....##",   // 16
    "##.::wh+hh.:::..............hhhhhh....##",   // 17
    "##.::......:::..............hh+hwh....##",   // 18
    "##R::......:::.!..........%...::......##",   // 19
    "##.::....%.:::................::::::::::",   // 20
    "##.::......:::.....00.........::::::::::",   // 21
    "##U::......:::.....00.........::......##",   // 22
    "##.::......:::................::....R.##",   // 23
    "::::::::::::::::::::::::::::::::::::::##",   // 24
    "::::::::::::::::::::::::::::::::::::::##",   // 25
    "##...............................%....##",   // 26
    "##..A..A..R.....%...........R........U##",   // 27
    "##...@........U.........U.............##",   // 28
    "########################################",   // 29
    "########################################",   // 30
    "########################################",   // 31
  ];
  const CRH = [
    "9999999999999999999999999999999999999999",
    "9999999999999999999999999999999999999999",
    "9999999999999999999999999999999999999999",
    "9999999999999999999999999999999999999999",
    "9999999999999999999999999999999999999999",
    "9999999999999999999889999997799999999999",
    "9999999999999999999009999997799999999999",
    "9999999995555555555005555555555999999999",
    "9955555555555555555005555555555555555599",
    "9955555555555555555555555555555555555599",
    "9955555555555555555005555555555555555599",
    "9955555555555555555005555555555555555599",
    "9953355555555555555005555555555555555599",
    "9903300000000000000000000000000000000099",
    "9910000000000000000000000010000000000099",
    "9900000000000000000000000000000000000199",
    "9900000000000000000000000000000000000099",
    "9900000000000000000000000000000000000099",
    "9900000000000000000000000000000000000099",
    "9910000000000000000000000010000000000099",
    "9900000001000000000000000000000000000000",
    "9900000000000000000000000000000000000000",
    "9910000000000000000000000000000000000000",
    "9900000000000000000000000000000000001000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000001000000",
    "0000000000100000100000000000100000000100",
    "0000000000000010000000001000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
  ];
  const CR_STARS = 'kp_cr_planetarium';
  const crArrive = function* (s) {
    if (s.flag('kp_cr_arrived')) return;
    s.set('kp_cr_arrived');
    s.emote('cr_elder', '!');
    yield s.move('cr_elder', [[8, 23], [4, 23]]);
    yield s.face('cr_elder', 'player'); yield s.face('player', 'cr_elder');
    yield s.say('Elder Hama', "Ho there! Another traveller down off the moor. Welcome to Candlerock.");
    yield s.cam(19.5, 21.5, 70, { dist: 11, pitch: 42 });
    yield s.say('Elder Hama', "There it is: the Candle. It was burning before the first house was built here, and it has never once gone out. Not in the great storms, not in the dry years.\fFolk come from all over the Isles just to sit by it. Moogles too. Nobody quite knows why. They just like it there.");
    yield s.cam(19, 3, 80, { dist: 12, pitch: 38 });
    yield s.say('Elder Hama', "And up there, under the dome, is old Bugenhagen's observatory. If it's the Flame Badge you're after, Master Red XIII is up there with him: he goes up every evening to look at the stars with his grandfather.");
    s.camFollow(50);
    yield 50;
    yield s.say('Elder Hama', "Up the west steps, across the rope bridge, then the steps at the east end. Mind the bridge: it sways when the spring is loud.");
    yield s.move('cr_elder', [[8, 23], [8, 22]]);
    yield s.face('cr_elder', 'left');
  };
  const pupilLines = (s) => !s.flag(CR_STARS)
    ? "The Ember Arcade is shut for now, sorry! The master is up at the observatory with his grandfather. He always goes up to see the stars before a big battle.\fGo up and say hello. Bugenhagen loves visitors. He'll talk your ear off, but in a nice way."
    : s.flag('kp_badge_7') ? "You beat the master! The whole canyon heard him laughing. We didn't know he could do that."
      : "The master's waiting at the end of the Arcade. Remember the Guardian! Nose, ear, heart, paw, and the tail-flame last.";
  // the Candle: its flame, the ring of flagstones round it, a circle of log benches and low stones
  const CANDLE = [19.5, 21.5];
  const ringAt = (r, a) => [CANDLE[0] + r * Math.cos(a), CANDLE[1] + r * Math.sin(a)];
  FF7.defineMap('kp_candlerock', {
    name: 'Candlerock', area: 'Candlerock', theme: 'cosmo', music: 'cosmo',
    look: { floor: ['#b47a50', '#ac744a'], floor2: ['#8a5a3a', '#825434'], wall: '#9a5a38', wallTop: '#8a5032', water: '#3a8ab0', roof: '#8a5a3a', lamp: '#ffc070',
      flowers: ['#e08040', '#f0c040'], sky: ['#3a2a5a', '#f0a060'], wallTex: { wall: 'rock' }, floorTex: { floor: 'stone', floor2: 'cobble' } },
    camera: { pitch: 48, dist: 10.5 },
    grid: CR, heights: CRH,
    legend: { U: 'spire', '0': 'block' },
    buildings: [
      // the band: the cliff between the plaza and the middle terrace (its top is the terrace's edge)
      { at: [2, 13, 36, 1], h: 1.5, col: '#9a5a38', roof: '#b47a50', top: 'flat', win: false, tex: 'rock' },
      { at: [16, 1, 7, 3], h: 2.4, col: '#d8ccb4', roof: '#9a8a70', top: 'flat', tex: 'stoneblock', win: '#a8d0ff' },       // the observatory
      { at: [3, 8, 5, 3], h: 1.8, col: '#c88a5a', roof: '#5a7a38', top: 'flat', win: '#ffd890', tex: 'plaster' },          // the herbalist's (a roof garden)
      { at: [10, 8, 5, 3], h: 2.0, col: '#b8784a', roof: '#8a4a2a', top: 'shed', rise: 0.5, win: '#ffd890', tex: 'plaster' },
      { at: [5, 15, 5, 3], h: 1.8, col: '#c8925e', roof: '#a05a30', top: 'flat', win: '#ffd890', tex: 'plaster' },           // the kid's house
      { at: [28, 15, 6, 4], h: 2.2, col: '#e0ccb0', roof: '#d05a6a', top: 'hip', rise: 0.8, win: '#ffe0b0', tex: 'plaster' }, // the Mog Center
    ],
    props: deco(CR, {
      U: (x, y) => ({ prop: 'spire', col: '#a85a36', h: 1.6 + rnd(x, y) * 1.6, r: 0.6 + rnd(x, y, 1) * 0.3 }),
      R: () => ({ prop: 'rock', col: '#9a5a3a' }),
      '%': () => ({ prop: 'bush', col: '#6a7a3a', scale: 0.8 }),
      Y: () => ({ prop: 'stump', col: '#6a4a2a' }),
      A: (x) => ({ prop: 'tent', col: ['#c84a2a', '#e0b050', '#4a7ab0'][x % 3] }),
      m: () => ({ prop: 'urn', col: '#5a3a2a', col2: '#c8a050' }),
    }).concat([
      // the Candle
      { at: CANDLE, prop: 'disc', r: 2.7, h: 0.05, sides: 20, col: '#6a4a36', top: '#8a6a50', rim: '#735640', ring: '#7e5e46' },
      { at: CANDLE, prop: 'campfire', size: 3.2, col: '#ffb040', col2: '#5a4a40' },
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({ at: ringAt(2.5, i * Math.PI / 6 + 0.26), prop: 'rock', col: '#7a6a5a', scale: [0.45, 0.32, 0.45] })),
      // log benches round it, where the travellers sit
      { at: [17, 21], prop: 'bench', w: 1, rot: 90, col: '#6a4a2a' }, { at: [22, 22], prop: 'bench', w: 1, rot: -90, col: '#6a4a2a' }, { at: [19, 23.2], prop: 'bench', w: 1.4, rot: 180, col: '#6a4a2a' },
      // the spring: its fall down the cleft, the spray, the rope bridge over it
      { at: [19, 6], prop: 'waterfall', scale: [1, 2.0, 1] }, { at: [20, 6], prop: 'waterfall', scale: [1, 2.0, 1] },
      ...ropeBridgeX(18.6, 21.4, 8.6, 9.4),
      // the observatory: its dome and the great telescope
      { at: [19, 2], prop: 'disc', r: 2.2, h: 0.18, lift: 2.4, sides: 16, col: '#c8bca4', top: '#bcb098' },
      { at: [19.01, 2.01], prop: 'tank', r: 1.7, h: 1.1, lift: 2.5, col: '#e4dcc8', rust: false },
      { at: [20.2, 1.6], to: [22.6, -0.4], h: 3.3, h2: 4.6, sag: 0, r: 0.12, count: 1, col: '#9a7a40' },
      // the Arcade's door: a dark cave mouth in the cliff, posts and a lintel, braziers either side
      { at: [12, 13.52], prop: 'banner', w: 1.0, h: 1.3, y: 1.4, col: '#0a0604', col2: '#0a0604', border: false },
      { at: [11.45, 13.6], prop: 'stump', scale: [0.5, 6.4, 0.5], col: '#5a3a1a' }, { at: [12.55, 13.6], prop: 'stump', scale: [0.5, 6.4, 0.5], col: '#5a3a1a' },
      { at: [11.2, 13.62], to: [12.8, 13.62], h: 1.45, sag: 0, r: 0.06, col: '#5a3a1a', count: 1 },
      { at: [11.01, 14.01], prop: 'flames', size: 0.6, col: '#ffa040', lift: 0.75 }, { at: [13.01, 14.01], prop: 'flames', size: 0.6, col: '#ffa040', lift: 0.75 },
      // strings of lanterns over the plaza, from poles
      ...[[24.5, 23.5], [14.5, 19.5], [24.5, 19.5], [14.5, 23.5]].map(([x, y]) => post(x, y, 5.8)),
      rope([14.5, 19.5], [24.5, 19.5], 2.6, { lanterns: '#ffb060', sag: 0.5, r: 0.012, col: '#3a2a1a' }),
      rope([14.5, 23.5], [24.5, 23.5], 2.6, { lanterns: '#ffb060', sag: 0.5, r: 0.012, col: '#3a2a1a' }),
      // the camp's fire, the lookout's telescope, potted plants on the herbalist's roof
      { at: [33.6, 9.2], prop: 'tank', r: 0.08, h: 0.9, col: '#8a6a3a', rust: false },
      ...[[3.6, 8.4], [5.2, 8.6], [6.8, 8.3]].map(([x, y]) => ({ at: [x, y], prop: 'planter', r: 0.3, h: 0.25, lift: 1.8, col: '#8a5a3a', col2: '#5a8a3a', plant: 'bush' })),
    ]),
    labels: [
      { at: [12, 13], face: 's', text: 'EMBER ARCADE', size: 0.11, col: '#ffb060', y: 1.62, glow: true },
      { at: [30.5, 15], face: 's', text: 'MOG CENTER', size: 0.15, col: '#e07a9a', y: 2.0, glow: true },
      { at: [19, 1], face: 's', text: 'OBSERVATORY', size: 0.12, col: '#e8e0c8', y: 1.72 }   /* (under the dome's brim at 2.15: over the door) */,
    ],
    lights: [[CANDLE[0], CANDLE[1], '#ffb050', 7], [12, 14, '#ffa040', 3], [19.5, 3.5, '#a8d0ff', 3], [5, 28, '#ffa040', 3], [30, 19, '#ffd0a0', 3], [19.5, 9, '#c8e8ff', 2]],
    entries: { from_route15: [1, 24, 'right'], from_route16: [38, 20, 'left'], from_center: [30, 19, 'down'], from_kid: [7, 18, 'down'], from_herbalist: [5, 11, 'down'],
      from_guide: [12, 11, 'down'], from_observatory: [19, 4, 'down'], from_dojo: [12, 14, 'down'] },
    exits: [
      { at: [0, 24, 1, 2], to: 'kp_route15', entry: 'from_candlerock' },
      { at: [39, 20, 1, 2], to: 'kp_route16', entry: 'from_candlerock',
        ...W.gate(7, 'Canyon Warden', "The gorge north is Rustbowl Road: scrap thieves, river crossings and a ropeway up a cliff. The elders say no trainer goes that way without the Flame Badge.\fWin it from Master Red XIII in the Ember Arcade, and I'll stand aside.") },
      { at: [30, 18, 1, 1], to: 'kp_candlerock_center', entry: 'from_town', sfx: 'door' },
      { at: [7, 17, 1, 1], to: 'kp_candlerock_kid', entry: 'from_town', sfx: 'door' },
      { at: [5, 10, 1, 1], to: 'kp_candlerock_herbalist', entry: 'from_town', sfx: 'door' },
      { at: [12, 10, 1, 1], to: 'kp_candlerock_guide', entry: 'from_town', sfx: 'door' },
      { at: [19, 3, 1, 1], to: 'kp_candlerock_observatory', entry: 'from_town', sfx: 'door' },
      { at: [12, 13, 1, 1], to: 'kp_candlerock_dojo', entry: 'from_town', sfx: 'door', if: s => s.flag(CR_STARS),
        blocked: function* (s) { yield s.say('Ember Pupil', pupilLines(s)); } },
    ],
    npcs: [
      folk({ id: 'cr_elder', name: 'Elder Hama', model: 'cosmo_elder', at: [8, 22], dir: 'left',
        lines: s => s.flag('kp_badge_7') ? "The Flame Badge! Ho! The Candle burned a little brighter last night. I'd like to think it was for you."
          : "Sit by the Candle a while, traveller. Everyone does. It doesn't ask anything of you, which is more than most fires can say.\fThe observatory is at the very top: the west steps, the rope bridge, then the steps at the east end." }),
      sitter({ id: 'cr_trav1', name: 'Sailor', model: { base: 'man7', top: '#f0f0f8', bottom: '#2a3a6a', hairStyle: 'cap', extras: ['beard'] }, at: [17, 21], dir: 'right',
        lines: "Came all the way from the Seabreeze Coast to see the Candle. Thirty years at sea, and I've never seen a flame sit so still.\fThe wind comes howling down the canyon every night, and it doesn't so much as lean." }),
      sitter({ id: 'cr_trav2', name: 'Scholar', model: { base: 'woman', top: '#4a5a8a', bottom: '#3a3a4a', hairStyle: 'bob', extras: ['glasses', 'coat'] }, at: [22, 22], dir: 'left',
        lines: "I came from Skyport to study the Candle. Six months of notes so far. They say: 'It is warm.' 'It is still warm.' 'Very warm today.'\fI think I'll stay another six. The moogles that sleep by it hum in their sleep. I'd like to know why." }),
      sitter({ id: 'cr_trav3', name: 'Old Pilgrim', model: 'oldman6', at: [19, 23], dir: 'up',
        lines: "I walked here from Pomville, when I was young. I meant to stay a night. That was forty years ago.\f...It's a very comfortable bench." }),
      folk({ id: 'cr_pupil', name: 'Ember Pupil', model: 'cosmo_villager', at: [14, 15], dir: 'left', lines: pupilLines }),
      folk({ id: 'cr_warden', name: 'Canyon Warden', model: { base: 'cosmo_villager2', top: '#8a3a20', extras: ['vest', 'belt', 'armguard'] }, at: [36, 19], dir: 'down',
        lines: s => s.flag('kp_badge_7') ? "The Flame Badge. Then the gorge is yours. Follow the river north; the ropeway's at the far end, up on the rim."
          : "This gorge leads north to Rustbowl Road. Only trainers with the Flame Badge go that way. Master's rules." }),
      folk({ id: 'cr_camper', name: 'Camper', model: { base: 'man', top: '#5a7a4a', bottom: '#5a4a3a', hairStyle: 'longmessy', extras: ['vest'] }, at: [6, 26], dir: 'down',
        lines: "There's no inn in Candlerock, so us pilgrims camp down here under the canyon wall. Every night somebody plays a fiddle and the moogles come and sit round the fire.\fThey don't dance. They just... listen. Then they go 'kupo' all together at the end, like applause." }),
      folk({ id: 'cr_student', name: 'Student', model: { base: 'girl', top: '#c8b890', bottom: '#6a4a2a', hairStyle: 'braid', extras: ['glasses'] }, at: [23, 5], dir: 'left',
        lines: "I came to study with Bugenhagen. He's over a hundred! And he was a Kupo League champion, the 9th. There's a statue of him at the Coliseum.\fHe says the trick to winning was listening to his moogles. I asked him how. He said 'with your ears, child', and went back to his telescope." }),
      folk({ id: 'cr_lookout', name: 'Lookout', model: { base: 'man', top: '#a07040', bottom: '#4a3a2a', hairStyle: 'cap', extras: ['vest', 'goggles'] }, at: [33, 10], dir: 'up',
        lines: "From up here you can see clear over the gorge. North of it the canyon drops to the river: Rustbowl Road. Scrap thieves, mostly harmless.\fAt the far end there's a ropeway up the cliff to Glimmerfair. You can see its lights at night, up on the mesa. It never sleeps up there." }),
      W.moogle('cr_mog1', 'twinklin_stargazer', [13, 5], { wander: 2, line: 'Twinklin: Kupo~! It is staring straight up at the sky, very seriously.' }),
      W.moogle('cr_mog2', 'luopom_bellringer', [25, 22], { wander: 2, line: 'Luopom: Ting-kupo! Its little bell rings in time with the Candle\'s crackle.' }),
      W.moogle('cr_mog3', 'terrapom_dowser', [16, 17], { wander: 1, line: 'Terrapom: Kupo-plip. It dips a twig at the spring pool and looks very pleased with itself.' }),
    ],
    items: [W.item('cr_garden', [35, 9], 'golden_nut', 3)],
    triggers: [
      { id: 'cr_arrive', at: [2, 24, 1, 2], once: false, if: s => !s.flag('kp_cr_arrived'), run: crArrive },
      W.sign([15, 19], 'CANDLEROCK\fThe Town of the Undying Flame.\fAll who come to sit by the Candle are welcome.'),
      W.sign([25, 4], 'A STAR CHART on a painted board: five gold stars joined in the shape of a great beast. THE GUARDIAN.\fBeside each star, a number: 1 the NOSE, 2 the EAR, 3 the HEART, 4 the PAW, 5 the flame of the TAIL.'),
      W.sign([36, 11], 'THE LOOKOUT\fNorth-east, beyond the gorge: Rustbowl Road and the Glimmerfair Ropeway.'),
      W.hidden('cr_spring', [22, 14], 'glow_nut', 2),
      { at: [19, 21, 2, 2], on: 'talk', run: function* (s) { yield s.msg('The Candle. A tall flame rises from a bed of glowing stone, steady as a held breath. There is no wood, and no smoke.\fIts warmth reaches you three steps away, gentle as a hand on the shoulder.'); } },
    ],
  });

  center('kp_candlerock_center', { name: 'Candlerock Mog Center', town: 'kp_candlerock', back: 'from_center', decor: 'tent',
    hello: 'Welcome to the Mart, kupo! We carry everything from Pomville to the canyons. Mind the sand on the shelves.',
    npcs: [folk({ id: 'crc_trainer', name: 'Ace Trainer', model: 'woman8', at: [7, 4], dir: 'down',
      lines: "Red XIII's Beasts shrug off Thieves and Machinists, and they bite White and Red Mages to bits.\fKnights, Rangers and Bards hit them where it hurts. And a Knight or a Dragoon takes their bites well." })] });

  W.house('kp_candlerock_herbalist', { name: "Herbalist's House", area: 'Candlerock', town: 'kp_candlerock', back: 'from_herbalist', decor: 'rustic',
    grid: [
      "############",
      "#j%..k..%j.#",
      "#..........#",
      "#.t.....%..#",
      "#.........j#",
      "#####+######",
    ],
    npcs: [
      folk({ id: 'crh_herbalist', name: 'Herbalist Saffi', model: { base: 'woman', top: '#6a8a4a', bottom: '#5a4a3a', hair: '#8a5a2a', hairStyle: 'braid', extras: ['apron'] }, at: [6, 2], dir: 'down',
        talk: function* (s) {
          if (s.flag('kp_cr_herbs')) { yield s.say('Herbalist Saffi', "Canyon herbs grow slowly, but they keep. Like canyon people. Come back if your moogles ever look peaky."); return; }
          yield s.say('Herbalist Saffi', "Oh! A trainer. Come in, mind the pots. Everything in here grew on a ledge somewhere above us.\fMoogles are made of gears and springs, but they love a good herb. Tuck a leaf behind a pom-pom and they'll shake off nearly anything.");
          s.set('kp_cr_herbs'); KP.give('panacea_leaf', 2); KP.give('phoenix_pinion', 1); s.sfx('found');
          yield s.msg('Received 2 Panacea Leaves and a Phoenix Pinion!');
          yield s.say('Herbalist Saffi', "The leaf cures the first bad turn a moogle takes. The pinion picks it up when it's nearly down. Give them to whoever's going in first against Red XIII.");
        } }),
      W.moogle('crh_mog', 'truffkin_forager', [9, 3], { wander: 1, line: 'Truffkin: Snff-kupo! It is sniffing every pot in turn.' }),
    ] });
  W.house('kp_candlerock_guide', { name: "Canyon Guide's House", area: 'Candlerock', town: 'kp_candlerock', back: 'from_guide', decor: 'rustic',
    npcs: [
      folk({ id: 'crg_guide', name: 'Canyon Guide Tayo', model: { base: 'cosmo_villager', top: '#4a6a8a', extras: ['vest', 'belt', 'harness'] }, at: [7, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Canyon Guide Tayo', "Need a guide? I know every trail between the moor and the mesa. North of town, through the gorge, the road drops down to the river: Rustbowl Road.\fHalfway along is the Rustbowl, an old dry lake full of junk. Scavengers live there. They'll sell you a bent spoon for a fortune, but they're decent folk.");
          yield s.say('Canyon Guide Tayo', "At the far end the road climbs to the ropeway station. The gondola goes up to Glimmerfair, the carnival town on the mesa. Their dojo master is called Dio, and he... well. You'll see.");
          if (s.flag('kp_cr_guide_gift')) return;
          s.set('kp_cr_guide_gift'); KP.give('max_oil', 2); s.sfx('found');
          yield s.msg(KP.got('max_oil', 2));
          yield s.say('Canyon Guide Tayo', "Take those. Every guide carries a couple. The canyon's hard on gears.");
        } }),
      folk({ id: 'crg_kid', name: "Guide's Son", model: 'kid4', at: [3, 3], dir: 'right',
        lines: "Dad climbed all the way down the cleft once, to see where the spring comes from. He says it comes from the Planet.\fI said everything comes from the Planet. He said 'exactly' and then he wouldn't explain." }),
    ] });
  W.house('kp_candlerock_kid', { name: 'House', area: 'Candlerock', town: 'kp_candlerock', back: 'from_kid', decor: 'rustic',
    npcs: [
      folk({ id: 'crk_kid', name: 'Nico', model: { base: 'kid', top: '#c03a2a', bottom: '#5a3a2a', hairStyle: 'spiky', hair: '#a02a1a', extras: ['redband', 'bangles'] }, at: [6, 3], dir: 'down',
        talk: function* (s) {
          if (!s.flag('kp_badge_7')) { yield s.say('Nico', "GRRRR! I am RED XIII, guardian of the Candle! Halt, trainer!\f...Do you like my tail? It's cardboard. Mom painted the flame. When I grow up I'm going to be the master's pupil. The real kind, not the cardboard kind."); return; }
          if (s.flag('kp_cr_nico_gift')) { yield s.say('Nico', "When I'm a master, I'm going to have a cave too. A bigger one. With TWO fires."); return; }
          yield s.say('Nico', "You... you BEAT HIM? The real Red XIII? And he laughed? I heard him laughing all the way up here!");
          yield s.say('Nico', "Here. It's my Fenrir Collar. I was saving it for when I'm the master's pupil, but Mom says I have to grow into it first. Your moogles' bites will hit way harder with it.");
          s.set('kp_cr_nico_gift'); KP.give('fenrir_collar', 1); s.sfx('found');
          yield s.msg(KP.got('fenrir_collar'));
        } }),
      folk({ id: 'crk_mom', name: 'Mother', model: 'woman6', at: [2, 2], dir: 'right',
        lines: "Nico's been Red XIII all week. He growls at the bread. He growled at the postman. The postman growled back, so now they're friends.\fThe real master stopped by once and let Nico pat his mane. We haven't heard the end of it since." }),
    ] });

  // ------------------------------------------------------------------ Bugenhagen's observatory, and the dome above it
  // The observatory: a round room under the dome, brass instruments round the walls, the glowing globe of the Planet on
  // its ring, the star chart (the Guardian, drawn in order), a ladder up through a hatch into the dome. Bugenhagen and
  // Red XIII are there until the stars are seen: Bugenhagen takes Cloud up into the dome (the planetarium: the
  // Lifestream, why moogles sing, the Guardian), and Red XIII goes down to his Arcade (kp_cr_planetarium).
  const GUARDIAN_ORDER = 'first the NOSE, then the EAR, then the HEART, then the PAW, and last of all the flame at the tip of its TAIL';
  const planetarium = function* (s) {
    yield s.face('cro_bugen', 'player'); yield s.face('player', 'cro_bugen');
    yield s.say('Bugenhagen', "Ho ho hoo! A trainer, with six badges on the coat. Nanaki, look who has climbed all our steps.");
    s.emote('cro_red', '...');
    yield s.face('cro_red', 'player');
    yield s.say('Red XIII', '...So I see. You will have come for the Flame Badge.');
    yield s.say('Bugenhagen', "Ho ho! The badge can wait a little. Nobody faces my grandson without first seeing the sky the way we see it. Up into the dome, both of you!");
    yield s.fadeOut(30, '#000008');
    yield s.goto('kp_candlerock_dome', 'show');
    s.spawn('dm_bugen', 'bugenhagen', 8, 3, 'down', { name: 'Bugenhagen', hover: 0.25 });
    s.spawn('dm_red', 'redxiii', 5, 5, 'right', { name: 'Red XIII' });
    yield s.face('player', 'up');
    yield s.caption('The lamps go down. One by one, stars wake in the dark of the dome...\n\nand in the middle of the room, a small glowing Planet\nbegins to turn.', { hold: 200, bg: 'rgba(0,0,12,0.9)' });
    yield s.cam(8, 4, 70, { dist: 7, pitch: 36 });
    yield s.say('Bugenhagen', "Ho ho hoo. My little sky. Every star the canyon can see, and one or two it can't.");
    yield s.say('Bugenhagen', "And that, turning there, is the Planet. Under all of it, under every island of the Kupo Isles, runs a river nobody ever sees: the Lifestream.\fEvery living thing comes out of it, and every living thing goes back into it when its time is done. Like rain finding its way home to the sea.");
    yield s.ask('Bugenhagen', 'Now, a riddle for you. Why do moogles sing?', ['Because they are happy', 'Kupo?']);
    yield s.say('Bugenhagen', "Ho ho hoo! Close enough. Here is the old answer. The very first moogle was built of gears and springs and a pom-pom, and it would not go.\fSo its maker dipped the pom-pom in a spring where the Lifestream runs close to the surface... and it woke up humming.");
    yield s.say('Red XIII', 'Grandfather has told me this story one hundred times.');
    yield s.say('Bugenhagen', "Then the hundred and first will do you no harm! Every moogle since carries a spark of that spring. The spark remembers the river it came from, and it hums along with the Planet.\f\"Kupo\" is the sound of a moogle singing along.");
    yield s.say('Bugenhagen', "That is why moogles gather where the song is strong: round the Candle, in the old woods, by the springs. And why a moogle that is loved hums louder. You will have heard yours do it.");
    yield s.cam(8, 2, 80, { dist: 6.5, pitch: 22 });
    yield s.say('Bugenhagen', 'Now look up. There, above the little Planet: five bright stars, joined by a line. The Guardian.');
    yield s.say('Red XIII', 'My people drew it in the sky long before there was a town here: a great beast keeping watch over the canyon.');
    yield s.say('Bugenhagen', `And the old way of drawing it goes like this: ${GUARDIAN_ORDER}.`);
    yield s.face('dm_red', 'player');
    yield s.say('Red XIII', "My Arcade keeps the old way. Its braziers are the Guardian's stars, each carved with its part. Light them in the order the stars are drawn, and the stone gates will open for you.\fLight one out of turn, or a star that is not the Guardian's, and the whole cave goes dark again. The Moon and the Feather belong to other skies.");
    yield s.say('Red XIII', 'I will be waiting at the end of the Arcade. Come when you are ready, trainer.');
    s.set(CR_STARS);
    s.camFollow(40);
    yield s.move('dm_red', [[5, 7], [8, 7], [8, 8]]);
    s.remove('dm_red');
    yield s.face('dm_bugen', 'player');
    yield s.say('Bugenhagen', "Ho ho hoo. He has been practising that speech all week. Don't tell him I said so.\fGo down when you're ready. And when it's done, come and tell this old man all about it. I was a champion once, you know: the 9th Kupo League! There's a statue of me at the Coliseum. It floats better than I do these days.");
  };
  const bugenTalk = function* (s) {
    if (!s.flag(CR_STARS)) { yield* planetarium(s); return; }
    if (s.flag('kp_badge_7') && !s.flag('kp_cr_bugen_gift')) {
      yield s.say('Bugenhagen', "Ho ho hoo! I heard him laughing from up here. Nanaki hasn't laughed like that since he was a cub. Thank you, trainer.");
      s.set('kp_cr_bugen_gift'); KP.give('gaia_seed', 2); s.sfx('found');
      yield s.msg(KP.got('gaia_seed', 2));
      yield s.say('Bugenhagen', "Gaia Seeds, from the spring. A moogle holding one stands firmer wherever the Lifestream comes close to the surface. Ho ho hoo!");
      return;
    }
    if (s.flag('kp_badge_7')) { yield s.say('Bugenhagen', "Ho ho hoo. Listen to your moogles, young one. When they hum, the Planet is humming with them. That is the whole secret. Well. That, and a good Leftover Nut."); return; }
    yield s.say('Bugenhagen', `Ho ho hoo. Remember the Guardian: ${GUARDIAN_ORDER}. The Moon and the Feather are other skies' stars.`);
  };
  const OBS = [
    "#########+#########",   //  0 (the hatch up into the dome)
    "######.......######",   //  1
    "####.MP.....PM.####",   //  2
    "###.............###",   //  3
    "##...............##",   //  4
    "##M.....___.....M##",   //  5
    "##.....__U__.....##",   //  6
    "##......___......##",   //  7
    "##...............##",   //  8
    "###k...........k###",   //  9
    "####...........####",   // 10
    "######.......######",   // 11
    "#########+#########",   // 12
  ];
  FF7.defineMap('kp_candlerock_observatory', {
    name: "Bugenhagen's Observatory", area: 'Candlerock', theme: 'house', music: 'cry',
    look: { wall: '#2e3a66', trim: '#1a2040', floor: ['#5a4a3a', '#524232'], floor2: ['#6a5a4a', '#625242'], floor3: ['#8a7a5a', '#827252'], metal: ['#a88a44', '#9a7c3a'], wallH: 3.0 },
    camera: { pitch: 56, dist: 9.5 },
    grid: OBS,
    props: [
      { at: [9, 6], prop: 'crystal', col: '#60c8ff' },
      { at: [9, 6.01], prop: 'hole', r: 1.4, col: '#60ffb0', col2: '#8a7040' },
      { at: [11, 0], prop: 'screen', w: 2, h: 1.1, y: 1.5, style: 'stars', col: '#a0c8ff', col2: '#5a4020' },
      { at: [7, 0], prop: 'screen', w: 1.5, h: 1.0, y: 1.5, style: 'map', col: '#80ffc0', col2: '#5a4020' },
    ],
    lights: [[9, 6, '#80c0ff', 3], [4, 3, '#ffd080', 2], [14, 3, '#ffd080', 2], [9, 10, '#ffd080', 2]],
    entries: { from_town: [9, 11, 'up'], from_dome: [9, 1, 'down'] },
    exits: [
      { at: [9, 12, 1, 1], to: 'kp_candlerock', entry: 'from_observatory', sfx: 'door' },
      { at: [9, 0, 1, 1], to: 'kp_candlerock_dome', entry: 'from_obs', if: s => s.flag(CR_STARS),
        blocked: function* (s) { yield s.say('Bugenhagen', "Ho ho! Not up there on your own, young one. The dome is dark, and the hatch sticks. Come and talk to me first."); } },
    ],
    npcs: [
      { id: 'cro_bugen', name: 'Bugenhagen', model: 'bugenhagen', at: [6, 8], dir: 'right', hover: 0.25, talk: bugenTalk },
      { id: 'cro_red', name: 'Red XIII', model: 'redxiii', at: [12, 8], dir: 'left', show: s => !s.flag(CR_STARS),
        talk: function* (s) { yield s.say('Red XIII', "...Grandfather will want to show you the stars first. He shows everyone. You may as well let him; he won't stop asking."); } },
      folk({ id: 'cro_assistant', name: 'Assistant', model: { base: 'man', top: '#d8d0b8', bottom: '#4a3a2a', hairStyle: 'short', extras: ['glasses', 'labcoat'] }, at: [4, 4], dir: 'right',
        lines: "Shh, the instruments are listening. The needles twitch every time a moogle goes past the Candle down below. We think it's the Lifestream answering.\fWe also think it might be the wind. Science is mostly arguing about the wind." }),
    ],
    triggers: [
      { at: [11, 0, 2, 1], on: 'talk', run: function* (s) { yield s.msg(`A star chart, hand-painted on a board. Five gold stars are joined by a line into the shape of a great beast: THE GUARDIAN.\fUnder it, in neat old handwriting: "Drawn as the elders drew it: 1 the NOSE, 2 the EAR, 3 the HEART, 4 the PAW, 5 the flame of the TAIL."`); } },
      { at: [7, 0], on: 'talk', run: function* (s) { yield s.msg('A map of the Kupo Isles, with a faint green river drawn underneath all of them. Little lights glow where it comes close to the surface.'); } },
      { at: [9, 6], on: 'talk', run: function* (s) { yield s.msg('A globe of the Planet, glowing softly. Look closely and tiny green lights drift beneath its surface, like a slow river.'); } },
      { at: [5, 2], on: 'talk', run: function* (s) { yield s.msg('A great brass telescope, pointed at the sky through a slot in the dome.'); } },
      { at: [13, 2], on: 'talk', run: function* (s) { yield s.msg('Brass instruments tick and hum. Their needles twitch as if they were measuring something far under the ground.'); } },
    ],
  });
  // the dome: dark, and full of stars (the Guardian's five brighter, joined by faint lines, over the globe of the Planet)
  const DOME = [
    "#################",   // 0
    "######.....######",   // 1
    "####.........####",   // 2
    "###...........###",   // 3
    "##......U......##",   // 4
    "##.............##",   // 5
    "###...........###",   // 6
    "####.........####",   // 7
    "######.....######",   // 8
    "########+########",   // 9
  ];
  const GSTARS = [[5.0, 2.6, 2.3], [6.4, 1.7, 2.5], [7.8, 2.9, 2.4], [7.0, 3.6, 2.3], [11.2, 2.0, 2.6]];   // nose, ear, heart, paw, tail [x, y, lift]
  const domeStars = [];
  for (let i = 0; i < 46; i++) {
    const x = 2.5 + rnd(i, 3, 11) * 12, y = 1.2 + rnd(i, 5, 12) * 6.6, lift = 1.6 + rnd(i, 7, 13) * 1.6;
    domeStars.push({ at: [x, y], prop: 'lantern', pole: false, size: 0.08 + rnd(i, 9, 14) * 0.08, col: rnd(i, 1, 15) > 0.7 ? '#ffe8c0' : '#d8e8ff', lift, light: false });
  }
  FF7.defineMap('kp_candlerock_dome', {
    name: 'The Dome', area: 'Candlerock', theme: 'space', music: 'cry',
    look: { floor: ['#1a1a30', '#16162a'], floor2: ['#202040', '#1c1c3a'], wall: '#1a1a34', trim: '#0e0e20', sky: ['#000006', '#00000e'], ambient: [0.24, 0.26, 0.38], light: [0.46, 0.5, 0.74], wallH: 2.8 },
    camera: { pitch: 46, dist: 8.5 },
    grid: DOME,
    legend: { U: 'block' },
    props: domeStars.concat(
      GSTARS.map(([x, y, h]) => ({ at: [x, y], prop: 'lantern', pole: false, size: 0.26, col: '#ffd070', lift: h })),
      GSTARS.slice(0, 4).map((p, i) => { const q = GSTARS[i + 1]; return { at: [p[0], p[1]], to: [q[0], q[1]], h: p[2] + 0.15, h2: q[2] + 0.15, sag: 0, r: 0.012, col: '#c8a060', count: 1 }; }),
      [{ at: [8, 4], prop: 'disc', r: 0.55, h: 0.2, sides: 10, col: '#3a3a5a', top: '#4a4a6a' },
        { at: [8.01, 4.01], prop: 'lantern', pole: false, size: 1.5, col: '#3a8aff', lift: 0.5 },
        { at: [8.02, 4.02], prop: 'hole', r: 1.2, col: '#50ffa0', col2: '#2a2a4a' }]),
    lights: [[8, 4, '#4a9aff', 3.5], [7.5, 2.5, '#ffd070', 2]],
    entries: { show: [8, 6, 'up'], from_obs: [8, 8, 'up'] },
    exits: [{ at: [8, 9, 1, 1], to: 'kp_candlerock_observatory', entry: 'from_dome', sfx: 'door' }],
    triggers: [
      { at: [8, 4], on: 'talk', run: function* (s) { yield s.msg('The little Planet turns slowly in the dark. A thread of green light winds round and round beneath its surface.'); } },
    ],
  });

  // ================================================================== Dojo 7: the Ember Arcade (Red XIII)
  // A cave under Candlerock (a homage to the Cave of the Gi): the entrance hall with its floor mosaic of the Guardian; the
  // Star Hall, dark but for its braziers; a ledge path along the hall's back wall, closed by five stone gates; and the
  // den at the ledge's west end, where Red XIII waits by the great fire under the stone Watcher.
  // THE GIMMICK: seven braziers stand in the Star Hall, each carved with a sign (and named on the floor before it). Five
  // are the stars of the Guardian (the mosaic in the entrance hall, the star chart in the observatory, Bugenhagen):
  // NOSE, EAR, HEART, PAW, TAIL. Lit in that order, each rolls one gate aside (flags kp_er_b1..b5; the fifth sets
  // kp_er_lit too, and from then on nothing goes out). Lighting one out of turn, or the MOON or the FEATHER, puts every
  // brazier out and shuts every gate. The braziers are all down in the hall and the gates all up on the ledge, so no gate
  // can ever close behind you.
  // SOLUTION: Canyon Warrior Tala (she guards the way in). Light NOSE (5,10), EAR (9,7), HEART (12,12), PAW (10,15), TAIL
  //   (22,9). Up the stairs at the hall's east end (28,7): Beastmaster Ursa (pocket 1), a Royal Kupo Nut (pocket 2),
  //   Hermit Ashkii (pocket 3), then Red XIII in the den (4,3). Optional: Max Oil on the landing (29,2).
  const ER = [
    "################################",   //  0
    "#::::::@:#######################",   //  1
    "#::::::::R....R....R....R.....##",   //  2
    "#::::::::.....................##",   //  3
    "#U:::::::RRRURRURRURRURRRRR..R##",   //  4
    "##RRRRRRRRRRRRRRRRRRRRRRRRRR^R##",   //  5
    "##..............U.........RR^R##",   //  6
    "##.U...........R..........RR^R##",   //  7
    "##............................##",   //  8
    "##............................##",   //  9
    "##...............U...........R##",   // 10
    "##R...........................##",   // 11
    "##.........................U..##",   // 12
    "##......U.....................##",   // 13
    "##...........................U##",   // 14
    "##.U..........................##",   // 15
    "##......................U.....##",   // 16
    "##....R......R....R.U.........##",   // 17
    "##RURURURURURU....RURURURURURU##",   // 18
    "#########m::::::::::::m#########",   // 19
    "#########::::::::::::::#########",   // 20
    "#########::::::::::::::#########",   // 21
    "#########::::::::::::::#########",   // 22
    "#########::::::::::::::#########",   // 23
    "#########m::::::::::::m#########",   // 24
    "###############+################",   // 25
  ];
  const ERH = [
    "99999999999999999999999999999999",
    "96666666699999999999999999999999",
    "96666666666666666666666666666699",
    "96666666666666666666666666666699",
    "96666666666666666666666666666699",
    "99111111111111111111111111163699",
    "99000000000000000000000000163699",
    "99000000000000000000000000163699",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "99000000000000000000000000000099",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
  ];
  const ER_LIT = 'kp_er_lit', bflag = (i) => 'kp_er_b' + (i + 1);
  const STARS = [
    { id: 'nose', name: 'NOSE', at: [5, 10], carve: "a beast's NOSE, lifted to the wind" },
    { id: 'ear', name: 'EAR', at: [9, 7], carve: 'a pricked-up EAR' },
    { id: 'heart', name: 'HEART', at: [12, 12], carve: 'a deep-cut HEART' },
    { id: 'paw', name: 'PAW', at: [10, 15], carve: 'a broad PAW print' },
    { id: 'tail', name: 'TAIL', at: [22, 9], carve: 'a TAIL with a flame at its tip' },
  ];
  const DECOYS = [{ id: 'moon', name: 'MOON', at: [19, 14], carve: 'a crescent MOON' }, { id: 'feather', name: 'FEATHER', at: [24, 12], carve: 'a long FEATHER' }];
  const GATES = [[28, 8], [24, 3], [19, 3], [14, 3], [9, 3]];
  const starLit = (i) => flag(ER_LIT) || flag(bflag(i));
  const BOWL = { prop: 'urn', col: '#4a3428', col2: '#8a6a3a' };
  const putOut = (s) => STARS.forEach((_, k) => s.unset(bflag(k)));
  const OUT_MSG = 'The flame catches... then gutters. Every brazier in the hall goes dark at once, and up on the ledge the stone gates grind shut.';
  const brazier = (i) => Object.assign(W.toggle('er_brazier_' + STARS[i].id, STARS[i].at, bflag(i), { model: BOWL }), {
    talk: function* (s) {
      const S = STARS[i];
      if (starLit(i)) { yield s.msg(`The brazier carved with ${S.carve} burns bright and steady.`); return; }
      const c = yield s.ask(null, `A stone brazier carved with ${S.carve}. Embers glow in the bowl.`, ['Light it', 'Leave it']);
      if (c !== 0) return;
      const next = STARS.findIndex((_, k) => !s.flag(bflag(k)));
      if (i !== next) { putOut(s); s.sfx('error'); s.shake(2, 20); yield s.msg(OUT_MSG); return; }
      s.set(bflag(i)); s.sfx('fire'); s.flash('#ffb060', 10, 0.35);
      if (i < STARS.length - 1) { yield s.msg(`The ${S.name} blazes up! Somewhere above, stone grinds on stone: a gate rolls aside.`); return; }
      s.set(ER_LIT); s.shake(3, 40);
      yield s.msg('The flame at the tip of the TAIL roars up, and all five braziers flare together: the Guardian burns in the dark.\fUp on the ledge, the last gate rolls aside. Somewhere beyond it, a great fire answers.');
    } });
  const decoy = (d) => ({ id: 'er_decoy_' + d.id, at: d.at, model: BOWL, solid: true,
    talk: function* (s) {
      if (flag(ER_LIT)) { yield s.msg(`A brazier carved with ${d.carve}. It isn't one of the Guardian's stars; it stays cold.`); return; }
      const c = yield s.ask(null, `A stone brazier carved with ${d.carve}. Embers glow in the bowl.`, ['Light it', 'Leave it']);
      if (c !== 0) return;
      const any = STARS.some((_, k) => s.flag(bflag(k)));
      putOut(s); s.sfx('error'); s.shake(2, 20);
      yield s.msg(any ? OUT_MSG : 'The flame catches for a moment, then dies. The Guardian has no such star.');
    } });
  const flame = (i) => ({ id: 'er_flame_' + STARS[i].id, at: STARS[i].at, model: { prop: 'flames', col: '#ffa040', size: 0.75 }, hover: 0.62, solid: false, hidden: true,
    tick(o) { o.hidden = !starLit(i); } });
  const SLAB = { prop: 'cabinet', col: '#4a3428', scale: [1.0, 1.9, 0.8] };
  const gate = (i) => W.barrier('er_gate' + (i + 1), GATES[i], () => starLit(i), SLAB,
    { dir: i === 0 ? 'down' : 'right', talk: function* (s) { if (!starLit(i)) yield s.msg(`A slab of red stone blocks the way, carved with ${i ? (i + 1) + ' stars in a row' : 'a single star'}. It won't budge.`); } });
  const ERT = [
    W.trainer({ id: 'er_tala', cls: 'Canyon Warrior', name: 'Tala', model: { base: 'woman', top: '#a04020', bottom: '#5a3a1a', hairStyle: 'braid', hair: '#2a1a10', skin: '#c88a5a', extras: ['headband', 'armguard', 'sash'] },
      at: [16, 15], dir: 'down', sight: [14, 16, 4, 2], noBag: true, bg: 'dojo',
      line: "Halt! You stand in the Star Hall of the Ember Arcade. The Guardian's fire is not for careless hands. Show me you can keep your head in the dark!",
      lose: 'Your fire burns steady. Go on, then.', after: "If you forget the order, look at the mosaic by the door. The nose leads, the tail-flame comes last. Everybody forgets the heart.",
      team: [['deistmog_dragoon', 28], ['cornemog_light_warrior', 28], ['banopom_crimson_wing', 29]], money: 1400 }),
    W.trainer({ id: 'er_ursa', cls: 'Beastmaster', name: 'Ursa', model: { base: 'man', top: '#6a4a2a', bottom: '#4a3a2a', hairStyle: 'longmessy', hair: '#3a2a1a', build: 'big', extras: ['furcollar', 'beard', 'armguard'] },
      at: [21, 2], dir: 'down', sight: [20, 2, 4, 2], noBag: true, bg: 'dojo',
      line: "My beasts smelled you coming three gates ago. They're very excited. I'm mildly excited. Let's go!",
      lose: "Good beasts. Good. ...Yours, I mean.", after: "Two more gates. The Hermit sits past the next one. Don't let her offer you tea; it's mostly gravel.",
      team: [['bokomog_rider', 28], ['pikepom_spirit_dragoon', 28], ['hedgepom_topiarist', 29]], money: 1450 }),
    W.trainer({ id: 'er_ashkii', cls: 'Hermit', name: 'Ashkii', model: { base: 'oldwoman', top: '#5a4a3a', bottom: '#3a2e24', hair: '#d8d0c0', hairStyle: 'longstraight', skirt: 'long', extras: ['robe', 'sash'] },
      at: [11, 2], dir: 'down', sight: [10, 2, 4, 2], noBag: true, bg: 'dojo',
      line: "Sixty years I've sat in this cave, listening to the old spirits in the stone. They say you'll do. I say we'll see.",
      lose: "The spirits were right. They usually are. It's very annoying.", after: "The master waits past the last gate, by the great fire. The Watcher is there too. Show it some respect: it kept this cave long before any of us.",
      team: [['gravekin_deathlord', 29], ['pagodamog_pagoda_lord', 29], ['wrapmog_tomb_guard', 28]], money: 1500 }),
  ];
  // the Guardian on the floor of the entrance hall: its five stars, numbered, joined in the order they are drawn
  const MOSAIC = [[10.8, 21.4], [13.0, 20.3], [14.7, 22.2], [13.6, 23.3], [20.2, 21.0]];
  FF7.defineMap('kp_candlerock_dojo', {
    name: 'Ember Arcade', area: 'Candlerock', theme: 'cave', music: 'warrior', kpBg: 'dojo',
    look: { floor: ['#3a2a22', '#36261e'], floor2: ['#4a3428', '#443024'], wall: '#4a2e22', trim: '#2a1810', wallH: 2.8, sky: ['#020000', '#0a0402'],
      ambient: [0.3, 0.24, 0.22], light: [0.66, 0.46, 0.34], fog: { color: [0.05, 0.02, 0.01], near: 7, far: 20 }, wallTex: { wall: 'rock' }, floorTex: { floor2: 'stone' } },
    grid: ER, heights: ERH,
    legend: { U: 'spire' },
    props: deco(ER, {
      U: (x, y) => ({ prop: 'spire', col: '#5a3a2a', h: 1.2 + rnd(x, y) * 1.2, r: 0.45 + rnd(x, y, 3) * 0.2 }),
      R: () => ({ prop: 'rock', col: '#5a4034' }),
      m: () => ({ prop: 'urn', col: '#4a3428', col2: '#c8a050' }),
    }).concat(
      [[9, 19], [22, 19], [9, 24], [22, 24]].map(([x, y]) => ({ at: [x + 0.01, y + 0.01], prop: 'flames', size: 0.7, col: '#ffa040', lift: 0.75 })),
      // the braziers' stone footings, and their names cut in the floor before them
      STARS.concat(DECOYS).map(S => ({ at: [S.at[0] + 0.01, S.at[1] + 0.01], prop: 'disc', r: 0.62, h: 0.04, sides: 8, col: '#4a3428', top: '#5a4234' })),
      // the den: the plinth under the Watcher, the great fire
      [{ at: [4, 1], prop: 'disc', r: 0.5, h: 0.42, sides: 8, col: '#5a4a3a', top: '#6a5a4a' },
        { at: [7, 1], prop: 'campfire', size: 1.6, col: '#ff9030' }],
      // the mosaic's lines
      MOSAIC.slice(0, 4).map((p, i) => ({ at: p, to: MOSAIC[i + 1], h: 0.015, h2: 0.015, sag: 0, r: 0.02, col: '#b04a2a', count: 1 }))),
    labels: STARS.concat(DECOYS).map(S => ({ at: [S.at[0], S.at[1] + 0.62], text: S.name, size: 0.1, col: '#c8a060', y: 0.03 }))
      .concat(MOSAIC.map(([x, y], i) => ({ at: [x, y], text: '*', size: 0.32, col: '#ffc860', y: 0.02, glow: true })),
        MOSAIC.map(([x, y], i) => ({ at: [x + 0.32, y - 0.3], text: String(i + 1), size: 0.15, col: '#ffe0a0', y: 0.02, glow: true })),
        [{ at: [15.6, 24.0], text: 'THE GUARDIAN', size: 0.16, col: '#d8a860', y: 0.02 }]),
    lights: [[9, 19, '#ff9040', 3], [22, 19, '#ff9040', 3], [9, 24, '#ff9040', 3], [22, 24, '#ff9040', 3], [6, 2, '#ff9030', 5]]
      .concat(STARS.concat(DECOYS).map(S => [S.at[0], S.at[1], '#a04020', 1.4])),
    entries: { from_town: [15, 24, 'up'] },
    exits: [{ at: [15, 25, 1, 1], to: 'kp_candlerock', entry: 'from_dojo', sfx: 'door' }],
    npcs: ERT.map(t => t.npc).concat([
      W.master({ id: 'er_redxiii', name: 'Red XIII', model: 'redxiii', at: [4, 3], dir: 'right', badge: 7, money: 4000, show: s => s.flag(CR_STARS),
        team: [['galimog_werebeast', 29, { held: 'fenrir_collar' }], ['terrapom_terramancer', 29, { held: 'geomancers_bell' }], ['condorpom_condor_marshal', 29, { held: 'sniper_sight' }],
          ['fabulin_master', 29, { held: 'champion_belt' }], ['shamog_beastcaller', 30, { plus: 1, held: 'leftover_nut' }], ['torgamog_fang_warden', 30, { plus: 2, held: 'boost_beast' }]],
        intro: "You lit the Guardian, star by star, and came along the ledge in the dark. Good.\fI am Red XIII, keeper of the Ember Arcade and of the Candle above it. My moogles are Beasts. They hunt by scent, and they do not flinch from fire.\fThe Planet is listening. Let us give it something worth hearing.",
        lose: "...Hah. Ha ha ha! I lost! That was... forgive me. That was wonderful.",
        after: "Take the Flame Badge. ...Grandfather says I am forty-eight, which for my kind is barely more than a cub. Sometimes the cub gets out. Do not tell the pupils.\fThe gorge east of the plaza is open to you now. The road follows the river north, past the Rustbowl, to the ropeway. At the top: Glimmerfair, and Dio's Showtime Arcade.\fHe will want to show you his muscles. Let him. It saves time.",
        reward: [['boost_beast', 1], ['royal_nut', 3], ['max_oil', 2]] }),
      folk({ id: 'er_guide', name: 'Dojo Guide', model: 'man8', at: [20, 23], dir: 'left',
        lines: "Hey there, future champ! Welcome to the Ember Arcade. Dark in here, huh? That's the point.\fThe hall ahead has seven braziers, each carved with a sign. Five of them are the stars of the Guardian: that's the mosaic on the floor right here. Light those five in the order of the numbers, and the stone gates up on the ledge roll aside, one for each star.\fLight one out of turn, or one that isn't the Guardian's, and everything goes dark again. Not that I've ever done that. Eleven times." }),
      { id: 'er_watcher', name: 'Statue', model: stoneLook('redxiii'), at: [4, 1], dir: 'down', hover: 0.42, anim: 'none', faceOnTalk: false,
        talk: function* (s) { yield s.msg('A great stone beast sits at the back of the den, head raised to the sky, a stone flame curling at the tip of its tail.\fThe plaque reads: "THE WATCHER. He held the canyon gate alone through the longest night, and he holds it still."\fSomeone has left a fresh feather at its paws.'); } },
    ]),
    objects: [].concat(STARS.map((_, i) => brazier(i)), DECOYS.map(decoy), STARS.map((_, i) => flame(i)), GATES.map((_, i) => gate(i))),
    items: [W.item('er_pocket', [17, 2], 'royal_nut', 2), W.item('er_landing', [29, 2], 'max_oil')],
    triggers: ERT.map(t => t.trig).concat([
      { at: [10, 20, 12, 4], on: 'talk', run: function* (s) { yield s.msg('A mosaic of red stones on the floor: THE GUARDIAN, a great beast drawn in five stars.\fEach star is numbered: 1 the NOSE, 2 the EAR, 3 the HEART, 4 the PAW, 5 the flame at the tip of the TAIL.'); } },
      { at: [7, 1], on: 'talk', run: function* (s) { yield s.msg('The great fire of the den. It burns without smoke, like the Candle above, and the stone round it is warm to the touch.'); } },
    ]),
  });

  // ================================================================== Route 16: Rustbowl Road
  // North out of Candlerock's gorge the road drops two flights to a river at the bottom of a deep canyon, and follows
  // its west bank north. West of the road, sunk below it: the Rustbowl, an old dry lake turned scrapyard (wrecked carts,
  // a little plane that came down short of the mesa, junk heaps), where a band of scavengers lives round its fire and its
  // shack, and the Scrap Baron sits on top of the biggest heap. A ford of stepping stones crosses to a sandbar on the far
  // bank. At the north end the road climbs to the ropeway station on the canyon's rim: the gondola to Glimmerfair leaves
  // from the gap in the platform's rail (kp_region5b.js: entry from_route16; back here at from_glimmerfair).
  KP.WILD.kp_route16 = [['slumkin_junk_baron', 14, 27, 29], ['suukma_machina_master', 13, 27, 29], ['angler_harpooner', 11, 27, 29], ['hawkin_raptor', 9, 27, 29],
    ['dustbun_custodian', 8, 27, 29], ['gizmog_gadgeteer', 8, 27, 29], ['bubblin_deep_diver', 8, 27, 29], ['puddlepom_hydromancer', 8, 27, 29],
    ['rodeopom_cowboy', 8, 27, 29], ['kartmog_grand_prix_ace', 6, 27, 29], ['chasemog_tank', 4, 28, 29], ['gougpom_giant', 3, 28, 29]];
  const R16 = [
    "######                    ##########",   //  0
    "######=============.======##########",   //  1
    "######..hhhhhh..KKKKKKKKBo##########",   //  2
    "######..hwhhwh..KKKKKKKK..~~~~######",   //  3
    "######....................~~~~######",   //  4
    "######^^.......!..........~~~~######",   //  5
    "######^^..................~~~~######",   //  6
    "######dd,,,,,,,,,,,,,,dd,,~~~~######",   //  7
    "######ddGGGGdddddddddddd,,~~~~######",   //  8
    "######ddGGGGdddddddddR^^R,~~~~######",   //  9
    "######RRddddddRRRRRRRR^^R,~~~~######",   // 10
    "#####sssssssssssR,,ddddd,,~~~~######",   // 11
    "####ssssss$$$ssMU,,dddddR,~~~~######",   // 12
    "####xx.xxs$$$sssR,,GGGGdss~~~~sssR##",   // 13
    "#sssx...xsssssssR,,GGGGdss~~~~ssss##",   // 14
    "#sxsx...x@sssxssR,,GGGGdss~~~~s,,s##",   // 15
    "#sssxx^xxssssAssR,,GGGGdss~~~~s,,s##",   // 16
    "#ssxss^sssssssss^,,dddddssoooos,,s##",   // 17
    "#Assssssshhhhsxs^,,dddddss~~~~s,,s##",   // 18
    "#sssssssshhhhsssR,,dddddss~~~~s,,s##",   // 19
    "#s$$$ssssh+hhsssR,,dddddss~~~~ssss##",   // 20
    "#s$$$sssssssssssRGGdddddss~~~~RssU##",   // 21
    "#sssssssssss$$$sRGGdddddss~~~~######",   // 22
    "#xssssssxsss$$$sRGGddddd,,~~~~      ",   // 23
    "#sssssssssssssssRGGddddd,U~~~~      ",   // 24
    "############RRRRRURR^^RRRR~~~~      ",   // 25
    "############RRRRRRRR^^RRRR~~~~      ",   // 26
    "            R,,,dddddddddR~~~~      ",   // 27
    "            R,,,dddddd,,UR~~~~      ",   // 28
    "            R,U,dddddd,,,R~~~~      ",   // 29
    "            R,,,dddddd,U,R~~~~      ",   // 30
    "            RU,,dd!ddd,,,R~~~~      ",   // 31
    "            R,,,dddddd,,,R~~~~      ",   // 32
    "            ####dd########~~~~      ",   // 33
  ];
  const R16H = [
    "999999000000000000000000009999999999",
    "999999777777777777777777779999999999",
    "999999777777777777777777779999999999",
    "999999777777777777777777770000999999",
    "999999777777777777777777770000999999",
    "999999667777777777777777770000999999",
    "999999667777777777777777770000999999",
    "999999444444444444444444440000999999",
    "999999444444444444444444440000999999",
    "999999444444444444444433440000999999",
    "999999444444444444444433440000999999",
    "999990000000000011111111110000999999",
    "999900000000000011111111110000999999",
    "999944444000000011111111110000111199",
    "900044444000000011111111110000111199",
    "900044444000000011111111110000111199",
    "900044244000000011111111110000111199",
    "900000100000000001111111111111111199",
    "900000000000000001111111110000111199",
    "900000000000000011111111110000111199",
    "900000000000000011111111110000111199",
    "900000000000000011111111110000111199",
    "900000000000000011111111110000111111",
    "900000000000000011111111110000000000",
    "900000000000000011111111110000000000",
    "000000000000111121222222210000000000",
    "000000000000111122222222220000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
    "000000000000333333333333330000000000",
  ];
  const R16T = [
    W.trainer({ id: 'r16_tin', cls: 'Scavenger', name: 'Tin', model: { base: 'man', top: '#6a5a4a', bottom: '#4a4038', hairStyle: 'tuft', hair: '#8a6a3a', extras: ['goggles', 'vest', 'harness'] },
      at: [17, 15], dir: 'right', sight: [18, 15, 6, 1],
      line: "Finders keepers! Everything in the Rustbowl belongs to whoever found it first. And you? I found you first. Battle!",
      lose: 'Scrapped. Fair and square.', after: "The Baron sits on top of the big heap like it's a throne. It's not a throne. It's a fridge. Don't tell him.",
      team: [['selkipom_racketeer', 28], ['zozopom_fibber', 28], ['ratpom_ninja', 29]], money: 1450 }),
    W.trainer({ id: 'r16_lou', cls: 'Gambler', name: 'Lou', model: { base: 'man', top: '#d0b040', jacket: '#8a2a2a', bottom: '#2a2a34', hairStyle: 'slick', extras: ['suit', 'bowtie', 'shades'] },
      at: [14, 7], dir: 'down', sight: [14, 8, 1, 2],
      line: "Going up to Glimmerfair? Then you're a gambler, friend. Everybody who rides that ropeway is. Let's warm up with a little wager!",
      lose: "Bust! Well, the house always wins. And I'm not the house.", after: "Glimmerfair's a carnival on top of the mesa: games, shows, and a dojo run by a man in very small trunks. You've been warned.",
      team: [['gilmog_gambler', 28], ['cactpom_host', 28], ['rollmog_corsair', 29]], money: 1500 }),
    W.trainer({ id: 'r16_reed', cls: 'Fisher', name: 'Reed', model: { base: 'oldman', top: '#4a6a7a', bottom: '#3a3a30', hairStyle: 'cap', extras: ['vest', 'beard'] },
      at: [31, 14], dir: 'down', sight: [31, 15, 1, 2],
      line: "Shh! The river's full of big ones today. ...Well, now you've scared them off. You'll have to do instead!",
      lose: 'Reeled in. By a landlubber.', after: "This river runs on down past Candlerock, under the town, and comes up in the spring there. So they say. I've never followed it. Too many fish.",
      team: [['lurepom_master_angler', 28], ['kupan_raft_captain', 28], ['farispom_captain', 28]], money: 1400 }),
    W.trainer({ id: 'r16_mags', cls: 'Scrap Baron', name: 'Mags', model: { base: 'man', build: 'big', top: '#5a4a3a', bottom: '#3a3028', jacket: '#7a3a2a', hairStyle: 'bald', extras: ['gunarmR', 'beard', 'goggles'] },
      at: [6, 14], dir: 'down', sight: [5, 15, 3, 1],
      line: "Who climbs the Baron's heap uninvited? Everything you see, from the bent spoons to that crashed plane, is MINE. Defend your pom-poms!",
      lose: 'Hmph. Even a baron gets knocked off his throne now and then.', after: "Take whatever you like off the heap. ...No, not that. Or that. Look, take the oil. It's by my boot.",
      team: [['avamog_reactor_raider', 29], ['delvemog_floor_master', 29], ['glaivemog_ring_bearer', 29], ['mudrakin_mudra_master', 29]], money: 1600 }),
  ];
  // the Glimmerfair ropeway (FF7's Corel ropeway): the gondola hangs out past the platform's rail over the drop, on two
  // track ropes that climb away north toward the mesa; it pulls out, gathering speed, and climbs (o.y0 follows the rope)
  const CAR_AT = [19, 0], CAR_Y0 = 1.95, ROPE_H = (2.92 + 0.16) * 0.72 + 0.022, ROPE_X = 0.2 * 0.72 / 0.5, ROPE_FROM = 1.2, ROPE_TO = -70, ROPE_RISE = 12;
  const CLIMB = ROPE_RISE / (ROPE_FROM - ROPE_TO);
  const carY0 = (y) => CAR_Y0 + CLIMB * (CAR_AT[1] - y);
  const ropewayCar = { id: 'r16_car', at: CAR_AT.slice(), y0: CAR_Y0, dir: 'up', model: { vehicle: 'gondola', scale: 0.72 }, solid: false, u: 0, v: 0,
    tick(o) {
      if (!o._model) return;
      if (!o.v) { o._model.play('idle'); return; }
      o.u += o.v; o.at = [CAR_AT[0], CAR_AT[1] + o.u]; o.y0 = carY0(o.at[1]); o._model.play('move');
    } };
  const carOf = (s) => s.field && s.field.objects && s.field.objects.find(q => q.id === 'r16_car');
  const ropewayUp = function* (s) {
    const o = carOf(s);
    yield s.face('player', 'up');
    s.sfx('door'); yield 8;
    s.hide('player'); yield 12;
    s.sfx('elevator');
    if (o) for (let i = 0; i < 80; i++) { o.v = -Math.min(0.11, 0.0016 * i); yield 1; }
    yield s.fadeOut(24);
    yield s.caption('The gondola swings out over the canyon and climbs,\nup and up, toward the lights of Glimmerfair on its mesa...', { hold: 70, bg: '#000' });
    yield s.goto('kp_glimmerfair', 'from_route16');
  };
  const ropewayIn = function* (s) {
    const o = carOf(s); if (!o) return;
    s.hide('player');
    const D = 14, T = 150;
    o.u = -D; o.at = [CAR_AT[0], CAR_AT[1] - D]; o.y0 = carY0(o.at[1]);
    s.sfx('elevator');
    for (let t = 0; t < T; t++) { const k0 = 1 - t / T, k1 = 1 - (t + 1) / T; o.v = -D * (k1 * k1 - k0 * k0); yield 1; }
    o.v = 0; o.u = 0; o.at = CAR_AT.slice(); o.y0 = CAR_Y0;
    yield 20;
    s.sfx('door');
    s.show('player', 19, 2, 'down');
  };
  FF7.defineMap('kp_route16', {
    name: 'Route 16', area: 'Route 16', theme: 'canyon', music: 'badlands', kpWild: 'kp_route16', kpBg: 'desert',
    look: { floor: ['#a87048', '#a06a42'], floor2: ['#8a5a3a', '#825434'], dirt: ['#946040', '#8c5a3a'], sand: ['#c09060', '#b88858'], grass: ['#8a8a48', '#828240'],
      wood: ['#8a6a44', '#7e6040'], water: '#3a7a9a', wall: '#9a5434', wallTop: '#8a4a2e', wreck: 'truck', wallTex: { wall: 'rock' },
      sky: ['#4a7ab8', '#f0c890'], fog: { color: [0.82, 0.62, 0.46], near: 16, far: 38 } },
    grid: R16, heights: R16H,
    legend: { U: 'spire', o: 'roundpillar' },
    props: deco(R16, {
      U: (x, y) => ({ prop: 'spire', col: '#a85a36', h: 1.6 + rnd(x, y) * 1.4, r: 0.6 + rnd(x, y, 4) * 0.3 }),
      R: (x, y) => ({ prop: 'rock', col: '#9a5a3a', scale: 1.0 + rnd(x, y) * 0.4 }),
      x: (x, y) => ({ prop: 'scrap', col: ['#7a6a5a', '#6a5a4a', '#8a5a3a'][(x + y) % 3], col2: '#5a6a72' }),
      A: (x) => ({ prop: 'tent', col: ['#8a6a4a', '#6a7a8a'][x % 2] }),
      M: () => ({ prop: 'machine', col: '#7a4a2a' }),
      B: () => ({ prop: 'crate', col: '#8a6a44' }),
    }).concat([
      // the wrecks: a truck, a chocobo wagon, a little plane
      { at: [11, 12], vehicle: 'truck' }, { at: [3, 20], vehicle: 'wagon' }, { at: [13, 22], vehicle: 'tiny_bronco' },
      // the old crane's mast over the junk, and its hook line
      { at: [15.3, 11.6], prop: 'pylon', h: 5.2, w: 1, top: 0.4, col: '#7a4a2a' },
      { at: [15.3, 11.6], to: [9.5, 13.8], h: 5.0, h2: 2.4, sag: 0.1, r: 0.03, col: '#3a3a3a', count: 1 },
      // the river's source: a fall from under the north-east rim
      ...[26, 27, 28, 29].map(x => ({ at: [x, 3], prop: 'waterfall', scale: [1, 2.3, 1] })),
      // the ropeway: its two track ropes climbing away north, and the gantry that carries them at the platform's edge
      ...[-1, 1].map(k => ({ at: [CAR_AT[0] + k * ROPE_X, ROPE_FROM], to: [CAR_AT[0] + k * ROPE_X, ROPE_TO], y0: CAR_Y0, h: ROPE_H, h2: ROPE_H + ROPE_RISE, sag: 0, r: 0.022, col: '#232326', count: 1, far: true })),
      { at: [17.6, 1.2], prop: 'ropegantry', toward: 'e', reach: (CAR_AT[0] - 17.6) * 0.5, gap: ROPE_X, h: CAR_Y0 + ROPE_H + 0.03 - 2.1 },
      // the scavengers' bunting over the bowl, the fire's log seats
      rope([4.5, 17.2], [12.5, 17.2], 2.2, { bulbs: ['#e05a3a', '#f0c040', '#4a8ad0'], count: 8, sag: 0.4, r: 0.008, col: '#3a3a3a' }),
      post(4.5, 17.2, 4.8), post(12.5, 17.2, 4.8),
      { at: [10, 15.6], prop: 'bench', w: 1, rot: 0, col: '#6a4a2a' },
    ]),
    buildings: [
      { at: [8, 2, 6, 2], h: 2.4, col: '#c8b8a0', roof: '#5a7a9a', top: 'gable', ridge: 'x', rise: 0.7, win: '#ffe0b0', tex: 'siding' },   // the station house
      { at: [9, 18, 4, 3], h: 1.8, col: '#7a6a5a', roof: '#8a4a2a', top: 'shed', rise: 0.5, tin: '#8a4a2a', win: '#ffc070' },          // the scavengers' shack
    ],
    labels: [
      { at: [10.5, 3], face: 's', text: 'GLIMMERFAIR ROPEWAY', size: 0.12, col: '#2a3a5a', y: 2.0 },
      { at: [10.5, 20], face: 's', text: 'NO VACANCY', size: 0.08, col: '#c8b8a0', y: 1.55 },
    ],
    lights: [[9, 15, '#ffa040', 3], [19, 2, '#ffe0a0', 3], [27.5, 4, '#c8e8ff', 2]],
    entries: { from_candlerock: [16, 32, 'up'], from_glimmerfair: [19, 2, 'down'], from_shack: [10, 21, 'down'] },
    exits: [
      { at: [16, 33, 2, 1], to: 'kp_candlerock', entry: 'from_route16' },
      { at: [19, 1, 1, 1], to: 'kp_glimmerfair', entry: 'from_route16', run: ropewayUp },
      { at: [10, 20, 1, 1], to: 'kp_route16_shack', entry: 'from_town', sfx: 'door' },
    ],
    npcs: R16T.map(t => t.npc).concat([
      folk({ id: 'r16_attendant', name: 'Ropeway Attendant', model: { base: 'man', top: '#3a5a8a', bottom: '#2a2a3a', hairStyle: 'cap', extras: ['vest', 'tie'] }, at: [17, 4], dir: 'down',
        lines: "Welcome to the Glimmerfair Ropeway! Step through the gap in the rail and climb aboard. The gondola goes up whenever there's someone in it.\fThe ride's free. Coming back down is free. Glimmerfair itself, though... nothing up there is free. Hang on to your coins." }),
      folk({ id: 'r16_dealer', name: 'Junk Dealer', model: { base: 'oldman', top: '#6a5a3a', bottom: '#4a4030', hairStyle: 'bald', extras: ['apron', 'glasses', 'beard'] }, at: [8, 17], dir: 'down',
        lines: "Junk? JUNK? This is salvage, friend. That plane? Some show-off tried to land it on the Glimmerfair mesa and came down three miles short. Right here. Very lucky. For us.\fEverything in the Rustbowl was something once. Give it a wipe and it'll be something again." }),
      folk({ id: 'r16_kid', name: 'Scrap Kid', model: 'kid7', at: [13, 19], dir: 'left', wander: 1,
        lines: "I built a moogle out of a kettle and two springs! It doesn't go. The old man says it needs a spark from the Lifestream.\fI asked where you get one of those. He said 'Candlerock'. Everybody says 'Candlerock'." }),
      sitter({ id: 'r16_elder', name: 'Old Scavenger', model: 'oldwoman7', at: [10, 15], dir: 'left',
        lines: "This bowl was a lake when I was a girl. Then the river moved over to the east wall, the lake dried up, and folk started throwing things into the hole.\fWe came for the scrap and stayed for the view. The view is scrap. But the sunsets on it are something." }),
      W.moogle('r16_mog1', 'dustbun_sweeper', [7, 21], { wander: 2, line: 'Dustbun: Kupo-swsh! It sweeps the sand. The sand does not mind.' }),
      W.moogle('r16_mog2', 'slumkin_scavenger', [3, 15], { wander: 2, line: 'Slumkin: Clank-kupo! It shows you a bent fork with enormous pride.' }),
      W.moogle('r16_mog3', 'angler_fisher', [32, 17], { wander: 1, line: 'Angler: Kupo! Its little rod twitches. Nothing on it yet.' }),
    ]),
    objects: [ropewayCar],
    items: [W.item('r16_heap', [5, 14], 'max_oil', 2), W.item('r16_sandbar', [32, 20], 'boost_ranger'), W.item('r16_ledge', [25, 8], 'royal_nut', 2), W.coins('r16_coins', [2, 23], 900)],
    triggers: [
      W.sign([18, 31], 'ROUTE 16 - RUSTBOWL ROAD\fSouth: Candlerock.   North: the Glimmerfair Ropeway.'),
      W.sign([15, 5], 'GLIMMERFAIR ROPEWAY\fUp to Glimmerfair, the carnival town on the mesa. Board at the gap in the rail.'),
      W.hidden('r16_wreck', [11, 12], 'quick_gear'),
      ledge([8, 10, 6], 'down', 1), ledge([10, 6, 4], 'down', 1),
    ].concat(R16T.map(t => t.trig)),
    onEnter: function* (s) { if (s.entry() === 'from_glimmerfair') yield* ropewayIn(s); },
  });
  W.house('kp_route16_shack', { name: "Scavengers' Shack", area: 'Route 16', town: 'kp_route16', back: 'from_shack', decor: 'rustic',
    grid: [
      "############",
      "#qB.o..x.Bk#",
      "#..........#",
      "#.t..@.....#",
      "#.........x#",
      "#####+######",
    ],
    legend: { '@': 'campfire' },
    npcs: [
      folk({ id: 'r16s_boss', name: 'Patch', model: { base: 'woman', top: '#5a6a4a', bottom: '#4a3a2a', hairStyle: 'ponytail', hair: '#c8b090', extras: ['goggles', 'vest', 'apron'] }, at: [7, 2], dir: 'down',
        talk: function* (s) {
          if (s.flag('kp_r16_patch')) { yield s.say('Patch', "Mind the stove. It's the engine out of that plane. It's either a stove or a rocket, depending on the day."); return; }
          yield s.say('Patch', "Welcome to the shack! Wipe your feet. Or don't; the floor's sand anyway.\fWe find the oddest things in the Rustbowl. Last week, a whole crate of moogle batteries, still sealed. Must have fallen off a Glimmerfair cart.");
          s.set('kp_r16_patch'); KP.give('battery', 2); s.sfx('found');
          yield s.msg('Received 2 Spare Batteries!');
          yield s.say('Patch', "Take a couple. Finders keepers, sharers... also keepers. That's the Rustbowl rule.");
        } }),
      W.moogle('r16s_mog', 'gizmog_inventor', [3, 3], { wander: 1, line: 'Gizmog: Bzzt-kupo! It is fixing a toaster. The toaster seems worried.' }),
    ] });

  // ================================================================== the Demo's steps (js/kupomon/kp_runner.js O.kp_plan;
  // the route: js/runner/plans/plan_kp.js). From wherever it stands: through Ravenmoor's east gate and over the moor to
  // Candlerock (Route 15's trainers on the way), repaired and stocked there; the stars with Bugenhagen (the Arcade opens);
  // then the Ember Arcade: Tala, the five braziers in the Guardian's order, Ursa, Ashkii, Red XIII
  const tr = (id) => 'kp_tr_' + id;
  KP.PLANS = KP.PLANS || {};
  KP.PLANS.r5a = { name: 'Route 15, Candlerock and the Ember Arcade (Red XIII)', steps: [
    ['obj', 'East of Ravenmoor: Route 15, the Cinder Moor'],
    ['kp_win', [['goto', 'kp_candlerock']], { map: 'kp_candlerock' }, { train: 'kp_route15' }],
    ['kp_heal', { center: 'kp_candlerock_center' }],
    ['kp_buy', { kupo_nut: 10, golden_nut: 4, royal_nut: 2, hi_oil: 8, max_oil: 4, battery: 3 }, { center: 'kp_candlerock_center' }],
    ['kp_heal', { center: 'kp_candlerock_center' }],
    ['obj', "Candlerock: the stars with Bugenhagen"],
    ['talk', 'cro_bugen', { map: 'kp_candlerock_observatory', done: CR_STARS, choose: 'Because they are happy' }],
    ['expect', CR_STARS],
    ['kp_heal', { center: 'kp_candlerock_center' }],
    ['kp_equip'],
    ['kp_relearn'],
    ['obj', "Red XIII's Ember Arcade: light the Guardian's stars"],
    ['kp_win', [
      ['goto', 'kp_candlerock_dojo'],
      ['talk', 'er_tala', { done: tr('er_tala') }],
      ['use', 5, 10, { done: { any: ['kp_er_b1', ER_LIT] }, choose: 'Light it' }],
      ['use', 9, 7, { done: { any: ['kp_er_b2', ER_LIT] }, choose: 'Light it' }],
      ['use', 12, 12, { done: { any: ['kp_er_b3', ER_LIT] }, choose: 'Light it' }],
      ['use', 10, 15, { done: { any: ['kp_er_b4', ER_LIT] }, choose: 'Light it' }],
      ['use', 22, 9, { done: ER_LIT, choose: 'Light it' }],
      ['talk', 'er_ursa', { done: tr('er_ursa') }],
      ['talk', 'er_ashkii', { done: tr('er_ashkii') }],
      ['talk', 'er_redxiii', { done: 'kp_badge_7' }],
    ], 'kp_badge_7', { train: 'kp_route15' }],
    ['expect', 'kp_badge_7'],
    ['kp_heal', { center: 'kp_candlerock_center' }],
  ] };
})();

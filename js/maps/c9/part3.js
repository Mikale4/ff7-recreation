// Chapter 9 (part 3) — Gaea's Cliff and the Northern Crater (Disc 2).
// Gaea's Cliff: three climbs (the wall_climb minigame: forking cracks, body temperature, rub your hands warm; below
// 26°C you black out and wake up at Holzoff's), the ice caves (upper walkway and ice bridge, the hidden
// Ribbon, the Javelin, the ice boulder that clears the lower tunnel), the hall with the save point, the
// hanging icicles (Evilhead battles; Fire Armlet, Megalixir; the fallen icicles bridge the hall: Elixir,
// Speed Source), the trail (Enhance Sword), the healing spring, and Schizo.
// Northern Crater: the rim (Tifa insists on coming), the Shinra airship arriving, the Whirlwind Maze
// (dying black-robed men, the gusts, the lightning), Sephiroth's shell and Jenova·DEATH, the Black Materia
// entrusted to Barret or Red XIII, the members who stay behind, the Nibelheim illusion ("you were never
// there"), Cloud's collapse, Rufus/Hojo/Scarlet/Heidegger in the crater, WEAPON's eye, the Black Materia
// handed to Sephiroth, the Weapons awaken and Meteor is summoned. Cloud goes missing -> Junon (part 4).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c9_climb_help, c9_boulder, c9_icicle_1..4, c9_icicles_down, c9_schizo, c9_rim_seen, c9_airship_seen,
// c9_clone1/2, c9_jenova_death, c9_center, c9_illusion, c9_cave_done; vars c9_holder, c9_third.
(function () {
  const C9 = FF7.c9 = FF7.c9 || {};
  // refs 11-gaeacliff34, 36, 40, 41: deep blue crystal ice lit cyan from within, dark hollows
  const ICE_CAVE = { floor: ['#7aa0cc', '#7298c6'], floor2: ['#9cc0e4', '#94b8de'], wall: '#2e5290', trim: '#1a2e5a', wallTop: '#1e3462', water: '#1a6ab0', mako: '#60e0ff',
    sky: ['#02060e', '#0a1a3a'], fog: { color: [0.03, 0.08, 0.2], near: 7, far: 20 }, ambient: [0.4, 0.48, 0.64], light: [0.6, 0.78, 1.0] };
  const CLIFF = { floor: ['#dfe4ec', '#d6dce6'], floor2: ['#b8c4d2', '#b0bccb'], wall: '#6a707c', trim: '#40444c', wallTop: '#e8eef6',
    sky: ['#4a5a78', '#b8c4d4'], fog: { color: [0.7, 0.75, 0.84], near: 9, far: 26 }, ambient: [0.54, 0.56, 0.62] };
  // green-grey rock of the crater (refs 12-whirlwindmaze30, 39, 40, 18-final13); the heart (crater_cave) keeps its blue crystal
  const CRATER = { sky: ['#06100e', '#27443c'], fog: { color: [0.16, 0.24, 0.22], near: 8, far: 24 }, floor: ['#56645a', '#505e54'], floor2: ['#66725e', '#606c58'],
    wall: '#46564c', trim: '#26302a', wallTop: '#34443a', ambient: [0.4, 0.46, 0.42], light: [0.72, 0.8, 0.74] };
  // the Whirlwind Maze: rock spires in a pale green storm (refs 12-whirlwindmaze39, 40)
  const MAZE = { sky: ['#1e3c36', '#a4d4c4'], fog: { color: [0.5, 0.66, 0.6], near: 9, far: 26 } };
  // snow over green rock on the rim and the slopes (refs 11-gaeacliff48, 12-whirlwindmaze42, 43, 47)
  const RIM = { floor: ['#d4dce0', '#ccd4d8'], floor2: ['#b8c6c4', '#b0beba'], sky: ['#020812', '#1c4048'], fog: { color: [0.12, 0.2, 0.24], near: 10, far: 30 },
    ambient: [0.5, 0.54, 0.6], light: [0.75, 0.8, 0.9] };
  const ROBE = { base: 'man', hair: '#1a1a1a', hairStyle: 'bald', skin: '#b8b0a8', top: '#16161c', sleeve: '#16161c', bottom: '#16161c', boots: '#101014', extras: ['robe'] };
  const TIFA_YOUNG = { base: 'tifa', top: '#f0ece0', sleeve: 'skin', bottom: '#8a5a30', skirt: 'short', boots: '#6a4020', extras: ['vest'] };
  const ICE_CHUNK = { enemy: 'icicle', scale: 0.7 };

  // ================================================================== climbing
  function blockLadders(grid) {
    return function (s) { grid.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'H') s.block(x, y); }); };
  }
  function* fall(s) {
    s.anim('player', 'hurt');
    yield s.say(s.leader(), "(My hands... I can't feel them... I can't hold on...!)");
    s.sfx('falling');
    s.shake(3, 30);
    yield s.fadeOut(50, '#ffffff');
    C9.resetCold(s);
    yield s.goto('gaea_cabin', 'rescued');
  }
  // The climb itself is the Gaea's Cliff minigame (js/minigames/misc_games.js 'wall_climb', stages 1-3: forking
  // cracks, dead ends, body temperature). Made it: onto the top ledge (top: [x, y]); passed out: the fall.
  function* climb(s, stage, top) {
    const r = yield s.minigame('wall_climb', { stage, player: s.leader() });
    if (!(r && r.won)) { yield* fall(s); return false; }
    s.place('player', top[0], top[1], 'up');
    return true;
  }
  // Climb back down from the top ledge (no temperature check).
  const climbDown = (x, y) => function* (s) {
    const c = yield s.ask(null, 'Climb back down the cliff?', ['Climb down', 'Stay']);
    if (c !== 0) return;
    yield s.fadeOut(20);
    s.place('player', x, y, 'up');
    yield s.fadeIn(20);
  };
  const cliffHeights = [
    "999999999999999999999999", "999999999999999999999999", "999999999999999999999999", "999999999999999999999999",
    "888888888888888888888888", "777777777777777777777777", "666666666666666666666666", "555555555555555555555555",
    "444444444444444444444444", "333333333333333333333333", "222222222222222222222222", "111111111111111111111111",
    "000000000000000000000000", "000000000000000000000000", "000000000000000000000000", "000000000000000000000000",
  ];
  function cliffMap(id, def) {
    def.area = "Gaea's Cliff";
    def.theme = 'mountain';
    def.look = Object.assign({}, CLIFF, def.look || {});
    if (def.music === undefined) def.music = 'northcave';
    def.heights = cliffHeights;
    def.battle = { table: 'gaeas_cliff_outside', bg: 'cliff', rate: 0.8 };
    def.onLoad = blockLadders(def.grid);
    FF7.defineMap(id, def);
  }

  // ------------------------------------------------------------------ first climb
  const CLIFF1_TOP = [10, 2];   // (the ledge at the top of the climb)
  cliffMap('gaea_cliff1', {
    name: "Gaea's Cliff",
    grid: [
      "##########++############",
      "#UU.......::.........UU#",
      "#R........::..........R#",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHHHHHHRRRRRRRR",
      "RRRRRRRRRRRRRRRHRRRRRRRR",
      "RRRRRRRRRRRRRRRHRRRRRRRR",
      "RRRRRRRRRRRHHHHHRRRRRRRR",
      "RRRRRRRRRRRHRRRRRRRRRRRR",
      "RRRRRRRRRRRHRRRRRRRRRRRR",
      "#.........::...........#",
      "#U........::.........UU#",
      "##########::############",
    ],
    entries: { from_base: [11, 14, 'up'], from_cave: [10, 1, 'down'] },
    exits: [
      { at: [10, 15, 2, 1], to: 'gaea_base', entry: 'from_cliff' },
      { at: [10, 0, 2, 1], to: 'gaea_cave1', entry: 'from_cliff' },
    ],
    triggers: [
      C9.counter([9, 12, 5, 1], function* (s) {
        const c = yield s.ask(null, 'A crack runs up the face of the cliff. Start climbing?', ['Climb', 'Not yet']);
        if (c === 0) yield* climb(s, 1, CLIFF1_TOP);
      }),
      C9.counter([9, 3, 3, 1], climbDown(11, 13)),
    ],
    onEnter: function* (s) {
      if (s.flag('c9_cliff1_seen')) return;
      s.set('c9_cliff1_seen');
      yield s.say(s.leader(), "(Gaea's Cliff... Straight up. Holzoff said to keep moving and keep my hands warm.)");
    },
  });

  // ------------------------------------------------------------------ second climb
  const CLIFF2_TOP = [12, 2];   // (the ledge at the top of the climb)
  cliffMap('gaea_cliff2', {
    name: "Gaea's Cliff",
    grid: [
      "############++##########",
      "#UU.........::.......UU#",
      "#R..........::........R#",
      "RRRRRRRRRRRRHRRRRRRRRRRR",
      "RRRRRRHRRRRRHRRRRRRRRRRR",
      "RRRRRRHRRRRRHRRRRRRRRRRR",
      "RRRHHHHHHHHHHRRRRRRRRRRR",
      "RRRRRRHRRRRRRRRRRRRRRRRR",
      "RRRRRRHRRRRRRRRRRRRRRRRR",
      "RRRRRRHHHHHRRRRRRRRRRRRR",
      "RRRRRRHRRRRRRRRRRRRRRRRR",
      "RRRRRRHRRRRRRRRRRRRRRRRR",
      "RRRRRRHRRRRRRRRRRRRRRRRR",
      "#.....::...............#",
      "#U....::.............UU#",
      "######::################",
    ],
    entries: { from_cave: [6, 14, 'up'], from_hall: [12, 1, 'down'] },
    exits: [
      { at: [6, 15, 2, 1], to: 'gaea_cave2', entry: 'from_cliff2' },
      { at: [12, 0, 2, 1], to: 'gaea_hall', entry: 'from_cliff' },
    ],
    triggers: [
      C9.counter([4, 12, 5, 1], function* (s) {
        const c = yield s.ask(null, 'The cliff face splits into a maze of cracks above. Start climbing?', ['Climb', 'Not yet']);
        if (c === 0) yield* climb(s, 2, CLIFF2_TOP);
      }),
      C9.counter([11, 3, 3, 1], climbDown(6, 13)),
    ],
  });

  // ------------------------------------------------------------------ third climb
  const CLIFF3_TOP = [10, 2];   // (the ledge at the top of the climb)
  cliffMap('gaea_cliff3', {
    name: "Gaea's Cliff - Summit Face",
    grid: [
      "##########++############",
      "#UU.......::.........UU#",
      "#R........::..........R#",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHHHHHHRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRHHHHHHHHHRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "RRRRRRRRRRHRRRRRRRRRRRRR",
      "#.........::...........#",
      "#U........::.........UU#",
      "##########::############",
    ],
    entries: { from_trail: [10, 14, 'up'], from_spring: [10, 1, 'down'] },
    exits: [
      { at: [10, 15, 2, 1], to: 'gaea_trail', entry: 'from_cliff3' },
      { at: [10, 0, 2, 1], to: 'gaea_spring', entry: 'from_cliff' },
    ],
    triggers: [
      C9.counter([8, 12, 5, 1], function* (s) {
        const c = yield s.ask(null, 'The last cliff face. Somewhere above, the wind howls over the summit. Start climbing?', ['Climb', 'Not yet']);
        if (c === 0) yield* climb(s, 3, CLIFF3_TOP);
      }),
      C9.counter([9, 3, 3, 1], climbDown(10, 13)),
    ],
  });

  // ================================================================== the ice caves
  function caveMap(id, def) {
    def.area = "Gaea's Cliff";
    def.theme = def.theme || 'ice';
    def.look = Object.assign({}, def.theme === 'ice' ? ICE_CAVE : {}, def.look || {});
    if (def.music === undefined) def.music = 'northcave';
    if (def.battle === undefined) def.battle = { table: 'gaeas_cliff_inside', bg: 'cliff', rate: 1 };
    FF7.defineMap(id, def);
  }

  // A: lower hall + upper walkway with the ice bridge and the hidden Ribbon
  caveMap('gaea_cave1', {
    name: "Gaea's Cliff - Ice Cavern",
    grid: [
      "########################++####",
      "#U......U         .........U.#",
      ".........         ...........#",
      ".........iiiiiiiii.........UU#",
      "#U......U         U.......UUU#",
      "#............................#",
      "#..U......R...........U......#",
      "#............................#",
      "#......U.............R........",
      "#.............................",
      "#..R.........U...............#",
      "#UU.......................UUU#",
      "#U::......................UUU#",
      "##::##########################",
    ],
    heights: [
      "555555555555555555555555555555",
      "555555555555555555555555555555",
      "555555555555555555555555555555",
      "555555555555555555555555555555",
      "555555555555555555555555555555",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_cliff: [2, 12, 'up'], from_b: [28, 8, 'left'], from_b_upper: [1, 2, 'right'], from_c: [24, 1, 'down'] },
    exits: [
      { at: [2, 13, 2, 1], to: 'gaea_cliff1', entry: 'from_cave' },
      { at: [29, 8, 1, 2], to: 'gaea_cave2', entry: 'from_a' },
      { at: [0, 2, 1, 2], to: 'gaea_cave2', entry: 'from_a_upper' },
      { at: [24, 0, 2, 1], to: 'gaea_cave3', entry: 'from_a' },
    ],
    chests: [{ at: [28, 1], item: 'ribbon', id: 'gaea_cave1_ribbon' }],
    objects: [
      { at: [13, 4], talk: function* (s) { yield s.msg('Far below the ice bridge, the lower cavern glitters in the dark.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c9_cave1_seen') || s.entry() !== 'from_cliff') return;
      s.set('c9_cave1_seen');
      yield s.say(s.leader(), "(A cave in the ice... There's a ledge running along the top of this cavern. There must be a way up there somewhere.)");
    },
  });

  // B: the stair back up to A's walkway, and the tunnel blocked by ice
  caveMap('gaea_cave2', {
    name: "Gaea's Cliff - Ice Cavern",
    grid: [
      "##########################",
      "#UU.......################",
      "..........################",
      "..........################",
      "#UUUUUUU^^################",
      "#.......^^...........UU..#",
      "#...U..................RR#",
      "..................U......#",
      ".........................:",
      "#......R..............UU.#",
      "#UU..................UUUU#",
      "##########################",
    ],
    heights: [
      "00000000000000000000000000",
      "44444444440000000000000000",
      "44444444440000000000000000",
      "44444444440000000000000000",
      "44444444330000000000000000",
      "00000000110000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    entries: { from_a: [1, 8, 'right'], from_a_upper: [1, 2, 'right'], from_cliff2: [23, 8, 'left'] },
    exits: [
      { at: [0, 7, 1, 2], to: 'gaea_cave1', entry: 'from_b' },
      { at: [0, 2, 1, 2], to: 'gaea_cave1', entry: 'from_b_upper' },
      { at: [25, 8, 1, 1], to: 'gaea_cliff2', entry: 'from_cave' },
    ],
    npcs: [
      { id: 'ice_block', name: 'Ice', model: ICE_CHUNK, at: [24, 8], dir: 'left', show: s => !s.flag('c9_boulder'),
        talk: function* (s) { yield s.msg('A massive chunk of ice has wedged itself into the tunnel mouth. It won\'t budge.'); } },
    ],
    onLoad: function (s) { if (!s.flag('c9_boulder')) s.block(25, 8); },
  });

  // C: the Javelin and the ledge with the loose ice boulder
  caveMap('gaea_cave3', {
    name: "Gaea's Cliff - Ice Cavern",
    grid: [
      "############################",
      "################U.........U#",
      "################...........#",
      "################..U........#",
      "   #############...........#",
      "   ........................#",
      "   #############.....U.....#",
      "                ...........#",
      "                .U.........#",
      "                ...........#",
      "                UU......::.#",
      "                ########::##",
    ],
    entries: { from_a: [24, 10, 'up'] },
    exits: [{ at: [24, 11, 2, 1], to: 'gaea_cave1', entry: 'from_c' }],
    chests: [{ at: [25, 2], item: 'javelin', id: 'gaea_cave3_javelin' }],
    npcs: [
      { id: 'ice_boulder', name: 'Ice', model: ICE_CHUNK, at: [3, 5], dir: 'right', show: s => !s.flag('c9_boulder'),
        talk: function* (s) {
          yield s.msg('A huge boulder of ice teeters on the edge of the drop. It looks like it would take very little to send it over.');
          const c = yield s.ask(null, 'Kick it?', ['Kick it!', 'Leave it']);
          if (c !== 0) return;
          s.anim('player', 'kick');
          s.sfx('hit');
          yield 12;
          s.remove('ice_boulder');
          s.sfx('falling');
          yield 30;
          s.shake(5, 40);
          s.set('c9_boulder');
          yield s.msg('The boulder tumbles over the edge... Somewhere below, ice shatters with a thunderous crash!');
          s.stopAnim('player');
        } },
    ],
  });

  // ================================================================== the hall (save point, icicle bridges)
  const bridgeJump = (x, y, back) => function* (s) {
    if (!s.flag('c9_icicles_down')) {
      yield s.say(s.leader(), back ? "(Too far to jump back from here.)" : "(Too wide to jump... If only there were something to cross on.)");
      return;
    }
    if (!s.flag('c9_bridge_seen')) { s.set('c9_bridge_seen'); yield s.msg('The icicles that crashed down from the ledge above now lie across the chasm like bridges.'); }
    yield s.jump('player', x, y, 0.8, 28);
  };
  caveMap('gaea_hall', {
    name: "Gaea's Cliff - Great Hall",
    grid: [
      "#############++#############",
      "#.....####...::...##########",
      "#.....####........##########",
      "#UU...####UU....UU##########",
      "#                   ########",
      "#                   ########",
      "#.U..........R.............#",
      "#...........................",
      "#......S....................",
      "#..R.....................U.#",
      "#U......................U..#",
      "#UU.........::..........UU.#",
      "############::##############",
    ],
    entries: { from_cliff: [12, 11, 'up'], from_ledge: [26, 7, 'left'], from_trail: [13, 1, 'down'], from_jump: [20, 9, 'up'] },
    exits: [
      { at: [13, 0, 2, 1], to: 'gaea_trail', entry: 'from_hall' },
      { at: [27, 7, 1, 2], to: 'gaea_ledge', entry: 'from_hall' },
      { at: [12, 12, 2, 1], to: 'gaea_cliff2', entry: 'from_hall' },
    ],
    chests: [
      { at: [26, 11], item: 'elixir', id: 'gaea_hall_elixir' },
      { at: [1, 1], item: 'speed_source', id: 'gaea_hall_speed_source' },
    ],
    triggers: [
      C9.counter([10, 5, 8, 1], bridgeJump(13, 3, false)),
      C9.counter([10, 4, 8, 1], bridgeJump(13, 6, true)),
      C9.counter([1, 5, 6, 1], bridgeJump(4, 2, false)),
      C9.counter([1, 4, 6, 1], bridgeJump(4, 6, true)),
    ],
    onEnter: function* (s) {
      if (s.flag('c9_hall_seen')) return;
      s.set('c9_hall_seen');
      yield s.say(s.leader(), "(There's a passage on the far side of that chasm... but it's way too far to jump. Maybe there's another way around, outside.)");
    },
  });

  // ================================================================== the icicle ledge
  const ICICLES = [11, 8, 5, 3];
  function icicleTrigger(i) {
    const x = ICICLES[i];
    return {
      at: [x, 1, 1, 4], once: false, if: s => !s.flag('c9_icicle_' + (i + 1)),
      run: function* (s) {
        s.shake(2, 20);
        yield s.emote('player', '!');
        if (!s.flag('c9_icicle_warned')) {
          s.set('c9_icicle_warned');
          yield s.say(s.leader(), "(The icicle above is cracking... Something's moving inside it!)");
        }
        const r = yield s.battle({ table: 'gaeas_cliff_icicle', bg: 'cliff' });
        if (r !== 'win') { yield s.move('player', x + 2, 3); return; }
        s.set('c9_icicle_' + (i + 1));
        s.remove('icicle' + (i + 1));
        s.sfx('ice'); s.shake(5, 30);
        yield s.msg('With a deafening crack, the great icicle breaks loose and plunges into the depths below!');
        if (ICICLES.every((_, k) => s.flag('c9_icicle_' + (k + 1)))) {
          s.set('c9_icicles_down');
          yield s.say(s.leader(), "(That was the last one. They crashed straight down... into the hall below, maybe?)");
        }
      },
    };
  }
  caveMap('gaea_ledge', {
    name: "Gaea's Cliff - Icicle Ledge", theme: 'mountain', look: CLIFF,
    battle: { table: 'gaeas_cliff_outside', bg: 'cliff', rate: 0.7 },
    grid: [
      "################################",
      "#U............................U#",
      "#..............................#",
      "#..............................#",
      "#.............::...............#",
      "              ::                ",
      "              ::                ",
      "##############::################",
    ],
    entries: { from_hall: [14, 4, 'up'] },
    exits: [{ at: [14, 7, 2, 1], to: 'gaea_hall', entry: 'from_ledge' }],
    chests: [
      { at: [30, 2], item: 'fire_armlet', id: 'gaea_ledge_fire_armlet' },
      { at: [1, 2], item: 'megalixir', id: 'gaea_ledge_megalixir' },
    ],
    npcs: ICICLES.map((x, i) => ({ id: 'icicle' + (i + 1), name: 'Icicle', model: { enemy: 'icicle', scale: 0.9 }, at: [x, 1], dir: 'down', solid: false,
      show: s => !s.flag('c9_icicle_' + (i + 1)), talk: function* (s) { yield s.msg('A monstrous icicle hangs from the overhang. Dark shapes seem to shift inside it.'); } })),
    triggers: ICICLES.map((_, i) => icicleTrigger(i)).concat([
      { at: [16, 5, 15, 1], on: 'talk', if: s => s.flag('c9_icicles_down'), run: function* (s) {
          const c = yield s.ask(null, 'The drop looks survivable from here... Jump down to the hall?', ['Jump!', 'Stay']);
          if (c !== 0) return;
          yield s.jump('player', 18, 6, 1.2, 30);
          yield s.goto('gaea_hall', 'from_jump');
        } },
    ]),
  });

  // ================================================================== the trail (Enhance Sword)
  FF7.defineMap('gaea_trail', {
    name: "Gaea's Cliff - Mountain Trail", area: "Gaea's Cliff", theme: 'mountain', music: 'northcave', look: CLIFF,
    battle: { table: 'gaeas_cliff_outside', bg: 'cliff', rate: 1 },
    grid: [
      "###########################::###",
      "#R........................R::..#",
      "#.....T.......R..........::....#",
      "#.....................:::......#",
      "#..R............:::::.....R....#",
      "#.........::::::...............#",
      "#.....::::.........R...........#",
      "#...::.........................#",
      "#..::.......R..........R.......#",
      "   ::                           ",
      "###::###########################",
    ],
    entries: { from_hall: [3, 8, 'up'], from_cliff3: [27, 1, 'down'] },
    exits: [
      { at: [3, 10, 2, 1], to: 'gaea_hall', entry: 'from_trail' },
      { at: [27, 0, 2, 1], to: 'gaea_cliff3', entry: 'from_trail' },
    ],
    chests: [{ at: [20, 2], item: 'enhance_sword', id: 'gaea_trail_enhance_sword' }],
  });

  // ================================================================== the healing spring
  const spring = function* (s) {
    s.sfx('heal2');
    s.flash('#a0ffe0', 16, 0.5);
    s.heal();
    yield s.msg('The water glows softly at your touch. Warmth spreads through tired limbs...\nHP and MP fully restored!');
  };
  caveMap('gaea_spring', {
    name: "Gaea's Cliff - Spring",
    battle: { table: 'gaeas_cliff_lair', bg: 'cliff', rate: 1 },
    look: { water: '#40c0b0' },
    lights: [[7, 4, '#80ffe0', 4]],
    grid: [
      "############++############",
      "#UU.........::.........UU#",
      "#U..........::..........U#",
      "#.....~~~~..::...........#",
      "#....~~~~~~.::......S....#",
      "#.....~~~~..::...........#",
      "#...........::.......U...#",
      "#U..........::..........U#",
      "#UU.........::.........UU#",
      "############::############",
    ],
    entries: { from_cliff: [12, 8, 'up'], from_lair: [12, 1, 'down'] },
    exits: [
      { at: [12, 9, 2, 1], to: 'gaea_cliff3', entry: 'from_spring' },
      { at: [12, 0, 2, 1], to: 'gaea_lair', entry: 'from_spring' },
    ],
    triggers: [C9.counter([4, 3, 8, 3], spring)],
    onEnter: function* (s) {
      if (s.flag('c9_spring_seen')) return;
      s.set('c9_spring_seen');
      yield s.say(s.leader(), "(A spring... in the middle of all this ice. The water is glowing.)");
    },
  });

  // ================================================================== Schizo
  caveMap('gaea_lair', {
    name: "Gaea's Cliff - Summit Tunnel",
    battle: { table: 'gaeas_cliff_lair', bg: 'cliff', rate: 0.6, if: s => s.flag('c9_schizo') },
    grid: [
      "########::::########",
      "#UU.....::::.....UU#",
      "#U......::::......U#",
      "#...x...::::...x...#",
      "#U......::::......U#",
      "#.......::::.......#",
      "#UU.....::::.....UU#",
      "#.......::::.......#",
      "#U..x...::::...x..U#",
      "#.......::::.......#",
      "#UU.....::::.....UU#",
      "#U......::::......U#",
      "#UU.....::::.....UU#",
      "########::::########",
    ],
    entries: { from_spring: [9, 12, 'up'], from_rim: [9, 1, 'down'] },
    exits: [
      { at: [8, 13, 4, 1], to: 'gaea_spring', entry: 'from_lair' },
      { at: [8, 0, 4, 1], to: 'crater_rim', entry: 'from_cliff', if: s => s.flag('c9_schizo') },
    ],
    objects: [
      { at: [4, 3], talk: function* (s) { yield s.msg('Enormous bones, frozen into the ice. Something big has been feeding up here.'); } },
    ],
    triggers: [
      { id: 'schizo', at: [1, 5, 18, 2], once: true, if: s => !s.flag('c9_schizo'), run: function* (s) {
          s.music('none');
          s.shake(4, 60);
          yield s.say(s.leader(), "(The ground's shaking...!)");
          s.spawn('schizo', { enemy: 'schizo_right', scale: 1.1 }, 9, 2, 'down', { name: 'Schizo' });
          yield s.move('schizo', 9, 3, { speed: 0.02 });
          yield s.emote('player', '!!');
          yield* C9.anyone(s, [
            ['tifa', "Two heads...! Cloud, look out!"],
            ['barret', "A two-headed dragon?! Gimme a break!"],
            ['redxiii', "It guards the summit... We have no choice but to fight!"],
            ['cid', "Aw, crap! Two heads, twice the ugly!"],
          ]);
          yield s.battle({ enemies: ['schizo_right', 'schizo_left'], bg: 'cliff', music: 'boss', noEscape: true });
          s.remove('schizo');
          s.set('c9_schizo');
          s.music('northcave');
          yield s.say(s.leader(), "(...It's over. The wind's coming from up ahead. We must be near the top.)");
        } },
    ],
  });

  // ================================================================== NORTHERN CRATER
  function craterMap(id, def) {
    def.area = 'Northern Crater';
    def.theme = def.theme || 'crater';
    def.look = Object.assign({}, CRATER, def.look || {});
    if (def.music === undefined) def.music = 'northcave';
    FF7.defineMap(id, def);
  }
  // Rock spires of the Whirlwind Maze (refs 12-whirlwindmaze39, 40): tall tapered needles of the crater's
  // green rock. [x, y, height (m), base radius (tiles), sunk (m)]: plain ones stand on `X` (spire) tiles,
  // `sunk` ones rise out of the abyss (void tiles) or out of the north cliff (on its edge line, y -0.5).
  const SPIRE_COL = [CRATER.wall, '#4e6050', '#40504a'];
  const spires = (list) => list.map(([x, y, h, r, sunk], i) => ({ at: [x, y], prop: 'spire', h: h + (sunk || 0), r: r || 0.8,
    col: SPIRE_COL[i % SPIRE_COL.length], y0: sunk ? -sunk : undefined }));
  // Gust / lightning cycles: a background loop that toggles a flag while the player is on this map.
  function hazardLoop(mapId, flag, calm, active, fx) {
    return function* (s) {
      const token = s.inc('c9_hazard');           // a newer loop (map re-entered) retires this one
      const alive = () => s.mapId() === mapId && s.get('c9_hazard') === token;
      while (alive()) {
        s.unset(flag);
        yield calm;
        if (!alive()) break;
        s.set(flag);
        fx(s);
        yield active;
      }
      if (s.get('c9_hazard') === token) s.unset(flag);
    };
  }
  const gustFx = (color) => (s) => { s.shake(1, 30); s.flash(color, 12, 0.25); s.sfx('ice'); };
  function gustLane(flag, rows, x0, w, back) {
    return rows.map(r => ({
      at: [x0, r, w, 1], once: false, if: s => s.flag(flag),
      run: function* (s) {
        s.anim('player', 'hurt');
        s.shake(3, 20);
        yield s.move('player', back[0], back[1], { speed: 0.11 });
        s.stopAnim('player');
        if (!s.flag('c9_gust_seen')) { s.set('c9_gust_seen'); yield s.msg('The whirlwind hurls the party back!\n(Wait for the wind to die down, then make a run for it.)'); }
        yield s.battle({ enemies: ['wind_wing', 'wind_wing'], bg: 'crater' });
      },
    }));
  }

  // ------------------------------------------------------------------ the crater rim
  craterMap('crater_rim', {
    name: 'Northern Crater - Rim',
    look: RIM,
    camera: { pitch: 44, dist: 12 },
    battle: { table: 'crater_d2', bg: 'crater', rate: 1 },
    grid: [
      "                                ",
      "RRR     ....           ....  RRR",
      "RR............................RR",
      "R......R.......................:",
      "R.............::::::::::::::::::",
      "R..........::::.........R......:",
      "R.......::::...................R",
      "R....::::.......R..............R",
      "RR.::.........................RR",
      "RRR::.......R.............RRRRRR",
      "RRR::RRRRRRRRRRRRRRRRRRRRRRRRRRR",
    ],
    entries: { from_cliff: [3, 9, 'up'], from_descent: [30, 4, 'left'] },
    exits: [
      { at: [3, 10, 2, 1], to: 'gaea_lair', entry: 'from_rim' },
      { at: [31, 3, 1, 3], to: 'crater_descent', entry: 'from_rim' },
    ],
    onEnter: function* (s) {
      if (s.flag('c9_rim_seen')) return;
      s.set('c9_rim_seen');
      s.phs(false);
      yield s.move('player', 8, 6);
      yield s.cam(15, 1, 80, { dist: 14, pitch: 30 });
      yield s.msg('Beyond the summit, the land falls away into a vast crater.\nA great spiral of wind turns slowly over its heart, and the sky above it has gone dark.');
      yield s.say('cloud', "(The Northern Crater... This is where it fell. The Calamity from the Skies.)");
      s.camFollow(40);
      if (s.isMember('tifa') && !s.inParty('tifa')) {
        s.spawn('tifa_j', 'tifa', 3, 9, 'up', { name: s.name('tifa') });
        yield s.run('tifa_j', 7, 7);
        yield s.face('player', 'tifa_j');
        yield s.say('tifa', "Cloud, wait! ...I'm coming with you.\fI can't explain it. I just have a bad feeling about this place, and I don't want to let you out of my sight. Not here.");
        yield s.say('cloud', "......Alright. Stay close.");
        const third = C9.mates(s).filter(id => id !== 'tifa')[0];
        s.party(['cloud', 'tifa', third].filter(Boolean));
        s.remove('tifa_j');
        yield s.msg(`${s.name('tifa')} joined the party.`);
      } else {
        yield* C9.anyone(s, [['tifa', "It's so dark down there... Cloud, let's be careful. Something feels wrong about this place."]]);
      }
      yield* C9.anyone(s, [
        ['barret', "So this is where Sephiroth's been headed all along. Let's finish this!"],
        ['redxiii', "The Planet's wound... I can feel it. Like a fever in the ground."],
        ['cid', "Look at that sky. I've flown through storms, but never nothin' like that."],
        ['vincent', "Whatever waits at the center... it has been waiting a very long time."],
      ]);
    },
  });

  // ------------------------------------------------------------------ the descent (Shinra's airship arrives)
  craterMap('crater_descent', {
    name: 'Northern Crater - Descent',
    look: RIM,
    camera: { pitch: 60, dist: 11 },
    battle: { table: 'crater_d2', bg: 'crater', rate: 1 },
    grid: [
      "##############################",
      "#RR.......RRR.........RRR....:",
      "#R...........S...............:",
      "#....R..........R.........R..#",
      "#.........          .........#",
      "#.......              .......#",
      "#......                ......#",
      "#.......              .......#",
      "#.R.......          .......R.#",
      "#............................#",
      "#RR....R.........R.........RR#",
      "#RRR......::::::::.......RRRR#",
      "##########::::::::############",
    ],
    entries: { from_rim: [28, 1, 'left'], from_scene: [16, 9, 'up'], from_maze: [13, 11, 'up'] },
    exits: [
      { at: [29, 1, 1, 2], to: 'crater_rim', entry: 'from_descent' },
      { at: [10, 12, 8, 1], to: 'crater_maze1', entry: 'from_descent' },
    ],
    items: [{ at: [27, 7], materia: 'neo_bahamut', id: 'crater_descent_neo_bahamut' }],
    triggers: [
      { id: 'airship', at: [1, 8, 28, 2], once: true, if: s => !s.flag('c9_airship_seen'), run: function* (s) {
          s.set('c9_airship_seen');
          s.sfx('helicopter');
          s.shake(1, 90);
          yield s.cam(15, 5, 70, { dist: 13, pitch: 34 });
          yield s.msg('A deep, thrumming roar fills the crater.\nOut of the dark sky, an enormous airship descends... the Shinra emblem glaring from its hull.');
          yield* C9.anyone(s, [['tifa', "That's Shinra's airship! They've followed us here?!"], ['cid', "That's the Highwind... My Highwind. What the hell's Shinra doin' with her HERE?!"]]);
          yield s.goto('crater_airship', 'scene');
        } },
    ],
  });

  // ------------------------------------------------------------------ aboard the Shinra airship (cut-away scene)
  // The airship's bridge - the room that becomes the Highwind's bridge (refs 12-whirlwindmaze41, 15-cloud01,
  // 02): a round nose platform with a curved brass railing out in the great window (sky all round, the
  // window ribs arching overhead), console banks curving along both sides - the helm wheel on the right, a
  // radar table on the left - and a stair down the middle to the lower deck. Seen from behind, looking
  // forward. Shared with part4's highwind_bridge (and copied by C11b's Disc 3 bridge scenes).
  // The Highwind / Shinra airship bridge (PS1 refs 15-cloud01, 15-cloud02 and the user's captures): the upper
  // deck runs out into the great oval window (a rib-and-band dome whose base follows the deck's rounded front,
  // the nose railing just inside the sill, overcast sky beyond); the round radar pod on the left and the helm
  // station on the right; the rail and the stair down the middle to the crew deck, walled in by engine-room
  // machinery, with a grated hatch and painted arrows on the left and the round console pit on the right.
  // Shared by highwind_bridge (c9/part4), crater_airship, and c11b's hw_night, hw_bridge and final_highwind.
  C9.HW_BRIDGE = (() => {
    const W = 28, CX = 14, ZC = 5, RXT = 13.5, RZT = 4.7;             // the window's base ellipse (tiles)
    const upper = [0, 1, 2, 3, 4].map(y => { let r = ''; for (let x = 0; x < W; x++) { const dx = (x + 0.5 - CX) / RXT, dz = (ZC - (y + 0.5)) / RZT; r += dx * dx + dz * dz < 1 ? '.' : ' '; } return r; });
    // console tiles of the pods are solid (K)
    const K = (r, xs) => r.split('').map((ch, x) => xs.includes(x) ? 'K' : ch).join('');
    upper[2] = K(upper[2], [4, 5]); upper[3] = K(upper[3], [3, 23]);
    const grid = upper.concat([
      "#K==========^^^^==========K#",
      "#K...........gg.......K...K#",
      "#K...........gg......K.K..K#",
      "#K..gg.......gg...........K#",
      "#...gg.......gg............#",
      "#q...........gg...........q#",
      "#============^^============#",      // the rail at the back of the crew deck, the stair down to the cabin
      " gggggggggggggggggggggggggg ",      // the grated engine level below
    ]);
    const brass = '#a08858';
    return {
      grid,
      // upper deck 2.4 m, crew deck 1.5 m, the engine level below at 0
      heights: [0, 1, 2, 3, 4].map(() => '8'.repeat(W)).concat(['0888888888886666888888888880'], [6, 7, 8, 9, 10].map(() => '5'.repeat(W)), ['5555555555555335555555555555', '0'.repeat(W)]),
      legend: { K: 'block' },
      props: [
        { at: [13.5, 4.5], y0: 2.4, prop: 'bridgewindow', rx: 6.75, rz: 2.35, ry: 5.0, n: 11, col: '#6e6862', thick: 0.09, skirt: 4, rail: { inset: 0.5, span: 56, h: 0.5, col: brass } },
        { at: [4.4, 2.9], prop: 'consolepod', r: 0.62, a0: 170, a1: 300, open: 60, col2: '#40e0ff' },
        { at: [23.9, 3.4], prop: 'consolepod', r: 0.62, a0: -120, a1: 10, open: 150, col2: '#50f0b0' },
        { at: [24, 3.2], prop: 'helm', r: 0.34 },
        { at: [21, 7.9], prop: 'consolepod', r: 0.95, a0: -200, a1: 20, open: 90, gap: 50, col2: '#60e0ff' },
        { at: [1, 5], prop: 'machinery', face: 'e', h: 4.6 }, { at: [1, 6], prop: 'machinery', face: 'e', h: 4.0 },
        { at: [26, 5], prop: 'machinery', face: 'w', h: 4.6 }, { at: [26, 6], prop: 'machinery', face: 'w', h: 4.0 },
        { at: [1, 7.5], prop: 'console', w: 2, rot: 90, style: 'tall' }, { at: [26, 7.5], prop: 'console', w: 2, rot: -90, style: 'tall' },
        { at: [10.6, 4], prop: 'floorarrow', path: [[0, 0], [2.4, 0], [2.4, 0.55]] },
        { at: [11.4, 6.2], prop: 'floorarrow', path: [[0, 0], [0, 1.3], [-6.5, 1.3]] },
      ],
      look: { floor: ['#444c56', '#404851'], floor2: ['#4e5660', '#4a525b'], floorTex: { floor: 'planks' }, trim: brass, brass, wall: '#4e545c', wallTop: '#1e2226', wallTex: 'panel',
        metal: ['#6a7078', '#5c626a'], wallH: 5.4, sky: ['#8a94a0', '#d6dade'], clouds: true, ambient: [0.44, 0.48, 0.52], light: [0.78, 0.8, 0.84] },
      lights: [[14, 2, '#e8f0ff', 4.5], [4, 3, '#60e0ff', 2], [24, 3, '#60f0c0', 2], [21, 8, '#60e0ff', 2.4]],
      camera: { pitch: 30, dist: 12.5 },
    };
  })();
  const HWB = C9.HW_BRIDGE;
  FF7.defineMap('crater_airship', {
    name: 'Shinra Airship', area: 'Northern Crater', theme: 'ship', music: 'shinra', hidePlayer: true,
    // night over the crater: the bridge lit blue-green by its screens and the whirlwind outside
    look: Object.assign({}, HWB.look, { sky: ['#06101a', '#2a5060'], ambient: [0.3, 0.4, 0.46], light: [0.5, 0.72, 0.84], floor: ['#5a6878', '#546272'] }),
    camera: HWB.camera,
    grid: HWB.grid, heights: HWB.heights, legend: HWB.legend, props: HWB.props,
    lights: [[3, 3, '#60e0ff', 2.5], [24, 3, '#60e0ff', 2.5], [13, 2, '#80c0e0', 3]],
    entries: { scene: [13, 8, 'up'] },
    onEnter: function* (s) {
      if (s.entry() === 'scene') yield* airshipScene(s);
    },
  });
  function* airshipScene(s) {
      // Rufus and Scarlet at the nose railing, Heidegger behind them, the crew at the helm and the radar
      s.spawn('a_rufus', 'rufus', 13, 1, 'up', { name: 'Rufus' });
      s.spawn('a_heid', 'heidegger', 13, 3, 'up', { name: 'Heidegger' });
      s.spawn('a_scar', 'scarlet', 15, 2, 'up', { name: 'Scarlet' });
      s.spawn('a_hojo', 'hojo', 19, 4, 'left', { name: 'Hojo' });
      s.spawn('a_sold', 'soldier', 4, 3, 'up', { name: 'Soldier' });
      s.spawn('a_pilot', 'soldier', 24, 4, 'up', { name: 'Soldier' });
      yield s.cam(13, 3, 1, { dist: 10, pitch: 38 });
      yield 30;
      yield s.say('a_heid', "Gyahahaha! Look at these readings, Mr. President! The Mako down there is practically boiling out of the ground!");
      yield s.say('a_scar', "Kyahaha! Imagine the reactor we could put on top of that! Midgar would look like a candle next to it!");
      yield s.say('a_rufus', "The Promised Land... A land overflowing with Mako. Every lead we have points to this crater.\fNo wonder the Ancients kept it to themselves. And no wonder Sephiroth got here first.");
      yield s.face('a_hojo', 'down');
      yield s.say('a_hojo', "(...Promised Land. How very quaint. What's gathering down there is no paradise.\fHeh heh heh... The Reunion. They're all coming home. And soon I'll see what I made.)");
      yield s.face('a_rufus', 'a_hojo');
      yield s.say('a_rufus', "Something to add, Professor?");
      yield s.say('a_hojo', "Hm? Oh, nothing, nothing. Merely admiring the view.");
      yield s.face('a_rufus', 'up');
      yield s.say('a_rufus', "Take us down. I want to see this Promised Land with my own eyes.");
      yield s.fadeOut(30);
      yield s.goto('crater_descent', 'from_scene');
  }
  FF7.story.c9_airshipScene = airshipScene;

  // ------------------------------------------------------------------ whirlwind maze 1 (black-robed men, gusts)
  const clone = (n, at, item, line) => ({ id: 'robed' + n, name: 'Black-Robed Man', model: ROBE, at, dir: 'down', anim: 'kneel',
    talk: function* (s) {
      if (s.flag('c9_clone' + n)) { yield s.msg("He doesn't move any more. A tattooed number shows on the back of his hand."); return; }
      s.set('c9_clone' + n);
      yield s.say('Black-Robed Man', line);
      s.anim('robed' + n, 'lie');
      yield s.msg('The man slumps into the snow and lies still. Something slips from his sleeve...');
      yield s.give(item);
    } });
  craterMap('crater_maze1', {
    name: 'Whirlwind Maze',
    look: MAZE,
    camera: { pitch: 56, dist: 11 },
    battle: { table: 'whirlwind_maze_road', bg: 'crater', rate: 1 },
    grid: [
      "#############::::#############",
      "###..........::::..........###",
      "##...R....X..::::.......R...##",
      "#...X........::::..X.........#",
      "##...........::::...........##",
      "#   .........::::.........   #",
      "#   .........::::.........   #",
      "#   .........::::.........   #",
      "##...........::::...........##",
      "#......R.....::::.....R..X...#",
      "###.......X..::::...X......###",
      "####.........::::.........####",
      "#############::::#############",
    ],
    legend: { 'X': 'spire' },
    props: spires([[10, 2, 4.6], [4, 3, 6.2], [19, 3, 5.4], [25, 9, 6.4], [10, 10, 4.2], [20, 10, 5.0],
      [2, 6, 4.4, 1.1, 4], [27, 6, 5.4, 1.2, 4],                                                     // out of the side drops
      [5, -0.5, 7.0, 1.0, 2], [9, -0.5, 5.8, 0.8, 2], [21, -0.5, 6.6, 0.9, 2], [25, -0.5, 7.6, 1.1, 2]]),   // behind the cliff
    entries: { from_descent: [14, 1, 'down'], from_maze2: [14, 11, 'up'] },
    exits: [
      { at: [13, 0, 4, 1], to: 'crater_descent', entry: 'from_maze' },
      { at: [13, 12, 4, 1], to: 'crater_maze2', entry: 'from_maze1' },
    ],
    npcs: [
      clone(1, [8, 3], 'hi_potion', "...Re...union... I have to... go..."),
      clone(2, [21, 9], 'ether', "Se...phiroth... Take me... with you..."),
    ],
    triggers: gustLane('c9_gust', [5, 6, 7], 4, 22, [14, 3]),
    onLoad: function (s) {
      s.unset('c9_gust');
      [1, 2].forEach(n => { if (s.flag('c9_clone' + n)) s.anim('robed' + n, 'lie'); });
    },
    onEnter: function* (s) {
      s.parallel(hazardLoop('crater_maze1', 'c9_gust', 110, 80, gustFx('#c0d8ff')));
      if (s.flag('c9_maze_seen')) return;
      s.set('c9_maze_seen');
      yield s.say('cloud', "(Men in black robes... The same ones Holzoff saw. They're lying all along the path.)");
      yield* C9.anyone(s, [['tifa', "They look like... they just kept walking until they couldn't anymore. Cloud, what ARE they?"]]);
      yield s.say('cloud', "(...Sephiroth's calling them. Like he called me.)");
    },
  });

  // ------------------------------------------------------------------ whirlwind maze 2 (two whirlwinds, Kaiser Knuckle)
  craterMap('crater_maze2', {
    name: 'Whirlwind Maze',
    look: MAZE,
    camera: { pitch: 56, dist: 11 },
    battle: { table: 'whirlwind_maze_road', bg: 'crater', rate: 1 },
    grid: [
      "#############::::#############",
      "###..........::::..........###",
      "##....R..X...::::...X...R...##",
      "#............::::............#",
      "#   .........::::.........   #",
      "#   .........::::.........   #",
      "##...........::::...........##",
      "#.....X..X...::::............#",
      "##...........::::...X.......##",
      "#   .........::::.........   #",
      "#   .........::::.........   #",
      "#..X......X..::::............#",
      "###....R.....::::.....R....###",
      "#############::::#############",
    ],
    legend: { 'X': 'spire' },
    props: spires([[9, 2, 4.6], [20, 2, 6.4], [6, 7, 5.0], [9, 7, 5.8], [20, 8, 6.4], [3, 11, 4.2], [10, 11, 5.0],
      [2, 4.5, 4.8, 1.0, 4], [27, 4.5, 3.6, 0.8, 4], [2, 9.5, 4.0, 0.9, 4], [27, 9.5, 5.6, 1.1, 4],   // out of the side drops
      [6, -0.5, 6.8, 1.0, 2], [10, -0.5, 5.6, 0.8, 2], [22, -0.5, 7.4, 1.1, 2]]),                 // behind the cliff
    entries: { from_maze1: [14, 1, 'down'], from_end: [14, 12, 'up'] },
    exits: [
      { at: [13, 0, 4, 1], to: 'crater_maze1', entry: 'from_maze2' },
      { at: [13, 13, 4, 1], to: 'crater_end', entry: 'from_maze2' },
    ],
    chests: [{ at: [24, 7], item: 'kaiser_knuckle', id: 'crater_maze2_kaiser_knuckle' }],
    triggers: gustLane('c9_gust', [4, 5], 4, 22, [14, 2]).concat(gustLane('c9_wave', [9, 10], 4, 22, [14, 7])),
    onLoad: function (s) { s.unset('c9_gust'); s.unset('c9_wave'); },
    onEnter: function* (s) {
      s.parallel(hazardLoop('crater_maze2', 'c9_gust', 100, 70, gustFx('#c0d8ff')));
      s.parallel(hazardLoop('crater_maze2', 'c9_wave', 70, 60, gustFx('#80ffa0')));
    },
  });

  // ------------------------------------------------------------------ Sephiroth's shell, Jenova·DEATH, the Black Materia
  function* jenovaDeath(s) {
    s.set('c9_jenova_death');
    yield s.move('player', 15, 8);
    yield s.face('player', 'up');
    const party = C9.popOut(s, [[13, 9, 'up'], [17, 9, 'up']]);
    s.music('none');
    s.spawn('robed_x', ROBE, 14, 5, 'up', { name: 'Black-Robed Man' });
    s.spawn('seph', 'sephiroth', 15, 3, 'down', { name: 'Sephiroth' });
    yield s.cam(15, 4, 50, { dist: 11, pitch: 42 });
    yield s.say('Black-Robed Man', "Se...phiroth... I made it... I came... all the way...");
    s.anim('seph', 'slash');
    s.sfx('hit');
    s.anim('robed_x', 'dead');
    yield 30;
    s.remove('robed_x');
    yield s.say('cloud', "Sephiroth!!");
    yield s.say('seph', "...So you've come. Good. The Reunion draws near.\fThis body has done all it was made to do. I have no further use for it.");
    yield s.say('seph', "Everything I need is already in place. The Black Materia... the Reunion... and you, Cloud.");
    s.flash('#ffffff', 20);
    s.shake(4, 30);
    s.remove('seph');
    s.spawn('jdeath', { enemy: 'jenova_death', scale: 0.9 }, 15, 3, 'down', { name: 'Jenova·DEATH' });
    yield s.say('cloud', "Jenova...!");
    yield s.battle({ enemies: ['jenova_death'], bg: 'crater', music: 'jenova', noEscape: true });
    s.remove('jdeath');
    s.camFollow(30);
    s.music('northcave');
    yield s.msg('Where Sephiroth stood, a small dark orb lies in the snow.');
    yield s.move('player', 15, 4);
    if (!s.has('black_materia')) yield s.give('black_materia');
    yield s.say('cloud', "The Black Materia... He left it behind? ...Why?");
    yield s.move('player', 15, 7);
    // everyone who stayed behind catches up
    const others = C9.MEMBERS.filter(id => s.isMember(id) && party.indexOf(id) < 0);
    const spots = [[11, 11, 'up'], [19, 11, 'up'], [13, 12, 'up'], [17, 12, 'up'], [15, 12, 'up']];
    others.forEach((id, i) => { if (spots[i]) { s.spawn(id, id, 15, 13, 'up', { name: s.name(id) }); s.run(id, spots[i][0], spots[i][1], { noWait: true }); } });
    yield 50;
    const all = party.concat(others.slice(0, spots.length));
    all.forEach(id => s.face(id, 'player'));
    yield s.face('player', 'down');
    const arrived = [['cid', "Everybody in one piece? Damn, what WAS that thing?"], ['barret', "Cloud! We saw the flash from back there. You alright?!"],
      ['redxiii', "We saw the light from down the path. Is everyone unharmed?"], ['yuffie', "Whoa, what happened here?! Did we miss the boss fight?!"],
      ['caitsith', "Yikes! Everybody okay? That flash nearly singed my whiskers!"], ['vincent', "...It's over, then. For now."]].find(([id]) => others.indexOf(id) >= 0);
    if (arrived) yield s.say(arrived[0], arrived[1]);
    yield s.say('cloud', "......I shouldn't be the one holding this.\fAt the Temple, I handed the Black Materia straight to Sephiroth. I couldn't stop myself. If it happens again...\fSomeone else keep it. Please.");
    const cands = ['barret', 'redxiii'].filter(id => s.isMember(id));
    let holder = cands[0] || 'redxiii';
    if (cands.length > 1) {
      const c = yield s.ask('cloud', 'Who should hold the Black Materia?', [s.name('barret'), s.name('redxiii')]);
      holder = c === 0 ? 'barret' : 'redxiii';
    }
    s.setVar('c9_holder', holder);
    yield s.say(holder, holder === 'barret' ? "Heh. Leave it to me. Nobody's pryin' this thing outta MY hand." : "I understand. I will guard it with my life.");
    yield s.msg(`${s.name('cloud')} hands the Black Materia to ${s.name(holder)}.`);
    // The holder stays behind with the others; Cloud goes on with Tifa and one more.
    let third = C9.mates(s).filter(id => id !== 'tifa' && id !== holder)[0];
    if (!third) third = ['cid', 'redxiii', 'barret', 'vincent', 'yuffie', 'caitsith'].filter(id => id !== holder && s.isMember(id))[0];
    s.setVar('c9_third', third || '');
    s.party(['cloud', 'tifa', third].filter(Boolean));
    yield s.say('cloud', "The center of the crater is just ahead. Tifa" + (third ? `, ${s.name(third)}` : '') + ". Come with me.\fEveryone else... wait here.");
    const staying = all.filter(id => id !== 'tifa' && id !== third);
    const stayLines = [
      ['barret', holder === 'barret' ? "Go on. I'll keep this thing safe. Just watch your back, Cloud." : "Tch. Fine. But if you ain't back soon, I'm comin' in after you!"],
      ['redxiii', holder === 'redxiii' ? "Go. I will not let this out of my sight." : "Be careful. The air ahead... it feels wrong."],
      ['caitsith', "We'll hold the fort here! Er, the snowbank. Whatever this is!"],
      ['yuffie', "Just so you know, I'm staying because I WANT to, not because I'm scared! ...Hurry back, okay?"],
      ['vincent', "...Go. I will watch the path behind you."],
      ['cid', "Hurry it up. I don't like this place one damn bit."],
    ];
    for (const [id, text] of stayLines) if (staying.indexOf(id) >= 0) yield s.say(id, text);
    all.forEach(id => s.remove(id));
  }
  craterMap('crater_end', {
    name: 'Whirlwind Maze - Clearing',
    look: MAZE,
    camera: { pitch: 56, dist: 11 },
    battle: { table: 'whirlwind_maze_path', bg: 'crater', rate: 1, if: s => s.flag('c9_jenova_death') },
    grid: [
      "#############::::#############",
      "###.....X....::::....X.....###",
      "##..X........::::........X..##",
      "#......XX............XX......#",
      "#............................#",
      "#...X....................X...#",
      "#............................#",
      "#..R......................R..#",
      "#............................#",
      "#..X..X................X..X..#",
      "#............................#",
      "###....X.....::::.....X....###",
      "####.........::::.........####",
      "#############::::#############",
    ],
    legend: { 'X': 'spire' },
    props: spires([[8, 1, 4.4], [21, 1, 4.8], [4, 2, 5.6], [25, 2, 4.6], [7, 3, 5.2], [8, 3, 4.0], [21, 3, 6.0], [22, 3, 4.8],
      [4, 5, 5.0], [25, 5, 6.4], [3, 9, 5.6], [6, 9, 4.2], [23, 9, 5.2], [26, 9, 6.2], [7, 11, 6.4], [22, 11, 5.6],
      [5, -0.5, 7.0, 1.0, 2], [11, -0.5, 5.8, 0.8, 2], [24, -0.5, 7.6, 1.1, 2]]),   // behind the cliff
    entries: { from_maze2: [14, 1, 'down'], from_maze3: [14, 12, 'up'] },
    exits: [
      { at: [13, 0, 4, 1], to: 'crater_maze2', entry: 'from_end' },
      { at: [13, 13, 4, 1], to: 'crater_maze3', entry: 'from_end', if: s => s.flag('c9_jenova_death'),
        blocked: function* (s) { yield s.say('cloud', "(Something's up ahead. I can feel it...)"); } },
    ],
    items: [{ at: [4, 4], materia: 'mp_turbo', id: 'crater_end_mp_turbo' }],
    chests: [{ at: [17, 12], item: 'poison_ring', id: 'crater_end_poison_ring' }],
    triggers: [
      { id: 'jenova', at: [1, 6, 28, 3], once: true, if: s => !s.flag('c9_jenova_death'), run: jenovaDeath },
    ],
  });

  // ------------------------------------------------------------------ whirlwind maze 3 (lightning)
  craterMap('crater_maze3', {
    name: 'Whirlwind Maze - Eye of the Storm',
    battle: { table: 'whirlwind_maze_path', bg: 'crater', rate: 1 },
    look: { sky: ['#0a1a18', '#4a7a6c'], fog: { color: [0.25, 0.38, 0.34], near: 8, far: 24 } },
    camera: { pitch: 56, dist: 11 },
    grid: [
      "#############::::#############",
      "###..........::::..........###",
      "##       ............       ##",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "#        ............        #",
      "###      ............      ###",
      "#############::::#############",
    ],
    // the rock needles rise out of the abyss on both sides of the path
    props: spires([[3, 3, 4.4, 1.0, 4], [6, 4, 6.2, 1.2, 4], [25, 4, 5.4, 1.1, 4], [24, 6, 4.0, 0.9, 4], [5, 7, 5.0, 1.1, 4],
      [23, 8, 5.8, 1.0, 4], [4, 10, 4.6, 1.0, 4], [26, 10, 6.4, 1.2, 4], [2, 6, 3.6, 0.9, 4], [27, 7, 4.2, 1.0, 4],
      [4, -0.5, 7.0, 1.1, 2], [25, -0.5, 7.8, 1.1, 2]]),
    entries: { from_end: [14, 1, 'down'], from_center: [14, 11, 'up'] },
    exits: [
      { at: [13, 0, 4, 1], to: 'crater_end', entry: 'from_maze3' },
      { at: [13, 12, 4, 1], to: 'crater_center', entry: 'from_maze3' },
    ],
    triggers: [3, 6, 9].map(r => ({
      at: [9, r, 12, 1], once: false, if: s => s.flag('c9_bolt'),
      run: function* (s) {
        s.anim('player', 'hurt');
        s.flash('#fff8a0', 10, 0.8);
        s.shake(4, 16);
        yield s.move('player', 14, r - 2, { speed: 0.1 });
        s.stopAnim('player');
        if (!s.flag('c9_bolt_seen')) { s.set('c9_bolt_seen'); yield s.msg('A bolt of lightning cracks down across the path!\n(The strikes come at a steady rhythm. Time your dash between them.)'); }
      },
    })),
    onLoad: function (s) { s.unset('c9_bolt'); },
    onEnter: function* (s) {
      s.parallel(hazardLoop('crater_maze3', 'c9_bolt', 90, 26, (s2) => { s2.flash('#fff8c0', 8, 0.6); s2.sfx('bolt'); s2.shake(2, 12); }));
    },
  });

  // ------------------------------------------------------------------ the center of the crater
  const CENTER_GRID = [
    "##############################",
    "####.......UUUUUUUU.......####",
    "##........U********U........##",
    "#.........U********U.........#",
    "#..........********..........#",
    "#............................#",
    "#...X....................X...#",
    "#............................#",
    "#.....X................X.....#",
    "#............................#",
    "###..........::::..........###",
    "####.........::::.........####",
    "#############::::#############",
  ];
  const third = (s) => { const t = s.get('c9_third'); return typeof t === 'string' && t ? t : null; };
  function centerCast(s, spots) {
    s.spawn('tifa_c', 'tifa', spots[0][0], spots[0][1], spots[0][2], { name: s.name('tifa') });
    const t = third(s);
    if (t) s.spawn('third_c', t, spots[1][0], spots[1][1], spots[1][2], { name: s.name(t) });
    return t;
  }
  craterMap('crater_center', {
    name: 'Northern Crater - Center',
    look: { mako: '#70f0c0' },
    lights: [[14, 3, '#a0ffd0', 5]],
    grid: CENTER_GRID,
    legend: { 'X': 'spire' },
    props: spires([[4, 6, 5.0], [25, 6, 5.6], [6, 8, 4.4], [23, 8, 4.8], [7, -0.5, 7.2, 1.1, 2], [22, -0.5, 6.6, 1.0, 2]]),
    entries: { from_maze3: [14, 11, 'up'], after_illusion: [14, 6, 'up'] },
    exits: [{ at: [13, 12, 4, 1], to: 'crater_maze3', entry: 'from_center', if: s => !s.flag('c9_center') }],
    onEnter: function* (s) {
      if (s.entry() === 'after_illusion') { yield* collapseScene(s); return; }
      if (s.flag('c9_center')) return;
      s.set('c9_center');
      s.music('none');
      yield s.move('player', 14, 7);
      const t = centerCast(s, [[12, 9, 'up'], [16, 9, 'up']]);
      yield [s.move('tifa_c', 13, 8), t ? s.move('third_c', 15, 8) : 1];
      // Sephiroth's illusions ring the edge of the crater's heart
      [[5, 4], [23, 4], [3, 8], [25, 8]].forEach(([x, y], i) => s.spawn('ill' + i, 'sephiroth', x, y, x < 14 ? 'right' : 'left', { name: 'Sephiroth' }));
      s.flash('#ffffff', 16);
      yield s.emote('player', '!!');
      yield s.say('tifa', "Sephiroth...?! There's... more than one of him!");
      yield s.say('ill0', "Welcome, Cloud. You've done so well to come this far.");
      yield s.say('ill1', "And now, before the Reunion... there is something you must see. The truth.");
      yield s.say('cloud', "The truth? What are you talking about?");
      yield s.say('ill2', "Five years ago. Nibelheim. Surely you remember... Or do you?");
      yield s.say('tifa', "Cloud, don't listen to him! Whatever he shows us, it's a trick!");
      yield s.say('ill3', "Tifa. Then why are you so afraid of what he might see?");
      s.music('nightmare');
      yield s.fadeOut(40, '#ffffff');
      ['ill0', 'ill1', 'ill2', 'ill3', 'tifa_c', 'third_c'].forEach(id => s.remove(id));
      yield s.goto('crater_illusion_nibel', 'illusion');
    },
  });

  // ------------------------------------------------------------------ the illusion: Nibelheim, five years ago
  const NIBEL_ILL = [
    "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    "hhwhh+hhhhhhwhh+hhhhhhwhh+hhhh",
    "T............................T",
    "T............................T",
    "T..........,,,,,,,...........T",
    "T..........,,,O,,,...........T",
    "T..........,,,,,,,...........T",
    "T............................T",
    "T..l......................l..T",
    "T............................T",
    "T............................T",
    "T............................T",
    "TTTTTTTTTTTTT....TTTTTTTTTTTTT",
  ];
  FF7.defineMap('crater_illusion_nibel', {
    name: 'Nibelheim?', area: 'Northern Crater', theme: 'nibelheim', music: 'nightmare',
    look: { sky: ['#2a2a40', '#7a7a90'], fog: { color: [0.4, 0.4, 0.5], near: 8, far: 22 }, ambient: [0.4, 0.4, 0.48] },
    grid: NIBEL_ILL,
    entries: { illusion: [4, 9, 'right'] },
    onEnter: function* (s) {
      if (s.entry() === 'illusion') yield* illusionNibel(s);
    },
  });
  function* illusionNibel(s) {
      s.spawn('tifa_o', 'tifa', 5, 10, 'right', { name: s.name('tifa') });
      yield s.fadeIn(40);
      yield s.caption('Five years ago...\nNibelheim.', { hold: 120, bg: 'rgba(0,0,0,0.5)' });
      yield s.say('Sephiroth', "Watch closely, Cloud. This is the day Shinra sent me to Nibelheim.", { pos: 'top' });
      s.spawn('i_seph', 'sephiroth', 15, 12, 'up', { name: 'Sephiroth' });
      s.spawn('i_zack', 'zack', 14, 12, 'up', { name: 'SOLDIER' });
      s.spawn('i_tr1', 'soldier', 16, 12, 'up', { name: 'Shinra Trooper' });
      s.spawn('i_tr2', 'young_cloud', 13, 12, 'up', { name: 'Shinra Trooper' });
      yield [s.move('i_seph', 15, 8), s.move('i_zack', 13, 8), s.move('i_tr1', 17, 10), s.move('i_tr2', 12, 10)];
      s.spawn('i_tifa', TIFA_YOUNG, 5, 3, 'down', { name: 'Tifa' });
      yield s.run('i_tifa', 14, 6);
      yield s.face('i_tifa', 'down');
      yield s.say('i_tifa', "You're the ones from Shinra? I'm your guide. I'll take you up Mt. Nibel to the reactor.");
      s.spawn('i_photo', 'man4', 22, 9, 'left', { name: 'Photographer' });
      yield s.run('i_photo', 16, 9);
      yield s.say('i_photo', "Excuse me! Mr. Sephiroth, sir! Could I get one picture? For the town... Stand right there, next to the young lady! You too, SOLDIER boy!");
      yield [s.move('i_zack', 13, 6), s.move('i_seph', 15, 6)];
      yield [s.face('i_zack', 'down'), s.face('i_seph', 'down')];
      yield s.say('i_photo', "Alright... Say 'Mako'!");
      s.sfx('scan');
      s.flash('#ffffff', 16);
      yield 40;
      yield s.say('cloud', "......That's me. That has to be me. I was the SOLDIER who came with Sephiroth. I stood right there.");
      yield s.say('Sephiroth', "Then look at his face, Cloud.", { pos: 'top' });
      yield s.move('i_zack', 13, 7);
      yield s.face('i_zack', 'left');
      yield s.cam(13, 7, 50, { dist: 6, pitch: 30 });
      yield 30;
      yield s.say('cloud', "......Black hair...? Who... who is that?");
      yield s.say('Sephiroth', "That is the SOLDIER who came to Nibelheim with me. Not you.\fYou were not in SOLDIER. You were not here at all.", { pos: 'top' });
      s.camFollow(30);
      yield s.face('player', 'tifa_o');
      yield s.say('cloud', "Tifa... You were there. Tell me. It was me... wasn't it?");
      yield s.say('tifa', "......");
      yield s.say('cloud', "...Tifa?");
      s.music('none');
      yield s.fadeOut(40, '#300800');
      ['i_seph', 'i_zack', 'i_tr1', 'i_tr2', 'i_tifa', 'i_photo', 'tifa_o'].forEach(id => s.remove(id));
      yield s.goto('crater_illusion_fire', 'illusion');
  }
  FF7.story.c9_illusionNibel = illusionNibel;

  FF7.defineMap('crater_illusion_fire', {
    name: 'Nibelheim?', area: 'Northern Crater', theme: 'fire', music: 'nightmare',
    grid: NIBEL_ILL,
    lights: [[5, 2, '#ff6020', 5], [15, 2, '#ff8030', 5], [25, 2, '#ff6020', 5], [15, 9, '#ff8030', 4]],
    entries: { illusion: [4, 9, 'right'] },
    onEnter: function* (s) {
      if (s.entry() === 'illusion') yield* illusionFire(s);
    },
  });
  function* illusionFire(s) {
      s.music('nightmare');
      s.spawn('tifa_o', 'tifa', 5, 10, 'right', { name: s.name('tifa') });
      s.spawn('f_seph', 'sephiroth', 15, 4, 'down', { name: 'Sephiroth' });
      yield s.fadeIn(40);
      s.shake(1, 120);
      yield s.move('f_seph', 15, 7, { speed: 0.02 });
      yield s.say('cloud', "Sephiroth... walking out of the flames. I remember this. I remember it!\fI ran after him! I chased him up to the reactor!");
      s.spawn('f_zack', 'zack', 15, 12, 'up', { name: 'SOLDIER' });
      yield s.move('f_seph', 26, 2, { speed: 0.03 });
      s.remove('f_seph');
      yield s.run('f_zack', 15, 8);
      yield s.say('f_zack', "SEPHIROTH!! What have you done?!");
      yield s.run('f_zack', 26, 2);
      s.remove('f_zack');
      yield s.say('cloud', "No... That's not how it... That was ME. I was the one who—");
      yield s.say('Sephiroth', "Then tell me, Cloud. Where are you? Show me where you are in these memories.", { pos: 'top' });
      yield s.say('cloud', "......");
      yield s.fadeOut(50, '#ffffff');
      s.remove('tifa_o');
      yield s.goto('crater_center', 'after_illusion');
  }
  FF7.story.c9_illusionFire = illusionFire;

  // ------------------------------------------------------------------ Cloud's collapse (the Tifa/Cloud scene)
  function* collapseScene(s) {
    if (s.flag('c9_illusion')) return;
    s.set('c9_illusion');
    const t = centerCast(s, [[12, 7, 'right'], [17, 7, 'left']]);
    s.spawn('seph_c', 'sephiroth', 14, 4, 'down', { name: 'Sephiroth' });
    yield s.fadeIn(40);
    yield s.say('seph_c', "Do you understand now? You are a puppet, Cloud. A failed copy that Hojo pieced together after Nibelheim burned.\fJenova's cells, Mako, and a head full of borrowed knowledge. He didn't even think you were worth a number.");
    yield s.say('tifa', "Stop it! Cloud, don't listen to him!");
    yield s.say('seph_c', "The 'Cloud' standing here was born the day he met you again in Midgar, Tifa.\fHe built himself out of your memories... of a boy you once knew. And you've noticed. You've known something was wrong for a long time. Haven't you?");
    yield s.say('tifa', "I... That's not...");
    if (t) yield s.say(t, { barret: "Shut your mouth, you bastard!", redxiii: "Enough of your poison, Sephiroth!", cid: "Don't listen to that $#@!, Cloud!", vincent: "...Lies are his favorite weapon. Remember that.", yuffie: "Don't listen to him! He's just messing with your head!", caitsith: "Cloud! Don't believe a word of it!" }[t] || "Cloud, don't listen!");
    s.music('whoami');
    yield s.say('cloud', "......It's alright, Tifa.\fI think I understand now... Sephiroth's right.");
    yield s.say('tifa', "Cloud...?");
    yield s.say('cloud', "When did I join SOLDIER...? How did I make First Class...? I try to remember, and there's... nothing there.\f...Heh. Heh heh. Hahaha...");
    s.anim('player', 'kneel');
    yield 40;
    s.anim('player', 'lie');
    s.remove('seph_c');
    yield s.run('tifa_c', 13, 6);
    s.anim('tifa_c', 'kneel');
    yield s.say('tifa', "Cloud! CLOUD!! ...Please, answer me!");
    yield s.say('tifa', "(It's my fault... I knew something was wrong. I knew, and I never said anything...)");
    yield s.fadeOut(60);
    ['tifa_c', 'third_c'].forEach(id => s.remove(id));
    yield s.goto('crater_cave', 'scene');
  }

  FF7.story.c9_collapseScene = collapseScene;

  // ------------------------------------------------------------------ the heart of the crater: the Black Materia
  function* blackMateria(s) {
    s.set('c9_cave_done');
    s.music('none');
    // Shinra arrives
    s.spawn('k_rufus', 'rufus', 14, 13, 'up', { name: 'Rufus' });
    s.spawn('k_heid', 'heidegger', 13, 13, 'up', { name: 'Heidegger' });
    s.spawn('k_scar', 'scarlet', 16, 13, 'up', { name: 'Scarlet' });
    s.spawn('k_hojo', 'hojo', 15, 13, 'up', { name: 'Hojo' });
    s.spawn('k_sold', 'soldier', 17, 13, 'up', { name: 'Soldier' });
    s.spawn('k_seph', 'sephiroth', 15, 2, 'down', { name: 'Sephiroth', anim: 'pray' });
    yield s.cam(15, 8, 1, { dist: 12, pitch: 38 });
    yield s.fadeIn(40);
    yield [s.move('k_rufus', 14, 9), s.move('k_heid', 12, 10), s.move('k_scar', 17, 10), s.move('k_hojo', 16, 9), s.move('k_sold', 19, 11)];
    yield s.say('k_rufus', "So... this is it. The Promised Land.");
    yield s.say('k_heid', "Gyahahaha! The Mako's practically seeping out of the walls!");
    yield s.say('k_scar', "Kyahaha! We're going to need a bigger reactor. A MUCH bigger reactor!");
    yield s.say('k_hojo', "Promised Land? Hmph. How little you understand, President. Look up.\fWhat sleeps inside that crystal is far more interesting than any Mako spring.");
    s.shake(6, 90);
    s.sfx('alarm_short');
    yield s.say('k_sold', "S-sir! The ground... Something's moving under the ice!");
    s.flash('#ff4020', 30, 0.6);
    yield s.caption('Deep beneath the ice, something colossal stirs.\nA single enormous eye opens... gazes up at them...\n...and slowly closes again.', { hold: 200, bg: 'rgba(0,0,0,0.55)' });
    yield s.say('k_hojo', "Heh... heh heh heh! WEAPON! The Planet's own guardians!\fThe Reunion must be stirring them from their sleep!");
    yield s.say('k_rufus', "WEAPON...?");
    // Cloud walks in, calm
    s.music('reunion');
    s.show('player', 15, 13, 'up');
    s.stopAnim('player');
    s.spawn('tifa_k', 'tifa', 12, 13, 'up', { name: s.name('tifa') });
    const t = third(s);
    if (t) s.spawn('third_k', t, 18, 13, 'up', { name: s.name(t) });
    yield s.move('player', 15, 11);
    yield [s.move('tifa_k', 12, 12), t ? s.move('third_k', 18, 12) : 1];
    yield s.face('k_rufus', 'player');
    yield s.say('k_rufus', "Well, well. The ex-SOLDIER. Come to see the Promised Land for yourself?");
    yield s.say('tifa', "Cloud! What are you doing?! Cloud, wait!");
    yield s.say('cloud', "......Everyone. Thank you for bringing me this far.\f...And I'm sorry.");
    // the holder arrives with the Black Materia
    const holder = (typeof s.get('c9_holder') === 'string' && s.get('c9_holder')) || 'redxiii';
    s.spawn('holder_k', holder, 15, 13, 'up', { name: s.name(holder) });
    yield s.run('holder_k', 15, 12);
    yield s.say(holder, holder === 'barret'
      ? "Cloud! Here, I brought it like you said. ...Wait. You told me to bring it here, back at the clearing... didn't ya? How'd you get ahead of me?"
      : "Cloud. I brought the Black Materia, as you asked me... But you were ahead of us all along. Then who was it that called me...?");
    yield s.face('player', 'holder_k');
    yield s.say('cloud', "Thanks. Give it to me.");
    yield s.say('tifa', "No! Don't give it to him!!");
    yield s.msg(`${s.name('cloud')} takes the Black Materia.`);
    if (s.has('black_materia')) s.take('black_materia');
    yield s.face('player', 'up');
    yield s.say('cloud', "Tifa... I'm not the Cloud you knew. I never was. I'm just... something Hojo made.\fMaybe someday I'll find the real Cloud, somewhere. But right now, there's something I have to do.");
    yield s.face('k_hojo', 'player');
    yield s.say('k_hojo', "Hm? What's this... A specimen? It made it here all on its own! Hohoho! The Reunion theory is proven!\f...What's your number? You! Show me your number!");
    yield s.say('cloud', "I don't... have a number. Professor Hojo... please. Give me a number.");
    yield s.say('k_hojo', "No number? A FAILURE?! Of all of them, the failure is the one that made it here?!\f...Pathetic! No, no... magnificent! Hahahaha!");
    yield s.say('cloud', "......Sephiroth. I brought it. Here it is.");
    yield s.jump('player', 15, 4, 2.4, 70);
    s.hide('player');
    s.flash('#ffffff', 30);
    yield s.say('cloud', "I understand now. I was never chasing Sephiroth... He was calling me. And I came.", { pos: 'bottom' });
    yield s.movie('black_materia', { text: 'The Black Materia passes into Sephiroth\'s hand.\nInside the crystal, his eyes open.' });   // (the crystal, js/gfx/cinema.js)
    s.sfx('falling'); s.shake(8, 120);
    yield s.say('k_rufus', "The whole cave's coming apart! Everyone to the airship! NOW!!");
    yield s.say('tifa', "CLOUD!!");
    yield s.fadeOut(40);
    ['k_rufus', 'k_heid', 'k_scar', 'k_hojo', 'k_sold', 'k_seph', 'tifa_k', 'third_k', 'holder_k'].forEach(id => s.remove(id));
    yield s.movie('weapons_awaken', { text: 'The crater tears itself apart.\nThe Shinra airship claws its way up through the storm, carrying everyone it can reach...\nBehind it, the WEAPONs rise from the ice, roaring at the sky,\nand a shimmering barrier seals the Northern Crater.' });
    s.set('black_materia');
    s.set('meteor');
    // FF7: Cloud's materia comes off when he goes missing (back into the party's stock); his gear stays on him
    { const c = FF7.state.chars.cloud;
      if (c) { [c.weaponMateria, c.armorMateria].forEach(arr => (arr || []).forEach((m, i) => { if (m) { FF7.sys.materia.toStock(m); arr[i] = null; } })); FF7.sys.stats.recalc(c); } }
    s.leave('cloud');
    s.set('cloud_missing');
    s.phs(true);
    yield s.goto('junon2_cell', 'start');
  }
  FF7.story.c9_blackMateria = blackMateria;
  craterMap('crater_cave', {
    name: 'Northern Crater - Heart', music: 'none', hidePlayer: true,
    look: { floor: ['#4a5a78', '#445472'], floor2: ['#8aa8d0', '#84a2ca'], wall: '#3a4a70', wallTop: '#2a3458', trim: '#1a2240', mako: '#80d0ff',
      sky: ['#020208', '#101024'], fog: { color: [0.04, 0.06, 0.14], near: 8, far: 22 }, ambient: [0.36, 0.4, 0.56], light: [0.6, 0.7, 0.95] },
    lights: [[15, 2, '#c0b0ff', 5]],
    grid: [
      "##############################",
      "#UUUU....UUUUUUUUUUUU....UUUU#",
      "#UU.......UUUUUUUUUU.......UU#",
      "#U.........UUUUUUUU.........U#",
      "#............................#",
      "#...iiiiiiiiiiiiiiiiiiiiii...#",
      "#..iiiiiiiiiiiiiiiiiiiiiiii..#",
      "#..iiiiiiiiiiiiiiiiiiiiiiii..#",
      "#...iiiiiiiiiiiiiiiiiiiiii...#",
      "#............................#",
      "#U..........................U#",
      "#UU..........::::..........UU#",
      "#UUU.........::::.........UUU#",
      "#############::::#############",
    ],
    entries: { scene: [15, 12, 'up'] },
    onEnter: function* (s) {
      if (s.entry() !== 'scene' || s.flag('c9_cave_done')) return;
      yield* blackMateria(s);
    },
  });

  // Disc 2: the crater is sealed by WEAPON's barrier until the end of the disc (chapter 11 takes over).
  FF7.world.link('northern_crater', {
    if: s => s.flag('meteor') && !s.flag('disc3'),
    run: function* (s) { yield s.msg('A shimmering barrier of energy covers the Northern Crater.\nThere is no way through.'); },
  });
})();

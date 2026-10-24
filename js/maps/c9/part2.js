// Chapter 9 (part 2) — The Great Glacier: a condensed version of FF7's screen network (Ice Gate, the
// bridge, the pines, the frozen lake and its ice-floe puzzle with the Safety Bit cave, the icy canyon and
// the cave back to the world map, the eagle's-eye ice field with the Elixir cave, the log bridge, the
// lone pine, the four-way crossroads, the slope with the Added Cut alcove, the hot spring, the trail with
// the hidden stone face, the white-out snowfield (All materia; the wind turns the view around) and
// Snow's cave (Alexander). Walking around too long makes the leader collapse; Holzoff carries you to his
// cabin at the base of Gaea's Cliff. (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Cold: every step across the map (counted by invisible stripe triggers) and every screen change adds to
// var c9_cold. At COLD_WARN the leader shivers; at COLD_LIMIT they collapse (-> gaea_cabin 'rescued').
// Flags: c9_landed, c9_hotspring, c9_snow_met, c9_snow_beaten, c9_rescued, c9_holzoff_met, c9_cold_warned,
// c9_wind_seen, c9_floe_fell.
(function () {
  const C9 = FF7.c9 = FF7.c9 || {};
  const GLACIER = {
    // blue-shaded snow over grey rock crevasses (refs 11-gaeacliff16, 26, 27)
    floor: ['#e2eaf4', '#d8e2ee'], floor2: ['#a9c4dc', '#a1bdd6'], snow: ['#eef2f8', '#e4eaf2'],
    wall: '#8a9cb0', trim: '#6a84a0', wallTop: '#e8eef6', wallH: 3.0, grass: ['#2e4a3a', '#2a4636'], water: '#3a6a90',
    sky: ['#7a90b0', '#dde6f0'], fog: { color: [0.86, 0.9, 0.95], near: 9, far: 26 }, ambient: [0.62, 0.64, 0.7], light: [0.8, 0.83, 0.92],
  };

  // ------------------------------------------------------------------ the cold
  const COLD_LIMIT = 230, COLD_WARN = 170;
  const coldIf = (s) => {
    const n = s.inc('c9_cold');
    return n >= COLD_LIMIT || (n >= COLD_WARN && !s.flag('c9_cold_warned'));
  };
  function* coldRun(s) {
    if (s.get('c9_cold') >= COLD_LIMIT) { yield* collapse(s); return; }
    s.set('c9_cold_warned');
    s.anim('player', 'weak');
    yield s.say(s.leader(), "(Brrr... It's getting colder. I can hardly feel my hands...\fI can't keep wandering around out here much longer.)");
    s.stopAnim('player');
  }
  // Invisible stripes: crossing one counts as a few steps in the cold.
  function coldStripes(w, h) {
    const t = [];
    for (let x = 1; x < w - 1; x += 3) t.push({ at: [x, 0, 1, h], once: false, if: coldIf, run: coldRun });
    for (let y = 1; y < h - 1; y += 3) t.push({ at: [0, y, w, 1], once: false, if: coldIf, run: coldRun });
    return t;
  }
  function* collapse(s) {
    const who = s.leader();
    s.anim('player', 'weak');
    yield s.say(who, "(So... cold... My legs... won't...)");
    s.anim('player', 'kneel');
    yield 40;
    s.anim('player', 'lie');
    s.music('none');
    yield s.fadeOut(90, '#ffffff');
    s.setVar('c9_cold', 0);
    s.unset('c9_cold_warned');
    s.set('c9_rescued');
    yield s.goto('gaea_cabin', 'rescued');
  }
  C9.collapse = collapse;
  FF7.story.c9_collapse = collapse;
  C9.resetCold = (s) => { s.setVar('c9_cold', 0); s.unset('c9_cold_warned'); };

  // ------------------------------------------------------------------ landing from the snowboard
  function* landing(s) {
    if (s.flag('c9_landed')) { yield s.msg('The board skids to a stop in a spray of powder.'); return; }
    s.set('c9_landed');
    const ids = C9.popOut(s, [[s.mapId() === 'glacier_lonepine' ? 11 : 13, 7, 'up'], [16, 7, 'up']]);
    yield s.say(s.leader(), "(...Made it down in one piece. So this is the Great Glacier.)");
    yield* C9.each(s, [
      ['tifa', "It's all white... as far as I can see. It's beautiful, but it makes me feel so small."],
      ['barret', "Whew! My butt's froze to that damn board! ...Don't laugh!"],
      ['redxiii', "The man at the cliff spoke of Holzoff, at the foot of Gaea's Cliff. North, beyond a great snowfield."],
      ['cid', "Nice ride. Now let's get movin' before we turn into icicles."],
      ['yuffie', "That was AWESOME! Can we go again? ...No? Boo."],
      ['caitsith', "Oof! Somebody help me up, my legs are all stiff! ...Well, stiffer."],
      ['vincent', "The cold here is not natural. Let's not linger."],
    ]);
    yield s.say(s.leader(), "Stay close. If we wander around too long out here, the cold will finish us.");
    C9.tuckIn(s, ids);
  }

  FF7.story.c9_landing = landing;

  // ------------------------------------------------------------------ the Glacier Map
  function* showGlacierMap(s) {
    yield s.caption(
      "THE GREAT GLACIER  (hand-drawn map)\n\n" +
      "         Gaea's Cliff  -  Holzoff's cabin\n" +
      "                      |\n" +
      "   Trail  ----  S N O W F I E L D  ----  cave (east)\n" +
      "   /     \\           |                     |\n" +
      "Ice field - Log bridge    Hot spring  <==  slide\n" +
      "   |            \\        /       \\\n" +
      "Bridge - Pines - Lake - Lone pine - Crossroads\n" +
      "   \\        |        \\                |\n" +
      "    `----  ICE GATE  ----  Canyon  ----  ice cave (out)",
      { hold: 300, bg: 'rgba(8,16,32,0.94)' });
  }
  C9.showGlacierMap = showGlacierMap;

  // Glacier screen: snow theme, the cold stripes, and a cold tick for every screen change.
  function glacier(id, def) {
    const w = def.grid[0].length, h = def.grid.length;
    def.area = 'Great Glacier';
    def.theme = def.theme || 'snow';
    def.look = Object.assign({}, GLACIER, def.look || {});
    def.camera = def.camera || { pitch: 62, dist: 11 };   // refs 11-gaeacliff26, 27: the snowfields seen from high above
    if (def.music === undefined) def.music = 'snow';
    def.triggers = (def.triggers || []).concat(coldStripes(w, h));
    const inner = def.onEnter;
    def.onEnter = function* (s) {
      if (s.entry() === 'from_board') { C9.resetCold(s); yield* landing(s); }
      else s.inc('c9_cold', 3);
      if (inner) yield* inner(s);
    };
    FF7.defineMap(id, def);
  }
  const TOWORLD = { to: 'world', loc: 'icicle_inn' };

  // ================================================================== (1) Ice Gate
  glacier('glacier_gate', {
    name: 'Great Glacier - Ice Gate',
    battle: { table: 'glacier_pass', bg: 'glacier', rate: 1 },
    grid: [
      "##########::::::##############",
      "#UU..T....::::::......T....UU#",
      "#U........::::::...........UU#",
      "#....R......::.........R.....#",
      "#...........::...............#",
      "::::........::..........::::::",
      "::::::::::::::::::::::::::::::",
      "::::......!.::..........::::::",
      "#...........::...............#",
      "#..T....R...::.....T.....R...#",
      "#...........::...............#",
      "#UU.....T...::.......T.....UU#",
      "#U..........::..............U#",
      "############::################",
    ],
    entries: { from_board: [14, 9, 'up'], from_pines: [12, 1, 'down'], from_bridge: [1, 6, 'right'], from_canyon: [28, 6, 'left'], from_world: [12, 12, 'up'] },
    exits: [
      { at: [10, 0, 6, 1], to: 'glacier_pines', entry: 'from_gate' },
      { at: [0, 5, 1, 3], to: 'glacier_bridge', entry: 'from_gate' },
      { at: [29, 5, 1, 3], to: 'glacier_canyon', entry: 'from_gate' },
      Object.assign({ at: [12, 13, 2, 1] }, TOWORLD),
    ],
    objects: [
      { at: [10, 7], talk: function* (s) {
          yield s.msg('A signpost, half buried in snow:\n"ICE GATE"\nThe arrows beyond that have long since blown away.');
          if (s.has('glacier_map')) yield* showGlacierMap(s);
        } },
    ],
  });

  // ================================================================== (2) the bridge and the lone tree
  glacier('glacier_bridge', {
    name: 'Great Glacier - Crevasse',
    battle: { table: 'glacier_pass', bg: 'glacier', rate: 1 },
    grid: [
      "#####::::###################",
      "#U...::::....   ..........U#",
      "#....:::.....   ..........::",
      "#.....::.....   .......:::::",
      "#......::....   ......::...#",
      "#......::....   .....::....#",
      "#R.....::::::KKK::::::.....#",
      "#.....T......   .....::....#",
      "#............   ......::::::",
      "#U...........   ........::::",
      "#UU..........   ..........U#",
      "############################",
    ],
    entries: { from_gate: [26, 8, 'left'], from_pines: [26, 2, 'left'], from_icefield: [6, 1, 'down'] },
    exits: [
      { at: [5, 0, 4, 1], to: 'glacier_icefield', entry: 'from_bridge' },
      { at: [27, 2, 1, 2], to: 'glacier_pines', entry: 'from_bridge' },
      { at: [27, 8, 1, 2], to: 'glacier_gate', entry: 'from_bridge' },
    ],
    objects: [
      { at: [6, 7], talk: function* (s) { yield s.msg("A single tree, its branches bowed under the snow. How it grows out here at all is a mystery."); } },
      { at: [14, 5], talk: function* (s) { yield s.msg("The crevasse drops away into blue darkness. You can't see the bottom."); } },
    ],
  });

  // ================================================================== (3) the pines (Mind Source)
  glacier('glacier_pines', {
    name: 'Great Glacier - Pine Woods',
    battle: { table: 'glacier_pass', bg: 'glacier', rate: 1 },
    grid: [
      "############################",
      "#TT.T..T.T..T...T..T.T..TTT#",
      "#T..T...T..........T...T..T#",
      "#..T..T.....:::::.....T....#",
      "::.....T...::...::..T......#",
      ":::::::::::::...::::::.....#",
      "::...T.........T....::::::::",
      "#..T.....T..........T...::::",
      "#.....T.....:::....T....::::",
      "#..T.......::.::.......T...#",
      "#T....T...::...T..T.....T..#",
      "#..T....T.::.T.......T....T#",
      "##########:::###############",
    ],
    entries: { from_bridge: [1, 5, 'right'], from_lake: [26, 7, 'left'], from_gate: [11, 11, 'up'], from_board: [14, 8, 'down'] },
    exits: [
      { at: [0, 4, 1, 3], to: 'glacier_bridge', entry: 'from_pines' },
      { at: [27, 6, 1, 3], to: 'glacier_lake', entry: 'from_pines' },
      { at: [10, 12, 3, 1], to: 'glacier_gate', entry: 'from_pines' },
    ],
    items: [{ at: [14, 3], item: 'mind_source', id: 'glacier_pines_mind_source' }],
  });

  // ================================================================== (4) the frozen lake (Potion)
  glacier('glacier_lake', {
    name: 'Great Glacier - Frozen Lake',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    grid: [
      "####::::#################::::#",
      "#...::::....iiiiiiiiii...::::#",
      "#....::...iiiiiiiiiiiiii..::.#",
      "#.....::.iiii~~~iiiiiiiii::..#",
      "#......::iii~~~~~iiiiiii::...#",
      "#.......:iiii~~~iiiiiii::....#",
      "::::::::::iiiiiiiiiiii::.....#",
      "::....T....iiiiiiiii::.......#",
      "#..T.....T..........::::::::::",
      "#.T...T....T...T....::::::::::",
      "#...T....T....T...T.....T...::",
      "#T.....T....T....T.....T....T#",
      "#..T....T.....T.....T....T...#",
      "##############################",
    ],
    entries: { from_pines: [1, 6, 'right'], from_floes: [5, 1, 'down'], from_lonepine: [26, 1, 'down'], from_canyon: [28, 9, 'left'] },
    exits: [
      { at: [4, 0, 4, 1], to: 'glacier_floes', entry: 'from_lake' },
      { at: [25, 0, 4, 1], to: 'glacier_lonepine', entry: 'from_lake' },
      { at: [0, 6, 1, 2], to: 'glacier_pines', entry: 'from_lake' },
      { at: [29, 8, 1, 3], to: 'glacier_canyon', entry: 'from_lake' },
    ],
    items: [{ at: [18, 4], item: 'potion', id: 'glacier_lake_potion' }],
    objects: [
      { at: [14, 4], talk: function* (s) { yield s.msg('A hole in the ice. Black water laps at the edge. Better not fall in.'); } },
    ],
  });

  // ================================================================== (4a/4b) the ice floes and the Safety Bit cave
  // Jump from floe to floe: face the water and press OK. Snow-covered floes are solid; bare ice cracks.
  const FLOE_X = [4, 7, 10, 13, 16], FLOE_Y = [6, 9, 12];
  const SOLID = new Set(['10,12', '7,12', '7,9', '10,9', '13,9', '13,6', '16,12']);
  function* floeJump(s, x, y) {
    yield s.jump('player', x, y, 0.55, 22);
    if (FLOE_Y.indexOf(y) < 0 || SOLID.has(x + ',' + y)) return;
    s.sfx('ice'); s.shake(3, 20);
    s.flash('#b0d0ff', 10, 0.5);
    s.anim('player', 'hurt');
    yield s.msg('CRACK! The bare ice gives way!');
    yield s.fadeOut(24);
    s.stopAnim('player');
    s.place('player', 10, 15, 'up');
    s.inc('c9_cold', 12);
    yield s.fadeIn(24);
    if (!s.flag('c9_floe_fell')) {
      s.set('c9_floe_fell');
      yield s.say(s.leader(), "(Brrr...! Soaked to the bone... That floe was just bare ice. The ones with snow on them looked thicker.)");
    } else {
      yield s.say(s.leader(), "(Ugh... Freezing...)");
    }
  }
  function floeTriggers() {
    const t = [];
    const hop = (x, y) => ({ on: 'talk', run: function* (s) { yield* floeJump(s, x, y); } });
    FLOE_X.forEach(fx => {
      t.push(Object.assign({ at: [fx, 14] }, hop(fx, 12)), Object.assign({ at: [fx, 13] }, hop(fx, 15)));
      t.push(Object.assign({ at: [fx, 4] }, hop(fx, 6)), Object.assign({ at: [fx, 5] }, hop(fx, 3)));
      for (let i = 0; i < FLOE_Y.length - 1; i++) {
        const y0 = FLOE_Y[i], y1 = FLOE_Y[i + 1];
        t.push(Object.assign({ at: [fx, y0 + 1] }, hop(fx, y1)), Object.assign({ at: [fx, y1 - 1] }, hop(fx, y0)));
      }
    });
    FLOE_Y.forEach(fy => {
      for (let i = 0; i < FLOE_X.length - 1; i++) {
        const x0 = FLOE_X[i], x1 = FLOE_X[i + 1];
        t.push(Object.assign({ at: [x0 + 1, fy] }, hop(x1, fy)), Object.assign({ at: [x1 - 1, fy] }, hop(x0, fy)));
      }
    });
    return t;
  }
  glacier('glacier_floes', {
    name: 'Great Glacier - Ice Floes',
    battle: { table: 'glacier_ice_cave', bg: 'glacier', rate: 0.6 },
    grid: [
      "#####################",
      "#UUU.....UUUUU....UU#",
      "#U.................U#",
      "#...................#",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~i~~i~~i~~.~~i~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~i~~.~~.~~.~~i~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~i~~.~~.~~i~~.~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~",
      "#...................#",
      "#U.......::.......UU#",
      "#########::##########",
    ],
    look: { water: '#2a5070' },
    entries: { from_lake: [9, 16, 'up'] },
    exits: [{ at: [9, 17, 2, 1], to: 'glacier_lake', entry: 'from_floes' }],
    chests: [{ at: [4, 1], item: 'safety_bit', id: 'glacier_floes_safety_bit' }],
    triggers: floeTriggers(),
    onEnter: function* (s) {
      if (s.flag('c9_floes_seen')) return;
      s.set('c9_floes_seen');
      yield s.msg('Chunks of ice drift in the dark water. On the far shore, a hollow in the ice glints.\n(Face the water and press OK to jump to the next floe.)');
    },
  });

  // ================================================================== (5) the icy canyon
  glacier('glacier_canyon', {
    name: 'Great Glacier - Icy Canyon',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    grid: [
      "#############::::#############",
      "####UU.......::::........U####",
      "###U.........::::.........U###",
      "::...R......::..::.....R....##",
      "::..........::..::..........##",
      "#.....iiiiiii::..::iiiiiii...#",
      "#....iiiiiii::....::iiiiiii..#",
      "#....iiiiii::......::iiiiii:::",
      "::::::::::::........::::::::::",
      "::...iiiii..........iiiiii::::",
      "#....iiiii..R....R..iiiii....#",
      "#U.......................U..U#",
      "#UU.....UUU........UUU....UUU#",
      "##############################",
    ],
    entries: { from_crossroads: [14, 1, 'down'], from_lake: [1, 3, 'right'], from_gate: [1, 8, 'right'], from_icecave: [28, 8, 'left'], from_board: [15, 9, 'down'] },
    exits: [
      { at: [13, 0, 4, 1], to: 'glacier_crossroads', entry: 'from_canyon' },
      { at: [0, 3, 1, 2], to: 'glacier_lake', entry: 'from_canyon' },
      { at: [0, 8, 1, 2], to: 'glacier_gate', entry: 'from_canyon' },
      { at: [29, 7, 1, 3], to: 'glacier_icecave', entry: 'from_canyon' },
    ],
  });

  // ================================================================== (5+) ice cave out to the world map
  glacier('glacier_icecave', {
    name: 'Great Glacier - Ice Cave', theme: 'ice',
    look: { sky: ['#0a1628', '#1a3050'], fog: { color: [0.12, 0.2, 0.32], near: 6, far: 18 }, ambient: [0.46, 0.52, 0.62], wall: '#6a90b8', floor: ['#b8d4ea', '#b0cce4'], floor2: ['#9cc0dc', '#94b8d4'] },
    battle: { table: 'glacier_ice_cave', bg: 'glacier', rate: 1 },
    grid: [
      "##########################",
      "#UU....UUU#####UU.....UUU#",
      "#.........###.........UU.#",
      "::.....U..........U......:",
      "::.......................:",
      "::....U.....UU...........:",
      "#.......UU..........U....#",
      "#UU..............UU....UU#",
      "#UUUU....UUUU.......UUUUU#",
      "##########################",
    ],
    entries: { from_canyon: [1, 4, 'right'] },
    exits: [
      { at: [0, 3, 1, 3], to: 'glacier_canyon', entry: 'from_icecave' },
      Object.assign({ at: [25, 3, 1, 3] }, TOWORLD),
    ],
    objects: [
      { at: [12, 1], talk: function* (s) { yield s.msg('A draft of fresh air blows in from the east. The way out of the glacier, back toward Icicle Inn.'); } },
    ],
  });

  // ================================================================== (6) the ice field (eagle's-eye view, Elixir cave)
  glacier('glacier_icefield', {
    name: 'Great Glacier - Ice Field',
    camera: { pitch: 72, dist: 13 },
    battle: { table: 'glacier_northwest', bg: 'glacier', rate: 1 },
    grid: [
      "######::::##################",
      "#UU...::::.....UUU......UU##",
      "#.....::..................U#",
      "#.....::.....######.......U#",
      "#......::...##....##.......#",
      "#.......::..#......#........",
      "#........::.#......#..::::::",
      "#.........::###..###.::.....",
      "#..........::.........::...#",
      "#U..........::.......::....#",
      "#UU..........::....::.....U#",
      "#UUU..........::::::....UUU#",
      "###########::::#############",
    ],
    entries: { from_trail: [7, 1, 'down'], from_bridge: [12, 11, 'up'], from_log: [26, 6, 'left'] },
    exits: [
      { at: [6, 0, 4, 1], to: 'glacier_trail', entry: 'from_icefield' },
      { at: [11, 12, 4, 1], to: 'glacier_bridge', entry: 'from_icefield' },
      { at: [27, 5, 1, 3], to: 'glacier_log', entry: 'from_icefield' },
    ],
    items: [{ at: [15, 5], item: 'elixir', id: 'glacier_icefield_elixir' }],
  });

  // ================================================================== (7) the log bridge
  glacier('glacier_log', {
    name: 'Great Glacier - Fallen Tree',
    battle: { table: 'glacier_northwest', bg: 'glacier', rate: 1 },
    grid: [
      "#################::::#######",
      "#UU...T.....    .::::.....U#",
      "#...........    ..::......T#",
      "#.....T.....    ...::......#",
      "#...........    .....::....#",
      "::::........    ......::::::",
      "::::::::::::KKKK::::::::::::",
      "#...T.......    ..........::",
      "#...........    ..T........#",
      "#UU....T....    .......T..U#",
      "#UUU........    .........UU#",
      "############################",
    ],
    look: { wood: ['#5a4028', '#523a24'] },
    entries: { from_trail: [18, 1, 'down'], from_icefield: [1, 6, 'right'], from_lonepine: [26, 6, 'left'] },
    exits: [
      { at: [17, 0, 4, 1], to: 'glacier_trail', entry: 'from_log' },
      { at: [0, 5, 1, 2], to: 'glacier_icefield', entry: 'from_log' },
      { at: [27, 5, 1, 3], to: 'glacier_lonepine', entry: 'from_log' },
    ],
    objects: [
      { at: [11, 6], talk: function* (s) { yield s.msg('A huge pine trunk has fallen across the crevasse. It creaks, but it holds.'); } },
    ],
  });

  // ================================================================== (9) the lone pine
  glacier('glacier_lonepine', {
    name: 'Great Glacier - Lone Pine',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    grid: [
      "########################",
      "#UU..................UU#",
      "::.....................#",
      "::::::.................#",
      "::....::......T........#",
      "#.......::.............#",
      "#........::::::::......#",
      "#.....::::......::::::::",
      "#....::...............::",
      "#U..::...............UU#",
      "#UU::...............UUU#",
      "###::###################",
    ],
    entries: { from_log: [1, 3, 'right'], from_crossroads: [22, 7, 'left'], from_lake: [3, 10, 'up'], from_board: [12, 6, 'down'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'glacier_log', entry: 'from_lonepine' },
      { at: [23, 7, 1, 2], to: 'glacier_crossroads', entry: 'from_lonepine' },
      { at: [3, 11, 2, 1], to: 'glacier_lake', entry: 'from_lonepine' },
    ],
    objects: [
      { at: [14, 4], talk: function* (s) { yield s.msg('A lone pine stands in the middle of the white. Someone has tied a faded red ribbon around its trunk.'); } },
    ],
  });

  // ================================================================== (10) the crossroads
  glacier('glacier_crossroads', {
    name: 'Great Glacier - Crossroads',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    grid: [
      "####::#############::#####",
      "#U..::..............::..U#",
      "#....::............::....#",
      "#.....::..........::.....#",
      "#......::........::......#",
      "#.......::......::.......#",
      "#........::::::::........#",
      "#.........::::::.........#",
      "::::::::::::::::.........#",
      "::.......::::::..........#",
      "#.........::::...........#",
      "#U.........::.........UU.#",
      "#UU........::.........UUU#",
      "###########::#############",
    ],
    entries: { from_springs: [4, 1, 'down'], from_slope: [20, 1, 'down'], from_lonepine: [1, 8, 'right'], from_canyon: [11, 12, 'up'], from_snowcave: [22, 8, 'left'] },
    exits: [
      { at: [4, 0, 2, 1], to: 'glacier_springs', entry: 'from_crossroads' },
      { at: [19, 0, 2, 1], to: 'glacier_slope', entry: 'from_crossroads' },
      { at: [0, 8, 1, 2], to: 'glacier_lonepine', entry: 'from_crossroads' },
      { at: [11, 13, 2, 1], to: 'glacier_canyon', entry: 'from_crossroads' },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'from_snowcave') return;
      yield s.msg('...and lands in a heap at the bottom of the ice chute.');
    },
  });

  // ================================================================== the slope (Added Cut alcove)
  glacier('glacier_slope', {
    name: 'Great Glacier - Slope',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    grid: [
      "###########::###########",
      "#UU........::.........U#",
      "#.........::...........#",
      "#........::.........####",
      "#.......::..........####",
      "#......::..............#",
      "#.....::...........#####",
      "#....::............#####",
      "#...::................U#",
      "#U.::.................U#",
      "#UU::...............UUU#",
      "###::###################",
    ],
    entries: { from_springs: [11, 1, 'down'], from_crossroads: [3, 10, 'up'] },
    exits: [
      { at: [11, 0, 2, 1], to: 'glacier_springs', entry: 'from_slope' },
      { at: [3, 11, 2, 1], to: 'glacier_crossroads', entry: 'from_slope' },
    ],
    items: [{ at: [22, 5], materia: 'added_cut', id: 'glacier_slope_added_cut' }],
  });

  // ================================================================== (8) the hot spring
  glacier('glacier_springs', {
    name: 'Great Glacier - Hot Spring',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 1 },
    look: { water: '#6aa8c0' },
    lights: [[19, 4, '#fff0d0', 4]],
    grid: [
      "##########::::##############",
      "#UU.......::::.........UUU##",
      "#.........::...............#",
      "#.....RR...::....~~~~~.....#",
      "#....R......::..~~~~~~~R...#",
      "#...........::..~~~~~~~....#",
      "#..........::....~~~~~.....#",
      "#.........::...............#",
      "#........::.........::.....#",
      "#.......::...........::....#",
      "#UU....::.............::..U#",
      "#UUU..::...............::UU#",
      "######::################::##",
    ],
    entries: { from_snowfield: [11, 1, 'down'], from_crossroads: [6, 11, 'up'], from_slope: [24, 11, 'up'] },
    exits: [
      { at: [10, 0, 4, 1], to: 'glacier_snowfield', entry: 'from_springs' },
      { at: [6, 12, 2, 1], to: 'glacier_crossroads', entry: 'from_springs' },
      { at: [24, 12, 2, 1], to: 'glacier_slope', entry: 'from_springs' },
    ],
    triggers: [
      C9.counter([16, 3, 7, 4], function* (s) {
        if (s.flag('c9_hotspring')) { yield s.msg('The hot spring steams quietly. The warmth is almost painful after the cold.'); return; }
        yield s.msg('Steam curls up from a pool in the ice.\nIt is a hot spring, bubbling up from somewhere deep below.');
        const c = yield s.ask(null, 'Touch the water?', ['Touch it', 'Leave it']);
        if (c !== 0) return;
        s.set('c9_hotspring');
        s.sfx('heal');
        yield s.msg("It's warm! Feeling rushes back into numb fingers.\nThe water leaves a faint, sweet scent on the skin.");
      }),
    ],
  });

  // ================================================================== (11) the trail and the stone face
  glacier('glacier_trail', {
    name: 'Great Glacier - Mountain Trail',
    battle: { table: 'glacier_northwest', bg: 'glacier', rate: 1 },
    grid: [
      "#########::::#############",
      "#u###.....::::......####U#",
      "#.........::::..........U#",
      "#R.......::..::.........R#",
      "#.......::....::.........#",
      "#......::......::........#",
      "#.....::........::.......#",
      "#....::..........::......#",
      "#...::............::.....#",
      "#..::..............::....#",
      "#U::................::..U#",
      "#::..................::UU#",
      "#::###################::##",
    ],
    entries: { from_snowfield: [10, 1, 'down'], from_icefield: [1, 11, 'up'], from_log: [22, 11, 'up'] },
    exits: [
      { at: [9, 0, 4, 1], to: 'glacier_snowfield', entry: 'from_trail' },
      { at: [1, 12, 2, 1], to: 'glacier_icefield', entry: 'from_trail' },
      { at: [22, 12, 2, 1], to: 'glacier_log', entry: 'from_trail' },
    ],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg('...A huge stone face stares out of the mountainside, half hidden by frost.\nIt looks almost bored.'); } },
    ],
  });

  // ================================================================== (12) the snowfield
  // FF7: the blizzard keeps turning you around. Here the wind swings the camera, and with it the controls.
  const WIND = [
    { at: [7, 17, 3, 3], yaw: 55 }, { at: [24, 16, 3, 3], yaw: -70 }, { at: [9, 4, 3, 3], yaw: 150 },
    { at: [27, 5, 3, 3], yaw: -120 }, { at: [18, 19, 3, 3], yaw: 0 }, { at: [3, 10, 3, 3], yaw: 95 },
    { at: [26, 11, 3, 2], yaw: 20 }, { at: [16, 3, 3, 2], yaw: -30 },
  ];
  function windTriggers() {
    return WIND.map(wd => ({
      at: wd.at, once: false,
      if: s => s.get('c9_wind_yaw') !== wd.yaw,
      run: function* (s) {
        s.setVar('c9_wind_yaw', wd.yaw);
        s.shake(1, 30);
        if (!s.flag('c9_wind_seen')) {
          s.set('c9_wind_seen');
          yield s.msg('A roaring gust sweeps across the snowfield!\nIn the white-out, it is impossible to tell which way is which...');
        }
        yield s.cam(wd.at[0] + 1, wd.at[1] + 1, 16, { yaw: wd.yaw });
        s.camFollow(20, { keepZoom: true });
      },
    }));
  }
  glacier('glacier_snowfield', {
    name: 'Great Glacier - Snowfield',
    look: { floor: ['#f4f6fa', '#eef1f6'], sky: ['#e8ecf2', '#f4f6fa'], fog: { color: [0.93, 0.94, 0.96], near: 3, far: 10 }, wall: '#c0ccd8' },
    battle: { table: 'glacier_snowfield', bg: 'snow', rate: 1 },
    grid: [
      "#################::::###############",
      "#U..............................U..#",
      "#..........R.............U.........#",
      "#...U..............................#",
      "#.....................R............#",
      "#........U.........................#",
      "#..R...............................#",
      "#...........................U......#",
      "#.............#######..............#",
      "#......U.....##.....##.............#",
      "#............#.......#.......R......",
      "#............#.......#..............",
      "#.....R......###...###..............",
      "#...................................",
      "#.........................U........#",
      "#...U..............................#",
      "#...............R..................#",
      "#.......................R..........#",
      "#..R...............................#",
      "#............U.....................#",
      "#......................U...........#",
      "#.U.............................R..#",
      "#..................................#",
      "#####::::#################::::######",
    ],
    entries: { from_trail: [6, 22, 'up'], from_springs: [27, 22, 'up'], from_snowcave: [34, 11, 'left'], from_base: [18, 1, 'down'] },
    exits: [
      { at: [17, 0, 4, 1], to: 'gaea_base', entry: 'from_snowfield' },
      { at: [5, 23, 4, 1], to: 'glacier_trail', entry: 'from_snowfield' },
      { at: [26, 23, 4, 1], to: 'glacier_springs', entry: 'from_snowfield' },
      { at: [35, 10, 1, 4], to: 'glacier_snowcave', entry: 'from_snowfield' },
    ],
    items: [{ at: [17, 10], materia: 'all', id: 'glacier_snowfield_all' }],
    triggers: windTriggers(),
    onLoad: function (s) { s.setVar('c9_wind_yaw', 0); },
    onEnter: function* (s) {
      if (s.flag('c9_snowfield_seen')) return;
      s.set('c9_snowfield_seen');
      yield s.say(s.leader(), "(A white-out... I can't see more than a few steps ahead.\fGaea's Cliff should be to the north. If I lose my bearings in here...)");
    },
  });

  // ================================================================== (13) Snow's cave (Alexander)
  const SNOW_MODEL = { base: 'woman', female: true, skin: '#e4ecf6', hair: '#eef4ff', hairStyle: 'long', top: '#f4f8ff', sleeve: '#f4f8ff', bottom: '#f4f8ff', skirt: 'long', boots: '#dce8f6' };
  glacier('glacier_snowcave', {
    name: 'Great Glacier - Ice Cave',
    battle: { table: 'glacier_center', bg: 'glacier', rate: 0.8 },
    grid: [
      "############################",
      "#U.......UU#####UUUUUUUUUUU#",
      "#..........#####U.........U#",
      "::.........#####...........#",
      "::.........#####.....U.....#",
      ":::::::::::iiiii...........#",
      "#..........#####...........#",
      "#..R.......#####U..........#",
      "#..........#####UU......UUU#",
      "#U....::...#################",
      "#UU...::...#################",
      "######::####################",
    ],
    look: { floor2: ['#9cc0dc', '#94b8d4'] },
    entries: { from_snowfield: [1, 4, 'right'] },
    exits: [
      { at: [0, 3, 1, 3], to: 'glacier_snowfield', entry: 'from_snowcave' },
      { at: [6, 11, 2, 1], run: function* (s) {
          const c = yield s.ask(null, 'An icy chute plunges steeply to the south. There will be no climbing back up.\nSlide down?', ['Slide down', 'Stay']);
          if (c !== 0) return;
          yield s.msg('Down the chute at breakneck speed...!');
          yield s.goto('glacier_crossroads', 'from_snowcave');
        } },
    ],
    npcs: [
      { id: 'snow_woman', name: 'Snow', model: SNOW_MODEL, at: [22, 3], dir: 'down', show: s => !s.flag('c9_snow_beaten'),
        talk: function* (s) {
          if (!s.flag('c9_hotspring')) {
            if (!s.flag('c9_snow_met')) {
              s.set('c9_snow_met');
              yield s.say('Snow', "...A visitor. How unusual. The ones who wander this far into the ice usually... stay.\fCome closer, if you like. It's so very cold out there. In here, it is always just as cold. Isn't that comforting?");
              yield s.say(s.leader(), "(...Something about her isn't right.)");
            } else {
              yield s.say('Snow', "Still here? Mmm... You have such warm eyes. I could keep you forever.");
            }
            return;
          }
          s.music('none');
          yield s.emote('snow_woman', '!!');
          yield s.say('Snow', "That smell... You've been in the hot spring. MY glacier, and you went and soaked in warm water?!\fI can smell the heat on you! It's disgusting! I'll freeze it right out of you!");
          yield s.battle({ enemies: ['snow'], bg: 'glacier', music: 'boss', noEscape: true });
          s.set('c9_snow_beaten');
          s.hide('snow_woman');
          s.music('snow');
          yield s.msg('Snow shatters into a glittering cloud of ice crystals...\nWhere she stood, something glows with a steady light.');
          yield s.giveMateria('alexander');
        } },
    ],
  });

  // ================================================================== base of Gaea's Cliff
  FF7.defineMap('gaea_base', {
    name: "Base of Gaea's Cliff", area: "Gaea's Cliff", theme: 'snow', music: 'snow',
    look: Object.assign({}, GLACIER, { wall: '#7a808c', wallH: 3.4, trim: '#4a3020', floor3: ['#6a4a30', '#62442c'] }),
    grid: [
      "############################",
      "####U.......::......U#######",
      "#U..........::.......U.....#",
      "#...........::.............#",
      "#..hhhhhhh...::............#",
      "#..hhhhhhh....::.....R.....#",
      "#..hhh+hhh.....::..........#",
      "#.....:.........::.........#",
      "#.....:::::::::::::........#",
      "#U..............::.......U.#",
      "#UU..............::.....UU.#",
      "#UUU.............::...UUU..#",
      "#################::#########",
    ],
    entries: { from_cabin: [6, 7, 'down'], from_snowfield: [17, 11, 'up'], from_cliff: [12, 2, 'down'] },
    exits: [
      { at: [6, 6, 1, 1], to: 'gaea_cabin', entry: 'from_base', sfx: 'door' },
      { at: [17, 12, 2, 1], to: 'glacier_snowfield', entry: 'from_base' },
      { at: [12, 1, 2, 1], to: 'gaea_cliff1', entry: 'from_base',
        if: s => s.flag('c9_holzoff_met') && !s.flag('meteor'),
        blocked: function* (s) {
          if (s.flag('meteor')) { yield s.msg("Since the crater erupted, great slabs of ice have sheared off the cliff face. There's no way up any more."); return; }
          yield s.say(s.leader(), "(A sheer wall of ice and rock... Gaea's Cliff. Climbing that blind would be suicide.\fSomeone lives in that cabin. Maybe they know a way up.)");
        } },
    ],
    objects: [
      { at: [12, 0], talk: function* (s) { yield s.msg("Gaea's Cliff rises straight up into the clouds. Old pitons and frayed ropes hang from the lowest ledges."); } },
    ],
    onEnter: function* (s) {
      C9.resetCold(s);
      if (s.flag('c9_base_seen') || s.flag('c9_holzoff_met')) return;
      s.set('c9_base_seen');
      yield s.say(s.leader(), "(A cabin... at the foot of the cliff. Someone actually lives out here?)");
    },
  });

  // ================================================================== Holzoff's cabin
  const HOLZOFF = { base: 'oldman', top: '#7a4a2a', sleeve: '#7a4a2a', bottom: '#4a3a2a', boots: '#3a2a1a', hair: '#e0e0e0', extras: ['furcollar', 'beard'] };
  function* holzoffIntro(s, rescued) {
    s.set('c9_holzoff_met');
    s.music('snow');
    if (rescued) {
      yield s.say('holzoff', "Well, well! Awake at last. You were half frozen when I dragged you in here. Lucky I was out checking my traps.");
    } else {
      yield s.say('holzoff', "Well, well! Visitors! Don't get many who make it this far on their own two feet.");
    }
    yield s.say('holzoff', "Name's Holzoff. Been climbing these mountains since before you were born.");
    yield s.say(s.leader(), "We need to get past Gaea's Cliff.");
    yield s.say('holzoff', "Past it? Hah! ...You're serious.\fWell, you're not the first this season. A string of fellows in black robes staggered by not long ago. Didn't stop, didn't eat, didn't say a word. Just walked straight up the cliff like they couldn't feel the cold at all.");
    yield s.say('holzoff', "Beyond Gaea's Cliff lies a great crater. Long, long ago, something fell out of the sky and struck the land there.\fThe old stories say the Planet has been trying to heal that wound ever since. That's why nothing grows, and the snow never melts.");
    yield* C9.anyone(s, [
      ['redxiii', "The wound Ifalna spoke of... It really is here."],
      ['tifa', "That's where Sephiroth is headed. It has to be."],
      ['barret', "A crater, huh? Then that's where we're goin'."],
      ['cid', "A crater past the cliff. Figures the bastard'd pick the worst neighborhood on the whole damn Planet."],
    ]);
    yield s.say('holzoff', "I tried to climb it once, with my partner. Best climber I ever knew.\f...The mountain kept him. Been waiting down here ever since for the chance to finish that climb. Maybe that's why I keep hauling frozen fools out of the snow.");
    yield* holzoffAdvice(s);
    yield s.say('holzoff', "Rest up before you go. The bed's free and so is the advice. Take it from an old man: a tired climber is a dead climber.");
  }
  function* holzoffAdvice(s) {
    yield s.say('holzoff', "On the cliff face, the cold drains your body heat fast. Keep your hands moving, keep the blood flowing, and don't dawdle.\fDrop below 26 degrees and you'll black out and fall. I'll fetch you back if I can... but I won't always be there.\fAt the forks, the cracks that go straight up are usually the ones that lead somewhere. The rest are dead ends.");
  }
  const holzoffTalk = function* (s) {
    if (!s.flag('c9_holzoff_met')) { yield* holzoffIntro(s, false); return; }
    const c = yield s.ask('holzoff', "Need something?", ['Rest', 'Ask about the cliff', 'Nothing']);
    if (c === 0) { yield s.inn(0, { who: 'holzoff', text: "Get some sleep. The cliff'll still be there in the morning." }); return; }
    if (c === 1) { yield* holzoffAdvice(s); return; }
    yield s.say('holzoff', s.flag('meteor') ? "That red star in the sky... In all my years I've never seen anything like it. The whole mountain groans at night now." : "Mind the cold out there.");
  };
  FF7.defineMap('gaea_cabin', {
    name: "Holzoff's Cabin", area: "Gaea's Cliff", theme: 'house', music: 'snow',
    look: { wall: '#8a6a48', trim: '#3a2818', floor: ['#6a4a30', '#62442c'], ambient: [0.5, 0.44, 0.38] },
    lights: [[5, 2, '#ffb060', 4]],
    grid: [
      "########################",
      "#kk..F....b.#qq....bb..#",
      "#...........#..........#",
      "#..t.c......+..........#",
      "#..t........#.....t.c..#",
      "#...........#..........#",
      "#.......S...#......j...#",
      "######+#################",
    ],
    entries: { from_base: [6, 6, 'up'], rescued: [10, 2, 'down'] },
    exits: [{ at: [6, 7, 1, 1], to: 'gaea_base', entry: 'from_cabin', sfx: 'door' }],
    npcs: [
      { id: 'holzoff', name: 'Holzoff', model: HOLZOFF, at: [8, 3], dir: 'down', talk: holzoffTalk },
    ],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg('Climbing journals, decades of them. The last entries are all about one route: straight up Gaea\'s Cliff.'); } },
      { at: [13, 1], talk: function* (s) { yield s.msg('A photograph pinned above the shelf: two young climbers grinning on a summit, arms around each other\'s shoulders.'); } },
      { at: [10, 1], talk: function* (s) { yield s.inn(0, { text: "Rest in Holzoff's spare bed?" }); } },
    ],
    onEnter: function* (s) {
      C9.resetCold(s);
      if (s.entry() === 'rescued') yield* rescued(s);
    },
  });
  function* rescued(s) {
      s.anim('player', 'lie');
      s.heal();
      yield s.fadeIn(40);
      yield 40;
      s.stopAnim('player');
      yield s.face('player', 'holzoff');
      if (!s.flag('c9_holzoff_met')) { yield* holzoffIntro(s, true); return; }
      yield s.say('holzoff', "Again?! You kids have got to learn when to come in from the cold.\fSit by the fire a while. And next time, don't go wandering around out there like it's a picnic.");
  }
  FF7.story.c9_rescued = rescued;
})();

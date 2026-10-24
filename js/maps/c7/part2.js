// Chapter 7 (part 2) — Mt. Nibel (the long path, the wooden bridge, the "5 pipe" screen with its slides
// and ladder, the western base, the green Mako caverns and the fountain, the reactor seen from outside,
// and the Materia Keeper), then Rocket Town: Shinra No. 26, the old man who watches the rocket
// (Yoshiyuki), Shera and her tea, Cid in his rocket, Rufus and Palmer coming for the Tiny Bronco, Palmer's
// fight, and the Bronco's short flight — shot down, it can only skim the sea now. Cid joins.
// The terrain of the path, bridge, fountain cave and reactor path mirrors the flashback maps (c5a).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c7_nibel_path, c7_nibel_bridge, c7_nibel_ladder, c7_nibel_ledge_hint, c7_nibel_base,
// c7_fountain, c7_reactor_seen, c7_keeper_dead, c7_rocket_arrived, c7_yoshiyuki, c7_shera_met,
// c7_bronco_seen, c7_cid_met, c7_tea, c7_palmer_done; shared: cid_joined, has_bronco.
// Vars: c7_oldman_talks.
(function () {
  const TEAM = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const mates = (s) => TEAM.filter(id => s.inParty(id));
  const disc1 = (s) => !s.flag('disc2');
  const counter = (at, run) => ({ at, on: 'talk', run });
  function* chime(s, lines) {
    for (const [id, text] of lines) if (id === 'cloud' || s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  function popOut(s, spots) {
    const ids = mates(s).slice(0, spots.length);
    ids.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'down', { name: s.name(id) }));
    return ids;
  }
  const tuckIn = (s, ids) => ids.forEach(id => s.remove(id));
  const CLOAK = { base: 'man', top: '#16141a', sleeve: '#16141a', bottom: '#16141a', boots: '#0c0c0e', gloves: '#16141a', hair: '#8a8a8a', hairStyle: 'longmessy', skin: '#c4bcb4', extras: ['cape', 'robe'] };

  // ------------------------------------------------------------------ world links
  FF7.world.link('mt_nibel_e', { map: 'mtnibel_path', entry: 'from_world' });
  FF7.world.link('mt_nibel_w', { map: 'mtnibel_pipes', entry: 'from_world' });
  FF7.world.link('rocket_town', { map: 'rocket_town', entry: 'from_world' });

  // ================================================================== MT. NIBEL
  const BG = 'mtnibel';
  // refs 08-nibelheim16, 17: blue-grey-green crags under a red-brown dusk; 19, 20: dark teal caves with
  // rusty pipes and green mako light
  const NIBEL_MT = { floor: ['#6a6c68', '#646662'], floor2: ['#5a6050', '#545a4a'], wall: '#566266', wallTop: '#3a4448', grass: ['#4a5a44', '#44543e'], metal: ['#7a5a40', '#72523a'],
    sky: ['#2a1c24', '#b0785a'], fog: { color: [0.45, 0.38, 0.36], near: 10, far: 26 }, ambient: [0.42, 0.42, 0.44], light: [0.82, 0.72, 0.64] };
  const NIBEL_CAVE = { floor: ['#3e4c46', '#3a4842'], floor2: ['#4a5a50', '#44544a'], wall: '#3a5a56', trim: '#1e2e2c', wallTop: '#243432', mako: '#50f090',
    metal: ['#7a5a40', '#72523a'], sky: ['#010604', '#06140e'], fog: { color: [0.02, 0.07, 0.06], near: 6, far: 18 }, ambient: [0.3, 0.38, 0.36], light: [0.55, 0.7, 0.66] };

  // ---- the long windy path to the bridge (terrain as in fb_mt_path)
  FF7.defineMap('mtnibel_path', {
    name: 'Mt. Nibel', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    look: NIBEL_MT,
    battle: { table: 'mt_nibel_path', bg: BG },
    grid: [
      "##################################",
      "###..R......................^..###",
      "###:::::::::::::::::::::::::::::::",
      "###:..........................::::",
      "###:...R......R.........R.....::::",
      "###:......::..................    ",
      "   :......::.............RR.      ",
      "        RR^^RR................    ",
      "        RR^^RR................    ",
      "      :::::::.........R.......    ",
      "      :..........%.............   ",
      "      :..R.................R...   ",
      "      :::::::::::::::..........   ",
      "       ..........R::R.........    ",
      ".................R^^R.........    ",
      ".................R^^R.........    ",
      " ....^.%..........::.........R.   ",
      " ..R..............::............  ",
      " ::::::::::::::::::::..........%  ",
      " ::......R.............R......    ",
      " ::....                           ",
    ],
    heights: [
      "8888888888888888888888888888888888",
      "8888888888888888888888888888998888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "4444444444664444444444444444444444",
      "4444444444664444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "0000000000000000002200000000000000",
      "0000000000000000002200000000000000",
      "0022210000000000000000000000000000",
      "0022200000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_town: [2, 19, 'up'], from_bridge: [32, 3, 'left'], from_world: [1, 14, 'right'] },
    exits: [
      { at: [1, 20, 2, 1], to: 'nibel_town', entry: 'from_mountain' },
      { at: [33, 2, 1, 3], to: 'mtnibel_bridge', entry: 'from_path' },
      { at: [0, 14, 1, 2], to: 'world', loc: 'mt_nibel_e' },
    ],
    items: [
      { at: [2, 16], item: 'rune_blade', id: 'mtnibel_rune_blade' },
      { at: [30, 1], item: 'plus_barrette', id: 'mtnibel_plus_barrette' },
    ],
    npcs: [
      { id: 'cloak_path', name: 'Man in Black', model: CLOAK, at: [12, 17], dir: 'right', show: disc1,
        talk: function* (s) {
          yield s.emote('cloak_path', '...');
          yield s.say('Man in Black', "......Over... the mountain......\fThe Reunion...... is to the north......");
        } },
    ],
    objects: [
      { at: [9, 19], talk: function* (s) { yield s.msg('A weathered trail marker. "Mt. Nibel — Reactor Road"'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_nibel_path')) return;
      s.set('c7_nibel_path');
      yield s.wait(20);
      yield chime(s, [['tifa', "Mt. Nibel... I used to guide people up this trail. I know every rock of it.\fThe reactor is up past the old bridge. We'll have to go past it to reach the other side of the range."],
        ['redxiii', "The trail climbs toward the ridge. Beyond it, the land slopes down to the western sea."],
        ['barret', "Man, what a climb. Why's Sephiroth always gotta go up a damn mountain?"]]);
    },
  });

  // ---- the wooden bridge (terrain as in fb_bridge; it held this time)
  FF7.defineMap('mtnibel_bridge', {
    name: 'Mt. Nibel', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    look: NIBEL_MT,
    battle: { table: 'mt_nibel_bridge', bg: BG },
    camera: { yaw: -25, pitch: 60, dist: 12 },   // ref 08-nibelheim17: the rope bridge from above
    grid: [
      "##########              ##########",
      "#..R.....R              R.....R..#",
      "#.........              .........#",
      "#...T.....              ......T..#",
      "#.........              .........#",
      "#....R....              ....R....#",
      "::::::::::KKKKKKKKKKKKKK::::::::::",
      "::::::::::KKKKKKKKKKKKKK::::::::::",
      "#.........              .........#",
      "#..R......              ......R..#",
      "#.........              .........#",
      "%%%%%%%%%%              %%%%%%%%%%",
    ],
    entries: { from_path: [2, 6, 'right'], from_pipes: [31, 6, 'left'] },
    exits: [
      { at: [0, 6, 1, 2], to: 'mtnibel_path', entry: 'from_bridge' },
      { at: [33, 6, 1, 2], to: 'mtnibel_pipes', entry: 'from_bridge' },
    ],
    triggers: [
      { id: 'midspan', at: [15, 6, 2, 2], once: true, if: s => s.isMember('tifa'),
        run: function* (s) {
          s.set('c7_nibel_bridge');
          s.spawn('tifa', 'tifa', 13, 7, 'right', { name: s.name('tifa') });
          yield s.say('tifa', "This bridge... It gave way under us, five years ago. We all fell into the caves.\fSomebody rebuilt it. Just like the town.");
          yield s.say('cloud', "......");
          yield s.say('tifa', "One of the troopers went missing when we fell. We never found him.");
          s.remove('tifa');
        } },
    ],
  });

  // ---- the "5 pipe" screen: pipe slides, the ladder, and the Materia Keeper's plateau above
  const PIPE_X = { 1: 26, 2: 21, 3: 16, 4: 11, 5: 6 };
  const PIPE_LAND = { 1: [26, 18], 2: [20, 14], 3: [16, 18], 4: [12, 14], 5: [6, 18] };
  function pipe(n) {
    return {
      at: [PIPE_X[n], 9], talk: function* (s) {
        const c = yield s.ask(null, `A wide pipe, slick with Mako residue. A faded "${n}" is painted on its mouth.`, ['Slide down', 'Leave it']);
        if (c !== 0) return;
        s.sfx('falling');
        yield s.fadeOut(14);
        const [lx, ly] = PIPE_LAND[n];
        s.place('player', lx, ly, 'down');
        yield s.fadeIn(14);
        if ((n === 2 || n === 4) && !s.flag('c7_nibel_ledge_hint')) {
          s.set('c7_nibel_ledge_hint');
          yield s.say('cloud', "(A little ledge, halfway down... I can jump off the edge to get to the bottom.)");
        }
      },
    };
  }
  function* ledgeJump(s, x) {
    const c = yield s.ask(null, 'Jump down to the bottom?', ['Jump', 'Stay']);
    if (c !== 0) return;
    yield s.jump('player', x, 18, 1.0, 30);
    s.shake(2, 10);
  }
  function* ladder(s, below) {
    if (s.flag('c7_nibel_ladder')) { yield s.msg('A rope ladder hangs down the rock face.'); return; }
    yield s.msg(below ? 'A rope ladder is rolled up at the top of the rock face, just out of reach.' : 'A rope ladder is rolled up and tied at the edge.');
    const c = yield s.ask(null, below ? 'Jump up and pull it down?' : 'Untie it and let it down?', ['Lower the ladder', 'Leave it']);
    if (c !== 0) return;
    s.set('c7_nibel_ladder');
    s.block(31, 15, false);
    s.sfx('search');
    yield s.msg('The ladder unrolls down the rock face. Now you can climb up and down here.');
  }
  FF7.defineMap('mtnibel_pipes', {
    name: 'Mt. Nibel', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    battle: { table: 'mt_nibel_cave', bg: BG },
    look: Object.assign({}, NIBEL_MT, { floor2: ['#5a6a40', '#54643a'] }),
    lights: [[16, 3, '#60ff90', 3]],
    grid: [
      "##################################",
      "#.....R......................R...#",
      ":................................:",
      ":.......U..............U.........:",
      "#.....................R..........#",
      "#..R......................R......#",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "R.................................",
      "R.................................",
      "RRRRRRPRRRRPRRRRPRRRRPRRRRPRRR...R",
      "      P    P    P    P    P   ...R",
      "      P    P    P    P    P   ...R",
      "      P    P    P    P    P   ...R",
      "      P  .....  P  .....  P   ...R",
      "      P  .....  P  .....  P   ...R",
      "      P         P         P   RHRR",
      "      P         P         P   ...R",
      "      P         P         P   ...R",
      "R................................R",
      "R......%..............R..........R",
      "R..R...........................%.R",
      "R................................R",
      "R..........%.........R...........R",
      "RRRRRRRRRRRRRRR:::RRRRRRRRRRRRRRRR",
    ],
    heights: [
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "6666666666666666666666666666666666",
      "6666666666666666666666666666666666",
      "6666666666666666666666666666666666",
      "0000005000050000500005000050006666",
      "0000005000050000500005000050006666",
      "0000004000040000400004000040006666",
      "0000003003333300300333330030006666",
      "0000003003333300300333330030006666",
      "0000002000000000200000000020006360",
      "0000001000000000100000000010000000",
      "0000001000000000100000000010000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_bridge: [32, 7, 'left'], from_base: [16, 22, 'up'], from_reactor: [1, 2, 'right'], from_world: [31, 2, 'left'] },
    exits: [
      { at: [33, 7, 1, 2], to: 'mtnibel_bridge', entry: 'from_pipes' },
      { at: [15, 23, 3, 1], to: 'mtnibel_base', entry: 'from_pipes' },
      { at: [0, 2, 1, 2], to: 'mtnibel_reactor', entry: 'from_pipes' },
      { at: [33, 2, 1, 2], to: 'world', loc: 'mt_nibel_w' },
    ],
    items: [{ at: [10, 13], materia: 'all', id: 'mtnibel_all' }],
    chests: [{ at: [22, 13], item: 'powersoul', id: 'mtnibel_powersoul' }],
    npcs: [
      { id: 'keeper', name: 'Materia Keeper', model: { enemy: 'materia_keeper' }, at: [16, 3], dir: 'down',
        show: s => !s.flag('c7_keeper_dead'),
        talk: function* (s) { yield* FF7.story.c7_materiaKeeper(s); } },
    ],
    objects: [pipe(1), pipe(2), pipe(3), pipe(4), pipe(5)],
    triggers: [
      { id: 'keeper', at: [14, 1, 5, 5], once: true, if: s => !s.flag('c7_keeper_dead'),
        run: function* (s) { yield* FF7.story.c7_materiaKeeper(s); } },
      { at: [31, 15, 1, 1], on: 'talk', if: s => s.flag('c7_nibel_ladder'), run: function* (s) { yield* ladder(s, false); } },
      { at: [31, 14, 1, 1], if: s => !s.flag('c7_nibel_ladder'), run: function* (s) { yield* ladder(s, false); } },
      { at: [31, 16, 1, 1], if: s => !s.flag('c7_nibel_ladder'), run: function* (s) { yield* ladder(s, true); } },
      { at: [9, 15, 5, 1], on: 'talk', run: function* (s) { yield* ledgeJump(s, 11); } },
      { at: [19, 15, 5, 1], on: 'talk', run: function* (s) { yield* ledgeJump(s, 21); } },
      { id: 'see_keeper', at: [20, 7, 3, 2], once: true, if: s => !s.flag('c7_keeper_dead'),
        run: function* (s) {
          yield s.cam(16, 3, 40);
          yield s.emote('keeper', '!');
          yield s.say('cloud', "(Something huge up on that ridge... It's guarding the way west.)");
          yield chime(s, [['redxiii', "That creature has made its nest in the Mako. We will have to get past it sooner or later."],
            ['barret', "Whoa, look at the size of that thing! ...Let's not go pokin' it just yet."]]);
          s.camFollow();
        } },
    ],
    onLoad: function (s) { if (!s.flag('c7_nibel_ladder')) s.block(31, 15); },
  });

  FF7.story.c7_materiaKeeper = function* (s) {
    s.set('trig_mtnibel_pipes_keeper');
    yield s.face('player', 'keeper');
    s.sfx('howl');
    s.shake(4, 30);
    yield s.emote('keeper', '!!');
    yield s.say('cloud', "It's coming!");
    yield s.battle({ table: 'boss_materia_keeper', bg: BG, music: 'boss', noEscape: true });
    s.set('c7_keeper_dead');
    s.remove('keeper');
    yield s.msg('Something glints in the nest where the Materia Keeper stood...');
    yield s.giveMateria('counter_attack');
    yield chime(s, [['tifa', "The path west is open now. Past this ridge, the mountain goes down toward the coast."],
      ['redxiii', "The way down to the western lowlands lies ahead."]]);
  };

  // ---- the western base: where the bridge dropped everyone five years ago
  FF7.defineMap('mtnibel_base', {
    name: 'Mt. Nibel', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    look: NIBEL_MT,
    battle: { table: 'mt_nibel_path', bg: BG },
    grid: [
      "RRRRRRRRRRRRRR:::RRRRRRRRRRRRR",
      "R.....R.......:::.......R....R",
      "R.............:::............R",
      "R...%.........:::......R.....R",
      "R.............:::............R",
      "RRRRRRRRRRRR..:::..RRRRRRRRRRR",
      "           R^^^^^^^R          ",
      "           R^^^^^^^R          ",
      "R............................R",
      "R....R.................%.....R",
      ":............................R",
      ":......R.....................R",
      "R............................R",
      "R...R.............R..........R",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    ],
    heights: [
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "000000000004222222240000000000",
      "000000000004222222240000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_pipes: [15, 1, 'down'], from_cave: [1, 10, 'right'] },
    exits: [
      { at: [14, 0, 3, 1], to: 'mtnibel_pipes', entry: 'from_base' },
      { at: [0, 10, 1, 2], to: 'mtnibel_cave1', entry: 'from_base' },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_nibel_base') || !s.isMember('tifa')) return;
      s.set('c7_nibel_base');
      yield s.wait(20);
      yield s.say('tifa', "This is where we landed when the bridge broke... Right about here.\fThe caves behind us lead to the reactor. It's like a maze in there.");
    },
  });

  // ---- 1st green cavern, south to north (Elixir, reached through the tunnel on the left)
  FF7.defineMap('mtnibel_cave1', {
    name: 'Mt. Nibel Cave', area: 'Mt. Nibel', theme: 'cave', music: 'anxious',
    battle: { table: 'mt_nibel_cave', bg: 'cave' },
    look: Object.assign({}, NIBEL_CAVE, { mako: '#50f090' }),
    lights: [[11, 4, '#60ff90', 4], [24, 4, '#60ff90', 4], [13, 13, '#60ff90', 2]],
    grid: [
      "##############::##############",
      "#######UU....::::....UU#######",
      "#U...U##.........:.......U####",
      "#.....##...**....:......**.###",
      "#.....##..U***...:.....***U###",
      "#U...U##...**.....:.....**.###",
      "##..####..........:.......####",
      "##..#####....U....:...U..#####",
      "##..######........:.....######",
      "##..#######.......:....#######",
      "##..########......::...#######",
      "##..#########......::..#######",
      "##..##########.......::.######",
      "##...........U.........:::::::",
      "##.....................:::::::",
      "##U.....U.....U..........U...#",
      "##############################",
    ],
    entries: { from_base: [28, 13, 'left'], from_ledge: [14, 1, 'down'] },
    exits: [
      { at: [29, 13, 1, 2], to: 'mtnibel_base', entry: 'from_cave' },
      { at: [14, 0, 2, 1], to: 'mtnibel_ledge', entry: 'from_cave1' },
    ],
    chests: [{ at: [2, 3], item: 'elixir', id: 'mtnibel_cave1_elixir' }],
    objects: [
      { at: [12, 3], talk: function* (s) { yield s.msg('Mako seeps up through the rock, glowing a soft green.'); } },
      { at: [13, 13], talk: function* (s) { yield s.msg('A cloudy crystal of condensed Mako. It hums faintly.'); } },
    ],
  });

  // ---- an open ledge between the caverns (Elemental materia)
  FF7.defineMap('mtnibel_ledge', {
    name: 'Mt. Nibel', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    look: NIBEL_MT,
    battle: { table: 'mt_nibel_path', bg: BG },
    grid: [
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "R......R..........R.........RR",
      "R............................R",
      "R..%.......:::::::::::::::::::",
      "R..........:::::::::::::::::::",
      "R.........::...........R.....R",
      "R........::..................R",
      "R.......::.......%...........R",
      "R......::....................R",
      "R.....::.........R...........R",
      "R....::......................R",
      "RRRR::RRRRRRRRRRRRRRRRRRRRRRRR",
    ],
    entries: { from_cave1: [4, 10, 'up'], from_cave2: [28, 3, 'left'] },
    exits: [
      { at: [4, 11, 2, 1], to: 'mtnibel_cave1', entry: 'from_ledge' },
      { at: [29, 3, 1, 2], to: 'mtnibel_cave2', entry: 'from_ledge' },
    ],
    items: [{ at: [25, 7], materia: 'elemental', id: 'mtnibel_elemental' }],
    objects: [
      { at: [7, 1], talk: function* (s) { yield s.msg("Far above the ridge, the Mako reactor's chimney breathes a thin green haze into the sky."); } },
    ],
  });

  // ---- 2nd green cavern, west to east: the Mako fountain (terrain as in fb_cave) — Sniper CR
  FF7.defineMap('mtnibel_cave2', {
    name: 'Mt. Nibel Cave', area: 'Mt. Nibel', theme: 'cave', music: 'anxious',
    battle: { table: 'mt_nibel_cave', bg: 'cave' },
    look: Object.assign({}, NIBEL_CAVE, { mako: '#50f090' }),
    lights: [[24, 5, '#60ff90', 5], [26, 7, '#60ff90', 4], [3, 18, '#60ff90', 2]],
    grid: [
      "####################################",
      "#..........R#######U...........U####",
      "#..U.......R#######......U......::::",
      "#.........::::::::::.............:::",
      "#.........::::::::::...****.......##",
      "#....R....#########..U******U.....##",
      "#.........#########...******......##",
      "###...#############..U.****.U.....##",
      "###...#############...........R...##",
      "###...#############.......::::....##",
      "###...####################::::######",
      "###...####################::::######",
      "###...####################::::######",
      "###...####################::::######",
      "#.......##################::::######",
      "#..R....##################::::######",
      "::::::::::::::::::::::::::::::######",
      "::::::::::::::::::::::::::::::######",
      "#..U....############################",
      "#.......############################",
      "#.U...R.############################",
      "####################################",
    ],
    entries: { from_ledge: [1, 16, 'right'], from_reactor: [33, 3, 'left'] },
    exits: [
      { at: [0, 16, 1, 2], to: 'mtnibel_ledge', entry: 'from_cave2' },
      { at: [35, 2, 1, 2], to: 'mtnibel_reactor', entry: 'from_cave' },
    ],
    chests: [{ at: [2, 19], item: 'sniper_cr', id: 'mtnibel_cave2_sniper' }],
    objects: [
      { at: [24, 4], talk: function* (s) { yield s.msg('Pure Mako wells up from deep inside the mountain. The light is almost too bright to look at.'); } },
      { at: [21, 5], talk: function* (s) { yield s.msg('A crystal of condensed Mako, cloudy and not yet formed.'); } },
    ],
    triggers: [
      { id: 'fountain', at: [19, 1, 2, 9], once: true, run: function* (s) {
        s.set('c7_fountain');
        yield s.cam(24, 5, 40);
        yield s.say('cloud', "(The Mako fountain... Sephiroth stood right here and told us where materia comes from.)");
        yield chime(s, [['tifa', "It's just as beautiful as it was that day. ...It's hard to believe anything bad started here."],
          ['aeris', "It's so bright... The Planet's life, pouring out like water. It feels warm."],
          ['redxiii', "Mako, rising freely from the Planet. This is how it should be — not drained through a pipe."]]);
        s.camFollow();
      } },
    ],
  });

  // ---- the path to the reactor and the reactor exterior (terrain as in fb_reactor_path)
  FF7.defineMap('mtnibel_reactor', {
    name: 'Nibelheim Reactor', area: 'Mt. Nibel', theme: 'mountain', music: 'anxious',
    look: NIBEL_MT,
    battle: { table: 'mt_nibel_reactor', bg: BG },
    lights: [[16, 3, '#60ff90', 4]],
    grid: [
      "##########XXXXXXXXXXXXXX##########",
      "######RRRRPPPPhhhhhhPPPPRRRR######",
      "######....MMPPhhhhhhPPMM....######",
      "######.o..MMPhhhhhhhhPMM..B.######",
      "######....hhhhhh++hhhhhh....######",
      "######............................",
      "######...l..............l.........",
      "######..S.........................",
      "######RR..................RR######",
      "      RR^^RRRRRRRRRRRRRRRRRR      ",
      "      RR^^RRRRRRRRRRRRRRRRRR      ",
      "  ::::::::..................R...  ",
      "  :.......................::....  ",
      "  :....R.........R........::....  ",
      "  ::::::::::::::::::::::::::....  ",
      "  ..............%.........::....  ",
      "  RRRRRRRRRRRRRRRRRRRRRRRR^^RRRR  ",
      "  RRRRRRRRRRRRRRRRRRRRRRRR^^RRRR  ",
      " .........................::..... ",
      " ....R.........%..........::...R. ",
      " :::::::::::::::::::::::::::..... ",
      " ::....     ...........           ",
    ],
    heights: [
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "8888888888888888888888888888888888",
      "6666666666666666666666666666666666",
      "6666666666666666666666666666666666",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "4444444444444444444444444444444444",
      "2222222222222222222222222222222222",
      "2222222222222222222222222222222222",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_cave: [2, 20, 'up'], from_pipes: [32, 6, 'left'] },
    exits: [
      { at: [1, 21, 2, 1], to: 'mtnibel_cave2', entry: 'from_reactor' },
      { at: [33, 5, 1, 3], to: 'mtnibel_pipes', entry: 'from_reactor' },
      { at: [16, 4, 2, 1], run: function* (s) {
        yield s.msg('The reactor door is sealed. A rusted plate reads:\n"NIBELHEIM MAKO REACTOR — OPERATIONS SUSPENDED. AUTHORIZED PERSONNEL ONLY."');
        yield chime(s, [['tifa', "It's locked. ...Good. I never want to go in there again."], ['cloud', "(Sealed. Whatever's left in there, Shinra doesn't want anyone to see it.)"]]);
      } },
    ],
    objects: [
      { at: [7, 3], talk: function* (s) { yield s.msg('A rusted oil drum. Empty.'); } },
      { at: [10, 3], talk: function* (s) { yield s.msg('A pressure regulator. The gauge needle is frozen at zero.'); } },
      { at: [26, 3], talk: function* (s) { yield s.msg('Crates of spare valves, never opened.'); } },
    ],
    triggers: [
      { id: 'reactor', at: [7, 5, 20, 3], once: true, run: function* (s) {
        s.set('c7_reactor_seen');
        yield s.cam(16, 2, 40);
        yield s.say('cloud', "(The Nibelheim reactor. This is where it all started...\fJenova. The pods. Sephiroth's face when he read that name on the door.)");
        yield chime(s, [['tifa', "My father died in there. ...Let's not stay, Cloud."],
          ['barret', "Another Shinra reactor, suckin' the mountain dry. Makes me sick."],
          ['aeris', "Cloud... your face. Are you okay?"]]);
        s.camFollow();
      } },
    ],
  });

  // ================================================================== ROCKET TOWN
  const CID_MUSIC = s => (s.flag('c7_cid_met') && !s.flag('c7_palmer_done')) ? 'cid' : 'oppressed';
  const RT = 'rocket';
  FF7.defineMap('rocket_town', {
    name: 'Rocket Town', area: 'Rocket Town', theme: 'rocket', music: 'oppressed',
    // refs 09-rockettown01, 03, 14, 38, references/rockettown.jpg: timber houses with dark shingle roofs and
    // white picket fences along a dirt road, woods all round, the leaning rocket towering to the north
    look: { floor2: ['#8a7252', '#826a4a'], floor3: ['#c8b894', '#c0b08c'], wallTop: '#3e3632', roof: '#3e3632', trim: '#e6e4da', grass: ['#4e7a34', '#48722e'], window: '#7a8c96' },
    camera: { pitch: 50, dist: 12, yaw: 20 },
    onLoad: function (s) { if (!(s.flag('huge_materia_rocket') || s.flag('huge_materia_done'))) { s.spawn('rt_rocket', { vehicle: 'rocket_26', scale: 0.55 }, 30, 3, 'left'); }
      for (let y = 0; y <= 6; y++) for (let x = 27; x <= 33; x++) s.block(x, y); },
    grid: [
      "TTTTTTRT%TTTTTTRT::::::TRT%TTTTTTRT%TTTT",
      "TT,,,,,,,,,,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,,T,,,,,T,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,T,,,,,,,,T,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,,,,,,,,,,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,,,,T,,,,,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT%TTTT%TT,,,,,,,::::::,,,,,,,,,T%TTT%TT",
      "TTTTTTRT%T,,,,,,,::::::,,,%TTTTTTRT%TTTT",
      "TT,,,,,,,,,,,,,,,::::::,,,,hhhhhhhhhh,TR",
      "RT,,Thhhhhhhh,,,,::::::,,,,whhhhhhhhw,%T",
      "TT,,,whhhhhhw,,,,::::::,,,,hwwhhhwwhh,TT",
      "TT,,,hwhhhwwh,,,,::::::::::::::+,,,,,,TR",
      "RT,,,,,,/,,,,,,,,::::::,,,,,,,,:,,,,,,%T",
      "TT,,,,,,:,,,,,,,,::::::,,,,,,,,:,,,,l,TT",
      "TT,,,,,,::::::::::::::::::::::::,,,,,,TR",
      "RT,T,,,,,,,,,,,,,::::::,,,,,,,,,,,,T,,%T",
      "TThhhhhh,,,,,,,,,::::::,,,,,,,,hhhhhhhTT",
      "TThhhhhw,,,,,,,,,::::::,,,,,,,,whhhhhhTR",
      "RTwhhhwh,=======,::::::,======,hwhhhwh%T",
      "TT,,+,,,,,,,,,,,,::::::,,,,,,,,,,,+,,,TT",
      "TT,,:,,,,,,,,S,,,::::::,,,,,,,,,,,:,,,TR",
      "RT,,:::::::::::::::::::::::::::::::,,,%T",
      "TT,,,,,,,,,,,,,,,::::::,,,,,,,,,,,,,,,TT",
      "TT,,,,hhhhhhhh,,,::::::,,hhhhhhhh,,,,,TR",
      "RT,,,,whhhhhhw,,,::::::,,whhhhhhw,,,,,%T",
      "TT,,,,hwwhhhwh,,,::::::,,hwhhhwwh,,,,,TT",
      "TT,,,,,,,,/,,,,,,::::::,,,,,/,,,,,,,,,TR",
      "RT,,,,,,,,:,,,,,,::::::,,,,,:,,,,,,,,,%T",
      "TT,,,,,,,,::::::::::::::::::::,,,,,,,,TT",
      "TT,,T,,,,,,,,,,,!::::::,,,,,,,,,,,T,,,TR",
      "RT,=============,::::::,=============,%T",
      "TTTTTTRT%TTTTTTRT::::::TRT%TTTTTTRT%TTTT",
      "                 ::::::                 ",
    ],
    legend: { '/': 'doorway' },   // the shops and the inn stand open; the homes keep their wooden doors (+)
    // one-storey timber houses under steep, dark shingle gables with brick chimneys (ref 09-rockettown03);
    // Cid's is the big one at the top of the road, the two by the fences turn their gable ends to the street
    // (white-framed `w` windows placed by hand, so none lands on a door)
    buildings: [
      { at: [27, 9, 10, 3], h: 2.1, col: '#8e8262', roof: '#3c4234', top: 'gable', ridge: 'x', rise: 1.1, chimney: true, win: false },
      { at: [5, 10, 8, 3], h: 1.9, col: '#9a8a66', roof: '#40443a', top: 'gable', ridge: 'x', rise: 0.95, chimney: true, win: false },
      { at: [2, 17, 6, 3], h: 1.9, col: '#86785a', roof: '#3a4034', top: 'gable', ridge: 'z', rise: 1.1, win: false },
      { at: [31, 17, 7, 3], h: 1.9, col: '#8a7c5e', roof: '#3e4436', top: 'gable', ridge: 'z', rise: 1.1, chimney: true, win: false },
      { at: [6, 24, 8, 3], h: 1.9, col: '#7e7258', roof: '#44483c', top: 'gable', ridge: 'x', rise: 0.95, win: false },
      { at: [25, 24, 8, 3], h: 2.1, col: '#8a7250', roof: '#3a3e34', top: 'gable', ridge: 'x', rise: 1.0, chimney: true, win: false },
    ],
    // the inn's round yellow sign by its door (ref 09-rockettown38)
    props: [{ at: [27, 26.56], prop: 'banner', text: 'INN', col: '#e8c040', col2: '#b83020', textCol: '#b02818', w: 1.1, h: 0.44, y: 1.98 }],
    entries: {
      from_world: [19, 31, 'up'], from_pad: [19, 1, 'down'], from_cid: [31, 13, 'down'], from_items: [8, 14, 'down'],
      from_house_w: [4, 21, 'down'], from_house_e: [34, 21, 'down'], from_weapons: [10, 28, 'down'], from_inn: [28, 28, 'down'],
    },
    exits: [
      { at: [17, 33, 6, 1], to: 'world', loc: 'rocket_town' },
      { at: [17, 0, 6, 1], to: 'rocket_pad', entry: 'from_town' },
      { at: [31, 12, 1, 1], to: 'rocket_cid_house', entry: 'from_town', sfx: 'door' },
      { at: [8, 13, 1, 1], to: 'rocket_items', entry: 'from_town', sfx: 'door' },
      { at: [4, 20, 1, 1], to: 'rocket_house_w', entry: 'from_town', sfx: 'door' },
      { at: [34, 20, 1, 1], to: 'rocket_house_e', entry: 'from_town', sfx: 'door' },
      { at: [10, 27, 1, 1], to: 'rocket_weapons', entry: 'from_town', sfx: 'door' },
      { at: [28, 27, 1, 1], to: 'rocket_inn', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'oldman', name: 'Old Man', model: 'oldman2', at: [9, 14], dir: 'up',
        talk: function* (s) { yield* FF7.story.c7_rocketOldman(s); } },
      { id: 'greeter', name: 'Man', model: 'man2', at: [15, 30], dir: 'down',
        talk: function* (s) {
          yield s.say('Man', "Welcome to Rocket Town! That big rocket up the hill is Shinra No. 26.\fThe whole town grew up around the launch site, back when the space program was going strong.");
        } },
      { id: 'woman', name: 'Woman', model: 'woman3', at: [24, 17], dir: 'left', wander: 2,
        talk: function* (s) {
          if (s.flag('c7_palmer_done')) { yield s.say('Woman', "The Captain actually left town! Shera must be... well, I'm sure she's fine. She always is."); return; }
          yield s.say('Woman', "Looking for the Captain? He lives in the big house at the top of town.\fHe was supposed to be the first man in space. He still talks about it... all the time.");
        } },
      { id: 'kid', name: 'Boy', model: 'kid3', at: [26, 23], dir: 'down', wander: 2,
        talk: function* (s) { yield s.say('Boy', "When I grow up, I'm gonna fly No. 26 to the stars!\f...The Captain says it'll never fly again, though. He says it with a real mean face."); } },
      { id: 'worker', name: 'Worker', model: 'worker3', at: [33, 15], dir: 'left',
        talk: function* (s) {
          if (s.flag('disc2')) { yield s.say('Worker', "Folks say Shinra's coming back for the rocket. After all these years... I'll believe it when I see it."); return; }
          yield s.say('Worker', "A fella in a black cape stumbled through here a few days back. Wouldn't say a word. Just kept heading west, toward the coast.");
        } },
      { id: 'man3', name: 'Man', model: 'man5', at: [12, 22], dir: 'up',
        talk: function* (s) { yield s.say('Man', "Shinra shut down the space program years ago. Poured all the money into Mako instead.\fThis town's been waiting ever since. For what, I couldn't tell you anymore."); } },
      // Rufus has come to see Cid (between the tea and the Bronco)
      { id: 'rufus', name: 'Rufus', model: 'rufus', at: [30, 14], dir: 'up', show: s => s.flag('c7_tea') && !s.flag('c7_palmer_done'),
        talk: function* (s) { yield s.say('Rufus', "Hm. You again. I have business with the Captain, not with you. Run along."); } },
      { id: 'cid_rufus', name: 'Cid', model: 'cid', at: [32, 14], dir: 'left', show: s => s.flag('c7_tea') && !s.flag('c7_palmer_done'),
        talk: function* (s) { yield s.say('Cid', "Not now, dammit! I'm talkin' business with the President!"); } },
      { id: 'rt_soldier', name: 'Shinra Soldier', model: 'soldier', at: [28, 15], dir: 'up', show: s => s.flag('c7_tea') && !s.flag('c7_palmer_done'),
        talk: function* (s) { yield s.say('Shinra Soldier', "Stand back. The President is in conference."); } },
    ],
    objects: [
      { at: [16, 30], talk: function* (s) { yield s.msg('"ROCKET TOWN"\nHome of Shinra Rocket No. 26.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_rocket_arrived')) return;
      s.set('c7_rocket_arrived');
      yield s.wait(20);
      yield s.say('cloud', "(A town on the far side of the mountains... and a rocket, up on the hill.)");
      yield chime(s, [['barret', "Rocket Town, huh? Hell of a name. Guess they got a rocket."],
        ['yuffie', "Whoa! A real rocket! Does it fly? Can we ride it!?"],
        ['aeris', "A rocket! I wonder if it ever went up to the stars..."],
        ['redxiii', "A launch site for Shinra's space program. I have read about it. It was abandoned long ago."]]);
    },
  });

  // The old man who watches the rocket (Yoshiyuki on Disc 1)
  FF7.story.c7_rocketOldman = function* (s) {
    if (s.flag('c7_yoshiyuki') || !disc1(s)) {
      yield s.say('Old Man', "She's a beauty, isn't she? I never get tired of looking at her.");
      return;
    }
    const n = s.inc('c7_oldman_talks');
    if (n < 2) {
      yield s.say('Old Man', "......Look at her. Shinra No. 26.\fI've watched that rocket every day since the launch was called off. Every single day.");
      return;
    }
    const c = yield s.ask('Old Man', "You keep coming back, young man. Do you like rockets too? Would you like to look at her with me?", ['Look at the rocket', 'No thanks']);
    if (c !== 0) { yield s.say('Old Man', "Ah... too busy. Young people always are."); return; }
    yield s.face('player', 'up');
    yield s.wait(90);
    yield s.say('Old Man', "......");
    yield s.say('cloud', "......");
    yield s.wait(60);
    yield s.face('oldman', 'player');
    yield s.say('Old Man', "Heh heh... You have the eyes of a dreamer. Here — an old sword I've had lying around.\fIt's said to grow stronger the more your friends fall. Let's hope you never find out.");
    s.set('c7_yoshiyuki');
    yield s.give('yoshiyuki');
    yield s.face('oldman', 'up');
  };

  // ---- the launch pad and the rocket
  FF7.defineMap('rocket_pad', {
    name: 'Rocket Launch Pad', area: 'Rocket Town', theme: 'rocket', music: CID_MUSIC,
    // refs 09-rockettown06, 07: Shinra No. 26 leaning in its gantry, rusty pipework round its base, a
    // steel catwalk and stairs up to the hatch; seen steeply from above
    look: { wall: '#7a6a58', trim: '#6a4a38', floor2: ['#9a968c', '#928e84'], metal: ['#7a5a44', '#72523e'], grass: ['#4e7a34', '#48722e'] },
    camera: { pitch: 60, dist: 12 },
    lights: [[16, 5, '#ffe0a0', 3]],
    onLoad: function (s) {
      if (!(s.flag('huge_materia_rocket') || s.flag('huge_materia_done'))) s.spawn('rocket26', { vehicle: 'rocket_26', scale: 0.5 }, 16, 2, 'down');
      for (let y = 0; y <= 3; y++) for (let x = 12; x <= 20; x++) s.block(x, y);
    },
    grid: [
      "TTTTT%TTTTT,:::::::::,TTTT%TTTTTTT",
      "T,,,,,,,,,,P:::::::::P,,,,,,,,,,,T",
      "T,,MM,,,,,,M:::::::::M,,,,,,,MM,,T",
      "T,,PP,,,,,,P:::::::::P,,,,,,,PP,,T",
      "T,,,,,,,,,,,PPPPzPPPP,,,,,,,,,,,,T",
      "T,,,,,,,,,,,zzzzzzzzzz,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,^,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,..,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,..,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,,^,,,,,,,,,,T",
      "T,,,,,B,,,,,,,,,,,,,,,,,,,,,o,,,,T",
      "T,,MMM,,,,,,,,,,,,,,,,,,,,,,MMM,,T",
      "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,:::::::,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,:::::,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,:::::,,,,,,,,,,,,,,T",
      "T,,BB,,,,,,,,,:::::,,,,,,,,,,oo,,T",
      "TTTTTTTTTTTTTT:::::TTTTTTTTTTTTTTT",
      "              :::::               ",
    ],
    heights: [
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000600000000000000000",
      "0000000000006666666666000000000000",
      "0000000000000000000003000000000000",
      "0000000000000000000003300000000000",
      "0000000000000000000003300000000000",
      "0000000000000000000000100000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_town: [16, 16, 'up'], from_rocket: [16, 5, 'down'] },
    exits: [
      { at: [14, 18, 5, 1], to: 'rocket_town', entry: 'from_pad' },
      { at: [16, 4, 1, 1], to: 'rocket_engine', entry: 'from_pad', sfx: 'door_shinra' },   // the hatch
    ],
    npcs: [
      { id: 'mechanic', name: 'Mechanic', model: 'worker', at: [8, 12], dir: 'right',
        talk: function* (s) {
          if (!s.flag('c7_cid_met')) { yield s.say('Mechanic', "The Captain's inside the rocket, tinkering with the engines again. Go on up the gantry if you want, but don't touch anything.\fAnd watch your language around him. ...Actually, never mind. He'll out-swear you anyway."); return; }
          yield s.say('Mechanic', "Keep her clean, keep her oiled, keep her ready. That's what the Captain always says. Ready for what, though...");
        } },
    ],
    objects: [
      { at: [11, 1], talk: function* (s) { yield s.msg('"SHINRA No. 26"\nThe rocket leans slightly on its gantry, its paint flaking in the wind.'); } },
      { at: [21, 3], talk: function* (s) { yield s.msg('Rivets the size of fists. Someone has polished these recently.'); } },
      { at: [3, 11], talk: function* (s) { yield s.msg('A fuel pump, long disconnected.'); } },
    ],
  });

  FF7.defineMap('rocket_engine', {
    // refs 09-rockettown09, 10, 11: the rocket's long, narrow service corridor seen from the hatch - a
    // grated walkway down the middle, the oxygen tanks (No. 8 among them) lined up along one wall, gauge
    // panels and machinery along the other, pipe runs everywhere, a ladder up toward the cockpit
    name: 'Shinra No. 26', area: 'Rocket Town', theme: 'space', music: CID_MUSIC,
    look: { wall: '#5c6052', trim: '#3a3a2e', wallTex: 'panel', floor: ['#4c4e44', '#46483e'], floorTex: { floor: 'metal' }, metal: ['#7a6a52', '#5e6254'],
      sky: ['#000000', '#000000'], indoor: true, ambient: [0.42, 0.42, 0.34], light: [0.8, 0.76, 0.56], wallH: 2.6 },
    camera: { pitch: 42, dist: 8.5 },
    legend: { T: 'tank', K: 'console' },
    grid: [
      "############",
      "#PPq.HH.qPP#",
      "#T..gggg..K#",
      "#T..gggg..K#",
      "#P..gggg..M#",
      "#T..gggg..K#",
      "#T..gggg..P#",
      "#P..gggg..q#",
      "#....gg....#",
      "#####++#####",
    ],
    props: [
      { at: [1, 2], text: '5', col: '#8a8a78' }, { at: [1, 3], text: '6', col: '#868674' }, { at: [1, 5], text: '7', col: '#8a8a78' }, { at: [1, 6], text: '8', col: '#908c76' },
      { at: [10, 2], rot: -90, style: 'tall', col: '#6a6a5a', col2: '#e0c060' }, { at: [10, 3], rot: -90, col: '#6a6a5a', col2: '#80e080' }, { at: [10, 5], rot: -90, style: 'tall', col: '#6a6a5a', col2: '#e0a040' },
    ],
    lights: [[5, 3, '#ffe0a0', 3], [5, 7, '#ffe0a0', 2.6]],
    entries: { from_pad: [5, 8, 'up'] },
    exits: [{ at: [5, 9, 2, 1], to: 'rocket_pad', entry: 'from_rocket', sfx: 'door_shinra' }],
    npcs: [
      { id: 'cid', name: 'Cid', model: 'cid', at: [9, 3], dir: 'right', anim: 'kneel', show: s => !s.flag('c7_cid_met'),
        talk: function* (s) { yield* FF7.story.c7_cidRocket(s); } },
    ],
    objects: [
      { at: [10, 3], talk: function* (s) { yield s.msg('An engine control panel. Every gauge has a handwritten note taped next to it.'); } },
      { at: [1, 6], talk: function* (s) { yield s.msg('Oxygen tank No. 8. Stamped on the side: "CHECKED. — Shera".'); } },
    ],
    triggers: [
      { id: 'meet_cid', at: [2, 2, 8, 5], once: true, if: s => !s.flag('c7_cid_met'), run: function* (s) { yield* FF7.story.c7_cidRocket(s); } },
    ],
  });

  FF7.story.c7_cidRocket = function* (s) {
    s.set('trig_rocket_engine_meet_cid');
    s.music('cid');
    s.stopAnim('cid');
    yield s.face('cid', 'player');
    yield s.say('Cid', "Hah? Who the hell are you people? Can't ya see I'm workin' here!?");
    yield s.say('cloud', "We came about the plane in your backyard. We need to borrow it.");
    yield s.say('Cid', "The Tiny Bronco!? You got some nerve, kid! That plane ain't goin' anywhere with a bunch of strangers!");
    yield s.say('Cid', "Besides, today's a big day. Shinra's sendin' somebody to talk about restartin' the space program. Finally!\fThis rocket's gonna fly. And I'm gonna be the one flyin' it.");
    yield s.say('Cid', "...Tch. Look, if you came all this way, go on back to my house. Have some tea. I'll be there in a bit.");
    s.set('c7_cid_met');
    yield s.move('cid', [[9, 7], [6, 8]]);
    s.remove('cid');
  };

  // ---- Cid's house: Shera, the tea, Rufus
  FF7.defineMap('rocket_cid_house', {
    name: "Cid's House", area: 'Rocket Town', theme: 'house', music: CID_MUSIC,
    // refs 09-rockettown04, 15: dark timber rooms seen diagonally from above - the table on a green rug,
    // Shera's kitchen behind a partition, the bedroom with two beds off the west side
    look: { floor: ['#6a4a2c', '#624426'], floor3: ['#4a6a3a', '#44643a'], wall: '#8a7458', trim: '#3a2616', wallTop: '#2a2018' },
    camera: { yaw: 35, pitch: 58, dist: 10 },
    grid: [
      "##########++##########",
      "#kk..q.......#.DDDD..#",
      "#....______..#.......#",
      "#...__tttt__.........#",
      "#..._cttttc_.........#",
      "#...__cccc__........F#",
      "#...#..____..........#",
      "#b.b+................#",
      "#b.b#..........B.....#",
      "#j..#...............o#",
      "##########++##########",
    ],
    entries: { from_town: [10, 9, 'up'], from_yard: [10, 1, 'down'] },
    exits: [
      { at: [10, 10, 2, 1], to: 'rocket_town', entry: 'from_cid', sfx: 'door' },
      { at: [10, 0, 2, 1], to: 'rocket_cid_yard', entry: 'from_house', sfx: 'door' },
    ],
    chests: [{ at: [18, 8], item: 'drill_arm', id: 'rocket_cid_drill_arm' }],
    npcs: [
      { id: 'shera', name: 'Shera', model: 'shera', at: [17, 2], dir: 'up',
        talk: function* (s) {
          if (s.flag('c7_palmer_done')) { yield s.say('Shera', "The Captain went with you... I'm glad. He's needed something to fly toward for a long time.\fPlease look after him. He won't look after himself."); return; }
          if (s.flag('c7_tea')) { yield s.say('Shera', "Please, hurry to the backyard! That man Palmer is going for the Tiny Bronco!"); return; }
          if (s.flag('c7_cid_met')) { yield s.say('Shera', "The Captain invited you for tea? Then please, have a seat. It will be ready soon."); return; }
          yield s.say('Shera', "The plane in the backyard? That's the Captain's — the Tiny Bronco.\fIf you'd like to borrow it, you'll have to ask him yourself. He's at the rocket, as always.");
        } },
      { id: 'cid_home', name: 'Cid', model: 'cid', at: [5, 4], dir: 'right', anim: 'sit', show: s => s.flag('c7_cid_met') && !s.flag('c7_tea'),
        talk: function* (s) { yield s.say('Cid', "Siddown already!"); } },
    ],
    objects: [
      { at: [20, 5], talk: function* (s) { yield s.msg('A small fireplace. A kettle hangs over the coals.'); } },
      { at: [1, 1], talk: function* (s) { yield s.msg('Flight manuals, star charts and engine schematics, all dog-eared.'); } },
      { at: [16, 1], talk: function* (s) { yield s.msg('The kitchen counter. Everything is spotless.'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c7_shera_met') && !s.flag('c7_cid_met')) {
        s.set('c7_shera_met');
        yield s.wait(20);
        yield s.face('shera', 'player');
        yield s.say('Shera', "Oh! Visitors? I'm sorry, the Captain isn't home. He's at the rocket.\fIf you've come about something, please... wait for him. He doesn't like being disturbed while he works.");
        yield s.face('shera', 'up');
        return;
      }
      if (s.flag('c7_cid_met') && !s.flag('c7_tea')) yield* FF7.story.c7_tea(s);
    },
  });

  FF7.story.c7_tea = function* (s) {
    s.set('c7_tea');
    s.music('cid');
    yield s.wait(20);
    yield s.say('Cid', "Shera! Where the hell's the tea!?");
    yield s.face('shera', 'cid_home');
    yield s.say('Shera', "It's steeping, Captain. Just a moment.");
    yield s.move('player', 8, 6);
    yield s.face('cid_home', 'player');
    yield s.say('Cid', "What're you standin' around for? Sit your asses down and drink your damn tea!");
    yield s.fadeOut(20);
    s.place('player', 7, 6, 'up');
    yield s.fadeIn(20);
    yield s.say('Cid', "......Name's Cid. Best pilot there ever was. Shinra picked me to be the first man in space.");
    yield s.say('Cid', "Rocket No. 26. Everything was ready. Launch day, countdown goin'... and HER.\fShe was still inside the engine, checkin' some oxygen tank that was perfectly fine!");
    yield s.say('Shera', "......");
    yield s.say('Cid', "If I'd fired those engines, she'd have been cooked. So I hit the abort switch. Launch scrubbed.\fAfter that, Shinra lost interest. Took the money, put it all into their damn Mako reactors. My dream went up in smoke... 'cause of her.");
    yield s.say('Shera', "......I'm sorry, Captain.");
    yield s.say('Cid', "Tch. Save it.\fBut today's different! The President himself is comin' to talk about restartin' the program. They finally came to their senses!");
    s.sfx('helicopter');
    yield s.wait(60);
    yield s.say('Voice', "Captain! It's the President!");
    yield s.emote('cid_home', '!');
    yield s.say('Cid', "That's him! Hah! About damn time!");
    s.stopAnim('cid_home');
    yield s.move('cid_home', [[5, 6], [10, 6], [10, 9]], { run: true });
    s.remove('cid_home');
    s.music('oppressed');
    yield s.move('shera', 14, 5);
    yield s.face('shera', 'player');
    yield s.say('Shera', "......Cloud. I heard the soldiers outside. They aren't here to restart anything.\fThey want the Tiny Bronco — to chase someone. And a man named Palmer has gone around to the backyard.");
    yield s.say('Shera', "That plane is all the Captain has left of his dream. Please... don't let them take it.");
  };

  // ---- the backyard: the Tiny Bronco, Palmer
  FF7.defineMap('rocket_cid_yard', {
    name: "Cid's Backyard", area: 'Rocket Town', theme: 'rocket', music: s => s.flag('c7_tea') && !s.flag('c7_palmer_done') ? 'bronco' : 'oppressed',
    // refs 09-rockettown05, 08, 39, 40: the Tiny Bronco parked on the grass inside a white picket fence; a dirt lane
    // runs off east from the gap in the fence (the Shinra truck backs in along it after the fight with Palmer)
    look: { trim: '#e6e4da', floor3: ['#c8b894', '#c0b08c'], wallTop: '#3e3632', roof: '#3e3632', grass: ['#4e7a34', '#48722e'] },
    camera: { pitch: 55, dist: 11, yaw: 30 },
    onLoad: function (s) {
      if (s.flag('c7_palmer_done')) return;
      // the Tiny Bronco (a twin-boom plane): nose north over the fence, wing along row 2, tail plane on row 7
      s.spawn('bronco', { vehicle: 'tiny_bronco', scale: 0.38 }, 14, 2, 'up');
      for (let x = 9; x <= 20; x++) s.block(x, 2);
      for (let y = 3; y <= 6; y++) { s.block(13, y); s.block(16, y); }
      for (let x = 12; x <= 17; x++) s.block(x, 7);
    },
    grid: [
      "TTT%TT%,%,,%,,,%,,%,,%,%TT%TTT%TT%TT",
      "T============================T,T,,%T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=T%,,T,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=T,,T,,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=TT,,,%T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=T,,%,,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=TT,,T,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=T,%,,,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,=T,,,T,T",
      "T=,,,,,,,,,,,,,,,,,,,,,,,,,,,,ddddd,",
      "T=,B,,,,,,,,,,,,,,,,,,,,,,,o,,ddddd,",
      "T=,,,,,,,,,,,,::,,,,,,,,,,,,=T,,T,,T",
      "hhhhhhhhhhhhhh++hhhhhhhhhhhhhhTTTTTT",
    ],
    entries: { from_house: [14, 11, 'up'] },
    exits: [{ at: [14, 12, 2, 1], to: 'rocket_cid_house', entry: 'from_yard', sfx: 'door' }],
    npcs: [
      { id: 'palmer', name: 'Palmer', model: 'palmer', at: [18, 9], dir: 'left', show: s => s.flag('c7_tea') && !s.flag('c7_palmer_done'),
        talk: function* (s) { yield* FF7.story.c7_palmer(s); } },
    ],
    objects: [
      { at: [14, 2], talk: function* (s) { yield* bronco(s); } }, { at: [15, 2], talk: function* (s) { yield* bronco(s); } },
      { at: [9, 2], talk: function* (s) { yield* bronco(s); } }, { at: [20, 2], talk: function* (s) { yield* bronco(s); } },
      { at: [12, 7], talk: function* (s) { yield* bronco(s); } }, { at: [17, 7], talk: function* (s) { yield* bronco(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_tea') && !s.flag('c7_palmer_done')) { s.set('c7_bronco_seen'); yield* FF7.story.c7_palmer(s); return; }
      if (s.flag('c7_bronco_seen') || s.flag('c7_palmer_done')) return;
      s.set('c7_bronco_seen');
      yield s.wait(20);
      yield s.cam(14, 5, 40);
      yield s.say('cloud', "(A plane... and it looks like it still flies.)");
      yield chime(s, [['barret', "Now THAT'S what I'm talkin' about! With this baby, we could cross the ocean!"],
        ['aeris', "A little airplane! It's so cute!"], ['caitsith', "Ooh, a plane! This'd get us anywhere!"]]);
      s.camFollow();
      if (!s.flag('c7_cid_met')) {
        s.spawn('shera_y', 'shera', 14, 11, 'up', { name: 'Shera' });
        yield s.move('shera_y', 14, 10);
        yield s.say('Shera', "That's the Captain's plane, the Tiny Bronco. Please don't touch it.\fIf you want to borrow it, you'll have to ask him. He's working on the rocket.");
        yield s.move('shera_y', 14, 11);
        s.remove('shera_y');
      }
    },
  });
  function* bronco(s) {
    if (s.flag('c7_palmer_done')) { yield s.msg('Only oil stains on the grass mark where the Tiny Bronco used to sit.'); return; }
    yield s.msg('The Tiny Bronco. A small propeller plane, lovingly patched and painted.');
  }

  FF7.story.c7_palmer = function* (s) {
    s.music('bronco');
    yield s.face('palmer', 'player');
    yield s.say('Palmer', "Uhh... hee hee! So this is the plane, huh? Rufus wants it, so Palmer's gonna take it!\fYou're gonna chase Sephiroth all the way to the... uh... the thingy. With this!");
    yield s.say('cloud', "Get away from that plane.");
    yield s.say('Palmer', "Uh-oh... You're those AVALANCHE guys! I'll... I'll get the President! No, wait! Palmer can handle you himself! Hee hee hee!");
    yield s.battle({ table: 'boss_palmer', bg: RT, music: 'boss', noEscape: true });
    s.music('bronco');
    s.set('c7_palmer_done');
    s.place('palmer', 18, 9, 'left');
    s.anim('palmer', 'hurt');
    yield s.say('Palmer', "Uwaaah! That hurt! I'm outta here!");
    s.stopAnim('palmer');
    // he bolts for the gap in the east fence... just as a Shinra truck backs into the yard through it
    s.spawn('truck', { vehicle: 'truck', scale: 0.45 }, 33.5, 9.5, 'right', { name: 'Shinra truck', solid: false });
    s.cam(26, 9, 30);
    s.run('palmer', [[22, 9], [27.1, 9]], { noWait: true });
    s.move('truck', 29.4, 9.5, { reverse: true, speed: 0.034, noWait: true });
    for (let i = 0; i < 60; i++) { if (i % 16 === 4) s.sfx('beep'); yield 1; }
    yield s.move('palmer', 27.1, 9, { run: true });
    s.sfx('crit'); s.shake(6, 20);
    yield s.flash('#ffffff', 6);
    s.anim('palmer', 'hurt');
    const fly = s.jump('palmer', 21.5, 9.6, 1.4, 34);
    s.face('palmer', 'right');
    yield fly;
    s.anim('palmer', 'dead');
    s.sfx('hit'); s.shake(3, 10);
    yield s.say('Palmer', "UGH!!");
    yield s.wait(30);
    s.camFollow();
    s.spawn('cid_y', 'cid', 14, 11, 'up', { name: 'Cid' });
    yield s.run('cid_y', 14, 9);
    yield s.face('cid_y', 'player');
    yield s.say('Cid', "What the hell's goin' on out here!? That lard-bucket was messin' with my Bronco!\fAnd you — the President said no space program. Not now, not ever. They want my plane for some damn chase!");
    yield s.say('cloud', "They're not getting it. We're taking it.");
    yield s.say('Cid', "YOU'RE takin' it!? Like hell! ...Nobody flies my Bronco but me.\fGet in! All of ya! We're gettin' outta here!");
    yield s.fadeOut(30);
    s.remove('cid_y'); s.remove('truck'); s.remove('palmer');
    // the Tiny Bronco takes off under fire, loses its tail and comes down in the sea (js/gfx/cinema.js)
    yield s.movie('bronco_escape', { stayBlack: true });
    s.music('cid');
    yield s.say('Cid', "Damn it! They got the tail! She ain't gonna fly again, not like this.");
    yield s.say('cloud', "......It's floating.");
    yield s.say('Cid', "Heh... yeah. She floats. She'll get us across the shallows like a boat, anyway.\fTch. Guess I can't go back now. Not after that.");
    yield s.say('Cid', "Rufus let somethin' slip, y'know. He's after Sephiroth too — said Sephiroth's lookin' for some temple. The Temple of the Ancients.\fSo you're goin' after that guy? ...Fine. I'm sick of that town anyway. I'm comin' with you.");
    s.join('cid');
    yield s.nameEntry('cid');
    s.set('cid_joined');
    yield s.msg(`${s.name('cid')} joined the party.`);
    yield chime(s, [['barret', "Hell yeah! Welcome aboard, old man!"], ['aeris', "Welcome! We're glad to have you, Cid."], ['tifa', "Welcome aboard, Cid."]]);
    yield s.say('Cid', "Just don't expect me to be polite about it.");
    s.phs(true);
    yield s.choosePArty(['cloud']);
    s.set('has_bronco');
    yield s.world({ x: 102, y: 139, vehicle: 'bronco' });
  };

  // ---- the other houses
  FF7.defineMap('rocket_inn', {
    name: 'Rocket Town Inn', area: 'Rocket Town', theme: 'house', music: 'oppressed',
    // ref 09-rockettown02: the inn is a warm little bar seen diagonally from above - a long counter with
    // stools, round tables with chairs, a green neon sign over the bar; the bedroom through the west door
    look: { floor: ['#7a5a36', '#72522e'], wall: '#8a7050', trim: '#4a3020', wallTop: '#2a2018', ambient: [0.5, 0.44, 0.34], light: [0.9, 0.78, 0.55] },
    camera: { yaw: 40, pitch: 58, dist: 9.5 },
    grid: [
      "#############NN#######",
      "#b.b.b.#.....q..kk...#",
      "#b.b.b.#.............#",
      "#......+..cDDDDDDc...#",
      "#......#.............#",
      "#j.....#.c.......c...#",
      "#......#ctc.....ctc..#",
      "#......#.c.......c.o.#",
      "##########++##########",
    ],
    lights: [[9, 6, '#ffd070', 2], [17, 6, '#ffd070', 2], [13, 1, '#80ff90', 2]],
    entries: { from_town: [10, 7, 'up'] },
    exits: [{ at: [10, 8, 2, 1], to: 'rocket_town', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman6', at: [14, 2], dir: 'down',
        talk: function* (s) { yield s.inn(100, { who: 'Innkeeper', text: "Welcome to Rocket Town! A room is 100 gil. Will you be staying?" }); } },
      { id: 'guest', name: 'Traveler', model: 'man7', at: [9, 5], dir: 'down', anim: 'sit',
        talk: function* (s) { yield s.say('Traveler', "Came all this way to see a rocket launch. Turns out it's been 'postponed' for years. Nice inn, though."); } },
    ],
    triggers: [counter([11, 3, 6, 1], function* (s) { yield s.inn(100, { who: 'Innkeeper', text: "Welcome to Rocket Town! A room is 100 gil. Will you be staying?" }); })],
  });

  const weaponShop = function* (s) {
    yield s.say('Shopkeeper', "Welcome! We don't get many adventurers. Take your time.");
    yield s.shop(s.flag('disc2') ? 'rocket_town_weapons_d2' : 'rocket_town_weapons');
  };
  FF7.defineMap('rocket_weapons', {
    name: 'Rocket Town Weapon Shop', area: 'Rocket Town', theme: 'house', music: 'oppressed',
    grid: [
      "######################",
      "#q.kk........#......B#",
      "#............#.......#",
      "#.....DDDD...+.......#",
      "#..B.........#.......#",
      "#o...........#.....o.#",
      "#............#.......#",
      "##########++##########",
    ],
    entries: { from_town: [10, 6, 'up'] },
    exits: [{ at: [10, 7, 2, 1], to: 'rocket_town', entry: 'from_weapons', sfx: 'door' }],
    chests: [{ at: [17, 2], item: 'fourth_bracelet', id: 'rocket_weapons_fourth', if: s => s.flag('has_highwind') }],
    npcs: [{ id: 'shopkeeper', name: 'Shopkeeper', model: 'man8', at: [7, 2], dir: 'down', talk: weaponShop }],
    triggers: [counter([6, 3, 4, 1], weaponShop)],
  });

  const itemShop = function* (s) {
    const c = yield s.ask('Shopkeeper', "Hello there! Items or materia?", ['Items', 'Materia', 'Nothing']);
    if (c === 0) yield s.shop(s.flag('disc2') ? 'rocket_town_items_d2' : 'rocket_town_items');
    else if (c === 1) yield s.shop(s.flag('disc2') ? 'rocket_town_materia_d2' : 'rocket_town_materia');
  };
  FF7.defineMap('rocket_items', {
    name: 'Rocket Town Item Shop', area: 'Rocket Town', theme: 'house', music: 'oppressed',
    grid: [
      "######################",
      "#......#q.......kk...#",
      "#......#.............#",
      "#......+...DDDD......#",
      "#......#.............#",
      "#B.....#.o.........j.#",
      "#......#.............#",
      "##########++##########",
    ],
    entries: { from_town: [10, 6, 'up'] },
    exits: [{ at: [10, 7, 2, 1], to: 'rocket_town', entry: 'from_items', sfx: 'door' }],
    chests: [{ at: [3, 2], item: 'guard_source', id: 'rocket_items_guard_source', if: s => s.flag('has_highwind') }],
    npcs: [
      { id: 'shopkeeper', name: 'Shopkeeper', model: 'woman7', at: [12, 2], dir: 'down', talk: itemShop },
      { id: 'grandkid', name: 'Girl', model: 'girl2', at: [14, 5], dir: 'left',
        talk: function* (s) { yield s.say('Girl', "Grandpa's outside looking at the rocket again. He does that all day. He says it's his job."); } },
    ],
    triggers: [counter([11, 3, 4, 1], itemShop)],
  });

  FF7.defineMap('rocket_house_w', {
    name: 'Rocket Town', area: 'Rocket Town', theme: 'house', music: 'oppressed',
    grid: [
      "################",
      "#kk...q....b.b.#",
      "#...........b..#",
      "#..ctc.........#",
      "#..............#",
      "#..............#",
      "#j...........o.#",
      "######++########",
    ],
    entries: { from_town: [6, 6, 'up'] },
    exits: [{ at: [6, 7, 2, 1], to: 'rocket_town', entry: 'from_house_w', sfx: 'door' }],
    npcs: [
      { id: 'mom', name: 'Woman', model: 'woman8', at: [4, 2], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "The Captain? He's rough as sandpaper and swears like a sailor... but he's never once let this town down.\fShera takes care of him. Not that he ever says thank you."); } },
      { id: 'dad', name: 'Man', model: 'man9', at: [9, 4], dir: 'left',
        talk: function* (s) { yield s.say('Man', "Used to work on the launch crew. Now I fix tractors. Funny how life goes."); } },
    ],
  });

  FF7.defineMap('rocket_house_e', {
    name: 'Rocket Town', area: 'Rocket Town', theme: 'house', music: 'oppressed',
    grid: [
      "####################",
      "#b.b..#.......kk..q#",
      "#b.b..#............#",
      "#.....+............#",
      "#.....#...ctc......#",
      "#j....#............#",
      "#.....#..........o.#",
      "#########++#########",
    ],
    entries: { from_town: [9, 6, 'up'] },
    exits: [{ at: [9, 7, 2, 1], to: 'rocket_town', entry: 'from_house_e', sfx: 'door' }],
    chests: [{ at: [2, 5], item: 'power_source', id: 'rocket_house_e_power' }],
    npcs: [
      { id: 'resident', name: 'Old Woman', model: 'oldwoman2', at: [13, 3], dir: 'down',
        talk: function* (s) { yield s.say('Old Woman', "My husband helped build No. 26, you know. He said she'd reach the stars one day.\fI'm still waiting to find out if he was right."); } },
    ],
  });
})();

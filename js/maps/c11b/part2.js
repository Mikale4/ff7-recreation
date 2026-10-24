// Chapter 11b, part 2 — the Northern Cave (Disc 3 final dungeon).
// Crater floor (landing, the way back to the Highwind) → the descent (Save Crystal) → the upper
// cliffs → the maze → the Dividing Point, where the members outside the active party take the other
// ways down. Left: the graveyard path (spiral, the great skeleton). Right: the grassy slope → the
// second fork: lower = Mako falls + floating rocks (Mega-All), upper = the swamp + the Counter room.
// All paths meet at the bottom, where the others hand over what they found; then the party is
// chosen and jumps down toward the Planet's core (part 3).
// Save Crystal: usable once, at one of four crystal clusters (maze, second fork, skeleton, bottom).
// Shared flags: final_dungeon. Flags: c11b_*. Vars: c11b_route_<id> (1 left, 2 right/upper, 3 right/lower).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  // (+ the Turks when they have joined: Config > Turks Join, js/maps/extra/turks.js)
  const CREW = ['barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'reno', 'rude', 'elena'];
  const others = s => CREW.filter(id => s.isMember(id) && !s.inParty(id));
  // first line whose speaker is in the active party
  function* remark(s, lines) { for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return; } }
  // one-way hops between ledges (FF7 "jump down"/"jump up" spots); _to is read by our layout checker
  const hop = (at, to, h = 0.8) => ({ at, _to: to, run: function* (s) { yield s.jump('player', to[0], to[1], h, 26); } });
  // FF7: Cloud splashes straight through the shallow swamp water
  const wade = (at, to) => ({ at, _to: to, run: function* (s) { s.sfx('run'); yield s.run('player', to[0], to[1]); } });
  const CAVE = { table: null, bg: 'crater', rate: 1 };
  // the Northern Cave: terraced green-grey rock and moss (refs 18-final13, 14); the deeper paths turn organic
  const NCAVE = { floor: ['#5a665c', '#546056'], floor2: ['#6a7462', '#646e5c'], wall: '#46564c', trim: '#26302a', wallTop: '#34443a', grass: ['#4a6a48', '#446444'],
    mako: '#60f0b0', sky: ['#040a08', '#16302a'], fog: { color: [0.08, 0.14, 0.12], near: 8, far: 22 }, ambient: [0.38, 0.44, 0.4], light: [0.7, 0.8, 0.72] };
  const NCAVE_DEEP = Object.assign({}, NCAVE, { floor: ['#5a4e4c', '#544846'], wall: '#5a4644', wallTop: '#3a2e2c', trim: '#2a1e1c' });
  const enc = (table, rate = 1) => Object.assign({}, CAVE, { table, rate });

  // ------------------------------------------------------------------ Save Crystal
  // FF7: the Save Crystal creates one save point anywhere in the crater. Here it resonates with one
  // of four crystal clusters; the chosen one becomes a save point for good.
  const crystalSpot = (key) => function* (s) {
    const f = 'c11b_crystal_' + key;
    if (s.flag(f)) { yield s.save(); return; }
    if (s.flag('c11b_crystal_used')) { yield s.msg('A cluster of pale crystal. It hums faintly, and nothing more.'); return; }
    if (!s.has('save_crystal')) { yield s.msg('A cluster of pale crystal hums softly here...\nas if it were waiting for something.'); return; }
    const c = yield s.ask(null, 'The Save Crystal resonates with the crystal cluster.\nCreate a save point here? (This can only be done once.)', ['Create it here', 'Not here']);
    if (c !== 0) return;
    s.take('save_crystal');
    s.set(f); s.set('c11b_crystal_used');
    s.sfx('save');
    yield s.flash('#b0ffe8', 24);
    yield s.msg('The crystal flares with light and becomes a save point!');
    yield s.save();
  };

  // ------------------------------------------------------------------ world link
  FF7.world.link('northern_crater', { map: 'cave_entrance', entry: 'from_world', if: s => s.flag('disc3'), priority: 10 });

  // ------------------------------------------------------------------ crater floor
  function* enterCrater(s) {
    const c = yield s.ask(null, 'A yawning hole drops into the depths of the crater.\nGo down?', ['Go down', 'Not yet']);
    if (c !== 0) return;
    yield s.move('player', 5, 8);
    yield s.face('player', 'up');
    yield s.jump('player', 5, 5, 1.2, 30);
    s.hide('player');
    s.sfx('falling');
    yield s.fadeOut(30);
    yield s.goto('cave_descent', 'from_top');
  }
  FF7.defineMap('cave_entrance', {
    name: 'Northern Crater', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: Object.assign({}, NCAVE, { sky: ['#0a0406', '#3a1410'] }),
    grid: [
      "##############################",
      "#UU.......R............Bo.....",
      "#.........R......R............",
      "#..  *  ..R..................#",
      "#.. *** ..RRRRRRRRRRRRHRRRRRR#",
      "#..*****..R.................U#",
      "#.. *** ..R.R............R...#",
      "#..  *  ..R..................#",
      "#.........RRRR^^RRRRRRRRRRRRR#",
      "#............................#",
      "#...................R........#",
      "#.......x....................#",
      "#R........................R..#",
      "#........U..................U#",
      "##############################",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000006666666666666666666",
      "000000000006666666666666666666",
      "000000000006666666666666666660",
      "000000000006666666666646666660",
      "000000000003333333333333333330",
      "000000000003333333333333333330",
      "000000000003333333333333333330",
      "000000000003331133333333333330",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    lights: [[5, 5, '#60ffb0', 4], [26, 2, '#ffd8a0', 3], [1, 1, '#a0c0ff', 2]],
    entries: { from_world: [27, 2, 'left'], from_crater: [5, 10, 'down'] },
    exits: [
      { at: [29, 1, 1, 2], run: function* (s) {
          const c = yield s.ask(null, 'Go back to the Highwind?', ['Back to the ship', 'Stay']);
          if (c !== 0) return;
          s.phs(true);
          yield s.world({ resume: true });
        } },
    ],
    triggers: [
      { at: [4, 8, 3, 1], run: enterCrater },
      { at: [3, 3, 5, 5], on: 'talk', run: enterCrater },
    ],
    objects: [
      { at: [23, 1], talk: function* (s) { yield s.msg("A Shinra supply crate, half buried in grit. The stencil on the lid reads:\n'PROPERTY OF THE SCIENCE DEPT. — REUNION OBSERVATION.'\nHojo's people were here before, when the Weapons woke."); } },
      { at: [8, 11], talk: function* (s) { yield s.msg("A black cloak, torn and empty, snagged on the rocks.\nOne of the cloaked men who dragged themselves all this way for the 'Reunion'.\nNothing is left of the one who wore it."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_crater_landed')) return;
      s.set('c11b_crater_landed');
      s.set('final_dungeon');
      yield s.caption('The Highwind drops through the churning clouds\nand sets down on the floor of the Northern Crater.', { hold: 170, bg: 'rgba(0,0,0,0.85)' });
      yield s.say('cloud', "......This is it. Sephiroth is somewhere below us.");
      yield* remark(s, [
        ['tifa', "It's so quiet... like the whole Planet is holding its breath."],
        ['barret', "So this is his hole, huh? Let's go drag him outta there!"],
        ['redxiii', "I can feel it... the Planet's pain. It is strongest here, where the wound is deepest."],
        ['cid', "Heh. Landin' in a crater. Not a scratch on her, either."],
        ['yuffie', "Brrr! Creepy AND freezing. Can we hurry up and get this over with?"],
        ['vincent', "...The very air is thick with Jenova."],
        ['caitsith', "My fortune for today says... Nope! Not tellin'."],
      ]);
      yield s.say('cloud', "The way down is past those rocks. If we need to, we can always climb back up to the ship.");
    },
  });

  // ------------------------------------------------------------------ the descent (screens 1-2)
  FF7.defineMap('cave_descent', {
    name: 'Northern Cave', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_upper'),
    grid: [
      "######++######################",
      "#U..........................U#",
      "#...........R........x.......#",
      "#............................#",
      "#RRRRRRRRRRRRRRRRRRRRRRR^^RRR#",
      "#U.........................  #",
      "#..............x....R......  #",
      "#..........................  #",
      "#RR^^RRRRRRRRRRRRRRRRRRRRRR  #",
      "#..........................  #",
      "#.......R.......R..........  #",
      "#..........................  #",
      "#RRRRRRRRRRRRRRRRRRRRRRR^^RRR#",
      "#U...........................#",
      "#.................R........R.#",
      "#............................#",
      "##...#########################",
    ],
    heights: [
      "000000990000000000000000000000",
      "099999999999999999999999999990",
      "099999999999999999999999999990",
      "099999999999999999999999999990",
      "099999999999999999999999779990",
      "066666666666666666666666666000",
      "066666666666666666666666666000",
      "066666666666666666666666666000",
      "066446666666666666666666666000",
      "033333333333333333333333333000",
      "033333333333333333333333333000",
      "033333333333333333333333333000",
      "033333333333333333333333113330",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    lights: [[1, 1, '#a0e0ff', 3], [28, 1, '#a0e0ff', 3], [27, 8, '#60ffb0', 5]],
    entries: { from_top: [14, 2, 'down'], from_cliffs: [3, 15, 'up'] },
    exits: [
      { at: [6, 0, 2, 1], to: 'cave_entrance', entry: 'from_crater' },
      { at: [2, 16, 3, 1], to: 'cave_cliffs', entry: 'from_descent' },
    ],
    chests: [
      { at: [10, 1], item: 'save_crystal', id: 'cave_descent_save_crystal' },
      { at: [1, 10], item: 'guard_source', id: 'cave_descent_guard_source' },
    ],
    objects: [
      { at: [15, 6], talk: function* (s) { yield s.msg("Another black cloak lies crumpled on the path, stiff with frost.\nThe number tattooed on the arm that wore it... has long since rotted away."); } },
      { at: [21, 2], talk: function* (s) { yield s.msg("Abandoned expedition gear: a snapped tent pole and a cracked specimen case.\nThe label on the case reads 'J-cells — HOJO'. It's empty."); } },
      { at: [6, 0], talk: function* (s) { yield s.msg('The cave mouth leads back up to the crater floor, where the Highwind is waiting.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_descent_seen')) return;
      s.set('c11b_descent_seen');
      yield 20;
      s.sfx('falling'); s.shake(5, 80);
      yield 50;
      yield* remark(s, [
        ['barret', "Whoa! Rocks are comin' down all over! This whole place is fallin' apart!"],
        ['cid', "Watch yer heads! Damn rock slides..."],
        ['tifa', "Careful! The rocks...!"],
        ['yuffie', "Eek! Is the crater collapsing?!"],
        ['redxiii', "The ground trembles... The Planet itself is restless."],
        ['vincent', "...Stay alert."],
        ['caitsith', "Yikes! Let's not hang around here too long!"],
      ]);
      yield s.say('cloud', "(If the ship's ever needed... that cave mouth leads back up to the crater floor.)");
    },
  });

  // ------------------------------------------------------------------ the upper cliffs (screen 3)
  FF7.defineMap('cave_cliffs', {
    name: 'Northern Cave', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_upper'),
    grid: [
      "###############++###############",
      "#############.......R.........##",
      "#############.......^......R..##",
      "#...................R.........##",
      "#.........RR         ....:....##",
      "#.........RR         CCCCCCCCCC#",
      "#.U.......RR         CCCCCCCCCC#",
      "#RRR^RRRRRRR         CCCCCCCCCC#",
      "# ........RR...................#",
      "# ........RR.B.................#",
      "# ........RR....U..............#",
      "#RRRRR^RRRRR...........R.......#",
      "#  ........R...................#",
      "#  ........^..R................#",
      "#  ...x....R................U..#",
      "#  ........R...................#",
      "###################...##########",
    ],
    heights: [
      "99999999999999999999999999999999",
      "09999999999999999999966666666660",
      "09999999999999999999866666666660",
      "09999999999999999999966666666660",
      "09999999999900000000066666666660",
      "09999999999900000000066666666660",
      "09999999999900000000066666666660",
      "09997999999900000000066666666660",
      "00666666663300000000000000000000",
      "00666666663300000000000000000000",
      "00666666663300000000000000000000",
      "06666646666300000000000000000000",
      "00033333333300000000000000000000",
      "00033333333100000000000000000000",
      "00033333333300000000000000000000",
      "00033333333300000000000000000000",
      "00000000000000000000000000000000",
    ],
    lights: [[16, 10, '#a0e0ff', 3], [28, 14, '#a0e0ff', 3], [11, 3, '#80ff80', 2]],
    entries: { from_descent: [16, 2, 'down'], from_maze: [20, 14, 'up'] },
    exits: [
      { at: [15, 0, 2, 1], to: 'cave_descent', entry: 'from_cliffs' },
      { at: [19, 16, 3, 1], to: 'cave_maze', entry: 'from_cliffs' },
    ],
    chests: [
      { at: [29, 1], item: 'guard_source', id: 'cave_cliffs_guard_source' },
      { at: [30, 9], item: 'mind_source', id: 'cave_cliffs_mind_source' },
      { at: [3, 15], item: 'magic_source', id: 'cave_cliffs_magic_source' },
      { at: [9, 8], item: 'elixir', id: 'cave_cliffs_elixir' },
      { at: [1, 3], item: 'power_source', id: 'cave_cliffs_power_source' },
    ],
    items: [{ at: [11, 3], materia: 'hp_absorb', id: 'cave_cliffs_hp_absorb' }],
    triggers: [hop([25, 4], [25, 8], 1.0)],
    objects: [
      { at: [13, 9], talk: function* (s) { yield s.msg("A Shinra crate, dropped here by the expedition that came with Rufus and Hojo.\nA page of notes is still wedged under the lid, in a cramped, feverish hand:\n'...the cells seek the whole. All of them will come here, to the source.\nThe Reunion cannot be stopped. How marvelous.'"); } },
    ],
  });

  // ------------------------------------------------------------------ the maze (screen 4)
  FF7.defineMap('cave_maze', {
    name: 'Northern Cave', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_mid'),
    grid: [
      "################++################",
      "#             ......             #",
      "#             ......          R###",
      "#            CCCCCCCC         R..#",
      "#            CCCCCCCC         R..#",
      "#   ....R.....................R..#",
      "#   ..............x...........RCC#",
      "#   CCCCCCCCCCCCCCCCCCCCCCCCCC CC#",
      "#                     ...........#",
      "# RRR                 ....R......#",
      "# R:R                 ...........#",
      "# R:R                 CCCCCCCCCCC#",
      "# R:RR......R................U...#",
      "# R:RR......R...R................#",
      "# R:RRRRRR.RR....................#",
      "# R:RR.....................R.....#",
      "# R:RR...R...........U..x........#",
      "# R:::.U.........................#",
      "##################...#############",
    ],
    heights: [
      "9999999999999999999999999999999999",
      "0000000000000099999900000000000000",
      "0000000000000099999900000000006660",
      "0000000000000999999990000000006660",
      "0000000000000999999990000000006660",
      "0000666666666666666666666666666660",
      "0000666666666666666666666666666660",
      "0000666666666666666666666666660660",
      "0000000000000000000000333333333330",
      "0000000000000000000000333333333330",
      "0000000000000000000000333333333330",
      "0000000000000000000000333333333330",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    lights: [[21, 16, '#b0ffe8', 4], [32, 3, '#a0e0ff', 2], [3, 10, '#a0e0ff', 2], [29, 12, '#a0e0ff', 2]],
    entries: { from_cliffs: [16, 2, 'down'], from_divide: [19, 16, 'up'] },
    exits: [
      { at: [16, 0, 2, 1], to: 'cave_cliffs', entry: 'from_maze' },
      { at: [18, 18, 3, 1], to: 'cave_divide', entry: 'from_maze' },
    ],
    chests: [
      { at: [4, 5], item: 'power_source', id: 'cave_maze_power_source' },
      { at: [22, 10], item: 'mind_source', id: 'cave_maze_mind_source' },
      { at: [32, 3], item: 'megalixir', id: 'cave_maze_megalixir' },
      { at: [32, 13], item: 'hero_drink', id: 'cave_maze_hero_drink' },
      { at: [6, 12], item: 'guard_source', id: 'cave_maze_guard_source' },
      { at: [3, 10], item: 'power_source', id: 'cave_maze_power_source2' },
    ],
    triggers: [
      hop([18, 2], [18, 5]),            // top ledge -> middle (small drop)
      hop([15, 5], [15, 2]),            // ...and back up
      hop([29, 6], [29, 9]),            // middle -> right ledge
      hop([26, 8], [26, 6]),            // right ledge -> middle
      hop([31, 8], [31, 5], 1.0),       // right ledge -> the little cave with the Megalixir
      hop([32, 5], [32, 9]),            // ...and down again
      hop([24, 10], [24, 13]),          // right ledge -> lower level
      hop([27, 12], [27, 10], 1.0),     // lower level -> right ledge
    ],
    objects: [{ at: [21, 16], talk: crystalSpot('maze') }],
  });

  // ------------------------------------------------------------------ the Dividing Point
  const SPLIT_LINES = {
    barret: ["The left, huh? Fine by me. Don't you go gettin' killed before I catch up!", "The right it is! See ya at the bottom, and don't keep me waitin'!"],
    tifa: ["The left path... Okay. Be careful, Cloud. I'll see you down there.", "The right path, then. Take care of yourself, okay? Promise me."],
    redxiii: ["I will take the left path. My nose will find the way down.", "The right path. Do not worry, I will not lose my way."],
    yuffie: ["Left! Great. Any materia I find down there is mine, got it?", "Right! And any materia I find is finders-keepers!"],
    caitsith: ["Left it is! Wish me luck — not that a moogle needs it!", "Right-o! See you at the bottom, then!"],
    vincent: ["...The left. Understood.", "...The right. I will be there."],
    cid: ["Left, eh? Heh, I'll beat ya all down there!", "Right it is! Last one to the bottom buys the drinks!"],
    reno: ["Left? Sure thing. Try not to trip on the way down, Spiky.", "Right it is. See ya at the bottom, yo."],
    rude: ["......Left.", "......Right. Understood."],
    elena: ["The left path. Understood! ...I mean, got it!", "The right path! I won't let you down!"],
  };
  const SPLIT_SPOTS = [[10, 3], [12, 4], [19, 4], [21, 3], [14, 5], [17, 5], [8, 2], [13, 2], [18, 2], [11, 5]];
  function* splitScene(s) {
    s.set('c11b_split');
    const crew = others(s);
    crew.forEach((id, i) => s.spawn('ev_' + id, id, SPLIT_SPOTS[i][0], SPLIT_SPOTS[i][1], 'up', { name: s.name(id) }));
    yield s.move('player', 15, 3);
    yield s.face('player', 'down');
    yield s.say('cloud', "The path splits here. Left and right... and both keep going down.");
    yield* remark(s, [
      ['redxiii', "I can smell the Lifestream down both ways. The paths must meet again, far below."],
      ['vincent', "...Both lead to the same place. The source."],
      ['tifa', "Both ways lead down. Should we split up?"],
      ['barret', "Two roads, one hole. We could cover more ground if we split up."],
      ['cid', "Well, whaddaya know. A fork in the road."],
      ['yuffie', "Ugh, which way? Eeny, meeny, miny..."],
      ['caitsith', "Two ways down, eh? Flip a coin?"],
    ]);
    if (!crew.length) { yield s.say('cloud', "Let's pick a way and keep moving."); return; }
    yield s.say('cloud', "We'll split up. Everyone take a path, search it, and meet up again at the very bottom.");
    for (const id of crew) {
      yield s.face('player', 'ev_' + id);
      const c = yield s.ask('cloud', `(Which way should ${s.name(id)} go?)`, ['The left path', 'The right path']);
      // FF7: whoever goes right splits again at the second fork, 50/50 upper or lower
      s.setVar('c11b_route_' + id, c === 0 ? 1 : 2 + s.random(2));
      yield s.say(id, SPLIT_LINES[id][c]);
      const sx = SPLIT_SPOTS[crew.indexOf(id)][0];
      yield s.run('ev_' + id, c === 0 ? [[sx, 2], [7, 2], [6, 3], [1, 3]] : [[sx, 2], [24, 2], [25, 3], [30, 3]]);
      s.remove('ev_' + id);
    }
    yield s.say('cloud', "(And us... Which way do we go?)");
    s.phs(false);   // the others are already on their way down; regroup at the bottom
  }
  FF7.defineMap('cave_divide', {
    name: 'Dividing Point', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_mid', 0.8),
    grid: [
      "###############++###############",
      "#....RU..................UR....#",
      "#....R....................R....#",
      ".....^..R..............R..^.....",
      ".....^....................^.....",
      "#....R....U..........U....R....#",
      "#.R.. CCCCCCCCCCCCCCCCCCCC ....#",
      "#U...                      ...U#",
      " CCCC                      CCCC ",
      "                                ",
      "                                ",
      "                                ",
    ],
    heights: [
      "66666666666666666666666666666666",
      "33333666666666666666666666633333",
      "33333666666666666666666666633333",
      "33333466666666666666666666433333",
      "33333466666666666666666666433333",
      "33333666666666666666666666633333",
      "33333066666666666666666666033333",
      "33333000000000000000000000033333",
      "03333000000000000000000000033330",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    lights: [[15, 3, '#a0e0ff', 5], [2, 4, '#80ffc0', 3], [29, 4, '#80ffc0', 3]],
    entries: { from_maze: [15, 2, 'down'], from_graveyard: [2, 4, 'right'], from_grass: [29, 4, 'left'] },
    exits: [
      { at: [15, 0, 2, 1], to: 'cave_maze', entry: 'from_divide' },
      { at: [0, 3, 1, 2], to: 'cave_graveyard', entry: 'from_divide' },
      { at: [31, 3, 1, 2], to: 'cave_grass', entry: 'from_divide' },
    ],
    objects: [
      { at: [10, 5], talk: function* (s) { yield s.msg('To the left, a path winds down among old bones.\nTo the right, a slope where strange grass grows in the dark.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_split')) return;
      yield* splitScene(s);
    },
  });

  // ------------------------------------------------------------------ left path: the graveyard
  const jenovaFlesh = function* (s) { yield s.msg("Pale, pulsing tissue clings to the bones, spreading like lichen.\nJenova's cells... still alive, still crawling toward the bottom of the crater."); };
  FF7.defineMap('cave_graveyard', {
    name: 'Northern Cave — Left Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    battle: enc('north_cave_graveyard'),
    look: Object.assign({}, NCAVE_DEEP, { floor: ['#4a4450', '#443e4a'], trim: '#241c28' }),
    grid: [
      "##############################",
      "#U............................",
      "#.....x...x....u..............",
      "#.............................",
      "#RR^^RRRRRRRRRRRRRRRRRRRRRRRR#",
      "#U.........................  #",
      "#...........x.....x........  #",
      "#..........................  #",
      "#RRRRRRRRRRRRRRRRRRRRRRRRHR  #",
      "#..........................  #",
      "#.......u...........x......  #",
      "#..........................  #",
      "#RR^^RRRRRRRRRRRRRRRRRRRRRRRR#",
      "#U........................U..#",
      "#......x........u.....x......#",
      "#............................#",
      "########################...###",
    ],
    heights: [
      "000000000000000000000000000000",
      "099999999999999999999999999999",
      "099999999999999999999999999999",
      "099999999999999999999999999999",
      "099779999999999999999999999990",
      "066666666666666666666666666000",
      "066666666666666666666666666000",
      "066666666666666666666666666000",
      "066666666666666666666666646000",
      "033333333333333333333333333000",
      "033333333333333333333333333000",
      "033333333333333333333333333000",
      "033113333333333333333333333330",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    lights: [[1, 1, '#a0e0ff', 2], [1, 13, '#a0e0ff', 2], [20, 10, '#c080ff', 3], [7, 14, '#c080ff', 2]],
    entries: { from_divide: [27, 2, 'left'], from_bones: [25, 14, 'up'] },
    exits: [
      { at: [29, 1, 1, 3], to: 'cave_divide', entry: 'from_graveyard' },
      { at: [24, 16, 3, 1], to: 'cave_bones', entry: 'from_graveyard' },
    ],
    chests: [{ at: [1, 10], item: 'mystile', id: 'cave_graveyard_mystile' }],
    items: [{ at: [14, 10], item: 'elixir', id: 'cave_graveyard_elixir' }],
    objects: [
      { at: [20, 10], talk: jenovaFlesh },
      { at: [15, 2], talk: function* (s) { yield s.msg('A great beast, turned to stone mid-howl. How long has it stood here, guarding nothing?'); } },
      { at: [8, 10], talk: function* (s) { yield s.msg('Bones and more bones. Monsters that came here to die... or were drawn here, like moths to a flame.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_graveyard_seen')) return;
      s.set('c11b_graveyard_seen');
      yield* remark(s, [
        ['yuffie', "B-bones... everywhere. I-I'm not scared! It's just cold, that's all!"],
        ['caitsith', "Brr... A monster graveyard. Not exactly the scenic route, is it?"],
        ['barret', "Damn... Whole lotta things came down here to die."],
        ['redxiii', "Many creatures came here seeking the Lifestream... and never left."],
        ['tifa', "So many bones... Let's keep moving."],
        ['cid', "Feels like a damn graveyard in here."],
        ['vincent', "...Death gathers here."],
      ]);
    },
  });

  FF7.defineMap('cave_bones', {
    name: 'Northern Cave — Left Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    battle: enc('north_cave_graveyard'),
    look: Object.assign({}, NCAVE_DEEP, { floor: ['#4a4450', '#443e4a'], trim: '#241c28' }),
    grid: [
      "###############++###############",
      "              |..|              ",
      "              |..|              ",
      "              |..|              ",
      "              |^^|              ",
      "              |..|              ",
      "              |^^|              ",
      "              |..|              ",
      "              |^^|              ",
      "#U...........u....u...U........#",
      "#.......x......................#",
      "#...................x...........",
      "#...x...........................",
      "#...............................",
      "#.........U...............x....#",
      "#..........x..................U#",
      "################################",
    ],
    heights: [
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000011000000000000000",
      "00000000000000222200000000000000",
      "00000000000000033000000000000000",
      "00000000000000444400000000000000",
      "00000000000000055000000000000000",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
    ],
    lights: [[10, 14, '#b0ffe8', 4], [15, 4, '#e0e0c0', 3], [1, 9, '#a0e0ff', 2], [30, 15, '#a0e0ff', 2]],
    entries: { from_graveyard: [29, 12, 'left'], from_bottom: [15, 2, 'down'] },
    exits: [
      { at: [31, 11, 1, 3], to: 'cave_graveyard', entry: 'from_bones' },
      { at: [15, 0, 2, 1], to: 'cave_bottom', entry: 'from_graveyard' },
    ],
    chests: [
      { at: [29, 10], item: 'tetra_elemental', id: 'cave_bones_tetra_elemental' },
      { at: [5, 10], item: 'speed_source', id: 'cave_bones_speed_source' },
      { at: [1, 14], item: 'megalixir', id: 'cave_bones_megalixir' },
      { at: [24, 14], item: 'megalixir', id: 'cave_bones_megalixir2' },
    ],
    objects: [
      { at: [10, 14], talk: crystalSpot('bones') },
      { at: [20, 11], talk: jenovaFlesh },
      { at: [13, 9], talk: function* (s) { yield s.msg("The skull of something enormous. Its spine stretches away into the dark like a bridge...\nthe only way further down."); } },
    ],
  });

  // ------------------------------------------------------------------ right path: the grassy slope
  FF7.defineMap('cave_grass', {
    name: 'Northern Cave — Right Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    battle: enc('north_cave_grassy'),
    look: Object.assign({}, NCAVE, { grass: ['#3a6a40', '#34643a'] }),
    grid: [
      "################################",
      "#,,,,,,,,,R,,,,,,,,,,R,,,,,,,,,#",
      ",,,,G,,,R,R,,,,,,R,,,R,,,,,,,,,#",
      ",,,,,,,,,,^,,,,,,,,,,R,,,G,,,,,#",
      ",,,f,,,,,,^,,,G,,,,,,R,,,,,,,,,#",
      "#,,,,,,G,,R,,,,,,,,,,R,,,,,,,U,#",
      "#,,,,,,,,,R,,,,,,,,,,^,,,,f,,,,#",
      "#RRRRRRRRRR,,f,,,,,,,^,,,,,,,,,#",
      "#         R,,,,,,,G,,R,,,,,,,,,#",
      "#         R,,,,,,,,,,R,,,,,,G,,#",
      "#RRRRRRRRRRRRRRRRRRRRR,,,,,,,,,#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      "#,,,,G,,,,,,U,,,,,,f,,,,,,,R,,,,",
      "#,R,,,,,,f,,,,,,G,,,,,,,G,,,,,,,",
      "#,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,#",
      "################################",
    ],
    heights: [
      "00000000000000000000000000000000",
      "06666666666333333333330000000000",
      "66666666666333333333330000000000",
      "66666666664333333333330000000000",
      "66666666664333333333330000000000",
      "06666666666333333333330000000000",
      "06666666666333333333310000000000",
      "06666666666333333333310000000000",
      "00000000006333333333330000000000",
      "00000000006333333333330000000000",
      "03333333333333333333330000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    lights: [[29, 5, '#a0e0ff', 3], [12, 12, '#a0e0ff', 3]],
    entries: { from_divide: [2, 3, 'right'], from_fork: [29, 12, 'left'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'cave_divide', entry: 'from_grass' },
      { at: [31, 11, 1, 3], to: 'cave_fork', entry: 'from_grass' },
    ],
    chests: [
      { at: [1, 6], item: 'remedy', id: 'cave_grass_remedy' },
      { at: [15, 1], item: 'elixir', id: 'cave_grass_elixir' },
      { at: [30, 1], item: 'x_potion', id: 'cave_grass_x_potion' },
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_grass_seen')) return;
      s.set('c11b_grass_seen');
      yield* remark(s, [
        ['redxiii', "Grass... this deep underground. The Lifestream must be very close to the surface here."],
        ['tifa', "Grass, down here? The Lifestream must be close."],
        ['cid', "Plants growin' without any sun... Now I've seen everything."],
        ['barret', "Huh. Somethin' actually grows down here."],
        ['yuffie', "Whoa, grass! ...Glowing grass. That's not creepy at all."],
        ['vincent', "...Life, even here."],
        ['caitsith', "Would ya look at that! A little garden in the dark."],
      ]);
    },
  });

  // ------------------------------------------------------------------ right path: the second fork
  FF7.defineMap('cave_fork', {
    name: 'Northern Cave — Right Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_grassy'),
    grid: [
      "##################################",
      "...........................U......",
      "....................R.............",
      "............:.....................",
      " CCCCHCCCCCCCCCCCCCCCCCCCCCCCCCCC ",
      " CCCCHCCCCCCCCCCCCCCCCCCCCCCCCCCC ",
      "    ...........................   ",
      "  U .....R.....................   ",
      "    ............:..............   ",
      "    CCCCCCCCCCCCCCCCCCCCCCCCCCH   ",
      "    CCCCCCCCCCCCCCCCCCCCCCCCCCH   ",
      " WW.............................. ",
      " WW.............................U ",
      " WW.....................R........ ",
      " WW.............................. ",
      " ..................U..........R.. ",
      " **....R......................... ",
      " **............U................. ",
      "######################...#########",
    ],
    heights: [
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "9999999999999999999999999999999999",
      "0999979999999999999999999999999990",
      "0999979999999999999999999999999990",
      "0000555555555555555555555555555000",
      "0000555555555555555555555555555000",
      "0000555555555555555555555555555000",
      "0000555555555555555555555555552000",
      "0000555555555555555555555555552000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    lights: [[19, 15, '#b0ffe8', 4], [2, 13, '#60ffb0', 5], [27, 1, '#a0e0ff', 2], [32, 12, '#a0e0ff', 2]],
    entries: { from_grass: [2, 2, 'right'], from_swamp: [31, 2, 'left'], from_float: [23, 16, 'up'] },
    exits: [
      { at: [0, 1, 1, 3], to: 'cave_grass', entry: 'from_fork' },
      { at: [33, 1, 1, 3], to: 'cave_swamp', entry: 'from_fork' },
      { at: [22, 18, 3, 1], to: 'cave_float', entry: 'from_fork' },
    ],
    chests: [
      { at: [12, 13], item: 'turbo_ether', id: 'cave_fork_turbo_ether' },
      { at: [28, 12], item: 'vaccine', id: 'cave_fork_vaccine' },
    ],
    items: [{ at: [1, 15], materia: 'magic_counter', id: 'cave_fork_magic_counter' }],
    triggers: [hop([12, 3], [12, 6], 1.0), hop([16, 8], [16, 11], 1.0)],
    objects: [
      { at: [19, 15], talk: crystalSpot('fork') },
      { at: [20, 2], talk: function* (s) { yield s.msg('The ledge runs on to the east, toward the sound of dripping water.\nBelow, the rock drops away in steps.'); } },
    ],
  });

  // ------------------------------------------------------------------ right path, lower: floating rocks
  FF7.defineMap('cave_float', {
    name: 'Northern Cave — Right Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE,
    battle: enc('north_cave_grassy'),
    grid: [
      "################+++###############",
      "              ......U             ",
      "              .......             ",
      "              ...:...             ",
      "                                  ",
      "            ...........R......U   ",
      "            U..........^.......   ",
      "                       R.......   ",
      "                        ..R....   ",
      "                        .......   ",
      " .....                     ^^     ",
      " .....  :......................   ",
      " .....  ........R............U.   ",
      " ...:.                            ",
      "  H                               ",
      " ...........U                     ",
      " ............                     ",
      "####...###########################",
    ],
    heights: [
      "9999999999999999999999999999999999",
      "0000000000000099999990000000000000",
      "0000000000000099999990000000000000",
      "0000000000000099999990000000000000",
      "0000000000000000000000000000000000",
      "0000000000007777777777774444444000",
      "0000000000007777777777754444444000",
      "0000000000000000000000074444444000",
      "0000000000000000000000004444444000",
      "0000000000000000000000004444444000",
      "0111110000000000000000000002200000",
      "0111110011111111111111111111111000",
      "0111110011111111111111111111111000",
      "0111110000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    lights: [[6, 11, '#ff80ff', 2], [20, 1, '#a0e0ff', 2], [30, 5, '#a0e0ff', 2], [12, 15, '#a0e0ff', 2]],
    entries: { from_fork: [18, 1, 'down'], from_bottom: [5, 15, 'up'] },
    exits: [
      { at: [16, 0, 3, 1], to: 'cave_fork', entry: 'from_float' },
      { at: [4, 17, 3, 1], to: 'cave_bottom', entry: 'from_float' },
    ],
    chests: [
      { at: [21, 5], item: 'x_potion', id: 'cave_float_x_potion' },
      { at: [30, 9], item: 'turbo_ether', id: 'cave_float_turbo_ether' },
      { at: [1, 10], item: 'speed_source', id: 'cave_float_speed_source' },
    ],
    triggers: [
      hop([17, 3], [17, 5]),
      hop([14, 5], [14, 3], 1.0),
      // the long double jump: FF7 lets you snatch the Mega-All floating over the gap
      { at: [8, 11], _to: [4, 11], run: function* (s) {
          if (!s.flag('c11b_megaall')) {
            const c = yield s.ask(null, 'Something glints in midair above the gap...', ['Grab it mid-jump!', 'Just jump']);
            yield s.jump('player', 6, 11, 1.2, 18);
            if (c === 0) {
              s.set('c11b_megaall');
              yield s.giveMateria('mega_all');
            }
            yield s.jump('player', 4, 11, 0.8, 18);
            return;
          }
          yield s.jump('player', 4, 11, 1.1, 32);
        } },
      hop([5, 12], [8, 12], 1.1),
      hop([4, 13], [4, 15]),
    ],
  });

  // ------------------------------------------------------------------ right path, upper: the swamp
  FF7.defineMap('cave_swamp', {
    name: 'Northern Cave — Right Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    battle: enc('north_cave_water'),
    look: Object.assign({}, NCAVE_DEEP, { grass: ['#3a5a48', '#345442'], water: '#2a6a5a' }),
    grid: [
      "####################################",
      "#,,,,,,,,,,~~~~,,,,,,,,,,~~#########",
      ",,,,,,,,,R,~~~~,,,,,,,,,,~~#########",
      ",,,,G,,,,,,~~~~,,,,,,,,,U~~,,,,,,,,#",
      ",,,,,,,,,,,~~~~,,,G,,,,,,~~,,,,,,,,#",
      "#,,,,,,,,,,~~~~,,,,,,,,,,~~,,,,,,,,#",
      "#,,,,,,G,,,~~~~,,,,,,,G,,~~,,G,,,,,#",
      "#,,,,,,,,,,RRRR,,,,,R,,,,~~,,,,,,,,#",
      "#U,,,,,,,,,RRRR,,,,,,,,,,~~,,,,,,,,,",
      "#,,,,,,,,~~~RRR~~~~~~~~~~~~,,,R,,,,,",
      "#,,,,,,,,~~~RRR~~~~~~~~~~~~,,,,,,,,,",
      "#,,,,,,,,~~~RRR~~~~~~~~~~~~,,,,,,,,#",
      "#,,G,,,,,~~~,,,,,,,,,,,,,,,,,,,,G,,#",
      "#,,,,,,,,~~~,,,,,,,,,,,,,,,,,,,,,,U#",
      "#,,,,,,,,~~~,,,G,,,,,,,,,,,,,,,,,,,#",
      "#,,,,,G,,~~~,,,,,,,,,,,,,,,,G,,,,,,#",
      "#,,,,,,,,~~~,,,,,R,,,,G,,,,,,,,,,R,#",
      "#,,,,,,,,~~~,,,,,,,,,,,,,,U,,,,,,,,#",
      "####################################",
    ],
    lights: [[1, 8, '#a0e0ff', 2], [24, 3, '#a0e0ff', 2], [26, 17, '#a0e0ff', 2], [34, 13, '#a0e0ff', 2]],
    entries: { from_fork: [2, 3, 'right'], from_counter: [33, 9, 'left'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'cave_fork', entry: 'from_swamp' },
      { at: [35, 8, 1, 3], to: 'cave_counter', entry: 'from_swamp' },
    ],
    chests: [
      { at: [2, 16], item: 'magic_source', id: 'cave_swamp_magic_source' },
      { at: [24, 1], item: 'remedy', id: 'cave_swamp_remedy' },
      { at: [13, 16], item: 'imperial_guard', id: 'cave_swamp_imperial_guard' },
      { at: [1, 1], item: 'vaccine', id: 'cave_swamp_vaccine' },
      { at: [34, 3], item: 'hero_drink', id: 'cave_swamp_hero_drink' },
    ],
    items: [{ at: [20, 2], materia: 'shield', id: 'cave_swamp_shield' }],
    triggers: [
      wade([10, 3], [15, 3]), wade([15, 2], [10, 2]),
      wade([17, 8], [17, 12]), wade([18, 12], [18, 8]),
    ],
    onEnter: function* (s) {
      if (s.flag('c11b_swamp_seen')) return;
      s.set('c11b_swamp_seen');
      yield* remark(s, [
        ['yuffie', "Eww, a swamp! My shoes are gonna be ruined!"],
        ['cid', "Great. Now we're wadin' through muck."],
        ['barret', "Water's shallow enough. Just splash on through!"],
        ['tifa', "The water's shallow. We can wade through it."],
        ['redxiii', "The water is shallow. We can cross it."],
        ['caitsith', "Mind yer step! My moogle hates gettin' his feet wet."],
        ['vincent', "...Shallow. We can cross."],
      ]);
    },
  });

  FF7.defineMap('cave_counter', {
    name: 'Northern Cave — Right Path', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: NCAVE_DEEP,
    battle: enc('north_cave_water', 0.8),
    grid: [
      "##############################",
      "##############..##############",
      "##############..##############",
      "#.U........................U.#",
      "#........U..........U........#",
      "#.........**********.........#",
      "#....R....**********.........#",
      "..........***....***..........",
      "..........***....***..........",
      "..........***....***..........",
      "#.........****KK****....R....#",
      "#.....R...****KK****.........#",
      "#........U..........U........#",
      "#.U........................U.#",
      "##############################",
      "##############################",
    ],
    lights: [[14, 8, '#60ffb0', 5], [14, 1, '#ffffff', 1], [2, 3, '#a0e0ff', 2], [27, 13, '#a0e0ff', 2]],
    entries: { from_swamp: [2, 8, 'right'], from_bottom: [27, 8, 'left'] },
    exits: [
      { at: [0, 7, 1, 3], to: 'cave_swamp', entry: 'from_counter' },
      { at: [29, 7, 1, 3], to: 'cave_bottom', entry: 'from_counter' },
    ],
    items: [
      { at: [14, 8], materia: 'counter', id: 'cave_counter_counter' },
      { at: [15, 1], materia: 'w_magic', id: 'cave_counter_w_magic' },
    ],
  });

  // ------------------------------------------------------------------ the bottom of the crater
  // What each member finds on the way down (FF7 crater "duplication" table): 1 left, 2 right/upper, 3 right/lower.
  const GIFTS = {
    barret: { 1: 'guard_source', 2: 'vaccine', 3: 'remedy' },
    tifa: { 1: 'mystile', 2: 'hero_drink', 3: 'turbo_ether' },
    redxiii: { 1: 'mind_source', 2: 'm:shield', 3: 'speed_source' },
    yuffie: { 1: 'megalixir', 2: 'm:counter', 3: 'vaccine' },
    caitsith: { 1: 'elixir', 2: 'remedy', 3: 'x_potion' },
    vincent: { 1: 'megalixir', 2: 'magic_source', 3: 'm:mega_all' },
    cid: { 1: 'speed_source', 2: 'imperial_guard', 3: 'elixir' },
    reno: { 1: 'turbo_ether', 2: 'x_potion', 3: 'elixir' },
    rude: { 1: 'guard_source', 2: 'hero_drink', 3: 'megalixir' },
    elena: { 1: 'magic_source', 2: 'remedy', 3: 'turbo_ether' },
  };
  const GIFT_LINES = {
    barret: "Found this on the way down. Figured you could use it more'n me.",
    tifa: "Look what I found on my way down. Here, you take it.",
    redxiii: "This was lying along my path. I believe it will serve you well.",
    yuffie: "Ugh, fine, you can have this. ...Only 'cause I'm feeling generous today!",
    caitsith: "Ta-daa! A little somethin' I picked up. No charge!",
    vincent: "...This was on my path. Take it.",
    cid: "Here. Picked this up on the way. Don't say I never gave ya nothin'.",
    reno: "Picked this up on the way down. Consider it a Turk freebie, yo.",
    rude: "......For you.",
    elena: "I found this on my path! Here, you should have it!",
  };
  const READY_LINES = {
    barret: "This is the last stretch, Cloud. You ready?",
    tifa: "Cloud... whatever happens down there, we're all with you.",
    redxiii: "The Planet's cry grows louder the deeper we go. It is time.",
    yuffie: "Let's get this over with! ...I'm not scared. Nope. Not even a little.",
    caitsith: "All set? Once we go down there, there's no poppin' back up for a breather.",
    vincent: "...Sephiroth awaits. Are you prepared?",
    cid: "Just say the word, and we'll go kick that bastard's teeth in!",
    reno: "Last stretch, Spiky. Let's clock out of this job for good.",
    rude: "......Ready when you are.",
    elena: "Whatever happens down there... it's been an honor. Really.",
  };
  const STAY_LINES = {
    barret: "Leave this end to us! Nothin's gettin' past here!",
    cid: "Go on! We'll hold the fort. Give him one from me!",
    tifa: "Cloud... Come back to us. Promise.",
    redxiii: "Go. We will guard the way behind you.",
    yuffie: "Hurry up and beat him so we can all go home!",
    vincent: "...Go. End it.",
    caitsith: "Good luck! We're all countin' on ya!",
    reno: "Go on. We'll keep the lights on up here, yo.",
    rude: "......Go.",
    elena: "We'll hold this spot! Just like Tseng taught us!",
  };
  function* regroup(s) {
    s.set('c11b_regroup');
    s.phs(true);
    const waiting = others(s);
    if (!waiting.length) return;
    yield s.say(waiting[0], "{CLOUD}! Over here! You made it!");
    for (const id of waiting) {
      const route = s.get('c11b_route_' + id);
      if (!route || !GIFTS[id][route] || s.flag('c11b_gift_' + id)) continue;
      s.set('c11b_gift_' + id);
      yield s.say(id, GIFT_LINES[id]);
      const g = GIFTS[id][route];
      if (g.startsWith('m:')) yield s.giveMateria(g.slice(2)); else yield s.give(g);
    }
    yield s.say('cloud', "The Planet's core is right below us... and Sephiroth with it.");
    yield s.say(waiting[0], "Take your time and get ready. When you're set, just say the word.");
  }
  function* descend(s) {
    const c = yield s.ask('cloud', "(Below lies the Planet's core. Once we go down, there's no turning back.)", ["Let's go.", 'Not yet.']);
    if (c !== 0) { yield s.say('cloud', "...Not yet. I need a little more time."); return; }
    yield s.say('cloud', "I'll take two with me. The rest of you, keep the monsters off our backs up here.");
    yield s.choosePArty(['cloud']);
    // the ones you talked to follow you down: the other parties of the Bizarro·Sephiroth battle (js/maps/c11b/part3.js)
    const backup = others(s).filter(id => s.flag('c11b_with_' + id));
    s.setVar('c11b_backup', backup);
    for (const id of others(s).filter(id => !backup.includes(id)).slice(0, 3)) yield s.say(id, STAY_LINES[id]);
    if (backup.length) yield s.say(backup[0], "We'll be right behind you. If you fall down there, we'll pick up where you left off!");
    yield* remark(s, [
      ['tifa', "Let's go, Cloud. Together."],
      ['barret', "Let's end this!"],
      ['cid', "Alright! Let's go show him what we're made of!"],
      ['redxiii', "Lead the way, Cloud."],
      ['yuffie', "Here goes nothing...!"],
      ['vincent', "...I am ready."],
      ['caitsith', "Here we go!"],
    ]);
    s.set('c11b_descended');
    s.phs(false);
    s.music('none');
    yield s.move('player', 16, 8);
    yield s.face('player', 'down');
    yield s.jump('player', 16, 11, 1.2, 30);
    s.hide('player');
    s.sfx('falling');
    yield s.fadeOut(50);
    yield s.goto('final_platforms', 'start');
  }
  const memberAt = { barret: [12, 7], tifa: [16, 7], redxiii: [20, 7], cid: [10, 11], yuffie: [23, 11], caitsith: [13, 16], vincent: [20, 16], reno: [7, 9], rude: [26, 9], elena: [17, 5] };
  const memberNpc = id => ({
    id: 'wait_' + id, model: id, name: id, at: memberAt[id], dir: memberAt[id][1] > 12 ? 'up' : memberAt[id][1] < 9 ? 'down' : (memberAt[id][0] < 16 ? 'right' : 'left'),
    show: s => s.flag('c11b_split') && s.isMember(id) && !s.inParty(id) && !s.flag('c11b_descended'),
    talk: function* (s) {
      yield s.say(id, READY_LINES[id]);
      if (!s.flag('c11b_with_' + id)) { s.set('c11b_with_' + id); yield s.msg(`${s.name(id)} will follow you down.`); }
      yield* descend(s);
    },
  });
  FF7.defineMap('cave_bottom', {
    name: 'Bottom of the Crater', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: Object.assign({}, NCAVE, { sky: ['#020a08', '#0a3024'] }),
    grid: [
      "#####++#####################++####",
      "#U..............................U#",
      "#..........U..........U..........#",
      "#.................R..............#",
      "#...U............................#",
      "#...........x....................#",
      "#................................#",
      "#.........................R......#",
      "#.......R........................#",
      "#.............      .............#",
      "#............        ............#",
      "#............  ****  .........R..#",
      "......x......  ****  ............#",
      ".............        ............#",
      "..............      .............#",
      "#...R............................#",
      "#........U...............U..x....#",
      "#U...............................#",
      "##################################",
    ],
    lights: [[16, 11, '#60ffb0', 7], [4, 4, '#b0ffe8', 4], [1, 1, '#a0e0ff', 2], [32, 1, '#a0e0ff', 2]],
    entries: { from_graveyard: [5, 2, 'down'], from_float: [2, 13, 'right'], from_counter: [28, 2, 'down'] },
    exits: [
      { at: [5, 0, 2, 1], to: 'cave_bones', entry: 'from_bottom' },
      { at: [0, 12, 1, 3], to: 'cave_float', entry: 'from_bottom' },
      { at: [28, 0, 2, 1], to: 'cave_counter', entry: 'from_bottom' },
    ],
    chests: [{ at: [32, 17], item: 'luck_source', id: 'cave_bottom_luck_source' }],
    npcs: CREW.map(memberNpc),
    triggers: [
      { at: [13, 9, 8, 6], on: 'talk', run: function* (s) {
          yield s.msg('Far below, a sea of green light churns and roars. The Planet\'s core.');
          yield* descend(s);
        } },
    ],
    objects: [{ at: [4, 4], talk: crystalSpot('bottom') }],
    onEnter: function* (s) {
      if (!s.flag('c11b_regroup')) { yield* regroup(s); return; }
      s.phs(true);
    },
  });
})();

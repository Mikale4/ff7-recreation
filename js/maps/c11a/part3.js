// Chapter 11a (part 3) — the deserted Shinra Building (last visit: Behemoth Horn, Pile Banger,
// Master Fist, Grow Lance, the 64F vending machine and HP Shout), the climb to the Sister Ray
// (Proud Clod with Scarlet & Heidegger, Mystile, Missing Score), and Hojo at the cannon's controls.
// Ends Disc 2. (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C = FF7.c11a = FF7.c11a || {};

  // ================================================================== the Shinra Building, deserted
  // Same rooms as Chapter 4's Shinra HQ (geometry is taken from those maps), but emptied out:
  // the staff have fled, the security is dead and the elevator runs on emergency power.
  const FALLBACK = ["##########", "#........#", "#........#", "#........#", "##########"];
  const hq = (id) => {
    const m = FF7.maps[id] || {};
    return { theme: m.theme || 'shinra', look: m.look, lights: m.lights, grid: m.grid || FALLBACK, heights: m.heights };
  };
  const hqMap = (id, from, def) => FF7.defineMap(id, Object.assign(hq(from), { area: 'Midgar', music: 'shinra' }, def));
  const shut = (text) => function* (s) { yield s.msg(text); };
  const FLOORS = [
    { f: 1, label: '1F  Lobby', map: 'midgar2_hq_lobby' },
    { f: 63, label: '63F', map: 'midgar2_hq_63f' },
    { f: 64, label: '64F  Recreation', map: 'midgar2_hq_64f' },
  ];
  const elevator = (from) => function* (s) {
    const list = FLOORS.filter(f => f.f !== from);
    const ch = yield s.ask(null, 'The elevator is running on emergency power. Which floor?', list.map(f => f.label).concat(['Cancel']));
    if (ch == null || ch >= list.length) return;
    s.sfx('door_shinra');
    yield s.fadeOut(20);
    s.sfx('elevator');
    yield 60;
    yield s.goto(list[ch].map, 'from_elevator');
  };

  hqMap('midgar2_hq_plaza', 'shinra_plaza', {
    name: 'Shinra Bldg. Plaza',
    entries: { from_tunnel: [16, 11, 'up'], from_lobby: [16, 2, 'down'], from_stairs: [32, 3, 'left'] },
    exits: [
      { at: [15, 1, 4, 1], to: 'midgar2_hq_lobby', entry: 'from_plaza', sfx: 'door_shinra' },
      { at: [33, 2, 1, 3], run: function* (s) { s.setVar('c11a_hq_flight', 1); yield s.goto('midgar2_hq_stairs', 'up'); } },
      { at: [9, 13, 14, 1], to: 'midgar2_junction', entry: 'from_hq' },
    ],
    objects: [
      { at: [16, 7], talk: function* (s) { yield s.msg("The fountain has run dry. Scraps of paper float in what little water is left."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_hq_seen')) return;
      s.set('c11a_hq_seen');
      yield s.say('cloud', "(The Shinra Building... Not a single guard. Everyone's either run or gone out after us.)\f(The emergency stairs are around the east side, if anyone's in the mood for sixty floors.)");
    },
  });

  hqMap('midgar2_hq_lobby', 'shinra_lobby', {
    name: 'Shinra Bldg. 1F Lobby',
    entries: { from_plaza: [16, 12, 'up'], from_2f_w: [2, 4, 'down'], from_2f_e: [29, 4, 'down'], from_elevator: [16, 2, 'down'] },
    exits: [
      { at: [2, 1, 2, 1], to: 'midgar2_hq_2f', entry: 'from_lobby_w' },
      { at: [28, 1, 2, 1], to: 'midgar2_hq_2f', entry: 'from_lobby_e' },
      { at: [12, 1, 3, 1], run: elevator(1) },
      { at: [17, 1, 3, 1], run: elevator(1) },
      { at: [13, 13, 6, 1], to: 'midgar2_hq_plaza', entry: 'from_lobby', sfx: 'door_shinra' },
    ],
    triggers: [
      { at: [30, 4], on: 'talk', run: function* (s) {
          yield s.msg('Shinra, Inc. — Employee Bulletin Board');
          yield s.msg('"EMERGENCY NOTICE: All staff are to report to the shelters immediately."\f"Softball league cancelled until further notice."');
          yield s.msg('Pinned in the corner, a crumpled flyer has survived everything...');
          yield s.msg("TURTLE'S PARADISE — Flyer No. 2\n\"Wutai's finest pub! Read all six of our flyers\nhidden around the world, then visit us for a prize!\"");
          s.set('c4_flyer_turtle2');   // same flyer as Chapter 4's lobby: last chance to read it
        } },
      { at: [11, 6, 10, 1], on: 'talk', run: function* (s) { yield s.msg("The reception desk is deserted. A phone off the hook buzzes to itself."); } },
    ],
  });

  hqMap('midgar2_hq_2f', 'shinra_2f', {
    name: 'Shinra Bldg. 2F',
    entries: { from_lobby_w: [3, 8, 'up'], from_lobby_e: [26, 8, 'up'] },
    exits: [
      { at: [3, 9, 2, 1], to: 'midgar2_hq_lobby', entry: 'from_2f_w' },
      { at: [25, 9, 2, 1], to: 'midgar2_hq_lobby', entry: 'from_2f_e' },
      { at: [14, 1, 2, 1], run: shut("Chunks of ceiling have come down over the stairs to the 3rd floor. No way through.") },
    ],
    chests: [
      { at: [1, 3], item: 'pile_banger', id: 'midgar2_hq_pilebanger' },
      { at: [5, 2], item: 'master_fist', id: 'midgar2_hq_masterfist' },
    ],
    triggers: [
      { at: [1, 2, 4, 1], on: 'talk', run: function* (s) { yield s.msg("The shop shelves have been picked almost clean. The clerk must have left in a hurry."); } },
    ],
  });

  // The emergency stairs: eight flights; the landing (flight 5) now holds the Behemoth Horn.
  hqMap('midgar2_hq_stairs', 'shinra_stairs', {
    name: 'Shinra Bldg. Emergency Stairs', music: 'infiltrate',
    entries: { up: [2, 9, 'right'], down: [2, 2, 'down'] },
    exits: [
      { at: [2, 1, 1, 1], sfx: 'door', run: function* (s) {
          const f = s.get('c11a_hq_flight');
          if (f >= 8) { yield s.msg("The door to the 59th floor has been welded shut. The upper floors are sealed off."); return; }
          s.inc('c11a_hq_flight');
          yield s.goto('midgar2_hq_stairs', 'up');
        } },
      { at: [0, 9, 1, 2], run: function* (s) {
          const f = s.inc('c11a_hq_flight', -1);
          if (f < 1) { yield s.goto('midgar2_hq_plaza', 'from_stairs'); return; }
          yield s.goto('midgar2_hq_stairs', 'down');
        } },
    ],
    items: [{ at: [12, 3], item: 'behemoth_horn', id: 'midgar2_hq_behemoth', if: s => s.get('c11a_hq_flight') === 5 }],
    onEnter: function* (s) {
      if (s.get('c11a_hq_flight') === 8 && s.entry() === 'up' && !s.flag('c11a_hq_stairs_top')) {
        s.set('c11a_hq_stairs_top');
        yield s.say('cloud', "(......Barret would never forgive me if he knew I came up here again voluntarily.)");
      }
    },
  });

  hqMap('midgar2_hq_63f', 'shinra_63f', {
    name: 'Shinra Bldg. 63F',
    entries: { from_elevator: [32, 2, 'down'], from_64f: [34, 2, 'down'] },
    exits: [
      { at: [30, 1, 1, 1], run: shut("The stairwell door to the 62nd floor is jammed.") },
      { at: [34, 1, 1, 1], to: 'midgar2_hq_64f', entry: 'from_63f', sfx: 'door' },
      { at: [31, 1, 3, 1], run: elevator(63) },
    ],
    chests: [{ at: [16, 6], item: 'grow_lance', id: 'midgar2_hq_growlance' }],
    triggers: [
      { at: [30, 12], on: 'talk', run: function* (s) { yield s.msg("The security terminal's screen is dark. With the power down, every door on this floor is unlocked."); } },
    ],
  });

  const LOCKER_X = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];   // the locker wall of shinra_64f (row 2)
  hqMap('midgar2_hq_64f', 'shinra_64f', {
    name: 'Shinra Bldg. 64F',
    entries: { from_63f: [12, 2, 'down'], from_elevator: [15, 2, 'down'] },
    exits: [
      { at: [12, 1, 1, 1], to: 'midgar2_hq_63f', entry: 'from_64f', sfx: 'door' },
      { at: [19, 1, 1, 1], run: shut("The door to the 65th floor won't budge. Someone has sealed the upper floors.") },
      { at: [14, 1, 3, 1], run: elevator(64) },
    ],
    triggers: LOCKER_X.map(x => ({ at: [x, 2], on: 'talk', run: function* (s) {
        if (x === 30 && !s.flag('c11a_hq_hpshout')) {
          s.set('c11a_hq_hpshout');
          s.sfx('chest');
          yield s.msg("You open the locker... Inside is a megaphone with a note taped to it:\n\"MY ULTIMATE WEAPON\".");
          yield s.give('hp_shout');
          return;
        }
        yield s.msg("A locker full of sweaty gym clothes. Nothing useful.");
      } })).concat([
      { at: [21, 8, 2, 1], on: 'talk', run: function* (s) {
          if (s.flag('c11a_hq_vending')) { yield s.msg("The vending machine is empty."); return; }
          yield s.msg('"SHINRA GYM SPECIAL DRINK"\nThe machine is dark... but something is stuck in the slot.');
          const c = yield s.ask('cloud', '', ['Give it a whack.', 'Leave it.']);
          if (c !== 0) return;
          s.sfx('hit'); s.shake(3, 12);
          yield 20;
          s.set('c11a_hq_vending');
          yield s.msg('Clunk! Clunk!');
          yield s.give('mind_source');
          yield s.give('speed_source');
        } },
      { at: [1, 7, 10, 1], on: 'talk', run: function* (s) { yield s.inn(0, { text: 'A bed in the relaxation room. Take a quick nap?' }); } },
      { at: [1, 9, 10, 1], on: 'talk', run: function* (s) { yield s.inn(0, { text: 'A bed in the relaxation room. Take a quick nap?' }); } },
    ]),
  });

  // ================================================================== the base of the Sister Ray
  const BASE = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hhhhhwhhhhXXXXXXXXXXXXXXXXhhhhwhhhhh",
    "h....l....PPPPPPPPPPPPPPPP....l....h",
    "h..................................h",
    "h.....x............................:",
    "h..................................:",
    "h:::::::::::::::::::::::::::::::::::",
    "h:::::::::::::::::::::::::::::::::::",
    "h..................................h",
    "h...B..o.................x.....o...h",
    "h..g...............................h",
    "h==========l===========l===========h",
  ];
  const CANNON_LOOK = { sky: ['#02030a', '#141c30'], fog: { color: [0.05, 0.07, 0.11], near: 8, far: 24 }, floor: ['#4c4e56', '#46484f'], floor2: ['#3c3e46', '#383a40'] };
  FF7.defineMap('midgar2_cannon_base', {
    name: 'Sector 8 — Mako Cannon', area: 'Midgar', theme: 'midgar', music: 'fullscale', look: CANNON_LOOK,
    lights: [[5, 2, '#ffe0a0', 3], [30, 2, '#ffe0a0', 3], [18, 2, '#80ffa0', 5]],
    grid: BASE,
    entries: { from_junction: [4, 10, 'right'], from_yard: [34, 6, 'left'] },
    exits: [
      { at: [3, 10, 1, 1], to: 'midgar2_junction', entry: 'from_base' },
      { at: [35, 4, 1, 4], to: 'midgar2_cannon_yard', entry: 'from_base', if: s => s.flag('c11a_clod_done'),
        blocked: function* (s) { yield s.say('cloud', "(That machine's blocking the road to the cannon.)"); } },
    ],
    triggers: [
      { id: 'clod', at: [18, 2, 1, 9], once: true, if: s => !s.flag('c11a_clod_done'), run: function* (s) { yield* FF7.story.c11a_proudClod(s); } },
      { at: [10, 2, 16, 1], on: 'talk', run: function* (s) { yield s.msg("The Sister Ray's support tower. Thick cables from every reactor in Midgar snake up into it, humming."); } },
    ],
    onLoad: function (s) {
      // the Sister Ray itself, towering over its support tower (refs 17-midgar51, 52)
      s.spawn('sister_ray', { vehicle: 'sister_ray', scale: 0.7 }, 18, -4, 'up');
      if (!s.flag('c11a_clod_done')) s.spawn('clod', { enemy: 'proud_clod' }, 28, 6, 'left', { name: 'Proud Clod' });
    },
    onEnter: function* (s) {
      if (s.flag('c11a_base_seen')) return;
      s.set('c11a_base_seen');
      yield s.cam(18, 1, 50, { dist: 12, pitch: 32 });
      yield s.say('cloud', "(There it is. The Sister Ray... The whole thing's shaking.)");
      s.camFollow(40);
    },
  });

  FF7.story.c11a_proudClod = function* (s) {
    s.music('none');
    s.shake(4, 40);
    yield s.move('clod', 23, 6, { speed: 0.03 });
    yield s.say('Heidegger', "(from inside the machine) Gyahahaha! Did you really think you'd just stroll up to the cannon?");
    yield s.say('Scarlet', "(from inside the machine) Kyahahaha! Say hello to my masterpiece — the Proud Clod! Built to tear the WEAPONs apart with its bare hands!");
    yield s.say('cloud', "......Get out of the way. Hojo's going to blow up this whole city.");
    yield s.say('Heidegger', "Hojo's next on our list. But first, we deal with AVALANCHE!");
    yield s.say('Scarlet', "Goodbye, little rats! Kyahahahaha!");
    yield s.battle({ enemies: ['proud_clod', 'jamar_armor'], bg: 'sisterray', music: 'shinra', noEscape: true });
    s.music('none');
    for (let i = 0; i < 3; i++) { s.sfx('bosskill'); s.shake(6, 20); s.flash('#ffa040', 16, 0.7); yield 24; }
    yield s.say('Heidegger', "Im-impossible! Gyaaah...!");
    yield s.say('Scarlet', "My... my masterpiece...!");
    s.flash('#ffffff', 40, 1);
    s.shake(8, 40);
    s.remove('clod');
    s.set('c11a_clod_done');
    yield 40;
    s.music('fullscale');
    yield s.say('cloud', "......Let's go. The cannon's just ahead.");
  };

  // ------------------------------------------------------------------ the cannon yard
  const YARD = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hhhhhhhhhhhhhhh^^^^hhhhhhhhhhhhhhh",
    "hP.............^^^^.............Ph",
    "h..............^^^^..............h",
    "h................................h",
    "h...B........................S...h",
    ":................................h",
    ":.......x........................h",
    ":................................h",
    "h................................h",
    "h.....o..................B.......h",
    "h................................h",
    "h==========l==========l==========h",
  ];
  FF7.defineMap('midgar2_cannon_yard', {
    name: 'Sector 8 — Mako Cannon', area: 'Midgar', theme: 'midgar', music: 'fullscale', look: CANNON_LOOK,
    battle: { table: 'midgar_raid_streets', bg: 'sisterray', rate: 0.6 },
    lights: [[17, 2, '#ffe0a0', 3], [29, 5, '#a0e0ff', 2], [11, 12, '#ffe0a0', 2], [22, 12, '#ffe0a0', 2]],
    grid: YARD,
    heights: C.hm(YARD, [[15, 1, 4, 1, 3], [15, 2, 4, 1, 2], [15, 3, 4, 1, 1]]),
    entries: { from_base: [1, 7, 'right'], from_stairs: [16, 4, 'down'] },
    exits: [
      { at: [0, 6, 1, 3], to: 'midgar2_cannon_base', entry: 'from_yard' },
      { at: [15, 1, 4, 1], to: 'midgar2_cannon_stairs', entry: 'from_yard' },
    ],
    chests: [
      { at: [3, 3], item: 'elixir', id: 'midgar2_yard_elixir' },
      { at: [30, 3], item: 'mystile', id: 'midgar2_yard_mystile' },
    ],
  });

  // ------------------------------------------------------------------ the stairs up the cannon (rain)
  const STAIRS = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXX::::XXXXXXXXXXXXX",
    "#PPPPPPPPPPPP^^^^PPPPPPPPPPPP#",
    "#PPP.........^^^^.........PPP#",
    "#PPP......................PPP#",
    "#PPP......................PPP#",
    "#PPP===================^^^PPP#",
    "#PPP                   ^^^PPP#",
    "#PPP                   ^^^PPP#",
    "#PPP                   ^^^PPP#",
    "#PPP......................PPP#",
    "#PPP......................PPP#",
    "#PPP^^^===================PPP#",
    "#PPP^^^                   PPP#",
    "#PPP^^^                   PPP#",
    "#PPP^^^                   PPP#",
    "#PPP......................PPP#",
    "#PPP......................PPP#",
    "#PPPPPPPPPP::::::PPPPPPPPPPPP#",
  ];
  FF7.defineMap('midgar2_cannon_stairs', {
    name: 'Mako Cannon — Stairway', area: 'Midgar', theme: 'midgar', music: 'fullscale',
    // ref 17-midgar51, 52: rusty railed landings and stairs climbing through pipework in a green haze,
    // seen from high up and to the side
    look: { sky: ['#010604', '#0a2018'], fog: { color: [0.08, 0.16, 0.12], near: 6, far: 20 }, floor: ['#4a4640', '#44403a'], floor2: ['#3c3834', '#383430'],
      metal: ['#6a5040', '#62483a'], trim: '#8a6a4a', wall: '#5a5048' },
    camera: { yaw: 25, pitch: 55, dist: 12 },
    battle: { table: 'sister_ray', bg: 'sisterray', rate: 1 },
    lights: [[14, 2, '#80ffa0', 4], [14, 10, '#ffe0a0', 2], [14, 16, '#ffe0a0', 2]],
    grid: STAIRS,
    heights: C.hm(STAIRS, [[4, 15, 3, 1, 1], [4, 14, 3, 1, 2], [4, 13, 3, 1, 2], [4, 12, 3, 1, 3], [7, 12, 19, 1, 4], [4, 10, 22, 2, 4],
      [23, 9, 3, 1, 5], [23, 8, 3, 1, 6], [23, 7, 3, 1, 6], [23, 6, 3, 1, 7], [4, 6, 19, 1, 8], [4, 3, 22, 3, 8], [13, 2, 4, 1, 9], [13, 1, 4, 1, 9]]),
    entries: { from_yard: [13, 17, 'up'], from_top: [14, 4, 'down'] },
    exits: [
      { at: [11, 18, 6, 1], to: 'midgar2_cannon_yard', entry: 'from_stairs' },
      { at: [13, 1, 4, 1], to: 'hojo_control', entry: 'from_stairs' },
    ],
    chests: [{ at: [5, 10], item: 'missing_score', id: 'midgar2_stairs_missingscore', if: s => s.inParty('barret') }],
    onEnter: function* (s) {
      if (s.flag('c11a_stairs_seen')) return;
      s.set('c11a_stairs_seen');
      s.sfx('train');
      yield s.msg("Rain lashes the steel stairway that climbs the side of the cannon.\nFar above, the Sister Ray's barrel glows a sickly green.");
    },
  });

  // ================================================================== Hojo at the controls
  const CONTROL = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "=====PPPPPPPPMZZMPPPPPPPP=====",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=ggggMggggggggggggggggggMgggg=",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=gggggggggggggggggggggggggggg=",
    "=============::::=============",
    "             ::::             ",
  ];
  FF7.defineMap('hojo_control', {
    name: 'Mako Cannon — Control Deck', area: 'Midgar', theme: 'reactor', music: 'lurking',
    // ref 17-midgar06: Hojo at the cannon's machinery, seen almost straight down onto the steel plates
    look: { sky: ['#010208', '#0a1a14'], fog: { color: [0.03, 0.08, 0.06], near: 7, far: 22 }, metal: ['#5a6068', '#545a62'] },
    camera: { pitch: 66, dist: 11 },
    lights: [[14, 1, '#80ffa0', 5], [5, 5, '#80ffa0', 2], [24, 5, '#80ffa0', 2]],
    grid: CONTROL,
    entries: { from_stairs: [14, 10, 'up'] },
    exits: [{ at: [13, 12, 4, 1], to: 'midgar2_cannon_stairs', entry: 'from_top', if: s => !s.flag('c11a_hojo_met'),
      blocked: function* (s) { yield s.say('cloud', "(Not now. The cannon has to be shut down.)"); } }],
    triggers: [
      { id: 'hojo', at: [1, 7, 28, 1], once: true, if: s => !s.flag('c11a_hojo_done'), run: function* (s) { yield* FF7.story.c11a_hojo(s); } },
    ],
    onLoad: function (s) {
      if (!s.flag('c11a_hojo_done')) s.spawn('hojo', 'hojo', 14, 3, 'up', { name: 'Hojo' });
    },
  });

  FF7.story.c11a_hojo = function* (s) {
    s.set('c11a_hojo_met');
    const mates = C.crew(s).filter(id => s.inParty(id));
    const crew = C.gather(s, [[12, 9, 'up'], [16, 9, 'up']], mates);
    yield s.move('player', 14, 6);
    if (crew.length) yield crew.map((id, i) => s.move(id, i ? 16 : 12, 7));
    s.sfx('typing');
    yield s.say('hojo', "Kukuku... Just a little more. Every reactor in Midgar, all of it... for you...");
    yield s.say('cloud', "Hojo! Shut the cannon down!");
    yield s.face('hojo', 'player');
    yield s.say('hojo', "Hm? ...Ah. The failed specimen. Still walking around, are you? How tiresome.");
    yield s.say('hojo', "The Sister Ray will fire again. One more shot, and the energy will reach the crater.\fMy son has need of it.");
    yield s.say('cloud', "......Your son?");
    yield s.say('hojo', "Sephiroth, of course. Kukuku... You didn't know?\fThirty years ago, I offered a woman to the Jenova Project — a woman carrying my child. Sephiroth is the result. My finest work.");
    if (C.has(crew, 'vincent')) {
      yield s.say('vincent', "......Hojo.");
      yield s.say('hojo', "Vincent? You're still skulking about? Hmph. You never did understand science.");
      yield s.say('vincent', "I understood enough. You took her, and you took her child. I've waited thirty years to end this.");
    }
    yield s.say('cloud', "......You're insane.");
    yield s.say('hojo', "Sephiroth knows nothing of me. I'm sure he'd despise me if he did. It doesn't matter.\fTo watch your creation surpass everything you imagined... there's no greater joy for a scientist.");
    if (C.has(crew, 'barret')) yield s.say('barret', "You're one sick bastard, you know that?!");
    if (C.has(crew, 'tifa')) yield s.say('tifa', "All those people in Midgar... they mean nothing to you?");
    yield s.say('hojo', "Enough. I've been running one last experiment — on myself. Jenova's cells, you see.\fCome, let me show you the results! Kukukuku... Kyahahahaha!");
    s.music('none');
    s.flash('#80ff80', 30, 0.8);
    s.shake(5, 40);
    yield s.battle({ enemies: ['hojo', 'poodler_sample', 'bad_rap_sample'], bg: 'sisterray', music: 'jenova', noEscape: true });
    s.remove('hojo');
    s.set('c11a_hojo_done');
    yield* FF7.story.c11a_disc2End(s, crew);
  };

  FF7.story.c11a_disc2End = function* (s, crew) {
    crew = crew || [];
    s.music('none');
    yield 40;
    yield s.move('player', 14, 2);
    yield s.face('player', 'up');
    s.sfx('typing');
    yield s.msg("Cloud cuts the power feed at the control panel.");
    s.sfx('elevator');
    s.shake(4, 90);
    yield 60;
    yield s.msg("With a long, dying groan, the Sister Ray powers down. The green glow fades from its barrel.");
    s.music('whoami');
    yield s.face('player', 'down');
    if (C.has(crew, 'tifa')) yield s.say('tifa', "Sephiroth... was Hojo's son...");
    if (C.has(crew, 'vincent')) yield s.say('vincent', "......Lucrecia. It's over. He can't hurt anyone ever again.");
    if (C.has(crew, 'barret')) yield s.say('barret', "Even a monster like Sephiroth had a father. And THAT's what he got. Damn...");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "Hojo was never a father to anyone. Only a scientist.");
    if (C.has(crew, 'cid')) yield s.say('cid', "Hmph. Figures. Rotten apple, rotten tree.");
    if (C.has(crew, 'yuffie')) yield s.say('yuffie', "Ugh... I think I'm gonna be sick. And it's not even the airship this time.");
    if (C.has(crew, 'caitsith')) yield s.say('caitsith', "Midgar's safe. Thank you... all of you.");
    yield s.say('cloud', "......It doesn't change anything. Sephiroth is at the bottom of the crater, holding Holy back.\fThat's where we go next.");
    s.sfx('helicopter');
    yield 30;
    s.sfx('phs');
    yield s.say('cid', "(over the PHS) Oi! The Highwind's comin' in over the cannon! Grab the rope ladder, and make it snappy!");
    yield s.fadeOut(60);
    C.dismiss(s, crew);
    yield s.discEnd(2);
    s.set('disc3');
    yield s.goto('hw_night', 'start');
  };
})();

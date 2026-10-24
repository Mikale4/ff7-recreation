// Chapter 4 (part 1) — Shinra HQ: the plaza, the choice between storming the front door and
// sneaking up the emergency stairs, the lobby / 2F showroom / 3F lounge, the elevator ride with
// its battles, and the 59th floor where both routes meet. Shared C4 helpers live here too.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C4 = FF7.c4 = FF7.c4 || {};

  // ------------------------------------------------------------------ shared helpers
  // Push the player one tile back the way they came (locked doors, blocked exits).
  C4.stepBack = function* (s) {
    const a = s.actor('player');
    const T = FF7.field.TILE || 0.5;
    if (a && typeof a.x === 'number' && typeof a.tx === 'number') {
      // The player has only just crossed into the tile: the edge they are nearest to is the side
      // they came from, so step back onto that neighbouring tile (never sideways into a wall).
      const fx = a.x / T - a.tx - 0.5, fz = a.z / T - a.ty - 0.5;
      const back = Math.abs(fx) > Math.abs(fz) ? [fx < 0 ? -1 : 1, 0] : [0, fz < 0 ? -1 : 1];
      yield s.move('player', a.tx + back[0], a.ty + back[1]);
      return;
    }
    const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[a && a.dir] || [0, 1];
    yield s.walk('player', back[0], back[1]);
  };
  // Locked-door message + step back.
  C4.locked = (text) => function* (s) { yield s.msg(text); yield* C4.stepBack(s); };

  // Elevator destinations (keycard needed to ride there).
  C4.FLOORS = [
    { f: 1, label: '1F  Lobby', map: 'shinra_lobby', key: 'keycard_60' },
    { f: 59, label: '59F', map: 'shinra_59f', key: 'keycard_60' },
    { f: 60, label: '60F  Security', map: 'shinra_60f', key: 'keycard_60' },
    { f: 61, label: '61F', map: 'shinra_61f', key: 'keycard_60' },
    { f: 62, label: '62F  Mayor / Library', map: 'shinra_62f', key: 'keycard_62' },
    { f: 63, label: '63F', map: 'shinra_63f', key: 'keycard_65' },
    { f: 64, label: '64F  Recreation', map: 'shinra_64f', key: 'keycard_65' },
    { f: 65, label: '65F', map: 'shinra_65f', key: 'keycard_65' },
    { f: 66, label: '66F  Conference', map: 'shinra_66f', key: 'keycard_66' },
  ];
  // Elevator panel used on 1F, 3F and 59F-66F (before the capture).
  FF7.story.c4_elevator = function* (s, from) {
    if (s.flag('c4_captured')) { yield s.msg('The elevator is locked down. The panel is dead.'); yield* C4.stepBack(s); return; }
    if (!s.has('keycard_60')) {
      yield s.msg('The elevator panel blinks red:\n"AUTHORIZED KEYCARD REQUIRED."');
      yield* C4.stepBack(s);
      return;
    }
    const list = C4.FLOORS.filter(f => f.f !== from && s.has(f.key));
    const ch = yield s.ask(null, 'Which floor?', list.map(f => f.label).concat(['Cancel']));
    if (ch == null || ch >= list.length) { yield* C4.stepBack(s); return; }
    const dest = list[ch];
    s.sfx('door_shinra');
    yield s.fadeOut(20);
    s.sfx('elevator');
    yield 70;
    yield s.goto(dest.map, 'from_elevator');
  };

  // ------------------------------------------------------------------ the plaza
  FF7.defineMap('shinra_plaza', {
    name: 'Shinra Bldg. Plaza', area: 'Midgar', theme: 'midgar', music: 'shinra',
    look: { sky: ['#020308', '#0c1424'], fog: { color: [0.03, 0.04, 0.08], near: 10, far: 26 } },
    battle: { table: 'shinra_entrance', bg: 'shinra', rate: 0.6, if: s => s.flag('c4_arrived') && !s.flag('c4_captured') },
    lights: [[8, 3, '#ffe8b0', 3], [23, 3, '#ffe8b0', 3], [7, 9, '#ffe8b0', 3], [23, 9, '#ffe8b0', 3], [16, 2, '#b0d8ff', 5]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhwhhhwhhhwhhh++++hhhwhhhwhhhwhhh",
      "h..|.........::::::.........|.....",
      "h.......l....::::::....l..........",
      "h............::::::...............",
      "h...%%%......::::::......%%%.....h",
      "h...%f%......::::::......%f%.....h",
      "h...%%%......:::O::......%%%.....h",
      "h............::::::..............h",
      "h......l.....::::::....l.....S...h",
      "h............::::::..............h",
      "h========....::::::....==========h",
      "         ....::::::....           ",
      "         ....::::::....           ",
    ],
    entries: { from_wire: [16, 11, 'up'], from_lobby: [16, 2, 'down'], from_back: [32, 3, 'left'] },
    exits: [
      { at: [15, 1, 4, 1], to: 'shinra_lobby', entry: 'from_plaza', sfx: 'door_shinra' },
      { at: [33, 2, 1, 3], to: 'shinra_back', entry: 'from_plaza' },
      { at: [9, 13, 14, 1], run: C4.locked("(Aeris is somewhere inside that tower. There's no turning back now.)") },
    ],
    objects: [
      { at: [16, 7], talk: function* (s) { yield s.msg('A fountain bearing the Shinra logo. The water glows faintly under the floodlights.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c4_arrived')) return;
      s.set('c4_arrived');
      // The party that climbed the wire: Cloud, Barret, Tifa. Aeris is Shinra's prisoner.
      if (s.isMember('aeris')) s.leave('aeris');
      s.party(['cloud', 'barret', 'tifa']);
      s.music('shinra');
      s.spawn('barret', 'barret', 14, 12, 'up', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 18, 12, 'up', { name: 'Tifa' });
      yield s.fadeIn(30);
      yield [s.move('player', 16, 9), s.move('barret', 14, 10), s.move('tifa', 18, 10)];
      yield s.cam(16, 2, 70, { dist: 12, pitch: 38 });
      yield 30;
      yield s.say('barret', "There it is... Shinra Headquarters. Those bastards sit up top like kings while the slums get crushed under their feet.");
      yield s.say('tifa', "Aeris is in there somewhere. We have to get her out.");
      yield s.say('cloud', "......");
      s.camFollow(40); s.camZoom(9.5, 50);
      yield 20;
      yield s.face('barret', 'player');
      s.anim('barret', 'fistpump');
      yield s.say('barret', "Alright! We kick in the front door and show 'em what AVALANCHE is made of!");
      s.stopAnim('barret');
      yield s.face('tifa', 'barret');
      yield s.say('tifa', "Barret, are you out of your mind? The lobby will be crawling with guards. There has to be a quieter way in.");
      yield s.say('barret', "Quieter? Tch. Sneakin' around ain't my style.\f...Well, Cloud? You're callin' it.");
      yield s.face('tifa', 'player');
      const c = yield s.ask('cloud', '', ['Charge in through the front.', 'Look for a more covert way in.']);
      if (c === 0) {
        s.set('c4_route_front');
        yield s.say('barret', "HAH! Now that's what I'm talkin' about!");
        yield s.say('tifa', "...Fine. But if this blows up in our faces, I'm blaming both of you.");
        yield [s.run('barret', 16, 2), s.run('tifa', 17, 3)];
      } else {
        s.set('c4_route_stairs');
        yield s.say('tifa', "There should be an emergency stairway somewhere around the side. Let's check to the right.");
        yield s.say('barret', "Stairs, huh...? Man. Alright, alright.");
        yield [s.run('tifa', 32, 3), s.run('barret', 31, 4)];
      }
      s.remove('barret'); s.remove('tifa');
      yield s.say('cloud', "(Hang on, Aeris...)");
    },
  });

  // ------------------------------------------------------------------ side alley (emergency stairs)
  FF7.defineMap('shinra_back', {
    name: 'Shinra Bldg. (East Side)', area: 'Midgar', theme: 'midgar', music: 'infiltrate',
    look: { sky: ['#020308', '#0c1424'], fog: { color: [0.03, 0.04, 0.08], near: 8, far: 22 } },
    lights: [[10, 2, '#ff6040', 2]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXX",
      "hhhhwhhhhh+hhhhwhhhh",
      "..........:.......Ph",
      "....B.....:.....o.Ph",
      "..........:.......Ph",
      "===================h",
      "                    ",
    ],
    entries: { from_plaza: [1, 3, 'right'], from_stairs: [10, 2, 'down'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'shinra_plaza', entry: 'from_back' },
      { at: [10, 1, 1, 1], sfx: 'door', run: function* (s) {
          if (!s.flag('c4_back_door')) {
            s.set('c4_back_door');
            s.spawn('tifa', 'tifa', 9, 3, 'up', { name: 'Tifa' });
            s.spawn('barret', 'barret', 11, 3, 'up', { name: 'Barret' });
            yield s.say('tifa', "Here it is. The emergency stairs. Nobody ever uses these.");
            yield s.face('barret', 'tifa');
            yield s.say('barret', "Wait a sec. Aeris is up at the top, right? How many floors we talkin' about?");
            yield s.say('tifa', "...About sixty.");
            s.emote('barret', '!!');
            yield s.say('barret', "SIXTY!?");
            s.remove('tifa'); s.remove('barret');
          }
          s.setVar('c4_flight', 1);
          yield s.goto('shinra_stairs', 'up');
        } },
    ],
  });

  // ------------------------------------------------------------------ the endless stairs
  // One stairwell screen reused for every flight (no random battles on the stairs, as in FF7).
  // var c4_flight: 1..8; flight 5 is the landing with the Elixir.
  const STAIR_GRID = [
    "########################",
    "#h+hhhwhhhhhhwhhhhhhhhh#",
    "#......................#",
    "#......................#",
    "#                 =^^^^#",
    "#                 =^^^^#",
    "#                 =....#",
    "#                 =^^^^#",
    "#                 =^^^^#",
    "+......................#",
    "+......................#",
    "#hhhhhhhhhhhhhhhhhhhhhh#",
  ];
  const STAIR_HEIGHTS = [
    "888888888888888888888888",
    "888888888888888888888888",
    "888888888888888888888888",
    "888888888888888888888888",
    "000000000000000000666666",
    "000000000000000000666666",
    "000000000000000000444444",
    "000000000000000000222222",
    "000000000000000000222222",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
  ];
  const FLIGHTS = 8;
  const flightMap = (f) => f === 5 ? 'shinra_stairs_landing' : 'shinra_stairs';
  const STAIR_TALK = {
    2: [['barret', "Hff... hff... How many floors we done?"], ['tifa', "Not even ten yet."], ['barret', "...Ugh."]],
    3: [['barret', "Who the hell builds somethin' this tall anyway!?"], ['cloud', "Shinra."], ['barret', "I KNOW it's Shinra! I'm complainin', dammit!"]],
    4: [['barret', "Man... it's gotta be lunchtime by now..."], ['tifa', "Keep climbing, Barret."]],
    6: [['barret', "I'm startin' to think... the front door... wasn't such a bad idea..."], ['tifa', "Think about Marlene. You want to tell her you gave up halfway?"], ['barret', "...Hmph. Nobody said nothin' about givin' up!"]],
    7: [['barret', "Hey... Cloud... you ain't even outta breath, are ya?"], ['cloud', "...No."], ['barret', "Figures. Damn SOLDIER."]],
    8: [['barret', "Th-there's... no end... to these stairs..."], ['tifa', "Look! That door up there says '59'!"], ['barret', "F-finally...!"]],
  };
  function* stairsEnter(s) {
    const f = s.get('c4_flight');
    if (s.entry() !== 'up' || !STAIR_TALK[f] || s.flag('c4_stairtalk_' + f)) return;
    s.set('c4_stairtalk_' + f);
    s.spawn('tifa', 'tifa', 2, 10, 'right', { name: 'Tifa' });
    s.spawn('barret', 'barret', 1, 9, 'right', { name: 'Barret' });
    s.anim('barret', 'weak');
    yield 20;
    for (const [who, line] of STAIR_TALK[f]) yield s.say(who, line);
    s.stopAnim('barret');
    s.remove('tifa'); s.remove('barret');
  }
  const stairExits = [
    { at: [2, 1, 1, 1], sfx: 'door', run: function* (s) {
        const f = s.inc('c4_flight');
        if (f > FLIGHTS) { s.set('c4_stairs_done'); yield s.goto('shinra_59f', 'from_stairs'); return; }
        yield s.goto(flightMap(f), 'up');
      } },
    { at: [0, 9, 1, 2], run: function* (s) {
        const f = s.inc('c4_flight', -1);
        if (f < 1) { yield s.goto('shinra_back', 'from_stairs'); return; }
        yield s.goto(flightMap(f), 'down');
      } },
  ];
  const stairDef = (extra) => Object.assign({
    name: 'Shinra Bldg. Emergency Stairs', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    look: { wall: '#6a7680', floor: ['#5a5e66', '#565a62'], floor2: ['#70747c', '#6a6e76'] },
    lights: [[3, 2, '#ff5030', 2], [20, 9, '#ffe0a0', 3]],
    grid: STAIR_GRID, heights: STAIR_HEIGHTS,
    entries: { up: [2, 9, 'right'], down: [2, 2, 'down'] },
    exits: stairExits,
    objects: [{ at: [12, 1], talk: function* (s) { yield s.msg(`A painted sign on the wall: "EMERGENCY STAIRS"... The floor number has been scratched off.`); } }],
    onEnter: stairsEnter,
  }, extra);
  FF7.defineMap('shinra_stairs', stairDef({}));
  FF7.defineMap('shinra_stairs_landing', stairDef({
    items: [{ at: [12, 3], item: 'elixir', id: 'c4_stairs_elixir' }],
  }));

  // ------------------------------------------------------------------ 1F lobby
  FF7.defineMap('shinra_lobby', {
    name: 'Shinra Bldg. 1F Lobby', area: 'Midgar', theme: 'shinra',
    music: s => s.flag('c4_rufus_beaten') ? 'hurry' : 'shinra',
    look: { floor: ['#b0b0b8', '#a8a8b0'], wallH: 3.2 },
    battle: { table: 'shinra_1f', bg: 'shinra', music: 'bombing', rate: 0.6, if: s => s.flag('c4_lobby_fight') && !s.flag('c4_captured') },
    lights: [[16, 6, '#fff0d0', 5], [5, 9, '#d0e0ff', 3], [26, 9, '#d0e0ff', 3]],
    grid: [
      "################################",
      "#h++hwhhhhhhEEE##EEEhhhhhhwh++h#",
      "#=^^=.|..................|.=^^=#",
      "#=^^=......................=^^=#",
      "#.............................!#",
      "#....|....................|....#",
      "#..........DDDDDDDDDD..........#",
      "#..............................#",
      "#....|....................|....#",
      "#..ctc....................ctc..#",
      "#..............................#",
      "#....|....................|....#",
      "#..............................#",
      "#hhhhhhhhhhhh++++++hhhhhhhhhhhh#",
    ],
    heights: [
      "00000000000000000000000000000000",
      "00440000000000000000000000004400",
      "02222000000000000000000000022220",
      "02222000000000000000000000022220",
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
    entries: {
      from_plaza: [16, 12, 'up'], from_2f_w: [2, 4, 'down'], from_2f_e: [29, 4, 'down'],
      from_elevator: [16, 2, 'down'], from_escape: [16, 2, 'down'],
    },
    exits: [
      { at: [2, 1, 2, 1], to: 'shinra_2f', entry: 'from_lobby_w' },
      { at: [28, 1, 2, 1], to: 'shinra_2f', entry: 'from_lobby_e' },
      { at: [12, 1, 3, 1], run: function* (s) { yield* FF7.story.c4_elevator(s, 1); } },
      { at: [17, 1, 3, 1], run: function* (s) { yield* FF7.story.c4_elevator(s, 1); } },
      { at: [13, 13, 6, 1], to: 'shinra_plaza', entry: 'from_lobby', sfx: 'door_shinra', if: s => !s.flag('c4_rufus_beaten'),
        blocked: C4.locked("(Shinra troops are pouring in through the front doors. Not that way!)") },
    ],
    npcs: [
      { id: 'recep1', name: 'Receptionist', model: 'receptionist', at: [13, 5], dir: 'down', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) {
          if (s.flag('c4_lobby_fight')) yield s.say('Receptionist', "P-please don't hurt me! I just answer the phones here!");
          else yield s.say('Receptionist', "Welcome to the Shinra Electric Power Company.\f...Um. Do you have an appointment?");
        } },
      { id: 'recep2', name: 'Receptionist', model: 'receptionist', at: [18, 5], dir: 'down', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) {
          yield s.say('Receptionist', "The elevators here only run to the upper floors with a keycard.\fVisitors are supposed to take the stairs to the 2nd floor... I-is that what you wanted to know?");
        } },
      { id: 'emp1', name: 'Employee', model: 'exec', at: [8, 10], dir: 'right', wander: 2, show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) { yield s.say('Employee', "Ever since the Sector 7 plate came down, everyone in this building has been on edge.\fThey say it was terrorists... AVALANCHE."); } },
      { id: 'emp2', name: 'Employee', model: 'woman4', at: [24, 11], dir: 'left', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) { yield s.say('Employee', "Did you hear? The Vice President is supposed to be back from Junon soon.\fThe President's son... I hear he's even colder than his father."); } },
      { id: 'emp3', name: 'Employee', model: 'man6', at: [27, 7], dir: 'down', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) { yield s.say('Employee', "The bulletin board's in the corner there. Nothing but overtime notices and Mako-rate memos...\fAnd somebody keeps pinning up bar flyers."); } },
    ],
    triggers: [
      { at: [30, 4], on: 'talk', run: function* (s) {
          yield s.msg('Shinra, Inc. — Employee Bulletin Board');
          yield s.msg('"NOTICE: Electricity rates to be revised next quarter."\f"Company softball league: the Security Dept. is still looking for a pitcher."\f"Reminder: access above the 60th floor requires an authorized keycard."');
          yield s.msg('Pinned in the corner is a crumpled flyer...');
          yield s.msg("TURTLE'S PARADISE — Flyer No. 2\n\"Wutai's finest pub! Read all six of our flyers\nhidden around the world, then visit us for a prize!\"");
          s.set('c4_flyer_turtle2');
        } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_escape' && FF7.story.c4_lobbyEscape) { yield* FF7.story.c4_lobbyEscape(s); return; }
      if (s.entry() !== 'from_plaza' || s.flag('c4_lobby_fight')) return;
      // ---- the front assault
      s.set('c4_lobby_fight');
      s.spawn('barret', 'barret', 15, 12, 'up', { name: 'Barret' });
      s.spawn('tifa', 'tifa', 17, 12, 'up', { name: 'Tifa' });
      s.spawn('g1', 'soldier', 13, 8, 'down', { name: 'Guard' });
      s.spawn('g2', 'soldier', 19, 8, 'down', { name: 'Guard' });
      yield s.run('barret', 15, 10);
      s.anim('barret', 'shoot'); s.sfx('shot'); s.shake(3, 12);
      yield s.say('barret', "EVERYBODY FREEZE! This buildin's been taken over by AVALANCHE!");
      s.stopAnim('barret');
      s.emote('recep1', '!'); s.emote('recep2', '!'); s.emote('emp1', '!!');
      yield [s.run('emp1', 3, 12, { noWait: true }), s.run('emp2', 30, 12, { noWait: true }), s.run('emp3', 30, 10, { noWait: true })];
      yield 30;
      s.hide('emp1'); s.hide('emp2'); s.hide('emp3');
      yield [s.run('g1', 14, 10), s.run('g2', 18, 10)];
      yield s.say('Guard', "Intruders! Take them down!");
      yield s.battle({ table: 'event_shinra_lobby', bg: 'shinra', music: 'bombing', noEscape: true });
      s.remove('g1'); s.remove('g2');
      yield s.say('barret', "Hah! Is that all Shinra's got?");
      yield s.face('tifa', 'barret');
      yield s.say('tifa', "Barret... you just announced us to the entire building.");
      yield s.say('barret', "...Then we'd better move fast!");
      yield s.say('tifa', "The elevators down here need a keycard. Let's try upstairs.");
      yield [s.run('barret', 16, 7), s.run('tifa', 16, 7)];
      s.remove('barret'); s.remove('tifa');
      s.show('emp1'); s.show('emp2'); s.show('emp3');
    },
  });

  // ------------------------------------------------------------------ 2F showroom + shop
  FF7.defineMap('shinra_2f', {
    name: 'Shinra Bldg. 2F', area: 'Midgar', theme: 'shinra', music: s => s.flag('c4_rufus_beaten') ? 'hurry' : 'shinra',
    battle: { table: 'shinra_2f', bg: 'shinra', music: 'bombing', rate: 0.6, if: s => !s.flag('c4_captured') },
    lights: [[21, 4, '#fff8e0', 4], [3, 3, '#ffe0a0', 3]],
    grid: [
      "##############################",
      "#hhhwhhhhwhhhh++hhhhwhhhhwhhh#",
      "#kkkk........=^^=.._______...#",
      "#............=^^=.._&&&___...#",
      "#DDDD........................#",
      "#..................._M___....#",
      "#............................#",
      "#...|...........|............#",
      "#............................#",
      "#hh++hhhhhhhhhhhhhhhhhhhh++hh#",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000004400000000000000",
      "000000000000022220000000000000",
      "000000000000022220000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_lobby_w: [3, 8, 'up'], from_lobby_e: [26, 8, 'up'], from_3f: [14, 4, 'down'], escape: [18, 7, 'up'] },
    exits: [
      { at: [3, 9, 2, 1], to: 'shinra_lobby', entry: 'from_2f_w' },
      { at: [25, 9, 2, 1], to: 'shinra_lobby', entry: 'from_2f_e' },
      { at: [14, 1, 2, 1], to: 'shinra_3f', entry: 'from_2f' },
    ],
    npcs: [
      { id: 'clerk', name: 'Shop Clerk', model: 'man3', at: [2, 3], dir: 'down', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) {
          const c = yield s.ask('Shop Clerk', "W-welcome to the Shinra company store! Um... everything's full price. Even for... visitors.", ['Buy', 'Nothing']);
          if (c === 0) yield s.shop('shinra_hq_items');
          else yield s.say('Shop Clerk', "Th-thank you! Please don't shoot anything.");
        } },
      { id: 'fan', name: 'Employee', model: 'man8', at: [19, 6], dir: 'up', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) { yield s.say('Employee', "Shinra Motors' newest models... Beautiful, aren't they?\fOn my salary I'll be paying one off until I retire. Still, a guy can look."); } },
      { id: 'guide', name: 'Guide', model: 'receptionist', at: [9, 6], dir: 'down', show: s => !s.flag('c4_rufus_beaten'),
        talk: function* (s) { yield s.say('Guide', "This floor is our public showroom and company store.\fThe stairs lead up to the 3rd floor lounge, where you'll find the express elevator to the upper floors."); } },
    ],
    triggers: [
      { at: [20, 3, 3, 1], on: 'talk', run: function* (s) {
          yield s.msg('A sturdy three-wheeled truck sits on a display stand.\nThe plaque reads: "SHINRA MOTORS — built tough for the new Midgar."');
        } },
      { at: [21, 5], on: 'talk', run: function* (s) {
          yield s.msg('A sleek motorcycle gleams under the showroom lights.\nThe plaque reads: "SHINRA MOTORS — Hardy-Daytona."');
          yield s.say('cloud', "(...Nice bike.)");
        } },
      { at: [1, 2, 4, 1], on: 'talk', run: function* (s) { yield s.msg("Shelves stocked with Shinra-brand potions and souvenir mugs."); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'escape' && FF7.story.c4_showroomEscape) { yield* FF7.story.c4_showroomEscape(s); return; }
    },
  });

  // ------------------------------------------------------------------ 3F lounge (express elevator)
  FF7.defineMap('shinra_3f', {
    name: 'Shinra Bldg. 3F Lounge', area: 'Midgar', theme: 'shinra', music: 'shinra',
    battle: { table: 'shinra_3f', bg: 'shinra', music: 'bombing', rate: 0.6, if: s => !s.flag('c4_captured') },
    lights: [[11, 2, '#d0e8ff', 3]],
    grid: [
      "########################",
      "#hhhwhhhhhEEEEhhhhhwhhh#",
      "#......................#",
      "#..ctc............ctc..#",
      "#......................#",
      "#....|............|....#",
      "#......................#",
      "#.v....................#",
      "#hhhhhhhhhh++hhhhhhhhhh#",
    ],
    entries: { from_2f: [11, 7, 'up'], from_elevator: [11, 2, 'down'] },
    exits: [
      { at: [11, 8, 2, 1], to: 'shinra_2f', entry: 'from_3f' },
      { at: [10, 1, 4, 1], run: function* (s) {
          if (!s.flag('c4_59f_fight')) {
            const c = yield s.ask(null, 'The express elevator. Ride it up?', ['Go up', 'Not yet']);
            if (c !== 0) { yield* C4.stepBack(s); return; }
            s.sfx('door_shinra');
            yield s.goto('shinra_elevator', 'ride_up');
            return;
          }
          yield* FF7.story.c4_elevator(s, 3);
        } },
    ],
    npcs: [
      { id: 'guard', name: 'Guard', model: 'soldier', at: [8, 4], dir: 'down',
        talk: function* (s) {
          if (s.flag('c4_lobby_fight')) {
            yield s.say('Guard', "Wh-what? You're the ones who shot up the lobby!? I-I'm on my break! I didn't see anything!");
          } else yield s.say('Guard', "The express elevator goes all the way to the 59th floor.\fAbove that you need clearance. The top brass don't like visitors.");
        } },
      { id: 'emp', name: 'Employee', model: 'exec', at: [19, 4], dir: 'left',
        talk: function* (s) { yield s.say('Employee', "Every time that elevator stops, somebody new gets on.\fI swear it stops on every other floor. Takes forever."); } },
    ],
    triggers: [
      { at: [2, 7], on: 'talk', run: function* (s) { yield s.msg('A vending machine. "SHINRA COFFEE — now with extra Mako flavor!"\nYou decide to pass.'); } },
    ],
  });

  // ------------------------------------------------------------------ the glass elevator
  // 'ride_up': the front-assault ride from 6F to 59F (one battle per stop, as in FF7).
  // 'escape' : the Hundred Gunner / Heli Gunner fight (part 3).
  const LOW = [0, 1, 2, 3, 0, 1, 2, 3, 1, 3, 0, 3, 2, 0, 1, 2];                // floors 13-28
  const HIGH = { 30: 0, 31: 1, 32: 2, 33: 3, 34: 0, 35: 1, 36: 2, 37: 3, 39: 0, 40: 2, 41: 3, 42: 1, 43: 1,
    44: 0, 45: 3, 46: 2, 48: 3, 49: 1, 50: 0, 51: 1, 52: 3, 53: 0, 54: 2, 55: 2, 57: 0, 58: 3 };  // floors 30-58
  const HITO = [
    "...Uh. I'll take the next one.",
    "Oh. It's you again. ...N-next one's fine.",
    "Are you people following me!?",
    "That's it. I'm taking the stairs from now on.",
  ];
  FF7.story.c4_rideUp = function* (s) {
    s.spawn('barret', 'barret', 5, 3, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 9, 3, 'up', { name: 'Tifa' });
    yield 20;
    yield s.say('barret', "Glass walls, huh? Nice view of the city we're about to trash.");
    yield s.say('tifa', "The panel says we're on the 6th floor. It won't let us pick a floor... it just goes up in jumps.");
    let floor = 6, guard = 0;
    while (floor < 59 && guard++ < 14) {
      yield s.ask(null, `The display reads ${floor}F.`, ['Press the button']);
      const r = s.random(16);
      const step = r < 14 ? 7 + (r >> 1) : (r === 14 ? 14 : 15);
      floor = Math.min(59, floor + step);
      s.sfx('elevator'); s.shake(1, 70);
      yield 70;
      if (floor >= 59) break;
      s.sfx('door_shinra');
      if (floor === 29 || floor === 38 || floor === 47 || floor === 56) {
        const n = s.inc('c4_hito') - 1;
        s.spawn('hito', 'exec', 7, 5, 'up', { name: 'Employee' });
        yield s.msg(`${floor}F. The doors slide open... A Shinra employee stares at the party.`);
        yield s.say('Employee', HITO[Math.min(n, HITO.length - 1)]);
        s.remove('hito');
        continue;
      }
      yield s.msg(`The elevator stops at ${floor}F. Guards rush in!`);
      const f = floor <= 28 ? FF7.data.encounters.shinra_elevator_low[LOW[floor - 13] || 0]
        : FF7.data.encounters.shinra_elevator_high[HIGH[floor] || 0];
      yield s.battle({ formation: f, bg: 'shinra', music: 'bombing', noEscape: true });
    }
    s.sfx('beep');
    yield s.msg('Ding! "59th floor."');
    s.set('c4_ride_done');
    s.remove('barret'); s.remove('tifa');
    yield s.goto('shinra_59f', 'from_elevator');
  };
  FF7.defineMap('shinra_elevator', {
    name: 'Shinra Bldg. Elevator', area: 'Midgar', theme: 'shinra',
    music: s => s.flag('c4_rufus_arrived') ? 'hurry' : 'infiltrate',
    look: { wall: '#5a7088', sky: ['#020308', '#0c1424'] },
    lights: [[7, 3, '#c8e0ff', 4]],
    grid: [
      "################",
      "#wwwwwwwwwwwwww#",
      "#EEEEEEEEEEEEEZ#",
      "#EEEEEEEEEEEEEE#",
      "#EEEEEEEEEEEEEE#",
      "#EEEEEEEEEEEEEE#",
      "################",
    ],
    entries: { ride_up: [7, 4, 'up'], escape: [7, 4, 'up'] },
    onEnter: function* (s) {
      if (s.entry() === 'escape') { if (FF7.story.c4_gunnerFight) yield* FF7.story.c4_gunnerFight(s); return; }
      if (s.entry() === 'ride_up') yield* FF7.story.c4_rideUp(s);
    },
  });

  // ------------------------------------------------------------------ 59F (both routes meet)
  FF7.defineMap('shinra_59f', {
    name: 'Shinra Bldg. 59F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    battle: { table: 'shinra_59f', bg: 'shinra', music: 'bombing', rate: 0.6, if: s => s.flag('c4_59f_fight') && !s.flag('c4_captured') },
    lights: [[11, 3, '#d0e8ff', 3]],
    grid: [
      "##########################",
      "#hhwhhhhhhEEEEhhhhhhwhhhh#",
      "#........................#",
      "#..|...............|.....#",
      "+........................#",
      "#........................#",
      "#....DDD..........DDD....#",
      "#........................#",
      "#..|...............|.....#",
      "#hhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    entries: { from_stairs: [1, 4, 'right'], from_elevator: [11, 2, 'down'] },
    exits: [
      { at: [0, 4, 1, 1], sfx: 'door', run: function* (s) {
          const c = yield s.ask(null, 'Head back down the emergency stairs?', ['Go down', 'Stay']);
          if (c !== 0) { yield* C4.stepBack(s); return; }
          s.setVar('c4_flight', FLIGHTS);
          yield s.goto('shinra_stairs', 'down');
        } },
      { at: [10, 1, 4, 1], run: function* (s) { yield* FF7.story.c4_elevator(s, 59); } },
    ],
    npcs: [
      { id: 'clerk', name: 'Employee', model: 'exec', at: [6, 7], dir: 'up', show: s => s.flag('c4_59f_fight'),
        talk: function* (s) { yield s.say('Employee', "(hiding under the desk) I'm not here. I'm not here. I'm a desk."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c4_59f_fight')) return;
      const stairs = s.entry() === 'from_stairs';
      if (stairs) {
        s.spawn('tifa', 'tifa', 2, 5, 'right', { name: 'Tifa' });
        s.spawn('barret', 'barret', 1, 3, 'right', { name: 'Barret' });
        s.anim('barret', 'kneel');
        yield s.say('barret', "Hff... hff... M-made it... Never... doin' that... again...");
        yield s.say('tifa', "You say that now. We still have to find a way further up.");
        s.stopAnim('barret');
      } else {
        s.spawn('tifa', 'tifa', 13, 2, 'down', { name: 'Tifa' });
        s.spawn('barret', 'barret', 10, 2, 'down', { name: 'Barret' });
      }
      yield 10;
      s.sfx('alarm_short');
      s.spawn('m1', 'soldier', 24, 3, 'left', { name: 'Guard' });
      s.spawn('m2', 'soldier', 24, 5, 'left', { name: 'Guard' });
      s.spawn('m3', 'soldier', 24, 7, 'left', { name: 'Guard' });
      yield [s.run('m1', 16, 3), s.run('m2', 15, 5), s.run('m3', 16, 7)];
      yield s.say('Guard', "Stop right there! Nobody gets past the 59th floor!");
      yield s.say('barret', "Oh yeah? Watch us!");
      yield s.battle({ table: 'event_shinra_59f', bg: 'shinra', music: 'bombing', noEscape: true });
      s.set('c4_59f_fight');
      s.anim('m1', 'lie'); s.anim('m2', 'lie'); s.anim('m3', 'lie');
      yield s.move('player', 15, 4);
      yield s.face('player', 'down');
      yield s.msg(`${s.name('cloud')} searches the guard... and finds a keycard.`);
      yield s.give('keycard_60');
      yield s.say('tifa', "Keycard 60. That should get the elevator working, at least up to the 60th floor.");
      yield s.say('barret', "Then let's quit standin' around. Aeris is waitin'!");
      s.remove('m1'); s.remove('m2'); s.remove('m3');
      s.remove('tifa'); s.remove('barret');
      s.show('clerk');
    },
  });
})();

// Shin-Ra Motor Mobiles promo screen in the 2F showroom (plays the original advert FMV)
(function () {
  FF7.patchMap('shinra_2f', {
    objects: [{ at: [26, 2], talk: function* (s) {
      yield s.msg('A promotional screen in the showroom."SHIN-RA MOTOR MOBILES: building the future of Midgar."');
      const c = yield s.ask(null, 'Watch the promotional video?', ['Watch it', 'Not now']);
      if (c === 0) yield s.movie('shinra_motors_ad');
    } }],
    lights: [[26, 2, '#a0c8ff', 2]],
  });
})();

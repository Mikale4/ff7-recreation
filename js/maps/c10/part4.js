// Chapter 10 (part 4) — The Underwater Reactor and the rocket.
// Junon: up to the city (chapter 5b's maps), the grey service door, the lift down (Submarine Crew),
// the corridors to the reactor (table junon_path; a barking dog guards a side door), the undersea pipe,
// the reactor walkway (save point), the inner reactor (sneak past or talk to the guard, Underwater MPs),
// the dock: Reno and Carry Armor, the red submarine dives with the Huge Materia. The chests: Battle
// Trumpet, Scimitar, Leviathan Scales. The grey submarine: marines, the bridge (fight the captain or
// take the crew hostage) and the chase (s.minigame('submarine')). Win: the Huge Materia and the sub.
// Lose: the Materia is shipped to Rocket Town; the dog runs off and the red sub, back empty, is yours.
// Rocket Town (chapter 7's maps, patched): Shinra has taken over; Shera's warning about the No. 8
// oxygen tank; the Attack Squads, Rude on the gantry, the Senior Grunt and Palmer in the engine room;
// the launch; in space (rocket2_ maps): Cid's code for the Huge Materia, tank No. 8, the escape pod.
// Then back to the Highwind (chapter 11a continues from `highwind_bridge` / `start`). Afterwards the
// old man who watched the rocket hands Cid the Venus Gospel.
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const PARTY = ['cloud', 'barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const mates = (s) => PARTY.filter(id => id !== s.leader() && s.inParty(id));
  function* anyone(s, lines) {
    for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  const won = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win));
  const counter = (at, run) => ({ at, on: 'talk', run });
  const uwWindow = (s) => s.flag('cloud_returned') && !s.flag('c10_uw_done');
  const rocketWindow = (s) => s.flag('c10_uw_done') && !s.flag('huge_materia_rocket');
  const CREW = { base: 'soldier', helmetColor: '#2a3a6a', top: '#2a3a6a', sleeve: '#2a3a6a', bottom: '#2a3a6a' };
  const ENGINEER = { base: 'worker', top: '#d0d0c8', sleeve: '#d0d0c8', bottom: '#8a8a80', hairStyle: 'cap' };

  // ------------------------------------------------------------------ world links
  const C5B_JUNON = !!(FF7.maps.junon_lower && FF7.maps.junon_street1);
  FF7.world.link('junon', C5B_JUNON
    ? { map: 'junon_lower', entry: 'from_world', priority: 10, if: uwWindow }
    : { map: 'uwreactor_gate', entry: 'from_junon', priority: 10, if: uwWindow });
  // Rocket Town itself belongs to chapter 7 (rocket_town, rocket_pad, rocket_engine, rocket_cid_house).
  FF7.world.link('rocket_town', FF7.maps.rocket_town
    ? { map: 'rocket_town', entry: 'from_world', priority: 10, if: rocketWindow }
    : { priority: 10, if: rocketWindow, run: function* (s) { yield s.msg("Shinra soldiers guard every road into Rocket Town. The rocket on the hill is being fuelled for launch."); } });

  // ================================================================== JUNON: the way down
  FF7.patchMap('junon_lower', {
    onEnter: function* (s) {
      if (!uwWindow(s) || s.flag('c10_uw_intro')) return;
      s.set('c10_uw_intro');
      yield s.say(s.leader(), "The Underwater Reactor is somewhere under Junon. The way down should be up in the city.\fThe elevator's by the guard post.");
    },
  });
  FF7.patchMap('junon_street1', {
    triggers: [
      counter([34, 3, 3, 1], function* (s) {
        if (!uwWindow(s)) { yield s.msg("A grey steel door. 'AUTHORIZED PERSONNEL ONLY.' It's locked."); return; }
        yield s.msg("A grey steel door marked 'AUTHORIZED PERSONNEL ONLY — REACTOR ACCESS'.\nSomeone left it unlatched in a hurry.");
        const c = yield s.ask(null, '', ['Go through', 'Not now']);
        if (c === 0) yield s.goto('uwreactor_gate', 'from_junon');
      }),
    ],
    onEnter: function* (s) {
      if (!uwWindow(s) || s.flag('c10_uw_cannon')) return;
      s.set('c10_uw_cannon');
      yield s.say(s.leader(), "......The cannon's gone.");
      yield* anyone(s, [['barret', "The big gun that was sittin' on top of this place? Where'd they take it?"], ['cid', "Somebody walked off with the biggest gun in the world? Hell of a thing to misplace."]]);
      yield* anyone(s, [['caitsith', "...It's been hauled off to Midgar. Don't ask me what for. I'm not sure I want to know."]]);
      yield s.say(s.leader(), "The reactor first. There's supposed to be a service door off this street — east end, past the shops.");
    },
  });

  // ------------------------------------------------------------------ the grey corridor & service lift
  FF7.defineMap('uwreactor_gate', {
    name: 'Junon Service Corridor', area: 'Junon', theme: 'shinra', music: 'shinra',
    look: { floor: ['#6a7078', '#646a72'], wall: '#707888', trim: '#3a404a' },
    grid: [
      "########################",
      "#PPPPPPhhhhhhhhhhPP#EEE#",
      "+..................#EEE#",
      "+...........Z.......EEE#",
      "#......o............EEE#",
      "#..B..........B.....EEE#",
      "#PPP====PPPP====PPP#EEE#",
      "########################",
    ],
    entries: { from_junon: [2, 3, 'right'], from_lift: [18, 3, 'left'] },
    exits: [
      { at: [0, 2, 1, 2], run: function* (s) {
          if (C5B_JUNON) yield s.goto('junon_street1', 'from_apt');
          else yield s.world('junon');
        } },
    ],
    triggers: [
      { at: [20, 1, 3, 6], run: function* (s) {
          const c = yield s.ask(null, "A service lift. Ride it down toward the reactor?", ['Go down', 'Not yet']);
          if (c !== 0) { yield s.move('player', 18, 3); return; }
          s.sfx('elevator');
          s.shake(1, 60);
          if (!s.flag('c10_lift_fight')) {
            s.set('c10_lift_fight');
            yield s.msg("Halfway down, the lift jolts to a stop. Two men in navy uniforms turn around.");
            yield s.say('Submarine Crew', "Hey! You're not on the duty roster!");
            yield s.battle({ enemies: ['submarine_crew', 'submarine_crew'], bg: 'junon', noEscape: true });
          }
          yield s.goto('uwreactor_path', 'from_lift');
        } },
    ],
    objects: [{ at: [12, 3], talk: function* (s) { yield s.msg("A maintenance terminal. 'Submarine dock: loading in progress. Underwater Reactor: Huge Materia extraction complete.'"); } }],
  });

  // ------------------------------------------------------------------ the corridors down (and the barking dog)
  FF7.defineMap('uwreactor_path', {
    name: 'Junon Lower Passage', area: 'Junon', theme: 'shinra', music: 'shinra',
    look: { floor: ['#5a6068', '#545a62'], wall: '#606878', trim: '#303640', sky: ['#05080c', '#101820'] },
    battle: { table: 'junon_path', bg: 'junon', rate: 1, if: s => !s.flag('c10_uw_done') },
    grid: [
      "####################################",
      "#EEE#PPPPPPPPhh+hhPPPPPPPPPPPPPPPPP#",
      "#EEE...............................#",
      "#EEE.........Z.............B.......#",
      "#.....o.........................P..#",
      "#PPPP======PPPPPP....PPPPPP=====PP.#",
      "#.......M..........M..........M.....",
      "#...................................",
      "#.....B.......o...........B........#",
      "####################################",
    ],
    entries: { from_lift: [5, 3, 'right'], from_pipe: [33, 7, 'left'], from_sub: [15, 3, 'down'], from_pen: [15, 2, 'down'] },
    exits: [
      { at: [35, 6, 1, 2], to: 'uwreactor_pipe', entry: 'from_path' },
      { at: [15, 1, 1, 1], to: 'sub_pen', entry: 'from_path', if: s => s.flag('c10_sub_lost'),
        blocked: function* (s) { yield s.say('Dog', "Grrrr...... WOOF! WOOF!"); } },
    ],
    npcs: [
      { id: 'guard_dog', name: 'Dog', model: { base: 'dog', c1: '#3a3028', c2: '#8a6a40' }, at: [15, 2], dir: 'down', show: s => !s.flag('c10_sub_lost'),
        talk: function* (s) { yield s.say('Dog', "Grrrr...... WOOF! WOOF! WOOF!"); yield s.msg("A big guard dog plants itself in front of the door and won't budge."); } },
    ],
    triggers: [
      { at: [1, 1, 3, 3], run: function* (s) {
          const c = yield s.ask(null, "Ride the lift back up to the city?", ['Go up', 'Stay']);
          if (c !== 0) { yield s.move('player', 5, 3); return; }
          s.sfx('elevator');
          yield s.goto('uwreactor_gate', 'from_lift');
        } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_lift' && !s.flag('c10_path_fight')) {
        s.set('c10_path_fight');
        s.spawn('crew1', CREW, 9, 3, 'left', { name: 'Submarine Crew' });
        s.spawn('crew2', CREW, 9, 4, 'left', { name: 'Submarine Crew' });
        yield s.say('Submarine Crew', "Intruders in the reactor passage! Stop right there!");
        yield s.battle({ enemies: ['submarine_crew', 'submarine_crew'], bg: 'junon', noEscape: true });
        s.remove('crew1'); s.remove('crew2');
        return;
      }
      if (s.entry() === 'from_sub' && !s.flag('c10_dog_gone')) {
        s.set('c10_dog_gone');
        yield s.msg("Back in Junon. The guard dog that was blocking the side door is nowhere to be seen.");
        yield s.say(s.leader(), "That door the dog was guarding... the red submarine's dock is back there. If it's returned, maybe it's ours for the taking.");
      }
    },
  });

  // ------------------------------------------------------------------ the undersea pipe
  FF7.defineMap('uwreactor_pipe', {
    name: 'Undersea Pipe', area: 'Junon', theme: 'underwater', music: 'deepsea',
    // refs 14-hugemateria40, 41: a glass tube on the sea floor, ribbed with steel rings, fish drifting past:
    // 'glassarch' sections turned to run east-west (rot 90), each one tile long stretched to four (scale), so
    // the steel ribs stand every two metres
    look: { water: '#0a3a5a', floor2: ['#4a6068', '#445a62'], wall: '#8a9aa8', trim: '#9aaab8', sky: ['#020a18', '#0a3a6a'], fog: { color: [0.02, 0.12, 0.24], near: 6, far: 20 } },
    camera: { yaw: -70, pitch: 30, dist: 8 },
    battle: { table: 'underwater_pipe', bg: 'underwater', rate: 1, if: s => !s.flag('c10_uw_done') },
    grid: [
      "                                      ",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "======================================",
      "gggggggggggggggggggggggggggggggggggggg",
      "gggggggggggggggggggggggggggggggggggggg",
      "gggggggggggggggggggggggggggggggggggggg",
      "======================================",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    props: [0.5, 4.5, 8.5, 12.5, 16.5, 20.5, 24.5, 28.5, 32.5, 36.5].map(x => ({ at: [x, 5], prop: 'glassarch', rot: 90, len: 1, r: 3.8, scale: [1, 1, 4] })),
    lights: [[10, 5, '#60a0ff', 3], [27, 5, '#60a0ff', 3]],
    entries: { from_path: [1, 5, 'right'], from_walkway: [36, 5, 'left'] },
    exits: [
      { at: [0, 4, 1, 3], to: 'uwreactor_path', entry: 'from_pipe' },
      { at: [37, 4, 1, 3], to: 'uwreactor_walkway', entry: 'from_pipe' },
    ],
    triggers: [
      { id: 'pipe_view', at: [12, 4, 1, 3], run: function* (s) {
          yield s.msg("Through the thick glass, dark water presses in on every side. Somewhere far above is the surface.");
        } },
    ],
  });

  // ------------------------------------------------------------------ reactor walkway (save point)
  FF7.defineMap('uwreactor_walkway', {
    name: 'Underwater Reactor', area: 'Junon', theme: 'underwater', music: 'deepsea',
    battle: { table: 'underwater_reactor_walkway', bg: 'underwater', rate: 1, if: s => !s.flag('c10_uw_done') },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XPP+PPPPPX PPPPPPPPPPPPPPPPPPPPPPPPX",
      "X.......X                          X",
      "X...S...X   y       y       y      X",
      "X.......+zzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "X.......Xzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      "X...B...X                          X",
      "X.......X   y       y       y      X",
      "XPPPPPPPX                          X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    lights: [[4, 3, '#a0c0ff', 2], [20, 4, '#40ff90', 4]],
    entries: { from_pipe: [34, 4, 'left'], from_core: [3, 2, 'down'] },
    exits: [
      { at: [35, 4, 1, 2], to: 'uwreactor_pipe', entry: 'from_walkway' },
      { at: [3, 1, 1, 1], to: 'uwreactor_core', entry: 'from_walkway', sfx: 'door_shinra' },
    ],
  });

  // ------------------------------------------------------------------ inner reactor: the Huge Materia is gone
  FF7.defineMap('uwreactor_core', {
    name: 'Underwater Reactor Core', area: 'Junon', theme: 'underwater', music: 'deepsea',
    look: { mako: '#40ff90', wall: '#4a5a6a', wallTop: '#2a3440' },
    camera: { pitch: 60, dist: 11 },   // ref 14-hugemateria34: the core seen from high above
    battle: { table: 'underwater_reactor_chamber', bg: 'underwater', rate: 0.8, if: s => !s.flag('c10_uw_done') },
    grid: [
      "##############################",
      "#PPPP+PPPyyyyyyyyyyyyPPPPPPPP#",
      "#........zz**********.......M#",
      "#...Z....*zz*********.......M#",
      "#........**zzz*******........#",
      "#........****zz***UU*........#",
      "#........*****zzz*UU*........#",
      "#........*******zz***........#",
      "#........********zzzz.....B..#",
      "#PPPPPPPPPPPPPPPPPPPPPPP+PPPP#",
      "##############################",
    ],
    lights: [[15, 5, '#40ff90', 5], [18, 5, '#80ffc0', 3]],
    entries: { from_walkway: [5, 2, 'down'], from_dock: [24, 8, 'up'] },
    exits: [
      { at: [5, 1, 1, 1], to: 'uwreactor_walkway', entry: 'from_core', sfx: 'door_shinra' },
      { at: [24, 9, 1, 1], to: 'uwreactor_dock', entry: 'from_core', sfx: 'door_shinra' },
    ],
    npcs: [
      { id: 'core_guard', name: 'Submarine Crew', model: CREW, at: [6, 5], dir: 'up', show: s => !s.flag('c10_core_guard'),
        talk: function* (s) {
          yield s.say('core_guard', "Huh? Who're you? ...Wait. You're those terrorists! Everybody, over here!");
          s.set('c10_core_guard');
          yield s.battle({ enemies: ['submarine_crew'], bg: 'underwater', music: 'hurry', noEscape: true });
          yield s.say('Submarine Crew', "Reinforcements! Don't let them reach the dock!");
          yield s.battle({ enemies: ['submarine_crew', 'submarine_crew'], bg: 'underwater', music: 'hurry', noEscape: true });
          s.hide('core_guard');
        } },
    ],
    triggers: [
      { id: 'sneak', at: [9, 2, 2, 1], if: s => !s.flag('c10_core_guard'),
        run: function* (s) {
          s.set('c10_core_guard');
          s.hide('core_guard');
          yield s.say('Submarine Crew', "There they are! Surround them!");
          yield s.battle({ formation: { e: ['submarine_crew', 'submarine_crew', 'submarine_crew'], type: 'pincer' }, bg: 'underwater', music: 'hurry', noEscape: true });
        } },
      { id: 'mps', at: [21, 8, 1, 1], run: function* (s) {
          s.spawn('ump1', 'mp', 23, 7, 'left', { name: 'Underwater MP' });
          s.spawn('ump2', 'mp', 23, 8, 'left', { name: 'Underwater MP' });
          yield s.say('Underwater MP', "Halt! Nobody goes near the submarine dock!");
          yield s.battle({ enemies: ['underwater_mp', 'underwater_mp'], bg: 'underwater', music: 'hurry', noEscape: true });
          s.remove('ump1'); s.remove('ump2');
        } },
      counter([18, 5, 2, 2], function* (s) { yield s.msg("An empty cradle of clamps and cables hangs over the Mako. Whatever it held has already been hauled away toward the dock."); }),
    ],
    onEnter: function* (s) {
      if (s.flag('c10_core_seen')) return;
      s.set('c10_core_seen');
      yield s.say(s.leader(), "The Huge Materia's clamps are empty. They've already moved it... to the submarine dock!");
    },
  });

  // ------------------------------------------------------------------ the submarine dock: Reno & Carry Armor
  FF7.defineMap('uwreactor_dock', {
    name: 'Underwater Reactor Sub Dock', area: 'Junon', theme: 'underwater', music: 'deepsea',
    look: { water: '#0a3050' },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XPP+PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPX",
      "X......................................X",
      "X.B..................o................BX",
      "X..............zz..............zz......X",
      "X~~~~~~~~~~~~~~zz~~~~~~~~~~~~~~zz~~~~~~X",
      "X~~~~~~~~~~~~~~~~~~~~~~~~~~~~&&&&&&&&~~X",
      "X~~~~~~~~~~~~~~~~~~~~~~~~~~~~&&&&&&&&~~X",
      "X~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~X",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    ],
    lights: [[16, 5, '#ff6040', 3], [32, 6, '#a0c0ff', 3]],
    entries: { from_core: [3, 2, 'down'], from_sub: [32, 4, 'up'] },
    chests: [
      { at: [2, 2], item: 'battle_trumpet', id: 'uwreactor_dock_trumpet' },
      { at: [37, 2], item: 'scimitar', id: 'uwreactor_dock_scimitar' },
      { at: [36, 3], item: 'leviathan_scales', id: 'uwreactor_dock_scales' },
    ],
    exits: [
      { at: [3, 1, 1, 1], to: 'uwreactor_core', entry: 'from_dock', sfx: 'door_shinra' },
      { at: [31, 5, 2, 1], to: 'sub_hall', entry: 'from_dock', if: s => s.flag('c10_carry_beaten'),
        blocked: function* (s) { yield s.msg("A guard waves you off the gangway."); } },
    ],
    triggers: [
      counter([15, 4, 2, 2], function* (s) { yield s.msg("An empty berth. Rings of bubbles still spread across the water where the red submarine dove."); }),
      { id: 'reno', at: [6, 2, 3, 2], run: function* (s) { yield* carryArmor(s); } },
      { id: 'greydock', at: [28, 2, 3, 3], if: s => s.flag('c10_carry_beaten'),
        run: function* (s) {
          s.spawn('gd1', CREW, 32, 3, 'left', { name: 'Submarine Crew' });
          s.spawn('gd2', CREW, 33, 4, 'left', { name: 'Submarine Crew' });
          yield s.say('Submarine Crew', "This sub's leaving with the next shipment! Get lost!");
          yield s.battle({ enemies: ['submarine_crew', 'submarine_crew'], bg: 'underwater', music: 'hurry', noEscape: true });
          s.remove('gd1'); s.remove('gd2');
          yield s.say(s.leader(), "That grey submarine... If we take it, we can still catch the red one!");
        } },
    ],
  });

  function* carryArmor(s) {
    s.spawn('reno', 'reno', 15, 3, 'left', { name: 'Reno' });
    s.music('turks');
    yield s.say('reno', "Yo! Long time no see. Too bad, you just missed the boat.\fThe red sub dove about a minute ago. Huge Materia and all. Bound for Rocket Town, if you wanna know.");
    yield s.say(s.leader(), "Reno!");
    yield s.say('reno', "Don't look at me like that. I'm just here to see our new toy in action.\fThe engineers built it special. I figured you'd make a great test run.");
    s.shake(4, 40);
    s.sfx('alarm_short');
    yield s.say('reno', "Say hi to Carry Armor. ...Later!");
    yield s.run('reno', 3, 1);
    s.remove('reno');
    s.spawn('carry', { enemy: 'carry_armor', scale: 0.6 }, 12, 4, 'left', { name: 'Carry Armor' });
    yield s.battle({ enemies: ['carry_armor', 'left_arm', 'right_arm'], bg: 'underwater', music: 'boss', noEscape: true });
    s.remove('carry');
    s.set('c10_carry_beaten');
    s.music('deepsea');
    yield* anyone(s, [['barret', "Scrap metal! Now where's that damn submarine!?"], ['cid', "Big ol' junk heap. Now where'd that sub go!?"]]);
    yield s.say(s.leader(), "Gone... but there's another one at the far berth. The grey one.");
  }

  // ------------------------------------------------------------------ the grey submarine
  FF7.defineMap('sub_hall', {
    // ref 14-hugemateria31: the submarine's main passage - a grated walkway between walls of pipe bundles,
    // instrument racks and lockers, dim red-violet light, a red lamp over the hatch to the bridge
    name: 'Shinra Submarine', area: 'Junon', theme: 'ship', music: 'hurryfaster',
    look: { floor: ['#44424a', '#403e46'], wall: '#4e4a56', trim: '#6a2a2a', wallTex: 'panel', floorTex: { floor: 'metal' }, metal: ['#8a6a5e', '#5a5a66'],
      sky: ['#000000', '#000000'], indoor: true, ambient: [0.32, 0.27, 0.36], light: [0.74, 0.56, 0.66] },
    camera: { yaw: 24, pitch: 42, dist: 9 },
    legend: { K: 'console' },
    grid: [
      "########################",
      "#PPKPPPqqPPPKPPPPKPPP+P#",
      "#......................#",
      "+gggSgggggggggggggggggg#",
      "#......................#",
      "#..q.....K.......q.....#",
      "#PPPPPPPPPPPPPPPPPPPPPP#",
      "########################",
    ],
    props: [
      { at: [3, 1], style: 'tall', col2: '#e060c0' }, { at: [12, 1], style: 'tall', col2: '#60e0b0' }, { at: [17, 1], style: 'tall', col2: '#e0a040' },
      { at: [9, 5], rot: 180, col2: '#60e0b0' },
    ],
    lights: [[21, 2, '#ff3020', 2.6], [6, 3, '#c080ff', 3], [14, 3, '#c080ff', 3]],
    entries: { from_dock: [2, 3, 'right'], from_bridge: [21, 2, 'down'] },
    exits: [
      { at: [0, 3, 1, 1], to: 'uwreactor_dock', entry: 'from_sub', sfx: 'door_shinra' },
      { at: [21, 1, 1, 1], to: 'sub_bridge', entry: 'from_hall', sfx: 'door_shinra' },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_subhall_fight')) return;
      s.set('c10_subhall_fight');
      s.spawn('mar1', CREW, 12, 2, 'left', { name: 'Submarine Crew' });
      s.spawn('mar2', CREW, 12, 4, 'left', { name: 'Submarine Crew' });
      yield s.say('Submarine Crew', "Boarders! Boarders in the main hall!");
      yield s.battle({ formation: { e: ['submarine_crew', 'submarine_crew', 'submarine_crew'], type: 'pincer' }, bg: 'ship', music: 'hurryfaster', noEscape: true });
      s.remove('mar1'); s.remove('mar2');
    },
  });

  function* subChase(s) {
    yield s.say(s.leader(), "Take us after that red submarine. Now!");
    s.music('none');
    const r = yield s.minigame('submarine');
    s.set('c10_uw_done');
    if (won(r)) {
      s.music('highwind');
      yield s.msg("The torpedo strikes home. The red submarine shudders, lists, and sinks slowly toward the sea floor.");
      yield s.say(s.leader(), "We'll salvage the Huge Materia from the wreck. It's not going anywhere now.");
      yield s.msg("The Huge Materia was recovered from the sunken red submarine.");
      s.set('huge_materia_underwater');
      yield s.give('huge_materia_underwater');
      s.set('has_submarine');
      yield s.msg("The grey Shinra submarine is now yours.\n(Press the vehicle button at sea to dive or surface.)");
      yield s.world({ x: 216, y: 184, vehicle: 'submarine' });
      return;
    }
    s.set('c10_sub_lost');
    yield s.msg("The red submarine slips away into the deep, the Huge Materia still in its hold.");
    yield* anyone(s, [['caitsith', "It's headed back to Junon to hand the Materia off... then it goes by air, to Rocket Town."], ['cid', "Rocket Town... It's goin' straight into my rocket."]]);
    yield s.msg("With its torpedo tubes jammed, the grey submarine limps back to Junon.");
    yield s.goto('uwreactor_path', 'from_sub');
  }

  FF7.defineMap('sub_bridge', {
    name: 'Submarine Bridge', area: 'Junon', theme: 'ship', music: 'hurryfaster',
    // ref 14-hugemateria32: a cramped bridge lit green by its instruments - the big sonar/chart display
    // over the front consoles, banks of consoles curving round both sides, crew seated at their stations,
    // the captain at the periscope in the middle; seen from behind, looking forward
    look: { floor: ['#34403e', '#303c3a'], wall: '#44524e', trim: '#5a2a24', wallTex: 'panel', floorTex: { floor: 'grate' }, metal: ['#5a6a66', '#4a5a56'],
      sky: ['#000000', '#000000'], indoor: true, ambient: [0.3, 0.42, 0.38], light: [0.52, 0.82, 0.68] },
    camera: { pitch: 34, dist: 8 },
    legend: { K: 'block', '[': 'pilotseat', p: 'periscope' },
    grid: [
      "###############",
      "#KKKKKKKKKKKKK#",
      "#K.[...[...[.K#",
      "#K.....p.....K#",
      "#K...........K#",
      "#P...........P#",
      "#q...........q#",
      "#######+#######",
    ],
    props: [
      { at: [7, 0], prop: 'screen', w: 5, h: 1.0, y: 1.62, style: 'sonar', col: '#50f090' },
      { at: [3, 0], prop: 'screen', w: 3, h: 0.62, y: 1.72, style: 'map', col: '#40d0a0' },
      { at: [11, 0], prop: 'screen', w: 3, h: 0.62, y: 1.72, style: 'grid', col: '#60c0ff' },
      { at: [1, 1], prop: 'console', style: 'tall', col2: '#60f0a0' }, { at: [5, 1], prop: 'console', style: 'tall', col2: '#ffb040' },
      { at: [9, 1], prop: 'console', style: 'tall', col2: '#ffb040' }, { at: [13, 1], prop: 'console', style: 'tall', col2: '#60f0a0' },
      { at: [3, 1], prop: 'console', w: 3, col2: '#60f0a0' }, { at: [7, 1], prop: 'console', w: 3, screen: 'sonar', col2: '#60ff90' },
      { at: [11, 1], prop: 'console', w: 3, screen: 'map', col2: '#60d0ff' },
      { at: [1, 3], prop: 'console', w: 3, rot: 90, col2: '#50e0a0' }, { at: [13, 3], prop: 'console', w: 3, rot: -90, col2: '#50e0a0' },
      { at: [3, 2], rot: 180, col: '#4a3a30' }, { at: [7, 2], rot: 180, col: '#6a2a24' }, { at: [11, 2], rot: 180, col: '#4a3a30' },
    ],
    lights: [[7, 2, '#90e8b0', 2.6], [7, 6, '#ff5040', 1.8]],
    entries: { from_hall: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 1, 1], to: 'sub_hall', entry: 'from_bridge', sfx: 'door_shinra' }],
    npcs: [
      { id: 'sub_captain', name: 'Captain', model: { base: 'soldier_red' }, at: [7, 4], dir: 'up', show: s => !s.flag('c10_bridge_taken'),
        talk: function* (s) { yield* takeBridge(s); } },
      { id: 'sub_crewA', name: 'Submarine Crew', model: CREW, at: [3, 2], dir: 'up', anim: 'sit', hover: 0.14, show: s => !s.flag('c10_bridge_taken') },
      { id: 'sub_crewB', name: 'Submarine Crew', model: CREW, at: [11, 2], dir: 'up', anim: 'sit', hover: 0.14, show: s => !s.flag('c10_bridge_taken') },
      { id: 'sub_hostA', name: 'Submarine Crew', model: CREW, at: [7, 2], dir: 'up', anim: 'sit', hover: 0.14, show: s => s.flag('c10_hostages') && !s.flag('c10_uw_done'),
        talk: function* (s) { yield s.say('Submarine Crew', "I-I'm steering! I'm steering! Just point that thing somewhere else!"); } },
    ],
    triggers: [
      counter([6, 1, 3, 1], function* (s) {
        if (!s.flag('c10_bridge_taken')) { yield s.msg("The crew is still at their stations."); return; }
        if (s.flag('c10_uw_done')) return;
        yield s.msg("The submarine's control panel. 'Torpedo tubes: loaded. Sonar: tracking 1 target (red).'");
        const c = yield s.ask(null, "Go after the red submarine?", ['Start the chase', 'Not yet']);
        if (c === 0) yield* subChase(s);
      }),
    ],
    onEnter: function* (s) {
      if (s.flag('c10_bridge_taken')) return;
      yield* takeBridge(s);
    },
  });

  function* takeBridge(s) {
    if (s.flag('c10_bridge_taken')) return;
    yield s.face('sub_captain', 'player');
    yield s.say('sub_captain', "What the...!? Hey — wait, don't I know you? You're the lousy recruit from the parade in Junon!\fAnd look at those two... you were in the parade too!");
    yield s.say('Submarine Crew', "Captain! They've taken the hall! What do we do!?");
    const c = yield s.ask(s.leader(), '', ['Fight them!', 'Take them hostage']);
    if (c === 0) {
      yield s.say('sub_captain', "All hands! Repel boarders!");
      yield s.battle({ enemies: ['submarine_crew', 'submarine_crew', 'captain'], bg: 'ship', music: 'rufus', noEscape: true });
      s.hide('sub_captain'); s.hide('sub_crewA'); s.hide('sub_crewB');
      yield s.msg("The crew is subdued and bundled out of the bridge.");
    } else {
      yield s.say(s.leader(), "Nobody has to get hurt. Hands where I can see them — and do exactly what I say.");
      yield s.say('sub_captain', "...Y-you win. Don't shoot! We'll drive, we'll drive!");
      s.set('c10_hostages');
      s.hide('sub_captain'); s.hide('sub_crewB');
      s.place('sub_crewA', 7, 2, 'up');   // into the helmsman's seat
      s.anim('sub_crewA', 'sit');
    }
    s.set('c10_bridge_taken');
    yield s.say(s.leader(), "The red sub can't have gotten far. Get us moving!");
    yield* subChase(s);
  }

  // ------------------------------------------------------------------ past the barking dog: the red submarine (if the chase was lost)
  FF7.defineMap('sub_pen', {
    name: 'Junon Submarine Dock', area: 'Junon', theme: 'underwater', music: 'deepsea',
    look: { water: '#0a3050', floor: ['#5a6068', '#545a62'] },
    battle: { table: 'junon_path_sub_dock', bg: 'junon', rate: 1, if: s => !s.flag('has_submarine') },
    grid: [
      "############################",
      "#PPPPPPPPPP+PPPPPPPPPPPPPPP#",
      "#..........................#",
      "#..B..............o........#",
      "#..............zz..........#",
      "#~~~~~~~~~~~~~~zz~~~~~~~~~~#",
      "#~~~~~~~~~~&&&&&&&&~~~~~~~~#",
      "#~~~~~~~~~~&&&&&&&&~~~~~~~~#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~#",
      "############################",
    ],
    entries: { from_path: [11, 2, 'down'] },
    exits: [
      { at: [11, 1, 1, 1], to: 'uwreactor_path', entry: 'from_pen', sfx: 'door_shinra' },
      { at: [15, 5, 2, 1], run: function* (s) {
          if (s.flag('has_submarine')) return;
          yield s.msg("The red submarine rides at anchor, its hold empty. Its crew is still aboard.");
          const c = yield s.ask(null, "Board the red submarine?", ['Board it', 'Not yet']);
          if (c !== 0) return;
          yield s.say('Submarine Crew', "Wha— the terrorists!? Man your stations!");
          yield s.battle({ enemies: ['submarine_crew', 'submarine_crew'], bg: 'ship', music: 'hurryfaster', noEscape: true });
          yield s.say('Captain', "You'll never take this vessel!");
          yield s.battle({ enemies: ['submarine_crew', 'submarine_crew', 'captain'], bg: 'ship', music: 'rufus', noEscape: true });
          s.set('has_submarine');
          s.music('highwind');
          yield s.msg("The red Shinra submarine is now yours.\n(Press the vehicle button at sea to dive or surface.)");
          yield s.world({ x: 216, y: 184, vehicle: 'submarine' });
        } },
    ],
  });

  // ================================================================== ROCKET TOWN (Shinra-occupied, chapter 7's maps)
  // The old man who watched the rocket every day: once No. 26 has flown, the Venus Gospel.
  function* venusGospel(s) {
    if (s.flag('c10_venus_gospel')) { yield s.say('Old Man', "Every night I look up and think of her, up there among the stars. Take good care of that spear, Cid."); return; }
    const n = s.inc('c10_oldman_talks');
    if (n === 1) { yield s.say('Old Man', "She's gone... I watched her climb until she was just a spark in the sky.\fI waited my whole life to see that rocket fly."); return; }
    if (n === 2) { yield s.say('Old Man', "You were aboard her, weren't you? I can tell. You've got stardust in your eyes. Heh heh..."); return; }
    yield s.say('Old Man', "I've been keeping something for the day No. 26 finally flew. A spear — I polished it every morning and dreamed.\fI've no use for it. Cid, you take it. You flew her.");
    s.set('c10_venus_gospel');
    yield s.give('venus_gospel');
    if (s.inParty('cid')) yield s.say('cid', "......Heh. Thanks, old-timer. I'll make it sing.");
  }
  {
    const c7Old = FF7.story.c7_rocketOldman;
    if (typeof c7Old === 'function') {
      FF7.story.c7_rocketOldman = function* (s) {
        if (s.flag('huge_materia_rocket') || s.flag('c10_venus_gospel')) { yield* venusGospel(s); return; }
        yield* c7Old(s);
      };
    }
  }

  function* cidJoins(s) {
    if (s.inParty('cid')) return;
    yield s.say('cid', "Hold it! You ain't goin' near my rocket without me!");
    const keep = mates(s).filter(id => id !== 'cid').slice(0, 1);
    s.party([s.leader(), 'cid'].concat(keep));
    yield s.msg(s.name('cid') + ' joined the party.');
  }
  FF7.patchMap('rocket_town', {
    npcs: [
      { id: 'c10_rt_sold1', name: 'Shinra Soldier', model: 'soldier', at: [16, 3], dir: 'down', show: rocketWindow,
        talk: function* (s) { yield s.say('Shinra Soldier', "Rocket Town is under Shinra authority until the launch. Move along."); } },
      { id: 'c10_rt_sold2', name: 'Shinra Soldier', model: 'soldier', at: [23, 3], dir: 'down', show: rocketWindow,
        talk: function* (s) { yield s.say('Shinra Soldier', "The launch pad is off-limits. Orders are to stop anybody who goes near that rocket. Anybody."); } },
      { id: 'c10_rt_sold3', name: 'Shinra Soldier', model: 'soldier', at: [26, 22], dir: 'left', show: rocketWindow, wander: 2,
        talk: function* (s) { yield s.say('Shinra Soldier', "A whole squad to guard one rusty old rocket? ...Hey, I don't ask questions. I just stand here."); } },
    ],
    triggers: [
      { id: 'c10_cid_joins', at: [17, 1, 6, 1], once: false, if: s => rocketWindow(s) && !s.inParty('cid'), run: cidJoins },
    ],
    onEnter: function* (s) {
      if (!rocketWindow(s) || s.flag('c10_rt_intro')) return;
      s.set('c10_rt_intro');
      yield s.say(s.leader(), "Shinra soldiers everywhere... They've taken over the whole town.");
      yield s.say('cid', "They're really gonna do it. They're gonna fire MY rocket, stuffed full of Huge Materia, straight at Meteor.\f...Not without me they ain't. Up the hill, to the launch pad!");
    },
  });
  FF7.patchMap('rocket_cid_house', {
    onEnter: function* (s) {
      if (!rocketWindow(s) || !s.inParty('cid') || s.flag('c10_shera_warn')) return;
      s.set('c10_shera_warn');
      yield s.face('shera', 'player');
      yield s.say('Shera', "Captain! You're back... Shinra came in the night. They've taken the launch pad. They say the rocket is finally going up.");
      yield s.say('cid', "Yeah. With a belly full of Huge Materia, aimed right at Meteor. I heard.");
      yield s.say('Shera', "Captain... the No. 8 oxygen tank. I've checked it for years, and it still isn't right.\fIf that rocket goes up... please. Be careful of tank No. 8.");
      yield s.say('cid', "Aw, not this again! That tank's fine! Quit your worryin' and... make the damn tea or somethin'.");
      yield s.say('Shera', "......Yes, Captain.");
    },
  });

  // ------------------------------------------------------------------ the launch pad: Attack Squads and Rude
  FF7.patchMap('rocket_pad', {
    triggers: [
      { id: 'c10_squad1', at: [1, 12, 32, 1], if: rocketWindow, run: function* (s) {
          s.spawn('as1', 'soldier', 14, 10, 'down', { name: 'Attack Squad' });
          s.spawn('as2', 'soldier', 18, 10, 'down', { name: 'Attack Squad' });
          yield s.say('Attack Squad', "Halt! The launch site is under Shinra control! ...It's them! Open fire!");
          yield s.battle({ enemies: ['attack_squad', 'attack_squad'], bg: 'rocket', music: 'hurry', noEscape: true });
          s.remove('as1'); s.remove('as2');
        } },
      { id: 'c10_squad2', at: [21, 7, 2, 3], if: rocketWindow, run: function* (s) {
          yield s.say('Attack Squad', "Stop them before they reach the gantry!");
          yield s.battle({ enemies: ['attack_squad', 'attack_squad', 'senior_grunt'], bg: 'rocket', music: 'hurry', noEscape: true });
        } },
      { id: 'c10_rude', at: [12, 5, 10, 1], if: s => rocketWindow(s) && !s.flag('c10_rude_beaten'), run: function* (s) { yield* rudeFight(s); } },
    ],
    onEnter: function* (s) {
      if (!rocketWindow(s) || s.flag('c10_pad_seen')) return;
      s.set('c10_pad_seen');
      s.music('hurry');
      yield s.cam(16, 2, 60, { pitch: 30 });
      yield s.msg("The Shinra No. 26 stands fuelled and gleaming on its gantry. Soldiers swarm around the launch pad.");
      if (s.inParty('cid')) yield s.say('cid', "Look at her... Shinra's grubby hands all over my baby.\fAlright. Let's go take her back.");
      yield s.camFollow();
    },
  });
  function* rudeFight(s) {
    s.spawn('rude', 'rude', 14, 5, 'right', { name: 'Rude' });
    s.spawn('rs1', 'soldier', 13, 5, 'right', { name: 'Attack Squad' });
    s.spawn('rs2', 'soldier', 15, 5, 'right', { name: 'Attack Squad' });
    yield s.move('rude', 18, 5);
    yield s.say('rude', "......");
    if (s.inParty('tifa')) {
      yield s.face('rude', 'player');
      yield s.say('rude', "......Tifa.\f...Orders are orders.");
    } else {
      yield s.say('rude', "......Nothing personal. The rocket launches on schedule.");
    }
    yield s.battle({ enemies: ['attack_squad', 'attack_squad', 'rude_3'], bg: 'rocket', music: 'hurry', noEscape: true });
    s.remove('rs1'); s.remove('rs2');
    yield s.say('rude', "......Hn. You got stronger.");
    yield s.run('rude', 12, 5);
    s.remove('rude');
    s.set('c10_rude_beaten');
    yield s.msg("The hatch into the rocket stands open at the top of the gantry.");
  }

  // ------------------------------------------------------------------ the engine room: the Senior Grunt, Palmer, the launch
  FF7.patchMap('rocket_engine', {
    onEnter: function* (s) {
      if (!rocketWindow(s) || s.flag('c10_launched')) return;
      if (!s.flag('c10_grunt_fight')) {
        s.set('c10_grunt_fight');
        s.spawn('sgrunt', 'soldier', 5, 4, 'down', { name: 'Senior Grunt' });
        yield s.say('Senior Grunt', "Nobody sets foot aboard before launch! Nobody!");
        yield s.battle({ enemies: ['senior_grunt'], bg: 'rocket', music: 'hurry', noEscape: true });
        s.remove('sgrunt');
      }
      yield* palmerAndLaunch(s);
    },
  });

  // ------------------------------------------------------------------ inside the rocket
  // Shinra No. 26 in flight (refs 14-hugemateria53, 56, 57): the same rusty service corridor as on the
  // launch pad (chapter 7's rocket_engine), dim and cold now - the oxygen tanks down one wall, No. 8 by the
  // hatch to the escape pods; the ladder up to the cockpit at the far end
  const ROCKET_LOOK = { wall: '#565a4e', trim: '#36362c', wallTex: 'panel', floor: ['#484a42', '#42443c'], floorTex: { floor: 'metal' }, metal: ['#766650', '#5a5e52'],
    sky: ['#000000', '#000000'], indoor: true, ambient: [0.36, 0.36, 0.38], light: [0.7, 0.68, 0.62], wallH: 2.6 };
  FF7.defineMap('rocket2_interior', {
    name: 'Shinra No. 26', area: 'Shinra No. 26', theme: 'space', music: 'dream',
    look: ROCKET_LOOK, camera: { pitch: 42, dist: 8.5 },
    legend: { T: 'tank', K: 'console' },
    grid: [
      "############",
      "#PPq.HH.qPP#",
      "#T..gggg..K#",
      "#T..gggg..Z#",
      "#P..gggg..M#",
      "#T..gggg..K#",
      "#T..gggg..P#",
      "#P..gggg..q#",
      "+....gg....#",
      "#####++#####",
    ],
    props: [
      { at: [1, 2], text: '5', col: '#8a8a78' }, { at: [1, 3], text: '6', col: '#868674' }, { at: [1, 5], text: '7', col: '#8a8a78' }, { at: [1, 6], text: '8', col: '#908c76' },
      { at: [10, 2], rot: -90, style: 'tall', col: '#6a6a5a', col2: '#e0c060' }, { at: [10, 5], rot: -90, style: 'tall', col: '#6a6a5a', col2: '#e04030' },
      { at: [10, 3], rot: -90, col: '#40e0a0' },
    ],
    lights: [[5, 8, '#ff5030', 2.6], [5, 3, '#c0d0ff', 2.6]],
    entries: { from_cockpit: [5, 2, 'down'] },
    exits: [
      { at: [0, 8, 1, 1], run: function* (s) { yield s.msg("The boarding hatch is sealed tight. Beyond it there's nothing but empty space."); } },
      { at: [5, 1, 2, 1], to: 'rocket2_cockpit', entry: 'from_below' },
      { at: [5, 9, 2, 1], run: function* (s) {
          if (!s.flag('huge_materia_rocket')) { yield s.say('cid', "Not yet! We ain't leavin' without that Huge Materia!"); return; }
          yield* escapePod(s);
        } },
    ],
    objects: [{ at: [10, 3], talk: function* (s) { yield s.msg("'COURSE: METEOR. AUTOPILOT LOCKED. MANUAL OVERRIDE DISABLED.'"); } }],
  });

  FF7.defineMap('rocket2_cockpit', {
    // ref 14-hugemateria53: a cramped, cable-strung cockpit; a grated walkway runs up to the great round
    // window at the nose - stars, the blue curve of the Planet, and Meteor's red glare - between banks of
    // dead instruments and crew seats
    name: 'Shinra No. 26 Cockpit', area: 'Shinra No. 26', theme: 'space', music: 'dream',
    look: Object.assign({}, ROCKET_LOOK, { wall: '#4c463c', wallH: 2.8, ambient: [0.34, 0.34, 0.4], light: [0.62, 0.66, 0.8] }),
    camera: { pitch: 36, dist: 8.5 },
    legend: { K: 'block', '[': 'pilotseat' },
    grid: [
      "###################",
      "#KKKKK.ggggg.KKKKK#",
      "#.[.[..ggggg..[.[.#",
      "#......ggggg......#",
      "#Z.....ggggg.....Z#",
      "#......ggggg......+",
      "#q.....ggggg.....q#",
      "#......ggggg......#",
      "########+++########",
    ],
    props: [
      { at: [9, 0], prop: 'porthole', r: 1.05, y: 1.4, col: '#02030a', col2: '#5a5a5e', planet: '#3a6ad0', meteor: '#ff5a28' },
      { at: [2, 1], prop: 'console', w: 2, col: '#5a5a54', col2: '#608060', screen: 'gauges' }, { at: [4.5, 1], prop: 'console', w: 2, col: '#5a5a54', col2: '#40c080' },
      { at: [14.5, 1], prop: 'console', w: 2, col: '#5a5a54', col2: '#40c080' }, { at: [16, 1], prop: 'console', w: 2, col: '#5a5a54', col2: '#608060', screen: 'gauges' },
      { at: [2, 2], rot: 180, col: '#5a4a3a' }, { at: [4, 2], rot: 180, col: '#5a4a3a' }, { at: [14, 2], rot: 180, col: '#5a4a3a' }, { at: [16, 2], rot: 180, col: '#5a4a3a' },
    ],
    lights: [[9, 1, '#a0c0ff', 3], [9, 6, '#ff6040', 2]],
    entries: { launched: [9, 3, 'up'], from_below: [9, 7, 'up'], from_hold: [17, 5, 'left'] },
    exits: [
      { at: [8, 8, 3, 1], to: 'rocket2_interior', entry: 'from_cockpit' },
      { at: [18, 5, 1, 1], to: 'rocket2_hold', entry: 'from_cockpit', sfx: 'door_shinra' },
    ],
    triggers: [
      counter([1, 1, 5, 1], function* (s) { yield s.msg("The pilot's console. Every control is dead: 'AUTOPILOT LOCKED'."); }),
      counter([13, 1, 5, 1], function* (s) { yield s.msg("The pilot's console. Every control is dead: 'AUTOPILOT LOCKED'."); }),
      counter([7, 0, 5, 1], function* (s) { yield s.msg("Stars, and the vast blue curve of the Planet below. And ahead... the red glare of Meteor, growing larger."); }),
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'launched' || s.flag('c10_in_space')) return;
      s.set('c10_in_space');
      yield* inSpace(s);
    },
  });

  function* palmerAndLaunch(s) {
    s.spawn('palmer', 'palmer', 5, 2, 'up', { name: 'Palmer' });
    s.spawn('eng1', ENGINEER, 2, 3, 'left', { name: 'Engineer' });
    s.spawn('eng2', ENGINEER, 9, 5, 'right', { name: 'Engineer' });
    yield s.say('Engineer', "Final checks complete! Launch in five minutes!");
    yield s.say('palmer', "Uhihi! Good, good. Everything set? Then get me off this thing before it takes off!");
    yield s.face('palmer', 'player');
    yield s.emote('palmer', '!');
    yield s.say('palmer', "Eek! Who's there!? ...C-C-Cid!?");
    yield s.say('cid', "Palmer!? You lard-bucket, you're alive!? I saw that truck flatten you!");
    yield s.say('palmer', "Uhihi... It takes more than a truck to flatten me! Lucky I'm so... well-padded!\fAnyway, you're too late! The autopilot's locked in. This rocket's going straight up to Meteor, Huge Materia and all!");
    yield s.say('palmer', "And I'M not going with it! Bye-bye! Uhihi!");
    yield s.run('palmer', [[5, 8], [5, 9]]);
    s.remove('palmer');
    yield [s.run('eng1', [[3, 8], [5, 9]]), s.run('eng2', [[8, 8], [6, 9]])];
    s.remove('eng1'); s.remove('eng2');
    s.music('countdown');
    s.sfx('alarm_long');
    yield s.msg("'LAUNCH SEQUENCE INITIATED. T-MINUS 60 SECONDS.'");
    yield* anyone(s, [['barret', "It's gonna launch! We gotta get outta here!"], ['cloud', "Cid! We have to get off!"]]);
    yield s.say('cid', "......No.\fThis is MY rocket. Built it with my own two hands. If she's finally goin' up... then I'm goin' with her!");
    yield s.say(s.leader() === 'cid' ? (mates(s)[0] || 'cloud') : s.leader(), "Cid...!");
    yield s.say('cid', "Strap in, all of ya! Too late to get off now anyhow!");
    s.shake(3, 120);
    yield s.caption("5 ......... 4 ......... 3 ......... 2 ......... 1 .........", { hold: 120, bg: 'rgba(0,0,0,0.6)' });
    s.set('c10_launched');
    yield s.fadeOut(20, '#ffffff');
    yield s.movie('rocket_launch', { text: 'With a roar that shakes the whole valley, the Shinra No. 26 lifts off.\nIt climbs on a pillar of fire, higher and higher,\nuntil the blue sky turns black.' });
    yield s.goto('rocket2_cockpit', 'launched');
  }
  function* inSpace(s) {
    s.music('dream');
    yield s.say('cid', "......Ugh. Everybody alive?\f...Holy... Look out that window. That's space. We're in SPACE.");
    yield s.say('cid', "......Shinra No. 26. And me in the pilot's seat. Heh... never thought it'd happen like this.");
    yield s.msg("Cid works the controls, but nothing responds.");
    yield s.say('cid', "Damn it! Autopilot's welded shut! She's gonna fly straight into Meteor no matter what I do!");
    yield* anyone(s, [['cloud', "Then we take the Huge Materia and get off before she hits."], ['barret', "Then we grab that Huge Materia and bail before it hits!"]]);
    yield s.say('cid', "Right. The Materia's in the cargo hold, up the ladder. Escape pods are down below.\fMove it!");
  }

  // ------------------------------------------------------------------ the Huge Materia and Cid's code
  const CODE = [0, 1, 3, 3];
  const BUTTONS = ['Circle', 'Square', 'Triangle', 'Cross'];
  function* codeLock(s) {
    if (s.flag('huge_materia_rocket')) { yield s.msg("The clamps stand open. The cradle is empty."); return; }
    yield s.msg("The Huge Materia sits locked in a heavy clamp. A keypad with four buttons controls the lock.");
    yield s.say('cid', "I designed this lock myself. The release code's... Circle, Square, Cross, Cross. Punch it in!");
    for (let attempt = 0; attempt < 3; attempt++) {
      let ok = true;
      for (let i = 0; i < CODE.length; i++) {
        const c = yield s.ask(null, `Enter the release code. (${i}/4)`, BUTTONS);
        if (c !== CODE[i]) { ok = false; break; }
        s.sfx('beep');
      }
      if (ok) { yield* releaseMateria(s); return; }
      s.sfx('error');
      yield s.msg("*BZZT* The keypad flashes red and resets.");
      if (attempt < 2) yield s.say('cid', attempt === 0 ? "Wrong! Circle, Square, Cross, Cross! Try again!" : "Not THAT one! Circle... Square... Cross... Cross! Slowly!");
    }
    yield s.say('cid', "Aw, gimme that! ...Circle, Square, Cross, Cross. There!");
    s.sfx('beep');
    yield* releaseMateria(s);
  }
  function* releaseMateria(s) {
    s.sfx('gate');
    yield s.msg("With a hiss, the clamps swing open.");
    s.set('huge_materia_rocket');
    yield s.give('huge_materia_rocket');
    if (s.flag('c10_sub_lost')) yield s.msg("A second crystal, the one from the red submarine, is strapped beside it. The party takes that one too.");
    yield s.say('cid', "Got it! Now to the escape pods, on the double!");
  }
  FF7.defineMap('rocket2_hold', {
    // ref 14-hugemateria57: a round chamber of ribbed plating and cable runs; in the middle the Huge
    // Materia floats in its lit glass capsule on a pedestal ringed with hazard paint, Cid's keypad in front
    name: 'Shinra No. 26 Cargo Hold', area: 'Shinra No. 26', theme: 'space', music: 'dream',
    look: Object.assign({}, ROCKET_LOOK, { wall: '#4a5450', floor: ['#3e4444', '#3a4040'], floorTex: { floor: 'grate' }, wallH: 2.8, ambient: [0.32, 0.36, 0.4], light: [0.6, 0.7, 0.8] }),
    camera: { pitch: 40, dist: 8.5 },
    legend: { C: 'capsule', K: 'console' },
    grid: [
      "#################",
      "###P.........P###",
      "##P...........P##",
      "#P......C......P#",
      "#.......K.......#",
      "#...............#",
      "##.............##",
      "###...........###",
      "########+########",
    ],
    props: [
      { at: [8, 3.4], prop: 'disc', r: 2.4, h: 0.03, col: '#2a2e30', top: '#30383a', rim: '#d8b030', rimW: 0.2 },
      { at: [8, 3], col: '#90f0ff', h: 1.35 },
      { at: [8, 4], w: 1, col: '#5a6060', col2: '#60f080' },
    ],
    lights: [[8, 3, '#80d8ff', 4.5]],
    entries: { from_cockpit: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 1, 1], to: 'rocket2_cockpit', entry: 'from_hold' }],
    triggers: [{ id: 'codelock', at: [7, 3, 3, 2], on: 'talk', run: codeLock }],
  });

  // ------------------------------------------------------------------ oxygen tank No. 8 and the escape pod
  function* escapePod(s) {
    const crew = [s.leader()].concat(mates(s)).slice(0, 3);
    s.hide('player');
    crew.forEach((id, i) => s.spawn(id, id, 4 + i, 7, 'down', { name: s.name(id) }));
    if (!crew.includes('cid')) s.spawn('cid', 'cid', 7, 7, 'down', { name: s.name('cid') });
    s.music('hurryfaster');
    s.shake(6, 60);
    s.sfx('alarm');
    s.flash('#ff8040', 30, 0.8);
    yield s.msg("*KA-BOOM!*\nAn explosion rips through the bulkhead. A heavy panel slams down across the corridor!");
    s.anim('cid', 'lie');
    yield s.say('cid', "Gaaah!! My leg... I'm pinned!");
    yield s.say('cid', "......It was the No. 8 oxygen tank. The damn No. 8 tank...\fShera always said it wasn't right. She spent years checkin' it over and over, and I laughed at her. Called her a nag.");
    yield s.say('cid', "Seven years ago it was the same tank. She stayed in the engine to check it, and I scrubbed the launch to keep her from gettin' fried.\fI blamed her for my dream endin'. ...But she was right. She was right all along.");
    yield s.say('cid', "Go on, get outta here! Leave me!");
    const helper = crew.find(id => id !== 'cid') || 'cloud';
    yield s.say(helper, "Not a chance. Everybody, lift on three!");
    s.sfx('hit');
    s.shake(2, 20);
    s.stopAnim('cid');
    yield s.msg("Together they heave the twisted panel aside.");
    yield s.say('cid', "......Damn fools. Alright. Thanks. ...Now RUN!");
    crew.forEach(id => s.remove(id));
    s.remove('cid');
    yield s.fadeOut(30);
    yield s.movie('rocket_meteor', { text: "The escape pod blasts free of the rocket just in time.\nMoments later, the Shinra No. 26 slams into Meteor...\n\n......Meteor doesn't so much as crack.\nThe great red star keeps falling, as silent as ever.", stayBlack: true });   // (js/gfx/cinema.js; Cid talks over the black after it)
    s.music('dream');
    yield s.say('cid', "......Well. So much for that.\fThe Huge Materia's safe with us, though. And Shinra's big plan went up in smoke.");
    yield s.say('cid', "......Hey. Take a look out the window. That's our Planet. It's blue... Look how blue it is.");
    yield s.say('cid', "My rocket flew. I made it to space. ...And I owe Shera one hell of an apology.");
    yield s.movie('pod_splashdown', { text: "The escape pod plunges back through the atmosphere,\nits parachutes blossom, and it splashes down in the sea near Rocket Town.\nThe Highwind is waiting.", stayBlack: true });   // (js/gfx/cinema.js)
    s.set('huge_materia_done');
    if (FF7.maps.highwind_bridge) { yield s.goto('highwind_bridge', 'start'); return; }
    // (chapter 9's Highwind isn't loaded: land next to Rocket Town instead)
    yield s.world('rocket_town');
  }
})();

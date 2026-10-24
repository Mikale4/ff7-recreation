// Chapter 11a (part 2) — Shinra HQ cutaways (the Sister Ray, Rufus, Reeve), Diamond WEAPON on the
// coast outside Midgar and the Sister Ray's shot, then the Midgar raid: the parachute drop into
// Sector 8, the Sector 8 underground, the train tunnel where the Turks wait, and the winding
// tunnels (sources, W-Item). The Shinra HQ revisit, the cannon and Hojo are in part 3.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C = FF7.c11a = FF7.c11a || {};

  // ------------------------------------------------------------------ world links (Midgar)
  FF7.world.link('midgar', { map: 'midgar2_coast', entry: 'from_world', priority: 10,
    if: s => s.flag('c11a_diamond_alert') && !s.flag('c11a_diamond_done') });
  FF7.world.link('midgar', { priority: 10, if: s => s.flag('c11a_diamond_done') && !s.flag('c11a_hojo_news'),
    run: function* (s) { yield s.msg("Midgar's gates are sealed and the streets are full of Shinra troops.\nThe Sister Ray's blast flew north... toward the Northern Crater."); } });
  FF7.world.link('midgar', { map: 'midgar2_drop', entry: 'from_world', priority: 10,
    if: s => s.flag('c11a_hojo_news') && !s.flag('disc3') });

  // ================================================================== Shinra HQ cutaway rooms
  const MEETING = [
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "#hwwhhhwwhhhhhhwwhhhwwh#",
    "#k....................k#",
    "#.....cccccccccccc.....#",
    "#....cttttttttttttc....#",
    "#....cttttttttttttc....#",
    "#.....cccccccccccc.....#",
    "#......................#",
    "#q....................q#",
    "#hhhhhhhhhh++hhhhhhhhhh#",
  ];
  FF7.defineMap('midgar2_meeting', {
    name: 'Shinra Bldg. — Conference Room', area: 'Midgar', theme: 'shinra', music: 'shinra',
    look: { floor: ['#8a8a92', '#84848c'], sky: ['#02040a', '#0a1020'] },
    lights: [[11, 4, '#fff0d0', 5]],
    hidePlayer: true,
    grid: MEETING,
    entries: { cut: [11, 7, 'up'] },
    exits: [],
  });
  const OFFICE = [
    "XXXXXXXXXXXXXXXXXXXXXX",
    "#wwwwwwwwwwwwwwwwwwww#",
    "#....................#",
    "#|.......DDDD.......|#",
    "#....................#",
    "#k..................k#",
    "#....................#",
    "#u..................u#",
    "#hhhhhhhhh++hhhhhhhhh#",
  ];
  FF7.defineMap('midgar2_office', {
    name: "Shinra Bldg. — President's Office", area: 'Midgar', theme: 'shinra', music: 'shinra',
    look: { floor: ['#6a2a2a', '#642424'], sky: ['#1a0604', '#5a1a0a'] },
    lights: [[10, 1, '#ff9060', 5], [10, 5, '#fff0d0', 3]],
    hidePlayer: true,
    grid: OFFICE,
    entries: { cut: [10, 6, 'up'] },
    exits: [],
  });

  // The meeting: the Junon cannon has become the Sister Ray, and WEAPON is coming.
  FF7.story.c11a_cutSisterRay = function* (s) {
    s.music('shinra');
    s.spawn('rufus', 'rufus', 3, 4, 'right', { name: 'Rufus' });
    s.spawn('heidegger', 'heidegger', 8, 2, 'down', { name: 'Heidegger' });
    s.spawn('scarlet', 'scarlet', 14, 2, 'down', { name: 'Scarlet' });
    s.spawn('reeve', 'reeve', 11, 7, 'up', { name: 'Reeve' });
    yield s.cam(10, 4, 1, { dist: 11, pitch: 46 });
    yield s.caption('Midgar — Shinra Headquarters', { hold: 90, bg: '#000' });
    yield s.say('heidegger', "Gyahahaha! The WEAPON is wading straight for Midgar, Mr. President!");
    yield s.say('scarlet', "Kyahahaha! Let it come. My baby's ready for it.\fThe Junon cannon, hauled all the way here and wired into every Mako reactor in the city... I call her the Sister Ray.");
    yield s.say('reeve', "Mr. President! WEAPON will reach the city within the hour. We have to evacuate the slums, now!");
    yield s.face('rufus', 'reeve');
    yield s.say('rufus', "The Sister Ray is aimed at the barrier over the Northern Crater.\fIf WEAPON wants to stand in the line of fire... so much the better. Two birds, one stone.");
    yield s.say('reeve', "And the people under the plate? If that thing gets past the cannon—");
    yield s.say('rufus', "Sound the shelter alarm, Reeve. That is your department.");
    yield s.say('scarlet', "Kyahaha! At last, a chance to hear her sing!");
    yield s.say('rufus', "......Begin charging the Sister Ray.");
    s.camFollow(1);
  };

  // Rufus gives the order... and WEAPON answers.
  FF7.story.c11a_cutRufus = function* (s) {
    s.music('makocannon');
    s.spawn('rufus', 'rufus', 10, 2, 'up', { name: 'Rufus' });
    yield s.cam(10, 3, 1, { dist: 9, pitch: 40 });
    yield s.say('Shinra Operator', "(over the speaker) Sister Ray, charge at one hundred percent! WEAPON is inside the firing line!");
    yield 30;
    yield s.say('rufus', "......Fire.");
    s.shake(5, 60);
    yield s.movie('sister_ray', { text: 'Every reactor in Midgar roars at once.\nThe Sister Ray fires — a torrent of Mako that punches straight through Diamond WEAPON\nand keeps going, north across the sea, until it splits the barrier over the Northern Crater.\nIn its last moment, the WEAPON looses a volley of light at the Shinra Building.' });
    s.music('shinra_explodes');
    yield s.say('Shinra Operator', "(over the speaker) Incoming! WEAPON's shots — they're heading for the tower!");
    yield s.face('rufus', 'up');
    yield 40;
    yield s.say('rufus', "......");
    s.sfx('bosskill');
    s.shake(10, 90);
    yield s.flash('#ffffff', 60, 1);
    yield s.fadeOut(10, '#ffffff');
    s.remove('rufus');
    yield 60;
    s.camFollow(1);
  };

  // After the barrier falls: Reeve finds Hojo in the cannon's controls, and pays for helping AVALANCHE.
  FF7.story.c11a_cutReeveArrested = function* (s) {
    s.music('anxious');
    s.spawn('reeve', 'reeve', 20, 5, 'left', { name: 'Reeve' });
    yield s.cam(12, 5, 1, { dist: 11, pitch: 46 });
    yield s.caption('Shinra Headquarters', { hold: 70, bg: '#000' });
    yield s.say('reeve', "The reactors are still feeding the cannon... Someone's routed every line in Midgar into the Sister Ray.\f...Hojo! He's up in the control room. If it keeps charging with nowhere to fire, it'll blow the whole city apart!");
    s.spawn('heidegger', 'heidegger', 11, 9, 'up', { name: 'Heidegger' });
    s.spawn('scarlet', 'scarlet', 12, 9, 'up', { name: 'Scarlet' });
    yield [s.move('heidegger', 11, 7), s.move('scarlet', 13, 7)];
    yield s.face('reeve', 'heidegger');
    yield s.say('reeve', "Heidegger, Scarlet! Leave Hojo to AVALANCHE. Just keep your troops out of their way—");
    yield s.say('heidegger', "AVALANCHE, eh? Gyahaha... So it's true. You've been feeding those rats information all along.");
    yield s.say('scarlet', "Kyahahaha! A traitor in the executive suite. How embarrassing for you, Reeve.");
    yield s.say('heidegger', "Guards! Get this man out of my sight!");
    s.spawn('g1', 'soldier', 10, 9, 'up', { name: 'Guard' });
    s.spawn('g2', 'soldier', 14, 9, 'up', { name: 'Guard' });
    yield [s.run('g1', 19, 6), s.run('g2', 20, 6)];
    yield s.say('reeve', "You fools! Midgar will be—");
    yield [s.move('reeve', 12, 9), s.move('g1', 11, 9), s.move('g2', 13, 9)];
    s.remove('reeve'); s.remove('g1'); s.remove('g2');
    yield s.say('heidegger', "We'll deal with Hojo ourselves. And if AVALANCHE shows its face...");
    yield s.say('scarlet', "...they'll get to meet my newest creation. Kyahahahaha!");
    s.camFollow(1);
  };

  // ================================================================== Diamond WEAPON on the coast
  const COAST = [
    "XXXXXXXXXXXXRRRRRRRRRRRRRRRR~~~~~~~~",
    "XXXXXX,,,,,,,,,,,ssssssssssss~~~~~~~",
    "XXXXX,,,%,,,,,,,,sssssssssssss~~~~~~",
    "XXXX,,,,,,,,,,,,,ssssssssssssss~~~~~",
    "XXXX,,,,,,R,,,,,,sssssssssssssss~~~~",
    "XXX,,,,,,,,,,,,,,ssssssssssssssss~~~",
    "XXX,,,,,,,,,,,,,,sssssssssssssssss~~",
    "XXX,,,,,%,,,,,,,,sssssssssssssssss~~",
    "XXX,,,,,,,,,,,,,,ssssssssssssssss~~~",
    "XXXX,,,,,,,,,,,,,sssssssssssssss~~~~",
    "XXXX,,,,,,,,R,,,,ssssssssssssss~~~~~",
    "XXXXX,,,,,,,,,,,,sssssssssssss~~~~~~",
    "XXXXXX,,,,,,,,,,,ssssssssssss~~~~~~~",
    "XXXXXXX,,,,,,,,,,sssssssssss~~~~~~~~",
    "XXXXXXXXX,,,,,,,,ssssssss~~~~~~~~~~~",
    "         ,,,,,,,,                   ",
  ];
  const COAST_SPOTS = [[10, 12, 'right'], [11, 13, 'right'], [9, 11, 'right'], [12, 11, 'right'], [8, 12, 'right'], [10, 10, 'right'], [13, 13, 'right']];
  const AFTER_SPOTS = [[18, 6, 'left'], [18, 8, 'left'], [21, 6, 'left'], [21, 8, 'left'], [19, 5, 'left'], [19, 9, 'left'], [22, 7, 'left']];
  FF7.defineMap('midgar2_coast', {
    name: 'Midgar Coast', area: 'Midgar', theme: 'beach', music: 'weaponraid',
    look: { floor: ['#b8a078', '#b09870'], sand: ['#c0a878', '#b8a070'], grass: ['#4a6a3a', '#446434'], water: '#2a4a6a',
      sky: ['#1a1030', '#c05030'], fog: { color: [0.45, 0.25, 0.2], near: 12, far: 32 } },
    lights: [[2, 7, '#80ff90', 4], [30, 7, '#ffa060', 4]],
    grid: COAST,
    entries: { from_world: [12, 13, 'up'], aftermath: [20, 7, 'left'] },
    exits: [{ at: [9, 15, 8, 1], to: 'world', loc: 'midgar' }],
    triggers: [
      { id: 'engage', at: [19, 1, 1, 14], once: true, if: s => !s.flag('c11a_diamond_beaten'), run: function* (s) { yield* FF7.story.c11a_diamondBattle(s); } },
      { at: [1, 5, 3, 5], on: 'talk', run: function* (s) { yield s.msg("Midgar's outer wall looms over the shore. Green light pulses from the reactors along its rim."); } },
    ],
    onLoad: function (s) {
      if (!s.flag('c11a_diamond_beaten')) s.spawn('diamond', { enemy: 'diamond_weapon' }, 32, 7, 'left', { name: 'Diamond WEAPON' });
    },
    onEnter: function* (s) {
      if (s.flag('c11a_coast_intro')) return;
      s.set('c11a_coast_intro');
      const crew = C.gather(s, COAST_SPOTS);
      yield s.cam(29, 7, 70, { dist: 14, pitch: 34 });
      s.shake(4, 60);
      yield 40;
      if (C.has(crew, 'cid')) yield s.say('cid', "There it is! Look at the size of that $#@%!");
      if (C.has(crew, 'barret')) yield s.say('barret', "It's comin' ashore! Straight for Midgar!");
      if (C.has(crew, 'tifa')) yield s.say('tifa', "If that thing reaches the city...");
      s.camFollow(40);
      yield s.say('cloud', "It won't. We stop it here, on the beach.");
      C.dismiss(s, crew);
      yield s.msg('Diamond WEAPON is wading ashore. Run toward it!');
    },
  });

  FF7.story.c11a_diamondBattle = function* (s) {
    s.music('none');
    s.shake(6, 80);
    s.sfx('howl');
    yield s.move('diamond', 26, 7, { speed: 0.02 });
    yield s.say('cloud', "Here it comes!");
    yield s.battle({ enemies: ['diamond_weapon'], bg: 'beach', music: 'boss', noEscape: true });
    s.set('c11a_diamond_beaten');
    s.music('weaponraid');
    s.shake(5, 40);
    yield 30;
    const crew = C.gather(s, AFTER_SPOTS);
    if (C.has(crew, 'tifa')) yield s.say('tifa', "It's... getting back up!?");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "We barely slowed it down. It's still heading for the city!");
    yield s.move('diamond', [[27, 3], [29, 0]], { speed: 0.02 });
    s.remove('diamond');
    if (C.has(crew, 'cid')) yield s.say('cid', "Hey... that cannon on top of Midgar. It's turnin'... It's pointed right this way!");
    yield* C.cutaway(s, 'midgar2_office', 'cut', FF7.story.c11a_cutRufus, 'midgar2_coast', 'aftermath');
    yield* FF7.story.c11a_coastAftermath(s);
  };

  FF7.story.c11a_coastAftermath = function* (s) {
    s.music('anxious');
    const crew = C.gather(s, AFTER_SPOTS);
    yield s.cam(4, 7, 60, { dist: 13, pitch: 36 });
    yield 30;
    if (C.has(crew, 'tifa')) yield s.say('tifa', "The Sister Ray... it went right through the WEAPON.");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "And the blast did not stop. It kept going... north.");
    if (C.has(crew, 'cid')) yield s.say('cid', "North... That's the crater! If that shot hit the barrier—");
    yield s.say('cloud', "......Then the way to Sephiroth is open.");
    s.camFollow(40);
    if (C.has(crew, 'caitsith')) {
      yield s.say('caitsith', "An' the Shinra Buildin'... The WEAPON's shots hit the top floors. The President's office...");
      if (C.has(crew, 'barret')) yield s.say('barret', "Rufus...?");
      yield s.say('caitsith', "No word. Nothin' up there but smoke.");
    }
    yield s.say('cloud', "We'll see the barrier for ourselves. Back to the Highwind. To the crater.");
    s.set('c11a_diamond_done');
    C.dismiss(s, crew);
    s.music('highwind');
    yield s.msg("The Sister Ray's blast has broken the barrier. Fly the Highwind to the Northern Crater.");
  };

  // ================================================================== the Midgar raid: the drop
  const DROP = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hhhwhhhhNhhhhwhhhhhhwhhhhNhhhhhh",
    "h..l.........................l.h",
    "h..............................h",
    "::::::::::::::::::::::::::::::xh",
    "::::::::::::::::::::::::::::::xh",
    "::::::::::::::::::::::::::::::xh",
    "h..............................h",
    "h...B..o...........x.......g...h",
    "h..............................h",
    "h=====l============l===========h",
  ];
  const RAIN_LOOK = { sky: ['#02040a', '#101828'], fog: { color: [0.06, 0.08, 0.12], near: 7, far: 22 }, floor: ['#4a4c54', '#44464e'], floor2: ['#3a3c44', '#36383e'] };
  FF7.defineMap('midgar2_drop', {
    name: 'Midgar, Sector 8', area: 'Midgar', theme: 'midgar', music: 'hurryfaster', look: RAIN_LOOK,
    lights: [[3, 2, '#ffe0a0', 3], [30, 2, '#ffe0a0', 3], [8, 1, '#ff60c0', 2], [25, 1, '#60c0ff', 2]],
    grid: DROP,
    entries: { from_world: [8, 5, 'right'], from_ug: [27, 7, 'down'] },
    exits: [
      { at: [27, 8, 1, 1], to: 'midgar2_ug1', entry: 'from_drop', sfx: 'door2' },
      { at: [0, 4, 1, 3], run: function* (s) { yield s.say('cloud', "(Shinra troops are swarming the streets that way. We'd never get near the cannon.)\f(The manhole. We go underground.)"); } },
    ],
    triggers: [
      { at: [27, 8], on: 'talk', run: function* (s) { yield s.msg("A manhole. A ladder leads down into the Sector 8 underground."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_landed')) return;
      yield* FF7.story.c11a_parachute(s);
    },
  });

  FF7.story.c11a_parachute = function* (s) {
    s.set('c11a_raid_started');
    s.hide('player');
    yield s.fadeOut(1);
    s.music('highwind');
    yield s.caption('The Highwind, high above Midgar...', { hold: 100, bg: '#000' });
    if (s.isMember('cid')) yield s.say('cid', "That's Midgar down there! Can't set her down anywhere near that cannon — they'd blow us outta the sky.");
    yield s.say('cloud', "Then we jump.");
    if (s.isMember('barret')) yield s.say('barret', "J-jump?! From up HERE?!");
    if (s.isMember('cid')) yield s.say('cid', "Parachutes are in the hold. Pick your team, Cloud. Everybody else stays with the ship.");
    yield s.choosePArty(['cloud']);
    s.music('hurryfaster');
    yield s.minigame('parachute');
    s.set('c11a_landed');
    s.show('player', 8, 5, 'right');
    s.anim('player', 'kneel');
    const mates = C.crew(s).filter(id => s.inParty(id));
    const crew = C.gather(s, [[6, 4, 'right'], [6, 6, 'right']], mates);
    crew.forEach(id => s.anim(id, 'kneel'));
    s.sfx('hop');
    yield s.fadeIn(40);
    yield 20;
    s.stopAnim('player');
    crew.forEach(id => s.stopAnim(id));
    yield 10;
    if (s.inParty('caitsith')) yield s.say('caitsith', "Phew! Made it in one piece! ...Right, listen up.");
    else { s.sfx('phs'); yield s.say('caitsith', "(over the PHS) Can you hear me? Good, you're down! Now listen..."); }
    yield s.say('caitsith', "Heidegger's got every soldier left in Midgar out on the streets. You'll never get to the cannon that way.\fGo underground. The Sector 8 maintenance tunnels run right under the Sister Ray. There's a manhole just up the road.");
    yield s.say('cloud', "......Got it. Let's move.");
    C.dismiss(s, crew);
  };

  // ------------------------------------------------------------------ Sector 8 underground (upper)
  const UG1 = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#PPHPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
    "#P.zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzP#",
    "#P.zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzP#",
    "#P..=^^^============zz============P#",
    "#P   ^^^            zz            P#",
    "#P   ^^^         zzzzzzzzzzzzzzzz P#",
    "#P   ^^^         zzzzzzzzzzzzzzzz P#",
    "#P   ^^^                          P#",
    "#P   ^^^                          P#",
    "#P   ^^^                          P#",
    "#P...^^^..........................P#",
    "#P................................P#",
    "#P..M..o.....B.......x......o..M..P#",
    "#P................................P#",
    "#P.............................g..P#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
  ];
  const UG_LOOK = { floor: ['#4a4e46', '#464a42'], wall: '#4a5048', sky: ['#020302', '#0a0e0a'], fog: { color: [0.02, 0.04, 0.03], near: 6, far: 18 } };
  FF7.defineMap('midgar2_ug1', {
    name: 'Sector 8 Underground', area: 'Midgar', theme: 'sewer', music: 'hurryfaster', look: UG_LOOK,
    battle: { table: 'sector8_underground', bg: 'sewer', rate: 1 },
    lights: [[3, 2, '#ffe0a0', 2], [24, 6, '#80ff90', 3], [16, 13, '#ffd080', 3]],
    grid: UG1,
    heights: C.hm(UG1, [[1, 1, 34, 4, 6], [5, 5, 3, 1, 5], [5, 6, 3, 2, 4], [5, 8, 3, 1, 3], [5, 9, 3, 1, 2], [5, 10, 3, 1, 1], [5, 11, 3, 1, 0],
      [20, 5, 2, 1, 6], [17, 6, 16, 2, 6]]),
    entries: { from_drop: [3, 2, 'down'], from_ug2: [30, 15, 'left'] },
    exits: [
      { at: [3, 1, 1, 1], to: 'midgar2_drop', entry: 'from_ug' },
      { at: [31, 15, 1, 1], to: 'midgar2_ug2', entry: 'from_ug1' },
    ],
    chests: [
      { at: [17, 6], item: 'elixir', id: 'midgar2_ug1_elixir' },
      { at: [32, 7], item: 'megalixir', id: 'midgar2_ug1_megalixir' },
    ],
    triggers: [
      { at: [31, 15], on: 'talk', run: function* (s) { yield s.msg("A hatch in the floor. A ladder leads further down."); } },
    ],
  });

  // ------------------------------------------------------------------ Sector 8 underground (lower)
  const UG2 = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#PPPPPP#PPPPPPPPPHPPPPPPPPPPPPPPPPP#",
    "#.....##..........................P#",
    "#.....##.....M..........M.........P#",
    "#  H  ##..........................P#",
    "#  H  ##....o.............B.......P#",
    "#  H  ##..........................P#",
    "#  H  ##..........................P#",
    "#  H  ##..........................P#",
    "#.............................zzzzP#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPP     P#",
    ":.......PPPPPPPPPPPPPPPPPPPP      P#",
    "#.......PPPPPPPPPPPPPPPPPPPP......P#",
    "#PPPPHPP..........................P#",
    "#PPPPHPP....x.........o...........P#",
    "#P..............M...........M.....P#",
    "#P................................P#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
  ];
  FF7.defineMap('midgar2_ug2', {
    name: 'Sector 8 Underground', area: 'Midgar', theme: 'sewer', music: 'hurryfaster', look: UG_LOOK,
    battle: { table: 'sector8_underground', bg: 'sewer', rate: 1 },
    lights: [[3, 2, '#ffe0a0', 2], [20, 5, '#80ff90', 3], [18, 15, '#ffd080', 3], [4, 11, '#a0c0ff', 2]],
    grid: UG2,
    heights: C.hm(UG2, [[1, 2, 5, 2, 9], [3, 4, 1, 1, 8], [3, 5, 1, 1, 7], [3, 6, 1, 1, 6], [3, 7, 1, 1, 5], [3, 8, 1, 1, 4],
      [8, 2, 26, 8, 4], [1, 9, 33, 1, 4], [0, 11, 8, 2, 3], [5, 13, 1, 1, 2], [5, 14, 1, 1, 1]]),
    entries: { from_ug1: [17, 2, 'down'], from_ug3: [1, 11, 'right'], fell: [31, 13, 'left'] },
    exits: [
      { at: [17, 1, 1, 1], to: 'midgar2_ug1', entry: 'from_ug2' },
      { at: [0, 11, 1, 1], to: 'midgar2_ug3', entry: 'from_ug2' },
    ],
    chests: [{ at: [2, 2], item: 'aegis_armlet', id: 'midgar2_ug2_aegis' }],
    triggers: [
      { id: 'catwalk', at: [30, 9, 4, 1], once: false, if: s => !s.flag('c11a_ug2_fell'), run: function* (s) {
          yield s.say('cloud', "(This catwalk's rusted through. One wrong step and it'll give way...)");
          const c = yield s.ask(null, "The catwalk creaks under Cloud's weight.", ['Keep going', 'Go back']);
          if (c !== 0) { yield s.move('player', 28, 9); return; }
          s.set('c11a_ug2_fell');
          s.sfx('falling');
          s.shake(4, 30);
          yield s.jump('player', 31, 13, 0.4, 34);
          s.sfx('hit');
          s.shake(3, 20);
          yield s.say('cloud', "......No going back up that way.");
        } },
      { at: [3, 4], on: 'talk', run: function* (s) { yield s.msg("A service ladder, climbing all the way up into the dark."); } },
    ],
    onLoad: function (s) {
      if (s.flag('c11a_ug2_fell')) for (let x = 30; x <= 33; x++) s.block(x, 9);
    },
  });

  // ------------------------------------------------------------------ Sector 8 underground (pipe room)
  const UG3 = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#PPPPPPPPPPPPPP+PPPPPP#PPPPPPPPPP#",
    "#PPPPPPPPPPP..........#PPPP.....P#",
    "#PPPPPPPPPPP....S.....#PPPP.....P#",
    "#PPPPPPPPPPP..........#PPPP  H  P#",
    "#PPPPPPPPPPPPPP^^^PPPP#PPPP  H  P#",
    "#PPPPPPPPPPPPPP^^^PPPP#PPPP  H  P#",
    "#PPPPPPPPPPPPPP^^^PPPP#P........P#",
    "#PPPPPPPPPPPPPP^^^PPPPPPPPPPPPPPP#",
    "#................................#",
    ":................................#",
    "#.....M........o........B........#",
    "#................................#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPHPPPPPP#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPHPPPPPP#",
    "#PPPPPPPPPPPPPPPPPPP.............#",
    "#PPPPPPPPPPPPPPPPPPP...o.........#",
    "##################################",
  ];
  FF7.defineMap('midgar2_ug3', {
    name: 'Sector 8 Underground', area: 'Midgar', theme: 'sewer', music: 'hurryfaster', look: UG_LOOK,
    battle: { table: 'sector8_underground', bg: 'sewer', rate: 1 },
    lights: [[16, 3, '#a0e0ff', 3], [16, 10, '#ffd080', 3], [29, 3, '#ffe0a0', 2], [26, 16, '#ffd080', 2]],
    grid: UG3,
    heights: C.hm(UG3, [[12, 1, 10, 4, 6], [15, 5, 3, 1, 5], [15, 6, 3, 1, 4], [15, 7, 3, 2, 3], [0, 9, 33, 4, 2], [26, 13, 1, 2, 1],
      [27, 2, 5, 2, 4], [29, 4, 1, 1, 3], [29, 5, 1, 1, 2], [29, 6, 1, 1, 1]]),
    entries: { from_ug2: [1, 10, 'right'], from_tunnel: [15, 2, 'down'], pocket: [25, 7, 'right'], tube_back: [21, 15, 'right'] },
    exits: [
      { at: [0, 10, 1, 1], to: 'midgar2_ug2', entry: 'from_ug3' },
      { at: [15, 1, 1, 1], to: 'midgar2_tunnel', entry: 'from_ug3', sfx: 'door2' },
    ],
    chests: [
      { at: [2, 9], item: 'starlight_phone', id: 'midgar2_ug3_starlight' },
      { at: [31, 9], item: 'elixir', id: 'midgar2_ug3_elixir' },
      { at: [30, 2], item: 'max_ray', id: 'midgar2_ug3_maxray' },
    ],
    triggers: [
      { at: [20, 15], run: function* (s) {
          yield s.msg("A narrow pipe, just wide enough to crawl through...");
          yield s.fadeOut(20);
          s.sfx('run');
          s.place('player', 25, 7, 'right');
          yield 30;
          yield s.fadeIn(20);
        } },
      { at: [24, 7], run: function* (s) {
          yield s.fadeOut(20);
          s.sfx('run');
          s.place('player', 21, 15, 'right');
          yield 30;
          yield s.fadeIn(20);
        } },
      { at: [15, 1], on: 'talk', run: function* (s) { yield s.msg("A ventilation duct. Cool air flows out of it... it must lead somewhere big."); } },
    ],
  });

  // ================================================================== the train tunnel: the Turks
  const TUNNEL = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "##g#####PPPPP######PPPPP#####::#####",
    "#............|..........|....::....#",
    "#..................................#",
    "#..B...........o...................#",
    "#..................................#",
    "xrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "xrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "#..................................#",
    "#......o...............B...........#",
    "#............|..........|..........#",
    "####################################",
  ];
  FF7.defineMap('midgar2_tunnel', {
    name: 'Midgar Train Tunnel', area: 'Midgar', theme: 'station', music: 'hurryfaster',
    look: { floor: ['#4a4640', '#46423c'], floor2: ['#3a3630', '#36322c'], wall: '#5a5650', sky: ['#020202', '#080806'], fog: { color: [0.03, 0.03, 0.02], near: 6, far: 18 } },
    battle: { table: 'midgar_raid_tunnel', bg: 'sewer', rate: 0.8, if: s => s.flag('c11a_turks_done') },
    lights: [[2, 2, '#a0c0ff', 2], [13, 3, '#ffd080', 3], [24, 3, '#ffd080', 3], [29, 2, '#ffe0a0', 2]],
    grid: TUNNEL,
    entries: { from_ug3: [2, 2, 'down'], from_junction: [29, 2, 'down'], from_winding: [34, 7, 'left'] },
    exits: [
      { at: [2, 1, 1, 1], to: 'midgar2_ug3', entry: 'from_tunnel', sfx: 'door2' },
      { at: [29, 1, 2, 1], to: 'midgar2_junction', entry: 'from_tunnel', if: s => s.flag('c11a_turks_done'),
        blocked: function* (s) { yield s.say('Reno', "Yo, yo. Where d'you think you're goin'?"); } },
      { at: [35, 6, 1, 2], to: 'midgar2_winding1', entry: 'from_tunnel', if: s => s.flag('c11a_turks_done'),
        blocked: function* (s) { yield s.say('Reno', "Hey. We're talkin' here."); } },
    ],
    triggers: [
      { id: 'turks', at: [5, 2, 2, 9], once: true, if: s => !s.flag('c11a_turks_done'), run: function* (s) { yield* FF7.story.c11a_turks(s); } },
      { at: [0, 6, 1, 2], on: 'talk', run: function* (s) { yield s.msg("The tunnel is blocked by a cave-in."); } },
    ],
  });

  FF7.story.c11a_turks = function* (s) {
    s.music('turks');
    s.spawn('reno', 'reno', 22, 3, 'left', { name: 'Reno' });
    s.spawn('rude', 'rude', 23, 4, 'left', { name: 'Rude' });
    s.spawn('elena', 'elena', 22, 5, 'left', { name: 'Elena' });
    yield [s.move('reno', 11, 3), s.move('rude', 12, 4), s.move('elena', 11, 5)];
    yield s.face('player', 'reno');
    yield s.say('reno', "Yo. Took you long enough.");
    yield s.say('cloud', "......The Turks.");
    yield s.say('elena', "Stop right there! By order of— um...");
    yield s.say('reno', "By order of who, exactly? The President's office is a crater. The brass are fightin' over the leftovers.\fAnd Heidegger's out on the streets shootin' at his own guys. Nobody's givin' orders anymore.");
    yield s.say('elena', "We're still the Turks, Reno! Even if nobody's giving the orders, we have a job to do!");
    yield s.say('rude', "......");
    yield s.say('reno', "Heh. Rookie's got a point. The Turks always finish the job.\f...So. How about it? You wanna make this official?");
    if (s.inParty('tifa')) yield s.say('rude', "......Tifa. ......I'd rather not.");
    const c = yield s.ask('cloud', '', ["Let's settle this.", "We don't have time for you."]);
    if (c === 0) {
      yield s.say('reno', "Heh. That's what I like to hear!");
      yield s.battle({ enemies: ['elena_2', 'reno_4', 'rude_4'], bg: 'sewer', music: 'battle', noEscape: true });
      s.set('c11a_turks_fought');
      yield s.say('reno', "Tch... Alright, alright. That's enough overtime for one day.");
      if (FF7.state.config.turksJoin !== false) {   // (Config > Turks Join: the seed of Disc 3's recruitment, js/maps/extra/turks.js)
        yield s.say('reno', "......Y'know, I keep sayin' 'orders.' Truth is, they don't come from anybody anymore.");
        yield s.say('rude', "......Meteor won't check whose side we were on.");
        yield s.say('elena', "......");
        yield s.say('reno', "Heh. Forget I said anything. See ya around, Spiky.");
      } else yield s.say('elena', "N-next time, we won't go easy on you!");
    } else {
      yield s.say('reno', "......Heh. Honestly? I'm not feelin' it either.");
      yield s.say('elena', "But Reno—!");
      yield s.say('reno', "Our shift's over, Elena. Somebody's gotta make sure there's still a Midgar tomorrow, and it ain't gonna be us.");
    }
    yield s.say('rude', "......Take care.");
    yield [s.move('reno', 34, 7), s.move('rude', 34, 6), s.move('elena', 34, 7)];
    s.remove('reno'); s.remove('rude'); s.remove('elena');
    s.set('c11a_turks_done');
    s.music('hurryfaster');
    yield s.say('cloud', "(The passage to the north leads up toward the cannon. The tracks east wind deeper into the tunnels.)");
  };

  // ------------------------------------------------------------------ winding tunnels (optional)
  const WIND1 = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
    "r..rrrrrrrrrrrrrrrrrrrrrrrrrrrrr...#",
    "r..rrrrrrrrrrrrrrrrrrrrrrrrrrrrr...#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPP..rr..#",
    "#############################..rr..#",
    "#############################..rr..#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPP..rr..#",
    "#...rrrrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "#...rrrrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "#..rrPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP#",
    "#..rr###############################",
    "#..rr###############################",
    "###rr###############################",
  ];
  const WIND_LOOK = { floor: ['#4a4640', '#46423c'], floor2: ['#3a3630', '#36322c'], wall: '#4e4a44', sky: ['#020202', '#080806'], fog: { color: [0.03, 0.03, 0.02], near: 5, far: 16 } };
  FF7.defineMap('midgar2_winding1', {
    name: 'Midgar Winding Tunnel', area: 'Midgar', theme: 'station', music: 'hurryfaster', look: WIND_LOOK,
    battle: { table: 'midgar_raid_tunnel', bg: 'sewer', rate: 1 },
    lights: [[16, 2, '#ffd080', 2], [32, 6, '#ffd080', 2], [16, 9, '#ffd080', 2]],
    grid: WIND1,
    entries: { from_tunnel: [1, 2, 'right'], from_winding2: [3, 12, 'up'] },
    exits: [
      { at: [0, 2, 1, 2], to: 'midgar2_tunnel', entry: 'from_winding' },
      { at: [3, 13, 2, 1], to: 'midgar2_winding2', entry: 'from_winding1' },
    ],
    items: [
      { at: [34, 3], item: 'power_source', id: 'midgar2_wind1_power' },
      { at: [1, 9], item: 'guard_source', id: 'midgar2_wind1_guard' },
    ],
  });
  const WIND2 = [
    "XXXrrXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#..rr###############################",
    "#..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "#..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPP..rr..#",
    "#############################..rr..#",
    "#PPPPPPPPPPPPPPPPPPPPPPPPPPPP..rr..#",
    "#.....rrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "#..x..rrrrrrrrrrrrrrrrrrrrrrrrrrr..#",
    "####################################",
  ];
  FF7.defineMap('midgar2_winding2', {
    name: 'Midgar Winding Tunnel', area: 'Midgar', theme: 'station', music: 'hurryfaster', look: WIND_LOOK,
    battle: { table: 'midgar_raid_tunnel', bg: 'sewer', rate: 1 },
    lights: [[16, 2, '#ffd080', 2], [32, 5, '#ffd080', 2], [3, 8, '#80ffa0', 2]],
    grid: WIND2,
    entries: { from_winding1: [3, 1, 'down'] },
    exits: [{ at: [3, 0, 2, 1], to: 'midgar2_winding1', entry: 'from_winding2' }],
    items: [
      { at: [1, 3], item: 'magic_source', id: 'midgar2_wind2_magic' },
      { at: [34, 5], item: 'mind_source', id: 'midgar2_wind2_mind' },
      { at: [1, 8], materia: 'w_item', id: 'midgar2_wind2_witem' },
    ],
    triggers: [
      { at: [3, 8], on: 'talk', run: function* (s) { yield s.msg("The tracks end in a heap of rubble. This is as far as the tunnel goes."); } },
    ],
  });

  // ------------------------------------------------------------------ the tunnel junction
  const JUNCTION = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "##H#########################::######",
    "#...#######################P..P#####",
    "#...#######################P..P#####",
    "#...#######################P..P#####",
    "#..o#######################P..P#####",
    "#...#######################P..P#####",
    "#...PPPPPPPPPPPPPPPPPPPPPPPP..PPPPP#",
    "#.................................x#",
    "#.................................x#",
    "#.................................x#",
    "#PPPPPPPPPPPPPP..PPPPPPPPPPPPPPPPPP#",
    "###############..###################",
    "###############..###################",
    "###############..###################",
    "               ..                   ",
  ];
  FF7.defineMap('midgar2_junction', {
    name: 'Midgar Underground Junction', area: 'Midgar', theme: 'station', music: 'hurryfaster', look: WIND_LOOK,
    battle: { table: 'midgar_raid', bg: 'sewer', rate: 0.8 },
    lights: [[2, 3, '#ffe0a0', 2], [28, 3, '#b0d8ff', 2], [16, 9, '#ffd080', 3]],
    grid: JUNCTION,
    entries: { from_tunnel: [15, 13, 'up'], from_base: [2, 2, 'down'], from_hq: [28, 2, 'down'] },
    exits: [
      { at: [15, 15, 2, 1], to: 'midgar2_tunnel', entry: 'from_junction' },
      { at: [2, 1, 1, 1], to: 'midgar2_cannon_base', entry: 'from_junction' },
      { at: [28, 1, 2, 1], to: 'midgar2_hq_plaza', entry: 'from_tunnel' },
    ],
    triggers: [
      { at: [34, 8, 1, 3], on: 'talk', run: function* (s) { yield s.msg("The tunnel has caved in. There's no way through."); } },
      { at: [2, 1], on: 'talk', run: function* (s) { yield s.msg("A ladder leading up to the surface. From up there it can't be far to the cannon."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_junction_seen')) return;
      s.set('c11a_junction_seen');
      yield s.say('cloud', "(A ladder up to the surface to the west... that's the way to the Sister Ray.)\f(The passage to the northeast leads back toward the Shinra Building.)");
    },
  });
})();

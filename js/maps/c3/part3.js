// Chapter 3 (part 3) — the sewers under Wall Market (Aps), the Train Graveyard (with its train-car
// puzzle, simplified), the Sector 7 support pillar (Wedge, Biggs, Jessie, Barret, Reno, Tseng) and
// the collapse of the Sector 7 plate.
(function () {
  const C3 = FF7.c3 = FF7.c3 || {};

  // ================================================================== sewer: where Corneo's trapdoor lands
  const LAND = [
    "##############################",
    "#PP.....PPPP.......PPP.....PP#",
    "#............................#",
    "#..o...................B.....#",
    "#............................#",
    "#~~~~~~~~~~~~~~~~~~~~~~KK~~~~#",
    "#~~~~~~~~~~~~~~~~~~~~~~KK~~~~#",
    "#~~~~~~~~~~~~~~~~~~~~~~KK~~~~#",
    "#~~~~~~~~~~~~~~~~~~~~~~KK~~~~#",
    "#.............................",
    "#..P.........o................",
    "#.............................",
    "##############################",
  ];
  FF7.defineMap('sewer_landing', {
    name: 'Sewer', area: 'Midgar', theme: 'sewer', music: 'lurking',
    battle: { table: 'sewer', bg: 'sewer', rate: 1, if: s => s.flag('c3_aps_beaten') },
    grid: LAND,
    entries: { from_corneo: [8, 3, 'down'], from_tunnel: [28, 10, 'left'] },
    exits: [
      { at: [29, 9, 1, 3], to: 'sewer_tunnel', entry: 'from_landing', if: s => s.flag('c3_aps_beaten'),
        blocked: function* (s) { yield s.say('cloud', "(Tifa and {AERIS} first.)"); } },
    ],
    items: [{ at: [4, 2], item: 'potion', id: 'sewer_landing_potion' }],
    // FF7 date points: whoever Cloud checks on first gets +3 (Tifa or Aeris)
    npcs: [
      { id: 'sewtifa', name: 'Tifa', model: 'tifa', at: [10, 3], dir: 'down', anim: 'lie', faceOnTalk: false,
        show: s => !s.flag('c3_aps_beaten'), talk: function* (s) {
          if (!s.flag('c3_sewer_woke')) { s.set('c3_sewer_woke'); FF7.story.datePts(s, { tifa: 3 }); }
          yield* FF7.story.c3_aps(s);
        } },
      { id: 'sewaeris', name: 'Aeris', model: 'aeris', at: [6, 3], dir: 'down', anim: 'lie', faceOnTalk: false,
        show: s => !s.flag('c3_aps_beaten'), talk: function* (s) {
          if (!s.flag('c3_sewer_woke')) { s.set('c3_sewer_woke'); FF7.story.datePts(s, { aeris: 3 }); }
          yield* FF7.story.c3_aps(s);
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_sewer_intro')) return;
      s.set('c3_sewer_intro');
      s.anim('player', 'lie');
      yield s.fadeIn(40);
      yield 40;
      s.stopAnim('player');
      s.anim('player', 'kneel');
      yield 30;
      s.stopAnim('player');
      yield s.say('cloud', "......Ugh.\f(The sewers. That creep dropped us straight down the drain.)");
      yield s.msg('Tifa and {AERIS} are still out cold. Check on them when you are ready.');
    },
  });

  FF7.story.c3_aps = function* (s) {
    s.stopAnim('sewtifa'); s.stopAnim('sewaeris');
    s.anim('sewtifa', 'kneel'); s.anim('sewaeris', 'kneel');
    yield 30;
    s.stopAnim('sewtifa'); s.stopAnim('sewaeris');
    yield s.say('aeris', "Owww... Where are we? It smells awful......");
    yield s.say('tifa', "The sewers. Corneo sent us down the drain like yesterday's garbage.\f......Cloud! Sector 7! We have to hurry!");
    yield s.say('aeris', "I'm coming with you.");
    yield s.face('sewtifa', 'sewaeris');
    yield s.say('tifa', "Aeris, you don't have to. This is our fight... AVALANCHE's fight.");
    yield s.say('aeris', "There's a little girl in Sector 7, isn't there? I heard you, back there. I want to help.");
    yield s.say('tifa', "......Thank you.");
    // something stirs in the water
    s.sfx('alarm_short');
    s.shake(3, 40);
    yield s.emote('sewtifa', '!');
    yield s.say('tifa', "Wait... Something's moving in the water!");
    s.spawn('apsM', { enemy: 'aps', scale: 1.2 }, 14, 6, 'up', { name: 'Aps' });
    s.sfx('hit');
    yield s.cam(12, 5, 30);
    yield s.say('aeris', "Wh-what IS that?!");
    yield s.say('cloud', "......The Don's pet, I'd guess.");
    const r = yield s.battle({ table: 'boss_aps', bg: 'sewer', music: 'boss', noEscape: true });
    s.remove('apsM');
    s.camFollow();
    s.set('c3_aps_beaten');
    s.hide('sewtifa'); s.hide('sewaeris');
    yield s.say('tifa', "Phew... Corneo and his pets. Let's get out of here before something else crawls out.");
    yield s.say('cloud', "The sewers should come out near the Train Graveyard. Sector 7's pillar is past that. Let's move.");
  };

  // ================================================================== sewer tunnel: ladders, Steal Materia, the hole
  const TUNNEL = [
    "##################################",
    "#PP.........   .....PPP.......PPP#",
    "#...........   ...............o..#",
    "#...........zzz..................#",
    "#..o........   ........B.........#",
    "#...........   ..................#",
    "#....H................~~~.....H..#",
    "......................~~~........#",
    "...x........o.........~~~........#",
    "......................~~~......g.#",
    "#.....................~~~........#",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "##################################",
  ];
  FF7.defineMap('sewer_tunnel', {
    name: 'Sewer', area: 'Midgar', theme: 'sewer', music: 'lurking',
    battle: { table: 'sewer', bg: 'sewer', rate: 1 },
    grid: TUNNEL,
    heights: C3.hm(TUNNEL, [[1, 1, 32, 5, 6], [5, 6, 1, 1, 3], [30, 6, 1, 1, 3]]),
    entries: { from_landing: [1, 8, 'right'] },
    exits: [
      { at: [0, 7, 1, 3], to: 'sewer_landing', entry: 'from_tunnel' },
      { at: [31, 9, 1, 1], run: function* (s) {
          yield s.msg('A dark hole in the floor. The sound of rushing water echoes up from below.');
          const c = yield s.ask(null, 'Jump down?', ['Jump', 'Not yet']);
          if (c !== 0) return;
          s.sfx('falling');
          yield s.fadeOut(24);
          yield s.goto('sewer_outlet', 'from_hole');
        } },
    ],
    items: [{ at: [18, 2], materia: 'steal', id: 'sewer_tunnel_steal' }],
    onEnter: function* (s) {
      if (s.flag('c3_tunnel_talk')) return;
      s.set('c3_tunnel_talk');
      yield s.say('aeris', "Hey, {CLOUD}? That dress really did look good on you, you know.");
      yield s.say('tifa', "She's right. Maybe you should keep it.");
      yield s.say('cloud', "......Forget it ever happened.");
      yield s.say('aeris', "Hee hee. Not a chance.");
    },
  });

  // ================================================================== sewer outlet (ladder up to the Train Graveyard)
  const OUTLET = [
    "######################### ",
    "#PPP......PP........H.... ",
    "#........................ ",
    "#...~~~~~~~~~~~~~~~~..... ",
    "#...~~~~~~~~~~~~~~~~..o.. ",
    "#...~~~~~~~~~~~~~~~~..... ",
    "#........................ ",
    "#..B..................... ",
    "######################### ",
  ];
  FF7.defineMap('sewer_outlet', {
    name: 'Sewer', area: 'Midgar', theme: 'sewer', music: 'lurking',
    camera: { yaw: 35, pitch: 58, dist: 10 },   // diagonal view like 01-midgar_101 (east side open)
    battle: { table: 'sewer', bg: 'sewer', rate: 1 },
    grid: OUTLET,
    entries: { from_hole: [2, 6, 'right'], from_graveyard: [20, 2, 'down'] },
    exits: [{ at: [20, 1, 1, 1], to: 'tg_south', entry: 'from_sewer' }],
    onEnter: function* (s) {
      if (s.entry() === 'from_hole') { s.shake(2, 12); s.sfx('hit'); }
    },
  });

  // ================================================================== Train Graveyard, southern half (arrival)
  const TGS = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#.......x.........R...........x....#",
    "#.o......rrrrrrrrrrrrrrrrrr........#",
    "#..................x.......o.......#",
    "#....B..........................R..#",
    "#........o.........................#",
    "#..................................#",
    "#..................................#",
    "#hhhhh+hhhhhhhhhhhhhhhhxxhhhh+hhhhh#",
    "#hhhhh+hhhhhhhhhhhhhhhhxxhhhh+hhhhh#",
    "#....................H.xx...........",
    "#......................xx...........",
    "#...S..................xx...........",
    "#......................xx...........",
    "#.:....................xx.........x#",
    "####################################",
  ];
  FF7.defineMap('tg_south', {
    name: 'Train Graveyard', area: 'Midgar', theme: 'graveyard', music: 'lurking',
    camera: { pitch: 62, dist: 11 },   // steep view down among the wrecks (01-midgar_102)
    battle: { table: 'train_graveyard_south', bg: 'graveyard', rate: 0.45 },
    grid: TGS,
    entries: { from_sewer: [2, 13, 'up'], trainB_north: [29, 7, 'down'], trainB_south: [29, 10, 'down'], from_north: [34, 11, 'left'] },
    exits: [
      { at: [2, 14, 1, 1], to: 'sewer_outlet', entry: 'from_graveyard' },
      { at: [29, 8, 1, 1], to: 'tg_car', entry: 'from_north', sfx: 'door' },
      { at: [29, 9, 1, 1], to: 'tg_car', entry: 'from_south', sfx: 'door' },
      { at: [35, 10, 1, 4], run: function* (s) { yield s.goto(s.flag('c3_tg_moved') ? 'tg_north2' : 'tg_north', 'from_south'); } },
    ],
    items: [{ at: [32, 13], item: 'potion', id: 'tg_south_potion' }],
    triggers: [
      { at: [9, 5], on: 'talk', run: C3.stash('c3_tg_barrel1', 'hi_potion', 1, 'Something is wedged inside the old barrel...') },
      { at: [2, 2], on: 'talk', run: C3.stash('c3_tg_barrel2', 'echo_screen', 1, 'There is something at the bottom of the barrel...') },
      { at: [27, 3], on: 'talk', run: function* (s) { yield s.msg('An empty barrel. It smells of old oil.'); } },
      { at: [21, 10], run: function* (s) {
          const c = yield s.ask(null, 'A rusty ladder runs up the side of the train car. Climb over?', ['Climb', 'Leave it']);
          if (c !== 0) return;
          yield s.jump('player', 21, 7, 2.6, 40);
          if (!s.flag('c3_tg_roof')) {
            s.set('c3_tg_roof');
            yield s.msg('There was something lying on the roof of the car!');
            yield s.give('hi_potion');
          }
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_tg_talk')) return;
      s.set('c3_tg_talk');
      yield s.say('aeris', "Trains... There must be hundreds of them. Is this a graveyard for trains?");
      yield s.say('tifa', "That's what everybody calls it. Old cars get dumped here and left to rot. People say it's haunted.");
      yield s.say('aeris', "H-haunted? ......You're kidding, right?");
      yield s.say('cloud', "Sector 7 is on the other side. Keep moving.");
    },
  });

  // ---- the car on the right (walk through it; a Potion inside)
  // An old passenger car of the same make as the midnight train (chapter 1/2's train cars): benches along
  // both walls with the aisle and grating between, doors in the middle of the sides - but abandoned for
  // years: torn, faded cushions with the springs showing, snapped seat backs, straps gone, grimy broken
  // windows, junk in the aisle, one weak lamp. Seen diagonally from above like the train.
  const CAR = [
    "#ww#ww#w#+#w#ww#w#",
    "#NNNNNNN...NNNNNN#",
    "#................#",
    "#.gggggggggggggg.#",
    "#.x..............#",
    "#SSSSSSS...SSSSSS#",
    "#ww#ww#w#+#w#ww#w#",
  ];
  FF7.defineMap('tg_car', {
    name: 'Train Graveyard - Old Car', area: 'Midgar', theme: 'station', music: 'lurking',
    look: { wall: '#3e3a32', wallTop: '#141210', floor: ['#4a3c2c', '#443628'], floorTex: { floor: 'planks' }, wallTex: 'panel', window: '#232a2a',
      seat: '#4a5a60', seatBase: '#3a2a1e', brass: '#6a5a3a', seatWear: 0.75, trim: '#2a241c',
      indoor: true, sky: ['#000000', '#000000'], fog: null, ambient: [0.3, 0.3, 0.32], light: [0.56, 0.54, 0.5] },
    camera: { yaw: 32, pitch: 44, dist: 8.5 },
    legend: { N: 'trainseat_n', S: 'trainseat_s' },
    grid: CAR,
    props: [{ at: [0, 3], prop: 'banner', rot: 90, col: '#b8aa84', col2: '#6a5a40', w: 1.4, h: 0.62, y: 1.45, text: '11:50', text2: 'SECTOR 7 LINE', textCol: '#4a3a28' }],
    lights: [[9, 3, '#d0c090', 3], [3, 3, '#6a7a8a', 2]],
    entries: { from_north: [9, 1, 'down'], from_south: [9, 5, 'up'] },
    exits: [
      { at: [9, 0, 1, 1], to: 'tg_south', entry: 'trainB_north', sfx: 'door' },
      { at: [9, 6, 1, 1], to: 'tg_south', entry: 'trainB_south', sfx: 'door' },
    ],
    items: [{ at: [4, 2], item: 'potion', id: 'tg_car_potion' }],
    objects: [{ at: [17, 3], talk: function* (s) { yield s.msg('A faded poster: "SECTOR 7 LINE — Last train 11:50 PM."'); } }],
  });

  // ================================================================== Train Graveyard, northern half (the train puzzle)
  // The main line (rows 5-7) leaves the yard west for Sector 7 through a gap in the pile of wrecks (x 4-5). An old
  // engine's car stands in the gap, and the engine can't haul it clear: the brown engine is parked nose to nose with
  // it. Run the brown engine back east first, then the old engine, which drags its car out of the gap. The two
  // trains are real (rusted) train models that roll along the line; the tiles under them are blocked per visit.
  // Dead trains stand on the sidings north and south (q: solid ground under them).
  const TGN = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "#...hh..o.o.o.qqqqqqqqqqqqqqqqq....#",
    "#...hh........qqqqqqqqqqqqqqqqq....#",
    "#...hh..x.....qqqqqqqqqqqqqqqqq....#",
    "#...hh.............................#",
    "::::::::::::::::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::::",
    "#...hh..............................",
    "#...hh.............................#",
    "#...hh..........qqqqqqqqqqqqqqqqq..#",
    "#...hh..........qqqqqqqqqqqqqqqqq..#",
    "#...hh...R......qqqqqqqqqqqqqqqqq..#",
    "#...hh.......x.....................#",
    "####################################",
  ];
  // The trains on the main line: each model's centre u (in tiles, x = u * TILE) before and after its run, its half
  // length, and where its cab is (tiles east of u). The old engine faces east with its car behind it (west); the
  // brown engine faces west, its cab at its east end.
  const TG = {
    row: 6,
    old: { id: 'tg_old', u: [9.8, 16.7], half: 8.62, cab: 1.6 },
    brown: { id: 'tg_brown', u: [22.72, 29.62], half: 4.23, cab: 2.7 },
  };
  const tgObj = (s, t) => (s.field.objects || []).find(q => q.id === t.id);
  function tgBlock(s, u, half, on) {
    for (let x = Math.floor(u - half); x <= Math.floor(u + half); x++)
      if (Math.min(x + 1, u + half) - Math.max(x, u - half) > 0.25) for (let y = TG.row - 1; y <= TG.row + 1; y++) s.block(x, y, on);
  }
  // put both trains where they stand now (moved: has that one run?)
  function tgSetup(s, oldMoved, brownMoved) {
    [[TG.old, oldMoved], [TG.brown, brownMoved]].forEach(([t, moved]) => {
      const u = t.u[moved ? 1 : 0], o = tgObj(s, t);
      if (o) o.at = [u - 0.5, TG.row];
      tgBlock(s, u, t.half, true);
    });
  }
  // Ride the cab: the player climbs in (hidden, carried along so the camera rides with the train), the train rolls
  // from u0 to u1 over n frames with its wheels turning (ease 'smooth', or 'slam': speeding up until it hits
  // something), then the player hops down beside the cab at out [x, y] (the south side, in view of the camera).
  function* tgRun(s, t, u0, u1, n, ease, out) {
    const o = tgObj(s, t), pl = s.field.player, T = FF7.field.TILE, facing = t === TG.old ? 1 : -1;
    s.hide('player');
    tgBlock(s, u0, t.half, false);
    s.sfx('train_horn');
    yield 30;
    s.sfx('train'); s.shake(2, 20);
    let prev = u0;
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = ease === 'slam' ? k * k : k * k * (3 - 2 * k), u = u0 + (u1 - u0) * e;
      if (o) {
        o.at = [u - 0.5, TG.row];
        // the wheels: a 40-frame 'move' cycle rolls the train 3.77 m; backwards when it runs tail first
        if (o._model) { o._model.play('move'); o._model.speed = (u - prev) * T * 40 / 3.77 * facing; }
      }
      pl.x = (u + t.cab) * T; pl.z = (TG.row + 0.5) * T;
      prev = u;
      yield 1;
    }
    if (o && o._model) { o._model.clip = null; o._model.clipName = null; }
    tgBlock(s, u1, t.half, true);
    s.show('player', out[0], out[1], 'down');
  }
  FF7.defineMap('tg_north', {
    name: 'Train Graveyard', area: 'Midgar', theme: 'graveyard', music: 'lurking',
    camera: { pitch: 68, dist: 12 },   // the car piles seen from above (01-midgar_103, 104)
    battle: { table: 'train_graveyard', bg: 'graveyard', rate: 0.6 },
    legend: { q: 'block' },
    grid: TGN,
    entries: { from_south: [34, 8, 'left'], from_pillar: [1, 6, 'right'], after_trains: [18, 8, 'down'] },
    props: [
      { at: [0, 6], prop: 'track', len: 36 },                                              // the main line
      { at: [13, 2], prop: 'track', len: 23 }, { at: [15, 11], prop: 'track', len: 21 },   // the sidings
      { at: [22, 2], vehicle: 'train', rot: 90, wreck: true, cars: 1, lift: 0.05 },
      { at: [24, 11], vehicle: 'train', rot: -90, wreck: '#4a4a44', cars: 1, lift: 0.05 },
    ],
    objects: [
      { id: 'tg_old', at: [TG.old.u[0] - 0.5, TG.row], model: { vehicle: 'train', opts: { cars: 1, wreck: '#5a524a' } }, dir: 'right', hover: 0.05 },
      { id: 'tg_brown', at: [TG.brown.u[0] - 0.5, TG.row], model: { vehicle: 'train', opts: { cars: 0, wreck: '#8a4a1e' } }, dir: 'left', hover: 0.05 },
    ],
    items: [
      { at: [9, 12], item: 'potion', id: 'tg_north_potion' },
      { at: [2, 3], item: 'hi_potion', id: 'tg_north_hipotion' },
    ],
    exits: [{ at: [35, 5, 1, 4], to: 'tg_south', entry: 'from_north' }],
    onLoad: s => tgSetup(s, false, s.flag('c3_tg_train1')),
    triggers: [
      { at: [8, 1], on: 'talk', run: C3.stash('c3_tg_barrel3', 'ether', 1, 'Something glints inside the leftmost barrel...') },
      { at: [10, 1], on: 'talk', run: function* (s) { yield s.msg('An empty barrel.'); } },
      { at: [12, 1], on: 'talk', run: function* (s) { yield s.msg('An empty barrel. Something skitters away inside it.'); } },
      { at: [10, 5, 3, 3], on: 'talk', run: function* (s) { yield* FF7.story.c3_oldEngine(s); } },
      { at: [1, 5, 9, 3], on: 'talk', run: function* (s) { yield s.msg("A rotting passenger car, jammed in the gap in the pile of wrecks. Past it, the line runs on toward Sector 7.\nIt's still coupled to the old engine in front of it."); } },
      { at: [13, 5, 11, 3], on: 'talk', if: s => !s.flag('c3_tg_train1'), run: function* (s) { yield s.msg('Two engines, parked nose to nose. Their buffers have rusted solid against each other.'); } },
      { at: [24, 5, 3, 3], on: 'talk', if: s => !s.flag('c3_tg_train1'), run: function* (s) { yield* FF7.story.c3_brownEngine(s); } },
      { at: [31, 5, 3, 3], on: 'talk', if: s => s.flag('c3_tg_train1'), run: function* (s) { yield* FF7.story.c3_brownEngine(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_tgn_talk')) return;
      s.set('c3_tgn_talk');
      yield s.say('tifa', "The way to Sector 7 is on the far side... but that old car's sitting right across the tracks.");
      yield s.say('aeris', "Some of these engines still look like they might run. Maybe we can shove it out of the way?");
    },
  });
  // After both runs: the same yard with the trains where they stopped, and the way west open.
  FF7.defineMap('tg_north2', Object.assign({}, FF7.maps.tg_north, {
    exits: [
      { at: [35, 5, 1, 4], to: 'tg_south', entry: 'from_north' },
      { at: [0, 5, 1, 3], to: 'pillar_base', entry: 'from_graveyard', if: s => !C3.plate(s),
        blocked: function* (s) { yield s.say('cloud', "(Sector 7... There's nothing left out there but wreckage.)"); } },
    ],
    onLoad: s => tgSetup(s, true, true),
    triggers: FF7.maps.tg_north.triggers.slice(0, 3).concat([
      { at: [17, 5, 3, 3], on: 'talk', run: function* (s) { yield s.msg('The old engine sits still, its car hauled clear of the gap. It did its job.'); } },
      { at: [31, 5, 3, 3], on: 'talk', run: function* (s) { yield s.msg("The brown engine's boiler has gone cold. It won't move again."); } },
    ]),
    onEnter: null,
  }));

  FF7.story.c3_brownEngine = function* (s) {
    if (s.flag('c3_tg_train1')) { yield s.msg('The brown engine is still ticking over. It has backed off as far as the line goes.'); return; }
    yield s.msg("The brown engine. The controls are rusted, but the boiler's still warm.");
    const c = yield s.ask(null, 'Climb into the cab and throw it into reverse?', ['Throw it', 'Leave it']);
    if (c !== 0) return;
    s.set('c3_tg_train1');
    const B = TG.brown;
    yield* tgRun(s, B, B.u[0], B.u[1], 150, 'smooth', [32, 8]);
    s.sfx('hit'); s.shake(2, 16);
    yield 20;
    yield s.say('tifa', "It's clear of the old engine! Now that one should be able to move.");
  };
  FF7.story.c3_oldEngine = function* (s) {
    if (!s.flag('c3_tg_train1')) {
      yield s.msg("The old engine. You pull the lever... it grinds and shudders, but its nose is jammed against the brown engine. It won't budge.");
      return;
    }
    yield s.msg('The old engine. Its car is still stuck in the gap behind it.');
    const c = yield s.ask(null, 'Climb into the cab and open the throttle?', ['Throw it', 'Leave it']);
    if (c !== 0) return;
    s.set('c3_tg_moved');
    const A = TG.old;
    yield* tgRun(s, A, A.u[0], A.u[1], 130, 'slam', [18, 8]);
    s.sfx('crit'); s.shake(6, 40);
    yield 50;
    yield s.fadeOut(20);
    yield s.goto('tg_north2', 'after_trains');
    yield s.msg('With a screech of metal the old engine drags its car out of the gap and slams into the brown engine. The way west is clear!');
  };

  // ================================================================== Sector 7: the foot of the support pillar
  const PBASE = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hhhhhhhhhhhh##########hhhhhhhhhhhh",
    "hhhhhhhhhhhh##########hhhhhhhhhhhh",
    "hhhhhhhhhhhh##########hhhhhhhhhhhh",
    "hhhwhhhwhhhh####++####hhwhhhwhhhhh",
    "h..........l..........l..........h",
    "h...x......................x.....h",
    "h......o..........................",
    "h....S............................",
    "h.................................",
    "h.....B.......................x...",
    "h.......::::::::::::::::........xh",
    "h......::::::::::::::::::........h",
    "hxxRR..::::::::::::::::::....RRxxh",
    "hhhhhhh::::::::::::::::::hhhhhhhhh",
    "##################################",
  ];
  FF7.defineMap('pillar_base', {
    name: 'Sector 7 Pillar', area: 'Midgar', theme: 'midgar', music: 'hurry',
    look: { sky: ['#1a0604', '#5a1a0a'], fog: { color: [0.2, 0.07, 0.04], near: 8, far: 22 } },
    lights: [[16, 5, '#ff8030', 4], [5, 8, '#ffa060', 2]],
    grid: PBASE,
    entries: { from_graveyard: [32, 8, 'left'], from_stairs: [16, 5, 'down'], after_stand: [24, 8, 'left'] },
    exits: [
      { at: [33, 7, 1, 4], to: 'tg_north2', entry: 'from_pillar' },
      { at: [16, 4, 2, 1], to: 'pillar_stairs1', entry: 'from_base', sfx: 'door', if: s => s.flag('c3_wedge_talk'),
        blocked: function* (s) { yield s.say('tifa', "Cloud, wait!"); } },
      { at: [7, 14, 18, 1], to: 'pillar_base', entry: 'from_graveyard', if: s => false,
        blocked: function* (s) { yield s.say('tifa', "7th Heaven is that way... Aeris is taking care of Marlene. We have to get up there, Cloud!"); } },
    ],
    npcs: [
      { id: 'pmerchant', name: 'Item Shop', model: { base: 'man', top: '#8a6a3a', sleeve: '#8a6a3a', bottom: '#4a3a2a', hairStyle: 'cap', extras: ['apron'] }, at: [26, 8], dir: 'left',
        talk: function* (s) {
          yield s.say('Item Shop', "Are you crazy? There's a war going on up there! ......Fine, fine. If you're going up, you'd better buy something first.");
          yield s.shop('sector7_pillar_items');
        } },
      { id: 'pwoman', name: 'Woman', model: 'woman12', at: [9, 11], dir: 'up',
        talk: function* (s) { yield s.say('Woman', "The shooting started an hour ago. Shinra soldiers are all over the pillar. And that big man with the gun arm is up there fighting them all by himself!"); } },
      { id: 'pman', name: 'Man', model: 'man19', at: [24, 12], dir: 'left',
        talk: function* (s) { yield s.say('Man', "What are they doing up there? Shinra wouldn't hurt the pillar... Would they?"); } },
      { id: 'wedgedown', name: 'Wedge', model: 'wedge', at: [17, 6], dir: 'down', anim: 'lie', faceOnTalk: false, show: s => s.flag('c3_wedge_talk'),
        talk: function* (s) { yield s.msg("Wedge isn't moving."); } },
    ],
    triggers: [
      { id: 'wedge_falls', at: [13, 5, 8, 3], if: s => s.flag('c3_pillar_arrive') && !s.flag('c3_wedge_talk'),
        run: function* (s) { yield* FF7.story.c3_wedge(s); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c3_pillar_arrive')) yield* FF7.story.c3_pillarArrive(s);
    },
  });

  FF7.story.c3_pillarArrive = function* (s) {
    s.set('c3_pillar_arrive');
    s.spawn('tifa', 'tifa', 31, 8, 'left', { name: 'Tifa' });
    C3.aerisIn(s, 31, 9, 'left');
    s.sfx('shot3'); s.shake(2, 30);
    yield s.cam(16, 4, 40);
    yield s.say('tifa', "Gunfire... They're fighting up on the pillar!");
    s.sfx('shot2'); s.shake(2, 20);
    yield 30;
    s.camFollow();
    yield s.face('tifa', 'player');
    yield s.say('tifa', "That has to be Barret. Cloud, we have to get up there!\f......Marlene! She's at the bar. At 7th Heaven!");
    yield s.face('tifa', 'aeris');
    yield s.say('tifa', "Aeris... I hate to ask you this, but—");
    yield s.say('aeris', "Leave it to me. I'll find her and take her somewhere safe.");
    yield s.say('tifa', "7th Heaven is the bar with the big sign, just down that street. Her name's Marlene. She's a little girl, about this tall.");
    yield s.say('aeris', "Mm-hm. Don't worry, I grew up in the slums, too. I know all the back roads.");
    yield s.face('aeris', 'player');
    yield s.say('aeris', "{CLOUD}. Be careful up there, okay?");
    s.leave('aeris');
    yield s.run('aeris', [[24, 11], [16, 14]]);
    s.remove('aeris');
    yield s.msg('{AERIS} left the party.');
    yield s.say('tifa', "Let's go, Cloud. The stairs are at the foot of the pillar.");
    s.remove('tifa');
    if (AV() && !s.flag('c3_stand_done')) yield* FF7.story.c3_standStart(s);
  };

  // ================================================================== the last stand (Config > AVALANCHE Scenes)
  // Not in the PS1 game: meanwhile, up the pillar, Biggs, Wedge and Jessie hold the stairs against Shinra. Three
  // battles, played by the player; it ends where Cloud finds them - Jessie on the upper landing, Biggs on the lower
  // one, Wedge thrown from the stairs to the base (he falls as Cloud gets there: C3.wedge). Guests
  // (js/data/characters.js), at the party's level less one; the fights can be lost (the story goes on either way)
  const AV = () => FF7.state.config.avalancheScenes !== false;
  const STAND = { bg: 'midgar', noEscape: true, canLose: true, noRewards: true };
  FF7.story.c3_standStart = function* (s) {
    s.set('c3_stand_on');
    s.setVar('c3_stand_party', FF7.state.party.filter(Boolean).join(','));
    const lvl = Math.max(10, FF7.sys.party.avgLevel() - 1);
    ['biggs', 'wedge', 'jessie'].forEach(id => FF7.sys.party.joinGuest(id, lvl));
    yield s.fadeOut(40);
    s.party(['biggs', 'wedge', 'jessie']);
    yield s.caption('Meanwhile, high up the pillar...', { hold: 150, bg: '#000' });
    yield s.goto('pillar_stairs2', 'stand');
  };
  // the upper landing: the three; a helicopter's gunfire takes Jessie down
  FF7.story.c3_standUpper = function* (s) {
    s.set('c3_stand_upper');
    s.spawn('wedge', 'wedge', 5, 7, 'up', { name: 'Wedge' });
    s.spawn('jessie', 'jessie', 6, 7, 'up', { name: 'Jessie' });
    s.sfx('shot3'); s.shake(2, 20);
    yield s.say('biggs', "Here they come again! The choppers keep dropping 'em in up top!");
    yield s.say('jessie', "There's a detonator on the platform... If they arm it, the whole plate comes down on Sector 7!");
    yield s.say('wedge', "Th-then we hold 'em right here! Nobody gets past this landing!");
    s.spawn('grunt1', 'soldier', 8, 3, 'down', { name: 'Shinra Soldier' });
    s.spawn('grunt2', 'soldier', 10, 3, 'down', { name: 'Shinra Soldier' });
    yield s.move('grunt1', 8, 5);
    yield s.say('biggs', "For Sector 7! Let 'em have it!");
    yield s.battle(Object.assign({ enemies: ['aero_combatant', 'aero_combatant', 'grenade_combatant'] }, STAND));
    s.remove('grunt1'); s.remove('grunt2');
    s.sfx('helicopter'); s.shake(1, 60);
    yield s.say('jessie', "That chopper... it's coming around! Get down!");
    s.sfx('shot3'); s.shake(3, 20);
    s.anim('jessie', 'hurt');
    yield 24;
    s.face('jessie', 'right');
    s.anim('jessie', 'lie');
    yield s.say('biggs', "JESSIE!!");
    yield s.say('jessie', "......I'm okay... I'm okay.........Go. There's more coming up from below... Don't let them reach Barret......");
    yield s.say('wedge', "We're not leaving you here, Jessie!");
    yield s.say('jessie', "......Go on, you big lug...... I'll be right... behind you......");
    yield s.say('biggs', "......Come on, Wedge. Move!");
    s.leave('jessie');
    yield s.goto('pillar_stairs1', 'stand');
  };
  // the lower landing: Biggs and Wedge, caught between the troops below and the gunship; Wedge is thrown from the
  // stairs, Biggs fights on alone, then falls
  FF7.story.c3_standLower = function* (s) {
    s.set('c3_stand_lower');
    s.spawn('wedge', 'wedge', 17, 7, 'down', { name: 'Wedge' });
    yield s.say('wedge', "Biggs... there's more of 'em coming up the stairs!");
    yield s.say('biggs', "Then we're caught in the middle. Figures. ......Back to back, Wedge!");
    yield s.battle(Object.assign({ enemies: ['aero_combatant', 'mighty_grunt', 'aero_combatant'] }, STAND));
    s.sfx('helicopter'); s.shake(2, 40);
    yield s.say('wedge', "Heh... heh... We did it, Biggs! We actually—");
    s.sfx('shot3'); s.shake(3, 20);
    s.anim('wedge', 'hurt');
    yield s.say('wedge', "Wha—!? WHOOOAAAH......!!");
    s.sfx('falling');
    yield s.jump('wedge', 22, 9, 0.6, 26);   // (off the landing's open side)
    s.remove('wedge');
    s.leave('wedge');
    yield s.say('biggs', "WEDGE!!! ......Damn it... DAMN IT!");
    s.sfx('shot2');
    yield s.say('biggs', "......Come on, then! I'm still standing!...Barret. It's all on you now.");
    yield s.battle(Object.assign({ enemies: ['soldier_3rd'] }, STAND));
    s.sfx('shot3'); s.shake(3, 20);
    yield s.say('biggs', "......Heh...... Not bad...... for a guy who...... runs a...... bar tab......");
    yield s.fadeOut(80);
    // back to Cloud at the base: the party as it was
    const saved = String(s.get('c3_stand_party') || 'cloud,tifa').split(',').filter(id => id && !FF7.isGuest(id));
    ['biggs', 'wedge', 'jessie'].forEach(id => { if (s.isMember(id)) s.leave(id); });
    s.party(saved.length ? saved : ['cloud', 'tifa']);
    s.unset('c3_stand_on');
    s.set('c3_stand_done');
    yield s.goto('pillar_base', 'after_stand');
  };

  FF7.story.c3_wedge = function* (s) {
    s.set('c3_wedge_talk');
    s.sfx('falling');
    yield 30;
    s.shake(4, 20); s.sfx('hit');
    s.spawn('wedge', 'wedge', 17, 6, 'down', { name: 'Wedge' });
    s.anim('wedge', 'lie');
    s.spawn('tifa', 'tifa', 15, 7, 'right', { name: 'Tifa' });
    yield s.say('tifa', "WEDGE!!");
    yield s.move('player', 16, 6);
    yield s.face('player', 'right');
    yield s.say('wedge', "......Cloud...? Tifa...? Heh... Sorry... I kinda... fell......");
    yield s.say('wedge', "Barret's... still up top... He's fighting them all... Help him......\fAnd... Marlene... somebody's gotta......");
    yield s.say('tifa', "Marlene's safe. A friend went to get her. Hang in there, Wedge!");
    yield s.say('wedge', "......Heh... That's... good......\f......Cloud...... Go......");
    yield 60;
    yield s.say('tifa', "......Wedge......");
    yield s.say('cloud', "......Let's go, Tifa.");
    s.remove('wedge');
    s.remove('tifa');
    s.show('wedgedown');
  };

  // ================================================================== the pillar stairs (lower)
  const ST1 = [
    "################+#########",
    "#        ######...       #",
    "#        ######...       #",
    "#        ######^^^       #",
    "#        ######^^^       #",
    "#        ######^^^       #",
    "#        ######......    #",
    "#        ######......    #",
    "#        ######^^^       #",
    "#        ######^^^       #",
    "#        ######^^^       #",
    "#        ######^^^       #",
    "#  ...............       #",
    "#  ...............       #",
    "###+######################",
  ];
  const pillarLook = { sky: ['#140404', '#4a1408'], fog: { color: [0.18, 0.06, 0.03], near: 8, far: 22 }, wall: '#5a5a66', wallH: 3.2 };
  FF7.defineMap('pillar_stairs1', {
    name: 'Sector 7 Pillar', area: 'Midgar', theme: 'midgar', music: 'hurry', look: pillarLook,
    battle: { table: 'sector7_pillar', bg: 'midgar', rate: 1, if: s => !C3.plate(s) && !s.flag('c3_stand_on') },
    grid: ST1,
    heights: C3.hm(ST1, [[15, 1, 3, 2, 9], [15, 3, 3, 1, 8], [15, 4, 3, 1, 7], [15, 5, 3, 1, 6], [15, 6, 6, 2, 5], [15, 8, 3, 1, 4], [15, 9, 3, 1, 3], [15, 10, 3, 1, 2], [15, 11, 3, 1, 1], [16, 0, 1, 1, 9]]),
    lights: [[19, 7, '#ff8040', 3]],
    entries: { from_base: [3, 13, 'up'], from_above: [16, 1, 'down'], stand: [19, 7, 'left'] },
    exits: [
      { at: [3, 14, 1, 1], to: 'pillar_base', entry: 'from_stairs', sfx: 'door' },
      { at: [16, 0, 1, 1], to: 'pillar_stairs2', entry: 'from_below' },
    ],
    npcs: [
      { id: 'biggsdown', name: 'Biggs', model: 'biggs', at: [19, 7], dir: 'left', anim: 'lie', faceOnTalk: false, show: s => s.flag('c3_biggs_talk'),
        talk: function* (s) { yield s.msg("Biggs lies still. His bandana is soaked through."); } },
    ],
    triggers: [
      { id: 'biggs', at: [15, 6, 6, 2], if: s => !s.flag('c3_biggs_talk') && !s.flag('c3_stand_on'), run: function* (s) { yield* FF7.story.c3_biggs(s); } },
    ],
    onEnter: function* (s) { if (s.flag('c3_stand_on') && !s.flag('c3_stand_lower')) yield* FF7.story.c3_standLower(s); },
  });

  FF7.story.c3_biggs = function* (s) {
    s.set('c3_biggs_talk');
    s.spawn('biggs', 'biggs', 19, 7, 'left', { name: 'Biggs' });
    s.anim('biggs', 'lie');
    s.spawn('tifa', 'tifa', 16, 7, 'right', { name: 'Tifa' });
    yield s.say('tifa', "Biggs!");
    yield s.move('player', 18, 6);
    yield s.face('player', 'biggs');
    yield s.say('biggs', "......Hey... Cloud... Tifa... Took you long enough... heh......");
    yield s.say('biggs', "They came out of nowhere... Shinra... the Turks... We tried to hold 'em off......\fForget about me. Barret's still up there... Get up there... and give 'em hell for me, huh......?");
    yield s.say('tifa', "Biggs... We will. I promise.");
    yield s.say('biggs', "......Heh...... Knew I could... count on......");
    yield 60;
    s.remove('biggs');
    s.show('biggsdown');
    s.remove('tifa');
    yield s.say('cloud', "(......Keep climbing.)");
  };

  // ================================================================== the pillar stairs (upper)
  const ST2 = [
    "#########+################",
    "#       ...######        #",
    "#       ...######        #",
    "#       ^^^######        #",
    "#       ^^^######        #",
    "#       ^^^######        #",
    "#    ......######        #",
    "#    ......######        #",
    "#       ^^^######        #",
    "#       ^^^######        #",
    "#       ^^^######        #",
    "#       ^^^######        #",
    "#       ...............  #",
    "#       ...............  #",
    "######################+###",
  ];
  FF7.defineMap('pillar_stairs2', {
    name: 'Sector 7 Pillar', area: 'Midgar', theme: 'midgar', music: 'hurry', look: pillarLook,
    battle: { table: 'sector7_pillar_upper', bg: 'midgar', rate: 1, if: s => !C3.plate(s) && !s.flag('c3_stand_on') },
    grid: ST2,
    heights: C3.hm(ST2, [[8, 1, 3, 2, 9], [8, 3, 3, 1, 8], [8, 4, 3, 1, 7], [8, 5, 3, 1, 6], [5, 6, 6, 2, 5], [8, 8, 3, 1, 4], [8, 9, 3, 1, 3], [8, 10, 3, 1, 2], [8, 11, 3, 1, 1], [9, 0, 1, 1, 9]]),
    lights: [[6, 7, '#ff8040', 3]],
    entries: { from_below: [22, 13, 'up'], from_top: [9, 1, 'down'], stand: [7, 6, 'up'] },
    exits: [
      { at: [22, 14, 1, 1], to: 'pillar_stairs1', entry: 'from_above' },
      { at: [9, 0, 1, 1], to: 'pillar_top', entry: 'from_stairs' },
    ],
    npcs: [
      { id: 'jessiedown', name: 'Jessie', model: 'jessie', at: [6, 7], dir: 'right', anim: 'lie', faceOnTalk: false, show: s => s.flag('c3_jessie_talk'),
        talk: function* (s) { yield s.msg("Jessie's eyes are closed. She looks almost like she's sleeping."); } },
    ],
    triggers: [
      { id: 'jessie', at: [5, 6, 6, 2], if: s => !s.flag('c3_jessie_talk') && !s.flag('c3_stand_on'), run: function* (s) { yield* FF7.story.c3_jessie(s); } },
    ],
    onEnter: function* (s) { if (s.flag('c3_stand_on') && !s.flag('c3_stand_upper')) yield* FF7.story.c3_standUpper(s); },
  });

  FF7.story.c3_jessie = function* (s) {
    s.set('c3_jessie_talk');
    s.spawn('jessie', 'jessie', 6, 7, 'right', { name: 'Jessie' });
    s.anim('jessie', 'lie');
    s.spawn('tifa', 'tifa', 9, 7, 'left', { name: 'Tifa' });
    yield s.say('tifa', "Jessie!!");
    yield s.move('player', 7, 6);
    yield s.face('player', 'jessie');
    yield s.say('jessie', "......Cloud... Is that you......? Sorry... I think I messed up... again......");
    yield s.say('jessie', "Funny... We set off bombs to save the planet... and this is how it ends for us......");
    yield s.say('tifa', "Don't talk like that, Jessie. Just hold on!");
    yield s.say('jessie', "......Barret... up top... Hurry... Please......\f......Cloud...... It was... fun... having you around......");
    yield 60;
    yield s.say('tifa', "......Jessie......");
    s.remove('jessie');
    s.show('jessiedown');
    s.remove('tifa');
    yield s.say('cloud', "(......Shinra. You'll pay for this.)");
  };

  // ================================================================== the top of the pillar
  const TOP = [
    "                            ",
    "                            ",
    "   ======================   ",
    "   =....................=   ",
    "   =....PP........PP....=   ",
    "   =......MMZZMM........=   ",
    "   =....................=   ",
    "   =..o..............B..=   ",
    "   =....................=   ",
    "   =....................=   ",
    "   =.......gggggg.......=   ",
    "   =....................=   ",
    "   ==========++==========   ",
    "                            ",
  ];
  FF7.defineMap('pillar_top', {
    name: 'Top of the Pillar', area: 'Midgar', theme: 'midgar', music: 'hurry',
    camera: { pitch: 64, dist: 10 },   // looking down on the round platform (01-midgar_110)
    look: { sky: ['#200806', '#7a2a10'], fog: { color: [0.24, 0.08, 0.04], near: 10, far: 26 } },
    lights: [[12, 5, '#ff4030', 3], [13, 5, '#ff4030', 3]],
    grid: TOP,
    entries: { from_stairs: [13, 11, 'up'] },
    exits: [{ at: [13, 12, 2, 1], to: 'pillar_stairs2', entry: 'from_top', if: s => !s.flag('c3_reno_beaten'),
      blocked: function* (s) { yield s.say('barret', "Ain't no time for that!"); } }],
    npcs: [
      { id: 'barretTop', name: 'Barret', model: 'barret', at: [8, 5], dir: 'up', show: s => s.flag('c3_barret_joined') && !s.flag('c3_reno_beaten'),
        talk: function* (s) { yield s.say('barret', "That panel by the pipes is what's gonna bring the whole plate down! We gotta shut it off, NOW!"); } },
    ],
    triggers: [
      { id: 'reno', at: [8, 6, 10, 2], if: s => s.flag('c3_barret_joined'), run: function* (s) { yield* FF7.story.c3_reno(s); } },
      { at: [12, 5, 2, 1], on: 'talk', if: s => s.flag('c3_barret_joined') && !s.flag('c3_reno_beaten'),
        run: function* (s) { yield s.msg('A control panel, bolted to the pillar. A red light blinks... and blinks... and blinks.'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c3_barret_joined')) yield* FF7.story.c3_barretTop(s);
    },
  });

  FF7.story.c3_barretTop = function* (s) {
    s.set('c3_barret_joined');
    s.hide('barretTop');
    s.spawn('barret', 'barret', 8, 5, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 14, 11, 'up', { name: 'Tifa' });
    s.spawn('grunt1', 'soldier', 10, 3, 'down', { name: 'Shinra Soldier' });
    s.spawn('grunt2', 'soldier', 17, 3, 'down', { name: 'Shinra Soldier' });
    s.sfx('helicopter');
    s.anim('barret', 'shoot');
    s.sfx('shot3'); s.shake(2, 20);
    yield 20;
    s.anim('grunt1', 'hurt');
    yield 10;
    s.remove('grunt1');
    s.sfx('shot3');
    yield 20;
    s.anim('grunt2', 'hurt');
    yield 10;
    s.remove('grunt2');
    s.stopAnim('barret');
    yield s.say('barret', "C'mon! C'MON! Is that all you got, Shinra?! Send me more! I got plenty for ya!");
    yield s.say('tifa', "Barret!");
    yield s.face('barret', 'down');
    yield s.say('barret', "Tifa?! Cloud?! What the hell are you two doin' here?!");
    yield s.move('tifa', 10, 7);
    yield s.say('cloud', "Came to help.");
    yield s.say('barret', "Hah! About damn time, Spiky! These Shinra punks just keep on comin'!");
    yield s.say('tifa', "Barret, listen! Shinra's going to blow the pillar and drop the whole plate on Sector 7! We have to stop it!");
    yield s.say('barret', "Say WHAT?! Those sons of......!\fThen what're we standin' around for?! Let's shut it down!");
    s.remove('barret');
    s.remove('tifa');
    s.join('barret');
    s.party(['cloud', 'tifa', 'barret']);
    yield s.msg('{BARRET} joined the party!');
    s.show('barretTop');
    yield s.msg('Something is coming. Open the menu to prepare before approaching the control panel.');
  };

  FF7.story.c3_reno = function* (s) {
    s.hide('barretTop');
    s.spawn('barret', 'barret', 9, 6, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 11, 7, 'up', { name: 'Tifa' });
    s.sfx('helicopter');
    s.shake(1, 60);
    s.music('turks');
    s.spawn('reno', 'reno', 13, 3, 'down', { name: 'Reno' });
    yield s.cam(13, 4, 30);
    yield s.say('reno', "Yo. Sorry, but I can't let you touch that.");
    yield s.say('tifa', "You! Stop the countdown, right now!");
    yield s.say('reno', "No can do. Once this baby's armed, only an emergency code from HQ can shut it off.\fAnd hey, I'm not about to hand that over. I'm a professional, ya know?");
    yield s.say('barret', "Who the hell are you?!");
    yield s.say('reno', "Reno. Of the Turks. ......The guy who's gonna make sure you don't mess this up.");
    s.anim('reno', 'battle');
    yield s.say('reno', "So let's get this over with. I've got a helicopter to catch.");
    s.camFollow();
    yield s.battle({ table: 'boss_turks_reno', bg: 'midgar', music: 'boss', noEscape: true });
    s.set('c3_reno_beaten');
    s.stopAnim('reno');
    s.anim('reno', 'weak');
    s.music('hurry');
    yield s.say('reno', "Heh... Not bad... not bad at all. But you're too late.\fOnce this thing goes off... bye-bye, Sector 7.");
    yield s.say('reno', "Well, gotta run. Catch ya later... if there is a later. Heh.");
    s.stopAnim('reno');
    yield s.jump('reno', 13, 0, 1.6, 30);
    s.remove('reno');
    s.sfx('helicopter');
    yield s.run('tifa', 12, 6);
    yield s.face('tifa', 'up');
    yield s.say('tifa', "How do you stop this thing?! Cloud! Barret! Help me!");
    yield s.say('cloud', "......I don't know how either.");
    yield s.say('barret', "Damn it! Just shoot it! Smash it! SOMETHIN'!");
    // Tseng, with Aeris
    s.sfx('helicopter'); s.shake(1, 80);
    s.music('turks');
    s.spawn('tseng', 'tseng', 13, 2, 'down', { name: 'Tseng' });
    s.spawn('aerisH', 'aeris', 15, 2, 'down', { name: s.name('aeris') });
    yield s.cam(14, 3, 30);
    yield s.say('tseng', "Don't bother. That's an emergency plate-release system. Only the executives can call it off... and they won't.");
    yield s.say('cloud', "......{AERIS}!");
    yield s.say('tseng', "Hm? Ah... So you know each other. Well, we found her in the end. It took us long enough.");
    yield s.say('tifa', "Aeris...!");
    yield s.say('aeris', "Tifa! Don't worry! The little girl is safe!");
    yield s.move('tseng', 14, 2);
    yield s.say('tseng', "That's enough.");
    yield s.say('barret', "Marlene?! Where's Marlene?! Answer me!!");
    yield s.say('tseng', "The child? We had no use for her. ......As for this one, the President has plans for her. The last surviving Ancient. Surely you can understand.");
    yield s.say('cloud', "What are you going to do to her?!");
    yield s.say('tseng', "That's not your concern. I'd worry about yourselves, if I were you. You have a minute, maybe less.\fGood luck.");
    s.sfx('helicopter');
    yield [s.jump('tseng', 14, 0, 1.4, 30), s.jump('aerisH', 15, 0, 1.4, 30)].filter(w => w && typeof w === 'object');
    s.remove('tseng'); s.remove('aerisH');
    s.camFollow();
    s.sfx('alarm_long'); s.shake(3, 90);
    s.music('hurry');
    yield s.say('barret', "The pillar's gonna blow! Cloud, the wire! Over there, hangin' off the edge! GRAB IT!");
    yield s.say('tifa', "A wire?! Barret, are you crazy?!");
    yield s.say('barret', "Crazy's all we got left! HANG ON!!");
    yield C3.par([s.run('player', 22, 7), s.run('tifa', 22, 8), s.run('barret', 22, 6)]);
    s.sfx('jump');
    yield s.fadeOut(20, '#ffffff');
    s.remove('barret'); s.remove('tifa');
    yield* FF7.story.c3_plateFalls(s);
  };

  FF7.story.c3_plateFalls = function* (s) {
    s.set('c3_plate_fallen');
    s.music('anxious');
    yield C3.movie(s, 'plate_fall', "The charge detonates.\nThe great support pillar of Sector 7 buckles... and with a scream of tearing steel,\nthe plate above tilts, shudders, and falls.\n\nHomes, streets, people: the Sector 7 slums vanish beneath the ruins of the city above.\n\nClinging to a swaying cable, three figures swing clear of the blast...");
    s.party(['cloud', 'tifa', 'barret']);
    yield s.goto('s6_park_ruin', 'from_wire');
  };
})();

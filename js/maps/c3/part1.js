// Chapter 3 (part 1) — Sector 5: Cloud crashes into Aeris' church, Reno and the Turks, the escape
// through the back of the church and over the rooftops, the Sector 5 slums (shops, the sleeping kid,
// the weapon bus), Aeris' house (Elmyra, the night escape), Sector 6 and the playground where Tifa
// rides past on the chocobo wagon. Also the post-plate versions of the playground (Sense Materia).
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  const C3 = FF7.c3 = FF7.c3 || {};

  // ---------------------------------------------------------------- shared helpers (used by parts 1-4)
  // Heights from rects: every tile '0', then [x, y, w, h, level] rects (later ones win).
  C3.hm = function (grid, rects) {
    const rows = grid.map(r => r.split('').map(() => '0'));
    (rects || []).forEach(([x, y, w, h, d]) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (rows[j] && i >= 0 && i < rows[j].length) rows[j][i] = String(d);
    });
    return rows.map(r => r.join(''));
  };
  // Cloud's reply choices (FF7 shows just the options under his name).
  // (o: extra ask options, e.g. { date: [...] }: the FF7 date points of each answer, see FF7.story.datePts)
  C3.pick = (s, choices, text, o) => s.ask('cloud', text || '', choices, Object.assign(text ? {} : { noQuotes: true }, o));
  // "Talk across the counter" spot (the clerk stands behind it).
  C3.counter = (x, y, w, run) => ({ at: [x, y, w, 1], on: 'talk', run });
  // Night at Aeris' house: from the moment Cloud goes to sleep until Aeris catches up with him.
  C3.night = s => s.flag('c3_slept') && !s.flag('c3_aeris_rejoined');
  C3.plate = s => s.flag('c3_plate_fallen');
  // FMV stand-in (s.movie); if the cinema module isn't loaded, show the text as a caption instead.
  C3.movie = function (s, id, text) {
    if (FF7.cinema && typeof FF7.cinema.play === 'function') return s.movie(id, { text });
    return s.caption(text, { hold: 420, bg: '#000' });
  };
  // Parallel waits: drop plain numbers (a missing actor returns 1, which would never count as done).
  C3.par = list => list.filter(w => w && typeof w === 'object');
  // Tifa in the dress Corneo's people gave her.
  C3.TIFA_DRESS = { base: 'tifa', top: '#26318a', sleeve: 'skin', bottom: '#26318a', skirt: 'long', boots: '#1c1c28', extras: ['sash'] };
  // One-off examine helper: gives an item the first time, a plain line afterwards.
  C3.stash = (flag, item, qty, found, empty) => function* (s) {
    if (s.flag(flag)) { yield s.msg(empty || 'Nothing else here.'); return; }
    s.set(flag);
    if (found) yield s.msg(found);
    yield s.give(item, qty || 1);
  };

  // ================================================================== the church
  // The nave runs north-south (backgrounds/ff7art32.jpg, ff7art34.jpg, screenshots 01-midgar_058-059):
  // rows of great pillars split off the side aisles, the altar sits on a dais under the stained glass at
  // the north end, and the flower bed grows in the MIDDLE of the nave, lit through the broken roof and
  // ringed by splintered boards and holes. Pews ('p', joined east-west, facing the altar) stand in two
  // blocks with a centre aisle, the east block mostly wrecked (tilted and knocked-askew pews in `props`).
  // Stained glass ('a') above the altar and in the bays of the side walls. Windows are only drawn over
  // floor, so the altar is a prop standing on floor tiles (blocked in onLoad) under the five lancets.
  // The door to the back rooms is at the north-east, the double doors at the south.
  const CHURCH = [
    "##aa###a##aaaaa##a###a+##",
    "#u.......j.....j........#",
    "a.......................a",
    "#.x.....xxx^^^xxx.......#",
    "#....|....x..Kx....|....#",
    "a........KffGfGx........a",
    "a........Gffffff .......a",
    "#....|.. fffffffx..|...j#",
    "a.......KffffffG........a",
    "a.........GffffK........a",
    "#j...|... .........|...x#",
    "a.......................a",
    "a..x..ppppp...ppxp......a",
    "#....|.............|....#",
    "a.....ppppp...x.ppx...x.a",
    "a.p.....................a",
    "#....|ppppp...pxx.p|....#",
    "#j..............x......j#",
    "#.....x...........x.....#",
    "###########++############",
  ];
  const CHURCH_H = [
    "0000000000000000000000000",
    "0000000011111111100000000",
    "0000000011111111100000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
    "0000000000000000000000000",
  ];

  FF7.defineMap('s5_church', {
    name: 'Sector 5 Church', area: 'Midgar', theme: 'church',
    music: s => s.flag('c3_church_intro') ? 'church' : 'none',
    look: { floor: ['#5e5040', '#58493a'], wood: ['#4a3624', '#44321f'], dirt: ['#3e5626', '#44602a'], grass: ['#4a7430', '#44702c'] },
    camera: { pitch: 58, dist: 11 },
    // a shaft of daylight on the flowers, the chandeliers, and coloured light from the stained glass
    lights: [[12, 7, '#fff2c0', 5], [12, 1, '#fff0d0', 3], [8, 13, '#ffe0a0', 3], [16, 13, '#ffe0a0', 3], [2, 6, '#ff9080', 2.5], [22, 9, '#80a0ff', 2.5], [2, 12, '#80c0ff', 2.5], [22, 15, '#ffd070', 2.5], [2, 17, '#c080ff', 2]],
    grid: CHURCH,
    heights: CHURCH_H,
    // the altar under the lancets; the wrecked pews: tilted, knocked askew, one thrown into the west
    // aisle (ff7art32, ff7art34)
    props: [
      { at: [12, 1], prop: 'counter', col: '#5a4030', col2: '#d8d0bc', scale: [3, 1, 1] },
      { at: [15, 12], prop: 'pew', broken: true }, { at: [17, 12], prop: 'pew', broken: true, rot: 14 },
      { at: [16, 14], prop: 'pew', broken: true }, { at: [2, 15], prop: 'pew', broken: true, rot: 64, scale: [1.3, 1, 1] },
      { at: [14, 16], prop: 'pew', broken: true, rot: -10 }, { at: [18, 16], prop: 'pew', broken: true, rot: -22 },
      { at: [6, 16], prop: 'pew', broken: true },
    ],
    entries: { from_fall: [12, 7, 'down'], from_path: [11, 18, 'up'] },
    exits: [
      { at: [11, 19, 2, 1], to: 's5_path', entry: 'from_church', sfx: 'door' },
      { at: [22, 0, 1, 1], to: 's5_church_back', entry: 'from_church', if: s => false,
        blocked: function* (s) { yield s.say('cloud', "(The back of the church caved in after we got out. No way through.)"); } },
    ],
    triggers: [
      { at: [9, 5, 7, 5], on: 'talk', if: s => s.flag('c3_church_escape'),
        run: function* (s) {
          if (C3.plate(s)) yield s.msg("Aeris' flowers. Even now, they keep blooming.");
          else yield s.msg("A patch of yellow and white flowers, growing up through the broken floorboards.\nThe only flowers in all of Midgar.");
        } },
    ],
    // First arrival (from Chapter 2): stage the scene before the fade-in reveals it.
    onLoad: function (s) {
      [11, 12, 13].forEach(x => s.block(x, 1));   // the altar (a prop on floor, so the glass behind it shows)
      if (s.flag('c3_church_intro')) return;
      s.anim('player', 'lie');
      s.spawn('aeris', 'aeris', 13, 7, 'left', { name: 'Flower Girl' });
      s.anim('aeris', 'kneel');
    },
    onEnter: function* (s) {
      if (!s.flag('c3_church_intro')) yield* FF7.story.c3_churchWake(s);
    },
  });

  FF7.story.c3_churchWake = function* (s) {
    s.set('c3_church_intro');
    // Barret and Tifa are on the plate: Cloud is alone.
    if (s.isMember('barret')) s.leave('barret');
    if (s.isMember('tifa')) s.leave('tifa');
    s.party(['cloud']);
    s.menu(true);
    s.music('none');
    if (!s.actor('aeris')) {
      s.anim('player', 'lie');
      s.spawn('aeris', 'aeris', 13, 7, 'left', { name: 'Flower Girl' });
      s.anim('aeris', 'kneel');
    }
    yield s.cam(12, 7, 1, { dist: 7 });
    yield 50;
    yield s.say('Flower Girl', "......Hello?", { pos: 'middle' });
    yield 30;
    yield s.say('Flower Girl', "Hellooo? Can you hear me?", { pos: 'middle' });
    s.music('church');
    yield 30;
    s.camFollow();
    s.camZoom(9, 54);
    yield s.say('Flower Girl', "Oh, thank goodness. You're awake!");
    s.stopAnim('player');
    s.anim('player', 'kneel');
    yield 24;
    s.stopAnim('player');
    s.stopAnim('aeris');
    s.face('player', 'aeris');
    yield s.face('aeris', 'player');
    yield s.say('Flower Girl', "You came down right through the roof, you know. My heart nearly stopped.");
    s.anim('player', 'lookup');
    yield s.emote('player', '?');
    yield 30;
    s.stopAnim('player');
    yield s.say('cloud', "......Through the roof.");
    yield s.say('Flower Girl', "Mm-hm. This is the church in the Sector 5 slums. The roof and the flower bed broke your fall. Lucky, huh?");
    s.anim('player', 'lookdown');
    yield s.say('cloud', "(Flowers... down here, under the plate?)");
    s.stopAnim('player');
    yield s.say('Flower Girl', "Um... you're kind of standing on them.");
    yield s.emote('player', '!');
    yield s.move('player', 11, 10);
    yield s.face('player', 'up');
    yield s.move('aeris', 13, 10);
    yield s.face('aeris', 'player');
    yield s.say('Flower Girl', "Hee hee. Thanks. They're about the only flowers in all of Midgar, so I try to look after them.");
    yield s.say('Flower Girl', "......Hey. Haven't we met somewhere before?");
    const bought = s.flag('c1_bought_flower');
    const c = yield C3.pick(s, ["We've met.", "Can't say we have."]);
    if (c === 0) {
      if (bought) {
        yield s.say('Flower Girl', "I knew it! Sector 8, the night of that big explosion. You bought a flower from me.\fDid it bring you any luck?");
        yield s.say('cloud', "......I landed in a flower bed.");
        yield s.say('Flower Girl', "Hee hee! I'll count that as a yes.");
      } else {
        yield s.say('Flower Girl', "I knew it! Sector 8, the night of that big explosion. You're the one who wouldn't buy a flower.\fHmph. I'm still a little hurt, you know.");
        yield s.say('cloud', "......");
      }
    } else {
      yield s.emote('aeris', '...');
      yield s.say('Flower Girl', "Aww. Sector 8? The night the reactor blew up? I was selling flowers on the street..." + (bought ? "\fAnd you bought one! It's okay. I remember you." : "\fWell, that's okay. I remember you."));
    }
    yield s.say('Flower Girl', "Oh, where are my manners? I haven't even told you my name. I'm......");
    yield s.nameEntry('aeris');
    yield s.say('aeris', "{AERIS}. Nice to meet you. Properly, this time.");
    yield s.say('cloud', "......{CLOUD}.");
    yield s.say('aeris', "{CLOUD}. Okay, got it!");
    yield s.move('aeris', 12, 10);
    yield s.face('aeris', 'up');
    yield s.say('aeris', "Nothing grows anywhere else in Midgar, you know. But here, the flowers just keep blooming.\fI don't really know why. I just... love this place.");
    yield s.face('aeris', 'player');
    yield s.say('aeris', "......Your eyes. There's a strange glow to them.");
    yield s.say('cloud', "It's Mako. Everyone in SOLDIER has it.");
    yield s.say('aeris', "So you're in SOLDIER?");
    yield s.say('cloud', "Was. Now I'm a mercenary. I take any job... if the pay's right.");
    yield s.say('aeris', "Any job at all? Huh. That's handy.");
    // --- Reno arrives
    s.sfx('door');
    s.spawn('reno', 'reno', 12, 18, 'up', { name: 'Reno' });
    s.spawn('tr1', 'mp', 11, 18, 'up', { name: 'Shinra Soldier' });
    s.spawn('tr2', 'mp', 13, 18, 'up', { name: 'Shinra Soldier' });
    s.music('turks');
    yield s.emote('aeris', '!');
    yield s.face('aeris', 'down');
    yield s.cam(12, 14, 40);
    yield C3.par([s.move('reno', 12, 13), s.move('tr1', 11, 15), s.move('tr2', 13, 15)]);
    yield s.say('reno', "Yo.");
    yield s.cam(12, 11, 30);
    yield s.face('aeris', 'player');
    yield s.say('aeris', "(......Oh no. Not him again.)");
    yield s.say('aeris', "{CLOUD}. You said you take any job, right?\fThen here's one. Get me out of here... and take me home.");
    yield s.say('cloud', "Bodyguard work costs extra.");
    yield s.say('aeris', "Hmm... let's see...\f......Okay! How about one date?");
    yield 30;
    yield s.say('cloud', "......One date.");
    s.join('aeris');
    yield s.msg('{AERIS} joined the party!');
    yield s.move('reno', 12, 12);
    yield s.say('reno', "Hey, hey. What's all the whispering about over there?");
    yield s.say('reno', "......Hold on. Glowing eyes, giant sword. You SOLDIER?\fNobody told me there'd be SOLDIER. Man, that's a pain.");
    yield s.say('reno', "Whatever. Grab the girl.");
    s.anim('player', 'battle');
    yield s.face('player', 'reno');
    yield s.say('aeris', "Wait! No fighting in here, {CLOUD}! You'll trample the flowers!");
    s.stopAnim('player');
    yield s.say('cloud', "......The flowers.");
    yield s.say('aeris', "The back door! This way!");
    s.camFollow();
    yield C3.par([s.run('aeris', [[17, 11], [20, 11], [21, 4], [22, 2], [22, 1]]), s.run('player', [[16, 11], [20, 12], [21, 5], [22, 2]])]);
    s.hide('aeris');
    yield s.say('reno', "Ugh. Why can't anything just be easy?\f...Well? After 'em!");
    s.run('tr1', [[12, 11], [18, 9]], { noWait: true });
    s.run('tr2', [[13, 11], [18, 11]], { noWait: true });
    yield 20;
    s.set('c3_church_escape');
    yield s.goto('s5_church_back', 'from_church');
  };

  // ================================================================== back of the church
  const BACK = [
    "##+#########################",
    "#..........................#",
    "#.......  .................#",
    "#.............o............#",
    "#.....o.............o......#",
    "#.....................=^^^##",
    "#..B..................=^^^##",
    "#.....................=^^^##",
    "#....x................=^^^##",
    "#..........................#",
    "#.......o..................#",
    "#..........................#",
    "#BB........................#",
    "#..........................#",
    "#####################+######",
  ];
  // Reno's troops, in the order FF7 sends them (MP, then two Guard Hounds, then Guard Hound + MP).
  const WAVES = [['cbMpA'], ['cbHdA', 'cbHdB'], ['cbHdC', 'cbMpB']];
  const WAVE_MODELS = { cbMpA: 'mp', cbMpB: 'mp', cbHdA: { enemy: 'guard_hound' }, cbHdB: { enemy: 'guard_hound' }, cbHdC: { enemy: 'guard_hound' } };
  C3.sendWave = function* (s, n) {
    const ids = WAVES[n];
    ids.forEach((id, i) => s.spawn(id, WAVE_MODELS[id], 21, 13, 'up', { name: 'Shinra Soldier' }));
    s.sfx('door');
    yield C3.par(ids.map((id, i) => s.run(id, 15 + i * 2, 10 + i)));
  };
  C3.pushBarrel = function* (s, which) {
    if (!s.flag('c3_barrels_on')) { yield s.msg('An old barrel. Heavy.'); return; }
    if (s.flag('c3_barrel_' + which)) { yield s.msg("(It's wedged in tight. It won't budge.)"); return; }
    const step = s.get('c3_barrel_step');
    s.set('c3_barrel_' + which);
    s.sfx('hop');
    yield s.msg('{CLOUD} shoves the barrel over the edge!');
    const ids = WAVES[step] || [];
    // FF7 order: leftmost, then the upper one, then the rightmost. Date points: a hit Aeris +1, a miss Aeris -3.
    FF7.story.datePts(s, { aeris: which === step ? 1 : -3 });
    if (which === step) {
      s.shake(3, 14); s.sfx('crit');
      ids.forEach(id => s.anim(id, 'hurt'));
      yield 24;
      ids.forEach(id => s.remove(id));
      yield s.say('aeris', ['Nice shot!', 'Wow! Right on target!', "That's the last of them!"][step] || 'Nice!');
    } else {
      s.sfx('hit');
      yield s.msg('The barrel smashes on the floor... and misses completely.');
      yield C3.par(ids.map((id, i) => s.run(id, 11 + i, 8)));
      yield s.say('aeris', "Eek! They're right on top of me!");
      yield* C3.aerisSolo(s, step);
      ids.forEach(id => s.remove(id));
    }
    const next = step + 1;
    s.setVar('c3_barrel_step', next);
    if (next >= 3) { yield* C3.churchBackDone(s); return; }
    yield* C3.sendWave(s, next);
  };
  // Aeris fights alone (FF7: Cloud is stuck up on the ledge). Making her the leader re-points the
  // actor id 'aeris' at the player, so her field actor is re-spawned once Cloud leads again.
  C3.aerisSolo = function* (s, wave) {
    const a = s.actor('aeris');
    const ax = a && a.tx != null ? a.tx : 10, ay = a && a.ty != null ? a.ty : 7;
    s.party(['aeris']);
    yield s.battle({ formation: FF7.data.encounters.event_church_soldiers[wave], bg: 'church', music: 'hurry', noEscape: true });
    s.party(['cloud', 'aeris']);
    s.spawn('aeris', 'aeris', ax, ay, 'up', { name: s.name('aeris') });
  };
  C3.churchBackDone = function* (s) {
    s.unset('c3_barrels_on');
    s.set('c3_back_done');
    yield s.say('aeris', "Phew! That's all of them. Thanks, {CLOUD}!");
    yield s.jump('aeris', 10, 4, 1.8, 34);
    yield s.face('aeris', 'player');
    yield s.say('aeris', "Ta-da! ...Okay, that was a little scary.\fThere's a way up to the roof through that door in the corner. Let's go!");
    yield s.run('aeris', [[4, 3], [2, 1]]);
    s.remove('aeris');
  };

  FF7.defineMap('s5_church_back', {
    name: 'Back of the Church', area: 'Midgar', theme: 'church', music: 'hurry',
    look: { wallH: 3.6 },
    battle: { table: 'church', bg: 'church', rate: 0.6, music: 'hurry', if: s => s.flag('c3_back_done') },
    grid: BACK,
    heights: C3.hm(BACK, [[0, 0, 28, 5, 5], [23, 5, 3, 1, 4], [23, 6, 3, 1, 3], [23, 7, 3, 1, 2], [23, 8, 3, 1, 1]]),
    entries: { from_church: [21, 13, 'up'] },
    exits: [
      { at: [2, 0, 1, 1], to: 's5_rafters', entry: 'from_back', if: s => s.flag('c3_back_done'),
        blocked: function* (s) { yield s.say('cloud', "(Not without {AERIS}.)"); } },
      { at: [21, 14, 1, 1], to: 's5_church', entry: 'from_path', if: s => false,
        blocked: function* (s) { yield s.say('cloud', "(Reno's people are that way. Keep moving.)"); } },
    ],
    objects: [
      { at: [6, 4], talk: function* (s) { yield* C3.pushBarrel(s, 0); } },
      { at: [14, 3], talk: function* (s) { yield* C3.pushBarrel(s, 1); } },
      { at: [20, 4], talk: function* (s) { yield* C3.pushBarrel(s, 2); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c3_back_scene')) yield* FF7.story.c3_churchBack(s);
    },
  });

  FF7.story.c3_churchBack = function* (s) {
    s.set('c3_back_scene');
    s.spawn('aeris', 'aeris', 22, 13, 'up', { name: s.name('aeris') });
    yield C3.par([s.run('aeris', [[24, 9], [24, 4], [22, 2], [12, 2], [12, 4]]), s.run('player', [[23, 9], [23, 4], [21, 2], [16, 2], [16, 4]])]);
    yield s.say('aeris', "Up here! There's a way out through the roof!");
    yield s.run('aeris', 10, 4);
    s.sfx('hit'); s.shake(2, 12);
    yield s.emote('aeris', '!');
    s.sfx('falling');
    yield s.jump('aeris', 10, 7, 0.3, 22);
    s.anim('aeris', 'lie');
    s.shake(2, 10);
    yield s.run('player', 12, 4);
    yield s.face('player', 'down');
    yield s.say('cloud', "{AERIS}!");
    yield 30;
    s.anim('aeris', 'kneel');
    yield 24;
    s.stopAnim('aeris');
    yield s.face('aeris', 'up');
    yield s.say('aeris', "Owww... I'm okay! Just a few bruises.");
    // Reno's troops pour in
    s.spawn('cbMpA', 'mp', 21, 13, 'up', { name: 'Shinra Soldier' });
    s.sfx('door');
    yield s.run('cbMpA', 16, 10);
    yield s.say('Shinra Soldier', "There she is! Don't let her get away!");
    yield s.face('aeris', 'cbMpA');
    // FF7 date points: telling her to fight costs Aeris 1 (the barrels count on their own)
    const DP = [{ aeris: -1 }, {}, {}];
    const c = yield s.ask('cloud', "{AERIS}!", ['Fight them off!', 'Run for it!', 'Stay put. Leave this to me.'], { date: DP });
    FF7.story.datePts(s, DP[c]);
    s.music('hurry');
    let start = 0;
    if (c === 0) {
      yield s.say('aeris', "Fight? Me? ......Okay! Here goes!");
      yield s.run('cbMpA', 11, 8);
      yield* C3.aerisSolo(s, 0);
      s.remove('cbMpA');
      yield s.say('aeris', "I... I did it! Did you see that?");
      yield s.say('cloud', "(More of them coming. The barrels up here... I could drop them on their heads.)");
      start = 1;
      s.setVar('c3_barrel_step', 1);
      s.set('c3_barrel_0');
      s.set('c3_barrels_on');
      yield* C3.sendWave(s, 1);
    } else {
      if (c === 1) {
        yield s.say('aeris', "Run? Run where?! Eek!");
        yield s.run('aeris', [[6, 9], [4, 12], [9, 12], [10, 8]]);
        yield s.face('aeris', 'up');
        yield s.say('aeris', "{CLOUD}! There's nowhere to go!");
      } else {
        yield s.say('aeris', "......Okay. I'm counting on you!");
      }
      yield s.say('cloud', "(These barrels... If I time it right, I can drop them right on top of them.)");
      s.setVar('c3_barrel_step', 0);
      s.set('c3_barrels_on');
    }
    yield s.msg('Push the barrels off the ledge onto the soldiers below!\nChoose carefully: a miss means {AERIS} has to fight.');
    if (start === 0) yield s.run('cbMpA', 15, 10);
  };

  // ================================================================== the rafters
  const RAFTERS = [
    "#####################+####",
    "#                  ......#",
    "#  KKKKKKKKKKKKKKK ......#",
    "#  K             K   ^^  #",
    "#  K    zzzzzzzzzzzzzzz  #",
    "#  K    z             z  #",
    "#  K    z             z  #",
    "#  KKKKKz     KKKKKKKKz  #",
    "#  K          K          #",
    "#  K          K          #",
    "#.....        K          #",
    "#.....KKKKKKKKK          #",
    "#.....                   #",
    "##########################",
  ];
  FF7.defineMap('s5_rafters', {
    name: 'Church Rafters', area: 'Midgar', theme: 'church', music: 'hurry',
    look: { sky: ['#0a0806', '#1a140c'] },
    lights: [[21, 1, '#fff0c0', 3.5]],
    battle: { table: 'church', bg: 'church', rate: 0.6, music: 'hurry' },
    grid: RAFTERS,
    heights: C3.hm(RAFTERS, [[0, 0, 26, 14, 6], [19, 1, 6, 2, 8], [21, 3, 2, 1, 7], [21, 0, 1, 1, 8]]),
    entries: { from_back: [2, 11, 'up'] },
    exits: [{ at: [21, 0, 1, 1], to: 's5_roof', entry: 'from_rafters' }],
    onEnter: function* (s) {
      if (s.flag('c3_rafters_talk')) return;
      s.set('c3_rafters_talk');
      yield s.say('aeris', "Careful. These beams are older than both of us put together.\fThe hole in the roof is up there, on the far side.");
    },
  });

  // ================================================================== over the rooftops
  const ROOF = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "                              ",
    "  .......                     ",
    "  .......   ......            ",
    "  .......   ......   .......  ",
    "  .......   ......   .......  ",
    "            ......   .......  ",
    "                     .......  ",
    "                              ",
    "                              ",
  ];
  FF7.defineMap('s5_roof', {
    name: 'Sector 5 Rooftops', area: 'Midgar', theme: 'slums', music: 'aeris',
    grid: ROOF,
    heights: C3.hm(ROOF, [[2, 2, 7, 4, 8], [12, 3, 6, 4, 7], [21, 4, 7, 4, 6]]),
    entries: { from_rafters: [3, 3, 'right'] },
    onEnter: function* (s) { yield* FF7.story.c3_rooftops(s); },
  });
  FF7.story.c3_rooftops = function* (s) {
    s.spawn('aeris', 'aeris', 2, 4, 'right', { name: s.name('aeris') });
    yield s.say('aeris', "Fresh air! Well... Midgar air, anyway. Come on, it's this way!");
    yield C3.par([s.run('aeris', 8, 4), s.run('player', 7, 3)]);
    yield s.jump('aeris', 12, 4, 0.9, 26);
    yield s.run('player', 8, 3);
    yield s.jump('player', 12, 3, 0.9, 26);
    yield C3.par([s.run('aeris', 17, 5), s.run('player', 16, 4)]);
    yield s.jump('aeris', 21, 5, 0.8, 24);
    yield s.run('player', 17, 4);
    yield s.jump('player', 21, 4, 0.8, 24);
    yield C3.par([s.run('aeris', 26, 7), s.run('player', 25, 7)]);
    yield s.face('aeris', 'player');
    yield s.say('aeris', "We just drop down from here. Ready? One, two...!");
    s.sfx('jump');
    yield s.fadeOut(24);
    s.remove('aeris');
    yield s.goto('s5_path', 'from_roof');
  };

  // ================================================================== Sector 5 slums: church path, save point and the "Y" split
  const PATH = [
    "XXhhhhhh+hhhhhhXXXXXXXXXXXXXXXXXXX",
    "hx..............RR.......oo.....xh",
    "hx..S.........................l.xh",
    "hxl.............................xh",
    "h.....,,,.......................Bh",
    "hx....,,,,:::::::::::::::::.....xh",
    "hxx.....::::::::::::::::::::....xh",
    "hRx...::::::xxxxxxxxx:::::::....xh",
    "hR...:::::xxxxRRRRRxxxx::::::...xh",
    "hx..:::::xxRRRRRRRRRRRxx:::::...xh",
    "h..:::::xxRRRRRRRRRRRRRxx::::....h",
    "::::::::xRRRRRRRRRRRRRRRx::::::::.",
    "::::::::xRRRRRRRRRRRRRRRx:::::::::",
    "h::::::xxRRRRRRRRRRRRRRRxx::::::.h",
    "##################################",
  ];
  FF7.defineMap('s5_path', {
    name: 'Sector 5 Slums', area: 'Midgar', theme: 'slums', music: 'slums',
    battle: { table: 'sector5_slums', bg: 'slums', rate: 0.6, if: s => !C3.night(s) },
    grid: PATH,
    entries: { from_church: [8, 1, 'down'], from_roof: [6, 3, 'down'], from_town: [31, 12, 'left'], from_s6: [2, 12, 'right'] },
    exits: [
      { at: [8, 0, 1, 1], to: 's5_church', entry: 'from_path', sfx: 'door' },
      { at: [33, 11, 1, 2], to: 's5_town', entry: 'from_path' },
      { at: [0, 11, 1, 2], to: 's6_ruins', entry: 'from_s5', if: s => s.flag('c3_aeris_rejoined'),
        blocked: function* (s) {
          if (!s.flag('c3_elmyra_met')) yield s.say('aeris', "That gap leads to Sector 6. My house is the other way, remember? Past the shops.");
          else yield s.say('cloud', "(Not yet. I'll slip out tonight, once everyone's asleep.)");
        } },
    ],
    npcs: [
      { id: 'p5man', model: 'man4', at: [22, 3], dir: 'left', wander: 2, show: s => !C3.night(s),
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Man', "I watched the whole plate over Sector 7 come down from right here. The noise... I'll never forget it."); return; }
          yield s.say('Man', "Hardly anybody goes into that old church. Except the flower girl. She's in there most mornings, tending her garden.");
        } },
      { id: 'p5kid', model: 'kid4', at: [10, 3], dir: 'down', show: s => !C3.night(s),
        talk: function* (s) {
          if (s.flag('c3_aeris_rejoined') && !C3.plate(s)) { yield s.say('Kid', "Big sis Aeris went off with some spiky-haired guy! Is he her boyfriend? Huh? Huh?"); return; }
          yield s.say('Kid', "Something fell right through the church roof! It went CRASH! Did you see it?");
        } },
    ],
    triggers: [
      { id: 'aeris_waits', at: [1, 10, 5, 4], if: s => s.flag('c3_snuck_out') && !s.flag('c3_aeris_rejoined'),
        run: function* (s) { yield* FF7.story.c3_aerisWaits(s); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_roof' && !s.flag('c3_landed')) yield* FF7.story.c3_landing(s);
    },
  });

  FF7.story.c3_landing = function* (s) {
    s.set('c3_landed');
    s.spawn('aeris', 'aeris', 7, 3, 'left', { name: s.name('aeris') });
    s.shake(2, 10);
    yield s.fadeIn(20);
    yield 20;
    yield s.face('player', 'aeris');
    yield s.say('aeris', "Whew! I haven't run like that in ages.");
    yield s.say('cloud', "Those men back there. They weren't ordinary Shinra troops.");
    yield s.say('aeris', "Mm. The one with the red hair is a Turk.");
    yield s.say('cloud', "The Turks... Shinra's intelligence division. Kidnapping, blackmail, scouting new recruits for SOLDIER. All the dirty work.");
    yield s.say('cloud', "Maybe they want you for SOLDIER.");
    yield s.say('aeris', "Me? In SOLDIER? Hee hee. Can you imagine?\fThey've been hanging around me for a long time now. I'm kind of used to it.");
    yield s.say('cloud', "......Used to it.");
    yield s.say('aeris', "Anyway! My house is on the far side of town, past the shops. You lead the way, Mr. Bodyguard. I'll tell you where to turn.");
    s.remove('aeris');
    yield s.msg('Save points like the one nearby let you record your progress.');
  };

  FF7.story.c3_aerisWaits = function* (s) {
    s.spawn('aeris', 'aeris', 2, 12, 'right', { name: s.name('aeris') });
    yield s.cam(4, 11, 30);
    yield s.say('aeris', "Good morning! ...Or is it still night? You can never tell, down here under the plate.");
    yield s.emote('player', '!');
    yield s.say('cloud', "......How did you get ahead of me?");
    yield s.say('aeris', "I know this town a lot better than you do. I figured you'd try to sneak off on your own.\fSector 7 is past Sector 6, and Sector 6 is a mess. I'm taking you there. No arguments.");
    yield s.say('cloud', "......And if I say no?");
    yield s.say('aeris', "Then I'll just follow you anyway. Hee hee.");
    yield s.say('cloud', "......Fine. Just to Sector 7.");
    yield s.say('aeris', "Yay!");
    s.camFollow();
    s.remove('aeris');
    s.party(['cloud', 'aeris']);
    s.set('c3_aeris_rejoined');
    yield s.msg('{AERIS} joined the party!');
  };

  // ================================================================== Sector 5 slums: the town
  const TOWN = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hx..o.....hhhhhhhhhhhhh.....hhhhhhhh.h",
    "hx........hhhhhhhhhhhhh..l..hhhhhhhh.h",
    "h.........hhhhhhhhhhhhh.....hhhhhhhh.h",
    "h..B......hhhhhh+hhhhhh.....hhh+hhhh.h",
    "h....................................h",
    "hl.......................&&&&&&&.....h",
    "h........................&&&+&&&...l.h",
    "h....................................h",
    "::::::::::::::::::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::::::",
    "h..PPP...............................h",
    "h..PPP......o..B.......x.....B...o...h",
    "######################################",
  ];
  FF7.defineMap('s5_town', {
    name: 'Sector 5 Slums', area: 'Midgar', theme: 'slums', music: 'slums',
    camera: { pitch: 62, dist: 11 },   // high view over the town (01-midgar_064)
    grid: TOWN,
    lights: [[16, 5, '#ffd890', 2.5], [28, 8, '#ffd890', 2]],
    entries: { from_path: [1, 10, 'right'], from_garden: [36, 10, 'left'], from_shops: [16, 5, 'down'], from_kidhouse: [31, 5, 'down'], from_bus: [28, 8, 'down'] },
    exits: [
      { at: [0, 9, 1, 3], to: 's5_path', entry: 'from_town' },
      { at: [37, 9, 1, 3], to: 's5_garden', entry: 'from_town' },
      { at: [16, 4, 1, 1], to: 's5_shops', entry: 'from_town', sfx: 'door' },
      { at: [31, 4, 1, 1], to: 's5_kidhouse', entry: 'from_town', sfx: 'door' },
      { at: [28, 7, 1, 1], to: 's5_bus', entry: 'from_town', sfx: 'door' },
    ],
    npcs: [
      { id: 'blackcape2', name: 'Man in a Black Cape', model: { base: 'man', top: '#1c1c22', sleeve: '#1c1c22', bottom: '#1c1c22', hair: '#3a3a3a', hairStyle: 'longmessy', extras: ['cape'] },
        at: [6, 13], dir: 'left', anim: 'lie', faceOnTalk: false,
        talk: function* (s) {
          yield s.say('Man in a Black Cape', "......Uhhh......\f......Rrrr......\f......Re......un......ion......");
          yield s.msg("He's burning up with fever. There's a tattoo on his arm... the number \"2\".");
          if (!s.flag('c3_saw_no2')) { s.set('c3_saw_no2'); yield s.say('cloud', "(......A number? Why would someone tattoo a number on him?)"); }
        } },
      { id: 't5woman', model: 'woman4', at: [8, 6], dir: 'right', show: s => !C3.night(s),
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Woman', "People from Sector 7 keep wandering in with nothing but the clothes on their backs. We're sharing what little we have."); return; }
          yield s.say('Woman', "Aeris sells her flowers up on the plate. Imagine that. Something from down here, actually worth a gil to the folks up top.");
        } },
      { id: 't5old', model: 'oldman2', at: [21, 6], dir: 'down', show: s => !C3.night(s),
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Old Man', "Shinra says terrorists did it. Terrorists! Knocking down a whole plate? Hmph. I'm old, not stupid."); return; }
          yield s.say('Old Man', "Look up, young man. That's the plate. We live under a giant rotting pizza, and Shinra eats the cheese.");
        } },
      { id: 't5kid', model: 'kid2', at: [12, 12], dir: 'up', wander: 2, show: s => !C3.night(s),
        talk: function* (s) {
          if (s.flag('c3_house_arrived') || s.flag('c3_aeris_rejoined')) { yield s.say('Kid', "Big sis Aeris is like everybody's big sister. If you're mean to her, you'll have to answer to all of us!"); return; }
          yield s.say('Kid', "Whoa, your sword is HUGE. Are you a hero? Heroes have big swords.");
        } },
      { id: 't5man', model: 'man7', at: [33, 8], dir: 'left', show: s => !C3.night(s),
        talk: function* (s) { yield s.say('Man', "The weapon shop? It's in the bus. Yeah, the old bus. Engine died years ago, so the owner just moved in."); } },
      { id: 't5worker', model: 'worker3', at: [26, 12], dir: 'up', show: s => !C3.night(s),
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Worker', "They're saying the Sector 7 pillar collapsed on its own. Metal fatigue, they said. Funny how the Turks were there right when it happened."); return; }
          yield s.say('Worker', "The shop building's got materia on the left counter and supplies on the right. Stock up before you go wandering around Sector 6.");
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_town_talk') || !s.flag('c3_landed')) return;
      s.set('c3_town_talk');
      yield s.say('aeris', "This is where I grew up. It's not much to look at, but everybody here looks out for each other.\fThe big building is the shop, and weapons are sold in the old bus. My house is just past here, to the east.");
    },
  });

  // ---- the shop building (materia counter + item counter)
  const SHOPS = [
    "################### ",
    "#kkk....##....jjj.. ",
    "#.......##......... ",
    "#DDDD...##...DDDD.. ",
    "#.................. ",
    "#.................. ",
    "#....t.......c..... ",
    "#.................. ",
    "#########++######## ",
  ];
  const s5Materia = function* (s) {
    yield s.say('Materia Shop', "Welcome! Materia's the key to magic, and magic's the key to staying alive down here.");
    yield s.shop('sector5_materia');
  };
  const s5Items = function* (s) {
    yield s.say('Item Shop', "Hello there! Potions, Phoenix Downs, tents... everything you need to get home in one piece.");
    yield s.shop('sector5_items');
  };
  FF7.defineMap('s5_shops', {
    name: 'Sector 5 Shops', area: 'Midgar', theme: 'house', music: 'slums',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_066 (east side open)
    grid: SHOPS,
    entries: { from_town: [9, 7, 'up'] },
    exits: [{ at: [9, 8, 2, 1], to: 's5_town', entry: 'from_shops', sfx: 'door' }],
    npcs: [
      { id: 'm5clerk', name: 'Materia Shop', model: 'man2', at: [2, 2], dir: 'down', talk: s5Materia },
      { id: 'i5clerk', name: 'Item Shop', model: 'woman6', at: [14, 2], dir: 'down', talk: s5Items },
      { id: 'sh5cust', model: 'man9', at: [13, 6], dir: 'up', faceOnTalk: true,
        talk: function* (s) { yield s.say('Customer', "The materia's all the same stuff they sell in Sector 7. But the lady on the right sells tents. Tents! At a save point, a tent patches everybody up."); } },
    ],
    triggers: [C3.counter(1, 3, 4, s5Materia), C3.counter(13, 3, 4, s5Items)],
  });

  // ---- the house with the sleeping kid (hidden drawer, Turtle's Paradise flyer No. 1)
  const KID = [
    "############### ",
    "#kk..q.....b... ",
    "#...........j.. ",
    "#.............. ",
    "#.............. ",
    "#t.c.......=^^^ ",
    "#..........=^^^ ",
    "#k.........=^^^ ",
    "#.............. ",
    "#.o.......c.t.. ",
    "#.............. ",
    "#####++######## ",
  ];
  FF7.defineMap('s5_kidhouse', {
    name: 'Sector 5 Slums House', area: 'Midgar', theme: 'house', music: 'slums',
    camera: { yaw: 35, pitch: 52, dist: 10 },   // diagonal view like 01-midgar_069 (east side open)
    grid: KID,
    heights: C3.hm(KID, [[0, 0, 16, 5, 6], [12, 5, 3, 1, 4], [12, 6, 3, 1, 3], [12, 7, 3, 1, 1]]),
    entries: { from_town: [5, 10, 'up'] },
    exits: [{ at: [5, 11, 2, 1], to: 's5_town', entry: 'from_kidhouse', sfx: 'door' }],
    npcs: [
      { id: 'sleepkid', name: 'Boy', model: 'kid5', at: [11, 1], dir: 'down', anim: 'lie', faceOnTalk: false, show: s => !C3.plate(s),
        talk: function* (s) {
          yield s.say('Boy', "Zzzz......\f......my money's safe... nobody knows about the secret drawer......\fZzzz......");
        } },
      { id: 'wakekid', name: 'Boy', model: 'kid5', at: [9, 3], dir: 'down', show: s => C3.plate(s),
        talk: function* (s) {
          if (s.flag('c3_kid_5gil_taken')) {
            yield s.say('Boy', "Somebody stole the 5 gil from my secret drawer! It was my whole savings!\f......You wouldn't know anything about that, would you, mister?");
            return;
          }
          if (s.flag('c3_kid_turbo')) { yield s.say('Boy', "My dad says only honest people are allowed in our house. So you can come back anytime!"); return; }
          yield s.say('Boy', "Hey, it's you! My mom said you came by while I was asleep... and my money's all still there!\fYou're an honest guy, mister. Here, you can have this. My dad found it and said it's super valuable.");
          s.set('c3_kid_turbo');
          yield s.give('turbo_ether');
        } },
      { id: 'kidmom', name: 'Woman', model: 'woman7', at: [7, 9], dir: 'left',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Woman', "My sister lived in Sector 7. I haven't heard from her since the plate fell. ......I keep telling myself no news is good news."); return; }
          yield s.say('Woman', "My boy sleeps like a log, I swear. He could snooze through the end of the world. Go on up, just don't wake him.");
        } },
    ],
    triggers: [
      { at: [5, 1], on: 'talk',
        run: function* (s) {
          if (s.flag('c3_kid_5gil_taken')) { yield s.msg('The hidden drawer is empty.'); return; }
          if (!s.flag('c3_kid_drawer')) { s.set('c3_kid_drawer'); yield s.msg('A tall locker. ...There\'s a hidden drawer tucked in the back!'); }
          yield s.msg('There are 5 gil inside.');
          const c = yield s.ask(null, 'Take the money?', ['Leave it', 'Take it']);
          if (c === 1) {
            s.set('c3_kid_5gil_taken');
            yield s.giveGil(5);
          } else {
            yield s.msg('{CLOUD} closes the drawer again.');
          }
        } },
      { at: [7, 0], on: 'talk',
        run: function* (s) {
          s.set('c3_turtle_flyer1');
          yield s.msg("A flyer is pinned to the wall.\f\"TURTLE'S PARADISE — Flyer No. 1\nOur drinks are so good, you'll forget your own name!\nFind all six flyers for a very special prize.\"");
        } },
    ],
  });

  // ---- the weapon shop bus
  const BUS = [
    "##############",
    "#cc.DDDD...cc#",
    "#............#",
    "#cc........cc#",
    "######++######",
  ];
  FF7.defineMap('s5_bus', {
    name: 'Weapon Shop (Bus)', area: 'Midgar', theme: 'station', music: 'slums',
    look: { indoor: true, sky: ['#000000', '#000000'], fog: null },
    grid: BUS,
    entries: { from_town: [6, 3, 'up'] },
    exits: [{ at: [6, 4, 2, 1], to: 's5_town', entry: 'from_bus', sfx: 'door' }],
    npcs: [
      { id: 'buswpn', name: 'Weapon Shop', model: 'worker2', at: [9, 1], dir: 'down',
        talk: function* (s) {
          yield s.say('Weapon Shop', "Welcome aboard! Next stop: anywhere, if this heap ever runs again. Ha!\fWhat'll it be? A Titan Bangle beats most of the junk you'll find lying around.");
          yield s.shop('sector5_weapons');
        } },
    ],
  });

  // ================================================================== Aeris' garden
  // Mirrored after wallpapers/ff7paper16 and 01-midgar_070: the house stands at the north-west with its
  // fenced front yard; the waterfall pours down behind it into a stream that runs south past the yard and
  // spills away to the south-west; fenced flower terraces climb in three steps toward the north-east;
  // the path comes in from the south along the stream and crosses a little bridge to the house.
  const GARDEN = [
    "VVVVVVVVVVWWWVVVVVVVVVVVVVVVVVVV",
    "Vhhhhhhhhx~~~,:::VVRRR=,fff,,ffV",
    "VhhhhhhhhR~~~,:::RRRRR=,fff,,ffV",
    "VhhhhhhhhR~~~,:::RRRRR=,fff,,,,V",
    "VhhhhhhhhR~~~,:::RRRRR=====^^==V",
    "Vhhwh+hwhR~~~,:::RR=fGff,,ffff,V",
    "V%,::::,o,~~~,:::RR=ffff,,ffffGV",
    "V,,::::,,,~~~,:::RR=ffff,,,,,,,V",
    "V,,:::::::KKK::::RR=====^^=====V",
    "V,,::::,,,~~~,:::=ff,,ff,,ffff,V",
    "V,,,,,,,f,~~~,:::=ff,,ff,,ffff,V",
    "V%,,,,,f,,~~~,:::=ff,,ff,,,,,,GV",
    "V=========~~~,:::===^^=========V",
    "V~~~~~~~~~~~~::ff,G,,,,,G,,,,,GV",
    "V~~~~~~~~~~~~::ff,fffff,ffffff,V",
    "V~~~~~~~~~~~~::::,fffff,ffffff,V",
    "V~~~~~~~~~,,,::::%,,,,,,,,,,,,%V",
    "#~~##########::::###############",
  ];
  const GARDEN_H = [
    "00000000000000000000000000000000",
    "00000000000000000000003333333330",
    "00000000000000000000003333333330",
    "00000000000000000000003333333330",
    "00000000000000000000003333322330",
    "00000000000000000002222222222220",
    "00000000000000000002222222222220",
    "00000000000000000002222222222220",
    "00000000000000000002222211222220",
    "00000000000000000111111111111110",
    "00000000000000000111111111111110",
    "00000000000000000111111111111110",
    "00000000000000000111001111111110",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
    "00000000000000000000000000000000",
  ];
  FF7.defineMap('s5_garden', {
    name: "Aeris' House", area: 'Midgar', theme: 'slums',
    music: s => C3.night(s) ? 'none' : 'aeris',
    look: { grass: ['#4a7030', '#446a2c'], sky: ['#141a10', '#34402a'], water: '#3a8ea8', floor3: ['#7a3a30', '#72342a'], trim: '#4a2a1a' },
    camera: { yaw: -15, pitch: 48, dist: 11.5 },
    lights: [[11, 1, '#d0f0ff', 4], [11, 6, '#b0e8ff', 3], [5, 6, '#ffe0a0', 2.5], [26, 3, '#fff0c0', 3], [24, 10, '#fff0c0', 3]],
    grid: GARDEN,
    heights: GARDEN_H,
    entries: { from_town: [14, 16, 'up'], from_house: [5, 6, 'down'] },
    exits: [
      { at: [13, 17, 4, 1], to: 's5_town', entry: 'from_garden' },
      { at: [5, 5, 1, 1], to: 's5_house', entry: 'from_garden', sfx: 'door' },
    ],
    items: [
      { at: [2, 7], item: 'ether', id: 's5_garden_ether' },
      { at: [30, 3], materia: 'cover', id: 's5_garden_cover' },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_garden_talk') || s.flag('c3_house_arrived')) return;
      s.set('c3_garden_talk');
      s.spawn('aeris', 'aeris', 15, 17, 'up', { name: s.name('aeris') });
      yield s.move('aeris', 15, 15);
      yield s.face('player', 'aeris');
      yield s.say('aeris', "Here we are! Home sweet home.");
      yield s.say('cloud', "......Flowers here too. And running water.");
      yield s.say('aeris', "Mom and I grow them together. Isn't it pretty? The water comes down from somewhere up on the plate.\fCome on in. I'll introduce you!");
      yield s.run('aeris', [[15, 12], [14, 8], [9, 8], [5, 7], [5, 6]]);
      s.remove('aeris');
    },
  });

  // ================================================================== Aeris' house
  const HOUSE = [
    "########################",
    "#kk..b.#.........#..b.q#",
    "#......#.........#.....#",
    "#......................#",
    "#......................#",
    "#.......=^^^=..........#",
    "#k......=^^^=........kk#",
    "#.......=^^^=..........#",
    "#......................#",
    "#.ttt.............DDDF.#",
    "#.ccc..................#",
    "#......................#",
    "#j....................j#",
    "#......................#",
    "##########++############",
  ];
  // Walking past Aeris' room at night: running wakes her up (FF7).
  const sneakTriggers = [];
  for (let x = 8; x <= 12; x++) for (let y = 3; y <= 4; y++) sneakTriggers.push({ at: [x, y] });
  for (let x = 9; x <= 11; x++) for (let y = 5; y <= 7; y++) sneakTriggers.push({ at: [x, y] });
  sneakTriggers.forEach(t => {
    t.if = s => s.flag('c3_slept') && !s.flag('c3_snuck_out');
    t.run = function* (s) { const a = s.actor('player'); if (a && a.running) yield* FF7.story.c3_caught(s); };
  });

  FF7.defineMap('s5_house', {
    name: "Aeris' House", area: 'Midgar', theme: 'house',
    music: s => C3.night(s) ? 'none' : (C3.plate(s) && !s.flag('c3_elmyra_story') ? 'holding' : 'aeris'),
    grid: HOUSE,
    heights: C3.hm(HOUSE, [[0, 0, 24, 5, 6], [9, 5, 3, 1, 4], [9, 6, 3, 1, 3], [9, 7, 3, 1, 1]]),
    lights: [[21, 9, '#ffb060', 3]],
    entries: { from_garden: [10, 13, 'up'] },
    exits: [
      { at: [10, 14, 2, 1], sfx: 'door', run: function* (s) {
          if (s.flag('c3_slept') && !s.flag('c3_snuck_out')) {
            s.set('c3_snuck_out');
            s.party(['cloud']);
          }
          yield s.goto('s5_garden', 'from_house');
        } },
    ],
    items: [
      { at: [21, 2], item: 'potion', id: 's5_house_potion' },
      { at: [19, 3], item: 'phoenix_down', id: 's5_house_phoenix' },
    ],
    npcs: [
      { id: 'elmyra', name: 'Elmyra', model: 'elmyra', at: [19, 10], dir: 'up', show: s => !C3.night(s),
        talk: function* (s) {
          if (C3.plate(s)) {
            if (!s.flag('c3_barret_plan')) { yield s.say('elmyra', "The little one's upstairs with her father. Go on up."); return; }
            yield s.say('elmyra', "Marlene will be safe here with me. Please... bring Aeris home.");
            const c = yield s.ask('elmyra', "You all look exhausted. Will you rest a while before you go?", ['Rest', 'No thanks']);
            if (c === 0) { yield s.fadeOut(30); s.heal(); yield 60; yield s.fadeIn(30); yield s.say('elmyra', "There. Now go get my daughter back."); }
            return;
          }
          if (!s.flag('c3_elmyra_request')) { yield s.say('elmyra', "The spare room is upstairs, on the right. Get some rest."); return; }
          yield s.say('elmyra', "......Remember what I asked of you. Please.");
        } },
      { id: 'aerisHome', name: 'Aeris', model: 'aeris', at: [5, 10], dir: 'right', show: s => s.flag('c3_elmyra_met') && !s.flag('c3_slept'),
        talk: function* (s) {
          yield s.say('aeris', "Mom's a worrier. Don't take it personally, okay?\fGet some sleep upstairs. You look like you fell through a roof. Oh, wait. You did.");
        } },
      { id: 'aerisBed', name: 'Aeris', model: 'aeris', at: [5, 1], dir: 'down', anim: 'lie', faceOnTalk: false,
        show: s => s.flag('c3_slept') && !s.flag('c3_snuck_out'),
        talk: function* (s) { yield s.msg("{AERIS} is fast asleep.\n(Better not wake her.)"); } },
      { id: 'marlene', name: 'Marlene', model: 'marlene', at: [20, 3], dir: 'down', show: s => C3.plate(s),
        talk: function* (s) {
          if (!s.flag('c3_barret_plan')) { yield s.say('marlene', "Daddy!"); return; }
          yield s.say('marlene', "The flower lady told me not to be scared, 'cause she was coming with me.\fYou'll bring her back, right? Promise?");
        } },
    ],
    triggers: sneakTriggers.concat([
      { id: 'elmyra_request', at: [9, 4, 3, 1], if: s => s.flag('c3_elmyra_met') && !s.flag('c3_elmyra_request') && !C3.plate(s),
        run: function* (s) { yield* FF7.story.c3_elmyraRequest(s); } },
      { at: [20, 1], on: 'talk',
        run: function* (s) {
          if (C3.plate(s)) { yield s.msg('The spare bed. Marlene has been sleeping in it.'); return; }
          if (!s.flag('c3_elmyra_request') || s.flag('c3_slept')) { yield s.msg('A neatly made bed.'); return; }
          const c = yield s.ask(null, 'Get some sleep?', ['Sleep', 'Not yet']);
          if (c === 0) yield* FF7.story.c3_sleep(s);
        } },
      { id: 'barret_marlene', at: [14, 2, 3, 3], if: s => C3.plate(s) && s.flag('c3_elmyra_story') && !s.flag('c3_barret_plan'),
        run: function* (s) { yield* FF7.story.c3_barretPlan(s); } },
    ]),
    onEnter: function* (s) {
      if (C3.plate(s)) { if (!s.flag('c3_elmyra_story')) yield* FF7.story.c3_elmyraStory(s); return; }
      if (!s.flag('c3_elmyra_met') && s.flag('c3_landed')) yield* FF7.story.c3_meetElmyra(s);
    },
  });

  FF7.story.c3_meetElmyra = function* (s) {
    s.set('c3_elmyra_met');
    s.hide('elmyra');
    s.set('c3_house_arrived');
    s.spawn('aeris', 'aeris', 11, 12, 'up', { name: s.name('aeris') });
    s.spawn('elmyraS', 'elmyra', 19, 10, 'up', { name: 'Elmyra' });
    s.place('player', 10, 13, 'up');
    yield s.say('aeris', "Mom! I'm home!");
    yield s.face('elmyraS', 'aeris');
    yield s.say('Elmyra', "Aeris! Oh, thank goodness...");
    yield s.move('elmyraS', 13, 11);
    yield s.face('elmyraS', 'player');
    yield s.say('Elmyra', "......And who might this be?");
    yield s.say('aeris', "This is {CLOUD}. My bodyguard!");
    yield s.say('Elmyra', "A bodyguard? Then they were after you again, weren't they?");
    yield s.say('aeris', "Mm-hm. But I'm fine! See? Not a scratch. ...Well, a couple of scratches.");
    yield s.say('Elmyra', "......Those eyes. Are you from SOLDIER?");
    yield s.say('cloud', "......Used to be.");
    yield 30;
    yield s.face('elmyraS', 'up');
    yield s.say('Elmyra', "......I see.");
    yield s.say('cloud', "I need to get back to Sector 7. Which way is fastest?");
    yield s.face('aeris', 'player');
    yield s.say('aeris', "Sector 7? That's right next door. You have to cut through Sector 6 to get there... I'll show you the way!");
    yield s.say('cloud', "No. It's too dangerous.");
    yield s.say('aeris', "Hey! I've been giving the Turks the slip for years. I'm used to danger.");
    yield s.say('cloud', "......I said no.");
    yield s.say('aeris', "Hmph. Fine.\f......Then at least stay the night. You can head out in the morning. The spare room's upstairs, on the right.");
    yield s.move('elmyraS', 19, 10);
    yield s.face('elmyraS', 'up');
    s.remove('elmyraS');
    s.show('elmyra');
    yield s.move('aeris', 5, 10);
    s.remove('aeris');
    s.show('aerisHome', 5, 10, 'right');
  };

  FF7.story.c3_elmyraRequest = function* (s) {
    s.set('c3_elmyra_request');
    s.hide('elmyra');
    s.spawn('elmyraS', 'elmyra', 10, 9, 'up', { name: 'Elmyra' });
    yield s.say('Elmyra', "Excuse me. Could I have a word?");
    yield s.face('player', 'down');
    yield s.move('elmyraS', 10, 5);
    yield s.say('Elmyra', "I'd like you to leave tonight. Quietly. Without telling Aeris.");
    yield s.say('cloud', "......Why?");
    yield s.say('Elmyra', "Because of what you are. Someone from SOLDIER hurt her once, just by being in her life and then... not.\fIf you stay, she'll follow you into whatever trouble you're chasing. I can't bear to see her go through that again.");
    yield s.say('cloud', "......Understood.");
    yield s.say('Elmyra', "Thank you. I'm sorry. ......Sleep well.");
    yield s.move('elmyraS', 10, 9);
    s.remove('elmyraS');
    s.show('elmyra');
  };

  FF7.story.c3_sleep = function* (s) {
    s.set('c3_slept');
    s.hide('aerisHome');
    s.hide('elmyra');
    s.place('player', 20, 2, 'down');
    yield s.fadeOut(40);
    s.music('none');
    s.heal();
    yield 40;
    yield s.caption("......\n\n\"......Hey. You awake?\"\n\n\"......Hmm? No... Guess not.\"\n\n\"Well... don't push yourself too hard, okay?\"", { hold: 220, bg: '#000' });
    yield 40;
    s.show('aerisBed');
    yield s.fadeIn(40);
    yield s.say('cloud', "(......What was that? A dream?)\f(It's the middle of the night. Now's my chance.)");
    yield s.say('cloud', "(Her room is right by the stairs. If I run, she'll hear me. Walk, and take it slow.)");
  };

  FF7.story.c3_caught = function* (s) {
    s.hide('aerisBed');
    s.spawn('aerisN', 'aeris', 6, 3, 'right', { name: s.name('aeris') });
    s.sfx('door');
    yield s.emote('aerisN', '?');
    yield s.face('player', 'aerisN');
    yield s.say('aeris', "{CLOUD}? What are you doing up? ......Couldn't sleep?");
    yield s.say('cloud', "......Something like that.");
    yield s.say('aeris', "Hee hee. Go back to bed. We've got a big day tomorrow! G'night.");
    yield s.fadeOut(30);
    s.remove('aerisN');
    s.show('aerisBed');
    s.place('player', 20, 2, 'down');
    yield 40;
    yield s.fadeIn(30);
    yield s.say('cloud', "(......Once more. Slowly this time. No running.)");
  };

  // After the plate: Marlene is safe, Aeris is not.
  FF7.story.c3_elmyraStory = function* (s) {
    s.set('c3_elmyra_story');
    s.hide('elmyra');
    s.hide('marlene');
    s.spawn('elmyraS', 'elmyra', 13, 10, 'down', { name: 'Elmyra' });
    s.spawn('barret', 'barret', 9, 13, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 12, 13, 'up', { name: 'Tifa' });
    s.place('player', 11, 12, 'up');
    yield s.say('Elmyra', "......You're Cloud, aren't you? Aeris' bodyguard.\fAnd you... you must be the little girl's father.");
    yield s.say('barret', "Marlene! Where's Marlene?!");
    yield s.say('Elmyra', "Upstairs, in the spare room. Sleeping. She's safe.");
    yield s.run('barret', [[10, 8], [10, 4], [18, 3]]);
    s.remove('barret');
    yield s.face('elmyraS', 'player');
    yield s.say('Elmyra', "Aeris brought her here. On their way, the Turks caught up with them. That man... Tseng.\fAeris went with him, so that they'd leave the girl alone.");
    yield s.say('cloud', "......What does Shinra want with her?");
    yield s.move('elmyraS', 4, 10);
    yield s.face('elmyraS', 'right');
    yield s.say('Elmyra', "......Aeris isn't my real daughter.");
    yield s.say('Elmyra', "It was fifteen years ago, during the war. My husband had been sent to the front, and he was due home on leave.\fEvery day, I went to the station to wait for him. And one day, a young woman collapsed on the platform. There was a little girl clinging to her.");
    yield s.say('Elmyra', "With her last breath, the woman asked me to take her daughter somewhere safe. That little girl was Aeris.");
    yield s.say('Elmyra', "I took her home. We were happy, the two of us. She told me she'd run away from some place... a place with scientists.\fAnd then one day she said, very calmly, that her mother had 'gone back to the planet.' I didn't know what she meant.");
    yield s.say('Elmyra', "Then she told me that my husband had gone back to the planet, too. That he'd come to say goodbye to me first.\fA few days later, the letter from the army arrived.");
    yield 30;
    yield s.say('Elmyra', "The Turks found us soon after. Tseng came again and again. He told me Aeris was special... that she was the last of the Ancients. The Cetra.\fAeris always said no. She wanted to live a normal life, here, with me. And now......");
    yield s.say('tifa', "She gave herself up. For Marlene.");
    yield s.say('cloud', "......We'll bring her back.");
    yield s.say('Elmyra', "......Please.");
    s.music('aeris');
    s.remove('elmyraS');
    s.remove('tifa');
    s.show('elmyra', 19, 10, 'up');
    s.show('marlene', 20, 3, 'down');
    yield s.msg("Barret is upstairs with Marlene.");
  };

  FF7.story.c3_barretPlan = function* (s) {
    s.set('c3_barret_plan');
    s.spawn('barret', 'barret', 19, 3, 'left', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 15, 4, 'right', { name: 'Tifa' });
    yield s.face('player', 'barret');
    yield s.say('marlene', "Daddy, you smell like smoke.");
    yield s.say('barret', "Heh... Yeah, baby. Daddy had a rough day.");
    yield s.face('barret', 'player');
    yield s.say('barret', "......Cloud. That flower girl saved my little girl's life. And it cost her.\fShe's up there in that damn Shinra building right now 'cause of us. I ain't lettin' that stand.");
    yield s.say('tifa', "Neither am I. Biggs, Wedge, Jessie... everyone in Sector 7. We owe it to them, too.");
    yield s.say('barret', "Elmyra! Could you keep lookin' after Marlene for a while? Where we're goin'... it ain't no place for a kid.");
    yield s.say('Elmyra', "(from downstairs) Of course. She's no trouble at all.");
    yield s.say('marlene', "Daddy... bring the flower lady back, okay? She was really nice.");
    yield s.say('barret', "......You got it, baby. Daddy promises.");
    // FF7: Marlene tells Cloud about Aeris. Date points: Aeris -3 / Tifa +3, or Aeris +3 / Tifa -3
    yield s.face('player', 'marlene');
    yield s.say('marlene', "Um... Cloud? On the way here, the flower lady asked me something.\fShe asked if you were Tifa's boyfriend. I said I didn't think so... and she looked all happy!\fI bet she likes you. Don't you think so?");
    const DPM = [{ aeris: -3, tifa: 3 }, { aeris: 3, tifa: -3 }];
    const m = yield C3.pick(s, ["Couldn't tell you.", "Here's hoping."], null, { date: DPM });
    FF7.story.datePts(s, DPM[m]);
    if (m === 1) yield s.emote('tifa', '...');
    yield s.say('marlene', m === 0 ? "Hmm... Grown-ups are so confusing." : "Hee hee! I knew it!");
    yield s.face('player', 'barret');
    yield s.say('barret', "So how the hell do we get up top? The trains to the plate are gonna be crawlin' with Shinra.");
    yield s.say('cloud', "......We climb.");
    yield s.say('tifa', "There's a wire hanging down from the collapsed plate, near Wall Market. Right beside Don Corneo's mansion. I saw it on the way here.");
    yield s.say('barret', "A wire, huh? Hah! Then that's our ladder. Wall Market it is!");
    s.remove('barret');
    s.remove('tifa');
    s.set('c3_to_wire');
  };

  // ================================================================== Sector 6: the destroyed road
  const RUINS = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hxxRRxxxxxRRxxxxxxxRRRxxxxxxxxxxxh",
    "hxx......xxx.....xxxx.......xxRRxh",
    "hx...o....x...&&....x..B.......xxh",
    "hx..........................l...xh",
    "hxxx......::::::::::::::.........h",
    "::::::::::::::xx::::::::::::::::::",
    "::::::::::::xxxxxx::::::::::::::::",
    "::::::::::::::xx::::::::::::::::::",
    "hx.......:::::::::::::::.....B...h",
    "hxx..o.....x......RR........xx..xh",
    "hxxxRRx...xxx...xxxxx....xxxRRxxxh",
    "##################################",
  ];
  const toPark = entry => function* (s) { yield s.goto(C3.plate(s) ? 's6_park_ruin' : 's6_park', entry); };
  FF7.defineMap('s6_ruins', {
    name: 'Sector 6', area: 'Midgar', theme: 'slums', music: 'slums',
    battle: { table: 'sector6', bg: 'slums', rate: 1 },
    grid: RUINS,
    entries: { from_s5: [32, 7, 'left'], from_park: [1, 7, 'right'] },
    exits: [
      { at: [0, 6, 1, 3], run: toPark('from_ruins') },
      { at: [33, 6, 1, 3], to: 's5_path', entry: 'from_s6' },
    ],
    onEnter: function* (s) {
      if (s.flag('c3_s6_talk') || !s.flag('c3_aeris_rejoined')) return;
      s.set('c3_s6_talk');
      yield s.say('aeris', "Sector 6 used to be a real neighborhood, you know. Then the money ran out, and they just... left it to rot.\fStay close. Things crawl out of the rubble around here.");
    },
  });

  // ================================================================== Sector 6 playground
  const PARK = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "h###########X++++X############hh",
    "h..........l......l...........hh",
    "h,,,,,,.....::::::......,,,,,,.h",
    "h,,,,,.......::::.......,,,,,,.h",
    "h,,,,.........::.........,,,,..h",
    "h.............::...............h",
    "h,,,^^...^^^..::..sss.....,,,..h",
    "h,,,^^...^^^..::..sss...c.,,,...",
    "h,,,^^...^^^..::..sss.....,,,...",
    "h.............::................",
    "h....c.......::::.......Y......h",
    "h,,,,,......::::::....,,,,,,,,,h",
    "h,,,,,,,:::::::..........,,,,,,h",
    "::::::::::::.............,,,,,,h",
    "::::::::::.........l.....,,,,,,h",
    ":::::::,,,,,,,,,,,,,,,,,,,,,,,,h",
    "################################",
  ];
  // After the collapse, the Sector 7 gate lies buried under the wreckage of the plate.
  const PARK_RUIN = PARK.slice();
  PARK_RUIN[1] = "hxxxxxxxxxxxXxxxxXxxxxxxxxxxxxhh";
  PARK_RUIN[2] = "h.......xxxRRxxRRxxxxR.........h";
  PARK_RUIN[3] = "h,,,,,,....xxRRRxxx.....,,,,,,.h";
  PARK_RUIN[4] = "h,,,,,.......x::xx.......,,,,,,h";
  const SLIDE = [[6, 7, 3, 3, 4], [4, 7, 1, 3, 1], [5, 7, 1, 3, 3], [9, 7, 1, 3, 3], [10, 7, 1, 3, 2], [11, 7, 1, 3, 1]];
  const parkExits = [
    { at: [31, 8, 1, 3], to: 's6_ruins', entry: 'from_park' },
    { at: [0, 14, 1, 3], to: 's6_road', entry: 'from_park' },
  ];
  const slideTalk = function* (s) { yield s.msg("A big slide shaped like a moogle. Its paint is peeling, but the kids still love it."); };

  FF7.defineMap('s6_park', {
    name: 'Sector 6 Park', area: 'Midgar', theme: 'slums', music: 'slums',
    grid: PARK,
    heights: C3.hm(PARK, SLIDE),
    lights: [[11, 2, '#ffe0a0', 2], [18, 2, '#ffe0a0', 2]],
    entries: { from_ruins: [30, 9, 'left'], from_road: [1, 15, 'right'] },
    exits: parkExits.concat([
      { at: [13, 1, 4, 1], to: 's6_park', entry: 'from_road', if: s => false,
        blocked: function* (s) { yield s.msg('The gate to Sector 7 is shut tight.'); } },
    ]),
    npcs: [
      { id: 'parkkid', model: 'kid6', at: [19, 11], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Kid', "The gate to Sector 7 opens up sometimes, when the delivery wagons come through. Chocobos pull 'em! Real chocobos!"); } },
    ],
    triggers: [{ at: [7, 8], on: 'talk', run: slideTalk }],
    onEnter: function* (s) {
      if (!s.flag('c3_park_scene') && s.flag('c3_aeris_rejoined')) yield* FF7.story.c3_playground(s);
    },
  });

  FF7.story.c3_playground = function* (s) {
    s.set('c3_park_scene');
    s.spawn('aeris', 'aeris', 29, 9, 'left', { name: s.name('aeris') });
    yield C3.par([s.move('aeris', [[13, 9], [7, 8]]), s.move('player', [[14, 10], [4, 8], [8, 8]])]);
    yield s.say('aeris', "Here we are. The gate to Sector 7 is right over there.");
    // FF7 date points: going on to Sector 7 together, Aeris +1
    const DPH = [{}, { aeris: 1 }];
    const h = yield C3.pick(s, ["Okay. Now I'm taking you home.", "Let's keep going to Sector 7."], null, { date: DPH });
    FF7.story.datePts(s, DPH[h]);
    yield s.say('aeris', h === 0 ? "Home? Already? Hmph. I'm not done being your guide yet." : "Hee hee. Right behind you, bodyguard.");
    yield s.say('aeris', "Let's take a little break. This used to be my favorite spot when I was little.");
    s.anim('aeris', 'sit');
    s.anim('player', 'sit');
    yield s.cam(8, 8, 40, { dist: 7 });
    s.music('aeris');
    yield 30;
    yield s.say('aeris', "......So. You were in SOLDIER, right?");
    yield s.say('cloud', "......Yeah.");
    yield s.say('aeris', "What class were you?");
    yield s.say('cloud', "......First.");
    yield s.say('aeris', "First class, huh. Same as him.");
    yield s.say('cloud', "Him?");
    yield s.say('aeris', "Someone I used to know. Someone I was sweet on, back then. He was in SOLDIER, too. First Class.\fIt never really turned into anything. We were just... a little in love, I guess.");
    yield s.say('cloud', "Maybe I knew him. Who was he?");
    yield s.say('aeris', "......Forget I said anything. It was a long time ago.\fIt's just... the way you stand, the way you look at people. Sometimes you remind me of him. That's all.");
    yield 40;
    // the gate to Sector 7 opens
    s.sfx('gate'); s.shake(1, 30);
    yield s.cam(14, 3, 40, { dist: 9.5 });
    s.spawn('choco', 'chocobo', 15, 1, 'down', { name: 'Chocobo' });
    s.spawn('wagondrv', 'man6', 14, 1, 'down', { name: 'Wagon Driver' });
    s.spawn('tifaW', C3.TIFA_DRESS, 15, 1, 'down', { name: 'Tifa' });
    s.sfx('chocobo');
    yield C3.par([s.move('choco', 15, 4), s.move('wagondrv', 14, 3), s.move('tifaW', 15, 3)]);
    s.stopAnim('player');
    yield s.emote('player', '!');
    yield s.say('cloud', "......Tifa?!");
    s.stopAnim('aeris');
    yield s.say('aeris', "Tifa?");
    s.move('choco', [[15, 12], [8, 14], [0, 15]], { noWait: true });
    s.move('wagondrv', [[14, 12], [7, 14], [0, 15]], { noWait: true });
    s.move('tifaW', [[15, 11], [8, 13], [0, 15]], { noWait: true });
    yield 150;
    s.remove('choco'); s.remove('wagondrv'); s.remove('tifaW');
    s.camFollow();
    yield s.jump('player', 12, 8, 0.8, 26);
    yield s.jump('aeris', 12, 7, 0.8, 26);
    yield s.face('aeris', 'player');
    yield s.say('cloud', "That was Tifa. Something's wrong. She looked... different.");
    yield s.say('aeris', "That wagon was headed for Wall Market. It's the other side of Sector 6. Kind of a... shady part of town.\f......Hey. Is Tifa your girlfriend?");
    // FF7 date points: "no" Aeris +1, "yes" Aeris -5
    const DPG = [{ aeris: 1 }, { aeris: -5 }];
    const g = yield C3.pick(s, ['No. Nothing like that.', 'Yeah. She is.'], null, { date: DPG });
    FF7.story.datePts(s, DPG[g]);
    yield s.say('aeris', g === 0 ? "Hee hee. Just asking. Well, let's go find her!" : "......Oh. I see.\f...Then we'd better go find her. Come on!");
    yield s.say('cloud', "You're going home.");
    yield s.say('aeris', "Nope! Wall Market's rough. You'll need a guide who knows the place. Come on!");
    s.remove('aeris');
    s.music('slums');
  };

  FF7.defineMap('s6_park_ruin', {
    name: 'Sector 6 Park', area: 'Midgar', theme: 'slums',
    music: s => s.flag('c3_grief_done') ? 'slums' : 'none',
    look: { sky: ['#140a06', '#3a2414'], fog: { color: [0.1, 0.07, 0.05], near: 8, far: 22 } },
    lights: [[14, 3, '#ff8040', 3]],
    grid: PARK_RUIN,
    heights: C3.hm(PARK_RUIN, SLIDE),
    entries: { from_ruins: [30, 9, 'left'], from_road: [1, 15, 'right'], from_wire: [15, 7, 'up'] },
    exits: parkExits,
    items: [{ at: [7, 8], materia: 'sense', id: 's6_park_sense' }],
    npcs: [
      { id: 'refugee1', model: 'woman8', at: [22, 10], dir: 'up', show: s => s.flag('c3_grief_done'),
        talk: function* (s) { yield s.say('Woman', "Sector 7... It's gone. My whole street, just... gone. I was only out buying bread."); } },
      { id: 'refugee2', model: 'man8', at: [25, 5], dir: 'left', show: s => s.flag('c3_grief_done'),
        talk: function* (s) { yield s.say('Man', "The TV says AVALANCHE brought the plate down. But I saw Shinra helicopters circling that pillar before it blew. I know what I saw."); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c3_grief_done')) yield* FF7.story.c3_grief(s);
    },
  });

  FF7.story.c3_grief = function* (s) {
    s.set('c3_grief_done');
    s.music('holding');
    s.spawn('barret', 'barret', 14, 5, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 17, 7, 'up', { name: 'Tifa' });
    s.place('player', 12, 8, 'up');
    yield s.fadeIn(40);
    yield s.cam(14, 4, 40);
    s.anim('barret', 'kneel');
    yield s.say('barret', "......Marlene......\f......MARLENE!!");
    s.stopAnim('barret');
    s.anim('barret', 'shoot');
    s.sfx('shot3'); s.shake(3, 30);
    yield 30;
    s.sfx('shot3'); s.shake(3, 30);
    yield 30;
    s.stopAnim('barret');
    yield s.say('barret', "DAMN IT! DAMN IT ALL!!");
    s.anim('barret', 'punch');
    s.sfx('hit');
    yield 20;
    s.anim('barret', 'kneel');
    yield s.move('tifa', 15, 6);
    yield s.say('tifa', "Barret... Stop. Please.");
    yield s.say('barret', "Biggs... Wedge... Jessie... Everybody down there.\fAll gone. 'Cause of Shinra... 'cause of us... 'cause of ME!");
    yield s.say('tifa', "Barret, listen to me! Marlene's alive. Aeris got to her before the plate came down. She told us so herself, remember?");
    s.stopAnim('barret');
    yield s.face('barret', 'tifa');
    yield s.say('barret', "......The flower girl? Then... Then where the hell is Marlene?!");
    yield s.say('tifa', "If Aeris took her anywhere, it'd be somewhere she trusts. Her own home.");
    yield s.face('player', 'barret');
    yield s.say('cloud', "Aeris' house. It's in Sector 5. I know the way.");
    yield s.face('barret', 'player');
    yield s.say('barret', "......Then what the hell're we standin' around for?! Let's move!");
    s.camFollow();
    s.remove('barret');
    s.remove('tifa');
    s.music('slums');
    yield s.say('cloud', "(......Tseng said the Ancients. The last of them. What did he mean?)");
  };

  // ================================================================== the road to Wall Market
  const ROAD = [
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "hxxRRxxhhhhhhhxxxRRxxxxhhhhhxxxxxh",
    "hx......x........o.........xx...xh",
    "hx...B.....xx..........l.......xxh",
    "h...........::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::",
    "::::::::::::::::::::::::::::::::::",
    "::::::::::::.............o.....xxh",
    "hx....xx.......RR.......x.......xh",
    "hxxRRxxxxx....xxxxRRxxxx....xxxxxh",
    "##################################",
  ];
  FF7.defineMap('s6_road', {
    name: 'Road to Wall Market', area: 'Midgar', theme: 'slums', music: 'slums',
    battle: { table: 'wallmarket_outskirts', bg: 'slums', rate: 1 },
    grid: ROAD,
    entries: { from_park: [32, 5, 'left'], from_wm: [1, 6, 'right'] },
    exits: [
      { at: [0, 5, 1, 3], to: 'wall_south', entry: 'from_road' },
      { at: [33, 4, 1, 3], run: toPark('from_road') },
    ],
    npcs: [
      { id: 'roadman', model: 'man10', at: [13, 3], dir: 'down',
        talk: function* (s) {
          if (C3.plate(s)) { yield s.say('Man', "Heading back to Wall Market? Business never stops there. Not even when the sky falls in."); return; }
          yield s.say('Man', "Wall Market's just ahead. Whatever you're looking for, you'll find it there... for a price.\fAnd whatever you do, don't cross Don Corneo.");
        } },
    ],
  });
})();

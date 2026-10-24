// Chapter 8, part 2 — the Temple of the Ancients. Tseng wounded by Sephiroth (the Keystone), the
// stairs-and-vines maze (the Ancient's room: shop, rest, save), the rolling boulders, the clock
// room (twelve doorways, the second hand and its pit), the gate puzzle of doorway VI, the pool of
// wisdom (Sephiroth and Tseng), Sephiroth and the Meteor mural, Red Dragon (Bahamut), the model of
// the Temple (the Black Materia), Cait Sith's sacrifice, Demons Gate, the Temple shrinking, Cait
// Sith No. 2, Sephiroth taking the Black Materia and Cloud striking Aeris. Then Cloud's dream in the
// forest and his waking at the Gongaga inn (C6b's gongaga_inn, entry "wake").
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const TEAM = ['tifa', 'barret', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const third = s => TEAM.find(id => s.inParty(id)) || null;          // the member with Cloud and Aeris
  const members = s => TEAM.filter(id => s.isMember(id));
  function spawnCrew(s, ids, spots, dir) {
    const used = ids.slice(0, spots.length);
    used.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || dir || 'down', { name: s.name(id) }));
    return used;
  }
  const clearCrew = (s, ids) => ids.forEach(id => s.remove(id));
  const ANCIENT = { base: 'oldman', top: '#6a3a9a', sleeve: '#6a3a9a', bottom: '#5a2a8a', boots: '#3a1a5a', skin: '#d8c8f0', hair: '#e8e0ff', hairStyle: 'bald', extras: ['robe'], height: 'kid' };
  const CAPE = { base: 'man', top: '#141418', sleeve: '#141418', bottom: '#101014', boots: '#0a0a0a', skin: '#c8b8a8', hair: '#3a3a3a', hairStyle: 'longmessy', extras: ['cape', 'robe'] };
  const TLOOK = { wall: '#6a6450', trim: '#3a3428', floor: ['#8a8068', '#827860'], floor2: ['#7a7058', '#726850'], water: '#6a3a9a', sky: ['#040806', '#0c1a10'] };
  const talkAncient = function* (s) {
    const c = yield s.ask('Ancient', "......(The Ancient says nothing, but gestures kindly.)", ['Buy items', 'Rest', 'Save', 'Leave']);
    if (c === 0) yield s.shop('temple_items');
    else if (c === 1) { yield s.fadeOut(20); s.heal(); s.sfx('heal'); yield s.fadeIn(20); yield s.msg("A gentle light washes over the party. Everyone's HP and MP are fully restored."); }
    else if (c === 2) yield s.save();
  };

  // ================================================================== world link
  FF7.world.link('temple_of_ancients', { map: 'temple_exterior', entry: 'from_world', if: s => s.flag('c8_keystone_stolen') && !s.flag('c8_temple_done') });
  FF7.world.link('temple_of_ancients', { run: function* (s) {
    if (s.flag('c8_temple_done')) yield s.msg('Where the Temple of the Ancients once stood, there is only a vast crater swallowed by jungle.');
    else yield s.msg('A great stepped pyramid rises out of the jungle. Its doorway is sealed; in the stone there is a hollow, as if for some kind of key.');
  } });

  // ================================================================== outside the Temple
  // The stepped pyramid behind the gate wall: the wall block of rows 0-5 is shaped by `buildings` rects,
  // one tier ring (front row + two side columns, the back is the map edge) per tier, each tier 0.7 m higher;
  // a recessed stair climbs the middle to the shrine on top. The rects must not overlap (a building's walls
  // share one eave height, taken over its whole rect).
  const PYRAMID = (() => {
    const out = [], stone = '#8a8266', moss = '#6c7050', step = '#9a9276', base = 0.9;   // walls stand on digit 3
    const tier = (at, top) => out.push({ at, h: top - base, col: stone, roof: moss, win: false });
    for (let k = 1; k <= 5; k++) {
      const x0 = 10 + k, x1 = 25 - k, row = 6 - k, top = 3.9 + 0.7 * k;
      tier([x0, row, 17 - x0, 1], top); tier([19, row, x1 - 18, 1], top);     // front, either side of the stair
      if (row > 0) { tier([x0, 0, 1, row], top); tier([x1, 0, 1, row], top); } // sides, back to the map edge
      if (row > 0 && row < 5) out.push({ at: [17, row, 2, 1], h: top + 0.2 - base, col: step, roof: step, win: false });   // the stair
    }
    out.push({ at: [16, 0, 4, 1], h: 8.8 - base, col: stone, roof: moss, win: false });   // the shrine on top
    return out;
  })();
  FF7.defineMap('temple_exterior', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'jungle', music: 'temple',
    // refs references/templeofancients.gif, 10-forgottencity03: a railed wooden bridge crosses a misty ravine
    // to the gate in a mossy stone wall; the stepped pyramid (stepped walls, PYRAMID) rises behind it,
    // jungle all round
    buildings: PYRAMID,
    look: { floor: ['#5a5a4a', '#565646'], floor2: ['#6a6852', '#64624c'], wall: '#555a4a', wallTop: '#3e4a36', trim: '#4a3a28', wallH: 3.0,
      grass: ['#3a5a26', '#36542a'], sky: ['#34483f', '#9ab0a4'], fog: { color: [0.45, 0.55, 0.5], near: 8, far: 24 } },
    camera: { pitch: 36, dist: 11 },
    grid: [
      "%TTR%R%TTTT##############TTTTTR%R%TT",
      "TTTTR%R%TTT##############%TTTTTR%R%%",
      "%TTTTR%R%TT##############R%TTTTTR%RT",
      "TTTTTTR%R%T##############%R%TTTTTR%%",
      "%%TTTTTR%R%##############R%R%TTTTTRT",
      "TR%TTTTTR%R######::######TR%R%TTTTT%",
      "%%R%TTTTTR#######++#######TR%R%TTTTT",
      "TR%R%TTTTTR%:u::::::::u:TTTTR%R%TTT%",
      "%TR%R%TTTTTR::::::::::::TTTTTR%R%TTT",
      "TTTR%R%TTTTTR%R%^^^^TR%R%TTTTTR%R%T%",
      "%TTT           =KKKK=           %R%T",
      "TTTT           =KKKK=           R%R%",
      "%TTT           =KKKK=           TR%T",
      "T%TT           =KKKK=           TTR%",
      "%R%T           =KKKK=           TTTT",
      "T%R%           =KKKK=           TTT%",
      "%R%R%TTTTTR%R%TT^^^^%R%TTTTTR%R%TTTT",
      "TTR%R%TTTTTR%R%T^^^^R%R%TTTTTR%R%TT%",
      "%TT,,,,,,,,,,,,,::::,,,,,,,,,,,,,%TT",
      "TTT,,T,,G,,,,,,,::::,,T,,,G,,%,,,R%%",
      "%TT,,,,,,R,,T,,,::::,,,,,,,,,,,,,%RT",
      "TTT,,,,%,,,,,,,,::::,,,,,,,T,,,,,R%%",
      "%%T,,,,,,,,,,,G,::::,,,,,,,,,,,,,TRT",
      "TR%,,,,,,T,,,,,,::::,G,,,,,R,,,,,TT%",
      "%%R%,,,,,,,,,,,,::::,,,,,%,,,,,,,TTT",
      "TR%,,,G,,,,,,,,,::::,,,,,,,,,,T,,TT%",
      "%TR,,,,,,,,%,,,,::::,,,,,,,,,,,,,TTT",
      "TTT,T,,,,,,,,,,,::::,,,,T,,,G,,,,%T%",
      "%TT,,,,,,,,,,,,,::::,,,,,,,,,,,,,R%T",
      "TTTTTR%R%TTTTTR%::::TTTR%R%TTTTTR%R%",
    ],
    heights: [
      "000000000003333333333333300000000000",
      "000000000003333333333333300000000000",
      "000000000003333333333333300000000000",
      "000000000003333333333333300000000000",
      "000000000003333333333333300000000000",
      "000000000003333333333333300000000000",
      "000000000033333333333333330000000000",
      "000000000000333333333333000000000000",
      "000000000000333333333333000000000000",
      "000000000000000033330000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000222222000000000000000",
      "000000000000000011110000000000000000",
      "000000000000000011110000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    lights: [[17, 7, '#ffe0a0', 3]],
    entries: { from_world: [17, 28, 'up'], from_temple: [17, 7, 'down'], after_gate: [17, 8, 'down'] },
    exits: [
      { at: [16, 29, 4, 1], to: 'world', loc: 'temple_of_ancients' },
      { at: [17, 6, 2, 1], to: 'temple_hall', entry: 'from_outside', sfx: 'door' },
    ],
    npcs: [
      { id: 'cape1', name: 'Man in Black', model: CAPE, at: [7, 23], dir: 'right', wander: 2, show: s => !s.flag('c8_temple_done'),
        talk: function* (s) { yield s.say('Man in Black', "......Uuuh... The Black... Materia......"); } },
      { id: 'cape2', name: 'Man in Black', model: CAPE, at: [28, 20], dir: 'left', anim: 'weak', show: s => !s.flag('c8_temple_done'),
        talk: function* (s) { yield s.say('Man in Black', "...Se...phi...roth...... The Reunion...... is near......"); } },
      { id: 'cape3', name: 'Man in Black', model: CAPE, at: [21, 8], dir: 'down', anim: 'dead', show: s => s.flag('c8_temple_arrived'),
        talk: function* (s) { yield s.msg("He isn't moving. On his arm, a tattooed number."); } },
    ],
    objects: [
      { at: [13, 7], talk: function* (s) { yield s.msg('A weathered stone statue of a robed figure. Its face has been worn smooth by centuries of rain.'); } },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'from_world' || s.flag('c8_temple_arrived')) return;
      s.set('c8_temple_arrived');
      if (!s.inParty('aeris')) {
        yield s.say('aeris', "Cloud! Wait for me! I'm coming with you. I have to.");
        yield s.choosePArty(['cloud', 'aeris']);
      }
      s.spawn('aeris', 'aeris', 16, 27, 'up', { name: s.name('aeris') });
      const t = third(s);
      if (t) s.spawn(t, t, 18, 27, 'up', { name: s.name(t) });
      yield s.move('player', 17, 24);
      yield s.cam(17, 9, 60);
      yield s.say('aeris', "So this is the Temple of the Ancients...\f...I can feel them. So many voices... all whispering at once. Worried... scared...");
      s.spawn('cape_ev', CAPE, 17, 8, 'down', { name: 'Man in Black' });
      yield s.move('cape_ev', 17, 11, { speed: 0.01 });
      yield s.say('Man in Black', "Uuuh...... Black...... Materia......");
      s.anim('cape_ev', 'dead');
      yield 40;
      s.camFollow(40);
      yield s.say('cloud', "...Another one of those black-caped men. Sephiroth's here.");
      if (t === 'tifa') yield s.say('tifa', "And Shinra's probably already inside. Let's be careful, everyone.");
      else if (t === 'barret') yield s.say('barret', "Hmph. Big ol' pile of rocks in the middle of nowhere. Let's go kick some Shinra butt.");
      else if (t === 'redxiii') yield s.say('redxiii', "An ancient place... Grandfather spoke of temples like this one. Let us go carefully.");
      else if (t === 'cid') yield s.say('cid', "Damn jungle. My shirt's stickin' to my back. Let's get this over with.");
      else if (t === 'yuffie') yield s.say('yuffie', "Ooh, an ancient temple... Ancient temples mean ancient treasure, right? Right?");
      else if (t === 'vincent') yield s.say('vincent', "......This place... It reeks of death.");
      else if (t === 'caitsith') yield s.say('caitsith', "Mr. Tseng went in ahead... Let's, ah... let's go see, shall we?");
      s.remove('cape_ev'); s.remove('aeris'); if (t) s.remove(t);
    },
  });

  // ================================================================== the top chamber: Tseng
  FF7.defineMap('temple_hall', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple',
    // ref 10-forgottencity05: grey-violet stone in the dark, a purple-lit platform round the altar
    look: Object.assign({}, TLOOK, { wall: '#5a5068', trim: '#2a2434', wallTop: '#2a2434', floor: ['#6a6478', '#645e72'], floor3: ['#6a4a9a', '#644494'], sky: ['#040208', '#140c20'] }),
    camera: { pitch: 56, dist: 10 },
    grid: [
      "########################",
      "##|......######......|##",
      "#......................#",
      "#..........DD..........#",
      "#.........____.........#",
      "#..|......____......|..#",
      "#.........____.........#",
      "#......................#",
      "#......................#",
      "##########++############",
    ],
    lights: [[11, 5, '#b080ff', 4], [2, 1, '#ffb060', 2], [21, 1, '#ffb060', 2]],
    entries: { from_outside: [10, 8, 'up'] },
    exits: [{ at: [10, 9, 2, 1], to: 'temple_exterior', entry: 'from_temple', sfx: 'door',
      if: s => !s.flag('c8_tseng'), blocked: function* (s) { yield s.say('cloud', "(Sephiroth is somewhere in here. We're not turning back now.)"); } }],
    npcs: [
      { id: 'tseng', name: 'Tseng', model: 'tseng', at: [2, 3], dir: 'right', anim: 'sit', faceOnTalk: false,
        talk: function* (s) { yield s.say('tseng', s.flag('c8_tseng') ? "......" : "Ugh..."); } },
    ],
    triggers: [
      { id: 'tseng', at: [1, 2, 10, 7], once: true,
        run: function* (s) {
          s.music('none');
          s.spawn('aeris', 'aeris', 10, 8, 'up', { name: s.name('aeris') });
          yield s.move('aeris', 4, 4);
          yield s.face('aeris', 'tseng');
          yield s.say('aeris', "Tseng!");
          yield s.move('player', 4, 3);
          yield s.face('player', 'tseng');
          yield s.say('tseng', "...Heh. Of all the people... to find me like this...");
          yield s.say('aeris', "What happened to you?!");
          yield s.say('tseng', "Sephiroth... He was already here. I let my guard down...");
          yield s.say('tseng', "He's searching for the Promised Land... But it isn't... what the President thinks it is... It isn't a land of Mako...");
          yield s.say('cloud', "What is Sephiroth after?");
          yield s.say('tseng', "...Ask him... yourself. Here...");
          s.music('aeris');
          yield s.msg('Tseng hands over the Keystone.');
          yield s.give('keystone', 1, { silent: true });
          s.set('keystone');
          yield s.say('tseng', "Place it... on the altar...\f......Aeris... I never did... get you to come with us... quietly...");
          yield s.say('aeris', "Tseng... We were enemies. But you've known me since I was a little girl.\fSo don't you dare die on me. You hear?");
          yield s.say('tseng', "...Heh...... Stubborn... as always......");
          s.anim('tseng', 'lie');
          yield 40;
          yield s.say('cloud', "...He's still breathing. We can't do anything more for him here. Let's go.");
          yield s.move('aeris', 9, 5);
          s.remove('aeris');
          s.set('c8_tseng');
          s.music('temple');
        } },
      { at: [11, 3, 2, 1], on: 'talk', run: function* (s) {
          if (!s.flag('c8_tseng')) { yield s.msg('An ancient altar. In its center is a small hollow, carved to hold something.'); return; }
          const c = yield s.ask(null, 'An ancient altar with a small hollow in its center.\nPlace the Keystone in it?', ['Place it', 'Not yet']);
          if (c !== 0) return;
          s.take('keystone');
          yield s.msg(`${s.name('cloud')} sets the Keystone into the altar...`);
          s.sfx('gate');
          s.shake(3, 120);
          yield s.caption('With a deep rumble, the floor begins to sink,\ncarrying the party down into the heart of the Temple...', { hold: 150, bg: 'rgba(0,0,0,0.7)' });
          yield s.fadeOut(40);
          yield s.goto('temple_maze', 'start');
          yield* mazeArrival(s);
        } },
    ],
  });

  // ================================================================== the maze
  function* mazeArrival(s) {
    s.spawn('aeris', 'aeris', 5, 10, 'up', { name: s.name('aeris') });
    const t = third(s);
    if (t) s.spawn(t, t, 6, 11, 'up', { name: s.name(t) });
    yield s.fadeIn(40);
    yield s.say('aeris', "Wow... Stairs going up, down, sideways... It's like a giant puzzle box.");
    s.spawn('ancient_ev', ANCIENT, 8, 9, 'left', { name: 'Ancient' });
    yield s.emote('aeris', '!');
    yield s.face('player', 'ancient_ev');
    yield s.say('cloud', "......Who's there?");
    yield s.face('ancient_ev', 'player');
    yield 30;
    yield s.run('ancient_ev', [[8, 12], [8, 15], [21, 15], [21, 4], [38, 3]]);
    s.remove('ancient_ev');
    yield s.say('aeris', "That was... one of the Ancients. A spirit of my people, still here after all this time.\fHe wants us to follow him. I'm sure of it.");
    if (t === 'tifa') yield s.say('tifa', "A ghost...? Well... it didn't look dangerous, at least.");
    else if (t === 'barret') yield s.say('barret', "A g-g-ghost?! ...I mean, pfft. Ain't scared of no ghost.");
    else if (t === 'cid') yield s.say('cid', "Well, I'll be damned. Didn't have 'chasin' ghosts' on my list today.");
    else if (t === 'yuffie') yield s.say('yuffie', "Eek! D-don't just pop out like that!");
    else if (t === 'redxiii') yield s.say('redxiii', "A Cetra's spirit, lingering in the Planet's memory... Fascinating.");
    yield s.say('cloud', "Let's go after him.");
    s.remove('aeris'); if (t) s.remove(t);
    s.set('c8_maze_intro');
  }
  FF7.defineMap('temple_maze', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple',
    // refs 10-forgottencity07, 08: blue-grey stone blocks and stairways seen almost straight down
    look: Object.assign({}, TLOOK, { wall: '#58647a', trim: '#2e3646', wallTop: '#3a4252', floor: ['#7a8698', '#748092'], floor2: ['#6a768a', '#647084'], sky: ['#02040a', '#0a1424'] }),
    camera: { pitch: 64, dist: 12 },
    battle: { table: 'temple_ancients', bg: 'temple', rate: 0.9 },
    grid: [
      "########################################",
      "################+################+######",
      "  ::::      ::::::::::::::::::::::::::::",
      "  ::::      ::::::::::::::::::::::::::::",
      "   ^^       ::::::::::::::::::::::::::::",
      "   ^^           H    ^^            HH   ",
      "   ^^           H    ^^            HH   ",
      "   ^^         :::::  ^^            HH   ",
      " :::::::::    :::::  ^^            HH   ",
      " :::::::::           ^^ ::::::::   HH   ",
      " :u:::::::           ^^ ::::::::   HH   ",
      " :::::::::           ^^ ::::::::   HH   ",
      " :::::::::           ^^    H       HH   ",
      "       HH            ^^    H       HH   ",
      "       HH            ^^    H       HH   ",
      "   :::::::::::::::::::::::::::::::::::  ",
      "   :::::::::u:::::::::::::::::u:::::::  ",
      "   :::::::::::::::::::::::::::::::::::  ",
      "    H                                   ",
      "    H                                   ",
      "  :::::::                               ",
      "  x::::::                               ",
      "  :::::::                               ",
      "                                        ",
    ],
    heights: [
      "9999999999999999999999999999999999999999",
      "9999999999999999999999999999999999999999",
      "0099990000009999999999999999999999999999",
      "0099990000009999999999999999999999999999",
      "0008800000009999999999999999999999999999",
      "0008800000000000800008800000000000088000",
      "0007700000000000700008800000000000088000",
      "0007700000000066666007700000000000077000",
      "0666666666000066666007700000000000077000",
      "0666666666000000000006606666666600066000",
      "0666666666000000000006606666666600066000",
      "0666666666000000000005506666666600055000",
      "0666666666000000000005500005000000055000",
      "0000000550000000000004400004000000044000",
      "0000000440000000000004400004000000044000",
      "0003333333333333333333333333333333333300",
      "0003333333333333333333333333333333333300",
      "0003333333333333333333333333333333333300",
      "0000200000000000000000000000000000000000",
      "0000100000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
      "0000000000000000000000000000000000000000",
    ],
    lights: [[16, 2, '#c0a0ff', 3], [33, 2, '#a0a0a0', 2], [2, 10, '#ffd080', 2]],
    entries: { start: [4, 10, 'right'], from_room: [16, 2, 'down'], from_boulders: [38, 3, 'left'], from_pit: [33, 2, 'down'] },
    exits: [
      { at: [16, 1, 1, 1], to: 'temple_ancient_room', entry: 'from_maze', sfx: 'door' },
      { at: [33, 1, 1, 1], run: function* (s) { yield s.msg('A great stone slab seals this doorway. It will not budge from this side.'); } },
      { at: [39, 2, 1, 3], to: 'temple_boulders', entry: 'from_maze' },
    ],
    triggers: [
      { at: [2, 1, 4, 1], on: 'talk', run: function* (s) { yield s.msg("The stairs end at a blank stone wall. ...A dead end."); } },
    ],
    items: [
      { at: [27, 3], item: 'mind_source', id: 'temple_maze_mind_source' },
      { at: [15, 8], item: 'turbo_ether', id: 'temple_maze_turbo_ether' },
      { at: [30, 10], materia: 'luck_plus', id: 'temple_maze_luck_plus' },
    ],
    chests: [
      { at: [20, 17], item: 'trident', id: 'temple_maze_trident' },
      { at: [7, 21], item: 'rocket_punch', id: 'temple_maze_rocket_punch' },
    ],
    objects: [
      { at: [2, 10], talk: function* (s) { yield s.msg('The altar block that carried you down. The Keystone is set firmly in its top; it will not come loose.'); } },
      { at: [12, 16], talk: function* (s) { yield s.msg('A statue of a robed Ancient, its hands raised to the sky.'); } },
      { at: [30, 16], talk: function* (s) { yield s.msg('A cracked statue. At its base, a carving of a falling star... and a crowd of people looking up at it.'); } },
    ],
  });

  // ------------------------------------------------------------------ the Ancient's room
  FF7.defineMap('temple_ancient_room', {
    name: "Ancient's Room", area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    grid: [
      "################",
      "#V....k..k....V#",
      "#..............#",
      "#..S........j..#",
      "#..............#",
      "#..............#",
      "#######++#######",
    ],
    lights: [[8, 2, '#c0a0ff', 3]],
    entries: { from_maze: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 2, 1], to: 'temple_maze', entry: 'from_room', sfx: 'door' }],
    chests: [{ at: [13, 4], item: 'silver_rifle', id: 'temple_room_silver_rifle' }],
    npcs: [{ id: 'ancient', name: 'Ancient', model: ANCIENT, at: [8, 2], dir: 'down', talk: talkAncient }],
    onEnter: function* (s) {
      if (s.flag('c8_ancient_room')) return;
      s.set('c8_ancient_room');
      s.spawn('aeris', 'aeris', 7, 5, 'up', { name: s.name('aeris') });
      yield s.say('aeris', "He can't speak anymore... He's been alone here so long, he's forgotten how.\fBut he wants to help us. I can feel it.");
      s.remove('aeris');
    },
  });

  // ================================================================== the rolling boulders
  const SIDES = ['left', 'middle', 'right'];
  function* boulder(s, k) {
    if (s.get('c8_boulder') !== k) return;
    const hollow = Math.floor(Math.random() * 3);
    s.sfx('falling'); s.shake(3, 60);
    yield s.msg('RUMBLE... A huge U-shaped boulder comes rolling down the corridor!');
    // the hint stays on screen with the question (the runner answers from the question box's text)
    const c = yield s.ask(null, `The hollow under it looks like it's on the ${SIDES[hollow]}! Where do you crouch?`, ['On the left', 'In the middle', 'On the right']);
    s.shake(6, 30);
    if (c === hollow) {
      s.anim('player', 'kneel');
      yield s.msg('The boulder thunders overhead... and rolls harmlessly past!');
      s.stopAnim('player');
      s.inc('c8_boulder');
      if (s.get('c8_boulder') >= 3) {
        s.set('c8_boulders_done');
        yield s.msg('...The rumbling fades. It seems the boulders have stopped.');
      }
    } else {
      s.anim('player', 'hurt'); s.sfx('hit');
      yield s.msg(`Flattened! ${s.name('cloud')} is swept all the way back down the corridor!`);
      s.stopAnim('player');
      s.setVar('c8_boulder', 0);
      yield s.fadeOut(12);
      s.place('player', 7, 25, 'up');
      yield s.fadeIn(12);
    }
  }
  FF7.defineMap('temple_boulders', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    grid: [
      "##################",
      "########++########",
      "#....|......|....#",
      "#####........#####",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "    #........#    ",
      "#####........#####",
      "#..~~~~......~~~.#",
      "#..~~~~......~~~.#",
      "#................#",
      "#######++#########",
    ],
    lights: [[5, 25, '#a060ff', 3], [14, 25, '#a060ff', 2]],
    entries: { from_maze: [7, 26, 'up'], from_clock: [8, 2, 'down'] },
    exits: [
      { at: [7, 27, 2, 1], to: 'temple_maze', entry: 'from_boulders' },
      { at: [7, 1, 2, 1], to: 'temple_clock', entry: 'from_boulders', sfx: 'door' },
    ],
    items: [{ at: [16, 25], materia: 'morph', id: 'temple_boulders_morph' }],
    objects: [{ at: [3, 24], talk: function* (s) { yield s.msg('A pool of thick purple liquid. It glimmers faintly, as if something were moving far beneath the surface.'); } }],
    triggers: [
      { at: [5, 19, 8, 1], if: s => !s.flag('c8_boulders_done'), run: function* (s) { yield* boulder(s, 0); } },
      { at: [5, 13, 8, 1], if: s => !s.flag('c8_boulders_done'), run: function* (s) { yield* boulder(s, 1); } },
      { at: [5, 7, 8, 1], if: s => !s.flag('c8_boulders_done'), run: function* (s) { yield* boulder(s, 2); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_boulders_seen')) return;
      s.set('c8_boulders_seen');
      s.setVar('c8_boulder', 0);
      yield s.say('aeris', "Shh... Listen. Do you hear that? Something's rumbling, up ahead...", { pos: 'top' });
    },
  });

  // ================================================================== the clock room
  const NUM = ['I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function* enterClockRoom(s, n) {
    s.setVar('c8_clock_room', n);
    if (n === 6) { yield s.goto('temple_gate_room', 'from_clock'); return; }
    if (n === 10) { yield s.goto('temple_boulders', 'from_clock'); return; }
    if (n === 12) { yield s.goto('temple_exit', 'from_clock'); return; }
    yield s.goto('temple_alcove', 'in');
  }
  function* clockHub(s) {
    if (s.flag('c8_model_seen')) {
      yield s.msg('The long hand has swung round to XII on its own, and will not move.');
      const k = yield s.ask(null, 'Cross the long hand to doorway XII?', ['Cross', 'Not yet']);
      if (k !== 0) return;
      yield* enterClockRoom(s, 12);
      return;
    }
    const c = yield s.ask(null, 'A great gear drives the hands of the clock. Move the long hand to point at which doorway?', NUM.concat(['Leave it']));
    if (c >= 12) return;
    const n = c + 1;
    if (n === 12) { yield s.msg('The long hand grinds to a halt just short of XII. Something holds it back.'); return; }
    if (n === 10) {
      yield s.msg('Doorway X is the one you came in through, back to the corridor of boulders.');
      const k = yield s.ask(null, 'Go back through doorway X?', ['Go back', 'Stay']);
      if (k === 0) yield* enterClockRoom(s, 10);
      return;
    }
    s.sfx('gate');
    yield s.msg(`CLUNK... The long hand swings slowly round to point at doorway ${NUM[c]}.`);
    yield s.msg(`${s.name('cloud')} steps out onto the long hand...`);
    if (Math.random() < 0.5) {
      s.shake(2, 30);
      const k = yield s.ask(null, 'Halfway across, the second hand comes sweeping round toward you!', ['Keep going', 'Stop and wait for it to pass']);
      if (k === 0) {
        s.anim('player', 'hurt'); s.sfx('falling');
        yield s.msg('WHAM! The second hand knocks you clean off the long hand!');
        s.stopAnim('player');
        yield s.fadeOut(30);
        yield s.goto('temple_pit', 'fall');
        return;
      }
      yield s.msg('The second hand sweeps past in front of you... and on around the clock.');
    }
    yield* enterClockRoom(s, n);
  }
  FF7.defineMap('temple_clock', {
    name: 'Clock Room', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    camera: { dist: 12, pitch: 56 },
    grid: [
      "##################################",
      "###########+#####+#####+##########",
      "#         :::   :::   :::        #",
      "#                                #",
      "#                                #",
      "#::                            ::#",
      "+:::::::::::::::               ::+",
      "#::            :               ::#",
      "#              :                 #",
      "#            ::::::::            #",
      "#::          ::::::::          ::#",
      "+::          :::OO:::          ::+",
      "#::          ::::::::          ::#",
      "#            ::::::::            #",
      "#                                #",
      "#::                            ::#",
      "+::                            ::+",
      "#::                            ::#",
      "#                                #",
      "#                                #",
      "#                                #",
      "#         :::   :::   :::        #",
      "###########+#####+#####+##########",
    ],
    heights: [
      "0000000000000000000000000000000000",
      "0000000000030000030000030000000000",
      "0000000000333000333000333000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0330000000000000000000000000000330",
      "3333333333333333000000000000000333",
      "0330000000000003000000000000000330",
      "0000000000000003000000000000000000",
      "0000000000000333333330000000000000",
      "0330000000000333333330000000000330",
      "3330000000000333333330000000000333",
      "0330000000000333333330000000000330",
      "0000000000000333333330000000000000",
      "0000000000000000000000000000000000",
      "0330000000000000000000000000000330",
      "3330000000000000000000000000000333",
      "0330000000000000000000000000000330",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000333000333000333000000000",
      "0000000000030000030000030000000000",
    ],
    lights: [[16, 11, '#ffe0a0', 4], [17, 2, '#ffd060', 2]],
    entries: { from_boulders: [2, 6, 'right'], hub: [16, 12, 'up'] },
    exits: [{ at: [0, 6, 1, 1], to: 'temple_boulders', entry: 'from_clock', sfx: 'door' }],
    triggers: [{ at: [16, 11, 2, 1], on: 'talk', run: clockHub }],
    onEnter: function* (s) {
      if (s.flag('c8_clock_seen')) return;
      s.set('c8_clock_seen');
      yield s.cam(16, 11, 50);
      yield s.msg('A vast clock face hangs over a bottomless pit. Around its rim, twelve doorways, each marked with a numeral.');
      yield s.say('aeris', "The hands... I think we're supposed to walk on them!\fMove the long hand so it points at a doorway, then walk across. The big gear in the middle must turn it.", { pos: 'top' });
      yield s.say('aeris', "Just... watch out for the second hand, okay? It never stops moving.", { pos: 'top' });
      s.camFollow(40);
    },
  });

  // ------------------------------------------------------------------ the small chambers (I-V, VII-IX, XI)
  const inRoom = n => s => s.get('c8_clock_room') === n;
  FF7.defineMap('temple_alcove', {
    name: 'Clock Room Chamber', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    grid: [
      "##############",
      "#V....uu....V#",
      "#............#",
      "#............#",
      "#............#",
      "#............#",
      "######++######",
    ],
    entries: { in: [6, 5, 'up'] },
    exits: [{ at: [6, 6, 2, 1], run: function* (s) { yield s.goto('temple_clock', 'hub'); } }],
    chests: [
      { at: [6, 3], item: 'princess_guard', id: 'temple_room4_princess_guard', if: inRoom(4) },
      { at: [6, 3], item: 'ribbon', id: 'temple_room5_ribbon', if: inRoom(5) },
      { at: [6, 3], item: 'trumpet_shell', id: 'temple_room7_trumpet_shell', if: inRoom(7) },
      { at: [6, 3], item: 'megalixir', id: 'temple_room8_megalixir', if: inRoom(8) },
    ],
    objects: [{ at: [6, 1], talk: function* (s) { yield s.msg(`Above the doorway, the numeral ${NUM[(s.get('c8_clock_room') || 1) - 1]} is carved into the stone.`); } }],
    onEnter: function* (s) {
      const n = s.get('c8_clock_room');
      if (n === 1 && !s.flag('c8_room1_battle')) {
        s.set('c8_room1_battle');
        yield s.say('cloud', "......! Something's here!");
        yield s.battle({ table: 'event_temple_room1', bg: 'temple', music: 'battle' });
      } else if (n === 3 && !s.flag('c8_room3_battle')) {
        s.set('c8_room3_battle');
        yield s.say('cloud', "......! Something's here!");
        yield s.battle({ table: 'event_temple_room3', bg: 'temple', music: 'battle' });
      } else if (n === 2 || n === 9 || n === 11) {
        yield s.msg('An empty chamber. It leads nowhere.');
      }
    },
  });

  // ------------------------------------------------------------------ the pit under the clock
  FF7.defineMap('temple_pit', {
    name: 'Under the Clock', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    grid: [
      "################",
      "#######++#######",
      "#x............x#",
      "#..............#",
      "#.....RR.......#",
      "#..............#",
      "#x...........x.#",
      "################",
    ],
    entries: { fall: [4, 3, 'down'] },
    exits: [{ at: [7, 1, 2, 1], run: function* (s) {
      yield s.msg('A narrow passage winds upward through the stone...');
      yield s.goto('temple_maze', 'from_pit');
    } }],
    chests: [{ at: [12, 5], item: 'nail_bat', id: 'temple_pit_nail_bat' }],
    onEnter: function* (s) {
      if (s.entry() !== 'fall') return;
      s.shake(4, 20);
      yield s.say('cloud', "Ugh... Where... the bottom of the pit?\f......! We're not alone down here!");
      yield s.battle({ table: 'event_temple_clock_pit', bg: 'temple', music: 'battle' });
    },
  });

  // ================================================================== doorway VI: the gate puzzle
  // Nine caves; each leads to another (FF7: 1->4, 2->7, 3->9, 4->2, 5->6, 6->3, 7->8, 8->5, 9->1).
  // Catch the Ancient by entering the cave he will come out of.
  const DEST = { 1: 4, 2: 7, 3: 9, 4: 2, 5: 6, 6: 3, 7: 8, 8: 5, 9: 1 };
  const DOOR = { 1: [4, 1], 2: [4, 6], 3: [11, 6], 4: [18, 6], 5: [25, 6], 6: [4, 11], 7: [11, 11], 8: [18, 11], 9: [25, 11] };
  const TIER = { 1: [1], 2: [2, 3, 4, 5], 3: [2, 3, 4, 5], 4: [2, 3, 4, 5], 5: [2, 3, 4, 5], 6: [6, 7, 8, 9], 7: [6, 7, 8, 9], 8: [6, 7, 8, 9], 9: [6, 7, 8, 9] };
  function* ancientHides(s, from) {
    // the Ancient pops out of cave `from`, then darts into another cave on the same tier
    const opts = TIER[from];
    const k = opts[Math.floor(Math.random() * opts.length)];
    const [fx, fy] = DOOR[from], [kx, ky] = DOOR[k];
    s.spawn('ancient_ev', ANCIENT, fx, fy + 1, 'down', { name: 'Ancient' });
    yield s.emote('ancient_ev', '♪');
    yield s.run('ancient_ev', [[kx, ky + 1], [kx, ky]]);
    s.remove('ancient_ev');
    s.setVar('c8_gate_target', DEST[k]);
  }
  const caveDoor = (d) => function* (s) {
    const target = s.get('c8_gate_target');
    const [tx, ty] = DOOR[DEST[d]];
    s.sfx('door');
    yield s.fadeOut(14);
    if (!s.flag('c8_gate_solved') && s.flag('c8_gate_started') && target === d) {
      s.place('player', 14, 3, 'up');
      s.spawn('ancient_ev', ANCIENT, 15, 2, 'down', { name: 'Ancient' });
      yield s.fadeIn(14);
      yield s.msg('Inside the cave, you come face to face with the Ancient!');
      yield s.face('ancient_ev', 'player');
      yield s.emote('ancient_ev', '!');
      yield s.say('aeris', "Got you! ...Hee hee. He's smiling. I think he's glad someone finally played with him.", { pos: 'top' });
      yield s.move('ancient_ev', 14, 2);
      yield s.face('ancient_ev', 'up');
      s.sfx('gate'); s.shake(3, 60);
      yield s.msg('The Ancient raises his hands... and with a deep grinding sound, the great door slides open!');
      yield s.move('ancient_ev', 16, 3);
      s.remove('ancient_ev');
      s.set('c8_gate_solved');
      s.show('ancient');
      return;
    }
    s.place('player', tx, ty + 1, 'down');
    yield s.fadeIn(14);
    if (!s.flag('c8_gate_solved') && s.flag('c8_gate_started')) yield* ancientHides(s, target);
  };
  FF7.defineMap('temple_gate_room', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple',
    look: Object.assign({ wallH: 2.0 }, TLOOK),
    camera: { dist: 11, pitch: 50 },
    grid: [
      "##############################",
      " ###+#########++#########+### ",
      " u::::::::::::::::::::::::::u ",
      " :::::::::::::::::::::::::::: ",
      "                              ",
      "                              ",
      " ###+######+######+######+### ",
      " :::::::::::::::::::::::::::j ",
      " :::::::::::::::::::::::::::: ",
      "                              ",
      "                              ",
      " ###+######+######+######+### ",
      " :::::::::::::::::::::::::::x ",
      " :::::::::::::::::::::::::::: ",
      "##############################",
    ],
    heights: [
      "000000000000000000000000000000",
      "066666666666666666666666666660",
      "066666666666666666666666666660",
      "066666666666666666666666666660",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "033333333333333333333333333330",
      "033333333333333333333333333330",
      "033333333333333333333333333330",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    lights: [[14, 1, '#ffe0a0', 3]],
    entries: { from_clock: [25, 2, 'down'], from_mural: [14, 2, 'down'] },
    exits: [
      { at: [25, 1, 1, 1], to: 'temple_clock', entry: 'hub', sfx: 'door' },
      { at: [14, 1, 2, 1], to: 'temple_mural', entry: 'from_gate', sfx: 'door', if: s => s.flag('c8_gate_solved'),
        blocked: function* (s) { yield s.msg('A great stone door, shut tight. There is no handle, no keyhole... nothing.'); } },
    ].concat([1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => ({ at: [DOOR[d][0], DOOR[d][1], 1, 1], run: caveDoor(d) }))),
    chests: [{ at: [2, 13], item: 'work_glove', id: 'temple_gate_work_glove' }],
    npcs: [{ id: 'ancient', name: 'Ancient', model: ANCIENT, at: [16, 3], dir: 'down', show: s => s.flag('c8_gate_solved'), talk: talkAncient }],
    objects: [
      { at: [1, 2], talk: function* (s) { yield s.msg('Numerals are carved over each of the nine caves: 1 at the top, 2 to 5 in the middle, 6 to 9 below.\nBeneath cave 1, and beneath cave 2, the ledge drops away to the level below.'); } },
    ],
    triggers: [
      { at: [3, 4, 3, 1], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'Jump down to the ledge below?', ['Jump', 'Stay']);
          if (c === 0) yield s.jump('player', 4, 7, 0.6, 26);
        } },
      { at: [3, 9, 3, 1], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'Jump down to the ledge below?', ['Jump', 'Stay']);
          if (c === 0) yield s.jump('player', 4, 12, 0.6, 26);
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_gate_started')) return;
      s.set('c8_gate_started');
      s.spawn('ancient_ev', ANCIENT, 9, 3, 'right', { name: 'Ancient' });
      yield s.cam(12, 5, 40);
      yield s.face('player', 'ancient_ev');
      yield s.say('aeris', "Look, it's him again! Over there!", { pos: 'top' });
      yield s.face('ancient_ev', 'player');
      yield s.emote('ancient_ev', '♪');
      yield s.run('ancient_ev', [[4, 2], [4, 1]]);
      s.remove('ancient_ev');
      s.setVar('c8_gate_target', DEST[1]);
      yield s.say('aeris', "He went into that cave! ...Is he playing tag with us?\fThe caves must be connected. If we go in the one he'll come out of... we'll catch him!", { pos: 'top' });
      s.camFollow(40);
    },
  });

  // ================================================================== the pool of wisdom, the murals, the model
  function* poolVision(s) {
    s.set('c8_pool_vision');
    s.spawn('aeris', 'aeris', 5, 8, 'up', { name: s.name('aeris') });
    yield s.move('player', 7, 8);
    yield s.move('aeris', 4, 7);
    s.anim('aeris', 'kneel');
    yield s.say('aeris', "This pool... The Ancients are speaking through it. They want to show us something.\fLook into the water, Cloud...");
    s.music('none');
    yield s.fadeOut(30, '#301050');
    s.spawn('v_tseng', 'tseng', 10, 5, 'left', { name: 'Tseng' });
    s.spawn('v_seph', 'sephiroth', 7, 4, 'right', { name: 'Sephiroth' });
    s.hide('player'); s.hide('aeris');
    yield s.fadeIn(40);
    yield s.say('tseng', "Sephiroth... What is it you want in this Temple?");
    yield s.say('sephiroth', "Knowledge. The wisdom of the Ancients, sealed away in these walls... Everything I need to become one with the Planet.");
    yield s.say('tseng', "One with the Planet...? You mean...");
    yield s.say('sephiroth', "Yes. The Promised Land will be mine. And I... will become a god.");
    s.anim('v_seph', 'slash'); s.sfx('crit'); s.flash('#ff2020', 14, 0.6);
    s.anim('v_tseng', 'hurt');
    yield 30;
    s.anim('v_tseng', 'dead');
    yield 40;
    yield s.fadeOut(40, '#301050');
    s.remove('v_tseng'); s.remove('v_seph');
    s.show('player'); s.show('aeris');
    s.stopAnim('aeris');
    yield s.fadeIn(30);
    s.music('temple');
    yield s.say('aeris', "Tseng...");
    yield s.say('cloud', "Sephiroth wants to become one with the Planet...? What does that even mean?");
    yield s.say('aeris', "I don't know. But whatever it is... it's terrible. The Ancients are afraid, Cloud. I can feel it.");
    s.remove('aeris');
  }
  function* sephirothMural(s) {
    s.set('c8_sephiroth_mural');
    s.music('chosen');
    s.spawn('aeris', 'aeris', 14, 6, 'right', { name: s.name('aeris') });
    const t = third(s);
    if (t) s.spawn(t, t, 14, 8, 'right', { name: s.name(t) });
    s.spawn('seph', 'sephiroth', 20, 2, 'down', { name: 'Sephiroth' });
    yield s.face('player', 'seph');
    yield s.cam(18, 4, 40);
    yield s.say('sephiroth', "So... you've come all this way.");
    yield s.say('cloud', "Sephiroth! What are you after?!");
    yield s.say('sephiroth', "Look around you. These walls hold what the Ancients knew. Their wisdom... their knowledge. And now, it is mine.");
    yield s.say('sephiroth', "Tell me. When the Planet is wounded, what does it do?\fIt gathers spirit energy to heal the wound. The deeper the wound... the more energy gathers there.");
    yield s.say('sephiroth', "Now imagine a wound so deep it threatens the Planet's very life. All of its energy, rushing to one place...\fAnd standing at the heart of that wound... me.");
    yield s.say('sephiroth', "I will take all of it into myself. I will become one with the Planet. A new being... a god, reborn.");
    yield s.say('aeris', "That's insane! The Planet would die!");
    yield s.say('cloud', "And how do you plan to wound the Planet?");
    yield s.move('seph', 17, 2);
    yield s.face('seph', 'up');
    yield s.say('sephiroth', "Look at this mural. The ultimate destructive magic...... Meteor.");
    yield s.say('aeris', "Meteor...!");
    yield s.face('seph', 'player');
    yield s.move('seph', 17, 4);
    yield s.say('sephiroth', "...Cloud. Wake up.");
    s.flash('#ffffff', 20, 0.8); s.shake(4, 40); s.sfx('heartbeat');
    s.anim('player', 'hurt');
    yield s.say('cloud', "Ugh...! Aaah...! My head......!");
    s.flash('#ffffff', 20, 0.8);
    s.remove('seph');
    yield s.say('cloud', "(Stay... stay out of my head......!)", { pos: 'top' });
    s.anim('player', 'kneel');
    yield 40;
    yield s.say('aeris', "Cloud! Cloud, are you okay?!");
    s.stopAnim('player');
    yield s.say('cloud', "......I'm... fine. He's gone.\fWe have to stop him before he gets his hands on that... Meteor.");
    yield s.say('aeris', "To call Meteor, he'd need the Black Materia. That's what all of this is about.\fIt must be here somewhere... deeper inside the Temple.");
    s.camFollow(40);
    s.remove('aeris'); if (t) s.remove(t);
    s.music('temple');
  }
  function* redDragon(s) {
    s.set('c8_red_dragon_seen');
    s.music('none');
    s.shake(5, 60); s.sfx('falling');
    yield s.say('cloud', "......! Something's coming down from above!");
    s.flash('#ff4020', 16, 0.6);
    yield s.msg('With a roar, a huge red dragon drops from the shadows of the ceiling!');
    yield s.battle({ table: 'boss_red_dragon', bg: 'temple', music: 'boss', noEscape: true });
    s.set('c8_red_dragon');
    yield s.msg("The Red Dragon's body crumbles away into dust... Where it fell, a red materia glows.");
    yield s.giveMateria('bahamut');
    s.music('temple');
  }
  function* modelScene(s) {
    if (s.flag('c8_model_seen')) { yield s.msg('The model of the Temple. The plaque on its base reads: "Black Materia".'); return; }
    if (!s.flag('c8_red_dragon')) { yield s.msg('A small model of the Temple of the Ancients stands on a pedestal. Something about it feels... alive.'); return; }
    yield s.msg('A small model of the Temple of the Ancients stands on a pedestal.\nA plaque on its base reads: "Black Materia".');
    s.spawn('aeris', 'aeris', 30, 6, 'up', { name: s.name('aeris') });
    const t = third(s);
    if (t) s.spawn(t, t, 32, 6, 'up', { name: s.name(t) });
    yield s.say('aeris', "Black Materia...? But this is just a model of the... Wait. Cloud, try touching it.");
    yield s.msg(`${s.name('cloud')} lays a hand on the model...`);
    s.shake(5, 60); s.sfx('gate');
    yield s.say('cloud', "......! The whole room is shaking!");
    yield s.say('aeris', "I knew it. The model... is the Temple. And the Temple itself is the Black Materia!");
    yield s.say('aeris', "All the puzzles in here are the mechanism. If someone solves them from the inside, the Temple folds up on itself... smaller and smaller... until it becomes the Black Materia.");
    yield s.say('cloud', "...And whoever's inside when that happens?");
    yield s.say('aeris', "......They'd be crushed.");
    if (t === 'tifa') yield s.say('tifa', "Then... we can't do it. We can't ask anyone to...");
    else if (t === 'barret') yield s.say('barret', "Damn it...! There's gotta be another way!");
    else if (t === 'cid') yield s.say('cid', "Tch. So somebody's gotta play the hero and get squashed. Great.");
    else if (t === 'redxiii') yield s.say('redxiii', "Then one of us would have to give their life for it.");
    else if (t === 'yuffie') yield s.say('yuffie', "N-no way! Nobody's volunteering, right? Right?!");
    else if (t === 'vincent') yield s.say('vincent', "......A sacrifice. As always.");
    if (!s.inParty('caitsith')) {
      s.spawn('caitsith', 'caitsith', 28, 9, 'up', { name: s.name('caitsith') });
      yield s.say('caitsith', "Well now! Sounds like a job for me!");
      yield s.move('caitsith', 30, 7);
      yield s.say('caitsith', "Sorry, sorry, I've been listenin' in on the PHS. Couldn't stay put back there.");
    } else {
      s.spawn('caitsith', 'caitsith', 32, 7, 'up', { name: s.name('caitsith') });
      yield s.say('caitsith', "Well now! Sounds like a job for me!");
    }
    s.music('caitsith');
    yield s.face('caitsith', 'player');
    yield s.say('caitsith', "Don't you see? I'm the perfect fella for it! This body's only a toy. Squash it flat, and there's plenty more where it came from.");
    yield s.say('cloud', "......You're a Shinra spy. How do we know you won't hand the Black Materia straight to them?");
    yield s.say('caitsith', "Ah, you've got me there. ...But think it through. The Temple shrinks, and I'm flattened inside it.\fYou lot wait outside, and when it's done, you go down and pick the Black Materia up yourselves. Nobody from Shinra anywhere near it.");
    yield s.say('caitsith', "Shinra, Sephiroth... Whatever else I am, I don't want either of 'em holdin' the power to call down Meteor. Believe that much, at least.");
    yield s.say('aeris', "Cait Sith...");
    yield s.say('caitsith', "Right! Before I go, one last fortune, eh? For old times' sake. Free of charge!");
    s.anim('caitsith', 'cast');
    yield 50;
    yield s.msg('Cait Sith dances around... A strip of paper pops out!');
    yield s.say('caitsith', "Let's see now...... Oh. Ohh, now this one's...\f......Ah, nah. I'll keep this one to myself. You'll see what it means, soon enough.");
    yield s.say('caitsith', "Now go on, off with ya! Head out through the clock, and wait for my call on the PHS.\fAnd don't forget me, now! ...Well. This me, anyway.");
    s.set('c8_model_seen');
    s.remove('caitsith'); s.remove('aeris'); if (t) s.remove(t);
    if (s.inParty('caitsith')) {
      s.bench('caitsith');
      yield s.say('cloud', "(Cait Sith is staying behind... Who else comes with us?)");
      yield s.choosePArty(['cloud', 'aeris'], { exclude: ['caitsith'] });
    }
    s.music('temple');
    s.show('ancient');
  }
  const mural = (text) => function* (s) { yield s.msg(text); };
  FF7.defineMap('temple_mural', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    battle: { table: 'temple_ancients_mural', bg: 'temple', rate: 0.6, if: s => !s.flag('c8_red_dragon') },
    grid: [
      "####################################",
      "####################################",
      "#:::::::::::::::::::::::::::U_____U#",
      "#:~~~~~:::::::::::::::::::::_______#",
      "#:~~~~~:::::|:::::|:::::|:::___u___#",
      "#:~~~~~:::::::::::::::::::::_______#",
      "#:~~~~~:::::::::::::::::::::_______#",
      "#:::::::::::::::::::::::::::_______#",
      "#:::::::::::|:::::|:::::|:::_______#",
      "#:::::::::::::::::::::::::::_______#",
      "#:::::::::::::::::::::::::::U_____U#",
      "####++##############################",
    ],
    lights: [[4, 4, '#a060ff', 3], [17, 1, '#ffd080', 3], [31, 4, '#8060c0', 3]],
    entries: { from_gate: [4, 10, 'up'] },
    exits: [{ at: [4, 11, 2, 1], to: 'temple_gate_room', entry: 'from_mural', sfx: 'door' }],
    npcs: [{ id: 'ancient', name: 'Ancient', model: ANCIENT, at: [9, 9], dir: 'up', show: s => s.flag('c8_model_seen'), talk: talkAncient }],
    objects: [
      { at: [5, 1], talk: mural('A mural of people with long hair, crossing a wide land on foot. The Cetra, journeying from place to place across the Planet.') },
      { at: [11, 1], talk: mural('A mural of a great tree of light rising from the ground, and people kneeling before it... the Planet giving life.') },
      { at: [17, 1], talk: mural('A vast mural: a giant burning star falling from the heavens toward the Planet, and people fleeing beneath it.\n...Meteor.') },
      { at: [23, 1], talk: mural('A mural of a great wound torn in the land, and streams of light flowing into it from every direction.') },
      { at: [29, 1], talk: mural('A mural of a single robed figure standing alone, praying, as the falling star draws near.') },
    ],
    triggers: [
      { id: 'seph', at: [15, 2, 3, 9], once: true, run: sephirothMural },
      { id: 'dragon', at: [26, 2, 2, 9], once: true, if: s => s.flag('c8_sephiroth_mural'), run: redDragon },
      { at: [31, 4, 1, 1], on: 'talk', run: modelScene },
    ],
    onEnter: function* (s) {
      if (s.flag('c8_pool_vision')) return;
      yield* poolVision(s);
    },
  });

  // ================================================================== doorway XII: Demons Gate, and the Temple shrinks
  FF7.defineMap('temple_exit', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'temple', music: 'temple', look: TLOOK,
    grid: [
      "##################",
      "########++########",
      "###............###",
      "###.|........|.###",
      "###............###",
      "###............###",
      "###............###",
      "###.|........|.###",
      "###............###",
      "###............###",
      "###............###",
      "###.|........|.###",
      "###............###",
      "###............###",
      "###............###",
      "###.|........|.###",
      "###............###",
      "###............###",
      "###............###",
      "########++########",
    ],
    lights: [[8, 1, '#ffe0a0', 3]],
    entries: { from_clock: [8, 18, 'up'] },
    exits: [
      { at: [8, 19, 2, 1], run: function* (s) { yield s.say('cloud', "(No going back. Cait Sith is counting on us.)"); } },
      { at: [8, 1, 2, 1], run: function* (s) {
          if (!s.flag('c8_demons_gate')) return;
          yield s.fadeOut(30);
          yield s.goto('temple_exterior', 'after_gate');
          yield* templeShrinks(s);
        } },
    ],
    triggers: [{ id: 'demons_gate', at: [3, 5, 12, 2], once: true, run: function* (s) {
      s.music('none');
      yield s.say('cloud', "The exit's right there...");
      s.shake(6, 80); s.sfx('gate');
      yield s.msg('The great carved doors at the end of the corridor shudder... The stone faces on them twist and snarl...\nThe doors themselves are coming to life!');
      yield s.battle({ table: 'boss_demons_gate', bg: 'temple', music: 'boss', noEscape: true });
      s.set('c8_demons_gate');
      yield s.msg('The living doors crumble into rubble. The way out is clear!');
      s.music('temple');
    } }],
  });

  function* templeShrinks(s) {
    s.music('none');
    s.spawn('aeris', 'aeris', 16, 8, 'down', { name: s.name('aeris') });
    const t = third(s);
    if (t) s.spawn(t, t, 18, 8, 'down', { name: s.name(t) });
    yield s.fadeIn(30);
    s.sfx('phs');
    yield 40;
    s.music('caitsith');
    yield s.say('caitsith', "Hello? Hello? ...Everybody out? Good, good!\fRight then, I'll get to work. Hm... So this bit goes here... and that bit turns there... Oh, this is rather fun, actually!", { pos: 'top' });
    yield s.say('caitsith', "......Ah. There it goes.\f...Cloud. Everyone. Look after each other, eh? And don't let Sephiroth get his hands on it.\f...It's been fun travelin' with you. Honest.", { pos: 'top' });
    s.shake(6, 120);
    yield s.say('aeris', "Cait Sith...!");
    s.stopMusic(60);
    yield s.fadeOut(40);
    yield s.movie('temple_shrink', { text: 'The Temple of the Ancients folds in on itself.\nStone by stone, wall by wall, it shrinks, smaller and smaller,\nuntil nothing is left but a deep crater in the jungle...\nand at its very bottom, a small black orb.' });
    s.remove('aeris'); if (t) s.remove(t);
    yield s.goto('temple_crater', 'rim');
    yield* blackMateria(s, t);
  }

  // ------------------------------------------------------------------ the crater: Sephiroth takes the Black Materia
  function* blackMateria(s, t) {
    s.set('c8_temple_done');
    { const L = FF7.state.locked, i = L.indexOf('aeris'); if (i >= 0) L.splice(i, 1); }   // (held in the party since the Gold Saucer morning)
    s.music('none');
    s.spawn('aeris', 'aeris', 14, 13, 'up', { name: s.name('aeris') });
    if (t && t !== 'caitsith') s.spawn(t, t, 16, 14, 'up', { name: s.name(t) });
    s.place('player', 13, 13, 'up');
    yield s.fadeIn(40);
    yield s.say('aeris', "It's gone... The whole Temple... And Cait Sith with it.");
    yield s.say('cloud', "......Down there. That's the Black Materia.");
    if (t && t !== 'caitsith') yield s.say(t, t === 'barret' ? "Go on. I'll keep watch up here." : t === 'tifa' ? "Go ahead, Cloud. I'll keep watch up here." : "Go on. We'll keep watch up here.");
    yield [s.move('player', [[13, 12], [13, 8], [14, 5]]), s.move('aeris', [[14, 12], [14, 8], [15, 6]])];
    yield s.msg(`${s.name('cloud')} picks up the Black Materia.`);
    yield s.give('black_materia');
    yield s.face('aeris', 'player');
    yield s.say('aeris', "So that's it... the Black Materia. The thing Cait Sith... gave himself up for.");
    yield s.say('cloud', "On its own it's harmless, right? To call Meteor with it, you'd need incredible power...");
    s.music('chosen_nointro');
    s.spawn('seph', 'sephiroth', 14, 2, 'down', { name: 'Sephiroth' });
    s.flash('#ffffff', 16, 0.5);
    yield s.say('sephiroth', "Well done, Cloud. You've done your job admirably.");
    yield s.face('player', 'seph');
    yield s.say('cloud', "Sephiroth! You'll never get your hands on this!");
    yield s.say('sephiroth', "Still, you don't understand. I have journeyed through the Lifestream. I have gathered knowledge beyond your imagining.\fThe power to use it... is already mine.");
    yield s.say('sephiroth', "Now. Give me the Black Materia.");
    s.flash('#ffffff', 20, 0.8); s.shake(4, 60); s.sfx('heartbeat');
    s.anim('player', 'hurt');
    yield s.say('cloud', "Ugh......! Aaagh...!\f(My body... it's moving... on its own......!)", { pos: 'top' });
    s.stopAnim('player');
    yield s.move('player', 14, 3, { speed: 0.012 });
    s.anim('player', 'item');
    yield 40;
    s.take('black_materia');
    yield s.msg(`${s.name('cloud')} handed the Black Materia to Sephiroth.`);
    s.stopAnim('player');
    yield s.say('sephiroth', "Good. Very good... Now... wake up.");
    s.flash('#ffffff', 20, 0.8);
    s.remove('seph');
    s.music('none');
    s.anim('player', 'kneel');
    yield 40;
    yield s.say('aeris', "Cloud! Cloud, snap out of it!");
    yield s.move('aeris', 15, 4);
    s.stopAnim('player');
    yield s.face('player', 'aeris');
    yield s.say('aeris', "Cloud......?");
    s.anim('player', 'punch'); s.sfx('hit'); s.flash('#ff2020', 10, 0.5);
    s.anim('aeris', 'hurt');
    yield 20;
    s.anim('aeris', 'kneel');
    yield s.say('cloud', "......!!");
    s.anim('player', 'slash');
    yield 10;
    const tifaId = t === 'tifa' ? 'tifa' : 'tifa_ev';
    if (tifaId === 'tifa_ev') s.spawn('tifa_ev', 'tifa', 13, 12, 'up', { name: s.name('tifa') });
    yield s.say('tifa', "CLOUD!!!");
    s.stopAnim('player');
    s.anim('player', 'dead');
    yield 60;
    s.spawn('cait2', 'caitsith', 15, 12, 'up', { name: s.name('caitsith') });
    yield s.say('caitsith', "Oh dear, oh dear! Cait Sith No. 2, reportin' for duty! ...And I've arrived at the worst possible moment, haven't I.");
    yield s.fadeOut(80);
    s.remove('tifa_ev'); s.remove('cait2'); s.remove('aeris'); if (t) s.remove(t);
    s.stopAnim('player');
    yield s.goto('forest_dream', 'dream');
    yield* cloudsDream(s);
  }
  FF7.defineMap('temple_crater', {
    name: 'Temple of the Ancients', area: 'Temple of the Ancients', theme: 'jungle', music: null,
    look: { floor2: ['#5a5040', '#524838'], sky: ['#0a1408', '#304828'] },
    camera: { dist: 11, pitch: 52 },
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTRRRRRRRRRRRRRRRRRRRRTTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTR::::::::::::::::::::RTTTT",
      "TTTTRRRRRRRRR^^RRRRRRRRRRTTTTT",
      "TTTTTTTTTTTTR^^RTTTTTTTTTTTTTT",
      "TT,,,,,,,,,,R^^R,,,,,,,,,,,,TT",
      "T,,,,,,,,,,,R^^R,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
      "T,,,G,,,,,,,,,,,,,,,,,,,,G,,,T",
      "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
      "TT,,,,,,,,,,,,,,,,,,,,,,,,,,TT",
      "TTTTTTTTTTTTT,,,,TTTTTTTTTTTTT",
    ],
    heights: [
      "666666666666666666666666666666",
      "666660000000000000000000066666",
      "666600000000000000000000006666",
      "666600000000000000000000006666",
      "666600000000000000000000006666",
      "666600000000000000000000006666",
      "666600000000000000000000006666",
      "666600000000000000000000006666",
      "666666666666612666666666666666",
      "666666666666624666666666666666",
      "666666666666645666666666666666",
      "666666666666656666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
    ],
    lights: [[14, 4, '#402060', 3]],
    entries: { rim: [13, 13, 'up'] },
  });

  // ================================================================== Cloud's dream
  function* cloudsDream(s) {
    s.music('aeris');
    s.spawn('aeris', 'aeris', 11, 3, 'down', { name: s.name('aeris') });
    yield s.fadeIn(60);
    yield s.say('aeris', "Cloud... Can you hear me?");
    yield s.say('cloud', "Aeris...? Aeris, I... I hit you. I'm sorry... I don't know what came over me. My body just...");
    yield s.say('aeris', "It's okay. Don't worry about it. Really.");
    yield s.say('aeris', "...I'm going to go take care of Sephiroth. It's something only a Cetra can do. Only I can do it.");
    yield s.say('aeris', "The answer I'm looking for... I think I'll find it up north. In the Forgotten Capital.\fI'll come back when it's all over. Okay?");
    yield s.move('player', 11, 6);
    yield s.say('cloud', "Aeris, wait! Don't go alone!");
    yield s.face('aeris', 'up');
    yield s.move('aeris', 11, 1, { speed: 0.012 });
    s.remove('aeris');
    yield 40;
    s.music('none');
    s.spawn('seph', 'sephiroth', 11, 2, 'down', { name: 'Sephiroth' });
    s.flash('#ffffff', 16, 0.4);
    yield s.say('sephiroth', "......Yes. Soon it will be too late. That girl will stand in our way.\fWe must stop her, Cloud. Before she reaches the Capital.");
    yield s.say('cloud', "...Stop... her......?");
    s.remove('seph');
    yield s.say('cloud', "AERIS!!!");
    yield s.fadeOut(80, '#ffffff');
    yield s.goto('gongaga_inn', 'wake');
    yield* wakeInGongaga(s);
  }
  FF7.defineMap('forest_dream', {
    name: 'Sleeping Forest', area: 'Dream', theme: 'forest', music: null,
    look: { ambient: [0.5, 0.55, 0.6], light: [0.8, 0.85, 0.9], sky: ['#8ab8d0', '#e0f0f8'], fog: { color: [0.8, 0.9, 0.95], near: 6, far: 18 } },
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTT,,,,TTTTTTTTTT",
      "TTTTTTTT%,,,,,,%TTTTTTTT",
      "TTTTTTT,,,,ff,,,,TTTTTTT",
      "TTTTTT,,,,,,,,,,,,TTTTTT",
      "TTTTT,,,G,,,,,,G,,,TTTTT",
      "TTTT,,,,,,,ff,,,,,,,TTTT",
      "TTTT,,,,,,,,,,,,,,,,TTTT",
      "TTTTT,,,,,,,,,,,,,,TTTTT",
      "TTTTTT,,,,,,,,,,,,TTTTTT",
      "TTTTTTT,,,,,,,,,,TTTTTTT",
      "TTTTTTTTT,,,,,,TTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    entries: { dream: [11, 9, 'up'] },
  });

  // ================================================================== waking up in Gongaga
  const BRONCO_BEACH = { x: 136, y: 242 };   // the beach south of Gongaga
  function* toTheBronco(s) {
    s.set('c8_bronco_boarded');
    if (FF7.state && FF7.state.world && FF7.state.world.vehicles) FF7.state.world.vehicles.bronco = { x: BRONCO_BEACH.x, y: BRONCO_BEACH.y };
    yield s.world({ x: BRONCO_BEACH.x, y: BRONCO_BEACH.y, vehicle: 'bronco' });
  }
  function* wakeInGongaga(s) {
    // FF7: when Aeris leaves after the Temple her materia and accessory return to the party's stock;
    // only her weapon and armour go with her
    { const c = FF7.state.chars.aeris;
      if (c) { [c.weaponMateria, c.armorMateria].forEach(arr => (arr || []).forEach((m, i) => { if (m) { FF7.sys.materia.toStock(m); arr[i] = null; } }));
        if (c.accessory) { FF7.sys.inv.add(c.accessory, 1); c.accessory = null; } FF7.sys.stats.recalc(c); } }
    s.leave('aeris');
    s.music('none');
    s.anim('player', 'lie');
    const all = members(s);
    const crew = spawnCrew(s, all, [[4, 3, 'left'], [3, 4, 'up'], [6, 2, 'left'], [5, 4, 'up'], [7, 3, 'left'], [6, 5, 'up'], [8, 2, 'left']]);
    const has = id => crew.includes(id);
    yield s.fadeIn(60);
    yield 40;
    s.stopAnim('player');
    yield s.emote('player', '...');
    yield s.say('tifa', "Cloud! You're awake... Thank goodness. You were out cold for a whole day.");
    yield s.say('barret', "Damn it, you scared the hell outta us!");
    yield s.say('cloud', "......Where... is this?");
    yield s.say('tifa', "Gongaga. The inn. We carried you here after... after what happened at the Temple.");
    yield s.say('cloud', "...Where's Aeris?");
    yield s.say('tifa', "......She's gone. When we got here, she wasn't with us anymore.");
    yield s.say('cloud', "......I know. She went to the Forgotten Capital. I saw her... in a dream.");
    if (has('redxiii')) yield s.say('redxiii', "The Forgotten Capital... the city of the Cetra. Grandfather said it lies far to the north, on the other side of the Sleeping Forest.");
    yield s.say('cloud', "......I gave Sephiroth the Black Materia. And then... I hit Aeris. With these hands.");
    yield s.say('cloud', "I can't go on. What if he takes control of me again? What if next time it's worse? I could...\f......Forget about me. Just go.");
    yield s.say('barret', "Oh, quit your whinin'! You think you're the only one who's ever screwed up?!\fIf you're scared of what you'll do, then get out there and set it right! That's how it works!");
    yield s.say('tifa', "Cloud... Aeris is out there on her own. And Sephiroth is going after her, isn't he?\fIf we don't go to her... who will?");
    if (has('cid')) yield s.say('cid', "Look, kid. Nobody's gonna hold your hand. Get up, and let's go get her.");
    if (has('caitsith')) yield s.say('caitsith', "Cait Sith No. 2 here, all present an' correct! And I say we go after her, too!");
    yield s.say('cloud', "......Alright. I'll go. We'll find Aeris... and bring her back.");
    if (has('cid')) yield s.say('cid', "Now you're talkin'. The Tiny Bronco's parked on the beach, south of the village. North to the Forgotten Capital it is!");
    else yield s.say('barret', "Now you're talkin'! The Tiny Bronco's parked on the beach, south of the village. Let's head north!");
    s.set('c8_woke');
    yield s.fadeOut(30);
    clearCrew(s, crew);
    yield s.fadeIn(30);
    yield s.say('cloud', "(Who should come with me?)");
    yield s.choosePArty(['cloud']);
    s.music('parochial');
    const c = yield s.ask(null, 'Head straight for the Tiny Bronco?', ['To the Tiny Bronco', 'Look around Gongaga first']);
    if (c === 0) yield* toTheBronco(s);
  }
  // Until the party sets out, someone waits by the village's south path to lead them to the Bronco.
  FF7.patchMap('gongaga_village', {
    npcs: [{ id: 'c8_bronco_guide', name: 'Tifa', model: 'tifa', at: [18, 19], dir: 'up', show: s => s.flag('c8_woke') && !s.flag('c8_bronco_boarded'),
      talk: function* (s) {
        const c = yield s.ask('tifa', "The Tiny Bronco's on the beach just south of here. Ready to go after Aeris?", ['Let\'s go', 'Not yet']);
        if (c === 0) yield* toTheBronco(s);
      } }],
  });
})();

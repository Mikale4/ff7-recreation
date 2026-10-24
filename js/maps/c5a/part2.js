// Chapter 5a (part 2) — Cloud's story, five years ago: the Shinra truck (Dragon), Nibelheim as Cloud
// remembers it (the inn, his mother, Tifa's house and piano, the water tower), the morning with
// Tifa as mountain guide and the photograph, and Nibelheim burning.
// Party during the whole flashback: s.party(['cloud','sephiroth']) (set in part1, restored in part1).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c5a_fb_truck, c5a_fb_arrived, c5a_fb_mom, c5a_fb_piano, c5a_piano_jammed (Tifa's piano,
// read on Disc 2+ in present-day Nibelheim), c5a_piano_tune (played the full tune), c5a_fb_night,
// c5a_fb_morning, c5a_fb_reactor / c5a_fb_days (part3 + here), c5a_fb_fire, c5a_fb_fire_seen.
(function () {
  const MOM = { base: 'woman', hair: '#c89a50', hairStyle: 'bun', top: '#7a8a5a', sleeve: '#7a8a5a', bottom: '#5a4a3a', skirt: 'long', extras: ['apron'] };
  const TIFA_YOUNG = { base: 'tifa', top: '#f0ece0', sleeve: 'skin', bottom: '#8a5a30', skirt: 'short', boots: '#6a4020', extras: ['vest'] };
  const TIFA_DAD = { base: 'man', hair: '#3a2a1a', hairStyle: 'short', top: '#5a4a6a', sleeve: '#5a4a6a', bottom: '#3a3a40', extras: ['mustache'] };
  const PHOTOGRAPHER = { base: 'man', hair: '#403020', hairStyle: 'cap', top: '#7a6a4a', sleeve: '#7a6a4a', bottom: '#4a4038', extras: ['glasses'] };

  const phaseA = (s) => !s.flag('c5a_fb_reactor');            // before the reactor
  const phaseB = (s) => s.flag('c5a_fb_reactor');             // Sephiroth in the mansion

  // ------------------------------------------------------------------ the Shinra truck
  FF7.defineMap('fb_truck', {
    // The covered bed of a Shinra army truck, seen from the tailgate toward the cab (as in FF7): wooden
    // bench boxes along both sides, rusty frame posts, a window through to the driver, cargo up front.
    name: 'Shinra Truck', area: 'Five Years Ago', theme: 'station', music: 'fiveyears',
    look: { wall: '#3e3a2c', trim: '#2a2418', wallTex: 'panel', floor: ['#6a5638', '#645034'], floorTex: { floor: 'planks' }, wallH: 2.0,
      seat: '#6a4a2c', seatBase: '#4a3220', brass: '#7a4a2e', seatRails: 'posts', window: '#50606e',
      sky: ['#000000', '#000000'], indoor: true, fog: null },
    camera: { yaw: 0, pitch: 30, dist: 5.6 },
    legend: { '[': 'trainseat_w', ']': 'trainseat_e' },
    lights: [[2, 2, '#ffc890', 2.6], [3, 5, '#ffb070', 2.4]],
    grid: [
      "##ww##",
      "#[.B]#",
      "#[..]#",
      "#[..]#",
      "#[..]#",
      "#[..]#",
      "#....#",
      "######",
    ],
    entries: { start: [2, 5, 'up'] },
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [4, 3], dir: 'left', anim: 'sit', hover: 0.14,
        talk: function* (s) {
          if (s.flag('c5a_fb_truck')) return;
          yield* FF7.story.c5a_truckBriefing(s);
        } },
      { id: 'trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [1, 3], dir: 'right', anim: 'sit', hover: 0.14,
        talk: function* (s) {
          yield s.emote('trooper', '...');
          yield s.say('Shinra Trooper', "......Urgh.");
          yield s.say('cloud', "(Still sick, huh. He hasn't taken that helmet off once.)");
        } },
      { id: 'trooper2', name: 'Shinra Trooper', model: 'soldier', at: [2, 1], dir: 'down',
        talk: function* (s) { yield s.say('Shinra Trooper', "Nibelheim, sir? Never heard of it. Hope they've got a decent inn, at least."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5a_fb_truck')) return;
      s.shake(1, 90);
      yield s.wait(40);
      yield s.emote('trooper', '...');
      yield s.say('Shinra Trooper', "Urrgh......");
      yield s.face('player', 'trooper');
      yield s.say('cloud', "Hey. You all right?");
      yield s.say('Shinra Trooper', "...Motion sickness, sir. I'm fine.");
      yield s.say('cloud', "Take that helmet off. You'll feel better.");
      yield s.say('Shinra Trooper', "......No. I'm fine.");
      yield s.say('cloud', "Heh. Never had a problem with motion sickness myself.");
      yield s.face('player', 'right');
    },
  });

  FF7.story.c5a_truckBriefing = function* (s) {
    yield s.say('cloud', "Sephiroth... The war with Wutai ended right after I made First Class. I never got my shot at being a hero.");
    yield s.say('sephiroth', "A hero? Is that what you wanted?");
    yield s.say('cloud', "I wanted to be like you. That's the whole reason I joined SOLDIER.");
    yield s.say('sephiroth', "......Hmph.");
    yield s.say('sephiroth', "Then this job should keep you busy. The Mako reactor outside Nibelheim has been malfunctioning, and the monsters around it are out of control.\fWe find the cause, and we eliminate it.");
    yield s.say('sephiroth', "...Nibelheim. That's your hometown, isn't it?");
    yield s.say('cloud', "Yeah. I haven't been back in years.");
    // the Dragon hits the truck
    s.sfx('howl');
    s.shake(6, 50);
    yield s.wait(30);
    yield s.emote('trooper2', '!!');
    yield s.say('Shinra Trooper', "M-monster!! Something's on the road!");
    yield s.face('sephiroth', 'player');
    yield s.say('sephiroth', "Stay sharp.");
    yield s.battle({ table: 'event_flashback_dragon', bg: 'mtnibel', music: 'chosen', noEscape: true });
    s.music('fiveyears');
    yield s.say('cloud', "(Sephiroth... He wasn't even trying. That was the strength of a real hero.)");
    s.set('c5a_fb_truck');
    yield s.fadeOut(40);
    yield s.caption('Nibelheim', { hold: 120, bg: '#000' });
    yield s.goto('fb_nibel', 'from_truck');
  };

  // ------------------------------------------------------------------ Nibelheim (five years ago)
  // ONE layout for every Nibelheim map: fb_nibel / fb_nibel_fire here and nibel_town (c7), which
  // reads FF7.story.nibelheim, because Shinra rebuilt the town stone for stone.
  //   north edge: mansion road [2-4,0] | general store (door [8,3]) | stone steps up Mt. Nibel
  //   [14-16,0] | Cloud's house (door [22,3]) | Tifa's house (door [30,3]);
  //   west: the inn (door [4,12], sign); centre: the wooden water tower (the 2x2 block prop 'Q', trestle,
  //   tub and ladder) [17-18,9-10]; south: the house by the inn (door [5,19]) and the paved entrance
  //   road between picket fences [15-19,15-23] under the arch lamps, the rusted Shinra truck wreck
  //   (the block prop '$', a real truck model) east of it.
  //   The square is sandy dirt (s), the streets dirt (d); green pipes (P) and pots (j) by the houses.
  const NIBEL = [
    "RR:::hhhhhhhRR:::RRhhhhhhhRhhhhhhhRR",
    "RR:::hhhhhhhRR^^^RRhhhhhhhRhhhhhhhRR",
    "RR:::hhhhhhhRR^^^RRhhhhhhhRhhhhhhhRR",
    "RR:::hwh+hwhRR^^^RRhwh+hwhRhwh+hwhRR",
    "RRdddddddd!ddddddddddddddddddddddRRR",
    "RRddddddssssssssssssssssssssssssshhh",
    "hhhhhhhhslsssssssssssssssssssslsshhh",
    "hhhhhhhhssssssssssssssssssssssssshhh",
    "hhhhhhhhsssssssssssssssssssssssjshhh",
    "hhhhhhhhsssssssssQQssssssssssssjshwh",
    "hhhhhhhhsssssssssQQsssssssssssssjjPR",
    "hhhhhhhhssssssssssssssssssssssssjPPR",
    "hwhw+whhssssssssssssssssssssssssssjR",
    "jjsss!ssssssssssssssssssssssssssssPR",
    "RddddddddddddddddddddddddddddddddddR",
    "Rshhhhhhhhssssl:::::l!ssssssssssRRRR",
    "Rshhhhhhhhsjjs=:::::=sssssssssPPsRRR",
    "RshhhhhhhhsPjs=:::::=sx$$ossssssssRR",
    "Rshhhhhhhhssss=:::::=ss$$osssssssRRR",
    "Rshwh+hwhhssss=:::::=sx$$ssjjssssRRR",
    "Rssssssssssjos=:::::=ss$$xssssssRRRR",
    "RssssssssssPPs=:::::=ss$$sssssssRRRR",
    "RsssssssssssssR:::::RssssssssssRRRRR",
    "RRRRRRRRRRRRRRR:::::RRRRRRRRRRRRRRRR",
  ];
  const NIBEL_HEIGHTS = [
    "660000000000666666600000006000000066",
    "660000000000665556600000006000000066",
    "660000000000443334400000006000000066",
    "660000000000221112200000006000000066",
    "440000000000000000000000000000000444",
    "220000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000000",
    "000000000000000000000000000000000003",
    "000000000000000000000000000000000003",
    "000000000000000000000000000000000003",
    "000000000000000000000000000000000003",
    "300000000000000000000000000000000003",
    "300000000000000000000000000000003333",
    "300000000000000000000000000000000333",
    "300000000000000000000000000000000033",
    "300000000000000000000000000000000333",
    "300000000000000000000000000000000333",
    "300000000000000000000000000000003333",
    "300000000000000000000000000000003333",
    "200000000000002000002000000000022222",
    "222222222222222000002222222222222222",
  ];
  const NIBEL_LOOK = {
    sand: ['#a8946a', '#a08c62'], dirt: ['#7c664a', '#746044'], floor2: ['#8a8474', '#827c6c'],
    floor3: ['#cfc6aa', '#c8bea2'], wall: '#665646', wallTop: '#5a3a32', roof: '#5e3c32', trim: '#33261a',
    metal: ['#5a7a5c', '#526f54'], water: '#3a5a5c',
  };
  const NIBEL_CAM = { pitch: 56, dist: 11 };
  const NIBEL_ENTRIES = {
    from_truck: [17, 22, 'up'], from_inn: [4, 13, 'down'], morning: [4, 13, 'down'],
    from_tifa: [30, 4, 'down'], from_cloud: [22, 4, 'down'], from_mansion: [3, 1, 'down'],
    from_mountain: [15, 1, 'down'],
  };
  // steep gable roofs over the half-timbered houses (02-flashblack04); walls and windows share one eave
  const NIBEL_BUILDINGS = [
    { at: [5, 0, 7, 4], top: 'gable', ridge: 'x', rise: 1.2 }, { at: [19, 0, 7, 4], top: 'gable', ridge: 'x', rise: 1.2 },
    { at: [27, 0, 7, 4], top: 'gable', ridge: 'x', rise: 1.2 }, { at: [0, 6, 8, 7], top: 'gable', ridge: 'z', rise: 1.3, chimney: true },
    { at: [2, 15, 8, 5], top: 'gable', ridge: 'x', rise: 1.1 }, { at: [33, 5, 3, 8], top: 'gable', ridge: 'z', rise: 0.8 },
  ];
  FF7.story.nibelheim = { grid: NIBEL, heights: NIBEL_HEIGHTS, look: NIBEL_LOOK, camera: NIBEL_CAM, buildings: NIBEL_BUILDINGS };
  const TOWER = [[17, 9], [18, 9], [17, 10], [18, 10]];
  const waterTower = function* (s) {
    yield s.msg("The legs of Nibelheim's old wooden water tower. A ladder climbs up into the dark.");
    yield s.say('cloud', "(...Tifa and I sat up there one night, a long time ago, under all those stars.\fI made her a promise...)");
  };

  FF7.defineMap('fb_nibel', {
    name: 'Nibelheim', area: 'Five Years Ago', theme: 'nibelheim', music: 'fiveyears',
    look: NIBEL_LOOK, camera: NIBEL_CAM,
    grid: NIBEL, heights: NIBEL_HEIGHTS, buildings: NIBEL_BUILDINGS,
    entries: NIBEL_ENTRIES,
    exits: [
      { at: [14, 0, 3, 1], to: 'fb_mt_path', entry: 'from_town', if: s => s.flag('c5a_fb_morning') && !s.flag('c5a_fb_reactor'),
        blocked: function* (s) {
          if (s.flag('c5a_fb_reactor')) yield s.say('cloud', "(Not now. Sephiroth's still shut up in the mansion.)");
          else yield s.say('cloud', "(Mt. Nibel... We'll need a guide to get up there. We head out in the morning.)");
        } },
      { at: [2, 0, 3, 1], to: 'fb_mansion', entry: 'from_town', if: s => s.flag('c5a_fb_reactor'),
        blocked: function* (s) {
          yield s.say('cloud', "(The Shinra Mansion. Nobody's lived there for years. Kids used to dare each other to touch the gate.)");
        } },
      { at: [30, 3, 1, 1], to: 'fb_tifa_house', entry: 'from_town', sfx: 'door' },
      { at: [22, 3, 1, 1], to: 'fb_cloud_house', entry: 'from_town', sfx: 'door' },
      { at: [4, 12, 1, 1], to: 'fb_inn', entry: 'from_town', sfx: 'door' },
      { at: [15, 23, 5, 1], run: function* (s) {
          yield s.say('cloud', "(We've got a mission. No turning back now.)");
        } },
    ],
    npcs: [
      { id: 'trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [15, 20], dir: 'right', show: s => !s.flag('c5a_fb_night'),
        talk: function* (s) { yield s.say('Shinra Trooper', "......I'll keep watch at the entrance, sir."); } },
      { id: 'trooper_gate', name: 'Shinra Trooper', model: 'young_cloud', at: [13, 5], dir: 'up', show: phaseB,
        talk: function* (s) {
          yield s.emote('trooper_gate', '...');
          yield s.say('Shinra Trooper', "......Sir. Any orders?");
          yield s.say('cloud', "Just keep an eye on the mountain road.");
        } },
      { id: 'trooper2', name: 'Shinra Trooper', model: 'soldier', at: [19, 20], dir: 'left', show: s => !s.flag('c5a_fb_night'),
        talk: function* (s) { yield s.say('Shinra Trooper', "All quiet, sir. These little mountain towns give me the creeps, though. Everybody's staring at us."); } },
      { id: 'nib_man', name: 'Man', model: 'man3', at: [21, 8], dir: 'down',
        talk: function* (s) {
          if (phaseB(s)) { yield s.say('Man', "Your commander's been locked up in the Shinra Mansion for days. What's he doing in there?"); return; }
          yield s.say('Man', "Is that... is that really Sephiroth!? THE Sephiroth, in Nibelheim? Wait till I tell everybody!");
        } },
      { id: 'nib_woman', name: 'Woman', model: 'woman2', at: [9, 9], dir: 'right',
        talk: function* (s) {
          if (phaseB(s)) { yield s.say('Woman', "The monsters have calmed down since you went up to the reactor. Thank you... I think?"); return; }
          yield s.say('Woman', "Monsters come down from Mt. Nibel almost every night now. Something's wrong at that reactor, I just know it.");
        } },
      { id: 'nib_old', name: 'Old Man', model: 'oldman', at: [21, 12], dir: 'up',
        talk: function* (s) {
          if (phaseB(s)) { yield s.say('Old Man', "That mansion is full of Shinra's secrets. Nothing good ever came out of it. Nothing."); return; }
          yield s.say('Old Man', "Shinra built that reactor up on the mountain years ago. And that mansion to the north.\fScientists coming and going at all hours... Nobody's lived there since, thank goodness.");
        } },
      { id: 'nib_kid', name: 'Boy', model: 'kid', at: [24, 12], dir: 'right', wander: 2,
        talk: function* (s) {
          yield s.say('Boy', "Whoa, a real SOLDIER! Are you super strong? Could you beat a dragon?");
          yield s.say('cloud', "...Sure.");
          yield s.say('Boy', "Cooool! When I grow up, I'm joining SOLDIER too!");
        } },
      { id: 'nib_girl', name: 'Girl', model: 'girl', at: [26, 7], dir: 'left', show: phaseA,
        talk: function* (s) {
          if (s.flag('c5a_fb_morning')) { yield s.say('Girl', "Tifa's the guide? She's the best! She knows every trail on the mountain."); return; }
          yield s.say('Girl', "You're going up Mt. Nibel? You'll need a guide. The trails change every time there's a rockslide.");
        } },
    ],
    objects: TOWER.map(at => ({ at, talk: waterTower })).concat([
      { at: [21, 15], talk: function* (s) { yield s.msg('"NIBELHEIM"'); } },
    ]),
    triggers: [
      { at: [8, 3], on: 'talk', run: function* (s) { yield s.msg("The general store. The door's locked. There's a note: \"Back soon.\""); } },
      { at: [5, 19], on: 'talk', run: function* (s) { yield s.msg("No one answers the door."); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_arrived')) { yield* FF7.story.c5a_arrival(s); return; }
      if (s.flag('c5a_fb_night') && !s.flag('c5a_fb_morning')) { yield* FF7.story.c5a_morning(s); return; }
      if (s.flag('c5a_fb_reactor') && !s.flag('c5a_fb_days')) {
        s.set('c5a_fb_days');
        yield s.say('cloud', "(What is Sephiroth looking for in that mansion...?)");
      }
    },
  });

  // ---- arrival: "How does it feel, coming home?"
  FF7.story.c5a_arrival = function* (s) {
    s.set('c5a_fb_arrived');
    s.spawn('seph', 'sephiroth', 17, 17, 'up', { name: 'Sephiroth' });
    yield s.wait(30);
    yield s.move('player', 17, 19);
    yield s.face('seph', 'player');
    yield s.say('sephiroth', "How does it feel? Coming back to your hometown after all these years?");
    yield s.say('cloud', "......");
    yield s.face('seph', 'left');
    yield s.say('sephiroth', "I wouldn't know. I don't have a hometown.");
    yield s.say('cloud', "What about your family?");
    yield s.say('sephiroth', "My mother's name was Jenova. She died giving birth to me. My father...");
    yield s.wait(30);
    yield s.say('sephiroth', "Heh... heh heh...");
    yield s.say('sephiroth', "...Why am I telling you this? Forget it.");
    yield s.face('seph', 'player');
    yield s.say('sephiroth', "We'll spend the night at the inn. At dawn, we go up the mountain.\fYou have some time. Go and see your family, if you like.");
    yield s.move('seph', [[17, 14], [4, 14], [4, 12]]);
    s.remove('seph');
  };

  // ---- the next morning: Tifa, the guide, and the photograph
  FF7.story.c5a_morning = function* (s) {
    s.set('c5a_fb_morning');
    s.spawn('seph', 'sephiroth', 14, 12, 'left', { name: 'Sephiroth' });
    s.spawn('tr1', 'young_cloud', 16, 13, 'left', { name: 'Shinra Trooper' });
    s.spawn('tr2', 'soldier', 16, 11, 'left', { name: 'Shinra Trooper' });
    yield s.fadeIn(30);
    yield s.move('player', [[4, 14], [12, 14], [12, 12]]);
    yield s.face('player', 'right');
    yield s.say('sephiroth', "You're up. The guide should be here any moment.");
    // Tifa runs over from her house
    s.spawn('tifa', TIFA_YOUNG, 29, 5, 'down', { name: s.name('tifa') });
    yield s.run('tifa', [[29, 7], [11, 7], [11, 13]]);
    yield s.face('tifa', 'player');
    yield s.face('player', 'tifa');
    yield s.say('tifa', "Good morning! I'm your guide for Mt. Nibel.");
    yield s.emote('player', '!');
    yield s.say('cloud', "Tifa!? You're the guide?");
    yield s.say('tifa', "Who else? I know those trails better than anyone in town. Don't worry, I've climbed that mountain a hundred times.");
    yield s.say('cloud', "It's dangerous up there, Tifa. The monsters...");
    yield s.say('tifa', "That's why I've got two SOLDIERs to protect me. Right?");
    yield s.face('seph', 'tifa');
    yield s.say('sephiroth', "...Very well. We'll guarantee the guide's safety.");
    if (s.flag('c5a_fb_piano')) {
      yield s.face('tifa', 'player');
      const c = yield s.ask('tifa', "Oh, and Cloud... somebody's been playing my piano. Was it you?", ['Yeah, I jammed on it', 'No...']);
      if (c === 0) {
        s.set('c5a_piano_jammed');
        yield s.say('tifa', "'Jammed on it'? Heehee... Then you have to play me something when we get back. Promise?");
      } else {
        yield s.say('tifa', "Hmm... that's weird. Must've been a ghost, then.");
      }
    }
    // the photographer
    s.spawn('photo', PHOTOGRAPHER, 17, 22, 'up', { name: 'Photographer' });
    yield s.run('photo', [[17, 16], [17, 14], [13, 14]]);
    yield s.say('Photographer', "Mr. Sephiroth! Mr. Sephiroth! Could I trouble you for a picture? A real SOLDIER hero, right here in Nibelheim!");
    yield s.face('seph', 'photo');
    yield s.say('sephiroth', "......");
    yield s.say('tifa', "Oh, come on! Just one!");
    yield s.say('sephiroth', "...Make it quick.");
    yield s.say('Photographer', "Wonderful! Young lady, you stand in the middle. You two gentlemen on either side. Big smiles, now!");
    yield [s.move('tifa', 11, 12), s.move('seph', [[14, 11], [10, 11], [10, 12]])];
    s.face('tifa', 'down'); s.face('seph', 'down');
    yield s.face('player', 'down');
    yield s.move('photo', 11, 15);
    yield s.face('photo', 'up');
    yield s.wait(30);
    s.sfx('beep');
    yield s.wait(20);
    yield s.flash('#ffffff', 16);
    yield s.wait(30);
    yield s.say('Photographer', "Perfect! I'll develop it right away. You'll each get a copy.");
    yield s.say('tifa', "Don't forget mine!");
    yield s.move('photo', [[13, 14], [17, 14], [17, 22]]);
    s.remove('photo');
    yield s.face('seph', 'up');
    yield s.say('sephiroth', "Enough. We move out.");
    yield s.say('tifa', "The trail starts at the gate on the north side of town. Follow me!");
    // (only waitables go into a yielded array: numbers there never count as done)
    yield [
      s.move('tifa', [[11, 6], [15, 6], [15, 0]]),
      s.move('seph', [[10, 6], [14, 6], [14, 0]]),
      s.move('tr1', [[19, 13], [19, 6], [16, 6], [16, 0]]),
      s.move('tr2', [[16, 6], [16, 0]]),
    ];
    ['tifa', 'seph', 'tr1', 'tr2'].forEach(id => s.remove(id));
  };

  // ------------------------------------------------------------------ Nibelheim inn
  FF7.defineMap('fb_inn', {
    camera: { yaw: -30, pitch: 55, dist: 9.5 },   // diagonal, the stair on the right (02-flashblack05)
    name: 'Nibelheim Inn', area: 'Five Years Ago', theme: 'house', music: 'fiveyears',
    grid: [
      "#####ww###############",
      "#b.b.b...^^....kkq...#",
      "#b.b.b...^^..........#",
      "#........qq....DDDD..#",
      "#........qq..........#",
      "#========............#",
      "#....................#",
      "#..ctc...............#",
      "#....................#",
      "#j...............o...#",
      "##########++##########",
    ],
    heights: [
      "0000000000000000000000",
      "0444444442200000000000",
      "0444444442200000000000",
      "0444444440000000000000",
      "0444444440000000000000",
      "0444444440000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { from_town: [10, 9, 'up'] },
    exits: [{ at: [10, 10, 2, 1], to: 'fb_nibel', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [6, 1], dir: 'up', show: s => s.flag('c5a_fb_arrived') && !s.flag('c5a_fb_night'),
        talk: function* (s) { yield* FF7.story.c5a_innNight(s); } },
      { id: 'fb_innkeeper', name: 'Innkeeper', model: 'man5', at: [16, 2], dir: 'down',
        talk: function* (s) { yield* fbInnkeeper(s); } },
      { id: 'fb_guest', name: 'Old Woman', model: 'oldwoman', at: [3, 7], dir: 'right', anim: 'sit',
        talk: function* (s) {
          if (phaseB(s)) { yield s.say('Old Woman', "Such a handsome man, that Sephiroth. Why would he want to spend his days in that dreadful old mansion?"); return; }
          yield s.say('Old Woman', "SOLDIER, here? Goodness. The last time Shinra people came to this town in numbers, they built that mansion.");
        } },
    ],
    triggers: [{ at: [15, 3, 4, 1], on: 'talk', run: function* (s) { yield* fbInnkeeper(s); } }],
  });

  function* fbInnkeeper(s) {
    if (phaseB(s)) { yield s.say('Innkeeper', "Your commander hasn't been back to his room in days. Is he all right?"); return; }
    if (s.flag('c5a_fb_night')) { yield s.say('Innkeeper', "Heading up Mt. Nibel? Be careful. That old rope bridge has seen better days."); return; }
    yield s.say('Innkeeper', "Welcome! Shinra's already paid for your rooms. Your commander is upstairs.");
  }

  FF7.story.c5a_innNight = function* (s) {
    yield s.say('sephiroth', "...So this is where you grew up. It's quiet.");
    yield s.say('sephiroth', "We climb Mt. Nibel at first light. The town is finding us a guide.\fGet some rest.");
    yield s.say('cloud', "Right.");
    yield s.fadeOut(40);
    s.music('goodnight', { loop: false });
    yield s.wait(200);
    s.heal();
    s.set('c5a_fb_night');
    yield s.goto('fb_nibel', 'morning');
  };

  // ------------------------------------------------------------------ Cloud's house
  FF7.defineMap('fb_cloud_house', {
    name: 'Nibelheim', area: 'Five Years Ago', theme: 'house', music: 'fiveyears',
    grid: [
      "####################",
      "#k.F....qq#b....k..#",
      "#.........#b.......#",
      "#...t.....#..t.....#",
      "#..ctc....#.c......#",
      "#..................#",
      "#.........#........#",
      "#j........#.....q..#",
      "#.........#........#",
      "####++##############",
    ],
    entries: { from_town: [4, 8, 'up'] },
    exits: [{ at: [4, 9, 2, 1], to: 'fb_nibel', entry: 'from_cloud', sfx: 'door' }],
    npcs: [
      { id: 'mom', name: "Cloud's Mother", model: MOM, at: [6, 2], dir: 'down',
        talk: function* (s) { yield* FF7.story.c5a_mom(s); } },
    ],
    objects: [
      { at: [3, 1], talk: function* (s) { yield s.msg('A warm stove. Something smells good.'); } },
      { at: [16, 1], talk: function* (s) { yield s.say('cloud', "(My old room. Nothing's changed since I left.)"); } },
      { at: [16, 7], talk: function* (s) { yield s.msg('Old clothes, a little too small now.'); } },
      { at: [13, 3], talk: function* (s) { yield s.msg("A small desk. Someone has carved \"SOLDIER\" into the wood."); } },
    ],
  });

  FF7.story.c5a_mom = function* (s) {
    if (s.flag('c5a_fb_mom')) {
      if (phaseB(s)) { yield s.say("Cloud's Mother", "You look tired, Cloud. Is your work going all right? Don't let them push you too hard."); return; }
      yield s.say("Cloud's Mother", "Come home more often, Cloud. And take care of yourself, all right?");
      return;
    }
    s.set('c5a_fb_mom');
    yield s.emote('mom', '!');
    yield s.say("Cloud's Mother", "Cloud? Is that you, Cloud!? Oh, look at you! In that uniform... I'm so proud of you.");
    yield s.say("Cloud's Mother", "Are you eating properly? Getting enough sleep?");
    yield s.say('cloud', "Mom, I'm fine.");
    yield s.say("Cloud's Mother", "Is there someone special? A girl, I mean. You need somebody to look after you.\fAn older girl, maybe. Someone sensible.");
    yield s.say('cloud', "......");
    yield s.say("Cloud's Mother", "Oh, don't make that face. You look just like your father when you...");
    s.sfx('heartbeat');
    yield s.flash('#ffffff', 10);
    yield s.wait(20);
    yield s.flash('#ffffff', 10);
    yield s.say('cloud', "(...Dad. He died when I was little. I can't even remember his face.)");
    yield s.say("Cloud's Mother", "...Cloud? Are you all right, dear?");
    yield s.say('cloud', "......Yeah. I'm fine.");
    yield s.say("Cloud's Mother", "Well... come home more often, won't you?");
  };

  // ------------------------------------------------------------------ Tifa's house (her room upstairs)
  FF7.defineMap('fb_tifa_house', {
    name: 'Nibelheim', area: 'Five Years Ago', theme: 'house', music: 'fiveyears',
    legend: { p: 'counter' },
    grid: [
      "######################",
      "#kk..F...^^..pp.q...b#",
      "#........^^.........b#",
      "#..t.....qq........q.#",
      "#.ctc....qq..........#",
      "#..........==========#",
      "#....................#",
      "#..%..............k..#",
      "#....................#",
      "#j..................o#",
      "##########++##########",
    ],
    heights: [
      "0000000000044444444444",
      "0000000002244444444444",
      "0000000002244444444444",
      "0000000000044444444444",
      "0000000000044444444444",
      "0000000000044444444444",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
      "0000000000000000000000",
    ],
    entries: { from_town: [10, 9, 'up'] },
    exits: [{ at: [10, 10, 2, 1], to: 'fb_nibel', entry: 'from_tifa', sfx: 'door' }],
    npcs: [
      { id: 'tifa_dad', name: "Tifa's Father", model: TIFA_DAD, at: [4, 6], dir: 'down',
        talk: function* (s) {
          if (phaseB(s)) { yield s.say("Tifa's Father", "Tifa took you people up to that reactor, and now she won't say a word about it.\fWhatever Shinra's doing up there... keep my daughter out of it."); return; }
          yield s.say("Tifa's Father", "You're... the Strife boy? Hmph. So you really did get into SOLDIER.");
          yield s.say("Tifa's Father", "Tifa's not here. And stay out of her room.");
        } },
    ],
    objects: [
      { at: [13, 1], talk: function* (s) { yield* piano(s); } },
      { at: [14, 1], talk: function* (s) { yield* piano(s); } },
      { at: [16, 1], talk: function* (s) { yield s.msg("Tifa's wardrobe.\n...Better not."); } },
      { at: [19, 3], talk: function* (s) {
        yield s.msg('You open the dresser drawer...');
        yield s.msg('Found "Orthopedic Underwear"!');
        yield s.say('cloud', "(......What am I doing.)");
        yield s.msg('You put it back where it was.');
      } },
      { at: [5, 1], talk: function* (s) { yield s.msg('A cold fireplace. Framed pictures of Tifa as a little girl line the mantel.'); } },
    ],
  });

  // Tifa's piano: play notes (piano1..piano8 = Do..Do); the tune is saved for later (present-day Nibelheim)
  const NOTES = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti', 'Do (high)'];
  const TUNE = [0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0];   // Do Re Mi Ti La Do Re Mi So Fa Do Re Do
  function* piano(s) {
    const c = yield s.ask(null, "Tifa's piano. There's sheet music on the stand.", ['Play it', 'Read the sheet music', 'Leave it alone']);
    if (c === 1) { yield s.msg('The notes are written in a girl\'s neat handwriting:\n"Do Re Mi Ti La,  Do Re Mi So Fa,  Do Re Do."'); return; }
    if (c !== 0) return;
    s.set('c5a_fb_piano');
    const played = [];
    for (let i = 0; i < 24; i++) {
      const n = yield s.ask(null, played.length ? played.map(k => NOTES[k].replace(' (high)', '\'')).join(' ') : 'Play a note...', NOTES.concat(['Stop']), { pos: 'top' });
      if (n === NOTES.length || n == null) break;
      s.sfx('piano' + (n + 1));
      played.push(n);
    }
    if (played.length >= TUNE.length && played.slice(-TUNE.length).every((v, i) => v === TUNE[i])) {
      s.set('c5a_piano_tune');
      yield s.say('cloud', "(That melody... Tifa used to play it all the time.)");
    } else if (played.length) {
      yield s.say('cloud', "(...Not bad, if I say so myself.)");
    }
  }

  // ------------------------------------------------------------------ Nibelheim burning
  // Same layout as fb_nibel; 'L' marks fire (flickering flames, impassable), 'x' fallen timber.
  const FIRE_MARKS = {
    '6,3': 'L', '10,3': 'L', '7,1': 'L', '9,2': 'L',                                  // general store
    '20,3': 'L', '24,3': 'L', '21,1': 'L', '23,2': 'L',                               // Cloud's house
    '28,3': 'L', '32,3': 'L', '29,1': 'L', '31,2': 'L', '33,1': 'L',                  // Tifa's house
    '1,12': 'L', '5,12': 'L', '3,8': 'L', '6,7': 'L', '1,10': 'L',                    // inn
    '3,19': 'L', '7,19': 'L', '5,16': 'L', '8,17': 'L',                               // house by the inn
    '34,9': 'L', '34,7': 'L',                                                         // shed
    '12,8': 'L', '23,7': 'L', '14,11': 'x', '21,11': 'L', '27,10': 'L', '26,16': 'L',
    '30,19': 'L', '8,21': 'x', '20,5': 'x', '28,17': 'L',
  };
  const NIBEL_FIRE = NIBEL.map((row, y) => row.split('').map((ch, x) => FIRE_MARKS[x + ',' + y] || ch).join(''));
  // the fire theme's reds, applied to the town's sand, dirt, plaster and roofs
  const FIRE_LOOK = {
    sand: ['#6e4a32', '#66422c'], dirt: ['#4e3222', '#462c1e'], floor2: ['#5e4434', '#563e2e'],
    floor3: ['#9a6a48', '#926242'], wallTop: '#2a1610', roof: '#3a1a10', trim: '#2a1a10', metal: ['#4a3a30', '#42342a'], water: '#3a2418',
  };

  FF7.defineMap('fb_nibel_fire', {
    name: 'Nibelheim', area: 'Five Years Ago', theme: 'fire', music: 'nightmare',
    look: FIRE_LOOK, camera: NIBEL_CAM,
    grid: NIBEL_FIRE, heights: NIBEL_HEIGHTS, legend: { 'L': 'flames' }, buildings: NIBEL_BUILDINGS,
    entries: NIBEL_ENTRIES,
    lights: [[8, 2, '#ff8030', 4], [22, 2, '#ff8030', 4], [30, 2, '#ff6020', 5], [17, 12, '#ff8030', 5],
      [3, 9, '#ff6020', 5], [5, 17, '#ff6020', 5], [34, 8, '#ff6020', 4], [26, 16, '#ff8030', 4], [12, 8, '#ff8030', 3]],
    exits: [
      { at: [14, 0, 3, 1], to: 'fb_reactor_path', entry: 'chase', if: s => s.flag('c5a_fb_fire_seen'),
        blocked: function* (s) { yield s.say('cloud', "(The villagers... I have to find out what happened first!)"); } },
      { at: [2, 0, 3, 1], run: function* (s) { yield s.say('cloud', "(Sephiroth isn't in the mansion anymore. Where did he go...?)"); } },
      { at: [15, 23, 5, 1], run: function* (s) { yield s.say('cloud', "(I can't leave. Not like this!)"); } },
    ],
    npcs: [
      { id: 'burn_man', name: 'Villager', model: 'man3', at: [5, 5], dir: 'up', anim: 'lie', show: s => s.flag('c5a_fb_fire'),
        talk: function* (s) { yield s.say('Villager', "...Seph...iroth..."); } },
      { id: 'burn_woman', name: 'Villager', model: 'woman2', at: [10, 8], dir: 'right', show: s => s.flag('c5a_fb_fire'),
        talk: function* (s) { yield s.say('Villager', "Tifa ran after him, up toward the reactor! Her father went first... Please, you have to help them!"); } },
      { id: 'burn_old', name: 'Old Man', model: 'oldman', at: [12, 13], dir: 'down', anim: 'lie',
        talk: function* (s) { yield s.msg("He isn't moving."); } },
      { id: 'burn_body', name: 'Villager', model: 'man4', at: [26, 14], dir: 'left', anim: 'lie',
        talk: function* (s) { yield s.msg('...It\'s too late for him.'); } },
      // the masked trooper, kneeling in front of Cloud's house
      { id: 'burn_trooper', name: 'Shinra Trooper', model: 'young_cloud', at: [23, 4], dir: 'up', anim: 'kneel',
        talk: function* (s) {
          yield s.say('cloud', "Hey! Are you hurt!?");
          yield s.emote('burn_trooper', '...');
          yield s.say('Shinra Trooper', "......");
          yield s.say('cloud', "(He doesn't even look at me. He's just kneeling there, in front of my house...)");
        } },
    ],
    objects: TOWER.map(at => ({ at, talk: function* (s) { yield s.msg('The water tower is scorched black, but still standing.'); } })).concat([
      { at: [8, 3], talk: function* (s) { yield s.msg('The general store is burning from the inside.'); } },
    ]),
    triggers: [
      { at: [22, 3], on: 'talk', run: function* (s) { yield s.say('cloud', "Mom!! ...MOM!!\f(The whole house is on fire... I can't get through!)"); } },
      { at: [30, 3], on: 'talk', run: function* (s) { yield s.say('cloud', "(Tifa's house... It's completely engulfed.)"); } },
      { at: [4, 12], on: 'talk', run: function* (s) { yield s.say('cloud', "(The inn's roof is caving in...)"); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c5a_fb_fire')) yield* FF7.story.c5a_fire(s);
    },
  });

  FF7.story.c5a_fire = function* (s) {
    s.set('c5a_fb_fire');
    yield s.wait(30);
    yield s.say('cloud', "What... What is this...!?");
    s.spawn('runner', 'man3', 12, 5, 'left', { name: 'Villager' });
    s.hide('burn_man');
    yield s.run('runner', 5, 5);
    yield s.face('runner', 'player');
    yield s.say('Villager', "S-Sephiroth! It was Sephiroth! He walked right through the town, and everywhere he went... everything started burning...!");
    s.anim('runner', 'hurt');
    yield s.wait(20);
    s.remove('runner');
    s.show('burn_man', 5, 5, 'up');
    yield s.say('cloud', "Sephiroth...!");
    // a figure walks through the flames toward the mountain
    s.spawn('seph', 'sephiroth', 22, 13, 'left', { name: 'Sephiroth' });
    yield s.cam(15, 10, 40);
    yield s.move('seph', [[22, 14], [10, 14]], { speed: 0.03 });
    yield s.face('seph', 'player');
    yield s.wait(40);
    yield s.say('cloud', "SEPHIROTH!!");
    yield s.move('seph', [[10, 6], [15, 6], [15, 0]], { speed: 0.03 });
    s.remove('seph');
    s.camFollow();
    s.show('burn_woman');
    yield s.face('player', 'burn_woman');
    yield s.say('Villager', "Tifa went after him! Up toward the reactor... Her father went first...!");
    yield s.say('cloud', "Tifa...!");
    s.set('c5a_fb_fire_seen');
  };
})();

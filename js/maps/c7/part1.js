// Chapter 7 (part 1) — Nibelheim, present day: the town Shinra rebuilt exactly as it was (same layout
// as the flashback maps fb_*), the numbered men in black cloaks moaning about the "Reunion", townsfolk
// who swear nothing ever burned, Cloud's and Tifa's houses (the piano), the inn, the general store and
// the water tower. Then the Shinra Mansion: the safe and its four clues (Lost Number -> Odin, Cosmo
// Memory, Basement Key), the mansion treasures, the secret passage and spiral staircase, Sephiroth in
// the basement library (Destruct materia) and Vincent asleep in his coffin (optional).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c7_nibel_arrived, c7_cloud_house, c7_tifa_room, c7_tower_talk, c7_piano_tune, c7_piano_gil,
// c7_mansion_in, c7_mansion_passage, c7_clue1..4, c7_safe_open, c7_seph_library, c7_vincent_1,
// c7_vincent_2, c7_coffin_unlocked; shared: vincent_joined. Per-NPC: c7_clgift_<id>, c7_cltat_<id>.
// Vars: c7_cl_<id> (line counters).
// Story hooks: FF7.story.c7_tifaPiano (Tifa's piano; C12b may wrap it for the Final Heaven manual).
(function () {
  const TEAM = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const mates = (s) => TEAM.filter(id => s.inParty(id));
  const disc1 = (s) => !s.flag('disc2');
  const counter = (at, run) => ({ at, on: 'talk', run });
  // first party member (or Cloud) who can say something
  function* chime(s, lines) {
    for (const [id, text] of lines) if (id === 'cloud' || s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  // spawn the party members of the active party (not Cloud) for a cutscene; returns their ids
  function popOut(s, spots, extra) {
    const ids = mates(s);
    if (extra && s.isMember(extra) && !ids.includes(extra)) ids.unshift(extra);
    ids.slice(0, spots.length).forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'down', { name: s.name(id) }));
    return ids.slice(0, spots.length);
  }
  const tuckIn = (s, ids) => ids.forEach(id => s.remove(id));

  const CLOAK = { base: 'man', top: '#16141a', sleeve: '#16141a', bottom: '#16141a', boots: '#0c0c0e', gloves: '#16141a', hair: '#8a8a8a', hairStyle: 'longmessy', skin: '#c4bcb4', extras: ['cape', 'robe'] };
  const CLOAK_KID = Object.assign({}, CLOAK, { height: 'kid', hairStyle: 'short' });

  // The numbered men in black (Disc 1 only; in FF7 they have all gone north by Disc 2).
  function cloakNpc(id, at, dir, num, lines, gift, extra) {
    return Object.assign({
      id, name: 'Man in Black', model: extra && extra.kid ? CLOAK_KID : CLOAK, at, dir, show: disc1,
      talk: function* (s) {
        const k = s.get('c7_cl_' + id) || 0;
        s.setVar('c7_cl_' + id, (k + 1) % lines.length);
        yield s.emote(id, '...');
        yield s.say('Man in Black', lines[k % lines.length]);
        if (gift && !s.flag('c7_clgift_' + id)) {
          s.set('c7_clgift_' + id);
          yield s.msg('Something slips out from under his black cape and rolls to your feet.');
          yield s.give(gift);
        }
        if (!s.flag('c7_cltat_' + id)) {
          s.set('c7_cltat_' + id);
          yield s.msg(`A number is tattooed on the back of his hand: "${num}".`);
        }
      },
    }, extra || {});
  }

  // ------------------------------------------------------------------ world links
  FF7.world.link('nibelheim', { map: 'nibel_town', entry: 'from_world' });

  // ================================================================== NIBELHEIM
  // The very same layout as the flashback (fb_nibel, c5a part2): Shinra rebuilt the town stone for
  // stone, so the grid, heights and palette come from FF7.story.nibelheim. Doors: general store [8,3],
  // Cloud's house [22,3], Tifa's house [30,3], inn [4,12], house by the inn [5,19]; mansion road
  // [2-4,0], Mt. Nibel steps [14-16,0], entrance road to the world map [15-19,23].
  const NIB = FF7.story.nibelheim;
  const TOWER = [[17, 9], [18, 9], [17, 10], [18, 10]];

  function* waterTower(s) {
    yield s.msg("Nibelheim's old wooden water tower. Not a scorch mark on it.");
    if (!s.flag('c7_tower_talk') && s.isMember('tifa')) {
      s.set('c7_tower_talk');
      yield s.say('tifa', "Even the water tower is the same...\fCloud, do you remember? That night, up there, under all those stars...");
      yield s.say('cloud', "......Yeah. I remember.");
      yield s.say('tifa', "......Then that part, at least, was real.");
      return;
    }
    yield s.say('cloud', "(Tifa and I sat up there once, the night before I left for Midgar. I made her a promise...)");
  }

  FF7.defineMap('nibel_town', {
    name: 'Nibelheim', area: 'Nibelheim', theme: 'nibelheim', music: 'anxious',
    look: Object.assign({}, NIB.look, { fog: { color: [0.5, 0.55, 0.6], near: 11, far: 26 } }),
    camera: NIB.camera,
    grid: NIB.grid, heights: NIB.heights, buildings: NIB.buildings,
    entries: {
      from_world: [17, 22, 'up'], from_inn: [4, 13, 'down'], from_house: [5, 20, 'down'],
      from_tifa: [30, 4, 'down'], from_cloud: [22, 4, 'down'], from_shop: [8, 4, 'down'],
      from_mansion: [3, 1, 'down'], from_mountain: [15, 1, 'down'],
    },
    exits: [
      { at: [14, 0, 3, 1], to: 'mtnibel_path', entry: 'from_town', if: s => s.flag('c7_seph_library') || s.flag('has_bronco'),
        blocked: function* (s) { yield s.say('cloud', "(The trail up Mt. Nibel... Not yet. If Sephiroth's really in that mansion, I have to see him first.)"); } },
      { at: [2, 0, 3, 1], to: 'mansion_hall', entry: 'from_town', sfx: 'door2' },
      { at: [8, 3, 1, 1], to: 'nibel_shop', entry: 'from_town', sfx: 'door' },
      { at: [30, 3, 1, 1], to: 'nibel_tifa_house', entry: 'from_town', sfx: 'door' },
      { at: [22, 3, 1, 1], to: 'nibel_cloud_house', entry: 'from_town', sfx: 'door' },
      { at: [5, 19, 1, 1], to: 'nibel_house', entry: 'from_town', sfx: 'door' },
      { at: [4, 12, 1, 1], to: 'nibel_inn', entry: 'from_town', sfx: 'door' },
      { at: [15, 23, 5, 1], to: 'world', loc: 'nibelheim' },
    ],
    npcs: [
      cloakNpc('cloak_gate', [13, 20], 'up', 1, [
        "Uuuu...... Re...union......",
        "Must... go... Sephiroth... is calling......",
      ], null, { anim: 'kneel' }),
      cloakNpc('cloak_tower', [19, 11], 'left', 7, [
        "......Uuh...... Soon...... the Reunion......",
        "Se...phi...roth...... I can hear... him......",
      ], null, { anim: 'kneel' }),
      cloakNpc('cloak_mansion', [4, 4], 'up', 2, [
        "Se...phi...roth......\fHe is...... in the mansion......",
        "The mansion...... He went...... into the mansion......",
      ]),
      cloakNpc('cloak_mtn', [13, 4], 'right', 9, [
        "......North...... Over the mountain...... then north......",
        "The Reunion...... I must not...... be late......",
      ]),
      { id: 'nib_man', name: 'Man', model: 'man3', at: [22, 8], dir: 'down', wander: 1,
        talk: function* (s) {
          if (s.flag('disc2')) { yield s.say('Man', "Those creepy fellows in the capes? Gone. All of them just shuffled off north one night. Good riddance."); return; }
          yield s.say('Man', "A fire? Here? Five years ago?\fHa! You've got the wrong town, friend. Nibelheim hasn't changed since I was a boy.");
          yield chime(s, [['tifa', "......"], ['barret', "Yeah? Then how come none of y'all look like you ever seen these two before?"]]);
        } },
      { id: 'nib_woman', name: 'Woman', model: 'woman2', at: [9, 9], dir: 'right',
        talk: function* (s) {
          if (s.flag('disc2')) { yield s.say('Woman', "It's so quiet now that those men in black are gone. ...Almost too quiet."); return; }
          yield s.say('Woman', "Oh, the men in black? They started turning up a while back. They just wander around, moaning.\fThe company told us to leave them be, so we... I mean, the mayor told us. The mayor.");
        } },
      { id: 'nib_old', name: 'Old Man', model: 'oldman', at: [26, 12], dir: 'up',
        talk: function* (s) {
          yield s.say('Old Man', "I've lived in this town my whole life. My WHOLE life. Every day of it, right here.\f......Ahem. Is there something else you'd like me to say?");
        } },
      { id: 'nib_worker', name: 'Villager', model: 'man6', at: [8, 21], dir: 'up', wander: 2,
        talk: function* (s) {
          yield s.say('Villager', "Me? Just an ordinary villager. Born and raised. Definitely not on anybody's payroll.\f...What? Why are you looking at me like that?");
        } },
    ],
    objects: TOWER.map(at => ({ at, talk: waterTower })).concat([
      { at: [21, 15], talk: function* (s) { yield s.msg('"NIBELHEIM"\nThe paint on the sign is fresh.'); } },
    ]),
    onEnter: function* (s) {
      if (!s.flag('c7_nibel_arrived')) yield* FF7.story.c7_nibelArrive(s);
    },
  });

  FF7.story.c7_nibelArrive = function* (s) {
    s.set('c7_nibel_arrived');
    const ids = popOut(s, [[16, 23, 'up'], [18, 23, 'up'], [17, 23, 'up']], 'tifa');
    yield s.move('player', 17, 19);
    const dest = [[16, 20], [18, 20], [17, 21]];
    yield ids.map((id, i) => s.move(id, dest[i][0], dest[i][1]));
    yield 30;
    yield s.say('cloud', "......What is this?");
    if (ids.includes('tifa')) {
      s.face('tifa', 'up');
      yield s.say('tifa', "It's... all here. The houses, the square, the water tower...\fIt looks exactly the way it did before the fire.");
    }
    yield chime(s, [['barret', "Hold on. You two told us Sephiroth burned this whole place down!"],
      ['redxiii', "You said this town was burned to the ground, Cloud."]]);
    yield s.say('cloud', "He did. I was here. I watched it burn.");
    if (ids.includes('tifa')) yield s.say('tifa', "My father... everyone... Nibelheim burned. I know it did.");
    yield chime(s, [['aeris', "Then who built it all again? And why make it look exactly the same as before?"],
      ['caitsith', "It's like somebody went and rolled back time. Gives me the shivers, it does."]]);
    yield chime(s, [['redxiii', "The smell is wrong. These houses are new... but someone has taken great care to make them look old."]]);
    yield s.cam(13, 20, 30);
    yield s.emote('cloak_gate', '...');
    yield s.say('Man in Black', "Uuuu...... Re...union......");
    yield chime(s, [['yuffie', "Eek! What's with him!?"], ['barret', "The hell...? Another one of them guys in the black capes."]]);
    yield s.say('cloud', "(A man in a black cape... just like the ones we've been following since Midgar.)");
    s.camFollow();
    if (ids.includes('tifa')) {
      yield s.face('tifa', 'player');
      yield s.say('tifa', "Cloud... let's look around. There has to be an explanation for this.");
    }
    yield ids.map(id => s.move(id, 17, 19));
    tuckIn(s, ids);
  };

  // ------------------------------------------------------------------ Nibelheim inn (as in fb_inn)
  const innDesk = function* (s) {
    if (!s.flag('c7_inn_talk') && disc1(s)) {
      s.set('c7_inn_talk');
      yield s.say('Innkeeper', "Welcome to Nibelheim! ...A fire? Five years ago?\fOh, no, no. Nothing like that ever happened here. I've run this inn for four years, and... er, I mean, forever. I've always run it.");
      yield s.say('Innkeeper', "Sephiroth, you say? Oh yes, THE Sephiroth stayed here once, with some of his troops.\fBut only one other SOLDIER came with him. Spiky hair, if I recall... I didn't catch his name.");
      yield s.say('cloud', "......");
    }
    yield s.inn(80, { who: 'Innkeeper', text: "A room is 80 gil a night. Would you like to stay?" });
  };
  FF7.defineMap('nibel_inn', {
    camera: { yaw: -30, pitch: 55, dist: 9.5 },   // same camera as the flashback inn (fb_inn)
    name: 'Nibelheim Inn', area: 'Nibelheim', theme: 'house', music: 'anxious',
    grid: [
      "#####ww###############",
      "#b.b.b...^^....kkq...#",
      "#b.b.b...^^..........#",
      "#........##....DDDD..#",
      "#........##..........#",
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
    exits: [{ at: [10, 10, 2, 1], to: 'nibel_town', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman5', at: [16, 2], dir: 'down', talk: innDesk },
      { id: 'guest', name: 'Old Woman', model: 'oldwoman', at: [3, 7], dir: 'right', anim: 'sit',
        talk: function* (s) { yield s.say('Old Woman', "Such a lovely quiet town, isn't it? My son found us this place through his company.\fThey paid for everything! Even the furniture. Everything was brand new... but made to look old. Isn't that charming?"); } },
      cloakNpc('cloak_inn', [7, 3], 'down', 4, [
        "So... cold...... Where... is...... the Reunion......",
        "......Uuh......",
      ], 'luck_source'),
    ],
    triggers: [counter([15, 3, 4, 1], innDesk)],
    objects: [{ at: [1, 9], talk: function* (s) { yield s.msg('A clay pot. It still smells of fresh glaze.'); } }],
  });

  // ------------------------------------------------------------------ the house by the inn
  FF7.defineMap('nibel_house', {
    name: 'Nibelheim', area: 'Nibelheim', theme: 'house', music: 'anxious',
    grid: [
      "####################",
      "#k....F.......q..bb#",
      "#..................#",
      "#..................#",
      "#..ctc.........t...#",
      "#..................#",
      "#j..............o..#",
      "#######++###########",
    ],
    entries: { from_town: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 2, 1], to: 'nibel_town', entry: 'from_house', sfx: 'door' }],
    npcs: [
      cloakNpc('cloak_fire', [6, 2], 'up', 11, [
        "......Warm...... The Reunion...... will be warm......",
        "Uuu...... Mother...... waiting......",
      ], 'elixir', { anim: 'kneel' }),
      { id: 'resident', name: 'Woman', model: 'woman4', at: [15, 3], dir: 'left',
        talk: function* (s) {
          if (s.flag('disc2')) { yield s.say('Woman', "My guest finally left. He walked out into the night without a word. Headed north, I think."); return; }
          yield s.say('Woman', "That man by the fire? He just walked in one day and sat down. He won't eat, won't talk... only moans.\fThe company said not to throw him out. So I... let him warm himself.");
        } },
    ],
    objects: [{ at: [6, 1], talk: function* (s) { yield s.msg('A crackling fire.'); } }],
  });

  // ------------------------------------------------------------------ Cloud's house (as in fb_cloud_house)
  FF7.defineMap('nibel_cloud_house', {
    name: 'Nibelheim', area: 'Nibelheim', theme: 'house', music: 'anxious',
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
    exits: [{ at: [4, 9, 2, 1], to: 'nibel_town', entry: 'from_cloud', sfx: 'door' }],
    npcs: [
      { id: 'resident', name: 'Man', model: 'man4', at: [6, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Man', "Can I help you? This is my house. I've lived here for... a long time. A very long time.\fNow if you don't mind, I'd like my privacy.");
        } },
    ],
    objects: [
      { at: [3, 1], talk: function* (s) { yield s.msg('A cold stove. No one has cooked anything on it.'); } },
      { at: [16, 1], talk: function* (s) { yield s.say('cloud', "(My room. The same shelf... the same books... Even the scratches are the same.)"); } },
      { at: [11, 1], talk: function* (s) { yield s.say('cloud', "(My bed. ...Someone copied it right down to the patched blanket.)"); } },
      { at: [16, 7], talk: function* (s) { yield s.msg('An empty wardrobe.'); } },
      { at: [13, 3], talk: function* (s) { yield s.msg('A small desk. Someone has carved "SOLDIER" into the wood... and the cuts are brand new.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_cloud_house')) return;
      s.set('c7_cloud_house');
      yield s.wait(20);
      yield s.say('cloud', "(This is... my house. Mom's kitchen. The table. It's all exactly where it was.)");
      yield s.face('resident', 'player');
      yield s.say('Man', "Hm? Who are you? Knock before you walk into someone's home.");
      yield s.say('cloud', "......Someone else lived here. A woman. My mother.");
      yield s.say('Man', "Your mother? Never heard of her. This house has been mine since... since forever.");
      if (s.isMember('tifa')) {
        s.spawn('tifa', 'tifa', 4, 8, 'up', { name: s.name('tifa') });
        yield s.move('tifa', 5, 6);
        yield s.say('tifa', "Cloud......");
        yield s.say('cloud', "......Let's go, Tifa.");
        s.remove('tifa');
      }
    },
  });

  // ------------------------------------------------------------------ Tifa's house (as in fb_tifa_house)
  const NOTES = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti', 'Do (high)'];
  const TUNE = [0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0];   // the melody from the flashback (c5a)
  FF7.story.c7_tifaPiano = function* (s) {
    const c = yield s.ask(null, "Tifa's piano. Somebody has kept it in tune.", ['Play it', 'Leave it alone']);
    if (c !== 0) return;
    const played = [];
    for (let i = 0; i < 24; i++) {
      const n = yield s.ask(null, played.length ? played.map(k => NOTES[k].replace(' (high)', "'")).join(' ') : 'Play a note...', NOTES.concat(['Stop']), { pos: 'top' });
      if (n === NOTES.length || n == null) break;
      s.sfx('piano' + (n + 1));
      played.push(n);
    }
    const ok = played.length >= TUNE.length && played.slice(-TUNE.length).every((v, i) => v === TUNE[i]);
    if (ok) {
      s.set('c7_piano_tune');
      yield s.say('cloud', "(That's it... the song Tifa always used to play.)");
      if (!s.flag('c7_piano_gil')) {
        s.set('c7_piano_gil');
        yield s.msg('Something clinks inside the piano. Wedged under the keys is a coin...');
        yield s.giveGil(1);
        yield s.say('cloud', "(Tifa's secret savings. ...One gil.)");
      }
    } else if (played.length) {
      yield s.say('cloud', "(...Close enough.)");
    }
  };
  FF7.defineMap('nibel_tifa_house', {
    name: 'Nibelheim', area: 'Nibelheim', theme: 'house', music: 'anxious',
    legend: { p: 'counter' },
    grid: [
      "######################",
      "#kk..F...^^..pp.q...b#",
      "#........^^.........b#",
      "#..t.....##........q.#",
      "#.ctc....##..........#",
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
    exits: [{ at: [10, 10, 2, 1], to: 'nibel_town', entry: 'from_tifa', sfx: 'door' }],
    npcs: [
      cloakNpc('cloak_tifa1', [19, 7], 'left', 10, [
        "Uuu...... The Black...... Materia......",
        "......Leave me...... I'm waiting...... for the call......",
      ], 'turbo_ether'),
      cloakNpc('cloak_tifa2', [17, 3], 'down', 12, [
        "......Sephiroth...... Where...... are you......",
        "Uuuh...... So close...... the Reunion......",
      ], 'platinum_fist'),
    ],
    objects: [
      { at: [13, 1], talk: function* (s) { yield* FF7.story.c7_tifaPiano(s); } },
      { at: [14, 1], talk: function* (s) { yield* FF7.story.c7_tifaPiano(s); } },
      { at: [16, 1], talk: function* (s) { yield s.msg("Tifa's wardrobe. The clothes inside are brand new, but cut in an old style."); } },
      { at: [19, 3], talk: function* (s) { yield s.msg('A dresser. ...Better leave it alone.'); } },
      { at: [5, 1], talk: function* (s) { yield s.msg('A fireplace. The mantel is bare; there are no family pictures.'); } },
      { at: [20, 1], talk: function* (s) { yield s.msg("Tifa's bed, neatly made."); } },
    ],
    triggers: [
      { id: 'tifa_room', at: [11, 1, 3, 4], once: true, if: s => s.isMember('tifa'),
        run: function* (s) {
          s.set('c7_tifa_room');
          s.spawn('tifa', 'tifa', 13, 3, 'left', { name: s.name('tifa') });
          yield s.say('tifa', "My room... Everything's where I left it. Even the piano.\fIt's like the last five years never happened. ...I hate it.");
          yield s.say('cloud', "......");
          yield s.say('tifa', "You used to sneak in here, remember? Or... was that only in my head, too?");
          s.remove('tifa');
        } },
    ],
  });

  // ------------------------------------------------------------------ general store (+ the kids upstairs)
  const storeDesk = function* (s) {
    yield s.say('Shopkeeper', "Welcome! Everything a traveler could need. We get a lot of, uh, visitors from the company, so we keep the shelves full.");
    yield s.shop('nibelheim_items');
  };
  FF7.defineMap('nibel_shop', {
    name: 'Nibelheim General Store', area: 'Nibelheim', theme: 'house', music: 'anxious',
    grid: [
      "####################",
      "#b.b.....^^...kk.qq#",
      "#........^^........#",
      "#........##...DDDD.#",
      "#========##........#",
      "#..................#",
      "#..t...........B.o.#",
      "#.ctc..............#",
      "#j.................#",
      "#########++#########",
    ],
    heights: [
      "44444444400000000000",
      "44444444422000000000",
      "44444444422000000000",
      "44444444400000000000",
      "44444444400000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    entries: { from_town: [9, 8, 'up'] },
    exits: [{ at: [9, 9, 2, 1], to: 'nibel_town', entry: 'from_shop', sfx: 'door' }],
    npcs: [
      { id: 'shopkeeper', name: 'Shopkeeper', model: 'man5', at: [15, 2], dir: 'down', talk: storeDesk },
      cloakNpc('cloak_kid1', [3, 2], 'right', 5, [
        "......Mommy...... No...... Sephiroth......",
        "Uuu...... I want...... to go north......",
      ], 'luck_source', { kid: true }),
      cloakNpc('cloak_kid2', [6, 3], 'left', 6, [
        "......Reunion...... Re...union......",
        "......Cold......",
      ], null, { kid: true }),
    ],
    triggers: [counter([14, 3, 4, 1], storeDesk)],
    objects: [
      { at: [15, 6], talk: function* (s) { yield s.msg('Crates stamped with the Shinra logo. "SUPPLIES — NIBELHEIM RESIDENTS"'); } },
    ],
  });

  // ================================================================== SHINRA MANSION
  const B1 = { table: 'nibelheim_mansion_1f', bg: 'mansion' };
  const B2 = { table: 'nibelheim_mansion_2f', bg: 'mansion' };

  FF7.defineMap('mansion_hall', {
    name: 'Shinra Mansion', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B1,
    grid: [
      "###########################+##",
      "#kk....b..#........#q........#",
      "#......b..#........#.........#",
      "+.........................t..+",
      "#.........#........#.........#",
      "###########^^=++=^^###########",
      "#.........|^^|..|^^|.........#",
      "#............................#",
      "#..u......................u..#",
      "#............................+",
      "#......________________......#",
      "#......________________......#",
      "#..|...________________...|..#",
      "+......________________......#",
      "#.j....________________....j.#",
      "#.............__.............#",
      "##############++##############",
    ],
    heights: [
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666663360063366666666666",
      "000000000003300003300000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    lights: [[14, 11, '#ffd8a0', 5], [4, 2, '#ffd080', 3], [25, 2, '#ffd080', 3]],
    entries: {
      from_town: [14, 15, 'up'], from_1f_north: [14, 6, 'down'], from_1f_east: [28, 9, 'left'], from_1f_west: [1, 13, 'right'],
      from_2f_west: [1, 3, 'right'], from_2f_east: [28, 3, 'left'], from_stairs: [27, 1, 'down'],
    },
    exits: [
      { at: [14, 16, 2, 1], to: 'nibel_town', entry: 'from_mansion', sfx: 'door2' },
      { at: [14, 5, 2, 1], to: 'mansion_1f_north', entry: 'from_hall', sfx: 'door' },
      { at: [29, 9, 1, 1], to: 'mansion_1f_east', entry: 'from_hall', sfx: 'door' },
      { at: [0, 13, 1, 1], to: 'mansion_1f_west', entry: 'from_hall', sfx: 'door' },
      { at: [0, 3, 1, 1], to: 'mansion_2f_west', entry: 'from_hall', sfx: 'door' },
      { at: [29, 3, 1, 1], to: 'mansion_2f_east', entry: 'from_hall', sfx: 'door' },
      { at: [27, 0, 1, 1], to: 'mansion_stairs', entry: 'from_hall', sfx: 'door2', if: s => s.flag('c7_mansion_passage'),
        blocked: function* (s) {
          yield s.msg('One panel of the wall looks newer than the rest. A cold draft seeps out from the seam.');
          const c = yield s.ask(null, 'Push on the panel?', ['Push it', 'Leave it']);
          if (c !== 0) return;
          s.sfx('door2');
          s.shake(1, 20);
          s.set('c7_mansion_passage');
          yield s.msg('The panel swings inward. Behind it, a narrow stone staircase spirals down into the dark.');
        } },
    ],
    objects: [
      { at: [3, 8], talk: function* (s) { yield s.msg('A marble statue of a robed woman. Her face has been chipped away.'); } },
      { at: [26, 8], talk: function* (s) { yield s.msg('A marble statue holding an empty urn.'); } },
      { at: [1, 1], talk: function* (s) { yield s.msg('Books on botany and geology, thick with dust.'); } },
      { at: [26, 3], talk: function* (s) { yield s.msg('A writing desk. Old notes, the handwriting cramped and hurried.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_mansion_in')) return;
      s.set('c7_mansion_in');
      yield s.wait(20);
      yield s.say('cloud', "(The Shinra Mansion. Five years ago, Sephiroth shut himself in here... and came out a different man.)");
      yield chime(s, [['tifa', "When we were kids, nobody would come near this place. They said it was haunted."],
        ['aeris', "This place... it feels so cold. Like it's holding its breath."],
        ['barret', "Creepy-ass house. Let's find Sephiroth and get the hell out."]]);
    },
  });

  // ---- the small room left of the entrance: the letter about the safe
  function* safeLetter(s) {
    yield s.msg('A letter lies on the table.\f"To whoever finds this:\nThe key to the basement is locked in the safe upstairs.\nI have hidden the combination around this house,\nfor the sake of anyone clever enough to look."');
    for (let i = 0; i < 6; i++) {
      const c = yield s.ask(null, 'Read which part?', ['Clue 1', 'Clue 2', 'Clue 3', '        ', 'Stop reading'], { pos: 'top' });
      if (c === 0) yield s.msg('"Clue 1: Beneath the lid of the box,\nin the room where the air is richest."');
      else if (c === 1) yield s.msg('"Clue 2: Behind the ivory keys\nthat have lost their Ti and their Re."');
      else if (c === 2) yield s.msg('"Clue 3: From the creaking board by the chair on the second floor,\nfive steps left, nine steps up,\ntwo steps left, then six steps up."');
      else if (c === 3) {
        s.set('c7_clue4');
        yield s.msg('The line looks blank... but tilted toward the lamp, faint writing appears:\f"Clue 4: The fourth number is Right 97."');
      } else return;
    }
  }
  FF7.defineMap('mansion_1f_west', {
    name: 'Shinra Mansion', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B1,
    grid: [
      "################",
      "#kkk.....q..kkk#",
      "#..............#",
      "#.....ctc......#",
      "#..............+",
      "#..............#",
      "#j..........u..#",
      "################",
    ],
    entries: { from_hall: [14, 4, 'left'] },
    exits: [{ at: [15, 4, 1, 1], to: 'mansion_hall', entry: 'from_1f_west', sfx: 'door' }],
    objects: [
      { at: [7, 3], talk: safeLetter },
      { at: [2, 1], talk: function* (s) { yield s.msg('Leather-bound ledgers: "Shinra Mansion — Staff Rotation". The last entry is thirty years old.'); } },
      { at: [12, 6], talk: function* (s) { yield s.msg('A small bronze statue of a bird.'); } },
    ],
  });

  // ---- the east rooms (Silver M-phone in the second room)
  FF7.defineMap('mansion_1f_east', {
    name: 'Shinra Mansion', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B1,
    grid: [
      "##############################",
      "#kk..q......k#kkk......b.b...#",
      "#............#...............#",
      "#...ctc......#......t........#",
      "+............+.....ctc.......#",
      "#............#...............#",
      "#............#...............#",
      "#u..........j#j.............q#",
      "##############################",
    ],
    entries: { from_hall: [1, 4, 'right'] },
    exits: [{ at: [0, 4, 1, 1], to: 'mansion_hall', entry: 'from_1f_east', sfx: 'door' }],
    chests: [{ at: [26, 6], item: 'silver_m_phone', id: 'mansion_1fe_mphone' }],
    objects: [
      { at: [5, 1], talk: function* (s) { yield s.msg('A cabinet full of chipped teacups.'); } },
      { at: [23, 1], talk: function* (s) { yield s.msg('A dusty guest bed. Nobody has slept in it for years.'); } },
    ],
  });

  // ---- north: the dining hall (Twin Viper) and the music room with the piano (clue 2)
  FF7.defineMap('mansion_1f_north', {
    name: 'Shinra Mansion', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B1,
    legend: { p: 'counter' },
    grid: [
      "##############################",
      "#kk....pp....#....|......|...#",
      "#............#...............#",
      "#............#...tttttt......#",
      "#..c.........+...cccccc......#",
      "#............#...............#",
      "#q...........#j.............j#",
      "#............#...............#",
      "##############++##############",
    ],
    entries: { from_hall: [14, 7, 'up'] },
    exits: [{ at: [14, 8, 2, 1], to: 'mansion_hall', entry: 'from_1f_north', sfx: 'door' }],
    chests: [{ at: [26, 2], item: 'twin_viper', id: 'mansion_1fn_viper' }],
    objects: [
      { at: [7, 1], talk: function* (s) { yield s.msg('An old grand piano. Two of the keys are missing — the Ti and the Re.'); } },
      { at: [8, 1], talk: function* (s) { yield s.msg('An old grand piano. Two of the keys are missing — the Ti and the Re.'); } },
      { at: [1, 1], talk: function* (s) { yield s.msg('Sheet music, yellowed with age. The top page is a lullaby.'); } },
    ],
    triggers: [
      { at: [9, 1, 1, 2], on: 'talk', run: function* (s) {
        s.set('c7_clue2');
        yield s.msg('Something is scratched into the floorboards behind the piano:\f"Dial 2: Left 10"');
      } },
      { at: [6, 1, 1, 2], on: 'talk', run: function* (s) {
        yield s.msg('Nothing but dust on this side of the piano.');
      } },
    ],
  });

  // ---- 2F west wing: the atrium (Enemy Launcher, clue 1 on the lid) and the safe room
  const COMBO = [[0, 36], [1, 10], [0, 59], [0, 97]];      // [0 = Right / 1 = Left, number]
  const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  FF7.story.c7_safe = function* (s) {
    if (s.flag('c7_safe_open')) { yield s.msg('The safe hangs open. It is empty now.'); return; }
    yield s.msg('A heavy iron safe with a four-number combination dial.\nThe mechanism resets itself if you dawdle.');
    const c = yield s.ask(null, 'Try the dial?', ['Try it', 'Leave it']);
    if (c !== 0) return;
    const t0 = (FF7.state && FF7.state.time) || 0;
    let ok = true;
    for (let i = 0; i < 4; i++) {
      const dir = yield s.ask(null, `Number ${i + 1}: which way?`, ['Right', 'Left'], { pos: 'top' });
      const tens = yield s.ask(null, `Number ${i + 1} (${dir === 1 ? 'Left' : 'Right'}): tens?`, DIGITS, { pos: 'top' });
      const ones = yield s.ask(null, `Number ${i + 1} (${dir === 1 ? 'Left' : 'Right'} ${tens}_): ones?`, DIGITS, { pos: 'top' });
      s.sfx('cursor');
      if ((dir === 1 ? 1 : 0) !== COMBO[i][0] || (tens * 10 + ones) !== COMBO[i][1]) ok = false;
    }
    const took = ((FF7.state && FF7.state.time) || 0) - t0;
    if (took > 60) { s.sfx('error'); yield s.msg('Too slow! With a whir, the dial spins back to zero.'); return; }
    if (!ok) { s.sfx('error'); yield s.msg('Clunk. The handle refuses to turn. Wrong combination.'); return; }
    s.sfx('gate');
    yield s.msg('Click... click... CLACK. The safe door swings open—');
    s.shake(5, 40);
    s.spawn('lostnum', { enemy: 'lost_number' }, 21, 3, 'down', { name: 'Lost Number' });
    yield s.say('cloud', "Something's inside!");
    yield s.battle({ table: 'boss_lost_number', bg: 'mansion', music: 'boss', noEscape: true });
    s.remove('lostnum');
    s.set('c7_safe_open');
    yield s.msg('Inside the safe, behind where the creature was locked away...');
    yield s.giveMateria('odin');
    yield s.give('basement_key');
    yield chime(s, [['barret', "A key? Guess that's for that locked door in the basement."], ['tifa', "A key... There was a locked door down in the basement, wasn't there?"]]);
  };
  FF7.defineMap('mansion_2f_west', {
    name: 'Shinra Mansion 2F', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B2,
    grid: [
      "##############################",
      "#%f%f%..%f%f%#k......q......k#",
      "#f..........f#...............#",
      "#%....|.....%#...............#",
      "#f..........f#...............#",
      "#%..........%#...............#",
      "#%f%f%..%f%f%#...............#",
      "######..########..############",
      "#............................#",
      "#.........S..................+",
      "#............................#",
      "##############################",
    ],
    lights: [[6, 3, '#e0ffc0', 4], [21, 3, '#ffd080', 3]],
    entries: { from_hall: [28, 9, 'left'] },
    exits: [{ at: [29, 9, 1, 1], to: 'mansion_hall', entry: 'from_2f_west', sfx: 'door' }],
    chests: [{ at: [6, 4], item: 'enemy_launcher', id: 'mansion_2fw_launcher' }],
    objects: [
      { at: [21, 1], talk: function* (s) { yield* FF7.story.c7_safe(s); } },
      // clue 1: the inside of the chest lid (readable once the chest is open)
      { at: [6, 4], if: s => s.flag('got_mansion_2fw_launcher'),
        talk: function* (s) { s.set('c7_clue1'); yield s.msg('Something is written on the inside of the lid:\f"Dial 1: Right 36"'); } },
      { at: [6, 3], talk: function* (s) { yield s.msg('The atrium is thick with plants. The air in here is damp and sweet.'); } },
      { at: [14, 1], talk: function* (s) { yield s.msg('Books on metallurgy and locksmithing.'); } },
    ],
  });

  // ---- 2F east wing: bedroom, the room with the Magic Source (clue 3 by its entrance)
  FF7.defineMap('mansion_2f_east', {
    name: 'Shinra Mansion 2F', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: B2,
    grid: [
      "##############################",
      "#b.b...q....k#kk..........q..#",
      "#b.b.........#...............#",
      "#............#...............#",
      "#...t........#...............#",
      "#..ctc.......#...............#",
      "#............#...............#",
      "#j...........#.............j.#",
      "######..#########..###########",
      "#............................#",
      "+............................#",
      "#.....................c......#",
      "#.....u...................u..#",
      "##############################",
    ],
    entries: { from_hall: [1, 10, 'right'] },
    exits: [{ at: [0, 10, 1, 1], to: 'mansion_hall', entry: 'from_2f_east', sfx: 'door' }],
    chests: [{ at: [25, 5], item: 'magic_source', id: 'mansion_2fe_msource' }],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg('A four-poster bed. The sheets are grey with dust.'); } },
      { at: [7, 1], talk: function* (s) { yield s.msg('A wardrobe. Lab coats hang inside, stiff with age.'); } },
      { at: [22, 11], talk: function* (s) { yield s.msg('A lone chair in the hallway. The floorboard next to it creaks.'); } },
    ],
    triggers: [
      { at: [21, 11, 1, 1], on: 'talk', run: function* (s) { yield s.msg('*creak*\nThis must be the creaking board from the letter.'); } },
      { id: 'creak', at: [21, 11, 1, 1], once: true, run: function* (s) { s.sfx('search'); yield s.msg('*creeak*'); } },
      { at: [16, 3, 3, 2], on: 'talk', run: function* (s) {
        s.set('c7_clue3');
        yield s.msg('A small note is tucked into a gap between the floorboards:\f"Dial 3: Right 59"');
      } },
    ],
  });

  // ---- the spiral staircase behind the secret panel
  FF7.defineMap('mansion_stairs', {
    name: 'Shinra Mansion', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: { table: 'nibelheim_mansion_stairs', bg: 'mansion' },
    look: { wall: '#6a5a4a', trim: '#3a2a1a', floor: ['#6a4a30', '#62442a'], sky: ['#000000', '#000000'] },
    lights: [[8, 7, '#ffc080', 5]],
    grid: [
      "##################",
      "#++###############",
      "#....^....^......#",
      "#....^....^......#",
      "###            ^^#",
      "+..            ..#",
      "+..            ..#",
      "#^^            ^^#",
      "#..            ..#",
      "#^^            ..#",
      "#..^...^...^.....#",
      "#..^...^...^.....#",
      "##################",
    ],
    heights: [
      "999999999999999999",
      "999999999999999999",
      "999998888877777777",
      "999998888877777777",
      "000000000000000660",
      "000000000000000660",
      "000000000000000660",
      "000000000000000550",
      "011000000000000550",
      "011000000000000550",
      "022233334444555550",
      "022233334444555550",
      "000000000000000000",
    ],
    entries: { from_hall: [1, 2, 'down'], from_basement: [1, 5, 'right'] },
    exits: [
      { at: [1, 1, 2, 1], to: 'mansion_hall', entry: 'from_stairs', sfx: 'door2' },
      { at: [0, 5, 1, 2], to: 'mansion_basement', entry: 'from_stairs' },
    ],
    triggers: [
      { id: 'first_look', at: [3, 2, 2, 2], once: true, run: function* (s) {
        yield s.say('cloud', "(A spiral staircase, winding down around an empty shaft... It goes a long way down.)");
      } },
    ],
  });

  // ---- the basement: cave tunnel, Vincent's door, the lab and the library (as in fb_mansion_base)
  FF7.defineMap('mansion_basement', {
    name: 'Shinra Mansion Basement', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: { table: 'nibelheim_mansion_basement', bg: 'mansion' },
    // ref 08-nibelheim09, 10: the basement library and the purple-rock tunnel beneath the mansion
    look: { wall: '#5a4a68', trim: '#2e2438', wallTop: '#2a2034', floor: ['#4a4052', '#443a4c'], floor2: ['#55504a', '#4e4a44'], floor3: ['#6a3a2a', '#643424'] },
    lights: [[25, 6, '#ffd080', 4], [17, 8, '#80ffb0', 3], [7, 9, '#ffb060', 2]],
    grid: [
      "#:::##############################",
      "#:::####################kkkkkkkkk#",
      "#:.:####################_________#",
      "#::R####################k_k_k_k_k#",
      "#R::####################k_k_k_k_k#",
      "#:::##########.......###_________#",
      "#::R##########y.y.y.y###_t_______#",
      "#R::##########.......###_c_______#",
      "#::::::::::::..........._________#",
      "#:R:::::R::::..........._________#",
      "#######+######Z....M.###k_k_k_k_k#",
      "##############y.y.y.y###k_k_k_k_k#",
      "##############.......###_________#",
      "########################kkkkkkkkk#",
      "##################################",
    ],
    entries: { from_stairs: [2, 1, 'down'], from_coffin: [7, 9, 'up'] },
    exits: [
      { at: [1, 0, 3, 1], to: 'mansion_stairs', entry: 'from_basement' },
      { at: [7, 10, 1, 1], to: 'mansion_coffin', entry: 'from_basement', sfx: 'door2',
        if: s => s.flag('c7_coffin_unlocked') || s.has('basement_key'),
        blocked: function* (s) { yield s.msg('A heavy iron door. It is locked tight.'); } },
    ],
    npcs: [
      { id: 'sephiroth', model: 'sephiroth', at: [28, 5], dir: 'up', show: s => !s.flag('c7_seph_library'),
        talk: function* (s) { yield* FF7.story.c7_sephLibrary(s); } },
    ],
    objects: [
      { at: [14, 6], talk: function* (s) { yield s.msg('A glass capsule. A faint green film still clings to the inside.'); } },
      { at: [14, 10], talk: function* (s) { yield s.msg('A research terminal. Most of the files have been wiped. One fragment remains:\n"...Specimen reaction to JENOVA cells: favorable..."'); } },
      { at: [19, 10], talk: function* (s) { yield s.msg('An operating table, strapped and stained. Someone was experimented on here.'); } },
      { at: [25, 6], talk: function* (s) { yield s.msg('Reports stacked high on the desk. The top one reads:\n"JENOVA: the organism recovered from the 2000-year-old stratum."'); } },
      { at: [24, 3], talk: function* (s) { yield s.msg('"Report on the Jenova Project, Vol. 1-7"\n"On the Ancients and the Promised Land"\nRow after row of Shinra research files.'); } },
      { at: [30, 10], talk: function* (s) { yield s.msg('"...the woman was implanted with JENOVA cells during pregnancy..."\nThe rest of the page has been torn out.'); } },
    ],
    triggers: [
      { id: 'library', at: [22, 8, 2, 2], once: true, if: s => !s.flag('c7_seph_library'),
        run: function* (s) { yield* FF7.story.c7_sephLibrary(s); } },
    ],
  });

  FF7.story.c7_sephLibrary = function* (s) {
    s.set('c7_seph_library');
    s.set('trig_mansion_basement_library');
    s.music('none');
    const ids = popOut(s, [[23, 8, 'right'], [23, 9, 'right']]);
    yield s.move('player', 25, 8);
    yield s.face('player', 'sephiroth');
    yield s.say('cloud', "Sephiroth!!");
    yield s.wait(30);
    yield s.face('sephiroth', 'player');
    s.music('chosen');
    yield s.say('sephiroth', "......So you came. Here, of all places. How nostalgic.");
    yield s.say('cloud', "What are you planning? And what's this 'Reunion' those men in black keep moaning about!?");
    yield s.say('sephiroth', "Jenova's cells were scattered across the world. In time, they will gather in one place again.\fThat is the Reunion. And I will be there, at its center.");
    yield s.say('cloud', "Jenova... the thing Shinra kept locked in the reactor. It was one of the Cetra, wasn't it?");
    yield s.say('sephiroth', "Heh heh heh... Is that what you believe?\fThose who wrote these reports called it something else. 'The Calamity from the Skies.'");
    yield s.say('cloud', "The Calamity... from the skies?");
    yield s.say('sephiroth', "The Reunion awaits in the north, Cloud. Follow, if you wish...\f...though you were never meant to be a part of it.");
    yield s.say('cloud', "What's that supposed to mean!?");
    s.sfx('heartbeat');
    yield s.flash('#ffffff', 16);
    yield s.jump('sephiroth', 28, 3, 2.4, 40);
    s.hide('sephiroth');
    yield s.flash('#ffffff', 10);
    yield s.wait(30);
    s.sfx('found');
    yield s.msg('Where Sephiroth stood, a single materia lies on the floor.');
    yield s.giveMateria('destruct');
    s.music('lurking');
    yield chime(s, [['tifa', "Cloud... are you all right? What did he mean, you were never meant to be part of it?"],
      ['aeris', "Cloud...? He was just trying to get to you. Don't let him."],
      ['barret', "Damn it! Slippery bastard, just vanishes like smoke!"]]);
    yield s.say('cloud', "......He's heading north. Past Mt. Nibel. Let's go.");
    tuckIn(s, ids);
  };

  // ---- Vincent's room
  FF7.story.c7_vincentCoffin = function* (s) {
    if (s.flag('vincent_joined')) { yield s.msg('An empty coffin, its lid pushed aside.'); return; }
    if (!s.flag('c7_vincent_1')) {
      yield s.msg('A large coffin, bigger than the others. The lid moves slightly under your hand...');
      s.sfx('door2');
      s.spawn('vincent', 'vincent', 9, 4, 'down', { name: 'Man in Red' });
      yield s.wait(40);
      yield s.say('Man in Red', "......Who's there? Who woke me from my nightmare?");
      yield s.say('cloud', "......Nightmare?");
      yield s.say('Man in Red', "A long, long nightmare. It is my punishment. ...What do you want?");
      yield s.say('cloud', "We're after Sephiroth.");
      yield s.emote('vincent', '!');
      yield s.say('Man in Red', "......Sephiroth? Tell me.");
      yield s.say('cloud', "Five years ago he burned this town and disappeared. Now he's back, and he's talking about a 'Reunion.'");
      yield s.say('Man in Red', "......I see. So it came to that.");
      yield s.say('cloud', "You know something about him?");
      yield s.say('Man in Red', "Nothing that talking will change. Leave. Let me go back to sleep.");
      s.remove('vincent');
      s.sfx('door2');
      yield s.msg('The lid slides shut.');
      s.set('c7_vincent_1');
      return;
    }
    if (!s.flag('c7_vincent_2')) {
      s.sfx('door2');
      s.spawn('vincent', 'vincent', 9, 4, 'down', { name: 'Man in Red' });
      yield s.wait(30);
      yield s.say('Man in Red', "......You again.");
      yield s.say('cloud', "Who are you? Why sleep down here?");
      yield s.say('Man in Red', "......I was a Turk. Shinra's General Affairs Department.");
      yield chime(s, [['barret', "A Turk!? Figures! Shinra's got creeps stashed in every basement!"], ['tifa', "The Turks...!?"]]);
      yield s.say('Man in Red', "Formerly. ...There was a woman. Lucrecia. A scientist, working here under a man named Hojo.\fThey used her in their experiment... the one that led to Sephiroth. I knew, and I didn't stop it.");
      yield s.say('Man in Red', "That is my sin. So I sleep here, and I atone. ...Now, leave.");
      s.remove('vincent');
      s.sfx('door2');
      yield s.msg('The lid slides shut again.');
      s.set('c7_vincent_2');
      return;
    }
    yield s.msg('The coffin is closed. Not a sound from inside.');
  };
  FF7.defineMap('mansion_coffin', {
    name: 'Shinra Mansion Basement', area: 'Shinra Mansion', theme: 'mansion', music: 'lurking',
    battle: { table: 'nibelheim_mansion_basement', bg: 'mansion' },
    // ref 08-nibelheim08: a dark purple stone vault lined with coffins, seen diagonally from above
    look: { wall: '#4e4258', trim: '#241c2c', wallTop: '#1e1824', floor: ['#3e3844', '#38323e'], sky: ['#000000', '#000000'] },
    camera: { yaw: -30, pitch: 60, dist: 9 },
    lights: [[1, 1, '#ffb060', 2], [18, 1, '#ffb060', 2], [9, 4, '#c04040', 2]],
    grid: [
      "####################",
      "#j................j#",
      "#..B...B....B...B..#",
      "#..................#",
      "#..B.....B.....B...#",
      "#..................#",
      "#..B...B....B...B..#",
      "#j................j#",
      "#########++#########",
    ],
    entries: { from_basement: [9, 7, 'up'] },
    exits: [{ at: [9, 8, 2, 1], to: 'mansion_basement', entry: 'from_coffin', sfx: 'door2' }],
    onLoad: function (s) { s.set('c7_coffin_unlocked'); },
    objects: [
      { at: [9, 4], talk: function* (s) { yield* FF7.story.c7_vincentCoffin(s); } },
      { at: [3, 2], talk: function* (s) { yield s.msg('A coffin. It is empty.'); } },
      { at: [16, 2], talk: function* (s) { yield s.msg('A coffin. Nothing inside but a moth-eaten cushion.'); } },
      { at: [3, 6], talk: function* (s) { yield s.msg('A coffin, sealed with rusted nails.'); } },
      { at: [15, 4], talk: function* (s) { yield s.msg('An empty coffin.'); } },
    ],
    triggers: [
      { id: 'vincent_join', at: [7, 7, 6, 1], once: true, if: s => s.flag('c7_vincent_2') && !s.flag('vincent_joined'),
        run: function* (s) { yield* FF7.story.c7_vincentJoin(s); } },
    ],
  });

  FF7.story.c7_vincentJoin = function* (s) {
    s.sfx('door2');
    s.spawn('vincent', 'vincent', 9, 4, 'down', { name: 'Man in Red' });
    yield s.wait(20);
    yield s.say('Man in Red', "......Wait.");
    yield s.move('vincent', 9, 6);
    yield s.face('player', 'vincent');
    yield s.say('Man in Red', "If I go with you... will I find Hojo?\fYou're fighting Shinra and chasing Sephiroth. Sooner or later, your road will lead to him.");
    yield s.say('cloud', "Probably.");
    yield s.say('Man in Red', "......Then I will come with you. My name... you'll want to know it.");
    yield s.nameEntry('vincent');
    s.join('vincent');
    s.set('vincent_joined');
    s.remove('vincent');
    yield s.msg(`${s.name('vincent')} joined the party.`);
    yield chime(s, [['yuffie', "Wait, the vampire guy is coming with us!? ...Cool, actually."], ['barret', "Just what we needed. Another weirdo."]]);
  };
})();

// Chapter 6b (part 3) — the Cave of the Gi with Bugenhagen: the rope descent, the caverns of sealed
// Gi spirits (secret passage, Added Effect ledge), the golden ooze and the spiked wall, the five
// tunnels and the Stinger's web, Gi Nattak, and Seto — petrified, still guarding the canyon.
// Ends with c6b_done and the farewell at the canyon gate (part2). (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c6b_gi_intro, c6b_gi_rock1..4, c6b_gi_secret, c6b_gi_web, c6b_gi_nattak, c6b_seto, c6b_done,
// c6b_buggy_repaired (c6b_buggy_broken unset). PHS is disabled from the sealed door (part2) until Seto.
(function () {
  // ------------------------------------------------------------------ helpers
  const MEMBERS = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const others = (s) => MEMBERS.filter(id => s.inParty(id));
  function spawnParty(s, spots) {
    const ids = others(s).slice(0, spots.length);
    ids.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'up', { name: s.name(id) }));
    return ids;
  }
  const clearParty = (s, ids) => ids.forEach(id => s.remove(id));
  const has = (ids, id) => ids.indexOf(id) >= 0;
  // Bugenhagen floats along through the cave (FF7: he follows the party); talk to him for hints.
  const inCave = (s) => s.flag('c6b_gi_open') && !s.flag('c6b_seto');
  const bugen = (at, text) => ({ id: 'bugen', name: 'Bugenhagen', model: 'bugenhagen', at, dir: 'down', solid: false, show: inCave,
    talk: function* (s) { yield s.say('bugen', text); } });
  const GI_BATTLE = (table) => ({ table, bg: 'cave', music: 'battle', noEscape: true });
  const CAVE_LOOK = { floor: ['#5a4232', '#543c2c'], floor2: ['#4a3628', '#443024'], wall: '#6a4a36', trim: '#2a1a10', sand: ['#d0a830', '#c8a02a'] };

  // ================================================================== the rope descent
  function* giIntro(s) {
    s.set('c6b_gi_intro');
    s.place('bugen', 11, 2, 'down');
    s.spawn('redxiii_i', 'redxiii', 8, 3, 'up', { name: s.name('redxiii') });
    yield s.say('bugen', "Ho ho hoo... Mind the ropes on the way down. They're older than most of the canyon's scholars.");
    yield s.say('redxiii', "The air in here is so heavy... It feels as if something is watching us.");
    yield s.say('bugen', "Something is. Long ago, the Gi tribe attacked Cosmo Canyon. They were driven back into this cave, and here they perished.\fBut their spirits could not return to the Planet. Their hatred holds them here, even now.");
    yield s.say('cloud', "Ghosts?");
    yield s.say('bugen', "Ho ho hoo. Call them whatever you like. They will certainly be calling you \"intruder\".");
    s.remove('redxiii_i');
    s.place('bugen', 12, 12, 'down');
  }

  FF7.defineMap('gi_descent', {
    name: 'Cave of the Gi', area: 'Cave of the Gi', theme: 'cave', look: CAVE_LOOK, music: 'lurking',
    battle: { table: 'cave_of_gi_1', bg: 'cave', rate: 0.8 },
    grid: [
      "########################",
      "#######hh++hh###########",
      "       ......  #########",
      "       ......  #########",
      "         H     #########",
      "   ............#########",
      "   ............#########",
      "    H          #########",
      "  ..........   #########",
      "  ..........   #########",
      "          ^    #########",
      "  ....................::",
      "  ...R........U.......::",
      "  ...................R::",
      "  ######################",
    ],
    heights: [
      "999999999999999999999999",
      "999999999999999999999999",
      "000000099999900555555555",
      "000000099999900555555555",
      "000000000700000555555555",
      "000555555555555555555555",
      "000555555555555555555555",
      "000030000000000555555555",
      "002222222222000555555555",
      "002222222222000555555555",
      "000000000010000555555555",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_door: [9, 2, 'down'], from_caverns: [22, 12, 'left'] },
    exits: [
      { at: [9, 1, 2, 1], to: 'cosmo_gihall', entry: 'from_cave' },
      { at: [23, 11, 1, 3], to: 'gi_caverns', entry: 'from_descent' },
    ],
    npcs: [bugen([12, 12], "The spirits of the Gi lie sealed further in. Keep your wits about you.\fAnd your weapons. Ho ho hoo.")],
    objects: [
      { at: [14, 12], talk: function* (s) { yield s.msg("A cluster of pale crystals, growing out of the rock like frozen flames."); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c6b_gi_intro')) yield* giIntro(s);
    },
  });

  // ================================================================== the caverns of the sealed spirits
  const ROCK = { enemy: 'trickplay', scale: 0.7 };
  function* breakRock(s, n, table) {
    yield s.msg("A strange rock, shaped like a face frozen in a scream. Something seems to be sealed inside it.");
    const c = yield s.ask(null, 'Break the rock?', ['Break it', 'Leave it alone']);
    if (c !== 0) return;
    s.sfx('hit');
    s.shake(3, 20);
    s.set('c6b_gi_rock' + n);
    s.remove('gi_rock' + n);
    if (!table) {
      // the third cave: the secret entrance
      s.set('c6b_gi_secret');
      s.block(14, 4, false);
      yield s.msg("The rock crumbles to dust... revealing a narrow passage that leads deeper into the cave.");
      if (inCave(s)) yield s.say('bugen', "Ho ho hoo! A hidden way through. The Gi were cleverer than they looked.");
      return;
    }
    yield s.msg("The rock shatters! A freezing wind howls out of the stone, and pale shapes take form in it...");
    yield s.battle(GI_BATTLE(table));
    if (inCave(s)) yield s.say('bugen', "The spirits of the Gi... After all these years, their hatred still hasn't faded.");
  }
  const rockNpc = (n, at, table) => ({ id: 'gi_rock' + n, name: 'Strange Rock', model: ROCK, at, dir: 'down',
    show: s => !s.flag('c6b_gi_rock' + n), talk: function* (s) { yield* breakRock(s, n, table); } });

  FF7.defineMap('gi_caverns', {
    name: 'Cave of the Gi', area: 'Cave of the Gi', theme: 'cave', look: CAVE_LOOK, music: 'lurking',
    battle: { table: 'cave_of_gi_1', bg: 'cave', rate: 1 },
    grid: [
      "##############.#########.#####",
      "##############.#######.......#",
      "##############.#######.......#",
      "##############.#######.......#",
      "##############.#######.......#",
      "###...##...##...#...##.......#",
      "###...##...##...#...##.......#",
      "###...##...##...#...##..U....#",
      "#............................#",
      ".............................#",
      "#.....R..............R.......#",
      "#............................#",
      "##############################",
    ],
    heights: [
      "555555555555550555555555555555",
      "555555555555550555555555555555",
      "555555555555550555555555555555",
      "555555555555550555555555555555",
      "555555555555550555555500000005",
      "555000550005500050005500000005",
      "555000550005500050005500000005",
      "555000550005500050005500000005",
      "500000000000000000000000000005",
      "000000000000000000000000000005",
      "500000000000000000000000000005",
      "500000000000000000000000000005",
      "000000000000000000000000000000",
    ],
    entries: { from_descent: [1, 9, 'right'], from_oil: [14, 1, 'down'], from_oil_upper: [24, 1, 'down'] },
    exits: [
      { at: [0, 9, 1, 1], to: 'gi_descent', entry: 'from_caverns' },
      { at: [14, 0, 1, 1], to: 'gi_oil', entry: 'from_caverns' },
      { at: [24, 0, 1, 1], to: 'gi_oil', entry: 'from_ledge' },
    ],
    items: [{ at: [26, 2], materia: 'added_effect', id: 'gi_caverns_added_effect' }],
    npcs: [
      bugen([2, 10], "Faces in the stone... Some of them seal the spirits of the Gi inside.\fBut that third one along, on the north wall... it feels different somehow. Ho ho hoo. Or perhaps my old eyes are playing tricks."),
      rockNpc(1, [4, 5], 'event_gi_spectors'),
      rockNpc(2, [9, 5], 'event_gi_spectors_b'),
      rockNpc(3, [14, 5], null),
      rockNpc(4, [18, 5], 'event_gi_spectors'),
    ],
    triggers: [
      { id: 'ledge', at: [22, 4, 7, 3], once: true, if: s => !s.flag('got_gi_caverns_added_effect'),
        run: function* (s) {
          yield s.face('player', 'up');
          yield s.say('cloud', "(Materia... up on that ledge. No way to climb up from here, though.)");
          if (inCave(s)) yield s.say('bugen', "Ho ho hoo. Where there's a ledge, there's usually a way onto it. Perhaps from further in.");
        } },
    ],
    onLoad: function (s) {
      if (!s.flag('c6b_gi_secret')) s.block(14, 4);
    },
  });

  // ================================================================== the golden ooze and the spiked wall
  // FF7: walking over the ooze is safe; running makes Cloud slip into the spikes.
  const running = (s) => { const a = s.actor ? s.actor('player') : null; return !!(a && a.running); };
  const slip = (x) => function* (s) {
    s.sfx('run');
    yield s.move('player', x, 9, { run: true });
    yield s.face('player', 'up');
    s.anim('player', 'hurt');
    s.sfx('hit');
    s.shake(4, 24);
    s.flash('#ff2020', 10, 0.4);
    yield s.msg(`Whoa--! ${s.name('cloud')} slips on the golden ooze and slams into the spiked wall!`);
    s.stopAnim('player');
    if (s.inc('c6b_gi_slips') === 1 && inCave(s)) yield s.say('bugen', "Ho ho hoo! I did say to walk, didn't I?");
  };
  const OIL = [];
  for (let y = 9; y <= 10; y++) for (let x = 3; x <= 13; x++) OIL.push({ at: [x, y], once: false, if: running, run: slip(x) });

  FF7.defineMap('gi_oil', {
    name: 'Cave of the Gi', area: 'Cave of the Gi', theme: 'cave', look: CAVE_LOOK, music: 'lurking',
    battle: { table: 'cave_of_gi_2', bg: 'cave', rate: 1 },
    lights: [[8, 9, '#ffd060', 3]],
    grid: [
      "####################..########",
      "#.......R...........::....R..#",
      "#....................::......#",
      "#...R.........U......::......#",
      "#............................#",
      "#......U................R....#",
      "#............................#",
      "#............................#",
      "  ^UUUUUUUUUUUUUU             ",
      "  .sssssssssss...             ",
      "  .sssssssssss...             ",
      "  .           .               ",
      "  .           .               ",
      "  .           .               ",
      "  .           .               ",
      "  .           .               ",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "002444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
      "004444444444444440000000000000",
    ],
    entries: { from_caverns: [14, 14, 'up'], from_ledge: [2, 14, 'up'], from_web: [20, 1, 'down'] },
    exits: [
      { at: [2, 15, 1, 1], to: 'gi_caverns', entry: 'from_oil_upper' },
      { at: [14, 15, 1, 1], to: 'gi_caverns', entry: 'from_oil' },
      { at: [20, 0, 2, 1], to: 'gi_web', entry: 'from_oil' },
    ],
    chests: [
      { at: [24, 6], item: 'black_m_phone', id: 'gi_oil_black_mphone' },
      { at: [5, 2], item: 'ether', id: 'gi_oil_ether' },
    ],
    npcs: [bugen([16, 10], "Careful! That golden muck is slick as ice. Walk across nice and slowly.\fRun, and you'll be giving those spikes a hug. Ho ho hoo.")],
    objects: [
      { at: [8, 8], talk: function* (s) { yield s.msg("Jagged stone spikes jut out of the wall, stained dark at the tips. Best not to find out with what."); } },
    ],
    triggers: OIL,
    onEnter: function* (s) {
      if (s.flag('c6b_gi_oil_seen')) return;
      s.set('c6b_gi_oil_seen');
      if (inCave(s)) yield s.say('bugen', "Hmm. That golden stuff on the ground... Walk, don't run. Trust an old man on this one.");
    },
  });

  // ================================================================== the five tunnels and the Stinger's web
  FF7.defineMap('gi_web', {
    name: 'Cave of the Gi', area: 'Cave of the Gi', theme: 'cave', look: CAVE_LOOK, music: 'lurking',
    battle: { table: 'cave_of_gi_3', bg: 'cave', rate: 1 },
    grid: [
      "##############################",
      "##..........................##",
      "##.########################.##",
      "##.#####+##########.....###.##",
      "##.#####.#####.####.....###.##",
      "##.#####.#####.#####.######.##",
      "##.#####.#####.#####.######.##",
      "##.#####.#####.#####.######.##",
      "##.#####.#####.#####.######.##",
      "##.#####.#####.#####.######.##",
      "##..........................##",
      "##..........................##",
      "##....R..............R......##",
      "##############..##############",
      "              ..              ",
      "              ..              ",
    ],
    entries: { from_oil: [14, 14, 'up'], from_nattak: [8, 4, 'down'] },
    exits: [
      { at: [8, 3, 1, 1], to: 'gi_nattak', entry: 'from_web' },
      { at: [14, 15, 2, 1], to: 'gi_oil', entry: 'from_web' },
    ],
    chests: [{ at: [22, 3], item: 'x_potion', id: 'gi_web_xpotion' }],
    npcs: [
      bugen([16, 11], "Five tunnels... Ho ho hoo. Some lead onward, some lead nowhere at all, and some lead right back where they started.\fRather like an old man's stories."),
      { id: 'stinger', name: 'Stinger', model: { enemy: 'stinger', scale: 0.8 }, at: [20, 6], dir: 'down', show: s => !s.flag('c6b_gi_web'),
        talk: function* (s) {
          yield s.msg("Thick, sticky threads are strung across the tunnel. Something large shifts in the shadows of the web...");
          const c = yield s.ask(null, 'Cut through the web?', ['Cut it down', 'Leave it']);
          if (c !== 0) return;
          s.sfx('hit');
          yield s.msg("The web tears apart -- and its owner drops down from the ceiling!");
          yield s.battle(GI_BATTLE('event_gi_stinger'));
          s.set('c6b_gi_web');
          s.remove('stinger');
          s.block(20, 5, false);
        } },
    ],
    objects: [
      { at: [14, 3], talk: function* (s) { yield s.msg("A dead end. Scratches in the rock look like someone once tried to dig further... and gave up."); } },
    ],
    onLoad: function (s) {
      if (!s.flag('c6b_gi_web')) s.block(20, 5);
    },
  });

  // ================================================================== Gi Nattak
  function* giNattak(s) {
    yield s.face('player', 'up');
    const pty = spawnParty(s, [[13, 5, 'up'], [17, 5, 'up']]);
    s.place('bugen', 15, 7, 'up');
    yield s.cam(15, 3, 40);
    yield s.say('bugen', "Careful... That face in the wall. I can feel a terrible hatred pouring out of it.");
    s.flash('#ff4020', 24, 0.6);
    s.sfx('fire');
    s.shake(3, 40);
    yield s.emote('gi_face', '!');
    yield s.say('gi_face', "Who dares walk the halls of the Gi...?\fThat scent... The blood of Seto! The accursed warrior who stood against us!");
    yield s.say('gi_face', "His kin shall never leave this place. At long last, the Gi shall have their vengeance!");
    yield s.say('bugen', "Gi Nattak... the chieftain of the Gi! Nanaki, Cloud -- here he comes!");
    yield s.battle({ table: 'boss_gi_nattak', bg: 'cave', music: 'boss', noEscape: true });
    s.music('lurking');
    yield s.say('gi_face', "The Gi... cannot... fall... to Seto's...");
    s.flash('#ffffff', 30, 0.8);
    s.remove('gi_face');
    s.block(15, 1, false);
    s.set('c6b_gi_nattak');
    yield 30;
    yield s.say('bugen', "Ho ho hoo... Rest now, Gi Nattak. Let go of your hatred, and go back to the Planet.");
    yield s.msg("Where Gi Nattak stood, a materia lies glowing on the cave floor.");
    yield s.giveMateria('gravity');
    yield s.say('redxiii', "Grandfather... Is Father beyond here?");
    yield s.say('bugen', "Ho ho hoo. Yes. Just beyond. Come, Nanaki.");
    yield s.move('bugen', 15, 2);
    s.hide('bugen');
    s.camFollow();
    clearParty(s, pty);
  }

  FF7.defineMap('gi_nattak', {
    name: 'Cave of the Gi', area: 'Cave of the Gi', theme: 'cave', look: CAVE_LOOK, music: 'lurking',
    battle: { table: 'cave_of_gi', bg: 'cave', rate: 0.6, if: s => !s.flag('c6b_gi_nattak') },
    lights: [[15, 2, '#ff6030', 2.5]],
    grid: [
      "###############.##############",
      "#..############.##############",
      "#..###########...#############",
      "#..#.........................#",
      "#...........R.............R..#",
      "####.........................#",
      "####....U................U...#",
      "####.........................#",
      "####......R..........R.......#",
      "####.........................#",
      "####.........................#",
      "    .                  ..     ",
      "    .                  ..     ",
      "    .                  ..     ",
      "    ......             ..     ",
      "                       ..     ",
      "                       ..     ",
      "                       ..     ",
    ],
    entries: { from_web: [23, 16, 'up'], from_seto: [15, 1, 'down'] },
    exits: [
      { at: [15, 0, 1, 1], to: 'gi_seto', entry: 'from_cave' },
      { at: [23, 17, 2, 1], to: 'gi_web', entry: 'from_nattak' },
    ],
    chests: [
      { at: [9, 14], item: 'fairy_ring', id: 'gi_nattak_fairy_ring' },
      { at: [1, 1], item: 'turbo_ether', id: 'gi_nattak_turbo_ether' },
    ],
    npcs: [
      bugen([24, 9], "Ho ho hoo... We are close now. Close to the place where it all happened.\fIf you have any preparations to make, make them here."),
      { id: 'gi_face', name: 'Gi Nattak', model: { enemy: 'gi_nattak', scale: 0.9 }, at: [15, 2], dir: 'down', show: s => !s.flag('c6b_gi_nattak') },
    ],
    triggers: [
      { id: 'boss', at: [12, 3, 7, 2], once: true, if: s => !s.flag('c6b_gi_nattak'), run: function* (s) { yield* giNattak(s); } },
    ],
    onLoad: function (s) {
      if (!s.flag('c6b_gi_nattak')) s.block(15, 1);
    },
  });

  // ================================================================== Seto
  // Petrified Seto: the Red XIII rig has fixed colours, so use the generic quadruped rig in stone grey.
  const SETO = { base: 'dog', c1: '#8a847a', c2: '#a8a296' };

  function* setoScene(s) {
    const pty = spawnParty(s, [[11, 9, 'up'], [13, 9, 'up']]);
    if (!has(pty, 'redxiii')) s.spawn('redxiii', 'redxiii', 11, 9, 'up', { name: s.name('redxiii') });
    s.spawn('bugen', 'bugenhagen', 14, 8, 'up', { name: 'Bugenhagen' });
    yield s.move('player', 12, 8);
    yield s.cam(12, 5, 60);
    yield s.say('bugen', "Nanaki. Look. There he stands.");
    yield s.move('redxiii', 12, 5);
    yield s.say('redxiii', "......That's... Father?");
    s.music('warrior');
    yield s.say('bugen', "This is the truth I kept from you. When the Gi came, Seto and the warriors of the canyon went out to meet them.\fAnd Seto held this pass. Alone.");
    yield s.say('bugen', "The Gi's arrows were tipped with a poison that turns living flesh to stone.\fArrow after arrow struck him... and still he did not give up a single step of ground.");
    yield s.say('bugen', "Even turned to stone, he stood his guard. He stands it still.\fNot one of the Gi ever reached the canyon again.");
    yield s.say('redxiii', "He never ran away... He was protecting us. All this time, he was protecting all of us.");
    yield s.say('redxiii', "And I... I called him a coward. For all those years, I...");
    yield s.say('bugen', "Nanaki. Seto was a true warrior of our people, and you are his son.\fHold your head high.");
    yield 60;
    yield s.cam(12, 3, 50, { dist: 6, pitch: 30 });
    yield s.emote('seto', '...', 90, '#60a0ff');
    yield s.msg("Something glistens on Seto's stone face...\fTears. Tears are running down the petrified cheeks.");
    yield s.say('redxiii', "Father......!");
    // the howl
    yield s.jump('redxiii', 13, 4, 0.9, 30);
    yield s.face('redxiii', 'up');
    s.anim('redxiii', 'lookup');
    // FF7's FMV: Seto on the cliff under the moon, Nanaki's howl
    yield s.movie('seto', { text: "Red XIII's howl rings out across Cosmo Canyon..." });
    yield 30;
    s.stopAnim('redxiii');
    yield s.cam(12, 6, 40, { dist: 9.5, pitch: 50 });
    s.place('redxiii', 12, 6, 'down');
    yield s.say('redxiii', "Grandfather. I'm going with Cloud.\fI want to see what's happening to the Planet with my own eyes... and I want to become a warrior, like my father.");
    yield s.say('bugen', "Ho ho hoo! That is exactly what I hoped to hear.\fGo, Nanaki. You are young -- to our kind, still barely more than a child. See the world, and then come back and tell this old man all about it.");
    yield s.say('redxiii', "I will. I promise.");
    yield s.face('redxiii', 'player');
    yield s.say('redxiii', "Cloud... Thank you for coming with me. I'm ready now. Let's go.");
    yield s.say('bugen', "Ho ho hoo. Take this with you, Nanaki. A warrior should be properly equipped.");
    yield s.give('seraph_comb');
    s.set('c6b_seto');
    s.set('c6b_done');
    s.unset('c6b_buggy_broken');
    s.set('c6b_buggy_repaired');
    s.phs(true);
    s.camFollow();
    yield s.fadeOut(60);
    clearParty(s, pty);
    s.remove('redxiii');
    s.remove('bugen');
    yield s.goto('cosmo_gate', 'farewell');
  }

  FF7.defineMap('gi_seto', {
    name: 'Cosmo Canyon Cliffs', area: 'Cave of the Gi', theme: 'canyon',
    music: s => s.flag('c6b_seto') ? 'cosmo' : 'none',
    look: { sky: ['#c86030', '#f0c080'], fog: { color: [0.8, 0.5, 0.32], near: 14, far: 34 } },
    grid: [
      "                        ",
      "                        ",
      "                        ",
      "##RR.......R........RR##",
      "##....................##",
      "##..R................R##",
      "##....................##",
      "###..................###",
      "####....R.......R...####",
      "#####..............#####",
      "######.....:::....######",
      "###########::###########",
    ],
    entries: { from_cave: [12, 10, 'up'] },
    exits: [{ at: [11, 11, 2, 1], to: 'gi_nattak', entry: 'from_seto' }],
    npcs: [
      { id: 'seto', name: 'Seto', model: SETO, scale: 1.6, at: [12, 3], dir: 'up', talk: function* (s) {
        yield s.msg("Seto stands at the edge of the cliff, turned to stone, gazing out over the canyon.\fHe is still standing guard, just as he always has.");
      } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c6b_seto')) yield* setoScene(s);
    },
  });
})();

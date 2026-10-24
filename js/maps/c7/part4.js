// Chapter 7 (part 4) — The Da-chao statues north of Wutai (the base and its western hand, the U-turn and
// the eastern hand, the cavern exterior with the Dragoon Lance cave and the fire cave — Oritsuru and
// Steal as Well once the Leviathan Scales can douse the flames — and the top, where Don Corneo holds
// Yuffie and Elena: Rapps, the Turks settle with Corneo, Yuffie returns the materia). Then Godo's
// Pagoda: Yuffie alone against Gorky, Shake, Chekhov, Staniv and Godo (All Creation drops from Godo,
// Leviathan materia from his hand).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c7_dachao_fire_out, c7_wq_rapps, c7_wutai_done (quest over), c7_pagoda_on (Yuffie alone in the
// Pagoda), c7_pg1..c7_pg5 (floors won this attempt), c7_pagoda_done. Vars: c7_pagoda_party, c7_pagoda_phs.
(function () {
  const TEAM = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const mates = (s) => TEAM.filter(id => s.inParty(id));
  function* chime(s, lines) {
    for (const [id, text] of lines) if (id === 'cloud' || s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  const questOn = (s) => s.flag('c7_wq_stolen') && !s.flag('c7_wutai_done');
  const yuf = (s) => s.name('yuffie') || 'Yuffie';
  const DC = 'wutai';
  // refs 09-rockettown21, 22, 26, 27, scenes/ff7art19: carved grey-brown rock, earthy slopes and dark
  // trees under a warm evening sky
  const DC_LOOK = { floor: ['#7a6e5a', '#746854'], floor2: ['#8e7e62', '#86765a'], wall: '#7e766a', trim: '#4a4438', wallTop: '#5a5244', grass: ['#56603a', '#505a34'],
    sky: ['#5a6e98', '#e8b890'], fog: { color: [0.7, 0.62, 0.56], near: 12, far: 30 }, light: [0.95, 0.82, 0.66] };

  // ================================================================== DA-CHAO
  FF7.defineMap('wutai_dachao_base', {
    name: 'Da-chao', area: 'Wutai', theme: 'wutai', music: 'wutai',
    look: DC_LOOK,
    battle: { table: 'da_chao_base', bg: DC },
    grid: [
      "XXXXXXXXXXXXXXXXXXXX::XXXXXXXXXX",
      "XXuuXXXXXXXXXXXXXXRR::RRXXXuuXXX",
      "RR,,,,,,,,,,,,,,,,,,::,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,,,,,::,,,,R,,,RR",
      "RR,,,,,,,,,,,,,::::::,,,,,,,,,RR",
      "RR,,uuu,,,,,,,,:,,,,,,,,,,,,,,RR",
      "RR,uuuuu,,,,,,,:,,,,,,,,,,,,,,RR",
      "RR,uuuuu,R,,,,,:,,,,,,,,T,,,,,RR",
      "RR,,.....^:::::,,,,,,,,,,,,,,,RR",
      "RR,......RR:,,,,,,,,,,,,,,,,,,RR",
      "RR,......RR:,,,,,,,,,,,,R,,,,,RR",
      "RRRRRRRRRRR:,,,,,,,,,,,,,,,,,,RR",
      "RR,,,,,,,,,:,,,,,,,,,,,,,,,,,,RR",
      "RR,,,,,,,,,::::::,,,,,,,,,,,,,RR",
      "RR,,,,R,,,,,,,,:,,,,,,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,:,,,,,,,,R,,,,,RR",
      "RRRRRRRRRRRRRR:::RRRRRRRRRRRRRRR",
      "              :::               ",
    ],
    heights: [
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00003333310000000000000000000000",
      "00033333300000000000000000000000",
      "00033333300000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    entries: { from_wutai: [15, 15, 'up'], from_mid: [20, 2, 'down'] },
    exits: [
      { at: [14, 17, 3, 1], to: 'wutai_town', entry: 'from_dachao' },
      { at: [20, 0, 2, 1], to: 'wutai_dachao_mid', entry: 'from_base' },
    ],
    objects: [
      { at: [4, 5], talk: function* (s) { yield s.msg("A colossal stone hand juts from the mountainside, palm up, as if offering the valley to the sky."); } },
      { at: [2, 1], talk: function* (s) { yield s.msg('The weathered face of one of the Da-chao gods, carved into the cliff. Its eyes are closed in prayer.'); } },
      { at: [27, 1], talk: function* (s) { yield s.msg('Another great stone face. Moss grows in the corners of its stern mouth.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c7_dachao_seen')) return;
      s.set('c7_dachao_seen');
      yield s.wait(20);
      yield s.say('cloud', "(Da-chao... Faces of gods, carved right into the mountain.)");
      if (questOn(s) && s.flag('c7_wq_turks')) yield chime(s, [['barret', "Corneo's up top somewhere. Let's move!"], ['tifa', "Yuffie's up there. Let's hurry."]]);
    },
  });

  FF7.defineMap('wutai_dachao_mid', {
    name: 'Da-chao', area: 'Wutai', theme: 'wutai', music: 'wutai',
    look: DC_LOOK,
    battle: { table: 'da_chao_lower_junction', bg: DC },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXX::XXXX",
      "XXXuuuXXXXXXXXXXXXXXXXXXRR::RRXX",
      "RR,,,,,,,,,,,,,,,,,,,,,,,,::,,RR",
      "RR,,,,,R,,,,,,,,,,,,,,,,,,::,,RR",
      "RR,,,,,,,,,,,,,,,,,,,,,,,,,:,,RR",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRR^RRRR",
      "RR,,,,,,,,,,,,,,,,,,,,,,,,,:,,RR",
      "RR,,,,,,,,,,,,,,,,,,,,,,,,,:,uRR",
      "RR,,::::::::::::::::::::::::,,RR",
      "RR,,:,,,,,,,,,,R,,,,,,,,,,,,,,RR",
      "RRRR^RRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "RR,,:,,,,,,,,,,,,,,,,,,,,,,,,,RR",
      "RR,,:,,,,,,T,,,,,,,,,,,,,,,,,,RR",
      "RR,,::::::::::::::,,,,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,,:,,,,,,,,R,,,RR",
      "RR,,,,,R,,,,,,,,,:,,,,,,,,,,,,RR",
      "RRRRRRRRRRRRRRRR:::RRRRRRRRRRRRR",
      "                :::             ",
    ],
    heights: [
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666666666",
      "66666666666666666666666666646666",
      "33333333333333333333333333333333",
      "33333333333333333333333333333333",
      "33333333333333333333333333333333",
      "33333333333333333333333333333333",
      "33331333333333333333333333333333",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    entries: { from_base: [17, 15, 'up'], from_ledge: [26, 2, 'down'] },
    exits: [
      { at: [16, 17, 3, 1], to: 'wutai_dachao_base', entry: 'from_mid' },
      { at: [26, 0, 2, 1], to: 'wutai_dachao_ledge', entry: 'from_mid' },
    ],
    objects: [
      { at: [29, 7], talk: function* (s) { yield s.msg("The eastern hand of Da-chao. Someone has left a bowl of rice and a paper charm on the stone palm."); } },
      { at: [4, 1], talk: function* (s) { yield s.msg('Three stone faces watch the path, each wearing a different expression: calm, anger, sorrow.'); } },
    ],
  });

  function* fireCave(s) {
    if (s.has('leviathan_scales')) {
      yield s.msg('Flames roar out of the cave mouth, blocking the way.');
      const c = yield s.ask(null, 'Use the Leviathan Scales?', ['Use them', 'Not now']);
      if (c !== 0) return;
      s.sfx('heal2');
      yield s.flash('#80c0ff', 20);
      s.set('c7_dachao_fire_out');
      yield s.msg('The scales shimmer, and a rush of cold seawater pours from them. With a great hiss of steam, the flames die out.');
      return;
    }
    yield s.msg('Flames roar out of the cave mouth. There is no way through.\n(If only there were some way to put them out...)');
  }
  FF7.defineMap('wutai_dachao_ledge', {
    name: 'Da-chao', area: 'Wutai', theme: 'wutai', music: 'wutai',
    look: DC_LOOK,
    battle: { table: 'da_chao_upper_junction', bg: DC },
    lights: [[24, 6, '#ff7030', 3], [27, 6, '#ff7030', 3], [25, 5, '#ff8040', 3]],
    grid: [
      "XXXXXXXXXXXXXXXXXXX::XXXXXXXXXXX",
      "XXXuuuXXXXXXXXXXXRR::RRXXXuuuXXX",
      "RR,,,,,,,,,,,,,,,,,::,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,,,,::,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,,,::,,,,,,,,,,RR",
      "RRRRRR++RRRRR,,,::,,,RRRR++RRRRR",
      "RR,,,,,,,,,,,,,,::,,,,,,L,,L,,RR",
      "RR,,,,S,,,,,,,,,::,,,,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,::,,,,,,,,,,,,RR",
      "RR,,,,,,,,,,,,,,::,,,,,,,,,,,,RR",
      "RR,,,,R,,,,,,,,,::,,,,,,,R,,,,RR",
      "RR,,,,,,,,,,,,,,::,,,,,,,,,,,,RR",
      "RRRRRRRRRRRRRRRR::RRRRRRRRRRRRRR",
      "                ::              ",
    ],
    entries: { from_mid: [16, 11, 'up'], from_cave: [6, 6, 'down'], from_fire: [25, 6, 'down'], from_top: [19, 2, 'down'] },
    exits: [
      { at: [16, 13, 2, 1], to: 'wutai_dachao_mid', entry: 'from_ledge' },
      { at: [6, 5, 2, 1], to: 'wutai_dachao_cave', entry: 'from_ext' },
      { at: [25, 5, 2, 1], to: 'wutai_dachao_fire', entry: 'from_ext', if: s => s.flag('c7_dachao_fire_out'), blocked: fireCave },
      { at: [19, 0, 2, 1], to: 'wutai_dachao_top', entry: 'from_ext' },
    ],
    npcs: [
      { id: 'rude', name: 'Rude', model: 'rude', at: [18, 8], dir: 'up', show: s => questOn(s) && s.flag('c7_wq_turks') && !s.flag('c7_wq_rapps'),
        talk: function* (s) {
          yield s.say('Rude', "......Corneo is at the top. With Elena... and your girl.");
          yield s.say('Rude', "......There's a cave over there. Take what you need first. Then go.");
        } },
    ],
    objects: [
      { at: [4, 1], talk: function* (s) { yield s.msg('Three more carved faces peer down from the cliff.'); } },
    ],
  });

  FF7.defineMap('wutai_dachao_cave', {
    name: 'Da-chao Cave', area: 'Wutai', theme: 'cave', music: 'wutai',
    lights: [[20, 2, '#ffd080', 3], [4, 3, '#a0c0ff', 2]],
    grid: [
      "########################",
      "#U.....R........R....U.#",
      "#......................#",
      "#...U.........U........#",
      "#......................#",
      "#..R...........R.....U.#",
      "#......................#",
      "#U..........R..........#",
      "#......................#",
      "#######++###############",
    ],
    entries: { from_ext: [7, 8, 'up'] },
    exits: [{ at: [7, 9, 2, 1], to: 'wutai_dachao_ledge', entry: 'from_cave' }],
    chests: [{ at: [20, 2], item: 'dragoon_lance', id: 'wutai_dachao_cave_dragoon_lance' }],
    objects: [
      { at: [4, 3], talk: function* (s) { yield s.msg('A crystal formation, faintly glowing. Old prayer strips are tied around it.'); } },
    ],
  });

  FF7.defineMap('wutai_dachao_fire', {
    name: 'Da-chao Fire Cave', area: 'Wutai', theme: 'cave', music: 'wutai',
    look: { wall: '#6a3a28', trim: '#3a1a10', floor: ['#4a3028', '#442a22'] },
    lights: [[9, 1, '#ff6020', 4], [1, 5, '#ff6020', 2], [18, 5, '#ff6020', 2]],
    grid: [
      "####################",
      "#U.......LL.......U#",
      "#..................#",
      "#...U..........U...#",
      "#..................#",
      "#L................L#",
      "#..................#",
      "########++##########",
    ],
    entries: { from_ext: [8, 6, 'up'] },
    exits: [{ at: [8, 7, 2, 1], to: 'wutai_dachao_ledge', entry: 'from_fire' }],
    chests: [{ at: [3, 2], item: 'oritsuru', id: 'wutai_dachao_fire_oritsuru' }],
    items: [{ at: [16, 2], materia: 'steal_as_well', id: 'wutai_dachao_fire_steal_as_well' }],
  });

  // ---- the top of Da-chao: Corneo, Rapps, the Turks
  FF7.defineMap('wutai_dachao_top', {
    name: 'Da-chao Summit', area: 'Wutai', theme: 'wutai', music: s => questOn(s) && s.flag('c7_wq_turks') ? 'corneo' : 'wutai',
    look: Object.assign({}, DC_LOOK, { fog: { color: [0.62, 0.72, 0.86], near: 14, far: 36 } }),
    grid: [
      "XXXXXXXXXXXuuuuuuuuXXXXXXXXXXX",
      "XXXXXXXXXXXuuuuuuuuXXXXXXXXXXX",
      "           u......u           ",
      "           ........           ",
      "  ......   ........   ......  ",
      "  ......KKK........KKK......  ",
      "  ......   ........   ......  ",
      "  ......   ........   ......  ",
      "           ........           ",
      "           RRR^^RRR           ",
      "           RRR^^RRR           ",
      "          ..........          ",
      "          ....:.....          ",
      "          ....::....          ",
      "          ....::....          ",
      "          RRRR::RRRR          ",
    ],
    heights: [
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "000000000006666666600000000000",
      "000000000006666666600000000000",
      "006666660006666666600066666600",
      "006666666666666666666666666600",
      "006666660006666666600066666600",
      "006666660006666666600066666600",
      "000000000006666666600000000000",
      "000000000006663366600000000000",
      "000000000006663366600000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_ext: [14, 14, 'up'] },
    exits: [{ at: [14, 15, 2, 1], to: 'wutai_dachao_ledge', entry: 'from_top' }],
    objects: [
      { at: [15, 1], talk: function* (s) { yield s.msg('The crown of the greatest Da-chao god. From up here, all of Wutai and the western sea spread out below.'); } },
    ],
    onEnter: function* (s) {
      if (questOn(s) && s.flag('c7_wq_turks') && !s.flag('c7_wq_rapps')) yield* FF7.story.c7_dachaoFinale(s);
    },
  });

  FF7.story.c7_dachaoFinale = function* (s) {
    s.music('corneo');
    s.spawn('corneo', 'corneo', 15, 3, 'down', { name: 'Don Corneo' });
    s.spawn('yuffie_t', 'yuffie', 4, 5, 'right', { name: yuf(s), anim: 'kneel' });
    s.spawn('elena_t', 'elena', 25, 5, 'left', { name: 'Elena', anim: 'kneel' });
    const ids = mates(s).slice(0, 2);
    ids.forEach((id, i) => s.spawn(id, id, 14 + i, 14, 'up', { name: s.name(id) }));
    yield s.wait(20);
    yield s.say('Don Corneo', "Hoo-hoo-hooo! Now then, my lovelies... which one of you will be my bride tonight?\fThe feisty little ninja? Or the prim and proper Turk? Decisions, decisions!");
    yield s.say('yuffie', "Ugh! Gross! Get away from me, you slimy old toad!");
    yield s.say('Elena', "You'll regret this, Corneo! When the Turks find you—");
    yield s.say('Don Corneo', "Hoo-hoo! Such spirit! Then I choose...");
    yield [s.move('player', [[14, 11], [14, 8], [14, 7]]), ...ids.map((id, i) => s.move(id, [[14 + i, 11], [14 + i, 9], [13 + i * 3, 8]]))];
    yield s.say('cloud', "Corneo.");
    yield s.emote('corneo', '!!');
    yield s.say('Don Corneo', "Wha—!? YOU again!? Don't you people ever give up!?");
    yield s.say('cloud', "Let them go.");
    yield s.say('Don Corneo', "Hoo-hoo... Not a chance! Time to meet my darling pet! Come out, Rapps!");
    s.sfx('howl');
    s.shake(5, 40);
    s.spawn('rapps', { enemy: 'rapps' }, 15, 4, 'down', { name: 'Rapps' });
    yield s.jump('rapps', 15, 5, 1.2, 30);
    yield s.battle({ table: 'boss_rapps', bg: DC, music: 'boss', noEscape: true });
    s.remove('rapps');
    s.music('corneo');
    yield s.say('Don Corneo', "M-my Rapps!? No... no, no, no!");
    yield s.move('corneo', 15, 2);
    yield s.say('Don Corneo', "H-hold on! Let's talk like gentlemen, eh? You know, a guy like me only ever spills his secrets at three times...\fOne: when he's sure he's gonna win. Two: when he's got nothing left to lose...");
    s.spawn('reno', 'reno', 14, 11, 'up', { name: 'Reno' });
    s.spawn('rude', 'rude', 15, 11, 'up', { name: 'Rude' });
    yield [s.move('reno', [[14, 9], [12, 8]]), s.move('rude', [[15, 9], [17, 8]])];
    yield s.say('Reno', "...and three: when the Turks have him backed up against a cliff. Which one is this, Don?");
    yield s.say('Don Corneo', "Th-the Turks!?");
    yield s.say('Rude', "......");
    yield s.say('Reno', "Orders from the top. Don Corneo's done. Nothing personal. ...Okay, a little personal. You grabbed our rookie.");
    yield s.say('Don Corneo', "W-wait! I can pay! I can— whoa— WHOOAAAAAAHHH!!");
    s.sfx('falling');
    yield s.jump('corneo', 15, 0, 1.4, 30);
    s.remove('corneo');
    yield s.msg('Backing away, Don Corneo loses his footing and tumbles off the back of the great stone head.');
    yield s.say('Reno', "...Huh. Saves us the trouble.");
    s.stopAnim('elena_t');
    yield s.move('rude', [[20, 5], [24, 5]]);
    yield s.say('Elena', "Reno! Rude! I knew you'd come for me!\f...Right! Now let's arrest Cloud and his friends while they're—");
    yield s.say('Reno', "Elena. We're on vacation. Remember?");
    yield s.say('Elena', "But... ugh. Fine.");
    yield s.say('Rude', "......Nice work, today.");
    yield s.face('reno', 'player');
    yield s.say('Reno', "See ya around, Cloud. Next time it's business as usual, yo.");
    yield [s.move('reno', [[14, 9], [14, 14]]), s.move('rude', [[20, 5], [15, 8], [15, 14]]), s.move('elena_t', [[20, 5], [16, 8], [16, 14]])];
    ['reno', 'rude', 'elena_t'].forEach(id => s.remove(id));
    s.music('wutai');
    yield s.move('player', [[11, 7], [9, 5], [5, 5]]);
    s.stopAnim('yuffie_t');
    yield s.face('yuffie_t', 'player');
    yield s.say('yuffie', "......Took you guys long enough.");
    yield s.say('cloud', "......");
    yield s.say('yuffie', "Okay, okay! Don't look at me like that. Here... your materia. All of it. I promise. The MP Absorb, too.");
    FF7.story.c7_returnAllMateria(s);
    yield s.giveMateria('mp_absorb');
    yield s.msg('All the stolen materia has been returned.');
    yield s.say('yuffie', "Wutai used to be strong, y'know? Everyone was proud. Then Shinra came, and Dad just... gave up.\fI thought if I got enough materia, I could make Wutai strong again. So nobody could ever push us around.");
    yield s.say('yuffie', "......I'm sorry, okay?");
    yield chime(s, [['barret', "Hmph. ...Next time, just ask, kid."], ['tifa', "You were trying to protect your home. I understand that. But next time, trust us."], ['aeris', "Wanting to protect your hometown... that's not a bad thing, Yuffie. Just the way you went about it."], ['cid', "Tch. Brat. ...C'mon, let's go."]]);
    yield s.say('yuffie', "Heh... So, um. I'm still coming with you guys, 'kay? Somebody's gotta keep an eye on all that materia!");
    s.join('yuffie', { toParty: false });
    s.inc('aff_yuffie', 10);
    s.set('c7_wq_rapps');
    s.set('c7_wutai_done');
    s.remove('yuffie_t');
    ids.forEach(id => s.remove(id));
    yield s.msg(`${yuf(s)} rejoined the group.`);
  };

  // ================================================================== GODO'S PAGODA
  const GORKY = { base: 'man', build: 'fat', hairStyle: 'bald', top: '#a03030', sleeve: 'skin', bottom: '#f0d0a0', extras: ['sash', 'beard'] };
  const SHAKE = { base: 'man', build: 'slim', hairStyle: 'bald', top: '#d09040', sleeve: '#d09040', bottom: '#6a4a30', extras: ['mask', 'sash'] };
  const CHEKHOV = { base: 'woman', build: 'fat', hair: '#402060', hairStyle: 'bun', top: '#d070a0', sleeve: '#d070a0', bottom: '#6040a0', skirt: 'long', extras: ['sash'] };
  const STANIV = { base: 'man', build: 'big', hair: '#c0c0c0', hairStyle: 'short', top: '#6a6a80', sleeve: 'skin', bottom: '#c0a060', extras: ['beard', 'bangles'] };
  const PAGODA = [
    { name: 'Gorky', model: GORKY, table: 'boss_gorky', music: 'battle',
      intro: [['Gorky', "So. Lord Godo's runaway daughter comes to climb the Pagoda at last.\fI am Gorky, guardian of the first floor. Let's see if you've learned anything out there, girl!"],
        ['yuffie', "Ha! Watch and learn, baldy!"]],
      after: "Hmph. Not bad. Go on up... if you think you can handle what's waiting." },
    { name: 'Shake', model: SHAKE, table: 'boss_shake', music: 'battle',
      intro: [['Shake', "You beat Gorky? Heh, he's getting soft. I'm Shake, of the second floor. I won't go easy on you!"],
        ['yuffie', "Nobody asked you to!"]],
      after: "Ugh... You're quick, I'll give you that. Up you go." },
    { name: 'Chekhov', model: CHEKHOV, table: 'boss_chekhov', music: 'battle',
      intro: [['Chekhov', "I am Chekhov of the third floor. Many warriors have frozen under my gaze, little one.\fLet's see if Godo's daughter can even look me in the eye."],
        ['yuffie', "Staring contest? You're on, lady!"]],
      after: "......Hmph. You didn't flinch once. Go on up, Yuffie." },
    { name: 'Staniv', model: STANIV, table: 'boss_staniv', music: 'battle',
      intro: [['Staniv', "Staniv, guardian of the fourth floor. I've crossed blades with your father a hundred times, girl.\fLet's see if the daughter has the same fire!"],
        ['yuffie', "I've got MORE fire than that old man!"]],
      after: "Hah... hah... You really are Godo's girl. He's waiting for you at the top." },
    { name: 'Godo', model: 'godo', table: 'boss_godo', music: 'boss',
      intro: [['Godo', "So. You've come, Yuffie. I've been waiting."],
        ['yuffie', "Yeah, well, here I am! And I'm gonna beat you, old man!"],
        ['Godo', "Then show me. Show me whether you are worthy of the power of the Five Mighty Gods!"]],
      after: "Go now, Yuffie. Your friends are waiting." },
  ];
  const pagodaOn = (s) => s.flag('c7_pagoda_on');
  function startPagoda(s) {
    const st = FF7.state;
    s.setVar('c7_pagoda_party', (st.party || []).slice());
    s.setVar('c7_pagoda_phs', st.phsEnabled ? 2 : 1);
    s.party(['yuffie']);
    s.phs(false);
    s.set('c7_pagoda_on');
  }
  function endPagoda(s) {
    const p = s.get('c7_pagoda_party');
    s.party(Array.isArray(p) && p.some(Boolean) ? p : ['cloud', 'yuffie']);
    s.phs(s.get('c7_pagoda_phs') !== 1);
    s.unset('c7_pagoda_on');
    if (!s.flag('c7_pagoda_done')) for (let n = 1; n <= 5; n++) s.unset('c7_pg' + n);
  }
  function* leavePagoda(s, lost) {
    yield s.fadeOut(30);
    const was = pagodaOn(s);
    if (was) endPagoda(s);
    yield s.goto('wutai_town2', 'from_pagoda');
    if (lost) yield s.say('cloud', "(Yuffie was beaten... She'll have to start again from the first floor.)");
  }
  function spectators(s) {
    if (!pagodaOn(s)) return;
    s.spawn('watch_cloud', 'cloud', 2, 9, 'right', { name: s.name('cloud') });
    const p = s.get('c7_pagoda_party');
    const others = (Array.isArray(p) ? p : []).filter(id => id && id !== 'cloud' && id !== 'yuffie');
    others.slice(0, 2).forEach((id, i) => s.spawn('watch_' + id, id, 15, 9 - i, 'left', { name: s.name(id) }));
  }
  function* godoEnd(s) {
    s.set('c7_pagoda_done');
    yield s.say('Godo', "......Hmph. So. You've grown strong, Yuffie.");
    yield s.say('yuffie', "Heh... heh... Told ya so, old man!");
    yield s.say('Godo', "Since the war, I believed keeping Wutai alive meant bowing our heads to Shinra.\fYou thought me a coward for it. Perhaps you were right... and perhaps not.");
    yield s.say('yuffie', "......Dad.");
    yield s.say('Godo', "Go with your friends. See the world with your own eyes, and grow stronger still.\fThen come home, and show me what Wutai can become.");
    yield s.say('Godo', "Take this. The materia of Leviathan, the water god who has watched over Wutai since ancient times.\fIt belongs to the one who reached the top.");
    yield s.giveMateria('leviathan');
    yield s.say('yuffie', "......Thanks. ...Dad.");
    endPagoda(s);
    s.remove('watch_cloud');
    TEAM.forEach(id => s.remove('watch_' + id));
    yield s.fadeOut(20);
    yield s.goto('wutai_pagoda5', 'from_above');
  }
  function* duel(s, n) {
    const g = PAGODA[n - 1];
    yield s.face('guardian', 'player');
    for (const [who, t] of g.intro) yield s.say(who, t);
    const r = yield s.battle({ table: g.table, bg: DC, music: g.music, noEscape: true, canLose: true });
    if (r === 'lose') {
      yield s.msg(`${yuf(s)} was defeated...`);
      yield* leavePagoda(s, true);
      return;
    }
    s.set('c7_pg' + n);
    if (n === 5) { yield* godoEnd(s); return; }
    yield s.say(g.name, g.after);
    yield s.move('guardian', 4, 6);
    yield s.face('guardian', 'right');
  }

  function pagodaFloor(n) {
    const g = PAGODA[n - 1], top = n === 5;
    const grid = [
      "##################",
      top ? "#|.....uuuu.....|#" : "#|.....++++.....|#",
      "#................#",
      "#..u..........u..#",
      "#................#",
      "#.....______.....#",
      "#.....______.....#",
      "#.....______.....#",
      "#................#",
      "#..u..........u..#",
      "#|..............|#",
      "########++########",
    ];
    const exits = [];
    if (!top) exits.push({ at: [7, 1, 4, 1], to: 'wutai_pagoda' + (n + 1), entry: 'from_below',
      if: s => s.flag('c7_pg' + n) || s.flag('c7_pagoda_done'),
      blocked: function* (s) { yield s.say(g.name, "Not so fast! You have to get past me first!"); } });
    if (n === 1) exits.push({ at: [8, 11, 2, 1], run: function* (s) { yield* leavePagoda(s, false); } });
    else exits.push({ at: [8, 11, 2, 1], to: 'wutai_pagoda' + (n - 1), entry: 'from_above' });
    FF7.defineMap('wutai_pagoda' + n, {
      name: `Pagoda — Floor ${n}`, area: 'Wutai', theme: 'wutai', music: 'shinobi',
      look: { wall: '#9a3a28', trim: '#402018', floor: ['#8a6038', '#825830'], floor3: ['#7a2a20', '#722420'], sky: ['#000000', '#000000'], indoor: true, fog: null },
      lights: [[8, 6, '#ffd090', 5]],
      grid,
      entries: { from_town: [8, 10, 'up'], from_below: [8, 10, 'up'], from_above: [8, 2, 'down'] },
      exits,
      npcs: [
        { id: 'guardian', name: g.name, model: g.model, at: [8, 5], dir: 'down', show: s => !s.flag('c7_pg' + n) && !s.flag('c7_pagoda_done'),
          talk: function* (s) {
            if (!pagodaOn(s)) { yield s.say(g.name, "This is Yuffie's trial, not yours. Come back with her."); return; }
            yield* duel(s, n);
          } },
        { id: 'guardian_side', name: g.name, model: g.model, at: top ? [8, 4] : [4, 6], dir: top ? 'down' : 'right', show: s => s.flag('c7_pg' + n) || s.flag('c7_pagoda_done'),
          talk: function* (s) { yield s.say(g.name, g.after); } },
      ],
      objects: top ? [{ at: [8, 1], talk: function* (s) { yield s.msg('A shrine to the Five Mighty Gods. Incense smoke curls up toward the rafters.'); } }] : [],
      triggers: [
        { at: [5, 6, 8, 2], if: s => pagodaOn(s) && !s.flag('c7_pg' + n) && !s.flag('c7_pagoda_done'), run: function* (s) { yield* duel(s, n); } },
      ],
      onEnter: function* (s) {
        if (n === 1 && s.entry() === 'from_town' && !s.flag('c7_pagoda_done') && !pagodaOn(s)) {
          startPagoda(s);
          spectators(s);
          yield s.wait(20);
          yield s.say('yuffie', "The Pagoda of the Five Mighty Gods. Five floors, five guardians... and my old man waiting at the top.\fI've never even made it past the first floor. But this time...!");
          yield s.say('cloud', "It's your fight. We'll be watching.");
          yield s.say('yuffie', "Heh! Just watch me, Cloud. You'll be super impressed!");
          return;
        }
        spectators(s);
      },
    });
  }
  for (let n = 1; n <= 5; n++) pagodaFloor(n);
})();

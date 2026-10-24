// Chapter 4 (part 3) — Hojo's laboratory (67F/68F), Jenova in the tank, Sample:H0512, Red XIII and
// Aeris join, the Turks' ambush, President Shinra's office, the holding cells, the trail of blood,
// the President's death, Rufus on the rooftop, and the glass-elevator fight with the Hundred Gunner
// / Heli Gunner. (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C4 = FF7.c4 = FF7.c4 || {};

  // ------------------------------------------------------------------ 67F laboratory (shared grid)
  const GRID_67 = [
    "################################",
    "#hhwhhhhwhh#hhhhhwhhhhwhhhhEEEh#",
    "#y..yyy...y#..M..Z....Z..M.....#",
    "#...yyy....#...................#",
    "#..........#...ttt.....ttt.....#",
    "#..........+...................#",
    "#M........M#....y.....y........#",
    "#..........#...................#",
    "############...................#",
    "#qq........#.......S...........#",
    "#..........#...................#",
    "+..........+...................#",
    "#..........#...................#",
    "###########hhhhhhhhhhhhhhhhhhh+#",
  ];
  FF7.defineMap('shinra_67f', {
    name: 'Shinra Bldg. 67F  Hojo\'s Lab', area: 'Midgar', theme: 'lab', music: 'lurking',
    battle: { table: 'shinra_lab', bg: 'lab', rate: 0.6 },
    lights: [[5, 3, '#60ffa0', 4], [16, 6, '#60ffa0', 2], [22, 6, '#60ffa0', 2], [19, 9, '#e0f0ff', 3]],
    grid: GRID_67,
    entries: { from_66f: [30, 12, 'up'], from_lift: [28, 2, 'down'], from_jail: [1, 11, 'right'] },
    exits: [
      { at: [27, 1, 3, 1], to: 'shinra_68f', entry: 'from_lift', sfx: 'elevator' },
      { at: [30, 13, 1, 1], to: 'shinra_66f', entry: 'from_67f', sfx: 'door', if: s => !s.flag('c4_h0512_done') || s.has('keycard_68'),
        blocked: function* (s) { yield s.msg('The door locked behind Hojo. The card reader flashes:\n"KEYCARD 68 REQUIRED."'); yield* C4.stepBack(s); } },
      { at: [0, 11, 1, 1], run: C4.locked('A heavy steel door marked "SPECIMEN HOLDING". It is locked.') },
    ],
    chests: [{ at: [8, 7], materia: 'poison', id: 'c4_67f_poison' }],
    npcs: [
      { id: 'jenova', name: 'Specimen', model: { enemy: 'jenova_birth' }, at: [5, 3], dir: 'down', scale: 0.4, faceOnTalk: false,
        talk: function* (s) { yield s.msg('A headless body floats in the glowing tank.\nThe plate on the tank reads: "JENOVA".'); } },
      { id: 'sci1', name: 'Researcher', model: 'scientist', at: [15, 7], dir: 'up',
        talk: function* (s) { yield s.say('Researcher', "Wh-who let you in here? This laboratory belongs to Professor Hojo!\fIf you're looking for him, he's up on 68 with his precious samples. Now leave me alone!"); } },
      { id: 'sci2', name: 'Researcher', model: 'scientist', at: [24, 11], dir: 'left',
        talk: function* (s) { yield s.say('Researcher', "Don't touch the tanks. Some of these specimens are more... awake than they look."); } },
    ],
    triggers: [
      { id: 'jenova', at: [11, 5, 1, 1], run: function* (s) {
          s.music('jenova');
          s.spawn('barret', 'barret', 12, 4, 'left', { name: 'Barret' });
          s.spawn('tifa', 'tifa', 12, 6, 'left', { name: 'Tifa' });
          yield s.move('player', 7, 5);
          yield s.face('player', 'up');
          yield s.cam(5, 3, 40, { dist: 8 });
          yield s.say('barret', "What the hell is THAT!? It ain't got a head!");
          yield s.say('cloud', "......\fJenova...");
          s.flash('#a0ffc0', 20, 0.5);
          s.sfx('heartbeat');
          yield s.say('cloud', "(...My head... It's... moving...)");
          s.anim('player', 'kneel');
          yield 30;
          yield s.say('tifa', "Cloud!? Cloud, what's wrong?");
          s.stopAnim('player');
          yield s.say('cloud', "...I'm fine.\fThat thing is called Jenova. I've seen it before... five years ago.");
          yield s.say('barret', "Five years ago? What're you talkin' about?");
          yield s.say('cloud', "......");
          yield s.say('tifa', "(Cloud...)");
          s.camFollow(30); s.camZoom(9.5, 50);
          s.remove('barret'); s.remove('tifa');
          s.music('lurking');
          s.set('c4_jenova_seen');
        } },
      { at: [14, 2], on: 'talk', run: function* (s) { yield s.msg('Mako analysis equipment, humming quietly.'); } },
      { at: [17, 2], on: 'talk', run: function* (s) { yield s.msg('A research log is open on the screen:\n"Specimen RED XIII transferred to the 68F sample room.\nAncient specimen — preparations under way."'); } },
    ],
  });

  // ------------------------------------------------------------------ 68F specimen room (shared grid)
  const GRID_68 = [
    "##############################",
    "#hEEEhhhhhwhhhhhhwhhhhhhhhhhh#",
    "#.........yyyy......=........#",
    "#.........yyyy......=........#",
    "#...................=........#",
    "#...................=........#",
    "#....................===^^===#",
    "#............................#",
    "#..M....M.........Z.......M..#",
    "#............................#",
    "#............................#",
    "#hhhhhhhhhhhhhhhhhhhhhhhhh+hh#",
  ];
  const HEIGHTS_68 = [
    "000000000000000000000000000000",
    "000000000000000000000000000000",
    "000000000000000000004444444440",
    "000000000000000000004444444440",
    "000000000000000000004444444440",
    "000000000000000000004444444440",
    "000000000000000000000444224440",
    "000000000000000000000000000000",
    "000000000000000000000000000000",
    "000000000000000000000000000000",
    "000000000000000000000000000000",
    "000000000000000000000000000000",
  ];
  const POTIONS_68 = [
    { at: [23, 3], item: 'potion', id: 'c4_68f_potion1' }, { at: [27, 3], item: 'potion', id: 'c4_68f_potion2' },
    { at: [27, 8], item: 'potion', id: 'c4_68f_potion3' }, { at: [28, 9], item: 'potion', id: 'c4_68f_potion4' },
  ];
  const eskillTrigger = {
    at: [10, 2, 4, 2], on: 'talk', if: s => s.flag('c4_h0512_done'),
    run: function* (s) {
      if (s.flag('c4_eskill')) { yield s.msg('The shattered specimen tank. Nothing left inside.'); return; }
      s.set('c4_eskill');
      yield s.msg('Something is glowing at the bottom of the broken specimen tank...');
      yield s.giveMateria('enemy_skill');
    },
  };
  function* h0512Scene(s) {
    s.music('lurking');
    s.spawn('barret', 'barret', 4, 3, 'down', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 2, 3, 'down', { name: 'Tifa' });
    s.spawn('hojo', 'hojo', 12, 5, 'up', { name: 'Hojo' });
    s.spawn('assist', 'scientist', 8, 4, 'up', { name: 'Assistant' });
    s.spawn('aeris', 'aeris', 11, 3, 'down', { name: 'Aeris' });
    s.spawn('redxiii', 'redxiii', 13, 3, 'down', { name: 'Red XIII' });
    s.anim('aeris', 'kneel');
    yield s.cam(12, 4, 50, { dist: 9 });
    yield s.say('hojo', "Specimen RED XIII, in with the Ancient... Hmm, hmm.\fBoth species on the brink of extinction. If I don't give them a helping hand, they'll vanish forever.");
    yield s.say('hojo', "A dying race and an Ancient. Ahh, what a delightful combination... heh heh heh.");
    s.camFollow(30); s.camZoom(9.5, 50);
    yield [s.run('player', 6, 5), s.run('barret', 5, 6), s.run('tifa', 7, 6)];
    yield s.say('barret', "AERIS!");
    yield s.face('hojo', 'player');
    yield s.say('hojo', "...Hmm? Who are you people? Visitors aren't permitted in my laboratory.");
    yield s.say('cloud', "Let her go, Hojo.");
    yield s.say('hojo', "Let her go? Don't be absurd. My experiment is at a very delicate stage.\fThough... that glow in your eyes. Mako. Aren't you...? No. No, it can't be.");
    yield s.say('aeris', "Cloud...!");
    yield s.say('barret', "Screw your experiment! Stand back, Aeris!");
    s.anim('barret', 'shoot'); s.sfx('shot'); s.shake(5, 20);
    yield 20;
    s.sfx('hit'); s.shake(4, 16);
    s.stopAnim('barret');
    yield s.say('hojo', "Wh—!? Careful, you fool! Those specimens are priceless!");
    s.emote('redxiii', '!!');
    s.sfx('howl');
    yield s.jump('redxiii', 9, 4, 0.8, 24);
    s.anim('assist', 'hurt');
    yield 10;
    s.anim('assist', 'lie');
    yield s.jump('redxiii', 11, 5, 0.6, 18);
    yield s.say('hojo', "Gyah! Get it away from me! RED XIII, heel!");
    yield s.move('hojo', 17, 7, { run: true });
    s.stopAnim('aeris');
    yield s.move('aeris', 9, 5);
    yield s.say('aeris', "Thank you... I knew you'd come.");
    yield s.say('hojo', "Hmph. Fine, then. If you insist on interfering... let me introduce you to another of my samples.");
    s.sfx('alarm_short');
    s.spawn('sample', { enemy: 'sample_h0512' }, 16, 5, 'left', { name: 'Sample:H0512', scale: 0.6 });
    yield s.move('hojo', [[17, 9], [5, 9], [5, 3], [3, 2]], { run: true, noWait: true });
    yield 40;
    s.hide('hojo');
    yield s.say('barret', "What the—!? More of Hojo's freaks!");
    yield s.face('redxiii', 'player');
    yield s.say('redxiii', "Hmph. I'll lend you a hand. This one is my business too.");
    s.emote('barret', '?!');
    yield s.say('barret', "Th-the cat TALKS!?");
    // FF7: Cloud leaves Tifa or Barret with Aeris and fights beside Red XIII and the other one.
    // Date points: trusting Tifa with her Tifa -2, trusting Barret Barret +2.
    const DPG = [{ tifa: -2 }, { barret: 2 }];
    const g = yield s.ask('cloud', '', ['Tifa, you stay with {AERIS}!', 'Barret, keep {AERIS} safe!'], { noQuotes: true, date: DPG });
    FF7.story.datePts(s, DPG[g]);
    if (g === 0) yield s.say('tifa', "Leave her to me. Go!");
    else yield s.say('barret', "Heh. Nobody's layin' a finger on her while I'm here. Go get it!");
    s.join('redxiii', { toParty: false });
    s.party(['cloud', 'redxiii', g === 0 ? 'barret' : 'tifa']);
    yield s.battle({ table: 'boss_sample_h0512', bg: 'lab', music: 'boss', noEscape: true });
    s.remove('sample');
    s.set('c4_h0512_done');
    // ---- Red XIII introduces himself
    s.music('redxiii');
    s.place('redxiii', 8, 5, 'left');
    s.place('aeris', 5, 4, 'down');
    s.place('barret', 4, 6, 'right');
    s.place('tifa', 6, 6, 'up');
    s.place('player', 7, 4, 'down');
    yield s.say('redxiii', "...Hojo called me RED XIII. It is the name he gave me.\fCall me whatever you like. It makes no difference to me.");
    yield s.nameEntry('redxiii');
    s.set('redxiii_joined');
    yield s.say('barret', "Man... a talkin' animal. I've seen it all now.");
    yield s.say('redxiii', "'Animal'? I would not have expected manners from a human, but I had hoped for a little better.");
    yield s.say('aeris', "Hee hee. Thank you, {REDXIII}. And thank you all... for coming for me.");
    yield s.say('tifa', "Aeris, are you alright? Did they hurt you?");
    yield s.say('aeris', "I'm okay. They ran all sorts of tests, but... I'm used to Shinra.");
    yield s.say('redxiii', "Hojo spoke of her as an Ancient. The Cetra. ...Interesting.");
    s.join('aeris', { toParty: false });
    yield s.say('barret', "Alright, we got what we came for. Let's get the hell outta here before Hojo comes back!");
    yield s.choosePArty(['cloud']);
    // FF7 date points: +2 for each of Barret, Tifa and Aeris in the party once it splits up
    ['barret', 'tifa', 'aeris'].forEach(id => { if (s.inParty(id)) FF7.story.datePts(s, { [id]: 2 }); });
    ['barret', 'tifa', 'aeris', 'redxiii', 'assist'].forEach(id => s.remove(id));
    s.music('lurking');
    s.show('coward');
    yield s.say('cloud', "(Somewhere on this floor... there might be something useful in that broken tank.)");
  }
  FF7.defineMap('shinra_68f', {
    name: 'Shinra Bldg. 68F  Specimen Room', area: 'Midgar', theme: 'lab', music: 'lurking',
    battle: { table: 'shinra_lab_68f', bg: 'lab', rate: 0.6, if: s => s.flag('c4_h0512_done') },
    lights: [[11, 2, '#60ffa0', 5], [24, 3, '#e0f0ff', 3]],
    grid: GRID_68, heights: HEIGHTS_68,
    entries: { from_lift: [3, 2, 'down'], from_69f: [26, 10, 'up'] },
    exits: [
      { at: [2, 1, 3, 1], to: 'shinra_67f', entry: 'from_lift', sfx: 'elevator' },
      { at: [26, 11, 1, 1], run: C4.locked('A heavy security door leading to the executive floors. It won\'t budge.') },
    ],
    items: POTIONS_68,
    npcs: [
      { id: 'coward', name: 'Researcher', model: 'scientist', at: [25, 4], dir: 'down', show: s => s.flag('c4_h0512_done') && !s.has('keycard_68'),
        talk: function* (s) {
          yield s.say('Researcher', "Eek! D-d-don't hurt me! I just wash the test tubes!\fHere! Take my keycard! Take anything! Just leave me alone!");
          yield s.give('keycard_68');
          s.set('c4_keycard68');
          yield s.say('Researcher', "Th-that'll get you through the doors down to 66. Now go away!");
          s.hide('coward');
        } },
    ],
    triggers: [eskillTrigger,
      { at: [18, 8], on: 'talk', run: function* (s) { yield s.msg('"SPECIMEN LOG — Sample H0512: aggressive. Handle with extreme caution."'); } }],
    onEnter: function* (s) {
      if (!s.flag('c4_h0512_done')) yield* h0512Scene(s);
    },
  });

  // ------------------------------------------------------------------ the capture (66F elevator)
  FF7.story.c4_capture = function* (s) {
    s.spawn('barret', 'barret', 29, 12, 'left', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 29, 14, 'left', { name: 'Tifa' });
    s.spawn('aeris', 'aeris', 30, 12, 'left', { name: 'Aeris' });
    s.spawn('redxiii', 'redxiii', 30, 14, 'left', { name: 'Red XIII' });
    yield [s.move('player', 27, 13), s.move('barret', 26, 13), s.move('tifa', 28, 14), s.move('aeris', 28, 12), s.move('redxiii', 29, 13)];
    yield s.say('barret', "Elevator's right here. Let's move!");
    s.sfx('door_shinra');
    s.spawn('tseng', 'tseng', 27, 11, 'down', { name: 'Tseng' });
    yield s.move('tseng', 27, 12);
    s.spawn('rude', 'rude', 31, 13, 'left', { name: 'Rude' });
    yield s.move('rude', 30, 13);
    s.face('player', 'up');
    yield s.say('tseng', "That's far enough.");
    s.emote('barret', '!');
    yield s.say('barret', "The Turks!");
    yield s.say('tseng', "Aeris. Leaving without saying goodbye? That's not like you.");
    yield s.say('aeris', "Tseng...");
    s.anim('rude', 'armscross');
    yield s.say('rude', "......");
    yield s.say('tseng', "The President would like a word with all of you. I suggest you come quietly.");
    yield s.say('cloud', "......");
    yield s.fadeOut(40);
    s.set('c4_captured');
    ['barret', 'tifa', 'aeris', 'redxiii', 'tseng', 'rude'].forEach(id => s.remove(id));
    yield s.goto('shinra_70f', 'captured');
  };

  // ------------------------------------------------------------------ 70F President's office
  function* presidentTalk(s) {
    s.music('shinra');
    s.spawn('barret', 'barret', 11, 7, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 15, 7, 'up', { name: 'Tifa' });
    s.spawn('redxiii', 'redxiii', 12, 8, 'up', { name: s.name('redxiii') });
    s.spawn('tseng', 'tseng', 17, 4, 'left', { name: 'Tseng' });
    s.spawn('aeris', 'aeris', 18, 5, 'left', { name: 'Aeris' });
    s.spawn('rude', 'rude', 13, 9, 'up', { name: 'Rude' });
    yield s.fadeIn(40);
    yield s.say('president', "So. You're the ones who've been making such a racket in my building.");
    yield s.say('barret', "Shinra! You... you dropped the plate on Sector 7! All those people... Marlene could've—!");
    yield s.say('president', "And you're AVALANCHE. Blowing up reactors hardly makes you saints, does it?");
    yield s.say('tifa', "What do you want with Aeris?");
    yield s.say('president', "She is the last surviving Ancient. A Cetra.\fThe Cetra will lead us to the Promised Land.");
    yield s.say('barret', "The Promised Land? That's just some fairy tale!");
    yield s.say('president', "Is it? The Ancients spoke of a land of supreme happiness. A land so rich that Mako springs from the ground on its own.\fNo reactors. No pumping. The energy simply flows.");
    yield s.say('president', "There we will build Neo-Midgar. And Shinra will sell that Mako — at a very fair price, of course.");
    yield s.say('barret', "So you just wanna find somewhere new to suck dry!");
    yield s.say('president', "That is how business works. ...I've wasted enough time on you people.");
    yield s.face('president', 'tseng');
    yield s.say('president', "Tseng. Put them somewhere they can't cause any more trouble.");
    yield s.say('tseng', "Yes, sir.");
    yield s.say('aeris', "Cloud!");
    yield s.fadeOut(40);
    ['barret', 'tifa', 'redxiii', 'tseng', 'aeris', 'rude'].forEach(id => s.remove(id));
    s.set('c4_president_talk');
    yield s.goto('shinra_jail', 'cell');
  }
  function* presidentDead(s) {
    s.spawn('barret', 'barret', 12, 9, 'up', { name: s.name('barret') });
    s.spawn('tifa', 'tifa', 14, 9, 'up', { name: s.name('tifa') });
    s.spawn('aeris', 'aeris', 11, 9, 'up', { name: s.name('aeris') });
    s.spawn('redxiii', 'redxiii', 15, 9, 'up', { name: s.name('redxiii') });
    yield [s.move('player', 13, 5), s.move('barret', 11, 6), s.move('tifa', 15, 6), s.move('aeris', 10, 7), s.move('redxiii', 16, 7)];
    yield s.cam(13, 2, 40, { dist: 8 });
    yield s.say('barret', "Th-that's...!");
    yield s.say('tifa', "The President... He's dead.");
    yield s.msg('A long, thin blade has been driven clean through the President\'s back, pinning him to his desk.');
    yield s.say('cloud', "That sword... The Masamune.\f......Sephiroth.");
    s.camFollow(30); s.camZoom(9.5, 50);
    yield s.face('barret', 'player');
    yield s.say('barret', "Sephiroth!? The guy from your stories? I thought he was dead!");
    s.flash('#ffffff', 16, 0.4);
    yield s.say('cloud', "...He's alive. He has to be. Nobody else could do this.");
    yield s.say('redxiii', "The trail of blood from Jenova's tank led here. Whoever took that specimen... it was him.");
    yield s.say('aeris', "Sephiroth... and Jenova...");
    s.spawn('palmer', 'palmer', 19, 3, 'left', { name: 'Palmer' });
    s.sfx('run');
    s.emote('palmer', '!!');
    yield s.say('palmer', "Eeeeek! D-don't kill me! I'm just the head of the space program! Nobody important!");
    yield s.move('barret', 17, 4, { run: true });
    yield s.say('barret', "Talk, lardo! Who did this?");
    yield s.say('palmer', "S-Sephiroth! I saw him with my own eyes! Uh-huh, uh-huh!\fAnd I heard his voice. He said... he said he'd never let us have the Promised Land!");
    s.sfx('helicopter'); s.shake(2, 90);
    yield 50;
    yield s.say('palmer', "Th-that sound! A helicopter! It must be Rufus! The Vice President's back!");
    yield s.run('palmer', [[22, 3], [25, 2], [25, 1]]);
    s.remove('palmer');
    yield s.say('tifa', "Rufus... the President's son?");
    yield s.say('cloud', "...Let's go. Up to the roof.");
    ['barret', 'tifa', 'aeris', 'redxiii'].forEach(id => s.remove(id));
    s.set('c4_president_found');
  }
  FF7.defineMap('shinra_70f', {
    name: "Shinra Bldg. 70F  President's Office", area: 'Midgar', theme: 'shinra', leader: 'cloud',
    music: s => s.flag('c4_rufus_beaten') ? 'hurry' : s.flag('c4_escape_started') ? 'trail' : 'shinra',
    look: { floor3: ['#4a1a1a', '#441818'], sky: ['#020308', '#0c1424'] },
    lights: [[13, 3, '#ffe0b0', 4]],
    // the President's desk stands on a raised dais (two steps up) in front of the great windows
    camera: { pitch: 55, dist: 10 },
    grid: [
      "############################",
      "#wwwwwwwwwwwwwwwwwwwwwwww+h#",
      "#........__________........#",
      "#._________DDDDDD________..#",
      "#._______^^^^^^^^^^______..#",
      "#.|_____________________|..#",
      "#._______________________..#",
      "#._______________________..#",
      "#.|_____________________|..#",
      "#._______________________..#",
      "#hhhhhhhhhhhh++hhhhhhhhhhhh#",
    ],
    heights: [
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000002222222222000000000",
      "0000000002222222222000000000",
      "0000000001111111111000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
    ],
    entries: { from_69f: [13, 9, 'up'], from_roof: [25, 2, 'down'], captured: [13, 7, 'up'] },
    exits: [
      { at: [13, 10, 2, 1], to: 'shinra_69f', entry: 'from_70f', sfx: 'door_shinra' },
      { at: [25, 1, 1, 1], to: 'shinra_roof', entry: 'from_70f', sfx: 'door', if: s => s.flag('c4_president_found'),
        blocked: C4.locked("(Something's wrong here. First, look around the office.)") },
    ],
    npcs: [
      { id: 'president', name: 'President Shinra', model: 'president', at: [13, 2], dir: 'down', show: s => !s.flag('c4_escape_started') },
      { id: 'body', name: 'President Shinra', model: 'president', at: [13, 2], dir: 'down', anim: 'lookdown', show: s => s.flag('c4_escape_started'),
        faceOnTalk: false,
        talk: function* (s) { yield s.msg('President Shinra lies slumped over his desk, the long sword still buried in his back.'); } },
    ],
    triggers: [
      { at: [1, 1, 24, 1], on: 'talk', run: function* (s) { yield s.msg('Midgar spreads out below, a wheel of lights and Mako-green haze.'); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'captured' && !s.flag('c4_president_talk')) { yield* presidentTalk(s); return; }
      if (s.flag('c4_escape_started') && !s.flag('c4_president_found')) yield* presidentDead(s);
    },
  });

  // ------------------------------------------------------------------ holding cells (67F)
  function* jailSleep(s) {
    if (!s.flag('c4_jail_tifa') || !s.flag('c4_jail_door') || s.flag('c4_jail_night')) return;
    yield s.say('tifa', "(through the wall) Aeris? Can you hear me?");
    yield s.say('aeris', "Tifa? ...Mm. I can hear you.");
    yield s.say('tifa', "Is it true? The Promised Land... is it real?");
    yield s.say('aeris', "...I don't know. My mother told me the Cetra were born from the Planet. They spoke with it, and it opened the way to the Promised Land.\fA land of supreme happiness, she said.");
    yield s.say('tifa', "Supreme happiness...");
    yield s.say('aeris', "Sometimes I hear voices. Mom said it was the Planet speaking. But I can never quite make out the words...\fEver since I came to Midgar, they've gotten so faint.");
    yield s.say('tifa', "......");
    yield s.say('aeris', "...Hey, Tifa. Let's get some sleep, okay? Good night. You too, Cloud.");
    yield s.move('player', 16, 3);
    s.anim('player', 'lie');
    s.anim('tifa', 'lie');
    yield s.fadeOut(60);
    s.music('none');
    yield s.caption('......', { hold: 90, bg: '#000' });
    s.sfx('hit');
    yield 40;
    yield s.caption('...!?', { hold: 60, bg: '#000' });
    s.set('c4_jail_night');
    s.set('c4_escape_started');
    s.hide('guard');
    s.show('deadguard');
    s.stopAnim('player');
    s.place('player', 15, 4, 'down');
    yield s.fadeIn(60);
    yield s.say('cloud', "(...Hm? The cell door... it's open.)");
    s.sfx('door_shinra');
  }
  // At the cell door Cloud thinks of the others one at a time, in the order the player picks (FF7).
  const jailThought = {
    barret: function* (s) {
      yield s.say('cloud', "(Barret...)");
      yield s.say('barret', "(from the next cell) HEY! Anybody out there!? Lemme outta here! I got a little girl waitin' for me!\f...Marlene...");
    },
    redxiii: function* (s) {
      yield s.say('cloud', "(Red XIII...)");
      yield s.say('redxiii', "(from the next cell) ...Must your friend be so loud? The walls are thin enough as it is.");
      yield s.say('barret', "Who asked you, you overgrown housecat!?");
      yield s.say('cloud', "(Barret's stuck in there with him. Heh.)");
    },
    aeris: function* (s) {
      yield s.say('cloud', "(Aeris...)");
      yield s.say('aeris', "(through the wall) Cloud? Is that you? I can hear you through the wall.");
      yield s.say('aeris', "Thank you for coming for me. Really.");
      const c = yield s.ask('cloud', '', ["I'm your bodyguard, remember?", "Don't mention it."]);
      if (c === 0) yield s.say('aeris', "Hee hee. That's right. And I still owe you a date, don't I?");
      else yield s.say('aeris', "Hmm. Cool as ever, huh?");
      yield s.say('aeris', "...You know, they kept asking me about the Promised Land. As if I'd know where it is.");
    },
  };
  const cellLocked = (x) => ({
    at: [x, 5, 1, 1], once: false, if: s => !s.flag('c4_jail_night'),
    run: C4.locked('The cell door is locked tight.'),
  });
  FF7.defineMap('shinra_jail', {
    name: 'Shinra Bldg. 67F  Holding Cells', area: 'Midgar', theme: 'lab', leader: 'cloud',
    music: s => s.flag('c4_jail_out') ? 'trail' : 'none',
    look: { wall: '#5a666c', floor: ['#4a5256', '#464e52'] },
    lights: [[15, 3, '#c0d0ff', 2], [20, 7, '#ff4030', 2]],
    grid: [
      "##############################",
      "#hhhhh#hhhhh#hhhhh#hhhhh#hhhh#",
      "#..b..#.b.b.#.b.b.#..b..#....#",
      "#.....#.....#.....#.....#....#",
      "#.....#.....#.....#.....#....#",
      "#==+==#==+==#==+==#==+==#....#",
      "#............................+",
      "#............................#",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    entries: { cell: [15, 3, 'down'], from_lab: [28, 6, 'left'] },
    exits: [
      { at: [29, 6, 1, 1], to: 'shinra_67f_night', entry: 'from_jail', sfx: 'door_shinra', if: s => s.flag('c4_jail_out'),
        blocked: C4.locked("(The others are still locked up. I can't leave them.)") },
    ],
    npcs: [
      { id: 'tifa', name: 'Tifa', model: 'tifa', at: [14, 4], dir: 'right', show: s => !s.flag('c4_jail_out'),
        talk: function* (s) {
          if (s.flag('c4_jail_night')) { yield s.say('tifa', "Cloud... what happened out there?"); return; }
          if (!s.flag('c4_jail_tifa')) {
            yield s.say('tifa', "Cloud... that thing in the tank downstairs. Jenova. You knew its name.");
            yield s.say('cloud', "...I saw it once. Five years ago, in Nibelheim.");
            yield s.say('tifa', "In Nibelheim...?\f......");
            yield s.say('tifa', "Barret, Red XIII, Aeris... we're all locked up. Do you think we'll really get out of here?");
          } else yield s.say('tifa', "...Cloud? Do you really think we can get out of here?");
          // FF7 date points, every time she asks: Tifa +1 / Tifa -1
          const DP = [{ tifa: 1 }, { tifa: -1 }];
          const c = yield s.ask('cloud', '', ['Leave it to me.', "It won't be easy..."], { date: DP });
          FF7.story.datePts(s, DP[c]);
          if (c === 0) {
            yield s.say('tifa', "...Heh. That's what I wanted to hear. I'm counting on you, Cloud.");
          } else {
            yield s.say('tifa', "...Yeah. I know. But we've gotten out of worse. Haven't we?");
          }
          s.set('c4_jail_tifa');
          yield* jailSleep(s);
        } },
      { id: 'barret', name: 'Barret', model: 'barret', at: [8, 3], dir: 'down', show: s => !s.flag('c4_jail_out'),
        talk: function* (s) { yield s.say('barret', "Marlene... Hang in there, baby. Daddy's comin' home."); } },
      { id: 'redxiii', name: 'Red XIII', model: 'redxiii', at: [10, 4], dir: 'left', anim: 'lie', show: s => !s.flag('c4_jail_out'),
        talk: function* (s) { yield s.say('redxiii', "Hmph. Humans. Always so restless."); } },
      { id: 'aeris', name: 'Aeris', model: 'aeris', at: [20, 3], dir: 'down', show: s => !s.flag('c4_jail_out'),
        talk: function* (s) { yield s.say('aeris', "Cloud? ...It's nice to hear your voice."); } },
      { id: 'guard', name: 'Guard', model: 'soldier', at: [16, 7], dir: 'up', show: s => !s.flag('c4_jail_night'),
        talk: function* (s) { yield s.say('Guard', "Quiet in there!"); } },
      { id: 'deadguard', name: 'Guard', model: 'soldier', at: [18, 6], dir: 'down', anim: 'lie', show: s => s.flag('c4_jail_night'),
        faceOnTalk: false,
        talk: function* (s) { yield s.msg('The guard is dead. Cut down by a single stroke.'); } },
    ],
    triggers: [
      cellLocked(3), cellLocked(9), cellLocked(15), cellLocked(21),
      { at: [15, 5], on: 'talk', if: s => !s.flag('c4_jail_night'), run: function* (s) {
          if (s.flag('c4_jail_door')) { yield s.msg('The cell door. Locked tight.'); yield* jailSleep(s); return; }
          // FF7 date points: whoever Cloud thinks of first +3, second +1, third nothing (Barret and
          // Aeris only; Red XIII never scores)
          const PTS = [3, 1, 0], left = ['barret', 'redxiii', 'aeris'];
          for (let n = 0; left.length && n < 3; n++) {
            const DP = left.map(id => (id !== 'redxiii' && PTS[n]) ? { [id]: PTS[n] } : {});
            const i = left.length > 1 ? (yield s.ask('cloud', '', left.map(id => '(' + s.name(id) + '...)'), { noQuotes: true, date: DP })) : 0;
            const k = i >= 0 && i < left.length ? i : 0;
            FF7.story.datePts(s, DP[k]);
            yield* jailThought[left.splice(k, 1)[0]](s);
          }
          s.set('c4_jail_door');
          yield* jailSleep(s);
        } },
      { id: 'wake', at: [12, 6, 10, 2], if: s => s.flag('c4_jail_night') && !s.flag('c4_jail_out'), run: function* (s) {
          yield s.move('player', 17, 6);
          yield s.face('player', 'right');
          yield s.say('cloud', "......!");
          yield s.msg('The guard lies dead in the corridor. A single clean stroke.');
          yield s.say('cloud', "(Who could have...)");
          yield s.msg(`${s.name('cloud')} takes the key from the guard's belt and unlocks the other cells.`);
          s.sfx('door_shinra');
          s.stopAnim('tifa'); s.stopAnim('redxiii');
          yield [s.move('tifa', [[15, 5], [15, 6], [16, 7]]), s.move('barret', [[9, 5], [9, 6], [14, 7]]),
            s.move('redxiii', [[9, 5], [11, 6]]), s.move('aeris', [[21, 5], [20, 7]])];
          yield s.say('barret', "What the hell happened here!?");
          yield s.say('tifa', "The guard... he's dead.");
          yield s.say('aeris', "Who... who could have done something like this?");
          yield s.face('redxiii', 'right');
          yield s.say('redxiii', "The smell of blood is everywhere. There is a trail... It leads toward the laboratory.");
          yield s.say('cloud', "......Let's follow it.");
          s.music('trail');
          yield s.choosePArty(['cloud']);
          s.set('c4_jail_out');
          ['tifa', 'barret', 'redxiii', 'aeris'].forEach(id => s.hide(id));
        } },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'cell' || s.flag('c4_jail_intro')) return;
      s.set('c4_jail_intro');
      yield s.fadeIn(40);
      yield s.msg("The party is thrown into the holding cells on the 67th floor.");
      yield s.say('tifa', "Cloud... are you alright?");
      yield s.say('cloud', "...Yeah. Just need to think.");
    },
  });

  // ------------------------------------------------------------------ the trail of blood: 67F / 68F at night
  const TRAIL_67 = [[2, 11, '#ff2020', 1.2], [6, 11, '#ff2020', 1.2], [11, 11, '#ff2020', 1.2], [15, 9, '#ff2020', 1.2],
    [11, 5, '#ff2020', 1.4], [20, 6, '#ff2020', 1.2], [25, 4, '#ff2020', 1.2], [28, 2, '#ff2020', 1.2], [5, 3, '#60ffa0', 3]];
  FF7.defineMap('shinra_67f_night', {
    name: 'Shinra Bldg. 67F  Hojo\'s Lab', area: 'Midgar', theme: 'lab', music: 'trail',
    look: { ambient: [0.26, 0.3, 0.32] },
    battle: { table: 'shinra_escape', bg: 'lab', rate: 0.6 },
    lights: TRAIL_67,
    grid: GRID_67,
    entries: { from_66f: [30, 12, 'up'], from_lift: [28, 2, 'down'], from_jail: [1, 11, 'right'] },
    exits: [
      { at: [27, 1, 3, 1], to: 'shinra_68f_night', entry: 'from_lift', sfx: 'elevator' },
      { at: [30, 13, 1, 1], run: C4.locked("(The trail of blood leads upward, not down.)") },
      { at: [0, 11, 1, 1], to: 'shinra_jail', entry: 'from_lab', sfx: 'door_shinra' },
    ],
    chests: [{ at: [8, 7], materia: 'poison', id: 'c4_67f_poison' }],
    npcs: [
      { id: 'dead1', name: 'Soldier', model: 'soldier', at: [6, 12], dir: 'right', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg('A Shinra soldier. Dead.'); } },
      { id: 'dead2', name: 'Researcher', model: 'scientist', at: [18, 7], dir: 'down', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg("One of Hojo's researchers. He never saw it coming."); } },
      { id: 'dead3', name: 'Soldier', model: 'soldier', at: [26, 3], dir: 'left', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg('The blood trail leads past him, toward the lift.'); } },
    ],
    triggers: [
      { id: 'empty_tank', at: [10, 2, 1, 6], run: function* (s) {
          s.spawn('redxiii', 'redxiii', 12, 5, 'left', { name: s.name('redxiii') });
          s.spawn('barret', 'barret', 12, 4, 'left', { name: s.name('barret') });
          yield s.cam(5, 3, 40, { dist: 8 });
          yield s.msg("Jenova's tank has been smashed open from the inside. It's empty.");
          yield s.say('cloud', "Jenova... It's gone.");
          yield s.say('barret', "Gone? You mean that headless thing got up and walked outta here!?");
          yield s.say('redxiii', "Or someone came for it. The trail of blood begins here... and leads up.");
          s.camFollow(30); s.camZoom(9.5, 50);
          s.remove('redxiii'); s.remove('barret');
          s.set('c4_tank_empty');
        } },
      { at: [17, 2], on: 'talk', run: function* (s) { yield s.msg('The screen is spattered with blood. A single line of text blinks:\n"SPECIMEN J — CONTAINMENT BREACH"'); } },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'from_jail' || s.flag('c4_trail_intro')) return;
      s.set('c4_trail_intro');
      yield s.msg('A trail of fresh blood runs across the laboratory floor...');
    },
  });

  FF7.defineMap('shinra_68f_night', {
    name: 'Shinra Bldg. 68F  Specimen Room', area: 'Midgar', theme: 'lab', music: 'trail',
    look: { ambient: [0.26, 0.3, 0.32] },
    battle: { table: 'shinra_escape_68f', bg: 'lab', rate: 0.9 },
    lights: [[11, 2, '#60ffa0', 3], [5, 5, '#ff2020', 1.2], [14, 8, '#ff2020', 1.2], [22, 10, '#ff2020', 1.2], [26, 10, '#ff2020', 1.4]],
    grid: GRID_68, heights: HEIGHTS_68,
    entries: { from_lift: [3, 2, 'down'], from_69f: [26, 10, 'up'] },
    exits: [
      { at: [2, 1, 3, 1], to: 'shinra_67f_night', entry: 'from_lift', sfx: 'elevator' },
      { at: [26, 11, 1, 1], to: 'shinra_69f', entry: 'from_68f', sfx: 'door_shinra' },
    ],
    items: POTIONS_68,
    npcs: [
      { id: 'dead1', name: 'Researcher', model: 'scientist', at: [9, 7], dir: 'left', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg('A researcher lies in a pool of blood.'); } },
      { id: 'dead2', name: 'Soldier', model: 'soldier', at: [24, 10], dir: 'up', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg('The security door behind him has been cut clean through.'); } },
    ],
    triggers: [eskillTrigger],
    onEnter: function* (s) {
      if (s.flag('c4_trail_68')) return;
      s.set('c4_trail_68');
      yield s.say('cloud', "(The blood goes on... through that door, toward the executive floors.)");
    },
  });

  // ------------------------------------------------------------------ 69F
  FF7.defineMap('shinra_69f', {
    name: 'Shinra Bldg. 69F', area: 'Midgar', theme: 'shinra',
    music: s => s.flag('c4_rufus_beaten') ? 'hurry' : 'trail',
    battle: { table: 'shinra_escape_69f', bg: 'shinra', rate: 0.6, if: s => !s.flag('c4_rufus_beaten') },
    lights: [[5, 5, '#80ffa0', 2], [8, 4, '#ff2020', 1.2], [16, 6, '#ff2020', 1.2], [22, 2, '#ff2020', 1.4]],
    grid: [
      "##########################",
      "#hhhwhhhhEEEhhhhhwhhhh+hh#",
      "#........................#",
      "#..|.......|.......|.....#",
      "#........................#",
      "#....S...................#",
      "#........................#",
      "#...|......|.......|.....#",
      "#hh+hhhhhhhhhhhhhhhhhhhhh#",
    ],
    entries: { from_68f: [3, 7, 'up'], from_70f: [22, 2, 'down'], from_elevator: [10, 2, 'down'] },
    exits: [
      { at: [22, 1, 1, 1], to: 'shinra_70f', entry: 'from_69f', sfx: 'door_shinra' },
      { at: [3, 8, 1, 1], to: 'shinra_68f_night', entry: 'from_69f', sfx: 'door_shinra', if: s => !s.flag('c4_rufus_beaten'),
        blocked: C4.locked("(No time to go back down that way. The elevator!)") },
      { at: [9, 1, 3, 1], run: function* (s) {
          if (!s.flag('c4_rufus_beaten')) { yield s.msg('The elevator has been shut down. The trail of blood leads up the stairs.'); yield* C4.stepBack(s); return; }
          s.sfx('door_shinra');
          yield s.fadeOut(20);
          s.sfx('elevator');
          yield 60;
          yield s.goto('shinra_lobby', 'from_escape');
        } },
    ],
    npcs: [
      { id: 'dead1', name: 'Soldier', model: 'soldier', at: [8, 4], dir: 'right', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg("A Shinra soldier. His rifle was never even fired."); } },
      { id: 'dead2', name: 'Soldier', model: 'soldier', at: [16, 6], dir: 'up', anim: 'lie', faceOnTalk: false,
        talk: function* (s) { yield s.msg('Another guard. The blood trail continues toward the stairs to the 70th floor.'); } },
    ],
  });

  // ------------------------------------------------------------------ the rooftop
  function* rufusArrives(s) {
    s.music('rufus');
    s.spawn('barret', 'barret', 11, 3, 'down', { name: s.name('barret') });
    s.spawn('tifa', 'tifa', 14, 3, 'down', { name: s.name('tifa') });
    s.spawn('aeris', 'aeris', 10, 3, 'down', { name: s.name('aeris') });
    s.spawn('redxiii', 'redxiii', 15, 3, 'down', { name: s.name('redxiii') });
    s.spawn('palmer', 'palmer', 8, 7, 'right', { name: 'Palmer' });
    s.sfx('helicopter'); s.shake(2, 120);
    yield s.cam(14, 6, 60, { dist: 11, pitch: 44 });
    s.spawn('rufus', 'rufus', 14, 9, 'up', { name: 'Rufus' });
    s.spawn('darknation', { enemy: 'dark_nation' }, 16, 9, 'up', { name: 'Dark Nation', scale: 0.7 });
    yield [s.move('rufus', 14, 6), s.move('darknation', 16, 6)];
    yield s.say('palmer', "M-Mr. Rufus! The President... your father... he's...");
    yield s.say('rufus', "I know. Sephiroth, was it?\fWell. He saved me the trouble.");
    s.emote('tifa', '!');
    yield s.say('tifa', "Your own father...!");
    yield s.say('rufus', "As of now, I am the President of Shinra, Inc.\f...And who might you be?");
    s.camFollow(30); s.camZoom(9.5, 50);
    yield s.move('player', 13, 4);
    yield s.say('cloud', "Ex-SOLDIER, First Class. Cloud.");
    yield s.say('barret', "AVALANCHE! Barret!");
    yield s.say('tifa', "Also AVALANCHE. Tifa.");
    yield s.say('aeris', "Aeris. Flower girl, from the slums.");
    yield s.say('redxiii', "Research specimen... at least, so they tell me.");
    yield s.say('rufus', "What a charming bunch.\fAllow me to tell you how I intend to run things.");
    yield s.say('rufus', "My father tried to rule the world with money. The people bought it, and Shinra sold them safety.\fBut I have a better way. Fear.");
    yield s.say('rufus', "A little fear keeps people in line far more cheaply than money ever could.");
    yield s.face('player', 'barret');
    yield s.say('cloud', "...Barret. Take Aeris and get out of here.");
    yield s.say('barret', "What!? And leave you up here with this punk?");
    yield s.say('cloud', "She's the one Shinra wants. Get her out of the building!");
    yield s.say('tifa', "I'll go ahead and make sure the way out is clear.\fCloud... don't do anything stupid.");
    yield s.say('aeris', "Cloud, be careful!");
    yield s.say('redxiii', "Come. There's no time to argue.");
    yield s.say('barret', "...Dammit. You'd better not die on us, you hear me!?");
    yield [s.run('tifa', 12, 1), s.run('barret', 12, 2), s.run('aeris', 11, 2), s.run('redxiii', 13, 2)];
    ['tifa', 'barret', 'aeris', 'redxiii', 'palmer'].forEach(id => s.remove(id));
    s.set('c4_rufus_arrived');
    // The elevator group (FF7: Barret, Red XIII and Aeris; Tifa goes ahead to the lobby).
    s.setVar('c4_prev_party', s.st && s.st.party ? s.st.party.slice() : ['cloud', 'barret', 'tifa']);
    yield s.fadeOut(40);
    s.party(['barret', 'redxiii', 'aeris']);
    yield s.goto('shinra_elevator', 'escape');
  }
  function* rufusFight(s) {
    s.music('rufus');
    s.spawn('rufus', 'rufus', 13, 5, 'down', { name: 'Rufus' });
    s.spawn('darknation', { enemy: 'dark_nation' }, 15, 5, 'down', { name: 'Dark Nation', scale: 0.7 });
    yield s.say('rufus', "So, you stayed behind. How noble. An ex-SOLDIER, you said?\fShow me what that's worth.");
    yield s.battle({ table: 'boss_rufus', bg: 'shinra_roof', music: 'boss', noEscape: true });
    s.sfx('helicopter'); s.shake(2, 100);
    yield s.say('rufus', "...Hmph. Not bad. I think we'll leave it at that, for today.");
    yield s.move('rufus', 13, 9, { run: true });
    s.anim('rufus', 'lookup');
    yield s.say('rufus', "We'll meet again, Cloud. Count on it.");
    yield s.fadeOut(20);
    s.remove('rufus'); s.remove('darknation');
    yield s.fadeIn(20);
    yield s.msg("Rufus grabs the ladder of his helicopter and is gone into the night.");
    s.set('c4_rufus_beaten');
    s.music('hurry');
    yield s.say('cloud', "(The others... I have to get down there!)");
  }
  FF7.defineMap('shinra_roof', {
    name: 'Shinra Bldg. Rooftop', area: 'Midgar', theme: 'midgar', leader: 'cloud',
    music: s => s.flag('c4_rufus_beaten') ? 'hurry' : null,
    look: { sky: ['#01020a', '#141c34'], fog: { color: [0.04, 0.05, 0.1], near: 12, far: 30 }, floor3: ['#2a2a30', '#26262c'] },
    lights: [[3, 3, '#ff4030', 2], [24, 3, '#ff4030', 2], [3, 9, '#ff4030', 2], [24, 9, '#ff4030', 2], [13, 6, '#e0e8ff', 4]],
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhhhhhhhhh+hhhhhhhhhhhhhhh",
      "=..........................=",
      "=..l....................l..=",
      "=.......____________.......=",
      "=.......____________.......=",
      "=.......____________.......=",
      "=.......____________.......=",
      "=.......____________.......=",
      "=..l....................l..=",
      "=..........................=",
      "============================",
      "                            ",
    ],
    entries: { from_70f: [12, 2, 'down'], rufus_fight: [13, 7, 'up'] },
    exits: [
      { at: [12, 1, 1, 1], to: 'shinra_70f', entry: 'from_roof', sfx: 'door', if: s => s.flag('c4_rufus_beaten') || !s.flag('c4_rufus_arrived') },
    ],
    triggers: [
      { at: [1, 10, 26, 1], on: 'talk', run: function* (s) { yield s.msg('The whole of Midgar lies below, seventy floors down. The wind howls.'); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'rufus_fight' && !s.flag('c4_rufus_beaten')) { yield* rufusFight(s); return; }
      if (s.flag('c4_president_found') && !s.flag('c4_rufus_arrived')) yield* rufusArrives(s);
    },
  });

  // ------------------------------------------------------------------ the glass elevator: Hundred Gunner / Heli Gunner
  FF7.story.c4_gunnerFight = function* (s) {
    s.spawn('redxiii', 'redxiii', 5, 4, 'up', { name: s.name('redxiii') });
    s.spawn('aeris', 'aeris', 9, 4, 'up', { name: s.name('aeris') });
    yield s.fadeIn(30);
    s.sfx('elevator');
    yield s.say('aeris', "Will Cloud be alright up there...?");
    yield s.say('barret', "Him? Tch. He's tougher than he looks. Worry about us, if anything.");
    yield s.say('redxiii', "...Something is approaching. Outside the glass!");
    s.sfx('helicopter'); s.shake(4, 40);
    s.spawn('gunner', { enemy: 'hundred_gunner' }, 7, 1, 'down', { name: 'Hundred Gunner', scale: 0.6 });
    yield 40;
    s.sfx('shot3'); s.shake(6, 30);
    yield s.say('barret', "They're shootin' out the glass! Get ready!");
    yield s.battle({ table: 'boss_hundred_gunner', bg: 'shinra_elevator', music: 'boss', noEscape: true });
    s.remove('gunner');
    s.sfx('shot2'); s.shake(4, 30);
    yield s.say('aeris', "It's not finished! It's changing shape!");
    yield s.battle({ table: 'boss_heli_gunner', bg: 'shinra_elevator', music: 'boss', noEscape: true });
    yield s.say('barret', "HAH! Scrap metal! And that was MY shot that finished it, don't nobody forget!");
    yield s.say('redxiii', "...Is he always like this?");
    yield s.say('aeris', "Pretty much.");
    s.set('c4_gunner_done');
    yield s.fadeOut(40);
    s.remove('redxiii'); s.remove('aeris');
    s.party(['cloud']);
    yield s.caption('Meanwhile, on the rooftop...', { hold: 90, bg: '#000' });
    yield s.goto('shinra_roof', 'rufus_fight');
  };
})();

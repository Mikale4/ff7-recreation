// Chapter 5b (part 3) — Upper Junon.
// The tower and the airport (first sight of the Highwind), the barracks (Cloud "borrows" a uniform),
// the welcome parade for President Rufus (s.minigame('parade'), TV rating judged by Heidegger), the
// streets, shops, bars (Rude, Elena), the apartment with the Beginner's Hall, the inn building, and
// the harbor: Rufus' speech, the rifle send-off ceremony and boarding the cargo ship.
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const counter = (at, run) => ({ at, on: 'talk', run });
  const disguised = (s) => s.flag('c5b_disguised') && !s.flag('c5b_undisguised');
  // Cloud keeps the Shinra uniform on while he's sneaking around Junon (models reset on map load).
  const wearUniform = function (s) { if (disguised(s)) s.setModel('player', 'soldier'); };
  const ok = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win));
  // Parade minigame result -> TV rating (0-100)
  function rating(r) {
    if (typeof r === 'number') return Math.max(0, Math.min(100, Math.round(r)));
    if (r && typeof r === 'object') {
      const v = r.score != null ? r.score : r.pct != null ? r.pct : r.rating;
      if (typeof v === 'number') return Math.max(0, Math.min(100, Math.round(v)));
    }
    return ok(r) ? 50 : 25;
  }
  const SHOP = (s, d1, d2) => s.flag('disc2') ? d2 : d1;
  // Upper Junon is warm sandstone and ochre (04-junon16/20/21/28), not the cool grey of the theme.
  const JUNON_STONE = {
    floor: ['#76705e', '#706a58'], floor2: ['#8a7a62', '#827258'], floor3: ['#9a7a58', '#927252'],
    wall: '#9a7a58', wallTop: '#3a2a1c', roof: '#5a4634', trim: '#4a3020',
    sky: ['#6a88b8', '#e8cca0'], fog: { color: [0.78, 0.7, 0.6], near: 12, far: 30 },
    ambient: [0.52, 0.48, 0.44], light: [0.92, 0.84, 0.72],
  };
  // The avenues (04-junon16/20/21/29): long red cloth banners hang on the sandstone facades. Each is a
  // 'banner' prop hung 5 cm off the facade row's south face (fractional `at`: row + 0.6), with "NEW AGE"
  // at the top and SHINRA brushed down the cloth (one wall label per letter, in front of the cloth).
  const avenueBanner = (x, row) => ({ at: [x, row + 0.6], prop: 'banner', w: 1.3, h: 2.5, y: 3.0, col: '#a41c1c', col2: '#d8b060', text2: 'NEW AGE', text2Col: '#f4f0e8' });
  const avenueBrush = (x, row, word) => word.split('').map((ch, i) => ({ at: [x, row], face: 's', off: 0.08, text: ch, size: 0.2, y: 2.4 - i * 0.27, col: '#1a1210', w: 0.2, italic: true }));
  // dark shop signboard with warm lettering over a door or a shop counter in the facade row
  const shopSign = (x, row, text) => ({ at: [x, row + 0.6], prop: 'neon', text, y: 2.3, size: 0.16, col: '#ffd890', col2: '#2a2018' });

  // ------------------------------------------------------------------ the tower top and the airport
  FF7.defineMap('junon_airport', {
    name: 'Junon Airport', area: 'Junon', theme: 'junon', music: 'shinra', look: JUNON_STONE,
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XXXXXhhhhhhhhhhhhhhhhhhhhXXXXX",
      "XXXXXhhhhhhhhhhhhhhhhhhhhXXXXX",
      "#....MM.........l.......MM...#",
      "#............................#",
      "#..B..........................",
      "#.............................",
      "#..BB.......l.........l.......",
      "#............................#",
      "#............................#",
      "#=============H==============#",
      "~~~~~~~~~~~~~PHP~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~PHP~~~~~~~~~~~~~~",
      "~~~~~~~~~~~=.....=~~~~~~~~~~~~",
      "~~~~~~~~~~~=.....=~~~~~~~~~~~~",
      "~~~~~~~~~~~=======~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888888888888888888888",
      "888888888888887888888888888888",
      "000000000000055500000000000000",
      "000000000000033300000000000000",
      "000000000002222222000000000000",
      "000000000002222222000000000000",
      "000000000002222222000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_dolphin: [14, 14, 'up'], from_barracks: [28, 6, 'left'] },
    exits: [{ at: [29, 5, 1, 3], to: 'junon_barracks', entry: 'from_airport' }],
    npcs: [
      { id: 'ap_mech', name: 'Mechanic', model: 'worker3', at: [6, 4], dir: 'up', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) { yield s.say('Mechanic', "She's the Highwind. Biggest airship Shinra's ever built. The President can take her up whenever he likes.\f...Between you and me, the pilot they stole her design from is still sore about it."); } },
    ],
    triggers: [
      { at: [5, 2, 20, 1], on: 'talk', run: function* (s) { yield s.msg('The hangar gates stand open. Inside, the enormous hull of an airship: the HIGHWIND.'); } },
      { id: 'highwind', at: [12, 9, 5, 1], once: true, if: s => !s.flag('c5b_disguised'), run: function* (s) {
          yield s.cam(15, 3, 60, { pitch: 32 });
          yield s.emote('player', '!');
          yield s.say('cloud', "(What is that...? An airship?)");
          yield s.msg('Through the hangar gates, a colossal airship rests above the runway.\nOn its hull, one word: HIGHWIND.');
          yield s.say('cloud', "(Shinra has an airship now...)");
          yield s.camFollow();
          s.spawn('run1', 'soldier', 1, 6, 'right'); s.spawn('run2', 'soldier', 1, 7, 'right');
          yield [s.run('run1', 20, 6), s.run('run2', 19, 7)];
          yield s.say('Soldier', "Move it, move it! The President's plane is landing! Everybody to the barracks and get changed!");
          yield [s.run('run1', 29, 6), s.run('run2', 29, 7)];
          s.remove('run1'); s.remove('run2');
          yield s.say('cloud', "(...The barracks. If I blend in with the soldiers, I can get close to the ships.)");
        } },
    ],
    onLoad: wearUniform,
    onEnter: function* (s) {
      if (s.flag('c5b_airport_arrived') || s.entry() !== 'from_dolphin') return;
      s.set('c5b_airport_arrived');
      yield s.say('cloud', "(......Made it. That dolphin's got quite a jump.)\f(Now, up the tower...)");
    },
  });

  // ------------------------------------------------------------------ the barracks: the uniform, the drill, the parade
  FF7.defineMap('junon_barracks', {
    name: 'Junon Barracks', area: 'Junon', theme: 'shinra', music: 'shinra',
    grid: [
      "########################",
      "#qqqqqqqqqqq#qqqqqqqqqq#",
      "#......................#",
      "#..cccc.......cccc.....#",
      ".......................#",
      ".......................#",
      "........M..............#",
      "#......................#",
      "#......................#",
      "###########++###########",
    ],
    entries: { from_airport: [1, 5, 'right'], from_street: [11, 8, 'up'] },
    exits: [
      { at: [0, 4, 1, 3], to: 'junon_airport', entry: 'from_barracks' },
      { at: [11, 9, 2, 1], to: 'junon_street1', entry: 'from_barracks', sfx: 'door_shinra' },
    ],
    npcs: [
      { id: 'bk_soldier', name: 'Soldier', model: 'soldier', at: [16, 6], dir: 'left', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) {
          if (s.flag('c5b_ship_boarded')) { yield s.say('Soldier', "Barracks are off-limits to civilians. ...Eh, just don't touch the lockers."); return; }
          yield s.say('Soldier', "Hey, you're the rookie from the parade! Did you see the Captain's face? I thought he was gonna pop a vein!");
        } },
      { id: 'bk_soldier2', name: 'Soldier', model: 'soldier', at: [5, 2], dir: 'up', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) { yield s.say('Soldier', "Somebody walked off with a uniform from the lockers. Guess who's getting blamed? The poor guy in 3F of the apartments is running around in his skivvies."); } },
    ],
    triggers: [
      { at: [1, 1, 11, 1], on: 'talk', run: function* (s) { yield s.msg('Rows of gray steel lockers. Most are empty.'); } },
    ],
    onLoad: wearUniform,
    onEnter: function* (s) {
      if (s.flag('c5b_disguised')) return;
      yield* FF7.story.c5b_barracks(s);
    },
  });

  FF7.story.c5b_barracks = function* (s) {
    s.spawn('bs1', 'soldier', 4, 2, 'up', { name: 'Soldier' });
    s.spawn('bs2', 'soldier', 7, 2, 'up', { name: 'Soldier' });
    s.spawn('bs3', 'soldier', 15, 2, 'up', { name: 'Soldier' });
    s.spawn('bs4', 'soldier', 19, 3, 'left', { name: 'Soldier' });
    yield s.move('player', 5, 5);
    yield s.say('Soldier', "Ugh, where'd I put my other glove...");
    s.spawn('bcap', 'soldier_red', 11, 9, 'up', { name: 'Captain' });
    s.sfx('door_shinra');
    yield s.move('bcap', 11, 6);
    yield s.face('bcap', 'player');
    yield s.emote('bcap', '!!');
    yield s.say('Captain', "YOU THERE! What do you think you're doing!?\fThe President's plane is on approach and you're standing around in THAT!?");
    yield s.say('cloud', "(...He thinks I'm one of his men.)");
    const c = yield s.ask('cloud', '', ['Yes, sir! Right away, sir!', '......']);
    if (c !== 0) yield s.say('Captain', "Don't just stand there gawping! MOVE!");
    yield s.say('Captain', "Get into uniform! You've got thirty seconds!");
    yield s.move('player', 2, 2);
    yield s.face('player', 'up');
    yield s.fadeOut(20);
    s.sfx('door2');
    yield 30;
    s.set('c5b_disguised');
    s.setModel('player', 'soldier');
    yield s.fadeIn(20);
    yield s.say('cloud', "(...A little snug. It'll do.)");
    // fall in
    yield [s.move('bs1', [[7, 2], [8, 4], [8, 5]]), s.move('bs2', [[8, 2], [9, 4], [9, 5]]), s.move('bs3', [[13, 2], [12, 4], [12, 5]]),
      s.move('bs4', [[19, 4], [13, 5]]), s.move('player', [[2, 4], [10, 4], [10, 5]])];
    ['bs1', 'bs2', 'bs3', 'bs4', 'player'].forEach(id => s.face(id, 'down'));
    yield s.move('bcap', 10, 7);
    yield s.face('bcap', 'up');
    yield s.say('Captain', "Listen up! Today President Rufus arrives in Junon! We march him in with the welcome parade, and every camera on the Planet will be pointed at YOU!");
    yield s.say('Captain', "Keep in step. Watch the man in front of you. And when I give the signal, you present arms like you MEAN it!\fAfterward, the send-off ceremony at the harbor. Same drill, rifles and all.");
    yield s.say('Captain', "Let's see it, then. Unit... PRESENT ARMS!");
    ['bs1', 'bs2', 'bs3', 'bs4'].forEach(id => s.anim(id, 'shoot'));
    const p = yield s.ask(null, '', ['Present arms', 'Salute', 'Wave']);
    if (p === 0) {
      s.anim('player', 'shoot');
      yield s.say('Captain', "...Hmph. Not bad, rookie.");
    } else if (p === 1) {
      s.anim('player', 'point');
      yield s.say('Captain', "That's a SALUTE, you idiot! I said PRESENT ARMS! Where did they find you!?");
    } else {
      s.anim('player', 'wave');
      yield s.say('Captain', "Are you WAVING!? Who are you waving at, your MOTHER!?\f......I'm surrounded by amateurs.");
    }
    ['bs1', 'bs2', 'bs3', 'bs4', 'player'].forEach(id => s.stopAnim(id));
    s.sfx('alarm_short');
    yield s.say('Captain', "That's the signal! Parade formation! Double time! GO GO GO!");
    yield [s.run('bs1', 11, 9), s.run('bs2', 12, 9), s.run('bs3', 11, 9), s.run('bs4', 12, 9), s.run('bcap', 12, 9)];
    ['bs1', 'bs2', 'bs3', 'bs4', 'bcap'].forEach(id => s.remove(id));
    yield s.run('player', 11, 8);
    yield s.goto('junon_street1', 'parade');
    yield* FF7.story.c5b_parade(s);
  };

  // ------------------------------------------------------------------ the welcome parade
  const STREET1_TOWNS = ['s1_soldier', 's1_woman', 's1_man', 's1_kid', 's1_cadet'];
  FF7.story.c5b_parade = function* (s) {
    s.setModel('player', 'soldier');
    s.music('rufus');
    for (let i = 0; i < 10; i++) {
      s.spawn('pa' + i, 'soldier', 6 + i * 3, 7, 'down', { name: 'Soldier' });
      s.spawn('pb' + i, 'soldier', 6 + i * 3, 10, 'up', { name: 'Soldier' });
    }
    s.spawn('pcap', 'soldier_red', 22, 12, 'up', { name: 'Captain' });
    s.place('player', 22, 10, 'up');
    yield s.cam(20, 8, 40);
    yield s.say('Captain', "Here he comes! Fall in, rookie, and don't you DARE mess this up!");
    // the march itself (FF7 minigame: stay in step, press the button on "Now")
    const r = yield s.minigame('parade');
    const pct = rating(r);
    // Rufus walks the route to the reviewing stand, where Heidegger waits
    s.spawn('heid', 'heidegger', 36, 8, 'left', { name: 'Heidegger' });
    s.spawn('rufus', 'rufus', 1, 8, 'right', { name: 'Rufus' });
    for (let i = 0; i < 10; i++) { s.anim('pa' + i, 'shoot'); s.anim('pb' + i, 'shoot'); }
    s.anim('player', 'shoot');
    yield s.move('rufus', 33, 8, { speed: 0.03 });
    yield s.say('heid', "Welcome to Junon, President Rufus! GYAHAHAHA!");
    yield s.say('rufus', "Spare me the fanfare, Heidegger. ...Though I suppose the people enjoy it.");
    yield s.move('rufus', 39, 8);
    s.remove('rufus');
    yield s.move('heid', 39, 8);
    s.remove('heid');
    for (let i = 0; i < 10; i++) { s.stopAnim('pa' + i); s.stopAnim('pb' + i); }
    s.stopAnim('player');
    s.music('shinra');
    yield s.caption(`WELCOME PRESIDENT RUFUS PARADE\n\nTV audience rating: ${pct}%`, { bg: 'rgba(0,10,40,0.9)', size: 22 });
    if (pct >= 50) yield s.say('Heidegger', "(over the loudspeakers) GYAHAHAHA! Record ratings! A triumph for Shinra! Whoever trained these men deserves a raise!");
    else if (pct >= 30) yield s.say('Heidegger', "(over the loudspeakers) Hmph! Acceptable. Barely. I expect better at the send-off!");
    else yield s.say('Heidegger', "(over the loudspeakers) What was THAT!? Somebody was marching like a drunken chocobo! I want names!");
    yield s.face('pcap', 'player');
    yield s.say('pcap', pct >= 30 ? "Not bad, rookie. Headquarters sends a little something for the unit." : "...Somebody up there must feel sorry for us. HQ sent a 'reward' anyway. Here.");
    if (pct >= 50) yield s.giveGil(5000);
    else if (pct >= 40) yield s.give('ether', 6);
    else if (pct >= 30) yield s.give('potion', 6);
    else yield s.give('grenade');
    yield s.say('pcap', "Next up: the President's send-off at the harbor, past the second block. Rifle routine, just like we drilled.\fBe at the docks before the ship sails. Until then... you're free. Dismissed!");
    for (let i = 0; i < 10; i++) { s.remove('pa' + i); s.remove('pb' + i); }
    yield s.move('pcap', 39, 7);
    s.remove('pcap');
    yield s.camFollow();
    s.set('c5b_parade_done');
    STREET1_TOWNS.forEach(id => s.show(id));
    yield s.say('cloud', "(The ship leaves from the harbor... That's my way across.)");
  };

  // ------------------------------------------------------------------ first street: shops, bar, apartments
  FF7.defineMap('junon_street1', {
    name: 'Upper Junon', area: 'Junon', theme: 'junon', music: 'shinra', look: JUNON_STONE,
    camera: { pitch: 42, dist: 10 },
    grid: [
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhhhhh..hhhhhhhhhhhhhhhhhhh",
      "hhhhhhh...hhh...hhhDDhhhhhhhhhhhhhhhhhhh",
      "hhh+hhhDDDhhhDDDhhh..hhhh+hhhhh+hhhhhhhh",
      "h......................................h",
      "h.......................................",
      "h....l.........l.........l.........S....",
      "h.......................................",
      "h.......................................",
      "h....l.........l.........l..............",
      "h......................................h",
      "hEE....................................h",
      "hEE....................................h",
      "h======================================h",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    heights: [
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
    ],
    // the parade street: the giant red "Rufus" banner (04-junon20/21) between the bar and the apartments,
    // NEW AGE / SHINRA banners along the facades, signboards over the shops
    props: [
      avenueBanner(5, 3), avenueBanner(11, 3), avenueBanner(17, 3), avenueBanner(22, 3), avenueBanner(37, 3),
      { at: [28, 3.6], prop: 'banner', w: 4.4, h: 3, y: 3.35, col: '#b01a1a', col2: '#ece6d8', text: 'Rufus', italic: true, textCol: '#141010', text2: 'NEW AGE', text2Col: '#ffffff' },
      shopSign(8, 3, 'MATERIA'), shopSign(14, 3, 'ITEM'), shopSign(19.5, 3, 'WEAPON'), shopSign(25, 3, 'BAR'),
    ],
    buildings: [{ at: [26, 3, 5, 1], win: false }],   // no lit windows behind the Rufus banner
    labels: [].concat(...[5, 11, 17, 22, 37].map(x => avenueBrush(x, 3, 'SHINRA')), [
      { at: [28, 3], face: 's', off: 0.08, text: 'president of SHINRA', size: 0.085, y: 2.47, col: '#f4f0e8' },
      // thin gold rules across the Rufus banner (a long '-' stroke)
      { at: [28, 3], face: 's', off: 0.075, text: '-', size: 5, w: 0.005, y: 2.33, col: '#d8a840' },
      { at: [28, 3], face: 's', off: 0.075, text: '-', size: 5, w: 0.005, y: 1.3, col: '#d8a840' },
    ]),
    entries: { from_barracks: [3, 4, 'down'], from_bar1: [25, 4, 'down'], from_apt: [31, 4, 'down'], from_street2: [38, 7, 'left'], parade: [22, 10, 'up'], from_elevator: [3, 11, 'right'] },
    exits: [
      { at: [3, 3, 1, 1], to: 'junon_barracks', entry: 'from_street', sfx: 'door_shinra' },
      { at: [25, 3, 1, 1], to: 'junon_bar1', entry: 'from_street', sfx: 'door' },
      { at: [31, 3, 1, 1], to: 'junon_apt', entry: 'from_street', sfx: 'door' },
      { at: [39, 5, 1, 5], to: 'junon_street2', entry: 'from_street1' },
      { at: [1, 11, 2, 2], run: function* (s) {
          if (!s.flag('c5b_ship_boarded')) {
            yield s.say('cloud', "(The elevator down to the lower town. No time for that now.)");
            return;
          }
          const c = yield s.ask('Shinra Guard', "Heading down? 10 Gil for the elevator.", ['Pay 10 Gil', 'No thanks']);
          if (c === 0 && s.takeGil(10)) { s.sfx('elevator'); yield s.goto('junon_lower', 'from_elevator'); return; }
          if (c === 0) yield s.say('Shinra Guard', "No Gil, no ride.");
        } },
    ],
    npcs: [
      { id: 'm1_keep', name: 'Shopkeeper', model: 'woman2', at: [8, 2], dir: 'down' },
      { id: 'i1_keep', name: 'Shopkeeper', model: 'man6', at: [14, 2], dir: 'down' },
      { id: 'w1_keep', name: 'Shopkeeper', model: 'man2', at: [19, 1], dir: 'down' },
      { id: 's1_soldier', name: 'Soldier', model: 'soldier', at: [12, 8], dir: 'down', wander: 2, show: s => s.flag('c5b_parade_done'),
        talk: function* (s) {
          if (!disguised(s)) { yield s.say('Soldier', "Keep your nose clean, civilian. This is a military town."); return; }
          yield s.say('Soldier', "Were you in the parade? Somebody in the third row was totally out of step.\fThe Captain's gonna have that guy scrubbing latrines till he retires. Heh heh.");
        } },
      { id: 's1_woman', name: 'Woman', model: 'woman5', at: [22, 5], dir: 'down', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) { yield s.say('Woman', "Did you see President Rufus? So young, so cool... Nothing like his father, that's for sure."); } },
      { id: 's1_man', name: 'Man', model: 'man8', at: [30, 9], dir: 'left', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) { yield s.say('Man', "Junon's giant cannon points out over the ocean. They say it can hit a target clear across the sea.\fI sleep better not thinking about it."); } },
      { id: 's1_kid', name: 'Boy', model: 'kid', at: [17, 11], dir: 'up', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) {
          yield s.say('Boy', "When I grow up, I'm gonna join SOLDIER! I'm gonna be First Class, just like Sephiroth was!");
          yield s.say('cloud', "......");
        } },
      { id: 's1_cadet', name: 'Soldier', model: 'soldier', at: [36, 5], dir: 'down', show: s => s.flag('c5b_parade_done'),
        talk: function* (s) { yield s.say('Soldier', "Save your progress at that glowing crystal, rookie. ...What? Everybody does it."); } },
      { id: 's1_elguard', name: 'Shinra Guard', model: 'soldier', at: [3, 12], dir: 'right', show: s => s.flag('c5b_ship_boarded'),
        talk: function* (s) { yield s.say('Shinra Guard', "The elevator goes down to the lower town. 10 Gil a ride."); } },
    ],
    triggers: [
      counter([7, 3, 3, 1], function* (s) {
        yield s.say('m1_keep', disguised(s) ? "Oh, a soldier! Stocking up on materia for duty?" : "Materia for sale. Take your time.");
        yield s.shop('junon_upper_materia');
      }),
      counter([13, 3, 3, 1], function* (s) {
        yield s.say('i1_keep', "Welcome! Potions, remedies, the works.");
        yield s.shop(SHOP(s, 'junon_upper_items', 'junon_upper_items_d2'));
      }),
      counter([19, 2, 2, 1], function* (s) {
        yield s.say('w1_keep', "Weapons, eh? Take a look down the alley. Good stuff, fair prices.");
        yield s.shop(SHOP(s, 'junon_upper_weapons', 'junon_upper_weapons_d2'));
      }),
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ bars (Rude in the first, Elena in the second)
  const BAR_GRID = [
    "##################",
    "#kkk.jj....kkk...#",
    "#..............j.#",
    "#DDDDDD..........#",
    "#..c.c.c...t.t...#",
    "#..........c.c...#",
    "#................#",
    "#................#",
    "########+#########",
  ];
  FF7.defineMap('junon_bar1', {
    name: 'Junon Bar', area: 'Junon', theme: 'bar', music: 'shinra',
    grid: BAR_GRID,
    lights: [[3, 2, '#ffc080', 3], [12, 4, '#ffc080', 2.5]],
    entries: { from_street: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 1, 1], to: 'junon_street1', entry: 'from_bar1', sfx: 'door' }],
    npcs: [
      { id: 'bar1_tender', name: 'Bartender', model: 'bartender', at: [3, 2], dir: 'down' },
      { id: 'rude_bar', name: 'Rude', model: 'rude', at: [5, 4], dir: 'up', anim: 'sit', faceOnTalk: false, show: s => !s.flag('c5b_ship_boarded'),
        talk: function* (s) {
          yield s.say('rude_bar', "......");
          yield s.say('rude_bar', "...I'm off duty.\f......Nice uniform. I didn't see you.");
        } },
      { id: 'bar1_soldier', name: 'Soldier', model: 'soldier', at: [11, 5], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Soldier', "*hic* The new President... They say he's even colder than his old man.\fWell, here's to him. Nobody else is gonna drink to it. *hic*"); } },
    ],
    triggers: [
      counter([1, 3, 6, 1], function* (s) {
        yield s.say('bar1_tender', "What'll it be? ...Ah, you're on duty. Water, then.");
        if (!s.flag('c5b_ship_boarded')) yield s.say('bar1_tender', "(whispering) The big guy in the suit's a Turk. Drinks alone every night he's in town. Doesn't say a word.");
      }),
    ],
    onLoad: wearUniform,
  });

  FF7.defineMap('junon_bar2', {
    camera: { pitch: 62, dist: 9.5 },   // seen from above (04-junon18)
    name: 'Junon Bar', area: 'Junon', theme: 'bar', music: 'shinra',
    look: { floor: ['#6a4a38', '#624432'], wall: '#7a5848' },
    grid: BAR_GRID,
    lights: [[3, 2, '#ffc080', 3], [12, 4, '#ffc080', 2.5]],
    entries: { from_street: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 1, 1], to: 'junon_street2', entry: 'from_bar2', sfx: 'door' }],
    npcs: [
      { id: 'bar2_tender', name: 'Bartender', model: 'bartender2', at: [3, 2], dir: 'down' },
      { id: 'elena_bar', name: 'Elena', model: 'elena', at: [3, 4], dir: 'up', anim: 'sit', faceOnTalk: false, show: s => !s.flag('c5b_ship_boarded'),
        talk: function* (s) {
          yield s.say('elena_bar', "Hm? What do you want, soldier? I'm on a break.\f...Don't you dare tell Tseng you saw me here.");
          yield s.say('elena_bar', "He says I talk too much. Me! I do NOT talk too much! I simply share information... efficiently!\f......Wait, why am I telling you this?");
        } },
      { id: 'bar2_woman', name: 'Woman', model: 'woman6', at: [13, 5], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Woman', "The ship to the western continent leaves right after the send-off. My husband's crew is loading it now."); } },
    ],
    triggers: [
      counter([1, 3, 6, 1], function* (s) { yield s.say('bar2_tender', "Welcome. Soldiers drink half price tonight—in honor of the new President."); }),
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ the apartment block (Beginner's Hall, sources)
  FF7.defineMap('junon_apt', {
    camera: { pitch: 64, dist: 10 },   // seen from above (04-junon14)
    name: 'Junon Residences', area: 'Junon', theme: 'house', music: 'shinra',
    look: { wall: '#9a9aa0', trim: '#4a4a58', floor: ['#8a8278', '#827a70'] },
    grid: [
      "##########################",
      "#kk..b........q......b.kk#",
      "#........................#",
      "#...t...........t........#",
      "#==================^^====#",
      "#........................#",
      "#b......k......j.....b..q#",
      "#........................#",
      "#......t....c.t..........#",
      "#==^^====================#",
      "#............#...........#",
      "#............#..k..k..k..#",
      "#............+...........#",
      "#...o........#.....ttt...#",
      "#............#...........#",
      "#####+####################",
    ],
    heights: [
      "88888888888888888888888888",
      "88888888888888888888888888",
      "88888888888888888888888888",
      "88888888888888888888888888",
      "88888888888888888886688888",
      "44444444444444444444444444",
      "44444444444444444444444444",
      "44444444444444444444444444",
      "44444444444444444444444444",
      "44422444444444444444444444",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    entries: { from_street: [5, 14, 'up'] },
    exits: [{ at: [5, 15, 1, 1], to: 'junon_street1', entry: 'from_apt', sfx: 'door' }],
    items: [
      { at: [22, 14], materia: 'enemy_skill', id: 'junon_apt_eskill' },
      { at: [10, 7], item: '1_35_soldier', id: 'junon_apt_soldier' },
      { at: [17, 5], item: 'mind_source', id: 'junon_apt_mind' },
      { at: [22, 7], item: 'luck_source', id: 'junon_apt_luck' },
      { at: [4, 2], item: 'power_source', id: 'junon_apt_power' },
      { at: [22, 2], item: 'guard_source', id: 'junon_apt_guard' },
    ],
    npcs: [
      { id: 'apt_guide', name: 'Soldier', model: 'soldier', at: [2, 11], dir: 'right',
        talk: function* (s) {
          yield s.say('Soldier', "Psst! Hey, over here! You look a little lost.\fThe Beginner's Hall is through that door on the right. All the basics of fighting and materia, explained nice and slow.");
        } },
      { id: 'bh_tutor1', name: 'Instructor', model: 'man9', at: [16, 12], dir: 'down',
        talk: function* (s) {
          yield s.say('Instructor', "Welcome to the Beginner's Hall! Let's review battle basics.\fWhen a character's ATB gauge fills, they can act. Keep an eye on the enemy's attacks, and heal before your HP runs low!");
          yield s.say('Instructor', "Characters in the back row take less damage from physical attacks—but deal less, too, unless their weapon reaches from afar.\fThe Long Range materia fixes that. Handy for sword fighters in the back.");
        } },
      { id: 'bh_tutor2', name: 'Instructor', model: 'woman8', at: [20, 11], dir: 'down',
        talk: function* (s) {
          yield s.say('Instructor', "Materia grows as it earns AP. Put it in linked slots to pair support materia with others.\fFor example, All + a magic materia lets you cast that spell on every enemy at once!");
          yield s.say('Instructor', "And Enemy Skill materia can learn attacks that monsters use on you. There's one sitting in this hall—go ahead and take it.");
        } },
      { id: 'apt_underwear', name: 'Soldier', model: { base: 'man', hair: '#3a2a1a', top: '#f0f0f0', sleeve: 'skin', bottom: '#e8e8f0', legs: 'skin', boots: '#f0c8a0' }, at: [12, 7], dir: 'down', show: s => s.flag('c5b_disguised'),
        talk: function* (s) {
          yield s.say('Soldier', "Wh-where's my uniform!? I left it in my locker at the barracks, and now it's GONE!\fIf the Captain sees me like this, I'm done for!");
          if (disguised(s)) yield s.say('cloud', "(......Sorry.)");
        } },
      { id: 'apt_mom', name: 'Woman', model: 'woman3', at: [10, 2], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "My husband's in the army. The pay's good, but he's never home... and I never know where they're sending him next."); } },
      { id: 'apt_kid', name: 'Girl', model: 'girl3', at: [7, 6], dir: 'right', wander: 2,
        talk: function* (s) { yield s.say('Girl', "Did you see the parade? My dad was in it! He was the one in the blue uniform!\f...They were ALL in blue uniforms? Oh."); } },
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ second street: bar, inn building, rooms, weapons
  FF7.defineMap('junon_street2', {
    name: 'Upper Junon', area: 'Junon', theme: 'junon', music: 'shinra', look: JUNON_STONE,
    camera: { yaw: -18, pitch: 40, dist: 10 },
    grid: [
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhh...hhhhhhhhh",
      "hhhhhh+hhhhhhh+hhhhhhh+hhhhhDDDhhhhhhhhh",
      "h......................................h",
      "........................................",
      "....l.........l.........l.........l.....",
      "........................................",
      "........................................",
      "....l.........l.........l.........l.....",
      "h......................................h",
      "h......................................h",
      "h======================================h",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    heights: [
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
      "6666666666666666666666666666666666666666",
    ],
    // NEW AGE / SHINRA banners all along the facades (04-junon16/29), signboards over the doors and the shop
    props: [
      avenueBanner(3.4, 3), avenueBanner(10, 3), avenueBanner(18, 3), avenueBanner(25, 3), avenueBanner(33, 3), avenueBanner(37, 3),
      shopSign(6, 3, 'BAR'), shopSign(14, 3, 'INN'), shopSign(29, 3, 'WEAPON'),
    ],
    labels: [].concat(...[3, 10, 18, 25, 33, 37].map(x => avenueBrush(x, 3, 'SHINRA'))),
    entries: { from_street1: [1, 7, 'right'], from_dock: [38, 7, 'left'], from_bar2: [6, 4, 'down'], from_inn: [14, 4, 'down'], from_rooms: [22, 4, 'down'] },
    exits: [
      { at: [0, 5, 1, 5], to: 'junon_street1', entry: 'from_street2' },
      { at: [39, 5, 1, 5], to: 'junon_dock', entry: 'from_street2' },
      { at: [6, 3, 1, 1], to: 'junon_bar2', entry: 'from_street', sfx: 'door' },
      { at: [14, 3, 1, 1], to: 'junon_inn', entry: 'from_street', sfx: 'door' },
      { at: [22, 3, 1, 1], to: 'junon_rooms', entry: 'from_street', sfx: 'door' },
    ],
    npcs: [
      { id: 'w2_keep', name: 'Shopkeeper', model: 'man4', at: [29, 2], dir: 'down' },
      { id: 'drill_sgt', name: 'Sergeant', model: 'soldier_red', at: [34, 10], dir: 'up',
        talk: function* (s) { yield s.say('Sergeant', disguised(s) ? "You! Why aren't you drilling!? ...Send-off detail? Then get to the harbor, soldier!" : "Civilians keep clear of the drill yard!"); } },
      { id: 'drill1', name: 'Soldier', model: 'soldier', at: [32, 11], dir: 'down', anim: 'shoot' },
      { id: 'drill2', name: 'Soldier', model: 'soldier', at: [34, 11], dir: 'down', anim: 'shoot' },
      { id: 'drill3', name: 'Soldier', model: 'soldier', at: [36, 11], dir: 'down', anim: 'shoot',
        talk: function* (s) { yield s.say('Soldier', "Hup! Two! Three! Four! ...Can't talk. Drilling."); } },
      { id: 's2_man', name: 'Man', model: 'man5', at: [18, 8], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Man', "They say Sephiroth—THE Sephiroth—was spotted here in Junon a few days ago.\fSOLDIER's great hero, back from the dead? Ha. Must be a ghost story."); } },
      { id: 's2_woman', name: 'Woman', model: 'woman9', at: [27, 6], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "The harbor's straight ahead. Big ships leave for the western continent—Costa del Sol, the sunny resort town."); } },
    ],
    triggers: [
      counter([28, 3, 3, 1], function* (s) {
        yield s.say('w2_keep', "Welcome! ...Well, sort of. I ordered a whole new line of weapons and they shipped me the same old stock.\fHave a look anyway.");
        yield s.shop(SHOP(s, 'junon_upper_weapons2', 'junon_upper_weapons2_d2'));
      }),
      // a group of oddly familiar "Shinra personnel" hurry toward the harbor
      { id: 'glimpse', at: [8, 4, 1, 8], once: true, if: s => s.flag('c5b_parade_done') && !s.flag('c5b_ship_boarded'),
        run: function* (s) {
          s.spawn('g1', { base: 'sailor', build: 'big', skin: '#6a4028', hair: '#f4f4f4', extras: ['gunarmR', 'beard'] }, 0, 6, 'right', { name: 'Sailor' });
          s.spawn('g2', { base: 'soldier', female: true }, 0, 7, 'right', { name: 'Soldier' });
          s.spawn('g3', { base: 'sailor', female: true, hair: '#2a1a18', hairStyle: 'long' }, 0, 8, 'right', { name: 'Sailor' });
          s.spawn('g4', 'redxiii', 0, 9, 'right', { name: '???' });
          yield [s.run('g1', 39, 6), s.run('g2', 39, 7), s.run('g3', 39, 8), s.run('g4', 39, 9)];
          ['g1', 'g2', 'g3', 'g4'].forEach(id => s.remove(id));
          yield s.emote('player', '?');
          yield s.say('cloud', "(......Was that a sailor with a tail?)");
        } },
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ the inn building: inn / materia / accessories
  FF7.defineMap('junon_inn', {
    name: 'Junon Inn', area: 'Junon', theme: 'house', music: 'shinra',
    look: { wall: '#a09080', trim: '#5a4a38' },
    grid: [
      "####################",
      "#kk.....q...q....kk#",
      "#.........DDD......#",
      "#..................#",
      "#==^^==============#",
      "#..................#",
      "#kk.....DDD......kk#",
      "#..................#",
      "#..................#",
      "#=============^^===#",
      "#..................#",
      "#.DDD.....c.t.c....#",
      "#..................#",
      "#b.b..............j#",
      "#..................#",
      "#########+##########",
    ],
    heights: [
      "88888888888888888888",
      "88888888888888888888",
      "88888888888888888888",
      "88888888888888888888",
      "88866888888888888888",
      "44444444444444444444",
      "44444444444444444444",
      "44444444444444444444",
      "44444444444444444444",
      "44444444444444224444",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
      "00000000000000000000",
    ],
    entries: { from_street: [9, 14, 'up'] },
    exits: [{ at: [9, 15, 1, 1], to: 'junon_street2', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'inn_keep', name: 'Innkeeper', model: 'woman10', at: [3, 10], dir: 'down' },
      { id: 'm2_keep', name: 'Shopkeeper', model: 'man10', at: [9, 5], dir: 'down' },
      { id: 'a_keep', name: 'Shopkeeper', model: 'woman11', at: [11, 1], dir: 'down' },
      { id: 'inn_guest', name: 'Traveler', model: 'man11', at: [12, 12], dir: 'up', anim: 'sit',
        talk: function* (s) { yield s.say('Traveler', "I'm waiting on the ship to Costa del Sol. Sun, sand, and not a single Shinra uniform in sight... present company excepted."); } },
    ],
    triggers: [
      counter([2, 11, 3, 1], function* (s) { yield s.inn(100, { who: 'inn_keep', text: "Welcome to the Junon Inn. 100 Gil a night. Will you stay?" }); }),
      counter([8, 6, 3, 1], function* (s) {
        yield s.say('m2_keep', "Materia, second floor special! Have a look.");
        yield s.shop(SHOP(s, 'junon_upper_materia2', 'junon_upper_materia2_d2'));
      }),
      counter([10, 2, 3, 1], function* (s) {
        yield s.say('a_keep', "Accessories to protect against the nastier status effects. The Headband's a favorite.");
        yield s.shop(SHOP(s, 'junon_upper_accessories', 'junon_upper_accessories_d2'));
      }),
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ the rooms building (Speed Source, 1/35 soldier)
  FF7.defineMap('junon_rooms', {
    name: 'Junon Residences', area: 'Junon', theme: 'house', music: 'shinra',
    grid: [
      "##################",
      "#b..k.....#b..j..#",
      "#.........+......#",
      "#...t.....#...t..#",
      "#=======^^#======#",
      "#................#",
      "#.k....t.....b...#",
      "#................#",
      "#...c............#",
      "#................#",
      "########+#########",
    ],
    heights: [
      "444444444444444444",
      "444444444444444444",
      "444444444444444444",
      "444444444444444444",
      "444444442244444444",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
      "000000000000000000",
    ],
    entries: { from_street: [8, 9, 'up'] },
    exits: [{ at: [8, 10, 1, 1], to: 'junon_street2', entry: 'from_rooms', sfx: 'door' }],
    items: [
      { at: [14, 7], item: 'speed_source', id: 'junon_rooms_speed' },
      { at: [15, 2], item: '1_35_soldier', id: 'junon_rooms_soldier' },
    ],
    npcs: [
      { id: 'rooms_woman', name: 'Woman', model: 'woman12', at: [5, 7], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "Shinra built these apartments for the soldiers' families. Every window looks out over the sea... and the cannon."); } },
      { id: 'rooms_boy', name: 'Boy', model: 'kid6', at: [13, 3], dir: 'down',
        talk: function* (s) { yield s.say('Boy', "I collect 1/35 scale Shinra soldier figures! I've got TWELVE! ...There's supposed to be one hidden somewhere in every building in Junon."); } },
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ the harbor: Rufus, the send-off, the cargo ship
  FF7.defineMap('junon_dock', {
    name: 'Junon Harbor', area: 'Junon', theme: 'junon', music: 'shinra',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX~~~~~~~~~~~~",
      "XhhhhhhhhhhhhhhhhhhhhhhX~~~~~~~~~~~~",
      "X......................=~hhhhhhhhhh~",
      "X...S..................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      ".......................=~hhhhhhhhhh~",
      ".......................=~hhhhhhhhhh~",
      ".......................=~hhhhhhhhhh~",
      ".......................KKKhhhhhhhhh~",
      ".......................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      "X......................=~hhhhhhhhhh~",
      "X======================~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    heights: [
      "222222222222222222222222000000000000",
      "222222222222222222222222000000000000",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222222222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222222022222222220",
      "222222222222222222222220000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    // sandstone quay; the cargo ship's hull (the 'h' block in the water) stays dark steel
    look: Object.assign({}, JUNON_STONE, { water: '#1a4a78', floor3: ['#50525a', '#4a4c54'], wallTop: '#2a2c32', roof: '#34363e' }),
    entries: { from_street2: [1, 8, 'right'], from_ship: [22, 9, 'left'] },
    exits: [
      { at: [0, 6, 1, 5], to: 'junon_street2', entry: 'from_dock' },
      { at: [25, 9, 1, 1], run: function* (s) { yield* FF7.story.c5b_gangway(s); } },
    ],
    npcs: [
      { id: 'dock_sailor', name: 'Sailor', model: 'sailor', at: [21, 8], dir: 'left',
        talk: function* (s) {
          if (!s.flag('c5b_ship_boarded')) {
            yield s.say('Sailor', s.flag('c5b_sendoff_done') ? "Soldier, you're on the cargo detail? Up the gangway, quick—we cast off any minute!" : "The cargo ship sails for Costa del Sol right after the President's send-off. Big ceremony, lots of brass.");
            return;
          }
          if (s.flag('has_buggy') && !s.flag('has_highwind')) { yield s.say('Sailor', "Heading for Costa del Sol? The cargo ship still takes passengers. Just step aboard."); return; }
          yield s.say('Sailor', "No sailings today. Shinra's got every ship tied up on some big operation.");
        } },
      { id: 'dock_worker', name: 'Dock Worker', model: 'worker4', at: [8, 3], dir: 'down', wander: 2,
        talk: function* (s) { yield s.say('Dock Worker', "Crates, crates, and more crates. Whatever's in these, Shinra wants it across the ocean in a hurry."); } },
    ],
    onLoad: wearUniform,
    onEnter: function* (s) {
      if (!s.flag('c5b_parade_done') || s.flag('c5b_sendoff_done')) return;
      yield* FF7.story.c5b_sendoff(s);
    },
  });

  // --- the send-off: Rufus' speech, the rifle ceremony, Rufus & Heidegger, boarding orders
  FF7.story.c5b_sendoff = function* (s) {
    s.setModel('player', 'soldier');
    s.music('rufus');
    for (let i = 0; i < 6; i++) {
      s.spawn('dl' + i, 'soldier', 4 + i * 3, 5, 'down', { name: 'Soldier' });
      s.spawn('dr' + i, 'soldier', 4 + i * 3, 12, 'up', { name: 'Soldier' });
    }
    s.spawn('scap', 'soldier_red', 15, 9, 'up', { name: 'Captain' });
    s.spawn('tri1', 'soldier', 11, 10, 'up', { name: 'Soldier' });
    s.spawn('tri2', 'soldier', 13, 10, 'up', { name: 'Soldier' });
    yield s.move('player', [[6, 8], [12, 9], [12, 10]]);
    yield s.face('player', 'up');
    yield s.say('Captain', "There you are, rookie! Fall in with the honor guard—the President's coming!\fSame as we drilled: follow my commands, match the men beside you, and DON'T face the wrong way!");
    s.spawn('rufus', 'rufus', 0, 8, 'right', { name: 'Rufus' });
    s.spawn('heid', 'heidegger', 0, 7, 'right', { name: 'Heidegger' });
    yield [s.move('rufus', 12, 8, { speed: 0.03 }), s.move('heid', 10, 7, { speed: 0.03 })];
    yield s.face('rufus', 'down');
    yield s.cam(12, 8, 30);
    yield s.say('rufus', "Soldiers of Junon.\fMy father kept this world in line with money. I intend to do it another way.");
    yield s.say('rufus', "A man called Sephiroth is loose, and he has made fools of us all. I'm crossing to the western continent to settle the matter personally.\fThe Promised Land will belong to Shinra. That is all.");
    yield s.say('heid', "GYAHAHA! You heard the President! Honor guard—begin!");
    yield s.camFollow();
    // the rifle drill: the Send-off Ceremony minigame (js/minigames/misc_games.js 'sendoff'): each order on the beat,
    // with the men beside Cloud; 10 points a move in step (facing the same way as them), 30 for the finishing pose
    const r = yield s.minigame('sendoff', { player: 'soldier' });
    const score = r && typeof r.score === 'number' ? r.score : 0;
    yield s.msg(`Send-off ceremony score: ${score} points`);
    if (score >= 100) yield s.say('heid', "GYAHAHAHA! Magnificent! That one there—give that soldier something worthy of him!");
    else if (score >= 60) yield s.say('heid', "Not bad, not bad! GYAHAHA!");
    else yield s.say('heid', "Hmph! Sloppy! Sloppy! Who trains these men!?");
    yield s.say('Captain', "Here, rookie. From the General himself.");
    if (score >= 100) yield s.give('force_stealer');
    else if (score >= 60) yield s.giveMateria('hp_plus');
    else yield s.give('silver_glasses');
    // what Cloud overhears
    yield s.face('rufus', 'heid');
    yield s.face('heid', 'rufus');
    yield s.say('heid', "Before you go, sir: Sephiroth was sighted here in Junon a few days ago. By the time our men arrived, he'd vanished.");
    yield s.say('rufus', "Of course he had.");
    yield s.say('heid', "Also, the airship Highwind stands ready for you, sir. And the Gelnika is hauling our cargo overseas.");
    yield s.say('rufus', "I prefer the sea. It gives me time to think.");
    yield s.say('heid', "GYAHAHAHA! As you wish!");
    yield s.say('rufus', "...And stop that laugh. It grates on me.");
    yield s.say('heid', "......Yes, sir.");
    yield s.say('rufus', "What of Hojo?");
    yield s.say('heid', "He left a letter of resignation and disappeared, sir. No one knows where he's gone.");
    yield s.say('rufus', "Let him go. He was my father's pet, not mine.");
    yield s.move('rufus', [[22, 8], [22, 9], [25, 9]]);
    s.remove('rufus');
    yield s.move('heid', 0, 7);
    s.remove('heid');
    yield s.say('Captain', "Honor guard, dismissed!\f...Rookie! You're on cargo watch for the crossing. Up that gangway, now—she sails any minute!");
    for (let i = 0; i < 6; i++) { s.remove('dl' + i); s.remove('dr' + i); }
    s.remove('tri1'); s.remove('tri2');
    yield s.move('scap', 0, 9);
    s.remove('scap');
    s.music('shinra');
    s.set('c5b_sendoff_done');
    yield s.say('cloud', "(A free ride across the sea... Couldn't ask for better.)");
  };

  FF7.story.c5b_gangway = function* (s) {
    if (!s.flag('c5b_sendoff_done')) {
      yield s.say('Sailor', "Hold it! Nobody boards before the President's send-off.");
      return;
    }
    if (!s.flag('c5b_ship_boarded')) {
      const c = yield s.ask(null, 'Board the cargo ship?', ['Board', 'Not yet']);
      if (c !== 0) return;
      s.set('c5b_ship_boarded');
      yield s.fadeOut(30);
      s.music('none');
      s.sfx('train_horn');
      yield s.caption("The cargo ship's horn sounds across the harbor.\nSlowly, she pulls away from Junon,\nbound for the western continent...", { bg: '#000', aboveFade: true, hold: 220 });
      yield s.goto('ship_hold', 'boarded');
      return;
    }
    if (s.flag('has_buggy') && !s.flag('has_highwind')) {
      const c = yield s.ask(null, 'Take the ship to Costa del Sol?', ['Board', 'Not now']);
      if (c === 0) { yield s.fadeOut(30); yield s.goto('costa_port', 'from_ship'); return; }
    } else {
      yield s.say('Sailor', "No boarding. This ship's not going anywhere today.");
    }
  };
})();

// Chapter 4 (part 2) — Shinra HQ floors 60-66: the security floor (sneaking past the guards),
// the 61F gardener (Keycard 62), Mayor Domino's library password (Keycard 65), the 63F door /
// coupon puzzle, the 64F recreation floor, the 65F Midgar model (Keycard 66) and the executive
// meeting overheard from the 66F restroom vent. (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C4 = FF7.c4 = FF7.c4 || {};
  const elev = (floor) => function* (s) { yield* FF7.story.c4_elevator(s, floor); };
  const needCard = (card, n) => function* (s) {
    yield s.msg(`The door is locked. The card reader flashes:\n"KEYCARD ${n} REQUIRED."`);
    yield* C4.stepBack(s);
  };

  // ------------------------------------------------------------------ 60F security floor
  // FF7: Cloud dashes between the golden statues while the guards look away, then signals Barret and Tifa to
  // follow. Played as the Shinra HQ 60F minigame (js/minigames/misc_games.js 'shinra_sneak'); spotted: the guards'
  // alarm (a battle) and back to the start; after five fights the floor is simply cleared.
  function* sneak(s) {
    const g1 = [12, 2], g2 = [23, 2];
    s.spawn('g1', 'soldier', g1[0], g1[1], 'down', { name: 'Guard' });
    s.spawn('g2', 'soldier', g2[0], g2[1], 'down', { name: 'Guard' });
    s.spawn('barret', 'barret', 5, 5, 'right', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 5, 6, 'right', { name: 'Tifa' });
    yield s.move('player', 8, 5);
    yield s.cam(17, 4, 50, { dist: 11 });
    yield s.say('tifa', "(whispering) Guards... If they spot us, the whole floor will come down on us.");
    yield s.say('cloud', "(I'll go first and hide behind the statues. Wait for my signal.)");
    yield s.say('barret', "(Hmph. Fine. Just don't screw it up.)");
    s.camFollow(30); s.camZoom(9.5, 50);
    let fails = 0;
    for (;;) {
      const r = yield s.minigame('shinra_sneak', { player: s.leader(), seed: fails });
      if (r && r.won) break;
      yield s.emote('g1', '!');
      yield s.say('Guard', "Hey! Intruders! Sound the alarm!");
      s.sfx('alarm_short');
      yield s.battle({ table: 'event_shinra_60f', bg: 'shinra', music: 'battle', noEscape: true });
      if (++fails >= 5) {
        yield s.say('tifa', "...I think we've knocked out every guard on this floor.");
        yield s.say('barret', "So much for sneakin'. Let's just go!");
        break;
      }
      yield s.say('barret', "(Dammit! More of 'em are comin'. Back to the start, quick!)");
    }
    s.set('c4_60f_passed');
    s.remove('g1'); s.remove('g2');
    yield s.fadeOut(12);   // (they made it across: by the far door)
    s.place('player', 27, 5, 'right'); s.place('barret', 26, 6, 'right'); s.place('tifa', 26, 5, 'right');
    yield s.fadeIn(12);
    yield [s.run('barret', 29, 6), s.run('tifa', 28, 6), s.run('player', 29, 5)];
    yield s.say('barret', "Phew... We made it.");
    yield s.say('tifa', "The stairs should be through here. Come on.");
    s.remove('barret'); s.remove('tifa');
  }
  FF7.defineMap('shinra_60f', {
    name: 'Shinra Bldg. 60F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    // white corridors; a red carpet runs out from the lift doors (01-midgar_143)
    look: { floor3: ['#2a2a34', '#26262e'], floor2: ['#a01c22', '#98181e'] },
    camera: { pitch: 58, dist: 10.5 },
    lights: [[10, 4, '#ffd060', 2], [15, 4, '#ffd060', 2], [20, 4, '#ffd060', 2], [25, 4, '#ffd060', 2]],
    grid: [
      "##################################",
      "#hEEEhh#hhhwhhhhhhwhhhhhhwhhhh#+h#",
      "#.:::..#......................#..#",
      "#.:::..#......................#..#",
      "#......#..u....u....u....u....#..#",
      "#......+......................+..#",
      "#......#......................#..#",
      "#.Z..Z.#......................#..#",
      "#hhhhhh#hhhhhhhhhhhhhhhhhhhhhh#hh#",
    ],
    // the big raised bronze "60" on the wall beside the lift doors (01-midgar_143)
    labels: [{ at: [5.5, 1], face: 's', text: '60', size: 0.64, col: '#9a8450', depth: 0.06, w: 0.17, y: 1.45 }],
    entries: { from_elevator: [3, 2, 'down'], from_61f: [31, 2, 'down'] },
    exits: [
      { at: [2, 1, 3, 1], run: elev(60) },
      { at: [31, 1, 1, 1], to: 'shinra_61f', entry: 'from_60f', sfx: 'door' },
    ],
    triggers: [
      { id: 'sneak', at: [7, 5, 1, 1], if: s => !s.flag('c4_60f_passed'), run: sneak },
      { at: [2, 7], on: 'talk', run: function* (s) { yield s.msg('Security monitors. One screen shows the lobby... full of guards picking themselves up off the floor.'); } },
      { at: [5, 7], on: 'talk', run: function* (s) { yield s.msg('"60F SECURITY — Upper floors are restricted to personnel with the proper keycard."'); } },
      { at: [10, 4, 16, 1], on: 'talk', run: function* (s) { yield s.msg('A golden statue of a Shinra founder, striking a confident pose. Tacky.'); } },
    ],
  });

  // ------------------------------------------------------------------ 61F garden floor
  FF7.defineMap('shinra_61f', {
    name: 'Shinra Bldg. 61F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    // FF7 (01-midgar_146), seen almost straight down: a glossy pale-teal floor, ONE big tree in a
    // round white planter, L-shaped yellow benches and counters on the west, round wine-red tables on the east
    look: { floor: ['#9ac4c0', '#94beba'], floor2: ['#b8dcd8', '#b2d6d2'], wood: ['#c89a3a', '#6a2432'],
      grass: ['#3a7a2a', '#36722a'], wall: '#e8ecec', water: '#4a3a28', trim: '#e8ecec' },
    camera: { pitch: 72, dist: 11 },
    battle: { table: 'shinra_hq', bg: 'shinra', rate: 0.45 },
    lights: [[14, 5, '#fff4d0', 5]],
    // 'O' = the solid footprint of the round planter (one 'planter' prop over the 4 x 4 block)
    legend: { 'O': 'block' },
    grid: [
      "##############################",
      "#hEEEhhhwhhhhwhhhhwhhhhh+h+hh#",
      "#............................#",
      "#..DDDDDD...OOOO........c....#",
      "#..cccccD...OOOO.......ctc...#",
      "#......cD...OOOO........c....#",
      "#.cc...cD...OOOO..........c..#",
      "#.DD.....................ctc.#",
      "#.Dccccc...........c......c..#",
      "#.DDDDDD..........ctc........#",
      "#..................c.........#",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    props: [
      // the white-rimmed planter (ground cover only), and its tree as a second, fading prop on the soil
      // (the broad crown would otherwise hide the player on the path along row 2)
      { at: [13.5, 4.5], prop: 'planter', plant: 'grass', r: 2, h: 0.45, col: '#eef2f2' },
      { at: [13.5, 4.5], prop: 'planter', plant: 'tree', r: 0.3, h: 0.02, col: '#4a3a28', lift: 0.4, treeH: 2.7, scale: [1.8, 1.1, 1.8], fade: true },
    ],
    entries: { from_elevator: [3, 2, 'down'], from_60f: [24, 2, 'down'], from_62f: [26, 2, 'down'] },
    exits: [
      { at: [2, 1, 3, 1], run: elev(61) },
      { at: [24, 1, 1, 1], to: 'shinra_60f', entry: 'from_61f', sfx: 'door' },
      { at: [26, 1, 1, 1], to: 'shinra_62f', entry: 'from_61f', sfx: 'door', if: s => s.has('keycard_62'), blocked: needCard('keycard_62', 62) },
    ],
    npcs: [
      { id: 'gardener', name: 'Old Employee', model: { base: 'oldman', top: '#5a7a4a', bottom: '#4a4a3a', hairStyle: 'cap', extras: ['apron'] },
        at: [13, 8], dir: 'up',
        talk: function* (s) {
          if (s.has('keycard_62')) { yield s.say('Old Employee', "Heh. Take good care of that card, young fella. And of yourself."); return; }
          yield s.say('Old Employee', "Mm? Don't think I've seen you around. New hire?\fI've looked after the plants on this floor for thirty years.\nThirty years of pretending there's a garden fifty floors above the slums.");
          const c = yield s.ask('Old Employee', "Tell me, what do you think of this company?", ['.....', 'It pays the bills.']);
          if (c === 0) {
            yield s.say('Old Employee', "......\fHeh heh. Not much of a talker. I like that. Folks who talk too much in this building don't last.");
            yield s.say('Old Employee', "I'm retiring soon anyway. Here, take this. I won't be needing it.");
            yield s.give('keycard_62');
            s.set('c4_keycard62');
          } else {
            yield s.say('Old Employee', "Ha! That's what they all say. Then one day they wake up and they're old like me.\fWell, don't let 'em work you to the bone.");
          }
        } },
      { id: 'emp1', name: 'Employee', model: 'man5', at: [21, 7], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Employee', "The Mayor's office is on 62. The 'Mayor'... ha.\fHe's got a fancy title and a library. Shinra runs this city."); } },
      { id: 'emp2', name: 'Employee', model: 'woman2', at: [5, 7], dir: 'up',
        talk: function* (s) { yield s.say('Employee', "Professor Hojo's lab is way up on 67.\fSometimes, late at night, you can hear something howling up there..."); } },
      { id: 'emp3', name: 'Employee', model: 'exec', at: [26, 5], dir: 'left',
        talk: function* (s) { yield s.say('Employee', "They say the Sector 7 plate collapse was AVALANCHE.\f...Between you and me, I heard the Turks were down there that night. Funny, huh?"); } },
      { id: 'emp4', name: 'Employee', model: 'man7', at: [22, 10], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Employee', "I come to the garden on my lunch break. It's the only place in this building with real plants.\fEven if they are grown under Mako lamps."); } },
    ],
  });

  // ------------------------------------------------------------------ 62F: Mayor Domino and the library
  // Password game: one misplaced file in each of the four research libraries; the number in front
  // of it is the position of a letter in its title (letters and digits only). Four letters = one of
  // the words Domino offers. Rewards: 1st try Elemental, 2nd Elixir, 3rd Ether, 4th Potion.
  const WORDS = ['BEST', 'KING', 'BOMB', 'MAKO'];
  const LIBS = [
    { id: 'urban', name: 'Urban Development Research Library', files: [
      'Midgar City Map: Sectors 5-8', 'Reactor Construction Chart', 'Problems with Plate Construction',
      'New Plans for Urban Planning', 'Illustrated Guide to City Planning', 'Midgar City Map: Sectors 0-4'] },
    { id: 'science', name: 'Scientific Research Library', files: [
      'Final Evolution of Land-Dwelling Life', 'Report on High Mako Levels in Living Beings', 'The Ancients in History',
      'Mako Energy and the Rise of New Life', 'File on Dr. Gast, Biologist', 'Data on Test Animals Found Near Midgar'] },
    { id: 'weapons', name: 'Peacekeeping / Weapons Development Library', files: [
      'Materia Production and Its Military Uses', "Heidegger's Peacekeeping Law", 'SOLDIER Members by Class',
      'Plans for New Land Weapons', 'Economic Report: Anti-Shinra Activity', 'Ranks and Uses of Mako Weaponry'] },
    { id: 'space', name: 'Space Development Research Library', files: [
      'Modern History of the Space Program Vol.1', 'Modern History of the Space Program Vol.2', 'Diminishing Mako and Planetary Movement',
      'Results of the Failed Space Mission YA-79', 'Economic Report: Space Program', 'Shinra Rocket Space Travel'] },
  ];
  const letters = (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const password = (s) => WORDS[((s.get('c4_pw') || 1) - 1) % WORDS.length];
  // The shelf list for library `li`: its own files, with one swapped for a stray file from another
  // library whose Nth letter is the li-th letter of the password.
  function libraryShelf(s, li) {
    const pw = password(s), pwi = s.get('c4_pw') || 1;
    const need = pw[li];
    const lib = LIBS[li];
    let stray = null;
    for (let k = 1; k < LIBS.length && !stray; k++) {
      const other = LIBS[(li + k + pwi) % LIBS.length];
      if (other === lib) continue;
      for (let j = 0; j < other.files.length; j++) {
        const t = other.files[(j + pwi + li) % other.files.length];
        const idx = letters(t).indexOf(need);
        if (idx >= 0) { stray = { title: t, n: idx + 1 }; break; }
      }
    }
    if (!stray) stray = { title: 'Midgar City Map: Sectors 0-4', n: 1 };
    const swap = (li + pwi) % lib.files.length;
    return lib.files.map((t, i) => i === swap ? stray : { title: t, n: ((i * 7 + pwi * 3 + li) % Math.max(3, letters(t).length - 2)) + 1 });
  }
  const shelfTalk = (li) => function* (s) {
    const list = libraryShelf(s, li);
    const lines = list.map(f => `${String(f.n).padStart(2, ' ')}  ${f.title}`);
    yield s.msg(`${LIBS[li].name}`);
    yield s.msg(lines.slice(0, 3).join('\n'));
    yield s.msg(lines.slice(3).join('\n'));
  };
  FF7.defineMap('shinra_62f', {
    name: 'Shinra Bldg. 62F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    look: { floor3: ['#5a2a2a', '#522626'] },
    battle: { table: 'shinra_hq', bg: 'shinra', rate: 0.45 },
    lights: [[6, 9, '#ffe0a0', 3], [17, 9, '#fff0d0', 4]],
    grid: [
      "####################################",
      "#hhhhhhhhhh#h+hhEEEhhh+h#hhhhhhhhhh#",
      "#..........#............#..........#",
      "#.kkk..kkk.#............#.kkk..kkk.#",
      "#..........+............+..........#",
      "#.kkk..kkk.#............#.kkk..kkk.#",
      "#..........#............#..........#",
      "############............############",
      "#kk______kk#|..........|#..........#",
      "#k___DDD___+............+.ctc..ctc.#",
      "#k_________+............#..........#",
      "#kk______kk#|..........|#....v.....#",
      "############............############",
      "#..........#............#..........#",
      "#.kkk..kkk.#............#.kkk..kkk.#",
      "#..........+............+..........#",
      "#.kkk..kkk.#............#.kkk..kkk.#",
      "#..........#............#..........#",
      "####################################",
    ],
    entries: { from_61f: [13, 2, 'down'], from_63f: [22, 2, 'down'], from_elevator: [17, 2, 'down'] },
    exits: [
      { at: [13, 1, 1, 1], to: 'shinra_61f', entry: 'from_62f', sfx: 'door' },
      { at: [22, 1, 1, 1], to: 'shinra_63f', entry: 'from_62f', sfx: 'door', if: s => s.has('keycard_65'), blocked: needCard('keycard_65', 65) },
      { at: [16, 1, 3, 1], run: elev(62) },
    ],
    npcs: [
      { id: 'domino', name: 'Mayor Domino', model: { base: 'oldman', top: '#5a3a6a', bottom: '#3a2a4a', hairStyle: 'bald', extras: ['mustache', 'glasses', 'suit'], build: 'fat' },
        at: [6, 8], dir: 'down',
        talk: function* (s) {
          if (s.has('keycard_65')) {
            yield s.say('Mayor Domino', "What are you still doing here? Go on, cause some trouble upstairs.\fAnd if anyone asks, you never met me.");
            return;
          }
          if (!s.flag('c4_domino_met')) {
            s.set('c4_domino_met');
            yield s.say('Mayor Domino', "Hm? Who are you? You don't look like Shinra... Well, whatever. Do you know who I am?");
            yield s.say('Mayor Domino', "I'm Domino — the Mayor of Midgar! ...In name only.\fShinra runs this city. All I do is sit up here and mind their precious library.");
            yield s.say('barret', "The Mayor? Then you gotta know what Shinra's doin'!");
            yield s.say('Mayor Domino', "Hah! They don't tell me anything. That's why I hate them almost as much as you do.\fYou want to go further up, eh? Then you need my keycard.");
            yield s.say('Mayor Domino', "I'll hand it over — if you can guess my password.\nGet it on the first try and I'll throw in a little something extra.");
          }
          const tries = s.get('c4_pw_tries');
          const c = yield s.ask('Mayor Domino', 'Well? What is the password?', WORDS.concat(['Let me think...']));
          if (c >= WORDS.length) { yield s.say('Mayor Domino', "Take your time. The answer's somewhere in my library... if you know how to read."); return; }
          s.inc('c4_pw_tries');
          if (WORDS[c] !== password(s)) {
            yield s.say('Mayor Domino', `"${WORDS[c]}"? Bzzzt! Wrong!\fHo ho ho. Try again.`);
            return;
          }
          yield s.say('Mayor Domino', `"${WORDS[c]}"... Correct! Not bad at all!`);
          if (tries === 0) { yield s.say('Mayor Domino', "On your very first try! Here, a special prize."); yield s.giveMateria('elemental'); }
          else if (tries === 1) yield s.give('elixir');
          else if (tries === 2) yield s.give('ether');
          else if (tries === 3) yield s.give('potion');
          else yield s.say('Mayor Domino', "Took you long enough. No prize for you!");
          yield s.say('Mayor Domino', "And, as promised, my keycard.");
          yield s.give('keycard_65');
          s.set('c4_domino_done');
          yield s.say('Mayor Domino', "Now go on. Give those Shinra people a good scare for me!");
        } },
      { id: 'hart', name: 'Hart', model: { base: 'man', top: '#3a4a6a', bottom: '#2a3040', hair: '#6a5030', extras: ['glasses', 'suit', 'tie'] },
        at: [9, 10], dir: 'left',
        talk: function* (s) {
          if (s.has('keycard_65')) { yield s.say('Hart', "The Mayor seems cheerful today. That's... unusual."); return; }
          const n = s.get('c4_hart');
          const PRICES = [500, 1000, 2000, 5000, 15000];
          if (n >= PRICES.length) { yield s.say('Hart', `I already told you everything. The password is "${password(s)}". Honestly.`); return; }
          yield s.say('Hart', "I'm Hart, the Mayor's assistant. Having trouble with his little password game?");
          const c = yield s.ask('Hart', `I could give you a hint... for ${PRICES[n]} gil.`, ['Buy a hint', 'No thanks']);
          if (c !== 0) return;
          if (!s.takeGil(PRICES[n])) { yield s.say('Hart', "You don't have enough gil. Information isn't free, you know."); return; }
          s.inc('c4_hart');
          const pw = password(s);
          const HINTS = [
            "Each of the four libraries on this floor has one file that doesn't belong there.",
            "The number in front of that stray file tells you which letter of its title to use.\nCount letters and numbers only — skip spaces and punctuation.",
            "One letter from each library. Put the four together and you get one of the Mayor's words.",
            `Fine, fine. One of the letters is "${pw[1]}".`,
            `...You really can't figure it out? It's "${pw}". There. Happy?`,
          ];
          yield s.say('Hart', HINTS[n]);
        } },
      { id: 'reader', name: 'Employee', model: 'woman5', at: [30, 9], dir: 'down',
        talk: function* (s) { yield s.say('Employee', "I'm supposed to be re-filing everything, but somebody keeps putting files on the wrong shelves.\fI bet it's the Mayor. He thinks it's funny."); } },
      { id: 'lib1', name: 'Researcher', model: 'scientist', at: [5, 15], dir: 'up', wander: 1,
        talk: function* (s) { yield s.say('Researcher', "The Urban Development files are down here. Plans for Neo-Midgar, city maps, reactor charts...\fFunny, nobody ever reads the ones about the slums."); } },
    ],
    triggers: [
      { at: [2, 14, 8, 3], on: 'talk', run: shelfTalk(0) },
      { at: [26, 14, 8, 3], on: 'talk', run: shelfTalk(1) },
      { at: [2, 3, 8, 3], on: 'talk', run: shelfTalk(2) },
      { at: [26, 3, 8, 3], on: 'talk', run: shelfTalk(3) },
      { at: [1, 8, 1, 4], on: 'talk', run: function* (s) { yield s.msg("The Mayor's private bookshelf. \"How to Get Promoted,\" \"The Art of Revenge,\" \"Midgar Mayors: A History (Vol. 1 of 1)\"..."); } },
    ],
    onLoad: function (s) {
      if (!s.get('c4_pw')) s.setVar('c4_pw', 1 + s.random(WORDS.length));
    },
  });

  // ------------------------------------------------------------------ 63F: the door / coupon floor
  // The terminal allows three door releases. Solution: D1 (north corridor) -> DA (room A, Coupon A)
  // -> air duct A to room B (Coupon B) -> room B's own door to the south hall -> DC (room C, Coupon C)
  // -> back through B's duct, which drops into the terminal room.
  const DOORS = { d1: [29, 2], da: [9, 3], db: [25, 3], dc: [16, 9], ds: [30, 10] };
  function* doorStep(s, key) {
    const f = 'c4_63_' + key;
    if (!s.flag('c4_63_terminal')) {
      yield s.msg('The door is locked. Its lock seems to be controlled from a security terminal somewhere on this floor.');
      yield* C4.stepBack(s);
      return;
    }
    const left = s.get('c4_63_left');
    if (left <= 0) {
      yield s.msg('The door is locked. The panel reads: "RELEASES REMAINING: 0".');
      yield* C4.stepBack(s);
      return;
    }
    const c = yield s.ask(null, `Release this door's lock? (${left} release${left === 1 ? '' : 's'} left)`, ['Release it', 'Not this one']);
    if (c !== 0) { yield* C4.stepBack(s); return; }
    s.set(f);
    s.setVar('c4_63_left', left - 1);
    s.sfx('door_shinra');
    yield s.msg('Ka-chunk. The door unlocks.');
  }
  const doorTriggers = Object.keys(DOORS).map(k => ({
    at: [DOORS[k][0], DOORS[k][1], 1, 1], once: false, if: s => !s.flag('c4_63_' + k),
    run: function* (s) { yield* doorStep(s, k); },
  }));
  FF7.defineMap('shinra_63f', {
    name: 'Shinra Bldg. 63F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    camera: { pitch: 70, dist: 11 },   // seen from above, like the grid of rooms in 01-midgar_148
    battle: { table: 'shinra_63f', bg: 'shinra', rate: 0.6 },
    lights: [[32, 11, '#80ffa0', 2], [17, 6, '#e0e8ff', 3]],
    grid: [
      "####################################",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhh#+EEE+#",
      "#............................+.....#",
      "#########+###############+####.....#",
      "##.g.........#.....#.......g.#.....#",
      "##...........#.....#.........#.....#",
      "##..k.....k..#.....#.q.....q.#.....#",
      "##...........#.....#.........#.....#",
      "##...........#.....#.........#.....#",
      "################+#######+#######+###",
      "###############...............+....#",
      "###############...............#...g#",
      "##############################Z....#",
      "####################################",
    ],
    entries: { from_62f: [30, 2, 'down'], from_64f: [34, 2, 'down'], from_elevator: [32, 2, 'down'] },
    exits: [
      { at: [30, 1, 1, 1], to: 'shinra_62f', entry: 'from_63f', sfx: 'door' },
      { at: [34, 1, 1, 1], to: 'shinra_64f', entry: 'from_63f', sfx: 'door' },
      { at: [31, 1, 3, 1], run: elev(63) },
    ],
    items: [
      { at: [10, 7], item: 'coupon_a', id: 'c4_coupon_a' },
      { at: [22, 7], item: 'coupon_b', id: 'c4_coupon_b' },
      { at: [16, 5], item: 'coupon_c', id: 'c4_coupon_c' },
    ],
    npcs: [
      { id: 'worker', name: 'Employee', model: 'man2', at: [33, 5], dir: 'left',
        talk: function* (s) { yield s.say('Employee', "This floor's security system is a joke. The terminal can only release three doors at a time.\fAnd the air ducts connect half the rooms anyway. Don't tell anyone I said that."); } },
    ],
    triggers: doorTriggers.concat([
      // terminal
      { at: [30, 12], on: 'talk', run: function* (s) {
          if (!s.flag('c4_63_terminal')) {
            s.set('c4_63_terminal'); s.setVar('c4_63_left', 3);
            s.sfx('beep');
            yield s.msg('63F SECURITY TERMINAL\n"Welcome, employee. You are authorized to release\nTHREE door locks on this floor."');
            return;
          }
          const opts = ['Check releases'];
          const has = { a: s.has('coupon_a'), b: s.has('coupon_b'), c: s.has('coupon_c') };
          if (has.a || has.b || has.c) opts.push('Exchange coupons');
          opts.push('Reset door locks', 'Leave');
          const c = yield s.ask(null, '63F SECURITY TERMINAL', opts);
          const pick = opts[c];
          if (pick === 'Check releases') yield s.msg(`"RELEASES REMAINING: ${s.get('c4_63_left')}"`);
          else if (pick === 'Exchange coupons') {
            yield s.msg('"COUPON EXCHANGE SERVICE — Thank you for your hard work!"');
            const ex = [['coupon_a', 'star_pendant', 'Coupon A'], ['coupon_b', 'four_slots', 'Coupon B'], ['coupon_c', 'materia:all', 'Coupon C']];
            for (const [cp, prize, nm] of ex) {
              if (!s.has(cp)) continue;
              const k = yield s.ask(null, `Exchange ${nm}?`, ['Exchange', 'Keep it']);
              if (k !== 0) continue;
              s.take(cp);
              yield s.give(prize);
            }
          } else if (pick === 'Reset door locks') {
            const k = yield s.ask(null, 'Relock every door and restore three releases?', ['Reset', 'Cancel']);
            if (k === 0) {
              Object.keys(DOORS).forEach(d => s.unset('c4_63_' + d));
              s.setVar('c4_63_left', 3);
              s.sfx('door_shinra');
              yield s.msg('All door locks on 63F have been reset.');
            }
          }
        } },
      // air ducts
      { at: [3, 4], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'An air duct. It looks big enough to crawl through.', ['Crawl in', 'Leave it']);
          if (c !== 0) return;
          yield s.fadeOut(20);
          s.sfx('run');
          yield 40;
          s.place('player', 27, 5, 'down');
          yield s.fadeIn(20);
          yield s.msg('...and out through a grate in another room.');
        } },
      { at: [27, 4], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'An air duct. It slopes downward...', ['Crawl in', 'Leave it']);
          if (c !== 0) return;
          yield s.fadeOut(20);
          s.sfx('falling');
          yield 40;
          s.place('player', 33, 11, 'left');
          yield s.fadeIn(20);
          yield s.msg('Whoa! The duct dropped out into the terminal room.');
        } },
      { at: [34, 11], on: 'talk', run: function* (s) { yield s.msg("An air duct opening, too high up to climb into from here."); } },
    ]),
  });

  // ------------------------------------------------------------------ 64F recreation floor
  // Top-down like 01-midgar_149: off the central corridor, the washroom (NW), the locker room on a
  // green grated floor (NE), the nap room on an orange floor (SW) and the gym (SE: red exercise
  // machines, vending machines). Lockers along the NE room's back wall, keyed by x.
  const LOCKERS = {
    23: { id: 'c4_locker_pd', item: 'phoenix_down' },
    28: { id: 'c4_locker_ether', item: 'ether' },
  };
  FF7.defineMap('shinra_64f', {
    name: 'Shinra Bldg. 64F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    look: { floor2: ['#c8742a', '#e0a848'], metal: ['#4a7a52', '#c03a30'] },
    camera: { pitch: 70, dist: 11 },
    lights: [[15, 5, '#e0f0ff', 3], [5, 8, '#ffc080', 3], [25, 8, '#fff0e0', 3], [25, 3, '#d0ffd8', 2]],
    grid: [
      "################################",
      "#hwhhhhhwhh#+hEEEhh+#hhwhhhhwhh#",
      "#q.q.q.q..j#........#qqqqqqqqqq#",
      "#..........#........#gggggggggg#",
      "#DDD.....j.+........+ggggcgggcg#",
      "#####+######...S....######+#####",
      "#::::::::::#........#.MM.M..MM.#",
      "#::b:b:b:b:#........#..........#",
      "#::::::::::#........#vv......MM#",
      "#::b:b:b:b:+........+..........#",
      "#::::::::::#........#.c..c..c..#",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    entries: { from_63f: [12, 2, 'down'], from_65f: [19, 2, 'down'], from_elevator: [15, 2, 'down'] },
    exits: [
      { at: [12, 1, 1, 1], to: 'shinra_63f', entry: 'from_64f', sfx: 'door' },
      { at: [19, 1, 1, 1], to: 'shinra_65f', entry: 'from_64f', sfx: 'door' },
      { at: [14, 1, 3, 1], run: elev(64) },
    ],
    npcs: [
      { id: 'squat', name: 'Employee', model: { base: 'man', top: '#e0e0e0', bottom: '#3a4a8a', build: 'big' }, at: [24, 7], dir: 'down', anim: 'kneel',
        talk: function* (s) { yield s.say('Employee', "...ninety-eight... ninety-nine... Hey, don't interrupt! I'm doing my squats!\fYou gotta stay in shape if you want to survive a Shinra board meeting."); } },
      { id: 'gym2', name: 'Employee', model: 'woman3', at: [27, 9], dir: 'left',
        talk: function* (s) { yield s.say('Employee', "The gym's open around the clock. So is the office. Coincidence? I think not."); } },
      { id: 'napper', name: 'Employee', model: 'exec', at: [4, 8], dir: 'down', anim: 'lie',
        talk: function* (s) { yield s.say('Employee', "Zzz... five more minutes, boss... zzz..."); } },
      { id: 'lounge', name: 'Employee', model: 'man4', at: [6, 3], dir: 'up',
        talk: function* (s) { yield s.say('Employee', "The executives are having a big meeting on 66 today.\fYou didn't hear it from me, but the restroom up there has, uh, very thin walls."); } },
      { id: 'locker', name: 'Employee', model: 'man9', at: [27, 4], dir: 'up',
        talk: function* (s) { yield s.say('Employee', "Hey, don't go poking around in people's lockers.\f...Unless they've got something good in 'em. Then tell me."); } },
    ],
    triggers: [
      { at: [21, 8, 2, 1], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, '"SHINRA GYM SPECIAL DRINK — 250 gil."', ['Buy one', 'Pass']);
          if (c !== 0) return;
          if (!s.takeGil(250)) { yield s.msg("You don't have enough gil."); return; }
          s.sfx('purchase');
          yield 30;
          yield s.msg('Clunk...\n......\nNothing comes out.');
          const b = yield s.ask('cloud', '', ['Bang on the machine!', 'Forget it.']);
          if (b !== 0) return;
          for (let i = 0; i < 3; i++) { s.sfx('hit'); s.shake(3, 10); yield 14; }
          s.spawn('staff', 'man3', 23, 10, 'up', { name: 'Employee' });
          yield s.say('Employee', "Hey, hey, HEY! Quit beating on the machine! It's been broken for weeks!\fThe repair guy's coming... someday. Come back later and maybe it'll work.");
          s.remove('staff');
          s.set('c4_vending_bang');
        } },
      { at: [21, 2, 10, 1], on: 'talk', run: function* (s) {
          const a = s.actor('player');
          const x = a && a.tx != null ? a.tx : 23;
          const L = LOCKERS[x];
          if (L && !s.flag(L.id)) { s.set(L.id); s.sfx('chest'); yield s.msg('You open the locker...'); yield s.give(L.item); return; }
          if (x === 30) { yield s.msg("Someone's locker... There's a megaphone inside with a note: \"MY ULTIMATE WEAPON\".\nWhat would anyone want with a megaphone?"); return; }
          yield s.msg("A locker full of sweaty gym clothes. Nothing useful.");
        } },
      { at: [1, 7, 10, 1], on: 'talk', run: function* (s) { yield s.inn(0, { text: 'A bed in the relaxation room. Take a quick nap?' }); } },
      { at: [1, 9, 10, 1], on: 'talk', run: function* (s) { yield s.inn(0, { text: 'A bed in the relaxation room. Take a quick nap?' }); } },
      { at: [22, 6, 8, 1], on: 'talk', run: function* (s) { yield s.msg('Exercise machines, polished and barely used.'); } },
      { at: [28, 8, 2, 1], on: 'talk', run: function* (s) { yield s.msg('Exercise machines, polished and barely used.'); } },
    ],
  });

  // ------------------------------------------------------------------ 65F: the Midgar model
  // Box 1 is open; each Midgar Parts placed in the model unlocks the next box. Box 6 holds Keycard 66.
  const BOXES = [
    { at: [1, 6], part: 'midgar_parts' }, { at: [1, 12], part: 'midgar_parts_b' }, { at: [1, 2], part: 'midgar_parts_c' },
    { at: [1, 8], part: 'midgar_parts_d' }, { at: [31, 3], part: 'midgar_parts_e' }, { at: [22, 2], part: 'keycard_66' },
  ];
  const PARTS = ['midgar_parts', 'midgar_parts_b', 'midgar_parts_c', 'midgar_parts_d', 'midgar_parts_e'];
  const GAPS = ['Lower right sector', 'Upper right sector', 'Top sector', 'Upper left sector', 'Lower left sector'];
  const boxTrigger = (i) => ({
    at: [BOXES[i].at[0], BOXES[i].at[1], 1, 1], on: 'talk',
    run: function* (s) {
      if (s.flag('c4_box' + i)) { yield s.msg('An empty box.'); return; }
      if (s.get('c4_parts_placed') < i) { yield s.msg("A metal box. It's locked tight."); return; }
      s.set('c4_box' + i);
      s.sfx('chest');
      yield s.msg('The box is open!');
      yield s.give(BOXES[i].part);
    },
  });
  FF7.defineMap('shinra_65f', {
    name: 'Shinra Bldg. 65F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    battle: { table: 'shinra_hq', bg: 'shinra', rate: 0.45 },
    // the scale model of Midgar (01-midgar_150): a round, low table with a gold rim and the city
    // glowing Mako-green inside, the Shinra Building at its hub. One 'citymodel' prop on the solid
    // 'O' footprint; no mako tiles, so no green light tints the gold rim (makoLight 0 to be sure).
    look: { mako: '#60e080', makoLight: 0 },
    camera: { pitch: 62, dist: 11 },
    lights: [[16, 3, '#ffe8a0', 4], [16, 12, '#ffe8a0', 3]],
    legend: { 'O': 'block' },
    grid: [
      "##################################",
      "#hhhwhhhhh#+hhEEEEhhh+h#hhhhwhhhh#",
      "#B........#...........B#.........#",
      "#.........#............#.......B.#",
      "#.........+....OOOO....+.........#",
      "#..k...k..#...OOOOOO...#..k...k..#",
      "#B........#..OOOOOOOO..#.........#",
      "###########..OOOOOOOO..###########",
      "#B........#..OOOOOOOO..#.........#",
      "#.........#..OOOOOOOO..#.........#",
      "#.........+...OOOOOO...+.........#",
      "#..k...k..#....OOOO....#..k...k..#",
      "#B........#............#.........#",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    props: [{ at: [16.5, 7.5], prop: 'citymodel', r: 3.5, col2: '#c09028' }],
    entries: { from_64f: [11, 2, 'down'], from_66f: [21, 2, 'down'], from_elevator: [15, 2, 'down'] },
    exits: [
      { at: [11, 1, 1, 1], to: 'shinra_64f', entry: 'from_65f', sfx: 'door' },
      { at: [21, 1, 1, 1], to: 'shinra_66f', entry: 'from_65f', sfx: 'door', if: s => s.has('keycard_66'), blocked: needCard('keycard_66', 66) },
      { at: [14, 1, 4, 1], run: elev(65) },
    ],
    npcs: [
      { id: 'modelfan', name: 'Employee', model: 'scientist', at: [20, 10], dir: 'left',
        talk: function* (s) {
          yield s.say('Employee', "This is a scale model of Midgar. Some genius took pieces home after the office party, and now it's incomplete.\fThe missing parts are probably locked in the boxes around this floor.");
        } },
    ],
    triggers: BOXES.map((b, i) => boxTrigger(i)).concat([
      { at: [13, 4, 8, 8], on: 'talk', run: function* (s) {
          const placed = s.get('c4_parts_placed');
          if (placed >= PARTS.length) { yield s.msg('The scale model of Midgar is complete. The Shinra Building towers over the center.'); return; }
          const part = PARTS.find(p => s.has(p));
          yield s.msg(`A scale model of Midgar. ${PARTS.length - placed} section${PARTS.length - placed === 1 ? ' is' : 's are'} missing.`);
          if (!part) return;
          const gaps = GAPS.slice(placed).concat(['Not now']);
          const c = yield s.ask(null, 'Where will you place the Midgar Parts?', gaps);
          if (c >= gaps.length - 1) return;
          s.take(part);
          s.inc('c4_parts_placed');
          s.sfx('ching');
          yield s.msg(`The part fits perfectly into the ${gaps[c].toLowerCase()}.`);
          s.sfx('chest');
          yield s.msg('*Click!* Somewhere on this floor, a lock opened.');
        } },
    ]),
  });

  // ------------------------------------------------------------------ 66F: the executive meeting
  function* meeting(s) {
    yield s.fadeOut(30);
    s.hide('player');
    s.music('shinra');
    s.spawn('president', 'president', 23, 3, 'down', { name: 'President Shinra' });
    s.spawn('heidegger', 'heidegger', 21, 5, 'right', { name: 'Heidegger' });
    s.spawn('scarlet', 'scarlet', 26, 5, 'left', { name: 'Scarlet' });
    s.spawn('reeve', 'reeve', 21, 7, 'right', { name: 'Reeve' });
    s.spawn('palmer', 'palmer', 26, 8, 'left', { name: 'Palmer' });
    yield s.cam(23, 6, 1, { dist: 10, pitch: 56 });
    yield s.fadeIn(30);
    yield s.say(null, "(Cloud peers through the slats of the air vent. Below, the executives are gathered around the table.)");
    yield s.say('president', "Now then. The matter of Sector 7.");
    yield s.say('reeve', "Sir, we've begun drawing up plans to rebuild. With the plate supports salvaged, construction could begin within—");
    yield s.say('president', "We will not be rebuilding Sector 7.");
    s.emote('reeve', '!');
    yield s.say('reeve', "Sir...?");
    yield s.say('president', "Instead, we push ahead with the Neo-Midgar plan. Once we locate the Promised Land, there will be no need to patch up this old city.");
    yield s.say('heidegger', "Gyahahaha! And the public swallowed the whole story. AVALANCHE dropped the plate, and Shinra rushed in to save the survivors!\fOur approval ratings have never been better!");
    yield s.say('president', "Good. Now, to cover the costs... raise the Mako rates in every sector by thirty percent.");
    yield s.say('palmer', "Uh-huh, uh-huh! Mr. President, sir, about the space program budget—");
    yield s.say('president', "Denied.");
    yield s.say('palmer', "Awww...");
    yield s.say('scarlet', "Kyahahaha! Then that money can go to my weapons division. My newest project needs—");
    yield s.say('president', "Also denied. Every gil goes to Neo-Midgar.");
    yield s.say('scarlet', "Hmph!");
    yield s.say('reeve', "(...Thirty percent. The people in the slums can barely afford the rates as they are.)");
    s.sfx('door_shinra');
    s.spawn('hojo', 'hojo', 19, 11, 'up', { name: 'Hojo' });
    yield s.move('hojo', [[19, 10], [20, 10], [20, 3]]);
    yield s.face('hojo', 'president');
    yield s.say('president', "Ah, Hojo. What of the Ancient girl?");
    yield s.say('hojo', "Hmm... A fascinating specimen. But completing the tests on her would take a century, perhaps more.\fShe is the last of her kind, you see. Her mother — also an Ancient — is long gone.");
    yield s.say('hojo', "So I intend to breed her with another specimen. Preserve the line... and let the research continue for generations.");
    yield s.say('president', "Hmph. Do what you must. Just make sure she leads us to the Promised Land.");
    yield s.say('hojo', "Heh heh heh... Naturally. Now, if you'll excuse me, my samples are waiting.");
    yield s.move('hojo', [[20, 10], [19, 10], [19, 11]]);
    s.hide('hojo');
    yield s.say('president', "This meeting is adjourned.");
    yield s.fadeOut(30);
    ['president', 'heidegger', 'scarlet', 'reeve', 'palmer', 'hojo'].forEach(id => s.remove(id));
    s.show('player', 3, 3, 'down');
    s.camFollow(1); s.camZoom(9.5, 50);
    s.spawn('barret', 'barret', 3, 5, 'up', { name: 'Barret' });
    s.spawn('tifa', 'tifa', 5, 5, 'up', { name: 'Tifa' });
    yield s.fadeIn(30);
    s.music('infiltrate');
    yield s.say('barret', "Breed her!? What the hell is wrong with that old creep!?");
    yield s.say('tifa', "Cloud, Hojo's heading upstairs. He'll lead us straight to Aeris!");
    yield s.say('cloud', "...Let's go. The stairs at the end of the hall.");
    s.remove('barret'); s.remove('tifa');
    s.set('c4_meeting_done');
  }
  FF7.defineMap('shinra_66f', {
    name: 'Shinra Bldg. 66F', area: 'Midgar', theme: 'shinra', music: 'infiltrate',
    // as in 01-midgar_153: the conference room runs north-south on the east (red carpet, the long
    // table with its green light strip, the President's place at the north end), the restroom with
    // the vent and a storage room to the west, the corridor with the stairs and the lift along the south
    look: { floor3: ['#3a3a48', '#363644'], floor2: ['#8a1a1e', '#82181c'], wood: ['#2e3634', '#34403c'] },
    camera: { pitch: 62, dist: 11 },
    battle: { table: 'shinra_hq', bg: 'shinra', rate: 0.4, if: s => !s.flag('c4_captured') },
    lights: [[23, 5, '#60ffb0', 1.6], [23, 8, '#60ffb0', 1.6], [18, 3, '#ffc080', 2], [29, 3, '#ffc080', 2], [18, 9, '#ffc080', 2], [29, 9, '#ffc080', 2], [4, 4, '#e0f0ff', 2]],
    grid: [
      "################################",
      "#hhhhhhh#hhhhhhh#hhhwwwwwwwwhhh#",
      "#j#j#j#.#Z.Z.q.q#::::::::::::::#",
      "#.#.#.#.#.......#::::::::::::::#",
      "#.......#M.....M#:::::cttc:::::#",
      "#.......#.......#:::::cttc:::::#",
      "#DDD....#.......#:::::cttc:::::#",
      "#.......#..t....#:::::cttc:::::#",
      "#.......#..c....#:::::cttc:::::#",
      "#.......#B.....B#:::::cttc:::::#",
      "#j......#BB...BB#::::::::::::::#",
      "####+#######+######+######EEE###",
      "#..............................#",
      "+..............................+",
      "#..............................#",
      "#hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh#",
    ],
    entries: { from_65f: [1, 13, 'right'], from_67f: [30, 13, 'left'], from_elevator: [27, 12, 'down'] },
    exits: [
      { at: [0, 13, 1, 1], to: 'shinra_65f', entry: 'from_66f', sfx: 'door' },
      { at: [31, 13, 1, 1], to: 'shinra_67f', entry: 'from_66f', sfx: 'door', if: s => s.flag('c4_meeting_done'),
        blocked: C4.locked('The door to the upper floors is sealed tight. Only the top brass have clearance for 67F.') },
      { at: [26, 11, 3, 1], run: elev(66) },
    ],
    npcs: [
      { id: 'secretary', name: 'Secretary', model: 'receptionist', at: [22, 13], dir: 'up', show: s => !s.flag('c4_captured'),
        talk: function* (s) {
          if (s.flag('c4_meeting_done')) yield s.say('Secretary', "The meeting's over. Professor Hojo went up to his lab... he always walks so fast after a meeting.");
          else yield s.say('Secretary', "The executives are in a meeting. Nobody goes in. Nobody.\f...Well, maybe the cleaning staff.");
        } },
    ],
    triggers: [
      { at: [19, 11], once: false, run: C4.locked("Muffled voices come from the other side. The conference room door is locked.") },
      { at: [9, 2, 3, 1], on: 'talk', run: function* (s) { yield s.msg('Terminals scrolling Mako output figures for every sector. The numbers only ever go up.'); } },
      { at: [1, 2, 5, 1], on: 'talk', run: function* (s) {
          if (s.flag('c4_meeting_done')) { yield s.msg('A very clean toilet. The air vent above it hangs open.'); return; }
          yield s.msg('A spotless executive toilet.');
          const c = yield s.ask(null, 'Flush it?', ['Flush', 'Leave it']);
          if (c === 0) { s.sfx('door2'); yield s.msg('*Fwoosh!* Ah, like a true gentleman.'); }
          yield s.say('cloud', "(...There's an air vent above the stall. I can hear voices coming through it.)");
          const v = yield s.ask(null, 'Climb up into the vent?', ['Climb in', 'Not now']);
          if (v !== 0) return;
          yield* meeting(s);
        } },
      { at: [1, 6, 3, 1], on: 'talk', run: function* (s) { yield s.msg('Marble sinks with golden faucets. Even the restrooms are fancy up here.'); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_67f' && s.flag('c4_h0512_done') && !s.flag('c4_captured') && FF7.story.c4_capture) {
        yield* FF7.story.c4_capture(s);
      }
    },
  });
})();

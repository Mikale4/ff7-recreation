// Chapter 9 (part 4) — Junon, Disc 2: Tifa wakes in a cell seven days later, Meteor hangs in the sky,
// Rufus announces the televised execution, the escort (save point), the press room, the gas chamber,
// Barret and Cait Sith fight their way to the airport (Attack Squad, the "reporter", SOLDIER:2nd),
// Tifa frees herself with the key at her feet, Sapphire WEAPON blasts the harbour, Scarlet's slap fight
// on the cannon, and the Highwind swoops in. Then the Highwind hub (bridge, operation room, deck, hold):
// the crew decides Cid is the leader, the pilot takes off. Later chapters add scenes with FF7.patchMap.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c9_junon_woke, c9_escort, c9_press, c9_gas_strapped, c9_barret_free, c9_attack_squad, c9_reporter,
// c9_dock_guard, c9_boarded, c9_key, c9_gas_stopped, c9_wall_blasted, c9_scarlet, c9_slap_done, c9_escaped,
// c9_hw_meeting, c9_first_takeoff; shared: has_highwind.
(function () {
  const C9 = FF7.c9 = FF7.c9 || {};
  const JUNON_IN = { floor: ['#5a6068', '#545a62'], floor2: ['#6a7078', '#646a72'], wall: '#6a7482', trim: '#3a404a', ambient: [0.42, 0.44, 0.5] };
  const JUNON_OUT = { sky: ['#2a0c14', '#b04830'], fog: { color: [0.5, 0.26, 0.2], near: 12, far: 32 }, ambient: [0.5, 0.42, 0.42], light: [0.95, 0.7, 0.6] };
  const HW = { floor: ['#5a5e66', '#545860'], floor2: ['#6a5a48', '#625242'], wall: '#7a8290', trim: '#3a404a', wallH: 2.4, ambient: [0.46, 0.46, 0.5],
    sky: ['#3a78c0', '#b8d8f0'] };
  const has = (s, id) => s.isMember(id);

  // ================================================================== the cell
  function* junonWake(s) {
    s.set('c9_junon_woke');
    s.music('none');
    s.party(['tifa']);
    s.anim('player', 'lie');
    yield s.caption('...', { hold: 60, bg: '#000' });
    yield s.caption('Sector 7 Station.\nThe night Tifa found Cloud again.', { hold: 140, bg: '#000' });
    yield s.say('tifa', "(Cloud... You were slumped against the wall by the platform. When I called your name, you looked at me as if you had to think about who you were.)", { pos: 'middle' });
    yield s.say('tifa', "(Then you talked about SOLDIER... about things you couldn't have seen. And there were things you should have known... that you didn't.)\f(I was scared. So I asked you to join AVALANCHE. I wanted to keep you close, where I could watch over you...)", { pos: 'middle' });
    yield s.say('tifa', "(I should have said something back then. I'm sorry, Cloud...)", { pos: 'middle' });
    s.music('anxious');
    yield s.fadeIn(60);
    yield 30;
    s.stopAnim('player');
    yield s.say('barret', "Tifa? ...Tifa! You're awake! Damn, you had me worried sick!");
    yield s.face('player', 'right');
    yield s.say('tifa', "Barret...? Where... are we?");
    yield s.say('barret', "Junon. Shinra's lockup. You've been out cold for seven days.");
    yield s.say('tifa', "Seven days...? Cloud... Where's Cloud? Where's everyone?");
    yield s.say('barret', "Shinra's airship hauled the two of us outta the crater when it blew. The others... I dunno. Maybe they got out.\fAnd Cloud...");
    yield s.say('tifa', "......");
    yield s.say('barret', "...That ain't even the worst of it. Get over by the window. Take a look at the sky.");
    yield s.move('player', 3, 1);
    yield s.movie('meteor', { text: 'Above the sea, the sky has turned a sickly red.\nA vast burning star hangs there, blotting out the clouds...\nMETEOR. Called down by the Black Materia. And it grows larger every day.' });
    yield s.say('barret', "Meteor. Sephiroth went and did it. And them WEAPON things been tearin' up towns all over the Planet.\fEverybody's scared outta their minds. And Shinra needs somebody to blame... Guess who.");
    s.sfx('door_shinra');
    s.spawn('c_rufus', 'rufus', 10, 7, 'up', { name: 'Rufus' });
    s.spawn('c_heid', 'heidegger', 11, 7, 'up', { name: 'Heidegger' });
    s.spawn('c_g1', 'soldier', 9, 7, 'up', { name: 'Soldier' });
    s.music('shinra');
    yield [s.move('c_rufus', 5, 5), s.move('c_heid', 7, 6), s.move('c_g1', 3, 6)];
    yield s.face('player', 'down');
    yield s.say('c_rufus', "Good, you're awake. It would have been a shame for you to sleep through your own execution.");
    yield s.say('tifa', "Execution...?!");
    yield s.say('c_rufus', "Meteor is falling. WEAPON is on the rampage. The people need someone to hate... and they need to see Shinra doing something about it.\fSo the terrorists who brought this upon us will be executed. Publicly. On live broadcast.");
    yield s.say('c_heid', "Gahahaha! A fine show for the masses!");
    yield s.say('barret', "You son of a...! Sephiroth's the one who did this, not us! You know it!");
    yield s.say('c_rufus', "The truth is a luxury, and today we can't afford it. Guards. Bring them.");
    yield [s.move('c_rufus', 10, 7), s.move('c_heid', 11, 7)];
    s.remove('c_rufus'); s.remove('c_heid');
    s.set('c9_escort');
    s.sfx('door2');
    yield s.say('Soldier', "You heard the President. Out. Both of you. And no funny business.");
    s.remove('c_g1');
    s.hide('cell_barret');
    s.block(3, 4, false);
    yield s.msg("Barret is marched out ahead of her. The door of Tifa's cell swings open.");
    yield s.say('tifa', "(Cloud... I can't give up. Not here. Not like this.)");
    s.music('shinra');
  }
  FF7.story.c9_junonWake = junonWake;

  FF7.defineMap('junon2_cell', {
    name: 'Junon - Detention Block', area: 'Junon', theme: 'shinra', music: 'shinra', look: JUNON_IN, leader: 'tifa',
    grid: [
      "######w#####w#####w###",
      "#b...#b...#b...#.....#",
      "#....#....#....#..D..#",
      "#....#....#....#.....#",
      "#==+=#==+=#==+=#.....#",
      "#....................#",
      "#....................#",
      "##########+###########",
    ],
    entries: { start: [2, 2, 'down'], from_corridor: [10, 6, 'up'] },
    exits: [
      { at: [10, 7, 1, 1], to: 'junon2_corridor', entry: 'from_cell', sfx: 'door_shinra',
        if: s => s.flag('c9_escort'), blocked: function* (s) { yield s.msg('The heavy door is locked from the outside.'); } },
    ],
    npcs: [
      { id: 'cell_barret', name: 'Barret', model: 'barret', at: [8, 2], dir: 'left', show: s => !s.flag('c9_escort'),
        talk: function* (s) { yield s.say('barret', "Seven days in this box... If I ever get my hands on Rufus..."); } },
      { id: 'cell_guard', name: 'Guard', model: 'soldier', at: [18, 2], dir: 'down', show: s => !s.flag('c9_press'),
        talk: function* (s) { yield s.say('Guard', s.flag('c9_escort') ? "Move it. The cameras are waiting." : "Quiet in there!"); } },
    ],
    onLoad: function (s) {
      if (!s.flag('c9_escort')) { s.block(3, 4); s.block(8, 4); }
      s.block(13, 4);
    },
    onEnter: function* (s) {
      if (s.entry() === 'start' && !s.flag('c9_junon_woke')) yield* junonWake(s);
    },
  });

  // ================================================================== the escort corridor (save point)
  FF7.defineMap('junon2_corridor', {
    name: 'Junon - Corridor', area: 'Junon', theme: 'shinra', music: 'shinra', look: JUNON_IN,
    grid: [
      "##############################",
      "#PP....PP....PP....PP....PP..#",
      "..............................",
      "......S.......................",
      "..............................",
      "#............................#",
      "##############################",
    ],
    entries: { from_cell: [1, 3, 'right'], from_press: [28, 3, 'left'] },
    exits: [
      { at: [0, 2, 1, 3], to: 'junon2_cell', entry: 'from_corridor', if: s => !s.flag('c9_escort'),
        blocked: function* (s) { yield s.say('Soldier', "Wrong way! Keep walking!"); } },
      { at: [29, 2, 1, 3], to: 'junon2_press', entry: 'from_corridor', sfx: 'door_shinra' },
    ],
    npcs: [
      { id: 'esc_front', name: 'Soldier', model: 'soldier', at: [26, 2], dir: 'left', show: s => !s.flag('c9_press'),
        talk: function* (s) { yield s.say('Soldier', "The press room's through here. Smile for the cameras."); } },
      { id: 'esc_barret', name: 'Barret', model: 'barret', at: [24, 4], dir: 'right', show: s => !s.flag('c9_press'),
        talk: function* (s) { yield s.say('barret', "Tifa... whatever happens in there, don't you give 'em the satisfaction. Keep your head up."); } },
      { id: 'esc_guard', name: 'Soldier', model: 'soldier', at: [25, 4], dir: 'left', show: s => !s.flag('c9_press'),
        talk: function* (s) { yield s.say('Soldier', "No talking to the prisoner!"); } },
      { id: 'esc_back', name: 'Soldier', model: 'soldier', at: [3, 5], dir: 'right', show: s => !s.flag('c9_press'),
        talk: function* (s) { yield s.say('Soldier', "Go on, you can use that. Your last save, eh? ...Heh. Don't ask me what it does, the brass just said to let you."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c9_corridor_seen') || s.flag('c9_press')) return;
      s.set('c9_corridor_seen');
      yield s.say('tifa', "(A save point... in the middle of a prison. Strange. Well... I'll take whatever I can get.)");
    },
  });

  // ================================================================== the press room
  function* pressScene(s) {
    s.set('c9_press');
    s.music('none');
    yield s.move('player', 14, 4);
    yield s.face('player', 'up');
    s.spawn('p_rufus', 'rufus', 10, 2, 'down', { name: 'Rufus' });
    s.spawn('p_scar', 'scarlet', 16, 2, 'down', { name: 'Scarlet' });
    s.spawn('p_barret', 'barret', 18, 4, 'up', { name: s.name('barret') });
    s.spawn('p_g1', 'soldier', 19, 5, 'up', { name: 'Soldier' });
    s.spawn('p_g2', 'soldier', 13, 5, 'up', { name: 'Soldier' });
    ['p_rep1', 'p_rep2', 'p_rep3'].forEach((id, i) => s.spawn(id, ['man6', 'woman5', 'man9'][i], 5 + i * 2, 6, 'up', { name: 'Reporter' }));
    s.music('rufus');
    yield s.say('p_rufus', "Citizens of the world. For seven days, WEAPON has rampaged across the Planet, and a new star hangs in our sky, bringing ruin.\fBut Shinra has found those responsible. Today, before your eyes, justice will be done.");
    s.sfx('scan');
    s.flash('#ffffff', 6);
    yield s.say('Reporter', "Mr. President! Over here! One more!");
    yield s.say('p_scar', "Kyahaha! Enough with the speeches. Let's get to the good part!\fThe big one goes to the firing squad. And this one... gets my special gas chamber. I had it built just for her.");
    yield s.say('barret', "You touch her and I swear I'll—");
    yield s.say('p_g1', "Shut it! Move!");
    yield [s.move('p_barret', 28, 6), s.move('p_g1', 27, 6)];
    s.remove('p_barret'); s.remove('p_g1');
    yield s.move('p_scar', 14, 2);
    yield s.face('p_scar', 'player');
    yield s.say('p_scar', "Come along, dear. Your audience is waiting.");
    yield s.fadeOut(30);
    ['p_rufus', 'p_scar', 'p_g2', 'p_rep1', 'p_rep2', 'p_rep3'].forEach(id => s.remove(id));
    yield s.goto('junon2_gas', 'strapped');
  }
  FF7.story.c9_pressScene = pressScene;

  function* barretEscape(s) {
    s.set('c9_barret_free');
    s.party(['barret'].concat(has(s, 'caitsith') ? ['caitsith'] : []));
    s.music('none');
    s.place('player', 26, 6, 'left');
    s.spawn('b_g1', 'soldier', 24, 6, 'right', { name: 'Soldier' });
    s.spawn('b_g2', 'soldier', 27, 5, 'down', { name: 'Soldier' });
    yield s.fadeIn(30);
    s.sfx('alarm');
    s.shake(3, 90);
    yield s.say('PA System', "WARNING! WARNING! WEAPON approaching Junon from the sea! All units to battle stations! This is not a drill!", { pos: 'top' });
    yield s.say('b_g1', "WEAPON?! Here?! ...Uh, what do we do with the prisoner?!");
    yield s.say('barret', "(Now's my chance...!)");
    if (has(s, 'caitsith')) {
      s.spawn('b_cait', 'caitsith', 14, 12, 'up', { name: s.name('caitsith') });
      yield s.run('b_cait', 23, 7);
      s.anim('b_g1', 'hurt'); s.sfx('hit');
      yield s.say('caitsith', "Hi-yah! Megaphone to the head! Take that!");
      s.anim('b_g1', 'lie');
      s.anim('player', 'punch'); s.sfx('hit');
      s.anim('b_g2', 'hurt');
      yield 16;
      s.anim('b_g2', 'lie');
      s.stopAnim('player');
      yield s.say('barret', "Cait Sith?! What the hell are you doin' here?!");
      yield s.say('caitsith', "Long story! Er... short story. I work here, remember? Sort of. Where's Tifa?!");
    } else {
      s.anim('player', 'punch'); s.sfx('hit');
      s.anim('b_g1', 'lie'); s.anim('b_g2', 'lie');
      yield s.say('barret', "Outta my way!!");
      s.stopAnim('player');
    }
    s.spawn('b_scar', 'scarlet', 14, 1, 'down', { name: 'Scarlet' });
    yield s.say('b_scar', "Kyahaha! Too late! The gas is on and that door is locked tight!\fEnjoy the show, boys. Toodles!");
    yield s.run('b_scar', [[14, 3], [1, 6]]);
    s.remove('b_scar');
    yield s.run('player', 14, 2);
    yield s.face('player', 'up');
    s.sfx('error');
    yield s.say('barret', "Locked...! TIFA!! Can you hear me?! Hang on!! ...DAMN IT!");
    s.spawn('b_sq1', 'soldier', 14, 13, 'up', { name: 'Attack Squad' });
    s.spawn('b_sq2', 'soldier', 15, 13, 'up', { name: 'Attack Squad' });
    yield [s.run('b_sq1', 13, 9), s.run('b_sq2', 16, 9)];
    yield s.say('Attack Squad', "Prisoner escaping! Take him down!");
    yield s.battle({ enemies: ['attack_squad', 'attack_squad', 'attack_squad'], bg: 'junon', music: 'hurry', noEscape: true });
    s.remove('b_sq1'); s.remove('b_sq2');
    s.set('c9_attack_squad');
    s.music('hurry');
    if (has(s, 'caitsith')) {
      yield s.say('caitsith', "We'll never bust that door open. But listen—the Highwind's at the airport, and Cid's already aboard!\fIf we can get to her, we can get to Tifa from outside!");
      yield s.say('barret', "The Highwind? ...Then what're we waitin' for?! Move it!");
      s.remove('b_cait');
      yield s.msg(`${s.name('caitsith')} joined the party.`);
    } else {
      yield s.say('barret', "Can't bust that door... The airport! If I can get to an airship, I can get to her from outside!");
    }
  }
  FF7.story.c9_barretEscape = barretEscape;

  FF7.defineMap('junon2_press', {
    name: 'Junon - Press Room', area: 'Junon', theme: 'shinra', music: s => s.flag('c9_barret_free') ? 'hurry' : 'shinra',
    // ref 13-weapon45: rows of seats under cold blue studio light, seen diagonally from above
    look: Object.assign({}, JUNON_IN, { floor: ['#3a4a72', '#34446c'], ambient: [0.36, 0.42, 0.64], light: [0.6, 0.7, 1.0] }),
    camera: { yaw: 35, pitch: 58, dist: 11 },
    battle: { table: 'junon_d2', bg: 'junon', rate: 0.6, if: s => s.flag('c9_attack_squad') && !s.flag('c9_boarded') },
    grid: [
      "##############+###############",
      "#MM.......D...:::...D.....MM.#",
      "#.............:::............#",
      "#..M..........:::.........M..#",
      "#............................#",
      "....c.c.c.c.......c.c.c.c....#",
      ".............................#",
      "....c.c.c.c.......c.c.c.c....#",
      "#............................#",
      "#..B.....................B...#",
      "#............................#",
      "#.............::::...........#",
      "#qq..........::::::........qq#",
      "#############::::#############",
    ],
    entries: { from_corridor: [1, 6, 'right'], from_walk: [14, 12, 'up'], barret: [26, 6, 'left'] },
    exits: [
      { at: [0, 5, 1, 3], to: 'junon2_corridor', entry: 'from_press', if: s => !s.flag('c9_press') },
      { at: [14, 0, 1, 1], run: function* (s) {
          if (!s.flag('c9_barret_free')) return;
          yield s.say('barret', "Locked tight! Scarlet's got the key... There's gotta be another way to reach her!");
        } },
      { at: [13, 13, 4, 1], to: 'junon2_walk', entry: 'from_press', if: s => s.flag('c9_attack_squad'),
        blocked: function* (s) { yield s.msg('Soldiers block the doorway.'); } },
    ],
    triggers: [
      { id: 'press', at: [3, 2, 24, 6], once: true, if: s => s.flag('c9_escort') && !s.flag('c9_press'), run: pressScene },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'barret' && !s.flag('c9_barret_free')) yield* barretEscape(s);
    },
  });

  // ================================================================== the gas chamber
  function* gasStrapped(s) {
    s.set('c9_gas_strapped');
    s.party(['tifa']);
    s.anim('player', 'sit');
    s.spawn('g_scar', 'scarlet', 6, 6, 'up', { name: 'Scarlet' });
    s.spawn('g_guard', 'soldier', 8, 5, 'left', { name: 'Soldier' });
    yield s.fadeIn(30);
    s.music('shinra');
    yield s.say('g_scar', "Kyahaha! Comfy? This little room is going to make you famous. The whole world is watching, you know.");
    yield s.say('tifa', "......");
    yield s.say('g_scar', "Nothing to say? How dull. Maybe you'll find your voice when the gas comes in.");
    s.sfx('alarm');
    s.shake(3, 80);
    yield s.say('PA System', "WARNING! WEAPON approaching Junon from the sea! All units to battle stations!", { pos: 'top' });
    yield s.say('g_scar', "WEAPON?! Now, of all the times...!\f...Well. The show must go on.");
    yield s.move('g_scar', 11, 5);
    s.sfx('beep');
    yield s.msg('Scarlet slams her palm on a switch. With a hiss, pale gas begins to seep from the vents.');
    yield s.say('g_scar', "Bye-bye, sweetie! Kyahahaha!");
    yield s.run('g_scar', 6, 7);
    s.remove('g_scar');
    s.sfx('door_shinra');
    yield s.say('g_guard', "M-ma'am! Wait for me! I'm not staying in here with that stuff!");
    yield s.run('g_guard', 7, 6);
    s.sfx('ching');
    yield s.msg('...Clink.\nSomething small drops from the fleeing guard\'s belt and skitters across the floor.');
    yield s.run('g_guard', 6, 7);
    s.remove('g_guard');
    yield s.say('tifa', "(A key...!)");
    yield s.fadeOut(40);
    s.party(['barret'].concat(has(s, 'caitsith') ? ['caitsith'] : []));
    yield s.goto('junon2_press', 'barret');
  }
  FF7.story.c9_gasStrapped = gasStrapped;

  // Tifa works the key free with her feet (FF7's button sequence, as a series of choices).
  const KEY_STEPS = [
    { text: 'The key lies on the floor, just past the tips of her boots.', opts: ['Stretch out the right foot', 'Stretch out the left foot', 'Rock the chair'], ok: 0,
      yes: 'Her toes just reach it. Carefully, she drags the key closer.', hint: "(Easy... It's on my right. Just a little further...)" },
    { text: 'The key is right under her feet now.', opts: ['Stomp on it', 'Pinch it between her boots', 'Kick it'], ok: 1,
      yes: 'She grips the key tight between her boots.', hint: "(If I can just hold it between my feet...)" },
    { text: 'The key is clamped between her boots.', opts: ['Lean forward', 'Raise her legs', 'Shake her feet'], ok: 1,
      yes: 'Slowly, she raises her legs, the key trembling between her feet...', hint: "(Lift it up... slowly...)" },
    { text: 'Her legs are raised, the key held fast.', opts: ['Swing her legs back under the chair', 'Bring it up to her mouth', 'Toss it into the air'], ok: 0,
      yes: 'She curls her legs back beneath the seat, toward her bound hands...', hint: "(My hands are tied behind the chair... I need to bring it back there.)" },
    { text: 'The key brushes her fingertips.', opts: ['Let go with her feet', 'Pass it to her fingers'], ok: 1,
      yes: 'Her fingers close around the key.', hint: "(Don't drop it now... Hand it over, gently...)" },
    { text: 'The key is in her hand.', opts: ['Wait', 'Unlock the cuffs'], ok: 1, yes: 'Click!', hint: "(Now...!)" },
  ];
  function* keyPuzzle(s) {
    for (const st of KEY_STEPS) {
      let misses = 0;
      while (true) {
        const c = yield s.ask(null, st.text, st.opts);
        if (c === st.ok) { yield s.msg(st.yes); break; }
        misses++;
        s.sfx('error');
        yield s.msg(misses >= 4 ? 'Tifa steadies herself and tries again, slowly and carefully...' : 'That won\'t work... The gas stings her eyes.');
        if (misses >= 4) { yield s.msg(st.yes); break; }
        if (misses >= 2) yield s.say('tifa', st.hint);
      }
    }
  }
  function* gasStruggle(s) {
    s.party(['tifa']);
    s.anim('player', 'sit');
    s.music('hurry');
    yield s.fadeIn(30);
    yield s.say('tifa', "(Cough... cough... The gas... I have to get loose...)\f(The key! It's still there, by my feet...)");
    yield* keyPuzzle(s);
    s.set('c9_key');
    s.stopAnim('player');
    s.place('player', 6, 5, 'down');
    yield s.say('tifa', "I'm free...! The gas! There has to be a switch somewhere...");
  }
  FF7.story.c9_gasStruggle = gasStruggle;

  function* sapphire(s) {
    s.set('c9_wall_blasted');
    s.music('weaponraid');
    s.sfx('alarm');
    s.shake(5, 120);
    yield s.say('PA System', "WEAPON has surfaced beside the harbor! Main cannon, open fire! FIRE!!", { pos: 'top' });
    yield s.movie('sapphire_weapon', { text: 'Out of the sea rises SAPPHIRE WEAPON, towering over Junon.\nThe great cannon roars, again and again, until the monster falls...\nbut not before a beam from its jaws tears into the harbor walls.' });
    s.shake(8, 60);
    s.flash('#ffffff', 20);
    yield s.msg('BOOOM!!\nThe east wall of the chamber bursts apart. Daylight and sea wind pour in through a gaping hole.');
    yield s.say('tifa', "...!! A way out!");
  }
  FF7.defineMap('junon2_gas', {
    name: 'Junon - Gas Chamber', area: 'Junon', theme: 'shinra', music: 'hurry', leader: 'tifa',
    look: { floor: ['#4a5048', '#444a42'], wall: '#5a6258', trim: '#2a302a', ambient: [0.38, 0.42, 0.38], fog: { color: [0.4, 0.48, 0.34], near: 4, far: 12 } },
    grid: [
      "##############",
      "#MM........MM#",
      "#............#",
      "#............#",
      "#............#",
      "#...........Z#",
      "#............#",
      "######+#######",
    ],
    entries: { strapped: [6, 4, 'down'], struggle: [6, 4, 'down'] },
    exits: [
      { at: [6, 7, 1, 1], run: function* (s) { yield s.say('tifa', "Locked! Scarlet... she locked it from the outside."); } },
    ],
    triggers: [
      C9.counter([12, 5, 1, 1], function* (s) {
        if (s.flag('c9_gas_stopped')) { yield s.msg('The switch is off. The vents have gone quiet.'); return; }
        s.sfx('beep');
        s.set('c9_gas_stopped');
        yield s.msg('Tifa slams the button beside the orange lamp. The hissing stops.');
        yield s.say('tifa', "Haah... haah... Made it. Now how do I get out of here...");
        yield* sapphire(s);
      }),
      C9.counter([13, 2, 1, 3], function* (s) {
        if (!s.flag('c9_wall_blasted')) { yield s.msg('Solid steel.'); return; }
        yield s.goto('junon2_cannon', 'from_gas');
      }),
    ],
    onEnter: function* (s) {
      if (s.entry() === 'strapped' && !s.flag('c9_gas_strapped')) { yield* gasStrapped(s); return; }
      if (s.entry() === 'struggle' && !s.flag('c9_key')) yield* gasStruggle(s);
    },
  });

  // ================================================================== outside: the walkway and the "reporter"
  FF7.defineMap('junon2_walk', {
    name: 'Junon - Upper Walkway', area: 'Junon', theme: 'junon', music: 'hurry', look: JUNON_OUT,
    battle: { table: 'junon_d2', bg: 'junon', rate: 1, if: s => !s.flag('c9_boarded') },
    grid: [
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhwhhh+hhhhwhhhhhwhhhEEEhhh",
      "#......:::...........::.....",
      "#......:::..........:::.....",
      "#.....l.............l.......",
      "#...........................",
      "============================",
      "                            ",
    ],
    entries: { from_press: [7, 2, 'down'], from_dock: [23, 2, 'down'] },
    exits: [
      { at: [7, 1, 1, 1], to: 'junon2_press', entry: 'from_walk', sfx: 'door_shinra' },
      { at: [22, 1, 3, 1], run: function* (s) {
          s.sfx('elevator');
          yield s.msg('The elevator grinds down toward the airport...');
          yield s.goto('junon2_dock', 'from_walk');
        } },
    ],
    npcs: [
      { id: 'reporter', name: 'Reporter', model: { base: 'yuffie', hairStyle: 'cap', top: '#c0a060', sleeve: '#c0a060' }, at: [15, 3], dir: 'down', show: s => has(s, 'yuffie') && !s.flag('c9_boarded'),
        talk: function* (s) {
          if (!s.flag('c9_reporter')) {
            s.set('c9_reporter');
            yield s.say('Reporter', "Junon Evening News! Sir, a quick comment on the execution for our viewers at ho— ...Oh. It's you guys.");
            yield s.say('barret', "Yuffie?! What're you—");
            yield s.say('yuffie', "Shhh! Not so loud! I'm undercover! Snuck in with the press crew. Pretty smart, huh?\fGet to the airport! The Highwind's waiting. I'll be right behind you!");
            return;
          }
          yield s.say('yuffie', "What're you waiting for? GO! I've got a scoop to file! ...Kidding!");
        } },
      { id: 'reporter2', name: 'Reporter', model: 'man6', at: [15, 3], dir: 'down', show: s => !has(s, 'yuffie') && !s.flag('c9_boarded'),
        talk: function* (s) { yield s.say('Reporter', "Sir! Sir! Any comment on the execution?! ...Wait, aren't you the prisoner?!"); yield s.say('barret', "No comment!"); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c9_walk_seen')) return;
      s.set('c9_walk_seen');
      yield s.msg('Smoke is rising from the harbor below. Out at sea, something enormous thrashes against the waves.');
    },
  });

  // ================================================================== the airport and the Highwind
  FF7.defineMap('junon2_dock', {
    name: 'Junon - Airport', area: 'Junon', theme: 'junon', music: 'hurry', look: Object.assign({}, JUNON_OUT, { floor3: ['#8a3a2a', '#823428'], wallH: 2.8 }),
    battle: { table: 'junon_dock', bg: 'junon', rate: 1, if: s => !s.flag('c9_boarded') },
    grid: [
      "                              ",
      "  hhhhhhhhhhhhhhhhhhhhhhhhhh  ",
      "  hhhhhhhhhhhh++hhhhhhhhhhhh  ",
      "==............::............==",
      "#.............::.............#",
      "#..B..........::..........B..#",
      "#.............::.............#",
      "#::::::::::::::::::::::::::::#",
      "#.............::.............#",
      "#..l..........::..........l..#",
      "#.............::.............#",
      "#EEE..........::.............#",
      "##############################",
    ],
    entries: { from_walk: [2, 10, 'up'] },
    exits: [
      { at: [1, 11, 3, 1], run: function* (s) { s.sfx('elevator'); yield s.goto('junon2_walk', 'from_dock'); } },
      { at: [14, 2, 2, 1], run: function* (s) { yield* boardHighwind(s); } },
    ],
    objects: [
      { at: [10, 2], talk: function* (s) { yield s.msg('The hull of an enormous airship, painted with the Shinra emblem. Her name is stenciled along the side: HIGHWIND.'); } },
    ],
    triggers: [
      { id: 'dock_guard', at: [11, 3, 8, 3], once: true, if: s => !s.flag('c9_dock_guard'), run: function* (s) {
          s.set('c9_dock_guard');
          s.spawn('d_s1', 'soldier1st', 14, 3, 'down', { name: 'SOLDIER' });
          s.spawn('d_s2', 'soldier1st', 15, 3, 'down', { name: 'SOLDIER' });
          yield s.say('SOLDIER', "Halt! No one boards the President's airship!");
          yield s.say('barret', "Yeah? Watch me!");
          yield s.battle({ enemies: ['soldier_2nd', 'soldier_2nd'], bg: 'junon', music: 'hurry' });
          s.remove('d_s1'); s.remove('d_s2');
        } },
    ],
  });
  function* boardHighwind(s) {
    if (s.flag('c9_boarded')) return;
    s.set('c9_boarded');
    s.sfx('helicopter');
    s.shake(2, 80);
    yield s.say('cid', "Oi! Get your butts in here, ya slowpokes! We're goin' after Tifa!", { pos: 'top' });
    yield s.say('barret', "Cid?! Hah! Never been so glad to hear that mouth!");
    yield s.fadeOut(30);
    yield s.caption('The Highwind lifts away from Junon\'s airport\nand swings out over the harbor, toward the great cannon...', { hold: 160, bg: '#000' });
    yield s.goto('junon2_gas', 'struggle');
  }
  FF7.story.c9_boardHighwind = boardHighwind;

  // ================================================================== the cannon: Scarlet's slap fight
  function* slapFight(s) {
    s.set('c9_scarlet');
    s.spawn('k_scar', 'scarlet', 4, 4, 'right', { name: 'Scarlet' });
    s.music('none');
    yield s.run('k_scar', 25, 4);
    yield s.face('player', 'k_scar');
    yield s.say('k_scar', "Kyahaha! Going somewhere, sweetie? There's nowhere to run out here but DOWN!");
    yield s.say('tifa', "Get out of my way, Scarlet!");
    yield s.say('k_scar', "Oh, I don't think so. I've been dying to do THIS...!");
    s.music('hurry');
    yield s.msg('SLAP FIGHT!\nWatch Scarlet. When she winds up, duck; when she drops her guard, slap!');
    let tifa = 0, scar = 0, round = 0;
    while (tifa < 3 && round < 12) {
      round++;
      const windup = Math.random() < 0.5;
      const c = yield s.ask(null, `Tifa ${tifa}  -  ${scar} Scarlet\n${windup ? 'Scarlet draws her hand way back...' : 'Scarlet sneers, hands on her hips...'}`, ['Slap!', 'Duck!']);
      if (!windup && c === 0) {
        tifa++; s.sfx('hit'); s.anim('k_scar', 'hurt');
        yield s.msg('SMACK! Tifa lands a clean slap!');
      } else if (windup && c === 1) {
        tifa++; s.sfx('hit'); s.anim('k_scar', 'hurt');
        yield s.msg('Tifa ducks under the swing and snaps back up with a slap of her own! SMACK!');
      } else {
        scar++; s.sfx('hit'); s.anim('player', 'hurt');
        yield s.msg(c === 0 ? 'Tifa winds up... but Scarlet\'s hand gets there first! SMACK!' : 'Tifa ducks... straight into Scarlet\'s backhand! SMACK!');
        if (scar === 3) yield s.say('k_scar', "Kyahaha! Had enough yet, you little...!");
      }
      s.stopAnim('k_scar'); s.stopAnim('player');
    }
    if (tifa < 3) yield s.msg('Tifa shakes off the sting, plants her feet... and delivers one final, perfect slap!');
    s.anim('k_scar', 'kneel');
    yield s.say('k_scar', "Ow-ow-OWWW! My face! My beautiful face...!");
    s.set('c9_slap_done');
    yield s.say('tifa', "(Now... the end of the barrel!)");
  }
  FF7.story.c9_slapFight = slapFight;
  function* highwindRescue(s) {
    s.set('c9_escaped');
    s.sfx('helicopter');
    s.shake(3, 100);
    yield s.say('tifa', "There's nowhere left to go... The sea's so far down...");
    yield s.msg('A roar of engines. Over the end of the cannon, a vast shadow slides into view... and a rope ladder tumbles down from its hull.');
    yield s.say('cid', "TIFA!! Jump! Jump for the ladder!!", { pos: 'top' });
    if (s.flag('c9_scarlet')) {
      s.show('k_scar');
      yield s.say('Scarlet', "Kyaaa! Don't you dare! Come back here!");
    }
    yield s.say('tifa', "...Here goes!!");
    yield s.jump('player', 39, 6, 1.5, 40);
    s.hide('player');
    s.music('none');
    yield s.movie('highwind_escape', { text: 'Tifa leaps from the end of the great cannon.\nHer hands close around the swaying rope ladder,\nand the Highwind climbs away over the sea, leaving Junon and its screaming sirens behind.' });
    yield s.goto('highwind_bridge', 'from_escape');
  }
  FF7.story.c9_highwindRescue = highwindRescue;

  FF7.defineMap('junon2_cannon', {
    name: 'Junon - Main Cannon', area: 'Junon', theme: 'junon', music: 'hurry', leader: 'tifa',
    look: Object.assign({}, JUNON_OUT, { floor: ['#6a7078', '#646a72'], floor2: ['#7a8088', '#747a82'], wall: '#6a7280' }),
    camera: { dist: 10, pitch: 44 },
    grid: [
      "                                        ",
      "hhhh                                    ",
      "hhhh====================================",
      "hhhh:::::::::::::::::::::::::::::::::::.",
      "hhhh:::::::::::::::::::::::::::::::::::.",
      "hhhh====================================",
      "                                        ",
      "                                        ",
    ],
    entries: { from_gas: [5, 3, 'right'] },
    triggers: [
      { id: 'scarlet', at: [26, 3, 2, 2], once: true, if: s => !s.flag('c9_slap_done'), run: slapFight },
      { id: 'rescue', at: [36, 3, 4, 2], once: true, if: s => s.flag('c9_slap_done'), run: highwindRescue },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'from_gas' || s.flag('c9_cannon_seen')) return;
      s.set('c9_cannon_seen');
      yield s.msg('Tifa climbs out through the hole... onto the barrel of Junon\'s colossal cannon.\nFar below, the sea still boils where WEAPON went down.');
      yield s.say('tifa', "(I have to keep moving. Before they come after me...)");
    },
  });

  // ================================================================== THE HIGHWIND
  // Members who aren't in the active party hang around the ship.
  const aboard = (id) => (s) => s.isMember(id) && !s.inParty(id) && (id !== 'cloud' || !s.flag('cloud_missing'));
  const searching = (s) => s.flag('cloud_missing') && !s.flag('cloud_returned');
  function hwMember(id, at, dir, early, late, extra) {
    return Object.assign({ id: 'hw_' + id, name: FF7.data.characters[id] ? FF7.data.characters[id].name : id, model: id, at, dir, show: aboard(id),
      talk: function* (s) { yield s.say(id, searching(s) ? early : late); } }, extra || {});
  }
  function partyTalk(s) { return s.flag('cloud_missing') && s.isMember('cid') ? ['cid'] : (!s.flag('cloud_missing') ? ['cloud'] : []); }
  const opCrew = function* (s) {
    const c = yield s.ask('Crewman', "Captain on deck! ...Er, what'll it be?", ['Change the party', 'Rest', 'Save', 'Nothing']);
    if (c === 0) { yield s.choosePArty(partyTalk(s)); return; }
    if (c === 1) {
      yield s.fadeOut(30);
      s.heal();
      yield 60;
      yield s.fadeIn(30);
      yield s.say('Crewman', "Everyone's patched up and rested. Ready when you are!");
      return;
    }
    if (c === 2) yield s.save();
  };
  function* leaveShip(s) {
    s.sfx('helicopter');
    if (!s.flag('c9_first_takeoff')) {
      s.set('c9_first_takeoff');
      s.set('has_highwind');
      yield s.say('Pilot', "Roger! Highwind, taking off!");
      yield s.world({ x: 233, y: 175, vehicle: 'highwind' });
      return;
    }
    yield s.world({ resume: true });
  }
  function* takeOff(s) {
    const c = yield s.ask('Pilot', s.flag('c9_first_takeoff') ? "Ready to take off?" : "Captain! The Highwind is ready. Shall we take off?", ['Take off!', 'Not yet']);
    if (c !== 0) { yield s.say('Pilot', "Standing by!"); return; }
    yield* leaveShip(s);
  }

  // ---- the crew meeting after the rescue: Cid takes command
  function* hwMeeting(s) {
    s.set('c9_hw_meeting');
    s.phs(true);
    s.party(['tifa']);
    s.music('highwind');
    const cast = ['barret', 'cid', 'redxiii', 'caitsith', 'vincent', 'yuffie'].filter(id => s.isMember(id));
    // Cid up on the nose platform, the rest round Tifa on the lower deck below the railing
    const spots = { barret: [11, 8, 'right'], cid: [14, 2, 'down'], redxiii: [16, 8, 'left'], caitsith: [9, 7, 'right'], vincent: [18, 7, 'left'], yuffie: [6, 9, 'right'] };
    cast.forEach(id => s.spawn('m_' + id, id, spots[id][0], spots[id][1], spots[id][2], { name: s.name(id) }));
    if (cast.indexOf('yuffie') >= 0) s.anim('m_yuffie', 'kneel');
    yield s.fadeIn(40);
    yield s.move('player', 13, 8);
    yield s.face('player', 'up');
    const say = function* (id, text) { if (cast.indexOf(id) >= 0) yield s.say(id, text); };
    yield* say('barret', "Tifa! Damn, you made it! ...That was one hell of a jump!");
    yield s.say('tifa', "Barret... Everyone. You came for me.");
    yield* say('cid', "Course we did! Couldn't let Shinra have the satisfaction.\fAnd in case you're wonderin'—this bird's MY ship now. Her crew took one look at WEAPON and practically begged me to take the wheel.");
    yield* say('redxiii', "When the crater erupted, Shinra's airship carried all of us out. All of us... except Cloud.");
    yield s.say('tifa', "Cloud... Where is he? Is he...?");
    yield* say('redxiii', "I don't believe he's dead. When the crater tore open, the Lifestream was surging up everywhere. If he fell into it, it may have carried him away.\fThe Lifestream runs beneath the whole Planet. Where the crust is thin, it wells up to the surface... even from the bottom of the sea.");
    yield s.say('tifa', "Then he could be... anywhere.");
    yield* say('caitsith', "I'll have my people keep their ears to the ground. Er... my OTHER people. You know what I mean.");
    yield* say('vincent', "If he still lives, the Planet will lead us to him. Or he to us.");
    yield* say('yuffie', "Ugh... Did somebody say 'ground'...? I want to be on it... Why does everything we ride have to MOVE...");
    yield* say('barret', "So what now? Somebody's gotta call the shots around here.");
    yield s.say('tifa', "Don't look at me... I can't. Not without Cloud.");
    yield* say('barret', "Me neither. After everything that's happened... I ain't fit to lead nobody. Not anymore.");
    if (cast.indexOf('cid') >= 0) {
      yield* say('cid', "...Tch! What a bunch of mopey, whinin'... FINE! If nobody else'll do it, I will!\fThis is my ship, and I'm the captain! First order: we find Cloud. Second: we figure out how to stop that damn rock from droppin' on our heads!\fAny objections?! ...Good!");
      yield s.say('tifa', "...Thank you, Cid.");
    }
    yield s.fadeOut(30);
    cast.forEach(id => s.remove('m_' + id));
    // Cid leads while Cloud is away (FF7): Cid first, then Tifa and Barret.
    const lead = s.isMember('cid') ? ['cid', 'tifa', 'barret'] : ['tifa', 'barret'].concat(['redxiii', 'caitsith'].filter(id => s.isMember(id)).slice(0, 1));
    s.party(lead.filter(id => s.isMember(id)).slice(0, 3));
    s.set('has_highwind');
    s.place('player', 13, 4, 'up');
    yield s.fadeIn(30);
    yield s.msg(`${s.name(lead[0])} is now the party leader.\nTalk to the crew in the Operation Room to change the party, rest or save. Talk to the pilot to take off.`);
  }
  FF7.story.c9_hwMeeting = hwMeeting;

  FF7.world.link('highwind_interior', { map: 'highwind_bridge', entry: 'from_world' });

  // The bridge is the Shinra airship's (C9.HW_BRIDGE, part3: the nose platform in the great window, the
  // console banks and helm, the stair down to the lower deck), plus a door east to the deck.
  const HWB = C9.HW_BRIDGE, HW_BRIDGE_GRID = HWB.grid.map((r, y) => y === 9 ? r.slice(0, 27) + '+' : r);
  FF7.defineMap('highwind_bridge', {
    name: 'Highwind - Bridge', area: 'Highwind', theme: 'ship', music: 'highwind',
    look: Object.assign({}, HW, HWB.look),
    camera: HWB.camera,
    grid: HW_BRIDGE_GRID, heights: HWB.heights, legend: HWB.legend, props: HWB.props,
    lights: HWB.lights,
    entries: { from_world: [13, 4, 'up'], start: [13, 4, 'up'], from_escape: [13, 9, 'up'], from_cabin: [13, 10, 'up'], from_deck: [26, 9, 'left'] },
    exits: [
      { at: [13, 11, 2, 1], to: 'highwind_cabin', entry: 'from_bridge', sfx: 'door' },
      { at: [27, 9, 1, 1], to: 'highwind_deck', entry: 'from_bridge', sfx: 'door' },
    ],
    npcs: [
      { id: 'hw_pilot', name: 'Pilot', model: { base: 'man', top: '#4a5a3a', sleeve: '#4a5a3a', extras: ['goggles'] }, at: [24, 4], dir: 'up', talk: takeOff },
      { id: 'hw_crew1', name: 'Crewman', model: { base: 'man', top: '#4a5a3a', sleeve: '#4a5a3a', hairStyle: 'cap' }, at: [4, 3], dir: 'up',
        talk: function* (s) { yield s.say('Crewman', searching(s) ? "The Captain's got us searching every coast for your friend. Don't worry, we'll find him!" : "Ever since the Captain took over, the ship's never flown better! ...Don't tell him I said that."); } },
      hwMember('cid', [14, 2], 'down', "Where to next? Just say the word and I'll put her down anywhere there's grass.\fAnd I'm tellin' ya, we'll find that spiky-headed fool. The Planet ain't THAT big.", "Good to have ya back, kid. Now let's go kick Sephiroth's ass."),
      hwMember('redxiii', [6, 8], 'right', "The Lifestream gushes up where the Planet's crust is thin... islands in the southern sea, perhaps. Mideel, for one.", "The Planet's cry grows louder every day. We must hurry."),
      hwMember('tifa', [21, 8], 'left', "...Cloud. Where are you...?\fI'm sorry. I'll be alright. We have to keep going.", "Cloud's back with us... I'm still not used to it. I'm so glad."),
    ],
    triggers: [C9.counter([24, 3, 2, 1], takeOff)],
    onEnter: function* (s) {
      s.phs(true);
      if (s.entry() === 'from_escape' && !s.flag('c9_hw_meeting')) yield* hwMeeting(s);
    },
  });

  FF7.defineMap('highwind_cabin', {
    // refs 13-weapon50, 51: the Highwind's cream-panelled interior, louvred windows full of sky, bunks and
    // lockers; in the middle the round operation table with its lit world map, the duty officer's console
    // by the door, a hatch in the floor down to the cargo hold
    name: 'Highwind - Operation Room', area: 'Highwind', theme: 'ship', music: 'highwind',
    look: Object.assign({}, HW, { wall: '#c8c0a8', trim: '#8a7a5e', wallTex: 'panel', floor: ['#b0aa9a', '#a8a292'], floorTex: { floor: 'tiles' }, metal: ['#b8b4a8', '#a09c90'], stool: '#8a6a4a', sky: ['#000000', '#000000'], indoor: true,
      ambient: [0.5, 0.48, 0.46], light: [0.82, 0.76, 0.66] }),
    camera: { yaw: 22, pitch: 50, dist: 10 },
    legend: { T: 'block', K: 'console' },
    grid: [
      "###################+##",
      "#.qq..KKK...........q#",
      "#b...................#",
      "#....................#",
      "#b.......ITT.........#",
      "#.........TTI........#",
      "#.........I........S.#",
      "#.--.................#",
      "######################",
    ],
    props: [
      { at: [10.5, 4.5], prop: 'disc', r: 1.35, h: 0.42, col: '#5a5e66', top: '#4a4e56', rim: '#b8a060' },
      { at: [10.5, 4.5], prop: 'hole', r: 1.0, col: '#58b8e8', col2: '#8a8e96', lift: 0.42 },
      { at: [7, 1], prop: 'console', w: 3, col: '#a8a498', col2: '#60d0f0' },
      { at: [14, 0], prop: 'viewwindow', w: 5, y: 0.8, h: 1.1, col: ['#5a90d0', '#e0f0fa'], col2: '#a8a090', louvers: 5 },
      { at: [21, 4], prop: 'viewwindow', w: 3, rot: -90, y: 0.8, h: 1.1, col: ['#5a90d0', '#e0f0fa'], col2: '#a8a090', louvers: 5 },
      { at: [0, 6], prop: 'screen', rot: 90, w: 2, h: 0.6, y: 1.3, style: 'map', col: '#60c0f0', col2: '#8a8678' },
    ],
    lights: [[10, 4, '#80d0ff', 2.5]],
    entries: { from_bridge: [19, 1, 'down'], from_hold: [3, 6, 'up'] },
    exits: [{ at: [19, 0, 1, 1], to: 'highwind_bridge', entry: 'from_cabin', sfx: 'door' }],
    npcs: [
      { id: 'hw_opcrew', name: 'Crewman', model: { base: 'man', top: '#4a5a3a', sleeve: '#4a5a3a', extras: ['headband'] }, at: [7, 2], dir: 'down', talk: opCrew },
      hwMember('barret', [13, 5], 'left', "Marlene... I keep thinkin' about her. With that thing in the sky... Nah. We're gonna stop it. We gotta.", "Heh. Lookit us. Back together and ready to rumble!"),
      hwMember('caitsith', [8, 4], 'right', "Shinra's in a total panic up top. Rufus has 'em all runnin' in circles over Meteor. I'll keep you posted!", "Say, want your fortune told? ...It says 'you'll be fine.' Always does, for you lot!"),
      hwMember('yuffie', [2, 5], 'right', "Uuugh... Don't... talk to me... The floor's moving... Why is the floor moving...", "Are we landing yet? Please say we're landing...", { anim: 'kneel' }),
      hwMember('cloud', [12, 3], 'down', "......", "...Thanks. For coming to get me. All of you."),
    ],
    triggers: [
      { at: [1, 2, 1, 3], on: 'talk', run: function* (s) { yield s.msg('A narrow bunk bolted to the wall. Someone has carved "C.H." into the frame.'); } },
      { at: [2, 7, 2, 1], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'A hatch in the floor leads down to the cargo hold.', ['Go down', 'Stay']);
          if (c === 0) yield s.goto('highwind_hold', 'from_cabin');
        } },
    ],
  });

  FF7.defineMap('highwind_deck', {
    // ref 15-cloud41: an open plank walkway along the airship's riveted hull (portholes, a hatch back
    // inside), brass railings round its edge and nothing but sky below
    name: 'Highwind - Deck', area: 'Highwind', theme: 'ship', music: 'highwind',
    look: Object.assign({}, HW, { sky: ['#4a88d0', '#d8ecf8'], fog: { color: [0.7, 0.82, 0.94], near: 12, far: 34 }, floor2: ['#9a8a6a', '#8e7e60'], floorTex: { floor2: 'planks' },
      trim: '#b8a060', bldg: '#b0b4b2', roof: '#8a8e8c', wallTex: { bldg: 'panel' } }),
    camera: { pitch: 46, dist: 10 },
    buildings: [{ at: [0, 0, 28, 1], h: 3.4, col: '#b0b4b2', win: false, tex: 'panel' }],
    grid: [
      "hhhh+hhhhhhhhhhhhhhhhhhhhhhh",
      " =::::::::::::::::::::::::= ",
      " =::::::::::::::::::::::::= ",
      " =:::::B:::::::::::::o::::= ",
      " =::::::::::::::::::::::::= ",
      " =::::::::::::::::::::::::= ",
      "  ========================  ",
      "                            ",
    ],
    props: [8, 12, 16, 20, 24].map(x => ({ at: [x, 0], prop: 'porthole', r: 0.22, y: 1.5, stars: false, col: '#20303e', col2: '#8a8e92', light: false }))
      .concat([{ at: [2, 5], prop: 'arcrail', r: 1, a0: 90, a1: 180, h: 0.45, col: '#b8a060' }, { at: [25, 5], prop: 'arcrail', r: 1, a0: 0, a1: 90, h: 0.45, col: '#b8a060' }]),
    entries: { from_bridge: [4, 1, 'down'] },
    exits: [{ at: [4, 0, 1, 1], to: 'highwind_bridge', entry: 'from_deck', sfx: 'door' }],
    npcs: [
      hwMember('vincent', [22, 2], 'down', "...The wind up here is clean. It carries nothing of the past.", "Hm. So he came back. ...Good."),
      { id: 'hw_deckhand', name: 'Deckhand', model: { base: 'man', top: '#4a5a3a', sleeve: '#4a5a3a', hairStyle: 'cap' }, at: [12, 4], dir: 'down',
        talk: function* (s) { yield s.say('Deckhand', s.flag('meteor') ? "See that red thing up there? Every morning it's a little bigger. The Captain says don't look at it, just fly." : "Hold onto the rail!"); } },
    ],
    triggers: [
      { at: [1, 3, 1, 3], on: 'talk', run: function* (s) {
          const c = yield s.ask(null, 'Far below, the world slides past. Leave the Highwind?', ['Leave', 'Stay']);
          if (c === 0) yield* leaveShip(s);
        } },
    ],
  });

  FF7.defineMap('highwind_hold', {
    // ref 15-cloud03: the hold under the decks - riveted steel, cargo lashed down, pipes and machinery on
    // the engine side, and the chocobo stable: two straw-bedded stalls behind a wooden fence with water
    // troughs, hay and red canvas awnings
    name: 'Highwind - Cargo Hold', area: 'Highwind', theme: 'ship', music: 'highwind',
    look: Object.assign({}, HW, { ambient: [0.4, 0.38, 0.4], wall: '#6e747c', wallTex: 'panel', floor: ['#5e6268', '#585c62'], floorTex: { floor: 'metal' },
      grass: ['#a88a44', '#9c7e3c'], trim: '#7a5a34', sky: ['#000000', '#000000'], indoor: true }),
    grid: [
      "####################",
      "#BB.o..=D,,=,,D=.BB#",
      "#B.....=,,,=,,,=..P#",
      "#......=,,,=,,,=..M#",
      "#......=========..P#",
      "#B.................#",
      "#^^.............oB.#",
      "####################",
    ],
    props: [
      { at: [8, 1], col: '#6a4a2a', col2: '#4a7ab0' }, { at: [14, 1], col: '#6a4a2a', col2: '#4a7ab0' },
      { at: [10, 1], prop: 'crate', col: '#c8a850', flat: true }, { at: [12, 2], prop: 'crate', col: '#c0a048', flat: true },
      { at: [9, 0], prop: 'banner', col: '#a82a2a', col2: '#d8b050', w: 2, h: 1.1, y: 1.9 }, { at: [13, 0], prop: 'banner', col: '#a82a2a', col2: '#d8b050', w: 2, h: 1.1, y: 1.9 },
    ],
    lights: [[11, 2, '#ffd890', 3]],
    entries: { from_cabin: [3, 6, 'right'] },
    exits: [{ at: [1, 6, 2, 1], to: 'highwind_cabin', entry: 'from_hold' }],
    npcs: [
      { id: 'hw_stable', name: 'Stable Hand', model: { base: 'man', top: '#6a5030', extras: ['apron'] }, at: [6, 3], dir: 'right',
        talk: function* (s) { yield s.say('Stable Hand', "This pen's for chocobos. If you ever catch one worth flying with, bring it aboard and I'll look after it.\fHay's fresh, water's clean. Just gotta find a bird brave enough to fly."); } },
    ],
    objects: [
      { at: [11, 4], talk: function* (s) { yield s.msg('An empty chocobo pen, lined with fresh straw.'); } },
    ],
  });
})();

// Chapter 11b, part 3 — the Planet's core and the ending.
// The hovering-rock descent (5 + 8 jumps, FF7's 76/256 battle chance per jump), Jenova·SYNTHESIS,
// the fall to Holy, Bizarro·Sephiroth → Safer·Sephiroth (active party), Cloud alone against
// Sephiroth in the Lifestream (scripted Omnislash win), Cloud catching Tifa's hand, the crumbling
// ledge, the Highwind's escape from the crater (Cid's boosters), Marlene in Kalm, Holy vs Meteor
// over Midgar, Aeris' hands in the Lifestream, "500 years later" → s.ending().
// Flags: c11b_core_arrived c11b_jenova_done c11b_abyss_seen c11b_safer_done c11b_duel_done
// c11b_ledge_done c11b_escape_done c11b_kalm_done c11b_end.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  // (+ the Turks when they have joined: Config > Turks Join, js/maps/extra/turks.js)
  const CREW = ['barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid', 'reno', 'rude', 'elena'];
  const partyNow = s => ['cloud'].concat(CREW.filter(id => s.inParty(id))).slice(0, 3);
  function* remark(s, lines) { for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return; } }
  const CORE_LOOK = { sky: ['#010806', '#0a3a28'], fog: { color: [0.03, 0.16, 0.11], near: 9, far: 28 }, ambient: [0.34, 0.46, 0.42], light: [0.6, 0.9, 0.78] };
  const BIZARRO = ['bizarro_sephiroth', 'bizarro_sephiroth_b', 'bizarro_sephiroth_c', 'bizarro_sephiroth_d', 'bizarro_sephiroth_e'];

  // ------------------------------------------------------------------ the hovering rocks
  // FF7: every hop to the next rock has a 76/256 chance of a battle (Allemagne / Iron Man / Dragon Zombie).
  const leap = (at, to) => ({ at, _to: to, run: function* (s) {
    yield s.jump('player', to[0], to[1], 1.1, 34);
    if (s.random(256) < 76) yield s.battle({ table: 'north_cave_core', bg: 'crater_core', music: 'jenova' });
  } });
  FF7.defineMap('final_platforms', {
    name: "The Planet's Core", area: 'Northern Crater', theme: 'crater', music: 'judgement',
    look: CORE_LOOK,
    grid: [
      "                                    ",
      "  U....                             ",
      "  .....                             ",
      "  ....:                             ",
      "          ....U                     ",
      "          ....:                     ",
      "                                    ",
      "                  .....             ",
      "                  ....:             ",
      "                          ....U     ",
      "                          ..:..     ",
      "                                    ",
      "                   .....            ",
      "                   :....            ",
      "          .......                   ",
      "          .......                   ",
      "          U......                   ",
      "                                    ",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "009999900000000000000000000000000000",
      "009999900000000000000000000000000000",
      "009999999000000000000000000000000000",
      "000000008888888000000000000000000000",
      "000000000088888800000000000000000000",
      "000000000000000877000000000000000000",
      "000000000000000007777770000000000000",
      "000000000000000000777776600000000000",
      "000000000000000000000000655555500000",
      "000000000000000000000000005555500000",
      "000000000000000000000000044400000000",
      "000000000000000000033333300000000000",
      "000000000000000000233333000000000000",
      "000000000011111111200000000000000000",
      "000000000011111110000000000000000000",
      "000000000011111110000000000000000000",
      "000000000000000000000000000000000000",
    ],
    lights: [[17, 9, '#60ffb0', 10], [2, 1, '#b0ffe8', 2], [30, 9, '#b0ffe8', 2], [10, 16, '#b0ffe8', 2]],
    entries: { start: [3, 2, 'right'] },
    exits: [{ at: [10, 14, 1, 2], to: 'final_platforms2', entry: 'start' }],
    triggers: [leap([6, 3], [10, 4]), leap([14, 5], [18, 7]), leap([22, 8], [26, 9]), leap([28, 10], [23, 12]), leap([19, 13], [16, 14])],
    onEnter: function* (s) {
      if (s.flag('c11b_core_arrived')) return;
      s.set('c11b_core_arrived');
      s.music('judgement');
      yield 30;
      yield s.say('cloud', "......Rocks, floating on nothing. We'll have to jump from one to the next.");
      yield* remark(s, [
        ['tifa', "Don't look down, don't look down..."],
        ['barret', "Man... Ain't nothin' under us but green light."],
        ['redxiii', "The Lifestream flows beneath us. Do not fall."],
        ['cid', "Heh. Jumpin' rocks with no net. Just like old times."],
        ['yuffie', "I am NOT looking down. Nope."],
        ['vincent', "...Carefully."],
        ['caitsith', "Hup! One small step for a moogle..."],
      ]);
    },
  });
  FF7.defineMap('final_platforms2', {
    name: "The Planet's Core", area: 'Northern Crater', theme: 'crater', music: 'judgement',
    look: CORE_LOOK,
    grid: [
      "                                    ",
      "  U...                              ",
      "  ...:   ....                       ",
      "         ...:   ....                ",
      "                ...:   ....         ",
      "                       ...:         ",
      "                              ...U  ",
      "                              ..:.  ",
      "                                    ",
      "                                    ",
      "                           .....    ",
      "                           :...U    ",
      "           ....     ....            ",
      "           .:..     :...            ",
      "                                    ",
      "                                    ",
      "             ..........             ",
      "             ..........             ",
      "             U........U             ",
      "                ....                ",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "009999000000000000000000000000000000",
      "009999988888800000000000000000000000",
      "000000000888888888880000000000000000",
      "000000000000000088888777777000000000",
      "000000000000000000000007777770000000",
      "000000000000000000000000000066666600",
      "000000000000000000000000000000666600",
      "000000000000000000000000000000006000",
      "000000000000000000000000000000056000",
      "000000000000000000000000000555550000",
      "000000000000000000000000055555550000",
      "000000000003333333004444440000000000",
      "000000000003333004444444000000000000",
      "000000000000320000000000000000000000",
      "000000000000022000000000000000000000",
      "000000000000011111111110000000000000",
      "000000000000011111111110000000000000",
      "000000000000011111111110000000000000",
      "000000000000000011110000000000000000",
    ],
    lights: [[18, 17, '#60ffb0', 8], [2, 1, '#b0ffe8', 2], [33, 6, '#b0ffe8', 2], [31, 11, '#b0ffe8', 2]],
    entries: { start: [3, 2, 'right'] },
    exits: [{ at: [16, 19, 4, 1], to: 'final_core', entry: 'start' }],
    triggers: [
      leap([5, 2], [9, 2]), leap([12, 3], [16, 3]), leap([19, 4], [23, 4]), leap([26, 5], [30, 6]),
      leap([32, 7], [31, 10]), leap([27, 11], [23, 12]), leap([20, 13], [14, 12]), leap([12, 13], [14, 16]),
    ],
  });

  // ------------------------------------------------------------------ Jenova·SYNTHESIS
  function* jenovaSynthesis(s) {
    s.music('none');
    yield s.cam(16, 3, 70);
    yield 30;
    yield s.say('cloud', "......Sephiroth.");
    yield* remark(s, [
      ['tifa', "He's... asleep? Inside that crystal?"],
      ['redxiii', "That is his true body. What we chased across the world... was only its shadow."],
      ['barret', "That's him?! The real deal, sleepin' in a block of ice?!"],
      ['cid', "So that's where the bastard's been hidin' all along."],
      ['yuffie', "Wait, THAT'S Sephiroth? He's just... floating there."],
      ['vincent', "...Sealed in Mako. Just as I once was, in a way."],
      ['caitsith', "Well, I'll be... It's really him."],
    ]);
    yield s.say('cloud', "He's been down here all this time... gathering the Lifestream to himself. Waiting.");
    s.shake(5, 100); s.sfx('alarm_long');
    yield 40;
    yield s.camFollow(30);
    yield s.say('cloud', "Something's coming...!");
    s.spawn('ev_jenova', { enemy: 'jenova_synthesis', scale: 1.6 }, 16, 6, 'down');
    s.flash('#e0a0ff', 24);
    yield 30;
    yield* remark(s, [
      ['tifa', "Jenova?! Still?!"],
      ['barret', "Jenova again?! How many damn times do we gotta kill this thing?!"],
      ['redxiii', "Jenova... Its cells have gathered here. This is what remains of them all."],
      ['cid', "Aw, not this ugly mug again!"],
      ['yuffie', "Ew ew ew! What IS that?!"],
      ['vincent', "...Jenova. So it ends where it began."],
      ['caitsith', "Uh-oh... That's Jenova, ain't it?!"],
    ]);
    yield s.say('cloud', "It's protecting him. ...Let's finish this!");
    yield s.battle({ enemies: ['jenova_synthesis_b', 'jenova_synthesis', 'jenova_synthesis_c'], bg: 'synthesis', music: 'jenova_absolute', noEscape: true });
    s.remove('ev_jenova');
    s.set('c11b_jenova_done');
    s.sfx('falling'); s.shake(7, 140);
    yield 40;
    yield s.say('cloud', "The ground...! It's breaking apart!");
    yield s.flash('#ffffff', 30);
    yield s.fadeOut(40, '#ffffff');
    yield s.caption('The crystal floor shatters.\nThe party plunges down, into the blinding light\nat the very heart of the Planet...', { hold: 200, bg: '#ffffff' });
    yield s.goto('final_abyss', 'start');
  }
  FF7.defineMap('final_core', {
    name: "The Planet's Core", area: 'Northern Crater', theme: 'crater', music: 'judgement',
    look: Object.assign({}, CORE_LOOK, { floor3: ['#9ad0d8', '#92c8d0'], floor2: ['#6ab0b8', '#62a8b0'] }),
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "      U_______yyyy_______U      ",
      "    ________________________    ",
      "    _U____________________U_    ",
      "    ______U__________U______    ",
      "    ________________________    ",
      "    ________::::::::________    ",
      "    ________::::::::________    ",
      "    ________::::::::________    ",
      "    U_______::::::::_______U    ",
      "    ________::::::::________    ",
      "    ____**____________**____    ",
      "    ____**____________**____    ",
      "    ________________________    ",
      "    __U__________________U__    ",
      "    ________________________    ",
      "                                ",
      "                                ",
    ],
    lights: [[16, 1, '#60ffb0', 8], [9, 12, '#60ffb0', 3], [23, 12, '#60ffb0', 3], [16, 9, '#b0ffe8', 5]],
    entries: { start: [16, 14, 'up'] },
    triggers: [{ id: 'jenova', at: [12, 8, 8, 3], if: s => !s.flag('c11b_jenova_done'), run: jenovaSynthesis }],
    npcs: [
      { id: 'crystal_seph', model: 'sephiroth', name: 'Sephiroth', at: [16, 1], dir: 'down', faceOnTalk: false,
        talk: function* (s) { yield s.msg('Sephiroth floats inside the giant Mako crystal, eyes closed, as if asleep.'); } },
    ],
  });

  // ------------------------------------------------------------------ before Holy: Bizarro and Safer
  function* finalBattles(s) {
    s.music('none');
    s.spawn('ev_seph', 'sephiroth', 16, 4, 'down', { name: 'Sephiroth' });
    s.flash('#ffffff', 20);
    yield 30;
    yield s.say('cloud', "Sephiroth!");
    yield s.say('sephiroth', "So you've come... all the way to the heart of the Planet. Well done, puppet.");
    yield s.say('cloud', "I'm nobody's puppet. Not anymore. I know who I am now.");
    yield s.say('sephiroth', "Do you? Then look around you. The Planet is gathering its Spirit Energy to heal the wound Meteor will make...\fand at the center of it all, there will be me. I will take in every drop, and be reborn as a god.");
    yield s.say('cloud', "That's not going to happen. Holy is right there. All we have to do is get past you.");
    yield* remark(s, [
      ['tifa', "We didn't come all this way just to lose now!"],
      ['barret', "Talk's cheap, Sephiroth! Let's settle this!"],
      ['redxiii', "You will not take the Planet's life for yourself!"],
      ['cid', "A god? Hah! You're just a nutcase with a big sword!"],
      ['yuffie', "Yeah, what he said! Get outta the way!"],
      ['vincent', "...It ends here, Sephiroth."],
      ['caitsith', "You're done, pal! The whole Planet's against ya!"],
    ]);
    yield s.say('sephiroth', "......Come, then.");
    // the others who followed you down (js/maps/c11b/part2.js: the ones you talked to at the bottom) are the other
    // parties: one more for up to three of them, two more (you form them) for four or more
    const backup = (s.get('c11b_backup') || []).filter(id => s.isMember(id) && !s.inParty(id));
    let parties = null;
    if (backup.length) {
      const lead = FF7.state.party.filter(Boolean);
      if (backup.length <= 3) parties = [lead, backup];
      else { const r = yield FF7.ui.partiesForm(backup, { lead }); parties = [lead].concat(r || [backup.slice(0, 3), backup.slice(3, 6)]); }
      yield s.say(backup[0], parties.length > 2 ? "We're all here, Cloud! Three parties: if one falls, the next one takes over!" : "We're right here, Cloud! If you fall, we take over!");
    }
    s.shake(6, 90); s.sfx('magic');
    yield s.movie('bizarro_rises', { text: 'Rings of dark light seize the party and lift them into the void.\nThe shape of Sephiroth twists and swells into something vast...' });   // (js/gfx/cinema.js)
    s.remove('ev_seph');
    yield s.battle({ enemies: BIZARRO, bg: 'lifestream', music: 'birthofgod', noEscape: true, parties });   // (split parties: js/battle/battle.js nextParty)
    yield s.movie('safer_rises', { text: "Bizarro·Sephiroth's shell crumbles away.\nFrom within it rises something else — radiant, terrible,\nspreading a single black wing across the heavens." });
    yield s.battle({ enemies: ['safer_sephiroth'], bg: 'space', music: 'onewinged', noEscape: true });
    s.set('c11b_safer_done');
    s.music('none');
    yield s.movie('safer_falls', { text: "Safer·Sephiroth's body splits apart in a storm of light...\n\nand falls silent.", stayBlack: true });
    yield s.goto('final_lifestream', 'start');
  }
  FF7.defineMap('final_abyss', {
    name: "The Planet's Core", area: 'Northern Crater', theme: 'lifestream', music: 'none',
    look: { sky: ['#f4fff8', '#50c090'], fog: { color: [0.6, 0.9, 0.75], near: 10, far: 30 }, ambient: [0.6, 0.72, 0.66], floor: ['#5a5a58', '#545452'] },
    grid: [
      "                                ",
      "              UUUU              ",
      "              UUUU              ",
      "                                ",
      "          ............          ",
      "        R..............R        ",
      "        .x..........x...        ",
      "        ................        ",
      "        ................        ",
      "        ................        ",
      "        ................        ",
      "        ................        ",
      "        ...x..........x.        ",
      "        R..............R        ",
      "          ............          ",
      "                                ",
    ],
    lights: [[16, 1, '#ffffff', 12], [16, 9, '#c0ffe0', 6]],
    entries: { start: [16, 12, 'up'] },
    triggers: [{ id: 'sephiroth', at: [10, 4, 12, 3], if: s => !s.flag('c11b_safer_done'), run: finalBattles }],
    onEnter: function* (s) {
      if (s.flag('c11b_abyss_seen')) return;
      s.set('c11b_abyss_seen');
      yield s.fadeIn(60);
      yield 30;
      yield s.say('cloud', "......Where...?");
      yield* remark(s, [
        ['tifa', "Cloud, look! That light up there... Is that...?"],
        ['redxiii', "That light... It must be Holy. It has been waiting down here all along."],
        ['barret', "Whoa... what's that big shiny thing? Holy?!"],
        ['cid', "Well, I'll be... That glowin' ball's gotta be Holy."],
        ['yuffie', "Ooh, pretty... Wait, is that Holy?!"],
        ['vincent', "...Holy. Held back, just as Bugenhagen said."],
        ['caitsith', "Would ya look at that! That's gotta be Holy!"],
      ]);
      yield s.say('cloud', "Holy... Aeris' prayer. It's right there. And Sephiroth is the only thing holding it back.");
      yield s.msg('This is the final battle. Make your last preparations.\n(Equipment and materia can be changed from the menu.)');
      s.menu(true);
    },
  });

  // ------------------------------------------------------------------ Cloud alone, in the Lifestream
  function* lastDuel(s) {
    s.music('none');
    s.spawn('ev_seph', 'sephiroth', 20, 7, 'left', { name: 'Sephiroth' });
    yield s.fadeIn(60);
    yield 40;
    yield s.say('cloud', "(...That presence. He's still here... inside my head.)");
    yield s.face('player', 'ev_seph');
    yield s.say('sephiroth', "......");
    yield s.say('cloud', "It's just you and me now, Sephiroth. No more puppets. No more illusions.\fThis time, I'm the one who ends it. For Aeris... and for everyone.");
    const before = partyNow(s);
    s.party(['cloud']);
    // (the Lifestream holds him up: after a split-party Bizarro·Sephiroth his party may have fallen, and this duel can't be lost)
    { const c = FF7.state.chars.cloud; if (c && c.hp <= 0) { c.hp = c.maxHp; c.status = {}; } }
    // the engine plays the scripted Omnislash win (finalDuel: Cloud gets the first turn, as in FF7)
    yield s.battle({ enemies: ['sephiroth_final'], bg: 'lifestream', music: 'chosen', noEscape: true, canLose: false, finalDuel: true });
    s.party(before);
    s.set('c11b_duel_done');
    s.anim('ev_seph', 'hurt');
    yield 30;
    yield s.flash('#ffffff', 30);
    s.remove('ev_seph');
    yield 40;
    yield s.say('cloud', "......It's over. Stay a memory, Sephiroth. Where you belong.");
    s.music('lifestream');
    yield s.caption('The Lifestream swells around him, warm and endless.\nCloud drifts in the green light, falling... falling...\n\nand from somewhere far above, a hand reaches down.', { hold: 220, bg: 'rgba(0,30,18,0.88)' });
    s.spawn('ev_tifa', 'tifa', 13, 3, 'down', { name: s.name('tifa') });
    yield s.say('tifa', "Cloud!!");
    yield s.move('player', 13, 6);
    s.anim('player', 'lookup');
    yield s.say('cloud', "Tifa...!");
    s.anim('ev_tifa', 'point');
    yield s.move('ev_tifa', 13, 5, { speed: 0.02 });
    yield s.say('cloud', "(Her hand... I've got it.)");
    yield s.flash('#ffffff', 40);
    yield s.fadeOut(50, '#ffffff');
    yield s.goto('final_ledge', 'start');
  }
  FF7.defineMap('final_lifestream', {
    name: 'The Lifestream', area: 'Northern Crater', theme: 'lifestream', music: 'none', leader: 'cloud',
    look: { sky: ['#021a12', '#20a070'] },
    grid: [
      "                              ",
      "                              ",
      "     ::::::::::::::::::::     ",
      "   ::::::::::***:::::::::::   ",
      "   :::**:::::::::::::::::::   ",
      "   :::**:::::::::::::::::::   ",
      "   ::::::::::::::::::::::::   ",
      "   ::::::::::::::::::::::::   ",
      "   ::::::::::::::::::::::::   ",
      "   :::::::::::::::::::**:::   ",
      "   :::::::::::::::::::**:::   ",
      "   :::::::::::**:::::::::::   ",
      "     ::::::::::::::::::::     ",
      "                              ",
    ],
    lights: [[14, 7, '#c0ffe0', 10], [6, 4, '#80ffc0', 3], [22, 9, '#80ffc0', 3]],
    entries: { start: [9, 7, 'right'] },
    onEnter: function* (s) {
      if (s.flag('c11b_duel_done')) return;
      yield* lastDuel(s);
    },
  });

  // ------------------------------------------------------------------ the crumbling ledge
  const LEDGE_SPOTS = { barret: [12, 3], redxiii: [16, 3], cid: [18, 4], yuffie: [8, 5], caitsith: [14, 3], vincent: [21, 5], reno: [10, 3], rude: [23, 3], elena: [6, 5] };
  function* ledge(s) {
    s.music('none');
    s.shake(3, 400);
    const hasTifa = s.isMember('tifa');
    if (hasTifa) { s.spawn('ev_tifa', 'tifa', 14, 11, 'up', { name: s.name('tifa'), anim: 'hurt' }); }
    s.anim('player', 'kneel');
    yield s.fadeIn(60);
    if (hasTifa) {
      yield s.say('tifa', "Cloud...! Don't let go...!");
      yield s.say('cloud', "I've got you. I'm not letting go. Not this time.");
    }
    s.sfx('falling'); s.shake(6, 60);
    yield s.say('cloud', "Ngh...! The ledge...!");
    const crew = CREW.filter(id => id !== 'tifa' && s.isMember(id));
    crew.forEach((id, i) => s.spawn('ev_' + id, id, 12 + (i % 4) * 2, 1, 'down', { name: s.name(id) }));
    yield crew.map(id => s.run('ev_' + id, LEDGE_SPOTS[id][0], LEDGE_SPOTS[id][1]));
    if (crew.includes('caitsith')) {
      yield s.run('ev_caitsith', 14, 9);
      yield s.say('caitsith', "Gotcha! Heeeave... HO!");
    } else if (crew.includes('barret')) {
      yield s.run('ev_barret', 14, 9);
      yield s.say('barret', "Hang on! I got ya! Rrraaagh!");
    }
    s.stopAnim('player');
    if (hasTifa) { s.stopAnim('ev_tifa'); s.place('ev_tifa', 15, 9, 'left'); }
    s.place('player', 13, 9, 'right');
    yield 30;
    if (crew.includes('barret')) yield s.say('barret', "Cloud! Tifa! You two in one piece?!");
    if (hasTifa) {
      yield s.face('ev_tifa', 'player');
      yield s.say('tifa', "...Cloud. Down there, in the light... did you hear it too? A voice...");
      yield s.say('cloud', "...Yeah. I did.\fI think... I'll see her again. Someday. In the Promised Land.");
      yield s.say('tifa', "...Yes. I'm sure we will. All of us.");
    }
    s.sfx('falling'); s.shake(8, 120);
    if (crew.includes('redxiii')) yield s.say('redxiii', "The whole crater is collapsing! We cannot stay here!");
    s.sfx('helicopter');
    yield 40;
    if (crew.includes('caitsith')) yield s.say('caitsith', "Look! Up there! It's the Highwind!");
    if (crew.includes('cid')) yield s.say('cid', "That's my crew! They came back for us! Everybody, get aboard — NOW!");
    yield s.say('cloud', "Let's go!");
    s.set('c11b_ledge_done');
    yield s.fadeOut(40);
    yield s.goto('final_highwind', 'start');
  }
  FF7.defineMap('final_ledge', {
    name: 'Northern Crater', area: 'Northern Crater', theme: 'crater', music: 'none', leader: 'cloud',
    look: { sky: ['#fff8e8', '#60c098'], fog: { color: [0.5, 0.8, 0.66], near: 10, far: 30 } },
    grid: [
      "##############################",
      "#U..........................U#",
      "#.R.........x..............R.#",
      "#...................R........#",
      "#........R...................#",
      "#.......................x....#",
      "#.....x..........x...........#",
      "#.........................R..#",
      "#..R.........................#",
      "#............................#",
      "#.....................CCCC...#",
      "#....CCC..............CCCC...#",
      "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      "                              ",
      "                              ",
    ],
    lights: [[14, 13, '#ffffff', 10], [1, 1, '#b0ffe8', 2], [28, 1, '#b0ffe8', 2]],
    entries: { start: [14, 10, 'down'] },
    onEnter: function* (s) {
      if (s.flag('c11b_ledge_done')) return;
      yield* ledge(s);
    },
  });

  // ------------------------------------------------------------------ the Highwind escapes
  // the Highwind's bridge (same room as C9's highwind_bridge; refs 15-cloud01, 02)
  const BRIDGE = FF7.c9.HW_BRIDGE;   // the shared bridge layout (c9/part3)
  const HW_SPOTS = { tifa: [11, 8], barret: [13, 9], redxiii: [15, 9], yuffie: [9, 8], caitsith: [19, 8], vincent: [22, 7], reno: [17, 9], rude: [20, 9], elena: [7, 8] };
  function* escape(s) {
    s.music('hurryfaster');
    const crew = CREW.filter(id => s.isMember(id));
    if (crew.includes('cid')) s.spawn('ev_cid', 'cid', 13, 3, 'up', { name: s.name('cid') });
    crew.filter(id => id !== 'cid').forEach(id => s.spawn('ev_' + id, id, HW_SPOTS[id][0], HW_SPOTS[id][1], 'up', { name: s.name(id) }));
    s.shake(3, 200); s.sfx('alarm_long');
    yield 40;
    if (crew.includes('cid')) yield s.say('cid', "Hang on to somethin', all of ya! We're gettin' outta here!");
    s.shake(6, 160);
    yield 30;
    if (crew.includes('barret')) yield s.say('barret', "Wh-what's goin' on?! We ain't movin'!");
    if (crew.includes('cid')) yield s.say('cid', "Damn it! The crater's suckin' us back down! The propellers can't pull against it!");
    if (crew.includes('redxiii')) yield s.say('redxiii', "The Lifestream is rising from the depths... We are caught in its current!");
    if (crew.includes('yuffie')) yield s.say('yuffie', "Do something! I don't wanna go back down there!!");
    if (crew.includes('cid')) {
      yield s.say('cid', "Heh... Guess it's time. I've been savin' this for a rainy day!\fSwitch to the rocket boosters, full power! And cut the tail section loose — we're dumpin' the dead weight!");
      s.anim('ev_cid', 'fistpump');
    }
    yield s.movie('highwind_crater_escape', { text: "The Highwind's rear section tears away and tumbles into the light.\nRockets roar to life — and the ship bursts free of the crater,\nshooting up into the open sky." });   // (js/gfx/cinema.js)
    if (crew.includes('cid')) yield s.say('cid', "Yeee-HAW! Told ya this old girl had one more trick in her!");
    s.music('worldcrisis');
    yield 40;
    if (crew.includes('barret')) yield s.say('barret', "Look! Meteor... It's right on top of Midgar!");
    if (crew.includes('tifa')) yield s.say('tifa', "Holy... It's too late?!");
    if (crew.includes('caitsith')) yield s.say('caitsith', "Midgar... Everybody down there...!");
    yield s.say('cloud', "......Aeris.");
    s.set('c11b_escape_done');
    yield s.fadeOut(60);
    yield s.goto('final_kalm', 'start');
  }
  FF7.defineMap('final_highwind', {
    name: 'Highwind', area: 'Highwind', theme: 'ship', music: 'none', leader: 'cloud',
    look: Object.assign({}, BRIDGE.look, { indoor: true, sky: ['#fff4e0', '#80d0a8'], ambient: [0.62, 0.5, 0.46] }), camera: BRIDGE.camera,
    grid: BRIDGE.grid, heights: BRIDGE.heights, legend: BRIDGE.legend, props: BRIDGE.props,
    lights: [[13, 3, '#ff4040', 4], [4, 8, '#ff4040', 3], [23, 8, '#ff4040', 3]],
    entries: { start: [14, 7, 'up'] },
    onEnter: function* (s) {
      if (s.flag('c11b_escape_done')) return;
      yield* escape(s);
    },
  });

  // ------------------------------------------------------------------ Kalm, and Holy
  function* kalmAndHoly(s) {
    s.spawn('ev_marlene', 'marlene', 15, 10, 'down', { name: 'Marlene' });
    s.spawn('ev_elmyra', 'elmyra', 13, 5, 'down', { name: 'Elmyra' });
    yield s.fadeIn(60);
    yield 60;
    s.anim('ev_marlene', 'lookup');
    yield 40;
    yield s.say('Marlene', "......Aeris?");
    yield s.move('ev_elmyra', 14, 9);
    yield s.say('Elmyra', "Marlene? What's the matter, sweetheart? It's cold out here.");
    yield s.face('ev_marlene', 'ev_elmyra');
    yield s.say('Marlene', "Aeris is here. I can feel her...\fShe came to help everybody.");
    yield s.face('ev_elmyra', 'up');
    yield s.say('Elmyra', "......Aeris...");
    s.set('c11b_kalm_done');
    yield s.fadeOut(80);
    yield s.movie('holy', { text: 'Meteor bears down on Midgar, its fire tearing the plates apart.\nHoly rises to meet it — but the light is not enough, and the sky over the city splits open.\n\nThen, from every corner of the Planet, the Lifestream wells up\nand races across the world toward Midgar...' });
    yield s.caption('Deep within the green light, a pair of hands opens, as if in prayer.\n\nThe Lifestream wraps itself around Meteor...\nand slowly, the red glow fades away.', { hold: 260, bg: 'rgba(0,40,24,0.95)' });
    // FF7: the staff roll, then five hundred years later (js/scenes/ending.js)
    yield FF7.scenes.staffRoll();
    yield s.goto('final_epilogue', 'start');
  }
  FF7.defineMap('final_kalm', {
    name: 'Kalm', area: 'Kalm', theme: 'town', music: 'worldcrisis', hidePlayer: true, leader: 'cloud',
    look: { sky: ['#1a0404', '#6a1a10'], fog: { color: [0.2, 0.06, 0.04], near: 10, far: 28 }, ambient: [0.34, 0.24, 0.24], light: [0.8, 0.44, 0.36] },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh",
      "hhhwhwhhhhhwhwhhhhwhhhhhwhwhhh",
      "hhhhhhhh+hhhhhhhhhhhh+hhhhhhhh",
      "h.............::.............h",
      "h.B..l.....f..::..f.....l....h",
      "h.............::.............h",
      "h.............:O...........B.h",
      "h.............::.............h",
      "h::::::::::::::::::::::::::::h",
      "h.............::.............h",
      "h.............::.............h",
      "h.ff.l....o...::........l.ff.h",
      "h.............::.............h",
    ],
    lights: [[5, 5, '#ffd080', 3], [24, 5, '#ffd080', 3], [15, 7, '#ff6040', 6]],
    entries: { start: [15, 12, 'up'] },
    onEnter: function* (s) {
      if (s.flag('c11b_kalm_done')) return;
      yield* kalmAndHoly(s);
    },
  });

  // ------------------------------------------------------------------ 500 years later
  function* epilogue(s) {
    s.set('c11b_end');
    s.music('none');
    yield s.caption('500 years later...', { hold: 200, bg: '#000' });
    s.spawn('ev_nanaki', 'redxiii', 2, 13, 'right', { name: 'Nanaki' });
    s.spawn('ev_cub1', 'redxiii', 1, 14, 'right', { scale: 0.55 });
    s.spawn('ev_cub2', 'redxiii', 1, 12, 'right', { scale: 0.55 });
    yield s.fadeIn(80);
    yield [
      s.run('ev_nanaki', [[12, 11], [16, 7], [22, 6]]),
      s.run('ev_cub1', [[11, 12], [16, 8], [21, 7]], { speed: 0.05 }),
      s.run('ev_cub2', [[10, 10], [16, 6], [20, 6]], { speed: 0.045 }),
    ];
    yield s.face('ev_nanaki', 'up');
    yield s.cam(16, 2, 120, { dist: 12, pitch: 30 });
    yield 40;
    s.anim('ev_nanaki', 'lookup');
    s.sfx('howl');
    yield 90;
    yield s.caption('Far across the plain, the ruins of Midgar stand silent,\nswallowed by green and ablaze with flowers.', { hold: 220, bg: 'rgba(0,0,0,0.55)' });
    yield s.fadeOut(120, '#ffffff');
    yield s.ending();
  }
  FF7.defineMap('final_epilogue', {
    name: 'Five Hundred Years Later', area: 'Midgar Area', theme: 'canyon', music: 'none', hidePlayer: true, leader: 'cloud',
    look: { sky: ['#6aa8e0', '#f0e0b0'], wall: '#6a7a60', trim: '#3a4a30' },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "VXVVXVVVXXVVVXVVVVXVVXXVVVXVVXVV",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "ffffffffffffffffffffffffffffffff",
      "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      "RddddddddddddddddR,,,,,,,,,,f,RR",
      "RddddddddGddddddd^,,f,,,,,,,,,RR",
      "RdddRdddddddddddd^,,,,,,,f,,,,RR",
      "RddddddddddddddddR,,,,,,,,,,,,RR",
      "RddddddddddRdddddRRRRRRRRRRRRRRR",
      "RdRdddddddddddddddddddddddddddRR",
      "RdddddddddddddddddddddddddddddRR",
      "RddGddddddddddRdddddddddRdddddRR",
      "RddddddRddddddddddddddddddddddRR",
      "RddddddddddddddddddddGdddddRddRR",
      "RdddddddddddddddddddddddddddddRR",
    ],
    heights: [
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000333333333333300",
      "00000000000000000133333333333300",
      "00000000000000000133333333333300",
      "00000000000000000333333333333300",
      "00000000000000000333333333333300",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
      "00000000000000000000000000000000",
    ],
    lights: [[16, 2, '#ffe8a0', 8]],
    entries: { start: [8, 13, 'up'] },
    onEnter: function* (s) {
      if (s.flag('c11b_end')) { yield s.ending(); return; }
      yield* epilogue(s);
    },
  });
})();

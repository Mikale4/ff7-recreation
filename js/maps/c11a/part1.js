// Chapter 11a (part 1) — Bugenhagen comes aboard the Highwind, the Forgotten Capital (Holy is
// explained, the Key to the Ancients is dug up at Bone Village, the water organ shows Aeris' last
// prayer), the Diamond WEAPON alarm, and the Northern Crater after the Sister Ray breaks the barrier.
// Diamond WEAPON / the Midgar raid are in part 2, the Sister Ray climb and Hojo in part 3.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const C = FF7.c11a = FF7.c11a || {};

  // ------------------------------------------------------------------ shared helpers (parts 1-3)
  C.CREW = ['barret', 'tifa', 'redxiii', 'cid', 'caitsith', 'yuffie', 'vincent'];
  C.crew = (s) => C.CREW.filter(id => s.isMember(id));
  // Spawn the other party members for a story scene at the given spots ([x, y, dir]); returns ids.
  C.gather = (s, spots, ids) => {
    const list = (ids || C.crew(s)).filter(id => s.isMember(id)).slice(0, spots.length);
    list.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'down', { name: s.name(id) }));
    return list;
  };
  C.dismiss = (s, list) => (list || []).forEach(id => s.remove(id));
  C.has = (list, id) => (list || []).indexOf(id) >= 0;
  // Heights from rectangles: C.hm(grid, [[x, y, w, h, digit], ...]) -> heights rows (base 0).
  C.hm = (grid, rects) => {
    const rows = grid.map(r => r.split('').map(() => '0'));
    for (const [x, y, w, h, d] of rects)
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (rows[yy] && xx < rows[yy].length) rows[yy][xx] = String(d);
    return rows.map(r => r.join(''));
  };
  // Free floor tiles around an entry of a map defined by another chapter (the Highwind bridge is
  // C9's map, so its layout is not known here). Returns up to n [x, y] spots, nearest ring first.
  C.spotsNear = function (mapId, n, entryName) {
    const map = FF7.maps[mapId];
    const out = [];
    if (!map || !map.grid || !FF7.field || !FF7.field.parseMap) return out;
    const P = FF7.field.parseMap(map);
    const ents = map.entries || {};
    const a = ents[entryName] || ents.start || ents.from_world || Object.values(ents)[0] || [Math.floor(P.w / 2), Math.floor(P.h / 2)];
    const used = new Set();
    Object.values(ents).forEach(e => used.add(e[0] + ',' + e[1]));
    (map.npcs || []).concat(map.objects || [], map.items || [], map.chests || []).forEach(o => { if (o.at) used.add(o.at[0] + ',' + o.at[1]); });
    const nearExit = (x, y) => (map.exits || []).some(ex => x >= ex.at[0] - 1 && x <= ex.at[0] + (ex.at[2] || 1) && y >= ex.at[1] - 1 && y <= ex.at[1] + (ex.at[3] || 1));
    const ring = (r) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (out.length >= n || Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = a[0] + dx, y = a[1] + dy, t = P.at(x, y);
        if (!t.walk || t.stair || used.has(x + ',' + y) || nearExit(x, y) || P.el(x, y) !== P.el(a[0], a[1])) continue;
        used.add(x + ',' + y); out.push([x, y]);
      }
    };
    for (let r = 2; r <= 7 && out.length < n; r++) ring(r);
    if (out.length < n) ring(1);
    return out;
  };
  // A cutaway to another place (Shinra HQ...): the calling script keeps running in the new map.
  C.cutaway = function* (s, mapId, entry, scene, backMap, backEntry) {
    yield s.fadeOut(30);
    yield s.goto(mapId, entry);
    yield* scene(s);
    yield s.fadeOut(30);
    yield s.goto(backMap, backEntry);
  };

  // ------------------------------------------------------------------ world links
  // The capital, Bone Village, the crater and Midgar are overridden only for this part of Disc 2
  // (conditional links win over the chapters' normal links; priority 10 beats other conditional ones).
  FF7.world.link('forgotten_capital', { map: 'holy_capital_gate', entry: 'from_world', priority: 10,
    if: s => s.flag('c11a_started') && !s.flag('c11a_capital_done') });
  // FF7: the Key to the Ancients lies in an undersea tunnel off the Bone Village coast, reached by
  // diving with the submarine (the dig map below is kept but no longer linked).
  const KEY_SEA = [196, 110];
  (FF7.world.stepHooks = FF7.world.stepHooks || []).push(function (ctx) {
    const st = FF7.state;
    if (ctx.vehicle !== 'submarine' || !ctx.dived || !st.flags.c11a_need_key || st.flags.holy) return null;
    if (Math.abs(ctx.x - KEY_SEA[0]) > 2 || Math.abs(ctx.y - KEY_SEA[1]) > 2) return null;
    if (FF7.sys.inv.hasKey('key_to_ancients')) return null;
    return function* (s) {
      s.sfx('search');
      yield s.msg("A narrow tunnel opens in the sea floor, running north... toward the Forgotten Capital.\fSomething glints at the end of it, half buried in the sand.");
      yield s.give('key_to_ancients');
    };
  });
  FF7.world.link('northern_crater', { map: 'holy_crater_rim', entry: 'from_world', priority: 10,
    if: s => s.flag('c11a_diamond_done') && !s.flag('c11a_hojo_news') });

  // ================================================================== Highwind: Bugenhagen aboard
  // C9 owns the Highwind interior; this chapter only adds its opening scene and Bugenhagen.
  FF7.patchMap('highwind_bridge', {
    onLoad: function (s) {
      if (!s.flag('c11a_started') || s.flag('c11a_raid_started') || s.flag('disc3')) return;
      const sp = C.spotsNear(s.mapId(), 1, 'from_world');
      if (sp.length) s.spawn('bugen_hw', 'bugenhagen', sp[0][0], sp[0][1], 'down', { name: 'Bugenhagen', talk: FF7.story.c11a_bugenHint });
    },
    onEnter: function* (s) {
      if (!s.flag('huge_materia_done') || s.flag('c11a_started')) return;
      s.set('c11a_started');
      yield* FF7.story.c11a_bugenhagenAboard(s);
    },
  });

  FF7.story.c11a_bugenhagenAboard = function* (s) {
    const sp = C.spotsNear(s.mapId(), 8, s.entry());
    const spot = (i) => sp[i] ? [sp[i][0], sp[i][1], 'down'] : null;
    const spots = [1, 2, 3, 4, 5, 6, 7].map(spot).filter(Boolean);
    const crew = C.gather(s, spots);
    crew.forEach(id => s.face(id, 'player'));
    s.music('highwind');
    yield 20;
    yield s.say('cid', "...Well, we got the Huge Materia outta that rocket. And Meteor's still hangin' up there like it owns the $#@! sky.");
    yield s.say('redxiii', "The Planet's cry grows louder every day. Even Grandpa says he can no longer sleep for it.\fWe brought him aboard at Cosmo Canyon. He wished to see the Huge Materia for himself.");
    if (sp[0]) {
      s.spawn('bugen', 'bugenhagen', sp[0][0], sp[0][1], 'down', { name: 'Bugenhagen' });
      yield s.face('player', 'bugen');
    }
    yield s.say('Bugenhagen', "Hoh hoh hoh! So this is Cid's flying ship. It rattles, but it flies!\fNow then. Show this old man the Materia you risked your necks for.");
    const huge = ['huge_materia_corel', 'huge_materia_condor', 'huge_materia_underwater', 'huge_materia_rocket'].filter(id => s.has(id));
    if (huge.length) {
      s.sfx('heal');
      s.flash('#a0e0ff', 30, 0.5);
      yield s.msg(`Bugenhagen lays his hands on the Huge Materia. ${huge.length > 1 ? 'The great orbs pulse' : 'The great orb pulses'} softly in answer.`);
      yield s.say('Bugenhagen', "Hmm... Materia is knowledge, you see. The wisdom of the Ancients, condensed into stone.\fAnd stones this size hold a great deal of it. Listen... can you hear? The Planet is groaning, like something wounded.");
      yield* FF7.story.c11a_bahamutZero(s);
    } else {
      yield s.say('Bugenhagen', "Hmm... Nothing left? No matter. The Planet's voice is loud enough without it.");
    }
    yield s.say('Bugenhagen', "Meteor comes closer with every sunrise. So, what will you do?\fDon't look to me for the answer. Look into your own hearts.");
    yield 30;
    yield s.say('cloud', "......Aeris.");
    if (C.has(crew, 'tifa')) yield s.say('tifa', "Aeris...?");
    yield s.say('cloud', "She went to the Forgotten Capital by herself. She said only she could stop Sephiroth... that the answer was there.\fShe didn't go there to die. She went there to do something. And I never asked her what.");
    if (C.has(crew, 'barret')) yield s.say('barret', "...Damn. All this time, an' not one of us ever thought about WHY she went.");
    yield s.say('Bugenhagen', "Hoh... Then there is only one place to go. Take me to the city of the Cetra.\fPerhaps these old ears can hear what that girl heard.");
    yield s.say('cid', "The Forgotten Capital, huh? North continent, past Bone Village and the Sleeping Forest. Everybody hold on to somethin'!");
    // --- memories of Aeris on the way
    s.music('aeris');
    yield 30;
    if (C.has(crew, 'tifa')) yield s.say('tifa', "She always acted like everything would turn out okay... even when she knew it wouldn't.");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "She understood the Planet better than any of us. I think she was listening to it the whole time.");
    if (C.has(crew, 'yuffie')) yield s.say('yuffie', "She was the only one who never got mad at me about... y'know. The materia thing.");
    if (C.has(crew, 'barret')) yield s.say('barret', "Marlene was crazy about her. Hell... we all were.");
    if (C.has(crew, 'caitsith')) {
      yield s.say('caitsith', "......Ah told Elmyra. About Aeris.");
      if (C.has(crew, 'tifa')) yield s.say('tifa', "...What did she say?");
      yield s.say('caitsith', "She'd already guessed. She said Aeris came to her one night, in a dream, to say goodbye.\fThen she cried an' cried. Marlene held her hand the whole time.");
      if (C.has(crew, 'barret')) {
        yield s.say('barret', "......Marlene......");
        yield s.say('caitsith', "They're both safe, Barret. Ah'm lookin' after 'em. Ah promise.");
      }
    }
    if (C.has(crew, 'vincent')) yield s.say('vincent', "......Some of us never get the chance to say goodbye.");
    yield s.say('cloud', "......Let's go.");
    yield s.say('cid', "You heard the man! Take her up!");
    s.music('highwind');
    C.dismiss(s, crew);
    if (sp[0]) { s.remove('bugen'); s.spawn('bugen_hw', 'bugenhagen', sp[0][0], sp[0][1], 'down', { name: 'Bugenhagen', talk: FF7.story.c11a_bugenHint }); }
    yield s.msg('Fly the Highwind to the Forgotten Capital, on the northern continent beyond the Sleeping Forest.');
  };

  // The blue Huge Materia answers the two Bahamut summons (FF7: Bahamut ZERO at Bugenhagen's).
  FF7.story.c11a_bahamutZero = function* (s) {
    if (s.flag('c11a_bahamut_zero') || s.hasMateria('bahamut_zero')) return;
    if (!s.has('huge_materia_rocket') || !s.hasMateria('bahamut') || !s.hasMateria('neo_bahamut')) return;
    s.set('c11a_bahamut_zero');
    s.sfx('summon');
    s.flash('#4080ff', 40, 0.8);
    yield s.msg("The blue Huge Materia flares! Deep inside it, something answers the Bahamut Materia you carry...");
    yield s.say('Bugenhagen', "Hoh! The dragon kings recognize one of their own. Take it — it wants to go with you.");
    yield s.giveMateria('bahamut_zero');
  };

  // Bugenhagen on the bridge: a hint for whatever comes next.
  FF7.story.c11a_bugenHint = function* (s) {
    yield* FF7.story.c11a_bahamutZero(s);
    if (!s.flag('c11a_need_key') && !s.flag('holy'))
      yield s.say('Bugenhagen', "The city of the Cetra lies on the northern continent, beyond the Sleeping Forest. Take me there, and we shall see what the girl was after. Hoh hoh.");
    else if (!s.flag('holy') && !s.has('key_to_ancients'))
      yield s.say('Bugenhagen', "The Key to the Ancients... The Cetra hid it where no one would stumble on it.\fBeneath the sea, I think, below the old city itself. Take that submarine of yours down near Bone Village and look for a tunnel.");
    else if (!s.flag('holy'))
      yield s.say('Bugenhagen', "You found the key! Quickly now, back to the crystal chamber in the Forgotten Capital.");
    else if (!s.flag('c11a_diamond_done'))
      yield s.say('Bugenhagen', "That WEAPON is walking straight for Midgar. The Planet protects itself... but it does not care who stands in the way. Hurry!");
    else if (!s.flag('c11a_hojo_news'))
      yield s.say('Bugenhagen', "Did you see that light? It flew north... toward the crater. Go and look, and see what has become of the barrier.");
    else
      yield s.say('Bugenhagen', "That Hojo means to overload the cannon, and all of Midgar with it. Go! This old man will keep the ship warm. Hoh hoh.");
  };

  // ================================================================== the Forgotten Capital
  // same night-blue city under white coral as C8's capital_* maps (refs 10-forgottencity28-34, 16-forgottencity07-14)
  const CAP_LOOK = { floor: ['#72829e', '#6c7c98'], floor2: ['#a4aec0', '#9ca6b8'], floor3: ['#d6d8d0', '#ced0c8'], wall: '#cdd2d6', trim: '#46546e',
    grass: ['#bcd8dc', '#b4d0d4'], water: '#2a5a98', wallTop: '#b4bccb',
    ambient: [0.3, 0.36, 0.5], light: [0.62, 0.7, 0.9], sky: ['#02050f', '#1a2c52'], fog: { color: [0.07, 0.11, 0.22], near: 10, far: 26 } };
  const CAP_GATE = [
    "UUUU%URUT%UUUU%URUT%UUUU%URU#####U",
    "%UUUU%URUT%UUUUT::TT%UUUU%URU#+#UU",
    "TU..RRRRR.......::.....RRRRR...UUU",
    "UTURR###RR......::....RR###RR...%U",
    "RU.RR###RR..U...::...URR###RR...T%",
    "UR..RRRRR.......::.....RRRRR....UT",
    "::::::::::::::::::::::::::::::..RU",
    "::::::::::::::~~~~::::::::::::S.UR",
    "::::::::::::::~~~~::::::::::::..%U",
    "UU..............::..............U%",
    "UU..U.......U...::...U.......U..UU",
    "%U..............::..............UU",
    "T%T.............::............T.UU",
    "UU..............::..............%U",
    "RU%%UUUU%URU%%UU::UURU%%UUUU%URU%%",
    "                ::                ",
  ];
  FF7.defineMap('holy_capital_gate', {
    name: 'Forgotten Capital', area: 'Northern Continent', theme: 'city_ancients', music: 'cry', look: CAP_LOOK,
    lights: [[16, 7, '#a0d0ff', 4], [4, 10, '#80c0ff', 2], [29, 10, '#80c0ff', 2]],
    grid: CAP_GATE,
    heights: C.hm(CAP_GATE, [[4, 2, 5, 1, 1], [4, 5, 5, 1, 1], [3, 3, 1, 2, 1], [9, 3, 1, 2, 1], [4, 3, 5, 2, 3], [23, 2, 5, 1, 1], [23, 5, 5, 1, 1], [22, 3, 1, 2, 1], [28, 3, 1, 2, 1], [23, 3, 5, 2, 3]]),   // two shell mounds (stepped skirt round a core)
    entries: { from_world: [16, 13, 'up'], from_hall: [2, 7, 'right'] },
    exits: [
      { at: [16, 15, 2, 1], to: 'world', loc: 'forgotten_capital' },
      { at: [0, 6, 1, 3], to: 'holy_capital_hall', entry: 'from_gate' },
      { at: [16, 1, 2, 1], hidden: true, run: function* (s) {
          yield s.say('cloud', "(The crystal stairway down to the altar... where Aeris...)\f(......Not that way. Bugenhagen went west, toward the crystal chamber.)");
        } },
      { at: [30, 1, 1, 1], hidden: true, run: function* (s) {
          yield s.msg("A house shaped like a great shell. Its owners left it long, long ago.");
        } },
    ],
    triggers: [
      { at: [14, 7, 4, 2], on: 'talk', run: function* (s) { yield s.msg("A still pool of clear water. Pale lights drift beneath the surface."); } },
      { at: [4, 10], on: 'talk', run: function* (s) { yield s.msg("A crystal growing straight out of the ground. It hums faintly when you touch it."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_capital_arrive') || s.entry() !== 'from_world') return;
      s.set('c11a_capital_arrive');
      s.spawn('bugen', 'bugenhagen', 17, 12, 'up', { name: 'Bugenhagen' });
      const crew = C.gather(s, [[15, 12, 'up'], [18, 13, 'up']], ['tifa', 'redxiii', 'barret', 'cid', 'caitsith', 'vincent', 'yuffie']);
      yield s.fadeIn(20);
      yield s.move('bugen', 17, 10);
      yield s.say('Bugenhagen', "Hoh... So this is the city of the Cetra. Even the air hums here.");
      yield s.say('cloud', "Aeris prayed at the altar at the bottom of the city. That's where Sephiroth...");
      yield s.say('Bugenhagen', "......Mm. Wait. Do you hear it? A voice, among the crystals. From the west.");
      yield s.emote('bugen', '!');
      if (C.has(crew, 'redxiii')) yield s.say('redxiii', "Grandpa? ...I hear nothing.");
      yield s.say('Bugenhagen', "Hoh hoh. Young ears aren't always the sharpest. Come!");
      yield s.move('bugen', [[18, 9], [18, 6], [3, 6]]);
      s.remove('bugen');
      C.dismiss(s, crew);
    },
  });

  // ------------------------------------------------------------------ the crystal chamber
  const HALL = [
    "###########################",
    "####|###|####u####|###|####",
    "####U........:........U####",
    "##U.....~~~~.:.~~~~.....U##",
    "##....~~.....:.....~~....##",
    "##...~~.....___.....~~...##",
    "##...~....__UUU__....~...##",
    "+::::K....__UUU__....~...##",
    "##...~....__UUU__....~...##",
    "##...~~.....___.....~~...##",
    "##....~~.....:.....~~....##",
    "##U.....~~~~.:.~~~~.....U##",
    "####U........:........U####",
    "####|###|#########|###|####",
  ];
  const organTalk = function* (s) {
    if (s.flag('holy')) { yield s.msg("The water has stopped falling. The organ's pipes are silent again."); return; }
    if (!s.flag('c11a_need_key')) {
      yield s.msg("An instrument carved into the chamber wall. Its pipes climb into the ceiling...\fIn the middle of the console there is a small, strangely shaped hole.");
      return;
    }
    if (!s.has('key_to_ancients')) {
      yield s.say('Bugenhagen', "That's where the key belongs, I'm sure of it. Without it, this old organ won't sing a note.");
      return;
    }
    yield* FF7.story.c11a_waterOrgan(s);
  };
  FF7.defineMap('holy_capital_hall', {
    name: 'Forgotten Capital — Crystal Chamber', area: 'Northern Continent', theme: 'city_ancients', music: 'cry',
    // ref 16-forgottencity09-13: grey-green stone walls and pillars, a blue patterned ring round the crystal
    look: Object.assign({}, CAP_LOOK, { indoor: true, wallH: 3.4, sky: ['#040a18', '#101c38'], fog: null, wall: '#8a948c', wallTop: '#5a6660', trim: '#3a4a5a',
      floor: ['#7e8c9a', '#788694'], floor3: ['#4a6aa8', '#4464a2'], water: '#3a70b0' }),
    camera: { pitch: 58, dist: 11 },
    lights: [[13, 7, '#80c0ff', 5], [13, 2, '#c0e0ff', 2], [4, 3, '#80c0ff', 2], [22, 11, '#80c0ff', 2]],
    grid: HALL,
    entries: { from_gate: [1, 7, 'right'], after_vision: [13, 10, 'up'] },
    exits: [
      { at: [0, 7, 1, 1], run: function* (s) {
          if (s.flag('holy') && !s.flag('c11a_diamond_alert')) { yield* FF7.story.c11a_diamondAlert(s); return; }
          yield s.goto('holy_capital_gate', 'from_hall');
        } },
    ],
    npcs: [
      { id: 'bugen', name: 'Bugenhagen', model: 'bugenhagen', at: [11, 5], dir: 'right',
        show: s => s.flag('c11a_need_key') && !s.flag('c11a_diamond_alert'),
        talk: function* (s) {
          if (s.flag('holy')) { yield s.say('Bugenhagen', "Holy is there, waiting. Now you know what must be done. Hoh hoh."); return; }
          if (s.has('key_to_ancients')) { yield s.say('Bugenhagen', "Hoh! Is that it? The Key to the Ancients! Put it into the organ there, at the north wall!"); return; }
          yield s.say('Bugenhagen', "I will wait here and listen to the crystal. You go find that key.\fThe crystal hums of the sea... Search the waters off Bone Village with the submarine.");
        } },
    ],
    triggers: [
      { at: [13, 1], on: 'talk', run: organTalk },
      { at: [12, 6, 3, 3], on: 'talk', run: function* (s) { yield s.msg("A pillar of blue crystal. Light moves inside it, slow as breathing."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_need_key') || s.entry() !== 'from_gate') return;
      yield* FF7.story.c11a_holyExplained(s);
    },
  });

  // First visit: Bugenhagen reads the crystal and speaks of Holy.
  FF7.story.c11a_holyExplained = function* (s) {
    s.spawn('bugen', 'bugenhagen', 11, 7, 'right', { name: 'Bugenhagen' });
    const crew = C.gather(s, [[3, 6, 'right'], [3, 8, 'right'], [9, 9, 'up'], [16, 9, 'up'], [17, 5, 'down'], [8, 4, 'down'], [18, 4, 'down']]);
    yield s.move('player', 7, 7);
    yield s.say('Bugenhagen', "Hoh... hoh hoh. Here. This is where the voice was coming from.");
    s.anim('bugen', 'lookup');
    s.sfx('heal');
    s.flash('#80c0ff', 30, 0.5);
    yield 40;
    s.stopAnim('bugen');
    yield s.say('Bugenhagen', "The crystal remembers... The Cetra knew of a magic to stand against Meteor.\fHoly. The ultimate White Magic.");
    yield s.say('cloud', "Holy...");
    yield s.say('Bugenhagen', "If a soul seeking Holy reaches the Planet, Holy will appear. And it will cast out whatever threatens the Planet.\fMeteor, WEAPON... everything. The key to it is a single Materia. The White Materia.");
    yield s.say('cloud', "......Aeris had a little Materia. It was always in her hair ribbon. She said it didn't do anything.\fWhen she was praying at the altar... it fell. It rolled into the water.");
    yield s.face('bugen', 'player');
    yield s.say('Bugenhagen', "......Hoh. Then that girl was not simply praying. She was calling for Holy.\fBut if Holy had answered, Meteor would already be... Hmm. Something is not right. I must know more.");
    yield s.move('bugen', 13, 4);
    yield s.face('bugen', 'up');
    yield s.say('Bugenhagen', "This organ in the wall... It is a lock, and its song is the answer. But it needs a key.\fThe Key to the Ancients. Without it, this chamber will keep its secrets.");
    if (C.has(crew, 'tifa')) yield s.say('tifa', "A key...? Where would we even start looking?");
    if (C.has(crew, 'cid')) yield s.say('cid', "Under the sea near Bone Village, huh? Good thing we swiped that sub. Let's go take a dive!");
    else yield s.say('cloud', "Under the sea near Bone Village... We'll need the submarine.");
    yield s.say('Bugenhagen', "Hoh hoh! Then go. I shall stay here and listen to the crystal. Hurry back.");
    yield s.move('bugen', 11, 5);
    C.dismiss(s, crew);
    s.remove('bugen');
    s.show('bugen', 11, 5, 'right');
    s.set('c11a_need_key');
    yield s.msg('Find the Key to the Ancients: dive with the submarine in the waters off Bone Village.');
  };

  // Second visit: the key goes into the organ, water falls, and Aeris' memory plays on it.
  FF7.story.c11a_waterOrgan = function* (s) {
    s.take('key_to_ancients');
    yield s.msg("Cloud fits the Key to the Ancients into the organ.");
    s.stopMusic(40);
    s.sfx('piano_chord1');
    yield 40;
    s.sfx('piano_chord3');
    yield 30;
    s.shake(2, 90);
    yield s.msg("Somewhere above, a deep melody begins to play... and water pours down from the ceiling,\nfalling all around the crystal like a curtain.");
    s.flash('#c0e8ff', 40, 0.7);
    yield 30;
    yield s.say('Bugenhagen', "Hoh! Look! There's something on the water...!");
    yield* C.cutaway(s, 'holy_altar_memory', 'vision', FF7.story.c11a_aerisMemory, 'holy_capital_hall', 'after_vision');
    yield* FF7.story.c11a_holyBlocked(s);
  };

  // What the falling water shows: the altar, and Aeris' last prayer.
  FF7.story.c11a_aerisMemory = function* (s) {
    s.music('aeris');
    s.spawn('aeris_m', 'aeris', 11, 4, 'up', { name: s.name('aeris') || 'Aeris' });
    s.anim('aeris_m', 'pray');
    yield s.fadeIn(60);
    yield s.cam(11, 4, 60, { dist: 8, pitch: 38 });
    yield 60;
    yield s.caption("(On the water, an image takes shape.\nThe altar at the bottom of the city...\nand Aeris, kneeling in prayer.)", { hold: 150, bg: 'rgba(0,10,30,0.55)' });
    yield 60;
    s.stopAnim('aeris_m');
    s.anim('aeris_m', 'lookup');
    yield 50;
    yield s.face('aeris_m', 'down');
    yield s.emote('aeris_m', '♪', 60);
    yield 40;
    s.anim('aeris_m', 'pray');
    yield 40;
    s.spawn('seph_m', 'sephiroth', 11, 1, 'down', { name: 'Sephiroth' });
    yield s.jump('seph_m', 11, 3, 1.6, 40);
    s.flash('#ffffff', 50, 1);
    s.stopMusic(10);
    yield 50;
    s.remove('seph_m');
    s.anim('aeris_m', 'lie');
    yield 60;
    s.sfx('hop');
    yield 20;
    s.sfx('ching');
    yield s.caption("(Something small slips from her ribbon.\nIt bounces down the steps of the altar... and sinks into the water,\nglowing faintly all the way down.)", { hold: 170, bg: 'rgba(0,10,30,0.6)' });
    s.flash('#d0ffe0', 40, 0.6);
    yield 60;
    s.camFollow(20);
  };

  FF7.story.c11a_holyBlocked = function* (s) {
    s.music('cry');
    s.spawn('bugen', 'bugenhagen', 13, 9, 'down', { name: 'Bugenhagen' });
    const crew = C.gather(s, [[11, 10, 'up'], [15, 10, 'up'], [10, 9, 'right'], [16, 9, 'left'], [12, 11, 'up'], [14, 11, 'up'], [9, 10, 'right']]);
    yield s.fadeIn(40);
    yield 20;
    yield s.say('Bugenhagen', "Did you see it? That little Materia, sinking through the water... still glowing.");
    yield s.say('cloud', "The Materia Aeris always wore. Her mother gave it to her...");
    yield s.say('Bugenhagen', "That was the White Materia. With it, one may pray to the Planet for Holy.\fAnd see how it shone, even down in the dark! A dull stone does not shine. Her prayer reached the Planet. Holy has been called.");
    if (C.has(crew, 'tifa')) yield s.say('tifa', "Then... Holy's already coming? Meteor will be stopped?");
    else if (C.has(crew, 'barret')) yield s.say('barret', "So Holy's comin'? Meteor's gonna get stopped?");
    yield s.say('Bugenhagen', "It should be so. And yet... I feel nothing moving. Holy is there, but held back, like water behind a dam.");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "Held back? By whom, Grandpa?");
    yield s.say('cloud', "......Sephiroth.");
    yield s.say('Bugenhagen', "Hoh... The one who called Meteor. His will lies at the bottom of the crater, and it smothers Holy before it can rise.\fSo long as Sephiroth stands, Holy cannot move.");
    yield s.say('cloud', "......Aeris. I'm sorry.\fI couldn't protect you. I couldn't even stop my own hands. And you still...");
    if (C.has(crew, 'tifa')) {
      yield s.say('tifa', "Cloud... She wouldn't want you to blame yourself. She knew what she was doing.\fShe'd want us to finish it.");
      yield s.say('cloud', "......Yeah.");
    }
    yield s.say('cloud', "She did her part. She's been waiting for us to do ours. We take down Sephiroth... and let Holy through.");
    if (C.has(crew, 'barret')) yield s.say('barret', "Damn straight! We bust through that barrier, beat Sephiroth senseless, an' Holy does the rest!");
    if (C.has(crew, 'cid')) yield s.say('cid', "Heh. About time we had a plan that don't involve stickin' ourselves on a rocket.");
    if (C.has(crew, 'yuffie')) yield s.say('yuffie', "Aeris did all that by herself... Man. Guess we'd better not mess this up, huh?");
    if (C.has(crew, 'vincent')) yield s.say('vincent', "......Her prayer is still out there. Let's not keep it waiting.");
    s.set('holy');
    C.dismiss(s, crew);
    s.remove('bugen');
    s.show('bugen', 11, 5, 'right');
    yield s.msg('Holy has been called — but Sephiroth is holding it back. Head back to the Highwind.');
  };

  // Leaving the chamber: Cait Sith (Reeve) picks up the alarm from Midgar.
  const ALERT_SPOTS = [[2, 6, 'right'], [7, 8, 'left'], [3, 5, 'down'], [8, 7, 'left'], [4, 10, 'up'], [2, 9, 'up']];
  FF7.story.c11a_diamondAlert = function* (s) {
    s.remove('bugen');
    s.spawn('bugen', 'bugenhagen', 7, 6, 'left', { name: 'Bugenhagen' });
    s.spawn('cait_e', 'caitsith', 4, 9, 'up', { name: s.name('caitsith') });
    const crew = C.gather(s, ALERT_SPOTS, ['barret', 'tifa', 'redxiii', 'cid', 'yuffie', 'vincent']);
    s.place('player', 3, 7, 'down');
    yield 10;
    yield s.emote('cait_e', '!!');
    yield s.say('caitsith', "Wh-whoa! Hang on! Somethin's comin' through on my end — Midgar's goin' crazy!");
    s.music('weaponraid');
    yield s.say('caitsith', "Somethin' huge just came up outta the sea! It's one o' them WEAPONs...\fAn' it's walkin' straight for Midgar!");
    yield s.fadeOut(30);
    yield s.movie('diamond_weapon', { text: 'The sea off Midgar boils.\nA colossal armored shape rises from the waves — Diamond WEAPON —\nand strides toward the city, every step shaking the shore.' });
    yield* C.cutaway(s, 'midgar2_meeting', 'cut', FF7.story.c11a_cutSisterRay, 'holy_capital_hall', 'from_gate');
    s.music('weaponraid');
    s.spawn('bugen', 'bugenhagen', 7, 6, 'left', { name: 'Bugenhagen' });
    s.spawn('cait_e', 'caitsith', 4, 9, 'up', { name: s.name('caitsith') });
    const crew2 = C.gather(s, ALERT_SPOTS, ['barret', 'tifa', 'redxiii', 'cid', 'yuffie', 'vincent']);
    s.place('player', 3, 7, 'down');
    yield s.fadeIn(30);
    if (s.isMember('barret')) {
      yield s.say('barret', "Reeve! Can't you do somethin'?! Get those people outta there!");
      yield s.say('caitsith', "Ah'm tryin'! Ah've been on at 'em to evacuate the slums since the thing surfaced...");
      yield s.say('barret', "Then why the hell are you still workin' for 'em?! Just quit already!");
      yield s.say('caitsith', "An' then who'd look out for Midgar? Who'd warn you lot?\fIf Ah walk out, there's nobody left in that buildin' who gives a damn about the people under the plate.");
      yield s.say('barret', "......");
      if (s.isMember('tifa')) yield s.say('tifa', "Barret... he's right. Marlene's safe because he stayed.");
      yield s.say('barret', "......Tch. Alright. Just this once, you're off the hook.");
    }
    yield s.say('cloud', "We're going to Midgar. Cid, get the Highwind ready.");
    if (s.isMember('cid')) yield s.say('cid', "Already on it!");
    yield s.say('Bugenhagen', "I'll ride along, if you'll have me. These old eyes want to see this through. Hoh hoh.");
    s.set('c11a_diamond_alert');
    s.set('c11a_capital_done');
    C.dismiss(s, crew2.concat(crew));
    s.remove('cait_e'); s.remove('bugen');
    yield s.msg('Diamond WEAPON is heading for Midgar. Fly the Highwind to Midgar!');
    yield s.goto('holy_capital_gate', 'from_hall');
  };

  // ------------------------------------------------------------------ the memory on the water
  const ALTAR = [
    "####################### ",
    "####################### ",
    "#~~~~~~~~~~~~~~~~~~~~~~ ",
    "#~~~~~~~~~____~~~~~~~~~ ",
    "#~~~|~~~~______~~~~|~~~ ",
    "#~~~~~~~~~____~~~~~~~~~ ",
    "#~|~~~~~~~~::~~~~~~~~~~ ",
    "#~~~~~~~~~~::~~~~~~~~|~ ",
    "#~~~~~~~~~~::~~~~~~~~~~ ",
    "#~~~~|~~~~~::~~~~~|~~~~ ",
    "#~~~~~~~~~~::~~~~~~~~~~ ",
    "#~~~~~~~~~~::~~~~~~~~~~ ",
    "           ::           ",
  ];
  FF7.defineMap('holy_altar_memory', {
    name: 'Forgotten Capital — Altar', area: 'Northern Continent', theme: 'city_ancients', music: 'aeris',
    // the altar of capital_altar, as a vision in blue light (refs 16-forgottencity01-06)
    look: { floor: ['#8a9ab4', '#8494ae'], floor3: ['#c0d0e8', '#b8c8e0'], wall: '#5a5a9a', wallTop: '#3a3a70', water: '#3a6ad0', wallH: 3.4,
      sky: ['#0a1040', '#3a58b8'], fog: { color: [0.2, 0.3, 0.7], near: 5, far: 16 } },
    camera: { yaw: 35, pitch: 50, dist: 11 },
    lights: [[11, 4, '#e0f0ff', 5]],
    hidePlayer: true,
    grid: ALTAR,
    heights: C.hm(ALTAR, [[9, 3, 6, 3, 1], [11, 6, 2, 6, 1], [4, 4, 1, 1, 1], [19, 4, 1, 1, 1], [5, 9, 1, 1, 1], [18, 9, 1, 1, 1], [2, 6, 1, 1, 1], [21, 7, 1, 1, 1]]),
    entries: { vision: [11, 10, 'up'] },
    exits: [],
  });

  // ================================================================== Bone Village: the dig
  const BONE = [
    "####################################",
    "#.A..A.....ddddddxddddddddddddxdddd#",
    "#..........dddddddddddddddddddddddd#",
    "#..o....B..ddddxddddddddddddddddddd#",
    "#..........dddddddddddddddddxdddddd#",
    "#..........dddddddddddddddddddddddd#",
    "#CCCCC^^CCCCCCCCCCCCCCCCCCCCCCCCCCC#",
    "#.....^^...........................#",
    "#..............hhhhhh..............#",
    "#...x..........hhhhhh.......R......#",
    "#..............hh+hhh..............#",
    "#..................................#",
    "#...A......x.........o......x......#",
    "#..................................#",
    "#..B...............................#",
    "#..................................#",
    "#......x..................x........#",
    "####....############################",
  ];
  const KEY_SPOT = [29, 2];
  const DIG_FIELD = [];
  BONE.forEach((row, y) => { for (let x = 11; x <= 34; x++) if (row[x] === 'd') DIG_FIELD.push([x, y]); });
  const faceToward = (x, y) => {
    const dx = KEY_SPOT[0] - x, dy = KEY_SPOT[1] - y;
    if (!dx && !dy) return null;
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  const digSpot = (x, y) => function* (s) {
    const mode = s.get('c11a_dig_mode');
    if (mode === 1) {
      const n = s.get('c11a_diggers');
      if (n >= 5) { yield s.msg("All five diggers are already in place. Talk to the foreman to light the bombs."); return; }
      const c = yield s.ask(null, 'Place a digger here?', ['Place him', 'Not here']);
      if (c !== 0) return;
      s.inc('c11a_diggers');
      s.setVar('c11a_dig_x' + (n + 1), x); s.setVar('c11a_dig_y' + (n + 1), y);
      s.spawn('digger' + (n + 1), 'worker' + (n + 2), x, y, 'down', { name: 'Digger' });
      s.sfx('confirm');
      if (n + 1 >= 5) yield s.msg("That's all five diggers. Talk to the foreman to light the bombs.");
      return;
    }
    const c = yield s.ask(null, 'Dig here?', ['Dig here', 'Keep looking']);
    if (c !== 0) return;
    const hit = Math.abs(x - KEY_SPOT[0]) <= 1 && Math.abs(y - KEY_SPOT[1]) <= 1;
    s.setVar('c11a_dig_mode', 0);
    s.setVar('c11a_dig_result', hit ? 1 : 2);
    if (hit) s.set('c11a_key_dug');
    yield s.msg("The spot is marked. The diggers will work through the night.");
    yield s.fadeOut(40);
    s.sfx('search');
    yield s.caption('The diggers work through the night...', { hold: 110, bg: '#000' });
    yield s.goto('holy_bone_dig', 'morning');
  };
  const foremanTalk = function* (s) {
    const mode = s.get('c11a_dig_mode');
    if (mode === 0) {
      yield s.say('Foreman', "Hey there. Lookin' for somethin' buried? This is Bone Village. Around here, we dig.");
      if (!s.flag('c11a_need_key')) {
        yield s.say('Foreman', "Come back when you know what you're after. Diggin' blind's a waste of good gil.");
        return;
      }
      const c = yield s.ask('Foreman', "A Cetra key, huh? That's a treasure dig. 100 gil and my boys'll find it for ya... if it's here.", ['Dig (100 gil)', 'Never mind']);
      if (c !== 0) return;
      if (!s.takeGil(100)) { yield s.say('Foreman', "Sorry, pal. No gil, no diggers."); return; }
      s.sfx('purchase');
      s.setVar('c11a_dig_mode', 1);
      s.setVar('c11a_diggers', 0);
      yield s.say('Foreman', "Alright! Here's how it works. Put my diggers anywhere on the upper terrace — up to five of 'em.\fThen come tell me, and I'll light the bombs. The boys'll turn and face whatever's buried nearby.\fWhere their lines cross, that's where you dig. Or skip all that, if you think you already know the spot.");
      yield s.msg("Face a spot of dirt on the upper terrace and press OK to place a digger.");
      return;
    }
    if (mode === 1) {
      const c = yield s.ask('Foreman', "Ready?", ['Light the bombs!', 'Skip to marking the spot', 'Not yet']);
      if (c === 2) return;
      if (c === 0) {
        const n = s.get('c11a_diggers');
        if (!n) { yield s.say('Foreman', "Ya haven't placed a single digger! Go on, up to the terrace."); return; }
        yield s.say('Foreman', "Fire in the hole!");
        for (let i = 0; i < 3; i++) { s.sfx('hit'); s.shake(4, 14); yield 16; }
        for (let i = 1; i <= n; i++) {
          const d = faceToward(s.get('c11a_dig_x' + i), s.get('c11a_dig_y' + i));
          if (d) s.face('digger' + i, d);
          s.emote('digger' + i, d ? '!' : '!!');
        }
        yield 40;
        yield s.say('Foreman', "See how my boys are facin'? Somethin's buried along those lines.\fNow go mark the spot you want dug. Face it and press OK.");
      } else {
        yield s.say('Foreman', "Feelin' lucky, eh? Go mark your spot on the terrace, then.");
      }
      s.setVar('c11a_dig_mode', 2);
      return;
    }
    yield s.say('Foreman', "Go on, mark the spot. Up on the terrace. Face the dirt and press OK.");
  };
  FF7.defineMap('holy_bone_dig', {
    name: 'Bone Village', area: 'Northern Continent', theme: 'desert', music: 'parochial',
    look: { floor: ['#b09a78', '#a89270'], dirt: ['#8a7050', '#826848'], wall: '#8a7a64', sky: ['#5a7aa8', '#c8c0b0'], fog: { color: [0.62, 0.62, 0.66], near: 12, far: 30 } },
    lights: [[17, 11, '#ffc080', 3]],
    grid: BONE,
    heights: C.hm(BONE, [[1, 1, 34, 5, 3], [6, 6, 2, 1, 2], [6, 7, 2, 1, 1]]),
    entries: { from_world: [5, 16, 'up'], morning: [6, 14, 'up'] },
    exits: [{ at: [4, 17, 4, 1], to: 'world', loc: 'bone_village' }],
    chests: [{ at: [8, 15], item: 'key_to_ancients', id: 'holy_bone_key', if: s => s.flag('c11a_key_dug') }],
    npcs: [
      { id: 'foreman', name: 'Foreman', model: { base: 'worker', top: '#8a6a3a', hairStyle: 'cap', build: 'big' }, at: [17, 11], dir: 'down', anim: 'sit',
        faceOnTalk: false, talk: foremanTalk },
      { id: 'olddigger', name: 'Old Digger', model: 'oldman3', at: [4, 4], dir: 'right',
        talk: function* (s) {
          yield s.say('Old Digger', "Cetra relics? Heh. Forty years I've been diggin' here. The good stuff's always on the upper terrace.\fThe east end, mostly. Where the old bones are biggest. The Cetra liked to bury things deep.");
        } },
      { id: 'digger_a', name: 'Digger', model: 'worker3', at: [25, 9], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Digger', "Some folks come for treasure, some come for the Lunar Harp. You're the first ones askin' after a key."); } },
      { id: 'digger_b', name: 'Digger', model: 'worker6', at: [9, 12], dir: 'up',
        talk: function* (s) { yield s.say('Digger', "Meteor, huh...? Heh. Might as well keep diggin'. If the sky falls, at least I'll already be in a hole."); } },
      { id: 'dig_kid', name: 'Boy', model: 'kid4', at: [30, 14], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Boy', "My dad says they found a whole giant's skull up there once! I'm gonna find two."); } },
    ],
    triggers: DIG_FIELD.map(([x, y]) => ({ at: [x, y], on: 'talk', if: s => s.get('c11a_dig_mode') > 0, run: digSpot(x, y) }))
      .concat([{ at: [28, 9], on: 'talk', run: function* (s) { yield s.msg("A bleached skull, bigger than a house. Whatever it belonged to walked the Planet long before people did."); } }]),
    onLoad: function (s) {
      if (s.entry() !== 'morning') { s.setVar('c11a_dig_mode', 0); s.setVar('c11a_diggers', 0); }
    },
    onEnter: function* (s) {
      if (s.entry() !== 'morning' || !s.get('c11a_dig_result')) return;
      const r = s.get('c11a_dig_result');
      s.setVar('c11a_dig_result', 0);
      yield s.fadeIn(30);
      if (r === 1) {
        yield s.say('Foreman', "Mornin'! Hey, you got lucky — the boys found somethin' real strange down there.\fLooks like a Cetra piece, alright. It's in the chest by the entrance.");
      } else {
        yield s.say('Foreman', "Mornin'. Nothin' down there but old bones this time, I'm afraid.\fWanna try another spot? It's 100 gil a dig.");
      }
    },
  });

  // ================================================================== the Northern Crater rim
  const RIM = [
    "XXXXXX                  XXXXXX",
    "XXXX                      XXXX",
    "XX                          XX",
    "X                            X",
    "X                            X",
    "XRCCCCCCCCCCCCCCCCCCCCCCCCCCRX",
    "XR..........................RX",
    "X.....R..............R.......X",
    "X............................X",
    "X..nn........................X",
    "X.......nn..........nnn......X",
    "X............................X",
    "XXXXXXXXXXXX......XXXXXXXXXXXX",
    "            ......            ",
  ];
  FF7.defineMap('holy_crater_rim', {
    name: 'Northern Crater — Rim', area: 'Northern Crater', theme: 'crater', music: 'northcave',
    look: { floor: ['#6a6a78', '#646472'], snow: ['#c8ccd8', '#c0c4d0'], sky: ['#04040c', '#1a1a34'], fog: { color: [0.08, 0.08, 0.14], near: 9, far: 26 } },
    lights: [[15, 1, '#60ffb0', 7], [15, 8, '#a0a0c0', 3]],
    grid: RIM,
    entries: { from_world: [15, 11, 'up'] },
    exits: [{ at: [12, 13, 6, 1], run: function* (s) { yield s.world({ resume: true }); } }],
    triggers: [
      { at: [2, 5, 26, 1], on: 'talk', run: function* (s) { yield s.msg("The crater drops away into darkness. Far below, green light pulses like a heartbeat."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c11a_hojo_news')) return;
      yield* FF7.story.c11a_craterNews(s);
    },
  });

  FF7.story.c11a_craterNews = function* (s) {
    const crew = C.gather(s, [[13, 9, 'up'], [17, 9, 'up'], [11, 10, 'up'], [19, 10, 'up'], [9, 9, 'up'], [21, 9, 'up'], [15, 10, 'up']]);
    const hasCait = C.has(crew, 'caitsith');
    if (!hasCait) s.spawn('caitsith', 'caitsith', 14, 10, 'up', { name: s.name('caitsith') });
    yield s.move('player', 15, 7);
    yield s.cam(15, 2, 60, { dist: 13, pitch: 34 });
    yield 30;
    yield s.say('cloud', "......The barrier's gone.");
    if (C.has(crew, 'cid')) yield s.say('cid', "That Shinra gun blew a hole clean through the #$%&! thing. From all the way over in Midgar!");
    if (C.has(crew, 'redxiii')) yield s.say('redxiii', "Nothing stands between us and Sephiroth now.");
    s.camFollow(30);
    yield s.emote('caitsith', '!!');
    yield s.say('caitsith', "Hold on! Somethin's wrong in Midgar...\fThe Sister Ray's still drawin' power. All the reactors are still feedin' it — an' the cannon's already fired!");
    yield s.say('cloud', "Who's controlling it?");
    yield s.say('caitsith', "......Hojo. He's locked himself up top an' rerouted the whole grid.\fIf that cannon keeps chargin' with nowhere to fire, it's gonna blow. An' it'll take Midgar with it!");
    yield* C.cutaway(s, 'midgar2_meeting', 'cut', FF7.story.c11a_cutReeveArrested, 'holy_crater_rim', 'from_world');
    s.music('northcave');
    const crew2 = C.gather(s, [[13, 9, 'up'], [17, 9, 'up'], [11, 10, 'up'], [19, 10, 'up'], [9, 9, 'up'], [21, 9, 'up'], [15, 10, 'up']]);
    if (!C.has(crew2, 'caitsith')) s.spawn('caitsith', 'caitsith', 14, 10, 'up', { name: s.name('caitsith') });
    s.place('player', 15, 8, 'down');
    yield s.fadeIn(30);
    yield s.say('caitsith', "...Ah've been kicked out o' the buildin'. Scarlet an' Heidegger are goin' after Hojo themselves.\fAnd they'll shoot anythin' that moves on the way. Please... Midgar's got nobody else.");
    if (s.isMember('barret')) yield s.say('barret', "Marlene's down there! We ain't lettin' that lunatic blow up the whole damn city!");
    if (s.isMember('vincent')) yield s.say('vincent', "......Hojo. I've let him live far too long.");
    yield s.say('cloud', "Sephiroth will have to wait. We're going to Midgar to stop Hojo.");
    if (s.isMember('cid')) yield s.say('cid', "Can't land the Highwind anywhere near that cannon without gettin' shot down. Guess we're jumpin'!");
    s.set('c11a_hojo_news');
    C.dismiss(s, crew2);
    s.remove('caitsith');
    yield s.msg('Hojo has seized the Sister Ray. Fly the Highwind over Midgar!');
  };
})();

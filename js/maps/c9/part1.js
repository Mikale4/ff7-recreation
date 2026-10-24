// Chapter 9 (part 1) — Icicle Inn: the party arrives from Corral Valley, Elena of the Turks runs into
// Cloud, Professor Gast's house (the three videotapes: the Cetra, WEAPON, and baby Aeris; the Turbo
// Ether downstairs), the inn (X-Potion upstairs), the weapon shop, the snowman house (Glacier Map,
// Hero Drink, Vaccine), the boy who lends his snowboard, and the ride down to the Great Glacier.
// Also registers the `icicle_inn` world link for later visits. (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Shared chapter helpers live in FF7.c9 (used by parts 2-4).
// Flags: c9_arrived, c9_elena, c9_elena_dodged, c9_gast_seen, c9_tape1..3, c9_tapes_talk, c9_snowboard_tips,
// c9_rode (first ride), c9_mapwall (snow-house map examined).
(function () {
  const C9 = FF7.c9 = FF7.c9 || {};

  // ------------------------------------------------------------------ shared helpers
  // Disc 2 roster (Aeris is gone). Cloud is handled separately.
  C9.MEMBERS = ['tifa', 'barret', 'redxiii', 'cid', 'caitsith', 'yuffie', 'vincent'];
  C9.mates = (s) => C9.MEMBERS.filter(id => s.inParty(id) && id !== s.leader());
  // Spawn the leader's companions as actors at the given spots; returns their ids.
  C9.popOut = function (s, spots) {
    const ids = C9.mates(s).slice(0, spots.length);
    ids.forEach((id, i) => { const p = spots[i]; s.spawn(id, id, p[0], p[1], p[2] || 'down', { name: s.name(id) }); });
    return ids;
  };
  C9.tuckIn = (s, ids) => ids.forEach(id => s.remove(id));
  // The first companion in the party with a line speaks it.
  C9.anyone = function* (s, lines) {
    for (const [id, text] of lines) if (s.inParty(id) && id !== s.leader()) { yield s.say(id, text); return id; }
    return null;
  };
  // Every companion in the party with a line speaks it.
  C9.each = function* (s, lines) {
    for (const [id, text] of lines) if (s.inParty(id) && id !== s.leader()) yield s.say(id, text);
  };
  C9.counter = (at, run) => ({ at, on: 'talk', run });
  C9.ok = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win || r.success));
  // Cloud is still with the party (Disc 2, before the crater).
  C9.cloudHere = (s) => !s.flag('cloud_missing');

  // refs 11-gaeacliff09, 15: dark log houses with snow-laden roofs and warm windows among tall snowy pines,
  // in the blue light of the snowfields
  const SNOW_TOWN = { floor: ['#e6ebf2', '#dde3ec'], floor2: ['#b4bccb', '#aab3c2'], wall: '#8a93a4', trim: '#5a4030', floor3: ['#5e4430', '#58402c'], wallH: 2.4,
    wallTop: '#eef2f8', roof: '#e8eef6', window: '#f2d68a', grass: ['#5a7a70', '#54746a'], ambient: [0.5, 0.54, 0.64], light: [0.72, 0.78, 0.92],
    sky: ['#24344e', '#9aaec4'], fog: { color: [0.55, 0.62, 0.74], near: 10, far: 26 } };
  // refs 11-gaeacliff10, 12: warm timber rooms under lamplight, patterned rugs, seen diagonally from above
  const HOUSE = { wall: '#8a6a48', trim: '#3a2616', wallTop: '#2a1c10', floor: ['#6e4e30', '#684a2c'], carpet: ['#8a3a2a', '#843428'],
    ambient: [0.5, 0.44, 0.38], light: [0.9, 0.78, 0.6] };
  const HOUSE_CAM = { yaw: 35, pitch: 58, dist: 10 };

  // ================================================================== the village
  FF7.world.link('icicle_inn', { map: 'icicle_gate', entry: 'from_world' });

  FF7.defineMap('icicle_gate', {
    name: 'Icicle Inn', area: 'Icicle Inn', theme: 'snow', music: 'snow', look: SNOW_TOWN,
    camera: { pitch: 46, dist: 12, yaw: -15 },
    grid: [
      "%TTT%TTT%TTT%TTT%T::::TT%TTT%TTT%TTT",
      "TT.hhhhhhh.T......::::....hhhhhhhh.T",
      "T..whhhhhw........::::....whhhhhhw.T",
      "T..hwhhhwh....T...::::..T.hwhhhwwh.%",
      "%.....+...........::::.......+.....T",
      "Tl....::::::::::::::::::::::::....lT",
      "T..T.........:hhhhhhhh:.......T....T",
      "T............:whhhhhhw:............%",
      "%..=====.....:hwhhhhwh:.....=====..T",
      "T............::::+:::::............T",
      "T=============^^^^^^^^=============T",
      "T.T..........::::::::::.........T..%",
      "%..hhhhhhh....::::::::....hhhhhhh..T",
      "T..whhhhhw....::::::::....whhhhhw..T",
      "T..hwhhhwh....::::::::....hwhhhwh..T",
      "T.....+.......::::::::.......+.....%",
      "%.l...::::::::::::::::::::::::..lQ.T",
      "TT................::::.......T.....T",
      "T....T..........::::::::.........T.T",
      "T.............::::::::::...........%",
      "%TT.....T.....::::::::.....T.....TTT",
      "T%TTT%TTT%TTT%::::::::TTT%TTT%TTT%TT",
    ],
    heights: [
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "333333333333333333333333333333333333",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    legend: { 'Q': 'statue' },
    // dark log houses under steep gables thick with snow, chimneys poking through, warm lamplit windows
    // (placed as `w` tiles, so none lands on a door); the boy's house in the middle and the snowman house
    // turn their gable ends to the road (ref 11-gaeacliff15)
    buildings: [
      { at: [3, 1, 7, 3], h: 2.2, col: '#5a4432', roof: '#e6ecf4', top: 'gable', ridge: 'x', rise: 1.2, over: 0.25, chimney: true, win: false },
      { at: [26, 1, 8, 3], h: 2.4, col: '#64503a', roof: '#e8eef6', top: 'gable', ridge: 'x', rise: 1.25, over: 0.25, chimney: true, win: false },
      { at: [14, 6, 8, 3], h: 2.2, col: '#5e4430', roof: '#e4eaf2', top: 'gable', ridge: 'z', rise: 1.3, over: 0.25, win: false },
      { at: [3, 12, 7, 3], h: 2.1, col: '#584230', roof: '#e6ecf4', top: 'gable', ridge: 'x', rise: 1.15, over: 0.25, win: false },
      { at: [26, 12, 7, 3], h: 2.1, col: '#6a5038', roof: '#e8eef6', top: 'gable', ridge: 'z', rise: 1.2, over: 0.25, chimney: true, win: false },
    ],
    entries: {
      from_valley: [18, 19, 'up'], from_world: [17, 19, 'up'], from_gast: [6, 5, 'down'], from_inn: [29, 5, 'down'],
      from_kid: [17, 10, 'down'], from_weapons: [6, 16, 'down'], from_snowhouse: [29, 16, 'down'], from_cliff: [19, 1, 'down'],
    },
    exits: [
      { at: [18, 0, 4, 1], to: 'icicle_cliff', entry: 'from_town' },
      { at: [6, 4, 1, 1], to: 'icicle_gast', entry: 'from_town', sfx: 'door' },
      { at: [29, 4, 1, 1], to: 'icicle_inn', entry: 'from_town', sfx: 'door' },
      { at: [17, 9, 1, 1], to: 'icicle_kid', entry: 'from_town', sfx: 'door' },
      { at: [6, 15, 1, 1], to: 'icicle_weapons', entry: 'from_town', sfx: 'door' },
      { at: [29, 15, 1, 1], to: 'icicle_snowhouse', entry: 'from_town', sfx: 'door' },
      { at: [14, 21, 8, 1], to: 'world', loc: 'icicle_inn' },
    ],
    npcs: [
      { id: 'gast_neighbor', name: 'Man', model: 'man5', at: [9, 5], dir: 'left',
        talk: function* (s) { yield s.say('Man', "That house up there? A scientist lived in it. Professor... Gast, I think. He had a quiet wife who never said where she came from.\fOne winter, Shinra men came up the road. After that the house was just... empty. Nobody's gone in since."); } },
      { id: 'old_climber', name: 'Old Man', model: 'oldman3', at: [32, 6], dir: 'left',
        talk: function* (s) { yield s.say('Old Man', "Past the cliff lies the Great Glacier. Past the glacier, Gaea's Cliff. And past that... nobody's come back to tell.\fMy grandfather used to say a star fell up there, long before there were towns in the north."); } },
      { id: 'robe_woman', name: 'Woman', model: 'woman6', at: [24, 11], dir: 'down', wander: 2,
        talk: function* (s) {
          if (s.flag('meteor')) { yield s.say('Woman', "That red thing in the sky... it gets bigger every night. Is this the end of the world?"); return; }
          yield s.say('Woman', "A few days ago a line of men in black robes shuffled through, heading north. They didn't talk, didn't eat... just kept walking into the snow.\fAnd yesterday, people in Shinra suits. What is going on out there?");
        } },
      { id: 'snowkid1', name: 'Boy', model: 'kid3', at: [9, 18], dir: 'right', wander: 2,
        talk: function* (s) { yield s.say('Boy', "Snowball fight! You're on her team, okay? ...Heyyy, no fair, you're too tall!"); } },
      { id: 'snowkid2', name: 'Girl', model: 'girl2', at: [13, 19], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Girl', "I made the snowman by the big house! He needs a name. How about... Mister Frosty? ...Mister Frostington!"); } },
      { id: 'trader', name: 'Traveler', model: 'man8', at: [26, 17], dir: 'up',
        talk: function* (s) { yield s.say('Traveler', "I came up here looking for the Chocobo Sage. Lives east of the village, in a house between the mountains.\fThey say he knows everything about chocobos. Everything!"); } },
    ],
    objects: [
      { at: [33, 16], talk: function* (s) { yield s.msg('A lopsided snowman with a bucket for a hat. Somebody gave it a very stern face.'); } },
    ],
    triggers: [
      { id: 'elena', at: [15, 1, 9, 5], once: true, if: s => !s.flag('c9_elena') && C9.cloudHere(s),
        run: function* (s) { yield* elenaScene(s); } },
    ],
    onEnter: function* (s) {
      if (s.entry() === 'from_valley' && !s.flag('c9_arrived')) yield* arrival(s);
    },
  });

  // ------------------------------------------------------------------ arrival from Corral Valley
  function* arrival(s) {
      s.set('c9_arrived');
      s.music('snow');
      const ids = C9.popOut(s, [[17, 20, 'up'], [19, 20, 'up']]);
      yield s.move('player', 18, 17);
      yield s.say('cloud', "(Icicle Inn... The last village before the ice.)");
      yield* C9.each(s, [
        ['tifa', "Brr... My fingers are already numb. Cloud, you're not even wearing a coat."],
        ['barret', "Damn, it's cold! My gun-arm's gonna freeze solid up here!"],
        ['redxiii', "The wind smells of old ice. Whatever Sephiroth is seeking, his trail leads north... past this village."],
        ['cid', "Tch. Can't even keep a smoke lit in this wind."],
        ['yuffie', "Sooo cold... Why couldn't Sephiroth run off somewhere with a beach? Just once?"],
        ['caitsith', "Brrr! Lucky I'm stuffed with nice warm padding. ...What? It's a joke!"],
        ['vincent', "...Snow. It covers a great many things."],
      ]);
      ids.forEach(id => s.face(id, 'player'));
      yield s.say('cloud', "Let's look around. Someone here has to know the way across the glacier.");
      ids.forEach(id => s.run(id, 18, 21, { noWait: true }));
      yield 40;
      C9.tuckIn(s, ids);
  }
  FF7.story.c9_arrival = arrival;

  // ------------------------------------------------------------------ Elena
  function* elenaScene(s) {
    s.set('c9_elena');
    yield s.move('player', 19, 5);
    yield s.face('player', 'up');
    s.music('turks');
    s.spawn('elena', 'elena', 19, 0, 'down', { name: 'Elena' });
    yield s.run('elena', 19, 4);
    s.sfx('hit'); s.shake(3, 16);
    s.anim('elena', 'hurt'); s.anim('player', 'hurt');
    yield 20;
    s.anim('elena', 'lie');
    s.stopAnim('player');
    yield 30;
    s.stopAnim('elena');
    yield s.say('elena', "Owww... Hey! Watch where you're— ...Wait.");
    yield s.emote('elena', '!!');
    yield s.say('elena', "YOU!! It's you!");
    yield s.say('cloud', "...A Turk.");
    yield s.say('elena', "Elena! Of the Turks! Remember it!\fBecause of you... Tseng... Tseng is...!");
    yield s.say('cloud', "We never laid a hand on Tseng. It was Sephiroth, in the Temple.");
    yield s.say('elena', "Don't you dare! Tseng was the only one who ever took me seriously... He was...\f...I don't care who swung the sword! Somebody's paying for it, and that somebody is YOU!");
    s.anim('elena', 'punch');
    const c = yield s.ask(null, 'Elena winds up a punch!', ['Dodge!', 'Brace yourself']);
    if (c === 0) {
      s.set('c9_elena_dodged');
      yield s.move('player', 20, 5, { speed: 0.09 });
      yield s.move('elena', 19, 5, { speed: 0.09 });
      s.anim('elena', 'lie'); s.sfx('hit');
      yield s.say('elena', "Waaah?! ...Pfft! Pbbbt! Snow! Snow in my mouth!");
      s.stopAnim('elena');
      yield s.face('elena', 'player');
      yield s.say('elena', "Th-that didn't count! I slipped!");
    } else {
      s.sfx('hit'); s.shake(4, 20);
      s.anim('player', 'hurt');
      yield 16;
      s.anim('player', 'kneel');
      yield s.say('elena', "Hah! How'd that feel?! That one was for Tseng!");
      yield s.say('cloud', "(...She hits harder than she looks.)");
      s.stopAnim('player');
    }
    yield s.say('elena', "You won't get away with this. The President's already on his way north, and when he gets to the Promised Land—\f...Ah. Um. I didn't say that. You didn't hear anything! Forget it!");
    yield s.run('elena', [[22, 5], [22, 9], [18, 10], [18, 20]]);   // round the house in the middle
    s.remove('elena');
    s.music('snow');
    const ids = C9.popOut(s, [[17, 5, 'right'], [21, 5, 'left']]);
    yield* C9.anyone(s, [
      ['barret', "Heh. That Turk's got guts, I'll give her that. Runs her mouth, too."],
      ['tifa', "She lost someone important... I know how that feels. Even if he was a Turk."],
      ['redxiii', "She spoke of the President. Rufus is heading north as well."],
      ['cid', "Loudmouth kid. Sounds like the whole damn company's comin' up here."],
      ['yuffie', "Whoa, she just blabbed everything! Some secret agent."],
    ]);
    yield s.say('cloud', "(Rufus is going north... Shinra's chasing the Promised Land. And Sephiroth.)");
    C9.tuckIn(s, ids);
  }

  // ================================================================== Professor Gast's house
  const GAST_GRID = [
    "######################",
    "#kk.q.MZZM...F....kk.#",
    "#....................#",
    "#..........t.c.......#",
    "#..........t.........#",
    "#.b..................#",
    "#.b...............^^.#",
    "#.................^^.#",
    "##########+###########",
  ];

  function* tape(s, n) {
    s.set('c9_tape' + n);
    yield s.msg(n === 3 ? 'The tape is labelled in neat, careful handwriting:\n"Our daughter."' : `Tape ${n}. The label reads:\n"Interview with Ifalna, No. ${n}"`);
    yield s.fadeOut(24);
    s.music('none');
    s.hide('player');
    yield s.caption(n === 3 ? '[ PLAY ]\n\nThe picture wavers, then steadies.\nThe same room, many years ago.' : '[ PLAY ]\n\nThe picture wavers, then steadies.\nThe same room. A woman sits at the table.', { hold: 110, bg: '#000' });
    if (n === 1) yield* tape1(s);
    else if (n === 2) yield* tape2(s);
    else yield* tape3(s);
    yield s.fadeOut(30);
    ['v_gast', 'v_ifalna', 'v_hojo', 'v_sold1', 'v_sold2'].forEach(id => s.remove(id));
    s.show('player', 8, 2, 'up');
    s.music('snow');
    yield s.fadeIn(30);
    if (s.flag('c9_tape1') && s.flag('c9_tape2') && s.flag('c9_tape3') && !s.flag('c9_tapes_talk')) yield* tapesTalk(s);
  }
  function interview(s) {
    s.spawn('v_ifalna', 'ifalna', 12, 4, 'down', { name: 'Ifalna' });
    s.spawn('v_gast', 'gast', 12, 7, 'up', { name: 'Prof. Gast' });
  }
  function* tape1(s) {
    interview(s);
    s.music('cry');
    yield s.fadeIn(30);
    yield s.say('v_gast', "There, it's recording. Whenever you're ready, Ifalna. I'd like to hear about your people... the Cetra.");
    yield s.say('v_ifalna', "Long ago... some two thousand years... my people heard the Planet in agony.\fThe first to hear it were the clans who lived here, in the far north. In our tongue, this land was the Knowlespole.");
    yield s.say('v_gast', "You once told me you can 'read' the Planet. What does that feel like?");
    yield s.say('v_ifalna', "It's difficult to describe... Like speaking with someone, without any words at all.\fThe Planet told us that something had crashed down out of the sky and left a terrible wound.");
    yield s.say('v_gast', "And your people tried to mend it.");
    yield s.say('v_ifalna', "Thousands of them, working as one. But the wound was too deep for them. Only the Planet could close it, and it would take ages.\fEverything it gathered to heal itself was drawn out of the land around the wound. That is why nothing here ever thaws.");
    yield s.say('v_gast', "Ifalna... Shall we take a short rest?");
    yield s.say('v_ifalna', "I'm fine... While my people were making ready to leave the land they loved... it came to them.\fIt wore the faces of the dead. Lost mothers. Lost brothers. It walked among them as family.\fThat was the Calamity from the Skies, the thing that had wounded the Planet. It won their trust... and then it gave them a sickness.\fOne by one they lost their minds and became monsters. And then it went on to the next clan... and the next...");
    yield s.say('v_gast', "...Let's stop there for today. You've gone quite pale.");
  }
  function* tape2(s) {
    interview(s);
    s.music('cry');
    yield s.fadeIn(30);
    yield s.say('v_gast', "Today I'd like to ask about something you mentioned before. 'WEAPON'.");
    yield s.say('v_ifalna', "Yes, Professor. The creature you once took for one of us... it has a name. Jenova. Jenova is the Calamity from the Skies.\fThe Planet knew it had to be destroyed. While Jenova exists, the wound can never fully close.");
    yield s.say('v_gast', "So WEAPON is... something the Planet made for itself? A defense?");
    yield s.say('v_ifalna', "Yes. But it was never called upon. A few of my people who survived managed to defeat Jenova and seal it away.\fAnd so WEAPON was never needed.");
    yield s.say('v_gast', "Then it's gone?");
    yield s.say('v_ifalna', "No. It can't simply vanish. It sleeps somewhere on the Planet, in case Jenova ever wakes.\fThe Planet hasn't finished healing. It is still keeping watch.");
    yield s.say('v_gast', "Where does it sleep?");
    yield s.say('v_ifalna', "I can't tell... The Planet's voice reaches me so faintly now. The world has changed so much.\fBut I think it is watching everything that happens... very closely.");
    yield s.say('v_gast', "...Thank you, Ifalna. That's enough for today.");
  }
  function* tape3(s) {
    s.spawn('v_ifalna', 'ifalna', 3, 5, 'left', { name: 'Ifalna' });
    s.spawn('v_gast', 'gast', 6, 6, 'left', { name: 'Prof. Gast' });
    s.music('aeris');
    yield s.fadeIn(30);
    yield s.caption('"Our daughter — ten days old."', { hold: 90, bg: 'rgba(0,0,0,0.6)' });
    yield s.say('v_ifalna', "Professor? ...I mean, darling. What are you fiddling with over there?");
    yield s.say('v_gast', "The camera's being stubborn again. I want a recording of our girl asleep. Just look at her... like a little angel.");
    yield s.say('v_ifalna', "We haven't even chosen her name yet! The filming can wait.");
    yield s.say('v_gast', "Oh, I chose that long ago. A daughter would be Aeris. It's decided!");
    yield s.say('v_ifalna', "You decided all by yourself? ...Aeris. It's beautiful. Honestly, I'm surprised that absent-minded head of yours came up with it.");
    yield s.say('v_gast', "Isn't it? Now, where did I put the tape...");
    yield s.fadeOut(20);
    yield s.caption('"Our daughter — twenty days old."', { hold: 90, bg: '#000' });
    s.place('v_gast', 5, 7, 'up');
    yield s.fadeIn(20);
    yield s.say('v_ifalna', "Recording her again? You only just finished yesterday!");
    yield s.say('v_gast', "She'll only be this small once. Don't you want to remember every single day?");
    yield s.say('v_ifalna', "If you spoil her like this, she'll never grow up strong...\fShe isn't like other children. Sometimes I'm afraid of what the world will do to her.");
    yield s.move('v_gast', 4, 6);
    yield s.face('v_gast', 'v_ifalna');
    yield s.say('v_gast', "Don't say that. Whatever happens, I'll keep you both safe. You and Aeris are everything I have in this world.");
    yield s.say('v_ifalna', "...Hearing you say that... If I'd never met you...");
    s.sfx('door');
    yield 30;
    yield s.say('v_gast', "Someone at the door? Of all the moments...");
    yield s.say('v_ifalna', "I'll send them off. ...!! It's... it's them!");
    s.music('none');
    s.spawn('v_hojo', 'hojo', 10, 7, 'up', { name: 'Hojo' });
    s.spawn('v_sold1', 'soldier', 9, 7, 'up', { name: 'Shinra Soldier' });
    s.spawn('v_sold2', 'soldier', 11, 7, 'up', { name: 'Shinra Soldier' });
    yield s.move('v_hojo', 8, 5);
    s.music('trail');
    yield s.say('v_hojo', "Heh heh heh... Found you at last, Ifalna. Or should I say... the Cetra.\fAnd Professor Gast. It's been quite some time.");
    yield s.say('v_gast', "Hojo...! How did you find us?");
    yield s.say('v_hojo', "It wasn't easy. Two years I spent hunting for you. That's how badly I want my new specimens.");
    yield s.say('v_gast', "Specimens...? You can't mean Aeris!");
    yield s.say('v_hojo', "Aeris, is it? How charming.");
    yield s.say('v_gast', "Get out, Hojo. I'm through with Shinra. Leave this house. Now.");
    s.anim('v_ifalna', 'kneel');
    yield s.say('v_ifalna', "Please! Aeris has nothing to do with this! It's me you want, isn't it?");
    yield s.say('v_gast', "Ifalna, no!");
    yield s.say('v_hojo', "Oh, I'll be needing all three of you. Surely you of all people understand, Professor. Think what we could do for the future of this Planet!");
    yield s.say('v_gast', "Don't worry, Ifalna. I'll deal with this.");
    yield s.say('v_hojo', "Now, now. No struggling, please. I'd hate to damage my precious sample.");
    yield s.face('v_hojo', 'down');
    yield s.say('v_hojo', "...Hm? What's this contraption? A camera? ...Destroy it.");
    s.anim('v_sold1', 'shoot');
    s.sfx('shot');
    s.flash('#ffffff', 6);
    yield s.fadeOut(4);
    yield 40;
    yield s.say('v_hojo', "Careful with the woman! Heh heh heh...", { pos: 'middle' });
    yield s.say('v_ifalna', "Professor! What are you doing—", { pos: 'middle' });
    yield s.say('v_gast', "Ifalna! Take Aeris and RUN!!", { pos: 'middle' });
    s.sfx('shot2');
    yield 40;
    yield s.say('v_ifalna', "No... NO!! Darling!!", { pos: 'middle' });
    yield 30;
    yield s.say('v_hojo', "Bring the child as well.\f...Hm? Tapes? The Ancients... WEAPON...? Heh heh heh... A treasure trove. My thanks, Professor.", { pos: 'middle' });
    yield 40;
    yield s.caption('The tape hisses into static.', { hold: 90, bg: '#000' });
  }
  FF7.story.c9_tapeScene = function* (s, n) { yield* tape(s, n || 3); };
  function* tapesTalk(s) {
    s.set('c9_tapes_talk');
    const ids = C9.popOut(s, [[6, 3, 'up'], [11, 2, 'left']]);
    const here = C9.cloudHere(s);
    if (here) yield s.say('cloud', "(Aeris... You were born here. In this house.)");
    yield* C9.each(s, [
      ['tifa', "Her father died trying to protect her... and her mother gave up everything to get her away from Shinra."],
      ['barret', "Hojo... That bastard's been wreckin' lives since before any of us were born."],
      ['redxiii', "Jenova, the Calamity from the Skies... and the wound where it fell. Here, in the north."],
      ['cid', "So that's the big secret. Somethin' crash-landed up here way back, and Sephiroth's goin' to dig it up."],
      ['caitsith', "Shinra knew about all of this, and kept it buried... I-I didn't know, honest."],
      ['yuffie', "...Man. Aeris never told us any of this. Maybe she didn't even know."],
      ['vincent', "Hojo... Even then. Some sins do not fade with time."],
    ]);
    if (here) yield s.say('cloud', "The Promised Land Sephiroth keeps talking about... It's the wound. The crater past the glacier.\fThat's where he's going. And that's where we'll stop him.");
    C9.tuckIn(s, ids);
  }

  FF7.defineMap('icicle_gast', {
    name: "Gast's House", area: 'Icicle Inn', theme: 'house', music: 'snow',
    look: Object.assign({}, HOUSE, { ambient: [0.44, 0.4, 0.38] }),   // ref 11-gaeacliff10
    camera: HOUSE_CAM,
    grid: GAST_GRID,
    entries: { from_town: [10, 7, 'up'], from_b1: [17, 6, 'left'] },
    exits: [
      { at: [10, 8, 1, 1], to: 'icicle_gate', entry: 'from_gast', sfx: 'door' },
      { at: [18, 6, 2, 2], to: 'icicle_gast_b1', entry: 'from_gast' },
    ],
    objects: [
      { at: [1, 1], talk: function* (s) { yield s.msg('Journals on the Cetra, bound in cracked leather. Many of the spines carry the name "Gast".'); } },
      { at: [18, 1], talk: function* (s) { yield s.msg('Books on Planetology. Some are marked with a woman\'s handwriting: little notes, and pressed flowers.'); } },
      { at: [2, 5], talk: function* (s) { yield s.msg('A small crib, built by hand. The blanket inside is folded neatly, as if someone meant to come back for it.'); } },
      { at: [13, 1], talk: function* (s) { yield s.msg('A cold fireplace. The ashes have not been disturbed in years.'); } },
    ],
    triggers: [
      C9.counter([6, 1, 4, 1], function* (s) {
        const labels = ['Tape 1: "Interview No. 1"', 'Tape 2: "Interview No. 2"', 'Tape 3: "Our daughter"', 'Leave it'];
        const c = yield s.ask(null, 'An old video deck and a monitor. Beside it, three tapes.\nWatch which one?', labels);
        if (c >= 3) return;
        yield* tape(s, c + 1);
      }),
    ],
    onEnter: function* (s) {
      if (s.flag('c9_gast_seen') || !C9.cloudHere(s)) return;
      s.set('c9_gast_seen');
      yield s.say('cloud', "(This place... It's like time stopped the day everyone left.)");
      yield* C9.anyone(s, [
        ['tifa', "Look at all these books... Someone lived here who cared about the Ancients. A lot."],
        ['redxiii', "Research on the Cetra. And a crib... A family lived here."],
        ['barret', "Place gives me the creeps. Like somebody's still watchin'."],
      ]);
    },
  });

  FF7.defineMap('icicle_gast_b1', {
    name: "Gast's House - Study", area: 'Icicle Inn', theme: 'house', music: 'snow',
    look: Object.assign({}, HOUSE, { wall: '#6a7a6a', floor: ['#5e4630', '#58422c'], ambient: [0.42, 0.4, 0.38] }),   // ref 11-gaeacliff12
    camera: HOUSE_CAM,
    grid: [
      "######################",
      "#kkkk..DDDD....kk.qq.#",
      "#....................#",
      "#.t.c........Z.......#",
      "#.t..................#",
      "#.........j..........#",
      "#.................^^.#",
      "#.................^^.#",
      "######################",
    ],
    entries: { from_gast: [16, 6, 'left'] },
    exits: [{ at: [18, 6, 2, 2], to: 'icicle_gast', entry: 'from_b1' }],
    items: [{ at: [2, 7], item: 'turbo_ether', id: 'icicle_gast_turbo_ether' }],
    objects: [
      { at: [7, 1], talk: function* (s) { yield s.msg('A desk buried in papers. One page is headed "Project: J" — the rest has been torn out.'); } },
      { at: [9, 1], talk: function* (s) { yield s.msg('A faded photograph: a dark-haired woman holding a baby, and a man with a crooked grin trying to squeeze into the frame.'); } },
      { at: [13, 3], talk: function* (s) { yield s.msg('An old terminal. The screen is dead, the keyboard furred with frost.'); } },
      { at: [2, 1], talk: function* (s) { yield s.msg('"On the Cetra and the Promised Land." "Mako Energy and the Lifestream." "Specimen J: excavation notes, Mt. Nibel."'); } },
    ],
  });

  // ================================================================== the inn
  const innTalk = function* (s) { yield s.inn(100, { who: 'Innkeeper', text: "Welcome to Icicle Inn. Nothing beats a warm bed on a night like this. 100 gil?" }); };
  FF7.defineMap('icicle_inn', {
    name: 'Icicle Inn - Inn', area: 'Icicle Inn', theme: 'house', music: 'snow', look: HOUSE, camera: HOUSE_CAM,
    grid: [
      "######################",
      "#.q..k....F.......^^.#",
      "#DDDD.............^^.#",
      "#....................#",
      "#.......t.c....t.c...#",
      "#.......t......t.....#",
      "#j..................j#",
      "##########+###########",
    ],
    entries: { from_town: [10, 6, 'up'], from_2f: [17, 3, 'left'] },
    exits: [
      { at: [10, 7, 1, 1], to: 'icicle_gate', entry: 'from_inn', sfx: 'door' },
      { at: [18, 1, 2, 1], to: 'icicle_inn_2f', entry: 'from_1f' },
    ],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman4', at: [2, 1], dir: 'down', talk: innTalk },
      { id: 'inn_guest', name: 'Old Man', model: 'oldman2', at: [9, 5], dir: 'left',
        talk: function* (s) { yield s.say('Old Man', "Going down onto the glacier? Then listen to an old man. The cold out there doesn't bite. It creeps.\fYou won't notice until your legs quit on you. If that happens, pray Holzoff finds you. Crazy old climber lives at the foot of Gaea's Cliff."); } },
      { id: 'inn_trav', name: 'Traveler', model: 'man6', at: [16, 3], dir: 'down',
        talk: function* (s) { yield s.say('Traveler', "I came north to see the aurora. Instead I've seen blizzards, blizzards and... one very angry woman in a suit. Yesterday."); } },
    ],
    triggers: [C9.counter([1, 2, 4, 1], innTalk)],
  });

  FF7.defineMap('icicle_inn_2f', {
    name: 'Icicle Inn - Rooms', area: 'Icicle Inn', theme: 'house', music: 'snow', look: HOUSE, camera: HOUSE_CAM,
    grid: [
      "####w#####w######w####",
      "#b.b.b.b...........^^#",
      "#b.b.b.b...........^^#",
      "#....................#",
      "#.......t.c..........#",
      "#.......t............#",
      "#....................#",
      "######################",
    ],
    entries: { from_1f: [18, 2, 'left'] },
    exits: [{ at: [19, 1, 2, 1], to: 'icicle_inn', entry: 'from_2f' }],
    items: [{ at: [1, 6], item: 'x_potion', id: 'icicle_inn_x_potion' }],
    npcs: [
      { id: 'inn_girl', name: 'Girl', model: 'girl4', at: [12, 3], dir: 'up',
        talk: function* (s) { yield s.say('Girl', "If you look out the window at night, you can see the sky glow green over the north. Mama says not to stare at it too long."); } },
    ],
  });

  // ================================================================== weapon shop
  const weaponShop = function* (s) { yield s.say('Weapon Seller', "Heading for the glacier? Then you'll want something sharp. Things out there don't hibernate."); yield s.shop('icicle_inn_weapons'); };
  FF7.defineMap('icicle_weapons', {
    name: 'Icicle Inn - Weapon Shop', area: 'Icicle Inn', theme: 'house', music: 'snow', look: HOUSE, camera: HOUSE_CAM,
    grid: [
      "##################",
      "#kk..q...........#",
      "#.......DDDDD....#",
      "#................#",
      "#.B..........t.c.#",
      "#.o..........t...#",
      "#................#",
      "########+#########",
    ],
    entries: { from_town: [8, 6, 'up'] },
    exits: [{ at: [8, 7, 1, 1], to: 'icicle_gate', entry: 'from_weapons', sfx: 'door' }],
    npcs: [
      { id: 'weapon_seller', name: 'Weapon Seller', model: { base: 'man', top: '#6a4a3a', extras: ['furcollar', 'beard'] }, at: [10, 1], dir: 'down', talk: weaponShop },
      { id: 'shop_hunter', name: 'Hunter', model: 'man9', at: [13, 3], dir: 'left',
        talk: function* (s) { yield s.say('Hunter', "Bandersnatches hunt in packs down on the glacier. If you hear howling, you're already surrounded."); } },
    ],
    triggers: [C9.counter([8, 2, 5, 1], weaponShop)],
  });

  // ================================================================== the house with the snowman (Glacier Map)
  FF7.defineMap('icicle_snowhouse', {
    name: 'Icicle Inn - House', area: 'Icicle Inn', theme: 'house', music: 'snow', look: HOUSE, camera: HOUSE_CAM,
    grid: [
      "######w#####w#####",
      "#kk....F.....bb..#",
      "#................#",
      "#...t.c..........#",
      "#...t......j.....#",
      "#..............q.#",
      "#................#",
      "########+#########",
    ],
    entries: { from_town: [8, 6, 'up'] },
    exits: [{ at: [8, 7, 1, 1], to: 'icicle_gate', entry: 'from_snowhouse', sfx: 'door' }],
    items: [
      { at: [16, 2], item: 'hero_drink', id: 'icicle_snowhouse_hero_drink' },
      { at: [1, 6], item: 'vaccine', id: 'icicle_snowhouse_vaccine' },
    ],
    npcs: [
      { id: 'map_woman', name: 'Woman', model: 'woman7', at: [11, 3], dir: 'down',
        talk: function* (s) {
          if (s.has('glacier_map')) { yield s.say('Woman', "Keep that map close on the glacier. The snowstorms there wipe out every landmark, and the wind makes you walk in circles."); return; }
          yield s.say('Woman', "That map on the wall? My husband drew it. He used to guide travellers across the Great Glacier.\fOne winter he went out and... didn't come back. Take it, if you're going down there. Better it helps someone than gathers frost on my wall.");
        } },
      { id: 'map_kid', name: 'Boy', model: 'kid5', at: [5, 5], dir: 'right',
        talk: function* (s) { yield s.say('Boy', "I built the snowman outside! Well, my sister did the face. It's supposed to look like Mister Holzoff."); } },
    ],
    triggers: [
      C9.counter([8, 0, 5, 1], function* (s) {
        if (s.has('glacier_map')) { yield s.msg('The pale outline on the wall shows where the map used to hang.'); return; }
        yield s.msg('A hand-drawn map of the Great Glacier is pinned to the wall. Trails, caves and a hot spring are marked in careful ink.');
        const c = yield s.ask(null, 'Take the map?', ['Take it', 'Leave it']);
        if (c !== 0) return;
        s.set('c9_mapwall');
        yield s.give('glacier_map');
      }),
    ],
  });

  // ================================================================== the boy's house (snowboard)
  FF7.defineMap('icicle_kid', {
    name: 'Icicle Inn - House', area: 'Icicle Inn', theme: 'house', music: 'snow', look: HOUSE, camera: HOUSE_CAM,
    grid: [
      "################",
      "#bb..k.....F.q.#",
      "#..............#",
      "#....t.c.......#",
      "#....t.........#",
      "#..........B...#",
      "#..............#",
      "#######+########",
    ],
    entries: { from_town: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 1, 1], to: 'icicle_gate', entry: 'from_kid', sfx: 'door' }],
    npcs: [
      { id: 'board_kid', name: 'Boy', model: 'kid2', at: [9, 3], dir: 'down',
        talk: function* (s) {
          if (s.has('snowboard')) { yield s.say('Boy', "How's my board? Did you do a flip yet? Grab the balloons on the way down, they're worth tons of points!"); return; }
          yield s.say('Boy', "Whoa... Are you going down to the Great Glacier? The only way down the cliff is on a board, you know.\fYou can borrow mine! It was my dad's, so it's super fast. You have to be careful with it, okay? Promise?");
          yield s.give('snowboard');
          yield s.say('Boy', "The man up at the cliff can tell you how to ride. He taught me! Well... he tried.");
        } },
      { id: 'board_mom', name: 'Mother', model: 'woman3', at: [3, 4], dir: 'right',
        talk: function* (s) {
          if (s.has('snowboard')) { yield s.say('Mother', "He gave you his father's board? ...Well. I suppose it's better on a mountain than in our closet. Do bring yourselves back in one piece."); return; }
          yield s.say('Mother', "Heading north, in this weather? You're braver than I am. My son talks about nothing but that glacier."); } },
    ],
  });

  // ================================================================== the cliff and the slope
  function* rideDown(s) {
    s.set('c9_rode');
    s.setVar('c9_cold', 0);
    s.unset('c9_cold_warned');
    const r = yield s.minigame('snowboard', { course: 'great_glacier', title: 'Great Glacier' });
    // FF7: the two forks on the way down decide where you land (L+R gate, L+L pines, R+R canyon, R+L lone pine).
    const route = r && typeof r === 'object' && typeof r.route === 'string' ? r.route.toUpperCase() : '';
    const land = { LR: 'glacier_gate', LL: 'glacier_pines', RR: 'glacier_canyon', RL: 'glacier_lonepine' }[route] || 'glacier_gate';
    yield s.goto(land, 'from_board');
  }
  FF7.defineMap('icicle_cliff', {
    name: 'Icicle Inn - Cliff', area: 'Icicle Inn', theme: 'snow', music: 'snow', look: SNOW_TOWN,
    grid: [
      "                              ",
      "RRR       ::::::       RRRRRRR",
      "RR.T......::::::.......T...RRR",
      "R.........::::::..........T..R",
      "RT........::::::.............R",
      "R...T.....::::::.......T.....R",
      "R.........::::::.............R",
      "RTT.......::::::..........TTRR",
      "RRRRRRRRRR::::::RRRRRRRRRRRRRR",
    ],
    entries: { from_town: [12, 7, 'up'] },
    exits: [
      { at: [10, 8, 6, 1], to: 'icicle_gate', entry: 'from_cliff' },
      { at: [10, 1, 6, 1], hidden: true, run: function* (s) {
          if (!s.has('snowboard')) { yield s.say(C9.cloudHere(s) ? 'cloud' : null, C9.cloudHere(s) ? "(Too steep to walk. I'd need something to ride down on.)" : 'The slope drops away steeply. It is far too steep to walk down.'); return; }
          const c = yield s.ask(null, 'Ride the snowboard down to the Great Glacier?', ['Go!', 'Not yet']);
          if (c !== 0) return;
          yield* rideDown(s);
        } },
    ],
    npcs: [
      { id: 'board_man', name: 'Man', model: { base: 'man', top: '#c04030', sleeve: '#c04030', extras: ['goggles', 'furcollar'] }, at: [9, 2], dir: 'right',
        talk: function* (s) {
          if (!s.has('snowboard')) {
            yield s.say('Man', "Want to go down to the Great Glacier? Not on foot, you don't. The only way down this slope is on a snowboard.\fThe boy in the house in the middle of the village has one. Ask him nicely.");
            return;
          }
          const c = yield s.ask('Man', "Got yourself a board, eh? Want me to run you through the basics first?", ['Please', "I'll manage"]);
          if (c === 0) {
            s.set('c9_snowboard_tips');
            yield s.say('Man', "Lean left and right to steer. Hit the button to hop over bumps. Watch the trees... they don't move out of the way.\fThere are two forks on the run. Pick left or right at each one; where you end up on the glacier depends on it.");
            yield s.say('Man', "And listen. Once you're down there, the cold is the real enemy. Wander around too long and you'll drop where you stand.\fIf you get lost, head north through the big snowfield. Old Holzoff lives at the foot of Gaea's Cliff. He's pulled more frozen fools out of the snow than I can count.");
          } else {
            yield s.say('Man', "Suit yourself. Step up to the edge whenever you're ready.");
          }
        } },
    ],
    objects: [
      { at: [16, 2], talk: function* (s) { yield s.msg('Far below, the Great Glacier stretches away into the haze. Beyond it, a dark wall of rock rises into the clouds.'); } },
    ],
  });
})();

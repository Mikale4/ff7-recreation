// Chapter 5b (part 4) — the cargo ship from Junon to Costa del Sol.
// Cloud on cargo watch in his borrowed uniform; the party in disguise (Aeris as a soldier, Tifa on the
// lookout, Red XIII the sailor with a tail, Barret at the bow), seasick Yuffie on top of the All
// materia, the deck sailor (rest / items); the alarm, the PHS back and the party re-formed; the
// engine room: Sephiroth, Jenova·BIRTH, the Ifrit materia; the ship docks at Costa del Sol.
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const MATES = ['barret', 'tifa', 'aeris', 'redxiii', 'yuffie'];
  const mates = (s) => MATES.filter(id => s.inParty(id));
  function popOut(s, spots) {
    const ids = mates(s);
    ids.forEach((id, i) => { const p = spots[i % spots.length]; s.spawn(id, id, p[0], p[1], p[2] || 'down', { name: s.name(id) }); });
    return ids;
  }
  function tuckIn(s, ids) { ids.forEach(id => s.remove(id)); }
  function* anyone(s, lines) {
    for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  const disguised = (s) => s.flag('c5b_disguised') && !s.flag('c5b_undisguised');
  const wearUniform = function (s) { if (disguised(s)) s.setModel('player', 'soldier'); };
  const alarm = (s) => s.flag('c5b_ship_alarm');
  const beforeAlarm = (s) => !s.flag('c5b_ship_alarm');
  const fighting = (s) => s.flag('c5b_ship_alarm') && !s.flag('c5b_jenova_birth');
  const affection = (s, id, n) => s.inc('aff_' + id, n);   // FF7 date points
  // disguises
  const AERIS_SOLDIER = { base: 'soldier', female: true };
  const TIFA_SAILOR = { base: 'sailor', female: true, hair: '#2a1a18', hairStyle: 'long', bottom: '#f4f4f4' };
  const BARRET_SAILOR = { base: 'barret', top: '#f4f4f4', top2: '#f4f4f4', sleeve: '#f4f4f4', bottom: '#f4f4f4', hair: '#f4f4f4', hairStyle: 'cap', extras: ['gunarmR', 'beard', 'belt'] };
  const RED_SAILOR = { base: 'sailor', skin: '#d04a20', hair: '#f4f4f4', build: 'slim' };

  // ------------------------------------------------------------------ the cargo hold
  FF7.defineMap('ship_hold', {
    name: 'Cargo Ship - Hold', area: 'Cargo Ship', theme: 'ship', music: 'difficult',
    // refs 05-cargo06..10: a steel hold - riveted deck plates, ribbed panel walls, cargo crates and drums lashed
    // down in stacks, the ladder up to the deck, the door aft to the engine room
    look: { indoor: true, sky: ['#000000', '#000000'], wall: '#56606a', floor: ['#5e5c56', '#58564f'], ambient: [0.36, 0.38, 0.42], light: [0.6, 0.62, 0.66],
      wallTex: 'panel', floorTex: { floor: 'metal' }, trim: '#3a4048' },
    battle: { table: 'cargo_ship', bg: 'ship', rate: 1, if: fighting },
    lights: [[14, 3, '#ffe0a0', 3], [5, 8, '#ffe0a0', 2.5], [24, 8, '#ffe0a0', 2.5]],
    grid: [
      "##############################",
      "#BB......BBB.....H....oo..BBB#",
      "#B.......BB...........o....BB#",
      "#............................#",
      "#...BB.......BBB.......BB....#",
      "#...BB.......BBB.......BB..BB#",
      "+............................#",
      "+..........................BB#",
      "#..oo......BB.........BBB....#",
      "#..........BB..............S.#",
      "#BBB......................BBB#",
      "##############################",
    ],
    entries: { boarded: [14, 9, 'up'], from_deck: [17, 2, 'down'], from_engine: [1, 6, 'right'] },
    exits: [
      { at: [17, 1, 1, 1], to: 'ship_deck', entry: 'from_hold' },
      { at: [0, 6, 1, 2], to: 'ship_engine', entry: 'from_hold', sfx: 'door', if: alarm,
        blocked: function* (s) {
          yield s.say('Soldier', "Hey! The engine room's off-limits, rookie. Back to your post.");
        } },
    ],
    chests: [{ at: [8, 9], item: 'ether', id: 'ship_hold_ether' }],
    items: [{ at: [28, 6], materia: 'all', id: 'ship_hold_all' }],
    npcs: [
      { id: 'hold_guard', name: 'Soldier', model: 'soldier', at: [2, 8], dir: 'right', show: beforeAlarm,
        talk: function* (s) { yield s.say('Soldier', "Nobody goes into the engine room. Orders from the top.\f...Heard some weird noises from in there, though. Probably just the engines."); } },
      { id: 'hold_soldier', name: 'Soldier', model: 'soldier', at: [20, 3], dir: 'down', wander: 2, show: beforeAlarm,
        talk: function* (s) { yield s.say('Soldier', "Keep your eyes open, rookie. There's talk of a stowaway on board.\fSomebody in a black cape was seen near the hold before we cast off. Creepy, huh?"); } },
      { id: 'aeris_dis', name: 'Soldier', model: AERIS_SOLDIER, at: [3, 2], dir: 'down', show: beforeAlarm,
        talk: function* (s) {
          if (!s.flag('c5b_ship_aeris')) {
            yield s.say('aeris', "Halt! Who goes there!?\f......Hee hee! Gotcha, didn't I? It's me!");
            const c = yield s.ask('aeris', "So? Do I make a convincing Shinra soldier?", ['You look great.', 'The helmet is on backward.']);
            if (c === 0) yield s.say('aeris', "Really? Maybe I've found my calling! ...Kidding, kidding.");
            else yield s.say('aeris', "It is not! ...Is it? Hmm. They all look the same from the inside.");
            // FF7: Aeris and the airship. Date points: Aeris +2 / Aeris -2
            yield s.say('aeris', "You know, this is my first time on a ship. The sea just goes on and on!\fBut what I'd really love is to ride an airship someday. Way up above the clouds...");
            const DP = [{ aeris: 2 }, { aeris: -2 }];
            const f = yield s.ask('aeris', "Will you take me? Someday?", ['Sure. Someday.', 'Hard to say...'], { date: DP });
            FF7.story.datePts(s, DP[f]);
            yield s.say('aeris', f === 0 ? "Promise? ...Hee hee. I'm holding you to that." : "Hmph. You could at least pretend.");
            yield s.say('aeris', "Hey, have you seen Barret? We all split up to sneak on board, and I haven't seen him since.\fI hope he didn't get caught... He's not exactly built for sneaking.");
            s.set('c5b_ship_aeris');
            return;
          }
          yield s.say('aeris', "Barret's got to be somewhere on this ship. Maybe up on deck?");
        } },
      { id: 'yuffie_sick', name: 'Yuffie', model: 'yuffie', at: [27, 6], dir: 'left', anim: 'kneel',
        show: s => beforeAlarm(s) && s.isMember('yuffie'),
        talk: function* (s) {
          if (!s.flag('c5b_yuffie_dp')) {
            // FF7 date points (the first time she asks): a Tranquilizer Yuffie +4; refusing, or having none, Yuffie -2
            s.set('c5b_yuffie_dp');
            yield s.say('yuffie', "Ughhh... the floor won't stop moving... hurrk...\fY-you got anything for seasickness...? A Tranquilizer...?");
            const has = s.has('tranquilizer'), DP = has ? [{ yuffie: 4 }, { yuffie: -2 }] : [{ yuffie: -2 }];
            const c = has ? (yield s.ask(null, 'Give Yuffie a Tranquilizer?', ['Give her one', "Don't"], { date: DP })) : 0;
            FF7.story.datePts(s, DP[c] || DP[0]);
            if (has && c === 0) {
              s.take('tranquilizer');
              s.set('c5b_yuffie_tranq');
              yield s.say('yuffie', "......Oooh. That's... a little better.\fBut I'm still not moving. Not one inch. Nope. This spot is MINE.");
            } else yield s.say('yuffie', "N-nothing...? Figures... Blehhh...");
            return;
          }
          if (!s.flag('c5b_yuffie_tranq') && s.has('tranquilizer')) {
            yield s.say('yuffie', "Ughhh... don't... don't talk to me... The floor won't stop moving... hurrk...");
            const c = yield s.ask(null, 'Give Yuffie a Tranquilizer?', ['Give her one', "Don't"]);
            if (c === 0) {
              s.take('tranquilizer');
              s.set('c5b_yuffie_tranq');
              yield s.say('yuffie', "......Oooh. That's... a little better.\fBut I'm still not moving. Not one inch. Nope. This spot is MINE.");
            }
            return;
          }
          yield s.say('yuffie', "Blehhh... Why do boats even exist...? Just leave me here... to die...");
        } },
    ],
    onLoad: wearUniform,
    onEnter: function* (s) {
      if (s.entry() !== 'boarded' || s.flag('c5b_ship_intro')) return;
      s.set('c5b_ship_intro');
      s.music('shinra');
      yield s.say('cloud', "(Made it aboard. ...The others said they'd find their own way on.)\f(If they managed it, they should be somewhere on this ship.)");
    },
  });

  // ------------------------------------------------------------------ the deck
  FF7.defineMap('ship_deck', {
    name: 'Cargo Ship - Deck', area: 'Cargo Ship', theme: 'ship', music: 'difficult',
    // refs 05-cargo03..05: a grey steel deck with a hazard-striped cargo hatch, the white bridge house with
    // its lit windows (the forward cabin), the lookout platform on the mast, crates and drums, the rail
    // FF7's deck is rust-brown plating in warm evening light with the sea all round (05-cargo03..06)
    look: { floor: ['#6c503e', '#664b3a'], floorTex: { floor: 'metal' }, trim: '#5a3e30', bldg: '#8a6a52', roof: '#4e4038', bldgWin: '#f0c890', wallTex: { bldg: 'panel' },
      metal: ['#6a5040', '#5e4638'], wall: '#6a4c3a', wallTop: '#4a3428', water: '#1f5585', sky: ['#1c4c7c', '#10304e'], ambient: [0.5, 0.42, 0.38], light: [0.96, 0.78, 0.6] },
    buildings: [{ at: [2, 2, 5, 3], h: 2.8, col: '#8a6a52', roof: '#4e4038', win: '#f0c890' }],
    battle: { table: 'cargo_ship', bg: 'ship', rate: 0.8, if: fighting },
    props: [{ at: [14, 2], prop: 'pylon', h: 4.2, w: 0.5, top: 0.25, arms: 1.4, col: '#7a5a44', lamp: '#ffe0a0', deck: false },
      // the bridge house's band of big rust-framed windows onto the deck, lit warm inside
      { at: [4, 4], prop: 'viewwindow', rot: 0, w: 4.6, y: 1.1, h: 1.1, col: ['#f4d8a8', '#c89058'], col2: '#5a3a2a', fw: 0.08, bars: 5 },
      { at: [6, 3], prop: 'viewwindow', rot: 90, w: 1.6, y: 1.1, h: 1.1, col: ['#f4d8a8', '#c89058'], col2: '#5a3a2a', fw: 0.08, bars: 2 }],
    grid: [
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~=============================~~~~",
      "~=hhhhh.......|..............==~~~",
      "~=hhhhh.......................==~~",
      "~=hhhhh.......H.................=~",
      "~=..............................=~",
      "~=...B.............o............=~",
      "~=......E........................=",
      "~=...............................=",
      "~=..o..........BB.------........=~",
      "~=................-gggg-........=~",
      "~=................------......==~~",
      "~=...........................==~~~",
      "~=============================~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    heights: [
      "0000000000000000000000000000000000",
      "0222222222222222222222222222220000",
      "0222222222222888222222222222222000",
      "0222222222222888222222222222222200",
      "0222222222222252222222222222222220",
      "0222222222222222222222222222222220",
      "0222222222222222222222222222222220",
      "0222222222222222222222222222222222",
      "0222222222222222222222222222222222",
      "0222222222222222222222222222222220",
      "0222222222222222222222222222222220",
      "0222222222222222222222222222222200",
      "0222222222222222222222222222222000",
      "0222222222222222222222222222220000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_hold: [9, 7, 'right'] },
    exits: [{ at: [8, 7, 1, 1], to: 'ship_hold', entry: 'from_deck' }],
    npcs: [
      { id: 'tifa_dis', name: 'Sailor', model: TIFA_SAILOR, at: [15, 2], dir: 'right', show: beforeAlarm,
        talk: function* (s) {
          if (!s.flag('c5b_ship_tifa')) {
            yield s.say('tifa', "Cloud! Up here! ...Isn't it amazing? The sea goes on forever.\fAfter living under the plate for so long, I almost forgot the sky could be this big.");
            yield s.say('tifa', "......Hey, Cloud. You've been really quiet ever since Junon. Are you okay?");
            const c = yield s.ask('cloud', '', ["I'm fine.", '......']);
            if (c === 0) yield s.say('tifa', "...Okay. If you say so.");
            // FF7: Tifa asks about the fighting ahead. Date points: Tifa +2 / Tifa -2
            yield s.say('tifa', "......Shinra on one side, Sephiroth on the other. And all of us, caught in the middle.\fIt's going to turn into a war, isn't it?");
            const DP = [{ tifa: 2 }, { tifa: -2 }];
            const w = yield s.ask('cloud', '', ['Yeah... I think so.', "I really don't know."], { date: DP });
            FF7.story.datePts(s, DP[w]);
            if (w === 0) yield s.say('tifa', "...Thanks for being honest with me.");
            yield s.say('tifa', "Just remember... you don't have to carry everything by yourself.");
            s.set('c5b_ship_tifa');
            return;
          }
          yield s.say('tifa', "I'll keep watch up here. If I see anything strange, I'll let you know.");
        } },
      { id: 'red_dis', name: 'Sailor', model: RED_SAILOR, at: [24, 10], dir: 'down', show: beforeAlarm,
        talk: function* (s) {
          if (!s.flag('c5b_ship_red')) {
            yield s.say('cloud', "(...This sailor has a tail.)");
            yield s.say('redxiii', "......Please don't stare.\fThis was the only uniform left. They are not made with tails in mind. Or for standing on two legs, for that matter.");
            yield s.say('redxiii', "If my grandfather could see me now, he would laugh himself sick.");
            s.set('c5b_ship_red');
            return;
          }
          yield s.say('redxiii', "Walking on two legs is exhausting. I don't know how you humans manage it.");
        } },
      { id: 'barret_dis', name: 'Sailor', model: BARRET_SAILOR, at: [32, 7], dir: 'right', show: beforeAlarm,
        talk: function* (s) {
          if (!s.flag('c5b_ship_aeris')) {
            yield s.say('barret', "Whaddaya want? Can't a sailor enjoy the sea breeze in peace?\f...Oh, it's you. Heh! How 'bout this outfit? Fits like a glove!\f...A real tiny glove.");
            return;
          }
          yield s.say('barret', "Yo, Cloud! Aeris is lookin' for me? Heh, what, she thought they caught me?\fNo way! Nobody sees through this disguise. I'm a natural!");
          yield* FF7.story.c5b_shipAlarm(s);
        } },
      { id: 'deck_sailor', name: 'Sailor', model: 'sailor', at: [6, 6], dir: 'right',
        talk: function* (s) {
          const c = yield s.ask('Sailor', disguised(s) ? "You look beat, soldier. Rough crossing?" : "You look beat. Everything all right?", ["I'm tired.", "I'd like to buy something.", 'Never mind']);
          if (c === 0) {
            yield s.say('Sailor', "Go lie down in the crew bunks for a bit. I won't tell anyone.");
            yield s.fadeOut(30);
            s.heal();
            s.sfx('heal');
            yield 40;
            yield s.fadeIn(30);
            yield s.say('Sailor', "Better? Good.");
          } else if (c === 1) {
            yield s.shop('cargo_ship_items');
          }
        } },
      { id: 'deck_soldier1', name: 'Soldier', model: 'soldier', at: [20, 5], dir: 'down', wander: 2, show: beforeAlarm,
        talk: function* (s) { yield s.say('Soldier', "The President has the whole forward cabin to himself. Don't even think about going near it."); } },
      { id: 'deck_soldier2', name: 'Soldier', model: 'soldier', at: [11, 11], dir: 'up', wander: 2, show: beforeAlarm,
        talk: function* (s) { yield s.say('Soldier', "Weird crew on this boat. There's a sailor at the bow who looks like he could bench-press a chocobo."); } },
    ],
    onLoad: wearUniform,
  });

  // ------------------------------------------------------------------ the alarm: regroup, PHS, choose the party
  FF7.story.c5b_shipAlarm = function* (s) {
    s.stopMusic();
    s.sfx('alarm_long');
    s.shake(2, 40);
    yield s.emote('barret_dis', '!');
    yield s.say('barret', "What the hell's that!?");
    s.spawn('alarm_sol', 'soldier', 9, 7, 'right', { name: 'Soldier' });
    yield s.run('alarm_sol', 26, 7);
    yield s.say('Soldier', "Emergency! Emergency! Something's in the engine room! The crew down there... they're all...!");
    yield s.run('alarm_sol', 9, 7);
    s.remove('alarm_sol');
    const ids = ['tifa', 'aeris', 'redxiii'].concat(s.isMember('yuffie') ? ['yuffie'] : []);
    const spots = [[29, 6, 'right'], [29, 8, 'right'], [28, 7, 'right'], [30, 9, 'up']];
    ids.forEach((id, i) => { s.spawn('al_' + id, id, spots[i][0], spots[i][1], spots[i][2], { name: s.name(id) }); });
    yield s.face('player', 'left');
    if (s.isMember('yuffie')) yield s.say('yuffie', "Urrgh... what's with all the racket...? Some of us are trying to be sick here...");
    yield s.say('barret', "......Sephiroth. It's gotta be. That bastard's on this ship!");
    yield s.say('tifa', "Cloud! These disguises won't fool anybody now. Let's go!");
    yield s.fadeOut(20);
    s.set('c5b_undisguised');
    s.setModel('player', 'cloud');
    s.hide('barret_dis');
    ['tifa_dis', 'red_dis', 'deck_soldier1', 'deck_soldier2'].forEach(id => s.hide(id));
    s.spawn('al_barret', 'barret', 31, 8, 'left', { name: s.name('barret') });
    yield s.fadeIn(20);
    yield s.say('barret', "Here. Almost forgot—your PHS. Pick your team, and let's get down there.");
    if (s.flag('c5b_phs_taken') || !s.has('phs')) yield s.give('phs');
    s.phs(true);
    s.set('c5b_ship_alarm');
    yield s.choosePArty(['cloud']);
    ['al_barret', 'al_tifa', 'al_aeris', 'al_redxiii', 'al_yuffie'].forEach(id => s.remove(id));
    yield s.say('cloud', "(The engine room... through the door at the back of the cargo hold.)");
    s.music('shinra');
  };

  // ------------------------------------------------------------------ the engine room: Sephiroth, Jenova·BIRTH
  FF7.defineMap('ship_engine', {
    name: 'Cargo Ship - Engine Room', area: 'Cargo Ship', theme: 'ship', music: 'difficult',
    // ref 05-cargo06: riveted steel deck plates between the two great engine blocks (cylinder heads,
    // flywheels, exhaust stacks), a rusty mesh catwalk with its ladder along the far wall, pumps and pipes
    look: { indoor: true, sky: ['#000000', '#000000'], wall: '#4a5058', floor: ['#5a5c5e', '#545658'], ambient: [0.32, 0.34, 0.38], light: [0.56, 0.58, 0.62],
      wallTex: 'panel', floorTex: { floor: 'metal' }, trim: '#7a4a2a', metal: ['#6a6e72', '#5a5e62'] },
    battle: { table: 'cargo_ship', bg: 'ship', rate: 1, if: fighting },
    lights: [[5, 3, '#ff8040', 2.5], [20, 7, '#80ffb0', 2.5], [4, 7, '#ffd0a0', 2.5]],
    legend: { E: 'engine' },
    grid: [
      "############################",
      "#MMMPPPMMM.zzzzzzzzzzzzzzzz#",
      "#MMMPPPMMM.zzzzzzzzzzzzzzzz#",
      "#..........====H===========#",
      "+..........................#",
      "+.....................EEEEE#",
      "#.EEEEEE..............EEEEE#",
      "#.EEEEEE..............EEEEE#",
      "#.EEEEEE..............EEEEE#",
      "#..........................#",
      "#PPPP......MMMMMM......PPPP#",
      "############################",
    ],
    props: [{ at: [2, 6], col: '#6a7274', col2: '#8a4a2a' }, { at: [22, 5], col: '#6a6e70', col2: '#7a5a2a', h: 1.3 }],
    heights: [
      "0000000000000000000000000000",
      "0000000000066666666666666660",
      "0000000000066666666666666660",
      "0000000000066663666666666660",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
    ],
    entries: { from_hold: [1, 5, 'right'], after: [18, 7, 'right'] },
    exits: [
      { at: [0, 4, 1, 2], run: function* (s) {
          if (s.flag('c5b_jenova_birth')) { yield* FF7.story.c5b_arrival(s); return; }
          s.sfx('door');
          yield s.goto('ship_hold', 'from_engine');
        } },
    ],
    chests: [{ at: [26, 1], item: 'wind_slash', id: 'ship_engine_windslash' }],
    // the Ifrit materia lies where Jenova·BIRTH fell (missable, as in FF7)
    items: [{ at: [21, 7], materia: 'ifrit', id: 'ship_engine_ifrit', if: s => s.flag('c5b_jenova_birth') }],
    npcs: [
      { id: 'officer', name: 'Shinra Officer', model: 'mp', at: [21, 7], dir: 'right', show: fighting,
        talk: function* (s) { yield* FF7.story.c5b_jenovaBirth(s); } },
      { id: 'crew1', name: 'Sailor', model: 'sailor', at: [8, 7], dir: 'down', anim: 'lie', show: alarm, faceOnTalk: false,
        talk: function* (s) { yield s.msg('A crewman lies motionless on the floor. A single clean wound... A sword did this.'); } },
      { id: 'crew2', name: 'Sailor', model: 'sailor', at: [14, 9], dir: 'left', anim: 'lie', show: alarm, faceOnTalk: false,
        talk: function* (s) { yield s.msg("He's gone. There's no sign of a struggle."); } },
    ],
    triggers: [
      { id: 'birth', at: [17, 4, 1, 6], once: true, if: fighting, run: function* (s) { yield* FF7.story.c5b_jenovaBirth(s); } },
    ],
    onLoad: wearUniform,
    onEnter: function* (s) {
      if (s.flag('c5b_jenova_birth') || !alarm(s) || s.flag('c5b_engine_seen')) return;
      s.set('c5b_engine_seen');
      yield s.say('cloud', "(The crew... all cut down. Not a sound from anyone.)");
    },
  });

  FF7.story.c5b_jenovaBirth = function* (s) {
    if (s.flag('c5b_jenova_birth')) return;
    yield s.move('player', 18, 7);
    yield s.face('player', 'right');
    const ids = popOut(s, [[17, 6, 'right'], [17, 8, 'right']]);
    yield s.say('cloud', "......Hey. What happened here?");
    yield s.face('officer', 'player');
    yield 20;
    s.anim('officer', 'hurt');
    yield 20;
    s.anim('officer', 'lie');
    s.stopMusic();
    s.sfx('death');
    yield 30;
    s.flash('#ffffff', 16, 0.8);
    s.spawn('seph', 'sephiroth', 23, 7, 'left', { name: 'Sephiroth' });
    yield s.emote('player', '!!');
    yield s.say('cloud', "Sephiroth!!");
    yield s.say('seph', "......Who are you?");
    yield s.say('cloud', "What...!? You don't remember me? It's me—Cloud!");
    yield s.say('seph', "......Cloud......");
    yield s.say('cloud', "What are you planning? What are you trying to do!?");
    yield s.say('seph', "......Soon.\fThe time is nearly at hand.");
    yield s.say('cloud', "The time...? What's that supposed to mean!?");
    // he rises into the air and is gone; something is left behind
    s.flash('#80ffb0', 24, 0.9);
    s.shake(3, 30);
    yield s.jump('seph', 23, 7, 3.5, 36);
    s.remove('seph');
    s.spawn('birth', { enemy: 'jenova_birth', scale: 0.9 }, 22, 7, 'left', { name: 'Jenova' });
    s.shake(5, 40);
    yield s.emote('player', '!');
    yield* anyone(s, [
      ['barret', "What the hell is THAT!?"],
      ['aeris', "That's... It's like the thing in the Shinra building! Jenova!"],
      ['redxiii', "That stench... It's Jenova!"],
      ['tifa', "Cloud, what IS that thing!?"],
    ]);
    yield s.say('cloud', "Here it comes!");
    yield s.battle({ table: 'boss_jenova_birth', bg: 'ship', music: 'jenova', noEscape: true });
    s.remove('birth');
    s.set('c5b_jenova_birth');
    tuckIn(s, ids);
    const ids2 = popOut(s, [[17, 6, 'right'], [17, 8, 'right']]);
    yield* anyone(s, [['barret', "Was that really Sephiroth? He just... vanished into thin air!"]]);
    yield* anyone(s, [['tifa', "'The time is nearly at hand'... What did he mean, Cloud?"]]);
    yield* anyone(s, [['redxiii', "That creature was a part of Jenova. The body taken from the Shinra building... Sephiroth seems to be carrying it with him."]]);
    yield* anyone(s, [['aeris', "Jenova... It's almost as if it's following him. Or... calling to him."]]);
    yield* anyone(s, [['yuffie', "Can we PLEASE get off this stupid boat now?"]]);
    yield s.say('cloud', "......\fSephiroth is alive. And he's headed somewhere.\fWherever it is... we follow him.");
    s.sfx('train_horn');
    yield s.msg('The ship\'s horn sounds. The harbor of Costa del Sol is in sight.');
    tuckIn(s, ids2);
    s.music('shinra');
    yield s.goto('ship_engine', 'after');
    yield s.say('cloud', "(Something's glowing on the floor where that thing was...)");
  };

  // ------------------------------------------------------------------ arrival at Costa del Sol
  FF7.story.c5b_arrival = function* (s) {
    if (!s.flag('got_ship_engine_ifrit')) {
      const c = yield s.ask(null, "(We're about to dock. Head up and leave the ship?)", ['Leave the ship', 'Look around a bit more']);
      if (c !== 0) return;
    }
    s.set('c5b_arrived');
    yield s.fadeOut(30);
    s.stopMusic();
    yield s.movie('junon_ship', { text: 'Under a blazing sun, the cargo ship from Junon glides into the harbor\nof Costa del Sol, the resort town of the western continent.' });
    yield s.goto('costa_port', 'from_ship');
  };
})();

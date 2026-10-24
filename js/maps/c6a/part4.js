// Chapter 6a, part 4 — the Battle Square massacre (the party is framed and thrown down), Corel
// Prison (Mr. Coates, Barret's confession, the well, the outskirts, the desert and the junkyard),
// Dyne and the flashback of Corel burning, the boss fight (Barret alone), the chocobo race for
// freedom (Ester, the jockey room, Ramuh), Dio's letter and the buggy.
// Also: the Battle Square arena after the story (three fights for BP, BP prize exchange).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const ALL = ['cloud', 'barret', 'tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith'];
  const counter = (at, run) => ({ at, on: 'talk', run });
  const GP = {
    get: () => (FF7.state && FF7.state.gp) || 0,
    spend: (n) => { if (!FF7.state || (FF7.state.gp || 0) < n) return false; FF7.state.gp -= n; return true; },
  };
  const BP = {
    get: () => (FF7.state && FF7.state.bp) || 0,
    set: (n) => { if (FF7.state) FF7.state.bp = Math.max(0, n); },
  };
  // current party, leader first (the script API has no getter for the whole list)
  const partyNow = s => { const l = s.leader(); return [l].concat(ALL.filter(id => id !== l && s.inParty(id))).slice(0, 3); };
  const STAFF = { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' };
  const GUARD = { base: 'man', top: '#202028', sleeve: '#202028', bottom: '#202028', boots: '#101010', extras: ['shades', 'tie'] };
  const ESTER = { base: 'woman', top: '#f0a030', sleeve: '#f0a030', bottom: '#503020', hair: '#c03020', hairStyle: 'ponytail', skirt: 'short' };
  const COATES = { base: 'oldman', top: '#6a5a3a', sleeve: '#6a5a3a', bottom: '#4a4030', extras: ['beard', 'cap'] };
  const BARRET_YOUNG = { base: 'barret', extras: ['vest', 'beard', 'belt', 'wristband'] };
  const DYNE_YOUNG = { base: 'dyne', extras: [] };
  FF7.world.link('corel_prison', { run: function* (s) { yield s.msg('Sheer cliffs ring the desert prison. There is no way in from here.'); } });

  // ------------------------------------------------------------------ Battle Square
  const PRIZES = [['potion', 80], ['phoenix_down', 160], ['shrapnel', 320], ['ether', 640], ['mimett_greens', 1280], ['fury_ring', 2560],
    ['m:enemy_lure', 5120], ['m:pre_emptive', 10240], ['m:speed_plus', 20480], ['champion_belt', 40960]];
  const prizeName = (id) => id.startsWith('m:') ? ((FF7.data.materia[id.slice(2)] || {}).name || id) + ' Materia' : (FF7.util && FF7.util.itemName ? FF7.util.itemName(id) : id);
  const bpExchange = function* (s) {
    if (!s.flag('has_buggy')) { yield s.say('Clerk', "...The Battle Square is closed. Please leave."); return; }
    const c = yield s.ask('Clerk', `Exchange your Battle Points for prizes! You have ${BP.get()} BP. (BP disappears when you leave the Battle Square!)`, PRIZES.map(([id, bp]) => `${prizeName(id)} (${bp} BP)`).concat(['Leave']));
    if (c >= PRIZES.length) return;
    const [id, cost] = PRIZES[c];
    if (BP.get() < cost) { yield s.say('Clerk', "You don't have enough BP for that one."); return; }
    BP.set(BP.get() - cost);
    if (id.startsWith('m:')) yield s.giveMateria(id.slice(2)); else yield s.give(id);
  };
  const arenaDesk = function* (s) {
    if (!s.flag('has_buggy')) { yield s.say('Clerk', "...The Battle Square is closed until further notice."); return; }
    const c = yield s.ask('Clerk', `Welcome to the Battle Arena! Entry is 10 GP. (You have ${GP.get()} GP.)\nWin battles in a row to earn Battle Points!`, ['Enter the arena', 'Not now']);
    if (c !== 0) return;
    if (!GP.spend(10)) { yield s.say('Clerk', "I'm sorry, you need 10 GP to enter."); return; }
    const tables = ['mt_corel', 'corel_prison', 'corel_prison_junkyard', 'wm_corel', 'wm_desert_edge', 'wm_costa'];
    const reward = [10, 30, 80];
    let earned = 0;
    for (let round = 0; round < 3; round++) {
      yield s.caption(`BATTLE ${round + 1}`, { hold: 60, bg: 'rgba(0,0,0,0.7)' });
      const table = tables[Math.floor(Math.random() * tables.length)];
      const r = yield s.battle({ table, bg: 'goldsaucer', music: 'battle', canLose: true });
      if (r !== 'win') { yield s.say('Announcer', "Ooh, the challenger goes down! Better luck next time!"); earned = Math.floor(earned / 2); break; }
      earned += reward[round];
      if (round < 2) {
        const k = yield s.ask('Announcer', `Victory! ${earned} BP so far. Keep fighting?`, ['Next battle!', 'Quit while ahead']);
        if (k !== 0) break;
      } else {
        yield s.say('Announcer', "Three straight wins! What a champion!");
      }
    }
    s.heal();
    BP.set(BP.get() + earned);
    if (earned > 0) { s.sfx('found'); yield s.msg(`Received ${earned} BP!`); }
  };

  FF7.defineMap('gs_battle', {
    name: 'Battle Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhhhNhhhhhh++++hhhhhhNhhhhhh",
      "h.|........................|.h",
      "h............................h",
      "h.DDD...................DDD..h",
      "h............................h",
      "h.|........................|.h",
      "h............................h",
      "h............................h",
      "hhhhhhhhhhhhh++++hhhhhhhhhhhhh",
    ],
    lights: [[14, 2, '#ff4040', 4]],
    entries: { from_station: [14, 8, 'up'] },
    exits: [
      { at: [13, 9, 4, 1], to: 'gs_station', entry: 'from_battle', sfx: 'door' },
      { at: [13, 1, 4, 1], run: function* (s) {
          if (s.flag('has_buggy')) yield s.say('Clerk', "Challengers, please register at the counter first!");
          else yield s.msg('The arena gate is shut tight.');
          yield s.walk('player', 0, 1);
        } },
    ],
    npcs: [
      { id: 'arena_clerk', name: 'Clerk', model: STAFF, at: [3, 3], dir: 'down', show: s => s.flag('has_buggy') && !(FF7.maps.gs_battle.npcs || []).some(n => n.id === 'c12a_host'), talk: arenaDesk },
      { id: 'bp_clerk', name: 'Clerk', model: STAFF, at: [25, 3], dir: 'down', show: s => s.flag('has_buggy') && !(FF7.maps.gs_battle.npcs || []).some(n => n.id === 'c12a_host'), talk: bpExchange },
      { id: 'fan', name: 'Fan', model: 'man18', at: [8, 7], dir: 'up', show: s => s.flag('has_buggy'),
        talk: function* (s) { yield s.say('Fan', "After what happened here, I thought they'd close for good. But nothing keeps the Battle Square down for long!"); } },
    ],
    // (the Disc 2/3 arena, js/maps/c12/part4.js, brings its own host and counters: these give way to them)
    triggers: [counter([2, 4, 3, 1], arenaDesk), counter([24, 4, 3, 1], bpExchange)].map(t => Object.assign(t, { if: () => !(FF7.maps.gs_battle.npcs || []).some(n => n.id === 'c12a_host') })),
    onEnter: function* (s) {
      BP.set(0);   // FF7: Battle Points vanish when you leave the Battle Square
      if (s.flag('c6a_framed')) return;
      s.set('c6a_framed');
      // --- The massacre. Everyone in the Battle Square has been shot.
      s.music('none');
      [[8, 5], [20, 6], [4, 3], [24, 7], [12, 7]].forEach(([x, y], i) => s.spawn('body' + i, i % 2 ? GUARD : STAFF, x, y, 'down', { anim: 'dead' }));
      s.spawn('dying', STAFF, 15, 3, 'down', { name: 'Attendant', anim: 'kneel' });
      const crew = ['tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith'].filter(id => s.inParty(id));
      crew.forEach((id, i) => s.spawn(id + '_ev', id, 13 + i * 2, 8, 'up', { name: s.name(id) }));
      yield s.move('player', 14, 5);
      yield s.emote('player', '!!');
      if (crew.includes('caitsith')) yield s.say('caitsith', "Wh-what in the world happened here?!");
      if (crew.includes('aeris')) yield s.say('aeris', "How awful... Everyone's...");
      yield s.move('player', 15, 4);
      yield s.say('Attendant', "...A man... with a gun... for an arm...");
      s.anim('dying', 'dead');
      yield 40;
      yield s.say('cloud', "...A gun for an arm?");
      if (crew.includes('tifa')) yield s.say('tifa', "No... It can't be. Barret would never...!");
      else if (crew.includes('redxiii')) yield s.say('redxiii', "Barret... No. There must be some mistake.");
      // --- Guards storm in; Dio arrives.
      s.sfx('alarm');
      s.spawn('guard1', GUARD, 13, 9, 'up', { name: 'Guard' }); s.spawn('guard2', GUARD, 16, 9, 'up', { name: 'Guard' });
      s.spawn('guard3', GUARD, 14, 1, 'down', { name: 'Guard' }); s.spawn('guard4', GUARD, 16, 1, 'down', { name: 'Guard' });
      yield [s.run('guard1', 12, 6), s.run('guard2', 18, 6), s.run('guard3', 13, 3), s.run('guard4', 17, 3)];
      yield s.say('Guard', "Freeze! Nobody move!\fIt's them! They're the ones who did this!");
      s.spawn('dio', 'dio', 14, 9, 'up', { name: 'Dio' });
      yield s.move('dio', 14, 6);
      yield s.face('player', 'dio');
      yield s.say('dio', "What is the meaning of this?! My Battle Square! My staff!\fYou dare to spill blood in MY Gold Saucer?!");
      yield s.say('cloud', "Wait. It wasn't us.");
      yield s.say('dio', "Hah! Every scoundrel says that. The Gold Saucer has its own laws, young man, and I am the judge.\fGuards! Throw them down into the desert prison!");
      if (crew.includes('caitsith')) yield s.say('caitsith', "Now hang on a minute! I only just joined up with these folks!");
      yield s.say('Guard', "Move it!");
      s.sfx('falling');
      yield s.fadeOut(40);
      yield s.caption('Far below the Gold Saucer, ringed by sand and sheer cliffs,\nlies the Corel Prison.\n\nThose thrown down there never climb back up.', { hold: 220, bg: '#000' });
      yield s.goto('prison_yard', 'from_saucer');
    },
  });

  // ------------------------------------------------------------------ Corel Prison
  const coatesTalk = function* (s) {
    if (s.flag('c6a_race_intro')) {
      const c = yield s.ask('Mr. Coates', "Ester's waitin' for you up in the jockey room. Want me to send you up the elevator?", ['Go up to the jockey room', 'Rest in the truck', 'Not yet']);
      if (c === 0) { yield s.fadeOut(30); s.sfx('elevator'); yield s.goto('gs_jockey', 'from_prison'); return; }
      if (c === 1) yield s.inn(0, { who: 'Mr. Coates', text: "Driver's seat's free. Take a nap?" });
      return;
    }
    if (!s.flag('c6a_coates_talked')) {
      s.set('c6a_coates_talked');
      yield s.say('Mr. Coates', "New arrivals from upstairs, eh? Name's Coates. I just sit in my truck and watch the sand blow by.\fWant out? Hah. Only one road outta Corel Prison: win a chocobo race up at the Saucer. Dio sets the winners free. It's the one rule of his he keeps.\fBut to get into a race, you need the prison boss to send you. And the boss down here is a fella named Dyne. Nobody crosses Dyne.");
    }
    const c = yield s.ask('Mr. Coates', "My driver's seat is comfy enough if you need a rest.", ['Rest in the truck', 'Leave']);
    if (c === 0) yield s.inn(0, { who: 'Mr. Coates', text: "Free of charge. Not like I got anywhere to drive." });
  };

  FF7.defineMap('prison_yard', {
    name: 'Corel Prison', area: 'Corel Desert', theme: 'desert', music: 'badlands',
    battle: { table: 'corel_prison', bg: 'prison', rate: 0.7 },
    look: { wall: '#8a6a48', trim: '#4a3420', sky: ['#c89060', '#f0d8a8'] },
    grid: [
      "#################dddd#################",
      "#xx..............dddd..............xx#",
      "#x..................................x#",
      "#..hhhhhh..........dd.......hhhhhh...#",
      "#..hwwwwh..........dd.......hwwwwh...#",
      "#..hhhhhh....o.....dd.......hh+hhh...#",
      "#..................dd................#",
      "#......x...........dd.........B......#",
      "#..................dd................#",
      "#..................dd.......hhhhhh...#",
      "#..................dd.......hwwwwh...#",
      "#........&&&.......dd.......hh+hhh...#",
      "#..................dd................#",
      "#...x..............dd.............x..#",
      "#..................dd................#",
      "#.......o..........dd.......x........#",
      "#..................dd................#",
      "#################dddd#################",
    ],
    entries: {
      from_saucer: [18, 8, 'down'], from_north: [18, 1, 'down'], from_house: [30, 6, 'down'], from_pub: [30, 12, 'down'],
      from_outskirts: [18, 16, 'up'], from_elevator: [12, 12, 'down'],
    },
    exits: [
      { at: [17, 0, 4, 1], to: 'prison_north', entry: 'from_yard' },
      { at: [30, 5, 1, 1], to: 'prison_barret_house', entry: 'from_yard', sfx: 'door' },
      { at: [30, 11, 1, 1], to: 'prison_pub', entry: 'from_yard', sfx: 'door' },
      { at: [17, 17, 4, 1], to: 'prison_outskirts', entry: 'from_yard', if: s => s.inParty('barret') || s.flag('c6a_dyne_done'),
        blocked: function* (s) {
          if (s.flag('c6a_barret_rejoined')) {
            yield s.say('cloud', "(Barret should come along. This is his fight.)");
            yield s.choosePArty(['cloud', 'barret']);
          } else {
            yield s.say('cloud', "(Before anything else... I need to find Barret.)");
          }
          yield s.walk('player', 0, -1);
        } },
    ],
    npcs: [
      { id: 'coates', name: 'Mr. Coates', model: COATES, at: [12, 11], dir: 'left', talk: coatesTalk },
      { id: 'thug', name: 'Prisoner', model: 'man19', at: [6, 8], dir: 'right',
        talk: function* (s) { yield s.say('Prisoner', s.flag('c6a_dyne_done') ? "Dyne's gone? ...Then who's gonna keep the Saucer's trash in line down here?" : "Fresh meat from upstairs, huh? Word of advice: stay outta the junkyard. That's Dyne's turf. Folks who go in there don't come back out."); } },
      { id: 'lady', name: 'Woman', model: 'woman13', at: [14, 4], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "This used to be a town, you know. Corel. Then the desert swallowed it, and the Gold Saucer started dumping its criminals on top of the ruins."); } },
      { id: 'geezer', name: 'Old Prisoner', model: 'oldman5', at: [24, 14], dir: 'left',
        talk: function* (s) { yield s.say('Old Prisoner', "Been down here twenty years. Or maybe two. The sand eats your days, kid."); } },
    ],
    objects: [
      { at: [10, 11], talk: coatesTalk },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_dyne_done') && !s.flag('c6a_race_intro')) { yield* raceIntro(s); return; }
      if (s.flag('c6a_prison_arrival')) return;
      s.set('c6a_prison_arrival');
      // --- Thrown down from the Gold Saucer.
      s.music('badlands');
      const crew = ['tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith'].filter(id => s.inParty(id));
      crew.forEach((id, i) => s.spawn(id + '_ev', id, 16 + i * 3, 9, 'down', { name: s.name(id), anim: 'lie' }));
      s.anim('player', 'lie');
      yield 60;
      s.stopAnim('player');
      yield s.say('cloud', "Ugh... Where...?");
      crew.forEach(id => s.stopAnim(id + '_ev'));
      if (crew.includes('caitsith')) yield s.say('caitsith', "Ow, ow, ow... My poor moogle. Where've they dumped us?");
      s.spawn('greeter', 'man20', 24, 13, 'up', { name: 'Prisoner' });
      yield s.move('greeter', 20, 10);
      yield s.say('Prisoner', "Heh. More garbage from upstairs. Welcome to Corel Prison — the desert jail under the Gold Saucer.\fThere ain't no way out. So don't bother tryin'.");
      yield s.say('cloud', "...Corel?");
      if (crew.includes('tifa')) yield s.say('tifa', "Barret's hometown... Cloud, if Barret's down here too, we have to find him.");
      else if (crew.includes('aeris')) yield s.say('aeris', "Barret... I bet he's down here somewhere. Let's find him, okay?");
      yield s.say('Prisoner', "Big fella with a gun on his arm? Yeah, he came down a while back. Holed up in that shack over there. Wouldn't talk to nobody.");
      yield s.move('greeter', 24, 13);
      s.remove('greeter');
      crew.forEach(id => s.remove(id + '_ev'));
      yield s.say('cloud', "(Barret...)");
    },
  });

  function* raceIntro(s) {
    s.set('c6a_race_intro');
    s.music('badlands');
    s.spawn('barret_ev', 'barret', 17, 15, 'up', { name: s.name('barret') });
    yield s.move('coates', 16, 13);
    yield s.face('coates', 'player');
    yield s.say('Mr. Coates', "You... you went up against Dyne and came back? Then I guess that makes you the boss of this place now, whether you want it or not.");
    yield s.say('Mr. Coates', "And the boss is the one who picks who races. You still want outta here? Then one of you's gotta win a chocobo race.");
    s.spawn('ester', ESTER, 18, 4, 'down', { name: 'Ester' });
    yield s.run('ester', 18, 12);
    yield s.say('ester', "Mr. Coates! I came as soon as I heard. Is it true? You've got a new jockey for me?");
    yield s.face('ester', 'player');
    yield s.say('ester', "I'm Ester, a chocobo race manager. So YOU'RE the new boss... Hmm. Spiky hair, good build, cool eyes. You'll do!");
    yield s.say('barret', "Cloud. It's gotta be you. Win that race and get us the hell outta here.");
    yield s.say('cloud', "...Alright. I'll race.");
    yield s.say('ester', "Great! There's an elevator straight up to the jockey room. Come on, let's go!");
    s.remove('barret_ev');
    yield s.fadeOut(30);
    s.sfx('elevator');
    yield s.goto('gs_jockey', 'from_prison');
  }

  FF7.defineMap('prison_barret_house', {
    name: 'Corel Prison', area: 'Corel Desert', theme: 'house', music: 'badlands',
    look: { wall: '#8a7458', trim: '#4a3a28', floor: ['#7a6450', '#725c48'] },
    grid: [
      "################",
      "#b..x.....q..jj#",
      "#..............#",
      "#....t.c.......#",
      "#..............#",
      "#..............#",
      "########+#######",
    ],
    entries: { from_yard: [8, 5, 'up'] },
    exits: [{ at: [8, 6, 1, 1], to: 'prison_yard', entry: 'from_house', sfx: 'door' }],
    npcs: [
      { id: 'barret', name: 'Barret', model: 'barret', at: [9, 2], dir: 'up', faceOnTalk: false, show: s => !s.flag('c6a_barret_rejoined'),
        talk: function* (s) {
          s.music('traitor');
          yield s.say('barret', "...So they tossed y'all down here too. Sorry. That's on me.");
          yield s.say('cloud', "The people in the Battle Square were shot. By someone with a gun for an arm.");
          yield s.say('barret', "Yeah. Figured you'd think it was me.");
          yield s.face('barret', 'player');
          yield s.say('barret', "It wasn't. ...But I know who did it.\fThere's one other man in this world with a gun where his hand used to be. His name's Dyne.");
          yield s.say('barret', "Dyne and me grew up together in Corel. Best friends. Four years ago, the day Shinra burned the town... he lost his hand the same day I lost mine.\fI thought he died. Heard rumors, but... I never came lookin'.");
          yield s.say('barret', "Folks say he's out past the junkyard. This is somethin' I gotta settle myself.");
          yield s.say('cloud', "We're coming with you.");
          yield s.say('barret', "...Hmph. Can't talk you out of it, huh? ...Fine.");
          s.set('c6a_barret_rejoined');
          s.join('barret', { toParty: false });
          yield s.msg(`${s.name('barret')} rejoined the party.`);
          yield s.say('cloud', "(Barret has to come... Who else should go?)");
          yield s.choosePArty(['cloud', 'barret']);
          // FF7 date points: whoever goes along with Barret to see Dyne.
          if (s.inParty('aeris')) s.inc('aff_aeris', 10);
          else if (s.inParty('tifa')) s.inc('aff_tifa', 3);
          else if (s.inParty('yuffie')) s.inc('aff_yuffie', 2);
          s.hide('barret');
          s.music('badlands');
        } },
    ],
  });

  const pubShop = function* (s) { yield s.say('Barkeep', "Even in prison, a body needs potions. Prices are prison prices, though."); yield s.shop('corel_prison_items'); };
  FF7.defineMap('prison_pub', {
    camera: { pitch: 64, dist: 9.5 },   // seen from above (06b-chocobo10)
    name: 'Corel Prison Pub', area: 'Corel Desert', theme: 'bar', music: 'badlands',
    grid: [
      "##################",
      "#kk....q.....k.jj#",
      "#DDDD............#",
      "#.........t.c....#",
      "#..c.t....t.c....#",
      "#................#",
      "#................#",
      "########+#########",
    ],
    entries: { from_yard: [8, 6, 'up'] },
    exits: [{ at: [8, 7, 1, 1], to: 'prison_yard', entry: 'from_pub', sfx: 'door' }],
    npcs: [
      { id: 'barkeep', name: 'Barkeep', model: 'bartender', at: [3, 1], dir: 'down', talk: pubShop },
      { id: 'drunk', name: 'Prisoner', model: 'man21', at: [11, 5], dir: 'up',
        talk: function* (s) { yield s.say('Prisoner', "Dyne? That guy's crazy. Sits out on a cliff past the junkyard and shoots anybody who comes near. Talks to his dead wife, they say."); } },
      { id: 'cardsharp', name: 'Prisoner', model: 'woman14', at: [4, 4], dir: 'right',
        talk: function* (s) { yield s.say('Prisoner', "Deal you in? Stakes are whatever you got left. ...Which down here ain't much."); } },
    ],
    triggers: [counter([1, 2, 4, 1], pubShop)],
  });

  FF7.defineMap('prison_north', {
    name: 'Corel Prison', area: 'Corel Desert', theme: 'desert', music: 'badlands',
    battle: { table: 'corel_prison_well', bg: 'prison', rate: 0.5 },
    look: { wall: '#8a6a48', trim: '#4a3420', sky: ['#c89060', '#f0d8a8'] },
    grid: [
      "##############################",
      "#xx......yyy..........x......#",
      "#.........................x..#",
      "#....x..........OO...........#",
      "#...............OO...........#",
      "#..o.........................#",
      "#........x...........o.......#",
      "#............................#",
      "#..x..............x..........#",
      "#............................#",
      "#############dddd#############",
    ],
    entries: { from_yard: [14, 9, 'up'] },
    exits: [{ at: [13, 10, 4, 1], to: 'prison_yard', entry: 'from_north' }],
    npcs: [
      { id: 'hermit', name: 'Old Prisoner', model: 'oldman6', at: [6, 7], dir: 'right',
        talk: function* (s) { yield s.say('Old Prisoner', "Nothin' up this way but that creepy glass tube. The Saucer folks dumped a load of old lab junk down here years back."); } },
    ],
    objects: [
      { at: [10, 1], talk: function* (s) { yield s.msg('Inside the cracked glass tube lies the skeleton of some hound-like beast.\nAn old treasure chest sits beside it... empty.'); } },
      { at: [16, 3], talk: function* (s) { yield s.msg('A dried-up well. Something is skittering around down in the dark...'); } },
    ],
  });

  FF7.defineMap('prison_outskirts', {
    name: 'Corel Prison Outskirts', area: 'Corel Desert', theme: 'desert', music: 'badlands',
    battle: { table: 'corel_prison_outskirts', bg: 'prison' },
    look: { wall: '#8a6a48', trim: '#4a3420' },
    grid: [
      "###############dddd###############",
      "#x.............dddd..............#",
      "#..............dd................#",
      "#....R.........dd.........x......#",
      "#..............dd................#",
      "#..............ddddddddddddddddddd",
      "#..............ddddddddddddddddddd",
      "#..............dd.........R......d",
      "#sssss.........dd..........sssss.#",
      "#sssssssss.....dd.....ssssssssss.#",
      "#ssssssssssssssssssssssssssssssss#",
      "###############ssss###############",
    ],
    entries: { from_yard: [16, 1, 'down'], from_junkyard: [31, 6, 'left'], from_desert: [16, 10, 'up'] },
    exits: [
      { at: [15, 0, 4, 1], to: 'prison_yard', entry: 'from_outskirts' },
      { at: [33, 5, 1, 3], to: 'prison_junkyard', entry: 'from_outskirts' },
      { at: [15, 11, 4, 1], to: 'prison_desert', entry: 'from_outskirts' },
    ],
    npcs: [
      { id: 'lookout', name: 'Prisoner', model: 'man22', at: [8, 3], dir: 'right',
        talk: function* (s) { yield s.say('Prisoner', "East is the junkyard — Dyne's turf. South is the open desert. Wander too far out there and you'll never find your way back."); } },
    ],
  });

  const lost = function* (s) {
    yield s.msg('Sand in every direction... The dunes all look the same.');
    yield s.goto('prison_desert', 'lost');
  };
  FF7.defineMap('prison_desert', {
    name: 'Corel Desert', area: 'Corel Desert', theme: 'desert', music: 'badlands',
    battle: { table: 'corel_desert', bg: 'desert' },
    grid: [
      "###############ssss###############",
      "RssssssssssssssssssssssssssssssssR",
      "RssssssssssssssssssssssssssssssssR",
      "Rsssssssssssssss&&sssssssssssRsssR",
      "RssssRsssssssssssssssssssssssssssR",
      "RssssssssssssssssssssssssssssssssR",
      "RssssssssssssssssssssssRsssssssssR",
      "RssssssssssssssssssssssssssssssssR",
      "RsssssssssRssssssssssssssssssssssR",
      "RssssssssssssssssssssssssssssssssR",
      "RssssssssssssssssssssssssssssssssR",
      "ssssssssssssssssssssssssssssssssss",
    ],
    entries: { from_outskirts: [16, 1, 'down'], lost: [16, 2, 'down'], buggy: [17, 6, 'up'] },
    exits: [
      { at: [15, 0, 4, 1], to: 'prison_outskirts', entry: 'from_desert' },
      { at: [0, 11, 34, 1], run: lost },
    ],
    npcs: [
      { id: 'cart_driver', name: 'Cart Driver', model: 'man23', at: [18, 4], dir: 'down', show: s => !s.flag('has_buggy'),
        talk: function* (s) {
          const c = yield s.ask('Cart Driver', "Lost, are ya? Folks get lost out here all the time. Want a ride back to the prison? Free of charge.", ['Ride back', 'No thanks']);
          if (c !== 0) return;
          yield s.fadeOut(30);
          yield s.goto('prison_yard', 'from_outskirts');
        } },
      { id: 'cart_bird', name: 'Chocobo', model: 'chocobo', at: [15, 4], dir: 'down', show: s => !s.flag('has_buggy'),
        talk: function* (s) { s.sfx('chocobo'); yield s.msg('Kweh!'); } },
    ],
  });

  FF7.defineMap('prison_junkyard', {
    name: 'Corel Prison Junkyard', area: 'Corel Desert', theme: 'desert', music: 'badlands',
    battle: { table: 'corel_prison_junkyard', bg: 'prison' },
    look: { wall: '#7a5a40', trim: '#3a2818', floor: ['#a8885a', '#a08052'], floor2: ['#8a6a48', '#826242'] },
    grid: [
      "############################dddd####",
      "#xxx..xx....x.....xxx...xx..dddd..x#",
      "#x.......o.......x.......B...dd....#",
      "#....xx.......x........x.....dd..x.#",
      "#..........B..........xx......dd...#",
      "#...x.........xxx...........dd....x#",
      "d........o............B.....dd.....#",
      "ddddddddddddddddddddddddddddd......#",
      "d.....x.......x...........x........#",
      "#..xx.......B.......xx.........o...#",
      "#.........x........................#",
      "#...o.........xxx.........x.....xx.#",
      "#xx.........x..............x.....xx#",
      "####################################",
    ],
    entries: { from_outskirts: [1, 7, 'right'], from_dyne: [29, 1, 'down'] },
    exits: [
      { at: [0, 6, 1, 3], to: 'prison_outskirts', entry: 'from_junkyard' },
      { at: [28, 0, 4, 1], to: 'prison_dyne', entry: 'from_junkyard' },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_junk_seen') || s.flag('c6a_dyne_done')) return;
      s.set('c6a_junk_seen');
      yield s.say('barret', "...He's close. I can feel it. C'mon.");
    },
  });

  // ------------------------------------------------------------------ Dyne
  // (Config > Playable Flashbacks; not in the PS1 game: young Barret and Dyne, guests with miners' rifles, fight
  // their way through the burning town - a Shinra patrol, then Scarlet's squad - before the cliff. The party as it was
  // comes back at the end; the fights can't end the game)
  const FB = () => FF7.state.config.flashbacks !== false;
  const FB_FIGHT = { bg: 'corel', noEscape: true, canLose: true, noRewards: true };
  function* corelFlashback(s) {
    s.music('traitor');
    yield s.caption('Four years ago...\n\nCorel', { hold: 160, bg: '#000' });
    const play = FB();
    if (play) {
      s.setVar('c6a_fb_party', FF7.state.party.filter(Boolean).join(','));
      ['young_barret', 'young_dyne'].forEach(id => FF7.sys.party.joinGuest(id, 16));
      s.party(['young_barret', 'young_dyne']);
    }
    s.spawn('fb_barret', BARRET_YOUNG, 1, 4, 'right', { name: 'Barret' });
    s.spawn('fb_dyne', DYNE_YOUNG, 1, 5, 'right', { name: 'Dyne' });
    s.shake(2, 80);
    yield [s.run('fb_barret', 9, 4), s.run('fb_dyne', 9, 5)];
    yield s.say('barret', "Th-the town's on fire! What the hell's goin' on?!");
    yield s.say('Dyne', "Eleanor...! Marlene!! I've gotta find them!");
    if (play) {
      s.spawn('fb_pat1', 'soldier', 15, 4, 'left', { name: 'Soldier' });
      s.spawn('fb_pat2', 'soldier', 16, 5, 'left', { name: 'Soldier' });
      yield s.say('Soldier', "Two more of 'em! Don't let them reach the square!");
      yield s.say('barret', "Outta our way!!");
      yield s.battle(Object.assign({ enemies: ['soldier_3rd', 'soldier_3rd', 'grenade_combatant'] }, FB_FIGHT));
      s.remove('fb_pat1'); s.remove('fb_pat2');
      yield s.say('Dyne', "The house is past the square! Keep moving, Barret!");
    }
    s.spawn('fb_sol1', 'soldier', 18, 3, 'left', { name: 'Soldier' });
    s.spawn('fb_sol2', 'soldier', 19, 6, 'left', { name: 'Soldier' });
    s.spawn('fb_scarlet', 'scarlet', 21, 5, 'left', { name: 'Scarlet' });
    yield [s.run('fb_sol1', 14, 3), s.run('fb_sol2', 15, 6)];
    yield s.say('Scarlet', "There, two more of the saboteurs! No witnesses. That's an order.");
    if (play) {
      yield s.say('barret', "Saboteurs?! This is OUR town!");
      yield s.battle(Object.assign({ enemies: ['custom_sweeper', 'soldier_3rd', 'soldier_3rd'] }, FB_FIGHT));
      yield s.say('Scarlet', "Kya-ha-ha! Stubborn little miners. ...More men! Cut them off at the cliff!");
    }
    s.sfx('shot'); s.flash('#ffa040', 8, 0.6);
    yield s.say('Dyne', "Barret, this way! The cliff path!");
    yield [s.run('fb_barret', [[10, 1], [23, 1]]), s.run('fb_dyne', [[11, 2], [24, 2]])];
    s.sfx('falling');
    yield s.jump('fb_dyne', 25, 2, 0.3, 16);
    s.anim('fb_dyne', 'hurt');
    yield s.say('Dyne', "Whoa...!");
    yield s.move('fb_barret', 24, 2, { run: true });
    s.anim('fb_barret', 'kneel');
    yield s.say('barret', "Dyne! Grab my hand! Hold on, man!!");
    yield s.say('Dyne', "Barret...! Don't let go...!");
    yield [s.run('fb_sol1', 20, 1), s.run('fb_sol2', 20, 3), s.move('fb_scarlet', 19, 2)];
    yield s.say('Scarlet', "Ah-hahaha... how touching. Fire!");
    s.sfx('shot'); s.flash('#ffffff', 10); s.shake(4, 20);
    yield s.say('barret', "Aaargh!! My arm...!");
    s.sfx('shot'); s.flash('#ffffff', 10);
    yield s.say('Dyne', "Ugh...! Bar...ret...");
    s.sfx('falling');
    yield s.jump('fb_dyne', 27, 4, 0.2, 20);
    s.hide('fb_dyne');
    yield s.say('barret', "DYNE!!!");
    yield s.fadeOut(60, '#000');
    if (play) {   // back to the party as it was
      const saved = String(s.get('c6a_fb_party') || '').split(',').filter(id => id && !FF7.isGuest(id));
      ['young_barret', 'young_dyne'].forEach(id => { if (s.isMember(id)) s.leave(id); });
      if (saved.length) s.party(saved);
    }
  }

  FF7.defineMap('prison_flashback', {
    name: 'Corel (Four Years Ago)', area: 'Corel', theme: 'fire', hidePlayer: true,
    grid: [
      "hhwhhhhwhhhhhwhhhhhwhhhhh       ",
      "h........x...............C      ",
      "h..x....................oC      ",
      "h........................C      ",
      "hrrrrrrrrrrrrrrrrrrrrrrrrC      ",
      "h........................C      ",
      "h....x..........x........C      ",
      "h........................C      ",
      "h..o.........x...........C      ",
      "hhhhhhhhhhhhhhhhhhhhhhhhhh      ",
    ],
    lights: [[4, 1, '#ff6020', 4], [12, 1, '#ff8030', 5], [20, 1, '#ff6020', 4], [8, 8, '#ff5010', 3]],
    entries: { start: [12, 4, 'right'] },
  });

  FF7.defineMap('prison_dyne', {
    name: 'Corel Prison — Cliff', area: 'Corel Desert', theme: 'desert', music: 'badlands', playerModel: 'cloud',
    look: { wall: '#7a5a40', trim: '#3a2818', sky: ['#a86040', '#f0c890'] },
    grid: [
      "                              ",
      "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      "#x..........................x#",
      "#............................#",
      "#..x......................o..#",
      "#............................#",
      "#....B...............x.......#",
      "#............................#",
      "#..o.....................x...#",
      "#............................#",
      "#############dddd#############",
    ],
    entries: { from_junkyard: [14, 9, 'up'], after_flashback: [14, 6, 'up'] },
    exits: [{ at: [13, 10, 4, 1], to: 'prison_junkyard', entry: 'from_dyne' }],
    npcs: [
      { id: 'dyne', name: 'Dyne', model: 'dyne', at: [14, 2], dir: 'up', faceOnTalk: false, show: s => !s.flag('c6a_dyne_done'),
        talk: function* (s) { yield s.say('dyne', "......"); } },
    ],
    triggers: [
      { id: 'dyne', at: [1, 2, 28, 4], once: true, if: s => !s.flag('c6a_dyne_done'),
        run: function* (s) {
          // --- Barret finds Dyne at the cliff's edge.
          s.music('none');
          s.spawn('barret_ev', 'barret', 15, 6, 'up', { name: s.name('barret') });
          yield [s.move('barret_ev', 15, 4), s.move('player', 13, 5)];
          yield s.say('barret', "......Dyne.");
          yield s.face('dyne', 'down');
          yield s.say('dyne', "That voice... Barret? Heh... heheh. Well, well. It's been a long time.");
          s.music('traitor');
          yield s.say('barret', "Dyne... You're alive. I thought... I thought you died back then.");
          yield s.say('dyne', "Died? I suppose part of me did. That day, at the cliff...\fYou remember it, don't you, Barret?");
          yield s.goto('prison_flashback', 'start');
          yield* corelFlashback(s);
          yield s.goto('prison_dyne', 'after_flashback');
          s.spawn('barret_ev', 'barret', 15, 4, 'up', { name: s.name('barret') });
          s.place('player', 13, 5, 'up');
          yield s.face('dyne', 'down');
          yield s.say('dyne', "When I woke up at the bottom of that cliff, Corel was nothing but ash. Eleanor was gone.\fAnd my little Marlene... gone with her.");
          yield s.say('barret', "Dyne, listen to me! Marlene's alive! She's safe in Midgar! I've been lookin' after her all this time!");
          yield s.say('dyne', "...Marlene... is alive?\f......Then she must be so lonely. Without her mother.");
          yield s.say('dyne', "Don't worry. I'll send her to Eleanor, too. Then we can all be together again.");
          yield s.say('barret', "What?! Dyne... have you lost your damn mind?!");
          yield s.say('dyne', "This world... I'm going to tear all of it down. Shinra. The Saucer. Everyone laughing up there. All of it.\fYou were my friend, Barret. So I'll start with you.");
          yield s.face('barret_ev', 'player');
          yield s.say('barret', "Stay back, all of ya. This is between me and him.");
          yield s.face('barret_ev', 'dyne');
          // Barret fights alone.
          const before = partyNow(s);
          s.party(['barret']);
          yield s.battle({ table: 'boss_dyne', bg: 'prison', music: 'boss', noEscape: true });
          s.party(before.includes('barret') ? before : ['cloud', 'barret']);
          s.spawn('barret_ev', 'barret', 15, 4, 'up', { name: s.name('barret') });
          s.music('traitor');
          s.anim('dyne', 'kneel');
          yield 40;
          yield s.say('dyne', "...Barret... Think about it. How old was Marlene back then? She wouldn't even know my face.\fAnd these hands... they're too filthy now to ever hold her again.");
          s.stopAnim('dyne');
          yield s.say('dyne', "...This pendant. It was Eleanor's. Give it to Marlene... for me.");
          yield s.msg(`${s.name('barret')} received Eleanor's pendant.`);
          yield s.say('dyne', "Marlene... she'd be four now...\fBarret... don't you ever... make Marlene cry...");
          yield s.move('dyne', 14, 1, { speed: 0.015 });
          s.sfx('falling');
          yield s.jump('dyne', 14, 0, 0.2, 18);
          s.hide('dyne');
          s.set('c6a_dyne_done');
          yield 30;
          yield s.run('barret_ev', 14, 2);
          s.anim('barret_ev', 'kneel');
          yield s.say('barret', "DYNE!!!");
          yield 60;
          yield s.say('barret', "...Why, man...? Why'd it have to end like this...");
          yield s.say('barret', "'Too filthy,' huh... Mine ain't any cleaner, Dyne. The folks in Corel... the people in Midgar... I got blood on my hands too.\fI'm no different from you.");
          yield s.say('cloud', "...Barret.");
          s.stopAnim('barret_ev');
          yield s.face('barret_ev', 'player');
          yield s.say('barret', "......C'mon. Let's go. Somebody's gotta get this pendant home to Marlene.\fAnd I sure as hell ain't dyin' in no desert prison.");
          s.remove('barret_ev');
          yield s.fadeOut(40);
          yield s.goto('prison_yard', 'from_outskirts');
        } },
    ],
  });

  // ------------------------------------------------------------------ jockey room & the race
  const won = (r) => r === true || r === 'win' || r === 1 || !!(r && typeof r === 'object' && (r.won || r.win || r.rank === 1 || r.place === 1));
  FF7.story.c6a_race = function* (s) {
    const c = yield s.ask('ester', "Ready? Win this race, and you're a free man!", ["Let's race", 'Not yet']);
    if (c !== 0) return;
    if (!s.flag('c6a_race_explained')) {
      s.set('c6a_race_explained');
      const k = yield s.ask('ester', "Want me to go over how racing works?", ['Explain it', "I'll manage"]);
      if (k === 0) yield s.say('ester', "Your chocobo runs on its own, but you can steer it left and right.\fSpeed it up to pull ahead, but watch its stamina! If it runs out, your bird slows to a crawl.\fSave some stamina for a final dash near the finish line. That's where races are won!");
    }
    s.set('c6a_race_started');
    for (;;) {
      const r = yield s.minigame('chocobo_race', { forced: true });
      if (won(r)) break;
      yield s.say('ester', "Aww, so close! Don't give up — I talked Dio into giving you another shot. Let's go again!");
    }
    yield* raceWon(s);
  };

  function* raceWon(s) {
    s.music('success');
    yield s.say('ester', `You did it, ${s.name('cloud')}! You WON! You're free!`);
    yield s.say('ester', "Oh, and Mr. Dio asked me to give you this letter.");
    yield s.msg(`"To ${s.name('cloud')} and company:\nI have since learned that the man with the gun-arm was the true culprit. Please forgive my hasty judgment.\nAs a token of my apology, I have prepared a buggy for you. It can cross sand and shallow rivers alike.\nMay your journey be golden!\n\n— Dio, Owner of the Gold Saucer"`);
    yield s.say('ester', "The buggy's waiting at the edge of the desert. Your friends are already there. Take care, champ!");
    yield s.fadeOut(40);
    yield s.goto('prison_desert', 'buggy');
    yield* buggyEnding(s);
  }

  function* buggyEnding(s) {
    s.music('badlands');
    s.hide('cart_driver'); s.hide('cart_bird');
    const crew = ['barret', 'tifa', 'aeris', 'redxiii', 'yuffie', 'caitsith'].filter(id => s.isMember(id));
    const spots = [[15, 7], [19, 7], [14, 8], [20, 8], [16, 9], [18, 9]];
    crew.forEach((id, i) => s.spawn(id + '_end', id, spots[i][0], spots[i][1], 'up', { name: s.name(id) }));
    yield 30;
    if (crew.includes('barret')) yield s.say('barret', "Heh, not bad, Cloud! Guess Dio ain't such a jerk after all. ...Still wanna punch him, though.");
    if (crew.includes('caitsith')) yield s.say('caitsith', "A buggy! Now we're travellin' in style!");
    if (crew.includes('tifa')) yield s.say('tifa', "Sephiroth's got a big head start on us. Let's not waste any more time.");
    if (crew.includes('aeris')) yield s.say('aeris', "Can I drive? ...No? Hmph. Next time, then!");
    if (crew.includes('redxiii')) yield s.say('redxiii', "With this, we can cross the rivers to the south. My home, Cosmo Canyon, lies beyond them.");
    yield s.say('cloud', "Let's go. We head south, out of the desert.");
    crew.forEach(id => s.remove(id + '_end'));
    s.set('c6a_done');
    s.unset('c6a_gs_pass');   // the 1-day pass has expired; a new visit needs a new ticket
    s.phs(true);
    s.set('has_buggy');
    yield s.world({ x: 150, y: 215, vehicle: 'buggy' });
  }

  FF7.defineMap('gs_jockey', {
    camera: { pitch: 62, dist: 9.5 },   // seen from above (06b-chocobo18)
    name: "Jockey's Room", area: 'Gold Saucer', theme: 'goldsaucer', music: 'fiddle',
    look: { floor: ['#6a4a3a', '#644434'], wall: '#8a5a4a', trim: '#e0c040' },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXX",
      "hEEhhhhNhhhhhhhhh+hhhh",
      "h....................h",
      "h.q.q.q.q.......t.c..h",
      "h....................h",
      "h..........|.........h",
      "h....................h",
      "h..................q.h",
      "hhhhhhhhhhhhhhhhhhhhhh",
    ],
    entries: { from_prison: [2, 2, 'down'] },
    exits: [
      { at: [1, 1, 2, 1], run: function* (s) {
          const c = yield s.ask(null, 'Take the elevator back down to the prison?', ['Go down', 'Stay']);
          if (c === 0) { s.sfx('elevator'); yield s.goto('prison_yard', 'from_elevator'); return; }
          yield s.walk('player', 0, 1);
        } },
      { at: [17, 1, 1, 1], run: function* (s) {
          yield s.say('Jockey', "Hey, the track's this way — talk to your manager first, rookie!");
          yield s.walk('player', 0, 1);
        } },
    ],
    items: [{ at: [20, 6], materia: 'ramuh', id: 'gs_jockey_ramuh' }],
    npcs: [
      { id: 'ester', name: 'Ester', model: ESTER, at: [16, 2], dir: 'down', talk: FF7.story.c6a_race },
      { id: 'jockey1', name: 'Jockey', model: { base: 'man', top: '#e0e0e0', sleeve: '#c02020', bottom: '#f0f0f0', hairStyle: 'cap', hair: '#c02020', build: 'slim' }, at: [5, 4], dir: 'right',
        talk: function* (s) { yield s.say('Jockey', "A new face, huh? Don't let the prison guys fool ya — up here, the only thing that matters is your bird."); } },
      { id: 'jockey2', name: 'Jockey', model: { base: 'man', top: '#e0e0e0', sleeve: '#2040c0', bottom: '#f0f0f0', hairStyle: 'cap', hair: '#2040c0', build: 'slim' }, at: [9, 6], dir: 'up',
        talk: function* (s) { yield s.say('Jockey', "Hold back early and save your bird's stamina for the last stretch. That's the secret."); } },
    ],
    objects: [
      { at: [2, 3], talk: function* (s) { yield s.msg("A jockey's locker. Racing silks and a pair of worn gloves."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_jockey_intro')) return;
      s.set('c6a_jockey_intro');
      yield s.say('ester', "Welcome to the jockey room! Take a moment to get ready. Talk to me when you're set to race!");
    },
  });
})();

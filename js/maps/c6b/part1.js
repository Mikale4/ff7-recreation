// Chapter 6b (part 1) — Gongaga: the jungle (Reno, Rude and Elena), the ruined Gongaga reactor
// (Scarlet and Tseng, the Titan materia), Gongaga village (shops, inn, graves) and Zack's parents.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  // ------------------------------------------------------------------ helpers
  const MEMBERS = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const others = (s) => MEMBERS.filter(id => s.inParty(id));
  // Spawn the other active party members for a cutscene; returns their ids.
  function spawnParty(s, spots) {
    const ids = others(s).slice(0, spots.length);
    ids.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'up', { name: s.name(id) }));
    return ids;
  }
  const clearParty = (s, ids) => ids.forEach(id => s.remove(id));
  const has = (ids, id) => ids.indexOf(id) >= 0;
  // "examine" spot on a shop counter (the clerk stands behind it, out of talk range)
  const counter = (at, run) => ({ at, on: 'talk', run });

  FF7.world.link('gongaga', { map: 'gongaga_jungle1', entry: 'from_world' });

  // ================================================================== the jungle: Reno, Rude and Elena
  function* turksScene(s) {
    s.music('turks');
    yield s.move('player', 14, 8);
    yield s.face('player', 'up');
    const pty = spawnParty(s, [[13, 9, 'up'], [15, 9, 'up']]);
    yield s.say('cloud', "(...Voices. Somebody's up ahead.)");
    yield s.cam(14, 3, 50);
    yield s.say('reno', "Bugs, mud, humidity... Remind me why the Turks always get stuck with the jungle jobs?");
    yield s.say('rude', "......");
    yield s.say('reno', "Hey, Rude. Lemme ask you somethin'. Just between partners.\fWhat kinda girl are you into?");
    yield s.face('rude', 'reno');
    yield s.say('rude', "......");
    yield s.say('reno', "Aw, c'mon, don't gimme the silent treatment.\f...It's that Tifa, ain't it? The one who hits like a runaway train.");
    s.anim('rude', 'nod');
    yield 30;
    if (has(pty, 'tifa')) yield s.emote('tifa', '?!');
    yield s.say('reno', "Heh. I knew it. Figures you'd fall for the one girl who could knock your shades off.\fGuess everybody's got somebody. Our rookie's head over heels for Tseng...");
    yield s.say('rude', "...And Tseng?");
    yield s.say('reno', "Tseng? Pfft. He's still hung up on that Ancient. The flower girl.\fMan... this outfit's a soap opera.");
    if (has(pty, 'aeris')) yield s.emote('aeris', '...');
    // the rookie arrives
    s.spawn('elena', 'elena', 14, 0, 'down', { name: 'Elena' });
    yield s.run('elena', 14, 2);
    s.face('reno', 'elena');
    yield s.face('rude', 'elena');
    yield s.say('elena', "Reno! Rude! What are you two doing, just standing around!?");
    yield s.say('reno', "Talkin' about you, actually.");
    yield s.say('elena', "M-me!? ...No. Never mind. I don't want to know.\fListen up! Cloud's group has been sighted in this area. Our orders are to stop them here.");
    yield s.say('elena', "Tseng is meeting Scarlet over at the old reactor, so it's all up to us--\f...Oh. Wait. I probably wasn't supposed to tell anyone where Tseng is.");
    yield s.say('reno', "Probably not, no.");
    yield s.say('elena', "Wh-whatever! I'm going to go report in. Don't you DARE mess this up!");
    yield s.run('elena', 14, 0);
    s.remove('elena');
    yield s.say('reno', "Rookies. ...Anyway.");
    s.face('reno', 'down');
    yield s.face('rude', 'down');
    yield s.cam(14, 6, 30);
    yield s.say('reno', "You can come out now. You guys hide about as well as you sneak.");
    const walk = [s.move('player', 14, 6)];
    if (pty[0]) walk.push(s.move(pty[0], 13, 7));
    if (pty[1]) walk.push(s.move(pty[1], 15, 7));
    yield walk;
    yield [s.move('reno', 15, 4), s.move('rude', 13, 4)];
    yield s.say('cloud', "......");
    yield s.say('reno', "Nothin' personal, yo. A job's a job.");
    if (has(pty, 'tifa')) {
      yield s.face('rude', 'tifa');
      yield s.emote('rude', '...');
      yield s.face('rude', 'down');
    }
    yield s.say('rude', "......Orders are orders.");
    yield s.battle({ table: 'boss_turks_gongaga', bg: 'jungle', music: 'turks', noEscape: true });
    // they "regroup"
    s.place('reno', 15, 4, 'down'); s.place('rude', 13, 4, 'down');
    s.place('player', 14, 6, 'up');
    s.anim('reno', 'kneel');
    yield s.say('reno', "Ugh... okay, okay! Time out! We'll call this one a draw, yo.");
    s.stopAnim('reno');
    yield s.say('rude', "......Retreating.");
    yield [s.run('reno', 15, 0), s.run('rude', 13, 0)];
    s.hide('reno'); s.hide('rude');
    s.set('c6b_turks_done');
    if (has(pty, 'barret')) yield s.say('barret', "Hah! Look at 'em run. Shinra's finest, my ass.");
    else if (has(pty, 'yuffie')) yield s.say('yuffie', "Pfft! Some elite squad. They didn't even drop any good materia.");
    if (has(pty, 'aeris')) yield s.say('aeris', "Tseng is here too... at the reactor, she said.");
    s.music('parochial');
    s.camFollow();
    clearParty(s, pty);
  }

  FF7.defineMap('gongaga_jungle1', {
    name: 'Gongaga Jungle', area: 'Gongaga', theme: 'jungle', music: 'parochial',
    battle: { table: 'gongaga_jungle_1', bg: 'jungle', rate: 1 },
    grid: [
      "VVVVVVVVVVVVVdddVVVVVVVVVVVVVV",
      "VTTT%TTTTTT%GdddG%TTTTTT%TTTTV",
      "VT,,,,G,,,,,,ddd,,,,,,G,,,,,TV",
      "VT,G,,,,%,,,,ddd,,,,,,,,,G,,TV",
      "V%,,,,,,,,,,,ddd,,,%,,,,,,,,%V",
      "dd,,,,,,,,,,,ddd,,,,,,,,,,,,TV",
      "dddddddddddddddd,,,,,,G,,,,,TV",
      "dd,,,,,,,,,,,ddd,,,,,,,,,,,,,V",
      "V%,,,G,,,,,,,ddd,,,,,,,%,,,,TV",
      "VT,,,,,,,,,,,ddd,,%,,,,,,,G,TV",
      "VTT,,,%,,,,,,ddd,,,,,,,,,,,TTV",
      "VT,,,,,,,,G,,ddd,,,,,,G,,,,,TV",
      "VTTT%,,,,,,,,ddd,,,,,,,,,%TTTV",
      "%%%%%%%%%%%%%ddd%%%%%%%%%%%%%%",
    ],
    entries: { from_world: [14, 12, 'up'], from_wasteland: [14, 1, 'down'], from_jungle2: [1, 6, 'right'] },
    exits: [
      { at: [13, 13, 3, 1], to: 'world', loc: 'gongaga' },
      { at: [13, 0, 3, 1], to: 'gongaga_wasteland', entry: 'from_jungle' },
      { at: [0, 5, 1, 3], to: 'gongaga_jungle2', entry: 'from_jungle1' },
    ],
    npcs: [
      { id: 'reno', name: 'Reno', model: 'reno', at: [15, 3], dir: 'left', show: s => !s.flag('c6b_turks_done') },
      { id: 'rude', name: 'Rude', model: 'rude', at: [13, 3], dir: 'right', show: s => !s.flag('c6b_turks_done') },
    ],
    triggers: [
      { id: 'turks', at: [1, 8, 28, 1], once: true, if: s => !s.flag('c6b_turks_done'),
        run: function* (s) { yield* turksScene(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6b_gongaga_arrived')) return;
      s.set('c6b_gongaga_arrived');
      yield s.say('cloud', "(Thick jungle... There's supposed to be a village somewhere in here. Gongaga.)");
    },
  });

  // ------------------------------------------------------------------ the jungle crossroads
  FF7.defineMap('gongaga_jungle2', {
    name: 'Gongaga Jungle', area: 'Gongaga', theme: 'jungle', music: 'parochial',
    battle: { table: 'gongaga_jungle_2', bg: 'jungle', rate: 1 },
    grid: [
      "VVVVVVVVVVVVVVVVVdddVVVVVVVVVV",
      "VTTT%TTTTTTTT%GGGdddG%TTTTTTTV",
      "VT,,,,,,,,,,,,,,,ddd,,,,,,,,TV",
      "VT,,G,,,,,,,,,,,,ddd,,,,,G,,TV",
      "V%,,,,,,,%,,,,,,,ddd,,,,,,,,%V",
      "VT,,,,,,,,,,,,,,,ddd,,,,,,,,dd",
      "dddddddddddddddddddddddddddddd",
      "dd,,,,G,,,,,,,,,,,,,,,,,,,,,dd",
      "V%,,,,,,,,,,%,,,,,,,G,,,,,,,%V",
      "VT,,,G,,,,,,,,,,,,,,,,,,%,,,TV",
      "VTT,,,,,,,,,,,,,,,,,,,,,,,,TTV",
      "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
    ],
    entries: { from_jungle1: [28, 6, 'left'], from_village: [18, 1, 'down'] },
    exits: [
      { at: [17, 0, 3, 1], to: 'gongaga_village', entry: 'from_jungle' },
      { at: [29, 5, 1, 3], to: 'gongaga_jungle1', entry: 'from_jungle2' },
      { at: [0, 6, 1, 2], to: 'world', loc: 'gongaga' },
    ],
    items: [{ at: [4, 7], materia: 'deathblow', id: 'gongaga_jungle2_deathblow' }],
  });

  // ================================================================== the wasteland and the ruined reactor
  const SCORCHED = {
    floor: ['#5a5448', '#544e42'], floor2: ['#6a5e4c', '#645846'], wall: '#5a605a', trim: '#303430',
    sky: ['#3a4636', '#8a9480'], grass: ['#4a5a30', '#44542c'],
    fog: { color: [0.36, 0.4, 0.32], near: 10, far: 26 },
  };

  FF7.defineMap('gongaga_wasteland', {
    name: 'Gongaga Reactor Area', area: 'Gongaga', theme: 'jungle', look: SCORCHED, music: 'parochial',
    battle: { table: 'gongaga_reactor', bg: 'reactor', rate: 1 },
    grid: [
      "RRRRRRRRRRRR:::RRRRRRRRRRRRR",
      "RR.x.....Y..:::...x.....YRRR",
      "R..........:::.........x...R",
      "R...Y.....:::......R.......R",
      "R.x......:::...........Y...R",
      "R.......:::......x.........R",
      "R...R...:::...........R....R",
      "R.......::::.......x.......R",
      "R..Y......:::..............R",
      "R.....x.....:::....Y.......R",
      "R..........:::.......x.....R",
      "RR....Y.....:::..........RRR",
      "RRR..........:::.........RRR",
      "RRRRRRRRRRRRR:::RRRRRRRRRRRR",
    ],
    entries: { from_jungle: [14, 12, 'up'], from_reactor: [13, 1, 'down'] },
    exits: [
      { at: [13, 13, 3, 1], to: 'gongaga_jungle1', entry: 'from_wasteland' },
      { at: [12, 0, 3, 1], to: 'gongaga_reactor', entry: 'from_wasteland' },
    ],
    objects: [
      { at: [9, 1], talk: function* (s) { yield s.msg("A charred tree stump. Nothing grows back here."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6b_wasteland_seen')) return;
      s.set('c6b_wasteland_seen');
      yield s.say('cloud', "(The jungle just... stops. Everything past here is burned to ash.)");
      if (s.inParty('barret')) yield s.say('barret', "Smells like a reactor went up. I'd know that stink anywhere.");
    },
  });

  function* reactorScene(s) {
    // hide behind the wreckage
    yield s.say('cloud', "(Footsteps... Get down!)");
    yield s.run('player', 4, 5);
    yield s.face('player', 'right');
    const pty = spawnParty(s, [[3, 6, 'right'], [2, 5, 'right']]);
    s.music('turks');
    yield s.cam(13, 6, 40);
    s.spawn('scarlet', 'scarlet', 12, 12, 'up', { name: 'Scarlet' });
    s.spawn('tseng', 'tseng', 11, 12, 'up', { name: 'Tseng' });
    yield [s.move('scarlet', [[12, 7], [14, 3]]), s.move('tseng', [[11, 7], [12, 4]])];
    yield s.face('scarlet', 'up');
    yield s.say('scarlet', "Kyahahaha! What a dump. Look at this place, Tseng. Nothing left but scrap metal.");
    yield s.face('tseng', 'scarlet');
    yield s.say('tseng', "The explosion took the core with it. The company decided it wasn't worth rebuilding.");
    s.anim('scarlet', 'kneel');
    yield 50;
    yield s.say('scarlet', "...Just as I thought. Junk! Nothing in here but junk materia.\fNo Huge Materia. Not a single crumb of it.");
    s.stopAnim('scarlet');
    yield s.face('scarlet', 'tseng');
    yield s.say('tseng', "Then there's nothing more for us here.");
    yield s.say('scarlet', "The President wants the big ones, not pebbles. We'll just have to squeeze the reactors that still work. Kyahaha!");
    // Elena reports
    s.spawn('elena', 'elena', 13, 12, 'up', { name: 'Elena' });
    yield s.run('elena', 14, 5);
    yield s.face('tseng', 'elena');
    yield s.say('elena', "Tseng! Sir! Reporting in!");
    yield s.say('tseng', "Go ahead.");
    yield s.say('elena', "Reno and Rude engaged Cloud's party in the jungle, and... well...\fThey're, um, 'regrouping', sir.");
    yield s.say('tseng', "...I see.");
    yield s.say('elena', "And there's still no sign of the Ancie-- of Aeris, sir. Should I--");
    yield s.say('tseng', "That's enough, Elena. Our orders are Sephiroth. Stay focused.");
    yield s.say('elena', "Y-yes, sir!");
    yield s.say('scarlet', "Kyahahaha! Such devotion. I'm going back on the airship. Try to keep your little team in line, Tseng.");
    yield [s.move('scarlet', [[12, 7], [12, 12]]), s.move('tseng', [[11, 7], [11, 12]]), s.move('elena', [[13, 7], [13, 12]])];
    s.remove('scarlet'); s.remove('tseng'); s.remove('elena');
    s.sfx('helicopter');
    s.shake(2, 60);
    yield s.msg("The roar of an airship's engines rises beyond the ruins, then fades into the distance.");
    s.music('parochial');
    yield s.cam(6, 5, 20);
    yield s.move('player', 9, 5);
    if (has(pty, 'barret')) yield s.say('barret', "Huge Materia, huh... Whatever Shinra's diggin' for, it ain't gonna be good news for the Planet.");
    if (has(pty, 'aeris')) yield s.say('aeris', "Tseng... he sounded almost worried. Strange.");
    if (has(pty, 'caitsith')) yield s.say('caitsith', "Huge Materia... Er, never heard of it! Nope! Not me!");
    if (has(pty, 'tifa')) yield s.say('tifa', "Junk materia, she said... Maybe it's not all junk. Let's look where she was poking around.");
    yield s.say('cloud', "(Scarlet was kneeling by that crack in the reactor wall...)");
    s.set('c6b_reactor_scene');
    s.camFollow();
    clearParty(s, pty);
  }

  FF7.defineMap('gongaga_reactor', {
    name: 'Gongaga Reactor', area: 'Gongaga', theme: 'jungle', music: 'parochial',
    battle: { table: 'gongaga_reactor', bg: 'reactor', rate: 0.8 },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XPPMhhhhhhhhhhhhhhhhhhhhhMPPXX",
      "XP..hhhhhhhhhxxxhhhhhhhhh..PXX",
      "X.....x...............x.....XX",
      "X..P.......................P.X",
      "X.....**.....x........**.....X",
      "X....***..............***....X",
      "X.x...........B.............xX",
      "X......x..............x......X",
      "X...o.......................RX",
      "X..........::::..........x...X",
      "XRR.......::::::.........RRRXX",
      "RRRRRR....::::::......RRRRRRRR",
      "RRRRRRRRRR:::::RRRRRRRRRRRRRRR",
    ],
    look: Object.assign({}, SCORCHED, { mako: '#5ac080' }),
    lights: [[6, 6, '#80ffb0', 2.5], [23, 6, '#80ffb0', 2.5]],
    entries: { from_wasteland: [12, 12, 'up'] },
    exits: [{ at: [10, 13, 5, 1], to: 'gongaga_wasteland', entry: 'from_reactor' }],
    objects: [
      { at: [14, 2], if: s => s.flag('c6b_reactor_scene') && !s.flag('c6b_titan'), talk: function* (s) {
        yield s.msg("Deep inside the crack Scarlet was prodding at, something glows a soft red.");
        s.set('c6b_titan');
        yield s.giveMateria('titan');
        yield s.say('cloud', "(\"Junk\", huh. Her loss.)");
      } },
      { at: [14, 2], if: s => s.flag('c6b_titan'), talk: function* (s) { yield s.msg("A deep crack in the ruined reactor wall. Only rubble is left inside."); } },
      { at: [27, 4], talk: function* (s) { yield s.msg("Twisted pipes, blackened by the blast. A faded Shinra logo is still visible on one of them."); } },
    ],
    triggers: [
      { id: 'scarlet', at: [1, 3, 27, 2], once: true, if: s => !s.flag('c6b_reactor_scene'),
        run: function* (s) { yield* reactorScene(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6b_reactor_seen')) return;
      s.set('c6b_reactor_seen');
      yield s.say('cloud', "(A Mako reactor... or what's left of one. Blown wide open.)");
    },
  });

  // ================================================================== Gongaga village
  const graveTalk = function* (s) {
    yield s.msg("A simple grave marker. Every name carved into these stones shares the same date:\nthe day the reactor exploded.");
  };

  FF7.defineMap('gongaga_village', {
    name: 'Gongaga', area: 'Gongaga', theme: 'jungle', music: 'parochial',
    look: { floor2: ['#8a6a44', '#82623e'], floor3: ['#7a5a3a', '#725234'] },
    grid: [
      "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "VTThhhhhhhT%TVVhhhhhVVT%TThhhhhhTTTV",
      "VT%hhhhhhh%TT::hh+hh::T%%%hhhhhh%TTV",
      "VT,hhh+hhh,,T:::::::::T,,,hh+hhh,,TV",
      "V%,,,,,,,,,,T:::::::::T,,,,,,,,,,,%V",
      "V,,,,,,,,,,,,%%%%H%%%%,,,,,,,,,,,,,V",
      "V,,,,,,,,,,,,,,,,d,,,,,,,,,,%%%%%%,V",
      "V,,,,,,,,,,,,,,,,d,,,,,,,,,,hhhhhh,V",
      "V%%%%%%,,,,,,,,,,d,,,,,,,,,,hhhhhh,V",
      "Vhhhhhh,,,,,,,,,,d,,,,,,,,,,hh+hhh,V",
      "Vhhhhhh,,,,,,,,,fff,,,,,,,,,ddd,,,,V",
      "Vhh+hhh,ddddddddfOfdddddddddd,,,,,,V",
      "V,,d,,,,,,,,,,,,fff,,,,,,,,,,,,,,,,V",
      "V,,,,,,,,,,,,,,,,d,,,,,,,,%%%%%%%,,V",
      "V,==========,,,,,d,,,,,,,,hhhhhhh,,V",
      "V,=u,u,u,u,=,,,,,d,,,,,,,,hhhhhhh,,V",
      "V,=ffffffff=,,,,,d,,,,,,,,hhh+hhh,,V",
      "V,=,u,u,u,,=,,,,,d,,,,,,,,,,,d,,,,,V",
      "V,===,,=====,,,,,d,,,,,,,,,,,d,,,,,V",
      "V,,,,,,,,,,,,,,,,ddddddddddddd,,,,,V",
      "V%,,,G,,,,,,,,,,dddd,,,,,,,,G,,,,,%V",
      "%%%%%%%%%%%%%%%%dddd%%%%%%%%%%%%%%%%",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000055555555500000000000000",
      "000000000000055555555500000000000000",
      "000000000000055555555500000000000000",
      "000000000000055555555500000000000000",
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
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    save: [22, 20],
    entries: {
      from_jungle: [17, 20, 'up'], from_inn: [6, 4, 'down'], from_weapon: [17, 3, 'down'],
      from_house: [28, 4, 'down'], from_items: [30, 10, 'down'], from_acc: [3, 12, 'down'], from_zack: [29, 17, 'down'],
    },
    exits: [
      { at: [16, 21, 4, 1], to: 'gongaga_jungle2', entry: 'from_village' },
      { at: [6, 3, 1, 1], to: 'gongaga_inn', entry: 'from_village', sfx: 'door' },
      { at: [17, 2, 1, 1], to: 'gongaga_weapon', entry: 'from_village', sfx: 'door' },
      { at: [28, 3, 1, 1], to: 'gongaga_house', entry: 'from_village', sfx: 'door' },
      { at: [30, 9, 1, 1], to: 'gongaga_items', entry: 'from_village', sfx: 'door' },
      { at: [3, 11, 1, 1], to: 'gongaga_acc', entry: 'from_village', sfx: 'door' },
      { at: [29, 16, 1, 1], to: 'gongaga_zack', entry: 'from_village', sfx: 'door' },
    ],
    npcs: [
      { id: 'villager', name: 'Villager', model: 'man5', at: [10, 6], dir: 'down', talk: function* (s) {
        yield s.say('Villager', "Welcome to Gongaga. Not much to see these days.\fA few years back, the reactor up the hill blew sky-high. Shinra called it an 'accident'.\fHalf the village was working there that day.");
      } },
      { id: 'elder', name: 'Old Man', model: 'oldman2', at: [25, 4], dir: 'left', talk: function* (s) {
        yield s.say('Old Man', "The mayor keeps saying we ought to ask Shinra to build us a new reactor. Jobs, money, electric lights...\fHmph. And what happens when that one blows up, too?");
      } },
      { id: 'woman', name: 'Woman', model: 'woman6', at: [22, 12], dir: 'left', wander: 2, talk: function* (s) {
        yield s.say('Woman', "Some folks say losing the reactor was a blessing in disguise.\fIt's strange... ever since it stopped running, the jungle's been growing back greener than ever.");
      } },
      { id: 'kid', name: 'Boy', model: 'kid3', at: [21, 17], dir: 'left', wander: 3, talk: function* (s) {
        yield s.say('Boy', "When I grow up I'm gonna join SOLDIER! Just like Zack!\fZack's from the house over there. He's a hero in Midgar! ...I think. Nobody's seen him in forever.");
      } },
      { id: 'mourner', name: 'Old Woman', model: 'oldwoman3', at: [7, 16], dir: 'up', talk: function* (s) {
        yield s.say('Old Woman', "My husband was working at the reactor the day it exploded.\fI come here every morning and tell him what's new in the village. ...Not that much ever is.");
      } },
      { id: 'lookout', name: 'Man', model: 'man8', at: [14, 3], dir: 'down', talk: function* (s) {
        yield s.say('Man', "Best view in Gongaga from up here. You can see all the way to the old reactor.\fThe weapon shop's right behind me. Mind the ladder on the way down.");
      } },
    ],
    objects: [[3, 15], [5, 15], [7, 15], [9, 15], [4, 17], [6, 17], [8, 17]].map(p => ({ at: p, talk: graveTalk })),
    onEnter: function* (s) {
      if (s.flag('c6b_village_seen')) return;
      s.set('c6b_village_seen');
      if (s.inParty('aeris')) yield s.say('aeris', "What a quiet little village. It smells like rain and flowers.");
      else if (s.inParty('tifa')) yield s.say('tifa', "A little village, hidden out in the jungle... It reminds me a bit of home.");
    },
  });

  // ------------------------------------------------------------------ inn (also used later: Cloud wakes here on Disc 1)
  FF7.defineMap('gongaga_inn', {
    name: 'Gongaga Inn', area: 'Gongaga', theme: 'house',
    grid: [
      "####################",
      "#b.b.b.b..k..F...kq#",
      "#..................#",
      "#.........tc....DDD#",
      "#..................#",
      "#o.................#",
      "#..................#",
      "#########+##########",
    ],
    entries: { from_village: [9, 6, 'up'], wake: [2, 2, 'down'] },
    exits: [{ at: [9, 7, 1, 1], to: 'gongaga_village', entry: 'from_inn', sfx: 'door' }],
    chests: [{ at: [18, 5], item: 'x_potion', id: 'gongaga_inn_xpotion' }],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman2', at: [17, 2], dir: 'down', talk: function* (s) {
        yield s.inn(80, { who: 'Innkeeper', text: "Welcome! A night's rest is 80 gil. Would you like to stay?" });
      } },
      { id: 'guest', name: 'Traveler', model: 'man6', at: [11, 5], dir: 'up', talk: function* (s) {
        yield s.say('Traveler', "I came all this way to sell equipment to the reactor workers.\fGuess I'm a few years too late, huh?");
      } },
    ],
    triggers: [counter([16, 3, 3, 1], function* (s) {
      yield s.inn(80, { who: 'Innkeeper', text: "Welcome! A night's rest is 80 gil. Would you like to stay?" });
    })],
  });

  // ------------------------------------------------------------------ house (upper right)
  FF7.defineMap('gongaga_house', {
    name: 'Gongaga House', area: 'Gongaga', theme: 'house',
    grid: [
      "##################",
      "#kk..q...F...b.b.#",
      "#................#",
      "#....tc..........#",
      "#................#",
      "#..............j.#",
      "#................#",
      "#................#",
      "########+#########",
    ],
    entries: { from_village: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 1, 1], to: 'gongaga_village', entry: 'from_house', sfx: 'door' }],
    chests: [{ at: [15, 3], item: 'white_m_phone', id: 'gongaga_house_mphone' }],
    npcs: [
      { id: 'mother', name: 'Woman', model: 'woman8', at: [8, 4], dir: 'down', talk: function* (s) {
        yield s.say('Woman', "Oh, do help yourself to whatever's in that chest. My husband bought it off a traveling merchant.\fA megaphone, of all things! Who needs a megaphone in a village this small?");
      } },
      { id: 'girl', name: 'Girl', model: 'girl2', at: [12, 6], dir: 'left', wander: 2, talk: function* (s) {
        yield s.say('Girl', "Did you come from the jungle? Were there frogs? I like frogs.\fBut not the ones that turn YOU into frogs. Those are mean.");
      } },
    ],
  });

  // ------------------------------------------------------------------ item shop
  const itemShop = function* (s) {
    yield s.say('Shopkeeper', "Welcome, welcome! Stock up before you head back into that jungle.");
    yield s.shop('gongaga_items');
  };
  FF7.defineMap('gongaga_items', {
    camera: { pitch: 66, dist: 9 },   // round house seen from above (06b-chocobo36)
    name: 'Gongaga Item Shop', area: 'Gongaga', theme: 'house',
    grid: [
      "################",
      "#q.kk.....jj.BB#",
      "#..............#",
      "#....DDDDD.....#",
      "#..............#",
      "#..............#",
      "#######+########",
    ],
    entries: { from_village: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'gongaga_village', entry: 'from_items', sfx: 'door' }],
    npcs: [{ id: 'clerk', name: 'Shopkeeper', model: 'man2', at: [7, 2], dir: 'down', talk: itemShop }],
    triggers: [counter([5, 3, 5, 1], itemShop)],
  });

  // ------------------------------------------------------------------ accessory shop (accessories + materia on one counter)
  const accShop = function* (s) {
    const c = yield s.ask('Shopkeeper', "Welcome! Accessories or materia? We've got a little of both.", ['Accessories', 'Materia', 'Nothing today']);
    if (c === 0) yield s.shop('gongaga_accessories');
    else if (c === 1) yield s.shop('gongaga_materia');
    else yield s.say('Shopkeeper', "Come back anytime!");
  };
  FF7.defineMap('gongaga_acc', {
    camera: { pitch: 66, dist: 9 },   // round house seen from above (06b-chocobo38)
    name: 'Gongaga Accessory Shop', area: 'Gongaga', theme: 'house',
    grid: [
      "################",
      "#kk.q..U..q.kk.#",
      "#..............#",
      "#..DDDDD.......#",
      "#..............#",
      "#.........t.c..#",
      "#######+########",
    ],
    entries: { from_village: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'gongaga_village', entry: 'from_acc', sfx: 'door' }],
    npcs: [
      { id: 'clerk', name: 'Shopkeeper', model: 'woman5', at: [5, 2], dir: 'down', talk: accShop },
      { id: 'customer', name: 'Man', model: 'man9', at: [11, 4], dir: 'left', talk: function* (s) {
        yield s.say('Man', "Time materia, Mystify materia... You can't get these just anywhere, y'know.\fThe owner won't say where she gets 'em. I've stopped asking.");
      } },
    ],
    triggers: [counter([3, 3, 5, 1], accShop)],
  });

  // ------------------------------------------------------------------ weapon shop (up the ladder)
  const weaponShop = function* (s) {
    yield s.say('Shopkeeper', "Made it up the ladder, eh? Then you're fit enough to swing one of these!");
    yield s.shop('gongaga_weapons');
  };
  FF7.defineMap('gongaga_weapon', {
    name: 'Gongaga Weapon Shop', area: 'Gongaga', theme: 'house',
    look: { wall: '#8a6a44', floor: ['#7a5a36', '#725232'] },
    grid: [
      "################",
      "#BB.o..PP..k.oB#",
      "#..............#",
      "#.....DDDD.....#",
      "#..............#",
      "#..............#",
      "#######+########",
    ],
    entries: { from_village: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'gongaga_village', entry: 'from_weapon', sfx: 'door' }],
    npcs: [{ id: 'clerk', name: 'Shopkeeper', model: 'man4', at: [8, 2], dir: 'down', talk: weaponShop }],
    triggers: [counter([6, 3, 4, 1], weaponShop)],
  });

  // ------------------------------------------------------------------ Zack's parents
  function* zackScene(s, withFriends) {
    const pty = withFriends ? spawnParty(s, [[7, 7, 'up'], [9, 7, 'up']]) : [];
    yield s.move('player', 8, 5);
    yield s.face('zack_mother', 'player');
    yield s.say('zack_mother', "Oh! Visitors? We don't get many of those...\fMy, look at that uniform. Are you in SOLDIER, young man?");
    yield s.say('cloud', "...Used to be.");
    yield s.face('zack_father', 'player');
    yield s.say('zack_father', "SOLDIER, eh? Then maybe you've crossed paths with our boy. Zack.\fHe ran off to Midgar to join up. Must be... going on ten years now.");
    yield s.say('zack_mother', "He wrote us that he'd made 1st Class. You could practically hear him grinning through the page.\fAnd then the letters just... stopped. Not a word, for years.");
    yield s.say('zack_mother', "Black hair, always smiling, couldn't sit still for five minutes. Do you know him?");
    if (has(pty, 'aeris')) yield s.emote('aeris', '!');
    if (has(pty, 'tifa')) yield s.emote('tifa', '...');
    yield s.say('cloud', "......Zack.");
    yield 40;
    yield s.say('cloud', "...No. Never heard of him.");
    yield s.say('zack_father', "Hmph. Figures. That fool's probably too busy playing hero to write his old man.");
    yield s.say('zack_mother', "If you ever do run into him... tell him to come home. Just once.\fTell him his mother's waiting.");
    s.set('c6b_zack_heard');
    if (withFriends) s.set('c6b_zack_friends');
    if (!withFriends || !pty.length) { clearParty(s, pty); return; }
    // FF7 date points: leaving Aeris or Tifa alone afterwards costs her 3; talking to Tifa wins her 1,
    // and Aeris +1 ("poor guy") or +2 (a jealous thought)
    if (has(pty, 'aeris')) {
      yield s.face('player', 'aeris');
      yield s.emote('aeris', '...');
      const DPA = [{ aeris: 2 }, { aeris: -3 }];
      const a = yield s.ask('cloud', '', ['(Talk to {AERIS}.)', '(Leave her be.)'], { noQuotes: true, date: DPA });
      if (a !== 0) FF7.story.datePts(s, DPA[1]);
      else {
        yield s.face('aeris', 'player');
        yield s.say('cloud', "Aeris. You know him?");
        yield s.say('aeris', "Hm? ...Oh. Yes. A long time ago.\fHe was... the first boy I ever liked. We went out for a little while. Nothing serious. I think.");
        yield s.say('cloud', "He was in SOLDIER?");
        yield s.say('aeris', "Mm-hm. 1st Class, just like you.\fOne day he left on a mission... and he never came back. No goodbye, nothing.");
        const DPZ = [{ aeris: 1 }, { aeris: 2 }];
        const z = yield s.ask('cloud', '', ['Poor guy.', "(......Jealous? Of him?)"], { noQuotes: true, date: DPZ });
        FF7.story.datePts(s, DPZ[z]);
        if (z === 0) yield s.say('aeris', "Hee hee. Yeah... poor guy.");
        else yield s.say('aeris', "{CLOUD}? ...You've got a funny look on your face.");
        yield s.say('cloud', "1st Class... Zack...\fI don't remember anyone by that name.");
        yield s.say('aeris', "...I figured. Don't worry about it.\fI'm sure he's fine, wherever he is. He always was.");
      }
    }
    if (has(pty, 'tifa')) {
      yield s.face('player', 'tifa');
      const DPT = [{ tifa: 1 }, { tifa: -3 }];
      const t = yield s.ask('cloud', '', ['(Talk to Tifa.)', '(Leave her be.)'], { noQuotes: true, date: DPT });
      FF7.story.datePts(s, DPT[t]);
      if (t === 0) {
        yield s.say('cloud', "Tifa? You ever hear of a Zack?");
        yield s.emote('tifa', '!');
        yield s.say('tifa', "M-me? Zack? ...No! No. I've never met anyone by that name.");
        yield s.face('tifa', 'down');
        yield s.say('tifa', "(......)");
      }
    }
    yield s.face('player', 'up');
    yield s.say('cloud', "......");
    clearParty(s, pty);
  }

  FF7.defineMap('gongaga_zack', {
    camera: { pitch: 66, dist: 9 },   // round house seen from above (06b-chocobo37)
    name: "Zack's Parents' House", area: 'Gongaga', theme: 'house',
    grid: [
      "##################",
      "#k.q..F....b.b..k#",
      "#................#",
      "#...tct..........#",
      "#....c...........#",
      "#................#",
      "#.............jj.#",
      "#................#",
      "########+#########",
    ],
    entries: { from_village: [8, 7, 'up'] },
    exits: [{ at: [8, 8, 1, 1], to: 'gongaga_village', entry: 'from_zack', sfx: 'door' }],
    npcs: [
      { id: 'zack_father', name: "Zack's Father", model: { base: 'man', hair: '#1a1a24', hairStyle: 'spiky', top: '#5a6a3a', sleeve: '#5a6a3a', bottom: '#4a3a2a', extras: ['mustache'] },
        at: [6, 4], dir: 'right', talk: function* (s) {
          if (!s.flag('c6b_zack_heard')) { yield* zackScene(s, false); return; }
          yield s.say('zack_father', "Heh. When Zack was a kid, he'd do squats out back 'til he fell over. Said SOLDIERs needed legs of steel.\fStubborn as a mule. Gets that from his mother.");
        } },
      { id: 'zack_mother', name: "Zack's Mother", model: { base: 'woman', hair: '#1a1a24', hairStyle: 'bun', top: '#a06a4a', sleeve: '#a06a4a', skirt: 'long', bottom: '#6a4a3a', extras: ['apron'] },
        at: [10, 2], dir: 'down', talk: function* (s) {
          if (!s.flag('c6b_zack_heard')) { yield* zackScene(s, false); return; }
          yield s.say('zack_mother', "I still set a place for him at dinner sometimes. Silly, isn't it?\fIf you meet him out there, please... tell him to write.");
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6b_zack_friends') || !(s.inParty('aeris') || s.inParty('tifa'))) return;
      yield* zackScene(s, true);
    },
  });
})();

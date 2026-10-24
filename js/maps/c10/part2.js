// Chapter 10 (part 2) — The Huge Materia: North Corel and Fort Condor.
// Corel: Shinra loads the reactor's Huge Materia onto a train at Mt. Corel. The party beats the Attack
// Squad, chases the train in an old engine (pump the levers), fights across the wagons (the four
// forced battles of table `corel_train`, in order, plus the Attack Squad at the front) and tries to
// stop the runaway train before it reaches North Corel (s.minigame('train_escape')).
// Stopped: Huge Materia + Ultima. Not stopped: the train wrecks the station, Shinra recovers the
// Materia, and the townsfolk will sell the Ultima Materia for 50000 Gil. Barret's Catastrophe either way.
// Fort Condor: Shinra's final assault (s.minigame('fort_condor', { final: true })). If the enemy reaches
// the shack, CMD.Grand Horn (Lv 37); losing that fight closes the fort to you for good. Afterwards the
// egg hatches, the old condor dies and leaves the Phoenix Materia; the elder hands over the Huge Materia.
// Uses chapter 5b's Fort Condor and chapter 6a's North Corel maps (patched), plus corel2_ maps.
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const PARTY = ['cloud', 'barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const mates = (s) => PARTY.filter(id => id !== s.leader() && s.inParty(id));
  function* anyone(s, lines) {
    for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }
  // Barret gets a line even when he's back on the Highwind (he always has something to say about Corel).
  function* barret(s, text) { yield s.say('barret', text); }
  const won = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win));
  const counter = (at, run) => ({ at, on: 'talk', run });

  const corelWindow = (s) => s.flag('c10_briefing') && !s.flag('c10_corel_done');
  const condorWindow = (s) => s.flag('c10_briefing') && !s.flag('c10_condor_done');
  const TOWN_LOOK = { floor: ['#8a7458', '#826c50'], floor2: ['#6a5a48', '#625242'], wall: '#7a6a58', trim: '#4a3a28', sky: ['#7a98c0', '#d8c8a8'] };
  const MT_LOOK = { sky: ['#8a90b0', '#e0c8a0'], wall: '#8a6a50', trim: '#4a3020' };

  // ------------------------------------------------------------------ world links
  const NC_MAP = FF7.maps.ncorel_town ? ['ncorel_town', 'from_world'] : ['corel2_station', 'from_world'];
  FF7.world.link('north_corel', { map: NC_MAP[0], entry: NC_MAP[1], priority: 10, if: corelWindow });
  if (FF7.maps.condor_base) FF7.world.link('fort_condor', { map: 'condor_base', entry: 'from_world', priority: 10, if: condorWindow });
  else FF7.world.link('fort_condor', { priority: 10, if: condorWindow, run: function* (s) { yield s.msg("Smoke rises from the valley below Fort Condor. Shinra's army is already on the move..."); } });
  FF7.world.link('fort_condor', { priority: 11, if: s => s.flag('c10_condor_lost'),
    run: function* (s) { yield s.msg("Fort Condor's gate is barred and guarded by Shinra troops.\nThe fort has fallen. There's no way back in."); } });

  // What to do next once one of the two Huge Materia missions is over.
  function* nextStep(s) {
    if (s.flag('c10_corel_done') && s.flag('c10_condor_done')) yield s.say('barret', "That's Corel and Fort Condor both. ...Let's swing by Mideel. I wanna see how Tifa and Cloud are holdin' up.");
    else if (s.flag('c10_corel_done')) yield s.say('barret', "Fort Condor's next. Shinra's gonna hit 'em hard.");
    else yield s.say('barret', "Corel's next. Shinra's already at the reactor up on the mountain.");
  }

  // ================================================================== NORTH COREL
  FF7.patchMap('ncorel_town', {
    npcs: [
      { id: 'c10_ultima_man', name: 'Townsman', model: 'man13', at: [18, 12], dir: 'down',
        show: s => s.flag('c10_corel_boarded') && !s.flag('huge_materia_corel') && !s.flag('c10_ultima'),
        talk: function* (s) {
          yield s.say('Townsman', "You tried, I'll give you that. But the station's in splinters and Shinra hauled their rock away anyway.\fWe dug this out of the old mine workings years back. It's worth a fortune, and we need every gil to rebuild.");
          const c = yield s.ask('Townsman', "50000 Gil for the Ultima Materia. Take it or leave it.", ['Buy it (50000 Gil)', 'Not now']);
          if (c !== 0) return;
          if (!s.takeGil(50000)) { yield s.say('Townsman', "You're short. Come back when you've got the full 50000."); return; }
          s.sfx('purchase');
          s.set('c10_ultima');
          yield s.giveMateria('ultima');
          yield s.say('Townsman', "...Pleasure doin' business. Put it to good use.");
        } },
      { id: 'c10_grateful', name: 'Woman', model: 'woman10', at: [10, 15], dir: 'up', show: s => s.flag('huge_materia_corel'),
        talk: function* (s) { yield s.say('Woman', "If that train had hit us... Half the town'd be gone. Barret's friends saved us.\fHuh. Never thought I'd say that."); } },
      { id: 'c10_bitter', name: 'Man', model: 'man11', at: [10, 15], dir: 'up', show: s => s.flag('c10_corel_crash'),
        talk: function* (s) { yield s.say('Man', "The station's a pile of kindling, and half the stalls went with it. Shinra wrecks this town every chance it gets.\f...Still, you tried to stop it. More than anybody else ever did."); } },
    ],
    triggers: [
      { id: 'c10_to_reactor', at: [20, 1, 2, 1], once: false, if: corelWindow,
        run: function* (s) {
          const c = yield s.ask(null, "Follow the tracks back up to the Corel reactor?", ['Go', 'Not yet']);
          if (c !== 0) { yield s.walk('player', 0, 2); return; }
          yield s.caption("The party runs up the old coal line, back into the mountains toward the Corel reactor...", { hold: 110, bg: '#000' });
          yield s.goto('corel2_reactor', 'from_tracks');
        } },
    ],
    onEnter: function* (s) {
      if (!corelWindow(s) || s.flag('c10_corel_intro')) return;
      s.set('c10_corel_intro');
      s.spawn('c10_runner', 'man12', 22, 4, 'down', { name: 'Townsman' });
      yield s.run('c10_runner', 31, 12);
      yield s.face('player', 'c10_runner');
      yield s.say('Townsman', "Hey, you there! You're with Barret, right? There's Shinra all over the old reactor!\fThey're loadin' some giant glowing rock onto a freight train. If it comes down the line, it comes right through here!");
      yield* barret(s, "Shinra... back on Corel's mountain again. Damn them!\fThat's gotta be the Huge Materia. C'mon — up the tracks to the reactor!");
      yield s.run('c10_runner', 25, 16);
      s.remove('c10_runner');
      yield s.msg("The old coal line leaves town to the north, back up into Mt. Corel.");
    },
  });
  FF7.patchMap('ncorel_house', {
    npcs: [
      { id: 'c10_greenhat', name: 'Woman in a green hat', model: { base: 'woman', hairStyle: 'cap', hair: '#3a7a3a', top: '#4a8a4a', sleeve: '#4a8a4a', bottom: '#5a4a38' }, at: [11, 2], dir: 'down',
        show: s => s.flag('c10_corel_rested') && !s.flag('c10_catastrophe'),
        talk: function* (s) {
          yield s.say('Woman in a green hat', "You're Barret, aren't you? ...Don't worry, I'm not going to slug you.\fMy husband worked the mines with you, back before the reactor. He kept this, for 'when Barret comes home.' He said you'd know what it means.");
          if (s.inParty('barret')) yield s.say('barret', "......Heh. He always said I'd blow myself up someday with a move like this.");
          s.set('c10_catastrophe');
          yield s.give('catastrophe');
          yield s.say('Woman in a green hat', "Whatever you did back then... what you did today counts too.");
        } },
    ],
  });

  // ------------------------------------------------------------------ the Corel reactor: the train pulls out
  function* pumpChase(s) {
    yield s.msg("The old engine groans into motion. Its drive is worked by two big hand levers.\nPump them in turn — left, right, left, right — to build up speed!");
    let dist = 6, prev = -1;
    for (let i = 0; i < 10 && dist > 0; i++) {
      const hint = dist >= 5 ? "The Shinra train is a speck far down the tracks!" : dist >= 3 ? "We're gaining on it!" : "Almost close enough to jump!";
      const c = yield s.ask(null, hint, ['Pull the left lever', 'Pull the right lever']);
      if (c !== prev) { dist--; s.sfx('train'); s.shake(1, 12); }
      else { dist = Math.min(6, dist + 1); yield s.msg("The lever jams against the stroke... The engine loses speed!"); }
      prev = c;
    }
    return dist <= 0;
  }
  function* boardEngine(s) {
    if (s.flag('c10_corel_done')) { yield s.msg("A rusty old locomotive on a side track. Its boiler is stone cold now."); return; }
    if (!s.flag('c10_squad_beaten')) { yield s.msg("A rusty old locomotive sits on a side track."); return; }
    const c = yield s.ask(null, "Jump aboard the old engine and chase the Shinra train?", ['Go!', 'Not yet']);
    if (c !== 0) return;
    s.music('hurry');
    yield s.fadeOut(20);
    s.sfx('train_horn');
    yield s.caption("With a shriek of old iron, the engine lurches off down the mountain after the Shinra train...", { hold: 90, bg: '#000', aboveFade: true });
    yield s.fadeIn(10);
    const caught = yield* pumpChase(s);
    if (caught) {
      s.set('c10_corel_boarded');
      yield s.msg("The two trains run side by side for a moment... and the party leaps across onto the last wagon!");
      yield s.goto('corel2_train', 'start');
      return;
    }
    // the train got away
    s.set('c10_corel_crash');
    s.set('c10_corel_done');
    yield s.msg("The old engine wheezes and slows... The Shinra train pulls away around the bend and is gone.");
    yield s.goto('corel2_station', 'after');
  }

  FF7.defineMap('corel2_reactor', {
    name: 'Corel Reactor', area: 'Mt. Corel', theme: 'mountain', music: 'mining', look: MT_LOOK,
    battle: { table: 'mt_corel_reactor', bg: 'mtcorel', rate: 0.8, if: s => s.flag('c10_squad_beaten') && !s.flag('c10_corel_done') },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XPPPPMMhhhhhhhhh++hhhhhhhMMPPPPPPX",
      "X...............................PX",
      "X..B....yy.............yy..o....PX",
      "X.............................B..X",
      "X======....====......=====....===X",
      "Xrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "Xrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
      "X.........x..........R.......x...X",
      "X&&&&&rr......R..........,,,.....X",
      "X&&&&&rr.............R......,,...X",
      "XRRRRRRRRRR....RRRRRRRRR....RRRRRX",
    ],
    lights: [[8, 3, '#60ffa0', 3], [23, 3, '#60ffa0', 3]],
    entries: { from_tracks: [31, 7, 'left'] },
    exits: [
      { at: [33, 6, 1, 2], to: 'corel2_station', entry: 'from_tracks', if: s => s.flag('c10_corel_done') || !s.flag('c10_squad_beaten'),
        blocked: function* (s) { yield s.say(s.leader(), "(On foot, we'll never catch that train. That old engine on the siding might still run...)"); } },
    ],
    triggers: [
      counter([16, 1, 2, 1], function* (s) { yield s.msg("The reactor's heavy doors are sealed. Fresh scrape marks lead from them to the tracks."); }),
      { id: 'engine', at: [1, 9, 5, 2], on: 'talk', run: boardEngine },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_squad_beaten')) return;
      s.music('hurry');
      s.spawn('sq1', 'soldier', 20, 4, 'right', { name: 'Attack Squad' });
      s.spawn('sq2', 'soldier', 22, 4, 'right', { name: 'Attack Squad' });
      yield s.msg("Far below, a long Shinra freight train is pulling away down the mountain.\nStrapped to one of its flatcars, an enormous crystal glows green.");
      yield s.move('player', 27, 6);
      yield [s.run('sq1', 27, 5), s.run('sq2', 26, 6)];
      yield s.say('Attack Squad', "It's the terrorists! The Materia's already rolling — nobody gets past us!");
      yield s.battle({ enemies: ['attack_squad', 'attack_squad'], bg: 'mtcorel', music: 'battle', noEscape: true });
      s.remove('sq1'); s.remove('sq2');
      s.set('c10_squad_beaten');
      yield* barret(s, "That train's headed straight down the line for North Corel! If it don't stop...");
      yield* anyone(s, [['cid', "There's an old engine sittin' on that siding! If she's got any steam left in her, we can run 'em down!"], ['redxiii', "That old engine on the siding... If it still moves, we can give chase!"]]);
      yield s.msg("An old locomotive rusts on the side track to the west.");
    },
  });

  // ------------------------------------------------------------------ the runaway train (wagon to wagon)
  const TRAIN_BATTLES = FF7.data.encounters.corel_train || [];
  function* wagonFight(s, i, intro) {
    if (intro) yield s.say(null, intro);
    const f = TRAIN_BATTLES[i];
    if (f) yield s.battle({ formation: f, bg: 'train_roof', music: 'hurry', noEscape: true });
    s.music('hurry');
  }
  function* hop(s, fromX, toX, n, intro) {
    yield s.move('player', fromX, 3);
    yield s.face('player', 'right');
    s.shake(1, 10);
    yield s.jump('player', toX, 3, 1.0, 28);
    yield* wagonFight(s, n, intro);
  }
  function* stopTrain(s) {
    if (s.flag('c10_corel_done')) return;
    if (!s.flag('c10_front_cleared')) {
      s.spawn('sq_front', 'soldier', 35, 4, 'left', { name: 'Attack Squad' });
      yield s.say('Attack Squad', "Y-you made it all the way up here!? Stay back!");
      yield s.battle({ enemies: ['attack_squad'], bg: 'train_roof', music: 'hurry', noEscape: true });
      s.remove('sq_front');
      s.set('c10_front_cleared');
    }
    yield s.say(s.leader(), "The brakes! There — those levers!");
    yield* anyone(s, [['cid', "Move over! I've driven trains, rockets, whatever. Just do what I tell ya — up, down, down! Now!"], ['barret', "I worked this line when I was a kid! Pull 'em in order — hurry, the town's comin' up!"]]);
    const r = yield s.minigame('train_escape');
    s.set('c10_corel_done');
    if (won(r)) s.set('c10_corel_stopped'); else s.set('c10_corel_crash');
    yield s.goto('corel2_station', 'after');
  }

  // refs 14-hugemateria05, 06, 08, 12: the Shinra freight train seen from the side on the mountain line -
  // iron coal hoppers with X-braced sides and heaped coal, the flatcar with the Huge Materia strapped on,
  // the steam engine's open cab (brake levers, firebox glow) and its long boiler up front; rails, bogies
  // and couplers below, the rock face on one side and the drop and the mountains on the other
  const TRAIN_GRID = [
    "############################################",
    "dddddddddddddddddddddddddddddddddddddddddddd",
    "dccccccddccccccddccccccddffffffddfffLLLLLLLL",
    "dccccccddccccccddccccccddffffffddfffLLLLLLLL",
    "dccccccddccccccddccccccddffffffddfffLLLLLLLL",
    "dddddddddddddddddddddddddddddddddddddddddddd",
    "                                            ",
    "                                            ",
  ];
  FF7.defineMap('corel2_train', {
    name: 'Runaway Train', area: 'Mt. Corel', theme: 'canyon', music: 'hurry',
    look: { sky: ['#7a90b8', '#e8c898'], wall: '#9a6040', wallTop: '#8a5a3c', wallH: 1.8, dirt: ['#7a6448', '#72603f'], floor2: ['#2a2a2e', '#26262a'], floor3: ['#6a5238', '#624a32'],
      floorTex: { floor2: 'dirt', floor3: 'planks' }, metal: ['#5a5a60', '#4a4a50'] },
    camera: { dist: 10.5, pitch: 36 },
    legend: { c: 'hopper', f: 'flatcar', L: 'locomotive', d: 'dirt' },
    grid: TRAIN_GRID,
    heights: TRAIN_GRID.map(r => r.replace(/[cf]/g, '4').replace(/[^4]/g, '0')),
    props: [
      { at: [36, 2], prop: 'locomotive', lift: 1.2 },
      { at: [27.5, 3], prop: 'crystal', col: '#60ff90', scale: 1.7 },
      { at: [34, 2.25], prop: 'lever', n: 3 }, { at: [35, 2.25], prop: 'lever', n: 2, col: '#e0b020' },
    ],
    lights: [[27, 3, '#60ff90', 3], [34, 3, '#ffc890', 1.6]],
    // the Huge Materia and the brake stand take up their tiles on the wagon decks
    onLoad: s => { s.block(27, 3); s.block(28, 3); s.block(34, 2); s.block(35, 2); },
    entries: { start: [2, 3, 'right'] },
    triggers: [
      { id: 'hop1', at: [6, 2, 1, 3], run: function* (s) { yield* hop(s, 6, 9, 1, "Two more Gas Ducters crawl out from between the cargo crates!"); } },
      { id: 'hop2', at: [14, 2, 1, 3], run: function* (s) { yield* hop(s, 14, 17, 2, "A huge armored brute blocks the next wagon!"); } },
      { id: 'hop3', at: [22, 2, 1, 3], run: function* (s) { yield* hop(s, 22, 25, 3, "A mechanical bird of prey dives out of the sky at the train!"); } },
      { id: 'hop4', at: [30, 2, 1, 3], run: function* (s) {
          yield s.move('player', 30, 3);
          yield s.jump('player', 33, 3, 1.0, 28);
          yield* stopTrain(s);
        } },
      { id: 'lever', at: [34, 2, 2, 1], on: 'talk', run: stopTrain },
    ],
    onEnter: function* (s) {
      if (s.flag('c10_train_first')) return;
      s.set('c10_train_first');
      s.music('hurry');
      s.sfx('train');
      yield s.say(s.leader(), "We're aboard! The Huge Materia's up front — work our way forward, wagon by wagon!");
      yield* wagonFight(s, 0, "Something bursts out of the cargo on the last wagon!");
    },
  });

  // ------------------------------------------------------------------ North Corel station: where the train ends up
  function* aftermath(s) {
    s.hide('player');
    const crew = [s.leader()].concat(mates(s)).slice(0, 3);
    const stopped = s.flag('c10_corel_stopped');
    const boarded = s.flag('c10_corel_boarded');
    if (stopped) {
      s.music('none');
      s.sfx('train');
      s.shake(3, 80);
      yield s.caption("Brakes screaming, the Shinra train grinds down the last slope...\nand shudders to a stop a few feet short of North Corel station.", { hold: 150, bg: '#000' });
      crew.forEach((id, i) => s.spawn(id, id, 13 + i, 4 + i, 'down', { name: s.name(id) }));
      s.spawn('elder_c', 'oldman4', 14, 10, 'up', { name: 'Old Man' });
      s.spawn('woman_c', 'woman10', 11, 10, 'up', { name: 'Woman' });
      s.spawn('kid_c', 'kid5', 17, 10, 'up', { name: 'Boy' });
      yield s.fadeIn(20);
      s.music('mining');
      yield [s.move('elder_c', 14, 8), s.move('woman_c', 12, 8), s.move('kid_c', 16, 8)];
      yield s.say('Boy', "They stopped it! They stopped the train!");
      yield s.say('Old Man', "Another few seconds and it'd have ploughed straight through the town...\f...Barret. We've said some hard things to you. Every one of us.");
      yield* barret(s, "...Don't. I had every one of 'em comin'.");
      yield s.say('Old Man', "Maybe. But today you saved Corel's people. That means something.\fThe rock on that wagon — Shinra's 'Huge Materia' — take it. And take this too.");
      yield s.msg("The Huge Materia is carefully unloaded from the wagon.");
      s.set('huge_materia_corel');
      yield s.give('huge_materia_corel');
      yield s.say('Old Man', "We found this deep in the old mine, back when we still dug coal. None of us ever knew what to make of it.");
      s.set('c10_ultima');
      yield s.giveMateria('ultima');
    } else {
      s.music('none');
      s.sfx('train_horn');
      yield s.caption(boarded
        ? "The brakes won't catch. The train thunders down the last grade, wheels shrieking..."
        : "Minutes later, the Shinra train comes roaring down the mountain with nobody at the brakes...", { hold: 130, bg: '#000' });
      s.shake(9, 90);
      s.flash('#ffb060', 30, 0.8);
      yield s.caption("...and slams through the buffers, tearing North Corel station apart.", { hold: 120, bg: '#000' });
      crew.forEach((id, i) => s.spawn(id, id, 11 + i * 2, 5, 'down', { name: s.name(id) }));
      s.spawn('sold_c', 'soldier', 13, 3, 'down', { name: 'Shinra Soldier' });
      s.spawn('sold_c2', 'soldier', 14, 3, 'down', { name: 'Shinra Soldier' });
      s.spawn('man_c', 'man11', 14, 10, 'up', { name: 'Man' });
      yield s.fadeIn(20);
      s.music('mining');
      yield s.say('Shinra Soldier', "The Materia's intact! Load it up and move out, move out!");
      yield [s.run('sold_c', 13, 0), s.run('sold_c2', 14, 0)];
      s.remove('sold_c'); s.remove('sold_c2');
      yield* barret(s, "Damn it! DAMN IT! They got away with it... and look at this place...");
      yield s.move('man_c', 14, 8);
      yield s.say('Man', "The station... the stalls... Shinra's train went right through 'em.\f...Nobody was killed. That's somethin', I guess.");
      if (boarded) yield s.say('Man', "I saw you up on that train, fightin' to stop it. Don't think I didn't.");
      s.remove('man_c');
    }
    // a night's rest in town
    yield s.say(s.leader(), stopped ? "Heh. Not bad for a bunch of amateurs. ...Let's get some shut-eye." : "......Let's help clean this up. Then we rest.");
    yield s.fadeOut(40);
    s.heal();
    s.sfx('found');
    yield s.caption(stopped ? "The people of North Corel insist the party stay the night." : "The party spends the night helping clear the wreckage.", { hold: 120, bg: '#000', aboveFade: true });
    s.set('c10_corel_rested');
    crew.forEach(id => s.remove(id));
    s.show('player', 14, 8, 'down');
    yield s.fadeIn(30);
    yield* nextStep(s);
  }

  FF7.defineMap('corel2_station', {
    name: 'North Corel Station', area: 'Corel', theme: 'town', music: 'mining', look: TOWN_LOOK,
    grid: [
      "XXXXXXXXXXXXXrrXXXXXXXXXXXXXXX",
      "hhhwhhhhhhhh.rr.hhhhwhhhhhhhhh",
      "h...x.......=rr=......o......h",
      "h...........=rr=.............h",
      "h..B........=rr=.....x.......h",
      "h...........=rr=.............h",
      "h..AAA......:rr:.......AAA...h",
      "h...........:MM:.............h",
      "h............................h",
      "h....o.............B.........h",
      "h............................h",
      "hhhhhhhhhhhh::::::hhhhhhhhhhhh",
    ],
    entries: { after: [14, 8, 'down'], from_tracks: [13, 2, 'down'], from_world: [14, 10, 'up'] },
    exits: [
      { at: [13, 0, 2, 1], to: 'corel2_reactor', entry: 'from_tracks', if: corelWindow,
        blocked: function* (s) { yield s.msg("The coal line winds back up into Mt. Corel."); } },
      { at: [12, 11, 6, 1], run: function* (s) {
          if (FF7.maps.ncorel_town) yield s.goto('ncorel_town', 'from_mtcorel');
          else yield s.world('north_corel');
        } },
    ],
    npcs: [
      { id: 'stationman', name: 'Station Hand', model: 'worker3', at: [6, 4], dir: 'right',
        talk: function* (s) {
          if (s.flag('c10_corel_crash')) { yield s.say('Station Hand', "Twenty years I kept this station. Twenty seconds for Shinra to flatten it."); return; }
          if (s.flag('huge_materia_corel')) { yield s.say('Station Hand', "I've never seen a train stop that close to the buffers. Another car-length and we'd all be firewood."); return; }
          yield s.say('Station Hand', "Nothing's come down the coal line in years. Now Shinra's up there with a whole train? Something's wrong.");
        } },
    ],
    onEnter: function* (s) {
      if (s.entry() !== 'after' || s.flag('c10_corel_rested')) return;
      yield* aftermath(s);
    },
  });

  // ================================================================== FORT CONDOR: the final battle
  function* condorArrival(s) {
    s.set('c10_condor_intro');
    // the fort lets the party straight in for the last stand
    s.set('c5b_condor_gate');
    s.set('c5b_condor_joined');
    s.music('condor');
    s.spawn('c10_scout', { base: 'man', top: '#6a5a3a', sleeve: '#6a5a3a', bottom: '#4a4030', hairStyle: 'cap' }, 13, 4, 'down', { name: 'Guard' });
    yield s.run('c10_scout', 13, 12);
    yield s.say('Guard', "You! Thank goodness! Shinra's gathered its whole army down in the valley!\fThey're not after the condor this time... They want the Huge Materia inside the reactor! Please, hurry inside!");
    yield s.run('c10_scout', 13, 4);
    s.remove('c10_scout');
  }
  function* condorElder(s) {
    yield s.say('c10_elder', "You came back... Then listen well. Beneath the condor's nest, inside the old reactor, lies a Huge Materia.\fShinra will stop at nothing to take it. This is their final attack. Everything they have.");
    yield s.say('c10_elder', "And the egg is about to hatch. If we lose now, we lose everything.\fThe commander's upstairs at the battle map. Please... one last time.");
  }
  function* condorFinal(s) {
    if (!s.flag('c10_condor_funds')) {
      s.set('c10_condor_funds');
      yield s.say('c10_cmdr', "This is it. Their last push, and the biggest yet.\fWe won't need a war chest after today, one way or another. Take all of it. Hire every fighter you can.");
      const fund = Math.max(0, s.get('c5b_condor_funds'));
      if (fund > 0) { s.setVar('c5b_condor_funds', 0); yield s.giveGil(fund); }
    }
    const c = yield s.ask('c10_cmdr', "Shinra's troops are climbing the mountain! Ready?", ["I'm ready!", 'Not yet']);
    if (c !== 0) { yield s.say('c10_cmdr', "Hurry! They'll be at the shack before long!"); return; }
    yield s.say('c10_cmdr', "Place your troops on the slope and hold the line. If anything reaches the shack... you'll face their commander yourselves!");
    const r = yield s.minigame('fort_condor', { final: true, battle: 21, gil: s.gil() });
    const spent = r && typeof r === 'object' && typeof r.spent === 'number' ? r.spent : 0;
    if (spent > 0) s.takeGil(Math.min(spent, s.gil()));
    s.set('c10_condor_done');
    if (!won(r)) {
      s.sfx('alarm');
      yield s.say('c10_cmdr', "They've reached the shack! Their commander's inside — get in there!");
      const b = yield s.battle({ enemies: ['cmd_grand_horn_3'], bg: 'condor', music: 'boss', noEscape: true, canLose: true });
      if (b !== 'win') {
        s.heal();
        s.set('c10_condor_lost');
        s.music('none');
        yield s.fadeOut(30);
        yield s.caption("Shinra's forces overran Fort Condor.\nThe party barely escaped with their lives... and the Huge Materia was lost.", { hold: 180, bg: '#000', aboveFade: true });
        yield s.world('fort_condor');
        return;
      }
      yield s.say('c10_cmdr', "Their commander's down! The rest of them are falling back down the mountain!");
    } else {
      yield s.say('c10_cmdr', "They're breaking! They're running! We held — we actually held!");
    }
    s.set('c10_condor_won');
    s.music('none');
    yield s.say('Lookout', "Everyone! Up on the roof! The egg — it's hatching!");
    yield s.goto('condor_roof', 'from_hall');
    yield* hatching(s);
  }
  function* hatching(s) {
    s.hide('player');
    const crew = [s.leader()].concat(mates(s)).slice(0, 3);
    crew.forEach((id, i) => s.spawn(id, id, 9 + i, 8, 'up', { name: s.name(id) }));
    s.spawn('c10_eld', 'oldman3', 14, 8, 'up', { name: 'Old Man' });
    yield s.cam(10, 4, 60, { dist: 7 });
    s.music('condor');
    yield s.msg("Under the great condor's wing, the huge egg rocks... cracks... and splits open.");
    s.spawn('chick', { enemy: 'zuu', scale: 0.8 }, 11, 5, 'down', { name: 'Condor Chick' });
    s.sfx('chocobo2');
    yield 60;
    yield s.msg("A fledgling condor shakes off the shell, spreads its wings for the very first time...\nand with a cry, it launches itself into the open sky.");
    yield s.move('chick', 11, 0, { speed: 0.1 });
    s.remove('chick');
    yield 30;
    yield s.msg("The old condor watches it go. Then, slowly, she lowers her head... and does not raise it again.");
    s.hide('condor');
    s.flash('#ffa040', 40, 0.6);
    yield s.say('Old Man', "......She was only holding on for the little one. She's been fighting to stay alive this long, just to see it fly.");
    yield* anyone(s, [['redxiii', "...A life ends, and the life it protected goes on. That is the Planet's way."], ['barret', "......Rest easy, big bird."]]);
    yield s.msg("Where the old condor lay, something glows a deep, burning red.");
    s.set('c10_condor_hatched');
    yield s.camFollow();
    crew.forEach(id => s.remove(id));
    s.show('player', 10, 7, 'up');
    yield s.say('Old Man', "Come down to the hall when you're ready. The Huge Materia is yours. Shinra will never have it now.");
    s.remove('c10_eld');
  }
  function* condorReward(s) {
    s.set('huge_materia_condor');
    yield s.say('Old Man', "Here. The Huge Materia from the heart of the reactor. It's safer with you than with us.\fThe condor gave her life. You gave us a fighting chance. Fort Condor won't forget.");
    yield s.give('huge_materia_condor');
    yield* nextStep(s);
  }

  FF7.patchMap('condor_base', {
    onEnter: function* (s) {
      if (!condorWindow(s) || s.flag('c10_condor_intro')) return;
      yield* condorArrival(s);
    },
  });
  FF7.patchMap('condor_hall', {
    npcs: [
      { id: 'c10_elder', name: 'Old Man', model: 'oldman3', at: [13, 7], dir: 'down',
        show: s => condorWindow(s) || (s.flag('c10_condor_hatched') && !s.flag('huge_materia_condor')),
        talk: function* (s) {
          if (s.flag('c10_condor_hatched')) { yield* condorReward(s); return; }
          yield* condorElder(s);
        } },
      { id: 'c10_cmdr', name: 'Commander', model: { base: 'man', top: '#5a6a3a', sleeve: '#5a6a3a', bottom: '#3a4030', hairStyle: 'short', extras: ['mustache'] }, at: [4, 2], dir: 'up',
        show: condorWindow, talk: condorFinal },
    ],
    onLoad: function (s) {
      if (condorWindow(s) || (s.flag('c10_condor_hatched') && !s.flag('huge_materia_condor'))) s.hide('elder');
      if (condorWindow(s)) s.hide('tactician');
    },
  });
  FF7.patchMap('condor_roof', {
    items: [{ at: [10, 6], materia: 'phoenix', id: 'condor2_phoenix', if: s => s.flag('c10_condor_won') }],
    onLoad: function (s) { if (s.flag('c10_condor_hatched')) s.hide('condor'); },
  });
})();

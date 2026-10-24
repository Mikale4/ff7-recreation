// Chapter 6b (part 2) — Cosmo Canyon: the buggy breaks down, the guard recognizes Nanaki, the town
// (inn, shops, Tiger Lily, Barret's room, the kitchen), Bugenhagen's observatory and the planetarium
// lesson on the Lifestream, the evening at the Cosmo Candle, and the sealed door of the Cave of the Gi.
// The cave itself, Seto and the farewell are in part3. (Dialogue paraphrased; see docs/SCRIPTING.md.)
//
// Flags: c6b_cosmo_arrived, c6b_buggy_broken (unset + c6b_buggy_repaired in part3), c6b_met_bugen,
// c6b_planetarium, c6b_candle_start, c6b_candle_done, c6b_gi_open, c6b_done (part3), c6b_farewell.
// Vars: aff_barret (FF7 date points), c6b_barret_talk (Barret's story: 0/1/2), turtle_flyers.
(function () {
  // ------------------------------------------------------------------ helpers
  const MEMBERS = ['barret', 'tifa', 'aeris', 'redxiii', 'caitsith', 'yuffie', 'vincent', 'cid'];
  const others = (s) => MEMBERS.filter(id => s.inParty(id));
  function spawnParty(s, spots) {
    const ids = others(s).slice(0, spots.length);
    ids.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || 'up', { name: s.name(id) }));
    return ids;
  }
  const clearParty = (s, ids) => ids.forEach(id => s.remove(id));
  const has = (ids, id) => ids.indexOf(id) >= 0;
  const counter = (at, run) => ({ at, on: 'talk', run });
  // party members waiting around town before the planetarium (not in the active party)
  const townMember = (id) => (s) => s.isMember(id) && !s.inParty(id) && !s.flag('c6b_candle_start');
  // everyone gathered at the Cosmo Candle
  const atCandle = (id) => (s) => s.flag('c6b_candle_start') && !s.flag('c6b_candle_done') && (id === 'redxiii' || s.isMember(id));
  function* memberChat(s, npcId, id, text) {
    yield s.say(id, text);
    const c = yield s.ask(null, 'Change the party?', ['Yes', 'No']);
    if (c !== 0) return;
    yield s.choosePArty(['cloud']);
    if (s.inParty(id)) s.hide(npcId);
  }
  const GUARD = { base: 'man', skin: '#b07850', hair: '#2a1a10', hairStyle: 'long', top: '#b0602a', sleeve: '#b0602a', bottom: '#6a4020', extras: ['headband', 'sash'] };

  FF7.world.link('cosmo_canyon', { map: 'cosmo_gate', entry: 'from_world' });

  // ================================================================== canyon floor and gate
  function* arrival(s) {
    s.set('c6b_cosmo_arrived');
    s.set('c6b_buggy_broken');
    const pty = spawnParty(s, [[12, 16, 'up'], [14, 16, 'up']]);
    if (!has(pty, 'redxiii')) s.spawn('redxiii', 'redxiii', 15, 15, 'up', { name: s.name('redxiii') });
    s.shake(3, 40);
    s.sfx('hit');
    yield s.msg("With a horrible grinding clank, the buggy lurches, coughs out a cloud of black smoke...\fand rolls to a dead stop at the foot of the canyon.");
    if (has(pty, 'barret')) yield s.say('barret', "Aw, c'mon! Don't you quit on me now, ya piece of junk!");
    else yield s.say('cloud', "......Great.");
    if (has(pty, 'caitsith')) yield s.say('caitsith', "Well, that's that, then! Good thing I brought my own ride, eh?");
    yield s.face('redxiii', 'up');
    yield s.say('redxiii', "......This smell. The wind coming off the red rock...\fWe're here. This is Cosmo Canyon.");
    yield s.cam(13, 4, 40);
    yield s.say('guard', "Hold it! Who goes there?");
    yield s.move('guard', 13, 3);
    yield s.face('guard', 'down');
    const walk = [s.move('player', 13, 12), s.move('redxiii', 15, 13)];
    const rest = pty.filter(id => id !== 'redxiii');
    if (rest[0]) walk.push(s.move(rest[0], 12, 13));
    if (rest[1]) walk.push(s.move(rest[1], 14, 14));
    yield walk;
    yield s.cam(13, 9, 30);
    yield s.say('guard', "Travelers, eh? And in a smoking wreck, no less. Do you even know where you are?");
    const c = yield s.ask('cloud', '', ['Not really.', 'Sure we do.'], { noQuotes: true });
    if (c === 0) yield s.say('guard', "Then I'll tell you. This is Cosmo Canyon. People come from all over the world to study the life of the Planet here.\fThough most of them manage to arrive without setting their vehicle on fire.");
    else yield s.say('guard', "Is that so? Then you'll know this canyon doesn't open its gate to just anybody.");
    yield s.run('redxiii', 13, 11);
    yield s.say('redxiii', "It's all right. They're with me.");
    yield s.emote('guard', '!');
    yield s.say('guard', "That voice... Nanaki!? Is that really you!? You've come back!");
    yield s.say('redxiii', "I'm home! ...Is Grandpa here? Is he well?");
    yield s.say('guard', "Up at the observatory, same as always! Go on, he'll be overjoyed!");
    yield s.face('redxiii', 'down');
    yield s.say('redxiii', "Everyone, I'm going on ahead to see my grandfather. Please, make yourselves at home!");
    yield s.run('redxiii', [[13, 11], [13, 1]]);
    s.remove('redxiii');
    s.bench('redxiii');
    if (has(pty, 'tifa')) yield s.say('tifa', "...Nanaki? Is that Red XIII's real name?");
    if (has(pty, 'aeris')) yield s.say('aeris', "Did you hear him? \"I'm home!\" He sounded just like a little kid.");
    if (has(pty, 'barret')) yield s.say('barret', "Heh. Mr. Calm-and-Collected turns into a pup the second he gets home.");
    if (has(pty, 'yuffie')) yield s.say('yuffie', "Grandpa? The fuzzball has a GRANDPA? Okay, this I gotta see.");
    yield s.say('guard', "Any friend of Nanaki is a friend of Cosmo Canyon. Welcome!\fOur mechanic will have a look at that buggy of yours. Rest at the inn while you wait.");
    yield s.say('cloud', "(Nanaki...)");
    s.place('guard', 11, 3, 'down');
    s.camFollow();
    clearParty(s, pty);
  }

  function* mechanicTalk(s) {
    if (!s.flag('c6b_buggy_repaired')) {
      yield s.say('Mechanic', "Whew, this buggy of yours is a mess. Busted fuel line, bent axle, and is that... a chocobo feather in the carburetor?\fGive me some time. I'll have her running again.");
      return;
    }
    const n = s.inc('c6b_mech_talks');
    if (n < 3) {
      yield s.say('Mechanic', "She's running like new! I left her parked right outside the canyon for you.\fTreat her gently, will you? That engine's older than I am.");
      return;
    }
    const c = yield s.ask('Mechanic', "Say... You folks look like you could use a little inside information. Worth 1,000 gil to you?", ['Pay 1,000 gil', 'No thanks']);
    if (c !== 0) { yield s.say('Mechanic', "Suit yourself."); return; }
    if (!s.takeGil(1000)) { yield s.say('Mechanic', "Hey now, no gil, no secrets."); return; }
    yield s.say('Mechanic', "Heh, thanks. Upstairs at the inn, in the bedroom... check the lower left corner.\fSomebody stashed an Elixir there years ago and never came back for it.");
  }

  function* buggyTalk(s) {
    if (s.flag('c6b_buggy_repaired')) yield s.msg("The buggy, patched up and polished. It'll wait here until you need it again.");
    else yield s.msg("The buggy. Black smoke is still seeping out from under the hood.");
  }

  // After Seto (part3 ends with s.goto('cosmo_gate', 'farewell')): Nanaki says goodbye to his grandfather.
  function* farewell(s) {
    s.set('c6b_farewell');
    s.music('cosmo');
    const pty = spawnParty(s, [[12, 2, 'down'], [15, 3, 'left']]);
    if (!has(pty, 'redxiii')) s.spawn('redxiii', 'redxiii', 14, 2, 'down', { name: s.name('redxiii') });
    s.spawn('bugen', 'bugenhagen', 13, 1, 'down', { name: 'Bugenhagen' });
    yield s.face('player', 'up');
    yield s.say('bugen', "Ho ho hoo. Leaving already? The canyon will be very quiet without you, Nanaki.");
    yield s.face('redxiii', 'bugen');
    yield s.say('redxiii', "Grandfather... I'll come back. And when I do, I'll be a warrior Father would be proud of.");
    yield s.say('bugen', "Ho ho hoo! He already would be.Now go, before this old man embarrasses himself in front of your friends.");
    yield s.face('redxiii', 'player');
    yield s.say('redxiii', "...Sorry for all the fuss, Cloud. From here on, I'll pull my weight. Let's go.");
    yield s.cam(10, 12, 40);
    yield s.say('Mechanic', "Hey, up there! Your buggy's all fixed! I left her parked right outside the canyon, ready to roll!");
    if (has(pty, 'barret')) yield s.say('barret', "Finally, some good news around here.");
    yield s.cam(13, 3, 30);
    yield s.say('cloud', "(Sephiroth's trail leads north from here... toward Nibelheim.)");
    if (has(pty, 'tifa')) {
      yield s.say('tifa', "Nibelheim... Cloud, do you think there's anything left of it?");
      yield s.say('cloud', "...No. It all burned. You saw it yourself.");
      yield s.say('tifa', "......Yeah.");
    }
    s.camFollow();
    yield s.move('bugen', 13, 0);
    s.remove('bugen');
    clearParty(s, pty);
    s.remove('redxiii');
  }

  FF7.defineMap('cosmo_gate', {
    name: 'Cosmo Canyon', area: 'Cosmo Canyon', theme: 'cosmo', music: 'cosmo',
    grid: [
      "#############++#############",
      "#R...........::...........R#",
      "#............::......l.....#",
      "#..!.........::............#",
      "#............^^............#",
      "#............::............#",
      "#...........R^^R...........#",
      "#............::............#",
      "#..R........R^^R.......R...#",
      "#............::............#",
      "#............::............#",
      "#R...........::...........R#",
      "##...........::...........##",
      "#R.....................R..R#",
      "#.....MM............R......#",
      "#R.........................#",
      "##R......................R##",
      "RRRRRRRRRRRR....RRRRRRRRRRRR",
    ],
    heights: [
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555445555555555555",
      "5000000000000330000000000005",
      "5000000000000220000000000005",
      "5000000000000110000000000005",
      "5000000000000000000000000005",
      "5000000000000000000000000005",
      "5000000000000000000000000005",
      "5000000000000000000000000005",
      "5500000000000000000000000055",
      "5000000000000000000000000005",
      "5000000000000000000000000005",
      "5000000000000000000000000005",
      "5500000000000000000000000055",
      "0000000000000000000000000000",
    ],
    entries: { from_world: [13, 15, 'up'], from_plaza: [13, 1, 'down'], farewell: [13, 3, 'down'] },
    exits: [
      { at: [13, 0, 2, 1], to: 'cosmo_plaza', entry: 'from_gate' },
      { at: [12, 17, 4, 1], to: 'world', loc: 'cosmo_canyon', if: s => s.flag('c6b_done'),
        blocked: function* (s) { yield s.say('cloud', "(The buggy's dead, and Red XIII has business here. We're not going anywhere yet.)"); } },
    ],
    npcs: [
      { id: 'guard', name: 'Guard', model: GUARD, at: [11, 3], dir: 'down', talk: function* (s) {
        if (s.flag('c6b_done')) yield s.say('guard', "Nanaki's going with you? ...Take good care of him. He's the pride of this whole canyon.");
        else yield s.say('guard', "Welcome to Cosmo Canyon, friends of Nanaki. Elder Bugenhagen's observatory is at the very top, past the Cosmo Candle.");
      } },
      { id: 'mechanic', name: 'Mechanic', model: 'worker3', at: [8, 14], dir: 'left', talk: mechanicTalk },
    ],
    objects: [
      { at: [6, 14], talk: buggyTalk }, { at: [7, 14], talk: buggyTalk },
      { at: [3, 3], talk: function* (s) { yield s.msg('"COSMO CANYON"\nObservatory and center for the Study of Planet Life.\nAll who come to learn are welcome.'); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c6b_cosmo_arrived')) { yield* arrival(s); return; }
      if (s.flag('c6b_done') && !s.flag('c6b_farewell')) yield* farewell(s);
    },
  });

  // ================================================================== the plaza and the Cosmo Candle
  function* candleTalk(s, id, pages) {
    yield s.say(id, pages);
    s.set('c6b_candle_' + id);
  }

  function* redCandle(s) {
    yield s.say('redxiii', "...Cloud. This canyon is where I was born. And where my mother died.");
    yield s.say('redxiii', "Long ago, the Gi tribe attacked Cosmo Canyon. My people have always been the canyon's guardians, and my father, Seto, was the greatest of them.\fBut when the Gi came... he ran.");
    yield s.say('redxiii', "He fled, and left my mother and everyone else to fight without him.\fThe guardian of Cosmo Canyon... a coward. I will never forgive him.");
    yield s.say('cloud', "......");
    s.spawn('bugen', 'bugenhagen', 17, 18, 'up', { name: 'Bugenhagen' });
    yield s.move('bugen', 21, 16);
    yield s.say('bugen', "Nanaki.");
    yield s.face('redxiii', 'bugen');
    yield s.say('redxiii', "Grandfather...?");
    yield s.say('bugen', "You have it wrong about your father. I've let you believe it far too long.\fThere is something you must see with your own eyes. Seto... did not run.");
    yield s.say('redxiii', "What...? What do you mean?");
    yield s.say('bugen', "Come with me to the Cave of the Gi. That door has been sealed since the day of the battle.\fHo ho hoo... It is time it was opened.");
    yield s.face('bugen', 'player');
    yield s.say('bugen', "Cloud. Will you come as well? The cave is no place for an old man floating around on a machine. I could use a strong arm.");
    const c = yield s.ask('cloud', '', ["Let's go.", 'Give us a minute.'], { noQuotes: true });
    s.set('c6b_candle_done');
    if (c === 0) {
      yield s.say('bugen', "Ho ho hoo! Then to the sealed door. It's down the passage on the west side of the square.");
      yield s.goto('cosmo_gihall', 'from_plaza');
      return;
    }
    yield s.say('bugen', "Ho ho hoo. Take your time. Nanaki and I will wait at the sealed door, down the passage on the west side of the square.");
    yield [s.move('bugen', 17, 18), s.move('redxiii', 17, 18)];
    s.remove('bugen');
    s.hide('redxiii');
  }

  FF7.defineMap('cosmo_plaza', {
    name: 'Cosmo Canyon', area: 'Cosmo Canyon', theme: 'cosmo',
    music: s => s.flag('c6b_candle_start') && !s.flag('c6b_candle_done') ? 'holding' : 'cosmo',
    // FF7 (07-cosmocanyon16/28): the Cosmo Candle (a campfire '@', flickering) burns on a round, rough
    // stone floor in the middle of the square; terraces climb the red rock behind it: the hall on the west terrace
    // (h3, stone steps), the huts and general store on the upper east terrace (h6, two ladders); the
    // inn at ground level on the east, the passage to the Cave of the Gi on the west edge.
    look: { floor3: ['#a86a44', '#a0643e'], roof: '#4a6a38', wallTop: '#7a4630', floor2: ['#8a6a50', '#826248'] },
    camera: { pitch: 45, dist: 11 },
    lights: [[11, 9, '#ffc070', 2], [24, 9, '#ffc070', 2], [11, 15, '#ffc070', 2], [24, 15, '#ffc070', 2], [23, 3, '#ffc070', 2]],
    grid: [
      "##################################",
      "#hhwh+hhwhhhh#####hhhwhhhh+hhwhhh#",
      "#o........j..#####B.............o#",
      "#............#####.....l......j..#",
      "#...!........#####...............#",
      "#............R###RRHRRRRRRRRRRRHR#",
      "#RRRRRRR^^RRR..............hhhhhh#",
      "#.......^^.................hhhhhh#",
      "#..............:::::.......hhhhhh#",
      "#..........l..:::::::...l..hwh+hw#",
      "#............:::::::::...........#",
      "#............::::@::::...........#",
      ".............:::::::::......DD...#",
      ".............:::::::::...........#",
      "#.............:::::::............#",
      "#..........l...:::::....l........#",
      "#..Ro.........................R..#",
      "#RRRRRRRRRRRRR........RRRRRRRRRRR#",
      "#RRRRRRRRRRRRRR......RRRRRRRRRRRR#",
      "#RRRRRRRRRRRRRR......RRRRRRRRRRRR#",
    ],
    heights: [
      "5777777777777777777777777777777775",
      "5333333333333777776666666666666665",
      "5333333333333777776666666666666665",
      "5333333333333777776666666666666665",
      "5333333333333777776666666666666665",
      "5333333333333277721311111111111315",
      "5333333322333000000000000000000005",
      "5000000011000000000000000000000005",
      "5000000000000000000000000000000005",
      "5000000000000000000000000000000005",
      "5000000000000000000000000000000005",
      "5000000000000000000000000000000005",
      "0000000000000000000000000000000005",
      "0000000000000000000000000000000005",
      "5000000000000000000000000000000005",
      "5000000000000000000000000000000005",
      "5001000000000000000000000000001005",
      "5222222222222200000000222222222225",
      "5222222222222220000002222222222225",
      "5222222222222220000002222222222225",
    ],
    props: [
      { at: [17, 11.5], prop: 'disc', r: 4.3, h: 0.03, sides: 18, col: '#6a4a36', top: '#8a6a50', rim: '#735640', rimW: 0.35, ring: '#7e5e46' },
      { at: [17, 11], prop: 'campfire', size: 1.35, col: '#ffa040' },
    ],
    entries: {
      from_gate: [17, 18, 'up'], from_hall: [5, 2, 'down'], from_itemshop: [26, 2, 'down'],
      from_inn: [30, 10, 'down'], from_gihall: [1, 12, 'right'], candle: [17, 16, 'up'],
    },
    exits: [
      { at: [15, 19, 6, 1], to: 'cosmo_gate', entry: 'from_plaza' },
      { at: [5, 1, 1, 1], to: 'cosmo_hall', entry: 'from_plaza', sfx: 'door' },
      { at: [26, 1, 1, 1], to: 'cosmo_itemshop', entry: 'from_plaza', sfx: 'door' },
      { at: [30, 9, 1, 1], to: 'cosmo_inn', entry: 'from_plaza', sfx: 'door' },
      { at: [0, 12, 1, 2], to: 'cosmo_gihall', entry: 'from_plaza', if: s => s.flag('c6b_candle_done'),
        blocked: function* (s) { yield s.say('Guard', "Sorry, this passage leads to the Cave of the Gi. It's sealed.\fOnly Elder Bugenhagen may open that door."); } },
    ],
    npcs: [
      // townsfolk
      { id: 'guard_gi', name: 'Guard', model: GUARD, at: [2, 14], dir: 'right', talk: function* (s) {
        if (s.flag('c6b_done')) yield s.say('Guard', "Seto stood against the Gi all by himself... and we called him a coward all these years.\fThe whole canyon owes him an apology.");
        else if (s.flag('c6b_candle_done') && !s.flag('c6b_gi_open')) yield s.say('Guard', "The Elder is waiting for you at the sealed door. Just down this passage.");
        else yield s.say('Guard', "That passage leads to the Cave of the Gi. Nobody goes near it.\fNot since the Gi tribe's attack, back before Nanaki was even born.");
      } },
      { id: 'elder', name: 'Elder', model: 'cosmo_elder', at: [18, 14], dir: 'up', talk: function* (s) {
        if (s.flag('c6b_done')) { yield s.say('Elder', "The Candle burns bright tonight. A good omen for your journey, travelers."); return; }
        yield s.say('Elder', "This is the Cosmo Candle. It has burned since the first scholars gathered in this canyon to listen to the Planet.\fThey say it has never once gone out. We intend to keep it that way.");
      } },
      { id: 'scholar', name: 'Scholar', model: 'man3', at: [6, 9], dir: 'right', talk: function* (s) {
        yield s.say('Scholar', "I came here from Junon to study Planet Life. The idea that the Planet itself is a living thing...\fAt first I thought it was superstition. Then I spent a night in the observatory. Now I'm not so sure of anything.");
      } },
      { id: 'woman', name: 'Woman', model: 'woman4', at: [12, 16], dir: 'up', talk: function* (s) {
        yield s.say('Woman', "Elder Bugenhagen founded the observatory at the top of the canyon. He's the greatest of our teachers.\fHe's over a hundred years old, you know, and sharper than any of us!");
      } },
      { id: 'kid', name: 'Boy', model: 'kid2', at: [25, 15], dir: 'left', wander: 3, talk: function* (s) {
        if (s.flag('c6b_done')) yield s.say('Boy', "Nanaki's dad was a HERO! I knew it! ...Okay, I didn't know it. But I hoped!");
        else yield s.say('Boy', "Nanaki's back! Nanaki's back! He's gotten so big!\fHe used to let me ride on his back. ...Once.");
      } },
      // party members waiting around town (form a party here)
      { id: 'tifa_town', name: 'Tifa', model: 'tifa', at: [15, 12], dir: 'right', show: townMember('tifa'), talk: function* (s) {
        yield* memberChat(s, 'tifa_town', 'tifa', "It's so peaceful here... I think I'll stay by the Candle for a while.\fWatching a fire helps me think. Well... sometimes.");
      } },
      { id: 'aeris_town', name: 'Aeris', model: 'aeris', at: [7, 8], dir: 'down', show: townMember('aeris'), talk: function* (s) {
        yield* memberChat(s, 'aeris_town', 'aeris', "Can you feel it, Cloud? This whole canyon feels... alive. Like it's listening to us.\fI wonder what it would say, if it could talk.");
      } },
      { id: 'yuffie_town', name: 'Yuffie', model: 'yuffie', at: [24, 3], dir: 'down', show: townMember('yuffie'), talk: function* (s) {
        yield* memberChat(s, 'yuffie_town', 'yuffie', "Psst. You think anybody'd notice if a couple of materia went missing from that shop upstairs?\f...Kidding! Mostly.");
      } },
      // evening at the Cosmo Candle
      { id: 'barret', name: 'Barret', model: 'barret', at: [16, 13], dir: 'up', show: atCandle('barret'), talk: function* (s) {
        yield* candleTalk(s, 'barret', "Cosmo Canyon... Heh. Back in Midgar, I used to tell Jessie, Biggs and Wedge...\f\"Once we bring Shinra down, I'm takin' all y'all to Cosmo Canyon.\"\fThey got so damn excited. Wedge kept askin' what the food was like.\f...I'm here now. They ain't. So I gotta make this count. For them.");
      } },
      { id: 'tifa', name: 'Tifa', model: 'tifa', at: [19, 12], dir: 'left', show: atCandle('tifa'), talk: function* (s) {
        yield* candleTalk(s, 'tifa', "The fire's beautiful, isn't it?\f...Cloud. Do you remember? That night in Nibelheim... everything burned, just like this.\fI... There's something I've been... \f...No. Never mind. It's nothing.");
      } },
      { id: 'aeris', name: 'Aeris', model: 'aeris', at: [16, 10], dir: 'down', show: atCandle('aeris'), talk: function* (s) {
        yield* candleTalk(s, 'aeris', "Grandpa Bugenhagen told me something, after you all left the observatory.\fHe said I'm the last one. The only Cetra left in the whole world.\f...I thought hearing it would make me feel lonely. And it does, a little.\fBut it also feels like there's something only I can do. I just don't know what it is yet.");
      } },
      { id: 'caitsith', name: 'Cait Sith', model: 'caitsith', at: [15, 11], dir: 'right', show: atCandle('caitsith'), talk: function* (s) {
        yield* candleTalk(s, 'caitsith', "This place sure is somethin', eh? Makes a fella think.\fY'know... sometimes I wonder if I really belong with you lot.\fAh, don't mind me! It's just the campfire makin' me all soppy. Fancy a fortune? No? Suit yerself!");
      } },
      { id: 'yuffie', name: 'Yuffie', model: 'yuffie', at: [18, 10], dir: 'down', show: atCandle('yuffie'), talk: function* (s) {
        yield* candleTalk(s, 'yuffie', "Ugh, why's everybody so gloomy? It's a campfire! You're supposed to tell ghost stories!\f...Wutai used to be amazing, y'know. Before the war with Shinra. Now it's just a sleepy tourist trap.\f...Hey! Don't you dare tell anybody I said that!");
      } },
      { id: 'redxiii', name: 'Red XIII', model: 'redxiii', at: [23, 14], dir: 'right', show: atCandle('redxiii'), talk: redCandle },
    ],
    onEnter: function* (s) {
      if (!s.flag('c6b_candle_start') || s.flag('c6b_candle_intro')) return;
      s.set('c6b_candle_intro');
      yield s.caption('Evening settles over Cosmo Canyon.\n\nOne by one, the party gathers around the Cosmo Candle.', { hold: 170, bg: 'rgba(0,0,0,0.85)' });
      yield s.say('cloud', "(Everyone's lost in their own thoughts tonight...)");
    },
  });

  // ------------------------------------------------------------------ inn
  const innkeeper = function* (s) {
    yield s.inn(100, { who: 'Innkeeper', text: "Oh! You're Nanaki's friends? Welcome, welcome!\nA night's rest is 100 gil. Would you like to stay?" });
  };
  FF7.defineMap('cosmo_inn', {
    name: 'Cosmo Canyon Inn', area: 'Cosmo Canyon', theme: 'house',
    look: { wall: '#b07a50', trim: '#5a3018', floor: ['#8a5a38', '#825432'] },
    grid: [
      "####################",
      "#kk.....^......q..k#",
      "#..................#",
      "#..........DDDD....#",
      "#..................#",
      "#..t.c.............#",
      "#.................o#",
      "#########+##########",
    ],
    entries: { from_plaza: [9, 6, 'up'], from_2f: [8, 2, 'down'] },
    exits: [
      { at: [9, 7, 1, 1], to: 'cosmo_plaza', entry: 'from_inn', sfx: 'door' },
      { at: [8, 1, 1, 1], to: 'cosmo_inn2', entry: 'from_1f' },
    ],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman7', at: [13, 2], dir: 'down', talk: innkeeper },
      { id: 'guest', name: 'Traveler', model: 'man7', at: [4, 4], dir: 'right', talk: function* (s) {
        yield s.say('Traveler', "I came to hear Bugenhagen's lectures. Three days I've waited, and he still hasn't come down from that observatory.\fStill... the stars from up here are worth the wait.");
      } },
    ],
    triggers: [counter([12, 3, 4, 1], innkeeper)],
  });

  FF7.defineMap('cosmo_inn2', {
    name: 'Cosmo Canyon Inn 2F', area: 'Cosmo Canyon', theme: 'house',
    look: { wall: '#b07a50', trim: '#5a3018', floor: ['#8a5a38', '#825432'] },
    grid: [
      "##################",
      "#b.b.b.!...b.b.b.#",
      "#................#",
      "#....t.......t...#",
      "#................#",
      "#................#",
      "#...............^#",
      "##################",
    ],
    entries: { from_1f: [15, 6, 'left'] },
    exits: [{ at: [16, 6, 1, 1], to: 'cosmo_inn', entry: 'from_2f' }],
    npcs: [
      { id: 'sleeper', name: 'Traveler', model: 'man10', at: [13, 1], dir: 'down', anim: 'lie', talk: function* (s) {
        yield s.msg("Zzz... Ho ho... hoo... Zzz...\n(He seems to be dreaming about the observatory.)");
      } },
    ],
    objects: [
      { at: [7, 1], talk: function* (s) {
        yield s.msg('A flyer is pinned to the wall:\n"TURTLE\'S PARADISE — No.5\nHave you found all six of our flyers?\nBring your eagle eyes to Wutai for a special prize!"');
        if (!s.flag('c6b_turtle_flyer5')) { s.set('c6b_turtle_flyer5'); s.inc('turtle_flyers'); }
      } },
      { at: [1, 6], if: s => !s.flag('c6b_elixir'), talk: function* (s) {
        yield s.msg("Something is tucked away in the corner, behind the bed frame...");
        s.set('c6b_elixir');
        yield s.give('elixir');
      } },
    ],
  });

  // ------------------------------------------------------------------ item shop (up the ladder)
  const itemShop = function* (s) {
    yield s.say('Shopkeeper', "Welcome! Potions, remedies, supplies for the road... Take a look.");
    yield s.shop('cosmo_canyon_items');
  };
  FF7.defineMap('cosmo_itemshop', {
    name: 'Cosmo Canyon General Store', area: 'Cosmo Canyon', theme: 'house',
    look: { wall: '#b07a50', trim: '#5a3018', floor: ['#8a5a38', '#825432'] },
    grid: [
      "################",
      "#qq..jj..kk..BB#",
      "#..............#",
      "#....DDDD......#",
      "#..............#",
      "#.............o#",
      "#######+########",
    ],
    entries: { from_plaza: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'cosmo_plaza', entry: 'from_itemshop', sfx: 'door' }],
    npcs: [{ id: 'clerk', name: 'Shopkeeper', model: 'man11', at: [6, 2], dir: 'down', talk: itemShop }],
    triggers: [counter([5, 3, 4, 1], itemShop)],
    objects: [
      // FF7: a Magic Source turns up behind the shop's crates on Disc 2/3
      { at: [14, 2], if: s => s.flag('disc2') && !s.flag('c6b_magic_source'), talk: function* (s) {
        yield s.msg("Behind the crates, something small glints in the dust...");
        s.set('c6b_magic_source');
        yield s.give('magic_source');
      } },
    ],
  });

  // ------------------------------------------------------------------ the hall: Tiger Lily's, Barret's room
  const tigerLily = function* (s) {
    yield s.say('Tiger Lily', "Welcome to Tiger Lily's! The finest arms between here and Nibelheim. Take your time.");
    yield s.shop('cosmo_canyon_weapons');
  };
  // FF7 date points: "Go on" Barret +3, then "And then?" Barret +3. A brush-off stops his story; talking to
  // him again picks it up where it stopped (var c6b_barret_talk: 0 not started, 1 halfway, 2 told).
  function* barretRoom(s) {
    const stage = s.get('c6b_barret_talk');
    if (stage < 2) {
      if (stage === 0) {
        yield s.say('barret', "...Cloud. Y'know, I been here before. Years back, before AVALANCHE.\fThis is where I first heard about \"Planet Life\". The Planet's alive, it's hurtin', Mako's killin' it... all of that.");
        const DP = [{ barret: 3 }, {}];
        const c = yield s.ask('cloud', '', ['Go on.', "I'd rather not."], { noQuotes: true, date: DP });
        FF7.story.datePts(s, DP[c]);
        if (c !== 0) { yield s.say('barret', "Hmph. Suit yourself."); return; }
        s.setVar('c6b_barret_talk', 1);
        yield s.say('barret', "I went back to Corel all fired up. Told myself I was gonna save the Planet.");
      } else yield s.say('barret', "...Like I was sayin'. I went back to Corel all fired up. Told myself I was gonna save the Planet.");
      const DP2 = [{ barret: 3 }, {}];
      const c2 = yield s.ask('cloud', '', ['And then?', 'Yeah, whatever...'], { noQuotes: true, date: DP2 });
      FF7.story.datePts(s, DP2[c2]);
      if (c2 !== 0) { yield s.say('barret', "Hmph. Figures. Go on, get outta here."); return; }
      s.setVar('c6b_barret_talk', 2);
      yield s.say('barret', "But lookin' back... maybe I just wanted payback. For Corel. For Myrna. For my arm.");
      yield s.say('barret', "Usin' the Planet as an excuse to get even with Shinra... Heh. Some hero, huh?\f...Forget it. Just thinkin' out loud.");
    } else yield s.say('barret', "...Don't mind me. Just thinkin' about Corel.");
    const d = yield s.ask(null, 'Change the party?', ['Yes', 'No']);
    if (d !== 0) return;
    yield s.choosePArty(['cloud']);
    if (s.inParty('barret')) s.hide('barret_town');
  }

  FF7.defineMap('cosmo_hall', {
    name: 'Cosmo Canyon', area: 'Cosmo Canyon', theme: 'house',
    look: { wall: '#a8704a', trim: '#5a3018', floor: ['#8a5a38', '#825432'], floor2: ['#9a6a44', '#92623e'] },
    grid: [
      "########################",
      "#kk...!....^.#..b...b.k#",
      "#............#.........#",
      "#..DDDD.........t......#",
      "#............#.........#",
      "#..........o.#......jj.#",
      "#............#.........#",
      "#######+################",
    ],
    entries: { from_plaza: [7, 6, 'up'], from_hall2: [11, 2, 'down'] },
    exits: [
      { at: [7, 7, 1, 1], to: 'cosmo_plaza', entry: 'from_hall', sfx: 'door' },
      { at: [11, 1, 1, 1], to: 'cosmo_hall2', entry: 'from_hall' },
    ],
    npcs: [
      { id: 'tigerlily', name: 'Tiger Lily', model: { base: 'woman', hair: '#e0a030', hairStyle: 'ponytail', top: '#c05020', sleeve: '#c05020', bottom: '#5a3018', extras: ['bangles'] },
        at: [4, 2], dir: 'down', talk: tigerLily },
      { id: 'student', name: 'Student', model: 'girl4', at: [9, 5], dir: 'left', talk: function* (s) {
        yield s.say('Student', "The ladder upstairs goes all the way up to the observatory. Only the Elder's guests are allowed inside.\fI've been a student here for two years and I've only been up there once!");
      } },
      { id: 'barret_town', name: 'Barret', model: 'barret', at: [18, 4], dir: 'left', show: townMember('barret'), talk: barretRoom },
    ],
    objects: [
      { at: [6, 1], talk: function* (s) {
        yield s.msg('A flyer is tacked to the notice board:\n"TURTLE\'S PARADISE — No.4\nOur drinks will make you forget your troubles...\nand your way home! Wutai\'s favorite bar."');
        if (!s.flag('c6b_turtle_flyer4')) { s.set('c6b_turtle_flyer4'); s.inc('turtle_flyers'); }
      } },
    ],
    triggers: [counter([3, 3, 4, 1], tigerLily)],
  });

  // ------------------------------------------------------------------ upper floor: materia shop, kitchen, study
  const materiaShop = function* (s) {
    yield s.say('Shopkeeper', "Materia holds the knowledge of the Ancients... and a little of it can be yours, for a price.");
    yield s.shop('cosmo_canyon_materia');
  };
  FF7.defineMap('cosmo_hall2', {
    name: 'Cosmo Canyon', area: 'Cosmo Canyon', theme: 'house',
    look: { wall: '#a8704a', trim: '#5a3018', floor: ['#8a5a38', '#825432'] },
    grid: [
      "########################",
      "#kkk..H......#F..q..ttt#",
      "#............#.........#",
      "#...DDD..........c.c...#",
      "#............#..ttt....#",
      "#.tc.........#.........#",
      "#............#.........#",
      "##^#####################",
    ],
    entries: { from_hall: [2, 6, 'up'], from_observatory: [6, 2, 'down'] },
    exits: [
      { at: [2, 7, 1, 1], to: 'cosmo_hall', entry: 'from_hall2' },
      { at: [6, 1, 1, 1], to: 'cosmo_observatory', entry: 'from_hall2' },
    ],
    npcs: [
      { id: 'materia_clerk', name: 'Shopkeeper', model: 'oldman3', at: [5, 2], dir: 'down', talk: materiaShop },
      { id: 'teacher', name: 'Elder', model: 'cosmo_elder2', at: [4, 5], dir: 'left', talk: function* (s) {
        if (s.flag('c6b_done')) { yield s.say('Elder', "Seto... We elders suspected, but only Bugenhagen knew for certain.\fHe carried that secret alone for a very long time."); return; }
        yield s.say('Elder', "Here we study Planet Life: the idea that the Planet is a living being, and that all life flows through it and back.\fBugenhagen was the first to put it into words. The rest of us are still catching up to him.");
      } },
      { id: 'cook', name: 'Cook', model: 'bartender', at: [15, 2], dir: 'down', talk: function* (s) {
        yield s.say('Cook', "Tonight it's canyon stew! Beans, peppers, and a secret spice that I will take to my grave.\fYour little friend over there keeps sniffing the pot, but he won't eat a bite.");
      } },
      { id: 'cait_town', name: 'Cait Sith', model: 'caitsith', at: [18, 3], dir: 'left', show: townMember('caitsith'), talk: function* (s) {
        yield* memberChat(s, 'cait_town', 'caitsith', "Mmm! Smells grand in here, doesn't it? Not that I can eat, mind... Er, I mean!\fHa ha! I'm on a diet! Strict diet! Moogle's orders!");
      } },
    ],
    triggers: [counter([4, 3, 3, 1], materiaShop)],
  });

  // ================================================================== the observatory and Bugenhagen
  function* meetBugenhagen(s) {
    s.set('c6b_met_bugen');
    yield s.move('player', 9, 11);
    yield s.face('player', 'left');
    yield s.say('bugen', "Ho ho hoo. So these are the friends Nanaki has been telling me about.");
    yield s.face('redxiii_home', 'player');
    yield s.say('redxiii', "Everyone, this is my grandfather, Bugenhagen. There's no one alive who knows more about the Planet.");
    yield s.say('bugen', "Ho ho hoo! Flattery, from my own grandson!\fI am only a curious old man. A hundred and thirty years old, give or take a few.");
    yield s.say('cloud', "(...A hundred and thirty?)");
    yield s.say('redxiii', "Grandfather floats around on that machine everywhere he goes. He says his legs retired before he did.");
    yield s.say('bugen', "Ho ho hoo! Tell me, young ones, would you like to see my observatory?\fThe whole Planet, laid out before your eyes. Gather whoever wishes to come, then speak to me.");
  }
  function* bugenTalk(s) {
    if (s.flag('c6b_done')) {
      yield s.say('bugen', "Ho ho hoo. Take care of Nanaki for me. He is strong... but to our kind, he is still barely more than a child.\fAnd listen to the Planet as you travel. It has a great deal to say.");
      return;
    }
    const c = yield s.ask('bugen', "Ho ho hoo. Shall we go up to the observatory?", ["Let's go.", 'Change the party first.', 'Not yet.']);
    if (c === 2) { yield s.say('bugen', "Ho ho hoo. Take your time. I've waited a hundred years; a few minutes won't hurt."); return; }
    if (c === 1) yield s.choosePArty(['cloud']);
    yield s.say('bugen', "Ho ho hoo! Then follow me.");
    yield s.goto('cosmo_planetarium', 'from_observatory');
  }

  FF7.defineMap('cosmo_observatory', {
    name: "Bugenhagen's Observatory", area: 'Cosmo Canyon', theme: 'house', music: 'cry',
    // a round room under the dome (07-cosmocanyon22-24): the crystal sphere on its projector ring in the
    // middle, brass machinery and the great telescope round the wall, the door up into the dome at
    // the top and the ladder down to the hall at the bottom
    look: { wall: '#2e3a66', trim: '#1a2040', floor: ['#5a4a3a', '#524232'], floor2: ['#6a5a4a', '#625242'],
      floor3: ['#8a7a5a', '#827252'], metal: ['#a88a44', '#9a7c3a'], wallH: 3.2 },
    camera: { pitch: 58, dist: 10 },
    lights: [[9, 7, '#80c0ff', 2.5], [4, 3, '#ffd080', 2], [14, 3, '#ffd080', 2]],
    grid: [
      "#########+#########",
      "######.......######",
      "####.MP.....PM.####",
      "###.M.........M.###",
      "###.............###",
      "##......___......##",
      "##M....__.__....M##",
      "##....._.U._.....##",
      "##.....__.__.....##",
      "##......___......##",
      "##M.............M##",
      "##...............##",
      "###k...........k###",
      "###.kq.......jk.###",
      "####...........####",
      "######.......######",
      "#########H#########",
    ],
    entries: { from_hall2: [9, 15, 'up'], from_planetarium: [9, 1, 'down'] },
    exits: [
      { at: [9, 16, 1, 1], to: 'cosmo_hall2', entry: 'from_observatory' },
      { at: [9, 0, 1, 1], to: 'cosmo_planetarium', entry: 'from_observatory', if: s => false,
        blocked: function* (s) { yield s.msg("A heavy door leads into the observatory dome. It won't budge."); } },
    ],
    npcs: [
      { id: 'bugen', name: 'Bugenhagen', model: 'bugenhagen', at: [7, 11], dir: 'right',
        show: s => !s.flag('c6b_planetarium') || s.flag('c6b_done'), talk: bugenTalk },
      { id: 'redxiii_home', name: 'Red XIII', model: 'redxiii', at: [11, 11], dir: 'left', show: s => !s.flag('c6b_planetarium'),
        talk: function* (s) { yield s.say('redxiii', "It's good to be home. ...Grandfather hasn't changed a bit.\fHe still laughs at his own jokes before he finishes telling them."); } },
    ],
    objects: [
      { at: [5, 2], talk: function* (s) { yield s.msg("A great brass telescope, aimed at the sky through a slit in the roof."); } },
      { at: [4, 3], talk: function* (s) { yield s.msg("A great brass telescope, aimed at the sky through a slit in the roof."); } },
      { at: [13, 2], talk: function* (s) { yield s.msg("Strange instruments hum quietly. Needles twitch as if they're measuring something far beneath the ground."); } },
      { at: [14, 3], talk: function* (s) { yield s.msg("Strange instruments hum quietly. Needles twitch as if they're measuring something far beneath the ground."); } },
      { at: [9, 7], talk: function* (s) { yield s.msg("A crystal sphere, faintly glowing. Look closely and tiny lights seem to drift inside it, like a slow green river."); } },
    ],
    onEnter: function* (s) {
      if (!s.flag('c6b_met_bugen')) yield* meetBugenhagen(s);
    },
  });

  // ------------------------------------------------------------------ the planetarium: the Lifestream
  function* planetariumLesson(s) {
    s.music('cry');
    const pty = spawnParty(s, [[8, 7, 'up'], [12, 7, 'up']]);
    s.spawn('bugen', 'bugenhagen', 10, 2, 'down', { name: 'Bugenhagen' });
    if (!has(pty, 'redxiii')) s.spawn('redxiii', 'redxiii', 6, 5, 'right', { name: s.name('redxiii') });
    yield s.move('player', 10, 7);
    yield s.face('player', 'up');
    yield s.say('bugen', "Ho ho hoo. Welcome to my planetarium. Everything I've learned in a hundred and thirty years, I've learned watching this.\fNow... let's turn down the lights.");
    yield s.fadeOut(40, '#000010');
    yield s.caption("The lights fade. Overhead, the dome fills with stars...\n\nand in the center of the room, a glowing model of the Planet\nbegins to turn slowly in the dark.", { hold: 230, bg: 'rgba(0,0,16,0.92)' });
    yield s.fadeIn(40);
    yield s.cam(10, 4, 70, { dist: 6.5, pitch: 36 });
    yield s.say('bugen', "Listen carefully. The Planet is dying.");
    if (has(pty, 'barret')) yield s.say('barret', "Dyin'!? ...Yeah! That's what we been sayin'! Shinra's killin' it!");
    yield s.say('bugen', "Not tomorrow. Not next year. But its end is coming, far sooner than anyone believes.");
    yield s.say('cloud', "How can you be so sure?");
    yield s.say('bugen', "Because I can hear it. The Planet cries out. Ho ho hoo... few people bother to listen anymore.\fLet me show you something.");
    yield s.cam(10, 4, 90, { dist: 6, pitch: 30, yaw: 30 });
    yield s.caption("Tiny points of light rise from the surface of the model Planet,\nthousands upon thousands of them,\ndrifting together into a single shining current.", { hold: 220, bg: 'rgba(0,10,20,0.85)' });
    yield s.say('bugen', "When a living thing dies, its body returns to the earth. But its spirit returns to the Planet.\fEvery spirit. Human, beast, bird, tree. All of them.");
    yield s.say('bugen', "The spirits flow together and mingle, a great river of energy running beneath our feet.\fThat river is the Lifestream. Spirit Energy.");
    yield s.cam(10, 4, 90, { dist: 6, pitch: 30, yaw: -30 });
    yield s.caption("The current circles the Planet, sinks back beneath its surface...\nand wherever it rises again, new life stirs:\nseedlings, hatchlings, a newborn's first breath.", { hold: 220, bg: 'rgba(0,16,10,0.85)' });
    yield s.say('bugen', "In time, that energy flows out again and gives birth to new life. Children, animals, forests...\fAll of it is one great cycle. Nothing is ever truly lost. Unless...");
    yield s.cam(10, 4, 60, { dist: 6.5, pitch: 34, yaw: 0 });
    yield s.caption("Here and there on the model, small metal towers dot the surface.\nThe shining current bends toward them... and vanishes.", { hold: 200, bg: 'rgba(10,6,0,0.85)' });
    yield s.say('bugen', "Unless someone sucks it out of the ground, burns it, and calls it \"energy\".");
    yield s.say('bugen', "That is what a Mako reactor does. Every drop of Mako is Spirit Energy that will never return to the cycle.\fThe Lifestream grows thinner. The Planet grows weaker.");
    if (has(pty, 'tifa')) yield s.say('tifa', "So every reactor... every streetlight in Midgar...");
    if (has(pty, 'barret')) yield s.say('barret', "...Damn. Damn it all.");
    yield s.say('bugen', "And materia? Materia is Spirit Energy condensed and crystallized, until it holds the knowledge of the Ancients themselves.\fThat is why materia lets you wield magic. You are borrowing the wisdom of the Planet.");
    if (has(pty, 'aeris')) yield s.say('aeris', "The knowledge of the Ancients... of the Cetra...");
    if (has(pty, 'yuffie')) yield s.say('yuffie', "Wait. So my materia's made out of... dead people?\f...Ew. Still totally mine, though.");
    if (has(pty, 'caitsith')) yield s.say('caitsith', "......Heavy stuff. Real heavy.");
    yield s.say('bugen', "Now close your eyes, and listen.");
    s.stopMusic(60);
    yield 90;
    yield s.caption("......\n\nA low, distant sound fills the dome.\nLike wind moaning through a canyon...\nor someone, somewhere, weeping.", { hold: 240, bg: 'rgba(0,0,0,0.9)' });
    s.music('cry');
    yield s.say('bugen', "That is the cry of the Planet.");
    yield s.say('cloud', "......");
    yield s.say('bugen', "All things that are born must end. Even a planet. That is nature, and I would not weep over it.\fBut to watch its life bled away before its time... That is what saddens this old man.");
    yield s.say('redxiii', "Grandfather...");
    yield s.cam(10, 6, 40, { dist: 9.5, pitch: 50, yaw: 0 });
    s.camFollow();
    yield s.say('bugen', "Ho ho hoo. Enough lecturing for one day. Go down and rest by the Candle, all of you.");
    s.set('c6b_planetarium');
    s.set('c6b_candle_start');
    if (s.isMember('aeris')) {
      yield s.say('aeris', "Grandpa Bugenhagen... may I stay a little longer? There's something I'd like to ask you.");
      yield s.say('bugen', "Ho ho hoo. Of course, child. Of course.");
    }
    yield s.fadeOut(40);
    clearParty(s, pty);
    s.remove('bugen'); s.remove('redxiii');
    yield s.goto('cosmo_plaza', 'candle');
  }

  FF7.defineMap('cosmo_planetarium', {
    name: 'Planetarium', area: 'Cosmo Canyon', theme: 'space', music: 'cry',
    look: { floor: ['#1a1a30', '#16162a'], floor2: ['#202040', '#1c1c3a'], wall: '#24243e', trim: '#101020', mako: '#3a8aff',
      sky: ['#000006', '#00000e'], ambient: [0.26, 0.28, 0.4], light: [0.5, 0.55, 0.8] },
    lights: [[10, 4, '#60a0ff', 3.5]],
    grid: [
      "######################",
      "#k.U....U.....U....Uk#",
      "#....................#",
      "#........***.........#",
      "#.U......***.......U.#",
      "#........***.........#",
      "#....................#",
      "#..U..............U..#",
      "#....................#",
      "##########+###########",
    ],
    entries: { from_observatory: [10, 8, 'up'] },
    exits: [{ at: [10, 9, 1, 1], to: 'cosmo_observatory', entry: 'from_planetarium' }],
    onEnter: function* (s) {
      if (!s.flag('c6b_planetarium')) yield* planetariumLesson(s);
    },
  });

  // ================================================================== the sealed door of the Cave of the Gi
  function* openGiDoor(s) {
    s.set('c6b_gi_asked');
    yield s.move('player', 9, 3);
    yield s.face('player', 'up');
    yield s.say('bugen', "Ho ho hoo. Here we are. Beyond this door lies the Cave of the Gi.");
    const c = yield s.ask('bugen', "Nanaki will come with us, of course. Choose one more companion, then we'll open it. Ready?", ['Open the door.', 'Not yet.']);
    if (c !== 0) { yield s.say('bugen', "Ho ho hoo. We'll be right here."); return; }
    yield s.choosePArty(['cloud', 'redxiii']);
    s.phs(false);
    s.hide('redxiii_gi');
    yield s.move('bugen', 10, 2);
    yield s.face('bugen', 'up');
    s.sfx('gate');
    s.shake(3, 60);
    yield s.msg("Bugenhagen lays a hand on the great steel door.\fWith a long, deep groan, it grinds open for the first time in decades.");
    s.set('c6b_gi_open');
    yield s.say('redxiii', "The Cave of the Gi... Father...");
    yield s.face('bugen', 'down');
    yield s.say('bugen', "Stay close. The spirits of the Gi do not rest easily.");
    yield s.goto('gi_descent', 'from_door');
  }

  FF7.defineMap('cosmo_gihall', {
    name: 'Cave of the Gi Entrance', area: 'Cosmo Canyon', theme: 'cosmo', music: 'cosmo',
    look: { sky: ['#1a0a04', '#3a1a0a'], ambient: [0.4, 0.34, 0.3] },
    grid: [
      "####################",
      "#|.....hh++hh.....|#",
      "#.................j#",
      "#..................#",
      "#.u..............u.#",
      "#..................#",
      "#..................#",
      "########....########",
    ],
    entries: { from_plaza: [9, 6, 'up'], from_cave: [9, 2, 'down'] },
    exits: [
      { at: [8, 7, 4, 1], to: 'cosmo_plaza', entry: 'from_gihall' },
      { at: [9, 1, 2, 1], to: 'gi_descent', entry: 'from_door', if: s => s.flag('c6b_gi_open'),
        blocked: function* (s) { yield s.msg("A massive steel door, sealed tight. Strange markings are carved deep into its surface."); } },
    ],
    npcs: [
      { id: 'bugen', name: 'Bugenhagen', model: 'bugenhagen', at: [11, 2], dir: 'down',
        show: s => s.flag('c6b_candle_done') && !s.flag('c6b_gi_open'), talk: openGiDoor },
      { id: 'redxiii_gi', name: 'Red XIII', model: 'redxiii', at: [7, 2], dir: 'down',
        show: s => s.flag('c6b_candle_done') && !s.flag('c6b_gi_open'),
        talk: function* (s) { yield s.say('redxiii', "......I need to know the truth, Cloud. Whatever it is."); } },
    ],
    objects: [
      { at: [2, 4], talk: function* (s) { yield s.msg("A carved stone guardian, worn smooth by the wind. It faces the sealed door as if keeping watch."); } },
      { at: [17, 4], talk: function* (s) { yield s.msg("A carved stone guardian, worn smooth by the wind. It faces the sealed door as if keeping watch."); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6b_candle_done') && !s.flag('c6b_gi_open') && !s.flag('c6b_gi_asked')) yield* openGiDoor(s);
    },
  });
})();

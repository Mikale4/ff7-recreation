// Chapter 8, part 1 — the Keystone. The Weapon Seller's house (the Keystone lead, Mythril for a
// box), the Gold Saucer revisit: Dio's showroom, Dio's exhibition match in the Battle Square,
// the broken ropeway and the night at the Ghost Hotel, the date (Event Square play + gondola and
// fireworks, per partner), Cait Sith stealing the Keystone for Tseng, the chase to Chocobo Square
// and Cait Sith's confession (Shinra spy; Marlene and Elmyra held hostage).
// The regular gs_* maps belong to C6a; this file only patches them (FF7.patchMap).
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const TEAM = ['tifa', 'aeris', 'barret', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  const members = s => TEAM.filter(id => s.isMember(id));
  const partyNow = s => ['cloud'].concat(TEAM.filter(id => s.inParty(id))).slice(0, 3);
  // spawn party members as actors (id = character id) on the given spots; returns the ids used
  function spawnCrew(s, ids, spots, dir) {
    const used = ids.slice(0, spots.length);
    used.forEach((id, i) => s.spawn(id, id, spots[i][0], spots[i][1], spots[i][2] || dir || 'down', { name: s.name(id) }));
    return used;
  }
  const clearCrew = (s, ids) => ids.forEach(id => s.remove(id));
  const STAFF = { base: 'woman', top: '#e04090', sleeve: '#e04090', bottom: '#e04090', hair: '#f0d040', hairStyle: 'bun', skirt: 'short' };
  const NIGHT = { ambient: [0.24, 0.22, 0.36], light: [0.5, 0.46, 0.7], sky: ['#02020c', '#10103a'] };
  const KING = { base: 'oldman', top: '#b02828', sleeve: '#b02828', bottom: '#802020', hair: '#e0e0e0', extras: ['cape', 'beard'] };
  const DRAGON = { base: 'man', build: 'big', top: '#2a7a2a', sleeve: '#2a7a2a', bottom: '#1f5a1f', boots: '#1f5a1f', skin: '#4a9a3a', hair: '#184a18', hairStyle: 'spiky', extras: ['cape'] };
  const SELLER = { base: 'oldman', top: '#6a5a40', sleeve: '#6a5a40', bottom: '#4a4030', extras: ['apron', 'glasses'] };

  // ================================================================== Weapon Seller's house
  FF7.world.link('weapon_seller', { map: 'gs2_weapon_seller', entry: 'from_world' });
  const openBox = (which) => function* (s) {
    const item = which === 'small' ? 'great_gospel' : 'gold_armlet';
    if (s.flag('c8_ws_small') || s.flag('c8_ws_big')) {
      yield s.msg(s.flag(which === 'small' ? 'c8_ws_small' : 'c8_ws_big') ? 'The box is empty.' : 'The box is shut tight. Only one box, the old man said.');
      return;
    }
    if (!s.flag('c8_ws_paid')) { yield s.msg(which === 'small' ? 'A small wooden box with a heavy lock.' : 'A big iron-bound box. It is locked.'); return; }
    const c = yield s.ask(null, which === 'small' ? 'Open the small box upstairs?' : 'Open the big box downstairs?', ['Open it', 'Leave it']);
    if (c !== 0) return;
    s.set(which === 'small' ? 'c8_ws_small' : 'c8_ws_big');
    s.sfx('chest');
    yield s.give(item);
    yield s.say('Weapon Seller', which === 'small' ? "Hah! Picked the little one, eh? Good things come in small packages." : "The big one! Can't blame you. Solid work, that armlet.");
  };
  const sellerTalk = function* (s) {
    if (!s.flag('c8_ws_met')) {
      s.set('c8_ws_met');
      yield s.say('Weapon Seller', "Well now! Customers! I don't get many visitors way out here. Welcome to my workshop.");
      if (s.isMember('cid')) yield s.say('cid', "We're lookin' for a place called the Temple of the Ancients. Shinra's after it too, so spit it out if ya know anything.");
      else yield s.say('cloud', "We're looking for the Temple of the Ancients. Heard of it?");
      yield s.say('Weapon Seller', "The Temple of the Ancients... My, that takes me back. You know, I used to own a funny little stone. A 'Keystone', the old stories called it.\fSupposedly it's the key to that very Temple.");
      yield s.say('cloud', "Where is it now?");
      yield s.say('Weapon Seller', "Sold it, I'm afraid! Dio, the Gold Saucer's owner, snapped it up. He's mad for anything old and rare.\fLast I heard, he had it on display in his showroom, right next to the Battle Square.");
      if (s.isMember('aeris')) yield s.say('aeris', "The Gold Saucer again? ...Well, I won't complain!");
      yield s.say('Weapon Seller', "Oh, and while you're here... I'm a craftsman, see, and there's one thing I've wanted for years: Mythril. Real Mythril.\fBring me a piece and I'll let you open one of my boxes. The small one upstairs, or the big one down here. Your pick.");
    }
    if (s.flag('c8_ws_paid')) {
      yield s.say('Weapon Seller', (s.flag('c8_ws_small') || s.flag('c8_ws_big')) ? "Thanks again for the Mythril. Go get that Keystone from Dio, now!" : "Go on, open a box. Just the one, mind!");
      return;
    }
    if (s.has('mythril')) {
      const c = yield s.ask('Weapon Seller', "Hm? Is that... Mythril? Will you let me have it?", ['Give him the Mythril', 'Not now']);
      if (c !== 0) { yield s.say('Weapon Seller', "Aw... Well, the offer stands."); return; }
      s.take('mythril');
      s.set('c8_ws_paid');
      yield s.msg(`${s.name('cloud')} handed over the Mythril.`);
      yield s.say('Weapon Seller', "Beautiful... just beautiful. Right, a deal's a deal. Open one box, whichever you like: the small one upstairs, or the big one down here.");
      return;
    }
    yield s.say('Weapon Seller', "Mythril, remember! Bring me some and one of my boxes is yours.\fAnd the Keystone's with Dio at the Gold Saucer.");
  };
  FF7.defineMap('gs2_weapon_seller', {
    name: "Weapon Seller's House", area: 'Corel Desert', theme: 'house', music: 'farmboy',
    look: { wall: '#8a7458', trim: '#4a3a28', floor: ['#7a6450', '#725c48'] },
    grid: [
      "########################",
      "#bb.k....B.....jj....q.#",
      "#......................#",
      "#==================|^^|#",
      "#.....t.c..........|^^|#",
      "#..................|^^|#",
      "#......................#",
      "#.B..o..........DDD....#",
      "#......................#",
      "#...j..........k.......#",
      "###########++###########",
    ],
    heights: [
      "555555555555555555555555",
      "555555555555555555555555",
      "555555555555555555555555",
      "555555555555555555504405",
      "000000000000000000000330",
      "000000000000000000000110",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_world: [11, 9, 'up'] },
    exits: [{ at: [11, 10, 2, 1], to: 'world', loc: 'weapon_seller' }],
    npcs: [{ id: 'seller', name: 'Weapon Seller', model: SELLER, at: [13, 5], dir: 'down', talk: sellerTalk }],
    objects: [
      { at: [9, 1], talk: openBox('small') },
      { at: [2, 7], talk: openBox('big') },
      { at: [16, 7], talk: function* (s) { yield s.msg('A workbench piled with half-finished blades, files and tongs.'); } },
    ],
  });

  // ================================================================== Gold Saucer patches
  // Arrival remark on the first ropeway ride up after the Tiny Bronco.
  FF7.patchMap('gs_entrance', {
    onEnter: function* (s) {
      if (!s.flag('has_bronco') || s.flag('c8_keystone_got') || s.flag('c8_gs_back') || s.entry() !== 'from_ropeway') return;
      s.set('c8_gs_back');
      if (s.flag('c8_ws_met')) yield s.say('cloud', "(The Keystone... The old man said Dio keeps it in his showroom, next to the Battle Square.)");
      else yield s.say('cloud', "(Rufus is headed for the Temple of the Ancients... Dio collects every relic he can find. Maybe his showroom has something.)");
    },
  });
  // Dio's showroom opens off the east side of the Battle Square.
  FF7.patchMap('gs_battle', {
    exits: [{ at: [28, 4, 1, 3], to: 'gs2_showroom', entry: 'from_battle', sfx: 'door', if: s => s.flag('has_buggy'),
      blocked: function* (s) { yield s.msg('A gilded door: "DIO\'S SHOWROOM — Closed for renovation."'); } }],
  });
  // With the Keystone in hand the ropeway breaks down: a night at the Ghost Hotel.
  FF7.patchMap('gs_station', {
    triggers: [{ id: 'c8_ropeway', at: [13, 19, 4, 2], once: true, if: s => s.flag('c8_keystone_got') && !s.flag('c8_ropeway_broken'),
      run: function* (s) { yield* FF7.story.c8_ropewayBroken(s); } }],
  });

  // ================================================================== Dio's showroom
  const exhibit = (text) => function* (s) { yield s.msg(text); };
  FF7.defineMap('gs2_showroom', {
    name: "Dio's Showroom", area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    // ref 09-rockettown20: a pale lavender floor under purple drapes, exhibits behind red ropes
    look: { floor3: ['#a02838', '#982434'], floor: ['#c8b8dc', '#6a4a8a'], wall: '#6a3a8a', trim: '#e0c040' },
    camera: { pitch: 44, dist: 10 },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhNhhhhhhhhhhhhhhhhhhNhhh",
      "h.q..u..q...DD...q..u..q.h",
      "h........................h",
      "h.......__________.......h",
      "h..|....__________....|..h",
      "+.......__________.......h",
      "h..|.....................h",
      "h....u...............u...h",
      "hhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    lights: [[12, 2, '#fff0b0', 3], [5, 8, '#ffd060', 2], [21, 8, '#ffd060', 2]],
    entries: { from_battle: [1, 6, 'right'] },
    exits: [{ at: [0, 6, 1, 1], to: 'gs_battle', entry: 'from_station', sfx: 'door' }],
    npcs: [
      { id: 'curator', name: 'Guard', model: { base: 'man', top: '#202028', sleeve: '#202028', bottom: '#202028', extras: ['shades', 'tie'] }, at: [4, 4], dir: 'right',
        talk: function* (s) { yield s.say('Guard', s.flag('c8_keystone_got') ? "The boss lent you the Keystone? Huh. He must really like you." : "Look, but don't touch. The boss knows every piece in this room by heart."); } },
    ],
    objects: [
      { at: [2, 2], talk: exhibit('A glass case holds a dented helmet.\n"Worn by the first champion of the Battle Square."') },
      { at: [5, 2], talk: exhibit('A golden statue of Dio, flexing. The plaque just says: "ME."') },
      { at: [8, 2], talk: exhibit('A case of ancient pottery covered in spiral patterns.\n"Excavated near Bone Village, on the northern continent."') },
      { at: [17, 2], talk: exhibit('A scale model of the Gold Saucer, lit by tiny bulbs.\n"Built on the site of the old Corel desert, Year ...". The date has been scratched off.') },
      { at: [20, 2], talk: exhibit('A statue of a giant chocobo in full racing silks.') },
      { at: [23, 2], talk: exhibit('A rusted Mako reactor valve.\n"Souvenir of Mt. Corel." ...Not exactly a happy memory for Barret.') },
      { at: [5, 8], talk: exhibit('A bronze bust of a stern man with a huge moustache.\n"Dio\'s Grandfather — Founder of the Dio Fitness Method."') },
      { at: [21, 8], talk: exhibit('A mannequin in a tiny tuxedo. "Worn by Dio, Age 6." ...Somehow, the muscles were already there.') },
    ],
    triggers: [{ at: [12, 2, 2, 1], on: 'talk', run: function* (s) { yield* keystoneCase(s); } }],
  });

  function* keystoneCase(s) {
    if (s.flag('c8_keystone_got')) { yield s.msg('The velvet cushion is empty. A card reads: "ON LOAN."'); return; }
    yield s.msg('Under the glass, on a velvet cushion, lies a small carved stone covered in strange patterns.\nA plaque reads: "KEYSTONE — Not for sale."');
    if (!s.flag('has_bronco')) return;
    yield s.say('cloud', "(This is it... the Keystone to the Temple of the Ancients.)");
    const c = yield s.ask('cloud', "", ['Take it', 'Leave it']);
    if (c !== 0) return;
    s.anim('player', 'kneel');
    yield 30;
    s.stopAnim('player');
    s.spawn('dio', 'dio', 0, 6, 'right', { name: 'Dio' });
    yield s.say('dio', "Ho-hooo! And what might you be doing with MY Keystone?");
    yield s.move('dio', 9, 3);
    yield s.face('player', 'dio');
    yield s.emote('player', '!');
    s.anim('dio', 'fistpump');
    yield s.say('dio', "Ah! It's you! The young man from the unfortunate business in the Battle Square!\fI never did apologize properly for sending you down to the prison. Most regrettable.");
    s.stopAnim('dio');
    yield s.say('cloud', "...We need that Keystone.");
    yield s.say('dio', "The Keystone? One of the finest pieces in my collection! Hmmm...");
    s.anim('dio', 'armscross');
    yield 30;
    yield s.say('dio', "I have it! I'll LEND it to you... on one condition. Put on a show for my guests in the Battle Square!\fThey've been starved for real entertainment ever since that dreadful incident. Show them what you've got!");
    s.stopAnim('dio');
    const k = yield s.ask('cloud', "", ["...Fine. I'll fight.", "Do I have a choice?"]);
    if (k === 1) yield s.say('dio', "Ho ho! No. No, you do not!");
    yield s.say('dio', "Splendid! To the arena, then! I'll be watching from my private box!");
    yield s.run('dio', 0, 6);
    s.remove('dio');
    yield s.fadeOut(30);
    yield s.goto('gs2_arena', 'show');
    yield* dioShow(s);
  }

  // ================================================================== Dio's exhibition match
  // FF7: Cloud fights alone, 8 battles in a row; the Keystone is his no matter what, and a perfect
  // run earns a Protect Vest and a Choco Feather.
  const ROUNDS = [
    ['wm_corel', 'mt_corel'], ['corel_prison_junkyard', 'wm_desert_edge'], ['wm_gongaga', 'gongaga'], ['wm_cosmo', 'cave_of_gi'],
    ['nibelheim_mansion', 'wm_nibel'], ['mt_nibel', 'wm_rocket'], ['wm_wutai', 'da_chao'], ['mt_nibel_cave', 'nibelheim_mansion_basement'],
  ];
  function* dioShow(s) {
    s.spawn('dio', 'dio', 12, 3, 'down', { name: 'Dio' });
    s.spawn('announcer', { base: 'man', top: '#e0c040', sleeve: '#e0c040', bottom: '#202020', extras: ['bowtie'] }, 5, 3, 'down', { name: 'Announcer' });
    s.place('player', 11, 8, 'up');
    yield s.fadeIn(30);
    s.music('goldsaucer');
    yield s.say('Announcer', "Ladies and gentlemen! Tonight, a very special exhibition match, presented by the owner of the Gold Saucer himself...");
    s.anim('dio', 'fistpump');
    yield s.say('dio', "Ha-ha-HAAA! Tonight's challenger has promised to fight to the very last! Let the show begin!");
    s.stopAnim('dio');
    yield s.say('Announcer', "Eight battles, no breaks! How far can our challenger go?!");
    const before = partyNow(s);
    s.party(['cloud']);
    let wins = 0;
    for (let round = 0; round < ROUNDS.length; round++) {
      yield s.caption(`BATTLE ${round + 1}`, { hold: 50, bg: 'rgba(0,0,0,0.7)' });
      const pool = ROUNDS[round];
      const r = yield s.battle({ table: pool[Math.floor(Math.random() * pool.length)], bg: 'goldsaucer', music: 'battle', canLose: true, noEscape: true });
      if (r !== 'win') { yield s.say('Announcer', "Ohhh! The challenger is down! What a valiant effort!"); break; }
      wins++;
      if (round < ROUNDS.length - 1) {
        const k = yield s.ask('Announcer', `That's ${wins} win${wins > 1 ? 's' : ''}! The crowd wants more! Will the challenger continue?`, ['Next battle!', 'That\'s enough']);
        if (k !== 0) break;
      }
    }
    s.party(before);
    s.heal();
    yield s.say('Announcer', wins >= 8 ? "EIGHT STRAIGHT VICTORIES! Unbelievable! The crowd is on its feet!" : `The challenger bows out after ${wins} win${wins === 1 ? '' : 's'}! Let's hear it for our challenger!`);
    s.anim('dio', 'fistpump');
    yield s.say('dio', wins >= 8 ? "MAGNIFICENT! I haven't seen a show like that in years!" : "Ho-ho! Not bad, not bad at all! My guests were thoroughly entertained!");
    s.stopAnim('dio');
    yield s.say('dio', "A promise is a promise. The Keystone is yours... on loan, mind you! Treat it gently!");
    yield s.give('keystone');
    s.set('c8_keystone_got');
    if (wins >= 8 && !s.flag('c8_keystone_bonus')) {
      s.set('c8_keystone_bonus');
      yield s.say('dio', "And for such a flawless performance... a little something extra from my personal collection!");
      yield s.give('protect_vest');
      yield s.give('choco_feather');
    }
    yield s.fadeOut(30);
    s.remove('dio'); s.remove('announcer');
    yield s.goto('gs_battle', 'from_station');
    yield s.say('cloud', "(Got the Keystone. Let's get back to the ropeway.)");
  }

  FF7.defineMap('gs2_arena', {
    name: 'Battle Square Arena', area: 'Gold Saucer', theme: 'goldsaucer', music: 'goldsaucer',
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhNhhhhhhhhhhhhhhNhhhh",
      "h.cc.......uu.......cc.h",
      "h......................h",
      "h======================h",
      "h......................h",
      "h..|................|..h",
      "h......................h",
      "h......................h",
      "h..|................|..h",
      "h......................h",
      "hhhhhhhhhhh++hhhhhhhhhhh",
    ],
    heights: [
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "444444444444444444444444",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[11, 7, '#ff4040', 5], [12, 3, '#ffe080', 3]],
    entries: { show: [11, 8, 'up'] },
    exits: [{ at: [11, 11, 2, 1], to: 'gs_battle', entry: 'from_station', sfx: 'door' }],
  });

  // ================================================================== the broken ropeway, the Ghost Hotel
  FF7.story.c8_ropewayBroken = function* (s) {
    s.set('c8_ropeway_broken');
    s.spawn('rw_staff', STAFF, 14, 22, 'up', { name: 'Attendant' });
    yield s.move('rw_staff', 14, 21);
    yield s.face('player', 'rw_staff');
    yield s.say('Attendant', "Oh! Excuse me, sir! I'm so terribly sorry, but... the ropeway has broken down!\fThe engineers say it won't be running again until morning.");
    yield s.say('cloud', "......");
    yield s.say('Attendant', "As an apology, the Ghost Hotel will put your whole party up for the night, free of charge. Once again, our deepest apologies!");
    s.remove('rw_staff');
    yield s.fadeOut(40);
    yield s.goto('gs2_hotel', 'night');
    yield* hotelNight(s);
  };

  function* hotelNight(s) {
    s.music('anxious');
    const all = members(s);
    const spots = [[9, 4, 'right'], [14, 4, 'left'], [8, 6, 'right'], [15, 6, 'left'], [10, 7, 'up'], [13, 7, 'up'], [7, 5, 'right'], [16, 5, 'left']];
    const crew = spawnCrew(s, all, spots);
    s.place('player', 11, 5, 'down');
    yield s.fadeIn(40);
    const has = id => crew.includes(id);
    yield s.say('tifa', "So... let's go over what we know. Sephiroth is looking for the Promised Land.");
    if (has('aeris')) yield s.say('aeris', "The Promised Land isn't somewhere you can just go and take. It's where the Cetra... my people... were meant to return. A place of supreme happiness.");
    if (has('redxiii')) yield s.say('redxiii', "And then there is the 'Black Materia'. Those men in black cloaks keep muttering about it, over and over.");
    yield s.say('barret', "Yeah, what's the deal with them creepy cloaked guys? Draggin' their feet all over the world, moanin' about Sephiroth. And every one of 'em's got a number tattooed on 'em.");
    if (has('redxiii')) {
      yield s.say('redxiii', "......I have a tattoo too. XIII. Hojo put it there.");
      yield s.say('redxiii', "Will I end up like them? Wandering, lost... calling out for Sephiroth?");
      yield s.say('tifa', "Red XIII... That won't happen to you. We won't let it.");
    }
    if (has('yuffie')) yield s.say('yuffie', "Black Materia, huh... Sounds rare. Like, really rare. ...What? I'm just saying!");
    if (has('cid')) yield s.say('cid', "Whatever it is, Shinra wants it bad. Rufus was talkin' about that Temple back in Rocket Town.");
    if (has('vincent')) yield s.say('vincent', "...Hojo, Sephiroth, the Temple... They're all connected. Of that, I'm certain.");
    yield s.say('cloud', "Whatever Sephiroth wants in that Temple, we get there first. We've got the Keystone.");
    if (has('caitsith')) {
      yield s.say('caitsith', "Ah... aye. Right you are. We've got the Keystone...");
      yield s.emote('caitsith', '...');
    }
    yield s.say('barret', "Alright, that's enough thinkin' for one night. Let's hit the sack. Big day tomorrow.");
    yield s.fadeOut(40);
    clearCrew(s, crew);
    yield s.goto('gs2_room', 'night');
    yield* dateNight(s);
  }

  FF7.defineMap('gs2_hotel', {
    name: 'Ghost Hotel', area: 'Gold Saucer', theme: 'mansion', music: 'anxious',
    // ref 09-rockettown50: red carpet, dark carved wood and gothic gloom
    look: { ambient: [0.3, 0.22, 0.26], light: [0.7, 0.45, 0.45], floor: ['#6a1a1c', '#641618'], wall: '#4a2a26', trim: '#2a1410', wallTop: '#1a0c0a' },
    camera: { pitch: 42, dist: 10 },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "hkk..q....F......q...kkh",
      "h......................h",
      "h.DDD............DDD...h",
      "h......................h",
      "h..j......|....|.....j.h",
      "h......................h",
      "h..........u...........h",
      "h......................h",
      "hhhhhhhhhh++++hhhhhhhhhh",
    ],
    lights: [[10, 1, '#ff8040', 3], [11, 7, '#8060ff', 3]],
    entries: { night: [11, 4, 'down'] },
  });

  // ================================================================== Cloud's room
  FF7.defineMap('gs2_room', {
    name: 'Ghost Hotel Room', area: 'Gold Saucer', theme: 'mansion', music: null,
    // ref 09-rockettown49: red carpet between dark stone walls, candle-lit, seen diagonally from above
    look: { ambient: [0.28, 0.2, 0.26], light: [0.66, 0.44, 0.48], floor: ['#5a1418', '#541216'], wall: '#4a4050', trim: '#2a1a3a', indoor: true },
    camera: { yaw: -35, pitch: 58, dist: 8 },
    grid: [
      "#####w####w#####",
      "#bb........q.jj#",
      "#..............#",
      "#..t.c.........#",
      "#..............#",
      "#..............#",
      "#######+########",
    ],
    lights: [[5, 3, '#a080ff', 2]],
    entries: { night: [3, 2, 'down'], morning: [3, 2, 'down'], door: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'gs_ghost', entry: 'from_station', sfx: 'door', if: s => s.flag('c8_cait_spy'),
      blocked: function* (s) { yield s.say('cloud', "(It's the middle of the night...)"); } }],
    objects: [
      { at: [11, 1], talk: function* (s) {
        if (s.flag('c8_room_elixir')) { yield s.msg('An old wardrobe. Only moth-eaten ghost costumes are left inside.'); return; }
        s.set('c8_room_elixir');
        yield s.msg('An old wardrobe creaks open... Something glints at the back.');
        yield s.give('elixir');
      } },
      { at: [1, 1], talk: function* (s) { yield s.msg('A four-poster bed with black lace curtains. Very... ghostly.'); } },
    ],
  });

  // ================================================================== the date
  const KNOCK = {
    aeris: ["Cloud? It's me. ...Are you still awake?", "The whole park is lit up at night. It'd be a waste to sleep through it!\fSo... let's go out. You and me. On a date!"],
    tifa: ["Cloud...? It's Tifa. Sorry, I couldn't sleep.", "Would you... want to walk around for a bit? Just the two of us?\f...It's been a long time since we did anything like this."],
    yuffie: ["Psst! Cloud! Wake up! Everybody else is snoring!", "C'mon, this is the perfect time to go have some fun! ...Hey, don't look at me like that.\fIt's not like it's a date or anything! ...Okay, maybe it's kinda a date."],
    barret: ["Yo, Cloud! You up? Heh, can't sleep neither, huh?", "Place is too damn noisy. C'mon, let's go do somethin'. Better'n starin' at the ceiling all night."],
  };
  function* dateNight(s) {
    const who = FF7.story.dateWith();
    s.setVar('c8_date', ['aeris', 'tifa', 'yuffie', 'barret'].indexOf(who));
    s.music('none');
    s.anim('player', 'lie');
    yield s.fadeIn(40);
    yield 60;
    s.sfx('door');
    yield 20;
    s.sfx('door');
    yield s.emote('player', '?');
    s.stopAnim('player');
    yield s.say(who, KNOCK[who][0]);
    s.spawn(who, who, 7, 5, 'up', { name: s.name(who) });
    yield s.move('player', 7, 3);
    yield s.move(who, 7, 4);
    yield s.face('player', who);
    s.music(who === 'barret' ? 'barret' : who === 'aeris' ? 'aeris' : who === 'tifa' ? 'tifa' : 'goldsaucer');
    yield s.say(who, KNOCK[who][1]);
    const c = yield s.ask('cloud', "", who === 'barret' ? ["...Sure.", "...Why not."] : ["...Alright.", "A date...?"]);
    if (c === 1 && who === 'aeris') yield s.say('aeris', "Mm-hmm! A date! Come on, before I change my mind!");
    else if (c === 1 && who === 'tifa') yield s.say('tifa', "I-I didn't say date! ...I mean... Just come on!");
    else if (c === 1 && who === 'yuffie') yield s.say('yuffie', "Don't make it weird! Let's go!");
    else yield s.say(who, who === 'barret' ? "Heh. That's the spirit." : "Great! Let's go!");
    yield s.fadeOut(40);
    s.remove(who);
    if (who !== 'barret') {
      yield s.goto('gs2_stage', 'play');
      yield* eventSquarePlay(s, who);
    }
    yield s.goto('gs2_gondola', 'ride');
    yield* gondola(s, who);
    yield s.goto('gs2_night', 'from_gondola');
    yield* keystoneStolen(s, who);
  }

  // ------------------------------------------------------------------ Event Square: the play
  const ROSA = {
    aeris: ["Oh, brave Alfred! Save me, please!", "(...Was that okay? I think I nailed it!)"],
    tifa: ["H-help... me... brave Alfred...", "(Cloud, everyone's staring... I'm so embarrassed!)"],
    yuffie: ["Heeelp! Save me, Alfred! ...Or don't, I could totally take this guy myself.", "(Heh heh, this is fun!)"],
  };
  function* eventSquarePlay(s, who) {
    s.music('goldsaucer');
    s.spawn('ev_staff', STAFF, 13, 7, 'left', { name: 'Attendant' });
    s.spawn(who, who, 10, 7, 'up', { name: s.name(who) });
    const aud = [[4, 7], [6, 7], [17, 7], [19, 7], [8, 7], [15, 7]];
    aud.forEach(([x, y], i) => s.spawn('aud' + i, ['man', 'woman', 'kid', 'girl', 'oldman', 'woman'][i] + (20 + i), x, y, 'up', { name: 'Audience' }));
    s.place('player', 11, 8, 'up');
    yield s.fadeIn(30);
    s.sfx('ching');
    yield s.face('player', 'ev_staff');
    yield s.say('Attendant', "Congratulations! You two are our 100th couple of the night! And that means... you get to star in tonight's play!");
    yield s.say('cloud', "...What?");
    yield s.say('Attendant', "Don't worry, it's all improvised! Just follow your heart!\fYou'll play the legendary hero, Alfred. And your lovely companion will be... Princess Rosa!");
    if (who === 'aeris') yield s.say('aeris', "A princess? Me? Ooh, I've always wanted to be on stage!");
    else if (who === 'tifa') yield s.say('tifa', "A play? In front of all these people? ...Oh no.");
    else yield s.say('yuffie', "A princess, huh? Heh. Talk about typecasting!");
    yield s.fadeOut(30);
    s.remove('ev_staff'); s.remove(who);
    // --- on stage
    s.music('debut');
    s.spawn('king', KING, 6, 3, 'right', { name: 'King' });
    s.place('player', 3, 3, 'right');
    yield s.fadeIn(30);
    yield s.say('Narrator', "Long, long ago, in a faraway kingdom... the lovely Princess Rosa was carried off by the terrible Evil Dragon King, Valvados!", { pos: 'top' });
    s.anim('king', 'pray');
    yield s.say('King', "Ohhh, woe is me! My precious Rosa! Is there no one brave enough to rescue her?!");
    s.stopAnim('king');
    yield s.say('Narrator', "And then, from across the land, came the legendary hero... ALFRED!", { pos: 'top' });
    yield s.move('player', 9, 3);
    yield s.face('king', 'player');
    yield s.say('King', "Can it be?! Brave Alfred! Tell me, hero... have you come to save my daughter?");
    const a = yield s.ask('cloud', "", ["I've come to save the princess.", "I'm... just passing through.", "......"]);
    if (a === 0) { s.anim('king', 'fistpump'); yield s.say('King', "Hurrah! Spoken like a true hero! Go forth, Alfred!"); }
    else if (a === 1) { yield s.say('King', "Just passing thr-- Ahem! Ha ha! Our hero jests! Surely he means he's passing through on his way to the dragon's lair!"); }
    else { yield s.say('Narrator', "Alfred, a man of few words, simply nodded with steely resolve.", { pos: 'top' }); s.sfx('ching'); yield s.msg('(A few people in the audience giggle.)'); }
    s.stopAnim('king');
    // the Dragon King and the princess
    s.spawn('dragon', DRAGON, 20, 3, 'left', { name: 'Evil Dragon King' });
    s.spawn(who, who, 20, 2, 'left', { name: 'Princess Rosa' });
    yield [s.move('dragon', 15, 3), s.move(who, 16, 2)];
    s.anim('dragon', 'fistpump');
    yield s.say('Evil Dragon King', "GWAHAHAHA! Foolish hero! The princess belongs to me, Valvados, lord of all dragons!");
    s.stopAnim('dragon');
    yield s.say(who, ROSA[who][0]);
    yield s.say(who, ROSA[who][1], { pos: 'top' });
    yield s.say('Narrator', "What will our hero do?!", { pos: 'top' });
    const b = yield s.ask('cloud', "", ['Fight', 'Magic', 'Item', 'Kiss']);
    yield s.move('player', 13, 3);
    if (b === 0) {
      s.anim('player', 'slash'); s.sfx('hit');
      yield 20;
      s.anim('dragon', 'hurt');
      yield s.say('Evil Dragon King', "Gwuh... GWAAARGH! Defeated... by a mere mortal...!");
      s.anim('dragon', 'dead');
    } else if (b === 1) {
      s.anim('player', 'cast');
      yield 20;
      s.flash('#ffffff', 16, 0.6); s.sfx('magic');
      yield s.msg('(A stagehand showers the dragon with paper sparkles.)');
      yield s.say('Evil Dragon King', "Aaagh! M-magic! My one and only weakness!");
      s.anim('dragon', 'dead');
    } else if (b === 2) {
      s.anim('player', 'item');
      yield s.msg(`${s.name('cloud')} digs through his pockets... and holds out a Potion.`);
      yield s.say('Evil Dragon King', "...For me? No one's... ever given me a present before...");
      yield s.say('Narrator', "Moved by the hero's kindness, the Evil Dragon King's frozen heart melted away! He swore never to kidnap again!", { pos: 'top' });
      s.anim('dragon', 'kneel');
    } else {
      yield s.move('player', 14, 3);
      yield s.emote('dragon', '!!');
      yield s.say('Evil Dragon King', "......!! Wh-wh-what are you DOING?! I-I'm not that kind of dragon!!");
      s.sfx('ching'); yield s.msg('(The audience roars with laughter!)');
      yield s.say(who, who === 'aeris' ? "(Pfft... Cloud! Hee hee hee!)" : who === 'tifa' ? "(Cloud?! ...Oh my gosh.)" : "(BWAHAHAHA! I'm never letting you live this down!)", { pos: 'top' });
      s.anim('dragon', 'dead');
    }
    yield 30;
    s.stopAnim('player');
    yield s.move(who, 15, 3);
    yield s.face(who, 'player');
    yield s.say('Narrator', "And so the princess was saved! Now, as tradition demands... the hero must seal his victory with a kiss!", { pos: 'top' });
    s.show('king', 12, 4, 'up');
    const k = yield s.ask('cloud', "", ['Princess Rosa', 'The King', 'The Evil Dragon King']);
    if (k === 0) {
      yield s.face('player', who);
      // (no date points here: FF7's affection changes all come before the date; see docs/DATE_POINTS.md)
      if (who === 'aeris') yield s.say('aeris', "(...! Cloud...!)", { pos: 'top' });
      else if (who === 'tifa') yield s.say('tifa', "(Wh-what? Cloud, wait, in front of everyone...?!)", { pos: 'top' });
      else yield s.say('yuffie', "(W-whoa, whoa! Hey! Watch it, buddy!)", { pos: 'top' });
      s.sfx('drumroll');
      yield s.fadeOut(20);
      yield s.say('Narrator', "...and the curtain falls! And they lived happily ever after!", { pos: 'middle' });
      yield s.fadeIn(20);
    } else if (k === 1) {
      yield s.face('player', 'king');
      yield s.say('King', "M-me?! Well... I suppose... for the good of the kingdom...!");
      s.sfx('ching'); yield s.msg('(The audience howls. Someone whistles.)');
    } else {
      s.stopAnim('dragon');
      yield s.face('player', 'dragon');
      yield s.say('Evil Dragon King', "Not AGAIN!! This isn't in the script!!");
      yield s.run('dragon', 22, 3);
      s.sfx('ching'); yield s.msg('(Thunderous applause!)');
    }
    yield s.say('Narrator', "Thank you, everyone! Let's have a big hand for tonight's stars!", { pos: 'top' });
    yield s.fadeOut(40);
    ['king', 'dragon', who].forEach(id => s.remove(id));
    for (let i = 0; i < 6; i++) s.remove('aud' + i);
  }

  FF7.defineMap('gs2_stage', {
    name: 'Event Square', area: 'Gold Saucer', theme: 'goldsaucer', music: null, look: NIGHT,
    camera: { pitch: 34, dist: 10 },   // ref 09-rockettown48: looking at the stage from the audience
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhNhhhhhhhhhhhhhhNhhhh",
      "h..__________________..h",
      "h..__________________..h",
      "h..__________________..h",
      "h..........^^..........h",
      "h..cccccc......cccccc..h",
      "h......................h",
      "h..cccccc......cccccc..h",
      "hhhhhhhhhhh++hhhhhhhhhhh",
    ],
    heights: [
      "000000000000000000000000",
      "000000000000000000000000",
      "000222222222222222222000",
      "000222222222222222222000",
      "000222222222222222222000",
      "000000000001100000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[11, 3, '#fff0c0', 5], [5, 3, '#ff80c0', 2], [18, 3, '#80c0ff', 2]],
    entries: { play: [11, 7, 'up'] },
  });

  // ------------------------------------------------------------------ the gondola
  function* fireworks(s, n) {
    const cols = ['#ff5050', '#50a0ff', '#ffd040', '#60ff90', '#ff80ff'];
    for (let i = 0; i < n; i++) { s.flash(cols[(i * 3 + n) % cols.length], 14, 0.35); yield 22; }
  }
  const GONDOLA = {
    aeris: function* (s) {
      yield s.say('aeris', "Look, Cloud! The whole park's sparkling... It's like we're riding inside a jewelry box.");
      yield* fireworks(s, 3);
      yield s.say('aeris', "...You know, when I first met you, you reminded me of someone. The way you walk... the way you talk. Even how you swing your sword.");
      yield s.say('cloud', "...Someone?");
      yield s.say('aeris', "The first boy I ever went out with. But... you're not him. You're different. I know that now.");
      yield s.face('aeris', 'player');
      yield s.say('aeris', "I'm looking for you, Cloud.");
      yield s.say('cloud', "...What do you mean? I'm right here.");
      yield s.say('aeris', "I know. But I want to meet YOU. The real you.\f...I'll find you. Someday. I promise.");
      yield s.say('cloud', "......");
      yield* fireworks(s, 4);
      yield s.say('aeris', "Oh! Look, a big one! ...Hee hee. Let's just watch, okay?");
    },
    tifa: function* (s) {
      yield s.say('tifa', "It's beautiful... I haven't seen fireworks since we were kids. Remember the festival in Nibelheim?");
      yield* fireworks(s, 3);
      yield s.say('tifa', "Cloud... there's something... I've been wanting to tell you.");
      yield s.face('player', 'tifa');
      yield s.say('cloud', "......?");
      yield s.say('tifa', "Ever since the station in Midgar... the night we met again... I've wondered if you...");
      yield s.say('tifa', "......");
      yield s.say('tifa', "...No. It's nothing. Forget I said anything, okay? Let's just watch the fireworks.");
      yield s.say('cloud', "...Sure.");
      yield* fireworks(s, 4);
      yield s.say('tifa', "(I can't say it... Not yet. Not until I know for sure.)", { pos: 'top' });
    },
    yuffie: function* (s) {
      yield s.say('yuffie', "Whoa... okay, that's actually pretty. ...Ugh. Don't look down, don't look down. Does a gondola count as a vehicle...?");
      yield* fireworks(s, 3);
      yield s.say('yuffie', "...Hey, Cloud. What're you gonna do? You know, when all this Sephiroth stuff is over?");
      yield s.say('cloud', "...I haven't thought about it.");
      yield s.say('yuffie', "Heh. Me neither. Go back to Wutai, I guess. Make it strong again, like it used to be.\f...Hey! Don't tell anybody I said something serious, okay?");
      yield* fireworks(s, 4);
      yield s.say('yuffie', "...And don't go gettin' any funny ideas about tonight, either! ...Though, uh. Thanks. It was kinda fun.");
    },
    barret: function* (s) {
      yield s.say('barret', "...Man. Look at all them lights. Marlene'd go nuts for this.");
      yield* fireworks(s, 3);
      yield s.say('barret', "Two grown men in a lovey-dovey gondola... Heh. Somebody up there's laughin' at us.");
      yield s.say('barret', "...Hey, Cloud. When this is all over, I dunno what I'm gonna do. AVALANCHE, the reactors... I got a whole lotta blood on these hands.");
      yield s.say('cloud', "......");
      yield s.say('barret', "Heh. Forget it. Ain't the time for that kinda talk. Just shut up and watch the damn fireworks.");
      yield* fireworks(s, 4);
    },
  };
  function* gondola(s, who) {
    s.music('fireworks');
    // FF7: the date sits on the left bench, Cloud on the right one, facing each other across the cabin
    s.spawn(who, who, 1, 3, 'right', { name: s.name(who), anim: 'sit', hover: 0.14 });
    s.place('player', 5, 3, 'left');
    s.anim('player', 'sit'); s.hover('player', 0.14);
    yield s.fadeIn(40);
    yield s.msg('The gondola glides slowly around the Gold Saucer. Below, the whole park glitters like a sea of stars.');
    yield* GONDOLA[who](s);
    yield 30;
    yield s.fadeOut(50);
    s.remove(who);
    s.stopAnim('player'); s.hover('player', 0);
    s.set('c8_date_done');
  }
  FF7.defineMap('gs2_gondola', {
    // refs 06-goldsaucer18, 09-rockettown47: a small wooden cabin seen from its open end at eye level -
    // plank benches along both sides facing each other, big wood-framed windows left, right and ahead
    // full of the park's lights and fireworks, a lamp in the low ceiling
    name: 'Round Square Gondola', area: 'Gold Saucer', theme: 'goldsaucer', music: null,
    look: Object.assign({}, NIGHT, { indoor: true, wall: '#7a5234', trim: '#4a3020', wallTop: '#3a2616', wallH: 1.9, wallTex: 'siding',
      floor: ['#8e9096', '#888a90'], floorTex: false, wood: ['#9a6a3c', '#8a5e34'], ambient: [0.5, 0.44, 0.42], light: [0.78, 0.68, 0.56] }),
    camera: { fixed: [1.75, 1.28, 4.1, 1.75, 1.0, 0.6], fov: 46 },
    legend: { '[': 'block', ']': 'block' },
    grid: [
      "#######",
      "#[...]#",
      "#[...]#",
      "#[...]#",
      "#[...]#",
      "#[...]#",
      "#######",
    ],
    props: [
      { at: [1, 3], prop: 'bench', w: 5, rot: 90 },
      { at: [5, 3], prop: 'bench', w: 5, rot: -90 },
      { at: [3, 0], prop: 'viewwindow', w: 3, y: 0.55, h: 0.95, col: ['#2a1a4a', '#e8a848'], col2: '#8a6038', fw: 0.12, lights: ['#fff0a0', '#ffd060', '#ff80c0', '#80e0ff'], bursts: ['#ff6060', '#60c0ff'] },
      { at: [0, 3], prop: 'viewwindow', w: 3, rot: 90, y: 0.55, h: 0.95, col: ['#3a2050', '#f0b850'], col2: '#8a6038', fw: 0.12, lights: ['#fff0a0', '#ffe080', '#ff90d0'], bursts: ['#80ff90'] },
      { at: [6, 3], prop: 'viewwindow', w: 3, rot: -90, y: 0.55, h: 0.95, col: ['#2a1848', '#e0a040'], col2: '#8a6038', fw: 0.12, lights: ['#fff0a0', '#ffd060', '#a0e0ff'], bursts: ['#ffd040', '#ff70d0'] },
      { at: [3, 3], prop: 'ceiling', w: 5.4, d: 5.4, h: 1.9, col: '#586070', beams: '#7a5030', lamp: '#fff2c8' },
    ],
    lights: [[3, 1, '#ffc080', 2.5]],
    entries: { ride: [3, 3, 'up'] },
  });

  // ------------------------------------------------------------------ the theft
  function* keystoneStolen(s, who) {
    s.music('goldsaucer');
    s.spawn(who, who, 13, 3, 'down', { name: s.name(who) });
    yield s.fadeIn(30);
    yield s.say(who, who === 'barret' ? "Heh. Well, that wasn't half bad. C'mon, back to the hotel." : "That was fun... Thanks, Cloud. Let's head back.");
    yield s.move('player', 14, 5);
    s.spawn('cait_ev', 'caitsith', 21, 2, 'down', { name: s.name('caitsith') });
    yield s.face(who, 'cait_ev');
    yield s.emote(who, '!');
    yield s.say(who, who === 'barret' ? "Huh? Ain't that Cait Sith? What's that fuzzball doin' up this late?" : "Huh? Isn't that Cait Sith? What's he doing out at this hour?");
    yield s.run('cait_ev', 27, 2);
    yield s.face('cait_ev', 'down');
    yield s.say('caitsith', "......Uh-oh.");
    yield s.run('cait_ev', 28, 1);
    s.remove('cait_ev');
    yield s.say(who, "Wait... he was carrying something. That little stone... THE KEYSTONE!");
    if (s.has('keystone')) s.take('keystone');
    yield s.say('cloud', "......! After him!");
    s.music('hurry');
    yield s.run(who, 28, 2);
    s.remove(who);
    s.setVar('c8_date_partner', ['aeris', 'tifa', 'yuffie', 'barret'].indexOf(who));
    s.set('c8_chase_on');
  }
  const noTime = function* (s) { yield s.say('cloud', "(No time for that! Cait Sith ran into Speed Square!)"); };
  FF7.defineMap('gs2_night', {
    name: 'Station Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'hurry', look: NIGHT,
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhNhh+hhhNhh+hhhhNhhh+hhNhhh+hhNhh",
      "h...!......!........!......!.....h",
      "h................................h",
      "h......|..................|......h",
      "h................................h",
      "h..............uu................h",
      "+..............uu................+",
      "h................................h",
      "h......|..................|......h",
      "h................................h",
      "h......!...............!.........h",
      "h................................h",
      "hhhhhhhh+hhhhhhhhhhhhhhh::hhhhhhhh",
    ],
    lights: [[16, 6, '#ffe060', 6], [28, 2, '#60ff90', 2]],
    entries: { from_gondola: [12, 2, 'down'] },
    exits: [
      { at: [28, 1, 1, 1], to: 'gs2_chase', entry: 'from_station', sfx: 'door' },
      { at: [5, 1, 1, 1], run: noTime }, { at: [12, 1, 1, 1], run: noTime }, { at: [21, 1, 1, 1], run: noTime },
      { at: [0, 7, 1, 1], run: noTime }, { at: [33, 7, 1, 1], run: noTime }, { at: [8, 13, 1, 1], run: noTime }, { at: [24, 13, 2, 1], run: noTime },
    ],
  });

  // ------------------------------------------------------------------ the chase: Speed Square -> Wonder Square
  FF7.defineMap('gs2_chase', {
    name: 'Speed Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'hurry', look: NIGHT,
    // (Speed Square: the coaster's car at the platform, as in gs_speed)
    legend: { '&': 'block' },
    props: [
      { at: [5, 0.7], prop: 'track', len: 10, gauge: 0.6, col: '#8a8a94', col2: '#2a2a30' },
      { at: [9.5, 0.7], vehicle: 'mono_coaster', rot: 90 },
    ],
    grid: [
      "XXXXX          XXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhh&&&&&&&&&&hhhhhhNhhhhNhhhhNhhhhNhhh",
      "hgggggggggggggggh.MM..M...MM....M..M...h",
      "h===========....h......................h",
      "h...............+......................h",
      "h..D.......l....h.....t............DD..h",
      "h...............h......................h",
      "h...............h..M...................h",
      "h...............h......................h",
      "hhhhhhhhhhhh++hhhhhhhhhhhhhhhhhh++hhhhhh",
    ],
    lights: [[8, 2, '#60ff90', 3], [26, 2, '#40e0ff', 3], [35, 5, '#ff60c0', 3]],
    entries: { from_station: [12, 8, 'up'] },
    exits: [
      { at: [12, 9, 2, 1], run: function* (s) { yield s.say('cloud', "(He's getting away! No turning back now!)"); } },
      { at: [32, 9, 2, 1], to: 'gs2_chocobo_night', entry: 'from_chase', sfx: 'door', if: s => s.flag('c8_chase2'),
        blocked: function* (s) { yield s.say('cloud', "(Where did he go...?)"); } },
    ],
    triggers: [
      { id: 'c8_chase1', at: [1, 3, 15, 6], once: true, if: s => !s.flag('c8_keystone_stolen'),
        run: function* (s) {
          s.spawn('cait_ev', 'caitsith', 9, 5, 'down', { name: s.name('caitsith') });
          yield s.face('player', 'cait_ev');
          yield s.say('caitsith', "Aye aye aye! You're a persistent one, aren't ya!");
          yield s.run('cait_ev', [[15, 4], [18, 4]]);
          s.remove('cait_ev');
        } },
      { id: 'c8_chase2', at: [17, 2, 3, 7], once: true, if: s => !s.flag('c8_keystone_stolen'),
        run: function* (s) {
          s.spawn('cait_ev', 'caitsith', 27, 6, 'left', { name: s.name('caitsith') });
          yield s.say('caitsith', "Sorry, sorry! I'd love to stay and chat, but I'm in a bit of a hurry!");
          yield s.run('cait_ev', [[32, 6], [32, 9]]);
          s.remove('cait_ev');
          s.set('c8_chase2');
        } },
    ],
  });

  // ------------------------------------------------------------------ Chocobo Square: Tseng, and the confession
  function* caitConfession(s) {
    s.music('none');
    s.spawn('tseng', 'tseng', 13, 2, 'down', { name: 'Tseng' });
    s.spawn('cait_ev', 'caitsith', 12, 4, 'up', { name: s.name('caitsith') });
    yield s.move('player', 22, 8);
    yield s.cam(13, 3, 40);
    yield s.say('caitsith', "Here y'are, Mr. Tseng. The Keystone, just like I promised.");
    yield s.say('tseng', "Good work. Leave the rest to us.");
    s.music('turks');
    yield s.say('tseng', "...It seems you have company. Take care of it.");
    yield s.run('tseng', [[13, 2], [1, 2]]);
    s.remove('tseng');
    s.camFollow(30);
    yield s.run('player', 15, 6);
    yield s.face('cait_ev', 'player');
    yield s.say('cloud', "Cait Sith! What was that?!");
    s.music('tango');
    yield s.say('caitsith', "......Aye. You saw it. No use pretendin' now, is there?\fI'm a spy. I've been workin' for Shinra all along.");
    // the whole party gathers
    const all = members(s).filter(id => id !== 'caitsith');
    const spots = [[18, 6, 'left'], [18, 8, 'left'], [16, 8, 'up'], [20, 7, 'left'], [14, 8, 'up'], [22, 6, 'left'], [17, 4, 'left']];
    const crew = spawnCrew(s, all, spots);
    const has = id => crew.includes(id);
    yield 20;
    yield s.say('barret', "You little... I knew somethin' was off about you! Get over here so I can tear your stuffin' out!");
    yield s.say('caitsith', "Hold on! Hold on, now! Hear me out before you go rippin' anything!");
    yield s.say('caitsith', "Aye, I work for Shinra. But I'm not so sure anymore that what I'm doin' is right.\fYou lot... the way you live, the way you fight for what you believe in, even when nobody pays you for it... it's got me thinkin'.");
    yield s.say('tifa', "Then stop spying on us!");
    yield s.say('caitsith', "I can't do that, I'm afraid. ...So I'll keep on travelin' with you. What d'you say? Let's carry on like before, eh?");
    yield s.say('barret', "You got a screw loose?! Like hell we're gonna--");
    yield s.say('caitsith', "Ah, well. I thought you might say that. So... listen to this.");
    s.sfx('phone');
    yield 30;
    yield s.say('Marlene', "\"Daddy? Is that you, Daddy? ...Tifa? When are you coming home?\"");
    yield s.say('barret', "M-Marlene?! ......You son of a...!");
    if (has('aeris')) yield s.say('caitsith', "She's safe, and so is Elmyra. Aeris' mother. Nobody's harmin' a hair on their heads...\f...so long as you lot don't do anything foolish.");
    else yield s.say('caitsith', "She's safe, and so is Elmyra. Nobody's harmin' a hair on their heads... so long as you lot don't do anything foolish.");
    if (has('aeris')) yield s.say('aeris', "My mother, too...? How could you...");
    yield s.say('caitsith', "I'm sorry. Truly, I am. I don't like this any more than you do. But it's the only way I've got.");
    yield s.say('cloud', "...You're a puppet. Where's the real you?");
    yield s.say('caitsith', "Far away. This body's just a toy I control from a distance. Break it, and I'll only send another.\fSo let's not waste time fightin'. Shinra has the Keystone now. They'll be headin' for the Temple of the Ancients.");
    yield s.say('caitsith', "I know where it is. An island to the east, beyond Gongaga, buried in jungle. I'll take you there.");
    if (has('redxiii')) yield s.say('redxiii', "A spy who guides us to our enemy... Strange. But we have little choice.");
    if (has('cid')) yield s.say('cid', "Tch... Blackmail and a map. Real classy, Shinra.");
    if (has('yuffie')) yield s.say('yuffie', "Ugh! And I thought I was the sneaky one around here!");
    if (has('vincent')) yield s.say('vincent', "......Keep your enemies close.");
    yield s.say('barret', "......If anything happens to Marlene, I swear...");
    yield s.say('cloud', "...Fine. But I'm watching you.");
    yield s.say('caitsith', "...That's fair. More than fair.");
    s.set('c8_keystone_stolen');
    s.set('c8_cait_spy');
    s.unset('c8_chase_on');
    yield s.fadeOut(60);
    clearCrew(s, crew);
    s.remove('cait_ev');
    // --- the next morning
    yield s.goto('gs2_room', 'morning');
    s.music('goldsaucer');
    yield s.fadeIn(40);
    s.spawn('tifa', 'tifa', 7, 5, 'up', { name: s.name('tifa') });
    yield s.move('tifa', 7, 4);
    yield s.face('player', 'tifa');
    yield s.say('tifa', "Morning, Cloud. The ropeway's running again.\fCait Sith's down in the lobby, acting like nothing ever happened...");
    if (s.isMember('aeris')) {
      s.spawn('aeris', 'aeris', 7, 5, 'up', { name: s.name('aeris') });
      yield s.move('aeris', 8, 4);
      yield s.say('aeris', "Cloud... I'm going with you to the Temple. I have to.\fI'm the last of the Cetra. If the Ancients left something there... I need to see it with my own eyes.");
      yield s.say('cloud', "...Alright.");
      s.remove('aeris');
    }
    yield s.say('tifa', "Let's get going. The Tiny Bronco's waiting below. The Temple's east, past Gongaga.");
    s.remove('tifa');
    // FF7: Aeris sets off for the Temple in the party, with whichever of Tifa, Yuffie and Barret likes Cloud best
    // (ties in that order: the date guide); she stays in it until the Temple is over (the PHS won't take her out)
    if (s.isMember('aeris')) {
      const third = ['tifa', 'yuffie', 'barret'].filter(id => FF7.state.members.includes(id)).sort((a, b) => FF7.story.affection(b) - FF7.story.affection(a))[0];
      s.party(['cloud', 'aeris', third].filter(Boolean));
      if (!FF7.state.locked.includes('aeris')) FF7.state.locked.push('aeris');
    }
  }
  FF7.defineMap('gs2_chocobo_night', {
    name: 'Chocobo Square', area: 'Gold Saucer', theme: 'goldsaucer', music: 'hurry', look: NIGHT,
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhhNhhhhhZZZZZZZZhhhhNhhhhh",
      "h..........................h",
      "h.cccc....cccc....cccc.....h",
      "h..........................h",
      "h.cccc....cccc....cccc.....h",
      "h..........................h",
      "h.DDD......................h",
      "h..........................h",
      "h..........................+",
      "hhhhhhhhhhhhhhhhhhhhhhhhhhhh",
    ],
    lights: [[13, 1, '#40a0ff', 5]],
    entries: { from_chase: [26, 9, 'left'] },
    exits: [{ at: [27, 9, 1, 1], to: 'gs_station', entry: 'from_chocobo', sfx: 'door' }],
    onEnter: function* (s) {
      if (s.flag('c8_keystone_stolen')) return;
      yield* caitConfession(s);
    },
  });
})();

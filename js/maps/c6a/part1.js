// Chapter 6a, part 1 — Costa del Sol: the cargo ship docks, the harbour, the town, the beach
// (Hojo on holiday), inn, bar, shops, Johnny's new home and President Shinra's villa for sale.
// (Dialogue paraphrased; see docs/SCRIPTING.md.)
(function () {
  const TEAM = ['barret', 'tifa', 'aeris', 'redxiii', 'yuffie'];
  // FF7: on the first visit, members who are left out of the party spend the day around town.
  const firstVisit = s => !s.flag('c6a_costa_left');
  const offDuty = (s, id) => firstVisit(s) && s.isMember(id) && !s.inParty(id);
  const counter = (at, run) => ({ at, on: 'talk', run });
  const SWIM = (base, suit, extra) => Object.assign({ base, sleeve: 'skin', legs: 'skin', skirt: false, shoes: true }, suit, extra || {});
  const HOJO_BEACH = { base: 'hojo', top: '#e8d0b0', sleeve: 'skin', bottom: '#2c4a9a', legs: 'skin', boots: '#e8d0b0', shoes: true, extras: ['glasses'] };
  const BARRET_SAILOR = { base: 'barret', top: '#f4f4f4', top2: '#f4f4f4', sleeve: '#f4f4f4', bottom: '#f4f4f4', hair: '#f4f4f4', hairStyle: 'cap', extras: ['gunarmR', 'beard', 'belt'] };

  // World link that gives way to any later chapter's conditional link for the same place
  // (this file is registered first in story order).
  function fallbackLink(loc, def) {
    FF7.world.link(loc, Object.assign({}, def, {
      c6aFallback: true,
      if: function (s) {
        const list = (FF7.world._links || {})[loc] || [];
        return !list.some(l => !l.c6aFallback && typeof l.if === 'function' && (function () { try { return l.if(s); } catch (e) { return false; } })());
      },
    }));
  }
  fallbackLink('costa_del_sol', { map: 'costa_town', entry: 'from_world' });

  // ------------------------------------------------------------------ harbour
  FF7.defineMap('costa_port', {
    name: 'Costa del Sol Harbor', area: 'Costa del Sol', theme: 'beach', music: 'costadelsol',
    grid: [
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~hhhhhhhhhhhhhhhhhhhhhhhhhh~~~",
      "~~hhhhhhhwhhhhhwhhhhhwhhhhhhhh~~",
      "~~~hhhhhhhhhhhhhhhhhhhhhhhhhh~~~",
      "~~~~~~~~~~~~~~~KK~~~~~~~~~~~~~~~",
      "===============KK===============",
      "h..............................h",
      "h..B.o.....l..........l....BB..h",
      "h.............................Bh",
      "h...........!..................h",
      "h:::::::::::::::::::::::::::::.h",
      "hhhhhwhhhhhh::::hhhhhhwhhhhhhhhh",
    ],
    look: { wall: '#6a7888', trim: '#3a4450' },
    entries: { from_ship: [15, 6, 'down'], from_town: [13, 10, 'up'] },
    exits: [{ at: [12, 11, 4, 1], to: 'costa_town', entry: 'from_port' }],
    npcs: [
      { id: 'sailor', name: 'Sailor', model: 'sailor', at: [18, 6], dir: 'down',
        talk: function* (s) {
          if (!s.flag('has_buggy')) {
            yield s.say('Sailor', "She's a tough old tub, but she got you here, didn't she? We'll be loading cargo for a good while before heading back to Junon.");
            return;
          }
          const c = yield s.ask('Sailor', "Want a ride back across to Junon? Buggy and all, 100 gil.", ['Sail to Junon (100 gil)', 'Not now']);
          if (c !== 0) return;
          if (!s.takeGil(100)) { yield s.say('Sailor', "No gil, no passage. Sorry, pal."); return; }
          yield s.fadeOut(30);
          yield s.caption('The cargo ship crosses the sea back to Junon...', { hold: 120, bg: '#000' });
          yield s.world('junon');
        } },
      { id: 'docker', name: 'Dock Worker', model: 'worker2', at: [6, 8], dir: 'right', wander: 2,
        talk: function* (s) { yield s.say('Dock Worker', "Unload, load, unload... At least the view's nice. Welcome to Costa del Sol, the sunniest port in the world."); } },
      { id: 'angler', name: 'Boy', model: 'kid4', at: [25, 6], dir: 'up',
        talk: function* (s) { yield s.say('Boy', "Shhh! You'll scare the fish! ...Not that there's any fish near the big ship."); } },
    ],
    objects: [
      { at: [12, 9], talk: function* (s) { yield s.msg('"Costa del Sol Harbor"\nThe town is straight ahead. Mt. Corel lies beyond the town to the west.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c6a_arrived')) return;
      s.set('c6a_arrived');
      s.music('costadelsol');
      // --- The cargo ship from Junon has docked. Everyone steps off into the sunshine.
      const cast = TEAM.filter(id => s.isMember(id) && id !== s.leader());
      const spots = [[13, 7], [18, 7], [12, 8], [19, 8], [16, 8]];
      s.place('player', 15, 6, 'down');
      yield s.move('player', 15, 8);
      for (let i = 0; i < cast.length; i++) {
        s.spawn(cast[i], cast[i], 16, 4, 'down', { name: s.name(cast[i]) });
        s.move(cast[i], [[16, 6], spots[i]], { noWait: true });
        yield 18;
      }
      yield 40;
      cast.forEach(id => s.face(id, 'player'));
      if (cast.includes('tifa')) yield s.say('tifa', "Costa del Sol... I only ever saw it on travel posters in the slums.");
      if (cast.includes('aeris')) yield s.say('aeris', "Look at that sky! It's so blue! Hey, Cloud... can we rest a little? Just a teeny bit?");
      if (cast.includes('barret')) yield s.say('barret', "Rest?! Sephiroth's out there somewhere and you wanna lie around on the sand?\f...Aw, who am I kiddin'. After that thing on the ship, I could use a breather myself.");
      if (cast.includes('redxiii')) yield s.say('redxiii', "Sephiroth crossed the sea as we did. The only way inland is over Mt. Corel, to the west. His trail will lead there.");
      if (cast.includes('yuffie')) yield s.say('yuffie', "Ugh... solid ground... I'm never getting on a boat again. Never, ever, EVER.");
      yield s.say('cloud', "We head west over Mt. Corel. Until then... take a break. Do whatever you want.");
      if (cast.includes('barret')) yield s.say('barret', "Heh, you heard the man! ...I'm keepin' this sailor getup, though. Looks damn good on me.");
      if (cast.includes('aeris')) yield s.say('aeris', "Yay! See you later, Cloud!");
      for (const id of cast) s.run(id, 13, 11, { noWait: true });
      yield 70;
      cast.forEach(id => s.remove(id));
      yield s.say('cloud', "(...Who should I take along?)");
      yield s.choosePArty(['cloud']);
      yield s.say('cloud', "(The town's straight ahead. From there, the road west leads to Mt. Corel.)");
    },
  });

  // ------------------------------------------------------------------ town
  FF7.defineMap('costa_town', {
    name: 'Costa del Sol', area: 'Costa del Sol', theme: 'beach', music: 'costadelsol',
    look: { wall: '#e8dcc0', trim: '#b05a3a', floor: ['#d8c8a0', '#d0c098'], floor2: ['#c09a70', '#b89268'], floor3: ['#a07850', '#987048'] },
    grid: [
      "XXXXXXXXXXXXXXXX::::XXXXXXXXXXXXXXXX",
      "hwh+hwhh+hwhh+wh::::hwh+hwhhhhh+hwhh",
      "h..........................=___K___h",
      "h....l.....l.........l.....=___K___h",
      "h..........................=_f_K_f_h",
      "h...f..............f.......=___K___h",
      "h..........................=_t_K_t_h",
      "h..........................=___K___h",
      "h..........................===^^^==h",
      "h..................................h",
      "h.........f.OO.f...................h",
      "h.........f.OO.f...................h",
      ":::::::............................h",
      ":::::::..............B.o...........h",
      ":::::::............................h",
      "h................::::..............h",
      "hhhhhhhhhhhhhhhhh::::hhhhhhhhhhhhhhh",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000333333330",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    entries: {
      from_port: [17, 2, 'down'], from_inn: [3, 2, 'down'], from_johnny: [8, 2, 'down'], from_bar: [13, 2, 'down'],
      from_shop: [23, 2, 'down'], from_villa: [31, 2, 'down'], from_beach: [18, 15, 'up'], from_world: [2, 13, 'right'],
    },
    exits: [
      { at: [16, 0, 4, 1], to: 'costa_port', entry: 'from_town' },
      { at: [3, 1, 1, 1], to: 'costa_inn', entry: 'from_town', sfx: 'door' },
      { at: [8, 1, 1, 1], to: 'costa_johnny', entry: 'from_town', sfx: 'door' },
      { at: [13, 1, 1, 1], to: 'costa_bar', entry: 'from_town', sfx: 'door' },
      { at: [23, 1, 1, 1], to: 'costa_shop', entry: 'from_town', sfx: 'door' },
      { at: [31, 1, 1, 1], to: 'costa_villa', entry: 'from_town', sfx: 'door' },
      { at: [17, 16, 4, 1], to: 'costa_beach', entry: 'from_town' },
      { at: [0, 12, 1, 3], to: 'world', loc: 'costa_del_sol' },
    ],
    npcs: [
      { id: 'kid', name: 'Boy', model: 'kid2', at: [20, 13], dir: 'right',
        talk: function* (s) {
          if (offDuty(s, 'redxiii') && !s.flag('c6a_ball')) {
            const c = yield s.ask('Boy', "Hey, mister! Wanna kick my ball? Bet you can't hit that big red doggy over there!", ['Kick it', 'No thanks']);
            if (c !== 0) return;
            s.set('c6a_ball');
            s.sfx('hit');
            yield s.msg(`${s.name('cloud')} kicks the ball... it bounces right off ${s.name('redxiii')}'s head!`);
            yield s.emote('redxiii', '!!');
            yield s.face('redxiii', 'player');
            yield s.say('redxiii', "......\fIs this... what humans do to relax? I shall never understand your species.");
            yield s.say('Boy', "Whoa, it TALKS! Awesome!!");
            return;
          }
          yield s.say('Boy', "My dad says the President of Shinra used to come here every summer. Now he's dead. Is that why everyone's so happy?");
        } },
      { id: 'redxiii_off', name: 'Red XIII', model: 'redxiii', at: [26, 13], dir: 'left', show: s => offDuty(s, 'redxiii'),
        talk: function* (s) {
          yield s.say('redxiii', s.flag('c6a_ball') ? "...I am watching that child. Closely." : "The sun here is gentle. It reminds me a little of home... though home is far drier than this.");
        } },
      { id: 'oldman', name: 'Old Man', model: 'oldman2', at: [25, 10], dir: 'up',
        talk: function* (s) { yield s.say('Old Man', "See that villa up on the terrace? It belonged to President Shinra himself. Since he passed away, it's been up for sale. You'd need a mountain of gil, though."); } },
      { id: 'woman', name: 'Woman', model: 'woman5', at: [6, 9], dir: 'right', wander: 2,
        talk: function* (s) { yield s.say('Woman', "People come to Costa del Sol to forget their troubles. The sea, the sun... what else could you want?"); } },
      { id: 'tourist', name: 'Tourist', model: 'man6', at: [29, 12], dir: 'left', wander: 2,
        talk: function* (s) { yield s.say('Tourist', "I saved up for three years for this trip! ...And I spent it all on the first day. Heh."); } },
      { id: 'girl', name: 'Girl', model: 'girl3', at: [13, 13], dir: 'up',
        talk: function* (s) { yield s.say('Girl', "There's a weird old man with glasses lying on the beach. He has three pretty ladies with him. Mom says not to look."); } },
    ],
    objects: [
      { at: [12, 10], talk: function* (s) { yield s.msg('A fountain sparkles in the sunlight.'); } },
    ],
  });

  // ------------------------------------------------------------------ beach
  FF7.defineMap('costa_beach', {
    name: 'Costa del Sol Beach', area: 'Costa del Sol', theme: 'beach', music: 'costadelsol',
    look: { wall: '#e8dcc0', trim: '#b05a3a' },
    grid: [
      "hhhhhhhhhhhhhhhh::::hhhhhhhhhhhhhh",
      "hRssssssssssssss::::ssssssssssssRh",
      "hRssssssssssssssssssssssssssssssRh",
      "hsssssAssssAssssssssssssAssssAsssh",
      "hssssssbssssbssssssssssssbssssbssh",
      "hssssssssssssssssssssssssssssssssh",
      "hssssssssssssssssssssssssssssssssh",
      "hssssssssssssssssssssssssssssssssh",
      "hssssssssssssssssssssssssssssssssh",
      "RssssssssssssssssssssssssssssssssR",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    entries: { from_town: [17, 2, 'down'] },
    exits: [{ at: [16, 0, 4, 1], to: 'costa_town', entry: 'from_beach' }],
    npcs: [
      { id: 'hojo', name: 'Hojo', model: HOJO_BEACH, at: [23, 6], dir: 'down', anim: 'lie', faceOnTalk: false,
        talk: function* (s) {
          if (s.flag('c6a_hojo_talked')) {
            yield s.say('hojo', "I told you, I am on vacation. Run along and chase your Sephiroth somewhere else.");
            return;
          }
          s.set('c6a_hojo_talked');
          yield s.say('Beauty', "Professor! Your drink's getting all warm~");
          yield s.say('cloud', "...Hojo!");
          yield s.say('hojo', "Hm? Ah... you're the rabble who went traipsing through my laboratory.\fCan't you see I'm busy? Even a scientist is entitled to a little sunshine.");
          yield s.say('cloud', "What are you doing here? Where is Sephiroth going?");
          yield s.say('hojo', "Sephiroth... hehehe. So you're chasing him too.\fVery well. A hypothesis, free of charge. The cells of Jenova are drawn to one another. Scattered, they seek to come together again.\fA Reunion. Perhaps he's heading wherever that Reunion is meant to happen.");
          yield s.say('hojo', "...But that is only a theory. I have no intention of ruining my vacation proving it.");
          if (s.inParty('aeris')) {
            yield s.say('aeris', "You're the one who kept my mother and me locked up in that lab. You know that, don't you?");
            yield s.say('hojo', "Ah, the Ancient. Your mother was a precious specimen. You, on the other hand, were never very cooperative.");
            yield s.say('aeris', "...You're not even a little sorry. Are you.");
            yield s.say('hojo', "Sorry? Sentiment has no place in science, young lady.");
          }
          if (s.inParty('redxiii')) {
            yield s.say('redxiii', "Hmph. The sun does not suit you, Hojo.");
            yield s.say('hojo', "Specimen XIII! Keeping well, I trust? Do take care of that body. I may want it back one day.");
          }
          if (s.inParty('tifa')) yield s.say('tifa', "(People died on that ship... and he's lying here like nothing happened.)");
          yield s.say('Beauty', "Professor, who are these creepy people?");
          yield s.say('hojo', "No one of any importance. Now, where were we?");
          yield s.say('cloud', "(...Useless. He isn't going to tell us anything more.)");
        } },
      { id: 'beauty1', name: 'Beauty', model: SWIM('woman2', { top: '#e04060', bottom: '#e04060' }), at: [21, 6], dir: 'right',
        talk: function* (s) { yield s.say('Beauty', "The professor is SO smart. He knows everything about... um... cells!"); } },
      { id: 'beauty2', name: 'Beauty', model: SWIM('woman4', { top: '#40a0e0', bottom: '#40a0e0' }), at: [25, 6], dir: 'left',
        talk: function* (s) { yield s.say('Beauty', "Go away. The professor's paying for the drinks, and you're blocking the sun."); } },
      { id: 'beauty3', name: 'Beauty', model: SWIM('woman7', { top: '#f0c030', bottom: '#f0c030' }), at: [23, 8], dir: 'up',
        talk: function* (s) { yield s.say('Beauty', "He says he's a big shot at Shinra. That's worth putting up with the creepy laugh, right?"); } },
      { id: 'tifa_off', name: 'Tifa', model: 'tifa', at: [8, 6], dir: 'down', anim: 'lie', faceOnTalk: false, show: s => offDuty(s, 'tifa'),
        talk: function* (s) { yield s.say('tifa', "Mmm... just five more minutes, Cloud. We earned a little rest, didn't we? ...Go on, I'll catch up."); } },
      { id: 'aeris_off', name: 'Aeris', model: 'aeris', at: [10, 6], dir: 'down', anim: 'lie', faceOnTalk: false, show: s => offDuty(s, 'aeris'),
        talk: function* (s) { yield s.say('aeris', "The sand's so warm... Hey, Cloud, lie down with us! ...No? Hmph. Boring."); } },
      { id: 'lifeguard', name: 'Lifeguard', model: SWIM('man3', { top: '#e05030', bottom: '#e05030' }), at: [15, 8], dir: 'down',
        talk: function* (s) { yield s.say('Lifeguard', "No monsters in these waters, but watch out for the jellyfish. And the guy with the glasses. Something about him ain't right."); } },
      { id: 'sandkid', name: 'Girl', model: 'girl2', at: [4, 7], dir: 'down', anim: 'kneel',
        talk: function* (s) { yield s.say('Girl', "I'm building a sand Gold Saucer! ...It keeps falling over."); } },
    ],
  });

  // ------------------------------------------------------------------ inn
  FF7.defineMap('costa_inn', {
    name: 'Costa del Sol Inn', area: 'Costa del Sol', theme: 'house', music: 'costadelsol',
    look: { wall: '#e8dcc0', trim: '#b05a3a' },
    grid: [
      "####################",
      "#b.b.b.b....#j.O..j#",
      "#b.b.b.b....#......#",
      "#...........+......#",
      "#DD.........########",
      "#...........t.c....#",
      "#.....%.....t.c....#",
      "#..................#",
      "#########+##########",
    ],
    entries: { from_town: [9, 7, 'up'] },
    exits: [{ at: [9, 8, 1, 1], to: 'costa_town', entry: 'from_inn', sfx: 'door' }],
    npcs: [
      { id: 'innkeeper', name: 'Innkeeper', model: 'woman3', at: [2, 3], dir: 'down',
        talk: function* (s) { yield s.inn(30, { who: 'Innkeeper', text: "Welcome to Costa del Sol! A room with an ocean breeze is 30 gil a night." }); } },
      { id: 'barret_off', name: 'Barret', model: BARRET_SAILOR, at: [16, 2], dir: 'down', anim: 'fistpump', show: s => offDuty(s, 'barret'),
        talk: function* (s) {
          s.stopAnim('barret_off');
          yield s.emote('barret_off', '!!');
          yield s.say('barret', "Whoa! Don't just barge in on a man!\f...What? Ya got a problem with the uniform? I'm tellin' ya, this sailor look is ME. Maybe I'll keep wearin' it.");
          s.anim('barret_off', 'fistpump');
        } },
      { id: 'guest', name: 'Guest', model: 'man5', at: [16, 6], dir: 'left',
        talk: function* (s) { yield s.say('Guest', "I heard the President's son is running Shinra now. Rufus... I hope he doesn't cancel the company vacations."); } },
    ],
    triggers: [counter([1, 4, 2, 1], function* (s) { yield s.inn(30, { who: 'Innkeeper', text: "Welcome to Costa del Sol! A room with an ocean breeze is 30 gil a night." }); })],
  });

  // ------------------------------------------------------------------ bar
  const barShop = function* (s) {
    yield s.say('Armor Dealer', "Psst. Folks like you look like you run into trouble. I got just the thing. Have a look.");
    yield s.shop(s.flag('disc2') ? 'costa_del_sol_weapons_d2' : 'costa_del_sol_weapons');
  };
  FF7.defineMap('costa_bar', {
    camera: { yaw: 20, pitch: 58, dist: 9.5 },   // the bar seen from above at a slight angle (05-cargo15)
    name: 'Costa del Sol Bar', area: 'Costa del Sol', theme: 'bar', music: 'costadelsol',
    grid: [
      "####################",
      "#kk.....q....kk...q#",
      "#DDDDDD............#",
      "#.........t.c...t..#",
      "#c........t.c...t.c#",
      "#..................#",
      "#.j.....t.c........#",
      "#..................#",
      "##########+#########",
    ],
    entries: { from_town: [10, 7, 'up'] },
    exits: [{ at: [10, 8, 1, 1], to: 'costa_town', entry: 'from_bar', sfx: 'door' }],
    npcs: [
      { id: 'bartender', name: 'Bartender', model: 'bartender', at: [3, 1], dir: 'down',
        talk: function* (s) { yield s.say('Bartender', "Welcome, travelers. First drink's to wash the salt off your throat. ...Ha. Just kidding, that'll be full price."); } },
      { id: 'dealer', name: 'Armor Dealer', model: 'man8', at: [1, 5], dir: 'right', talk: barShop },
      { id: 'drunk_sailor', name: 'Sailor', model: 'sailor', at: [13, 5], dir: 'left',
        talk: function* (s) { yield s.say('Sailor', "*hic* That cargo ship? Carried some weird passengers this time, they say. Half the crew won't talk about it. ...Another round!"); } },
      { id: 'vacationer', name: 'Woman', model: 'woman6', at: [11, 3], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "My husband's working for Shinra in Junon. I'm working on my tan. We both have our jobs, right?"); } },
    ],
    triggers: [counter([1, 2, 6, 1], function* (s) { yield s.say('Bartender', "Sorry, the good stuff's reserved for Shinra executives. ...Well, it WAS."); })],
  });

  // ------------------------------------------------------------------ item & materia shop
  const itemShop = function* (s) { yield s.say('Shopkeeper', "Welcome! Potions, remedies... everything but sunscreen!"); yield s.shop('costa_del_sol_items'); };
  const materiaShop = function* (s) {
    if (offDuty(s, 'yuffie')) {
      yield s.say('yuffie', "Welcome, welcome! Finest materia in Costa del Sol!\f...Oh. It's you. The owner's, uh, 'on break.' I'm just watching the store for him. Honest!");
    } else {
      yield s.say('Materia Seller', "Materia! Straight off the boat from Junon. Take a look!");
    }
    yield s.shop(s.flag('disc2') ? 'costa_del_sol_materia_d2' : 'costa_del_sol_materia');
  };
  FF7.defineMap('costa_shop', {
    name: 'Costa del Sol Shops', area: 'Costa del Sol', theme: 'house', music: 'costadelsol',
    look: { wall: '#e8dcc0', trim: '#b05a3a' },
    grid: [
      "######################",
      "#qq..kk....#..kk..qq.#",
      "#..........#.........#",
      "#DDDD......#....DDDD.#",
      "#....................#",
      "#........j...........#",
      "#....................#",
      "##########+###########",
    ],
    entries: { from_town: [10, 6, 'up'] },
    exits: [{ at: [10, 7, 1, 1], to: 'costa_town', entry: 'from_shop', sfx: 'door' }],
    npcs: [
      { id: 'itemkeeper', name: 'Shopkeeper', model: 'man4', at: [2, 2], dir: 'down', talk: itemShop },
      { id: 'materiakeeper', name: 'Materia Seller', model: 'man9', at: [18, 2], dir: 'down', show: s => !offDuty(s, 'yuffie'), talk: materiaShop },
      { id: 'yuffie_off', name: 'Yuffie', model: 'yuffie', at: [18, 2], dir: 'down', show: s => offDuty(s, 'yuffie'), talk: materiaShop },
      { id: 'customer', name: 'Old Woman', model: 'oldwoman', at: [14, 5], dir: 'up',
        talk: function* (s) { yield s.say('Old Woman', "Materia this, materia that. In my day we fixed things with a good slap on the back."); } },
    ],
    triggers: [counter([1, 3, 4, 1], itemShop), counter([16, 3, 4, 1], materiaShop)],
  });

  // ------------------------------------------------------------------ Johnny's new home
  FF7.defineMap('costa_johnny', {
    name: "Johnny's House", area: 'Costa del Sol', theme: 'house', music: 'costadelsol',
    look: { wall: '#e8dcc0', trim: '#b05a3a' },
    grid: [
      "################",
      "#bb.q....kk..j.#",
      "#..............#",
      "#....t.c.......#",
      "#....t.........#",
      "#..............#",
      "#######+########",
    ],
    entries: { from_town: [7, 5, 'up'] },
    exits: [{ at: [7, 6, 1, 1], to: 'costa_town', entry: 'from_johnny', sfx: 'door' }],
    npcs: [
      { id: 'johnny', name: 'Johnny', model: 'johnny', at: [9, 3], dir: 'down',
        talk: function* (s) {
          if (s.inParty('tifa') && !s.flag('c6a_johnny_tifa')) {
            s.set('c6a_johnny_tifa');
            yield s.emote('johnny', '!!');
            yield s.say('johnny', "T-T-T-TIFA?! Wh-what are you doing here?!\fI-I'm not following you, I swear! I live here now! Honest!");
            yield s.say('tifa', "Johnny? From the Sector 7 slums? ...I'm glad you're doing well.");
            yield s.say('Girlfriend', "Johnny... who is THIS?");
            yield s.say('johnny', "N-nobody! I mean, old friends! From the slums! Ahahaha...\f(She remembered my name... No! Stay strong, Johnny! You've got a girlfriend now!)");
            return;
          }
          if (!s.flag('c6a_johnny_met')) {
            s.set('c6a_johnny_met');
            yield s.say('johnny', "Hey, it's you! From the slums!\fAfter the plate came down, I figured it was time for a fresh start. And look at me now: a house by the sea, and a girlfriend! Life's good, man!");
            return;
          }
          yield s.say('johnny', "If you see anybody from Sector 7... tell 'em Johnny made it big. Well. Medium.");
        } },
      { id: 'girlfriend', name: 'Girlfriend', model: 'woman8', at: [11, 2], dir: 'left',
        talk: function* (s) { yield s.say('Girlfriend', "Johnny's sweet, but he talks about some bar girl from Midgar in his sleep. Should I be worried?"); } },
    ],
  });

  // ------------------------------------------------------------------ the villa
  const villaBed = function* (s) {
    if (!s.flag('c6a_villa_owned')) { yield s.msg('A luxurious bed. Better not mess it up.'); return; }
    yield s.inn(0, { text: `Rest in Villa ${s.name('cloud')}?` });
  };
  FF7.defineMap('costa_villa', {
    camera: { pitch: 64, dist: 10 },   // seen from above (05-cargo18)
    name: 'Villa Costa del Sol', area: 'Costa del Sol', theme: 'mansion', music: 'costadelsol',
    grid: [
      "########################",
      "#kk..u.....F.....u..qq.#",
      "#......................#",
      "#...ttt.......cc.......#",
      "#...ttt................#",
      "#......................#",
      "#bb...............^^...#",
      "#......................#",
      "###########+############",
    ],
    entries: { from_town: [11, 7, 'up'], from_b1: [18, 5, 'down'] },
    exits: [
      { at: [11, 8, 1, 1], to: 'costa_town', entry: 'from_villa', sfx: 'door' },
      { at: [18, 6, 2, 1], to: 'costa_villa_b1', entry: 'from_villa' },
    ],
    npcs: [
      { id: 'agent', name: 'Real Estate Agent', model: { base: 'man', top: '#3a3a4a', sleeve: '#3a3a4a', bottom: '#3a3a4a', extras: ['tie', 'glasses'] }, at: [12, 5], dir: 'down',
        talk: function* (s) {
          if (s.flag('c6a_villa_owned')) {
            yield s.say('Real Estate Agent', `Welcome home, ${s.name('cloud')}! The staff and I keep Villa ${s.name('cloud')} spotless. Rest whenever you like.`);
            return;
          }
          const c = yield s.ask('Real Estate Agent', "This villa belonged to the late President Shinra. Since his... unfortunate passing, it's on the market.\fFully furnished, ocean view, private basement. A mere 300,000 gil!", ['Buy it', 'Too expensive']);
          if (c !== 0) { yield s.say('Real Estate Agent', "Well, if you ever come into a fortune, you know where to find me."); return; }
          if (!s.takeGil(300000)) { yield s.say('Real Estate Agent', "Ah... I'm afraid your wallet disagrees. 300,000 gil, not a gil less."); return; }
          s.set('c6a_villa_owned');
          s.sfx('purchase');
          yield s.say('Real Estate Agent', `Congratulations! From today, this is Villa ${s.name('cloud')}. Feel free to rest here any time!`);
        } },
    ],
    triggers: [counter([1, 6, 2, 1], villaBed)],
  });

  FF7.defineMap('costa_villa_b1', {
    name: 'Villa Basement', area: 'Costa del Sol', theme: 'mansion', music: 'costadelsol',
    look: { floor: ['#6a5a48', '#625242'], wall: '#7a6a58', ambient: [0.34, 0.32, 0.3] },
    grid: [
      "##################",
      "#B.o...qq...B.o..#",
      "#................#",
      "#..B.........B...#",
      "#................#",
      "#^^..............#",
      "##################",
    ],
    entries: { from_villa: [3, 5, 'right'] },
    exits: [{ at: [1, 5, 2, 1], to: 'costa_villa', entry: 'from_b1' }],
    chests: [
      { at: [8, 4], item: 'fire_ring', id: 'costa_villa_firering' },
      { at: [15, 2], item: 'motor_drive', id: 'costa_villa_motordrive' },
      { at: [15, 4], item: 'power_source', id: 'costa_villa_powersource' },
    ],
  });
})();

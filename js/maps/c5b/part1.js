// Chapter 5b (part 1) — the Chocobo Farm and the Mythril Mine.
// Choco Bill, Choco Billy and Chole; the chocobo dance (Choco/Mog); the Chocobo Lure (2000 Gil); the
// Midgar Zolom impaled at the mine mouth; the Mythril Mine (vine ladders, Long Range, Ether, Tent,
// Mind Source, Elixir, Hi-Potion); the Turks at the western exit (Rude, Elena's debut, Tseng).
// Dialogue is paraphrased in our own words (see docs/SCRIPTING.md).
(function () {
  // ------------------------------------------------------------------ helpers
  const MATES = ['barret', 'tifa', 'aeris', 'redxiii', 'yuffie'];
  const mates = (s) => MATES.filter(id => s.inParty(id));
  // Party members "pop out" of Cloud for a scene, FF7 style. Returns the spawned ids.
  function popOut(s, spots) {
    const ids = mates(s);
    ids.forEach((id, i) => { const p = spots[i % spots.length]; s.spawn(id, id, p[0], p[1], p[2] || 'down', { name: s.name(id) }); });
    return ids;
  }
  function tuckIn(s, ids) { ids.forEach(id => s.remove(id)); }
  // The first listed party member who is in the party says the line.
  function* anyone(s, lines) {
    for (const [id, text] of lines) if (s.inParty(id)) { yield s.say(id, text); return id; }
    return null;
  }

  // ------------------------------------------------------------------ world links
  // (unconditional = fallback links: a later chapter can take a location over with a conditional link)
  FF7.world.link('chocobo_farm', { map: 'farm_yard', entry: 'from_world' });
  FF7.world.link('mythril_mine_e', { map: 'mine_marsh', entry: 'from_world' });
  FF7.world.link('mythril_mine_w', { map: 'mine_exit', entry: 'from_world' });

  // Riding Billy's rented chocobo: like any chocobo in FF7, no random battles while mounted
  // (so the Midgar Zolom can't catch you). The rental ends at the mine entrance.
  (FF7.world.encounterHooks = FF7.world.encounterHooks || []).push(function (ctx) {
    const st = FF7.state;
    if (!st || !st.flags || !st.flags.c5b_marsh_chocobo || ctx.vehicle !== 'chocobo') return null;
    return function* (s) { /* the chocobo outruns everything */ };
  });

  // ================================================================== CHOCOBO FARM
  FF7.defineMap('farm_yard', {
    name: 'Chocobo Farm', area: 'Grasslands', theme: 'grass', music: 'farmboy',
    look: { floor2: ['#9a7a4a', '#927244'] },
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TThhhhhhhhhhT%,,,,,%hhhhhhhhhhhhTT",
      "TThhhhhhhhhh,,,,,,,,hhhhhhhhhhhhTT",
      "TThhhh+hhhhh,,,,,,,,hhhhh+hhhhhhTT",
      "T,,,,,:,,,,,,!,,,,,,,,,,,:,,,,oB,T",
      "T,,,,,::::::::::::::::::::,,,,,,,T",
      "T,%,,,,,,,,,,,,:,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,:,,==============,T",
      "T,,Y,,,,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,,,,BB,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,%,,,,,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,:,,=,,,,,,,,,,,,=,T",
      "T,,,,,,,,,,,,,,:,,==============,T",
      "T,,,,,,,,,,,,,,:,,,,,,,,,,,,,,,%,T",
      "TT,,,,,,,,,,,,,:,,,,,,,,,,,,,,,,TT",
      "TTT,,,,,,,,,,,,:,,,,,,,,,,,,,,,TTT",
      "TTTTTTTTTTT,,,,:,,,,,TTTTTTTTTTTTT",
      "TTTTTTTTTTT,,,,:,,,,,TTTTTTTTTTTTT",
    ],
    entries: { from_world: [15, 17, 'up'], from_house: [6, 4, 'down'], from_stable: [25, 4, 'down'] },
    exits: [
      { at: [11, 19, 10, 1], run: function* (s) {
          if (s.flag('c5b_marsh_chocobo')) {
            s.sfx('chocobo');
            yield s.msg('Cloud climbs onto the rented chocobo. Time to cross the marsh!');
            yield s.world({ x: 298, y: 167, vehicle: 'chocobo' });
            return;
          }
          yield s.world('chocobo_farm');
        } },
      { at: [6, 3, 1, 1], to: 'farm_house', entry: 'from_yard', sfx: 'door' },
      { at: [25, 3, 1, 1], to: 'farm_stable', entry: 'from_yard', sfx: 'door' },
    ],
    npcs: [
      { id: 'choco_wark', name: 'Chocobo', model: 'chocobo', at: [17, 10], dir: 'left',
        talk: function* (s) {
          s.sfx('chocobo');
          if (s.flag('c5b_chocomog')) { yield s.say('Chocobo', "Kweh! ♪"); return; }
          const c = yield s.ask('Chocobo', "Kweh?", ['Wark!', '......', 'Kweh...?']);
          if (c !== 0) {
            yield s.say('Chocobo', "......Kweh.");
            yield s.msg('The chocobo looks away, unimpressed.');
            return;
          }
          yield s.say('Chocobo', "Wark! Wark!!");
          yield s.emote('choco_wark', '♪');
          s.sfx('chocobo_tune');
          for (let i = 0; i < 3; i++) {
            ['pen1', 'pen2', 'pen3', 'pen4'].forEach(id => s.emote(id, '♪', 30));
            yield s.jump('choco_wark', 17, 10, 0.45, 16);
            yield 8;
          }
          s.sfx('chocobo2');
          yield s.msg('The chocobos danced happily together!\fThe chocobo coughed something up...');
          s.set('c5b_chocomog');
          yield s.giveMateria('choco_mog');
        } },
      { id: 'pen1', name: 'Chocobo', model: 'chocobo', at: [22, 9], dir: 'down', wander: 2 },
      { id: 'pen2', name: 'Chocobo', model: 'chocobo', at: [26, 11], dir: 'left', wander: 2 },
      { id: 'pen3', name: 'Chocobo', model: 'chocobo', at: [28, 9], dir: 'down', wander: 1 },
      { id: 'pen4', name: 'Chocobo', model: 'chocobo', at: [21, 12], dir: 'right', wander: 1 },
      { id: 'farmhand', name: 'Farmhand', model: 'worker2', at: [9, 7], dir: 'down', wander: 2,
        talk: function* (s) {
          yield s.say('farmhand', "The birds in the pen were raised right here on the farm.\fWild ones roam the plains, but they're skittish. See those scuffed-up patches out there? Chocobo tracks. That's where they hide.");
        } },
    ],
    triggers: [
      { at: [13, 4], on: 'talk', run: function* (s) {
          yield s.msg('CHOCOBO FARM\n\nChocobos raised with care. Greens sold in the stable.');
        } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5b_farm_arrived')) return;
      s.set('c5b_farm_arrived');
      yield s.move('player', 15, 13);
      const ids = popOut(s, [[14, 14, 'up'], [16, 14, 'up']]);
      s.sfx('chocobo');
      yield s.emote('player', '!');
      yield* anyone(s, [
        ['aeris', "Chocobos! Look at them, Cloud, they're so fluffy!"],
        ['tifa', "Chocobos... I haven't seen so many in one place since I was a kid."],
        ['barret', "Hah! A whole herd of chocobos. Ain't that somethin'."],
        ['redxiii', "A chocobo ranch. The smell is... considerable."],
        ['yuffie', "Whoa, chocobos! Can we ride one? Huh? Can we?"],
      ]);
      yield s.say('cloud', "......\fThe marsh to the south is supposed to be dangerous. The people here should know how to get across.");
      yield* anyone(s, [
        ['barret', "Then quit sightseein' and go ask 'em."],
        ['aeris', "Right! And maybe pet one on the way."],
      ]);
      tuckIn(s, ids);
    },
  });

  // ------------------------------------------------------------------ Choco Bill's house
  FF7.defineMap('farm_house', {
    name: 'Chocobo Farm', area: 'Grasslands', theme: 'house',
    // seen diagonally from the south-east like the L-shaped room in ff7art40 (kitchen top-left, bedrooms lower right)
    camera: { yaw: 35, pitch: 52, dist: 9.5 },
    grid: [
      "####################",
      "#kk.q..F....#b.b.b.#",
      "#...........#......#",
      "#...ctc.....+......#",
      "#....c......#......#",
      "#...........#..j...#",
      "#j..........########",
      "#...........########",
      "#####+##############",
    ],
    entries: { from_yard: [5, 7, 'up'] },
    exits: [{ at: [5, 8, 1, 1], to: 'farm_yard', entry: 'from_house', sfx: 'door' }],
    lights: [[7, 2, '#ffb060', 3]],
    npcs: [
      { id: 'bill', name: 'Choco Bill', model: 'oldman', at: [8, 3], dir: 'down',
        talk: function* (s) {
          if (!s.flag('c5b_bill_talked')) {
            s.set('c5b_bill_talked');
            yield s.say('bill', "Well, well! Visitors! Welcome to my farm. Folks call me Choco Bill.\fMy grandson Billy looks after the birds out in the stable, and his little sister Chole's never far from 'em either.");
            yield s.say('cloud', "We need to get across the marsh to the south.");
            yield* FF7.story.c5b_billMarsh(s);
          }
          const c = yield s.ask('bill', "Anything else I can do for you?", ['About the marsh', 'Rest for the night', 'Nothing']);
          if (c === 0) { yield* FF7.story.c5b_billMarsh(s); return; }
          if (c === 1) {
            yield s.inn(100, { who: 'bill', text: "The spare beds are 100 Gil a night. Want to turn in?" });
            return;
          }
          yield s.say('bill', "Take it easy out there, now.");
        } },
    ],
    triggers: [
      { at: [13, 1, 5, 1], on: 'talk', run: function* (s) { yield s.msg('Neatly made beds. They smell faintly of hay.'); } },
    ],
  });

  FF7.story.c5b_billMarsh = function* (s) {
    yield s.say('bill', "The marsh? Don't you go walkin' in there!\fThat's the Midgar Zolom's hunting ground. A snake bigger than a house, and fast, too. It'll swallow you whole before you've taken ten steps.");
    yield s.say('bill', "If you've got to cross, do it on a chocobo. Nothing in that swamp can keep up with one.\fBilly out in the stable can teach you how to catch a wild one.");
    yield s.say('bill', "...Funny thing, though. Not long ago I saw a man in a long black cape just stroll right into that marsh. Didn't run, didn't look back.\fGave me chills, I tell you.");
    yield s.say('cloud', "(A man in a black cape...)");
  };

  // ------------------------------------------------------------------ the stable
  FF7.defineMap('farm_stable', {
    name: 'Chocobo Farm Stable', area: 'Grasslands', theme: 'house', music: 'cinco_chocobo',
    look: { floor: ['#8a7048', '#826842'], wall: '#9a7a50', wallH: 2.6 },
    // the long barn seen at an angle from the south-west, stalls along the back (ff7art39)
    camera: { yaw: -25, pitch: 50, dist: 10 },
    grid: [
      "########################",
      "#,,,=,,,=,,,=,,,=,BB,oo#",
      "#,,,=,,,=,,,=,,,=,,,,,,#",
      "#================......#",
      "#......................#",
      "#......................#",
      "#.................DDDD.#",
      "#......................#",
      "#......................#",
      "##########+#############",
    ],
    entries: { from_yard: [10, 8, 'up'] },
    exits: [{ at: [10, 9, 1, 1], to: 'farm_yard', entry: 'from_stable', sfx: 'door' }],
    npcs: [
      { id: 'billy', name: 'Choco Billy', model: 'kid3', at: [19, 5], dir: 'down', talk: function* (s) { yield* FF7.story.c5b_billy(s); } },
      { id: 'chole', name: 'Chole', model: 'girl2', at: [8, 4], dir: 'up',
        talk: function* (s) {
          yield s.say('chole', "Hi! I'm Chole. Billy's my big brother.\fI can tell what chocobos are thinking, you know. Really!");
          yield s.say('chole', "That one says it's hungry. And that one over there says...\f......that your hair looks just like its baby's. Hee hee!");
          yield s.say('cloud', "......");
        } },
      { id: 'stall1', name: 'Chocobo', model: 'chocobo', at: [2, 2], dir: 'down' },
      { id: 'stall2', name: 'Chocobo', model: 'chocobo', at: [6, 1], dir: 'down' },
      { id: 'stall3', name: 'Chocobo', model: 'chocobo', at: [10, 2], dir: 'down' },
      { id: 'stall4', name: 'Chocobo', model: 'chocobo', at: [14, 1], dir: 'down' },
    ],
    triggers: [
      { at: [18, 6, 4, 1], on: 'talk', run: function* (s) { yield* FF7.story.c5b_billy(s); } },
      // the stall chocobos, talked to over the fence
      { at: [1, 3, 15, 1], on: 'talk', run: function* (s) {
          s.sfx('chocobo');
          const lines = ["Kweh!", "Kweeh?", "Wark! Wark!", "Kweh... (It's dozing.)"];
          yield s.say('Chocobo', lines[s.random(lines.length)]);
        } },
    ],
  });

  FF7.story.c5b_billy = function* (s) {
    if (!s.flag('c5b_billy_talked')) {
      s.set('c5b_billy_talked');
      yield s.say('billy', "Hi there! I'm Billy—everybody calls me Choco Billy. Grandpa owns the farm, but the chocobos are my job.");
    }
    const opts = ['About chocobos', 'Buy greens', 'Chocobo Lure', 'Rent a chocobo', 'Nothing'];
    const c = yield s.ask('billy', "What can I do for you?", opts);
    if (c === 0) {
      yield s.say('billy', "See the chocobo tracks out on the plains? Wild chocobos live around there.\fBut they're shy. You won't ever run into one unless you've got a Chocobo Lure materia equipped.");
      yield s.say('billy', "When one shows up in a fight, feed it some greens right away so it doesn't run off. Then beat the other monsters, and the chocobo's all yours!\fThe better the greens, the longer it'll stay put.");
      yield s.say('billy', "A chocobo can run clean across the marsh—the Zolom can't catch it. And once you get off, it runs right back to the wild.");
    } else if (c === 1) {
      yield s.shop(s.flag('disc2') ? 'chocobo_farm_items_d2' : 'chocobo_farm_items');
    } else if (c === 2) {
      if (s.flag('chocobo_lure')) { yield s.say('billy', "That was the only Chocobo Lure I had. Take good care of it!"); return; }
      yield s.say('billy', "The Chocobo Lure? Hmm... I don't usually sell it, but I'm in a good mood today.\fTell you what—2000 Gil and it's yours.");
      const b = yield s.ask('billy', "", ['Buy it (2000 Gil)', 'Maybe later']);
      if (b !== 0) { yield s.say('billy', "Okay. You know where to find me!"); return; }
      if (!s.takeGil(2000)) { yield s.say('billy', "Aw, you're short on Gil. Come back when you've got 2000!"); return; }
      s.sfx('purchase');
      s.set('chocobo_lure');
      yield s.giveMateria('chocobo_lure');
      yield s.say('billy', "Equip it and walk around on the chocobo tracks. Don't forget the greens!");
    } else if (c === 3) {
      if (s.flag('c5b_marsh_chocobo')) { yield s.say('billy', "Your chocobo's saddled and waiting outside. Just head for the marsh!"); return; }
      if (s.flag('c5b_zolom_seen')) { yield s.say('billy', "You already made it across? Wow! Then you don't need one of ours."); return; }
      yield s.say('billy', "Don't feel like catching one yourself? I can lend you one of ours to get across the marsh.\fIt'll cost you 500 Gil. Once you're on the other side, just let it go—our birds always find their way home.");
      const b = yield s.ask('billy', "", ['Rent one (500 Gil)', 'No thanks']);
      if (b !== 0) return;
      if (!s.takeGil(500)) { yield s.say('billy', "Sorry, it's 500 Gil. No discounts, Grandpa's rules!"); return; }
      s.sfx('purchase');
      s.set('c5b_marsh_chocobo');
      s.sfx('chocobo');
      yield s.say('billy', "All set! It's waiting for you outside the farm. Ride it straight across the marsh—and don't stop!");
    } else {
      yield s.say('billy', "Come back anytime!");
    }
  };

  // ================================================================== MYTHRIL MINE
  // ------------------------------------------------------------------ outside (marsh side): the impaled Zolom
  FF7.defineMap('mine_marsh', {
    name: 'Mythril Mine Entrance', area: 'Grasslands', theme: 'jungle', music: 'blackcape',
    look: { wall: '#5a5048', wallH: 3.0, sky: ['#3a4a3a', '#8a9a88'], water: '#3a5a40', fog: { color: [0.3, 0.36, 0.3], near: 10, far: 26 } },
    grid: [
      "RRRR########....########RRRR",
      "RR##########....##########RR",
      "R,,RR,,,,,,,dddd,,,,,,RR,,,R",
      "R,,,,,,,,,,,dddd,,,,,,,,,,,R",
      "R,,G,,,,,,,,dddd,,,,,,,,G,,R",
      "R,,,,,,,,,,,,ddd,,,Y,,,,,,,R",
      "R,,,,,T,,,,,,dd,,,,,,,,,,,,R",
      "R,,,,,,,,,,,ddd,,,,,,,,G,,,R",
      "R~~,,,,,,,,,dddd,,,,,,,,,~~R",
      "R~~~,,G,,,,,dddd,,,,,,,,~~~R",
      "R~~~~,,,,,,dddd,,,,,,,,~~~~R",
      "R~~~~~,,,,,dddd,,,,,,,~~~~~R",
      "~~~~~~~,,,,dddd,,,,,,~~~~~~~",
      "~~~~~~~~,,,dddd,,,,,~~~~~~~~",
    ],
    entries: { from_world: [13, 11, 'up'], from_mine: [13, 2, 'down'] },
    exits: [
      { at: [12, 0, 4, 1], to: 'mine_cavern', entry: 'from_marsh' },
      { at: [8, 13, 12, 1], to: 'world', loc: 'mythril_mine_e' },
    ],
    npcs: [
      { id: 'zolom', name: 'Midgar Zolom', model: { enemy: 'midgar_zolom', scale: 1.1 }, at: [6, 6], dir: 'right', faceOnTalk: false,
        talk: function* (s) { yield s.msg('The giant serpent hangs lifeless, run clean through by the branches of a dead tree.\fWhatever did this lifted a creature the size of a train car... and left it here like a warning.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5b_marsh_chocobo')) {
        s.unset('c5b_marsh_chocobo');
        s.sfx('chocobo');
        yield s.msg("The rented chocobo gives a cheerful \"Wark!\" and dashes back across the marsh toward the farm.");
      }
      if (s.flag('c5b_zolom_seen')) return;
      s.set('c5b_zolom_seen');
      yield s.move('player', 13, 8);
      yield s.cam(7, 6, 50);
      yield s.emote('player', '!');
      const ids = popOut(s, [[12, 9, 'up'], [14, 9, 'up']]);
      yield* anyone(s, [
        ['barret', "Wh-what the hell...!? That's the snake from the marsh! Somethin' skewered it on that tree like a damn shish kebab!"],
        ['redxiii', "The serpent of the marsh... impaled, as if it weighed nothing."],
        ['tifa', "That's... the snake from the marsh? What could do something like that?"],
      ]);
      yield* anyone(s, [
        ['aeris', "How awful... Who could even do this?"],
        ['yuffie', "Ugh, gross! ...Okay, that's actually kinda scary."],
        ['tifa', "Cloud... who did this?"],
      ]);
      yield s.say('cloud', "......Sephiroth.");
      yield* anyone(s, [
        ['redxiii', "If one man did this alone... then what we are chasing is no ordinary man."],
        ['tifa', "Sephiroth... He's still this strong..."],
      ]);
      yield* anyone(s, [['barret', "...Tch. C'mon. Standin' here gawkin' ain't gonna catch him."]]);
      tuckIn(s, ids);
      yield s.camFollow();
    },
  });

  // ------------------------------------------------------------------ the first cavern (Mind Source)
  FF7.defineMap('mine_cavern', {
    name: 'Mythril Mine', area: 'Mythril Mine', theme: 'mine', music: 'blackcape',
    battle: { table: 'mythril_mine', bg: 'mine', rate: 1 },
    lights: [[8, 1, '#60f0c0', 3], [22, 1, '#60f0c0', 3], [34, 2, '#60f0c0', 2.5], [5, 11, '#60f0c0', 2.5]],
    grid: [
      "####################################",
      "##RR###UU#######    #####UU####RR###",
      "#R.............R    ...........R..U#",
      "#....dd.........    ....dd.........#",
      ".......rrrrrrrr.    ...............#",
      "..R............B    .......R.......#",
      "#..............R    ...............#",
      "#R..............KKKK................",
      "##..............KKKK................",
      "#R..o...........    ................",
      "##..............    ..........R....#",
      "#R...U..........    ...............#",
      "##.............R    ..dd...........#",
      "###RR....RR....R    ........B......#",
      "#######RR######R    ####....########",
      "################    ####....########",
    ],
    entries: { from_marsh: [25, 13, 'up'], from_vines: [34, 8, 'left'], from_steps: [1, 4, 'right'] },
    exits: [
      { at: [24, 15, 4, 1], to: 'mine_marsh', entry: 'from_mine' },
      { at: [35, 7, 1, 3], to: 'mine_vines', entry: 'from_cavern' },
      { at: [0, 4, 1, 2], to: 'mine_steps', entry: 'from_cavern' },
    ],
    chests: [{ at: [34, 13], item: 'mind_source', id: 'mine_cavern_mindsource' }],
    onEnter: function* (s) {
      if (s.flag('c5b_mine_entered')) return;
      s.set('c5b_mine_entered');
      yield s.say('cloud', "(The Mythril Mine... Nobody's worked it in years. The only way through the mountains to the western side.)");
    },
  });

  // ------------------------------------------------------------------ the vine room (Long Range on the ledge, Ether on the steps)
  FF7.defineMap('mine_vines', {
    name: 'Mythril Mine', area: 'Mythril Mine', theme: 'mine', music: 'blackcape',
    battle: { table: 'mythril_mine', bg: 'mine', rate: 1 },
    lights: [[14, 11, '#60f0c0', 2.5], [3, 3, '#80f0d0', 2.5]],
    grid: [
      "########################",
      "#RR##VV#################",
      "#.......RR.......R....R#",
      "#.......R........R....R#",
      "#.......R.........^^^^.#",
      "#.......R..............#",
      "#VVVHVVVR..............#",
      "#VVVHVVV...............#",
      "#VVVHVVV......B........#",
      "#......................#",
      "..........x............#",
      "..............U........#",
      "...R...................#",
      "#R.......RR......o.....#",
      "##RR####RRRR####RRR#####",
      "########################",
    ],
    heights: [
      "000000000000000000000000",
      "088888880000000000000000",
      "088888888000000003333330",
      "088888888000000003333330",
      "088888888000000000222200",
      "088888888000000000000000",
      "000060000000000000000000",
      "000040000000000000000000",
      "000020000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    entries: { from_cavern: [1, 11, 'right'] },
    exits: [{ at: [0, 10, 1, 3], to: 'mine_cavern', entry: 'from_vines' }],
    items: [
      { at: [2, 3], materia: 'long_range', id: 'mine_vines_longrange' },
      { at: [20, 2], item: 'ether', id: 'mine_vines_ether' },
    ],
    triggers: [
      { id: 'vine_hint', at: [3, 9, 3, 1], once: true, run: function* (s) {
          yield s.say('cloud', "(These vines are thick... Strong enough to climb.)");
        } },
    ],
  });

  // ------------------------------------------------------------------ the stone steps (Tent up the side path)
  FF7.defineMap('mine_steps', {
    name: 'Mythril Mine', area: 'Mythril Mine', theme: 'mine', music: 'blackcape',
    battle: { table: 'mythril_mine_east', bg: 'mine', rate: 1 },
    lights: [[18, 2, '#60f0c0', 3], [6, 1, '#80f0d0', 2]],
    grid: [
      "##############################",
      "#####....#####################",
      "####R....R########UU##########",
      "#RR..^^^^..RR#####......######",
      "..............RR.............#",
      "...o..........^..............#",
      "..............^...............",
      "#R............^...............",
      "##............^......B........",
      "###R.........RR..............#",
      "####RR.....RRRR.....dd.......#",
      "######RRR#######.............#",
      "##############################",
      "##############################",
    ],
    heights: [
      "000000000000000000000000000000",
      "000007777000000000000000000000",
      "000077777700000000000000000000",
      "044446666444400000000000000000",
      "444444444444444000000000000000",
      "444444444444442000000000000000",
      "444444444444442000000000000000",
      "444444444444442000000000000000",
      "444444444444442000000000000000",
      "444444444444440000000000000000",
      "444444444444440000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_cavern: [28, 7, 'left'], from_exit: [1, 5, 'right'] },
    exits: [
      { at: [29, 6, 1, 3], to: 'mine_cavern', entry: 'from_steps' },
      { at: [0, 4, 1, 3], to: 'mine_exit', entry: 'from_steps' },
    ],
    chests: [{ at: [6, 1], item: 'tent', id: 'mine_steps_tent' }],
  });

  // ------------------------------------------------------------------ the western exit: the Turks
  FF7.defineMap('mine_exit', {
    name: 'Mythril Mine Exit', area: 'Mythril Mine', theme: 'mine', music: 'blackcape',
    battle: { table: 'mythril_mine_east', bg: 'mine', rate: 0.7, if: s => s.flag('c5b_turks_mine') },
    lights: [[1, 7, '#fff4d0', 4], [11, 10, '#60f0c0', 2]],
    grid: [
      "##############################",
      "#########RR####....###########",
      "#####R.......R...........#####",
      "####RR.......R............####",
      "###.........................##",
      "##.....................o.....#",
      "..............................",
      ".....R.............R..........",
      "..........dd..................",
      "##..........................##",
      "###RR......U.......RR.......##",
      "######RR####RRR######RRR######",
      "##############################",
      "##############################",
    ],
    heights: [
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000004444444440000000000000000",
      "000044444444440000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
      "000000000000000000000000000000",
    ],
    entries: { from_steps: [28, 7, 'left'], from_world: [1, 7, 'right'], from_north: [16, 2, 'down'] },
    exits: [
      { at: [29, 6, 1, 3], to: 'mine_steps', entry: 'from_exit' },
      { at: [0, 6, 1, 3], to: 'world', loc: 'mythril_mine_w', if: s => s.flag('c5b_turks_mine') },
      { at: [15, 1, 4, 1], to: 'mine_north', entry: 'from_exit' },
    ],
    triggers: [
      { id: 'turks', at: [18, 2, 2, 8], once: true, if: s => !s.flag('c5b_turks_mine'), run: function* (s) {
          yield* FF7.story.c5b_mineTurks(s);
        } },
    ],
  });

  FF7.story.c5b_mineTurks = function* (s) {
    s.music('turks');
    s.spawn('rude', 'rude', 11, 7, 'right', { name: 'Rude' });
    yield s.move('player', 16, 7);
    yield s.face('player', 'left');
    const ids = popOut(s, [[17, 6, 'left'], [17, 8, 'left']]);
    yield s.emote('player', '!');
    yield s.say('rude', "......");
    yield* anyone(s, [
      ['tifa', "You're... one of the Turks. From the Shinra building."],
      ['barret', "Hey! You're that bald Turk bastard!"],
      ['aeris', "The Turks... Why am I not surprised?"],
    ]);
    s.spawn('elena', 'elena', 7, 5, 'right', { name: 'Elena' });
    yield s.run('elena', 10, 6);
    yield s.face('elena', 'player');
    yield s.say('elena', "Hold it right there!\f...Ahem. I'm Elena, the newest member of the Turks.");
    yield s.say('elena', "Because of you people, Reno's stuck in the hospital and we're short on manpower. That's why I got promoted!\f......Not that I'm thanking you for it! That's not the point!");
    yield s.say('elena', "We have orders to find Sephiroth and keep you out of our way.\fHe's headed for the harbor at Junon, so we're going to—");
    yield s.emote('elena', '!');
    yield s.say('elena', "...Uh-oh.");
    s.spawn('tseng', 'tseng', 8, 3, 'down', { name: 'Tseng' });
    yield s.cam(9, 4, 30);
    yield s.say('tseng', "Elena. You talk too much.");
    yield s.say('elena', "S-sir! I'm sorry, sir!");
    yield s.say('tseng', "No matter. There's nothing they can do with it.\fOur job is to find Sephiroth. As for the rest of you... we'll settle things another time.");
    yield s.say('tseng', "Elena. Go on ahead to Junon and report in.");
    yield s.say('elena', "Yes, sir! Leave it to me!");
    yield s.run('elena', 0, 7);
    s.remove('elena');
    yield s.say('tseng', "Rude.");
    yield s.say('rude', "......Understood.");
    yield s.move('rude', 0, 7);
    s.remove('rude');
    yield s.move('tseng', 6, 2);
    s.remove('tseng');
    yield s.camFollow();
    s.music('lurking');
    yield* anyone(s, [
      ['barret', "Junon, huh? That's the big Shinra harbor on the other side of these mountains."],
      ['redxiii', "Junon. The harbor town beyond the mountains, if I recall."],
    ]);
    yield* anyone(s, [
      ['tifa', "If Sephiroth's going to a harbor... he means to cross the sea."],
      ['aeris', "A harbor... Then he's going across the ocean?"],
    ]);
    yield s.say('cloud', "......Let's go. To Junon.");
    tuckIn(s, ids);
    s.set('c5b_turks_mine');
  };

  // ------------------------------------------------------------------ the northern cave (Elixir, Hi-Potion)
  FF7.defineMap('mine_north', {
    name: 'Mythril Mine', area: 'Mythril Mine', theme: 'mine', music: 'blackcape',
    battle: { table: 'mythril_mine_north', bg: 'mine', rate: 1 },
    lights: [[12, 1, '#60f0c0', 3], [15, 4, '#60f0c0', 2.5]],
    grid: [
      "####################",
      "###RR#####UU####RR##",
      "##R..............R##",
      "#......dd..........#",
      "#..R...........U...#",
      "#.......RR.........#",
      "#..U...............#",
      "##.......x.......RR#",
      "###RR..........RR###",
      "#######....#########",
      "#######....#########",
      "####################",
    ],
    entries: { from_exit: [8, 8, 'up'] },
    exits: [{ at: [7, 10, 4, 1], to: 'mine_exit', entry: 'from_north' }],
    chests: [{ at: [16, 3], item: 'elixir', id: 'mine_north_elixir' }],
    items: [{ at: [5, 4], item: 'hi_potion', id: 'mine_north_hipotion' }],
  });
})();

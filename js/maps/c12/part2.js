// Chapter 12a (part 2) — Chocobo Farm, raising & breeding (disc 2/3, once the Highwind flies).
//  * Choco Bill (farm_house) rents up to 6 stables at 10,000 gil; with a stable, up to 4 caught
//    birds wait in the fence (farm_yard) until Choco Billy moves them.
//  * Choco Billy (farm_stable): feed greens, move birds from the fence (rating, sex, name), mate
//    them with nuts (Blue/Green/Black/Gold rules in part1's L.breed), ride one, release one.
//    His C5b menu is wrapped (FF7.story.c5b_billy) so disc 1 behaviour is unchanged.
//  * side_choco_stable — the six rental stalls behind the stable, with a stable hand offering the
//    same services; each stall shows its bird.
//  * Chole: "Chole's chocobo inspection" and the Chocobo Sage notes (part3 fills the stage).
//  * The Kalm Traveller's Gold Chocobo (C5a flag c5a_gold_chocobo) is delivered to a free stable.
//  * The second Chocobo Lure lies in front of the pens on disc 2.
// Flags: c12a_bill_d2, c12a_gold_delivered. Vars: c12a_stables, c12a_chole_stage.
(function () {
  const L = FF7.story.c12aLib;
  const V = () => FF7.state.vars;
  const late = (s) => s.flag('has_highwind');

  // ------------------------------------------------------------------ helpers
  L.pickChocobo = function* (s, who, text, filter) {
    const list = L.chocobos().map((c, i) => ({ c, i })).filter(o => !filter || filter(o.c));
    if (!list.length) return -1;
    const k = yield s.ask(who, text, list.map(o => L.label(o.c)).concat(['Cancel']), { cancel: list.length });
    return k >= 0 && k < list.length ? list[k].i : -1;
  };

  L.deliverGold = function* (s, who) {
    if (!s.flag('c5a_gold_chocobo') || FF7.state.flags.c12a_gold_delivered) return;
    if (L.freeStables() <= 0) {
      yield s.say(who, "Oh, right! A traveller from Kalm sent a chocobo here for you. A GOLD one!\fBut you don't have an empty stable for it... Rent another one from Grandpa, or let one of your birds go.");
      return;
    }
    s.set('c12a_gold_delivered');
    const c = L.makeKalmGold();
    s.sfx('chocobo');
    yield s.say(who, "Oh! A traveller from Kalm dropped off a chocobo for you. It's GOLD! I've never seen one like it!");
    yield s.say(who, `It's a ${c.sex}. Looks like a great chocobo, too!`);
    yield* L.nameIt(s, who, c);
    L.chocobos().push(c);
    yield s.msg(`${c.name} moved into the stable!`);
  };

  // ------------------------------------------------------------------ feeding
  function* feedOne(s, who, c) {
    const have = L.GREENS.filter(g => s.count(g) > 0);
    if (!have.length) { yield s.say(who, "You don't have any greens! Billy sells them, and the Chocobo Sage up north grows the really good stuff."); return; }
    const k = yield s.ask(who, `What should ${c.name} eat?`, have.map(g => `${L.itemName(g)} (${s.count(g)})`).concat(['Cancel']));
    if (k >= have.length) return;
    const g = have[k];
    const qs = [1, 5, 10].filter(n => n <= s.count(g));
    const q = yield s.ask(who, 'How many?', qs.map(String).concat(['Cancel']));
    if (q >= qs.length) return;
    const n = qs[q];
    s.take(g, n);
    const ups = new Set();
    for (let i = 0; i < n; i++) L.feed(c, g).forEach(u => ups.add(u));
    s.sfx('chocobo');
    yield s.emote('player', '♪');
    const calm = ups.delete('personality');
    if (ups.size) yield s.msg(`${c.name} gobbled up the ${L.itemName(g)}!\n${[...ups].map(u => u[0].toUpperCase() + u.slice(1)).join(', ')} went up.`);
    else yield s.msg(`${c.name} gobbled up the ${L.itemName(g)}!\nYou're getting along better.`);
    if (calm) { s.sfx('levelup'); yield s.say(who, `Hey, look at that! ${c.name}'s personality has improved! It's settled right down.`); }
  }
  function* feedMenu(s, who) {
    const i = yield* L.pickChocobo(s, who, 'Which chocobo gets fed?');
    if (i < 0) return;
    yield* feedOne(s, who, L.chocobos()[i]);
  }

  // ------------------------------------------------------------------ moving from the fence
  function* moveMenu(s, who) {
    const pen = L.pen();
    if (!pen.length) { yield s.say(who, "There aren't any chocobos waiting in the fence right now.\fCatch some out on the tracks and send them here!"); return; }
    let i = 0;
    for (let guard = 0; guard < 8 && i < pen.length; guard++) {
      const p = pen[i];
      yield s.say(who, L.RATING_LINE[p.rating] || L.RATING_LINE.average);
      const k = yield s.ask(who, 'What should we do with it?', ['Move it to a stable', 'Set it free', 'Leave it in the fence']);
      if (k === 0) {
        if (L.freeStables() <= 0) { yield s.say(who, "Your stables are full! Grandpa can rent you another one, or you could let a bird go."); i++; continue; }
        pen.splice(i, 1);
        const c = L.make(p.rating);
        yield s.say(who, `It's a ${c.sex}!`);
        yield* L.nameIt(s, who, c);
        L.chocobos().push(c);
        s.sfx('chocobo');
        yield s.msg(`${c.name} moved into the stable!`);
      } else if (k === 1) {
        pen.splice(i, 1);
        yield s.say(who, 'Bye-bye! Back to the plains with you.');
      } else i++;
    }
  }

  // ------------------------------------------------------------------ mating
  function* mateMenu(s, who) {
    const list = L.chocobos();
    if (!list.some(c => c.sex === 'male') || !list.some(c => c.sex === 'female')) { yield s.say(who, "It takes a male and a female to make an egg. You'll need one of each in the stables."); return; }
    if (L.freeStables() <= 0) { yield s.say(who, "You'll need an empty stable for the baby first."); return; }
    const nuts = L.NUTS.filter(n => s.count(n) > 0);
    if (!nuts.length) { yield s.say(who, "Chocobos won't mate unless you feed them a nut. I sell a few kinds, and the Chocobo Sage has others."); return; }
    const a = yield* L.pickChocobo(s, who, 'Which chocobo goes first?');
    if (a < 0) return;
    const A = list[a];
    if (!L.ready(A)) { yield s.say(who, `${A.name} isn't ready yet. Give it a little time... go get into a few fights out there and come back.`); return; }
    const b = yield* L.pickChocobo(s, who, `Who will ${A.name} mate with?`, c => c !== A && c.sex !== A.sex);
    if (b < 0) { if (!list.some(c => c !== A && c.sex !== A.sex)) yield s.say(who, `There's no ${A.sex === 'male' ? 'female' : 'male'} for ${A.name} to mate with.`); return; }
    const B = list[b];
    if (!L.ready(B)) { yield s.say(who, `${B.name} isn't ready yet. Give it a little more time.`); return; }
    const k = yield s.ask(who, 'Which nut will you give them?', nuts.map(n => `${L.itemName(n)} (${s.count(n)})`).concat(['Cancel']));
    if (k >= nuts.length) return;
    const nut = nuts[k];
    // (Config > Chocobo Details: FF7's slip - a Zeio Nut only makes a Gold when the Black is the one picked first)
    if (L.detailsOn() && nut === 'zeio_nut' && A.color !== 'black' && B.color === 'black') {
      const go = yield s.ask(null, "(Picked this way round, a Zeio Nut can't make a Gold: the Black has to be the one picked first.)\nMate them anyway?", ['Mate them anyway', 'Cancel']);
      if (go !== 0) return;
    }
    s.take(nut, 1);
    yield s.msg(`${A.name} and ${B.name} ate the ${L.itemName(nut)}...`);
    yield s.fadeOut(40);
    s.sfx('chocobo_tune');
    yield 60;
    const baby = L.breed(A, B, nut);
    A.readyAt = L.battles() + L.rnd(3, 10);
    B.readyAt = L.battles() + L.rnd(3, 10);
    yield s.fadeIn(40);
    yield s.msg('An egg was laid... and it hatched!');
    s.sfx('chocobo');
    if (baby.color !== 'yellow' && baby.color !== A.color && baby.color !== B.color) {
      s.music('success');
      const line = { blue: "Whoa! A BLUE chocobo! I bet this one can cross rivers!", green: "A GREEN chocobo?! It looks like it could climb right up a mountain!",
        black: "It's BLACK! Rivers AND mountains... this one can go almost anywhere!", gold: "G-GOLD?! Is this... the chocobo that can cross the ocean?!" }[baby.color];
      yield s.say(who, line);
      s.set('c12a_bred_' + baby.color);
    } else if (baby.color !== 'yellow') {
      yield s.say(who, `A ${baby.color} chocobo, just like its parent!`);
    }
    yield s.say(who, `It's a ${baby.sex}! ${L.RATING_LINE[baby.rating] || ''}`);
    yield* L.nameIt(s, who, baby);
    L.chocobos().push(baby);
    yield s.msg(`${baby.name} moved into the stable!`);
    s.music('farmboy');
  }

  // ------------------------------------------------------------------ riding / releasing
  function* rideMenu(s, who) {
    const i = yield* L.pickChocobo(s, who, 'Which chocobo will you ride?');
    if (i < 0) return false;
    const c = L.chocobos()[i];
    yield s.say(who, `${c.name}'s saddled up and waiting outside. It won't run off when you get down—it knows the way home.`);
    yield* L.ride(s, c);
    return true;
  }
  function* releaseMenu(s, who) {
    const i = yield* L.pickChocobo(s, who, 'Which chocobo will you let go?');
    if (i < 0) return;
    const c = L.chocobos()[i];
    const k = yield s.ask(who, `Really set ${c.name} free? You won't get it back.`, ["Yes, let it go", 'No']);
    if (k !== 0) return;
    L.chocobos().splice(i, 1);
    s.sfx('chocobo');
    yield s.say(who, `Take care, ${c.name}...`);
  }
  function* aboutMenu(s, who) {
    const k = yield s.ask(who, 'What do you want to know?', ['Feeding', 'Mating', 'The fence', 'Riding', 'Classes', 'Never mind']);
    if (k === 0) yield s.say(who, "Chocobos eat greens. Different greens build up different things—speed, stamina, smarts...\fEvery bird is born with its own limits, though. If its stats stop going up no matter what you feed it, it's as good as it'll get.");
    else if (k === 1) yield s.say(who, "A male and a female who get along can make an egg—but only if you feed them a nut.\fBabies take after their parents. And folks say that once in a while, a whole new kind of chocobo hatches...");
    else if (k === 2) yield s.say(who, "The birds you send us wait in the fence out front. It holds four. Send a fifth, and the first one goes back to the wild.\fAsk me to move them into your stables when you're here.");
    else if (k === 3) yield s.say(who, "Your own chocobos won't run away when you get off them. Ride one back onto the farm when you're done.");
    else if (k === 4) yield s.say(who, "Racing chocobos are ranked by class: C, B, A and S. Win at the Gold Saucer's Chocobo Square to move up.\fAnd I hear the better a chocobo does at the races, the better its babies turn out!");
  }

  // Billy's disc 2/3 services (also offered by the stable hand). other: Billy's own C5b menu.
  L.services = function* (s, who, other) {
    yield* L.deliverGold(s, who);
    if (!L.stables()) {
      yield s.say(who, "Want to raise chocobos of your own? Grandpa's renting out stables now. Go see him in the house!");
      if (other) yield* other(s);
      return;
    }
    for (let loop = 0; loop < 12; loop++) {
      const opts = ['Feed chocobos', 'Move chocobos', 'Mate chocobos', 'Ride a chocobo', 'Release a chocobo', 'About chocobos'];
      if (other) opts.push('Greens, Chocobo Lure...');
      opts.push('Nothing');
      const k = yield s.ask(who, `What can I do for you?\n(Stables ${L.chocobos().length}/${L.stables()}, fence ${L.pen().length}/4)`, opts, { cancel: opts.length - 1 });
      const o = opts[k];
      if (o === 'Feed chocobos') yield* feedMenu(s, who);
      else if (o === 'Move chocobos') yield* moveMenu(s, who);
      else if (o === 'Mate chocobos') yield* mateMenu(s, who);
      else if (o === 'Ride a chocobo') { if (yield* rideMenu(s, who)) return; }
      else if (o === 'Release a chocobo') yield* releaseMenu(s, who);
      else if (o === 'About chocobos') yield* aboutMenu(s, who);
      else if (o === 'Greens, Chocobo Lure...') { yield* other(s); return; }
      else { yield s.say(who, 'Come back anytime!'); return; }
    }
  };

  // Wrap C5b's Choco Billy: on disc 2/3 his menu becomes the raising menu (disc 1 unchanged).
  if (typeof FF7.story.c5b_billy === 'function' && !FF7.story.c5b_billy.c12a) {
    const base = FF7.story.c5b_billy;
    const wrapped = function* (s) {
      if (!late(s)) { yield* base(s); return; }
      yield* L.services(s, 'billy', base);
    };
    wrapped.c12a = true;
    FF7.story.c5b_billy = wrapped;
  }

  // ------------------------------------------------------------------ Choco Bill (disc 2/3)
  function* rent(s) {
    for (let i = 0; i < 6; i++) {
      if (L.stables() >= 6) { yield s.say('c12a_bill', "That's all six stables rented. Can't squeeze in another bird, I'm afraid."); return; }
      const k = yield s.ask('c12a_bill', `A stable is 10,000 gil. You're renting ${L.stables()} of 6 right now.`, ['Rent one (10,000 gil)', "Don't need it"]);
      if (k !== 0) return;
      if (!s.takeGil(10000)) { yield s.say('c12a_bill', "Hmm, you're a little short. Come back when you have 10,000 gil."); return; }
      s.sfx('purchase');
      V().c12a_stables = L.stables() + 1;
      yield s.say('c12a_bill', 'Thank you kindly.');
      if (L.stables() === 1) yield s.say('c12a_bill', "Now that you've got a stable, we'll keep up to four of the birds you catch in the fence out front.\fLater on you can pick which ones go in your stables. My grandson in the barn on the right looks after them—just tell him what you need.");
    }
  }
  function* billTalk(s) {
    if (!s.flag('c12a_bill_d2')) {
      s.set('c12a_bill_d2');
      yield s.say('c12a_bill', s.flag('meteor')
        ? "Have you seen that thing hanging in the sky? What's the world coming to...\fTimes like these, raising a chocobo does a body good. And I'm not just saying that for the money, mind you."
        : "Well, well, you're back! Things sure have been strange out in the world lately.\fTimes like these, raising a chocobo does a body good. And I'm not just saying that for the money, mind you.");
      yield s.say('c12a_bill', "As luck would have it, we aren't boarding anybody else's birds right now.\fI can look after six chocobos for you, 10,000 gil a stable. How about it?");
    }
    const k = yield s.ask('c12a_bill', 'What can I do for you?', ['Take care of my chocobos', 'Tell me something else', 'How do you raise them?', 'Rest for the night', 'Nothing']);
    if (k === 0) yield* rent(s);
    else if (k === 1) yield s.say('c12a_bill', "Somebody once told me there's a 'Chocobo Sage' living somewhere up north.\fThey say he knows how to raise the finest chocobos there are. If he's real, I'd love to meet him someday.");
    else if (k === 2) yield s.say('c12a_bill', "Chocobos aren't much trouble. We'll handle the day-to-day care here, but you buy their food and feed them yourselves.\fWhat you feed 'em changes how they grow. And if a male and a female take a shine to each other, they'll make an egg—so long as you give them a nut.\fThe little ones take after their parents. I've heard tell that sometimes a whole new breed hatches, with special abilities. Never seen it myself, though.");
    else if (k === 3) yield s.inn(100, { who: 'c12a_bill', text: "The spare beds are 100 gil a night. Want to turn in?" });
    else yield s.say('c12a_bill', 'Take it easy out there.');
  }

  // ------------------------------------------------------------------ Chole
  // The Chocobo Sage's clues as Chole writes them down (stage n = n memories heard, part3).
  L.CHOLE_NOTES = [
    "Besides regular chocobos, there are 'Mountain Chocobos' and 'River Chocobos'!",
    "To get a Mountain or River Chocobo, a 'Great' or 'Good' chocobo has to eat a 'Carob Nut' and lay an egg. We don't sell Carob Nuts, though...",
    "Great and Good chocobos can be caught near Corel and west of Corel, where the land's all green. Monsters south of the Sage's house carry Carob Nuts. Is Bone Village down that way?",
    "If a Mountain Chocobo and a River Chocobo have an egg, you get one that crosses mountains AND rivers! I bet the Carob Nut works for that, too.",
    "Big news: there might be a chocobo that can cross the OCEAN! Then there'd be nowhere you couldn't go!",
    "To get an Ocean Chocobo, the Mountain-and-River Chocobo has to mate with some other chocobo...",
    "Mate the Mountain-and-River Chocobo with a 'Wonderful Chocobo' and you get an Ocean Chocobo! But an ordinary nut won't do.",
    "The nut for an Ocean Chocobo is the 'Zeio Nut'. The goblins on a little island east of the Sage's house hoard them!\nAnd winning races helps: the higher their class, the better your chances.",
  ];
  function* choleTalk(s) {
    const learned = V().c12a_sage_stage || 0, told = V().c12a_chole_stage || 0;
    if (learned > told) {
      if (!told) {
        yield s.say('c12a_chole', "Hey, do you know about the Chocobo Sage?\f...What?! You actually MET him?! What did he say? Tell me, tell me!");
      } else yield s.say('c12a_chole', "Did the Chocobo Sage remember anything new? What did he say?");
      s.anim('player', 'point');
      yield 40;
      s.stopAnim('player');
      yield s.say('c12a_chole', "Wow, that's amazing! Hold on, let me write this down...");
      V().c12a_chole_stage = learned;
    }
    const opts = ["Chole's chocobo inspection"];
    if (V().c12a_chole_stage) opts.push("Chole's notes");
    opts.push('Nothing');
    const k = yield s.ask('c12a_chole', 'What is it?', opts);
    if (opts[k] === "Chole's chocobo inspection") {
      const list = L.chocobos();
      if (!list.length) { yield s.say('c12a_chole', "You don't have any chocobos in the stables yet! Catch one and I'll tell you all about it."); return; }
      const best = (f) => list.reduce((a, b) => (b[f] > a[f] ? b : a));
      yield s.say('c12a_chole', [
        `Let's see... ${best('speed').name} is the fastest!`,
        `${best('stamina').name} has the most stamina.`,
        `${best('intel').name} is the smartest one. It'll race well even when you let it run on its own.`,
        `And ${best('coop').name} likes you the most! Hee hee.`,
      ].join('\f'));
    } else if (opts[k] === "Chole's notes") {
      const n = Math.min(L.CHOLE_NOTES.length, V().c12a_chole_stage || 0);
      yield s.say('c12a_chole', L.CHOLE_NOTES.slice(0, n));
      if (n >= L.CHOLE_NOTES.length) yield s.say('c12a_chole', "According to my research, the special chocobos are really hard to get. But if you take good care of them and win lots of races, your chances go way up!");
    }
  }

  // ------------------------------------------------------------------ farm patches
  const PEN = [[20, 9], [24, 11], [27, 9], [29, 12]];
  const penTalk = (i) => function* (s) {
    const p = L.pen()[i];
    s.sfx('chocobo');
    if (!p) return;
    yield s.say('Chocobo', 'Kweh?');
    yield s.msg('A chocobo you caught. Choco Billy in the barn can move it into one of your stables.');
  };
  FF7.patchMap('farm_yard', {
    items: [{ at: [24, 15], materia: 'chocobo_lure', id: 'side_farm_lure2', if: s => s.flag('has_highwind') }],
    npcs: PEN.map((p, i) => ({ id: 'c12a_pen' + i, name: 'Chocobo', model: 'chocobo', at: p, dir: i % 2 ? 'left' : 'down', wander: 1,
      show: () => L.pen().length > i, talk: penTalk(i) })),
    onLoad: function (s) {
      // disc 2: Bill's own birds are gone; only the ones you catch wait in the fence
      if (s.flag('has_highwind')) ['pen1', 'pen2', 'pen3', 'pen4'].forEach(id => s.hide(id));
    },
  });
  FF7.patchMap('farm_house', {
    npcs: [{ id: 'c12a_bill', name: 'Choco Bill', model: 'oldman', at: [8, 3], dir: 'down', show: s => s.flag('has_highwind'), talk: billTalk }],
    onLoad: function (s) { if (s.flag('has_highwind')) s.hide('bill'); },
  });
  FF7.patchMap('farm_stable', {
    exits: [{ at: [20, 1, 1, 1], to: 'side_choco_stable', entry: 'from_stable', sfx: 'door', if: () => L.stables() > 0,
      blocked: function* (s) { yield s.msg('A back door marked "RENTAL STALLS — KEEP OUT".\nChoco Bill in the farmhouse handles the rentals.'); } }],
    npcs: [{ id: 'c12a_chole', name: 'Chole', model: 'girl2', at: [8, 4], dir: 'up', show: s => s.flag('has_highwind'), talk: choleTalk }],
    onLoad: function (s) { if (s.flag('has_highwind')) s.hide('chole'); },
  });

  // ------------------------------------------------------------------ the rental stalls
  const stallTalk = (i) => function* (s) {
    const c = L.chocobos()[i];
    if (!c) { yield s.msg(i < L.stables() ? 'An empty stall. Fresh straw, waiting for a chocobo.' : "This stall isn't rented."); return; }
    s.sfx('chocobo');
    yield s.msg(L.stats(c));
    const k = yield s.ask(null, `What will you do with ${c.name}?`, ['Feed it', 'Ride it', 'Nothing']);
    if (k === 0) yield* feedOne(s, null, c);
    else if (k === 1) yield* L.ride(s, c);
  };
  const STALLS = [0, 1, 2, 3, 4, 5];
  FF7.defineMap('side_choco_stable', {
    name: 'Chocobo Farm Stalls', area: 'Grasslands', theme: 'house', music: 'cinco_chocobo',
    look: { floor: ['#8a7048', '#826842'], wall: '#9a7a50', wallH: 2.6 },
    grid: [
      "#########################",
      "#,,,|,,,|,,,|,,,|,,,|,,,#",
      "#,,,|,,,|,,,|,,,|,,,|,,,#",
      "#===|===|===|===|===|===#",
      "#.......................#",
      "#.......................#",
      "#oB..................BB.#",
      "#.......................#",
      "#k...........j.......oo.#",
      "#.......................#",
      "###########++############",
    ],
    lights: [[6, 5, '#ffc070', 4], [18, 5, '#ffc070', 4]],
    entries: { from_stable: [11, 9, 'up'] },
    exits: [{ at: [11, 10, 2, 1], to: 'farm_stable', entry: 'from_yard', sfx: 'door' }],
    npcs: STALLS.map(i => ({ id: 'c12a_stall' + i, name: 'Chocobo', model: 'chocobo', at: [2 + 4 * i, 2], dir: 'down', show: () => !!L.chocobos()[i] })).concat([
      { id: 'c12a_hand', name: 'Stable Hand', model: 'worker3', at: [6, 7], dir: 'down',
        talk: function* (s) { yield* L.services(s, 'c12a_hand', null); } },
    ]),
    triggers: STALLS.map(i => ({ at: [1 + 4 * i, 3, 3, 1], on: 'talk', run: stallTalk(i) })),
    objects: [
      { at: [1, 8], talk: function* (s) {
        const list = L.chocobos();
        yield s.msg(list.length ? ['STABLE LEDGER'].concat(list.map(c => `${c.name}: ${c.color} ${c.sex}, ${L.RATING_NAME[c.rating]}, class ${c.class}, ${c.races} wins`)).join('\n') : 'STABLE LEDGER\n(no chocobos yet)');
      } },
    ],
    onLoad: function (s) {
      L.chocobos().forEach((c, i) => { if (i < 6 && c.color !== 'yellow') s.setModel('c12a_stall' + i, L.model(c.color)); });
    },
    onEnter: function* (s) {
      yield* L.deliverGold(s, 'c12a_hand');
      if (s.flag('c12a_stalls_seen')) return;
      s.set('c12a_stalls_seen');
      yield s.say('c12a_hand', "These are your stalls! Billy put me in charge of mucking them out. Talk to me if you need anything—or to the birds, if you just want to say hi.");
    },
  });
})();

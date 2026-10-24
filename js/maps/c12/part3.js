// Chapter 12a (part 3) — the Chocobo Sage and chocobo racing at the Gold Saucer.
//  * side_sage_house (world `chocobo_sage`): the forgetful Chocobo Sage (loft), his shop
//    (chocobo_sage_items), his eight memories about the special chocobos (a new one after 3-6
//    battles; Chole writes them down, see part2), and the Mountain Chocobo downstairs that gives
//    an Enemy Skill materia.
//  * Chocobo Square (gs_chocobo patch, disc 2/3): Ester registers your own chocobos for C/B/A/S
//    races (s.minigame('chocobo_race', { chocobo })), class promotion every 3 wins, prize board
//    (take the prize or trade it for GP), the 10-straight-S-wins reward; a bookmaker for A/S bets.
// Flags: c12a_sage_named, c12a_sage_eskill, c12a_ester_d2, c12a_joe_record.
// Vars: c12a_sage_stage (memories told, 0-8), c12a_sage_next (battle count), c12a_s_streak.
(function () {
  const L = FF7.story.c12aLib;
  const V = () => FF7.state.vars;

  // ================================================================== Chocobo Sage
  FF7.world.link('chocobo_sage', { map: 'side_sage_house', entry: 'from_world' });
  const SAGE = { base: 'oldman', skin: '#7aa0d8', hair: '#e8e8f4', hairStyle: 'cap', top: '#3a5aa8', sleeve: '#3a5aa8', bottom: '#2a4a90', extras: ['beard', 'robe'] };
  const GREEN = { base: 'chocobo', c1: '#6ac050', c2: '#3a8a30', c3: '#f0a040' };
  const FORGET = [
    "Hmm? What was I just about to say...?\fCan't remember for the life of me.",
    "Now, where was I... Oh, it's right on the tip of my tongue!\f...And now it's gone.",
    "Let me think... I had it a moment ago... Come back a little later, eh? Something'll come to me.",
  ];
  // The Sage's memories: [his words, extra exchange]
  const MEMORIES = [
    function* (s) {
      yield s.say('sage', "I remember now! That one downstairs is what they call a...\fMountain Chocobo! Just like the name says, it can cross any mountain.\fAnd there was another kind that could cross rivers. A 'River Chocobo', they called it.");
      yield s.say('cloud', 'Where can we catch one?');
      yield s.say('sage', "Oh, you won't find any of those around these days.");
      yield s.say('cloud', "......Isn't that one right there?");
      yield s.say('sage', "Eh? What's it doing there?\f...Can't remember for the life of me.");
    },
    function* (s) {
      yield s.say('sage', "Oh, yes, yes! That chocobo was bred from a 'Great Chocobo' and a 'Good Chocobo'.\fGive them a 'Carob Nut' when they mate, and there's a chance you'll get one like it.");
      yield s.say('cloud', 'Where do we find these Carob Nuts?');
      yield s.say('sage', "Where? Hmm... where was that?\fAnd what was that nut called again...? Can't remember for the life of me.");
    },
    function* (s) {
      yield s.say('sage', "Aha! Those chocobos... you can catch them near a place called Corel, where the land is green.\fAnd just west of Corel, too. And Carob Nuts... some monsters just south of here used to carry them around. Or maybe...\f............Funny. What was I saying just now?");
    },
    function* (s) {
      yield s.say('sage', "Oh, right! About the Mountain Chocobo and the River Chocobo...\fMate those two together, and you get one that can cross rivers AND mountains!\fAnd... and also... uh, what was I saying?");
    },
    function* (s) {
      yield s.say('sage', "Oh, yes! And there's one that can cross the ocean, too!");
      yield s.say('cloud', "You probably don't remember, but... how do we get one of those?");
      yield s.say('sage', "Don't tease an old man! To get an ocean-crossing chocobo, you just...\f...Nope. Gone. Don't remember a thing.");
    },
    function* (s) {
      yield s.say('sage', "I remember! The Ocean Chocobo is... The Mountain-and-River Chocobo is... is...\fOh, what was I saying? Don't remember a thing.");
    },
    function* (s) {
      yield s.say('sage', "Right, right! You take the Mountain-and-River Chocobo...\fand mate it with a 'Wonderful Chocobo'. You can catch those right around here, you know. And then you get...\fCan't remember for the life of me...");
    },
    function* (s) {
      yield s.say('sage', "Oh! You'll need a... Zeio Nut! Now where did one find those things...?\fAh! The goblins! Goblins adore Zeio Nuts. There's a small island east of here, just crawling with the little fellows.");
      yield s.say('cloud', 'You remembered something.');
      yield s.say('sage', "Oh!\f......That's it...");
    },
  ];
  function* remember(s) {
    const v = V(), stage = v.c12a_sage_stage || 0;
    if (stage >= MEMORIES.length) { yield s.say('sage', "I think... that's about all I'm going to remember."); return; }
    if (!v.c12a_sage_next) {
      yield s.say('sage', "That chocobo? Well, that one is...\fLet's see now... I don't quite remember...");
      v.c12a_sage_next = L.battles() + L.rnd(3, 6);
      return;
    }
    if (L.battles() < v.c12a_sage_next) { yield s.say('sage', L.pick(FORGET)); return; }
    yield* MEMORIES[stage](s);
    v.c12a_sage_stage = stage + 1;
    v.c12a_sage_next = L.battles() + L.rnd(3, 6);
    if (v.c12a_sage_stage === 1) yield s.say('cloud', '(Chole at the Chocobo Farm would want to hear about this.)');
  }
  function* sageTalk(s) {
    if (!s.flag('c12a_sage_named')) {
      yield s.say('sage_unknown', "Oh ho! Visitors, way out here? Well, that's a rarity.\fI can't recall how many years it's been since the last one came by.");
      yield s.say('cloud', 'Who are you?');
      yield s.say('sage_unknown', "Me? I'm......\f......I don't know.");
      yield s.say('cloud', "You don't know who you are?");
      yield s.say('sage_unknown', "Haven't thought about it in ages... What did they used to call me...?\fOh, that's it! The 'Chocobo Sage'! That's right, that's what they called me! The Chocobo Sage!!");
      yield s.say('cloud', '(How do you forget a name like that...?)');
      s.set('c12a_sage_named');
      s.hide('sage_unknown');
      s.show('sage');
    }
    const k = yield s.ask('sage', 'Now then, what can I do for you?', ['Sell me something', (V().c12a_sage_stage || V().c12a_sage_next) ? 'Remember anything?' : 'What about that chocobo?', 'Nothing']);
    if (k === 0) { yield s.say('sage', "My greens are the finest there are. The chocobos say so themselves!"); yield s.shop('chocobo_sage_items'); }
    else if (k === 1) yield* remember(s);
    else yield s.say('sage', "Come back anytime. I may even remember you!");
  }
  FF7.defineMap('side_sage_house', {
    name: "Chocobo Sage's House", area: 'Northern Continent', theme: 'house', music: 'waltz_chocobo',
    look: { floor: ['#8a6a44', '#82623e'], floor3: ['#5a3a6a', '#523464'], wall: '#a89070' },
    grid: [
      "########################",
      "#kq.F....^^___________k#",
      "#........^^_____t_____k#",
      "#.........#___________q#",
      "#.........#___b_______.#",
      "#.........#============#",
      "#......................#",
      "#..ctc.................#",
      "#......................#",
      "#...........=======....#",
      "#.j.........=,,,,,=....#",
      "#...........=,,,,,=..o.#",
      "#......................#",
      "##########++############",
    ],
    heights: [
      "000000000000000000000000",
      "000000000224444444444444",
      "000000000224444444444444",
      "000000000044444444444444",
      "000000000044444444444444",
      "000000000044444444444444",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
      "000000000000000000000000",
    ],
    lights: [[4, 2, '#ff9040', 3], [16, 3, '#a0c0ff', 4]],
    entries: { from_world: [10, 12, 'up'] },
    exits: [{ at: [10, 13, 2, 1], to: 'world', loc: 'chocobo_sage' }],
    npcs: [
      { id: 'sage_unknown', name: '???', model: SAGE, at: [16, 3], dir: 'down', show: s => !s.flag('c12a_sage_named'), talk: sageTalk },
      { id: 'sage', name: 'Chocobo Sage', model: SAGE, at: [16, 3], dir: 'down', show: s => s.flag('c12a_sage_named'), talk: sageTalk },
      { id: 'sage_choco', name: 'Chocobo', model: GREEN, at: [15, 11], dir: 'down',
        talk: function* (s) {
          s.sfx('chocobo');
          yield s.say('Chocobo', 'Kweh! Kweh!');
          if (s.flag('c12a_sage_eskill')) { yield s.msg('The green chocobo nuzzles your hand.'); return; }
          s.set('c12a_sage_eskill');
          yield s.msg('The chocobo pecked at the straw and nudged something shiny toward you...');
          yield s.giveMateria('enemy_skill');
        } },
    ],
    objects: [
      { at: [2, 1], talk: function* (s) { yield s.msg('"The Care and Feeding of Chocobos, Vol. 12"\nThe margins are full of notes, most of them crossed out.'); } },
      { at: [22, 2], talk: function* (s) { yield s.msg('Shelves of books on chocobos. Several copies of the same book—bought again and again, it seems.'); } },
    ],
  });

  // ================================================================== Chocobo Square: racing
  const ESTER = { base: 'woman', top: '#f0a030', sleeve: '#f0a030', bottom: '#503020', hair: '#c03020', hairStyle: 'ponytail', skirt: 'short' };
  const JOE_CHANCE = { C: 0, B: 1 / 8, A: 1 / 4, S: 1 / 2 };
  const JOE_SET = ['sprint_shoes', 'precious_watch', 'cats_bell', 'chocobracelet', 'm:counter_attack'];
  function* prize(s, who, board) {
    const p = L.weighted(board);
    s.sfx('ching');
    const k = yield s.ask(who, `Your prize is: ${L.itemName(p.id)}!`, [`Take the ${L.itemName(p.id)}`, `Trade it for ${p.gp} GP`]);
    if (k === 0) yield* L.give(s, p.id);
    else { s.giveGp(p.gp); s.sfx('found'); yield s.msg(`Received ${p.gp} GP!`); }
  }
  function* race(s) {
    const list = L.chocobos();
    if (!list.length) { yield s.say('c12a_ester', "You don't have a chocobo of your own yet! The folks at the Chocobo Farm can help you with that."); return; }
    const i = yield* L.pickChocobo(s, 'c12a_ester', 'Which chocobo will you race?');
    if (i < 0) return;
    const c = list[i];
    const course = (yield s.ask('c12a_ester', 'Which course?', ['Short course', 'Long course'])) === 1 ? 'long' : 'short';
    const cls = c.class;
    const board = L.raceBoard(cls);
    yield s.say('c12a_ester', `${c.name} is entered in the ${cls}-class race on the ${course} course!\fToday's prizes: ${board.map(p => L.itemName(p.id)).join(', ')}.`);
    const joe = Math.random() < (JOE_CHANCE[cls] || 0);
    if (joe) yield s.say('c12a_ester', "Uh-oh... Joe's in this race with his black chocobo, Teioh. He's the one to beat!");
    // (the record's `run` counts races run; the race reads `run` as the bird's cruising speed: not passed on)
    const r = yield s.minigame('chocobo_race', { chocobo: Object.assign({}, c, { run: 0 }), class: cls, course, joe, prizes: board.map(p => p.id) });
    c.run = (c.run || 0) + 1;
    const place = L.racePlace(r);
    if (!L.raceWon(r)) {
      if (cls === 'S') V().c12a_s_streak = 0;
      s.music('tango');
      yield s.say('c12a_ester', `${c.name} finished in place No.${place}... Don't give up! Feed it well and try again!`);
      s.music('fiddle');
      return;
    }
    s.music('success');
    c.races = (c.races || 0) + 1;
    yield s.say('c12a_ester', `${c.name} WINS! That's ${c.races} win${c.races === 1 ? '' : 's'} so far!`);
    yield* prize(s, 'c12a_ester', board);
    const nc = L.classOf(c.races);
    if (nc !== cls) { c.class = nc; s.sfx('levelup'); yield s.say('c12a_ester', `Congratulations! ${c.name} has been promoted to ${nc} class!`); }
    if (cls === 'S') {
      V().c12a_s_streak = (V().c12a_s_streak || 0) + 1;
      if (V().c12a_s_streak >= 10 && !s.flag('c12a_joe_record')) {
        s.set('c12a_joe_record');
        yield s.say('c12a_ester', "Ten S-class wins in a row?! That breaks Joe's record! You're the best jockey the Gold Saucer has ever seen!\fThe owner wants you to have these!");
        for (const id of JOE_SET) yield* L.give(s, id);
      }
    }
    s.music('fiddle');
  }
  function* esterTalk(s) {
    if (!s.flag('c12a_ester_d2')) {
      s.set('c12a_ester_d2');
      yield s.say('c12a_ester', `${s.name('cloud')}! My star jockey, back at last!\fRaised a chocobo of your own yet? Register it with me and it can race here any time. Win enough and it moves up a class: C, B, A, then S!`);
    }
    for (let n = 0; n < 6; n++) {
      const k = yield s.ask('c12a_ester', 'What would you like to do?', ['Race!', 'Teach me how to race', 'Nothing']);
      if (k === 0) { yield* race(s); return; }
      if (k === 1) {
        yield s.say('c12a_ester', "Your chocobo runs on its own at first. Switch to manual control and you steer it yourself.\fSpeed up and it burns stamina; slow down and it gets some back. Sprinting eats stamina fast, so save it for the finish!\fGreen chocobos aren't slowed in the space section of the short course, blue ones sail through the water on the long course, and black and gold ones don't care about either.");
        continue;
      }
      yield s.say('c12a_ester', 'See you at the track!');
      return;
    }
  }

  // ------------------------------------------------------------------ A / S class betting
  const RACERS = ['No.1', 'No.2', 'No.3', 'No.4', 'No.5', 'No.6'];
  function* bookie(s) {
    const owned = L.chocobos().map(c => c.class);
    const classes = ['A', 'S'].filter(k => owned.includes(k) || (k === 'A' && owned.includes('S')));
    if (!classes.length) { yield s.say('c12a_bookie', "A and S class races are for owners only, friend. Get yourself a chocobo that races at that level and come back."); return; }
    const c = yield s.ask('c12a_bookie', `High-stakes betting! One ticket is 10 GP. (You have ${s.gp()} GP.)`, classes.map(k => `${k} Class race`).concat(['No thanks']));
    if (c >= classes.length) return;
    const cls = classes[c];
    if (!s.takeGp(10)) { yield s.say('c12a_bookie', "You need 10 GP for a ticket."); return; }
    const board = L.raceBoard(cls);
    yield s.say('c12a_bookie', `Prizes this race: ${board.map(p => L.itemName(p.id)).join(', ')}. Pick the two chocobos you think will finish 1st and 2nd—in any order.`);
    const a = yield s.ask('c12a_bookie', 'First pick?', RACERS);
    const rest = RACERS.filter((x, i) => i !== a);
    const b0 = yield s.ask('c12a_bookie', 'Second pick?', rest);
    const b = RACERS.indexOf(rest[b0] || rest[0]);
    s.music('racing');
    yield s.caption("And they're off!", { hold: 90, bg: 'rgba(0,0,0,0.6)' });
    const order = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    yield s.msg(`1st: ${RACERS[order[0]]}   2nd: ${RACERS[order[1]]}`);
    s.music('fiddle');
    const hit = (order[0] === a && order[1] === b) || (order[0] === b && order[1] === a);
    if (!hit) { yield s.say('c12a_bookie', 'Tough luck. The track giveth, the track taketh away.'); return; }
    yield s.say('c12a_bookie', 'A winning ticket! Nicely done!');
    yield* prize(s, 'c12a_bookie', board);
  }

  FF7.patchMap('gs_chocobo', {
    npcs: [
      { id: 'c12a_ester', name: 'Ester', model: ESTER, at: [22, 8], dir: 'left', show: s => L.late(s), talk: esterTalk },
      { id: 'c12a_bookie', name: 'Bookmaker', model: { base: 'man', top: '#303040', sleeve: '#303040', bottom: '#202028', extras: ['vest', 'bowtie', 'glasses'] }, at: [7, 7], dir: 'down',
        show: s => L.late(s), talk: bookie },
    ],
    onLoad: function (s) { if (L.late(s)) s.hide('ester_gs'); },
  });
})();

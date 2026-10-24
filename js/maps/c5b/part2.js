// Chapter 5b (part 2) — Fort Condor and Lower Junon.
// Fort Condor: the gate guard, the old man at the table, the battle map (s.minigame('fort_condor'))
// with FF7's schedule of Shinra attacks, prize order, 4000 Gil minimum, "let them handle it",
// donations and CMD. Grand Horn when the enemy reaches the shack; the shops and a bed; the condor.
// Lower Junon: the fishing village under the Shinra city, Priscilla and Mr. Dolphin, Bottomswell on
// the beach, CPR, the night at the old woman's house (Cloud's dream), Tifa by the sea, Shiva from
// Priscilla, the dolphin whistle, Barret takes the PHS, and Mr. Dolphin's leap up to the tower.
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
  // Minigame results may be true/false, 'win'/'lose' or { win, spent, ... }.
  // Minigame results are objects { won, score, ... } (older stubs may return true / 'win').
  const ok = (r) => r === true || r === 'win' || !!(r && typeof r === 'object' && (r.won || r.win));
  const counter = (at, run) => ({ at, on: 'talk', run });
  // Unconditional links = fallbacks: later chapters (Disc 2 Junon / Fort Condor) override them with
  // conditional links.
  FF7.world.link('fort_condor', { map: 'condor_base', entry: 'from_world' });
  FF7.world.link('junon', { map: 'junon_lower', entry: 'from_world' });

  // ================================================================== FORT CONDOR
  // FF7 prize order: each battle won hands out the next prize in this list, so a skipped battle
  // gives the previous one's prize next time (as in FF7).
  const CONDOR_PRIZES = [
    ['magic_comb', 1], ['peace_ring', 1], ['ether', 3], ['megalixir', 1], ['hi_potion', 5], ['hi_potion', 5],
    ['superball', 1], ['turbo_ether', 3], ['turbo_ether', 3], ['x_potion', 5], ['x_potion', 5], ['x_potion', 5],
  ];
  // Which Shinra attack is under way (FF7 battle number), or 0 when the front is quiet.
  // Battles 1-3 follow this chapter exactly; later Disc 1 windows use the shared story flags.
  function condorBattle(s) {
    if (s.flag('disc2')) return 0;
    if (s.flag('c5b_dolphin_jump')) {
      if (s.flag('aeris_dead')) return 12;
      if (s.flag('c8_keystone_got') || s.flag('keystone')) return 9;
      if (s.flag('has_bronco')) return 8;
      if (s.flag('has_buggy')) return 4;
      return 0;
    }
    if (s.flag('c5b_in_water')) return 3;         // in the water with Mr. Dolphin, before the whistle
    if (s.flag('c5b_shiva')) return 0;
    if (s.flag('c5b_junon_slept')) return 2;      // after the night in Junon, before Shiva
    return 1;                                     // first visit, before resting in Junon
  }
  const condorUnderAttack = (s) => { const n = condorBattle(s); return n > 0 && !s.flag('c5b_condor_w' + n); };

  FF7.defineMap('condor_base', {
    name: 'Fort Condor', area: 'Junon Area', theme: 'canyon', music: 'condor',
    look: { wallH: 3.2 },
    grid: [
      "##########XXXXXX##########",
      "#########PXXXXXXP#########",
      "#######hhhhhh+hhhhh#######",
      "######R.....:::.....R#####",
      "#####R......:::......R####",
      "####R.......:::...o...R###",
      "###R..B.....:::........R##",
      "###.........:::.........##",
      "##R.........:::.....R....#",
      "##..........:::..........#",
      "#R...R......:::......RR..#",
      "#...........:::..........#",
      "##..R.......:::........R##",
      "###.........:::.........##",
      "####........:::........###",
      "#####.......:::.......####",
      "######......:::......#####",
      "######......:::......#####",
    ],
    entries: { from_world: [13, 15, 'up'], from_fort: [13, 4, 'down'] },
    exits: [
      { at: [13, 2, 1, 1], to: 'condor_hall', entry: 'from_base', sfx: 'door', if: s => s.flag('c5b_condor_gate'),
        blocked: function* (s) { yield s.msg('The guard is blocking the door.'); } },
      { at: [6, 17, 15, 1], to: 'world', loc: 'fort_condor' },
    ],
    npcs: [
      { id: 'gate_guard', name: 'Guard', model: { base: 'man', top: '#6a5a3a', sleeve: '#6a5a3a', bottom: '#4a4030', hairStyle: 'cap' }, at: [13, 3], dir: 'down',
        show: s => !s.flag('c5b_condor_gate'),
        talk: function* (s) {
          yield s.say('Guard', "Halt! This is Fort Condor. State your business!");
          const c = yield s.ask('cloud', '', ["We're here to help.", 'Just passing through.']);
          if (c !== 0) { yield s.say('Guard', "Then keep moving. We've got enough trouble with Shinra breathing down our necks."); return; }
          yield s.say('Guard', "Help? ...You're not with Shinra? Well, we sure could use the hands.\fGo on up. The old man at the table will fill you in.");
          s.set('c5b_condor_gate');
          yield s.move('gate_guard', 15, 3);
          yield s.face('gate_guard', 'down');
        } },
      { id: 'gate_guard2', name: 'Guard', model: { base: 'man', top: '#6a5a3a', sleeve: '#6a5a3a', bottom: '#4a4030', hairStyle: 'cap' }, at: [15, 3], dir: 'down',
        show: s => s.flag('c5b_condor_gate'),
        talk: function* (s) { yield s.say('Guard', condorUnderAttack(s) ? "Shinra's on the move again! Hurry inside!" : "The condor's still up there. As long as she's safe, so are we."); } },
      { id: 'lookout', name: 'Lookout', model: 'man6', at: [19, 9], dir: 'down', wander: 1,
        talk: function* (s) { yield s.say('Lookout', "Shinra troops march up from the valley every so often. From up here we can see 'em coming a mile off."); } },
    ],
  });

  FF7.defineMap('condor_hall', {
    name: 'Fort Condor', area: 'Junon Area', theme: 'house', music: 'condor',
    look: { wall: '#7a6858', trim: '#4a3a2a', floor: ['#6a5a48', '#625242'], wallH: 2.6 },
    grid: [
      "############################",
      "#wwwwww#####H###############",
      "#..........................#",
      "#..M.......................#",
      "#..........................#",
      "#======^^=================##",
      "#..........................#",
      "#.......................D.k#",
      "#...........ttt.........D.k#",
      "#...........c.c............#",
      "#..........................#",
      "#.b.....................D.q#",
      "#.......................D.q#",
      "#.b........................#",
      "#..........................#",
      "#############+##############",
    ],
    heights: [
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555555555555555555555555",
      "5555555335555555555555555555",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
    ],
    lights: [[13, 8, '#ffc070', 3], [3, 2, '#ffe0b0', 3]],
    entries: { from_base: [13, 14, 'up'], from_roof: [12, 2, 'down'] },
    exits: [
      { at: [13, 15, 1, 1], to: 'condor_base', entry: 'from_fort', sfx: 'door' },
      { at: [12, 1, 1, 1], to: 'condor_roof', entry: 'from_hall' },
    ],
    npcs: [
      { id: 'elder', name: 'Old Man', model: 'oldman3', at: [13, 7], dir: 'down', talk: function* (s) { yield* FF7.story.c5b_condorElder(s); } },
      { id: 'tactician', name: 'Commander', model: { base: 'man', top: '#5a6a3a', sleeve: '#5a6a3a', bottom: '#3a4030', hairStyle: 'short', extras: ['mustache'] }, at: [4, 2], dir: 'up',
        talk: function* (s) { yield* FF7.story.c5b_condorWar(s); } },
      { id: 'c_itemkeep', name: 'Shopkeeper', model: 'man7', at: [25, 7], dir: 'left' },
      { id: 'c_matkeep', name: 'Shopkeeper', model: 'woman3', at: [25, 11], dir: 'left' },
      { id: 'c_nurse', name: 'Woman', model: 'woman5', at: [4, 12], dir: 'right',
        talk: function* (s) {
          if (!s.flag('c5b_condor_joined')) { yield s.say('Woman', "These beds are for the fighters of the fort. Sorry, stranger."); return; }
          yield s.inn(0, { who: 'Woman', text: "You look tired. Friends of the fort can rest here for free. Lie down for a while?" });
        } },
      { id: 'c_fighter', name: 'Fighter', model: 'man4', at: [20, 13], dir: 'left', anim: 'sit',
        talk: function* (s) { yield s.say('Fighter', "Whew... Every time Shinra comes up that slope we lose a few more good people.\fStill, nobody's touching that egg while I'm breathing."); } },
      { id: 'c_kid', name: 'Boy', model: 'kid5', at: [9, 11], dir: 'up', wander: 2,
        talk: function* (s) { yield s.say('Boy', "The condor's gonna have a baby! When it hatches, I'm gonna be the first to see it!"); } },
    ],
    triggers: [
      counter([24, 7, 1, 2], function* (s) {
        yield s.say('c_itemkeep', "Supplies for the defenders. Take a look.");
        yield s.shop(s.flag('disc2') ? 'fort_condor_items_d2' : 'fort_condor_items');
      }),
      counter([24, 11, 1, 2], function* (s) {
        yield s.say('c_matkeep', "Materia helps our fighters hold the line. Need any?");
        yield s.shop(s.flag('disc2') ? 'fort_condor_materia_d2' : 'fort_condor_materia');
      }),
      { at: [1, 1, 6, 1], on: 'talk', run: function* (s) { yield s.msg('Through the windows, the whole mountainside lies below: the path Shinra\'s soldiers must climb to reach the fort.'); } },
    ],
  });

  FF7.story.c5b_condorElder = function* (s) {
    if (!s.flag('c5b_condor_joined')) {
      // FF7 date points, each question the first time it is asked: interest Barret +5, Aeris +3, Tifa +3,
      // Yuffie +2; refusal Barret -5, Aeris -3, Tifa -3, Yuffie -1
      const YES = { barret: 5, aeris: 3, tifa: 3, yuffie: 2 }, NO = { barret: -5, aeris: -3, tifa: -3, yuffie: -1 };
      yield s.say('elder', "Travelers, hm? Welcome to Fort Condor. Such as it is.");
      if (!s.flag('c5b_condor_q1')) {
        const DP = [YES, NO];
        const a = yield s.ask('elder', "You look like you've seen some trouble on the road. Care to hear about ours?", ['Sure, go ahead.', "Can't say I am."], { date: DP });
        s.set('c5b_condor_q1');
        FF7.story.datePts(s, DP[a]);
        if (a !== 0) yield s.say('elder', "Hmph. Young folk... Well, humor an old man anyway.");
      }
      yield s.say('elder', "Up on top of this old reactor, a great condor has made her nest. She's been warming an egg for a long while now.\fShinra wants the reactor running again, so they keep sending soldiers to drive her away.");
      yield s.say('elder', "We've been holding them back on our own... but we're farmers and old men, not an army.\fWill you lend us your strength?");
      const DP2 = s.flag('c5b_condor_q2') ? [{}, {}] : [YES, NO];
      // (dateSoft: turning him down puts off the fort's battles, so the runner only weighs the closest rival)
      const c = yield s.ask('elder', '', ['We\'ll help.', 'Sorry, we can\'t.'], { date: DP2, dateSoft: true });
      s.set('c5b_condor_q2');
      FF7.story.datePts(s, DP2[c]);
      if (c !== 0) { yield s.say('elder', "I see... Well, if you change your mind, we'll be here. We haven't anywhere else to go."); return; }
      s.set('c5b_condor_joined');
      if (s.inParty('barret')) yield s.say('barret', "Anybody fightin' Shinra's a friend of mine! Count us in!");
      yield s.say('elder', "Bless you! When Shinra attacks, speak to the commander by the battle map upstairs.\fOur shops and beds are yours to use, too.");
      return;
    }
    if (condorUnderAttack(s)) { yield s.say('elder', "Shinra's attacking again! Please, go upstairs to the commander!"); return; }
    yield s.say('elder', "Thanks to you, the egg is safe for now. That condor and her little one... they're all we have to believe in.");
  };

  FF7.story.c5b_condorWar = function* (s) {
    if (!s.flag('c5b_condor_joined')) { yield s.say('tactician', "Who let you in? ...Talk to the old man at the table first."); return; }
    if (!s.flag('c5b_condor_fund')) { s.set('c5b_condor_fund'); s.setVar('c5b_condor_funds', 10000); }
    const n = condorBattle(s);
    const attack = condorUnderAttack(s);
    if (!attack) {
      yield s.say('tactician', "Shinra's pulled back for now. They'll be back, though. They always come back.");
      const c = yield s.ask('tactician', "Anything else?", ['About the troops', 'Contribute funds', 'Nothing']);
      if (c === 0) yield* FF7.story.c5b_condorTroops(s);
      else if (c === 1) yield* FF7.story.c5b_condorDonate(s);
      return;
    }
    s.sfx('alarm_short');
    yield s.say('tactician', "Shinra's on the move! Their troops are climbing the mountain right now!");
    const c = yield s.ask('tactician', "What do we do?", ["Okay, I'm ready!", 'About the troops', 'Contribute funds', 'Let them handle it', 'Not yet']);
    if (c === 1) { yield* FF7.story.c5b_condorTroops(s); return; }
    if (c === 2) { yield* FF7.story.c5b_condorDonate(s); return; }
    if (c === 3) {
      if (s.get('c5b_condor_funds') < 3000) { yield s.say('tactician', "We don't have the funds to fight this one alone! We need you out there!"); return; }
      s.setVar('c5b_condor_funds', s.get('c5b_condor_funds') - 3000);
      s.set('c5b_condor_w' + n);
      yield s.say('tactician', "...All right. We'll hold them off on our own.");
      yield s.fadeOut(20); yield 40; yield s.fadeIn(20);
      yield s.say('tactician', "We drove them back... but it cost us. 3000 Gil of the fort's funds, gone.");
      return;
    }
    if (c !== 0) { yield s.say('tactician', "Don't take too long. They won't wait for us!"); return; }
    if (s.gil() < 4000) { yield s.say('tactician', "You'll need at least 4000 Gil to hire troops. The fort can't pay them for you."); return; }
    yield s.say('tactician', "Hire soldiers with your Gil and place them on the slope. Wipe out the enemy before they reach the fort!\fIf any of them break through to the shack, you'll have to deal with their commander yourselves.");
    const r = yield s.minigame('fort_condor', { battle: n, gil: s.gil() });
    // troops are hired with the player's Gil: the minigame reports what it spent (net of refunds)
    const spent = r && typeof r === 'object' && typeof r.spent === 'number' ? r.spent : 0;
    if (spent > 0) s.takeGil(Math.min(spent, s.gil()));
    s.set('c5b_condor_w' + n);
    if (ok(r)) {
      s.music('condor');
      yield s.say('tactician', "They're retreating! We won! The egg is safe!");
      const idx = s.get('c5b_condor_prize');
      const p = CONDOR_PRIZES[Math.min(idx, CONDOR_PRIZES.length - 1)];
      s.setVar('c5b_condor_prize', idx + 1);
      yield s.say('tactician', "Here—it isn't much, but take this with our thanks.");
      yield s.give(p[0], p[1]);
      return;
    }
    // the enemy reached the shack: fight their commander
    s.sfx('alarm');
    yield s.say('tactician', "They've broken through to the shack! Their commander's in there—go!");
    const b = yield s.battle({ table: n <= 3 ? 'boss_cmdgrand_horn' : 'boss_cmdgrand_horn_b', bg: 'condor', music: 'boss', noEscape: true, canLose: true });
    s.music('condor');
    if (b === 'win') {
      yield s.say('tactician', "You took down their commander! The rest of them turned tail!\f...We didn't exactly win the field, though. Nothing to hand out this time, I'm afraid.");
    } else {
      s.heal();
      s.setVar('c5b_condor_funds', Math.max(0, s.get('c5b_condor_funds') - 3000));
      yield s.say('tactician', "We pulled you out of there just in time... They made off with our supplies, but the condor's safe. Barely.");
    }
  };

  FF7.story.c5b_condorTroops = function* (s) {
    yield s.say('tactician', "You pay for the troops you hire. Each has its strengths:\fFighter, 400 Gil. Nothing special, nothing weak.\nAttacker, 420. Tears through beasts, but barbarians eat them alive.\nDefender, 440. Holds off barbarians, easy prey for wyverns.");
    yield s.say('tactician', "Shooter, 520. Hits wyverns from range, crumbles against beasts.\nRepairer, 480. Patches up troops between fights.\nWorker, 400. Lays bombs.\nStoner and Catapult, 480 each. They fire from a fixed spot.");
    yield s.say('tactician', "Their commander always comes last, and he's tough. Send your best at him all at once.\fAnd keep at least 4000 Gil on hand, or you can't take the field at all.");
  };

  FF7.story.c5b_condorDonate = function* (s) {
    yield s.say('tactician', `The fort's war chest holds ${s.get('c5b_condor_funds')} Gil. Every raid we can't stop costs us 3000.`);
    const c = yield s.ask('tactician', "Would you contribute?", ['1000 Gil', '5000 Gil', '10000 Gil', 'Not now']);
    const amt = [1000, 5000, 10000][c];
    if (!amt) return;
    if (!s.takeGil(amt)) { yield s.say('tactician', "You don't have that much, friend."); return; }
    s.sfx('purchase');
    s.setVar('c5b_condor_funds', s.get('c5b_condor_funds') + amt);
    yield s.say('tactician', "You have our gratitude. That'll keep us fighting a while longer.");
  };

  FF7.defineMap('condor_roof', {
    name: 'Fort Condor Summit', area: 'Junon Area', theme: 'canyon', music: 'condor',
    look: { sky: ['#6a98d0', '#f0d8a8'] },
    grid: [
      "                      ",
      " ==================== ",
      " =..................= ",
      " =.......xxxx.......= ",
      " =......xx..xx......= ",
      " =.......xxxx.......= ",
      " =..................= ",
      " =..PP..........PP..= ",
      " =..................= ",
      " =........E.........= ",
      " ==================== ",
      "                      ",
    ],
    entries: { from_hall: [10, 8, 'up'] },
    exits: [{ at: [10, 9, 1, 1], to: 'condor_hall', entry: 'from_roof' }],
    npcs: [
      { id: 'condor', name: 'Condor', model: { enemy: 'zuu', scale: 1.9 }, at: [10, 4], dir: 'down', faceOnTalk: false },
      { id: 'roof_guard', name: 'Watchman', model: 'man8', at: [16, 8], dir: 'left',
        talk: function* (s) { yield s.say('Watchman', "Easy, now. Don't get too close—she doesn't trust anyone near her egg. Can't blame her, with Shinra around."); } },
    ],
    triggers: [
      { at: [8, 3, 6, 3], on: 'talk', run: function* (s) {
          yield s.msg('The enormous condor spreads its wings over the nest, watching you with one sharp eye.\fBeneath it, a huge egg rests in a bed of twigs and scrap wire.');
        } },
    ],
  });

  // ================================================================== LOWER JUNON
  FF7.defineMap('junon_lower', {
    name: 'Junon', area: 'Junon', theme: 'town', music: 'anxious',
    look: { sky: ['#2a3a50', '#6a7a90'], ambient: [0.4, 0.42, 0.46], light: [0.68, 0.68, 0.72], wall: '#8a8478', floor: ['#7a7468', '#747062'], fog: { color: [0.3, 0.34, 0.4], near: 12, far: 30 } },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XhhhhhhhhRRRRRhhhhhhhhBoBhhhhhhhhhhX",
      "XhhhhhhhhRRRRRhhhhhhhh..BhhhhhhhhhhX",
      "Xhhhh+hhhRRRRRhhh+hhhh...hhhhEEhhhhX",
      "X...........=......................X",
      "X.f.........=..........l...........X",
      "X...........=......................X",
      "X========^^==......................X",
      "X..................................X",
      "X....o..............................",
      "X..........................DD.......",
      "X...%...............................",
      "X...................................",
      "X.............O.....................",
      "X..................................X",
      "X...,,,,,.................%.......##",
      "X...,,,,,,.......................###",
      "X....,,,,,,.......................##",
      "#....###############################",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "044444444444440000000000000000000000",
      "044444444444440000000000000000000000",
      "044444444444440000000000000000000000",
      "044444444444400000000000000000000000",
      "044444444444400000000000000000000000",
      "044444444444400000000000000000000000",
      "044444444224400000000000000000000000",
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
    entries: { from_world: [34, 12, 'left'], from_beach: [3, 18, 'up'], from_priscilla: [5, 5, 'down'], from_house: [17, 5, 'down'], from_elevator: [29, 5, 'down'] },
    exits: [
      { at: [35, 10, 1, 5], to: 'world', loc: 'junon' },
      { at: [1, 19, 4, 1], to: 'junon_beach', entry: 'from_village' },
      { at: [5, 4, 1, 1], to: 'junon_priscilla', entry: 'from_village', sfx: 'door' },
      { at: [17, 4, 1, 1], to: 'junon_house', entry: 'from_village', sfx: 'door' },
      { at: [29, 4, 2, 1], run: function* (s) { yield* FF7.story.c5b_lowerElevator(s); } },
    ],
    npcs: [
      { id: 'grandma', name: 'Old Woman', model: 'oldwoman', at: [19, 5], dir: 'down', talk: function* (s) { yield* FF7.story.c5b_grandma(s); } },
      { id: 'el_guard1', name: 'Shinra Guard', model: 'soldier', at: [28, 5], dir: 'down',
        talk: function* (s) { yield* FF7.story.c5b_lowerElevator(s, true); } },
      { id: 'el_guard2', name: 'Shinra Guard', model: 'soldier', at: [31, 5], dir: 'down',
        talk: function* (s) { yield s.say('Shinra Guard', s.flag('c5b_ship_boarded') ? "The elevator's running. Pay my partner if you want to go up." : "Move along. Nothing for you up top."); } },
      { id: 'lj_shop', name: 'Shopkeeper', model: 'man5', at: [27, 10], dir: 'down' },
      { id: 'lj_kid', name: 'Boy', model: 'kid2', at: [8, 12], dir: 'down', wander: 2,
        talk: function* (s) {
          if (!s.flag('c5b_bottomswell')) { yield s.say('Boy', "Priscilla's down at the beach again, playing with Mr. Dolphin. She's always there!"); return; }
          yield s.say('Boy', "Priscilla's okay, right? She's always telling us she'll ride Mr. Dolphin all the way up to the top of the tower someday.");
        } },
      { id: 'lj_man', name: 'Fisherman', model: 'man3', at: [22, 14], dir: 'left',
        talk: function* (s) {
          yield s.say('Fisherman', "Junon used to be a fishing village with the finest catch around. Then Shinra built their city right on top of us.\fNow the sun never reaches us, and the fish are gone. All we get is the rumble of that giant cannon.");
        } },
      { id: 'lj_woman', name: 'Woman', model: 'woman4', at: [14, 10], dir: 'down', wander: 1,
        talk: function* (s) {
          if (s.flag('c5b_junon_slept') && !s.flag('c5b_dolphin_jump')) { yield s.say('Woman', "Did you hear? The new President's arriving in upper Junon today. They say there'll be a big parade.\fNot that anyone down here's invited."); return; }
          yield s.say('Woman', "That elevator only goes up to Shinra's Junon. Folks from down here can't use it.");
        } },
      // the party, spread around the village the morning after (Cloud walks alone until the ship)
      { id: 'v_tifa', name: 'Tifa', model: 'tifa', at: [20, 17], dir: 'down', show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_tifa_talk'),
        talk: function* (s) { yield* FF7.story.c5b_tifaSea(s); } },
      { id: 'v_barret', name: 'Barret', model: 'barret', at: [24, 13], dir: 'up', show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_tifa_talk'),
        talk: function* (s) { yield s.say('barret', "Hear that racket up there? Shinra's throwin' some kinda party.\f...Tifa went off by the water. Go see if she's okay, will ya?"); } },
      { id: 'v_aeris', name: 'Aeris', model: 'aeris', at: [11, 11], dir: 'right', show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_tifa_talk'),
        talk: function* (s) { yield s.say('aeris', "Morning, sleepyhead! You talk in your sleep, you know.\f...Just kidding! Tifa's down by the sea wall. She seemed kind of down."); } },
      { id: 'v_red', name: 'Red XIII', model: 'redxiii', at: [6, 15], dir: 'right', show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_tifa_talk'),
        talk: function* (s) { yield s.say('redxiii', "The air here tastes of oil and salt. The sea itself seems weary.\fTifa is by the water. She has been standing there for some time."); } },
      { id: 'v_yuffie', name: 'Yuffie', model: 'yuffie', at: [30, 16], dir: 'left', show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_tifa_talk') && s.isMember('yuffie'),
        talk: function* (s) { yield s.say('yuffie', "Ugh, this town is sooo boring. No shops worth robbing... I mean, browsing!"); } },
      // ...then gathered below Priscilla's house
      { id: 't_tifa', name: 'Tifa', model: 'tifa', at: [3, 7], dir: 'right', show: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva'),
        talk: function* (s) { yield s.say('tifa', "Priscilla's inside. She said she wanted to see you."); } },
      { id: 't_barret', name: 'Barret', model: 'barret', at: [7, 6], dir: 'down', show: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva'),
        talk: function* (s) { yield s.say('barret', "The kid's been askin' for you. Go on."); } },
      { id: 't_aeris', name: 'Aeris', model: 'aeris', at: [2, 5], dir: 'right', show: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva'),
        talk: function* (s) { yield s.say('aeris', "Somebody's popular! Hee hee."); } },
      { id: 't_red', name: 'Red XIII', model: 'redxiii', at: [8, 5], dir: 'left', show: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva'),
        talk: function* (s) { yield s.say('redxiii', "The girl seems to have recovered well."); } },
      { id: 't_yuffie', name: 'Yuffie', model: 'yuffie', at: [6, 7], dir: 'up', show: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva') && s.isMember('yuffie'),
        talk: function* (s) { yield s.say('yuffie', "Hurry it up, would ya? I'm getting old over here."); } },
    ],
    triggers: [
      counter([27, 11, 2, 1], function* (s) {
        yield s.say('lj_shop', "Not much to choose from down here, I'm afraid. Shinra gets the good stuff up top.");
        yield s.shop('junon_lower_items');
      }),
      { id: 'priscilla_gift', at: [9, 7, 2, 1], once: true, if: s => s.flag('c5b_tifa_talk') && !s.flag('c5b_shiva'),
        run: function* (s) { yield* FF7.story.c5b_shivaGift(s); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c5b_junon_arrived')) return;
      s.set('c5b_junon_arrived');
      yield s.move('player', 30, 12);
      const ids = popOut(s, [[31, 11, 'left'], [31, 13, 'left'], [32, 12, 'left']]);
      yield* anyone(s, [
        ['barret', "This is Junon? It's just a crummy little fishin' village!"],
        ['yuffie', "This is Junon? Pfft. I've seen bigger puddles."],
        ['redxiii', "This is Junon? I had expected something grander."],
      ]);
      yield* anyone(s, [['aeris', "Hey, everyone... Look up."], ['tifa', "Cloud... look up there."]]);
      yield s.cam(18, 1, 60, { pitch: 30 });
      yield 30;
      yield s.say('cloud', "......That's the real Junon. Shinra's military harbor, built right over this town.");
      yield* anyone(s, [
        ['tifa', "The people down here must hardly ever see the sun... Just like the slums."],
        ['aeris', "It's like Midgar... A city on top, and everyone else underneath."],
      ]);
      yield* anyone(s, [['redxiii', "If Sephiroth means to cross the sea, the ships will be up there. Among Shinra's soldiers."]]);
      yield s.camFollow();
      tuckIn(s, ids);
    },
  });

  FF7.story.c5b_lowerElevator = function* (s, talked) {
    if (!s.flag('c5b_ship_boarded')) {
      yield s.say('Shinra Guard', "Halt! This elevator is for Shinra personnel only. Lower-town folk aren't allowed up top.");
      return;
    }
    const c = yield s.ask('Shinra Guard', "Going up to Junon? That'll be 10 Gil for the elevator.", ['Pay 10 Gil', 'No thanks']);
    if (c === 0) {
      if (s.takeGil(10)) { s.sfx('elevator'); yield s.goto('junon_street1', 'from_elevator'); return; }
      yield s.say('Shinra Guard', "No Gil, no ride.");
    }
  };

  // ------------------------------------------------------------------ the old woman: a bed for the night
  FF7.story.c5b_grandma = function* (s) {
    if (!s.flag('c5b_bottomswell')) {
      yield s.say('grandma', "Oh my, travelers? We don't get many of those down here anymore.\fIf you're heading to the beach, keep an eye on little Priscilla. That girl lives in the water.");
      return;
    }
    if (!s.flag('c5b_junon_slept')) {
      yield s.say('grandma', "You're the ones who saved Priscilla! I can't thank you enough.\fYou must be exhausted. Please, stay the night at my house—there's room for all of you.");
      const c = yield s.ask('grandma', '', ['Thank you. We\'ll rest.', 'Maybe later.']);
      if (c !== 0) { yield s.say('grandma', "Well, the door's open whenever you're ready."); return; }
      yield* FF7.story.c5b_junonNight(s);
      return;
    }
    if (!s.flag('c5b_dolphin_jump')) { yield s.say('grandma', "Did you sleep well? Your friends were up early. The quiet girl went down by the sea wall."); return; }
    yield s.say('grandma', "Oh, it's you! Come back any time. Priscilla talks about you constantly, you know.");
  };

  // ------------------------------------------------------------------ the night: Cloud's dream
  FF7.story.c5b_junonNight = function* (s) {
    s.music('none');
    yield s.fadeOut(40);
    s.heal();
    yield 40;
    yield s.caption("......", { bg: '#000', aboveFade: true, hold: 80 });
    yield s.caption("...Hey... Cloud...", { bg: '#000', aboveFade: true, color: '#a0c0e0' });
    yield s.caption("Five years ago, in Nibelheim...\nYou were there, weren't you?", { bg: '#000', aboveFade: true, color: '#a0c0e0' });
    yield s.caption("Then why...\nwhy didn't you ever see Tifa?", { bg: '#000', aboveFade: true, color: '#a0c0e0' });
    yield s.caption("...Ask her.\nAsk Tifa... about that day...", { bg: '#000', aboveFade: true, color: '#a0c0e0' });
    s.set('c5b_junon_slept');
    // the party splits up for the morning: Cloud goes on alone until the cargo ship
    s.party(['cloud']);
    s.phs(false);
    yield s.goto('junon_house', 'wake');
    s.music('anxious');
    yield s.emote('player', '!');
    yield s.say('cloud', "(......That voice. Was it a dream?)\f(Ask Tifa... about five years ago?)");
    s.spawn('grandma_in', 'oldwoman', 6, 4, 'up', { name: 'Old Woman' });
    yield s.face('grandma_in', 'player');
    yield s.say('Old Woman', "Good morning! Sleep well? Your friends went out early.\fThe girl with the long black hair looked like she had something weighing on her. She went down to the sea wall.");
    s.remove('grandma_in');
  };

  FF7.defineMap('junon_house', {
    name: 'Junon', area: 'Junon', theme: 'house',
    grid: [
      "##################",
      "#kk..F....#b.b.b.#",
      "#.........+.....j#",
      "#..ctc....#......#",
      "#...c.....#......#",
      "#j........########",
      "#.........########",
      "####+#############",
    ],
    lights: [[5, 2, '#ffb060', 3]],
    entries: { from_village: [4, 6, 'up'], wake: [12, 2, 'down'] },
    exits: [{ at: [4, 7, 1, 1], to: 'junon_lower', entry: 'from_house', sfx: 'door' }],
    triggers: [
      { at: [11, 1, 5, 1], on: 'talk', run: function* (s) {
          if (s.flag('c5b_priscilla_saved') && !s.flag('c5b_junon_slept')) {
            const c = yield s.ask(null, 'Go to sleep for the night?', ['Sleep', 'Not yet']);
            if (c === 0) yield* FF7.story.c5b_junonNight(s);
            return;
          }
          yield s.msg('Simple beds, freshly made. The sheets smell of salt air.');
        } },
    ],
  });

  // ------------------------------------------------------------------ Tifa by the sea
  FF7.story.c5b_tifaSea = function* (s) {
    if (s.flag('c5b_tifa_talk')) return;
    yield s.face('v_tifa', 'player');
    yield s.say('tifa', "Oh... Cloud. Good morning.");
    const c = yield s.ask('cloud', '', ["Tifa... Five years ago...", "Are you all right?"]);
    if (c === 0) {
      yield s.say('tifa', "......Five years ago?");
      yield s.say('cloud', "......No. Never mind. It's nothing.");
      yield s.say('tifa', "...Okay.");
    } else {
      yield s.say('tifa', "Me? I'm fine. I just... couldn't sleep.");
    }
    yield s.face('v_tifa', 'down');
    yield s.say('tifa', "The sea's so dark here. You can't even see the sky past that city up there.\f...It's funny. When we left Midgar, I thought we'd finally be out from under the plate.");
    // a fanfare and a cannon salute ring out from the Shinra city above
    s.music('rufus');
    s.sfx('shot3'); s.shake(2, 20);
    yield 40;
    yield s.emote('v_tifa', '!');
    yield s.say('tifa', "What's that? A parade...?");
    s.spawn('runner', 'kid4', 34, 12, 'left', { name: 'Boy' });
    yield s.run('runner', 22, 15);
    yield s.say('Boy', "Did you hear!? The new President's coming to Junon today! They're practicing the welcome parade up top!");
    yield s.run('runner', 1, 18);
    s.remove('runner');
    yield s.say('tifa', "The new President... Rufus.\fCloud, the others are waiting by Priscilla's house. She's awake—and she's been asking for you.");
    s.set('c5b_tifa_talk');
    s.music('anxious');
    yield s.move('v_tifa', [[20, 12], [11, 9], [10, 8], [10, 7], [3, 7]], { run: true });
    s.hide('v_tifa');
    ['v_barret', 'v_aeris', 'v_red', 'v_yuffie'].forEach(id => s.hide(id));
    ['t_tifa', 't_barret', 't_aeris', 't_red'].forEach(id => s.show(id));
    if (s.isMember('yuffie')) s.show('t_yuffie');
  };

  // ------------------------------------------------------------------ Priscilla's thank-you: Shiva
  FF7.story.c5b_shivaGift = function* (s) {
    yield s.say('barret', "Yo, Cloud! There you are.");
    s.spawn('priscilla', 'priscilla', 5, 4, 'down', { name: 'Priscilla' });
    s.sfx('door');
    yield s.move('priscilla', 7, 7);
    yield s.face('priscilla', 'player');
    yield s.face('player', 'priscilla');
    yield s.say('priscilla', "Um... It's you. The one who... saved me yesterday.\fI'm sorry I called you Shinra. And... thank you.");
    yield s.say('priscilla', "Here. This is my treasure. I want you to have it.");
    s.set('c5b_shiva');
    yield s.giveMateria('shiva');
    yield s.say('priscilla', "It's a summon materia! Take good care of it, okay?");
    yield s.say('barret', "Now then... How the hell do we get up to Shinra's Junon? Sephiroth's gotta be crossin' the ocean, and the only boats around here are Shinra's.");
    yield s.say('tifa', "The elevator's guarded. They won't let anybody from down here go up.");
    yield s.say('priscilla', "You want to go up there? Why would anybody want to?\f...Well, if you really do, come to the beach. Mr. Dolphin can help! I'll show you!");
    yield s.run('priscilla', [[10, 8], [9, 12], [3, 18]]);
    s.remove('priscilla');
    yield s.say('aeris', "Mr. Dolphin can help? I wonder what she means...");
    yield s.say('barret', "Only one way to find out. Let's go.");
    ['t_tifa', 't_barret', 't_aeris', 't_red', 't_yuffie'].forEach(id => s.hide(id));
  };

  FF7.defineMap('junon_priscilla', {
    name: 'Junon', area: 'Junon', theme: 'house',
    // looked at diagonally into the back corner, like 04-junon09: stone floor, the round table on a
    // rug, dish cabinets along the back walls
    look: { floor: ['#6e665a', '#665e52'], floor3: ['#8a5a36', '#825432'] },
    camera: { yaw: 40, pitch: 50, dist: 9 },
    grid: [
      "################",
      "#k.b...F..q.jj.#",
      "#q.._____......#",
      "#q.._ctc_......#",
      "#...__c__......#",
      "#..............#",
      "#j............j#",
      "#######+########",
    ],
    lights: [[7, 2, '#ffb060', 3]],
    entries: { from_village: [7, 6, 'up'] },
    exits: [{ at: [7, 7, 1, 1], to: 'junon_lower', entry: 'from_priscilla', sfx: 'door' }],
    npcs: [
      { id: 'pris_bed', name: 'Priscilla', model: 'priscilla', at: [3, 1], dir: 'down', anim: 'lie', faceOnTalk: false,
        show: s => s.flag('c5b_priscilla_saved') && !s.flag('c5b_junon_slept'),
        talk: function* (s) { yield s.say('Priscilla', "Zzz... Mr. Dolphin... jump higher... Zzz..."); } },
      { id: 'pris_up', name: 'Priscilla', model: 'priscilla', at: [9, 3], dir: 'down',
        show: s => s.flag('c5b_junon_slept') && !s.flag('c5b_shiva'),
        talk: function* (s) { yield s.say('Priscilla', "Oh! Um... G-go wait outside with your friends, okay? I'll be right out!"); } },
      { id: 'neighbor', name: 'Neighbor', model: 'woman7', at: [11, 4], dir: 'left',
        talk: function* (s) {
          if (!s.flag('c5b_priscilla_saved')) { yield s.say('Neighbor', "Priscilla? She's out at the beach. That girl practically lives in the water."); return; }
          yield s.say('Neighbor', "I've been looking in on Priscilla. She gave us all a fright, but she's a tough little thing.\fThank you for bringing her back to us.");
        } },
    ],
  });

  // ------------------------------------------------------------------ the beach: Priscilla, Mr. Dolphin, Bottomswell
  FF7.defineMap('junon_beach', {
    name: 'Junon Beach', area: 'Junon', theme: 'beach', music: 'anxious',
    // the rusty electric pylon standing in the sea (04-junon05/10) is Mr. Dolphin's target: a 'pylon'
    // prop on an octagonal concrete footing in the water (tiles 2-3, rows 11-12), its plank landing ('KKKK') below
    look: { sky: ['#3a5a80', '#98b0c8'], water: '#2a5a88', wall: '#6a4634', wallTop: '#3a2418', fog: { color: [0.5, 0.6, 0.72], near: 12, far: 30 } },
    props: [
      { at: [2.5, 11.5], prop: 'disc', sides: 8, r: 1.15, h: 0.14, skirt: 0.5, col: '#5a5048', top: '#6e645a' },
      { at: [2.5, 11.5], prop: 'pylon', lift: 0.14, h: 9, w: 1.9, top: 0.7, col: '#8a4a2a', arms: 2.4, sign: 'Z', lamp: '#ff5030', thick: 1.3 },
    ],
    grid: [
      "###########################....###",
      "#RR##RR#####RR#####RR######....###",
      "#ssssssssssssssssssssssssss....R##",
      "#ssssssss%sssssssssssssssssssssR##",
      "sssssssssssssssssssssssssssssss###",
      "sssssRssssssssssssssssssssssssss##",
      "ssssssssssssssssssssssssssssssss##",
      "~sssssssssssssssssssssssssssssss##",
      "~~ssssssssssssssssssssssssssssss~#",
      "~~~sssssKsssssssssssssssssssss~~~#",
      "~~~~~sssKssssssssssssssssss~~~~~~~",
      "~~~~~~~~K~~~~ssssssssssss~~~~~~~~~",
      "~~~~~~~~K~~~~~~~ssssss~~~~~~~~~~~~",
      "~KKKK~~~K~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~KKK~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
    entries: { from_village: [28, 2, 'down'] },
    exits: [{ at: [27, 0, 4, 1], to: 'junon_lower', entry: 'from_beach' }],
    npcs: [
      { id: 'pris_beach', name: 'Priscilla', model: 'priscilla', at: [9, 9], dir: 'down',
        show: s => s.flag('c5b_shiva'),
        talk: function* (s) { yield* FF7.story.c5b_priscillaBeach(s); } },
      { id: 'b_barret', name: 'Barret', model: 'barret', at: [14, 5], dir: 'left', show: s => s.flag('c5b_shiva') && !s.flag('c5b_in_water'),
        talk: function* (s) { yield s.say('barret', "The kid says her dolphin can get us up there. ...I'll believe it when I see it."); } },
      { id: 'b_tifa', name: 'Tifa', model: 'tifa', at: [12, 4], dir: 'down', show: s => s.flag('c5b_shiva') && !s.flag('c5b_in_water'),
        talk: function* (s) { yield s.say('tifa', "Priscilla wants to show you something. Go on, Cloud."); } },
      { id: 'b_aeris', name: 'Aeris', model: 'aeris', at: [16, 7], dir: 'left', show: s => s.flag('c5b_shiva') && !s.flag('c5b_in_water'),
        talk: function* (s) { yield s.say('aeris', "Mr. Dolphin! What a cute name. I want to meet him!"); } },
      { id: 'b_red', name: 'Red XIII', model: 'redxiii', at: [18, 5], dir: 'left', show: s => s.flag('c5b_shiva') && !s.flag('c5b_in_water'),
        talk: function* (s) { yield s.say('redxiii', "A dolphin that carries people? ...This I would like to see."); } },
      { id: 'b_yuffie', name: 'Yuffie', model: 'yuffie', at: [20, 7], dir: 'left', show: s => s.flag('c5b_shiva') && !s.flag('c5b_in_water') && s.isMember('yuffie'),
        talk: function* (s) { yield s.say('yuffie', "If that fish tries to launch ME anywhere, I'm gonna hurl. Just saying."); } },
    ],
    triggers: [
      { at: [7, 14, 3, 1], if: s => s.flag('c5b_whistle') && !s.flag('c5b_dolphin_jump'), run: function* (s) { yield* FF7.story.c5b_dolphinJump(s); } },
      { at: [7, 14, 3, 1], if: s => s.flag('c5b_dolphin_jump'), run: function* (s) { yield* FF7.story.c5b_dolphinLater(s); } },
    ],
    onLoad: function (s) {
      if (s.flag('c5b_bottomswell')) s.spawn('dolphin', { enemy: 'corvette', scale: 0.7 }, 6, 13, 'right', { name: 'Mr. Dolphin' });
    },
    onEnter: function* (s) {
      if (!s.flag('c5b_bottomswell')) yield* FF7.story.c5b_bottomswell(s);
    },
  });

  FF7.story.c5b_bottomswell = function* (s) {
    s.music('none');
    s.spawn('priscilla', 'priscilla', 8, 13, 'down', { name: 'Priscilla' });
    s.spawn('dolphin', { enemy: 'corvette', scale: 0.7 }, 5, 14, 'right', { name: 'Mr. Dolphin' });
    yield s.move('player', 14, 6);
    const ids = popOut(s, [[15, 5, 'left'], [16, 6, 'left']]);
    yield s.cam(8, 11, 50);
    yield s.say('priscilla', "Mr. Dolphin! Over here! Jump, jump!");
    s.sfx('hop');
    yield s.jump('dolphin', 5, 14, 1.4, 34);
    yield s.face('priscilla', 'up');
    yield s.emote('priscilla', '!');
    yield s.say('priscilla', "Hey! Who are you!? ...You're from Shinra, aren't you!");
    yield* anyone(s, [
      ['barret', "Whoa, whoa! Do we LOOK like Shinra to you, kid!?"],
      ['aeris', "Shinra? Us? No, no, you've got it all wrong!"],
    ]);
    yield s.say('priscilla', "Liar! Shinra took away our sun and ruined our sea! Go away!");
    s.shake(5, 70);
    yield 40;
    yield s.emote('priscilla', '?!');
    s.spawn('bottom', { enemy: 'bottomswell', scale: 1.3 }, 11, 13, 'left', { name: 'Bottomswell' });
    s.music('boss');
    yield s.jump('bottom', 11, 13, 1.2, 30);
    yield s.say('priscilla', "Wh-what is that!? Kyaaah!!");
    s.sfx('hit');
    yield [s.jump('dolphin', 2, 16, 1.0, 26), s.jump('priscilla', 9, 12, 0.8, 22)];
    s.remove('dolphin');
    s.anim('priscilla', 'hurt');
    yield s.say('priscilla', "Help! Mr. Dolphin! Somebody!");
    yield s.say('cloud', "Stay back!");
    yield s.run('player', 9, 10);
    s.flash('#ffffff', 10, 0.6);
    yield s.battle({ table: 'boss_bottomswell', bg: 'beach', music: 'boss', noEscape: true });
    // --- after the fight: Priscilla isn't breathing
    s.remove('bottom');
    s.music('none');
    s.place('priscilla', 11, 9, 'down');
    s.anim('priscilla', 'lie');
    s.place('player', 12, 8, 'down');
    tuckIn(s, ids);
    const ids2 = popOut(s, [[13, 9, 'left'], [10, 8, 'down'], [13, 7, 'left']]);
    yield s.cam(11, 9, 30);
    yield* anyone(s, [['tifa', "She's not breathing! Cloud, she needs air—now!"], ['aeris', "She's not breathing! We have to do something, quick!"]]);
    yield* anyone(s, [['barret', "Don't look at me! Somebody with a smaller mouth oughta do it!"]]);
    yield* anyone(s, [['redxiii', "I would, but... my muzzle is not suited to the task."]]);
    yield* anyone(s, [['yuffie', "Ew, no way. Not me!"]]);
    yield* anyone(s, [['aeris', "Cloud! Mouth-to-mouth! Hurry!"], ['tifa', "Cloud, please! Hurry!"]]);
    yield s.say('cloud', "......All right.");
    // CPR: fill Cloud's lungs, breathe out before the gauge overflows (FF7 minigame)
    let tries = 0, saved = false;
    while (!saved && tries < 5) {
      tries++;
      const r = yield s.minigame('cpr');
      saved = ok(r) || tries >= 5;
      if (!saved) yield s.msg("Cloud runs out of breath and has to start over...");
    }
    s.sfx('heartbeat');
    yield 30;
    s.stopAnim('priscilla');
    s.anim('priscilla', 'kneel');
    yield s.emote('priscilla', '!');
    s.music('anxious');
    yield s.say('priscilla', "*cough* *cough*... Wh-what happened...?\f...Mr. Dolphin? Where's Mr. Dolphin?");
    s.spawn('dolphin', { enemy: 'corvette', scale: 0.7 }, 6, 13, 'right', { name: 'Mr. Dolphin' });
    s.sfx('hop');
    yield s.jump('dolphin', 6, 13, 1.0, 26);
    s.stopAnim('priscilla');
    yield s.face('priscilla', 'player');
    yield s.say('priscilla', "Did... did you save me?\f......Thanks. I guess maybe you're not so bad... for Shinra people.");
    yield s.say('cloud', "......We're not with Shinra.");
    s.spawn('villager', 'man3', 29, 2, 'down', { name: 'Villager' });
    yield s.run('villager', 12, 9);
    yield s.say('Villager', "Priscilla! Are you hurt!? Come on, let's get you home and into bed!");
    yield s.move('priscilla', 12, 8);
    yield [s.move('villager', [[28, 2], [28, 0]], { noWait: false }), s.move('priscilla', [[28, 3], [28, 0]])];
    s.remove('villager'); s.remove('priscilla');
    yield* anyone(s, [['tifa', "Thank goodness... She'll be okay."], ['aeris', "Phew... Good job, Cloud!"]]);
    yield* anyone(s, [['barret', "Man, what a day. Let's head back into town. I could sleep for a week."]]);
    tuckIn(s, ids2);
    s.set('c5b_bottomswell');
    s.set('c5b_priscilla_saved');
    yield s.camFollow();
  };

  FF7.story.c5b_priscillaBeach = function* (s) {
    if (s.flag('c5b_dolphin_jump')) {
      yield s.say('pris_beach', "Mr. Dolphin says hi! He still talks about how high you flew. Hee hee!");
      return;
    }
    if (!s.flag('c5b_whistle')) {
      yield s.say('pris_beach', "See that tall electric pole out in the water? It goes all the way up to Shinra's Junon.\fMr. Dolphin can jump really, really high. If he tosses you just right, you can grab onto it and climb up!");
      yield s.say('pris_beach', "Here's how you call him. You whistle like this...");
      s.sfx('hop');
      yield s.msg('Priscilla teaches Cloud how to whistle for Mr. Dolphin.');
      s.set('c5b_whistle');
      yield s.say('pris_beach', "Go out to the end of the pier and jump in the water. Then whistle, and Mr. Dolphin will come!\fBe careful, okay?");
      return;
    }
    yield s.say('pris_beach', "Jump in at the end of the pier and whistle! Mr. Dolphin knows what to do.");
  };

  FF7.story.c5b_dolphinJump = function* (s) {
    if (!s.flag('c5b_in_water')) {
      // the others will find their own way up; Barret takes the PHS
      const ids = ['barret', 'tifa', 'aeris', 'redxiii'].concat(s.isMember('yuffie') ? ['yuffie'] : []);
      const spots = [[8, 10, 'down'], [9, 10, 'down'], [7, 10, 'down'], [10, 9, 'down'], [6, 9, 'down']];
      ids.forEach((id, i) => { s.hide('b_' + (id === 'redxiii' ? 'red' : id)); s.spawn('s_' + id, id, spots[i][0], spots[i][1], spots[i][2], { name: s.name(id) }); });
      yield s.move('player', 8, 12);
      yield s.face('player', 'up');
      yield s.say('barret', "Yo, Cloud! Hold up!\fWe ain't all gonna fit on one dolphin. You go on ahead—we'll find our own way up there.");
      yield s.say('barret', "Gimme the PHS. We'll get in touch when we're set.");
      if (s.has('phs')) { s.take('phs'); s.set('c5b_phs_taken'); }
      yield s.msg("Cloud handed the PHS to Barret.");
      yield s.say('tifa', "Cloud... be careful.");
      yield s.say('aeris', "See you on the other side! Don't get caught, okay?");
      if (s.isMember('yuffie')) yield s.say('yuffie', "Bleh. I'd rather sneak in anyway. Way more fun!");
      ids.forEach(id => s.run('s_' + id, 28, 1, { noWait: true }));
      yield 50;
      ids.forEach(id => s.remove('s_' + id));
      s.set('c5b_in_water');
      yield s.move('player', 8, 14);
    }
    const c = yield s.ask(null, 'Jump into the water and blow the whistle?', ['Blow the whistle', 'Not yet']);
    if (c !== 0) { yield s.move('player', 8, 12); return; }
    yield s.jump('player', 7, 15, 0.5, 20);
    s.sfx('hop');
    yield s.msg('Cloud whistles. Mr. Dolphin comes racing through the waves!');
    let tries = 0;
    for (;;) {
      tries++;
      const r = yield s.minigame('dolphin');
      if (ok(r) || tries >= 6) break;
      yield s.msg("Mr. Dolphin flings Cloud into the air... and he comes down short. SPLASH!");
      const again = yield s.ask(null, 'Try again?', ['Whistle again', 'Swim back to the pier']);
      if (again !== 0) { s.place('player', 8, 14, 'up'); yield s.move('player', 8, 12); return; }
    }
    s.set('c5b_dolphin_jump');
    yield s.jump('player', 3, 12, 3.2, 40);
    yield s.msg('Cloud catches hold of the top of the electric pole!');
    yield s.goto('junon_airport', 'from_dolphin');
  };

  // Later visits: Mr. Dolphin still helps (FF7: with the buggy he can also get you onto the cargo ship).
  FF7.story.c5b_dolphinLater = function* (s) {
    const choices = ['Jump up to the tower'];
    const canShip = s.flag('has_buggy') && !s.flag('has_highwind');
    if (canShip) choices.push('Board the ship to Costa del Sol');
    choices.push('Never mind');
    const c = yield s.ask(null, 'Call Mr. Dolphin?', choices);
    if (choices[c] === 'Jump up to the tower') {
      yield s.jump('player', 7, 15, 0.5, 20);
      s.sfx('hop');
      yield s.jump('player', 3, 12, 3.2, 40);
      yield s.goto('junon_airport', 'from_dolphin');
      return;
    }
    if (choices[c] === 'Board the ship to Costa del Sol') {
      yield s.msg('Mr. Dolphin carries you out to the cargo ship just as it weighs anchor...');
      yield s.fadeOut(30);
      yield s.goto('costa_port', 'from_ship');
      return;
    }
    yield s.move('player', 8, 12);
  };
})();

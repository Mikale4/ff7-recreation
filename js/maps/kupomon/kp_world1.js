// Kupomon, stage 1 (docs/KUPOMON.md, docs/KUPOMON_WORLD.md "Region 1"): Prof. Sith's lab (the intro, the three starters,
// the rivals Zack and Sephiroth), Pomville (the hilltop village) with its Mog Center (Mog Repair, Mart, Mog Box) and
// Granny Pom's cottage, Route 1 (Pom Meadow: terraces, ledges, the creek, the Old Oak) and Route 1 North (the hedge
// lane up to the gate of Mogridge, js/maps/kupomon/kp_region1.js). Maps kp_*: run in Kupomon's sandbox
// (js/kupomon/kp_core.js), Cloud playing. Dialogue in our own words.
(function () {
  const KP = FF7.kupomon;
  const counter = (at, run) => ({ at, on: 'talk', run });
  const D = () => FF7.state.kp;
  const PROF = 'Prof. Sith';

  // ------------------------------------------------------------------ helpers for the maps' scripts
  const W = KP.W;
  // Route 1 North's moogles (js/kupomon/kp_data.js) and the Pipkin, found nowhere closer to Pomville
  KP.WILD.kp_route1_north = KP.WILD.kp_route1_north.filter(r => r[0] !== 'pipkin_freelancer').concat([['pipkin_freelancer', 8, 4, 6]]);
  // Mog Repair: everyone fixed up, and it's where you wake if your team ever goes down
  const repair = function* (s) {
    const c = yield s.ask('Nurse Mog', 'Welcome to the Mog Repair, kupo! Shall I fix up your moogles?', ['Yes, please', 'No thanks']);
    if (c !== 0) { yield s.say('Nurse Mog', 'Come back any time, kupo!'); return; }
    if (!D().party.length) { yield s.say('Nurse Mog', "Kupo? You don't have any moogles yet!"); return; }
    s.sfx('heal'); s.flash('#ffd0e0', 10, 0.5);
    KP.healAll(); D().repair = ['kp_center', 'repair'];
    yield 30;
    yield s.say('Nurse Mog', 'All done! Your moogles are good as new. Take care out there, kupo!');
  };
  // the Mart: its shop screen (js/kupomon/kp_menu.js KP.shop): prices, what each does, how many
  const MART = ['kupo_nut', 'golden_nut', 'sprout_nut', 'quick_nut', 'oil_nut', 'oil_can', 'hi_oil', 'fixit'];
  const mart = function* (s) {
    yield s.say('Mart Mog', `Welcome to the Mart, kupo! Take a look!`);
    const chips = KP.chipStock ? KP.chipStock(s.field && s.field.map && s.field.map.id) : [];   // (its Skill Chips: js/kupomon/kp_learn.js)
    yield KP.shop(MART.concat(chips.filter(c => !MART.includes(c))), { name: 'Mart Mog' });
    yield s.say('Mart Mog', 'Thanks for stopping by, kupo!');
  };
  // the Mog Box: moogles beyond the five on your team wait here (js/kupomon/kp_world.js)
  const mogBox = W.mogBox;
  // a windmill's four sails, strung from cables (props `to`): the hub on a wall's face at tile [tx, ty] (fractional),
  // h metres above the floor height y0 (m), each sail R metres long, a spar (col) and a lattice of cloth lines
  const sails = (tx, ty, y0, h, R, col = '#5a3a22', cloth = '#efe6d2') => {
    const out = [], X = (m) => tx + m / 0.5;
    const line = (x0, h0, x1, h1, r, c) => out.push({ at: [X(x0), ty], to: [X(x1), ty], h: h + h0, h2: h + h1, y0, sag: 0, r, count: 1, col: c });
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => {
      const ux = a * Math.SQRT1_2, uy = b * Math.SQRT1_2, vx = -uy, vy = ux;   // along the sail, and across it (all four trail the same way round)
      line(ux * 0.08, uy * 0.08, ux * R, uy * R, 0.035, col);
      [0.1, 0.2, 0.3].forEach(k => line(ux * R * 0.28 + vx * k, uy * R * 0.28 + vy * k, ux * R + vx * k, uy * R + vy * k, 0.012, cloth));
      [0.28, 0.52, 0.76, 1].forEach(t => line(ux * R * t, uy * R * t, ux * R * t + vx * 0.3, uy * R * t + vy * 0.3, 0.012, cloth));
    });
    out.push({ at: [tx, ty], prop: 'bush', col: col, scale: 0.42, y0: y0 + h - 0.1 });
    return out;
  };

  // ------------------------------------------------------------------ Prof. Sith's lab
  // Cloud wakes here. Prof. Sith (Cait Sith) and his two apprentices, Zack and Sephiroth, the rivals: Cloud picks one
  // of three starters, Sephiroth takes the one that beats it, Zack the last. Zack battles Cloud at the door (a friendly
  // first fight, his starter weak to Cloud's); Sephiroth walks out, to turn up later.
  const STARTER_AT = { moglin_warrior: [4, 4], kupwick_blackmage: [6, 4], pomsprout_whitemage: [8, 4] };
  const V = () => FF7.state.vars;
  const picked = (id) => V().kp_starter === id || V().kp_seph_starter === id || V().kp_zack_starter === id;
  const choose = (id) => function* (s) {
    if (s.flag('kp_starter')) { yield s.msg(picked(id) ? 'The display pad is empty.' : `${KP.SPECIES[id].moogle} looks up at you hopefully... but you already have a partner.`); return; }
    if (!s.flag('kp_intro')) return;
    const sp = KP.SPECIES[id], job = KP.JOBS[sp.job].name;
    yield s.msg(`${sp.moogle}, the ${job} moogle.\f${sp.desc}`);
    const c = yield s.ask(PROF, `So! Ye'll take ${sp.moogle}, the ${job}?`, ['Yes', 'Let me think']);
    if (c !== 0) return;
    s.setVar('kp_starter', id);
    s.set('kp_starter');
    KP.receive(KP.make(id, KP.LV(5)));   // (Lv 8 on the cap of 50)
    s.sfx('levelup');
    yield s.msg(`${s.name('cloud')} received ${sp.moogle}!`);
    // Sephiroth takes the one that beats it; Zack, the last
    const sid = KP.RIVAL_PICK[id], ssp = KP.SPECIES[sid], zid = KP.STARTERS.find(x => x !== id && x !== sid), zsp = KP.SPECIES[zid];
    yield s.face('seph', 'player');
    yield s.say('sephiroth', `...Then I'll take ${ssp.moogle}.`);
    yield s.move('seph', STARTER_AT[sid][0], STARTER_AT[sid][1] + 1);
    yield s.face('seph', 'up');
    s.setVar('kp_seph_starter', sid);
    yield 16;
    yield s.face('seph', 'player');
    yield s.say('sephiroth', `A ${KP.JOBS[ssp.job].name}. ${KP.TYPE_NAMES[ssp.type]} beats ${KP.TYPE_NAMES[sp.type]}, Cloud. Remember that.`);
    yield s.say('zack', "Hey, that's cold! ...Guess that leaves me with this little guy, then.");
    yield s.move('zack', STARTER_AT[zid][0], STARTER_AT[zid][1] + 1);
    yield s.face('zack', 'up');
    s.setVar('kp_zack_starter', zid);
    yield 16;
    yield s.face('zack', 'player');
    yield s.say('zack', `${zsp.moogle}! We're gonna be heroes, buddy. ...You hear that, Cloud? HEROES!`);
  };
  // after the starters: Zack's first battle at the door (losing's fine); Sephiroth walks out; then off into the world
  function* rivalsAtDoor(s) {
    if (s.flag('kp_rival1') || !s.flag('kp_starter')) return;
    s.set('kp_rival1');
    yield s.say('zack', "Hold up, Cloud! Before you go: let's give these guys a test run!");
    yield s.move('zack', 6, 7);
    yield s.face('zack', 'player');
    const L = W.rivalLevel(), zid = W.lineAt(V().kp_zack_starter, L);   // (a rival's moogle: at Cloud's level, evolved if it's past it)
    const r = yield* KP.fight(s, { kind: 'trainer', foes: [KP.make(zid, L, KP.compMoves ? { moves: KP.compMoves(zid, L, { chips: KP.chipStock ? KP.chipStock('kp_center') : false }) } : {})], trainer: { name: 'Zack', lose: 'Whoa! Not bad, Cloud!', win: 'Ha! Gotcha!', money: 120, model: 'zack' }, bg: 'lab', canLose: true, ai: 'max', music: KP.RIVALS.zack.music });   // (a rival: always at his best, and his own theme)
    if (r === 'lose') { KP.healAll(); yield s.say('zack', "Ha! Don't sweat it. ...There, Prof. Sith fixed yours up."); }
    else yield s.say('zack', "Whew! You're a natural, Cloud. Guess I've got some catching up to do!");
    // Sephiroth leaves first
    yield s.move('seph', 7, 7);
    yield s.face('seph', 'player');
    yield s.say('sephiroth', 'Catch every moogle. Beat every dojo. ...I intend to do both. First.');
    yield s.say('sephiroth', "Don't fall behind, Cloud.");
    yield s.move('seph', 6, 9);
    s.remove('seph');
    yield s.say('zack', "...That guy. Don't let him get to you. He's just like that.\fSee you out there, Cloud! Let's both get strong, yeah?");
    yield s.move('zack', 6, 9);
    s.remove('zack');
    yield s.say(PROF, `Och, those two. ...Right! Before ye go, ${s.name('cloud')}: take these.`);
    KP.give('kupo_nut', 5); KP.give('oil_can', 3);
    s.sfx('found');
    yield s.msg('Received 5 Kupo Nuts and 3 Oil Cans!');
    yield s.say(PROF, "Beat a wild moogle in battle, then toss it a Kupo Nut. If it likes the taste, it might just decide to come along with ye! Ye get three tries.\fA wee tip: one that went down asleep or poisoned is a hungrier one.\fAnd the Kupodex in yer menu keeps track of every moogle ye've seen and befriended.");
    yield s.say(PROF, "Oil Cans repair a moogle, out on the road or in a scrap with a wild one. Against a trainer, mind, the bag stays shut: it's yer moogles and whatever they're holding.");
    yield s.say(PROF, "Out there are EIGHT Arcade Dojos. Beat their masters, win their badges, and the Kupo League will open to ye.\fNow off ye go! And come back any time: I'll give yer moogles a tune-up.");
    s.set('kp_sent_off');
  }
  FF7.defineMap('kp_lab', {
    name: "Prof. Sith's Lab", area: 'Pomville', theme: 'lab', music: 'caitsith',
    grid: [
      "##############",
      "#kkk.MMMM.ZZZ#",
      "#............#",
      "#.b..........#",
      "#..._._._....#",
      "#............#",
      "#.y........y.#",
      "#............#",
      "#..........q.#",
      "######+#######",
    ],
    entries: { start: [3, 2, 'down'], from_town: [6, 8, 'up'] },
    exits: [{ at: [6, 9, 1, 1], to: 'kp_town', entry: 'from_lab', sfx: 'door', if: s => s.flag('kp_sent_off'),
      blocked: function* (s) { yield s.say(PROF, s.flag('kp_starter') ? "Wait, wait! Don't go yet!" : "Ah-ah! Not without a moogle, ye don't! Pick one from the pads."); yield s.walk('player', 0, -1); } }],
    // (a picked one leaves its pad at once: checked every frame, as a map object's getters are only read when it loads)
    objects: KP.STARTERS.map(id => ({ id: 'starter_' + id, at: STARTER_AT[id], model: { enemy: 'kp_' + id, scale: 0.85 }, dir: 'down', talk: choose(id), solid: true,
      hidden: false, tick(o) { o.hidden = picked(id); } })),
    npcs: [
      { id: 'prof', name: PROF, model: 'caitsith', at: [6, 2], dir: 'down',
        talk: function* (s) {
          if (!s.flag('kp_starter')) { yield s.say(PROF, "Go on, pick one! They don't bite. Well, the Warrior might."); return; }
          KP.healAll(); s.sfx('heal');
          yield s.say(PROF, 'Let me give yer moogles a wee tune-up... There! Good as new.\fRemember: Warrior beats Black Mage, Black Mage beats White Mage, White Mage beats Warrior!');
          // his look at the Kupodex (Pokemon's professors rate theirs), and for a full one, his diploma
          const n = KP.dexCount();
          if (!KP.badgeCount || KP.badgeCount() < 1 || s.flag('kp_diploma')) return;
          if (n.caught < n.of) {
            yield s.say(PROF, n.caught < n.of / 4 ? `${n.caught} kinds befriended, out of ${n.of}? A fine start, laddie! The wild's full of moogles ye've never met.`
              : n.caught < n.of / 2 ? `${n.caught} of ${n.of}! Ye're gettin' the hang of it. Some kinds only turn up by growin' up, mind, and some only hatch at the Kupo Ranch.`
              : n.caught < n.of - 10 ? `${n.caught} of ${n.of}! Now that's a Kupodex! Keep at it, kupo!`
              : `${n.caught} of ${n.of}... Och, ye're so close I can taste it! Only ${n.of - n.caught} to go!`);
            return;
          }
          s.set('kp_diploma'); s.sfx('levelup');
          if (KP.real && KP.real.state && !KP._demoRun) KP.real.state.flags.kupomon_diploma = true;   // (the FF7 game's record: Cait Sith's second review, KP.diplomaIn)
          yield s.say(PROF, `Wait... let me see that Kupodex... All ${n.of}! Every last kind of moogle, befriended!`);
          yield s.say(PROF, "I've waited my whole life to see one filled in, kupo. This calls for... a diploma!\fOn behalf o' the Kupomon Research Lab: this certifies that " + s.name('cloud') + ' has completed the Kupodex. Well done, laddie. Well done.');
          yield s.msg(s.name('cloud') + ' received the Kupodex Diploma!');
        } },
      { id: 'zack', name: 'Zack', model: 'zack', at: [9, 2], dir: 'down', show: s => !s.flag('kp_rival1'),
        talk: function* (s) { yield s.say('zack', s.flag('kp_starter') ? 'This is gonna be so much fun!' : "Go on, Cloud, pick one! I'm dying to see which!"); } },
      { id: 'seph', name: 'Sephiroth', model: 'sephiroth', at: [11, 3], dir: 'left', show: s => !s.flag('kp_rival1'),
        talk: function* (s) { yield s.say('sephiroth', s.flag('kp_starter') ? '......' : 'Choose quickly.'); } },
    ],
    triggers: [{ id: 'rivals_door', at: [3, 6, 8, 2], once: false, if: s => s.flag('kp_starter') && !s.flag('kp_rival1'), run: rivalsAtDoor },
      // the secret (no sparkle: found by the hints of Granny Pom, the Route 1 picnicker and Mogridge's old woman):
      // between the books of the leftmost shelf, the professor's own lucky charm
      { id: 'lab_secret', at: [1, 1], on: 'talk', kpHidden: 'kph_lab_exp_plus', run: function* (s) {
        if (s.flag('kph_lab_exp_plus')) { yield s.msg('Rows of fortune-telling books. "The Stars and You". "Reading Pom-Poms". "Luck: A User’s Manual".'); return; }
        yield s.msg('Rows of fortune-telling books... One of them is warm to the touch, and it hums.');
        s.set('kph_lab_exp_plus'); KP.give('exp_plus', 1); s.sfx('found');
        yield s.msg('Inside the hollow book: ' + KP.got('exp_plus', 1));
        yield s.msg('EXP Plus: a moogle holding it earns half as much EXP again.');
      } }],
    onEnter: function* (s) {
      if (s.flag('kp_intro')) return;
      s.set('kp_intro');
      // waking up in the lab
      s.anim('player', 'kneel');
      yield 40;
      s.stopAnim('player');
      yield s.say('cloud', '......Where am I?');
      yield s.move('prof', 4, 2);
      yield s.face('prof', 'player');
      yield s.say(PROF, "Ah, ye're awake! Welcome, welcome, to the world of KUPOMON!");
      yield s.say(PROF, 'My name is Sith. Folk round here call me the Moogle Professor. Prof. Sith, if ye like.');
      yield s.say(PROF, "This world is full of moogles. ROBOT moogles! Wee clockwork marvels, every one with a pom-pom on top and a whole lot of heart.\fSome folk keep them as friends. Some battle them. Some just like collectin' the wee things. Me? I study them!");
      yield s.say(PROF, "Every moogle has a JOB: Warrior, Black Mage, Thief, Dancer... and every job has its strengths and its weak spots.\fA Warrior makes short work of a Black Mage. A Black Mage's spells melt a White Mage. And a White Mage's holy light humbles a Warrior.\fLearn the jobs, and ye'll go far.");
      yield s.say(PROF, "Moogles grow as they battle, and when they're ready they change jobs: a Warrior might become a Gladiator, then a Samurai!");
      // the rivals
      yield s.face('prof', 'zack');
      yield s.say(PROF, 'And these two are my apprentices. They start their own journeys today, same as you.');
      yield s.face('zack', 'player');
      yield s.say('zack', "Hey! Name's Zack. You're Cloud, right? This is gonna be awesome!");
      yield s.face('seph', 'player');
      yield s.say('sephiroth', '...Sephiroth.');
      yield s.face('prof', 'player');
      yield s.say(PROF, `Now then, ${s.name('cloud')}. On those pads are three moogles. Pick the one ye like best: it'll be yer partner.`);
      yield s.move('prof', 6, 2);
      yield s.face('prof', 'down');
      yield s.face('seph', 'left');
    },
  });

  // ------------------------------------------------------------------ Pomville: a hilltop village (docs/KUPOMON_WORLD.md, Region 1). Prof.
  // Sith's lab up on its terrace (stairs) with the windmill that powers it, the Mog Center on the square, the duck
  // pond and its jetty, the stream running down past Granny Pom's to the meadow under the village (a little bridge, a
  // fall into the lily pool), an orchard; the lane north drops down the hill to Route 1.
  FF7.defineMap('kp_town', {
    name: 'Pomville', area: 'Pomville', theme: 'town', music: 'farmboy',
    look: { floor: ['#a89878', '#a09070'], roof: '#7a4a30', trim: '#7a5a38' },
    grid: [
      " TT:::TTTTTTTTTTTTTTTTTTTTTTTTTTT ",
      " T,:::,f,,%,,,TT%,hhhhhhhh,,,,,TT ",
      " TT:::,,ff,,,R,T%,hhhhhhhh,hh,,,T ",
      " TR^^^R%%RR%%%%T%,hhhhhhhh,hh,,,T ",
      " T,^^^,,,,,,,,,T%,hwwhhwwh,,,,Y,T ",
      " T,...,,!,,,,,,,%,....+....,,,,,, ",
      " TT...,,hhhhhh,,%,..........,,ffT ",
      " T,...,,hhhhhh,,%,,,,,..,,,,,,ffT ",
      " T%...,,hwhhwh,,=====^^=========T ",
      " T,......,+..........^^,,,,,,,,,, ",
      " T,,,,....................=,,,,,T ",
      " T,,~~,....Z.....,,,....Z.=T,T,T, ",
      " ,~~~~~,l........O.......l.,,,,,T ",
      " ,~~~~~~...,QQ..,,..,,....=T,T,T, ",
      " ,~~~~~~....QQ,,,,........=,,,,,T ",
      " ,~~~KKKK......,,,,,,,,,,,======, ",
      " ,~~~~~.....,hhhhhh,,hhhhh,,,,,,, ",
      " ,,~~~~......hhhhhh,,hhhhh,,,,,,, ",
      " f,,~~,......hwhhwh,,hwhwh,,,,,,, ",
      " ff,~~,.....,..+...,,..+..,...... ",
      " f,,KK..ff...f..ff.f..f..ff..f... ",
      " ,f,~~,====================^^==== ",
      " f%%WW%%f,,ff,,,,,,,,,,,,,,^^,,%, ",
      " ,,~~~~,f,,f,,,,,,,,,,,,,,,,,,,   ",
      "  ,,,,,,,,,%,,,,,,,,,,,,,,,,,,    ",
      "                                  ",
    ],
    heights: [
      "3000000000000000666666666666666663",
      "3000000000000000666666666666666663",
      "3000000000000000666666666666666663",
      "3331113333333333666666666666666663",
      "3332223333333333666666666666666663",
      "3333333333333333666666666666666663",
      "3333333333333333666666666666666663",
      "3333333333333333666666666666666663",
      "3333333333333333666665566666666663",
      "3333333333333333333334433333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3333333333333333333333333333333333",
      "3111111111111111111111111112211113",
      "3111111111111111111111111111111113",
      "3111111111111111111111111111111113",
      "3333333333333333333333333333333333",
    ],
    legend: { Z: 'bench', Q: 'block' },
    buildings: [
      { at: [18, 1, 8, 4], h: 2.6, col: '#ece8e0', roof: '#3a6ab0', top: 'gable', ridge: 'x', rise: 0.9, over: 0.22, tex: 'siding' },
      { at: [27, 2, 2, 2], h: 3.4, col: '#f2ead8', roof: '#8a3a2a', top: 'hip', rise: 1.0, over: 0.14, tex: 'stoneblock' },
      { at: [8, 6, 6, 3], h: 2.3, col: '#f6eee6', roof: '#e0607e', top: 'hip', rise: 0.8, over: 0.2 },
      { at: [13, 16, 6, 3], h: 2.0, col: '#dccaa6', roof: '#7a4a30', top: 'gable', ridge: 'x', rise: 0.8, over: 0.18, chimney: true },
      { at: [21, 16, 5, 3], h: 2.0, col: '#c8d8bc', roof: '#4a6a3a', top: 'gable', ridge: 'z', rise: 0.9, over: 0.18 },
    ],
    props: sails(27.5, 3.66, 1.8, 2.45, 1.3).concat([
      { at: [10.5, 7], prop: 'lantern', col: '#ff4a6a', size: 1.5, y0: 3.7, light: false },   // the Mog Center's pom-pom
      { at: [4, 22], prop: 'waterfall', scale: [1, 0.45, 1] }, { at: [5, 22], prop: 'waterfall', scale: [1, 0.45, 1] },
      { at: [11, 11], prop: 'bench', back: true }, { at: [24, 11], prop: 'bench', back: true },
      { at: [30, 4], prop: 'stump', scale: 1.3 },
      { at: [12.5, 13.5], prop: 'planter', r: 1.05, h: 0.4, col: '#c8b898', plant: 'tree', treeH: 3.4 },   // the village tree
    ]),
    labels: [
      { at: [21.5, 4], face: 's', text: "PROF. SITH'S LAB", size: 0.17, col: '#2a4a80', y: 2.05 },
      { at: [10.5, 8], face: 's', text: 'MOG CENTER', size: 0.18, col: '#d04a6a', y: 1.85 },
    ],
    entries: { from_lab: [22, 6, 'down'], from_center: [10, 10, 'down'], from_route1: [4, 1, 'down'], from_house: [15, 20, 'down'] },
    exits: [
      { at: [22, 5, 1, 1], to: 'kp_lab', entry: 'from_town', sfx: 'door' },
      { at: [10, 9, 1, 1], to: 'kp_center', entry: 'from_town', sfx: 'door' },
      { at: [15, 19, 1, 1], to: 'kp_town_house', entry: 'from_town', sfx: 'door' },
      { at: [3, 0, 3, 1], to: 'kp_route1', entry: 'from_town' },
    ],
    npcs: [
      { id: 'kp_kid1', name: 'Boy', model: 'kid2', at: [15, 13], dir: 'right', wander: 2,
        talk: function* (s) { yield s.say('Boy', "Route 1's down the lane past the Mog Center. Tall grass is where wild moogles hide, so don't go in without a moogle of your own!"); } },
      { id: 'kp_woman1', name: 'Woman', model: 'woman3', at: [14, 10], dir: 'left',
        talk: function* (s) { yield s.say('Woman', 'The Mog Center fixes up your moogles for free. Lovely folk, the moogles there.\fAnd if you ever black out out there, that\'s where you\'ll wake up. Not that you will, dear!'); } },
      { id: 'kp_old1', name: 'Old Man', model: 'oldman', at: [28, 12], dir: 'left',
        talk: function* (s) {
          yield s.say('Old Man', "Beat a wild moogle first, then toss it your Kupo Nuts. Three tries, and if it likes one, it'll come along! Put it to sleep before you finish it off and it'll be hungrier still.");
          if (s.flag('kp_old_nuts') || !s.flag('kp_starter')) return;
          s.set('kp_old_nuts'); KP.give('sleepy_nut', 3); s.sfx('found');
          yield s.msg('Received 3 Sleepy Nuts!');
          yield s.say('Old Man', "Those there are Sleepy Nuts. A moogle that went down snoozing can't say no to one. There's all sorts of nuts out there, mind!");
        } },
      { id: 'kp_mog1', name: 'Tufty', model: { enemy: 'kp_tufty_freelancer', scale: 0.8 }, at: [19, 13], dir: 'down', wander: 3,
        talk: function* (s) { yield s.say('Tufty', 'Kupo! Kupo kupo!'); } },
      { id: 'kp_twn_girl', name: 'Girl', model: 'girl4', at: [25, 6], dir: 'left',
        talk: function* (s) { yield s.say('Girl', "The windmill turns a dynamo that powers the whole lab! On still days Prof. Sith's moogles take turns on a treadmill instead.\fThey say they don't mind. They do mind."); } },
      { id: 'kp_twn_fisher', name: 'Fisherman', model: 'fisherman', at: [6, 15], dir: 'left',
        talk: function* (s) { yield s.say('Fisherman', "Thirty years I've fished off this jetty and never caught a thing.\fThe ducks eat the bait. The moogles eat my sandwiches. I just like the quiet, kupo."); } },
      { id: 'kp_duck1', name: 'Duck', model: 'bird', at: [3, 13], dir: 'right', hover: 0.01,
        talk: function* (s) { yield s.msg('Quack! ...Kupo?'); } },
      { id: 'kp_duck2', name: 'Duck', model: 'bird', at: [3, 16], dir: 'left', hover: 0.01,
        talk: function* (s) { yield s.msg('The duck paddles in a slow, proud circle.'); } },
      W.moogle('kp_twn_mop', 'mopluff_bard', [18, 23], { line: 'Mopluff hums to itself: La la, la kupo~' }),
    ],
    triggers: [
      W.sign([8, 5], "POMVILLE\fWhere every journey starts, kupo!\fNorth: Route 1 and Mogridge."),
      W.sign([17, 12], 'A wishing well. Somebody has tossed a Kupo Nut in.\f...It is not coming back up.'),
      W.sign([27, 3], "The windmill creaks round and round. A brass plate says: SITH WINDWORKS. Keeps the lab running, kupo!"),
      W.sign([28, 3], "The windmill creaks round and round. A brass plate says: SITH WINDWORKS. Keeps the lab running, kupo!"),
      { at: [23, 19], on: 'talk', run: function* (s) { yield s.msg("The door's locked. A note is pinned to it:\f\"Gone to the Mogridge market! Back by supper. - the Poms\""); } },
      W.hidden('town_garden', [1, 19], 'oil_can', 2),
    ],
    items: [W.item('town_nut', [9, 1], 'kupo_nut', 2)],
    onLoad: s => s.block(23, 19),
  });

  // Granny Pom's cottage: a cup of tea (your moogles rest by the stove)
  W.house('kp_town_house', { name: "Granny Pom's House", area: 'Pomville', town: 'kp_town', back: 'from_house', decor: 'cosy',
    npcs: [
      { id: 'kp_granny', name: 'Granny Pom', model: 'oldwoman2', at: [3, 2], dir: 'down',
        talk: function* (s) {
          yield s.say('Granny Pom', "Oh! Come in, come in, dearie. Off on a journey, are you? You look just like my grandson did.");
          if (!D().party.length) { yield s.say('Granny Pom', "No moogle yet? Go and see that Prof. Sith up on the hill. He's a cat, you know. A clever one, but a cat."); return; }
          if (!s.flag('kph_lab_exp_plus')) yield s.say('Granny Pom', "That Prof. Sith used to read fortunes, you know. He told me once he keeps his best invention the way a fortune-teller keeps his secrets: between the pages.");
          s.sfx('heal'); KP.healAll();
          yield s.say('Granny Pom', "Sit down and have some tea. Your moogles can warm their gears by the stove...\fThere! All rested. Come back whenever you like, dearie.");
        } },
      { id: 'kp_granny_cat', name: 'Cat', model: 'cat', at: [8, 3], dir: 'left', wander: 1,
        talk: function* (s) { yield s.msg('Mrrow. The cat stares at you as if you owe it a Kupo Nut.'); } },
    ] });

  // ------------------------------------------------------------------ the Mog Center: Mog Repair (left), the Mart (right), the Mog Box
  FF7.defineMap('kp_center', {
    name: 'Mog Center', area: 'Pomville', theme: 'house', music: 'ahead',
    grid: [
      "##############",
      "#............#",
      "#.DDD....DDD.#",
      "#............#",
      "#.KKK......Z.#",
      "#............#",
      "######+#######",
    ],
    legend: { K: 'block' },
    // the waiting corner: a table, a chair either side of it facing in
    props: [{ at: [2, 4], prop: 'chair', rot: 90 }, { at: [3, 4], prop: 'table' }, { at: [4, 4], prop: 'chair', rot: -90 }],
    entries: { from_town: [6, 5, 'up'], repair: [3, 3, 'up'] },
    exits: [{ at: [6, 6, 1, 1], to: 'kp_town', entry: 'from_center', sfx: 'door' }],
    npcs: [
      { id: 'nurse', name: 'Nurse Mog', model: { enemy: 'kp_pomsprout_devout', scale: 0.85 }, at: [3, 1], dir: 'down', talk: repair },
      { id: 'merchant', name: 'Mart Mog', model: { enemy: 'kp_nutmog_treasure_hunter', scale: 0.85 }, at: [10, 1], dir: 'down', talk: mart },
    ],
    triggers: [counter([2, 2, 3, 1], repair), counter([9, 2, 3, 1], mart)],
    objects: [{ at: [11, 4], talk: mogBox }],
  });

  // ------------------------------------------------------------------ Route 1: Pom Meadow. Rolling terraces climbing north from Pomville
  // (h0 -> h2 -> h4 -> h6), each step with a stair and a one-way ledge (Pokemon's: hop down toward home), a creek with a
  // plank bridge and stepping stones, the Old Oak on the middle terrace, tall grass in drifts (one across the path).
  // Ledges: row 19 x19-24 (to the creek bank), row 13 x1-6, row 6 x18-24. Stairs: x10-11 rows 19-20, x15-16 rows 13-14,
  // x8-9 rows 6-7.
  const T1 = W.trainer({ id: 'kp_tr_ollie', cls: 'Youngster', name: 'Ollie', model: 'kid1', at: [18, 16], dir: 'left', sight: [13, 16, 5, 1],
    line: "Hey! You've got a moogle! My big brother says you have to battle anyone who looks at you. So... you looked at me!", lose: 'Aww, my Tufty...', after: "I'm gonna train under the Old Oak till my moogles are as big as it is.", team: [['tufty_freelancer', 4], ['nutmog_thief', 4]], money: 160 });
  const T2 = W.trainer({ id: 'kp_tr_mabel', cls: 'Lass', name: 'Mabel', model: 'girl2', at: [14, 9], dir: 'left', sight: [9, 9, 5, 1],
    line: 'My moogle sings! Want to hear? ...You have to battle us first. Those are the rules!', lose: "You didn't even like the song...", after: 'Mopluff hums all day long. Even in its sleep, kupo.', team: [['mopluff_bard', 5]], money: 200 });
  FF7.defineMap('kp_route1', {
    name: 'Route 1', area: 'Route 1', theme: 'grass', music: 'electric_chocobo', kpWild: 'kp_route1', kpBg: 'grass',
    look: { floor2: ['#8a7450', '#82704a'] },
    grid: [
      " TTTTTTTTTTT::::TTTTTTTTTTT   ",
      " T%...,,....:::...GGGGGGG.%T  ",
      " T....R.ff.:::...GGGGGGGG.T   ",
      "TT.........:f:..GGGGGGGG..T   ",
      "T%....%f..:::.....GGGG....%T  ",
      "T.......:::...........R....T  ",
      "T%......^^%%%%%%%%.......%%TT ",
      "T%%RT%%%^^.......,,,,,,,..%T  ",
      "TGGG....::.............GGG.T  ",
      "TGGGG....::.....,,GGQQGGGGTT  ",
      "TGGYG.....:::...GGGGQQGGG..T  ",
      "T.GG........:::..GG!GGGGG...T ",
      "T.......%.....:::%%%%RT%%%%RT ",
      "T......%%%%%%%%^^%.GG....,,TT ",
      "T......%.......^^.......,,,,T ",
      "TGGGGG..%......::...Rf.GGG.%T ",
      "TGGGGGG...ff..::.......GGGGG.T",
      "T.GGGGG.....::..........GTGG.T",
      "TRT%%T%%%%.:::.....,,........T",
      "T...f,,..%^^%%%%%%%......%%%TT",
      "TT........^^.......,,....,TTT ",
      "TR........::::...........%RRT ",
      "RR~~o~~~~~~~KK~~~~~~~~~~~~RRR ",
      "RR~~o~~~~~~~KK~~~~~~~~~~~~~RR ",
      "TT,%....ff..::...R..%..GGGT.RT",
      "T....GGGG...::.GGGGGG..GGGG..T",
      "T...GGGGGGGGGGGGGGGGGGG.GGG..T",
      "T%...GGGGGGGGGGGGGGGG.......%T",
      "TT.....GGG...::..GGG....%...TT",
      " T..Y.........::....f.,,..TT  ",
      " TTT..!.......:::....%...TTT  ",
      "   TTTTTTTTTTT:::TTTTTTTTTT   ",
    ],
    heights: [
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666666666666666666666666666",
      "666666665566666666666666666666",
      "466666665544444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444444444444444444",
      "444444444444444332222222222444",
      "222222222222222332222222222222",
      "222222222222222222222222222222",
      "222222222222222222222222222222",
      "222222222222222222222222222222",
      "222222222222222222222222222222",
      "200000000011222222222222222222",
      "000000000011000000000000000000",
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
      "000000000000000000000000000000",
    ],
    legend: { o: 'roundpillar', Q: 'block' },
    props: [
      { at: [20.5, 9.5], prop: 'canopy', r: 2.7, h: 2.5, col: '#3e6e2c', col2: '#5a3c22' },   // the Old Oak
      { at: [20.5, 9.5], prop: 'planter', r: 0.9, h: 0.12, col: '#5a4a30', col2: '#4a7a30', plant: 'grass' },
    ],
    entries: { from_town: [15, 30, 'up'], from_north: [13, 1, 'down'] },
    exits: [
      { at: [14, 31, 3, 1], to: 'kp_town', entry: 'from_route1' },
      { at: [12, 0, 4, 1], to: 'kp_route1n', entry: 'from_south' },
    ],
    npcs: [T1.npc, T2.npc,
      { id: 'kp_r1_picnic', name: 'Woman', model: 'woman6', at: [4, 2], dir: 'down',
        talk: function* (s) { yield s.say('Woman', "We come up here for a picnic every week. The view of Pomville from the top terrace is the best around!\fI used to tidy the Prof’s lab. He let me dust every book but one. “That one’s not a book,” he said. Funny old cat.\fIf you're in a hurry to get home, just hop down the ledges. Climbing back up is the slow way, though."); } },
      W.moogle('kp_r1_tufty', 'tufty_freelancer', [5, 3], { wander: 1, line: 'The Tufty is guarding the picnic basket. Kupo!' }),
    ],
    triggers: [T1.trig, T2.trig,
      W.ledge([19, 19, 6]), W.ledge([1, 13, 6]), W.ledge([18, 6, 7]),
      W.sign([6, 30], 'ROUTE 1 - POM MEADOW\fNorth: Mogridge.   South: Pomville.'),
      W.sign([19, 11], "THE OLD OAK\fOlder than Pomville itself. Moogles nap in its shade on sunny days, kupo."),
      W.hidden('r1_creek', [2, 21], 'quick_nut'),
    ],
    items: [W.item('r1_golden', [25, 1], 'golden_nut'), W.item('r1_oil', [1, 11], 'oil_can', 2), W.item('r1_sprout', [25, 29], 'sprout_nut')],
  });

  // ------------------------------------------------------------------ Route 1 North: the hedge lane, climbing from the meadow through a stone
  // stile in a dry-stone wall to the gate of Mogridge. A flower meadow off to the east (tall grass, a hidden Kupo Nut); the
  // Road Mog has finished the road.
  const T3 = W.trainer({ id: 'kp_r1n_rowan', cls: 'Camper', name: 'Rowan', model: 'kid4', at: [17, 14], dir: 'left', sight: [10, 14, 7, 1],
    line: "Halt! This hedge lane is MY training ground. Well, mine and the Road Mog's.", lose: "Okay, okay. It's your training ground too.", after: "The flower meadow over there is where the rarer moogles hide. Pipkins, even!", team: [['mossmog_geomancer', 5], ['mogpost_ranger', 6]], money: 240 });
  FF7.defineMap('kp_route1n', {
    name: 'Route 1 (North)', area: 'Route 1', theme: 'grass', music: 'electric_chocobo', kpWild: 'kp_route1_north', kpBg: 'grass',
    look: { floor2: ['#8a7450', '#82704a'] },
    grid: [
      "TTTTTTTTTTTT:::TTTTTTTTTTTT ",
      "T%%%%%%%%%%|:::|%%%%%%%%%TT ",
      "T%,,ff,,,%%.:::..%Bo,,ff,%T ",
      "T%,GGG,,,%..:::..%%,GGG,,%T ",
      "T%,GGGG,%%..:::..%.......%T ",
      "T%,,GG,%%...:::.....GGG..%T ",
      "T%%%%%..:::::::::::GG%%%%%T ",
      "TT,,,,...::......GGGGG,f,TT ",
      "RR####^^^#####%%%%%%%%%%%%RR",
      " T,,%.^^^...%%%,,ffffff,,,T ",
      " T,,%..:::..%,,,,fffGGff,,T ",
      "TT,,%..:::..%,,ffGGGGGfff,T ",
      "T%,,%.GG::..%%,fGGGGGGff,,TT",
      "T%,,%GGG::GG...,,ffGGff,,,%T",
      "T%,,%%GG:::::::...,,,,,,,,%T",
      "T%,,,%%%%%%::::.%%%%%%%%%%%T",
      "TT,,,,,,,%%.::...%,,,,R,,,TT",
      " TT,,,,,,%%..::..%%,,,,,,TT ",
      "  TTRR%%%%%%^^^%%%%%%RRTTT  ",
      "   T,,,,,,%.^^^.%,,,,,,T    ",
      "   T,f,,,,%.GGG.%,,,f,,T    ",
      "   T,,,f,,%GGGGG%,,,,,,T    ",
      "   TTT,,,,%..:..,,,,,TTT    ",
      "     TTTTTTT:::TTTTTTT      ",
    ],
    heights: [
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444444444444444444444444444",
      "4444443334444444444444444444",
      "2222223332222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "2222222222222222222222222222",
      "0000000000001110000000000000",
      "0000000000001110000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
      "0000000000000000000000000000",
    ],
    // the dry-stone wall (low, grey) either side of the stile; the gate's pillars and its banner
    buildings: [{ at: [2, 8, 4, 1], h: 0.55, col: '#8a8678', top: 'flat', tex: 'stoneblock' }, { at: [9, 8, 5, 1], h: 0.55, col: '#8a8678', top: 'flat', tex: 'stoneblock' }],
    props: [
      { at: [11, 1], prop: 'pillar', h: 2.6, col: '#b8b0a0', col2: '#8a8070' }, { at: [15, 1], prop: 'pillar', h: 2.6, col: '#b8b0a0', col2: '#8a8070' },
      { at: [13, 1], prop: 'banner', w: 3.6, h: 0.55, y: 2.7, col: '#3a6ab0', col2: '#f0e0a0', text: 'MOGRIDGE', textCol: '#f8f0d8' },
    ],
    legend: {},
    entries: { from_south: [13, 22, 'up'], from_mogridge: [13, 1, 'down'] },
    exits: [
      { at: [12, 23, 3, 1], to: 'kp_route1', entry: 'from_north' },
      { at: [12, 0, 3, 1], to: 'kp_mogridge', entry: 'from_route1' },
    ],
    npcs: [T3.npc,
      { id: 'kp_worker', name: 'Road Mog', model: { enemy: 'kp_stampo_monk', scale: 0.85 }, at: [16, 4], dir: 'left',
        talk: function* (s) {
          yield s.say('Road Mog', s.flag('kp_roadmog_thanks') ? "Mind the cobbles, kupo! Every one stamped by hand. Well, by fist." : "Kupo! You're the one who waited so patiently while I fixed the road! The way to Mogridge is open at last!\fThanks for not climbing over my barrier, kupo. Most folk did.");
          if (s.flag('kp_roadmog_thanks')) return;
          s.set('kp_roadmog_thanks'); KP.give('oil_can', 2); s.sfx('found');
          yield s.msg('Received 2 Oil Cans!');
          yield s.say('Road Mog', "Mogridge is just through the gate. Canal town! Mind you don't fall in, kupo.");
        } },
    ],
    triggers: [T3.trig,
      W.sign([11, 1], 'MOGRIDGE - the Canal Town\fSouth: Route 1, Pom Meadow and Pomville.'),
      W.hidden('r1n_meadow', [25, 9], 'kupo_nut', 3),
    ],
    items: [W.item('r1n_oil', [21, 21], 'oil_can'), W.item('r1n_fixit', [3, 4], 'fixit')],
  });
})();

// Chapter 12b, part 3 — the Ancient Forest, the four materia caves, Goblin Island and Round Island.
//  * Ancient Forest (world `ancient_forest`, green/black/gold chocobo, or landing the Highwind in the crater
//    Ultimate WEAPON leaves nearby — a Highwind step hook): FF7's insect / frog / pitcher-flower / beehive / stamen puzzle,
//    with the plants and creatures as models (js/field/props_forest.js) and every catch, throw and snap shown.
//    Puzzle state resets every time a screen is entered (as in FF7). Treasures: Supershot ST, Spring Gun
//    Clip, Slash-All, Minerva Band, Typoon, Apocalypse, Elixir.
//  * Materia caves: Quadra Magic (the islands west then north of Mideel; blue/black/gold chocobo), Mime (Wutai island; green/black/gold), HP<->MP (north of North Corel; black/gold) and
//    Knights of the Round (Round Island; gold chocobo).
//  * Goblin Island: a clearing full of Goblins (Zeio Nuts, Goblin Punch).
// (Dialogue paraphrased in our own words; see docs/SCRIPTING.md.)
(function () {
  const WM = FF7.world;
  const F = (n) => !!(FF7.state && FF7.state.flags[n]);
  const reach = (colors) => (FF7.story.c12b_canReach ? FF7.story.c12b_canReach(colors) : false);
  const toWorld = function* (s) { yield* FF7.story.c12b_leave(s); };
  const linkIf = (test) => FF7.story.c12b_linkIf(test);

  // ================================================================== ANCIENT FOREST
  WM.link('ancient_forest', { map: 'side_forest_1', entry: 'from_world', priority: 1,
    if: linkIf(() => reach(['green', 'black', 'gold'])) });
  WM.link('ancient_forest', { run: function* (s) {
    yield s.msg('An ancient forest crowns a plateau ringed by sheer canyon walls.\nOnly a chocobo that can scale mountains could climb up there.');
  } });

  // After Ultimate WEAPON's crash the crater gives a way in: fly the Highwind over the forest to land there.
  FF7.story.c12b_forestLanding = function* (s) {
    const c = yield s.ask(null, "Ultimate WEAPON's crater has broken open the canyon wall around the Ancient Forest.\nLand and go in on foot?", ['Land', 'Keep flying']);
    if (c !== 0) return;
    FF7.story.c12b_noteArrival();
    yield s.goto('side_forest_1', 'from_world');
  };
  let forestArmed = true;
  WM.stepHooks = WM.stepHooks || [];
  WM.stepHooks.push(function c12bForest(ctx) {
    if (!ctx || ctx.vehicle !== 'highwind' || !F('c12b_ultimate_dead')) return null;
    const on = ctx.x >= 102 && ctx.x <= 106 && ctx.y >= 196 && ctx.y <= 200;
    if (!on) { forestArmed = true; return null; }
    if (!forestArmed) return null;
    forestArmed = false;
    return FF7.story.c12b_forestLanding;
  });

  // puzzle state (reset whenever a forest screen loads)
  // The set pieces are real models (js/field/props_forest.js): pitcher flowers and Large Flytraps are field objects
  // ('af_' + key) whose lids and jaws the scripts move; insects, frogs and beehives are NPCs you pick up and then
  // hold overhead (the player's `carry`), and throw into flowers, hollows and flytraps.
  const AF = { carry: null, fed: {}, frog: {} };
  const NAMES = { insect: 'insect', frog: 'frog', hive: 'beehive' };
  const INSECT = { creature: { type: 'insect', c1: '#c8b428', c2: '#5a4018', c3: '#e83020' }, hover: 0.3 };
  const FROG = { prop: 'frog', height: 0.22 };
  const HIVE = { prop: 'beehive', height: 0.48 };
  const CARRY = { insect: [INSECT, 0.45], frog: [FROG, 1.3], hive: [HIVE, 0.85] };   // held overhead, at this size
  function resetForest(s, blocked) {
    AF.carry = null; AF.fed = {}; AF.frog = {};
    blocked.forEach(([x, y]) => s.block(x, y, true));
  }
  const holding = () => (AF.carry ? `(You're holding the ${NAMES[AF.carry]}.)` : '');
  function hold(s, what) {
    const pl = s.field.player; AF.carry = what || null;
    pl.carry = what ? CARRY[what][0] : null; pl.carryScale = what ? CARRY[what][1] : 1;
  }
  function pickUp(what, id) {
    return function* (s) {
      if (AF.carry) { yield s.msg(`Your hands are full. ${holding()}`); return; }
      s.remove(id);
      hold(s, what);
      s.sfx('item');
      yield s.msg(what === 'hive' ? 'You carefully lift the buzzing beehive over your head.' : `You catch the ${NAMES[what]}.`);
    };
  }
  // throw what the player is holding: it leaves their hands and arcs over to tile (x, y), coming down h m up
  function* toss(s, x, y, h = 0) {
    const what = AF.carry, pl = s.field.player, T = FF7.field.TILE;
    hold(s, null);
    if (!what) return;
    const [app, size] = CARRY[what];
    s.spawn('af_toss', app, pl.x / T - 0.5, pl.z / T - 0.5, pl.dir, { solid: false, scale: size, hover: 1.05 });
    const a = s.field.actors.af_toss;
    if (a) a.hoverTo = { from: 1.05, to: h, t: 0, n: 18 };
    yield s.jump('af_toss', x, y, 0.5, 18);
    s.remove('af_toss');
  }
  // the plants: o.k 0 (open) .. 1 (shut), o.lie (a flytrap sagging over), o.frog / o.hive (what's inside)
  const plant = (s, key) => (s.field.objects || []).find(o => o.id === 'af_' + key);
  const reshape = (o) => { o.stateKey = [o.k || 0, o.frog ? 'f' : '', o.hive ? 'h' : '', Math.round((o.lie || 0) * 8)].join('|'); };
  function* shut(o, k, n) {
    if (!o) return;
    const k0 = o.k || 0;
    for (let i = 1; i <= n; i++) { o.k = Math.round((k0 + (k - k0) * i / n) * 8) / 8; reshape(o); yield 1; }
  }
  // A pitcher flower in a gap (a ravine, a stream) that closes into a solid step when fed an insect.
  function flowerStep(key, x, y) {
    return function* (s) {
      const o = plant(s, key);
      if (AF.fed[key]) { yield s.msg('The pitcher flower has closed tight around its meal. It holds firm underfoot.'); return; }
      if (AF.carry === 'insect') {
        AF.fed[key] = true;
        yield* toss(s, x, y, 0.2);
        s.sfx('hop');
        yield* shut(o, 1, 14);
        s.shake(2, 10); s.block(x, y, false);
        yield s.msg('The insect drops into the pitcher flower. It snaps shut...\nand its thick leaves stiffen into a sturdy step.');
        return;
      }
      if (AF.carry === 'frog') { yield s.msg('The frog just hops straight back out of the flower.'); return; }
      yield s.msg('A giant pitcher flower, its mouth gaping open. It looks hungry.');
    };
  }
  // A pitcher flower used as a catapult: a frog sitting in it launches whoever steps on it.
  function flowerCatapult(key, x, y, launch) {
    return function* (s) {
      const o = plant(s, key), pl = s.field.player;
      if (!AF.fed[key] && AF.carry === 'frog') {
        AF.fed[key] = 'frog';
        yield* toss(s, x, y, 0.85);
        if (o) { o.frog = true; reshape(o); }
        s.sfx('hop');
        yield s.msg("You set the frog in the pitcher flower. It doesn't get eaten...\nit just squats there with its legs coiled tight.");
      }
      if (AF.fed[key] === 'frog') {
        const c = yield s.ask(null, 'The frog is crouched in the flower, ready to spring. Step onto it?', ['Step on it', 'Not yet']);
        if (c !== 0) return;
        // up onto the lid, the flower sags under you... and the frog kicks off
        pl.hoverTo = { from: pl.hover || 0, to: 1.0, t: 0, n: 16 };
        yield s.jump('player', x, y, 0.5, 16);
        for (let i = 0; i < 10; i++) { const q = Math.sin(i / 9 * Math.PI) * 0.22; if (o) o.scl = [1 + q * 0.5, 1 - q, 1 + q * 0.5]; pl.hover = 1.0 - q * 0.9; yield 1; }
        if (o) o.scl = [0.94, 1.12, 0.94];
        pl.hoverTo = { from: pl.hover, to: 0, t: 0, n: 30 };
        yield* launch(s);
        if (o) o.scl = null;
        return;
      }
      if (AF.carry === 'insect') {
        yield* toss(s, x, y, 0.85);
        yield* shut(o, 1, 6); yield 12; yield* shut(o, 0, 12);
        yield s.msg('The pitcher flower gulps the insect down and gapes open again.');
        return;
      }
      yield s.msg('A giant pitcher flower. It bobs on a springy stalk.');
    };
  }
  // A hollow tree: set an insect down at its foot (in front of it: fx, fy) and a frog comes out for it.
  function hollowTree(key, fx, fy) {
    return function* (s) {
      if (AF.frog[key]) { yield s.msg('The hollow is empty now.'); return; }
      if (AF.carry === 'insect') {
        AF.frog[key] = true;
        yield* toss(s, fx, fy - 0.45, 0);   // at the foot of the tree
        s.spawn('af_bait', INSECT, fx, fy - 0.45, 'up', { solid: false, scale: 0.45, hover: 0.02 });
        yield 24;
        // out of the hollow, onto the bait, and down beside the player
        const id = 'frog_' + key, P = s.field.P, side = !P || P.walkable(fx + 1, fy) ? 1 : -1;
        s.spawn(id, FROG, fx, fy - 0.8, 'down', { name: 'Frog', scale: 1.5, talk: pickUp('frog', id) });
        yield s.jump(id, fx, fy - 0.45, 0.25, 10);
        s.remove('af_bait');
        yield s.jump(id, fx + side, fy, 0.35, 14);
        s.sfx('hop');
        yield s.emote(id, '!');
        yield s.msg('You set the insect down by the hollow.\nA fat frog pops out and gobbles it up!');
        return;
      }
      yield s.msg('A hollow tree. Something shuffles around inside.');
    };
  }
  // A Large Flytrap in the way: lob a beehive in and it clamps shut on it (the angry bees keep it shut), then sags over.
  function flytrap(key, x, y) {
    return function* (s) {
      const o = plant(s, key);
      if (AF.fed[key]) { yield s.msg('The flytrap is clamped shut on the beehive. It shudders, but stays closed.'); return; }
      if (AF.carry === 'hive') {
        AF.fed[key] = true;
        yield* toss(s, x, y, 0.45);
        if (o) { o.hive = true; reshape(o); }
        s.sfx('hit');
        yield* shut(o, 1, 5);
        s.shake(3, 16);
        yield 30;
        if (o) for (let i = 1; i <= 24; i++) { o.lie = i / 24; reshape(o); yield 1; }
        s.block(x, y, false);
        yield s.msg('You lob the beehive into the Large Flytrap. It snaps shut on it...\nand the furious bees keep it from opening again. It sags over, out of the way.');
        return;
      }
      yield s.msg('A Large Flytrap, jaws wide open. Walking into that would be a very bad idea.');
    };
  }
  // Stamen / rope / ledge edge: swing up from below, drop down from above.
  function swing(topY, groundY, boundary, texts) {
    return function* (s) {
      const pl = s.actor('player');
      const tx = pl && pl.tx != null ? pl.tx : 0, ty = pl && pl.ty != null ? pl.ty : groundY;
      if (ty > boundary) {
        if (!texts.up) { yield s.msg(texts.noUp || "It's too high to climb from here."); return; }
        const c = yield s.ask(null, texts.up, ['Swing up', 'Stay']);
        if (c !== 0) return;
        yield s.jump('player', tx, topY, 2.0, 34);
      } else {
        const c = yield s.ask(null, texts.down || 'Drop down to the ground below?', ['Drop down', 'Stay']);
        if (c !== 0) return;
        yield s.jump('player', tx, groundY, 1.2, 28);
      }
    };
  }
  const bugNpc = (id, x, y) => ({ id, name: 'Insect', model: INSECT, at: [x, y], dir: 'down', scale: 0.45, wander: 1, faceOnTalk: false, talk: pickUp('insect', id) });
  const pitcher = (key, x, y, sunk) => ({ id: 'af_' + key, at: [x, y], prop: 'pitcher', sunk: !!sunk });
  const trap = (key, x, y) => ({ id: 'af_' + key, at: [x, y], prop: 'flytrap' });

  // ------------------------------------------------------------------ Area 1: the bridge of flowers
  const A1_FLOWERS = [[14, 7], [15, 7], [16, 7]];
  FF7.defineMap('side_forest_1', {
    name: 'Ancient Forest', area: 'Ancient Forest', theme: 'jungle', music: 'ahead',
    look: { sky: ['#0a1a08', '#2a4a20'] },
    legend: { p: 'flowers', Q: 'tallgrass', o: 'liftpad' },
    battle: { table: 'ancient_forest_outside', bg: 'forest' },
    grid: [
      "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "VVT,,,,T,,,,VV   VVVVVVVVVVVVV,,VV",
      "V,,,,,,,,,,,,V   V,,,,,,,,,,TT,,,V",
      "V,,%,,,,,,,,,,   ,,,,,,,,,,,TT,T,V",
      "V,,,,,,,,T,,,,   ,,,,QQQ,,,,,,,,,V",
      "V,,,,,,,,,,,,,   ,,,,QQQ,,,,,T,,,V",
      ",,,,,,,,,,,,,,   ,,,,QQQ,,,,,,,,,V",
      ",,,,T,,,,,,,,,ooo,,,,,,,,,,%,,,,,V",
      ",,,,,,,,,,,,,,   ,,,,,,,,,,,,,,,,V",
      "V,,,,,,,,,,,,,   ,,,,,,,T,,,,,,,,,",
      "V,,,%,,,,,,,,,   ,,,,,,,,,,,,,,,,,",
      "V,,,,,,,T,,,,,   ,,,T,,,,,,,,%,,,V",
      "VT,,,,,,,,,,,T   T,,,,,,,,,,,,,,TV",
      "##############   #################",
    ],
    entries: { from_world: [1, 7, 'right'], from_area2: [32, 9, 'left'] },
    exits: [
      { at: [0, 6, 1, 3], run: toWorld },
      { at: [33, 9, 1, 2], to: 'side_forest_2', entry: 'from_area1' },
    ],
    npcs: [bugNpc('bug1', 4, 5), bugNpc('bug2', 8, 10), bugNpc('bug3', 10, 3)],
    // three pitcher flowers growing up out of the ravine, their mouths at ground level; the Large Flytrap in the grass
    objects: [pitcher('a1', 14, 7, true), pitcher('a2', 15, 7, true), pitcher('a3', 16, 7, true), trap('t1', 22, 5)],
    items: [
      { at: [23, 5], item: 'supershot_st', id: 'c12b_af_supershot' },
      { at: [31, 1], item: 'spring_gun_clip', id: 'c12b_af_springgun' },
    ],
    triggers: [
      { at: [14, 7], on: 'talk', run: flowerStep('a1', 14, 7) },
      { at: [15, 7], on: 'talk', run: flowerStep('a2', 15, 7) },
      { at: [16, 7], on: 'talk', run: flowerStep('a3', 16, 7) },
      { at: [14, 1, 3, 6], on: 'talk', run: function* (s) { yield s.msg('A deep ravine splits the forest floor. The far side is too far to jump.'); } },
      // the Large Flytrap: its edges are safe, its mouth is not
      { at: [22, 5], once: false, run: function* (s) {
        const o = plant(s, 't1');
        s.hide('player'); s.sfx('hit');
        yield* shut(o, 1, 4);
        s.shake(3, 20);
        yield s.msg('SNAP! The Large Flytrap slams shut around you...');
        yield* shut(o, 0.5, 6); yield* shut(o, 1, 4);
        yield s.msg('...and spits you out, far away, with a disgusted gurgle.');
        yield s.goto('side_forest_1', 'from_world');
      } },
    ],
    onLoad: function (s) { resetForest(s, A1_FLOWERS); },
    onEnter: function* (s) {
      if (s.flag('c12b_af_intro')) return;
      s.set('c12b_af_intro');
      yield s.msg('A primeval forest, untouched for ages.\nStrange plants sway although there is no wind.');
      yield s.say('cloud', "(Giant flowers, huge bugs... Nothing here grows the way it should.)");
    },
  });

  // ------------------------------------------------------------------ Area 2: stamen, catapult, beehive
  const A2_BLOCK = [[14, 4], [32, 7], [28, 12]];
  FF7.defineMap('side_forest_2', {
    name: 'Ancient Forest', area: 'Ancient Forest', theme: 'jungle', music: 'ahead',
    look: { sky: ['#0a1a08', '#2a4a20'] },
    legend: { p: 'flowers', Q: 'tallgrass', Y: 'hollowtree' },
    battle: { table: 'ancient_forest_outside', bg: 'forest' },
    grid: [
      "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "VVVVVVVVVVVVVVVTTTTVVVVVVTTTTVVVVVVV",
      "VV,,,,,,,,,,Y,,TTTT,,,,,TTTTT,,,,VVV",
      "VV,,,,,,,,,,,,,TTTT,,,,,TTTTT,,,,VVV",
      "VV,,,,,,,,,,,,pTTTT,,,,,TTTTT,,,,VVV",
      "VV,,,,,,,,,,,,,TTTT,,,,,TTTTT,,,,VVV",
      "V,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T,V",
      "V,,,,,,,,,,,,,,,,,,,,,,,,Y,,,,,,pT,V",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,T,,",
      "V,,,,,,,,,,,,,,,,,,,,,,,,,,,TTTTTT,V",
      "V,,,,,%,,,,,,,,,,,,,,,,,,,,,T,,,,T,V",
      "V,,,,,,,,,,,,,,,,,,,,,,,,,,,Q,,,,T,V",
      "####################################",
    ],
    heights: [
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "004444444444444000000666660000066660",
      "004444444444444000000666660000066660",
      "004444444444444000000666660000066660",
      "004444444444444000000666660000066660",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
      "000000000000000000000000000000000000",
    ],
    entries: { from_area1: [1, 8, 'right'], from_area3: [34, 8, 'left'], from_treetops: [30, 3, 'down'] },
    exits: [
      { at: [0, 8, 1, 2], to: 'side_forest_1', entry: 'from_area2' },
      { at: [35, 8, 1, 2], to: 'side_forest_3', entry: 'from_area2' },
    ],
    npcs: [
      bugNpc('bug4', 5, 3),
      bugNpc('bug5', 19, 11),
      { id: 'hive', name: 'Beehive', model: HIVE, at: [22, 3], dir: 'down', faceOnTalk: false, talk: pickUp('hive', 'hive') },
    ],
    objects: [pitcher('c2a', 14, 4), pitcher('c2b', 32, 7), trap('f2', 28, 12)],
    props: [{ at: [8, 5.6], prop: 'stamen', top: 3.4, bottom: 0.9 }],
    items: [
      { at: [31, 11], materia: 'slash_all', id: 'c12b_af_slashall' },
      { at: [31, 3], item: 'minerva_band', id: 'c12b_af_minerva' },
    ],
    triggers: [
      // stamen up to the west ledge (and back down)
      { at: [7, 5, 3, 2], on: 'talk', run: swing(4, 7, 5, { up: 'A long pink stamen dangles from the canopy. Grab it and swing up?', down: 'Swing back down on the stamen?' }) },
      // the beehive perch and the treetop nook: drop down only
      { at: [21, 5, 5, 2], on: 'talk', run: swing(4, 7, 5, { noUp: 'That perch is far too high to climb.' }) },
      { at: [29, 5, 4, 2], on: 'talk', run: swing(4, 7, 5, { noUp: 'Something glitters up in the treetops, far out of reach.' }) },
      { at: [12, 2], on: 'talk', run: hollowTree('t2a', 12, 3) },
      { at: [25, 7], on: 'talk', run: hollowTree('t2b', 25, 8) },
      { at: [14, 4], on: 'talk', run: flowerCatapult('c2a', 14, 4, function* (s) {
        s.sfx('jump');
        yield s.jump('player', 22, 4, 2.4, 40);
        yield s.msg('BOING! The frog kicks off and flings you up onto a high perch.');
      }) },
      { at: [32, 7], on: 'talk', run: flowerCatapult('c2b', 32, 7, function* (s) {
        s.sfx('jump');
        yield s.jump('player', 34, 8, 2.4, 40);
        yield s.msg('The frog launches you clean over the thicket!');
      }) },
      { at: [28, 12], on: 'talk', run: flytrap('f2', 28, 12) },
      { at: [33, 6, 1, 4], on: 'talk', run: function* (s) {
        const pl = s.actor('player');
        if (pl && pl.tx >= 34) {
          const c = yield s.ask(null, 'Push back through the thicket?', ['Push through', 'Stay']);
          if (c === 0) s.place('player', 31, 8, 'left');
          return;
        }
        yield s.msg('A wall of thorny trunks. Something would have to throw you over it.');
      } },
    ],
    onLoad: function (s) { resetForest(s, A2_BLOCK); },
  });

  // ------------------------------------------------------------------ Area 3: the treetops
  const A3_BLOCK = [[21, 12], [27, 10], [31, 11]];
  FF7.defineMap('side_forest_3', {
    name: 'Ancient Forest', area: 'Ancient Forest', theme: 'jungle', music: 'ahead',
    look: { sky: ['#0a1a08', '#2a4a20'] },
    legend: { p: 'flowers', Q: 'tallgrass', Y: 'hollowtree', o: 'liftpad' },
    battle: { table: 'ancient_forest_outside', bg: 'forest' },
    grid: [
      "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "VKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKV",
      "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKV",
      "VKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKV",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T,,,,,,,,,,,,,,,,,TT,,,,,,,T,,,,~R",
      "T,,,,,,,,,,,,,,,,,TT,,,,,,,T,,Y,~R",
      ",,,,,,,,%,,,,,,,,,TT,,,,,,,T,,,,~R",
      ",,,,,,,,,,,,,,,,,,TT,,,,,,,Q,,,,~R",
      "T,,,,,,,,,,,,,,,,,TT,,,,,,,T,,,p~R",
      "T,,,,,,T,,,,,,,,,,TT~o~,,,,T,,,,~R",
      "T,,,,,,,,,,,,,,,,,TT~,~,,,,T,,,,~R",
      "##################################",
    ],
    heights: [
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0888888888888888888888888888888880",
      "8888888888888888888888888888888880",
      "0888888888888888888888888888888880",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
      "0000000000000000000000000000000000",
    ],
    entries: { from_area2: [1, 9, 'right'] },
    exits: [
      { at: [0, 9, 1, 2], to: 'side_forest_2', entry: 'from_area3' },
      { at: [0, 3, 1, 1], to: 'side_forest_2', entry: 'from_treetops',
        run: function* (s) { yield s.msg('You clamber down a thick vine into a hidden hollow of the canopy below...'); yield s.goto('side_forest_2', 'from_treetops'); } },
    ],
    npcs: [
      bugNpc('bug6', 23, 9),
      bugNpc('bug7', 29, 13),
      { id: 'hive3', name: 'Beehive', model: HIVE, at: [21, 13], dir: 'up', faceOnTalk: false, talk: pickUp('hive', 'hive3') },
    ],
    objects: [pitcher('s3', 21, 12, true), trap('f3', 27, 10), pitcher('c3', 31, 11)],
    props: [{ at: [9, 6.6], prop: 'stamen', top: 3.4, bottom: 0.9 }, { at: [22, 6.6], prop: 'vinerope', top: 3.2, bottom: 0.4 }],
    items: [{ at: [32, 3], materia: 'typhoon', id: 'c12b_af_typhoon' }],
    triggers: [
      // stamen from the west clearing up to the treetops
      { at: [8, 5, 3, 2], on: 'talk', run: swing(4, 7, 4, { up: 'A huge stamen droops down from the canopy. Grab it and let it fling you up?', down: 'Slide back down the stamen?' }) },
      // rope between the treetops and the hidden clearing
      { at: [21, 5, 3, 2], on: 'talk', run: swing(4, 7, 4, { up: 'A rope of twisted vines hangs down. Climb back up to the treetops?', down: 'A rope of twisted vines hangs down into a clearing. Climb down?' }) },
      { at: [21, 12], on: 'talk', run: flowerStep('s3', 21, 12) },
      { at: [27, 10], on: 'talk', run: flytrap('f3', 27, 10) },
      { at: [30, 8], on: 'talk', run: hollowTree('t3', 30, 9) },
      { at: [31, 11], on: 'talk', run: flowerCatapult('c3', 31, 11, function* (s) {
        s.sfx('jump');
        yield s.jump('player', 33, 9, 2.4, 36);
        yield s.msg('The frog hurls you across the stream, straight into the mouth of a cave!');
        yield s.goto('side_forest_cave', 'from_forest');
      }) },
      { at: [32, 7, 2, 7], on: 'talk', run: function* (s) { yield s.msg('Across the stream, a dark cave mouth yawns in the rock. The water is too wide to jump.'); } },
    ],
    onLoad: function (s) { resetForest(s, A3_BLOCK); },
  });

  // ------------------------------------------------------------------ Area 4: the cave
  FF7.defineMap('side_forest_cave', {
    name: 'Ancient Forest - Cave', area: 'Ancient Forest', theme: 'cave', music: 'ahead',
    look: { floor: ['#3a4a30', '#34442a'], wall: '#4a5a3a' },
    battle: { table: 'ancient_forest_cave', bg: 'cave' },
    grid: [
      "########################",
      "####RRRRRRRRRRRRRRRR####",
      "###RR,,,,,RR,,,,,,,RR###",
      "##RR,,,,,,,,,,,,,,,,RR##",
      "##R,,,T,,,,,,,,,,,,,,R##",
      "##R,,,,,,,,,RRR,,,,,,R##",
      "##RR,,,,,,,RR RR,,,,RR##",
      "###R,,,,,,,,RRR,,,,,R###",
      "###RR,,,,,,,,,,,,,,RR###",
      "####RR,,,,,,,,,,,,RR####",
      "######RR,,,,,,,,RR######",
      "########RR,,,,RR########",
      "##########,,,,##########",
    ],
    entries: { from_forest: [7, 3, 'down'], from_world: [11, 11, 'up'] },
    exits: [{ at: [10, 12, 4, 1], run: toWorld }],
    items: [
      { at: [16, 3], item: 'apocalypse', id: 'c12b_af_apocalypse' },
      { at: [5, 8], item: 'elixir', id: 'c12b_af_elixir' },
    ],
    lights: [[16, 3, '#c0ff80', 3]],
    onEnter: function* (s) {
      if (s.entry() !== 'from_forest' || s.flag('c12b_af_cave')) return;
      s.set('c12b_af_cave');
      yield s.msg('You tumble into a quiet cave. Daylight glows at its far end...\nand something gleams deep inside.');
    },
  });

  // ================================================================== MATERIA CAVES
  function materiaCave(id, loc, name, materia, look, colors, extra) {
    WM.link(loc, { map: id, entry: 'from_world', priority: 1, if: linkIf(() => reach(colors) || (extra && extra())) });
    WM.link(loc, { run: function* (s) { yield s.msg('A small cave mouth in the rock.\nThe ground around it is impossible to reach without a special chocobo.'); } });
    FF7.defineMap(id, {
      name, area: 'Materia Cave', theme: 'cave', music: 'lurking', look,
      grid: [
        "######################",
        "#####RRUUUUUUUURR#####",
        "####RRU........URR####",
        "###RRU....^^....URR###",
        "##RRU....U..U....URR##",
        "##RU...............UR#",
        "##R..U...........U..R#",
        "##RR..............RR##",
        "###RR....U...U...RR###",
        "####RRR........RRR####",
        "#######R......R#######",
        "########......########",
      ],
      heights: [
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000333333330000000",
        "0000000000330000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
        "0000000000000000000000",
      ],
      lights: [[10.5, 2, look.glow || '#80c0ff', 5]],
      entries: { from_world: [10, 10, 'up'] },
      exits: [{ at: [8, 11, 6, 1], run: toWorld }],
      items: [{ at: [10, 2], materia, id: id + '_materia' }],
      triggers: [
        { at: [6, 1, 10, 1], on: 'talk', run: function* (s) { yield s.msg('Crystals line the walls, humming with a faint light.'); } },
      ],
      onEnter: function* (s) {
        if (s.flag(id + '_seen')) return;
        s.set(id + '_seen');
        yield s.msg('Deep inside the little cave, a single materia rests on a crystal ledge, shining softly.');
      },
    });
  }
  // (FF7's spot: the islands west then north of Mideel, in a shallow channel: blue, black or gold only)
  materiaCave('side_cave_quadra', 'materia_cave_e', 'Materia Cave', 'quadra_magic',
    { floor: ['#4a4450', '#443e4a'], wall: '#5a5068', glow: '#ff9060' }, ['blue', 'black', 'gold']);
  materiaCave('side_cave_mime', 'materia_cave_w', 'Materia Cave', 'mime',
    { floor: ['#44505a', '#3e4a54'], wall: '#506070', glow: '#ffe060' }, ['green', 'black', 'gold']);
  materiaCave('side_cave_hpmp', 'materia_cave_n', 'Materia Cave', 'hp_mp',
    { floor: ['#6a5a44', '#62523e'], wall: '#7a6450', glow: '#ff80ff' }, ['black', 'gold']);

  // ------------------------------------------------------------------ Round Island: Knights of the Round
  WM.link('round_island', { run: function* (s) { yield s.msg('A ring of towering peaks shelters a quiet green meadow.\nIn the eastern cliffs, a cave mouth glitters with golden light.'); } });
  WM.link('knights_of_round', { map: 'side_cave_kotr', entry: 'from_world', priority: 1, if: linkIf(() => reach(['gold'])) });
  WM.link('knights_of_round', { run: function* (s) { yield s.msg('A cave glitters in the cliffs of the island.\nOnly a golden chocobo could cross the sea and the peaks to reach it.'); } });
  FF7.defineMap('side_cave_kotr', {
    name: 'Round Island Cave', area: 'Materia Cave', theme: 'crater', music: 'lurking',
    look: { floor: ['#6a6040', '#62583a'], wall: '#8a7a50', trim: '#4a3a18', mako: '#ffe080' },
    grid: [
      "##########################",
      "#######UUUUUUUUUUUU#######",
      "#####UUU..........UUU#####",
      "####UU..U...::...U..UU####",   // (the ring of crystal is open to the north: the materia can be reached)
      "###UU......*..*......UU###",
      "###U..U.....^^.....U..U###",
      "##UU..................UU##",
      "##U...U............U...U##",
      "##UU..................UU##",
      "###UU....U......U....UU###",
      "####UUU............UUU####",
      "######UUU........UUU######",
      "#########........#########",
      "##########......##########",
    ],
    heights: [
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000444444444400000000",
      "00000000444444444400000000",
      "00000000444444444400000000",
      "00000000000022000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
      "00000000000000000000000000",
    ],
    lights: [[12.5, 3, '#ffe080', 6], [6, 7, '#80c0ff', 3], [19, 7, '#80c0ff', 3]],
    entries: { from_world: [12, 12, 'up'] },
    exits: [{ at: [10, 13, 6, 1], run: toWorld }],
    items: [{ at: [12, 2], materia: 'knights_of_round', id: 'side_cave_kotr_materia' }],
    onEnter: function* (s) {
      if (s.flag('c12b_kotr_seen')) return;
      s.set('c12b_kotr_seen');
      yield s.msg('Golden light pours from a circle of crystal at the heart of the cave.\nThe air itself seems to hum... as if a host of knights stood waiting.');
    },
  });

  // ================================================================== GOBLIN ISLAND
  WM.link('goblin_island', { map: 'side_goblin_isle', entry: 'from_world', if: linkIf(() => true) });
  FF7.defineMap('side_goblin_isle', {
    name: 'Goblin Island', area: 'Goblin Island', theme: 'forest', music: 'ahead',
    battle: { table: 'wm_goblin_island', bg: 'forest', rate: 1.3 },
    grid: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TTTTT,,TTTTTTTTTTT,,,TTTTT",
      "TTT,,,,,,,TTTT,,,,,,,,,TTT",
      "TT,,,%,,,,,,,,,,,,,T,,,,TT",
      "T,,,,,,,,,,,Y,,,,,,,,,%,,T",
      "T,,T,,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,%,,,,,,,,,T,,,,,,T",
      "TT,,,,,,,,,,,,,,,,,,,,,,TT",
      "TTT,,,,T,,,,,,,,,,,,%,,TTT",
      "TTTTT,,,,,,,,,,,,,,,,TTTTT",
      "TTTTTTTT,,,,,,,,,,TTTTTTTT",
      "TTTTTTTTTT,,,,,,TTTTTTTTTT",
    ],
    entries: { from_world: [12, 10, 'up'] },
    exits: [{ at: [10, 11, 6, 1], run: toWorld }],
    triggers: [
      { at: [12, 4], on: 'talk', run: function* (s) { yield s.msg('An old tree stump, gnawed all over by small, sharp teeth.\nA scatter of nut shells lies around it.'); } },
    ],
    onEnter: function* (s) {
      if (s.flag('c12b_goblin_seen')) return;
      s.set('c12b_goblin_seen');
      yield s.msg('A dense little forest on a lonely island.\nSomething giggles and scurries away through the undergrowth...');
    },
  });
})();

// Runner plan, Chapter 5a (docs/RUNNER.md): out of Midgar across the wasteland to Kalm, the
// Nibelheim flashback (Cloud's story, five years ago), the aftermath and the PHS, then every treasure
// in Kalm. Handoff: c5a_flashback_done (the party may leave Kalm); C5b starts at the Chocobo Farm.
//
// Items (the guides' checklist, Walkthrough {9}): Megalixir (the inn cabinet, five checks), Ether x3
// (house next to the inn / the clock house cabinet / the far house), Peacemaker (the tower house chest),
// Guard Source (the girl's cabinet), plus the flashback's "Orthopedic Underwear" drawer (no real item).
// Enemy Skill: Matra Magic from the Custom Sweepers in the Midgar wasteland (the Walkthrough's tip),
// when an Enemy Skill materia is equipped.
// Choices: the piano is played (Do Re Mi Ti La Do Re Mi So Fa Do Re Do) and Tifa hears "Yeah, I jammed
// on it" (Perfect Game Note 6); the Mako woman gets "You're full of it" and the girl "Yeah, maybe"
// (date points for Aeris and Tifa); Barret gets "Right". Party after the flashback: Cloud, Tifa, Barret.
//
// This file also defines the helper ops shared by C5a, C5b and C6a (plan_c5a.js loads first):
//   ['c5a_grind', cond, { world: [x, y], terrain: 'fw', region, spots: [[x, y], [x, y]], maxBattles, soft, heal, stopMap }]
//        fight random battles here (or on the world map near tile x, y, on the given terrain codes and region,
//        or back and forth between two given tiles) until cond holds
//   ['c5a_worldTo', x, y, { flee }]  walk to a world tile, running from random battles with flee
//        until cond holds
//   ['c5a_learn', eskillId, { world, terrain, spare: [enemyIds], all, maxBattles }]
//        learn an Enemy Skill (the E.Skill materia of the active party): the enemies that know it are left
//        alone ({ learn }; with `all`, until every E.Skill materia knows it, by sparing `spare` enemies)
//   ['c5a_use', itemId, charId]      use an item from the bag on a character if there is one (sources)
//   ['c5a_mat', charId, [materiaIds]]   put these materia on the character (from stock or from another
//        character), weapon slots first; materia that are missing are skipped with a note
(function () {
  const R = FF7.runner, O = R.ops;
  const D8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const mod = (a, n) => ((a % n) + n) % n;

  // ---------------------------------------------------------------- shared helpers (C5a, C5b, C6a)
  const C5 = R.c5 = R.c5 || {};
  // an Enemy Skill materia equipped on the active party
  C5.eskillOn = () => FF7.sys.party.active().some(c => FF7.sys.materia.equippedList(c).some(m => m.id === 'enemy_skill'));
  // every owned Enemy Skill materia knows it (all: true) / any of them does
  C5.eskillMateria = function () {
    const st = FF7.state, out = [];
    st.materia.forEach(m => { if (m && m.id === 'enemy_skill') out.push(m); });
    Object.values(st.chars).forEach(c => FF7.sys.materia.equippedList(c).forEach(m => { if (m.id === 'enemy_skill') out.push(m); }));
    return out;
  };
  C5.knows = (id, all) => { const L = C5.eskillMateria(); return all ? L.length > 0 && L.every(m => (m.eskills || []).includes(id)) : L.some(m => (m.eskills || []).includes(id)); };
  C5.activeKnows = (id) => FF7.sys.party.active().every(c => FF7.sys.materia.equippedList(c).filter(m => m.id === 'enemy_skill').every(m => (m.eskills || []).includes(id)));

  // out of Potions and someone is still hurt: a Tent on the world map (as a player would), when there is one
  C5.tent = function* (below) {
    const hurt = FF7.sys.party.active().some(c => c.hp <= 0 || c.hp < c.maxHp * below);
    if (!hurt || R.where() !== 'world' || !FF7.sys.inv.has('tent')) return true;
    if (['hi_potion', 'potion', 'x_potion'].some(i => FF7.sys.inv.has(i)) && FF7.sys.party.active().every(c => c.hp > 0)) return true;
    const r = yield* O.useItem('tent', FF7.state.party[0]);
    if (r !== true) R.note('tent: ' + r);
    return true;
  };
  // ['c5a_rest']: on the world map, a Tent when the party is worn down (below `below` of their HP)
  O.c5a_rest = function* (below) {
    const b = typeof below === 'number' ? below : 0.6;
    if (!FF7.sys.party.active().some(c => c.hp <= 0 || c.hp < c.maxHp * b)) return true;
    if (R.where() !== 'world' || !FF7.sys.inv.has('tent')) return yield* O.heal({ below: b });
    return yield* O.useItem('tent', FF7.state.party[0]);
  };

  // world tiles near (ax, ay) the party can pace on: walkable, not a location, terrain in `ter`
  function paceSpots(ws, ax, ay, ter, region) {
    const Dw = R.worldD(), E = R.entries();
    const regionAt = (x, y) => Dw.regions.legend[Dw.regions.rows[mod(y, Dw.h)][mod(x, Dw.w)]];
    const ok = (x, y) => { const k = mod(x, Dw.w) + ',' + mod(y, Dw.h); if (E[k]) return false; if (ter && !ter.includes(Dw.rows[mod(y, Dw.h)][mod(x, Dw.w)])) return false; if (region && regionAt(x, y) !== region) return false; return R.worldCan(ws, ws.vehicle, x, y); };
    let best = null, bd = Infinity;
    for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
      const x = ax + dx, y = ay + dy; if (!ok(x, y)) continue;
      const pair = [[2, 0], [0, 2], [-2, 0], [0, -2], [2, 2], [-2, 2]].map(([px, py]) => [x + px, y + py]).find(([px, py]) => ok(px, py) && ok((x + px) >> 1, (y + py) >> 1));
      if (!pair) continue;
      const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = [[x, y], pair]; }
    }
    return best;
  }
  // ['c5a_grind', cond, { world: [x, y], terrain, maxBattles, soft, heal, stopMap }]
  O.c5a_grind = function* (cond, o = {}) {
    if (R.cond(cond)) return true;
    const b00 = R.stats.battles, map0 = R.where();
    let b0 = b00, lastB = R.frames, side = 0, spots = null;
    while (!R.cond(cond)) {
      if (o.maxBattles && R.stats.battles - b00 >= o.maxBattles) { const m = 'grind: ' + o.maxBattles + ' battles and still not ' + R.stepText([cond]); if (o.soft) { R.note(m); return true; } return m; }
      if (R.frames - lastB > (o.noBattle || 24000)) { const m = 'grind: no battles on ' + R.where(); if (o.soft) { R.note(m); return true; } return m; }
      if (R.stats.battles !== b0) { b0 = R.stats.battles; lastB = R.frames; yield* O.heal({ below: o.heal || 0.5 }); yield* C5.tent(o.heal || 0.5); yield* R.settle(2); continue; }
      if (R.where() !== map0) { if (o.stopMap) return true; const m = 'grind: left ' + map0 + ' for ' + R.where(); if (o.soft) { R.note(m); return true; } return m; }
      const fs = R.field(), ws = R.worldScene();
      if (ws) {
        if (!spots) {
          const a = o.world || [Math.floor(ws.px), Math.floor(ws.pz)];
          spots = o.spots || paceSpots(ws, a[0], a[1], o.terrain, o.region);
          if (!spots) return 'grind: nowhere to pace near ' + a.join(',');
          const r0 = yield* R.walkWorld([spots[0]]);
          if (r0 !== true) { if (r0 === 'mapchanged') continue; return 'grind: ' + r0; }
        }
        const r = yield* R.walkWorld([spots[side++ % 2]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return 'grind: ' + r;
      } else if (fs) {
        const p = fs.player, pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !(fs.map.triggers || []).some(t => !t.on && fs.inRect(t.at, x, y)));
        if (!pairs.length) return 'grind: no room to pace here';
        const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return 'grind: ' + r;
      } else yield;
    }
    return true;
  };
  // walks to tile x,y a few tiles at a time, patching the party up (below o.heal) after any fight on the way
  // (Cloud alone meets two packs of Capparwires in a row often enough)
  const hops = function* (x, y, o) {
    for (let t = 0; t < 12; t++) {
      const ws = R.worldScene(); if (!ws) return 'mapchanged';
      const x0 = Math.floor(ws.px), y0 = Math.floor(ws.pz);
      if (x0 === x && y0 === y) return true;
      const path = R.worldPath(ws, x0, y0, [[x, y]], ws.vehicle);
      if (!path) return 'no path on the world map from ' + x0 + ',' + y0 + ' to ' + x + ',' + y;
      for (let k = Math.min(3, path.length - 1); k < path.length + 2; k += 3) {
        const h = path[Math.min(k, path.length - 1)], b0 = R.stats.battles;
        const r = yield* R.walkWorld([h], { anywhere: k < path.length - 1 });
        if (r !== true) return r;
        if (R.stats.battles !== b0) { yield* O.heal({ below: o.heal }); yield* C5.tent(o.heal); yield* R.settle(2); break; }   // replan from here
        if (k >= path.length - 1) return true;
      }
    }
    return 'hops: gave up';
  };
  // runs gen() answering "Leave it" when a walk over the world map passes a side place's tile (the sleeping
  // man's cave by the Mythril Mine asks to go in); other questions get their queued answers or the default
  C5.passBy = function* (gen) {
    const pass = { a: (ch) => { const i = ch.findIndex(c => /^Leave it/i.test(c)); return i >= 0 ? i : null; }, pc: -3 };
    R.choices.unshift(pass);
    try { return yield* gen(); } finally { R.choices = R.choices.filter(c => c !== pass); }
  };
  // ['c5a_worldTo', x, y, { flee, heal }]: walk (or drive) to a world-map tile; with flee, running from the
  // random battles on the way (the Junon woods' packs of five Capparwires); with heal, healing after each
  O.c5a_worldTo = function* (x, y, o = {}) {
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return 'worldTo: ' + g; yield* R.settle(3); }
    const keep = R.battleOpts;
    if (o.flee) R.battleOpts = Object.assign({}, keep, { flee: true });
    let r = true;
    try {
      r = yield* C5.passBy(function* () {
        let w = true;
        for (let t = 0; t < 4; t++) {
          w = o.heal ? yield* hops(x, y, o) : yield* R.walkWorld([[x, y]]);
          if (w !== 'mapchanged') break;
          if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
        }
        return w;
      });
    } finally { R.battleOpts = keep; }
    return r === true ? true : 'worldTo ' + x + ',' + y + ': ' + r;
  };
  // ['c5a_learn', eskill, { world, terrain, spare, spareTurns, all, maxBattles }]
  O.c5a_learn = function* (id, o = {}) {
    // (the master Enemy Skill materia - the copy that knows the most - learns it: on the party first)
    const done = () => (o.all ? C5.activeKnows(id) && R.masterKnows(id) : R.masterKnows(id));
    if (done()) return true;
    yield* R.mat.ensureMaster();
    if (!C5.eskillOn()) { R.note('learn ' + id + ': no Enemy Skill materia on the active party (skipped)'); return true; }
    const keep = R.battleOpts;
    R.battleOpts = Object.assign({}, keep, { learn: [id], learnTurns: o.learnTurns || 40 }, o.spare ? { spare: o.spare, spareTurns: o.spareTurns || 24 } : {});
    R.say('learning ' + id + ' (' + JSON.stringify(R.battleOpts) + ')');
    const r = yield* O.c5a_grind(done, Object.assign({ maxBattles: 30, soft: true }, o));
    R.battleOpts = keep;
    if (done()) R.say('learned ' + id); else R.note('learn ' + id + ': not learned');
    return r;
  };
  // ['c5a_use', item, char]: a source (or any field item) on a character, when the bag has one
  O.c5a_use = function* (id, ch) {
    if (!FF7.sys.inv.has(id)) return true;
    const r = yield* O.useItem(id, ch);
    if (r !== true) R.note('c5a_use ' + id + ' on ' + ch + ': ' + r);
    return true;
  };
  // ['c5a_mat', char, [ids]]: these materia onto the character (weapon slots first), from stock or taken
  // off another character; missing ones are noted. Uses the materia op (the menu, as a player would).
  O.c5a_mat = function* (ch, ids) {
    const st = FF7.state, c = st.chars[ch], M = FF7.sys.materia;
    if (!c || !st.members.includes(ch)) return true;
    for (const id of ids) {
      if (M.equippedList(c).filter(m => m.id === id).length >= ids.filter(x => x === id).length) continue;
      if (!st.materia.some(m => m.id === id)) {
        // take it off whoever has it (not a character that wants it too)
        const owner = Object.values(st.chars).find(o2 => o2 !== c && st.members.includes(o2.id) && M.equippedList(o2).some(m => m.id === id));
        if (!owner) { R.note('materia ' + id + ' for ' + ch + ': not owned'); continue; }
        const arrs = [['weapon', owner.weaponMateria], ['armor', owner.armorMateria]];
        for (const [slot, arr] of arrs) { const k = arr.findIndex(m => m && m.id === id); if (k >= 0) { const r0 = yield* O.materia(owner.id, null, { slot, index: k }); if (r0 !== true) R.note('materia off ' + owner.id + ': ' + r0); break; } }
      }
      if (!c.weaponMateria.some(m => !m) && !c.armorMateria.some(m => !m)) { R.note('materia ' + id + ' for ' + ch + ': no free slot'); continue; }
      const r = yield* O.materia(ch, id, c.weaponMateria.some(m => !m) ? 'weapon' : 'armor');
      if (r !== true) R.note('materia ' + id + ' for ' + ch + ': ' + r);
    }
    return true;
  };

  // ['c5a_walkTo', x, y, cond]: walk onto a step trigger and stop as soon as cond holds (a plain walk goes on
  // to its tile after the scene, and steps on the trigger again when the scene moved the player off it)
  O.c5a_walkTo = function* (x, y, cond) {
    if (R.cond(cond)) return true;
    const fs = R.field(); if (!fs) return 'walkTo: not on a field map';
    const ex = R.exitAt(fs, x, y);
    const g = R.walkField([[x, y]], Object.assign({ near: 0.12, anywhere: true }, ex ? { exitOk: ex } : {}));
    for (;;) {
      if (R.cond(cond)) { yield* R.settle(3); return true; }
      const r = g.next();
      if (r.done) { yield* R.settle(3); return R.cond(cond) ? true : 'walkTo ' + x + ',' + y + ': ' + (r.value === true ? 'arrived, but ' + R.stepText([cond]) + ' does not hold' : r.value); }
      yield;
    }
  };
  // ['c5a_shop', x, y, { buy, sell, choose, lenient, done }]: the shop op for a shop counter (a talk-trigger
  // or object on tile x, y) rather than a shopkeeper NPC
  O.c5a_shop = function* (x, y, spec = {}) {
    const listOf = (L) => (L || []).map(e => Array.isArray(e) ? { id: e[0], qty: e[1] == null ? 1 : e[1] } : { id: e, qty: 1 });
    R.shopTask = { buy: listOf(spec.buy), sell: listOf(spec.sell), closed: false };
    const r = yield* O.use(x, y, spec);
    const t = R.shopTask; R.shopTask = null;
    if (r !== true) return r;
    const failed = t.buy.concat(t.sell).filter(e => e.failed || !e.done);
    return failed.length && !spec.lenient ? 'shop: could not ' + failed.map(e => e.id).join(', ') : true;
  };

  // ---------------------------------------------------------------- start profile
  // The state C4's plan ends in (its c4_end checkpoint, C1-C4 chained): out of Midgar on the world map
  // (left_midgar), Cloud, Red XIII and Tifa walking to Kalm, Matra Magic already on the Enemy Skill materia
  // (a start profile can't set learned E.Skills, so the plan's first step learns it again here).
  R.starts.c5a = {
    world: { x: 250, y: 144 },
    members: ['cloud', 'barret', 'tifa', 'redxiii', 'aeris'], party: ['cloud', 'redxiii', 'tifa'],
    levels: { cloud: 14, barret: 13, tifa: 13, redxiii: 15, aeris: 9 },
    names: { cloud: 'Cloud', barret: 'Barret', tifa: 'Tifa', aeris: 'Aeris', redxiii: 'Red XIII' },
    flags: ['c1_train_talk', 'c1_bought_flower', 'c2_tifa_joined', 'c2_air_buster_beaten', 'c3_aeris_rejoined', 'c3_barret_joined',
      'c3_reno_beaten', 'c3_plate_fallen', 'c4_h0512_done', 'redxiii_joined', 'c4_eskill', 'c4_rufus_beaten', 'c4_bike',
      'c4_chase_done', 'c4_motorball_done', 'c4_decided', 'left_midgar'],
    vars: { aff_aeris: 1 },
    items: { potion: 10, phoenix_down: 5, ether: 10, grenade: 2, hyper: 1, echo_screen: 1, graviball: 1, ghost_hand: 3, turbo_ether: 1,
      elixir: 1, tranquilizer: 6, iron_bangle: 2, loco_weed: 8 },
    gil: 8618,
    equip: {
      cloud: { weapon: 'buster_sword', armor: 'mythril_armlet', accessory: 'protect_vest' },
      barret: { weapon: 'assault_gun', armor: 'four_slots', accessory: 'star_pendant' },
      tifa: { weapon: 'metal_knuckle', armor: 'titan_bangle', accessory: 'star_pendant' },
      redxiii: { weapon: 'mythril_clip', armor: 'mythril_armlet', accessory: 'talisman' },
      aeris: { weapon: 'guard_stick', armor: 'iron_bangle' },
    },
    materia: {
      cloud: [{ id: 'lightning', ap: 462 }, { id: 'elemental', ap: 60 }, 'enemy_skill', null],      // Buster Sword (2) + Mythril Armlet (2)
      barret: [null, { id: 'all', ap: 450 }, null, null, null, null],                                 // Assault Gun (2) + Four Slots (4)
      tifa: [null, { id: 'ice', ap: 172 }, { id: 'steal', ap: 502 }, null],                          // Metal Knuckle (2) + Titan Bangle (2)
      redxiii: [{ id: 'restore', ap: 544 }, { id: 'all', ap: 112 }, { id: 'fire', ap: 562 }, { id: 'poison', ap: 60 }, 'cover'],
      aeris: [{ id: 'lightning', ap: 450 }, null],
    },
    stock: ['sense'],
  };

  R.plans.c5a = [
    ['chapter', 'c5a', 'Chapter 5a: Kalm and the Nibelheim flashback'],
    ['expect', 'left_midgar'],                                      // the handoff from C4
    ['c5a_rest', 0.5],                                              // a Tent if the party left Midgar worn down
    ['battle', { limit: 'use' }],                                   // Limit Breaks as they come (new ones are learned by using them)

    // ---- the wasteland: Matra Magic from the Custom Sweepers (Walkthrough {9}, tip)
    ['obj', 'Learn Matra Magic from the Custom Sweepers'],
    ['c5a_learn', 'matra_magic', { world: [251, 142], terrain: 'w', maxBattles: 14 }],
    ['battle', { limit: 'use' }],
    ['heal', { below: 0.6 }],

    // ---- Kalm: the others wait at the inn
    ['obj', 'Meet the others at the inn in Kalm'],
    ['goto', 'kalm_gate'],
    ['expect', 'c5a_arrived'],
    ['goto', 'kalm_inn'],
    ['exit', 'kalm_inn_2f', { done: 'c5a_story_start' }],           // the meeting; Cloud tells his story
    ['expectMap', 'fb_truck'],

    // ---- five years ago: the Shinra truck (the Dragon), Nibelheim
    ['obj', 'Five years ago: talk to Sephiroth'],
    ['talk', 'sephiroth', { done: 'c5a_fb_truck' }],                 // the briefing, then the Dragon
    ['expectMap', 'fb_nibel'],
    ['expect', 'c5a_fb_arrived'],
    ['obj', 'Visit home, then turn in at the inn'],
    ['goto', 'fb_cloud_house'],
    ['talk', 'mom', { done: 'c5a_fb_mom' }],
    ['goto', 'fb_tifa_house'],
    // Tifa's piano: her melody, Do Re Mi Ti La / Do Re Mi So Fa / Do Re Do (Perfect Game Note 6)
    ['use', 13, 1, { done: 'c5a_piano_tune', choose: ['Play it', 0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0, 8] }],
    ['use', 19, 3, { done: 'c5a_fb_night' }],                       // the drawer: "Orthopedic Underwear"
    ['goto', 'fb_inn'],
    // the night, then the morning: Tifa the guide asks about her piano ("Yeah, I jammed on it"), the photo
    ['talk', 'sephiroth', { done: 'c5a_fb_night', choose: 'jammed on it' }],
    ['expectMap', 'fb_nibel'],
    ['expect', 'c5a_fb_morning'],

    // ---- Mt. Nibel: the bridge, the caves, the reactor
    ['obj', 'Climb Mt. Nibel to the reactor'],
    ['goto', 'fb_mt_path'],
    ['goto', 'fb_bridge'],
    ['walk', 14, 6, { done: 'c5a_fb_bridge' }],                     // the rope bridge gives way
    ['expectMap', 'fb_cave'],
    ['expect', 'c5a_fb_fall'],
    ['walk', 19, 5, { done: 'c5a_fb_fountain' }],                   // the Mako fountain
    ['goto', 'fb_reactor_path'],
    ['walk', 16, 8, { done: 'c5a_fb_door' }],                       // Tifa waits outside
    ['exit', 'fb_reactor', { done: 'c5a_fb_reactor' }],             // JENOVA; Sephiroth's doubt
    ['expectMap', 'fb_nibel'],
    ['expect', 'c5a_fb_reactor'],

    // ---- the Shinra Mansion, the library, Nibelheim burning
    ['obj', 'Find Sephiroth in the Shinra Mansion'],
    ['goto', 'fb_mansion'],
    ['goto', 'fb_mansion_base'],
    ['walk', 23, 8, { done: 'c5a_fb_library1' }],
    ['walk', 13, 8, { done: 'c5a_fb_library2' }],                   // the madness, then the fire
    ['expectMap', 'fb_nibel_fire'],
    ['expect', 'c5a_fb_fire_seen'],
    ['obj', 'Chase Sephiroth to the reactor'],
    ['goto', 'fb_reactor_path'],
    ['exit', 'fb_reactor', { done: 'c5a_fb_tifa' }],
    ['expect', 'c5a_fb_tifa'],
    // Jenova's chamber ends the story; back in Kalm: the aftermath, the PHS and the party
    ['party', ['cloud', 'tifa', 'barret'], { select: true }],
    ['choose', 'Right'],                                            // Barret: "Let's get goin'!"
    ['exit', 'fb_jenova', { done: 'c5a_fb_end' }],
    ['expectMap', 'kalm_inn_2f'],
    ['expect', 'c5a_flashback_done'],
    ['ckpt', 'c5a_flashback'],

    // ---- Kalm's treasures
    ['obj', 'Search Kalm'],
    ['use', 13, 8, { done: 'c5a_megalixir' }],                      // the cabinet, five times: Megalixir
    ['use', 13, 8, { done: 'c5a_megalixir' }],
    ['use', 13, 8, { done: 'c5a_megalixir' }],
    ['use', 13, 8, { done: 'c5a_megalixir' }],
    ['use', 13, 8, { done: 'c5a_megalixir' }],
    ['expect', 'c5a_megalixir', { soft: true }],
    ['goto', 'kalm_house_a'],
    ['use', 9, 4, { done: 'c5a_ether_a' }],                         // Ether (under the stairs)
    ['talk', 'mako_woman', { done: 'c5a_mako_asked', choose: "You're full of it" }],
    ['talk', 'loft_girl', { done: 'c5a_old_asked', choose: 'Yeah, maybe' }],
    ['goto', 'kalm_house_clock'],
    ['use', 6, 1, { done: 'c5a_ether_clock' }],                     // Ether (the cabinet upstairs)
    ['goto', 'kalm_house_tower'],
    ['chest', 'kalm_tower_peacemaker'],                             // Peacemaker (up the spiral stairs)
    ['use', 17, 1, { done: 'c5a_guard_source' }],                   // Guard Source (the girl's cabinet)
    ['goto', 'kalm_house_far'],
    ['use', 9, 4, { done: 'c5a_ether_far' }],                       // Ether (under the stairs)
    ['c5a_use', 'guard_source', 'cloud'],

    // ---- the weapon shop: the best upgrades the purse allows, keeping 1000 gil (the grass by the Chocobo
    // Farm pays for the Chocobo Lure; swords are not sold again until Junon)
    ['obj', 'Gear up at the Kalm weapon shop'],
    ['goto', 'kalm_weapon'],
    ['gear', { shop: 'keeper', keepGil: 1000, done: 'c5a_geared' }],
    ['js', (s) => { s.set('c5a_geared'); return true; }],
    ['autoMateria', { steal: 'tifa', eskill: ['barret'], all: false, done: 'c5a_materia' }],
    ['js', (s) => { s.set('c5a_materia'); return true; }],
    ['goto', 'kalm_item'],
    ['shop', 'keeper', { buy: [['potion', 15]], lenient: true, done: 'c5a_potions' }],   // Potions for the grass and the mine
    ['js', (s) => { s.set('c5a_potions'); return true; }],
    // a night at the inn (20 gil) before the grasslands
    ['goto', 'kalm_inn'],
    ['use', 2, 3, { choose: 'Stay', done: (s) => FF7.sys.party.active().every(c => c.hp >= c.maxHp && c.mp >= c.maxMp) }],   // the counter
    ['expect', 'c5a_flashback_done'],
    ['ckpt', 'c5a_end'],
  ];
})();

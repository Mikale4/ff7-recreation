// Runner plan, Chapter 12a: Optional A (Yuffie, chocobos, the Gold Saucer) (docs/RUNNER.md, "Chapter 12a notes").
// Starts at: Disc 3 under the Highwind at dawn (C11a's end: hw_dawn), before the Northern Cave. Ends with: back on
// the Highwind, flying, with a Gold chocobo in the stables (C12b rides it to the caves and Goblin Island).
// Route (the Breeding guide's way, in this game's rules: js/maps/c12/part1.js L.breed):
//   the morning on the Highwind (C11b's scene) -> the Mystery Ninja (only when Yuffie never joined) -> two stables
//   at the Chocobo Farm -> the Chocobo Sage (his name, the Enemy Skill materia downstairs, Sylkis Greens) ->
//   Carob Nuts (Vlakorados, the grassland south of the Sage) -> Great chocobos on the Mideel tracks -> a male and
//   a female in the stables, fed to ~76 km/h -> 2 wins each at Chocobo Square (C class) -> Carob Nut eggs
//   until a Blue and a Green of opposite sexes hatch -> 9 wins between them (C / B class) -> the Battle Square:
//   Sprint Shoes (the first full series), Omnislash (32000 BP) -> a Black chocobo (Carob Nut) -> Sylkis again,
//   Zeio Nuts (Goblin Island; Goblin Punch if a goblin casts it) -> a Wonderful chocobo (the Icicle tracks) of
//   the other sex -> 12 wins between Black and Wonderful -> the Battle Square again: W-Summon (64000 BP) ->
//   Speed Square: the Flayer -> Wonder Square's ???? prizes if the GP allow -> the Gold chocobo (Zeio Nut).
// Race prizes worth 300 GP or more are kept (Sprint Shoes, Precious Watch, Cat's Bell, Chocobracelet, Megalixir,
// materia); the rest are traded for the GP the Battle Square costs.
(function () {
  const R = FF7.runner, O = R.ops;
  const L = () => FF7.story.c12aLib;
  const birds = () => (L() ? L().chocobos() : []);
  const pen = () => (L() ? L().pen() : []);
  const inv = (id) => FF7.sys.inv.count(id);
  const mod = (a, n) => ((a % n) + n) % n;
  const LANDABLE = 'gsdnwxpch';
  // a stabled chocobo: a filter (runner chocobo.js: colour, name, { color, sex, rating... }) or a test function
  const find = (f) => (typeof f === 'function' ? birds().find(f) || null : R.choco ? R.choco.find(f) : null);
  const qText = (w) => (w && w.pages ? w.pages.map(p => p.join(' ')).join(' ') : '');
  let seq = 0;

  // ================================================================== small helpers
  // talk to an NPC with answers (strings / indexes / functions) queued for its questions, cleaned up after
  function* talkWith(npc, answers, o = {}) {
    const tag = 'c12a#' + (++seq);
    [].concat(answers).forEach(a => R.choices.push({ a, pc: tag }));
    try { return yield* O.talk(npc, o); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
  }
  // (the same for an object on a tile: O.use takes no answers of its own)
  function* useWith(x, y, answers) {
    const tag = 'c12a#' + (++seq);
    [].concat(answers).forEach(a => R.choices.push({ a, pc: tag }));
    try { return yield* O.use(x, y, {}); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
  }
  function* shopWith(npc, answers, spec) {
    const tag = 'c12a#' + (++seq);
    [].concat(answers).forEach(a => R.choices.push({ a, pc: tag }));
    try { return yield* O.shop(npc, spec); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
  }
  // a responder (one function answering every question of a dialogue), queued n times
  const many = (fn, n) => Array.from({ length: n || 30 }, () => fn);
  const inSaucer = () => /^gs_/.test(R.where() || '');
  // Choco Billy / Choco Bill (runner chocobo.js), leaving the Gold Saucer first (its only way down is the ropeway)
  function* farm(action, o) { const r = yield* O.c12a_leaveSaucer(); if (r !== true) return r; return yield* O.chocoboFarm(action, o); }
  const byName = (c) => ({ name: c.name });
  // ['c12a_farm', action, opts]: chocoboFarm (runner chocobo.js), from the Gold Saucer too
  O.c12a_farm = function* (action, o = {}) { return yield* farm(action, o); };
  const yellowGG = (c) => c.color === 'yellow' && (c.rating === 'great' || c.rating === 'good');
  const wins = (list) => list.reduce((n, c) => n + (c ? c.races || 0 : 0), 0);

  // ================================================================== getting around
  // ['c12a_at', x, y]: stand on world tile x, y on foot: walked to when it can be, else the Highwind flies to the
  // nearest tile it can land on from which x, y is walked to, and lands
  O.c12a_at = function* (x, y) {
    let r = yield* O.c12a_leaveSaucer(); if (r !== true) return r;
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return 'at: ' + g; yield* R.settle(3); }
    let ws = R.worldScene(); if (!ws) return 'at: not on the world map';
    const D = R.worldD(), W = D.w, H = D.h, E = R.entries();
    if (ws.vehicle === 'chocobo') { yield* O.dismount(); ws = R.worldScene(); }
    const here = () => [Math.floor(ws.px), Math.floor(ws.pz)];
    if (!ws.vehicle) {
      const [hx, hy] = here();
      if (mod(hx, W) === mod(x, W) && mod(hy, H) === mod(y, H)) return true;
      if (R.worldPath(ws, hx, hy, [[x, y]], null, { maxNodes: 80000 })) { r = yield* R.walkWorld([[x, y]], { anywhere: true }); return r === true ? true : 'at ' + x + ',' + y + ': ' + r; }
    }
    if (ws.vehicle !== 'highwind') { r = yield* O.c10_boardAirship(); if (r !== true) return 'at: ' + r; ws = R.worldScene(); }
    let land = null;
    for (let rad = 0; rad <= 9 && !land; rad++) {
      for (let dy = -rad; dy <= rad && !land; dy++) for (let dx = -rad; dx <= rad && !land; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const lx = mod(x + dx, W), ly = mod(y + dy, H);
        if (!LANDABLE.includes(D.rows[ly][lx]) || E[lx + ',' + ly]) continue;
        if (rad === 0 || R.worldPath(ws, lx, ly, [[x, y]], null, { maxNodes: 20000 })) land = [lx, ly];
      }
    }
    if (!land) return 'at: nowhere to land near ' + x + ',' + y;
    r = yield* R.fly(land[0], land[1]); if (r !== true) return 'at: ' + r;
    yield* R.pressWorld('ok');
    ws = R.worldScene();
    if (!ws || ws.vehicle) return 'at: could not land at ' + land.join(',');
    r = yield* R.walkWorld([[x, y]], { anywhere: true });
    return r === true ? true : 'at ' + x + ',' + y + ': ' + r;
  };

  // ['c12a_toSaucer', map]: up the ropeway from North Corel (a 1-day pass, 3000 gil, at the gate), then to map
  O.c12a_toSaucer = function* (map) {
    let r;
    if (!inSaucer()) {
      r = yield* O.world('north_corel'); if (r !== true) return 'saucer: ' + r;
      r = yield* O.goto('ncorel_ropeway'); if (r !== true) return 'saucer: ' + r;
      r = yield* talkWith('attendant', ['Ride up']); if (r !== true) return 'saucer: ' + r;
      r = yield* O.expectMap('gs_entrance'); if (r !== true) return 'saucer: ' + r;
    }
    if (!FF7.state.flags.c6a_gs_pass && !FF7.sys.inv.has('gold_ticket')) {
      if (R.where() !== 'gs_entrance') { r = yield* O.goto('gs_entrance'); if (r !== true) return 'saucer: ' + r; }
      // (the Gold Ticket, 30000 gil, when the gil allows: free entry for good, and FF7's key item)
      r = yield* talkWith('ticket_girl', [R.c12aTicket]); if (r !== true) return 'saucer: ' + r;
      if (!FF7.state.flags.c6a_gs_pass && !FF7.sys.inv.has('gold_ticket')) return 'saucer: no pass (' + FF7.state.gil + ' gil)';
    }
    if (map && R.where() !== map) { r = yield* O.goto(map); if (r !== true) return 'saucer: ' + r; }
    return true;
  };
  // the gate's answer: the Gold Ticket (30000 gil) while 30000 more would be left, else a 1-day pass
  R.c12aTicket = (choices) => { const i = choices.findIndex(c => /Gold Ticket/.test(c)); return i >= 0 && FF7.state.gil >= 60000 ? i : choices.findIndex(c => /1-day/.test(c)); };
  // ['c12a_leaveSaucer']: the ropeway back down to North Corel (the pass expires)
  O.c12a_leaveSaucer = function* () {
    if (!inSaucer()) return true;
    let r = yield* O.goto('gs_entrance'); if (r !== true) return 'leave saucer: ' + r;
    r = yield* talkWith('ropeway_man', ['Ride down']); if (r !== true) return 'leave saucer: ' + r;
    return yield* O.expectMap('ncorel_ropeway');
  };

  // ================================================================== the Chocobo Sage
  // ['c12a_buy', item, n, { keepGil }]: up to n in the bag, from the Chocobo Sage's shop, as far as the gil goes
  O.c12a_buy = function* (id, n, o = {}) {
    const price = (FF7.data.items[id] || {}).price || 1;
    const want = Math.min(n - inv(id), Math.floor((FF7.state.gil - (o.keepGil || 0)) / price));
    if (want <= 0) { if (inv(id) < n) R.note('buy: ' + id + ': ' + inv(id) + ' of ' + n + ' (gil ' + FF7.state.gil + ')'); return true; }
    let r = yield* O.c12a_leaveSaucer(); if (r !== true) return r;
    if (R.where() !== 'side_sage_house') { r = yield* O.world('chocobo_sage'); if (r !== true) return 'buy: ' + r; }
    r = yield* shopWith(FF7.state.flags.c12a_sage_named ? 'sage' : 'sage_unknown', ['Sell me something'], { buy: [[id, want]] });
    return r === true ? true : 'buy: ' + r;
  };
  // ['c12a_billyBuy', item, n, { keepGil }]: up to n in the bag from Choco Billy's shop (disc 2/3 stock: greens, nuts)
  O.c12a_billyBuy = function* (id, n, o = {}) {
    const price = (FF7.data.items[id] || {}).price || 1;
    const want = Math.min(n - inv(id), Math.floor((FF7.state.gil - (o.keepGil || 0)) / price));
    if (want <= 0) return true;
    let r = yield* O.c12a_leaveSaucer(); if (r !== true) return r;
    if (R.where() !== 'farm_stable') { r = yield* O.goto('farm_stable'); if (r !== true) return 'billyBuy: ' + r; }
    r = yield* shopWith('billy', [L() && L().stables() ? 'Greens, Chocobo Lure' : 'Buy greens', 'Buy greens'], { buy: [[id, want]] });
    return r === true ? true : 'billyBuy: ' + r;
  };
  // ['c12a_sageMemory']: ask the Sage what he remembers (a new memory 3-6 battles after the last one); Chole at the
  // farm writes them down later
  O.c12a_sageMemory = function* () {
    if ((FF7.state.vars.c12a_sage_stage || 0) >= 8) return true;
    if (R.where() !== 'side_sage_house') return true;
    return yield* talkWith(FF7.state.flags.c12a_sage_named ? 'sage' : 'sage_unknown', [(choices) => { const i = choices.findIndex(c => /Remember anything|What about that chocobo/.test(c)); return i >= 0 ? i : null; }]);
  };

  // ================================================================== battles for nuts
  // ['c12a_nuts', item, qty, [x, y], { max }]: random battles on that world tile (Steal set by a 'battle' step)
  // until the bag holds qty
  O.c12a_nuts = function* (id, qty, at, o = {}) {
    if (inv(id) >= qty) return true;
    let r = yield* O.c12a_at(at[0], at[1]); if (r !== true) return 'nuts: ' + r;
    r = yield* O.fightUntil({ item: id, qty }, { max: o.max || 30 });
    if (r !== true) return 'nuts: ' + r;
    return inv(id) >= Math.min(qty, o.need || 1) ? true : 'nuts: no ' + id + ' after ' + (o.max || 30) + ' battles';
  };

  // ================================================================== catching
  // ['c12a_lures']: both Chocobo Lure materia on the active party (the lure strength adds up: two Lv1-2 lures
  // give the tracks' chocobos 1 chance in 2 per encounter away from the farm and Junon), into free slots or over
  // the last armour slot
  O.c12a_lures = function* () {
    const st = FF7.state, M = FF7.sys.materia;
    const on = () => FF7.sys.party.active().reduce((n, c) => n + M.indepLevels(c, 'chocobo_lure').length, 0);
    const owned = () => st.materia.filter(m => m && m.id === 'chocobo_lure').length + st.members.reduce((n, id) => n + M.equippedList(st.chars[id]).filter(m => m && m.id === 'chocobo_lure').length, 0);
    for (let k = 0; k < 4 && on() < Math.min(2, owned()); k++) {
      const party = FF7.sys.party.active();
      const withFree = party.find(c => c.armorMateria.some(x => !x) || c.weaponMateria.some(x => !x));
      const c = withFree || party.slice().sort((a, b) => b.armorMateria.length - a.armorMateria.length)[0];
      const where = withFree ? (c.armorMateria.some(x => !x) ? 'armor' : 'weapon') : { slot: 'armor', index: c.armorMateria.length - 1 };
      if (st.materia.some(m => m && m.id === 'chocobo_lure')) yield* O.materia(c.id, 'chocobo_lure', where);
      else {
        const holder = st.members.map(id => st.chars[id]).find(x => x && !party.includes(x) && M.equippedList(x).some(m => m && m.id === 'chocobo_lure'));
        if (!holder) break;
        yield* O.moveMateria(holder.id, c.id, 'chocobo_lure', where);
      }
    }
    if (R.menus) yield* R.menus.finish();
    return on() ? true : 'lures: no Chocobo Lure on the party';
  };
  const CHEAP = ['curiel_greens', 'pahsana_greens', 'tantal_greens', 'krakka_greens', 'gysahl_greens'];
  // ['c12a_catch', { track, want: [ratings], count, max }]: on that chocobo track (FF7.data.world.chocoboTracks
  // index) until the farm's fence holds `count` birds of the wanted ratings. The rating shows in the monsters
  // that come with the bird (the Raising guide): a wanted one goes to the farm, any other is let go.
  O.c12a_catch = function* (o = {}) {
    const lib = L(), want = [].concat(o.want || ['great']);
    const have = () => pen().filter(p => want.includes(p.rating)).length;
    if (have() >= (o.count || 1)) return true;
    if (!lib.stables()) return 'catch: no stable rented (the fence keeps birds only for renters)';
    const t = (R.worldD().chocoboTracks || [])[o.track];
    if (!t) return 'catch: no chocobo track ' + o.track;
    // Curiel Greens for the wild birds (Choco Billy), when the bag runs low
    const cheap = () => CHEAP.reduce((n, id) => n + inv(id), 0);
    let r;
    if (cheap() < 10) { r = yield* O.c12a_billyBuy('curiel_greens', 20, { keepGil: 15000 }); if (r !== true) return 'catch: ' + r; }
    r = yield* O.c12a_at(t.x, t.y); if (r !== true) return 'catch: ' + r;
    r = yield* O.c12a_lures(); if (r !== true) return 'catch: ' + r;
    for (let n = 0; have() < (o.count || 1); n++) {
      if (n >= (o.max || 12)) return 'catch: only ' + have() + ' ' + want.join('/') + ' chocobos after ' + n + ' caught';
      // greens for the bird: the cheap ones bought for it (catchChocobo would throw the Sylkis Greens kept for
      // racing once they run out)
      if (!cheap()) {                              // out of them: Choco Billy's, and back to the tracks
        r = yield* O.c12a_billyBuy('curiel_greens', 16, { keepGil: 10000 }); if (r !== true) return 'catch: ' + r;
        if (!cheap()) return 'catch: no cheap greens left for the wild chocobos (' + FF7.state.gil + ' gil)';
        r = yield* O.c12a_at(t.x, t.y); if (r !== true) return 'catch: ' + r;
        r = yield* O.c12a_lures(); if (r !== true) return 'catch: ' + r;
      }
      const greens = CHEAP.find(id => inv(id) > 0);
      // the bird's rating shows in the monsters that came with it: a wanted one goes to the farm, any other is let
      // go. The plan runs no code during battles and dialogues, so the answer is a function the question calls, and
      // the formation is the engine's record of the last battle (R.lastBattle)
      R.choices = R.choices.filter(c => !c.c12a);
      R.choices.unshift({ c12a: true, pc: 'choco', a: (choices) => {
        if (!choices.some(c => /^Let it go/.test(c))) return null;
        const rating = lib.ratingOf((R.lastBattle && R.lastBattle.formation) || []), keep = want.includes(rating);
        R.say('chocobo: a ' + rating + ' one (' + (keep ? 'to the farm' : 'let go') + ')');
        const i = choices.findIndex(c => (keep ? /Chocobo Farm/ : /^Let it go/).test(c));
        return i >= 0 ? i : null;
      } });
      let res;
      try { res = yield* O.catchChocobo({ then: 'farm', track: o.track, tries: 12, greens }); } finally { R.choices = R.choices.filter(c => !c.c12a); }
      if (res !== true) return 'catch: ' + res;
    }
    R.say('chocobo fence: ' + pen().map(p => p.rating).join(', '));
    return true;
  };

  // ['c12a_chocobuckle', { track, max }]: the Enemy Skill Chocobuckle (Enemy-Skill FAQ): a wild chocobo that ate
  // Mimett (or Sylkis) Greens this battle and is then left at [Max HP / 32] + 1 HP or less, alive, answers with
  // Chocobuckle. The Mideel birds are level 36, a multiple of 4: Mimett Greens, then L4 Suicide (HP x 31/32) from
  // a fighter whose Enemy Skill materia knows it; the bird's Chocobuckle hits that fighter, then it runs off, and the
  // rest of the fight is won. Until the L4 Suicide is cast nobody else acts (so nothing ends the fight first). The
  // turns are the plan's own for this step only (the engine's battle option `turn`, restored after).
  O.c12a_chocobuckle = function* (o = {}) {
    const known = () => R.masterKnows('chocobuckle');
    if (known()) return true;
    const st = FF7.state, M = FF7.sys.materia;
    const l4 = () => st.party.filter(Boolean).some(id => M.equippedList(st.chars[id]).some(m => m && m.id === 'enemy_skill' && (m.eskills || []).includes('l4_suicide')));
    // (the master Enemy Skill materia learns it: on the party, and its holder casts the L4 Suicide the bird answers)
    yield* R.mat.ensureMaster();
    if (!l4()) { R.note('chocobuckle: no Enemy Skill materia in the party knows L4 Suicide'); return true; }
    let r;
    if (inv('mimett_greens') < 2) { r = yield* O.c12a_billyBuy('mimett_greens', 3, { keepGil: 10000 }); if (r !== true) return 'chocobuckle: ' + r; }
    const t = (R.worldD().chocoboTracks || [])[o.track != null ? o.track : 7];
    if (!t) return 'chocobuckle: no chocobo track ' + o.track;
    r = yield* O.c12a_at(t.x, t.y); if (r !== true) return 'chocobuckle: ' + r;
    r = yield* O.c12a_lures(); if (r !== true) return 'chocobuckle: ' + r;
    const keepOpts = R.battleOpts;
    R.battleOpts = Object.assign({}, keepOpts, { turn: (battle, p) => {
      const bird = p.isParty && battle.enemies.find(e => e.targetable && e.def0 && e.def0.chocobo && e.level % 4 === 0);
      if (bird && !known()) {
        const v = bird.vars || (bird.vars = {}), q = battle.queue.concat(battle.current ? [battle.current] : []);
        const feeding = q.some(a => a && a.type === 'item' && (a.targets || []).includes(bird));
        const mm = R.eskillMaster(), holder = !mm || (p.eskillMateria || []).includes(mm) || !battle.party.some(x => x.alive && (x.eskillMateria || []).includes(mm));
        const can = holder && !p.has('silence') && (p.abilities && p.abilities.eskills || []).includes('l4_suicide') && p.mp >= 10;
        if (!v.buckle && !feeding && inv('mimett_greens')) { R.say('chocobuckle: Mimett Greens for the chocobo'); return { actor: p, type: 'item', item: 'mimett_greens', targets: [bird], side: 'enemy' }; }
        if ((v.buckle || feeding) && !v._c12aL4 && can) { v._c12aL4 = true; R.say('chocobuckle: L4 Suicide'); return { actor: p, type: 'eskill', id: 'l4_suicide', targets: battle.enemies.filter(e => e.targetable), side: 'enemy', all: true }; }
        if (!v._c12aL4) return { actor: p, type: 'defend' };
      }
      return null;
    } });
    R.choices.unshift({ c12a: true, pc: 'choco', a: (choices) => { const i = choices.findIndex(c => /^Let it go/.test(c)); return i >= 0 ? i : null; } });
    let b0 = R.stats.battles, fought = 0, lastB = R.frames, side = 0;
    try {
      while (!known() && fought < (o.max || 30)) {
        if (R.stats.battles !== b0) { fought += R.stats.battles - b0; b0 = R.stats.battles; lastB = R.frames; yield* O.heal({ below: 0.5 }); continue; }
        if (R.frames - lastB > 30000) return 'chocobuckle: no battles on the tracks';
        if (!R.choices.some(c => c.c12a)) R.choices.unshift({ c12a: true, pc: 'choco', a: (choices) => { const i = choices.findIndex(c => /^Let it go/.test(c)); return i >= 0 ? i : null; } });
        const ws = R.worldScene(); if (!ws) { yield; continue; }
        if (ws.vehicle) { yield* O.dismount(); continue; }
        const tiles = R.choco.trackTiles(ws, t);
        if (!tiles.length) return 'chocobuckle: no walkable track tiles';
        const x = Math.floor(ws.px), y = Math.floor(ws.pz), goals = tiles.filter(([a, b]) => Math.abs(a - x) + Math.abs(b - y) >= 2);
        r = yield* R.walkWorld([goals[side++ % Math.max(1, goals.length)] || tiles[0]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return 'chocobuckle: ' + r;
        yield* R.settle(2);
      }
    } finally { R.battleOpts = keepOpts; R.choices = R.choices.filter(c => !c.c12a); }
    yield* O.heal({ below: 0.7 });
    if (!known()) R.note('chocobuckle: not learned in ' + fought + ' battles');
    return true;
  };

  // ================================================================== the stables
  // ['c12a_pair', { rating, track, count }]: a yellow male and female of that rating in the stables: the fence's
  // birds moved in (FF7 decides the sex then), same-sex extras let go, more caught when the fence runs dry
  O.c12a_pair = function* (o = {}) {
    const lib = L(), rating = o.rating || 'great';
    const isR = (c) => c.color === 'yellow' && c.rating === rating;
    const ok = () => { const g = birds().filter(isR); return g.some(c => c.sex === 'male') && g.some(c => c.sex === 'female'); };
    for (let round = 0; round < 8 && !ok(); round++) {
      const g = birds().filter(isR);
      for (const c of g.slice(1)) { const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'pair: ' + r; }
      if (!pen().some(p => p.rating === rating)) { const r = yield* O.c12a_catch({ track: o.track, want: [rating], count: o.count || 3 }); if (r !== true) return 'pair: ' + r; }
      if (lib.freeStables() === 0) { const r = yield* farm('rent', { n: 1 }); if (r !== true) return 'pair: ' + r; }
      const r = yield* farm('move', { min: rating }); if (r !== true) return 'pair: ' + r;
    }
    R.say('stables: ' + birds().map(c => lib.label(c)).join(' | '));
    return ok() ? true : 'pair: no ' + rating + ' male and female';
  };
  // ['c12a_gil', n, { max }]: random battles on the plain south of the Chocobo Sage (Vlakorados, Trickplays...) until the
  // gil reach n: the money for Sylkis Greens
  O.c12a_gil = function* (n, o = {}) {
    if (FF7.state.gil >= n) return true;
    let r = yield* O.c12a_leaveSaucer(); if (r !== true) return 'gil: ' + r;
    r = yield* O.c12a_at(202, 97); if (r !== true) return 'gil: ' + r;
    const g0 = FF7.state.gil;
    r = yield* O.fightUntil(() => FF7.state.gil >= n, { max: o.max || 45 });
    R.say('gil: ' + g0 + ' -> ' + FF7.state.gil + ' (for Sylkis Greens)');
    return r === true ? true : 'gil: ' + r;
  };
  // ['c12a_feed', filter, speed]: Sylkis Greens (then Reagan, then Mimett; more Sylkis from the Chocobo Sage when the bag
  // is empty) one at a time until the bird runs speed km/h (or as fast as it can)
  O.c12a_feed = function* (who, speed, o = {}) {
    for (let k = 0; k < 25; k++) {
      const c = find(who); if (!c) return 'feed: no chocobo ' + (typeof who === 'function' ? 'for ' + who : JSON.stringify(who));
      if (c.speed >= Math.min(speed, c.maxSpeed - 0.6)) return true;
      let g = ['sylkis_greens', 'reagan_greens', 'mimett_greens'].find(id => inv(id) > 0);
      if (!g) {
        // FF7's numbers: a Sylkis Green (the Chocobo Sage, 5000 gil) adds about a tenth of the bird's Dash; Billy's
        // Mimett Greens add a few points (a fraction of a km/h) for 1500 - so the Sage's, as players do
        const keep = o.keepGil || 6000;
        let n = Math.min(4, Math.floor((FF7.state.gil - keep) / 5000));
        if (n <= 0) {   // (Sylkis money first, as players earn it: battles on the Northern Continent's plain)
          const r0 = yield* O.c12a_gil(keep + 20000); if (r0 !== true) R.note('feed: ' + r0);
          n = Math.min(4, Math.floor((FF7.state.gil - keep) / 5000));
        }
        if (n <= 0) { R.note('feed: no greens and no gil left for ' + c.name + ' (' + Math.floor(c.speed) + ' km/h)'); return true; }
        const r = yield* O.c12a_buy('sylkis_greens', n, { keepGil: o.keepGil || 6000 });
        if (r !== true || !inv('sylkis_greens')) return 'feed: could not buy Sylkis Greens (' + r + ')';
        g = 'sylkis_greens';
      }
      const r = yield* farm('feed', { chocobo: byName(c), greens: g, qty: 1 });
      if (r !== true) return 'feed: ' + r;
      R.say('chocobo ' + c.name + ': ' + Math.floor(c.speed) + ' / ' + Math.floor(c.maxSpeed) + ' km/h');
    }
    return true;
  };
  // ['c12a_ready', [filters]]: random battles on the farm's grassland (away from its chocobo tracks) until those
  // birds may mate again (a few battles after hatching or laying)
  O.c12a_ready = function* (who) {
    const lib = L();
    const waiting = () => who.map(f => find(f)).filter(c => c && !lib.ready(c));
    if (!waiting().length) return true;
    let r = yield* O.c12a_at(302, 172); if (r !== true) return 'ready: ' + r;
    r = yield* O.fightUntil(() => !waiting().length, { max: 30 });
    return !waiting().length ? true : 'ready: ' + waiting().map(c => c.name).join(', ') + ' still not ready';
  };
  // mate a and b with a nut (they are made ready first; a free stable is rented when there is none)
  function* mate(a, b, nut) {
    const lib = L();
    if (!inv(nut)) return 'mate: no ' + nut;
    if (lib.freeStables() === 0) { if (lib.stables() >= 6) return 'mate: every stable is full'; const r = yield* farm('rent', { n: 1 }); if (r !== true) return 'mate: ' + r; }
    let r = yield* O.c12a_ready([byName(a), byName(b)]); if (r !== true) return r;
    const n0 = birds().length;
    r = yield* farm('mate', { a: byName(a), b: byName(b), nut });
    if (r !== true) return r;
    const baby = birds().length > n0 ? birds()[birds().length - 1] : null;
    R.say('chocobo egg: ' + (baby ? lib.label(baby) + ', ' + baby.color + ' ' + baby.rating + ', ' + Math.floor(baby.speed) + '/' + Math.floor(baby.maxSpeed) + ' km/h' : 'none'));
    return baby || 'mate: no egg';
  }

  // ['c12a_blueGreen']: Carob Nut eggs from the yellow Great / Good pair (4+ wins between them: always Blue or
  // Green) until a Blue and a Green of opposite sexes live in the stables; a baby that can't make that pair is let
  // go to free its stable (one is kept for the next egg)
  const bgPair = () => {
    const bl = birds().filter(c => c.color === 'blue'), gr = birds().filter(c => c.color === 'green');
    for (const b of bl) for (const g of gr) if (b.sex !== g.sex) return [b, g];
    return null;
  };
  O.c12a_blueGreen = function* (o = {}) {
    for (let k = 0; k < (o.max || 8) && !bgPair(); k++) {
      // the parents: the first Great / Good male and female that moved in (babies have later ids)
      const parents = birds().filter(yellowGG).sort((a, b) => a.id - b.id);
      const m = parents.find(c => c.sex === 'male'), f = parents.find(c => c.sex === 'female');
      if (!m || !f) return 'blueGreen: no Great / Good male and female';
      // the babies that can't pair: two of different colour or sex are kept (the next egg then pairs with one of
      // them 1 time in 2), the fastest of each kind; the rest are let go (yellow babies too)
      const kinds = new Set(), keep = [];
      birds().filter(c => c.color === 'blue' || c.color === 'green').sort((a, b) => b.maxSpeed - a.maxSpeed)
        .forEach(c => { const k = c.color + c.sex; if (!kinds.has(k) && keep.length < 2) { kinds.add(k); keep.push(c); } });
      for (const c of birds().filter(c => c !== m && c !== f && !keep.includes(c))) {
        const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'blueGreen: ' + r;
      }
      if (!inv('carob_nut')) { const r = yield* O.c12a_nuts('carob_nut', 3, [202, 97]); if (r !== true) return 'blueGreen: ' + r; }
      if (wins([m, f]) < 4) R.note('blueGreen: the parents have only ' + wins([m, f]) + ' wins (4 make a Blue or Green certain)');
      const baby = yield* mate(m, f, 'carob_nut');
      if (typeof baby === 'string') return 'blueGreen: ' + baby;
    }
    const p = bgPair();
    if (!p) return 'blueGreen: no Blue and Green pair after ' + (o.max || 8) + ' eggs';
    R.say('chocobo: Blue ' + p[0].name + ' (' + p[0].sex + ') and Green ' + p[1].name + ' (' + p[1].sex + ')');
    // the pair is the only Blue and Green left (the races and the Black egg go by colour)
    for (const c of birds().filter(c => (c.color === 'blue' || c.color === 'green') && !p.includes(c))) {
      const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'blueGreen: ' + r;
    }
    return true;
  };
  // ['c12a_black']: Blue x Green with a Carob Nut and 9+ wins between them: a Black chocobo (the Great parents
  // are let go first: their stables are needed)
  O.c12a_black = function* () {
    for (let k = 0; k < 3; k++) {
      if (birds().some(c => c.color === 'black')) return true;
      const p = bgPair(); if (!p) return 'black: no Blue and Green pair';
      if (wins(p) < 9) return 'black: the Blue and Green have ' + wins(p) + ' wins (9 needed)';
      for (const c of birds().filter(c => c.color === 'yellow')) { const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'black: ' + r; }
      if (!inv('carob_nut')) { const r = yield* O.c12a_nuts('carob_nut', 1, [202, 97]); if (r !== true) return 'black: ' + r; }
      const baby = yield* mate(p[0], p[1], 'carob_nut');
      if (typeof baby === 'string') return 'black: ' + baby;
      if (baby.color !== 'black') { const r = yield* farm('release', { chocobo: byName(baby) }); if (r !== true) return 'black: ' + r; }
    }
    return birds().some(c => c.color === 'black') ? true : 'black: no Black chocobo hatched';
  };
  // ['c12a_wonderful', { track, count }]: a yellow Wonderful chocobo of the Black one's other sex in the stables
  // (the Blue and Green are let go to make room; caught on the Icicle tracks, sexed when moved in)
  O.c12a_wonderful = function* (o = {}) {
    const lib = L();
    const black = () => birds().find(c => c.color === 'black');
    const isW = (c) => c.color === 'yellow' && c.rating === 'wonderful';
    const ok = () => black() && birds().some(c => isW(c) && c.sex !== black().sex);
    for (let k = 0; k < 8 && !ok(); k++) {
      if (!black()) return 'wonderful: no Black chocobo';
      for (const c of birds().filter(c => isW(c) && c.sex === black().sex)) { const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'wonderful: ' + r; }
      if (!pen().some(p => p.rating === 'wonderful')) { const r = yield* O.c12a_catch({ track: o.track != null ? o.track : 6, want: ['wonderful'], count: o.count || 3 }); if (r !== true) return 'wonderful: ' + r; }
      for (const c of birds().filter(c => c.color === 'blue' || c.color === 'green' || (c.color === 'yellow' && !isW(c)))) { const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'wonderful: ' + r; }
      if (lib.freeStables() === 0) { const r = yield* farm('rent', { n: 1 }); if (r !== true) return 'wonderful: ' + r; }
      const r = yield* farm('move', { min: 'wonderful' }); if (r !== true) return 'wonderful: ' + r;
    }
    if (!ok()) return 'wonderful: no Wonderful chocobo of the right sex';
    // one is enough: the others free their stables for the Gold chocobo
    const keep = birds().find(c => isW(c) && c.sex !== black().sex);
    for (const c of birds().filter(c => isW(c) && c !== keep)) { const r = yield* farm('release', { chocobo: byName(c) }); if (r !== true) return 'wonderful: ' + r; }
    R.say('stables: ' + birds().map(c => lib.label(c)).join(' | '));
    return true;
  };
  // ['c12a_gold']: Black x Wonderful with a Zeio Nut and 12+ wins between them: the Gold chocobo
  O.c12a_gold = function* () {
    for (let k = 0; k < 3; k++) {
      if (birds().some(c => c.color === 'gold')) return true;
      const b = birds().find(c => c.color === 'black'), w = b && birds().find(c => c.color === 'yellow' && c.rating === 'wonderful' && c.sex !== b.sex);
      if (!b || !w) return 'gold: no Black and Wonderful pair';
      if (wins([b, w]) < 12) return 'gold: the Black and Wonderful have ' + wins([b, w]) + ' wins (12 needed)';
      if (!inv('zeio_nut')) { const r = yield* O.c12a_nuts('zeio_nut', 1, [312, 88]); if (r !== true) return 'gold: ' + r; }
      const baby = yield* mate(b, w, 'zeio_nut');
      if (typeof baby === 'string') return 'gold: ' + baby;
      if (baby.color !== 'gold') { const r = yield* farm('release', { chocobo: byName(baby) }); if (r !== true) return 'gold: ' + r; }
    }
    return birds().some(c => c.color === 'gold') ? true : 'gold: no Gold chocobo hatched';
  };

  // ================================================================== Chocobo Square
  // prizes worth this many GP or more are taken; the rest are traded for GP (the Battle Square costs 10 GP a series)
  const KEEP_GP = 300;
  const esterAnswer = (bird, st) => (choices, w) => {
    const q = qText(w);
    if (choices.includes('Race!')) { const i = choices.indexOf(st.raced ? 'Nothing' : 'Race!'); st.raced = true; return i; }
    if (/Which chocobo will you race/.test(q)) { const i = choices.indexOf(L().label(bird)); return i >= 0 ? i : choices.length - 1; }
    if (/Which course/.test(q)) return choices.findIndex(c => /Short/.test(c));
    if (/Your prize is/.test(q)) {
      const m = /(\d+) GP/.exec(choices[1] || ''), gp = m ? +m[1] : 0;
      // (a kind of materia, armour or accessory the party never had is kept - FF7's 100% owns them all; the rest is
      // traded for GP once the collection has it, as the Wonder Square's ???? prizes want GP)
      const name = (choices[0] || '').replace(/^Take the /, '').replace(/ Materia$/, '');
      const D = FF7.data, mid = Object.keys(D.materia).find(k => D.materia[k].name === name);
      const gid = mid || ['armor', 'accessories', 'weapons', 'items'].map(t => Object.keys(D[t]).find(k => D[t][k].name === name)).find(Boolean);
      const gear = !!mid || (!!gid && !D.items[gid]);
      const take = gear ? R.gear.owned(gid) === 0 || FF7.state.gp + gp > 10000 : (gp >= KEEP_GP && !R.c12aWantGp()) || FF7.state.gp + gp > 10000;
      st.prize = (take ? 'took ' : 'traded ') + choices[0].replace(/^Take the /, '') + (take ? '' : ' (' + gp + ' GP)');
      return take ? 0 : 1;
    }
    return null;
  };
  // GP still wanted: the Wonder Square's ???? prizes (Gil Plus 1000, EXP Plus 2000) not bought yet
  R.c12aWantGp = () => { const f = FF7.state.flags; return FF7.state.gp < (f.c12a_gs_expplus ? 0 : 2000) + (f.c12a_gs_gilplus ? 0 : 1000) + 200; };
  // ['c12a_joe', { speed, max }]: the Gold chocobo raced up to S class and on until ten S-class wins in a row break
  // Joe's record (the Chocobo Breeding guide: Sprint Shoes, Precious Watch, Cat's Bell, Chocobracelet, Counter Attack,
  // the S-class prizes' only sure source); fed to `speed` first, faster when it keeps losing
  O.c12a_joe = function* (o = {}) {
    const fl = () => FF7.state.flags;
    let speed = o.speed || 118;
    for (let n = 0; n < (o.max || 60) && !fl().c12a_joe_record; n++) {
      const c = find({ color: 'gold' }); if (!c) return 'joe: no Gold chocobo in the stables';
      let r = yield* O.c12a_feed(byName(c), speed); if (r !== true) return 'joe: ' + r;
      const lost0 = (c.run || 0) - (c.races || 0);
      r = yield* O.c12a_race(byName(c), (c.races || 0) + 1, { maxLoss: 3 });
      if (r !== true) { if (!/ lost /.test(r)) return 'joe: ' + r; R.note(r); speed += 4; }
      // (an S-class race lost to Joe breaks the streak: a little faster from then on - a full run lost 8 of 40 at
      // 118 km/h and never got ten in a row)
      else { const c2 = find({ color: 'gold' }); if (c2 && c2.class === 'S' && (c2.run || 0) - (c2.races || 0) > lost0) speed += 2; }
    }
    return fl().c12a_joe_record ? true : 'joe: no record (' + JSON.stringify(find({ color: 'gold' }) || {}) + ')';
  };
  // ['c12a_prizes', [ids], { max, speed }]: the Gold chocobo (S class) raced on until each of those prizes has been won
  // and kept - Sneak Attack and Enemy Away, the Chocobo Square's rare board prizes (the Chocobo Breeding guide: a board
  // holds one rare item, 3 squares in 15; nine rare items at S class; FF7 gives these two nowhere else): about 2% a
  // race each, so some 80 races for both on average (R.activity: "Racing for prizes"); `max` races at most
  O.c12a_prizes = function* (ids, o = {}) {
    const left = () => [].concat(ids).filter(id => R.gear.owned(id) === 0);
    if (!left().length) return true;
    let speed = o.speed || 120, runs = 0;
    while (left().length && runs < (o.max || 250)) {
      const c = find({ color: 'gold' }); if (!c) return 'prizes: no Gold chocobo in the stables';
      let r = yield* O.c12a_feed(byName(c), speed); if (r !== true) return 'prizes: ' + r;
      const run0 = c.run || 0, lost0 = run0 - (c.races || 0);
      r = yield* O.c12a_race(byName(c), (c.races || 0) + 1, { maxLoss: 3 });
      const c2 = find({ color: 'gold' }) || c;
      runs += Math.max(1, (c2.run || 0) - run0);
      if (r !== true) { if (!/ lost /.test(r)) return 'prizes: ' + r; R.note(r); }
      if ((c2.run || 0) - (c2.races || 0) > lost0) speed += 2;          // (lost to Joe: a little faster)
    }
    R.say('prizes: ' + runs + ' races' + (left().length ? ', still missing ' + left().join(', ') : ''));
    if (left().length) R.note('prizes: ' + left().join(', ') + ' not won in ' + runs + ' races');
    return true;
  };
  // ['c12a_race', filter, wins, { maxLoss }]: race that bird (short course) until it has won `wins` races
  O.c12a_race = function* (who, target, o = {}) {
    let losses = 0;
    for (let n = 0; n < 40; n++) {
      const c = find(who); if (!c) return 'race: no chocobo ' + (typeof who === 'function' ? 'for ' + who : JSON.stringify(who));
      if ((c.races || 0) >= target) return true;
      if (losses >= (o.maxLoss || 3)) return 'race: ' + c.name + ' lost ' + losses + ' races in a row (' + Math.floor(c.speed) + ' km/h, class ' + c.class + ')';
      let r = yield* O.c12a_toSaucer('gs_chocobo'); if (r !== true) return 'race: ' + r;
      const w0 = c.races || 0, st = {};
      r = yield* talkWith('c12a_ester', many(esterAnswer(c, st), 12));
      if (r !== true) return 'race: ' + r;
      if ((c.races || 0) > w0) losses = 0; else losses++;
      R.say('race: ' + c.name + ' ' + ((c.races || 0) > w0 ? 'won' : 'lost') + ' (' + c.races + ' wins, class ' + c.class + (st.prize ? ', ' + st.prize : '') + ', ' + FF7.state.gp + ' GP)');
    }
    return 'race: too many races';
  };
  // ['c12a_train', [[filter, wins, speed], ...]]: feed each bird to that speed at the farm, then race them all at
  // the Gold Saucer until each has its wins; a bird that keeps losing is fed faster and raced again
  O.c12a_train = function* (list) {
    for (let round = 0; round < 4; round++) {
      if (list.some(([f]) => !find(f))) return 'train: missing chocobo ' + String(JSON.stringify(list.find(([f]) => !find(f))[0]) || list.find(([f]) => !find(f))[0]);
      const todo = list.map(([f, w, s]) => ({ c: find(f), w, s: s + round * 6 })).filter(t => (t.c.races || 0) < t.w);
      if (!todo.length) return true;
      for (const t of todo) { const r = yield* O.c12a_feed(byName(t.c), t.s); if (r !== true) return 'train: ' + r; }
      let short = false;
      for (const t of todo) {
        const r = yield* O.c12a_race(byName(t.c), t.w, { maxLoss: 3 });
        if (r === true) continue;
        if (!/ lost /.test(r)) return 'train: ' + r;
        R.note(r); short = true;
      }
      if (!short) return true;
    }
    return 'train: the chocobos could not win their races';
  };

  // ================================================================== Battle Square
  // Handicaps (all applied, and they stack for the rest of the series): [how much each hurts this party, 0-3;
  // the BP it pays before battles 2..8 (Gold Saucer FAQ)]. Cloud and Tifa wear Ribbons (Frog, Mini, Poison
  // miss them) and Barret the Fairy Ring; Big Guard / Time undo 1/2 Speed; Time x30 is a few dozen HP at this
  // playtime. The worst: no weapon, no magic (no Cures), no items, no materia at all, halved HP and MP.
  const HC = {
    'Lucky 7 (no handicap)': [0, [7, 7, 7, 7, 7, 7, 7]], 'Cure (full recovery)': [0, [1, 1, 1, 1, 1, 1, 1]],
    'Time x30 damage': [0, [8, 15, 26, 54, 130, 379, 1401]], 'Poison': [0, [4, 6, 10, 16, 33, 82, 250]],
    'Frog': [0, [6, 10, 19, 44, 130, 520, 3069]], 'Mini': [0, [5, 8, 16, 36, 108, 453, 2940]],
    'Level down (small)': [0, [5, 8, 13, 28, 64, 160, 520]], 'Summon materia broken': [0, [10, 18, 37, 90, 270, 1000, 4000]],
    'Command materia broken': [0, [5, 8, 17, 41, 120, 450, 1800]],
    '1/2 Speed': [1, [5, 7, 12, 19, 45, 130, 450]], 'Level down (big)': [1, [9, 16, 28, 53, 118, 308, 968]],
    'Independent materia broken': [1, [11, 20, 45, 99, 311, 1196, 6645]], '1/2 MP': [1, [12, 20, 36, 73, 173, 485, 1800]],
    'Accessory broken': [1, [10, 18, 35, 84, 248, 953, 3500]], 'Support materia broken': [1, [10, 18, 37, 91, 281, 1100, 4400]],
    'Armor broken': [2, [9, 17, 33, 80, 220, 654, 2600]], '0 MP': [2, [11, 18, 33, 70, 171, 502, 1855]],
    '1/2 HP': [2, [13, 22, 40, 84, 204, 591, 2200]],
    '1/2 HP & MP': [3, [16, 26, 43, 94, 244, 775, 3134]], 'Magic materia broken': [3, [15, 28, 60, 145, 445, 1775, 9425]],
    'Item command sealed': [3, [13, 23, 91, 118, 355, 1368, 7201]], 'Weapon broken': [3, [15, 27, 57, 140, 420, 1602, 8246]],
    'All materia broken': [3, [20, 35, 59, 190, 463, 1866, 10000]],
  };
  const hurt = () => FF7.sys.party.active().some(c => c.hp < c.maxHp * 0.45);
  // The reel stops where the runner times it (R.onReel: one symbol past the one showing). The least harmful wins
  // (then the most BP); before the last battle, once the Sprint Shoes are won, simply the most BP (a loss there still
  // pays every BP earned, and nothing comes after it). Hurt: Cure first.
  // (Mini and Frog leave only 1 damage or a quarter: once the Ribbon may be broken - 'Accessory broken' drawn or next
  // to a pick this series - they can make a fight that never ends, so they count as the worst; never all in)
  const STUCK = ['Mini', 'Frog'];
  const pickHandicap = (choices, round, st = {}) => {
    const allIn = round >= 8 && FF7.state.flags.c12a_sprint_shoes, sick = hurt();
    const bare = st.accessoryGone;
    const tier = (c) => (c === 'Cure (full recovery)' && sick ? -1 : STUCK.includes(c) && (bare || allIn) ? 4 : HC[c] ? HC[c][0] : 2);
    const bp = (c) => (HC[c] ? HC[c][1][Math.max(0, Math.min(6, round - 2))] : 0);
    let best = 0, bs = -Infinity;
    choices.forEach((c, k) => {
      const t = tier(c), v = bp(c);
      const sc = allIn && t < 4 ? v : -t * 1e6 + v;
      if (sc > bs) { bs = sc; best = k; }
    });
    return best;
  };
  const arenaAnswer = (st) => (choices, w) => {
    const q = qText(w);
    if (choices.some(c => /^Enter the arena/.test(c))) { const i = st.entered ? choices.indexOf('Nothing') : choices.findIndex(c => /^Enter the arena/.test(c)); st.entered = true; return i; }
    if (/Will you keep going/.test(q)) return choices.findIndex(c => /Of course/.test(c));
    if (/Handicap roulette/.test(q)) {
      const m = /battle (\d+)/.exec(q), k = pickHandicap(choices, m ? +m[1] : 8, st);
      if (choices[k] === 'Accessory broken') st.accessoryGone = true;
      return k;
    }
    return null;
  };
  // ['c12a_arena', { prize, label, bp, max } | { prizes: [{ prize, label, bp }...], max }]: full series (8 battles, 10 GP
  // each) until the BP buy the prize, then the exchange counter; Sprint Shoes from the attendant after the first full
  // clear. BP vanish on leaving, so several prizes are bought one after the other in one visit (the counter holds at
  // most 65535 BP)
  O.c12a_arena = function* (o = {}) {
    const has = (p) => p.prize === 'omnislash' ? (FF7.state.chars.cloud.limitsKnown || []).includes('omnislash') || FF7.sys.inv.has('omnislash') : R.gear.owned(p.prize) > 0;
    const list = (o.prizes || [{ prize: o.prize, label: o.label, bp: o.bp }]).filter(p => !has(p));
    if (!list.length) return true;
    let r = yield* O.c12a_toSaucer('gs_ghost'); if (r !== true) return 'arena: ' + r;
    r = yield* O.inn('hotel_clerk'); if (r !== true) return 'arena: ' + r;               // the Ghost Hotel's free beds
    r = yield* O.goto('gs_battle'); if (r !== true) return 'arena: ' + r;
    let series = 0;
    for (const p of list) {
      while (FF7.state.bp < p.bp) {
        if (FF7.state.gp < 10) return 'arena: out of GP (' + FF7.state.bp + ' BP)';
        if (series++ >= (o.max || 24)) return 'arena: ' + FF7.state.bp + ' BP after ' + (series - 1) + ' series';
        const bp0 = FF7.state.bp;
        r = yield* talkWith('c12a_host', many(arenaAnswer({}), 24));
        if (r !== true) return 'arena: ' + r;
        R.say('arena: series ' + series + ': +' + (FF7.state.bp - bp0) + ' BP (' + FF7.state.bp + ' BP, ' + FF7.state.gp + ' GP)');
        if (FF7.state.flags.c12a_arena_clear && !FF7.state.flags.c12a_sprint_shoes) { r = yield* talkWith('c12a_shoes', []); if (r !== true) return 'arena: ' + r; }
      }
      r = yield* talkWith('c12a_bp_clerk', [p.label]); if (r !== true) return 'arena: ' + r;
      if (!has(p)) return 'arena: ' + p.label + ' was not exchanged (' + FF7.state.bp + ' BP)';
    }
    return true;
  };
  // ['c12a_coaster']: Speed Square's shooting coaster (10 GP): 5000+ points win the Flayer
  O.c12a_coaster = function* () {
    if (FF7.state.flags.c12a_flayer) return true;
    let r = yield* O.c12a_toSaucer('gs_speed'); if (r !== true) return 'coaster: ' + r;
    for (let k = 0; k < 3 && !FF7.state.flags.c12a_flayer && FF7.state.gp >= 10; k++) {
      R.mgWant = { id: 'shooting', win: true };
      r = yield* talkWith('c12a_coaster', ['Ride']); if (r !== true) return 'coaster: ' + r;
    }
    return FF7.state.flags.c12a_flayer ? true : 'coaster: no 5000-point ride';
  };

  // ['c12a_gp', target | 'wonder', { max, keepGil, plus }]: GP from the shady man in Station Square (100 GP for 10,000 gil; he is
  // there on about one visit in seven): in and out of the square by the nearest tube until the GP reach target
  O.c12a_gp = function* (target, o = {}) {
    const st = FF7.state;
    if (target === 'wonder') target = (st.flags.c12a_gs_expplus ? 0 : 2000) + (st.flags.c12a_gs_gilplus ? 0 : 1000) + (o.plus || 0);   // (the ???? prizes left)
    if (st.gp >= target) return true;
    let r = yield* O.c12a_toSaucer('gs_station'); if (r !== true) return 'gp: ' + r;
    let k = 0;
    for (; k < (o.max || 150) && st.gp < target && st.gil >= 10000 + (o.keepGil || 0); k++) {
      const fs = R.field();
      if (R.where() === 'gs_station' && fs && fs.actors.c12a_gpman && fs.actors.c12a_gpman.visible !== false) {
        const gp0 = st.gp;
        r = yield* talkWith('c12a_gpman', ['100 GP']); if (r !== true) return 'gp: ' + r;
        R.say('gp: +' + (st.gp - gp0) + ' GP from the man in Station Square (' + st.gp + ' GP)');
        continue;
      }
      r = yield* O.goto(R.where() === 'gs_station' ? (o.via || 'gs_wonder') : 'gs_station'); if (r !== true) return 'gp: ' + r;
    }
    if (st.gp < target) R.note('gp: ' + st.gp + ' GP of ' + target + ' after ' + k + ' visits (' + st.gil + ' gil)');
    return true;
  };
  // ['c12a_wonderGames']: Wonder Square's Disc 2 games for their prizes (the Gold Saucer FAQ): the Snowboard's three
  // courses (89+ points: Safety Bit, All, Crystal Bangle and 30 / 100 / 300 GP) and Torpedo Attack's five missions
  // (Ink, T/S Bomb, Dragon Fang, Dragon Scales, Cauldron; 20 GP a win)
  const SNOW_RUNS = [['Course A', 'c12a_snow_a'], ['Course B', 'c12a_snow_b'], ['Course C', 'c12a_snow_c']];
  const TORP_RUNS = ['Undersea Reactor battle', 'Level 1', 'Level 2', 'Level 3', 'Level 4'];
  O.c12a_wonderGames = function* (o = {}) {
    const fl = FF7.state.flags;
    const left = () => SNOW_RUNS.some(([, f]) => !fl[f]) || (fl.has_submarine && TORP_RUNS.some((t, i) => !fl['c12a_torpedo_' + i]));
    if (!left()) return true;
    let r = yield* O.c12a_toSaucer('gs_wonder'); if (r !== true) return 'wonder games: ' + r;
    for (const [course, flag] of SNOW_RUNS) for (let k = 0; k < (o.tries || 4) && !fl[flag] && FF7.state.gil >= 200; k++) {
      R.mgWant = { id: 'snowboard', win: true };
      r = yield* useWith(5, 2, [course]); if (r !== true) return 'snowboard: ' + r;
    }
    for (let i = 0; fl.has_submarine && i < TORP_RUNS.length; i++) for (let k = 0; k < (o.tries || 4) && !fl['c12a_torpedo_' + i] && FF7.state.gil >= 200; k++) {
      R.mgWant = { id: 'submarine', win: true };
      r = yield* useWith(13, 2, [TORP_RUNS[i]]); if (r !== true) return 'torpedo: ' + r;
    }
    R.mgWant = null;
    SNOW_RUNS.forEach(([c, f]) => { if (!fl[f]) R.note('snowboard: no prize on ' + c); });
    return true;
  };
  // ['c12a_wonderPrizes']: Wonder Square's ???? prizes with the GP left (EXP Plus 2000 GP, Gil Plus 1000 GP)
  O.c12a_wonderPrizes = function* () {
    const fl = FF7.state.flags;
    const next = () => (!fl.c12a_gs_expplus && FF7.state.gp >= 2000 ? '2000 GP' : !fl.c12a_gs_gilplus && FF7.state.gp >= 1000 ? '1000 GP' : null);
    for (let k = 0; k < 2 && next(); k++) {
      let r = yield* O.c12a_toSaucer('gs_wonder'); if (r !== true) return 'wonder: ' + r;
      const want = next();
      r = yield* talkWith('c12a_prize2', [(choices) => { const i = choices.findIndex(c => c.includes(want)); return i >= 0 ? i : choices.length - 1; }]);
      if (r !== true) return 'wonder: ' + r;
    }
    return true;
  };

  // ================================================================== the Mystery Ninja
  // ['c12a_ninja']: only when Yuffie never joined: the forests around Rocket Town (FF7: the ninja is met there
  // every time a battle starts in the woods), then her questions (no menu, no save point before she joins)
  const NINJA = ['Not interested', '......petrified', 'Wait a second!', "......That's right", "......Let's hurry on"];
  O.c12a_ninja = function* () {
    const st = FF7.state;
    if (st.flags.yuffie_joined) return true;
    let r = yield* O.c12a_at(93, 145); if (r !== true) return 'ninja: ' + r;
    let b0 = R.stats.battles, side = 0;
    for (let n = 0; n < 4000 && !st.flags.c12a_ninja_active; n++) {
      if (R.where() !== 'world') { yield; continue; }
      const ws = R.worldScene(); if (!ws) { yield; continue; }
      if (R.stats.battles !== b0) { b0 = R.stats.battles; if (!st.flags.c12a_ninja_active) yield* O.heal({ below: 0.5 }); continue; }
      const x = Math.floor(ws.px), y = Math.floor(ws.pz);
      const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, null, a, b) && !R.entries()[mod(a, R.worldD().w) + ',' + mod(b, R.worldD().h)]);
      if (!pairs.length) return 'ninja: no room to pace here';
      r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true });
      if (r !== true && r !== 'mapchanged') return 'ninja: ' + r;
    }
    r = yield* O.expectMap('side_ninja_clearing'); if (r !== true) return 'ninja: ' + r;
    r = yield* talkWith('ninja_yuffie', NINJA);
    if (r !== true) return 'ninja: ' + r;
    if (!st.flags.yuffie_joined) return 'ninja: she got away';
    if (R.where() === 'side_ninja_clearing') { r = yield* O.exit(0); if (r !== true) return 'ninja: ' + r; yield* R.settle(3); }  // back to the woods
    return true;
  };

  // ================================================================== start profile and plan
  // C11a's end (its c11a_end checkpoint, headless run from R.starts.c11a): Disc 3, the night on the Highwind
  // played, standing under it at dawn; the Highwind parked on the Northern Continent's east coast.
  R.starts.c12a = R.disc2Profile({
    members: ["cloud","barret","redxiii","yuffie","caitsith","vincent","cid","tifa"],
    party: ["cloud","tifa","barret"],
    names: {"cloud":"Cloud","barret":"Barret","redxiii":"Red XIII","yuffie":"Yuffie","caitsith":"Cait Sith","vincent":"Vincent","cid":"Cid","tifa":"Tifa"},
    levels: {"cloud":48,"barret":46,"redxiii":43,"yuffie":42,"caitsith":41,"vincent":42,"cid":47,"tifa":46},
    gil: 96785,
    gp: 0,
    disc: 3,
    phs: true,
    map: "hw_dawn",
    entry: "start",
    worldPos: {"x":246,"y":142},
    vehicles: {"highwind":{"x":246,"y":141},"submarine":{"x":233,"y":168}},
    keyItems: ["huge_materia_corel","huge_materia_condor","leviathan_scales","huge_materia_underwater","huge_materia_rocket"],
    items: {"guide_book":1,"talisman":1,"earring":1,"protect_vest":1,"fury_ring":1,"potion":12,"hi_potion":15,"ether":13,"turbo_ether":16,"elixir":8,"megalixir":3,"phoenix_down":20,"remedy":10,"antidote":6,"soft":5,"maidens_kiss":5,"echo_screen":4,"eye_drop":5,"hyper":4,"tranquilizer":4,"curse_ring":1,"diamond_bangle":3,"rune_armlet":1,"gold_armlet":1,"s_mine":2,"grenade":2,"battle_trumpet":1,"shinra_beta":2,"scimitar":1,"dragon_claw":1,"partisan":1,"rising_sun":1,"power_wrist":1,"starlight_phone":1,"guard_source":1,"power_source":2,"magic_source":1,"mind_source":2,"behemoth_horn":1,"pile_banger":1,"master_fist":1,"grow_lance":1,"hp_shout":1,"speed_source":1,"am_cannon":1,"organics":1,"missing_score":1},
    vars: {"c7_oldman_talks":3,"chocobo_pen":[],"c12b_on_choco":0,"mg_best_train_escape":869,"mg_best_fort_condor":0,"mg_best_submarine":6673,"c10_oldman_talks":3,"mg_best_parachute":93,"c11a_hq_flight":0},
    equip: {"cloud":{"weapon":"ragnarok","armor":"aegis_armlet","accessory":"ribbon"},"barret":{"weapon":"max_ray","armor":"imperial_guard","accessory":"fairy_ring"},"redxiii":{"weapon":"crystal_comb","armor":"warrior_bangle","accessory":"star_pendant"},"yuffie":{"weapon":"hawkeye","armor":"gold_armlet","accessory":"silver_glasses"},"caitsith":{"weapon":"red_m_phone","armor":"gold_armlet","accessory":"headband"},"vincent":{"weapon":"lariat","armor":"silver_armlet","accessory":"peace_ring"},"cid":{"weapon":"venus_gospel","armor":"crystal_bangle","accessory":null},"tifa":{"weapon":"gods_hand","armor":"mystile","accessory":"ribbon"}},
    limits: {"cloud":["braver","cross_slash","blade_beam","climhazzard","meteorain","finishing_touch"],"barret":["big_shot","mindblow","grenade_bomb","hammerblow","satellite_beam","ungarmax","catastrophe"],"redxiii":["sled_fang","lunatic_high","blood_fang","stardust_ray","howling_moon","earth_rave"],"yuffie":["greased_lightning","clear_tranquil","landscaper","bloodfest","gauntlet","doom_of_the_living"],"caitsith":["dice","slots"],"vincent":["galian_beast","death_gigas","hellmasker"],"cid":["boost_jump","dynamite","hyper_jump","dragon","dragon_dive","big_brawl"],"tifa":["beat_rush","somersault","waterkick","meteodrive","dolphin_blow","meteor_strike"]},
    materia: {"cloud":[{"id":"lightning","ap":32335},{"id":"all","ap":18335},{"id":"restore","ap":38335},{"id":"all","ap":18360},{"id":"barrier","ap":27860},{"id":"revive","ap":55360},null,{"id":"time","ap":20860},{"id":"counter_attack","ap":23335},{"id":"cover","ap":23335}],"barret":[{"id":"restore","ap":24385},{"id":"all","ap":15330},{"id":"ice","ap":25860},{"id":"all","ap":15330},{"id":"steal","ap":23860},{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]},{"id":"bahamut_zero","ap":5860},{"id":"neo_bahamut","ap":20385},{"id":"hp_plus","ap":33335},{"id":"magic_plus","ap":22860},{"id":"mp_plus","ap":23860},{"id":"odin","ap":29385}],"redxiii":[null,null,null,null,null,{"id":"ice","ap":20525},{"id":"kujata","ap":23525},null,null,{"id":"seal","ap":11525}],"yuffie":[null,{"id":"throw","ap":12000},{"id":"poison","ap":6000},{"id":"mystify","ap":8000},{"id":"ifrit","ap":7000}],"caitsith":[{"id":"manipulate","ap":9000},{"id":"transform","ap":9000},{"id":"titan","ap":16000},{"id":"ramuh","ap":11000},{"id":"exit","ap":5000},{"id":"destruct","ap":7000}],"vincent":[{"id":"morph","ap":20000},{"id":"alexander","ap":26000},{"id":"choco_mog","ap":15000},{"id":"pre_emptive","ap":9000},{"id":"hp_absorb","ap":30000},{"id":"mp_absorb","ap":30000}],"cid":[{"id":"restore","ap":28470},null,{"id":"lightning","ap":22470},null,null,{"id":"steal","ap":44470},null,null,null,null,null,{"id":"gravity","ap":17000},{"id":"ultima","ap":5475},{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]}],"tifa":[{"id":"elemental","ap":22335},{"id":"lightning","ap":14335},{"id":"enemy_skill","ap":0,"eskills":["frog_song","l4_suicide","magic_hammer","white_wind","big_guard","death_force","flame_thrower","laser","matra_magic","bad_breath","beta","aqualung","trine","magic_breath","death_sentence"]},{"id":"bahamut","ap":31805},{"id":"mp_plus","ap":23335},{"id":"mega_all","ap":33335},{"id":"deathblow","ap":20335},{"id":"phoenix","ap":11335},{"id":"heal","ap":24335}]},
    stock: [{"id":"fire","ap":19525},"enemy_away","enemy_lure",{"id":"chocobo_lure","ap":3000},"added_cut",{"id":"fire","ap":3000},{"id":"shiva","ap":16000},{"id":"earth","ap":2000},"chocobo_lure","contain",{"id":"sense","ap":12000},{"id":"fire","ap":20000},{"id":"added_effect","ap":3525},{"id":"long_range","ap":21385},{"id":"earth","ap":8385},{"id":"long_range","ap":20525},{"id":"luck_plus","ap":17050},{"id":"speed_plus","ap":17050},{"id":"hp_plus","ap":28000},"w_item","revive"],
    flags: ["aeris_dead","black_materia","c10_backdoor","c10_bridge_taken","c10_briefing","c10_carry_beaten","c10_catastrophe","c10_choco_fed","c10_cloud_speech","c10_condor_done","c10_condor_funds","c10_condor_hatched","c10_condor_intro","c10_condor_won","c10_contain","c10_core_guard","c10_core_seen","c10_corel_boarded","c10_corel_done","c10_corel_intro","c10_corel_rested","c10_corel_stopped","c10_crazy_met","c10_curse_ring","c10_elixir","c10_found_cloud","c10_front_cleared","c10_grunt_fight","c10_hostages","c10_in_space","c10_key_broken","c10_launched","c10_lift_fight","c10_ls_hub","c10_ls_nibel","c10_ls_reactor","c10_ls_room","c10_ls_station","c10_ls_tower","c10_mideel_arrived","c10_mideel_quake","c10_old_key","c10_pad_seen","c10_path_fight","c10_rocket_hint","c10_rt_intro","c10_rude_beaten","c10_shera_warn","c10_squad_beaten","c10_subhall_fight","c10_train_first","c10_ultima","c10_uw_cannon","c10_uw_done","c10_uw_intro","c10_venus_gospel","c11a_bahamut_zero","c11a_base_seen","c11a_capital_arrive","c11a_capital_done","c11a_clod_done","c11a_coast_intro","c11a_diamond_alert","c11a_diamond_beaten","c11a_diamond_done","c11a_hojo_done","c11a_hojo_met","c11a_hojo_news","c11a_hq_hpshout","c11a_hq_seen","c11a_hq_vending","c11a_junction_seen","c11a_landed","c11a_need_key","c11a_raid_started","c11a_stairs_seen","c11a_started","c11a_turks_done","c11a_ug2_fell","c11b_dawn_done","c11b_field_done","c11b_night_done","c12b_ult_told","c1_barret_joined","c1_bomb_set","c1_bought_flower","c1_bridge_seen","c1_core_talk","c1_door_open","c1_elevator_talk","c1_escape","c1_flower_done","c1_gate_open","c1_intro_done","c1_jessie_free","c1_jessie_tip","c1_out_msg","c1_s8_intro","c1_train_talk","c2_air_buster_beaten","c2_alarm","c2_arrived","c2_bar_intro","c2_barret_stormed","c2_basement_talk","c2_biggs_talk","c2_debrief","c2_departed","c2_door_open","c2_drink","c2_fell","c2_hall_visit","c2_hipotion","c2_jessie_talk","c2_jumped","c2_kid_paid","c2_landed","c2_marlene_flower","c2_md5_bomb","c2_md5_hall","c2_md5_in","c2_md5_lift_talk","c2_md5_panel","c2_md5_vision","c2_morning","c2_pd_given","c2_pickpocketed","c2_pillar_seen","c2_plate_in","c2_promise","c2_scene_bar","c2_scene_morning","c2_scene_promise","c2_tifa_joined","c2_train_caught","c2_train_intro","c2_trap","c2_vent","c2_wedge_talk","c3_aeris_freed","c3_aeris_rejoined","c3_aps_beaten","c3_back_done","c3_back_scene","c3_barrels_on","c3_barret_joined","c3_barret_plan","c3_biggs_talk","c3_card_got","c3_church_escape","c3_church_intro","c3_cologne_got","c3_corneo_done","c3_coupon_got","c3_disguise_plan","c3_dress_asked","c3_dress_got","c3_dressed","c3_dressmaker_done","c3_elmyra_met","c3_elmyra_request","c3_elmyra_story","c3_garden_talk","c3_grief_done","c3_hb_room_used","c3_hb_seen","c3_hb_tip","c3_house_arrived","c3_jessie_talk","c3_kid_5gil_taken","c3_kid_drawer","c3_kid_turbo","c3_lackey_intro","c3_lackeys_beaten","c3_landed","c3_makeup_done","c3_park_scene","c3_pillar_arrive","c3_plate_fallen","c3_rafters_talk","c3_reno_beaten","c3_s6_talk","c3_saw_no2","c3_sewer_intro","c3_slept","c3_swing_talk","c3_tg_moved","c3_tg_roof","c3_tg_talk","c3_tg_train1","c3_tgn_talk","c3_tiara_got","c3_tiara_quest","c3_tifa_basement","c3_tifa_found","c3_to_wire","c3_town_talk","c3_tunnel_talk","c3_turtle_flyer1","c3_vend_done","c3_wedge_talk","c3_wig_got","c3_wig_quest","c3_wire_done","c3_wire_seen","c3_wire_start","c3_wm_arrived","c4_59f_fight","c4_60f_passed","c4_63_terminal","c4_arrived","c4_back_door","c4_bike","c4_box","c4_captured","c4_chase_done","c4_decided","c4_domino_done","c4_domino_met","c4_escape_started","c4_eskill","c4_flyer_turtle2","c4_gunner_done","c4_h0512_done","c4_jail_door","c4_jail_intro","c4_jail_night","c4_jail_out","c4_jail_tifa","c4_jenova_seen","c4_keycard62","c4_keycard68","c4_lobby_fight","c4_lobby_reunion","c4_meeting_done","c4_motorball_done","c4_president_found","c4_president_talk","c4_ride_done","c4_route_front","c4_rufus_arrived","c4_rufus_beaten","c4_stairs_done","c4_tank_empty","c4_trail_68","c4_trail_intro","c4_vending_bang","c5a_arrived","c5a_ether_a","c5a_ether_clock","c5a_ether_far","c5a_fb_arrived","c5a_fb_bridge","c5a_fb_chase","c5a_fb_days","c5a_fb_door","c5a_fb_end","c5a_fb_fall","c5a_fb_fire","c5a_fb_fire_seen","c5a_fb_fountain","c5a_fb_library1","c5a_fb_library2","c5a_fb_mansion_in","c5a_fb_mom","c5a_fb_morning","c5a_fb_night","c5a_fb_path","c5a_fb_piano","c5a_fb_reactor","c5a_fb_tifa","c5a_fb_truck","c5a_flashback_done","c5a_guard_source","c5a_mako_asked","c5a_megalixir","c5a_old_asked","c5a_piano_jammed","c5a_piano_tune","c5a_story_start","c5b_airport_arrived","c5b_arrived","c5b_bill_talked","c5b_billy_talked","c5b_bottomswell","c5b_chocomog","c5b_condor_fund","c5b_condor_gate","c5b_condor_joined","c5b_condor_w","c5b_dolphin_jump","c5b_engine_seen","c5b_farm_arrived","c5b_jenova_birth","c5b_junon_arrived","c5b_junon_slept","c5b_mine_entered","c5b_parade_done","c5b_phs_taken","c5b_priscilla_saved","c5b_sendoff_done","c5b_ship_aeris","c5b_ship_alarm","c5b_ship_boarded","c5b_ship_intro","c5b_ship_red","c5b_ship_tifa","c5b_shiva","c5b_tifa_talk","c5b_turks_mine","c5b_whistle","c5b_yuffie_tranq","c5b_zolom_seen","c6a_arrived","c6a_ball","c6a_barret_left","c6a_barret_rejoined","c6a_barret_story","c6a_bridge_down","c6a_coates_talked","c6a_costa_left","c6a_done","c6a_dyne_done","c6a_framed","c6a_gbike_prize","c6a_hojo_talked","c6a_jockey_intro","c6a_johnny_met","c6a_johnny_tifa","c6a_junk_seen","c6a_miner_talked","c6a_mog_cleared","c6a_mog_reward","c6a_ncorel_arrival","c6a_ncorel_ether","c6a_nest","c6a_oldman_talked","c6a_prison_arrival","c6a_race_explained","c6a_race_intro","c6a_race_started","c6a_reactor_barret","c6a_saw_saucer","c6a_turtle_flyer3","c6a_umbrella","c6a_villa_owned","c6a_waterside_seen","c6a_wizard_staff","c6b_buggy_repaired","c6b_candle_done","c6b_candle_intro","c6b_candle_start","c6b_cosmo_arrived","c6b_done","c6b_elixir","c6b_farewell","c6b_gi_asked","c6b_gi_intro","c6b_gi_nattak","c6b_gi_oil_seen","c6b_gi_open","c6b_gi_rock","c6b_gi_secret","c6b_gi_web","c6b_gongaga_arrived","c6b_magic_source","c6b_met_bugen","c6b_planetarium","c6b_reactor_scene","c6b_reactor_seen","c6b_seto","c6b_titan","c6b_turks_done","c6b_turtle_flyer4","c6b_turtle_flyer5","c6b_village_seen","c6b_wasteland_seen","c6b_zack_friends","c6b_zack_heard","c7_bronco_seen","c7_cid_met","c7_cloud_house","c7_clue1","c7_clue2","c7_clue3","c7_clue4","c7_coffin_unlocked","c7_dachao_fire_out","c7_dachao_seen","c7_fountain","c7_inn_talk","c7_keeper_dead","c7_mansion_in","c7_mansion_passage","c7_nibel_arrived","c7_nibel_base","c7_nibel_bridge","c7_nibel_ladder","c7_nibel_ledge_hint","c7_nibel_path","c7_palmer_done","c7_piano_gil","c7_piano_tune","c7_reactor_seen","c7_rocket_arrived","c7_safe_open","c7_seph_library","c7_shera_met","c7_tea","c7_tifa_room","c7_tower_talk","c7_turtle_flyer6","c7_turtle_prize","c7_turtle_sign","c7_vincent_1","c7_vincent_2","c7_wq_bell","c7_wq_godo","c7_wq_kidnap","c7_wq_mpabsorb","c7_wq_pot","c7_wq_pubturks","c7_wq_rapps","c7_wq_screen","c7_wq_shrine","c7_wq_stolen","c7_wq_town","c7_wq_trap","c7_wq_turks","c7_wutai_arrived","c7_wutai_done","c7_yoshiyuki","c8_altar_scene","c8_ancient_room","c8_bone_aeris","c8_bone_seen","c8_boulders_done","c8_boulders_seen","c8_bronco_boarded","c8_cait_spy","c8_capital_arrived","c8_capital_slept","c8_cave_seen","c8_center_seen","c8_chase2","c8_clock_seen","c8_crystal_seen","c8_date_done","c8_demons_gate","c8_dig_explained","c8_disc2_speech","c8_forest_awake","c8_forest_seen","c8_gate_solved","c8_gate_started","c8_gs_back","c8_keystone_bonus","c8_keystone_got","c8_kjata_seen","c8_maze_intro","c8_model_seen","c8_north_seen","c8_pool_vision","c8_red_dragon","c8_red_dragon_seen","c8_room1_battle","c8_room3_battle","c8_room_elixir","c8_ropeway_broken","c8_sephiroth_mural","c8_shell_seen","c8_temple_arrived","c8_temple_done","c8_trunk_seen","c8_tseng","c8_valley_out","c8_valley_seen","c8_woke","c8_ws_met","c8_ws_paid","c9_airship_seen","c9_arrived","c9_attack_squad","c9_barret_free","c9_base_seen","c9_boarded","c9_bolt_seen","c9_boulder","c9_bridge_seen","c9_cannon_seen","c9_cave1_seen","c9_cave_done","c9_center","c9_cliff1_seen","c9_climb_help","c9_clone","c9_cold_warned","c9_corridor_seen","c9_dock_guard","c9_elena","c9_escaped","c9_escort","c9_first_takeoff","c9_floe_fell","c9_floes_seen","c9_gas_stopped","c9_gas_strapped","c9_gast_seen","c9_gust_seen","c9_hall_seen","c9_holzoff_met","c9_hotspring","c9_hw_meeting","c9_icicle_warned","c9_icicles_down","c9_illusion","c9_jenova_death","c9_junon_woke","c9_key","c9_landed","c9_mapwall","c9_maze_seen","c9_press","c9_reporter","c9_rescued","c9_rim_seen","c9_rode","c9_scarlet","c9_schizo","c9_slap_done","c9_snow_beaten","c9_snow_met","c9_snowboard_tips","c9_snowfield_seen","c9_spring_seen","c9_tape","c9_tapes_talk","c9_walk_seen","c9_wall_blasted","c9_wind_seen","cait_joined","chocobo_lure","cid_joined","cloud_returned","disc2","disc3","got_condor2_phoenix","got_midgar2_hq_behemoth","got_midgar2_hq_growlance","got_midgar2_hq_masterfist","got_midgar2_hq_pilebanger","got_midgar2_stairs_missingscore","got_midgar2_ug1_elixir","got_midgar2_ug1_megalixir","got_midgar2_ug2_aegis","got_midgar2_ug3_elixir","got_midgar2_ug3_maxray","got_midgar2_ug3_starlight","got_midgar2_wind1_guard","got_midgar2_wind1_power","got_midgar2_wind2_magic","got_midgar2_wind2_mind","got_midgar2_wind2_witem","got_midgar2_yard_elixir","got_midgar2_yard_mystile","got_side_farm_lure2","got_uwreactor_dock_scales","got_uwreactor_dock_scimitar","got_uwreactor_dock_trumpet","has_bronco","has_buggy","has_highwind","has_phs","has_submarine","holy","huge_materia_condor","huge_materia_corel","huge_materia_done","huge_materia_rocket","huge_materia_underwater","keystone","left_midgar","meteor","redxiii_joined","trig_corel2_train_hop1","trig_corel2_train_hop2","trig_corel2_train_hop3","trig_corel2_train_hop4","trig_hojo_control_hojo","trig_lifestream_void_fall","trig_lifestream_void_voices","trig_mansion_basement_library","trig_midgar2_cannon_base_clod","trig_midgar2_coast_engage","trig_midgar2_tunnel_turks","trig_mtnibel_pipes_keeper","trig_rocket_engine_meet_cid","trig_rocket_pad_c10_rude","trig_rocket_pad_c10_squad1","trig_rocket_pad_c10_squad2","trig_uwreactor_core_mps","trig_uwreactor_core_sneak","trig_uwreactor_dock_greydock","trig_uwreactor_dock_reno","trig_uwreactor_pipe_pipe_view","vincent_joined","yuffie_joined"],
  });

  const stables = (n) => () => !!L() && L().stables() >= n;
  const has = (f) => () => !!find(f);
  const pairDone = () => { const g = birds().filter(c => c.color === 'yellow' && c.rating === 'great'); return (g.some(c => c.sex === 'male') && g.some(c => c.sex === 'female')) || !!bgPair() || has({ color: 'black' })(); };
  const blackDone = has({ color: 'black' }), goldDone = has({ color: 'gold' });
  const bgDone = () => !!bgPair() || blackDone();
  const greatsRaced = () => { const g = birds().filter(yellowGG); return wins(g) >= 4 || bgDone(); };
  const bgRaced = () => { const p = bgPair(); return (p && wins(p) >= 9) || blackDone(); };
  const wonderfulDone = () => { const b = find({ color: 'black' }); return goldDone() || (!!b && birds().some(c => c.color === 'yellow' && c.rating === 'wonderful' && c.sex !== b.sex)); };
  const bwRaced = () => { const b = find({ color: 'black' }), w = b && birds().find(c => c.color === 'yellow' && c.rating === 'wonderful' && c.sex !== b.sex); return goldDone() || (!!w && wins([b, w]) >= 12); };
  const omnislash = () => (FF7.state.chars.cloud.limitsKnown || []).includes('omnislash');
  const PRIZES_WON = (s, R2) => ['sneak_attack', 'enemy_away'].every(id => R2.gear.owned(id) > 0);
  R.c12aPrizesWon = PRIZES_WON;
  const guideDone = (s) => s.flag('c5a_trav_guide') || !s.has('guide_book');

  R.plans.c12a = [
    ['chapter', 'c12a', "Chapter 12a: Optional A (Yuffie, chocobos, the Gold Saucer)"],
    ['expect', 'disc3', { soft: true }],   // soft: it holds all through C12a/C12b (set at the start of Disc 3), so it can't mark a resume point
    // the morning on the Highwind (C11b's scene: everyone comes back); then the airship is flying
    ['obj', 'The night before the final battle'],
    ['exit', 'hw_bridge', { map: 'hw_dawn', done: 'c11b_morning_done' }],
    ['expect', 'c11b_morning_done', { soft: true }],
    ['ckpt', 'c12a_start'],

    // ---- Yuffie, when she never joined (the Mystery Ninja in the woods)
    ['obj', 'The Mystery Ninja'],
    ['c12a_ninja', { done: 'yuffie_joined', budget: 200000 }],
    ['expect', 'yuffie_joined', { soft: true }],   // soft: it holds from C5b on, so it can't mark a resume point
    ['battle', {}],

    // ---- stables; the Chocobo Sage
    ['obj', 'Rent two stables at the Chocobo Farm'],
    ['c12a_farm', 'rent', { n: 2, done: stables(2) }],
    // Kalm, next door: the Traveller trades C10's Guide Book (the Ghost Ship's Morph) for the Underwater materia
    // (C12b's Emerald WEAPON fight without the 20-minute limit)
    ['obj', 'Kalm: the Traveller (the Guide Book for the Underwater materia)'],
    ['world', 'kalm', { done: guideDone }],
    ['goto', 'kalm_house_far', { done: guideDone }],
    ['talk', 'traveler', { done: guideDone }],
    ['expect', guideDone, { soft: true }],   // soft: true for any game without the Guide Book (most of the route)
    ['collect', { kinds: ['materia', 'gear'], keepGil: 60000, shops: [['kalm_materia', 'keeper', 'kalm_materia'], ['kalm_weapon', 'keeper', 'kalm_weapons']] }],   // (Earth; one of each kind never had)
    // the kills the reserve's Limit Breaks still want (the Limit Break Mechanics guide: the first limit of a level comes
    // with the character's own killing blows; Vincent and Cait Sith have no other kind): in the Junon woods, whose packs
    // of five Capparwires and three Formulas go down in a blow at this level, three at a time in the party with Cloud
    // (the PHS); the others only chip the foes down (limitReady, kills only: the uses come as the gauges fill)
    ['obj', 'Limit Breaks: the kills Vincent, Cait Sith, Red XIII and Yuffie still need'],
    // (Tents from Kalm's item shop first: the world map's full rest, the camp's only one)
    ['goto', 'kalm_item', { done: (s) => FF7.sys.inv.count('tent') >= 12 }],
    ['shop', 'keeper', { buy: [['tent', 20]], lenient: true, done: (s) => FF7.sys.inv.count('tent') >= 12 }],
    ['limitReady', ['vincent', 'caitsith', 'redxiii', 'yuffie'], { upTo: 3, uses: false, at: [253, 172], max: 110, budget: 1000000 }],
    // Curiel Greens for the wild chocobos (they calm down and stay; 1000 gil)
    ['c12a_billyBuy', 'curiel_greens', 20, { keepGil: 30000, done: bgDone }],
    ['obj', 'The Chocobo Sage, north of the Forgotten Capital'],
    ['world', 'chocobo_sage', { done: 'c12a_sage_eskill' }],
    ['talk', 'sage_unknown', { done: 'c12a_sage_named', choose: 'What about that chocobo' }],   // his name; the chocobo's story
    ['talk', 'sage_choco', { done: 'c12a_sage_eskill' }],                                      // Enemy Skill materia
    ['c12a_buy', 'sylkis_greens', 8, { keepGil: 15000, done: bgDone }],                          // the finest greens (5000 gil)
    ['ckpt', 'c12a_sage'],

    // ---- Carob Nuts: the Vlakorados on the grassland south of the Sage (Bone Village's plain)
    ['obj', 'Carob Nuts from the Vlakorados south of the Sage'],
    ['battle', { steal: ['carob_nut'] }],
    ['c12a_nuts', 'carob_nut', 5, [202, 97], { done: bgDone, budget: 200000 }],
    ['battle', {}],

    // ---- two Great chocobos (the Mideel tracks: Spirals mean a Great one)
    ['obj', 'Great chocobos on the Mideel tracks'],
    ['c12a_catch', { track: 7, want: ['great'], count: 3, done: pairDone, budget: 250000 }],
    ['obj', 'Chocobuckle from a Mideel chocobo (Mimett Greens, then L4 Suicide)'],
    ['c12a_chocobuckle', { track: 7, done: (s, R) => R.masterKnows('chocobuckle'), budget: 300000 }],
    ['c12a_pair', { rating: 'great', track: 7, done: pairDone, budget: 400000 }],
    ['expect', pairDone],
    ['ckpt', 'c12a_greats'],
    ['obj', 'Race the Great chocobos: 4 wins between them'],
    // (fed to 86 km/h: a baby inherits its parents' average Dash, so the Blue and Green start out fast enough for B-class)
    ['c12a_train', [[{ color: 'yellow', rating: 'great', sex: 'male' }, 2, 86], [{ color: 'yellow', rating: 'great', sex: 'female' }, 2, 86]], { done: greatsRaced, budget: 300000 }],
    ['expect', greatsRaced],
    ['ckpt', 'c12a_greats_raced'],

    // ---- Blue and Green (Carob Nut eggs)
    ['obj', 'Breed a Blue and a Green chocobo (Carob Nuts)'],
    ['c12a_farm', 'rent', { n: 2, done: { any: [stables(4), bgDone] } }],
    ['c12a_blueGreen', { done: bgDone, budget: 500000 }],
    ['expect', bgDone],
    ['ckpt', 'c12a_bluegreen'],
    ['obj', 'Race the Blue and Green chocobos: 9 wins between them'],
    ['c12a_train', [[(c) => c === (bgPair() || [])[0], 5, 86], [(c) => c === (bgPair() || [])[1], 4, 86]], { done: bgRaced, budget: 400000 }],
    ['expect', bgRaced],
    ['ckpt', 'c12a_bluegreen_raced'],

    // ---- the Battle Square: Omnislash (while the new chocobos grow up)
    ['obj', 'Battle Square: Omnislash (32000 BP)'],
    ['battle', {}],
    ['c12a_arena', { prizes: [{ prize: 'omnislash', label: 'Omnislash', bp: 32000 }, { prize: 'pre_emptive', label: 'Pre-Emptive', bp: 1000 }, { prize: 'speed_plus', label: 'Speed Plus', bp: 4000 }], done: (s, R2) => omnislash() && R2.gear.owned('pre_emptive') > 0 && R2.gear.owned('speed_plus') > 0, budget: 500000 }],
    // (FF7: the manual only teaches Cloud once he knows both Level 3 Limits; until then it stays in the bag, and
    // it is tried again at the end of the chapter)
    ['try', ['useItem', 'omnislash', 'cloud'], { done: omnislash }],
    ['ckpt', 'c12a_omnislash'],

    // ---- Black (Blue x Green, Carob Nut)
    ['obj', 'A Black chocobo (Blue x Green, a Carob Nut)'],
    ['c12a_black', { done: blackDone, budget: 250000 }],
    ['expect', blackDone],
    ['ckpt', 'c12a_black'],

    // ---- Sylkis again; Zeio Nuts and Goblin Punch; a Wonderful chocobo
    ['obj', 'More Sylkis Greens from the Chocobo Sage'],
    ['c12a_buy', 'sylkis_greens', 4, { keepGil: 12000, done: bwRaced }],
    ['try', ['c12a_sageMemory']],
    ['obj', 'Zeio Nuts and Goblin Punch on Goblin Island'],
    ['eskillMaster'],                                               // (the master Enemy Skill materia learns Goblin Punch)
    ['battle', { steal: ['zeio_nut'], learn: ['goblin_punch'] }],
    ['c12a_nuts', 'zeio_nut', 2, [312, 88], { need: 1, done: goldDone, budget: 250000 }],
    ['battle', {}],
    ['obj', 'A Wonderful chocobo on the Icicle tracks'],
    ['c12a_wonderful', { track: 6, count: 3, done: wonderfulDone, budget: 400000 }],
    ['expect', wonderfulDone],
    ['ckpt', 'c12a_wonderful'],
    ['obj', 'Race the Black and Wonderful chocobos: 12 wins between them'],
    ['c12a_train', [[{ color: 'black' }, 6, 90], [{ color: 'yellow', rating: 'wonderful' }, 6, 90]], { done: bwRaced, budget: 500000 }],
    ['expect', bwRaced],
    ['ckpt', 'c12a_bw_raced'],

    // ---- the Battle Square again: W-Summon; Speed Square: the Flayer
    ['obj', 'Battle Square: W-Summon (64000 BP)'],
    ['battle', {}],
    ['c12a_arena', { prizes: [{ prize: 'w_summon', label: 'W-Summon', bp: 64000 }, { prize: 'champion_belt', label: 'Champion Belt', bp: 16000 }, { prize: 'enemy_lure', label: 'Enemy Lure', bp: 250 }], max: 30, done: (s, R2) => R2.materiaCount('w_summon') > 0 && R2.gear.owned('champion_belt') > 0 && R2.gear.owned('enemy_lure') > 0, budget: 1100000 }],
    ['obj', 'Speed Square: the Flayer (5000 points)'],
    ['try', ['c12a_coaster'], { budget: 80000 }],
    ['obj', 'Wonder Square: the Snowboard and Torpedo Attack prizes'],
    ['try', ['c12a_wonderGames'], { budget: 200000 }],
    ['obj', "Wonder Square: the ???? prizes (Gil Plus, EXP Plus) with the GP there is (C12b buys the rest)"],
    ['try', ['c12a_wonderPrizes'], { budget: 60000 }],
    ['ckpt', 'c12a_saucer'],

    // ---- the Gold chocobo (Black x Wonderful, Zeio Nut)
    ['obj', 'A Gold chocobo (Black x Wonderful, a Zeio Nut)'],
    ['c12a_gold', { done: goldDone, budget: 250000 }],
    ['expect', goldDone],
    // ---- the Gold chocobo through the classes, then ten S-class wins in a row: Joe's record (Sprint Shoes, Precious
    // Watch, Cat's Bell, Chocobracelet, Counter Attack); the S-class boards' Sneak Attack and Enemy Away are kept when
    // they come, the rest traded for GP (the Wonder Square's ???? prizes)
    ['obj', "Chocobo racing: the Gold chocobo to S class, and Joe's record"],
    ['c12a_joe', { done: 'c12a_joe_record', budget: 1500000 }],
    // Sneak Attack and Enemy Away: rare prizes at the Chocobo Square only - the Gold chocobo races on until both are won
    // (C12b tries again when the cap came first)
    ['obj', 'Chocobo racing: Sneak Attack and Enemy Away', { done: PRIZES_WON }],
    ['c12a_prizes', ['sneak_attack', 'enemy_away'], { max: 250, done: PRIZES_WON, budget: 1200000 }],
    ['try', ['c12a_wonderPrizes'], { budget: 60000, done: (s) => s.flag('c12a_gs_gilplus') && s.flag('c12a_gs_expplus') }],
    ['c12a_leaveSaucer'],
    // Omnislash needs every other Limit of Cloud's: Finishing Touch comes from using Meteorain 6 times. When he isn't
    // ready yet, the manual waits in the bag for C12b's Limit training on the Gelnika's Unknowns (the engine's manual
    // watcher reads it as soon as he is)
    ['try', ['useItem', 'omnislash', 'cloud'], { done: (s, R2) => omnislash() || !s.has('omnislash') }],
    ['c10_boardAirship'],
    ['ckpt', 'c12a_end'],
  ];
})();

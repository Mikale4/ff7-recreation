// Runner: chocobos (docs/RUNNER.md, "Chocobos"). Catching one on the chocobo tracks with a Chocobo Lure
// materia and greens, riding it across the terrain its colour allows (blue / black / gold: shallow
// rivers, green / black / gold: mountains, gold: the ocean), getting down, and the Chocobo Farm's services
// (stables, moving caught birds in, feeding, mating, riding a stabled bird). Everything goes through
// the game: the world map's encounter hook starts the chocobo battle (js/maps/c12/part1.js), greens are
// thrown with the battle's Item command, the farm is worked through Choco Bill's and Choco Billy's
// questions.
//   ['catchChocobo', { then: 'ride' | 'farm' | 'free', greens, lure, track, tries }]
//   ['ride', color | { color, chocobo }]      ['dismount']
//   ['world', loc | [x, y], { via: 'chocobo', color }]  (runner.js O.world)
//   ['chocoboFarm', 'rent' | 'move' | 'feed' | 'mate' | 'ride' | 'release', opts]
(function () {
  const R = FF7.runner, U = FF7.util, O = R.ops;
  const CH = R.choco = {};
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const mod = (a, n) => ((a % n) + n) % n;
  const wrapD = (d, n) => { while (d > n / 2) d -= n; while (d < -n / 2) d += n; return d; };
  const Lib = () => FF7.story.c12aLib || null;
  const GREENS = ['sylkis_greens', 'reagan_greens', 'curiel_greens', 'pahsana_greens', 'tantal_greens', 'krakka_greens', 'gysahl_greens', 'mimett_greens'];
  // for catching: the cheapest greens first; Sylkis, Reagan and Mimett (breeding and racing food) only when asked for
  const CATCH_GREENS = ['gysahl_greens', 'krakka_greens', 'tantal_greens', 'pahsana_greens', 'curiel_greens'];
  CH.greensFor = (t) => { const asked = [].concat(t && t.greens || []); return asked.concat(CATCH_GREENS).find(id => id && FF7.sys.inv.count(id) > 0) || null; };

  // ---------------------------------------------------------------- in battle: greens for the bird
  // (the tactician's hook, while a catchChocobo step runs): the first turn throws greens at the wild
  // chocobo (FF7: it runs off less), the Auto AI never attacks it, nobody runs away
  const baseTactic = R.tactic, baseFlee = R.wantFlee;
  R.tactic = function (battle, p) {
    const t = CH.task;
    if (t && p.isParty) {
      const bird = battle.enemies.find(e => e.targetable && e.def0 && e.def0.chocobo);
      const pending = bird && battle.queue.concat(battle.current || []).some(q => q.type === 'item' && (q.targets || []).includes(bird));
      if (bird && !(bird.vars && bird.vars.fedGreens) && !pending) {
        const g = CH.greensFor(t);
        if (g) { R.say('chocobo: ' + U.itemName(g) + ' for the chocobo'); return { actor: p, type: 'item', item: g, targets: [bird], side: 'enemy' }; }
      }
    }
    return baseTactic.call(R, battle, p);
  };
  R.wantFlee = function (bs) { if (CH.task && (bs.enemies || []).some(e => e.def0 && e.def0.chocobo)) return false; return baseFlee.call(R, bs); };

  // ---------------------------------------------------------------- the lure
  CH.lured = () => FF7.sys.party.active().some(c => FF7.sys.materia.indepLevels(c, 'chocobo_lure').length);
  CH.equipLure = function* (who) {
    const st = FF7.state, M = FF7.sys.materia;
    if (CH.lured()) return true;
    const party = FF7.sys.party.active();
    const c = (who && st.chars[who] && st.party.includes(who)) ? st.chars[who] : party.slice().sort((a, b) => (b.weaponMateria.concat(b.armorMateria).filter(x => !x).length) - (a.weaponMateria.concat(a.armorMateria).filter(x => !x).length))[0];
    if (!c) return 'no party';
    const holder = st.members.map(id => st.chars[id]).find(x => x && M.equippedList(x).some(m => m.id === 'chocobo_lure'));
    const free = ['weaponMateria', 'armorMateria'].find(k => c[k].some(x => !x));
    if (holder) {
      // from a reserve member: Exchange into a free slot, or over the last armour slot
      const key = free || (c.armorMateria.length ? 'armorMateria' : 'weaponMateria');
      const i = free ? c[key].findIndex(x => !x) : c[key].length - 1;
      yield* O.moveMateria(holder.id, c.id, 'chocobo_lure', { slot: key === 'armorMateria' ? 'armor' : 'weapon', index: i });
    } else if (st.materia.some(m => m.id === 'chocobo_lure')) {
      if (free) yield* O.materia(c.id, 'chocobo_lure', free === 'armorMateria' ? 'armor' : 'weapon');
      else { const key = c.armorMateria.length ? 'armorMateria' : 'weaponMateria'; yield* O.materia(c.id, 'chocobo_lure', { slot: key === 'armorMateria' ? 'armor' : 'weapon', index: c[key].length - 1 }); }
    } else return 'no Chocobo Lure materia';
    if (R.menus) yield* R.menus.finish();
    return CH.lured() ? true : 'the Chocobo Lure did not go on';
  };

  // ---------------------------------------------------------------- tracks
  // the walkable tiles (on foot) of a track (FF7.data.world.chocoboTracks, the tracks are +-2 tiles)
  CH.trackTiles = function (ws, t) {
    const out = [], D = R.worldD();
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = mod(t.x + dx, D.w), y = mod(t.y + dy, D.h);
      if (R.worldCan(ws, null, x, y) && !R.entries()[x + ',' + y]) out.push([x, y]);
    }
    return out;
  };
  // the track to use: o.track (index or [x, y]) / o.region, else the nearest one walking reaches
  CH.pickTrack = function (ws, o) {
    const D = R.worldD(), L = Lib(), list = (D.chocoboTracks || []).filter(t => !L || !L.CHOCO_AREAS || L.CHOCO_AREAS[t.region]);
    if (typeof o.track === 'number') return list[o.track] || null;
    if (Array.isArray(o.track)) return { x: o.track[0], y: o.track[1], region: L && L.regionAt ? L.regionAt(o.track[0], o.track[1]) : null };
    const x0 = Math.floor(ws.px), y0 = Math.floor(ws.pz);
    const cand = list.filter(t => !o.region || t.region === o.region).map(t => ({ t, d: Math.hypot(wrapD(t.x - x0, D.w), wrapD(t.y - y0, D.h)) })).sort((a, b) => a.d - b.d);
    for (const c of cand) { const tiles = CH.trackTiles(ws, c.t); if (tiles.length && R.worldPath(ws, x0, y0, tiles, null, { maxNodes: 60000 })) return c.t; }
    return null;
  };

  // ['catchChocobo', { then: 'ride' | 'farm' | 'free', greens, lure: charId, track: index | [x, y], region,
  //   tries }]: on the world map (walks out to it), with the Chocobo Lure on the party (equipped on the
  // Materia screen when it isn't) and greens in the bag: walks the chocobo tracks until a chocobo shows
  // up, throws it greens, beats the rest and answers "What will you do with the chocobo?". Done when one
  // is caught (then: 'ride' - the default - ends riding it on the world map).
  O.catchChocobo = function* (o = {}) {
    if (!Lib()) return 'catchChocobo: the chocobo scripts are not loaded';
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return 'catchChocobo: ' + g; yield* R.settle(3); }
    let ws = R.worldScene(); if (!ws) return 'catchChocobo: not on the world map';
    if (ws.vehicle) { yield* R.pressWorld(ws.vehicle === 'chocobo' ? 'cancel' : 'ok'); ws = R.worldScene(); if (!ws || ws.vehicle) return 'catchChocobo: cannot get off the ' + (ws && ws.vehicle); }
    const lure = yield* CH.equipLure(o.lure);
    if (lure !== true) return 'catchChocobo: ' + lure;
    if (!CH.greensFor({ greens: o.greens })) R.note('catchChocobo: no ' + (o.greens ? [].concat(o.greens).join(' / ') + ' or ' : '') + 'cheap greens in the bag (the chocobo will run off more often; Sylkis, Reagan and Mimett are kept for the farm)');
    ws = R.worldScene(); if (!ws) return 'catchChocobo: not on the world map';
    const t = CH.pickTrack(ws, o);
    if (!t) return 'catchChocobo: no chocobo tracks within reach';
    const then = o.then || 'ride';
    const want = { ride: /^Ride it/, farm: /Chocobo Farm/, free: /^Let it go/ }[then] || /^Ride it/;
    const answer = (choices) => { const i = choices.findIndex(c => want.test(c)); return i >= 0 ? i : Math.max(0, choices.findIndex(c => /^Ride it/.test(c))); };
    const n0 = R.stats.chocobos || 0, tries = o.tries || 12, b0 = R.stats.battles;
    CH.task = { greens: o.greens };
    R.say('chocobo: the tracks at ' + t.x + ',' + t.y + ' (' + t.region + ')');
    try {
      let side = 0, lastB = R.frames;
      for (let g = 0; g < 100000; g++) {
        if ((R.stats.chocobos || 0) > n0) break;
        if (R.stats.battles - b0 >= tries * 4 && (R.stats.chocoboMisses || 0) >= tries) return 'catchChocobo: no chocobo caught in ' + (R.stats.battles - b0) + ' battles';
        if (R.frames - lastB > 30000) return 'catchChocobo: no encounters on the tracks';
        if (R.stats.battles !== b0 + side) { lastB = R.frames; }
        if (!R.choices.some(c => c.a === answer)) R.choices.push({ a: answer, pc: 'choco' });
        ws = R.worldScene();
        if (!ws) { yield; continue; }                       // a battle, the story after it
        if (ws.vehicle) break;                              // riding it already
        const tiles = CH.trackTiles(ws, t), x = Math.floor(ws.px), y = Math.floor(ws.pz);
        const on = tiles.some(([a, b]) => a === mod(x, R.worldD().w) && b === mod(y, R.worldD().h));
        const goals = on ? tiles.filter(([a, b]) => Math.abs(a - x) + Math.abs(b - y) >= 2) : tiles;
        const r = yield* R.walkWorld([goals[side++ % goals.length] || tiles[0]], { anywhere: true });
        if (r !== true && r !== 'mapchanged') return 'catchChocobo: ' + r;
        yield* R.settle(2);
      }
    } finally { CH.task = null; R.choices = R.choices.filter(c => c.pc !== 'choco'); }
    yield* R.settle(4);
    if ((R.stats.chocobos || 0) <= n0) return 'catchChocobo: no chocobo caught';
    R.say('chocobo: caught (' + then + ')');
    if (then === 'ride') { const w2 = R.worldScene(); return w2 && w2.vehicle === 'chocobo' ? true : 'catchChocobo: not riding it'; }
    return true;
  };

  // ['dismount']: get down from the chocobo (Cancel); a wild one runs off, a stabled one goes home
  O.dismount = function* () {
    const ws = R.worldScene(); if (!ws || ws.vehicle !== 'chocobo') return true;
    yield* R.pressWorld('cancel');
    return R.worldScene() && !R.worldScene().vehicle ? true : 'dismount: still riding';
  };

  // ---------------------------------------------------------------- the Highwind carries a chocobo
  const LANDABLE = 'gsdnwxpch';
  const tileOf = (loc) => { if (Array.isArray(loc)) return loc; const L = FF7.world.location(loc); return L ? [L.x, L.y] : null; };
  // the tiles a chocobo of that colour can ride from to reach tile T (one flood from T, 4 ways)
  CH.reachSet = function (T, color) {
    const ws = R.worldScene() || FF7.worldScene, D = R.worldD(), W = D.w, H = D.h, E = R.entries(), st = FF7.state;
    if (!ws) return null;
    const saved = st.vars.chocobo_color, v = ws.vehicle;
    st.vars.chocobo_color = color || saved || 'yellow'; ws.vehicle = 'chocobo';
    const seen = new Uint8Array(W * H), q = [T[0] + T[1] * W];
    seen[q[0]] = 1;
    try {
      while (q.length) {
        const i = q.pop(), x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = mod(x + dx, W), ny = mod(y + dy, H), j = nx + ny * W;
          if (seen[j] || E[nx + ',' + ny] || !ws.canEnter(nx, ny)) continue;
          seen[j] = 1; q.push(j);
        }
      }
    } finally { st.vars.chocobo_color = saved; ws.vehicle = v; }
    return seen;
  };
  // can the chocobo being ridden get there by itself?
  CH.canRide = function (loc) {
    const ws = R.worldScene(), T = tileOf(loc); if (!ws || ws.vehicle !== 'chocobo' || !T) return true;
    return !!R.worldPath(ws, Math.floor(ws.px), Math.floor(ws.pz), [T], 'chocobo');
  };
  // where the Highwind can set a chocobo of that colour down to ride to loc (nearest to it), or null
  CH.landingFor = function (loc, color) {
    const T = tileOf(loc), D = R.worldD(); if (!T) return null;
    const set = CH.reachSet(T, color); if (!set) return null;
    let best = null, bd = Infinity;
    for (let i = 0; i < set.length; i++) {
      if (!set[i]) continue;
      const x = i % D.w, y = (i / D.w) | 0;
      if (!LANDABLE.includes(D.rows[y][x]) || R.entries()[x + ',' + y]) continue;
      const d = Math.hypot(wrapD(x - T[0], D.w), wrapD(y - T[1], D.h));
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  };
  // FF7: ride the chocobo into the parked Highwind, fly to a landing tile from which this colour rides to
  // the place, land (in the saddle; js/world/worldscene.js)
  CH.airlift = function* (loc) {
    const st = FF7.state, D = R.worldD();
    let ws = R.worldScene(); if (!ws || ws.vehicle !== 'chocobo') return 'airlift: not riding a chocobo';
    const hw = st.world.vehicles && st.world.vehicles.highwind;
    if (!hw) return 'no chocobo path to ' + loc + ' and no Highwind to fly the chocobo there';
    const land = CH.landingFor(loc, st.vars.chocobo_color || 'yellow');
    if (!land) return 'no landing place from which a ' + (st.vars.chocobo_color || 'yellow') + ' chocobo reaches ' + loc;
    R.say('chocobo: into the Highwind, landing at ' + land.join(',') + ' for ' + loc);
    const spots = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = mod(hw.x + dx, D.w), y = mod(hw.y + dy, D.h); if (Math.hypot(dx, dy) <= 2.1 && R.worldCan(ws, 'chocobo', x, y) && !R.entries()[x + ',' + y]) spots.push([x, y]); }
    let r = yield* R.walkWorld(spots);
    if (r !== true) return 'airlift: cannot ride to the Highwind (' + r + ')';
    yield* R.pressWorld('ok');
    ws = R.worldScene();
    if (!ws || ws.vehicle !== 'highwind') return 'airlift: the chocobo did not board the Highwind';
    r = yield* R.fly(land[0], land[1]); if (r !== true) return 'airlift: ' + r;
    yield* R.pressWorld('ok');
    ws = R.worldScene();
    return ws && ws.vehicle === 'chocobo' ? true : 'airlift: did not land in the saddle';
  };

  // ---------------------------------------------------------------- the farm
  // does stabled chocobo c fit filter f: a colour, a name, or { color, sex, rating, name, index }
  CH.match = function (c, f, i) {
    if (f == null) return true;
    if (typeof f === 'number') return i === f;
    if (typeof f === 'string') return c.color === f || c.name === f;
    return (!f.color || c.color === f.color) && (!f.sex || c.sex === f.sex) && (!f.rating || c.rating === f.rating) && (!f.name || c.name === f.name) && (f.index == null || i === f.index) && (!f.not || c !== f.not);
  };
  CH.find = (f, not) => { const L = Lib(); const list = L ? L.chocobos() : []; return list.find((c, i) => CH.match(c, f, i) && c !== not) || null; };
  // One answer for every question of Choco Bill's / Choco Billy's menus during a farm op: the op's own
  // menu entry once, then 'Nothing'; the birds, greens, nuts and names the op asked for.
  CH.responder = function (action, o, st) {
    const L = Lib();
    const pick = (choices, test) => { const i = choices.findIndex(test); return i; };
    const lastOr = (choices) => Math.max(0, choices.length - 1);
    return function (choices, w) {
      const q = (w && w.pages ? w.pages.map(p => p.join(' ')).join(' ') : '');
      const has = (s) => choices.some(c => c === s || c.startsWith(s));
      let i = -1;
      if (has('Feed chocobos')) {                       // Billy's services menu
        const entry = { feed: 'Feed chocobos', move: 'Move chocobos', mate: 'Mate chocobos', ride: 'Ride a chocobo', release: 'Release a chocobo' }[action];
        i = !st.menu && entry ? pick(choices, c => c === entry) : pick(choices, c => c === 'Nothing');
        st.menu = true;
      } else if (has('Take care of my chocobos')) { i = !st.menu ? 0 : pick(choices, c => c === 'Nothing'); st.menu = true; }
      else if (has('Rent one (10,000 gil)')) { if (st.rented < (o.n || 1)) { st.rented++; i = 0; } else i = 1; }
      else if (has('Move it to a stable')) {
        const p = L.pen()[st.pen || 0], keep = !o.min || (p && L.rank(p.rating) >= L.rank(o.min));
        if (keep && L.freeStables() > 0) i = 0; else if (!keep) i = 1; else { i = 2; st.pen = (st.pen || 0) + 1; }
      } else if (/What should we call/.test(q)) i = o.name ? Math.max(0, choices.indexOf(o.name)) : 0;
      else if (/^What should .* eat\?/.test(q) || /eat\?/.test(q)) { const g = o.greens ? U.itemName(o.greens) : null; i = g ? pick(choices, c => c.startsWith(g)) : 0; if (i < 0) i = lastOr(choices); }
      else if (/How many\?/.test(q)) { const n = String(o.qty || 1); i = choices.indexOf(n); if (i < 0) i = 0; }
      else if (/Which nut/.test(q)) { const g = o.nut ? U.itemName(o.nut) : null; i = g ? pick(choices, c => c.startsWith(g)) : 0; if (i < 0) i = lastOr(choices); }
      else if (/Really set .* free\?/.test(q)) i = 0;
      else if (choices[choices.length - 1] === 'Cancel' && L) {    // a chocobo list (L.pickChocobo)
        const f = /mate with\?/.test(q) ? (o.b || { not: st.a }) : action === 'mate' ? o.a : o.chocobo;
        const list = L.chocobos();
        const c = list.find((x, k) => CH.match(x, f, k) && x !== (/mate with\?/.test(q) ? st.a : null) && choices.includes(L.label(x)));
        if (action === 'mate' && !/mate with\?/.test(q)) st.a = c;
        i = c ? choices.indexOf(L.label(c)) : lastOr(choices);
      }
      if (i < 0) i = lastOr(choices);                  // anything else: the last answer (Cancel / Nothing)
      return i;
    };
  };
  // ['chocoboFarm', action, opts] (disc 2/3, once the Highwind flies, as in FF7):
  //   'rent'    { n }            Choco Bill rents n stables (10,000 gil each)
  //   'move'    { min, name }    Choco Billy moves the fence's birds into the stables (min: the worst
  //                              rating kept, 'good'...; the rest are set free); each is named
  //   'feed'    { chocobo, greens, qty }   feed a stabled bird (qty 1 / 5 / 10)
  //   'mate'    { a, b, nut }    mate two stabled birds with a nut (a, b: filters, see below)
  //   'ride'    { chocobo }      ride a stabled bird out onto the world map
  //   'release' { chocobo }      set a stabled bird free
  // A chocobo filter: a colour ('blue'), a name, or { color, sex, rating, name, index }.
  O.chocoboFarm = function* (action, o = {}) {
    const L = Lib(); if (!L) return 'chocoboFarm: the chocobo farm scripts are not loaded';
    const who = action === 'rent' ? { map: 'farm_house', npc: 'c12a_bill' } : { map: 'farm_stable', npc: 'billy' };
    if (R.where() !== who.map) { const g = yield* R.gotoMap(who.map); if (g !== true && g !== 'mapchanged') return 'chocoboFarm: ' + g; }
    const before = { stables: L.stables(), birds: L.chocobos().length, pen: L.pen().length, greens: o.greens ? FF7.sys.inv.count(o.greens) : GREENS.reduce((a, g) => a + FF7.sys.inv.count(g), 0) };
    const st = { menu: false, rented: 0 }, answer = CH.responder(action, o, st);
    for (let i = 0; i < 60; i++) R.choices.push({ a: answer, pc: 'farm' });
    let r;
    try { r = yield* O.talk(who.npc, { map: who.map }); } finally { R.choices = R.choices.filter(c => c.pc !== 'farm'); }
    if (r !== true) return 'chocoboFarm: ' + r;
    yield* R.settle(3);
    const now = { stables: L.stables(), birds: L.chocobos().length, pen: L.pen().length, greens: o.greens ? FF7.sys.inv.count(o.greens) : GREENS.reduce((a, g) => a + FF7.sys.inv.count(g), 0) };
    R.say('chocoboFarm ' + action + ': stables ' + now.stables + ', birds ' + now.birds + ', fence ' + now.pen);
    switch (action) {
      case 'rent': return now.stables >= before.stables + (o.n || 1) || now.stables >= 6 ? true : 'chocoboFarm: rented ' + (now.stables - before.stables) + ' of ' + (o.n || 1) + ' stables';
      case 'move': return now.pen < before.pen || !before.pen ? true : 'chocoboFarm: nothing moved from the fence';
      case 'feed': return now.greens < before.greens ? true : 'chocoboFarm: nothing was fed';
      case 'mate': return now.birds > before.birds ? true : 'chocoboFarm: no egg (not ready, no nut, or no free stable)';
      case 'release': return now.birds < before.birds ? true : 'chocoboFarm: nobody was released';
      case 'ride': return R.where() === 'world' && R.worldScene() && R.worldScene().vehicle === 'chocobo' ? true : 'chocoboFarm: not riding';
    }
    return 'chocoboFarm: unknown action ' + action;
  };
  // ['ride', color | { color, chocobo }]: onto a chocobo of that colour: the one being ridden, a stabled
  // one (Choco Billy, the farm), or a wild one (yellow: catchChocobo, then: 'ride')
  O.ride = function* (spec, o = {}) {
    const f = isObj(spec) ? spec : spec ? { color: spec } : {};
    const color = f.color || null, ws = R.worldScene(), L = Lib();
    if (o.to && color && !CH.landingFor(o.to, color) && !(ws && ws.vehicle === 'chocobo' && (FF7.state.vars.chocobo_color || 'yellow') === color && CH.canRide(o.to))) return 'a ' + color + ' chocobo cannot reach ' + (Array.isArray(o.to) ? o.to.join(',') : o.to);
    if (ws && ws.vehicle === 'chocobo' && (!color || (FF7.state.vars.chocobo_color || 'yellow') === color)) return true;
    // a stabled one: to the farm (on the chocobo being ridden, if any), Choco Billy saddles it up
    const bird = L && L.stables() ? CH.find(f.chocobo || (color ? { color } : null)) : null;
    if (bird) return yield* O.chocoboFarm('ride', { chocobo: f.chocobo || { color: bird.color, name: bird.name } });
    if (ws && ws.vehicle === 'chocobo') yield* O.dismount();
    if (!color || color === 'yellow') return yield* O.catchChocobo(Object.assign({ then: 'ride' }, o));
    return 'ride: no ' + color + ' chocobo in the stables';
  };
})();

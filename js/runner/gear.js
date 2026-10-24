// Runner: gear and materia management (docs/RUNNER.md, "Gear and materia"). Everything goes through the
// real screens (js/runner/menus.js): the Shop window to buy and sell, the Equip screen to equip, the
// Materia screen (and Arrange > Exchange) to move materia.
//   ['gear', { shop, keepGil, members, reserve, slots, sell, keep, minGain, weights }]  buy + equip + sell
//   ['autoequip', { members, reserve, slots }]                                         best from the bag
//   ['moveMateria', from, to, materiaId, where]                                        one move
//   ['loadout', charId, { weapon: [...], armor: [...], clear }]                        a whole setup
//   ['autoMateria', { steal, sense, eskill, healer, ... }]                             a default setup
(function () {
  const R = FF7.runner, U = FF7.util, O = R.ops;
  const G = R.gear = {};
  const MT = R.mat = {};
  const SLOTS = ['weapon', 'armor', 'accessory'];
  const KEYS = ['weaponMateria', 'armorMateria'];
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const shown = () => R.menuVisible() && R.menus;
  const inParty = (id) => FF7.state.party.includes(id);
  const guest = (c) => !c || FF7.isGuest(c.id);
  const matName = (m) => ((FF7.data.materia[m && m.id ? m.id : m] || {}).name || (m && m.id) || m);

  // ================================================================== scoring (FF7's own numbers)
  // Weapon: Attack, Attack% (hit), Magic, the other stat bonuses, critical bonus; armour: Defence, M.Def,
  // Evasion (Def% / MDef%), stat bonuses, elemental and status protection; both: materia slots, LINKED
  // pairs and AP growth (Nothing / Normal / Double / Triple). Accessory: its effect (stats, status and
  // elemental protection, auto-statuses). Weights in G.W (opts.weights overrides).
  G.W = { atk: 1, hit: 0.25, mag: 0.75, crit: 0.1, def: 1, mdef: 1, defPct: 0.5, mdefPct: 0.5, slot: 4, link: 5 };
  const SW = { str: 1, mag: 1, vit: 0.8, spr: 0.8, dex: 0.6, lck: 0.4 };
  const ST_VAL = { death: 6, petrify: 4, slow_numb: 4, stop: 3, death_sentence: 3, confusion: 3, silence: 3, paralysis: 3, berserk: 2, sleep: 2, frog: 2, small: 2, poison: 1, darkness: 1, fury: 1, sadness: 0.5 };
  const AUTO_VAL = { haste: 30, regen: 15, barrier: 10, mbarrier: 10, peerless: 40, shield: 20, reflect: 0, berserk: -25, death_sentence: -80 };
  const EL_VAL = { absorb: 5, nullify: 4, halve: 2, weak: -3 };
  const GROW = { 0: -2, 1: 0, 2: 2, 3: 3 };                   // per slot: no AP / normal / double / triple
  const statVal = (s) => { let v = 0; for (const k in s || {}) v += (SW[k] || 0.5) * s[k]; return v; };
  const elemVal = (e) => { let v = 0; for (const k in e || {}) v += EL_VAL[e[k]] || 0; return v; };
  const statusVal = (list) => (list || []).reduce((a, s) => a + (ST_VAL[s] || 1), 0);
  G.score = function (c, slot, id, o = {}) {
    if (!id) return slot === 'accessory' ? 0 : -999;
    const f = U.findItem(id); if (!f || f.kind !== slot) return -999;
    const d = f.def, W = Object.assign({}, G.W, o.weights || {});
    let v;
    if (slot === 'weapon') v = (d.atk || 0) * W.atk + ((d.hit || 96) - 96) * W.hit + (d.mag || 0) * W.mag + (d.crit || 0) * W.crit + statVal(d.stats);
    else if (slot === 'armor') v = (d.def || 0) * W.def + (d.mdef || 0) * W.mdef + (d.defPct || 0) * W.defPct + (d.mdefPct || 0) * W.mdefPct + statVal(d.stats) + elemVal(d.elem) + statusVal(d.statusDef);
    else v = statVal(d.stats) + elemVal(d.elem) + statusVal(d.statusDef) + (d.auto || []).reduce((a, s) => a + (AUTO_VAL[s] || 5), 0) + ({ sneak_glove: 5, cats_bell: 2, hypnocrown: 2 }[d.special] || 0);
    if (slot !== 'accessory') {
      const n = d.slots || 0, l = d.links || 0, g = d.growth != null ? d.growth : 1;
      v += n * W.slot + l * W.link + n * (GROW[g] || 0);
      // what this character carries must still fit (materia that doesn't goes back to the list)
      if (c) {
        const used = c[slot === 'weapon' ? 'weaponMateria' : 'armorMateria'] || [], cur = U.findItem(c[slot]), cl = cur ? cur.def.links || 0 : 0;
        let pairs = 0; for (let k = 0; k < cl; k++) if (used[2 * k] && used[2 * k + 1]) pairs++;
        v -= Math.max(0, used.filter(Boolean).length - n) * 8 + Math.max(0, pairs - l) * 6;
      }
    }
    return v;
  };
  // who is equipped: the active party first (slot order), then the reserve when asked
  G.members = function (o = {}) {
    const st = FF7.state;
    let ids = o.members === 'all' ? st.members.slice() : Array.isArray(o.members) ? o.members.slice() : st.party.filter(Boolean);
    if (o.reserve && !Array.isArray(o.members)) st.members.forEach(id => { if (!ids.includes(id)) ids.push(id); });
    ids.sort((a, b) => (inParty(b) - inParty(a)) || st.party.indexOf(a) - st.party.indexOf(b));
    return ids.map(id => st.chars[id]).filter(c => c && !guest(c) && st.members.includes(c.id));
  };
  // The upgrades: from the bag first, then from the shop's stock (o.stock) within o.budget gil. A global
  // greedy by gain (the active party counts double), one item per character and slot.
  // -> { assign: [{ c, slot, id, gain, price }], buy: { id: qty }, cost }
  G.plan = function (o = {}) {
    const st = FF7.state, slots = o.slots || SLOTS, members = G.members(o);
    const avail = {};
    st.items.forEach(e => { const f = U.findItem(e.id); if (f && f.kind !== 'item') avail[e.id] = e.qty; });
    const stock = (o.stock || []).filter(id => { const f = U.findItem(id); return f && f.kind !== 'item' && (f.def.price || 0) > 0; });
    const opts = [];
    members.forEach(c => slots.forEach(slot => {
      const cur = G.score(c, slot, c[slot], o), prio = inParty(c.id) ? 1 : 0.5;
      new Set(Object.keys(avail).concat(stock)).forEach(id => {
        const f = U.findItem(id); if (!f || f.kind !== slot || !FF7.ui.canEquip(c, slot, id)) return;
        const gain = G.score(c, slot, id, o) - cur;
        if (gain < (o.minGain || 1)) return;
        opts.push({ c, slot, id, gain, w: gain * prio, price: stock.includes(id) ? f.def.price : 0 });
      });
    }));
    opts.sort((a, b) => b.w - a.w || a.price - b.price);
    let budget = o.budget != null ? o.budget : 0, cost = 0;
    const taken = new Set(), used = {}, buy = {}, assign = [];
    for (const op of opts) {
      const k = op.c.id + ':' + op.slot; if (taken.has(k)) continue;
      if ((avail[op.id] || 0) - (used[op.id] || 0) > 0) { used[op.id] = (used[op.id] || 0) + 1; op.price = 0; }
      else if (op.price > 0 && op.price <= budget && FF7.sys.inv.count(op.id) + (buy[op.id] || 0) < 99) { budget -= op.price; cost += op.price; buy[op.id] = (buy[op.id] || 0) + 1; }
      else continue;
      taken.add(k); assign.push(op);
    }
    return { assign, buy, cost };
  };
  // Gear nobody needs any more: bag items every member who could wear them already beats (in score, slots,
  // links and growth). Never one-of-a-kind gear (no shop price), accessories (unless o.sellAccessories),
  // armour with elemental / status protection or special weapons (unless o.sellAll), weapons for someone
  // who hasn't joined, or o.keep. after: { charId: { slot: id } } equipment after planned changes.
  G.obsolete = function (o = {}, after, bagAfter) {
    const st = FF7.state, all = st.members.map(id => st.chars[id]).filter(c => c && !guest(c));
    const eq = (c, slot) => after && after[c.id] && after[c.id][slot] !== undefined ? after[c.id][slot] : c[slot];
    const bag = bagAfter || Object.fromEntries(st.items.map(e => [e.id, e.qty]));
    const out = [];
    for (const id in bag) {
      if (!(bag[id] > 0)) continue;
      const f = U.findItem(id); if (!f || f.kind === 'item') continue;
      const d = f.def, slot = f.kind;
      if (!d.price || (o.keep || []).includes(id) || FF7.data.keyItems[id]) continue;
      if (slot === 'accessory' && !o.sellAccessories) continue;
      if (!o.sellAll && (d.special || (slot === 'armor' && (Object.keys(d.elem || {}).length || (d.statusDef || []).length)))) continue;
      const users = all.filter(c => FF7.ui.canEquip(c, slot, id));
      if (!users.length) continue;
      const beaten = users.every(c => {
        const e = eq(c, slot); if (!e) return false;
        const de = (U.findItem(e) || {}).def || {};
        return G.score(null, slot, e, o) >= G.score(null, slot, id, o) && (de.slots || 0) >= (d.slots || 0) && (de.links || 0) >= (d.links || 0) &&
          ((de.growth != null ? de.growth : 1) >= (d.growth != null ? d.growth : 1) || !(d.slots > 0));
      });
      // (a collector keeps one of everything, FF7's 100%: the last copy nobody wears stays in the bag)
      const worn = all.some(c => eq(c, slot) === id);
      const qty = worn || o.sellLast ? bag[id] : bag[id] - 1;
      if (beaten && qty > 0) out.push({ id, qty });
    }
    return out;
  };
  const saleOf = (list) => list.reduce((a, e) => a + FF7.sys.inv.sellPrice(e.id) * (e.qty === 'all' ? FF7.sys.inv.count(e.id) : e.qty), 0);
  // the shop visit's plan, made when the Shop window opens (its stock): sell what is obsolete now,
  // buy the upgrades the gil (and the sales) pay for, keeping o.keepGil
  G.shopPlan = function (w, o) {
    const stock = (w.stock || []).filter(id => !String(id).startsWith('materia:'));
    const sell = o.sell === false ? [] : G.obsolete(o, null).map(e => ({ id: e.id, qty: e.qty }));
    const budget = Math.max(0, FF7.state.gil + saleOf(sell) - (o.keepGil || 0));
    const p = G.plan(Object.assign({}, o, { stock, budget }));
    const buy = Object.keys(p.buy).map(id => ({ id, qty: p.buy[id] }));
    R.say('gear: ' + (buy.length ? 'buy ' + buy.map(e => e.qty + ' ' + U.itemName(e.id)).join(', ') : 'nothing to buy') + (sell.length ? '; sell ' + sell.map(e => U.itemName(e.id)).join(', ') : ''));
    return { buy, sell, assign: p.assign, stock };
  };
  // equip a list of { c, slot, id } (the Equip screen; L1/R1 between characters), then put back any
  // materia that fell off (a new weapon / armour with fewer slots)
  G.equipAll = function* (assign) {
    const order = assign.slice().sort((a, b) => (inParty(b.c.id) - inParty(a.c.id)) || FF7.state.party.indexOf(a.c.id) - FF7.state.party.indexOf(b.c.id) || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
    for (const a of order) {
      if (a.c[a.slot] === a.id || !FF7.sys.inv.has(a.id)) continue;
      const before = FF7.sys.materia.equippedList(a.c);
      const r = yield* O.equip(a.c.id, a.slot, a.id, { keep: true });
      if (r !== true) { R.note('gear: ' + r); continue; }
      const lost = before.filter(m => !FF7.sys.materia.equippedList(a.c).includes(m));
      for (const m of lost) {
        const key = KEYS.find(k => a.c[k].some(x => !x)); if (!key) { R.note('gear: no room left for ' + matName(m) + ' on ' + a.c.name); continue; }
        yield* MT.put(a.c, key, a.c[key].findIndex(x => !x), m);
      }
    }
    yield* R.menus.finish();
  };

  // ['gear', { shop: npcId | [x, y], choose, keepGil, members: [ids] | 'all', reserve, slots, sell, keep: [ids],
  //   sellAccessories, sellAll, minGain, weights }]: at a shop, the best affordable upgrades for each
  // member; bought (Shop window), equipped (Equip screen), the replaced gear sold on a second visit
  O.gear = function* (o = {}) {
    const where = o.shop || o.npc || o.at;
    if (!where) return 'gear: which shop? ({ shop: npcId | [x, y] })';
    let stock = null;
    for (let visit = 0; visit < 3; visit++) {
      let planned = null;
      if (visit) {                                  // anything left to do there?
        const sell = o.sell === false ? [] : G.obsolete(o, null);
        const more = G.plan(Object.assign({}, o, { stock, budget: Math.max(0, FF7.state.gil + saleOf(sell) - (o.keepGil || 0)) }));
        if (!sell.length && !more.assign.some(a => a.price > 0)) break;
        if (o.choose) [].concat(o.choose).forEach(a => R.choices.push({ a, pc: R.pc }));
      }
      R.shopTask = { buy: [], sell: [], closed: false, sellFirst: true, plan: (w) => (planned = G.shopPlan(w, o)) };
      const r = yield* R.visitShop(where, {});
      R.shopTask = null;
      if (r !== true) return 'gear: ' + r;
      if (!planned) return 'gear: no Shop window opened (' + JSON.stringify(where) + ')';
      stock = planned.stock;
      const ok = planned.assign.filter(a => FF7.sys.inv.has(a.id));
      if (ok.length) yield* G.equipAll(ok);
      if (!planned.buy.length && !ok.length) break;
    }
    R.say('gear: ' + G.members(o).map(c => c.name + ' ' + SLOTS.map(s => U.itemName(c[s]) || '-').join(' / ')).join(' | '));
    return true;
  };
  // ---- ['buyNew', { shop, choose, kinds, want: { id: n }, keepGil, only: [ids], skip: [ids] }]: at a shop, one
  // of every kind in its stock the party has never had (a collector's visit: FF7's 100% owns every materia,
  // weapon, armour and accessory): kinds 'materia' (default) and / or 'weapon', 'armor', 'accessory' ('gear':
  // the three); want: at least n of those ids (e.g. { hp_plus: 3 }); within the gil less keepGil, the plan's
  // `want` first, then the cheapest. Bought in the Shop window (Buy, the quantity); notes what the gil
  // didn't cover. Owned = in the bag / the materia list or on anyone in the group
  G.owned = function (id) {
    const st = FF7.state;
    if (FF7.data.materia[id] && !U.findItem(id)) return st.materia.filter(m => m && m.id === id).length +
      st.members.reduce((a, cid) => a + (st.chars[cid] ? FF7.sys.materia.equippedList(st.chars[cid]).filter(m => m && m.id === id).length : 0), 0);
    return FF7.sys.inv.count(id) + st.members.reduce((a, cid) => { const c = st.chars[cid]; return a + (c ? SLOTS.filter(s => c[s] === id).length : 0); }, 0);
  };
  G.kindOf = (id) => { const f = U.findItem(id); return f ? f.kind : FF7.data.materia[id] ? 'materia' : null; };
  G.priceOf = (id) => { const f = U.findItem(id); return f ? (f.def.price || 0) : ((FF7.data.materia[id] || {}).price || 0); };
  G.newPlan = function (w, o) {
    const kinds = [].concat(o.kinds || 'materia').flatMap(k => k === 'gear' ? SLOTS : [k]);
    const want = o.want || {};
    const stock = (w.stock || []).map(e => String(e).startsWith('materia:') ? String(e).slice(8) : String(e));
    const list = [];
    stock.forEach(id => {
      if ((o.skip || []).includes(id)) return;
      const kind = G.kindOf(id), n = want[id] != null ? want[id] : (kinds.includes(kind) && (!o.only || o.only.includes(id)) ? 1 : 0);
      const need = n - G.owned(id);
      if (need > 0 && G.priceOf(id) > 0) list.push({ id, qty: need, price: G.priceOf(id), wanted: want[id] != null });
    });
    const wo = Object.keys(want), rank = (e) => e.wanted ? wo.indexOf(e.id) : wo.length;
    list.sort((a, b) => (rank(a) - rank(b)) || a.price - b.price);   // (the plan's `want` in its order, then the cheapest)
    let budget = Math.max(0, FF7.state.gil - (o.keepGil || 0));
    const buy = [], left = [];
    for (const e of list) {
      const q = Math.min(e.qty, Math.floor(budget / e.price));
      if (q > 0) { buy.push({ id: e.id, qty: q }); budget -= q * e.price; }
      if (q < e.qty) left.push(e.id);
    }
    R.say('buyNew: ' + (buy.length ? buy.map(e => e.qty + ' ' + (FF7.data.materia[e.id] && !U.findItem(e.id) ? matName(e.id) : U.itemName(e.id))).join(', ') : 'nothing new here'));
    if (left.length) R.note('buyNew: not enough gil for ' + left.join(', '));
    return { buy, sell: [] };
  };
  O.buyNew = function* (o = {}) {
    const where = o.shop || o.npc || o.at;
    if (!where) return 'buyNew: which shop? ({ shop: npcId | [x, y] })';
    let planned = null;
    // (the shop's question - "Items or materia?" - answered from o.choose, unless the step itself queued it)
    const tag = 'buyNew#' + R.frames, answers = [].concat(o.choose || []).filter(a => !R.choices.some(c => c.a === a && c.pc === R.pc));
    answers.forEach(a => R.choices.push({ a, pc: tag }));
    R.shopTask = { buy: [], sell: [], closed: false, plan: (w) => (planned = G.newPlan(w, o)) };
    let r;
    try { r = yield* R.visitShop(where, {}); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
    const t = R.shopTask; R.shopTask = null;
    if (r !== true) return 'buyNew: ' + r;
    if (!planned) return 'buyNew: no Shop window opened (' + JSON.stringify(where) + ')';
    const failed = (t.buy || []).filter(e => e.failed || !e.done);
    if (failed.length) R.note('buyNew: could not buy ' + failed.map(e => e.id).join(', '));
    return true;
  };

  // ['collect', { shops: [[mapId, npcId | [x, y], shopId, choose, worldLoc]...], kinds, want, keepGil }]: buyNew at each of
  // those shops (walking there with goto) where the shop's stock (FF7.data.shops[shopId]) has a kind the party
  // has never had; a shop with nothing new is not visited
  O.collect = function* (o = {}) {
    const kinds = [].concat(o.kinds || 'materia').flatMap(k => k === 'gear' ? SLOTS : [k]);
    const newIn = (shopId) => ((FF7.data.shops[shopId] || {}).stock || []).map(e => String(e.id || e).replace(/^materia:/, ''))
      .filter(id => G.priceOf(id) > 0 && (kinds.includes(G.kindOf(id)) || (o.want || {})[id] != null) && G.owned(id) < Math.max(1, (o.want || {})[id] || 0));
    let townLoc = null;
    const area = (id) => (FF7.maps[id] || {}).area || id;
    for (const [map, where, shopId, choose, loc] of o.shops || []) {
      if (loc) townLoc = loc;
      const want = newIn(shopId);
      if (!want.length) continue;
      if (FF7.state.gil - (o.keepGil || 0) < Math.min(...want.map(G.priceOf))) { R.note('collect: not enough gil at ' + shopId + ' for ' + want.join(', ')); continue; }
      // (loc: the town's world location - it holds for the entries after it - travelled to first, by the Highwind,
      // when the party is outside that town)
      const L = loc || townLoc;
      if (L && R.where() !== map && area(R.where()) !== area(map)) { const w = yield* O.world(L); if (w !== true) { R.note('collect: ' + L + ': ' + w); continue; } }
      if (R.where() !== map) { const g = yield* O.goto(map); if (g !== true) { R.note('collect: ' + map + ': ' + g); continue; } }
      const r = yield* O.buyNew(Object.assign({}, o, { shop: where, choose }));
      if (r !== true) R.note('collect: ' + r);
    }
    return true;
  };

  // ['autoequip', { members, reserve, slots, minGain, weights }]: the best gear already in the bag
  O.autoequip = function* (o = {}) {
    const p = G.plan(Object.assign({}, o, { stock: [], budget: 0 }));
    if (p.assign.length) yield* G.equipAll(p.assign);
    return true;
  };

  // ================================================================== materia primitives (screen actions)
  // put: a listed materia into a slot (Materia screen); take: a slot's materia off (Triangle); swap: two
  // slots of any characters (Arrange > Exchange). The reserve isn't on the Materia screen: its puts and
  // takes go through the systems (Exchange works for it).
  MT.put = function* (c, key, k, m) {
    if (c[key][k] === m) return true;
    const S = FF7.state.materia;
    if (!S.includes(m)) return 'materia: ' + matName(m) + ' is not in the list';
    let done = false;
    if (shown() && inParty(c.id)) done = yield* R.menus.run('materia ' + m.id + ' on ' + c.id, R.menus.materiaPut(c.id, key, k, S.indexOf(m)), () => c[key][k] === m, { keep: true });
    if (!done) R.apply.put(c, key, k, m);
    R.say('materia: ' + c.name + ' ' + (key === 'weaponMateria' ? 'weapon' : 'armour') + ' ' + (k + 1) + ' <- ' + matName(m));
    return true;
  };
  MT.take = function* (c, key, k) {
    const m = c[key][k]; if (!m) return true;
    let done = false;
    if (shown() && inParty(c.id)) done = yield* R.menus.run('materia off ' + c.id, R.menus.materiaTake(c.id, key, k), () => !c[key][k], { keep: true });
    if (!done) R.apply.take(c, key, k);
    R.say('materia: ' + c.name + ' ' + matName(m) + ' off');
    return true;
  };
  MT.swap = function* (a, b) {                     // { c, key, i } x 2
    const ma = a.c[a.key][a.i], mb = b.c[b.key][b.i];
    if (!ma && !mb) return true;
    let done = false;
    if (shown()) done = yield* R.menus.run('exchange', R.menus.materiaExchange({ c: a.c.id, key: a.key, i: a.i }, { c: b.c.id, key: b.key, i: b.i }), () => a.c[a.key][a.i] === mb && b.c[b.key][b.i] === ma, { keep: true });
    if (!done) R.apply.swap(a, b);
    R.say('materia: ' + (ma ? matName(ma) : 'empty') + ' (' + a.c.name + ') <-> ' + (mb ? matName(mb) : 'empty') + ' (' + b.c.name + ')');
    return true;
  };
  // where is materia instance m? { c, key, i } | 'stock' | null
  MT.where = function (m) {
    const st = FF7.state;
    if (st.materia.includes(m)) return 'stock';
    for (const id of st.members) { const c = st.chars[id]; if (!c) continue; for (const key of KEYS) { const i = (c[key] || []).indexOf(m); if (i >= 0) return { c, key, i }; } }
    return null;
  };
  // Make character c's slots exactly `want` ({ weaponMateria: [inst | null], armorMateria: [...] }),
  // slot by slot: from the list (put), from this character's other slots or another character (swap;
  // the slot is emptied first so nobody else gets its materia), or emptied (take)
  MT.realize = function* (c, want) {
    for (const key of KEYS) for (let i = 0; i < c[key].length; i++) {
      const m = want[key] ? want[key][i] : undefined;
      if (m === undefined || c[key][i] === m) continue;
      if (m === null) { yield* MT.take(c, key, i); continue; }
      const at = MT.where(m);
      if (at === 'stock') yield* MT.put(c, key, i, m);
      else if (at && at.c === c) yield* MT.swap({ c, key, i }, at);
      else if (at) { if (c[key][i]) yield* MT.take(c, key, i); yield* MT.swap({ c, key, i }, at); }
      else R.note('materia: ' + matName(m) + ' is nowhere to be found');
    }
    return true;
  };

  // ['moveMateria', from, to, materiaId, where]: one materia from a character (or 'stock') to another
  // character (or 'stock'); where: 'weapon' | 'armor' | { slot, index } (default: the first free slot;
  // with an index the slot's own materia goes the other way, as Exchange does). o.from: { slot, index }
  O.moveMateria = function* (from, to, id, where, o = {}) {
    const st = FF7.state;
    if (from == null || from === 'stock') return yield* O.materia(to, id, where);
    const src = st.chars[from]; if (!src) return 'moveMateria: ' + from + ' is not in the group';
    const fw = isObj(o.from) ? o.from : isObj(where) && where.from ? where.from : {};
    let s = null;
    for (const key of (fw.slot === 'armor' ? ['armorMateria'] : fw.slot === 'weapon' ? ['weaponMateria'] : KEYS)) {
      const list = src[key].map((m, i) => ({ m, i })).filter(x => x.m && x.m.id === id && (fw.index == null || fw.index === x.i));
      if (list.length) { s = { c: src, key, i: list.sort((a, b) => b.m.ap - a.m.ap)[0].i }; break; }
    }
    if (!s) return 'moveMateria: ' + from + ' has no ' + id;
    if (to == null || to === 'stock') { yield* MT.take(src, s.key, s.i); yield* R.menus.finish(); return true; }
    const dst = st.chars[to]; if (!dst) return 'moveMateria: ' + to + ' is not in the group';
    const w = isObj(where) ? where : { slot: where };
    let d = null;
    for (const key of (w.slot === 'armor' ? ['armorMateria'] : w.slot === 'weapon' ? ['weaponMateria'] : KEYS)) {
      const i = w.index != null ? w.index : dst[key].findIndex(x => !x);
      if (i >= 0 && i < dst[key].length) { d = { c: dst, key, i }; break; }
    }
    if (!d) return 'moveMateria: no free slot for ' + id + ' on ' + to;
    yield* MT.swap(s, d);
    yield* R.menus.finish();
    return true;
  };

  // ---- the master Enemy Skill materia (R.eskillMaster: the copy that knows the most) where learning happens:
  // on a member of the active party (`who`, else the first one carrying a copy, else the first with a free
  // slot), in place of the copy they carry (Materia > Arrange > Exchange). ['eskillMaster', who] in a plan;
  // the learning ops call it by themselves
  MT.ensureMaster = function* (who) {
    const st = FF7.state, m = R.eskillMaster();
    if (!m) return true;
    const act = st.party.filter(Boolean).map(id => st.chars[id]).filter(c => c && !guest(c));
    const at = MT.where(m);
    if (!who && at && at !== 'stock' && act.includes(at.c)) return true;
    const cands = who ? act.filter(c => c.id === who) : act;
    const slotOf = (c) => { for (const key of KEYS) { const i = c[key].findIndex(x => x && x.id === 'enemy_skill'); if (i >= 0) return { c, key, i }; } return null; };
    const freeOf = (c) => { for (const key of KEYS) { const i = c[key].findIndex(x => !x); if (i >= 0) return { c, key, i }; } return null; };
    // (no copy and no free slot on them: one of their materia changes places with the master, as a player would on
    // the Exchange screen - not a support materia or one paired with a support, the last slots first; it goes
    // where the master was, on the other member or into the list)
    const tp = (x) => x && (FF7.data.materia[x.id] || {}).type;
    const anyOf = (c) => { for (const key of ['armorMateria', 'weaponMateria']) for (let i = c[key].length - 1; i >= 0; i--) { const x = c[key][i]; if (!x || x === m || tp(x) === 'support' || tp(c[key][i ^ 1]) === 'support') continue; return { c, key, i }; } return null; };
    const dst = cands.map(slotOf).find(Boolean) || cands.map(freeOf).find(Boolean) || (who ? cands.map(anyOf).find(Boolean) : null);
    if (!dst) { R.note('eskillMaster: no slot for the master Enemy Skill materia on ' + (who || 'the party')); return true; }
    if (dst.c[dst.key][dst.i] === m) return true;
    if (at === 'stock') { if (dst.c[dst.key][dst.i]) yield* MT.take(dst.c, dst.key, dst.i); yield* MT.put(dst.c, dst.key, dst.i, m); }
    else if (at) yield* MT.swap(dst, at);
    yield* R.menus.finish();
    R.say('eskillMaster: ' + dst.c.name + ' carries the master Enemy Skill materia (' + (m.eskills || []).length + ' skills)');
    return true;
  };
  O.eskillMaster = function* (who) { return yield* MT.ensureMaster(who); };

  // ---- loadouts
  // A character's layout from a spec list: explicit positions (id | null = empty | undefined / '*' = keep),
  // or, when it holds [a, b] pairs, pairs into the LINKED slot pairs and singles into the rest.
  // spec: { weapon: [...], armor: [...], clear } or one list for both (weapon slots first).
  MT.layoutIds = function (c, spec) {
    const M = FF7.sys.materia, out = {};
    const links = { weaponMateria: M.weaponLinks(c), armorMateria: M.armorLinks(c) };
    const clear = isObj(spec) && spec.clear;
    let lists = Array.isArray(spec) ? null : { weaponMateria: spec.weapon, armorMateria: spec.armor };
    const autoAll = Array.isArray(spec) || (lists && [lists.weaponMateria, lists.armorMateria].some(l => Array.isArray(l) && l.some(Array.isArray)));
    if (autoAll) {
      // pairs and singles over both pieces: pairs into linked pairs (weapon first), singles fill the rest
      const all = Array.isArray(spec) ? spec : [].concat(lists.weaponMateria || [], lists.armorMateria || []);
      const pairs = all.filter(Array.isArray), singles = all.filter(x => !Array.isArray(x) && x != null && x !== '*');
      KEYS.forEach(k => { out[k] = c[k].map(() => null); });
      const pairSlots = [], rest = [];
      KEYS.forEach(k => { for (let i = 0; i < c[k].length; i++) (Math.floor(i / 2) < links[k] ? pairSlots : rest).push([k, i]); });
      const extra = [];
      for (const p of pairs) {
        const k = pairSlots.findIndex(([key, i]) => i % 2 === 0 && pairSlots.some(([k2, i2]) => k2 === key && i2 === i + 1));
        if (k < 0) { extra.push(p[0], p[1]); continue; }
        const [key, i] = pairSlots[k]; out[key][i] = p[0]; out[key][i + 1] = p[1];
        pairSlots.splice(pairSlots.findIndex(([k2, i2]) => k2 === key && i2 === i + 1), 1); pairSlots.splice(k, 1);
      }
      const free = rest.concat(pairSlots);
      singles.concat(extra).forEach((id, n) => { if (n < free.length) out[free[n][0]][free[n][1]] = id; else R.note('loadout: no slot left for ' + id + ' on ' + c.id); });
      return out;
    }
    KEYS.forEach(k => {
      const l = lists[k];
      out[k] = c[k].map((cur, i) => {
        const v = Array.isArray(l) && i < l.length ? l[i] : undefined;
        if (v === '*') return undefined;
        return v === undefined ? (clear ? null : undefined) : v;
      });
    });
    return out;
  };
  // which copy of a materia to take first: the best grown; an Enemy Skill materia by the skills it knows
  MT.rank = (m) => m && m.id === 'enemy_skill' ? (m.eskills || []).length : (m ? m.ap || 0 : 0);
  // ids -> instances: the one already in place, else one on this character, else the list, else another
  // member's (the reserve's first); the best-grown copy first. o.from: 'stock' (only the list)
  MT.resolve = function (c, ids, o = {}) {
    const st = FF7.state, used = new Set(), out = {};
    KEYS.forEach(k => { out[k] = ids[k].map((id, i) => { if (id === undefined) { if (c[k][i]) used.add(c[k][i]); return undefined; } if (id === null) return null; const m = c[k][i]; if (m && m.id === id) { used.add(m); return m; } return 0; }); });
    const others = st.members.map(id => st.chars[id]).filter(x => x && x !== c && !guest(x)).sort((a, b) => inParty(a.id) - inParty(b.id));
    const pools = [KEYS.reduce((a, k) => a.concat(c[k].filter(Boolean)), []), st.materia.slice()];
    if (o.from !== 'stock') others.forEach(x => pools.push(KEYS.reduce((a, k) => a.concat(x[k].filter(Boolean)), [])));
    // (an Enemy Skill materia: the copy that knows the most wherever it is, so the first member a plan names gets the
    // master copy, R.eskillMaster)
    const esk = (m) => m && m.id === 'enemy_skill';
    KEYS.forEach(k => ids[k].forEach((id, i) => {
      const cur = out[k][i];
      if (id === 'enemy_skill' && esk(cur)) {
        const best = pools.flat().filter(x => esk(x) && (x === cur || !used.has(x))).sort((a, b) => MT.rank(b) - MT.rank(a))[0];
        if (best && best !== cur && MT.rank(best) > MT.rank(cur)) { used.delete(cur); used.add(best); out[k][i] = best; }
        return;
      }
      if (cur !== 0) return;
      let m = null;
      if (id === 'enemy_skill') m = pools.flat().filter(x => esk(x) && !used.has(x)).sort((a, b) => MT.rank(b) - MT.rank(a))[0] || null;
      else for (const pool of pools) { m = pool.filter(x => x.id === id && !used.has(x)).sort((a, b) => MT.rank(b) - MT.rank(a))[0]; if (m) break; }
      if (m) { used.add(m); out[k][i] = m; } else { out[k][i] = undefined; R.note('loadout: no ' + id + ' for ' + c.id); }
    }));
    return out;
  };
  // ['loadout', charId, { weapon: [...], armor: [...], clear, from }]: e.g.
  //   ['loadout', 'aeris', { weapon: [['restore', 'all'], 'revive'] }]   (the pair into the linked slots)
  //   ['loadout', 'cloud', { weapon: ['fire', 'ice'], armor: [null] }]    (by position; null = empty)
  O.loadout = function* (ch, spec = {}, o = {}) {
    const c = FF7.state.chars[ch]; if (!c) return 'loadout: ' + ch + ' is not in the group';
    const want = MT.resolve(c, MT.layoutIds(c, spec), Object.assign({}, isObj(spec) ? spec : {}, o));
    yield* MT.realize(c, want);
    yield* R.menus.finish();
    R.say('loadout: ' + c.name + ' ' + KEYS.map(k => c[k].map(m => m ? m.id : '-').join(',')).join(' | '));
    return true;
  };

  // ---- a default setup
  // ['autoMateria', { members, reserve, steal: char | true, sense, manipulate, eskill: char | [chars] | true,
  //   healer: char, summons: false, keep: { char: [ids] }, independent: { id: char }, fromReserve: false }]
  // Healing (Restore + All linked) on the best caster, Revive / Heal on the next; Steal / Sense /
  // Manipulate / E.Skill where the plan wants them (E.Skill: one per member by default); the attack
  // magic and the summons spread over the casters; All / Elemental / MP Turbo / Quadra linked to what
  // they help; HP Plus to the frailest, Magic Plus / MP Plus to the best caster, Cover / Counter Attack
  // / Mega All to the fighter, EXP / Gil Plus kept on. Encounter-changing materia (Enemy Away / Lure,
  // Chocobo Lure) only when asked (independent: { chocobo_lure: 'cloud' }).
  MT.autoPlan = function (members, pool, o = {}) {
    const D = FF7.data.materia, M = FF7.sys.materia;
    // (the best-grown copy first; Enemy Skill copies by the skills they know: the master goes to the first
    // member the plan names, R.eskillMaster)
    const avail = pool.slice().sort((a, b) => MT.rank(b) - MT.rank(a));
    const take = (pred) => { const i = avail.findIndex(pred); return i < 0 ? null : avail.splice(i, 1)[0]; };
    const takeId = (id) => take(m => m.id === id);
    const plan = {}, cap = {};
    members.forEach(c => { plan[c.id] = { pairs: [], singles: [] }; cap[c.id] = { slots: c.weaponMateria.length + c.armorMateria.length, links: M.weaponLinks(c) + M.armorLinks(c) }; });
    const used = (c) => plan[c.id].pairs.length * 2 + plan[c.id].singles.length;
    const single = (c, m) => { if (!m || !c) { if (m) avail.push(m); return false; } if (used(c) >= cap[c.id].slots) { avail.push(m); return false; } plan[c.id].singles.push(m); return true; };
    const pair = (c, a, b) => { if (!c || !a || !b || plan[c.id].pairs.length >= cap[c.id].links || used(c) + 2 > cap[c.id].slots) { if (a) avail.push(a); if (b) avail.push(b); return false; } plan[c.id].pairs.push([a, b]); return true; };
    // link a support to a planned single of c that satisfies pred (the single becomes a pair)
    const link = (c, sup, pred) => {
      if (!c || !sup) { if (sup) avail.push(sup); return false; }
      const i = plan[c.id].singles.findIndex(pred);
      if (i < 0 || plan[c.id].pairs.length >= cap[c.id].links || used(c) + 1 > cap[c.id].slots) { avail.push(sup); return false; }
      const m = plan[c.id].singles.splice(i, 1)[0]; plan[c.id].pairs.push([m, sup]); return true;
    };
    const byMag = members.slice().sort((a, b) => (b.d.mag - a.d.mag) || ((b.id === 'aeris') - (a.id === 'aeris')));
    const byStr = members.slice().sort((a, b) => b.d.str - a.d.str);
    const byDex = members.slice().sort((a, b) => b.d.dex - a.d.dex);
    const byHp = members.slice().sort((a, b) => a.maxHp - b.maxHp);
    const pickChar = (spec, dflt) => spec === true || spec === undefined ? dflt : typeof spec === 'string' ? members.find(c => c.id === spec) || null : null;
    const type = (m) => (D[m.id] || {}).type;
    const DAMAGE = ['fire', 'ice', 'lightning', 'earth', 'poison', 'gravity', 'comet', 'ultima', 'contain', 'destruct', 'master_magic'];
    const ELEM = ['fire', 'ice', 'lightning', 'earth', 'poison'];
    // what the plan fixes (keep: { char: [ids] })
    for (const id in o.keep || {}) { const c = members.find(x => x.id === id); [].concat(o.keep[id]).forEach(mid => single(c, takeId(mid))); }
    // commands
    const cmd = (id, spec, dflt) => { if (spec === false || !avail.some(m => m.id === id)) return; const c = pickChar(spec, dflt); if (c) single(c, takeId(id)); };
    cmd('steal', o.steal, byDex[0]);
    cmd('sense', o.sense === undefined ? false : o.sense, byMag[byMag.length - 1]);
    cmd('manipulate', o.manipulate === undefined ? false : o.manipulate, byMag[0]);
    for (const id of ['morph', 'deathblow', 'throw', 'mime']) cmd(id, o[id] === undefined ? false : o[id], byStr[0]);
    // Enemy Skill: one per member (or the ones named)
    if (o.eskill !== false) {
      const who = o.eskill === undefined || o.eskill === true ? members : [].concat(o.eskill).map(id => members.find(c => c.id === id)).filter(Boolean);
      who.forEach(c => { const m = takeId('enemy_skill'); if (m) single(c, m); });
    }
    // healing
    const healer = pickChar(o.healer, byMag[0]), second = byMag.find(c => c !== healer) || healer;
    const restores = avail.filter(m => m.id === 'restore');
    if (restores.length) {
      const r1 = takeId('restore'), all1 = o.all === false ? null : avail.find(m => m.id === 'all');
      if (all1 && healer && plan[healer.id].pairs.length < cap[healer.id].links && used(healer) + 2 <= cap[healer.id].slots) pair(healer, r1, take(m => m === all1));
      else single(healer, r1);
      const r2 = takeId('restore'); if (r2) single(second, r2);
    }
    const rv = takeId('revive'); if (rv) single(second !== healer ? second : healer, rv);
    const fc = takeId('full_cure'); if (fc) single(healer, fc);
    const he = takeId('heal'); if (he) single(byMag[2] || second, he);
    // W-commands / attack commands
    cmd('w_magic', o.w_magic, byMag[0]); cmd('w_summon', o.w_summon, byMag[1] || byMag[0]); cmd('w_item', o.w_item, byDex[0]);
    cmd('slash_all', o.slash_all, byStr[0]); cmd('double_cut', o.double_cut, byStr[0]);
    // attack magic: round robin over the casters
    let r = 0;
    for (let g = 0; g < 40; g++) { const m = take(x => DAMAGE.includes(x.id)); if (!m) break; if (!single(byMag[r++ % byMag.length], m) && !members.some(c => used(c) < cap[c.id].slots)) break; }
    // support magic worth carrying (Barrier / Time for the boss openers, Seal / Mystify...)
    for (const id of ['barrier', 'time', 'shield', 'seal', 'exit', 'mystify', 'transform']) { const m = takeId(id); if (m) single(byMag.find(c => used(c) < cap[c.id].slots), m); }
    // summons
    if (o.summons !== false) { r = 0; for (let g = 0; g < 30; g++) { const m = take(x => type(x) === 'summon'); if (!m) break; single(byMag[r++ % byMag.length], m); } }
    // supports: All with attack magic, Elemental with an element on the fighter's weapon, MP Turbo /
    // Quadra Magic with a summon or attack magic, Final Attack with Revive / Phoenix, Counter with a command
    for (const c of byMag) { const a = avail.find(m => m.id === 'all'); if (!a) break; link(c, take(m => m === a), m => DAMAGE.includes(m.id)); }
    { const e = takeId('elemental'); if (e) link(byStr[0], e, m => ELEM.includes(m.id) || ['shiva', 'ifrit', 'ramuh', 'titan'].includes(m.id)); }
    for (const id of ['mp_turbo', 'quadra_magic', 'mp_absorb', 'hp_absorb']) { const s = takeId(id); if (s) link(byMag.find(c => plan[c.id].singles.some(m => type(m) === 'summon' || DAMAGE.includes(m.id))), s, m => type(m) === 'summon' || DAMAGE.includes(m.id)); }
    { const s = takeId('final_attack'); if (s) link(members.find(c => plan[c.id].singles.some(m => m.id === 'revive' || m.id === 'phoenix')), s, m => m.id === 'revive' || m.id === 'phoenix'); }
    { const s = takeId('counter'); if (s) link(members.find(c => plan[c.id].singles.some(m => type(m) === 'command')), s, m => type(m) === 'command'); }
    // independent
    const ind = Object.assign({ hp_plus: 'low', mp_plus: 'caster', magic_plus: 'caster', speed_plus: 'fast', luck_plus: 'fast', cover: 'tank', counter_attack: 'fighter', mega_all: 'fighter', exp_plus: 'any', gil_plus: 'any', pre_emptive: 'any', long_range: 'back' }, o.independent || {});
    const role = (v) => {
      if (typeof v === 'string' && members.some(c => c.id === v)) return [members.find(c => c.id === v)];
      if (v === 'low') return byHp; if (v === 'caster') return byMag; if (v === 'fast') return byDex; if (v === 'fighter') return byStr;
      if (v === 'tank') return members.slice().sort((a, b) => (a.row === 'front' ? 0 : 1) - (b.row === 'front' ? 0 : 1) || b.maxHp - a.maxHp);
      if (v === 'back') return members.filter(c => c.row === 'back' && !((FF7.sys.stats.weapon(c) || {}).longRange));
      if (v === 'any') return members.slice().sort((a, b) => (cap[b.id].slots - used(b)) - (cap[a.id].slots - used(a)));
      return [];
    };
    for (let pass = 0; pass < 4; pass++) for (const id in ind) {
      if (!ind[id]) continue;
      const m = avail.find(x => x.id === id); if (!m) continue;
      const c = role(ind[id]).find(x => used(x) < cap[x.id].slots && !plan[x.id].singles.some(y => y.id === id)); if (!c) continue;
      single(c, take(x => x === m));
    }
    return plan;
  };
  // a planned { pairs, singles } into slot positions: pairs into linked pairs, singles where they
  // already sit when that slot is free, else into the remaining slots (unlinked first)
  MT.place = function (c, p) {
    const M = FF7.sys.materia, want = {}, links = { weaponMateria: M.weaponLinks(c), armorMateria: M.armorLinks(c) };
    KEYS.forEach(k => { want[k] = c[k].map(() => null); });
    const pairSlots = []; KEYS.forEach(k => { for (let i = 0; i + 1 < c[k].length && i / 2 < links[k]; i += 2) pairSlots.push([k, i]); });
    const left = [];
    p.pairs.forEach(pr => { const s = pairSlots.shift(); if (!s) { left.push(pr[0], pr[1]); return; } want[s[0]][s[1]] = pr[0]; want[s[0]][s[1] + 1] = pr[1]; });
    const singles = p.singles.concat(left);
    const rest = singles.filter(m => { for (const k of KEYS) { const i = c[k].indexOf(m); if (i >= 0 && want[k][i] === null) { want[k][i] = m; return false; } } return true; });
    const free = []; KEYS.forEach(k => want[k].forEach((m, i) => { if (m === null) free.push([k, i, Math.floor(i / 2) < links[k]]); }));
    free.sort((a, b) => a[2] - b[2]);
    rest.forEach((m, n) => { if (n < free.length) want[free[n][0]][free[n][1]] = m; });
    return want;
  };
  // (the reserve's materia is used too - Materia > Arrange > Exchange brings it over - unless { fromReserve: false })
  O.autoMateria = function* (o = {}) {
    const st = FF7.state;
    const members = G.members(Object.assign({}, o, { members: o.members }));
    const pool = st.materia.slice();
    members.forEach(c => FF7.sys.materia.equippedList(c).forEach(m => pool.push(m)));
    if (o.fromReserve !== false) st.members.forEach(id => { const c = st.chars[id]; if (!c || guest(c) || members.includes(c)) return; FF7.sys.materia.equippedList(c).forEach(m => { if (m && !pool.includes(m)) pool.push(m); }); });
    const plan = MT.autoPlan(members, pool, o);
    const wants = members.map(c => [c, MT.place(c, plan[c.id])]);
    // take off first what leaves each character (so swaps between them find the slots empty)
    for (const [c, want] of wants) for (const k of KEYS) for (let i = 0; i < c[k].length; i++) {
      const m = c[k][i]; if (!m) continue;
      const stays = wants.some(([, w]) => KEYS.some(k2 => w[k2].includes(m)));
      if (!stays) yield* MT.take(c, k, i);
    }
    for (const [c, want] of wants) yield* MT.realize(c, want);
    yield* R.menus.finish();
    members.forEach(c => R.say('autoMateria: ' + c.name + ' ' + KEYS.map(k => c[k].map(m => m ? m.id : '-').join(',')).join(' | ')));
    return true;
  };
})();

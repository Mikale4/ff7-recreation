// Learning moves and abilities (docs/KUPOMON.md "Moves" and "Abilities"): the engine for the data in kp_learnsets.js
// (KP.LEARN), kp_chips.js (Skill Chips, Pokémon's TMs) and kp_abilities.js (KP.ABILITIES, KP.SPECIES_ABIL).
//   KP.movesAt(sp, lv)   the last four it has learned by that level (wild and trainer moogles know these)
//   KP.learnsAt(sp, lv)  what it learns on reaching that level
//   KP.abilityOf(mon)    its ability ({ id, name, desc, ...effects }) or null
//   KP.chipFits(mon, chipId)   a Skill Chip it can learn from
//   KP.learnMove*(say, mon, move)   the learning, with the forget-a-move choice at four (battle or field)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};

  KP.movesAt = function (sp, lv) {
    const L = KP.LEARN && KP.LEARN[sp];
    if (!L || !L.length) return ((KP.SPECIES[sp] || {}).moves || []).slice();
    const out = [];
    for (const [l, m] of L) { if (l > lv) break; if (!KP.MOVES[m]) continue; const i = out.indexOf(m); if (i >= 0) out.splice(i, 1); out.push(m); }
    return out.slice(-4);
  };
  KP.learnsAt = (sp, lv) => ((KP.LEARN && KP.LEARN[sp]) || []).filter(([l, m]) => l === lv && KP.MOVES[m]).map(([, m]) => m);

  // a moogle's ability: its species' list, picked by the slot it was made with (mon.abil)
  KP.abilityOf = function (mon) {
    if (!mon) return null;
    const L = (KP.SPECIES_ABIL && KP.SPECIES_ABIL[mon.sp]) || [];
    if (!L.length) return null;
    const id = L[(mon.abil || 0) % L.length], a = KP.ABILITIES && KP.ABILITIES[id];
    return a ? Object.assign({ id }, a) : null;
  };

  // new moogles: the moves of their level, and an ability slot
  const make0 = KP.make;
  KP.make = function (spId, lv, o = {}) {
    const mon = make0(spId, lv, o);
    if (!o.moves && KP.LEARN && KP.LEARN[spId]) mon.moves = KP.movesAt(spId, lv);
    if (o.moves) mon.moves = o.moves.slice();
    // (a kind with three: the third is its hidden one, 1 in 20 met; o.hidden: the chance, as breeding raises it)
    const AL = (KP.SPECIES_ABIL && KP.SPECIES_ABIL[spId]) || [];
    mon.abil = o.abil != null ? o.abil : AL.length >= 3 && Math.random() < (o.hidden != null ? o.hidden : 0.05) ? 2 : (Math.random() < 0.5 ? 0 : 1);
    return mon;
  };

  // evolving: its moves so far, and what the new job would know by now (the evolution's choice: js/kupomon/kp_menu.js)
  KP.evoPool = (mon, newSp) => Array.from(new Set(mon.moves.concat(KP.movesAt(newSp, mon.lv))));

  // ------------------------------------------------------------------ learning a move: at four, which to forget
  // say(text) is a generator that shows a line (the battle's this.say, or the field's s.msg); returns true if learned
  KP.learnMove = function* (say, mon, move) {
    const mv = KP.MOVES[move]; if (!mv || mon.moves.includes(move)) return false;
    const name = KP.name(mon);
    if (mon.moves.length < 4) { mon.moves.push(move); try { FF7.audio.sfx('levelup'); } catch (e) { } yield* say(`${name} learned ${mv.name}!`); return true; }
    yield* say(`${name} wants to learn ${mv.name}. But ${name} already knows four moves.`);
    const before = mon.moves.slice();
    const w = KP.pickMoves(mon, before.concat([move]), `${name} can learn ${mv.name}: choose four`, before);
    while (!w.done) yield;
    const r = w.result && w.result.length ? w.result : before;
    if (!r.includes(move)) { yield* say(`${name} did not learn ${mv.name}.`); return false; }
    const gone = before.filter(m => !r.includes(m));
    mon.moves = r;
    try { FF7.audio.sfx('levelup'); } catch (e) { }
    yield* say(`1, 2 and... Poof! ${name} forgot ${gone.map(m => KP.MOVES[m].name).join(' and ')}, and learned ${mv.name}!`);
    return true;
  };
  // the levels it went up through: each one's new moves
  KP.learnOnLevels = function* (say, mon, lvs) {
    for (const lv of lvs || []) for (const m of KP.learnsAt(mon.sp, lv)) yield* KP.learnMove(say, mon, m);
  };

  // ------------------------------------------------------------------ the Move Relearner (the Memory Mog, Mogfield's Mog
  // Center): any move its line learns by its level, that it doesn't know now, free (modern Pokémon's)
  KP.relearnable = function (mon) {
    const pre = {}; for (const k of Object.keys(KP.SPECIES)) { const e = KP.SPECIES[k].evo; if (e) pre[e.to] = k; }
    const out = new Set();
    for (let q = mon.sp; q; q = pre[q]) {
      const L = (KP.LEARN && KP.LEARN[q]) || [];
      if (L.length) L.forEach(([l, m]) => { if (l <= mon.lv && KP.MOVES[m]) out.add(m); });
      else ((KP.SPECIES[q] || {}).moves || []).forEach(m => { if (KP.MOVES[m]) out.add(m); });
    }
    return [...out].filter(m => !mon.moves.includes(m));
  };
  KP.RELEARN_FEE = 200;   // (a tiny fee, paid only when a move comes back: the user, 2026-10-04; free before)
  KP.relearner = function* (s) {
    const M = 'Memory Mog', d = KP.data(), fee = KP.RELEARN_FEE;
    if (!s.flag('kp_relearn_met')) {
      s.set('kp_relearn_met');
      yield s.say(M, `Kupo... Hello, young trainer. I am the Memory Mog.A moogle never truly forgets a move. Anything its kind learns by its level, I can help it remember. Just ${fee} coins a visit, kupo, and only if it remembers something.`);
    }
    if (!d.party.length) { yield s.say(M, 'Come back with a moogle or two, kupo.'); return; }
    const c = yield s.ask(M, 'Whose memory shall we jog?', d.party.map(m => `${KP.name(m)} (${KP.jobName(m)} Lv${m.lv})`).concat(['Never mind']));
    if (c >= d.party.length) { yield s.say(M, 'Come back any time, kupo.'); return; }
    const mon = d.party[c], more = KP.relearnable(mon);
    if (!more.length) { yield s.say(M, `${KP.name(mon)} remembers everything its kind has learned by now, kupo. Come back when it's grown a little.`); return; }
    if (d.money < fee) { yield s.say(M, `A memory costs ${fee} coins, kupo, and you have ${d.money}. Come back when you have it.`); return; }
    yield s.say(M, `Close your eyes, ${KP.name(mon)}... Think back... There. Choose the four it should know.`);
    const before = mon.moves.slice();
    const w = KP.pickMoves(mon, before.concat(more), `${KP.name(mon)} remembers: choose four`, before);
    while (!w.done) yield;
    const r = w.result && w.result.length ? w.result : before, gained = r.filter(m => !before.includes(m));
    if (!gained.length) { yield s.say(M, 'It is happy with what it knows. Very wise, kupo.'); return; }
    mon.moves = r; d.money -= fee;
    try { FF7.audio.sfx('levelup'); } catch (e) { }
    yield s.msg(`${KP.name(mon)} remembered ${gained.map(m => KP.MOVES[m].name).join(' and ')}! (Paid ${fee} coins.)`);
  };

  // ------------------------------------------------------------------ Skill Chips (kind 'chip': move, types, also)
  KP.chipFits = function (mon, chipId) {
    const c = KP.ITEMS[chipId]; if (!c || c.kind !== 'chip') return false;
    const sp = KP.SPECIES[mon.sp] || {};
    return (c.types || []).includes(sp.type) || (sp.type2 && (c.types || []).includes(sp.type2)) || (c.also || []).includes(mon.sp)
      || ((KP.LEARN && KP.LEARN[mon.sp]) || []).some(([, m]) => m === c.move);
  };

  // the chips' places (KP.CHIP_PLACES): sold in a Mog Center's Mart (KP.chipStock, read when the Mart opens), or lying
  // on a map (added to it once, before the first map of a Kupomon game loads)
  KP.chipStock = (centerId) => (KP.CHIP_PLACES || []).filter(p => p.mart === centerId && KP.ITEMS[p.chip]).map(p => p.chip);
  let placed = false;
  const enter0 = KP.enter;
  KP.enter = function () { KP.placeChips(); return enter0.apply(this, arguments); };
  // (and before any Kupomon map loads: a game loaded from a save, or a Demo resumed, never passes through KP.enter)
  const F = FF7.field, load0 = F && F.FieldScene && F.FieldScene.prototype.load;
  if (load0) F.FieldScene.prototype.load = function (mapId) { if (typeof mapId === 'string' && mapId.startsWith('kp_')) KP.placeChips(); return load0.apply(this, arguments); };
  KP.placeChips = function () {
    if (placed) return; placed = true;
    for (const p of KP.CHIP_PLACES || []) {
      const m = p.map && FF7.maps[p.map]; if (!m || !p.at || !KP.ITEMS[p.chip]) continue;
      const id = 'chip_' + p.chip + '_' + p.map;
      if (p.hidden) (m.triggers = m.triggers || []).push(KP.W.hidden(id, p.at, p.chip, 1));
      else (m.items = m.items || []).push(KP.W.item(id, p.at, p.chip, 1));
    }
    // and the expansion's held items found on the maps (kp_content.js packs' places)
    for (const p of KP.ITEM_PLACES || []) {
      const m = p.map && FF7.maps[p.map]; if (!m || !p.at || !KP.ITEMS[p.item]) continue;
      const id = 'find_' + p.item + '_' + p.map;
      if (p.hidden) (m.triggers = m.triggers || []).push(KP.W.hidden(id, p.at, p.item, 1));
      else (m.items = m.items || []).push(KP.W.item(id, p.at, p.item, 1));
    }
  };
})();

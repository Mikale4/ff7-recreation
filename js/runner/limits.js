// Runner: Limit Breaks the way an expert player works them (docs/RUNNER.md, "Limit Breaks").
// FF7's rules (the Limit Break Mechanics guide; js/data/limits.js `learn`): a level's first limit comes
// with kills (the character's own killing blows, counted whatever level is set: 'kills:N'), its second
// with uses of the first ('uses:<limit>:N'; a limit can only be used with its level set), a level-4
// limit from its manual once every other limit is known. A level can only be set when one of its limits
// is known; setting it (Menu > Limit) empties the gauge.
// The policy: the lowest level with a known limit whose uses still teach another one; when no level has
// one, the highest level with a known limit (so level 4 once the manual is read). It runs by itself for
// the active party whenever the menu can be opened (a side task, on screen), keeps a full gauge for a
// few battles before switching, and leaves alone a character the plan set with ['limitLevel', ...].
// Off: R.start({ limitPolicy: false }), a start profile's `limitPolicy: false`, or ['limitPolicy', false].
(function () {
  const R = FF7.runner, O = R.ops;
  const LM = R.limits = {};
  const D = () => FF7.data.limits;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  LM.mine = (c) => Object.keys(D()).filter(id => D()[id].char === c.id);
  // the unknown limits that uses of `id` teach
  LM.teaches = (c, id) => LM.mine(c).filter(k => !c.limitsKnown.includes(k) && String(D()[k].learn || '').startsWith('uses:' + id + ':'));
  LM.levelsKnown = (c) => [...new Set((c.limitsKnown || []).filter(id => D()[id]).map(id => D()[id].level))].sort((a, b) => a - b);
  LM.want = function (c) {
    const lv = LM.levelsKnown(c); if (!lv.length) return null;
    for (const l of lv) if (c.limitsKnown.some(id => D()[id] && D()[id].level === l && LM.teaches(c, id).length)) return l;
    return lv[lv.length - 1];
  };
  LM.on = () => R.limitPolicy !== false && !(R.opts && R.opts.limitPolicy === false);
  // the active-party members whose level should change now: [{ c, lv }]
  LM.pending = function () {
    const st = FF7.state; if (!st || !LM.on()) return [];
    const out = [];
    for (const id of st.party.filter(Boolean)) {
      const c = st.chars[id]; if (!c || !c.limitsKnown || !c.limitsKnown.length) continue;
      if (R.limitPins && R.limitPins[id] != null) continue;
      const lv = LM.want(c); if (!lv || lv === (c.limitLevel || 1)) { if (R._limitDefer) delete R._limitDefer[id]; continue; }
      // (a full gauge is used first: switching would empty it; after 5 battles it switches anyway)
      if (c.limitGauge >= 255) {
        R._limitDefer = R._limitDefer || {};
        if (R._limitDefer[id] == null) R._limitDefer[id] = R.stats.battles;
        if (R.stats.battles - R._limitDefer[id] < 5) continue;
      }
      out.push({ c, lv });
    }
    return out;
  };
  // ---- limit manuals (FF7: a level-4 limit is read from its manual once every other limit is known)
  LM.manualOf = (item) => { const e = (FF7.data.items[item] || {}).effect; return e && e.learnLimit && D()[e.learnLimit] ? e.learnLimit : null; };
  LM.ready = (c, lid) => LM.mine(c).filter(k => k !== lid).every(k => c.limitsKnown.includes(k));
  LM.missing = (c, lid) => LM.mine(c).filter(k => k !== lid && !c.limitsKnown.includes(k) && !String(D()[k].learn || '').startsWith('item:'));
  // the manuals in the bag whose character is in the group and ready for them: [{ item, c }]
  LM.readyManuals = function () {
    const st = FF7.state, out = [];
    for (const e of st.items || []) {
      const lid = LM.manualOf(e.id); if (!lid || !(e.qty > 0)) continue;
      const c = st.chars[D()[lid].char];
      if (c && st.members.includes(c.id) && !c.limitsKnown.includes(lid) && LM.ready(c, lid)) out.push({ item: e.id, c });
    }
    return out;
  };
  // (R.sideTasks asks every 30 frames; the trip opens the menu when it can)
  LM.due = function () {
    if (R.frames % 30 !== 0 || !FF7.state) return false;
    if (R.menuVisible() && R.menus && !R.menus.canOpen()) return false;
    return LM.readyManuals().length > 0 || (LM.on() && LM.pending().length > 0);
  };
  LM.trip = function* () {
    for (const { item, c } of LM.readyManuals()) {
      const r = yield* baseUse.call(R, item, c.id, { keep: true });
      if (r === true && c.limitsKnown.includes(LM.manualOf(item))) R.say('limit manual: ' + c.name + ' learned ' + D()[LM.manualOf(item)].name);
      else R.note('limit manual ' + item + ': ' + r);
    }
    for (const { c, lv } of LM.on() ? LM.pending() : []) {
      const r = yield* O.limitLevel(c.id, lv, { auto: true, keep: true });
      if (r !== true) R.note('limit policy: ' + r);
    }
    if (R.menus) yield* R.menus.finish();
    return true;
  };
  LM.names = (c, lv) => (c.limitsKnown || []).filter(id => D()[id] && D()[id].level === lv).map(id => D()[id].name).join(', ');

  // ['limitLevel', charId, n | 'auto']: set the limit level on the Limit screen (a level with a known limit);
  // the character is then left to the plan (the policy skips it) until ['limitLevel', charId, 'auto']
  O.limitLevel = function* (ch, n, o = {}) {
    const st = FF7.state, c = st.chars[ch];
    if (!c) return 'limitLevel: ' + ch + ' is not in the group';
    R.limitPins = R.limitPins || {};
    if (n === 'auto') { delete R.limitPins[ch]; R.say('limit: ' + c.name + ' back to the policy'); return true; }
    if (!o.auto) R.limitPins[ch] = n;
    if ((c.limitLevel || 1) === n) return true;
    if (!LM.levelsKnown(c).includes(n)) return 'limitLevel: ' + c.name + ' knows no level ' + n + ' limit (' + (c.limitsKnown || []).join(', ') + ')';
    let done = false;
    if (R.menuVisible() && R.menus && st.party.includes(ch)) done = yield* R.menus.run('Limit: ' + c.name + ' level ' + n, R.menus.limitLevel(ch, n), () => c.limitLevel === n, { keep: !!o.keep });
    if (c.limitLevel !== n) { c.limitLevel = n; c.limitGauge = 0; if (!done && !(R.menuVisible() && R.menus && st.party.includes(ch))) R.note('limit: ' + c.name + ' (not in the party: the Limit screen lists the party) set directly'); }
    if (R._limitDefer) delete R._limitDefer[ch];
    R.say('limit: ' + c.name + ' level ' + n + ' (' + LM.names(c, n) + ')' + (o.auto ? '' : ' [plan]'));
    return true;
  };
  // the limits of c (levels <= upTo) still to be learned by using one it knows ('uses:<known limit>:N')
  LM.pendingUses = (c, upTo = 3) => LM.mine(c).filter(k => D()[k].level <= upTo && !c.limitsKnown.includes(k) && /^uses:/.test(String(D()[k].learn || '')) && c.limitsKnown.includes(String(D()[k].learn).split(':')[1]));
  // ['learnLimits', { members: [ids], upTo: 3, max: 40, at, rest, fury: true, train: true, turns, calm: true, ... }]:
  // random battles (as `level`: pacing, patched up after each; at: a map or a world tile [x, y] with strong
  // enemies) until those members (default: the active party) have learned every limit of levels <= upTo that
  // comes from using one they know, the Limit Break Mechanics guide's way: the policy sets their levels; fury:
  // a Hyper on each of them in battle first (Fury: the gauge fills twice as fast; it lasts until cured); train:
  // the foes are left standing to hit them (R.limitTrainTurn: learners wait, the others Defend and heal) until a
  // gauge is full and the teaching limit goes off; calm: a Tranquilizer afterwards takes the Fury off. Stops
  // (noted, never a failure) after `max` battles.
  O.learnLimits = function* (o = {}) {
    const st = FF7.state, upTo = o.upTo || 3;
    const ids = () => (Array.isArray(o.members) ? o.members : st.party.filter(Boolean)).filter(id => st.party.includes(id) && st.chars[id]);
    const left = () => ids().filter(id => LM.pendingUses(st.chars[id], upTo).length);
    if (!left().length) return true;
    R.say('learnLimits: ' + left().map(id => st.chars[id].name + ' (' + LM.pendingUses(st.chars[id], upTo).map(k => D()[k].name).join(', ') + ')').join(', '));
    const keep = R.battleOpts;
    R.battleOpts = Object.assign({}, keep, { fury: o.fury === false ? null : left(), limitTrain: o.train === false ? null : { learners: left(), upTo, turns: o.turns } });
    let r;
    try { r = yield* R.grind(() => !left().length, Object.assign({ max: 40, soft: true }, o), 'learnLimits'); }
    finally { R.battleOpts = keep; }
    if (o.calm !== false) for (const id of ids()) { const c = st.chars[id]; if (c.status && c.status.fury && FF7.sys.inv.count('tranquilizer') > 0) yield* O.useItem('tranquilizer', id); }
    const still = left();
    if (still.length) R.note('learnLimits: still to learn ' + still.map(id => st.chars[id].name + ' (' + LM.pendingUses(st.chars[id], upTo).map(k => D()[k].name).join(', ') + ')').join(', '));
    else R.say('learnLimits: done');
    return r === true || typeof r !== 'string' ? true : r;
  };
  // what c still has to do for its limits of levels <= upTo: the first unknown one (level order) that can be
  // worked now -> { mode: 'uses', id, teacher } (use a known limit) | { mode: 'kills', id, left } | null (ready)
  LM.need = function (c, upTo = 3) {
    if (!c) return null;
    const ids = LM.mine(c).filter(k => D()[k].level <= upTo && !c.limitsKnown.includes(k)).sort((a, b) => D()[a].level - D()[b].level || (D()[a].slot || 0) - (D()[b].slot || 0));
    for (const k of ids) {
      const r = String(D()[k].learn || '');
      if (r.startsWith('uses:')) { const t = r.split(':')[1]; if (c.limitsKnown.includes(t)) return { mode: 'uses', id: k, teacher: t }; continue; }
      if (r.startsWith('kills:')) return { mode: 'kills', id: k, left: Math.max(0, +r.split(':')[1] - (c.kills || 0)) };
    }
    return null;
  };
  // the kills c still needs for its limits of levels <= upTo (the highest kill threshold not reached yet), 0 if none
  LM.killsNeed = function (c, upTo = 3) {
    if (!c) return 0;
    const n = LM.mine(c).filter(k => D()[k].level <= upTo && !c.limitsKnown.includes(k) && /^kills:/.test(String(D()[k].learn || '')))
      .reduce((a, k) => Math.max(a, +String(D()[k].learn).split(':')[1]), 0);
    return Math.max(0, n - (c.kills || 0));
  };
  // Cover materia on the learners who have uses to make (the Limit Break Mechanics guide: "equip Cover materia to the
  // person you are working on to help direct most attacks at that person"): the best grown copy to the first, from
  // wherever it is, into a free slot (Materia > Arrange > Exchange / the list)
  LM.coverOn = function* (ids) {
    const st = FF7.state, MT = R.mat, KEYS = ['weaponMateria', 'armorMateria'];
    const all = () => { const out = []; st.materia.forEach(m => { if (m && m.id === 'cover') out.push(m); }); st.members.forEach(cid => { const c = st.chars[cid]; if (c) FF7.sys.materia.equippedList(c).forEach(m => { if (m && m.id === 'cover') out.push(m); }); }); return out.sort((a, b) => b.ap - a.ap); };
    let moved = false;
    for (const id of ids) {
      const c = st.chars[id]; if (!c) continue;
      if (FF7.sys.materia.equippedList(c).some(m => m && m.id === 'cover')) continue;
      const m = all().find(x => { const w = MT.where(x); return w === 'stock' || (w && !ids.includes(w.c.id)); });
      if (!m) break;
      let dst = null; for (const key of KEYS) { const i = c[key].findIndex(x => !x); if (i >= 0) { dst = { c, key, i }; break; } }
      if (!dst) continue;
      const at = MT.where(m);
      if (at === 'stock') yield* MT.put(c, dst.key, dst.i, m); else yield* MT.swap(dst, at);
      moved = true;
    }
    if (moved && R.menus) yield* R.menus.finish();
    return true;
  };
  // ['limitReady', charId | [ids], { upTo: 3, at, max: 120, uses, cover, ... }]: (cover: false: no Cover materia moves) (uses: false: the kills only - the uses are
  // left to the gauge as it fills, or to a later training) those characters trained until they know every
  // limit of levels <= upTo (so their manual can be read: the watcher reads it at once), up to three at a time in
  // the party (the PHS swaps them in; the party comes back after): kills (FF7: their own killing blows - the
  // others Defend and heal) and uses (as learnLimits: Fury, the foes left standing to hit them). at: a map or a
  // world tile [x, y] with random battles (default: where the party is); stops (noted) after `max` battles.
  O.limitReady = function* (who, o = {}) {
    const st = FF7.state, upTo = o.upTo || 3;
    const list = [].concat(who).filter(id => st.members.includes(id) && st.chars[id] && !FF7.isGuest(id));
    const left = () => list.filter(id => o.uses === false ? LM.killsNeed(st.chars[id], upTo) > 0 : LM.need(st.chars[id], upTo));
    if (!left().length) return true;
    const party0 = st.party.filter(Boolean).slice(), keep = R.battleOpts;
    R.say('limitReady: ' + left().map(id => st.chars[id].name + ' (' + LM.missing(st.chars[id], null).filter(k => D()[k].level <= upTo).map(k => D()[k].name).join(', ') + ')').join('; '));
    let fought = 0, r = true;
    try {
      const mode = (id) => (LM.need(st.chars[id], upTo) || {}).mode || null;
      for (let round = 0; round < 40 && left().length && fought < (o.max || 120); round++) {
        // the party: the trainees (three at most), the locked members, then the others as they were. One learner with
        // uses to make at a time, with the Cover materia (every single blow aimed at the party then lands on them: the
        // gauge fills several times faster), with the ones who still need kills; the others Defend
        const locked = (st.locked || []).filter(id => party0.includes(id) || st.party.includes(id));
        const size = st.party.filter(Boolean).length;
        const need = left(), usesL = o.uses === false ? [] : need.filter(id => mode(id) === 'uses'), killsL = need.filter(id => !usesL.includes(id));
        const trainees = (usesL.length ? [usesL[0]] : []).concat(killsL);
        let want = [...new Set(locked.concat(trainees))].slice(0, size);
        for (const id of party0.concat(st.party.filter(Boolean))) if (want.length < size && !want.includes(id)) want.push(id);
        if (st.phsEnabled && want.some((id, i) => st.party[i] !== id)) { const p = yield* O.party(want); if (p !== true) R.note('limitReady: party: ' + p); }
        const group = trainees.filter(id => st.party.includes(id));
        if (!group.length) { R.note('limitReady: ' + left().join(', ') + ' could not join the party (PHS)'); break; }
        const modes0 = group.map(mode).join();
        if (o.uses !== false && o.cover !== false) yield* LM.coverOn(group.filter(id => mode(id) === 'uses'));
        R.battleOpts = Object.assign({}, keep, o.uses === false ? { limitTrain: { learners: group, upTo, turns: o.turns, uses: false } } : { fury: group, limitTrain: { learners: group, upTo, turns: o.turns } });
        const b0 = R.stats.battles;
        // (a round ends when the group's needs change - a uses learner done, a kills learner on to its uses - so the
        // party and the Cover materia are set again)
        r = yield* R.grind(() => !group.some(id => left().includes(id)) || group.map(mode).join() !== modes0, Object.assign({ soft: true, restDry: true }, o, { max: (o.max || 120) - fought }), 'limitReady');
        fought += R.stats.battles - b0;
        if (r !== true) break;
        // (out of Tents and healing: the round is over - another would fight one battle hurt and stop again, forty
        // times over in a full run; the plan restocks and trains again)
        if (R.grindDry) { R.note('limitReady: out of healing after ' + fought + ' battles: back to restock'); break; }
      }
    } finally { R.battleOpts = keep; }
    for (const id of list) { const c = st.chars[id]; if (c.status && c.status.fury && st.party.includes(id) && FF7.sys.inv.count('tranquilizer') > 0) yield* O.useItem('tranquilizer', id); }
    if (st.phsEnabled && party0.some((id, i) => st.party[i] !== id)) { const p = yield* O.party(party0); if (p !== true) R.note('limitReady: party back: ' + p); }
    const still = left();
    if (still.length) R.note('limitReady: still to learn ' + still.map(id => st.chars[id].name + ' (' + (o.uses === false ? LM.killsNeed(st.chars[id], upTo) + ' kills' : LM.need(st.chars[id], upTo).id) + ')').join(', ') + ' after ' + fought + ' battles');
    else R.say('limitReady: ' + list.join(', ') + ' ready (' + fought + ' battles)');
    return r === true || typeof r !== 'string' ? true : r;
  };
  // ['useItem', manual, charId, { whenReady }]: a limit manual is read at once when its character is ready (every
  // other limit known); otherwise it stays in the bag (noted, not a failure) and is read on the Item screen as
  // soon as they are (a side task, after battles). Every manual in the bag is watched that way, asked for or not.
  const baseUse = O.useItem;
  O.useItem = function* (id, ch, o = {}) {
    const lid = LM.manualOf(id);
    if (lid) {
      const c = FF7.state.chars[D()[lid].char];
      if (c && c.limitsKnown.includes(lid)) return true;
      if (!c || !FF7.state.members.includes(c.id)) { R.note('limit manual ' + id + ': ' + D()[lid].char + ' is not in the group (kept)'); return true; }
      if (!LM.ready(c, lid)) { R.note('limit manual ' + id + ': kept until ' + c.name + ' is ready (still to learn: ' + LM.missing(c, lid).map(k => D()[k].name).join(', ') + ')'); return true; }
      return yield* baseUse.call(this, id, c.id, o);
    }
    return yield* baseUse.call(this, id, ch, o);
  };
  // ['limitPolicy', true | false]: the automatic limit levels on / off from here
  O.limitPolicy = function* (on) { R.limitPolicy = on !== false && on !== 'off'; R.say('limit policy ' + (R.limitPolicy ? 'on' : 'off')); return true; };
})();

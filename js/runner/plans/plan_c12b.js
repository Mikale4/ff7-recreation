// Runner plan, Chapter 12b: Optional B (the WEAPONs, the materia caves, the Sunken Gelnika, the Ancient
// Forest and the training there, Lucrecia's cave, the Disc 2/3 town extras, the Sleeping Man and the
// Weapon Seller's box, the Special Battle, Wutai's Pagoda) (docs/RUNNER.md, "Chapter 12b notes").
// Starts at: Disc 3 on the world map, in the Highwind (after C12a). Ends with: back on the Highwind.
// This file also holds the helpers C11b uses (R.ops.c12b_*, the WEAPON tactic, the Disc 3 start profile).
(function () {
  const R = FF7.runner, O = R.ops;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const inv = (id) => FF7.sys.inv.count(id) > 0;

  // ================================================================== field helpers
  // tiles of this map's step triggers that move the party (one-way jumps with a landing tile `_to`, traps
  // that fire every time: the Ancient Forest's Large Flytrap), except `but`
  function jumpTiles(fs, but) {
    const out = new Set();
    (fs.map.triggers || []).forEach(t => {
      if (t === but || t.on || !(t._to || t.once === false)) return;
      const [x0, y0, w = 1, h = 1] = t.at;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.add(x + ',' + y);
    });
    return out;
  }
  R.c12bJumpTiles = jumpTiles;
  // ['c12b_hop', x, y]: walk onto the jump at x, y (keeping off the other jumps) and ride it: done when the
  // jump has carried the party (to its landing tile, or off the map)
  O.c12b_hop = function* (x, y, o = {}) {
    const fs = R.field(); if (!fs) return 'hop: not on a field map';
    const tr = (fs.map.triggers || []).find(t => t._to && fs.inRect(t.at, x, y));
    if (!tr) return 'hop: no jump at ' + x + ',' + y + ' on ' + fs.map.id;
    const keep = jumpTiles(fs, tr), map0 = fs.map.id, gen0 = fs.loadGen;
    const g = R.walkField([[x, y]], Object.assign({ anywhere: true }, o, { avoid: (a, b) => keep.has(a + ',' + b) }));
    let last = [fs.player.tx, fs.player.ty], res = null;
    for (let i = 0; i < 100000; i++) {
      const f = R.field();
      if (!f || f.map.id !== map0 || f.loadGen !== gen0) { yield* R.settle(3); return true; }
      const p = f.player;
      if (Math.abs(p.tx - last[0]) > 1 || Math.abs(p.ty - last[1]) > 1) { yield* R.settle(3); return true; }   // carried by the jump
      last = [p.tx, p.ty];
      const r = g.next();
      if (r.done) { res = r.value; break; }
      yield;
    }
    yield* R.settle(3);
    const f = R.field(), p = f && f.player;
    if (p && Math.abs(p.tx - tr._to[0]) <= 1 && Math.abs(p.ty - tr._to[1]) <= 1) return true;
    return 'hop at ' + x + ',' + y + ': ' + res;
  };
  // ['c12b_walk', x, y]: walk there without stepping on the map's jumps
  O.c12b_walk = function* (x, y, o = {}) {
    const fs = R.field(); if (!fs) return 'walk: not on a field map';
    const keep = jumpTiles(fs, null);
    return yield* O.walk(x, y, Object.assign({}, o, { avoid: (a, b) => keep.has(a + ',' + b) && !(a === x && b === y) }));
  };
  // ['c12b_get', id]: a map item or chest, walking up to it without stepping on the map's jumps
  O.c12b_get = function* (id, o = {}) {
    if (FF7.state.flags['got_' + id]) return true;
    const fs = R.field(); if (!fs) return 'get: not on a field map';
    const ob = fs.objects.find(x => x.id === id && (x.kind === 'item' || x.kind === 'chest'));
    if (!ob) return 'get: ' + id + ' is not on ' + fs.map.id;
    const keep = jumpTiles(fs, null);
    const spots = R.standSpots(fs, sel => sel.o === ob, ob.at[0], ob.at[1], 2).filter(s => !keep.has(s.x + ',' + s.y));
    if (spots.length) {
      const r = yield* R.walkField(spots.map(s => [s.x, s.y]), { near: 0.12, avoid: (a, b) => keep.has(a + ',' + b) });
      if (r === 'mapchanged') return 'get ' + id + ': the map changed';
      if (r !== true) return 'get ' + id + ': ' + r;
    }
    return yield* O.item(id);
  };
  // one pacing walk (two tiles back and forth) for the random battles here, on a field map or the world map
  function* paceStep(st) {
    const mod = (a, n) => ((a % n) + n) % n;
    const fs = R.field(), ws = R.worldScene();
    if (fs) {
      const keep = jumpTiles(fs, null), p = fs.player;
      const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !keep.has(x + ',' + y));
      if (!pairs.length) return 'no room to pace here';
      const r = yield* R.walkField([pairs[st.side++ % pairs.length]], { anywhere: true, avoid: (a, b) => keep.has(a + ',' + b) });
      // (a tile across a ledge, or a wandering creature in the way: wait a moment, then the next one)
      if (r !== true && r !== 'mapchanged') {
        // (the path planner can lose its way next to a wandering creature: a few steps on the d-pad, as a player would)
        st.fails = (st.fails || 0) + 1; if (st.fails > 12) return r;
        const dir = ['left', 'right', 'up', 'down'][st.fails % 4];
        for (let g = 0; g < 14; g++) { R.hold(dir, 1); yield; }
        yield;
        return true;
      }
      st.fails = 0;
    } else if (ws) {
      const x = Math.floor(ws.px), y = Math.floor(ws.pz), D = R.worldD();
      const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !R.entries()[mod(a, D.w) + ',' + mod(b, D.h)]);
      if (!pairs.length) return 'no room to pace here';
      const r = yield* R.walkWorld([pairs[st.side++ % pairs.length]], { anywhere: true });
      if (r !== true) return r;
    } else yield;
    return true;
  }
  // ['c12b_learn', [eskillIds], { max, while, final }]: fight the random battles here (pacing like ['level'])
  // until the party's Enemy Skill materia know them all (the battle tactics in force should `learn` them), or
  // max battles have been fought (or while() stops holding: then it's left for later, unless final); a
  // skill still missing then is only noted
  O.c12b_learn = function* (list, o = {}) {
    // (the master Enemy Skill materia - the copy that knows the most - learns them: on the party first)
    const want = [].concat(list), left = () => want.filter(e => !R.masterKnows(e));
    if (left().length) yield* R.mat.ensureMaster(o.holder);
    let b0 = R.stats.battles, lastB = R.frames, fights = 0; const st = { side: 0 };
    while (left().length && fights < (o.max || 25) && (!o.while || o.while())) {
      if (R.frames - lastB > 20000) return 'learn: no battles here (' + R.where() + ')';
      if (R.stats.battles !== b0) { b0 = R.stats.battles; lastB = R.frames; fights++; yield* O.heal({ below: 0.5 }); continue; }
      const r = yield* paceStep(st); if (r !== true) return 'learn: ' + r;
    }
    if (left().length && o.while && !o.while() && !o.final) R.say('learn: ' + left().join(', ') + ' left for later (' + fights + ' battles on ' + R.where() + ')');
    else if (left().length) R.note('learn: ' + left().join(', ') + ' not learned after ' + fights + ' battles on ' + R.where());
    else R.say('learn: ' + want.join(', ') + ' known');
    return true;
  };

  // ['c12b_train', level, { at, rest, loc, via, max }]: random battles on map `at` until the party's average
  // level is `level` (or max battles); patched up after each fight (Cure magic, potions); when someone is low
  // or the casters are dry, a Tent (full HP / MP): at map `rest`'s save point, or with rest: 'world' out on the
  // world map, then back in through location `loc` (ridden there as `via` says). Out of Tents it stops, noted.
  O.c12b_train = function* (lvl, o = {}) {
    if (R.avgLevel() >= lvl) return true;
    const act = () => FF7.sys.party.active();
    const weak = () => act().some(c => c.hp <= 0 || c.hp < c.maxHp * 0.5);
    const dry = () => { const cs = act().filter(c => FF7.sys.materia.abilities(c).spells.length); return cs.length && cs.every(c => c.mp < c.maxMp * 0.25); };
    const back = function* () {
      if (R.where() === 'world' && o.loc) { const r = yield* O.world(o.loc, o.via || {}); if (r !== true && r !== 'mapchanged') return r; }
      return yield* O.goto(o.at);
    };
    let b0 = R.stats.battles, lastB = R.frames, fights = 0, rests = 0; const st = { side: 0 };
    while (R.avgLevel() < lvl && fights < (o.max || 80)) {
      if (R.frames - lastB > 30000) return 'train: no battles on ' + R.where();
      if (R.stats.battles !== b0) {
        b0 = R.stats.battles; lastB = R.frames; fights++;
        yield* R.patchUp({ below: 0.7, itemBelow: 0.35, keepPotions: 6, tent: false });
        if (weak() || dry()) {
          if (!FF7.sys.inv.has('tent')) { yield* R.patchUp({ below: 0.9, itemBelow: 0.6 }); if (weak()) { R.note('train: out of Tents at level ' + R.avgLevel().toFixed(1) + ' (' + fights + ' battles)'); return true; } }
          else {
            let r;
            if (o.rest === 'world') {
              if (o.exitAt && R.where() !== o.at) { r = yield* O.goto(o.at); if (r !== true) return 'train: ' + r; }
              r = o.exitAt ? yield* O.exit(o.exitAt) : yield* R.gotoMap('world');
              if (r !== true && r !== 'mapchanged') return 'train: ' + r;
              yield* R.settle(4);
              if (R.where() !== 'world') return 'train: not out on the world map (' + R.where() + ')';
            } else {
              r = yield* O.goto(o.rest); if (r !== true) return 'train: ' + r;
              const fs = R.field(), sp = fs && fs.objects.find(x => x.kind === 'save');
              if (!sp) return 'train: no save point on ' + o.rest;
              const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [sp.at[0] + dx, sp.at[1] + dy]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y));
              r = yield* R.walkField(spots, { anywhere: true }); if (r !== true) return 'train: ' + r;
              yield* R.settle(3);
            }
            r = yield* O.useItem('tent', act()[0].id); if (r !== true) return 'train: ' + r;
            rests++;
            r = yield* back(); if (r !== true) return 'train: ' + r;
            b0 = R.stats.battles; lastB = R.frames;
          }
        }
        continue;
      }
      if (R.where() !== o.at) { const r = yield* back(); if (r !== true) return 'train: ' + r; lastB = R.frames; continue; }
      const r = yield* paceStep(st); if (r !== true) return 'train: ' + r;
    }
    R.say('train: level ' + R.avgLevel().toFixed(1) + ' after ' + fights + ' battles, ' + rests + ' Tents (' + FF7.state.gil + ' gil)');
    return true;
  };

  // ['c12b_special', { tries }]: the Battle Square's Special Battle (Cloud alone, eight rounds, 10 GP; it opens
  // with Omnislash learned, W-Summon owned and the Ultima Weapon): Final Attack for the first clear. The
  // handicap reel, best first for Cloud's Knights of the Round + Mime (the BP don't matter): a full Cure (MP for
  // the next summon too), no handicap, the ones that leave the summon, the Mime and HP Absorb alone...
  const HCAPS = ['Cure (full recovery)', 'Lucky 7 (no handicap)', 'Level down (small)', 'Poison', 'Accessory broken', 'Armor broken',
    'Level down (big)', '1/2 Speed', 'Time x30 damage', 'Independent materia broken', 'Item command sealed', 'Magic materia broken',
    '1/2 HP', 'Support materia broken', '1/2 MP', 'Weapon broken', 'Mini', '1/2 HP & MP', 'Frog', 'Command materia broken', '0 MP',
    'Summon materia broken', 'All materia broken'];
  const qText = (w) => (w && w.pages ? w.pages.map(p => p.join(' ')).join(' ') : '');
  O.c12b_special = function* (o = {}) {
    const st = FF7.state;
    if (st.flags.c12a_special_clear) return true;
    // (not offered yet - Omnislash learned, W-Summon, the Ultima Weapon: the host would only run the normal series)
    const cl = st.chars.cloud;
    if (!(cl && (cl.limitsKnown || []).includes('omnislash') && R.gear.owned('w_summon') > 0 && (cl.weapon === 'ultima_weapon' || FF7.sys.inv.has('ultima_weapon')))) {
      R.note('special: not open yet (Omnislash learned, W-Summon, the Ultima Weapon)'); return true;
    }
    if (!O.c12a_toSaucer || !O.c12a_leaveSaucer) return 'special: no way to the Gold Saucer (plan_c12a.js)';
    let r = yield* O.c12a_toSaucer('gs_battle'); if (r !== true) return 'special: ' + r;
    const cloud = st.chars.cloud;
    const answer = (choices, w) => {
      const q = qText(w);
      const sp = choices.findIndex(c => /^Special Battle/.test(c));
      if (sp >= 0) return sp;
      if (/Will you keep going/.test(q)) return Math.max(0, choices.findIndex(c => /Of course/.test(c)));
      if (/Handicap roulette/.test(q)) {
        let best = 0, bi = 99;
        choices.forEach((c, i) => { const k = HCAPS.indexOf(c); const v = k < 0 ? 50 : k; if (v < bi) { bi = v; best = i; } });
        return best;
      }
      return 0;
    };
    for (let n = 0; n < (o.tries || 3) && !st.flags.c12a_special_clear; n++) {
      if ((st.gp || 0) < 10) return 'special: out of GP';
      const tag = 'c12b_sp' + n;
      for (let k = 0; k < 24; k++) R.choices.push({ a: answer, pc: tag });
      try { r = yield* O.talk('c12a_host', {}); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
      if (r !== true) return 'special: ' + r;
      yield* R.settle(10);
      R.say('special: ' + (st.flags.c12a_special_clear ? 'cleared (Final Attack)' : 'not cleared') + ', ' + st.gp + ' GP');
    }
    // the BP at the prize counter before leaving (they vanish at the door): the dearest prize they buy, again
    for (let n = 0; n < 6 && (st.bp || 0) >= 100; n++) {
      const bp0 = st.bp, tag = 'c12b_bp' + n;
      R.choices.push({ a: (choices) => { let best = choices.length - 1, bv = -1; choices.forEach((c, i) => { const m = /\((\d+) BP\)/.exec(c); const v = m ? +m[1] : -1; if (v <= st.bp && v > bv) { bv = v; best = i; } }); return best; }, pc: tag });
      try { r = yield* O.talk('c12a_bp_clerk', {}); } finally { R.choices = R.choices.filter(c => c.pc !== tag); }
      if (r !== true || st.bp === bp0) break;
    }
    r = yield* O.c12a_leaveSaucer(); if (r !== true) return 'special: ' + r;
    if (!st.flags.c12a_special_clear) R.note('special: the Special Battle was not cleared');
    return true;
  };

  // ['c12b_mp', charId, frac]: Ethers / Turbo Ethers (an Elixir at the last) on that member until the MP is
  // at frac of the maximum: the engine's heal (R.patchUp tops up whoever uses MP, summoners too)
  O.c12b_mp = function* (ch, frac = 0.9) {
    const c = FF7.state.chars[ch]; if (!c) return 'mp: ' + ch + ' is not in the group';
    const r = yield* O.heal({ members: [ch], below: 0, itemBelow: 0, spells: false, tent: false, mp: frac, elixir: true });
    if (c.hp > 0 && c.mp < c.maxMp * frac) R.note('mp: nothing left to restore ' + c.name + "'s MP");
    return r;
  };

  // ['c12b_eskill', charId, [eskills]]: of the Enemy Skill materia (the list's, anyone's), the one that knows
  // the most of those skills into this character's Enemy Skill slot (or first free slot): Exchange / put on
  // the Materia screen (a loadout only asks for "enemy_skill" and may keep an empty copy)
  O.c12b_eskill = function* (ch, skills) {
    const MT = R.mat, st = FF7.state, c = st.chars[ch], KEYS2 = ['weaponMateria', 'armorMateria'];
    if (!c) return 'eskill: ' + ch + ' is not in the group';
    const want = [].concat(skills), score = (m) => want.filter(e => (m.eskills || []).includes(e)).length;
    const pool = st.materia.filter(m => m && m.id === 'enemy_skill');
    st.members.map(id => st.chars[id]).filter(Boolean).forEach(x => KEYS2.forEach(k => (x[k] || []).forEach(m => { if (m && m.id === 'enemy_skill') pool.push(m); })));
    const best = pool.sort((a, b) => score(b) - score(a) || (b.eskills || []).length - (a.eskills || []).length)[0];
    if (!best || !score(best)) return 'eskill: no Enemy Skill materia knows ' + want.join(', ');
    let at = null;
    for (const key of KEYS2) { const i = c[key].findIndex(m => m && m.id === 'enemy_skill'); if (i >= 0) { at = { key, i }; break; } }
    if (!at) for (const key of KEYS2) { const i = c[key].findIndex(m => !m); if (i >= 0) { at = { key, i }; break; } }
    if (!at) return 'eskill: no free slot on ' + ch;
    if (c[at.key][at.i] === best) return true;
    const w = MT.where(best);
    if (w === 'stock') { if (c[at.key][at.i]) yield* MT.take(c, at.key, at.i); yield* MT.put(c, at.key, at.i, best); }
    else if (w) yield* MT.swap({ c, key: at.key, i: at.i }, w);
    yield* R.menus.finish();
    return c[at.key][at.i] === best ? true : 'eskill: the materia did not move';
  };

  // ['c12b_sources', { power, guard, magic, mind, speed, luck }]: the stat sources in the bag, used on the
  // Item screen (default: all on Cloud, who fights every battle to the end)
  const SOURCES = ['power', 'guard', 'magic', 'mind', 'speed', 'luck'];
  O.c12b_sources = function* (o = {}) {
    for (const k of SOURCES) {
      const id = k + '_source', who = o[k] || o.all || 'cloud';
      for (let n = 0; n < 99 && FF7.sys.inv.count(id) > 0; n++) {
        const r = yield* O.useItem(id, who);
        if (r !== true) { R.note('sources: ' + r); break; }
      }
    }
    return true;
  };

  // ================================================================== the WEAPON tactic
  // ['battle', { weapon: { mime, hades, slow, bigGuard, pots, keepAlive, heal, solo, wait } }]: FF7's "KOTR + Mime" play,
  // which the Auto-battle AI does not know: keep the party standing (Phoenix Down, Megalixir / Elixir),
  // open with Big Guard and Slow, the strongest summons (W-Summon: two, Hades first on a foe it can
  // paralyse, e.g. Ruby WEAPON), then Mime the big action (0 MP) instead of breaking the chain. pots:
  // an Elixir for a Magic Pot (it can be hurt afterwards). Everything else falls to the tactician.
  const bigAct = (a) => !!a && (a.type === 'summon' || a.type === 'limit' || (a.type === 'multi' && a.list.some(bigAct)));
  R.c12bWeaponTactic = function (b, p, o) {
    if (!p.isParty) return null;
    const allies = b.party.filter(x => !x.hidden), alive = allies.filter(x => x.alive);
    const foes = b.enemies.filter(x => x.targetable);
    if (!foes.length) return null;
    // (a foe with a once-per-game Enemy Skill as its death attack, while the master's holder is down: the tactician,
    // which revives first and holds the finishing blows back - R.lastWordGuard)
    if (R.lastWordGuard(b).size) return null;
    const cmds = (p.abilities && p.abilities.commands) || [];
    const frac = (x) => x.hp / x.maxHp;
    const mem = b._c12b = b._c12b || { opened: {} };
    const pending = b.queue.filter(a => a.actor && a.actor.isParty).concat(b.current && b.current.actor && b.current.actor.isParty ? [b.current] : []);
    const item = (id, targets, all) => ({ actor: p, type: 'item', item: id, targets, side: 'ally', all: !!all });
    const canMime = (x) => x !== p && x.alive && ((x.abilities && x.abilities.commands) || []).includes('mime');
    const summonsOf = (x, mp) => (x.abilities.summons || []).map(s => ({ s, d: FF7.data.summons[s.id] })).filter(y => y.d && y.d.kind === 'damage' && (x.summonUses[y.s.id] || 0) < y.s.uses && (mp == null || mp >= y.d.mp));
    // a Magic Pot wants an Elixir (FF7: then it can be hurt: 8,000 EXP, 1,000 AP)
    if (o.pots) {
      const pot = foes.find(f => f.def0 && f.def0.elixirUnlock && !(f.vars && f.vars.vulnerable) && !pending.some(a => a.type === 'item' && (a.targets || []).includes(f)));
      if (pot && FF7.sys.inv.count('elixir') > (o.keepElixirs != null ? o.keepElixirs : 4)) return { actor: p, type: 'item', item: 'elixir', targets: [pot], side: 'enemy' };
    }
    // (keepAlive) any battle: when someone is down or low, the Auto AI's own revive / heal (Life, Cure-All,
    // potions) comes first, even while every enemy is being spared for its Enemy Skill (the tactician then
    // hands the AI no enemies and it only Defends)
    if (o.keepAlive && !foes.some(f => f.boss)) {
      const needy = allies.some(x => x.dead) || alive.some(x => frac(x) < 0.5);
      if (needy && R.origAutoBattle) {
        const keep = { all: Object.assign({}, p.allUses), sum: Object.assign({}, p.summonUses) };
        const a = R.origAutoBattle(b, p);
        if (a && a.side === 'ally' && a.type !== 'defend') return a;
        p.allUses = keep.all; p.summonUses = keep.sum;
      }
      // (the AI had no cure: from the bag, a Phoenix Down for the fallen, an X-Potion for the lowest, a
      // Megalixir when two are low)
      if (needy && !pending.some(a => a.type === 'item')) {
        const down = allies.filter(x => x.dead);
        if (down.length && inv('phoenix_down')) return item('phoenix_down', [down[0]]);
        const low = alive.filter(x => frac(x) < 0.45).sort((x, y) => frac(x) - frac(y));
        if (low.length >= 2 && alive.length > 1 && inv('megalixir')) return item('megalixir', alive, true);
        if (low.length && inv('x_potion')) return item('x_potion', [low[0]]);
        if (low.length && inv('elixir')) return item('elixir', [low[0]]);
      }
    }
    // (o.bigGuardAll: in any battle with a foe of level bigGuardAll or more, Big Guard first: Barrier, MBarrier
    // and Haste for everyone - a Dark Dragon's Ultima then does half)
    if (o.bigGuardAll && !mem.opened.bg && foes.some(f => (f.level || 0) >= o.bigGuardAll) && (p.abilities.eskills || []).includes('big_guard') && p.mp >= 56
      && !(p.has && p.has('silence')) && !pending.some(a => a.id === 'big_guard')) { mem.opened.bg = true; return { actor: p, type: 'eskill', id: 'big_guard', targets: alive, side: 'ally', all: true }; }
    // (o.big: foes fought like a boss, e.g. Master Tonberry: Knights of the Round before its grudge adds up)
    // (and a foe whose death attack is a once-per-game Enemy Skill still to learn, e.g. a Dragon Zombie's Pandora's Box: it
    // is summoned down at once, before its MP goes on Shadow Flares - R.lastWordSkill)
    if (!foes.some(f => f.boss || (o.big || []).includes(f.id) || R.lastWordSkill(f)) && !o.always) return null;
    const pendingHeal = pending.some(a => a.type === 'item' && /elixir|megalixir|phoenix|x_potion/.test(a.item));
    // 1. revive (not while fighting alone on purpose, nor with revive: false)
    const chainNow = bigAct(b.lastPartyAction) || pending.some(bigAct);
    const dead = allies.filter(x => x.dead);
    if (dead.length && !o.solo && o.revive !== false && !pending.some(a => a.type === 'item' && a.item === 'phoenix_down') && inv('phoenix_down')) return item('phoenix_down', [dead[0]]);
    // (what one link of the chain takes off the boss, measured from turn to turn: when the next Mime finishes
    // it, the mimer doesn't stop to heal and break the chain)
    const bossNow = (foes.filter(f => f.boss).sort((x, y) => (y.maxHp || 0) - (x.maxHp || 0))[0] || { hp: 0 }).hp;   // (the WEAPON, not its tentacles)
    if (mem.bossHp != null && chainNow && mem.bossHp > bossNow) mem.perLink = Math.max(mem.perLink || 0, mem.bossHp - bossNow);
    mem.bossHp = bossNow;
    const finishing = chainNow && cmds.includes('mime') && mem.perLink && bossNow > 0 && bossNow < mem.perLink * 0.8;
    // 2. heal (heal: 'opening': only before the Mime chain runs: afterwards HP Absorb heals the mimer)
    if (o.heal !== false && !(o.heal === 'opening' && chainNow) && !pendingHeal && !finishing) {
      // (fighting alone the only one standing can't be let low: a WEAPON's next two blows would finish him)
      const lim = o.solo ? 0.62 : 0.55, crit = o.solo ? 0.62 : 0.45;
      const low = alive.filter(x => frac(x) < lim).sort((a, c) => frac(a) - frac(c));
      if (low.length && (low.length >= 2 || frac(low[0]) < crit)) {
        if (alive.length > 1 && inv('megalixir')) return item('megalixir', alive, true);
        if (inv('elixir')) return item('elixir', [low[0]]);
        if (inv('megalixir')) return item('megalixir', alive, true);
        if (inv('x_potion')) return item('x_potion', [low[0]]);
      }
    }
    // 2a. (o.finisher, o.finishFor: [enemy ids]) the killing blow on those foes is the finisher's: the others only
    // revive and heal (above), else Defend, while the finisher stands (the Enemy-Skill FAQ on Ultimate WEAPON: its final
    // Shadow Flare hits the one who killed it - "make sure that character is the only one attacking")
    if (o.finisher && p.id !== o.finisher && foes.some(f => (o.finishFor || []).includes(f.id)) && allies.some(x => x.id === o.finisher && x.alive)) return { actor: p, type: 'defend' };
    // 2b. a boss that can't be hurt yet (Ruby WEAPON before its tentacles are in): wait for it
    if (foes.some(f => f.boss) && foes.every(f => f.invulnerable && !(f.vars && f.vars.vulnerable))) return { actor: p, type: 'defend' };
    // 3. openers: Big Guard, Slow on a WEAPON that can be slowed
    // (only before the Mime chain runs: an action between two Mimes would break it)
    if (o.bigGuard && !chainNow && !mem.opened.bg && (p.abilities.eskills || []).includes('big_guard') && p.mp >= 56) { mem.opened.bg = true; return { actor: p, type: 'eskill', id: 'big_guard', targets: alive, side: 'ally', all: true }; }
    // (o.slowByMates: the summoner / mimer leaves the Spider Web to a teammate; tested worse against Emerald:
    // unslowed, it gets two blows in a row whenever the teammates' turns come after the first summon)
    if (o.slow && !chainNow && !(o.wait && o.slowByMates && (summonsOf(p).length || cmds.includes('mime')) && alive.some(x => x !== p))) {
      const boss = foes.find(f => f.boss && f.hp > 100000 && !f.has('slow') && !(f.def0 && (f.def0.immune || []).includes('slow')));
      if (boss && !pending.some(a => a.id === 'slow' || a.item === 'spider_web')) {
        if ((p.abilities.spells || []).some(s => s.id === 'slow') && p.mp >= 20) { mem.opened.slow = true; return { actor: p, type: 'magic', id: 'slow', targets: [boss], side: 'enemy' }; }
        if (inv('spider_web')) { mem.opened.slow = true; return { actor: p, type: 'item', item: 'spider_web', targets: foes, side: 'enemy', all: true }; }
      }
    }
    // 4. Mime the big action that just happened (or is about to)
    const others = pending.filter(a => a.actor !== p);
    const chain = others.some(bigAct) || (bigAct(b.lastPartyAction) && !others.some(a => !bigAct(a)));
    // (the worth of a summon: power x hits; the action a Mime would copy)
    const worth = (a) => { if (!a) return 0; if (a.type === 'multi') return Math.max(0, ...a.list.map(worth)); const d = a.type === 'summon' ? FF7.data.summons[a.id] : null; return d ? (d.power || 0) * (d.hits || 1) : a.type === 'limit' ? 400 : 0; };
    const copyWorth = Math.max(worth(b.lastPartyAction), ...others.map(worth));
    const ownBest = Math.max(0, ...summonsOf(p, p.mp).map(y => (y.d.power || 0) * (y.d.hits || 1)));
    if (o.mime !== false && cmds.includes('mime') && chain && copyWorth >= ownBest) return { actor: p, type: 'mime' };
    // (o.wait) while a teammate can Mime the chain, this character's full ATB bar is left waiting instead
    // of breaking it (FF7: you just don't input a command)
    if (o.wait && chain && allies.some(canMime)) return { actor: p, type: 'wait', frames: 15 };
    // (o.wait + o.hold) the openers first: the summoner holds its first summon until a teammate's Big Guard / Slow is
    // in (nothing may come between the Mimes afterwards), for at most 15 s of battle time
    // (o.wait) a teammate's Spider Web is on its way to an unslowed WEAPON: the summoner waits for it (should the
    // thrower fall first, its turn is gone and the summoner throws one itself)
    if (o.wait && o.slow && !chainNow && summonsOf(p).length && pending.some(a => a.actor !== p && a.item === 'spider_web')
      && foes.some(f => f.boss && !f.has('slow'))) return { actor: p, type: 'wait', frames: 15 };
    if (o.wait && o.hold && !chainNow && summonsOf(p).length) {
      if (mem.t0 == null) mem.t0 = b.t;
      const mates = alive.filter(x => x !== p);
      const bgComing = o.bigGuard && !mem.opened.bg && mates.some(x => ((x.abilities && x.abilities.eskills) || []).includes('big_guard') && x.mp >= 56);
      const slowable = foes.some(f => f.boss && f.hp > 100000 && !f.has('slow') && !(f.def0 && (f.def0.immune || []).includes('slow')));
      const slowComing = o.slow && slowable && !mem.opened.slow && mates.length && (inv('spider_web') || mates.some(x => ((x.abilities && x.abilities.spells) || []).some(s => s.id === 'slow') && x.mp >= 20));
      if ((bgComing || slowComing) && b.t - mem.t0 < 900) return { actor: p, type: 'wait', frames: 15 };
    }
    // 5. the strongest summons (W-Summon: two, the strongest last so Mime copies it)
    const sums = summonsOf(p).sort((a, c) => (c.d.power * (c.d.hits || 1)) - (a.d.power * (a.d.hits || 1)));
    const two = cmds.includes('w_summon') ? 2 : 1, pick = [];
    let mp = p.mp;
    const paralysable = foes.some(f => f.boss && !f.has('paralysis') && !(f.def0 && (f.def0.immune || []).includes('paralysis')));
    if (o.hades && paralysable) { const h = sums.find(x => x.s.id === 'hades'); if (h && mp >= h.d.mp) { pick.push(h); mp -= h.d.mp; } }
    for (const x of sums) { if (pick.length >= two) break; if (!pick.includes(x) && mp >= x.d.mp) { pick.push(x); mp -= x.d.mp; } }
    if (pick.length) {
      pick.forEach(x => { p.summonUses[x.s.id] = (p.summonUses[x.s.id] || 0) + 1; });
      const acts = pick.map(x => ({ actor: p, type: 'summon', id: x.s.id, all: true, side: 'enemy', targets: foes }));
      if (!(o.hades && pick[0].s.id === 'hades')) acts.reverse();
      return acts.length > 1 ? { actor: p, type: 'multi', list: acts } : acts[0];
    }
    // the summoner is out of MP (and nothing to Mime): a Turbo Ether / Elixir to start the chain again
    if (sums.length && !summonsOf(p, p.mp).length) { const it = ['turbo_ether', 'elixir'].find(inv); if (it) return item(it, [p]); }
    // (o.wait) a teammate can start the chain, or Mime it: wait rather than attack (or revive, heal...)
    if (o.wait && allies.some(x => x !== p && x.alive && (summonsOf(x).length || canMime(x)))) return { actor: p, type: 'wait', frames: 15 };
    return null;
  };
  // installed over the tactician once (the chocobo driver wraps it the same way)
  // ['battle', { l5gate: true, learn: [...], manipulate: {...} }]: L5 Death kills whoever's level is a
  // multiple of 5, and an Enemy Skill is only learned when it lands: it stays on the learn list only while
  // an Enemy Skill holder has such a level and someone else doesn't (to win the fight); otherwise the
  // Parasites are fought like any other enemy instead of being spared for it
  // (the master Enemy Skill materia is the one that must learn it, R.eskillMaster: its holder's level counts.) And
  // Pandora's Box comes first: it is a Dragon Zombie's final attack, once per game, and needs 110 MP, so while the
  // master copy lacks it a Dragon Zombie isn't spared for its Shadow Flare (100 MP a cast: three would leave too
  // little); once it is known, the later Dragon Zombies are
  function l5Gate(battle) {
    const o = R.battleOpts; if (!o || !o.l5gate || !battle || !battle.party) return;
    const alive = battle.party.filter(x => x.alive && !x.hidden), mm = R.eskillMaster();
    const holds = (x) => x.eskillMateria && x.eskillMateria.length && (!mm || x.eskillMateria.includes(mm) || !alive.some(y => (y.eskillMateria || []).includes(mm)));
    // (and nobody else it would kill: two members down at once with a Parasite pack still up lost a test run)
    const bare = (x) => x.level % 5 === 0 && !(x.immuneTo && x.immuneTo('death'));
    const ok = alive.some(x => bare(x) && holds(x)) && alive.filter(bare).length === 1 && alive.length > 1;
    const pandoraFirst = !R.masterKnows('pandoras_box') && battle.enemies.some(e => e.id === 'dragon_zombie');
    const all = o._l5all || (o._l5all = [].concat(o.learn || []));
    const want = all.filter(e => (ok || e !== 'l5_death') && (!pandoraFirst || e !== 'shadow_flare'));
    if ((o.learn || []).length === want.length) return;
    o.learn = want.slice();
    if (isObj(o.manipulate)) o.manipulate = Object.assign({}, o.manipulate, { learn: want.slice() });
  }
  // can L5 Death be learned by this party right now? (see l5Gate): an Enemy Skill holder whose level is a
  // multiple of 5 and whose gear doesn't ward off Death (Safety Bit, Ribbon...), and someone else it misses
  const U = FF7.util;
  const deathProof = (c) => ['accessory', 'armor'].some(k => { const f = c[k] && U.findItem(c[k]); return !!(f && (f.def.statusDef || []).includes('death')); });
  const hasEsk = (c) => FF7.sys.materia.equippedList(c).some(m => m.id === 'enemy_skill');
  const hasMaster = (c) => { const mm = R.eskillMaster(); return mm ? FF7.sys.materia.equippedList(c).includes(mm) : hasEsk(c); };
  R.c12bL5ok = function () {
    const act = FF7.sys.party.active().filter(c => c.hp > 0), bare = (c) => c.level % 5 === 0 && !deathProof(c);
    return act.some(c => bare(c) && hasMaster(c)) && act.filter(bare).length === 1 && act.length > 1;
  };
  // ['c12b_l5level', { max }]: while no Enemy Skill holder's level is a multiple of 5 (so L5 Death can't be
  // learned), fight the random battles here (as c12b_learn) until one's is: a level or two more usually does it
  O.c12b_l5level = function* (o = {}) {
    const lvlOk = () => { const act = FF7.sys.party.active().filter(c => c.hp > 0); return act.some(c => c.level % 5 === 0) && act.some(c => c.level % 5 !== 0); };
    if (R.masterKnows('l5_death') || R.c12bL5ok()) return true;
    if (lvlOk()) return yield* O.c12b_l5prep();
    let b0 = R.stats.battles, lastB = R.frames, fights = 0; const st = { side: 0 };
    while (!lvlOk() && fights < (o.max || 20)) {
      if (R.frames - lastB > 20000) return 'l5level: no battles here (' + R.where() + ')';
      if (R.stats.battles !== b0) { b0 = R.stats.battles; lastB = R.frames; fights++; yield* O.heal({ below: 0.5 }); continue; }
      const r = yield* paceStep(st); if (r !== true) return 'l5level: ' + r;
    }
    if (lvlOk()) { R.say('l5level: ' + FF7.sys.party.active().map(c => c.id + ' ' + c.level).join(', ')); return yield* O.c12b_l5prep(); }
    else R.note('l5level: no Enemy Skill holder at a level L5 Death hits after ' + fights + ' battles on ' + R.where());
    return true;
  };
  // ['c12b_l5prep']: the party member who could learn L5 Death hands a Death-warding accessory to one
  // whose level it can't touch (the Equip screen), as a player would before manipulating a Parasite
  O.c12b_l5prep = function* () {
    if (R.masterKnows('l5_death') || R.c12bL5ok()) return true;
    // (the master Enemy Skill materia onto a member whose level L5 Death hits - one with no Death ward first)
    const lv5 = FF7.sys.party.active().filter(c => c.hp > 0 && c.level % 5 === 0).sort((a, b) => deathProof(a) - deathProof(b))[0];
    if (lv5 && !hasMaster(lv5)) yield* R.mat.ensureMaster(lv5.id);
    if (R.c12bL5ok()) return true;
    const act = FF7.sys.party.active(), t = act.find(c => c.level % 5 === 0 && hasMaster(c) && deathProof(c));
    const other = act.find(c => c !== t && c.level % 5 !== 0);
    if (t && other && t.accessory) {
      const acc = t.accessory, oacc = other.accessory;
      let r = yield* O.equip(t.id, 'accessory', null); if (r !== true) return r;
      r = yield* O.equip(other.id, 'accessory', acc); if (r !== true) return r;
      if (oacc) { const f = U.findItem(oacc); if (!(f && (f.def.statusDef || []).includes('death'))) yield* O.equip(t.id, 'accessory', oacc); }
    }
    // (the others at a level it hits: a Safety Bit each - from the bag, or off a member it can't touch)
    for (const c of FF7.sys.party.active()) {
      if (c.level % 5 !== 0 || hasMaster(c) || deathProof(c)) continue;
      const st = FF7.state, spare = st.members.map(id => st.chars[id]).find(x => x && x !== c && x.accessory === 'safety_bit' && (x.level % 5 !== 0 || !FF7.sys.party.active().includes(x)));
      if (!FF7.sys.inv.has('safety_bit') && !spare) break;
      const r = yield* O.equip(c.id, 'accessory', 'safety_bit'); if (r !== true) R.note('l5prep: ' + r);
    }
    return true;
  };
  // ['c12b_l5', { rounds, max, levelMax }]: L5 Death, round after round until the master Enemy Skill materia has it: a
  // level more here while nobody's level suits (c12b_l5level: the master onto the one it can kill, Safety Bits on the
  // others it could), the party topped up, then the fights here while that holds (a level-up ends a round)
  O.c12b_l5 = function* (o = {}) {
    for (let round = 0; round < (o.rounds || 4) && !R.masterKnows('l5_death'); round++) {
      let r = yield* O.c12b_l5level({ max: o.levelMax || 24 }); if (r !== true) return r;
      if (!R.c12bL5ok()) continue;
      yield* O.heal({ below: 0.9, mp: 0.5, elixir: true });
      r = yield* O.c12b_learn(['l5_death'], { max: o.max || 12, while: () => R.c12bL5ok(), final: true }); if (r !== true) return r;
    }
    R.note('E.Skill l5_death ' + (R.masterKnows('l5_death') ? 'learned' : 'not learned') + ' (' + FF7.sys.party.active().map(c => c.name + ' ' + c.level).join(', ') + ')');
    return true;
  };
  // ['c12b_rouletteprep']: Roulette (a Death Dealer's, Manipulated) is a death spell on a random target, learned only
  // when it lands: the holder of the master Enemy Skill materia hands a Death-warding accessory (Safety Bit, Ribbon...)
  // to a member who has none - as for L5 Death - while the master copy lacks it
  O.c12b_rouletteprep = function* () {
    if (R.masterKnows('roulette')) return true;
    const act = FF7.sys.party.active(), t = act.find(c => hasMaster(c) && deathProof(c));
    const other = act.find(c => c !== t && !deathProof(c));
    if (!t || !other || !t.accessory || !U.findItem(t.accessory) || !(U.findItem(t.accessory).def.statusDef || []).includes('death')) return true;
    const acc = t.accessory, oacc = other.accessory;
    let r = yield* O.equip(t.id, 'accessory', null); if (r !== true) return r;
    r = yield* O.equip(other.id, 'accessory', acc); if (r !== true) return r;
    if (oacc) { const f = U.findItem(oacc); if (!(f && (f.def.statusDef || []).includes('death'))) yield* O.equip(t.id, 'accessory', oacc); }
    return true;
  };
  if (!R._c12bTactic) {
    R._c12bTactic = true;
    const base = R.tactic;
    R.tactic = function (battle, p) {
      try { l5Gate(battle); } catch (e) { R.note('l5gate: ' + e.message); }
      const w = R.battleOpts && R.battleOpts.weapon;
      if (w && p && p.isParty) {
        try { const a = R.c12bWeaponTactic(battle, p, isObj(w) ? w : {}); if (a) return a; } catch (e) { R.note('weapon tactic: ' + e.message); }
      }
      return base.call(R, battle, p);
    };
  }

  // ['battle', { koAllies: [ids] }]: FF7's Ruby WEAPON set-up: in a random battle the party knocks out the
  // listed members itself (Attack on them; nobody heals or revives them), then finishes the fight. They
  // stay KO'd afterwards, as in FF7, for the next fight.
  function koTactic(battle, p) {
    const o = R.battleOpts; if (!o || !o.koAllies || !p.isParty || battle.enemies.some(e => e.boss)) return null;
    const want = [].concat(o.koAllies), victims = battle.party.filter(x => want.includes(x.id) && x.alive && !x.hidden);
    if (!victims.length) return null;
    // (only while someone who stays up is standing: otherwise it would be the whole party)
    if (!battle.party.some(x => x.alive && !x.hidden && !want.includes(x.id))) return null;
    if (want.includes(p.id) && victims.length === 1 && victims[0] === p) return { actor: p, type: 'defend' };
    const t = victims.find(x => x !== p) || victims[0];
    return { actor: p, type: 'attack', targets: [t], side: 'ally' };
  }
  // ['battle', { sadden: [ids] }]: in a random battle a Tranquilizer on each listed member (FF7's Sadness:
  // 30% less damage taken; it outlasts the battle, until a Tent, an Inn or a Remedy): for Emerald WEAPON
  function saddenTactic(battle, p) {
    const o = R.battleOpts; if (!o || !o.sadden || !p.isParty || battle.enemies.some(e => e.boss)) return null;
    if (!FF7.sys.inv.count('tranquilizer') || battle.queue.some(q => q.item === 'tranquilizer')) return null;
    const want = [].concat(o.sadden), t = battle.party.find(x => want.includes(x.id) && x.alive && !x.hidden && !x.has('sadness'));   // (on Fury it cures that first)
    return t ? { actor: p, type: 'item', item: 'tranquilizer', targets: [t], side: 'ally' } : null;
  }
  if (!R._c12bKo) {
    R._c12bKo = true;
    const baseTactic2 = R.tactic;
    R.tactic = function (battle, p) {
      try { const a = koTactic(battle, p) || saddenTactic(battle, p); if (a) return a; } catch (e) { R.note('koAllies / sadden: ' + e.message); }
      const o = R.battleOpts;
      // (no Phoenix Down, Life or Megalixir for the ones knocked out on purpose)
      if (o && o.koAllies && p && p.isParty) {
        const out = [].concat(o.koAllies), hide = battle.party.filter(x => out.includes(x.id) && x.dead);
        if (hide.length) {
          const view = Object.create(battle); view.party = battle.party.filter(x => !hide.includes(x));
          return baseTactic2.call(R, view, p);
        }
      }
      return baseTactic2.call(R, battle, p);
    };
  }

  // ================================================================== world helpers
  const LANDABLE = 'gsdnwxpch';
  const wmod = (a, n) => ((a % n) + n) % n;
  const wtile = (x, y) => { const D = R.worldD(); return D.rows[wmod(y, D.h)][wmod(x, D.w)]; };
  const isEntry = (x, y) => !!R.entries()[wmod(x, R.worldD().w) + ',' + wmod(y, R.worldD().h)];
  // aboard the Highwind (from anywhere on the world map: on foot, on a chocobo, in a boat)
  function* aboard() {
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
    const ws = R.worldScene(); if (ws && ws.vehicle === 'highwind') return true;
    if (ws && ws.vehicle === 'chocobo') return yield* R.boardVehicle('highwind');
    if (R.ops.c10_boardAirship) return yield* R.ops.c10_boardAirship();
    return yield* R.boardVehicle('highwind');
  }
  R.c12bAboard = aboard;
  // ['c12b_fly', x, y, { land, ride }]: the Highwind to that tile (and down on the landing tile nearest it,
  // on foot unless ride)
  O.c12b_fly = function* (x, y, o = {}) {
    let r = yield* aboard(); if (r !== true) return 'fly: ' + r;
    let tx = x, ty = y;
    if (o.land) {
      let best = null;
      for (let rad = 0; rad <= 6 && !best; rad++) for (let dy = -rad; dy <= rad && !best; dy++) for (let dx = -rad; dx <= rad && !best; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        if (LANDABLE.includes(wtile(x + dx, y + dy)) && !isEntry(x + dx, y + dy)) best = [x + dx, y + dy];
      }
      if (!best) return 'fly: nowhere to land near ' + x + ',' + y;
      [tx, ty] = best;
    }
    r = yield* R.fly(tx, ty);
    if (r !== true && r !== 'mapchanged') return 'fly: ' + r;
    yield* R.settle(4);
    if (o.land && R.worldScene() && R.worldScene().vehicle === 'highwind') yield* R.pressWorld('ok');
    // (landed in the saddle of a chocobo that flew along: down, on foot, unless o.ride)
    if (o.land && !o.ride && R.worldScene() && R.worldScene().vehicle === 'chocobo') yield* R.pressWorld('cancel');
    return true;
  };
  // ['c12b_sub', { dive }]: into the submarine: the Highwind down on the nearest land it can be walked to
  // from, then aboard (surfaced: Emerald WEAPON only notices a dived one)
  O.c12b_sub = function* (o = {}) {
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
    let ws = R.worldScene();
    if (!ws || ws.vehicle !== 'submarine') {
      const sub = FF7.state.world.vehicles.submarine; if (!sub) return 'sub: no submarine parked';
      let r = yield* aboard(); if (r !== true) return 'sub: ' + r;
      ws = R.worldScene();
      const spots = R.boardSpots(ws, 'submarine', sub);
      let land = null;
      for (let rad = 2; rad <= 10 && !land; rad++) for (let dy = -rad; dy <= rad && !land; dy++) for (let dx = -rad; dx <= rad && !land; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        const x = sub.x + dx, y = sub.y + dy;
        if (!LANDABLE.includes(wtile(x, y)) || isEntry(x, y)) continue;
        const reach = spots.filter(q => Math.hypot(q[0] - x, q[1] - y) > 2.4);
        if (reach.length && R.worldPath(ws, x, y, reach, null)) land = [x, y];
      }
      if (!land) return 'sub: nowhere to land near the submarine';
      r = yield* R.fly(land[0], land[1]); if (r !== true) return 'sub: ' + r;
      yield* R.pressWorld('ok');
      ws = R.worldScene(); if (ws && ws.vehicle === 'chocobo') { yield* R.pressWorld('cancel'); ws = R.worldScene(); }
      const hw = FF7.state.world.vehicles.highwind;
      const far = spots.filter(q => !hw || Math.hypot(q[0] - hw.x, q[1] - hw.y) > 2.4);
      r = yield* R.walkWorld(far.length ? far : spots); if (r !== true) return 'sub: ' + r;
      yield* R.pressWorld('ok');
      ws = R.worldScene();
      if (!ws || ws.vehicle !== 'submarine') return 'sub: could not get aboard the submarine';
    }
    if (!!o.dive !== !!ws.dived) {
      // (only over deep water: the submarine can't dive in the shallows)
      if (o.dive && !'OR'.includes(wtile(Math.floor(ws.px), Math.floor(ws.pz)))) {
        const x0 = Math.floor(ws.px), y0 = Math.floor(ws.pz), deep = [];
        for (let rad = 1; rad <= 12 && !deep.length; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === rad && 'OR'.includes(wtile(x0 + dx, y0 + dy))) deep.push([x0 + dx, y0 + dy]);
        if (!deep.length) return 'sub: no deep water nearby to dive';
        const r = yield* R.walkWorld(deep, { maxNodes: 200000 }); if (r !== true) return 'sub: ' + r;
      }
      yield* R.pressWorld('square');
      const w2 = R.worldScene();
      if (!w2 || !!w2.dived !== !!o.dive) return 'sub: could not ' + (o.dive ? 'dive' : 'surface') + ' here';
    }
    return true;
  };
  // ['c12b_ultimate']: the Ultimate WEAPON chase: the Highwind flies into it wherever it hovers ("Ram it!"),
  // until it falls over Cosmo Canyon
  O.c12b_ultimate = function* () {
    const vars = () => JSON.stringify([FF7.state.vars.c12b_ult_stage, FF7.state.vars.c12b_ult_fights, FF7.state.flags.c12b_ultimate_dead]);
    for (let n = 0; n < 16 && !FF7.state.flags.c12b_ultimate_dead; n++) {
      let r = yield* aboard(); if (r !== true) return 'ultimate: ' + r;
      yield* R.settle(4);
      const m = (FF7.story.c12b_weaponMarkers() || []).find(x => x.id === 'ultimate_weapon');
      if (!m) return 'ultimate: Ultimate WEAPON is nowhere to be seen';
      const v0 = vars();
      R.say('ultimate: to ' + m.x + ',' + m.y);
      R.choices.push({ a: 'Ram it', pc: 'ult' });
      r = yield* R.fly(m.x, m.y);
      yield* R.settle(10);
      R.choices = R.choices.filter(c => c.pc !== 'ult');
      if (r !== true && r !== 'mapchanged' && R.where() === 'world' && vars() === v0) return 'ultimate: ' + r;
      if (vars() === v0) { yield* R.fly(m.x + 8, m.y); yield* R.settle(4); }   // it didn't notice us: away and back
    }
    return FF7.state.flags.c12b_ultimate_dead ? true : 'ultimate: still flying after 16 passes';
  };
  // ['c12b_count', [endings], { max }]: random battles here (the world map) until the battle count ends in
  // one of those two-digit numbers (the Sleeping Man's lucky numbers)
  O.c12b_count = function* (ends, o = {}) {
    const ok = () => [].concat(ends).includes((FF7.state.battles || 0) % 100);
    const b0 = FF7.state.battles || 0;
    let side = 0, lastB = R.frames, seen = R.stats.battles;
    while (!ok()) {
      if ((FF7.state.battles || 0) - b0 > (o.max || 99)) return 'count: gave up';
      if (R.stats.battles !== seen) { seen = R.stats.battles; lastB = R.frames; yield* O.heal({ below: 0.5 }); continue; }
      if (R.frames - lastB > 20000) return 'count: no battles here';
      const ws = R.worldScene(); if (!ws) { yield; continue; }
      const x = Math.floor(ws.px), y = Math.floor(ws.pz), D = R.worldD();
      const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, b]) => R.worldCan(ws, ws.vehicle, a, b) && !isEntry(a, b));
      if (!pairs.length) return 'count: no room to pace';
      const r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true }); if (r !== true && r !== 'mapchanged') return 'count: ' + r;
    }
    R.say('count: battle ' + FF7.state.battles);
    return true;
  };
  // ['c12b_tile', x, y]: walk (or ride) onto a world tile; a step hook that takes the party somewhere
  // counts as arrival (['world', [x, y]] reports that as an error)
  O.c12b_tile = function* (x, y) {
    if (R.where() !== 'world') { const g = yield* R.gotoMap('world'); if (g !== true && g !== 'mapchanged') return g; yield* R.settle(3); }
    const r = yield* R.walkWorld([[x, y]], { anywhere: true });
    yield* R.settle(4);
    return r === true || r === 'mapchanged' ? true : 'tile: ' + r;
  };
  // ['c12b_fight', cond, { max }]: random battles here (the world map or a field map, pacing) until the
  // condition holds (e.g. enough battles for Lucrecia)
  O.c12b_fight = function* (cond, o = {}) {
    const b0 = FF7.state.battles || 0;
    let side = 0, lastB = R.frames, seen = R.stats.battles;
    while (!R.cond(cond)) {
      if ((FF7.state.battles || 0) - b0 > (o.max || 40)) return 'fight: gave up';
      if (R.stats.battles !== seen) { seen = R.stats.battles; lastB = R.frames; if (o.heal !== false) yield* O.heal({ below: 0.5 }); continue; }
      if (R.frames - lastB > 20000) return 'fight: no battles here';
      const fs = R.field(), ws = R.worldScene();
      if (fs) {
        const p = fs.player, keep = jumpTiles(fs, null);
        const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [p.tx + dx * 2, p.ty + dy * 2]).filter(([x, y]) => fs.P.walkable(x, y) && !R.exitAt(fs, x, y) && !keep.has(x + ',' + y));
        if (!pairs.length) return 'fight: no room to pace';
        const r = yield* R.walkField([pairs[side++ % pairs.length]], { anywhere: true, avoid: (x, y) => keep.has(x + ',' + y) }); if (r !== true && r !== 'mapchanged') return 'fight: ' + r;
      } else if (ws) {
        const x = Math.floor(ws.px), y = Math.floor(ws.pz);
        const pairs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx * 2, y + dy * 2]).filter(([a, c]) => R.worldCan(ws, ws.vehicle, a, c) && !isEntry(a, c));
        if (!pairs.length) return 'fight: no room to pace';
        const r = yield* R.walkWorld([pairs[side++ % pairs.length]], { anywhere: true, heal: o.heal }); if (r !== true && r !== 'mapchanged') return 'fight: ' + r;
      } else yield;
    }
    return true;
  };
  // ['c12b_chase', weaponId, { max }]: steer the (dived) submarine into a WEAPON roaming the sea floor
  O.c12b_chase = function* (id, o = {}) {
    const dead = () => id === 'emerald_weapon' && FF7.state.flags.c12b_emerald_dead;
    const D = R.worldD();
    for (let n = 0; n < (o.max || 30) && !dead(); n++) {
      const ws = R.worldScene(); if (!ws) { yield; continue; }
      const m = (FF7.story.c12b_weaponMarkers() || []).find(x => x.id === id);
      if (!m) return 'chase: no ' + id;
      const x0 = Math.floor(ws.px), y0 = Math.floor(ws.pz);
      const dist = Math.max(Math.abs(wmod(m.x - x0 + D.w / 2, D.w) - D.w / 2), Math.abs(wmod(m.y - y0 + D.h / 2, D.h) - D.h / 2));
      let r;
      if (dist <= 2) {                                  // too close for it to notice: back off first (it only reacts to an approach)
        const away = [];
        for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 5 && R.worldCan(ws, ws.vehicle, m.x + dx, m.y + dy)) away.push([m.x + dx, m.y + dy]);
        r = yield* R.walkWorld(away, { anywhere: true, maxNodes: 200000 });
      } else r = yield* R.walkWorld([[m.x, m.y]], { anywhere: true, maxNodes: 200000 });
      yield* R.settle(6);
      const w2 = R.worldScene();
      R.say('chase: ' + id + ' at ' + m.x + ',' + m.y + ', us at ' + (w2 ? Math.floor(w2.px) + ',' + Math.floor(w2.pz) + (w2.dived ? ' dived' : ' surfaced') : R.where()) + ' (' + r + ')');
    }
    return dead() ? true : 'chase: could not beat ' + id;
  };


  // ================================================================== the Disc 3 start profile
  // What the chapters before C12b leave behind (a synthetic start; the real route plays them): the
  // story flags C1-C11a set (from their map scripts, less the temporary ones), the id'd triggers of
  // their maps as fired, eight members at level ~62, the late Disc 2 gear, the materia an expert has by
  // then, and C12a's Gold chocobo in the stables (bred with Zeio Nuts). Documented in docs/RUNNER.md.
  const PRIOR_FLAGS = (
    'aeris_dead black_materia c10_backdoor c10_bridge_taken c10_briefing c10_carry_beaten c10_catastrophe ' +
    'c10_choco_fed c10_cloud_speech c10_condor_done c10_condor_funds c10_condor_hatched c10_condor_intro ' +
    'c10_condor_won c10_contain c10_core_guard c10_core_seen c10_corel_boarded c10_corel_crash c10_corel_done ' +
    'c10_corel_intro c10_corel_rested c10_corel_stopped c10_crazy_met c10_curse_ring c10_dog_gone c10_elixir ' +
    'c10_found_cloud c10_front_cleared c10_grunt_fight c10_hostages c10_in_space c10_key_broken c10_launched ' +
    'c10_lift_fight c10_ls_hub c10_ls_nibel c10_ls_reactor c10_ls_room c10_ls_station c10_ls_tower ' +
    'c10_mideel_arrived c10_mideel_quake c10_old_key c10_pad_seen c10_path_fight c10_rocket_hint c10_rt_intro ' +
    'c10_rude_beaten c10_shera_warn c10_squad_beaten c10_subhall_fight c10_train_first c10_ultima c10_uw_cannon ' +
    'c10_uw_done c10_uw_intro c11a_bahamut_zero c11a_base_seen c11a_capital_arrive c11a_capital_done c11a_clod_done ' +
    'c11a_coast_intro c11a_diamond_alert c11a_diamond_beaten c11a_diamond_done c11a_hojo_done c11a_hojo_met ' +
    'c11a_hojo_news c11a_hq_hpshout c11a_hq_seen c11a_hq_stairs_top c11a_hq_vending c11a_junction_seen c11a_key_dug ' +
    'c11a_landed c11a_need_key c11a_raid_started c11a_stairs_seen c11a_started c11a_turks_done c11a_turks_fought ' +
    'c11a_ug2_fell c1_barret_joined c1_bomb_set c1_bought_flower c1_bridge_seen c1_core_talk c1_door_open ' +
    'c1_elevator_talk c1_escape c1_flower_done c1_gate_open c1_intro_done c1_jessie_free c1_jessie_tip c1_out_msg ' +
    'c1_s8_intro c1_train_talk c2_air_buster_beaten c2_alarm c2_arrived c2_bar_intro c2_barret_stormed ' +
    'c2_basement_talk c2_biggs_talk c2_debrief c2_departed c2_door_open c2_drink c2_fell c2_hall_visit c2_hipotion ' +
    'c2_jessie_talk c2_jumped c2_landed c2_marlene_flower c2_md5_bomb c2_md5_hall c2_md5_in c2_md5_lift_talk ' +
    'c2_md5_panel c2_md5_vision c2_morning c2_pd_given c2_pickpocketed c2_pillar_seen c2_plate_in c2_promise ' +
    'c2_tifa_joined c2_train_caught c2_train_intro c2_trap c2_vent c2_wedge_talk c3_aeris_freed c3_aeris_rejoined ' +
    'c3_aps_beaten c3_back_done c3_back_scene c3_barrel_0 c3_barret_joined c3_barret_plan c3_biggs_talk c3_card_got ' +
    'c3_church_escape c3_church_intro c3_cologne_got c3_corneo_done c3_coupon_got c3_disguise_plan c3_dress_asked ' +
    'c3_dress_got c3_dressed c3_dressmaker_done c3_elmyra_met c3_elmyra_request c3_elmyra_story c3_fell_sewer ' +
    'c3_garden_talk c3_grief_done c3_hb_room_used c3_hb_seen c3_hb_tip c3_house_arrived c3_jessie_talk ' +
    'c3_kid_5gil_taken c3_kid_drawer c3_kid_turbo c3_lackey_intro c3_lackeys_beaten c3_landed c3_makeup_done ' +
    'c3_park_scene c3_pillar_arrive c3_plate_fallen c3_rafters_talk c3_reno_beaten c3_s6_talk c3_saw_no2 ' +
    'c3_sewer_intro c3_slept c3_snuck_out c3_swing_talk c3_tg_moved c3_tg_roof c3_tg_talk c3_tg_train1 c3_tgn_talk ' +
    'c3_tiara_got c3_tiara_quest c3_tifa_basement c3_tifa_found c3_to_wire c3_town_talk c3_tunnel_talk ' +
    'c3_turtle_flyer1 c3_vend_done c3_wedge_talk c3_wig_got c3_wig_quest c3_wire_done c3_wire_seen c3_wire_start ' +
    'c3_wm_arrived c4_59f_fight c4_60f_passed c4_63_terminal c4_arrived c4_back_door c4_bike c4_captured ' +
    'c4_chase_done c4_decided c4_domino_done c4_domino_met c4_escape_started c4_eskill c4_flyer_turtle2 ' +
    'c4_gunner_done c4_h0512_done c4_jail_door c4_jail_intro c4_jail_night c4_jail_out c4_jail_tifa c4_jenova_seen ' +
    'c4_keycard62 c4_keycard68 c4_lobby_fight c4_lobby_reunion c4_meeting_done c4_motorball_done c4_president_found ' +
    'c4_president_talk c4_ride_done c4_route_front c4_route_stairs c4_rufus_arrived c4_rufus_beaten c4_stairs_done ' +
    'c4_tank_empty c4_trail_68 c4_trail_intro c4_vending_bang c5a_arrived c5a_ether_a c5a_ether_clock c5a_ether_far ' +
    'c5a_fb_arrived c5a_fb_bridge c5a_fb_chase c5a_fb_days c5a_fb_door c5a_fb_end c5a_fb_fall c5a_fb_fire ' +
    'c5a_fb_fire_seen c5a_fb_fountain c5a_fb_library1 c5a_fb_library2 c5a_fb_mansion_in c5a_fb_mom c5a_fb_morning ' +
    'c5a_fb_night c5a_fb_path c5a_fb_piano c5a_fb_reactor c5a_fb_tifa c5a_fb_truck c5a_flashback_done ' +
    'c5a_guard_source c5a_mako_asked c5a_megalixir c5a_old_asked c5a_piano_jammed c5a_piano_tune c5a_story_start ' +
    'c5b_airport_arrived c5b_arrived c5b_bill_talked c5b_billy_talked c5b_bottomswell c5b_chocomog c5b_condor_fund ' +
    'c5b_condor_gate c5b_condor_joined c5b_disguised c5b_dolphin_jump c5b_engine_seen c5b_farm_arrived c5b_in_water ' +
    'c5b_jenova_birth c5b_junon_arrived c5b_junon_slept c5b_mine_entered c5b_parade_done c5b_phs_taken ' +
    'c5b_priscilla_saved c5b_sendoff_done c5b_ship_aeris c5b_ship_alarm c5b_ship_boarded c5b_ship_intro ' +
    'c5b_ship_red c5b_ship_tifa c5b_shiva c5b_tifa_talk c5b_turks_mine c5b_undisguised c5b_whistle c5b_yuffie_tranq ' +
    'c5b_zolom_seen c6a_arrived c6a_ball c6a_barret_left c6a_barret_rejoined c6a_barret_story c6a_bridge_down ' +
    'c6a_coates_talked c6a_costa_left c6a_done c6a_dyne_done c6a_framed c6a_gbike_prize c6a_hojo_talked ' +
    'c6a_jockey_intro c6a_johnny_met c6a_johnny_tifa c6a_junk_seen c6a_miner_talked c6a_mog_cleared c6a_mog_reward ' +
    'c6a_ncorel_arrival c6a_ncorel_ether c6a_nest c6a_oldman_talked c6a_prison_arrival c6a_race_explained ' +
    'c6a_race_intro c6a_race_started c6a_reactor_barret c6a_saw_saucer c6a_turtle_flyer3 c6a_umbrella ' +
    'c6a_villa_owned c6a_waterside_seen c6a_wizard_staff c6b_buggy_repaired c6b_candle_done c6b_candle_intro ' +
    'c6b_candle_start c6b_cosmo_arrived c6b_done c6b_elixir c6b_farewell c6b_gi_asked c6b_gi_intro c6b_gi_nattak ' +
    'c6b_gi_oil_seen c6b_gi_open c6b_gi_secret c6b_gi_web c6b_gongaga_arrived c6b_magic_source c6b_met_bugen ' +
    'c6b_planetarium c6b_reactor_scene c6b_reactor_seen c6b_seto c6b_titan c6b_turks_done c6b_turtle_flyer4 ' +
    'c6b_turtle_flyer5 c6b_village_seen c6b_wasteland_seen c6b_zack_friends c6b_zack_heard c7_bronco_seen ' +
    'c7_cid_met c7_cloud_house c7_clue1 c7_clue2 c7_clue3 c7_clue4 c7_coffin_unlocked c7_dachao_fire_out ' +
    'c7_dachao_seen c7_fountain c7_inn_talk c7_keeper_dead c7_mansion_in c7_mansion_passage c7_nibel_arrived ' +
    'c7_nibel_base c7_nibel_bridge c7_nibel_ladder c7_nibel_ledge_hint c7_nibel_path c7_pagoda_done c7_palmer_done ' +
    'c7_piano_gil c7_piano_tune c7_reactor_seen c7_rocket_arrived c7_safe_open c7_seph_library c7_shera_met c7_tea ' +
    'c7_tifa_room c7_tower_talk c7_turtle_flyer6 c7_turtle_prize c7_turtle_sign c7_vincent_1 c7_vincent_2 ' +
    'c7_wq_bell c7_wq_godo c7_wq_kidnap c7_wq_mpabsorb c7_wq_pot c7_wq_pubturks c7_wq_rapps c7_wq_screen ' +
    'c7_wq_shrine c7_wq_stolen c7_wq_town c7_wq_trap c7_wq_turks c7_wutai_arrived c7_wutai_done c7_yoshiyuki ' +
    'c8_altar_scene c8_ancient_room c8_bone_aeris c8_bone_seen c8_boulders_done c8_boulders_seen c8_bronco_boarded ' +
    'c8_cait_spy c8_capital_arrived c8_capital_slept c8_cave_seen c8_center_seen c8_chase2 c8_clock_seen ' +
    'c8_crystal_seen c8_date_done c8_demons_gate c8_dig_explained c8_disc2_speech c8_forest_awake c8_forest_seen ' +
    'c8_gate_solved c8_gate_started c8_gs_back c8_keystone_bonus c8_keystone_got c8_keystone_stolen c8_kjata_seen ' +
    'c8_maze_intro c8_model_seen c8_north_seen c8_pool_vision c8_red_dragon c8_red_dragon_seen c8_room1_battle ' +
    'c8_room3_battle c8_room_elixir c8_ropeway_broken c8_sephiroth_mural c8_shell_seen c8_temple_arrived ' +
    'c8_temple_done c8_trunk_seen c8_tseng c8_valley_out c8_valley_seen c8_woke c8_ws_met c8_ws_paid ' +
    'c9_airship_seen c9_arrived c9_attack_squad c9_barret_free c9_base_seen c9_boarded c9_bolt_seen c9_boulder ' +
    'c9_bridge_seen c9_cannon_seen c9_cave1_seen c9_cave_done c9_center c9_cliff1_seen c9_climb_help ' +
    'c9_corridor_seen c9_dock_guard c9_elena c9_elena_dodged c9_escaped c9_escort c9_first_takeoff c9_floe_fell ' +
    'c9_floes_seen c9_gas_stopped c9_gas_strapped c9_gast_seen c9_gust_seen c9_hall_seen c9_holzoff_met ' +
    'c9_hotspring c9_hw_meeting c9_icicle_warned c9_icicles_down c9_illusion c9_jenova_death c9_junon_woke c9_key ' +
    'c9_landed c9_mapwall c9_maze_seen c9_press c9_reporter c9_rescued c9_rim_seen c9_rode c9_scarlet c9_schizo ' +
    'c9_slap_done c9_snow_beaten c9_snow_met c9_snowboard_tips c9_snowfield_seen c9_spring_seen c9_tapes_talk ' +
    'c9_walk_seen c9_wall_blasted c9_wind_seen cait_joined chocobo_lure cid_joined cloud_returned disc2 disc3 ' +
    'has_bronco has_buggy has_highwind has_phs has_submarine holy huge_materia_condor huge_materia_corel ' +
    'huge_materia_done huge_materia_rocket huge_materia_underwater keystone left_midgar meteor redxiii_joined ' +
    'vincent_joined ' +
    '').trim().split(/\s+/);
  R.c12bPriorFlags = function () {
    const out = PRIOR_FLAGS.slice();
    for (const id in FF7.maps) {
      if (/^(side_|hw_|cave_|final_)/.test(id)) continue;
      // (not C11 / C12's own, nor Zack's last stand: js/maps/extra/flashbacks.js plays it in C12b's mansion basement)
      (FF7.maps[id].triggers || []).forEach(t => { if (t.id && t.once !== false && !/^(c1[12]|zk_)/.test(t.id)) out.push('trig_' + id + '_' + t.id); });
    }
    return out;
  };
  const MEMBERS = ['cloud', 'barret', 'tifa', 'redxiii', 'yuffie', 'caitsith', 'vincent', 'cid'];
  // E.Skills the story chapters teach (Disc 1-2 areas), on the first two Enemy Skill materia
  // materia found late (C12a / C12b) start at level 1
  const FRESH = ['knights_of_round', 'mime', 'w_summon', 'hp_mp', 'quadra_magic', 'hades', 'typhoon', 'slash_all', 'double_cut',
    'final_attack', 'master_magic', 'master_summon', 'master_command', 'mega_all', 'counter', 'magic_counter', 'w_magic', 'shield', 'hp_absorb', 'full_cure', 'bahamut_zero'];
  const ESK_OLD = ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'flame_thrower', 'laser', 'matra_magic',
    'beta', 'aqualung', 'trine', 'magic_breath', 'question', 'death_sentence', 'bad_breath', 'death_force'];
  // what the three Enemy Skill materia know at C12a's end (????, Goblin Punch and the Disc 3 ones still to learn)
  const ESK_C12A = ['frog_song', 'l4_suicide', 'magic_hammer', 'white_wind', 'big_guard', 'death_force', 'flame_thrower', 'laser', 'matra_magic',
    'bad_breath', 'beta', 'aqualung', 'trine', 'magic_breath', 'death_sentence'];
  // o: { level, party, world | map + entry, flags: [...more], vars, items, keyItems, gil, equip, materia, stock, eskills: [[...], ...], after(st) }
  R.c12bProfile = function (o = {}) {
    const lv = o.level || 62, levels = {};
    MEMBERS.forEach(id => { levels[id] = (o.levels && o.levels[id]) || lv; });
    const prof = {
      members: MEMBERS.slice(), party: o.party || ['cloud', 'tifa', 'cid'], levels,
      vars: Object.assign({ c12a_stables: 2, chocobos: [
        { id: 1, name: 'Teioh', sex: 'male', rating: 'great', color: 'gold', speed: 120, maxSpeed: 140, stamina: 700, accel: 60, intel: 60, coop: 60, races: 12, run: 14, class: 'S', born: 0, readyAt: 0 },
        { id: 2, name: 'Kuro', sex: 'female', rating: 'great', color: 'black', speed: 110, maxSpeed: 130, stamina: 650, accel: 50, intel: 50, coop: 50, races: 9, run: 12, class: 'S', born: 0, readyAt: 0 },
      ], c12a_choco_seq: 2 }, o.vars || {}),
      items: o.exact ? Object.assign({}, o.items) : Object.assign({ megalixir: 6, elixir: 16, x_potion: 25, hi_potion: 30, phoenix_down: 35, turbo_ether: 8, ether: 20, hero_drink: 3,
        remedy: 12, tent: 5, dazers: 2, spider_web: 3, guide_book: 1, zeio_nut: 2, sylkis_greens: 10,
        // accessories from the story chapters (Gaea's Cliff, Midgar, Junon, Gongaga, the Gold Saucer)
        safety_bit: 1, star_pendant: 2, peace_ring: 1, fairy_ring: 1, silver_glasses: 1, champion_belt: 1, fury_ring: 1 }, o.items || {}),
      keyItems: o.keyItems || [],
      gil: o.gil != null ? o.gil : 180000,
      equip: Object.assign({
        cloud: { weapon: 'ragnarok', armor: 'mystile', accessory: 'ribbon' },
        tifa: { weapon: 'master_fist', armor: 'aurora_armlet', accessory: 'ribbon' },
        cid: { weapon: 'venus_gospel', armor: 'escort_guard', accessory: 'sprint_shoes' },
        barret: { weapon: 'missing_score', armor: 'fourth_bracelet' }, caitsith: { weapon: 'hp_shout', armor: 'wizard_bracelet' },
        redxiii: { weapon: 'behemoth_horn', armor: 'dragon_armlet' }, yuffie: { weapon: 'rising_sun', armor: 'fire_armlet' },
        vincent: { weapon: 'long_barrel_r', armor: 'bolt_armlet' },
      }, o.equip || {}),
      materia: o.materia || {
        cloud: ['bahamut_zero', 'w_summon', 'enemy_skill', 'hp_plus', 'restore', 'all', 'magic_plus', 'hp_plus'],
        tifa: ['enemy_skill', 'steal', 'time', 'hp_plus', 'revive', 'heal'],
        cid: ['enemy_skill', 'morph', 'hp_plus', 'restore', 'all', 'contain', 'mp_plus', 'mega_all'],
      },
      stockIds: (o.stock || ['enemy_skill', 'manipulate', 'sense', 'throw', 'deathblow', 'w_item', 'fire', 'ice', 'lightning', 'earth',
        'gravity', 'poison', 'seal', 'mystify', 'transform', 'exit', 'destruct', 'barrier', 'comet', 'ultima', 'full_cure',
        'restore', 'neo_bahamut', 'bahamut', 'phoenix', 'alexander', 'kujata', 'odin', 'leviathan', 'titan', 'ramuh', 'ifrit',
        'shiva', 'choco_mog', 'counter_attack', 'cover', 'long_range', 'pre_emptive', 'enemy_away', 'enemy_lure',
        'chocobo_lure', 'exp_plus', 'gil_plus', 'luck_plus', 'speed_plus', 'mp_turbo', 'mp_absorb', 'hp_absorb', 'added_effect',
        'elemental', 'counter', 'magic_counter', 'sneak_attack', 'added_cut', 'steal_as_well', 'all']),
      phs: true, menu: true, disc: 3,
      vehicles: o.vehicles || { highwind: { x: 296, y: 165 }, submarine: { x: 224, y: 184 } },   // (the submarine by the Junon shore)
    };
    // (the materia data loads after the plan files: the list is checked when the start is applied; an entry
    // is an id or, in exact profiles, [id, ap, eskills])
    const mat = (m) => (Array.isArray(m) ? (m[2] ? { id: m[0], ap: m[1] || 0, eskills: m[2] } : { id: m[0], ap: m[1] || 0 }) : m);
    if (o.exact) for (const id in prof.materia) prof.materia[id] = prof.materia[id].map(m => (m ? mat(m) : null));
    Object.defineProperty(prof, 'stock', { enumerable: true, get: () => prof.stockIds.map(mat).filter(m => FF7.data.materia[m.id || m]) });
    const extraFlags = o.flags || [], noFlags = new Set(o.noFlags || []);
    Object.defineProperty(prof, 'flags', { enumerable: true, get: () => R.c12bPriorFlags().concat(['disc3', 'has_highwind', 'has_submarine', 'yuffie_joined', 'c12a_bill_d2', 'c12a_stalls_seen'], extraFlags).filter(f => !noFlags.has(f)) });
    // runs inside R.applyStart once the characters and their materia exist (it reads p.world / p.map
    // last): the Enemy Skills already learned, full HP / MP
    const place = o.map ? { map: o.map, entry: o.entry } : { world: o.world || { x: 296, y: 165, vehicle: 'highwind' } };
    const after = function () {
      const st = FF7.state;
      if (o.exact) {
        // a snapshot of a real chapter end: materia AP and Enemy Skills as given, the Limit Breaks as listed
        for (const id in (o.limits || {})) if (st.chars[id]) st.chars[id].limitsKnown = o.limits[id].slice();
        if (o.gp != null) st.gp = o.gp;
        if (o.battles != null) st.battles = o.battles;
        if (o.after) o.after(st);
        Object.values(st.chars).forEach(c => FF7.sys.stats.recalc(c));
        FF7.sys.party.healAll();
        return;
      }
      const eskills = o.eskills || [ESK_OLD, ESK_OLD.slice(0, 8)];
      const all = st.materia.concat(...Object.values(st.chars).map(c => FF7.sys.materia.equippedList(c)));
      all.filter(m => m && m.id === 'enemy_skill').forEach((m, i) => { m.eskills = (eskills[i] || []).slice(); });
      // grown materia: level 3 (or mastered when it has fewer levels), the Disc 3 finds and o.matLevels as given
      all.forEach(m => {
        const d = m && FF7.data.materia[m.id]; if (!d || !d.ap || !d.ap.length) return;
        const want = (o.matLevels && o.matLevels[m.id]) || (FRESH.includes(m.id) ? 1 : 3), lv = Math.min(want, d.ap.length + 1);
        m.ap = lv <= 1 ? 0 : d.ap[lv - 2];
      });
      // Limit Breaks: levels 1-3, and the level 4 manuals the story chapters hand out (Omnislash: C12a's
      // Battle Square; Catastrophe, All Creation, Cosmo Memory); Final Heaven, Highwind, Chaos come here
      const MINE = ['final_heaven', 'highwind', 'chaos'];
      Object.values(st.chars).forEach(c => { for (const id in FF7.data.limits) { const L = FF7.data.limits[id]; if (L.char === c.id && !MINE.includes(id) && !c.limitsKnown.includes(id)) c.limitsKnown.push(id); } });
      (o.limits4 || []).forEach(id => { const L = FF7.data.limits[id], c = L && st.chars[L.char]; if (c && !c.limitsKnown.includes(id)) c.limitsKnown.push(id); });
      if (o.after) o.after(st);
      Object.values(st.chars).forEach(c => FF7.sys.stats.recalc(c));
      FF7.sys.party.healAll();
    };
    if (place.map) { prof.entry = place.entry; Object.defineProperty(prof, 'map', { enumerable: true, get: () => { after(); return place.map; } }); }
    else Object.defineProperty(prof, 'world', { enumerable: true, get: () => { after(); return place.world; } });
    return prof;
  };

  // ================================================================== start profile and plan
  // C12a's end as the chained route leaves it (its c12a_end checkpoint, the poorer of two runs): level ~43-50,
  // ~15,700 gil, the Disc 2 finds (Ragnarok, Mystile, God's Hand, Max Ray, Bahamut ZERO, Ultima...), Omnislash,
  // W-Summon, the Chocobo Sage's empty Enemy Skill materia, a Gold chocobo in the stables, flying the Highwind
  // after the morning scene. What the real route from C1 leaves undone is left undone here too: the Pagoda
  // (C7 skipped it: no Leviathan, no All Creation), the Weapon Seller's Mythril (C8), the Midgar Turks (C11a).
  R.starts.c12b = R.c12bProfile({
    exact: true, party: ['cloud', 'tifa', 'barret'], world: { x: 298, y: 166, vehicle: 'highwind' },
    levels: { cloud: 50, barret: 48, redxiii: 44, yuffie: 43, caitsith: 42, vincent: 43, cid: 48, tifa: 48 },
    equip: {
      cloud: { weapon: 'ragnarok', armor: 'aegis_armlet', accessory: 'ribbon' },
      barret: { weapon: 'max_ray', armor: 'imperial_guard', accessory: 'fairy_ring' },
      redxiii: { weapon: 'crystal_comb', armor: 'warrior_bangle', accessory: 'star_pendant' },
      yuffie: { weapon: 'hawkeye', armor: 'gold_armlet', accessory: 'silver_glasses' },
      caitsith: { weapon: 'red_m_phone', armor: 'gold_armlet', accessory: 'headband' },
      vincent: { weapon: 'lariat', armor: 'silver_armlet', accessory: 'peace_ring' },
      cid: { weapon: 'venus_gospel', armor: 'crystal_bangle', accessory: null },
      tifa: { weapon: 'gods_hand', armor: 'mystile', accessory: 'ribbon' },
    },
    materia: {
      cloud: [['lightning', 35018], ['all', 23132], ['restore', 40057], ['all', 23157], ['barrier', 32657], ['revive', 55360], ['chocobo_lure', 7357], ['time', 25657], ['counter_attack', 28132], ['cover', 28132]],
      barret: [['restore', 29182], ['all', 20127], ['ice', 30657], ['all', 20127], ['steal', 28657], ['enemy_skill', 0, ESK_C12A], ['bahamut_zero', 10657], ['neo_bahamut', 25182], ['hp_plus', 38132], ['magic_plus', 27657], ['mp_plus', 28657], ['odin', 34182]],
      redxiii: [null, null, null, null, null, ['ice', 20525], ['kujata', 23525], null, null, ['seal', 11525]],
      yuffie: [null, ['throw', 12000], ['poison', 6000], ['mystify', 8000], null, ['ifrit', 7000], null, null, null, null],
      caitsith: [['manipulate', 9000], ['transform', 9000], ['titan', 16000], ['ramuh', 11000], ['exit', 5000], ['destruct', 7000], null, null, null, null],
      vincent: [['morph', 20000], ['alexander', 26000], ['choco_mog', 15000], ['pre_emptive', 9000], ['hp_absorb', 30000], ['mp_absorb', 30000], null, null, null, null],
      cid: [['restore', 28470], null, ['lightning', 22470], null, null, ['steal', 44470], null, null, null, null, null, ['gravity', 17000], ['ultima', 5475], ['enemy_skill', 0, ESK_C12A]],
      tifa: [['elemental', 27132], ['lightning', 19132], ['enemy_skill', 0, ESK_C12A], ['bahamut', 36602], ['mp_plus', 28132], ['mega_all', 38132], ['deathblow', 25132], ['phoenix', 16132], ['heal', 29132], ['chocobo_lure', 4357]],
    },
    stock: [['fire', 19525], ['enemy_away', 0], ['enemy_lure', 0], ['added_cut', 0], ['fire', 3000], ['shiva', 16000], ['earth', 2000], ['contain', 0], ['sense', 12000], ['fire', 20000],
      ['added_effect', 3525], ['long_range', 21385], ['earth', 8385], ['long_range', 20525], ['luck_plus', 17050], ['speed_plus', 17050], ['hp_plus', 28000], ['w_item', 0], ['revive', 0],
      ['enemy_skill', 0, []], ['restore', 0], ['lightning', 0], ['w_summon', 0]],
    items: { talisman: 1, earring: 1, protect_vest: 1, fury_ring: 1, potion: 13, hi_potion: 22, ether: 19, turbo_ether: 12, elixir: 8, megalixir: 3, phoenix_down: 16, remedy: 10,
      antidote: 6, soft: 5, maidens_kiss: 5, echo_screen: 4, eye_drop: 5, hyper: 4, tranquilizer: 4, curse_ring: 1, diamond_bangle: 3, rune_armlet: 1, gold_armlet: 1, s_mine: 2,
      grenade: 2, battle_trumpet: 1, shinra_beta: 2, scimitar: 1, dragon_claw: 1, partisan: 1, rising_sun: 1, power_wrist: 1, starlight_phone: 1, guard_source: 1, power_source: 2,
      magic_source: 1, mind_source: 2, behemoth_horn: 1, pile_banger: 1, master_fist: 1, grow_lance: 1, hp_shout: 1, speed_source: 1, am_cannon: 1, organics: 1, missing_score: 1,
      curiel_greens: 13, lasan_nut: 5, tissue: 17, sprint_shoes: 1, zeio_nut: 1, mimett_greens: 2, flayer: 1 },
    keyItems: ['huge_materia_corel', 'huge_materia_condor', 'leviathan_scales', 'huge_materia_underwater', 'huge_materia_rocket'],
    gil: 15717, gp: 720, battles: 209,
    limits: { cloud: ['braver', 'cross_slash', 'blade_beam', 'climhazzard', 'meteorain', 'finishing_touch', 'omnislash'],
      barret: ['big_shot', 'mindblow', 'grenade_bomb', 'hammerblow', 'satellite_beam', 'ungarmax', 'catastrophe'],
      redxiii: ['sled_fang', 'lunatic_high', 'blood_fang', 'stardust_ray', 'howling_moon', 'earth_rave'],
      yuffie: ['greased_lightning', 'clear_tranquil', 'landscaper', 'bloodfest', 'gauntlet', 'doom_of_the_living'],
      caitsith: ['dice', 'slots'], vincent: ['galian_beast', 'death_gigas', 'hellmasker'],
      cid: ['boost_jump', 'dynamite', 'hyper_jump', 'dragon', 'dragon_dive', 'big_brawl'],
      tifa: ['beat_rush', 'somersault', 'waterkick', 'meteodrive', 'dolphin_blow', 'meteor_strike'] },
    vehicles: { highwind: { x: 298, y: 166 }, submarine: { x: 233, y: 168 } },
    vars: { chocobo_pen: [], c12a_stables: 5, c12a_sage_next: 103, c12a_choco_seq: 12, c12a_sage_stage: 1, chocobos: [
      { id: 8, name: 'Pecker', sex: 'male', rating: 'great', color: 'black', maxSpeed: 111.4, speed: 95.6, stamina: 405.8, accel: 65, intel: 56, coop: 6, races: 6, run: 6, class: 'A', born: 98, readyAt: 216 },
      { id: 10, name: 'Mocha', sex: 'female', rating: 'wonderful', color: 'yellow', maxSpeed: 106.0, speed: 91.7, stamina: 469.5, accel: 70, intel: 59, coop: 28, races: 6, run: 6, class: 'A', born: 113, readyAt: 216 },
      { id: 12, name: 'Rosa', sex: 'female', rating: 'great', color: 'gold', maxSpeed: 127.9, speed: 110.2, stamina: 514.8, accel: 68, intel: 58, coop: 0, races: 0, run: 0, class: 'C', born: 209, readyAt: 218 }] },
    flags: ['c11b_night_done', 'c11b_field_done', 'c11b_dawn_done', 'c11b_morning_done', 'c12b_ult_told', 'c10_venus_gospel',
      'c12a_sage_named', 'c12a_sage_eskill', 'c12a_caught_chocobo', 'c12a_ester_d2', 'c12a_bred_green', 'c12a_bred_blue', 'c12a_host_met', 'c12a_arena_clear',
      'c12a_sprint_shoes', 'c12a_bred_black', 'c12a_flayer', 'c12a_bred_gold', 'got_side_farm_lure2', 'got_condor2_phoenix',
      'got_midgar2_hq_behemoth', 'got_midgar2_hq_growlance', 'got_midgar2_hq_masterfist', 'got_midgar2_hq_pilebanger', 'got_midgar2_stairs_missingscore',
      'got_midgar2_ug1_elixir', 'got_midgar2_ug1_megalixir', 'got_midgar2_ug2_aegis', 'got_midgar2_ug3_elixir', 'got_midgar2_ug3_maxray', 'got_midgar2_ug3_starlight',
      'got_midgar2_wind1_guard', 'got_midgar2_wind1_power', 'got_midgar2_wind2_magic', 'got_midgar2_wind2_mind', 'got_midgar2_wind2_witem', 'got_midgar2_yard_elixir',
      'got_midgar2_yard_mystile', 'got_uwreactor_dock_scales', 'got_uwreactor_dock_scimitar', 'got_uwreactor_dock_trumpet'],
    noFlags: ['c7_pagoda_done', 'c7_pagoda_on', 'c8_ws_paid', 'c11a_turks_fought'],
  });
  O.c12b_aboard = function* () { return yield* aboard(); };
  // (these end on the world map or aboard: no map context after them for a resumed game - R.contexts)
  ['c12b_aboard', 'c12b_fly', 'c12b_sub', 'c12b_tile', 'c12b_chase', 'c12a_leaveSaucer', 'c10_boardAirship'].forEach(n => R.worldOps.add(n));
  const TOUR = { via: 'chocobo', color: 'gold' };
  R.plans.c12b = [
    ['chapter', 'c12b', "Chapter 12b: Optional B (Weapons, caves, Gelnika)"],
    ['expect', 'disc3', { soft: true }],   // soft: it holds all through C12a/C12b (set at the start of Disc 3), so it can't mark a resume point
    // the night before the final battle (C11b's scenes, from C11a's end) when C12a did not play it first
    ['obj', 'The night before the final battle'],
    ['exit', 'hw_bridge', { map: 'hw_dawn', done: 'c11b_morning_done' }],
    ['expect', 'c11b_morning_done', { soft: true }],

    // ---- the Gold chocobo's tour: the four materia caves, Goblin Island, Lucrecia's cave
    ['obj', 'Knights of the Round, on the Gold chocobo'],
    ['party', ['cloud', 'vincent', 'tifa']],
    ['world', 'knights_of_round', Object.assign({ done: 'got_side_cave_kotr_materia' }, TOUR)],
    ['item', 'side_cave_kotr_materia'],                      // Knights of the Round
    ['obj', 'The materia caves'],
    ['world', 'materia_cave_w', Object.assign({ done: 'got_side_cave_mime_materia' }, TOUR)],
    ['item', 'side_cave_mime_materia'],                      // Mime
    ['world', 'materia_cave_n', Object.assign({ done: 'got_side_cave_hpmp_materia' }, TOUR)],
    ['item', 'side_cave_hpmp_materia'],                      // HP<->MP
    ['world', 'materia_cave_e', Object.assign({ done: 'got_side_cave_quadra_materia' }, TOUR)],
    ['item', 'side_cave_quadra_materia'],                    // Quadra Magic
    // (resume points: a game saved past these parts carries on after them - they hold only from here on)
    ['expect', ['got_side_cave_kotr_materia', 'got_side_cave_mime_materia', 'got_side_cave_hpmp_materia', 'got_side_cave_quadra_materia']],
    ['ckpt', 'c12b_caves'],

    // ---- Goblin Island: Goblin Punch (and Zeio Nuts, stolen)
    ['obj', 'Goblin Island: Goblin Punch'],
    ['loadout', 'cloud', { armor: ['enemy_skill'], done: (s, R) => R.masterKnows('goblin_punch') }],   // (more E.Skill holders it can hit)
    ['loadout', 'vincent', { armor: ['enemy_skill'], done: (s, R) => R.masterKnows('goblin_punch') }],
    ['world', 'goblin_island', Object.assign({ done: (s, R) => R.masterKnows('goblin_punch') }, TOUR)],
    ['battle', { learn: ['goblin_punch'], steal: ['zeio_nut'] }],
    ['c12b_learn', ['goblin_punch'], { max: 25, budget: 60000 }],
    ['battle', {}],

    // ---- the Ancient Forest (the Gold chocobo climbs the plateau): FF7's insect / frog / flower puzzle
    ['obj', 'The Ancient Forest'],
    ['world', 'ancient_forest', Object.assign({ done: 'got_c12b_af_springgun' }, TOUR)],
    // area 1: three insects into the three pitcher flowers make a bridge over the ravine
    ['talk', 'bug1', { done: 'got_c12b_af_springgun' }], ['use', 14, 7, { done: 'got_c12b_af_springgun' }],
    ['talk', 'bug2', { done: 'got_c12b_af_springgun' }], ['use', 15, 7, { done: 'got_c12b_af_springgun' }],
    ['talk', 'bug3', { done: 'got_c12b_af_springgun' }], ['use', 16, 7, { done: 'got_c12b_af_springgun' }],
    ['c12b_get', 'c12b_af_supershot'],                       // (around the Large Flytrap's mouth)
    ['c12b_get', 'c12b_af_springgun'],
    ['goto', 'side_forest_2'],
    // area 2: up the stamen, an insect for the hollow tree, its frog into the pitcher flower: the catapult
    // to the beehive's perch; the hive shuts the flytrap (Slash-All); a second frog throws the party
    // over the thicket to area 3
    ['use', 8, 6, { choose: 'Swing up', done: 'got_c12b_af_slashall' }],
    ['talk', 'bug4', { done: 'got_c12b_af_slashall' }],
    ['use', 12, 2, { done: 'got_c12b_af_slashall' }],
    ['talk', 'frog_t2a', { map: 'side_forest_2', done: 'got_c12b_af_slashall' }],
    ['use', 14, 4, { choose: 'Step on it', done: 'got_c12b_af_slashall' }],
    ['talk', 'hive', { done: 'got_c12b_af_slashall' }],
    ['use', 22, 5, { choose: 'Drop down', done: 'got_c12b_af_slashall' }],
    ['use', 28, 12, { done: 'got_c12b_af_slashall' }],
    ['c12b_get', 'c12b_af_slashall'],
    ['talk', 'bug5', { done: { map: 'side_forest_3' } }],
    ['use', 25, 7, { done: { map: 'side_forest_3' } }],
    ['talk', 'frog_t2b', { map: 'side_forest_2', done: { map: 'side_forest_3' } }],
    ['use', 32, 7, { choose: 'Step on it', done: { map: 'side_forest_3' } }],
    ['goto', 'side_forest_3', { done: 'got_c12b_af_typhoon' }],
    // area 3: up the stamen to the treetops (Typhoon), along them to the hidden hollow over area 2 (Minerva
    // Band), then back: the catapult again, the stamen, the rope down; an insect for the pitcher flower, the
    // beehive into the flytrap, the last frog's catapult across the stream into the cave
    ['use', 9, 6, { choose: 'Swing up', done: 'got_c12b_af_typhoon' }],
    ['c12b_get', 'c12b_af_typhoon'],
    ['exit', [0, 3], { done: 'got_c12b_af_minerva' }],
    ['c12b_get', 'c12b_af_minerva', { map: 'side_forest_2' }],
    ['use', 30, 5, { choose: 'Drop down', map: 'side_forest_2', done: 'got_c12b_af_apocalypse' }],
    ['talk', 'bug5', { map: 'side_forest_2', done: 'got_c12b_af_apocalypse' }],
    ['use', 25, 7, { map: 'side_forest_2', done: 'got_c12b_af_apocalypse' }],
    ['talk', 'frog_t2b', { map: 'side_forest_2', done: 'got_c12b_af_apocalypse' }],
    ['use', 32, 7, { choose: 'Step on it', map: 'side_forest_2', done: 'got_c12b_af_apocalypse' }],
    ['goto', 'side_forest_3', { done: 'got_c12b_af_apocalypse' }],
    ['use', 9, 6, { choose: 'Swing up', done: 'got_c12b_af_apocalypse' }],
    ['use', 22, 5, { choose: 'Drop down', done: 'got_c12b_af_apocalypse' }],
    ['talk', 'bug6', { done: 'got_c12b_af_apocalypse' }],
    ['use', 21, 12, { done: 'got_c12b_af_apocalypse' }],
    ['talk', 'hive3', { done: 'got_c12b_af_apocalypse' }],
    ['use', 27, 10, { done: 'got_c12b_af_apocalypse' }],
    ['talk', 'bug7', { done: 'got_c12b_af_apocalypse' }],
    ['use', 30, 8, { done: 'got_c12b_af_apocalypse' }],
    ['talk', 'frog_t3', { map: 'side_forest_3', done: 'got_c12b_af_apocalypse' }],
    ['use', 31, 11, { choose: 'Step on it', then: 'side_forest_cave', done: 'got_c12b_af_apocalypse' }],
    ['c12b_get', 'c12b_af_apocalypse'],
    ['c12b_get', 'c12b_af_elixir'],
    ['expect', ['got_c12b_af_apocalypse', 'got_c12b_af_elixir']],   // (a resume point: the forest is behind the party)
    ['ckpt', 'c12b_forest'],

    // ---- Lucrecia's cave, behind the waterfall (Vincent's past; she has more to give later)
    ['obj', "Lucrecia's cave, with Vincent"],
    ['world', 'lucrecia_cave', Object.assign({ done: 'c12b_luc_seen' }, TOUR)],
    ['goto', 'side_lucrecia', { done: 'c12b_luc_seen' }],
    ['walk', 11, 8, { done: 'c12b_luc_seen' }],
    ['expect', 'c12b_luc_seen'],

    // ---- back aboard the Highwind (the chocobo flies along and goes home when the party gets down)
    ['obj', 'Back to the Highwind'],
    ['c12b_aboard'],
    ['ckpt', 'c12b_tour'],

    // ---- Kalm: Tents for the training ahead (and the Traveller, when C10 brought him a Guide Book)
    ['obj', 'Kalm: Tents'],
    ['world', 'kalm', { done: (s) => FF7.sys.inv.count('tent') >= 12 && (s.flag('c5a_trav_guide') || !s.has('guide_book')) }],
    ['goto', 'kalm_item', { done: (s) => FF7.sys.inv.count('tent') >= 12 && FF7.sys.inv.count('hyper') >= 20 }],
    ['shop', 'keeper', { buy: [['tent', 16], ['hyper', 30]], lenient: true, done: (s) => FF7.sys.inv.count('tent') >= 12 && FF7.sys.inv.count('hyper') >= 20 }],   // (Hypers: Fury for the Limit training)
    ['goto', 'kalm_house_far', { done: (s) => s.flag('c5a_trav_guide') || !s.has('guide_book') }],
    ['talk', 'traveler', { done: (s) => s.flag('c5a_trav_guide') || !s.has('guide_book') }],   // Underwater materia

    // ---- training in the Ancient Forest, on the Gold chocobo: its Diablos, Rilfsaks and Epiolnis give ~2,500
    // EXP a fight and can be taken at level 50 (the Gelnika's Unknowns can't: two of them wipe a level 55 party),
    // Enemy Lure for more fights, a Tent outside on the world map when the party runs low. The WEAPONs ahead
    // want level 60 or so (Emerald's blows do ~6,000).
    ['obj', 'Training in the Ancient Forest'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['loadout', 'cloud', { armor: ['enemy_lure'], done: (s, R) => R.avgLevel() >= 63 }],
    ['loadout', 'cid', { weapon: [['restore', 'all'], 'bahamut_zero', 'neo_bahamut', 'hp_plus', 'lightning', 'steal', 'enemy_skill'], done: (s, R) => R.avgLevel() >= 63 }],
    ['heal', { below: 0.9, done: (s, R) => R.avgLevel() >= 63 }],
    ['world', 'ancient_forest', Object.assign({ done: (s, R) => R.avgLevel() >= 63 }, TOUR)],
    ['battle', {}],
    ['c12b_train', 63, { at: 'side_forest_1', rest: 'world', exitAt: [0, 7], loc: 'ancient_forest', via: TOUR, max: 140, budget: 800000 }],
    ['materia', 'cloud', null, { slot: 'armor', index: 0 }, { done: (s) => !FF7.state.chars.cloud.armorMateria.some(m => m && m.id === 'enemy_lure') }],
    ['c12b_aboard'],
    ['ckpt', 'c12b_trained'],

    // ---- Ultimate WEAPON: rammed with the Highwind wherever it hovers, until it falls over Cosmo Canyon
    // (the Ultima Weapon; its death throes teach Shadow Flare: the Enemy-Skill FAQ - it hits whoever killed it, so the
    // master Enemy Skill materia goes on Cloud, who alone attacks it in the last fight: `finisher`)
    ['obj', 'Ultimate WEAPON'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['loadout', 'cloud', { weapon: ['knights_of_round', 'w_summon', 'mime', 'enemy_skill', 'hp_plus', 'magic_plus', ['restore', 'all']] }],
    ['loadout', 'tifa', { weapon: ['enemy_skill', 'steal', 'hp_plus', 'revive', 'heal', 'time'] }],
    ['loadout', 'cid', { weapon: ['enemy_skill', 'bahamut_zero', 'neo_bahamut', ['restore', 'all'], 'mp_plus'] }],
    ['eskillMaster', 'cloud', { done: (s, R2) => R2.masterKnows('shadow_flare') }],
    ['heal', { below: 0.9 }],
    ['save'],
    ['battle', { weapon: { mime: true, wait: true, finisher: 'cloud', finishFor: ['ultimate_weapon_d'] }, steal: ['circlet', 'reflect_ring'] }],
    ['c12b_ultimate', { done: 'c12b_ultimate_dead', budget: 400000 }],
    ['expect', 'c12b_ultimate_dead'],
    ['battle', {}],
    ['equip', 'cloud', 'weapon', 'ultima_weapon'],
    ['ckpt', 'c12b_ultimate'],

    // ---- the Sunken Gelnika, by submarine (surfaced: Emerald WEAPON only notices a dived one): its finds and
    // Reno and Rude (patched up after the fights: the Unknowns hit hard)
    ['obj', 'The Sunken Gelnika'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['loadout', 'cid', { weapon: ['enemy_skill', 'morph', ['restore', 'all'], 'bahamut_zero', 'neo_bahamut', 'mp_plus'] }],
    ['heal', { below: 0.9 }],
    ['c12b_sub', { done: { map: 'side_gelnika_hall' } }],
    ['world', 'gelnika', { vehicle: 'submarine' }],
    ['expectMap', 'side_gelnika_hall'],
    // the Unknowns, Poodlers and Bad Raps morph into every stat source; the Serpent teaches Aqualung
    ['battle', { morph: true, steal: ['tough_ring', 'ziedrich', 'water_ring'], last: ['rude_5'], learn: ['aqualung'], fleeBelow: 0.35 }],   // (runs when a fight goes badly)
    ['chest', 'c12b_gel_heavens_cloud'],
    ['goto', 'side_gelnika_upper'],
    ['chest', 'c12b_gel_megalixir1'],
    ['heal', { below: 0.7 }],
    ['chest', 'c12b_gel_escort_guard'],
    ['heal', { below: 0.7 }],
    ['goto', 'side_gelnika_lower'],
    ['heal', { below: 0.7 }],
    ['use', 1, 1, { done: 'c12b_gel_conformer' }],          // the box nobody can see: Conformer
    ['use', 24, 1, { done: 'c12b_gel_doublecut' }],         // something glinting in the corner: Double Cut
    ['heal', { below: 0.7 }],
    ['goto', 'side_gelnika_hall'],
    ['heal', { below: 0.9 }],
    ['save'],
    ['obj', 'Reno and Rude guard the cargo'],
    ['goto', 'side_gelnika_corridor'],
    ['walk', 16, 3, { done: 'c12b_gel_turks' }],             // Reno and Rude (Tough Ring, Ziedrich stolen)
    ['expect', 'c12b_gel_turks'],
    ['heal', { below: 0.8 }],
    ['goto', 'side_gelnika_cargo', { done: 'got_c12b_gel_megalixir2' }],   // (resumed after it: the finds are behind the party)
    ['chest', 'c12b_gel_outsider'],
    ['heal', { below: 0.7 }],
    ['chest', 'c12b_gel_highwind'],                          // Cid's Highwind limit manual
    ['heal', { below: 0.7 }],
    ['item', 'c12b_gel_hades'],
    ['heal', { below: 0.7 }],
    ['chest', 'c12b_gel_spirit_lance'],
    ['heal', { below: 0.7 }],
    ['chest', 'c12b_gel_megalixir2'],
    ['battle', {}],
    // (no Limit training here: the Unknowns wipe a party that leaves them standing for the learners - the chapter's
    // end camp near Mideel trains the uses instead)
    ['heal', { below: 0.9 }],
    ['c12b_aboard'],                                         // the submarine back to the Highwind
    ['ckpt', 'c12b_gelnika'],

    // ---- the Disc 2/3 changes in the towns
    // Bone Village: the Key to Sector 5, dug up where FF7's "normal treasure" lies (spot 5)
    ['obj', 'Bone Village: the Key to Sector 5'],
    ['world', 'bone_village', { done: (s) => s.has('key_to_sector_5') || s.flag('c12b_midgar_open') }],
    ['talk', 'boss', { choose: ['Normal treasure', 'None'], done: (s) => s.has('key_to_sector_5') || s.flag('c12b_midgar_open') || s.get('c8_dig_state') >= 1 }],
    ['walk', 13, 21, { choose: 'Dig here', done: (s) => s.has('key_to_sector_5') || s.flag('c12b_midgar_open') || s.get('c8_dig_state') >= 3 }],
    ['use', 23, 22, { done: (s) => s.has('key_to_sector_5') || s.flag('c12b_midgar_open') }],
    ['expect', (s) => s.has('key_to_sector_5') || s.flag('c12b_midgar_open')],
    ['collect', { kinds: 'gear', keepGil: 60000, shops: [['bone_village', 'foreman', 'bone_village_items']] }],   // (the shop's kinds the party never had: FF7's 100% owns every weapon, armour and accessory)
    // Midgar: the Sector 5 gate, the church, Wall Market (Tifa's Premium Heart, the Sneak Glove)
    ['obj', 'Midgar: the Sector 5 gate'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['world', 'midgar', { done: 'c12b_sneak_glove' }],
    ['talk', 'gateman', { done: 'c12b_gate_man' }],
    ['exit', [13, 2], { done: 'c12b_sneak_glove', then: 's5_town' }],
    ['goto', 's5_church', { done: 'c12b_church' }],
    ['goto', 's6_ruins', { done: 'c12b_sneak_glove' }],
    ['exit', [0, 6], { done: 'c12b_sneak_glove' }],
    ['obj', "Wall Market: the old vending machine, the battery seller's bargain"],
    ['goto', 'wall_pharmacy', { done: 'c12b_premium_heart' }],
    ['use', 14, 0, { done: 'c12b_premium_heart' }],
    ['goto', 'wall_weapons', { choose: 'Buy it', done: 'c12b_sneak_glove' }],
    ['expect', 'c12b_premium_heart'],
    ['expect', 'c12b_sneak_glove', { soft: true }],
    ['equip', 'tifa', 'weapon', 'premium_heart'],
    ['collect', { kinds: 'gear', keepGil: 60000, shops: [['wall_weapons', 'wpnowner', 'wallmarket_weapons']] }],   // (the shop's kinds the party never had: FF7's 100% owns every weapon, armour and accessory)
    ['goto', 's5_town'],
    ['use', 36, 0, { choose: 'Leave Midgar', then: 'side_midgar_gate' }],
    // Cosmo Canyon: the store's forgotten stash, Bugenhagen's gift to Nanaki
    ['obj', "Cosmo Canyon: Bugenhagen's gift"],
    ['party', ['cloud', 'redxiii', 'tifa']],
    ['world', 'cosmo_canyon', { done: ['c12b_cosmo_stash', 'c12b_limited_moon'] }],
    ['goto', 'cosmo_itemshop', { done: 'c12b_cosmo_stash' }],
    ['use', 13, 1, { done: 'c12b_cosmo_stash' }],            // Full Cure, Elixir
    ['goto', 'cosmo_observatory', { done: 'c12b_limited_moon' }],
    ['expect', 'c12b_limited_moon'],
    ['equip', 'redxiii', 'weapon', 'limited_moon'],
    ['collect', { kinds: ['materia', 'gear'], want: { hp_plus: 4, mp_plus: 2 }, keepGil: 60000, shops: [['cosmo_hall', 'tigerlily', 'cosmo_canyon_weapons'], ['cosmo_hall2', 'materia_clerk', 'cosmo_canyon_materia']] }],   // (the shop's kinds the party never had: FF7's 100% owns every weapon, armour and accessory)
    // Nibelheim: Tifa's piano (the old melody: Zangan's letter, Final Heaven); the mansion: ???? from the
    // Jerseys upstairs (they cast it before they're first hurt), Cloud's memory in the basement
    ['obj', "Nibelheim: Tifa's piano"],
    ['party', ['cloud', 'tifa', 'cid']],
    ['world', 'nibelheim', { done: ['c12b_final_heaven', 'trig_mansion_basement_c12b_memory', (s, R) => R.masterKnows('question')] }],
    ['goto', 'nibel_tifa_house', { done: 'c12b_final_heaven' }],
    ['use', 13, 1, { choose: ['Play it', 0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0, 8], done: 'c12b_final_heaven' }],
    ['expect', 'c12b_final_heaven'],
    ['obj', 'The Shinra Mansion: ???? from the Jerseys'],
    ['goto', 'mansion_2f_west', { done: (s, R) => R.masterKnows('question') }],
    ['battle', { learn: ['question'] }],
    ['c12b_learn', ['question'], { max: 24, budget: 100000 }],
    ['battle', {}],
    ['goto', 'mansion_basement', { done: 'trig_mansion_basement_c12b_memory' }],
    ['walk', 22, 8, { done: 'trig_mansion_basement_c12b_memory' }],   // Cloud remembers Zack
    // (Config > Playable Flashbacks, js/maps/extra/flashbacks.js: the memory goes on as Zack's last stand - Zack walked
    // north across the wasteland: two patrols on the way, the Shinra Army at the cliff; then back to the basement)
    ['walk', 14, 2, { map: 'fb_wasteland', done: (s) => !FF7.story.zk_playable() || s.flag('zk_done') || !s.flag('zk_on') }],
    ['expect', (s) => !s.flag('zk_on'), { soft: true }],
    ['ckpt', 'c12b_towns'],

    // ---- the Sleeping Man, west of the Mythril Mine: Mythril when the battle count ends in 11, 33, 55, 77
    // or 99 (for the Weapon Seller, when C8 didn't pay him), a Bolt Ring on 22, 44, 66 or 88
    ['obj', 'The Sleeping Man'],
    ['c12b_fly', 263, 189, { land: true, done: (s) => s.flag('c12b_sleeper_ring') && (s.flag('c8_ws_paid') || s.has('mythril')) }],
    ['c12b_count', [11, 33, 55, 77, 99], { budget: 120000, done: (s) => s.flag('c8_ws_paid') || s.has('mythril') }],
    ['c12b_tile', 263, 187, { choose: 'Go inside', done: (s) => s.flag('c8_ws_paid') || s.has('mythril') }],
    ['talk', 'sleeper', { map: 'side_sleeping_man', done: (s) => s.flag('c8_ws_paid') || s.has('mythril') }],
    ['exit', [8, 9], { map: 'side_sleeping_man', done: (s) => s.flag('c12b_sleeper_ring') || R.where() !== 'side_sleeping_man' }],
    ['c12b_count', [22, 44, 66, 88], { budget: 120000, done: 'c12b_sleeper_ring' }],
    ['c12b_tile', 263, 187, { choose: 'Go inside', done: 'c12b_sleeper_ring' }],
    ['talk', 'sleeper', { map: 'side_sleeping_man', done: 'c12b_sleeper_ring' }],
    ['expect', 'c12b_sleeper_ring', { soft: true }],
    // the Weapon Seller: the Mythril for a box: the small one upstairs (Aeris's Great Gospel)
    ['obj', "The Weapon Seller's box"],
    ['world', 'weapon_seller', { done: (s) => s.flag('c8_ws_small') || s.flag('c8_ws_big') }],
    ['talk', 'seller', { choose: 'Give him the Mythril', done: (s) => s.flag('c8_ws_paid') || s.flag('c8_ws_small') || s.flag('c8_ws_big') }],
    ['use', 9, 1, { choose: 'Open it', done: (s) => s.flag('c8_ws_small') || s.flag('c8_ws_big') }],
    ['expect', 'c8_ws_small', { soft: true }],

    // ---- Wonder Square's ???? prizes (Gil Plus 1000 GP, EXP Plus 2000 GP): the GP the races and games didn't
    // bring, bought from the man in Station Square (100 GP for 10,000 gil, when he is about)
    ['obj', "Wonder Square: Gil Plus and EXP Plus (GP from the man in Station Square)"],
    ['c12a_gp', 'wonder', { max: 320, keepGil: 120000, done: (s) => s.flag('c12a_gs_gilplus') && s.flag('c12a_gs_expplus'), budget: 800000 }],
    ['try', ['c12a_wonderPrizes'], { budget: 60000, done: (s) => s.flag('c12a_gs_gilplus') && s.flag('c12a_gs_expplus') }],
    ['c12a_leaveSaucer'],

    // ---- Wutai's Pagoda (C7 left it): Yuffie alone against the five guardians; Godo gives Leviathan and
    // All Creation
    ['obj', 'Wutai: the Pagoda'],
    ['party', ['cloud', 'yuffie', 'tifa'], { done: 'c7_pagoda_done' }],
    ['equip', 'yuffie', 'weapon', 'conformer', { done: 'c7_pagoda_done' }],
    // (a Ribbon: Godo opens with Mini or Sleepel - a Mini'd Yuffie with no Remedy hit for 1 and lost, 4 seeds in 4)
    ['equip', 'yuffie', 'accessory', 'ribbon', { done: 'c7_pagoda_done' }],
    ['loadout', 'yuffie', { weapon: [['restore', 'all'], 'hp_plus', 'bahamut_zero', 'neo_bahamut', 'enemy_skill', 'revive'], clear: true, done: 'c7_pagoda_done' }],   // (Laser for Godo)
    ['heal', { below: 0.95, done: 'c7_pagoda_done' }],
    ['world', 'wutai', { done: 'c7_pagoda_done' }],
    ['goto', 'wutai_town2', { done: 'c7_pagoda_done' }],
    ['exit', [17, 4], { done: 'c7_pagoda_done' }],
    ['expectMap', 'wutai_pagoda1', { done: 'c7_pagoda_done' }],
    ['walk', 8, 6, { done: (s) => s.flag('c7_pg1') || s.flag('c7_pagoda_done') }],    // Gorky
    ['heal', { below: 0.95, mp: 0.6, elixir: true, done: 'c7_pagoda_done' }],            // (between floors, as the Walkthrough says; Elixirs for MP: no Ethers left)
    ['exit', 'wutai_pagoda2', { done: 'c7_pagoda_done' }],
    ['walk', 8, 6, { done: (s) => s.flag('c7_pg2') || s.flag('c7_pagoda_done') }],    // Shake
    ['heal', { below: 0.95, mp: 0.6, elixir: true, done: 'c7_pagoda_done' }],            // (between floors, as the Walkthrough says; Elixirs for MP: no Ethers left)
    ['exit', 'wutai_pagoda3', { done: 'c7_pagoda_done' }],
    ['walk', 8, 6, { done: (s) => s.flag('c7_pg3') || s.flag('c7_pagoda_done') }],    // Chekhov
    ['heal', { below: 0.95, mp: 0.6, elixir: true, done: 'c7_pagoda_done' }],            // (between floors, as the Walkthrough says; Elixirs for MP: no Ethers left)
    ['exit', 'wutai_pagoda4', { done: 'c7_pagoda_done' }],
    ['walk', 8, 6, { done: (s) => s.flag('c7_pg4') || s.flag('c7_pagoda_done') }],    // Staniv
    ['heal', { below: 0.95, mp: 0.6, elixir: true, done: 'c7_pagoda_done' }],            // (between floors, as the Walkthrough says; Elixirs for MP: no Ethers left)
    ['exit', 'wutai_pagoda5', { done: 'c7_pagoda_done' }],
    ['walk', 8, 6, { done: 'c7_pagoda_done' }],                                        // Godo
    ['expect', 'c7_pagoda_done', { soft: true }],               // (soft: a start can bring it done)
    ['exit', 'wutai_pagoda4', { map: 'wutai_pagoda5', done: (s) => R.where() !== 'wutai_pagoda5' }],
    ['exit', 'wutai_pagoda3', { map: 'wutai_pagoda4', done: (s) => R.where() !== 'wutai_pagoda4' }],
    ['exit', 'wutai_pagoda2', { map: 'wutai_pagoda3', done: (s) => R.where() !== 'wutai_pagoda3' }],
    ['exit', 'wutai_pagoda1', { map: 'wutai_pagoda2', done: (s) => R.where() !== 'wutai_pagoda2' }],
    ['exit', [8, 11], { map: 'wutai_pagoda1', done: (s) => R.where() !== 'wutai_pagoda1' }],
    // (read when Yuffie is ready - every other Limit known: kept until then, the engine's manual watcher)
    ['useItem', 'all_creation', 'yuffie', { whenReady: true, done: (s) => FF7.state.chars.yuffie.limitsKnown.includes('all_creation') || !FF7.sys.inv.has('all_creation') }],
    ['collect', { kinds: 'gear', keepGil: 60000, shops: [['wutai_weapons', 'shopkeeper', 'wutai_weapons'], ['wutai_items', 'shopkeeper', 'wutai_items']] }],
    // (Hypers for the Limit training at the end: Fury fills the gauge twice as fast; Mideel's ruins sell none)
    ['goto', 'wutai_items', { done: (s) => FF7.sys.inv.count('hyper') >= 20 }],
    ['shop', 'shopkeeper', { buy: [['hyper', 30]], lenient: true, done: (s) => FF7.sys.inv.count('hyper') >= 20 }],
    // ---- Da-chao's fire cave: the Leviathan Scales (C10's Underwater Reactor) put its flames out (Item/Materia
    // Locations FAQ): Steal as well and the Oritsuru
    ['obj', "Da-chao's fire cave: Steal as well, the Oritsuru"],
    ['goto', 'wutai_dachao_ledge', { done: ['got_wutai_dachao_fire_steal_as_well', 'got_wutai_dachao_fire_oritsuru'] }],
    ['exit', 'wutai_dachao_fire', { choose: 'Use them', done: (s, R) => s.flag('c7_dachao_fire_out') || R.where() === 'wutai_dachao_fire' || !s.has('leviathan_scales') }],
    ['goto', 'wutai_dachao_fire', { done: ['got_wutai_dachao_fire_steal_as_well', 'got_wutai_dachao_fire_oritsuru'] }],
    ['item', 'wutai_dachao_fire_steal_as_well'],
    ['chest', 'wutai_dachao_fire_oritsuru'],   // (the shop's kinds the party never had: FF7's 100% owns every weapon, armour and accessory)
    // ---- Config > Turks Join (not in the PS1 game; js/maps/extra/turks.js): the party beat the Turks in the Sector 8
    // underground, so they are at the Turtle's Paradise, asking for help with the medevac wreck on Da-chao; two
    // ambushes on the way up, the Holdout Panzer on the summit, then the Highwind (Barret and Reno): they join.
    // Every step is passed over when that isn't open (the option off, the Turks skipped in C11a, or joined already)
    ['obj', 'The Turks: the medevac wreck on Da-chao'],
    ['goto', 'wutai_turtle', { done: (s) => !FF7.story.tk_open(s) || s.flag('tk_bar') }],
    ['talk', 'tk_reno', { choose: "We'll help.", done: (s) => !FF7.story.tk_open(s) || s.flag('tk_bar') }],
    ['heal', { below: 0.9, done: (s) => !FF7.story.tk_open(s) || s.flag('tk_boss') }],
    ['goto', 'wutai_dachao_top', { done: (s) => !FF7.story.tk_open(s) || s.flag('tk_case') }],   // (the summit's scene ends on the Highwind)
    ['expect', (s) => !FF7.story.tk_open(s) || s.flag('tk_joined'), { soft: true }],
    ['talk', 'hw_pilot', { choose: 'Take off', done: (s, R2) => R2.where() !== 'highwind_bridge' }],   // (the scene ends aboard: back out over Wutai)
    // ---- Death Force: an Adamantaimai on the beaches below Wutai, Manipulated into casting it on the holder of the
    // master Enemy Skill materia (the Enemy-Skill FAQ: "Manipulate: Yes, necessary"); its Adaman Bangle stolen
    ['obj', 'Death Force from an Adamantaimai'],
    ['party', ['cloud', 'tifa', 'cid'], { done: (s, R) => R.masterKnows('death_force') && s.has('adaman_bangle') }],
    ['loadout', 'tifa', { weapon: ['enemy_skill', 'manipulate', 'steal', ['restore', 'all']], clear: true, done: (s, R) => R.masterKnows('death_force') && s.has('adaman_bangle') }],
    ['battle', { learn: ['death_force'], learnEach: 'master', steal: ['adaman_bangle'] }],
    ['world', [43, 122], { done: (s, R) => R.masterKnows('death_force') && s.has('adaman_bangle') }],   // the beach strip south of Wutai
    ['c6b_learn', ['death_force'], { battles: 14, learnEach: 'master', holder: 'tifa', terrain: 's', also: { item: 'adaman_bangle' }, budget: 300000 }],
    ['battle', {}],
    ['c12b_aboard'],
    ['ckpt', 'c12b_pagoda'],

    // ---- Lucrecia's cave again, ten battles later: Death Penalty and Chaos for Vincent
    ['obj', "Lucrecia's cave: her gift"],
    ['party', ['cloud', 'vincent', 'tifa']],
    ['c12b_fight', (s) => (FF7.state.battles || 0) >= s.get('c12b_luc_battles') + 10, { budget: 90000, done: 'c12b_luc_gifts' }],
    ['world', 'lucrecia_cave', { via: 'chocobo', color: 'gold', done: 'c12b_luc_gifts' }],
    ['goto', 'side_lucrecia', { done: 'c12b_luc_gifts' }],
    ['walk', 11, 8, { done: 'c12b_luc_gifts' }],
    ['expect', 'c12b_luc_gifts'],
    ['equip', 'vincent', 'weapon', 'death_penalty'],
    ['c12b_aboard'],
    ['ckpt', 'c12b_lucrecia'],

    // ---- Ruby WEAPON, in the Corel desert. FF7's solo method: two members knocked out beforehand, so Ruby
    // buries its tentacles at once instead of sweeping the party away with Whirlsand; W-Summon: Hades
    // (paralysis) then Knights of the Round linked with HP Absorb (in the armour, where it earns AP), then
    // Mime every turn; the Ribbon against Ruby Ray's confusion. The two are revived afterwards.
    ['obj', 'Ruby WEAPON'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['heal', { below: 0.95, done: 'c12b_ruby_dead' }],
    ['loadout', 'cloud', { weapon: ['w_summon', 'mime', 'hades', 'hp_plus', 'hp_plus', 'magic_plus'], armor: [['knights_of_round', 'hp_absorb'], 'enemy_skill'], clear: true }],
    ['equip', 'cloud', 'accessory', 'ribbon'],                // (Ruby Ray confuses: the Ribbon, not the Sprint Shoes)
    ['c12b_fly', 163, 187, { land: true, done: 'c12b_ruby_dead' }],
    ['battle', { koAllies: ['tifa', 'cid'], autoHeal: false }],   // (no patching up between these fights)
    ['c12b_fight', (s) => FF7.state.chars.tifa.hp <= 0 && FF7.state.chars.cid.hp <= 0, { heal: false, max: 8, budget: 60000, done: 'c12b_ruby_dead' }],
    ['c12b_mp', 'cloud', 0.9, { done: 'c12b_ruby_dead' }],
    // (Cloud's HP too - alone against Ruby WEAPON, and the fights that knocked the others out hurt him: a full run lost
    // in its first seconds; no Tent, which would bring the others back)
    ['heal', { members: ['cloud'], below: 0.95, itemBelow: 0.95, tent: false, elixir: true, done: 'c12b_ruby_dead' }],
    ['save'],
    ['battle', { weapon: { mime: true, hades: true, solo: true } }],
    ['c12b_tile', 158, 184, { choose: 'Fight it', done: 'c12b_ruby_dead', budget: 200000 }],
    ['expect', 'c12b_ruby_dead'],
    ['battle', {}],
    ['useItem', 'phoenix_down', 'tifa', { done: (s) => FF7.state.chars.tifa.hp > 0 }],
    ['useItem', 'phoenix_down', 'cid', { done: (s) => FF7.state.chars.cid.hp > 0 }],
    ['heal', { below: 0.9 }],
    // ---- (a fallback) Aqualung, when the master copy missed it from Jenova·LIFE (C8: she casts it on a random cycle)
    // and the Gelnika's Serpents: the Harpies of this desert (half of its fights), now that Ruby is gone from it
    ['c6b_learn', ['aqualung'], { battles: 16, learnEach: 'master', terrain: 'd', budget: 400000 }],
    // Sadness for Cloud, for Emerald WEAPON (a Tranquilizer in a desert battle): 30% less damage from its
    // blows; it lasts until a Tent, an Inn or a Remedy, so nothing below uses one
    ['obj', 'Sadness for Cloud'],
    ['equip', 'cloud', 'accessory', 'sprint_shoes'],        // (the Ribbon would ward it off)
    ['battle', { sadden: ['cloud'] }],
    ['c12b_fight', (s) => !!(FF7.state.chars.cloud.status || {}).sadness, { max: 4, heal: false, done: 'c12b_emerald_dead' }],
    ['battle', {}],
    ['heal', { below: 0.9, tent: false }],
    ['ckpt', 'c12b_ruby'],
    // the Desert Rose to the Kalm Traveller: a Gold chocobo, sent to the farm (a stable rented when all are full)
    ['obj', 'Kalm: the Desert Rose'],
    ['world', 'kalm', { done: 'c5a_trav_rose' }],
    ['goto', 'kalm_house_far', { done: 'c5a_trav_rose' }],
    ['talk', 'traveler', { done: 'c5a_trav_rose' }],
    ['chocoboFarm', 'rent', { n: 1, done: (s) => s.flag('c12a_gold_delivered') || (FF7.state.vars.c12a_stables || 0) > (FF7.state.vars.chocobos || []).length }],
    ['goto', 'side_choco_stable', { done: 'c12a_gold_delivered' }],   // (the stable hand moves it into a free stall)
    ['expect', 'c12a_gold_delivered', { soft: true }],
    ['ckpt', 'c12b_rose'],

    // ---- Emerald WEAPON on the sea floor (the fight wants Cloud at level 65 or so: Emerald Shoot and Foot
    // Stamp do ~6,000 a blow, and twice that as a critical hit; Cloud's Sadness takes 30% off). The Mime chain
    // with the one Mime there is: Cloud alone carries the attack (Knights of the Round linked with HP Absorb,
    // then Mime every turn; each Mime heals him a tenth of the damage), in the Mystile with the Sprint Shoes
    // and seven materia (Aire Tam Storm does 1,111 a materia; Magic Plus for a shorter fight: without the
    // Underwater materia, from C10's Guide Book, the air lasts 20 minutes; Time: Slow on Emerald first, or a
    // Spider Web, else it acts twice between his turns); Tifa opens with Big Guard; then they only wait:
    // nobody revives, heals or acts between the Mimes, so the chain never breaks.
    ['obj', 'Emerald WEAPON'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['equip', 'cloud', 'armor', 'mystile', { done: 'c12b_emerald_dead' }],
    ['loadout', 'cloud', { weapon: [['knights_of_round', 'hp_absorb'], 'mime', 'hp_plus', 'hp_plus', 'magic_plus', 'time'], armor: [], clear: true, done: 'c12b_emerald_dead' }],
    ['equip', 'cloud', 'accessory', 'sprint_shoes', { done: 'c12b_emerald_dead' }],
    ['loadout', 'tifa', { weapon: ['enemy_skill'], armor: [], clear: true, done: 'c12b_emerald_dead' }],
    ['c12b_eskill', 'tifa', ['big_guard'], { done: 'c12b_emerald_dead' }],   // (the copy that knows Big Guard)
    // (the Protect Ring on her: Barrier and MBarrier from the start - Emerald's first Emerald Shoot had killed her before
    // her Big Guard, and its Foot Stamp then Cloud, 1 fight in 10; an accessory adds nothing to Aire Tam Storm)
    ['try', ['equip', 'tifa', 'accessory', 'protect_ring'], { done: (s, R2) => s.flag('c12b_emerald_dead') || !R2.gear.owned('protect_ring') }],
    // (the back row for Cloud and Tifa as for Cid: Foot Stamp is physical and halved there - it had taken a front-row
    // Cloud from full HP to 0 through Big Guard's Barrier; their summons, Mimes and Enemy Skills don't care)
    ['row', 'cloud', 'back', { done: 'c12b_emerald_dead' }],
    ['row', 'tifa', 'back', { done: 'c12b_emerald_dead' }],
    ['loadout', 'cid', { weapon: ['underwater'], armor: [], clear: true, done: (s, R) => s.flag('c12b_emerald_dead') || !R.materiaCount('underwater') }],
    ['loadout', 'cid', { weapon: [], armor: [], clear: true, done: (s, R) => s.flag('c12b_emerald_dead') || R.materiaCount('underwater') > 0 }],
    ['c12b_sub', { done: 'c12b_emerald_dead' }],
    // full HP and MP from the bag (no Tent: it would lift the Sadness): Knights of the Round wants 250 MP
    ['heal', { below: 0.95, itemBelow: 0.95, tent: false, done: 'c12b_emerald_dead' }],
    ['c12b_mp', 'cloud', 0.9, { done: 'c12b_emerald_dead' }],
    ['save'],
    ['battle', { weapon: { mime: true, wait: true, slow: true, bigGuard: true, revive: false, heal: 'opening' } }],
    ['c12b_sub', { dive: true, done: 'c12b_emerald_dead' }],
    ['c12b_chase', 'emerald_weapon', { choose: 'Fight it', done: 'c12b_emerald_dead', budget: 200000 }],
    ['expect', 'c12b_emerald_dead'],
    ['battle', {}],
    ['row', 'cloud', 'front'],
    ['row', 'tifa', 'front'],
    ['c12b_sub', {}],                                        // surface
    ['c12b_aboard'],                                         // the submarine back to the Highwind's shore
    ['ckpt', 'c12b_emerald'],
    // the Earth Harp to the Kalm Traveller: Master Command, Master Magic, Master Summon
    ['obj', 'Kalm: the Earth Harp'],
    ['world', 'kalm', { done: 'c5a_trav_harp' }],
    ['goto', 'kalm_house_far', { done: 'c5a_trav_harp' }],
    ['talk', 'traveler', { done: 'c5a_trav_harp' }],
    ['expect', 'c5a_trav_harp'],

    // ---- the spoils: revive and restore, the limit manuals, the stat sources, the best gear (the reserve
    // two at a time through the PHS, as the Equip screen only lists the party)
    ['obj', 'Back to the Highwind'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['useItem', 'phoenix_down', 'tifa', { done: (s) => FF7.state.chars.tifa.hp > 0 }],
    ['useItem', 'phoenix_down', 'cid', { done: (s) => FF7.state.chars.cid.hp > 0 }],
    ['heal', { below: 0.9 }],
    ['try', ['useItem', 'final_heaven', 'tifa', { done: (s) => FF7.state.chars.tifa.limitsKnown.includes('final_heaven') }]],
    ['try', ['useItem', 'highwind', 'cid', { done: (s) => FF7.state.chars.cid.limitsKnown.includes('highwind') }]],
    ['c12b_sources', {}],
    // the ultimate weapons (the gear scores count their zero AP growth against them; for the fights ahead
    // they are the best there is), then the best armour and accessories from the bag
    ['equip', 'cloud', 'weapon', 'ultima_weapon'], ['equip', 'tifa', 'weapon', 'premium_heart'], ['equip', 'cid', 'weapon', 'venus_gospel'],
    ['equip', 'cloud', 'armor', 'mystile'],
    ['party', ['cloud', 'vincent', 'redxiii']],
    ['try', ['useItem', 'chaos', 'vincent', { done: (s) => FF7.state.chars.vincent.limitsKnown.includes('chaos') }]],
    ['equip', 'vincent', 'weapon', 'death_penalty'], ['equip', 'redxiii', 'weapon', 'limited_moon'],
    ['autoequip', { members: ['vincent', 'redxiii'], slots: ['armor', 'accessory'] }],
    ['party', ['cloud', 'yuffie', 'barret']],
    ['equip', 'yuffie', 'weapon', 'conformer'], ['equip', 'barret', 'weapon', 'missing_score'],
    ['autoequip', { members: ['yuffie', 'barret'], slots: ['armor', 'accessory'] }],
    ['party', ['cloud', 'caitsith', 'tifa']],
    ['equip', 'caitsith', 'weapon', 'hp_shout'],
    ['autoequip', { members: ['caitsith'], slots: ['armor', 'accessory'] }],
    ['party', ['cloud', 'tifa', 'cid']],
    ['autoequip', { members: ['tifa', 'cid'], slots: ['armor', 'accessory'] }],
    // ---- the Limit Breaks: everyone ready for their Level 4 manual (the Limit Break Mechanics guide's way: kills
    // and uses trained on the Mideel area's hard hitters, one uses learner at a time with the Cover materia and Fury;
    // each manual in the bag is read as soon as its character is ready: Final Heaven, Highwind, Catastrophe, Cosmo
    // Memory, All Creation, Chaos)
    // ---- the shops the route hasn't passed on Disc 2/3: one of each weapon, armour and accessory the party never had
    ['obj', 'The last shops: every weapon, armour and accessory'],
    ['collect', { kinds: ['materia', 'gear'], want: { revive: 2 }, keepGil: 60000, shops: [['kalm_weapon', 'keeper', 'kalm_weapons', null, 'kalm'], ['kalm_materia', 'keeper', 'kalm_materia'],
      ['junon_street1', [7, 3], 'junon_upper_materia', null, 'junon'], ['junon_street1', [19, 2], 'junon_upper_weapons_d2'], ['junon_street1', [13, 3], 'junon_upper_items_d2'],
      ['junon_street2', [28, 3], 'junon_upper_weapons2_d2'], ['junon_inn', [8, 6], 'junon_upper_materia2_d2'], ['junon_inn', [10, 2], 'junon_upper_accessories_d2'],
      ['condor_hall', [24, 11], 'fort_condor_materia_d2', null, 'fort_condor'], ['ncorel_town', 'weaponseller', 'north_corel_weapons', null, 'north_corel'],
      ['costa_bar', 'dealer', 'costa_del_sol_weapons_d2', null, 'costa_del_sol'], ['costa_shop', [17, 3], 'costa_del_sol_materia_d2'],
      ['gongaga_weapon', 'clerk', 'gongaga_weapons', null, 'gongaga'], ['gongaga_acc', 'clerk', 'gongaga_accessories', 'Accessories'], ['gongaga_acc', 'clerk', 'gongaga_materia', 'Materia'],
      ['rocket_weapons', 'shopkeeper', 'rocket_town_weapons_d2', null, 'rocket_town'], ['rocket_items', 'shopkeeper', 'rocket_town_materia_d2', 'Materia'],
      ['icicle_weapons', 'weapon_seller', 'icicle_inn_weapons', null, 'icicle_inn']] }],
    ['obj', 'Limit Breaks: ready for the manuals'],
    ['goto', 'mideel_ruins'],                                          // Tents for the camp (the world map: full HP and MP)
    ['shop', 'r_ikeep', { buy: [['tent', 30], ['phoenix_down', 50]], lenient: true }],
    ['limitReady', ['cloud', 'tifa', 'cid', 'yuffie', 'barret', 'redxiii', 'vincent', 'caitsith'], { at: [278, 245], max: 300, budget: 3000000 }],
    // (a second round after a restock when the Tents and Phoenix Downs ran out first: a full run left Red XIII's
    // three at that; it returns at once when everyone is ready)
    ['goto', 'mideel_ruins', { done: (s, R2) => ['cloud', 'tifa', 'cid', 'yuffie', 'barret', 'redxiii', 'vincent', 'caitsith'].every(id => !R2.limits.need(FF7.state.chars[id], 3)) }],
    ['shop', 'r_ikeep', { buy: [['tent', 30], ['phoenix_down', 50]], lenient: true, done: (s, R2) => ['cloud', 'tifa', 'cid', 'yuffie', 'barret', 'redxiii', 'vincent', 'caitsith'].every(id => !R2.limits.need(FF7.state.chars[id], 3)) }],
    ['limitReady', ['cloud', 'tifa', 'cid', 'yuffie', 'barret', 'redxiii', 'vincent', 'caitsith'], { at: [278, 245], max: 200, budget: 2000000 }],
    ['goto', 'mideel_ruins'],                                          // restocked for the Northern Cave (the camp uses them up)
    ['shop', 'r_ikeep', { buy: [['phoenix_down', 40], ['tent', 10]], lenient: true }],
    // the eccentric woman (met before the quake, C10) sells what Mideel's weapon and materia counters did: the Crystal
    // weapons the gil didn't stretch to then (after the camp: its fights' gil)
    ['collect', { kinds: ['materia', 'gear'], keepGil: 30000, shops: [['mideel_ruins', 'r_crazy', 'mideel_weapons', 'Weapons', 'mideel'], ['mideel_ruins', 'r_crazy', 'mideel_materia', 'Materia']] }],
    // ---- the fallback for C12a's prize racing (Sneak Attack, Enemy Away), when its cap came first
    ['obj', 'Chocobo racing: Sneak Attack and Enemy Away', { done: (s, R2) => R2.c12aPrizesWon(s, R2) }],
    ['try', ['c12a_prizes', ['sneak_attack', 'enemy_away'], { max: 150 }], { done: (s, R2) => R2.c12aPrizesWon(s, R2), budget: 800000 }],
    // ---- the Battle Square's Special Battle: Cloud alone, eight rounds, for Final Attack (it opens once Omnislash is
    // learned: the manual is read when the camp above has taught Cloud's Finishing Touch)
    ['obj', 'The Battle Square: the Special Battle'],
    ['party', ['cloud', 'tifa', 'cid']],
    ['loadout', 'cloud', { weapon: [['knights_of_round', 'hp_absorb'], 'w_summon', 'mime', 'hp_plus', 'hp_plus', 'magic_plus', ['restore', 'all']], done: 'c12a_special_clear' }],
    ['heal', { below: 0.95, done: 'c12a_special_clear' }],
    // (alone: Knights of the Round, then Mime every turn, HP Absorb to heal; an Elixir when low, a Turbo Ether when dry)
    ['battle', { weapon: { mime: true, solo: true, always: true } }],
    ['c12b_special', { tries: 4, done: 'c12a_special_clear', budget: 400000 }],
    ['battle', {}],
    ['heal', { below: 0.9, mp: 0.5 }],
    ['c12b_aboard'],
    // (the chapter's last step sets a marker its closing guard checks: a game resumed anywhere in the chapter's tail
    // - the shops, the Limit camp - carries on there instead of past it)
    ['js', (s) => { s.set('c12b_set_out'); return true; }],
    ['expect', ['c12b_ultimate_dead', 'c12b_ruby_dead', 'c12b_luc_gifts', 'c12b_set_out']],
    ['ckpt', 'c12b_end'],
  ];
})();

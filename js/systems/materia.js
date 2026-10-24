// Materia: instances { id, ap, eskills? }, levels, linked slots, support pairings and the
// abilities (commands / spells / summons) a character gets from what's equipped.
(function () {
  const U = FF7.util;
  const M = FF7.sys.materia = {};
  const STOCK_MAX = 200;

  M.def = (m) => m ? FF7.data.materia[m.id] : null;
  M.make = function (id, ap = 0) {
    const m = { id, ap: ap || 0 };
    if (id === 'enemy_skill') m.eskills = [];
    return m;
  };
  M.maxLevel = (def) => def ? ((def.ap && def.ap.length) ? def.ap.length + 1 : 1) : 1;
  M.level = function (m) {
    const def = M.def(m); if (!def || !def.ap) return 1;
    let lv = 1;
    for (const t of def.ap) if (m.ap >= t) lv++;
    return lv;
  };
  M.isMaster = (m) => { const d = M.def(m); return d && d.ap && d.ap.length > 0 && M.level(m) >= M.maxLevel(d); };
  M.apToNext = function (m) {
    const def = M.def(m); if (!def || !def.ap || M.isMaster(m)) return 0;
    return def.ap[M.level(m) - 1] - m.ap;
  };
  M.color = function (typeOrId) {
    const t = FF7.data.materia[typeOrId] ? FF7.data.materia[typeOrId].type : typeOrId;
    return { magic: '#30d050', summon: '#ff4040', support: '#4080ff', command: '#f0e040', independent: '#c060f0' }[t] || '#aaa';
  };
  // force: materia coming off equipment is never destroyed, even past the 200 limit (only new finds are refused)
  M.toStock = function (m, force) {
    if (!m) return;
    if (!force && FF7.state.materia.length >= STOCK_MAX) return false;
    FF7.state.materia.push(m);
    return true;
  };

  // All equipped materia instances (non-null)
  M.equippedList = function (c) {
    return [].concat(c.weaponMateria || [], c.armorMateria || []).filter(Boolean);
  };
  // Linked pairs in a slot array given `links` pairs at the start.
  function pairsOf(arr, links) {
    const out = [];
    for (let i = 0; i < links; i++) {
      const a = arr[i * 2], b = arr[i * 2 + 1];
      if (a && b) out.push([a, b]);
    }
    return out;
  }
  M.weaponLinks = (c) => { const w = FF7.sys.stats.weapon(c); return w ? w.links || 0 : 0; };
  M.armorLinks = (c) => { const a = FF7.sys.stats.armor(c); return a ? a.links || 0 : 0; };
  M.allPairs = function (c) {
    return pairsOf(c.weaponMateria || [], M.weaponLinks(c)).map(p => ({ p, where: 'weapon' }))
      .concat(pairsOf(c.armorMateria || [], M.armorLinks(c)).map(p => ({ p, where: 'armor' })));
  };
  // Pairs where one side is support `supportId`: returns [{support, other, where}]
  function supportPairs(c, supportId, where) {
    const out = [];
    for (const { p, where: w } of M.allPairs(c)) {
      if (where && w !== where) continue;
      for (let k = 0; k < 2; k++) {
        const s = p[k], o = p[1 - k];
        const sd = M.def(s);
        if (sd && sd.type === 'support' && (sd.support || s.id) === supportId) {
          const od = M.def(o);
          if (od && od.type !== 'support') out.push({ support: s, other: o, where: w });
        }
      }
    }
    return out;
  }
  M.supportPairs = supportPairs;
  M.armorPairs = (c, id) => supportPairs(c, id, 'armor');
  M.weaponPairs = (c, id) => supportPairs(c, id, 'weapon');
  // All supports linked to a given materia instance
  M.supportsOf = function (c, m) {
    const out = [];
    for (const { p } of M.allPairs(c)) {
      const idx = p.indexOf(m);
      if (idx < 0) continue;
      const s = p[1 - idx], sd = M.def(s);
      if (sd && sd.type === 'support') out.push({ id: sd.support || s.id, level: M.level(s), inst: s });
    }
    return out;
  };

  // Encounter rate factor from Enemy Lure / Enemy Away on the party (Enemy Mechanics FAQ 3.1; the Walkthrough's
  // materia list): the Enemy Lure Value starts at 16/16; each Enemy Lure adds 7/16 (L1) or 14/16 (L2+), each Enemy
  // Away takes as much off, stacking additively, kept between 2/16 and 32/16. On the World Map a value over 16/16
  // counts double.
  M.encounterFactor = function (world) {
    let v = 16;
    (FF7.sys.party.active ? FF7.sys.party.active() : []).forEach(c => {
      M.indepLevels(c, 'enemy_lure').forEach(lv => { v += lv >= 2 ? 14 : 7; });
      M.indepLevels(c, 'enemy_away').forEach(lv => { v -= lv >= 2 ? 14 : 7; });
    });
    v = U.clamp(v, 2, 32);
    if (world && v > 16) v *= 2;
    return v / 16;
  };
  M.hasIndep = (c, id) => M.equippedList(c).some(m => { const d = M.def(m); return d && d.type === 'independent' && (d.indep || m.id) === id; });
  M.indepLevels = (c, id) => M.equippedList(c).filter(m => { const d = M.def(m); return d && d.type === 'independent' && (d.indep || m.id) === id; }).map(M.level);
  M.indepTotal = (c, id) => M.indepLevels(c, id).reduce((a, b) => a + b, 0);

  // Element tied to a materia (for Elemental pairing)
  const ELEM = { fire: 'fire', ice: 'ice', lightning: 'lightning', earth: 'earth', poison: 'poison', gravity: 'gravity',
    shiva: 'ice', ifrit: 'fire', ramuh: 'lightning', titan: 'earth', leviathan: 'water', alexander: 'holy', phoenix: 'fire',
    typhoon: 'wind', choco_mog: 'wind', bahamut: null, comet: null, contain: null, kujata: null };   // (Elemental: Wind from Choco/Mog and Typhoon)
  M.elementOf = (id) => ELEM[id] || null;
  const STAT = { poison: ['poison'], seal: ['sleep', 'silence'], mystify: ['confusion', 'berserk'], transform: ['frog', 'small'],
    time: ['slow', 'stop'], destruct: ['death'], odin: ['death'], hades: ['poison', 'sleep', 'confusion', 'silence', 'small', 'frog'],
    choco_mog: ['stop'], contain: ['confusion', 'stop', 'petrify'], exit: [], shiva: [], kujata: [] };
  M.statusOf = (id) => STAT[id] || null;

  // Command materia a Counter / Sneak Attack / Final Attack can use (the "Can be paired with" lists)
  const AUTO_CMD = ['steal', 'sense', 'throw', 'morph', 'deathblow', 'manipulate', 'mime', 'master_command'];

  // ---------- Abilities from equipped materia ----------
  // Returns { commands:[ids], spells:[{id, supports}], summons:[{id, uses, supports}], eskills:[ids], counters:[...] }
  M.abilities = function (c) {
    const res = { commands: [], spells: [], summons: [], eskills: [], cmdSupports: {}, allCmdSupports: [], magicSupports: {}, counters: [], magicCounters: [], sneak: [], final: [] };
    const spellMap = {};
    const addSpell = (id, sup) => {
      if (!FF7.data.spells[id]) return;
      if (!spellMap[id]) { spellMap[id] = { id, supports: [] }; res.spells.push(spellMap[id]); }
      sup.forEach(s => spellMap[id].supports.push(s));
    };
    let hasMagic = false, hasSummon = false, wMagic = false, wSummon = false, wItem = false, attackCmd = 'attack', eskill = false;
    const extra = [];
    const guest = FF7.data.characters[c.id] && FF7.data.characters[c.id].guestSpells;
    if (guest) { hasMagic = true; guest.forEach(s => addSpell(s, [])); }
    for (const m of M.equippedList(c)) {
      const d = M.def(m); if (!d) continue;
      const lv = M.level(m);
      const sup = M.supportsOf(c, m);
      // the automatic uses of a linked materia (Walkthrough / Party Mechanics, support materia): Sneak Attack and
      // Final Attack with Magic, Summon or the listed Command materia; Counter with those Command materia; Magic
      // Counter with Magic and Summon materia (FF7.battle.actions.materiaAct builds the action)
      if (d.type === 'magic' || d.type === 'summon' || (d.type === 'command' && AUTO_CMD.includes(m.id))) {
        sup.forEach(s => {
          if (s.id === 'sneak_attack') res.sneak.push({ materia: m, level: s.level });
          else if (s.id === 'final_attack') res.final.push({ materia: m, level: s.level });
          else if (s.id === 'counter' && d.type === 'command') res.counters.push({ materia: m, level: s.level, command: m.id === 'master_command' ? null : m.id });
          else if (s.id === 'magic_counter' && d.type !== 'command') res.magicCounters.push({ materia: m, level: s.level, spell: d.type === 'magic' ? ((d.spells || []).filter(([sp, l]) => lv >= l).slice(-1)[0] || [])[0] : null });
        });
      }
      if (d.type === 'magic') {
        hasMagic = true;
        if (m.id === 'master_magic') {
          for (const k in FF7.data.materia) { const md = FF7.data.materia[k]; if (md.type === 'magic' && md.spells) md.spells.forEach(([s]) => addSpell(s, sup)); }
        } else (d.spells || []).forEach(([s, l]) => { if (lv >= l) addSpell(s, sup); });
      } else if (d.type === 'summon') {
        hasSummon = true;
        if (m.id === 'master_summon') {
          for (const k in FF7.data.summons) res.summons.push({ id: k, uses: 99, supports: sup, inst: m });
        } else if (d.summon && FF7.data.summons[d.summon]) {
          res.summons.push({ id: d.summon, uses: M.isMaster(m) ? 99 : lv, supports: sup, inst: m });
        }
      } else if (d.type === 'command') {
        const cmds = d.commands || [[m.id, 1]];
        let best = null;
        cmds.forEach(([cid, l]) => { if (lv >= l) best = cid; });
        // Master Command: its HP / MP Absorb, Added Cut and Steal as well work on every command but Limit, Magic,
        // Summon and E.Skill (Party Mechanics Guide)
        if (m.id === 'master_command') { ['steal', 'sense', 'throw', 'morph', 'deathblow', 'manipulate', 'mime'].forEach(x => extra.push(x)); res.allCmdSupports = res.allCmdSupports.concat(sup); continue; }
        if (m.id === 'enemy_skill') { eskill = true; (m.eskills || []).forEach(e => { if (!res.eskills.includes(e)) res.eskills.push(e); }); continue; }
        if (!best) continue;
        if (best === 'w_magic') { wMagic = true; continue; }
        if (best === 'w_summon') { wSummon = true; continue; }
        if (best === 'w_item') { wItem = true; continue; }
        if (best === 'slash_all' || best === 'flash' || best === 'double_cut' || best === '4x_cut') { attackCmd = best; continue; }
        extra.push(best);
        res.cmdSupports[best] = (res.cmdSupports[best] || []).concat(sup);
      }
    }
    res.commands.push(attackCmd);
    if (hasMagic) res.commands.push(wMagic ? 'w_magic' : 'magic');
    else if (wMagic) res.commands.push('w_magic');
    if (hasSummon) res.commands.push(wSummon ? 'w_summon' : 'summon');
    else if (wSummon) res.commands.push('w_summon');
    res.commands.push(wItem ? 'w_item' : 'item');
    if (eskill) extra.unshift('enemy_skill');
    extra.forEach(e => { if (!res.commands.includes(e)) res.commands.push(e); });
    // sort spells in materia menu order (fire first...)
    const order = Object.keys(FF7.data.spells);
    res.spells.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    return res;
  };

  // Spells castable in the field (heal / revive / cure / status on allies)
  M.fieldSpells = function (c) {
    return M.abilities(c).spells.filter(s => {
      const d = FF7.data.spells[s.id];
      return d && ['heal', 'revive', 'cure', 'fullcure'].includes(d.kind) && /ally|allAllies|any/.test(d.target || 'ally');
    });
  };

  // Grant AP to all equipped materia; returns [{char, materia, levelUp, mastered, born}]
  M.gainAp = function (c, ap) {
    const events = [];
    const w = FF7.sys.stats.weapon(c), a = FF7.sys.stats.armor(c);
    const grow = (arr, g) => {
      (arr || []).forEach(m => {
        if (!m) return;
        const d = M.def(m); if (!d || !d.ap || !d.ap.length) return;
        if (M.isMaster(m)) return;
        const mult = g == null ? 1 : g;
        if (mult <= 0) return;
        const before = M.level(m);
        m.ap = Math.min(9999999, m.ap + ap * mult);
        const after = M.level(m);
        if (after > before) {
          const mastered = M.isMaster(m);
          events.push({ char: c.id, materia: m, level: after, mastered });
          if (mastered && !['enemy_skill', 'master_magic', 'master_summon', 'master_command'].includes(m.id)) {
            // FF7: a mastered materia gives birth to a new Lv1 copy
            if (M.toStock(M.make(m.id))) events[events.length - 1].born = true;
          }
        }
      });
    };
    grow(c.weaponMateria, w ? (w.growth != null ? w.growth : 1) : 1);
    grow(c.armorMateria, a ? (a.growth != null ? a.growth : 1) : 1);
    FF7.sys.stats.recalc(c);
    return events;
  };

  // Remove all materia from a character into stock
  M.unequipAll = function (c) {
    ['weaponMateria', 'armorMateria'].forEach(k => { c[k] = c[k].map(m => { if (m) M.toStock(m, true); return null; }); });
    FF7.sys.stats.recalc(c);
  };
})();

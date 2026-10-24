// Character stats: FF7 level-up algorithm (Terence's Party Mechanics Guide), derived stats,
// equipment and experience.
(function () {
  const U = FF7.util;
  const ST = FF7.sys.stats = {};

  // Primary-stat curves [gradient, base] per rank (0..29) per bracket.
  const CURVES = [
    [[130, 12], [160, 9], [160, 9], [120, 21], [70, 44], [60, 50], [50, 57], [30, 73]],
    [[120, 13], [130, 12], [133, 11], [135, 11], [120, 17], [72, 43], [55, 53], [21, 80]],
    [[130, 12], [140, 10], [140, 11], [110, 21], [90, 32], [70, 43], [48, 56], [27, 73]],
    [[130, 12], [120, 13], [135, 11], [120, 15], [85, 33], [70, 40], [53, 51], [32, 69]],
    [[120, 10], [128, 9], [130, 8], [130, 8], [77, 30], [72, 33], [61, 40], [35, 61]],
    [[120, 12], [125, 12], [117, 14], [118, 14], [93, 23], [52, 49], [44, 55], [35, 62]],
    [[110, 10], [130, 8], [145, 5], [110, 17], [100, 17], [75, 30], [44, 50], [31, 61]],
    [[120, 11], [135, 10], [130, 11], [110, 16], [85, 27], [70, 33], [60, 37], [35, 58]],
    [[100, 12], [130, 9], [125, 10], [120, 11], [77, 29], [67, 34], [43, 49], [31, 58]],
    [[110, 9], [120, 8], [122, 8], [123, 8], [80, 26], [75, 29], [55, 42], [44, 48]],
    [[100, 9], [115, 9], [124, 7], [118, 8], [107, 11], [78, 26], [42, 48], [36, 53]],
    [[110, 11], [120, 10], [115, 12], [102, 17], [91, 21], [37, 49], [40, 48], [40, 48]],
    [[100, 9], [122, 9], [140, 6], [135, 8], [83, 29], [40, 51], [30, 57], [25, 62]],
    [[110, 10], [122, 9], [130, 7], [98, 16], [83, 22], [45, 43], [44, 45], [33, 54]],
    [[110, 8], [105, 9], [104, 11], [102, 13], [93, 16], [87, 18], [51, 40], [25, 60]],
    [[115, 9], [127, 9], [121, 11], [108, 15], [86, 23], [68, 32], [41, 48], [24, 62]],
    [[114, 10], [118, 9], [114, 10], [95, 16], [82, 22], [71, 28], [37, 49], [30, 55]],
    [[112, 10], [115, 10], [111, 10], [103, 13], [83, 21], [48, 39], [39, 45], [25, 57]],
    [[100, 10], [108, 10], [115, 9], [108, 11], [83, 21], [55, 35], [31, 51], [24, 57]],
    [[100, 9], [111, 8], [112, 9], [87, 17], [53, 32], [45, 37], [39, 42], [34, 47]],
    [[100, 10], [108, 9], [114, 8], [106, 11], [63, 29], [45, 39], [33, 47], [26, 53]],
    [[100, 8], [110, 7], [127, 4], [77, 20], [50, 31], [41, 36], [40, 37], [31, 46]],
    [[100, 9], [102, 9], [101, 10], [88, 15], [70, 21], [57, 28], [45, 35], [24, 53]],
    [[100, 9], [100, 9], [107, 8], [85, 14], [77, 18], [60, 25], [30, 44], [24, 50]],
    [[95, 8], [90, 9], [88, 12], [85, 13], [62, 22], [52, 29], [39, 38], [18, 55]],
    [[80, 7], [85, 7], [115, 1], [92, 8], [78, 13], [64, 20], [27, 42], [21, 46]],
    [[72, 6], [69, 7], [76, 6], [77, 6], [68, 10], [50, 19], [22, 36], [21, 37]],
    [[70, 6], [53, 9], [63, 8], [70, 6], [69, 7], [58, 13], [28, 31], [20, 37]],
    [[70, 5], [70, 6], [70, 7], [71, 7], [67, 9], [48, 18], [16, 38], [16, 38]],
    [[65, 5], [63, 6], [76, 4], [61, 9], [49, 14], [36, 20], [28, 24], [20, 30]],
  ];
  const HP_GAIN = [40, 50, 50, 60, 70, 80, 90, 100, 110, 120, 130, 150];
  const MP_GAIN = [20, 30, 30, 50, 70, 80, 90, 100, 110, 120, 140, 160];

  // Bracket index for the level being earned.
  ST.bracket = (lvl) => lvl <= 11 ? 0 : lvl <= 21 ? 1 : lvl <= 31 ? 2 : lvl <= 41 ? 3 : lvl <= 51 ? 4 : lvl <= 61 ? 5 : lvl <= 81 ? 6 : 7;

  // Total XP needed to reach `lvl`.
  const xpCache = {};
  ST.xpFor = function (id, lvl) {
    if (lvl <= 1) return 0;
    if (lvl > 99) return Infinity;
    const key = id + ':' + lvl;
    if (xpCache[key] != null) return xpCache[key];
    const def = FF7.data.characters[id];
    const mod = def.xpMod[ST.bracket(lvl)];
    let xp = 0;
    for (let i = 1; i < lvl; i++) xp += Math.floor(mod * i * i / 10);
    return (xpCache[key] = xp);
  };
  ST.xpToNext = (c) => c.level >= 99 ? 0 : Math.max(0, ST.xpFor(c.id, c.level + 1) - c.xp);

  // Apply one level-up (FF7 algorithm). Returns gains.
  ST.levelUp = function (c) {
    const def = FF7.data.characters[c.id];
    const L = c.level + 1;
    const br = ST.bracket(L);
    const gains = { hp: 0, mp: 0 };
    for (const s of ['str', 'vit', 'mag', 'spr', 'dex']) {
      const [g, b] = CURVES[def.ranks[s]][br];
      const baseline = b + Math.floor(g * L / 100);
      const diff = U.clamp(U.randRange(1, 8) + baseline - c.stats[s], 0, 11);
      const gain = diff <= 3 ? 0 : diff <= 6 ? 1 : diff <= 9 ? 2 : 3;
      const nv = Math.min(100, c.stats[s] + gain);
      gains[s] = nv - c.stats[s];
      c.stats[s] = nv;
    }
    { // luck
      const [g, b] = def.lck[br];
      const baseline = b + Math.floor(g * L / 100);
      const diff = U.clamp(U.randRange(1, 8) + baseline - c.stats.lck, 0, 11);
      const gain = diff <= 3 ? 0 : diff <= 6 ? 1 : diff <= 9 ? 2 : 3;
      const nv = Math.min(100, c.stats.lck + gain);
      gains.lck = nv - c.stats.lck; c.stats.lck = nv;
    }
    { // HP
      const [g, b] = def.hp[br];
      const baseline = b + (L - 1) * g;
      const diff = U.clamp(U.randRange(1, 8) + Math.floor(100 * baseline / Math.max(1, c.maxHpBase)) - 100, 0, 11);
      const gain = Math.floor(g * HP_GAIN[diff] / 100);
      const nv = Math.min(9999, c.maxHpBase + gain);
      gains.hp = nv - c.maxHpBase; c.maxHpBase = nv;
    }
    { // MP
      const [g, b] = def.mp[br];
      const baseline = b + Math.floor((L - 1) * g / 10);
      const baseGain = Math.floor(L * g / 10) - Math.floor((L - 1) * g / 10);
      const diff = U.clamp(U.randRange(1, 8) + Math.floor(100 * baseline / Math.max(1, c.maxMpBase)) - 100, 0, 11);
      const gain = Math.floor(baseGain * MP_GAIN[diff] / 100);
      const nv = Math.min(999, c.maxMpBase + gain);
      gains.mp = nv - c.maxMpBase; c.maxMpBase = nv;
    }
    c.level = L;
    const oldMax = c.maxHp, oldMaxMp = c.maxMp;
    ST.recalc(c);
    // current HP/MP rise with the max (FF7 adds the gain)
    c.hp = Math.min(c.maxHp, c.hp + Math.max(0, c.maxHp - oldMax));
    c.mp = Math.min(c.maxMp, c.mp + Math.max(0, c.maxMp - oldMaxMp));
    return gains;
  };

  // Add XP; returns number of levels gained.
  ST.gainXp = function (c, amount) {
    c.xp = Math.min(9999999, c.xp + Math.floor(amount));
    let n = 0;
    while (c.level < 99 && c.xp >= ST.xpFor(c.id, c.level + 1)) { ST.levelUp(c); n++; }
    return n;
  };

  // Level a freshly created character up to `lvl` (auto-level on joining).
  ST.autoLevel = function (c, lvl) {
    lvl = U.clamp(Math.floor(lvl), 1, 98);
    while (c.level < lvl) {
      c.xp = Math.max(c.xp, ST.xpFor(c.id, c.level + 1));
      ST.levelUp(c);
    }
    c.hp = c.maxHp; c.mp = c.maxMp;
  };

  // ---------- Equipment ----------
  ST.weapon = (c) => FF7.data.weapons[c.weapon] || null;
  ST.armor = (c) => FF7.data.armor[c.armor] || null;
  ST.accessory = (c) => FF7.data.accessories[c.accessory] || null;

  // Make materia arrays match equipment slot counts; overflow goes back to stock.
  ST.fitMateriaSlots = function (c) {
    const w = ST.weapon(c), a = ST.armor(c);
    const fit = (arr, n) => {
      arr = arr || [];
      while (arr.length > n) { const m = arr.pop(); if (m && FF7.state) FF7.sys.materia.toStock(m, true); }
      while (arr.length < n) arr.push(null);
      return arr;
    };
    c.weaponMateria = fit(c.weaponMateria, w ? (w.slots || 0) : 0);
    c.armorMateria = fit(c.armorMateria, a ? (a.slots || 0) : 0);
  };

  // Recompute derived stats into c.d, c.maxHp, c.maxMp.
  ST.recalc = function (c) {
    const w = ST.weapon(c), a = ST.armor(c), acc = ST.accessory(c);
    const d = {};
    for (const s of ['str', 'vit', 'mag', 'spr', 'dex', 'lck']) d[s] = c.stats[s] + (c.bonus ? c.bonus[s] || 0 : 0);
    let hpPct = 0, mpPct = 0;
    const addStats = (st) => { if (!st) return; for (const k in st) { if (k === 'hpPct') hpPct += st[k]; else if (k === 'mpPct') mpPct += st[k]; else if (d[k] != null) d[k] += st[k]; } };
    if (w) { addStats(w.stats); if (w.mag && !(w.stats && w.stats.mag)) d.mag += w.mag; }
    if (a) addStats(a.stats);
    if (acc) addStats(acc.stats);
    // materia stat modifiers + independent materia
    const M = FF7.sys.materia;
    const ind = { magPct: 0, dexPct: 0, lckPct: 0 };
    for (const m of M.equippedList(c)) {
      const def = FF7.data.materia[m.id]; if (!def) continue;
      addStats(def.stats);
      const lv = M.level(m);
      switch (def.indep) {
        case 'hp_plus': hpPct += 10 * lv; break;
        case 'mp_plus': mpPct += 10 * lv; break;
        case 'magic_plus': ind.magPct += 10 * lv; break;
        case 'speed_plus': ind.dexPct += 10 * lv; break;
        case 'luck_plus': ind.lckPct += 10 * lv; break;
      }
    }
    // Magic / Speed / Luck Plus: +10% a level, stacking to +100% at most, of the base stat only (the character's own,
    // Sources included), not of the static bonuses from equipment and other materia; HP / MP Plus: +10% a level,
    // the materia's total bonus at most +100% (the Walkthrough's materia list)
    const base = (k) => c.stats[k] + (c.bonus ? c.bonus[k] || 0 : 0);
    d.mag += Math.floor(base('mag') * Math.min(100, ind.magPct) / 100);
    d.dex += Math.floor(base('dex') * Math.min(100, ind.dexPct) / 100);
    d.lck += Math.floor(base('lck') * Math.min(100, ind.lckPct) / 100);
    hpPct = Math.min(100, hpPct); mpPct = Math.min(100, mpPct);
    for (const s of ['str', 'vit', 'mag', 'spr', 'dex', 'lck']) d[s] = U.clamp(d[s], 1, 255);
    d.atk = d.str + (w ? w.atk || 0 : 0);
    d.hit = w ? (w.hit || 96) : 96;
    d.def = d.vit + (a ? a.def || 0 : 0);
    d.defPct = Math.floor(d.dex / 4) + (a ? a.defPct || 0 : 0);
    d.mat = d.mag;
    d.mdf = d.spr + (a ? a.mdef || 0 : 0);
    d.mdfPct = a ? a.mdefPct || 0 : 0;
    d.crit = w ? (w.crit || 0) : 0;
    c.d = d;
    c.maxHp = U.clamp(Math.floor(c.maxHpBase * (1 + hpPct / 100)), 1, 9999);
    c.maxMp = U.clamp(Math.floor(c.maxMpBase * (1 + mpPct / 100)), 0, 999);
    if (M.hasIndep(c, 'hp_mp')) { const t = c.maxHp; c.maxHp = U.clamp(c.maxMp, 1, 9999); c.maxMp = U.clamp(t, 0, 999); }
    if (c.hp > c.maxHp) c.hp = c.maxHp;
    if (c.mp > c.maxMp) c.mp = c.maxMp;
  };

  // Equip an item from inventory (weapon / armor / accessory). Returns previous id.
  ST.equip = function (c, slot, id) {
    const inv = FF7.sys.inv;
    const prev = c[slot];
    if (id && !inv.remove(id, 1)) return null;
    if (prev) inv.add(prev, 1);
    c[slot] = id || null;
    if (slot !== 'accessory') ST.fitMateriaSlots(c);
    ST.recalc(c);
    return prev;
  };

  // Elemental / status defense from armor + accessory (+ Elemental/Added Effect pairs in armor).
  ST.elemDefense = function (c) {
    const out = {};
    const rank = { weak: -1, halve: 1, nullify: 2, absorb: 3 };
    const add = (el, v) => { if (!out[el] || rank[v] > rank[out[el]]) out[el] = v; };
    [ST.armor(c), ST.accessory(c)].forEach(e => { if (e && e.elem) for (const el in e.elem) add(el, e.elem[el]); });
    for (const p of FF7.sys.materia.armorPairs(c, 'elemental')) {
      const lv = FF7.sys.materia.level(p.support);
      const el = FF7.sys.materia.elementOf(p.other.id);
      if (el) add(el, lv >= 3 ? 'absorb' : lv === 2 ? 'nullify' : 'halve');
    }
    return out;
  };
  ST.statusDefense = function (c) {
    const out = new Set();
    [ST.armor(c), ST.accessory(c)].forEach(e => { if (e && e.statusDef) e.statusDef.forEach(s => out.add(s)); });
    for (const p of FF7.sys.materia.armorPairs(c, 'added_effect')) (FF7.sys.materia.statusOf(p.other.id) || []).forEach(s => out.add(s));
    return out;
  };
})();

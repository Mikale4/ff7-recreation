// Kupomon's stats, the expansion (the user's design, 2026-10-02; docs/KUPOMON.md "Stats"):
//  * Six stats, Pokémon's: HP, Attack, Defense, Magic (Special Attack), Resistance (Special Defense), Speed. A move is
//    Physical (Attack against Defense), Magic (Magic against Resistance) or Status (KP.category).
//  * IVs: 0-31 for each stat, rolled when a moogle is made (bred ones inherit three of their parents', kp_breed.js).
//    No EVs.
//  * Appetites are Pokémon's Natures: a moogle's own tastes, +10% to one stat and -10% to another (five are balanced).
//  * Pokémon's stat formula, as Showdown computes it (sim/battle.ts statModify, EVs 0); then the bred "+" (4% a plus).
//  * The level cap is 50: every level in the game written for the old cap of 30 is read through KP.LV (5/3 of it).
//  * Showdown's integer maths (sim/dex.ts trunc, sim/battle.ts modify / chainModify), for the damage formula
//    (js/kupomon/kp_calc.js).
// Saves from before (Kupomon state v < 2) are brought up to date when they're loaded (KP.migrate).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};

  KP.MAX_LEVEL = 50;
  KP.STATS = ['hp', 'atk', 'def', 'mag', 'res', 'spd'];
  KP.STAT_LABEL = { hp: 'HP', atk: 'Attack', def: 'Defense', mag: 'Magic', res: 'Resistance', spd: 'Speed' };
  KP.STAT_SHORT = { hp: 'HP', atk: 'Atk', def: 'Def', mag: 'Mag', res: 'Res', spd: 'Spe' };
  // a level written for the old cap (30) on the new one (50)
  KP.LV = (lv) => lv <= 1 ? lv : Math.max(1, Math.min(KP.MAX_LEVEL, Math.round(lv * 5 / 3)));

  // ------------------------------------------------------------------ Showdown's integer maths
  // trunc: to an unsigned 32-bit integer (or 'bits' bits); modify: value x numerator/denominator in 4096ths, rounded
  // half down; a Chain: chainModify's running modifier (each link rounded to 4096ths), applied once at the end
  KP.tr = (n, bits) => bits ? (n >>> 0) % (2 ** bits) : n >>> 0;
  KP.modify = function (value, num, den = 1) {
    if (Array.isArray(num)) { den = num[1]; num = num[0]; }
    const m = KP.tr(num * 4096 / den);
    return KP.tr((KP.tr(value * m) + 2048 - 1) / 4096);
  };
  KP.Chain = class {
    constructor() { this.m = 1; }
    mul(num, den = 1) {
      if (Array.isArray(num)) { den = num[1]; num = num[0]; }
      if (num == null || (num === 1 && den === 1)) return this;
      const prev = KP.tr(this.m * 4096), next = KP.tr(num * 4096 / den);
      this.m = ((prev * next + 2048) >> 12) / 4096;
      return this;
    }
    apply(v) { return this.m === 1 ? v : KP.modify(v, this.m); }
  };
  // a stat at a stage (-6..+6): Showdown's calculateStat
  const BOOST = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  KP.boosted = (stat, stage) => {
    const s = Math.max(-6, Math.min(6, stage || 0));
    return s >= 0 ? Math.floor(stat * BOOST[s]) : Math.floor(stat / BOOST[-s]);
  };

  // ------------------------------------------------------------------ Appetites (Pokémon's Natures)
  // { name, plus, minus, likes }: its tastes, +10% to plus and -10% to minus; the five balanced ones change nothing
  const APP = (name, plus, minus, likes) => ({ name, plus, minus, likes });
  KP.APPETITES = {
    greedy: APP('Greedy', 'atk', 'def', 'Grabs the biggest nut first'),
    gobbler: APP('Gobbler', 'atk', 'spd', 'Eats everything, slowly'),
    hearty: APP('Hearty', 'atk', 'mag', 'Loves a filling meal'),
    ravenous: APP('Ravenous', 'atk', 'res', 'Always hungry for more'),
    nibbler: APP('Nibbler', 'def', 'atk', 'Takes tiny bites'),
    grazer: APP('Grazer', 'def', 'spd', 'Snacks all day long'),
    hoarder: APP('Hoarder', 'def', 'mag', 'Hides nuts for later'),
    snacker: APP('Snacker', 'def', 'res', 'Never without a snack'),
    dainty: APP('Dainty', 'mag', 'atk', 'Eats with tiny manners'),
    gourmet: APP('Gourmet', 'mag', 'def', 'Only the finest nuts'),
    savorer: APP('Savorer', 'mag', 'spd', 'Savours every mouthful'),
    spicy: APP('Spice-Lover', 'mag', 'res', 'The hotter the better'),
    sipper: APP('Sipper', 'res', 'atk', 'Prefers a nice drink'),
    picky: APP('Picky', 'res', 'def', 'Turns its nose up at most food'),
    chewer: APP('Slow Chewer', 'res', 'spd', 'Chews every bite twenty times'),
    plain: APP('Plain Eater', 'res', 'mag', 'Likes its food plain'),
    snatcher: APP('Snatcher', 'spd', 'atk', 'Snatches food and runs'),
    gulper: APP('Gulper', 'spd', 'def', 'Swallows it whole'),
    speedy: APP('Fast Eater', 'spd', 'mag', 'Finishes first, every time'),
    peckish: APP('Peckish', 'spd', 'res', 'A little hungry, always'),
    content: APP('Content', null, null, 'Happy with whatever it gets'),
    balanced: APP('Balanced', null, null, 'Eats a sensible diet'),
    easygoing: APP('Easygoing', null, null, 'Eats whenever, wherever'),
    regular: APP('Regular', null, null, 'Meals at the same time each day'),
    steady: APP('Steady', null, null, 'Neither hungry nor full'),
  };
  KP.APPETITE_IDS = Object.keys(KP.APPETITES);
  KP.appetiteOf = (mon) => KP.APPETITES[mon && mon.app] || KP.APPETITES.content;
  KP.randomAppetite = () => KP.APPETITE_IDS[Math.floor(Math.random() * KP.APPETITE_IDS.length)];
  KP.randomIVs = () => { const iv = {}; KP.STATS.forEach(k => { iv[k] = Math.floor(Math.random() * 32); }); return iv; };

  // ------------------------------------------------------------------ the stat formula (Showdown's statModify, EVs 0)
  // HP = trunc(trunc(2B + IV + 100) x L / 100 + 10); the rest trunc(trunc(2B + IV) x L / 100 + 5), the appetite's
  // x1.1 / x0.9 (16-bit, as Showdown); then the bred "+" (x(100 + 4 x plus) / 100)
  KP.stat = function (mon, k) {
    const sp = KP.sp(mon), B = (sp.base || {})[k] != null ? sp.base[k] : 40, L = mon.lv, iv = mon.iv && mon.iv[k] != null ? mon.iv[k] : 15, tr = KP.tr;
    let v;
    if (k === 'hp') v = tr(tr(2 * B + iv + 100) * L / 100 + 10);
    else {
      v = tr(tr(2 * B + iv) * L / 100 + 5);
      const a = KP.appetiteOf(mon);
      if (a.plus === k) v = tr(tr(v * 110, 16) / 100);
      else if (a.minus === k) v = tr(tr(v * 90, 16) / 100);
    }
    return mon.plus ? tr(v * (100 + 4 * mon.plus) / 100) : v;
  };
  KP.maxHp = (mon) => KP.stat(mon, 'hp');
  KP.bst = (sp) => { const b = (KP.SPECIES[sp] || {}).base || {}; return KP.STATS.reduce((a, k) => a + (b[k] || 0), 0); };

  // a new moogle: its IVs and appetite (o.iv / o.app to set them: a bred one's, a gift's)
  const make0 = KP.make;
  KP.make = function (spId, lv, o = {}) {
    const mon = make0.apply(this, arguments);
    mon.iv = o.iv ? Object.assign(KP.randomIVs(), o.iv) : KP.randomIVs();
    mon.app = o.app && KP.APPETITES[o.app] ? o.app : KP.randomAppetite();
    mon.hp = KP.maxHp(mon);
    return mon;
  };

  // ------------------------------------------------------------------ moves: Physical, Magic or Status
  // (o.cat on the move wins; else a status move has no power, and a magic job's move is Magic)
  // a Counter's blow (the ability, kp_battle.js counterBlow): no type, its holder's stronger attacking stat
  KP.counterMove = (f, power) => ({ name: 'Counter', power: power || 50, type: null, cat: f.stat('atk') >= f.stat('mag') ? 'physical' : 'magic', acc: true, flags: [] });
  KP.category = (mv) => !mv ? 'status' : mv.cat || (!mv.power ? 'status' : KP.MAGIC && KP.MAGIC[mv.type] ? 'magic' : 'physical');
  KP.CATEGORY_LABEL = { physical: 'Physical', magic: 'Magic', status: 'Status' };

  // ------------------------------------------------------------------ the kinds written before Magic and Resistance
  // existed: their old Attack was their only attacking stat, so a magic job's goes to Magic (its Attack left modest),
  // a fighter keeps it (its Magic modest), and Resistance follows Defense (a caster's a little higher)
  KP.fillSixStats = function () {
    const M = KP.MAGIC || {};
    for (const id of Object.keys(KP.SPECIES)) {
      const b = KP.SPECIES[id].base; if (!b || b.mag != null) continue;
      const magic = M[KP.SPECIES[id].type], red = KP.SPECIES[id].type === 'redmage';
      if (red) { b.mag = b.atk; b.atk = Math.round(b.atk * 0.85); b.res = b.def; }
      else if (magic) { b.mag = b.atk; b.atk = Math.round(b.atk * 0.55 + 10); b.res = Math.round(b.def * 1.1); }
      else { b.mag = Math.round(b.atk * 0.5 + 15); b.res = Math.round(b.def * 0.8); }
    }
  };

  // ------------------------------------------------------------------ the level cap 50: everything written for 30
  // The kinds written before the expansion (all loaded by now): their evolution levels and level-up learnsets, here and
  // once. The wild tables (the maps add theirs later): KP.rescaleWild, once each, when a Kupomon game starts. Trainers'
  // teams are read through KP.LV as they're built (js/kupomon/kp_world.js W.team). New kinds are written for 50.
  KP.OLD_KINDS = new Set(Object.keys(KP.SPECIES));
  for (const id of KP.OLD_KINDS) { const e = KP.SPECIES[id].evo; if (e && e.at) e.at = KP.LV(e.at); }
  for (const id of Object.keys(KP.LEARN || {})) if (KP.OLD_KINDS.has(id)) KP.LEARN[id] = KP.LEARN[id].map(([lv, m]) => [lv <= 1 ? lv : KP.LV(lv), m]);
  KP.rescaleWild = function () {
    for (const t of Object.keys(KP.WILD || {})) {
      const rows = KP.WILD[t]; if (!rows || rows._lv50) continue;
      const out = rows.map(r => r._new ? r : [r[0], r[1], KP.LV(r[2]), KP.LV(r[3])]); out._lv50 = true;
      KP.WILD[t] = out;
    }
    // the content packs' wild rows (kp_content.js KP.WILD_ADD: the expansion's lines), once into each table
    for (const t of Object.keys(KP.WILD_ADD || {})) {
      const tab = KP.WILD[t] = KP.WILD[t] || Object.assign([], { _lv50: true });
      if (tab._added) continue; tab._added = true;
      for (const r of KP.WILD_ADD[t]) if (!tab.some(x => x[0] === r[0])) tab.push(r);
    }
  };

  // ------------------------------------------------------------------ saves from before the expansion (v < 2)
  // every moogle (team, box): its level on the new scale (and the EXP for it), IVs and an appetite rolled, repaired
  KP.migrate = function (st) {
    const d = st && st.kp; if (!d || (d.v || 1) >= 2) return st;
    const fix = (m) => {
      if (!m || !KP.SPECIES[m.sp]) return;
      m.lv = KP.LV(m.lv); m.exp = KP.expAt(m, m.lv);
      if (!m.iv) m.iv = KP.randomIVs();
      if (!m.app) m.app = KP.randomAppetite();
      m.hp = KP.maxHp(m);
    };
    (d.party || []).forEach(fix); (d.box || []).forEach(fix);
    (d.ranch || []).forEach(r => { if (r && r.lv) r.lv = KP.LV(r.lv); });
    d.v = 2;
    return st;
  };

  KP.fillSixStats();
})();

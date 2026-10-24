// Kupomon's battle maths, the expansion (the user's rule, 2026-10-02: "exactly like Pokémon Showdown's, current gen"):
//  * Events, as Showdown's: a moogle's ability, its held item, its states, its side's conditions and the field can
//    each hook a step of the calculation. A handler gets a context ({ B, user, target, holder, move, moveType, cat,
//    eff, crit, contact, real }) and returns a multiplier (chained in 4096ths, Showdown's chainModify; [num, den] for
//    an exact one) or, for the events that pass a value along (ModifySTAB, ModifyCritRatio, ModifyPriority,
//    ModifyType), the new value.
//      the attacker's own: onBasePower, onModifyAtk / onModifyMag (the stat its move uses), onModifySTAB, onModifyType,
//        onModifyDamage (the final modifier), onModifyCritRatio, onModifyAccuracy, onFoeModifyDef / onFoeModifyRes
//        (the target's defence, as the Ruin abilities lower it)
//      the target's, against what hits it: onSourceBasePower, onSourceModifyAtk / onSourceModifyMag,
//        onSourceModifyDamage, onSourceModifyAccuracy; and its own defences: onModifyDef / onModifyRes
//      anyone's own: onModifySpe (Speed), onModifyPriority
//    The battle's own events (switching in, the end of a turn, being hit...) are kp_battle.js B.fire's: generators.
//  * The damage formula, Showdown's getDamage + modifyDamage (sim/battle-actions.ts): base damage
//    trunc(trunc(trunc(trunc(2L/5 + 2) x BP x A) / D) / 50), + 2, the weather (WeatherModifyDamage), the critical hit
//    (x1.5, trunc), the random roll (85-100%), STAB (modify), type effectiveness (x2 a step, trunc halves), Burn
//    (physical x0.5), the final modifiers, at least 1, 16-bit. A critical hit ignores the attacker's lowered stat and
//    the target's raised one.
//  * Critical hits at Gen 7+'s odds: stage 0 1/24, 1 1/8, 2 1/2, 3+ always.
//  * The abilities and held items written before the events: their old keys become handlers here; the expansion's
//    effect keys are js/kupomon/kp_mech.js's (KP.ABILITY_EFFECTS, KP.ITEM_EFFECTS).
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const tr = (n, b) => KP.tr(n, b);
  const typesOf = (mon) => { const s = KP.sp(mon); return [s.type, s.type2].filter(Boolean); };

  // ------------------------------------------------------------------ handlers: an ability's or an item's
  // (a list of handler objects: the functions it defines, its old keys made into handlers, and one per effect key;
  // worked out once and kept on the definition)
  const both = (fn) => ({ onModifyAtk: fn, onModifyMag: fn });
  const own = (def) => { const h = {}; for (const k of Object.keys(def)) if (/^on[A-Z]/.test(k) && typeof def[k] === 'function') h[k] = def[k]; return h; };
  const effects = (def, table) => { const L = []; if (table) for (const k of Object.keys(def)) if (table[k] && def[k] != null && def[k] !== false) L.push(table[k](def[k], def)); return L; };
  KP.abilityHandlers = function (ab) {
    if (!ab) return [];
    const base = KP.ABILITIES[ab.id] || ab;
    if (base._h) return base._h;
    const L = [own(base)];
    // a type's moves stronger (its own types: 'own'), in a pinch if it says so (Blaze's kind: the attacking stat)
    if (base.boost) {
      const b = base.boost;
      L.push(both((c) => {
        const t = c.moveType || (c.move && c.move.type); if (!t) return 1;
        const fits = (b.types || []).includes(t) || ((b.types || []).includes('own') && typesOf(c.user.mon).includes(t));
        return fits && (!b.below || c.user.mon.hp <= KP.maxHp(c.user.mon) * b.below) ? (b.mul || 1.5) : 1;
      }));
    }
    if (base.stab) L.push({ onModifySTAB: (c, stab) => stab > 1 ? base.stab : stab });   // (Adaptability's kind)
    if (base.resist) L.push({ onSourceModifyDamage: (c) => (c.moveType && base.resist[c.moveType]) || 1 });
    if (base.statMul) {   // (the old "attack" was every attack: Attack and Magic; "defense" every defence)
      const m = base.statMul, h = {};
      const put = (k, fn) => { const a = h[k]; h[k] = a ? (c) => a(c) * fn(c) : fn; };
      if (m.atk) { put('onModifyAtk', () => m.atk); if (m.mag == null) put('onModifyMag', () => m.atk); }
      if (m.def) { put('onModifyDef', () => m.def); if (m.res == null) put('onModifyRes', () => m.def); }
      if (m.mag) put('onModifyMag', () => m.mag);
      if (m.res) put('onModifyRes', () => m.res);
      if (m.spd) put('onModifySpe', () => m.spd);
      L.push(h);
    }
    if (base.guts) L.push(both((c) => c.user.mon.status ? base.guts : 1));
    if (base.pinchSpd) L.push({ onModifySpe: (c) => c.holder.mon.hp <= KP.maxHp(c.holder.mon) / 3 ? base.pinchSpd : 1 });
    if (base.crit) L.push({ onModifyCritRatio: (c, r) => r + base.crit });
    if (base.firstStrike) L.push({ onModifyPriority: (c, p) => c.holder.outTurn === (c.B && c.B.turn) ? p + 0.5 : p });
    L.push(...effects(base, KP.ABILITY_EFFECTS));
    base._h = L.filter(h => Object.keys(h).length);
    return base._h;
  };
  KP.itemHandlers = function (id) {
    const it = id && KP.ITEMS[id]; if (!it) return [];
    if (it._h) return it._h;
    const L = [own(it)];
    if (it.boost) L.push({ onBasePower: (c) => (c.moveType || (c.move && c.move.type)) === it.boost ? [4915, 4096] : 1 });   // (Charcoal's kind: x1.2)
    L.push(...effects(it, KP.ITEM_EFFECTS));
    it._h = L.filter(h => Object.keys(h).length);
    return it._h;
  };
  // a fighter's states that hook the maths: Berserk (x1.5 to its attacks), Slow (Speed halved, unless a status-Speed
  // ability), Mini (Defense and Resistance halved), Zombie (White Mage moves x2 on it)
  const STATE_H = {
    berserk: both(() => 1.5),
    slow: { onModifySpe: (c) => { const a = c.B && c.B.ab ? c.B.ab(c.holder) : null; return a && a.statusStat && a.statusStat.spd ? 1 : [2048, 4096]; } },
    mini: { onModifyDef: () => 0.5, onModifyRes: () => 0.5 },
    zombie: { onSourceModifyDamage: (c) => c.moveType === 'whitemage' ? 2 : 1 },
  };
  const stateHandlers = (f) => {
    const L = [];
    if (f.vol && f.vol.berserk) L.push(STATE_H.berserk);
    const s = f.mon.status; if (s && STATE_H[s]) L.push(STATE_H[s]);
    return L;
  };
  // every handler on a fighter: its ability (unless suppressed: a Null ability, a Mold Breaker's attack), its held item
  // (unless gone, or a Null Zone), its states, then the field's and its side's (kp_battle.js B.extraHandlers)
  KP.handlersOf = (f) => {
    if (!f || !f.mon) return [];
    const B = f.B, list = [];
    const ab = B && B.ab ? B.ab(f) : (KP.abilityOf ? KP.abilityOf(f.mon) : null);
    if (ab && !(B && B._breaking === f)) list.push(...KP.abilityHandlers(ab));
    const held = B && B.heldOf ? B.heldOf(f) : f.mon.held;
    if (held) list.push(...KP.itemHandlers(held));
    list.push(...stateHandlers(f));
    if (B && B.extraHandlers) list.push(...B.extraHandlers(f));
    return list;
  };

  // ------------------------------------------------------------------ running an event
  // a chained modifier: the holder's own handlers (on<Event>) and, against the attacker, the target's
  // (onSource<Event>); a multiplier (or [num, den]) each, chained as Showdown's chainModify. sides: 'user' and
  // 'target' (an attack), 'self' (the holder's own stat), 'foe' (the attacker's onFoe<Event>, on the target's stat)
  KP.chainOf = function (event, c, sides = ['user', 'target']) {
    const ch = new KP.Chain();
    const run = (f, key) => {
      for (const h of KP.handlersOf(f)) {
        const fn = h[key]; if (!fn) continue;
        const r = fn(Object.assign({}, c, { holder: f }));
        if (r != null && r !== true && r !== false && r !== 1) ch.mul(r);
      }
    };
    if (sides.includes('user')) run(c.user, 'on' + event);
    if (sides.includes('target') && c.target) run(c.target, 'onSource' + event);
    if (sides.includes('self')) run(c.holder, 'on' + event);
    if (sides.includes('foe') && c.user) run(c.user, 'onFoe' + event);
    return ch;
  };
  // an event that passes a value along (each handler may return a new one)
  KP.relay = function (event, c, value, f) {
    for (const h of KP.handlersOf(f || c.user)) {
      const fn = h['on' + event]; if (!fn) continue;
      const r = fn(Object.assign({}, c, { holder: f || c.user }), value);
      if (r != null) value = r;
    }
    return value;
  };

  // ------------------------------------------------------------------ type effectiveness, with the attacker's rules
  // (Scrappy's kind: Freelancer and Monk moves reach Summoners; a floating target: Monk moves can't reach it; a
  // Wonder Guard: only super-effective hits)
  KP.effAgainst = function (B, f, t, type) {
    if (!type) return 1;
    let e = KP.effOn(type, t.mon);
    if (e === 0 && (type === 'freelancer' || type === 'monk') && f && B && B.ab && (B.ab(f) || {}).scrappy) {
      const s = KP.sp(t.mon), one = (dt) => dt === 'summoner' ? 1 : KP.eff(type, dt);
      e = one(s.type) * (s.type2 ? one(s.type2) : 1);
    }
    if (type === 'monk' && B && !KP.grounded(B, t)) e = 0;
    return e;
  };

  // ------------------------------------------------------------------ the damage formula
  // o.crit; o.rand 0-15 (the roll: 100 - rand percent) or o.roll 0.85-1 (the older callers'); without either, the
  // middle roll (92%): the Demo's and the opponents' estimate. o.real: the hit itself (one-time effects, a Gem's, are
  // spent); o.parental: a Parental Bond's second hit (x0.25)
  KP.damage = function (B, f, t, mv, o = {}) {
    if (!mv || !t || !f) return 0;
    const cat = KP.category(mv); if (cat === 'status') return 0;
    const moveType = KP.moveType ? KP.moveType(B, f, mv) : mv.type;
    const eff = KP.effAgainst(B, f, t, moveType); if (eff === 0) return 0;
    const tab = B && B.ab ? B.ab(t) : null;
    if (tab && tab.wonderGuard && eff <= 1 && moveType && !(B._breaking === t)) return 0;
    const c = { B, user: f, target: t, move: mv, moveType, cat, eff, crit: !!o.crit, contact: KP.hasFlag ? KP.hasFlag(mv, 'contact') : false, real: !!o.real };
    // fixed damage: a level's worth, a set amount, half the target's HP, down to the user's HP; a counter
    if (mv.ohko) return t.mon.hp;
    if (mv.counter) { const h = f.hitThisTurn; return h && h.dmg > 0 && (mv.counter === 'any' || h.cat === mv.counter) ? Math.max(1, tr(h.dmg * (mv.counter === 'any' ? 1.5 : 2))) : 0; }
    if (mv.fixed != null) {
      if (mv.fixed === 'level') return f.mon.lv;
      if (mv.fixed === 'half') return Math.max(1, tr(t.mon.hp / 2));
      if (mv.fixed === 'equal') return Math.max(0, t.mon.hp - f.mon.hp);
      return typeof mv.fixed === 'function' ? Math.max(1, Math.floor(mv.fixed(c))) : mv.fixed;
    }
    let bp = mv.powerBy && KP.POWER_BY && KP.POWER_BY[mv.powerBy] ? KP.POWER_BY[mv.powerBy](c) : typeof mv.powerOf === 'function' ? mv.powerOf(c) : mv.power;
    if (!bp) return 0;
    c.basePower = bp;
    bp = Math.max(1, KP.chainOf('BasePower', c).apply(Math.max(1, bp)));
    if (o.parental) bp = Math.max(1, KP.modify(bp, 0.25));
    const L = f.mon.lv, phys = cat === 'physical';
    const from = mv.statFrom === 'target' ? t : f;   // (Foul Play's kind: the target's own Attack)
    const aK = mv.useStat || (phys ? 'atk' : 'mag');
    let dK = mv.hitStat || (phys ? 'def' : 'res');
    if (B && B.rooms && B.rooms.wonderzone) dK = dK === 'def' ? 'res' : dK === 'res' ? 'def' : dK;
    let aB = from.st ? from.st[aK] || 0 : 0, dB = t.st ? t.st[dK] || 0 : 0;
    if (o.crit) { if (aB < 0) aB = 0; if (dB > 0) dB = 0; }
    if (mv.ignoreDefStages || (B && B.ab && (B.ab(f) || {}).unaware)) dB = 0;
    if (B && B.ab && (B.ab(t) || {}).unaware && !(B._breaking === t)) aB = 0;
    let A = KP.boosted(KP.stat(from.mon, aK), aB), D = KP.boosted(KP.stat(t.mon, dK), dB);
    A = KP.chainOf(phys ? 'ModifyAtk' : 'ModifyMag', c).apply(A);
    const dEv = dK === 'def' ? 'ModifyDef' : dK === 'res' ? 'ModifyRes' : 'Modify' + dK[0].toUpperCase() + dK.slice(1);
    D = KP.chainOf(dEv, Object.assign({}, c, { holder: t }), ['self', 'foe']).apply(D);
    D = Math.max(1, D);
    let dmg = tr(tr(tr(tr(2 * L / 5 + 2) * bp * A) / D) / 50) + 2;
    // the weather (Showdown's WeatherModifyDamage), before the critical hit
    if (B && B.weatherMul) { const w = B.weatherMul(moveType, f, t); if (w !== 1) dmg = KP.modify(dmg, w); }
    if (o.crit) dmg = tr(dmg * 1.5);
    const rand = o.rand != null ? o.rand : o.roll != null ? Math.round((1 - o.roll) * 100) : 8;
    dmg = tr(tr(dmg * (100 - Math.max(0, Math.min(15, rand)))) / 100);
    // STAB (x1.5; an Adaptability x2), the user's types
    let stab = moveType && typesOf(f.mon).includes(moveType) ? 1.5 : 1;
    stab = KP.relay('ModifySTAB', c, stab);
    if (stab !== 1) dmg = KP.modify(dmg, stab);
    // type effectiveness: x2 a doubling, a halving truncated (Showdown's), anything else multiplied and truncated
    const steps = Math.round(Math.log2(eff));
    if (Math.abs(Math.pow(2, steps) - eff) < 1e-9) { if (steps > 0) for (let i = 0; i < steps; i++) dmg *= 2; else for (let i = 0; i > steps; i--) dmg = tr(dmg / 2); }
    else dmg = tr(dmg * eff);
    // Burn: a physical hit halved (a Guts-kind ability and Facade's kind aside)
    if (phys && f.mon.status === 'burn' && mv.powerBy !== 'userStatus') {
      const fa = B && B.ab ? B.ab(f) : null;
      if (!(fa && (fa.guts || (fa.statusStat && fa.statusStat.atk)))) dmg = KP.modify(dmg, 0.5);
    }
    // the final modifiers (the attacker's, then what the target has against it)
    dmg = KP.chainOf('ModifyDamage', c).apply(dmg);
    if (!dmg) dmg = 1;
    return tr(dmg, 16);
  };
  // every roll at once (Showdown's damage calc shows these sixteen): [min .. max]
  KP.damageRolls = (B, f, t, mv, o = {}) => Array.from({ length: 16 }, (_, i) => KP.damage(B, f, t, mv, Object.assign({}, o, { rand: 15 - i })));
  // how many times a multi-hit move hits (Showdown's: 2-5 at 35/35/15/15%; a Loaded Dice 4-5; a Skill Link all five)
  KP.hitCount = (B, f, mv, rnd = Math.random) => {
    const h = mv.hits; if (!h) return 1;
    if (typeof h === 'number') return h;
    const [lo, hi] = h;
    if (B && B.ab && (B.ab(f) || {}).skillLink) return hi;
    if (B && B.heldOf && (KP.ITEMS[B.heldOf(f)] || {}).loadedDice) return hi >= 5 ? 4 + (rnd() < 0.5 ? 0 : 1) : hi;
    if (lo === 2 && hi === 5) { const r = rnd() * 20; return r < 7 ? 2 : r < 14 ? 3 : r < 17 ? 4 : 5; }
    return lo + Math.floor(rnd() * (hi - lo + 1));
  };
  KP.expectedHits = (B, f, mv) => { const h = mv.hits; if (!h) return 1; if (typeof h === 'number') return h; if (B && B.ab && (B.ab(f) || {}).skillLink) return h[1]; if (B && B.heldOf && (KP.ITEMS[B.heldOf(f)] || {}).loadedDice) return 4.5; return h[0] === 2 && h[1] === 5 ? 3.1 : (h[0] + h[1]) / 2; };

  // ------------------------------------------------------------------ critical hits, accuracy, Speed, priority
  const CRIT_ODDS = [24, 8, 2, 1];
  const critStage = (B, f, t, mv) => {
    let r = (f.st && f.st.crit || 0) + (mv.crit || 0) + (f.vol && f.vol.focus ? 2 : 0);
    r = KP.relay('ModifyCritRatio', { B, user: f, target: t, move: mv, cat: KP.category(mv) }, r);
    return Math.max(0, Math.min(3, Math.round(r)));
  };
  // whether this hit is critical: the user's crit stage, the move's, the handlers' (Scope Lens, Super Luck's kind);
  // an ability that blocks them (noCrit) on the target
  KP.critRoll = function (B, f, t, mv) {
    const tab = B && B.ab ? B.ab(t) : (KP.abilityOf ? KP.abilityOf(t.mon) : null);
    if (B && B.o && B.o.noCrit) return false;   // (a test's battle: no crits, as Showdown's tests set willCrit)
    if (tab && tab.noCrit && !(B && B._breaking === t)) return false;
    if (mv.alwaysCrit) return true;
    return Math.random() * CRIT_ODDS[critStage(B, f, t, mv)] < 1;
  };
  KP.critChance = (B, f, t, mv) => mv.alwaysCrit ? 1 : 1 / CRIT_ODDS[critStage(B, f, t, mv)];
  // a move's chance to hit (out of 100; true: it can't miss): its accuracy, chained (Blind: x0.6 on the user;
  // Gravity x5/3; Lock-On and a No Guard on either side: sure; a one-hit KO: 30 + the level gap)
  KP.accuracyOf = function (B, f, t, mv) {
    const fa = B && B.ab ? B.ab(f) : null, ta = B && B.ab && t ? B.ab(t) : null;
    if ((fa && fa.noGuard) || (ta && ta.noGuard)) return true;
    if (f.vol && f.vol.lockOn) return true;
    if (mv.ohko) return t && t.mon.lv > f.mon.lv ? 0 : Math.min(100, 30 + f.mon.lv - (t ? t.mon.lv : 0));
    if (mv.acc === true || mv.acc == null) return true;
    const c = { B, user: f, target: t, move: mv, cat: KP.category(mv) };
    const ch = KP.chainOf('ModifyAccuracy', c);
    if (f.mon.status === 'blind') ch.mul(0.6);
    if (B && B.rooms && B.rooms.gravity) ch.mul([6840, 4096]);
    let acc = ch.apply(mv.acc);
    if (ta && ta.statusEvade && c.cat === 'status') acc = Math.min(acc, 50);
    return acc;
  };
  // Speed in battle: the stat at its stage, then the handlers (Choice Scarf's kind, a pinch, Tailwind, Slow); a Quick
  // Gear's x99 is the turn order's own
  KP.speedOf = function (B, f) {
    const v = KP.boosted(KP.stat(f.mon, 'spd'), f.st ? f.st.spd || 0 : 0);
    return KP.chainOf('ModifySpe', { B: B || f.B, holder: f, user: f }, ['self']).apply(v);
  };
  // the AI's quick measure of a hit: the stats a move works with (Attack over Defense, Magic over Resistance)
  KP.statRatio = (a, t, mv) => KP.category(mv) === 'magic' ? KP.stat(a, 'mag') / Math.max(1, KP.stat(t, 'res')) : KP.stat(a, 'atk') / Math.max(1, KP.stat(t, 'def'));
  KP.hitWorth = (a, t, mv) => { const s = KP.sp(a); return (mv.power || 60) * KP.effOn(mv.type, t) * ((mv.type === s.type || mv.type === s.type2) ? 1.5 : 1) * KP.statRatio(a, t, mv) * (mv.hits ? (typeof mv.hits === 'number' ? mv.hits : 3.1) : 1); };
  KP.priorityOf = (B, f, mv) => KP.relay('ModifyPriority', { B, user: f, move: mv, holder: f }, (mv && mv.prio) || 0, f);
})();

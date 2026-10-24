// Kupomon tactics (docs/KUPOMON.md "Battle AI"): one mind for every opponent and for the Demo's own moogles. The user's
// rule (2026-10-02): every AI knows every move, ability, held item, field effect and status. How it does:
//  * A move is played out, not guessed at. T.evaluate copies what the battle can change (T.snap), plays this turn on it
//    as kp_battle.js would (the order, the foe's best answer, every effect of the move: moveBody's rules, the target's
//    and the user's abilities and items answering it), races the two moogles on from there (T.race: each side's best
//    attack every turn, the turns lost to sleep and the rest, the end-of-turn chip and healing, Doom and drowsiness),
//    and puts the battle back (T.restore). Damage, accuracy, Speed, priority and critical hits are the battle's own
//    functions (kp_calc.js), so whatever ability, item, weather, terrain, zone or side condition touches them is counted
//    exactly as the battle counts it.
//  * T.KNOWS lists every effect key there is and where it's handled; tools/kp_aicheck.js fails on a key missing from it,
//    and plays a set of positions to check the choices.
//  * Who uses it: dojo masters, rivals, the Elite Four and the leagues ('smart', 'max': always the best), every other
//    trainer (the best; now and then the next best), wild moogles (any move that would do something), the Demo.
//   KP.tactics.choose(B, f, t, { befriend })   the move for fighter f against t
//   KP.tactics.pickFour(mon, pool)             four moves out of a pool (learning, evolving, breeding)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const MV = (id) => KP.MOVES[id];
  const catOf = (mv) => KP.category(mv);
  const dmgMove = (mv) => !!mv && catOf(mv) !== 'status';
  const mx = (f) => KP.maxHp(f.mon);
  const typesOf = (mon) => { const s = KP.sp(mon); return [s.type, s.type2].filter(Boolean); };
  const abOf = (B, f) => (B && B.ab ? B.ab(f) : (KP.abilityOf ? KP.abilityOf(f.mon) : null)) || null;
  const itOf = (B, f) => (B && B.heldOf ? KP.ITEMS[B.heldOf(f)] : KP.ITEMS[f.mon.held]) || {};
  const has = (mv, fl) => KP.hasFlag(mv, fl);
  const roster = (B, side) => (side === 'me' ? B.d.party : B.foes) || [];
  const benched = (B, f) => roster(B, f.side).filter(m => m.hp > 0 && m !== f.mon);
  const clampSt = (k, v) => Math.max(-6, Math.min(k === 'crit' ? 4 : 6, v));
  const posBoosts = (x) => ['atk', 'def', 'mag', 'res', 'spd', 'crit'].reduce((a, k) => a + Math.max(0, x.st[k] || 0), 0);
  const STATUS_VALUE = { sleep: 1.0, stop: 1.0, poison: 0.55, venom: 0.75, burn: 0.65, slow: 0.6, mini: 0.5, zombie: 0.35, doom: 0.6, confuse: 0.45, blind: 0.45, silence: 0.4, berserk: 0.15 };

  const T = KP.tactics = {};

  // ------------------------------------------------------------------ the copy: what a move can change, put back exactly
  const FK = ['lock', 'lostItem', 'abOverride', 'flashFire', 'disguiseBroken', 'venomN', 'loafing', '_gemUsed', '_berryUsed', 'streak', 'lastMove', 'hitThisTurn', 'koBy'];
  const reset = (o, src) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, src); };
  T.snap = (B, fs) => ({
    wx: B.wx, wxC: B.wx && Object.assign({}, B.wx), terrain: B.terrain, terrainC: B.terrain && Object.assign({}, B.terrain),
    rooms: B.rooms, roomsC: Object.assign({}, B.rooms), selfKO: B.selfKO, breaking: B._breaking,
    sides: ['me', 'foe'].map(s => { const x = B.sides[s]; return { x, cond: x.cond, condC: Object.assign({}, x.cond), haz: x.haz, hazC: Object.assign({}, x.haz) }; }),
    fs: fs.filter(Boolean).map(f => ({ f, st: f.st, stC: Object.assign({}, f.st), vol: f.vol, volC: Object.assign({}, f.vol), hp: f.mon.hp, status: f.mon.status,
      statusT: f.mon.statusT, held: f.mon.held, cd: B.cds(f.mon), cdC: Object.assign({}, B.cds(f.mon)), x: FK.map(k => f[k]), own: FK.map(k => Object.prototype.hasOwnProperty.call(f, k)) })),
  });
  T.restore = (B, S) => {
    B.wx = S.wx; if (S.wx) reset(S.wx, S.wxC);
    B.terrain = S.terrain; if (S.terrain) reset(S.terrain, S.terrainC);
    B.rooms = S.rooms; reset(S.rooms, S.roomsC); B.selfKO = S.selfKO; B._breaking = S.breaking;
    for (const s of S.sides) { s.x.cond = s.cond; reset(s.cond, s.condC); s.x.haz = s.haz; reset(s.haz, s.hazC); }
    for (const r of S.fs) {
      const f = r.f; f.st = r.st; reset(r.st, r.stC); f.vol = r.vol; reset(r.vol, r.volC);
      f.mon.hp = r.hp; f.mon.status = r.status; f.mon.statusT = r.statusT; f.mon.held = r.held;
      B.cd[f.mon.uid] = r.cd; reset(r.cd, r.cdC);
      FK.forEach((k, i) => { if (r.own[i]) f[k] = r.x[i]; else delete f[k]; });
    }
  };
  const sandbox = (B, fs, fn) => { const S = T.snap(B, fs); try { return fn(); } finally { T.restore(B, S); } };

  // a stand-in for a moogle on the bench (its standing if it came in: switching, the replacement after a faint); the
  // one already out is itself
  T.ghost = (B, mon, side) => {
    for (const f of [B.me, B.foe]) if (f && f.mon === mon && !f.gone) return f;
    const g = { mon, side, B, ghost: true, st: { atk: 0, def: 0, mag: 0, res: 0, spd: 0, crit: 0 }, vol: { confuse: 0, berserk: false, doom: 0 },
      outTurn: (B.turn || 0) + 1, inTurn: B.turn || 0, streak: 0 };
    g.stat = (k) => {
      if (k === 'hp') return KP.maxHp(mon);
      if (k === 'spd') return KP.speedOf(B, g);
      const v = KP.boosted(KP.stat(mon, k), g.st[k] || 0);
      return KP.chainOf('Modify' + k[0].toUpperCase() + k.slice(1), { B, holder: g, user: g }, ['self']).apply(v);
    };
    Object.defineProperty(g, 'name', { get: () => KP.name(mon) });
    return g;
  };
  const fighterOf = (B, mon) => [B.me, B.foe].find(f => f && f.mon === mon && !f.gone) || null;

  // ------------------------------------------------------------------ what a move can do to a target
  // can a's move touch b now: out of reach (Jump, Dig, Vanish: its hitsInvuln aside), a priority move stopped (the Time
  // Field on the grounded, a noPriorityAgainst ability), powder against Goggles or Overcoat, a jump under Gravity
  T.reaches = (B, a, b, mv) => {
    const aa = abOf(B, a) || {}, ba = (B._breaking === b ? null : abOf(B, b)) || {}, sure = aa.noGuard || ba.noGuard;
    if (B.rooms && B.rooms.gravity && mv.charge && mv.charge.invuln === 'air') return false;
    if (b.vol.invuln && !(mv.hitsInvuln || []).includes(b.vol.invuln) && !sure && !a.vol.lockOn) return false;
    if (KP.priorityOf(B, a, mv) >= 1 && ((B.terrain && KP.TERRAINS[B.terrain.id].noPrio && KP.grounded(B, b)) || ba.noPriorityAgainst)) return false;
    if (has(mv, 'powder') && (ba.overcoat || itOf(B, b).goggles)) return false;
    return true;
  };
  // the chance its move lands (the battle's chain: Blind, Gravity, evasion items and abilities, Lock-On, No Guard...)
  T.hits = (B, f, t, mv) => {
    const ab = abOf(B, f); if (ab && ab.noMiss) return 1;
    const a = B && t ? KP.accuracyOf(B, f, t, mv) : (mv.acc === true ? true : mv.acc || 100);
    return a === true ? 1 : Math.max(0, Math.min(1, a / 100));
  };
  // a move's damage per use on b, if it lands: the battle's formula (every handler on both sides and the field), every
  // hit of a multi-hit move, a Parental Bond's second, the odds of a critical hit (Sniper's kind); a Mold Breaker's kind
  // sees through b's ability. 0 where it can't touch b. (A counter's: what it gives back, T.playTurn)
  T.perUse = (B, a, b, mv) => {
    if (!dmgMove(mv) || !b || !T.reaches(B, a, b, mv) || mv.counter) return 0;
    const aa = abOf(B, a) || {}, br0 = B._breaking;
    if (aa.moldBreaker) B._breaking = b;
    try {
      const ba = (B._breaking === b ? null : abOf(B, b)) || {};
      if (mv.ohko) return ba.sturdy ? 0 : b.mon.hp;
      let d = B.damageOf(a, b, mv) * KP.expectedHits(B, a, mv);
      if (aa.parentalBond && !mv.hits && mv.fixed == null && !mv.charge) d *= 1.25;
      if (d > 0 && mv.fixed == null && !(B.o && B.o.noCrit) && !ba.noCrit) d *= 1 + (aa.sniper ? 1.25 : 0.5) * KP.critChance(B, a, b, mv);
      return d;
    } finally { B._breaking = br0; }
  };
  // which moves still work for it later (cooldowns aside): Silence, a Taunt, an Assault Vest's kind, a choice lock
  const workable = (B, a, id, mv) => {
    if (a.mon.status === 'silence' && KP.MAGIC[mv.type]) return false;
    if (catOf(mv) === 'status' && (a.vol.taunt || itOf(B, a).vest)) return false;
    if (a.lock && a.lock !== id && a.mon.moves.includes(a.lock) && (itOf(B, a).choice || (abOf(B, a) || {}).gorillaTactics)) return false;
    return true;
  };
  const whenHitFits = (w, cat, type, contact, eff) => !(w.cat && w.cat !== cat) && !(w.type && w.type !== type) && !(w.contact && !contact) && !(w.superEff && !(eff > 1)) && !w.crit;
  // what a use of the move does to its own user's HP, on average: drain (a Zombie is hurt by it), recoil (Rock Head's
  // kind aside), a Shell Bell, a Life Orb's toll; a touch: the target's Helmet, Rough Skin, a whenHit hurt, an onHit share
  T.selfCost = (B, a, b, mv, d) => {
    const aa = abOf(B, a) || {}, it = itOf(B, a), ba = abOf(B, b) || {}, bi = itOf(B, b), m = mx(a), cat = catOf(mv);
    let h = 0;
    if (mv.drain) h += d * mv.drain * (aa.drainMul || 1) * (a.mon.status === 'zombie' ? -1 : 1);
    if (mv.recoil && !aa.rockHead && !aa.magicGuard) h -= d * mv.recoil;
    if (it.shellBell) h += d * it.shellBell;
    if (it.lifeOrb && !aa.magicGuard && !(aa.sheerForce && KP.hasSecondary(mv))) h -= m * (typeof it.lifeOrb === 'number' ? it.lifeOrb : 0.1);
    if (!aa.magicGuard && d > 0) {
      const contact = has(mv, 'contact') && !it.pads, type = KP.moveType(B, a, mv), eff = KP.effAgainst(B, a, b, type);
      if (contact && bi.helmet && !bi.balloon) h -= m * (typeof bi.helmet === 'number' ? bi.helmet : 1 / 6);
      if (contact && ba.roughSkin) h -= m * (typeof ba.roughSkin === 'number' ? ba.roughSkin : 1 / 8);
      for (const w of [].concat(ba.whenHit || [])) if (w.hurt && whenHitFits(w, cat, type, contact, eff)) h -= m * w.hurt * (w.chance != null ? w.chance / 100 : 1);
      if (ba.onHit && ba.onHit.recoil) h -= d * ba.onHit.recoil;
      if (ba.counterHit && d < b.mon.hp) h -= B.damageOf(b, a, KP.counterMove(b, ba.counterHit));   // (a Counter's blow, unless the hit knocks it out)
    }
    return h;
  };
  // a side's best attack on the other: now (usable this turn) and kept up turn after turn (a cooldown's move as often as
  // it comes back, a two-turn move or a recharge at half rate), with what a use costs or gives its user. A Berserk one has
  // only its strongest
  // a choice item or a Berserker's kind: locked into one move, and that move has no cooldown (the user's rule)
  const chosen = (B, x) => !!(itOf(B, x).choice || (abOf(B, x) || {}).gorillaTactics);
  T.chosen = chosen;
  T.best = (B, a, b) => {
    const rows = [], cds = B.cds(a.mon), herb = itOf(B, a).powerHerb, lockFree = chosen(B, a);
    for (const id of a.vol.berserk ? [B.strongest(a)] : a.mon.moves) {
      const mv = MV(id); if (!dmgMove(mv) || mv.selfFaint || !workable(B, a, id, mv)) continue;
      const turns = 1 + (mv.charge && !(mv.charge.skipIn && B.fieldIs(mv.charge.skipIn)) && !herb && a.vol.charging !== id ? 1 : 0) + (mv.recharge ? 1 : 0);
      const d = T.perUse(B, a, b, mv) * T.hits(B, a, b, mv);
      rows.push({ id, mv, d, rate: d / turns, cd: lockFree ? 0 : mv.cd || 0, ready: !(cds[id] > 0) && (!mv.firstTurnOnly || a.outTurn === B.turn), later: !mv.firstTurnOnly });
    }
    const now = rows.filter(r => r.ready).sort((x, y) => y.rate - x.rate)[0];
    const plain = rows.filter(r => !r.cd && r.later).sort((x, y) => y.rate - x.rate)[0];
    let sus = plain ? plain.rate : 0, susR = plain;
    for (const r of rows) if (r.cd && r.later) { const v = (r.rate + r.cd * (plain ? plain.rate : 0)) / (r.cd + 1); if (v > sus) { sus = v; susR = r; } }
    return { now: now ? now.rate : 0, nowId: now ? now.id : null, sus, susId: susR ? susR.id : null,
      cost: susR ? T.selfCost(B, a, b, susR.mv, susR.d) : 0, multi: !!(susR && susR.mv.hits) };
  };
  // the order this turn: priority (the battle's: Prankster's kind, a Lagging Tail...), then Speed (Tailwind, Slow,
  // items, abilities: KP.speedOf; a Time Warp turns it round); a tie counted as the other's
  T.order = (B, f, mv, t, tMv) => {
    if (!tMv) return true;
    const a = KP.priorityOf(B, f, mv), b = KP.priorityOf(B, t, tMv);
    if (a !== b) return a > b;
    const fs = KP.speedOf(B, f), ts = KP.speedOf(B, t);
    if (fs === ts) return false;
    return B.rooms && B.rooms.timewarp ? fs < ts : fs > ts;
  };
  // (the old question, kept for callers: does f move before t with this move, against t's quickest)
  T.first = (B, f, t, mv) => {
    const pr = (x, m) => KP.priorityOf(B, x, m || {});
    const tp = Math.max(0, ...t.mon.moves.filter(id => MV(id) && B.usable(t, id)).map(id => pr(t, MV(id))));
    const a = pr(f, mv);
    if (a !== tp) return a > tp;
    const fs = KP.speedOf(B, f), ts = KP.speedOf(B, t);
    return B.rooms && B.rooms.timewarp ? fs < ts : fs > ts;
  };
  // the most a side can do to the other this turn (its top roll on its usable attacks: a cautious guess)
  T.threat = (B, f, t) => {
    let best = 0;
    for (const id of f.mon.moves) { const mv = MV(id); if (!dmgMove(mv) || !B.usable(f, id)) continue; best = Math.max(best, T.perUse(B, f, t, mv)); }
    return best;
  };

  // ------------------------------------------------------------------ the battle's rules, played on the copy
  // HP lost to a hit (o.direct: Sturdy and a Sash at full HP hold a single hit at 1, Endure any), then the pinch items
  T.hurt = (B, x, dmg, o = {}) => {
    const m = mx(x), was = x.mon.hp; let to = Math.max(0, Math.round(was - dmg));
    if (to === 0 && was > 1 && o.direct) {
      const xa = (B._breaking === x ? null : abOf(B, x)) || {}, it = itOf(B, x);
      if (xa.sturdy && was >= m && o.single) to = 1;
      else if (x.vol.endure) to = 1;
      else if (it.sash && was >= m && o.single) { to = 1; x.mon.held = null; x.lostItem = 'sash'; }
    }
    x.mon.hp = to;
    if (to > 0 && to < was) T.pinch(B, x, was);
    return was - to;
  };
  T.pinch = (B, x, was) => {
    const m = mx(x), it = itOf(B, x), now = x.mon.hp;
    if (x.mon.held === 'mini_oil' && now < m / 2 && was >= m / 2 && !(B.rooms && B.rooms.nullzone)) { x.mon.held = null; x.lostItem = 'mini_oil'; x.mon.hp = Math.min(m, now + Math.floor(m / 4)); return; }
    if (it.pinchHeal && now <= m * it.pinchHeal.at) { x.mon.held = null; x.lostItem = true; T.heal(B, x, it.pinchHeal.heal); return; }
    if (it.pinchBoost && now <= m * it.pinchBoost.at) { x.mon.held = null; x.lostItem = true; T.boost(B, x, it.pinchBoost.boosts, x); }
  };
  T.chip = (B, x, frac) => { if (!x || x.mon.hp <= 0 || (abOf(B, x) || {}).magicGuard) return 0; return T.hurt(B, x, Math.max(1, Math.floor(mx(x) * frac))); };
  T.heal = (B, x, amt) => {
    if (!x || x.mon.hp <= 0) return 0;
    const m = mx(x), n = Math.max(1, amt < 1 ? Math.floor(m * amt) : Math.floor(amt));
    if (x.mon.status === 'zombie') return -T.hurt(B, x, n);
    const was = x.mon.hp; x.mon.hp = Math.min(m, was + n); return x.mon.hp - was;
  };
  // stat stages as the battle changes them: Mist, a Clear Amulet and the noStatDrop kind stop a foe's drops, the
  // mirrorStats kind sends them back, Contrary turns them round, Simple doubles them, Defiant's kind answers a drop, a
  // White Herb puts them back
  T.boost = (B, x, boosts, src, mirrored) => {
    if (!x || x.mon.hp <= 0 || !boosts) return;
    const xa = (B._breaking === x ? null : abOf(B, x)) || {}, fromFoe = !!(src && src !== x);
    boosts = Object.assign({}, boosts);
    const drops = Object.keys(boosts).filter(k => boosts[k] < 0);
    if (fromFoe && drops.length) {
      const mist = B.sides[x.side].cond.mist && !(abOf(B, src) || {}).infiltrator;
      if (mist || xa.noStatDrop || itOf(B, x).clearAmulet) drops.forEach(k => delete boosts[k]);
      else if (xa.mirrorStats && !mirrored) { const back = {}; drops.forEach(k => { back[k] = boosts[k]; delete boosts[k]; }); T.boost(B, src, back, x, true); }
    }
    let changed = false;
    for (const k of Object.keys(boosts)) {
      let n = boosts[k]; if (!n) continue;
      if (xa.contrary) n = -n;
      if (xa.simple) n *= 2;
      const before = x.st[k] || 0; x.st[k] = clampSt(k, before + n);
      if (x.st[k] !== before) changed = true;
      if (x.st[k] < before && fromFoe && xa.defiant && x.mon.hp > 0) T.boost(B, x, { [xa.defiant === true ? 'atk' : xa.defiant]: 2 }, x);
    }
    if (changed && fromFoe && x.mon.hp > 0 && itOf(B, x).whiteHerb && Object.keys(x.st).some(k => x.st[k] < 0)) { for (const k of Object.keys(x.st)) if (x.st[k] < 0) x.st[k] = 0; x.mon.held = null; x.lostItem = true; }
  };
  // an ailment as the battle gives it: the noStatus kind, Safeguard (an Infiltrator's kind gets through), the terrain (Fog:
  // no lasting ailment or confusion; the Rhythm Field: no sleep), one lasting ailment at a time, a curing berry eats it,
  // Synchronize's kind passes it back. How long: the middle of its range (sleep 3, stop 2.5: T.race counts the turns)
  T.inflict = (B, x, kind, src) => {
    const def = KP.STATUS[kind]; if (!def || !x || x.mon.hp <= 0) return false;
    const xa = (B._breaking === x ? null : abOf(B, x)) || {};
    if (xa.noStatus && (xa.noStatus === 'all' || xa.noStatus.includes(kind))) return false;
    const fromFoe = !!(src && src !== x);
    if (fromFoe && B.sides[x.side].cond.safeguard && !(abOf(B, src) || {}).infiltrator) return false;
    if (B.terrain && KP.grounded(B, x)) { const Tr = KP.TERRAINS[B.terrain.id]; if ((Tr.noStatus && (def.lasting || kind === 'confuse')) || (Tr.noSleep && kind === 'sleep')) return false; }
    const it = itOf(B, x), cures = (k, lasting) => it.cureStatus && (it.cureStatus === 'all' || (lasting && it.cureStatus === 'lasting') || (Array.isArray(it.cureStatus) && it.cureStatus.includes(k)));
    if (def.lasting) {
      if (x.mon.status) return false;
      if (cures(kind, true)) { x.mon.held = null; x.lostItem = true; return false; }
      x.mon.status = kind; x.mon.statusT = kind === 'sleep' ? 3 : kind === 'stop' ? 2.5 : 0; if (kind === 'venom') x.venomN = 0;
      if (xa.synchronize && fromFoe && src.mon.hp > 0 && !src.mon.status && ['poison', 'venom', 'burn', 'slow'].includes(kind)) T.inflict(B, src, kind, x);
      return true;
    }
    if (kind === 'confuse') { if (x.vol.confuse) return false; if (cures('confuse')) { x.mon.held = null; x.lostItem = true; return false; } x.vol.confuse = 3.5; return true; }
    if (kind === 'berserk') { if (x.vol.berserk) return false; x.vol.berserk = true; return true; }
    if (kind === 'doom') { if (x.vol.doom) return false; x.vol.doom = 4; return true; }
    return false;
  };
  // the battle-only states a move gives (giveVols): their immunities and the reasons they fail
  T.vols = (B, f, t, vol, foeOnly, selfOnly) => {
    for (const k of Object.keys(vol)) {
      const V = KP.VOLATILES[k]; if (!V || !vol[k]) continue;
      if (foeOnly && !V.foe) continue;
      if (selfOnly && V.foe) continue;
      const who = V.foe ? t : f; if (!who || who.mon.hp <= 0) continue;
      const wa = (B._breaking === who ? null : abOf(B, who)) || {};
      if (V.foe && wa.noStatus && (wa.noStatus === 'all' || wa.noStatus.includes(k))) continue;
      if (V.foe && B.sides[who.side].cond.safeguard && (k === 'yawn' || k === 'taunt') && !foeOnly) continue;
      if (who.vol[k] || (k === 'yawn' && who.mon.status) || (k === 'float' && B.rooms.gravity) || (k === 'suppressed' && itOf(B, who).abilityShield) || (k === 'decoy' && who.mon.hp <= Math.floor(mx(who) / 4))) continue;
      if (k === 'taunt') { if (itOf(B, who).mentalHerb) { who.mon.held = null; who.lostItem = true; continue; } who.vol.taunt = 3; }
      else if (k === 'leech') who.vol.leech = f.side;
      else if (k === 'yawn') who.vol.yawn = 2;
      else if (k === 'block') who.vol.block = f;
      else if (k === 'decoy') { const c = Math.floor(mx(who) / 4); who.mon.hp -= c; who.vol.decoy = c; }
      else if (k === 'float') who.vol.float = 5;
      else if (k === 'lockOn') who.vol.lockOn = 2;
      else if (k === 'encore') { const lm = MV(who.lastMove); if (!who.lastMove || !who.mon.moves.includes(who.lastMove) || (lm && lm.vol && lm.vol.encore) || who.vol.charging || who.vol.recharge) continue; if (itOf(B, who).mentalHerb) { who.mon.held = null; who.lostItem = true; continue; } who.vol.encore = { id: who.lastMove, turns: 3 }; }
      else who.vol[k] = true;
    }
  };
  // the field and the sides as the battle sets them (a weather already up, or an extreme one, stays; a zone used again
  // ends; a Seed answers its terrain, a Room Service the Time Warp; Gravity grounds the floating)
  T.setWeather = (B, id, src) => {
    if (!KP.WEATHERS[id] || (B.wx && (B.wx.id === id || B.wx.extreme))) return;
    const it = src ? itOf(B, src) : {}; B.wx = { id, turns: it.extend === id || it.extend === 'weather' ? 8 : 5, src };
  };
  T.setTerrain = (B, id, src) => {
    if (!KP.TERRAINS[id] || (B.terrain && B.terrain.id === id)) return;
    const it = src ? itOf(B, src) : {}; B.terrain = { id, turns: it.extend === id || it.extend === 'terrain' ? 8 : 5 };
    for (const x of [B.me, B.foe]) { const xi = x && !x.gone ? itOf(B, x) : {}; if (xi.terrainBoost && xi.terrainBoost[id] && x.mon.hp > 0) { T.boost(B, x, xi.terrainBoost[id], x); x.mon.held = null; x.lostItem = true; } }
  };
  T.setRoom = (B, id) => {
    if (!KP.ROOMS[id]) return;
    if (B.rooms[id]) { delete B.rooms[id]; return; }
    B.rooms[id] = 5;
    if (id === 'gravity') for (const x of [B.me, B.foe]) if (x && x.vol.float) x.vol.float = 0;
    if (id === 'timewarp') for (const x of [B.me, B.foe]) { const xi = x && !x.gone ? itOf(B, x) : {}; if (xi.roomService && x.mon.hp > 0) { T.boost(B, x, { spd: -1 }, x); x.mon.held = null; x.lostItem = true; } }
  };
  T.setSide = (B, side, id, src) => {
    const S = KP.SIDE_CONDS[id], cond = B.sides[side].cond;
    if (!S || cond[id] || (S.needs && !B.fieldIs(S.needs))) return;
    const it = src ? itOf(B, src) : {}; cond[id] = (it.extend === 'walls' && S.cat) ? 8 : S.turns;
  };
  // the hazards' toll on the moogles still to come in on a side (a share of a moogle each: Boots, the ungrounded and the
  // type chart as entryHazards has them), worth 40 a whole moogle
  T.hazardToll = (B, side) => {
    const haz = B.sides[side].haz; if (!Object.keys(haz).length) return 0;
    let v = 0;
    for (const m of roster(B, side)) {
      if (m.hp <= 0 || fighterOf(B, m)) continue;
      const g = T.ghost(B, m, side); if (itOf(B, g).boots) continue;
      const gr = KP.grounded(B, g); let s = 0;
      if (haz.mines) s += KP.HAZARDS.mines.dmg[0] * KP.effAgainst(B, null, g, KP.HAZARDS.mines.type);
      if (haz.caltrops && gr) s += KP.HAZARDS.caltrops.dmg[Math.min(3, haz.caltrops) - 1];
      if (haz.venom_spikes && gr && !m.status) s += haz.venom_spikes >= 2 ? 0.3 : 0.2;
      if (haz.web && gr) s += 0.05;
      if ((abOf(B, g) || {}).magicGuard) s = haz.web && gr ? 0.05 : 0;
      v += s;
    }
    return v * 40;
  };
  // a moogle coming out (the switching AI's look ahead): the hazards on its side, its ability's coming-out (Intimidate's
  // kind, its weather, terrain or zone, its boosts, Download, Trace), a Seed for the terrain
  T.entry = (B, g, t) => {
    const haz = B.sides[g.side].haz, gi = itOf(B, g);
    if (!gi.boots && Object.keys(haz).length) {
      const gr = KP.grounded(B, g);
      if (haz.mines) { const e = KP.effAgainst(B, null, g, KP.HAZARDS.mines.type); if (e > 0) T.chip(B, g, KP.HAZARDS.mines.dmg[0] * e); }
      if (haz.caltrops && gr) T.chip(B, g, KP.HAZARDS.caltrops.dmg[Math.min(3, haz.caltrops) - 1]);
      if (haz.venom_spikes && gr && !g.mon.status) T.inflict(B, g, haz.venom_spikes >= 2 ? 'venom' : 'poison', null);
      if (haz.web && gr) T.boost(B, g, { spd: -1 }, t);
    }
    const ab = abOf(B, g) || {};
    if (ab.onEnter) {
      const [who, kn] = ab.onEnter.foe ? [t, ab.onEnter.foe] : [g, ab.onEnter.self];
      if (kn && !(who === t && (abOf(B, t) || {}).innerFocus)) T.boost(B, who, { [kn[0]]: kn[1] }, g);
    }
    if (ab.setWeather) T.setWeather(B, ab.setWeather, g);
    if (ab.setTerrain) T.setTerrain(B, ab.setTerrain, g);
    if (ab.setRoom) T.setRoom(B, ab.setRoom);
    if (ab.onEnterBoosts) { if (ab.onEnterBoosts.self) T.boost(B, g, ab.onEnterBoosts.self, g); if (ab.onEnterBoosts.foe) T.boost(B, t, ab.onEnterBoosts.foe, g); }
    if (ab.download) T.boost(B, g, { [t.stat('def') < t.stat('res') ? 'atk' : 'mag']: 1 }, g);
    if (ab.trace) { const ta = abOf(B, t); if (ta && !ta.trace && !ta.legend) g.abOverride = ta.id; }
    const gi2 = itOf(B, g); if (gi2.terrainBoost && B.terrain && gi2.terrainBoost[B.terrain.id]) { T.boost(B, g, gi2.terrainBoost[B.terrain.id], g); g.mon.held = null; g.lostItem = true; }
  };

  // ------------------------------------------------------------------ a hit landing, and what answers it
  // the target's answer (its whenHit and Rough Skin kinds, Cursed Body's, a Balloon popping, a Helmet, a Weakness Policy,
  // the hit berries; an Eject Button or Red Card ends the bout: unseen) and the attacker's (a touch's ailment). A rare one
  // (under even odds) weighs its chance instead of happening. extra: the score's side (+ good for the attacker)
  T.onHit = (B, f, t, mv, cat, moveType, eff, contact, ctx) => {
    const tab = (B._breaking === t ? null : abOf(B, t)) || {}, ti = itOf(B, t), fab = abOf(B, f) || {}, mg = fab.magicGuard;
    for (const w of [].concat(tab.whenHit || [])) {
      if (!whenHitFits(w, cat, moveType, contact, eff)) continue;
      const p = w.chance != null ? w.chance / 100 : 1;
      if (p < 0.5) { ctx.extra -= p * 10; continue; }
      if (w.boosts && t.mon.hp > 0) T.boost(B, t, w.boosts, t);
      if (w.max && t.mon.hp > 0) t.st[w.max] = 6;
      if (f.mon.hp > 0) {
        if (w.foe) T.boost(B, f, w.foe, t);
        if (w.status) T.inflict(B, f, w.status[0], t);
        if (w.hurt && !mg) T.chip(B, f, w.hurt);
      }
      if (w.weather) T.setWeather(B, w.weather, t);
      if (w.terrain) T.setTerrain(B, w.terrain, t);
      if (w.hazard) { const s = f.side, before = T.hazardToll(B, s), Z = KP.HAZARDS[w.hazard]; const haz = B.sides[s].haz; if (Z && (haz[w.hazard] || 0) < Z.max) haz[w.hazard] = (haz[w.hazard] || 0) + 1; ctx.extra -= T.hazardToll(B, s) - before; }
    }
    if (tab.roughSkin && contact && !mg && f.mon.hp > 0) T.chip(B, f, typeof tab.roughSkin === 'number' ? tab.roughSkin : 1 / 8);
    if (tab.cursedBody) ctx.extra -= (typeof tab.cursedBody === 'number' ? tab.cursedBody : 30) / 100 * 8;
    if (ti.balloon) { t.mon.held = null; t.lostItem = true; }
    else {
      if (ti.helmet && contact && !mg && f.mon.hp > 0) T.chip(B, f, typeof ti.helmet === 'number' ? ti.helmet : 1 / 6);
      if (t.mon.hp > 0) {
        if (ti.weaknessPolicy && eff > 1) { T.boost(B, t, { atk: 2, mag: 2 }, t); t.mon.held = null; t.lostItem = true; }
        else if (ti.hitBoost && (!ti.hitBoost.cat || ti.hitBoost.cat === cat)) { T.boost(B, t, ti.hitBoost.boosts, t); t.mon.held = null; t.lostItem = true; }
        else if (ti.hitHurt && (!ti.hitHurt.cat || ti.hitHurt.cat === cat) && f.mon.hp > 0) { t.mon.held = null; t.lostItem = true; if (!mg) T.chip(B, f, ti.hitHurt.frac || 1 / 8); }
      }
    }
    if (fab.onContactStatus && contact && t.mon.hp > 0) { const [k, c] = fab.onContactStatus; if (c >= 50) T.inflict(B, t, k, f); else ctx.extra += c / 100 * 10; }
  };
  // after the hits: drain (a Zombie is hurt), recoil, a Shell Bell; an old ability's onHit (an ailment back, a share back)
  T.afterHits = (B, f, t, mv, dealt, landed, ctx) => {
    const ab = abOf(B, f) || {}, tab = (B._breaking === t ? null : abOf(B, t)) || {}, it = itOf(B, f), m = mx(f);
    if (mv.drain && dealt > 0 && f.mon.hp > 0) { const h = Math.max(1, Math.floor(dealt * mv.drain * (ab.drainMul || 1))); if (f.mon.status === 'zombie') T.heal(B, f, h); else f.mon.hp = Math.min(m, f.mon.hp + h); }
    if (mv.recoil && dealt > 0 && f.mon.hp > 0 && !ab.rockHead && !ab.magicGuard) T.hurt(B, f, Math.max(1, Math.round(dealt * mv.recoil)));
    if (it.shellBell && dealt > 0 && f.mon.hp > 0) T.heal(B, f, Math.max(1, Math.floor(dealt * it.shellBell)));
    if (tab.counterHit && landed && t.mon.hp > 0 && f.mon.hp > 0) T.hurt(B, f, B.damageOf(t, f, KP.counterMove(t, tab.counterHit)));   // (Counter: only from one still up)
    if (tab.onHit && f.mon.hp > 0 && landed) {
      const st = tab.onHit.status;
      if (st && !f.mon.status) { if (st[1] >= 50) T.inflict(B, f, Array.isArray(st[0]) ? st[0][0] : st[0], t); else ctx.extra -= st[1] / 100 * 12; }
      if (tab.onHit.recoil) T.hurt(B, f, Math.max(1, Math.floor(dealt * tab.onHit.recoil)));
    }
  };
  // a knockout: the attacker's onKO kind (Moxie, Beast Boost), Destiny taking it along, Aftermath's blast on a touch
  T.onKO = (B, f, t, contact) => {
    if (f.mon.hp > 0) {
      const ab = abOf(B, f) || {};
      if (ab.onKOBoost) T.boost(B, f, ab.onKOBoost, f);
      if (ab.beastBoost) { const k = ['atk', 'def', 'mag', 'res', 'spd'].sort((a, b) => KP.stat(f.mon, b) - KP.stat(f.mon, a))[0]; T.boost(B, f, { [k]: 1 }, f); }
    }
    if (t.vol.destiny && f.mon.hp > 0) f.mon.hp = 0;
    const ta = abOf(B, t) || {};
    if (ta.aftermath && contact && f.mon.hp > 0) T.chip(B, f, typeof ta.aftermath === 'number' ? ta.aftermath : 1 / 4);
  };

  // ------------------------------------------------------------------ a move, played (kp_battle.js useMove + moveBody)
  // br: { hit (it lands), sec (its chance effect comes off), kind (which ailment of a list) }; ctx: { tMv (the foe's move
  // this turn), took (what f was dealt before moving), flinch (the foe's chance of flinching), extra (the score's side) }
  T.doMove = (B, f, t, id, mv, br, ctx, fFirst) => {
    const ab = abOf(B, f) || {}, it = itOf(B, f), cat = catOf(mv);
    if (f.vol.recharge) { f.vol.recharge = 0; return; }
    if (f.mon.status === 'sleep' || f.mon.status === 'stop') { if ((f.mon.statusT || 0) - 1 > 0) { f.mon.statusT -= 1; return; } f.mon.status = null; }
    if (ab.truant && f.loafing) { f.loafing = false; return; }
    if (f.mon.status === 'silence' && KP.MAGIC[mv.type]) return;
    if (f.vol.taunt && cat === 'status') return;
    if (B.rooms.gravity && mv.charge && mv.charge.invuln === 'air') return;
    if (ab.truant) f.loafing = true;
    if (mv.charge && f.vol.charging !== id) {
      let skip = !!(mv.charge.skipIn && B.fieldIs(mv.charge.skipIn));
      if (!skip && it.powerHerb) { skip = true; f.mon.held = null; f.lostItem = true; }
      if (!skip) { f.vol.charging = id; f.lastMove = id; if (mv.charge.invuln) f.vol.invuln = mv.charge.invuln; if (mv.charge.self) T.boost(B, f, mv.charge.self, f); return; }
    }
    if (f.vol.charging === id) { f.vol.charging = null; f.vol.invuln = null; }
    if (mv.cd && !(it.choice || ab.gorillaTactics)) { let n = mv.cd + 1; const oa = t ? abOf(B, t) : null; if (oa && oa.pressure) n += oa.pressure === true ? 1 : oa.pressure; if (ab.cdLess) n = Math.max(1, n - ab.cdLess); B.cds(f.mon)[id] = n; }   // (a choice lock: no cooldown)
    f.streak = f.lastMove === id ? (f.streak || 1) + 1 : 1; f.lastMove = id;
    if (!f.lock && (it.choice || ab.gorillaTactics)) f.lock = id;
    if (mv.rampage && !f.vol.rampage) f.vol.rampage = { id, left: 1.5 };
    if (mv.hpCost) { const c = Math.floor(mx(f) * mv.hpCost); if (f.mon.hp <= c) return; f.mon.hp -= c; }
    if (mv.firstTurnOnly && f.outTurn !== B.turn) return;
    if (mv.onlyIfFoeAttacks && (fFirst === false || !ctx.tMv || catOf(ctx.tMv) === 'status')) return;
    const moveType = KP.moveType(B, f, mv), br0 = B._breaking;
    if (ab.moldBreaker) B._breaking = t;
    try { T.body(B, f, t, id, mv, cat, moveType, br, ctx, fFirst); } finally { B._breaking = br0; }
    if (f.vol.rampage && f.vol.rampage.id === id && f.mon.hp > 0) { f.vol.rampage = { id, left: f.vol.rampage.left - 1 }; if (f.vol.rampage.left <= 0) { f.vol.rampage = null; T.inflict(B, f, 'confuse', null); } }
    const fi = itOf(B, f);
    if (fi.throatSpray && has(mv, 'sound') && f.mon.hp > 0) { T.boost(B, f, { mag: 1 }, f); f.mon.held = null; f.lostItem = true; }
  };
  T.body = (B, f, t, id, mv, cat, moveType, br, ctx, fFirst) => {
    const ab = abOf(B, f) || {}, tab = (t && B._breaking !== t ? abOf(B, t) : null) || {}, vol = mv.vol || {};
    const foeVol = Object.keys(vol).some(k => KP.VOLATILES[k] && KP.VOLATILES[k].foe);
    const targetsFoe = cat !== 'status' || !!(mv.status || (mv.stat && mv.stat[2] === 'foe') || mv.foe || foeVol || mv.trick);
    if (targetsFoe) {
      if (!t || t.mon.hp <= 0) return;
      // bounced (Magic Bounce's kind, Reflect): the status move turns on its user
      if (cat === 'status' && !mv.bypassGuard && (tab.magicBounce || t.vol.reflect) && !f._bounced) {
        t._bounced = true; try { T.body(B, t, f, id, mv, cat, moveType, br, ctx, !fFirst); } finally { delete t._bounced; }
        return;
      }
      if (t.vol.guard && !mv.bypassGuard) { if (mv.crash) T.chip(B, f, mv.crash); return; }
      if (!T.reaches(B, f, t, mv)) { if (mv.crash) T.chip(B, f, mv.crash); return; }
      if (!br.hit) { if (mv.crash) T.chip(B, f, mv.crash); const fi = itOf(B, f); if (fi.blunderPolicy && f.mon.hp > 0) { T.boost(B, f, { spd: 2 }, f); f.mon.held = null; f.lostItem = true; } return; }
      if (f.vol.lockOn) f.vol.lockOn = 0;
      const eff0 = moveType ? KP.effAgainst(B, f, t, moveType) : 1;
      const abImm = (tab.immune && moveType && tab.immune.includes(moveType)) || (tab.flagImmune && tab.flagImmune.some(fl => has(mv, fl))) || (tab.goodAsGold && cat === 'status') || (tab.overcoat && has(mv, 'powder'));
      if (!abImm && has(mv, 'powder') && itOf(B, t).goggles) return;
      if (eff0 === 0 || abImm) {
        if (abImm && tab.absorb && t.mon.hp < mx(t)) t.mon.hp = Math.min(mx(t), t.mon.hp + Math.floor(mx(t) / 4));
        else if (abImm && tab.absorbBoost) T.boost(B, t, tab.absorbBoost, t);
        else if (abImm && tab.flashFire) t.flashFire = moveType;
        return;
      }
      if (cat === 'status' && t.vol.decoy && !has(mv, 'sound') && !ab.infiltrator) return;
      if (mv.ohko && tab.sturdy) return;
    }
    // ---- the hits
    let dealt = 0, landed = false, decoyHit = false;
    const eff = moveType && t ? KP.effAgainst(B, f, t, moveType) : 1;
    if (cat !== 'status' && t && t.mon.hp > 0) {
      if (mv.breakWalls) { const s = B.sides[t.side].cond; delete s.wall; delete s.shell; delete s.veil; }
      const contact = has(mv, 'contact') && !itOf(B, f).pads;
      const n = mv.hits ? KP.expectedHits(B, f, mv) : 1;
      let d = mv.counter ? T.counterDmg(B, f, t, mv, ctx) : T.perUse(B, f, t, mv);
      if (d > 0) {
        const per = d / n; let left = n;
        if (t.vol.decoy && !has(mv, 'sound') && !ab.infiltrator) {   // (the Decoy takes whole hits till it breaks)
          while (left > 0 && t.vol.decoy > 0) { t.vol.decoy = Math.max(0, t.vol.decoy - per); dealt += per; left = Math.max(0, left - 1); decoyHit = true; }
          if (!t.vol.decoy) delete t.vol.decoy;
        }
        if (left > 0 && tab.disguise && !t.disguiseBroken) { t.disguiseBroken = true; T.hurt(B, t, mx(t) / 8); left = Math.max(0, left - 1); }
        if (left > 0) { const r = T.hurt(B, t, per * left, { direct: true, single: n <= 1 }); dealt += r; landed = true; t.hitThisTurn = { dmg: r, cat, by: f }; }
        const fi = itOf(B, f), ti = itOf(B, t);
        if (landed && fi.gem === moveType && !f._gemUsed) { f.mon.held = null; f._gemUsed = true; f.lostItem = true; }
        if (landed && ti.resistBerry === moveType && (eff > 1 || ti.resistBerry === 'freelancer') && !t._berryUsed) { t.mon.held = null; t._berryUsed = true; t.lostItem = true; }
        if (landed) T.onHit(B, f, t, mv, cat, moveType, eff, contact, ctx);
        if (landed && t.mon.hp <= 0) T.onKO(B, f, t, contact);
      }
      if (landed || decoyHit) T.afterHits(B, f, t, mv, dealt, landed, ctx);
      if (!landed && !decoyHit) return;
    }
    // ---- the added effects (none with a Sheer Force's kind; a Shield Dust's kind or a Covert Cloak on the target blocks them)
    const sheer = !!(ab.sheerForce && KP.hasSecondary(mv)), mul = ab.statusChance || 1;
    if (cat !== 'status' && landed && t.mon.hp > 0 && !sheer) {
      const shielded = tab.shieldDust || itOf(B, t).covertCloak;
      if (!shielded) {
        let fl = mv.flinch || 0;
        if (!fl) for (const h of KP.handlersOf(f)) if (h.onAfterHitFlinch) fl = Math.max(fl, h.onAfterHitFlinch());
        if (fl && fFirst && !tab.innerFocus) ctx.flinch = Math.max(ctx.flinch || 0, Math.min(1, fl * mul / 100));
        if (mv.status && br.sec) T.inflict(B, t, br.kind || (Array.isArray(mv.status[0]) ? mv.status[0][0] : mv.status[0]), f);
        if (mv.stat && mv.stat[2] === 'foe' && (mv.stat[3] == null || br.sec)) T.boost(B, t, { [mv.stat[0]]: mv.stat[1] }, f);
        if (mv.foe && (mv.foeChance == null || br.sec)) T.boost(B, t, mv.foe, f);
        if (foeVol) T.vols(B, f, t, vol, true);
      }
      if (mv.trap && t.mon.hp > 0) T.trap(B, f, t, mv);
      if (mv.resetFoe && t.mon.hp > 0) { ctx.extra += 10 * Object.values(t.st).reduce((a, v) => a + Math.max(0, v), 0); for (const k of Object.keys(t.st)) t.st[k] = 0; }   // (its boosts gone: what that's worth beyond this race)
      if (mv.knockOff && t.mon.held) { t.mon.held = null; t.lostItem = true; }
      if (mv.stealItem && t.mon.held && !f.mon.held) { f.mon.held = t.mon.held; t.mon.held = null; t.lostItem = true; }
    }
    if (cat !== 'status' && f.mon.hp > 0) {
      if (mv.self && (mv.selfChance == null || (!sheer && br.sec))) T.boost(B, f, mv.self, f);
      if (mv.stat && mv.stat[2] === 'self' && (mv.stat[3] == null || br.sec)) T.boost(B, f, { [mv.stat[0]]: mv.stat[1] }, f);
      if (mv.recharge) f.vol.recharge = 1;
    }
    // ---- its own effects
    if (mv.heal) {
      const h = Math.max(1, Math.floor(mx(f) * B.healFrac(f.mon, mv) * (ab.healMul || 1)));
      if (f.mon.status === 'zombie') T.heal(B, f, h); else if (f.mon.hp < mx(f)) f.mon.hp = Math.min(mx(f), f.mon.hp + h);
      if (mv.cures && mv.cures.includes(f.mon.status)) f.mon.status = null;
    }
    if (mv.rest && f.mon.hp > 0 && f.mon.hp < mx(f) && f.mon.status !== 'sleep') {
      const T0 = B.terrain && KP.TERRAINS[B.terrain.id], noSleep = (ab.noStatus && (ab.noStatus === 'all' || ab.noStatus.includes('sleep'))) || (T0 && KP.grounded(B, f) && (T0.noSleep || T0.noStatus));
      if (!noSleep) { f.mon.hp = mx(f); f.mon.status = 'sleep'; f.mon.statusT = 3; f.venomN = 0; }
    }
    if (mv.wish && f.mon.hp > 0 && !B.sides[f.side].wish) {   // (half its max HP next turn, to it or the one it switches to: what the race can't see)
      const amt = Math.floor(mx(f) / 2); B.sides[f.side].wish = { turns: 2, amt };
      ctx.extra += 40 * Math.min(0.5, (mx(f) - f.mon.hp) / mx(f) + 0.15) + 4 * benched(B, f).filter(m => m.hp < KP.maxHp(m) * 0.6).length;
    }
    if (mv.perish) for (const x of [f, t]) { if (x && x.mon.hp > 0 && !x.vol.perish && !(x !== f && (tab.immune || []).includes(mv.type))) x.vol.perish = 4; }
    if (mv.courtChange) {
      const other = f.side === 'me' ? 'foe' : 'me', m0 = T.hazardToll(B, f.side), o0 = T.hazardToll(B, other), a = B.sides.me, b = B.sides.foe;
      [a.cond, b.cond] = [b.cond, a.cond]; [a.haz, b.haz] = [b.haz, a.haz];
      ctx.extra += (T.hazardToll(B, other) - o0) - (T.hazardToll(B, f.side) - m0);
    }
    if (cat === 'status') {
      if (mv.stat) { const [k, n, who, ch] = mv.stat, x = who === 'self' ? f : t; if (ch == null || br.sec) T.boost(B, x, { [k]: n }, f); }
      if (mv.self) T.boost(B, f, mv.self, f);
      if (mv.foe && t && t.mon.hp > 0) T.boost(B, t, mv.foe, f);
      if (mv.status && (mv.status[1] == null || mv.status[1] * mul >= 100 || br.sec)) T.inflict(B, t, br.kind || (Array.isArray(mv.status[0]) ? mv.status[0][0] : mv.status[0]), f);
      if (Object.keys(vol).length) {
        const tauntBefore = t && t.vol.taunt, reflBefore = f.vol.reflect;
        T.vols(B, f, t, vol, false);
        if (t && vol.taunt && !tauntBefore && t.vol.taunt) { const sup = T.support(B, t, f); ctx.extra += 14 * (sup.ail + sup.drop + sup.setup + sup.field); }
        if (vol.reflect && !reflBefore && f.vol.reflect && t) { const sup = T.support(B, t, f); ctx.extra += 12 * (sup.ail + sup.drop); }
      }
      if (mv.guard) f.vol.guard = mv.guard;
      if (mv.endure) f.vol.endure = true;
      if (mv.trap && t && t.mon.hp > 0) T.trap(B, f, t, mv);
    } else if (Object.keys(vol).some(k => !(KP.VOLATILES[k] && KP.VOLATILES[k].foe))) T.vols(B, f, t, vol, false, true);
    // ---- the field and the sides
    const was = { wx: B.wx && B.wx.id, te: B.terrain && B.terrain.id, rm: !!(mv.room && B.rooms[mv.room]), side: !!(mv.side && B.sides[f.side].cond[mv.side]) };
    if (mv.weather) T.setWeather(B, mv.weather, f);
    if (mv.terrain) T.setTerrain(B, mv.terrain, f);
    if (mv.room) T.setRoom(B, mv.room);
    if (mv.side) {
      const had = !!B.sides[f.side].cond[mv.side]; T.setSide(B, f.side, mv.side, f);
      if (!had && B.sides[f.side].cond[mv.side] && t) { const sup = T.support(B, t, f); ctx.extra += mv.side === 'safeguard' ? 20 * sup.ail : mv.side === 'mist' ? 12 * sup.drop : 0; }
    }
    if (t && (mv.weather || mv.terrain || mv.room || mv.side)) ctx.extra += T.teamField(B, f, t, mv, was);
    if (mv.hazard) {
      const side = t ? t.side : (f.side === 'me' ? 'foe' : 'me'), Z = KP.HAZARDS[mv.hazard], haz = B.sides[side].haz, before = T.hazardToll(B, side);
      if (Z && (haz[mv.hazard] || 0) < Z.max) { haz[mv.hazard] = (haz[mv.hazard] || 0) + 1; ctx.extra += T.hazardToll(B, side) - before; }
    }
    if (mv.clearHazards && f.mon.hp > 0) {
      const mine = B.sides[f.side], other = f.side === 'me' ? 'foe' : 'me', theirs = B.sides[other];
      const a0 = T.hazardToll(B, f.side), b0 = T.hazardToll(B, other);
      reset(mine.haz, {});
      if (mv.clearHazards === 'all') { reset(theirs.haz, {}); for (const k of Object.keys(theirs.cond)) if (KP.SIDE_CONDS[k].cat) delete theirs.cond[k]; }
      if (mv.clearHazards === 'field' || mv.clearField) { B.wx = null; B.terrain = null; }
      ctx.extra += (a0 - T.hazardToll(B, f.side)) - (b0 - T.hazardToll(B, other));
    }
    if (mv.haze) for (const x of [B.me, B.foe]) if (x) for (const k of Object.keys(x.st)) x.st[k] = 0;
    if (mv.invertFoe && t && t.mon.hp > 0) for (const k of Object.keys(t.st)) t.st[k] = -t.st[k];
    if (mv.cureTeam) { if (f.mon.hp > 0) f.mon.status = null; ctx.extra += 12 * benched(B, f).filter(m => m.status).length; }
    if (mv.trick && t && t.mon.hp > 0 && !tab.anchor && (f.mon.held || t.mon.held)) { const a = f.mon.held; f.mon.held = t.mon.held; t.mon.held = a; f.lock = null; t.lock = null; }
    if (mv.selfFaint && f.mon.hp > 0) f.mon.hp = 0;
    const fit = itOf(B, f);
    if (fit.lifeOrb && cat !== 'status' && landed && f.mon.hp > 0 && !sheer && !ab.magicGuard) T.chip(B, f, typeof fit.lifeOrb === 'number' ? fit.lifeOrb : 0.1);
    // ---- switching (the end of this bout): a forced switch's worth (its boosts gone, the hazards on the way in), a pivot's
    if (mv.forceSwitch && t && t.mon.hp > 0 && !tab.anchor && !(t.side === 'foe' && B.o.kind === 'wild') && benched(B, t).length)
      ctx.extra += 15 * posBoosts(t) + T.hazardToll(B, t.side) / Math.max(1, benched(B, t).length) + 5;
    if (mv.selfSwitch && f.mon.hp > 0 && benched(B, f).length && !(f.side === 'foe' && B.o.kind === 'wild')) ctx.pivot = mv.selfSwitch;
  };
  // what a field move does for the teammates waiting behind (the race only sees this one-on-one): screens, Veil and a
  // tailwind cover each of them for their turns; a weather or terrain helps the ones whose jobs it boosts or whose
  // abilities feed on it (and costs the ones it weakens); Time Warp helps the slower ones. The archetypes built on a
  // field (screens, weather, terrain, Time Warp teams; the user, 2026-10-03) set it up for the team, not for the setter
  const dmgOfType = (m, ty) => m.moves.some(id => { const mv = MV(id); return mv && dmgMove(mv) && mv.type === ty; });
  const feeds = (ab, id) => !!((ab.fieldSpd && ab.fieldSpd[id]) || ab.boostHighest === id || (ab.fieldStat && ab.fieldStat[id]) || (ab.fieldHeal && ab.fieldHeal[id]));
  T.teamField = (B, f, t, mv, was) => {
    const mates = benched(B, f).filter(m => m.hp > 0); if (!mates.length) return 0;
    const n = Math.min(3, mates.length), tys = (m) => { const s = KP.sp(m); return [s.type, s.type2].filter(Boolean); };
    let v = 0;
    if (mv.side && !was.side && B.sides[f.side].cond[mv.side]) v += ({ wall: 5, shell: 5, veil: 8, tailwind: 5 })[mv.side] * n || 0;
    if (mv.weather && B.wx && B.wx.id === mv.weather && was.wx !== mv.weather) {
      const W = KP.WEATHERS[mv.weather] || {};
      for (const m of mates) {
        let g = feeds(KP.abilityOf(m) || {}, mv.weather) ? 6 : 0;
        for (const ty of tys(m)) { const k = W.mul && W.mul[ty]; if (k > 1 && dmgOfType(m, ty)) g += 6; if (k < 1 && dmgOfType(m, ty)) g -= 4; if (W.stat && W.stat[ty]) g += 3; }
        if (W.chip && !tys(m).some(ty => (W.safe || []).includes(ty))) g -= 2;
        v += g;
      }
    }
    if (mv.terrain && B.terrain && B.terrain.id === mv.terrain && was.te !== mv.terrain) {
      const TR = KP.TERRAINS[mv.terrain] || {};
      for (const m of mates) v += (feeds(KP.abilityOf(m) || {}, mv.terrain) ? 6 : 0) + (TR.boost && dmgOfType(m, TR.boost) ? 6 : 0) + (TR.heal || TR.noStatus || TR.noSleep ? 2 : 0) - (TR.weaken && dmgOfType(m, TR.weaken) ? 4 : 0);
    }
    if (mv.room === 'timewarp' && B.rooms.timewarp && !was.rm) {
      const ts = KP.stat(t.mon, 'spd');
      for (const m of mates) v += KP.stat(m, 'spd') < ts ? 5 : -3;
    }
    return Math.max(-12, Math.min(30, v));
  };
  // a won race with boosts still on: the ones it carries into the foes left (a setup sweeper's sweep: the race alone
  // only sees this foe, and a sweeper that wins anyway never boosted). Its attacking stat and its Speed, up to 4
  // stages, for up to two foes to come
  const sweepOn = (B, f, t) => {
    if (!f || !f.st) return 0;
    const left = benched(B, t).filter(m => m.hp > 0).length; if (!left) return 0;
    const st = Math.max(0, f.st.atk || 0, f.st.mag || 0) + Math.max(0, f.st.spd || 0);
    return 7 * Math.min(4, st) * Math.min(1, left / 2);
  };
  // the foe's own non-attacking moves it could use on f (each 0 or 1: an ailment that would land, a stat drop, a set-up,
  // a field or side move): what a Safeguard, a Mist, a Taunt or a Reflect would keep off
  T.support = (B, t, f) => {
    const o = { ail: 0, drop: 0, setup: 0, field: 0 };
    for (const id of t.mon.moves) {
      const mv = MV(id); if (!mv || catOf(mv) !== 'status' || !workable(B, t, id, mv)) continue;
      if (mv.status && !f.mon.status && KP.effAgainst(B, t, f, mv.type) > 0) o.ail = 1;
      if ((mv.stat && mv.stat[2] === 'foe' && mv.stat[1] < 0) || (mv.foe && Object.values(mv.foe).some(n => n < 0))) o.drop = 1;
      if ((mv.stat && mv.stat[2] === 'self' && mv.stat[1] > 0) || (mv.self && Object.values(mv.self).some(n => n > 0))) o.setup = 1;
      if (mv.weather || mv.terrain || mv.room || mv.side || mv.hazard || mv.vol) o.field = 1;
    }
    return o;
  };
  // binding (Wrap's kind: 1/8 a turn, a Binding Band 1/6, a Grip Claw longer), or a block (no escape)
  T.trap = (B, f, t, mv) => {
    if (mv.trap === 'block') { if (!t.vol.block) t.vol.block = f; return; }
    if (t.vol.bound) return;
    const it = itOf(B, f); t.vol.bound = { by: f, name: mv.name, turns: it.gripClaw ? 7 : 4.5, frac: it.bindBand ? 1 / 6 : 1 / 8 };
  };
  // a counter's (Retort's kind, last to move): twice the hit it took this turn of its kind (any kind: 1.5x)
  T.counterDmg = (B, f, t, mv, ctx) => {
    const h = ctx.took; if (!h || !h.dmg) return 0;
    return mv.counter === 'any' || h.cat === mv.counter ? h.dmg * (mv.counter === 'any' ? 1.5 : 2) : 0;
  };

  // ------------------------------------------------------------------ the foe's side of the turn
  // its move: a forced one (a charge's second turn, a rampage; recharging: none), else its best attack now
  T.foeMove = (B, t, f) => {
    if (t.vol.recharge) return null;
    const forced = B.forcedMove ? B.forcedMove(t) : null;
    if (forced && MV(forced)) return forced;
    let best = null, bv = 0;
    for (const id of t.vol.berserk ? [B.strongest(t)] : t.mon.moves) {
      const mv = MV(id); if (!dmgMove(mv) || !B.usable(t, id) || mv.selfFaint) continue;
      const v = T.perUse(B, t, f, mv) * T.hits(B, t, f, mv) * (mv.charge && t.vol.charging !== id && !(mv.charge.skipIn && B.fieldIs(mv.charge.skipIn)) && !itOf(B, t).powerHerb ? 0.5 : 1);
      if (v > bv) { bv = v; best = id; }
    }
    return best;
  };
  // the foe's move landing on f (its checks: asleep, stopped, a charge's first turn; Slow, confusion and a flinch as a
  // share; our Guard (a spiky one's touch), out of reach, a Decoy, a Disguise, Sturdy, a Sash, Endure; what it costs it)
  T.foeTurn = (B, t, f, ctx) => {
    const id = ctx.tId, mv = ctx.tMv; if (!id || !mv || t.mon.hp <= 0 || f.mon.hp <= 0) return;
    if (t.mon.status === 'sleep' || t.mon.status === 'stop') { if ((t.mon.statusT || 0) - 1 > 0) { t.mon.statusT -= 1; return; } t.mon.status = null; }
    const ta = abOf(B, t) || {};
    if (ta.truant && t.loafing) { t.loafing = false; return; }
    if (t.mon.status === 'silence' && KP.MAGIC[mv.type]) return;
    if (mv.charge && t.vol.charging !== id && !(mv.charge.skipIn && B.fieldIs(mv.charge.skipIn))) {
      if (itOf(B, t).powerHerb) { t.mon.held = null; t.lostItem = true; }
      else { t.vol.charging = id; if (mv.charge.invuln) t.vol.invuln = mv.charge.invuln; if (mv.charge.self) T.boost(B, t, mv.charge.self, t); return; }
    }
    if (t.vol.charging === id) { t.vol.charging = null; t.vol.invuln = null; }
    if (mv.cd) { let n = mv.cd + 1; const fa0 = abOf(B, f) || {}; if (fa0.pressure) n += fa0.pressure === true ? 1 : fa0.pressure; if (ta.cdLess) n = Math.max(1, n - ta.cdLess); B.cds(t.mon)[id] = n; }   // (its cooldown, as useMove sets it)
    let a = 1 - (ctx.flinch || 0);
    if (t.mon.status === 'slow') a *= 0.75;
    if (t.vol.confuse > 1) a *= 2 / 3;
    if (a <= 0) return;
    const ti = itOf(B, t);
    if (f.vol.guard && !mv.bypassGuard) {
      const g = f.vol.guard;
      if (typeof g === 'object' && has(mv, 'contact') && !ti.pads) { if (g.hurt) T.chip(B, t, g.hurt * a); if (g.status) T.inflict(B, t, g.status, f); if (g.foe) T.boost(B, t, g.foe, f); }
      return;
    }
    if (!T.reaches(B, t, f, mv)) return;
    const d = T.perUse(B, t, f, mv) * T.hits(B, t, f, mv) * a;
    if (d <= 0) {   // (into an immunity: an absorbing ability drinks it)
      const fab = abOf(B, f) || {}, mt = KP.moveType(B, t, mv);
      if (fab.immune && fab.immune.includes(mt)) { if (fab.absorb) T.heal(B, f, 1 / 4); else if (fab.absorbBoost) T.boost(B, f, fab.absorbBoost, f); else if (fab.flashFire) f.flashFire = mt; }
      return;
    }
    const n = mv.hits ? KP.expectedHits(B, t, mv) : 1, per = d / n, contact = has(mv, 'contact') && !ti.pads, cat = catOf(mv), mt = KP.moveType(B, t, mv), eff = KP.effAgainst(B, t, f, mt);
    let left = n, dealt = 0;
    if (f.vol.decoy && !has(mv, 'sound') && !ta.infiltrator) { while (left > 0 && f.vol.decoy > 0) { f.vol.decoy = Math.max(0, f.vol.decoy - per); left = Math.max(0, left - 1); } if (!f.vol.decoy) delete f.vol.decoy; }
    const fab = abOf(B, f) || {};
    if (left > 0 && fab.disguise && !f.disguiseBroken) { f.disguiseBroken = true; T.hurt(B, f, mx(f) / 8); left = Math.max(0, left - 1); }
    if (left > 0) { dealt = T.hurt(B, f, per * left, { direct: true, single: n <= 1 }); ctx.took = { dmg: dealt, cat }; }
    if (dealt > 0) {
      T.onHit(B, t, f, mv, cat, mt, eff, contact, { extra: 0 });
      if (f.mon.hp <= 0) T.onKO(B, t, f, contact);
      T.afterHits(B, t, f, mv, dealt, true, { extra: 0 });
      if (ti.lifeOrb && t.mon.hp > 0 && !ta.magicGuard && !(ta.sheerForce && KP.hasSecondary(mv))) T.chip(B, t, typeof ti.lifeOrb === 'number' ? ti.lifeOrb : 0.1);
      if (mv.recharge) t.vol.recharge = 1;
    }
  };

  // ------------------------------------------------------------------ the turn's end, and the race on from there
  // HP a moogle gains (+) or loses (-) at each turn's end, as the battle's endOfTurn: the weather (its safe types,
  // Magic Guard, Overcoat, Goggles), the terrain's healing, Regen, poison (Poison Heal's kind heals), venom (growing),
  // burn, an ability's regen, Leftovers, a Sludge, a seed, a curse, a bind, a fieldHeal ability; a Zombie's healing hurts;
  // a Shed Skin's kind may shed the ailment first
  T.residual = (B, x) => {
    if (!x || x.mon.hp <= 0) return 0;
    const m = mx(x), ab = abOf(B, x) || {}, it = itOf(B, x), mg = !!ab.magicGuard, z = x.mon.status === 'zombie' ? -1 : 1;
    const shed = ab.shedSkin ? 1 - (typeof ab.shedSkin === 'number' ? ab.shedSkin : 33) / 100 : 1;
    let h = 0;
    const w = B.weatherId ? B.weatherId() : null, W = w && KP.WEATHERS[w];
    if (W && W.chip && !mg && !ab.overcoat && !it.goggles && !typesOf(x.mon).some(t => (W.safe || []).includes(t))) h -= W.chip;
    const Tr = B.terrain && KP.TERRAINS[B.terrain.id];
    if (Tr && Tr.heal && KP.grounded(B, x)) h += Tr.heal * z;
    if (x.vol.regen) h += z / 16;
    const s = x.mon.status;
    if (s === 'poison' || s === 'venom') h += ab.poisonHeal ? z / 8 : mg ? 0 : -shed * (s === 'poison' ? 1 / 8 : Math.min(15, (x.venomN || 0) + 1) / 16);
    else if (s === 'burn' && !mg) h -= shed / 16;
    if (ab.regen) h += ab.regen * z;
    if (it.leftovers) h += z / 16;
    if (it.sludge) h += typesOf(x.mon).includes(it.sludge) ? z / 16 : (mg ? 0 : -1 / 8);
    if (x.vol.leech && !mg) h -= 1 / 8;
    if (x.vol.curse && !mg) h -= 1 / 4;
    if (x.vol.bound && !mg) h -= x.vol.bound.frac || 1 / 8;
    if (ab.fieldHeal) { const id = Object.keys(ab.fieldHeal).find(k => B.fieldIs(k)); if (id) h += ab.fieldHeal[id] * z; }
    return h * m;
  };
  T.endTurn = (B, f, t) => {
    for (const [x, o] of [[f, t], [t, f]]) {
      if (x.mon.hp <= 0) continue;
      const before = x.mon.hp, d = T.residual(B, x);
      x.mon.hp = Math.max(0, Math.min(mx(x), Math.round(x.mon.hp + d)));
      if (x.mon.hp > 0 && x.mon.hp < before) T.pinch(B, x, before);
      if (x.vol.leech && o.mon.hp > 0 && !(abOf(B, x) || {}).magicGuard) T.heal(B, o, mx(x) / 8);
      const ab = abOf(B, x) || {};
      if (ab.fieldCure && B.fieldIs(ab.fieldCure) && x.mon.status) x.mon.status = null;
      if (x.mon.hp > 0 && x.vol.doom) { x.vol.doom -= 1; if (x.vol.doom <= 0) x.mon.hp = 0; }
      if (x.vol.yawn && x.mon.hp > 0) { x.vol.yawn -= 1; if (x.vol.yawn <= 0) { x.vol.yawn = 0; T.inflict(B, x, 'sleep', null); } }
      if (x.vol.taunt) x.vol.taunt -= 1;
      if (x.vol.encore) x.vol.encore = x.vol.encore.turns > 1 ? { id: x.vol.encore.id, turns: x.vol.encore.turns - 1 } : null;
      if (x.mon.hp > 0 && x.vol.perish) { x.vol.perish -= 1; if (x.vol.perish <= 0) x.mon.hp = 0; }
      if (x.vol.float) x.vol.float -= 1;
      if (x.vol.lockOn) x.vol.lockOn -= 1;
      if (x.vol.bound) { const b = x.vol.bound; x.vol.bound = b.turns > 1 ? Object.assign({}, b, { turns: b.turns - 1 }) : null; }
      if (x.mon.status === 'venom') x.venomN = Math.min(15, (x.venomN || 0) + 1);
      const it = itOf(B, x); if (it.orb && x.mon.hp > 0 && !x.mon.status) T.inflict(B, x, it.orb, null);
      if (ab.onResidualBoost && x.inTurn !== B.turn && x.mon.hp > 0) T.boost(B, x, ab.onResidualBoost, x);
      const c = B.cds(x.mon); for (const k in c) if (c[k] > 0) c[k] -= 1;
      x.vol.guard = null; x.vol.endure = false; x.vol.flinch = false; x.vol.reflect = false;
    }
    for (const side of ['me', 'foe']) { const cond = B.sides[side].cond; for (const k of Object.keys(cond)) if (--cond[k] <= 0) delete cond[k]; }
    if (B.wx && !B.wx.extreme && --B.wx.turns <= 0) B.wx = null;
    if (B.terrain && --B.terrain.turns <= 0) B.terrain = null;
    for (const k of Object.keys(B.rooms)) if (--B.rooms[k] <= 0) delete B.rooms[k];
  };
  // the turns it loses: asleep or stopped (its count's turns but the one it wakes on)
  const lostTurns = (x) => (x.mon.status === 'sleep' || x.mon.status === 'stop') ? Math.max(0, (x.mon.statusT || 0) - 1) : 0;
  // a stage's worth on a stat (the battle's table, KP.boosted)
  const stageMul = (s) => KP.boosted(1000, Math.max(-6, Math.min(6, Math.round(s)))) / 1000;
  // the two moogles raced from the start of the next turn, up to 8 turns: each its best attack every turn (the first
  // turn: what it has ready now), a healing move when it's under 45% (as often as its cooldown lets it; a Taunt or
  // Silence stops it), the protections a hit meets (a Decoy, a Disguise, Sturdy or a Sash at full HP), the turns
  // lost (asleep, stopped, recharging, loafing; a Slow one's quarter, a confused one's third), what each attack costs or
  // gives its user, the chip and healing at each turn's end, a seed's drain, Doom, drowsiness, a stat that grows every
  // turn (Speed Boost's kind, Moody's). The score: a win 100 and up (more HP left, sooner), a loss -100 and down (the foe
  // left lower is better), a draw 10, after 8 turns the HP shares
  T.race = (B, f, t) => {
    const side = (x, y) => {
      const b = T.best(B, x, y), ab = abOf(B, x) || {}, it = itOf(B, x), bm = MV(b.susId) || MV(b.nowId);
      const used = bm ? (catOf(bm) === 'magic' ? 'mag' : 'atk') : 'atk';
      const grow = ab.onResidualBoost ? (ab.onResidualBoost[used] || 0) : ab.moody ? 0.2 : 0;
      const forced = x.vol.charging && MV(x.vol.charging) ? T.perUse(B, x, y, MV(x.vol.charging)) * T.hits(B, x, y, MV(x.vol.charging)) : null;
      const heals = x.mon.moves.map(id => [id, MV(id)]).filter(([id, mv]) => mv && mv.heal && catOf(mv) === 'status' && workable(B, x, id, mv));
      const heal = heals.length && x.mon.status !== 'zombie' ? Math.max(...heals.map(([, mv]) => B.healFrac(x.mon, mv) * (ab.healMul || 1))) : 0;
      const healCd = heals.length ? Math.min(...heals.map(([, mv]) => mv.cd || 0)) : 0;
      const healAt = heals.length ? Math.min(...heals.map(([id]) => B.cds(x.mon)[id] || 0)) + 1 : 99;
      const gl = x.side === 'me' && B.o && B.o.gauntlet > 1;   // (a gauntlet's fight with more to come: it heals sooner)
      return { x, hp: x.mon.hp, max: mx(x), now: b.now, rate: b.sus, multi: b.multi, cost: b.cost, res: T.residual(B, x), mv: bm, forced, healBelow: gl ? 0.6 : 0.45,
        skip: lostTurns(x) + (x.vol.recharge ? 1 : 0), act: x.mon.status === 'slow' ? 0.75 : 1, conf: Math.max(0, Math.ceil((x.vol.confuse || 0) - 1)),
        truant: !!ab.truant, loaf: !!x.loafing, decoy: x.vol.decoy || 0, disguise: !!(ab.disguise && !x.disguiseBroken), hold: !!(ab.sturdy || it.sash),
        doom: Math.min(x.vol.doom || 99, x.vol.perish || 99) % 99, yawn: x.vol.yawn && !x.mon.status ? x.vol.yawn : 0, leech: !!x.vol.leech && !ab.magicGuard,
        stage: x.st[used] || 0, grow, heal, healCd, healAt };
    };
    const F = side(f, t), Tt = side(t, f);
    // (a gauntlet's fight, B.o.gauntlet: the fights left counting this one. The Demo's own side carries its HP into the
    // rest, no repairs between, so a win with HP to spare counts for more, the more fights there are to come: it tops
    // up with its healing moves once the fight is safely won, the user, 2026-10-02)
    const carry = f.side === 'me' && B.o && B.o.gauntlet > 1 ? 1 + 0.5 * Math.min(3, B.o.gauntlet - 1) : 1;
    if (F.hp <= 0 && Tt.hp <= 0) return 10;
    if (Tt.hp <= 0) return 100 + 40 * carry * F.hp / F.max + 16 + sweepOn(B, f, t);
    if (F.hp <= 0) return -100 - 40 * Tt.hp / Tt.max;
    const fFirst = F.mv && Tt.mv ? T.order(B, f, F.mv, t, Tt.mv) : !!F.mv;
    const hit = (A, D, dmg) => {
      if (dmg <= 0) return;
      if (D.decoy > 0) { D.decoy = Math.max(0, D.decoy - dmg); return; }
      if (D.disguise) { D.disguise = false; D.hp -= D.max / 8; return; }
      if (D.hold && D.hp >= D.max && !A.multi && dmg >= D.hp) { D.hold = false; D.hp = 1; return; }
      D.hp -= dmg;
    };
    const act = (A) => {
      if (A.skip >= 1) { A.skip -= 1; return 0; }
      let a = A.act; if (A.skip > 0) { a *= 1 - A.skip; A.skip = 0; }
      if (A.truant) { if (A.loaf) { A.loaf = false; return 0; } A.loaf = true; }
      if (A.conf > 0) { A.conf -= 1; a *= 2 / 3; }
      return a;
    };
    let k = 0;
    for (k = 1; k <= 8; k++) {
      for (const [A, D] of fFirst ? [[F, Tt], [Tt, F]] : [[Tt, F], [F, Tt]]) {
        if (A.hp <= 0 || D.hp <= 0) continue;
        const a = act(A); if (!a) continue;
        if (A.heal && A.hp < A.max * A.healBelow && k >= A.healAt) { A.hp = Math.min(A.max, A.hp + A.heal * A.max * a); A.healAt = k + A.healCd + 1; continue; }
        const base = k === 1 && A.forced != null ? A.forced : k === 1 ? A.now : A.rate;
        hit(A, D, base * (A.grow ? stageMul(A.stage) / stageMul(A.stage - A.grow * (k - 1)) : 1) * a);
        A.hp = Math.min(A.max, A.hp + A.cost * a);
      }
      for (const [A, D] of [[F, Tt], [Tt, F]]) {
        if (A.hp <= 0) continue;
        A.hp = Math.min(A.max, A.hp + A.res);
        if (A.leech && D.hp > 0) D.hp = Math.min(D.max, D.hp + A.max / 8);
        if (A.doom && --A.doom <= 0) A.hp = 0;
        if (A.yawn && --A.yawn <= 0) { A.yawn = 0; A.skip += 2; }
        if (A.grow) A.stage = Math.min(6, A.stage + A.grow);
      }
      if (F.hp <= 0 || Tt.hp <= 0) break;
    }
    const hf = Math.max(0, F.hp) / F.max, ht = Math.max(0, Tt.hp) / Tt.max;
    if (F.hp <= 0 && Tt.hp <= 0) return 10 - k;
    if (Tt.hp <= 0) return 100 + 40 * carry * hf - 2 * k + (hf > 0.3 ? sweepOn(B, f, t) : 0);
    if (F.hp <= 0) return -100 - 40 * ht + 2 * k;
    return 40 * (carry * hf - ht);
  };

  // ------------------------------------------------------------------ a move's worth
  // its outcomes: landing or not (a move aimed at the foe), its chance effect coming off or not (an ailment: one of
  // a list's), each with its odds
  T.branches = (B, f, t, mv) => {
    const vol = mv.vol || {}, foeVol = Object.keys(vol).some(k => KP.VOLATILES[k] && KP.VOLATILES[k].foe), cat = catOf(mv);
    const aimed = cat !== 'status' || !!(mv.status || (mv.stat && mv.stat[2] === 'foe') || mv.foe || foeVol || mv.trick);
    const p = aimed && t ? T.hits(B, f, t, mv) : 1, mul = (abOf(B, f) || {}).statusChance || 1;
    let c = 1, kinds = [null];
    if (mv.status) { c = Math.min(1, (mv.status[1] == null ? 100 : mv.status[1]) * mul / 100); if (Array.isArray(mv.status[0])) kinds = mv.status[0]; }
    else if (mv.stat && mv.stat[3] != null) c = Math.min(1, mv.stat[3] * mul / 100);
    else if (mv.foe && mv.foeChance != null) c = Math.min(1, mv.foeChance * mul / 100);
    else if (mv.self && mv.selfChance != null) c = Math.min(1, mv.selfChance * mul / 100);
    const L = [];
    for (const kind of kinds) L.push({ p: p * c / kinds.length, hit: true, sec: true, kind });
    if (c < 1) L.push({ p: p * (1 - c), hit: true, sec: false });
    if (p < 1) L.push({ p: 1 - p, hit: false, sec: false });
    return L.filter(b => b.p > 0.002);
  };
  // this turn played on the copy, then the race: the score
  T.playTurn = (B, f, t, id, br) => sandbox(B, [f, t], () => {
    const mv = MV(id), tId = T.foeMove(B, t, f), ctx = { tId, tMv: tId ? MV(tId) : null, extra: 0, flinch: 0, took: null, pivot: null };
    const fFirst = T.order(B, f, mv, t, ctx.tMv);
    if (!fFirst) T.foeTurn(B, t, f, ctx);
    if (f.mon.hp > 0) T.doMove(B, f, t, id, mv, br, ctx, fFirst);
    if (fFirst && f.mon.hp > 0) T.foeTurn(B, t, f, ctx);
    if (f.mon.hp > 0 || t.mon.hp > 0) T.endTurn(B, f, t);
    let v = T.race(B, f, t) + ctx.extra;
    if (mv.selfFaint && f.mon.hp <= 0 && t.mon.hp > 0) {   // (the user gone by its own move: its teammate's standing then, a free entry, the foe weakened)
      const alt = benched(B, f).map(m => T.standoff(B, m, f.side, t, { free: true })).sort((a, b) => b - a)[0];
      if (alt != null) v = Math.max(v, alt - 30 + ctx.extra);
    }
    // a pivot: out after its move, its side's best in (a Baton Pass's kind takes the boosts along)
    if (ctx.pivot && f.mon.hp > 0) {
      const alt = benched(B, f).map(m => T.standoff(B, m, f.side, t, { free: true, pass: ctx.pivot === 'pass' ? f : null })).sort((a, b) => b - a)[0];
      if (alt != null && alt > v) v = (v + alt) / 2 + 4;
    }
    return v;
  });
  // the expected score of a move: every outcome's, by its odds; a cooldown spent costs a little (the same score without)
  T.evaluate = (B, f, t, id) => {
    const mv = MV(id); let s = 0;
    for (const br of T.branches(B, f, t, mv)) s += br.p * T.playTurn(B, f, t, id, br);
    return s - (chosen(B, f) ? 0 : (mv.cd || 0) * 0.4);
  };
  // a moogle's standing against t if it came in now: the hazards on its side and its coming-out first, then a free hit
  // from t (none for a replacement after a faint: o.free); o.pass: a Baton Pass's kind brings that one's boosts
  T.standoff = (B, mon, side, t, o = {}) => {
    const g = T.ghost(B, mon, side);
    if (g === B.me || g === B.foe) return T.race(B, g, t);
    return sandbox(B, [g, t], () => {
      if (o.pass) Object.assign(g.st, o.pass.st);
      T.entry(B, g, t);
      if (!o.free && g.mon.hp > 0) { const ctx = { tId: T.foeMove(B, t, g), extra: 0, flinch: 0 }; ctx.tMv = ctx.tId ? MV(ctx.tId) : null; T.foeTurn(B, t, g, ctx); T.endTurn(B, g, t); }
      return T.race(B, g, t);
    });
  };
  // nothing at all would come of it (it fails, or changes nothing: a status on one that has one, a weather already up,
  // a move it's immune to...)
  const sig = (B, f, t) => {
    const vs = (x) => Object.keys(x.vol).filter(k => x.vol[k]).sort().map(k => { const v = x.vol[k]; return k + ':' + (v && typeof v === 'object' ? (v.mon ? 'f' : v.turns || v.id || 1) : v); }).join(',');
    const fx = (x) => [x.mon.hp, x.mon.status, JSON.stringify(x.st), vs(x), x.mon.held, x.flashFire || '', x.disguiseBroken ? 1 : 0].join('|');
    return [fx(f), fx(t), B.wx ? B.wx.id : '', B.terrain ? B.terrain.id : '', JSON.stringify(B.rooms), JSON.stringify(B.sides.me.cond), JSON.stringify(B.sides.foe.cond), JSON.stringify(B.sides.me.haz), JSON.stringify(B.sides.foe.haz)].join('#');
  };
  T.wasted = (B, f, t, id) => sandbox(B, [f, t], () => {
    const mv = MV(id); if (!mv) return true;
    const before = sig(B, f, t), ctx = { tMv: null, extra: 0, flinch: 0, took: null, pivot: null };
    T.doMove(B, f, t, id, mv, { hit: true, sec: true, kind: null }, ctx, true);
    return sig(B, f, t) === before && !ctx.extra && !ctx.pivot && !mv.forceSwitch && !mv.counter;
  });

  // ------------------------------------------------------------------ the choices
  // the best move: every usable one played out (T.evaluate); with a wild moogle the Demo wants to befriend, a sleep or a
  // stop on it first (the befriend bonus). o.rank: the whole ranking. (If anything goes wrong in the look ahead, the
  // plain heuristic below answers, and a warning says so once)
  T.choose = (B, f, t, o = {}) => {
    const ids = f.mon.moves.filter(id => MV(id) && B.usable(f, id));
    if (!ids.length) return o.rank ? [] : 'flail';
    if (o.befriend && !t.mon.status) {
      const st = ids.filter(id => { const mv = MV(id); return mv.status && ['sleep', 'stop'].includes(Array.isArray(mv.status[0]) ? mv.status[0][0] : mv.status[0]) && catOf(mv) === 'status' && !T.wasted(B, f, t, id); });
      if (st.length && T.threat(B, t, f) < f.mon.hp) return st.sort((a, b) => T.hits(B, f, t, MV(b)) * MV(b).status[1] - T.hits(B, f, t, MV(a)) * MV(a).status[1])[0];
    }
    if (ids.length === 1 && !o.rank) return ids[0];
    let rank;
    try {
      rank = ids.map(id => ({ id, v: T.evaluate(B, f, t, id), d: T.perUse(B, f, t, MV(id)) * T.hits(B, f, t, MV(id)) }));
    } catch (e) {
      if (!T._warned) { T._warned = true; console.warn('Kupomon AI: the look ahead failed; the plain heuristic answers', e); }
      const id = T.simple(B, f, t, ids); return o.rank ? [{ id, v: 0, d: 0 }] : id;
    }
    rank.sort((a, b) => b.v - a.v || b.d - a.d || (MV(a.id).cd || 0) - (MV(b.id).cd || 0));
    T.last = rank;
    return o.rank ? rank : rank[0].id;
  };
  // a trainer's (not a master's): the best, now and then (15%) the next best when it's close and does something
  T.trainerChoose = (B, f, t) => {
    const rank = T.choose(B, f, t, { rank: true }); if (!rank.length) return 'flail';
    if (rank.length > 1 && Math.random() < 0.15 && rank[1].v > rank[0].v - 40 && !T.wasted(B, f, t, rank[1].id)) return rank[1].id;
    return rank[0].id;
  };
  // a wild moogle's: any move that would do something (Pokémon's wild ones pick at random; ours know what fails)
  T.wildChoose = (B, f, t) => {
    const ids = f.mon.moves.filter(id => MV(id) && B.usable(f, id)); if (!ids.length) return 'flail';
    let ok = ids; try { ok = ids.filter(id => !T.wasted(B, f, t, id)); } catch (e) { ok = ids; }
    const L = ok.length ? ok : ids;
    return L[Math.floor(Math.random() * L.length)];
  };
  // the plain heuristic (a fallback): damage as a share of the foe's HP, an ailment on a healthy foe, a heal when low
  T.simple = (B, f, t, ids) => {
    const v = (id) => { const mv = MV(id); if (dmgMove(mv)) return B.damageOf(f, t, mv) * KP.expectedHits(B, f, mv) * T.hits(B, f, t, mv) / Math.max(1, t.mon.hp) * 100;
      if (mv.heal) return f.mon.hp < mx(f) * 0.45 ? 60 : 0; if (mv.status) return t.mon.status ? 0 : 30; return 10; };
    return ids.slice().sort((a, b) => v(b) - v(a))[0];
  };
  // the best ailment play this turn (a sleep or stop on a sweeper): the Demo stays in for it rather than switching
  T.disablePlay = (B, f, t) => {
    const id = T.choose(B, f, t), mv = MV(id);
    return !!(mv && catOf(mv) === 'status' && mv.status && (mv.status[0] === 'sleep' || mv.status[0] === 'stop'));
  };
  // how well a moogle stands against another. In a battle (B): the race, a ratio around 1 (exp(score/50): 2 is well
  // ahead, 0.5 well behind; o.free: coming in after a faint, no free hit). Outside one: its best hit over the other's
  // best hit back (types, STAB, the stats), weighed by the HP it has left
  T.matchup = (mon, foeMon, B, o = {}) => {
    const t = B ? fighterOf(B, foeMon) : null;
    if (B && t) {
      try { const s = T.standoff(B, mon, t.side === 'me' ? 'foe' : 'me', t, o); return Math.exp(Math.max(-150, Math.min(150, s)) / 50); }
      catch (e) { if (!T._warned) { T._warned = true; console.warn('Kupomon AI: matchup', e); } }
    }
    const hit = (a, x) => Math.max(1, ...a.moves.map(id => MV(id)).filter(mv => dmgMove(mv)).map(mv => KP.hitWorth(a, x, mv)));
    return (hit(mon, foeMon) / Math.max(1, hit(foeMon, mon))) * (mon.hp / KP.maxHp(mon) + 0.25);
  };
  // the max AI (rivals, the Elite Four, the Champion; ai 'max'): a moogle losing its race steps out for a teammate whose
  // standoff (the hazards, the free hit, its coming-out ability) is far better (once per opposing moogle, so it never
  // ping-pongs; not while it can put a sweeper to sleep); after a faint the one sent in is the one that fares best
  T.maxSwitch = (B, f, t, team) => {
    if (f.vol.berserk || (B._maxSwitched || {})[f.side] === t.mon.uid) return null;
    if (B.canSwitch && !B.canSwitch(f)) return null;
    let stay;
    try { stay = T.race(B, f, t); } catch (e) { return null; }
    if (stay > -20 || T.disablePlay(B, f, t)) return null;
    let best = null;
    for (const m of team) { if (m === f.mon || m.hp <= KP.maxHp(m) * 0.3) continue; const v = T.standoff(B, m, f.side, t); if (!best || v > best[1]) best = [m, v]; }
    if (!best || best[1] < stay + 30) return null;
    (B._maxSwitched = B._maxSwitched || {})[f.side] = t.mon.uid;
    return best[0];
  };
  T.bestNext = (team, t) => {
    const L = team.filter(m => m.hp > 0); if (L.length < 2 || !t || !t.B) return L[0];
    const B = t.B, side = t.side === 'me' ? 'foe' : 'me';
    try { return L.map(m => [m, T.standoff(B, m, side, t, { free: true })]).sort((a, b) => b[1] - a[1])[0][0]; }
    catch (e) { return L.sort((a, b) => T.matchup(b, t.mon) - T.matchup(a, t.mon))[0]; }
  };

  // ------------------------------------------------------------------ four moves out of a pool
  // a cooldown-free attack first, the strongest own-type hit, the best coverage, then the most useful of what's left (an
  // ailment that wins fights, a self-buff, a heal, a wall, a hazard...)
  T.pickFour = (mon, pool) => {
    const sp = KP.sp(mon), own = (mv) => mv.type && (mv.type === sp.type || mv.type === sp.type2);
    const val = (id) => {
      const mv = MV(id); if (!mv) return -1;
      if (dmgMove(mv)) {
        const pw = KP.nominalPower ? KP.nominalPower(mv) : mv.power || 0;
        const cat = catOf(mv), stat = KP.stat(mon, cat === 'magic' ? 'mag' : 'atk') / Math.max(1, (KP.stat(mon, 'atk') + KP.stat(mon, 'mag')) / 2);
        return pw * (own(mv) ? 1.5 : 1) * (mv.acc === true ? 1 : (mv.acc || 100) / 100) * stat / (1 + 0.12 * (mv.cd || 0)) * (mv.drain ? 1.15 : 1) * (mv.prio > 0 ? 1.05 : 1) * (mv.recharge || mv.charge ? 0.6 : 1) * (mv.recoil ? 0.92 : 1)
          * (mv.selfFaint ? 0.3 : 1) * (mv.crash ? 0.9 : 1) * (mv.hpCost ? 0.9 : 1) + (mv.status ? 8 : 0) + (mv.selfSwitch ? 6 : 0) + (mv.knockOff || mv.stealItem ? 6 : 0) + (mv.trap ? 4 : 0) + (mv.breakWalls ? 4 : 0) + (mv.flinch ? 4 : 0);
      }
      if (mv.status) return 55 * (STATUS_VALUE[Array.isArray(mv.status[0]) ? 'poison' : mv.status[0]] || 0.3) + 20;
      if (mv.heal) return 52;
      if (mv.stat) return mv.stat[2] === 'self' ? 48 : 34;
      if (mv.self) return 30 + 12 * Object.values(mv.self).reduce((a, n) => a + Math.max(0, n), 0);
      if (mv.side || mv.hazard) return 46;
      if (mv.weather || mv.terrain) return 40;
      if (mv.guard) return 36;
      if (mv.vol || mv.foe || mv.room || mv.trick || mv.haze || mv.invertFoe) return 38;
      if (mv.clearHazards || mv.cureTeam || mv.forceSwitch) return 32;
      if (mv.endure) return 14;
      return 10;
    };
    const P = Array.from(new Set(pool)).filter(id => MV(id)), n = Math.min(4, P.length), out = [];
    const add = (id) => { if (id && !out.includes(id) && out.length < n) out.push(id); };
    const atk = P.filter(id => dmgMove(MV(id))).sort((a, b) => val(b) - val(a));
    add(atk.find(id => !MV(id).cd));
    add(atk.find(id => own(MV(id))));
    add(atk.find(id => !out.some(o => MV(o).type === MV(id).type)));
    const util = P.filter(id => !dmgMove(MV(id))).sort((a, b) => val(b) - val(a));
    if (util.length && val(util[0]) > 45) add(util[0]);
    P.slice().sort((a, b) => val(b) - val(a)).forEach(add);
    return out;
  };
  // a move's power for comparing (its powerBy's typical value; fixed damage and the like, as a power would land)
  KP.nominalPower = (mv) => {
    if (!mv) return 0;
    if (mv.ohko) return 60;
    if (mv.counter) return 55;
    if (mv.fixed != null) return mv.fixed === 'half' ? 75 : mv.fixed === 'level' ? 65 : typeof mv.fixed === 'number' ? Math.min(100, mv.fixed) : 60;
    const by = { lowHp: 70, highHp: 100, targetHp: 85, faster: 80, slower: 70, boosts: 50, targetBoosts: 70 }[mv.powerBy];
    const p = by || (mv.powerBy ? (mv.power || 50) * 1.4 : mv.power || 0);
    return p * (mv.hits ? (typeof mv.hits === 'number' ? mv.hits : 3.1) : 1);
  };

  // ------------------------------------------------------------------ what the AI knows: every effect key, and where
  // calc: the battle's own maths, run by T.perUse / T.hits / T.order (KP.damage, KP.accuracyOf, KP.speedOf,
  //   KP.priorityOf, KP.critChance: every handler on both sides, the field's, the side's) · sim: played on the copy
  //   (T.doMove, T.body, T.onHit, T.afterHits, T.onKO, T.foeTurn, T.inflict, T.boost, T.vols, the setters) · race: the
  //   race and the turn's end (T.race, T.residual, T.endTurn) · switch: switching (T.standoff, T.entry, T.hazardToll) ·
  //   none: not a choice in battle (its words, a shop's, the Kupodex's)
  const keys = (how, list) => Object.fromEntries(list.split(' ').map(k => [k, how]));
  T.KNOWS = {
    move: Object.assign(
      keys('none', 'name desc fx sig'),
      keys('calc', 'type power acc prio crit cat flags hits typeBy powerBy fixed statFrom useStat hitStat ignoreDefStages ohko alwaysCrit powerOf'),
      keys('sim', 'cd status stat heal cures drain firstTurnOnly flinch selfFaint guard side vol selfSwitch self weather counter forceSwitch breakWalls foe recoil endure haze knockOff hpCost charge clearHazards clearField crash room stealItem bypassGuard onlyIfFoeAttacks invertFoe recharge hazard trick rampage hitsInvuln trap cureTeam foeChance selfChance terrain rest wish perish courtChange resetFoe')),
    vol: Object.assign(keys('sim', 'taunt block suppressed decoy float lockOn reflect guard endure invuln charging rampage flinch berserk encore'), keys('race', 'leech yawn curse regen destiny focus bound confuse doom recharge perish')),
    status: Object.assign(keys('calc', 'blind silence mini zombie'), keys('race', 'poison sleep stop confuse berserk doom burn slow venom')),
    weather: keys('calc', 'radiance gloom sandstorm manastorm'),
    terrain: keys('calc', 'rhythm lifestream fog chrono'),
    room: keys('calc', 'timewarp gravity nullzone wonderzone'),
    side: Object.assign(keys('calc', 'wall shell veil tailwind'), keys('sim', 'safeguard mist')),
    hazard: keys('switch', 'caltrops mines venom_spikes web'),
    ability: Object.assign(
      keys('none', 'name desc coins expMul legend frisk announce runAway'),
      keys('calc', 'boost stab resist crit statMul guts pinchSpd firstStrike technician flagBoost flagResist catResist catBoost tintedLens sheerForce filter multiscale sniper hustle accMul evade fieldEvade fieldSpd fieldStat boostHighest statusStat defeatist analytic stakeout merciless fallenBoost ateType foeStatMul gorillaTactics flashFire prankster triage prioType moveLast unburden noCrit noMiss noGuard unaware scrappy wonderGuard skillLink cloudNine float moldBreaker statusEvade'),
      keys('sim', 'counterHit immune absorb absorbBoost flagImmune noStatus sturdy magicGuard rockHead shieldDust innerFocus infiltrator noStatDrop mirrorStats defiant contrary simple magicBounce goodAsGold noPriorityAgainst anchor overcoat disguise synchronize healMul drainMul statusChance whenHit roughSkin onContactStatus onHit stench cursedBody angerPoint aftermath onKOBoost beastBoost steadfast pressure cdLess parentalBond extreme'),
      keys('race', 'regen poisonHeal truant onResidualBoost moody shedSkin fieldHeal fieldCure'),
      keys('switch', 'onEnter setWeather setTerrain setRoom trace download onEnterBoosts regenerator naturalCure trapFoes')),
    item: Object.assign(
      keys('none', 'name kind price desc once heal nut bonus after move types also coins expMul breed evolve sell shop find regen'),
      keys('calc', 'boost gem catBoost flagBoost choice lifeOrb expertBelt metronome vest eviolite statMul forSpecies crit accMul zoomLens evade ironBall laggingTail resistBerry kingsRock umbrella balloon loadedDice quickChance'),
      keys('sim', 'sash focusChance helmet weaknessPolicy ejectButton redCard whiteHerb mentalHerb powerHerb extend bindBand gripClaw shellBell covertCloak clearAmulet pads goggles throatSpray abilityShield pinchHeal pinchBoost cureStatus hitBoost hitHurt terrainBoost roomService blunderPolicy'),
      keys('race', 'orb sludge leftovers'),
      keys('switch', 'boots shedShell')),
  };
})();

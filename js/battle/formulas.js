// FF7 battle formulas (Terence Fergusson's Battle Mechanics FAQ).
// FF7.battle.calc.resolve(actor, target, ability, ctx) -> result
(function () {
  const U = FF7.util, B = FF7.battle;
  const C = B.calc = {};
  const rnd = (n) => Math.floor(Math.random() * n);
  const R100 = () => Math.floor(rnd(65536) * 99 / 65535) + 1;

  // --- elemental resistance of `t` against a list of elements
  // returns { mult, absorb, immune, weak, resist, death }
  C.elemInfo = function (t, elements) {
    const out = { mult: 1, absorb: false, immune: false, weak: false, resist: false };
    if (!elements || !elements.length) return out;
    for (const el of elements) {
      if (!el) continue;
      let v = 1;
      if (t.isParty) {
        const d = t.elemDef && t.elemDef[el];
        if (d === 'absorb') v = -1; else if (d === 'nullify') v = 0; else if (d === 'halve') v = 0.5; else if (d === 'weak') v = 2;
        if (t.has('shield') && ['fire', 'ice', 'lightning', 'earth', 'poison', 'gravity', 'water', 'wind', 'holy'].includes(el)) v = -1;
      } else if (t.elem && t.elem[el] != null) v = t.elem[el];
      if (v < 0) out.absorb = true;
      else if (v === 0) out.immune = true;
      else if (v >= 2) out.weak = true;
      else if (v < 1) out.resist = true;
    }
    if (out.absorb) out.mult = -1;
    else if (out.immune) out.mult = 0;
    else { if (out.weak) out.mult *= 2; if (out.resist) out.mult *= 0.5; }
    return out;
  };

  // --- hit checks
  C.physHits = function (a, t, ab, ctx) {
    if (ab.autoHit) return true;
    const ei = C.elemInfo(t, ab.elements);
    if (ctx.backAttackTarget || ei.immune || ei.absorb) return true;
    if (t.dead || t.has('sleep') || t.has('confusion') || t.has('stop') || t.has('petrify') || t.has('manipulate') || t.has('paralysis') || t.covering) return true;
    let atPct = ab.acc != null ? ab.acc : (a.isParty ? a.hitPct : 100);
    let hit = Math.floor(a.stat('dex') / 4) + atPct + a.stat('defPct') - t.stat('defPct');   // (the attacker's own Df% counts, enemies' too)
    if (a.has('fury')) hit -= Math.floor(hit * 3 / 10);
    if (a.has('darkness')) hit = Math.floor(hit / 2);
    hit = Math.max(1, hit);
    const r = rnd(100);
    if (r < Math.floor(a.lck / 4)) return true;                              // lucky hit
    if (t.isParty && !a.isParty && r < Math.floor(t.lck / 4) - Math.floor(a.lck / 4)) return false; // lucky evade
    return R100() < hit;
  };
  C.magHits = function (a, t, ab, ctx) {
    const at = ab.hit != null ? ab.hit : 255;
    if (at >= 255) return true;
    const ei = C.elemInfo(t, ab.elements);
    if (ei.immune || ei.absorb) return true;
    let mat = at;
    if (a.has('fury')) mat -= Math.floor(mat * 3 / 10);
    if (rnd(100) < (t.mdfPct || 0)) return false;
    const hit = mat + a.level - Math.floor(t.level / 2) - 1;
    return rnd(100) < hit;
  };
  C.statusHits = function (a, t, ab, ctx) {
    let ch = ab.statusChance != null ? ab.statusChance : (ab.hit != null ? ab.hit : 100);
    if (ch >= 100) return true;
    if (t.isParty && ab.add && ab.add.some(s => ['haste', 'berserk', 'shield'].includes(s))) return true;
    if (ctx.mpTurbo) ch = Math.floor(ch * (10 + ctx.mpTurbo) / 10);
    if (ctx.multi > 1 && ab.split !== false) ch = Math.floor(ch * 2 / 3);
    if (ctx.quadra) ch = Math.floor(ch / 2);
    return rnd(100) < ch - 1;
  };

  // --- damage bases
  C.physBase = (att, lvl) => att + Math.floor((att + lvl) / 32) * Math.floor((att * lvl) / 32);
  C.magBase = (mat, lvl) => 6 * (mat + lvl);

  // FF7 back attack damage (physical only): the target has its back to the attacker. An enemy may decide it
  // itself (def.backFrom(target, attacker): Air Buster's turning), otherwise the target's real facing is used:
  // homeFacing (battle.js formations), which differs from the facing drawn in a Back Attack (the party is only
  // shown turned away: FF7 gives them no back damage) and while the party turns to run.
  C.isBack = function (a, t) {
    if (!a || !t || a === t || !!a.isParty === !!t.isParty) return false;
    const d0 = t.def0 || {};
    if (typeof d0.backFrom === 'function') { try { return !!d0.backFrom(t, a); } catch (e) { return false; } }
    const f = t.homeFacing != null ? t.homeFacing : t.facing;
    if (f == null || !a.pos || !t.pos) return false;
    return Math.sin(f) * (a.pos[0] - t.pos[0]) + Math.cos(f) * (a.pos[2] - t.pos[2]) < 0;
  };
  // Resolve one ability against one target. Does NOT mutate; returns a result object.
  // ctx: { multi, split, quadra, mpTurbo, isItem, backAttackTarget, command }
  C.resolve = function (a, t, ab, ctx = {}) {
    const res = { target: t, miss: false, dmg: 0, heal: false, mp: false, crit: false, add: [], remove: [], kill: false, revive: false, text: null, absorbed: false };
    const kind = ab.kind || 'damage';
    const elements = ab.elements || (ab.element ? (Array.isArray(ab.element) ? ab.element : [ab.element]) : []);
    ab.elements = elements;
    const phys = kind === 'phys' || ab.phys === true || (kind === 'drain' && ab.formula === 'phys');   // formula 'phys': a drain on the physical formula (enemy data)
    if (phys && ctx.backAttackTarget == null) ctx = Object.assign({}, ctx, { backAttackTarget: C.isBack(a, t) });
    // dead targets only accept revive-type abilities
    if (t.dead && !['revive', 'fullcure_revive'].includes(kind) && !ab.revives) { res.miss = true; res.noEffect = true; return res; }
    if (t.has('petrify') && !(ab.remove && ab.remove.includes('petrify'))) { res.miss = true; return res; }
    // invulnerable / physical immunity
    if (t.invulnerable && !(t.vars && t.vars.vulnerable) && kind !== 'heal' && kind !== 'cure') { res.miss = true; res.text = 'Miss'; return res; }
    if (phys && t.physImmune && ab.src !== 'limit' && !(t.vars && t.vars.vulnerable)) { res.dmg = 0; res.text = '0'; return res; }
    if (phys && t.cantReach && !(a.longRange || ab.longRange || ab.reach) && ab.src === 'attack') { res.miss = true; res.text = 'Miss'; return res; }
    if (t.flying && elements.includes('earth') && !t.isParty) { res.miss = true; return res; }

    const ei = C.elemInfo(t, elements);
    const undeadHeal = t.undead && (kind === 'heal' || ab.restorative);

    // ---- hit
    let hits;
    if (phys) hits = C.physHits(a, t, ab, ctx);
    else if (['status', 'death', 'gravity'].includes(kind) || ab.hit != null) hits = C.magHits(a, t, ab, ctx);
    else hits = true;
    if (!hits) { res.miss = true; res.text = 'Miss'; return res; }

    // ---- damage
    let dmg = 0, heal = false;
    const lvl = a.level || 1;
    const def = ab.pierce ? 0 : t.stat('def'), mdf = ab.pierce ? 0 : t.stat('mdf');
    switch (phys && kind === 'drain' ? 'phys' : kind) {
      case 'phys': {
        const att = a.stat('atk');
        const base = C.physBase(att, lvl);
        let power = ab.power != null ? ab.power : 16;
        dmg = Math.floor(power * (512 - Math.min(511, def)) * base / (16 * 512));
        const critPct = Math.floor((a.lck + lvl - t.level) / 4) + (a.isParty ? (a.critBonus || 0) : 0);
        if (ab.crit || a.luckyGirl || (ab.canCrit !== false && R100() <= critPct)) { dmg *= 2; res.crit = true; }
        if (a.has('berserk')) dmg = Math.floor(dmg * 1.5);
        const longR = a.longRange || ab.longRange;
        if (!longR && ab.src !== 'limit' && (a.row === 'back' || t.row === 'back')) dmg = Math.floor(dmg / 2);
        if (t.defending) dmg = Math.floor(dmg / 2);
        if (ctx.backAttackTarget) { dmg = Math.floor(dmg * ((t.def0 && t.def0.backMult) || 2)); res.back = true; }   // x2 (Back Attack Multiplier 16/8); Air Buster x5
        if (a.has('frog')) dmg = Math.floor(dmg / 4);
        if (t.has('sadness')) dmg -= Math.floor(dmg * 3 / 10);
        if (ctx.multi > 1 && ab.split) dmg = Math.floor(dmg * 2 / 3);
        if (t.has('barrier')) dmg = Math.floor(dmg / 2);
        if (a.has('small')) dmg = 0;
        dmg = Math.max(1, Math.floor(dmg * (3841 + rnd(256)) / 4096));
        if (ab.src === 'attack' && a.isParty && a.weapon && a.weapon.special) dmg = C.weaponSpecial(a, t, dmg, ab);
        break;
      }
      case 'damage': case 'mag': case 'drain': case 'mpdrain': {
        if (ab.fixedDmg != null) { dmg = ab.fixedDmg; break; }
        const base = C.magBase(a.stat('mat'), lvl);
        const power = ab.power != null ? ab.power : 16;
        dmg = Math.floor(power * (512 - Math.min(511, mdf)) * base / (16 * 512));
        if (t.has('sadness')) dmg -= Math.floor(dmg * 3 / 10);
        if (ctx.quadra) dmg = Math.floor(dmg / 2);
        else if (ctx.multi > 1 && ctx.split) dmg = Math.floor(dmg * 2 / 3);
        if (t.has('mbarrier')) dmg = Math.floor(dmg / 2);
        if (ctx.mpTurbo) dmg = Math.floor(dmg * (10 + ctx.mpTurbo) / 10);
        dmg = Math.max(1, Math.floor(dmg * (3841 + rnd(256)) / 4096));
        if (kind === 'mpdrain') res.mp = true;
        break;
      }
      case 'heal': {
        if (t.dead && ab.revives) res.revive = true;   // (a heal that also revives: Elena's Turks' Honor)
        if (ab.pct) { dmg = Math.floor(t.maxHp * ab.pct / 100); heal = true; break; }
        if (ab.amount) { dmg = ab.amount; heal = true; break; }
        const base = C.magBase(a.stat('mat'), lvl);
        dmg = base + 22 * (ab.power || 0);
        if (ctx.quadra) dmg = Math.floor(dmg / 2);
        else if (ctx.multi > 1 && ctx.split !== false) dmg = Math.floor(dmg * 2 / 3);
        if (ctx.mpTurbo) dmg = Math.floor(dmg * (10 + ctx.mpTurbo) / 10);
        dmg = Math.max(1, Math.floor(dmg * (3841 + rnd(256)) / 4096));
        heal = true;
        break;
      }
      case 'item': {
        // FF7 item formula: fixed base * (512-Def)/512 (defence picked by item kind)
        const base = ab.fixedDmg || 0;
        const d = ab.itemKind === 'phys' ? def : (ab.itemKind === 'mag' ? mdf : 0);
        dmg = Math.max(1, Math.floor(Math.floor(base * (512 - Math.min(511, d)) / 512) * (3841 + rnd(256)) / 4096));
        break;
      }
      case 'fixed': dmg = ab.amount != null ? ab.amount : (ab.fixed || 0); break;
      case 'gravity': case 'pct': {
        const pct = ab.pct != null ? ab.pct : 25;
        const hpv = ab.stat === 'mp' ? (ab.ofMax ? t.maxMp : t.mp) : (ab.ofMax ? t.maxHp : t.hp);
        if (t.boss && kind === 'gravity' && t.immune && t.immune.includes('gravity')) { res.miss = true; res.text = 'Miss'; return res; }
        dmg = Math.floor(hpv * pct / 100);
        if (ctx.quadra) dmg = Math.floor(dmg / 2);
        if (ab.stat === 'mp') res.mp = true;
        break;
      }
      case 'revive': {
        if (t.undead) { res.kill = true; res.text = 'Death'; return res; }
        if (!t.dead) { res.noEffect = true; break; }
        res.revive = true;
        dmg = Math.max(1, Math.floor(t.maxHp * (ab.pct != null ? ab.pct : 25) / 100));
        heal = true;
        break;
      }
      case 'fullcure': dmg = t.maxHp; heal = true; break;
      case 'death': {
        if (t.immuneTo('death') || (t.boss && t.immune && t.immune.includes('death'))) { res.miss = true; res.text = 'Miss'; return res; }
        if (!C.statusHits(a, t, Object.assign({}, ab, { statusChance: ab.hit != null ? ab.hit : 100 }), ctx)) { res.miss = true; res.text = 'Miss'; return res; }
        res.kill = true;
        break;
      }
      case 'status': case 'cure': case 'dispel': case 'buff': default:
        break;
    }
    if (ab.stat === 'mp') res.mp = true;
    // ---- elements
    if (dmg > 0 && elements.length && !heal) {
      if (ei.absorb) { heal = true; res.absorbed = true; }
      else if (ei.immune) { dmg = 0; res.text = '0'; }
      else { if (ei.weak) dmg *= 2; if (ei.resist) dmg = Math.floor((dmg + 1) / 2); }
    }
    if (undeadHeal && heal) heal = false;
    // cap
    dmg = Math.min(res.mp ? 999 : 9999, Math.max(0, Math.floor(dmg)));
    if (t.has('peerless') && !heal) dmg = 0;
    // weakStatus (Corvette: Confusion): attacks that carry one of these statuses do double damage
    if (!heal && t.def0 && t.def0.weakStatus && ab.add && ab.add.some(x => t.def0.weakStatus.includes(x))) dmg *= 2;
    res.dmg = dmg; res.heal = heal;
    // ---- statuses
    if (ab.add && ab.add.length && !ei.immune) {
      // (a status attack with its own infliction chance, e.g. Bewildered's [80] Confusion, rolls it after the hit check)
      const chanceOk = (kind === 'status' || kind === 'buff') && ab.statusChance == null ? true : C.statusHits(a, t, ab, ctx);
      if (chanceOk) for (const s of ab.add) {
        if (s === 'death') { if (!t.immuneTo('death')) res.kill = true; continue; }
        if (ab.toggle && t.has(s)) { res.remove.push(s); continue; }
        if (!t.immuneTo(s) && !t.has(s)) res.add.push(s);
      }
      if ((kind === 'status') && !res.add.length && !res.remove.length && !res.kill) { res.miss = true; res.text = 'Miss'; }
    }
    if (ab.remove && ab.remove.length) ab.remove.forEach(s => { if (t.has(s)) res.remove.push(s); });
    // physical hits wake sleepers / confusion
    if (phys && dmg > 0) ['sleep', 'confusion', 'manipulate'].forEach(s => { if (t.has(s) && !res.remove.includes(s)) res.remove.push(s); });
    return res;
  };

  // Apply a result to the target; returns list of effects for display
  C.apply = function (a, res, battle) {
    const t = res.target;
    if (res.miss) return res;
    if (res.revive) { t.hp = 0; t.status = {}; }
    if (res.dmg > 0 || res.heal) {
      if (res.mp) {
        if (res.heal) t.mp = Math.min(t.maxMp, t.mp + res.dmg);
        else { const before = t.mp; t.mp = Math.max(0, t.mp - res.dmg); res.mpTaken = before - t.mp; }
      } else if (res.heal) {
        t.hp = Math.min(t.maxHp, t.hp + res.dmg);
      } else {
        const before = t.hp;
        t.hp = Math.max(0, t.hp - res.dmg);
        res.hpLost = before - t.hp;
        if (t.isParty && a && !a.isParty && res.hpLost > 0 && battle) battle.limitGain(t, res.hpLost);
        if (t.hp <= 0) res.kill = true;
      }
    }
    res.remove.forEach(s => t.removeStatus(s));
    res.add.forEach(s => t.addStatus(s));
    // (who dealt the killing blow: a final attack aimed at its killer reads it - AI.onDeath, onDeathTarget)
    if (res.kill) { if (a && a !== t && !!a.isParty !== !!t.isParty) t.killer = a; t.kill(); res.killed = true; }
    return res;
  };

  // Weapon special damage hooks
  C.weaponSpecial = function (a, t, dmg, ab) {
    const w = a.weapon;
    switch (w.special) {
      case 'ultima_weapon': case 'hp_shout': return Math.max(1, Math.floor(dmg * a.hp / a.maxHp));
      case 'limited_moon': case 'venus_gospel': return Math.max(1, Math.floor(dmg * (a.maxMp ? a.mp / a.maxMp : 0) * 1 + dmg * 0.25));
      case 'premium_heart': return Math.max(1, Math.floor(dmg * (0.25 + (a.limitGauge / 255) * 0.75)));
      case 'powersoul': return a.has('death_sentence') ? dmg * 4 : (a.hp < a.maxHp / 4 ? dmg * 2 : dmg);
      case 'master_fist': { const n = Object.keys(a.status).filter(s => B.BAD_STATUS.includes(s)).length; return dmg * (1 + n * 0.25); }
      case 'yoshiyuki': case 'princess_guard': { const n = (a.battle ? a.battle.party.filter(p => p.dead).length : 0); return dmg * (1 + n); }
      case 'death_penalty': { const k = a.char ? a.char.kills || 0 : 0; return Math.min(9999, Math.floor(dmg * (1 + Math.min(k, 65535) / 1024))); }
      case 'missing_score': { const ap = a.char ? a.char.weaponMateria.filter(Boolean).reduce((s, m) => s + m.ap, 0) : 0; return Math.min(9999, dmg + Math.floor(ap / 10000) * 30); }
      case 'conformer': return Math.max(1, Math.floor(dmg * (t.level || 1) / Math.max(1, a.level)));
      default: return dmg;
    }
  };
})();

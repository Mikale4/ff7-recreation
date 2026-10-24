// Special ability hooks (see docs/abilities.md and the enemy docs).
// Each hook: { hit(b, a, t, ab, ctx, act) -> result }  |  { replace: true, run: function*(b, act, ab) }
//            | { after: function*(b, act, ab, targets) }
(function () {
  const U = FF7.util, B = FF7.battle, C = B.calc;
  const S = B.specials = {};
  const R = (t, o) => Object.assign({ target: t, miss: false, dmg: 0, heal: false, mp: false, add: [], remove: [] }, o || {});
  const party = (b, a) => (a.isParty ? b.party : b.enemies);
  const foes = (b, a) => (a.isParty ? b.enemies : b.party);

  // ---------------------------------------------------------------- spells & summons
  S.despell = { hit(b, a, t, ab) { const r = R(t); ['haste', 'slow', 'stop', 'barrier', 'mbarrier', 'reflect', 'regen', 'shield', 'peerless', 'resist'].concat(ab.remove || []).forEach(s => { if (t.has(s)) r.remove.push(s); }); t.deathForce = false; if (!r.remove.length) { r.miss = true; r.text = 'Miss'; } return r; } };
  S.choco_mog = { hit(b, a, t, ab, ctx) { const fat = ab._fat != null ? ab._fat : (ab._fat = U.rand(256) < 15); const ab2 = Object.assign({}, ab, fat ? { power: ab.altPower || 20, add: [] } : {}); if (fat) ab.attackName = ab.altName || 'Fat-Chocobo'; return C.resolve(a, t, ab2, ctx); } };
  S.odin = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      yield* b.summonIntro(a, ab);
      const ts = foes(b, a).filter(x => x.targetable);
      const canKill = ts.filter(t => !t.immuneTo('death') && !(t.immune || []).includes('death'));
      if (canKill.length) {
        yield* b.banner(ab.attackName || 'Steel-bladed sword', 0);
        FF7.fx.play('summon_odin', ts.map(t => b.hitPos(t)));
        yield 24;
        for (const t of canKill) { if (U.chance(92)) { const r = R(t, { kill: true }); C.apply(a, r, b); b.showResult(r, ab); b.afterHit(a, t, r, ab, act, { noKillCredit: true }); } }
      } else {
        yield* b.banner(ab.altName || 'Gunge Lance', 0);
        const t = U.pick(ts);
        FF7.fx.play('summon_odin', [b.hitPos(t)]); yield 20;
        const r = C.resolve(a, t, Object.assign({}, ab, { kind: 'damage', power: ab.altPower || 78, add: [] }), { multi: 1 });
        C.apply(a, r, b); b.showResult(r, ab); b.hurt(t); b.afterHit(a, t, r, ab, act);
      }
      yield 20; b.idle(a); yield* b.cameraHome();
    },
  };
  S.phoenix = { after: function* (b, act, ab) { const a = act.actor; for (const p of party(b, a)) if (p.dead && !p.hidden) { p.hp = p.maxHp; b.revived(p); b.number(p, p.maxHp, { heal: true }); } yield 10; } };

  // ---------------------------------------------------------------- enemy skills
  S.l4_suicide = { hit(b, a, t) { if (t.level % 4 !== 0) return R(t, { miss: true, text: 'Miss' }); const r = R(t, { dmg: Math.floor(t.hp * 31 / 32) }); if (!t.immuneTo('small')) r.add.push('small'); return r; } };
  S.white_wind = { hit(b, a, t, ab) { const r = R(t, { dmg: Math.min(9999, a.hp), heal: true }); (ab.remove || ['poison', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'darkness', 'paralysis', 'berserk']).forEach(s => { if (t.has(s)) r.remove.push(s); }); t.deathForce = false; if (t.dead) return R(t, { miss: true }); return r; } };
  S.angel_whisper = { hit(b, a, t, ab) { const r = R(t, { heal: true }); if (t.dead) { t.hp = 0; r.revive = true; b.revived(t); } r.dmg = t.maxHp; (ab.remove || []).forEach(s => { if (t.has(s)) r.remove.push(s); }); return r; } };
  S.dragon_force = { hit(b, a, t) { t.mods.def = Math.min(100, t.mods.def + 50); t.mods.mdf = Math.min(100, t.mods.mdf + 50); return R(t, { text: 'Def Up' }); } };
  S.death_force = { hit(b, a, t) { t.deathForce = true; return R(t, { text: 'Death Force' }); } };
  S.question = { hit(b, a, t) { return R(t, { dmg: Math.min(9999, Math.max(0, a.maxHp - a.hp)) }); } };
  S.goblin_punch = { hit(b, a, t, ab, ctx) { const r = C.resolve(a, t, Object.assign({}, ab, { kind: 'phys', power: 12, special: null }), ctx); if (a.level === t.level && !r.miss) r.dmg = Math.min(9999, r.dmg * 8); return r; } };
  // (a wild chocobo's Chocobuckle is its counter just before it runs off: ab.thenFlee, "Wark! Wark!")
  S.chocobuckle = { hit(b, a, t) { return R(t, { dmg: Math.min(9999, FF7.state.escapes || 0) }); },
    after: function* (b, act, ab) { const a = act.actor; if (!ab.thenFlee || !a || a.isParty || !a.targetable) return; yield* b.banner('Wark! Wark!', 20); FF7.audio.sfx('run'); yield* b.fleeEnemy(a); } };
  S.l5_death = { hit(b, a, t) { if (t.level % 5 !== 0 || t.immuneTo('death')) return R(t, { miss: true, text: 'Miss' }); return R(t, { kill: true }); } };
  S.roulette = {
    replace: true,
    run: function* (b, act, ab) {
      yield* b.banner(ab.name || 'Roulette', 0);
      const pool = b.party.concat(b.enemies).filter(x => x.targetable);
      for (let i = 0; i < 18; i++) { const t = pool[i % pool.length]; b.pointAt(t); FF7.audio.sfx('cursor'); yield 4 + Math.floor(i / 3); }
      const t = U.pick(pool); b.pointAt(t); yield 20; b.pointAt(null);
      const r = t.immuneTo('death') ? R(t, { miss: true, text: 'Miss' }) : R(t, { kill: true });
      FF7.fx.play('death', [b.hitPos(t)]); yield 16;
      C.apply(act.actor, r, b); b.showResult(r, ab); b.afterHit(act.actor, t, r, ab, act);
      yield 20;
    },
  };
  S.pandoras_box = { hit(b, a, t, ab, ctx) { return C.resolve(a, t, Object.assign({}, ab, { kind: 'damage', pierce: true, special: null }), ctx); } };

  // ---------------------------------------------------------------- limits
  S.blade_beam = { after: function* (b, act, ab, targets) { const a = act.actor; const main = targets[0]; const others = foes(b, a).filter(x => x.targetable && x !== main); if (!others.length) return; yield 10; FF7.fx.play('limit_blade_beam', others.map(t => b.hitPos(t))); yield 10; for (const t of others) { const r = C.resolve(a, t, Object.assign({}, ab, { power: ab.splashPower || 16, special: null }), { multi: 1 }); C.apply(a, r, b); b.showResult(r, ab); b.hurt(t); b.afterHit(a, t, r, ab, act); } } };
  S.mindblow = { hit(b, a, t) { return R(t, { dmg: t.mp, mp: true }); } };
  S.hammerblow = { hit(b, a, t) { if (t.boss || t.immuneTo('death')) return R(t, { miss: true, text: 'Miss' }); t.hidden = true; t.vars.removed = true; b.removeFromBattle(t, 'blown'); return R(t, { text: '' }); } };
  const healAllPct = (pct, removeList) => ({ hit(b, a, t, ab) { if (t.dead) return R(t, { miss: true }); const r = R(t, { dmg: Math.floor(t.maxHp * (ab.pct || pct) / 100), heal: true }); (removeList || []).forEach(s => { if (t.has(s)) r.remove.push(s); }); return r; } });
  S.healing_wind = healAllPct(50);
  S.clear_tranquil = healAllPct(50);
  S.seal_evil = { hit(b, a, t) { const r = R(t); ['stop', 'silence'].forEach(s => { if (!t.immuneTo(s)) r.add.push(s); }); if (!r.add.length) { r.miss = true; r.text = 'Miss'; } return r; } };
  S.breath_of_the_earth = { hit(b, a, t, ab) { const r = R(t); (ab.remove || B.BAD_STATUS).forEach(s => { if (t.has(s) && s !== 'fury' && s !== 'sadness') r.remove.push(s); }); return r; } };
  S.fury_brand = { hit(b, a, t) { if (t !== a && t.isParty && !t.dead) t.limitGauge = 255; return R(t, { text: t !== a ? 'Limit!' : '' }); } };
  S.planet_protector = { hit(b, a, t) { const r = R(t); if (!t.dead) r.add.push('peerless'); return r; } };
  S.pulse_of_life = { hit(b, a, t) { const r = R(t, { heal: true, dmg: t.maxHp }); if (t.dead) { r.revive = true; b.revived(t); } t.mp = t.maxMp; return r; } };
  S.great_gospel = { hit(b, a, t) { const r = R(t, { heal: true, dmg: t.maxHp }); if (t.dead) { r.revive = true; b.revived(t); } t.mp = t.maxMp; r.add.push('peerless'); return r; } };
  S.lunatic_high = { hit(b, a, t) { const r = R(t); if (!t.dead) { r.add.push('haste'); t.mods.defPct = Math.min(100, t.mods.defPct + 50); } return r; } };
  S.howling_moon = { hit(b, a, t) { const r = R(t); r.add.push('haste', 'berserk'); t.mods.atk = Math.min(100, t.mods.atk + 60); FF7.audio.sfx('howl'); return r; } };
  S.absorb_hp_mp = { hit(b, a, t, ab, ctx) { const r = C.resolve(a, t, Object.assign({}, ab, { special: null }), ctx); if (!r.miss && t.mp > 0) { const g = Math.min(r.dmg, t.hp, t.mp); a.heal(g); a.mp = Math.min(a.maxMp, a.mp + g); } return r; } };

  // ---------------------------------------------------------------- limit choreography (visual only)
  // B.limitMoves[id] (used by actions.doAbility for limits): { ranged: no run-up,
  //   approach*(b, a, t), windup*(b, a, targets, ab), strike(b, a, hitTargets, hitIndex), after*(b, a, targets, ab) }
  // a.lift raises the model (BattleScene.render) without touching positions / logic.
  const M = B.limitMoves = {};
  const eOut = (k) => 1 - (1 - k) * (1 - k);
  const liftTo = function* (a, from, to, n, ease) { for (let i = 1; i <= n; i++) { const k = i / n; a.lift = from + (to - from) * (ease ? ease(k) : k); yield 1; } a.lift = to; };
  // Braver / Boost Jump: crouch, leap high (camera tilts up after it), hang, then slam down onto the target
  const leap = (top, rise, hang, fall, strikeAnim) => function* (b, a, ts) {
    const t = ts[0], zs = t && Math.abs(a.pos[2] - t.pos[2]) > 0.3 ? Math.sign(a.pos[2] - t.pos[2]) : 1;   // from the jumper's side (side / pincer formations)
    b.playAnim(a, 'jump'); yield 5;
    FF7.audio.sfx('jump');
    if (t) b.camTo({ eye: [t.pos[0] + 3.6, 2.2 + top * 0.4, t.pos[2] + 5.4 * zs], target: [t.pos[0] + 0.1, 1.1 + top * 0.35, t.pos[2] + 0.9 * zs], fov: 50 }, rise);
    if (a.model) a.model.play((a.model.anims && a.model.anims.cast) || 'cast', { loop: false, restart: true });
    yield* liftTo(a, 0, top, rise, eOut);
    yield hang;
    b.playAnim(a, strikeAnim || 'attack');
    if (t) b.camTo({ eye: [t.pos[0] + 3.3, 1.9, t.pos[2] + 4.4 * zs], target: [t.pos[0] + 0.1, 0.9, t.pos[2] + 0.8 * zs], fov: 46 }, fall + 2);
    yield* liftTo(a, top, 0, fall, (k) => k * k);
  };
  const land = function* (b, a) { a.lift = 0; yield 1; };
  const jumpOut = (top) => function* (b, a) { b.playAnim(a, 'jump'); yield 5; FF7.audio.sfx('jump'); yield* liftTo(a, 0, top, 10, eOut); };
  const dropIn = (top) => function* (b, a) { yield* liftTo(a, a.lift || top, 0, 8, (k) => k * k); };
  const charge = (frames, anim) => function* (b, a) { FF7.fx.play('charge', [b.hitPos(a)]); b.playAnim(a, 'cast'); yield frames; b.playAnim(a, anim || 'attack'); yield 4; };
  // dash: a much faster run-up that leaves a streak (Sled Fang, Blood Fang, Greased Lightning)
  const dash = (preset) => function* (b, a, t) {
    const dir = Math.sign(a.pos[2] - t.pos[2]) || (a.isParty ? 1 : -1), tr = (t.width || 1.2) * 0.45 + 0.7, from = a.pos.slice();
    const to = [t.pos[0] + (a.pos[0] > t.pos[0] ? 1 : -1) * 0.2, 0, t.pos[2] + dir * tr];
    a.facing = Math.atan2(t.pos[0] - to[0], t.pos[2] - to[2]);
    b.playAnim(a, 'run');
    FF7.fx.play(preset, [[to[0], 0.6, to[2]]], { from: [from[0], 0.6, from[2]] });
    for (let i = 1; i <= 5; i++) { const k = i / 5; a.pos = [from[0] + (to[0] - from[0]) * k, 0, from[2] + (to[2] - from[2]) * k]; yield 1; }
  };
  const flurry = (n, gap) => function (b, a) { for (let i = 1; i <= n; i++) FF7.fx.delay(() => b.playAnim(a, 'attack'), i * gap); };
  M.braver = { windup: leap(3.4, 14, 4, 5), after: land };
  M.cross_slash = { windup: function* (b, a) { b.playAnim(a, 'attack'); yield 4; }, strike: flurry(3, 4) };
  M.blade_beam = { ranged: true, windup: function* (b, a) { b.playAnim(a, 'attack'); yield 10; } };
  M.climhazzard = { windup: function* (b, a) { b.playAnim(a, 'thrust'); yield 8; b.playAnim(a, 'attack'); yield* liftTo(a, 0, 2, 6, eOut); }, after: dropIn(2) };
  M.meteorain = { windup: jumpOut(3), after: dropIn(3) };
  M.big_shot = { ranged: true, windup: charge(18) };
  M.mindblow = { ranged: true, windup: function* (b, a) { b.playAnim(a, 'attack'); yield 6; } };
  M.grenade_bomb = { windup: function* (b, a) { b.playAnim(a, 'item'); yield 8; } };
  M.dynamite = M.grenade_bomb;
  M.satellite_beam = { windup: function* (b, a) { b.playAnim(a, 'cast'); yield 18; } };
  M.sled_fang = { approach: dash('dash_red') };
  M.blood_fang = { approach: dash('dash_red') };
  M.greased_lightning = { approach: dash('dash_bolt') };
  M.boost_jump = { windup: leap(4.6, 12, 8, 4, 'thrust'), after: land };
  M.hyper_jump = { windup: jumpOut(6), after: dropIn(6) };
  M.dragon_dive = { windup: jumpOut(3), after: dropIn(3) };

  // Tifa's slot reels: one reel per learned limit up to the chosen one
  S.tifa_slots = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      const order = ['beat_rush', 'somersault', 'waterkick', 'meteodrive', 'dolphin_blow', 'meteor_strike', 'final_heaven'];
      const known = a.char ? a.char.limitsKnown : [ab.id];
      const upto = order.indexOf(ab.id);
      const chain = order.filter((id, i) => i <= upto && known.includes(id));
      yield* (b.limitAura ? b.limitAura(a, ab) : b.limitIntro(a, ab));
      if (b.limitFollow) b.limitFollow(a, [a], false);                     // medium shot of Tifa while the reels spin
      const results = [], shown = [];
      for (let i = 0; i < chain.length; i++) {
        if (chain[i] === 'final_heaven') { results.push('yeah'); continue; }
        const w = b.reel(['Miss', 'Hit', 'Yeah!', 'Hit', 'Miss', 'Hit'].slice(0, Math.max(3, 6 - Math.floor(i / 2))), { speed: 5 + i * 1.5, label: FF7.data.limits[chain[i]].name });
        w.prev = shown.slice(); w.total = chain.filter(id => id !== 'final_heaven').length;
        const reel = yield w;
        shown.push(reel);
        results.push(reel === 'Yeah!' ? 'yeah' : reel === 'Hit' ? 'hit' : 'miss');
      }
      for (let i = 0; i < chain.length; i++) {
        if (results[i] === 'miss') { yield* b.banner('Miss', 20); continue; }
        const lab = Object.assign({}, B.actions.limit(chain[i]), { special: null, crit: results[i] === 'yeah' });
        const pool = foes(b, a).filter(x => x.targetable); if (!pool.length) break;
        const t = act.targets && act.targets[0] && act.targets[0].targetable ? act.targets[0] : U.pick(pool);
        yield* b.banner(lab.name, 0);
        if (i === 0 && b.limitFollow) b.limitFollow(a, [t], true);
        if (i === 0) yield* b.approach(a, t);
        b.playAnim(a, i % 2 ? 'kick' : 'punch');
        FF7.fx.play(FF7.fx.presetFor(lab), [b.hitPos(t)]);
        yield 12;
        const tgts = lab.target === 'allEnemies' ? pool : [t];
        for (const tt of tgts) { const r = C.resolve(a, tt, lab, { multi: tgts.length, split: !!lab.split }); C.apply(a, r, b); b.showResult(r, lab); if (!r.miss) b.hurt(tt); b.afterHit(a, tt, r, lab, act); }
        yield 14;
      }
      yield* b.retreat(a); b.idle(a); yield* b.cameraHome();
    },
  };
  // Cait Sith: dice
  S.dice = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      const n = a.level < 30 ? 2 : a.level < 40 ? 3 : a.level < 50 ? 4 : a.level < 60 ? 5 : 6;
      yield* (b.limitAura ? b.limitAura(a, ab) : b.limitIntro(a, ab));
      const dice = []; for (let i = 0; i < n; i++) dice.push(1 + U.rand(6));
      let t = (act.targets && act.targets[0] && act.targets[0].targetable) ? act.targets[0] : U.pick(foes(b, a).filter(x => x.targetable));
      // FF7: the dice tumble across the floor toward the enemy and settle on the rolled faces
      if (t && FF7.fx.dice) { b.camTo({ eye: [(a.pos[0] + t.pos[0]) / 2 + 3.2, 2.6, (a.pos[2] + t.pos[2]) / 2 + 3.4], target: [(a.pos[0] + t.pos[0]) / 2, 0.3, (a.pos[2] + t.pos[2]) / 2], fov: 44 }, 14); b.playAnim(a, 'item'); FF7.fx.dice(b, a, t, dice); }
      FF7.audio.sfx('drumroll');
      yield* b.banner('Dice: ' + dice.join(' '), 50);
      const counts = {}; dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
      const most = Math.max(...Object.values(counts));
      const dmg = Math.min(9999, 100 * dice.reduce((s, x) => s + x, 0) * most);
      if (!t || !t.targetable) t = U.pick(foes(b, a).filter(x => x.targetable));
      if (!t) return;
      if (b.limitFollow) b.limitFollow(a, [t], false);
      FF7.fx.play('explosion', [b.hitPos(t)]); yield 14;
      const r = R(t, { dmg }); C.apply(a, r, b); b.showResult(r, ab); b.hurt(t); b.afterHit(a, t, r, ab, act);
      yield 20; b.idle(a); yield* b.cameraHome();
    },
  };
  // Cait Sith: slots
  S.slots = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      yield* (b.limitAura ? b.limitAura(a, ab) : b.limitIntro(a, ab));
      if (b.limitFollow) b.limitFollow(a, [a], false);                     // medium shot of Cait Sith while the reels spin
      const sym = ['CaitS', 'BAR', 'Crown', 'Heart', 'Star', 'Moogle'];
      const reel = (speed, prev) => { const w = b.reel(sym, { speed, label: 'Slots' }); w.prev = prev; w.total = 3; return w; };   // FF7: three picture reels side by side
      const r1 = yield reel(6, []);
      const r2 = yield reel(7, [r1]);
      const r3 = yield reel(8, [r1, r2]);
      if (b.limitFollow) b.limitFollow(a, foes(b, a).filter(x => x.targetable), false);
      const res = [r1, r2, r3].join(' ');
      FF7.audio.sfx('slots');
      const allFoes = foes(b, a).filter(x => x.targetable), allies = party(b, a).filter(x => !x.hidden);
      if (r1 === 'CaitS' && r2 === 'CaitS' && r3 === 'CaitS') { yield* b.banner('Game Over', 40); for (const t of allFoes) { const r = R(t, { kill: true }); C.apply(a, r, b); b.showResult(r, ab); b.afterHit(a, t, r, ab, act); } }
      else if (r1 === 'CaitS' && r2 === 'CaitS' && r3 === 'BAR') { yield* b.banner('Death Joker', 40); for (const t of allies) { const r = R(t, { kill: true }); C.apply(a, r, b); b.showResult(r, ab); } }
      else if (r1 === 'BAR' && r2 === 'BAR' && r3 === 'BAR') { const ids = Object.keys(FF7.data.summons); const id = ids[U.clamp(Math.floor((U.randRange(4, 40) + Math.floor(a.level / 21)) / 2) - 3, 0, ids.length - 1)]; yield* B.actions.doAbility(b, { actor: a, type: 'summon', id, free: true, all: true }); }
      else if (r1 === 'Crown' && r2 === 'Crown' && r3 === 'Crown') { yield* b.banner('Toy Soldier', 30); for (const t of allFoes) { const r = C.resolve(a, t, { kind: 'phys', power: 80, split: true, src: 'limit' }, { multi: allFoes.length }); C.apply(a, r, b); b.showResult(r, ab); b.hurt(t); b.afterHit(a, t, r, ab, act); } }
      else if (r1 === 'Heart' && r2 === 'Heart' && r3 === 'Heart') { yield* b.banner('Lucky Girl', 40); allies.forEach(p => p.luckyGirl = true); }
      else if (r1 === 'Star' && r2 === 'Star' && r3 === 'Star') { yield* b.banner('Mog Dance', 40); allies.forEach(p => { if (!p.dead) { p.hp = p.maxHp; p.mp = p.maxMp; b.number(p, p.maxHp, { heal: true }); } }); }
      else { yield* b.banner('Toy Box', 30); const t = U.pick(allFoes); if (t) { const r = C.resolve(a, t, { kind: 'phys', power: [32, 40, 48, 56, 64, 72, 80][U.rand(7)], src: 'limit' }, { multi: 1 }); C.apply(a, r, b); b.showResult(r, ab); b.hurt(t); b.afterHit(a, t, r, ab, act); } }
      yield 20; b.idle(a); yield* b.cameraHome();
    },
  };
  // Vincent transformations
  const transform = (look) => ({
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      yield* (b.limitAura ? b.limitAura(a, ab) : b.limitIntro(a, ab));
      const form = ab.form || { hpPct: 100, mods: {}, attacks: [{ name: 'Beast Flare', kind: 'damage', power: 40, element: 'fire', target: 'allEnemies' }, { name: 'Bolt Plume', kind: 'phys', power: 32, target: 'enemy' }] };
      a.transformed = form;
      a.hp = a.maxHp;
      a.maxHp = Math.min(9999, Math.floor(a.maxHp * (form.hpPct || 100) / 100)); a.hp = a.maxHp;
      for (const k in form.mods || {}) if (a.mods[k] != null) a.mods[k] = U.clamp(a.mods[k] + form.mods[k], -100, 100);
      ['berserk', 'frog', 'confusion'].forEach(s => a.immune.push(s));
      FF7.fx.play('limit_' + ab.id, [b.hitPos(a)]);
      FF7.sceneMgr.doFlash('#ffffff', 20, 0.8);
      b.swapModel(a, FF7.creatures.build(look, ab.id));
      yield 30;
    },
  });
  S.galian_beast = transform({ type: 'beast', c1: '#6040c0', c2: '#3a2080', c3: '#f0f040', size: 1.3, variant: 3 });
  S.death_gigas = transform({ type: 'giant', c1: '#c0b8a8', c2: '#303848', size: 1.3 });
  S.hellmasker = transform({ type: 'humanoid', c1: '#d0c8c0', c2: '#503040', c3: '#e0e0e0', size: 1.1, variant: 3 });
  S.chaos = transform({ type: 'demon', c1: '#403c68', c2: '#a01820', c3: '#f0f040', size: 1.2 });

  // ---------------------------------------------------------------- enemy specials
  S.nothing = { replace: true, run: function* (b, act, ab) { if (!ab.silent) yield* b.banner(ab.name, 40); if (ab.mark && act.targets && act.targets[0]) act.actor.vars.marked = act.targets[0]; } };
  S.flee = { replace: true, run: function* (b, act, ab) { const a = act.actor; if (ab.name && !ab.silent) yield* b.banner(ab.name, 20); FF7.audio.sfx('run'); yield* b.fleeEnemy(a); } };
  S.selfDestruct = { hit(b, a, t) { return R(t, { dmg: Math.min(9999, a.hp) }); }, after: function* (b, act) { const a = act.actor; a.kill(); b.enemyDied(a, { noReward: false }); yield 20; } };
  S.callHelp = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      if (ab.name && !ab.silent) yield* b.banner(ab.name, 0);
      b.playAnim(a, 'cast'); yield 16;
      const n = ab.count || 1;
      for (let i = 0; i < n; i++) { if (b.enemies.filter(e => e.targetable).length >= 6) break; b.addEnemy(ab.summon || a.id, { near: a }); }
      yield 24; b.idle(a);
    },
  };
  S.death = { hit(b, a, t) { if (t.immuneTo('death')) return R(t, { miss: true, text: 'Miss' }); return R(t, { kill: true }); } };
  S.stealGil = { hit(b, a, t) { const n = Math.min(FF7.state.gil, a.level * 20 + U.rand(100)); FF7.state.gil -= n; a.vars.stolenGil = (a.vars.stolenGil || 0) + n; return R(t, { text: n + ' gil stolen' }); } };
  S.stealItem = { hit(b, a, t) { const inv = FF7.state.items.filter(e => FF7.data.items[e.id]); if (!inv.length) return R(t, { miss: true, text: 'Miss' }); const e = U.pick(inv); FF7.sys.inv.remove(e.id, 1); a.vars.stolenItems = (a.vars.stolenItems || []).concat(e.id); return R(t, { text: 'Stole ' + U.itemName(e.id) }); } };
  S.mpDrain = { hit(b, a, t, ab) { const n = Math.min(t.mp, ab.amount || (a.level * 3)); a.mp = Math.min(a.maxMp || 999, a.mp + n); return R(t, { dmg: n, mp: true }); } };
  S.heal_self = { hit(b, a, t, ab) { return R(a, { dmg: ab.amount || Math.floor(a.maxHp * (ab.pct || 25) / 100), heal: true }); } };
  S.transform = {
    replace: true,
    run: function* (b, act, ab) {
      const a = act.actor;
      if (ab.name && !ab.silent) yield* b.banner(ab.name, 20);
      FF7.sceneMgr.doFlash('#ffffff', 16, 0.8);
      yield 10;
      if (ab.into) b.transformEnemy(a, ab.into);
      [].concat(ab.alsoSpawn || []).forEach(id => b.addEnemy(id, { near: a }));   // one id or a list
      yield 20;
    },
  };
  S.blowAway = { hit(b, a, t) { if (t.isParty && b.party.filter(p => p.targetable).length > 1) { b.removeFromBattle(t, 'blown'); return R(t, { text: '' }); } return R(t, { miss: true, text: 'Miss' }); } };
  S.remove = S.blowAway;
  S.changeRow = { hit(b, a, t) { t.row = t.row === 'front' ? 'back' : 'front'; b.placeParty(true); return R(t, { text: 'Row' }); } };
  S.level_death = { hit(b, a, t, ab) { const n = ab.n || 5; if (t.level % n !== 0 || t.immuneTo('death')) return R(t, { miss: true, text: 'Miss' }); return R(t, { kill: true }); } };
  S.level_status = { hit(b, a, t, ab) { const n = ab.n || 4; if (t.level % n !== 0) return R(t, { miss: true, text: 'Miss' }); const r = R(t); (ab.add || []).forEach(s => { if (!t.immuneTo(s)) r.add.push(s); }); return r; } };
  S.time_damage = { hit(b, a, t) { const sec = Math.floor(FF7.state.time) % 60 || 1; return R(t, { dmg: Math.min(9999, sec * 100) }); } };
  S.everyones_grudge = { hit(b, a, t) { const lv = b.party.reduce((s, p) => s + (p.level || 0), 0); return R(t, { dmg: Math.min(9999, lv * 32) }); } };
  S.aire_tam_storm = { hit(b, a, t, ab) { const n = t.char ? FF7.sys.materia.equippedList(t.char).length : 0; return R(t, { dmg: Math.min(9999, (ab.perMateria || 1111) * n) }); } };
})();

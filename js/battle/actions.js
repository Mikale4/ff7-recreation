// Battle actions: normalizing abilities and executing actions as animated coroutines.
(function () {
  const U = FF7.util, B = FF7.battle, D = FF7.data;
  const C = B.calc;
  const A = B.actions = {};

  // ---------------------------------------------------------------- ability normalization
  const norm = (src, id, def) => {
    if (!def) return null;
    const ab = Object.assign({}, def);
    ab.src = src; ab.id = id;
    // every element the ability lists (Magic Breath: fire, ice and lightning), else its one element
    ab.elements = Array.isArray(def.elements) && def.elements.length ? def.elements.slice() : def.element ? (Array.isArray(def.element) ? def.element.slice() : [def.element]) : [];
    if (!ab.kind) ab.kind = 'damage';
    if (ab.kind === 'mag') ab.kind = 'damage';
    return ab;
  };
  A.spell = (id) => norm('magic', id, D.spells[id]);
  A.summon = (id) => { const ab = norm('summon', id, D.summons[id]); if (ab) { ab.target = ab.target || 'allEnemies'; ab.split = false; } return ab; };
  A.eskill = (id) => norm('eskill', id, D.eskills[id]);
  A.limit = (id) => { const ab = norm('limit', id, D.limits[id]); return ab; };
  A.enemyAttack = (e, key) => {
    const def = (e.attacks && e.attacks[key]) || (key === 'attack' ? { name: 'Attack', kind: 'phys', power: 16, target: 'enemy', silent: true } : null);
    const ab = norm('enemy', key, def);
    if (!ab) return null;
    if (ab.kind === 'special' && !ab.special) ab.special = 'nothing';
    return ab;
  };
  A.attack = (a, opts = {}) => ({
    src: 'attack', id: 'attack', name: 'Attack', kind: 'phys', power: opts.power || 16, target: opts.target || 'enemy',
    elements: (a.weaponElem || []).slice(), silent: true, weaponStatus: a.weaponStatus, split: !!opts.split, crit: opts.crit, longRange: a.longRange, hitMod: opts.hitMod,
  });

  // ---------------------------------------------------------------- target helpers
  A.opponents = (b, a) => (a.isParty !== !!(a.has && a.has('confusion')) ? b.enemies : b.party).filter(x => x.targetable);
  A.allies = (b, a) => (a.isParty ? b.party : b.enemies).filter(x => x.targetable);
  // Resolve an action's final target list at execution time
  A.resolveTargets = function (b, act) {
    const a = act.actor;
    const ab = act.ab;
    const revive = ab && (ab.kind === 'revive' || ab.revives || (ab.effect && ab.effect.revive));
    const valid = (t) => !t.hidden && (revive ? true : t.targetable);
    let side = act.side || 'enemy';
    const pool = () => {
      const opp = a.isParty ? b.enemies : b.party, own = a.isParty ? b.party : b.enemies;
      return (side === 'ally' ? own : opp).filter(valid);
    };
    let ts = (act.targets || []).filter(t => t && valid(t));
    if (act.all) ts = pool();
    else if (!ts.length) { const p = pool(); if (p.length) ts = [U.pick(p)]; }
    if (a.has && a.has('confusion') && !act.all && ts.length === 1 && Math.random() < 0.5) { const other = (side === 'ally' ? (a.isParty ? b.enemies : b.party) : (a.isParty ? b.party : b.enemies)).filter(valid); if (other.length) ts = [U.pick(other)]; }
    return ts;
  };

  // ---------------------------------------------------------------- materia used by itself
  // Sneak Attack, Counter, Magic Counter and Final Attack (Walkthrough / Party Mechanics Guide, support materia):
  // a Magic materia gives its best spell at its current level (Master Magic: any spell at random), a Summon materia
  // its summon (Master Summon: any), a Command materia its highlighted command (Master Command: one of Steal, Sense,
  // Morph, D.blow, Manip. and Mime at random; Throw needs an item and isn't used). Supportive abilities go on the
  // user (the party when area), attacks on `src`, the enemy that set it off (else a random enemy; all of them when
  // area). MP is paid as usual. Returns an action or null.
  const AUTO_CMDS = ['steal', 'mug', 'sense', 'morph', 'deathblow', 'manipulate', 'mime', 'coin'];
  A.materiaAct = function (b, p, m, src) {
    const M = FF7.sys.materia, d = M.def(m); if (!d || !p) return null;
    const lv = M.level(m);
    const foes = b.enemies.filter(x => x.targetable);
    const foe = src && !src.isParty && src.targetable ? src : (foes.length ? U.pick(foes) : null);
    if (d.type === 'magic') {
      let id = null;
      if (m.id === 'master_magic') { const all = []; for (const k in D.materia) { const md = D.materia[k]; if (md.type === 'magic' && md.spells) md.spells.forEach(([sp]) => { if (D.spells[sp]) all.push(sp); }); } id = all.length ? U.pick(all) : null; }
      else { const sp = (d.spells || []).filter(([x, l]) => lv >= l && D.spells[x]).slice(-1)[0]; id = sp ? sp[0] : null; }
      if (!id) return null;
      const sd = D.spells[id], t = sd.target || 'enemy';
      const support = /ally|self|allAllies/.test(t) || ['heal', 'revive', 'fullcure', 'cure', 'buff'].includes(sd.kind);
      if (support) return /^all[A-Z]/.test(t) ? { actor: p, type: 'magic', id, all: true, side: 'ally', targets: b.party.filter(x => !x.hidden) } : { actor: p, type: 'magic', id, side: 'ally', targets: [p] };
      if (/^all[A-Z]/.test(t)) return { actor: p, type: 'magic', id, all: true, side: 'enemy', targets: foes };
      return foe ? { actor: p, type: 'magic', id, side: 'enemy', targets: [foe] } : null;
    }
    if (d.type === 'summon') {
      const id = m.id === 'master_summon' ? U.pick(Object.keys(D.summons)) : d.summon;
      if (!id || !D.summons[id] || !foes.length) return null;
      return { actor: p, type: 'summon', id, all: true, side: 'enemy', targets: foes };
    }
    if (d.type === 'command') {
      let cmd = null;
      if (m.id === 'master_command') cmd = U.pick(['steal', 'sense', 'morph', 'deathblow', 'manipulate', 'mime']);
      else (d.commands || [[m.id, 1]]).forEach(([c, l]) => { if (lv >= l) cmd = c; });
      if (!AUTO_CMDS.includes(cmd)) return null;
      if (cmd === 'mime') return b.lastPartyAction ? { actor: p, type: 'mime' } : null;
      return foe ? { actor: p, type: cmd, targets: [foe], side: 'enemy' } : null;
    }
    return null;
  };
  // the MP an automatic ability needs is there (magic and summons; MP Turbo included)
  A.canPay = function (p, act) {
    if (!act || (act.type !== 'magic' && act.type !== 'summon')) return true;
    const d = act.type === 'magic' ? D.spells[act.id] : D.summons[act.id]; if (!d) return false;
    const own = ((act.type === 'summon' ? p.abilities.summons : p.abilities.spells) || []).find(x => x.id === act.id);
    const t = own && own.supports ? Math.min(5, own.supports.filter(x => x.id === 'mp_turbo').reduce((n, x) => n + (x.level || 1), 0)) : 0;
    const mp = t ? Math.min(255, Math.floor((d.mp || 0) * (10 + t) / 10) + 1) : (d.mp || 0);
    return p.mp >= mp;
  };

  // ---------------------------------------------------------------- execution
  // Generator: executes an action with animation. `b` is the Battle scene.
  A.exec = function* (b, act) {
    const a = act.actor;
    // (a forced action - an enemy's final attack - goes off even after its death fade has hidden it)
    if (!a || (a.hidden && !act.forced) || (!a.alive && !act.forced) || (!a.canAct() && !act.forced)) return;
    if (a.has('silence') && ['magic', 'summon', 'eskill', 'w_magic', 'w_summon'].includes(act.type)) { yield* b.banner('Silenced', 30); return; }
    if (a.isParty && !act.supports && a.abilities && !['magic', 'summon', 'eskill', 'limit', 'w_magic', 'w_summon', 'defend', 'change', 'enemy', 'multi'].includes(act.type)) {
      const sp = [].concat((a.abilities.cmdSupports || {})[act.type] || [], a.abilities.allCmdSupports || []);
      if (sp.length) act.supports = sp;
    }
    a.acting = true;
    b.current = act;
    const self = this;
    // FF7 turns the actor to face the opponent it targets (an enemy behind the party in a pincer or
    // back attack included); healing allies doesn't turn anyone. Afterwards it keeps facing that side
    // (b.faceSide: a Back Attack's party turns round, a pincer's member now shows its back to the other
    // side). An enemy with its own facing rules (def.backFrom: Air Buster) only turns through its AI.
    const foe = [].concat(act.targets || act.target || []).find(t => t && t.pos && t !== a && !!t.isParty !== !!a.isParty);
    const turned = !!foe && !(a.def0 && a.def0.backFrom);
    if (turned) { if (b.faceSide) b.faceSide(a, foe); a.facing = Math.atan2(foe.pos[0] - a.pos[0], foe.pos[2] - a.pos[2]); }
    try {
      switch (act.type) {
        case 'attack': yield* A.doPhysical(b, act, A.attack(a)); break;
        case 'slash_all': yield* A.doPhysical(b, Object.assign(act, { all: true }), A.attack(a, { split: false })); break;
        case 'flash': yield* A.doFlash(b, act); break;
        case 'double_cut': case '4x_cut': yield* A.doMultiCut(b, act, act.type === 'double_cut' ? 2 : 4); break;
        case 'deathblow': yield* A.doPhysical(b, act, Object.assign(A.attack(a), { name: 'Deathblow', crit: true, silent: false, acc: Math.floor((a.hitPct || 100) / 3) })); break;
        case 'morph': yield* A.doPhysical(b, act, Object.assign(A.attack(a), { name: 'Morph', power: 4, silent: false, morph: true })); break;
        case 'steal': case 'mug': yield* A.doSteal(b, act); break;
        case 'sense': yield* A.doSense(b, act); break;
        case 'throw': case 'coin': yield* A.doThrow(b, act); break;
        case 'magic': case 'eskill': case 'summon': case 'limit': case 'enemy': yield* A.doAbility(b, act); break;
        case 'item': yield* A.doItem(b, act); break;
        case 'defend': a.defending = true; a.model && a.model.play && a.model.play(a.model.anims ? a.model.anims.defend || 'defend' : 'defend'); yield 10; break;
        case 'change': a.row = a.row === 'front' ? 'back' : 'front'; if (a.char) a.char.row = a.row; b.placeParty(true); FF7.audio.sfx('cursor'); yield 16; break;
        case 'manipulate': yield* A.doManipulate(b, act); break;
        case 'mime': if (b.lastPartyAction) { const copy = Object.assign({}, b.lastPartyAction, { actor: a, mimed: true, targets: b.lastPartyAction.targets }); yield* A.exec(b, copy); } else yield* b.banner('Mime', 30); break;
        default: yield* A.doAbility(b, act);
      }
    } finally {
      a.acting = false;
      b.current = null;
      if (turned && a.homeFacing != null && !(a.isParty && b.runHold)) a.facing = a.homeFacing;
    }
    if (a.isParty && !act.mimed && !act.counter && act.type !== 'mime') b.lastPartyAction = act;
    if (a.isParty && a.char && act.type === 'limit' && act.id) a.char.limitUses[act.id] = (a.char.limitUses[act.id] || 0) + 1;
    // Added Cut: the Attack command on the same target right after (a random one of an all-target ability's targets)
    if (a.isParty && act.supports && act.supports.some(x => x.id === 'added_cut') && !act.addedCut && a.alive && a.canAct()) {
      const pool = (act.targets || []).filter(t => t && t.targetable && t !== a);
      const t = act.all ? U.pick(pool) : pool[0];
      if (t) b.queue.unshift({ actor: a, type: 'attack', targets: [t], side: t.isParty ? 'ally' : 'enemy', counter: true, addedCut: true });
    }
  };

  // ---- physical attack (party or enemy) with melee approach
  A.doPhysical = function* (b, act, ab) {
    const a = act.actor;
    let targets = A.resolveTargets(b, Object.assign(act, { ab, side: 'enemy' }));
    if (!targets.length) return;
    if (ab.name && !ab.silent) yield* b.banner(ab.name, 0);
    const ranged = a.longRange || (a.isParty && a.model && ['gunarm', 'gun', 'shuriken'].includes(a.model.app && a.model.app.weapon)) || act.all;
    const t0 = targets[0];
    yield* b.cameraOn(a, t0);
    if (a.isParty && !ranged) yield* b.approach(a, t0);
    b.playAnim(a, 'attack');
    FF7.audio.sfx(a.isParty && a.model && a.model.app && ['gunarm', 'gun'].includes(a.model.app.weapon) ? 'shot' : 'run_attack', 0.5);
    yield a.isParty ? 11 : 8;
    const ctx = { multi: targets.length, split: ab.split };
    for (const t of targets) {
      const tt = b.coverFor(t, a, ab, targets.length) || t;
      const res = C.resolve(a, tt, ab, ctx);
      // weapon added-status
      if (!res.miss && ab.weaponStatus) ab.weaponStatus.forEach(ws => { const st = ws.add; if (st && U.chance(ws.chance || 20) && !tt.immuneTo(st)) res.add.push(st); });
      C.apply(a, res, b);
      b.showResult(res, ab);
      if (!res.miss) {
        FF7.fx.play(a.isParty ? (a.model && a.model.app && ['gunarm', 'gun'].includes(a.model.app.weapon) ? 'shot' : (a.model && a.model.app && a.model.app.weapon === 'fist' ? 'punch' : 'slash')) : 'enemy_hit', [b.hitPos(tt)]);
        b.hurt(tt);
      }
      if (ab.morph && res.killed && tt.morph) { b.morphed.push(tt.morph); }
      b.afterHit(a, tt, res, ab, act);
    }
    yield 16;
    if (a.isParty && !ranged) yield* b.retreat(a);
    b.idle(a);
    yield* b.cameraHome();
  };

  A.doMultiCut = function* (b, act, n) {
    const a = act.actor;
    const ab = A.attack(a);
    for (let i = 0; i < n; i++) {
      let targets = A.resolveTargets(b, Object.assign({}, act, { ab, side: 'enemy', targets: n === 4 ? [] : act.targets }));
      if (!targets.length) break;
      const t = targets[0];
      if (i === 0) yield* b.approach(a, t);
      b.playAnim(a, 'attack'); yield 9;
      const res = C.resolve(a, t, ab, { multi: 1 });
      C.apply(a, res, b); b.showResult(res, ab);
      if (!res.miss) { FF7.fx.play('slash', [b.hitPos(t)]); b.hurt(t); }
      b.afterHit(a, t, res, ab, act);
      yield 10;
    }
    yield* b.retreat(a); b.idle(a);
  };

  A.doFlash = function* (b, act) {
    const a = act.actor;
    yield* b.banner('Flash', 0);
    b.playAnim(a, 'attack'); yield 10;
    FF7.sceneMgr.doFlash('#ffffff', 20, 0.8);
    for (const t of b.enemies.filter(e => e.targetable)) {
      let res;
      if (!t.boss && !t.immuneTo('death') && U.chance(Math.max(10, 60 + a.level - t.level))) { res = { target: t, kill: true, add: [], remove: [], dmg: 0 }; C.apply(a, res, b); }
      else { res = C.resolve(a, t, A.attack(a), { multi: 1 }); C.apply(a, res, b); }
      b.showResult(res, {});
      b.afterHit(a, t, res, {}, act);
    }
    yield 24; b.idle(a);
  };

  // ---- steal / mug
  A.doSteal = function* (b, act) {
    const a = act.actor;
    const targets = A.resolveTargets(b, Object.assign(act, { side: 'enemy' }));
    const t = targets[0]; if (!t) return;
    yield* b.banner(act.type === 'mug' ? 'Mug' : 'Steal', 0);
    // (Mega All: every enemy in turn)
    for (const x of act.all ? targets : [t]) {
      if (!x.targetable) continue;
      yield* b.approach(a, x);
      b.playAnim(a, 'attack'); yield 10;
      if (act.type === 'mug') { const res = C.resolve(a, x, A.attack(a), { multi: 1 }); C.apply(a, res, b); b.showResult(res, {}); if (!res.miss) b.hurt(x); b.afterHit(a, x, res, {}, act); }
      const msg = A.tryStealFrom(b, a, x);
      yield* b.retreat(a); b.idle(a);
      yield* b.banner(msg, 50);
    }
  };
  // Steal always succeeds while the enemy still has something (this game's rule; FF7 rolls
  // StealMod = [512 * (40 + Lvl - target's Lvl) / 100] per item, Enemy Mechanics FAQ 2.1.2). Which item: one of
  // the steal list, weighted by each item's own chance, so a rare item stays rare but can still be stolen; with
  // a Sneak Glove the odds turn round (weighted by 1 / chance): the rarer the item, the likelier it is.
  A.tryStealFrom = function (b, a, t) {
    if (!t.steals || !t.steals.length || t.stolen) return 'Nothing to steal';
    const glove = a && a.accessorySpecial === 'sneak_glove';
    const w = t.steals.map(s => { const c = Math.max(1, s.chance != null ? s.chance : 25); return glove ? 1 / c : c; });
    let r = Math.random() * w.reduce((x, y) => x + y, 0), s = t.steals[t.steals.length - 1];
    for (let i = 0; i < t.steals.length; i++) { r -= w[i]; if (r < 0) { s = t.steals[i]; break; } }
    t.stolen = true; t.stolenItem = s.item;
    FF7.sys.inv.add(s.item, 1);
    FF7.audio.sfx('found');
    return 'Stole ' + U.itemName(s.item) + '!';
  };

  A.doSense = function* (b, act) {
    const ts = A.resolveTargets(b, Object.assign(act, { side: 'enemy' })); if (!ts.length) return;
    for (const t of act.all ? ts : ts.slice(0, 1)) {          // (Mega All: every enemy)
      FF7.audio.sfx('scan');
      yield* b.banner(`${t.name}  LV ${t.level}  HP ${t.hp}/${t.maxHp}  MP ${t.mp}/${t.maxMp}`, 90);
      // (Config > Sense Details, js/ui/qol.js: its elements too - the PS1 Sense shows only the line above)
      const el = FF7.qol && FF7.qol.on('senseDetails') ? A.senseElements(t) : '';
      if (el) yield* b.banner(el, 110);
      if (t.def0 && t.def0.desc) yield* b.banner(t.def0.desc, 90);
    }
  };

  // an enemy's elements in words: 'Weak: Fire · Halves: Earth · Void: Gravity · Absorbs: Ice' ('' when it has none)
  A.senseElements = function (t) {
    const e = t.elem || {}, cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const pick = (f) => Object.keys(e).filter(k => f(e[k])).map(cap).join(', ');
    return [['Weak', pick(v => v >= 2)], ['Halves', pick(v => v > 0 && v < 1)], ['Void', pick(v => v === 0)], ['Absorbs', pick(v => v < 0)]]
      .filter(([, v]) => v).map(([k, v]) => k + ': ' + v).join('  ·  ');
  };

  A.doThrow = function* (b, act) {
    const a = act.actor;
    const t = A.resolveTargets(b, Object.assign(act, { side: 'enemy' }))[0]; if (!t) return;
    let dmg;
    if (act.type === 'coin') {
      const gil = Math.min(FF7.state.gil, a.level * 20);
      FF7.state.gil -= gil;
      yield* b.banner('Coin', 0);
      dmg = gil * 2;
    } else {
      const f = U.findItem(act.item);
      FF7.sys.inv.remove(act.item, 1);
      yield* b.banner(f ? f.def.name : 'Throw', 0);
      const pw = f ? (f.def.atk || f.def.damage || 30) : 30;
      dmg = Math.floor(C.physBase(a.stat('atk') + pw, a.level) * (512 - t.stat('def')) / 512 * (3841 + U.rand(256)) / 4096);
    }
    b.playAnim(a, 'item'); yield 14;
    const res = { target: t, dmg: Math.min(9999, Math.max(1, dmg)), add: [], remove: [], heal: false };
    C.apply(a, res, b); b.showResult(res, {}); b.hurt(t); FF7.fx.play('enemy_hit', [b.hitPos(t)]);
    b.afterHit(a, t, res, {}, act);
    yield 18; b.idle(a);
  };

  A.doManipulate = function* (b, act) {
    const a = act.actor;
    const t = A.resolveTargets(b, Object.assign(act, { side: 'enemy' }))[0]; if (!t) return;
    yield* b.banner('Manipulate', 0);
    b.playAnim(a, 'cast'); yield 20;
    // FF7: Sleep, Stop and Paralysis protect from it too (Battle Mechanics FAQ); one enemy per manipulator
    const ok = !t.boss && !t.immuneTo('manipulate') && !['sleep', 'stop', 'paralysis'].some(s => t.has(s)) && U.chance(Math.max(5, 50 + a.level - t.level));
    if (ok) {
      b.enemies.forEach(x => { if (x !== t && x.manipulator === a && x.has('manipulate') && b.releaseManip) b.releaseManip(x); });
      t.addStatus('manipulate'); t.manipulator = a; FF7.fx.play('confuse', [b.hitPos(t)]);
    }
    b.showResult({ target: t, miss: !ok, text: ok ? null : 'Miss', add: [], remove: [] }, {});
    yield 20; b.idle(a);
  };

  // ---- generic ability (magic, e.skill, summon, limit, enemy attack)
  A.doAbility = function* (b, act) {
    const a = act.actor;
    const ab = act.ab || (act.type === 'magic' ? A.spell(act.id) : act.type === 'summon' ? A.summon(act.id) : act.type === 'eskill' ? A.eskill(act.id) : act.type === 'limit' ? A.limit(act.id) : A.enemyAttack(a, act.id));
    if (!ab) return;
    act.ab = ab;
    // the support materia paired with this spell / summon (HP Absorb, MP Absorb: B.afterHit reads act.supports;
    // a Mime copies them with the action)
    if (!act.supports && a.isParty && a.abilities && (act.type === 'magic' || act.type === 'summon')) {
      const own = (act.type === 'summon' ? a.abilities.summons : a.abilities.spells) || [];
      const s = own.find(x => x.id === act.id);
      if (s && s.supports && s.supports.length) act.supports = s.supports;
    }
    // MP Turbo works by itself on everything the paired materia gives (the Auto command's casts and counters too);
    // several stack up to +50%, a single L5's worth (Walkthrough: MP Turbo)
    if (a.isParty && act.supports && (act.type === 'magic' || act.type === 'summon') && !act.mimed) {
      const tl = act.supports.filter(x => x.id === 'mp_turbo').reduce((n, x) => n + (x.level || 1), 0);
      if (tl) act.mpTurbo = Math.min(5, tl);
    }
    // MP cost
    let mp = ab.mp || 0;
    if (act.mpTurbo) mp = Math.min(255, Math.floor(mp * (10 + act.mpTurbo) / 10) + 1);
    if (a.isParty && act.type !== 'limit' && act.type !== 'enemy' && !act.free && !act.mimed && mp > 0) {   // Mime costs no MP (FF7)
      if (a.mp < mp) { yield* b.banner('Not enough MP', 40); return; }
      a.mp -= mp;
    } else if (!a.isParty && mp > 0) { if (a.mp < mp && a.maxMp > 0) { yield* b.banner(ab.name, 20); return; } a.mp = Math.max(0, a.mp - mp); }
    // [summon_seq] cinematic summon (js/battle/summon_seq.js): the sequence drives the timing and lands
    // every hit via hooks.impact; without a sequence the stock summon path below is the fallback.
    if (act.type === 'summon' && B.summonSeq && B.summonSeq.has(ab, act)) { yield* B.summonSeq.run(b, act, ab); return; }
    // a line one of the party calls out as the enemy does this, `line: { who, text, once }` (Cloud as Guard Scorpion
    // raises its tail); once: the first time in the battle only
    const ln = ab.line;
    if (ln && !a.isParty && b.party.some(p => p.id === ln.who && p.alive) && !(ln.once && a.vars && a.vars['said_' + ab.id])) {
      if (a.vars) a.vars['said_' + ab.id] = true;
      yield* b.speech(ln.who, ln.text);
    }
    // specials that fully replace the flow
    if (ab.special && B.specials[ab.special] && B.specials[ab.special].replace) { yield* B.specials[ab.special].run(b, act, ab); return; }
    // name
    if (!ab.silent) yield* b.banner(ab.attackName || ab.name, 0);
    // ---- animation
    const phys = ab.kind === 'phys' || ab.phys;
    let targets = A.resolveTargets(b, Object.assign(act, { side: act.side || A.sideOf(a, ab) }));
    if (!targets.length && ab.target !== 'none') { yield 10; return; }
    if (act.type === 'summon') yield* b.summonIntro(a, ab);
    else if (act.type === 'limit') yield* (b.limitAura ? b.limitAura(a, ab) : b.limitIntro(a, ab));
    else yield* b.cameraOn(a, targets[0]);
    // limit choreography (visual only: B.limitMoves in specials.js) - leaps, dashes, charge-ups
    const moves = act.type === 'limit' && B.limitMoves ? B.limitMoves[ab.id] || null : null;
    const melee = !(moves && moves.ranged) && phys && a.isParty && !a.longRange && act.type !== 'enemy' && act.type !== 'summon' && !act.all && targets.length === 1 && (ab.hits || 1) <= 2;
    if (act.type === 'limit' && b.limitFollow) b.limitFollow(a, targets, melee);
    if (melee) yield* (moves && moves.approach ? moves.approach(b, a, targets[0], ab) : b.approach(a, targets[0]));
    if (moves && moves.windup) yield* moves.windup(b, a, targets, ab);
    else {
      b.playAnim(a, phys ? 'attack' : 'cast');
      if (!phys && act.type !== 'summon') FF7.audio.sfx('cast', 0.6);
      yield phys ? 10 : 16;
    }
    // ---- hits
    const hits = ab.hits || 1;
    const quadra = act.quadra ? Math.min(8, 3 + (act.quadraN || 1)) : 0;   // (Quadra Magic: 4 casts, one more per extra Quadra Magic, 8 at most)
    const nHits = quadra || hits;
    const random = ab.random || quadra;
    const ctx = { multi: targets.length, split: ab.split !== false && (act.all || ab.split === true) && ab.kind !== 'gravity', quadra: !!quadra, mpTurbo: act.mpTurbo || 0, command: act.type };
    if (act.type === 'summon' || ab.target === 'allEnemies' && act.type !== 'magic') ctx.split = !!ab.split && ab.split !== false && act.type !== 'summon' ? true : false;
    const fxName = FF7.fx.presetFor(ab);
    for (let h = 0; h < nHits; h++) {
      let hitTargets = targets;
      if (random) { const pool = A.resolveTargets(b, Object.assign({}, act, { all: true })); if (!pool.length) break; hitTargets = [U.pick(pool)]; ctx.multi = 1; }
      else if (h > 0) hitTargets = targets.filter(t => (ab.kind === 'revive' ? true : t.targetable));
      if (!hitTargets.length) break;
      if (moves && moves.strike) moves.strike(b, a, hitTargets, h);
      const delay = FF7.fx.play(fxName, hitTargets.map(t => b.hitPos(t)), { from: b.hitPos(a) });
      yield Math.max(4, Math.min(delay, 40));      // the effect's own impact frame (see FX.PRESETS[...].hit)
      for (const t0 of hitTargets) {
        // Reflect
        let t = t0;
        if (t.has('reflect') && act.type === 'magic' && !ab.noReflect && ab.kind !== 'phys') {
          FF7.fx.play('reflect', [b.hitPos(t)]);
          const opp = A.opponents(b, t); if (!opp.length) continue;
          t = U.pick(opp);
        }
        if (phys) t = b.coverFor(t, a, ab, hitTargets.length) || t;
        let res;
        if (ab.special && B.specials[ab.special] && B.specials[ab.special].hit) res = B.specials[ab.special].hit(b, a, t, ab, ctx, act);
        else res = C.resolve(a, t, ab, ctx);
        if (!res) continue;
        C.apply(a, res, b);
        if (ab.kind === 'drain' && !res.miss) { const got = res.hpLost != null ? res.hpLost : res.dmg; a.heal(got); b.number(a, got, { heal: true, delay: 10 }); }
        if (ab.kind === 'mpdrain' && !res.miss) { a.mp = Math.min(a.maxMp, a.mp + (res.mpTaken || res.dmg)); }
        b.showResult(res, ab);
        if (!res.miss && !res.heal && res.dmg > 0) b.hurt(t);
        b.afterHit(a, t, res, ab, act);
      }
      yield Math.max(8, 22 - nHits * 2);
    }
    if (moves && moves.after) yield* moves.after(b, a, targets, ab);
    // post effects for special hooks
    if (ab.special && B.specials[ab.special] && B.specials[ab.special].after) yield* B.specials[ab.special].after(b, act, ab, targets);
    // selfKO (Grenade's Bomb Blast): the user dies afterwards and gives no rewards
    if (ab.selfKO && !a.isParty && a.hp > 0) { a.hp = 0; a.removed = 'selfKO'; b.enemyDied(a); }
    // endBattle (Jenova·SYNTHESIS's countdown Ultima): the battle ends right after
    if (ab.endBattle) { b.forceEnd = true; }
    yield 14;
    if (melee) yield* b.retreat(a);
    b.idle(a);
    yield* b.cameraHome();
  };
  A.sideOf = function (a, ab) {
    const t = ab.target || 'enemy';
    if (['ally', 'allAllies', 'self'].includes(t)) return 'ally';
    return 'enemy';
  };

  // ---- items
  A.doItem = function* (b, act) {
    const a = act.actor;
    const def = D.items[act.item];
    if (!def) return;
    // (a battle item for the foes when none is left standing - the last one fading out: the item stays in the bag)
    if (/^(enemy|allEnemies)$/.test(def.target || '') && !b.enemies.some(x => x.targetable)) return;
    if (act.preTaken) act.used = true;   // (taken from the bag when it was picked: js/battle/bmenu.js)
    else if (!act.noConsume) { if (!FF7.sys.inv.remove(act.item, 1)) { yield* b.banner('No more ' + def.name, 30); return; } }
    const eff = def.effect || {};
    yield* b.banner(def.name, 0);
    b.playAnim(a, 'item');
    yield 12;
    if (eff.escape) { FF7.audio.sfx('run'); b.escape(true); return; }
    const tMode = def.target || 'ally';
    const side = /enemy|Enemies/.test(tMode) ? 'enemy' : 'ally';
    const ab = { src: 'item', id: act.item, name: def.name, kind: 'item', revives: !!eff.revive };
    const targets = A.resolveTargets(b, Object.assign(act, { ab, side, all: act.all || /^all[A-Z]/.test(tMode) }));   // 'allAllies' / 'allEnemies' (not 'ally')
    const healItem = eff.healHp || eff.healHpPct || eff.healMp || eff.healMpPct || eff.revive || eff.cure;
    FF7.fx.play(healItem ? 'item_heal' : (eff.damage ? (FF7.fx.presetFor({ element: eff.damage.element, kind: 'damage' })) : 'buff'), targets.map(t => b.hitPos(t)));
    yield 14;
    // Stardust ("Tar: 4 Tar", Party Mechanics Guide; Battle Mechanics FAQ 1.2.4: <n> randomly selected targets): each
    // hit on a random foe still standing
    const rndHits = eff.damage && eff.damage.random && (eff.damage.hits || 1) > 1 ? eff.damage.hits : 0;
    for (const t0 of rndHits ? new Array(rndHits).fill(null) : targets) {
      const t = rndHits ? U.pick(targets.filter(x => x.targetable)) : t0;
      if (!t) break;
      // elixirUnlock (Magic Pot): an Elixir makes it vulnerable
      if (t.def0 && t.def0.elixirUnlock && /elixir/.test(act.item)) { t.vars = t.vars || {}; t.vars.vulnerable = true; yield* b.banner('It seems satisfied...', 30); continue; }
      // Chocobo Lure battles: feeding greens calms the wild chocobo (it becomes less likely to run)
      if (eff.greens && t.def0 && t.def0.chocobo) {
        // [turns it's kept busy eating, 1 in N chance to run afterwards] (FF7: Gysahl 2 turns, Krakka 1/3, Tantal 3,
        // Pahsana 1/5, Curiel 5, Mimett 1, Reagan 8 and 1/8, Sylkis 1; a wild chocobo otherwise runs 1 time in 2)
        const EAT = { gysahl: [2, 0], krakka: [0, 3], tantal: [3, 0], pahsana: [0, 5], curiel: [5, 0], mimett: [1, 0], reagan: [8, 8], sylkis: [1, 0] };
        const [busy, run] = EAT[eff.greens] || [1, 0];
        t.vars = t.vars || {};
        t.vars.busy = Math.max(t.vars.busy || 0, busy);
        if (run) t.vars.runChance = Math.max(t.vars.runChance || 2, run);
        t.vars.fedGreens = act.item;
        if (eff.greens === 'mimett' || eff.greens === 'sylkis') t.vars.buckle = true;   // (FF7: TempVar:ChocobuckleGreens, kept for the battle)
        yield* b.banner('The chocobo is munching on the greens!', 40);
        continue;
      }
      const res = { target: t, dmg: 0, add: [], remove: [], heal: false };
      if (eff.revive && t.dead) {
        if (t.undead) { res.kill = true; }
        else { t.hp = Math.max(1, Math.floor(t.maxHp * eff.revive / 100)); res.dmg = t.hp; res.heal = true; b.revived(t); }
      }
      if (!t.dead && !res.heal) {
        if (eff.healHp) { res.dmg = eff.healHp; res.heal = true; }
        if (eff.healHpPct) { res.dmg = Math.floor(t.maxHp * eff.healHpPct / 100); res.heal = true; }
        if (t.undead && res.heal && !t.isParty) { res.heal = false; }
      }
      if (eff.healMp || eff.healMpPct) { const m = eff.healMp || Math.floor(t.maxMp * eff.healMpPct / 100); t.mp = Math.min(t.maxMp, t.mp + m); if (!res.dmg) { b.number(t, m, { mp: true, heal: true }); } }
      if (eff.cure) eff.cure.forEach(s => { if (t.has(s)) res.remove.push(s); });
      if (eff.addStatus) eff.addStatus.forEach(s => { if (!t.immuneTo(s)) res.add.push(s); });
      if (eff.enemyStatus) eff.enemyStatus.forEach(s => { if (U.chance(eff.chance || 100) && !t.immuneTo(s)) res.add.push(s); });
      if (eff.battleBoostPct) ['atk', 'def', 'mat', 'mdf'].forEach(k => { const bp = typeof eff.battleBoostPct === 'object' ? eff.battleBoostPct[k] || 0 : eff.battleBoostPct; t.mods[k] = Math.min(100, t.mods[k] + bp); });
      if (eff.damage) {
        const dmgDef = eff.damage;
        // Graviball / T/S Bomb: the HP% formula with the Gravity element (Battle Mechanics FAQ 3.4.5; MAt% 255) - a foe
        // that voids Gravity takes nothing
        if (dmgDef.kind === 'gravity') { const r2 = C.resolve(a, t, { src: 'item', kind: 'gravity', pct: dmgDef.pct || 25, element: dmgDef.element, elements: dmgDef.element ? [dmgDef.element] : [] }, { multi: 1 }); res.dmg = r2.dmg; res.heal = r2.heal; res.miss = r2.miss; res.text = r2.text; }
        else { const r2 = C.resolve(a, t, { src: 'item', kind: 'item', fixedDmg: dmgDef.fixed || (dmgDef.power ? dmgDef.power * 16 : 100), itemKind: dmgDef.kind, element: dmgDef.element, elements: dmgDef.element ? [dmgDef.element] : [] }, { multi: 1 }); res.dmg = r2.dmg; res.heal = r2.heal; res.miss = r2.miss; res.text = r2.text; }
        if (dmgDef.mp) res.mp = true;
      }
      if (eff.limitFull && t.isParty) t.limitGauge = 255;
      if (res.dmg > 0 && !res.heal && !res.mp) b.hurt(t);
      C.apply(a, res, b);
      // Vampire Fang / Ghost Hand ("Magical Absorb" / "Magical MP Absorb", Party Mechanics Guide): the user gets what it took
      if (eff.damage && eff.damage.drain && !res.miss && !res.heal && a.alive) {
        if (res.mp) a.mp = Math.min(a.maxMp, a.mp + (res.mpTaken || 0));
        else if (res.hpLost > 0) { a.heal(res.hpLost); b.number(a, res.hpLost, { heal: true, delay: 10 }); }
      }
      b.showResult(res, ab);
      b.afterHit(a, t, res, ab, act);
    }
    yield 20;
    b.idle(a);
  };
})();

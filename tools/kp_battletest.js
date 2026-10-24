// Kupomon battle tests: real battles through the engine (js/kupomon/kp_battle.js), scripted moves on both sides and
// fixed dice, checking that every status, every status / stat / heal / drain / priority move and every ability does
// what it says.   node tools/kp_battletest.js [--only statuses|moves|abilities] [--verbose]
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
const argv = process.argv.slice(2), only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null, verbose = argv.includes('--verbose');
FF7.audio.sfx = () => {}; FF7.audio.push = () => {}; FF7.audio.pop = () => {}; FF7.audio.play = () => {};

// a Kupomon game to fight in
const st0 = FF7.state; (st0.keyItems = st0.keyItems || []).push('mogboy'); st0.vars.mogboy_carts = 127;
KP.play(); KP.enter(null, null);
['kp_intro', 'kp_starter', 'kp_rival1', 'kp_sent_off'].forEach(f => { FF7.state.flags[f] = true; });
for (let i = 0; i < 30; i++) FF7.stepFrame();

// dice: a number, or a function
let dice = 0.5; Math.random = () => typeof dice === 'function' ? dice() : dice;
// abilities: off for the status and move tests; for the ability tests only the moogle marked __ab has one
const abilityOf0 = KP.abilityOf;
let abilities = 'off';
KP.abilityOf = (mon) => abilities === 'off' ? null : abilities === 'marked' ? (mon && mon.__ab ? Object.assign({ id: mon.__ab }, KP.ABILITIES[mon.__ab]) : null) : abilityOf0(mon);
const learn0 = KP.learnOnLevels; KP.learnOnLevels = function* () {};   // (no move pickers mid-test)

// test moves
const mv = (id, o) => { KP.MOVES[id] = Object.assign({ name: id, type: 'freelancer', power: 0, acc: 100, cd: 0, desc: '' }, o); return id; };
const WAIT = mv('t_wait', { name: 'Wait', type: null });
const HIT = mv('t_hit', { name: 'Test Hit', type: null, power: 40 });
const BIG = mv('t_big', { name: 'Test Smash', type: null, power: 250 });
const ST = (kind) => mv('t_' + kind, { name: 'Test ' + kind, type: null, status: [kind, 100] });
['poison', 'sleep', 'stop', 'blind', 'silence', 'confuse', 'berserk', 'doom'].forEach(ST);

// a battle: o.team / o.foes [[species, lv, {extra}]], o.me / o.foe: the moves in order (then Wait), o.kind
function battle(o) {
  const d = FF7.state.kp;
  d.party = o.team.map(([sp, lv, x]) => Object.assign(KP.make(sp, lv), x || {}));
  d.party.forEach(m => { if (m.__hp != null) m.hp = Math.max(1, Math.floor(KP.maxHp(m) * m.__hp)); });
  d.money = 0;
  const foes = o.foes.map(([sp, lv, x]) => { const m = Object.assign(KP.make(sp, lv), x || {}); if (m.__hp != null) m.hp = Math.max(1, Math.floor(KP.maxHp(m) * m.__hp)); return m; });
  const w = KP.battle(Object.assign({ kind: o.kind || 'trainer', foes, trainer: { name: 'Tester', money: o.money || 0 }, canLose: true, bg: 'town', noCrit: !o.crits }, o.opts || {}));
  const B = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
  const myQ = (o.me || []).slice(), foeQ = (o.foe || []).slice(), log = [];
  const foeChoose0 = B.foeChoose.bind(B);
  B.command = function* () {
    const forced = this.forcedMove ? this.forcedMove(this.me) : null;   // (a charge's second turn, a rampage, a recharge)
    if (forced) return { kind: 'move', move: forced };
    if (this.me.vol.berserk) return { kind: 'move', move: this.strongest(this.me) };
    const m = myQ.length ? myQ.shift() : WAIT;
    if (typeof m === 'function') return m(this);
    if (typeof m === 'object') return m;
    return { kind: 'move', move: m };
  };
  B.foeChoose = function () { if (this.foe.vol.berserk) return foeChoose0(); return foeQ.length ? foeQ.shift() : WAIT; };
  const say0 = KP.Battle.prototype.say;
  B.say = function* (t) { log.push(t); yield* say0.call(this, t, 2); };
  const turns = o.turns || 4, snaps = [];
  const eot0 = B.endOfTurn.bind(B);
  B.endOfTurn = function* () { yield* eot0(); snaps.push({ me: this.me && this.me.mon.hp, foe: this.foe && this.foe.mon.hp, meSt: this.me && Object.assign({}, this.me.st), foeSt: this.foe && Object.assign({}, this.foe.st), meStatus: this.me && this.me.mon.status, foeStatus: this.foe && this.foe.mon.status }); if (snaps.length >= turns) this.__stop = true; };
  let setupDone = !o.setup;
  for (let i = 0; i < 40000 && !w.done; i++) {
    FF7.stepFrame();
    if (!setupDone && B.me && B.foe) { setupDone = true; o.setup(B); }   // (once both are out)
    if (B.ui && B.ui.kind === 'party') { const p = d.party.find(m => m.hp > 0 && (!B.me || m !== B.me.mon)); B.answer(p || null); }
    if (B.ui && B.ui.kind === 'nut') B.answer(null);
    if (B.__stop && !B.text && !w.done) break;
  }
  // close it down (the battle scene and its swirl)
  while (FF7.sceneMgr.stack.length && !(FF7.sceneMgr.top() instanceof FF7.field.FieldScene)) FF7.sceneMgr.pop();
  if (verbose) console.log('    ' + log.join(' | '));
  return { B, w, log, snaps, d, foes, me: d.party[0], foe: foes[0] };
}
const has = (log, re) => log.some(t => re.test(t));

let pass = 0, fail = 0;
const check = (name, ok, why) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (why ? ': ' + why : '')); } };

// the expansion's content packs (their own checks: tools/kp_contentcheck.js, tools/kp_movesmoke.js)
const NEW = { moves: new Set(), abilities: new Set() };
for (const r of Object.values(KP.CONTENT || {})) { r.moves.forEach(x => NEW.moves.add(x)); r.abilities.forEach(x => NEW.abilities.add(x)); }
// a target a move of type t can touch (not immune), and a plain attacker
const ME = 'stampo_blackbelt', FOE = 'grumog_viking';
const target = (type) => [FOE, 'shellmog_guardian', 'tufty_mime', 'callmog_evoker'].find(id => KP.effOn(type, { sp: id }) > 0) || FOE;

// ------------------------------------------------------------------ 1. the statuses
if (!only || only === 'statuses') {
  abilities = 'off';
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_poison'], turns: 2 });
    const max = KP.maxHp(r.foe);
    check('poison: inflicted', r.snaps[0] && r.snaps[0].foeStatus === 'poison');
    check('poison: hurts 1/8 a turn', has(r.log, /hurt by poison/) && r.snaps[1] && r.snaps[0].foe - r.snaps[1].foe === Math.floor(max / 8), JSON.stringify(r.snaps.map(s => s.foe))); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_sleep'], foe: [WAIT, HIT, HIT, HIT, HIT], turns: 5 });
    check('sleep: inflicted', has(r.log, /fell asleep/));
    check('sleep: no moves while asleep', has(r.log, /fast asleep/) && !r.log.slice(r.log.findIndex(t => /fell asleep/.test(t)), r.log.findIndex(t => /woke up/.test(t))).some(t => /foe's .* used Test Hit/.test(t)));
    check('sleep: wakes up', has(r.log, /woke up/)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_stop'], foe: [WAIT, HIT, HIT, HIT], turns: 5 });
    check('stop: frozen', has(r.log, /frozen in time/)); check('stop: wears off', has(r.log, /can move again/)); }
  { dice = 0.7; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_blind'], foe: [WAIT, HIT], turns: 2 });
    check('blind: inflicted', has(r.log, /was blinded/)); check('blind: accuracy x0.6 (a 70 roll misses)', has(r.log, /missed/)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [['embermog_archmage', 30]], me: ['t_silence'], foe: [WAIT, 'fire', HIT], turns: 3 });
    check('silence: inflicted', has(r.log, /was silenced/)); check('silence: no magic', has(r.log, /silenced and can't cast/)); check('silence: other moves still work', has(r.log, /used Test Hit/)); }
  { dice = 0.2; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_confuse'], foe: [WAIT, HIT, HIT], turns: 3 });
    check('confuse: inflicted', has(r.log, /became confused/)); check('confuse: hurts itself', has(r.log, /hurt itself/)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['t_berserk'], foe: [WAIT, WAIT, WAIT], turns: 3 });
    const strong = r.B.strongest ? KP.MOVES[r.B.strongest({ mon: r.foe, vol: {}, st: {} }) || ''] : null;
    check('berserk: inflicted', has(r.log, /went berserk/)); check('berserk: attacks on its own', has(r.log, /foe's Grumog used (?!Wait)/), r.log.filter(t => /foe's/.test(t)).join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30], [FOE, 30]], me: ['t_doom'], turns: 5 });
    check('doom: inflicted', has(r.log, /is doomed/)); check('doom: powers down', has(r.log, /doom has come/)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { status: 'poison' }]], foes: [[FOE, 30]], me: ['chakra'], turns: 1 });
    check('cures: a move (Chakra) cures Poison', has(r.log, /shook off its ailment/) && !r.me.status, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { status: 'sleep', statusT: 9 }]], foes: [[FOE, 30]], me: ['esuna'], turns: 1 });
    check('cures: Esuna (asleep) does not act', has(r.log, /fast asleep/)); }
  { dice = 0.5; FF7.state.kp.bag.fixit = 1; const r = battle({ team: [[ME, 30, { status: 'blind' }]], foes: [[FOE, 30]], setup: (B) => { B.command = function* () { return { kind: 'item', id: 'fixit', target: this.me.mon }; }; }, turns: 1 });
    check('cures: Fix-It Kit', has(r.log, /all better/) && !r.me.status, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { held: 'cure_nut' }]], foes: [[FOE, 30]], foe: ['t_poison'], turns: 1 });
    check('cures: Cure Nut', has(r.log, /ate its Cure Nut/) && !r.me.status); }
  { dice = 0.5; mv('t_spook', { type: 'summoner', status: ['sleep', 100] }); const r = battle({ team: [[ME, 30]], foes: [['tufty_mime', 30]], me: ['t_spook'], turns: 1 });
    check('immunity: a Summoner status move on a Freelancer', has(r.log, /doesn't affect/) && !r.foe.status); }
}

// ------------------------------------------------------------------ 2. every move with an effect, as it is in the game
if (!only || only === 'moves') {
  abilities = 'off';
  for (const [id, m] of Object.entries(KP.MOVES)) {
    if (NEW.moves.has(id)) continue;   // (the expansion's moves: the mechanics section and tools/kp_movesmoke.js)
    if (id.startsWith('t_') || !(m.status || m.stat || m.heal || m.drain || m.prio || m.cures)) continue;
    const tgt = target(m.type);
    if (m.status) {
      dice = 0.001;
      const r = battle({ team: [[ME, 30]], foes: [[tgt, 30, { hp: 9999 }], [tgt, 30]], me: [id], turns: 1, setup: (B) => { B.foe.mon.hp = KP.maxHp(B.foe.mon); } });
      const kind = m.status[0], got = kind === 'confuse' ? has(r.log, /confused/) : kind === 'berserk' ? has(r.log, /berserk/) : kind === 'doom' ? has(r.log, /doomed/) : !!r.foe.status || has(r.log, /poisoned|asleep|stopped|blinded|silenced/);
      check(`${id} (${m.name}): inflicts ${kind}`, got, r.log.join(' / '));
    }
    if (m.stat) {
      dice = 0.001;
      const [k, n, who] = m.stat, r = battle({ team: [[ME, 30]], foes: [[tgt, 30], [tgt, 30]], me: [id], turns: 1 });
      const s = r.snaps[0]; const v = s && (who === 'self' ? s.meSt[k] : s.foeSt[k]);
      check(`${id} (${m.name}): ${who === 'self' ? 'its' : "the foe's"} ${k} ${n > 0 ? '+' : ''}${n}`, s && v === Math.max(-6, Math.min(6, n)), JSON.stringify(s && (who === 'self' ? s.meSt : s.foeSt)));
    }
    if (m.heal) {
      dice = 0.5;
      const r = battle({ team: [[ME, 30, { __hp: 0.3 }]], foes: [[tgt, 30]], me: [id], turns: 1 });
      check(`${id} (${m.name}): heals`, has(r.log, /recovered some HP/), r.log.join(' / '));
    }
    if (m.drain) {
      dice = 0.5;
      const r = battle({ team: [[ME, 30, { __hp: 0.3 }]], foes: [[tgt, 30], [tgt, 30]], me: [id], turns: 1 });
      check(`${id} (${m.name}): drains`, has(r.log, /drained/), r.log.join(' / '));
    }
    if (m.prio) {
      dice = 0.5;
      const r = battle({ team: [['tufty_freelancer', 30]], foes: [['mogpirate_sky_pirate', 30], ['mogpirate_sky_pirate', 30]], me: [id], foe: [HIT], turns: 1, setup: (B) => { if (B.me) B.me.st.spd = -6; } });
      const a = r.log.findIndex(t => new RegExp('^Tufty used').test(t)), b = r.log.findIndex(t => /foe's .* used/.test(t));
      check(`${id} (${m.name}): moves first`, a >= 0 && (b < 0 || a < b), r.log.join(' / '));
    }
    if (m.cures) {
      dice = 0.5; const kind = m.cures.find(c => c !== 'sleep' && c !== 'stop');
      if (kind) { const r = battle({ team: [[ME, 30, { status: kind }]], foes: [[tgt, 30]], me: [id], turns: 1 });
        check(`${id} (${m.name}): cures ${kind}`, !r.me.status, r.log.join(' / ')); }
    }
  }
}

// ------------------------------------------------------------------ 3. the abilities
if (!only || only === 'abilities') {
  abilities = argv.includes('--control') ? 'off' : 'marked';   // (--control: abilities never apply; every test should fail)
  for (const [aid, A] of Object.entries(KP.ABILITIES)) {
    if (NEW.abilities.has(aid)) continue;   // (the expansion's abilities: the mechanics section and tools/kp_movesmoke.js)
    const keys = Object.keys(A).filter(k => k !== 'name' && k !== 'desc');
    const name = `${aid} (${A.name})`;
    const mk = (sp, lv, x) => [sp, lv, Object.assign({ __ab: aid }, x || {})];
    for (const k of keys) {
      if (k === 'absorb') continue;   // (with immune)
      if (k === 'boost' || k === 'stab' || k === 'statMul' || k === 'guts' || k === 'pinchSpd' || k === 'resist') {
        dice = 0.5;
        const r = battle({ team: [mk(ME, 30, { __hp: A.boost && A.boost.below ? 0.2 : A.pinchSpd ? 0.2 : 1, status: A.guts ? 'poison' : null })], foes: [[FOE, 30]], turns: 1 });
        const B = r.B, f = { mon: r.me, st: { atk: 0, def: 0, spd: 0, crit: 0 }, vol: {}, stat: KP.Battle.prototype.constructor && null };
        const F = new (Object.getPrototypeOf(B.me).constructor)(r.me, 'me'), F0 = new (Object.getPrototypeOf(B.me).constructor)(Object.assign({}, r.me, { __ab: null }), 'me');
        const T = new (Object.getPrototypeOf(B.foe).constructor)(r.foe, 'foe');
        if (k === 'statMul') for (const s of Object.keys(A.statMul)) check(`${name}: statMul ${s}`, F.stat(s) > F0.stat(s), F.stat(s) + ' vs ' + F0.stat(s));
        if (k === 'guts') check(`${name}: guts`, F.stat('atk') > F0.stat('atk'));
        if (k === 'pinchSpd') check(`${name}: pinch speed`, F.stat('spd') > F0.stat('spd'));
        if (k === 'boost' || k === 'stab') {
          const sp = KP.sp(r.me), types = A.boost ? (A.boost.types.includes('own') ? [sp.type] : A.boost.types) : [sp.type];
          const t = types[0], m = { name: 'x', type: t, power: 60, acc: 100 };
          const tf = new (Object.getPrototypeOf(B.foe).constructor)(KP.make(target(t), 30), 'foe');
          check(`${name}: ${k} on ${t} moves`, B.damageOf(F, tf, m) > B.damageOf(F0, tf, m), B.damageOf(F, tf, m) + ' vs ' + B.damageOf(F0, tf, m));
        }
        if (k === 'resist') for (const [t, mul] of Object.entries(A.resist)) {
          const atk = new (Object.getPrototypeOf(B.foe).constructor)(KP.make(FOE, 30), 'foe'), m = { name: 'x', type: t, power: 60, acc: 100 };
          const hold = new (Object.getPrototypeOf(B.me).constructor)(KP.make(target(t), 30, {}), 'me'); hold.mon.__ab = aid;
          const hold0 = new (Object.getPrototypeOf(B.me).constructor)(Object.assign({}, hold.mon, { __ab: null }), 'me');
          check(`${name}: resists ${t}`, B.damageOf(atk, hold, m) < B.damageOf(atk, hold0, m), B.damageOf(atk, hold, m) + ' vs ' + B.damageOf(atk, hold0, m));
        }
        continue;
      }
      if (k === 'immune') {
        for (const t of A.immune) {
          dice = 0.5; const id = mv('t_imm_' + t, { type: t, power: 60 });
          const r = battle({ team: [mk(target(t), 30, { __hp: 0.6 })], foes: [[FOE, 30]], foe: [id], turns: 1 });
          check(`${name}: immune to ${t}${A.absorb ? ' (absorbs)' : ''}`, A.absorb ? has(r.log, /soaked it up/) : has(r.log, /doesn't affect/), r.log.join(' / '));
        }
        continue;
      }
      if (k === 'noStatus') {
        const kinds = A.noStatus === 'all' ? ['poison', 'sleep'] : A.noStatus;
        for (const kind of kinds) { dice = 0.5; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30]], foe: ['t_' + kind], turns: 1 });
          check(`${name}: no ${kind}`, has(r.log, /keeps it safe/) && !r.me.status, r.log.join(' / ')); }
        continue;
      }
      if (k === 'onEnter') {
        dice = 0.5; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30]], turns: 1 });
        const [who, [s, n]] = A.onEnter.foe ? ['foe', A.onEnter.foe] : ['me', A.onEnter.self];
        const v = r.snaps[0] && (who === 'foe' ? r.snaps[0].foeSt[s] : r.snaps[0].meSt[s]);
        check(`${name}: on entering, ${who === 'foe' ? "the foe's" : 'its'} ${s} ${n}`, v === n && has(r.log, new RegExp(A.name)), r.log.join(' / '));
        continue;
      }
      if (k === 'regen') {
        dice = 0.5; const r = battle({ team: [mk(ME, 30, { __hp: 0.5 })], foes: [[FOE, 30]], turns: 1 });
        check(`${name}: regenerates`, has(r.log, new RegExp(A.name)) && r.me.hp > Math.floor(KP.maxHp(r.me) * 0.5), r.log.join(' / '));
        continue;
      }
      if (k === 'onHit') {
        dice = 0.001; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30], [FOE, 30]], foe: [HIT], turns: 1 });
        if (A.onHit.status) check(`${name}: a hit leaves the attacker ${A.onHit.status[0]}`, !!r.foe.status || has(r.log, /confused|berserk|doomed/), r.log.join(' / '));
        if (A.onHit.recoil) check(`${name}: a hit is answered`, has(r.log, /hit back/) && r.foe.hp < KP.maxHp(r.foe), r.log.join(' / '));
        continue;
      }
      if (k === 'counterHit') {
        dice = 0.5; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30], [FOE, 30]], foe: [HIT], turns: 1 });
        check(`${name}: struck, it counters`, has(r.log, /counters!/) && r.foe.hp < KP.maxHp(r.foe), r.log.join(' / '));
        dice = 0.5; const k2 = battle({ team: [mk(ME, 30, { __hp: 0.01 })], foes: [[FOE, 30], [FOE, 30]], foe: [HIT], turns: 1 });
        check(`${name}: knocked out, it doesn't counter`, !has(k2.log, /counters!/) && k2.foe.hp === KP.maxHp(k2.foe), k2.log.join(' / '));
        continue;
      }
      if (k === 'crit') {
        dice = 0.1; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30], [FOE, 30]], me: [HIT], turns: 1, crits: true });
        check(`${name}: crits likelier`, has(r.log, /critical hit/), r.log.join(' / '));
        continue;
      }
      if (k === 'noCrit') {
        dice = 0.001; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30]], foe: [HIT], turns: 1, crits: true });
        check(`${name}: can't be crit`, !has(r.log, /critical hit/), r.log.join(' / '));
        continue;
      }
      if (k === 'noMiss') {
        dice = 0.95; const id = mv('t_shaky', { type: null, power: 40, acc: 70 });
        const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30], [FOE, 30]], me: [id], turns: 1 });
        check(`${name}: never misses`, !has(r.log, /missed/), r.log.join(' / '));
        continue;
      }
      if (k === 'sturdy') {
        dice = 0.5; const r = battle({ team: [mk(ME, 5)], foes: [[FOE, 30]], foe: [BIG], turns: 1 });
        check(`${name}: hangs on at full HP`, r.me.hp === 1 && has(r.log, /held on/), r.log.join(' / ') + ' hp ' + r.me.hp);
        continue;
      }
      if (k === 'coins') {
        dice = 0.5; const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 3]], me: [BIG], money: 1000, turns: 3 });
        check(`${name}: prize coins x${A.coins}`, r.d.money === Math.floor(1000 * A.coins), 'money ' + r.d.money);
        continue;
      }
      if (k === 'healMul') {
        dice = 0.5; const id = mv('t_heal', { heal: 0.3 });
        const r1 = battle({ team: [mk(ME, 30, { __hp: 0.2 })], foes: [[FOE, 30]], me: [id], turns: 1 }), g1 = r1.me.hp;
        const r0 = battle({ team: [[ME, 30, { __hp: 0.2 }]], foes: [[FOE, 30]], me: [id], turns: 1 }), g0 = r0.me.hp;
        check(`${name}: heals more`, g1 > g0, g1 + ' vs ' + g0);
        continue;
      }
      if (k === 'drainMul') {
        dice = 0.5; const id = mv('t_drain', { type: null, power: 60, drain: 0.5 });
        const r1 = battle({ team: [mk(ME, 30, { __hp: 0.2 })], foes: [[FOE, 30], [FOE, 30]], me: [id], turns: 1 }), g1 = r1.me.hp;
        const r0 = battle({ team: [[ME, 30, { __hp: 0.2 }]], foes: [[FOE, 30], [FOE, 30]], me: [id], turns: 1 }), g0 = r0.me.hp;
        check(`${name}: drains more`, g1 > g0, g1 + ' vs ' + g0);
        continue;
      }
      if (k === 'firstStrike') {
        dice = 0.5; const r = battle({ team: [mk('tufty_freelancer', 30)], foes: [['mogpirate_sky_pirate', 30], ['mogpirate_sky_pirate', 30]], me: [HIT], foe: [HIT], turns: 1, setup: (B) => { if (B.me) B.me.st.spd = -6; } });
        const a = r.log.findIndex(t => /^Tufty used/.test(t)), b = r.log.findIndex(t => /foe's .* used/.test(t));
        check(`${name}: moves first on arrival`, a >= 0 && a < b, r.log.join(' / '));
        continue;
      }
      if (k === 'statusChance') {
        dice = 0.3; const id = mv('t_chance', { type: null, power: 20, status: ['poison', 20] });
        const r = battle({ team: [mk(ME, 30)], foes: [[FOE, 30], [FOE, 30]], me: [id], turns: 1 });
        check(`${name}: effects likelier (a 20% effect on a 30 roll)`, A.statusChance * 20 > 30 ? r.foe.status === 'poison' : true, r.log.join(' / '));
        continue;
      }
      if (k === 'expMul') {
        dice = 0.5;
        const r1 = battle({ kind: 'wild', team: [mk(ME, 10)], foes: [[FOE, 8]], me: [BIG], turns: 2 }), e1 = r1.me.exp;
        const r0 = battle({ kind: 'wild', team: [[ME, 10]], foes: [[FOE, 8]], me: [BIG], turns: 2 }), e0 = r0.me.exp;
        check(`${name}: more EXP`, e1 > e0, e1 + ' vs ' + e0);
        continue;
      }
      check(`${name}: ${k}`, false, 'no test for this effect');
    }
  }
}

// ------------------------------------------------------------------ 4. the expansion's mechanics (js/kupomon/kp_mech.js,
// docs/KUPOMON_MECHANICS.md): moves, states, the field, the sides, the new statuses, abilities' and items' effect keys
if (!only || only === 'mechanics') {
  abilities = 'off';
  const T2 = [[FOE, 30], [FOE, 30]];   // (two foes: a knockout doesn't end it)
  const fast = (B) => { B.me.st.spd = 6; }, slow = (B) => { B.me.st.spd = -6; };
  const lost = (r, i = 0) => KP.maxHp(r.foe) - r.snaps[i].foe;
  // ---- moves
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_multi', { type: null, power: 20, hits: [2, 5] })], turns: 1 });
    check('multi-hit: 2-5 hits (a 0.5 roll: 3)', has(r.log, /Hit 3 times/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_recoil', { type: null, power: 120, recoil: 1 / 3 })], turns: 1 });
    check('recoil: a third of the damage back', has(r.log, /recoil/) && KP.maxHp(r.me) - r.snaps[0].me === Math.round(lost(r) / 3), r.log.join(' / ') + ' ' + (KP.maxHp(r.me) - r.snaps[0].me) + ' vs ' + lost(r)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_flinch', { type: null, power: 20, flinch: 100 })], foe: [HIT], turns: 1, setup: fast });
    check('flinch: a faster hit makes it lose its turn', has(r.log, /flinched/) && !has(r.log, /foe's .* used Test Hit/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_guard', { type: null, guard: true, prio: 4, cd: 1 })], foe: [HIT], turns: 1 });
    check('guard: the hit is blocked', has(r.log, /protected itself/) && r.snaps[0].me === KP.maxHp(r.me), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30], ['tufty_mime', 30]], foes: T2, me: [mv('t_uturn', { type: null, power: 40, selfSwitch: true })], turns: 1 });
    check('selfSwitch: hits, then switches out', has(r.log, /Go! Tufty/) && r.B.me.mon.sp === 'tufty_mime', r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30], ['tufty_mime', 30]], me: [mv('t_roar', { type: null, forceSwitch: true, prio: -6, acc: true, cat: 'status' })], turns: 1 });
    check('forceSwitch: the foe is dragged out', has(r.log, /dragged out/) && r.B.foe.mon.sp === 'tufty_mime', r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_solar', { type: null, power: 120, charge: { text: 'is gathering light!' } })], turns: 2 });
    check('charge: the first turn charges, the second hits', has(r.log, /gathering light/) && r.snaps[0].foe === KP.maxHp(r.foe) && r.snaps[1].foe < KP.maxHp(r.foe), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_jump', { type: null, power: 90, charge: { invuln: 'air', text: 'leapt up high!' } })], foe: [HIT], turns: 1, setup: fast });
    check('charge invuln: out of reach while up', has(r.log, /out of reach/) && r.snaps[0].me === KP.maxHp(r.me), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_beam', { type: null, power: 150, recharge: true })], turns: 2 });
    check('recharge: the next turn lost', has(r.log, /must recharge/), r.log.join(' / ')); }
  { dice = 0.5; let can = null; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_wrap', { type: null, power: 15, trap: 'bind', flags: ['contact'] })], turns: 2, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (can == null && this.foe.vol.bound) can = this.canSwitch(this.foe); yield* e0(); }; } });
    check('trap bind: trapped, hurt each turn, no switching', has(r.log, /trapped by/) && has(r.log, /hurt by t_wrap/) && can === false, r.log.join(' / ') + ' can ' + can); }
  { dice = 0.1; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_ohko', { type: null, power: 1, ohko: true, acc: 30, cat: 'physical' })], turns: 1 });
    check('ohko: knocks it out', r.foes[0].hp === 0, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_seismic', { type: null, fixed: 'level', cat: 'physical' })], turns: 1 });
    check('fixed: its level in damage', lost(r) === 30, lost(r)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_fang', { type: null, fixed: 'half', cat: 'physical' })], turns: 1 });
    check('fixed: half its HP', lost(r) === Math.floor(KP.maxHp(r.foe) / 2), lost(r)); }
  { dice = 0.5; const id = mv('t_reversal', { type: null, power: 1, powerBy: 'lowHp', cat: 'physical' });
    const a = battle({ team: [[ME, 30, { __hp: 0.03 }]], foes: T2, me: [id], turns: 1 }), b = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1 });
    check('powerBy lowHp: stronger at low HP', lost(a) > lost(b) * 5, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_cc', { type: null, power: 120, self: { def: -1, res: -1 } })], turns: 1 });
    check('self: its own stages after the hit', r.snaps[0].meSt.def === -1 && r.snaps[0].meSt.res === -1, JSON.stringify(r.snaps[0].meSt)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_growl2', { type: null, foe: { atk: -1, mag: -1 } })], turns: 1 });
    check('foe: several stages on the foe', r.snaps[0].foeSt.atk === -1 && r.snaps[0].foeSt.mag === -1, JSON.stringify(r.snaps[0].foeSt)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_haze', { type: null, haze: true })], turns: 1, setup: (B) => { B.me.st.atk = 2; B.foe.st.def = -2; } });
    check('haze: every stage back to 0', r.snaps[0].meSt.atk === 0 && r.snaps[0].foeSt.def === 0, JSON.stringify(r.snaps[0])); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_counter', { type: null, counter: 'physical', prio: -5, cat: 'physical' })], foe: [HIT], turns: 1 });
    const took = KP.maxHp(r.me) - r.snaps[0].me;
    check('counter: twice the physical damage back', took > 0 && lost(r) === took * 2, took + ' / ' + lost(r)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: 'leftover_nut' }]], me: [mv('t_knock', { type: null, power: 65, knockOff: true }), BIG, BIG, BIG], turns: 6 });
    check('knockOff: the item goes, and comes back after the battle', has(r.log, /knocked off/) && r.foes[0].held === 'leftover_nut', r.log.join(' / ') + ' held ' + r.foes[0].held); }
  // ---- the field
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_sun', { type: null, weather: 'radiance' })], turns: 1 });
    check('weather: set by a move', has(r.log, /radiant light/) && r.B.wx && r.B.wx.id === 'radiance', r.log.join(' / ')); }
  { dice = 0.5; const id = mv('t_holyhit', { type: 'whitemage', power: 60 });
    const a = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1, setup: (B) => { B.wx = { id: 'radiance', turns: 5 }; } }), b = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1 });
    check('weather: Radiance x1.5 to White Mage moves', Math.abs(lost(a) / lost(b) - 1.5) < 0.12, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, turns: 1, setup: (B) => { B.wx = { id: 'sandstorm', turns: 5 }; } });
    check('weather: Sandstorm chips (a Beast type safe)', has(r.log, /Stampo is buffeted/) && !has(r.log, /Grumog is buffeted/) && KP.maxHp(r.me) - r.snaps[0].me === Math.floor(KP.maxHp(r.me) / 16), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { __hp: 0.5 }]], foes: T2, turns: 1, setup: (B) => { B.terrain = { id: 'lifestream', turns: 5 }; } });
    check('terrain: the Lifestream heals the grounded', has(r.log, /drew strength/) && r.snaps[0].me > Math.floor(KP.maxHp(r.me) * 0.5), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: ['t_sleep'], turns: 1, setup: (B) => { B.terrain = { id: 'rhythm', turns: 5 }; } });
    check('terrain: the Rhythm Field keeps them awake', has(r.log, /protected by the Rhythm Field/) && !r.foes[0].status, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [HIT], foe: [HIT], turns: 1, setup: (B) => { slow(B); B.rooms.timewarp = 5; } });
    const a = r.log.findIndex(t => /^Stampo used/.test(t)), b = r.log.findIndex(t => /foe's .* used/.test(t));
    check('zone: Time Warp, the slower first', a >= 0 && a < b, r.log.join(' / ')); }
  { dice = 0.5; const a = battle({ team: [[ME, 30]], foes: T2, me: [HIT], turns: 1, setup: (B) => { B.sides.foe.cond.wall = 5; } }), b = battle({ team: [[ME, 30]], foes: T2, me: [HIT], turns: 1 });
    check('side: Protect halves physical hits', Math.abs(lost(a) - Math.floor(lost(b) / 2)) <= 1, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; let s0, s1; battle({ team: [[ME, 30]], foes: T2, turns: 1, setup: (B) => { s0 = B.speed(B.me); B.sides.me.cond.tailwind = 4; s1 = B.speed(B.me); } });
    check('side: Tailwind doubles Speed', s1 === s0 * 2, s0 + ' -> ' + s1); }
  { dice = 0.5; const r = battle({ team: [[ME, 30], ['tufty_mime', 30]], foes: T2, me: [(B) => ({ kind: 'switch', mon: B.d.party[1] })], turns: 1, setup: (B) => { B.sides.me.haz.caltrops = 1; B.sides.me.haz.web = 1; } });
    check('hazards: Caltrops and Web on the way in', has(r.log, /hurt by the caltrops/) && has(r.log, /sticky web/) && r.B.me.st.spd === -1, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_spikes', { type: null, hazard: 'caltrops', acc: true })], turns: 1 });
    check('hazards: laid by a move on the foe\'s side', r.B.sides.foe.haz.caltrops === 1, JSON.stringify(r.B.sides)); }
  // ---- states
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_taunt', { type: null, vol: { taunt: true } })], foe: ['t_poison'], turns: 1, setup: fast });
    check('taunt: no status moves', has(r.log, /after the taunt/) && !r.me.status, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { __hp: 0.5 }]], foes: T2, me: [mv('t_seed', { type: null, vol: { leech: true } })], turns: 2 });
    check('leech: saps the foe, heals the seeder', has(r.log, /sapped by the seed/) && r.snaps[1].me > Math.floor(KP.maxHp(r.me) * 0.5), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_decoy', { type: null, vol: { decoy: true } })], foe: [HIT], turns: 1, setup: fast });
    check('decoy: it takes the hit', has(r.log, /Decoy took the hit/) && r.snaps[0].me === KP.maxHp(r.me) - Math.floor(KP.maxHp(r.me) / 4), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_yawn', { type: null, vol: { yawn: true } })], turns: 2 });
    check('yawn: asleep at the end of the next turn', r.snaps[0].foeStatus !== 'sleep' && r.snaps[1].foeStatus === 'sleep', JSON.stringify(r.snaps.map(s => s.foeStatus))); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: T2, me: [mv('t_curse', { type: null, vol: { curse: true }, hpCost: 0.5 })], turns: 1 });
    check('curse: a quarter a turn', has(r.log, /afflicted by the curse/) && lost(r) === Math.floor(KP.maxHp(r.foe) / 4), r.log.join(' / ')); }
  // ---- the new statuses
  { dice = 0.5; ST('burn'); const r = battle({ team: [[ME, 30]], foes: T2, me: ['t_burn'], turns: 2 });
    check('burn: 1/16 a turn', has(r.log, /was burned/) && r.snaps[0].foe - r.snaps[1].foe === Math.floor(KP.maxHp(r.foe) / 16), JSON.stringify(r.snaps.map(s => s.foe))); }
  { dice = 0.5; let a, b; battle({ team: [[ME, 30]], foes: T2, turns: 1, setup: (B) => { const m = KP.MOVES[HIT]; a = B.damageOf(B.foe, B.me, m, { rand: 0 }); B.foe.mon.status = 'burn'; b = B.damageOf(B.foe, B.me, m, { rand: 0 }); B.foe.mon.status = null; } });
    check('burn: its physical hits halved', Math.abs(b - Math.floor(a / 2)) <= 1, a + ' -> ' + b); }
  { dice = 0.5; let a, b; battle({ team: [[ME, 30]], foes: T2, turns: 1, setup: (B) => { a = B.speed(B.foe); B.foe.mon.status = 'slow'; b = B.speed(B.foe); B.foe.mon.status = null; } });
    check('slow: Speed halved', b === Math.floor(a / 2), a + ' -> ' + b); }
  { dice = 0.5; ST('venom'); const r = battle({ team: [[ME, 30]], foes: T2, me: ['t_venom'], turns: 3 });
    const m = KP.maxHp(r.foe), d1 = r.snaps[0].foe - r.snaps[1].foe, d2 = r.snaps[1].foe - r.snaps[2].foe;
    check('venom: 1/16, then 2/16, then 3/16', KP.maxHp(r.foe) - r.snaps[0].foe === Math.floor(m / 16) && d1 === Math.floor(m * 2 / 16) && d2 === Math.floor(m * 3 / 16), JSON.stringify(r.snaps.map(s => s.foe))); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { __hp: 0.8, status: 'zombie' }]], foes: T2, me: [mv('t_heal2', { heal: 0.5 })], turns: 1 });
    check('zombie: healing hurts it', has(r.log, /healing hurts/) && r.snaps[0].me < Math.floor(KP.maxHp(r.me) * 0.8), r.log.join(' / ')); }
  { dice = 0.5; let a, b; battle({ team: [[ME, 30]], foes: T2, turns: 1, setup: (B) => { a = B.foe.stat('def'); B.foe.mon.status = 'mini'; b = B.foe.stat('def'); B.foe.mon.status = null; } });
    check('mini: Defense halved', b === Math.floor(a / 2), a + ' -> ' + b); }

  // ---- abilities (the new effect keys)
  abilities = 'marked';
  const AB = (id, def) => { KP.ABILITIES[id] = Object.assign({ name: id, desc: '' }, def); return id; };
  const mk2 = (sp, lv, ab, x) => [sp, lv, Object.assign({ __ab: ab }, x || {})];
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_drizzle', { setWeather: 'gloom' }))], foes: T2, turns: 1 });
    check('ability setWeather: on coming out', has(r.log, /gloom settles/) && r.B.wx && r.B.wx.id === 'gloom', r.log.join(' / ')); }
  { dice = 0.5; const id = mv('t_weak', { type: null, power: 40 });
    const a = battle({ team: [mk2(ME, 30, AB('t_tech', { technician: true }))], foes: T2, me: [id], turns: 1 }), b = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1 });
    check('ability technician: weak moves x1.5', Math.abs(lost(a) / lost(b) - 1.5) < 0.12, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const a = battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_mscale', { multiscale: true })), [FOE, 30]], me: [HIT], turns: 1 }), b = battle({ team: [[ME, 30]], foes: T2, me: [HIT], turns: 1 });
    check('ability multiscale: halved at full HP', Math.abs(lost(a) - lost(b) / 2) <= 1, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_rough', { roughSkin: 1 / 8 })), [FOE, 30]], me: [mv('t_punch', { type: null, power: 40, flags: ['contact', 'punch'] })], turns: 1 });
    check('ability roughSkin: a touch costs 1/8', KP.maxHp(r.me) - r.snaps[0].me === Math.floor(KP.maxHp(r.me) / 8), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_moxie', { onKOBoost: { atk: 1 } }))], foes: [[FOE, 5], [FOE, 30]], me: [BIG], turns: 1 });
    check('ability onKOBoost: Attack up on a knockout', r.B.me.st.atk === 1, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_regen', { regenerator: 1 / 3 }), { __hp: 0.3 }), ['tufty_mime', 30]], foes: T2, me: [(B) => ({ kind: 'switch', mon: B.d.party[1] })], turns: 1 });
    check('ability regenerator: heals a third switching out', r.d.party[0].hp === Math.floor(KP.maxHp(r.d.party[0]) * 0.3) + Math.floor(KP.maxHp(r.d.party[0]) / 3), r.d.party[0].hp); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_mguard', { magicGuard: true }), { status: 'poison' })], foes: T2, turns: 1 });
    check('ability magicGuard: no poison chip', r.snaps[0].me === KP.maxHp(r.me), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_contrary', { contrary: true }))], foes: T2, me: [mv('t_swords', { type: null, self: { atk: 2 } })], turns: 1 });
    check('ability contrary: boosts turned round', r.snaps[0].meSt.atk === -2, JSON.stringify(r.snaps[0].meSt)); }
  { dice = 0.1; const id = mv('t_secondary', { type: null, power: 60, status: ['poison', 50] });
    const a = battle({ team: [mk2(ME, 30, AB('t_sheer', { sheerForce: true }))], foes: T2, me: [id], turns: 1 }), b = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1 });
    check('ability sheerForce: stronger, no added effect', lost(a) > lost(b) - Math.floor(KP.maxHp(b.foe) / 8) && !a.foes[0].status && b.foes[0].status === 'poison', lost(a) + ' vs ' + lost(b) + ' ' + a.foes[0].status + '/' + b.foes[0].status); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_prank', { prankster: true }))], foes: T2, me: ['t_poison'], foe: [HIT], turns: 1, setup: slow });
    const a = r.log.findIndex(t => /^Stampo used/.test(t)), b = r.log.findIndex(t => /foe's .* used/.test(t));
    check('ability prankster: status moves first', a >= 0 && a < b, r.log.join(' / ')); }
  { dice = 0.5; const id = mv('t_cd2', { type: null, power: 40, cd: 2 }); let cd;
    battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_pressure', { pressure: 1 })), [FOE, 30]], me: [id], turns: 1, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { cd = this.cds(this.me.mon)[id]; yield* e0(); }; } });
    check('ability pressure: a cooldown one turn longer', cd === 4, cd); }
  { dice = 0.5; const id = mv('t_cd3', { type: null, power: 40, cd: 1 }); let cd;
    battle({ team: [mk2(ME, 30, AB('t_cdless', { cdLess: 1 }))], foes: T2, me: [id], turns: 1, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { cd = this.cds(this.me.mon)[id]; yield* e0(); }; } });
    check('ability cdLess: a cooldown one turn shorter', cd === 1, cd); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_noguard', { noGuard: true }))], foes: T2, me: [mv('t_wild', { type: null, power: 40, acc: 10 })], turns: 1 });
    check('ability noGuard: never misses', !has(r.log, /missed/) && lost(r) > 0, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_skill', { skillLink: true }))], foes: T2, me: ['t_multi'], turns: 1 });
    check('ability skillLink: five hits', has(r.log, /Hit 5 times/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_stamina', { whenHit: { boosts: { def: 1 } } })), [FOE, 30]], me: [HIT], turns: 1 });
    check('ability whenHit: Defense up when hit', r.snaps[0].foeSt.def === 1, JSON.stringify(r.snaps[0].foeSt)); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_trace', { trace: true }))], foes: [mk2(FOE, 30, AB('t_drought', { setWeather: 'radiance' })), [FOE, 30]], turns: 1 });
    check('ability trace: copies the foe\'s', has(r.log, /traced/) && r.B.me.abOverride === 't_drought', r.log.join(' / ')); }
  { dice = 0.5; const a = battle({ team: [mk2(ME, 30, AB('t_unaware', { unaware: true }))], foes: T2, me: [HIT], turns: 1, setup: (B) => { B.foe.st.def = 6; } }), b = battle({ team: [[ME, 30]], foes: T2, me: [HIT], turns: 1 });
    check('ability unaware: ignores the foe\'s stages', lost(a) === lost(b), lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_wonder', { wonderGuard: true })), [FOE, 30]], me: [mv('t_plain', { type: 'freelancer', power: 60 })], turns: 1 });
    check('ability wonderGuard: only super-effective hits', lost(r) === 0, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [mk2(ME, 30, AB('t_truant', { truant: true }))], foes: T2, me: [HIT, HIT], turns: 2 });
    check('ability truant: loafs every other turn', has(r.log, /loafing around/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_disguise', { disguise: true })), [FOE, 30]], me: [BIG], turns: 1 });
    check('ability disguise: the first hit busted it', has(r.log, /disguise was busted/) && r.foes[0].hp > 0, r.log.join(' / ')); }
  { dice = 0.5; let can; battle({ team: [[ME, 30]], foes: [mk2(FOE, 30, AB('t_shadowtag', { trapFoes: 'all' })), [FOE, 30]], turns: 1, setup: (B) => { can = B.canSwitch(B.me); } });
    check('ability trapFoes: no escape', can === false, can); }
  abilities = 'off';

  // ---- held items (the new effect keys)
  const IT = (id, def) => { KP.ITEMS[id] = Object.assign({ name: id, kind: 'held', price: 0, desc: '' }, def); return id; };
  { dice = 0.5; let ok; const id2 = mv('t_hit2', { type: null, power: 40 });
    battle({ team: [[ME, 30, { held: IT('t_band', { choice: 'atk' }), moves: [HIT, id2] }]], foes: T2, me: [HIT], turns: 1, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { ok = !this.usable(this.me, id2) && this.usable(this.me, HIT); yield* e0(); }; } });
    check('item choice: locked into its first move', ok === true, ok); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { held: IT('t_orb', { lifeOrb: 0.1 }) }]], foes: T2, me: [HIT], turns: 1 });
    check('item lifeOrb: 1/10 of its HP after a hit', KP.maxHp(r.me) - r.snaps[0].me === Math.floor(KP.maxHp(r.me) / 10), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 50]], foes: [[FOE, 20, { held: IT('t_sash', { sash: true }) }], [FOE, 30]], me: [BIG], turns: 1 });
    check('item sash: hangs on at full HP', r.foes[0].hp === 1 && !r.foes[0].held, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: IT('t_balloon', { balloon: true }) }], [FOE, 30]], me: [mv('t_kick', { type: 'monk', power: 60 }), HIT], turns: 2 });
    check('item balloon: floats over Monk moves, pops when hit', has(r.log, /doesn't affect/) && has(r.log, /popped/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: IT('t_helmet', { helmet: 1 / 6 }) }], [FOE, 30]], me: ['t_punch'], turns: 1 });
    check('item helmet: a touch costs 1/6', KP.maxHp(r.me) - r.snaps[0].me === Math.floor(KP.maxHp(r.me) / 6), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [['shellmog_guardian', 30, { held: IT('t_wp', { weaknessPolicy: true }) }], [FOE, 30]], me: [mv('t_kick2', { type: 'monk', power: 30 })], turns: 1 });
    check('item weaknessPolicy: +2 on a super-effective hit', r.snaps[0].foeSt.atk === 2 && r.snaps[0].foeSt.mag === 2, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: IT('t_sitrus', { pinchHeal: { at: 0.5, heal: 0.25 } }), __hp: 0.55 }], [FOE, 30]], me: [HIT], turns: 1 });
    check('item pinchHeal: eaten at half HP', has(r.log, /ate its t_sitrus/) && !r.foes[0].held, r.log.join(' / ')); }
  { dice = 0.5; const id = mv('t_kick3', { type: 'monk', power: 60 });
    const a = battle({ team: [[ME, 30]], foes: [['shellmog_guardian', 30, { held: IT('t_occa', { resistBerry: 'monk' }) }], [FOE, 30]], me: [id], turns: 1 }), b = battle({ team: [[ME, 30]], foes: [['shellmog_guardian', 30], [FOE, 30]], me: [id], turns: 1 });
    check('item resistBerry: a super-effective hit halved', Math.abs(lost(a) - lost(b) / 2) <= 1 && !a.foes[0].held, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: IT('t_lum', { cureStatus: 'all' }) }], [FOE, 30]], me: ['t_poison'], turns: 1 });
    check('item cureStatus: cured at once', has(r.log, /and was cured/) && !r.foes[0].status, r.log.join(' / ')); }
  { dice = 0.5; const id = mv('t_gemhit', { type: 'monk', power: 60 });
    const a = battle({ team: [[ME, 30, { held: IT('t_gem', { gem: 'monk' }) }]], foes: T2, me: [id], turns: 1 }), b = battle({ team: [[ME, 30]], foes: T2, me: [id], turns: 1 });
    check('item gem: x1.3 once, used up', lost(a) > lost(b) && !a.me.held, lost(a) + ' vs ' + lost(b)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { held: IT('t_eject', { ejectButton: true }) }], ['tufty_mime', 30]], me: [HIT], turns: 1 });
    check('item ejectButton: switched out when hit', r.B.foe.mon.sp === 'tufty_mime', r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { held: IT('t_flameorb', { orb: 'burn' }) }]], foes: T2, turns: 1 });
    check('item orb: burned at the end of the turn', r.snaps[0].meStatus === 'burn', r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30], ['tufty_mime', 30, { held: IT('t_boots', { boots: true }) }]], foes: T2, me: [(B) => ({ kind: 'switch', mon: B.d.party[1] })], turns: 1, setup: (B) => { B.sides.me.haz.caltrops = 3; } });
    check('item boots: no hazards', !has(r.log, /caltrops/), r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { held: IT('t_herb', { powerHerb: true }) }]], foes: T2, me: ['t_solar'], turns: 1 });
    check('item powerHerb: no charging turn', r.snaps[0].foe < KP.maxHp(r.foe) && !r.me.held, r.log.join(' / ')); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { held: IT('t_white', { whiteHerb: true }) }]], foes: T2, foe: ['t_growl2'], turns: 1 });
    check('item whiteHerb: lowered stats put back', r.snaps[0].meSt.atk === 0 && !r.me.held, r.log.join(' / ')); }
}

// Showdown's maths (sim/battle.ts statModify / modify / chainModify, sim/battle-actions.ts getDamage), worked by hand
{
  // the stat formula at Lv 50, IV 31, no EVs: base 100 -> HP 175, others 120 (x1.1 132, x0.9 108)
  KP.SPECIES._t_base100 = { moogle: 'Test', job: 'freelancer', type: 'freelancer', base: { hp: 100, atk: 100, def: 100, mag: 100, res: 100, spd: 100 }, moves: [] };
  const m = { sp: '_t_base100', lv: 50, iv: { hp: 31, atk: 31, def: 31, mag: 31, res: 31, spd: 31 }, app: 'greedy', plus: 0 };
  check('stats: HP 175 at Lv 50 (base 100, IV 31)', KP.stat(m, 'hp') === 175, KP.stat(m, 'hp'));
  check('stats: neutral 120', KP.stat(m, 'mag') === 120, KP.stat(m, 'mag'));
  check('stats: appetite +10% 132', KP.stat(m, 'atk') === 132, KP.stat(m, 'atk'));
  check('stats: appetite -10% 108', KP.stat(m, 'def') === 108, KP.stat(m, 'def'));
  delete KP.SPECIES._t_base100;
  // modify: 37 x 1.5 = 55 (4096ths, rounded half down); a chain of 1.5 then 1.3 (1.3 = 5324/4096, truncated): (6144 x 5324 + 2048) >> 12 = 7986
  check('modify: 37 x 1.5 = 55', KP.modify(37, 1.5) === 55, KP.modify(37, 1.5));
  const ch = new KP.Chain().mul(1.5).mul(1.3);
  check('chainModify: 1.5 then 1.3 -> 7986/4096', Math.round(ch.m * 4096) === 7986, ch.m * 4096);
  // getDamage: Lv 50, power 80, Attack 120 vs Defense 100, STAB, super effective (x2): base 42 + 2 = 44;
  // the lowest roll 85%: 37, STAB 55, x2 = 110; the highest 44, STAB 66, x2 = 132
  const stat0 = KP.stat, eff0 = KP.effOn;
  KP.stat = (mon, k) => k === 'atk' ? 120 : k === 'def' ? 100 : 100;
  KP.effOn = () => 2;
  KP.SPECIES._t_calc = { moogle: 'Calc', job: 'monk', type: 'monk', base: { hp: 100, atk: 100, def: 100, mag: 100, res: 100, spd: 100 }, moves: [] };   // (no ability, no item: the bare formula)
  const fake = () => ({ mon: { sp: '_t_calc', lv: 50, hp: 100, held: null }, st: {}, vol: {} });
  const f = fake(), t = fake(), mv = { name: 'T', type: 'monk', power: 80, cat: 'physical' };
  const lo = KP.damage(null, f, t, mv, { rand: 15 }), hi = KP.damage(null, f, t, mv, { rand: 0 });
  check('damage: lowest roll 110 (Showdown, by hand)', lo === 110, lo);
  check('damage: highest roll 132', hi === 132, hi);
  // a critical hit: 44 x 1.5 = 66 before the roll; the highest: 66, STAB 99, x2 = 198
  const cr = KP.damage(null, f, t, mv, { rand: 0, crit: true });
  check('damage: a critical hit 198', cr === 198, cr);
  KP.stat = stat0; KP.effOn = eff0; delete KP.SPECIES._t_calc;
}

// a stalemate (neither side does a thing) still ends: warned at turn 75, both worn out from turn 80
{ const r = battle({ team: [[ME, 20]], foes: [[FOE, 20]], turns: 1000 });
  check('worn out: a stalemate ends', r.w.done && has(r.log, /wearing out/) && (r.B.turn || 0) < 180, 'done ' + r.w.done + ', turn ' + r.B.turn);
  check('worn out: warned 5 turns ahead', has(r.log, /In 5 turns, both moogles will start wearing out/), '');
  check('worn out: from turn 80', KP.WEAR_TURN === 80 && r.B._worn && (r.B.turn || 0) >= 80, 'turn ' + r.B.turn); }

// ---- the missing tools (content/kp_c03_tools.js; the user, 2026-10-03): Teleport (Gen 8+), Encore, Star Wish (Wish),
// Fond Farewell (Memento), Last Refrain (Perish Song), Kupo Nap (Rest), Turnabout (Court Change), Viper Spin (Mortal
// Spin), Null Haze (Clear Smog), Parting Barb (Parting Shot), Undertow (Flip Turn), War Drum (Belly Drum)
{ const two = [[ME, 30], ['tufty_freelancer', 30]], foes2 = [[FOE, 30], [FOE, 30]];
  { dice = 0.5; const r = battle({ team: two, foes: foes2, me: ['teleport'], foe: [HIT], turns: 1, setup: (B) => { B.me.st.spd = 6; } });
    const iHit = r.log.findIndex(t => /used Test Hit/.test(t)), iTp = r.log.findIndex(t => /used Teleport/.test(t));
    check('Teleport: moves last, even when faster', iHit >= 0 && iTp > iHit, r.log.join(' | ').slice(0, 240));
    check('Teleport: then switches out', r.B.me && r.B.me.mon !== r.d.party[0], r.B.me && r.B.me.mon.sp); }
  { dice = 0.5; let st = null; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30, { moves: [HIT, WAIT] }]], me: [WAIT, 'encore'], foe: [HIT, HIT, HIT, HIT, HIT, HIT], turns: 5,
      setup: (B) => { B.me.st.spd = -6; const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (st == null && this.foe.vol.encore) st = { id: this.foe.vol.encore.id, wait: this.usable(this.foe, WAIT), hit: this.usable(this.foe, HIT) }; yield* e0(); }; } });
    check('Encore: the foe locked into the move it used last', st && st.id === HIT && st.wait === false && st.hit === true, JSON.stringify(st));
    check('Encore: ends after three turns', has(r.log, /encore ended/), ''); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { __hp: 0.3 }]], foes: [[FOE, 30]], me: ['star_wish', WAIT], turns: 2 });
    const max = KP.maxHp(r.me), s = r.snaps;
    check('Star Wish: half its max HP at the end of the next turn', s[0] && s[1] && s[0].me < max * 0.35 && s[1].me - s[0].me >= Math.floor(max / 2) - 1, JSON.stringify(s.map(x => x.me)) + ' of ' + max); }
  { dice = 0.5; const r = battle({ team: two, foes: [[FOE, 30]], me: ['fond_farewell'], turns: 1 });
    check('Fond Farewell: the user faints', r.d.party[0].hp <= 0, r.d.party[0].hp);
    check("Fond Farewell: the foe's Attack and Magic -2", r.B.foe.st.atk === -2 && r.B.foe.st.mag === -2, JSON.stringify(r.B.foe.st)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['last_refrain'], turns: 5 });
    check('Last Refrain: both faint at the end of the third turn after', r.d.party[0].hp <= 0 && r.foes[0].hp <= 0, r.d.party[0].hp + ' / ' + r.foes[0].hp);
    check('Last Refrain: the count shows', has(r.log, /perish count fell to 0/), ''); }
  { dice = 0.5; const r = battle({ team: [[ME, 30, { __hp: 0.3, status: 'poison' }]], foes: [[FOE, 30]], me: ['kupo_nap', HIT, HIT, HIT], turns: 4 });
    const max = KP.maxHp(r.me), s = r.snaps;
    check('Kupo Nap: all its HP back, poison gone, asleep', s[0] && s[0].me === max && s[0].meStatus === 'sleep', JSON.stringify(s[0]));
    check('Kupo Nap: two turns asleep, awake on the third', s[3] && !s[3].meStatus && s[2].meStatus === 'sleep' && s[3].foe < s[2].foe, JSON.stringify(s.map(x => [x.meStatus, x.foe]))); }
  { dice = 0.5; let sw = null; battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['turnabout'], turns: 1,
      setup: (B) => { B.sides.me.haz.caltrops = 2; B.sides.foe.cond.wall = 5; const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (!sw) sw = { meHaz: Object.assign({}, this.sides.me.haz), foeHaz: Object.assign({}, this.sides.foe.haz), meCond: Object.assign({}, this.sides.me.cond) }; yield* e0(); }; } });
    check('Turnabout: hazards and conditions swap sides', sw && sw.foeHaz.caltrops === 2 && !sw.meHaz.caltrops && sw.meCond.wall, JSON.stringify(sw)); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['viper_spin'], turns: 1, setup: (B) => { B.sides.me.haz.caltrops = 3; B.sides.me.haz.mines = 1; } });
    check('Viper Spin: clears its own side', !Object.keys(r.B.sides.me.haz).length, JSON.stringify(r.B.sides.me.haz));
    check('Viper Spin: poisons', r.foes[0].status === 'poison', r.foes[0].status); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['null_haze'], turns: 1, setup: (B) => { B.foe.st.atk = 2; B.foe.st.spd = 1; } });
    check("Null Haze: wipes the target's stat changes", Object.values(r.B.foe.st).every(v => !v), JSON.stringify(r.B.foe.st)); }
  { dice = 0.5; const r = battle({ team: two, foes: [[FOE, 30]], me: ['parting_barb'], turns: 1 });
    check("Parting Barb: the foe's Attack and Magic -1", r.B.foe.st.atk === -1 && r.B.foe.st.mag === -1, JSON.stringify(r.B.foe.st));
    check('Parting Barb: then switches out', r.B.me && r.B.me.mon !== r.d.party[0], ''); }
  { dice = 0.5; const r = battle({ team: two, foes: [[FOE, 30]], me: ['undertow'], turns: 1 });
    check('Undertow: hits', r.foes[0].hp < KP.maxHp(r.foes[0]), r.foes[0].hp);
    check('Undertow: then switches out', r.B.me && r.B.me.mon !== r.d.party[0], ''); }
  { dice = 0.5; const r = battle({ team: [[ME, 30]], foes: [[FOE, 30]], me: ['war_drum'], turns: 1 });
    check('War Drum: Attack to +6 for half its HP', r.B.me.st.atk === 6 && r.d.party[0].hp <= Math.ceil(KP.maxHp(r.d.party[0]) / 2) + 1, r.B.me.st.atk + ' ' + r.d.party[0].hp); }
  // each one taught by its Skill Chip, sold in a Mart
  for (const id of ['teleport', 'encore', 'star_wish', 'fond_farewell', 'last_refrain', 'kupo_nap', 'turnabout', 'viper_spin', 'null_haze', 'parting_barb', 'undertow', 'war_drum']) {
    const chip = Object.keys(KP.ITEMS).find(k => KP.ITEMS[k].kind === 'chip' && KP.ITEMS[k].move === id);
    check(`${id}: a Skill Chip sold in a Mart`, chip && KP.CHIP_PLACES.some(p => p.chip === chip && p.mart), chip);
  }
}

// a choice lock (Hyper Wrist / Wizard Earring / Sprint Shoes, Berserker): the locked move has no cooldown (the user's
// rule, 2026-10-03: cooldowns would leave a locked moogle Flailing after one use)
{ const CD = mv('t_cdhit', { name: 'Cooldown Hit', type: null, power: 40, cd: 3 });
  { dice = 0.5; let st = null; battle({ team: [[ME, 30, { held: 'hyper_wrist', moves: [CD, HIT] }]], foes: [[FOE, 30]], me: [CD, CD], turns: 2, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (!st) st = { cd: this.cds(this.me.mon)[CD] || 0, again: this.usable(this.me, CD), other: this.usable(this.me, HIT) }; yield* e0(); }; } });
    check('choice lock: the locked move has no cooldown', st && !st.cd && st.again === true, JSON.stringify(st));
    check('choice lock: still locked into it', st && st.other === false, JSON.stringify(st)); }
  { dice = 0.5; let st = null; battle({ team: [[ME, 30, { moves: [CD, HIT] }]], foes: [[FOE, 30]], me: [CD], turns: 1, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (!st) st = { cd: this.cds(this.me.mon)[CD] || 0 }; yield* e0(); }; } });
    check('no choice item: the cooldown as before', st && st.cd > 0, JSON.stringify(st)); }
  { dice = 0.5; abilities = 'marked'; let st = null; battle({ team: [[ME, 30, { __ab: 'berserker_rage', moves: [CD, HIT] }]], foes: [[FOE, 30]], me: [CD], turns: 1, setup: (B) => { const e0 = B.endOfTurn.bind(B); B.endOfTurn = function* () { if (!st) st = { cd: this.cds(this.me.mon)[CD] || 0, again: this.usable(this.me, CD) }; yield* e0(); }; } });
    abilities = 'off';
    check('Berserker: the locked move has no cooldown', st && !st.cd && st.again === true, JSON.stringify(st)); }
}

// the bag: wild battles only (the user's rule: no bag items in any trainer battle)
{ let tb, wb;
  battle({ team: [[ME, 10]], foes: [[FOE, 8]], me: [BIG], turns: 1, setup: (B) => { tb = B.o.noBag; } });
  battle({ kind: 'wild', team: [[ME, 10]], foes: [[FOE, 8]], me: [BIG], turns: 1, setup: (B) => { wb = B.o.noBag; } });
  check('bag: off in every trainer battle', tb === true, String(tb)); check('bag: on in a wild battle', !wb, String(wb)); }

// ---- Auto (the user, 2026-10-04): the player's side played by the tournament mind; no menu of the player's opens,
// and turning it on at the command menu hands that turn over at once
if (!only || /auto/.test(only)) {
  const d = FF7.state.kp, close = () => { while (FF7.sceneMgr.stack.length && !(FF7.sceneMgr.top() instanceof FF7.field.FieldScene)) FF7.sceneMgr.pop(); };
  const run = (auto, hand) => {
    d.autoBattle = auto;
    d.party = [KP.make('grumog_viking', 45), KP.make('mopluff_bard', 45)];
    const foes = [KP.make('tufty_freelancer', 18), KP.make('nutmog_thief', 18)];
    const w = KP.battle({ kind: 'trainer', foes, trainer: { name: 'Tester', money: 0 }, canLose: true, bg: 'town', noBag: true });
    const B = FF7.sceneMgr.stack.find(sc => sc instanceof KP.Battle);
    let asked = 0, handed = false; const ask0 = B.ask.bind(B);
    B.ask = function (ui) { if (['command', 'moves', 'party'].includes(ui.kind)) asked++; return ask0(ui); };
    for (let i = 0; i < 80000 && !w.done; i++) {
      FF7.stepFrame();
      if (hand && !handed && B.ui && B.ui.kind === 'command') { handed = true; B.toggleAuto(); }
      if (!hand && !auto && B.ui) break;
    }
    const r = { done: w.done, result: w.result, asked, on: !!d.autoBattle };
    close(); d.autoBattle = false; return r;
  };
  const a = run(true, false);
  check('auto: a trainer battle played to the end with no menu', a.done && a.result === 'win' && a.asked === 0, JSON.stringify(a));
  const b = run(false, true);
  check('auto: turned on at the command menu, it takes over from there', b.done && b.result === 'win' && b.asked === 1 && b.on, JSON.stringify(b));
}

KP.abilityOf = abilityOf0; KP.learnOnLevels = learn0;
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// Kupomon beatability bot (docs/KUPOMON.md "Testing"): plays a new game of Kupomon headless, through the game's own
// scripts, battles and AI, to prove it can be beaten all the way through. Temporary, and not the FF7 Demo; it grows
// with each stage of the build. It answers the dialogue boxes, battles with sensible picks (the best move by power,
// type and STAB; an Oil Can when low; a Kupo Nut for moogles it hasn't got yet), heals at the Mog Repair when worn
// down, trains in the tall grass (each moogle of the team in turn) when a trainer beats it, and walks the story on,
// moving between maps through the same entries the exits use.
//   node tools/kp_bot.js [--starter moglin_warrior|kupwick_blackmage|pomsprout_whitemage] [--seed n] [--runs n] [-v]
// With no --starter it plays all three. Exit code 0 when every run reached the end of what's built so far.
const { boot } = require('./sim_prelude');
const { FF7 } = boot();
const KP = FF7.kupomon;
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; }, has = (k) => args.includes(k);
const verbose = has('-v');
let seed = +opt('seed', 0);
if (seed) Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

let frames = 0;
const say = (t) => console.log('     ' + t);
const S = () => FF7.sceneMgr, top = () => S().top(), fs = () => FF7.fieldScene, D = () => FF7.state.kp;

// ------------------------------------------------------------------ answering: dialogue boxes, battles, evolutions
const answers = [];   // the next choice answers (a fragment of the choice's text, or its index); otherwise the first
function handleWidgets() {
  const L = S().layer;
  for (let i = L.length - 1; i >= 0; i--) {
    const w = L[i];
    if (!w || w.done || !w.modal) continue;
    if (w.choices) {
      let k = 0;
      if (answers.length) { const a = answers.shift(); k = typeof a === 'number' ? a : Math.max(0, w.choices.findIndex(c => c.toLowerCase().includes(String(a).toLowerCase()))); }
      w.cursor = k; w.result = k;
    }
    w.done = true;
    return;
  }
}
const isWild = (B) => B.o.kind === 'wild';
const wanted = (B) => isWild(B) && B.foe && !D().dex.caught[B.foe.mon.sp];
function scoreMove(B, f, t, id) {
  const mv = KP.MOVES[id]; if (!mv || !B.usable(f, id)) return -1;
  const sp = KP.sp(f.mon);
  const mag = KP.category(mv) === 'magic';
  if (mv.power) return mv.power * KP.effOn(mv.type, t.mon) * ((mv.type === sp.type || mv.type === sp.type2) ? 1.5 : 1) * ((mv.acc === true ? 100 : mv.acc) / 100) * (mag ? f.stat('mag') / Math.max(1, t.stat('res')) : f.stat('atk') / Math.max(1, t.stat('def')));
  const k = Math.max(f.stat('atk') / Math.max(1, t.stat('def')), f.stat('mag') / Math.max(1, t.stat('res'))) * 30;
  if (mv.heal) return f.mon.hp < KP.maxHp(f.mon) * 0.4 ? 3 * k : 0;
  if (mv.status) return t.mon.status || KP.effOn(mv.type, t.mon) === 0 ? 0 : 1.2 * k;
  if (mv.stat) return mv.stat[2] === 'self' ? (f.st[mv.stat[0]] < 1 ? k : 0) : (t.st[mv.stat[0]] > -1 ? 0.6 * k : 0);
  return 0;
}
function battleBrain(B) {
  if (B.text && !B.textHold) { B.text = null; return; }
  const u = B.ui; if (!u) return;
  const me = B.me, foe = B.foe, d = D(), bag = d.bag;
  if (u.kind === 'command') {
    const hp = me.mon.hp / KP.maxHp(me.mon);
    if (hp < 0.3 && !B.o.noBag && (B._oiled || 0) < 3) {
      const oil = ['hi_oil', 'oil_can'].find(k => bag[k] > 0);
      if (oil) { B._plan = oil; B._oiled = (B._oiled || 0) + 1; return B.answer('bag'); }
    }
    return B.answer('fight');
  }
  if (u.kind === 'moves') {
    const ids = me.mon.moves.filter(id => B.usable(me, id));
    let pick = ids.slice().sort((a, b) => scoreMove(B, me, foe, b) - scoreMove(B, me, foe, a))[0];
    return B.answer(pick);
  }
  // beaten, a wild one it hasn't got: the nuts (a golden one first)
  if (u.kind === 'nut') {   // the nut it likes best (the cheaper on a tie)
    if (!wanted(B)) return B.answer(null);
    const have = Object.keys(bag).filter(k => KP.ITEMS[k] && KP.ITEMS[k].kind === 'nut' && bag[k] > 0);
    have.sort((a, b) => KP.nutChance(B, foe.mon, b) - KP.nutChance(B, foe.mon, a) || KP.ITEMS[a].price - KP.ITEMS[b].price);
    return B.answer(have[0] || null);
  }
  if (u.kind === 'bag') { const p = B._plan; B._plan = null; return B.answer(p && bag[p] ? p : null); }
  if (u.kind === 'party') {
    if (u.item) return B.answer(me.mon);
    // the replacement: the one that hits the foe hardest
    const alive = d.party.filter(m => m.hp > 0 && m !== me.mon);
    const best = (m) => Math.max(...m.moves.map(id => (KP.MOVES[id].power || 0) * KP.effOn(KP.MOVES[id].type, foe.mon))) * m.lv;
    return B.answer(alive.sort((a, b) => best(b) - best(a))[0] || null);
  }
}
let evoCount = 0;
function step() {
  frames++;
  handleWidgets();
  const t = top(), n = t && t.constructor.name;
  if (n === 'Battle') battleBrain(t);
  else if (n === 'Evolve') { if (t.text) t.text = null; if (t.ask && !t.ask.done) { t.ask.keep = (evoCount++ % 2) === 1; t.ask.done = true; } }   // (every other one opens the move picker)
  else if (n === 'Picker') { S().pop(); t.w.result = [...t.sel]; t.w.done = true; }
  else if (n === 'Shop') shopBrain(t);
  FF7.stepFrame();
}
const free = () => top() === fs() && !(fs().script && !fs().script.done) && !fs().queue.length && !fs().transitioning && !S().layer.some(w => w && !w.done && w.modal);
function until(cond, max = 200000) { for (let i = 0; i < max; i++) { if (cond()) return true; step(); } throw new Error('stuck: ' + (top() && top().constructor.name) + ' on ' + (fs() && fs().map.id)); }
const settle = () => until(free);
// a map's own scripts, run as the field runs them (an NPC's talk, an object's, a trigger's)
function run(fn) { fs().runScript(fn); settle(); }
function talkNpc(id) { const a = fs().actors[id]; if (!a || !a.def || !a.def.talk) throw new Error('no ' + id + ' on ' + fs().map.id); run(a.def.talk); }
function trigger(id) { const t = (fs().map.triggers || []).find(q => q.id === id); if (!t) throw new Error('no trigger ' + id); run(t.run); }
// examine a tile: the map's talk trigger over it (a sign, a scroll, a switch)
function examine(x, y) {
  const t = (fs().map.triggers || []).find(q => q.on === 'talk' && x >= q.at[0] && x < q.at[0] + (q.at[2] || 1) && y >= q.at[1] && y < q.at[1] + (q.at[3] || 1));
  if (!t) throw new Error(`nothing to examine at ${x},${y} on ${fs().map.id}`); run(t.run);
}
function go(map, entry) { if (fs().map.id === map && !entry) return; fs().goto(map, entry); settle(); }

// every battle, and how it went
let battles = [];
const battle0 = KP.battle;
KP.battle = function (o) { const w = battle0(o); battles.push({ o, w }); return w; };

// ------------------------------------------------------------------ the walk through
const P = () => D().party;
const desc = (m) => `${KP.name(m)} (${KP.jobName(m)}) Lv${m.lv}`;
const team = () => P().map(desc).join(', ');
const lead = () => P().reduce((a, m) => m.lv > a.lv ? m : a, P()[0]);
const worn = () => P().some(m => m.hp <= 0) || P().reduce((a, m) => a + m.hp, 0) < P().reduce((a, m) => a + KP.maxHp(m), 0) * 0.55;
function heal() {
  go('kp_center', 'from_town');
  answers.push('Yes'); talkNpc('nurse');
  // the Mart's shop screen: what's short, as far as the coins go (keeping 400 back)
  shopPlan = [['kupo_nut', 6], ['oil_can', 4]];
  talkNpc('merchant');
}
let shopPlan = [];
function shopBrain(t) {
  if (t.msg) { t.msg = null; return; }
  for (const [id, want] of shopPlan) {
    const n = Math.min(want - (D().bag[id] || 0), Math.floor((D().money - 400) / KP.ITEMS[id].price));
    if (n > 0) { t.idx = t.stock.indexOf(id); t.buy(id, n); return; }
  }
  shopPlan = []; t.close();
}
// order the team: the one to train first (the lowest level of the healthy), or the strongest for a trainer
function order(train) {
  const p = P(), score = (m) => train ? -m.lv : m.lv;
  p.sort((a, b) => (b.hp > 0) - (a.hp > 0) || score(b) - score(a));
}
// each training map's way in (the bot steps onto a tall-grass tile from there)
const GRASS_ENTRY = { kp_route1: 'from_town', kp_route1n: 'from_south', kp_route2: 'from_mogridge', kp_whisperwood: 'from_route2', kp_route3: 'from_whisperwood' };
function grass(map, at) {
  if (fs().map.id !== map) go(map, GRASS_ENTRY[map] || 'from_south');
  const f = fs(), T = FF7.field.TILE; f.player.x = (at[0] + 0.5) * T; f.player.z = (at[1] + 0.5) * T;
  const n = battles.length;
  for (let i = 0; i < 600 && battles.length === n; i++) { if (free()) f.stepEncounter(0.12); step(); }
  settle();
}
// training in the grass: every moogle on the team to within a few levels of the goal
function train(map, at, goal, max = 80) {
  for (let n = 0; n < max; n++) {
    if (P().every(m => m.lv >= goal - (m === lead() ? 0 : 3))) return;
    if (worn()) heal();
    order(true);
    grass(map, at);
  }
}
// a battle to win: a trainer's sight trigger, a story trigger, or (how 'talk') an NPC to talk to (a dojo master).
// Lost: train at spot (a [x, y] tall-grass tile on the same map, or [map, [x, y]]) and try again.
function fightTrainer(map, entry, trig, flag, spot, how) {
  if (typeof spot[0] === 'number') spot = [map, spot];
  for (let tries = 0; tries < 6; tries++) {
    heal(); order(false);
    go(map, entry); if (how === 'talk') talkNpc(trig); else trigger(trig);
    if (FF7.state.flags[flag]) return true;
    say(`lost to ${trig.replace(/^see_kp_(tr_)?/, '')} (try ${tries + 1}): ${team()} - training`);
    train(spot[0], spot[1], lead().lv + 2);
  }
  return false;
}
// a list of trainers on one map, each one to beat (their ids: the W.trainer ids, the flags kp_tr_<id>)
function fightAll(map, entry, ids, spot) {
  for (const id of ids) if (!fightTrainer(map, entry, 'see_' + id, 'kp_tr_' + id, spot)) return id;
  return null;
}
const caught = () => Object.keys(D().dex.caught).length;

function playthrough(starter) {
  battles = []; evoCount = 0;
  FF7.newGame({ skipIntro: true });
  const real = FF7.field.start('gs_station'); real.queue.length = 0;
  for (let i = 0; i < 5; i++) step();
  const realTime = FF7.state.time, realGil = FF7.state.gil;
  KP.play(); KP.enter(0, null);
  settle();
  if (!FF7.state.flags.kp_intro) return { why: 'the intro did not run' };
  // the lab: the starter (Sephiroth and Zack take theirs), Zack at the door
  answers.push('Yes');
  run(fs().objects.find(o => o.id === 'starter_' + starter).talk);
  if (FF7.state.vars.kp_starter !== starter) return { why: 'no starter' };
  say(`lab: picked ${desc(P()[0])}; Sephiroth took ${FF7.state.vars.kp_seph_starter}, Zack ${FF7.state.vars.kp_zack_starter}`);
  trigger('rivals_door');
  if (!FF7.state.flags.kp_sent_off) return { why: 'the lab never sent Cloud off' };
  say(`Zack's battle: ${battles[battles.length - 1].w.result}`);
  go('kp_town', 'from_lab');
  // Route 1: some training (making friends along the way), then the two trainers
  const R1 = [6, 26], R1N = [12, 21];   // (tall grass on Pom Meadow's bottom terrace; in the hedge lane)
  train('kp_route1', R1, 7, 40);
  say(`Route 1 grass: ${team()}; Kupodex ${caught()}`);
  if (!fightTrainer('kp_route1', 'from_town', 'see_kp_tr_ollie', 'kp_tr_kp_tr_ollie', R1)) return { why: 'could not beat Youngster Ollie' };
  if (!fightTrainer('kp_route1', 'from_town', 'see_kp_tr_mabel', 'kp_tr_kp_tr_mabel', R1)) return { why: 'could not beat Lass Mabel' };
  say(`beat Ollie and Mabel: ${team()}`);
  // Route 1 north: its rarer moogles; then up the lane and through the gate into Mogridge (the end of stage 1)
  train('kp_route1n', R1N, 10, 50);
  say(`Route 1 north grass: ${team()}; Kupodex ${caught()}`);
  heal(); go('kp_route1n', 'from_south'); go('kp_mogridge', 'from_route1');
  if (fs().map.id !== 'kp_mogridge') return { why: 'could not walk into Mogridge' };
  say(`into Mogridge: ${team()}`);
  // region 1 (js/maps/kupomon/kp_region1.js): Zack on Mogridge's bridge, Route 2 and Team Hojo's grunts on the lock,
  // Lily's reward, Whisperwood, Route 3 and Sephiroth at the torii, the Shuriken Arcade and Yuffie
  const R2 = ['kp_route2', [8, 2]], WW = ['kp_whisperwood', [27, 9]], R3 = ['kp_route3', [5, 19]];
  let who;
  train(R2[0], R2[1], 12, 40);
  if (!fightTrainer('kp_mogridge', 'from_route1', 'zack_bridge', 'kp_rival_zack_2', R2)) return { why: 'could not beat Zack on the Mogridge bridge' };
  if ((who = fightAll('kp_route2', 'from_mogridge', ['kp_r2_gil', 'kp_r2_hazel', 'kp_r2_bram', 'kp_r2_wade', 'kp_r2_grunt1', 'kp_r2_grunt2'], R2))) return { why: 'could not beat ' + who };
  if (!FF7.state.flags.kp_hojo1_done) return { why: 'Team Hojo never left the lock' };
  go('kp_mogridge', 'from_route1'); talkNpc('kp_mg_lily');
  if (!FF7.state.flags.kp_hojo1_reward) return { why: "Lily's reward" };
  say(`Zack, Route 2, Team Hojo: ${team()}; Kupodex ${caught()}`);
  train(WW[0], WW[1], 13, 40);
  if ((who = fightAll('kp_whisperwood', 'from_route2', ['kp_ww_fern', 'kp_ww_tim'], WW))) return { why: 'could not beat ' + who };
  if ((who = fightAll('kp_whisperwood_deep', 'from_whisperwood', ['kp_wwd_ash', 'kp_wwd_vin'], WW))) return { why: 'could not beat ' + who };
  train(R3[0], R3[1], 14, 50);
  if ((who = fightAll('kp_route3', 'from_whisperwood', ['kp_r3_kage', 'kp_r3_sato', 'kp_r3_rei', 'kp_r3_ko'], R3))) return { why: 'could not beat ' + who };
  if (!fightTrainer('kp_route3', 'from_whisperwood', 'seph_gate', 'kp_rival_sephiroth_3', R3)) return { why: 'could not beat Sephiroth at the torii' };
  say(`Whisperwood, Route 3, Sephiroth: ${team()}; Kupodex ${caught()}`);
  // the Shuriken Arcade: the two genin, the kunoichi, the scroll that spins the wall panel, Yuffie
  train(R3[0], R3[1], 15, 60);
  if ((who = fightAll('kp_kurotsuki_dojo', 'from_town', ['kp_dj_kaz', 'kp_dj_rin'], R3))) return { why: 'could not beat ' + who };
  if ((who = fightAll('kp_kurotsuki_dojo_2', 'from_dojo', ['kp_dj_suzu'], R3))) return { why: 'could not beat ' + who };
  go('kp_kurotsuki_dojo_2', 'from_dojo'); examine(10, 4);
  if (!FF7.state.flags.kp_dj_panel) return { why: "the Arcade's wall panel never turned" };
  if (!fightTrainer('kp_kurotsuki_dojo_2', 'from_dojo', 'kp_yuffie', 'kp_badge_1', R3, 'talk') || !KP.hasBadge(1)) return { why: 'could not beat Yuffie' };
  say(`the Shuriken Badge: ${team()}; Kupodex ${caught()}`);
  go('kp_kurotsuki', 'from_dojo');
  // save, switch off: FF7 as it was, the save inside it
  KP.save(0); KP.quit(); settle();
  if (FF7.state.kupomon || !fs() || fs().map.id !== 'gs_station') return { why: 'did not switch back to FF7' };
  const slot = (FF7.state.vars.kupomon || {}).slots && FF7.state.vars.kupomon.slots[0];
  if (!slot) return { why: 'no save in the FF7 state' };
  if (FF7.state.gil !== realGil) return { why: 'FF7 gil changed' };
  return { ok: true, end: 'the Shuriken Badge in Kurotsuki (the end of region 1)', time: FF7.state.time - realTime, slot };
}

const starters = opt('starter') ? [opt('starter')] : KP.STARTERS;
const runs = +opt('runs', 1);
let allOk = true;
for (let r = 0; r < runs; r++) for (const st of starters) {
  console.log(`== ${st}${runs > 1 ? ' #' + (r + 1) : ''}`);
  const t0 = Date.now(), f0 = frames;
  let res;
  try { res = playthrough(st); } catch (e) { res = { why: String(e && e.stack || e).split('\n').slice(0, verbose ? 8 : 2).join(' | ') }; if (KP.real) KP.quit(); }
  allOk = allOk && !!res.ok;
  const B = battles, cnt = (k) => B.filter(b => b.w.result === k).length;
  const tr = B.filter(b => b.o.kind === 'trainer'), trLost = tr.filter(b => b.w.result === 'lose').length;
  console.log(`   ${res.ok ? 'REACHED ' + res.end : 'STUCK: ' + res.why}`);
  console.log(`   battles ${B.length} (wild ${B.length - tr.length}: won ${B.filter(b => b.o.kind === 'wild' && b.w.result === 'win').length}, befriended ${cnt('caught')}, lost ${B.filter(b => b.o.kind === 'wild' && b.w.result === 'lose').length}; trainers ${tr.length}, lost ${trLost}) | evolutions ${evoCount}`);
  const d = res.slot ? res.slot.state.kp : (FF7.state.kp || null);
  if (d) console.log(`   team: ${d.party.map(desc).join(', ')}${d.box.length ? ' | box ' + d.box.length : ''} | Kupodex ${Object.keys(d.dex.caught).length}/${Object.keys(d.dex.seen).length} seen | coins ${d.money}`);
  console.log(`   ${frames - f0} frames (${((frames - f0) / 3600).toFixed(1)} min of play), ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
process.exit(allOk ? 0 : 1);

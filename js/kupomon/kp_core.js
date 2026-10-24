// Kupomon core (docs/KUPOMON.md): the sandbox it runs in, its title screen and two save files, and the moogle maths
// (stats, experience, levels, evolution, the Kupodex).
//
// The sandbox: KP.play() (the MogBoy's Kupomon cartridge) opens the title screen over the game as it stands; starting
// or continuing swaps FF7.state for a Kupomon state (state.kupomon = true: its own flags, map, location, and state.kp,
// the moogles, bag, Kupodex, badges and money) and runs Kupomon's maps (kp_*) on a FieldScene of its own, pushed over
// the paused real one. Switching off swaps the real state back and pops back down to the scene it was launched from,
// exactly as it was. The two save files live in the real state (vars.kupomon.slots), so they belong to each FF7 save.
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, U = FF7.util;
  KP.PARTY_MAX = 6;   // (six, as Pokémon's: the metagame's team size, the user, 2026-10-03; it was five)
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const S = () => FF7.sceneMgr;

  // ------------------------------------------------------------------ moogle maths
  KP.sp = (mon) => KP.SPECIES[mon.sp] || {};
  KP.name = (mon) => KP.sp(mon).moogle || '?';
  KP.jobName = (mon) => (KP.JOBS[KP.sp(mon).job] || {}).name || '?';
  KP.typeOf = (mon) => KP.sp(mon).type || 'freelancer';
  // stats at the moogle's level: HP = floor(2B·L/50) + L + 10, the rest floor(2B·L/50) + 5; a bred moogle's "+" adds
  // 4% a plus
  KP.stat = function (mon, k) {
    const B = (KP.sp(mon).base || {})[k] || 40, L = mon.lv, plus = 1 + 0.04 * (mon.plus || 0);
    const v = Math.floor(2 * B * L / 50);
    return Math.floor((k === 'hp' ? v + L + 10 : v + 5) * plus);
  };
  KP.maxHp = (mon) => KP.stat(mon, 'hp');
  KP.expAt = (mon, lv) => (KP.CURVES[KP.sp(mon).curve] || KP.CURVES.medium)(lv);
  let uid = 0;
  KP.make = function (spId, lv, o = {}) {
    const mon = { uid: Date.now().toString(36) + (++uid), sp: spId, lv, exp: 0, hp: 1, status: null, moves: (KP.SPECIES[spId].moves || []).slice(), held: o.held || null, plus: o.plus || 0 };
    mon.exp = KP.expAt(mon, lv); mon.hp = KP.maxHp(mon);
    return mon;
  };
  // experience: returns the levels it went through (Hard Mode: none past the level cap, and no EXP banked there)
  KP.gainExp = function (mon, n) {
    const ups = [], cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL;
    if (mon.lv >= cap) return ups;
    mon.exp += n;
    while (mon.lv < cap && mon.exp >= KP.expAt(mon, mon.lv + 1)) {
      const before = KP.maxHp(mon);
      mon.lv++;
      mon.hp = Math.min(KP.maxHp(mon), mon.hp + (KP.maxHp(mon) - before));   // (the new HP comes in topped up)
      ups.push(mon.lv);
    }
    if (mon.lv >= cap) mon.exp = KP.expAt(mon, mon.lv);
    return ups;
  };
  KP.evoDue = (mon) => { const e = KP.sp(mon).evo; return !!(e && mon.lv >= e.at && KP.SPECIES[e.to] && mon.hp > 0); };
  // evolve: its new species and, by default, the new job's four moves (o.moves: four picked from old and new)
  KP.evolve = function (mon, o = {}) {
    const e = KP.sp(mon).evo; if (!e) return false;
    const frac = mon.hp / Math.max(1, KP.maxHp(mon));
    mon.sp = e.to;
    // (with learnsets it keeps what it knew, as in Pokemon, and learns the new job's moves as it goes: kp_learn.js)
    mon.moves = (o.moves || (KP.LEARN && KP.LEARN[e.to] ? mon.moves : KP.SPECIES[e.to].moves)).slice(0, 4);
    mon.hp = Math.max(1, Math.round(KP.maxHp(mon) * frac));
    KP.dexCatch(e.to);
    return true;
  };
  KP.healMon = (mon) => { mon.hp = KP.maxHp(mon); mon.status = null; };
  KP.alive = (list) => (list || []).filter(m => m.hp > 0);
  // the Kupodex: seen / caught
  KP.data = () => FF7.state && FF7.state.kp;
  KP.dexSee = (id) => { const d = KP.data(); if (d) d.dex.seen[id] = 1; };
  KP.dexCatch = (id) => { const d = KP.data(); if (d) { d.dex.seen[id] = 1; d.dex.caught[id] = 1; } };
  // the Kupodex's count: the mythicals aside (as Pokémon's National Dex: they come by special quests, one even after
  // the Diploma), counted on their own as `myth`
  KP.dexCount = () => {
    const d = KP.data(), myth = (id) => (KP.SPECIES[id] || {}).class === 'mythical', main = KP.DEX.filter(id => !myth(id));
    if (!d) return { seen: 0, caught: 0, of: main.length, myth: 0, mythOf: KP.DEX.length - main.length };
    const caught = Object.keys(d.dex.caught);
    return { seen: Object.keys(d.dex.seen).filter(id => !myth(id)).length, caught: caught.filter(id => !myth(id)).length, of: main.length, myth: caught.filter(myth).length, mythOf: KP.DEX.length - main.length };
  };
  // a new moogle for the player: the team, else the Mog Box (its first free place: js/kupomon/kp_box.js); the team and
  // all 50 boxes full: 'full', and it isn't kept (Pokémon's "the Box is full"; the caller says so: KP.STORAGE_FULL_TEXT)
  KP.receive = function (mon) {
    const d = KP.data();
    if (d.party.length >= KP.PARTY_MAX && KP.boxFull && KP.boxFull(d)) return 'full';
    KP.dexCatch(mon.sp);
    if (d.party.length < KP.PARTY_MAX) { d.party.push(mon); return 'party'; }
    KP.healMon(mon); d.box.push(mon); if (KP.boxPlace) KP.boxPlace(mon, d); return 'box';   // (the box repairs it: the user, 2026-10-02)
  };
  // bag
  KP.give = (id, n = 1) => { const b = KP.data().bag; b[id] = (b[id] || 0) + n; };
  KP.take = (id, n = 1) => { const b = KP.data().bag; if ((b[id] || 0) < n) return false; b[id] -= n; if (!b[id]) delete b[id]; return true; };
  KP.healAll = () => KP.data().party.forEach(KP.healMon);
  // prize coins: the team's best coin ability (Coin Up, Royal Presence: ×2), and ×2 again with a Gambler's Coin held
  KP.coinMul = function (d) {
    d = d || KP.data(); const P = (d && d.party) || [];
    const ab = Math.max(1, ...P.map(m => { const a = KP.abilityOf ? KP.abilityOf(m) : null; return (a && a.coins) || 1; }));
    return ab * Math.max(1, ...P.map(m => (KP.ITEMS[m.held] || {}).coins || (m.held === 'gamblers_coin' ? 2 : 1)));   // (an item with coins: the Gambler's Coin's kind)
  };

  // ------------------------------------------------------------------ Hard Mode (the user, 2026-10-02): chosen at a new
  // game or a new Demo; Normal Mode is the game as it was.
  //  * Nuzlocke: one moogle befriended per area (KP.areaOf: a map's area, so a cave's floors are one; a moogle given by
  //    someone, hatched or swapped doesn't count): d.nuz[area]. A moogle that powers down in battle is gone for good
  //    (kp_battle.js finish: off the team, into d.fallen); from the moment Cloud leaves the lab
  //  * a level cap: the ace of the next big battle not yet won (a dojo master, Team Hojo's admins and Hojo, the Elite
  //    Four); no EXP at the cap (KP.gainExp)
  //  * breeding keeps both parents, and takes a permit: badge N gives N (36 with all eight) (kp_breed.js)
  KP.MODES = { normal: 'Normal Mode', hard: 'Hard Mode' };
  KP.hard = () => { const d = KP.data(); return !!(d && d.mode === 'hard'); };
  KP.hardRules = () => KP.hard() && !!(FF7.state.flags && FF7.state.flags.kp_sent_off);   // (the lab's test battle aside)
  KP.areaOf = (mapId) => { const m = FF7.maps[mapId]; return m ? m.area || m.name || mapId : mapId; };
  KP.areaUsed = (area) => { const d = KP.data(); return !!(d && d.nuz && d.nuz[area]); };
  // the big battles that set the cap: [won?, its ace's level] (the dojo masters by their badges, Team Hojo's admins and
  // Hojo, Hojo at the Lifestream Tower, the Elite Four as one gauntlet won with the Champion's title)
  KP.capBattles = function () {
    const fl = FF7.state.flags || {}, out = [], lvOf = (t) => Math.max(0, ...(KP.teamFor ? KP.teamFor(t.id, t.team) : t.team || []).map(r => r[1]));
    let e4 = 0;
    for (const t of Object.values(KP.TRAINER_DEFS || {})) {
      if (t.kind === 'master') out.push([!!fl['kp_badge_' + t.badge], KP.LV(lvOf(t))]);
      else if (t.kind === 'elite') e4 = Math.max(e4, KP.LV(lvOf(t)));
      else if (/^Team Hojo (Admin|Boss)/.test(t.cls || '')) out.push([!!fl['kp_tr_' + t.id], KP.LV(lvOf(t))]);
    }
    out.push([!!fl.kp_hojo_done, KP.LV(29)]);   // (Hojo's finale at the Lifestream Tower: Project J, Jenomog, at 29)
    if (e4) out.push([!!fl.kp_champion, e4]);
    return out;
  };
  KP.levelCap = function () {
    if (!KP.hard() || (FF7.state.flags && FF7.state.flags.kp_champion)) return KP.MAX_LEVEL;
    const L = KP.capBattles(), won = L.filter(x => x[0]).map(x => x[1]), open = L.filter(x => !x[0]).map(x => x[1]);
    if (!open.length) return KP.MAX_LEVEL;
    return Math.min(KP.MAX_LEVEL, Math.max(won.length ? Math.max(...won) : 0, Math.min(...open)));
  };
  // breeding permits (Hard Mode): badge N gives N; the ones used are d.bred
  KP.breedPermits = function () { const d = KP.data(); if (!d) return 0; return (d.badges || []).reduce((a, n) => a + n, 0) - (d.bred || 0); };
  // a moogle gone for good (Hard Mode): off the team, into the memorial
  KP.fall = function (mon, where) {
    const d = KP.data(); const i = d.party.indexOf(mon); if (i >= 0) d.party.splice(i, 1);
    if (mon.held) { KP.give(mon.held); mon.held = null; }   // (what it held comes back to the bag)
    (d.fallen = d.fallen || []).push({ name: KP.name(mon), sp: mon.sp, lv: mon.lv, plus: mon.plus || 0, where: where || '', time: Math.floor(FF7.state.time || 0) });
  };
  // after a battle in Hard Mode (kp_battle.js finish): a team with nobody left takes the strongest from the Mog Box
  // (returns their names); nobody anywhere: null, and the run is over (KP.gameOver: back to the title; the last save is
  // where it was)
  KP.hardRefill = function () {
    const d = KP.data(); if (!KP.hard() || d.party.length) return [];
    if (!d.box.length) return null;
    const take = d.box.slice().sort((a, b) => b.lv - a.lv).slice(0, KP.PARTY_MAX);
    take.forEach(m => { d.box.splice(d.box.indexOf(m), 1); KP.healMon(m); d.party.push(m); });
    return take.map(m => KP.name(m));
  };
  KP.endRun = function () {
    KP.gameOver = true;
    const R = FF7.runner;
    if (R && R.active) { try { R.say('kupomon: Hard Mode: every moogle is gone; the run is over'); R.stop('Hard Mode: the run is over'); if (R.demo && R.demo.finish) R.demo.finish('Hard Mode: every moogle is gone. The run is over.'); } catch (e) { } }
    S().replace(new KP.Title());
  };

  // ------------------------------------------------------------------ the sandbox
  KP.real = null;
  KP.active = () => !!(FF7.state && FF7.state.kupomon);
  const realSlots = (st) => { const v = st.vars.kupomon = st.vars.kupomon || {}; v.slots = v.slots || [null, null]; return v.slots; };
  KP.newState = function (real) {
    const st = FF7.newState();
    st.chars.cloud = FF7.makeChar('cloud');
    st.chars.cloud.name = (real.chars.cloud && real.chars.cloud.name) || st.chars.cloud.name;   // (Cloud plays, under his own name)
    st.config = real.config;
    st.kupomon = true;
    st.kp = { v: 1, party: [], box: [], bag: {}, money: 3000, dex: { seen: {}, caught: {} }, badges: [], repair: ['kp_lab', 'start'] };
    return st;
  };
  // the MogBoy's Kupomon cartridge: the title screen, then the game; a waitable done when it's switched off
  KP.play = function () {
    if (KP.rescaleWild) KP.rescaleWild();   // (the maps' wild tables, once, on the cap of 50)
    const w = { done: false };
    if (KP.real) { w.done = true; return w; }
    KP.real = { state: FF7.state, field: FF7.fieldScene, base: S().top(), music: FF7.audio.currentId || null, w };
    S().push(new KP.Title());
    return w;
  };
  // start a save file: data (a saved Kupomon state) or a new game (null; mode: 'normal' or 'hard')
  KP.enter = function (slot, data, mode) {
    if (KP.rescaleWild) KP.rescaleWild();
    const R0 = KP.real, st = data ? clone(data) : KP.newState(R0.state);
    if (data && KP.migrate) KP.migrate(st); else if (st.kp) st.kp.v = 2;   // (a file from before the expansion: brought up to date)
    if (!data && st.kp) st.kp.mode = mode === 'hard' ? 'hard' : 'normal';
    KP.gameOver = false;
    st.config = R0.state.config; st.kupomon = true;
    if (R0.state.chars.cloud) st.chars.cloud.name = R0.state.chars.cloud.name;
    KP.slot = slot; KP.t0 = st.time || 0; KP._demoRun = false;   // (the title's Demo sets it again after)
    FF7.state = st;
    const fs = new FF7.field.FieldScene();
    FF7.fieldScene = fs;
    S().replace(fs);
    const loc = st.loc && st.loc.map ? st.loc : null;
    const ok = loc && FF7.maps[loc.map];
    fs.load(ok ? loc.map : 'kp_lab', ok ? [loc.x, loc.y, loc.dir] : 'start');
    if (ok && fs.P && !fs.P.walkable(loc.x, loc.y)) fs.load(loc.map, null);   // (that spot is a wall now, after a redesign: the map's own way in)
  };
  KP.summary = function (st) {
    const d = st.kp, lead = d.party[0];
    return { name: st.chars.cloud.name, badges: d.badges.length, dex: Object.keys(d.dex.caught).length, time: Math.floor(st.time || 0), lead: lead ? KP.name(lead) + ' Lv' + lead.lv : '—', where: (FF7.maps[st.loc.map] || {}).name || '', mode: d.mode || 'normal' };
  };
  KP.save = function (slot) {
    if (!KP.real || !KP.active()) return false;
    const st = FF7.state, fs = FF7.fieldScene;
    if (fs && fs.player && fs.map) st.loc = { mode: 'field', map: fs.map.id, x: fs.player.tx, y: fs.player.ty, dir: fs.player.dir || 'down' };
    const data = clone(st); delete data.config;
    realSlots(KP.real.state)[slot] = { summary: KP.summary(st), state: data };
    KP.slot = slot;
    // the FF7 game holding it goes to the Autosave too (if that's on), so a Kupomon save isn't lost with a closed window
    const real = KP.real.state, Q = FF7.qol;
    if (Q && Q.on && Q.on('autosave') && FF7.save.writeAuto && real !== FF7.devState && !(FF7.runner && FF7.runner.active)) FF7.save.writeAuto(real);
    return true;
  };
  KP.slots = () => KP.real ? realSlots(KP.real.state) : [null, null];
  // Cloud the Champion of the Kupo League in this FF7 game (Cait Sith wants to hear about it: js/maps/extra/
  // cait_hideout.js): set at the Hall of Fame in a player's own game (flag kupomon_champion; never the title's Demo),
  // or a Kupomon file saved after it
  KP.championIn = function (st) {
    if (!st || !st.flags) return false;
    if (st.flags.kupomon_champion) return true;
    const v = st.vars && st.vars.kupomon, slots = (v && v.slots) || [];
    return slots.some(f => !!(f && f.state && f.state.flags && f.state.flags.kp_champion));
  };
  // the Kupodex Diploma in this FF7 game (Cait Sith's second review, after the whole post-game: js/maps/extra/
  // cait_hideout.js): set when Prof. Sith hands it over in a player's own game (flag kupomon_diploma; never the Demo), or
  // a Kupomon file saved after it
  KP.diplomaIn = function (st) {
    if (!st || !st.flags) return false;
    if (st.flags.kupomon_diploma) return true;
    const v = st.vars && st.vars.kupomon, slots = (v && v.slots) || [];
    return slots.some(f => !!(f && f.state && f.state.flags && f.state.flags.kp_diploma));
  };
  // the Demo's own file: the Kupomon Demo (started from this title) saves here as it plays, and Title > Demo > Continue
  // Demo picks it up; its own place in the browser's storage, apart from Files 1-2 (kept inside the FF7 save) and every
  // FF7 file. { summary, state, pc, steps }: the game, and the Demo's step on its route
  KP.DEMO_KEY = 'ff7js_kp_demo';
  KP.saveDemo = function (pc, steps) {
    const st = FF7.state, fs = FF7.fieldScene;
    if (!st || !st.kupomon || !st.kp) return false;
    if (fs && fs.player && fs.map) st.loc = { mode: 'field', map: fs.map.id, x: fs.player.tx, y: fs.player.ty, dir: fs.player.dir || 'down' };
    const data = clone(st); delete data.config;
    try { localStorage.setItem(KP.DEMO_KEY, JSON.stringify({ v: 1, summary: KP.summary(st), state: data, pc, steps, saved: Date.now() })); return true; } catch (e) { return false; }
  };
  KP.loadDemo = function () { try { const s = localStorage.getItem(KP.DEMO_KEY); const f = s ? JSON.parse(s) : null; if (f && f.state && f.state.kp && KP.migrate) KP.migrate(f.state); return f && f.state && f.state.kp ? f : null; } catch (e) { return null; } };
  // switch off: back to FF7 exactly where it was
  KP.quit = function () {
    const R0 = KP.real; if (!R0) return;
    if (KP.active()) R0.state.time = (R0.state.time || 0) + Math.max(0, (FF7.state.time || 0) - (KP.t0 || 0));   // (the time on the MogBoy counts in FF7's clock)
    while (S().stack.length > 1 && S().top() !== R0.base) S().pop();
    FF7.state = R0.state; FF7.fieldScene = R0.field;
    if (R0.music) FF7.audio.play(R0.music); else FF7.audio.stop(20);
    KP.real = null; KP.slot = null; KP._demoRun = false;
    R0.w.done = true;
  };
  KP.blackouts = 0;
  KP.blackout = function* (s) {   // the whole team down: half the money, back to the last Mog Repair
    const d = KP.data(); KP.blackouts++;
    yield s.msg(`${s.name('cloud')} has no moogles left standing!\f${s.name('cloud')} blacked out!`);
    d.money = Math.floor(d.money / 2);
    KP.healAll();
    yield s.goto(d.repair[0], d.repair[1]);
  };

  // ------------------------------------------------------------------ a map's wild tables: kpWild, or a base table and
  // zones with tables of their own (kpWildBase, kpWildZones: { table: (P, x, y) => true on its tiles }; Whisperwood
  // Deep's glade, Mt. Kupo B2F's glowing hollow). KP.wildTableAt: the table at a tile; KP.wildTablesOf: every table a
  // map has (the Demo's hunts and the Kupodex's habitats need the zones' too: reading kpWild away from the map only
  // ever gave the base one, so the 22 kinds of the two zones were never looked for: tools/kp_dexcheck.js)
  KP.wildTableAt = (m, P, x, y) => { for (const [t, inZone] of Object.entries(m.kpWildZones || {})) if (P && x != null && inZone(P, x, y)) return t; return m.kpWildBase || null; };
  KP.wildTablesOf = (m) => {
    const d = Object.getOwnPropertyDescriptor(m, 'kpWild'), base = m.kpWildBase || (d && !d.get ? m.kpWild : null);
    return [base, ...Object.keys(m.kpWildZones || {})].filter(t => t && KP.WILD && KP.WILD[t]);
  };
  // ------------------------------------------------------------------ tall grass (a map's kpWild table, js/field/field.js
  // stepEncounter): wild moogles in the grass only
  KP.step = function (fs, dist) {
    const p = fs.player; if (!p || !fs.P) return;
    const t = fs.P.at(p.tx, p.ty); if (!t || !(t.prop === 'tallgrass' || (fs.map.kpCave && t.walk && !t.stair && t.prop !== 'door'))) return;   // (tall grass; in a cave, any floor)
    if ((FF7.state.kp.party || []).every(m => m.hp <= 0)) return;
    fs.danger += dist;
    if (fs.danger < fs.kpLimit) return;
    fs.danger = 0; fs.kpLimit = 2.4 + Math.random() * 3.6;
    const tab = KP.WILD[fs.map.kpWild]; if (!tab) return;
    const e = U.weighted(tab.map(r => ({ r, w: r[1] })), 'w').r;
    const mon = KP.make(e[0], e[2] + Math.floor(Math.random() * (e[3] - e[2] + 1)));
    if (KP.repelBlocks && KP.repelBlocks(mon)) return;   // (a Pom Spray: one weaker than the lead keeps away, kp_repel.js)
    p.moving = false;
    fs.runScript(function* (s) { yield* KP.fight(s, { kind: 'wild', foes: [mon], bg: fs.map.kpBg || 'grass' }); }, { name: 'kp-wild' });   // (all down: a blackout)
  };

  // ------------------------------------------------------------------ the title screen
  class Title {
    constructor() { this.t = 0; this.mode = 'main'; this.idx = 0; this.msg = null; this.pick = null; }
    enter() { FF7.audio.play('waltz_chocobo'); }
    items() {
      if (this.mode === 'main') return ['New Game', 'Continue', 'Demo', 'Switch off'];
      if (this.mode === 'demo') return ['Continue Demo', 'New Demo', 'Back'];
      if (this.mode === 'diff') return ['Normal Mode', 'Hard Mode', 'Back'];
      return ['File 1', 'File 2', 'Back'];
    }
    update() {
      const I = FF7.input; this.t++;
      if (this.t < 30) return;
      if (this.msg) { if (I.pressed('ok') || I.back()) { const m = this.msg; this.msg = null; if (m.then) m.then(); } return; }
      const L = this.items();
      if (I.repeat('up')) { this.idx = (this.idx + L.length - 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % L.length; FF7.audio.sfx('cursor'); }
      if (I.back()) { FF7.audio.sfx('cancel'); if (this.mode === 'main') KP.quit(); else { this.mode = 'main'; this.idx = 0; this.pick = null; } return; }
      if (!I.pressed('ok')) return;
      const slots = KP.slots();
      // the mode for a new game or a new Demo (this.pick: what starts with it)
      if (this.mode === 'diff') {
        if (this.idx === 2) { FF7.audio.sfx('cancel'); this.mode = 'main'; this.idx = 0; this.pick = null; return; }
        FF7.audio.sfx('confirm');
        const mode = this.idx === 1 ? 'hard' : 'normal', p = this.pick; this.pick = null;
        if (p && p.demo) { KP.enter(null, null, mode); KP._demoRun = true; if (KP.demo) KP.demo(); }
        else if (p) KP.enter(p.slot, null, mode);
        return;
      }
      if (this.mode === 'main') {
        if (this.idx === 3) { FF7.audio.sfx('cancel'); KP.quit(); return; }
        if (this.idx === 2) {   // the Demo: a game that plays itself (Esc takes over), saved to its own Demo file
          if (!(FF7.runner && FF7.runner.plans && FF7.runner.plans.kp)) { FF7.audio.sfx('error'); return; }
          FF7.audio.sfx('confirm');
          if (KP.loadDemo()) { this.mode = 'demo'; this.idx = 0; return; }   // (a Demo file: continue it, or a new one)
          this.mode = 'diff'; this.idx = 0; this.pick = { demo: true }; return;
        }
        if (this.idx === 1 && !slots[0] && !slots[1]) { FF7.audio.sfx('error'); this.msg = { text: 'There are no saved files yet.' }; return; }
        FF7.audio.sfx('confirm'); this.mode = this.idx === 0 ? 'new' : 'load'; this.idx = 0; return;
      }
      if (this.idx === 2) { FF7.audio.sfx('cancel'); this.mode = 'main'; this.idx = 0; return; }
      if (this.mode === 'demo') {
        FF7.audio.sfx('confirm');
        if (this.idx === 1) { this.mode = 'diff'; this.idx = 0; this.pick = { demo: true }; return; }   // (a new Demo: its mode first)
        const f = KP.loadDemo();
        KP.enter(null, f ? f.state : null); KP._demoRun = true;
        if (KP.demo) KP.demo(f ? { at: f.pc, steps: f.steps } : null);
        return;
      }
      const k = this.idx, f = slots[k];
      if (this.mode === 'load') {
        if (!f) { FF7.audio.sfx('error'); return; }
        FF7.audio.sfx('confirm'); KP.enter(k, f.state); return;
      }
      if (f && !this.sure) { FF7.audio.sfx('cursor'); this.sure = true; this.msg = { text: `Start over on File ${k + 1}? Its old adventure is lost when you save. (Press OK again.)` }; return; }
      this.sure = false;
      FF7.audio.sfx('confirm'); this.mode = 'diff'; this.idx = 0; this.pick = { slot: k };   // (its mode first)
    }
    render() {
      const R = FF7.render, c = R.ctx, W = FF7.W, H = FF7.H;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a3a2a'); g.addColorStop(1, '#08140e'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      // the logo, bouncing in
      const k = Math.min(1, this.t / 40), y = 70 + (1 - k) * -80 + Math.sin(this.t * 0.06) * 3;
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = R.font(64, '900'); c.fillStyle = '#0a1a10'; c.fillText('KUPOMON', W / 2 + 4, y + 5);
      const lg = c.createLinearGradient(0, y - 30, 0, y + 30); lg.addColorStop(0, '#ffe680'); lg.addColorStop(1, '#ff8a3a'); c.fillStyle = lg; c.fillText('KUPOMON', W / 2, y);
      c.font = R.font(15, '700'); c.fillStyle = '#d8f0e0'; c.fillText('Gotta befriend ’em all, kupo!', W / 2, y + 44);
      c.restore();
      // the menu
      const L = this.items(), slots = KP.slots();
      if (this.mode === 'main') {
        R.window(W / 2 - 110, 200, 220, 30 + L.length * 30);
        L.forEach((t, i) => R.text(t, W / 2 - 70, 216 + i * 30, { size: 18 }));
        R.cursor(W / 2 - 84, 227 + this.idx * 30);
      } else if (this.mode === 'diff') {
        // Normal or Hard: what each means
        R.window(40, 150, W - 80, 290);
        R.text(this.pick && this.pick.demo ? 'New Demo: which mode?' : 'New Game: which mode?', 60, 162, { color: R.COL.cyan, size: 15 });
        L.forEach((t, i) => R.text(t, 84, 192 + i * 30, { size: 18, color: i === 1 ? '#ff9a7a' : R.COL.white }));
        R.cursor(70, 203 + this.idx * 30);
        const tx = this.idx === 1 ? ['One moogle befriended per area (a gift, an egg or a swap doesn\'t count).', 'A moogle that powers down in battle is gone for good.',
          'A level cap: none grows past the ace of the next big battle until that battle is won.',
          'Breeding keeps both parents, but takes a permit: badge 1 gives 1, badge 7 gives 7... 36 in all.']
          : this.idx === 0 ? ['The Kupo Isles as they are: befriend as many moogles as you like, repair the ones that power down,', 'grow them as far as they\'ll go, and breed whenever you like at the Kupo Ranch.'] : ['Back to the title.'];
        tx.forEach((t, i) => R.textFit('• ' + t, 60, 296 + i * 30, W - 120, { size: 12, minSize: 9, color: R.COL.gray }));
      } else if (this.mode === 'demo') {
        // the Demo file, and what to do with it
        const f = KP.loadDemo(), m = f && f.summary;
        R.window(60, 170, W - 120, 220);
        R.text('Demo', 80, 182, { color: R.COL.cyan, size: 15 });
        if (m) {
          const tm = Math.floor(m.time / 3600) + ':' + U.pad(Math.floor(m.time / 60) % 60, 2);
          R.text(`Demo file: ${m.name}   ${m.where}`, 104, 208, { size: 15 });
          R.text(`Badges ${m.badges}   Kupodex ${m.dex}   ${m.lead}   Time ${tm}${m.mode === 'hard' ? '   HARD' : ''}`, 104, 232, { size: 13, color: R.COL.gray });
        }
        L.forEach((t, i) => R.text(t, 104, 270 + i * 32, { size: 18 }));
        R.cursor(90, 281 + this.idx * 32);
        R.text('A new Demo starts over; the Demo file is its own, apart from Files 1 and 2.', 80, 366, { size: 11, color: R.COL.gray });
      } else {
        R.window(60, 170, W - 120, 250);
        R.text(this.mode === 'new' ? 'New Game: which file?' : 'Continue: which file?', 80, 182, { color: R.COL.cyan, size: 15 });
        [0, 1].forEach(i => {
          const f = slots[i], y = 214 + i * 74;
          R.text('File ' + (i + 1), 104, y, { size: 18 });
          if (!f) R.text('— empty —', 200, y, { size: 15, color: R.COL.gray });
          else {
            const m = f.summary, tm = Math.floor(m.time / 3600) + ':' + U.pad(Math.floor(m.time / 60) % 60, 2);
            R.text(`${m.name}   ${m.where}`, 200, y, { size: 15 });
            R.text(`Badges ${m.badges}   Kupodex ${m.dex}   ${m.lead}   Time ${tm}${m.mode === 'hard' ? '   HARD' : ''}`, 200, y + 24, { size: 13, color: R.COL.gray });
          }
        });
        R.text('Back', 104, 214 + 2 * 74, { size: 18 });
        R.cursor(90, 225 + this.idx * 74);
      }
      if (this.msg) { R.window(60, H - 58, W - 120, 52); R.para(this.msg.text, 76, H - 50, W - 152, { size: 14, minSize: 11, lines: 2 }); }   // (below the file list, wrapped)
      if (!this.msg) R.text('© Cait Sith Games', W / 2, H - 22, { align: 'center', size: 11, color: '#6a8a7a' });   // (a message's window sits there)
    }
  }
  KP.Title = Title;

})();

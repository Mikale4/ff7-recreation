// Kupomon battles (docs/KUPOMON.md "Battles"): one-on-one, turn-based, teams of up to five. Fight / Moogles / Bag / Run;
// cooldowns instead of PP; lasting statuses (poison sleep stop blind silence) and battle-only ones (confuse berserk
// doom); held items; catching with Kupo Nuts; experience, levels and evolution (with the old-or-new moves choice).
//   KP.battle({ kind: 'wild' | 'trainer', foes: [mons], trainer: { name, money }, bg, noBag, canLose }) -> waitable,
//   (bag items: wild battles only; every trainer battle is noBag. Held items work in every battle)
//   result 'win' | 'lose' | 'run' | 'caught'. KP.fight(s, opts): the same from a script, blacking out on a loss.
// Drawn in 3D like the rest of the game: the two robot moogles on their grass platforms, Pokémon-style boxes.
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {}, U = FF7.util, R = FF7.render, MG = FF7.minigames, GL = FF7.GL;
  const W = FF7.W, H = FF7.H, PI = Math.PI;
  const S = () => FF7.sceneMgr, sfx = (id) => { try { FF7.audio.sfx(id); } catch (e) { } };

  // ------------------------------------------------------------------ rules
  KP.effOn = (type, mon) => { if (!type) return 1; const s = KP.sp(mon); return KP.eff(type, s.type) * (s.type2 ? KP.eff(type, s.type2) : 1); };
  const stageMul = (s) => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  // (critical hits, accuracy, Speed and the damage formula: Showdown's, js/kupomon/kp_calc.js)
  const FLAIL = { id: 'flail', name: 'Flail', type: null, power: 35, acc: 100, cd: 0, desc: 'Flails about. Used when nothing else can be.' };
  const STAT_NAMES = { atk: 'Attack', def: 'Defense', mag: 'Magic', res: 'Resistance', spd: 'Speed', crit: 'crit chance' };
  const moveOf = (id) => id === 'flail' ? FLAIL : KP.MOVES[id];
  // how a move will land on the foe, as modern Pokémon hints it on the move button: for attacks, and for a status move
  // the foe's type shrugs off entirely
  const effHint = (mv, foe) => {
    if (!mv || !foe || !mv.type) return null;
    const e = KP.effOn(mv.type, foe);
    if (e === 0 && (mv.power || mv.status)) return { text: 'No effect', col: '#4a4a52' };
    if (!mv.power) return null;
    return e > 1 ? { text: e >= 4 ? 'Super effective ×4' : 'Super effective', col: '#2f8a46' } : e < 1 ? { text: 'Not very effective', col: '#a8701c' } : { text: 'Effective', col: '#4a6a90' };
  };

  // the start: the main game's encounter (its sound and battle swirl, js/battle/battle.js B.start), then the battle
  KP.battle = function (o) {
    const w = { done: false, result: null };
    if (FF7.audio.stopAllSfx) FF7.audio.stopAllSfx();
    sfx('encounter');
    S().swirl(48);
    S().push(new Battle(o, w));
    return w;
  };
  KP.fight = function* (s, o) {
    const r = yield KP.battle(o);
    if (KP.gameOver) return r;   // (Hard Mode: the run is over)
    if (r === 'lose' && !o.canLose) yield* KP.blackout(s);
    return r;
  };

  // ------------------------------------------------------------------ shared meshes (the field, the platforms, a nut)
  let MESH = null;
  const meshes = () => MESH || (MESH = {
    ground: MG.mesh(mb => mb.prism(0, -0.02, 0, 9, 9, 0.02, 24, '#ffffff', false, true, false)),
    pad: MG.mesh(mb => { mb.prism(0, 0, 0, 1, 1, 0.04, 20, '#ffffff', false); }),
    nut: MG.mesh(mb => { mb.sphere(0, 0, 0, 1, 1.15, 1, '#b07a3a', 8, 6, false); mb.box(0, 1.05, 0, 0.25, 0.4, 0.25, '#5a3a1a'); }),
  });
  const BG = {
    grass: { sky: ['#6aa8e0', '#d8f0ff'], ground: [0.42, 0.66, 0.32], pad: [0.55, 0.8, 0.42] },
    lab: { sky: ['#283040', '#5a6a80'], ground: [0.55, 0.57, 0.6], pad: [0.72, 0.74, 0.78] },
    cave: { sky: ['#0a0a10', '#2a2630'], ground: [0.32, 0.28, 0.26], pad: [0.45, 0.4, 0.36] },
    forest: { sky: ['#3a6a4a', '#a8d0a0'], ground: [0.3, 0.5, 0.26], pad: [0.42, 0.62, 0.34] },
    desert: { sky: ['#e8a860', '#fce8c0'], ground: [0.86, 0.72, 0.46], pad: [0.94, 0.82, 0.58] },
    snow: { sky: ['#9ab8d8', '#eef4fa'], ground: [0.88, 0.9, 0.94], pad: [0.96, 0.97, 1.0] },
    beach: { sky: ['#4aa0e0', '#d0f0ff'], ground: [0.9, 0.82, 0.6], pad: [0.55, 0.78, 0.86] },
    swamp: { sky: ['#3a4a3a', '#8a9a80'], ground: [0.3, 0.36, 0.26], pad: [0.4, 0.46, 0.32] },
    ruins: { sky: ['#c89060', '#f0d8b0'], ground: [0.72, 0.62, 0.46], pad: [0.8, 0.72, 0.58] },
    mountain: { sky: ['#6a90c0', '#d8e8f8'], ground: [0.5, 0.48, 0.44], pad: [0.62, 0.6, 0.56] },
    night: { sky: ['#0a0a20', '#2a2a50'], ground: [0.22, 0.26, 0.3], pad: [0.32, 0.36, 0.42] },
    dojo: { sky: ['#2a1a10', '#6a4a30'], ground: [0.6, 0.45, 0.3], pad: [0.78, 0.62, 0.42] },
    arena: { sky: ['#1a2a5a', '#6a8ad0'], ground: [0.55, 0.5, 0.42], pad: [0.85, 0.75, 0.4] },
    town: { sky: ['#6aa8e0', '#e0f0ff'], ground: [0.6, 0.56, 0.5], pad: [0.7, 0.66, 0.6] },
    lifestream: { sky: ['#0a2a20', '#40c090'], ground: [0.2, 0.4, 0.34], pad: [0.4, 0.8, 0.6] },
    crater: { sky: ['#10101a', '#4a3a5a'], ground: [0.3, 0.28, 0.32], pad: [0.5, 0.45, 0.6] },
    sky: { sky: ['#4a8ae0', '#ffffff'], ground: [0.82, 0.86, 0.92], pad: [0.9, 0.92, 0.98] },
  };
  KP.BATTLE_BG = BG;   // (the backgrounds' colours: the team preview's sky, kp_preview.js)
  const POS = { me: [-0.7, 0, 0.5], foe: [1.0, 0, -1.25] };
  const FX_SCALE = 0.45;   // (FF7's battle effects, sized for its people: a moogle on a close camera wants them smaller)
  const SIZE = { me: 1.25, foe: 1.4 };   // (ours nearer the camera, seen from behind)

  const STAT_ABBR = { atk: 'Atk', def: 'Def', mag: 'Mag', res: 'Res', spd: 'Spe', crit: 'Crit' };
  const NUTS = () => Object.keys(KP.ITEMS).filter(k => KP.ITEMS[k].kind === 'nut');
  const BATTLE_POCKETS = [0, 1];   // (KP.BAG_POCKETS: Repairs, Kupo Nuts)
  const FIGHTERS = { warrior: 1, knight: 1, monk: 1, dragoon: 1 }, ROVERS = { thief: 1, ranger: 1, beast: 1, machinist: 1, freelancer: 1 };
  const types = (mon) => { const s = KP.sp(mon); return [s.type, s.type2].filter(Boolean); };
  // a nut's bonus on this moogle in this battle (x1 when it doesn't apply)
  const NUT_BONUS = {
    young: (B, mon) => Math.max(1, (68 - mon.lv) / 17),   // (the lower its level, the tastier: on the cap of 50)
    quick: (B) => (B.turn || 0) <= 1 ? 4 : 1,
    slow: (B) => Math.min(4, 1 + 0.3 * (B.turn || 0)),
    repeat: (B, mon) => B.d.dex.caught[mon.sp] ? 3 : 1,
    dream: (B, mon) => mon.status === 'sleep' ? 2 : 1,   // (x2 on top of sleep's own x2: x4)
    dark: (B) => B.o.bg === 'cave' || B.o.dark ? 3.5 : 1,
    magic: (B, mon) => types(mon).some(t => KP.MAGIC[t]) ? 3 : 1,
    fighter: (B, mon) => types(mon).some(t => FIGHTERS[t]) ? 3 : 1,
    rover: (B, mon) => types(mon).some(t => ROVERS[t]) ? 3 : 1,
    level: (B, mon) => { const m = B.me && B.me.mon; return !m ? 1 : m.lv >= mon.lv * 2 ? 4 : m.lv > mon.lv ? 2 : 1; },
  };
  // the turn a battle that drags on starts wearing both moogles out (the user, 2026-10-03: from turn 80, it was 100),
  // and how many turns ahead the warning comes
  KP.WEAR_TURN = 80; KP.WEAR_WARN = 5;
  KP.nutBonus = (B, mon, id) => { const d = KP.ITEMS[id]; return d && d.bonus && NUT_BONUS[d.bonus] ? NUT_BONUS[d.bonus](B, mon) : 1; };
  // how many nuts a befriending allows: three; a legendary or a mythical ten (the user, 2026-10-02: "way harder to
  // befriend": an appetite of 3 to 5 against a common one's 50 or more; the old five legends are known by that appetite)
  KP.befriendTries = (mon) => { const s = KP.sp(mon) || {}; return s.class === 'legend' || s.class === 'mythical' || (s.rate || 120) <= 5 ? 10 : 3; };
  // the chance it likes it: its appetite (rate), the nut's taste and bonus, and a lasting ailment it went down with
  KP.nutChance = (B, mon, id) => {
    const d = KP.ITEMS[id], rate = KP.sp(mon).rate || 120;
    let p = rate * d.nut * KP.nutBonus(B, mon, id) / 255 * (mon.bond || 1);   // (a legend met through its quest: bonded, kp_world.js W.legend)
    if (mon.status === 'sleep' || mon.status === 'stop') p *= 2;   // (it went down ailing: an easier one to win over, as in
    else if (mon.status) p *= 1.5;                                // Pokémon: asleep or Stopped x2, the others x1.5)
    return Math.min(1, p);
  };
  const person = (app) => { try { const m = FF7.field.buildModel(app); if (m.anims && m.anims.idle && m.play) m.play(m.anims.idle); return m; } catch (e) { return null; } };
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  // Cloud's throw (a Kupo Nut): the right arm drawn back, then over the top and through, the body turning with it
  const THROW = { dur: 30, loop: false, fn(m, p) {
    if (FF7.anims.battle) FF7.anims.battle.fn(m, 0);
    const back = p < 0.4 ? Math.sin(p / 0.4 * PI / 2) : Math.max(0, 1 - (p - 0.4) / 0.14);
    const fwd = p < 0.4 ? 0 : p < 0.6 ? ease((p - 0.4) / 0.2) : 1 - 0.7 * ease((p - 0.6) / 0.4);
    const b = (n) => m.b && m.b(n);
    const arm = b('armR'), fore = b('foreR'), chest = b('torso');
    if (arm) { arm.rot[0] = 1.2 * back - 2.2 * fwd; arm.rot[2] = (arm.rot[2] || 0) - 0.3 * back; }
    if (fore) fore.rot[0] = -1.1 * back - 0.25 * fwd;
    if (chest) chest.rot[1] = (chest.rot[1] || 0) - 0.35 * back + 0.3 * fwd;
  } };

  // ------------------------------------------------------------------ one side's active moogle
  class Fighter {
    constructor(mon, side, B) {
      this.mon = mon; this.side = side; this.B = B;
      this.m = KP.moogleModel(mon.sp); this.m.scale = 1.55;
      if (this.m.anims && this.m.anims.idle) this.m.play(this.m.anims.idle);
      this.st = { atk: 0, def: 0, mag: 0, res: 0, spd: 0, crit: 0 };
      this.vol = { confuse: 0, berserk: false, doom: 0 };   // (and the expansion's states: kp_mech.js KP.VOLATILES)
      this.streak = 0; this.lastMove = null; this.lock = null; this.venomN = 0;
      this.hpShown = mon.hp; this.dx = 0; this.dy = 0; this.alpha = 1; this.grow = 0; this.flash = 0; this.shake = 0;
      this.pops = []; this.glow = null;   // a stat change: the words floating up off it, and a glow
      this.expShown = null; this.lvShown = null;   // (the EXP bar filling)
    }
    get name() { return KP.name(this.mon); }
    // a stat in battle: at its stage, then its holder's handlers (Speed: KP.speedOf; the damage formula works its own
    // out, a critical hit ignoring some stages)
    stat(k) {
      if (k === 'hp') return KP.maxHp(this.mon);
      if (k === 'spd') return KP.speedOf(this.B, this);
      const v = KP.boosted(KP.stat(this.mon, k), this.st[k] || 0);
      return KP.chainOf('Modify' + k[0].toUpperCase() + k.slice(1), { B: this.B, holder: this, user: this }, ['self']).apply(v);
    }
  }
  const rand16 = () => Math.floor(Math.random() * 16);
  const clampStage = (k, v) => Math.max(-6, Math.min(k === 'crit' ? 4 : 6, v));
  const nameOfSide = (side, o) => side === 'me' ? (o.spectate ? `${o.spectate.name}'s side` : 'your side') : (o.kind === 'wild' ? "the wild moogle's side" : `${(o.trainer && o.trainer.name) || 'the foe'}'s side`);
  // the field's and each side's handlers on a fighter (KP.handlersOf): built once
  const H_TERRAIN = {};
  const terrainH = (id) => H_TERRAIN[id] || (H_TERRAIN[id] = (() => {
    const T = KP.TERRAINS[id], h = {};
    if (T.boost) h.onBasePower = (c) => c.moveType === T.boost && KP.grounded(c.B, c.user) ? [5325, 4096] : 1;
    if (T.weaken) h.onSourceBasePower = (c) => c.moveType === T.weaken && KP.grounded(c.B, c.target) ? 0.5 : 1;
    return h;
  })());
  const H_SIDE = {
    wall: { onSourceModifyDamage: (c) => c.cat === 'physical' && !c.crit && !(c.B.ab(c.user) || {}).infiltrator ? 0.5 : 1 },
    shell: { onSourceModifyDamage: (c) => c.cat === 'magic' && !c.crit && !(c.B.ab(c.user) || {}).infiltrator ? 0.5 : 1 },
    veil: { onSourceModifyDamage: (c) => !c.crit && !(c.B.ab(c.user) || {}).infiltrator ? 0.5 : 1 },
    tailwind: { onModifySpe: () => 2 },
  };
  const H_WEATHER_STAT = { onModifyRes: (c) => { const w = c.B.weatherId(), W = w && KP.WEATHERS[w]; if (!W || !W.stat) return 1; let m = 1; for (const t of types(c.holder.mon)) if (W.stat[t] && W.stat[t].res) m *= W.stat[t].res; return m; },
    onModifyDef: (c) => { const w = c.B.weatherId(), W = w && KP.WEATHERS[w]; if (!W || !W.stat) return 1; let m = 1; for (const t of types(c.holder.mon)) if (W.stat[t] && W.stat[t].def) m *= W.stat[t].def; return m; } };

  // ------------------------------------------------------------------ the battle scene
  class Battle {
    constructor(o, w) {
      this.o = Object.assign({ kind: 'wild', bg: 'grass' }, o); this.w = w;
      this.area = this.o.area || (FF7.fieldScene && FF7.fieldScene.map ? KP.areaOf(FF7.fieldScene.map.id) : '');   // (Hard Mode: one befriend per area)
      if (this.o.kind !== 'wild') this.o.noBag = true;   // (the user's rule: no bag items in any trainer battle; wild ones still allow them)
      this.d = o.spectate ? { party: o.spectate.mons, bag: {}, money: 0, dex: FF7.state.kp.dex } : FF7.state.kp;
      this.foes = o.foes || [];
      this.t = 0; this.text = null; this.ui = null; this.choice = null;
      this.cd = {};                                   // cooldowns by moogle uid: { move: turns }
      this.fought = {};                               // foe uid -> my uids that faced it (the experience is shared)
      this.leveled = new Set(); this.nut = null; this.result = null;
      this.healUses = {};                             // moogle uid -> heals used (counted only: every heal is the move's full 50%)
      // the field (kp_mech.js): the weather, the terrain, the zones; each side's conditions and hazards
      this.wx = null; this.terrain = null; this.rooms = {};
      this.sides = { me: { cond: {}, haz: {} }, foe: { cond: {}, haz: {} } };
      this.fainted = { me: 0, foe: 0 };
      this.held0 = new Map(this.d.party.concat(this.foes).map(m => [m, m.held]));   // (items knocked off or swapped come back after)
      this.cam = new MG.Cam();
      this.co = new FF7.Coroutine(this.flow(), { name: 'kp-battle' });
      this.noClock = false;
      if (FF7.fx && FF7.fx.clear) FF7.fx.clear();   // (FF7's battle effects, shared: the moves' animations, kp_fx.js)
    }
    enter() { if (!this.o._music) { FF7.audio.push(this.o.music || (this.o.kind === 'wild' ? 'battle' : 'boss')); this.o._music = true; } }

    // ---- small helpers for the flow
    *say(text, frames) {   // a message: OK, or on by itself after a while
      this.text = text; this.textT = 0; this.textAuto = frames || 90;
      while (this.text) yield;
    }
    ask(ui) { this.choice = { done: false, result: null }; this.ui = Object.assign({ idx: 0 }, ui); return this.choice; }
    // ---- Auto (the user, 2026-10-04: "highest AI intelligence and optimization, World Championship level"): the
    // player's side played by the tournament mind, the look ahead (KP.tactics.choose) and its switching (maxSwitch,
    // bestNext); the 'auto' button turns it on and off in any battle of yours and it stays as left (d.autoBattle). A
    // menu open when it's turned on gives way at once ('auto'). Befriending stays yours: the nuts, and running
    autoOn() { return !this.o.spectate && !!(this.d && this.d.autoBattle); }
    toggleAuto() {
      this.d.autoBattle = !this.d.autoBattle; sfx(this.d.autoBattle ? 'confirm' : 'cancel');
      this.autoPop = { t: 0, on: this.d.autoBattle };
      if (this.d.autoBattle && this.ui && ['command', 'moves', 'party', 'bag', 'preview'].includes(this.ui.kind)) { this.textHold = false; this.answer('auto'); }
    }
    aiCommand() {
      if (this.me.vol.berserk) return { kind: 'move', move: this.strongest(this.me) };
      const sw = KP.tactics && KP.tactics.maxSwitch && this.canSwitch(this.me) ? KP.tactics.maxSwitch(this, this.me, this.foe, this.d.party) : null;
      if (sw) return { kind: 'switch', mon: sw };
      const ids = this.me.mon.moves.filter(id => this.usable(this.me, id));
      return { kind: 'move', move: !ids.length ? 'flail' : KP.tactics ? KP.tactics.choose(this, this.me, this.foe) : ids[0] };
    }
    aiNext(L, t) { return KP.tactics && KP.tactics.bestNext && t ? KP.tactics.bestNext(L, t) : L[0]; }
    answer(v) { this.ui = null; if (this.choice) { this.choice.result = v; this.choice.done = true; } }
    cds(mon) { return this.cd[mon.uid] || (this.cd[mon.uid] = {}); }
    fighter(mon, side) { return new Fighter(mon, side, this); }
    nm(f) { return this.prefix(f.side) + f.name; }
    foeOf(f) { return f === this.me ? this.foe : this.me; }
    sideOf(f) { return f ? f.side : 'foe'; }
    // its ability now (kp_learn.js KP.abilityOf; a Traced one; none while suppressed)
    ab(f) {
      if (!f || !f.mon) return null;
      if (f.vol && f.vol.suppressed) return null;
      if (f.abOverride && KP.ABILITIES[f.abOverride]) return Object.assign({ id: f.abOverride }, KP.ABILITIES[f.abOverride]);
      return KP.abilityOf ? KP.abilityOf(f.mon) : null;
    }
    // its held item now (none in a Null Zone; Mega-style keys aside)
    heldOf(f) { if (!f || !f.mon || !f.mon.held) return null; if (this.rooms && this.rooms.nullzone) return null; return f.mon.held; }
    itemOf(f) { const id = this.heldOf(f); return id ? Object.assign({ id }, KP.ITEMS[id]) : null; }
    weatherId() {
      if (!this.wx) return null;
      for (const f of [this.me, this.foe]) { const a = f && !f.gone ? this.ab(f) : null; if (a && a.cloudNine) return null; }
      return this.wx.id;
    }
    fieldIs(id) { return this.weatherId() === id || (!!this.terrain && this.terrain.id === id) || !!(this.rooms && this.rooms[id]); }
    // the weather's multiplier on a move of this type (an Umbrella on either side: none)
    weatherMul(type, f, t) {
      const w = this.weatherId(), W = w && KP.WEATHERS[w]; if (!W || !W.mul || !type) return 1;
      if ((w === 'radiance' || w === 'gloom') && [f, t].some(x => x && (KP.ITEMS[this.heldOf(x)] || {}).umbrella)) return 1;
      return W.mul[type] || 1;
    }
    speed(f) { return KP.speedOf(this, f); }
    // the field's and its side's handlers on a fighter (kp_calc.js KP.handlersOf)
    extraHandlers(f) {
      const L = [];
      if (this.wx) L.push(H_WEATHER_STAT);
      if (this.terrain) L.push(terrainH(this.terrain.id));
      const s = this.sides[f.side]; if (s) for (const k in s.cond) if (H_SIDE[k]) L.push(H_SIDE[k]);
      return L;
    }
    // can it be switched out (or run): a bind, a block, a trapping ability on the other side; a Shed Shell or a
    // Summoner (a spirit slips any hold) always can
    canSwitch(f) {
      if (!f) return true;
      const it = KP.ITEMS[this.heldOf(f)] || {};
      if (it.shedShell || types(f.mon).includes('summoner')) return true;
      if (f.vol.bound || (f.vol.block && f.vol.block === this.foeOf(f) && !this.foeOf(f).gone)) return false;
      const o = this.foeOf(f), oa = o && !o.gone ? this.ab(o) : null, fa = this.ab(f);
      if (oa && oa.trapFoes && !(fa && fa.trapFoes) && (oa.trapFoes !== 'grounded' || KP.grounded(this, f))) return false;
      return true;
    }
    // what it must do this turn, chosen or not: a charging move's second turn, a rampage, a recharge
    forcedMove(f) {
      if (!f) return null;
      if (f.vol.recharge) return f.lastMove || 'flail';
      if (f.vol.charging) return f.vol.charging;
      if (f.vol.rampage && f.vol.rampage.left > 0) return f.vol.rampage.id;
      return null;
    }
    planOf(f) { return (this.turnActs || []).find(a => a.f === f) || null; }
    // a move's damage on t (o.crit; o.rand 0-15, the middle roll if not given): Showdown's formula (kp_calc.js); an
    // ability's immunity (its type list, the move's flags), none
    damageOf(f, t, mv, o = {}) {
      if (!mv || !t) return 0;
      const tab = this.ab(t);
      if (tab && this._breaking !== t) {
        const mt = KP.moveType(this, f, mv);
        if (tab.immune && mt && tab.immune.includes(mt)) return 0;
        if (tab.flagImmune && tab.flagImmune.some(fl => KP.hasFlag(mv, fl))) return 0;
      }
      return KP.damage(this, f, t, mv, o);
    }
    // the AI's estimate of a whole move: every hit of a multi-hit move, the middle roll unless asked
    estimate(f, t, mv, o = {}) {
      if (!mv || !mv.power && !mv.powerBy && mv.fixed == null && !mv.ohko && !mv.counter) return 0;
      if (mv.ohko) return KP.accuracyOf(this, f, t, mv) > 0 ? t.mon.hp : 0;
      if (mv.charge && !(mv.charge.skipIn && this.fieldIs(mv.charge.skipIn))) return this.damageOf(f, t, mv, o) * 0.5;
      return this.damageOf(f, t, mv, o) * KP.expectedHits(this, f, mv) * (mv.recharge ? 0.6 : 1);
    }
    // an ability doing its thing: its name on a banner by the moogle's box (as Pokemon shows it)
    abilityPop(f, ab) { if (f && ab) f.abPop = { text: ab.name, t: 90 }; }
    // a Counter's blow (the ability's counterHit, its power): no type, physical or magic by the holder's stronger of
    // Attack and Magic as they stand now (stages, items), against the attacker's Defense or Resistance; the battle's own
    // damage formula. Not a move: nothing answers it in turn (two Counters don't trade blows forever)
    *counterBlow(t, f, tab) {
      const mv = KP.counterMove(t, tab.counterHit);
      this.abilityPop(t, tab);
      yield* this.say(`${this.nm(t)} counters!`, 40);
      try { yield* this.playFx(t, f, KP.fxFor ? KP.fxFor(mv, 'counter') : null, false); } catch (e) { }
      const dmg = this.damageOf(t, f, mv, { rand: rand16(), real: true });
      if (dmg > 0) yield* this.hurt(f, dmg, { direct: true, from: t, mv });
    }
    // whose moogle: "The wild ", "The foe's ", ours unnamed; watching a bout, each trainer's
    prefix(side) {
      const o = this.o;
      if (o.spectate) return (side === 'foe' ? o.trainer.name : o.spectate.name) + "'s ";
      return side === 'foe' ? (o.kind === 'wild' ? 'The wild ' : "The foe's ") : '';
    }
    // a healing move's share of max HP: always its own (every one 50%, the user's rule; the worn-out rule from turn
    // 80, KP.WEAR_TURN, is what keeps two healers from going on for ever)
    healFrac(mon, mv) { return mv.heal; }
    usable(f, id) {
      const mv = moveOf(id); if (!mv) return false;
      if ((this.cds(f.mon)[id] || 0) > 0) return false;
      if (f.mon.status === 'silence' && KP.MAGIC[mv.type]) return false;
      const status = KP.category(mv) === 'status';
      if (status && (f.vol.taunt || (KP.ITEMS[this.heldOf(f)] || {}).vest)) return false;   // (a Taunt; an Assault Vest's kind)
      if (f.lock && f.lock !== id && f.mon.moves.includes(f.lock) && ((KP.ITEMS[this.heldOf(f)] || {}).choice || (this.ab(f) || {}).gorillaTactics)) return false;
      const en = f.vol && f.vol.encore;   // (an Encore: only its move, while that one's ready)
      if (en && en.id !== id && f.mon.moves.includes(en.id) && !((this.cds(f.mon)[en.id] || 0) > 0)) return false;
      return true;
    }
    alive(side) { return side === 'me' ? KP.alive(this.d.party) : KP.alive(this.foes); }

    // ---- the battle's events: every handler of a fighter for one (generators: they may say things), in turn; a
    // handler that returns false stops the rest and the event answers false
    *fire(event, f, c = {}) {
      if (!f || !f.mon) return undefined;
      let ret;
      for (const h of KP.handlersOf(f)) {
        const fn = h[event]; if (!fn) continue;
        const r = fn.call(h, Object.assign({ B: this, holder: f }, c));
        const v = r && typeof r.next === 'function' ? yield* r : r;
        if (v === false) return false;
        if (v !== undefined) ret = v;
      }
      return ret;
    }
    // stat stages changing (a move's, an ability's, an item's): Contrary turns them round, Simple doubles them; from a
    // foe they may be blocked (Mist, a Clear Body's kind, a Clear Amulet), bounced (Mirror Armor) or answered (Defiant)
    *boost(f, boosts, src, o = {}) {
      if (!f || f.mon.hp <= 0 || !boosts) return false;
      const fa = this.ab(f), fromFoe = o.fromFoe || (src && src !== f);
      let changed = false;
      const drops = Object.keys(boosts).filter(k => boosts[k] < 0);
      if (fromFoe && drops.length) {
        const it = KP.ITEMS[this.heldOf(f)] || {};
        const mist = this.sides[f.side].cond.mist && !(src && (this.ab(src) || {}).infiltrator);
        if (mist || (fa && fa.noStatDrop && this._breaking !== f) || it.clearAmulet) {
          if (!o.silent) { if (fa && fa.noStatDrop && !mist) this.abilityPop(f, fa); yield* this.say(`${this.nm(f)}'s stats won't be lowered!`, 40); }
          boosts = Object.assign({}, boosts); drops.forEach(k => delete boosts[k]);
        } else if (fa && fa.mirrorStats && src && src !== f && !o.mirrored) {
          this.abilityPop(f, fa);
          const back = {}; drops.forEach(k => { back[k] = boosts[k]; });
          boosts = Object.assign({}, boosts); drops.forEach(k => delete boosts[k]);
          yield* this.boost(src, back, f, { fromFoe: true, mirrored: true });
        }
      }
      for (const k of Object.keys(boosts)) {
        let n = boosts[k]; if (!n) continue;
        if (fa && fa.contrary) n = -n;
        if (fa && fa.simple) n *= 2;
        const before = f.st[k] || 0; f.st[k] = clampStage(k, before + n);
        const nm = this.nm(f) + "'s " + STAT_NAMES[k];
        if (o.ab) this.abilityPop(src || f, o.ab);
        if (f.st[k] === before) { if (!o.silent) yield* this.say(`${nm} won't go any ${n > 0 ? 'higher' : 'lower'}!`, 40); continue; }
        changed = true;
        const d = f.st[k] - before;
        this.statFx(f, k, d);
        if (!o.silent) yield* this.say(o.ab ? `${this.nm(src || f)}'s ${o.ab.name}: ${nm} ${d > 0 ? 'rose' : 'fell'}!` : `${nm} ${d > 0 ? (d > 2 ? 'rose drastically' : d > 1 ? 'rose sharply' : 'rose') : (d < -2 ? 'severely fell' : d < -1 ? 'harshly fell' : 'fell')}!`, 40);
        // lowered by a foe: Defiant's kind raises another; a White Herb puts it back
        if (d < 0 && fromFoe && fa && fa.defiant && f.mon.hp > 0) { this.abilityPop(f, fa); yield* this.boost(f, { [fa.defiant === true ? 'atk' : fa.defiant]: 2 }, f); }
      }
      if (changed && fromFoe && f.mon.hp > 0) {
        const it = KP.ITEMS[this.heldOf(f)] || {};
        if (it.whiteHerb && Object.keys(f.st).some(k => f.st[k] < 0)) {
          for (const k of Object.keys(f.st)) if (f.st[k] < 0) f.st[k] = 0;
          yield* this.consume(f, `${this.nm(f)} returned its stats to normal using its ${it.name}!`);
        }
      }
      return changed;
    }
    // indirect damage, a share of max HP (weather, poison, hazards, recoil from items, a curse): none with Magic Guard
    *chip(f, frac, text) {
      if (!f || f.mon.hp <= 0) return 0;
      const fa = this.ab(f); if (fa && fa.magicGuard) return 0;
      if (text) yield* this.say(text, 30);
      return yield* this.hurt(f, Math.max(1, Math.floor(KP.maxHp(f.mon) * frac)));
    }
    // healing (a share of max HP under 1, else HP): a Zombie is hurt by it instead
    *heal(f, amt, text) {
      if (!f || f.mon.hp <= 0) return 0;
      const max = KP.maxHp(f.mon), n = Math.max(1, amt < 1 ? Math.floor(max * amt) : Math.floor(amt));
      if (f.mon.status === 'zombie') { yield* this.say(`${this.nm(f)} is a zombie: the healing hurts it!`, 40); return -(yield* this.hurt(f, n)); }
      if (f.mon.hp >= max) return 0;
      const before = f.mon.hp; f.mon.hp = Math.min(max, f.mon.hp + n); sfx('heal');
      if (text) yield* this.say(text, 35);
      return f.mon.hp - before;
    }
    *cureStatus(f, text) { if (!f.mon.status) return; f.mon.status = null; f.venomN = 0; sfx('heal'); if (text) yield* this.say(text, 40); }
    // its held item used up (a berry eaten, a sash torn): gone for good (Unburden's kind notices)
    *consume(f, text) { const id = f.mon.held; if (!id) return; f.mon.held = null; f.lostItem = id; if (text) yield* this.say(text, 45); }
    // the field
    *setWeather(id, src, o = {}) {
      const W = KP.WEATHERS[id]; if (!W) return false;
      if (this.wx && this.wx.id === id) { if (!o.ability && !o.quiet) yield* this.say('But it failed!', 35); return false; }
      if (this.wx && this.wx.extreme && !o.extreme) { yield* this.say('The weather is too strong to change!', 40); return false; }
      const it = src ? KP.ITEMS[this.heldOf(src)] || {} : {};
      const sa = src ? this.ab(src) : null;
      this.wx = { id, turns: o.extreme || (sa && sa.extreme && o.ability) ? 0 : (it.extend === id || it.extend === 'weather' ? 8 : 5), src, extreme: !!(o.extreme || (sa && sa.extreme && o.ability)) };
      if (o.ability && sa) this.abilityPop(src, sa);
      sfx('magic'); yield* this.say(W.start, 55);
      return true;
    }
    *setTerrain(id, src, o = {}) {
      const T = KP.TERRAINS[id]; if (!T) return false;
      if (this.terrain && this.terrain.id === id) { if (!o.ability && !o.quiet) yield* this.say('But it failed!', 35); return false; }
      const it = src ? KP.ITEMS[this.heldOf(src)] || {} : {};
      this.terrain = { id, turns: it.extend === id || it.extend === 'terrain' ? 8 : 5 };
      if (o.ability && src) this.abilityPop(src, this.ab(src));
      sfx('magic'); yield* this.say(T.start, 55);
      // a seed for this terrain (Electric Seed's kind) on either side
      for (const f of [this.me, this.foe]) {
        const fi = f && !f.gone ? KP.ITEMS[this.heldOf(f)] || {} : {};
        if (fi.terrainBoost && fi.terrainBoost[id] && f.mon.hp > 0) { yield* this.boost(f, fi.terrainBoost[id], f); yield* this.consume(f, `${this.nm(f)} used up its ${fi.name}.`); }
      }
      return true;
    }
    *setRoom(id, src, o = {}) {
      const Z = KP.ROOMS[id]; if (!Z) return false;
      if (this.rooms[id]) { delete this.rooms[id]; yield* this.say(Z.end, 45); return true; }
      this.rooms[id] = 5;
      if (o.ability && src) this.abilityPop(src, this.ab(src));
      sfx('magic'); yield* this.say(`${src ? this.nm(src) : 'Something'} ${Z.start}`, 55);
      if (id === 'gravity') for (const f of [this.me, this.foe]) if (f && f.vol.float) { f.vol.float = 0; yield* this.say(`${this.nm(f)} came crashing down!`, 40); }
      if (id === 'timewarp') for (const f of [this.me, this.foe]) { const fi = f && !f.gone ? KP.ITEMS[this.heldOf(f)] || {} : {}; if (fi.roomService && f.mon.hp > 0) { yield* this.boost(f, { spd: -1 }, f); yield* this.consume(f, `${this.nm(f)} used up its ${fi.name}.`); } }
      return true;
    }
    *setSide(side, id, src, o = {}) {
      const S = KP.SIDE_CONDS[id]; if (!S) return false;
      const cond = this.sides[side].cond;
      if (cond[id] || (S.needs && !this.fieldIs(S.needs))) { if (!o.quiet) yield* this.say('But it failed!', 35); return false; }
      const it = src ? KP.ITEMS[this.heldOf(src)] || {} : {};
      cond[id] = (it.extend === 'walls' && S.cat) ? 8 : S.turns;
      sfx('magic'); yield* this.say(S.start.replace('{side}', nameOfSide(side, this.o)), 50);
      return true;
    }
    *addHazard(side, id, src, o = {}) {
      const Z = KP.HAZARDS[id]; if (!Z) return false;
      const haz = this.sides[side].haz;
      if ((haz[id] || 0) >= Z.max) { if (!o.quiet) yield* this.say('But it failed!', 35); return false; }
      haz[id] = (haz[id] || 0) + 1;
      sfx('cast'); yield* this.say(Z.start.replace('{side}', nameOfSide(side, this.o)), 50);
      return true;
    }
    // the hazards on its side as it comes in (Heavy-Duty Boots' kind: none)
    *entryHazards(f) {
      const haz = this.sides[f.side].haz; if (!Object.keys(haz).length || f.mon.hp <= 0) return;
      if ((KP.ITEMS[this.heldOf(f)] || {}).boots) return;
      const nm = this.nm(f), gr = KP.grounded(this, f);
      if (haz.mines) { const e = KP.effAgainst(this, null, f, KP.HAZARDS.mines.type); if (e > 0) yield* this.chip(f, KP.HAZARDS.mines.dmg[0] * e, `${nm} set off a buried landmine!`); }
      if (haz.caltrops && gr && f.mon.hp > 0) yield* this.chip(f, KP.HAZARDS.caltrops.dmg[Math.min(3, haz.caltrops) - 1], `${nm} is hurt by the caltrops!`);
      if (haz.venom_spikes && gr && f.mon.hp > 0 && !f.mon.status) yield* this.inflict(f, haz.venom_spikes >= 2 ? 'venom' : 'poison', 100, null, { quiet: true });
      if (haz.web && gr && f.mon.hp > 0) { yield* this.say(`${nm} was caught in a sticky web!`, 40); yield* this.boost(f, { spd: -1 }, null, { fromFoe: true }); }
    }

    // ---- the flow of the battle
    *flow() {
      const o = this.o;
      // (a tournament battle: team preview first, both leads chosen there: kp_preview.js)
      if (o.preview && this.teamPreview) yield* this.teamPreview();
      // the opening, from black: both sides slide in, Cloud on our pad, on theirs the trainer (or the wild moogle itself)
      this.foe = this.fighter(this.leadFoe && this.leadFoe.hp > 0 ? this.leadFoe : this.foes.find(m => m.hp > 0), 'foe');
      KP.dexSee(this.foe.mon.sp);
      this.cloud = person(o.spectate ? o.spectate.model || 'cloud' : 'cloud');
      this.trainerM = o.kind === 'trainer' && o.trainer && o.trainer.model ? person(o.trainer.model) : null;
      this.foe.grow = o.kind === 'wild' || !this.trainerM ? 1 : 0;
      for (let i = 0; i <= 44; i++) { this.open = i / 44; yield; }
      if (o.kind === 'wild') {
        yield* this.say(`A wild ${this.foe.name} appeared!`);
        if (!o.spectate && KP.hardRules && KP.hardRules() && KP.areaUsed(this.area)) yield* this.say(`(Hard Mode: you've befriended ${this.d.nuz[this.area].name || 'a moogle'} in ${this.area} already.)`, 60);
      } else {
        yield* this.say(o.spectate ? `${o.spectate.name} vs. ${o.trainer.name}!` : `${o.trainer.name} wants to battle!`);
        if (this.trainerM) {   // the trainer steps off their pad and sends theirs out
          for (let i = 0; i <= 16; i++) { this.trainerOut = ease(i / 16); yield; }
          yield* this.sendOut(this.foe, `${o.trainer.name} sent out ${this.foe.name}!`);
        } else yield* this.say(`${o.trainer.name} sent out ${this.foe.name}!`);
      }
      // Cloud steps back, and sends ours out
      this.me = this.fighter(this.leadMe && this.leadMe.hp > 0 ? this.leadMe : this.alive('me')[0], 'me');
      for (let i = 0; i <= 14; i++) { this.cloudOut = ease(i / 14); yield; }
      yield* this.sendOut(this.me, o.spectate ? `${o.spectate.name} sent out ${KP.name(this.me.mon)}!` : `Go! ${KP.name(this.me.mon)}!`);
      // both out: their abilities, the faster first (Showdown's switch-in order)
      const first = this.speed(this.me) >= this.speed(this.foe) ? [this.me, this.foe] : [this.foe, this.me];
      for (const f of first) yield* this.onEnter(f);
      for (;;) {
        this.turn = (this.turn || 0) + 1;
        for (const f of [this.me, this.foe]) { f.movedThisTurn = false; f.hitThisTurn = null; }
        // what to do
        let act = yield* this.command();
        if (act.kind === 'run') {
          if (yield* this.tryRun()) return yield* this.finish('run');
          act = null;
        }
        if (act && act.kind === 'item' && act.caught) return yield* this.finish('caught');
        // the foe's choice, then the order: switches and items first, then moves by priority and Speed (Time Warp: the
        // slower first); a Quick Gear's kind: first in its bracket, now and then
        const acts = [];
        if (act) acts.push(Object.assign({ f: this.me }, act));
        const forcedFoe = this.forcedMove(this.foe);
        const fsw = !forcedFoe && this.o.ai === 'max' && this.o.kind === 'trainer' && KP.tactics && KP.tactics.maxSwitch && this.canSwitch(this.foe) ? KP.tactics.maxSwitch(this, this.foe, this.me, this.foes) : null;
        acts.push(fsw ? { f: this.foe, kind: 'switch', mon: fsw } : { f: this.foe, kind: 'move', move: forcedFoe || this.foeChoose() });
        const quick = (a) => { const q = (KP.ITEMS[this.heldOf(a.f)] || {}).quickChance; return q && Math.random() * 100 < q ? 0.2 : 0; };
        acts.forEach(a => { a.rank = a.kind !== 'move' ? 99 : KP.priorityOf(this, a.f, moveOf(a.move) || {}) + quick(a); a.spe = this.speed(a.f); });
        const warp = this.rooms.timewarp ? -1 : 1;
        acts.sort((a, b) => b.rank - a.rank || warp * (b.spe - a.spe) || Math.random() - 0.5);
        this.turnActs = acts;
        for (const a of acts) {
          if (a.f !== this.me && a.f !== this.foe) continue;
          if (a.f.mon.hp <= 0) continue;
          if (a.kind === 'switch') yield* this.switchTo(a.mon, a.f === this.foe ? 'foe' : 'me');
          else if (a.kind === 'item') yield* this.useItem(a);
          else { yield* this.useMove(a.f, a.move, a.f === this.me ? this.foe : this.me); a.f.movedThisTurn = true; }
          const end = yield* this.faints(); if (end) return yield* this.finish(end);
        }
        yield* this.endOfTurn();
        const end = yield* this.faints(); if (end) return yield* this.finish(end);
      }
    }

    // ---- the player's command (the menus answer through this.choice)
    *command() {
      const forced = this.forcedMove(this.me);
      if (forced) return { kind: 'move', move: forced };
      if (this.o.spectate) {   // (a bout between two others: their AI, the same mind as the dojo masters')
        if (this.me.vol.berserk) return { kind: 'move', move: this.strongest(this.me) };
        const sw = this.o.ai === 'max' && KP.tactics && KP.tactics.maxSwitch && this.canSwitch(this.me) ? KP.tactics.maxSwitch(this, this.me, this.foe, this.d.party) : null;
        if (sw) return { kind: 'switch', mon: sw };
        const ids = this.me.mon.moves.filter(id => this.usable(this.me, id));
        return { kind: 'move', move: !ids.length ? 'flail' : KP.tactics ? KP.tactics.choose(this, this.me, this.foe) : ids[0] };
      }
      for (;;) {
        const name = this.me.name;
        if (this.autoOn()) return this.aiCommand();   // (Auto: the tournament mind chooses)
        // Berserk: no choice, the strongest attack
        if (this.me.vol.berserk) { yield* this.say(`${name} is berserk!`, 40); return { kind: 'move', move: this.strongest(this.me) }; }
        this.text = `What will ${name} do?`; this.textHold = true;
        const c = yield this.ask({ kind: 'command' });
        this.textHold = false; this.text = null;
        if (c === 'auto') continue;
        if (c === 'fight') {
          const usable = this.me.mon.moves.filter(id => this.usable(this.me, id));
          if (!usable.length) { yield* this.say(`${name} has nothing it can use!`, 50); return { kind: 'move', move: 'flail' }; }
          const m = yield this.ask({ kind: 'moves' });
          if (m === 'auto') continue;
          if (m) return { kind: 'move', move: m };
        } else if (c === 'moogles') {
          if (!this.canSwitch(this.me)) { yield* this.say(`${name} can't escape!`, 50); continue; }
          const p = yield this.ask({ kind: 'party' });
          if (p === 'auto') continue;
          if (p) return { kind: 'switch', mon: p };
        } else if (c === 'bag') {
          if (this.o.noBag) { yield* this.say(this.o.kind !== 'wild' ? "Bag items can't be used in a trainer battle!" : 'Bag items are not allowed here!', 60); continue; }
          const it = yield this.ask({ kind: 'bag' });
          if (it === 'auto') continue;
          if (it) { const r = yield* this.bagItem(it); if (r) return r; }
        } else if (c === 'run') {
          if (this.o.kind !== 'wild') { yield* this.say("There's no running from a trainer battle!", 60); continue; }
          if (!this.canSwitch(this.me) && !(this.ab(this.me) || {}).runAway) { yield* this.say(`${name} can't escape!`, 50); continue; }
          return { kind: 'run' };
        }
      }
    }
    // a bag item: a Kupo Nut (tossed now), or heal / revive / cure on a moogle of the team
    *bagItem(id) {
      const def = KP.ITEMS[id];
      if (def.kind === 'nut') {
        if (this.o.kind !== 'wild') { yield* this.say("A trainer's moogle won't take food from strangers!", 60); return null; }
        yield* this.say("It's far too wound up to eat! Power it down first, then toss it a nut.", 80);
        return null;
      }
      const tgt = yield this.ask({ kind: 'party', item: id });
      if (!tgt) return null;
      return { kind: 'item', id, target: tgt };
    }
    *useItem(a) {
      if (a.done) return;
      const def = KP.ITEMS[a.id], mon = a.target, name = KP.name(mon);
      if (def.kind === 'heal') {
        if (mon.hp <= 0 || mon.hp >= KP.maxHp(mon)) { yield* this.say('It won\'t have any effect.', 50); return; }
        KP.take(a.id); const before = mon.hp; mon.hp = Math.min(KP.maxHp(mon), mon.hp + def.heal);
        sfx('heal'); yield* this.say(`${name} recovered ${mon.hp - before} HP!`, 60);
      } else if (def.kind === 'revive') {
        if (mon.hp > 0) { yield* this.say('It won\'t have any effect.', 50); return; }
        KP.take(a.id); mon.hp = Math.max(1, Math.floor(KP.maxHp(mon) * def.heal)); mon.status = null;
        sfx('heal'); yield* this.say(`${name} powered back up!`, 60);
      } else if (def.kind === 'cure') {
        if (!mon.status) { yield* this.say('It won\'t have any effect.', 50); return; }
        KP.take(a.id); mon.status = null; sfx('heal'); yield* this.say(`${name} is all better!`, 60);
      }
    }

    // ---- a Kupo Nut, tossed to a wild moogle: it catches it, eats it and thinks it over (three beats, the dots in its
    // thought bubble); if it likes the taste, it decides to come along. A worn-out moogle is a hungry one: the weaker
    // (and the sleepier) it is, the likelier; a Golden Kupo Nut is twice as tasty
    *feedNut(def) {
      const f = this.foe, mon = f.mon, max = KP.maxHp(mon), id = Object.keys(KP.ITEMS).find(k => KP.ITEMS[k] === def);
      const p = KP.nutChance(this, mon, id);
      // Cloud steps up beside ours, winds up and tosses it: the nut spins over in an arc, into its paws
      const cn0 = FF7.state.chars.cloud && FF7.state.chars.cloud.name, cn = cn0 && cn0 !== 'Ex-SOLDIER' ? cn0 : 'Cloud';
      this.text = `${cn} tossed a ${def.name}!`; this.textHold = true;
      const c = this.cloud;
      for (let i = 1; i <= 14; i++) { const k = ease(i / 14); this.cloudOut = 1 - 0.7 * k; this.cloudZ = -0.55 * k; yield; }   // (beside ours, a step back)
      if (c) { c.clips = Object.assign(c.clips || {}, { kp_throw: THROW }); c.play('kp_throw', { restart: true }); }
      yield 12;
      const from = [POS.me[0] - 2.6 * this.cloudOut + 0.2, 1.0, POS.me[2] + this.cloudZ];
      this.nut = { t: 0, gold: def.nut > 1, from };
      sfx('jump');
      for (let i = 0; i < 30; i++) {
        this.nut.t = i / 29;
        if (i > 22) { this.cloudOut = Math.min(1, this.cloudOut + 0.09); this.cloudZ *= 0.85; }
        if (c && i === 16) c.play(c.anims && c.anims.idle || 'idle');
        yield;
      }
      this.cloudOut = 1; this.cloudZ = 0; this.textHold = false; this.text = null;
      this.nut = null; f.chew = 1;
      for (let i = 0; i <= 10; i++) { f.down = 1 - 0.8 * ease(i / 10); yield; }   // (it perks up for a nut)
      yield* this.say(`${f.name} caught it! Munch, munch...`, 50);
      // thinking it over: each beat has to go its way
      const each = Math.pow(p, 1 / 3); let liked = 0;
      f.think = { dots: 0 };
      for (let k = 0; k < 3; k++) {
        yield 20; f.think.dots = k + 1; sfx('cursor');
        for (let i = 0; i < 18; i++) { f.sway = Math.sin(i / 18 * PI * 2) * 0.12; yield; }
        f.sway = 0;
        if (Math.random() > each) break;
        liked++;
      }
      f.chew = 0; f.think = null;
      if (liked < 3) {
        sfx('error'); f.think = { mark: '×' }; yield 30; f.think = null;
        for (let i = 0; i <= 10; i++) { f.down = 0.2 + 0.8 * ease(i / 10); yield; }
        yield* this.say([`${f.name} spat it out! It didn't like that at all.`, `${f.name} made a face... It wasn't impressed.`, `So close! ${f.name} liked it... but not enough to come along.`][Math.min(2, liked)], 70);
        return false;
      }
      sfx('ching'); f.think = { mark: '!' };
      for (let i = 0; i < 14; i++) { f.dy = Math.sin(i / 14 * PI) * 0.18; yield; }
      f.dy = 0; f.down = 0; f.think = { mark: '♥' }; yield 20; f.think = null;
      mon.hp = Math.max(1, Math.floor(max / 4));   // (the nut perked it back up a little: awake again, if it was asleep or Stopped)
      if (mon.status === 'sleep' || mon.status === 'stop') mon.status = null;
      if (def.after === 'heal') { mon.hp = max; mon.status = null; }
      if (def.after === 'plus') mon.plus = Math.min(5, (mon.plus || 0) + 1);
      yield* this.say(`${f.name} loved it! It perked right up... ${f.name} wants to come with you!`, 80);
      if (mon.held) yield* this.say(`It brought along a ${KP.ITEMS[mon.held].name}.`, 50);
      mon.status = mon.status && KP.STATUS[mon.status].lasting ? mon.status : null;
      const where = KP.receive(mon);
      if (where === 'box') yield* this.say(`Your team is full, so ${f.name} went to wait in the Mog Box.`, 70);
      return true;
    }

    // ---- befriending (wild only): a wild moogle you've powered down can be offered Kupo Nuts, three tries at most (a
    // legendary or a mythical ten: KP.befriendTries). It keeps any lasting ailment it went down with (asleep,
    // poisoned...), and that makes it easier to win over
    *befriend(f) {
      const have = () => NUTS().filter(k => (this.d.bag[k] || 0) > 0);
      if (!have().length) return false;
      if (!this.o.spectate && KP.storageFull && KP.storageFull()) { yield* this.say(KP.STORAGE_FULL_TEXT, 90); return false; }   // (the team and all 50 boxes full: nowhere for it to go)
      if (KP.hardRules() && !this.o.spectate && KP.areaUsed(this.area)) {   // (Hard Mode: this area's one moogle is befriended already)
        const was = this.d.nuz[this.area];
        yield* this.say(`${f.name} looks your way... but you already befriended ${was.name || 'a moogle'} in ${this.area}. (Hard Mode: one per area.)`, 90);
        return false;
      }
      this.befriending = true;
      let won = false;
      const max = KP.befriendTries(f.mon);
      for (let tries = 0; tries < max && !won; tries++) {
        if (!have().length) { yield* this.say("You're out of Kupo Nuts...", 50); break; }
        const left = max - tries;
        this.text = `${f.name} is watching you hungrily... Toss it a nut? (${left} ${left > 1 ? 'tries' : 'try'} left)`; this.textHold = true;
        const c = yield this.ask({ kind: 'nut' });
        this.textHold = false; this.text = null;
        if (!c) break;
        KP.take(c);
        won = yield* this.feedNut(KP.ITEMS[c]);
        if (!won && tries === max - 1) yield* this.say(`${f.name} has had its fill of nuts. It wandered off...`, 60);
      }
      this.befriending = false;
      if (won && KP.hard()) (this.d.nuz = this.d.nuz || {})[this.area] = { sp: f.mon.sp, name: KP.name(f.mon) };
      return won;
    }

    // ---- running away (wild only): faster runs away; otherwise it gets likelier each try
    *tryRun() {
      this.runs = (this.runs || 0) + 1;
      const ok = this.me.stat('spd') >= this.foe.stat('spd') || Math.random() < 0.4 + 0.15 * this.runs;
      if (ok) { sfx('flee'); yield* this.say('Got away safely!', 50); return true; }
      yield* this.say("Can't escape!", 50); return false;
    }

    // ---- sending out / switching
    *sendOut(f, text) {
      f.grow = 0; f.alpha = 1; f.dy = 0; f.outTurn = (this.turn || 0) + 1; f.inTurn = this.turn || 0;
      if (f.side === 'me') this.markFought();
      sfx('ching');
      for (let i = 0; i <= 14; i++) { f.grow = i / 14; yield; }
      if (text) yield* this.say(text, 40);
      if (!this.turn) return;   // (the opening: both abilities once both are out, the faster first: flow)
      yield* this.entryHazards(f);
      yield* this.onEnter(f);
    }
    // coming out: its ability (Intimidate's kind, a weather it brings...), its item's
    *onEnter(f) {
      const other = f && this.foeOf(f);
      if (!f || f.entered || !other || other.gone || !this.me || !this.foe || f.mon.hp <= 0) return;
      f.entered = true;
      const ab = this.ab(f);
      if (ab && ab.onEnter) {
        const [who, kn] = ab.onEnter.foe ? [other, ab.onEnter.foe] : [f, ab.onEnter.self];
        if (kn) {
          const oa = this.ab(other);
          if (who === other && oa && oa.innerFocus) { this.abilityPop(other, oa); yield* this.say(`${this.nm(other)}'s ${oa.name}: it isn't fazed!`, 45); }
          else yield* this.boost(who, { [kn[0]]: kn[1] }, f, { ab, fromFoe: who === other });
        }
      }
      yield* this.fire('onSwitchIn', f, {});
      const it = this.itemOf(f);
      if (it && it.balloon) yield* this.say(`${this.nm(f)} floats in the air with its ${it.name}!`, 40);
      if (it && it.terrainBoost && this.terrain && it.terrainBoost[this.terrain.id]) { yield* this.boost(f, it.terrainBoost[this.terrain.id], f); yield* this.consume(f, `${this.nm(f)} used up its ${it.name}.`); }
    }
    // leaving the field (switched out, or down): its ability's (Regenerator's kind), an extreme weather it held
    *leave(f) {
      if (!f) return;
      if (f.mon.hp > 0) yield* this.fire('onSwitchOut', f, {});
      if (this.wx && this.wx.extreme && this.wx.src === f) { const W = KP.WEATHERS[this.wx.id]; this.wx = null; yield* this.say(W.end, 45); }
    }
    *switchTo(mon, side = 'me', o = {}) {
      const old = side === 'foe' ? this.foe : this.me, tn = this.o.trainer ? this.o.trainer.name : 'The foe';
      if (o.dragged) { /* (dragged out: no words from the trainer) */ }
      else if (side === 'foe') yield* this.say(`${tn} withdrew ${this.foe.name}!`, 30);
      else yield* this.say(this.o.spectate ? `${this.o.spectate.name} withdrew ${this.me.name}!` : `Come back, ${this.me.name}!`, 30);
      yield* this.leave(old);
      for (let i = 0; i <= 10; i++) { old.grow = 1 - i / 10; yield; }
      const nf = this.fighter(mon, side);
      if (o.pass) { nf.st = Object.assign({}, old.st); for (const k of ['decoy', 'focus', 'regen', 'leech', 'curse']) if (old.vol[k]) nf.vol[k] = old.vol[k]; }
      if (side === 'foe') { this.foe = nf; KP.dexSee(mon.sp); } else this.me = nf;
      const text = o.dragged ? `${this.nm(nf)} was dragged out!` : side === 'foe' ? `${tn} sent out ${nf.name}!` : this.o.spectate ? `${this.o.spectate.name} sent out ${KP.name(mon)}!` : `Go! ${KP.name(mon)}!`;
      yield* this.sendOut(nf, text);
      if (side === 'foe') this.markFought();
    }
    // a switch a move or item calls for: its own side picks the one coming in (the player's menu, the AI's best)
    *pickIn(side, out) {
      const team = side === 'me' ? this.d.party : this.foes, L = team.filter(m => m.hp > 0 && m !== out);
      if (!L.length) return null;
      if (side === 'me' && !this.o.spectate) {
        if (this.autoOn()) return this.aiNext(L, this.foe);   // (Auto)
        const p = yield this.ask({ kind: 'party', forced: true, pivot: true });
        return p === 'auto' ? this.aiNext(L, this.foe) : p;
      }
      const t = side === 'me' ? this.foe : this.me;
      return (this.o.ai === 'max' || this.o.spectate) && KP.tactics && KP.tactics.bestNext && t ? KP.tactics.bestNext(L, t) : L[0];
    }
    *pivot(f, o = {}) {   // U-turn's kind: f out, its side's pick in (o.pass: Baton Pass)
      if (!f || f.mon.hp <= 0 || (f !== this.me && f !== this.foe) || (f.side === 'foe' && this.o.kind === 'wild')) return;
      const mon = yield* this.pickIn(f.side, f.mon); if (!mon) return;
      yield* this.switchTo(mon, f.side, o);
    }
    *dragOut(t, src) {   // Roar's kind: t out, one of its side at random in (a wild moogle: it just won't budge)
      if (!t || t.mon.hp <= 0 || (t !== this.me && t !== this.foe)) return false;
      const ta = this.ab(t);
      if (ta && ta.anchor) { this.abilityPop(t, ta); yield* this.say(`${this.nm(t)} anchors itself!`, 40); return false; }
      if (t.side === 'foe' && this.o.kind === 'wild') return false;
      const team = t.side === 'me' ? this.d.party : this.foes, L = team.filter(m => m.hp > 0 && m !== t.mon);
      if (!L.length) return false;
      yield* this.switchTo(L[Math.floor(Math.random() * L.length)], t.side, { dragged: true });
      return true;
    }
    markFought() { if (!this.foe || !this.me) return; const s = this.fought[this.foe.mon.uid] = this.fought[this.foe.mon.uid] || []; if (!s.includes(this.me.mon.uid)) s.push(this.me.mon.uid); }

    // ---- the foe's move (js/kupomon/kp_tactics.js: every AI knows every move, ability, item, field effect and status,
    // the user's rule): the masters, rivals and leagues their best; other trainers their best, now and then the next
    // best; wild moogles any move that would do something
    foeChoose() {
      const f = this.foe, ids = f.mon.moves.filter(id => this.usable(f, id));
      if (f.vol.berserk) return this.strongest(f);
      if (!ids.length) return 'flail';
      if (KP.tactics) {
        if (this.o.ai === 'smart' || this.o.ai === 'max') { const id = KP.tactics.choose(this, f, this.me); if (id) return id; }
        else if (this.o.kind === 'wild') return KP.tactics.wildChoose(this, f, this.me);
        else return KP.tactics.trainerChoose(this, f, this.me);
      }
      if (this.o.kind === 'wild') return U.pick(ids);
      const score = (id) => {
        const mv = moveOf(id);
        if (mv.power) return mv.power * KP.effOn(mv.type, this.me.mon) * (mv.type === KP.typeOf(f.mon) ? 1.5 : 1) * ((mv.acc === true ? 100 : mv.acc || 100) / 100) * (mv.hits ? KP.expectedHits(this, f, mv) : 1);
        if (mv.status) return this.me.mon.status ? 0 : 55;
        if (mv.heal) return f.mon.hp < KP.maxHp(f.mon) * 0.45 ? 90 * this.healFrac(f.mon, mv) / mv.heal : 0;
        if (mv.stat) return (mv.stat[2] === 'self' ? (f.st[mv.stat[0]] < 2 ? 45 : 0) : 35);
        if (mv.self || mv.foe) return 30;
        return 10;
      };
      if (this.o.ai !== 'smart' && this.o.ai !== 'max' && Math.random() < 0.2) return U.pick(ids);   // (the leagues' best always pick their best)
      return ids.slice().sort((a, b) => score(b) - score(a))[0];
    }
    strongest(f) {
      const ids = f.mon.moves.filter(id => this.usable(f, id) && (moveOf(id).power || moveOf(id).powerBy));
      return ids.length ? ids.sort((a, b) => (moveOf(b).power || 60) - (moveOf(a).power || 60))[0] : 'flail';
    }
    // a move's effect (kp_fx.js KP.fxFor): on the target (or the user, for its own buffs), from the user; waits till the
    // moment it lands. light: a quick one (each extra hit of a multi-hit move)
    *playFx(f, t, fx, light) {
      if (!fx || !FF7.fx || !FF7.fx.play) return;
      const at = fx.self || !t ? f : t, name = light ? fx.light : fx.name;
      let n = 0;
      try { n = FF7.fx.play(name, [this.hitPos(at)], { from: this.hitPos(f), scale: FX_SCALE * (fx.scale || 1) }); } catch (e) { return; }
      yield Math.max(2, Math.min(light ? 6 : 26, n || 10));
    }
    hitPos(f) { const p = POS[f.side], s = SIZE[f.side] * ((f.m && f.m.growth) || 1); return [p[0] + (f.dx || 0), 0.42 * s, p[2]]; }
    // a lock broken off (asleep, flinched, missed...): no more charging, no rampage
    endLocks(f) { f.vol.charging = null; f.vol.invuln = null; if (f.vol.rampage) f.vol.rampage = null; }

    // ---- using a move (docs/KUPOMON_MECHANICS.md: every key a move can have)
    *useMove(f, id, t) {
      const mon = f.mon, name = this.nm(f), ab = this.ab(f);
      if (f.vol.destiny) f.vol.destiny = false;   // (Destiny lasts until its next move)
      // a recharge turn (Hyper Beam's kind)
      if (f.vol.recharge) { f.vol.recharge = 0; yield* this.say(`${name} must recharge!`, 40); return; }
      // lasting statuses that stop it acting
      if (mon.status === 'sleep') {
        if (--mon.statusT <= 0) { mon.status = null; yield* this.say(`${name} woke up!`, 40); }
        else { yield* this.say(`${name} is fast asleep.`, 45); this.endLocks(f); return; }
      }
      if (mon.status === 'stop') {
        if (--mon.statusT <= 0) { mon.status = null; yield* this.say(`${name} can move again!`, 40); }
        else { yield* this.say(`${name} is frozen in time!`, 45); this.endLocks(f); return; }
      }
      if (f.vol.flinch) {
        f.vol.flinch = false; this.endLocks(f);
        yield* this.say(`${name} flinched and couldn't move!`, 40);
        if (ab && ab.steadfast) yield* this.boost(f, { spd: 1 }, f, { ab });
        return;
      }
      if (ab && ab.truant && f.loafing) { f.loafing = false; this.abilityPop(f, ab); yield* this.say(`${name} is loafing around!`, 40); return; }
      if (mon.status === 'slow' && Math.random() < 0.25) { this.endLocks(f); yield* this.say(`${name} is too slow to act!`, 40); return; }
      if (f.vol.confuse > 0) {
        f.vol.confuse--;
        if (f.vol.confuse <= 0) yield* this.say(`${name} snapped out of its confusion!`, 40);
        else if (Math.random() < 1 / 3) {
          this.endLocks(f);
          yield* this.say(`${name} is confused! It hurt itself!`, 40);
          const dmg = KP.damage(this, f, f, { name: 'confusion', type: null, power: 40, cat: 'physical' }, { rand: rand16() });   // (Showdown's: 40 power, typeless, at itself)
          yield* this.hurt(f, dmg); return;
        }
      }
      const mv = moveOf(id) || FLAIL;
      if (mv.type && KP.MAGIC[mv.type] && mon.status === 'silence') { yield* this.say(`${name} is silenced and can't cast!`, 45); this.endLocks(f); return; }
      if (f.vol.taunt && KP.category(mv) === 'status') { yield* this.say(`${name} can't use ${mv.name} after the taunt!`, 45); return; }
      if (this.rooms.gravity && mv.charge && mv.charge.invuln === 'air') { yield* this.say(`${name} can't use ${mv.name} because of gravity!`, 45); this.endLocks(f); return; }
      if (ab && ab.truant) f.loafing = true;
      // a two-turn move's first turn (Solar Beam's kind; Jump, Dig and Vanish out of reach till the second)
      if (mv.charge && f.vol.charging !== id) {
        let skip = !!(mv.charge.skipIn && this.fieldIs(mv.charge.skipIn));
        const it = this.itemOf(f);
        if (!skip && it && it.powerHerb) { skip = true; yield* this.say(`${name} ${mv.charge.text || 'is gathering power!'}`, 35); yield* this.consume(f, `${name} became fully charged thanks to its ${it.name}!`); }
        if (!skip) {
          f.vol.charging = id; f.lastMove = id;
          yield* this.playFx(f, f, { name: mv.charge.invuln ? 'dash_bolt' : 'charge', self: true });
          if (mv.charge.invuln) f.vol.invuln = mv.charge.invuln;
          yield* this.say(`${name} ${mv.charge.text || 'is gathering power!'}`, 45);
          if (mv.charge.self) yield* this.boost(f, mv.charge.self, f);
          return;
        }
      }
      if (f.vol.charging === id) { f.vol.charging = null; f.vol.invuln = null; }
      yield* this.say(`${name} used ${mv.name}!`, 30);
      // its cooldown (a Pressure's kind on the other side: longer; its own cdLess: shorter). A choice item or a Berserker's
      // kind locks it into the move, and then that move has no cooldown at all (the user, 2026-10-03: Kupomon's cooldowns
      // would leave a locked moogle Flailing after one use, where Pokémon's PP let it go on)
      const chosen = !!(((this.itemOf(f) || {}).choice) || (ab && ab.gorillaTactics));
      if (mv.cd && !chosen) {
        let n = mv.cd + 1; const oa = t ? this.ab(t) : null;
        if (oa && oa.pressure) n += oa.pressure === true ? 1 : oa.pressure;
        if (ab && ab.cdLess) n = Math.max(1, n - ab.cdLess);
        this.cds(mon)[id] = n;
      }
      f.streak = f.lastMove === id ? (f.streak || 1) + 1 : 1; f.lastMove = id;
      if (!f.lock && (((this.itemOf(f) || {}).choice) || (ab && ab.gorillaTactics))) f.lock = id;
      if (mv.rampage) { if (!f.vol.rampage || f.vol.rampage.id !== id) f.vol.rampage = { id, left: 1 + U.rand(2) }; else f.vol.rampage.left--; }
      // the user's motion: a lunge for a physical move (further for a touch), a hop for a spell or a status move
      const dir = f.side === 'me' ? 1 : -1, phys = KP.category(mv) === 'physical', reach = KP.hasFlag(mv, 'contact') ? 0.55 : 0.35;
      if (phys) { for (let i = 0; i < 10; i++) { f.dx = Math.sin(i / 10 * PI) * reach * dir; yield; } f.dx = 0; }
      else { for (let i = 0; i < 10; i++) { f.dy = Math.sin(i / 10 * PI) * 0.12; yield; } f.dy = 0; }
      if (mv.hpCost) {   // (the HP it pays: Belly Drum's kind)
        const cost = Math.floor(KP.maxHp(mon) * mv.hpCost);
        if (mon.hp <= cost) { yield* this.say('But it failed!', 35); return; }
        mon.hp -= cost; yield* this.say(`${name} paid some of its HP!`, 35);
      }
      if (mv.firstTurnOnly && f.outTurn !== this.turn) { yield* this.say('But it failed!', 35); return; }
      if (mv.onlyIfFoeAttacks) {   // (Sucker Punch's kind: only into a foe about to attack)
        const p = this.planOf(t), pm = p && p.kind === 'move' ? moveOf(p.move) : null;
        if (!pm || t.movedThisTurn || KP.category(pm) === 'status') { yield* this.say('But it failed!', 35); return; }
      }
      const cat = KP.category(mv), moveType = KP.moveType(this, f, mv);
      if (ab && ab.moldBreaker) this._breaking = t;
      try { yield* this.moveBody(f, id, mv, t, cat, moveType); } finally { this._breaking = null; }
      // after the move: a rampage's end (worn out, it's confused), a Throat Spray's kind
      if (f.vol.rampage && f.vol.rampage.id === id && f.vol.rampage.left <= 0 && f.mon.hp > 0) { f.vol.rampage = null; yield* this.say(`${name} became confused from fatigue!`, 40); yield* this.inflict(f, 'confuse', 100, null); }
      const fi = this.itemOf(f);
      if (fi && fi.throatSpray && KP.hasFlag(mv, 'sound') && f.mon.hp > 0) { yield* this.boost(f, { mag: 1 }, f); yield* this.consume(f, `${name} used its ${fi.name}!`); }
    }
    // a move landing: who it reaches, the hits, the effects (a bounced status move comes back through here)
    *moveBody(f, id, mv, t, cat, moveType) {
      const mon = f.mon, name = this.nm(f), ab = this.ab(f), tab = this._breaking === t ? null : this.ab(t);
      const vol = mv.vol || {}, foeVol = Object.keys(vol).some(k => KP.VOLATILES[k] && KP.VOLATILES[k].foe);
      const targetsFoe = cat !== 'status' || !!(mv.status || (mv.stat && mv.stat[2] === 'foe') || mv.foe || foeVol || mv.trick);
      const sure = (ab && ab.noGuard) || (tab && tab.noGuard);
      if (targetsFoe) {
        if (!t || t.mon.hp <= 0 || t.gone) { yield* this.say('But there was no target...', 35); this.endLocks(f); return; }
        // bounced back (Magic Bounce's kind, the Reflect state): a status move turns on its user
        if (cat === 'status' && !mv.bypassGuard && ((tab && tab.magicBounce) || t.vol.reflect) && !f.bounced) {
          if (tab && tab.magicBounce) this.abilityPop(t, tab);
          yield* this.say(`${this.nm(t)} bounced the ${mv.name} back!`, 45);
          t.bounced = true; try { yield* this.moveBody(t, id, mv, f, cat, moveType); } finally { t.bounced = false; }
          return;
        }
        // Guard (Protect's kind; a spiky one punishes a touch)
        if (t.vol.guard && !mv.bypassGuard) {
          yield* this.say(`${this.nm(t)} protected itself!`, 40);
          const g = t.vol.guard;
          if (typeof g === 'object' && KP.hasFlag(mv, 'contact') && f.mon.hp > 0 && !(KP.ITEMS[this.heldOf(f)] || {}).pads) {
            if (g.hurt) yield* this.chip(f, g.hurt, `${name} was hurt by the guard!`);
            if (g.status) yield* this.inflict(f, g.status, 100, t);
            if (g.foe) yield* this.boost(f, g.foe, t, { fromFoe: true });
          }
          if (mv.crash) yield* this.chip(f, mv.crash, `${name} kept going and crashed!`);
          this.endLocks(f); return;
        }
        // out of reach (Jump, Dig, Vanish), unless the move reaches there
        if (t.vol.invuln && !(mv.hitsInvuln || []).includes(t.vol.invuln) && !sure && !f.vol.lockOn) { yield* this.say(`${this.nm(t)} is out of reach!`, 40); this.endLocks(f); return; }
        // a priority move stopped (the Time Field, on the grounded; a Queenly Majesty's kind)
        const prio = KP.priorityOf(this, f, mv);
        if (prio >= 1 && ((this.terrain && KP.TERRAINS[this.terrain.id].noPrio && KP.grounded(this, t)) || (tab && tab.noPriorityAgainst))) {
          if (tab && tab.noPriorityAgainst) this.abilityPop(t, tab);
          yield* this.say(`${this.nm(t)} can't be reached by a priority move!`, 45); return;
        }
        // accuracy (Showdown's chain; Blind; Gravity; a one-hit KO's own)
        const accN = KP.accuracyOf(this, f, t, mv), acc = accN === true ? 100 : accN;
        if (accN !== true && !(ab && ab.noMiss) && Math.floor(Math.random() * 100) >= acc) {
          yield* this.say(mv.ohko && t.mon.lv > mon.lv ? `It doesn't affect ${t.name}...` : `But it missed!`, 45);
          if (mv.crash) yield* this.chip(f, mv.crash, `${name} kept going and crashed!`);
          const it = this.itemOf(f); if (it && it.blunderPolicy && f.mon.hp > 0) { yield* this.boost(f, { spd: 2 }, f); yield* this.consume(f, `${name} used its ${it.name}!`); }
          this.endLocks(f); return;
        }
        if (ab && ab.noMiss && acc < 100) this.abilityPop(f, ab);
        if (f.vol.lockOn) f.vol.lockOn = 0;
        // immunities: the type chart's (status moves too: the hint says No effect), and an ability's (absorb: it heals;
        // absorbBoost: a stat rises; flashFire: its own moves of that type get stronger)
        const eff0 = moveType ? KP.effAgainst(this, f, t, moveType) : 1;
        const abImm = tab && ((tab.immune && moveType && tab.immune.includes(moveType)) || (tab.flagImmune && tab.flagImmune.some(fl => KP.hasFlag(mv, fl))) || (tab.goodAsGold && cat === 'status') || (tab.overcoat && KP.hasFlag(mv, 'powder')));
        if (!abImm && KP.hasFlag(mv, 'powder') && (KP.ITEMS[this.heldOf(t)] || {}).goggles) { yield* this.say(`It doesn't affect ${t.name}...`, 50); this.endLocks(f); return; }   // (Safety Goggles' kind: no powder)
        if (eff0 === 0 || abImm) {
          if (abImm) {
            this.abilityPop(t, tab);
            if (tab.absorb && t.mon.hp < KP.maxHp(t.mon)) { t.mon.hp = Math.min(KP.maxHp(t.mon), t.mon.hp + Math.floor(KP.maxHp(t.mon) / 4)); sfx('heal'); yield* this.say(`${t.name}'s ${tab.name} soaked it up! It recovered some HP!`, 50); return; }
            if (tab.absorbBoost) { yield* this.say(`${t.name}'s ${tab.name} soaked it up!`, 40); yield* this.boost(t, tab.absorbBoost, t); return; }
            if (tab.flashFire) { t.flashFire = moveType; yield* this.say(`${t.name}'s ${tab.name} drew power from it!`, 45); return; }
          }
          yield* this.say(`It doesn't affect ${t.name}...`, 50); this.endLocks(f); return;
        }
        // a Decoy takes status moves aimed at it (sound ones, and an Infiltrator's, get through)
        if (cat === 'status' && t.vol.decoy && !KP.hasFlag(mv, 'sound') && !(ab && ab.infiltrator)) { yield* this.say('But it failed!', 35); return; }
        if (mv.ohko && tab && tab.sturdy) { this.abilityPop(t, tab); yield* this.say(`${t.name} held on thanks to its ${tab.name}!`, 45); return; }
      }
      if (cat === 'status') yield* this.playFx(f, t, KP.fxFor ? KP.fxFor(mv, id) : null);
      // ---- the hits
      let dealt = 0, landed = false, decoyHit = false;
      const eff = moveType && t ? KP.effAgainst(this, f, t, moveType) : 1;
      if (cat !== 'status' && t && t.mon.hp > 0) {
        if (mv.breakWalls) { const s = this.sides[t.side].cond; if (s.wall || s.shell || s.veil) { delete s.wall; delete s.shell; delete s.veil; yield* this.say('It shattered the barrier!', 40); } }
        const parental = !!(ab && ab.parentalBond && !mv.hits && !mv.ohko && mv.fixed == null && !mv.counter && !mv.charge);
        const n = parental ? 2 : KP.hitCount(this, f, mv);
        const contact = KP.hasFlag(mv, 'contact') && !(KP.ITEMS[this.heldOf(f)] || {}).pads;
        let hits = 0;
        const fx = KP.fxFor ? KP.fxFor(mv, id) : null;
        for (let i = 0; i < n; i++) {
          if (t.mon.hp <= 0 || f.mon.hp <= 0) break;
          yield* this.playFx(f, t, fx, i > 0);
          const crit = KP.critRoll(this, f, t, mv);
          const dmg = this.damageOf(f, t, mv, { crit, rand: rand16(), real: true, parental: parental && i === 1 });
          if (dmg <= 0) { if (i === 0) yield* this.say('But it failed!', 35); break; }
          hits++;
          if (t.vol.decoy && !KP.hasFlag(mv, 'sound') && !(ab && ab.infiltrator)) {   // (the Decoy takes it)
            const d = Math.min(t.vol.decoy, dmg); t.vol.decoy -= d; dealt += d; decoyHit = true;
            sfx('hit'); yield* this.say('The Decoy took the hit!', 35);
            if (t.vol.decoy <= 0) { delete t.vol.decoy; yield* this.say(`${this.nm(t)}'s Decoy faded!`, 40); }
            continue;
          }
          if (tab && tab.disguise && !t.disguiseBroken) {   // (a Disguise's kind: the first hit busts it instead)
            t.disguiseBroken = true; this.abilityPop(t, tab);
            yield* this.say(`${this.nm(t)}'s disguise was busted!`, 45);
            yield* this.hurt(t, Math.max(1, Math.floor(KP.maxHp(t.mon) / 8))); continue;
          }
          const r = yield* this.hurt(t, dmg, { direct: true, from: f, mv, crit, eff });
          dealt += r; landed = true;
          t.hitThisTurn = { dmg: r, cat, by: f };
          if (crit) yield* this.say('A critical hit!', 35);
          if (f._gemPending) { f._gemPending = false; f._gemUsed = true; const gi = KP.ITEMS[f.mon.held]; yield* this.consume(f, `The ${gi ? gi.name : 'Gem'} strengthened ${name}'s attack!`); }
          if (t._resistPending) { t._resistPending = false; t._berryUsed = true; const bi = KP.ITEMS[t.mon.held]; yield* this.consume(t, `${this.nm(t)} ate its ${bi ? bi.name : 'berry'}: the hit was softened!`); }
          if (t.mon.hp <= 0) t.koBy = { f, contact };
          // the hit answered: the target's ability and item; the attacker's after-hit (Poison Touch's kind)
          const hc = { source: f, move: mv, moveId: id, cat, moveType, eff, crit, contact, dmg: r };
          yield* this.fire('onDamagingHit', t, hc);
          yield* this.itemOnHit(t, f, hc);
          if (f.mon.hp > 0) yield* this.fire('onAfterHit', f, { target: t, move: mv, moveType, cat, contact, dmg: r });
        }
        if (n > 1 && hits) yield* this.say(`Hit ${hits} time${hits > 1 ? 's' : ''}!`, 35);
        if (landed) { if (eff > 1) yield* this.say("It's super effective!", 40); else if (eff < 1) yield* this.say("It's not very effective...", 40); }
        if (landed || decoyHit) {
          const max = KP.maxHp(mon);
          if (mv.drain && dealt > 0 && mon.hp > 0) {
            const h = Math.max(1, Math.floor(dealt * mv.drain * ((ab && ab.drainMul) || 1)));
            if (mon.status === 'zombie') yield* this.heal(f, h);
            else { mon.hp = Math.min(max, mon.hp + h); yield* this.say(`${name} drained ${t.name}'s energy!`, 40); }
          }
          if (mv.recoil && dealt > 0 && mon.hp > 0 && !(ab && (ab.rockHead || ab.magicGuard))) { yield* this.say(`${name} is damaged by the recoil!`, 35); yield* this.hurt(f, Math.max(1, Math.round(dealt * mv.recoil))); }
          const fit = this.itemOf(f) || {};
          if (fit.shellBell && dealt > 0 && mon.hp > 0 && mon.hp < max) yield* this.heal(f, Math.max(1, Math.floor(dealt * fit.shellBell)), `${name} restored a little HP using its ${fit.name}!`);
          // Counter (counterHit): the one struck strikes back with a blow of its own, only if it's still standing
          if (tab && tab.counterHit && landed && t.mon.hp > 0 && mon.hp > 0) yield* this.counterBlow(t, f, tab);
          // an old ability's answer to the hit (onHit: a status on the attacker, or a share of the damage back)
          if (tab && tab.onHit && mon.hp > 0 && landed) {
            const st = tab.onHit.status;
            if (st && Math.random() * 100 < st[1] && !mon.status) { this.abilityPop(t, tab); yield* this.inflict(f, Array.isArray(st[0]) ? U.pick(st[0]) : st[0], 100, t); }
            if (tab.onHit.recoil) { this.abilityPop(t, tab); yield* this.say(`${t.name}'s ${tab.name} hit back!`, 40); yield* this.hurt(f, Math.max(1, Math.floor(dealt * tab.onHit.recoil))); }
          }
        }
        // a knockout: the attacker's ability (Moxie's kind); the target's Destiny takes the attacker with it
        if (t.mon.hp <= 0 && landed) {
          if (mon.hp > 0) yield* this.fire('onKO', f, { target: t });
          if (t.vol.destiny && mon.hp > 0) { yield* this.say(`${this.nm(t)} took its attacker down with it!`, 50); yield* this.hurt(f, mon.hp); }
        }
        if (!landed && !decoyHit) { this.endLocks(f); return; }
      }
      // ---- the added effects of an attack (none with a Sheer Force's kind; a Shield Dust's kind on the target blocks
      // them; a Decoy too)
      const sheer = !!(ab && ab.sheerForce && KP.hasSecondary(mv));
      const chanceMul = (ab && ab.statusChance) || 1;
      if (cat !== 'status' && landed && t.mon.hp > 0 && !sheer) {
        const shielded = (tab && tab.shieldDust) || (KP.ITEMS[this.heldOf(t)] || {}).covertCloak;
        if (!shielded) {
          let fl = mv.flinch || 0;
          if (!fl) for (const h of KP.handlersOf(f)) if (h.onAfterHitFlinch) fl = Math.max(fl, h.onAfterHitFlinch());
          if (fl && !t.movedThisTurn && !(tab && tab.innerFocus) && Math.random() * 100 < fl * chanceMul) t.vol.flinch = true;
          if (mv.status) yield* this.inflictMove(t, mv.status, chanceMul, f);
          if (mv.stat && mv.stat[2] === 'foe' && (mv.stat[3] == null || Math.random() * 100 < mv.stat[3] * chanceMul)) yield* this.boost(t, { [mv.stat[0]]: mv.stat[1] }, f, { fromFoe: true });
          if (mv.foe && (mv.foeChance == null || Math.random() * 100 < mv.foeChance * chanceMul)) yield* this.boost(t, mv.foe, f, { fromFoe: true });
          if (foeVol) yield* this.giveVols(f, t, vol, true);
        }
        if (mv.trap && t.mon.hp > 0) yield* this.trapIt(f, t, mv);
        if (mv.resetFoe && t.mon.hp > 0 && Object.values(t.st).some(v => v)) { for (const k of Object.keys(t.st)) t.st[k] = 0; yield* this.say(`${this.nm(t)}'s stat changes were wiped away!`, 40); }
        if (mv.knockOff && t.mon.held && t.mon.hp > 0) { const nm = KP.ITEMS[t.mon.held] ? KP.ITEMS[t.mon.held].name : 'item'; this.taken(t.mon); t.mon.held = null; t.lostItem = true; yield* this.say(`${name} knocked off ${this.nm(t)}'s ${nm}!`, 45); }
        if (mv.stealItem && t.mon.held && !mon.held && t.mon.hp > 0) { const it = t.mon.held; this.taken(t.mon); this.taken(mon); mon.held = it; t.mon.held = null; t.lostItem = true; yield* this.say(`${name} stole ${this.nm(t)}'s ${KP.ITEMS[it].name}!`, 45); }
      }
      if (cat !== 'status' && mon.hp > 0) {
        if (mv.self && (mv.selfChance == null || (!sheer && Math.random() * 100 < mv.selfChance * chanceMul))) yield* this.boost(f, mv.self, f);
        if (mv.stat && mv.stat[2] === 'self' && (mv.stat[3] == null || Math.random() * 100 < mv.stat[3] * chanceMul)) yield* this.boost(f, { [mv.stat[0]]: mv.stat[1] }, f);
        if (mv.recharge) f.vol.recharge = 1;
      }
      // ---- a move's own effects (a status move's; and the ones an attack has besides its hit)
      if (mv.heal) {
        const max = KP.maxHp(mon), h = Math.max(1, Math.floor(max * this.healFrac(mon, mv) * ((ab && ab.healMul) || 1)));
        if (mon.status === 'zombie') yield* this.heal(f, h);
        else if (mon.hp >= max) yield* this.say(`${name}'s HP is already full!`, 40);
        else {
          this.healUses[mon.uid] = (this.healUses[mon.uid] || 0) + 1;
          mon.hp = Math.min(max, mon.hp + h); sfx('heal'); yield* this.say(`${name} recovered some HP!`, 40);
        }
        if (mv.cures && mv.cures.includes(mon.status)) { mon.status = null; yield* this.say(`${name} shook off its ailment!`, 40); }
      }
      if (cat === 'status') {
        if (mv.stat) {
          const [k, n, who, chance] = mv.stat, tf = who === 'self' ? f : t;
          if (chance == null || Math.random() * 100 < chance * chanceMul) yield* this.boost(tf, { [k]: n }, f, { fromFoe: tf !== f });
        }
        if (mv.self) yield* this.boost(f, mv.self, f);
        if (mv.foe && t.mon.hp > 0) yield* this.boost(t, mv.foe, f, { fromFoe: true });
        if (mv.status) yield* this.inflictMove(t, mv.status, chanceMul, f);
        if (Object.keys(vol).length) yield* this.giveVols(f, t, vol, false);
        if (mv.guard) f.vol.guard = mv.guard;   // (its own message: "protected itself" when a hit comes)
        if (mv.guard) yield* this.say(`${name} braced itself!`, 35);
        if (mv.endure) { f.vol.endure = true; yield* this.say(`${name} braced itself to endure!`, 35); }
        if (mv.trap && t.mon.hp > 0) yield* this.trapIt(f, t, mv);
      } else if (Object.keys(vol).some(k => !(KP.VOLATILES[k] && KP.VOLATILES[k].foe))) yield* this.giveVols(f, t, vol, false, true);
      // the field and the sides
      const quiet = cat !== 'status';   // (an attack that also sets something says nothing when it's already set)
      if (mv.weather) yield* this.setWeather(mv.weather, f, { quiet });
      if (mv.terrain) yield* this.setTerrain(mv.terrain, f, { quiet });
      if (mv.room) yield* this.setRoom(mv.room, f);
      if (mv.side) yield* this.setSide(f.side, mv.side, f, { quiet });
      if (mv.hazard) yield* this.addHazard(t ? t.side : (f.side === 'me' ? 'foe' : 'me'), mv.hazard, f, { quiet });
      if (mv.clearHazards && mon.hp > 0) {
        const mine = this.sides[f.side], theirs = this.sides[f.side === 'me' ? 'foe' : 'me'];
        const had = Object.keys(mine.haz).length + (mv.clearHazards === 'all' ? Object.keys(theirs.haz).length + Object.keys(theirs.cond).filter(k => KP.SIDE_CONDS[k].cat).length : 0);
        mine.haz = {};
        if (mv.clearHazards === 'all') { theirs.haz = {}; for (const k of Object.keys(theirs.cond)) if (KP.SIDE_CONDS[k].cat) delete theirs.cond[k]; }
        if (had) yield* this.say(mv.clearHazards === 'all' ? 'The field was swept clean!' : `${name} cleared away the hazards!`, 40);
        if (mv.clearHazards === 'field' || mv.clearField) { this.wx = null; this.terrain = null; }
      }
      if (mv.haze) { for (const x of [this.me, this.foe]) if (x) for (const k of Object.keys(x.st)) x.st[k] = 0; yield* this.say('All stat changes were wiped away!', 40); }
      if (mv.invertFoe && t && t.mon.hp > 0) { for (const k of Object.keys(t.st)) t.st[k] = -t.st[k]; yield* this.say(`${this.nm(t)}'s stat changes were turned around!`, 40); }
      if (mv.cureTeam) {
        const team = f.side === 'me' ? this.d.party : this.foes;
        team.forEach(m => { if (m.hp > 0) m.status = null; }); f.venomN = 0;
        sfx('heal'); yield* this.say(`A soothing chime! ${f.side === 'me' && !this.o.spectate ? 'Your team was' : 'The team was'} cured of its ailments.`, 50);
      }
      if (mv.trick && t && t.mon.hp > 0) {
        const tab2 = this.ab(t);
        if ((tab2 && tab2.anchor) || (!mon.held && !t.mon.held)) yield* this.say('But it failed!', 35);
        else { this.taken(mon); this.taken(t.mon); const a = mon.held; mon.held = t.mon.held; t.mon.held = a; f.lock = null; t.lock = null; yield* this.say(`${name} swapped items with ${this.nm(t)}!`, 45); }
      }
      // Rest's kind: all its HP and no ailment, then two turns asleep (not at full HP, not where it can't sleep)
      if (mv.rest && mon.hp > 0) {
        const max = KP.maxHp(mon), T0 = this.terrain && KP.TERRAINS[this.terrain.id], gr = KP.grounded(this, f);
        const noSleep = (ab && ab.noStatus && (ab.noStatus === 'all' || ab.noStatus.includes('sleep'))) || (T0 && gr && (T0.noSleep || T0.noStatus));
        if (mon.hp >= max || mon.status === 'sleep' || noSleep) yield* this.say('But it failed!', 35);
        else { mon.hp = max; mon.status = 'sleep'; mon.statusT = 3; f.venomN = 0; this.healUses[mon.uid] = (this.healUses[mon.uid] || 0) + 1; sfx('heal'); yield* this.say(`${name} slept and became healthy!`, 45); }
      }
      // Wish's kind: half the wisher's max HP at the end of the next turn, to whoever is out on its side then
      if (mv.wish && mon.hp > 0) {
        const sd = this.sides[f.side];
        if (sd.wish) yield* this.say('But it failed!', 35);
        else { sd.wish = { turns: 2, amt: Math.max(1, Math.floor(KP.maxHp(mon) / 2)), by: KP.name(mon) }; sfx('magic'); yield* this.say(`${name} made a wish on a falling star!`, 40); }
      }
      // Perish Song's kind: every moogle out that hears it (not one already counting down; a Soundproof's kind is
      // deaf to it) faints at the end of the third turn after, unless it switches out
      if (mv.perish) {
        let n = 0;
        for (const x of [f, t]) {
          if (!x || x.mon.hp <= 0 || x.vol.perish) continue;
          const xa = x === f ? ab : (this._breaking === x ? null : this.ab(x));
          if (x !== f && xa && xa.immune && xa.immune.includes(mv.type)) { this.abilityPop(x, xa); continue; }
          x.vol.perish = 4; n++;
        }
        if (n) { sfx('cast'); yield* this.say('All who heard the Last Refrain will faint in three turns!', 50); } else yield* this.say('But it failed!', 35);
      }
      // Court Change's kind: the two sides' conditions and hazards swap over
      if (mv.courtChange) {
        const a = this.sides.me, b = this.sides.foe, any = Object.keys(a.cond).length + Object.keys(a.haz).length + Object.keys(b.cond).length + Object.keys(b.haz).length;
        if (!any) yield* this.say('But it failed!', 35);
        else { [a.cond, b.cond] = [b.cond, a.cond]; [a.haz, b.haz] = [b.haz, a.haz]; sfx('cast'); yield* this.say(`${name} swapped the effects on either side of the field!`, 45); }
      }
      if (mv.selfFaint && mon.hp > 0) { this.selfKO = f.side; yield* this.hurt(f, mon.hp); }
      // the Life Orb's kind: its toll after an attack
      const fit = this.itemOf(f) || {};
      if (fit.lifeOrb && cat !== 'status' && landed && mon.hp > 0 && !sheer && !(ab && ab.magicGuard)) yield* this.chip(f, typeof fit.lifeOrb === 'number' ? fit.lifeOrb : 0.1, `${name} lost some of its HP!`);
      // switching: the target's Eject Button and Red Card, a forced switch (Roar's kind), the user's own (U-turn's kind)
      if (t && t.ejectPending) { t.ejectPending = false; const ti = this.itemOf(t); if (t.mon.hp > 0 && (t === this.me || t === this.foe) && this.alive(t.side).filter(m => m !== t.mon).length) { yield* this.consume(t, `${this.nm(t)} is switched out by its ${ti ? ti.name : 'Eject Button'}!`); yield* this.pivot(t); } }
      if (t && t.redCardPending) { const a = t.redCardPending; t.redCardPending = null; const ti = this.itemOf(t); if (a.mon.hp > 0 && t.mon.hp > 0 && (a === this.me || a === this.foe)) { yield* this.consume(t, `${this.nm(t)} held up its ${ti ? ti.name : 'Red Card'}!`); yield* this.dragOut(a, t); } }
      if (mv.forceSwitch && t && t.mon.hp > 0 && (t === this.me || t === this.foe)) { const moved = yield* this.dragOut(t, f); if (!moved && cat === 'status') yield* this.say('But it failed!', 35); }
      if (mv.selfSwitch && mon.hp > 0 && (f === this.me || f === this.foe) && this.alive(f.side === 'me' ? 'foe' : 'me').length) yield* this.pivot(f, { pass: mv.selfSwitch === 'pass' });
    }
    // a move's ailment: [kind, chance] or [[kinds...], chance] (one of them at random)
    *inflictMove(t, st, mul, src) {
      if (!t || t.mon.hp <= 0) return;
      const kind = Array.isArray(st[0]) ? U.pick(st[0]) : st[0];
      yield* this.inflict(t, kind, Math.min(100, (st[1] == null ? 100 : st[1]) * (mul || 1)), src);
    }
    // the states a move gives (mv.vol: { taunt: true, leech: true, decoy: true, ... }); foeOnly: an attack's added ones
    *giveVols(f, t, vol, foeOnly, selfOnly) {
      for (const k of Object.keys(vol)) {
        const V = KP.VOLATILES[k]; if (!V || !vol[k]) continue;
        if (foeOnly && !V.foe) continue;
        if (selfOnly && V.foe) continue;
        const who = V.foe ? t : f; if (!who || who.mon.hp <= 0) continue;
        const nm = this.nm(who), wa = this._breaking === who ? null : this.ab(who);
        if (V.foe && wa && wa.noStatus && (wa.noStatus === 'all' || wa.noStatus.includes(k))) { this.abilityPop(who, wa); if (!foeOnly) yield* this.say(`${nm}'s ${wa.name} keeps it safe!`, 45); continue; }
        if (V.foe && this.sides[who.side].cond.safeguard && (k === 'yawn' || k === 'taunt') && !foeOnly) { yield* this.say(`${nm} is protected by Safeguard!`, 40); continue; }
        let fail = !!who.vol[k];
        if (k === 'yawn' && who.mon.status) fail = true;
        if (k === 'float' && this.rooms.gravity) fail = true;
        if (k === 'suppressed' && (KP.ITEMS[this.heldOf(who)] || {}).abilityShield) fail = true;
        if (k === 'decoy' && who.mon.hp <= Math.floor(KP.maxHp(who.mon) / 4)) fail = true;
        if (k === 'encore' && (!who.lastMove || !who.mon.moves.includes(who.lastMove) || (moveOf(who.lastMove) || {}).vol && moveOf(who.lastMove).vol.encore || who.vol.charging || who.vol.recharge)) fail = true;
        if (fail) { if (!foeOnly) yield* this.say('But it failed!', 35); continue; }
        if (k === 'encore') {
          const it = this.itemOf(who);
          if (it && it.mentalHerb) { yield* this.say(`${nm} ${V.start}`, 40); yield* this.consume(who, `${nm} used its ${it.name} to shake it off!`); continue; }
          who.vol.encore = { id: who.lastMove, turns: 3 }; sfx('cast'); yield* this.say(`${nm} ${V.start} It must keep using ${moveOf(who.lastMove).name}!`, 45); continue;
        }
        if (k === 'taunt') { who.vol.taunt = 3; const it = this.itemOf(who); if (it && it.mentalHerb) { yield* this.say(`${nm} ${V.start}`, 40); who.vol.taunt = 0; yield* this.consume(who, `${nm} used its ${it.name} to shake it off!`); continue; } }
        else if (k === 'leech') who.vol.leech = f.side;
        else if (k === 'yawn') who.vol.yawn = 2;
        else if (k === 'block') who.vol.block = f;
        else if (k === 'decoy') { const c = Math.floor(KP.maxHp(who.mon) / 4); who.mon.hp -= c; who.vol.decoy = c; }
        else if (k === 'float') who.vol.float = 5;
        else if (k === 'lockOn') who.vol.lockOn = 2;
        else who.vol[k] = true;
        sfx(V.foe ? 'cast' : 'magic');
        yield* this.say(`${nm} ${V.start}`, 40);
      }
    }
    // binding (Wrap's kind: 4-5 turns, 1/8 a turn; a Binding Band 1/6, a Grip Claw 7 turns), or a block (no escape)
    *trapIt(f, t, mv) {
      if (mv.trap === 'block') { if (!t.vol.block) { t.vol.block = f; yield* this.say(`${this.nm(t)} can't escape now!`, 40); } return; }
      if (t.vol.bound) return;
      const it = this.itemOf(f) || {};
      t.vol.bound = { by: f, name: mv.name, turns: it.gripClaw ? 7 : 4 + U.rand(2), frac: it.bindBand ? 1 / 6 : 1 / 8 };
      yield* this.say(`${this.nm(t)} was trapped by ${mv.name}!`, 40);
    }
    taken(mon) { (this.takenSet = this.takenSet || new Set()).add(mon); }
    // a held item answering a hit (a Balloon pops; a Helmet; a Weakness Policy; the hit berries; Eject Button, Red Card)
    *itemOnHit(t, f, hc) {
      const it = this.itemOf(t); if (!it) return;
      const nm = this.nm(t);
      if (it.balloon) { yield* this.consume(t, `${nm}'s ${it.name} popped!`); return; }
      if (it.helmet && hc.contact && f.mon.hp > 0 && !(this.ab(f) || {}).magicGuard) { yield* this.say(`${this.nm(f)} was hurt by ${nm}'s ${it.name}!`, 40); yield* this.hurt(f, Math.max(1, Math.floor(KP.maxHp(f.mon) * (typeof it.helmet === 'number' ? it.helmet : 1 / 6)))); }
      if (t.mon.hp <= 0) return;
      if (it.weaknessPolicy && hc.eff > 1) { yield* this.boost(t, { atk: 2, mag: 2 }, t); yield* this.consume(t, `${nm} used its ${it.name}!`); return; }
      if (it.hitBoost && (!it.hitBoost.cat || it.hitBoost.cat === hc.cat)) { yield* this.boost(t, it.hitBoost.boosts, t); yield* this.consume(t, `${nm} ate its ${it.name}!`); return; }
      if (it.hitHurt && (!it.hitHurt.cat || it.hitHurt.cat === hc.cat) && f.mon.hp > 0) { yield* this.consume(t, null); yield* this.chip(f, it.hitHurt.frac || 1 / 8, `${this.nm(f)} was hurt by ${nm}'s ${it.name}!`); return; }
      if (it.ejectButton) t.ejectPending = true;
      if (it.redCard && f.mon.hp > 0) t.redCardPending = f;
    }
    // damage: o.direct (an attack's hit: Stand Firm's kind, Endure, a Sash, a Focus Pom can hold it at 1 HP); the HP
    // it actually lost; then its pinch items (berries, the Mini Oil)
    *hurt(t, dmg, o = {}) {
      const mon = t.mon, max = KP.maxHp(mon), was = mon.hp;
      let to = Math.max(0, mon.hp - dmg), held = null;
      if (to === 0 && was > 1 && o.direct) {
        const tab = this._breaking === t ? null : this.ab(t), it = this.itemOf(t) || {};
        if (tab && tab.sturdy && was >= max) { to = 1; held = { ab: tab }; }
        else if (t.vol.endure) { to = 1; held = { text: `${this.nm(t)} endured the hit!` }; }
        else if (it.sash && was >= max) { to = 1; held = { item: it }; }
      }
      const fc = (KP.ITEMS[this.heldOf(t)] || {}).focusChance;
      if (to === 0 && was > 1 && fc && Math.random() * 100 < fc) { to = 1; held = { focus: true }; }
      sfx('hit'); t.flash = 10; t.shake = 10;
      mon.hp = to;
      yield 18;
      if (held && held.ab) { this.abilityPop(t, held.ab); yield* this.say(`${t.name} held on thanks to its ${held.ab.name}!`, 50); }
      else if (held && held.item) yield* this.consume(t, `${this.nm(t)} hung on using its ${held.item.name}!`);
      else if (held && held.focus) yield* this.say(`${t.name} hung on using its ${KP.ITEMS[this.heldOf(t)].name}!`, 45);
      else if (held && held.text) yield* this.say(held.text, 45);
      yield* this.afterHpDrop(t, was);
      return was - to;
    }
    *afterHpDrop(t, was) {
      const mon = t.mon; if (mon.hp <= 0) return;
      const max = KP.maxHp(mon), it = this.itemOf(t); if (!it) return;
      if (it.id === 'mini_oil' && mon.hp < max / 2 && was >= max / 2) {
        mon.held = null; t.lostItem = 'mini_oil'; mon.hp = Math.min(max, mon.hp + Math.floor(max / 4)); sfx('heal');
        yield* this.say(`${t.name} used its Mini Oil!`, 45); return;
      }
      if (it.pinchHeal && mon.hp <= max * it.pinchHeal.at) { yield* this.consume(t, `${this.nm(t)} ate its ${it.name}!`); yield* this.heal(t, it.pinchHeal.heal); return; }
      if (it.pinchBoost && mon.hp <= max * it.pinchBoost.at) { yield* this.consume(t, `${this.nm(t)} ate its ${it.name}!`); yield* this.boost(t, it.pinchBoost.boosts, t); }
    }
    *inflict(t, kind, chance, src, o = {}) {
      const mon = t.mon, nm = this.nm(t), def = KP.STATUS[kind];
      if (!def || mon.hp <= 0 || Math.random() * 100 >= (chance == null ? 100 : chance)) return false;
      const sure = chance == null || chance >= 100, quiet = o.quiet || !sure;
      const tab = this._breaking === t ? null : this.ab(t);
      if (tab && tab.noStatus && (tab.noStatus === 'all' || tab.noStatus.includes(kind))) { this.abilityPop(t, tab); if (sure && !o.quiet) yield* this.say(`${nm}'s ${tab.name} keeps it safe!`, 45); return false; }
      const fromFoe = src && src !== t;
      if (fromFoe && this.sides[t.side].cond.safeguard && !(this.ab(src) || {}).infiltrator) { if (!quiet) yield* this.say(`${nm} is protected by Safeguard!`, 40); return false; }
      if (this.terrain && KP.grounded(this, t)) {
        const T = KP.TERRAINS[this.terrain.id];
        if ((T.noStatus && (def.lasting || kind === 'confuse')) || (T.noSleep && kind === 'sleep')) { if (!quiet) yield* this.say(`${nm} is protected by the ${T.name}!`, 40); return false; }
      }
      if (def.lasting) {
        if (mon.status) { if (!quiet) yield* this.say(`${nm} is already affected!`, 40); return false; }
        mon.status = kind; mon.statusT = kind === 'sleep' ? 2 + U.rand(3) : kind === 'stop' ? 2 + U.rand(2) : 0;
        if (kind === 'venom') t.venomN = 0;
        const verb = def.verb || { poison: 'was poisoned', sleep: 'fell asleep', stop: 'was stopped in time', blind: 'was blinded', silence: 'was silenced' }[kind];
        yield* this.say(`${nm} ${verb}!`, 45);
        // Synchronize's kind: the ailment passed back
        if (tab && tab.synchronize && fromFoe && src.mon.hp > 0 && !src.mon.status && ['poison', 'venom', 'burn', 'slow'].includes(kind)) { this.abilityPop(t, tab); yield* this.inflict(src, kind, 100, t, { quiet: true }); }
        const it = this.itemOf(t);
        if (it && it.cureStatus && (it.cureStatus === 'all' || it.cureStatus === 'lasting' || (Array.isArray(it.cureStatus) && it.cureStatus.includes(kind)))) { mon.status = null; yield* this.consume(t, `${nm} ate its ${it.name} and was cured!`); sfx('heal'); }
      } else if (kind === 'confuse') {
        if (t.vol.confuse) return false; t.vol.confuse = 2 + U.rand(3); yield* this.say(`${nm} became confused!`, 45);
        const it = this.itemOf(t);
        if (it && it.cureStatus && (it.cureStatus === 'all' || (Array.isArray(it.cureStatus) && it.cureStatus.includes('confuse')))) { t.vol.confuse = 0; yield* this.consume(t, `${nm} ate its ${it.name} and snapped out of it!`); }
      } else if (kind === 'berserk') {
        if (t.vol.berserk) return false; t.vol.berserk = true; yield* this.say(`${nm} went berserk!`, 45);
      } else if (kind === 'doom') {
        if (t.vol.doom) return false; t.vol.doom = 4; yield* this.say(`${nm} is doomed! It will power down in three turns!`, 50);
      }
      return true;
    }

    // ---- the end of a turn (Showdown's residual order, near enough): the weather, then each moogle's own (the faster
    // first: healing, poison, seeds, binds, doom, drowsiness...), then the sides, the terrain and the zones running out
    *endOfTurn() {
      const warp = this.rooms.timewarp ? -1 : 1;
      const order = () => [this.me, this.foe].filter(f => f && !f.gone && f.mon.hp > 0).sort((a, b) => warp * (this.speed(b) - this.speed(a)));
      if (this.wx) {
        const W = KP.WEATHERS[this.wx.id];
        if (!this.wx.extreme && --this.wx.turns <= 0) { this.wx = null; yield* this.say(W.end, 45); }
        else if (W.chip && this.weatherId()) for (const f of order()) {
          const ab = this.ab(f), it = KP.ITEMS[this.heldOf(f)] || {};
          if (types(f.mon).some(t => (W.safe || []).includes(t)) || (ab && (ab.magicGuard || ab.overcoat)) || it.goggles) continue;
          yield* this.chip(f, W.chip, `${this.nm(f)} is buffeted by the ${W.name.toLowerCase()}!`);
        }
      }
      for (const f of order()) {
        const mon = f.mon; if (mon.hp <= 0) continue;
        const max = KP.maxHp(mon), nm = this.nm(f), ab = this.ab(f), it = this.itemOf(f) || {};
        const T = this.terrain && KP.TERRAINS[this.terrain.id];
        if (T && T.heal && KP.grounded(this, f) && mon.hp < max) yield* this.heal(f, T.heal, `${nm} drew strength from the ${T.name}.`);
        if (f.vol.regen && mon.hp > 0 && mon.hp < max) yield* this.heal(f, 1 / 16, `${nm} restored a little HP with Regen.`);
        if (mon.status === 'poison' || mon.status === 'venom') {
          if (ab && ab.poisonHeal) { if (mon.hp < max) { this.abilityPop(f, ab); yield* this.heal(f, 1 / 8, `${nm} is healed by the poison!`); } }
          else if (mon.status === 'poison') yield* this.chip(f, 1 / 8, `${nm} is hurt by poison!`);
          else { f.venomN = Math.min(15, (f.venomN || 0) + 1); yield* this.chip(f, f.venomN / 16, `${nm} is hurt by venom!`); }
        } else if (mon.status === 'burn') yield* this.chip(f, 1 / 16, `${nm} is hurt by its burn!`);
        if (mon.hp > 0 && ab && ab.regen && mon.hp < max) { this.abilityPop(f, ab); yield* this.heal(f, Math.max(1, Math.floor(max * ab.regen)), `${nm} restored a little HP with ${ab.name}.`); }
        if (mon.hp > 0 && it.leftovers && mon.hp < max) yield* this.heal(f, 1 / 16, `${nm} nibbled its ${it.name || 'Leftover Nut'}.`);
        if (mon.hp > 0 && it.sludge) { if (types(mon).includes(it.sludge)) { if (mon.hp < max) yield* this.heal(f, 1 / 16, `${nm} restored a little HP with its ${it.name}.`); } else yield* this.chip(f, 1 / 8, `${nm} is hurt by its ${it.name}!`); }
        if (f.vol.leech && mon.hp > 0) {
          const to = f.vol.leech === 'me' ? this.me : this.foe;
          if (to && to !== f && !to.gone && to.mon.hp > 0) { const d = yield* this.chip(f, 1 / 8, `${nm}'s health is sapped by the seed!`); if (d > 0) yield* this.heal(to, d); }
        }
        if (f.vol.curse && mon.hp > 0) yield* this.chip(f, 1 / 4, `${nm} is afflicted by the curse!`);
        if (f.vol.bound && mon.hp > 0) {
          const b = f.vol.bound;
          if (b.by.gone || b.by !== this.foeOf(f)) f.vol.bound = null;
          else if (--b.turns <= 0) { f.vol.bound = null; yield* this.say(`${nm} was freed from ${b.name}!`, 40); }
          else yield* this.chip(f, b.frac, `${nm} is hurt by ${b.name}!`);
        }
        if (mon.hp > 0 && f.vol.doom) { f.vol.doom--; if (f.vol.doom <= 0) { yield* this.say(`${nm}'s doom has come!`, 45); yield* this.hurt(f, mon.hp); } else yield* this.say(`${nm}'s doom count: ${f.vol.doom}`, 30); }
        if (f.vol.yawn && mon.hp > 0 && --f.vol.yawn <= 0) { f.vol.yawn = 0; yield* this.inflict(f, 'sleep', 100, null, { quiet: true }); }
        if (f.vol.taunt && --f.vol.taunt <= 0) { f.vol.taunt = 0; if (mon.hp > 0) yield* this.say(`${nm} shook off the taunt.`, 35); }
        if (f.vol.encore && --f.vol.encore.turns <= 0) { f.vol.encore = null; if (mon.hp > 0) yield* this.say(`${nm}'s encore ended.`, 35); }
        if (mon.hp > 0 && f.vol.perish) { f.vol.perish--; yield* this.say(`${nm}'s perish count fell to ${f.vol.perish}!`, 35); if (f.vol.perish <= 0) yield* this.hurt(f, mon.hp); }
        if (f.vol.float && --f.vol.float <= 0) { f.vol.float = 0; if (mon.hp > 0) yield* this.say(`${nm} came back down.`, 35); }
        if (f.vol.lockOn) f.vol.lockOn--;
        if (it.orb && mon.hp > 0 && !mon.status) yield* this.inflict(f, it.orb, 100, null, { quiet: true });
        if (mon.hp > 0) yield* this.fire('onResidual', f, {});
        const c = this.cds(mon); for (const k in c) if (c[k] > 0) c[k]--;
      }
      for (const side of ['me', 'foe']) {   // (a Wish made last turn comes true for whoever is out on that side)
        const w = this.sides[side].wish; if (!w) continue;
        if (--w.turns > 0) continue;
        this.sides[side].wish = null;
        const x = side === 'me' ? this.me : this.foe;
        if (x && !x.gone && x.mon.hp > 0 && x.mon.hp < KP.maxHp(x.mon)) yield* this.heal(x, w.amt, `${w.by}'s wish came true!`);
      }
      for (const side of ['me', 'foe']) {
        const cond = this.sides[side].cond;
        for (const k of Object.keys(cond)) if (--cond[k] <= 0) { delete cond[k]; const s = KP.SIDE_CONDS[k].end.replace('{side}', nameOfSide(side, this.o)); yield* this.say(s[0].toUpperCase() + s.slice(1), 40); }
      }
      if (this.terrain && --this.terrain.turns <= 0) { const T = KP.TERRAINS[this.terrain.id]; this.terrain = null; yield* this.say(T.end, 45); }
      for (const k of Object.keys(this.rooms)) if (--this.rooms[k] <= 0) { delete this.rooms[k]; yield* this.say(KP.ROOMS[k].end, 45); }
      for (const f of [this.me, this.foe]) if (f) { f.vol.guard = null; f.vol.endure = false; f.vol.flinch = false; f.vol.reflect = false; }
      // a battle that drags on (healing keeping pace with the hits: two walls, or moves that can't land) wears both
      // moogles out from turn 80 (KP.WEAR_TURN), a sixteenth of their HP a turn and one more sixteenth every 10 turns
      // after, so every battle ends (a Demo's, and the bouts it watches). It's announced on screen: a banner across the
      // middle five turns ahead and again when it starts (this.wearBanner, drawWearBanner), the turn counter at the top
      // counting down to it, then showing how hard it bites (drawField)
      const Tn = this.turn || 0, WT = KP.WEAR_TURN;
      if (Tn === WT - KP.WEAR_WARN && !this._wornWarn) {
        this._wornWarn = true; this.wearBanner = { t0: this.t, warn: true }; sfx('error');
        yield* this.say(`This battle is dragging on... In ${KP.WEAR_WARN} turns, both moogles will start wearing out!`, 80);
      }
      if (Tn >= WT) {
        if (!this._worn) { this._worn = true; this.wearBanner = { t0: this.t }; sfx('die'); yield* this.say('The battle has dragged on so long, both moogles are wearing out!', 80); }
        const k = Math.ceil((Tn - WT + 1) / 10);
        for (const f of [this.me, this.foe]) {
          const mon = f && f.mon; if (!mon || mon.hp <= 0) continue;
          yield* this.say(`${this.prefix(f.side) + f.name} is worn out!`, 24);
          yield* this.hurt(f, Math.max(1, Math.floor(KP.maxHp(mon) * k / 16)));
        }
      }
    }

    // ---- faints: experience for the ones who fought it; replacements; the end
    *faints() {
      if (this.foe.mon.hp <= 0 && !this.foe.gone) {
        const f = this.foe, wild = this.o.kind === 'wild'; f.gone = true; this.fainted.foe++;
        yield* this.fire('onFaint', f, { source: f.koBy && f.koBy.f, contact: f.koBy && f.koBy.contact });
        yield* this.leave(f);
        sfx('die');
        if (wild) for (let i = 0; i <= 20; i++) { f.down = ease(i / 20); yield; }
        else for (let i = 0; i < 20; i++) { f.dy = -i / 20 * 0.4; f.alpha = 1 - i / 20; yield; }
        yield* this.say(`${this.prefix('foe')}${f.name} powered down!`, 50);
        yield* this.shareExp(f.mon);
        const next = this.o.ai === 'max' && KP.tactics && KP.tactics.bestNext && this.me ? KP.tactics.bestNext(this.foes, this.me) : this.foes.find(m => m.hp > 0);   // (the max AI: its best answer)
        if (!next) {
          // both sides' last ones down at once (an Explosion's kind): the side that blew itself up loses
          if (this.me.mon.hp <= 0 && !this.alive('me').length && this.selfKO === 'me') return 'lose';
          if (wild && (yield* this.befriend(f))) return 'caught';
          if (wild) for (let i = 0; i < 20; i++) { f.dy = -i / 20 * 0.4; f.alpha = 1 - i / 20; yield; }
          return 'win';
        }
        if (this.o.kind === 'trainer') {
          this.foe = this.fighter(next, 'foe'); KP.dexSee(next.sp);
          yield* this.sendOut(this.foe, `${this.o.trainer.name} sent out ${this.foe.name}!`);
          this.markFought();
        }
      }
      if (this.me.mon.hp <= 0 && !this.me.gone) {
        const f = this.me; f.gone = true; this.fainted.me++;
        yield* this.fire('onFaint', f, { source: f.koBy && f.koBy.f, contact: f.koBy && f.koBy.contact });
        yield* this.leave(f);
        sfx('die');
        for (let i = 0; i < 20; i++) { f.dy = -i / 20 * 0.4; f.alpha = 1 - i / 20; yield; }
        yield* this.say(`${this.prefix('me')}${f.name} powered down!`, 50);
        if (KP.hardRules() && !this.o.spectate) f.mon._fell = true;   // (Hard Mode: gone for good once the battle's over)
        if (!this.alive('me').length) return 'lose';
        let p = this.o.spectate ? (this.o.ai === 'max' && KP.tactics && KP.tactics.bestNext ? KP.tactics.bestNext(this.d.party, this.foe) : this.alive('me')[0]) : this.autoOn() ? this.aiNext(this.alive('me'), this.foe) : yield this.ask({ kind: 'party', forced: true });
        if (p === 'auto') p = this.aiNext(this.alive('me'), this.foe);   // (Auto turned on at the menu)
        this.me = this.fighter(p, 'me');
        yield* this.sendOut(this.me, this.o.spectate ? `${this.o.spectate.name} sent out ${KP.name(p)}!` : `Go! ${KP.name(p)}!`);
      }
      // (one brought down coming in, by a hazard: again; both out: any ability still to come out)
      if ((this.foe.mon.hp <= 0 && !this.foe.gone) || (this.me.mon.hp <= 0 && !this.me.gone)) return yield* this.faints();
      if (this.turn) { yield* this.onEnter(this.foe); yield* this.onEnter(this.me); }
      return null;
    }
    // the experience, as modern Pokémon shares it: every moogle that faced the foe gets it all (no splitting), the rest
    // of the team (still standing) half; EXP Plus held: half as much again
    *shareExp(foeMon) {
      if (this.o.spectate) return;
      const base = Math.max(1, Math.floor((KP.sp(foeMon).exp || 60) * foeMon.lv / 7 * (this.o.kind === 'trainer' ? 1.5 : 1)));
      const fought = new Set(this.fought[foeMon.uid] || []);
      const xab = (mon) => { const a = KP.abilityOf ? KP.abilityOf(mon) : null; return (a && a.expMul) || 1; };
      const amount = (mon) => Math.max(1, Math.floor((fought.has(mon.uid) ? base : base / 2) * ((KP.ITEMS[mon.held] || {}).expMul || 1) * xab(mon)));
      const cap = KP.levelCap ? KP.levelCap() : KP.MAX_LEVEL;
      const team = this.d.party.filter(m => m.hp > 0 && m.lv < cap);
      const say = (t) => this.say(t, 60);
      if (cap < KP.MAX_LEVEL && !this._capSaid && this.d.party.some(m => m.hp > 0 && m.lv >= cap)) { this._capSaid = true; yield* this.say(`Moogles at Lv ${cap} can't grow any more until the next big battle is won. (Hard Mode level cap)`, 70); }
      for (const mon of team.filter(m => fought.has(m.uid))) {
        const n = amount(mon), exp0 = mon.exp, lv0 = mon.lv, ups = KP.gainExp(mon, n), msg = `${KP.name(mon)} gained ${n} EXP!`;
        if (this.me && this.me.mon === mon && !this.me.gone) yield* this.fillExp(this.me, exp0, lv0, msg);
        else {
          yield* this.say(msg, 40);
          for (const lv of ups) { sfx('levelup'); this.leveled.add(mon.uid); yield* this.say(`${KP.name(mon)} grew to Lv ${lv}!`, 55); }
        }
        if (KP.learnOnLevels) yield* KP.learnOnLevels(say, mon, ups);
      }
      const rest = team.filter(m => !fought.has(m.uid));
      if (!rest.length) return;
      const ups = rest.map(mon => [mon, KP.gainExp(mon, amount(mon))]);
      yield* this.say(`The rest of your team gained ${Math.max(1, Math.floor(base / 2))} EXP too!`, 40);
      for (const [mon, lvs] of ups) {
        for (const lv of lvs) { sfx('levelup'); this.leveled.add(mon.uid); yield* this.say(`${KP.name(mon)} grew to Lv ${lv}!`, 55); }
        if (KP.learnOnLevels) yield* KP.learnOnLevels(say, mon, lvs);
      }
    }
    // the EXP bar of the one out filling up: past the end of a level it rings, the level goes up (HP with it) and on
    *fillExp(f, exp0, lv0, msg) {
      const mon = f.mon;
      f.expShown = exp0; f.lvShown = lv0;
      this.text = msg; this.textHold = true;
      while (f.lvShown < mon.lv || f.expShown < mon.exp) {
        const a = KP.expAt(mon, f.lvShown), b = KP.expAt(mon, f.lvShown + 1);
        f.expShown = Math.min(f.lvShown < mon.lv ? b : mon.exp, f.expShown + Math.max(0.5, (b - a) / 50));
        if (f.lvShown < mon.lv && f.expShown >= b) {
          f.lvShown++; f.lvFlash = 30; sfx('levelup'); this.leveled.add(mon.uid);
          this.textHold = false; yield* this.say(`${KP.name(mon)} grew to Lv ${f.lvShown}!`, 55);
          if (f.lvShown < mon.lv || f.expShown < mon.exp) { this.text = msg; this.textHold = true; }
        }
        yield;
      }
      if (this.textHold) { this.textHold = false; this.textT = 0; this.textAuto = 30; while (this.text) yield; }
      f.expShown = null; f.lvShown = null;
    }
    // a stat going up or down: the words float up off it (as Showdown shows them) and it glows, blue up, red down
    statFx(f, k, d) {
      sfx(d > 0 ? 'magic' : 'cast');
      f.glow = { col: d > 0 ? [0.15, 0.4, 0.95] : [0.85, 0.12, 0.08], t: 40 };
      f.pops.push({ text: `${STAT_ABBR[k]} ${d > 0 ? '▲'.repeat(Math.min(3, d)) : '▼'.repeat(Math.min(3, -d))}`, col: d > 0 ? '#70c8ff' : '#ff7060', t: 0 });
    }

    // ---- the end: prize money, evolutions, back to the field
    *finish(result) {
      this.result = result;
      const o = this.o;
      if (result === 'win' || result === 'caught') FF7.audio.play('victory', { fade: 10 });
      if (result === 'win' && o.kind === 'trainer' && !o.spectate) {
        const coinMul = KP.coinMul(this.d);   // (coin abilities, the Gambler's Coin)
        const money = Math.floor((o.trainer.money === 0 ? 0 : o.trainer.money || 50 * Math.max(...this.foes.map(m => m.lv))) * coinMul);
        this.d.money += money;
        if (o.trainer.lose) yield* this.say(`${o.trainer.name}: "${o.trainer.lose}"`, 90);
        if (money) yield* this.say(`You got ${money} coins for winning!`, 60);
      }
      // a wild moogle powered down drops Scrap Metal (the user, 2026-10-02): for the Shinra Recycler (js/kupomon/kp_scrap.js)
      if ((result === 'win' || result === 'caught') && o.kind === 'wild' && !o.spectate && KP.scrapDrop && this.foes[0]) {
        const n = KP.scrapDrop(this.foes[0]);
        if (n > 0) { KP.give('scrap_metal', n); sfx('found'); yield* this.say(`${KP.name(this.foes[0])} dropped ${n} Scrap Metal!`, 45); }
      }
      if (o.spectate) yield* this.say(`${result === 'win' ? o.spectate.name : o.trainer.name} wins the bout!`, 90);
      else if (result === 'lose' && o.canLose) yield* this.say(o.trainer && o.trainer.win ? `${o.trainer.name}: "${o.trainer.win}"` : 'You lost...', 80);
      // evolutions: moogles that levelled past their job's next stage
      if (result !== 'lose' && !o.spectate) {
        for (const mon of this.d.party) {
          if (!this.leveled.has(mon.uid) || !KP.evoDue(mon)) continue;
          const r = yield KP.evolveScene(mon);
          if (r) yield 4;
        }
      }
      // held items knocked off, stolen or swapped come back (the used-up ones don't)
      if (this.takenSet) for (const m of this.takenSet) if (this.held0.has(m)) m.held = this.held0.get(m);
      // every status goes once the battle is over (the user's rule): a lasting one lasts the battle, not after it
      if (!o.spectate) this.d.party.forEach(m => { m.status = null; });
      // Hard Mode: the ones that powered down are gone for good (whatever brought them back up in the battle)
      if (!o.spectate && KP.hard()) {
        const gone = this.d.party.filter(m => m._fell);
        for (const m of gone) { sfx('die'); yield* this.say(`${KP.name(m)} won't be powering back up... Farewell, ${KP.name(m)}.`, 90); KP.fall(m, this.area); }
        const sent = KP.hardRefill();
        if (sent && sent.length) yield* this.say(`Your team is gone... The Mog Box sends ${sent.join(', ')} to stand with you.`, 100);
        else if (sent === null) { yield* this.say(`Every one of your moogles is gone. The Hard Mode journey ends here... Rest well, little ones.`, 160); this._over = true; }
      }
      yield 10;
      yield S().fadeOut(16);
      if (FF7.fx && FF7.fx.clear) FF7.fx.clear();
      S().pop();
      if (this.o._music) FF7.audio.pop(30);
      S().fadeIn(16);
      this.w.result = result; this.w.done = true;
      if (this._over) KP.endRun();   // (Hard Mode: nobody left anywhere: the run is over)
    }

    // ------------------------------------------------------------------ input (the menus)
    update() {
      this.t++;
      const I = FF7.input;
      if (FF7.fx && FF7.fx.update) FF7.fx.update();
      // the message: OK, or on by itself
      if (this.text && !this.textHold) {
        this.textT++;
        if ((this.textT > 8 && I.pressed('ok')) || this.textT > this.textAuto) this.text = null;
      }
      if (!this.o.spectate && I.pressed('auto')) this.toggleAuto();   // (Auto: on / off)
      if (this.autoPop && ++this.autoPop.t > 90) this.autoPop = null;
      if (this.ui) this.updateUi(I);
      this.co.update();
      // easing the shown HP towards the real HP
      [this.me, this.foe].forEach(f => {
        if (!f) return;
        const d = f.mon.hp - f.hpShown; f.hpShown += Math.abs(d) < 0.5 ? d : d * 0.15 + Math.sign(d) * 0.3;
        if (f.flash > 0) f.flash--; if (f.shake > 0) f.shake--;
        if (f.m) f.m.update(1);
        f.pops = f.pops.filter(q => ++q.t < 70);
        if (f.glow && --f.glow.t <= 0) f.glow = null;
        if (f.lvFlash > 0) f.lvFlash--;
        if (f.abPop && --f.abPop.t <= 0) f.abPop = null;
      });
      [this.cloud, this.trainerM].forEach(m => { if (m && m.update) m.update(1); });
    }
    updateUi(I) {
      const u = this.ui, nav = (n, cols) => {
        if (I.repeat('up')) { u.idx = (u.idx - cols + n) % n; sfx('cursor'); }
        if (I.repeat('down')) { u.idx = (u.idx + cols) % n; sfx('cursor'); }
        if (cols > 1 && I.repeat('left')) { u.idx = (u.idx + n - 1) % n; sfx('cursor'); }
        if (cols > 1 && I.repeat('right')) { u.idx = (u.idx + 1) % n; sfx('cursor'); }
      };
      if (u.kind === 'command') {
        nav(4, 2);
        if (I.pressed('ok')) { sfx('confirm'); this.answer(['fight', 'moogles', 'bag', 'run'][u.idx]); }
      } else if (u.kind === 'moves') {
        const ms = this.me.mon.moves; nav(ms.length, 2);
        if (I.back()) { sfx('cancel'); this.answer(null); return; }
        if (I.pressed('ok')) { const id = ms[u.idx]; if (!this.usable(this.me, id)) { sfx('error'); return; } sfx('confirm'); this.answer(id); }
      } else if (u.kind === 'party') {
        const P = this.d.party; nav(P.length, 1);
        if (I.back() && !u.forced) { sfx('cancel'); this.answer(null); return; }
        if (I.pressed('ok')) {
          const mon = P[u.idx];
          if (u.item) { sfx('confirm'); this.answer(mon); return; }
          if (mon.hp <= 0 || (this.me && mon === this.me.mon && (!u.forced || u.pivot))) { sfx('error'); return; }
          if (this.me && this.me.vol.berserk && !u.forced) { sfx('error'); return; }
          sfx('confirm'); this.answer(mon);
        }
      } else if (u.kind === 'nut') {
        const L = NUTS().filter(k => (this.d.bag[k] || 0) > 0).concat([null]);
        if (u.idx >= L.length) u.idx = L.length - 1;
        nav(L.length, 1);
        if (I.back()) { sfx('cancel'); this.answer(null); return; }
        if (I.pressed('ok')) { sfx('confirm'); this.answer(L[u.idx]); }
      } else if (u.kind === 'bag') {   // (two pockets in battle: Repairs, and the Kupo Nuts; left / right)
        u.pocket = u.pocket || 0;
        const dp = I.repeat('left') ? -1 : I.repeat('right') ? 1 : 0;
        if (dp) { u.pocket = (u.pocket + 2 + dp) % 2; u.idx = 0; sfx('cursor'); return; }
        const L = KP.pocketItems(BATTLE_POCKETS[u.pocket], this.d.bag);
        if (I.back()) { sfx('cancel'); this.answer(null); return; }
        if (!L.length) return;
        nav(L.length, 1);
        if (I.pressed('ok')) { sfx('confirm'); this.answer(L[u.idx]); }
      }
    }

    // ------------------------------------------------------------------ drawing
    drawArenaFloor() { const bg = BG[this.o.bg] || BG.grass; MG.put(meshes().ground, [0, 0, -1.5], null, 1, { tint: [bg.ground[0], bg.ground[1], bg.ground[2], 1] }); }
    render() {
      const bg = BG[this.o.bg] || BG.grass, M = meshes();
      MG.sky(bg.sky[0], bg.sky[1]);
      this.cam.set([0.05, 1.45, 4.3], [0.2, 0.42, -0.35], 40, 0.1, 60);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.35, -0.85, -0.4], color: [0.95, 0.92, 0.86], ambient: [0.5, 0.5, 0.55] } });
      this.cam.apply();
      MG.put(M.ground, [0, 0, -1.5], null, 1, { tint: [bg.ground[0], bg.ground[1], bg.ground[2], 1] });
      // the opening: theirs slides in from the left, ours from the right
      const slide = 1 - ease(this.open == null ? 0 : this.open), off = { me: 5 * slide, foe: -5 * slide };
      const at = (side) => [POS[side][0] + off[side], 0, POS[side][2]];
      ['me', 'foe'].forEach(side => { const p = at(side); MG.put(M.pad, [p[0], 0.0, p[2]], null, [0.75, 1, 0.55], { tint: [bg.pad[0], bg.pad[1], bg.pad[2], 1] }); });
      const face = (side) => { const p = POS[side], o = side === 'me' ? POS.foe : POS.me; return Math.atan2(o[0] - p[0], o[2] - p[2]); };
      // Cloud on ours (from behind), stepping off to the left; the trainer on theirs, stepping off to the right
      const people = [[this.cloud, 'me', -2.6 * (this.cloudOut || 0), this.cloudZ || 0], [this.trainerM, 'foe', 2.6 * (this.trainerOut || 0), 0]];
      for (const [m, side, dx, dz] of people) {
        if (!m || (side === 'me' ? this.cloudOut : this.trainerOut) >= 1) continue;
        const p = at(side); m.scale = side === 'me' ? 1.2 : 1.05;
        MG.shadow(p[0] + dx, 0, p[2] + dz, 0.3, 0.3);
        MG.drawModel(m, [p[0] + dx, 0, p[2] + dz], face(side), 0, 0, null);
      }
      for (const f of [this.foe, this.me]) {
        if (!f || f.grow <= 0 || f.alpha <= 0 || (f.vol && f.vol.invuln)) continue;   // (out of reach: Jump, Dig, Vanish)
        const p = at(f.side);
        const yaw = face(f.side) + (f.sway || 0), sx = f.shake ? (Math.random() - 0.5) * 0.06 : 0;
        MG.shadow(p[0] + f.dx, 0, p[2], 0.42 * f.grow, 0.3 * f.alpha);
        f.m.scale = SIZE[f.side] * f.grow;
        const gk = f.glow ? Math.sin(f.glow.t / 40 * PI) * (0.6 + 0.4 * Math.sin(f.glow.t * 0.5)) : 0;
        const opt = f.flash > 0 && f.flash % 4 < 2 ? { add: [0.7, 0.7, 0.7] } : f.alpha < 1 ? { blend: 'alpha', tint: [1, 1, 1, f.alpha] } : gk > 0 ? { add: f.glow.col.map(v => v * gk) } : null;
        const dn = f.down || 0, dim = dn > 0 && !opt ? { tint: [1 - 0.35 * dn, 1 - 0.35 * dn, 1 - 0.3 * dn, 1] } : opt;
        MG.drawModel(f.m, [p[0] + f.dx + sx, f.dy - 0.05 * dn, p[2] + f.dx * -0.8], yaw, -0.5 * dn, 0, dim);
      }
      if (this.nut) {   // the Kupo Nut: an arc from our side, then a wobble on the foe's pad
        const a = this.nut.from || [POS.me[0], 0.6, POS.me[2]], b = [POS.foe[0] - 0.05, 0.62, POS.foe[2] + 0.25], k = Math.min(1, this.nut.t);
        const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k, y = a[1] + (b[1] - a[1]) * k + Math.sin(k * PI) * 0.35;
        MG.put(M.nut, [x, Math.max(0.08, y), z], [k * 14, 0, k * 5], 0.11, this.nut.gold ? { tint: [1.4, 1.2, 0.5, 1] } : null);
      }
      // the field effects, for as long as they last (js/kupomon/kp_fieldfx.js: the terrain, the zones, each side's
      // conditions and hazards in 3D; the weather over the picture below)
      if (KP.fieldFx && !this._fxBroken) { try { KP.fieldFx.draw3d(this, at, face); } catch (e) { this._fxBroken = true; console.warn('Kupomon field effects:', e); } }
      if (FF7.fx && FF7.fx.draw3d) FF7.fx.draw3d(this.cam, null);   // (the moves' effects, depth-tested against the moogles)
      GL.end();
      if (KP.fieldFx && !this._fxBroken) { try { KP.fieldFx.draw2d(this); } catch (e) { this._fxBroken = true; console.warn('Kupomon field effects:', e); } }
      if (FF7.fx && FF7.fx.render) FF7.fx.render();
      this.drawPops();
      this.drawThought();
      this.drawUi();
      this.drawWearBanner();
      this.drawAuto();
      // the opening: from black, the bars drawing back
      const ob = 1 - ease(Math.min(1, (this.open || 0) * 2.2));
      if (ob > 0) { R.ctx.fillStyle = '#000'; R.ctx.fillRect(0, 0, W, H / 2 * ob); R.ctx.fillRect(0, H - H / 2 * ob, W, H / 2 * ob); }
    }
    // the stat words, floating up off the moogle and fading
    drawPops() {
      const c = R.ctx;
      for (const f of [this.foe, this.me]) {
        if (!f || !f.pops.length) continue;
        const p = POS[f.side], q = this.cam.project([p[0] + (f.side === 'me' ? 0.45 : 0), f.side === 'me' ? 0.95 : 1.35, p[2]]); if (!q.visible) continue;
        f.pops.forEach((pp, i) => {
          const k = pp.t / 70, a = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1;
          c.save(); c.globalAlpha = Math.max(0, a);
          R.text(pp.text, q.x, q.y - 10 - pp.t * 0.55 - i * 20, { size: 18, weight: '800', align: 'center', color: pp.col, shadowColor: 'rgba(0,0,20,0.85)' });
          c.restore();
        });
      }
    }
    // the tags under (or over) a box, as Showdown shows them: a lasting status, each stat stage as its multiplier
    // (green up, red down), the battle-only ailments
    // (every one shown: they wrap into rows inside maxW, ours upward from above its box, the foe's downward: a long
    // row ran off the screen's edge before, so a move that changed two stats seemed to show one)
    drawTags(f, x, y, maxW, up) {
      const mon = f.mon, L = [];
      if (mon.status) L.push({ status: mon.status, w: 38 });
      for (const k of ['atk', 'def', 'mag', 'res', 'spd', 'crit']) {
        const s = f.st[k] || 0; if (!s) continue;
        L.push({ text: k === 'crit' ? `Crit +${s}` : `${+stageMul(s).toFixed(2)}× ${STAT_ABBR[k]}`, col: s > 0 ? '#2f8a46' : '#b03a34' });
      }
      if (f.vol.confuse > 0) L.push({ text: 'Confused', col: '#8a50b0' });
      if (f.vol.berserk) L.push({ text: 'Berserk', col: '#c05020' });
      if (f.vol.doom > 0) L.push({ text: `Doom ${f.vol.doom}`, col: '#4a3060' });
      // the expansion's states (kp_mech.js KP.VOLATILES), a bind, a charge, a recharge
      for (const k of ['taunt', 'leech', 'yawn', 'curse', 'block', 'suppressed', 'decoy', 'regen', 'float', 'lockOn', 'destiny', 'encore', 'perish']) {
        const v = f.vol[k], V = KP.VOLATILES[k]; if (!v || !V) continue;
        L.push({ text: k === 'encore' ? `${V.name} ${v.turns}` : k === 'perish' ? `Perish ${Math.max(0, v - 1)}` : typeof v === 'number' && (k === 'taunt' || k === 'float') ? `${V.name} ${v}` : V.name, col: V.col });
      }
      if (f.vol.bound) L.push({ text: 'Bound', col: '#8a6a3a' });
      if (f.vol.charging) L.push({ text: 'Charging', col: '#c0a030' });
      if (f.vol.recharge) L.push({ text: 'Recharging', col: '#806040' });
      // its side's conditions and hazards (Showdown shows them by the side)
      const sd = this.sides && this.sides[f.side];
      if (sd) {
        for (const k of Object.keys(sd.cond)) { const S = KP.SIDE_CONDS[k]; if (S) L.push({ text: `${S.name} ${sd.cond[k]}`, col: S.col }); }
        for (const k of Object.keys(sd.haz)) { const Z = KP.HAZARDS[k]; if (Z) L.push({ text: Z.max > 1 ? `${Z.name} ×${sd.haz[k]}` : Z.name, col: Z.col }); }
      }
      const fs = Math.round(15 * 0.66), lim = maxW || W;
      let cx = x, cy = y;
      for (const it of L) {
        const w = it.w || Math.ceil(R.measure(it.text, fs, '800')) + 12;
        if (cx > x && cx + w > x + lim) { cx = x; cy += up ? -18 : 18; }
        if (it.status) KP.statusBadge(it.status, cx, cy, 38, 15); else KP.tag(it.text, cx, cy, it.col);
        cx += w + 4;
      }
    }
    // the field (the weather, the terrain, the zones), up the middle of the top
    drawField() {
      const L = [], Tn = Math.max(1, this.turn || 0), WT = KP.WEAR_TURN;
      // (the turn counter: the user, 2026-10-03, "battles should show a turn counter")
      const turnTag = Tn >= WT ? [`Turn ${Tn}  Worn out ${Math.ceil((Tn - WT + 1) / 10)}/16 HP`, '#b03030']
        : Tn >= WT - 10 ? [`Turn ${Tn} / ${WT}`, '#c07a18'] : [`Turn ${Tn}`, '#4a5878'];
      if (this.wx) { const W = KP.WEATHERS[this.wx.id]; L.push([W.name + (this.wx.extreme ? '' : ` ${this.wx.turns}`), W.col]); }
      if (this.terrain) { const T = KP.TERRAINS[this.terrain.id]; L.push([`${T.name} ${this.terrain.turns}`, T.col]); }
      for (const k of Object.keys(this.rooms || {})) L.push([`${KP.ROOMS[k].name} ${this.rooms[k]}`, KP.ROOMS[k].col]);
      // (the turn counter on the right, a size up from the field's chips, from the first turn on: not over the opening)
      const wOf = (t, h) => Math.ceil(R.measure(t, Math.round(h * 0.66), '800')) + 12, TH = 20;
      let x = W - 24 - (this.turn ? wOf(turnTag[0], TH) + 6 : 0) - L.reduce((a, [t]) => a + wOf(t, 13) + 6, 0);
      for (const [t, col] of L) x += KP.tag(t, x, 11, col, 13) + 6;
      if (this.turn) KP.tag(turnTag[0], x, 7, turnTag[1], TH);
    }
    // the wear-out's notice: a band across the middle of the screen, sliding in, held, fading (amber five turns ahead,
    // red when it starts), over the moogles and under nothing
    drawWearBanner() {
      const b = this.wearBanner; if (!b) return;
      const age = this.t - b.t0, LIFE = 170;
      if (age < 0 || age > LIFE) { this.wearBanner = null; return; }
      const inK = ease(Math.min(1, age / 14)), outK = Math.min(1, (LIFE - age) / 20), a = Math.min(inK, outK);
      const c = R.ctx, bh = 78, by = Math.round(H * 0.34), col = b.warn ? '#c07a18' : '#b03030';
      const title = b.warn ? `${KP.WEAR_WARN} TURNS LEFT` : 'WORN OUT!';
      const sub = b.warn ? `From turn ${KP.WEAR_TURN}, both moogles lose HP every turn` : 'Both moogles lose HP every turn, more every 10 turns';
      c.save(); c.globalAlpha = a;
      const off = (1 - inK) * -W;
      const g = c.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, 'rgba(10,10,24,0.86)'); g.addColorStop(1, 'rgba(10,10,24,0.92)');
      c.fillStyle = g; c.fillRect(off, by, W, bh);
      c.fillStyle = col; c.fillRect(off, by, W, 4); c.fillRect(off, by + bh - 4, W, 4);
      const pulse = b.warn ? 1 : 0.85 + 0.15 * Math.sin(age * 0.25);
      R.text(title, W / 2 + off, by + 12, { size: 30, weight: '800', align: 'center', color: b.warn ? '#ffd27a' : `rgba(255,${Math.round(120 * pulse)},${Math.round(110 * pulse)},1)` });
      R.text(sub, W / 2 + off, by + 50, { size: 14, align: 'center', color: '#e8e8f0' });
      c.restore();
    }
    // the wild moogle thinking over its Kupo Nut: a bubble over its head, filling with dots, then ! or x or a heart
    drawThought() {
      const f = this.foe; if (!f || !f.think) return;
      const p = POS.foe, q = this.cam.project([p[0], 1.45, p[2]]); if (!q.visible) return;
      const c = R.ctx, x = q.x + 34, y = q.y - 30;
      c.save(); c.fillStyle = '#ffffff'; c.strokeStyle = '#303040'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(x, y, 34, 22, 0, 0, PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(x - 26, y + 24, 6, 0, PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.arc(x - 36, y + 34, 3.5, 0, PI * 2); c.fill(); c.stroke();
      c.restore();
      const t = f.think.mark || '.'.repeat(f.think.dots || 0);
      R.text(t, x, y - 13, { size: f.think.mark ? 24 : 26, align: 'center', weight: '800', color: f.think.mark === '×' ? '#d03030' : f.think.mark === '♥' ? '#e0408a' : '#303040', shadow: false });
    }
    box(f, x, y, w, mine) {
      const mon = f.mon, sp = KP.sp(mon), lv = f.lvShown != null ? f.lvShown : mon.lv;
      const max = KP.stat({ sp: mon.sp, lv, plus: mon.plus }, 'hp');
      R.window(x, y, w, mine ? 80 : 60);
      // (a watched bout: whose moogle each is, the lower box being the left trainer's, not the player's)
      const own = this.o.spectate ? ((mine ? this.o.spectate.name : this.o.trainer && this.o.trainer.name) || '') : '';
      const nm = (own ? own + "'s " : '') + KP.name(mon), room = w - 70 - (mon.plus ? 26 : 0);
      R.textFit(nm, x + 12, y + 7, room, { size: 16, minSize: 11, color: own ? '#cfe6ff' : R.COL.white });
      let after = x + 12 + Math.min(room, R.measure(nm, 16));
      if (mon.plus) { const pl = '+' + mon.plus; R.text(pl, after + 5, y + 9, { size: 13, weight: '800', color: '#ffd860' }); after += 5 + R.measure(pl, 13); }   // (bred: its "+")
      if (!mine && this.o.kind === 'wild' && this.d.dex.caught[mon.sp]) KP.pomIcon(after + 14, y + 14, 6);   // (one of yours already)
      R.text('Lv' + lv, x + w - 12, y + 7, { size: 14, align: 'right', color: f.lvFlash > 0 && f.lvFlash % 8 < 4 ? '#ffe060' : R.COL.white });
      // the type badge (two gems for two types); the HP bar
      if (sp.type2) { KP.typeGem(sp.type, x + 21, y + 37, 8); KP.typeGem(sp.type2, x + 41, y + 37, 8); }
      else KP.typeBadge(sp.type, x + 12, y + 29, 80, 16);
      const hp = Math.min(max, Math.max(0, f.hpShown)), frac = hp / max, col = frac > 0.5 ? '#40d060' : frac > 0.2 ? '#e0c030' : '#e04040';
      R.text('HP', x + 100, y + 30, { size: 11, color: '#e0c040' });
      R.bar(x + 122, y + 34, w - 134, 7, frac, col, col);
      if (mine) {
        R.text(`${Math.round(hp)} / ${max}`, x + w - 12, y + 46, { size: 13, align: 'right' });
        const e = f.expShown != null ? f.expShown : mon.exp, a = KP.expAt(mon, lv), b = KP.expAt(mon, Math.min(KP.MAX_LEVEL, lv + 1));
        R.text('EXP', x + 12, y + 61, { size: 10, color: '#80c8ff' });
        R.bar(x + 40, y + 65, w - 52, 5, lv >= KP.MAX_LEVEL ? 1 : Math.min(1, (e - a) / Math.max(1, b - a)), '#40a0f0', '#a0e0ff');
      }
      this.drawTags(f, x + 6, mine ? y - 20 : y + 64, w - 12, mine);
      if (f.abPop) {   // the ability that just worked, on a banner sliding out by the box
        const k = Math.min(1, (90 - f.abPop.t) / 10, f.abPop.t / 10), bx = mine ? x - 6 - 190 * k : x + w + 6 - 190 * (1 - k), by = mine ? y + 8 : y + 8;
        R.ctx.save(); R.ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.2));
        R.window(bx, by, 190, 40);
        R.textFit(`${f.name}'s`, bx + 12, by + 5, 166, { size: 11, minSize: 9, color: R.COL.gray });
        R.textFit(f.abPop.text, bx + 12, by + 19, 166, { size: 14, minSize: 10, color: '#a0d8ff' });
        R.ctx.restore();
      }
    }
    drawUi() {
      if (this.foe && this.foe.grow > 0 && (!this.foe.gone || this.befriending)) this.box(this.foe, 24, 24, 280, false);
      this.drawField();
      if (this.me && this.me.grow > 0 && !this.me.gone) this.box(this.me, W - 304, H - 200, 280, true);
      // the bottom: the message, and the menus
      R.window(0, H - 112, W, 112);
      const u = this.ui;
      if (u && u.kind === 'moves') return this.drawMoves(u);
      if (u && u.kind === 'nut') return this.drawNuts(u);
      if (this.text) R.para(this.text, 22, H - 96, u && u.kind === 'command' ? 330 : W - 44, { size: 17, minSize: 14, lines: 3 });
      if (u && u.kind === 'command' && !this.o.spectate) R.text(`${FF7.input.label('auto')}: Auto`, W - 8, H - 128, { size: 12, align: 'right', color: 'rgba(200,210,240,0.7)' });   // (the player's own key)
      if (u && u.kind === 'command') {
        R.window(W - 268, H - 112, 268, 112);
        ['FIGHT', 'MOOGLES', 'BAG', 'RUN'].forEach((t, i) => R.text(t, W - 236 + (i % 2) * 124, H - 92 + Math.floor(i / 2) * 44, (i === 2 && this.o.noBag) || (i === 3 && this.o.kind !== 'wild') ? { size: 17, color: R.COL.gray } : { size: 17 }));   // (BAG and RUN greyed when they're off)
        R.cursor(W - 250 + (u.idx % 2) * 124, H - 81 + Math.floor(u.idx / 2) * 44);
      }
      if (u && u.kind === 'party') this.drawParty(u);
      if (u && u.kind === 'bag') this.drawBag(u);
    }
    // the Auto badge: while it plays, and a moment when it's turned on or off
    drawAuto() {
      if (this.o.spectate || !(this.autoOn() || this.autoPop)) return;
      const on = this.autoOn(), a = this.autoPop ? Math.min(1, (90 - this.autoPop.t) / 20) : 1, pulse = 0.75 + 0.25 * Math.sin(this.t * 0.12);
      R.ctx.save(); R.ctx.globalAlpha = on ? Math.max(a, 0.9) : a;
      const x = W - 126, y = 38;   // (top right, under the turn counter: clear of the foe's box)
      R.window(x, y, 118, 30);
      R.text(on ? 'AUTO' : 'AUTO OFF', x + 12, y + 7, { size: 14, weight: '800', color: on ? `rgba(120,255,160,${pulse})` : '#c0c4d0' });
      R.text(FF7.input.label('auto'), x + 108, y + 9, { size: 11, align: 'right', color: 'rgba(200,210,240,0.7)' });
      R.ctx.restore();
    }
    drawMoves(u) {
      const ms = this.me.mon.moves, c = this.cds(this.me.mon), y0 = H - 96;
      ms.forEach((id, i) => {
        const mv = moveOf(id), x = 32 + (i % 2) * 200, y = y0 + Math.floor(i / 2) * 44, ok = this.usable(this.me, id);
        KP.typeGem(mv.type, x + 9, y + 11, 8);
        R.text(mv.name, x + 22, y, { size: 16, color: ok ? R.COL.white : R.COL.gray });
        const hint = effHint(mv, this.foe && this.foe.mon);
        if (hint) KP.tag(hint.text, x + 22, y + 21, hint.col, 13);
        if ((c[id] || 0) > 0) R.text('wait ' + c[id], x + 180, y + 2, { size: 12, align: 'right', color: '#e0a040' });
      });
      R.cursor(28 + (u.idx % 2) * 200, y0 + 11 + Math.floor(u.idx / 2) * 44);
      const mv = moveOf(ms[u.idx]);
      if (mv) {
        R.window(W - 230, H - 112, 230, 112);
        if (mv.type) KP.typeBadge(mv.type, W - 216, H - 102, 90, 16); else R.text('No type', W - 216, H - 100, { size: 13, color: R.COL.gray });
        const hint = effHint(mv, this.foe && this.foe.mon);
        if (hint) KP.tag(hint.text, W - 120, H - 101, hint.col, 14);
        if (mv.heal && !mv.power) R.text(`Heals ${Math.round(this.healFrac(this.me.mon, mv) * 100)}% of its HP`, W - 216, H - 80, { size: 13, color: this.healUses[this.me.mon.uid] ? '#e0a040' : R.COL.white });
        else R.text(`Power ${mv.power || '—'}   Acc ${mv.acc}`, W - 216, H - 80, { size: 13 });
        R.text(`${KP.CATEGORY_LABEL ? KP.CATEGORY_LABEL[KP.category(mv)] : ''}   Cooldown ${mv.cd ? mv.cd + ' turn' + (mv.cd > 1 ? 's' : '') : 'none'}`, W - 216, H - 60, { size: 13 });
        R.para(mv.desc || '', W - 216, H - 40, 204, { size: 11, minSize: 9, lines: 2, lineH: 13, color: R.COL.gray });
      }
    }
    drawParty(u) {
      const P = this.d.party;
      R.window(80, 40, W - 160, 52 + P.length * 46);
      R.text(u.item ? `Use ${KP.ITEMS[u.item].name} on which moogle?` : u.forced ? 'Send out which moogle?' : 'Switch to which moogle?', 100, 52, { size: 15, color: R.COL.cyan });
      P.forEach((m, i) => {
        const y = 84 + i * 46, max = KP.maxHp(m), down = m.hp <= 0;
        R.text(KP.name(m), 120, y, { size: 16, color: down ? R.COL.gray : R.COL.white });
        R.text(KP.jobName(m) + '  Lv' + m.lv, 120, y + 20, { size: 12, color: R.COL.gray });
        KP.typeBadge(KP.typeOf(m), 222, y + 3, 80, 16);
        R.bar(310, y + 8, 170, 7, m.hp / max, '#40d060', '#40d060');
        R.text(`${m.hp}/${max}`, W - 100, y + 2, { size: 13, align: 'right' });
        if (m.status) KP.statusBadge(m.status, 310, y + 20, 38, 15);
      });
      R.cursor(104, 95 + u.idx * 46);
    }
    // the nut menu: every nut you have (a scrolling list), a "Bonus" tag on the ones extra tasty to this moogle right
    // now, and what the highlighted one does under the question
    drawNuts(u) {
      const L = NUTS().filter(k => (this.d.bag[k] || 0) > 0).concat([null]), n = L.length, show = Math.min(7, n);
      const top = Math.max(0, Math.min(u.idx - 3, n - show)), h = 24 + show * 28, w = 300, x = 14, y = H - 118 - h;   // (on our side: the moogle it's for stays in view)
      R.window(x, y, w, h);
      const mon = this.foe && this.foe.mon;
      for (let i = top; i < top + show; i++) {
        const k = L[i], yy = y + 12 + (i - top) * 28;
        if (!k) { R.text('Leave it', x + 40, yy, { size: 15, color: R.COL.gray }); continue; }
        R.textFit(KP.ITEMS[k].name, x + 40, yy, 150, { size: 15, minSize: 12 });
        if (KP.ITEMS[k].nut >= 255) KP.tag('Sure thing', x + 194, yy + 2, '#8a50b0', 14);
        else if (mon && KP.nutBonus(this, mon, k) > 1) KP.tag('Bonus', x + 194, yy + 2, '#2f8a46', 14);
        R.text('x' + this.d.bag[k], x + w - 14, yy, { size: 14, align: 'right' });
      }
      if (top > 0) R.text('▲', x + w / 2, y + 2, { size: 9, align: 'center', color: R.COL.gray });
      if (top + show < n) R.text('▼', x + w / 2, y + h - 12, { size: 9, align: 'center', color: R.COL.gray });
      R.cursor(x + 24, y + 23 + (u.idx - top) * 28);
      const it = KP.ITEMS[L[u.idx]];
      R.window(0, H - 112, W, 112);
      R.para(this.text || '', 22, H - 100, W - 44, { size: 15, minSize: 13, lines: 1 });
      R.para(it ? it.desc : 'Let it go.', 22, H - 72, W - 44, { size: 14, minSize: 12, lines: 3, color: '#c0c8e0' });
    }
    drawBag(u) {
      const pk = u.pocket || 0, L = KP.pocketItems(BATTLE_POCKETS[pk], this.d.bag), rows = 8, top = KP.listTop(u.idx, L.length, rows);
      R.window(W - 300, 40, 280, 76 + Math.max(1, Math.min(rows, L.length)) * 30);
      KP.drawPockets(BATTLE_POCKETS, pk, W - 290, 50, 260);
      if (!L.length) { R.text('Nothing in this pocket.', W - 260, 86, { size: 15, color: R.COL.gray }); return; }
      L.slice(top, top + rows).forEach((k, j) => KP.drawBagRow(k, W - 260, 86 + j * 30, 224, this.d.bag[k]));
      KP.drawScroll(W - 30, 86, Math.min(rows, L.length) * 30, top, rows, L.length);
      R.cursor(W - 276, 97 + (u.idx - top) * 30);
      const it = KP.ITEMS[L[u.idx]]; if (it) { R.window(0, H - 112, W - 304, 112); R.para(it.desc, 22, H - 96, W - 340, { size: 14, minSize: 11, lines: 4 }); }
    }
  }
  KP.Battle = Battle;
})();

// Kupomon's battle mechanics, the expansion (docs/KUPOMON_MECHANICS.md: the vocabulary the moves, abilities and held
// items are written in). What's here is data and small rules; the battle (js/kupomon/kp_battle.js) runs them.
//  * five more lasting statuses (Burn, Slow, Venom, Zombie, Mini), and the battle-only states a moogle can be in
//    (Taunt, Seeded, Bound, Decoy, Drowsy, Cursed, Regen, Float, Lock-On...: Fighter.vol)
//  * the field: one weather (Radiance, Gloom, Sandstorm, Manastorm), one terrain (Rhythm Field, Lifestream, Fog, Time
//    Field), and the zones (Time Warp, Gravity, Null Zone, Wonder Zone)
//  * each side's conditions: the walls (Protect, Shell, Veil), Tailwind, Safeguard, Mist; and the hazards laid on it
//    (Caltrops, Landmines, Venom Spikes, Web)
//  * the moves' variable power (KP.POWER_BY) and type (typeBy)
//  * the ability and held-item effect keys (KP.ABILITY_EFFECTS, KP.ITEM_EFFECTS): each key compiles to handlers, the
//    damage maths' (kp_calc.js: a multiplier) and the battle's events (generators: B.fire)
(function () {
  const KP = FF7.kupomon = FF7.kupomon || {};
  const tr = (n) => n >>> 0;
  const typesOf = (mon) => { const s = KP.sp(mon); return [s.type, s.type2].filter(Boolean); };
  const hpFrac = (f) => f.mon.hp / Math.max(1, KP.maxHp(f.mon));
  const flagsOf = (mv) => (mv && mv.flags) || [];
  KP.hasFlag = (mv, fl) => flagsOf(mv).includes(fl) || (fl === 'recoil' && !!(mv && mv.recoil));

  // ------------------------------------------------------------------ statuses
  // lasting, one at a time (KP.STATUS, kp_data.js): Burn (1/16 a turn, its physical hits halved), Slow (Speed halved, a
  // quarter of its turns lost), Venom (1/16, 2/16, 3/16... a turn: badly poisoned), Zombie (healing hurts it, White Mage
  // moves hit it twice as hard), Mini (its Defense and Resistance halved)
  Object.assign(KP.STATUS, {
    burn: { name: 'Burn', short: 'BRN', col: '#e0602a', lasting: true, verb: 'was burned' },
    slow: { name: 'Slow', short: 'SLW', col: '#4a90c8', lasting: true, verb: 'was slowed down' },
    venom: { name: 'Venom', short: 'VEN', col: '#6a1a8a', lasting: true, verb: 'was badly poisoned' },
    zombie: { name: 'Zombie', short: 'ZMB', col: '#5a7a40', lasting: true, verb: 'became a zombie' },
    mini: { name: 'Mini', short: 'MIN', col: '#c87ab0', lasting: true, verb: 'shrank to Mini size' },
  });
  KP.POISONED = (mon) => mon.status === 'poison' || mon.status === 'venom';

  // the battle-only states (f.vol), the ones a move can give with vol: { ... } (and their tags in battle)
  KP.VOLATILES = {
    taunt: { name: 'Taunt', col: '#c04040', foe: true, turns: 3, start: 'fell for the taunt!', end: 'shook off the taunt.' },
    leech: { name: 'Seeded', col: '#4a9a3a', foe: true, start: 'was seeded!' },
    yawn: { name: 'Drowsy', col: '#7a8aa0', foe: true, start: 'grew drowsy!' },
    curse: { name: 'Cursed', col: '#4a3060', foe: true, start: 'was cursed!' },
    block: { name: 'Trapped', col: '#806040', foe: true, start: "can't escape now!" },
    suppressed: { name: 'No Ability', col: '#606060', foe: true, start: "lost its ability!" },
    decoy: { name: 'Decoy', col: '#a0a0b0', start: 'put out a Decoy!' },
    regen: { name: 'Regen', col: '#40b080', start: 'is wrapped in a soft glow!' },
    float: { name: 'Float', col: '#80c0f0', turns: 5, start: 'floated up into the air!', end: 'came back down.' },
    lockOn: { name: 'Lock-On', col: '#d08030', start: 'took aim!' },
    destiny: { name: 'Destiny', col: '#402040', start: 'is trying to take its foe down with it!' },
    focus: { name: 'Focused', col: '#d0a030', start: 'is getting pumped!' },
    reflect: { name: 'Reflect', col: '#80a0ff', start: 'put up a Reflect!' },
    // (the missing tools, content/kp_c03_tools.js: Encore locks the foe into its last move; Last Refrain's countdown)
    encore: { name: 'Encore', col: '#d070b0', foe: true, turns: 3, start: 'got an encore!', end: 'is free of the encore.' },
    perish: { name: 'Refrain', col: '#503060', start: 'heard the Last Refrain!' },
  };

  // ------------------------------------------------------------------ the field
  // a weather: its moves' multipliers by type (Showdown's WeatherModifyDamage: before the critical hit), its chip at the
  // end of each turn (the safe types aside), a stat it raises for a type; 5 turns (8 with the matching held item)
  KP.WEATHERS = {
    radiance: { name: 'Radiance', col: '#f0d060', mul: { whitemage: 1.5, summoner: 0.5 }, start: 'A radiant light fills the field!', on: 'The light shines on.', end: 'The radiance faded.' },
    gloom: { name: 'Gloom', col: '#4a4a7a', mul: { summoner: 1.5, whitemage: 0.5 }, start: 'A heavy gloom settles over the field!', on: 'The gloom lingers.', end: 'The gloom lifted.' },
    sandstorm: { name: 'Sandstorm', col: '#c8a060', chip: 1 / 16, safe: ['beast', 'knight', 'machinist'], stat: { beast: { res: 1.5 } }, start: 'A sandstorm kicked up!', on: 'The sandstorm rages.', end: 'The sandstorm subsided.' },
    manastorm: { name: 'Manastorm', col: '#8a5ad0', mul: { blackmage: 1.5, machinist: 0.5 }, start: 'Raw mana storms across the field!', on: 'The manastorm crackles.', end: 'The manastorm died down.' },
  };
  // a terrain (on the ground: a floating moogle is out of it): its type x1.3 for the grounded, and its rule; 5 turns
  KP.TERRAINS = {
    rhythm: { name: 'Rhythm Field', col: '#e070c0', boost: 'bard', noSleep: true, start: 'A rousing rhythm fills the ground!', end: 'The rhythm faded away.' },
    lifestream: { name: 'Lifestream', col: '#40c090', boost: 'beast', heal: 1 / 16, start: 'The Lifestream wells up underfoot!', end: 'The Lifestream sank away.' },
    fog: { name: 'Fog', col: '#c0c8d8', weaken: 'dragoon', noStatus: true, start: 'A soft fog rolls over the ground!', end: 'The fog cleared.' },
    chrono: { name: 'Time Field', col: '#d8b830', boost: 'timemage', noPrio: true, start: 'Time thickens over the ground!', end: 'Time flows freely again.' },
  };
  // the zones (each its own, any at once; using the move again ends it): 5 turns
  KP.ROOMS = {
    timewarp: { name: 'Time Warp', col: '#c0a0ff', start: 'twisted time! The slowest now move first!', end: 'Time untwisted.' },
    gravity: { name: 'Gravity', col: '#806090', start: 'made gravity intensify!', end: 'Gravity returned to normal.' },
    nullzone: { name: 'Null Zone', col: '#707080', start: 'made held items lose their power!', end: 'Held items work again.' },
    wonderzone: { name: 'Wonder Zone', col: '#a080c0', start: 'swapped everyone\'s Defense and Resistance!', end: 'Defense and Resistance are back to normal.' },
  };
  // the weather a typeBy: 'weather' move takes, and the terrain a typeBy: 'terrain' one does
  KP.WEATHER_TYPE = { radiance: 'whitemage', gloom: 'summoner', sandstorm: 'beast', manastorm: 'blackmage' };
  KP.TERRAIN_TYPE = { rhythm: 'bard', lifestream: 'beast', fog: 'whitemage', chrono: 'timemage' };

  // ------------------------------------------------------------------ each side
  KP.SIDE_CONDS = {
    wall: { name: 'Protect', col: '#5a8ad0', turns: 5, cat: 'physical', start: 'Protect went up! Physical hits on {side} are halved.', end: "{side}'s Protect wore off." },
    shell: { name: 'Shell', col: '#8a5ad0', turns: 5, cat: 'magic', start: 'Shell went up! Magic hits on {side} are halved.', end: "{side}'s Shell wore off." },
    veil: { name: 'Veil', col: '#60c0d0', turns: 5, cat: 'both', needs: 'radiance', start: 'A shining Veil went up! Every hit on {side} is halved.', end: "{side}'s Veil faded." },
    tailwind: { name: 'Tailwind', col: '#80d0a0', turns: 4, start: 'A tailwind blows behind {side}!', end: "{side}'s tailwind petered out." },
    safeguard: { name: 'Safeguard', col: '#a0d0f0', turns: 5, start: '{side} is cloaked in a mystical veil!', end: "{side}'s Safeguard wore off." },
    mist: { name: 'Mist', col: '#c0d8e8', turns: 5, start: '{side} is shrouded in mist!', end: "{side}'s Mist faded." },
  };
  KP.HAZARDS = {
    caltrops: { name: 'Caltrops', col: '#8a8a7a', max: 3, grounded: true, dmg: [1 / 8, 1 / 6, 1 / 4], start: 'Caltrops are scattered around {side}!' },
    mines: { name: 'Landmines', col: '#7a6a5a', max: 1, type: 'machinist', dmg: [1 / 8], start: 'Landmines are buried around {side}!' },
    venom_spikes: { name: 'Venom Spikes', col: '#7a3a9a', max: 2, grounded: true, start: 'Venom spikes are scattered around {side}!' },
    web: { name: 'Web', col: '#c8c8b0', max: 1, grounded: true, boosts: { spd: -1 }, start: 'A sticky web spreads out around {side}!' },
  };

  // ------------------------------------------------------------------ on the ground, or not: a floating moogle (an ability
  // with float, the Float state, a Balloon not yet popped) is out of reach of Monk moves, the ground's hazards and terrain;
  // Gravity and an Iron Ball bring everyone down
  KP.grounded = (B, f) => {
    if (!f || !f.mon) return true;
    if (B && B.rooms && B.rooms.gravity) return true;
    if (B && B.heldOf && (KP.ITEMS[B.heldOf(f)] || {}).ironBall) return true;
    const ab = B && B.ab ? B.ab(f) : (KP.abilityOf ? KP.abilityOf(f.mon) : null);
    if (ab && (ab.float || ab.id === 'float')) return false;
    if (f.vol && f.vol.float) return false;
    const it = B && B.heldOf ? KP.ITEMS[B.heldOf(f)] : null;
    if (it && it.balloon) return false;
    return true;
  };

  // ------------------------------------------------------------------ variable power (a move's powerBy; mv.power is its
  // base where the formula needs one), Showdown's basePowerCallbacks
  const spe = (B, f) => (B && B.speed ? B.speed(f) : KP.speedOf(B, f));
  const posBoosts = (f) => ['atk', 'def', 'mag', 'res', 'spd'].reduce((a, k) => a + Math.max(0, (f.st && f.st[k]) || 0), 0);
  KP.POWER_BY = {
    lowHp: (c) => { const r = tr(48 * c.user.mon.hp / KP.maxHp(c.user.mon)); return r <= 1 ? 200 : r <= 4 ? 150 : r <= 9 ? 100 : r <= 16 ? 80 : r <= 32 ? 40 : 20; },   // Reversal
    highHp: (c) => Math.max(1, tr(150 * c.user.mon.hp / KP.maxHp(c.user.mon))),   // Eruption
    targetHp: (c) => Math.max(1, tr(tr((120 * (100 * tr(c.target.mon.hp * 4096 / KP.maxHp(c.target.mon))) + 2047) / 4096) / 100)),   // Crush Grip
    faster: (c) => { const r = Math.floor(spe(c.B, c.user) / Math.max(1, spe(c.B, c.target))); return r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; },   // Electro Ball
    slower: (c) => Math.min(150, tr(25 * spe(c.B, c.target) / Math.max(1, spe(c.B, c.user))) + 1),   // Gyro Ball
    boosts: (c) => (c.move.power || 20) + 20 * posBoosts(c.user),   // Stored Power
    targetBoosts: (c) => Math.min(200, (c.move.power || 60) + 20 * posBoosts(c.target)),   // Punishment
    targetStatus: (c) => c.move.power * (c.target.mon.status ? 2 : 1),   // Hex
    userStatus: (c) => c.move.power * (c.user.mon.status ? 2 : 1),   // Facade (its Burn doesn't halve it either)
    moveLast: (c) => c.move.power * (c.target.movedThisTurn ? 2 : 1),   // Payback
    hurtFirst: (c) => c.move.power * (c.user.hitThisTurn && c.user.hitThisTurn.by === c.target ? 2 : 1),   // Avalanche
    targetHalf: (c) => c.move.power * (c.target.mon.hp * 2 <= KP.maxHp(c.target.mon) ? 2 : 1),   // Brine
    repeat: (c) => Math.min(160, c.move.power * Math.pow(2, Math.max(0, Math.min(3, (c.user.streak || 1) - 1)))),   // Fury Cutter
    fallen: (c) => c.move.power + 50 * Math.min(5, (c.B && c.B.fainted ? c.B.fainted[c.user.side] : 0) || 0),   // Last Respects
    noItem: (c) => c.move.power * (c.B && c.B.heldOf ? (c.B.heldOf(c.user) ? 1 : 2) : (c.user.mon.held ? 1 : 2)),   // Acrobatics
    weather: (c) => c.move.power * (c.B && c.B.weatherId && c.B.weatherId() ? 2 : 1),   // Weather Ball
    terrain: (c) => c.move.power * (c.B && c.B.terrain && KP.grounded(c.B, c.user) ? 2 : 1),   // Terrain Pulse
  };
  // a move's type this time (typeBy: 'user' its own first type, 'weather', 'terrain'), then the user's handlers
  // (ModifyType: an "-ate" ability)
  KP.moveType = (B, f, mv) => {
    let t = mv.type;
    if (mv.typeBy === 'user' && f) t = KP.sp(f.mon).type;
    else if (mv.typeBy === 'weather' && B && B.weatherId) t = KP.WEATHER_TYPE[B.weatherId()] || t;
    else if (mv.typeBy === 'terrain' && B && B.terrain && KP.grounded(B, f)) t = KP.TERRAIN_TYPE[B.terrain.id] || t;
    if (f && KP.relay) t = KP.relay('ModifyType', { B, user: f, move: mv }, t, f);
    return t;
  };
  // a move with an added effect (Sheer Force's kind and the Shield Dust kind both look at these)
  KP.hasSecondary = (mv) => !!(mv && KP.category(mv) !== 'status' && ((mv.status && mv.status[1] < 100) || (mv.stat && mv.stat[2] === 'foe' && mv.stat[3] != null) || mv.flinch || (mv.foe && mv.foeChance != null && mv.foeChance < 100) || (mv.self && mv.selfChance != null && mv.selfChance < 100)));

  // ------------------------------------------------------------------ the abilities' effect keys
  // KP.ABILITY_EFFECTS[key](value, def) -> a handler object. The damage maths' handlers return a multiplier; the battle's
  // events (onSwitchIn, onSwitchOut, onResidual, onDamagingHit, onAfterHit, onKO, onFaint, onTryHit, onFlinch, onFoeBoost)
  // are generators that may yield* B.say and the battle's other helpers. The keys read straight by the battle (no
  // handler): immune absorb absorbBoost flagImmune noStatus noCrit noMiss noGuard sturdy coins healMul drainMul
  // statusChance expMul magicGuard rockHead shieldDust innerFocus skillLink sheerForce infiltrator moldBreaker unaware
  // noStatDrop mirrorStats contrary simple wonderGuard magicBounce goodAsGold noPriorityAgainst trapFoes runAway anchor
  // float overcoat scrappy truant gorillaTactics disguise steadfast
  const mod = (n) => n;
  const yes = (v) => v === true || typeof v === 'number';
  const sayAb = function* (c, text, frames) { c.B.abilityPop(c.holder, c.ab || c.B.ab(c.holder)); yield* c.B.say(text, frames || 45); };
  KP.ABILITY_EFFECTS = {
    // ---- power and damage
    technician: (v) => ({ onBasePower: (c) => (c.basePower || c.move.power || 0) <= (typeof v === 'number' && v > 1 ? v : 60) ? 1.5 : 1 }),
    flagBoost: (v) => ({ onBasePower: (c) => { let m = 1; for (const fl in v) if (KP.hasFlag(c.move, fl)) m *= v[fl]; return m; } }),
    flagResist: (v) => ({ onSourceModifyDamage: (c) => { let m = 1; for (const fl in v) if (KP.hasFlag(c.move, fl)) m *= v[fl]; return m; } }),
    catResist: (v) => ({ onSourceModifyDamage: (c) => v[c.cat] || 1 }),
    catBoost: (v) => ({ onBasePower: (c) => v[c.cat] || 1 }),
    tintedLens: () => ({ onModifyDamage: (c) => c.eff < 1 ? 2 : 1 }),
    sheerForce: () => ({ onBasePower: (c) => KP.hasSecondary(c.move) ? [5325, 4096] : 1 }),   // (and its moves' added effects never happen: the battle)
    filter: (v) => ({ onSourceModifyDamage: (c) => c.eff > 1 ? (typeof v === 'number' ? v : 0.75) : 1 }),
    multiscale: (v) => ({ onSourceModifyDamage: (c) => c.holder.mon.hp >= KP.maxHp(c.holder.mon) ? (typeof v === 'number' ? v : 0.5) : 1 }),
    sniper: (v) => ({ onModifyDamage: (c) => c.crit ? (typeof v === 'number' ? v : 1.5) : 1 }),
    hustle: () => ({ onModifyAtk: () => 1.5, onModifyAccuracy: (c) => c.cat === 'physical' ? [3277, 4096] : 1 }),
    accMul: (v) => ({ onModifyAccuracy: () => v }),
    evade: (v) => ({ onSourceModifyAccuracy: (c) => v }),
    fieldEvade: (v) => ({ onSourceModifyAccuracy: (c) => (c.B && c.B.fieldIs && Object.keys(v).find(id => c.B.fieldIs(id)) ? v[Object.keys(v).find(id => c.B.fieldIs(id))] : 1) }),
    fieldSpd: (v) => ({ onModifySpe: (c) => { const k = c.B && c.B.fieldIs ? Object.keys(v).find(id => c.B.fieldIs(id)) : null; return k ? v[k] : 1; } }),
    fieldStat: (v) => {   // { fieldId: { stat: mul } } while that weather or terrain is up
      const at = (k) => (c) => { const id = c.B && c.B.fieldIs ? Object.keys(v).find(x => c.B.fieldIs(x)) : null; return id && v[id][k] ? v[id][k] : 1; };
      return { onModifyAtk: at('atk'), onModifyMag: at('mag'), onModifyDef: at('def'), onModifyRes: at('res'), onModifySpe: at('spd') };
    },
    boostHighest: (v) => {   // Protosynthesis' kind: its highest stat x1.3 (Speed x1.5) while that field is up
      const on = (k) => (c) => { const f = c.holder; if (!(c.B && c.B.fieldIs && c.B.fieldIs(v))) return 1; const best = ['atk', 'def', 'mag', 'res', 'spd'].sort((a, b) => KP.stat(f.mon, b) - KP.stat(f.mon, a))[0]; return best === k ? (k === 'spd' ? 1.5 : [5325, 4096]) : 1; };
      return { onModifyAtk: on('atk'), onModifyMag: on('mag'), onModifyDef: on('def'), onModifyRes: on('res'), onModifySpe: on('spd') };
    },
    statusStat: (v) => {   // stats while it has a lasting ailment (Marvel Scale, Quick Feet)
      const on = (k) => (c) => c.holder.mon.status && v[k] ? v[k] : 1;
      return { onModifyAtk: on('atk'), onModifyMag: on('mag'), onModifyDef: on('def'), onModifyRes: on('res'), onModifySpe: on('spd') };
    },
    defeatist: () => ({ onModifyAtk: (c) => hpFrac(c.holder) <= 0.5 ? 0.5 : 1, onModifyMag: (c) => hpFrac(c.holder) <= 0.5 ? 0.5 : 1 }),
    analytic: (v) => ({ onBasePower: (c) => c.target && c.target.movedThisTurn ? (typeof v === 'number' ? v : [5325, 4096]) : 1 }),
    stakeout: (v) => ({ onModifyAtk: (c) => c.target && c.target.inTurn === (c.B && c.B.turn) ? (typeof v === 'number' ? v : 2) : 1, onModifyMag: (c) => c.target && c.target.inTurn === (c.B && c.B.turn) ? (typeof v === 'number' ? v : 2) : 1 }),   // (a foe that came in this turn)
    merciless: () => ({ onModifyCritRatio: (c, r) => c.target && c.target.mon.status ? 5 : r }),
    fallenBoost: (v) => ({ onBasePower: (c) => 1 + (typeof v === 'number' ? v : 0.1) * Math.min(5, (c.B && c.B.fainted ? c.B.fainted[c.user.side] : 0) || 0) }),
    ateType: (v) => ({   // Pixilate's kind: { from, to, mul }
      onModifyType: (c, t) => t === (v.from || 'freelancer') ? v.to : t,
      onBasePower: (c) => c.move.type === (v.from || 'freelancer') && c.moveType === v.to ? (v.mul || [4915, 4096]) : 1,
    }),
    wonderGuard: () => ({}),
    foeStatMul: (v) => ({   // the Ruin kind: the foe's stat lowered while this one is out
      onSourceModifyAtk: () => v.atk || 1, onSourceModifyMag: () => v.mag || 1,
      onFoeModifyDef: () => v.def || 1, onFoeModifyRes: () => v.res || 1,
    }),
    gorillaTactics: () => ({ onModifyAtk: () => 1.5 }),
    flashFire: (v) => ({ onBasePower: (c) => c.holder.flashFire && c.move.type === c.holder.flashFire ? 1.5 : 1 }),
    prankster: () => ({ onModifyPriority: (c, p) => KP.category(c.move) === 'status' ? p + 1 : p }),
    triage: () => ({ onModifyPriority: (c, p) => c.move && (c.move.heal || c.move.drain) ? p + 3 : p }),
    prioType: (v) => ({ onModifyPriority: (c, p) => c.move && c.move.type === v.type && (!v.fullHp || c.holder.mon.hp >= KP.maxHp(c.holder.mon)) ? p + 1 : p }),
    moveLast: () => ({ onModifyPriority: (c, p) => p - 0.1 }),
    unburden: () => ({ onModifySpe: (c) => c.holder.lostItem ? 2 : 1 }),
    // ---- coming out
    setWeather: (v) => ({ *onSwitchIn(c) { yield* c.B.setWeather(v, c.holder, { ability: true }); } }),
    setTerrain: (v) => ({ *onSwitchIn(c) { yield* c.B.setTerrain(v, c.holder, { ability: true }); } }),
    setRoom: (v) => ({ *onSwitchIn(c) { yield* c.B.setRoom(v, c.holder, { ability: true }); } }),
    trace: () => ({
      *onSwitchIn(c) {
        const o = c.B.foeOf(c.holder), oa = o && !o.gone ? c.B.ab(o) : null;
        if (!oa || oa.trace || oa.legend) return;
        const me = c.B.ab(c.holder); c.holder.abOverride = oa.id;
        c.B.abilityPop(c.holder, me); yield* c.B.say(`${c.B.nm(c.holder)} traced ${c.B.nm(o)}'s ${oa.name}!`, 50);
        yield* c.B.fire('onSwitchIn', c.holder, {});
      },
    }),
    download: () => ({
      *onSwitchIn(c) {
        const o = c.B.foeOf(c.holder); if (!o || o.gone) return;
        const k = o.stat('def') < o.stat('res') ? 'atk' : 'mag';
        yield* c.B.boost(c.holder, { [k]: 1 }, c.holder, { ab: c.B.ab(c.holder) });
      },
    }),
    frisk: () => ({
      *onSwitchIn(c) {
        const o = c.B.foeOf(c.holder), it = o && c.B.heldOf(o); if (!it) return;
        yield* sayAb(c, `${c.B.nm(c.holder)} frisked ${c.B.nm(o)} and found its ${KP.ITEMS[it].name}!`);
      },
    }),
    announce: (v) => ({ *onSwitchIn(c) { yield* sayAb(c, `${c.B.nm(c.holder)} ${v}`); } }),   // (Pressure's kind: a line on coming out)
    onEnterBoosts: (v) => ({   // several stages at once on coming out ({ self: {...}, foe: {...} })
      *onSwitchIn(c) {
        if (v.self) yield* c.B.boost(c.holder, v.self, c.holder, { ab: c.B.ab(c.holder) });
        const o = c.B.foeOf(c.holder); if (v.foe && o && !o.gone) yield* c.B.boost(o, v.foe, c.holder, { ab: c.B.ab(c.holder), fromFoe: true });
      },
    }),
    // ---- at the end of each turn
    onResidualBoost: (v) => ({ *onResidual(c) { if (c.holder.inTurn === c.B.turn) return; yield* c.B.boost(c.holder, v, c.holder, { ab: c.B.ab(c.holder) }); } }),
    moody: () => ({
      *onResidual(c) {
        const f = c.holder, ks = ['atk', 'def', 'mag', 'res', 'spd'];
        const up = ks.filter(k => (f.st[k] || 0) < 6), u = up[Math.floor(Math.random() * up.length)];
        const dn = ks.filter(k => k !== u && (f.st[k] || 0) > -6), d = dn[Math.floor(Math.random() * dn.length)];
        const b = {}; if (u) b[u] = 2; if (d) b[d] = -1;
        yield* c.B.boost(f, b, f, { ab: c.B.ab(f) });
      },
    }),
    shedSkin: (v) => ({ *onResidual(c) { const f = c.holder; if (f.mon.status && Math.random() * 100 < (typeof v === 'number' ? v : 33)) { c.B.abilityPop(f, c.B.ab(f)); yield* c.B.cureStatus(f, `${c.B.nm(f)} shed its ailment!`); } } }),
    fieldHeal: (v) => ({ *onResidual(c) { const id = Object.keys(v).find(x => c.B.fieldIs(x)); if (id) { c.B.abilityPop(c.holder, c.B.ab(c.holder)); yield* c.B.heal(c.holder, v[id], `${c.B.nm(c.holder)} restored a little HP.`); } } }),
    fieldCure: (v) => ({ *onResidual(c) { if (c.B.fieldIs(v) && c.holder.mon.status) { c.B.abilityPop(c.holder, c.B.ab(c.holder)); yield* c.B.cureStatus(c.holder, `${c.B.nm(c.holder)} was cured of its ailment.`); } } }),
    poisonHeal: () => ({}),   // (read by the battle's poison step)
    // ---- leaving
    regenerator: (v) => ({ *onSwitchOut(c) { const f = c.holder; if (f.mon.hp > 0) f.mon.hp = Math.min(KP.maxHp(f.mon), f.mon.hp + Math.floor(KP.maxHp(f.mon) * (typeof v === 'number' ? v : 1 / 3))); } }),
    naturalCure: () => ({ *onSwitchOut(c) { if (c.holder.mon.status) c.holder.mon.status = null; } }),
    // ---- when it's hit
    whenHit: (v) => ({   // [{ cat, type, contact, superEff, crit, boosts, foe, status: [kind, chance], hurt, chance, weather, terrain, hazard }]
      *onDamagingHit(c) {
        for (const w of [].concat(v)) {
          if (w.cat && w.cat !== c.cat) continue;
          if (w.type && w.type !== c.moveType) continue;
          if (w.contact && !c.contact) continue;
          if (w.superEff && !(c.eff > 1)) continue;
          if (w.crit && !c.crit) continue;
          if (w.chance != null && Math.random() * 100 >= w.chance) continue;
          const f = c.holder, a = c.source, ab = c.B.ab(f);
          if (w.boosts && f.mon.hp > 0) yield* c.B.boost(f, w.boosts, f, { ab });
          if (w.max && f.mon.hp > 0) { c.B.abilityPop(f, ab); f.st[w.max] = 6; c.B.statFx(f, w.max, 6); yield* c.B.say(`${c.B.nm(f)} maxed its ${KP.STAT_LABEL[w.max] || w.max}!`, 50); }
          if (a && a.mon.hp > 0) {
            if (w.foe) yield* c.B.boost(a, w.foe, f, { ab, fromFoe: true });
            if (w.status) { c.B.abilityPop(f, ab); yield* c.B.inflict(a, w.status[0], w.status[1] == null ? 100 : w.status[1], f); }
            if (w.hurt && !(c.B.ab(a) || {}).magicGuard) { c.B.abilityPop(f, ab); yield* c.B.say(`${c.B.nm(a)} was hurt by ${c.B.nm(f)}'s ${ab ? ab.name : 'ability'}!`, 40); yield* c.B.chip(a, w.hurt); }
          }
          if (w.weather) yield* c.B.setWeather(w.weather, f, { ability: true });
          if (w.terrain) yield* c.B.setTerrain(w.terrain, f, { ability: true });
          if (w.hazard) yield* c.B.addHazard(c.B.sideOf(a), w.hazard, f);
        }
      },
    }),
    roughSkin: (v) => ({   // a contact hit costs the attacker a share of its HP
      *onDamagingHit(c) {
        if (!c.contact || !c.source || c.source.mon.hp <= 0 || (c.B.ab(c.source) || {}).magicGuard) return;
        const ab = c.B.ab(c.holder); c.B.abilityPop(c.holder, ab);
        yield* c.B.say(`${c.B.nm(c.source)} was hurt by ${c.B.nm(c.holder)}'s ${ab.name}!`, 40);
        yield* c.B.chip(c.source, typeof v === 'number' ? v : 1 / 8);
      },
    }),
    onContactStatus: (v) => ({   // its own contact hits may give an ailment (Poison Touch's kind): [kind, chance]
      *onAfterHit(c) { if (c.contact && c.target.mon.hp > 0 && Math.random() * 100 < v[1]) yield* c.B.inflict(c.target, v[0], 100, c.holder); },
    }),
    stench: (v) => ({ onAfterHitFlinch: () => (typeof v === 'number' ? v : 10) }),
    cursedBody: (v) => ({   // when hit, its attacker's move may go on a longer cooldown (Kupomon's Disable)
      *onDamagingHit(c) {
        if (!c.source || !c.moveId || c.moveId === 'flail' || Math.random() * 100 >= (typeof v === 'number' ? v : 30)) return;
        const cd = c.B.cds(c.source.mon); cd[c.moveId] = Math.max(cd[c.moveId] || 0, 3);
        yield* sayAb(c, `${c.B.nm(c.source)}'s ${KP.MOVES[c.moveId] ? KP.MOVES[c.moveId].name : 'move'} was disabled!`);
      },
    }),
    synchronize: () => ({}),   // (the battle's inflict passes it back)
    angerPoint: () => ({ *onDamagingHit(c) { if (c.crit && c.holder.mon.hp > 0) { c.B.abilityPop(c.holder, c.B.ab(c.holder)); c.holder.st.atk = 6; c.B.statFx(c.holder, 'atk', 6); yield* c.B.say(`${c.B.nm(c.holder)} maxed its Attack!`, 50); } } }),
    aftermath: (v) => ({ *onFaint(c) { const a = c.source; if (!c.contact || !a || a.mon.hp <= 0 || (c.B.ab(a) || {}).magicGuard) return; yield* sayAb(c, `${c.B.nm(a)} was caught in the blast!`); yield* c.B.chip(a, typeof v === 'number' ? v : 1 / 4); } }),
    // ---- knocking out a foe
    onKOBoost: (v) => ({ *onKO(c) { if (c.holder.mon.hp > 0) yield* c.B.boost(c.holder, v, c.holder, { ab: c.B.ab(c.holder) }); } }),
    beastBoost: () => ({ *onKO(c) { const f = c.holder; if (f.mon.hp <= 0) return; const k = ['atk', 'def', 'mag', 'res', 'spd'].sort((a, b) => KP.stat(f.mon, b) - KP.stat(f.mon, a))[0]; yield* c.B.boost(f, { [k]: 1 }, f, { ab: c.B.ab(f) }); } }),
  };
  // the effect keys the battle reads straight from the ability (documented above; the validator's list)
  KP.ABILITY_FLAGS = ['name', 'desc', 'boost', 'stab', 'immune', 'absorb', 'absorbBoost', 'flagImmune', 'resist', 'noStatus', 'onEnter', 'regen', 'onHit', 'counterHit', 'crit',
    'noCrit', 'noMiss', 'noGuard', 'guts', 'sturdy', 'coins', 'healMul', 'drainMul', 'firstStrike', 'statMul', 'statusChance', 'pinchSpd', 'expMul',
    'magicGuard', 'rockHead', 'shieldDust', 'innerFocus', 'skillLink', 'sheerForce', 'infiltrator', 'moldBreaker', 'unaware', 'noStatDrop', 'mirrorStats',
    'defiant', 'contrary', 'simple', 'wonderGuard', 'magicBounce', 'goodAsGold', 'noPriorityAgainst', 'trapFoes', 'runAway', 'anchor', 'float', 'overcoat',
    'scrappy', 'truant', 'gorillaTactics', 'disguise', 'steadfast', 'pressure', 'cdLess', 'parentalBond', 'statusEvade', 'cloudNine', 'legend', 'flashFire',
    'poisonHeal', 'synchronize', 'extreme'];

  // ------------------------------------------------------------------ the held items' effect keys
  KP.ITEM_EFFECTS = {
    gem: (v) => ({ onBasePower: (c) => c.moveType === v && !c.holder._gemUsed ? (c.real && (c.holder._gemPending = true), [5325, 4096]) : 1 }),
    catBoost: (v) => ({ onBasePower: (c) => v[c.cat] || 1 }),
    flagBoost: (v) => ({ onBasePower: (c) => { let m = 1; for (const fl in v) if (KP.hasFlag(c.move, fl)) m *= v[fl]; return m; } }),
    choice: (v) => v === 'spd' ? { onModifySpe: () => 1.5 } : v === 'mag' ? { onModifyMag: () => 1.5 } : { onModifyAtk: () => 1.5 },
    lifeOrb: () => ({ onModifyDamage: () => [5324, 4096] }),
    expertBelt: () => ({ onModifyDamage: (c) => c.eff > 1 ? [4915, 4096] : 1 }),
    metronome: () => ({ onModifyDamage: (c) => [Math.min(8192, 4096 + 819 * Math.max(0, (c.user.streak || 1) - 1)), 4096] }),
    vest: () => ({ onModifyRes: () => 1.5 }),
    eviolite: () => ({ onModifyDef: (c) => KP.sp(c.holder.mon).evo ? 1.5 : 1, onModifyRes: (c) => KP.sp(c.holder.mon).evo ? 1.5 : 1 }),
    statMul: (v, it) => {   // (forSpecies: only for those moogles)
      const ok = (c) => !it.forSpecies || it.forSpecies.includes(c.holder.mon.sp);
      return { onModifyAtk: (c) => ok(c) && v.atk || 1, onModifyMag: (c) => ok(c) && v.mag || 1, onModifyDef: (c) => ok(c) && v.def || 1, onModifyRes: (c) => ok(c) && v.res || 1, onModifySpe: (c) => ok(c) && v.spd || 1 };
    },
    crit: (v) => ({ onModifyCritRatio: (c, r) => r + v }),
    accMul: (v) => ({ onModifyAccuracy: () => v }),
    zoomLens: (v) => ({ onModifyAccuracy: (c) => c.target && c.target.movedThisTurn ? v : 1 }),
    evade: (v) => ({ onSourceModifyAccuracy: () => v }),
    ironBall: () => ({ onModifySpe: () => 0.5 }),
    laggingTail: () => ({ onModifyPriority: (c, p) => p - 0.1 }),
    resistBerry: (v) => ({ onSourceModifyDamage: (c) => c.moveType === v && (c.eff > 1 || v === 'freelancer') && !c.holder._berryUsed ? (c.real && (c.holder._resistPending = true), 0.5) : 1 }),   // (a Freelancer one: any Freelancer hit, as Showdown's Chilan Berry)
    kingsRock: (v) => ({ onAfterHitFlinch: () => (typeof v === 'number' ? v : 10) }),
  };
  // the keys the battle reads straight from the item (documented in docs/KUPOMON_MECHANICS.md)
  KP.ITEM_FLAGS = ['name', 'kind', 'price', 'desc', 'once', 'boost', 'heal', 'nut', 'bonus', 'after', 'move', 'types', 'also', 'sash', 'focusChance', 'balloon',
    'helmet', 'weaknessPolicy', 'ejectButton', 'redCard', 'whiteHerb', 'mentalHerb', 'powerHerb', 'extend', 'boots', 'shedShell', 'bindBand', 'gripClaw',
    'orb', 'sludge', 'shellBell', 'quickChance', 'covertCloak', 'clearAmulet', 'pads', 'goggles', 'throatSpray', 'loadedDice', 'umbrella', 'abilityShield',
    'pinchHeal', 'pinchBoost', 'cureStatus', 'hitBoost', 'hitHurt', 'terrainBoost', 'roomService', 'regen', 'coins', 'expMul', 'forSpecies', 'blunderPolicy',
    'leftovers', 'breed', 'evolve', 'sell'];
})();

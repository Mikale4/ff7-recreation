// Battle combatants (party members and enemies) + FF7 timers and statuses.
(function () {
  const U = FF7.util;
  const B = FF7.battle;

  // Status durations in timer units (Terence's Battle Mechanics FAQ)
  B.STATUS_DUR = { sleep: ['v', 100], paralysis: ['v', 20], regen: ['v', 127], barrier: ['v', 127], mbarrier: ['v', 127],
    stop: ['g', 30], death_sentence: ['c', 60], slow_numb: ['c', 30] };
  // Statuses removed at the end of battle (all except these persist? FF7: only fury/sadness/death persist)
  B.PERSIST = ['fury', 'sadness'];
  B.BAD_STATUS = ['poison', 'sleep', 'silence', 'confusion', 'berserk', 'frog', 'small', 'slow', 'stop', 'paralysis', 'petrify', 'slow_numb', 'darkness', 'death_sentence', 'fury', 'sadness', 'manipulate', 'imprisoned'];

  let nextUid = 1;
  class Combatant {
    constructor(side, opts) {
      this.uid = nextUid++;
      this.side = side;                   // 'party' | 'enemy'
      this.isParty = side === 'party';
      this.status = {};                   // name -> true / { t, kind }
      this.timers = {};                   // status -> remaining units
      this.mods = { atk: 0, def: 0, mat: 0, mdf: 0, defPct: 0, dex: 0 };   // % stat modifiers
      this.turn = 0;                      // turn timer 0..65535
      this.ready = false;
      this.acting = false;
      this.vAcc = 0; this.cAcc = 0; this.poisonAcc = 0; this.regenAcc = 0;
      this.actions = 0;
      this.vars = {};
      this.defending = false;
      this.hidden = false;                // removed from battle (fled, hammerblow)
      this.pos = [0, 0, 0]; this.home = [0, 0, 0]; this.facing = 0;
      this.model = null;
      this.flash = 0;
      Object.assign(this, opts || {});
    }
    get alive() { return this.hp > 0 && !this.hidden && !this.status.petrify; }
    get dead() { return this.hp <= 0; }
    get targetable() { return this.hp > 0 && !this.hidden; }
    get hpPct() { return this.maxHp ? Math.floor(this.hp * 100 / this.maxHp) : 0; }
    has(st) { return !!this.status[st]; }
    stat(k) {
      const base = this[k] || 0;
      const m = this.mods[k] || 0;
      return Math.floor(base + base * m / 100);
    }
    canAct() {
      return this.alive && !this.has('sleep') && !this.has('stop') && !this.has('paralysis') && !this.has('petrify') && !this.has('imprisoned');
    }
    // Apply a status (checks immunity). Returns true if newly applied.
    addStatus(st, opts = {}) {
      if (st === 'death') { this.kill(); return true; }
      if (!opts.force && this.immuneTo(st)) return false;
      if (this.has(st) && !opts.refresh) return false;
      if (st === 'haste' && this.has('slow')) { this.removeStatus('slow'); return true; }
      if (st === 'slow' && this.has('haste')) { this.removeStatus('haste'); return true; }
      if (st === 'fury' && this.has('sadness')) { this.removeStatus('sadness'); }
      if (st === 'sadness' && this.has('fury')) { this.removeStatus('fury'); }
      this.status[st] = true;
      const dur = B.STATUS_DUR[st];
      if (dur) this.timers[st] = { kind: dur[0], units: dur[1], acc: 0 };
      if (st === 'petrify') { this.turn = 0; }
      if (st === 'mini' || st === 'small') this.status.small = true;
      return true;
    }
    removeStatus(st) { delete this.status[st]; delete this.timers[st]; }
    immuneTo(st) {
      if (this.has('peerless') && st !== 'imprisoned') return true;
      if (this.has('resist') && st !== 'resist' && st !== 'imprisoned') return true;
      if (this.has('petrify')) return true;
      if (this.immune && this.immune.includes(st)) return true;
      if ((st === 'haste' || st === 'slow') && this.immune && (this.immune.includes('haste') || this.immune.includes('slow'))) return true;
      if (st === 'death_sentence' && this.immune && this.immune.includes('death')) return true;
      if (this.deathForce && (st === 'death' || st === 'death_sentence')) return true;
      return false;
    }
    kill() {
      this.hp = 0;
      for (const k in this.status) if (!B.PERSIST.includes(k)) delete this.status[k];
      this.timers = {}; this.turn = 0; this.ready = false; this.defending = false;
    }
    heal(n) { const before = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); return this.hp - before; }
  }
  B.Combatant = Combatant;

  // ---------------------------------------------------------------- party member
  B.fromChar = function (c) {
    const d = c.d;
    const M = FF7.sys.materia;
    const acc = FF7.sys.stats.accessory(c);
    const wep = FF7.sys.stats.weapon(c);
    const cb = new Combatant('party', {
      id: c.id, name: c.name, char: c, level: c.level,
      hp: c.hp, maxHp: c.maxHp, mp: c.mp, maxMp: c.maxMp,
      atk: d.atk, hitPct: d.hit, def: d.def, defPct: d.defPct, mat: d.mat, mdf: d.mdf, mdfPct: d.mdfPct,
      dex: d.dex, lck: d.lck, baseDex: c.stats.dex,
      row: c.row, weapon: wep, weaponId: c.weapon,
      longRange: !!(wep && wep.longRange) || M.hasIndep(c, 'long_range'),
      weaponElem: wep && wep.element && !['cut', 'hit', 'punch', 'shoot'].includes(wep.element) ? [wep.element] : [],
      physElem: wep && wep.element ? wep.element : 'hit',
      critBonus: d.crit,
      limitGauge: c.limitGauge || 0,
      abilities: M.abilities(c),
      elemDef: FF7.sys.stats.elemDefense(c),
      immune: Array.from(FF7.sys.stats.statusDefense(c)),
      summonUses: {}, allUses: {}, quadraUses: {},
      eskillMateria: M.equippedList(c).filter(m => m.id === 'enemy_skill'),
    });
    // weapon status / Added Effect pairs in the weapon
    cb.weaponStatus = [];
    if (wep && wep.status) cb.weaponStatus.push(typeof wep.status === 'string' ? { add: wep.status, chance: 20 } : wep.status);
    M.weaponPairs(c, 'added_effect').forEach(p => (M.statusOf(p.other.id) || []).forEach(s => cb.weaponStatus.push({ add: s, chance: 20 })));
    M.weaponPairs(c, 'elemental').forEach(p => { const el = M.elementOf(p.other.id); if (el) cb.weaponElem.push(el); });
    // persistent statuses
    for (const k in c.status || {}) if (c.status[k]) cb.status[k] = true;
    if (c.hp <= 0) cb.hp = 0;
    // auto-statuses from accessory / armor
    const autos = (acc && acc.auto) || [];
    autos.forEach(s => cb.addStatus(s, { force: true }));
    cb.accessorySpecial = acc ? acc.special : null;
    cb.counterAttack = M.indepLevels(c, 'counter_attack');
    cb.cover = M.indepTotal(c, 'cover') * 20;
    cb.megaAll = M.indepTotal(c, 'mega_all'); cb.megaUses = 0;
    cb.preemptive = M.indepTotal(c, 'pre_emptive');
    cb.preemptiveLv = M.indepLevels(c, 'pre_emptive');
    // counter effects (Walkthrough / Party Mechanics, support and independent materia): Counter (a linked Command),
    // Magic Counter (a linked Magic / Summon) and Counter Attack (Attack), each rolling on its own; Sneak Attack
    // at the start of battle; Final Attack when KO'd, as many times per battle as its level. All of them share room
    // for eight effects on one character.
    const ab = cb.abilities;
    let room = 8;
    const take = (list) => { const out = list.slice(0, Math.max(0, room)); room -= out.length; return out; };
    cb.sneakFx = take(ab.sneak || []);
    cb.finalFx = take(ab.final || []).map(f => Object.assign({ used: 0 }, f));
    cb.counterFx = take([].concat((ab.counters || []).map(x => Object.assign({ kind: 'command' }, x)), (ab.magicCounters || []).map(x => Object.assign({ kind: 'magic' }, x)),
      cb.counterAttack.map(level => ({ kind: 'attack', level }))));
    if (FF7.isGuest(c.id)) cb.guest = true;
    return cb;
  };

  // Write battle results back to the character
  B.toChar = function (cb) {
    const c = cb.char; if (!c) return;
    c.hp = U.clamp(cb.hp, 0, c.maxHp);
    c.mp = U.clamp(cb.mp, 0, c.maxMp);
    c.limitGauge = cb.limitGauge;
    c.status = {};
    B.PERSIST.forEach(s => { if (cb.status[s]) c.status[s] = true; });
  };

  // ---------------------------------------------------------------- enemy
  B.fromEnemy = function (id, idx) {
    const e = FF7.data.enemies[id];
    if (!e) { console.error('Unknown enemy', id); return null; }
    const cb = new Combatant('enemy', {
      id, def0: e, name: e.name, level: e.level || 1,
      hp: e.hp, maxHp: e.hp, mp: e.mp || 0, maxMp: e.mp || 0,
      atk: e.atk || e.str || 10, hitPct: 100, def: e.def || 0, defPct: e.defPct || 0, mat: e.mat || 10, mdf: e.mdf || 0, mdfPct: e.mdfPct || 0,
      dex: e.dex || 50, lck: e.lck || 0,
      elem: e.elem || {}, immune: (e.immune || []).slice(),
      row: e.row || 'front',
      boss: !!e.boss, flying: !!e.flying,
      exp: e.exp || 0, ap: e.ap || 0, gil: e.gil || 0,
      drops: e.drops || [], steals: (e.steal || []).slice(), morph: e.morph || null,
      stolen: false,
      physImmune: !!e.physImmune, cantReach: !!e.cantReach, invulnerable: !!e.invulnerable,
      undead: !!e.undead || (e.elem && e.elem.restorative === -1),
      index: idx,
    });
    // clone attacks so custom AI can alter them
    cb.attacks = Object.assign({ attack: { name: 'Attack', kind: 'phys', power: 16, target: 'enemy', silent: true } }, e.attacks || {});
    return cb;
  };
})();

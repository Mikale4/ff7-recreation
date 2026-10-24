// Magic spells — FF7 (PS1 US, 1997). Source: Terence Fergusson's FF7 Party Mechanics guide
// (kernel data: MP cost, power, MAt%, status chance, target, element).
//
// POWER UNITS (16 = 1.0x Base). Terence lists damage spells as "Nx Base"; power = N * 16, so the
// engine formula  Damage = power * (512 - MDef) * 6*(MAt+Lv) / (16*512)  reproduces FF7 exactly:
//   Fire/Ice/Bolt 8 / 20 / 64, Quake 11 / 24 / 70, Bio 10 / 21 / 68, Comet 80, Comet2 30 (x4),
//   Freeze 95, Break 100, Tornado 105, Flare 115, Ultima 105 (hits all, never split).
// HEALING uses  Heal = 6*(MAt+Lv) + 22*power ; FF7's constants are +110 / +770 / +2860, i.e.
//   Cure 5, Cure2 35, Cure3 130 (the "Cure2 ~16, Cure3 ~40" in DATA_SCHEMA.md were estimates).
//
// hit:   on a spell with `add` = % chance of the statuses (the spell itself lands);
//        on a spell without `add` (Demi) = accuracy of the whole spell (FF7 MAt%).
// split: true = damage x2/3 and status chance x2/3 when spread with All (FF7 rule);
//        HP%/Max-HP% spells (Demi, Life) and inherently-all spells (Ultima, Comet2) never split.
// Extra optional fields: toggle (status is toggled on/off, Mini/Toad), noReflect (cannot be
// bounced by Reflect; everything else here is reflectable).

Object.assign(FF7.data.spells, {

  // ---------------------------------------------------------------- Restore
  cure: {
    name: 'Cure', mp: 5, target: 'ally', canAll: true,
    kind: 'heal', power: 5, element: 'restorative', split: true,
    desc: 'Restores HP',
  },
  cure2: {
    name: 'Cure2', mp: 24, target: 'ally', canAll: true,
    kind: 'heal', power: 35, element: 'restorative', split: true,
    desc: 'Restores more HP',
  },
  cure3: {
    name: 'Cure3', mp: 64, target: 'ally', canAll: true,
    kind: 'heal', power: 130, element: 'restorative', split: true,
    desc: 'Restores a lot of HP',
  },
  regen: {
    name: 'Regen', mp: 30, target: 'ally', canAll: true,
    kind: 'status', add: ['regen'], hit: 100, split: false,
    desc: 'Gradually restores HP',
  },

  // ---------------------------------------------------------------- Heal
  poisona: {
    name: 'Poisona', mp: 3, target: 'ally', canAll: true,
    kind: 'cure', remove: ['poison'], split: false,
    desc: 'Cures Poison',
  },
  esuna: {
    name: 'Esuna', mp: 15, target: 'ally', canAll: true,
    kind: 'cure',
    remove: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog', 'small',
      'slow_numb', 'petrify', 'berserk', 'paralysis', 'darkness'],
    split: false,
    desc: 'Cures abnormal status',
  },
  resist: {
    name: 'Resist', mp: 120, target: 'ally', canAll: false,
    kind: 'status', add: ['resist'], hit: 100,
    desc: 'Prevents abnormal status',
  },

  // ---------------------------------------------------------------- Revive
  life: {
    name: 'Life', mp: 34, target: 'ally', canAll: true,
    kind: 'revive', pct: 25, element: 'restorative', split: false,
    desc: 'Revives from KO with some HP',
  },
  life2: {
    name: 'Life2', mp: 100, target: 'ally', canAll: true,
    kind: 'revive', pct: 100, element: 'restorative', split: false,
    desc: 'Revives from KO with full HP',
  },

  // ---------------------------------------------------------------- Fire
  fire: {
    name: 'Fire', mp: 4, target: 'enemy', canAll: true,
    kind: 'damage', power: 8, element: 'fire', split: true,
    desc: 'Fire-elemental attack',
  },
  fire2: {
    name: 'Fire2', mp: 22, target: 'enemy', canAll: true,
    kind: 'damage', power: 20, element: 'fire', split: true,
    desc: 'Stronger fire-elemental attack',
  },
  fire3: {
    name: 'Fire3', mp: 52, target: 'enemy', canAll: true,
    kind: 'damage', power: 64, element: 'fire', split: true,
    desc: 'Powerful fire-elemental attack',
  },

  // ---------------------------------------------------------------- Ice
  ice: {
    name: 'Ice', mp: 4, target: 'enemy', canAll: true,
    kind: 'damage', power: 8, element: 'ice', split: true,
    desc: 'Ice-elemental attack',
  },
  ice2: {
    name: 'Ice2', mp: 22, target: 'enemy', canAll: true,
    kind: 'damage', power: 20, element: 'ice', split: true,
    desc: 'Stronger ice-elemental attack',
  },
  ice3: {
    name: 'Ice3', mp: 52, target: 'enemy', canAll: true,
    kind: 'damage', power: 64, element: 'ice', split: true,
    desc: 'Powerful ice-elemental attack',
  },

  // ---------------------------------------------------------------- Lightning
  bolt: {
    name: 'Bolt', mp: 4, target: 'enemy', canAll: true,
    kind: 'damage', power: 8, element: 'lightning', split: true,
    desc: 'Lightning-elemental attack',
  },
  bolt2: {
    name: 'Bolt2', mp: 22, target: 'enemy', canAll: true,
    kind: 'damage', power: 20, element: 'lightning', split: true,
    desc: 'Stronger lightning attack',
  },
  bolt3: {
    name: 'Bolt3', mp: 52, target: 'enemy', canAll: true,
    kind: 'damage', power: 64, element: 'lightning', split: true,
    desc: 'Powerful lightning attack',
  },

  // ---------------------------------------------------------------- Earth
  quake: {
    name: 'Quake', mp: 6, target: 'enemy', canAll: true,
    kind: 'damage', power: 11, element: 'earth', split: true,
    desc: 'Earth-elemental attack',
  },
  quake2: {
    name: 'Quake2', mp: 28, target: 'enemy', canAll: true,
    kind: 'damage', power: 24, element: 'earth', split: true,
    desc: 'Stronger earth-elemental attack',
  },
  quake3: {
    name: 'Quake3', mp: 68, target: 'enemy', canAll: true,
    kind: 'damage', power: 70, element: 'earth', split: true,
    desc: 'Powerful earth-elemental attack',
  },

  // ---------------------------------------------------------------- Poison
  bio: {
    name: 'Bio', mp: 8, target: 'enemy', canAll: true,
    kind: 'damage', power: 10, element: 'poison', add: ['poison'], hit: 48, split: true,
    desc: 'Poison attack, may poison',
  },
  bio2: {
    name: 'Bio2', mp: 36, target: 'enemy', canAll: true,
    kind: 'damage', power: 21, element: 'poison', add: ['poison'], hit: 48, split: true,
    desc: 'Stronger poison attack',
  },
  bio3: {
    name: 'Bio3', mp: 80, target: 'enemy', canAll: true,
    kind: 'damage', power: 68, element: 'poison', add: ['poison'], hit: 72, split: true,
    desc: 'Powerful poison attack',
  },

  // ---------------------------------------------------------------- Gravity
  demi: {
    name: 'Demi', mp: 14, target: 'enemy', canAll: true,
    kind: 'gravity', pct: 25, element: 'gravity', hit: 75, split: false, noReflect: true,
    desc: 'Cuts HP by 1/4',
  },
  demi2: {
    name: 'Demi2', mp: 33, target: 'enemy', canAll: true,
    kind: 'gravity', pct: 50, element: 'gravity', hit: 75, split: false, noReflect: true,
    desc: 'Cuts HP by 1/2',
  },
  demi3: {
    name: 'Demi3', mp: 48, target: 'enemy', canAll: true,
    kind: 'gravity', pct: 75, element: 'gravity', hit: 75, split: false, noReflect: true,
    desc: 'Cuts HP by 3/4',
  },

  // ---------------------------------------------------------------- Seal
  sleepel: {
    name: 'Sleepel', mp: 8, target: 'enemy', canAll: true,
    kind: 'status', add: ['sleep'], hit: 72, split: true,
    desc: 'Puts target to sleep',
  },
  silence: {
    name: 'Silence', mp: 24, target: 'enemy', canAll: true,
    kind: 'status', add: ['silence'], hit: 60, split: true,
    desc: 'Prevents magic use',
  },

  // ---------------------------------------------------------------- Mystify
  confu: {
    name: 'Confu', mp: 18, target: 'enemy', canAll: true,
    kind: 'status', add: ['confusion'], hit: 60, split: true,
    desc: 'Confuses target',
  },
  berserk: {
    name: 'Berserk', mp: 28, target: 'enemy', canAll: true,
    kind: 'status', add: ['berserk'], hit: 80, split: true,
    desc: 'Berserks target',
  },

  // ---------------------------------------------------------------- Transform
  mini: {
    name: 'Mini', mp: 10, target: 'enemy', canAll: true,
    kind: 'status', add: ['small'], hit: 72, toggle: true, split: true,
    desc: 'Shrinks target / cures Mini',
  },
  toad: {
    name: 'Toad', mp: 14, target: 'enemy', canAll: true,
    kind: 'status', add: ['frog'], hit: 72, toggle: true, split: true,
    desc: 'Frogs target / cures Frog',
  },

  // ---------------------------------------------------------------- Exit
  escape: {
    name: 'Escape', mp: 16, target: 'self', canAll: false,
    kind: 'escape', noReflect: true,
    desc: 'Escapes from battle',
  },
  remove: {
    name: 'Remove', mp: 99, target: 'allEnemies', canAll: false,
    kind: 'remove', add: ['death'], hit: 100, split: false, noReflect: true,
    desc: 'Removes enemies; no gil or items',
  },

  // ---------------------------------------------------------------- Time
  haste: {
    name: 'Haste', mp: 18, target: 'ally', canAll: true,
    kind: 'status', add: ['haste'], hit: 100, split: false,
    desc: 'Speeds up target',
  },
  slow: {
    name: 'Slow', mp: 20, target: 'enemy', canAll: true,
    kind: 'status', add: ['slow'], hit: 100, split: true,
    desc: 'Slows target down',
  },
  stop: {
    name: 'Stop', mp: 34, target: 'enemy', canAll: true,
    kind: 'status', add: ['stop'], hit: 60, split: true,
    desc: 'Stops target',
  },

  // ---------------------------------------------------------------- Destruct
  debarrier: {
    name: 'DeBarrier', mp: 12, target: 'enemy', canAll: true,
    kind: 'dispel', remove: ['barrier', 'mbarrier', 'reflect', 'shield'], split: false,
    noReflect: true,
    desc: 'Removes barriers and Reflect',
  },
  despell: {
    name: 'DeSpell', mp: 20, target: 'enemy', canAll: true,
    kind: 'dispel',
    remove: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield',
      'resist'],
    split: false, noReflect: true, special: 'despell',
    desc: 'Removes magic effects',
  },
  death: {
    name: 'Death', mp: 30, target: 'enemy', canAll: true,
    kind: 'death', add: ['death'], hit: 44, split: true,
    desc: 'Instant death attack',
  },

  // ---------------------------------------------------------------- Barrier
  barrier: {
    name: 'Barrier', mp: 16, target: 'ally', canAll: true,
    kind: 'status', add: ['barrier'], hit: 100, split: false,
    desc: 'Halves physical damage',
  },
  mbarrier: {
    name: 'MBarrier', mp: 24, target: 'ally', canAll: true,
    kind: 'status', add: ['mbarrier'], hit: 100, split: false,
    desc: 'Halves magic damage',
  },
  reflect: {
    name: 'Reflect', mp: 30, target: 'ally', canAll: true,
    kind: 'status', add: ['reflect'], hit: 100, split: false, noReflect: true,
    desc: 'Reflects magic',
  },
  wall: {
    name: 'Wall', mp: 58, target: 'ally', canAll: true,
    kind: 'status', add: ['barrier', 'mbarrier'], hit: 100, split: false,
    desc: 'Casts Barrier and MBarrier',
  },

  // ---------------------------------------------------------------- Comet
  comet: {
    name: 'Comet', mp: 70, target: 'enemy', canAll: false,
    kind: 'damage', power: 80, noReflect: true,
    desc: 'Drops a comet on one target',
  },
  comet2: {
    name: 'Comet2', mp: 110, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 30, hits: 4, random: true, split: false, noReflect: true,
    desc: 'Four comets on random targets',
  },

  // ---------------------------------------------------------------- Contain
  freeze: {
    name: 'Freeze', mp: 82, target: 'enemy', canAll: false,
    kind: 'damage', power: 95, element: 'ice', add: ['stop'], hit: 68,
    desc: 'Ice attack, may Stop target',
  },
  break: {
    name: 'Break', mp: 86, target: 'enemy', canAll: false,
    kind: 'damage', power: 100, element: 'earth', add: ['petrify'], hit: 32,
    desc: 'Earth attack, may petrify',
  },
  tornado: {
    name: 'Tornado', mp: 90, target: 'enemy', canAll: false,
    kind: 'damage', power: 105, element: 'wind', add: ['confusion'], hit: 32,
    desc: 'Wind attack, may confuse',
  },
  flare: {
    name: 'Flare', mp: 100, target: 'enemy', canAll: false,
    kind: 'damage', power: 115, element: 'fire',
    desc: 'Massive fire attack',
  },

  // ---------------------------------------------------------------- Full Cure / Shield / Ultima
  full_cure: {
    name: 'FullCure', mp: 99, target: 'ally', canAll: false,
    kind: 'fullcure', pct: 100, element: 'restorative', noReflect: true,
    desc: 'Restores all HP',
  },
  shield: {
    name: 'Shield', mp: 180, target: 'ally', canAll: false,
    kind: 'status', add: ['shield'], hit: 100, noReflect: true,
    desc: 'Nullifies all attacks',
  },
  ultima: {
    name: 'Ultima', mp: 130, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 105, split: false, noReflect: true,
    desc: 'Ultimate magic attack',
  },
});

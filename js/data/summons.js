// Summons — FF7 (PS1 US, 1997). Source: Terence Fergusson's FF7 Party Mechanics guide.
// power: 16 = 1.0x Base (magical formula), i.e. Terence's "Nx Base" * 16.
// All summons hit every enemy at full strength (never split), always hit (MAt% 255)
// and cannot be reflected. Uses per battle = summon materia level.
// Extra optional fields:
//   pierce: true   -> ignores the target's MDef (Terence: "Piercing").
//   element: [...] -> multi-element attack (FF7 rule: absorb/nullify/weak if ANY element matches).

Object.assign(FF7.data.summons, {
  choco_mog: {
    name: 'Choco/Mog', mp: 14, attackName: 'Deathblow!!',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 16,
    add: ['stop'], hit: 40, split: false,
    special: 'choco_mog',                       // 15/256: 'Fat-Chocobo' (power 20, no status)
    altName: 'Fat-Chocobo', altPower: 20,
    desc: 'Damage to all, may Stop',
  },
  shiva: {
    name: 'Shiva', mp: 32, attackName: 'Diamond Dust',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 24, element: 'ice', split: false,
    desc: 'Ice damage to all opponents',
  },
  ifrit: {
    name: 'Ifrit', mp: 34, attackName: 'Hellfire',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 27, element: 'fire', split: false,
    desc: 'Fire damage to all opponents',
  },
  ramuh: {
    name: 'Ramuh', mp: 40, attackName: 'Judgement Bolt',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 30, element: 'lightning',
    split: false,
    desc: 'Lightning damage to all opponents',
  },
  titan: {
    name: 'Titan', mp: 46, attackName: 'Anger of the Land',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 33, element: 'earth',
    split: false,
    desc: 'Earth damage to all opponents',
  },
  odin: {
    name: 'Odin', mp: 80, attackName: 'Steel-Bladed Sword',
    target: 'allEnemies', canAll: false, kind: 'death', add: ['death'], hit: 92, split: false,
    special: 'odin',                            // death to all; if it would miss ALL -> Gunge Lance
    altName: 'Gunge Lance', altPower: 78, altTarget: 'enemy',
    desc: 'Instant death to all opponents',
  },
  leviathan: {
    name: 'Leviathan', mp: 78, attackName: 'Tidal Wave',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 75, element: 'water',
    split: false,
    desc: 'Water damage to all opponents',
  },
  bahamut: {
    name: 'Bahamut', mp: 100, attackName: 'Mega Flare',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 65, pierce: true, split: false,
    desc: 'Heavy damage to all opponents',
  },
  kujata: {
    name: 'Kjata', mp: 110, attackName: 'Tetra-Disaster',  // PS1 US spelling (PC: "Kujata")
    target: 'allEnemies', canAll: false, kind: 'damage', power: 100,
    element: ['fire', 'ice', 'lightning'], split: false,
    desc: 'Fire/Ice/Bolt damage to all',
  },
  alexander: {
    name: 'Alexander', mp: 120, attackName: 'Judgement',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 120, element: 'holy',
    split: false,
    desc: 'Holy damage to all opponents',
  },
  phoenix: {
    name: 'Phoenix', mp: 180, attackName: 'Phoenix Flame',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 60, element: 'fire',
    split: false,
    special: 'phoenix',                         // also revives KO'd allies to full HP
    desc: 'Fire damage; revives allies',
  },
  neo_bahamut: {
    name: 'Neo Bahamut', mp: 140, attackName: 'Giga Flare',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 80, pierce: true, split: false,
    desc: 'Massive damage to all opponents',
  },
  hades: {
    name: 'Hades', mp: 150, attackName: 'Black Cauldron',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 90,
    add: ['sleep', 'poison', 'confusion', 'silence', 'slow', 'frog', 'small', 'paralysis'],
    hit: 100, split: false,
    desc: 'Damage and many statuses to all',
  },
  typhoon: {
    name: 'Typoon', mp: 160, attackName: 'Disintegration',  // PS1 US spelling (PC: "Typhon")
    target: 'allEnemies', canAll: false, kind: 'damage', power: 110,
    element: ['fire', 'ice', 'lightning', 'earth'], pierce: true, split: false,
    desc: 'Four-element damage to all',
  },
  bahamut_zero: {
    name: 'Bahamut ZERO', mp: 180, attackName: 'Tera Flare',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 120, pierce: true, split: false,
    desc: 'Tremendous damage to all',
  },
  knights_of_round: {
    name: 'Knights of Round', mp: 250, attackName: 'Ultimate End',
    target: 'allEnemies', canAll: false, kind: 'damage', power: 80, hits: 13, random: false,
    pierce: true, split: false,
    desc: '13 knights strike all opponents',
  },
});

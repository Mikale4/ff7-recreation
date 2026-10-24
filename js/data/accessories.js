// FF7 accessories (all 32, PS1 US names).
//
// Source: references/text/Party_Mechanics_Guide.txt 4.3 (kernel data); buy prices from
// Item_Materia_Locations_FAQ (Sneak Glove: 129000 gil one-off deal, Wall Market weapon shop, Disc 2).
// price 0 = not sold for gil.
//
// auto: statuses applied at battle start that cannot be removed while equipped (FF7 also makes the
//   wearer immune to losing them). Curse Ring's 'death_sentence' is a status id outside the schema's
//   usual auto list - the engine should start the Death Sentence countdown.
// special hooks:
//   cats_bell    every field step restores 2 HP (rounded up to an even value) to the wearer
//   sneak_glove  for Steal/Mug, use max(level, targetLevel + 60) as the thief's level
//   hypnocrown   Manipulate cannot be evaded (status immunity still applies)

Object.assign(FF7.data.accessories, {
  power_wrist: {
    name: 'Power Wrist', stats: { str: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 7500, desc: 'Strength +10',
  },
  protect_vest: {
    name: 'Protect Vest', stats: { vit: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 3500, desc: 'Vitality +10',
  },
  earring: {
    name: 'Earring', stats: { mag: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 7500, desc: 'Magic +10',
  },
  talisman: {
    name: 'Talisman', stats: { spr: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 4000, desc: 'Spirit +10',
  },
  choco_feather: {
    name: 'Choco Feather', stats: { dex: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 10000, desc: 'Dexterity +10',
  },
  amulet: {
    name: 'Amulet', stats: { lck: 10 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 10000, desc: 'Luck +10',
  },
  champion_belt: {
    name: 'Champion Belt', stats: { str: 30, vit: 30 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 0, desc: 'Strength +30, Vitality +30',
  },
  poison_ring: {
    name: 'Poison Ring', stats: {},
    elem: { poison: 'absorb' },
    statusDef: ['poison'],
    auto: [], special: null,
    price: 0, desc: 'Absorbs poison; prevents [Poison]',
  },
  tough_ring: {
    name: 'Tough Ring', stats: { vit: 50, spr: 50 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 0, desc: 'Vitality +50, Spirit +50',
  },
  circlet: {
    name: 'Circlet', stats: { mag: 30, spr: 30 },
    elem: {},
    statusDef: [],
    auto: [], special: null,
    price: 0, desc: 'Magic +30, Spirit +30',
  },
  star_pendant: {
    name: 'Star Pendant', stats: {},
    elem: {},
    statusDef: ['poison'],
    auto: [], special: null,
    price: 4000, desc: 'Prevents [Poison]',
  },
  silver_glasses: {
    name: 'Silver Glasses', stats: {},
    elem: {},
    statusDef: ['darkness'],
    auto: [], special: null,
    price: 3000, desc: 'Prevents [Darkness]',
  },
  headband: {
    name: 'Headband', stats: {},
    elem: {},
    statusDef: ['sleep'],
    auto: [], special: null,
    price: 3000, desc: 'Prevents [Sleep]',
  },
  fairy_ring: {
    name: 'Fairy Ring', stats: {},
    elem: {},
    statusDef: ['poison', 'darkness'],
    auto: [], special: null,
    price: 7000, desc: 'Prevents [Poison]/[Darkness]',
  },
  jem_ring: {
    name: 'Jem Ring', stats: {},
    elem: {},
    statusDef: ['paralysis', 'petrify', 'slow_numb'],
    auto: [], special: null,
    price: 7500, desc: 'Prevents [Petrify]/[Paralysis]',
  },
  white_cape: {
    name: 'White Cape', stats: {},
    elem: {},
    statusDef: ['frog', 'small'],
    auto: [], special: null,
    price: 5000, desc: 'Prevents [Frog]/[Small]',
  },
  sprint_shoes: {
    name: 'Sprint Shoes', stats: {},
    elem: {},
    statusDef: [],
    auto: ['haste'], special: null,
    price: 0, desc: 'Automatic [Haste]',
  },
  peace_ring: {
    name: 'Peace Ring', stats: {},
    elem: {},
    statusDef: ['berserk', 'fury', 'sadness', 'confusion'],
    auto: [], special: null,
    price: 7500, desc: 'Prevents [Berserk]/[Fury]/[Sadness]',
  },
  ribbon: {
    name: 'Ribbon', stats: {},
    elem: {},
    statusDef: [
      'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog',
      'small', 'slow_numb', 'petrify', 'death_sentence', 'berserk', 'paralysis', 'darkness',
    ],
    auto: [], special: null,
    price: 0, desc: 'Prevents all abnormal status',
  },
  fire_ring: {
    name: 'Fire Ring', stats: {},
    elem: { fire: 'nullify' },
    statusDef: [],
    auto: [], special: null,
    price: 8000, desc: 'Nullifies fire',
  },
  ice_ring: {
    name: 'Ice Ring', stats: {},
    elem: { ice: 'nullify' },
    statusDef: [],
    auto: [], special: null,
    price: 8000, desc: 'Nullifies ice',
  },
  bolt_ring: {
    name: 'Bolt Ring', stats: {},
    elem: { lightning: 'nullify' },
    statusDef: [],
    auto: [], special: null,
    price: 8000, desc: 'Nullifies lightning',
  },
  tetra_elemental: {
    name: 'Tetra Elemental', stats: {},
    elem: { fire: 'absorb', ice: 'absorb', lightning: 'absorb', earth: 'absorb' },
    statusDef: [],
    auto: [], special: null,
    price: 0, desc: 'Absorbs fire, ice, lightning, earth',
  },
  safety_bit: {
    name: 'Safety Bit', stats: {},
    elem: {},
    statusDef: ['death', 'slow_numb', 'petrify', 'death_sentence'],
    auto: [], special: null,
    price: 7500, desc: 'Prevents instant death/[Petrify]',
  },
  fury_ring: {
    name: 'Fury Ring', stats: {},
    elem: {},
    statusDef: [],
    auto: ['berserk'], special: null,
    price: 5000, desc: 'Automatic [Berserk]',
  },
  curse_ring: {
    name: 'Curse Ring', stats: { str: 35, vit: 15, mag: 35, spr: 15, dex: 15, lck: 10 },
    elem: {},
    statusDef: [],
    auto: ['death_sentence'], special: null,
    price: 0, desc: 'Raises stats; [Death Sentence]',
  },
  protect_ring: {
    name: 'Protect Ring', stats: {},
    elem: {},
    statusDef: [],
    auto: ['barrier', 'mbarrier'], special: null,
    price: 0, desc: 'Automatic [Barrier]/[MBarrier]',
  },
  cats_bell: {
    name: 'Cat\'s Bell', stats: {},
    elem: {},
    statusDef: [],
    auto: [], special: 'cats_bell',
    price: 0, desc: 'Restores HP as you walk',
  },
  reflect_ring: {
    name: 'Reflect Ring', stats: {},
    elem: {},
    statusDef: [],
    auto: ['reflect'], special: null,
    price: 0, desc: 'Automatic [Reflect]',
  },
  water_ring: {
    name: 'Water Ring', stats: {},
    elem: { water: 'absorb' },
    statusDef: [],
    auto: [], special: null,
    price: 0, desc: 'Absorbs water',
  },
  sneak_glove: {
    name: 'Sneak Glove', stats: {},
    elem: {},
    statusDef: [],
    auto: [], special: 'sneak_glove',
    price: 129000, desc: 'Raises steal success rate',
  },
  hypnocrown: {
    name: 'HypnoCrown', stats: {},
    elem: {},
    statusDef: [],
    auto: [], special: 'hypnocrown',
    price: 0, desc: 'Raises manipulate success rate',
  },
});

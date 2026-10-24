// FF7 consumable / battle items and key items (PS1 US 1997 names).
//
// Sources: references/text Party_Mechanics_Guide (kernel item data), Item_Materia_Locations_FAQ
// (prices + shop guide), Monster_Item_Weapon_Lists.
//
// price: buy price in gil. 0 = never sold for gil in FF7 (sell value is then 0; FF7 pays 1 gil).
//
// Battle damage items use FF7's "Item formula", which ignores the user's stats:
//   damage = fixed * (512 - Def) / 512   (kind 'phys': target Def, kind 'mag': target MDef)
//   then x random variance (3841..4096)/4096 and x the element modifier. Never split across targets.
// Effect keys beyond DATA_SCHEMA.md (all rare, engine hooks):
//   damage.kind 'gravity' + pct   percent of target's CURRENT HP (Graviball / T/S Bomb)
//   damage.hits + random          Stardust: 4 hits on random enemies
//   damage.drain / damage.mp      Vampire Fang (HP drain) / Ghost Hand (MP drain)
//   addOnlyIfNotCured             Hyper / Tranquilizer: cure the opposite mood, else inflict
//   battleBoostPct                Hero Drink: +30% Att/MAt/Def/MDf for the battle (cap +100%)
//   greens / nut                  chocobo feeding / breeding (value = green or nut id)
//   learnLimit                    Limit manuals: engine checks FF7.data.limits[id].char === user
//   saveCrystal                   creates a save point (Northern Crater)

Object.assign(FF7.data.items, {
  // ------------------------------------------------------------------ recovery
  potion: {
    name: 'Potion', desc: 'Restores 100 HP', price: 50,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healHp: 100 },
  },
  hi_potion: {
    name: 'Hi-Potion', desc: 'Restores 500 HP', price: 300,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healHp: 500 },
  },
  x_potion: {
    name: 'X-Potion', desc: 'Fully restores HP', price: 0,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healHpPct: 100 },
  },
  ether: {
    name: 'Ether', desc: 'Restores 100 MP', price: 1500,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healMp: 100 },
  },
  turbo_ether: {
    name: 'Turbo Ether', desc: 'Fully restores MP', price: 0,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healMpPct: 100 },
  },
  elixir: {
    name: 'Elixir', desc: 'Fully restores HP/MP', price: 0,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { healHpPct: 100, healMpPct: 100 },
  },
  megalixir: {
    name: 'Megalixir', desc: 'Fully restores all allies\' HP/MP', price: 0,
    target: 'allAllies', field: true, battle: true, throwable: false,
    effect: { healHpPct: 100, healMpPct: 100 },
  },
  phoenix_down: {
    name: 'Phoenix Down', desc: 'Restores life', price: 300,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { revive: 25 },
  },
  tent: {
    name: 'Tent', desc: 'Rest at a save point/world map', price: 500,
    target: 'allAllies', field: true, battle: false, throwable: false,
    effect: { tent: true },
  },

  // ------------------------------------------------------------ status cures
  antidote: {
    name: 'Antidote', desc: 'Cures [Poison]', price: 80,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['poison'] },
  },
  soft: {
    name: 'Soft', desc: 'Cures [Petrify]/[Slow-numb]', price: 150,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['petrify', 'slow_numb'] },
  },
  maidens_kiss: {
    name: 'Maiden\'s Kiss', desc: 'Cures [Frog]', price: 150,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['frog'] },
  },
  cornucopia: {
    name: 'Cornucopia', desc: 'Cures [Small]', price: 150,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['small'] },
  },
  echo_screen: {
    name: 'Echo screen', desc: 'Cures [Silence]', price: 100,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['silence'] },
  },
  eye_drop: {
    name: 'Eye drop', desc: 'Cures [Darkness]', price: 50,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['darkness'] },
  },
  hyper: {
    name: 'Hyper', desc: 'Cures [Sadness], else causes [Fury]', price: 100,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['sadness'], addStatus: ['fury'], addOnlyIfNotCured: true },
  },
  tranquilizer: {
    name: 'Tranquilizer', desc: 'Cures [Fury], else causes [Sadness]', price: 100,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: { cure: ['fury'], addStatus: ['sadness'], addOnlyIfNotCured: true },
  },
  remedy: {
    name: 'Remedy', desc: 'Cures abnormal status', price: 1000,
    target: 'ally', field: true, battle: true, throwable: false,
    effect: {
      cure: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog', 'small',
        'slow_numb', 'petrify', 'berserk', 'paralysis', 'darkness'],
    },
  },

  // --------------------------------------------------------- battle support
  smoke_bomb: {
    name: 'Smoke Bomb', desc: 'Escape from battle', price: 0,
    target: 'none', field: false, battle: true, throwable: false,
    effect: { escape: true },
  },
  speed_drink: {
    name: 'Speed Drink', desc: 'Casts [Haste] on one ally', price: 0,
    target: 'ally', field: false, battle: true, throwable: false,
    effect: { addStatus: ['haste'] },
  },
  hero_drink: {
    name: 'Hero Drink', desc: 'Raises Att/MAt/Def/MDf by 30%', price: 0,
    target: 'ally', field: false, battle: true, throwable: false,
    effect: { battleBoostPct: { atk: 30, mat: 30, def: 30, mdf: 30 } },
  },
  vaccine: {
    name: 'Vaccine', desc: 'Prevents all status changes', price: 0,
    target: 'ally', field: false, battle: true, throwable: false,
    effect: { addStatus: ['resist'] },
  },
  light_curtain: {
    name: 'Light Curtain', desc: 'Casts [Barrier] on all allies', price: 0,
    target: 'allAllies', field: false, battle: true, throwable: false,
    effect: { addStatus: ['barrier'] },
  },
  lunar_curtain: {
    name: 'Lunar Curtain', desc: 'Casts [MBarrier] on all allies', price: 0,
    target: 'allAllies', field: false, battle: true, throwable: false,
    effect: { addStatus: ['mbarrier'] },
  },
  mirror: {
    name: 'Mirror', desc: 'Casts [Reflect] on all allies', price: 0,
    target: 'allAllies', field: false, battle: true, throwable: false,
    effect: { addStatus: ['reflect'] },
  },
  holy_torch: {
    name: 'Holy Torch', desc: 'Casts DeSpell on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { cure: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield'] },
  },

  // ------------------------------------------------- battle items: explosives
  grenade: {
    name: 'Grenade', desc: 'Explosive damage to one opponent', price: 80,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 160, kind: 'phys', element: 'shoot' } },
  },
  shrapnel: {
    name: 'Shrapnel', desc: 'Explosive damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 416, kind: 'phys', element: 'shoot' } },
  },
  right_arm: {
    name: 'Right arm', desc: 'Heavy explosive damage to all', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1600, kind: 'phys', element: 'shoot' } },
  },
  molotov: {
    name: 'Molotov', desc: 'Fire damage to one opponent', price: 400,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 400, kind: 'phys', element: 'fire' } },
  },
  s_mine: {
    name: 'S-mine', desc: 'Explosive damage to one opponent', price: 1000,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1600, kind: 'phys', element: 'shoot' } },
  },
  '8inch_cannon': {
    name: '8inch Cannon', desc: 'Heavy damage to one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 3200, kind: 'phys', element: 'shoot' } },
  },

  // --------------------------------------------- battle items: magic attacks
  fire_fang: {
    name: 'Fire Fang', desc: 'Fire damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 960, kind: 'mag', element: 'fire' } },
  },
  fire_veil: {
    name: 'Fire Veil', desc: 'Strong fire damage to all', price: 800,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1200, kind: 'mag', element: 'fire' } },
  },
  antarctic_wind: {
    name: 'Antarctic Wind', desc: 'Ice damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1200, kind: 'mag', element: 'ice' } },
  },
  ice_crystal: {
    name: 'Ice Crystal', desc: 'Strong ice damage to all', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 2076, kind: 'mag', element: 'ice' } },
  },
  bolt_plume: {
    name: 'Bolt Plume', desc: 'Lightning damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 416, kind: 'mag', element: 'lightning' } },
  },
  swift_bolt: {
    name: 'Swift Bolt', desc: 'Strong lightning damage to all', price: 800,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1200, kind: 'mag', element: 'lightning' } },
  },
  earth_drum: {
    name: 'Earth Drum', desc: 'Earth damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 640, kind: 'mag', element: 'earth' } },
  },
  earth_mallet: {
    name: 'Earth Mallet', desc: 'Strong earth damage to all', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 2560, kind: 'mag', element: 'earth' } },
  },
  deadly_waste: {
    name: 'Deadly Waste', desc: 'Poison damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 96, kind: 'mag', element: 'poison' }, enemyStatus: ['poison'], chance: 20 },
  },
  m_tentacles: {
    name: 'M-Tentacles', desc: 'Strong poison damage to all', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 2400, kind: 'mag', element: 'poison' }, enemyStatus: ['poison'], chance: 48 },
  },
  bird_wing: {
    name: 'Bird Wing', desc: 'Wind damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1040, kind: 'mag', element: 'wind' } },
  },
  dragon_scales: {
    name: 'Dragon Scales', desc: 'Water damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 3680, kind: 'mag', element: 'water' } },
  },
  dragon_fang: {
    name: 'Dragon Fang', desc: 'Lightning damage to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 2400, kind: 'mag', element: 'lightning' } },
  },
  stardust: {
    name: 'Stardust', desc: 'Meteors strike opponents at random', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 1120, kind: 'mag', hits: 4, random: true } },
  },
  vampire_fang: {
    name: 'Vampire Fang', desc: 'Drains HP from one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 192, kind: 'mag', drain: true } },
  },
  ghost_hand: {
    name: 'Ghost Hand', desc: 'Drains MP from one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { fixed: 32, kind: 'mag', mp: true, drain: true } },
  },
  graviball: {
    name: 'Graviball', desc: 'Cuts one opponent\'s HP by 1/4', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { kind: 'gravity', pct: 25, element: 'gravity' } },
  },
  t_s_bomb: {
    name: 'T/S Bomb', desc: 'Cuts one opponent\'s HP by 1/2', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { damage: { kind: 'gravity', pct: 50, element: 'gravity' } },
  },

  // ----------------------------------------------- battle items: status hits
  hourglass: {
    name: 'Hourglass', desc: 'Casts [Stop] on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['stop'], chance: 80 },
  },
  kiss_of_death: {
    name: 'Kiss of Death', desc: 'Instant death to all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['death'], chance: 68 },
  },
  spider_web: {
    name: 'Spider Web', desc: 'Casts [Slow] on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['slow'], chance: 100 },
  },
  dream_powder: {
    name: 'Dream Powder', desc: 'Casts [Sleep] on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['sleep'], chance: 80 },
  },
  mute_mask: {
    name: 'Mute Mask', desc: 'Casts [Silence] on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['silence'], chance: 80 },
  },
  war_gong: {
    name: 'War Gong', desc: 'Casts [Berserk] on all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['berserk'], chance: 80 },
  },
  loco_weed: {
    name: 'Loco weed', desc: 'Confuses all opponents', price: 0,
    target: 'allEnemies', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['confusion'], chance: 80 },
  },
  vagyrisk_claw: {
    name: 'Vagyrisk Claw', desc: 'Petrifies one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['petrify'], chance: 68 },
  },
  impaler: {
    name: 'Impaler', desc: 'Turns one opponent into a frog', price: 500,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['frog'], chance: 100 },
  },
  shrivel: {
    name: 'Shrivel', desc: 'Shrinks one opponent', price: 500,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['small'], chance: 100 },
  },
  ink: {
    name: 'Ink', desc: 'Blinds one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['darkness'], chance: 100 },
  },
  dazers: {
    name: 'Dazers', desc: 'Paralyzes one opponent', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['paralysis'], chance: 100 },
  },
  cauldron: {
    name: 'Cauldron', desc: 'Inflicts six ailments on one foe', price: 0,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { enemyStatus: ['sleep', 'poison', 'confusion', 'silence', 'frog', 'small'], chance: 100 },
  },

  // ---------------------------------------------------------- chocobo greens
  // In battle: heal the target 100 HP and keep a wild chocobo from fleeing.
  // In the field they are fed through the Chocobo Farm stable menu (not the Item menu).
  gysahl_greens: {
    name: 'Gysahl Greens', desc: 'Chocobo food', price: 100,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'gysahl' },
  },
  krakka_greens: {
    name: 'Krakka Greens', desc: 'Chocobo food. Builds charm', price: 250,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'krakka' },
  },
  tantal_greens: {
    name: 'Tantal Greens', desc: 'Chocobo food. Stamina, charm', price: 400,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'tantal' },
  },
  pahsana_greens: {
    name: 'Pahsana Greens', desc: 'Chocobo food. Builds charm', price: 800,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'pahsana' },
  },
  curiel_greens: {
    name: 'Curiel Greens', desc: 'Chocobo food. Builds stamina', price: 1000,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'curiel' },
  },
  mimett_greens: {
    name: 'Mimett Greens', desc: 'Chocobo food. Builds speed', price: 1500,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'mimett' },
  },
  reagan_greens: {
    name: 'Reagan Greens', desc: 'Chocobo food. Builds stamina', price: 3000,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'reagan' },
  },
  sylkis_greens: {
    name: 'Sylkis Greens', desc: 'Finest chocobo food', price: 5000,
    target: 'enemy', field: false, battle: true, throwable: false,
    effect: { healHp: 100, greens: 'sylkis' },
  },

  // ------------------------------------------------------------ chocobo nuts
  pepio_nut: {
    name: 'Pepio Nut', desc: 'For breeding chocobos', price: 100,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'pepio' },
  },
  luchile_nut: {
    name: 'Luchile Nut', desc: 'For breeding chocobos', price: 200,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'luchile' },
  },
  saraha_nut: {
    name: 'Saraha Nut', desc: 'For breeding chocobos', price: 400,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'saraha' },
  },
  lasan_nut: {
    name: 'Lasan Nut', desc: 'For breeding chocobos', price: 600,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'lasan' },
  },
  pram_nut: {
    name: 'Pram Nut', desc: 'For breeding chocobos', price: 1500,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'pram' },
  },
  porov_nut: {
    name: 'Porov Nut', desc: 'For breeding chocobos', price: 2000,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'porov' },
  },
  carob_nut: {
    name: 'Carob Nut', desc: 'For breeding chocobos', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'carob' },
  },
  zeio_nut: {
    name: 'Zeio Nut', desc: 'For breeding chocobos', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: { nut: 'zeio' },
  },

  // ----------------------------------------------------------------- sources
  power_source: {
    name: 'Power Source', desc: 'Raises Strength by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { str: 1 } },
  },
  guard_source: {
    name: 'Guard Source', desc: 'Raises Vitality by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { vit: 1 } },
  },
  magic_source: {
    name: 'Magic Source', desc: 'Raises Magic by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { mag: 1 } },
  },
  mind_source: {
    name: 'Mind Source', desc: 'Raises Spirit by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { spr: 1 } },
  },
  speed_source: {
    name: 'Speed Source', desc: 'Raises Dexterity by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { dex: 1 } },
  },
  luck_source: {
    name: 'Luck Source', desc: 'Raises Luck by 1', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { statUp: { lck: 1 } },
  },

  // ------------------------------------------------ Limit Break manuals (Lv4)
  omnislash: {
    name: 'Omnislash', desc: 'Teaches Cloud a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'omnislash' },
  },
  catastrophe: {
    name: 'Catastrophe', desc: 'Teaches Barret a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'catastrophe' },
  },
  final_heaven: {
    name: 'Final Heaven', desc: 'Teaches Tifa a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'final_heaven' },
  },
  great_gospel: {
    name: 'Great Gospel', desc: 'Teaches Aeris a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'great_gospel' },
  },
  cosmo_memory: {
    name: 'Cosmo Memory', desc: 'Teaches Red XIII a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'cosmo_memory' },
  },
  all_creation: {
    name: 'All Creation', desc: 'Teaches Yuffie a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'all_creation' },
  },
  chaos: {
    name: 'Chaos', desc: 'Teaches Vincent a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'chaos' },
  },
  highwind: {
    name: 'Highwind', desc: 'Teaches Cid a Level 4 Limit', price: 0,
    target: 'ally', field: true, battle: false, throwable: false,
    effect: { learnLimit: 'highwind' },
  },

  // ------------------------------------------------- special / trade items
  // (In FF7 these sit in the normal Item list, not in Key Items.)
  battery: {
    name: 'Battery', desc: 'Seems to start some machine', price: 100,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  save_crystal: {
    name: 'Save Crystal', desc: 'Makes a save point in the Crater', price: 0,
    target: 'none', field: true, battle: false, throwable: false,
    effect: { saveCrystal: true },
  },
  desert_rose: {
    name: 'Desert Rose', desc: 'Wanted by a man in Kalm', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  earth_harp: {
    name: 'Earth Harp', desc: 'Wanted by a man in Kalm', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  guide_book: {
    name: 'Guide Book', desc: 'Wanted by a man in Kalm', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },

  // ------------------------------------ Gold Saucer prizes / junk (no use)
  tissue: {
    name: 'Tissue', desc: 'A consolation prize', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  '1_35_soldier': {
    name: '1/35 soldier', desc: 'A 1/35 scale Shinra soldier', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  super_sweeper: {
    name: 'Super Sweeper', desc: 'A Super Sweeper model', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  masamune_blade: {
    name: 'Masamune Blade', desc: 'A perfect copy of Sephiroth\'s sword', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  combat_diary: {
    name: 'Combat Diary', desc: 'A diary of past battles', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  autograph: {
    name: 'Autograph', desc: 'Dio\'s autograph', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
  gambler: {
    name: 'Gambler', desc: 'A Battle Square souvenir', price: 0,
    target: 'none', field: false, battle: false, throwable: false,
    effect: {},
  },
});

// Key items: FF7.data.keyItems. Owned or not (no quantities). The five Midgar Parts and the
// four Huge Materia are separate entries, as in FF7.
Object.assign(FF7.data.keyItems, {
  // ---- Wall Market (Disc 1): Don Corneo audition
  cotton_dress: { name: 'Cotton Dress', desc: 'A plain cotton dress' },
  satin_dress: { name: 'Satin Dress', desc: 'A soft, shiny satin dress' },
  silk_dress: { name: 'Silk Dress', desc: 'A soft, shimmering silk dress' },
  wig: { name: 'Wig', desc: 'A plain wig' },
  dyed_wig: { name: 'Dyed Wig', desc: 'A dyed wig' },
  blonde_wig: { name: 'Blonde Wig', desc: 'A gorgeous blonde wig' },
  glass_tiara: { name: 'Glass Tiara', desc: 'A tiara of cut glass' },
  ruby_tiara: { name: 'Ruby Tiara', desc: 'A tiara set with rubies' },
  diamond_tiara: { name: 'Diamond Tiara', desc: 'A tiara set with diamonds' },
  cologne: { name: 'Cologne', desc: 'A plain cologne' },
  flower_cologne: { name: 'Flower Cologne', desc: 'A cologne with a floral scent' },
  sexy_cologne: { name: 'Sexy Cologne', desc: 'An alluring cologne' },
  members_card: { name: 'Member\'s Card', desc: 'Honey Bee Inn membership card' },
  lingerie: { name: 'Lingerie', desc: 'Lingerie from the Honey Bee Inn' },
  mystery_panties: { name: 'Mystery Panties', desc: 'Mysterious underwear (unused)' },
  bikini_briefs: { name: 'Bikini Briefs', desc: 'Bikini briefs from the Honey Bee Inn' },
  pharmacy_coupon: { name: 'Pharmacy Coupon', desc: 'Trade at the Wall Market item shop' },
  disinfectant: { name: 'Disinfectant', desc: 'Medicine from the pharmacy' },
  deodorant: { name: 'Deodorant', desc: 'Medicine from the pharmacy' },
  digestive: { name: 'Digestive', desc: 'Medicine from the pharmacy' },

  // ---- Shinra HQ (Disc 1)
  keycard_60: { name: 'Keycard 60', desc: 'Opens doors up to the 60th floor.' },
  keycard_62: { name: 'Keycard 62', desc: 'Opens doors up to the 62nd floor.' },
  keycard_65: { name: 'Keycard 65', desc: 'Opens doors up to the 65th floor.' },
  keycard_66: { name: 'Keycard 66', desc: 'Opens doors up to the 66th floor.' },
  keycard_68: { name: 'Keycard 68', desc: 'Opens doors up to the 68th floor.' },
  coupon_a: { name: 'Coupon A', desc: 'Exchange on 63F for a Star Pendant' },
  coupon_b: { name: 'Coupon B', desc: 'Exchange on 63F for Four Slots' },
  coupon_c: { name: 'Coupon C', desc: 'Exchange on 63F for All materia' },
  midgar_parts: { name: 'Midgar Parts', desc: 'A piece of the Midgar model' },
  midgar_parts_b: { name: 'Midgar Parts', desc: 'A piece of the Midgar model' },
  midgar_parts_c: { name: 'Midgar Parts', desc: 'A piece of the Midgar model' },
  midgar_parts_d: { name: 'Midgar Parts', desc: 'A piece of the Midgar model' },
  midgar_parts_e: { name: 'Midgar Parts', desc: 'A piece of the Midgar model' },

  // ---- World (Disc 1)
  phs: { name: 'PHS', desc: 'Change party members anywhere' },
  gold_ticket: { name: 'Gold Ticket', desc: 'Lifetime pass to the Gold Saucer' },
  keystone: { name: 'Keystone', desc: 'Key to the Temple of the Ancients' },
  basement_key: { name: 'Basement Key', desc: 'Opens the Shinra Mansion basement' },
  black_materia: { name: 'Black Materia', desc: 'Materia that summons Meteor' },
  lunar_harp: { name: 'Lunar Harp', desc: 'Awakens the Sleeping Forest' },
  snowboard: { name: 'Snowboard', desc: 'For sliding down snowy slopes' },
  glacier_map: { name: 'Glacier Map', desc: 'Map of the Great Glacier' },
  mythril: { name: 'Mythril', desc: 'A lump of mythril ore' },
  letter_to_a_daughter: { name: 'Letter to a Daughter', desc: 'An unsent letter (unused)' },
  letter_to_a_wife: { name: 'Letter to a Wife', desc: 'An unsent letter (unused)' },

  // ---- Disc 2 / 3
  huge_materia_corel: { name: 'Huge Materia', desc: 'Huge Materia from Corel' },
  huge_materia_condor: { name: 'Huge Materia', desc: 'Huge Materia from Fort Condor' },
  huge_materia_underwater: { name: 'Huge Materia', desc: 'Huge Materia from the submarine' },
  huge_materia_rocket: { name: 'Huge Materia', desc: 'Huge Materia from the rocket' },
  leviathan_scales: { name: 'Leviathan Scales', desc: 'Quells the flames at Da-chao' },
  key_to_ancients: { name: 'Key to Ancients', desc: 'Plays the City of the Ancients' },
  key_to_sector_5: { name: 'Key to Sector 5', desc: 'Opens the gate into Midgar' },
});

// Limit Breaks — FF7 (PS1 US, 1997). Sources: Terence Fergusson's FF7 Party Mechanics guide
// (kernel data: power, targets, statuses, kill/use requirements) and gideond's Limit Break
// Mechanics guide.
//
// power: phys power in 16-units (Terence's "Nx Base" * 16; 16 = a normal attack).
// target 'allEnemies' + hits N + random:true = N hits, each on a random enemy (Omnislash...).
// split: true = physical attack that hits every enemy once; FF7 multiplies damage by 2/3 when
//        more than one enemy is hit.
// Extra optional fields: crit (auto-critical), pierce (ignores Def), element, pct (heal % of
// max HP), splashPower (Blade Beam), form (Vincent's transformations), chain (Tifa).
// learn: 'start' | 'uses:<limitId>:<N>' | 'kills:<N>' (N = TOTAL enemies killed by that
//        character, cumulative) | 'item:<manual item id>' (level 4 manuals can only be used once
//        every other limit of that character has been learned — FF7 rule).

Object.assign(FF7.data.limits, {

  // ------------------------------------------------------------------ CLOUD
  braver: {
    name: 'Braver', char: 'cloud', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 48, hits: 1, random: false,
    learn: 'start',
    desc: 'Jumps and slashes an enemy',
  },
  cross_slash: {
    name: 'Cross-slash', char: 'cloud', level: 1, slot: 2,
    target: 'enemy', kind: 'phys', power: 52, hits: 1, random: false,
    add: ['paralysis'], hit: 100,
    learn: 'uses:braver:8',
    desc: 'Slashes an enemy, paralyzes',
  },
  blade_beam: {
    name: 'Blade Beam', char: 'cloud', level: 2, slot: 1,
    target: 'enemy', kind: 'phys', power: 56, hits: 1, random: false,
    special: 'blade_beam', splashPower: 16,
    learn: 'kills:120',
    desc: 'Energy wave; also hits the rest',
  },
  climhazzard: {
    name: 'Climhazzard', char: 'cloud', level: 2, slot: 2,
    target: 'enemy', kind: 'phys', power: 70, hits: 1, random: false,
    learn: 'uses:blade_beam:7',
    desc: 'Stabs and slashes upward',
  },
  meteorain: {
    name: 'Meteorain', char: 'cloud', level: 3, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 26, hits: 6, random: true,
    learn: 'kills:320',
    desc: 'Six meteors on random enemies',
  },
  finishing_touch: {
    name: 'Finishing Touch', char: 'cloud', level: 3, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 50, hits: 1, random: false, split: true,
    add: ['death'], hit: 100,
    learn: 'uses:meteorain:6',
    desc: 'Whirlwind; instant death to all',
  },
  omnislash: {
    name: 'Omnislash', char: 'cloud', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 12, hits: 15, random: true, crit: true,
    learn: 'item:omnislash',
    desc: '15 critical slashes at random',
  },

  // ------------------------------------------------------------------ BARRET
  big_shot: {
    name: 'Big Shot', char: 'barret', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 52, hits: 1, random: false,
    learn: 'start',
    desc: 'Fires an energy ball',
  },
  mindblow: {
    name: 'Mindblow', char: 'barret', level: 1, slot: 2,
    target: 'enemy', kind: 'special', element: 'gravity',
    special: 'mindblow',                        // MP damage = target's current MP (MP -> 0)
    learn: 'uses:big_shot:9',
    desc: 'Drains all of an enemy\'s MP',
  },
  grenade_bomb: {
    name: 'Grenade Bomb', char: 'barret', level: 2, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 54, hits: 1, random: false, split: true,
    learn: 'kills:80',
    desc: 'Grenade damages all enemies',
  },
  hammerblow: {
    name: 'Hammerblow', char: 'barret', level: 2, slot: 2,
    target: 'enemy', kind: 'special', add: ['death'], hit: 100,
    special: 'hammerblow',                      // knocks the enemy out of battle (fails if immune)
    learn: 'uses:grenade_bomb:8',
    desc: 'Blows an enemy out of battle',
  },
  satellite_beam: {
    name: 'Satellite Beam', char: 'barret', level: 3, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 35, hits: 1, random: false, split: true,
    crit: true,
    learn: 'kills:160',
    desc: 'Satellite beam hits all enemies',
  },
  ungarmax: {
    name: 'Ungarmax', char: 'barret', level: 3, slot: 2,  // PS1 US name (PC: "Angermax")
    target: 'allEnemies', kind: 'phys', power: 8, hits: 18, random: true,
    learn: 'uses:satellite_beam:6',
    desc: '18 shots at random enemies',
  },
  catastrophe: {
    name: 'Catastrophe', char: 'barret', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 20, hits: 10, random: true,
    learn: 'item:catastrophe',
    desc: '10 blasts at random enemies',
  },

  // ------------------------------------------------------------------ TIFA
  // All Tifa limits use the 'tifa_slots' hook and chain: selecting a limit performs every
  // learned Tifa limit up to and including it (by level, then slot), one reel each.
  beat_rush: {
    name: 'Beat Rush', char: 'tifa', level: 1, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 20, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'start',
    desc: 'Rush of punches',
  },
  somersault: {
    name: 'Somersault', char: 'tifa', level: 1, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 22, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'uses:beat_rush:9',
    desc: 'Somersault kick',
  },
  waterkick: {
    name: 'Waterkick', char: 'tifa', level: 2, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 24, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'kills:96',
    desc: 'Sweeping kick with a water blast',
  },
  meteodrive: {
    name: 'Meteodrive', char: 'tifa', level: 2, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 26, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'uses:waterkick:7',
    desc: 'Suplexes an enemy',
  },
  dolphin_blow: {
    name: 'Dolphin Blow', char: 'tifa', level: 3, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 28, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'kills:192',
    desc: 'Uppercut with a dolphin',
  },
  meteor_strike: {
    name: 'Meteor Strike', char: 'tifa', level: 3, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 30, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'uses:dolphin_blow:6',
    desc: 'Leaps and slams an enemy down',
  },
  final_heaven: {
    name: 'Final Heaven', char: 'tifa', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 42, hits: 1, random: true,
    special: 'tifa_slots', chain: true,
    learn: 'item:final_heaven',
    desc: 'Explosive final punch',
  },

  // ------------------------------------------------------------------ AERIS
  healing_wind: {
    name: 'Healing Wind', char: 'aeris', level: 1, slot: 1,
    target: 'allAllies', kind: 'heal', pct: 50, element: 'restorative',
    special: 'healing_wind',                    // restore 50% of each ally's max HP
    learn: 'start',
    desc: 'Restores HP of all allies',
  },
  seal_evil: {
    name: 'Seal Evil', char: 'aeris', level: 1, slot: 2,
    target: 'allEnemies', kind: 'special', add: ['stop', 'silence'], hit: 100,
    special: 'seal_evil',
    learn: 'uses:healing_wind:8',
    desc: 'Stop and Silence on all enemies',
  },
  breath_of_the_earth: {
    name: 'Breath of the Earth', char: 'aeris', level: 2, slot: 1,
    target: 'allAllies', kind: 'special',
    remove: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'slow', 'stop',
      'frog', 'small', 'slow_numb', 'petrify'],
    special: 'breath_of_the_earth',
    learn: 'kills:80',
    desc: 'Cures abnormal status of allies',
  },
  fury_brand: {
    name: 'Fury Brand', char: 'aeris', level: 2, slot: 2,
    target: 'allAllies', kind: 'special',
    special: 'fury_brand',                      // fills the limit gauge of the OTHER allies
    learn: 'uses:breath_of_the_earth:6',
    desc: 'Fills allies\' Limit gauges',
  },
  planet_protector: {
    name: 'Planet Protector', char: 'aeris', level: 3, slot: 1,
    target: 'allAllies', kind: 'buff', add: ['peerless'], hit: 100,
    special: 'planet_protector',
    learn: 'kills:160',
    desc: 'Makes all allies invulnerable',
  },
  pulse_of_life: {
    name: 'Pulse of Life', char: 'aeris', level: 3, slot: 2,
    target: 'allAllies', kind: 'heal', pct: 100, remove: ['death'],
    special: 'pulse_of_life',                   // full HP + MP, revives KO'd allies
    learn: 'uses:planet_protector:5',
    desc: 'Fully restores all allies',
  },
  great_gospel: {
    name: 'Great Gospel', char: 'aeris', level: 4, slot: 1,
    target: 'allAllies', kind: 'heal', pct: 100, remove: ['death'], add: ['peerless'], hit: 100,
    special: 'great_gospel',                    // full HP + MP, revive, Peerless
    learn: 'item:great_gospel',
    desc: 'Full recovery and invulnerability',
  },

  // ------------------------------------------------------------------ RED XIII
  sled_fang: {
    name: 'Sled Fang', char: 'redxiii', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 48, hits: 1, random: false,
    learn: 'start',
    desc: 'Charges through an enemy',
  },
  lunatic_high: {
    name: 'Lunatic High', char: 'redxiii', level: 1, slot: 2,
    target: 'allAllies', kind: 'buff', add: ['haste'], hit: 100,
    special: 'lunatic_high',                    // + raises evade (see docs/abilities.md)
    learn: 'uses:sled_fang:8',
    desc: 'Haste and higher evade for allies',
  },
  blood_fang: {
    name: 'Blood Fang', char: 'redxiii', level: 2, slot: 1,
    target: 'enemy', kind: 'phys', power: 20, hits: 1, random: false,
    special: 'absorb_hp_mp',
    learn: 'kills:72',
    desc: 'Attack that absorbs HP and MP',
  },
  stardust_ray: {
    name: 'Stardust Ray', char: 'redxiii', level: 2, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 10, hits: 10, random: true,
    learn: 'uses:blood_fang:7',
    desc: 'Rain of stars on random enemies',
  },
  howling_moon: {
    name: 'Howling Moon', char: 'redxiii', level: 3, slot: 1,
    target: 'self', kind: 'buff', add: ['haste', 'berserk'], hit: 100,
    special: 'howling_moon',                    // + Attack +60% (modifier cap +100%)
    learn: 'kills:144',
    desc: 'Haste, Berserk, raises Attack',
  },
  earth_rave: {
    name: 'Earth Rave', char: 'redxiii', level: 3, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 30, hits: 5, random: true,
    learn: 'uses:howling_moon:6',
    desc: 'Five blasts at random enemies',
  },
  cosmo_memory: {
    name: 'Cosmo Memory', char: 'redxiii', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 125, hits: 1, random: false, split: true,
    learn: 'item:cosmo_memory',
    desc: 'Cosmic energy blast on all',
  },

  // ------------------------------------------------------------------ YUFFIE
  greased_lightning: {
    name: 'Greased Lightning', char: 'yuffie', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 50, hits: 1, random: false,
    learn: 'start',
    desc: 'Lightning-fast dash attack',
  },
  clear_tranquil: {
    name: 'Clear Tranquil', char: 'yuffie', level: 1, slot: 2,
    target: 'allAllies', kind: 'heal', pct: 50, element: 'restorative',
    special: 'clear_tranquil',                  // restore 50% of each ally's max HP
    learn: 'uses:greased_lightning:8',
    desc: 'Restores HP of all allies',
  },
  landscaper: {
    name: 'Landscaper', char: 'yuffie', level: 2, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 48, hits: 1, random: false, split: true,
    element: 'earth',
    learn: 'kills:64',
    desc: 'Upheaves the ground under all',
  },
  bloodfest: {
    name: 'Bloodfest', char: 'yuffie', level: 2, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 10, hits: 10, random: true,
    learn: 'uses:landscaper:7',
    desc: '10 hits at random enemies',
  },
  gauntlet: {
    name: 'Gauntlet', char: 'yuffie', level: 3, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 28, hits: 1, random: false, split: true,
    crit: true, pierce: true,
    learn: 'kills:128',
    desc: 'Blast on all, ignores defense',
  },
  doom_of_the_living: {
    name: 'Doom of the Living', char: 'yuffie', level: 3, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 10, hits: 15, random: true,
    learn: 'uses:gauntlet:6',
    desc: '15 hits at random enemies',
  },
  all_creation: {
    name: 'All Creation', char: 'yuffie', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 128, hits: 1, random: false, split: true,
    learn: 'item:all_creation',
    desc: 'Huge energy beam on all enemies',
  },

  // ------------------------------------------------------------------ CAIT SITH
  dice: {
    name: 'Dice', char: 'caitsith', level: 1, slot: 1,
    target: 'enemy', kind: 'special',
    special: 'dice',                            // 100 * sum * highest repeat; 2-6 dice by level
    learn: 'start',
    desc: 'Damage by a roll of the dice',
  },
  slots: {
    name: 'Slots', char: 'caitsith', level: 2, slot: 1,
    target: 'enemy', kind: 'special',
    special: 'slots',                           // 8 outcomes, see docs/abilities.md
    learn: 'kills:40',
    desc: 'Effect decided by a slot machine',
  },

  // ------------------------------------------------------------------ VINCENT
  // Vincent transforms for the rest of the battle (or until KO): full HP, stat modifiers,
  // and he auto-acts with form.attacks (chance = % per turn). form.hpPct = max HP %.
  galian_beast: {
    name: 'Galian Beast', char: 'vincent', level: 1, slot: 1,
    target: 'self', kind: 'special',
    special: 'galian_beast',
    form: {
      hpPct: 130, mods: { evade: 20, dex: 50 },
      attacks: [
        { name: 'Berserk Dance', kind: 'phys', power: 24, target: 'enemy', chance: 70 },
        { name: 'Beast Flare', kind: 'mag', power: 60, target: 'allEnemies', element: 'fire',
          split: false, chance: 30 },
      ],
    },
    learn: 'start',
    desc: 'Transforms into a raging beast',
  },
  death_gigas: {
    name: 'Death Gigas', char: 'vincent', level: 2, slot: 1,
    target: 'self', kind: 'special',
    special: 'death_gigas',
    form: {
      hpPct: 200, mods: { def: 50, mdef: -70, dex: -20 },
      attacks: [
        { name: 'Gigadunk', kind: 'phys', power: 42, target: 'enemy', chance: 70 },
        { name: 'Live Wire', kind: 'mag', power: 70, target: 'allEnemies', element: 'lightning',
          split: false, chance: 30 },
      ],
    },
    learn: 'kills:40',
    desc: 'Transforms into a giant',
  },
  hellmasker: {
    name: 'Hellmasker', char: 'vincent', level: 3, slot: 1,
    target: 'self', kind: 'special',
    special: 'hellmasker',
    form: {
      hpPct: 100, mods: { def: 50, evade: 50 },
      attacks: [
        { name: 'Splattercombo', kind: 'phys', power: 8, target: 'allEnemies', hits: 5,
          random: true, chance: 70 },
        { name: 'Nightmare', kind: 'status', target: 'enemy',
          add: ['sleep', 'poison', 'confusion', 'silence', 'frog', 'small'], hit: 100, chance: 30 },
      ],
    },
    learn: 'kills:96',
    desc: 'Transforms into a chainsaw killer',
  },
  chaos: {
    name: 'Chaos', char: 'vincent', level: 4, slot: 1,
    target: 'self', kind: 'special',
    special: 'chaos',
    form: {
      hpPct: 100, mods: { def: 100, mdef: 100 },
      attacks: [
        { name: 'Chaos Saber', kind: 'phys', power: 40, target: 'allEnemies', split: true,
          chance: 70 },
        { name: 'Satan Slam', kind: 'mag', power: 90, target: 'allEnemies', split: false,
          add: ['death'], hit: 28, chance: 30 },
      ],
    },
    learn: 'item:chaos',
    desc: 'Transforms into a demon',
  },

  // ------------------------------------------------------------------ CID
  boost_jump: {
    name: 'Boost Jump', char: 'cid', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 52, hits: 1, random: false,
    learn: 'start',
    desc: 'Leaps and spears an enemy',
  },
  dynamite: {
    name: 'Dynamite', char: 'cid', level: 1, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 36, hits: 1, random: false, split: true,
    learn: 'uses:boost_jump:7',
    desc: 'Throws dynamite at all enemies',
  },
  hyper_jump: {
    name: 'Hyper Jump', char: 'cid', level: 2, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 56, hits: 1, random: false, split: true,
    add: ['death'], hit: 20,
    learn: 'kills:60',
    desc: 'Explosive jump; may kill',
  },
  dragon: {
    name: 'Dragon', char: 'cid', level: 2, slot: 2,
    target: 'enemy', kind: 'phys', power: 20, hits: 1, random: false,
    special: 'absorb_hp_mp',
    learn: 'uses:hyper_jump:6',
    desc: 'Dragon absorbs HP and MP',
  },
  dragon_dive: {
    name: 'Dragon Dive', char: 'cid', level: 3, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 23, hits: 6, random: true,
    add: ['death'], hit: 28,
    learn: 'kills:136',
    desc: 'Six dives at random; may kill',
  },
  big_brawl: {
    name: 'Big Brawl', char: 'cid', level: 3, slot: 2,
    target: 'allEnemies', kind: 'phys', power: 18, hits: 8, random: true,
    learn: 'uses:dragon_dive:5',
    desc: 'Eight strikes at random enemies',
  },
  highwind: {
    name: 'Highwind', char: 'cid', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 11, hits: 18, random: true,
    learn: 'item:highwind',
    desc: '18 missiles at random enemies',
  },

  // ------------------------------------------------------------------ THE TURKS (Config > Turks Join; not in the PS1
  // game): one Limit per level, like Vincent; levels 2-4 come with kills (they join late: 40 / 90 / 160)
  electroshock: {
    name: 'Electroshock', char: 'reno', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 46, hits: 1, random: false, element: 'lightning',
    add: ['paralysis'], hit: 60,
    learn: 'start',
    desc: 'A jolt from the rod; may paralyze',
  },
  pyramid: {
    name: 'Pyramid', char: 'reno', level: 2, slot: 1,
    target: 'enemy', kind: 'phys', power: 40, hits: 1, random: false,
    add: ['stop'], hit: 100,
    learn: 'kills:40',
    desc: 'Seals an enemy in a pyramid of light: Stop',
  },
  turk_light: {
    name: 'Turk Light', char: 'reno', level: 3, slot: 1,
    target: 'allEnemies', kind: 'mag', power: 72, element: 'lightning', split: false,
    learn: 'kills:90',
    desc: 'Lightning on every enemy',
  },
  neo_turk_light: {
    name: 'Neo Turk Light', char: 'reno', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 24, hits: 6, random: true, element: 'lightning',
    learn: 'kills:160',
    desc: 'Six charged strikes on random enemies',
  },
  shoulder_attack: {
    name: 'Shoulder Attack', char: 'rude', level: 1, slot: 1,
    target: 'enemy', kind: 'phys', power: 56, hits: 1, random: false,
    learn: 'start',
    desc: 'A crushing charge',
  },
  grand_spark: {
    name: 'Grand Spark', char: 'rude', level: 2, slot: 1,
    target: 'enemy', kind: 'mag', power: 88, element: 'lightning',
    learn: 'kills:40',
    desc: 'A burst of lightning from the fist',
  },
  bulwark: {
    name: 'Bulwark', char: 'rude', level: 3, slot: 1,
    target: 'allAllies', kind: 'buff', add: ['barrier', 'mbarrier', 'regen'],
    learn: 'kills:90',
    desc: 'Barrier, MBarrier and Regen on everyone',
  },
  silent_fury: {
    name: 'Silent Fury', char: 'rude', level: 4, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 30, hits: 8, random: true,
    learn: 'kills:160',
    desc: 'Eight blows on random enemies',
  },
  throw: {
    name: 'Throw', char: 'elena', level: 1, slot: 1,
    target: 'allEnemies', kind: 'phys', power: 22, hits: 3, random: true, element: 'fire',
    learn: 'start',
    desc: 'Three incendiary charges on random enemies',
  },
  rookies_grit: {
    name: "Rookie's Grit", char: 'elena', level: 2, slot: 1,
    target: 'allAllies', kind: 'heal', pct: 50, element: 'restorative',
    learn: 'kills:40',
    desc: 'Restores half of everyone\'s HP',
  },
  throw_fire: {
    name: 'Throw Fire', char: 'elena', level: 3, slot: 1,
    target: 'allEnemies', kind: 'mag', power: 76, element: 'fire', split: false,
    learn: 'kills:90',
    desc: 'Fire on every enemy',
  },
  turks_honor: {
    name: "Turks' Honor", char: 'elena', level: 4, slot: 1,
    target: 'allAllies', kind: 'heal', pct: 100, element: 'restorative', revives: true,
    learn: 'kills:160',
    desc: 'Everyone back on their feet, fully healed',
  },
});

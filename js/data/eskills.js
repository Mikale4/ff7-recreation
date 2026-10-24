// Enemy Skills — FF7 (PS1 US, 1997). Source: Terence Fergusson's FF7 Party Mechanics guide
// (kernel data) + SineNomine's Enemy-Skill FAQ + Terence's Enemy Mechanics (who uses what).
// power: 16 = 1.0x Base (Terence's "Nx Base" * 16). "All" e-skills never split.
// learnFrom: documentation only — learning is driven by the enemy attack's `eskill` field.
// Extra optional fields: toggle, noReflect, pierce, phys (uses the physical formula / PAt%),
// element as an array (multi-element; see summons.js).

Object.assign(FF7.data.eskills, {
  frog_song: {
    name: 'Frog Song', mp: 5, target: 'enemy', canAll: false,
    kind: 'status', add: ['frog', 'sleep'], hit: 100, toggle: true,
    learnFrom: ['touch_me', 'toxic_frog', 'christopher'],
    desc: 'Frog and Sleep on one target',
  },
  l4_suicide: {
    name: 'L4 Suicide', mp: 10, target: 'allEnemies', canAll: false,
    kind: 'special', add: ['small'], hit: 100, split: false,
    special: 'l4_suicide',                      // lv%4==0: lose HP*31/32 + Mini, else miss
    learnFrom: ['mu', 'trickplay'],
    desc: 'Crushes targets with Lv x4',
  },
  magic_hammer: {
    name: 'Magic Hammer', mp: 3, target: 'enemy', canAll: false,
    kind: 'mpdrain', fixed: 100,
    learnFrom: ['razor_weed'],
    desc: 'Drains 100 MP from one target',
  },
  white_wind: {
    name: 'White Wind', mp: 34, target: 'allAllies', canAll: false,
    kind: 'special', element: 'restorative', split: false, noReflect: true,
    remove: ['sleep', 'poison', 'confusion', 'silence', 'slow', 'stop', 'frog', 'small',
      'slow_numb', 'petrify', 'berserk', 'paralysis', 'darkness', 'resist', 'manipulate'],
    special: 'white_wind',                      // heal = caster's current HP; also clears Death Force
    learnFrom: ['zemzelett', 'wind_wing'],
    desc: 'Heals by user\'s HP, cures status',
  },
  big_guard: {
    name: 'Big Guard', mp: 56, target: 'allAllies', canAll: false,
    kind: 'status', add: ['barrier', 'mbarrier', 'haste'], hit: 100, noReflect: true,
    learnFrom: ['beach_plug'],
    desc: 'Barrier, MBarrier, Haste on all',
  },
  angel_whisper: {
    name: 'Angel Whisper', mp: 50, target: 'ally', canAll: false,
    kind: 'fullcure', pct: 100, element: 'restorative', noReflect: true,
    remove: ['death', 'sleep', 'poison', 'confusion', 'silence', 'slow', 'stop', 'frog', 'small',
      'slow_numb', 'petrify', 'berserk', 'paralysis', 'darkness'],
    special: 'angel_whisper', revives: true,    // works on KO'd targets too: revive + full HP
    learnFrom: ['pollensalta'],
    desc: 'Revives, restores HP, cures status',
  },
  dragon_force: {
    name: 'Dragon Force', mp: 19, target: 'ally', canAll: false,
    kind: 'special', noReflect: true,
    special: 'dragon_force',                    // +50% Def and MDef (cap +100%) for the battle
    learnFrom: ['dark_dragon'],
    desc: 'Raises Defense and MDefense',
  },
  death_force: {
    name: 'Death Force', mp: 3, target: 'ally', canAll: false,
    kind: 'special', noReflect: true,
    special: 'death_force',                     // immune to instant death for the battle
    learnFrom: ['adamantaimai'],
    desc: 'Protects from instant death',
  },
  flame_thrower: {
    name: 'Flame Thrower', mp: 10, target: 'enemy', canAll: false,
    kind: 'damage', power: 14, element: 'fire',
    learnFrom: ['ark_dragon', 'dragon'],
    desc: 'Fire damage to one target',
  },
  laser: {
    name: 'Laser', mp: 16, target: 'enemy', canAll: false,
    kind: 'gravity', pct: 50, element: 'gravity',
    learnFrom: ['death_claw', 'dark_dragon'],
    desc: 'Cuts HP of one target by 1/2',
  },
  matra_magic: {
    name: 'Matra Magic', mp: 8, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 11, split: false,
    learnFrom: ['custom_sweeper', 'bullmotor', 'death_machine'],
    desc: 'Missile damage to all opponents',
  },
  bad_breath: {
    name: 'Bad Breath', mp: 58, target: 'allEnemies', canAll: false,
    kind: 'status', add: ['sleep', 'poison', 'confusion', 'silence', 'frog', 'small'], hit: 100,
    split: false, noReflect: true,
    learnFrom: ['malboro'],
    desc: 'Many abnormal statuses on all',
  },
  beta: {
    name: 'Beta', mp: 35, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 54, element: 'fire', split: false, noReflect: true,
    learnFrom: ['midgar_zolom'],
    desc: 'Fire damage to all opponents',
  },
  aqualung: {
    name: 'Aqualung', mp: 34, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 52, element: 'water', split: false,
    learnFrom: ['harpy', 'jenova_life', 'serpent'],
    desc: 'Water damage to all opponents',
  },
  trine: {
    name: 'Trine', mp: 20, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 34, element: 'lightning', split: false, noReflect: true,
    learnFrom: ['materia_keeper', 'godo', 'stilva'],
    desc: 'Lightning damage to all',
  },
  magic_breath: {
    name: 'Magic Breath', mp: 75, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 77, element: ['fire', 'ice', 'lightning'], split: false,
    noReflect: true,
    learnFrom: ['stilva', 'parasite'],
    desc: 'Fire/Ice/Bolt damage to all',
  },
  question: {
    name: '????', mp: 3, target: 'enemy', canAll: false,
    kind: 'special', phys: true, noReflect: true,
    special: 'question',                        // damage = caster's max HP - current HP
    learnFrom: ['jersey', 'behemoth'],
    desc: 'Damage equal to user\'s lost HP',
  },
  goblin_punch: {
    name: 'Goblin Punch', mp: 0, target: 'enemy', canAll: false,
    kind: 'special', power: 12, phys: true, noReflect: true,
    special: 'goblin_punch',                    // physical, power 12; x8 if caster Lv == target Lv
    learnFrom: ['goblin'],
    desc: 'Strong if levels are equal',
  },
  chocobuckle: {
    name: 'Chocobuckle', mp: 3, target: 'enemy', canAll: false,
    kind: 'special', phys: true, noReflect: true,
    special: 'chocobuckle',                     // damage = number of times the party has escaped
    learnFrom: ['chocobo'],
    desc: 'Damage equal to escapes made',
  },
  l5_death: {
    name: 'L5 Death', mp: 22, target: 'allEnemies', canAll: false,
    kind: 'special', add: ['death'], hit: 100, split: false, noReflect: true,
    special: 'l5_death',                        // Death to targets whose Lv is a multiple of 5
    learnFrom: ['parasite'],
    desc: 'Death to targets with Lv x5',
  },
  death_sentence: {
    name: 'Death Sentence', mp: 10, target: 'enemy', canAll: false,
    kind: 'status', add: ['death_sentence'], hit: 100, noReflect: true,
    learnFrom: ['boundfat', 'gi_spector', 'sneaky_step'],
    desc: 'Countdown to death',
  },
  roulette: {
    name: 'Roulette', mp: 6, target: 'everyone', canAll: false,
    kind: 'special', add: ['death'], hit: 100, noReflect: true,
    special: 'roulette',                        // Death on ONE random combatant (either side)
    learnFrom: ['death_dealer'],
    desc: 'Death to a random target',
  },
  shadow_flare: {
    name: 'Shadow Flare', mp: 100, target: 'enemy', canAll: false,
    kind: 'damage', power: 125,
    learnFrom: ['dragon_zombie', 'ultimate_weapon', 'ruby_weapon', 'safer_sephiroth'],
    desc: 'Massive damage to one target',
  },
  pandoras_box: {
    name: 'Pandora\'s Box', mp: 110, target: 'allEnemies', canAll: false,
    kind: 'damage', power: 60, pierce: true, split: false,
    learnFrom: ['dragon_zombie'],               // one-time: Dragon Zombie's final attack
    desc: 'Damage to all, ignores defense',
  },
});

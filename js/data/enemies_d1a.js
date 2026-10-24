// Enemies — Disc 1, part A: from the opening bombing mission until the cargo ship leaves Junon.
// Source: Terence Fergusson's Enemy Mechanics FAQ v1.11 (stats, AI scripts) cross-checked with the
// Enemy Encounter FAQ (DynamixDJ). See docs/enemies_d1a.md for tables, bosses, bg and music.
//
// Conventions used in this file (see DATA_SCHEMA.md):
// - Drop/steal chance = FF7 "chance class" N converted to percent: (N + 1) / 64 (e.g. [8] -> 14, [32] -> 52).
// - Attack `power` in 16-units (1x Base = 16). Status `hit` = FF7 status rating - 1.
// - All-target enemy attacks that FF7 splits (no "NS" flag) already include the 2/3 split in `power`.
// - Optional extra attack fields (safe to ignore): `acc` (FF7 PAt%/MAt% when not 100), `silent: true`
//   (FF7 shows no attack name), `formula: 'phys'` (drain that uses the physical formula),
//   `summon` (enemy id created alongside an 'imprisoned' status: Pyramid / Waterpolo),
//   `selfDamage` (damage the user takes, Aps' Sewer Tsunami), `selfKO` (user leaves battle, no rewards).
// - Optional enemy fields: `cantReach: true` (FF7 "Can't Reach": short-range attacks can't hit),
//   `physImmune: true` (immune to physical damage), `chocobo: true` (Chocobo Lure battle chocobo).
// - Optional AI hook `ai.counter.custom(e, b, src, kind, act)`: called after the enemy is hit
//   (kind 'phys' | 'mag' | 'other', src = attacker, act = ability id if known) and on death
//   (kind 'death'); returns { move, target } for an immediate counter, or null. Everything essential
//   also works from `ai.custom` alone. Custom code may write e.def / e.mdf / e.defPct (form changes).

Object.assign(FF7.data.enemies, {

  // ===========================================================================================
  // No. 1 Reactor / Sector 1 station / Sector 8 escape
  // ===========================================================================================
  mp: {
    name: 'MP',
    level: 2, hp: 30, mp: 0, exp: 16, ap: 2, gil: 10,
    atk: 6, def: 4, defPct: 0, mat: 0, mdf: 0, dex: 50, lck: 4,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'grenade', chance: 14 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', c1: '#3656a8', c2: '#8c93a3', c3: '#e8c040', size: 1 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      tonfa: { name: 'Tonfa', kind: 'phys', power: 24, element: 'hit', target: 'enemy', acc: 85, silent: true },
    },
    ai: { moves: [['machine_gun', 50], ['tonfa', 50]] },
    desc: 'Shinra Military Police. Armed with a machine gun and a tonfa.',
  },

  guard_hound: {
    name: 'Guard Hound',
    level: 3, hp: 42, mp: 0, exp: 20, ap: 2, gil: 12,
    atk: 8, def: 4, defPct: 6, mat: 2, mdf: 2, dex: 64, lck: 6,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', c1: '#3c4a6e', c2: '#9aa4bc', c3: '#e04030', size: 1 },
    attacks: {
      bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      tentacle: { name: 'Tentacle', kind: 'phys', power: 24, element: 'hit', target: 'enemy', acc: 90 },
    },
    ai: {
      moves: [['bite', 67], ['tentacle', 33]],
      // FF7: always goes for the party member with the lowest HP.
      custom: function (e, b) {
        return { move: b.rnd(3) === 0 ? 'tentacle' : 'bite', target: 'lowest' };
      },
    },
    desc: 'Shinra guard dog. Attacks the weakest target with its whip-like tentacles.',
  },

  mono_drive: {
    name: 'Mono Drive',
    level: 2, hp: 28, mp: 28, exp: 18, ap: 3, gil: 8,
    atk: 3, def: 6, defPct: 6, mat: 3, mdf: 4, dex: 49, lck: 2,
    elem: { wind: 2, earth: 0 }, immune: ['stop', 'frog', 'paralysis'],
    drops: [{ item: 'potion', chance: 14 }, { item: 'ether', chance: 5 }],
    steal: [],
    morph: 'ether',
    boss: false, flying: true, row: 'front',
    look: { type: 'machine', variant: 1, c1: '#8a96a8', c2: '#3a4250', c3: '#ff5a2a', size: 0.9 },
    attacks: {
      drilldrive: { name: 'Drilldrive', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
      fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', target: 'enemy', mp: 4 },
      warning: { name: 'Warning! Warning!', kind: 'special', special: 'nothing', target: 'self' },
      enemy_sighted: { name: 'Enemy Sighted!', kind: 'special', special: 'nothing', target: 'self' },
    },
    ai: {
      moves: [['drilldrive', 67], ['fire', 33]],
      custom: function (e, b) {
        if (!e.vars.warned) {
          e.vars.warned = true;
          return { move: b.rnd(2) ? 'warning' : 'enemy_sighted', target: 'self' };
        }
        if (b.rnd(3) === 0 && e.mp >= 4) return { move: 'fire', target: 'random' };
        return { move: 'drilldrive', target: 'random' };
      },
    },
    desc: 'Security drone. Sounds the alarm on its first turn.',
  },

  grunt: {
    name: 'Grunt',
    level: 7, hp: 40, mp: 0, exp: 22, ap: 2, gil: 15,
    atk: 12, def: 10, defPct: 4, mat: 2, mdf: 2, dex: 58, lck: 8,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }, { item: 'potion', chance: 14 }],
    steal: [{ item: 'grenade', chance: 14 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 1, c1: '#6e5a3c', c2: '#4a4a52', c3: '#d02828', size: 1 },
    attacks: {
      handclaw: { name: 'Handclaw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
      beam_gun: { name: 'Beam Gun', kind: 'phys', power: 18, element: 'shoot', target: 'enemy' },
    },
    ai: { moves: [['beam_gun', 50], ['handclaw', 50]] },
    desc: 'Shinra reactor security in powered armour.',
  },

  '1st_ray': {
    name: '1st Ray',
    level: 4, hp: 18, mp: 0, exp: 12, ap: 1, gil: 5,
    atk: 10, def: 2, defPct: 0, mat: 0, mdf: 0, dex: 40, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 2, c1: '#707a86', c2: '#2a2e36', c3: '#ff3030', size: 0.8 },
    attacks: {
      laser_cannon: { name: 'Laser Cannon', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['laser_cannon', 1]],
      // FF7: fires every other turn at the party member with the highest HP.
      custom: function (e, b) {
        if (e.vars.cool) { e.vars.cool = false; return { move: 'wait', target: 'self' }; }
        e.vars.cool = true;
        var p = b.party(), t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'laser_cannon', target: t || 'random' };
      },
    },
    desc: 'Laser turret. Charges between shots.',
  },

  sweeper: {
    name: 'Sweeper',
    level: 8, hp: 140, mp: 0, exp: 27, ap: 3, gil: 30,
    atk: 18, def: 20, defPct: 0, mat: 0, mdf: 4, dex: 48, lck: 1,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', c1: '#9aa0a8', c2: '#c0a020', c3: '#ff4020', size: 1.3 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      w_machine_gun: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', target: 'enemy' },
      smoke_shot: { name: 'Smoke Shot', kind: 'phys', power: 24, element: 'shoot', target: 'enemy', acc: 75 },
    },
    ai: {
      moves: [['w_machine_gun', 50], ['machine_gun', 25], ['smoke_shot', 25]],
      // FF7: fixed rotation Smoke Shot -> Machine Gun (lowest HP) -> W Machine Gun (highest HP).
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.c === undefined) v.c = b.rnd(4);
        if (v.c === 0) {
          v.c = 1;
          var nd = p.filter(function (c) { return !b.has(c, 'darkness'); });
          return { move: 'smoke_shot', target: nd.length ? b.pick(nd) : 'random' };
        }
        if (v.c === 1) { v.c = 2; return { move: 'machine_gun', target: 'lowest' }; }
        v.c = 0;
        var t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'w_machine_gun', target: t || 'random' };
      },
    },
    desc: 'Two-legged security robot. Weak against lightning.',
  },

  guard_scorpion: {
    name: 'Guard Scorpion',
    level: 12, hp: 800, mp: 0, exp: 100, ap: 10, gil: 100,
    // FF7 lists MDf 300 but the AI sets it to 256 (384 with the tail up; Def 255).
    atk: 30, def: 40, defPct: 0, mat: 15, mdf: 256, dex: 60, lck: 1,
    elem: { lightning: 2, gravity: 0 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog', 'small',
      'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [{ item: 'assault_gun', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'custom', id: 'guard_scorpion', c1: '#9aa0a8', c2: '#c03020', c3: '#ffd000', size: 2.2 },
    attacks: {
      search_scope: { name: 'Search Scope', kind: 'special', special: 'nothing', target: 'enemy' },
      rifle: { name: 'Rifle', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      scorpion_tail: { name: 'Scorpion Tail', kind: 'phys', power: 28, element: 'shoot', target: 'enemy', acc: 95 },
      tail_laser: { name: 'Tail Laser', kind: 'phys', power: 32, element: 'shoot', target: 'allEnemies', acc: 120 },
      // Cloud's warning as the tail goes up - FF7's famously backwards advice (hitting it now is what brings the laser
      // down on you), kept as the game has it
      tail_up: { name: 'Tail Up', kind: 'special', special: 'nothing', target: 'self', silent: true,
        line: { who: 'cloud', once: true, text: "Hit it while its tail's up! It's gonna counter with that laser!" } },
      tail_down: { name: 'Tail Down', kind: 'special', special: 'nothing', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['rifle', 50], ['scorpion_tail', 30], ['search_scope', 20]],
      // FF7 pattern: Search Scope, attack, Search Scope, attack, raise tail (Def 255 / MDf 384),
      // wait, wait, lower tail. While the tail is up every hit is countered with Tail Laser.
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0, p = b.party();
        if (v.def0 === undefined) { v.def0 = e.def; v.mdf0 = e.mdf; }
        if (c === 0 || c === 2) {
          v.c = c + 1; v.tgt = b.pick(p);
          return { move: 'search_scope', target: v.tgt };
        }
        if (c === 1 || c === 3) {
          v.c = c + 1;
          var t = p.indexOf(v.tgt) >= 0 ? v.tgt : 'random';
          var tail = b.rnd(3) === 0 || e.hpPct < 50;
          return { move: tail ? 'scorpion_tail' : 'rifle', target: t };
        }
        if (c === 4) {
          v.c = 5; v.tailUp = true; e.def = 255; e.mdf = 384;
          return { move: 'tail_up', target: 'self' };
        }
        if (c === 5 || c === 6) { v.c = c + 1; return { move: 'wait', target: 'self' }; }
        v.c = 0; v.tailUp = false; e.def = v.def0; e.mdf = v.mdf0;
        return { move: 'tail_down', target: 'self' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death' || !e.vars.tailUp) return null;
          return { move: 'tail_laser', target: 'all' };
        },
      },
    },
    desc: 'Reactor security unit. "Attack while its tail\'s up! It\'s gonna counterattack with its laser."',
  },

  // ===========================================================================================
  // Lower Sector 4 plate / Sector 4 train tunnel
  // ===========================================================================================
  grashtrike: {
    name: 'Grashtrike',
    level: 8, hp: 42, mp: 0, exp: 20, ap: 2, gil: 20,
    atk: 12, def: 18, defPct: 3, mat: 15, mdf: 2, dex: 58, lck: 6,
    elem: {}, immune: [],
    drops: [{ item: 'spider_web', chance: 5 }],
    steal: [{ item: 'spider_web', chance: 52 }],
    morph: 'spider_web',
    boss: false, flying: false, row: 'front',
    look: { type: 'insect', c1: '#6a7a3a', c2: '#c8c080', c3: '#ff4020', size: 0.9 },
    attacks: {
      sickle: { name: 'Sickle', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      silk: { name: 'Silk', kind: 'status', add: ['slow'], hit: 100, target: 'enemy', acc: 90 },
    },
    ai: {
      moves: [['silk', 50], ['sickle', 50]],
      // FF7: webs everyone who isn't slowed yet, then slashes the slowed ones.
      custom: function (e, b) {
        var p = b.party();
        var fast = p.filter(function (c) { return !b.has(c, 'slow'); });
        if (fast.length) return { move: 'silk', target: b.pick(fast) };
        return { move: 'sickle', target: 'random' };
      },
    },
    desc: 'Insect that binds its prey in silk.',
  },

  rocket_launcher: {
    name: 'Rocket Launcher',
    level: 5, hp: 50, mp: 0, exp: 13, ap: 3, gil: 7,
    atk: 30, def: 2, defPct: 0, mat: 0, mdf: 200, dex: 50, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 2, c1: '#5a6470', c2: '#a8b0b8', c3: '#ff8a20', size: 0.9 },
    attacks: {
      rocket_launcher: { name: 'Rocket Launcher', kind: 'phys', power: 24, element: 'shoot', target: 'enemy', acc: 75 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['rocket_launcher', 1]],
      // FF7: reloads on its first turn and every other turn after firing; aims at the lowest HP.
      custom: function (e, b) {
        if (!e.vars.loaded) { e.vars.loaded = true; return { move: 'wait', target: 'self' }; }
        e.vars.loaded = false;
        return { move: 'rocket_launcher', target: 'lowest' };
      },
    },
    desc: 'Automated rocket turret. Slow to reload.',
  },

  chuse_tank: {
    name: 'Chuse Tank',
    level: 6, hp: 36, mp: 0, exp: 23, ap: 2, gil: 30,
    atk: 10, def: 6, defPct: 3, mat: 0, mdf: 66, dex: 57, lck: 5,
    elem: {}, immune: ['frog'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'insect', variant: 2, c1: '#8a5a3a', c2: '#d0b080', c3: '#40ff60', size: 0.9 },
    attacks: {
      claw: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 110, silent: true },
      rolling_claw: { name: 'Rolling Claw', kind: 'pct', pct: 12.5, element: 'hit', target: 'enemy', acc: 75 },
    },
    ai: {
      moves: [['claw', 50], ['rolling_claw', 50]],
      custom: function (e, b) {
        if (b.rnd(2)) return { move: 'claw', target: 'random' };
        var p = b.party(), t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'rolling_claw', target: t || 'random' };
      },
    },
    desc: 'Burrowing critter. Its Rolling Claw takes 1/8 of the target\'s HP.',
  },

  blugu: {
    name: 'Blugu',
    level: 4, hp: 120, mp: 0, exp: 18, ap: 2, gil: 35,
    atk: 8, def: 180, defPct: 1, mat: 24, mdf: 128, dex: 52, lck: 2,
    elem: { lightning: 2, wind: 2, earth: 0 }, immune: ['stop', 'frog', 'paralysis'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'eye_drop', chance: 52 }],
    morph: 'potion',
    boss: false, flying: true, row: 'front',
    look: { type: 'blob', variant: 1, c1: '#5a78c8', c2: '#a8c0f0', c3: '#ffe040', size: 1 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      hell_bubbles: { name: 'Hell Bubbles', kind: 'status', add: ['sleep'], hit: 79, target: 'enemy' },
    },
    ai: {
      moves: [['bodyblow', 75], ['hell_bubbles', 25]],
      custom: function (e, b) {
        var v = e.vars;
        if (v.c === undefined) v.c = b.rnd(4);
        if (v.c < 3) {
          v.c = v.c < 2 ? v.c + 1 : (b.rnd(3) === 0 ? 3 : 1);
          return { move: 'bodyblow', target: 'random' };
        }
        v.c = 0;
        return { move: 'hell_bubbles', target: 'random' };
      },
    },
    desc: 'Floating jelly with a very hard body. Weak to lightning and wind.',
  },

  // ===========================================================================================
  // No. 5 Reactor
  // ===========================================================================================
  smogger: {
    name: 'Smogger',
    level: 8, hp: 90, mp: 0, exp: 32, ap: 3, gil: 60,
    atk: 22, def: 24, defPct: 1, mat: 4, mdf: 64, dex: 47, lck: 1,
    elem: { poison: -1 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [{ item: 'deadly_waste', chance: 14 }],
    steal: [{ item: 'smoke_bomb', chance: 14 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'ghost', variant: 2, c1: '#6a7060', c2: '#a0a890', c3: '#ffd040', size: 1 },
    attacks: {
      punch: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      smog: { name: 'Smog', kind: 'phys', power: 12, add: ['poison'], hit: 87, target: 'enemy', acc: 90 },
      smog_dark: { name: 'Smog', kind: 'phys', power: 12, add: ['darkness'], hit: 91, target: 'enemy', acc: 105 },
    },
    ai: {
      moves: [['punch', 60], ['smog', 20], ['smog_dark', 20]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        function lacking(s) { return p.filter(function (c) { return !b.has(c, s); }); }
        function punch() {
          var d = p.filter(function (c) { return b.has(c, 'darkness'); });
          return { move: 'punch', target: d.length ? b.pick(d) : 'random' };
        }
        if (v.c === undefined) v.c = b.rnd(5);
        if (v.c <= 2) {
          if (v.c < 2) v.c++;
          else { var r = b.rnd(4); v.c = r === 0 ? 3 : (r === 1 ? 4 : 0); }
          return punch();
        }
        var s = v.c === 3 ? 'poison' : 'darkness', l = lacking(s);
        v.c = (v.c === 3 && !l.length) ? 4 : 0;
        if (l.length) return { move: s === 'poison' ? 'smog' : 'smog_dark', target: b.pick(l) };
        return punch();
      },
    },
    desc: 'Living cloud of reactor exhaust. Absorbs poison.',
  },

  special_combatant: {
    name: 'Special Combatant',
    level: 9, hp: 60, mp: 0, exp: 28, ap: 3, gil: 40,
    atk: 15, def: 24, defPct: 5, mat: 2, mdf: 32, dex: 58, lck: 12,
    elem: {}, immune: [],
    drops: [{ item: 'antidote', chance: 14 }, { item: 'grenade', chance: 5 }],
    steal: [{ item: 'eye_drop', chance: 52 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 2, c1: '#2e4a8c', c2: '#707a8a', c3: '#ff3030', size: 1 },
    attacks: {
      handclaw: { name: 'Handclaw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
      beam_gun: { name: 'Beam Gun', kind: 'phys', power: 18, element: 'shoot', target: 'enemy' },
      wave: { name: 'Wave', kind: 'phys', power: 32, element: 'shout', target: 'enemy', acc: 92 },
    },
    ai: {
      moves: [['handclaw', 40], ['beam_gun', 40], ['wave', 20]],
      // FF7: three Handclaws (or three Beam Guns), then Wave on the weakest, then switch weapon.
      custom: function (e, b) {
        var v = e.vars;
        if (v.c === undefined) v.c = b.rnd(2) ? 3 : 0;
        if (v.c <= 2) { if (v.c < 2) v.c++; else { v.c = 6; v.cy = 0; } return { move: 'handclaw', target: 'random' }; }
        if (v.c <= 5) { if (v.c < 5) v.c++; else { v.c = 6; v.cy = 1; } return { move: 'beam_gun', target: 'random' }; }
        v.c = v.cy ? 0 : 3;
        return { move: 'wave', target: 'lowest' };
      },
    },
    desc: 'Elite Shinra trooper.',
  },

  blood_taste: {
    name: 'Blood Taste',
    level: 8, hp: 72, mp: 0, exp: 24, ap: 2, gil: 32,
    atk: 12, def: 22, defPct: 8, mat: 14, mdf: 24, dex: 65, lck: 6,
    elem: {}, immune: [],
    drops: [{ item: 'antidote', chance: 14 }],
    steal: [{ item: 'eye_drop', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'tentacle', c1: '#8a2a3a', c2: '#e0a0a0', c3: '#ffe040', size: 1 },
    attacks: {
      bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      bite_x2: { name: 'Bite', kind: 'phys', power: 16, hits: 2, element: 'hit', target: 'enemy', silent: true },
      tentacle_drain: { name: 'Tentacle Drain', kind: 'drain', formula: 'phys', power: 10, target: 'enemy', acc: 110 },
    },
    ai: {
      moves: [['bite', 80], ['tentacle_drain', 20]],
      // FF7: fixates on its last attacker; the more hurt it is, the more it drains / double-bites.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        var t = p.indexOf(v.tgt) >= 0 ? v.tgt : 'random';
        var sc = e.hpPct <= 25 ? 1 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 3 : 8;
        if (b.rnd(sc) === 0) return { move: e.hp < e.maxHp ? 'tentacle_drain' : 'bite', target: t };
        return { move: b.rnd(sc) === 0 ? 'bite_x2' : 'bite', target: t };
      },
      counter: {
        custom: function (e, b, src, kind) { if (src && kind !== 'death') e.vars.tgt = src; return null; },
      },
    },
    desc: 'Blood-sucking reactor parasite.',
  },

  proto_machinegun: {
    name: 'Proto Machinegun',
    level: 4, hp: 100, mp: 0, exp: 16, ap: 2, gil: 15,
    atk: 12, def: 2, defPct: 0, mat: 0, mdf: 128, dex: 45, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 2, c1: '#6a727c', c2: '#2c3036', c3: '#ffb020', size: 0.9 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['machine_gun', 1]],
      custom: function (e, b) {
        if (e.vars.cool) { e.vars.cool = false; return { move: 'wait', target: 'self' }; }
        e.vars.cool = true;
        return { move: 'machine_gun', target: 'lowest' };
      },
    },
    desc: 'Prototype machine-gun turret. Fires every other turn.',
  },

  air_buster: {
    name: 'Air Buster',
    level: 15, hp: 1200, mp: 0, exp: 180, ap: 16, gil: 150,
    atk: 24, def: 80, defPct: 3, mat: 12, mdf: 320, dex: 75, lck: 2,
    elem: { lightning: 2, fire: 0.5, earth: 0, gravity: 0 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog', 'small',
      'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [{ item: 'titan_bangle', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: true, row: 'front',
    // FF7: 5x damage from attacks on its back (Back Attack Multiplier 40), and its back is whichever side it
    // isn't facing (it starts facing Barret and Tifa, with Cloud behind it)
    backMult: 5,
    backFrom: function (e, a) { var c = !!a && (a.id === 'cloud' || a.name === 'Cloud'); return c !== !!e.vars.faceC; },
    // the model turns to the side it faces: the average spot of Cloud's side, or of Barret and Tifa's (the
    // boss_air_buster formation stands them on opposite sides of it, battle.js placeParty)
    turnTo: function (e, faceC) {
      var bs = e.battle, s = bs ? bs.party.filter(function (c) { return !c.hidden && (c.id === 'cloud' || c.name === 'Cloud') === !!faceC && (c.home || c.pos); }) : [];
      if (!s.length || !e.pos) return;
      var x = 0, z = 0; s.forEach(function (c) { var q = c.home || c.pos; x += q[0]; z += q[2]; });
      e.homeFacing = e.facing = Math.atan2(x / s.length - e.pos[0], z / s.length - e.pos[2]);
    },
    look: { type: 'custom', id: 'air_buster', c1: '#8a929c', c2: '#3a4048', c3: '#ff5020', size: 2.4 },
    attacks: {
      big_bomber: { name: 'Big Bomber', kind: 'phys', power: 50, element: 'shoot', target: 'enemy' },
      energy_ball: { name: 'Energy Ball', kind: 'phys', power: 30, element: 'shout', target: 'enemy' },
      rear_gun: { name: 'Rear Gun', kind: 'phys', power: 20, element: 'shoot', target: 'enemy', acc: 115 },
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', acc: 95, silent: true },
      turn: { name: 'Turn', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['big_bomber', 40], ['energy_ball', 30], ['rear_gun', 30]],
      // FF7 (side-attack battle: Cloud on one side, Barret + Tifa on the other):
      // Program 1 fires Big Bomber (4 shots), turning to face its target first; Program 2 uses
      // Energy Ball at whoever it faces and Rear Gun behind it. Hits from behind are countered
      // (Bodyblow + turn around, or Rear Gun). Below 20% HP the turn function breaks.
      // (FF7: Air Buster takes 5x damage from attacks on its back.)
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        function isC(c) { return !!c && (c.id === 'cloud' || c.name === 'Cloud'); }
        if (v.ammo === undefined) { v.ammo = 4; v.faceC = false; }
        e.turnTo = e.turnTo || function (faceC) { e.def0.turnTo(e, faceC); };
        e.turnTo(v.faceC);
        if (e.hpPct < 20) v.broken = true;
        var t = b.pick(p), tc = isC(t);
        if (v.ammo > 0) {
          if (tc !== v.faceC) {
            if (!v.broken) { v.faceC = tc; e.turnTo(tc); return { move: 'turn', target: 'self' }; }
            var front = p.filter(function (c) { return isC(c) === v.faceC; });
            if (!front.length) v.ammo = 0; else t = b.pick(front);
          }
          if (v.ammo > 0) { v.ammo--; return { move: 'big_bomber', target: t }; }
        }
        return { move: tc === v.faceC ? 'energy_ball' : 'rear_gun', target: t };
      },
      counter: {
        custom: function (e, b, src, kind) {
          var v = e.vars;
          if (!src || kind === 'death' || v.ammo === undefined) return null;
          if (e.hpPct < 20) v.broken = true;
          var sc = !!src && (src.id === 'cloud' || src.name === 'Cloud');
          if (sc === v.faceC) return null;
          if (!v.broken && b.rnd(3) < 2) { v.faceC = sc; e.def0.turnTo(e, sc); return { move: 'bodyblow', target: src }; }
          return { move: 'rear_gun', target: src };
        },
      },
    },
    desc: 'Shinra anti-intruder weapon. Weak against lightning; vulnerable from behind.',
  },

  // ===========================================================================================
  // Sector 5 slums & church / Sector 6 / Wall Market (Don Corneo's mansion)
  // ===========================================================================================
  whole_eater: {
    name: 'Whole Eater',
    level: 9, hp: 72, mp: 0, exp: 24, ap: 2, gil: 70,
    atk: 30, def: 14, defPct: 2, mat: 0, mdf: 80, dex: 58, lck: 4,
    elem: {}, immune: [],
    drops: [],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'worm', c1: '#8a6a4a', c2: '#d8b890', c3: '#ff3030', size: 1 },
    attacks: {
      sickle: { name: 'Sickle', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      sickle_x2: { name: 'Sickle', kind: 'phys', power: 16, hits: 2, element: 'cut', target: 'enemy', silent: true },
    },
    ai: {
      moves: [['sickle', 1]],
      // FF7: sometimes slashes its last attacker before its normal attack (more often below 50% HP).
      custom: function (e, b) {
        return { move: b.rnd(e.hpPct <= 50 ? 2 : 8) === 0 ? 'sickle_x2' : 'sickle', target: 'random' };
      },
    },
    desc: 'Slum-dwelling worm with a sickle-like jaw.',
  },

  hedgehog_pie: {
    name: 'Hedgehog Pie',
    level: 6, hp: 40, mp: 52, exp: 20, ap: 3, gil: 25,
    atk: 12, def: 18, defPct: 4, mat: 4, mdf: 12, dex: 42, lck: 8,
    elem: { ice: 2 }, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'ether', chance: 14 }],
    morph: 'ether',
    boss: false, flying: false, row: 'front',
    look: { type: 'blob', c1: '#6a4a8c', c2: '#e0c080', c3: '#ffffff', size: 0.8 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', target: 'enemy', mp: 4 },
    },
    ai: {
      moves: [['bodyblow', 80], ['fire', 20]],
      custom: function (e, b) {
        var v = e.vars;
        if (v.c === undefined) v.c = b.rnd(3);
        if (v.c < 2) { v.c++; return { move: 'bodyblow', target: 'random' }; }
        v.c = 0;
        return { move: (e.mp >= 4 && b.rnd(2)) ? 'fire' : 'bodyblow', target: 'random' };
      },
    },
    desc: 'Mischievous spiky creature. Weak against ice.',
  },

  vice: {
    name: 'Vice',
    level: 7, hp: 68, mp: 0, exp: 24, ap: 3, gil: 80,
    atk: 14, def: 14, defPct: 16, mat: 0, mdf: 0, dex: 62, lck: 6,
    elem: {}, immune: ['frog'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'speed_drink', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 1, c1: '#4a7a3a', c2: '#c8a878', c3: '#ffe040', size: 0.8 },
    attacks: {
      steal: { name: 'Steal', kind: 'special', special: 'stealItem', target: 'enemy' },
      grind: { name: 'Grind', kind: 'special', special: 'stealItem', target: 'enemy' },
      seize: { name: 'Seize', kind: 'phys', power: 16, target: 'enemy' },
      escape: { name: 'Escape', kind: 'special', special: 'flee', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 60], ['steal', 20], ['grind', 20]],
      // FF7: bides its time, snatches an item (Steal/Grind), then runs away with it.
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0, p = b.party();
        var t = p.indexOf(v.tgt) >= 0 ? v.tgt : 'random';
        if (c === 0) { var r = b.rnd(6); v.c = r === 0 ? 1 : (r === 1 ? 2 : 0); return { move: 'wait', target: 'self' }; }
        if (c === 1 || c === 2) { v.c = b.rnd(3) === 0 ? 4 : 3; return { move: c === 1 ? 'grind' : 'steal', target: t }; }
        if (c === 3) { v.c = b.rnd(2) ? 4 : 3; return { move: 'wait', target: 'self' }; }
        return { move: 'escape', target: 'self' };
      },
      counter: {
        custom: function (e, b, src, kind) { if (src && kind !== 'death') e.vars.tgt = src; return null; },
      },
    },
    desc: 'Slum pickpocket. Steals an item and flees - defeat it to get the item back.',
  },

  hell_house: {
    name: 'Hell House',
    level: 11, hp: 450, mp: 0, exp: 44, ap: 6, gil: 250,
    atk: 24, def: 2, defPct: 0, mat: 20, mdf: 48, dex: 52, lck: 2,
    elem: {},
    immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'house', c1: '#c8b89a', c2: '#6a4a3a', c3: '#ff2a2a', size: 1.6 },
    attacks: {
      erupt: { name: 'Erupt', kind: 'phys', power: 16, element: 'shoot', add: ['darkness'], hit: 27, target: 'enemy', acc: 80, silent: true },
      hell_bomber: { name: 'Hell Bomber', kind: 'phys', power: 24, element: 'shoot', target: 'enemy', acc: 88 },
      suicide_drop: { name: 'Suicide Drop', kind: 'phys', power: 11, element: 'earth', target: 'allEnemies', acc: 255 },
      stand_up: { name: 'Hell House', kind: 'special', special: 'transform', into: 'hell_house_b', target: 'self', silent: true },
    },
    ai: {
      moves: [['hell_bomber', 67], ['erupt', 33]],
      // FF7: once below 3/4 HP it has a 1/2 chance per hit to Suicide Drop and sprout arms and legs
      // (Hell House Type B, HP carried over).
      custom: function (e, b) {
        var v = e.vars;
        if (v.dropped) return { move: 'stand_up', target: 'self' };
        if (e.hpPct <= 75 && b.rnd(2) === 0) { v.dropped = true; return { move: 'suicide_drop', target: 'all' }; }
        return { move: b.rnd(3) === 0 ? 'erupt' : 'hell_bomber', target: 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          var v = e.vars;
          if (kind === 'death' || v.dropped || e.hpPct > 75 || b.rnd(2)) return null;
          v.dropped = true;
          return { move: 'suicide_drop', target: 'all' };
        },
      },
    },
    desc: 'A house that is alive. Beware when it gets back on its feet.',
  },

  hell_house_b: {
    name: 'Hell House',
    level: 11, hp: 450, mp: 0, exp: 44, ap: 6, gil: 200,
    atk: 32, def: 2, defPct: 3, mat: 24, mdf: 64, dex: 59, lck: 4,
    elem: {},
    immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'house', variant: 1, c1: '#c8b89a', c2: '#6a4a3a', c3: '#ff2a2a', size: 1.7 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', acc: 90, silent: true },
      suicide_drop: { name: 'Suicide Drop', kind: 'phys', power: 11, element: 'earth', target: 'allEnemies', acc: 255 },
      lunattack: { name: 'Lunattack', kind: 'phys', power: 28, element: 'hit', target: 'enemy', acc: 90 },
      hell_press: { name: 'Hell Press', kind: 'phys', power: 24, element: 'hit', target: 'enemy' },
    },
    ai: {
      moves: [['suicide_drop', 25], ['hell_press', 25], ['bodyblow', 50]],
      counter: {
        custom: function (e, b, src, kind) {
          if (!src || kind === 'death' || e.hpPct > 25 || b.rnd(4)) return null;
          return { move: 'lunattack', target: src };
        },
      },
    },
    desc: 'Hell House standing on its hidden limbs (Type B).',
  },

  corneos_lackey: {
    name: 'Corneo\'s Lackey',
    level: 8, hp: 42, mp: 0, exp: 8, ap: 0, gil: 10,
    atk: 14, def: 12, defPct: 2, mat: 10, mdf: 6, dex: 48, lck: 8,
    elem: {}, immune: [],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', c1: '#3a3a44', c2: '#d0a880', c3: '#e0e0e0', size: 1 },
    attacks: {
      hit: { name: 'Hit', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
    },
    ai: {
      moves: [['hit', 1]],
      // FF7: pulls out a gun once it is hurt below half HP, Scotch is angry or an ally falls.
      custom: function (e, b) {
        var v = e.vars, en = b.enemies();
        if (v.n0 === undefined) v.n0 = en.length;
        var mad = e.hpPct <= 50 || en.length < v.n0 || en.some(function (c) { return c.vars && c.vars.angry; });
        if (e.hpPct <= 50) v.angry = true;
        return { move: mad ? 'machine_gun' : 'hit', target: 'random' };
      },
    },
    desc: 'Don Corneo\'s hired muscle.',
  },

  scotch: {
    name: 'Scotch',
    level: 11, hp: 150, mp: 0, exp: 22, ap: 0, gil: 60,
    atk: 22, def: 32, defPct: 5, mat: 33, mdf: 18, dex: 44, lck: 10,
    elem: {}, immune: [],
    drops: [], steal: [],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 2, c1: '#5a3a6a', c2: '#e0b890', c3: '#ffd040', size: 1.2 },
    attacks: {
      hit: { name: 'Hit', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      machine_gun_x2: { name: 'Machine Gun', kind: 'phys', power: 16, hits: 2, element: 'shoot', target: 'enemy', silent: true },
    },
    ai: {
      moves: [['hit', 1]],
      // FF7: fixates on whoever attacked him last; fires twice once angered or when a lackey falls.
      custom: function (e, b) {
        var v = e.vars, en = b.enemies(), p = b.party();
        if (v.n0 === undefined) v.n0 = en.length;
        var t = p.indexOf(v.tgt) >= 0 ? v.tgt : 'random';
        if (v.angry || e.hpPct < 100 || en.length < v.n0) { v.angry = true; return { move: 'machine_gun_x2', target: t }; }
        if (en.some(function (c) { return c !== e && c.vars && c.vars.angry; })) return { move: 'machine_gun', target: t };
        return { move: 'hit', target: t };
      },
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death') return null;
          e.vars.angry = true; if (src) e.vars.tgt = src;
          return null;
        },
      },
    },
    desc: 'Corneo\'s right-hand man.',
  },

  // ===========================================================================================
  // Sewers (Aps) / Train Graveyard
  // ===========================================================================================
  aps: {
    name: 'Aps',
    level: 18, hp: 1800, mp: 0, exp: 240, ap: 22, gil: 253,
    atk: 40, def: 36, defPct: 4, mat: 40, mdf: 160, dex: 63, lck: 5,
    elem: { fire: 2, gravity: 0 },
    immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk'],
    drops: [{ item: 'phoenix_down', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    backMult: 4,    // FF7: "Aps takes 4x damage from Back Attacks" (a pre-emptive strike can catch it: Enemy Encounter FAQ)
    look: { type: 'giant', c1: '#6a7a4a', c2: '#b0a070', c3: '#ff4020', size: 2.4 },
    attacks: {
      tail_attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 90, silent: true },
      lick: { name: 'Lick', kind: 'phys', power: 4, add: ['sadness'], hit: 100, target: 'enemy' },
      // Hits everyone in the sewer, Aps included (FF7: Aps takes ~180-192 from the forward wave).
      sewer_tsunami: { name: 'Sewer Tsunami', kind: 'phys', power: 13, element: 'water', target: 'allEnemies', selfDamage: 186 },
      // Backward wave: the party is hit from behind (double damage), Aps only takes ~45-48.
      sewer_tsunami_back: { name: 'Sewer Tsunami', kind: 'phys', power: 26, element: 'water', target: 'allEnemies', selfDamage: 46 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['tail_attack', 75], ['lick', 25]],
      // FF7: opens with Sewer Tsunami. After being hit by magic (or dropping to 1/3 HP) it
      // waits, sends a forward wave, waits, then a backward wave, and returns to normal.
      custom: function (e, b) {
        var v = e.vars;
        if (!v.opened) { v.opened = true; return { move: 'sewer_tsunami', target: 'all' }; }
        if (!v.danger && e.hpPct <= 33) { v.danger = true; v.tsunami = true; }
        if (!v.tsunami) return { move: b.rnd(4) === 0 ? 'lick' : 'tail_attack', target: 'random' };
        v.c = v.c || 0;
        if (v.c === 0 || v.c === 2) { v.c++; return { move: 'wait', target: 'self' }; }
        if (v.c === 1) { v.c = 2; return { move: 'sewer_tsunami', target: 'all' }; }
        v.c = 0; v.tsunami = false;
        return { move: 'sewer_tsunami_back', target: 'all' };
      },
      counter: {
        custom: function (e, b, src, kind) { if (kind === 'mag') e.vars.tsunami = true; return null; },
      },
    },
    desc: 'Don Corneo\'s pet, lurking in the sewers. Weak against fire.',
  },

  sahagin: {
    name: 'Sahagin',
    level: 10, hp: 150, mp: 0, exp: 30, ap: 3, gil: 89,
    atk: 23, def: 32, defPct: 2, mat: 8, mdf: 64, dex: 59, lck: 12,
    elem: { water: -1 }, immune: [],
    drops: [{ item: 'potion', chance: 14 }, { item: 'hyper', chance: 5 }],
    steal: [{ item: 'hyper', chance: 14 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'fish', c1: '#3a7a6a', c2: '#c8b070', c3: '#ffe040', size: 1 },
    attacks: {
      harpoon: { name: 'Harpoon', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
      water_gun: { name: 'Water Gun', kind: 'phys', power: 22, element: 'shoot', target: 'enemy', acc: 90 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['water_gun', 50], ['harpoon', 50]],
      // FF7: 3/4 chance to open with Water Gun. (It also has a 1/16 chance per action to raise its
      // shell - Def 512 - which is not modelled here.)
      custom: function (e, b) {
        if (!e.vars.opened) {
          e.vars.opened = true;
          return b.rnd(4) ? { move: 'water_gun', target: 'random' } : { move: 'wait', target: 'self' };
        }
        return { move: b.rnd(2) ? 'water_gun' : 'harpoon', target: 'random' };
      },
    },
    desc: 'Shelled fish-man. Absorbs water.',
  },

  ceasar: {
    name: 'Ceasar',
    level: 8, hp: 120, mp: 0, exp: 23, ap: 2, gil: 55,
    atk: 14, def: 108, defPct: 3, mat: 6, mdf: 32, dex: 47, lck: 10,
    elem: { ice: 2 }, immune: [],
    drops: [{ item: 'potion', chance: 14 }, { item: 'tranquilizer', chance: 5 }],
    steal: [{ item: 'tranquilizer', chance: 14 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'crab', variant: 1, c1: '#7a6a5a', c2: '#c0b0a0', c3: '#40c0ff', size: 1 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      bubble: { name: 'Bubble', kind: 'phys', power: 12, element: 'water', target: 'enemy', acc: 75 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 75], ['bodyblow', 25]],
      // FF7: very passive until hurt; the lower its HP, the more it attacks.
      custom: function (e, b) {
        var q = e.hpPct, r;
        var st = !(e.vars.hit || q < 100) ? 0 : q <= 25 ? 4 : q <= 50 ? 3 : q <= 75 ? 2 : 1;
        if (st === 4) { e.vars.alt = !e.vars.alt; return { move: e.vars.alt ? 'bubble' : 'bodyblow', target: 'random' }; }
        if (st === 3) return { move: b.rnd(2) ? 'bubble' : 'bodyblow', target: 'random' };
        if (st === 0) return b.rnd(4) === 0 ? { move: 'bodyblow', target: 'random' } : { move: 'wait', target: 'self' };
        r = b.rnd(st === 1 ? 6 : 4);
        if (r === 0) return { move: 'bubble', target: 'random' };
        if (r === 1) return { move: 'bodyblow', target: 'random' };
        return { move: 'wait', target: 'self' };
      },
      counter: {
        custom: function (e) { e.vars.hit = true; return null; },
      },
    },
    desc: 'Armoured sewer crustacean. Weak against ice.',
  },

  eligor: {
    name: 'Eligor',
    level: 12, hp: 300, mp: 67, exp: 36, ap: 4, gil: 120,
    atk: 33, def: 46, defPct: 2, mat: 24, mdf: 110, dex: 56, lck: 7,
    elem: { gravity: 0.5 }, immune: [],
    drops: [{ item: 'echo_screen', chance: 5 }],
    steal: [{ item: 'striking_staff', chance: 14 }],
    morph: 'mute_mask',
    boss: false, flying: false, row: 'front',
    look: { type: 'demon', c1: '#4a5a6a', c2: '#a0a8b0', c3: '#ff4040', size: 1.5 },
    attacks: {
      sword_attack: { name: 'Sword Attack', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      mono_laser: { name: 'Mono Laser', kind: 'phys', power: 14, element: 'shoot', target: 'enemy', acc: 110 },
      // FF7 fires Mono Laser at each party member in turn (no damage split).
      mono_laser_all: { name: 'Mono Laser', kind: 'phys', power: 14, element: 'shoot', target: 'allEnemies', acc: 110 },
      silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 59, target: 'enemy', mp: 24 },
      sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 71, target: 'enemy', mp: 8 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['sword_attack', 34], ['mono_laser', 33], ['silence', 17], ['sleepel', 16]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        function lack(s) { return p.filter(function (c) { return !b.has(c, s); }); }
        function magic(first) {
          var order = first === 'silence' ? ['silence', 'sleepel'] : ['sleepel', 'silence'];
          for (var i = 0; i < 2; i++) {
            var s = order[i], l = lack(s === 'silence' ? 'silence' : 'sleep');
            if (l.length) return e.mp >= (s === 'silence' ? 24 : 8) ? { move: s, target: b.pick(l) } : null;
          }
          return null;
        }
        var hurt = e.hpPct <= 50, r, m = null;
        if (!v.opened) {
          v.opened = true; r = b.rnd(3);
          if (r === 2) return { move: 'wait', target: 'self' };
          m = magic(r === 0 ? 'silence' : 'sleepel');
        } else if (!hurt) {
          r = b.rnd(6);
          if (r === 0 || r === 1) m = magic(r === 0 ? 'silence' : 'sleepel');
          else if (r === 2 || r === 3) return { move: 'mono_laser', target: 'random' };
        } else {
          r = b.rnd(5);
          if (r < 2) m = magic(r === 0 ? 'silence' : 'sleepel');
        }
        if (m) return m;
        return hurt ? { move: 'mono_laser_all', target: 'all' } : { move: 'sword_attack', target: 'random' };
      },
    },
    desc: 'Ghostly charioteer of the Train Graveyard.',
  },

  ghost: {
    name: 'Ghost',
    level: 10, hp: 130, mp: 80, exp: 30, ap: 3, gil: 22,
    atk: 25, def: 8, defPct: 10, mat: 18, mdf: 56, dex: 48, lck: 6,
    // FF7: instantly destroyed by Holy; restorative magic hurts it.
    elem: { holy: 2, fire: 2, ice: 0.5, earth: 0, water: 0, restorative: -1 },
    immune: ['silence', 'stop', 'frog', 'paralysis'],
    drops: [{ item: 'ghost_hand', chance: 5 }],
    steal: [{ item: 'ghost_hand', chance: 52 }],
    morph: 'ether',
    boss: false, flying: true, row: 'front',
    look: { type: 'ghost', c1: '#c8c8e0', c2: '#6a6a8a', c3: '#ff3030', size: 1 },
    attacks: {
      scratch: { name: 'Scratch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', target: 'enemy', mp: 4 },
      drain: { name: 'Drain', kind: 'drain', power: 6, target: 'enemy', mp: 1, acc: 255 },
    },
    ai: {
      moves: [['scratch', 50], ['drain', 25], ['fire', 25]],
      // FF7: Scratch (repeated until a 1/2 roll), Drain on the highest HP, then Fire.
      // (FF7 also vanishes after every hit and reappears on its next turn.)
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0;
        if (c === 0) { if (b.rnd(2)) v.c = 1; return { move: 'scratch', target: 'random' }; }
        if (c === 1) {
          v.c = 2;
          var p = b.party(), t = p[0];
          p.forEach(function (x) { if (x.hp > t.hp) t = x; });
          return { move: 'drain', target: t || 'random' };
        }
        v.c = 0;
        return { move: e.mp >= 4 ? 'fire' : 'scratch', target: 'random' };
      },
    },
    desc: 'Restless spirit of the Train Graveyard. Cure magic and Phoenix Downs harm it.',
  },

  cripshay: {
    name: 'Cripshay',
    level: 8, hp: 100, mp: 0, exp: 26, ap: 3, gil: 53,
    atk: 11, def: 18, defPct: 3, mat: 0, mdf: 26, dex: 46, lck: 2,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'crab', c1: '#5a6a3a', c2: '#b0c080', c3: '#ff6020', size: 0.9 },
    attacks: {
      scissors: { name: 'Scissors', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      dual_spike: { name: 'Dual Spike', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
    },
    ai: {
      moves: [['scissors', 80], ['dual_spike', 20]],
      // FF7: after being hit physically it answers the attacker with Dual Spike on its next turn.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.ctr) { v.ctr = false; return { move: 'dual_spike', target: p.indexOf(v.tgt) >= 0 ? v.tgt : 'random' }; }
        return { move: 'scissors', target: 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'phys') { e.vars.ctr = true; e.vars.tgt = src; }
          return null;
        },
      },
    },
    desc: 'Scissor-armed scavenger.',
  },

  deenglow: {
    name: 'Deenglow',
    level: 10, hp: 120, mp: 72, exp: 35, ap: 4, gil: 70,
    atk: 22, def: 32, defPct: 6, mat: 22, mdf: 240, dex: 58, lck: 10,
    elem: { wind: 2, lightning: 0.5, earth: 0, water: 0, gravity: 0, ice: -1 },
    immune: ['stop', 'frog', 'paralysis'],
    drops: [{ item: 'graviball', chance: 14 }],
    steal: [{ item: 'ether', chance: 52 }],
    morph: 'phoenix_down',
    boss: false, flying: true, row: 'front',
    look: { type: 'ghost', variant: 1, c1: '#a0c8e0', c2: '#40607a', c3: '#ffffff', size: 1 },
    attacks: {
      wing_cutter: { name: 'Wing Cutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      ice: { name: 'Ice', kind: 'mag', power: 8, element: 'ice', target: 'enemy', mp: 4 },
      demi: { name: 'Demi', kind: 'pct', pct: 25, element: 'gravity', target: 'enemy', mp: 14, acc: 75 },
    },
    ai: {
      moves: [['wing_cutter', 1]],
      // FF7: every third physical hit it counters with Ice, every third magic hit with Demi,
      // aimed at that attacker on its next turn; otherwise Wing Cutter on the highest HP.
      custom: function (e, b) {
        var v = e.vars, p = b.party(), m = v.ctr;
        v.ctr = null;
        if (m && p.indexOf(v.tgt) >= 0 && e.mp >= (m === 'demi' ? 14 : 4)) return { move: m, target: v.tgt };
        var t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'wing_cutter', target: t || 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          var v = e.vars;
          if (kind !== 'phys' && kind !== 'mag') return null;
          v.hits = (v.hits || 0) + 1;
          if (v.hits >= 3) { v.hits = 0; v.ctr = kind === 'mag' ? 'demi' : 'ice'; v.tgt = src; }
          return null;
        },
      },
    },
    desc: 'Floating spirit that absorbs ice.',
  },

  // ===========================================================================================
  // Sector 7 support pillar (Aero Combatant, Reno)
  // ===========================================================================================
  aero_combatant: {
    name: 'Aero Combatant',
    level: 11, hp: 190, mp: 0, exp: 40, ap: 4, gil: 110,
    atk: 22, def: 24, defPct: 40, mat: 6, mdf: 24, dex: 72, lck: 22,
    elem: { gravity: 2, wind: 2, earth: 0 },
    immune: ['confusion', 'stop', 'frog', 'small', 'slow_numb', 'death_sentence', 'manipulate', 'berserk', 'paralysis'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: true, row: 'front',
    look: { type: 'flyer', c1: '#3a5a9a', c2: '#9098a8', c3: '#ffd040', size: 1.1 },
    attacks: {
      kick: { name: 'Kick', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 120, silent: true },
      propeller: { name: 'Propeller', kind: 'phys', power: 24, element: 'cut', target: 'enemy', acc: 110 },
      land: { name: 'Land', kind: 'special', special: 'transform', into: 'aero_combatant_b', target: 'self', silent: true },
    },
    ai: {
      moves: [['propeller', 67], ['kick', 33]],
      // FF7: 1/2 chance after each hit to drop to the ground (Type B, HP carried over).
      custom: function (e, b) {
        if (e.vars.land || (e.hpPct < 100 && b.rnd(2) === 0)) return { move: 'land', target: 'self' };
        return { move: b.rnd(3) === 0 ? 'kick' : 'propeller', target: 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death' || b.rnd(2)) return null;
          e.vars.land = true;
          return { move: 'land', target: 'self' };
        },
      },
    },
    desc: 'Shinra trooper with a propeller pack. Hard to hit while airborne.',
  },

  aero_combatant_b: {
    name: 'Aero Combatant',
    level: 11, hp: 190, mp: 0, exp: 40, ap: 4, gil: 110,
    atk: 22, def: 24, defPct: 1, mat: 33, mdf: 48, dex: 42, lck: 1,
    elem: { gravity: 2 }, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'potion', chance: 52 }],
    morph: 'potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 3, c1: '#3a5a9a', c2: '#9098a8', c3: '#ffd040', size: 1.1 },
    attacks: {
      propeller_sword: { name: 'Propeller Sword', kind: 'phys', power: 16, element: 'cut', target: 'enemy', acc: 75, silent: true },
      sword_rush: { name: 'Sword Rush', kind: 'phys', power: 18, element: 'hit', target: 'enemy', acc: 80 },
    },
    ai: { moves: [['propeller_sword', 75], ['sword_rush', 25]] },
    desc: 'Aero Combatant fighting on the ground (Type B).',
  },

  turks_reno: {
    name: 'Turks:Reno',
    level: 17, hp: 1000, mp: 0, exp: 290, ap: 22, gil: 500,
    atk: 32, def: 52, defPct: 6, mat: 20, mdf: 62, dex: 50, lck: 15,
    elem: { lightning: 0.5, gravity: 0 },
    immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'paralysis'],
    drops: [{ item: 'ether', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 3, c1: '#1e2230', c2: '#e05020', c3: '#f0f0f0', size: 1.25 },
    attacks: {
      short_staff: { name: 'Short Staff', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 110, silent: true },
      electro_mag_rod: { name: 'Electro-mag Rod', kind: 'phys', power: 24, element: 'lightning', add: ['paralysis'], hit: 23, target: 'enemy' },
      // Traps the target in a Pyramid (acts like Stop); destroying the Pyramid (10 HP) frees them.
      pyramid: { name: 'Pyramid', kind: 'status', add: ['imprisoned'], hit: 100, target: 'enemy', acc: 255, summon: 'pyramid' },
    },
    ai: {
      moves: [['short_staff', 67], ['electro_mag_rod', 33]],
      // FF7: every few turns (sooner when fewer allies are left free) Reno traps someone in a
      // Pyramid. A Bolt spell cast on him is answered with Electro-mag Rod on his next turn.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        var free = p.filter(function (c) { return !b.has(c, 'imprisoned'); });
        v.c = (v.c === undefined ? 2 : v.c) + 1;
        if (free.length && v.c >= (3 - free.length) + 3) { v.c = 0; return { move: 'pyramid', target: b.pick(free) }; }
        if (v.ctr) { v.ctr = false; if (free.indexOf(v.tgt) >= 0) return { move: 'electro_mag_rod', target: v.tgt }; }
        var t = free.length ? b.pick(free) : 'random';
        return { move: b.rnd(3) === 0 ? 'electro_mag_rod' : 'short_staff', target: t };
      },
      counter: {
        custom: function (e, b, src, kind, act) {
          if (kind === 'mag' && src && act && /^bolt/.test(act)) { e.vars.ctr = true; e.vars.tgt = src; }
          return null;
        },
      },
    },
    desc: 'Turk with an electro-mag rod. Break his Pyramids to free your friends.',
  },

  pyramid: {
    name: 'Pyramid',
    level: 2, hp: 10, mp: 0, exp: 0, ap: 1, gil: 0,
    atk: 0, def: 2, defPct: 0, mat: 0, mdf: 0, dex: 50, lck: 0,
    // FF7: Gravity destroys it instantly.
    elem: { gravity: 8 },
    immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'regen', 'manipulate', 'berserk', 'peerless'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'rock', variant: 2, c1: '#e8d070', c2: '#a08830', c3: '#fff8c0', size: 1 },
    attacks: {
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      vanish: { name: 'Vanish', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 1]],
      // Disappears together with Reno.
      custom: function (e, b) {
        var reno = b.enemies().some(function (c) { return c.name === 'Turks:Reno'; });
        return { move: reno ? 'wait' : 'vanish', target: 'self' };
      },
    },
    desc: 'Energy prison created by Reno. The trapped ally is freed when it breaks.',
  },

  // ===========================================================================================
  // Shinra HQ (floors 1-3, elevator, 59-68)
  // ===========================================================================================
  grenade_combatant: {
    name: 'Grenade Combatant',
    level: 10, hp: 130, mp: 0, exp: 42, ap: 4, gil: 72,
    atk: 18, def: 24, defPct: 3, mat: 4, mdf: 30, dex: 54, lck: 3,
    elem: {}, immune: [],
    drops: [{ item: 'grenade', chance: 14 }],
    steal: [{ item: 'tranquilizer', chance: 52 }],
    morph: 'grenade',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', c1: '#3656a8', c2: '#8c93a3', c3: '#60c040', size: 1 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      hand_grenade: { name: 'Hand Grenade', kind: 'phys', power: 35, element: 'shoot', target: 'enemy', acc: 70 },
    },
    ai: {
      moves: [['machine_gun', 75], ['hand_grenade', 25]],
      // FF7: a grenade every fourth turn (4 in total), every turn once below 3/4 HP.
      custom: function (e, b) {
        var v = e.vars;
        if (v.ammo === undefined) { v.ammo = 4; v.wait = 3; }
        if (e.hpPct <= 75) {
          if (v.ammo > 0) { v.ammo--; return { move: 'hand_grenade', target: 'lowest' }; }
          return { move: 'machine_gun', target: 'random' };
        }
        if (v.wait > 0) { v.wait--; return { move: 'machine_gun', target: 'random' }; }
        if (v.ammo > 0) { v.ammo--; v.wait = 3; return { move: 'hand_grenade', target: 'lowest' }; }
        return { move: 'machine_gun', target: 'lowest' };
      },
    },
    desc: 'Shinra infantry with hand grenades.',
  },

  mighty_grunt: {
    name: 'Mighty Grunt',
    level: 12, hp: 230, mp: 0, exp: 50, ap: 5, gil: 98,
    atk: 20, def: 100, defPct: 0, mat: 6, mdf: 64, dex: 40, lck: 0,
    elem: {},
    immune: ['death', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
    drops: [{ item: 'tranquilizer', chance: 14 }],
    steal: [{ item: 'tranquilizer', chance: 52 }, { item: 'grenade', chance: 14 }],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'mech', c1: '#6a7480', c2: '#3a4048', c3: '#40c0ff', size: 1.3 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      double_shot: { name: 'Double Shot', kind: 'phys', power: 30, element: 'hit', target: 'enemy', acc: 110 },
      shed_armor: { name: 'Grunt Death', kind: 'special', special: 'transform', into: 'mighty_grunt_b', target: 'self', silent: true },
    },
    ai: {
      moves: [['machine_gun', 50], ['double_shot', 50]],
      // FF7: at 50% HP or lower the outer armour breaks (Type B, HP carried over).
      custom: function (e, b) {
        if (e.hpPct <= 50) return { move: 'shed_armor', target: 'self' };
        if (b.rnd(2)) return { move: 'machine_gun', target: 'random' };
        var p = b.party(), t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'double_shot', target: t || 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          return (kind !== 'death' && e.hpPct <= 50) ? { move: 'shed_armor', target: 'self' } : null;
        },
      },
    },
    desc: 'Soldier in heavy powered armour. Very high defense until the shell breaks.',
  },

  mighty_grunt_b: {
    name: 'Mighty Grunt',
    level: 12, hp: 230, mp: 0, exp: 50, ap: 5, gil: 98,
    atk: 28, def: 4, defPct: 33, mat: 6, mdf: 8, dex: 55, lck: 12,
    elem: {}, immune: ['death', 'frog', 'small'],
    drops: [{ item: 'tranquilizer', chance: 14 }],
    steal: [{ item: 'tranquilizer', chance: 52 }, { item: 'grenade', chance: 14 }],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 2, c1: '#4a5a6a', c2: '#a0a8b0', c3: '#40c0ff', size: 1 },
    attacks: {
      roller_dash: { name: 'Roller Dash', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 110, silent: true },
      rollerspin: { name: 'Rollerspin', kind: 'phys', power: 28, element: 'hit', target: 'enemy', acc: 90 },
      skating: { name: 'Skating', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: { moves: [['roller_dash', 2], ['rollerspin', 3], ['skating', 3]] },
    desc: 'Mighty Grunt without its armour, zooming around on roller skates (Type B).',
  },

  moth_slasher: {
    name: 'Moth Slasher',
    level: 13, hp: 260, mp: 0, exp: 46, ap: 5, gil: 75,
    atk: 31, def: 28, defPct: 4, mat: 0, mdf: 58, dex: 59, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [],
    steal: [{ item: 'carbon_bangle', chance: 14 }],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'mech', variant: 1, c1: '#9aa0aa', c2: '#505862', c3: '#ff3030', size: 1.2 },
    attacks: {
      verbal_attack: { name: 'Verbal Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      speed_slash: { name: 'Speed Slash', kind: 'phys', power: 29, element: 'cut', target: 'enemy', acc: 85 },
    },
    ai: { moves: [['verbal_attack', 67], ['speed_slash', 33]] },
    desc: 'Bladed security robot of the upper floors.',
  },

  sword_dance: {
    name: 'Sword Dance',
    level: 11, hp: 160, mp: 0, exp: 39, ap: 6, gil: 90,
    atk: 22, def: 24, defPct: 5, mat: 0, mdf: 32, dex: 52, lck: 0,
    // FF7: takes double damage from Confusion-inflicting attacks (not modelled as an element).
    elem: { earth: 0 }, immune: ['stop', 'paralysis'],
    drops: [{ item: 'loco_weed', chance: 14 }],
    steal: [{ item: 'hyper', chance: 14 }],
    morph: 'light_curtain',
    boss: false, flying: true, row: 'front',
    look: { type: 'machine', variant: 3, c1: '#b0b8c0', c2: '#5a3a8a', c3: '#ff40a0', size: 1 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      bodyblow_x2: { name: 'Bodyblow', kind: 'phys', power: 16, hits: 2, element: 'hit', target: 'enemy', silent: true },
      slap: { name: 'Slap', kind: 'phys', power: 20, element: 'hit', add: ['fury'], hit: 47, target: 'enemy', acc: 95 },
      sawback: { name: 'Sawback', kind: 'phys', power: 11, element: 'cut', target: 'allEnemies' },
      sawback_x2: { name: 'Sawback', kind: 'phys', power: 11, hits: 2, element: 'cut', target: 'allEnemies' },
    },
    ai: {
      moves: [['bodyblow', 50], ['sawback', 25], ['slap', 25]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.c === undefined) { v.c = b.rnd(4); v.sp = 5; }
        if (e.hpPct <= 50 && v.sp === 5) { v.sp = 3; v.c = 3; }
        var two = b.rnd(v.sp) === 0;
        if (v.c <= 1) { v.c++; return { move: two ? 'bodyblow_x2' : 'bodyblow', target: 'random' }; }
        if (v.c === 2) { v.c = 0; return { move: two ? 'sawback_x2' : 'sawback', target: 'all' }; }
        v.c = 1;
        return { move: 'slap', target: p.indexOf(v.tgt) >= 0 ? v.tgt : 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) { if (src && kind !== 'death') e.vars.tgt = src; return null; },
      },
    },
    desc: 'Whirling blade machine.',
  },

  hammer_blaster: {
    name: 'Hammer Blaster',
    level: 12, hp: 210, mp: 0, exp: 43, ap: 5, gil: 80,
    atk: 18, def: 12, defPct: 3, mat: 0, mdf: 44, dex: 50, lck: 4,
    elem: { lightning: 2 },
    immune: ['death', 'confusion', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk'],
    drops: [{ item: 'loco_weed', chance: 14 }],
    steal: [{ item: 'echo_screen', chance: 52 }],
    morph: 'smoke_bomb',
    boss: false, flying: false, row: 'back',
    look: { type: 'machine', variant: 1, c1: '#c09020', c2: '#40444a', c3: '#ff3030', size: 1.2 },
    attacks: {
      hammer_attack: { name: 'Hammer Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      muddle_mallet: { name: 'Muddle Mallet', kind: 'phys', power: 8, element: 'hit', add: ['confusion'], hit: 47, target: 'enemy', acc: 90, silent: true },
      vanish: { name: 'Vanish', kind: 'special', special: 'nothing', target: 'self', silent: true },
      appear: { name: 'Appear', kind: 'special', special: 'nothing', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['hammer_attack', 80], ['muddle_mallet', 20]],
      // FF7: two swings, retracts into the ceiling, then drops back (sometimes swinging at once).
      // The lower its HP, the more often it uses the confusing Muddle Mallet.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.c === undefined) v.c = b.rnd(2);
        var sp = e.hpPct <= 25 ? 2 : e.hpPct <= 50 ? 3 : e.hpPct <= 75 ? 4 : 5;
        function swing() {
          var ok = p.filter(function (c) { return !b.has(c, 'confusion'); });
          if (ok.length && b.rnd(sp) === 0) return { move: 'muddle_mallet', target: b.pick(ok) };
          return { move: 'hammer_attack', target: 'random' };
        }
        if (v.c <= 1) { v.c++; return swing(); }
        if (v.c === 2) { v.c = 3; return { move: 'vanish', target: 'self' }; }
        if (v.c === 3) { v.c = b.rnd(2) ? 4 : 5; return { move: 'wait', target: 'self' }; }
        if (v.c === 4) { v.c = 0; return { move: 'appear', target: 'self' }; }
        v.c = 1;
        return swing();
      },
    },
    desc: 'Ceiling-mounted hammer trap.',
  },

  warning_board: {
    name: 'Warning Board',
    level: 12, hp: 270, mp: 0, exp: 38, ap: 4, gil: 75,
    atk: 10, def: 10, defPct: 0, mat: 0, mdf: 14, dex: 40, lck: 0,
    elem: { lightning: 0 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'frog', 'small', 'slow_numb',
      'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 3, c1: '#d8c020', c2: '#202020', c3: '#ff2020', size: 1.1 },
    attacks: {
      warning: { name: 'Warning! Warning!', kind: 'special', special: 'nothing', target: 'self' },
      leave: { name: 'Leave at once!!', kind: 'special', special: 'nothing', target: 'self' },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 1]],
      // Activates its Machine Gun and Laser Cannon; they shut down when the board is destroyed.
      custom: function (e, b) {
        if (!e.vars.said) { e.vars.said = true; return { move: b.rnd(2) ? 'warning' : 'leave', target: 'self' }; }
        return { move: 'wait', target: 'self' };
      },
    },
    desc: 'Security display that controls the lab\'s machine gun and laser cannon.',
  },

  machine_gun: {
    name: 'Machine Gun',
    level: 8, hp: 155, mp: 0, exp: 5, ap: 0, gil: 0,
    atk: 18, def: 10, defPct: 0, mat: 0, mdf: 4, dex: 62, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 2, c1: '#6a727c', c2: '#2c3036', c3: '#ffb020', size: 0.8 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      shut_down: { name: 'Shut Down', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['machine_gun', 50], ['wait', 50]],
      custom: function (e, b) {
        var board = b.enemies().some(function (c) { return c.name === 'Warning Board'; });
        if (!board) return { move: 'shut_down', target: 'self' };
        return b.rnd(2) ? { move: 'machine_gun', target: 'random' } : { move: 'wait', target: 'self' };
      },
    },
    desc: 'Lab defence gun, controlled by a Warning Board.',
  },

  laser_cannon: {
    name: 'Laser Cannon',
    level: 8, hp: 155, mp: 0, exp: 5, ap: 0, gil: 0,
    atk: 20, def: 10, defPct: 0, mat: 0, mdf: 4, dex: 58, lck: 0,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 2, c1: '#707a86', c2: '#2a2e36', c3: '#ff3030', size: 0.8 },
    attacks: {
      laser_cannon: { name: 'Laser Cannon', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      paralaser: { name: 'Paralaser', kind: 'phys', power: 16, element: 'shoot', add: ['paralysis'], hit: 7, target: 'enemy', acc: 30 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      shut_down: { name: 'Shut Down', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['laser_cannon', 38], ['paralaser', 12], ['wait', 50]],
      custom: function (e, b) {
        var board = b.enemies().some(function (c) { return c.name === 'Warning Board'; });
        if (!board) return { move: 'shut_down', target: 'self' };
        if (b.rnd(2)) return { move: 'wait', target: 'self' };
        var ok = b.party().filter(function (c) { return !b.has(c, 'paralysis'); });
        if (ok.length && b.rnd(4) === 0) return { move: 'paralaser', target: b.pick(ok) };
        return { move: 'laser_cannon', target: 'random' };
      },
    },
    desc: 'Lab defence laser, controlled by a Warning Board.',
  },

  soldier_3rd: {
    name: 'SOLDIER:3rd',
    level: 13, hp: 250, mp: 40, exp: 54, ap: 6, gil: 116,
    atk: 27, def: 38, defPct: 12, mat: 8, mdf: 72, dex: 60, lck: 8,
    // FF7: also weak to Confusion-inflicting attacks.
    elem: { fire: 2 }, immune: [],
    drops: [{ item: 'loco_weed', chance: 14 }],
    steal: [{ item: 'hardedge', chance: 14 }],
    morph: 'bolt_plume',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 3, c1: '#4a3a8a', c2: '#9aa0b0', c3: '#60e0ff', size: 1.05 },
    attacks: {
      split: { name: 'Split', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      split_x2: { name: 'Split', kind: 'phys', power: 16, hits: 2, element: 'cut', target: 'enemy', silent: true },
      flying_sickle: { name: 'Flying Sickle', kind: 'mag', power: 12, element: 'wind', target: 'enemy', mp: 8, acc: 255 },
      bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
      ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
      sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 71, target: 'enemy', mp: 8 },
    },
    ai: {
      moves: [['split', 50], ['flying_sickle', 20], ['sleepel', 10], ['bolt2', 10], ['ice2', 10]],
      // FF7: Split / Flying Sickle, then Sleepel, then Bolt2 or Ice2 on a sleeping target;
      // magic and double attacks become more likely as it loses HP.
      custom: function (e, b) {
        var v = e.vars, p = b.party(), q = e.hpPct;
        var awake = p.filter(function (c) { return !b.has(c, 'sleep'); });
        var asleep = p.filter(function (c) { return b.has(c, 'sleep'); });
        var mg = q <= 50 ? 1 : q <= 75 ? 2 : 4, sp = q <= 25 ? 1 : q <= 50 ? 2 : q <= 75 ? 3 : 4;
        if (v.c === undefined) v.c = b.rnd(4);
        var c = v.c, atk, two = false;
        if (c <= 1) { atk = c + 1; two = b.rnd(sp) === 0; v.c = 2; }
        else if (c === 2) {
          v.c = b.rnd(2) ? 3 : 4;
          if (awake.length && e.mp >= 8 && b.rnd(mg) === 0) return { move: 'sleepel', target: b.pick(awake) };
          atk = 1 + b.rnd(2);
        } else {
          v.c = b.rnd(2);
          if (e.mp >= 22 && b.rnd(mg) === 0) return { move: c === 3 ? 'bolt2' : 'ice2', target: asleep.length ? b.pick(asleep) : 'random' };
          atk = 1 + b.rnd(2);
        }
        var t = awake.length ? b.pick(awake) : 'random';
        if (atk === 2 && e.mp >= 8) return { move: 'flying_sickle', target: t };
        return { move: two ? 'split_x2' : 'split', target: t };
      },
    },
    desc: 'SOLDIER 3rd Class. Uses magic as well as the sword.',
  },

  sample_h0512: {
    name: 'Sample:H0512',
    level: 19, hp: 1000, mp: 120, exp: 300, ap: 30, gil: 250,
    atk: 40, def: 60, defPct: 1, mat: 35, mdf: 64, dex: 65, lck: 1,
    elem: { lightning: 0.5, gravity: 0, poison: -1 },
    immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk'],
    drops: [{ item: 'talisman', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'back',
    look: { type: 'demon', variant: 2, c1: '#5a8a4a', c2: '#c0d890', c3: '#ff3060', size: 2.2 },
    attacks: {
      keyclaw: { name: 'Keyclaw', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
      shady_breath: { name: 'Shady Breath', kind: 'status', element: 'poison', add: ['poison'], hit: 71, target: 'allEnemies', mp: 4, acc: 255 },
      // FF7: revives every fallen Sample:H0512-opt (modelled as calling a new one).
      reanimagic: { name: 'Reanimagic', kind: 'special', special: 'callHelp', summon: 'sample_h0512_opt', target: 'self', mp: 40 },
    },
    ai: {
      moves: [['keyclaw', 75], ['shady_breath', 25]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (!v.opened) { v.opened = true; return { move: 'shady_breath', target: 'all' }; }
        var opts = b.enemies().filter(function (c) { return c.name === 'Sample:H0512-opt'; });
        if (opts.length < 3 && e.mp >= 40) return { move: 'reanimagic', target: 'self' };
        var clean = p.filter(function (c) { return !b.has(c, 'poison'); });
        if (clean.length && b.rnd(4) === 0) return { move: 'shady_breath', target: 'all' };
        var sick = p.filter(function (c) { return b.has(c, 'poison'); });
        return { move: 'keyclaw', target: sick.length ? b.pick(sick) : 'random' };
      },
    },
    desc: 'Hojo\'s specimen, released from its tank. Keeps reviving its H0512-opt parasites.',
  },

  sample_h0512_opt: {
    name: 'Sample:H0512-opt',
    level: 7, hp: 300, mp: 48, exp: 20, ap: 2, gil: 0,
    atk: 22, def: 46, defPct: 4, mat: 18, mdf: 32, dex: 45, lck: 2,
    elem: { earth: 0 }, immune: ['frog', 'small', 'manipulate'],
    drops: [{ item: 'tranquilizer', chance: 100 }],
    steal: [],
    morph: null,
    boss: false, flying: true, row: 'front',
    look: { type: 'blob', variant: 2, c1: '#8aa05a', c2: '#e0e8a0', c3: '#ff4060', size: 0.8 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      rolling_attack: { name: 'Rolling Attack', kind: 'phys', power: 48, element: 'hit', target: 'enemy', acc: 90 },
      fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', target: 'enemy', mp: 4 },
      ice: { name: 'Ice', kind: 'mag', power: 8, element: 'ice', target: 'enemy', mp: 4 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      vanish: { name: 'Vanish', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['bodyblow', 25], ['rolling_attack', 25], ['fire', 8], ['ice', 8], ['wait', 34]],
      custom: function (e, b) {
        if (!b.enemies().some(function (c) { return c.name === 'Sample:H0512'; })) return { move: 'vanish', target: 'self' };
        var r = b.rnd(4);
        if (r === 0) return { move: 'bodyblow', target: 'random' };
        if (r === 1) {
          var ok = b.party().some(function (c) { return !b.has(c, 'paralysis'); });
          return ok ? { move: 'rolling_attack', target: 'random' } : { move: 'wait', target: 'self' };
        }
        if (b.rnd(3)) return { move: 'wait', target: 'self' };
        return { move: e.mp >= 4 ? (r === 2 ? 'fire' : 'ice') : 'bodyblow', target: 'random' };
      },
    },
    desc: 'Parasitic offshoot of Sample:H0512. Disappears when its host dies.',
  },

  // ===========================================================================================
  // Shinra HQ escape (floors 67-70, elevator), Rufus, highway
  // ===========================================================================================
  brain_pod: {
    name: 'Brain Pod',
    level: 15, hp: 240, mp: 46, exp: 52, ap: 6, gil: 95,
    atk: 23, def: 26, defPct: 3, mat: 6, mdf: 32, dex: 48, lck: 6,
    elem: { holy: 2, earth: 0, poison: -1, restorative: -1 },
    immune: ['death'],
    drops: [{ item: 'deadly_waste', chance: 14 }],
    steal: [{ item: 'antidote', chance: 52 }],
    morph: 'deadly_waste',
    boss: false, flying: false, row: 'front',
    look: { type: 'blob', variant: 3, c1: '#c89aa0', c2: '#6ab0c0', c3: '#ffffff', size: 1 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      refuse: { name: 'Refuse', kind: 'mag', power: 12, element: 'poison', add: ['poison'], hit: 39, target: 'enemy', mp: 4, acc: 95 },
      refuse_sleep: { name: 'Refuse', kind: 'mag', power: 6, element: 'poison', add: ['sleep'], hit: 39, target: 'enemy', mp: 4, acc: 95 },
    },
    ai: {
      moves: [['refuse', 50], ['bodyblow', 50]],
      // FF7: poisons first, then puts poisoned targets to sleep, then bodyblows the healthy.
      custom: function (e, b) {
        var p = b.party();
        var pois = p.filter(function (c) { return b.has(c, 'poison'); });
        var slp = p.some(function (c) { return b.has(c, 'sleep'); });
        if (e.mp >= 4) {
          if (!pois.length) return { move: 'refuse', target: 'random' };
          var ps = pois.filter(function (c) { return !b.has(c, 'sleep'); });
          if (!slp && ps.length) return { move: 'refuse_sleep', target: b.pick(ps) };
        }
        var fine = p.filter(function (c) { return !b.has(c, 'poison') && !b.has(c, 'sleep'); });
        return { move: 'bodyblow', target: fine.length ? b.pick(fine) : 'random' };
      },
    },
    desc: 'Brain specimen in a mobile jar. Cure magic hurts it.',
  },

  vargid_police: {
    name: 'Vargid Police',
    level: 9, hp: 140, mp: 28, exp: 44, ap: 7, gil: 40,
    atk: 12, def: 16, defPct: 5, mat: 24, mdf: 20, dex: 48, lck: 2,
    elem: {}, immune: [],
    drops: [{ item: 'phoenix_down', chance: 100 }],
    steal: [{ item: 'tranquilizer', chance: 52 }],
    morph: 'tranquilizer',
    boss: false, flying: true, row: 'front',
    look: { type: 'insect', variant: 1, c1: '#3a4a2a', c2: '#a0c060', c3: '#ff2020', size: 0.9 },
    attacks: {
      needle: { name: 'Needle', kind: 'phys', power: 1, add: ['paralysis'], hit: 7, target: 'enemy', mp: 1, acc: 10 },
      // Kamikaze attack: the Vargid Police is removed afterwards and leaves no rewards.
      suicide: { name: 'Suicide', kind: 'pct', pct: 18.75, target: 'enemy', mp: 10, acc: 255, selfKO: true },
      gone: { name: 'Suicide', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['needle', 1]],
      // FF7: suicides once a partner falls or it drops to 1/4 HP.
      custom: function (e, b) {
        var v = e.vars;
        if (v.boom) return { move: 'gone', target: 'self' };
        var n = b.enemies().filter(function (c) { return c.name === 'Vargid Police'; }).length;
        if (v.n0 === undefined) v.n0 = n;
        if ((n < v.n0 || e.hpPct <= 25) && e.mp >= 10) { v.boom = true; return { move: 'suicide', target: 'random' }; }
        return { move: 'needle', target: 'random' };
      },
    },
    desc: 'Mutant hornet from Hojo\'s lab. Explodes when cornered.',
  },

  zenene: {
    name: 'Zenene',
    level: 14, hp: 250, mp: 93, exp: 58, ap: 6, gil: 60,
    atk: 26, def: 20, defPct: 8, mat: 16, mdf: 20, dex: 60, lck: 5,
    elem: { holy: 2, fire: 0.5, poison: -1, restorative: -1 },
    immune: ['poison'],
    drops: [{ item: 'ether', chance: 14 }],
    steal: [{ item: 'deadly_waste', chance: 52 }],
    morph: 'remedy',
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', variant: 1, c1: '#7a5a8a', c2: '#d0b0e0', c3: '#ffe040', size: 1.1 },
    attacks: {
      fang: { name: 'Fang', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 120, silent: true },
      piazzo_shower: { name: 'Piazzo Shower', kind: 'mag', power: 8, element: 'poison', add: ['poison'], hit: 71, target: 'enemy', mp: 6, acc: 255 },
      ghenghana: { name: 'Ghenghana', kind: 'mag', power: 10, element: 'fire', target: 'enemy', mp: 6, acc: 255 },
    },
    ai: { moves: [['fang', 50], ['piazzo_shower', 25], ['ghenghana', 25]] },
    desc: 'Undead hound. Restorative magic harms it.',
  },

  hundred_gunner: {
    name: 'Hundred Gunner',
    level: 18, hp: 1600, mp: 0, exp: 330, ap: 35, gil: 300,
    atk: 52, def: 46, defPct: 1, mat: 0, mdf: 240, dex: 63, lck: 0,
    elem: { lightning: 2, gravity: 0.5 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'stop', 'frog', 'small',
      'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: null,
    boss: true, flying: false, row: 'front', cantReach: true,
    look: { type: 'tank', variant: 2, c1: '#7a828c', c2: '#3a3e44', c3: '#ff4020', size: 2.6 },
    attacks: {
      aux_artillery: { name: 'Aux Artillery', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      hidden_artillery: { name: 'Hidden Artillery', kind: 'phys', power: 20, element: 'shoot', target: 'enemy', acc: 120 },
      main_artillery: { name: 'Main Artillery', kind: 'phys', power: 12, element: 'shoot', target: 'allEnemies' },
      wave_artillery: { name: 'Wave Artillery', kind: 'phys', power: 18, element: 'shoot', target: 'allEnemies', acc: 255 },
      charging: { name: 'Sensor Cannon Charging!', kind: 'special', special: 'nothing', target: 'self' },
      charged: { name: 'Sensor Cannon Charged!', kind: 'special', special: 'nothing', target: 'self' },
    },
    ai: {
      moves: [['aux_artillery', 75], ['hidden_artillery', 25]],
      // FF7: form 1 (guns), form 2 below 2/3 HP (Main Artillery), form 3 below 1/3 HP
      // (charges twice, then Wave Artillery). On defeat the Heli Gunner fight starts at once.
      custom: function (e, b) {
        var v = e.vars;
        if (e.hpPct <= 100 / 3) {
          v.ch = v.ch || 0;
          if (v.ch < 2) { v.ch++; return { move: v.ch === 1 ? 'charging' : 'charged', target: 'self' }; }
          v.ch = 0;
          return { move: 'wave_artillery', target: 'all' };
        }
        if (e.hpPct <= 200 / 3) return { move: 'main_artillery', target: 'all' };
        if (!v.opened) { v.opened = true; return { move: 'aux_artillery', target: 'random' }; }
        return { move: b.rnd(4) === 0 ? 'hidden_artillery' : 'aux_artillery', target: 'random' };
      },
    },
    desc: 'Heavy gun platform guarding the Shinra HQ elevator shaft. Can\'t be reached by melee.',
  },

  heli_gunner: {
    name: 'Heli Gunner',
    level: 19, hp: 1000, mp: 0, exp: 250, ap: 25, gil: 200,
    atk: 55, def: 40, defPct: 15, mat: 0, mdf: 220, dex: 66, lck: 0,
    elem: { lightning: 2, wind: 2, earth: 0 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'stop', 'frog', 'small',
      'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [{ item: 'mythril_armlet', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: true, row: 'front', cantReach: true,
    look: { type: 'flyer', variant: 2, c1: '#8a929c', c2: '#2a3038', c3: '#ff4020', size: 2.3 },
    attacks: {
      ab_cannon: { name: 'AB Cannon', kind: 'phys', power: 16, element: 'shoot', add: ['sleep'], hit: 27, target: 'enemy' },
      c_cannon: { name: 'C Cannon', kind: 'phys', power: 16, element: 'shoot', add: ['poison'], hit: 27, target: 'enemy' },
      firing_line: { name: 'Firing Line', kind: 'phys', power: 13, element: 'shoot', add: ['poison', 'sleep'], hit: 19, target: 'allEnemies' },
      spinning_bodyblow: { name: 'Spinning Bodyblow', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
      flying_drill: { name: 'Flying Drill', kind: 'phys', power: 24, element: 'hit', target: 'enemy', acc: 95 },
      start_spin: { name: 'Start Spin', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['ab_cannon', 40], ['c_cannon', 40], ['firing_line', 20]],
      // FF7: alternates AB/C Cannon with occasional Firing Line; below 25% HP it starts spinning
      // (Def +50, MDf +50) and rams the party.
      custom: function (e, b) {
        var v = e.vars;
        if (e.hpPct <= 25) {
          if (!v.spin) { v.spin = true; e.def += 50; e.mdf += 50; return { move: 'start_spin', target: 'self' }; }
          return { move: b.rnd(2) ? 'spinning_bodyblow' : 'flying_drill', target: 'random' };
        }
        var c = v.c || 0, fl = b.rnd(4) === 0;
        if (c === 0) { v.c = 1; return { move: 'ab_cannon', target: 'random' }; }
        if (c === 1) { v.c = fl ? 3 : 2; return { move: fl ? 'firing_line' : 'c_cannon', target: fl ? 'all' : 'random' }; }
        if (c === 2) { v.c = fl ? 3 : 1; return { move: fl ? 'firing_line' : 'ab_cannon', target: fl ? 'all' : 'random' }; }
        v.c = fl ? 2 : 1;
        return { move: fl ? 'c_cannon' : 'ab_cannon', target: 'random' };
      },
    },
    desc: 'Attack helicopter drone. Only its rewards are received for the Hundred/Heli Gunner fight.',
  },

  rufus: {
    name: 'Rufus',
    level: 21, hp: 500, mp: 0, exp: 240, ap: 35, gil: 400,
    atk: 35, def: 32, defPct: 14, mat: 0, mdf: 160, dex: 72, lck: 8,
    elem: { gravity: 0 },
    immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk'],
    drops: [{ item: 'protect_vest', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 2, c1: '#f0f0f0', c2: '#e8c870', c3: '#3a3a44', size: 1.25 },
    attacks: {
      shotgun: { name: 'Shotgun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
      heh: { name: 'Heh, Heh, Heh...', kind: 'special', special: 'nothing', target: 'self' },
    },
    ai: {
      moves: [['shotgun', 1]],
      // FF7: while above 200 HP and not badly hurt since his last turn he sometimes just laughs.
      custom: function (e, b) {
        var v = e.vars, diff = v.prev === undefined ? 0 : v.prev - e.hp;
        v.prev = e.hp;
        if (e.hp > 200 && diff < 100 && b.rnd(3) === 0) return { move: 'heh', target: 'self' };
        return { move: 'shotgun', target: 'random' };
      },
    },
    desc: 'Rufus Shinra, new President of Shinra. "Heh... That\'s all for today..."',
  },

  dark_nation: {
    name: 'Dark Nation',
    level: 18, hp: 140, mp: 80, exp: 70, ap: 7, gil: 250,
    atk: 43, def: 38, defPct: 18, mat: 15, mdf: 94, dex: 74, lck: 3,
    elem: {}, immune: ['confusion'],
    drops: [{ item: 'guard_source', chance: 100 }],
    steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', variant: 3, c1: '#1a1a24', c2: '#3a4a8a', c3: '#ff3030', size: 1.3 },
    attacks: {
      bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      barrier: { name: 'Barrier', kind: 'status', add: ['barrier'], hit: 100, target: 'ally', mp: 16 },
      mbarrier: { name: 'MBarrier', kind: 'status', add: ['mbarrier'], hit: 100, target: 'self', mp: 24 },
      bolt: { name: 'Bolt', kind: 'mag', power: 8, element: 'lightning', target: 'enemy', mp: 4 },
      bolt_all: { name: 'Bolt', kind: 'mag', power: 5, element: 'lightning', target: 'allEnemies', mp: 4 },
      vanish: { name: 'Dark Nation', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['bite', 50], ['bolt', 25], ['barrier', 25]],
      // FF7: shields Rufus with Barrier first, then itself (Barrier, MBarrier), then attacks.
      // Leaves the battle when Rufus is defeated.
      custom: function (e, b) {
        var rufus = null;
        b.enemies().forEach(function (c) { if (c.name === 'Rufus') rufus = c; });
        if (!rufus) return { move: 'vanish', target: 'self' };
        var norm = false;
        if (!b.has(rufus, 'barrier')) {
          if (e.mp >= 16) return { move: 'barrier', target: rufus };
          return { move: 'bite', target: 'random' };
        }
        if (b.rnd(2)) norm = true;
        else if (!b.has(e, 'barrier')) return e.mp >= 16 ? { move: 'barrier', target: e } : { move: 'bite', target: 'random' };
        else if (!b.has(e, 'mbarrier')) return e.mp >= 24 ? { move: 'mbarrier', target: 'self' } : { move: 'bite', target: 'random' };
        else return e.mp >= 4 ? { move: 'bolt_all', target: 'all' } : { move: 'bite', target: 'random' };
        if (norm && b.rnd(2) && e.mp >= 4) return { move: 'bolt', target: 'random' };
        return { move: 'bite', target: 'random' };
      },
    },
    desc: 'Rufus\' black panther.',
  },

  motor_ball: {
    name: 'Motor Ball',
    level: 19, hp: 2600, mp: 120, exp: 440, ap: 45, gil: 350,
    atk: 44, def: 32, defPct: 10, mat: 17, mdf: 34, dex: 67, lck: 1,
    elem: { lightning: 2, fire: 0.5, gravity: 0 },
    immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'stop', 'frog', 'small',
      'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
    drops: [{ item: 'star_pendant', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'tank', c1: '#6a727c', c2: '#c03020', c3: '#ffb020', size: 2.6 },
    attacks: {
      highway: { name: 'Highway', kind: 'phys', power: 11, element: 'hit', target: 'allEnemies', acc: 95, silent: true },
      deadly_wheel: { name: 'Deadly Wheel', kind: 'phys', power: 11, element: 'hit', target: 'allEnemies' },
      twin_burner: { name: 'Twin Burner', kind: 'mag', power: 7, element: 'fire', target: 'allEnemies', mp: 16, acc: 255 },
      rolling_fire: { name: 'Rolling Fire', kind: 'mag', power: 16, element: 'fire', target: 'allEnemies', mp: 24, acc: 255 },
      arm_attack: { name: 'Arm Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 110 },
      arm_attack_x2: { name: 'Arm Attack', kind: 'phys', power: 20, hits: 2, element: 'hit', target: 'enemy', acc: 110 },
      transform: { name: 'Transform', kind: 'special', special: 'nothing', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['arm_attack', 40], ['deadly_wheel', 30], ['rolling_fire', 30]],
      // FF7 (back attack on the highway): opens with Highway, then Arm Attack x2-4 on the highest HP,
      // flame-thrower form (Twin Burner, pause, Deadly Wheel), upright again, Rolling Fire, repeat.
      // At 1/8 HP it jumps straight to the flame-thrower phase once.
      custom: function (e, b) {
        var v = e.vars;
        if (!v.opened) { v.opened = true; v.c = 0; return { move: 'highway', target: 'all' }; }
        if (!v.low && e.hpPct <= 12.5) { v.low = true; v.c = 2; }
        var c = v.c;
        if (c <= 1) {
          v.c++;
          var p = b.party(), t = p[0];
          p.forEach(function (x) { if (x.hp > t.hp) t = x; });
          return { move: b.rnd(2) ? 'arm_attack_x2' : 'arm_attack', target: t || 'random' };
        }
        if (c === 2) { v.c = 3; return e.mp >= 16 ? { move: 'twin_burner', target: 'all' } : { move: 'deadly_wheel', target: 'all' }; }
        if (c === 3) { v.c = 4; return { move: 'wait', target: 'self' }; }
        if (c === 4) { v.c = 5; return { move: 'deadly_wheel', target: 'all' }; }
        if (c === 5) { v.c = 6; return { move: 'transform', target: 'self' }; }
        v.c = 0;
        return e.mp >= 24 ? { move: 'rolling_fire', target: 'all' } : { move: 'deadly_wheel', target: 'all' };
      },
    },
    desc: 'Shinra pursuit machine that rolls down the Midgar expressway.',
  },

  // ===========================================================================================
  // World map: Midgar Area (wasteland / Kalm grasslands / beach)
  // ===========================================================================================
  devil_ride: {
    name: 'Devil Ride',
    level: 13, hp: 240, mp: 0, exp: 60, ap: 6, gil: 100,
    atk: 25, def: 40, defPct: 3, mat: 4, mdf: 22, dex: 56, lck: 2,
    elem: {},
    immune: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'frog', 'small', 'death_sentence', 'berserk',
      'paralysis', 'darkness'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'hi_potion', chance: 52 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 1, c1: '#9a2a2a', c2: '#3a3a40', c3: '#ffd040', size: 1.1 },
    attacks: {
      wheelie: { name: 'Wheelie', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      drift_turn: { name: 'Drift Turn', kind: 'phys', power: 13, element: 'hit', target: 'allEnemies', acc: 95 },
    },
    ai: { moves: [['wheelie', 50], ['drift_turn', 50]] },
    desc: 'Motorcycle possessed by a wasteland spirit.',
  },

  custom_sweeper: {
    name: 'Custom Sweeper',
    level: 15, hp: 300, mp: 100, exp: 63, ap: 7, gil: 120,
    atk: 30, def: 30, defPct: 1, mat: 3, mdf: 40, dex: 43, lck: 1,
    elem: { lightning: 2 },
    immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'atomic_scissors', chance: 14 }],
    morph: 'x_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', c1: '#b0b8a0', c2: '#8a3020', c3: '#ff4020', size: 1.35 },
    attacks: {
      w_machine_gun: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', target: 'enemy' },
      smoke_shot: { name: 'Smoke Shot', kind: 'phys', power: 24, element: 'shoot', target: 'enemy', acc: 75 },
      matra_magic: { name: 'Matra Magic', kind: 'mag', power: 11, target: 'allEnemies', mp: 8, eskill: 'matra_magic' },
    },
    ai: {
      moves: [['w_machine_gun', 50], ['smoke_shot', 25], ['matra_magic', 25]],
      custom: function (e, b) {
        var r = b.rnd(4);
        if (r === 0 && e.mp >= 8) return { move: 'matra_magic', target: 'all' };
        if (r === 1) {
          var nd = b.party().filter(function (c) { return !b.has(c, 'darkness'); });
          if (nd.length) return { move: 'smoke_shot', target: b.pick(nd) };
        }
        return { move: 'w_machine_gun', target: 'random' };
      },
    },
    desc: 'Upgraded Sweeper patrolling the wasteland. Learn Matra Magic from it.',
  },

  kalm_fang: {
    name: 'Kalm Fang',
    level: 10, hp: 160, mp: 0, exp: 53, ap: 5, gil: 92,
    atk: 24, def: 30, defPct: 14, mat: 16, mdf: 14, dex: 57, lck: 6,
    elem: { fire: 2 }, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'ether', chance: 14 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', c1: '#8a6a4a', c2: '#e0d0b0', c3: '#ff3020', size: 1 },
    attacks: {
      fang: { name: 'Fang', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 120, silent: true },
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
    },
    ai: { moves: [['fang', 75], ['bodyblow', 25]] },
    desc: 'Wolf of the plains around Kalm. Weak against fire.',
  },

  prowler: {
    name: 'Prowler',
    level: 12, hp: 150, mp: 0, exp: 55, ap: 5, gil: 160,
    atk: 23, def: 28, defPct: 18, mat: 0, mdf: 28, dex: 66, lck: 8,
    elem: {}, immune: ['frog'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'ether', chance: 52 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 1, c1: '#5a4a7a', c2: '#c8a878', c3: '#ffe040', size: 0.85 },
    attacks: {
      steal: { name: 'Steal', kind: 'special', special: 'stealItem', target: 'enemy' },
      grind: { name: 'Grind', kind: 'special', special: 'stealItem', target: 'enemy' },
      seize: { name: 'Seize', kind: 'phys', power: 16, target: 'enemy' },
      escape: { name: 'Escape', kind: 'special', special: 'flee', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['seize', 50], ['steal', 25], ['grind', 25]],
      // FF7: sizes up its target, does one Steal/Grind/Seize, then runs away.
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0, p = b.party();
        var t = p.indexOf(v.tgt) >= 0 ? v.tgt : 'random';
        if (c === 0) { var r = b.rnd(4); v.c = r === 0 ? 1 : (r === 1 ? 2 : 3); return { move: 'wait', target: 'self' }; }
        if (c <= 3) { v.c = b.rnd(2) ? 4 : 5; return { move: c === 1 ? 'steal' : (c === 2 ? 'grind' : 'seize'), target: t }; }
        if (c === 4) { v.c = 5; return { move: 'wait', target: 'self' }; }
        return { move: 'escape', target: 'self' };
      },
      counter: {
        custom: function (e, b, src, kind) { if (src && kind !== 'death') e.vars.tgt = src; return null; },
      },
    },
    desc: 'Grassland thief. Kill it before it runs off with your items.',
  },

  // ===========================================================================================
  // World map: Grasslands Area (Chocobo Farm) and the Midgar Zolom marsh
  // ===========================================================================================
  elfadunk: {
    name: 'Elfadunk',
    level: 14, hp: 220, mp: 34, exp: 64, ap: 7, gil: 140,
    atk: 28, def: 40, defPct: 2, mat: 6, mdf: 8, dex: 55, lck: 2,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'hi_potion', chance: 14 }],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', variant: 2, c1: '#8a8aa0', c2: '#d0c8c0', c3: '#ff4040', size: 1.3 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      shower: { name: 'Shower', kind: 'mag', power: 8, element: 'shoot', add: ['sadness'], hit: 99, target: 'enemy', mp: 5, acc: 95 },
    },
    ai: {
      moves: [['bodyblow', 50], ['shower', 50]],
      // FF7: retaliates against whoever last hit it physically.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.tgt && p.indexOf(v.tgt) >= 0) {
          var t = v.tgt; v.tgt = null;
          return { move: (b.rnd(4) === 0 && e.mp >= 5) ? 'shower' : 'bodyblow', target: t };
        }
        return { move: (b.rnd(2) && e.mp >= 5) ? 'shower' : 'bodyblow', target: 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) { if (kind === 'phys') e.vars.tgt = src; return null; },
      },
    },
    desc: 'Elephant-like beast that sprays water from its trunk.',
  },

  mu: {
    name: 'Mu',
    level: 12, hp: 210, mp: 52, exp: 54, ap: 6, gil: 130,
    atk: 23, def: 30, defPct: 7, mat: 27, mdf: 32, dex: 59, lck: 14,
    elem: {}, immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate'],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'beast', variant: 1, c1: '#a08060', c2: '#e8d8b0', c3: '#202020', size: 0.8 },
    attacks: {
      rock_toss: { name: 'Rock Toss', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', acc: 120, silent: true },
      sewer: { name: 'Sewer', kind: 'mag', power: 16, element: 'water', target: 'enemy' },
      sinking: { name: 'Sinking', kind: 'phys', power: 38, element: 'earth', target: 'enemy' },
      // FF7 quirk: heals the party member it targets.
      hot_springs: { name: 'Hot Springs', kind: 'heal', power: 7, element: 'restorative', target: 'enemy', acc: 255 },
      // Only affects targets whose level is a multiple of 4: HP to 1/32 and Mini.
      l4_suicide: { name: 'L4 Suicide', kind: 'special', special: 'l4_suicide', pct: 97, add: ['small'], hit: 100, target: 'allEnemies', mp: 10, eskill: 'l4_suicide' },
    },
    ai: { moves: [['rock_toss', 4], ['sewer', 4], ['sinking', 4], ['hot_springs', 1], ['l4_suicide', 1]] },
    desc: 'Burrowing squirrel of the grasslands. Learn L4 Suicide from it.',
  },

  mandragora: {
    name: 'Mandragora',
    level: 10, hp: 120, mp: 0, exp: 55, ap: 6, gil: 135,
    atk: 22, def: 12, defPct: 2, mat: 53, mdf: 450, dex: 49, lck: 3,
    elem: {}, immune: [],
    drops: [{ item: 'lasan_nut', chance: 14 }],
    steal: [{ item: 'lasan_nut', chance: 14 }],
    morph: 'ether',
    boss: false, flying: false, row: 'front',
    look: { type: 'plant', c1: '#5a8a3a', c2: '#c8a060', c3: '#ff3060', size: 0.8 },
    attacks: {
      grass_punch: { name: 'Grass Punch', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      slow_dance: { name: 'Slow Dance', kind: 'phys', power: 10, element: 'shoot', add: ['slow'], hit: 100, target: 'enemy', acc: 115 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 1]],
      // FF7: harmless until attacked. A physical attack on any Mandragora makes all of them use
      // Slow Dance (on the lowest HP) next turn; a magic attack makes them use Grass Punch.
      custom: function (e, b) {
        var v = e.vars, r = v.react || 0;
        if (!r && !v.fb && b.enemies().some(function (c) { return c.name === 'Mandragora' && c.hp < c.maxHp; })) { v.fb = true; r = 1; }
        v.react = 0;
        if (r === 1) return { move: 'slow_dance', target: 'lowest' };
        if (r === 2) return { move: 'grass_punch', target: 'random' };
        return { move: 'wait', target: 'self' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          if (kind !== 'phys' && kind !== 'mag') return null;
          b.enemies().forEach(function (c) { if (c.name === 'Mandragora' && c.vars) { c.vars.react = kind === 'mag' ? 2 : 1; c.vars.fb = true; } });
          return null;
        },
      },
    },
    desc: 'Walking root. Leave it alone and it leaves you alone.',
  },

  levrikon: {
    name: 'Levrikon',
    level: 14, hp: 200, mp: 0, exp: 65, ap: 7, gil: 128,
    atk: 38, def: 40, defPct: 5, mat: 6, mdf: 12, dex: 60, lck: 4,
    elem: {}, immune: [],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [{ item: 'ether', chance: 14 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'bird', variant: 1, c1: '#c86a3a', c2: '#f0d890', c3: '#202020', size: 1.1 },
    attacks: {
      bird_kick: { name: 'Bird Kick', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 108 },
      flaming_peck: { name: 'Flaming Peck', kind: 'phys', power: 32, element: 'hit', add: ['fury'], hit: 7, target: 'enemy', acc: 95 },
    },
    ai: { moves: [['bird_kick', 75], ['flaming_peck', 25]] },
    desc: 'Big-footed bird of the Chocobo Farm plains.',
  },

  midgar_zolom: {
    name: 'Midgar Zolom',
    level: 26, hp: 4000, mp: 348, exp: 250, ap: 25, gil: 400,
    atk: 120, def: 90, defPct: 2, mat: 40, mdf: 70, dex: 54, lck: 1,
    elem: {},
    immune: ['death', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'paralysis'],
    drops: [], steal: [],
    morph: 'x_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'serpent', c1: '#3a5a4a', c2: '#c8b070', c3: '#ff2020', size: 3 },
    attacks: {
      bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 110, silent: true },
      // Removes the target from the battle (counts as having escaped; max twice per battle).
      blown_away: { name: 'Blown Away', kind: 'special', special: 'blowAway', target: 'enemy', silent: true },
      beta: { name: 'Beta', kind: 'mag', power: 54, element: 'fire', target: 'allEnemies', mp: 35, eskill: 'beta' },
      change: { name: 'Change', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['bite', 1]],
      // FF7: rears up below 3/4 HP, flings someone away below 1/2 HP and breathes Beta (once)
      // below 3/8 HP (these are counters in FF7). Standing, it bites 2-4 times between
      // chances to blow someone away.
      custom: function (e, b) {
        var v = e.vars;
        if (v.blow === undefined) { v.blow = 2; v.c = 0; }
        if (e.hpPct <= 37.5 && !v.beta && e.mp >= 35) { v.beta = true; return { move: 'beta', target: 'all' }; }
        if (e.hpPct <= 75 && !v.stand) { v.stand = true; return { move: 'change', target: 'self' }; }
        if (!v.stand) return { move: 'bite', target: 'random' };
        if (v.c < 3) { v.c++; return { move: 'bite', target: 'random' }; }
        v.c = b.rnd(2);
        if (b.rnd(8) === 0 && v.blow > 0) { v.blow--; return { move: 'blown_away', target: 'random' }; }
        return { move: 'bite', target: 'random' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          var v = e.vars;
          if (kind === 'death') return null;
          if (v.blow === undefined) { v.blow = 2; v.c = 0; }
          if (e.hpPct <= 37.5 && !v.beta && e.mp >= 35) { v.beta = true; return { move: 'beta', target: 'all' }; }
          if (e.hpPct <= 50 && !v.flung) {
            v.flung = true;
            if (v.blow === 2 && src) { v.blow--; return { move: 'blown_away', target: src }; }
          }
          if (e.hpPct <= 75 && !v.stand) { v.stand = true; return { move: 'change', target: 'self' }; }
          return null;
        },
      },
    },
    desc: 'Giant serpent of the marsh south of Kalm. Ride a chocobo to cross safely. Learn Beta from it.',
  },

  chocobo: {
    name: 'Chocobo',
    level: 13, hp: 130, mp: 13, exp: 10, ap: 1, gil: 1,
    atk: 13, def: 40, defPct: 1, mat: 52, mdf: 26, dex: 101, lck: 0,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front', chocobo: true,
    look: { type: 'bird', c1: '#f0d040', c2: '#f8f0c0', c3: '#202020', size: 1.1 },
    attacks: {
      wark: { name: 'Wark! Wark!', kind: 'special', special: 'flee', target: 'self' },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      goes_nuts: { name: 'Chocobo, goes nuts', kind: 'phys', power: 16, element: 'punch', target: 'enemy', acc: 95, silent: true },
      chocobuckle: { name: 'Chocobuckle', kind: 'special', special: 'chocobuckle', target: 'enemy', mp: 3, eskill: 'chocobuckle', thenFlee: true },
    },
    ai: {
      moves: [['wait', 1], ['wark', 1]],
      // FF7: runs away (1/2 per turn, less after being fed greens) or when attacked; it is caught
      // when every other enemy is defeated (engine: Chocobo Lure capture).
      custom: function (e, b) {
        var v = e.vars;
        if (!v.t1) { v.t1 = true; return { move: 'wait', target: 'self' }; }
        if (v.busy > 0) { v.busy--; return { move: 'wait', target: 'self' }; }   // (still eating its greens)
        return b.rnd(v.runChance || 2) === 0 ? { move: 'wark', target: 'self' } : { move: 'wait', target: 'self' };
      },
      // FF7 Counter - General (Enemy Mechanics FAQ, Enemy-Skill FAQ): an item (greens) never scares it; any other
      // hit makes it run ("Wark! Wark!"), and when it ate Mimett or Sylkis Greens this battle and the hit left it
      // at [Max HP / 32] + 1 HP or less without killing it, it first uses Chocobuckle on the attacker
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death') return src ? { move: 'goes_nuts', target: src } : null;
          if (kind !== 'phys' && kind !== 'mag') return null;
          var v = e.vars || (e.vars = {});
          if (v.buckle && src && e.hp > 0 && e.hp <= Math.floor(e.maxHp / 32) + 1) return { move: 'chocobuckle', target: src };
          return { move: 'wark', target: 'self' };
        },
      },
    },
    desc: 'Wild chocobo (Grasslands, Lv13). Needs Chocobo Lure materia to appear.',
  },

  chocobo_b: {
    name: 'Chocobo',
    level: 16, hp: 160, mp: 16, exp: 10, ap: 1, gil: 1,
    atk: 13, def: 40, defPct: 1, mat: 52, mdf: 26, dex: 101, lck: 0,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front', chocobo: true,
    look: { type: 'bird', c1: '#f0d040', c2: '#f8f0c0', c3: '#202020', size: 1.1 },
    attacks: {
      wark: { name: 'Wark! Wark!', kind: 'special', special: 'flee', target: 'self' },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      goes_nuts: { name: 'Chocobo, goes nuts', kind: 'phys', power: 16, element: 'punch', target: 'enemy', acc: 95, silent: true },
      chocobuckle: { name: 'Chocobuckle', kind: 'special', special: 'chocobuckle', target: 'enemy', mp: 3, eskill: 'chocobuckle', thenFlee: true },
    },
    ai: {
      moves: [['wait', 1], ['wark', 1]],
      custom: function (e, b) {
        var v = e.vars;
        if (!v.t1) { v.t1 = true; return { move: 'wait', target: 'self' }; }
        if (v.busy > 0) { v.busy--; return { move: 'wait', target: 'self' }; }   // (still eating its greens)
        return b.rnd(v.runChance || 2) === 0 ? { move: 'wark', target: 'self' } : { move: 'wait', target: 'self' };
      },
      // FF7 Counter - General (Enemy Mechanics FAQ, Enemy-Skill FAQ): an item (greens) never scares it; any other
      // hit makes it run ("Wark! Wark!"), and when it ate Mimett or Sylkis Greens this battle and the hit left it
      // at [Max HP / 32] + 1 HP or less without killing it, it first uses Chocobuckle on the attacker
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death') return src ? { move: 'goes_nuts', target: src } : null;
          if (kind !== 'phys' && kind !== 'mag') return null;
          var v = e.vars || (e.vars = {});
          if (v.buckle && src && e.hp > 0 && e.hp <= Math.floor(e.maxHp / 32) + 1) return { move: 'chocobuckle', target: src };
          return { move: 'wark', target: 'self' };
        },
      },
    },
    desc: 'Wild chocobo (Grasslands, Lv16).',
  },

  chocobo_c: {
    name: 'Chocobo',
    level: 19, hp: 190, mp: 30, exp: 10, ap: 1, gil: 1,
    atk: 13, def: 40, defPct: 1, mat: 52, mdf: 26, dex: 101, lck: 0,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front', chocobo: true,
    look: { type: 'bird', c1: '#f0d040', c2: '#f8f0c0', c3: '#202020', size: 1.1 },
    attacks: {
      wark: { name: 'Wark! Wark!', kind: 'special', special: 'flee', target: 'self' },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      goes_nuts: { name: 'Chocobo, goes nuts', kind: 'phys', power: 16, element: 'punch', target: 'enemy', acc: 95, silent: true },
      chocobuckle: { name: 'Chocobuckle', kind: 'special', special: 'chocobuckle', target: 'enemy', mp: 3, eskill: 'chocobuckle', thenFlee: true },
    },
    ai: {
      moves: [['wait', 1], ['wark', 1]],
      custom: function (e, b) {
        var v = e.vars;
        if (!v.t1) { v.t1 = true; return { move: 'wait', target: 'self' }; }
        if (v.busy > 0) { v.busy--; return { move: 'wait', target: 'self' }; }   // (still eating its greens)
        return b.rnd(v.runChance || 2) === 0 ? { move: 'wark', target: 'self' } : { move: 'wait', target: 'self' };
      },
      // FF7 Counter - General (Enemy Mechanics FAQ, Enemy-Skill FAQ): an item (greens) never scares it; any other
      // hit makes it run ("Wark! Wark!"), and when it ate Mimett or Sylkis Greens this battle and the hit left it
      // at [Max HP / 32] + 1 HP or less without killing it, it first uses Chocobuckle on the attacker
      counter: {
        custom: function (e, b, src, kind) {
          if (kind === 'death') return src ? { move: 'goes_nuts', target: src } : null;
          if (kind !== 'phys' && kind !== 'mag') return null;
          var v = e.vars || (e.vars = {});
          if (v.buckle && src && e.hp > 0 && e.hp <= Math.floor(e.maxHp / 32) + 1) return { move: 'chocobuckle', target: src };
          return { move: 'wark', target: 'self' };
        },
      },
    },
    desc: 'Wild chocobo (Junon Area, Lv19).',
  },

  // ===========================================================================================
  // Mythril Mine
  // ===========================================================================================
  madouge: {
    name: 'Madouge',
    level: 16, hp: 220, mp: 0, exp: 70, ap: 8, gil: 150,
    atk: 36, def: 22, defPct: 6, mat: 4, mdf: 26, dex: 56, lck: 3,
    elem: {}, immune: [],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [{ item: 'grand_glove', chance: 14 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 3, c1: '#7a6a5a', c2: '#3a3a3a', c3: '#ffd040', size: 1.1 },
    attacks: {
      ironball: { name: 'Ironball', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 115, silent: true },
      swamp_shoot: { name: 'Swamp Shoot', kind: 'phys', power: 4, element: 'hit', add: ['darkness'], hit: 100, target: 'enemy' },
    },
    // FF7: 3/4 Ironball from the front row, 3/4 Swamp Shoot from the back row.
    ai: { moves: [['ironball', 75], ['swamp_shoot', 25]] },
    desc: 'Mole-man swinging an iron ball.',
  },

  crawler: {
    name: 'Crawler',
    level: 15, hp: 140, mp: 48, exp: 56, ap: 6, gil: 65,
    atk: 28, def: 10, defPct: 5, mat: 38, mdf: 32, dex: 36, lck: 2,
    elem: { earth: 2, ice: 0.5 }, immune: [],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'worm', variant: 1, c1: '#6a8aa0', c2: '#d0e0f0', c3: '#ff4040', size: 1 },
    attacks: {
      bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
      cold_breath: { name: 'Cold Breath', kind: 'mag', power: 1, element: 'ice', target: 'enemy', mp: 2 },
    },
    ai: { moves: [['bite', 50], ['cold_breath', 50]] },
    desc: 'Cave larva of the Mythril Mine.',
  },

  ark_dragon: {
    name: 'Ark Dragon',
    level: 18, hp: 280, mp: 124, exp: 84, ap: 10, gil: 180,
    atk: 56, def: 50, defPct: 5, mat: 18, mdf: 130, dex: 61, lck: 7,
    elem: { wind: 2, earth: 0, fire: -1 }, immune: ['stop', 'frog', 'paralysis'],
    drops: [{ item: 'phoenix_down', chance: 14 }, { item: 'ether', chance: 5 }],
    steal: [{ item: 'ether', chance: 52 }],
    morph: 'phoenix_down',
    boss: false, flying: true, row: 'front',
    look: { type: 'dragon', c1: '#8a3a2a', c2: '#e0a060', c3: '#ffe040', size: 1.4 },
    attacks: {
      claw: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
      flame_thrower: { name: 'Flame Thrower', kind: 'mag', power: 14, element: 'fire', target: 'enemy', mp: 10, eskill: 'flame_thrower' },
    },
    ai: {
      moves: [['flame_thrower', 75], ['claw', 25]],
      custom: function (e, b) {
        if (b.rnd(4) === 0 || e.mp < 10) return { move: 'claw', target: 'random' };
        var p = b.party(), t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        return { move: 'flame_thrower', target: t || 'random' };
      },
    },
    desc: 'Small dragon of the Mythril Mine. Absorbs fire. Learn Flame Thrower from it.',
  },

  castanets: {
    name: 'Castanets',
    level: 15, hp: 190, mp: 0, exp: 65, ap: 7, gil: 113,
    atk: 26, def: 76, defPct: 3, mat: 2, mdf: 4, dex: 49, lck: 2,
    elem: { fire: 2 }, immune: [],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'crab', variant: 2, c1: '#b04a2a', c2: '#f0c090', c3: '#40e0ff', size: 1 },
    attacks: {
      two_stage_attack: { name: '2-stage Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
      scissor_spark: { name: 'Scissor Spark', kind: 'phys', power: 22, element: 'lightning', target: 'enemy', acc: 75 },
    },
    ai: { moves: [['two_stage_attack', 50], ['scissor_spark', 50]] },
    desc: 'Crustacean with electric pincers. Weak against fire.',
  },

  // ===========================================================================================
  // World map: Junon Area (grass / dirt / forest / beach, Fort Condor region)
  // ===========================================================================================
  hell_rider_vr2: {
    name: 'Hell Rider VR2',
    level: 18, hp: 350, mp: 50, exp: 72, ap: 8, gil: 130,
    atk: 76, def: 46, defPct: 1, mat: 5, mdf: 60, dex: 60, lck: 0,
    elem: { gravity: 0.5 },
    immune: ['death', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'hi_potion', chance: 52 }],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 1, c1: '#2a3a6a', c2: '#a0a8b8', c3: '#ff3020', size: 1.2 },
    attacks: {
      iron_mallet: { name: 'Iron Mallet', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      ballistic: { name: 'Ballistic', kind: 'phys', power: 24, element: 'hit', target: 'enemy', acc: 95, silent: true },
      // Swaps the front and back rows of the whole party.
      electromag: { name: 'Electromag', kind: 'special', special: 'changeRow', target: 'allEnemies', acc: 255 },
    },
    ai: {
      moves: [['iron_mallet', 50], ['ballistic', 50]],
      custom: function (e, b) {
        if (!e.vars.opened) { e.vars.opened = true; return { move: 'electromag', target: 'all' }; }
        return { move: b.rnd(2) ? 'iron_mallet' : 'ballistic', target: 'random' };
      },
    },
    desc: 'Shinra motorbike trooper patrolling the roads near Junon.',
  },

  zemzelett: {
    name: 'Zemzelett',
    level: 17, hp: 285, mp: 36, exp: 70, ap: 7, gil: 165,
    atk: 30, def: 50, defPct: 1, mat: 30, mdf: 50, dex: 58, lck: 0,
    elem: { wind: 2, earth: 0, water: 0, gravity: 0 },
    immune: ['confusion', 'stop', 'frog', 'small', 'berserk', 'paralysis'],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [],
    morph: 'hi_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'bird', variant: 2, c1: '#4a6aa0', c2: '#e0e8f0', c3: '#ffd040', size: 1.2 },
    attacks: {
      flap: { name: 'Flap', kind: 'phys', power: 11, element: 'wind', target: 'allEnemies', silent: true },
      thunderbolt: { name: 'Thunderbolt', kind: 'mag', power: 15, element: 'lightning', target: 'enemy', mp: 4, acc: 75 },
      // Never used on its own in FF7 - learnable only when it is Manipulated.
      white_wind: { name: 'White Wind', kind: 'special', special: 'white_wind', element: 'restorative', target: 'allAllies', mp: 34, eskill: 'white_wind',
        remove: ['sleep', 'poison', 'confusion', 'silence', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'paralysis', 'darkness'] },
      take_off: { name: 'Take Off', kind: 'special', special: 'nothing', target: 'self', silent: true },
      land: { name: 'Land', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['flap', 50], ['thunderbolt', 25], ['take_off', 25]],
      // FF7: switches between the ground and the air (airborne: Def -30, Evade +10, can't be reached
      // by short-range attacks). Opens each phase with Flap (ground) or Thunderbolt (air).
      custom: function (e, b) {
        var v = e.vars, r = b.rnd(4);
        if (!v.first) { v.first = true; return v.air ? { move: 'thunderbolt', target: 'random' } : { move: 'flap', target: 'all' }; }
        if (r === 0) {
          v.first = false;
          if (!v.air) { v.air = true; e.def -= 30; e.defPct += 10; e.cantReach = true; return { move: 'take_off', target: 'self' }; }
          v.air = false; e.def += 30; e.defPct -= 10; e.cantReach = false;
          return { move: 'land', target: 'self' };
        }
        if (r === 1 && e.mp >= 4) return { move: 'thunderbolt', target: 'random' };
        return { move: 'flap', target: 'all' };
      },
    },
    desc: 'Great flying fish-bird of the Junon plains. Learn White Wind by Manipulating it.',
  },

  nerosuferoth: {
    name: 'Nerosuferoth',
    level: 16, hp: 150, mp: 20, exp: 53, ap: 5, gil: 146,
    atk: 23, def: 34, defPct: 1, mat: 5, mdf: 24, dex: 53, lck: 0,
    elem: {}, immune: [],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'bird', c1: '#2a2a34', c2: '#8a6ab0', c3: '#ff3020', size: 1 },
    attacks: {
      beak: { name: 'Beak', kind: 'phys', power: 16, element: 'punch', target: 'enemy', acc: 103, silent: true },
      heatwing: { name: 'Heatwing', kind: 'mag', power: 16, element: 'fire', target: 'enemy', mp: 4, acc: 255 },
    },
    ai: {
      moves: [['beak', 75], ['heatwing', 25]],
      // FF7: uses Heatwing more often the more it is hurt.
      custom: function (e, b) {
        if (!e.vars.opened) { e.vars.opened = true; return { move: 'beak', target: 'random' }; }
        var n = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : 1;
        return { move: (b.rnd(4) < n && e.mp >= 4) ? 'heatwing' : 'beak', target: 'random' };
      },
    },
    desc: 'Black bird of the Junon coast.',
  },

  formula: {
    name: 'Formula',
    level: 16, hp: 240, mp: 100, exp: 65, ap: 7, gil: 120,
    atk: 16, def: 36, defPct: 1, mat: 5, mdf: 32, dex: 57, lck: 0,
    elem: { wind: 2, earth: 0 }, immune: ['stop', 'frog', 'manipulate', 'paralysis'],
    drops: [{ item: 'hi_potion', chance: 14 }],
    steal: [{ item: 'boomerang', chance: 14 }],
    morph: 'speed_drink',
    boss: false, flying: true, row: 'front',
    look: { type: 'bird', variant: 3, c1: '#c0c8d0', c2: '#3a6ac0', c3: '#ff4040', size: 1 },
    attacks: {
      air_bomber: { name: 'Air Bomber', kind: 'mag', power: 16, element: 'wind', target: 'enemy', mp: 5, acc: 115, silent: true },
      blue_impulse: { name: 'Blue Impulse', kind: 'mag', power: 10, element: 'wind', target: 'allEnemies', mp: 18, acc: 105 },
      cross_impulse: { name: 'Cross Impulse', kind: 'mag', power: 14, element: 'wind', target: 'allEnemies', mp: 26, acc: 125 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['air_bomber', 75], ['blue_impulse', 25]],
      custom: function (e, b) {
        var v = e.vars;
        if (v.c === undefined) v.c = b.rnd(4);
        if (v.c < 3) {
          v.c++;
          return e.mp >= 5 ? { move: 'air_bomber', target: 'random' } : { move: 'wait', target: 'self' };
        }
        v.c = b.rnd(3);
        if (e.hpPct <= 60 && e.mp >= 26) return { move: 'cross_impulse', target: 'all' };
        if (e.mp >= 18) return { move: 'blue_impulse', target: 'all' };
        return e.mp >= 5 ? { move: 'air_bomber', target: 'random' } : { move: 'wait', target: 'self' };
      },
    },
    desc: 'Aerial creature that attacks with gusts of wind.',
  },

  capparwire: {
    name: 'Capparwire',
    level: 15, hp: 210, mp: 20, exp: 60, ap: 6, gil: 103,
    atk: 16, def: 38, defPct: 1, mat: 0, mdf: 10, dex: 42, lck: 0,
    elem: {}, immune: [],
    drops: [{ item: 'potion', chance: 14 }],
    steal: [{ item: 'ether', chance: 14 }],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'machine', variant: 3, c1: '#8a7a5a', c2: '#d0c0a0', c3: '#40ff80', size: 0.9 },
    attacks: {
      wire_attack: { name: 'Wire Attack', kind: 'mag', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      grand_spark: { name: 'Grand Spark', kind: 'mag', power: 24, element: 'hit', target: 'enemy' },
    },
    ai: { moves: [['wire_attack', 50], ['grand_spark', 50]] },
    desc: 'Wire-limbed creature of the Junon forests and beaches.',
  },

  mystery_ninja: {
    name: 'Mystery Ninja',
    // FF7 scales her with Cloud's level (Lv17 / 22 / 27 / 32 / 37 / 42); this is the Lv17 form
    // (Cloud Lv1-20). After the battle the Yuffie recruitment scene plays.
    level: 17, hp: 600, mp: 117, exp: 160, ap: 20, gil: 400,
    atk: 50, def: 56, defPct: 9, mat: 30, mdf: 30, dex: 50, lck: 20,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'berserk', 'peerless'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front',
    look: { type: 'humanoid', variant: 1, c1: '#4a7a3a', c2: '#f0d0b0', c3: '#2a2a2a', size: 1 },
    attacks: {
      fight: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', target: 'enemy', acc: 95, silent: true },
      fire_fang: { name: 'Fire Fang', kind: 'phys', power: 11, element: 'fire', target: 'allEnemies', acc: 95, silent: true },
      spider_web: { name: 'Spider Web', kind: 'status', add: ['slow'], hit: 100, target: 'enemy', acc: 95, silent: true },
      impaler: { name: 'Impaler', kind: 'status', add: ['frog'], hit: 100, target: 'enemy', acc: 95, silent: true },
      throw_escape: { name: 'Throw', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['fight', 50], ['fire_fang', 25], ['spider_web', 13], ['impaler', 12]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        v.n = (v.n || 0) + 1;
        if (!v.opened) { v.opened = true; return { move: 'fire_fang', target: 'all' }; }
        if (v.n > 10) return { move: 'throw_escape', target: 'self' };
        var r = b.rnd(8), l;
        if (r === 0) { l = p.filter(function (c) { return !b.has(c, 'slow'); }); if (l.length) return { move: 'spider_web', target: b.pick(l) }; }
        if (r === 1) { l = p.filter(function (c) { return !b.has(c, 'frog'); }); if (l.length) return { move: 'impaler', target: b.pick(l) }; }
        if (r <= 3) return { move: 'fire_fang', target: 'all' };
        return { move: 'fight', target: 'random' };
      },
    },
    desc: 'A mysterious young ninja lurking in the forests. Runs off if the fight drags on.',
  },

  cmdgrand_horn: {
    name: 'CMD.Grand Horn',
    level: 19, hp: 2000, mp: 100, exp: 200, ap: 20, gil: 2400,
    atk: 40, def: 30, defPct: 5, mat: 20, mdf: 32, dex: 57, lck: 10,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'peerless'],
    drops: [{ item: 'vagyrisk_claw', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'giant', c1: '#6a4a3a', c2: '#d8c8a0', c3: '#ff3020', size: 2 },
    attacks: {
      punch: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      poison_breath: { name: 'Poison Breath', kind: 'mag', power: 12, element: 'poison', add: ['poison'], hit: 83, target: 'enemy', mp: 10, acc: 90 },
      grand_attack: { name: 'Grand Attack', kind: 'phys', power: 11, element: 'shoot', target: 'allEnemies' },
    },
    ai: {
      moves: [['punch', 75], ['poison_breath', 15], ['grand_attack', 10]],
      // FF7: three Punches then a chance of Poison Breath; below half HP it may
      // switch to Grand Attack.
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0;
        if (e.hpPct <= 50 && !v.ga && b.rnd(2) === 0) v.c = c = 4;
        v.ga = false;
        if (c <= 2) { v.c = c + 1; return { move: 'punch', target: 'random' }; }
        v.c = 0;
        if (c === 4) { v.ga = true; return { move: 'grand_attack', target: 'all' }; }
        var ok = b.party().filter(function (x) { return !b.has(x, 'poison'); });
        if (ok.length && b.rnd(2) && e.mp >= 10) return { move: 'poison_breath', target: b.pick(ok) };
        return { move: 'punch', target: 'random' };
      },
    },
    desc: 'Commander of the Shinra army attacking Fort Condor (fought if the defence line falls).',
  },

  cmdgrand_horn_b: {
    name: 'CMD.Grand Horn',
    level: 25, hp: 4000, mp: 200, exp: 400, ap: 40, gil: 4800,
    atk: 60, def: 50, defPct: 5, mat: 50, mdf: 62, dex: 67, lck: 20,
    elem: {},
    immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'peerless'],
    drops: [], steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'giant', variant: 1, c1: '#5a3a4a', c2: '#d8c8a0', c3: '#ff3020', size: 2.1 },
    attacks: {
      punch: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', acc: 95, silent: true },
      poison_breath: { name: 'Poison Breath', kind: 'mag', power: 12, element: 'poison', add: ['poison'], hit: 83, target: 'enemy', mp: 10, acc: 90 },
      grand_attack: { name: 'Grand Attack', kind: 'phys', power: 11, element: 'shoot', target: 'allEnemies' },
    },
    ai: {
      moves: [['punch', 60], ['poison_breath', 25], ['grand_attack', 15]],
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        var ok = p.filter(function (x) { return !b.has(x, 'poison'); });
        if (ok.length && e.mp >= 10) return { move: 'poison_breath', target: b.pick(ok) };
        var c = v.c || 0;
        if (c <= 2) {
          v.c = c + 1;
          var ps = p.filter(function (x) { return b.has(x, 'poison'); });
          return { move: 'punch', target: ps.length ? b.pick(ps) : 'random' };
        }
        v.c = 0;
        return { move: 'grand_attack', target: 'all' };
      },
    },
    desc: 'Stronger Fort Condor commander (later Fort Condor battles, higher party level).',
  },

  // ===========================================================================================
  // Junon: Bottomswell (beach below Junon)
  // ===========================================================================================
  bottomswell: {
    name: 'Bottomswell',
    level: 23, hp: 2500, mp: 100, exp: 550, ap: 52, gil: 1000,
    atk: 42, def: 36, defPct: 1, mat: 30, mdf: 96, dex: 69, lck: 0,
    elem: { wind: 2, gravity: 0.5, earth: 0 },
    immune: ['death', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
      'manipulate', 'berserk', 'paralysis'],
    drops: [{ item: 'power_wrist', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: true, row: 'front', cantReach: true,
    look: { type: 'fish', variant: 2, c1: '#3a6a9a', c2: '#e0c070', c3: '#ff3020', size: 2.6 },
    attacks: {
      bodyblow: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', acc: 90, silent: true },
      tail_attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 90 },
      // FF7 strikes each party member in turn (no damage split).
      tail_attack_all: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'allEnemies', acc: 90 },
      moonstrike: { name: 'Moonstrike', kind: 'phys', power: 20, element: 'hit', target: 'enemy', acc: 90 },
      moonstrike_all: { name: 'Moonstrike', kind: 'phys', power: 20, element: 'hit', target: 'allEnemies', acc: 90 },
      // Traps the target in a Waterpolo (acts like Paralysis and drains HP); break the bubble to free them.
      waterball: { name: 'Waterball', kind: 'status', add: ['imprisoned'], hit: 100, target: 'enemy', summon: 'waterpolo', silent: true },
      big_wave: { name: 'Big Wave', kind: 'phys', power: 20, element: 'water', target: 'allEnemies' },
      fury_blast: { name: 'Fury Blast', kind: 'special', special: 'nothing', target: 'self', silent: true },
      chill: { name: 'Chill', kind: 'special', special: 'nothing', target: 'self', silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['tail_attack', 60], ['bodyblow', 30], ['big_wave', 10]],
      // FF7: form 1 (Tail Attack / Bodyblow); after 6 hits (or any hit once below 3/4 HP) it flies
      // into a fury (form 2: Moonstrike / Bodyblow); after 3 more hits (or below 1/2 HP) it traps
      // people in Waterpolos and casts Big Wave (form 3). Above those HP marks it calms down again.
      // Final attack: Big Wave.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.form === undefined) { v.form = 1; v.c = 0; v.hits = 6; }
        var st = e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
        if (!v.ctrOk && v.form === 1 && st > 0) { v.form = st === 2 ? 3 : 2; v.c = 0; }
        var t = p[0];
        p.forEach(function (c) { if (c.hp > t.hp) t = c; });
        if (v.form === 1) {
          if (v.c < 3) { v.c++; return { move: 'tail_attack', target: 'random' }; }
          v.c = 0;
          return b.rnd(3) === 0 ? { move: 'tail_attack_all', target: 'all' } : { move: 'bodyblow', target: t || 'random' };
        }
        if (v.form === 2) {
          if (v.c === 0) { v.c = 1; return { move: 'moonstrike_all', target: 'all' }; }
          if (v.c === 1) { v.c = 2; return { move: 'bodyblow', target: t || 'random' }; }
          if (v.c === 2) { v.c = 3; return { move: 'moonstrike', target: 'random' }; }
          if (st < 1) { v.form = 1; v.c = 0; v.hits = 6; return { move: 'fury_blast', target: 'self' }; }
          v.c = b.rnd(2);
          return { move: 'moonstrike', target: 'random' };
        }
        if (v.c === 0) {
          v.c = 1;
          var free = p.filter(function (c) { return !b.has(c, 'imprisoned'); });
          return free.length > 1 ? { move: 'waterball', target: b.pick(free) } : { move: 'wait', target: 'self' };
        }
        if (v.c <= 2) { v.c++; return { move: 'wait', target: 'self' }; }
        if (v.c === 3) {
          if (st < 2) { v.form = 1; v.c = 0; v.hits = 6; return { move: 'chill', target: 'self' }; }
          v.c = 4;
          return { move: 'big_wave', target: 'all' };
        }
        v.c = p.some(function (c) { return b.has(c, 'imprisoned'); }) ? 1 : 0;
        return { move: 'wait', target: 'self' };
      },
      counter: {
        custom: function (e, b, src, kind) {
          var v = e.vars;
          if (kind === 'death') return { move: 'big_wave', target: 'all' };
          if (v.form === undefined) { v.form = 1; v.c = 0; v.hits = 6; }
          v.ctrOk = true;
          var st = e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (st > 0) v.hits = 0;
          if (v.form === 3) return null;
          if (v.hits > 0) { v.hits--; return null; }
          v.form = (v.form === 1 && st < 2) ? 2 : 3;
          v.c = 0; v.hits = v.form === 3 ? 3 : 6;
          return { move: 'fury_blast', target: 'self' };
        },
      },
    },
    desc: 'Sea monster that haunts the beach below Junon. Weak against wind.',
  },

  waterpolo: {
    name: 'Waterpolo',
    level: 4, hp: 40, mp: 0, exp: 10, ap: 0, gil: 0,
    atk: 1, def: 100, defPct: 1, mat: 1, mdf: 254, dex: 1, lck: 0,
    elem: { cut: 0, hit: 0, punch: 0, shoot: 0 },
    immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'regen',
      'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis', 'darkness'],
    drops: [], steal: [],
    morph: null,
    boss: false, flying: false, row: 'front', physImmune: true,
    look: { type: 'blob', variant: 1, c1: '#60a0e0', c2: '#c0e8ff', c3: '#ffffff', size: 1.1 },
    attacks: {
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
      vanish: { name: 'Vanish', kind: 'special', special: 'flee', target: 'self', silent: true },
    },
    ai: {
      moves: [['wait', 1]],
      custom: function (e, b) {
        var boss = b.enemies().some(function (c) { return c.name === 'Bottomswell'; });
        return { move: boss ? 'wait' : 'vanish', target: 'self' };
      },
    },
    desc: 'Water bubble trapping a party member. Immune to physical attacks - use magic.',
  },

  // ===========================================================================================
  // Cargo ship to Costa del Sol
  // ===========================================================================================
  scrutin_eye: {
    name: 'Scrutin Eye',
    level: 15, hp: 240, mp: 60, exp: 80, ap: 8, gil: 120,
    atk: 20, def: 20, defPct: 16, mat: 5, mdf: 96, dex: 36, lck: 0,
    elem: { wind: 2, earth: 0, water: 0 }, immune: ['stop', 'frog', 'paralysis'],
    drops: [{ item: 'ether', chance: 5 }],
    steal: [{ item: 'ether', chance: 52 }],
    morph: 'turbo_ether',
    boss: false, flying: true, row: 'front',
    look: { type: 'eye', c1: '#c0c8b0', c2: '#6a3a8a', c3: '#ff2020', size: 1 },
    attacks: {
      drilldrive: { name: 'Drilldrive', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
      fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', target: 'enemy', mp: 22 },
      ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
    },
    ai: {
      moves: [['drilldrive', 50], ['fire2', 25], ['ice2', 25]],
      custom: function (e, b) {
        var r = b.rnd(4);
        if (r < 2 && e.mp >= 22) return { move: r ? 'fire2' : 'ice2', target: 'random' };
        return { move: 'drilldrive', target: 'random' };
      },
    },
    desc: 'Floating eye stowed away in the ship\'s hold.',
  },

  marine: {
    name: 'Marine',
    level: 16, hp: 300, mp: 20, exp: 75, ap: 8, gil: 150,
    atk: 36, def: 30, defPct: 10, mat: 5, mdf: 60, dex: 59, lck: 0,
    elem: {}, immune: [],
    drops: [{ item: 'eye_drop', chance: 100 }],
    steal: [{ item: 'shinra_beta', chance: 14 }],
    morph: 'x_potion',
    boss: false, flying: false, row: 'front',
    look: { type: 'soldier', variant: 1, c1: '#2a4a8a', c2: '#e8e8f0', c3: '#ffd040', size: 1 },
    attacks: {
      machine_gun: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
      grenade: { name: 'Grenade', kind: 'phys', power: 13, target: 'allEnemies', acc: 85 },
      smoke_bullet: { name: 'Smoke Bullet', kind: 'status', add: ['sleep', 'darkness'], hit: 99, target: 'enemy', acc: 75, silent: true },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['machine_gun', 70], ['smoke_bullet', 20], ['grenade', 10]],
      // FF7: Smoke Bullet, three Machine Gun bursts, then (once below 2/3 HP) Grenades.
      custom: function (e, b) {
        var v = e.vars, c = v.c || 0;
        if (v.ammo === undefined) v.ammo = 4;
        if (c === 0) { v.c = 1; return { move: 'smoke_bullet', target: 'random' }; }
        if (c <= 3) { v.c = c + 1; return { move: 'machine_gun', target: 'random' }; }
        if (e.hpPct <= 200 / 3) {
          if (v.ammo > 0) { v.ammo--; v.c = 3; return { move: 'grenade', target: 'all' }; }
          v.c = 1;
          return { move: 'machine_gun', target: 'random' };
        }
        v.c = 0;
        return { move: 'wait', target: 'self' };
      },
    },
    desc: 'Shinra marine guarding the cargo ship.',
  },

  jenova_birth: {
    name: 'Jenova·BIRTH',
    level: 25, hp: 4000, mp: 110, exp: 680, ap: 64, gil: 800,
    atk: 38, def: 56, defPct: 1, mat: 30, mdf: 180, dex: 60, lck: 10,
    elem: { gravity: 0 },
    immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
      'death_sentence', 'manipulate', 'berserk', 'paralysis'],
    drops: [{ item: 'white_cape', chance: 100 }],
    steal: [],
    morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'custom', id: 'jenova_birth', c1: '#b04a6a', c2: '#e8c0d0', c3: '#6040ff', size: 2.6 },
    attacks: {
      laser: { name: 'Laser', kind: 'phys', power: 48, element: 'shoot', target: 'enemy', acc: 90, silent: true },
      // FF7 sometimes fires at every non-stopped party member in turn (no damage split).
      laser_all: { name: 'Laser', kind: 'phys', power: 48, element: 'shoot', target: 'allEnemies', acc: 90, silent: true },
      gas: { name: 'Gas', kind: 'phys', power: 48, target: 'enemy', acc: 90 },
      w_laser: { name: 'W-Laser', kind: 'phys', power: 48, element: 'shoot', target: 'enemy', acc: 90 },
      w_laser_all: { name: 'W-Laser', kind: 'phys', power: 48, element: 'shoot', target: 'allEnemies', acc: 90 },
      tail_laser: { name: 'Tail Laser', kind: 'phys', power: 32, element: 'shoot', target: 'allEnemies', acc: 90 },
      tail_laser_x2: { name: 'Tail Laser', kind: 'phys', power: 32, hits: 2, element: 'shoot', target: 'allEnemies', acc: 90 },
      stop: { name: 'Stop', kind: 'status', add: ['stop'], hit: 59, target: 'enemy', mp: 34 },
      wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true },
    },
    ai: {
      moves: [['laser', 30], ['tail_laser', 25], ['w_laser', 25], ['gas', 10], ['stop', 10]],
      // FF7 cycle: Stop (or Gas on a stopped ally), pause x2, Laser, Tail Laser (sometimes twice),
      // W-Laser, Gas - Lasers avoid stopped characters.
      custom: function (e, b) {
        var v = e.vars, p = b.party();
        if (v.c === undefined) v.c = b.rnd(2) ? 3 : 0;
        var stopped = p.filter(function (c) { return b.has(c, 'stop'); });
        var free = p.filter(function (c) { return !b.has(c, 'stop'); });
        function laser(m) {
          if (b.rnd(3) === 0 && free.length) return { move: m + '_all', target: free };
          return { move: m, target: free.length ? b.pick(free) : 'random' };
        }
        var c = v.c;
        if (c === 0) {
          v.c = 1;
          if (stopped.length) return { move: 'gas', target: b.pick(stopped) };
          if (e.mp >= 34) return { move: 'stop', target: 'random' };
          return { move: 'wait', target: 'self' };
        }
        if (c <= 2) { v.c++; return { move: 'wait', target: 'self' }; }
        if (c === 3) { v.c = 4; return laser('laser'); }
        if (c === 4) { v.c = 5; return { move: b.rnd(2) ? 'tail_laser_x2' : 'tail_laser', target: 'all' }; }
        if (c === 5) { v.c = 6; return laser('w_laser'); }
        v.c = 0;
        if (stopped.length) return { move: 'gas', target: b.pick(stopped) };
        if (b.rnd(3) === 0) return { move: 'gas', target: 'random' };
        return { move: 'wait', target: 'self' };
      },
    },
    desc: 'The creature Sephiroth left behind in the cargo hold - a part of Jenova.',
  },

});

// The wild chocobos of the other chocobo-track areas (Enemy Mechanics FAQ 3.2.1, chocobo encounters): the same
// bird at L22 (Gold Saucer and Rocket Town areas), L29 (Gold Saucer area), L30 (Wutai area), L33 (Icicle area) and
// L36 (Mideel area). HP = Lvl x 10, MP = 100 from L22 up; the stats, attacks and AI are the L13 chocobo's.
[[22, 'Gold Saucer / Rocket Town areas'], [29, 'Gold Saucer area'], [30, 'Wutai area'], [33, 'Icicle area'], [36, 'Mideel area']].forEach(function (lv) {
  var base = FF7.data.enemies.chocobo;
  FF7.data.enemies['chocobo_l' + lv[0]] = Object.assign({}, base, { level: lv[0], hp: lv[0] * 10, mp: 100, desc: 'Wild chocobo (' + lv[1] + ', Lv' + lv[0] + ').' });
});


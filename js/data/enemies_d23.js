// FF7 enemies — Disc 2 / Disc 3 segment (Icicle Inn -> end, plus late optional content).
// Source: Terence Fergusson's FF7 Enemy Mechanics FAQ (stats/AI), DynamixDJ's Enemies & Encounters
// FAQ (formations), Enemy Skill FAQ (learnable skills). Values are PS1/PC data.
// Drop/steal % = (FF7 chance class + 1) / 64. Attack power: 16 = 1.0x base.
// Encounter tables live in encounters_d23.js; see docs/enemies_d23.md for boss formations and hooks.
(function () {
  'use strict';

  // ---- small AI helpers (only use the documented b/e API; every helper is safe on empty lists) ----
  var U = {
    v: function (e) { if (!e.vars) e.vars = {}; return e.vars; },
    party: function (b) { return (b.party && b.party()) || []; },
    foes: function (b) { return (b.enemies && b.enemies()) || []; },
    one: function (b, n) { return n <= 1 || b.rnd(n) === 0; },            // FF7 "Rnd(1..n) == 1"
    pick: function (b, list) { return list && list.length ? b.pick(list) : 'random'; },
    without: function (b, st) { return U.party(b).filter(function (c) { return !b.has(c, st); }); },
    withSt: function (b, st) { return U.party(b).filter(function (c) { return b.has(c, st); }); },
    pickWithout: function (b, st) { var l = U.without(b, st); return l.length ? b.pick(l) : 'random'; },
    pickWith: function (b, st) { var l = U.withSt(b, st); return l.length ? b.pick(l) : 'random'; },
    lowest: function (b) { var p = U.party(b); return p.length ? b.lowestHp(p) : 'random'; },
    highest: function (b, list) {
      list = list || U.party(b);
      if (!list.length) return 'random';
      var best = list[0];
      list.forEach(function (c) { if ((c.hp || 0) > (best.hp || 0)) best = c; });
      return best;
    },
    highestMp: function (b) {
      var list = U.party(b);
      if (!list.length) return 'random';
      var best = list[0];
      list.forEach(function (c) { if ((c.mp || 0) > (best.mp || 0)) best = c; });
      return best;
    },
    // enemy data id of a combatant (engine is expected to expose it as c.id; fallbacks for safety)
    id: function (c) {
      if (!c) return null;
      var d = c.data || c.def || c.enemy || {};
      return c.id || c.enemyId || c.key || d.id || null;
    },
    // party member = character id? (Rude's aversion to Tifa, Sephiroth vs Cloud)
    isChar: function (c, ch) {
      if (!c) return false;
      var d = c.data || c.def || {};
      var n = (c.name || d.name || '').toLowerCase();
      return c.id === ch || c.charId === ch || c.char === ch || d.id === ch || n === ch;
    },
    count: function (b, id) { return U.foes(b).filter(function (c) { return U.id(c) === id; }).length; },
    find: function (b, id) { var l = U.foes(b).filter(function (c) { return U.id(c) === id; }); return l[0] || null; },
    // FF7 "SpclChance" table from current HP%: [<=25%, <=50%, <=75%, >75%]
    sc: function (e, t) { var p = e.hpPct; return p <= 25 ? t[0] : p <= 50 ? t[1] : p <= 75 ? t[2] : t[3]; },
    partyHpAvg: function (b) {
      var p = U.party(b); if (!p.length) return 1;
      var s = 0; p.forEach(function (c) { s += (c.hp || 0); });
      return s / p.length;
    }
  };

  // Standard immunity sets
  var BOSS_IMM = ['death', 'sleep', 'poison', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb',
    'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'];
  var MACH_IMM = ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'];
  var TURK_IMM = ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
    'death_sentence', 'manipulate', 'berserk', 'peerless'];
  function imm(base, extra) { return base.concat(extra || []); }

  // A silent "do nothing" turn (FF7 enemies often skip turns in their scripts)
  function idle(name) { return { name: name || '', kind: 'special', special: 'nothing', target: 'self', silent: !name }; }

  Object.assign(FF7.data.enemies, {

    // =====================================================================
    // ICICLE AREA (world map snowfields around Icicle Inn)
    // =====================================================================
    jumping: {
      name: 'Jumping', level: 24, hp: 999, mp: 0, exp: 400, ap: 30, gil: 50,
      atk: 30, def: 40, defPct: 15, mat: 15, mdf: 50, dex: 74, lck: 10,
      elem: {}, immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [], morph: 'antarctic_wind',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#e8e4d8', c2: '#3a3a48', c3: '#ffcc00', size: 0.9, variant: 2 },
      attacks: {
        dive_kick: { name: 'Dive Kick', kind: 'phys', power: 20, target: 'enemy' },
        club_sword: { name: 'Club Sword', kind: 'phys', power: 200, element: 'cut', target: 'enemy' }
      },
      ai: { moves: [['club_sword', 50], ['dive_kick', 50]] }
    },

    bandersnatch: {
      name: 'Bandersnatch', level: 30, hp: 860, mp: 100, exp: 510, ap: 40, gil: 600,
      atk: 68, def: 46, defPct: 1, mat: 25, mdf: 76, dex: 55, lck: 0,
      elem: { fire: 2, ice: 0.5 }, immune: ['confusion', 'frog', 'small', 'manipulate'],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [], morph: 'ice_crystal',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#dfe8f0', c2: '#8aa0b8', c3: '#40c0ff', size: 1.1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        bite: { name: 'Bite', kind: 'phys', power: 16, target: 'enemy', add: ['confusion'], hit: 75 },
        // Howling revives a fallen Bandersnatch (modelled as calling a new one in)
        howling: { name: 'Howling', kind: 'special', special: 'callHelp', summon: 'bandersnatch', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.n0 === undefined) { v.n0 = U.count(b, 'bandersnatch'); v.c = 0; }
          var t = U.pickWithout(b, 'confusion');
          if (v.c <= 2) { v.c++; return { move: 'attack', target: t }; }
          if (v.c === 3) {
            v.c = 4;
            if (U.one(b, 2) && U.without(b, 'confusion').length) return { move: 'bite', target: t };
            return { move: 'attack', target: t };
          }
          v.c = 0;
          if (v.n0 > 0 && U.count(b, 'bandersnatch') < v.n0 && U.one(b, 2)) return { move: 'howling', target: 'self' };
          return { move: 'attack', target: t };
        }
      }
    },

    // =====================================================================
    // GREAT GLACIER
    // =====================================================================
    ice_golem: {
      name: 'Ice Golem', level: 40, hp: 4000, mp: 300, exp: 1000, ap: 70, gil: 1500,
      atk: 100, def: 80, defPct: 10, mat: 70, mdf: 100, dex: 75, lck: 0,
      elem: { ice: -1 }, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [{ item: 'hi_potion', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'giant', c1: '#a8d8f0', c2: '#e8f8ff', c3: '#2060c0', size: 1.6 },
      attacks: {
        golem_punch: { name: 'Golem Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        cold_snap: { name: 'Cold Snap', kind: 'phys', power: 16, element: 'ice', target: 'enemy' },
        wide_grazer: { name: 'Wide Grazer', kind: 'mag', power: 15, element: 'lightning', mp: 15, target: 'allEnemies' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = (v.c || 0) + 1;
          if (v.c === 1) return e.hpPct < 50 ? { move: 'wide_grazer', target: 'all' } : { move: 'cold_snap', target: 'random' };
          if (v.c === 2) return { move: 'golem_punch', target: 'random' };
          if (v.c === 3) return { move: U.one(b, 2) ? 'golem_punch' : 'cold_snap', target: 'random' };
          v.c = 0; return { move: 'wide_grazer', target: 'all' };
        }
      }
    },

    shred: {
      name: 'Shred', level: 32, hp: 900, mp: 100, exp: 500, ap: 40, gil: 950,
      atk: 70, def: 66, defPct: 1, mat: 55, mdf: 120, dex: 55, lck: 0,
      elem: { fire: 2, wind: 2, ice: 0, earth: 0, water: 0 }, immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'ether', chance: 5 }], steal: [], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'flyer', c1: '#c0d0e0', c2: '#606878', c3: '#ff4040', size: 1 },
      attacks: {
        attack: { name: 'Tail', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        crazy_claw: { name: 'Crazy Claw', kind: 'phys', power: 1, element: 'hit', target: 'enemy', add: ['berserk'], hit: 100 },
        cure3: { name: 'Cure3', kind: 'heal', power: 130, element: 'restorative', mp: 64, target: 'allAllies' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.cured && e.hpPct <= 25 && e.mp >= 64) { v.cured = 1; return { move: 'cure3', target: 'allies' }; }
          if (!v.cured) return { move: U.one(b, 3) ? 'crazy_claw' : 'attack', target: U.highest(b) };
          return { move: U.one(b, 2) ? 'crazy_claw' : 'attack', target: U.lowest(b) };
        }
      }
    },

    lessaloploth: {
      name: 'Lessaloploth', level: 34, hp: 2000, mp: 400, exp: 920, ap: 65, gil: 1000,
      atk: 65, def: 74, defPct: 12, mat: 67, mdf: 190, dex: 77, lck: 20,
      elem: { wind: 2, ice: 0, earth: 0, gravity: 0, water: 0 }, immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'phoenix_down', chance: 52 }], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'insect', c1: '#e0e8f0', c2: '#7080a0', c3: '#ffe060', size: 1.3 },
      attacks: {
        attack: { name: 'Wing Cut', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        scorpions_tail: { name: 'Scorpion\'s Tail', kind: 'phys', power: 16, target: 'enemy', add: ['poison'], hit: 75 },
        avalanche: { name: 'Avalanche', kind: 'phys', power: 60, element: 'ice', target: 'allEnemies' }
      },
      ai: {
        // never uses the same attack twice in a row
        custom: function (e, b) {
          var v = U.v(e), opts;
          if (!v.last) {
            var r = b.rnd(4);
            v.last = r === 0 ? 'attack' : r === 1 ? 'avalanche' : 'scorpions_tail';
          } else {
            opts = ['attack', 'avalanche', 'scorpions_tail'].filter(function (m) { return m !== v.last; });
            v.last = opts[b.rnd(2)];
          }
          return { move: v.last, target: v.last === 'avalanche' ? 'all' : 'random' };
        }
      }
    },

    frozen_nail: {
      name: 'Frozen Nail', level: 28, hp: 1300, mp: 100, exp: 520, ap: 50, gil: 800,
      atk: 67, def: 52, defPct: 5, mat: 65, mdf: 128, dex: 60, lck: 5,
      elem: {}, immune: [],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'crab', c1: '#b8c8e8', c2: '#405070', c3: '#ff8030', size: 1 },
      attacks: {
        attack: { name: 'Continu-claw', kind: 'phys', power: 16, element: 'cut', target: 'enemy' },
        flying_sickle: { name: 'Flying Sickle', kind: 'mag', power: 12, element: 'wind', mp: 8, target: 'enemy' }
      },
      ai: { moves: [['attack', 75], ['flying_sickle', 25]] }
    },

    snow: {
      name: 'Snow', level: 32, hp: 4000, mp: 160, exp: 500, ap: 42, gil: 700,
      atk: 50, def: 66, defPct: 1, mat: 80, mdf: 138, dex: 70, lck: 10,
      elem: { fire: 2, ice: -1 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'ice_crystal', chance: 14 }], steal: [{ item: 'circlet', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'ghost', c1: '#f4f8ff', c2: '#a0c0e8', c3: '#4080ff', size: 1.1 },
      attacks: {
        cold_breath: { name: 'Cold Breath', kind: 'mag', power: 6, element: 'ice', mp: 12, target: 'enemy' },
        fascination: { name: 'Fascination', kind: 'status', add: ['confusion'], hit: 100, mp: 5, target: 'enemy' },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', mp: 22, target: 'enemy' }
      },
      ai: {
        counter: { mag: 'fascination', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          // Ice2 retaliation once per 25% HP threshold (FF7: physical counter)
          var th = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (th > (v.th || 0)) { v.th = th; if (e.mp >= 22) return { move: 'ice2', target: 'random' }; }
          if (v.c < 3) { v.c++; return { move: 'cold_breath', target: U.pickWithout(b, 'confusion') }; }
          v.c = b.rnd(2);
          return { move: 'fascination', target: U.pickWithout(b, 'confusion') };
        }
      }
    },

    magnade: {
      name: 'Magnade', level: 35, hp: 1000, mp: 100, exp: 980, ap: 50, gil: 1200,
      atk: 134, def: 70, defPct: 5, mat: 60, mdf: 48, dex: 50, lck: 10,
      elem: { fire: 2, gravity: 2 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'phoenix_down', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#8090a8', c2: '#c0a040', c3: '#ff3030', size: 1.2, variant: 1 },
      attacks: {
        shield_throw: { name: 'Shield Throw', kind: 'phys', power: 6, target: 'enemy', silent: true },
        w_shield_throw: { name: 'W-Shield Throw', kind: 'phys', power: 12, target: 'enemy' },
        strong_kick: { name: 'Strong Kick', kind: 'phys', power: 10, target: 'enemy' }
      },
      ai: {
        // FF7: two shields give Df% 255 until 20-24 actions have been taken in battle; then Df% 5.
        // Approximated with its own turn count; e.defPct is updated for engines that read it live.
        custom: function (e, b) {
          var v = U.v(e);
          if (v.dur === undefined) { v.dur = 7 + b.rnd(2); v.c = b.rnd(5); }
          v.dur--;
          e.defPct = v.dur > 0 ? 255 : 5;
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.dur <= 0) return { move: 'strong_kick', target: 'random' };
          if (v.c < 4) { v.c = U.one(b, sc) ? 4 : v.c + 1; return { move: 'shield_throw', target: 'random' }; }
          v.c = 0; return { move: 'w_shield_throw', target: 'random' };
        }
      }
    },

    // =====================================================================
    // GAEA'S CLIFF
    // =====================================================================
    zolokalter: {
      name: 'Zolokalter', level: 30, hp: 950, mp: 90, exp: 700, ap: 60, gil: 700,
      atk: 70, def: 58, defPct: 3, mat: 50, mdf: 80, dex: 58, lck: 9,
      elem: { poison: -1 }, immune: [],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [], morph: 'antidote',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#80a050', c2: '#e0d0a0', c3: '#ff2020', size: 1 },
      attacks: {
        attack: { name: 'Bite', kind: 'phys', power: 16, element: 'shout', target: 'enemy', silent: true },
        toxic_barf: { name: 'Toxic Barf', kind: 'status', add: ['poison', 'slow'], hit: 100, mp: 58, target: 'enemy' }
      },
      ai: {
        counter: { phys: 'toxic_barf', chance: 100 },
        custom: function (e, b) {
          if (U.withSt(b, 'poison').length) return { move: 'attack', target: U.pickWith(b, 'poison') };
          return { move: 'toxic_barf', target: 'random' };
        }
      }
    },

    headbomber: {
      name: 'Headbomber', level: 35, hp: 1600, mp: 200, exp: 640, ap: 64, gil: 460,
      atk: 70, def: 60, defPct: 10, mat: 40, mdf: 46, dex: 60, lck: 10,
      elem: {}, immune: [],
      drops: [{ item: 'hyper', chance: 5 }], steal: [{ item: 'tranquilizer', chance: 100 }], morph: 'tranquilizer',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#c09070', c2: '#604030', c3: '#ffff40', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Dorsal Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        extreme_bomber: { name: 'Extreme Bomber', kind: 'phys', power: 70, element: 'shout', target: 'enemy', add: ['fury'], hit: 100 },
        power_up: idle()
      },
      ai: {
        // alone: powers up (Dex x2) once, then spams Extreme Bomber
        custom: function (e, b) {
          var v = U.v(e);
          if (U.foes(b).length <= 1) {
            if (!v.pu) { v.pu = 1; if (e.dex) e.dex = Math.min(255, e.dex * 2); return { move: 'power_up', target: 'self' }; }
            return { move: 'extreme_bomber', target: 'random' };
          }
          return { move: 'attack', target: 'random' };
        }
      }
    },

    malboro: {
      name: 'Malboro', level: 44, hp: 4400, mp: 900, exp: 1000, ap: 100, gil: 100,
      atk: 70, def: 110, defPct: 15, mat: 50, mdf: 120, dex: 80, lck: 5,
      elem: { water: 2, gravity: 0, poison: -1 },
      immune: ['poison', 'confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'm_tentacles', chance: 100 }], steal: [{ item: 'm_tentacles', chance: 52 }, { item: 'echo_screen', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#608040', c2: '#c04050', c3: '#ffe080', size: 1.5, variant: 1 },
      attacks: {
        frozen_beam: { name: 'Frozen Beam', kind: 'mag', power: 30, element: 'ice', mp: 20, target: 'enemy' },
        bio2: { name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 75, mp: 36, target: 'enemy' },
        bad_breath: { name: 'Bad Breath', kind: 'status', add: ['poison', 'confusion', 'sleep', 'silence', 'frog', 'small'], hit: 100, mp: 58, target: 'allEnemies', eskill: 'bad_breath' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(4); v.bb = 3; }
          var sc = U.sc(e, [3, 3, 6, 8]);
          if (v.c === 0) { v.c = U.one(b, sc) ? 3 : 1; return { move: 'frozen_beam', target: 'random' }; }
          if (v.c === 1) { v.c = U.one(b, sc) ? 4 : 0; return { move: 'frozen_beam', target: 'random' }; }
          if (v.c === 3) { v.c = 1; return { move: 'bio2', target: U.pickWithout(b, 'poison') }; }
          v.c = 0;
          if (v.bb > 0) { v.bb--; return { move: 'bad_breath', target: 'all' }; }
          return { move: 'frozen_beam', target: 'random' };
        }
      }
    },

    blue_dragon: {
      name: 'Blue Dragon', level: 41, hp: 8800, mp: 500, exp: 1200, ap: 200, gil: 1000,
      atk: 121, def: 86, defPct: 2, mat: 90, mdf: 240, dex: 80, lck: 10,
      elem: { gravity: 0, ice: -1 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'dragon_armlet', chance: 100 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#3050b0', c2: '#a0c0f0', c3: '#ffffff', size: 1.9 },
      attacks: {
        attack: { name: 'Dragon Fang', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        dragon_fang_2: { name: 'Dragon Fang', kind: 'phys', power: 40, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        tail_attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
        tail_attack_2: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', hits: 2, random: true, target: 'enemy' },
        blue_dragon_breath: { name: 'Blue Dragon Breath', kind: 'mag', power: 14, element: 'ice', mp: 20, target: 'allEnemies' },
        great_gale: { name: 'Great Gale', kind: 'phys', power: 30, element: 'wind', add: ['darkness'], hit: 63, target: 'allEnemies' },
        dragon_force: { name: 'Dragon Force', kind: 'special', special: 'dragon_force', mp: 19, target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(5); v.hd = 3; }
          // HP danger thresholds force Blue Dragon Breath / Great Gale (FF7 counter script)
          if (v.hd === 3 && e.hpPct <= 75) { v.hd = 2; v.c = 3; }
          if (v.hd === 2 && e.hpPct <= 50) { v.hd = 1; v.c = 4; }
          if (v.hd === 1 && e.hpPct <= 25) { v.hd = 0; v.c = 4; }
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.c === 0) {
            if (e.mp >= 19 && U.one(b, sc)) { v.c = 3 + b.rnd(2); return { move: 'dragon_force', target: 'self' }; }
            if (U.one(b, 2)) { v.c = 1; return { move: 'attack', target: 'random' }; }
            v.c = 2; return { move: 'tail_attack', target: 'random' };
          }
          if (v.c === 1) { v.c = 2; return { move: U.one(b, sc) ? 'dragon_fang_2' : 'attack', target: 'random' }; }
          if (v.c === 2) { v.c = 2; return { move: U.one(b, sc) ? 'tail_attack_2' : 'tail_attack', target: 'random' }; }
          if (v.c === 3) {
            v.c = U.one(b, sc) ? 1 : 0;
            return e.mp >= 20 ? { move: 'blue_dragon_breath', target: 'all' } : { move: 'tail_attack', target: 'random' };
          }
          v.c = b.rnd(2); return { move: 'great_gale', target: 'all' };
        }
      }
    },

    stilva: {
      name: 'Stilva', level: 40, hp: 2000, mp: 300, exp: 1000, ap: 110, gil: 1100,
      atk: 75, def: 60, defPct: 0, mat: 55, mdf: 120, dex: 80, lck: 5,
      elem: { gravity: 0 }, immune: ['confusion', 'frog', 'small', 'berserk'],
      drops: [{ item: 'tent', chance: 14 }], steal: [], morph: 'holy_torch',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#c04030', c2: '#f0e0c0', c3: '#ffd040', size: 1.3, variant: 1 },
      attacks: {
        attack: { name: 'Big Red Clipper', kind: 'phys', power: 16, target: 'enemy', silent: true },
        big_horn: { name: 'Big Horn', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        jump_attack: { name: 'Jump Attack', kind: 'phys', power: 20, target: 'enemy' },
        // Trine only via Manipulate (never used normally)
        trine: { name: 'Trine', kind: 'mag', power: 34, element: 'lightning', mp: 20, target: 'allEnemies', eskill: 'trine', manipOnly: true },
        magic_breath: { name: 'Magic Breath', kind: 'mag', power: 77, element: 'fire', elements: ['fire', 'ice', 'lightning'], mp: 75, target: 'allEnemies', eskill: 'magic_breath' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(4); v.ms = b.rnd(2); }
          if (v.c === 0) { v.c = 1; return { move: 'jump_attack', target: U.highest(b) }; }
          if (v.c === 1) { v.c = 2; v.ms = 1 - v.ms; return { move: v.ms ? 'big_horn' : 'attack', target: 'random' }; }
          if (v.c === 2) { v.c = 3; return { move: U.one(b, 2) ? 'big_horn' : 'attack', target: 'random' }; }
          v.c = 0;
          return e.mp >= 75 ? { move: 'magic_breath', target: 'all' } : { move: 'jump_attack', target: U.highest(b) };
        }
      }
    },

    icicle: {
      name: 'Icicle', level: 30, hp: 3000, mp: 300, exp: 500, ap: 0, gil: 0,
      atk: 73, def: 64, defPct: 0, mat: 63, mdf: 96, dex: 60, lck: 2,
      elem: { fire: 2, earth: 2, gravity: 2, ice: -1 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'back',
      onDeathRemove: ['evilhead'],   // breaking the Icicle drops all Evilheads (no rewards for them)
      look: { type: 'rock', c1: '#c8f0ff', c2: '#80b8e0', c3: '#ffffff', size: 1.6, variant: 2 },
      attacks: {
        icicle_drop: { name: 'Icicle Drop', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        wait: idle()
      },
      ai: {
        counter: { phys: 'icicle_drop', mag: 'icicle_drop', chance: 50 },
        custom: function () { return { move: 'wait', target: 'self' }; }
      }
    },

    evilhead: {
      name: 'Evilhead', level: 28, hp: 740, mp: 45, exp: 650, ap: 50, gil: 400,
      atk: 80, def: 50, defPct: 26, mat: 65, mdf: 60, dex: 65, lck: 0,   // FF7: 1/4 chance per hit of Df% 255
      elem: {}, immune: [],
      drops: [{ item: 'vampire_fang', chance: 14 }], steal: [], morph: 'holy_torch',
      boss: false, flying: true, row: 'front',
      look: { type: 'bat', c1: '#503060', c2: '#c080a0', c3: '#ff2020', size: 0.9 },
      attacks: {
        blood_suck: { name: 'Blood Suck', kind: 'drain', power: 16, element: 'hit', target: 'enemy', formula: 'phys' },
        ultrasound: { name: 'Ultrasound', kind: 'mag', power: 9, add: ['silence'], hit: 100, target: 'enemy' }
      },
      ai: { moves: [['ultrasound', 50], ['blood_suck', 50]] }
    },

    cuahl: {
      name: 'Cuahl', level: 33, hp: 1300, mp: 60, exp: 720, ap: 70, gil: 800,
      atk: 65, def: 42, defPct: 1, mat: 45, mdf: 70, dex: 60, lck: 0,
      elem: {}, immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [{ item: 'tranquilizer', chance: 52 }], morph: 'tranquilizer',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#d0b080', c2: '#806040', c3: '#40ff80', size: 1, variant: 1 },
      attacks: {
        light_shell: { name: 'Light Shell', kind: 'phys', power: 16, element: 'shout', target: 'enemy', silent: true },
        blaster: { name: 'Blaster', kind: 'mag', power: 28, mp: 20, target: 'enemy' },
        wait: idle()
      },
      ai: {
        // Cuahl only retaliates: Blaster vs physical attackers, Light Shell vs magic users
        counter: { phys: 'blaster', mag: 'light_shell', chance: 100 },
        custom: function () { return { move: 'wait', target: 'self' }; }
      }
    },

    // Schizo: two-headed boss of Gaea's Cliff. Right head = fire, left head = ice.
    schizo_right: {
      name: 'Schizo', level: 43, hp: 18000, mp: 350, exp: 2200, ap: 120, gil: 1500,
      atk: 57, def: 52, defPct: 1, mat: 40, mdf: 94, dex: 72, lck: 0,
      elem: { gravity: 0, fire: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [{ item: 'protect_ring', chance: 14 }], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#b03020', c2: '#f0c060', c3: '#ffff80', size: 2.4, variant: 1 },
      attacks: {
        right_breath: { name: 'Right Breath', kind: 'mag', power: 35, element: 'fire', mp: 10, target: 'enemy', silent: true },
        right_breath_all: { name: 'Right Breath', kind: 'mag', power: 35, element: 'fire', mp: 10, target: 'allEnemies', split: false, silent: true },
        double_breath: { name: 'Double Breath', kind: 'mag', power: 55, element: 'fire', elements: ['fire', 'ice'], mp: 10, target: 'enemy', silent: true },
        tremor: { name: 'Tremor', kind: 'mag', power: 24, element: 'earth', mp: 8, target: 'allEnemies', silent: true },
        right_breath_2: { name: 'Right Breath 2', kind: 'mag', power: 45, element: 'lightning', target: 'allEnemies', silent: true },
        wait: idle()
      },
      ai: {
        counter: { phys: 'tremor', mag: 'tremor', chance: 20 },   // FF7: every 5th hit
        onDeath: 'right_breath_2',
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var other = U.count(b, 'schizo_left') > 0 || (U.find(b, 'schizo_left') === null && U.foes(b).length > 1);
          if (v.c <= 2) { v.c++; return { move: other ? 'right_breath' : 'right_breath_all', target: other ? 'random' : 'all' }; }
          if (v.c <= 4) { v.c++; return { move: 'wait', target: 'self' }; }
          v.c = 0;
          return other ? { move: 'double_breath', target: 'random' } : { move: 'right_breath_all', target: 'all' };
        }
      }
    },

    schizo_left: {
      name: 'Schizo', level: 43, hp: 18000, mp: 350, exp: 2200, ap: 120, gil: 1500,
      atk: 57, def: 52, defPct: 1, mat: 40, mdf: 94, dex: 72, lck: 0,
      elem: { gravity: 0, ice: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [{ item: 'dragon_fang', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#2050b0', c2: '#a0d0f0', c3: '#ffffff', size: 2.4, variant: 1 },
      attacks: {
        left_breath: { name: 'Left Breath', kind: 'mag', power: 35, element: 'ice', mp: 10, target: 'enemy', silent: true },
        left_breath_all: { name: 'Left Breath', kind: 'mag', power: 35, element: 'ice', mp: 10, target: 'allEnemies', split: false, silent: true },
        double_breath: { name: 'Double Breath', kind: 'mag', power: 55, element: 'ice', elements: ['fire', 'ice'], mp: 10, target: 'enemy', silent: true },
        tremor: { name: 'Tremor', kind: 'mag', power: 25, element: 'earth', mp: 8, target: 'allEnemies', silent: true },
        left_breath_2: { name: 'Left Breath 2', kind: 'mag', power: 45, element: 'lightning', target: 'allEnemies', silent: true },
        wait: idle()
      },
      ai: {
        counter: { phys: 'tremor', mag: 'tremor', chance: 17 },   // FF7: every 6th hit
        onDeath: 'left_breath_2',
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var other = U.count(b, 'schizo_right') > 0 || (U.find(b, 'schizo_right') === null && U.foes(b).length > 1);
          if (v.c <= 2) { v.c++; return { move: other ? 'left_breath' : 'left_breath_all', target: other ? 'random' : 'all' }; }
          if (v.c <= 4) { v.c++; return { move: 'wait', target: 'self' }; }
          v.c = 0;
          return other ? { move: 'double_breath', target: 'random' } : { move: 'left_breath_all', target: 'all' };
        }
      }
    },

    // =====================================================================
    // WHIRLWIND MAZE / NORTHERN CRATER (Disc 2)
    // =====================================================================
    gigas: {
      name: 'Gigas', level: 40, hp: 3500, mp: 100, exp: 840, ap: 84, gil: 560,
      atk: 100, def: 80, defPct: 8, mat: 59, mdf: 98, dex: 79, lck: 22,
      elem: { gravity: 0 }, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'earth_mallet', chance: 14 }], steal: [{ item: 'gigas_armlet', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'giant', c1: '#907060', c2: '#d0b090', c3: '#ff4020', size: 1.8 },
      attacks: {
        squash: { name: 'Squash', kind: 'phys', power: 12, element: 'earth', target: 'enemy', silent: true },
        squash_3: { name: 'Squash', kind: 'phys', power: 12, element: 'earth', hits: 3, random: true, target: 'enemy', silent: true },
        moon_wars: { name: 'Moon Wars', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        moon_wars_2: { name: 'Moon Wars', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy' },
        moon_wars_3: { name: 'Moon Wars', kind: 'phys', power: 16, element: 'hit', hits: 3, random: true, target: 'enemy' },
        quake3: { name: 'Quake3', kind: 'mag', power: 70, element: 'earth', mp: 68, target: 'allEnemies' }
      },
      ai: {
        counter: { mag: 'squash', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.c <= 1) { v.c++; return { move: 'moon_wars', target: 'random' }; }
          if (v.c === 2) { v.c = 3; return { move: 'squash', target: 'random' }; }
          v.c = 0;
          if (U.one(b, sc)) {
            if (e.mp >= 68) return { move: 'quake3', target: 'all' };
            if (sc < 4) return { move: 'moon_wars_3', target: 'random' };
            var n = 1 + (U.one(b, sc) ? 1 : 0) + (U.one(b, sc) ? 1 : 0);
            return { move: n === 1 ? 'moon_wars' : n === 2 ? 'moon_wars_2' : 'moon_wars_3', target: 'random' };
          }
          return { move: sc < 4 && U.one(b, sc) ? 'squash_3' : 'squash', target: 'random' };
        }
      }
    },

    grenade: {
      name: 'Grenade', level: 32, hp: 2000, mp: 0, exp: 900, ap: 100, gil: 400,
      atk: 70, def: 60, defPct: 1, mat: 30, mdf: 64, dex: 68, lck: 0,
      elem: { fire: 0.5, earth: 0 }, immune: ['confusion', 'stop', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'right_arm', chance: 14 }], steal: [{ item: 'right_arm', chance: 14 }], morph: 'right_arm',
      boss: false, flying: true, row: 'front',
      look: { type: 'bomb', c1: '#e06020', c2: '#ffd040', c3: '#402010', size: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        bodyblow_3: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        gush: { name: 'Gush', kind: 'phys', power: 30, element: 'fire', target: 'enemy' },
        // kills the Grenade (no rewards) after hitting
        bomb_blast: { name: 'Bomb Blast', kind: 'phys', power: 254, target: 'enemy', selfKO: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          if (e.hpPct <= 25) return { move: 'bomb_blast', target: 'random' };
          if (e.hpPct <= 50) return { move: U.one(b, 2) ? 'bodyblow_3' : 'bomb_blast', target: 'random' };
          if (e.hpPct <= 75) {
            var r = b.rnd(4);
            return r === 0 ? { move: 'wait', target: 'self' } : r === 1 ? { move: 'gush', target: 'random' } : { move: 'attack', target: 'random' };
          }
          return U.one(b, 2) ? { move: 'attack', target: 'random' } : { move: 'wait', target: 'self' };
        }
      }
    },

    gremlin: {
      name: 'Gremlin', level: 36, hp: 1500, mp: 100, exp: 750, ap: 60, gil: 750,
      atk: 70, def: 60, defPct: 5, mat: 55, mdf: 80, dex: 62, lck: 14,
      elem: {}, immune: [],
      drops: [{ item: 'shrivel', chance: 14 }], steal: [{ item: 'tent', chance: 52 }], morph: 'x_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#70a040', c2: '#402810', c3: '#ffe000', size: 0.9 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        bad_mouth: { name: 'Bad mouth', kind: 'phys', power: 48, element: 'hit', add: ['sadness'], hit: 100, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var stage = e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          var noSad = U.without(b, 'sadness');
          if (v.c === 0) {
            v.c = 1;
            if (noSad.length && U.one(b, 3)) return { move: 'bad_mouth', target: b.pick(noSad) };
            return { move: 'attack', target: 'random' };
          }
          if (v.c <= 3) { v.c++; return { move: 'attack', target: stage ? U.pickWith(b, 'sadness') : 'random' }; }
          v.c = 1;
          if (stage === 1 && noSad.length && U.one(b, 3)) return { move: 'bad_mouth', target: b.pick(noSad) };
          if (stage === 2 && noSad.length) return { move: 'bad_mouth', target: b.pick(noSad) };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    ironite: {
      name: 'Ironite', level: 30, hp: 2400, mp: 100, exp: 900, ap: 48, gil: 680,
      atk: 65, def: 58, defPct: 2, mat: 50, mdf: 40, dex: 70, lck: 0,
      elem: {}, immune: ['frog'],
      drops: [{ item: 'hi_potion', chance: 5 }], steal: [{ item: 'phoenix_down', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#6070a0', c2: '#c0c8d8', c3: '#ff6060', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        flying_upper: { name: 'Flying Upper', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 100, mp: 8, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var asleep = U.withSt(b, 'sleep');
          if (v.c === 0) {
            v.c = 1;
            if (U.without(b, 'sleep').length) {
              if (e.mp >= 8) return { move: 'sleepel', target: U.pickWithout(b, 'sleep') };
              if (asleep.length) return { move: 'flying_upper', target: b.pick(asleep) };
              return { move: 'attack', target: 'random' };
            }
            return { move: 'flying_upper', target: 'random' };
          }
          if (v.c <= 2) { v.c++; return { move: 'flying_upper', target: U.pickWith(b, 'sleep') }; }
          v.c = 0;
          if (asleep.length) return { move: 'flying_upper', target: b.pick(asleep) };
          return e.mp >= 8 ? { move: 'sleepel', target: 'random' } : { move: 'attack', target: 'random' };
        }
      }
    },

    sculpture: {
      name: 'Sculpture', level: 32, hp: 1700, mp: 100, exp: 860, ap: 60, gil: 640,
      atk: 56, def: 40, defPct: 2, mat: 48, mdf: 68, dex: 53, lck: 0,
      elem: { holy: 2 },   // FF7: instantly destroyed by Holy-elemental attacks
      deathElem: ['holy'], immune: ['slow_numb', 'petrify'],
      drops: [{ item: 'tranquilizer', chance: 5 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'rock', c1: '#a09080', c2: '#e0d8c8', c3: '#ff4000', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        fire_shell: { name: 'Fire Shell', kind: 'phys', power: 48, element: 'fire', target: 'enemy' },
        fire_shell_2: { name: 'Fire Shell', kind: 'phys', power: 48, element: 'fire', hits: 2, random: true, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var low = e.hpPct <= 33;
          if (U.one(b, low ? 2 : 4)) return { move: low ? 'fire_shell_2' : 'fire_shell', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    wind_wing: {
      name: 'Wind Wing', level: 36, hp: 1900, mp: 350, exp: 800, ap: 60, gil: 500,
      atk: 75, def: 60, defPct: 3, mat: 45, mdf: 64, dex: 65, lck: 20,
      elem: {}, immune: [],
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'hi_potion', chance: 52 }], morph: 'phoenix_down',
      boss: false, flying: true, row: 'front',
      look: { type: 'bird', c1: '#60a0d0', c2: '#e0f0ff', c3: '#ffd000', size: 1.2 },
      attacks: {
        attack: { name: 'Tailbeat', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        sham_seal: { name: 'Sham Seal', kind: 'phys', power: 35, element: 'cut', target: 'enemy' },
        aero3: { name: 'Aero3', kind: 'mag', power: 50, element: 'wind', mp: 50, target: 'enemy' },
        // learnable only when a Confused Wind Wing casts it on the party (not manipulable)
        white_wind: { name: 'White Wind', kind: 'special', special: 'white_wind', element: 'restorative', mp: 34, target: 'allAllies',
          remove: ['sleep', 'poison', 'confusion', 'silence', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'paralysis', 'darkness', 'resist'],
          eskill: 'white_wind' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var st = e.hpPct <= 25 ? 1 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 3 : 4;
          if (st <= 2 && !v['t' + st]) { v['t' + st] = 1; v.c = 0; }
          if (v.c === 0) {
            v.c = 1;
            if (e.hp < e.maxHp && e.mp >= 34) return { move: 'white_wind', target: 'allies' };
            if (e.mp >= 50) return { move: 'aero3', target: 'random' };
            return { move: 'sham_seal', target: 'random' };
          }
          if (v.c <= 2) { v.c++; return { move: st < 3 ? 'sham_seal' : 'attack', target: 'random' }; }
          v.c = 1;
          if (st < 3 && e.mp >= 50) return { move: 'aero3', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    dragon_rider: {
      name: 'Dragon Rider', level: 35, hp: 3500, mp: 180, exp: 1000, ap: 80, gil: 690,
      atk: 84, def: 80, defPct: 15, mat: 76, mdf: 120, dex: 77, lck: 30,
      elem: { wind: 2, earth: 0, gravity: 0, water: 0 }, immune: ['confusion', 'stop', 'frog', 'small', 'manipulate', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [{ item: 'hi_potion', chance: 52 }], morph: 'mind_source',
      boss: false, flying: true, row: 'front',
      look: { type: 'dragon', c1: '#50a060', c2: '#d0c080', c3: '#ff3030', size: 1.4, variant: 2 },
      attacks: {
        fang: { name: 'Fang', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        attack: { name: 'Dual Attack', kind: 'phys', power: 20, element: 'cut', target: 'enemy' },
        head_hunting: { name: 'Head Hunting', kind: 'phys', power: 40, element: 'cut', target: 'enemy' },
        head_hunting_2: { name: 'Head Hunting 2', kind: 'phys', power: 80, element: 'cut', target: 'enemy' },
        rider_breath: { name: 'Rider Breath', kind: 'mag', power: 30, mp: 20, target: 'enemy' }
      },
      ai: {
        counter: { mag: 'rider_breath', chance: 25 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(6);
          var sc = U.sc(e, [1, 2, 3, 4]);
          switch (v.c) {
            case 0: v.c = 2; return { move: 'attack', target: 'random' };
            case 1: v.c = 3; return { move: 'fang', target: 'random' };
            case 2: v.c = 4; return { move: 'attack', target: 'random' };
            case 3: v.c = 4; return { move: 'fang', target: 'random' };
            case 4: v.c = 5; return { move: U.one(b, sc) ? 'head_hunting_2' : 'head_hunting', target: U.lowest(b) };
            default:
              v.c = b.rnd(2);
              if (U.one(b, sc)) return { move: 'rider_breath', target: U.highest(b) };
              return { move: U.one(b, 2) ? 'attack' : 'fang', target: 'random' };
          }
        }
      }
    },

    killbin: {
      name: 'Killbin', level: 30, hp: 3200, mp: 380, exp: 700, ap: 150, gil: 1000,
      atk: 90, def: 64, defPct: 12, mat: 85, mdf: 126, dex: 68, lck: 25,
      elem: {}, immune: ['manipulate'],
      drops: [{ item: 'ether', chance: 14 }], steal: [{ item: 'turbo_ether', chance: 52 }], morph: 'mind_source',
      boss: false, flying: true, row: 'front',
      look: { type: 'demon', c1: '#a06030', c2: '#f0d0a0', c3: '#40ffff', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'x', kind: 'phys', power: 16, target: 'enemy', silent: true },
        x_2: { name: 'x', kind: 'phys', power: 16, hits: 2, random: true, target: 'enemy', silent: true },
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', mp: 24, target: 'allAllies', silent: true },
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', mp: 22, target: 'enemy', silent: true },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', mp: 22, target: 'enemy', silent: true },
        aspil: { name: 'Aspil', kind: 'special', special: 'mpDrain', power: 2, mp: 1, target: 'enemy', silent: true },
        slow: { name: 'Slow', kind: 'status', add: ['slow'], hit: 100, mp: 20, target: 'enemy', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var slowT = U.pickWith(b, 'slow');
          if (v.c === 0) {
            v.c = 1;
            if (U.without(b, 'slow').length && U.one(b, 2)) {
              return e.mp >= 20 ? { move: 'slow', target: U.pickWithout(b, 'slow') } : { move: 'aspil', target: U.highestMp(b) };
            }
            return { move: 'attack', target: slowT };
          }
          if (v.c <= 2) { v.c++; return { move: U.one(b, 2) ? 'x_2' : 'attack', target: slowT }; }
          v.c = 0;
          if (e.hp < e.maxHp / 3) return e.mp >= 24 ? { move: 'cure2', target: 'allies' } : { move: 'aspil', target: U.highestMp(b) };
          if (e.mp >= 22) return { move: U.one(b, 2) ? 'fire2' : 'ice2', target: 'random' };
          return { move: 'aspil', target: U.highestMp(b) };
        }
      }
    },

    // Battle Square only (planned for the Whirlwind Maze but never placed). HP x2 / Att,MAt x1.25 in the Square.
    tonberry: {
      name: 'Tonberry', level: 25, hp: 15000, mp: 250, exp: 999, ap: 99, gil: 999,
      atk: 100, def: 50, defPct: 1, mat: 65, mdf: 60, dex: 80, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'turbo_ether', chance: 14 }], morph: 'elixir',
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#50a050', c2: '#6a4020', c3: '#ffe060', size: 0.8, variant: 3 },
      attacks: {
        // damage = hours played * 100 + minutes played
        time_damage: { name: 'Time Damage', kind: 'special', special: 'time_damage', target: 'enemy' },
        knife: { name: 'Knife', kind: 'status', add: ['death'], hit: 100, target: 'enemy' },
        step: idle()
      },
      ai: {
        counter: { phys: 'time_damage', mag: 'time_damage', chance: 33 },   // FF7: every 3rd hit
        custom: function (e, b) {
          var v = U.v(e); v.d = v.d || 0;
          if (v.d >= 3 && U.one(b, 2)) { v.d = 0; return { move: 'knife', target: 'random' }; }
          v.d++; return { move: 'step', target: 'self' };
        }
      }
    },

    jenova_death: {
      name: 'Jenova·DEATH', level: 55, hp: 25000, mp: 800, exp: 6000, ap: 400, gil: 5000,
      atk: 140, def: 90, defPct: 1, mat: 70, mdf: 320, dex: 150, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'reflect_ring', chance: 100 }], steal: [], morph: null,
      boss: true, flying: true, row: 'front',
      look: { type: 'custom', id: 'jenova_death', c1: '#c02030', c2: '#e0a0c0', c3: '#ffe040', size: 2.6 },
      attacks: {
        red_light: { name: 'Red Light', kind: 'mag', power: 18, element: 'fire', elements: ['fire', 'shout'], mp: 8, target: 'enemy' },
        red_light_2: { name: 'Red Light', kind: 'mag', power: 18, element: 'fire', elements: ['fire', 'shout'], mp: 8, hits: 2, random: true, target: 'enemy' },
        red_light_3: { name: 'Red Light', kind: 'mag', power: 18, element: 'fire', elements: ['fire', 'shout'], mp: 8, hits: 3, random: true, target: 'enemy' },
        red_light_all: { name: 'Red Light', kind: 'mag', power: 18, element: 'fire', elements: ['fire', 'shout'], mp: 8, target: 'allEnemies', split: false },
        tropic_wind: { name: 'Tropic Wind', kind: 'mag', power: 16, element: 'fire', elements: ['fire', 'wind'], mp: 12, target: 'allEnemies' },
        silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 94, mp: 24, target: 'enemy' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = U.one(b, 2) ? 3 : 0;
          var sc = e.hpPct <= 25 ? 2 : e.hpPct <= 75 ? 3 : 4, red = false;
          if (v.c === 0) {
            v.c = 1;
            if (U.withSt(b, 'silence').length || e.mp < 24) red = true;
            else return { move: 'silence', target: U.pickWithout(b, 'silence') };
          } else if (v.c <= 2) { v.c++; return { move: 'wait', target: 'self' }; }
          else if (v.c <= 4) { v.c++; red = true; }
          else { v.c = 0; return { move: 'tropic_wind', target: 'all' }; }
          if (red) {
            if (U.one(b, sc)) return { move: 'red_light_all', target: 'all' };
            var r = 1 + b.rnd(sc);
            return { move: r === 1 ? 'red_light_3' : r === 2 ? 'red_light_2' : 'red_light', target: 'random' };
          }
          return null;
        }
      },
      desc: 'Jenova\'s form at the Northern Crater (Disc 2).'
    },

    // =====================================================================
    // JUNON (Disc 2) — Cloud's party escaping / Aljunon
    // =====================================================================
    roulette_cannon: {
      name: 'Roulette Cannon', level: 38, hp: 3000, mp: 200, exp: 1200, ap: 100, gil: 1600,
      atk: 80, def: 60, defPct: 1, mat: 60, mdf: 50, dex: 55, lck: 20,
      elem: { lightning: 2, poison: 0 }, immune: imm(MACH_IMM, ['death', 'confusion', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless']),
      drops: [{ item: 'x_potion', chance: 100 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#707880', c2: '#c0c8d0', c3: '#ff2020', size: 1.3 },
      attacks: {
        fire_roulette: { name: 'Fire Roulette', kind: 'phys', power: 30, element: 'shoot', target: 'enemy', silent: true },
        wait: idle()
      },
      ai: {
        counter: { phys: 'fire_roulette', mag: 'fire_roulette', chance: 100 },   // it only ever counterattacks
        custom: function () { return { move: 'wait', target: 'self' }; }
      }
    },

    soldier_2nd: {
      name: 'SOLDIER:2nd', level: 35, hp: 4000, mp: 340, exp: 1000, ap: 85, gil: 750,
      atk: 80, def: 58, defPct: 4, mat: 60, mdf: 60, dex: 70, lck: 8,
      elem: {}, immune: [],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'remedy', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#4a3a70', c2: '#d0c0a0', c3: '#60c0ff', size: 1, variant: 2 },
      attacks: {
        attack: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        fight_2: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', hits: 2, target: 'enemy', silent: true },
        sword_of_doom: { name: 'Sword of Doom', kind: 'phys', power: 48, element: 'cut', target: 'enemy' }
      },
      ai: {
        counter: { mag: 'sword_of_doom', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          var th = e.hpPct <= 25 ? 2 : e.hpPct <= 50 ? 1 : 0;
          if (th > (v.th || 0)) { v.th = th; return { move: 'sword_of_doom', target: 'random' }; }
          return { move: U.one(b, U.sc(e, [2, 3, 4, 5])) ? 'fight_2' : 'attack', target: 'random' };
        }
      }
    },

    // =====================================================================
    // MIDEEL AREA (world map)
    // =====================================================================
    hippogriff: {
      name: 'Hippogriff', level: 37, hp: 3000, mp: 280, exp: 800, ap: 80, gil: 1500,
      atk: 90, def: 80, defPct: 1, mat: 98, mdf: 120, dex: 80, lck: 20,
      elem: {}, immune: ['sleep', 'confusion', 'stop', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'echo_screen', chance: 5 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#c09050', c2: '#f0e0c0', c3: '#ff4000', size: 1.4, variant: 1 },
      attacks: {
        attack: { name: 'Beak', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        beak_air: { name: 'Beak', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        dive: { name: '???', kind: 'phys', power: 48, element: 'hit', mp: 16, target: 'enemy' },
        // only hits targets whose level is a multiple of 2
        l2_confu: { name: 'L2 Confu', kind: 'special', special: 'level_status', lv: 2, add: ['confusion'], hit: 100, mp: 18, element: 'shoot', target: 'allEnemies' },
        take_off: idle()
      },
      ai: {
        // takes to the air (Can't Reach, Df% +30) once below 50% HP; lands again after a magic hit
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var t = U.pickWithout(b, 'confusion');
          if (!v.air && !v.flew && e.hpPct <= 50) { v.air = 1; v.flew = 1; e.flying = true; return { move: 'take_off', target: 'self' }; }
          if (v.air) {
            if (v.c <= 2) { v.c++; return { move: 'beak_air', target: t }; }
            v.c = 1; return { move: 'dive', target: t };
          }
          if (v.c === 0) { v.c = 1; return { move: 'l2_confu', target: 'all' }; }
          if (v.c <= 3) { v.c++; return { move: 'attack', target: t }; }
          v.c = 1; return { move: v.flew ? 'dive' : 'attack', target: t };
        }
      }
    },

    head_hunter: {
      name: 'Head Hunter', level: 30, hp: 2000, mp: 100, exp: 650, ap: 80, gil: 1000,
      atk: 100, def: 60, defPct: 3, mat: 58, mdf: 60, dex: 67, lck: 10,
      elem: {}, immune: [],
      drops: [{ item: 'ether', chance: 14 }], steal: [{ item: 'tranquilizer', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#806040', c2: '#e0c090', c3: '#ff2020', size: 1, variant: 1 },
      attacks: {
        attack: { name: 'Sickle', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        rising_dagger: { name: 'Rising Dagger', kind: 'phys', power: 16, target: 'enemy' }
      },
      ai: { moves: [['attack', 75], ['rising_dagger', 25]] }
    },

    spiral: {
      name: 'Spiral', level: 39, hp: 2800, mp: 100, exp: 700, ap: 80, gil: 1300,
      atk: 80, def: 80, defPct: 2, mat: 80, mdf: 80, dex: 65, lck: 8,
      elem: {}, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [{ item: 'x_potion', chance: 52 }], morph: 'guard_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#a0a040', c2: '#606020', c3: '#ff8000', size: 1 },
      attacks: {
        attack: { name: 'Angle Punch', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        spin: { name: 'Spin', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
        curl: idle(), uncurl: idle()
      },
      ai: {
        // curls into a ball (Def/MDf 320) at random; uncurls after a few turns. e.def/e.mdf updated for live-stat engines.
        custom: function (e, b) {
          var v = U.v(e); v.t = v.t || 0;
          if (v.spin) {
            if (b.rnd(4) < v.t) { v.spin = 0; v.t = 0; e.def = 80; e.mdf = 80; return { move: 'uncurl', target: 'self' }; }
            v.t = Math.min(10, v.t + 1); return { move: 'spin', target: 'random' };
          }
          if (b.rnd(4) < v.t) { v.spin = 1; v.t = 0; e.def = 320; e.mdf = 320; return { move: 'curl', target: 'self' }; }
          v.t = Math.min(10, v.t + 1); return { move: 'attack', target: 'random' };
        }
      }
    },

    crysales: {
      name: 'Crysales', level: 37, hp: 1500, mp: 100, exp: 800, ap: 80, gil: 600,
      atk: 98, def: 46, defPct: 5, mat: 45, mdf: 84, dex: 59, lck: 8,
      elem: {}, immune: [],
      drops: [{ item: 'ether', chance: 14 }], steal: [], morph: 'dream_powder',
      boss: false, flying: true, row: 'front',
      look: { type: 'insect', c1: '#c0a0e0', c2: '#f0e0ff', c3: '#40ff80', size: 1, variant: 2 },
      attacks: {
        attack: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        sleep_scales: { name: 'Sleep Scales', kind: 'status', add: ['sleep'], hit: 100, mp: 10, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var n = U.withSt(b, 'sleep').length, awake = U.without(b, 'sleep').length;
          if (n === 0) return { move: U.one(b, 4) ? 'attack' : 'sleep_scales', target: 'random' };
          if (awake > 0) return U.one(b, 2) ? { move: 'attack', target: U.pickWith(b, 'sleep') } : { move: 'sleep_scales', target: U.pickWithout(b, 'sleep') };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    sea_worm: {
      name: 'Sea Worm', level: 22, hp: 9000, mp: 200, exp: 1300, ap: 200, gil: 5000,
      atk: 60, def: 80, defPct: 1, mat: 42, mdf: 230, dex: 68, lck: 0,
      elem: { ice: 2, fire: 0.5, gravity: 0, earth: -1 },
      immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
      drops: [{ item: 'turbo_ether', chance: 14 }], steal: [{ item: 'dragon_scales', chance: 52 }], morph: 'dragon_scales',
      boss: false, flying: false, row: 'front',
      look: { type: 'worm', c1: '#c0a060', c2: '#806030', c3: '#ff4040', size: 2 },
      attacks: {
        earthquake: { name: 'Earthquake', kind: 'mag', power: 6, element: 'earth', mp: 10, target: 'allEnemies' },
        sandstorm: { name: 'Sandstorm', kind: 'phys', power: 32, element: 'earth', add: ['darkness'], hit: 75, target: 'allEnemies' },
        crush: { name: 'Crush', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = U.one(b, 16) ? 5 : 0; v.ss = 5; }
          switch (v.c) {
            case 0: v.c = 1; return { move: 'wait', target: 'self' };
            case 1:
              v.c = 2;
              if (U.without(b, 'darkness').length && v.ss > 0) { v.ss--; return { move: 'sandstorm', target: 'all' }; }
              return { move: 'crush', target: 'random' };
            case 2: v.c = 3; return { move: 'wait', target: 'self' };
            case 3:
              v.c = 4;
              if (U.withSt(b, 'darkness').length) return { move: 'crush', target: U.pickWith(b, 'darkness') };
              return U.one(b, 2) ? { move: 'crush', target: 'random' } : { move: 'wait', target: 'self' };
            case 4: v.c = 5; return { move: 'wait', target: 'self' };
            default:
              v.c = 0;
              return U.without(b, 'darkness').length ? { move: 'earthquake', target: 'all' } : { move: 'crush', target: 'random' };
          }
        }
      }
    },

    // =====================================================================
    // LONELY ISLES (Goblin Island / Cactus Island)
    // =====================================================================
    goblin: {
      name: 'Goblin', level: 40, hp: 2000, mp: 80, exp: 20, ap: 20, gil: 20,
      atk: 58, def: 74, defPct: 1, mat: 55, mdf: 74, dex: 68, lck: 0,
      elem: {}, immune: ['frog', 'small'],
      drops: [{ item: 'zeio_nut', chance: 14 }], steal: [{ item: 'zeio_nut', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#60a040', c2: '#a07040', c3: '#ffff00', size: 0.8, variant: 1 },
      attacks: {
        attack: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        // bonus damage when caster level == target level
        goblin_punch: { name: 'Goblin Punch', kind: 'phys', power: 12, target: 'enemy', special: 'goblin_punch', eskill: 'goblin_punch' },
        sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 100, mp: 8, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var t = U.pickWith(b, 'sleep');
          if (v.c < 3) { v.c++; return { move: U.one(b, 3) ? 'goblin_punch' : 'attack', target: t }; }
          v.c = b.rnd(2);
          if (U.without(b, 'sleep').length && e.mp >= 8 && U.one(b, 2)) return { move: 'sleepel', target: U.pickWithout(b, 'sleep') };
          return { move: U.one(b, 3) ? 'goblin_punch' : 'attack', target: t };
        }
      }
    },

    cactuer: {
      name: 'Cactuer', level: 40, hp: 6000, mp: 120, exp: 1000, ap: 100, gil: 1000,
      atk: 63, def: 90, defPct: 88, mat: 85, mdf: 100, dex: 75, lck: 0,   // FF7: 7/8 chance per hit of Df% 255
      elem: {}, immune: ['frog', 'small'],
      drops: [], steal: [], morph: 'tetra_elemental',
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#60c040', c2: '#e0f080', c3: '#000000', size: 0.9, variant: 2 },
      attacks: {
        needles: { name: '1000 Needles', kind: 'fixed', amount: 1000, element: 'shoot', target: 'enemy' },
        attack: { name: 'Mystery Kick', kind: 'phys', power: 48, element: 'hit', target: 'enemy', silent: true },
        mystery_kick_2: { name: 'Mystery Kick', kind: 'phys', power: 48, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(5);
          if (v.c < 4) {
            if (U.one(b, 3)) { v.c = 4; return { move: 'mystery_kick_2', target: 'random' }; }
            v.c++; return { move: 'attack', target: 'random' };
          }
          v.c = 0; return { move: 'needles', target: 'random' };
        }
      }
    },

    // =====================================================================
    // HUGE MATERIA: COREL TRAIN (forced battles while chasing the train)
    // =====================================================================
    gas_ducter: {
      name: 'Gas Ducter', level: 42, hp: 3000, mp: 200, exp: 900, ap: 75, gil: 1100,
      atk: 88, def: 76, defPct: 1, mat: 80, mdf: 136, dex: 85, lck: 0,
      elem: { poison: -1 }, immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'paralysis', 'darkness'],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#708060', c2: '#c0c090', c3: '#a0ff40', size: 1.1 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        punch_2: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        smog_alert: { name: 'Smog Alert', kind: 'phys', power: 20, add: ['poison', 'sadness', 'silence', 'darkness'], hit: 100, target: 'enemy' },
        smog_alert_2: { name: 'Smog Alert', kind: 'phys', power: 20, add: ['poison', 'sadness', 'silence', 'darkness'], hit: 100, hits: 2, random: true, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = 1 + b.rnd(2);
          var sc = U.sc(e, [2, 3, 6, 8]);
          if (v.c < 2) { v.c++; return { move: U.one(b, sc) ? 'punch_2' : 'attack', target: 'random' }; }
          v.c = 0; return { move: U.one(b, sc) ? 'smog_alert_2' : 'smog_alert', target: 'random' };
        }
      }
    },

    wolfmeister: {
      name: 'Wolfmeister', level: 43, hp: 10000, mp: 200, exp: 10000, ap: 100, gil: 600,
      atk: 140, def: 100, defPct: 1, mat: 100, mdf: 240, dex: 124, lck: 0,
      elem: { water: 2 },
      immune: ['death', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#505870', c2: '#c0c8e0', c3: '#ff3030', size: 1.4, variant: 2 },
      attacks: {
        attack: { name: 'Big Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        heavy_sword: { name: 'Heavy Sword', kind: 'phys', power: 20, element: 'cut', target: 'enemy' },
        atomic_ray: { name: 'Atomic Ray', kind: 'mag', power: 18, mp: 20, target: 'enemy' },
        big_guard: { name: 'Big Guard', kind: 'status', add: ['barrier', 'mbarrier', 'haste'], hit: 100, mp: 56, target: 'allAllies' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(5);
          var sc = U.sc(e, [2, 3, 4, 8]);
          if (v.c <= 1) { v.c++; return { move: 'attack', target: 'random' }; }
          if (v.c === 2) { v.c = 3; return { move: 'heavy_sword', target: 'random' }; }
          if (v.c === 3) { v.c = 4; return e.mp >= 20 && U.one(b, sc) ? { move: 'atomic_ray', target: 'random' } : { move: 'attack', target: 'random' }; }
          v.c = 0;
          if (e.mp >= 56 && U.one(b, sc) && !b.has(e, 'barrier') && !b.has(e, 'mbarrier') && !b.has(e, 'haste')) return { move: 'big_guard', target: 'allies' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    eagle_gun: {
      name: 'Eagle Gun', level: 46, hp: 17000, mp: 50, exp: 2000, ap: 90, gil: 3800,
      atk: 90, def: 86, defPct: 2, mat: 50, mdf: 100, dex: 90, lck: 1,
      elem: { lightning: 2, earth: 0, water: 0 },
      immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
      drops: [{ item: 'x_potion', chance: 100 }], steal: [{ item: 'warrior_bangle', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'mech', c1: '#8090a0', c2: '#d0a040', c3: '#ff2020', size: 2, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        single_wing_fire: { name: 'Single Wing Fire', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        single_wing_fire_2: { name: 'Single Wing Fire', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        dual_wing_fire: { name: 'Dual Wing Fire', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies' },
        dual_wing_fire_2: { name: 'Dual Wing Fire', kind: 'phys', power: 16, element: 'shoot', hits: 2, target: 'allEnemies' }
      },
      ai: {
        custom: function (e, b) {
          var r = b.rnd(4);
          if (r <= 1) return { move: 'attack', target: 'random' };
          if (r === 2) return { move: U.one(b, 2) ? 'single_wing_fire_2' : 'single_wing_fire', target: 'random' };
          return { move: U.one(b, 2) ? 'dual_wing_fire_2' : 'dual_wing_fire', target: 'all' };
        }
      }
    },

    // =====================================================================
    // HUGE MATERIA: FORT CONDOR (final defence; 3rd CMD.Grand Horn variant, Lv 37)
    // =====================================================================
    cmd_grand_horn_3: {
      name: 'CMD.Grand Horn', level: 37, hp: 8000, mp: 300, exp: 800, ap: 80, gil: 9600,
      atk: 100, def: 70, defPct: 5, mat: 95, mdf: 80, dex: 79, lck: 30,
      elem: {}, immune: BOSS_IMM.filter(function (s) { return s !== 'poison' && s !== 'stop' && s !== 'paralysis'; }),
      drops: [{ item: 'imperial_guard', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'beast', c1: '#806050', c2: '#e0c0a0', c3: '#ffd000', size: 2, variant: 3 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        punch_2: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', hits: 2, target: 'enemy', silent: true },
        poison_breath: { name: 'Poison Breath', kind: 'mag', power: 12, element: 'poison', add: ['poison'], hit: 100, mp: 10, target: 'enemy' },
        grand_attack: { name: 'Grand Attack', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies' }
      },
      ai: {
        onDeath: 'grand_attack',
        // Poison Breath on an unpoisoned member, then 1-2 Punches on the same victim
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.pb && U.without(b, 'poison').length) { v.pb = 1; v.t = U.pickWithout(b, 'poison'); return { move: 'poison_breath', target: v.t }; }
          v.pb = 0;
          var t = (v.t && v.t !== 'random' && (v.t.hp || 0) > 0) ? v.t : 'random';
          return { move: U.one(b, 2) ? 'punch_2' : 'attack', target: t };
        }
      }
    },

    // =====================================================================
    // ULTIMATE WEAPON (optional chase). HP persists across all its battles (persistHp hook);
    // it flies away after a few turns or after taking 20,000 damage.
    // =====================================================================
    ultimate_weapon: {
      name: 'Ultimate Weapon', level: 61, hp: 100000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 100, def: 120, defPct: 3, mat: 170, mdf: 100, dex: 120, lck: 50,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [], steal: [{ item: 'curse_ring', chance: 52 }], morph: null,
      boss: true, flying: true, row: 'front', persistHp: 'ultimate_weapon', noDeath: true,
      look: { type: 'custom', id: 'ultimate_weapon', c1: '#a0a8b8', c2: '#e8e0d0', c3: '#ff4040', size: 2.8 },
      attacks: {
        quake2: { name: 'Quake2', kind: 'mag', power: 24, element: 'earth', mp: 28, target: 'allEnemies' },
        attack: { name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', silent: true },
        ultima_beam: { name: 'Ultima Beam', kind: 'mag', power: 24, mp: 40, target: 'allEnemies' },
        flee: { name: 'Ultimate Weapon flies away', kind: 'special', special: 'flee', target: 'self', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.hp0 === undefined) { v.hp0 = e.hp; v.c = 0; }
          if (e.hp <= 20000 || v.hp0 - e.hp > 20000) return { move: 'flee', target: 'self' };
          v.c++;
          if (v.c === 1) return { move: 'quake2', target: 'all' };
          if (v.c === 2) return { move: 'attack', target: 'random' };
          if (v.c === 3) return { move: 'ultima_beam', target: 'all' };
          return { move: 'flee', target: 'self' };
        }
      },
      desc: 'First encounter, above Mideel.'
    },

    ultimate_weapon_b: {
      name: 'Ultimate Weapon', level: 61, hp: 100000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 100, def: 120, defPct: 3, mat: 170, mdf: 100, dex: 200, lck: 50,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [], steal: [{ item: 'reflect_ring', chance: 52 }], morph: null,
      boss: true, flying: true, row: 'front', persistHp: 'ultimate_weapon', noDeath: true,
      look: { type: 'custom', id: 'ultimate_weapon', c1: '#a0a8b8', c2: '#e8e0d0', c3: '#ff4040', size: 2.8 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', silent: true },
        ultima_beam: { name: 'Ultima Beam', kind: 'mag', power: 24, mp: 40, target: 'allEnemies' },
        quake2: { name: 'Quake2', kind: 'mag', power: 24, element: 'earth', mp: 28, target: 'allEnemies' },
        flee: { name: 'Ultimate Weapon flies away', kind: 'special', special: 'flee', target: 'self', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.t === undefined) { v.t = 3 + b.rnd(3); v.hp0 = e.hp; }
          if (e.hp <= 20000 || v.hp0 - e.hp > 20000) return { move: 'flee', target: 'self' };
          v.t--;
          if (v.t <= 0) return { move: 'flee', target: 'self' };
          if (v.t === 1) return { move: 'quake2', target: 'all' };
          if (v.t === 3) return { move: 'ultima_beam', target: 'all' };
          return { move: 'attack', target: 'random' };
        }
      },
      desc: 'Landed on the world map (ground chase battles).'
    },

    ultimate_weapon_c: {
      name: 'Ultimate Weapon', level: 61, hp: 100000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 100, def: 120, defPct: 3, mat: 170, mdf: 100, dex: 215, lck: 50,
      elem: { earth: 0, gravity: 0, water: 0 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [], steal: [{ item: 'circlet', chance: 52 }], morph: null,
      boss: true, flying: true, row: 'back', cantReach: true, persistHp: 'ultimate_weapon', noDeath: true,
      look: { type: 'custom', id: 'ultimate_weapon', c1: '#a0a8b8', c2: '#e8e0d0', c3: '#ff4040', size: 2.8 },
      attacks: {
        thunderball: { name: 'Thunderball', kind: 'mag', power: 34, element: 'lightning', mp: 20, target: 'enemy', silent: true },
        ultima_beam: { name: 'Ultima Beam', kind: 'mag', power: 24, mp: 40, target: 'allEnemies' },
        flee: { name: 'Ultimate Weapon flies away', kind: 'special', special: 'flee', target: 'self', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.t === undefined) { v.t = 3 + b.rnd(3); v.hp0 = e.hp; }
          if (e.hp <= 20000 || v.hp0 - e.hp > 20000) return { move: 'flee', target: 'self' };
          v.t--;
          if (v.t <= 0) return { move: 'flee', target: 'self' };
          if (v.t === 1 || v.t === 3) return { move: 'thunderball', target: 'random' };
          return { move: 'ultima_beam', target: 'all' };
        }
      },
      desc: 'Airborne chase battles (fought from the Highwind).'
    },

    ultimate_weapon_d: {
      name: 'Ultimate Weapon', level: 61, hp: 100000, mp: 400, exp: 35000, ap: 3500, gil: 25000,
      atk: 100, def: 120, defPct: 3, mat: 170, mdf: 100, dex: 230, lck: 50,
      elem: { earth: 0, gravity: 0, water: 0 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [{ item: 'ultima_weapon', chance: 100 }], steal: [], morph: null,
      boss: true, flying: true, row: 'back', cantReach: true,
      persistHp: 'ultimate_weapon',   // starts with the HP left from the chase (20,000 if it was "killed" earlier)
      look: { type: 'custom', id: 'ultimate_weapon', c1: '#a0a8b8', c2: '#e8e0d0', c3: '#ff4040', size: 2.8 },
      attacks: {
        thunderball: { name: 'Thunderball', kind: 'mag', power: 34, element: 'lightning', mp: 20, target: 'enemy', silent: true },
        ultima_beam: { name: 'Ultima Beam', kind: 'mag', power: 24, mp: 40, target: 'allEnemies' },
        shadow_flare: { name: 'Shadow Flare', kind: 'mag', power: 125, mp: 100, target: 'enemy', eskill: 'shadow_flare' }
      },
      ai: {
        // (the Enemy-Skill FAQ: "Shadowflare is his final attack, this it will only target the member who killed him")
        onDeath: 'shadow_flare', onDeathTarget: 'killer',
        moves: [['thunderball', 50], ['ultima_beam', 50]]
      },
      desc: 'Final battle, above Cosmo Canyon.'
    },

    // =====================================================================
    // HUGE MATERIA: JUNON -> UNDERWATER REACTOR, SUBMARINES
    // =====================================================================
    death_machine: {
      name: 'Death Machine', level: 35, hp: 2500, mp: 150, exp: 900, ap: 80, gil: 1200,
      atk: 72, def: 58, defPct: 1, mat: 25, mdf: 60, dex: 66, lck: 0,
      elem: {}, immune: [],
      drops: [], steal: [{ item: 'w_machine_gun', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#707070', c2: '#b0a080', c3: '#ff2020', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', target: 'enemy' },
        w_machine_gun_2: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        needles: { name: '100 Needles', kind: 'phys', power: 20, target: 'enemy' },
        needles_2: { name: '100 Needles', kind: 'phys', power: 20, hits: 2, target: 'enemy' },
        matra_magic: { name: 'Matra Magic', kind: 'mag', power: 11, mp: 8, target: 'allEnemies', eskill: 'matra_magic' },
        matra_magic_2: { name: 'Matra Magic', kind: 'mag', power: 11, mp: 8, hits: 2, target: 'allEnemies', eskill: 'matra_magic' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var p = e.hpPct;
          if (p <= 33) return { move: U.one(b, 2) ? 'matra_magic_2' : 'matra_magic', target: 'all' };
          if (p <= 67) { v.alt = !v.alt; return v.alt ? { move: U.one(b, 2) ? 'needles_2' : 'needles', target: 'random' } : { move: U.one(b, 2) ? 'w_machine_gun_2' : 'attack', target: 'random' }; }
          if (p <= 83) return { move: U.one(b, 2) ? 'w_machine_gun_2' : 'attack', target: 'random' };
          if (v.c === 0) { v.c = 1; return { move: 'needles', target: 'random' }; }
          v.c = (v.c + 1) % 3;
          return { move: U.one(b, 2) ? 'w_machine_gun_2' : 'attack', target: 'random' };
        }
      }
    },

    slalom: {
      name: 'Slalom', level: 37, hp: 1600, mp: 30, exp: 700, ap: 70, gil: 1500,
      atk: 70, def: 74, defPct: 10, mat: 45, mdf: 80, dex: 60, lck: 12,
      elem: { poison: -1 }, immune: ['sleep', 'poison', 'sadness', 'fury', 'frog', 'small', 'death_sentence', 'peerless', 'paralysis', 'darkness'],
      drops: [{ item: 'deadly_waste', chance: 14 }], steal: [{ item: 'smoke_bomb', chance: 14 }], morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#90a070', c2: '#d0d0b0', c3: '#80ff40', size: 1, variant: 2 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        punch_2: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        smog: { name: 'Smog', kind: 'phys', power: 12, add: ['poison'], hit: 100, target: 'enemy' },
        smog_dark: { name: 'Smog', kind: 'phys', power: 12, add: ['poison', 'darkness'], hit: 100, hits: 2, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = 1 + b.rnd(2);
          var sc = U.sc(e, [2, 3, 6, 8]);
          if (v.c < 2) { v.c++; return { move: U.one(b, sc) ? 'punch_2' : 'attack', target: 'random' }; }
          v.c = 0; return { move: U.one(b, sc) ? 'smog_dark' : 'smog', target: 'random' };
        }
      }
    },

    // Guard System controls the Quick Machine Gun and Rocket Launcher turrets of its formation.
    guard_system: {
      name: 'Guard System', level: 35, hp: 2200, mp: 200, exp: 1100, ap: 80, gil: 1200,
      atk: 55, def: 70, defPct: 0, mat: 56, mdf: 50, dex: 67, lck: 0,
      elem: { lightning: 0 }, immune: imm(MACH_IMM, ['death', 'confusion', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless']),
      drops: [{ item: 'molotov', chance: 5 }], steal: [], morph: null,
      boss: false, flying: false, row: 'back',
      onDeathRemove: ['quick_machine_gun', 'rocket_launcher_gs'],
      look: { type: 'machine', c1: '#606878', c2: '#a0b0c0', c3: '#ff2020', size: 1.2, variant: 3 },
      attacks: {
        warning: { name: 'Warning! Warning!', kind: 'special', special: 'nothing', target: 'self' },
        leave: { name: 'Leave at once!!', kind: 'special', special: 'nothing', target: 'self' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.s) { v.s = 1; return { move: U.one(b, 2) ? 'warning' : 'leave', target: 'self' }; }
          return { move: 'wait', target: 'self' };
        }
      }
    },

    quick_machine_gun: {
      name: 'Quick Machine Gun', level: 20, hp: 1000, mp: 0, exp: 600, ap: 60, gil: 300,
      atk: 130, def: 50, defPct: 0, mat: 15, mdf: 30, dex: 69, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['confusion', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless']),
      drops: [], steal: [], morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#808890', c2: '#404850', c3: '#ffc000', size: 0.9, variant: 1 },
      attacks: {
        attack: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        machine_gun_all: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies', split: false }
      },
      ai: { moves: [['attack', 50], ['machine_gun_all', 50]] }
    },

    rocket_launcher_gs: {   // the Guard System's Rocket Launcher (own id: 'rocket_launcher' is the Disc 1 Sector 4 turret, enemies_d1a.js)
      name: 'Rocket Launcher', level: 20, hp: 1000, mp: 0, exp: 600, ap: 60, gil: 300,
      atk: 130, def: 50, defPct: 0, mat: 15, mdf: 30, dex: 69, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['confusion', 'slow_numb', 'petrify', 'manipulate', 'berserk', 'peerless']),
      drops: [], steal: [], morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#808890', c2: '#b04040', c3: '#ffc000', size: 0.9, variant: 2 },
      attacks: {
        attack: { name: 'Rocket Launcher', kind: 'phys', power: 24, element: 'shoot', target: 'enemy' },
        confu_missile: { name: 'Confu Missile', kind: 'phys', power: 20, add: ['confusion'], hit: 100, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          if (U.without(b, 'confusion').length && U.one(b, 4)) return { move: 'confu_missile', target: U.pickWithout(b, 'confusion') };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    submarine_crew: {
      name: 'Submarine Crew', level: 32, hp: 1500, mp: 85, exp: 850, ap: 80, gil: 500,
      atk: 75, def: 56, defPct: 1, mat: 25, mdf: 74, dex: 55, lck: 0,
      elem: {}, immune: [],
      drops: [{ item: 's_mine', chance: 14 }, { item: 'shinra_beta', chance: 14 }], steal: [{ item: '8inch_cannon', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#304870', c2: '#e0e0e0', c3: '#ffd060', size: 1, variant: 1 },
      attacks: {
        attack: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        hand_grenade: { name: 'Hand Grenade', kind: 'phys', power: 35, element: 'shoot', target: 'enemy' }   // never used (FF7 AI bug)
      },
      ai: {
        custom: function (e, b) {
          return { move: 'attack', target: e.hpPct <= 75 ? U.lowest(b) : 'random' };
        }
      }
    },

    ghost_ship: {
      name: 'Ghost Ship', level: 44, hp: 6600, mp: 100, exp: 1600, ap: 60, gil: 2000,
      atk: 80, def: 70, defPct: 5, mat: 68, mdf: 80, dex: 80, lck: 1,
      elem: { holy: 2, water: 0.5, earth: 0, gravity: 0, restorative: -1 },
      immune: ['death', 'sleep', 'confusion', 'stop', 'frog', 'small', 'death_sentence', 'manipulate', 'paralysis'], undead: true,
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'phoenix_down', chance: 52 }], morph: 'guide_book',
      boss: false, flying: true, row: 'front',
      look: { type: 'ghost', c1: '#605040', c2: '#a0e0c0', c3: '#40ffa0', size: 1.8, variant: 2 },
      attacks: {
        attack: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        fight_2: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', hits: 2, random: true, target: 'enemy', silent: true },
        st_elmos_fire: { name: 'St.Elmos Fire', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        goannai: { name: 'Goannai', kind: 'special', special: 'remove', target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(6); v.g = 2; }
          if (v.c <= 2) { if (U.one(b, 3)) { v.c = 3; return { move: 'fight_2', target: 'random' }; } v.c++; return { move: 'attack', target: 'random' }; }
          if (v.c === 3) { v.c = 4; return { move: U.one(b, 3) ? 'fight_2' : 'attack', target: 'random' }; }
          if (v.c === 4) { v.c = 5; return { move: 'st_elmos_fire', target: 'random' }; }
          v.c = 0;
          if (v.g > 0 && U.one(b, 2)) { v.g--; return { move: 'goannai', target: U.highest(b) }; }
          return { move: 'attack', target: 'random' };
        }
      }
    },

    corvette: {
      name: 'Corvette', level: 36, hp: 3200, mp: 260, exp: 1050, ap: 60, gil: 2200,
      atk: 78, def: 68, defPct: 5, mat: 68, mdf: 74, dex: 69, lck: 15,
      elem: { water: 0.5, earth: 0 }, weakStatus: ['confusion'],   // double damage from Confusion-inflicting attacks
      immune: ['stop', 'paralysis'],
      drops: [{ item: 'loco_weed', chance: 14 }], steal: [{ item: 'hyper', chance: 14 }], morph: 'light_curtain',
      boss: false, flying: false, row: 'front',
      look: { type: 'fish', c1: '#4070a0', c2: '#c0d8f0', c3: '#ff4040', size: 1.2 },
      attacks: {
        gash: { name: 'Gash', kind: 'phys', power: 20, element: 'cut', target: 'enemy' },
        gash_2: { name: 'Gash', kind: 'phys', power: 20, element: 'cut', hits: 2, random: true, target: 'enemy' },
        spinning_cut: { name: 'Spinning Cut', kind: 'phys', power: 30, element: 'cut', target: 'enemy' },
        slap: { name: 'Slap', kind: 'phys', power: 20, element: 'hit', add: ['fury'], hit: 75, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var th = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (th > (v.th || 0)) { v.th = th; v.c = 3; }
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.c <= 1) { v.c++; return { move: U.one(b, sc) ? 'gash_2' : 'gash', target: 'random' }; }
          if (v.c === 2) { v.c = 0; return { move: 'spinning_cut', target: 'random' }; }
          v.c = 1; return { move: 'slap', target: 'random' };
        }
      }
    },

    diver_nest: {
      name: 'Diver Nest', level: 38, hp: 2800, mp: 100, exp: 1340, ap: 60, gil: 1250,
      atk: 60, def: 90, defPct: 6, mat: 65, mdf: 110, dex: 64, lck: 0,
      elem: { water: 0.5, earth: 0 }, immune: [],
      drops: [{ item: 'x_potion', chance: 5 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'fish', c1: '#806080', c2: '#e0c0e0', c3: '#ffe040', size: 1.6, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        bodyblow_2: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        big_wave: { name: 'Big Wave', kind: 'phys', power: 20, target: 'allEnemies' },
        tornade_wave: { name: 'Tornade Wave', kind: 'mag', power: 20, element: 'wind', mp: 20, target: 'enemy' },
        tornade_wave_2: { name: 'Tornade Wave', kind: 'mag', power: 20, element: 'wind', mp: 20, hits: 2, random: true, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var p = e.hpPct;
          if (p > 75) return { move: 'attack', target: 'random' };
          if (p > 50) return { move: U.one(b, 2) ? 'bodyblow_2' : 'attack', target: 'random' };
          if (p > 25) {
            if (U.one(b, 3)) return { move: U.one(b, 2) ? 'bodyblow_2' : 'attack', target: 'random' };
            return { move: U.one(b, 2) ? 'tornade_wave_2' : 'tornade_wave', target: 'random' };
          }
          if (U.one(b, 3)) return { move: U.one(b, 2) ? 'tornade_wave_2' : 'tornade_wave', target: 'random' };
          return { move: 'big_wave', target: 'all' };
        }
      }
    },

    underwater_mp: {
      name: 'Underwater MP', level: 34, hp: 1000, mp: 100, exp: 820, ap: 80, gil: 600,
      atk: 70, def: 80, defPct: 4, mat: 65, mdf: 124, dex: 62, lck: 2,
      elem: {}, immune: [],
      drops: [{ item: 'grenade', chance: 100 }], steal: [{ item: 'shinra_alpha', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#2050a0', c2: '#d0d0d0', c3: '#ffff00', size: 1 },
      attacks: {
        machine_gun_3: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', hits: 3, random: true, target: 'enemy', silent: true },
        hand_grenade: { name: 'Hand Grenade', kind: 'phys', power: 35, element: 'shoot', target: 'enemy' }
      },
      ai: { cycle: ['machine_gun_3', 'hand_grenade'] }
    },

    senior_grunt: {
      name: 'Senior Grunt', level: 35, hp: 2600, mp: 245, exp: 930, ap: 90, gil: 800,
      atk: 75, def: 70, defPct: 12, mat: 80, mdf: 90, dex: 69, lck: 5,
      elem: { water: 0.5 }, immune: [],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#306060', c2: '#c0e0d0', c3: '#ffa000', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Handclaw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        harrier_beam: { name: 'Harrier Beam', kind: 'phys', power: 20, element: 'shoot', target: 'enemy' },
        water_wave: { name: 'Water Wave', kind: 'phys', power: 20, element: 'shout', target: 'enemy' }
      },
      ai: { moves: [['attack', 50], ['harrier_beam', 25], ['water_wave', 25]] }
    },

    hard_attacker: {
      name: 'Hard Attacker', level: 32, hp: 2500, mp: 150, exp: 750, ap: 58, gil: 600,
      atk: 80, def: 90, defPct: 3, mat: 55, mdf: 74, dex: 77, lck: 6,
      elem: { fire: 0.5, water: 0.5 }, immune: [],
      drops: [{ item: 'molotov', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'mech', c1: '#a07030', c2: '#404040', c3: '#ff6000', size: 1.2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        oil: { name: 'Oil', kind: 'phys', power: 16, element: 'fire', target: 'enemy' }
      },
      ai: { moves: [['attack', 50], ['oil', 50]] }
    },

    guardian: {
      name: 'Guardian', level: 40, hp: 4000, mp: 340, exp: 940, ap: 60, gil: 500,
      atk: 80, def: 76, defPct: 8, mat: 66, mdf: 80, dex: 67, lck: 10,
      elem: {}, immune: imm(MACH_IMM, ['death', 'confusion', 'haste', 'slow', 'stop', 'slow_numb', 'petrify', 'manipulate', 'peerless']),
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'mech', c1: '#5060a0', c2: '#c0c0d0', c3: '#ff2040', size: 1.4, variant: 2 },
      attacks: {
        attack: { name: 'Rocket Punch', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        rocket_punch_2: { name: 'Rocket Punch', kind: 'phys', power: 20, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        w_rocket_punch: { name: 'W Rocket Punch', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
        w_rocket_punch_2: { name: 'W Rocket Punch', kind: 'phys', power: 20, element: 'hit', hits: 2, random: true, target: 'enemy' },
        jumping_blow: { name: 'Jumping Blow', kind: 'phys', power: 20, element: 'cut', target: 'enemy' },
        jumping_blow_2: { name: 'Jumping Blow', kind: 'phys', power: 20, element: 'cut', hits: 2, random: true, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = U.one(b, 3) ? 3 : b.rnd(5);
          var two = U.one(b, U.sc(e, [2, 4, 6, 8]));
          if (v.c <= 1) { v.c++; return { move: two ? 'rocket_punch_2' : 'attack', target: 'random' }; }
          if (v.c === 2) { v.c = 2 + b.rnd(3); return { move: two ? 'rocket_punch_2' : 'attack', target: 'random' }; }
          if (v.c === 3) { v.c = 0; return { move: two ? 'w_rocket_punch_2' : 'w_rocket_punch', target: 'random' }; }
          v.c = 0; return { move: two ? 'jumping_blow_2' : 'jumping_blow', target: 'random' };
        }
      }
    },

    gun_carrier: {
      name: 'Gun Carrier', level: 39, hp: 3400, mp: 240, exp: 860, ap: 75, gil: 1600,
      atk: 60, def: 76, defPct: 5, mat: 45, mdf: 84, dex: 59, lck: 2,
      elem: { lightning: 2 }, immune: MACH_IMM.slice(),
      drops: [{ item: 's_mine', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'tank', c1: '#607050', c2: '#a0a080', c3: '#ff4000', size: 1.3 },
      attacks: {
        attack: { name: 'Normal Shell', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        normal_shell_all: { name: 'Normal Shell', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies', split: false },
        abnormal_shell: { name: 'Abnormal Shell', kind: 'phys', power: 4, element: 'shoot', add: ['slow', 'darkness'], hit: 100, target: 'enemy' },
        bodyblow: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          if (v.c === 0) { v.c = 1; return { move: 'wait', target: 'self' }; }
          if (v.c === 1) { v.c = 2; return { move: 'abnormal_shell', target: 'random' }; }
          if (v.c === 2) { v.c = 3; return { move: 'attack', target: U.pickWith(b, 'slow') }; }
          if (v.c === 3) { v.c = 4; return { move: 'bodyblow', target: U.pickWith(b, 'darkness') }; }
          v.c = (U.one(b, 2) && (U.without(b, 'slow').length || U.without(b, 'darkness').length)) ? 1 : 2;
          return { move: 'normal_shell_all', target: 'all' };
        }
      }
    },

    captain: {
      name: 'Captain', level: 34, hp: 2000, mp: 90, exp: 850, ap: 84, gil: 1050,
      atk: 84, def: 66, defPct: 1, mat: 35, mdf: 80, dex: 63, lck: 0,
      elem: {}, immune: [],
      drops: [{ item: 's_mine', chance: 14 }], steal: [{ item: 'shinra_alpha', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'back',
      look: { type: 'soldier', c1: '#203050', c2: '#e0c080', c3: '#ffffff', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        machine_gun_2: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy', silent: true },
        machine_gun_all: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies', split: false, silent: true },
        show_how: { name: 'Let me show you how it\'s done.', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.t === undefined) { v.t = 3; }
          if (e.hpPct <= 75) return { move: 'machine_gun_all', target: 'all' };
          if (v.t === 0) { v.t = 3; return { move: 'machine_gun_2', target: 'random' }; }
          v.t--; return { move: 'attack', target: U.lowest(b) };
        }
      }
    },

    // Carry Armor + its two arms (Underwater Reactor boss). Arms grab party members ('imprisoned').
    carry_armor: {
      name: 'Carry Armor', level: 45, hp: 24000, mp: 200, exp: 2800, ap: 240, gil: 4000,
      atk: 90, def: 200, defPct: 1, mat: 55, mdf: 300, dex: 80, lck: 0,
      elem: { lightning: 2, poison: 0, gravity: 0 },
      immune: imm(BOSS_IMM, ['sadness', 'fury', 'haste', 'slow', 'darkness']),
      drops: [{ item: 'gods_hand', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['right_arm', 'left_arm'],   // arms vanish and release their prisoners
      look: { type: 'mech', c1: '#808890', c2: '#c09030', c3: '#ff2020', size: 2.6, variant: 3 },
      attacks: {
        lapis_laser: { name: 'Lapis Laser', kind: 'mag', power: 50, mp: 10, target: 'allEnemies' },
        // hurts whoever is held in the arms
        damage_attack: { name: 'Damage Attack', kind: 'mag', power: 15, target: 'enemy', silent: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = 0; if (U.one(b, 3)) return { move: 'lapis_laser', target: 'all' }; }
          var free = U.without(b, 'imprisoned'), held = U.withSt(b, 'imprisoned');
          var sc = U.sc(e, [1, 2, 3, 4]);
          if (v.c === 0) {
            v.c = 1;
            if (free.length && U.one(b, sc)) return { move: 'lapis_laser', target: free };
            return { move: 'wait', target: 'self' };
          }
          v.c = 0;
          if (held.length) return { move: 'damage_attack', target: held };
          return { move: 'wait', target: 'self' };
        }
      }
    },

    right_arm: {
      name: 'Right Arm', level: 45, hp: 10000, mp: 100, exp: 1400, ap: 95, gil: 0,
      atk: 80, def: 200, defPct: 1, mat: 55, mdf: 300, dex: 80, lck: 0,
      elem: { lightning: 2, poison: 0, gravity: 0 },
      immune: imm(BOSS_IMM, ['sadness', 'fury', 'haste', 'slow', 'darkness']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front', holdsPrisoner: true,
      look: { type: 'mech', c1: '#808890', c2: '#c09030', c3: '#ff2020', size: 1.4, variant: 1 },
      attacks: {
        attack: { name: 'Arm Punch', kind: 'phys', power: 24, element: 'hit', target: 'enemy', silent: true },
        arm_grab: { name: 'Arm Grab', kind: 'status', add: ['imprisoned'], hit: 100, target: 'enemy', grab: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.prisoner && (v.prisoner.hp || 0) > 0 && b.has(v.prisoner, 'imprisoned')) return { move: 'wait', target: 'self' };
          v.prisoner = null;
          var free = U.without(b, 'imprisoned');
          var sc = e.hp >= e.maxHp ? 16 : U.sc(e, [2, 8, 32, 128]);
          if (free.length && U.one(b, sc)) { v.prisoner = b.pick(free); return { move: 'arm_grab', target: v.prisoner }; }
          if (free.length && U.one(b, 2)) return { move: 'attack', target: b.pick(free) };
          return { move: 'wait', target: 'self' };
        }
      }
    },

    left_arm: {
      name: 'Left Arm', level: 45, hp: 10000, mp: 100, exp: 1500, ap: 90, gil: 0,
      atk: 80, def: 200, defPct: 1, mat: 55, mdf: 300, dex: 80, lck: 0,
      elem: { lightning: 2, poison: 0, gravity: 0 },
      immune: imm(BOSS_IMM, ['sadness', 'fury', 'haste', 'slow', 'darkness']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front', holdsPrisoner: true,
      look: { type: 'mech', c1: '#808890', c2: '#c09030', c3: '#ff2020', size: 1.4, variant: 2 },
      attacks: {
        attack: { name: 'Arm Punch', kind: 'phys', power: 24, element: 'hit', target: 'enemy', silent: true },
        arm_grab: { name: 'Arm Grab', kind: 'status', add: ['imprisoned'], hit: 100, target: 'enemy', grab: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.prisoner && (v.prisoner.hp || 0) > 0 && b.has(v.prisoner, 'imprisoned')) return { move: 'wait', target: 'self' };
          v.prisoner = null;
          var free = U.without(b, 'imprisoned');
          var sc = e.hp >= e.maxHp ? 16 : U.sc(e, [2, 8, 32, 128]);
          if (free.length && U.one(b, sc)) { v.prisoner = b.pick(free); return { move: 'arm_grab', target: v.prisoner }; }
          if (free.length && U.one(b, 2)) return { move: 'attack', target: b.pick(free) };
          return { move: 'wait', target: 'self' };
        }
      }
    },

    // =====================================================================
    // HUGE MATERIA: ROCKET TOWN (Rude + 2 Attack Squad in front of the rocket)
    // =====================================================================
    rude_3: {
      name: 'Rude', level: 42, hp: 9000, mp: 240, exp: 3400, ap: 80, gil: 3000,
      atk: 60, def: 60, defPct: 5, mat: 30, mdf: 160, dex: 78, lck: 9,
      elem: { gravity: 0 }, immune: TURK_IMM.slice(),
      drops: [{ item: 'hi_potion', chance: 14 }], steal: [{ item: 'ziedrich', chance: 14 }], morph: null,
      boss: true, flying: false, row: 'back',
      onDeathRemove: ['attack_squad'],
      look: { type: 'humanoid', c1: '#202028', c2: '#e0c0a0', c3: '#101010', size: 1.3, variant: 1 },
      attacks: {
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', mp: 22, target: 'enemy' },
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', mp: 24, target: 'self' },
        mbarrier: { name: 'MBarrier', kind: 'status', add: ['mbarrier'], hit: 100, mp: 24, target: 'self' },
        attack: { name: 'Shoulder Attack', kind: 'phys', power: 48, element: 'hit', target: 'enemy', silent: true },
        grand_spark: { name: 'Grand Spark', kind: 'mag', power: 24, element: 'hit', hits: 3, random: true, target: 'enemy' },
        hesitate: { name: '..................', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        // Rude avoids hitting Tifa whenever possible
        custom: function (e, b) {
          var notTifa = U.party(b).filter(function (c) { return !U.isChar(c, 'tifa'); });
          if (e.hpPct < 25 && e.mp >= 22 && U.one(b, 2)) return { move: 'bolt2', target: U.pick(b, notTifa) };
          if (e.hpPct < 25 && e.mp >= 24) return { move: 'cure2', target: 'self' };
          if (U.one(b, 4) && !b.has(e, 'mbarrier') && e.mp >= 24) return { move: 'mbarrier', target: 'self' };
          if (notTifa.length && U.one(b, 3)) return { move: 'grand_spark', target: b.pick(notTifa) };
          if (notTifa.length) return { move: 'attack', target: b.pick(notTifa) };
          return U.one(b, 3) ? { move: 'hesitate', target: 'self' } : { move: 'attack', target: 'random' };
        }
      }
    },

    // =====================================================================
    // ANCIENT FOREST (optional)
    // =====================================================================
    rilfsak: {
      name: 'Rilfsak', level: 40, hp: 2000, mp: 500, exp: 1000, ap: 70, gil: 900,
      atk: 60, def: 90, defPct: 88, mat: 100, mdf: 170, dex: 58, lck: 5,   // FF7: 7/8 chance per hit of Df% 255
      elem: { earth: 0 }, immune: ['frog', 'small'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#50a050', c2: '#c0e080', c3: '#ff40a0', size: 1 },
      attacks: {
        attack: { name: 'Blood Suck', kind: 'drain', power: 16, element: 'hit', target: 'enemy', formula: 'phys', silent: true },
        autumn_leaves: { name: 'Autumn Leaves', kind: 'phys', power: 20, add: ['darkness'], hit: 63, target: 'allEnemies' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(4); v.l = 2; }
          if (v.c <= 1) { v.c++; return { move: 'attack', target: U.highest(b) }; }
          if (v.c === 2) { v.c = 0; return { move: 'wait', target: 'self' }; }
          v.c = b.rnd(3);
          if (v.l > 0) { v.l--; return { move: 'autumn_leaves', target: 'all' }; }
          return { move: 'attack', target: U.highest(b) };
        }
      }
    },

    diablo: {
      name: 'Diablo', level: 41, hp: 4000, mp: 200, exp: 1100, ap: 70, gil: 1100,
      atk: 100, def: 80, defPct: 5, mat: 86, mdf: 110, dex: 75, lck: 10,
      elem: { fire: 0, ice: 0 }, immune: [],
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#6a2020', c2: '#e0a060', c3: '#ffff40', size: 1.3 },
      attacks: {
        attack: { name: 'Horn Bomber', kind: 'phys', power: 30, element: 'hit', target: 'enemy', silent: true },
        flame: { name: 'Flame', kind: 'mag', power: 16, element: 'fire', mp: 16, target: 'enemy' },
        cold: { name: 'Cold', kind: 'mag', power: 16, element: 'ice', mp: 16, target: 'enemy' }
      },
      ai: {
        // answers Fire magic with Cold and Ice magic with Flame (next turn in FF7)
        counter: { byElement: { fire: 'cold', ice: 'flame' }, chance: 100 },
        moves: [['attack', 100]]
      }
    },

    epiolnis: {
      name: 'Epiolnis', level: 36, hp: 1800, mp: 90, exp: 950, ap: 70, gil: 1500,
      atk: 90, def: 58, defPct: 1, mat: 50, mdf: 100, dex: 86, lck: 0,
      elem: { poison: -1 }, immune: ['poison'],
      drops: [], steal: [{ item: 'wizard_bracelet', chance: 14 }], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'bird', c1: '#e0e040', c2: '#40a040', c3: '#ff2020', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Bird Kick', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        catapult: { name: 'Catapult', kind: 'phys', power: 16, target: 'enemy' },
        acid_rain: { name: 'Acid Rain', kind: 'mag', power: 20, element: 'poison', add: ['poison'], hit: 100, mp: 15, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var r = b.rnd(4);
          if (r === 0) return { move: 'acid_rain', target: U.highest(b) };
          if (r === 1) return { move: 'catapult', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    // Battle Square only (planned for the Ancient Forest). HP x2 / Att,MAt x1.25 in the Square.
    ho_chu: {
      name: 'Ho-chu', level: 39, hp: 4300, mp: 290, exp: 750, ap: 70, gil: 2500,
      atk: 96, def: 68, defPct: 1, mat: 86, mdf: 94, dex: 95, lck: 20,
      elem: { water: 2, gravity: 0, poison: -1 },
      immune: ['death', 'sleep', 'poison', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
      drops: [], steal: [{ item: 'circlet', chance: 14 }], morph: 'ribbon',
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#a04080', c2: '#f0c0e0', c3: '#ffff40', size: 1.5, variant: 3 },
      attacks: {
        attack: { name: 'Whip Sting', kind: 'phys', power: 16, add: ['paralysis'], hit: 100, target: 'enemy' },
        big_pollen: { name: 'Big Pollen', kind: 'mag', power: 16, add: ['sleep'], hit: 75, target: 'allEnemies' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.o) { v.o = 1; return { move: 'big_pollen', target: 'all' }; }
          var ch = U.without(b, 'confusion').length ? 4 : 8;
          return U.one(b, ch) ? { move: 'big_pollen', target: 'all' } : { move: 'attack', target: 'random' };
        }
      }
    },

    // =====================================================================
    // SUNKEN GELNIKA (optional)
    // =====================================================================
    reno_3: {
      name: 'Reno', level: 42, hp: 15000, mp: 230, exp: 5000, ap: 300, gil: 4000,
      atk: 100, def: 100, defPct: 12, mat: 85, mdf: 96, dex: 85, lck: 20,
      elem: { gravity: 0 }, immune: TURK_IMM.slice(),
      drops: [], steal: [{ item: 'tough_ring', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#202030', c2: '#e04020', c3: '#ffffff', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Short Staff', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        neo_turk_light: { name: 'Neo Turk Light', kind: 'status', add: ['confusion'], hit: 100, element: 'hit', target: 'enemy' },
        electroprod_2: { name: 'Electroprod 2', kind: 'phys', power: 68, element: 'lightning', target: 'enemy' }
      },
      ai: {
        counter: { byElement: { lightning: 'electroprod_2' }, chance: 100 },   // answers Bolt spells
        moves: [['attack', 50], ['neo_turk_light', 50]]
      }
    },

    rude_5: {
      name: 'Rude', level: 49, hp: 20000, mp: 280, exp: 5500, ap: 360, gil: 5000,
      atk: 110, def: 120, defPct: 0, mat: 75, mdf: 160, dex: 79, lck: 5,
      elem: { gravity: 0 }, immune: TURK_IMM.slice(),
      drops: [{ item: 'elixir', chance: 100 }], steal: [{ item: 'ziedrich', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#202028', c2: '#e0c0a0', c3: '#101010', size: 1.3, variant: 1 },
      attacks: {
        attack: { name: 'Shoulder Attack', kind: 'phys', power: 48, element: 'hit', target: 'enemy', silent: true },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', mp: 22, target: 'enemy' },
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', mp: 22, target: 'enemy' },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', mp: 22, target: 'enemy' },
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', mp: 24, target: 'allAllies' },
        hesitate: { name: '..................', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          var notTifa = U.party(b).filter(function (c) { return !U.isChar(c, 'tifa'); });
          if (e.hpPct < 50) { v.cc = (v.cc || 0) + 1; if (e.mp >= 24 && v.cc >= 2) { v.cc = 0; return { move: 'cure2', target: 'allies' }; } }
          var r = b.rnd(5);
          if (r < 3 && e.mp >= 22 && notTifa.length) return { move: ['ice2', 'bolt2', 'fire2'][r], target: b.pick(notTifa) };
          if (notTifa.length) return { move: 'attack', target: b.pick(notTifa) };
          return U.one(b, 3) ? { move: 'hesitate', target: 'self' } : { move: 'attack', target: 'random' };
        }
      }
    },

    poodler: {
      name: 'Poodler', level: 42, hp: 6000, mp: 220, exp: 900, ap: 70, gil: 2500,
      atk: 98, def: 110, defPct: 2, mat: 85, mdf: 200, dex: 86, lck: 0,
      elem: {}, immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'turbo_ether', chance: 52 }], morph: 'speed_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#d0a0c0', c2: '#604060', c3: '#40ff40', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', mp: 4, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          if (e.hpPct <= 25 && e.mp >= 4 && U.one(b, 3)) return { move: 'fire', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    bad_rap: {
      name: 'Bad Rap', level: 38, hp: 9000, mp: 120, exp: 1100, ap: 70, gil: 2500,
      atk: 70, def: 90, defPct: 2, mat: 100, mdf: 90, dex: 60, lck: 3,
      elem: { poison: -1 }, immune: ['death', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'dazers', chance: 14 }], steal: [{ item: 'ink', chance: 14 }], morph: 'luck_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'serpent', c1: '#606080', c2: '#c0a0e0', c3: '#ffff00', size: 1.4 },
      attacks: {
        attack: { name: 'Whip', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        whip_2: { name: 'Whip', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        big_fang: { name: 'Big Fang', kind: 'phys', power: 42, element: 'hit', target: 'enemy' },
        evil_poison: { name: 'Evil Poison', kind: 'phys', power: 12, element: 'poison', add: ['darkness'], hit: 100, mp: 4, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var sc = e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 3 : (e.hp < e.maxHp ? 4 : 16);
          if (v.c <= 1) { v.c++; return { move: U.one(b, sc) ? 'whip_2' : 'attack', target: 'random' }; }
          if (v.c === 2) {
            if (U.without(b, 'darkness').length && U.one(b, sc)) return { move: 'evil_poison', target: U.pickWithout(b, 'darkness') };
            if (U.one(b, sc)) { v.c = 3; return { move: 'whip_2', target: 'random' }; }
            v.c = 0; return { move: 'attack', target: 'random' };
          }
          v.c = 1; return { move: 'big_fang', target: U.highest(b) };
        }
      }
    },

    unknown: {
      name: 'Unknown', level: 50, hp: 11000, mp: 110, exp: 1500, ap: 150, gil: 5000,
      atk: 110, def: 110, defPct: 1, mat: 110, mdf: 110, dex: 110, lck: 10,
      elem: { fire: -1 }, immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'light_curtain', chance: 5 }], steal: [{ item: 'fire_armlet', chance: 14 }], morph: 'power_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#e080a0', c2: '#ffd0e0', c3: '#ffff40', size: 1.5 },
      attacks: {
        bite: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        tongue: { name: 'Tongue', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        blaster: { name: 'Blaster', kind: 'mag', power: 28, mp: 20, target: 'enemy' },
        blaster_2: { name: 'Blaster', kind: 'mag', power: 28, mp: 20, hits: 2, random: true, target: 'enemy' },
        blaster_3: { name: 'Blaster', kind: 'mag', power: 28, mp: 20, hits: 3, random: true, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(2);
          if (e.hpPct <= 33) { var r = b.rnd(3); return { move: r === 0 ? 'blaster_3' : r === 1 ? 'blaster_2' : 'blaster', target: 'random' }; }
          if (v.c === 0) { v.c = U.one(b, 3) ? 2 : 1; return { move: 'tongue', target: 'random' }; }
          if (v.c === 1) { v.c = 0; return { move: 'tongue', target: 'random' }; }
          v.c = 0; return { move: 'bite', target: 'random' };
        }
      }
    },

    unknown_2: {
      name: 'Unknown 2', level: 51, hp: 13000, mp: 130, exp: 3000, ap: 300, gil: 10000,
      atk: 130, def: 130, defPct: 1, mat: 130, mdf: 130, dex: 130, lck: 12,
      elem: { poison: -1 }, immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'lunar_curtain', chance: 5 }], steal: [{ item: 'aurora_armlet', chance: 14 }], morph: 'guard_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#80c080', c2: '#e0ffe0', c3: '#ff4080', size: 1.4, variant: 1 },
      attacks: {
        attack: { name: 'Tentacle', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        q_needle: { name: '? Needle', kind: 'status', add: ['paralysis'], hit: 100, element: 'hit', target: 'enemy' },
        abnormal_breath: { name: 'Abnormal Breath', kind: 'status', add: ['confusion'], hit: 100, element: 'hit', mp: 11, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e), t = U.pickWithout(b, 'confusion');
          if (!v.o) { v.o = 1; return { move: 'abnormal_breath', target: t }; }
          if (e.hpPct <= 25 && U.one(b, 2)) return { move: 'q_needle', target: 'random' };
          if (e.hpPct <= 50 && U.one(b, 2)) return { move: 'abnormal_breath', target: t };
          return { move: 'attack', target: t };
        }
      }
    },

    unknown_3: {
      name: 'Unknown 3', level: 52, hp: 15000, mp: 150, exp: 900, ap: 200, gil: 7500,
      atk: 150, def: 150, defPct: 1, mat: 150, mdf: 150, dex: 150, lck: 13,
      elem: { lightning: -1 }, immune: ['death', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'holy_torch', chance: 5 }], steal: [{ item: 'bolt_armlet', chance: 14 }], morph: 'magic_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#a080e0', c2: '#e0d0ff', c3: '#40ffff', size: 1.4, variant: 2 },
      attacks: {
        poison_fang: { name: 'Poison Fang', kind: 'phys', power: 48, element: 'poison', add: ['poison'], hit: 100, target: 'enemy' },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', mp: 22, target: 'enemy' },
        slap: { name: 'Slap', kind: 'phys', power: 48, element: 'hit', add: ['fury'], hit: 100, target: 'enemy' },
        creepy_touch: { name: 'Creepy Touch', kind: 'status', add: ['sadness'], hit: 100, element: 'hit', mp: 13, target: 'enemy' },
        wait: idle()
      },
      ai: {
        counter: { phys: 'creepy_touch', mag: 'creepy_touch', chance: 50 },
        custom: function (e, b) {
          var clean = U.without(b, 'poison');
          if (!clean.length) return { move: 'wait', target: 'self' };
          var t = b.pick(clean), r = b.rnd(7);
          if (r < 4) return { move: 'poison_fang', target: t };
          if (r === 4) return { move: 'slap', target: t };
          return { move: 'bolt2', target: t };
        }
      }
    },

    serpent: {
      name: 'Serpent', level: 40, hp: 14000, mp: 290, exp: 1400, ap: 70, gil: 2500,
      atk: 140, def: 120, defPct: 1, mat: 80, mdf: 324, dex: 110, lck: 0,
      elem: { wind: 2, earth: 0, gravity: 0, water: -1 },
      immune: ['death', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'dragon_scales', chance: 14 }, { item: 'stardust', chance: 5 }], steal: [{ item: 'water_ring', chance: 52 }], morph: 'mind_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'serpent', c1: '#206080', c2: '#80d0e0', c3: '#ffd000', size: 2 },
      attacks: {
        viper_breath: { name: 'Viper Breath', kind: 'mag', power: 20, element: 'water', elements: ['ice', 'water'], mp: 20, target: 'enemy' },
        aqualung: { name: 'Aqualung', kind: 'mag', power: 52, element: 'water', mp: 34, target: 'allEnemies', eskill: 'aqualung' },
        huge_tidal_wave: { name: 'Huge Tidal Wave', kind: 'phys', power: 20, element: 'water', mp: 20, target: 'allEnemies' },
        dragon_dance: { name: 'Dragon Dance', kind: 'phys', power: 20, target: 'allEnemies' },
        wait: idle()
      },
      ai: {
        // attacks chosen by its HP relative to the party's average HP
        custom: function (e, b) {
          var v = U.v(e);
          if (v.t === undefined) v.t = 1;
          var avg = U.partyHpAvg(b);
          if (e.hp <= avg * 0.2) { if (v.t <= 0) { v.t = 2; return { move: 'dragon_dance', target: 'all' }; } v.t--; return { move: 'wait', target: 'self' }; }
          if (e.hp <= avg * 0.4) { if (v.t <= 0) { v.t = 1; return { move: 'huge_tidal_wave', target: 'all' }; } v.t--; return { move: 'wait', target: 'self' }; }
          if (e.hp <= avg * 0.8) return { move: 'aqualung', target: 'all' };
          return { move: 'viper_breath', target: U.highest(b) };
        }
      }
    },

    // =====================================================================
    // DIAMOND WEAPON (Midgar coast, Disc 2 story battle)
    // =====================================================================
    diamond_weapon: {
      name: 'Diamond Weapon', level: 49, hp: 30000, mp: 30000, exp: 35000, ap: 3500, gil: 25000,
      atk: 50, def: 250, defPct: 1, mat: 50, mdf: 250, dex: 180, lck: 0,
      elem: { lightning: 2, fire: 0.5, gravity: 0 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [], steal: [{ item: 'rising_sun', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      // immune to physical attacks (except Limit Breaks) unless its chest is open (e.vars.vulnerable)
      physImmune: true,
      look: { type: 'custom', id: 'diamond_weapon', c1: '#b0b8c8', c2: '#f0f0ff', c3: '#40ffff', size: 3 },
      attacks: {
        diamond_fire: { name: 'Diamond Fire', kind: 'mag', power: 24, element: 'fire', target: 'enemy', silent: true },
        foot_stamp: { name: 'Foot Stamp', kind: 'mag', power: 32, target: 'enemy', silent: true },
        diamond_flash: { name: 'Diamond Flash', kind: 'pct', pct: 88, add: ['silence'], hit: 100, target: 'allEnemies' },
        countdown: { name: 'Countdown', kind: 'mag', power: 24, element: 'fire', target: 'enemy' },
        count_3: { name: '3', kind: 'mag', power: 24, element: 'fire', target: 'enemy' },
        count_2: { name: '2', kind: 'mag', power: 24, element: 'fire', target: 'enemy' },
        count_1: { name: '1', kind: 'mag', power: 24, element: 'fire', target: 'enemy' }
      },
      ai: {
        // FF7 opens its chest ("Countdown") after the party uses 2-3 Summons/Limits;
        // approximated as every 6th turn, and immediately after dropping below 50% HP.
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0; v.t = (v.t || 0) + 1;
          if (v.c === 0 || v.c === 1) {
            if (v.t % 6 === 0 || (!v.half && e.hpPct <= 50)) { v.half = v.half || e.hpPct <= 50; v.c = 2; }
          }
          if (v.c === 0) { if (b.rnd(3) < 2) v.c = 1; return { move: 'diamond_fire', target: 'random' }; }
          if (v.c === 1) { if (b.rnd(4) < 3) v.c = 0; return { move: 'foot_stamp', target: U.highest(b) }; }
          if (v.c === 2) { v.c = 3; v.vulnerable = true; return { move: 'countdown', target: 'random' }; }
          if (v.c === 3) { v.c = 4; return { move: 'count_2', target: 'random' }; }
          if (v.c === 4) { v.c = 5; return { move: 'count_1', target: 'random' }; }
          v.c = 0; v.vulnerable = false;
          return { move: 'diamond_flash', target: 'all' };
        }
      }
    },

    // =====================================================================
    // MIDGAR RAID — SECTOR 8 UNDERGROUND / TRAIN TUNNELS
    // =====================================================================
    behemoth: {
      name: 'Behemoth', level: 45, hp: 7000, mp: 400, exp: 1500, ap: 100, gil: 2200,
      atk: 140, def: 120, defPct: 6, mat: 110, mdf: 200, dex: 120, lck: 20,
      elem: {}, immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
      drops: [{ item: 'stardust', chance: 14 }], steal: [{ item: 'phoenix_down', chance: 52 }, { item: 'war_gong', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#704080', c2: '#d0b0a0', c3: '#ffd000', size: 1.7, variant: 1 },
      attacks: {
        behemoth_horn: { name: 'Behemoth Horn', kind: 'phys', power: 18, element: 'punch', target: 'enemy', silent: true },
        behemoth_horn_2: { name: 'Behemoth Horn', kind: 'phys', power: 18, element: 'punch', hits: 2, random: true, target: 'enemy', silent: true },
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        claw_2: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', hits: 2, random: true, target: 'enemy' },
        // damage = caster's max HP - current HP
        question: { name: '????', kind: 'special', special: 'question', mp: 3, target: 'enemy', eskill: 'question' },
        flare: { name: 'Flare', kind: 'mag', power: 115, element: 'fire', mp: 100, target: 'enemy' }
      },
      ai: {
        counter: { mag: 'flare', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(5);
          var sc = e.hpPct <= 50 ? 3 : e.hpPct <= 75 ? 4 : 8;
          if (v.c <= 1) { var m = U.one(b, sc) ? 'claw_2' : 'attack'; v.c = U.one(b, sc) ? 4 : v.c + 1; return { move: m, target: 'random' }; }
          if (v.c <= 3) { var h = U.one(b, sc) ? 'behemoth_horn_2' : 'behemoth_horn'; v.c = U.one(b, sc) ? 4 : v.c + 1; return { move: h, target: 'random' }; }
          v.c = b.rnd(3);
          if (e.mp >= 3 && U.one(b, sc)) return { move: 'question', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    cromwell: {
      name: 'Cromwell', level: 42, hp: 3500, mp: 120, exp: 800, ap: 80, gil: 1500,
      atk: 100, def: 110, defPct: 1, mat: 75, mdf: 104, dex: 70, lck: 6,
      elem: { lightning: 2 }, immune: MACH_IMM.slice(),
      drops: [{ item: '8inch_cannon', chance: 5 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'tank', c1: '#606860', c2: '#909880', c3: '#ff3000', size: 1.4, variant: 1 },
      attacks: {
        attack: { name: 'Normal Shell', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        normal_shell_2: { name: 'Normal Shell', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' }
      },
      ai: { moves: [['attack', 50], ['normal_shell_2', 50]] }
    },

    // Appears as a group of three; only one Manhole is "open" at a time in FF7.
    manhole: {
      name: 'Manhole', level: 35, hp: 2500, mp: 110, exp: 900, ap: 80, gil: 3000,
      atk: 100, def: 120, defPct: 20, mat: 70, mdf: 110, dex: 90, lck: 8,
      elem: {},
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'death_sentence', 'manipulate', 'peerless', 'paralysis', 'darkness', 'resist'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      onDeathRemove: ['manhole'],   // destroying the open Manhole removes the other two (no rewards for them)
      look: { type: 'rock', c1: '#606060', c2: '#a0a0a0', c3: '#ffff00', size: 1, variant: 3 },
      attacks: {
        attack: { name: 'Rockbreaker', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', mp: 22, target: 'allEnemies' },
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', mp: 22, target: 'allEnemies' },
        change: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.k === undefined) { v.k = b.rnd(3); v.c = 0; }
          if (v.c === 0) { v.c = 2; return { move: 'attack', target: 'random' }; }
          if (v.c === 1 && v.k > 0 && e.mp >= 22) { v.c = 3; return { move: v.k === 1 ? 'ice2' : 'fire2', target: 'all' }; }
          v.c = (v.c === 2 && v.k > 0) ? 1 : 0;
          return { move: 'change', target: 'self' };
        }
      }
    },

    crazy_saw: {
      name: 'Crazy Saw', level: 44, hp: 3900, mp: 340, exp: 800, ap: 80, gil: 1300,
      atk: 116, def: 100, defPct: 10, mat: 96, mdf: 120, dex: 80, lck: 2,
      elem: { lightning: 2 }, immune: MACH_IMM.slice(),
      drops: [{ item: 'phoenix_down', chance: 14 }, { item: 'ether', chance: 14 }], steal: [{ item: 'mute_mask', chance: 52 }], morph: 'turbo_ether',
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#a09060', c2: '#606060', c3: '#ff2020', size: 1.2, variant: 2 },
      attacks: {
        uppercut: { name: 'Uppercut', kind: 'phys', power: 16, element: 'shoot', add: ['confusion'], hit: 100, target: 'enemy', silent: true },
        attack: { name: 'Rifle', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var t = U.pickWithout(b, 'confusion');
          if (v.c === 0) { v.c = 1; if (U.without(b, 'confusion').length) return { move: 'uppercut', target: t }; }
          if (v.c <= 2) { v.c++; return { move: 'attack', target: t }; }
          v.c = b.rnd(2); return { move: 'attack', target: t };
        }
      }
    },

    shadow_maker: {
      name: 'Shadow Maker', level: 42, hp: 2000, mp: 120, exp: 500, ap: 25, gil: 500,
      atk: 90, def: 90, defPct: 20, mat: 75, mdf: 68, dex: 40, lck: 30,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['manipulate']),
      drops: [{ item: 'turbo_ether', chance: 100 }], steal: [{ item: 'graviball', chance: 100 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#303040', c2: '#8080a0', c3: '#ff00ff', size: 1, variant: 3 },
      attacks: {
        support_beam: { name: 'Support Beam', kind: 'status', add: ['slow'], hit: 100, mp: 8, target: 'enemy', silent: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          if (e.mp >= 8 && U.without(b, 'slow').length) return { move: 'support_beam', target: U.pickWithout(b, 'slow') };
          return { move: 'wait', target: 'self' };
        }
      }
    },

    // The Turks, Sector 8 underground. As soon as any one falls, all three leave.
    elena_2: {
      name: 'Elena', level: 53, hp: 30000, mp: 100, exp: 6400, ap: 800, gil: 7000,
      atk: 75, def: 90, defPct: 5, mat: 100, mdf: 190, dex: 85, lck: 20,
      elem: { gravity: 0, ice: -1 }, immune: imm(TURK_IMM, ['stop', 'paralysis']),
      drops: [], steal: [{ item: 'minerva_band', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['reno_4', 'rude_4'],
      look: { type: 'humanoid', c1: '#202030', c2: '#f0d060', c3: '#ffffff', size: 1.25, variant: 3 },
      attacks: {
        attack: { name: 'Kick', kind: 'phys', power: 40, element: 'hit', acc: 90, target: 'enemy', silent: true },
        // FF7: a 1-Op status attack, MAt% 90, [80] Confusion (the script picks one of "all opponents")
        bewildered: { name: 'Bewildered', kind: 'status', add: ['confusion'], hit: 90, statusChance: 80, target: 'enemy', silent: true },
        throw_fire: { name: 'Throw', kind: 'phys', power: 32, element: 'fire', acc: 90, target: 'allEnemies', silent: true },
        throw: { name: 'Throw', kind: 'phys', power: 24, element: 'shoot', acc: 90, noCover: true, target: 'enemy', silent: true },
        yeow: { name: 'Yeow! That hurts!', kind: 'special', special: 'nothing', target: 'self' },
        wait: idle()
      },
      ai: {
        // Enemy Mechanics FAQ: she opens with the fire Throw on everyone; in the front row (Range 1) she Kicks or
        // Throws; two hits taken there send her to the back row (Range 3: behind Reno and Rude, so short-range
        // hits on her and her own Throws are halved), where she idles, casts Bewildered, Throws four times and
        // comes back with the fire Throw (also after two more hits taken back there)
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.o) { v.o = 1; v.c = 0; v.back = 0; v.hits = 0; return { move: 'throw_fire', target: 'all' }; }
          if (!v.back) return { move: U.one(b, 2) ? 'attack' : 'throw', target: 'random' };
          if (v.c === 0) { v.c = 1; return { move: 'wait', target: 'self' }; }
          if (v.c === 1) { v.c = 2; return { move: 'bewildered', target: 'random' }; }
          if (v.c <= 5) { v.c++; return { move: 'throw', target: 'random' }; }
          v.c = 0; v.hits = 0; v.back = 0; e.row = 'front';
          return { move: 'throw_fire', target: 'all' };
        },
        // AI: Counter - General (every hit taken; the Auto-battle's dry run passes act === null: the row stays)
        counter: {
          custom: function (e, b, src, kind, act) {
            var v = U.v(e);
            v.hits = (v.hits || 0) + 1;
            if (v.hits < 2) return null;
            v.hits = 0; v.c = 0;
            if (!v.back) { v.back = 1; if (act !== null) e.row = 'back'; return { move: 'yeow', target: 'self' }; }
            v.back = 0; if (act !== null) e.row = 'front';
            return { move: 'throw_fire', target: 'all' };
          }
        }
      }
    },

    reno_4: {
      name: 'Reno', level: 50, hp: 25000, mp: 200, exp: 4500, ap: 450, gil: 3000,
      atk: 100, def: 120, defPct: 5, mat: 105, mdf: 106, dex: 80, lck: 20,
      elem: { gravity: 0, lightning: -1 }, immune: imm(TURK_IMM, ['stop', 'paralysis']),
      drops: [{ item: 'elixir', chance: 100 }], steal: [{ item: 'tough_ring', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['elena_2', 'rude_4'],
      look: { type: 'humanoid', c1: '#202030', c2: '#e04020', c3: '#ffffff', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Short Staff', kind: 'phys', power: 20, element: 'hit', acc: 110, target: 'enemy', silent: true },
        turk_light: { name: 'Turk Light', kind: 'mag', power: 12, hit: 90, target: 'enemy' },
        electroprod: { name: 'Electroprod', kind: 'phys', power: 48, element: 'lightning', acc: 90, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          if (v.c === 0) { v.c = 1; return { move: 'attack', target: 'random' }; }
          if (v.c === 1) { v.c = 2; return { move: U.one(b, 2) ? 'electroprod' : 'attack', target: 'random' }; }
          v.c = 0; return { move: 'turk_light', target: 'random' };
        }
      }
    },

    rude_4: {
      name: 'Rude', level: 51, hp: 28000, mp: 250, exp: 5500, ap: 600, gil: 5000,
      atk: 110, def: 130, defPct: 0, mat: 83, mdf: 190, dex: 70, lck: 20,
      elem: { gravity: 0, fire: -1 }, immune: imm(TURK_IMM, ['stop', 'paralysis']),
      drops: [{ item: 'elixir', chance: 100 }], steal: [{ item: 'ziedrich', chance: 52 }], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['elena_2', 'reno_4'],
      look: { type: 'humanoid', c1: '#202028', c2: '#e0c0a0', c3: '#101010', size: 1.3, variant: 1 },
      attacks: {
        attack: { name: 'Shoulder Attack', kind: 'phys', power: 48, element: 'hit', acc: 90, target: 'enemy', silent: true },
        grand_spark: { name: 'Grand Spark', kind: 'mag', power: 24, element: 'hit', target: 'enemy' },
        hesitate: { name: '..................', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var all = U.party(b);
          var notTifa = all.filter(function (c) { return !U.isChar(c, 'tifa'); });
          if (!notTifa.length) return U.one(b, 3) ? { move: 'attack', target: 'random' } : { move: 'hesitate', target: 'self' };
          // Enemy Mechanics FAQ (BUG): with two or more targets other than Tifa his 1-Op attack can't take them
          // both and falls on a random member of the whole party, Tifa included; only Tifa + one other is spared
          var t = notTifa.length > 1 ? b.pick(all) : notTifa[0], c = v.c;
          v.c = c >= 6 ? 0 : c + 1;
          return { move: (c === 2 || c === 6) ? 'grand_spark' : 'attack', target: t };
        }
      }
    },

    // =====================================================================
    // MIDGAR RAID — THE MAKO CANNON (Sister Ray)
    // =====================================================================
    proud_clod: {
      name: 'Proud Clod', level: 53, hp: 60000, mp: 320, exp: 7000, ap: 1000, gil: 10000,
      atk: 102, def: 170, defPct: 1, mat: 120, mdf: 300, dex: 88, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [{ item: 'ragnarok', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['jamar_armor'],
      look: { type: 'custom', id: 'proud_clod', c1: '#707888', c2: '#c8b070', c3: '#ff2020', size: 3 },
      attacks: {
        attack: { name: 'Big Hand Clash', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        big_hand_clash_2: { name: 'Big Hand Clash', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy', silent: true },
        wrist_laser: { name: 'Wrist Laser', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        wrist_laser_2: { name: 'Wrist Laser', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        knee_fire: { name: 'Knee Fire', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        knee_fire_2: { name: 'Knee Fire', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        knee_blend: { name: 'Knee Blend', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        knee_blend_2: { name: 'Knee Blend', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        w_machine_gun: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', target: 'enemy', silent: true },
        w_machine_gun_2: { name: 'W Machine Gun', kind: 'phys', power: 28, element: 'shoot', hits: 2, random: true, target: 'enemy', silent: true },
        materia_jammer: { name: 'Materia-jammer', kind: 'status', add: ['reflect'], hit: 100, mp: 16, target: 'enemy' },
        kneel: idle(),
        charging: { name: 'Charging', kind: 'special', special: 'nothing', target: 'self' },
        beam_cannon: { name: 'Beam Cannon', kind: 'mag', power: 20, element: 'shoot', mp: 32, target: 'allEnemies' },
        stand: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(7);
          var sc = e.hpPct <= 20 ? 1 : e.hpPct <= 40 ? 2 : e.hpPct <= 60 ? 3 : e.hpPct <= 80 ? 4 : 5;
          var two = U.one(b, sc), atk = null;
          switch (v.c) {
            case 0: case 1: atk = 'w_machine_gun'; v.c = 2 + b.rnd(2); break;
            case 2: atk = 'attack'; v.c = 4 + b.rnd(2); break;
            case 3: atk = 'wrist_laser'; v.c = 4 + b.rnd(2); break;
            case 4: atk = 'knee_fire'; v.c = 6; break;
            case 5: atk = 'knee_blend'; v.c = 6; break;
            case 6:
              v.c = sc <= 3 ? 7 : b.rnd(2);
              var jamar = U.count(b, 'jamar_armor') > 0 || (U.find(b, 'jamar_armor') === null && U.foes(b).length > 1);
              if (jamar && U.without(b, 'reflect').length) {
                if (e.mp >= 16 && U.one(b, sc)) return { move: 'materia_jammer', target: U.pickWithout(b, 'reflect') };
                atk = 'attack';
              } else atk = 'w_machine_gun';
              break;
            case 7: v.c = 8; return { move: 'kneel', target: 'self' };
            case 8: v.c = 9; return { move: 'charging', target: 'self' };
            case 9: v.c = 10; return { move: 'beam_cannon', target: 'all' };
            default: v.c = b.rnd(2); return { move: 'stand', target: 'self' };
          }
          if (two) atk = atk === 'attack' ? 'big_hand_clash_2' : atk + '_2';
          return { move: atk, target: 'random' };
        }
      }
    },

    jamar_armor: {
      name: 'Jamar Armor', level: 62, hp: 20000, mp: 300, exp: 8000, ap: 1500, gil: 10000,
      atk: 130, def: 200, defPct: 1, mat: 109, mdf: 330, dex: 110, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['sadness', 'fury', 'haste', 'slow', 'darkness']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'mech', c1: '#8a6040', c2: '#c0c0c0', c3: '#ffd000', size: 1.6, variant: 3 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },   // never attacks
      desc: 'Armour plating of the Proud Clod.'
    },

    // Grosspanzer: Mobile controls every attack; Big/Small parts only change which attacks it has.
    grosspanzer_big: {
      name: 'Grosspanzer·Big', level: 46, hp: 4600, mp: 200, exp: 800, ap: 80, gil: 2100,
      atk: 140, def: 120, defPct: 1, mat: 124, mdf: 160, dex: 110, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['confusion', 'haste', 'slow', 'stop', 'slow_numb', 'petrify', 'manipulate', 'berserk']),
      drops: [{ item: '8inch_cannon', chance: 100 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'tank', c1: '#5a6050', c2: '#a0a080', c3: '#ff4000', size: 1.4, variant: 2 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } }
    },

    grosspanzer_small: {
      name: 'Grosspanzer·Small', level: 42, hp: 2900, mp: 160, exp: 600, ap: 80, gil: 700,
      atk: 120, def: 100, defPct: 1, mat: 90, mdf: 130, dex: 136, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['confusion', 'haste', 'slow', 'stop', 'slow_numb', 'petrify', 'manipulate', 'berserk']),
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'tank', c1: '#5a6050', c2: '#a0a080', c3: '#ff4000', size: 0.9, variant: 3 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } }
    },

    grosspanzer_mobile: {
      name: 'Grosspanzer·Mobile', level: 50, hp: 10000, mp: 300, exp: 400, ap: 80, gil: 1400,
      atk: 160, def: 136, defPct: 10, mat: 111, mdf: 160, dex: 75, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['confusion', 'haste', 'slow', 'stop', 'slow_numb', 'petrify', 'manipulate', 'berserk']),
      drops: [], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      onDeathRemove: ['grosspanzer_big', 'grosspanzer_small'],
      look: { type: 'tank', c1: '#5a6050', c2: '#a0a080', c3: '#ff4000', size: 1.5, variant: 1 },
      attacks: {
        napalm_bomb: { name: 'Napalm Bomb', kind: 'phys', power: 24, element: 'fire', target: 'enemy', silent: true },
        normal_shell_lo: { name: 'Normal Shell', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        normal_shell_hi: { name: 'Normal Shell', kind: 'phys', power: 30, element: 'shoot', target: 'enemy', silent: true },
        bodyblow: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        deadly_wheel: { name: 'Deadly Wheel', kind: 'phys', power: 16, element: 'hit', target: 'allEnemies', silent: true },
        deadly_wheel_2: { name: 'Deadly Wheel', kind: 'phys', power: 16, element: 'hit', hits: 2, target: 'allEnemies', silent: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var big = U.count(b, 'grosspanzer_big'), small = U.count(b, 'grosspanzer_small');
          if (!U.find(b, 'grosspanzer_big') && !U.find(b, 'grosspanzer_small') && U.foes(b).length === 4) { big = 1; small = 2; }
          // FF7 BattleVar PanzerPartsDead: +1 for Big, +2 per Small destroyed
          var dead = (big ? 0 : 1) + (small >= 2 ? 0 : small === 1 ? 2 : 4);
          var c = v.c, R = 'random';
          if (dead === 0) {
            v.c = c >= 8 ? 0 : c + 1;
            if (c <= 2 || c === 4 || c === 5) return { move: 'normal_shell_hi', target: R };
            if (c === 3 || c === 6) return { move: 'napalm_bomb', target: R };
            if (c === 7) return { move: 'deadly_wheel', target: 'all' };
            return { move: 'bodyblow', target: R };
          }
          if (dead === 1) { v.c = c >= 3 ? 0 : c + 1; return c <= 2 ? { move: 'normal_shell_hi', target: R } : { move: 'deadly_wheel', target: 'all' }; }
          if (dead === 2) { v.c = c >= 3 ? 0 : c + 1; return c <= 2 ? { move: 'normal_shell_lo', target: R } : { move: 'napalm_bomb', target: R }; }
          if (dead === 3) { v.c = c >= 3 ? 0 : c + 1; return c <= 2 ? { move: 'normal_shell_lo', target: R } : { move: 'deadly_wheel', target: 'all' }; }
          if (dead === 4) {
            v.c = c >= 3 ? 0 : c + 1;
            if (c === 1) return { move: 'deadly_wheel', target: 'all' };
            if (c === 3) return { move: 'napalm_bomb', target: R };
            return { move: 'wait', target: 'self' };
          }
          v.c = c >= 3 ? 0 : c + 1;
          if (c === 0) return { move: 'deadly_wheel_2', target: 'all' };
          if (c === 1) return { move: 'deadly_wheel', target: 'all' };
          if (c === 2) return { move: 'wait', target: 'self' };
          return { move: 'bodyblow', target: R };
        }
      }
    },

    soldier_1st: {
      name: 'SOLDIER:1st', level: 44, hp: 5000, mp: 400, exp: 960, ap: 90, gil: 2400,
      atk: 100, def: 94, defPct: 4, mat: 85, mdf: 120, dex: 90, lck: 20,
      elem: {}, immune: ['manipulate'],
      drops: [], steal: [{ item: 'shinra_alpha', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#1a1a40', c2: '#d0c0a0', c3: '#60c0ff', size: 1.05, variant: 3 },
      attacks: {
        attack: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        fight_2: { name: 'Fight', kind: 'phys', power: 16, element: 'cut', hits: 2, random: true, target: 'enemy', silent: true },
        silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 94, mp: 24, target: 'enemy' },
        sword_of_doom: { name: 'Sword of Doom', kind: 'phys', power: 48, element: 'cut', target: 'enemy' },
        quadra_cut: { name: 'Quadra-Cut', kind: 'phys', power: 48, element: 'cut', target: 'enemy', silent: true }
      },
      ai: {
        counter: { mag: 'silence', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          var th = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (th > (v.th || 0)) { v.th = th; return { move: th === 3 ? 'sword_of_doom' : 'quadra_cut', target: 'random' }; }
          return { move: U.one(b, U.sc(e, [2, 3, 4, 5])) ? 'fight_2' : 'attack', target: 'random' };
        }
      }
    },

    xcannon: {
      name: 'XCannon', level: 46, hp: 20000, mp: 100, exp: 2000, ap: 90, gil: 3000,
      atk: 80, def: 120, defPct: 1, mat: 60, mdf: 400, dex: 80, lck: 0,
      elem: { lightning: 2 }, immune: imm(MACH_IMM, ['death', 'confusion', 'haste', 'slow', 'stop', 'slow_numb', 'petrify', 'manipulate']),
      drops: [{ item: 'turbo_ether', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'machine', c1: '#707880', c2: '#303840', c3: '#ff0000', size: 1.6, variant: 3 },
      attacks: {
        search: { name: 'Target: set', kind: 'special', special: 'nothing', target: 'self' },
        count_3: { name: '3', kind: 'special', special: 'nothing', target: 'self' },
        count_2: { name: '2', kind: 'special', special: 'nothing', target: 'self' },
        count_1: { name: '1', kind: 'special', special: 'nothing', target: 'self' },
        dragon_cannon: { name: 'Dragon Cannon', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies' },
        wait: idle()
      },
      ai: { cycle: ['search', 'count_3', 'count_2', 'count_1', 'dragon_cannon', 'wait'] }
    },

    maximum_kimaira: {
      name: 'Maximum Kimaira', level: 49, hp: 4000, mp: 350, exp: 1200, ap: 90, gil: 3800,
      atk: 120, def: 140, defPct: 5, mat: 100, mdf: 126, dex: 90, lck: 6,
      elem: {}, immune: ['death', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
      drops: [], steal: [], morph: 'guard_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#806030', c2: '#c0c0c0', c3: '#ff3030', size: 1.6, variant: 2 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        claw_2: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', hits: 2, random: true, target: 'enemy', silent: true },
        freeze: { name: 'Freeze', kind: 'mag', power: 95, element: 'ice', add: ['stop'], hit: 100, mp: 82, target: 'enemy' },
        northern_cross: { name: 'Northern Cross', kind: 'status', add: ['poison'], hit: 100, mp: 30, target: 'enemy' }
      },
      ai: {
        counter: { phys: 'attack', chance: 15 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { v.c = b.rnd(4); v.fz = 3; }
          var sc = U.sc(e, [2, 4, 6, 8]);
          if (v.c <= 1) { v.c++; }
          else if (v.c === 2) {
            var next = U.one(b, sc) ? 3 : 0;
            v.c = next;
            if (U.without(b, 'poison').length && e.mp >= 30) return { move: 'northern_cross', target: U.pickWithout(b, 'poison') };
          } else {
            v.c = 0;
            if (e.mp >= 82 && U.one(b, sc) && v.fz > 0) { v.fz--; return { move: 'freeze', target: 'random' }; }
          }
          // otherwise Claw (1-2 hits), preferring unpoisoned targets
          return { move: U.one(b, sc) ? 'claw_2' : 'attack', target: U.pickWithout(b, 'poison') };
        }
      }
    },

    // Hojo -> Helletic Hojo (+ arms) -> Lifeform-Hojo N, one continuous battle (phaseNext hook).
    hojo: {
      name: 'Hojo', level: 50, hp: 13000, mp: 250, exp: 0, ap: 0, gil: 0,
      atk: 60, def: 130, defPct: 5, mat: 60, mdf: 150, dex: 78, lck: 6,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'back',
      onDeathRemove: ['poodler_sample', 'bad_rap_sample'],
      phaseNext: ['helletic_hojo', 'right_arm_b', 'left_arm_b'],
      look: { type: 'humanoid', c1: '#e0e0e0', c2: '#404040', c3: '#80ff80', size: 1.1, variant: 0 },
      attacks: {
        // the samples start dead; Hojo's Capsule brings them (back) to life at full HP
        capsule: { name: 'Capsule', kind: 'special', special: 'callHelp', summon: 'poodler_sample', target: 'self' },
        capsule_b: { name: 'Capsule', kind: 'special', special: 'callHelp', summon: 'bad_rap_sample', target: 'self' },
        laugh: { name: 'Gwah, haw, haw!!', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          var known = U.find(b, 'hojo') !== null || U.foes(b).some(function (c) { return U.id(c) !== null; });
          var poodler = U.count(b, 'poodler_sample'), badrap = U.count(b, 'bad_rap_sample');
          if (!known) { poodler = v.p ? 1 : 0; badrap = v.r ? 1 : 0; }
          if (!poodler) { v.p = 1; return { move: 'capsule', target: 'self' }; }
          if (!badrap) { v.r = 1; return { move: 'capsule_b', target: 'self' }; }
          return { move: 'laugh', target: 'self' };
        }
      },
      desc: 'Professor Hojo atop the Sister Ray.'
    },

    // Rewards are 0: in FF7 only Lifeform-Hojo N awards EXP/AP/Gil (samples list 2000 EXP, 150 AP, 2000/2200 Gil).
    poodler_sample: {
      name: 'Poodler Sample', level: 42, hp: 10000, mp: 200, exp: 0, ap: 0, gil: 0,
      atk: 93, def: 100, defPct: 1, mat: 55, mdf: 130, dex: 80, lck: 0,
      elem: {}, immune: ['confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'beast', c1: '#b080a0', c2: '#503050', c3: '#40ff40', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', mp: 22, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          if (e.hpPct <= 25 && e.mp >= 22 && U.one(b, 3)) return { move: 'fire2', target: 'random' };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    bad_rap_sample: {
      name: 'Bad Rap Sample', level: 34, hp: 11000, mp: 120, exp: 0, ap: 0, gil: 0,
      atk: 96, def: 120, defPct: 2, mat: 100, mdf: 160, dex: 89, lck: 3,
      elem: {}, immune: ['confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'serpent', c1: '#505070', c2: '#b090d0', c3: '#ffff00', size: 1.4 },
      attacks: {
        attack: { name: 'Whip', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        whip_2: { name: 'Whip', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        big_fang: { name: 'Big Fang', kind: 'phys', power: 42, element: 'hit', target: 'enemy' },
        evil_poison: { name: 'Evil Poison', kind: 'phys', power: 12, element: 'poison', add: ['darkness'], hit: 100, mp: 4, target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var sc = e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 3 : (e.hp < e.maxHp ? 4 : 16);
          if (v.c <= 1) { v.c++; return { move: U.one(b, sc) ? 'whip_2' : 'attack', target: 'random' }; }
          if (v.c === 2) {
            if (U.without(b, 'darkness').length && U.one(b, sc)) return { move: 'evil_poison', target: U.pickWithout(b, 'darkness') };
            v.c = 0; return { move: 'attack', target: 'random' };
          }
          v.c = 1; return { move: 'big_fang', target: U.highest(b) };
        }
      }
    },

    helletic_hojo: {
      name: 'Helletic Hojo', level: 55, hp: 26000, mp: 200, exp: 0, ap: 0, gil: 0,
      atk: 80, def: 140, defPct: 6, mat: 60, mdf: 200, dex: 68, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['right_arm_b', 'left_arm_b'],
      phaseNext: ['lifeform_hojo_n'],
      look: { type: 'demon', c1: '#c0a0a0', c2: '#604040', c3: '#80ff40', size: 2.2, variant: 1 },
      attacks: {
        pile_banger: { name: 'Pile Banger', kind: 'phys', power: 50, element: 'punch', target: 'enemy', silent: true },
        pile_banger_2: { name: 'Pile Banger', kind: 'phys', power: 50, element: 'punch', hits: 2, random: true, target: 'enemy', silent: true },
        bio_gas: { name: 'Bio Gas', kind: 'mag', power: 16, element: 'shoot', add: ['poison'], hit: 100, mp: 15, target: 'enemy' },
        confu: { name: 'Confu', kind: 'status', add: ['confusion'], hit: 94, mp: 18, target: 'enemy' },
        sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 100, mp: 8, target: 'enemy' },
        silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 94, mp: 24, target: 'enemy' },
        right_arm_revive: { name: 'Right Arm Revive', kind: 'special', special: 'callHelp', summon: 'right_arm_b', target: 'self', silent: true },
        transform: { name: 'Transform', kind: 'special', special: 'transform', into: 'lifeform_hojo_n', target: 'self', silent: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(5);
          var ids = U.foes(b).some(function (c) { return U.id(c) !== null; });
          var ra = ids ? U.count(b, 'right_arm_b') : 1, la = ids ? U.count(b, 'left_arm_b') : 1;
          if (!ra && !la) return { move: 'transform', target: 'self' };   // both arms destroyed
          var pbT = function () {
            var l = U.party(b).filter(function (c) { return !b.has(c, 'confusion') && !b.has(c, 'sleep'); });
            return U.pick(b, l);
          };
          if (ra && la) {
            if (v.c <= 1) { v.c++; return { move: U.one(b, 3) ? 'pile_banger_2' : 'pile_banger', target: pbT() }; }
            if (v.c === 2) { v.c = U.one(b, 3) ? 3 : 4; return { move: U.one(b, 3) ? 'pile_banger_2' : 'pile_banger', target: pbT() }; }
            var tgt = U.party(b).filter(function (c) { return !b.has(c, 'confusion') && !b.has(c, 'poison') && !b.has(c, 'reflect'); });
            if (v.c === 3) { v.c = 0; if (e.mp >= 15 && tgt.length) return { move: 'bio_gas', target: b.pick(tgt) }; return { move: 'pile_banger', target: pbT() }; }
            v.c = 0; if (e.mp >= 18 && tgt.length) return { move: 'confu', target: b.pick(tgt) };
            return { move: 'pile_banger', target: pbT() };
          }
          if (!ra) {
            if (!v.rc) {
              v.rc = 1;
              var sl = U.party(b).filter(function (c) { return !b.has(c, 'sleep') && !b.has(c, 'confusion') && !b.has(c, 'reflect'); });
              if (e.mp >= 8 && sl.length) return { move: 'sleepel', target: b.pick(sl) };
              return { move: 'wait', target: 'self' };
            }
            v.rc = 0;
            if (U.one(b, 2)) return { move: 'right_arm_revive', target: 'self' };
            return { move: 'wait', target: 'self' };
          }
          // left arm dead
          if (v.c <= 1) { v.c++; return { move: U.one(b, 2) ? 'pile_banger_2' : 'pile_banger', target: pbT() }; }
          v.c = 0;
          var si = U.party(b).filter(function (c) { return !b.has(c, 'silence') && !b.has(c, 'reflect'); });
          if (e.mp >= 24 && si.length) return { move: 'silence', target: b.pick(si) };
          return { move: 'pile_banger', target: pbT() };
        }
      }
    },

    right_arm_b: {
      name: 'Right Arm', level: 55, hp: 5000, mp: 300, exp: 0, ap: 0, gil: 0,
      atk: 150, def: 120, defPct: 1, mat: 80, mdf: 130, dex: 95, lck: 0,
      elem: {}, immune: ['sleep', 'poison', 'confusion', 'silence', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'peerless', 'paralysis'],
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#c0a0a0', c2: '#604040', c3: '#80ff40', size: 1.3, variant: 1 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },   // Helletic Hojo attacks with it
      desc: 'Helletic Hojo\'s right arm.'
    },

    left_arm_b: {
      name: 'Left Arm', level: 55, hp: 24000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 46, def: 150, defPct: 1, mat: 100, mdf: 150, dex: 90, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#c0a0a0', c2: '#604040', c3: '#80ff40', size: 1.3, variant: 2 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },   // does not attack
      desc: 'Helletic Hojo\'s left arm.'
    },

    lifeform_hojo_n: {
      name: 'Lifeform-Hojo N', level: 58, hp: 30000, mp: 100, exp: 25000, ap: 2500, gil: 6000,
      atk: 100, def: 120, defPct: 5, mat: 90, mdf: 180, dex: 100, lck: 6,
      elem: { gravity: 0 }, immune: BOSS_IMM.slice(),
      drops: [{ item: 'power_source', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'demon', c1: '#406040', c2: '#a0c080', c3: '#ff40ff', size: 2.2, variant: 3 },
      attacks: {
        absorb: { name: 'Absorb', kind: 'mag', power: 10, mp: 2, target: 'enemy', silent: true },
        // four-hit combo on one target: 5+12+7+16 power; Poison, Darkness, Sleep
        combo: { name: 'Combo', kind: 'phys', power: 10, hits: 4, element: 'hit', add: ['poison', 'darkness', 'sleep'], hit: 100, target: 'enemy' },
        slow: { name: 'Slow', kind: 'status', add: ['slow'], hit: 100, mp: 20, target: 'allEnemies' },
        silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 94, mp: 24, target: 'enemy' }
      },
      ai: {
        counter: { mag: 'silence', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = [0, 2, 3][b.rnd(3)];
          var th = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (th > (v.th || 0)) { v.th = th; v.c = 1; }
          if (v.c <= 1) { var r = b.rnd(5); v.c = r === 0 ? 0 : r <= 2 ? 2 : 3; return { move: 'combo', target: U.pickWith(b, 'slow') }; }
          if (v.c === 2) {
            var ns = U.without(b, 'slow');
            if (ns.length && e.mp >= 20) { v.c = 0; return { move: 'slow', target: ns }; }
            v.c = ns.length ? 3 : 0;
            if (!ns.length) return { move: 'combo', target: 'random' };
          }
          v.c = 0;
          return { move: 'absorb', target: U.highest(b) };
        }
      }
    },

    // =====================================================================
    // OPTIONAL WEAPONS: RUBY (Gold Saucer desert) and EMERALD (sea floor near Junon)
    // =====================================================================
    ruby_weapon: {
      name: 'Ruby Weapon', level: 59, hp: 800000, mp: 2560, exp: 45000, ap: 50000, gil: 30000,
      atk: 100, def: 480, defPct: 100, mat: 200, mdf: 500, dex: 253, lck: 10,
      // gravity/water void from its template; fire/ice/lightning/earth absorbed via its AI setup
      elem: { gravity: 0, water: 0, fire: -1, ice: -1, lightning: -1, earth: -1 },
      immune: BOSS_IMM.filter(function (s) { return s !== 'paralysis'; }),
      drops: [{ item: 'desert_rose', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      invulnerable: true,   // immune to everything until it digs its tentacles in for the first time (sets e.vars.vulnerable)
      onDeathRemove: ['rubys_tentacle'],
      // FF7 (Enemy Mechanics FAQ): an Ambush without the message - the party's time bars start empty, and though
      // shown facing Ruby they have their backs to it (its first Big Swing does back damage to whoever hasn't
      // attacked it yet); battle.js formations
      formation: { hidden: 'ambush' },
      look: { type: 'custom', id: 'ruby_weapon', c1: '#b01020', c2: '#f0a040', c3: '#ffff80', size: 3 },
      attacks: {
        big_claw: { name: 'Big Claw', kind: 'pct', pct: 63, target: 'enemy', silent: true },
        big_swing: { name: 'Big Swing', kind: 'phys', power: 100, element: 'hit', add: ['paralysis'], hit: 63, target: 'allEnemies' },
        comet2: { name: 'Comet2', kind: 'mag', power: 30, mp: 110, hits: 4, random: true, target: 'enemy' },
        whirlsand: { name: 'Whirlsand', kind: 'special', special: 'remove', target: 'enemy' },
        ruby_flame: { name: 'Ruby Flame', kind: 'mag', power: 56, element: 'fire', target: 'enemy' },
        ultima: { name: 'Ultima', kind: 'mag', power: 105, mp: 130, target: 'allEnemies' },
        ruby_ray: { name: 'Ruby Ray', kind: 'mag', power: 48, element: 'shout', add: ['confusion'], hit: 100, target: 'enemy' },
        right_revenge: { name: 'Right Revenge', kind: 'pct', pct: 47, element: 'punch', add: ['frog', 'small'], hit: 100, target: 'enemy', silent: true },
        right_thrust: { name: 'Right Thrust', kind: 'pct', pct: 94, element: 'punch', add: ['frog', 'small'], hit: 100, target: 'enemy', silent: true },
        shadow_flare: { name: 'Shadow Flare', kind: 'mag', power: 125, mp: 100, target: 'enemy' },
        // MP damage (stat:'mp') as a percentage of the target's current MP
        left_revenge: { name: 'Left Revenge', kind: 'pct', pct: 47, stat: 'mp', element: 'punch', add: ['poison', 'slow_numb'], hit: 100, target: 'enemy', silent: true },
        left_thrust: { name: 'Left Thrust', kind: 'pct', pct: 78, stat: 'mp', element: 'punch', add: ['poison', 'slow_numb'], hit: 100, target: 'enemy', silent: true },
        dig_tentacles: { name: '', kind: 'special', special: 'callHelp', summon: 'rubys_tentacle', count: 2, target: 'self', silent: true },
        retract: idle()
      },
      ai: {
        // Whirlsand answers any attack while 2+ party members are standing and the tentacles are down;
        // with tentacles out it answers with Right/Left Thrust (Ultima vs Knights of the Round).
        counter: {
          custom: function (e, b) {
            var v = U.v(e);
            if (!v.stage && U.party(b).length > 1) return { move: 'whirlsand', target: 'random' };
            if (v.stage) return { move: U.one(b, 2) ? 'right_thrust' : 'left_thrust', target: 'random' };
            return null;
          }
        },
        custom: function (e, b) {
          var v = U.v(e);
          v.c = Math.min(250, (v.c || 0) + 1);
          var n = U.party(b).length, R = 'random';
          var dig = function () { v.stage = 1; v.vulnerable = true; return { move: 'dig_tentacles', target: 'self' }; };
          if (v.stage) {
            var tent = U.count(b, 'rubys_tentacle');
            var anyIds = U.foes(b).some(function (c) { return U.id(c) !== null; });
            if ((anyIds && tent < 2) || (!anyIds && U.foes(b).length < 3)) { v.stage = 0; return { move: 'retract', target: 'self' }; }
            var big = ['ruby_flame', 'ruby_ray', 'shadow_flare', 'ultima'];
            var pick12 = function () { var r = b.rnd(12); return r < 8 ? big[r >> 1] : ['right_revenge', 'right_thrust', 'left_revenge', 'left_thrust'][r - 8]; };
            if (v.c > 32) return n > 1 ? { move: 'whirlsand', target: R } : { move: pick12(), target: R };
            if (v.c > 25) return n > 2 ? { move: 'whirlsand', target: R } : { move: pick12(), target: R };
            if (v.c > 10) { var m6 = big.concat(['right_revenge', 'left_revenge'])[b.rnd(6)]; return { move: m6, target: m6 === 'ultima' ? 'all' : R }; }
            return { move: ['ruby_flame', 'left_revenge', 'right_revenge', 'ruby_ray'][b.rnd(4)], target: R };
          }
          if (v.c > 15) {
            var r5 = b.rnd(5);
            if (r5 === 0) return dig();
            if (r5 === 1) return { move: 'big_swing', target: 'all' };
            if (r5 === 2) return { move: 'big_claw', target: R };
            return { move: 'comet2', target: R };
          }
          if (v.c > 6) { var r3 = b.rnd(3); return r3 === 0 ? { move: 'big_claw', target: R } : r3 === 1 ? { move: 'big_swing', target: 'all' } : { move: 'comet2', target: R }; }
          if (n >= 2) {
            var s = v.c % 3;
            return s === 1 ? { move: 'big_claw', target: R } : s === 0 ? { move: 'whirlsand', target: R } : { move: 'big_swing', target: 'all' };
          }
          return dig();
        }
      },
      desc: 'Optional superboss in the Gold Saucer desert (after Cloud rejoins).'
    },

    rubys_tentacle: {
      name: 'Ruby\'s Tentacle', level: 37, hp: 40000, mp: 1000, exp: 0, ap: 0, gil: 0,
      atk: 100, def: 100, defPct: 100, mat: 150, mdf: 100, dex: 253, lck: 10,
      elem: { gravity: 0, water: 0 },
      immune: BOSS_IMM.filter(function (s) { return s !== 'poison' && s !== 'paralysis'; }),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['rubys_tentacle'],   // losing one tentacle makes Ruby pull both back in
      look: { type: 'tentacle', c1: '#b01020', c2: '#f0a040', c3: '#ffff80', size: 1.6 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } }   // Ruby Weapon attacks through them
    },

    emerald_weapon: {
      name: 'Emerald Weapon', level: 99, hp: 1000000, mp: 100, exp: 50000, ap: 50000, gil: 50000,
      atk: 180, def: 180, defPct: 1, mat: 180, mdf: 180, dex: 230, lck: 1,
      elem: { lightning: 2, gravity: 0.5, earth: 0, ice: -1, water: -1 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [{ item: 'earth_harp', chance: 100 }], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['eye'],
      look: { type: 'custom', id: 'emerald_weapon', c1: '#108040', c2: '#80e0a0', c3: '#ffff40', size: 3 },
      attacks: {
        foot_stamp: { name: 'Foot Stamp', kind: 'phys', power: 30, target: 'allEnemies', silent: true },
        emerald_shoot: { name: 'Emerald Shoot', kind: 'mag', power: 91, remove: ['barrier', 'mbarrier', 'shield', 'resist'], target: 'enemy' },
        emerald_beam: { name: 'Emerald Beam', kind: 'pct', pct: 66, remove: ['regen'], target: 'allEnemies' },
        revenge_stamp: { name: 'Revenge Stamp', kind: 'phys', power: 19, remove: ['haste'], target: 'allEnemies' },
        // damage = 1111 x number of materia equipped by each target (absorbed by Emerald)
        aire_tam_storm: { name: 'Aire Tam Storm', kind: 'special', special: 'aire_tam_storm', perMateria: 1111, drain: true,
          remove: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'resist'], target: 'allEnemies' },
        open_eyes: { name: '', kind: 'special', special: 'callHelp', summon: 'eye', count: 4, target: 'self', silent: true },
        close_eyes: idle()
      },
      ai: {
        // Revenge Stamp answers every non-Limit hit while at least one Eye is open
        counter: {
          custom: function (e, b) {
            var v = U.v(e);
            if (v.stage && U.foes(b).length > 1) return { move: 'revenge_stamp', target: 'all' };
            return null;
          }
        },
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var eyes = U.foes(b).length > 1;
          if (v.stage && !eyes) { v.stage = 0; v.c = 0; return { move: 'close_eyes', target: 'self' }; }
          switch (v.c) {
            case 0: if (b.rnd(3) < 2) v.c = 1; return { move: 'emerald_shoot', target: 'random' };
            case 1: v.c = (b.rnd(5) < 4 || e.hpPct <= 50) ? 2 : 1; return { move: 'foot_stamp', target: 'all' };
            case 2: v.c = 3; return { move: 'emerald_shoot', target: 'random' };
            case 3: v.c = 4; v.stage = 1; return { move: 'open_eyes', target: 'self' };
            case 4: v.c = 6; return { move: 'emerald_beam', target: 'all' };
            case 5: v.c = 6; return { move: 'emerald_beam', target: 'all' };
            default: v.c = 5; return { move: 'aire_tam_storm', target: 'all' };
          }
        }
      },
      desc: 'Optional superboss on the sea floor (fought from the submarine).'
    },

    eye: {
      name: 'Eye', level: 50, hp: 25000, mp: 100, exp: 0, ap: 0, gil: 0,
      atk: 50, def: 2, defPct: 1, mat: 50, mdf: 2, dex: 150, lck: 1,
      elem: { fire: 2, earth: 0, ice: -1, water: -1 }, immune: imm(BOSS_IMM, ['regen']),
      drops: [], steal: [], morph: null,
      boss: true, flying: true, row: 'front',
      look: { type: 'eye', c1: '#20a060', c2: '#e0ffe0', c3: '#ff2020', size: 1.1 },
      attacks: {
        emerald_laser: { name: 'Emerald Laser', kind: 'mag', power: 111, target: 'enemy' },
        emerald_laser_mp: { name: 'Emerald Laser', kind: 'mag', power: 19, stat: 'mp', target: 'enemy' }
      },
      ai: {
        // half the Eyes (type A) fire the HP laser, the others (type B, faster) the MP laser
        custom: function (e, b) {
          var v = U.v(e);
          if (!v.type) v.type = U.one(b, 2) ? 'a' : 'b';
          return { move: v.type === 'a' ? 'emerald_laser' : 'emerald_laser_mp', target: 'random' };
        }
      },
      desc: 'Emerald Weapon\'s eyes.'
    },

    // =====================================================================
    // NORTHERN CRATER (Disc 3 final dungeon)
    // =====================================================================
    gargoyle: {
      name: 'Gargoyle', level: 43, hp: 2000, mp: 200, exp: 800, ap: 80, gil: 2500,
      atk: 120, def: 140, defPct: 1, mat: 64, mdf: 120, dex: 90, lck: 0,
      elem: {}, immune: ['poison', 'confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'remedy', chance: 14 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      invulnerable: true,   // stone form: immune to all attacks; turns into the living Gargoyle on its 3rd turn
      look: { type: 'rock', c1: '#707070', c2: '#b0b0b0', c3: '#ff2020', size: 1.2, variant: 0 },
      attacks: {
        rock_finger: { name: 'Rock Finger', kind: 'mag', power: 16, add: ['slow_numb'], hit: 100, mp: 10, target: 'enemy', silent: true },
        awaken: { name: '', kind: 'special', special: 'transform', into: 'gargoyle_b', target: 'self', silent: true },
        wait: idle()
      },
      ai: {
        counter: { mag: 'rock_finger', chance: 100 },
        custom: function (e) {
          var v = U.v(e); v.c = (v.c || 0) + 1;
          return v.c >= 3 ? { move: 'awaken', target: 'self' } : { move: 'wait', target: 'self' };
        }
      }
    },

    gargoyle_b: {
      name: 'Gargoyle', level: 43, hp: 2000, mp: 200, exp: 800, ap: 80, gil: 2500,
      atk: 120, def: 140, defPct: 1, mat: 64, mdf: 120, dex: 90, lck: 0,
      elem: {}, immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'x_potion', chance: 52 }], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'demon', c1: '#707070', c2: '#b0b0b0', c3: '#ff2020', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Kick', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        kick_2: { name: 'Kick', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy', silent: true },
        // Final attack (1/3): instant death to targets whose level is a multiple of 4
        l4_death: { name: 'L4 Death', kind: 'special', special: 'level_death', lv: 4, add: ['death'], hit: 100, mp: 20, element: 'shoot', target: 'allEnemies' }
      },
      ai: {
        onDeath: 'l4_death', onDeathChance: 33,
        custom: function (e, b) {
          return { move: U.one(b, 2) ? 'kick_2' : 'attack', target: U.pickWithout(b, 'petrify') };
        }
      }
    },

    dark_dragon: {
      name: 'Dark Dragon', level: 57, hp: 14000, mp: 600, exp: 5000, ap: 350, gil: 2500,
      atk: 150, def: 120, defPct: 5, mat: 90, mdf: 240, dex: 100, lck: 3,
      elem: { lightning: 0 }, immune: ['death', 'frog', 'small', 'slow_numb', 'petrify', 'berserk', 'darkness'],
      drops: [{ item: 'elixir', chance: 14 }], steal: [{ item: 'dragon_armlet', chance: 14 }], morph: 'vaccine',
      boss: false, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#302040', c2: '#8060a0', c3: '#ff4040', size: 2 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        claw_2: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', hits: 2, random: true, target: 'enemy', silent: true },
        tail_attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        tail_attack_2: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        dark_dragon_breath: { name: 'Dark Dragon Breath', kind: 'mag', power: 20, element: 'shoot', add: ['darkness'], hit: 100, mp: 20, target: 'allEnemies' },
        ultima: { name: 'Ultima', kind: 'mag', power: 105, mp: 130, target: 'allEnemies' },
        dragon_force: { name: 'Dragon Force', kind: 'special', special: 'dragon_force', mp: 19, target: 'self', eskill: 'dragon_force' },
        // only through Manipulate
        laser: { name: 'Laser', kind: 'pct', pct: 50, element: 'gravity', mp: 16, target: 'enemy', eskill: 'laser', manipOnly: true }
      },
      ai: {
        // Ultima: once per battle, as a counter to magic
        counter: {
          custom: function (e, b, info) {
            var v = U.v(e);
            if (info && info.kind && info.kind !== 'mag') return null;
            if (!v.ult && e.mp >= 130 && U.one(b, U.sc(e, [2, 3, 4, 5]))) { v.ult = 1; return { move: 'ultima', target: 'all' }; }
            return null;
          }
        },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(4);
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.c === 0) { v.c = 1; return { move: U.one(b, sc) ? 'tail_attack_2' : 'tail_attack', target: 'random' }; }
          if (v.c === 1) { v.c = 2; return { move: U.one(b, sc) ? 'claw_2' : 'attack', target: 'random' }; }
          if (v.c === 2) {
            v.c = 3;
            if (e.mp >= 19 && U.one(b, sc)) return { move: 'dragon_force', target: 'self' };
            return { move: U.one(b, sc) ? 'claw_2' : 'attack', target: 'random' };
          }
          v.c = b.rnd(2);
          if (e.mp >= 20 && U.one(b, sc)) return { move: 'dark_dragon_breath', target: 'all' };
          return { move: U.one(b, sc) ? 'tail_attack_2' : 'tail_attack', target: 'random' };
        }
      }
    },

    scissors: {
      name: 'Scissors', level: 33, hp: 2900, mp: 88, exp: 1000, ap: 90, gil: 1400,
      atk: 72, def: 58, defPct: 1, mat: 65, mdf: 80, dex: 70, lck: 0,
      elem: {}, immune: ['sleep', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'ether', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#a0a0b0', c2: '#e0c040', c3: '#ff2020', size: 1.3, variant: 3 },
      attacks: {
        attack: { name: 'Cross Scissor', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        scissor_kick: { name: 'Scissor Kick', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        scissor_attack: { name: 'Scissor Attack', kind: 'phys', power: 1, add: ['death'], hit: 100, target: 'enemy' },
        // splits into Scissors(Upper) + Scissors(Lower), both at full HP
        split: { name: '', kind: 'special', special: 'transform', into: 'scissors_upper', alsoSpawn: 'scissors_lower', target: 'self', silent: true }
      },
      ai: {
        counter: {
          custom: function (e, b, info) {
            var v = U.v(e);
            if (e.hpPct <= 50 && !v.sa) { v.sa = 1; return { move: 'scissor_attack', target: (info && info.attacker) || 'random' }; }
            return null;
          }
        },
        custom: function (e, b) {
          var v = U.v(e);
          if (e.hpPct <= 50) {
            if (!v.sa) { v.sa = 1; return { move: 'scissor_attack', target: 'random' }; }
            return { move: 'split', target: 'self' };
          }
          return { move: U.one(b, 2) ? 'attack' : 'scissor_kick', target: 'random' };
        }
      }
    },

    scissors_upper: {
      name: 'Scissors(Upper)', level: 33, hp: 2900, mp: 88, exp: 1200, ap: 90, gil: 1400,
      atk: 72, def: 58, defPct: 1, mat: 65, mdf: 80, dex: 60, lck: 0,
      elem: {}, immune: ['sleep', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'ether', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#a0a0b0', c2: '#e0c040', c3: '#ff2020', size: 1, variant: 1 },
      attacks: {
        attack: { name: 'Cross Scissor', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        bloody_nail: { name: 'Bloody Nail', kind: 'drain', power: 16, formula: 'phys', target: 'enemy' },
        scissor_tornado: { name: 'Scissor Tornado', kind: 'special', special: 'remove', target: 'enemy' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var ok = U.without(b, 'confusion');
          if (!ok.length) { v.c = (v.c + 1) % 4; return { move: 'wait', target: 'self' }; }
          if (v.c <= 1) { v.c++; return { move: 'attack', target: b.pick(ok) }; }
          if (v.c === 2) {
            v.c = v.tor ? 0 : 3;
            if (e.hp < e.maxHp) return { move: 'bloody_nail', target: U.highest(b, ok) };
            return { move: 'attack', target: b.pick(ok) };
          }
          v.c = 0;
          if (!v.tor && U.one(b, 3)) { v.tor = 1; return { move: 'scissor_tornado', target: U.highest(b, ok) }; }
          return { move: 'attack', target: b.pick(ok) };
        }
      }
    },

    scissors_lower: {
      name: 'Scissors(Lower)', level: 33, hp: 2900, mp: 88, exp: 1200, ap: 90, gil: 1400,
      atk: 72, def: 58, defPct: 1, mat: 65, mdf: 80, dex: 60, lck: 0,
      elem: {}, immune: ['sleep', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'ether', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#a0a0b0', c2: '#e0c040', c3: '#ff2020', size: 1, variant: 2 },
      attacks: {
        attack: { name: 'Scissor Kick', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        confu: { name: 'Confu', kind: 'status', add: ['confusion'], hit: 94, mp: 18, target: 'enemy' },
        cure3: { name: 'Cure3', kind: 'heal', power: 130, element: 'restorative', mp: 64, target: 'ally' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e); v.c = v.c || 0;
          var ok = U.without(b, 'confusion');
          if (v.c <= 1) { v.c++; return ok.length ? { move: 'attack', target: b.pick(ok) } : { move: 'wait', target: 'self' }; }
          if (v.c === 2) {
            v.c = 3;
            if (!ok.length) return { move: 'wait', target: 'self' };
            return e.mp >= 18 ? { move: 'confu', target: b.pick(ok) } : { move: 'attack', target: b.pick(ok) };
          }
          v.c = 0;
          var up = U.find(b, 'scissors_upper');
          v.ms = !v.ms;
          var tgt = (up && v.ms) ? up : e;
          if (e.mp >= 64 && (tgt.hp || 0) <= (tgt.maxHp || 0) / 3) return { move: 'cure3', target: tgt === e ? 'self' : tgt };
          return ok.length ? { move: 'attack', target: b.pick(ok) } : { move: 'wait', target: 'self' };
        }
      }
    },

    parasite: {
      name: 'Parasite', level: 51, hp: 6000, mp: 300, exp: 1100, ap: 100, gil: 1000,
      atk: 120, def: 150, defPct: 1, mat: 100, mdf: 140, dex: 90, lck: 0,
      elem: { wind: 2, holy: 2, earth: 0 }, immune: ['frog'],
      drops: [{ item: 'remedy', chance: 14 }], steal: [{ item: 'remedy', chance: 52 }], morph: 'remedy',
      boss: false, flying: true, row: 'front',
      look: { type: 'insect', c1: '#c0a060', c2: '#604020', c3: '#ff00ff', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Head Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        para_tail: { name: 'Para Tail', kind: 'phys', power: 16, element: 'cut', add: ['sadness'], hit: 100, target: 'enemy' },
        magic_extinguish: { name: 'Magic Extinguish', kind: 'status', add: ['silence'], hit: 100, target: 'enemy' },
        // only through Manipulate
        l5_death: { name: 'L5 Death', kind: 'special', special: 'level_death', lv: 5, add: ['death'], hit: 100, mp: 22, target: 'allEnemies', eskill: 'l5_death', manipOnly: true },
        magic_breath: { name: 'Magic Breath', kind: 'mag', power: 77, element: 'fire', elements: ['fire', 'ice', 'lightning'], mp: 75, target: 'allEnemies', eskill: 'magic_breath', manipOnly: true }
      },
      ai: {
        counter: { mag: 'magic_extinguish', chance: 100 },
        custom: function (e, b) {
          if (U.without(b, 'sadness').length) return { move: 'para_tail', target: U.pickWithout(b, 'sadness') };
          return { move: 'attack', target: 'random' };
        }
      }
    },

    pollensalta: {
      name: 'Pollensalta', level: 41, hp: 4000, mp: 220, exp: 1000, ap: 100, gil: 1000,
      atk: 110, def: 60, defPct: 1, mat: 90, mdf: 136, dex: 85, lck: 0,
      elem: { fire: -1 }, immune: ['confusion', 'frog'],
      drops: [{ item: 'x_potion', chance: 14 }], steal: [{ item: 'hyper', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#e080c0', c2: '#60a040', c3: '#ffff80', size: 1.2, variant: 1 },
      attacks: {
        fire3: { name: 'Fire3', kind: 'mag', power: 64, element: 'fire', mp: 52, target: 'enemy' },
        fascination: { name: 'Fascination', kind: 'status', add: ['confusion'], hit: 100, mp: 5, target: 'enemy' },
        cold_breath: { name: 'Cold Breath', kind: 'mag', power: 6, element: 'ice', mp: 12, target: 'enemy' },
        angel_whisper: { name: 'Angel Whisper', kind: 'heal', pct: 100, element: 'restorative', mp: 50, target: 'self',
          remove: ['death', 'sleep', 'poison', 'confusion', 'silence', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'berserk', 'paralysis', 'darkness'],
          eskill: 'angel_whisper' }
      },
      ai: {
        counter: { phys: 'fascination', mag: 'fascination', chance: 100 },
        custom: function (e, b) {
          var v = U.v(e);
          // HP thresholds (FF7 counter script): 80% Fascination, 60% Fire3, 40% Angel Whisper, 20% Angel Whisper + Fire3
          var th = e.hpPct <= 20 ? 4 : e.hpPct <= 40 ? 3 : e.hpPct <= 60 ? 2 : e.hpPct <= 80 ? 1 : 0;
          if (v.fire) { v.fire = 0; if (e.mp >= 52) return { move: 'fire3', target: 'random' }; }
          if (th > (v.th || 0)) {
            v.th = th;
            if (th === 2 && e.mp >= 52) return { move: 'fire3', target: 'random' };
            if (th >= 3 && e.mp >= 50) { if (th === 4) v.fire = 1; return { move: 'angel_whisper', target: 'self' }; }
            if (th === 1) return { move: 'fascination', target: U.pickWithout(b, 'confusion') };
          }
          return { move: 'cold_breath', target: U.pickWithout(b, 'confusion') };
        }
      }
    },

    master_tonberry: {
      name: 'Master Tonberry', level: 77, hp: 44444, mp: 100, exp: 6000, ap: 200, gil: 6800,
      atk: 150, def: 136, defPct: 1, mat: 130, mdf: 150, dex: 70, lck: 0,
      elem: { gravity: -1 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'megalixir', chance: 14 }], steal: [{ item: 'elixir', chance: 52 }], morph: 'ribbon',
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#e0c040', c2: '#6a4020', c3: '#ffffff', size: 0.9, variant: 3 },
      attacks: {
        // damage = number of enemies the target has killed x 10
        everyones_grudge: { name: 'Everyone\'s Grudge', kind: 'special', special: 'everyones_grudge', target: 'enemy' },
        knife: { name: 'Knife', kind: 'status', add: ['death'], hit: 100, target: 'enemy' },
        step: idle()
      },
      ai: {
        counter: { phys: 'everyones_grudge', mag: 'everyones_grudge', chance: 50 },   // FF7: every 2nd hit
        custom: function (e, b) {
          var v = U.v(e); v.d = v.d || 0;
          if (v.d >= 3 && U.one(b, 2)) { v.d = 0; return { move: 'knife', target: 'random' }; }
          v.d++; return { move: 'step', target: 'self' };
        }
      }
    },

    king_behemoth: {
      name: 'King Behemoth', level: 60, hp: 18000, mp: 560, exp: 2000, ap: 250, gil: 950,
      atk: 150, def: 140, defPct: 1, mat: 65, mdf: 256, dex: 90, lck: 0,
      elem: { gravity: 0.5 }, immune: [],
      drops: [{ item: 'x_potion', chance: 52 }], steal: [{ item: 'phoenix_down', chance: 52 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#402060', c2: '#e0a060', c3: '#ffd000', size: 2, variant: 1 },
      attacks: {
        behemoth_horn: { name: 'Behemoth Horn', kind: 'phys', power: 18, element: 'punch', target: 'enemy', silent: true },
        king_teel: { name: 'King Teel', kind: 'phys', power: 16, element: 'cut', target: 'enemy' },
        attack: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        comet2: { name: 'Comet2', kind: 'mag', power: 30, mp: 110, hits: 4, random: true, target: 'enemy' },
        flare: { name: 'Flare', kind: 'mag', power: 115, element: 'fire', mp: 100, target: 'enemy', manipOnly: true }
      },
      ai: {
        counter: { mag: 'comet2', chance: 100 },
        custom: function (e, b) {
          var m = ['behemoth_horn', 'king_teel', 'attack'][b.rnd(3)];
          return { move: m, target: 'random' };
        }
      }
    },

    allemagne: {
      name: 'Allemagne', level: 48, hp: 8000, mp: 200, exp: 1300, ap: 100, gil: 1360,
      atk: 120, def: 90, defPct: 1, mat: 88, mdf: 96, dex: 85, lck: 0,
      elem: { wind: 2, earth: 0 }, immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'eye_drop', chance: 100 }], steal: [{ item: 'eye_drop', chance: 52 }], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'flyer', c1: '#a04040', c2: '#e0c0a0', c3: '#ffff00', size: 1.4, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        claw_2: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        l4_death: { name: 'L4 Death', kind: 'special', special: 'level_death', lv: 4, add: ['death'], hit: 100, mp: 20, element: 'shoot', target: 'allEnemies' },
        // HP x 5/4 fire damage to targets whose level is a multiple of 3
        l3_flare: { name: 'L3 Flare', kind: 'special', special: 'level_death', lv: 3, element: 'fire', mp: 20, target: 'allEnemies' },
        teardrop: { name: 'Teardrop', kind: 'phys', power: 16, element: 'shoot', add: ['sadness'], hit: 100, target: 'enemy' },
        big_breath: { name: 'Big Breath', kind: 'mag', power: 16, element: 'shoot', mp: 20, target: 'enemy' }
      },
      ai: {
        counter: {
          custom: function (e, b, info) {
            var v = U.v(e), sc = U.sc(e, [2, 3, 4, 5]);
            if (info && info.kind === 'mag') {
              if (e.mp >= 20 && !v.l3 && U.one(b, sc)) { v.l3 = 1; return { move: 'l3_flare', target: 'all' }; }
              if (e.mp >= 20 && !v.l4 && U.one(b, sc)) { v.l4 = 1; return { move: 'l4_death', target: 'all' }; }
              return null;
            }
            if (U.one(b, sc)) return { move: 'teardrop', target: (info && info.attacker) || 'random' };
            return null;
          }
        },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(3);
          var sc = U.sc(e, [2, 3, 4, 5]);
          if (v.c < 2) { v.c++; return { move: U.one(b, sc) ? 'claw_2' : 'attack', target: 'random' }; }
          v.c = 0;
          return { move: U.one(b, sc) ? 'big_breath' : 'attack', target: 'random' };
        }
      }
    },

    armored_golem: {
      name: 'Armored Golem', level: 41, hp: 10000, mp: 200, exp: 2500, ap: 100, gil: 2680,
      atk: 110, def: 100, defPct: 1, mat: 98, mdf: 120, dex: 110, lck: 0,
      elem: {}, immune: ['sleep', 'poison', 'sadness', 'fury', 'confusion', 'frog', 'small', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'darkness'],
      drops: [{ item: 'echo_screen', chance: 14 }], steal: [{ item: 'turbo_ether', chance: 52 }], morph: 'guard_source',
      boss: false, flying: false, row: 'back',
      look: { type: 'giant', c1: '#606878', c2: '#c0a060', c3: '#40ffff', size: 2 },
      attacks: {
        snap: { name: 'Snap', kind: 'phys', power: 40, element: 'shout', target: 'allEnemies' },
        megaton_punch: { name: 'Megaton Punch', kind: 'phys', power: 30, element: 'hit', target: 'enemy' },
        golem_laser: { name: 'Golem Laser', kind: 'mag', power: 16, mp: 20, target: 'allEnemies' },
        advance: idle(),
        defense_start: idle(),
        defense_down: idle()
      },
      ai: {
        // walks forward (stronger, less defensive each step), crosses its arms (Def 400/MDf 470) below 50% HP
        custom: function (e, b) {
          var v = U.v(e);
          if (v.row === undefined) { v.row = 4; v.stage = 0; }
          if (e.hpPct < 50 && v.stage === 0 && !v.left) { v.stage = 1; e.def = 400; e.mdf = 470; return { move: 'defense_start', target: 'self' }; }
          if (v.left) { v.left = 0; return { move: 'golem_laser', target: 'all' }; }
          if (v.row <= 1) {
            if (v.stage === 0) return { move: 'megaton_punch', target: 'random' };
            v.stage = 0; v.left = 1; v.row = 4; e.def = 132; e.mdf = 160;
            return { move: 'defense_down', target: 'self' };
          }
          if (v.stage === 0 && U.one(b, 2)) return b.rnd(3) < 2 ? { move: 'snap', target: 'all' } : { move: 'golem_laser', target: 'all' };
          v.row--;
          if (v.stage === 0) { e.def = 100 + v.row * 8; e.mdf = 120 + v.row * 10; }
          return { move: 'advance', target: 'self' };
        }
      }
    },

    death_dealer: {
      name: 'Death Dealer', level: 48, hp: 7000, mp: 400, exp: 1800, ap: 200, gil: 1200,
      atk: 120, def: 140, defPct: 5, mat: 120, mdf: 140, dex: 90, lck: 0,
      elem: { restorative: 0 }, immune: ['confusion', 'stop', 'frog', 'small', 'death_sentence', 'paralysis'],
      drops: [{ item: 'kiss_of_death', chance: 14 }, { item: 'x_potion', chance: 14 }], steal: [{ item: 'turbo_ether', chance: 52 }], morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'ghost', c1: '#402040', c2: '#e0c060', c3: '#ff0000', size: 1.3, variant: 3 },
      attacks: {
        attack: { name: 'Spin Turn', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        spin_turn_2: { name: 'Spin Turn', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy', silent: true },
        emperor: { name: 'Emperor', kind: 'heal', power: 16, element: 'restorative', target: 'self' },   // heals 0: it voids Restorative
        hidden_one: { name: 'Hidden One', kind: 'status', add: ['death'], hit: 100, target: 'enemy' },
        star: { name: 'Star', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        star_2: { name: 'Star', kind: 'phys', power: 16, element: 'shoot', hits: 2, random: true, target: 'enemy' },
        sun: { name: 'Sun', kind: 'status', add: ['silence', 'darkness'], hit: 100, target: 'enemy' },
        world: { name: 'World', kind: 'status', add: ['stop'], hit: 100, target: 'enemy' },
        roulette: { name: 'Roulette', kind: 'special', special: 'roulette', add: ['death'], hit: 100, mp: 6, target: 'randomEnemy', eskill: 'roulette' },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) { var r = b.rnd(5); v.c = r === 0 ? 3 : r <= 2 ? 0 : 1; }
          var stage = e.hpPct <= 25 ? 3 : e.hpPct <= 50 ? 2 : e.hpPct <= 75 ? 1 : 0;
          if (stage === 3 && !v.rl) { v.rl = 1; return { move: 'roulette', target: 'random' }; }
          var nonStop = U.pickWithout(b, 'stop');
          switch (v.c) {
            case 0: case 1: v.c++; return { move: U.one(b, 2) ? 'spin_turn_2' : 'attack', target: nonStop };
            case 2: v.c = 3; return stage > 1 ? { move: 'emperor', target: 'self' } : { move: 'attack', target: nonStop };
            case 3:
              v.c = stage === 0 ? 0 : stage === 1 ? (U.one(b, 2) ? 7 : 8) : stage === 2 ? [4, 7, 8][b.rnd(3)] : 4;
              return { move: U.one(b, 2) ? 'star_2' : 'star', target: nonStop };
            case 4: v.c = 5; return U.without(b, 'stop').length ? { move: 'world', target: nonStop } : { move: 'attack', target: 'random' };
            case 5: v.c = 6; return { move: 'wait', target: 'self' };
            case 6: v.c = 0; return U.withSt(b, 'stop').length ? { move: 'hidden_one', target: U.pickWith(b, 'stop') } : { move: 'star', target: 'random' };
            case 7: v.c = 0; return U.without(b, 'darkness').length ? { move: 'sun', target: U.pickWithout(b, 'darkness') } : { move: 'attack', target: nonStop };
            default: v.c = 0; return U.without(b, 'silence').length ? { move: 'sun', target: U.pickWithout(b, 'silence') } : { move: 'attack', target: nonStop };
          }
        }
      }
    },

    dragon_zombie: {
      name: 'Dragon Zombie', level: 54, hp: 13000, mp: 400, exp: 4000, ap: 300, gil: 2800,
      atk: 160, def: 150, defPct: 1, mat: 65, mdf: 200, dex: 110, lck: 0,
      elem: { holy: 2, restorative: -1 }, undead: true,
      immune: ['death', 'confusion', 'frog', 'small', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'cauldron', chance: 14 }, { item: 'x_potion', chance: 5 }], steal: [{ item: 'cauldron', chance: 52 }], morph: 'vaccine',
      boss: false, flying: false, row: 'front',
      look: { type: 'skeleton', c1: '#708060', c2: '#c0c0a0', c3: '#80ff40', size: 2.1, variant: 1 },
      attacks: {
        poison_fang: { name: 'Poison Fang', kind: 'phys', power: 48, element: 'poison', add: ['poison'], hit: 100, target: 'enemy', silent: true },
        poison_fang_2: { name: 'Poison Fang', kind: 'phys', power: 48, element: 'poison', add: ['poison'], hit: 100, hits: 2, random: true, target: 'enemy', silent: true },
        body_tail: { name: 'Body Tail', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies' },
        abnormal_breath: { name: 'Abnormal Breath', kind: 'mag', power: 16, element: 'shoot', add: ['poison'], hit: 100, mp: 20, target: 'allEnemies' },
        bone: { name: 'Bone', kind: 'phys', power: 16, element: 'shoot', add: ['paralysis'], hit: 100, target: 'enemy' },
        shadow_flare: { name: 'Shadow Flare', kind: 'mag', power: 125, mp: 100, target: 'enemy', eskill: 'shadow_flare' },
        // final attack, only ONCE PER GAME (the first Dragon Zombie killed); ignores defence
        pandoras_box: { name: 'Pandora\'s Box', kind: 'mag', power: 60, pierce: true, mp: 110, target: 'allEnemies', eskill: 'pandoras_box', oncePerGame: true }
      },
      ai: {
        onDeath: 'pandoras_box',
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(5);
          var sc = U.sc(e, [2, 3, 4, 5]), clean = U.without(b, 'poison');
          if (v.c === 0) { v.c = U.one(b, sc) ? 2 : 1; return { move: clean.length > 1 && U.one(b, sc) ? 'poison_fang_2' : 'poison_fang', target: U.pick(b, clean) }; }
          if (v.c === 1) { v.c = 3; return { move: 'body_tail', target: 'all' }; }
          if (v.c === 2) { v.c = 3; if (U.without(b, 'paralysis').length && U.one(b, sc)) return { move: 'bone', target: U.pickWithout(b, 'paralysis') }; return { move: 'body_tail', target: 'all' }; }
          if (v.c === 3) {
            v.c = 4;
            if (e.mp >= 20 && clean.length) return U.one(b, sc) ? { move: 'abnormal_breath', target: 'all' } : { move: 'poison_fang', target: b.pick(clean) };
            return { move: 'body_tail', target: 'all' };
          }
          v.c = b.rnd(2);
          if (e.mp >= 100 && U.one(b, sc)) return { move: 'shadow_flare', target: U.pickWith(b, 'paralysis') };
          return { move: 'body_tail', target: 'all' };
        }
      }
    },

    mover: {
      name: 'Mover', level: 59, hp: 3000, mp: 120, exp: 0, ap: 800, gil: 30000,
      atk: 100, def: 150, defPct: 10, mat: 98, mdf: 250, dex: 200, lck: 50,
      elem: { fire: 0.5, ice: 0.5, lightning: 0.5, earth: 0.5 },
      immune: ['poison', 'silence', 'stop', 'frog', 'small', 'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'turbo_ether', chance: 100 }], steal: [{ item: 'turbo_ether', chance: 52 }], morph: 'protect_ring',
      boss: false, flying: true, row: 'front',
      look: { type: 'eye', c1: '#c04080', c2: '#ffe0f0', c3: '#ffffff', size: 0.8, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        triangle_attack: { name: 'Triangle Attack', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        wait: idle()
      },
      ai: {
        // all three Movers alive: Triangle Attack every 5th turn; otherwise Bodyblow every 4th turn
        custom: function (e, b) {
          var v = U.v(e);
          if (v.b === undefined) { v.b = b.rnd(4); v.t = 5; }
          var all3 = U.count(b, 'mover') >= 3 || (U.find(b, 'mover') === null && U.foes(b).length >= 3);
          if (all3 && v.t <= 0) { v.t = 5; return { move: 'triangle_attack', target: 'random' }; }
          if (v.b === 0) { v.b = 3; return { move: 'attack', target: 'random' }; }
          v.b--; if (v.t > 0) v.t--;
          return { move: 'wait', target: 'self' };
        }
      }
    },

    magic_pot: {
      name: 'Magic Pot', level: 41, hp: 4096, mp: 128, exp: 8000, ap: 1000, gil: 8500,
      atk: 64, def: 64, defPct: 8, mat: 64, mdf: 64, dex: 64, lck: 16,
      elem: {}, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'turbo_ether', chance: 100 }], steal: [], morph: null,
      boss: false, flying: false, row: 'front',
      invulnerable: true, elixirUnlock: true,   // immune to all attacks until an Elixir is used on it
      look: { type: 'blob', c1: '#c09040', c2: '#804020', c3: '#ffffff', size: 0.9, variant: 3 },
      attacks: {
        gimme_elixir: { name: 'Gimme Elixir!', kind: 'special', special: 'nothing', target: 'self' },
        gimme: { name: 'Gimme', kind: 'special', special: 'stealItem', target: 'enemy', silent: true },
        leave: { name: '', kind: 'special', special: 'flee', target: 'self', silent: true },
        wait: idle()
      },
      ai: {
        counter: {
          custom: function (e, b) {
            var v = U.v(e);
            if (v.vulnerable) return null;
            if (U.one(b, 4)) return { move: 'gimme', target: 'random' };
            if (U.one(b, 16)) return { move: 'leave', target: 'self' };
            return null;
          }
        },
        custom: function (e) {
          var v = U.v(e);
          return v.vulnerable ? { move: 'wait', target: 'self' } : { move: 'gimme_elixir', target: 'self' };
        }
      }
    },

    christopher: {
      name: 'Christopher', level: 34, hp: 6000, mp: 200, exp: 1300, ap: 80, gil: 800,
      atk: 70, def: 66, defPct: 5, mat: 64, mdf: 150, dex: 90, lck: 5,
      elem: {}, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'earth_drum', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#4060c0', c2: '#e0d0b0', c3: '#ffff00', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Flutilizer', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        flutilizer_2: { name: 'Flutilizer', kind: 'phys', power: 20, element: 'hit', hits: 2, random: true, target: 'enemy', silent: true },
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', mp: 24, target: 'allAllies' },
        bolt3: { name: 'Bolt3', kind: 'mag', power: 64, element: 'lightning', mp: 52, target: 'enemy' },
        aspil: { name: 'Aspil', kind: 'special', special: 'mpDrain', power: 2, mp: 1, target: 'enemy' },
        frog_song: { name: 'Frog Song', kind: 'status', add: ['frog', 'sleep'], hit: 100, mp: 5, target: 'enemy', eskill: 'frog_song' },
        high_low_suit: { name: 'High/Low Suit', kind: 'status', add: ['sadness'], hit: 100, mp: 10, element: 'shoot', target: 'enemy' },
        suffocation_song: { name: 'Suffocation Song', kind: 'status', add: ['death'], hit: 100, element: 'shoot', target: 'enemy' },
        stardust_march: { name: 'Stardust March', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(7);
          var sc = U.sc(e, [2, 3, 4, 5]);
          var flute = function () { return { move: U.one(b, sc) ? 'flutilizer_2' : 'attack', target: U.pickWith(b, 'frog') }; };
          var gighee = U.count(b, 'gighee') > 0 || (U.find(b, 'gighee') === null && U.foes(b).length > 1);
          if (v.c === 0) { v.c = 1; return flute(); }
          if (v.c === 1) { v.c = 2 + b.rnd(2); return flute(); }
          if (v.c === 2) {
            v.c = 3;
            if (U.without(b, 'frog').length && U.one(b, sc)) return e.mp >= 5 ? { move: 'frog_song', target: U.pickWithout(b, 'frog') } : { move: 'aspil', target: U.highestMp(b) };
            return flute();
          }
          if (v.c === 3) {
            v.c = 4;
            if (sc <= 3) return e.mp >= 24 ? { move: 'cure2', target: 'allies' } : { move: 'aspil', target: U.highestMp(b) };
            return flute();
          }
          if (gighee) {
            if (v.c === 4) {
              v.c = 5;
              if (U.withSt(b, 'fury').length) return e.mp >= 10 ? { move: 'high_low_suit', target: U.pickWith(b, 'fury') } : flute();
              return { move: 'aspil', target: U.highestMp(b) };
            }
            if (v.c === 5) {
              v.c = 6;
              if (U.withSt(b, 'sadness').length) return { move: 'suffocation_song', target: U.pickWith(b, 'sadness') };
              return e.mp >= 52 ? { move: 'bolt3', target: 'random' } : { move: 'aspil', target: U.highestMp(b) };
            }
            v.c = b.rnd(2); return { move: 'stardust_march', target: 'random' };
          }
          if (v.c <= 5) { v.c++; return flute(); }
          v.c = b.rnd(2);
          return e.mp >= 52 ? { move: 'bolt3', target: 'random' } : { move: 'aspil', target: U.highestMp(b) };
        }
      }
    },

    gighee: {
      name: 'Gighee', level: 34, hp: 5500, mp: 100, exp: 700, ap: 60, gil: 600,
      atk: 70, def: 76, defPct: 12, mat: 65, mdf: 190, dex: 90, lck: 3,
      elem: {}, immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'ether', chance: 14 }], steal: [{ item: 'elixir', chance: 14 }], morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#c04040', c2: '#e0d0b0', c3: '#40ff40', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Guitar Slap', kind: 'phys', power: 24, element: 'shoot', add: ['fury'], hit: 100, target: 'enemy', silent: true },
        guitar_slap_2: { name: 'Guitar Slap', kind: 'phys', power: 24, element: 'shoot', add: ['fury'], hit: 100, hits: 2, random: true, target: 'enemy', silent: true },
        petrif_eye: { name: 'Petrif-Eye', kind: 'mag', power: 16, element: 'shoot', add: ['petrify'], hit: 100, mp: 10, target: 'enemy' },
        sun_diver: { name: 'Sun Diver', kind: 'special', special: 'remove', target: 'enemy' },
        voice_of_ages: { name: 'Voice of Ages', kind: 'mag', power: 16, element: 'shoot', add: ['silence'], hit: 100, mp: 10, target: 'allEnemies' }
      },
      ai: {
        counter: { mag: 'voice_of_ages', chance: 50 },
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) v.c = b.rnd(3);
          var sc = U.sc(e, [3, 4, 5, 6]), t = U.pickWithout(b, 'petrify');
          var slap = function () { return { move: U.one(b, sc) ? 'guitar_slap_2' : 'attack', target: t }; };
          if (v.c <= 1) { v.c++; return slap(); }
          if (v.c === 2) {
            var r = U.one(b, sc) ? 'petrif_eye' : null;
            v.c = U.one(b, sc) ? 3 : b.rnd(2);
            return r ? { move: r, target: t } : slap();
          }
          v.c = b.rnd(2);
          return U.one(b, sc) ? { move: 'sun_diver', target: t } : slap();
        }
      }
    },

    iron_man: {
      name: 'Iron Man', level: 46, hp: 20000, mp: 100, exp: 10000, ap: 150, gil: 600,
      atk: 180, def: 240, defPct: 1, mat: 160, mdf: 400, dex: 200, lck: 0,
      elem: { water: 2, fire: 0.5, ice: 0.5, earth: 0.5 },
      immune: ['death', 'confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk'],
      drops: [{ item: 'phoenix_down', chance: 14 }], steal: [{ item: 'elixir', chance: 14 }], morph: 'escort_guard',
      boss: false, flying: false, row: 'front',
      look: { type: 'giant', c1: '#505860', c2: '#c0c8d0', c3: '#ff2020', size: 2, variant: 2 },
      attacks: {
        attack: { name: 'Heavy Sword', kind: 'phys', power: 20, element: 'cut', target: 'enemy', silent: true },
        heavy_sword_2: { name: 'Heavy Sword', kind: 'phys', power: 20, element: 'cut', hits: 2, random: true, target: 'enemy', silent: true },
        grand_sword: { name: 'Grand Sword', kind: 'phys', power: 16, element: 'shoot', target: 'allEnemies' },
        grand_sword_2: { name: 'Grand Sword', kind: 'phys', power: 16, element: 'shoot', hits: 2, target: 'allEnemies' },
        adrenaline: { name: 'Adrenaline', kind: 'status', add: ['haste', 'barrier'], hit: 100, target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.ad === undefined) v.ad = 4;
          var buffed = b.has(e, 'haste') && b.has(e, 'barrier');
          if (e.hpPct <= 75 && v.ad > 0 && !buffed) { v.ad--; return { move: 'adrenaline', target: 'self' }; }
          if (buffed) return { move: U.one(b, 4) ? 'grand_sword_2' : 'grand_sword', target: 'all' };
          if (U.one(b, 4)) return { move: 'grand_sword', target: 'all' };
          return { move: U.one(b, 2) ? 'heavy_sword_2' : 'attack', target: 'random' };
        }
      }
    },

    // =====================================================================
    // FINAL BATTLES (Northern Crater core)
    // =====================================================================
    // Jenova·SYNTHESIS: body (A) + two tentacle arms (B = left, 10000 HP; C = right, 8000 HP).
    // Only A acts. Below 15,000 HP it counts down 5..1 and casts Ultima, which ends the battle.
    jenova_synthesis: {
      name: 'Jenova·SYNTHESIS', level: 61, hp: 60000, mp: 600, exp: 60000, ap: 500, gil: 0,
      atk: 150, def: 100, defPct: 1, mat: 120, mdf: 180, dex: 120, lck: 0,
      elem: { earth: 0, gravity: 0, poison: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['jenova_synthesis_b', 'jenova_synthesis_c'],
      look: { type: 'custom', id: 'jenova_synthesis', c1: '#6040a0', c2: '#e0a0c0', c3: '#ffff60', size: 3 },
      attacks: {
        absorb: { name: 'Absorb', kind: 'mag', power: 20, add: ['sadness'], hit: 75, target: 'enemy' },
        repeating_slap: { name: 'Repeating Slap', kind: 'phys', power: 20, element: 'hit', add: ['fury'], hit: 75, target: 'enemy', silent: true },
        bio2: { name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 75, mp: 36, target: 'allEnemies' },
        cure3: { name: 'Cure3', kind: 'heal', power: 130, element: 'restorative', mp: 64, target: 'allAllies' },
        stop: { name: 'Stop', kind: 'status', add: ['stop'], hit: 94, mp: 34, target: 'enemy' },
        // arms come back at 25% HP
        right_hand_revived: { name: '', kind: 'special', special: 'callHelp', summon: 'jenova_synthesis_c', hpPct: 25, target: 'self', silent: true },
        left_hand_revived: { name: '', kind: 'special', special: 'callHelp', summon: 'jenova_synthesis_b', hpPct: 25, target: 'self', silent: true },
        count_5: { name: '5', kind: 'special', special: 'nothing', target: 'self' },
        count_4: { name: '4', kind: 'special', special: 'nothing', target: 'self' },
        count_3: { name: '3', kind: 'special', special: 'nothing', target: 'self' },
        count_2: { name: '2', kind: 'special', special: 'nothing', target: 'self' },
        count_1: { name: '1', kind: 'special', special: 'nothing', target: 'self' },
        ultima: { name: 'Ultima', kind: 'mag', power: 105, mp: 130, target: 'allEnemies', endBattle: true },
        wait: idle()
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.u === undefined) { v.u = 9; v.c = 0; }
          if (e.hp < 15000 && v.u > 5) v.u = 5;
          if (v.u < 6) {
            var n = v.u; v.u--;
            if (n <= 0) return { move: 'ultima', target: 'all' };
            return { move: 'count_' + n, target: 'self' };
          }
          var ids = U.foes(b).some(function (c) { return U.id(c) !== null; });
          var bAlive = ids ? U.count(b, 'jenova_synthesis_b') > 0 : true;
          var cAlive = ids ? U.count(b, 'jenova_synthesis_c') > 0 : true;
          e.def = bAlive ? 100 : 80; e.mdf = cAlive ? 180 : 150;   // arms dead -> lower defences
          if (v.revB) { v.revB = 0; return { move: 'left_hand_revived', target: 'self' }; }
          v.c = v.c >= 250 ? v.c - 9 : v.c + 1;
          var s = v.c % 5;
          if (s === 1 || s === 3) return bAlive ? { move: 'repeating_slap', target: 'random' } : { move: 'wait', target: 'self' };
          if (s === 2 || s === 4) return cAlive ? { move: 'absorb', target: 'random' } : { move: 'wait', target: 'self' };
          if (!bAlive && !cAlive) { v.revB = 1; return { move: 'right_hand_revived', target: 'self' }; }
          if (!cAlive) return e.mp >= 34 ? { move: 'stop', target: 'random' } : { move: 'wait', target: 'self' };
          if (!bAlive) return e.mp >= 64 ? { move: 'cure3', target: 'allies' } : { move: 'wait', target: 'self' };
          return e.mp >= 36 ? { move: 'bio2', target: 'all' } : { move: 'wait', target: 'self' };
        }
      },
      desc: 'Jenova\'s final form, merged with Sephiroth\'s cells.'
    },

    jenova_synthesis_b: {
      name: 'Jenova·SYNTHESIS', level: 61, hp: 10000, mp: 600, exp: 0, ap: 0, gil: 0,
      atk: 150, def: 100, defPct: 1, mat: 120, mdf: 180, dex: 120, lck: 0,
      elem: { earth: 0, gravity: 0, poison: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#6040a0', c2: '#e0a0c0', c3: '#ffff60', size: 1.6, variant: 1 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },
      desc: 'Left tentacle (while it lives: Repeating Slap; while dead: body Def 80).'
    },

    jenova_synthesis_c: {
      name: 'Jenova·SYNTHESIS', level: 61, hp: 8000, mp: 600, exp: 0, ap: 0, gil: 0,
      atk: 150, def: 100, defPct: 1, mat: 120, mdf: 180, dex: 120, lck: 0,
      elem: { earth: 0, gravity: 0, poison: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#6040a0', c2: '#e0a0c0', c3: '#ffff60', size: 1.6, variant: 2 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },
      desc: 'Right tentacle (while it lives: Absorb; while dead: body MDf 150).'
    },

    // Bizarro·Sephiroth — single-party version. A = main body, B = head, C = core (heals A every turn;
    // immune until both magic parts D/E are dead), D = right magic (absorbs Ice/Lightning),
    // E = left magic (absorbs Fire/Earth). HP values are for 0 characters at Lv 99 and no
    // Knights of the Round on Jenova·SYNTHESIS (see docs for the scaling).
    // The main body also works alone (formation ['bizarro_sephiroth']): absent parts count as alive.
    bizarro_sephiroth: {
      name: 'Bizarro·Sephiroth', level: 61, hp: 40000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 210, def: 200, defPct: 1, mat: 144, mdf: 200, dex: 100, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      onDeathRemove: ['bizarro_sephiroth_b', 'bizarro_sephiroth_c', 'bizarro_sephiroth_d', 'bizarro_sephiroth_e'],
      look: { type: 'custom', id: 'bizarro_sephiroth', c1: '#404860', c2: '#e0e0f0', c3: '#60ffa0', size: 3 },
      attacks: {
        sephiroth_shock: { name: 'Sephiroth Shock', kind: 'phys', power: 10, element: 'cut', target: 'enemy', silent: true },
        // cast while the head is down: revives and fully heals the party... but strips every status
        aurora_fence: { name: 'Aurora Fence', kind: 'heal', power: 1, element: 'restorative', target: 'allEnemies',
          remove: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb', 'petrify', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'death_sentence', 'berserk', 'peerless', 'paralysis', 'resist'] },
        bolt3: { name: 'Bolt3', kind: 'mag', power: 64, element: 'lightning', target: 'enemy' },
        quake3: { name: 'Quake3', kind: 'mag', power: 70, element: 'earth', target: 'enemy' },
        stigma: { name: 'Stigma', kind: 'mag', power: 28, element: 'shout', add: ['poison', 'slow'], hit: 100, target: 'allEnemies' },
        heartless_angel: { name: 'Heartless Angel', kind: 'pct', pct: 99, target: 'allEnemies' },   // HP -> 1
        ice3: { name: 'Ice3', kind: 'mag', power: 64, element: 'ice', target: 'enemy' },
        fire3: { name: 'Fire3', kind: 'mag', power: 64, element: 'fire', target: 'enemy' },
        head_revived: { name: 'Head Portion (B) Revived', kind: 'special', special: 'callHelp', summon: 'bizarro_sephiroth_b', target: 'self' },
        magic_d_revived: { name: 'Right Magic (D) Revived', kind: 'special', special: 'callHelp', summon: 'bizarro_sephiroth_d', target: 'self' },
        magic_e_revived: { name: 'Left Magic (E) Revived', kind: 'special', special: 'callHelp', summon: 'bizarro_sephiroth_e', target: 'self' },
        think: { name: 'Think about the sequence of the 5 targets and beat them!', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          if (v.c === undefined) {
            v.c = 0; v.hr = 0; v.ct = 0;
            v.parts = ['bizarro_sephiroth_b', 'bizarro_sephiroth_c', 'bizarro_sephiroth_d', 'bizarro_sephiroth_e']
              .some(function (id) { return U.count(b, id) > 0; });
            if (v.parts) return { move: 'think', target: 'self' };
          }
          var alive = function (id) { return !v.parts || U.count(b, id) > 0; };
          var head = alive('bizarro_sephiroth_b'), core = alive('bizarro_sephiroth_c');
          var rm = alive('bizarro_sephiroth_d'), lm = alive('bizarro_sephiroth_e');
          if (v.parts && !rm && !lm && core) v.ct++; else v.ct = 0;
          if (v.reviveE) { v.reviveE = 0; return { move: 'magic_e_revived', target: 'self' }; }
          if (!head) {
            if (v.hr === 0) v.hr = 1 + b.rnd(3);
            else if (--v.hr === 0) return { move: 'head_revived', target: 'self' };
          }
          v.c++;
          var R = 'random';
          if (v.c === 1) {
            if (core && !rm && !lm && v.ct > 8) { v.ct = 0; v.reviveE = 1; return { move: 'magic_d_revived', target: 'self' }; }
            if (!head) return { move: 'aurora_fence', target: 'all' };
          } else if (v.c === 2) { if (rm) return { move: 'bolt3', target: R }; }
          else if (v.c === 3) { if (lm) return { move: 'quake3', target: R }; }
          else if (v.c === 4) { if (head) return core ? { move: 'stigma', target: 'all' } : { move: 'heartless_angel', target: 'all' }; }
          else if (v.c === 5 || v.c === 6) { return { move: 'sephiroth_shock', target: R }; }
          else if (v.c === 7) { if (rm) return { move: 'ice3', target: R }; }
          else { v.c = 0; if (lm) return { move: 'fire3', target: R }; }
          return { move: 'sephiroth_shock', target: R };
        }
      },
      desc: 'The Sephiroth-Jenova amalgam in the planet\'s core.'
    },

    bizarro_sephiroth_b: {
      name: 'Bizarro·Sephiroth', level: 61, hp: 2000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 210, def: 200, defPct: 1, mat: 144, mdf: 200, dex: 100, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'demon', c1: '#e0e0f0', c2: '#404860', c3: '#60ffa0', size: 1.2, variant: 3 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },
      desc: 'Head portion (B). While it is down the body casts Aurora Fence instead of attacking.'
    },

    bizarro_sephiroth_c: {
      name: 'Bizarro·Sephiroth', level: 61, hp: 10000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 210, def: 200, defPct: 1, mat: 144, mdf: 200, dex: 100, lck: 0,
      elem: { gravity: 0 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'back',
      invulnerable: true,   // becomes vulnerable (e.vars.vulnerable) once both magic parts D and E are dead
      look: { type: 'blob', c1: '#60ffa0', c2: '#206040', c3: '#ffffff', size: 1.3, variant: 1 },
      attacks: {
        // heals the main body every turn
        bizarro_energy: { name: 'Bizzarro Enegy', kind: 'heal', power: 255, element: 'restorative', target: 'ally' }
      },
      ai: {
        custom: function (e, b) {
          var v = U.v(e);
          var ids = U.foes(b).some(function (c) { return U.id(c) !== null; });
          v.vulnerable = ids && U.count(b, 'bizarro_sephiroth_d') === 0 && U.count(b, 'bizarro_sephiroth_e') === 0;
          var body = U.find(b, 'bizarro_sephiroth');
          return { move: 'bizarro_energy', target: body || 'ally' };
        }
      },
      desc: 'Core (C). Heals the body every turn; shielded while Right/Left Magic live.'
    },

    bizarro_sephiroth_d: {
      name: 'Bizarro·Sephiroth', level: 61, hp: 4000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 210, def: 200, defPct: 1, mat: 144, mdf: 200, dex: 100, lck: 0,
      elem: { gravity: 0, ice: -1, lightning: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#4080ff', c2: '#e0e0f0', c3: '#ffff80', size: 1.2, variant: 1 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },
      desc: 'Right Magic (D). Lets the body cast Bolt3 / Ice3.'
    },

    bizarro_sephiroth_e: {
      name: 'Bizarro·Sephiroth', level: 61, hp: 4000, mp: 400, exp: 0, ap: 0, gil: 0,
      atk: 210, def: 200, defPct: 1, mat: 144, mdf: 200, dex: 100, lck: 0,
      elem: { gravity: 0, fire: -1, earth: -1 }, immune: imm(BOSS_IMM, ['haste', 'slow']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#ff6040', c2: '#e0e0f0', c3: '#ffff80', size: 1.2, variant: 2 },
      attacks: { wait: idle() },
      ai: { custom: function () { return { move: 'wait', target: 'self' }; } },
      desc: 'Left Magic (E). Lets the body cast Quake3 / Fire3.'
    },

    // Safer·Sephiroth: base values (0 characters at Lv 99). Each Lv 99 character adds +30000 HP, +2 Att,
    // +20 Def, +5 MAt, +16 MDf (max 400,000 HP); +80000 HP if Knights of the Round hit Jenova·SYNTHESIS.
    safer_sephiroth: {
      name: 'Safer·Sephiroth', level: 87, hp: 80000, mp: 680, exp: 0, ap: 0, gil: 0,
      atk: 230, def: 100, defPct: 1, mat: 100, mdf: 180, dex: 160, lck: 0,
      elem: { earth: 0, gravity: 0 }, immune: imm(BOSS_IMM, ['regen', 'reflect']),
      drops: [], steal: [], morph: null,
      boss: true, flying: true, row: 'front',
      look: { type: 'custom', id: 'safer_sephiroth', c1: '#f0f0ff', c2: '#303848', c3: '#80c0ff', size: 3 },
      attacks: {
        // MP is refilled every turn in FF7, so no MP costs are listed here
        slash: { name: 'Attack', kind: 'phys', power: 24, element: 'cut', add: ['paralysis', 'darkness'], hit: 100, target: 'enemy', silent: true },
        deen: { name: 'Deen', kind: 'mag', power: 25, target: 'allEnemies' },
        wall: { name: 'Wall', kind: 'status', add: ['barrier', 'mbarrier'], hit: 100, target: 'self' },
        pale_horse: { name: 'Pale Horse', kind: 'mag', power: 35, add: ['sadness', 'frog', 'small'], hit: 100, target: 'enemy' },
        shadow_flare: { name: 'Shadow Flare', kind: 'mag', power: 125, target: 'enemy' },
        super_nova: { name: 'Super Nova', kind: 'pct', pct: 94, add: ['confusion', 'silence', 'slow'], hit: 50, target: 'allEnemies', anim: 'super_nova' },
        despell: { name: 'DeSpell', kind: 'status', remove: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'resist'], hit: 100, target: 'allEnemies' },
        despell_self: { name: 'DeSpell', kind: 'status', remove: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'resist'], hit: 100, target: 'self' },
        heartless_angel: { name: 'Heartless Angel', kind: 'pct', pct: 99, target: 'allEnemies' },   // HP -> 1
        break_: { name: 'Break', kind: 'mag', power: 100, element: 'earth', add: ['petrify'], hit: 50, target: 'enemy' },
        fly_up: idle(), fly_down: idle()
      },
      ai: {
        // fixed 8-turn cycle
        custom: function (e, b) {
          var v = U.v(e);
          v.c = (v.c || 0) + 1;
          switch (v.c) {
            case 1:
              if (b.has(e, 'slow')) return { move: 'despell_self', target: 'self' };
              v.ms = v.ms ? 0 : 1;
              return v.ms ? { move: 'wall', target: 'self' } : { move: 'despell', target: 'all' };
            case 2: return v.ms ? { move: 'shadow_flare', target: 'random' } : { move: 'deen', target: 'all' };
            case 3: return { move: 'slash', target: U.highest(b) };
            case 4: e.flying = true; return { move: 'fly_up', target: 'self' };
            case 5: return { move: 'pale_horse', target: 'random' };
            case 6: return { move: 'super_nova', target: 'all' };
            case 7: return e.hpPct > 25 ? { move: 'break_', target: 'random' } : { move: 'heartless_angel', target: 'all' };
            default: v.c = 0; return { move: 'fly_down', target: 'self' };
          }
        }
      },
      desc: 'Sephiroth\'s god-form.'
    },

    // The final one-on-one with Cloud. The engine plays the scripted Omnislash win; any hit finishes him.
    sephiroth_final: {
      name: 'Sephiroth', level: 50, hp: 1, mp: 0, exp: 0, ap: 0, gil: 0,
      atk: 0, def: 0, defPct: 0, mat: 0, mdf: 0, dex: 100, lck: 0,
      elem: {}, immune: imm(BOSS_IMM, ['regen', 'reflect']),
      drops: [], steal: [], morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'custom', id: 'sephiroth', c1: '#202030', c2: '#e0e0f0', c3: '#60ff80', size: 1.4 },
      attacks: {
        cut: { name: 'Cut', kind: 'pct', pct: 97, target: 'enemy', silent: true }
      },
      ai: {
        custom: function (e, b) {
          var cloud = U.party(b).filter(function (c) { return U.isChar(c, 'cloud'); })[0];
          return { move: 'cut', target: cloud || 'random' };
        }
      },
      desc: 'The final duel inside the Lifestream.'
    }

  });

  // Not in the PS1 game (Config > Turks Join, js/maps/extra/turks.js): the Shinra holdouts guarding the medevac wreck on
  // Da-chao's summit in Disc 3 - a refitted Grosspanzer, a boss at the party's Disc 3 strength (with two SOLDIER:1st)
  const E = FF7.data.enemies, gm = E.grosspanzer_mobile;
  if (gm) E.holdout_panzer = Object.assign({}, gm, {
    name: 'Holdout Panzer', level: 58, hp: 38000, mp: 600, exp: 9000, ap: 900, gil: 12000,
    atk: 190, def: 170, mat: 140, mdf: 200, dex: 90,
    boss: true, onDeathRemove: null, drops: [{ item: 'megalixir', chance: 100 }], steal: [{ item: 'turbo_ether', chance: 32 }],
    look: Object.assign({}, gm.look, { c1: '#3a3e46', c2: '#8a8a90', c3: '#ff2020', size: 1.8 }),
    desc: 'A Shinra holdout tank, patched up and still guarding the medevac wreck.',
  });
  // Zack's last stand (Config > Playable Flashbacks, js/maps/extra/flashbacks.js): the whole Shinra detachment on the
  // cliff outside Midgar - far too many to beat; the volleys grow heavier every turn (the fight is lost, canLose)
  E.shinra_army = {
    name: 'Shinra Army', level: 60, hp: 250000, mp: 0, exp: 0, ap: 0, gil: 0,
    atk: 120, def: 200, defPct: 1, mat: 60, mdf: 200, dex: 80, lck: 0,
    elem: { gravity: 0 }, immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis', 'stop', 'slow'],
    drops: [], steal: [], morph: null,
    boss: true, flying: false, row: 'front',
    look: { type: 'soldier', c1: '#3a4a3a', c2: '#8a8a60', c3: '#e0b890', size: 1.25 },
    attacks: {
      volley: { name: 'Volley', kind: 'phys', power: 11, element: 'shoot', target: 'enemy', hits: 3, random: true },
      heavy_volley: { name: 'Concentrated Fire', kind: 'phys', power: 20, element: 'shoot', target: 'enemy', hits: 3, random: true },
      barrage: { name: 'Barrage', kind: 'phys', power: 96, element: 'shoot', target: 'enemy', hits: 2, random: true },
    },
    ai: {
      custom: function (e, b) {   // heavier every turn: volleys, then concentrated fire, then the barrage
        const v = e.vars || (e.vars = {}); v.t = (v.t || 0) + 1;
        return { move: v.t < 4 ? 'volley' : v.t < 7 ? 'heavy_volley' : 'barrage', target: 'random' };   // (a stand of several turns: Zack gets to fight)
      },
    },
    desc: 'Rank after rank of Shinra infantry. There is no end to them.',
  };

})();

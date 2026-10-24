// FF7 enemies - Disc 1, part B: the Kalm flashback (Mt. Nibel five years ago), Costa del Sol,
// Mt. Corel, Corel Prison & desert, Gold Saucer area, Gongaga, Cosmo Canyon & Cave of the Gi,
// Nibelheim (Shinra Mansion, Mt. Nibel), Rocket Town, Wutai (Da-chao, Pagoda), Temple of the
// Ancients, Bone Village / Corral Valley / Forgotten Capital and the matching world-map regions.
//
// Stats, elements, immunities, drops/steals/morphs and AI follow Terence Fergusson's FF7 Enemy
// Mechanics FAQ (references/text/Enemy_Mechanics_FAQ.txt). Conventions used here:
//  - drop/steal chance = (FAQ chance class + 1) / 64 in %, duplicates merged;
//  - attack power in 16ths of base (FAQ "1 1/4x Base" = 20); status hit = FAQ rating - 1;
//  - HP% attacks use kind 'pct' (ofMax: true = % of max HP); Cure formula power = constant / 22;
//  - "<Name>" attacks from the FAQ (name not displayed in FF7) have silent: true;
//  - "uses X twice in a combo" is a second attack entry with hits: 2, random: true;
//  - AI scripts are condensed into custom(e, b) functions using only the documented e / b API.
// Encounter tables: js/data/encounters_d1b.js; boss ids / formations: docs/enemies_d1b.md.
(function () {
  // Small helpers shared by the custom AI scripts below (only the documented e/b API is used).
  var H = {
    // FF7 "SpclChance" brackets: value by HP% (>75, >50, >25, rest)
    spc: function (e, a, b2, c, d) {
      var p = e.hpPct;
      return p > 75 ? a : p > 50 ? b2 : p > 25 ? c : d;
    },
    // true with probability 1/n
    one: function (b, n) { return n <= 1 || b.rnd(n) === 0; },
    party: function (b) { return b.party() || []; },
    // party members without / with a status
    wo: function (b, st, list) {
      return (list || b.party() || []).filter(function (t) { return !b.has(t, st); });
    },
    wi: function (b, st, list) {
      return (list || b.party() || []).filter(function (t) { return b.has(t, st); });
    },
    // member with the highest / lowest numeric field (hp, mp, def ...)
    hi: function (list, key) {
      var best = null;
      (list || []).forEach(function (t) { if (!best || (t[key] || 0) > (best[key] || 0)) best = t; });
      return best;
    },
    lo: function (list, key) {
      var best = null;
      (list || []).forEach(function (t) { if (!best || (t[key] || 0) < (best[key] || 0)) best = t; });
      return best;
    },
    // HP% of any combatant
    pct: function (t) {
      if (!t) return 100;
      if (typeof t.hpPct === 'number') return t.hpPct;
      return t.maxHp ? 100 * t.hp / t.maxHp : 100;
    },
    // is this party member one of the given character ids?
    isChar: function (t, ids) {
      var k = t && (t.id || t.charId || t.char || t.key);
      return ids.indexOf(k) >= 0;
    },
    // the other enemies in the battle
    mates: function (e, b) {
      return (b.enemies() || []).filter(function (x) { return x !== e; });
    },
    go: function (move, target) { return { move: move, target: target || 'random' }; }
  };

  Object.assign(FF7.data.enemies, {
    // ===== Corel Area (Costa del Sol / North Corel world map) - also Gold Saucer, Gongaga beaches =====
    grangalan: {
      name: 'Grangalan',
      level: 16, hp: 550, mp: 60,
      exp: 88, ap: 10, gil: 220,
      atk: 40, def: 88, defPct: 1,
      mat: 25, mdf: 120,
      dex: 50, lck: 0,
      elem: { earth: 0, water: 0, gravity: 0 },
      immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate',
        'peerless', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'back',
      look: { type: 'blob', c1: '#9a6a3a', c2: '#e8c890', c3: '#202020', size: 1.2, variant: 1 },
      attacks: {
        silver_wheel: { name: 'Silver Wheel', kind: 'phys', power: 20, element: 'shout', target: 'enemy' },
        darkeye: { name: 'Darkeye', kind: 'status', add: ['darkness'], hit: 71, target: 'enemy', mp: 4 },
        put_out: {
          name: 'Put out', kind: 'special', special: 'callHelp', target: 'self', summon: 'grangalan_jr',
          silent: true
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['silver_wheel', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (!v.stage) {
            // FF7: after a few hits it opens up and releases Grangalan Jr.
            if (e.turn >= 2 || e.hpPct < 75) { v.stage = 1; v.c = 0; return H.go('put_out', 'self'); }
            return H.go('silver_wheel');
          }
          v.c = v.c || 0;
          if (H.mates(e, b).length > 0) {
            if (v.c >= 4) { v.c = 0; return H.go('silver_wheel'); }
            v.c++;
            return H.go('wait', 'self');
          }
          if (v.c >= 4) { v.c = 0; return H.go('darkeye'); }
          v.c++;
          return H.go('silver_wheel');
        }
      },
      desc: 'A doll inside a doll inside a doll. Killing it first removes its offspring (and their spoils).'
    },
    grangalan_jr: {
      name: 'Grangalan Jr.',
      level: 15, hp: 330, mp: 40,
      exp: 77, ap: 8, gil: 110,
      atk: 30, def: 66, defPct: 1,
      mat: 15, mdf: 80,
      dex: 55, lck: 0,
      elem: { earth: 0, water: 0, gravity: 0 },
      immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate',
        'peerless', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'back',
      look: { type: 'blob', c1: '#b07a44', c2: '#f0d8a0', c3: '#202020', size: 0.85, variant: 1 },
      attacks: {
        silver_wheel: { name: 'Silver Wheel', kind: 'phys', power: 20, element: 'shout', target: 'enemy' },
        triclops: {
          name: 'Triclops', kind: 'status', add: ['sadness', 'slow_numb'], hit: 71, target: 'enemy', mp: 4
        },
        put_out: {
          name: 'Put out', kind: 'special', special: 'callHelp', target: 'self', summon: 'grangalan_jrjr',
          count: 3, silent: true
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['silver_wheel', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (!v.stage) {
            if (e.turn >= 2 || H.one(b, 4)) { v.stage = 1; v.c = 0; return H.go('put_out', 'self'); }
            return H.go('silver_wheel');
          }
          v.c = v.c || 0;
          if (H.mates(e, b).length > 1) {
            if (v.c >= 3) { v.c = 0; return H.go('silver_wheel'); }
            v.c++;
            return H.go('wait', 'self');
          }
          if (v.c >= 4) { v.c = 0; return H.go('triclops'); }
          v.c++;
          return H.go('silver_wheel');
        }
      },
      desc: 'Released by Grangalan. Releases three Grangalan Jr.Jr.'
    },
    grangalan_jrjr: {
      name: 'Grangalan Jr.Jr.',
      level: 14, hp: 110, mp: 20,
      exp: 66, ap: 6, gil: 55,
      atk: 20, def: 44, defPct: 1,
      mat: 5, mdf: 40,
      dex: 60, lck: 0,
      elem: { earth: 0, water: 0, gravity: 0 },
      immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate',
        'peerless', 'paralysis'],
      drops: [{ item: 'potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'blob', c1: '#c68c50', c2: '#f8e4b8', c3: '#202020', size: 0.6, variant: 1 },
      attacks: {
        silver_wheel: { name: 'Silver Wheel', kind: 'phys', power: 20, element: 'shout', target: 'enemy' },
        stop_eye: { name: 'Stop Eye', kind: 'status', add: ['stop'], hit: 71, target: 'enemy', mp: 4 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['silver_wheel', 1], ['wait', 3]]
      },
      desc: 'The smallest of the Grangalan family.'
    },
    needle_kiss: {
      name: 'Needle Kiss',
      level: 17, hp: 180, mp: 40,
      exp: 75, ap: 8, gil: 130,
      atk: 26, def: 38, defPct: 1,
      mat: 25, mdf: 60,
      dex: 47, lck: 0,
      elem: { wind: 2, lightning: 0, earth: 0 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'bolt_plume', chance: 14 }],
      steal: [{ item: 'soft', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: true, row: 'front',
      look: { type: 'insect', c1: '#e8c830', c2: '#3a3020', c3: '#ff5030', size: 0.9 },
      attacks: {
        attack: { name: 'Chute Attack', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        chute_combo: {
          name: 'Chute Attack', kind: 'phys', power: 16, element: 'punch', target: 'enemy', hits: 2,
          random: true, silent: true
        },
        thunder_kiss: { name: 'Thunder Kiss', kind: 'mag', power: 12, element: 'lightning', target: 'enemy', mp: 4 }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var s = H.spc(e, 8, 6, 4, 2);
          if (H.one(b, s)) return H.go('thunder_kiss');
          return H.go(H.one(b, s) ? 'chute_combo' : 'attack');
        }
      },
      desc: 'Weak against wind. Gets more aggressive as it is hurt.'
    },
    beach_plug: {
      name: 'Beach Plug',
      level: 16, hp: 200, mp: 100,
      exp: 95, ap: 10, gil: 155,
      atk: 22, def: 36, defPct: 1,
      mat: 8, mdf: 36,
      dex: 52, lck: 0,
      elem: { ice: 0.5 },
      immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'turbo_ether',
      boss: false, flying: false, row: 'front',
      look: { type: 'worm', c1: '#e89aa0', c2: '#f4e2c0', c3: '#402020', size: 0.9 },
      attacks: {
        attack: { name: 'Bite', kind: 'phys', power: 16, target: 'enemy', silent: true },
        ice: { name: 'Ice', kind: 'mag', power: 8, element: 'ice', target: 'enemy', mp: 4 },
        big_guard: {
          name: 'Big Guard', kind: 'status', add: ['barrier', 'mbarrier', 'haste'], hit: 100,
          target: 'allAllies', mp: 56, eskill: 'big_guard'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        counter: { mag: 'ice', chance: 50 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(2);
          if (v.c === 0) { v.c = 1; return H.go('wait', 'self'); }
          v.c = 0;
          return H.go('attack');
        }
      },
      desc: 'Answers magic with Ice. Big Guard can only be learned by Manipulating it.'
    },

    // ===== Mt. Corel (incl. reactor, rail tracks and bridge) =====
    search_crown: {
      name: 'Search Crown',
      level: 16, hp: 150, mp: 30,
      exp: 80, ap: 8, gil: 111,
      atk: 20, def: 26, defPct: 1,
      mat: 30, mdf: 70,
      dex: 40, lck: 0,
      elem: { fire: 0.5 },
      immune: ['confusion', 'frog', 'small', 'manipulate'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'turbo_ether', chance: 14 }],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#d8a020', c2: '#6a8a30', c3: '#ff3030', size: 0.8 },
      attacks: {
        attack: { name: 'Seed Shot', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        four_laser: { name: 'Four Laser', kind: 'mag', power: 7, target: 'enemy', mp: 8 }
      },
      ai: {
        moves: [['attack', 1], ['four_laser', 1]]
      },
      desc: 'Resists fire.'
    },
    bagnadrana: {
      name: 'Bagnadrana',
      level: 16, hp: 450, mp: 60,
      exp: 110, ap: 11, gil: 120,
      atk: 40, def: 40, defPct: 1,
      mat: 23, mdf: 80,
      dex: 43, lck: 0,
      elem: { ice: 2, fire: 0, gravity: 0 },
      immune: ['death', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless',
        'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'diamond_pin', chance: 14 }],
      morph: 'guard_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#7a4a8a', c2: '#d8c070', c3: '#ffe040', size: 1.1 },
      attacks: {
        attack: { name: 'Fang', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        claw: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        horn: { name: 'Horn', kind: 'phys', power: 18, element: 'punch', target: 'enemy' },
        poison_breath: {
          name: 'Poison Breath', kind: 'mag', power: 12, element: 'poison', add: ['poison'], hit: 83,
          target: 'enemy', mp: 10
        }
      },
      ai: {
        moves: [['attack', 1], ['claw', 1], ['horn', 1], ['poison_breath', 1]]
      },
      desc: 'Weak against ice. Immune to fire.'
    },
    bloatfloat: {
      name: 'Bloatfloat',
      level: 18, hp: 240, mp: 0,
      exp: 90, ap: 9, gil: 125,
      atk: 20, def: 36, defPct: 1,
      mat: 24, mdf: 40,
      dex: 52, lck: 0,
      elem: { wind: 2, earth: 0 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'soft', chance: 14 }],
      morph: 'hi_potion',
      boss: false, flying: true, row: 'front',
      look: { type: 'blob', c1: '#c0d8e8', c2: '#e86080', c3: '#303030', size: 0.9, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        vacuum: { name: 'Vacuum', kind: 'phys', power: 25, target: 'enemy' },
        spiky_hell: { name: 'Spiky Hell', kind: 'fixed', amount: 200, element: 'punch', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1], ['vacuum', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          // FF7: a one-time 200-damage counter on the member with the highest HP
          if (!v.spiky && e.hpPct < 100 && H.one(b, 3)) { v.spiky = 1; return H.go('spiky_hell', H.hi(H.party(b), 'hp')); }
          return H.go(H.one(b, 2) ? 'attack' : 'vacuum');
        }
      },
      desc: 'Weak against wind. Retaliates once with Spiky Hell.'
    },
    cokatolis: {
      name: 'Cokatolis',
      level: 17, hp: 420, mp: 0,
      exp: 97, ap: 10, gil: 168,
      atk: 30, def: 36, defPct: 1,
      mat: 24, mdf: 60,
      dex: 55, lck: 0,
      elem: {},
      immune: ['slow_numb', 'petrify'],
      drops: [{ item: 'soft', chance: 14 }],
      steal: [{ item: 'soft', chance: 52 }],
      morph: 'soft',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#e8e0d0', c2: '#d04020', c3: '#f0c020', size: 1.1 },
      attacks: {
        attack: { name: 'Beak', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        bird_kick: { name: 'Bird Kick', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        petrify_smog: { name: 'Petrify Smog', kind: 'status', add: ['slow_numb'], hit: 71, target: 'enemy' },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['bird_kick', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = 0; v.at = 8; v.pu = 2; }
          var ok = H.party(b).filter(function (t) { return !b.has(t, 'slow_numb') && !b.has(t, 'petrify'); });
          var hit = function () { return H.go(H.one(b, 2) ? 'attack' : 'bird_kick', b.pick(ok)); };
          if (v.c === 0) {
            v.c = 1;
            if (ok.length && H.one(b, 4)) { v.pu--; return H.go('petrify_smog', b.pick(ok)); }
            return H.go('wait', 'self');
          }
          if (!ok.length) return H.go('wait', 'self');
          if (v.c === 1) {
            v.at--;
            if (v.at === 0) v.c = 2;
            return hit();
          }
          v.c = 1;
          if (v.pu > 0 && H.one(b, 3)) { v.at = 8; v.pu--; return H.go('petrify_smog', b.pick(ok)); }
          return hit();
        }
      },
      desc: 'Petrify Smog slowly turns its victim to stone. Carry Softs.'
    },
    bomb: {
      name: 'Bomb',
      level: 18, hp: 600, mp: 30,
      exp: 150, ap: 20, gil: 192,
      atk: 24, def: 60, defPct: 1,
      mat: 22, mdf: 60,
      dex: 65, lck: 0,
      elem: { fire: 0, earth: 0 },
      immune: ['confusion', 'stop', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'shrapnel', chance: 14 }],
      steal: [{ item: 'right_arm', chance: 14 }],
      morph: 'shrapnel',
      boss: false, flying: true, row: 'front',
      look: { type: 'bomb', c1: '#e05020', c2: '#ffb020', c3: '#fff060', size: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        bodyblow_big: { name: 'Bodyblow', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        fireball: { name: 'Fireball', kind: 'mag', power: 16, element: 'fire', target: 'enemy', mp: 3 },
        bomb_blast: { name: 'Bomb Blast', kind: 'special', special: 'selfDestruct', target: 'enemy' },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          if (e.hpPct <= 25) return H.go('bomb_blast');
          var r = b.rnd(4);
          if (e.hpPct <= 50) return H.go(r < 2 ? 'bodyblow_big' : 'fireball');
          if (e.hpPct <= 75) return r === 0 ? H.go('wait', 'self') : r === 1 ? H.go('fireball') : H.go('attack');
          return r < 2 ? H.go('attack') : H.go('wait', 'self');
        }
      },
      desc: 'Grows as it is damaged and explodes below 1/4 HP (no spoils if it does).'
    },

    // ===== Corel Prison =====
    '2_faced': {
      name: '2-Faced',
      level: 18, hp: 330, mp: 80,
      exp: 100, ap: 10, gil: 156,
      atk: 40, def: 38, defPct: 1,
      mat: 25, mdf: 150,
      dex: 48, lck: 0,
      elem: { earth: 0 },
      immune: ['stop', 'frog', 'manipulate', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'phoenix_down', chance: 52 }],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#6a5a8a', c2: '#e0c060', c3: '#ff3030', size: 0.9, variant: 2 },
      attacks: {
        cure3: { name: 'Cure3', kind: 'heal', power: 130, element: 'restorative', target: 'allEnemies', mp: 64 },
        self_destruct: { name: 'Self-destruct', kind: 'special', special: 'selfDestruct', target: 'enemy' },
        vanish: { name: 'Vanish', kind: 'special', special: 'flee', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['wait', 1]],
        counter: { phys: 'self_destruct', mag: 'cure3', chance: 13 },
        custom: function (e, b) {
          // never acts on its own; after its one Cure3 (80 MP -> 16) it vanishes
          if (e.mp < 64) return H.go('vanish', 'self');
          return H.go('wait', 'self');
        }
      },
      desc: 'Only ever counterattacks: either self-destructs or heals your whole party with Cure3 and disappears.'
    },
    bandit: {
      name: 'Bandit',
      level: 17, hp: 360, mp: 0,
      exp: 99, ap: 10, gil: 220,
      atk: 38, def: 40, defPct: 1,
      mat: 5, mdf: 96,
      dex: 68, lck: 0,
      elem: {},
      immune: ['frog'],
      drops: [{ item: 'tent', chance: 14 }],
      steal: [{ item: 'x_potion', chance: 14 }],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#6a5030', c2: '#303848', c3: '#e0b890', size: 1 },
      attacks: {
        attack: { name: 'Hit', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        hold_up: { name: 'Hold-up', kind: 'special', special: 'stealGil', target: 'enemy' },
        mug: { name: 'Mug', kind: 'special', special: 'stealItem', power: 16, target: 'enemy' },
        escape: { name: 'Escape', kind: 'special', special: 'flee', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['mug', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = 0;
          if (v.c === 0) { v.c = H.one(b, 4) ? 1 : 2; return H.go('wait', 'self'); }
          if (v.c === 1 || v.c === 2) {
            var m = v.c === 1 ? 'hold_up' : 'mug';
            v.c = H.one(b, 2) ? 3 : 4;
            return H.go(m);
          }
          if (v.c === 3) { v.c = 4; return H.go('wait', 'self'); }
          return H.go('escape', 'self');
        }
      },
      desc: 'Steals gil (Hold-up) or an item (Mug), then runs. Kill it to get them back.'
    },

    // ===== Corel Desert (prison outskirts, junkyard, desert) =====
    death_claw: {
      name: 'Death Claw',
      level: 19, hp: 400, mp: 120,
      exp: 96, ap: 10, gil: 168,
      atk: 41, def: 44, defPct: 1,
      mat: 30, mdf: 100,
      dex: 51, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'platinum_bangle', chance: 52 }],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'mech', c1: '#8a8a90', c2: '#c04030', c3: '#40ff60', size: 1.1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        death_claw: {
          name: 'Death Claw', kind: 'phys', power: 16, element: 'punch', add: ['paralysis'], hit: 19,
          target: 'enemy'
        },
        laser: { name: 'Laser', kind: 'pct', pct: 50, element: 'gravity', target: 'enemy', mp: 16, eskill: 'laser' },
        barrier: { name: 'Barrier', kind: 'status', add: ['barrier'], hit: 100, target: 'self', mp: 16 },
        mbarrier: { name: 'MBarrier', kind: 'status', add: ['mbarrier'], hit: 100, target: 'self', mp: 24 }
      },
      ai: {
        moves: [['attack', 1], ['death_claw', 1]],
        custom: function (e, b) {
          var r = b.rnd(4);
          if (r === 0) return H.go('attack');
          if (r === 1) return H.go('death_claw');
          if (r === 2) {
            if (!b.has(e, 'barrier') && !b.has(e, 'mbarrier')) return H.go('barrier', 'self');
            return H.go('laser');
          }
          if (!b.has(e, 'mbarrier')) return H.go('mbarrier', 'self');
          if (!b.has(e, 'barrier')) return H.go('barrier', 'self');
          return H.go('death_claw');
        }
      },
      desc: 'Shields itself with Barrier/MBarrier. Laser halves HP.'
    },
    bullmotor: {
      name: 'Bullmotor',
      level: 19, hp: 420, mp: 96,
      exp: 92, ap: 9, gil: 140,
      atk: 36, def: 40, defPct: 1,
      mat: 8, mdf: 120,
      dex: 61, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'ether', chance: 14 }],
      steal: [{ item: 'x_potion', chance: 52 }],
      morph: 'turbo_ether',
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#8a3a2a', c2: '#3a3a3a', c3: '#f0d0a0', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        matra_magic: {
          name: 'Matra Magic', kind: 'mag', power: 11, target: 'allEnemies', mp: 8, eskill: 'matra_magic'
        }
      },
      ai: {
        moves: [['attack', 1], ['matra_magic', 1]]
      },
      desc: 'Fires Matra Magic at the whole party.'
    },
    land_worm: {
      name: 'Land Worm',
      level: 22, hp: 1500, mp: 80,
      exp: 400, ap: 40, gil: 256,
      atk: 60, def: 80, defPct: 1,
      mat: 42, mdf: 230,
      dex: 68, lck: 0,
      elem: { ice: 2, fire: 0.5, gravity: 0.5, earth: -1 },
      immune: ['confusion', 'frog'],
      drops: [{ item: 'ether', chance: 14 }],
      steal: [{ item: 'turbo_ether', chance: 14 }],
      morph: 'fire_fang',
      boss: false, flying: false, row: 'front',
      look: { type: 'worm', c1: '#c8a060', c2: '#8a5a30', c3: '#ff6030', size: 1.8 },
      attacks: {
        earthquake: { name: 'Earthquake', kind: 'mag', power: 6, element: 'earth', target: 'allEnemies', mp: 10 },
        sandstorm: {
          name: 'Sandstorm', kind: 'phys', power: 32, element: 'earth', add: ['darkness'], hit: 47,
          target: 'allEnemies'
        }
      },
      ai: {
        moves: [['earthquake', 1]],
        custom: function (e, b) {
          if (b.has(e, 'poison') || b.has(e, 'confusion')) return H.go('sandstorm', 'all');
          if (e.hpPct <= 50 && H.one(b, 2)) return H.go('sandstorm', 'all');
          return H.go('earthquake', 'all');
        }
      },
      desc: 'Absorbs earth, weak against ice. Morph it for a Fire Fang.'
    },
    cactuar: {
      name: 'Cactuar',
      level: 20, hp: 200, mp: 20,
      exp: 1, ap: 1, gil: 10000,
      atk: 30, def: 40, defPct: 90,
      mat: 20, mdf: 0,
      dex: 40, lck: 40,
      elem: { fire: 0, ice: 0, lightning: 0, earth: 0, gravity: 0, water: 0, holy: 0 },
      immune: ['death', 'sleep', 'poison', 'sadness', 'fury', 'confusion', 'silence', 'haste', 'slow',
        'stop', 'frog', 'small', 'slow_numb', 'petrify', 'regen', 'death_sentence', 'manipulate',
        'berserk', 'peerless', 'paralysis', 'darkness'],
      drops: [],
      steal: [],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#70c040', c2: '#e8d880', c3: '#202020', size: 0.8, variant: 3 },
      attacks: {
        attack: { name: 'Mystery Kick', kind: 'phys', power: 48, element: 'hit', target: 'enemy', silent: true },
        needles: { name: '1000 Needles', kind: 'fixed', amount: 1000, element: 'shoot', target: 'enemy' },
        run_away: { name: 'Escape', kind: 'special', special: 'flee', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var t = e.turn || 0;
          if (t < 2) return H.one(b, 2) ? H.go('attack') : H.go('wait', 'self');
          if (t < 5) return H.one(b, 2) ? H.go('run_away', 'self') : H.go('attack');
          return H.go('run_away', 'self');
        }
      },
      desc: 'Rare desert runner worth 10000 gil. Dodges 7 hits in 8 (Df% 20, 255 on 7/8 of hits - modelled as 90).'
    },
    dyne: {
      name: 'Dyne',
      level: 23, hp: 1200, mp: 20,
      exp: 600, ap: 55, gil: 750,
      atk: 32, def: 64, defPct: 1,
      mat: 25, mdf: 250,
      dex: 55, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
        'manipulate', 'berserk'],
      drops: [{ item: 'silver_armlet', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#5a4a3a', c2: '#9a9aa0', c3: '#d8b090', size: 1.8, variant: 2 },
      attacks: {
        needle_gun: { name: 'Needle Gun', kind: 'phys', power: 48, element: 'hit', target: 'enemy' },
        s_mine: { name: 'S-Mine', kind: 'phys', power: 50, element: 'hit', target: 'enemy' },
        molotov: { name: 'Molotov Cocktail', kind: 'phys', power: 52, element: 'hit', target: 'allEnemies' }
      },
      ai: {
        moves: [['needle_gun', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          // FF7 combos (Needle Gun + S-Mine / + Molotov) are played as two consecutive actions
          if (v.next) { var n = v.next; v.next = null; return H.go(n, n === 'molotov' ? 'all' : 'random'); }
          if (e.hpPct <= 25) { v.next = 'molotov'; return H.go('needle_gun'); }
          if (e.hpPct <= 50) { v.next = 's_mine'; return H.go('needle_gun'); }
          if (e.hpPct <= 75 && H.one(b, 4)) return H.go('s_mine');
          return H.go('needle_gun');
        }
      },
      desc: 'Barret\'s old friend, fought one-on-one in the Corel Prison desert.'
    },

    // ===== Gold Saucer Area (world map) =====
    spencer: {
      name: 'Spencer',
      level: 17, hp: 250, mp: 0,
      exp: 110, ap: 11, gil: 175,
      atk: 42, def: 22, defPct: 1,
      mat: 30, mdf: 120,
      dex: 48, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'saraha_nut', chance: 14 }],
      steal: [{ item: 'saraha_nut', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#d0a060', c2: '#c0c0d0', c3: '#302010', size: 0.9 },
      attacks: {
        attack: { name: 'Swordblade', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        upper_cutter: { name: 'Upper Cutter', kind: 'phys', power: 20, element: 'cut', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1], ['upper_cutter', 1]]
      },
      desc: 'Carries Saraha Nuts for chocobo breeding.'
    },
    flapbeat: {
      name: 'Flapbeat',
      level: 18, hp: 330, mp: 60,
      exp: 140, ap: 15, gil: 186,
      atk: 40, def: 36, defPct: 1,
      mat: 32, mdf: 156,
      dex: 50, lck: 0,
      elem: { wind: 2, earth: 0 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 't_s_bomb', chance: 14 }],
      steal: [{ item: 't_s_bomb', chance: 52 }],
      morph: 't_s_bomb',
      boss: false, flying: true, row: 'front',
      look: { type: 'flyer', c1: '#50a0a0', c2: '#e0e070', c3: '#ff4040', size: 0.9 },
      attacks: {
        attack: { name: 'Tailbeat', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        flying_sickle: { name: 'Flying Sickle', kind: 'mag', power: 12, element: 'wind', target: 'enemy', mp: 8 }
      },
      ai: {
        moves: [['attack', 3], ['flying_sickle', 1]],
        custom: function (e, b) {
          if (H.mates(e, b).length > 0) return H.go(H.one(b, 4) ? 'flying_sickle' : 'attack');
          return H.go(H.one(b, 3) ? 'attack' : 'flying_sickle');
        }
      },
      desc: 'Weak against wind. Uses Flying Sickle more when alone.'
    },
    joker: {
      name: 'Joker',
      level: 18, hp: 370, mp: 0,
      exp: 150, ap: 30, gil: 260,
      atk: 45, def: 32, defPct: 1,
      mat: 31, mdf: 162,
      dex: 60, lck: 0,
      elem: { wind: 2, earth: 0 },
      immune: ['frog', 'small', 'manipulate'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'humanoid', c1: '#8030a0', c2: '#f0e030', c3: '#ffffff', size: 1, variant: 3 },
      attacks: {
        attack: { name: 'Spinning Card', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        spade: { name: 'Spade', kind: 'phys', power: 24, target: 'enemy' },
        heart: { name: 'Heart', kind: 'heal', power: 10, element: 'restorative', target: 'enemy' },
        club: { name: 'Club', kind: 'mag', power: 12, element: 'earth', target: 'enemy' },
        diamond: { name: 'Diamond', kind: 'mag', power: 1, target: 'enemy' },
        joker: { name: 'Joker', kind: 'status', add: ['death'], hit: 47, target: 'enemy' }
      },
      ai: {
        moves: [['heart', 1], ['club', 1], ['diamond', 1], ['joker', 1], ['attack', 2], ['spade', 2]]
      },
      desc: 'A card trick for every suit - Heart even heals you, the Joker card kills.'
    },
    harpy: {
      name: 'Harpy',
      level: 18, hp: 800, mp: 200,
      exp: 148, ap: 14, gil: 210,
      atk: 50, def: 32, defPct: 1,
      mat: 13, mdf: 100,
      dex: 58, lck: 0,
      elem: { gravity: 0.5 },
      immune: ['death', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'peerless', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'striking_staff', chance: 14 }],
      morph: 'elixir',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#a06a50', c2: '#f0c8a0', c3: '#40e040', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        poison_storm: { name: 'Poison Storm', kind: 'status', add: ['poison'], hit: 99, target: 'enemy', mp: 20 },
        aqualung: {
          name: 'Aqualung', kind: 'mag', power: 52, element: 'water', target: 'allEnemies', mp: 34,
          eskill: 'aqualung'
        }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(2);
          var c = v.c;
          v.c = (c + 1) % 3;
          if (c === 0) return H.go('poison_storm');
          if (c === 1) return H.go('attack');
          return H.go('aqualung', 'all');
        }
      },
      desc: 'Only on the Gold Saucer desert sand (buggy / chocobo). Source of Aqualung.'
    },

    // ===== Gongaga Area (world map) - also Cosmo Area grass =====
    grand_horn: {
      name: 'Grand Horn',
      level: 19, hp: 460, mp: 43,
      exp: 180, ap: 15, gil: 240,
      atk: 46, def: 42, defPct: 1,
      mat: 15, mdf: 90,
      dex: 60, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'war_gong', chance: 14 }, { item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#8a6a4a', c2: '#e8d8b0', c3: '#ff3020', size: 1.2, variant: 2 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        grand_punch: { name: 'Grand Punch', kind: 'mag', power: 24, element: 'earth', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1], ['grand_punch', 1]]
      },
      desc: 'Drops War Gongs.'
    },
    gagighandi: {
      name: 'Gagighandi',
      level: 19, hp: 480, mp: 55,
      exp: 173, ap: 18, gil: 220,
      atk: 40, def: 38, defPct: 1,
      mat: 25, mdf: 72,
      dex: 45, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'soft', chance: 14 }],
      steal: [{ item: 'soft', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'reptile', c1: '#7a8a50', c2: '#c0b080', c3: '#ff4040', size: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        stone_stare: { name: 'Stone Stare', kind: 'status', add: ['slow_numb'], hit: 100, target: 'enemy', mp: 5 }
      },
      ai: {
        moves: [['attack', 3], ['stone_stare', 1]],
        custom: function (e, b) {
          var ok = H.wo(b, 'petrify');
          // opening turn: 3/4 Stone Stare, afterwards 1/4
          var stare = e.turn ? H.one(b, 4) : !H.one(b, 4);
          if (stare && ok.length) return H.go('stone_stare', b.pick(ok));
          return H.go('attack');
        }
      },
      desc: 'Opens with a petrifying stare.'
    },
    touch_me: {
      name: 'Touch Me',
      level: 18, hp: 300, mp: 74,
      exp: 170, ap: 23, gil: 180,
      atk: 30, def: 20, defPct: 1,
      mat: 28, mdf: 100,
      dex: 68, lck: 0,
      elem: {},
      immune: ['frog', 'small'],
      drops: [{ item: 'maidens_kiss', chance: 14 }],
      steal: [{ item: 'impaler', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'frog', c1: '#60b040', c2: '#f0e060', c3: '#ff3030', size: 0.9 },
      attacks: {
        frog_jab: {
          name: 'Frog Jab', kind: 'phys', power: 2, element: 'hit', add: ['frog'], hit: 100, target: 'enemy'
        },
        frog_song: {
          name: 'Frog Song', kind: 'status', add: ['frog', 'sleep'], hit: 100, target: 'enemy', mp: 5,
          eskill: 'frog_song'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['frog_jab', 1]],
        counter: { phys: 'frog_jab', mag: 'frog_song', chance: 20 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.jabs === undefined) { v.jabs = 1 + b.rnd(2); v.song = b.rnd(4); }
          if (v.jabs > 0) { v.jabs--; return H.go('frog_jab'); }
          if (v.song === 0) {
            var nf = H.wo(b, 'frog');
            if (nf.length) { v.song = 1 + b.rnd(3); return H.go('frog_song', b.pick(nf)); }
            return H.go('frog_jab');
          }
          v.song--;
          return H.go('wait', 'self');
        }
      },
      desc: 'Turns you into a frog. Learn Frog Song from it.'
    },

    // ===== Gongaga jungle (Turks) & reactor =====
    reno_2: {
      name: 'Reno',
      level: 22, hp: 2000, mp: 80,
      exp: 660, ap: 60, gil: 1500,
      atk: 35, def: 66, defPct: 1,
      mat: 35, mdf: 164,
      dex: 69, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
        'manipulate', 'berserk'],
      drops: [{ item: 'fairy_tale', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#1c2340', c2: '#c83020', c3: '#f0d0a8', size: 1.8, variant: 1 },
      attacks: {
        attack: { name: 'Short Staff', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        turk_light: { name: 'Turk Light', kind: 'mag', power: 12, target: 'enemy' },
        electroprod: { name: 'Electroprod', kind: 'phys', power: 48, element: 'lightning', target: 'enemy' },
        retreat: { name: 'Retreat', kind: 'special', special: 'flee', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['turk_light', 1]],
        counter: { mag: 'electroprod', chance: 25 },
        custom: function (e, b) {
          // Reno pulls out as soon as Rude is down (no spoils for him then)
          if (e.turn > 0 && H.mates(e, b).length === 0) return H.go('retreat', 'self');
          return H.go(H.one(b, 2) ? 'attack' : 'turk_light');
        }
      },
      desc: 'Turks, Gongaga. Answers Bolt magic with Electroprod.'
    },
    rude_2: {
      name: 'Rude',
      level: 23, hp: 2000, mp: 135,
      exp: 720, ap: 70, gil: 2000,
      atk: 40, def: 100, defPct: 1,
      mat: 35, mdf: 200,
      dex: 65, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence',
        'manipulate', 'berserk'],
      drops: [{ item: 'x_potion', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'back',
      look: { type: 'humanoid', c1: '#1c2340', c2: '#2a2018', c3: '#101010', size: 1.8, variant: 2 },
      attacks: {
        attack: { name: 'Shoulder Attack', kind: 'phys', power: 48, element: 'hit', target: 'enemy', silent: true },
        fire: { name: 'Fire', kind: 'mag', power: 8, element: 'fire', target: 'enemy', mp: 4 },
        cure: { name: 'Cure', kind: 'heal', power: 5, element: 'restorative', target: 'ally', mp: 5 },
        hesitate: { name: '..................', kind: 'special', special: 'nothing', target: 'self' },
        retreat: { name: 'Retreat', kind: 'special', special: 'flee', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['fire', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          var reno = H.mates(e, b)[0];
          if (e.turn > 0 && !reno) return H.go('retreat', 'self');
          if (reno && H.pct(reno) < 50) {
            v.cure = (v.cure || 0) + 1;
            if (e.mp >= 5 && v.cure >= 2) { v.cure = 0; return H.go('cure', reno); }
          }
          // Rude will not attack Tifa while anyone else is standing
          var others = H.party(b).filter(function (t) { return !H.isChar(t, ['tifa']); });
          if (others.length) {
            if (e.mp >= 4 && H.one(b, 3)) return H.go('fire', b.pick(others));
            return H.go('attack', b.pick(others));
          }
          if (H.one(b, 3)) return H.go('hesitate', 'self');
          return H.go('attack');
        }
      },
      desc: 'Turks, Gongaga. Cures Reno and refuses to hit Tifa.'
    },
    kimara_bug: {
      name: 'Kimara Bug',
      level: 19, hp: 700, mp: 25,
      exp: 190, ap: 19, gil: 278,
      atk: 37, def: 40, defPct: 1,
      mat: 5, mdf: 180,
      dex: 61, lck: 0,
      elem: { gravity: 0 },
      immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'spider_web', chance: 52 }],
      morph: 'hourglass',
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#a04070', c2: '#f0a0c0', c3: '#ffff60', size: 1.1 },
      attacks: {
        attack: { name: 'Butterfly Attack', kind: 'phys', power: 16, element: 'cut', target: 'enemy' },
        stop_web: {
          name: 'Stop Web', kind: 'status', element: 'shoot', add: ['stop'], hit: 100, target: 'enemy',
          mp: 5
        },
        spider_attack: { name: 'Spider Attack', kind: 'phys', power: 34, element: 'cut', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1], ['stop_web', 1]],
        custom: function (e, b) {
          if (H.wo(b, 'stop').length) return H.go(H.one(b, 2) ? 'attack' : 'stop_web');
          return H.go(H.one(b, 2) ? 'spider_attack' : 'attack');
        }
      },
      desc: 'Stops its prey, then goes in for the kill.'
    },
    flower_prong: {
      name: 'Flower Prong',
      level: 19, hp: 550, mp: 68,
      exp: 240, ap: 24, gil: 400,
      atk: 40, def: 58, defPct: 1,
      mat: 30, mdf: 200,
      dex: 68, lck: 0,
      elem: { fire: 2, earth: 2, poison: -1 },
      immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate',
        'berserk'],
      drops: [{ item: 'earth_drum', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#4a9a40', c2: '#e05080', c3: '#ffe040', size: 1.1 },
      attacks: {
        bio2: {
          name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 47,
          target: 'enemy', mp: 36
        },
        change: {
          name: 'Change', kind: 'special', special: 'transform', target: 'self', into: 'flower_prong_b',
          silent: true
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['bio2', 1], ['wait', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (e.hpPct <= 70) return H.go('change', 'self');
          v.c = v.c ? 0 : 1;
          if (v.c === 1 && e.mp >= 36) {
            var np = H.wo(b, 'poison');
            return H.go('bio2', np.length ? b.pick(np) : 'random');
          }
          return H.go('wait', 'self');
        }
      },
      desc: 'Bud form. Blossoms (new enemy, full HP) when brought below 70% HP.'
    },
    flower_prong_b: {
      name: 'Flower Prong',
      level: 19, hp: 550, mp: 68,
      exp: 220, ap: 22, gil: 350,
      atk: 42, def: 58, defPct: 1,
      mat: 38, mdf: 250,
      dex: 68, lck: 0,
      elem: { fire: 2, earth: 2, poison: -1 },
      immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate',
        'berserk'],
      drops: [{ item: 'earth_drum', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#3a8a38', c2: '#f06090', c3: '#ffe040', size: 1.4, variant: 1 },
      attacks: {
        seed_bullet: { name: 'Seed Bullet', kind: 'phys', power: 16, element: 'shoot', target: 'enemy' },
        change: {
          name: 'Change', kind: 'special', special: 'transform', target: 'self', into: 'flower_prong_c',
          silent: true
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['seed_bullet', 1], ['wait', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (e.hpPct <= 70) return H.go('change', 'self');
          v.c = v.c ? 0 : 1;
          if (v.c === 1) return H.go('seed_bullet', H.hi(H.party(b), 'hp'));
          return H.go('wait', 'self');
        }
      },
      desc: 'Half-open form of the Flower Prong.'
    },
    flower_prong_c: {
      name: 'Flower Prong',
      level: 19, hp: 550, mp: 68,
      exp: 200, ap: 20, gil: 300,
      atk: 44, def: 58, defPct: 1,
      mat: 46, mdf: 300,
      dex: 68, lck: 0,
      elem: { fire: 2, earth: 2, poison: -1 },
      immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'death_sentence', 'manipulate',
        'berserk'],
      drops: [{ item: 'earth_drum', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#2a7a30', c2: '#ff70a0', c3: '#ffe040', size: 1.8, variant: 2 },
      attacks: {
        w_laser: { name: 'W Laser', kind: 'pct', pct: 94, element: 'shoot', target: 'enemy' },
        pollen: { name: 'Pollen', kind: 'phys', power: 12, add: ['sleep'], hit: 79, target: 'allEnemies' },
        bio2: {
          name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 47,
          target: 'enemy', mp: 36
        }
      },
      ai: {
        moves: [['w_laser', 1]],
        custom: function (e, b) {
          if (!e.turn) return H.go('pollen', 'all');
          if (e.mp >= 36 && H.one(b, 8)) return H.go('bio2');
          return H.go('w_laser', H.hi(H.party(b), 'hp'));
        }
      },
      desc: 'Full bloom. W Laser takes almost all of the target\'s HP.'
    },
    heavy_tank: {
      name: 'Heavy Tank',
      level: 21, hp: 1600, mp: 25,
      exp: 340, ap: 45, gil: 1300,
      atk: 49, def: 34, defPct: 1,
      mat: 37, mdf: 90,
      dex: 68, lck: 0,
      elem: { gravity: 0 },
      immune: ['frog'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'phoenix_down', chance: 52 }],
      morph: 'power_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'tank', c1: '#6a6a70', c2: '#c0a040', c3: '#ff3020', size: 1.4 },
      attacks: {
        attack: { name: 'Charge', kind: 'phys', power: 24, element: 'hit', target: 'enemy', silent: true },
        wheelie_attack: { name: 'Wheelie Attack', kind: 'phys', power: 24, element: 'hit', target: 'enemy' },
        big_spiral: { name: 'Big Spiral', kind: 'phys', power: 24, element: 'hit', target: 'allEnemies' },
        big_spiral_x2: { name: 'Big Spiral', kind: 'phys', power: 24, element: 'hit', target: 'allEnemies', hits: 2 }
      },
      ai: {
        moves: [['attack', 2], ['wheelie_attack', 1], ['big_spiral', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var s = H.spc(e, 8, 4, 3, 2);
          if (v.c <= 1) { v.c++; return H.go('attack'); }
          if (v.c === 2) { v.c = 3; return H.go('wheelie_attack'); }
          v.c = 0;
          return H.go(H.one(b, s) ? 'big_spiral_x2' : 'big_spiral', 'all');
        }
      },
      desc: 'Gongaga reactor ruins. Big Spiral hits the whole party.'
    },

    // ===== Cosmo Area (world map) - also Nibel / Rocket beaches =====
    crown_lance: {
      name: 'Crown Lance',
      level: 20, hp: 440, mp: 70,
      exp: 225, ap: 23, gil: 400,
      atk: 34, def: 30, defPct: 1,
      mat: 31, mdf: 140,
      dex: 60, lck: 0,
      elem: { fire: 2, earth: 0, lightning: -1 },
      immune: ['confusion', 'stop', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'dream_powder',
      boss: false, flying: true, row: 'front',
      look: { type: 'flyer', c1: '#e0e0f0', c2: '#6080e0', c3: '#ffe040', size: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 71, target: 'enemy', mp: 8 },
        bolt: { name: 'Bolt', kind: 'mag', power: 8, element: 'lightning', target: 'enemy', mp: 4 },
        deadly_needles: {
          name: 'Deadly Needles', kind: 'mag', power: 1, element: 'punch', add: ['petrify'], hit: 100,
          target: 'enemy'
        },
        advance: { name: 'Advance', kind: 'special', special: 'nothing', target: 'self', silent: true },
        retreat: { name: 'Retreat', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['sleepel', 3], ['bolt', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = (v.c || 0) + 1;
          if (v.front) {
            if (e.hp < 220 && !v.needles) { v.needles = 1; v.front = false; v.c = 0; return H.go('deadly_needles'); }
            if (v.c > 3) { v.front = false; v.c = 0; return H.go('retreat', 'self'); }
            return H.go('attack');
          }
          if (v.c > 2) { v.front = true; v.c = 0; return H.go('advance', 'self'); }
          var t = b.pick(H.party(b));
          if (t && !b.has(t, 'sleep') && b.rnd(4) < 3) return H.go('sleepel', t);
          return H.go('bolt', t);
        }
      },
      desc: 'Casts from afar, then advances to claw. Petrifies attackers when low on HP.'
    },
    skeeskee: {
      name: 'Skeeskee',
      level: 20, hp: 540, mp: 0,
      exp: 222, ap: 22, gil: 222,
      atk: 45, def: 40, defPct: 1,
      mat: 33, mdf: 120,
      dex: 55, lck: 0,
      elem: {},
      immune: ['frog'],
      drops: [{ item: 'hyper', chance: 14 }],
      steal: [{ item: 'tranquilizer', chance: 52 }],
      morph: 'hyper',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#c08040', c2: '#f0e0c0', c3: '#ff2020', size: 1.1, variant: 1 },
      attacks: {
        attack: { name: 'Beak', kind: 'phys', power: 16, element: 'punch', acc: 103, target: 'enemy', silent: true },
        rage_bomber: {
          name: 'Rage Bomber', kind: 'phys', power: 40, element: 'shout', add: ['fury'], acc: 75, statusChance: 72,
          target: 'enemy'
        }
      },
      ai: {
        moves: [['attack', 1]],
        // Enemy Mechanics FAQ: Beak, or 1/2 Rage Bomber while poisoned; at 50% HP or less every hit taken is
        // answered with Rage Bomber on the attacker (Counter - General)
        custom: function (e, b) {
          if (b.has(e, 'poison')) return H.go(H.one(b, 2) ? 'attack' : 'rage_bomber');
          return H.go('attack');
        },
        counter: { custom: function (e, b, src) { return e.hpPct <= 50 ? { move: 'rage_bomber', target: src } : null; } }
      },
      desc: 'Flies into a Rage Bomber when hurt.'
    },
    bagrisk: {
      name: 'Bagrisk',
      level: 19, hp: 400, mp: 50,
      exp: 240, ap: 30, gil: 275,
      atk: 50, def: 44, defPct: 1,
      mat: 39, mdf: 100,
      dex: 45, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'soft', chance: 14 }],
      steal: [{ item: 'soft', chance: 77 }, { item: 'vagyrisk_claw', chance: 14 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'reptile', c1: '#6a7a3a', c2: '#c0a060', c3: '#ff2020', size: 1.1, variant: 1 },
      attacks: {
        attack: { name: 'Tail', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        tail_combo: {
          name: 'Tail', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        stone_strike: { name: 'Stone Strike', kind: 'status', add: ['petrify'], hit: 100, target: 'enemy', mp: 10 },
        quake2: { name: 'Quake2', kind: 'mag', power: 24, element: 'earth', target: 'enemy', mp: 28 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = H.one(b, 3) ? 1 : 0; v.stone = 1; }
          var s = H.spc(e, 16, 9, 6, 3);
          var ok = H.wo(b, 'petrify');
          var c = v.c;
          v.c = (c + 1) % 3;
          if (!ok.length) return H.go('wait', 'self');
          var t = b.pick(ok);
          if (c === 0) return H.go(H.one(b, s) ? 'tail_combo' : 'attack', t);
          if (c === 1) return H.go(e.mp >= 28 && H.one(b, s) ? 'quake2' : 'attack', t);
          if (v.stone && H.one(b, s)) { v.stone = 0; return H.go('stone_strike', t); }
          return H.go('attack', t);
        }
      },
      desc: 'Stone Strike petrifies instantly (once per battle). Steal a Vagyrisk Claw.'
    },
    desert_sahagin: {
      name: 'Desert Sahagin',
      level: 20, hp: 580, mp: 0,
      exp: 230, ap: 21, gil: 300,
      atk: 46, def: 32, defPct: 1,
      mat: 38, mdf: 120,
      dex: 56, lck: 0,
      elem: { ice: 2, fire: 0.5, water: -1 },
      immune: [],
      drops: [{ item: 'potion', chance: 14 }],
      steal: [{ item: 'potion', chance: 52 }],
      morph: 'fire_veil',
      boss: false, flying: false, row: 'front',
      look: { type: 'fish', c1: '#c0a070', c2: '#70a0c0', c3: '#ffe040', size: 1 },
      attacks: {
        attack: { name: 'Harpoon', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        sandgun: { name: 'Sandgun', kind: 'status', element: 'earth', add: ['darkness'], hit: 47, target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1], ['sandgun', 1]]
      },
      desc: 'Absorbs water, weak against ice. Sometimes hides in its shell.'
    },
    griffin: {
      name: 'Griffin',
      level: 21, hp: 760, mp: 40,
      exp: 260, ap: 25, gil: 350,
      atk: 45, def: 42, defPct: 1,
      mat: 35, mdf: 160,
      dex: 58, lck: 0,
      elem: {},
      immune: ['sleep', 'confusion', 'stop', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'phoenix_down', chance: 100 }],
      steal: [{ item: 'phoenix_down', chance: 52 }],
      morph: 'phoenix_down',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#d0a040', c2: '#f0f0e0', c3: '#ff3020', size: 1.4, variant: 3 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        peacock: { name: 'Peacock', kind: 'special', special: 'mpDrain', power: 4, target: 'allEnemies', mp: 8 },
        take_off: { name: 'Take off', kind: 'special', special: 'nothing', target: 'self', silent: true },
        land: { name: 'Land', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['peacock', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          var r = b.rnd(4);
          if (!v.air) {
            if (r === 0) { v.air = true; return H.go('take_off', 'self'); }
            if (r === 1) return H.go('peacock', 'all');
            return H.go('attack');
          }
          if (r === 0) { v.air = false; return H.go('land', 'self'); }
          if (r === 1) return H.go('attack');
          return H.go('peacock', 'all');
        }
      },
      desc: 'Takes to the air; Peacock drains the party\'s MP.'
    },
    golem: {
      name: 'Golem',
      level: 24, hp: 1000, mp: 0,
      exp: 300, ap: 22, gil: 500,
      atk: 60, def: 56, defPct: 1,
      mat: 5, mdf: 100,
      dex: 80, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'turbo_ether', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'back',
      look: { type: 'giant', c1: '#8a8070', c2: '#5a5048', c3: '#40c0ff', size: 1.8 },
      attacks: {
        attack: { name: 'Golem Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        finger_shot: { name: 'Finger Shot', kind: 'phys', power: 20, element: 'shoot', target: 'enemy' },
        megaton_punch: { name: 'Megaton Punch', kind: 'phys', power: 30, element: 'hit', target: 'enemy' },
        advance: { name: 'Advance', kind: 'special', special: 'nothing', target: 'self', silent: true },
        retreat: { name: 'Retreat', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['finger_shot', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.row === undefined) { v.row = 3; v.dmg = 0; v.last = e.hp; v.opened = 0; }
          v.dmg += Math.max(0, v.last - e.hp);
          v.last = e.hp;
          if (v.dmg > 200 && v.row < 3) {   // FF7: steps back after taking 200+ damage
            v.row++;
            v.dmg = 0;
            if (v.row === 3) v.opened = 0;
            return H.go('retreat', 'self');
          }
          if (v.dmg > 200) v.dmg = 0;
          if (!v.opened) { v.opened = 1; return H.go(H.one(b, 3) ? 'finger_shot' : 'attack'); }
          if (v.row === 1) return H.go('megaton_punch');
          v.row--;
          return H.go('advance', 'self');
        }
      },
      desc: 'Lumbers forward step by step; Megaton Punch once it arrives.'
    },

    // ===== Cave of the Gi =====
    sneaky_step: {
      name: 'Sneaky Step',
      level: 21, hp: 600, mp: 65,
      exp: 270, ap: 24, gil: 330,
      atk: 52, def: 30, defPct: 1,
      mat: 25, mdf: 130,
      dex: 62, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'm_tentacles', chance: 14 }],
      steal: [],
      morph: 'ghost_hand',
      boss: false, flying: false, row: 'front',
      look: { type: 'skeleton', c1: '#b0a8c0', c2: '#503a70', c3: '#ff40ff', size: 1 },
      attacks: {
        attack: { name: 'Triple Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        death_sentence: {
          name: 'Death Sentence', kind: 'status', add: ['death_sentence'], hit: 100, target: 'enemy',
          mp: 10, eskill: 'death_sentence'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 3], ['death_sentence', 1]],
        custom: function (e, b) {
          var ok = H.wo(b, 'death_sentence');
          if (!ok.length) return H.go('wait', 'self');
          return H.go(H.one(b, 4) ? 'death_sentence' : 'attack', b.pick(ok));
        }
      },
      desc: 'Source of Death Sentence.'
    },
    heg: {
      name: 'Heg',
      level: 22, hp: 400, mp: 0,
      exp: 250, ap: 20, gil: 240,
      atk: 46, def: 30, defPct: 1,
      mat: 5, mdf: 64,
      dex: 40, lck: 0,
      elem: { ice: 2, poison: -1 },
      immune: ['poison'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'serpent', c1: '#607040', c2: '#c0c060', c3: '#ff2020', size: 0.9 },
      attacks: {
        attack: {
          name: 'Poison Fang', kind: 'phys', power: 16, element: 'hit', add: ['poison'], hit: 100,
          target: 'enemy', silent: true
        },
        halt_whip: {
          name: 'Halt Whip', kind: 'phys', power: 14, element: 'punch', add: ['paralysis'], hit: 27,
          target: 'enemy'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['halt_whip', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          if (v.c < 2) {
            v.c++;
            var np = H.wo(b, 'poison');
            if (!np.length) return H.go('wait', 'self');
            var pp = H.wi(b, 'paralysis', np);
            return H.go('attack', b.pick(pp.length ? pp : np));
          }
          v.c = 0;
          var npa = H.wo(b, 'paralysis');
          if (!npa.length) return H.go('wait', 'self');
          var po = H.wi(b, 'poison', npa);
          return H.go('halt_whip', b.pick(po.length ? po : npa));
        }
      },
      desc: 'Absorbs poison. Poisons and paralyses.'
    },
    gi_spector: {
      name: 'Gi Spector',
      level: 23, hp: 450, mp: 88,
      exp: 260, ap: 20, gil: 150,
      atk: 45, def: 30, defPct: 1,
      mat: 35, mdf: 120,
      dex: 59, lck: 0,
      elem: { fire: 2, holy: 2, restorative: -1 },
      immune: ['frog'],
      drops: [{ item: 'smoke_bomb', chance: 14 }],
      steal: [],
      morph: 'ghost_hand',
      boss: false, flying: false, row: 'front',
      look: { type: 'ghost', c1: '#80a0c0', c2: '#304060', c3: '#ffff80', size: 1.1 },
      attacks: {
        attack: { name: 'Skewer', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        hell_spear: {
          name: 'Hell Spear', kind: 'phys', power: 20, element: 'punch', add: ['paralysis'], hit: 27,
          target: 'enemy'
        },
        death_sentence: {
          name: 'Death Sentence', kind: 'status', add: ['death_sentence'], hit: 100, target: 'enemy',
          mp: 10, eskill: 'death_sentence'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        counter: { phys: 'death_sentence', mag: 'death_sentence', chance: 25 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = v.c || 0;
          var t = H.lo(H.wo(b, 'death_sentence'), 'hp');
          if (v.c < 3) { v.c++; return t ? H.go('attack', t) : H.go('wait', 'self'); }
          v.c = 0;
          if (!t) return H.go('wait', 'self');
          if (H.pct(t) <= 50 && H.one(b, 2)) return H.go('hell_spear', t);
          return H.go('attack', t);
        }
      },
      desc: 'Undead: healing items and spells damage it, Phoenix Down may kill it.'
    },
    stinger: {
      name: 'Stinger',
      level: 25, hp: 2200, mp: 60,
      exp: 290, ap: 25, gil: 358,
      atk: 60, def: 56, defPct: 1,
      mat: 40, mdf: 100,
      dex: 68, lck: 0,
      elem: {},
      immune: ['manipulate', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'ether', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#3a3a4a', c2: '#c04030', c3: '#ffe040', size: 1.6, variant: 2 },
      attacks: {
        attack: { name: 'Sting', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        sting_combo: {
          name: 'Sting', kind: 'phys', power: 16, element: 'punch', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        sting_bomb: { name: 'Sting Bomb', kind: 'pct', pct: 75, element: 'punch', target: 'enemy', mp: 20 },
        rabbit_gouge: { name: 'Rabbit Gouge', kind: 'phys', power: 32, element: 'punch', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var s = H.spc(e, 4, 3, 2, 1);
          if (e.hpPct <= 50 && !v.b50) { v.b50 = 1; return H.go('sting_bomb'); }
          if (e.hpPct <= 25 && !v.b25) { v.b25 = 1; return H.go('sting_bomb'); }
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'sting_combo' : 'attack'); }
          if (v.c === 2) {
            v.c = H.one(b, s) ? 3 : 0;
            return H.go(e.mp >= 20 && H.one(b, s) ? 'sting_bomb' : 'attack');
          }
          v.c = 0;
          return H.go(H.one(b, s) ? 'rabbit_gouge' : 'attack');
        }
      },
      desc: 'Guards a treasure in the Cave of the Gi.'
    },
    gi_nattak: {
      name: 'Gi Nattak',
      level: 29, hp: 5500, mp: 200,
      exp: 1400, ap: 150, gil: 3000,
      atk: 70, def: 70, defPct: 1,
      mat: 25, mdf: 140,
      dex: 75, lck: 0,
      elem: { holy: 2, earth: 0, gravity: 0, water: 0, restorative: -1 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb',
        'petrify', 'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'wizer_staff', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'back',
      look: { type: 'ghost', c1: '#5a6a90', c2: '#c0a040', c3: '#ff4020', size: 2.4, variant: 2 },
      attacks: {
        attack: { name: 'Spear Attack', kind: 'phys', power: 35, element: 'punch', target: 'enemy', silent: true },
        drain: { name: 'Drain', kind: 'drain', power: 6, target: 'enemy', mp: 1 },
        aspil: { name: 'Aspil', kind: 'special', special: 'mpDrain', power: 2, target: 'enemy', mp: 1 },
        debarrier: {
          name: 'DeBarrier', kind: 'status', remove: ['barrier', 'mbarrier', 'reflect', 'shield'],
          target: 'enemy', mp: 12
        },
        take_over: { name: 'Take Over', kind: 'special', special: 'nothing', target: 'enemy' }
      },
      ai: {
        moves: [['drain', 3], ['aspil', 1], ['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = (v.c || 0) + 1;
          var t = b.pick(H.party(b));
          if (v.c % 2 === 1) {
            // Take Over: order a resting Soul Fire into a party member
            var fire = H.mates(e, b).filter(function (x) { return x.vars && !x.vars.possess; })[0];
            if (fire && t) {
              fire.vars.possess = t;
              fire.vars.turns = 0;
              return H.go('take_over', t);
            }
            return H.go('attack', t);
          }
          if (t && (b.has(t, 'barrier') || b.has(t, 'mbarrier')) && H.one(b, 3)) return H.go('debarrier', t);
          var r = b.rnd(5);
          if (r < 3) return H.go('drain', t);
          if (r === 3) return H.go('aspil', t);
          return H.go('attack', t);
        }
      },
      desc: 'Ghost of the Gi. Undead: X-Potions, Cure spells and Life hurt (Life/Phoenix Down kill) it.'
    },
    soul_fire: {
      name: 'Soul Fire',
      level: 21, hp: 1300, mp: 220,
      exp: 200, ap: 10, gil: 100,
      atk: 16, def: 130, defPct: 1,
      mat: 16, mdf: 10,
      dex: 60, lck: 0,
      elem: { wind: 2, holy: 2, earth: 0, poison: 0, gravity: 0, water: 0, fire: -1 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'phoenix_down', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'ghost', c1: '#ff8020', c2: '#ffe060', c3: '#ffffff', size: 0.9, variant: 1 },
      attacks: {
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', target: 'enemy', mp: 22 },
        take_over: { name: 'Take Over', kind: 'special', special: 'nothing', target: 'enemy', silent: true },
        reappear: { name: 'Return', kind: 'special', special: 'nothing', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['fire2', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.possess) {
            var t = v.possess;
            if (!t || t.hp <= 0 || b.has(t, 'death') || v.turns > 3) {
              v.possess = null;
              v.turns = 0;
              v.idle = 0;
              return H.go('reappear', 'self');
            }
            v.turns++;
            return H.go('fire2', t);
          }
          // resting: keeps topping itself up with Fire2 (it absorbs fire)
          v.idle = (v.idle || 0) + 1;
          if (v.idle > 3 && H.one(b, 3)) {   // fallback when Gi Nattak cannot direct it
            var p = b.pick(H.party(b));
            if (p) { v.possess = p; v.turns = 0; return H.go('take_over', p); }
          }
          if (e.mp >= 22) return H.go('fire2', 'self');
          return H.go('wait', 'self');
        }
      },
      desc: 'Possesses a party member for Gi Nattak and burns them with Fire2.'
    },

    // ===== Nibel Area (world map) - also Rocket Launch Pad Area =====
    nibel_wolf: {
      name: 'Nibel Wolf',
      level: 23, hp: 700, mp: 0,
      exp: 265, ap: 24, gil: 260,
      atk: 50, def: 36, defPct: 1,
      mat: 5, mdf: 160,
      dex: 57, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'luchile_nut', chance: 14 }],
      steal: [{ item: 'luchile_nut', chance: 14 }],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#7a7a8a', c2: '#d0d0e0', c3: '#ffd020', size: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        fang: { name: 'Fang', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        howling: { name: 'Howling', kind: 'special', special: 'callHelp', target: 'self', summon: 'nibel_wolf' },
        howl_fail: { name: 'Howling', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 3], ['fang', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = 0; v.howl = 3; v.max = 0; }
          var n = (b.enemies() || []).length;
          if (n > v.max) v.max = n;
          if (v.c < 3) { v.c++; return H.go('attack'); }
          if (v.c === 3) { v.c = 4; return H.go('fang'); }
          v.c = 0;
          if (n < v.max && v.howl > 0) {   // a pack member has fallen: howl it back
            if (H.one(b, 3)) { v.howl--; v.max = n + 1; return H.go('howling', 'self'); }
            return H.go('howl_fail', 'self');
          }
          return H.go('fang');
        }
      },
      desc: 'Howls fallen pack members back to life (up to 3 times).'
    },
    valron: {
      name: 'Valron',
      level: 24, hp: 950, mp: 80,
      exp: 300, ap: 30, gil: 300,
      atk: 50, def: 50, defPct: 1,
      mat: 45, mdf: 180,
      dex: 49, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'berserk'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#3a6a9a', c2: '#e0c040', c3: '#ff3030', size: 1.2, variant: 3 },
      attacks: {
        attack: { name: 'Speed Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        jump_kick: { name: 'Jump Kick', kind: 'phys', power: 20, element: 'hit', target: 'enemy' },
        dive_kick: {
          name: 'Dive Kick', kind: 'pct', pct: 25, ofMax: true, element: 'hit', target: 'enemy',
          silent: true
        },
        despell: {
          name: 'DeSpell', kind: 'status',
          remove: ['haste', 'slow', 'stop', 'regen', 'barrier', 'mbarrier', 'reflect', 'shield', 'resist'],
          target: 'enemy', mp: 20
        },
        mbarrier: { name: 'MBarrier', kind: 'status', add: ['mbarrier'], hit: 100, target: 'ally', mp: 24 },
        demi3: { name: 'Demi3', kind: 'pct', pct: 75, element: 'gravity', target: 'enemy', mp: 48 },
        land: { name: 'Land', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['jump_kick', 2]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.air === undefined) v.air = H.one(b, 2);
          var fly = null;
          if (!v.air) {
            var r = b.rnd(4);
            if (r === 0) { v.air = true; fly = H.one(b, 2) ? 'demi3' : 'dive'; }
            else if (r === 1) return H.go('attack');
            else return H.go('jump_kick');
          } else {
            var x = b.rnd(64);
            if (!b.has(e, 'mbarrier')) {
              if (x < 11) { v.air = false; return H.go('land', 'self'); }
              fly = x < 14 ? 'demi3' : x < 17 ? 'mb_ally' : x < 20 ? 'dive' : x < 32 ? 'despell' : 'mb_self';
            } else {
              if (x < 8) { v.air = false; return H.go('land', 'self'); }
              fly = x < 16 ? 'demi3' : x < 24 ? 'mb_ally' : x < 32 ? 'dive' : 'despell';
            }
          }
          if (fly === 'mb_self') return e.mp >= 24 ? H.go('mbarrier', 'self') : H.go('dive_kick');
          if (fly === 'mb_ally') {
            var al = (b.enemies() || []).filter(function (a) { return !b.has(a, 'mbarrier'); });
            return e.mp >= 24 && al.length ? H.go('mbarrier', b.pick(al)) : H.go('dive_kick');
          }
          if (fly === 'demi3') return e.mp >= 48 ? H.go('demi3', H.hi(H.party(b), 'hp')) : H.go('dive_kick');
          if (fly === 'despell' && e.mp >= 20) {
            if (b.has(e, 'slow')) return H.go('despell', 'self');
            var buffs = ['barrier', 'haste', 'mbarrier', 'reflect', 'regen'];
            for (var i = 0; i < buffs.length; i++) {
              var w = H.wi(b, buffs[i]);
              if (w.length) return H.go('despell', b.pick(w));
            }
          }
          return H.go('dive_kick');
        }
      },
      desc: 'Fights on the ground or from the air (Dive Kick, Demi3, DeSpell).'
    },

    // ===== Shinra Mansion (Nibelheim) & basement =====
    mirage: {
      name: 'Mirage',
      level: 24, hp: 570, mp: 0,
      exp: 290, ap: 22, gil: 280,
      atk: 50, def: 36, defPct: 1,
      mat: 45, mdf: 100,
      dex: 50, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'manipulate', 'berserk'],
      drops: [{ item: 'mirror', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'ghost', c1: '#c0d8f0', c2: '#8090b0', c3: '#ffffff', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Swing Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        swing_combo: {
          name: 'Swing Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2,
          random: true, silent: true
        },
        mirror: { name: 'Reflect', kind: 'status', add: ['reflect'], hit: 100, target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['swing_combo', 1]],
        custom: function (e, b) {
          // FF7: permanently reflected from the start of battle
          if (!e.turn && !b.has(e, 'reflect')) return H.go('mirror', 'self');
          var ok = H.wo(b, 'death_sentence');
          var t = b.pick(ok.length ? ok : H.party(b));
          return H.go(H.one(b, 2) ? 'swing_combo' : 'attack', t);
        }
      },
      desc: 'Permanently reflects magic back at the caster.'
    },
    dorky_face: {
      name: 'Dorky Face',
      level: 23, hp: 520, mp: 80,
      exp: 300, ap: 35, gil: 202,
      atk: 50, def: 36, defPct: 30,
      mat: 40, mdf: 120,
      dex: 35, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'phoenix_down', chance: 14 }],
      steal: [{ item: 'echo_screen', chance: 52 }],
      morph: 'mute_mask',
      boss: false, flying: false, row: 'front',
      look: { type: 'ghost', c1: '#f0d0a0', c2: '#a04030', c3: '#303030', size: 1, variant: 2 },
      attacks: {
        attack: { name: 'Cutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        curses: { name: 'Curses', kind: 'status', add: ['silence'], hit: 100, target: 'enemy', mp: 10 },
        funny_breath: {
          name: 'Funny Breath', kind: 'status', add: ['confusion'], hit: 23, target: 'allEnemies', mp: 10
        },
        ascend: { name: 'Ascend', kind: 'special', special: 'flee', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['wait', 2]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = 0; v.fb = b.rnd(2); }
          var p = H.party(b);
          if (p.length >= 3 && p.every(function (t) { return b.has(t, 'silence') && b.has(t, 'paralysis'); })) {
            return H.go('ascend', 'self');
          }
          if (v.c === 0) {
            v.c = 1;
            if (!v.fb) {
              v.fb = 1;
              var ns = H.wo(b, 'silence');
              return ns.length ? H.go('curses', b.pick(ns)) : H.go('attack');
            }
            v.fb = 0;
            return H.wo(b, 'paralysis').length ? H.go('funny_breath', 'all') : H.go('attack');
          }
          if (v.c < 3) { v.c++; return H.go('wait', 'self'); }
          v.c = 0;
          return H.go('attack');
        }
      },
      desc: 'Silences and confuses. Floats up into the ceiling if everyone is silenced and paralysed.'
    },
    jersey: {
      name: 'Jersey',
      level: 25, hp: 500, mp: 100,
      exp: 320, ap: 30, gil: 384,
      atk: 55, def: 40, defPct: 5,
      mat: 15, mdf: 144,
      dex: 60, lck: 10,
      elem: {},
      immune: ['confusion', 'stop', 'frog', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'turbo_ether', chance: 14 }],
      steal: [{ item: 'turbo_ether', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#d0c0a0', c2: '#8a6a30', c3: '#ffe040', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Spin Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        spin_combo: {
          name: 'Spin Attack', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2,
          random: true
        },
        question: { name: '????', kind: 'special', special: 'question', target: 'enemy', mp: 3, eskill: 'question' },
        fire2: { name: 'Fire2', kind: 'mag', power: 20, element: 'fire', target: 'enemy', mp: 22 }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          // FF7: the first physical hit tips its scales for good (physical-proof, casts Fire2)
          if (e.hpPct < 100) v.left = true;
          var s = H.spc(e, 6, 5, 4, 3);
          if (!v.left) {
            if (e.mp >= 3 && H.one(b, s)) return H.go('question');
          } else if (e.mp >= 22 && H.one(b, s)) {
            return H.go('fire2');
          }
          return H.go(H.one(b, s) ? 'spin_combo' : 'attack');
        }
      },
      desc: 'Source of ???? (damage = HP it has lost).'
    },
    ghirofelgo: {
      name: 'Ghirofelgo',
      level: 26, hp: 1600, mp: 0,
      exp: 380, ap: 44, gil: 300,
      atk: 50, def: 100, defPct: 33,
      mat: 35, mdf: 400,
      dex: 120, lck: 0,
      elem: { gravity: 2, earth: 0 },
      immune: ['death', 'poison', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small', 'slow_numb',
        'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'phoenix_down', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'machine', c1: '#6a6a78', c2: '#b0b0c0', c3: '#ff2020', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Guillotine', kind: 'phys', power: 40, element: 'cut', target: 'enemy', silent: true },
        catch_chain: { name: 'Catch Chain', kind: 'special', special: 'nothing', target: 'self', silent: true },
        fail_catch: { name: 'Fail to catch', kind: 'special', special: 'nothing', target: 'self', silent: true },
        fall: { name: 'Fall', kind: 'special', special: 'nothing', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['wait', 3]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.swing === undefined) { v.swing = 3; v.fall = 2; v.down = false; }
          if (!v.down) {
            if (e.hpPct < 100 && H.one(b, 8)) { v.down = true; v.fall = 2; return H.go('fall', 'self'); }
            if (H.one(b, 8) || v.swing === 0) { v.swing = 3; return H.go('attack'); }
            v.swing--;
            return H.go('wait', 'self');
          }
          if (H.one(b, 3) || v.fall === 0) { v.down = false; return H.go('catch_chain', 'self'); }
          v.fall--;
          return H.go('fail_catch', 'self');
        }
      },
      desc: 'Swinging blade. Weak against gravity; very hard to hit while swinging.'
    },
    lost_number: {
      name: 'Lost Number',
      level: 35, hp: 7000, mp: 300,
      exp: 2000, ap: 80, gil: 2000,
      atk: 80, def: 120, defPct: 1,
      mat: 35, mdf: 280,
      dex: 82, lck: 1,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'cosmo_memory', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'giant', c1: '#c03030', c2: '#3050c0', c3: '#ffe040', size: 2.4, variant: 1 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        punch_combo: {
          name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        split_psychic: {
          name: 'Split', kind: 'special', special: 'transform', target: 'self', into: 'lost_number_b',
          silent: true
        },
        split_physical: {
          name: 'Split', kind: 'special', special: 'transform', target: 'self', into: 'lost_number_c',
          silent: true
        }
      },
      ai: {
        moves: [['attack', 2], ['bolt2', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(3);
          var p = e.hpPct;
          if (p <= 50) {
            // splits in two: last hit magical -> psychic half, physical -> physical half
            var into = v.lastHit === 'mag' ? 'split_psychic' : v.lastHit === 'phys' ? 'split_physical' :
              (H.one(b, 2) ? 'split_psychic' : 'split_physical');
            return H.go(into, 'self');
          }
          var s = p > 83 ? 6 : p > 66 ? 5 : 4;
          if (v.c === 0 || v.c === 1) {
            v.c = H.one(b, 3) ? 2 : (v.c === 0 ? 1 : 0);
            return H.go(H.one(b, s) ? 'punch_combo' : 'attack');
          }
          v.c = b.rnd(2);
          var nr = H.wo(b, 'reflect');
          if (e.mp >= 22 && nr.length) return H.go('bolt2', b.pick(nr));
          return H.go('attack');
        }
      },
      desc: 'Guards the Shinra Mansion safe (Cosmo Memory). Splits into a psychic or physical form at half HP.'
    },
    lost_number_b: {
      name: 'Lost Number',
      level: 35, hp: 7000, mp: 300,
      exp: 2000, ap: 80, gil: 2000,
      atk: 80, def: 40, defPct: 1,
      mat: 55, mdf: 440,
      dex: 82, lck: 1,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'cosmo_memory', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'giant', c1: '#c03030', c2: '#801818', c3: '#ffe040', size: 2.4, variant: 2 },
      attacks: {
        attack: { name: 'Tentacle', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        aspil: { name: 'Aspil', kind: 'special', special: 'mpDrain', power: 2, target: 'enemy', mp: 1 },
        bolt: { name: 'Bolt', kind: 'mag', power: 8, element: 'lightning', target: 'enemy', mp: 4 },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        quake: { name: 'Quake', kind: 'mag', power: 11, element: 'earth', target: 'enemy', mp: 6 },
        quake2: { name: 'Quake2', kind: 'mag', power: 24, element: 'earth', target: 'enemy', mp: 28 },
        bio: {
          name: 'Bio', kind: 'mag', power: 10, element: 'poison', add: ['poison'], hit: 47,
          target: 'enemy', mp: 8
        },
        bio2: {
          name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 47,
          target: 'enemy', mp: 36
        }
      },
      ai: {
        moves: [['attack', 1], ['bio2', 2], ['bolt2', 2], ['quake2', 2]],
        custom: function (e, b) {
          var nr = H.wo(b, 'reflect');
          var r = b.rnd(7);
          if (r === 0 || !nr.length) return H.go('attack');
          var aspil = function () { return H.go('aspil', H.hi(nr, 'mp')); };
          if (r <= 2) {
            if (e.mp < 36) return aspil();
            var np = H.wo(b, 'poison', nr);
            return H.go('bio2', b.pick(np.length ? np : nr));
          }
          if (r <= 4) return e.mp >= 22 ? H.go('bolt2', b.pick(nr)) : aspil();
          return e.mp >= 28 ? H.go('quake2', b.pick(nr)) : aspil();
        }
      },
      desc: 'Psychic (red) half of Lost Number - magic specialist, low Def.'
    },
    lost_number_c: {
      name: 'Lost Number',
      level: 35, hp: 7000, mp: 300,
      exp: 2000, ap: 80, gil: 2000,
      atk: 140, def: 400, defPct: 1,
      mat: 5, mdf: 200,
      dex: 82, lck: 1,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'cosmo_memory', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'giant', c1: '#3050c0', c2: '#182880', c3: '#ffe040', size: 2.4, variant: 3 },
      attacks: {
        attack: { name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        punch_combo: {
          name: 'Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        lost_blow: { name: 'Lost Blow', kind: 'phys', power: 50, element: 'hit', target: 'enemy' }
      },
      ai: {
        moves: [['lost_blow', 2], ['attack', 3], ['punch_combo', 3]]
      },
      desc: 'Physical (blue) half of Lost Number - Def 400, use magic.'
    },
    black_bat: {
      name: 'Black Bat',
      level: 25, hp: 550, mp: 0,
      exp: 270, ap: 24, gil: 80,
      atk: 30, def: 36, defPct: 13,
      mat: 44, mdf: 180,
      dex: 52, lck: 0,
      elem: { wind: 2, holy: 2, earth: 0, restorative: -1 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'vampire_fang', chance: 14 }],
      steal: [],
      morph: 'vampire_fang',
      boss: false, flying: true, row: 'front',
      look: { type: 'bat', c1: '#302838', c2: '#8a2030', c3: '#ff3030', size: 0.8 },
      attacks: {
        blood_suck: { name: 'Blood Suck', kind: 'drain', power: 16, element: 'hit', target: 'enemy' }
      },
      ai: {
        moves: [['blood_suck', 1]]
      },
      desc: 'Undead bat - healing hurts it. Dodges 1 hit in 8 (modelled as Df% 13).'
    },
    ying: {
      name: 'Ying',
      level: 24, hp: 1200, mp: 0,
      exp: 400, ap: 30, gil: 400,
      atk: 75, def: 420, defPct: 1,
      mat: 5, mdf: 50,
      dex: 75, lck: 0,
      elem: { gravity: 0.5 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small',
        'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#f0f0f0', c2: '#303030', c3: '#ff2020', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Ying Punch', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        sadistic_attack: { name: 'Sadistic Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 3], ['sadistic_attack', 1]],
        custom: function (e, b) {
          if (H.one(b, 4)) return H.go('sadistic_attack', 'lowest');
          return H.go('attack');
        }
      },
      desc: 'The physical half (Def 420, MDf 50) - use magic.'
    },
    yang: {
      name: 'Yang',
      level: 24, hp: 1200, mp: 220,
      exp: 300, ap: 40, gil: 400,
      atk: 5, def: 50, defPct: 1,
      mat: 32, mdf: 420,
      dex: 75, lck: 0,
      elem: { gravity: 0.5 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'haste', 'slow', 'stop', 'frog', 'small',
        'slow_numb', 'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#303030', c2: '#f0f0f0', c3: '#40a0ff', size: 1.2, variant: 2 },
      attacks: {
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
        suicide_yang: { name: 'Suicide Yang', kind: 'special', special: 'selfDestruct', target: 'enemy' }
      },
      ai: {
        moves: [['bolt2', 1], ['ice2', 1]],
        custom: function (e, b) {
          if (e.hpPct <= 12 || e.mp < 22) return H.go('suicide_yang');
          return H.go(H.one(b, 2) ? 'bolt2' : 'ice2');
        }
      },
      desc: 'The magical half (MDf 420, Def 50) - use physical attacks. Kamikazes when low.'
    },

    // ===== Mt. Nibel (also the Kalm flashback 5 years ago) =====
    dragon: {
      name: 'Dragon',
      level: 32, hp: 3500, mp: 250,
      exp: 900, ap: 110, gil: 1400,
      atk: 90, def: 120, defPct: 20,
      mat: 65, mdf: 300,
      dex: 90, lck: 40,
      elem: { gravity: 0, fire: -1 },
      immune: ['death', 'confusion', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'peerless',
        'paralysis'],
      drops: [{ item: 'fire_fang', chance: 100 }],
      steal: [{ item: 'gold_armlet', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#8a3020', c2: '#d0a040', c3: '#ffe040', size: 2.2 },
      attacks: {
        attack: { name: 'Dragon Fang', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        flame_thrower: {
          name: 'Flame Thrower', kind: 'mag', power: 14, element: 'fire', target: 'enemy', mp: 10,
          eskill: 'flame_thrower'
        }
      },
      ai: {
        moves: [['attack', 1], ['flame_thrower', 3]]
      },
      desc: 'Absorbs fire. In the Kalm flashback it attacks the Shinra truck and Sephiroth fells it.'
    },
    sonic_speed: {
      name: 'Sonic Speed',
      level: 26, hp: 750, mp: 50,
      exp: 370, ap: 28, gil: 330,
      atk: 52, def: 52, defPct: 1,
      mat: 44, mdf: 96,
      dex: 60, lck: 0,
      elem: { wind: 2, earth: 0 },
      immune: ['stop', 'frog', 'manipulate', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'ether', chance: 14 }],
      morph: 'speed_drink',
      boss: false, flying: true, row: 'front',
      look: { type: 'flyer', c1: '#40a0e0', c2: '#f0f0f0', c3: '#ffe020', size: 0.9, variant: 1 },
      attacks: {
        attack: { name: 'Sonic Attack', kind: 'phys', power: 16, element: 'wind', target: 'enemy', silent: true },
        sonic_combo: {
          name: 'Sonic Attack', kind: 'phys', power: 16, element: 'wind', target: 'enemy', hits: 2,
          random: true, silent: true
        },
        harrier: { name: 'Harrier', kind: 'phys', power: 32, element: 'hit', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 4], ['sonic_combo', 2], ['harrier', 6]]
      },
      desc: 'Fast. Harrier targets whoever hit it last.'
    },
    twin_brain: {
      name: 'Twin Brain',
      level: 25, hp: 400, mp: 20,
      exp: 340, ap: 32, gil: 320,
      atk: 45, def: 44, defPct: 1,
      mat: 25, mdf: 96,
      dex: 48, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'ether', chance: 14 }],
      steal: [{ item: 'ether', chance: 52 }],
      morph: 'turbo_ether',
      boss: false, flying: false, row: 'front',
      look: { type: 'tentacle', c1: '#e090b0', c2: '#8a3a60', c3: '#ffff80', size: 1 },
      attacks: {
        absorb: { name: 'Absorb', kind: 'drain', formula: 'phys', power: 20, acc: 255, target: 'enemy' },   // FF7: Physical Absorb, PAt% 255
        stare_down: { name: 'Stare Down', kind: 'status', add: ['paralysis'], hit: 255, target: 'enemy', mp: 5 }
      },
      ai: {
        moves: [['absorb', 1]],
        custom: function (e, b) {
          if (!e.turn) {
            var np = H.wo(b, 'paralysis');
            return H.go('stare_down', np.length && H.one(b, 2) ? b.pick(np) : 'random');
          }
          var pa = H.wi(b, 'paralysis');
          return H.go('absorb', pa.length ? b.pick(pa) : H.hi(H.party(b), 'hp'));
        }
      },
      desc: 'Paralyses, then drains the helpless.'
    },
    zuu: {
      name: 'Zuu',
      level: 27, hp: 1200, mp: 40,
      exp: 450, ap: 38, gil: 430,
      atk: 55, def: 50, defPct: 1,
      mat: 40, mdf: 150,
      dex: 64, lck: 0,
      elem: { wind: 2, earth: 0, gravity: 0 },
      immune: ['death', 'stop', 'frog', 'small', 'petrify', 'death_sentence', 'manipulate', 'peerless',
        'paralysis'],
      drops: [{ item: 'bird_wing', chance: 14 }],
      steal: [{ item: 'bird_wing', chance: 52 }],
      morph: 'bird_wing',
      boss: false, flying: true, row: 'front',
      look: { type: 'bird', c1: '#c07030', c2: '#f0d890', c3: '#ff2020', size: 1.8, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', silent: true },
        claw_combo: {
          name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        great_gale: {
          name: 'Great Gale', kind: 'phys', power: 30, element: 'wind', add: ['darkness'], hit: 39,
          target: 'allEnemies'
        }
      },
      ai: {
        moves: [['attack', 3], ['great_gale', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var s = H.spc(e, 8, 4, 3, 2);
          if (e.hpPct <= 50 && !v.fury) { v.fury = 1; v.c = 3; }   // "Zuu feels Fury."
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'claw_combo' : 'attack'); }
          if (v.c === 2) { v.c = H.one(b, s) ? 3 : 0; return H.go(H.one(b, s) ? 'claw_combo' : 'attack'); }
          v.c = 0;
          return H.go('great_gale', 'all');
        }
      },
      desc: 'Giant bird. Out of reach on the wooden bridge.'
    },
    kyuvilduns: {
      name: 'Kyuvilduns',
      level: 24, hp: 800, mp: 0,
      exp: 340, ap: 34, gil: 368,
      atk: 48, def: 42, defPct: 1,
      mat: 40, mdf: 64,
      dex: 56, lck: 0,
      elem: { fire: 2 },
      immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'hi_potion',
      boss: false, flying: false, row: 'front',
      look: { type: 'blob', c1: '#a0784a', c2: '#e0c090', c3: '#303030', size: 1, variant: 3 },
      attacks: {
        attack: { name: 'Lay Flat', kind: 'phys', power: 40, target: 'enemy' }
      },
      ai: {
        moves: [['attack', 1]]
      },
      desc: 'Weak against fire.'
    },
    screamer: {
      name: 'Screamer',
      level: 26, hp: 800, mp: 40,
      exp: 400, ap: 33, gil: 400,
      atk: 67, def: 44, defPct: 1,
      mat: 40, mdf: 120,
      dex: 68, lck: 0,
      elem: { gravity: 0 },
      immune: [],
      drops: [{ item: 'earth_drum', chance: 14 }],
      steal: [],
      morph: 'power_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'giant', c1: '#a05a3a', c2: '#606060', c3: '#ffe040', size: 1.5 },
      attacks: {
        attack: { name: 'Ironball', kind: 'phys', power: 20, element: 'hit', acc: 115, target: 'enemy', silent: true },
        iron_attack: { name: 'Iron Attack', kind: 'phys', power: 40, element: 'earth', acc: 100, target: 'allEnemies' },
        war_cry: { name: 'War Cry', kind: 'status', add: ['sadness'], hit: 94, target: 'enemy', mp: 4 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['wait', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = v.c || 0;
          var pick = function () {
            var pa = H.wi(b, 'paralysis');
            if (pa.length) return b.pick(pa);
            var sa = H.wi(b, 'sadness');
            return sa.length ? b.pick(sa) : H.hi(H.party(b), 'hp');
          };
          if (v.c === 0 || v.c === 2) { v.c++; return H.go('wait', 'self'); }
          if (v.c === 1) { v.c = 2; return H.go('attack', pick()); }
          if (v.c === 3) {
            v.c = H.wo(b, 'sadness').length && H.one(b, 3) ? 4 : 0;
            return H.go('attack', pick());
          }
          v.c = 0;
          var ns = H.wo(b, 'sadness');
          return H.go('war_cry', ns.length ? b.pick(ns) : 'random');
        },
        // Counter - General: the first time a hit leaves it at 1/8 HP or less, 1/2 Iron Attack on everyone
        counter: {
          custom: function (e, b) {
            var v = e.vars || (e.vars = {});
            if (v.danger || e.hp > e.maxHp / 8) return null;
            v.danger = 1;
            return H.one(b, 2) ? { move: 'iron_attack', target: 'all' } : null;
          }
        }
      },
      desc: 'Slow but heavy-handed. War Cry saddens.'
    },
    materia_keeper: {
      name: 'Materia Keeper',
      level: 38, hp: 8400, mp: 300,
      exp: 3000, ap: 200, gil: 2400,
      atk: 90, def: 100, defPct: 10,
      mat: 12, mdf: 280,
      dex: 90, lck: 10,
      elem: { gravity: 0, fire: -1 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk'],
      drops: [{ item: 'jem_ring', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'demon', c1: '#6a4a30', c2: '#c0a060', c3: '#40ff80', size: 2.6, variant: 1 },
      attacks: {
        attack: { name: 'Keyclaw', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        big_horn: { name: 'Big Horn', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        hell_combo: { name: 'Hell Combo', kind: 'phys', power: 28, target: 'enemy' },
        trine: {
          name: 'Trine', kind: 'mag', power: 34, element: 'lightning', target: 'allEnemies', mp: 20,
          eskill: 'trine'
        },
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', target: 'self', mp: 24 }
      },
      ai: {
        moves: [['attack', 2], ['big_horn', 2], ['hell_combo', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(5);
          var s = H.spc(e, 5, 4, 3, 2);
          var melee = function () { return H.go(H.one(b, 2) ? 'attack' : 'big_horn'); };
          if (v.c <= 2) {
            v.c++;
            return H.one(b, s) ? H.go('hell_combo') : melee();
          }
          if (v.c === 3) {
            if (s < 4 && e.mp >= 24) { v.c = 4; return H.go('cure2', 'self'); }
            if (H.one(b, s)) { v.c = 0; return H.go('hell_combo'); }
            v.c = b.rnd(3);
            return melee();
          }
          v.c = 0;
          return e.mp >= 20 ? H.go('trine', 'all') : H.go('hell_combo');
        }
      },
      desc: 'Guardian of Mt. Nibel\'s mako fountain. Absorbs fire. First source of Trine.'
    },

    // ===== Nibel Area forests & Rocket Launch Pad Area (world map) =====
    bahba_velamyu: {
      name: 'Bahba Velamyu',
      level: 23, hp: 640, mp: 40,
      exp: 285, ap: 20, gil: 280,
      atk: 40, def: 38, defPct: 1,
      mat: 44, mdf: 176,
      dex: 55, lck: 0,
      elem: {},
      immune: ['frog', 'small'],
      drops: [{ item: 'mute_mask', chance: 14 }],
      steal: [],
      morph: 'mute_mask',
      boss: false, flying: false, row: 'front',
      look: { type: 'skeleton', c1: '#d8d0b0', c2: '#6a4a8a', c3: '#ff40a0', size: 1.1, variant: 1 },
      attacks: {
        attack: { name: 'Bonecutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy' },
        bonecutter_combo: {
          name: 'Bonecutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy', hits: 2,
          random: true
        },
        jumping_cutter: { name: 'Jumping Cutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy' },
        jumping_combo: {
          name: 'Jumping Cutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy', hits: 2,
          random: true
        },
        magic_cutter: { name: 'Magic Cutter', kind: 'special', special: 'mpDrain', power: 2, target: 'enemy', mp: 4 },
        silence: { name: 'Silence', kind: 'status', add: ['silence'], hit: 59, target: 'enemy', mp: 24 },
        slow: { name: 'Slow', kind: 'status', add: ['slow'], hit: 99, target: 'enemy', mp: 20 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['jumping_cutter', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(5);
          // FF7: whoever hits it gets Slow (physical) or Silence (magic) next
          if (v.last !== undefined && e.hp < v.last) v.c = H.one(b, 2) ? 3 : 4;
          v.last = e.hp;
          var s = H.spc(e, 5, 4, 3, 2);
          var sl = H.wi(b, 'slow');
          var tgt = function () { return sl.length ? b.pick(sl) : 'random'; };
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'bonecutter_combo' : 'attack', tgt()); }
          if (v.c === 2) { v.c = 0; return H.go(H.one(b, s) ? 'jumping_combo' : 'jumping_cutter', tgt()); }
          var c = v.c;
          v.c = 0;
          var t = b.pick(H.party(b));
          if (!t) return H.go('wait', 'self');
          if (c === 3) {
            if (b.has(t, 'slow')) return H.go('wait', 'self');
            return H.go(e.mp >= 20 ? 'slow' : 'magic_cutter', t);
          }
          if (b.has(t, 'silence')) return H.go('wait', 'self');
          return H.go(e.mp >= 24 ? 'silence' : 'magic_cutter', t);
        }
      },
      desc: 'Slows or silences whoever attacks it.'
    },
    battery_cap: {
      name: 'Battery Cap',
      level: 24, hp: 640, mp: 58,
      exp: 270, ap: 32, gil: 386,
      atk: 41, def: 38, defPct: 1,
      mat: 42, mdf: 146,
      dex: 40, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'manipulate'],
      drops: [{ item: 'eye_drop', chance: 14 }],
      steal: [{ item: 'dazers', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#c04030', c2: '#f0e0c0', c3: '#ffff60', size: 0.7, variant: 1 },
      attacks: {
        seed_shot: {
          name: 'Seed Shot', kind: 'status', element: 'shoot', add: ['darkness'], hit: 100, target: 'enemy'
        },
        four_laser: { name: 'Four Laser', kind: 'mag', power: 16, target: 'enemy', mp: 16 }
      },
      ai: {
        moves: [['seed_shot', 1], ['four_laser', 1]],
        custom: function (e, b) {
          if (H.one(b, 2)) {
            var po = H.wi(b, 'poison');
            return H.go('seed_shot', po.length ? b.pick(po) : 'random');
          }
          return H.go('four_laser');
        }
      },
      desc: 'Mushroom that blinds with its seeds.'
    },
    velcher_task: {
      name: 'Velcher Task',
      level: 26, hp: 900, mp: 28,
      exp: 320, ap: 31, gil: 350,
      atk: 50, def: 50, defPct: 1,
      mat: 45, mdf: 130,
      dex: 58, lck: 0,
      elem: { poison: -1 },
      immune: [],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'remedy', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#4a7a4a', c2: '#c0d080', c3: '#ff3030', size: 1.1, variant: 3 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        poison_blow: {
          name: 'Poison Blow', kind: 'status', element: 'shoot', add: ['poison'], hit: 71, target: 'enemy',
          mp: 4
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['poison_blow', 1]],
        custom: function (e, b) {
          var np = H.wo(b, 'poison');
          if (!np.length) return H.go('wait', 'self');
          return H.go(H.one(b, e.turn ? 3 : 4) ? 'poison_blow' : 'attack', b.pick(np));
        }
      },
      desc: 'Absorbs poison; only targets unpoisoned members.'
    },

    // ===== Rocket Town =====
    palmer: {
      name: 'Palmer',
      level: 38, hp: 6000, mp: 240,
      exp: 1800, ap: 98, gil: 5000,
      atk: 100, def: 100, defPct: 50,
      mat: 25, mdf: 200,
      dex: 60, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'edincoat', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#e08a30', c2: '#f0d8b0', c3: '#303030', size: 1.8, variant: 2 },
      attacks: {
        mako_gun_fire: { name: 'Mako Gun', kind: 'mag', power: 20, element: 'fire', target: 'enemy', mp: 22 },
        mako_gun_ice: { name: 'Mako Gun', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
        mako_gun_bolt: { name: 'Mako Gun', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        incite: { name: 'Heh-hic-heh-hic!', kind: 'special', special: 'nothing', target: 'enemy' },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['mako_gun_fire', 1], ['mako_gun_ice', 1], ['mako_gun_bolt', 1], ['incite', 1]],
        custom: function (e, b) {
          var r = b.rnd(4);
          if (r === 0) {
            var ns = H.wo(b, 'sadness');
            return ns.length ? H.go('incite', b.pick(ns)) : H.go('wait', 'self');
          }
          if (e.mp < 22) return H.go('wait', 'self');
          return H.go(r === 1 ? 'mako_gun_fire' : r === 2 ? 'mako_gun_ice' : 'mako_gun_bolt');
        }
      },
      desc: 'Shinra\'s Space Program chief. Df% 50. Runs out of MP after 10 Mako Gun shots.'
    },

    // ===== Wutai Area (world map) =====
    thunderbird: {
      name: 'Thunderbird',
      level: 28, hp: 800, mp: 80,
      exp: 385, ap: 36, gil: 420,
      atk: 70, def: 40, defPct: 1,
      mat: 32, mdf: 100,
      dex: 45, lck: 0,
      elem: { lightning: -1 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'bolt_plume', chance: 14 }, { item: 'hi_potion', chance: 14 },
        { item: 'echo_screen', chance: 14 }],
      steal: [{ item: 'bolt_plume', chance: 52 }],
      morph: 'swift_bolt',
      boss: false, flying: false, row: 'front',
      look: { type: 'bird', c1: '#3050a0', c2: '#f0e040', c3: '#ffffff', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Stab', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        lightning: { name: 'Lightning', kind: 'mag', power: 20, element: 'lightning', target: 'allEnemies', mp: 16 }
      },
      ai: {
        moves: [['lightning', 1], ['attack', 3]]
      },
      desc: 'Absorbs lightning.'
    },
    razor_weed: {
      name: 'Razor Weed',
      level: 27, hp: 1000, mp: 145,
      exp: 375, ap: 30, gil: 350,
      atk: 58, def: 50, defPct: 1,
      mat: 25, mdf: 100,
      dex: 60, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'tranquilizer', chance: 14 }, { item: 'hi_potion', chance: 14 },
        { item: 'loco_weed', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'plant', c1: '#509040', c2: '#c0e060', c3: '#ff4040', size: 1 },
      attacks: {
        attack: { name: 'Glasscutter', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        spaz_voice: { name: 'Spaz Voice', kind: 'status', add: ['fury'], hit: 47, target: 'enemy', mp: 15 },
        magic_hammer: {
          name: 'Magic Hammer', kind: 'special', special: 'mpDrain', amount: 100, target: 'enemy', mp: 3,
          eskill: 'magic_hammer'
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['wait', 2]],
        counter: { phys: 'spaz_voice', chance: 100 }
      },
      desc: 'Answers every physical hit with Spaz Voice. Magic Hammer is learned only through Manipulate.'
    },
    edgehead: {
      name: 'Edgehead',
      level: 27, hp: 900, mp: 80,
      exp: 370, ap: 36, gil: 385,
      atk: 60, def: 48, defPct: 1,
      mat: 31, mdf: 140,
      dex: 62, lck: 0,
      elem: { lightning: -1 },
      immune: [],
      drops: [{ item: 'x_potion', chance: 14 }, { item: 'smoke_bomb', chance: 14 },
        { item: 'hourglass', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'crab', c1: '#b0a040', c2: '#606060', c3: '#40e0ff', size: 1.1 },
      attacks: {
        attack: { name: 'Scissors', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        electric_burst: {
          name: 'Electric Burst', kind: 'mag', power: 16, element: 'lightning', target: 'enemy', mp: 8
        }
      },
      ai: {
        moves: [['electric_burst', 1], ['attack', 3]]
      },
      desc: 'Absorbs lightning.'
    },
    bizarre_bug: {
      name: 'Bizarre Bug',
      level: 28, hp: 975, mp: 0,
      exp: 420, ap: 40, gil: 340,
      atk: 75, def: 50, defPct: 1,
      mat: 24, mdf: 160,
      dex: 59, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'x_potion', chance: 100 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#8a6a2a', c2: '#e0c060', c3: '#ff2020', size: 1.1, variant: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        scorpion_attack: { name: 'Scorpion Attack', kind: 'phys', power: 16, target: 'enemy', silent: true },
        toxic_powder: {
          name: 'Toxic Powder', kind: 'phys', power: 25, element: 'poison', add: ['poison'], hit: 100,
          target: 'allEnemies'
        },
        rise: { name: 'Rise', kind: 'special', special: 'nothing', target: 'self', silent: true },
        land: { name: 'Land', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.land === undefined) { v.land = 0; v.air = 0; v.up = false; }
          if (!v.up) {
            if (v.land <= 0) { v.up = true; v.air = 5; return H.go('rise', 'self'); }
            v.land--;
            return H.go('attack');
          }
          if (v.air <= 0) { v.up = false; v.land = 3; return H.go('land', 'self'); }
          v.air--;
          if (!v.powder && H.one(b, 4)) { v.powder = 1; return H.go('toxic_powder', 'all'); }
          return H.go('scorpion_attack');
        }
      },
      desc: 'Hovers (Def 0 / Df% 51) and sprays Toxic Powder once per battle.'
    },
    tail_vault: {
      name: 'Tail Vault',
      level: 28, hp: 960, mp: 0,
      exp: 440, ap: 36, gil: 380,
      atk: 69, def: 46, defPct: 1,
      mat: 25, mdf: 120,
      dex: 60, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'phoenix_down', chance: 100 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#c08a40', c2: '#f0e0b0', c3: '#202020', size: 1, variant: 3 },
      attacks: {
        attack: { name: 'Bite', kind: 'phys', power: 16, target: 'enemy', silent: true },
        somersault: { name: 'Somersault', kind: 'phys', power: 16, target: 'allEnemies', split: false }
      },
      ai: {
        moves: [['attack', 1]],
        counter: { phys: 'somersault', chance: 25 }
      },
      desc: 'Every fourth physical hit it takes is answered with a Somersault on everyone.'
    },
    adamantaimai: {
      name: 'Adamantaimai',
      level: 30, hp: 1600, mp: 240,
      exp: 720, ap: 100, gil: 2000,
      atk: 71, def: 60, defPct: 1,
      mat: 75, mdf: 280,
      dex: 62, lck: 0,
      elem: { gravity: 0 },
      immune: ['confusion', 'frog', 'small'],
      drops: [{ item: 'dragon_scales', chance: 14 }, { item: 'phoenix_down', chance: 14 }],
      steal: [{ item: 'adaman_bangle', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'turtle', c1: '#5a7a4a', c2: '#a08a50', c3: '#ffe040', size: 1.6 },
      attacks: {
        attack: { name: 'Light Shell', kind: 'phys', power: 16, element: 'shout', target: 'enemy', silent: true },
        death_force: {
          name: 'Death Force', kind: 'status', add: ['resist'], hit: 100, target: 'ally', mp: 3,
          eskill: 'death_force'
        },
        barrier: { name: 'Barrier', kind: 'status', add: ['barrier'], hit: 100, target: 'self', mp: 16 },
        mbarrier: { name: 'MBarrier', kind: 'status', add: ['mbarrier'], hit: 100, target: 'self', mp: 24 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['wait', 1]],
        counter: { phys: 'attack', mag: 'attack', chance: 100 },
        custom: function (e, b) {
          if (!b.has(e, 'barrier')) return e.mp >= 16 ? H.go('barrier', 'self') : H.go('wait', 'self');
          if (!b.has(e, 'mbarrier')) return e.mp >= 24 ? H.go('mbarrier', 'self') : H.go('wait', 'self');
          return H.go('wait', 'self');
        }
      },
      desc: 'Wutai beaches. Hides behind barriers and counters everything. Manipulate it for Death Force.'
    },

    // ===== Wutai - Da-chao Statue =====
    foulander: {
      name: 'Foulander',
      level: 27, hp: 800, mp: 100,
      exp: 440, ap: 34, gil: 460,
      atk: 50, def: 46, defPct: 1,
      mat: 25, mdf: 100,
      dex: 54, lck: 0,
      elem: { fire: -1 },
      immune: [],
      drops: [{ item: 'lunar_curtain', chance: 14 }, { item: 'fire_veil', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#c04020', c2: '#ffa030', c3: '#ffff60', size: 1.2, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        claw_combo: {
          name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        flame_dance: { name: 'Flame Dance', kind: 'mag', power: 20, element: 'fire', target: 'allEnemies', mp: 16 }
      },
      ai: {
        moves: [['attack', 3], ['flame_dance', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(5);
          if (v.c < 4) { v.c++; return H.go(H.one(b, 3) ? 'claw_combo' : 'attack'); }
          v.c = b.rnd(2);
          return e.mp >= 16 ? H.go('flame_dance', 'all') : H.go('attack');
        }
      },
      desc: 'Absorbs fire.'
    },
    garuda: {
      name: 'Garuda',
      level: 29, hp: 1400, mp: 200,
      exp: 520, ap: 30, gil: 520,
      atk: 56, def: 52, defPct: 1,
      mat: 35, mdf: 150,
      dex: 59, lck: 0,
      elem: { wind: 2, earth: 0, ice: -1, lightning: -1 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'ice_crystal', chance: 14 }, { item: 'bolt_plume', chance: 14 },
        { item: 'light_curtain', chance: 14 }, { item: 'mute_mask', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'bird', c1: '#3a5aa0', c2: '#e8c060', c3: '#ff3030', size: 1.3, variant: 3 },
      attacks: {
        attack: { name: 'Rod', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        dance: { name: 'Dance', kind: 'special', special: 'mpDrain', power: 8, target: 'enemy', mp: 8 }
      },
      ai: {
        moves: [['attack', 1], ['dance', 1]],
        custom: function (e, b) {
          var r = b.rnd(4);
          var dance = function () { return H.go('dance', H.hi(H.party(b), 'mp')); };
          if (r === 0) return e.mp >= 22 ? H.go('ice2') : dance();
          if (r === 1) return e.mp >= 22 ? H.go('bolt2') : dance();
          if (r === 2) return dance();
          return H.go('attack');
        }
      },
      desc: 'Absorbs ice and lightning; weak against wind.'
    },
    jayjujayme: {
      name: 'Jayjujayme',
      level: 28, hp: 640, mp: 20,
      exp: 410, ap: 35, gil: 350,
      atk: 52, def: 46, defPct: 1,
      mat: 35, mdf: 160,
      dex: 45, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'remedy', chance: 26 }, { item: 'deadly_waste', chance: 14 },
        { item: 'x_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'insect', c1: '#e0d0f0', c2: '#8060a0', c3: '#40ff80', size: 1, variant: 3 },
      attacks: {
        attack: { name: 'Bite', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        confu_scales: {
          name: 'Confu-scales', kind: 'mag', power: 12, add: ['confusion'], hit: 100, target: 'enemy', mp: 5
        },
        silk: { name: 'Silk', kind: 'status', add: ['slow'], hit: 100, target: 'enemy' },
        thread: { name: 'Thread', kind: 'status', add: ['stop'], hit: 99, target: 'enemy' }
      },
      ai: {
        moves: [['silk', 1], ['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(2);
          var many = H.party(b).length > 1;
          var st = H.wi(b, 'stop'), sl = H.wi(b, 'slow'), nsl = H.wo(b, 'slow');
          var c = v.c;
          v.c = c ? 0 : 1;
          if (c === 0) {
            if (st.length) return H.go('attack', b.pick(st));
            if (sl.length && many) return H.go('thread', b.pick(sl));
            if (nsl.length) return H.go('silk', b.pick(nsl));
            return H.go('attack');
          }
          if (nsl.length) return H.go('silk', b.pick(nsl));
          var nst = H.wo(b, 'stop');
          if (nst.length && many) return H.go('thread', b.pick(nst));
          return H.go('attack');
        }
      },
      desc: 'Slows with Silk, then Stops with Thread. Confu-scales only via Manipulate.'
    },

    // ===== Wutai - Stolen Materia sidequest =====
    attack_squad: {
      name: 'Attack Squad',
      level: 34, hp: 1300, mp: 100,
      exp: 300, ap: 10, gil: 420,
      atk: 60, def: 66, defPct: 1,
      mat: 20, mdf: 60,
      dex: 55, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 's_mine', chance: 14 }],
      steal: [{ item: '8inch_cannon', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'soldier', c1: '#3a4a3a', c2: '#8a8a60', c3: '#e0b890', size: 1 },
      attacks: {
        attack: { name: 'Machine Gun', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        grenade: { name: 'Grenade', kind: 'phys', power: 20, target: 'allEnemies' },
        smoke_bullet: {
          name: 'Smoke Bullet', kind: 'status', add: ['sleep', 'darkness'], hit: 99, target: 'enemy',
          silent: true
        }
      },
      ai: {
        moves: [['attack', 1], ['grenade', 1], ['smoke_bullet', 1]]
      },
      desc: 'Scripted fights while chasing Yuffie in Wutai.'
    },
    rapps: {
      name: 'Rapps',
      level: 39, hp: 6000, mp: 300,
      exp: 3200, ap: 33, gil: 20000,
      atk: 90, def: 58, defPct: 1,
      mat: 55, mdf: 400,
      dex: 120, lck: 0,
      elem: {},
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'peace_ring', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: true, row: 'front',
      look: { type: 'dragon', c1: '#6a8a40', c2: '#e0c060', c3: '#ff3030', size: 2.2, variant: 2 },
      attacks: {
        attack: { name: 'Wing Cut', kind: 'phys', power: 16, element: 'cut', target: 'enemy', silent: true },
        wing_combo: {
          name: 'Wing Cut', kind: 'phys', power: 16, element: 'cut', target: 'enemy', hits: 2,
          random: true, silent: true
        },
        scorpions_tail: {
          name: 'Scorpion\'s Tail', kind: 'phys', power: 16, add: ['poison'], hit: 47, target: 'enemy'
        },
        tail_combo: {
          name: 'Scorpion\'s Tail', kind: 'phys', power: 16, add: ['poison'], hit: 47, target: 'enemy',
          hits: 2, random: true
        },
        aero3: { name: 'Aero3', kind: 'mag', power: 50, element: 'wind', target: 'enemy', mp: 50 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 2], ['scorpions_tail', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(5);
          var s = H.spc(e, 9, 7, 5, 3);
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'wing_combo' : 'attack'); }
          if (v.c === 2) { v.c = 3; return H.go(H.one(b, s) ? 'tail_combo' : 'scorpions_tail'); }
          v.c = 0;
          return e.mp >= 50 ? H.go('aero3') : H.go('wait', 'self');
        }
      },
      desc: 'Don Corneo\'s pet, atop the Da-chao statue. Aero3 hits very hard.'
    },

    // ===== Wutai - Godo's Pagoda (Yuffie alone) =====
    gorky: {
      name: 'Gorky',
      level: 30, hp: 3000, mp: 150,
      exp: 1500, ap: 50, gil: 0,
      atk: 71, def: 60, defPct: 25,
      mat: 75, mdf: 280,
      dex: 70, lck: 0,
      elem: { wind: 2, earth: 0, gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'x_potion', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: true, row: 'front',
      look: { type: 'humanoid', c1: '#a03030', c2: '#f0d0a0', c3: '#202020', size: 1.8, variant: 1 },
      attacks: {
        dive_kick: {
          name: 'Dive Kick', kind: 'pct', pct: 25, ofMax: true, element: 'hit', target: 'enemy',
          silent: true
        },
        barrier: { name: 'Barrier', kind: 'status', add: ['barrier'], hit: 100, target: 'self', mp: 16 },
        demi2: { name: 'Demi2', kind: 'pct', pct: 50, element: 'gravity', hit: 75, target: 'enemy', mp: 33 },
        reflect: { name: 'Reflect', kind: 'status', add: ['reflect'], hit: 100, target: 'self', mp: 30 },
        regen: { name: 'Regen', kind: 'status', add: ['regen'], hit: 100, target: 'self', mp: 30 }
      },
      ai: {
        moves: [['dive_kick', 1], ['demi2', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = (v.c || 0) + 1;
          if (v.c === 1) {
            if (!b.has(e, 'barrier')) return H.go('barrier', 'self');
            if (!b.has(e, 'regen')) return H.go('regen', 'self');
            if (!b.has(e, 'reflect')) return H.go('reflect', 'self');
            return H.go('demi2');
          }
          if (v.c === 2) return H.go('dive_kick');
          v.c = 0;
          return H.go(H.one(b, 2) ? 'demi2' : 'dive_kick');
        }
      },
      desc: 'Pagoda floor 1. Fights in the air; weak against wind.'
    },
    shake: {
      name: 'Shake',
      level: 32, hp: 4000, mp: 180,
      exp: 2200, ap: 50, gil: 0,
      atk: 71, def: 60, defPct: 1,
      mat: 75, mdf: 280,
      dex: 68, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'turbo_ether', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'bird', c1: '#d09040', c2: '#f0e8d0', c3: '#ff2020', size: 1.8, variant: 1 },
      attacks: {
        attack: { name: 'Beak', kind: 'phys', power: 16, element: 'punch', acc: 103, target: 'enemy', silent: true },
        rage_bomber: {
          name: 'Rage Bomber', kind: 'phys', power: 40, element: 'shout', add: ['fury'], acc: 75, statusChance: 72,
          target: 'enemy'
        }
      },
      ai: {
        moves: [['attack', 1]],
        // Enemy Mechanics FAQ: Beak, or 1/2 Rage Bomber while poisoned; at 50% HP or less every hit taken is
        // answered with Rage Bomber on the attacker (Counter - General)
        custom: function (e, b) {
          if (b.has(e, 'poison')) return H.go(H.one(b, 2) ? 'attack' : 'rage_bomber');
          return H.go('attack');
        },
        counter: { custom: function (e, b, src) { return e.hpPct <= 50 ? { move: 'rage_bomber', target: src } : null; } }
      },
      desc: 'Pagoda floor 2.'
    },
    chekhov: {
      name: 'Chekhov',
      level: 34, hp: 5000, mp: 210,
      exp: 2900, ap: 50, gil: 0,
      atk: 71, def: 60, defPct: 1,
      mat: 75, mdf: 280,
      dex: 70, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'ice_ring', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#d070a0', c2: '#f0e0d0', c3: '#6040a0', size: 1.8, variant: 2 },
      attacks: {
        // FF7: a PHYSICAL absorb (Formula: Physical, PAt% 255), not a magical one
        absorb: { name: 'Absorb', kind: 'drain', formula: 'phys', power: 20, acc: 255, target: 'enemy' },
        stare_down: { name: 'Stare Down', kind: 'status', add: ['paralysis'], hit: 255, target: 'enemy', mp: 5 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['wait', 1]],
        counter: { mag: 'stare_down', chance: 100 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (!v.opened) {                          // TempVar:OpeningAttack: her first turn only
            v.opened = 1;
            if (!H.one(b, 2)) return H.go('wait', 'self');
            var np = H.wo(b, 'paralysis');
            return H.go('stare_down', np.length ? b.pick(np) : 'random');
          }
          if (e.hpPct <= 50) {
            var pa = H.wi(b, 'paralysis');
            return H.go('absorb', pa.length ? b.pick(pa) : H.hi(H.party(b), 'hp'));
          }
          return H.go('wait', 'self');
        }
      },
      desc: 'Pagoda floor 3. Answers magic with a paralysing Stare Down.'
    },
    staniv: {
      name: 'Staniv',
      level: 36, hp: 6000, mp: 240,
      exp: 3600, ap: 50, gil: 0,
      atk: 71, def: 60, defPct: 1,
      mat: 75, mdf: 280,
      dex: 72, lck: 0,
      elem: { gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'elixir', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'giant', c1: '#6a6a80', c2: '#c0a060', c3: '#ffe040', size: 1.9 },
      attacks: {
        attack: { name: 'Ironball', kind: 'phys', power: 20, element: 'hit', acc: 115, target: 'enemy', silent: true },
        iron_attack: { name: 'Iron Attack', kind: 'phys', power: 40, element: 'earth', acc: 100, target: 'allEnemies' },
        war_cry: { name: 'War Cry', kind: 'status', add: ['sadness'], hit: 94, target: 'enemy', mp: 4 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1], ['wait', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          v.c = v.c || 0;
          var pick = function () {
            var pa = H.wi(b, 'paralysis');
            if (pa.length) return b.pick(pa);
            var sa = H.wi(b, 'sadness');
            return sa.length ? b.pick(sa) : H.hi(H.party(b), 'hp');
          };
          if (v.c === 0 || v.c === 2) { v.c++; return H.go('wait', 'self'); }
          if (v.c === 1) { v.c = 2; return H.go('attack', pick()); }
          if (v.c === 3) {
            if (!H.wo(b, 'sadness').length) v.c = 0;
            return H.go('attack', pick());
          }
          v.c = 0;
          return H.go('war_cry');
        },
        // Counter - General: the first time a hit leaves it at 1/8 HP or less, 1/2 Iron Attack on everyone
        counter: {
          custom: function (e, b) {
            var v = e.vars || (e.vars = {});
            if (v.danger || e.hp > e.maxHp / 8) return null;
            v.danger = 1;
            return H.one(b, 2) ? { move: 'iron_attack', target: 'all' } : null;
          }
        }
      },
      desc: 'Pagoda floor 4.'
    },
    godo: {
      name: 'Godo',
      level: 41, hp: 10000, mp: 1000,
      exp: 5000, ap: 60, gil: 40000,
      atk: 70, def: 60, defPct: 1,
      mat: 45, mdf: 100,
      dex: 68, lck: 0,
      elem: {},
      immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless', 'paralysis'],
      drops: [{ item: 'all_creation', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#8a2a20', c2: '#e0c060', c3: '#f0f0f0', size: 2, variant: 3 },
      attacks: {
        cure2: { name: 'Cure2', kind: 'heal', power: 35, element: 'restorative', target: 'self', mp: 24 },
        // Enemy Mechanics FAQ: MAt% 100 with a [72] infliction chance (Mini toggles Small)
        sleepel: { name: 'Sleepel', kind: 'status', add: ['sleep'], hit: 100, statusChance: 72, target: 'allEnemies', mp: 8 },
        mini: { name: 'Mini', kind: 'status', add: ['small'], toggle: true, hit: 100, statusChance: 72, target: 'allEnemies', mp: 10 },
        drain: { name: 'Drain', kind: 'drain', power: 6, target: 'enemy', mp: 1 },
        bio2: {
          name: 'Bio2', kind: 'mag', power: 21, element: 'poison', add: ['poison'], hit: 100, statusChance: 48,
          target: 'allEnemies', mp: 36
        },
        trine: {
          name: 'Trine', kind: 'mag', power: 34, element: 'lightning', target: 'allEnemies', mp: 20,
          eskill: 'trine'
        },
        demi3: { name: 'Demi3', kind: 'pct', pct: 75, element: 'gravity', hit: 75, target: 'allEnemies', mp: 48 },
        beast_sword: { name: 'Beast Sword', kind: 'phys', power: 16, acc: 95, target: 'allEnemies' }
      },
      ai: {
        moves: [['beast_sword', 2], ['trine', 1], ['bio2', 1], ['drain', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(8);
          var p = e.hpPct;
          var s = p > 80 ? 5 : p > 60 ? 4 : p > 40 ? 3 : 2;
          var nr = H.wo(b, 'reflect').length > 0;
          var c = v.c;
          var pick4 = function (a) { return a[b.rnd(4)]; };
          if (c === 0) { v.c = pick4([2, 4, 5, 1]); return H.go('beast_sword', 'all'); }
          if (c === 1) { v.c = pick4([3, 4, 6, 0]); return H.go('beast_sword', 'all'); }
          if (c === 2) {
            v.c = H.one(b, 3) ? 0 : 1;
            if (nr && H.wo(b, 'sleep').length && e.mp >= 8) return H.go('sleepel', 'all');
            return H.go('beast_sword', 'all');
          }
          if (c === 3) {
            v.c = H.one(b, 3) ? 1 : 0;
            if (nr && H.wo(b, 'small').length && e.mp >= 10) return H.go('mini', 'all');
            return H.go('beast_sword', 'all');
          }
          if (c === 4) {
            v.c = pick4([0, 1, 5, 6]);
            return e.mp >= 1 ? H.go('drain', H.hi(H.party(b), 'hp')) : H.go('beast_sword', 'all');
          }
          if (c === 5) {
            v.c = H.one(b, s) ? 7 : 1;
            return nr && e.mp >= 36 ? H.go('bio2', 'all') : H.go('beast_sword', 'all');
          }
          if (c === 6) {
            v.c = H.one(b, s) ? 7 : 0;
            return e.mp >= 20 ? H.go('trine', 'all') : H.go('beast_sword', 'all');
          }
          v.c = b.rnd(2);
          return e.mp >= 48 ? H.go('demi3', 'all') : H.go('beast_sword', 'all');
        },
        // Counter - General (FF7): at 40% HP or less (SpclChance 2), without Reflect and with 24 MP, every hit
        // taken is answered with Cure2 (human face) on himself, or 1/2 on the attacker when the attacker is at
        // 20% HP or less
        counter: {
          custom: function (e, b, src) {
            if (e.hpPct > 40 || e.mp < 24 || b.has(e, 'reflect')) return null;
            var low = src && src.isParty && src.hp > 0 && src.hp <= 2 * Math.floor(src.maxHp / 10) && H.one(b, 2);
            return { move: 'cure2', target: low ? src : 'self' };
          }
        }
      },
      desc: 'Lord of Wutai, pagoda floor 5. Three faces: human (Cure2/Sleepel/Mini), beast (Trine/Beast Sword), joker (Drain/Bio2/Demi3).'
    },

    // ===== Woodlands Area (Temple of the Ancients world map) =====
    slaps: {
      name: 'Slaps',
      level: 29, hp: 900, mp: 50,
      exp: 370, ap: 30, gil: 450,
      atk: 46, def: 42, defPct: 1,
      mat: 34, mdf: 66,
      dex: 56, lck: 0,
      elem: { wind: 2, earth: 0 },
      immune: ['confusion', 'stop', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: 'hyper',
      boss: false, flying: true, row: 'front',
      look: { type: 'insect', c1: '#40a060', c2: '#e0f080', c3: '#ff3030', size: 0.9, variant: 2 },
      attacks: {
        bug_needle: {
          name: 'Bug Needle', kind: 'mag', power: 1, element: 'punch', add: ['poison', 'sadness'], hit: 87,
          target: 'enemy'
        },
        berserk_needle: {
          name: 'Berserk Needle', kind: 'mag', power: 1, element: 'punch', add: ['berserk'], hit: 100,
          target: 'enemy'
        },
        paralyzer_needle: {
          name: 'Paralyzer Needle', kind: 'mag', power: 1, element: 'punch', add: ['paralysis'], hit: 19,
          target: 'enemy'
        }
      },
      ai: {
        moves: [['berserk_needle', 6], ['bug_needle', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          var r = b.rnd(8);
          if (r === 0) {
            if (!v.para) { v.para = 1; return H.go('paralyzer_needle', 'lowest'); }
            return H.go('berserk_needle');
          }
          if (r === 1) return H.go('bug_needle');
          return H.go('berserk_needle');
        }
      },
      desc: 'Needles that berserk, poison and sadden.'
    },
    under_lizard: {
      name: 'Under Lizard',
      level: 29, hp: 1400, mp: 140,
      exp: 440, ap: 45, gil: 420,
      atk: 70, def: 50, defPct: 1,
      mat: 50, mdf: 130,
      dex: 66, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'remedy', chance: 14 }],
      steal: [{ item: 'remedy', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'reptile', c1: '#4a6a8a', c2: '#c0d0a0', c3: '#ffe040', size: 1.2, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        petrified_frog: {
          name: 'Petrified Frog', kind: 'status', add: ['frog', 'slow_numb'], hit: 83, target: 'enemy',
          mp: 45
        },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var np = H.wo(b, 'petrify');
          var bodyblow = function () { return np.length ? H.go('attack', b.pick(np)) : H.go('wait', 'self'); };
          if (v.c <= 1) { v.c++; return bodyblow(); }
          if (v.c === 2) { v.c = H.one(b, 2) ? b.rnd(2) : 3; return bodyblow(); }
          v.c = b.rnd(2);
          var ok = H.wo(b, 'slow_numb', np);
          if (ok.length && e.mp >= 45) return H.go('petrified_frog', b.pick(ok));
          return bodyblow();
        }
      },
      desc: 'Petrified Frog turns you into a frog and starts petrification.'
    },
    kelzmelzer: {
      name: 'Kelzmelzer',
      level: 30, hp: 800, mp: 0,
      exp: 410, ap: 35, gil: 400,
      atk: 50, def: 56, defPct: 14,
      mat: 35, mdf: 90,
      dex: 53, lck: 1,
      elem: {},
      immune: [],
      drops: [{ item: 'potion', chance: 14 }],
      steal: [{ item: 'antidote', chance: 52 }],
      morph: 'antidote',
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#6a4a6a', c2: '#c090c0', c3: '#40ff40', size: 0.9, variant: 2 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        liquid_poison: {
          name: 'Liquid poison', kind: 'status', element: 'poison', add: ['poison'], hit: 100,
          target: 'enemy'
        }
      },
      ai: {
        moves: [['attack', 3], ['liquid_poison', 1]],
        custom: function (e, b) {
          if (H.mates(e, b).length) return H.go(H.one(b, 4) ? 'liquid_poison' : 'attack');
          return H.go(H.one(b, 4) ? 'attack' : 'liquid_poison');
        }
      },
      desc: 'Poisons more when left alone.'
    },
    dual_horn: {
      name: 'Dual Horn',
      level: 30, hp: 2500, mp: 0,
      exp: 550, ap: 45, gil: 500,
      atk: 68, def: 70, defPct: 1,
      mat: 25, mdf: 166,
      dex: 62, lck: 0,
      elem: {},
      immune: [],
      drops: [{ item: 'pepio_nut', chance: 14 }],
      steal: [{ item: 'pepio_nut', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'beast', c1: '#8a5a3a', c2: '#e0d0b0', c3: '#ff2020', size: 1.6, variant: 2 },
      attacks: {
        attack: { name: 'Angle Punch', kind: 'phys', power: 16, element: 'punch', target: 'enemy', silent: true },
        horn_lift: { name: 'Horn Lift', kind: 'phys', power: 16, target: 'enemy' },
        double_lift: { name: 'Horn Lift', kind: 'special', special: 'nothing', target: 'enemy' }
      },
      ai: {
        moves: [['horn_lift', 1], ['attack', 3]],
        custom: function (e, b) {
          var r = b.rnd(4);
          // below half HP it tries a dummied-out double lift that does nothing
          if (e.hpPct <= 50) return r === 0 ? H.go('double_lift') : r === 1 ? H.go('attack') : H.go('horn_lift');
          return r === 0 ? H.go('horn_lift') : H.go('attack');
        }
      },
      desc: 'Big, tough and simple. Carries Pepio Nuts.'
    },
    tonadu: {
      name: 'Tonadu',
      level: 30, hp: 1600, mp: 0,
      exp: 600, ap: 45, gil: 600,
      atk: 54, def: 52, defPct: 5,
      mat: 55, mdf: 150,
      dex: 66, lck: 0,
      elem: { wind: 2, earth: 0, water: 0 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'bird_wing', chance: 100 }],
      steal: [{ item: 'bird_wing', chance: 100 }],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'bird', c1: '#6a5aa0', c2: '#e0d0f0', c3: '#ff4040', size: 1.6, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', silent: true },
        claw_combo: {
          name: 'Claw', kind: 'phys', power: 32, element: 'punch', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        great_gale: {
          name: 'Great Gale', kind: 'phys', power: 30, element: 'wind', add: ['darkness'], hit: 39,
          target: 'allEnemies'
        },
        big_sound: { name: 'Big Sound', kind: 'phys', power: 20, element: 'wind', target: 'allEnemies' }
      },
      ai: {
        moves: [['attack', 3], ['great_gale', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var s = H.spc(e, 8, 4, 3, 2);
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'claw_combo' : 'attack'); }
          if (v.c === 2) { v.c = H.one(b, s) ? 3 : 0; return H.go(H.one(b, s) ? 'claw_combo' : 'attack'); }
          v.c = 0;
          return H.go('great_gale', 'all');
        }
      },
      desc: 'Giant bird of the beaches. Always carries a Bird Wing.'
    },

    // ===== Temple of the Ancients =====
    toxic_frog: {
      name: 'Toxic Frog',
      level: 26, hp: 500, mp: 100,
      exp: 420, ap: 30, gil: 260,
      atk: 56, def: 30, defPct: 1,
      mat: 35, mdf: 120,
      dex: 74, lck: 0,
      elem: { ice: 2, poison: -1 },
      immune: ['frog', 'small'],
      drops: [{ item: 'impaler', chance: 14 }],
      steal: [{ item: 'impaler', chance: 52 }],
      morph: 'remedy',
      boss: false, flying: false, row: 'front',
      look: { type: 'frog', c1: '#8040a0', c2: '#e0e060', c3: '#40ff40', size: 0.9, variant: 1 },
      attacks: {
        frog_jab: {
          name: 'Frog Jab', kind: 'phys', power: 2, element: 'hit', add: ['frog'], hit: 100, target: 'enemy'
        },
        frog_song: {
          name: 'Frog Song', kind: 'status', add: ['frog', 'sleep'], hit: 100, target: 'enemy', mp: 5,
          eskill: 'frog_song'
        },
        poisona: { name: 'Poisona', kind: 'status', remove: ['poison'], target: 'ally', mp: 3 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['frog_jab', 1]],
        counter: { phys: 'frog_jab', mag: 'frog_song', chance: 33 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.jabs === undefined) { v.jabs = 1 + b.rnd(2); v.delay = b.rnd(4); }
          if (v.jabs > 0) { v.jabs--; return H.go('frog_jab'); }
          if (v.delay === 0) {
            var nf = H.wo(b, 'frog');
            if (nf.length) { v.delay = b.rnd(4); return H.go('frog_song', b.pick(nf)); }
            var nc = H.wo(b, 'confusion');
            return H.go('frog_jab', nc.length ? b.pick(nc) : 'random');
          }
          v.delay--;
          return H.go('wait', 'self');
        }
      },
      desc: 'Absorbs poison. Another source of Frog Song.'
    },
    doorbull: {
      name: 'Doorbull',
      level: 35, hp: 2800, mp: 160,
      exp: 760, ap: 50, gil: 680,
      atk: 70, def: 66, defPct: 5,
      mat: 50, mdf: 160,
      dex: 80, lck: 0,
      elem: { gravity: 0, fire: -1 },
      immune: ['manipulate', 'peerless'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'hi_potion', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'demon', c1: '#8a6a4a', c2: '#c0a080', c3: '#ff4020', size: 1.3, variant: 1 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        fang: { name: 'Fang', kind: 'phys', power: 16, target: 'enemy' },
        fire_shell: { name: 'Fire Shell', kind: 'phys', power: 16, element: 'fire', target: 'enemy' },
        light_shell: { name: 'Light Shell', kind: 'phys', power: 16, element: 'shout', target: 'enemy' }
      },
      ai: {
        cycle: ['attack', 'fang', 'fire_shell', 'light_shell']
      },
      desc: 'Absorbs fire. Works through its four attacks in order.'
    },
    ancient_dragon: {
      name: 'Ancient Dragon',
      level: 34, hp: 2400, mp: 450,
      exp: 800, ap: 80, gil: 800,
      atk: 70, def: 90, defPct: 1,
      mat: 55, mdf: 280,
      dex: 70, lck: 10,
      elem: { gravity: 2, wind: 2, earth: 0, water: 0 },
      immune: ['stop', 'frog', 'peerless', 'paralysis'],
      drops: [{ item: 'turbo_ether', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: true, row: 'front',
      look: { type: 'dragon', c1: '#4a6a8a', c2: '#c0d0e0', c3: '#ffe040', size: 1.6, variant: 1 },
      attacks: {
        attack: { name: 'Horn', kind: 'phys', power: 18, element: 'punch', target: 'enemy', silent: true },
        horn_combo: {
          name: 'Horn', kind: 'phys', power: 18, element: 'punch', target: 'enemy', hits: 2, random: true,
          silent: true
        },
        southern_cross: { name: 'Southern Cross', kind: 'phys', power: 32, element: 'ice', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 3], ['southern_cross', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          if (v.c <= 1) { v.c++; return H.go(H.one(b, 3) ? 'horn_combo' : 'attack'); }
          if (v.c === 2) { v.c = H.one(b, 2) ? 3 : b.rnd(2); return H.go(H.one(b, 3) ? 'horn_combo' : 'attack'); }
          v.c = b.rnd(2);
          return H.go('southern_cross');
        }
      },
      desc: 'Weak against wind and gravity.'
    },
    '8_eye': {
      name: '8 Eye',
      level: 30, hp: 500, mp: 220,
      exp: 1000, ap: 100, gil: 720,
      atk: 40, def: 200, defPct: 0,
      mat: 60, mdf: 400,
      dex: 25, lck: 0,
      elem: { poison: 2, gravity: 0 },
      immune: ['confusion', 'silence', 'frog', 'manipulate', 'berserk'],
      drops: [],
      steal: [],
      morph: 'magic_source',
      boss: false, flying: false, row: 'front',
      look: { type: 'eye', c1: '#6a3a8a', c2: '#f0f0f0', c3: '#ff2020', size: 1.1 },
      attacks: {
        eyesight: { name: 'Eyesight', kind: 'mag', power: 48, target: 'enemy', silent: true },
        eyesight_pct: { name: 'Eyesight', kind: 'pct', pct: 75, target: 'enemy', silent: true },
        eyesight_status: {
          name: 'Eyesight', kind: 'status', add: ['slow', 'darkness'], hit: 100, target: 'enemy',
          silent: true
        },
        eyesight_mp: { name: 'Eyesight', kind: 'special', special: 'mpDrain', pct: 75, target: 'enemy', silent: true }
      },
      ai: {
        moves: [['eyesight', 1]],
        counter: { phys: 'eyesight_status', mag: 'eyesight_mp', chance: 100 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          var sl = H.wi(b, 'slow');
          if (H.wi(b, 'darkness').length && sl.length && !v.norm) { v.norm = 1; return H.go('eyesight_pct', b.pick(sl)); }
          v.norm = 0;
          return H.go('eyesight', H.hi(H.party(b), 'hp'));
        }
      },
      desc: 'Clock room III. Any Poison-elemental attack kills it instantly (modelled as poison x2).'
    },
    jemnezmy: {
      name: 'Jemnezmy',
      level: 24, hp: 800, mp: 80,
      exp: 510, ap: 50, gil: 400,
      atk: 55, def: 58, defPct: 1,
      mat: 34, mdf: 80,
      dex: 60, lck: 25,
      elem: { poison: 2, ice: 0 },
      immune: ['sleep', 'confusion', 'frog', 'small', 'manipulate', 'berserk', 'paralysis'],
      drops: [],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'humanoid', c1: '#f0a0c0', c2: '#80c0f0', c3: '#ffffff', size: 1.1, variant: 2 },
      attacks: {
        toad: { name: 'Toad', kind: 'status', add: ['frog'], hit: 71, target: 'enemy', mp: 14 },
        poisona: { name: 'Poisona', kind: 'status', remove: ['poison'], target: 'ally', mp: 3 },
        fascination: { name: 'Fascination', kind: 'status', add: ['confusion'], hit: 100, target: 'enemy', mp: 5 },
        cold_breath: { name: 'Cold Breath', kind: 'mag', power: 6, element: 'ice', target: 'enemy', mp: 12 },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['cold_breath', 1], ['wait', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          var fr = H.wi(b, 'frog');
          if (!v.frog && fr.length) {
            v.frog = 1;
            var fnc = H.wo(b, 'confusion', fr);
            return H.go('cold_breath', b.pick(fnc.length ? fnc : fr));
          }
          if (H.one(b, 2)) {
            v.frog = 0;
            var nc = H.wo(b, 'confusion');
            var t = b.pick(nc.length ? nc : H.party(b));
            // Fascination only works on the men of the party
            if (H.isChar(t, ['cloud', 'barret', 'redxiii', 'caitsith', 'vincent', 'cid'])) return H.go('fascination', t);
            return H.go('cold_breath', t);
          }
          return H.go('wait', 'self');
        }
      },
      desc: 'Clock room I. Confuses the men of the party. Instantly killed by Poison-elemental attacks (modelled as poison x2).'
    },
    red_dragon: {
      name: 'Red Dragon',
      level: 39, hp: 6800, mp: 300,
      exp: 3500, ap: 200, gil: 1000,
      atk: 95, def: 80, defPct: 5,
      mat: 85, mdf: 260,
      dex: 90, lck: 5,
      elem: { gravity: 0, fire: -1 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'dragon_armlet', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'dragon', c1: '#c02818', c2: '#f0a040', c3: '#ffff60', size: 2.6 },
      attacks: {
        attack: { name: 'Dragon Fang', kind: 'phys', power: 40, element: 'hit', target: 'enemy', silent: true },
        tail_attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        red_dragon_breath: { name: 'Red Dragon Breath', kind: 'mag', power: 20, element: 'fire', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 2], ['tail_attack', 1], ['red_dragon_breath', 1]],
        custom: function (e, b) {
          if (!e.turn) return H.go(H.one(b, 4) ? 'attack' : 'red_dragon_breath');
          var r = b.rnd(4);
          return H.go(r === 0 ? 'red_dragon_breath' : r === 1 ? 'tail_attack' : 'attack');
        }
      },
      desc: 'Guards the Temple\'s mural room (Bahamut materia). Absorbs fire.'
    },
    demons_gate: {
      name: 'Demons Gate',
      level: 45, hp: 10000, mp: 400,
      exp: 3800, ap: 220, gil: 4000,
      atk: 150, def: 100, defPct: 0,
      mat: 96, mdf: 450,
      dex: 120, lck: 0,
      elem: { earth: 0.5, poison: 0, gravity: 0 },
      immune: ['death', 'sleep', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb', 'petrify',
        'death_sentence', 'manipulate', 'berserk', 'paralysis'],
      drops: [{ item: 'gigas_armlet', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'demon', c1: '#5a5048', c2: '#a08a60', c3: '#ff3020', size: 3, variant: 3 },
      attacks: {
        attack: { name: 'Falling Rocks', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        rocks_combo: {
          name: 'Falling Rocks', kind: 'phys', power: 20, element: 'hit', target: 'enemy', hits: 2,
          random: true, silent: true
        },
        cave_in: { name: 'Cave-in', kind: 'phys', power: 16, element: 'ice', target: 'allEnemies' },
        petrif_eye: { name: 'Petrif-Eye', kind: 'status', add: ['slow_numb'], hit: 100, target: 'enemy', mp: 12 },
        demon_rush: { name: 'Demon Rush', kind: 'phys', power: 24, target: 'allEnemies' },
        advance: { name: 'Advance', kind: 'special', special: 'nothing', target: 'self', silent: true },
        wait: { name: 'Wait', kind: 'special', special: 'nothing', target: 'self', silent: true }
      },
      ai: {
        moves: [['attack', 3], ['cave_in', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = b.rnd(5); v.th = 100; }
          var p = e.hpPct;
          var s = H.spc(e, 8, 4, 3, 2);
          // dropping past 75% / 50% / 25% HP makes it advance for a Demon Rush
          var th = p <= 25 ? 25 : p <= 50 ? 50 : p <= 75 ? 75 : 100;
          if (th < v.th && v.c < 4) { v.th = th; v.c = 4; }
          var ok = H.party(b).filter(function (t) { return !b.has(t, 'slow_numb') && !b.has(t, 'petrify'); });
          var t = b.pick(ok);
          if (v.c <= 1) { v.c++; return t ? H.go(H.one(b, s) ? 'rocks_combo' : 'attack', t) : H.go('wait', 'self'); }
          if (v.c === 2) { v.c = 3; return ok.length ? H.go('cave_in', 'all') : H.go('wait', 'self'); }
          if (v.c === 3) {
            v.c = b.rnd(3);
            if (!t) return H.go('wait', 'self');
            return H.go(H.one(b, s) ? 'petrif_eye' : 'attack', t);
          }
          if (v.c === 4) { v.c = H.one(b, 3) ? 5 : 6; return H.go('advance', 'self'); }
          if (v.c === 5) { v.c = 6; return H.go('wait', 'self'); }
          v.c = 0;
          return H.go('demon_rush', 'all');
        }
      },
      desc: 'The wall of the Temple\'s last corridor. Advances for a Demon Rush as it weakens.'
    },

    // ===== Icicle Area part one (Bone Village world map) =====
    vlakorados: {
      name: 'Vlakorados',
      level: 33, hp: 33333, mp: 333,
      exp: 510, ap: 40, gil: 460,
      atk: 60, def: 60, defPct: 10,
      mat: 57, mdf: 48,
      dex: 73, lck: 15,
      elem: { gravity: 0.5 },
      immune: ['death', 'confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate', 'berserk'],
      drops: [{ item: 'carob_nut', chance: 52 }],
      steal: [{ item: 'carob_nut', chance: 52 }],
      morph: 'elixir',
      boss: false, flying: false, row: 'front',
      look: { type: 'reptile', c1: '#5a7a5a', c2: '#d0c090', c3: '#40e0ff', size: 1.8, variant: 3 },
      attacks: {
        attack: { name: 'Tail Attack', kind: 'phys', power: 20, element: 'hit', target: 'enemy', silent: true },
        violent_advance: { name: 'Violent Advance', kind: 'phys', power: 16, element: 'punch', target: 'enemy' },
        bolt_ball: { name: 'Bolt Ball', kind: 'mag', power: 16, element: 'lightning', target: 'enemy', mp: 22 }
      },
      ai: {
        moves: [['attack', 1], ['bolt_ball', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) { v.c = b.rnd(3); v.th = 100; }
          var p = e.hpPct;
          var th = p <= 25 ? 25 : p <= 50 ? 50 : p <= 75 ? 75 : 100;
          if (th < v.th) { v.th = th; v.c = 3; }
          var s = H.spc(e, 5, 4, 3, 2);
          var c = v.c;
          if (c === 0 || c === 1) {
            v.c = H.one(b, s) ? 3 : b.rnd(2);
            return c === 0 && e.mp >= 22 ? H.go('bolt_ball') : H.go('attack');
          }
          v.c = b.rnd(2);
          return H.go('violent_advance');
        }
      },
      desc: '33333 HP. Carries Carob Nuts.'
    },
    trickplay: {
      name: 'Trickplay',
      level: 24, hp: 1500, mp: 100,
      exp: 480, ap: 35, gil: 800,
      atk: 100, def: 40, defPct: 0,
      mat: 45, mdf: 96,
      dex: 53, lck: 20,
      elem: { earth: -1 },
      immune: ['confusion', 'frog', 'small', 'slow_numb', 'petrify', 'manipulate'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'rock', c1: '#8a7a5a', c2: '#c0b090', c3: '#ff8020', size: 1.1 },
      attacks: {
        attack: { name: 'Rock Toss', kind: 'phys', power: 16, element: 'shoot', target: 'enemy', silent: true },
        magma: { name: 'Magma', kind: 'phys', power: 16, element: 'fire', target: 'enemy' },
        sewer: { name: 'Sewer', kind: 'mag', power: 16, element: 'water', target: 'enemy' },
        sinking: { name: 'Sinking', kind: 'phys', power: 16, element: 'earth', target: 'enemy' },
        hot_springs: { name: 'Hot Springs', kind: 'heal', power: 7, element: 'restorative', target: 'enemy' },
        gold_mountain: { name: 'Gold Mountain', kind: 'phys', power: 16, target: 'enemy' },
        l4_suicide: {
          name: 'L4 Suicide', kind: 'pct', special: 'l4_suicide', pct: 97, add: ['small'], hit: 100,
          target: 'allEnemies', mp: 10, eskill: 'l4_suicide'
        }
      },
      ai: {
        moves: [['hot_springs', 1], ['attack', 4], ['sewer', 4], ['sinking', 4], ['gold_mountain', 4], ['magma', 4], ['l4_suicide', 2]]
      },
      desc: 'A trick of the land. Hot Springs even heals you. Source of L4 Suicide (only hits levels divisible by 4).'
    },

    // ===== Corral Valley & the Forgotten Capital =====
    boundfat: {
      name: 'Boundfat',
      level: 27, hp: 500, mp: 80,
      exp: 420, ap: 40, gil: 350,
      atk: 55, def: 60, defPct: 1,
      mat: 50, mdf: 100,
      dex: 60, lck: 0,
      elem: { ice: -1 },
      immune: [],
      drops: [{ item: 'dazers', chance: 14 }],
      steal: [{ item: 'dazers', chance: 52 }],
      morph: 'dazers',
      boss: false, flying: false, row: 'front',
      look: { type: 'blob', c1: '#a0c0e0', c2: '#f0f0ff', c3: '#303060', size: 1, variant: 1 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
        dark_needle: { name: 'Dark Needle', kind: 'phys', power: 16, add: ['darkness'], hit: 100, target: 'enemy' },
        death_sentence: {
          name: 'Death Sentence', kind: 'status', add: ['death_sentence'], hit: 100, target: 'enemy',
          mp: 10, eskill: 'death_sentence'
        }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.bb === undefined) v.bb = 5;
          var p = H.party(b);
          // FF7 switches to Ice2 after being hit by magic (approximated with 1/4)
          if (e.mp >= 22 && H.one(b, 4)) { v.bb = 3; return H.go('ice2', H.lo(p, 'mdef') || 'random'); }
          if (v.bb <= 0) { v.bb = 5; return H.go('dark_needle', H.lo(p, 'def') || 'random'); }
          v.bb--;
          return H.go('attack', 'lowest');
        }
      },
      desc: 'Absorbs ice. Death Sentence is its final attack against magic (or via Manipulate).'
    },
    malldancer: {
      name: 'Malldancer',
      level: 32, hp: 600, mp: 100,
      exp: 500, ap: 56, gil: 700,
      atk: 61, def: 58, defPct: 10,
      mat: 50, mdf: 96,
      dex: 60, lck: 0,
      elem: { earth: 0, water: 0 },
      immune: ['stop', 'frog', 'paralysis'],
      drops: [{ item: 'hi_potion', chance: 14 }],
      steal: [{ item: 'phoenix_down', chance: 14 }],
      morph: 'x_potion',
      boss: false, flying: true, row: 'front',
      look: { type: 'ghost', c1: '#e0a0f0', c2: '#6040a0', c3: '#ffff80', size: 1.1, variant: 2 },
      attacks: {
        attack: { name: 'Claw', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        dance: { name: 'Dance', kind: 'phys', power: 16, add: ['slow', 'darkness'], hit: 100, target: 'allEnemies' }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (!v.opened && H.wo(b, 'darkness').length) { v.opened = 1; return H.go('dance', 'all'); }
          v.opened = 1;
          var dk = H.wi(b, 'darkness');
          return H.go('attack', dk.length ? b.pick(dk) : 'random');
        }
      },
      desc: 'Opens with a blinding, slowing Dance.'
    },
    hungry: {
      name: 'Hungry',
      level: 33, hp: 2000, mp: 100,
      exp: 700, ap: 60, gil: 600,
      atk: 60, def: 64, defPct: 5,
      mat: 45, mdf: 130,
      dex: 62, lck: 30,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'manipulate'],
      drops: [{ item: 'ether', chance: 14 }],
      steal: [],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'blob', c1: '#c07050', c2: '#f0d0a0', c3: '#ff2020', size: 1.3, variant: 2 },
      attacks: {
        attack: { name: 'Bodyblow', kind: 'phys', power: 16, element: 'hit', target: 'enemy', silent: true },
        mini: { name: 'Mini', kind: 'status', add: ['small'], hit: 71, target: 'enemy', mp: 10 },
        eat: { name: 'Eat', kind: 'special', special: 'death', target: 'enemy' }
      },
      ai: {
        moves: [['attack', 2], ['mini', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(3);
          var s = H.spc(e, 4, 3, 2, 1);
          var many = H.party(b).length > 1;
          var ns = H.wo(b, 'small'), sm = H.wi(b, 'small');
          var c = v.c;
          if (c === 0) { v.c = 1 + b.rnd(2); return H.go('attack', ns.length ? b.pick(ns) : 'random'); }
          v.c = H.one(b, 3) ? (c === 1 ? 2 : 1) : 0;
          if (c === 1 && ns.length) return e.mp >= 10 ? H.go('mini', b.pick(ns)) : H.go('attack', b.pick(ns));
          if (sm.length && many && H.one(b, s)) return H.go('eat', b.pick(sm));
          if (!sm.length && e.mp >= 10) return H.go('mini');
          return H.go('attack', ns.length ? b.pick(ns) : 'random');
        }
      },
      desc: 'Shrinks its prey with Mini, then eats it whole.'
    },
    jenova_life: {
      name: 'Jenova\u00b7LIFE',
      level: 50, hp: 10000, mp: 300,
      exp: 4000, ap: 350, gil: 1500,
      atk: 128, def: 110, defPct: 10,
      mat: 40, mdf: 290,
      dex: 140, lck: 40,
      elem: { earth: 2, gravity: 0, water: -1 },
      immune: ['death', 'sleep', 'poison', 'confusion', 'silence', 'stop', 'frog', 'small', 'slow_numb',
        'petrify', 'death_sentence', 'manipulate', 'berserk', 'peerless'],
      drops: [{ item: 'wizard_bracelet', chance: 100 }],
      steal: [],
      morph: null,
      boss: true, flying: false, row: 'front',
      look: { type: 'custom', id: 'jenova_life', c1: '#3a8ac0', c2: '#c04080', c3: '#ffe060', size: 2.6 },
      attacks: {
        blue_light: { name: 'Blue Light', kind: 'mag', power: 14, element: 'water', target: 'enemy', mp: 8 },
        blue_light_combo: {
          name: 'Blue Light', kind: 'mag', power: 14, element: 'water', target: 'enemy', hits: 2,
          random: true, mp: 16
        },
        blue_flame: { name: 'Blue Flame', kind: 'mag', power: 16, element: 'water', target: 'enemy', mp: 12 },
        aqualung: {
          name: 'Aqualung', kind: 'mag', power: 52, element: 'water', target: 'allEnemies', mp: 34,
          eskill: 'aqualung'
        },
        reflect: { name: 'Reflect', kind: 'status', add: ['reflect'], hit: 100, target: 'self', mp: 30 }
      },
      ai: {
        moves: [['blue_light', 2], ['blue_flame', 1], ['aqualung', 1]],
        counter: { mag: 'reflect', chance: 100 },
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          var s = H.spc(e, 5, 4, 3, 2);
          if (v.c <= 1) { v.c++; return H.go(H.one(b, s) ? 'blue_light_combo' : 'blue_light'); }
          if (v.c === 2) { v.c = H.one(b, s) ? 3 : 0; return H.go('blue_flame'); }
          v.c = 0;
          return H.go('aqualung', 'all');
        }
      },
      desc: 'Fought at the Forgotten Capital altar. Absorbs water, weak against earth; Reflects itself when hit by magic.'
    },

    // ===== Corel Valley Cave (Forgotten Capital -> Icicle area, entered on disc 2) =====
    acrophies: {
      name: 'Acrophies',
      level: 35, hp: 2400, mp: 220,
      exp: 800, ap: 90, gil: 1200,
      atk: 60, def: 70, defPct: 8,
      mat: 55, mdf: 160,
      dex: 54, lck: 1,
      elem: { gravity: 0, water: -1 },
      immune: ['confusion', 'frog', 'manipulate'],
      drops: [],
      steal: [{ item: 'water_ring', chance: 14 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      backMult: 8,    // FF7: "Acrophies takes 8x damage from Back Attacks" (Enemy Mechanics FAQ)
      look: { type: 'crab', c1: '#c04030', c2: '#f0a080', c3: '#ffffff', size: 1.4 },
      attacks: {
        attack: { name: 'Big Red Clipper', kind: 'phys', power: 16, target: 'enemy', silent: true },
        isogin_smog: {
          name: 'Isogin Smog', kind: 'mag', power: 16, add: ['darkness'], hit: 99, target: 'enemy', mp: 10
        },
        huge_tidal_wave: {
          name: 'Huge Tidal Wave', kind: 'phys', power: 20, element: 'water', target: 'allEnemies', mp: 20
        }
      },
      ai: {
        moves: [['attack', 1]],
        custom: function (e, b) {
          var p = e.hpPct;
          var r = b.rnd(8);
          var tide = p <= 25 ? 3 : p <= 50 ? 2 : p <= 75 ? 1 : 0;
          if (r < 2) {
            // FF7 bug kept: Isogin Smog only once every target is already blinded
            if (!H.wo(b, 'darkness').length) return H.go('isogin_smog');
            return H.go('attack');
          }
          if (r < 2 + tide) return H.go('huge_tidal_wave', 'all');
          return H.go('attack');
        }
      },
      desc: 'Absorbs water. Takes 8x damage from back attacks.'
    },
    grimguard: {
      name: 'Grimguard',
      level: 31, hp: 880, mp: 120,
      exp: 600, ap: 45, gil: 560,
      atk: 60, def: 52, defPct: 1,
      mat: 25, mdf: 180,
      dex: 58, lck: 0,
      elem: {},
      immune: ['confusion', 'frog', 'small', 'manipulate', 'berserk'],
      drops: [{ item: 'shrivel', chance: 14 }],
      steal: [{ item: 'shrivel', chance: 52 }],
      morph: null,
      boss: false, flying: false, row: 'front',
      look: { type: 'mech', c1: '#707888', c2: '#c0a040', c3: '#40a0ff', size: 1.2, variant: 1 },
      attacks: {
        ice2: { name: 'Ice2', kind: 'mag', power: 20, element: 'ice', target: 'enemy', mp: 22 },
        bolt2: { name: 'Bolt2', kind: 'mag', power: 20, element: 'lightning', target: 'enemy', mp: 22 },
        grim_rod: { name: 'Grim Rod', kind: 'phys', power: 16, element: 'hit', target: 'enemy' },
        spin_shield: { name: 'Spin Shield', kind: 'special', special: 'nothing', target: 'self' }
      },
      ai: {
        moves: [['grim_rod', 1]],
        custom: function (e, b) {
          var v = e.vars || (e.vars = {});
          if (v.c === undefined) v.c = b.rnd(4);
          v.c++;
          if (v.c === 1) return H.go(H.one(b, 2) ? 'ice2' : 'bolt2');
          if (v.c === 2) return H.go('spin_shield', 'self');
          if (v.c === 3) return H.go('grim_rod');
          v.c = 0;
          return H.go('spin_shield', 'self');
        }
      },
      desc: 'Alternates between a magic-proof and a physical-proof shield stance.'
    }
  });
})();
